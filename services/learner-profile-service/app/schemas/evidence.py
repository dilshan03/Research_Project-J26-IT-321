from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field, field_validator


class GameplayActivityEvidence(BaseModel):
    """
    Structured mathematics activity evidence model for continuous learner profile updating.
    Requirement 5: Accept structured mathematics activity evidence.
    """
    eventId: str = Field(..., min_length=1, description="Unique, idempotent gameplay event identifier")
    learnerId: str = Field(..., min_length=1, description="Unique learner profile identifier")
    questionId: Optional[str] = Field(None, description="Mathematics question identifier")
    activityId: Optional[str] = Field(None, description="Gameplay activity identifier (alternative to questionId)")
    skillId: str = Field(..., min_length=1, description="Competency skill identifier (e.g., 'addition')")
    correctFirstResponse: bool = Field(..., description="Whether first attempt on item was correct")
    attempts: int = Field(default=1, ge=1, description="Total attempts made on item")
    hintsUsed: int = Field(default=0, ge=0, description="Number of hints accessed during activity")
    responseTime: float = Field(default=0.0, ge=0.0, description="Time spent on activity in seconds")
    activityTimestamp: Optional[datetime] = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp when activity occurred"
    )
    sourceComponent: str = Field(
        default="gameplay-engine",
        description="Source service generating the event (e.g., 'gameplay-engine', 'content-adaptation')"
    )

    @field_validator("eventId", "learnerId", "skillId", "sourceComponent", mode="before")
    @classmethod
    def clean_strings(cls, v: Any) -> Any:
        if isinstance(v, str):
            return v.strip()
        return v

    @property
    def canonical_item_id(self) -> str:
        """Returns questionId or activityId as primary item reference."""
        return self.questionId or self.activityId or "unknown_item"


class BatchGameplayEvidenceRequest(BaseModel):
    """Allows ingesting multiple gameplay activity events in a single transaction."""
    events: List[GameplayActivityEvidence] = Field(..., min_length=1)


class EvidenceIngestionResponse(BaseModel):
    success: bool = True
    message: str = "Gameplay activity evidence ingested successfully."
    processedCount: int = 0
    duplicateCount: int = 0
    ignoredCount: int = 0
    latestProfileSummary: Optional[Dict[str, Any]] = None
