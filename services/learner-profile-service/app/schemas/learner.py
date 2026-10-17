from datetime import datetime
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator


class OnboardingStatus(str, Enum):
    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"


class PreferredLanguage(str, Enum):
    SINHALA = "Sinhala"
    ENGLISH = "English"
    BILINGUAL = "Bilingual"


class CreateLearnerRequest(BaseModel):
    firstName: str = Field(
        ...,
        min_length=2,
        max_length=50,
        description="Child's legal or primary first name"
    )
    preferredName: Optional[str] = Field(
        None,
        max_length=50,
        description="Optional nickname or preferred calling name"
    )
    age: int = Field(
        ...,
        ge=6,
        le=10,
        description="Child age must be between 6 and 10 years for primary level"
    )
    grade: int = Field(
        ...,
        ge=1,
        le=5,
        description="Primary school grade level between 1 and 5"
    )
    preferredLanguage: Optional[str] = Field(
        default="Sinhala",
        description="Language for instructional audio and prompts (default: Sinhala)"
    )
    sinhalaComprehension: Optional[str] = Field(
        default=None,
        description="Optional Sinhala comprehension level for bilingual learners"
    )
    englishComprehension: Optional[str] = Field(
        default=None,
        description="Optional English comprehension level for bilingual learners"
    )
    primaryInstructionLanguage: Optional[str] = Field(
        default=None,
        description="Optional primary instruction language for bilingual learners (Sinhala or English)"
    )
    avatarId: Optional[str] = Field(
        default="avatar_1",
        description="Selected character avatar identifier"
    )

    @field_validator("firstName", "preferredName", mode="before")
    @classmethod
    def strip_whitespace(cls, v: Optional[str]) -> Optional[str]:
        if isinstance(v, str):
            trimmed = v.strip()
            return trimmed if trimmed else None
        return v


class UpdateLearnerRequest(BaseModel):
    firstName: Optional[str] = Field(
        None,
        min_length=2,
        max_length=50,
        description="Updated first name"
    )
    preferredName: Optional[str] = Field(
        None,
        max_length=50,
        description="Updated preferred name"
    )
    age: Optional[int] = Field(
        None,
        ge=6,
        le=10,
        description="Updated age (must be 6-10)"
    )
    grade: Optional[int] = Field(
        None,
        ge=1,
        le=5,
        description="Updated grade (must be 1-5)"
    )
    preferredLanguage: Optional[str] = Field(
        None,
        description="Updated preferred language"
    )
    sinhalaComprehension: Optional[str] = Field(
        None,
        description="Updated Sinhala comprehension level"
    )
    englishComprehension: Optional[str] = Field(
        None,
        description="Updated English comprehension level"
    )
    primaryInstructionLanguage: Optional[str] = Field(
        None,
        description="Updated primary instruction language"
    )
    avatarId: Optional[str] = Field(
        None,
        description="Updated avatar identifier"
    )
    onboardingStatus: Optional[OnboardingStatus] = Field(
        None,
        description="Updated onboarding progress status"
    )

    @field_validator("firstName", "preferredName", mode="before")
    @classmethod
    def strip_whitespace(cls, v: Optional[str]) -> Optional[str]:
        if isinstance(v, str):
            trimmed = v.strip()
            return trimmed if trimmed else None
        return v


class LearnerResponse(BaseModel):
    id: str
    learnerId: str
    parentId: str
    firstName: str
    preferredName: Optional[str] = None
    age: int
    grade: int
    preferredLanguage: str
    sinhalaComprehension: Optional[str] = None
    englishComprehension: Optional[str] = None
    primaryInstructionLanguage: Optional[str] = None
    avatarId: str
    onboardingStatus: str
    createdAt: str
    updatedAt: str


class SingleLearnerResponse(BaseModel):
    success: bool = True
    message: str = "Learner profile retrieved successfully."
    data: LearnerResponse


class LearnerListResponse(BaseModel):
    success: bool = True
    message: str = "Learner profiles retrieved successfully."
    data: List[LearnerResponse]
    total: int
