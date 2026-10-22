from pymongo import AsyncMongoClient, ASCENDING
from app.config import MONGODB_URI,MONGODB_DB_NAME
client=None
db=None
async def connect_to_database():
    global client,db
    if not MONGODB_URI: raise RuntimeError('Set MONGODB_URI in root .env')
    candidate=AsyncMongoClient(MONGODB_URI,serverSelectionTimeoutMS=8000)
    try:
        database=candidate[MONGODB_DB_NAME]
        await database.command('ping')
        await database.gameplay_events.create_index([('eventId',ASCENDING)],unique=True)
        await database.gameplay_events.create_index([('sessionId',ASCENDING),('activityId',ASCENDING),('stepOrder',ASCENDING),('timestamp',ASCENDING)])
        await database.gameplay_sessions.create_index([('sessionId',ASCENDING)],unique=True)
        await database.behaviour_snapshots.create_index([('sessionId',ASCENDING),('activityId',ASCENDING),('stepOrder',ASCENDING)],unique=True)
        await database.webcam_signals.create_index([('sessionId',ASCENDING),('timestamp',ASCENDING)])
        await database.behaviour_results.create_index([('sessionId',ASCENDING),('stepOrder',ASCENDING)])
    except Exception:
        await candidate.close()
        raise
    client,db=candidate,database
    return db
async def close_database_connection():
    global client,db
    if client is not None: await client.close()
    client,db=None,None
def get_database():
    if db is None: raise RuntimeError('Database unavailable')
    return db
def get_events_collection(): return get_database().gameplay_events
def get_snapshots_collection(): return get_database().behaviour_snapshots
