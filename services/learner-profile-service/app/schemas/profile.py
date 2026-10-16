from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class CredibleInterval(BaseModel):
    lower: float = Field(..., ge=0.0, le=1.0, description="Lower bound of Bayesian credible interval")
    upper: float = Field(..., ge=0.0, le=1.0, description="Upper bound of Bayesian credible interval")
    confidenceLevel: float = Field(default=0.95, description="Confidence level (e.g. 0.95 for 95% CI)")


class ElpxSkillEstimate(BaseModel):
    skillId: str
    skillName: str
    skillNameSi: str
    distinctQuestionsAssessed: int = Field(..., ge=0, description="n = distinct valid assessed questions")
    correctFirstResponses: int = Field(..., ge=0, description="c = correct first responses")
    rawAccuracy: float = Field(..., ge=0.0, le=1.0, description="c / n, raw empirical accuracy")
    rawAccuracyPercentage: float = Field(..., ge=0.0, le=100.0)
    posteriorAlpha: float = Field(..., description="alpha = alpha0 + c")
    posteriorBeta: float = Field(..., description="beta = beta0 + n - c")
    estimatedProficiency: float = Field(..., ge=0.0, le=1.0, description="p = alpha / (alpha + beta)")
    estimatedProficiencyPercentage: float = Field(..., ge=0.0, le=100.0)
    credibleInterval: CredibleInterval
    credibleIntervalWidth: float
    posteriorVariance: float
    evidenceSufficiency: str = Field(description="'SUFFICIENT' or 'INSUFFICIENT'")
    isEvidenceSufficient: bool
    provisionalSkillLevel: str = Field(description="'INSUFFICIENT_EVIDENCE', 'EMERGING', 'DEVELOPING', or 'PROFICIENT'")
    isProvisional: bool = True


class StructuredRecommendation(BaseModel):
    recommendationId: str
    skillId: Optional[str] = None
    strategyCode: str = Field(description="Actionable pedagogical strategy code")
    reasonCodes: List[str] = Field(description="Explainable decision reason codes")
    inputEvidenceSummary: Dict[str, Any] = Field(description="Summary of input evidence triggering recommendation")
    recommendationRulesetVersion: str
    titleEn: str
    titleSi: str
    descriptionEn: str
    descriptionSi: str


class ElpxLearnerProfile(BaseModel):
    """
    Complete versioned ELP-X learner profile.
    Requirement 6: Versioned structured learner profile.
    """
    learnerId: str
    grade: int
    profileVersion: str = Field(default="ELP-X-PROFILE-v1.0")
    algorithmVersion: str = Field(default="ELP-X-v1.0")
    recommendationRulesetVersion: str = Field(default="ELP-X-REC-v1.0")
    evidenceStatus: str = Field(description="'SUFFICIENT' or 'INSUFFICIENT'")
    isOverallEvidenceSufficient: bool
    totalDistinctQuestionsEvaluated: int
    totalCorrectFirstResponses: int
    rawOverallAccuracy: float
    skillEstimates: List[ElpxSkillEstimate]
    structuredRecommendations: List[StructuredRecommendation]
    explanationReasonCodes: List[str]
    learningPreferences: Optional[Dict[str, Any]] = None
    disclaimer: str
    lastUpdated: str
    mlPrediction: Optional[Any] = None
    shapValues: Optional[Any] = None


class SanitizedLearnerProfileResponse(BaseModel):
    """
    Sanitized learner profile for cross-component consumption (Content Adaptation & Pedagogical Engine).
    Requirement 8: Do not expose raw SNAP-IV responses or unrelated sensitive learner data.
    """
    learnerId: str
    grade: int
    preferredLanguage: Optional[str] = "Sinhala"
    profileVersion: str = "ELP-X-PROFILE-v1.0"
    algorithmVersion: str = "ELP-X-v1.0"
    evidenceStatus: str
    isOverallEvidenceSufficient: bool
    totalDistinctQuestionsEvaluated: int
    skills: List[ElpxSkillEstimate]
    pedagogicalRecommendations: List[StructuredRecommendation]
    # Sanitized adaptations only (visual cues, audio assistance) without psychological/clinical scores
    learningAdaptations: Dict[str, Any]
    lastUpdated: str
    disclaimer: str
