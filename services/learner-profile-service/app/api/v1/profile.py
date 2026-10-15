"""
ELP-X Versioned Profile & Continuous Evidence API Routes
Component: services/learner-profile-service/app/api/v1/profile.py
"""

from typing import Dict, Any, List, Optional, Union
from fastapi import APIRouter, Depends, Query, status

from app.core.auth import get_current_user
from app.schemas.evidence import (
    GameplayActivityEvidence,
    BatchGameplayEvidenceRequest,
    EvidenceIngestionResponse,
)
from app.schemas.profile import (
    ElpxLearnerProfile,
    SanitizedLearnerProfileResponse,
)
from app.services.evidence_service import (
    ingest_gameplay_activity_evidence,
    get_learner_elpx_profile,
)

router = APIRouter(prefix="/learners/{learnerId}", tags=["ELP-X Learner Profile"])


@router.get(
    "/profile",
    summary="Get Versioned ELP-X Learner Profile",
    description=(
        "Returns the versioned ELP-X learner profile including Beta-Binomial estimated "
        "proficiencies, Bayesian credible intervals, evidence coverage, and explainable recommendations. "
        "Pass ?sanitized=true for cross-component consumption (Content Adaptation & Pedagogical Engine)."
    ),
    response_model=Union[ElpxLearnerProfile, SanitizedLearnerProfileResponse],
)
async def get_learner_profile_endpoint(
    learnerId: str,
    sanitized: bool = Query(
        default=False,
        description="Whether to return a sanitized cross-component payload (stripping private parent notes and raw clinical scales)"
    ),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    profile = await get_learner_elpx_profile(
        learner_id=learnerId,
        caller_parent_id=current_user["id"],
        caller_role=current_user.get("role", "parent"),
        sanitized=sanitized,
    )
    return profile


@router.post(
    "/evidence",
    response_model=EvidenceIngestionResponse,
    status_code=status.HTTP_200_OK,
    summary="Ingest Continuous Gameplay Activity Evidence",
    description=(
        "Continuously updates learner profile evidence from authorized gameplay components. "
        "Deduplicates repeated event IDs and tracks distinct problem items to prevent repetition bias."
    ),
)
async def ingest_evidence_endpoint(
    learnerId: str,
    payload: Union[GameplayActivityEvidence, BatchGameplayEvidenceRequest],
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    if isinstance(payload, BatchGameplayEvidenceRequest):
        events_list = payload.events
    else:
        events_list = [payload]

    result = await ingest_gameplay_activity_evidence(
        learner_id=learnerId,
        events=events_list,
        caller_role=current_user.get("role", "parent"),
        caller_parent_id=current_user["id"],
    )
    return result
