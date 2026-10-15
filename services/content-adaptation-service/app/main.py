import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router as adaptations_router
from app.api.syllabus_routes import router as syllabus_router
from app.services.db import db_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database connection on startup
    await db_service.initialize()
    yield


app = FastAPI(
    title="MathQuest Content Adaptation Service",
    description="Converts Sri Lankan NIE mathematics syllabus PDFs and questions into ADHD-friendly game blueprints.",
    version="0.2.0",
    lifespan=lifespan,
)

origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000,*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core adaptation routes
app.include_router(adaptations_router)

# Multi-grade syllabus ingestion and hybrid adaptation routes
app.include_router(syllabus_router)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "content-adaptation-service",
        "mongo_connected": db_service.is_connected,
    }
