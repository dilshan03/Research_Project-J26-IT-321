"""
gameplay_tracker.py – Component 4, Function 1
MathQuest Behaviour Signal Engine

Responsibilities
────────────────
1. Receive a batch of raw RawGameplayEvent documents freshly stored to MongoDB.
2. For every micro-step (stepOrder) present in that batch, load ALL events for
   that step from this session (so partial batches work correctly).
3. Calculate the full behaviour feature vector (BehaviourSnapshot).
4. Upsert each snapshot into the behaviour_snapshots collection.

Feature extraction catalogue
─────────────────────────────
Temporal
  response_time_ms        – question_start → first answer_submit (ms)
  pause_duration_ms       – longest single pause gap between consecutive events (ms)
  inactivity_duration_ms  – total idle time (sum of all pause_detected event durations)
  is_very_fast            – response_time_ms < VERY_FAST_RESPONSE_MS threshold

Answer correctness
  is_correct              – True when a correct answer_submit was emitted
  consecutive_incorrect   – length of wrong-answer streak leading to first correct
  total_attempts          – total answer_submit events on this step

Interaction quality
  click_count             – all click + touch_start + answer_select events on step
  answer_changes          – answer_change events on this step
  interaction_freq_hz     – click_count / (response_time_ms / 1000) — clicks/second

Flags
  long_pause_detected     – any gap > LONG_PAUSE_THRESHOLD_MS
  inactivity_detected     – any pause_detected event present

All features are stored as a BehaviourSnapshot upserted into MongoDB.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Set

from app.config import VERY_FAST_RESPONSE_MS, LONG_PAUSE_THRESHOLD_MS
from app.db.mongodb import get_events_collection, get_snapshots_collection
from app.schemas.events import (
    BehaviourSnapshot,
    EventType,
    RawGameplayEvent,
)

logger = logging.getLogger("behaviour_signal.gameplay_tracker")


# ── Public entry point ───────────────────────────────────────────────────────

async def process_batch(
    session_id: str,
    learner_id: str,
    activity_id: str,
    new_events: List[RawGameplayEvent],
) -> int:
    """
    Process a freshly-stored batch of events and update behaviour_snapshots.

    Parameters
    ----------
    session_id   : The game session UUID.
    learner_id   : Learner profile ID.
    activity_id  : Blueprint activity ID.
    new_events   : Events from the latest batch (already stored in MongoDB).

    Returns
    -------
    int : Number of BehaviourSnapshot documents upserted.
    """
    # Identify which steps appear in the incoming batch
    affected_steps: Set[int] = {
        e.stepOrder
        for e in new_events
        if e.stepOrder is not None
    }

    if not affected_steps:
        logger.debug("Batch for session %s has no step-tagged events – skipping.", session_id)
        return 0

    upserted = 0
    for step_order in sorted(affected_steps):
        snapshot = await _compute_snapshot(
            session_id=session_id,
            learner_id=learner_id,
            activity_id=activity_id,
            step_order=step_order,
        )
        if snapshot:
            await _upsert_snapshot(snapshot)
            upserted += 1

    logger.info(
        "Session %s: processed %d step(s), upserted %d snapshot(s).",
        session_id, len(affected_steps), upserted,
    )
    return upserted


# ── Core feature extractor ───────────────────────────────────────────────────

async def _compute_snapshot(
    session_id: str,
    learner_id: str,
    activity_id: str,
    step_order: int,
) -> Optional[BehaviourSnapshot]:
    """
    Load all events for (session_id, step_order) from MongoDB and derive
    the complete BehaviourSnapshot feature vector.
    """
    events_col = get_events_collection()

    # Pull every event for this step from the DB (sorted oldest → newest)
    cursor = events_col.find(
        {"sessionId": session_id, "stepOrder": step_order},
        sort=[("timestamp", 1)],
    )
    raw_docs = await cursor.to_list(length=None)

    if not raw_docs:
        logger.warning(
            "No events found for session=%s step=%s – skipping snapshot.",
            session_id, step_order,
        )
        return None

    # Reconstruct typed event objects from stored MongoDB dicts
    events: List[RawGameplayEvent] = []
    for doc in raw_docs:
        doc.pop("_id", None)
        try:
            events.append(RawGameplayEvent(**doc))
        except Exception as exc:
            logger.warning("Skipping malformed event doc: %s | error: %s", doc.get("eventId"), exc)

    if not events:
        return None

    # ── Extract context from any event that carries it ──────────────────────
    action_type  = _first_value(events, "actionType")
    question_grade = _first_value(events, "questionGrade")
    game_theme   = _first_value(events, "gameTheme")

    # ── Classify events by type ──────────────────────────────────────────────
    question_starts   = _filter(events, EventType.QUESTION_START)
    answer_submits    = _filter(events, EventType.ANSWER_SUBMIT)
    answer_selects    = _filter(events, EventType.ANSWER_SELECT)
    answer_changes    = _filter(events, EventType.ANSWER_CHANGE)
    pause_events      = _filter(events, EventType.PAUSE_DETECTED)
    click_events      = _filter(events, EventType.CLICK, EventType.TOUCH_START,
                                EventType.ANSWER_SELECT)

    # ── Response time ─────────────────────────────────────────────────────────
    response_time_ms: Optional[int] = None
    if question_starts and answer_submits:
        t_start = question_starts[0].timestamp
        t_submit = answer_submits[0].timestamp          # first submit (not retries)
        delta_ms = int((t_submit - t_start).total_seconds() * 1000)
        response_time_ms = max(0, delta_ms)

    # ── Is-very-fast flag ─────────────────────────────────────────────────────
    is_very_fast = (
        response_time_ms is not None
        and response_time_ms < VERY_FAST_RESPONSE_MS
    )

    # ── Answer correctness & streaks ──────────────────────────────────────────
    is_correct: Optional[bool] = None
    consecutive_incorrect = 0
    total_attempts = len(answer_submits)

    wrong_streak = 0
    for e in answer_submits:
        if e.isCorrect is False:
            wrong_streak += 1
        elif e.isCorrect is True:
            consecutive_incorrect = wrong_streak   # streak just before correct answer
            is_correct = True
            break

    if is_correct is None and answer_submits:
        # No correct answer yet; still in progress
        consecutive_incorrect = wrong_streak
        is_correct = False

    # ── Pause / inactivity ────────────────────────────────────────────────────
    # 1. Sum of explicit pause_detected event durations (from frontend engine)
    inactivity_duration_ms: Optional[int] = None
    if pause_events:
        inactivity_duration_ms = sum(
            e.inactivityDurationMs or e.pauseDurationMs or 0
            for e in pause_events
        )

    # 2. Longest *implicit* gap between consecutive timestamps (all events)
    pause_duration_ms: Optional[int] = None
    long_pause_detected = False
    if len(events) >= 2:
        gaps: List[int] = []
        for i in range(1, len(events)):
            gap = int(
                (events[i].timestamp - events[i - 1].timestamp).total_seconds() * 1000
            )
            if gap > 0:
                gaps.append(gap)
        if gaps:
            pause_duration_ms = max(gaps)
            long_pause_detected = pause_duration_ms > LONG_PAUSE_THRESHOLD_MS

    # Also flag if any explicit pause event exists
    inactivity_detected = bool(pause_events) or long_pause_detected

    # ── Interaction counts ────────────────────────────────────────────────────
    click_count   = len(click_events)
    n_changes     = len(answer_changes)

    # ── Interaction frequency (clicks per second over response window) ─────────
    interaction_freq_hz: Optional[float] = None
    if response_time_ms and response_time_ms > 0:
        interaction_freq_hz = round(click_count / (response_time_ms / 1000.0), 3)

    return BehaviourSnapshot(
        sessionId=session_id,
        learnerId=learner_id,
        activityId=activity_id,
        stepOrder=step_order,
        snapshotAt=datetime.now(timezone.utc),

        # Temporal
        responseTimeMs=response_time_ms,
        pauseDurationMs=pause_duration_ms,
        inactivityDurationMs=inactivity_duration_ms,
        isVeryFast=is_very_fast,

        # Correctness
        isCorrect=is_correct,
        consecutiveIncorrect=consecutive_incorrect,
        totalAttempts=total_attempts,

        # Interaction quality
        clickCount=click_count,
        answerChanges=n_changes,
        interactionFreqHz=interaction_freq_hz,

        # Context
        actionType=str(action_type.value) if action_type else None,
        questionGrade=question_grade,
        gameTheme=str(game_theme.value) if game_theme else None,

        # Flags
        longPauseDetected=long_pause_detected,
        inactivityDetected=inactivity_detected,
    )


# ── MongoDB upsert ────────────────────────────────────────────────────────────

async def _upsert_snapshot(snapshot: BehaviourSnapshot) -> None:
    """
    Insert or fully replace the BehaviourSnapshot for (sessionId, stepOrder).
    Using replace_one with upsert=True matches the "one document per step"
    contract and is idempotent – reprocessing the same batch is safe.
    """
    col = get_snapshots_collection()
    doc = snapshot.model_dump()
    # Ensure datetimes are stored as native Python datetime (motor serialises these)
    await col.replace_one(
        {"sessionId": snapshot.sessionId, "stepOrder": snapshot.stepOrder},
        doc,
        upsert=True,
    )
    logger.debug(
        "Upserted snapshot session=%s step=%d correct=%s rt=%s ms",
        snapshot.sessionId,
        snapshot.stepOrder,
        snapshot.isCorrect,
        snapshot.responseTimeMs,
    )


# ── Helpers ───────────────────────────────────────────────────────────────────

def _filter(events: List[RawGameplayEvent], *types: EventType) -> List[RawGameplayEvent]:
    """Return events whose eventType matches any of the given types."""
    return [e for e in events if e.eventType in types]


def _first_value(events: List[RawGameplayEvent], field: str):
    """Return the first non-None value of `field` across all events."""
    for e in events:
        val = getattr(e, field, None)
        if val is not None:
            return val
    return None
