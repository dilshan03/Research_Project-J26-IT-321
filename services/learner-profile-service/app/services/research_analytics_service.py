"""
Read-only Research & Model Analytics for authorised administrators.

- Research outputs come from sanitized, versioned snapshots in `app/research_snapshots/<componentId>.json`
  (generated offline by each component owner). A snapshot is served only if it validates against
  MQ-RESEARCH-SNAPSHOT-v1 and passes the sensitive-content scan; otherwise the request fails closed.
- No model is loaded and no prediction is made here: this module never imports an ML library.
- Live learner data is returned only as aggregate counts; cells of 1-4 learners are suppressed.
- Every read is written to the admin audit log first (fail closed), reusing `admin_service.audit`.
"""

import hashlib
import json
import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

from fastapi import HTTPException, status
from pydantic import ValidationError

from app.db.mongodb import get_assessments_collection, get_learners_collection
from app.schemas.research_snapshot import COMPONENT_SECTION_SCHEMAS, ResearchSnapshot
from app.services.admin_service import audit

logger = logging.getLogger("learner_profile.research_analytics")

SNAPSHOT_DIR = Path(__file__).resolve().parents[1] / "research_snapshots"
# Repository root, available in local development only (the Docker image contains just this service)
_PARENTS = Path(__file__).resolve().parents
REPO_ROOT = _PARENTS[4] if len(_PARENTS) > 4 else _PARENTS[-1]

MIN_CELL = 5

# The four MathQuest research components. Owners register outputs by adding `<id>.json` to SNAPSHOT_DIR.
COMPONENTS: List[Dict[str, Any]] = [
    {"id": "learner-profile", "title": "Learner Profile & Prediction Engine", "component": "Component 1",
     "summary": "Evidence-aware skill estimation (ELP-X), recommendations and offline prediction research.",
     "liveSummary": True},
    {"id": "behaviour-signal", "title": "Behaviour Signal Analysis", "component": "Behaviour signal component",
     "summary": "Gameplay interaction and behaviour signal analysis.", "liveSummary": False},
    {"id": "content-adaptation", "title": "Content Adaptation", "component": "Content adaptation component",
     "summary": "Adaptive selection and presentation of learning content.", "liveSummary": False},
    {"id": "pedagogical-engine", "title": "Pedagogical Engine", "component": "Pedagogical engine component",
     "summary": "Pedagogical decisions and learner-state modelling.", "liveSummary": False},
]
_BY_ID = {c["id"]: c for c in COMPONENTS}

# Sensitive-content scan (mirrors the exporter's check; applied again before anything is served)
FORBIDDEN_KEYS = {"learnerid", "parentid", "firstname", "lastname", "fullname", "email", "username", "hhid", "fipsst",
                  "stratum", "fwc", "passwordhash", "sessionid"}
FORBIDDEN_TOKENS = re.compile(r"\b(HHID|FIPSST|STRATUM|FWC)\b")
ABSOLUTE_PATH = re.compile(r"(^[A-Za-z]:[\\/])|([\\/](Users|home)[\\/])")
BINARY_SUFFIXES = (".joblib", ".pkl", ".npz", ".csv")


class SnapshotRejected(Exception):
    pass


def find_sensitive_content(value: Any, where: str = "$") -> Optional[str]:
    """Returns the location of the first identifier, absolute path or binary/raw-file reference, or None."""
    if isinstance(value, dict):
        for k, v in value.items():
            if str(k).lower() in FORBIDDEN_KEYS:
                return f"{where}.{k}"
            found = find_sensitive_content(v, f"{where}.{k}")
            if found:
                return found
    elif isinstance(value, list):
        for i, v in enumerate(value):
            found = find_sensitive_content(v, f"{where}[{i}]")
            if found:
                return found
    elif isinstance(value, str):
        if ABSOLUTE_PATH.search(value) or FORBIDDEN_TOKENS.search(value) or value.lower().endswith(BINARY_SUFFIXES):
            return where
    return None


def validate_snapshot(raw: Any, component_id: str) -> Dict[str, Any]:
    """Schema + sensitive-content validation. Raises SnapshotRejected with a non-revealing reason."""
    try:
        envelope = ResearchSnapshot.model_validate(raw)
    except ValidationError as exc:
        raise SnapshotRejected(f"schema validation failed ({exc.error_count()} error(s))")
    if envelope.componentId != component_id:
        raise SnapshotRejected("componentId does not match the registered component")
    section_schema = COMPONENT_SECTION_SCHEMAS.get(component_id)
    if section_schema:
        try:
            section_schema.model_validate(envelope.sections)
        except ValidationError as exc:
            raise SnapshotRejected(f"section validation failed ({exc.error_count()} error(s))")
    location = find_sensitive_content(raw)
    if location:
        raise SnapshotRejected(f"sensitive content detected at {location}")
    return raw


def _freshness(sources: Iterable[Dict[str, Any]]) -> Dict[str, Any]:
    """Compares recorded source hashes with the files when the repository is available (local development)."""
    checked, changed = 0, []
    for s in sources:
        path = (REPO_ROOT / s["path"]).resolve()
        if REPO_ROOT not in path.parents or not path.is_file():
            continue
        checked += 1
        if hashlib.sha256(path.read_bytes()).hexdigest().upper() != s["sha256"]:
            changed.append(s["id"])
    if checked == 0:
        return {"status": "UNVERIFIABLE", "checked": 0, "changedSources": [],
                "note": "Source files are not available to this service (e.g. inside Docker)."}
    return {"status": "STALE" if changed else "CURRENT", "checked": checked, "changedSources": changed}


def load_snapshot(component_id: str) -> Optional[Dict[str, Any]]:
    path = SNAPSHOT_DIR / f"{component_id}.json"
    if not path.is_file():
        return None
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return validate_snapshot(raw, component_id)
    except (json.JSONDecodeError, SnapshotRejected) as exc:
        logger.error("Research snapshot for %s rejected: %s", component_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="The research snapshot for this component failed validation and is not shown. "
                   "Regenerate it with the export script.",
        )


def _component_or_404(component_id: str) -> Dict[str, Any]:
    component = _BY_ID.get(component_id)
    if not component:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown research component.")
    return component


async def list_components(admin: Dict[str, Any]) -> List[Dict[str, Any]]:
    await audit(admin, "RESEARCH_LIST_COMPONENTS")
    out = []
    for c in COMPONENTS:
        entry = {**c, "snapshotAvailable": False, "snapshotValid": None, "generatedAtUtc": None, "modelCount": 0,
                 "modelStatuses": {}}
        try:
            snap = load_snapshot(c["id"])
        except HTTPException:
            entry["snapshotValid"] = False
            out.append(entry)
            continue
        if snap:
            statuses: Dict[str, int] = {}
            for m in snap["models"]:
                statuses[m["status"]] = statuses.get(m["status"], 0) + 1
            entry.update(snapshotAvailable=True, snapshotValid=True, generatedAtUtc=snap["generatedAtUtc"],
                         modelCount=len(snap["models"]), modelStatuses=statuses)
        out.append(entry)
    return out


async def get_component(admin: Dict[str, Any], component_id: str) -> Dict[str, Any]:
    component = _component_or_404(component_id)
    await audit(admin, "RESEARCH_VIEW_COMPONENT", target=component_id)
    snap = load_snapshot(component_id)
    return {
        "component": component,
        "snapshot": snap,
        "freshness": _freshness(snap["sources"]) if snap else None,
        "emptyReason": None if snap else (
            "No research outputs have been registered for this component yet. The component owner can add a "
            "sanitized MQ-RESEARCH-SNAPSHOT-v1 file; nothing is shown until then."),
    }


# --- Live aggregate summary (Learner Profile only) ----------------------------------------------------------------

def _cell(n: int) -> Dict[str, Any]:
    return {"count": n} if n == 0 or n >= MIN_CELL else {"count": None, "suppressed": True}


def _distribution(counts: Dict[str, int]) -> Dict[str, Dict[str, Any]]:
    """Suppresses 1-4 cells; if exactly one cell is suppressed, the next smallest is suppressed too so the hidden
    value cannot be recovered by subtraction from the reported total."""
    cells = {k: _cell(v) for k, v in counts.items()}
    hidden = [k for k, c in cells.items() if c.get("suppressed")]
    if len(hidden) == 1:
        visible = sorted((v, k) for k, v in counts.items() if k not in hidden and v > 0)
        if visible:
            cells[visible[0][1]] = {"count": None, "suppressed": True}
    return dict(sorted(cells.items()))


def _bump(counts: Dict[str, int], key: Any) -> None:
    k = str(key) if key not in (None, "") else "NOT_RECORDED"
    counts[k] = counts.get(k, 0) + 1


async def live_summary(admin: Dict[str, Any]) -> Dict[str, Any]:
    await audit(admin, "RESEARCH_VIEW_LIVE_SUMMARY", target="learner-profile")
    docs = await get_assessments_collection().find({}).sort("completedAt", -1).to_list(length=None)
    latest: Dict[str, Dict[str, Any]] = {}
    for d in docs:                                   # newest first, so the first per learner is the latest
        lid = d.get("learnerId")
        if lid and lid not in latest:
            latest[lid] = d
    learners_total = await get_learners_collection().count_documents({})
    n = len(latest)
    base = {
        "provenance": "live",
        "generatedAtUtc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "minimumCellSize": MIN_CELL,
        "source": "Latest stored onboarding assessment per learner (ELP-X snapshot saved at assessment time)",
        "learnerProfiles": _cell(learners_total),
        "learnersAssessed": _cell(n),
    }
    if n < MIN_CELL:
        return {**base, "suppressed": True,
                "reason": f"Fewer than {MIN_CELL} assessed learners: distributions are withheld to protect children."}

    protocol, grades, algorithm, ruleset, evidence = {}, {}, {}, {}, {}
    skill_levels: Dict[str, Dict[str, int]] = {}
    strategies, impsa_status, impsa_suff, imlr_status, imlr_level = {}, {}, {}, {}, {}
    for d in latest.values():
        _bump(protocol, d.get("assessmentProtocolVersion") or "onboarding-v1")
        _bump(grades, d.get("grade"))
        elpx = d.get("elpxProfile") or {}
        _bump(algorithm, elpx.get("algorithmVersion"))
        _bump(ruleset, elpx.get("recommendationRulesetVersion"))
        _bump(evidence, elpx.get("evidenceStatus"))
        for s in elpx.get("skillEstimates") or []:
            _bump(skill_levels.setdefault(str(s.get("skillId")), {}), s.get("provisionalSkillLevel"))
        for code in sorted({r.get("strategyCode") for r in elpx.get("structuredRecommendations") or []}):
            _bump(strategies, code)
        impsa, imlr = d.get("impsaSummary") or {}, d.get("imlrSummary") or {}
        _bump(impsa_status, impsa.get("status"))
        _bump(impsa_suff, impsa.get("evidenceSufficiency"))
        _bump(imlr_status, imlr.get("status"))
        _bump(imlr_level, imlr.get("evidenceLevel"))

    return {
        **base,
        "suppressed": False,
        "protocolVersions": _distribution(protocol),
        "grades": _distribution(grades),
        "elpx": {
            "algorithmVersions": _distribution(algorithm),
            "recommendationRulesetVersions": _distribution(ruleset),
            "evidenceStatus": _distribution(evidence),
            "skillLevels": {k: _distribution(v) for k, v in sorted(skill_levels.items())},
            "strategyCodesLearners": _distribution(strategies),
        },
        "impsa": {"status": _distribution(impsa_status), "evidenceSufficiency": _distribution(impsa_suff)},
        "imlr": {"status": _distribution(imlr_status), "evidenceLevel": _distribution(imlr_level)},
        "notes": [
            "Counts of learners, not of items. No learner identifiers, names or answers are included.",
            "IMPSA and IMLR are provisional evidence labels, not validated scores.",
            "NSCH survey models are never applied to MathQuest learners.",
        ],
    }
