from datetime import datetime,timezone
from app.config import VERY_FAST_RESPONSE_MS,LONG_PAUSE_THRESHOLD_MS
from app.db.mongodb import get_events_collection,get_snapshots_collection

def extract_features(events):
    # Events already validated by Pydantic and sorted by timestamp.
    events=sorted(events,key=lambda e:e.timestamp)
    starts=[e for e in events if e.eventType.value=='question_start']
    submits=[e for e in events if e.eventType.value=='answer_submit']
    response=None
    if starts and submits:
        start=starts[0].timestamp
        first=next((s for s in submits if s.timestamp>=start),None)
        if first: response=int((first.timestamp-start).total_seconds()*1000)
    current=maximum=0
    for e in submits:
        if e.isCorrect is False: current+=1;maximum=max(maximum,current)
        elif e.isCorrect is True: current=0
    # Inactivity_end contains per-interval duration; don't sum cumulative counters.
    idle=sum(e.pauseDurationMs or 0 for e in events if e.eventType.value=='inactivity_end')
    # Pending pause is not counted as completed inactivity.
    click_events=[e for e in events if e.eventType.value in ('click','touch_start')]
    physical_clicks=len(click_events)
    changes=sum(e.eventType.value=='answer_change' for e in events)
    meta=next((e for e in events if e.questionDifficulty),None)
    return dict(responseTimeMs=response,isVeryFast=response is not None and response<VERY_FAST_RESPONSE_MS,
        totalAttempts=len(submits),isCorrect=submits[-1].isCorrect if submits else None,
        currentIncorrectStreak=current,maxIncorrectStreak=maximum,consecutiveIncorrect=maximum,
        clickCount=physical_clicks,answerChanges=changes,
        interactionFreqHz=round(physical_clicks/(response/1000),3) if response and response>0 else None,
        inactivityDurationMs=idle,longPauseDetected=any((e.pauseDurationMs or 0)>=LONG_PAUSE_THRESHOLD_MS for e in events if e.eventType.value=='inactivity_end') or any(e.eventType.value=='pause_detected' for e in events),
        inactivityDetected=any(e.eventType.value in ('pause_detected','inactivity_end') for e in events),
        questionDifficulty=meta.questionDifficulty if meta else None)

async def process_batch(session_id,learner_id,activity_id,new_events):
    steps={e.stepOrder for e in new_events if e.stepOrder is not None}
    count=0
    for step in steps:
        cursor=get_events_collection().find({'sessionId':session_id,'activityId':activity_id,'stepOrder':step}).sort('timestamp',1)
        from app.schemas.events import RawGameplayEvent
        events=[]
        async for doc in cursor:
            doc.pop('_id',None)
            events.append(RawGameplayEvent.model_validate(doc))
        if not events:continue
        snap=dict(sessionId=session_id,learnerId=learner_id,activityId=activity_id,stepOrder=step,snapshotAt=datetime.now(timezone.utc),**extract_features(events))
        await get_snapshots_collection().replace_one({'sessionId':session_id,'activityId':activity_id,'stepOrder':step},snap,upsert=True)
        count+=1
    return count
