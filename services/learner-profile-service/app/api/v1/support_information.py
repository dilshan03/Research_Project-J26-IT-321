from typing import Any, Dict

from fastapi import APIRouter, Depends

from app.core.auth import require_parent
from app.schemas.onboarding import OnboardingApiResponse
from app.services.support_information_service import get_support_information

router = APIRouter(prefix="/learners/{learnerId}/support-information", tags=["ADHD & Support Information"])


@router.get(
    "",
    response_model=OnboardingApiResponse,
    summary="Get parent-reported ADHD & support information",
    description="ADHD information and SNAP-IV history with subscale scores and a descriptive, non-diagnostic comparison over time. Read-only.",
)
async def get_support_information_endpoint(learnerId: str, current_parent: Dict[str, Any] = Depends(require_parent)):
    data = await get_support_information(learner_id=learnerId, parent_id=current_parent["id"])
    return OnboardingApiResponse(success=True, message="Support information retrieved.", data=data)
