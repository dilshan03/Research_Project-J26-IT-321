import uuid
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from bson import ObjectId
from fastapi import HTTPException, status
from pymongo import ReturnDocument

from app.db.mongodb import get_learners_collection, get_deletion_requests_collection
from app.schemas.learner import CreateLearnerRequest, UpdateLearnerRequest

logger = logging.getLogger("learner_profile.service")

# Companions a child can choose during onboarding (mirrors COMPANION_IDS in apps/web .../journey/themes.ts).
CHILD_SELECTABLE_AVATAR_IDS = frozenset({"avatar_lion", "avatar_elephant", "avatar_rabbit", "avatar_owl"})


def effective_avatar_fields(doc: Dict[str, Any]) -> Dict[str, Any]:
    """
    The avatar shown everywhere: the child's own choice when one exists (it stays until the child chooses
    again), otherwise the parent's selection. The parent's selection is kept, never overwritten.
    """
    parent_avatar = doc.get("avatarId", "avatar_1")
    child_avatar = doc.get("childAvatarId")
    return {
        "avatarId": child_avatar or parent_avatar,
        "avatarSource": "child" if child_avatar else "parent",
        "parentAvatarId": parent_avatar,
    }


def serialize_learner_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Converts a MongoDB learner document into an API-compliant dictionary."""
    created_at = doc.get("createdAt")
    updated_at = doc.get("updatedAt")
    archived_at = doc.get("archivedAt")

    return {
        "id": str(doc.get("_id", "")),
        "learnerId": doc.get("learnerId", ""),
        "parentId": str(doc.get("parentId", "")),
        "firstName": doc.get("firstName", ""),
        "preferredName": doc.get("preferredName"),
        "age": doc.get("age", 6),
        "grade": doc.get("grade", 1),
        "preferredLanguage": doc.get("preferredLanguage", "Sinhala"),
        "sinhalaComprehension": doc.get("sinhalaComprehension"),
        "englishComprehension": doc.get("englishComprehension"),
        "primaryInstructionLanguage": doc.get("primaryInstructionLanguage"),
        **effective_avatar_fields(doc),
        "onboardingStatus": doc.get("onboardingStatus", "NOT_STARTED"),
        "isArchived": bool(doc.get("isArchived", False)),
        "archivedAt": archived_at.isoformat() if isinstance(archived_at, datetime) else (str(archived_at) if archived_at else None),
        "archivedBy": str(doc.get("archivedBy")) if doc.get("archivedBy") else None,
        "createdAt": created_at.isoformat() if isinstance(created_at, datetime) else str(created_at or ""),
        "updatedAt": updated_at.isoformat() if isinstance(updated_at, datetime) else str(updated_at or ""),
    }


def serialize_deletion_request_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Converts a MongoDB deletion request document into an API-compliant dictionary."""
    req_at = doc.get("requestedAt")
    comp_at = doc.get("completedAt")
    created_at = doc.get("createdAt")
    updated_at = doc.get("updatedAt")

    return {
        "requestId": doc.get("requestId", ""),
        "learnerId": doc.get("learnerId", ""),
        "parentId": str(doc.get("parentId", "")),
        "learnerName": doc.get("learnerName"),
        "status": doc.get("status", "PENDING_REVIEW"),
        "requestedAt": req_at.isoformat() if isinstance(req_at, datetime) else str(req_at or ""),
        "reviewOutcome": doc.get("reviewOutcome"),
        "completedAt": comp_at.isoformat() if isinstance(comp_at, datetime) else (str(comp_at) if comp_at else None),
        "reason": doc.get("reason"),
        "createdAt": created_at.isoformat() if isinstance(created_at, datetime) else str(created_at or ""),
        "updatedAt": updated_at.isoformat() if isinstance(updated_at, datetime) else str(updated_at or ""),
    }


def generate_learner_id() -> str:
    """Generates a collision-resistant, human-friendly learner identifier."""
    return f"lrn_{uuid.uuid4().hex[:10]}"


async def create_learner(parent_id: str, data: CreateLearnerRequest) -> Dict[str, Any]:
    """Creates and persists a new child learner profile linked to the authenticated parent."""
    learners_col = get_learners_collection()
    now = datetime.now(timezone.utc)
    learner_id = generate_learner_id()

    learner_doc = {
        "learnerId": learner_id,
        "parentId": parent_id,
        "firstName": data.firstName,
        "preferredName": data.preferredName,
        "age": data.age,
        "grade": data.grade,
        "preferredLanguage": data.preferredLanguage or "Sinhala",
        "sinhalaComprehension": data.sinhalaComprehension if (data.preferredLanguage == "Bilingual") else None,
        "englishComprehension": data.englishComprehension if (data.preferredLanguage == "Bilingual") else None,
        "primaryInstructionLanguage": data.primaryInstructionLanguage if (data.preferredLanguage == "Bilingual") else None,
        "avatarId": data.avatarId or "avatar_1",
        "onboardingStatus": "NOT_STARTED",
        "isArchived": False,
        "archivedAt": None,
        "archivedBy": None,
        "createdAt": now,
        "updatedAt": now,
    }

    try:
        result = await learners_col.insert_one(learner_doc)
        learner_doc["_id"] = result.inserted_id
        logger.info("Created learner profile %s for parent %s", learner_id, parent_id)
        return serialize_learner_doc(learner_doc)
    except Exception as exc:
        logger.error("Failed to insert learner document: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create child learner profile. Please try again.",
        )


async def get_learners_by_parent(
    parent_id: str,
    is_archived: Optional[bool] = None,
    include_archived: bool = False
) -> List[Dict[str, Any]]:
    """Retrieves learners belonging to the authenticated parent, filtering active vs archived."""
    learners_col = get_learners_collection()

    parent_match: List[Dict[str, Any]] = [{"parentId": parent_id}]
    if ObjectId.is_valid(parent_id):
        parent_match.append({"parentId": ObjectId(parent_id)})

    conditions: List[Dict[str, Any]] = [{"$or": parent_match}]

    if not include_archived:
        if is_archived is True:
            conditions.append({"isArchived": True})
        else:
            conditions.append({"$or": [{"isArchived": False}, {"isArchived": {"$exists": False}}]})
    elif is_archived is not None:
        conditions.append({"isArchived": is_archived})

    query = {"$and": conditions} if len(conditions) > 1 else conditions[0]

    cursor = learners_col.find(query).sort("createdAt", -1)
    docs = await cursor.to_list(length=100)
    return [serialize_learner_doc(doc) for doc in docs]


async def get_learner_by_id(
    learner_id: str,
    parent_id: Optional[str] = None,
    user_role: Optional[str] = None,
    allow_archived: bool = True
) -> Dict[str, Any]:
    """
    Retrieves a single learner by unique learnerId.
    Enforces authorization (deny by default): only the owning parent may access a learner.
    Teachers, missing roles and other roles are refused until teacher-learner assignment exists.
    Optionally blocks archived learners from active gameplay / onboarding.
    """
    # Refuse non-parent callers before lookup so learner existence is not disclosed.
    if user_role != "parent" or not parent_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not have permission to view this learner profile.",
        )

    learners_col = get_learners_collection()
    doc = await learners_col.find_one({"learnerId": learner_id})

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Learner with ID '{learner_id}' was not found.",
        )

    # Ownership verification
    doc_parent_id = str(doc.get("parentId", ""))
    if doc_parent_id != str(parent_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not have permission to view this learner profile.",
        )

    if not allow_archived and doc.get("isArchived"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Learner profile '{learner_id}' is archived. Active onboarding and gameplay workflows are disabled.",
        )

    return serialize_learner_doc(doc)


async def update_learner(
    learner_id: str,
    parent_id: str,
    data: UpdateLearnerRequest
) -> Dict[str, Any]:
    """
    Updates an existing child learner profile.
    Strictly verifies ownership: only the parent who created the child can update it.
    """
    learners_col = get_learners_collection()
    doc = await learners_col.find_one({"learnerId": learner_id})

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Learner with ID '{learner_id}' was not found.",
        )

    # Strict parent ownership verification
    doc_parent_id = str(doc.get("parentId", ""))
    if doc_parent_id != str(parent_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not have permission to update this learner profile.",
        )

    # Prepare update payload
    update_data: Dict[str, Any] = {}
    if data.firstName is not None:
        update_data["firstName"] = data.firstName
    if data.preferredName is not None:
        update_data["preferredName"] = data.preferredName
    if data.age is not None:
        update_data["age"] = data.age
    if data.grade is not None:
        update_data["grade"] = data.grade
    if data.preferredLanguage is not None:
        update_data["preferredLanguage"] = data.preferredLanguage
        if data.preferredLanguage != "Bilingual":
            update_data["sinhalaComprehension"] = None
            update_data["englishComprehension"] = None
            update_data["primaryInstructionLanguage"] = None
    if data.sinhalaComprehension is not None:
        update_data["sinhalaComprehension"] = data.sinhalaComprehension
    if data.englishComprehension is not None:
        update_data["englishComprehension"] = data.englishComprehension
    if data.primaryInstructionLanguage is not None:
        update_data["primaryInstructionLanguage"] = data.primaryInstructionLanguage
    if data.avatarId is not None:
        update_data["avatarId"] = data.avatarId
    if data.onboardingStatus is not None:
        update_data["onboardingStatus"] = data.onboardingStatus.value

    if not update_data:
        return serialize_learner_doc(doc)

    update_data["updatedAt"] = datetime.now(timezone.utc)

    updated_doc = await learners_col.find_one_and_update(
        {"learnerId": learner_id},
        {"$set": update_data},
        return_document=ReturnDocument.AFTER,
    )

    if not updated_doc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update learner profile.",
        )

    logger.info("Updated learner profile %s by parent %s", learner_id, parent_id)
    return serialize_learner_doc(updated_doc)


async def archive_learner(learner_id: str, parent_id: str) -> Dict[str, Any]:
    """
    Archives an active child learner profile.
    Strictly verifies ownership: only the parent who owns the child can archive it.
    Idempotent: repeated archive calls on an already-archived learner succeed safely.
    """
    learners_col = get_learners_collection()
    doc = await learners_col.find_one({"learnerId": learner_id})

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Learner with ID '{learner_id}' was not found.",
        )

    # Strict parent ownership verification
    if str(doc.get("parentId", "")) != str(parent_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not have permission to archive this learner profile.",
        )

    # Idempotent: return safely if already archived
    if doc.get("isArchived"):
        logger.info("Learner %s already archived (idempotent archive)", learner_id)
        return serialize_learner_doc(doc)

    now = datetime.now(timezone.utc)
    updated_doc = await learners_col.find_one_and_update(
        {"learnerId": learner_id},
        {
            "$set": {
                "isArchived": True,
                "archivedAt": now,
                "archivedBy": parent_id,
                "updatedAt": now,
            }
        },
        return_document=ReturnDocument.AFTER,
    )

    if not updated_doc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to archive learner profile.",
        )

    logger.info("Archived learner profile %s by parent %s", learner_id, parent_id)
    return serialize_learner_doc(updated_doc)


async def restore_learner(learner_id: str, parent_id: str) -> Dict[str, Any]:
    """
    Restores an archived child learner profile back to active status.
    Strictly verifies ownership: only the parent who owns the child can restore it.
    Idempotent: restoring an already active learner succeeds safely.
    """
    learners_col = get_learners_collection()
    doc = await learners_col.find_one({"learnerId": learner_id})

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Learner with ID '{learner_id}' was not found.",
        )

    # Strict parent ownership verification
    if str(doc.get("parentId", "")) != str(parent_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not have permission to restore this learner profile.",
        )

    # Idempotent: return safely if already active
    if not doc.get("isArchived"):
        logger.info("Learner %s already active (idempotent restore)", learner_id)
        return serialize_learner_doc(doc)

    now = datetime.now(timezone.utc)
    updated_doc = await learners_col.find_one_and_update(
        {"learnerId": learner_id},
        {
            "$set": {
                "isArchived": False,
                "archivedAt": None,
                "archivedBy": None,
                "updatedAt": now,
            }
        },
        return_document=ReturnDocument.AFTER,
    )

    if not updated_doc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to restore learner profile.",
        )

    logger.info("Restored learner profile %s by parent %s", learner_id, parent_id)
    return serialize_learner_doc(updated_doc)


async def create_deletion_request(
    learner_id: str,
    parent_id: str,
    reason: Optional[str] = None
) -> Dict[str, Any]:
    """
    Submits a permanent deletion request for administrative review.
    Does NOT execute irreversible deletion.
    Validates ownership and handles duplicate requests safely.
    """
    learners_col = get_learners_collection()
    requests_col = get_deletion_requests_collection()

    doc = await learners_col.find_one({"learnerId": learner_id})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Learner with ID '{learner_id}' was not found.",
        )

    if str(doc.get("parentId", "")) != str(parent_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not have permission to request deletion for this learner profile.",
        )

    # Check for existing pending or approved request (prevent duplicates)
    existing_request = await requests_col.find_one({
        "learnerId": learner_id,
        "status": {"$in": ["PENDING_REVIEW", "APPROVED"]},
    })
    if existing_request:
        logger.info("Deletion request already exists for learner %s (status: %s)", learner_id, existing_request.get("status"))
        return serialize_deletion_request_doc(existing_request)

    now = datetime.now(timezone.utc)
    request_id = f"del_req_{uuid.uuid4().hex[:12]}"

    request_doc = {
        "requestId": request_id,
        "learnerId": learner_id,
        "parentId": parent_id,
        "learnerName": doc.get("firstName", "Unknown"),
        "status": "PENDING_REVIEW",
        "requestedAt": now,
        "reviewOutcome": None,
        "completedAt": None,
        "reason": reason,
        "createdAt": now,
        "updatedAt": now,
    }

    try:
        await requests_col.insert_one(request_doc)
        logger.info("Created deletion request %s for learner %s by parent %s", request_id, learner_id, parent_id)
        return serialize_deletion_request_doc(request_doc)
    except Exception as exc:
        logger.error("Failed to insert deletion request: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit deletion request. Please try again.",
        )


async def get_deletion_request_by_learner(
    learner_id: str,
    parent_id: str
) -> Optional[Dict[str, Any]]:
    """Retrieves the latest deletion request for a learner with parent ownership check."""
    learners_col = get_learners_collection()
    doc = await learners_col.find_one({"learnerId": learner_id})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Learner with ID '{learner_id}' was not found.",
        )

    if str(doc.get("parentId", "")) != str(parent_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not have permission to inspect requests for this learner profile.",
        )

    requests_col = get_deletion_requests_collection()
    req_doc = await requests_col.find_one(
        {"learnerId": learner_id},
        sort=[("createdAt", -1)]
    )
    if not req_doc:
        return None
    return serialize_deletion_request_doc(req_doc)


async def get_deletion_requests_by_parent(parent_id: str) -> List[Dict[str, Any]]:
    """Retrieves all deletion requests initiated by the authenticated parent."""
    requests_col = get_deletion_requests_collection()
    cursor = requests_col.find({"parentId": parent_id}).sort("createdAt", -1)
    docs = await cursor.to_list(length=100)
    return [serialize_deletion_request_doc(d) for d in docs]

