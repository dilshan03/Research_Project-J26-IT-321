from typing import Dict, Any, List
from fastapi import APIRouter, Depends, status

from app.core.auth import require_parent
from app.schemas.onboarding import (
    LearningPreferencesRequest,
    SnapIvSubmissionRequest,
    SocialContextRequest,
    MathAssessmentSubmissionRequest,
    OnboardingApiResponse,
)
from app.services.onboarding_service import (
    get_or_create_onboarding_progress,
    save_learning_preferences,
    save_snap_iv_questionnaire,
    save_social_context,
    get_math_questions_for_learner,
    submit_math_assessment,
    get_onboarding_summary,
)

router = APIRouter(prefix="/learners/{learnerId}/onboarding", tags=["Learner Onboarding"])


@router.get(
    "",
    response_model=OnboardingApiResponse,
    summary="Get or Resume Onboarding Progress",
    description="Returns current onboarding stage, completed steps, and draft state. Enables seamless resuming.",
)
async def get_onboarding_endpoint(
    learnerId: str,
    current_parent: Dict[str, Any] = Depends(require_parent),
):
    progress = await get_or_create_onboarding_progress(
        learner_id=learnerId,
        parent_id=current_parent["id"],
    )
    return OnboardingApiResponse(
        success=True,
        message="Onboarding progress retrieved successfully.",
        data=progress,
    )


@router.post(
    "/preferences",
    response_model=OnboardingApiResponse,
    summary="Save Learning Preferences",
    description="Records child-friendly preferences for visual/audio cues and hints without labeling learning styles.",
)
async def save_preferences_endpoint(
    learnerId: str,
    data: LearningPreferencesRequest,
    current_parent: Dict[str, Any] = Depends(require_parent),
):
    result = await save_learning_preferences(
        learner_id=learnerId,
        parent_id=current_parent["id"],
        data=data,
    )
    return OnboardingApiResponse(
        success=True,
        message=result["message"],
        data=result,
    )


@router.post(
    "/snap-iv",
    response_model=OnboardingApiResponse,
    summary="Submit Parent SNAP-IV 18-Item Rating Scale",
    description="Evaluates parent-reported SNAP-IV items, computing Inattention and Hyperactivity subscale scores with non-diagnostic disclaimers.",
)
async def save_snap_iv_endpoint(
    learnerId: str,
    data: SnapIvSubmissionRequest,
    current_parent: Dict[str, Any] = Depends(require_parent),
):
    result = await save_snap_iv_questionnaire(
        learner_id=learnerId,
        parent_id=current_parent["id"],
        data=data,
    )
    return OnboardingApiResponse(
        success=True,
        message=result["message"],
        data=result["summary"],
    )


@router.post(
    "/social-context",
    response_model=OnboardingApiResponse,
    summary="Save Optional Social Learning Context",
    description="Records supportive observations about study environment and collaboration without negative labeling.",
)
async def save_social_context_endpoint(
    learnerId: str,
    data: SocialContextRequest,
    current_parent: Dict[str, Any] = Depends(require_parent),
):
    result = await save_social_context(
        learner_id=learnerId,
        parent_id=current_parent["id"],
        data=data,
    )
    return OnboardingApiResponse(
        success=True,
        message=result["message"],
        data=result,
    )


@router.get(
    "/math-questions",
    response_model=OnboardingApiResponse,
    summary="Fetch Grade-Specific Math Assessment Questions",
    description="Returns interactive mathematics items tailored to the learner's grade level without exposing answers.",
)
async def get_math_questions_endpoint(
    learnerId: str,
    current_parent: Dict[str, Any] = Depends(require_parent),
):
    questions = await get_math_questions_for_learner(
        learner_id=learnerId,
        parent_id=current_parent["id"],
    )
    return OnboardingApiResponse(
        success=True,
        message=f"Retrieved {len(questions)} grade-specific mathematics assessment items.",
        data=questions,
    )


@router.post(
    "/math-assessment",
    response_model=OnboardingApiResponse,
    summary="Submit Mathematics Baseline Assessment",
    description="Evaluates math answers, computes skill accuracy & provisional proficiency, generates transparent recommendations, and completes onboarding.",
)
async def submit_math_assessment_endpoint(
    learnerId: str,
    data: MathAssessmentSubmissionRequest,
    current_parent: Dict[str, Any] = Depends(require_parent),
):
    result = await submit_math_assessment(
        learner_id=learnerId,
        parent_id=current_parent["id"],
        data=data,
    )
    return OnboardingApiResponse(
        success=True,
        message=result["message"],
        data=result["summary"],
    )


@router.get(
    "/summary",
    response_model=OnboardingApiResponse,
    summary="Get Consolidated Onboarding Profile Summary",
    description="Returns aggregate profile summary: preferences, SNAP-IV scores (with research disclaimer), and math baseline recommendations.",
)
async def get_summary_endpoint(
    learnerId: str,
    current_parent: Dict[str, Any] = Depends(require_parent),
):
    summary = await get_onboarding_summary(
        learner_id=learnerId,
        parent_id=current_parent["id"],
    )
    return OnboardingApiResponse(
        success=True,
        message="Onboarding profile summary retrieved successfully.",
        data=summary,
    )
