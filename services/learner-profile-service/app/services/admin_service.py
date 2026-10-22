"""
Read-only administrator views over learner-profile data.

- Every read is written to `admin_audit_log` first; if the audit write fails, the read is refused.
- Children are labelled with a pseudonymous code (first name + short hash) for display.
- Parent-reported ADHD information and SNAP-IV answers are returned only when explicitly
  requested (`include_sensitive`), and that access is logged as a separate action.
- User documents are reduced to an allowlist, so password hashes or tokens are never returned.
"""

import hashlib
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from bson import ObjectId
from fastapi import HTTPException, status

from app.db.mongodb import (
    get_admin_audit_collection,
    get_assessments_collection,
    get_deletion_requests_collection,
    get_gameplay_events_collection,
    get_learners_collection,
    get_onboarding_collection,
    get_questionnaires_collection,
    get_users_collection,
)
from app.services.dimension_summaries import dimension_summaries_for
from app.services.evidence_service import get_learner_elpx_profile

logger = logging.getLogger("learner_profile.admin_service")

USER_FIELDS = ("fullName", "email", "role", "username", "createdAt", "updatedAt", "lastLoginAt")
SENSITIVE_QUESTIONNAIRE_FIELDS = ("adhdInformation", "snapIv", "snapIvHistory")
# Medication information is no longer collected; any record saved earlier is never returned.
WITHDRAWN_QUESTIONNAIRE_FIELDS = ("medicationInformation",)
MAX_LIST = 500
MAX_EVENTS = 50


def pseudonym(learner_id: str) -> str:
    """Stable short display code for a child (not reversible without the learner ID)."""
    return "C-" + hashlib.sha256(learner_id.encode("utf-8")).hexdigest()[:8].upper()


def _jsonable(value: Any) -> Any:
    """Converts BSON types (ObjectId, datetime) recursively; drops Mongo '_id' keys."""
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: _jsonable(v) for k, v in value.items() if k != "_id"}
    if isinstance(value, (list, tuple)):
        return [_jsonable(v) for v in value]
    return value


def _public_user(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Allowlisted user fields only (never password hashes, reset tokens or sessions)."""
    return _jsonable({"id": str(doc.get("_id")), **{k: doc.get(k) for k in USER_FIELDS if k in doc}})


async def audit(admin: Dict[str, Any], action: str, target: Optional[str] = None, details: Optional[Dict[str, Any]] = None) -> None:
    """Records an admin access. Fails closed: if the log cannot be written, the request is refused."""
    entry = {
        "adminId": admin.get("id"),
        "adminEmail": admin.get("email"),
        "action": action,
        "target": target,
        "details": details or {},
        "at": datetime.now(timezone.utc),
    }
    try:
        await get_admin_audit_collection().insert_one(entry)
    except Exception as exc:  # pragma: no cover - exercised via test double
        logger.error("Admin audit write failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Admin access is unavailable because the audit log could not be written.",
        )


async def get_overview(admin: Dict[str, Any]) -> Dict[str, Any]:
    await audit(admin, "VIEW_OVERVIEW")
    users = await get_users_collection().find({}, {"role": 1}).to_list(length=None)
    learners = await get_learners_collection().find({}, {"onboardingStatus": 1, "isArchived": 1}).to_list(length=None)

    roles: Dict[str, int] = {}
    for u in users:
        key = u.get("role") or "unknown"
        roles[key] = roles.get(key, 0) + 1
    statuses: Dict[str, int] = {}
    for l in learners:
        key = l.get("onboardingStatus") or "UNKNOWN"
        statuses[key] = statuses.get(key, 0) + 1

    return {
        "usersByRole": roles,
        "learnersTotal": len(learners),
        "learnersArchived": sum(1 for l in learners if l.get("isArchived")),
        "learnersByOnboardingStatus": statuses,
        "assessmentsTotal": await get_assessments_collection().count_documents({}),
        "gameplayEventsTotal": await get_gameplay_events_collection().count_documents({}),
        "deletionRequestsTotal": await get_deletion_requests_collection().count_documents({}),
    }


async def list_users(admin: Dict[str, Any], role: Optional[str] = None) -> List[Dict[str, Any]]:
    await audit(admin, "LIST_USERS", details={"role": role})
    query = {"role": role} if role else {}
    docs = await get_users_collection().find(query).sort("createdAt", -1).to_list(length=MAX_LIST)

    child_counts: Dict[str, int] = {}
    for l in await get_learners_collection().find({}, {"parentId": 1}).to_list(length=None):
        pid = str(l.get("parentId", ""))
        child_counts[pid] = child_counts.get(pid, 0) + 1

    out = []
    for d in docs:
        user = _public_user(d)
        if d.get("role") == "parent":
            user["childCount"] = child_counts.get(str(d.get("_id")), 0)
        out.append(user)
    return out


async def _parents_by_id(parent_ids: List[str]) -> Dict[str, Dict[str, Any]]:
    object_ids = []
    for pid in parent_ids:
        try:
            object_ids.append(ObjectId(pid))
        except Exception:
            continue
    docs = await get_users_collection().find({"_id": {"$in": object_ids}}).to_list(length=None) if object_ids else []
    return {str(d["_id"]): _public_user(d) for d in docs}


async def list_learners(admin: Dict[str, Any]) -> List[Dict[str, Any]]:
    await audit(admin, "LIST_LEARNERS")
    learners = await get_learners_collection().find({}).sort("createdAt", -1).to_list(length=MAX_LIST)
    parents = await _parents_by_id(list({str(l.get("parentId", "")) for l in learners}))

    assessed = {
        d.get("learnerId")
        for d in await get_assessments_collection().find({}, {"learnerId": 1}).to_list(length=None)
    }
    out = []
    for l in learners:
        lid = l.get("learnerId", "")
        parent = parents.get(str(l.get("parentId", "")), {})
        out.append(_jsonable({
            "learnerId": lid,
            "pseudonym": pseudonym(lid),
            "firstName": l.get("firstName"),
            "grade": l.get("grade"),
            "age": l.get("age"),
            "onboardingStatus": l.get("onboardingStatus"),
            "isArchived": bool(l.get("isArchived")),
            "createdAt": l.get("createdAt"),
            "parentId": str(l.get("parentId", "")),
            "parentName": parent.get("fullName"),
            "parentEmail": parent.get("email"),
            "hasAssessment": lid in assessed,
        }))
    return out


async def get_learner_detail(admin: Dict[str, Any], learner_id: str, include_sensitive: bool = False) -> Dict[str, Any]:
    learner = await get_learners_collection().find_one({"learnerId": learner_id})
    if not learner:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Learner not found.")

    await audit(admin, "VIEW_LEARNER_SENSITIVE" if include_sensitive else "VIEW_LEARNER", target=learner_id)

    parent_id = str(learner.get("parentId", ""))
    parent = (await _parents_by_id([parent_id])).get(parent_id)
    progress = await get_onboarding_collection().find_one({"learnerId": learner_id})
    questionnaire = await get_questionnaires_collection().find_one({"learnerId": learner_id}) or {}
    assessments = await get_assessments_collection().find({"learnerId": learner_id}).sort("completedAt", -1).to_list(length=None)
    # Descriptive RU / SC / IC / IA counts; computed on read for onboarding-v2 records stored before they existed
    assessments = [{**a, "dimensionSummaries": dimension_summaries_for(a)} for a in assessments]
    events_col = get_gameplay_events_collection()
    events_total = await events_col.count_documents({"learnerId": learner_id})
    recent_events = await events_col.find({"learnerId": learner_id}).sort("activityTimestamp", -1).to_list(length=MAX_EVENTS)
    deletion_requests = await get_deletion_requests_collection().find({"learnerId": learner_id}).to_list(length=None)

    # Current ELP-X profile, computed by the existing engine exactly as for the owning parent
    elpx_profile = None
    try:
        elpx_profile = await get_learner_elpx_profile(learner_id, caller_parent_id=parent_id, caller_role="parent")
    except HTTPException as exc:
        elpx_profile = {"unavailable": exc.detail}

    questionnaires = {
        k: v for k, v in questionnaire.items()
        if k not in SENSITIVE_QUESTIONNAIRE_FIELDS and k not in WITHDRAWN_QUESTIONNAIRE_FIELDS
    }
    sensitive = {
        "available": {k: bool(questionnaire.get(k)) for k in SENSITIVE_QUESTIONNAIRE_FIELDS},
        "included": include_sensitive,
    }
    if include_sensitive:
        for k in SENSITIVE_QUESTIONNAIRE_FIELDS:
            sensitive[k] = questionnaire.get(k)

    return _jsonable({
        "pseudonym": pseudonym(learner_id),
        "learner": learner,
        "parent": parent,
        "onboardingProgress": progress,
        "questionnaires": questionnaires,
        "sensitiveParentReports": sensitive,
        "assessments": assessments,
        "elpxProfile": elpx_profile,
        "gameplayEvents": {"total": events_total, "recent": recent_events},
        "deletionRequests": deletion_requests,
    })


async def list_audit_log(admin: Dict[str, Any], limit: int = 100) -> List[Dict[str, Any]]:
    await audit(admin, "VIEW_AUDIT_LOG")
    docs = await get_admin_audit_collection().find({}).sort("at", -1).to_list(length=min(max(limit, 1), MAX_LIST))
    return _jsonable(docs)
