from typing import Dict, Any
from fastapi import APIRouter, Depends, status
from app.core.auth import require_parent, get_current_user
from app.schemas.learner import (
    CreateLearnerRequest,
    UpdateLearnerRequest,
    SingleLearnerResponse,
    LearnerListResponse,
)
from app.services.learner_service import (
    create_learner,
    get_learners_by_parent,
    get_learner_by_id,
    update_learner,
)

router = APIRouter(prefix="/learners", tags=["Learners"])


@router.post(
    "",
    response_model=SingleLearnerResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Child Learner Profile",
    description="Registers a new child profile under the authenticated parent account.",
)
async def create_learner_endpoint(
    data: CreateLearnerRequest,
    current_parent: Dict[str, Any] = Depends(require_parent),
):
    learner = await create_learner(
        parent_id=current_parent["id"],
        data=data,
    )
    return SingleLearnerResponse(
        success=True,
        message="Child learner profile created successfully.",
        data=learner,
    )


@router.get(
    "",
    response_model=LearnerListResponse,
    summary="List Parent's Learners",
    description="Returns all child profiles belonging strictly to the authenticated parent.",
)
async def list_learners_endpoint(
    current_parent: Dict[str, Any] = Depends(require_parent),
):
    learners = await get_learners_by_parent(parent_id=current_parent["id"])
    return LearnerListResponse(
        success=True,
        message="Learner profiles retrieved successfully.",
        data=learners,
        total=len(learners),
    )


@router.get(
    "/{learnerId}",
    response_model=SingleLearnerResponse,
    summary="Get Learner by ID",
    description="Retrieves a single child profile by learnerId with strict ownership validation.",
)
async def get_learner_endpoint(
    learnerId: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    learner = await get_learner_by_id(
        learner_id=learnerId,
        parent_id=current_user["id"],
        user_role=current_user.get("role"),
    )
    return SingleLearnerResponse(
        success=True,
        message="Learner profile retrieved successfully.",
        data=learner,
    )


@router.patch(
    "/{learnerId}",
    response_model=SingleLearnerResponse,
    summary="Update Learner Profile",
    description="Updates child details. Strictly restricted to the child's owning parent.",
)
async def update_learner_endpoint(
    learnerId: str,
    data: UpdateLearnerRequest,
    current_parent: Dict[str, Any] = Depends(require_parent),
):
    updated = await update_learner(
        learner_id=learnerId,
        parent_id=current_parent["id"],
        data=data,
    )
    return SingleLearnerResponse(
        success=True,
        message="Learner profile updated successfully.",
        data=updated,
    )
