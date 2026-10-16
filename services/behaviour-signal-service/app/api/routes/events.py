from datetime import datetime,timezone
from fastapi import APIRouter,HTTPException,Request,Depends
from pymongo.errors import DuplicateKeyError
from app.config import DEV_ALLOW_UNAUTHENTICATED,AUTH_COOKIE_NAME
from app.db.mongodb import get_database,get_events_collection,get_snapshots_collection
from app.schemas.events import EventBatch,GameSessionCreate,WebcamSignal
from app.processors.gameplay_tracker import process_batch
from app.processors.signal_fusion import fuse

router=APIRouter(prefix='/api/v1/behaviour',tags=['Behaviour'])
async def require_auth(request:Request):
    # IMPORTANT: adapter required for production. Do not trust a cookie's mere presence.
    if DEV_ALLOW_UNAUTHENTICATED: return
    raise HTTPException(status_code=503,detail='Authentication adapter not configured: integrate auth-service session validation')

@router.post('/sessions',dependencies=[Depends(require_auth)])
async def open_session(payload:GameSessionCreate):
    db=get_database()
    doc=payload.model_dump()|{'startedAt':datetime.now(timezone.utc),'status':'active'}
    try: await db.gameplay_sessions.insert_one(doc)
    except DuplicateKeyError: raise HTTPException(409,'Session already exists')
    doc.pop('_id',None)
    return doc

@router.delete('/sessions/{session_id}',dependencies=[Depends(require_auth)])
async def close_session(session_id:str):
    result=await get_database().gameplay_sessions.update_one({'sessionId':session_id,'status':'active'},{'$set':{'status':'finished','endedAt':datetime.now(timezone.utc)}})
    if not result.matched_count:raise HTTPException(404,'Active session not found')
    return {'success':True}

@router.post('/events',dependencies=[Depends(require_auth)])
async def receive_events(payload:EventBatch):
    db=get_database(); first=payload.events[0]
    session=await db.gameplay_sessions.find_one({'sessionId':first.sessionId,'learnerId':first.learnerId,'activityId':first.activityId,'status':'active'})
    if not session:raise HTTPException(409,'Session missing, closed or mismatched')
    stored=[];duplicates=0
    for event in payload.events:
        try:
            await get_events_collection().insert_one(event.model_dump())
            stored.append(event)
        except DuplicateKeyError:duplicates+=1
    updated=await process_batch(first.sessionId,first.learnerId,first.activityId,stored) if stored else 0
    return {'success':True,'stored':len(stored),'duplicates':duplicates,'snapshots':updated,'message':'Events processed'}

@router.post('/webcam',dependencies=[Depends(require_auth)])
async def receive_webcam(signal:WebcamSignal):
    doc=signal.model_dump()
    await get_database().webcam_signals.insert_one(doc)
    return {'success':True}

@router.get('/sessions/{session_id}/steps/{step_order}/behaviour',dependencies=[Depends(require_auth)])
async def get_behaviour(session_id:str,step_order:int):
    db=get_database()
    snap=await get_snapshots_collection().find_one({'sessionId':session_id,'stepOrder':step_order})
    if not snap:raise HTTPException(404,'Snapshot not found')
    webcam=await db.webcam_signals.find_one({'sessionId':session_id,'stepOrder':step_order},sort=[('timestamp',-1)])
    result=fuse(snap,webcam)
    return {'success':True,'result':result}
