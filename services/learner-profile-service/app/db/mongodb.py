import logging
from typing import Optional
from pymongo import AsyncMongoClient, ASCENDING
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.asynchronous.collection import AsyncCollection
from app.config import MONGODB_URI, MONGODB_DB_NAME

logger = logging.getLogger("learner_profile.db")

_client: Optional[AsyncMongoClient] = None
_database: Optional[AsyncDatabase] = None


async def connect_to_database() -> AsyncDatabase:
    """Connects to MongoDB Atlas using PyMongo's official Async API and returns the database."""
    global _client, _database

    if _database is not None:
        return _database

    if not MONGODB_URI:
        raise ValueError("MONGODB_URI environment variable is not configured.")

    logger.info("Connecting to MongoDB Atlas via PyMongo Async API...")
    _client = AsyncMongoClient(MONGODB_URI)
    _database = _client[MONGODB_DB_NAME]

    # Verify connection
    await _database.command("ping")
    logger.info("Successfully connected to MongoDB Atlas database: %s", MONGODB_DB_NAME)

    # Ensure required indexes on existing 'learners' collection
    await init_indexes()

    return _database


async def init_indexes() -> None:
    """Initializes indexes on learners, onboarding, questionnaires, and assessments collections."""
    if _database is None:
        return
    try:
        learners_col = _database["learners"]
        await learners_col.create_index([("learnerId", ASCENDING)], unique=True)
        await learners_col.create_index([("parentId", ASCENDING)])

        onboarding_col = _database["learner_onboarding"]
        await onboarding_col.create_index([("learnerId", ASCENDING)], unique=True)
        await onboarding_col.create_index([("parentId", ASCENDING)])

        questionnaires_col = _database["learner_questionnaires"]
        await questionnaires_col.create_index([("learnerId", ASCENDING)], unique=True)
        await questionnaires_col.create_index([("parentId", ASCENDING)])

        assessments_col = _database["learner_assessments"]
        await assessments_col.create_index([("learnerId", ASCENDING)])
        await assessments_col.create_index([("parentId", ASCENDING)])

        events_col = _database["learner_gameplay_events"]
        await events_col.create_index([("eventId", ASCENDING)], unique=True)
        await events_col.create_index([("learnerId", ASCENDING)])
        await events_col.create_index([("skillId", ASCENDING)])
        await events_col.create_index([("activityTimestamp", ASCENDING)])

        logger.info("MongoDB collections and indexes initialized successfully.")
    except Exception as exc:
        logger.warning("Index initialization notice: %s", exc)


async def close_database_connection() -> None:
    """Closes the MongoDB connection."""
    global _client, _database
    if _client is not None:
        await _client.close()
        _client = None
        _database = None
        logger.info("MongoDB Atlas connection closed cleanly.")


def get_database() -> AsyncDatabase:
    """Returns the current database instance."""
    if _database is None:
        raise RuntimeError("Database connection has not been initialized.")
    return _database


def get_learners_collection() -> AsyncCollection:
    return get_database()["learners"]


def get_sessions_collection() -> AsyncCollection:
    return get_database()["sessions"]


def get_users_collection() -> AsyncCollection:
    return get_database()["users"]


def get_onboarding_collection() -> AsyncCollection:
    return get_database()["learner_onboarding"]


def get_questionnaires_collection() -> AsyncCollection:
    return get_database()["learner_questionnaires"]


def get_assessments_collection() -> AsyncCollection:
    return get_database()["learner_assessments"]


def get_gameplay_events_collection() -> AsyncCollection:
    return get_database()["learner_gameplay_events"]


