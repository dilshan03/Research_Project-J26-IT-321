"""
MathQuest Behaviour Signal Service – FastAPI application entry point.
Component 4: Gameplay Interaction & Behaviour Signal Engine

Service ports (see .env):
  auth-service            → 5000  (Node.js, untouched)
  learner-profile-service → 5001  (Python FastAPI)
  content-adaptation-service → 8003 (Python FastAPI)
  behaviour-signal-service   → 8004 (Python FastAPI) ← this service

Usage:
  uvicorn app.main:app --reload --port 8004
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGINS
from app.db.mongodb import connect_to_database, close_database_connection
from app.api.routes.events import router as events_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("behaviour_signal.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Connect to MongoDB on startup, close cleanly on shutdown."""
    logger.info("Starting MathQuest Behaviour Signal Service…")
    try:
        await connect_to_database()
        logger.info("MongoDB Atlas connected successfully.")
    except Exception as exc:
        logger.error("Startup DB connection failed: %s", exc)
        # Continue so health checks can still respond
    yield
    logger.info("Shutting down Behaviour Signal Service…")
    await close_database_connection()


app = FastAPI(
    title="MathQuest Behaviour Signal Service",
    description=(
        "Component 4 – Gameplay Interaction & Behaviour Signal Engine. "
        "Ingests raw gameplay events, extracts behaviour features, and "
        "prepares structured BehaviourSnapshots for the detection pipeline."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS (mirrors all other Python services) ─────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ───────────────────────────────────────────────────────────────────
app.include_router(events_router)


# ── Health endpoints ─────────────────────────────────────────────────────────

@app.get("/health", tags=["Health"])
def health():
    """Basic liveness check."""
    return {"status": "ok", "service": "behaviour-signal-service"}


@app.get("/api/health", tags=["Health"])
def api_health():
    """Standardised health endpoint matching MathQuest conventions."""
    return {
        "success": True,
        "message": "MathQuest Behaviour Signal Service is running.",
    }


@app.get("/api/health/database", tags=["Health"])
async def database_health():
    """Checks MongoDB Atlas connectivity."""
    from app.db.mongodb import get_database
    try:
        db = get_database()
        await db.command("ping")
        return {"success": True, "message": "MongoDB Atlas connection successful."}
    except Exception as exc:
        return {"success": False, "message": f"Database unavailable: {str(exc)}"}
