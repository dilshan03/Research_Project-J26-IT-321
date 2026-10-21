import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import CORS_ORIGINS
from app.db.mongodb import connect_to_database, close_database_connection, get_database
from app.api.v1.learners import router as learners_router
from app.api.v1.onboarding import router as onboarding_router
from app.api.v1.profile import router as profile_router
from app.api.v1.admin import router as admin_router
from app.api.v1.research_analytics import router as research_analytics_router
from app.api.v1.support_information import router as support_information_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("learner_profile.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes database connections on startup and cleans up on shutdown."""
    logger.info("Initializing MathQuest Learner Profile Service...")
    try:
        await connect_to_database()
        logger.info("MongoDB Atlas connected successfully.")
    except Exception as exc:
        logger.error("Startup database connection failed: %s", exc)
        # Note: Do not crash instantly to allow health checks to report status
    yield
    logger.info("Shutting down Learner Profile Service...")
    await close_database_connection()


app = FastAPI(
    title="MathQuest Learner Profile Service",
    description="Backend [A]: Child Learner Profile, Assessment and Onboarding API for MathQuest.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration supporting credentials (cookies) and local development origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 routes
app.include_router(learners_router, prefix="/api/v1")
app.include_router(onboarding_router, prefix="/api/v1")
app.include_router(profile_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")
app.include_router(research_analytics_router, prefix="/api/v1")
app.include_router(support_information_router, prefix="/api/v1")



@app.get("/health", tags=["Health"])
def health():
    """Basic service liveness check."""
    return {"status": "ok", "service": "learner-profile-service"}


@app.get("/api/health", tags=["Health"])
def api_health():
    """Standardized health endpoint matching MathQuest conventions."""
    return {
        "success": True,
        "message": "MathQuest Learner Profile Service is running.",
    }


@app.get("/api/health/database", tags=["Health"])
async def database_health():
    """Checks MongoDB Atlas connectivity and returns status."""
    try:
        db = get_database()
        await db.command("ping")
        return {
            "success": True,
            "message": "MongoDB Atlas connection successful.",
        }
    except Exception as exc:
        return {
            "success": False,
            "message": f"Database connection unavailable: {str(exc)}",
        }
