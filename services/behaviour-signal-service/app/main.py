from contextlib import asynccontextmanager
from fastapi import FastAPI,HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.config import CORS_ORIGINS
from app.db.mongodb import connect_to_database,close_database_connection,get_database
from app.api.routes.events import router
@asynccontextmanager
async def lifespan(app):
    await connect_to_database()
    yield
    await close_database_connection()
app=FastAPI(title='MathQuest Component 4 Behaviour Signal Service',lifespan=lifespan)
app.add_middleware(CORSMiddleware,allow_origins=CORS_ORIGINS,allow_credentials=True,allow_methods=['*'],allow_headers=['*'])
app.include_router(router)
@app.get('/health')
def health():return {'status':'ok','service':'behaviour-signal-service'}
@app.get('/api/health/database')
async def database_health():
    try:
        await get_database().command('ping')
        return {'success':True}
    except Exception:raise HTTPException(503,'Database unavailable')
