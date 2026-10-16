"""
Pydantic schemas for the Behaviour Signal Service – Function 1.

All models declared here map directly to:
  1. The JSON payload the frontend sends to POST /api/v1/behaviour/events
  2. The MongoDB documents stored in gameplay_events / gameplay_sessions /
     behaviour_snapshots collections
  3. The feature-vector dict produced by gameplay_tracker.py

Naming conventions match the existing TypeScript types in
  apps/web/src/features/behaviour-monitoring/types.ts
so the contract is enforced at both ends.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator, model_validator


# ── Enumerations ────────────────────────────────────────────────────────────

class EventType(str, Enum):
    """
    Every discrete interaction the frontend can emit.
    Maps 1-to-1 with the EventType union in trackingEngine.ts.
    """
    # Pointer / touch
    CLICK            = "click"
    TOUCH_START      = "touch_start"

    # Game lifecycle
    QUESTION_START   = "question_start"   # step becomes active
    ANSWER_SELECT    = "answer_select"    # learner taps an option (may be wrong)
    ANSWER_CHANGE    = "answer_change"    # learner changes selection before submitting
    ANSWER_SUBMIT    = "answer_submit"    # final answer confirmed (correct or wrong)

    # Attention / inactivity
    PAUSE_DETECTED   = "pause_detected"   # gap > LONG_PAUSE_THRESHOLD_MS
    INACTIVITY_END   = "inactivity_end"   # returned after inactivity
    GAME_EXIT        = "game_exit"        # learner pressed Back / Finish


class ActionType(str, Enum):
    """Mirrors GameMicroStep.action_type in game_blueprint.py"""
    IDENTIFY_ENTITY    = "IDENTIFY_ENTITY"
    SELECT_OPERATOR    = "SELECT_OPERATOR"
    CALCULATE_MICROSTEP = "CALCULATE_MICROSTEP"


class GameTheme(str, Enum):
    VILLAGE_MARKET    = "VILLAGE_MARKET"
    JUNGLE_ADVENTURE  = "JUNGLE_ADVENTURE"
    SPACE_QUEST       = "SPACE_QUEST"


# ── Incoming event payload ───────────────────────────────────────────────────

class RawGameplayEvent(BaseModel):
    """
    A single interaction event as POSTed by the frontend tracking engine.
    Every field is intentionally optional at the transport level so that
    lightweight events (e.g. a bare click) don't need the full question context.
    The processor fills in missing values from session state.
    """
    # Identity
    eventId:       str  = Field(...,  description="Client-generated UUID (prevents duplicates)")
    sessionId:     str  = Field(...,  description="Game session UUID (created when play starts)")
    learnerId:     str  = Field(...,  description="Learner profile ID from learner-profile-service")
    activityId:    str  = Field(...,  description="Blueprint activity_id from content-adaptation-service")

    # Event classification
    eventType:     EventType = Field(..., description="Type of interaction")
    timestamp:     datetime  = Field(..., description="Client UTC timestamp (ISO-8601)")

    # Step / question context (optional for non-question events)
    stepOrder:     Optional[int]        = Field(None, ge=1, le=3)
    actionType:    Optional[ActionType] = None
    questionGrade: Optional[int]        = Field(None, ge=1, le=5)
    gameTheme:     Optional[GameTheme]  = None

    # Answer context (populated for answer_select / answer_submit)
    selectedOption: Optional[str]  = None   # text_en of the picked option
    isCorrect:      Optional[bool]  = None   # True only on answer_submit

    # Pointer / touch coordinates (normalised 0–1 relative to viewport)
    pointerX:      Optional[float]  = Field(None, ge=0.0, le=1.0)
    pointerY:      Optional[float]  = Field(None, ge=0.0, le=1.0)

    # Pause / inactivity durations (ms), populated by the frontend engine
    pauseDurationMs:      Optional[int] = Field(None, ge=0)
    inactivityDurationMs: Optional[int] = Field(None, ge=0)

    # Extra free-form metadata the frontend may attach
    meta: Optional[Dict[str, Any]] = None

    @field_validator("timestamp", mode="before")
    @classmethod
    def _parse_timestamp(cls, v: Any) -> datetime:
        """Accept ISO-8601 strings and convert to timezone-aware datetime."""
        if isinstance(v, str):
            dt = datetime.fromisoformat(v.replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        if isinstance(v, datetime):
            if v.tzinfo is None:
                return v.replace(tzinfo=timezone.utc)
            return v
        raise ValueError(f"Cannot parse timestamp: {v!r}")


class EventBatch(BaseModel):
    """
    The frontend sends events in batches (up to ~20 at a time) to reduce
    HTTP overhead.  The backend stores each event individually then triggers
    feature processing after every batch.
    """
    events: List[RawGameplayEvent] = Field(..., min_length=1, max_length=100)

    @model_validator(mode="after")
    def _events_same_session(self) -> "EventBatch":
        """All events in one batch must belong to the same session."""
        sessions = {e.sessionId for e in self.events}
        if len(sessions) > 1:
            raise ValueError(
                "A single batch must contain events from one session only. "
                f"Got session IDs: {sessions}"
            )
        return self


# ── Session document ─────────────────────────────────────────────────────────

class GameSessionCreate(BaseModel):
    """Payload to open a new gameplay session (sent when play starts)."""
    sessionId:  str = Field(..., description="Client-generated UUID")
    learnerId:  str
    activityId: str
    gameTheme:  Optional[GameTheme] = None
    grade:      Optional[int]       = Field(None, ge=1, le=5)


class GameSessionResponse(BaseModel):
    sessionId:  str
    learnerId:  str
    activityId: str
    startedAt:  datetime
    status:     str = "active"


# ── Processed behaviour snapshot (one per step, written by gameplay_tracker) ─

class BehaviourSnapshot(BaseModel):
    """
    The processed feature vector for one micro-step attempt.
    Written to behaviour_snapshots collection by gameplay_tracker.py
    and later consumed by the behaviour detection engine (Function 2).
    """
    # Identity
    sessionId:   str
    learnerId:   str
    activityId:  str
    stepOrder:   int
    snapshotAt:  datetime

    # ── Temporal features ──
    responseTimeMs:       Optional[int]   = None  # question_start → answer_submit
    pauseDurationMs:      Optional[int]   = None  # longest single pause on this step
    inactivityDurationMs: Optional[int]   = None  # total inactive time on this step
    isVeryFast:           bool            = False  # response < VERY_FAST_RESPONSE_MS

    # ── Answer correctness ──
    isCorrect:            Optional[bool]  = None
    consecutiveIncorrect: int             = 0      # wrong streak before correct answer
    totalAttempts:        int             = 1      # total answer_submit events on step

    # ── Interaction quality ──
    clickCount:           int             = 0      # total clicks / taps on this step
    answerChanges:        int             = 0      # times selection changed before submit
    interactionFreqHz:    Optional[float] = None   # clicks-per-second over response window

    # ── Question context ──
    actionType:           Optional[str]   = None
    questionGrade:        Optional[int]   = None
    gameTheme:            Optional[str]   = None

    # ── Flags ──
    longPauseDetected:    bool            = False
    inactivityDetected:   bool            = False


# ── API response envelopes ────────────────────────────────────────────────────

class EventBatchResponse(BaseModel):
    success:      bool = True
    stored:       int  = 0    # number of new events stored (de-duplicated)
    duplicates:   int  = 0
    snapshots:    int  = 0    # behaviour_snapshots updated this batch
    message:      str  = "Events processed successfully."


class SessionListResponse(BaseModel):
    success: bool = True
    data:    List[GameSessionResponse]
    total:   int


class SnapshotListResponse(BaseModel):
    success: bool = True
    data:    List[BehaviourSnapshot]
    total:   int
