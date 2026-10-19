from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from pymongo.errors import DuplicateKeyError

from app.config import DEV_ALLOW_UNAUTHENTICATED, AUTH_COOKIE_NAME
from app.db.mongodb import (
    get_database,
    get_events_collection,
    get_snapshots_collection,
)
from app.schemas.events import EventBatch, GameSessionCreate, WebcamSignal
from app.processors.gameplay_tracker import process_batch
from app.processors.signal_fusion import fuse
from app.processors.random_forest_predictor import predict_offtask

router = APIRouter(prefix='/api/v1/behaviour', tags=['Behaviour'])


async def require_auth(request: Request):
    # Development-only bypass. Real auth-service validation is required before
    # exposing student or parent information in a deployed application.
    if DEV_ALLOW_UNAUTHENTICATED:
        return
    raise HTTPException(
        status_code=503,
        detail='Authentication adapter not configured: integrate auth-service session validation',
    )


async def build_session_summary(session: dict, ended_at: datetime) -> dict:
    """Aggregate saved step snapshots into a non-diagnostic session summary."""
    db = get_database()
    session_id = session['sessionId']
    activity_id = session['activityId']

    cursor = get_snapshots_collection().find({
        'sessionId': session_id,
        'activityId': activity_id,
    }).sort('stepOrder', 1)
    snapshots = [item async for item in cursor]

    answered = [s for s in snapshots if s.get('isCorrect') is not None]
    correct = sum(s.get('isCorrect') is True for s in answered)
    response_times = [
        s['responseTimeMs'] for s in answered
        if isinstance(s.get('responseTimeMs'), (int, float))
        and s['responseTimeMs'] >= 0
    ]

    summary = {
        'sessionId': session_id,
        'learnerId': session['learnerId'],
        'activityId': activity_id,
        'gameTheme': session.get('gameTheme'),
        'grade': session.get('grade'),
        'startedAt': session.get('startedAt'),
        'endedAt': ended_at,
        # The current frontend does not distinguish completion from early exit.
        'completionStatus': 'unknown',
        'stepsWithSnapshots': len(snapshots),
        'answeredSteps': len(answered),
        'correctSteps': correct,
        'incorrectSteps': len(answered) - correct,
        'accuracyPercent': round(correct / len(answered) * 100, 1) if answered else None,
        'averageResponseTimeMs': round(sum(response_times) / len(response_times)) if response_times else None,
        'totalAttempts': sum(s.get('totalAttempts') or 0 for s in snapshots),
        'totalAnswerChanges': sum(s.get('answerChanges') or 0 for s in snapshots),
        'totalRecordedInactivityMs': sum(s.get('inactivityDurationMs') or 0 for s in snapshots),
        'stepsWithLongPause': sum(bool(s.get('longPauseDetected')) for s in snapshots),
        'stepsWithVeryFastResponse': sum(bool(s.get('isVeryFast')) for s in snapshots),
        'maxIncorrectStreakWithinStep': max(
            (s.get('maxIncorrectStreak') or 0 for s in snapshots), default=0
        ),
        'summaryType': 'experimental_gameplay_observations',
        'disclaimer': (
            'These are gameplay observations, not validated measures of attention, '
            'emotions, or ADHD. Response time alone does not prove distraction.'
        ),
        'generatedAt': datetime.now(timezone.utc),
    }
    await db.behaviour_session_summaries.replace_one(
        {'sessionId': session_id}, summary, upsert=True
    )
    return summary


@router.post('/sessions', dependencies=[Depends(require_auth)])
async def open_session(payload: GameSessionCreate):
    db = get_database()
    doc = payload.model_dump() | {
        'startedAt': datetime.now(timezone.utc),
        'status': 'active',
    }
    try:
        await db.gameplay_sessions.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(409, 'Session already exists')
    doc.pop('_id', None)
    return doc


@router.delete('/sessions/{session_id}', dependencies=[Depends(require_auth)])
async def close_session(session_id: str):
    db = get_database()
    session = await db.gameplay_sessions.find_one({'sessionId': session_id})
    if not session:
        raise HTTPException(404, 'Session not found')

    # A repeated close request is safe, and does not create a second summary.
    if session.get('status') == 'finished':
        return {'success': True, 'alreadyFinished': True}
    if session.get('status') != 'active':
        raise HTTPException(409, 'Session is not active')

    ended_at = datetime.now(timezone.utc)
    result = await db.gameplay_sessions.update_one(
        {'sessionId': session_id, 'status': 'active'},
        {'$set': {'status': 'finished', 'endedAt': ended_at}},
    )
    if not result.modified_count:
        raise HTTPException(409, 'Session was already closed')

    # Do not delete the session if summary creation fails: an operator can
    # regenerate the report later from the persisted snapshots.
    summary = await build_session_summary(session, ended_at)
    return {
        'success': True,
        'summarySaved': True,
        'answeredSteps': summary['answeredSteps'],
        'completionStatus': summary['completionStatus'],
    }


@router.post('/events', dependencies=[Depends(require_auth)])
async def receive_events(payload: EventBatch):
    db = get_database()
    first = payload.events[0]
    session = await db.gameplay_sessions.find_one({
        'sessionId': first.sessionId,
        'learnerId': first.learnerId,
        'activityId': first.activityId,
        'status': 'active',
    })
    if not session:
        raise HTTPException(409, 'Session missing, closed or mismatched')

    # Never allow a batch to mix different students, activities or sessions.
    if any(
        e.sessionId != first.sessionId
        or e.learnerId != first.learnerId
        or e.activityId != first.activityId
        for e in payload.events
    ):
        raise HTTPException(400, 'All events in a batch must belong to one session')

    stored = []
    duplicates = 0
    for event in payload.events:
        try:
            await get_events_collection().insert_one(event.model_dump())
            stored.append(event)
        except DuplicateKeyError:
            duplicates += 1

    updated = await process_batch(
        first.sessionId, first.learnerId, first.activityId, stored
    ) if stored else 0
    return {
        'success': True,
        'stored': len(stored),
        'duplicates': duplicates,
        'snapshots': updated,
        'message': 'Events processed',
    }


@router.post('/webcam', dependencies=[Depends(require_auth)])
async def receive_webcam(signal: WebcamSignal):
    doc = signal.model_dump()
    await get_database().webcam_signals.insert_one(doc)
    return {'success': True}


@router.get('/sessions/{session_id}/steps/{step_order}/behaviour', dependencies=[Depends(require_auth)])
async def get_behaviour(session_id: str, step_order: int):
    db = get_database()
    snap = await get_snapshots_collection().find_one({
        'sessionId': session_id,
        'stepOrder': step_order,
    })
    if not snap:
        raise HTTPException(404, 'Snapshot not found')
    webcam = await db.webcam_signals.find_one(
        {'sessionId': session_id, 'stepOrder': step_order},
        sort=[('timestamp', -1)],
    )
    result = fuse(snap, webcam)
    return {'success': True, 'result': result}


class GameplayPredictionInput(BaseModel):
    timetaken: float = Field(ge=0)
    attemptcount: int = Field(ge=0)
    correct: int = Field(ge=0, le=1)
    hintcount: int = Field(ge=0)
    consecutiveerrorsinrow: int = Field(ge=0)


@router.post('/predict-offtask', dependencies=[Depends(require_auth)])
async def predict_gameplay_offtask(payload: GameplayPredictionInput):
    try:
        prediction = predict_offtask(payload.model_dump())
        return {'success': True, 'result': prediction}
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))