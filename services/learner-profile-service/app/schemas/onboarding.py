from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field, field_validator


# --- Step / Status Enums ---

class OnboardingStep(str, Enum):
    PREFERENCES = "preferences"
    SNAP_IV = "snap_iv"
    SOCIAL_CONTEXT = "social_context"
    HANDOVER = "handover"
    MATH_ASSESSMENT = "math_assessment"
    SUMMARY = "summary"


class StepStatus(str, Enum):
    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"


# --- 1. Learning Preferences ---

class LearningPreferencesRequest(BaseModel):
    version: str = Field(default="LEARNING-PREF-v1.0", description="Preferences questionnaire version")
    visualAssistance: str = Field(
        ...,
        description="Preference for visual diagrams and illustrations (e.g., 'always', 'sometimes', 'minimal')"
    )
    audioAssistance: str = Field(
        ...,
        description="Preference for spoken Sinhala audio prompts (e.g., 'read_everything', 'read_on_click', 'off')"
    )
    activityPace: str = Field(
        ...,
        description="Preferred task pace (e.g., 'calm_step_by_step', 'regular', 'flexible')"
    )
    hintStyle: str = Field(
        ...,
        description="Preferred hints style (e.g., 'visual_clue', 'step_guide', 'audio_hint')"
    )
    celebrationStyle: str = Field(
        ...,
        description="Feedback style after task completion (e.g., 'gentle_star', 'badge_sound', 'minimal')"
    )
    additionalNotes: Optional[str] = Field(None, max_length=500)


# --- 2. SNAP-IV 18-Item Questionnaire ---

class SnapIvItemResponse(BaseModel):
    itemId: int = Field(..., ge=1, le=18, description="SNAP-IV item index 1-18")
    score: int = Field(
        ...,
        ge=0,
        le=3,
        description="0 = Not at all, 1 = Just a little, 2 = Quite a bit, 3 = Very much"
    )


class SnapIvSubmissionRequest(BaseModel):
    version: str = Field(default="SNAP-IV-18-v1.0", description="Approved scale version")
    responses: List[SnapIvItemResponse] = Field(
        ...,
        min_length=18,
        max_length=18,
        description="Exactly 18 responses required for standard SNAP-IV"
    )
    respondentRelation: str = Field(
        default="parent",
        description="Respondent role relative to child (e.g., 'parent', 'guardian')"
    )

    @field_validator("responses")
    @classmethod
    def validate_all_items_present(cls, v: List[SnapIvItemResponse]) -> List[SnapIvItemResponse]:
        item_ids = {r.itemId for r in v}
        expected = set(range(1, 19))
        if item_ids != expected:
            missing = sorted(list(expected - item_ids))
            raise ValueError(f"All 18 SNAP-IV items must be answered. Missing items: {missing}")
        return v


class SnapIvScoreSummary(BaseModel):
    inattentionTotal: int = Field(..., description="Sum of items 1-9 (0-27)")
    inattentionAverage: float = Field(..., description="Average score for inattention subscale (0.00-3.00)")
    hyperactivityTotal: int = Field(..., description="Sum of items 10-18 (0-27)")
    hyperactivityAverage: float = Field(..., description="Average score for hyperactivity/impulsivity subscale (0.00-3.00)")
    totalScore: int = Field(..., description="Sum of all 18 items (0-54)")
    overallAverage: float = Field(..., description="Average of all 18 items (0.00-3.00)")
    disclaimer: str = Field(
        default=(
            "Research Profile Summary: This score summarizes parental observations for personalized learning support. "
            "It does NOT constitute an ADHD diagnosis, medical classification, or clinical assessment."
        )
    )


# --- 3. Social Learning Context ---

class SocialContextRequest(BaseModel):
    version: str = Field(default="SOCIAL-CONTEXT-v1.0")
    learningEnvironment: str = Field(
        ...,
        description="Preferred study environment (e.g., 'quiet_room', 'shared_living_space', 'with_parent_nearby')"
    )
    peerCollaboration: str = Field(
        ...,
        description="Comfort with collaborative activities (e.g., 'independent_first', 'with_sibling_peer', 'group_friendly')"
    )
    parentInvolvement: str = Field(
        ...,
        description="Desired level of parent co-play (e.g., 'guided_together', 'check_in_after', 'child_independent')"
    )
    challengingTaskSupport: str = Field(
        ...,
        description="How child prefers encouragement when stuck (e.g., 'take_a_break', 'break_down_step', 'parent_hug_reassurance')"
    )
    optionalNotes: Optional[str] = Field(None, max_length=500)


# --- 4. Mathematics Question & Assessment ---

class QuestionType(str, Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    NUMERIC = "numeric"
    VISUAL = "visual"


class MathQuestionOption(BaseModel):
    id: str
    textEn: str
    textSi: str
    visualIcon: Optional[str] = None


class MathQuestionPublic(BaseModel):
    questionId: str
    grade: int
    skillId: str
    skillName: str
    skillNameSi: str
    difficulty: str
    questionType: QuestionType
    promptEn: str
    promptSi: str
    visualRepresentation: Optional[Dict[str, Any]] = None
    options: Optional[List[MathQuestionOption]] = None
    hintEn: str
    hintSi: str


class MathItemAnswerSubmission(BaseModel):
    questionId: str
    userAnswer: Union[str, int, float]
    attempts: int = Field(default=1, ge=1)
    responseTimeSeconds: float = Field(default=0.0, ge=0.0)
    hintUsed: bool = Field(default=False)
    # Valid assessment evidence tracking
    firstConfirmedResponse: Optional[Union[str, int, float]] = None
    isFirstResponseCorrect: Optional[bool] = None
    demonstrationUsed: Optional[bool] = False
    selfCorrectionsCount: Optional[int] = 0


class MathAssessmentSubmissionRequest(BaseModel):
    version: str = Field(default="MATH-QB-v1.0")
    grade: int = Field(..., ge=1, le=5)
    answers: List[MathItemAnswerSubmission] = Field(..., min_length=1)


class SkillScore(BaseModel):
    skillId: str
    skillName: str
    skillNameSi: str
    totalQuestions: int
    correctQuestions: int
    accuracyPercentage: float
    proficiencyCategory: str = Field(
        description="Provisional descriptive category: 'Emerging' (0-49%), 'Developing' (50-79%), 'Proficient' (80-100%), or 'INSUFFICIENT_EVIDENCE' (<3 questions)"
    )


class MathAssessmentSummary(BaseModel):
    grade: int
    totalQuestions: int
    correctAnswers: int
    accuracyPercentage: float
    evidenceLevel: str = Field(
        description="'INSUFFICIENT' if < 3 questions attempted, otherwise 'SUFFICIENT'"
    )
    skills: List[SkillScore]
    strengths: List[str]
    areasForGrowth: List[str]
    recommendations: List[str]
    thresholdVersion: Optional[str] = Field(default="PROV-THRESH-v1.0")
    disclaimer: Optional[str] = Field(
        default="Provisional demonstration thresholds for prototype formative feedback only. Not validated mathematics mastery standards."
    )
    mlPredictionNotice: str = Field(
        default="Baseline derived via transparent pedagogical rules. Machine Learning / SHAP predictions will integrate when model service is attached."
    )
    elpxProfile: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Versioned ELP-X evidence-aware proficiency estimates and explainable recommendations"
    )


# --- Onboarding State & Aggregated Summary ---

class OnboardingProgressResponse(BaseModel):
    learnerId: str
    parentId: str
    status: str
    currentStep: str
    completedSteps: List[str]
    preferencesCompleted: bool
    snapIvCompleted: bool
    socialContextCompleted: bool
    mathAssessmentCompleted: bool
    learningPreferences: Optional[Dict[str, Any]] = None
    snapIvResponses: Optional[List[Dict[str, Any]]] = None
    socialContext: Optional[Dict[str, Any]] = None
    snapIvSummary: Optional[SnapIvScoreSummary] = None
    mathSummary: Optional[MathAssessmentSummary] = None
    updatedAt: str


class OnboardingApiResponse(BaseModel):
    success: bool = True
    message: str = "Operation completed successfully."
    data: Optional[Any] = None
