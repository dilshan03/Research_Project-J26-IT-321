from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, Query, status
from app.core.auth import require_parent
from app.schemas.learner import (
    CreateLearnerRequest,
    UpdateLearnerRequest,
    SingleLearnerResponse,
    LearnerListResponse,
    CreateDeletionRequest,
    SingleDeletionRequestResponse,
    DeletionRequestListResponse,
)
from app.services.learner_service import (
    create_learner,
    get_learners_by_parent,
    get_learner_by_id,
    update_learner,
    archive_learner,
    restore_learner,
    create_deletion_request,
    get_deletion_request_by_learner,
    get_deletion_requests_by_parent,
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
    description="Returns child profiles belonging strictly to the authenticated parent, with active/archived filtering.",
)
async def list_learners_endpoint(
    is_archived: Optional[bool] = Query(
        default=None,
        description="Filter by archived state (True = archived only, False = active only, None = active only unless include_archived is True)"
    ),
    include_archived: bool = Query(
        default=False,
        description="Whether to include both active and archived learners"
    ),
    current_parent: Dict[str, Any] = Depends(require_parent),
):
    learners = await get_learners_by_parent(
        parent_id=current_parent["id"],
        is_archived=is_archived,
        include_archived=include_archived,
    )
    return LearnerListResponse(
        success=True,
        message="Learner profiles retrieved successfully.",
        data=learners,
        total=len(learners),
    )


@router.get(
    "/deletion-requests",
    response_model=DeletionRequestListResponse,
    summary="List Parent's Deletion Requests",
    description="Lists all permanent deletion requests initiated by the authenticated parent.",
)
async def list_deletion_requests_endpoint(
    current_parent: Dict[str, Any] = Depends(require_parent),
):
    requests = await get_deletion_requests_by_parent(parent_id=current_parent["id"])
    return DeletionRequestListResponse(
        success=True,
        message="Deletion requests retrieved successfully.",
        data=requests,
        total=len(requests),
    )


@router.get(
    "/{learnerId}",
    response_model=SingleLearnerResponse,
    summary="Get Learner by ID",
    description="Retrieves a single child profile by learnerId with strict ownership validation.",
)
async def get_learner_endpoint(
    learnerId: str,
    current_parent: Dict[str, Any] = Depends(require_parent),
):
    learner = await get_learner_by_id(
        learner_id=learnerId,
        parent_id=current_parent["id"],
        user_role="parent",
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


@router.post(
    "/{learnerId}/archive",
    response_model=SingleLearnerResponse,
    summary="Archive Child Learner Profile",
    description="Archives a child profile. Preserves data integrity and prevents active gameplay/onboarding.",
)
async def archive_learner_endpoint(
    learnerId: str,
    current_parent: Dict[str, Any] = Depends(require_parent),
):
    archived = await archive_learner(
        learner_id=learnerId,
        parent_id=current_parent["id"],
    )
    return SingleLearnerResponse(
        success=True,
        message=f"Learner '{archived['firstName']}' was archived successfully.",
        data=archived,
    )


@router.post(
    "/{learnerId}/restore",
    response_model=SingleLearnerResponse,
    summary="Restore Archived Child Learner Profile",
    description="Restores an archived child profile back to active status.",
)
async def restore_learner_endpoint(
    learnerId: str,
    current_parent: Dict[str, Any] = Depends(require_parent),
):
    restored = await restore_learner(
        learner_id=learnerId,
        parent_id=current_parent["id"],
    )
    return SingleLearnerResponse(
        success=True,
        message=f"Learner '{restored['firstName']}' was restored successfully.",
        data=restored,
    )


@router.post(
    "/{learnerId}/deletion-request",
    response_model=SingleDeletionRequestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Request Permanent Deletion",
    description="Submits a request for permanent profile deletion for administrative/ethics review. Does not immediately delete records.",
)
async def request_deletion_endpoint(
    learnerId: str,
    payload: Optional[CreateDeletionRequest] = None,
    current_parent: Dict[str, Any] = Depends(require_parent),
):
    reason = payload.reason if payload else None
    request_doc = await create_deletion_request(
        learner_id=learnerId,
        parent_id=current_parent["id"],
        reason=reason,
    )
    return SingleDeletionRequestResponse(
        success=True,
        message="Permanent deletion request submitted for administrative review.",
        data=request_doc,
    )


@router.get(
    "/{learnerId}/deletion-request",
    response_model=SingleDeletionRequestResponse,
    summary="Get Learner Deletion Request Status",
    description="Returns the status of any submitted deletion request for the child learner.",
)
async def get_deletion_request_status_endpoint(
    learnerId: str,
    current_parent: Dict[str, Any] = Depends(require_parent),
):
    request_doc = await get_deletion_request_by_learner(
        learner_id=learnerId,
        parent_id=current_parent["id"],
    )
    return SingleDeletionRequestResponse(
        success=True,
        message="Deletion request status retrieved successfully." if request_doc else "No deletion request found for this learner.",
        data=request_doc,
    )

