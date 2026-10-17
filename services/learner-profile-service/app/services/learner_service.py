import uuid
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from bson import ObjectId
from fastapi import HTTPException, status
from pymongo import ReturnDocument

from app.db.mongodb import get_learners_collection
from app.schemas.learner import CreateLearnerRequest, UpdateLearnerRequest

logger = logging.getLogger("learner_profile.service")


def serialize_learner_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Converts a MongoDB learner document into an API-compliant dictionary."""
    created_at = doc.get("createdAt")
    updated_at = doc.get("updatedAt")

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
        "avatarId": doc.get("avatarId", "avatar_1"),
        "onboardingStatus": doc.get("onboardingStatus", "NOT_STARTED"),
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


async def get_learners_by_parent(parent_id: str) -> List[Dict[str, Any]]:
    """Retrieves all learners belonging to the authenticated parent."""
    learners_col = get_learners_collection()

    # Match parentId as string or ObjectId for compatibility
    query: Dict[str, Any] = {
        "$or": [
            {"parentId": parent_id},
        ]
    }
    if ObjectId.is_valid(parent_id):
        query["$or"].append({"parentId": ObjectId(parent_id)})

    cursor = learners_col.find(query).sort("createdAt", -1)
    docs = await cursor.to_list(length=100)
    return [serialize_learner_doc(doc) for doc in docs]


async def get_learner_by_id(
    learner_id: str,
    parent_id: Optional[str] = None,
    user_role: Optional[str] = None
) -> Dict[str, Any]:
    """
    Retrieves a single learner by unique learnerId.
    Enforces authorization: parents can ONLY access their own children.
    """
    learners_col = get_learners_collection()
    doc = await learners_col.find_one({"learnerId": learner_id})

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Learner with ID '{learner_id}' was not found.",
        )

    # Authorization verification
    doc_parent_id = str(doc.get("parentId", ""))
    if user_role == "parent" and parent_id:
        if doc_parent_id != str(parent_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You do not have permission to view this learner profile.",
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
