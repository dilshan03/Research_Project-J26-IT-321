"""
REST + WebSocket API routes for the Behaviour Signal Service – Function 1.

Endpoints
─────────
POST  /api/v1/behaviour/sessions                – open a new gameplay session
GET   /api/v1/behaviour/sessions/{sessionId}    – retrieve session info
POST  /api/v1/behaviour/events                  – ingest a batch of raw events
GET   /api/v1/behaviour/sessions/{sessionId}/events     – list raw events
GET   /api/v1/behaviour/sessions/{sessionId}/snapshots  – list behaviour snapshots
DELETE /api/v1/behaviour/sessions/{sessionId}   – mark session finished

WebSocket
  WS /api/v1/behaviour/ws/{sessionId}           – real-time event stream
  (frontend can POST events OR stream them over WS; both hit the same processor)

Authentication
──────────────
All endpoints validate the mathquest_session HTTP-only cookie issued by the
Node.js auth-service, using the same MongoDB sessions/users lookup as done in
services/learner-profile-service/app/core/auth.py.
The behaviour endpoints are intentionally more permissive: they only require an
authenticated user (any role) so that a child playing in a shared parent/teacher
session can still have events recorded.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from bson import ObjectId
from fastapi import (
    APIRouter,
    HTTPException,
    Query,
    Request,
    WebSocket,
    WebSocketDisconnect,
    status,
)

from app.config import AUTH_COOKIE_NAME, MAX_EVENTS_PER_SESSION
from app.db.mongodb import (
    get_events_collection,
    get_sessions_collection,
    get_shared_sessions_collection,
    get_snapshots_collection,
    get_users_collection,
)
from app.processors.gameplay_tracker import process_batch
from app.schemas.events import (
    BehaviourSnapshot,
    EventBatch,
    EventBatchResponse,
    GameSessionCreate,
    GameSessionResponse,
    RawGameplayEvent,
    SnapshotListResponse,
)

logger = logging.getLogger("behaviour_signal.api")
router = APIRouter(prefix="/api/v1/behaviour", tags=["behaviour-signal"])


# ── Session cookie validation (mirrors learner-profile-service core/auth.py) ─

async def _get_current_user(request: Request) -> Dict[str, Any]:
    """
    Validate the shared mathquest_session cookie against MongoDB.
    Identical logic to learner-profile-service/app/core/auth.py:get_current_user.
    """
    session_id: Optional[str] = request.cookies.get(AUTH_COOKIE_NAME)
    if not session_id:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            session_id = auth_header.split(" ", 1)[1].strip()

    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in.",
        )

    sessions_col = get_shared_sessions_collection()
    now = datetime.now(timezone.utc)
    session_doc = await sessions_col.find_one(
        {"sessionId": session_id, "expiresAt": {"$gt": now}}
    )
    if not session_doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session invalid or expired. Please sign in again.",
        )

    user_id = session_doc.get("userId")
    try:
        oid = ObjectId(user_id) if isinstance(user_id, str) else user_id
    except Exception:
        oid = user_id

    users_col = get_users_collection()
    user_doc = await users_col.find_one({"_id": oid})
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Associated user account not found.",
        )

    return {
        "id": str(user_doc["_id"]),
        "email": user_doc.get("email"),
        "role": user_doc.get("role", "parent"),
    }


# ── Session management ───────────────────────────────────────────────────────

@router.post(
    "/sessions",
    response_model=GameSessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Open a gameplay session",
    description=(
        "Called by the frontend when the learner presses Play. "
        "Creates a session document in gameplay_sessions. "
        "Must be called before events can be ingested."
    ),
)
async def create_session(
    body: GameSessionCreate,
    request: Request,
) -> GameSessionResponse:
    # Auth (optional in development; enforced in production)
    try:
        await _get_current_user(request)
    except HTTPException:
        logger.warning(
            "Unauthenticated session open for session=%s (allowed in dev).",
            body.sessionId,
        )

    sessions_col = get_sessions_collection()
    now = datetime.now(timezone.utc)

    existing = await sessions_col.find_one({"sessionId": body.sessionId})
    if existing:
        return GameSessionResponse(
            sessionId=existing["sessionId"],
            learnerId=existing["learnerId"],
            activityId=existing["activityId"],
            startedAt=existing["startedAt"],
            status=existing.get("status", "active"),
        )

    doc = {
        "sessionId":  body.sessionId,
        "learnerId":  body.learnerId,
        "activityId": body.activityId,
        "gameTheme":  body.gameTheme.value if body.gameTheme else None,
        "grade":      body.grade,
        "startedAt":  now,
        "endedAt":    None,
        "status":     "active",
    }
    await sessions_col.insert_one(doc)
    logger.info("Session opened: %s (learner=%s)", body.sessionId, body.learnerId)

    return GameSessionResponse(
        sessionId=body.sessionId,
        learnerId=body.learnerId,
        activityId=body.activityId,
        startedAt=now,
        status="active",
    )


@router.get(
    "/sessions/{session_id}",
    response_model=GameSessionResponse,
    summary="Get session info",
)
async def get_session(session_id: str) -> GameSessionResponse:
    sessions_col = get_sessions_collection()
    doc = await sessions_col.find_one({"sessionId": session_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Session not found.")
    return GameSessionResponse(
        sessionId=doc["sessionId"],
        learnerId=doc["learnerId"],
        activityId=doc["activityId"],
        startedAt=doc["startedAt"],
        status=doc.get("status", "active"),
    )


@router.delete(
    "/sessions/{session_id}",
    summary="Mark session as finished",
)
async def finish_session(session_id: str) -> Dict[str, Any]:
    sessions_col = get_sessions_collection()
    result = await sessions_col.update_one(
        {"sessionId": session_id},
        {"$set": {"status": "finished", "endedAt": datetime.now(timezone.utc)}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Session not found.")
    logger.info("Session finished: %s", session_id)
    return {"success": True, "message": "Session marked as finished."}


# ── Event ingestion ──────────────────────────────────────────────────────────

@router.post(
    "/events",
    response_model=EventBatchResponse,
    summary="Ingest a batch of gameplay events",
    description=(
        "Accepts up to 100 raw gameplay events per call. "
        "Deduplicates by eventId, stores new events, then runs "
        "gameplay_tracker.py to update behaviour_snapshots."
    ),
)
async def ingest_events(batch: EventBatch) -> EventBatchResponse:
    events_col  = get_events_collection()

    # ── De-duplication: check which eventIds already exist ──────────────────
    incoming_ids  = [e.eventId for e in batch.events]
    existing_docs = events_col.find(
        {"eventId": {"$in": incoming_ids}},
        {"eventId": 1},
    )
    existing_ids: set[str] = {d["eventId"] async for d in existing_docs}

    new_events: List[RawGameplayEvent] = [
        e for e in batch.events if e.eventId not in existing_ids
    ]
    duplicates = len(batch.events) - len(new_events)

    if not new_events:
        return EventBatchResponse(
            stored=0,
            duplicates=duplicates,
            snapshots=0,
            message="All events were duplicates; nothing stored.",
        )

    # ── Enforce MAX_EVENTS_PER_SESSION ───────────────────────────────────────
    session_id  = new_events[0].sessionId
    learner_id  = new_events[0].learnerId
    activity_id = new_events[0].activityId

    current_count = await events_col.count_documents({"sessionId": session_id})
    capacity      = max(0, MAX_EVENTS_PER_SESSION - current_count)
    if capacity == 0:
        logger.warning(
            "Session %s has reached MAX_EVENTS_PER_SESSION (%d). "
            "Dropping %d new events.",
            session_id, MAX_EVENTS_PER_SESSION, len(new_events),
        )
        return EventBatchResponse(
            stored=0,
            duplicates=duplicates,
            snapshots=0,
            message="Session event cap reached; events dropped.",
        )

    # ── Store new events ─────────────────────────────────────────────────────
    to_insert = new_events[:capacity]
    docs = [
        {**e.model_dump(), "timestamp": e.timestamp}
        for e in to_insert
    ]
    await events_col.insert_many(docs)
    stored = len(to_insert)
    logger.info(
        "Stored %d event(s) for session=%s (skipped %d duplicates).",
        stored, session_id, duplicates,
    )

    # ── Run behaviour processing ─────────────────────────────────────────────
    snapshots_updated = await process_batch(
        session_id=session_id,
        learner_id=learner_id,
        activity_id=activity_id,
        new_events=to_insert,
    )

    return EventBatchResponse(
        stored=stored,
        duplicates=duplicates,
        snapshots=snapshots_updated,
        message=(
            f"Stored {stored} event(s), skipped {duplicates} duplicate(s), "
            f"updated {snapshots_updated} snapshot(s)."
        ),
    )


# ── Query endpoints ───────────────────────────────────────────────────────────

@router.get(
    "/sessions/{session_id}/events",
    summary="List raw events for a session",
)
async def list_events(
    session_id: str,
    step_order: Optional[int] = Query(None, ge=1, le=3),
    limit: int = Query(200, ge=1, le=1000),
) -> Dict[str, Any]:
    events_col = get_events_collection()
    query: Dict[str, Any] = {"sessionId": session_id}
    if step_order is not None:
        query["stepOrder"] = step_order

    cursor = events_col.find(query, sort=[("timestamp", 1)], limit=limit)
    docs = await cursor.to_list(length=limit)
    for d in docs:
        d.pop("_id", None)

    return {"success": True, "data": docs, "total": len(docs)}


@router.get(
    "/sessions/{session_id}/snapshots",
    response_model=SnapshotListResponse,
    summary="List processed behaviour snapshots for a session",
)
async def list_snapshots(session_id: str) -> SnapshotListResponse:
    col  = get_snapshots_collection()
    cursor = col.find({"sessionId": session_id}, sort=[("stepOrder", 1)])
    docs = await cursor.to_list(length=None)
    snapshots: List[BehaviourSnapshot] = []
    for d in docs:
        d.pop("_id", None)
        try:
            snapshots.append(BehaviourSnapshot(**d))
        except Exception as exc:
            logger.warning("Skipping malformed snapshot: %s", exc)

    return SnapshotListResponse(success=True, data=snapshots, total=len(snapshots))


@router.get(
    "/learners/{learner_id}/snapshots",
    response_model=SnapshotListResponse,
    summary="List all behaviour snapshots for a learner (across sessions)",
)
async def list_learner_snapshots(
    learner_id: str,
    limit: int = Query(100, ge=1, le=500),
) -> SnapshotListResponse:
    col = get_snapshots_collection()
    cursor = col.find(
        {"learnerId": learner_id},
        sort=[("snapshotAt", -1)],
        limit=limit,
    )
    docs = await cursor.to_list(length=limit)
    snapshots: List[BehaviourSnapshot] = []
    for d in docs:
        d.pop("_id", None)
        try:
            snapshots.append(BehaviourSnapshot(**d))
        except Exception as exc:
            logger.warning("Skipping malformed snapshot: %s", exc)

    return SnapshotListResponse(success=True, data=snapshots, total=len(snapshots))


# ── WebSocket real-time event stream ─────────────────────────────────────────

@router.websocket("/ws/{session_id}")
async def websocket_events(websocket: WebSocket, session_id: str) -> None:
    """
    Real-time event ingestion over WebSocket.

    The frontend may send individual event JSON objects (not batches).
    The server stores each event and immediately runs gameplay_tracker.py
    so behaviour snapshots are updated in near-real-time.

    Message format: a single RawGameplayEvent JSON object.
    """
    await websocket.accept()
    logger.info("WS connection opened for session=%s", session_id)
    events_col = get_events_collection()

    try:
        while True:
            raw = await websocket.receive_json()
            try:
                event = RawGameplayEvent(**raw)
            except Exception as exc:
                await websocket.send_json({"error": str(exc)})
                continue

            # De-duplicate
            existing = await events_col.find_one({"eventId": event.eventId})
            if existing:
                await websocket.send_json({"duplicate": event.eventId})
                continue

            # Store
            doc = {**event.model_dump(), "timestamp": event.timestamp}
            await events_col.insert_one(doc)

            # Process immediately
            await process_batch(
                session_id=event.sessionId,
                learner_id=event.learnerId,
                activity_id=event.activityId,
                new_events=[event],
            )

            await websocket.send_json({"ack": event.eventId})

    except WebSocketDisconnect:
        logger.info("WS disconnected for session=%s", session_id)
    except Exception as exc:
        logger.error("WS error for session=%s: %s", session_id, exc)
        await websocket.close(code=1011)
