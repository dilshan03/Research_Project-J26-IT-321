from datetime import datetime, timezone
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


# --- Protocol Versioning & Multi-Phase Assessment Enums ---

class AssessmentProtocolVersion(str, Enum):
    V1 = "onboarding-v1"
    V2 = "onboarding-v2"


class ProbeRole(str, Enum):
    CALIBRATION = "calibration"
    PRE = "pre"
    SUPPORT = "support"
    TRANSFER = "transfer"
    REPRESENTATION = "representation"


class RepresentationType(str, Enum):
    CONCRETE = "concrete"
    PICTORIAL = "pictorial"
    VISUAL = "visual"
    SYMBOLIC = "symbolic"
    VERBAL = "verbal"


class InteractionMode(str, Enum):
    TOUCH = "touch"
    MOUSE = "mouse"
    KEYBOARD = "keyboard"


class ClientResponseStatus(str, Enum):
    """Optional client declaration of whether an item was actually answered."""
    ANSWERED = "answered"
    SKIPPED = "skipped"
    NOT_PRESENTED = "not_presented"


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


# --- 2. Child-Expressed Preferences (Source Attribution: Child) ---

class ChildPreferenceChoices(BaseModel):
    """
    Child-expressed preferences captured directly from the child.
    Requirement: Explicitly record that the source is strictly 'child'.
    """
    source: str = Field(default="child", description="Explicit source attribution, strictly 'child'")
    avatarId: Optional[str] = Field(None, description="Child-chosen companion avatar identifier")
    soundMode: Optional[str] = Field(None, description="Child-chosen sound mode: gentle, quiet, off")
    theme: Optional[str] = Field(None, description="Child-chosen visual theme (e.g., 'watercolor_island')")
    chosenAt: Optional[datetime] = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp when child made the preference choices"
    )

    @field_validator("source")
    @classmethod
    def validate_source_is_child(cls, v: str) -> str:
        if not v or v.strip().lower() != "child":
            raise ValueError("ChildPreferenceChoices source must strictly be 'child'")
        return "child"


# --- 3. SNAP-IV 18-Item Questionnaire ---

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


# --- 4. Social Learning Context ---

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


# --- 5. Event Evidence Schemas (Support, Instruction, Revision) ---

class SupportEvent(BaseModel):
    level: int = Field(..., ge=1, le=3, description="Support scaffold level (1=clarify, 2=visual cue, 3=worked demonstration)")
    type: str = Field(..., description="Description or code of scaffold delivered (e.g., 'clarification', 'visual_cue', 'worked_demonstration')")
    timestampSeconds: Optional[float] = Field(None, ge=0.0, description="Offset in seconds from item start")
    deliveredAt: Optional[datetime] = None


class InstructionEvent(BaseModel):
    action: str = Field(..., description="Action type: delivered, replayed, clarified, audio_toggled")
    timestampSeconds: Optional[float] = Field(None, ge=0.0, description="Offset in seconds from item start")
    occurredAt: Optional[datetime] = None


class RevisionEvent(BaseModel):
    priorResponse: Optional[Union[str, int, float]] = None
    newResponse: Optional[Union[str, int, float]] = None
    timestampSeconds: Optional[float] = Field(None, ge=0.0, description="Offset in seconds from item start")
    revisedAt: Optional[datetime] = None


# --- 6. Mathematics Question & Assessment ---

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

    # --- Protocol v2 Additive Fields (Optional, backward-compatible) ---
    probeRole: Optional[ProbeRole] = Field(
        default=None,
        description="Role in multi-phase protocol: calibration, pre, support, transfer, representation"
    )
    itemFamilyId: Optional[str] = Field(
        default=None,
        description="Identifier linking isomorphic problem sets across representations or dynamic probes"
    )
    representation: Optional[RepresentationType] = Field(
        default=None,
        description="Item representation format: concrete, pictorial, visual, symbolic, verbal"
    )
    supportBeforeFirstResponse: Optional[bool] = Field(
        default=False,
        description="Whether hints, prompts, or demonstrations were accessed before the first confirmed response"
    )
    supportEvents: Optional[List[SupportEvent]] = Field(
        default_factory=list,
        description="Ordered sequence of scaffolding interventions delivered during item"
    )
    instructionEvents: Optional[List[InstructionEvent]] = Field(
        default_factory=list,
        description="Instruction delivery and audio replay events"
    )
    revisionEvents: Optional[List[RevisionEvent]] = Field(
        default_factory=list,
        description="Pre-confirmation adjustments and strategy changes"
    )
    interactionMode: Optional[InteractionMode] = Field(
        default=None,
        description="Input modality: touch, mouse, keyboard"
    )
    dimensionTags: Optional[List[str]] = Field(
        default_factory=list,
        description="Observable dimension tags addressed: MP, IC, SR, RU, SC, IA, CP"
    )
    responseStatus: Optional[ClientResponseStatus] = Field(
        default=None,
        description=(
            "Optional declaration for items without an answer: 'skipped' (shown, not answered) "
            "or 'not_presented' (never shown). Omitted answers are recorded as unanswered."
        )
    )


class MathAssessmentSubmissionRequest(BaseModel):
    version: str = Field(default="MATH-QB-v1.0")
    assessmentProtocolVersion: Optional[str] = Field(
        default=AssessmentProtocolVersion.V1.value,
        description="Assessment protocol version: 'onboarding-v1' (default) or 'onboarding-v2'"
    )
    grade: int = Field(..., ge=1, le=5)
    answers: List[MathItemAnswerSubmission] = Field(..., min_length=1)
    childPreferences: Optional[ChildPreferenceChoices] = Field(
        default=None,
        description="Child-expressed preferences recorded with source='child'"
    )


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


# --- 7. Provisional IMPSA and IMLR Summary Schemas ---

class ImpsaSummary(BaseModel):
    """
    Provisional Independent Mathematical Problem-Solving Ability summary.
    Evaluated strictly on eligible, unassisted first attempts before hints/demonstrations.
    """
    status: str = Field(
        default="INSUFFICIENT_EVIDENCE",
        description="Status: 'PROVISIONAL', 'INSUFFICIENT_EVIDENCE'"
    )
    eligibleUnassistedItems: int = Field(
        default=0,
        ge=0,
        description="Count of items completed without any assistance prior to first response"
    )
    skillEvidence: Optional[List[Dict[str, Any]]] = Field(
        default_factory=list,
        description="Item and concept level unassisted performance evidence"
    )
    estimatedProficiency: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Provisional unassisted proficiency estimate (0.00 - 1.00)"
    )
    credibleInterval: Optional[Dict[str, float]] = Field(
        default=None,
        description="Bayesian credible interval bounds {'lower': float, 'upper': float}"
    )
    uncertaintyNote: Optional[str] = Field(
        default="Provisional estimate based on brief intake. Revise after continuous gameplay observations.",
        description="Epistemic uncertainty advisory"
    )
    evidenceSufficiency: str = Field(
        default="INSUFFICIENT",
        description="'SUFFICIENT' if eligible items >= 3, else 'INSUFFICIENT'"
    )


class ImlrSummary(BaseModel):
    """
    Provisional Independent Mathematical Learning Readiness summary.
    Captures responsiveness to scaffolding and subsequent unassisted transfer.
    """
    status: str = Field(
        default="INSUFFICIENT_EVIDENCE",
        description="'TRANSFER_OBSERVED', 'TRANSFER_NOT_YET_OBSERVED', 'ALREADY_DEMONSTRATED', or 'INSUFFICIENT_EVIDENCE'"
    )
    conceptId: Optional[str] = Field(None, description="Target mathematical concept probed")
    preProbeCorrect: Optional[bool] = Field(None, description="Outcome of unassisted pre-probe")
    supportDelivered: Optional[List[str]] = Field(default_factory=list, description="List of scaffold steps provided")
    unassistedTransferCorrect: Optional[bool] = Field(None, description="Outcome of unassisted transfer item")
    evidenceLevel: str = Field(default="PROVISIONAL", description="'PROVISIONAL' or 'INSUFFICIENT'")
    uncertaintyNote: Optional[str] = Field(
        default="Initial transfer indicator from a single probe; does not certify durable learning gain.",
        description="Dynamic assessment uncertainty guidance"
    )


class MathAssessmentSummary(BaseModel):
    grade: int
    assessmentProtocolVersion: Optional[str] = Field(
        default=AssessmentProtocolVersion.V1.value,
        description="Assessment protocol version used for evaluation"
    )
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
    # Protocol v2 Additive Summaries (Optional)
    impsa: Optional[ImpsaSummary] = Field(
        default=None,
        description="Provisional Independent Mathematical Problem-Solving Ability summary"
    )
    imlr: Optional[ImlrSummary] = Field(
        default=None,
        description="Provisional Independent Mathematical Learning Readiness summary"
    )
    childPreferences: Optional[ChildPreferenceChoices] = Field(
        default=None,
        description="Child-expressed preferences recorded with source='child'"
    )
    # Evidence-integrity additive fields (Optional)
    evidenceRulesetVersion: Optional[str] = Field(
        default=None,
        description="Version of the server-side assessment evidence rules applied"
    )
    evidenceSummary: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Counts of answered, unanswered, skipped, invalid and excluded items, and evidence-quality flags"
    )


# --- 8. Onboarding State & Aggregated Summary ---

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
    # Protocol v2 Additive Fields (Optional)
    assessmentProtocolVersion: Optional[str] = Field(
        default=None,
        description="Protocol version active for onboarding"
    )
    childPreferences: Optional[ChildPreferenceChoices] = Field(
        default=None,
        description="Child-expressed preferences if captured"
    )
    impsaSummary: Optional[ImpsaSummary] = Field(
        default=None,
        description="Provisional IMPSA output if protocol v2 was completed"
    )
    imlrSummary: Optional[ImlrSummary] = Field(
        default=None,
        description="Provisional IMLR output if protocol v2 was completed"
    )
    updatedAt: str


class OnboardingApiResponse(BaseModel):
    success: bool = True
    message: str = "Operation completed successfully."
    data: Optional[Any] = None

