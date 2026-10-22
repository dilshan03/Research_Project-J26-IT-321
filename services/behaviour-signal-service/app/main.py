import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.config import CORS_ORIGINS
from app.db.mongodb import connect_to_database, close_database_connection, get_database
from app.api.routes.events import router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("behaviour_signal.main")

@asynccontextmanager
async def lifespan(app):
    logger.info("Initializing MathQuest Behaviour Signal Service...")
    try:
        await connect_to_database()
        logger.info("MongoDB Atlas connected successfully.")
    except Exception as exc:
        logger.error("Startup database connection failed: %s", exc)
        # Note: Do not crash instantly to allow health checks and the service to run
    yield
    logger.info("Shutting down Behaviour Signal Service...")
    await close_database_connection()

app = FastAPI(title='MathQuest Component 4 Behaviour Signal Service', lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)
app.include_router(router)

@app.get('/health')
def health():
    return {'status': 'ok', 'service': 'behaviour-signal-service'}

@app.get('/api/health/database')
async def database_health():
    try:
        await get_database().command('ping')
        return {'success': True}
    except Exception:
        raise HTTPException(503, 'Database unavailable')
