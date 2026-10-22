from datetime import datetime,timedelta,timezone
from app.schemas.events import RawGameplayEvent
from app.processors.gameplay_tracker import extract_features
from app.processors.signal_fusion import fuse
T=datetime(2026,1,1,tzinfo=timezone.utc)
def event(kind,seconds,**kwargs):
    return RawGameplayEvent(eventId='event-12345678'+str(seconds)+kind,sessionId='session-12345678',learnerId='learner',activityId='activity',eventType=kind,timestamp=T+timedelta(seconds=seconds),stepOrder=1,**kwargs)
def test_response_and_errors():
    snap=extract_features([event('question_start',0),event('answer_submit',1,isCorrect=False),event('answer_submit',2,isCorrect=False),event('answer_submit',3,isCorrect=True)])
    assert snap['responseTimeMs']==1000
    assert snap['maxIncorrectStreak']==2
    assert snap['isCorrect'] is True
    assert snap['totalAttempts']==3
def test_pause_and_fallback():
    snap=extract_features([event('question_start',0),event('pause_detected',5),event('inactivity_end',20,pauseDurationMs=20000)])
    assert snap['inactivityDurationMs']==20000
    assert fuse(snap,None)['mode']=='gameplay_only'
    assert fuse(snap,{'reliable':True,'gazeAway':True})['mode']=='multimodal_rules'
