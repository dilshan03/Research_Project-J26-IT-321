"""
MongoDB connection module for the Behaviour Signal Service.

Implementation mirrors services/learner-profile-service/app/db/mongodb.py
so the team uses an identical async connection pattern across all Python services.

Collections created / managed here:
  gameplay_events      – raw event stream (click, select, pause, submit …)
  gameplay_sessions    – session-level summary documents
  behaviour_snapshots  – processed feature vectors produced by gameplay_tracker.py
"""

import logging
from typing import Optional

from pymongo import AsyncMongoClient, ASCENDING, DESCENDING
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.asynchronous.collection import AsyncCollection

from app.config import MONGODB_URI, MONGODB_DB_NAME

logger = logging.getLogger("behaviour_signal.db")

_client: Optional[AsyncMongoClient] = None
_database: Optional[AsyncDatabase] = None


async def connect_to_database() -> AsyncDatabase:
    """Connect to MongoDB Atlas via PyMongo Async API and return the database."""
    global _client, _database

    if _database is not None:
        return _database

    if not MONGODB_URI:
        raise ValueError("MONGODB_URI environment variable is not configured.")

    logger.info("Connecting to MongoDB Atlas (Behaviour Signal Service)…")
    _client = AsyncMongoClient(MONGODB_URI)
    _database = _client[MONGODB_DB_NAME]

    # Verify connection
    await _database.command("ping")
    logger.info("Connected to MongoDB Atlas database: %s", MONGODB_DB_NAME)

    await _init_indexes()
    return _database


async def _init_indexes() -> None:
    """Create indexes for the behaviour-signal collections."""
    if _database is None:
        return
    try:
        # gameplay_events – primary queries by sessionId + timestamp
        events_col: AsyncCollection = _database["gameplay_events"]
        await events_col.create_index(
            [("sessionId", ASCENDING), ("timestamp", ASCENDING)]
        )
        await events_col.create_index([("learnerId", ASCENDING)])
        await events_col.create_index([("eventId", ASCENDING)], unique=True)
        await events_col.create_index([("activityId", ASCENDING)])

        # gameplay_sessions – session lookup
        sessions_col: AsyncCollection = _database["gameplay_sessions"]
        await sessions_col.create_index(
            [("sessionId", ASCENDING)], unique=True
        )
        await sessions_col.create_index([("learnerId", ASCENDING)])
        await sessions_col.create_index(
            [("startedAt", DESCENDING)]
        )

        # behaviour_snapshots – one doc per (session, step)
        snapshots_col: AsyncCollection = _database["behaviour_snapshots"]
        await snapshots_col.create_index(
            [("sessionId", ASCENDING), ("stepOrder", ASCENDING)], unique=True
        )
        await snapshots_col.create_index([("learnerId", ASCENDING)])

        logger.info("Behaviour Signal Service indexes initialized.")
    except Exception as exc:
        logger.warning("Index initialization notice: %s", exc)


async def close_database_connection() -> None:
    """Close the MongoDB connection cleanly."""
    global _client, _database
    if _client is not None:
        await _client.close()
        _client = None
        _database = None
        logger.info("MongoDB Atlas connection closed (Behaviour Signal Service).")


# ── Accessors ───────────────────────────────────────────────────────────────

def get_database() -> AsyncDatabase:
    if _database is None:
        raise RuntimeError("Database not initialized. Call connect_to_database() first.")
    return _database


def get_events_collection() -> AsyncCollection:
    """Raw event stream: clicks, selections, pauses, submits."""
    return get_database()["gameplay_events"]


def get_sessions_collection() -> AsyncCollection:
    """Session-level summary documents."""
    return get_database()["gameplay_sessions"]


def get_snapshots_collection() -> AsyncCollection:
    """Processed behaviour feature vectors (one per step)."""
    return get_database()["behaviour_snapshots"]


def get_shared_sessions_collection() -> AsyncCollection:
    """
    Auth-service sessions collection (shared).
    Used to validate session cookies issued by the Node.js auth service,
    exactly as done in learner-profile-service/app/core/auth.py.
    """
    return get_database()["sessions"]


def get_users_collection() -> AsyncCollection:
    """Shared users collection (written by auth-service)."""
    return get_database()["users"]
