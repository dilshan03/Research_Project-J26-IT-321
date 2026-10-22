from datetime import datetime
from enum import Enum
from typing import Optional, Any
from pydantic import BaseModel, Field, model_validator, field_validator

class EventType(str, Enum):
    CLICK='click'; TOUCH_START='touch_start'; QUESTION_START='question_start'
    ANSWER_SELECT='answer_select'; ANSWER_CHANGE='answer_change'; ANSWER_SUBMIT='answer_submit'
    PAUSE_DETECTED='pause_detected'; INACTIVITY_END='inactivity_end'; GAME_EXIT='game_exit'

class RawGameplayEvent(BaseModel):
    eventId: str = Field(min_length=8, max_length=100)
    sessionId: str = Field(min_length=8, max_length=100)
    learnerId: str = Field(min_length=1, max_length=100)
    activityId: str = Field(min_length=1, max_length=100)
    eventType: EventType
    timestamp: datetime
    stepOrder: Optional[int] = Field(default=None, ge=1)
    actionType: Optional[str] = None
    questionGrade: Optional[int] = Field(default=None, ge=1, le=5)
    questionDifficulty: Optional[str] = None
    gameTheme: Optional[str] = None
    selectedOption: Optional[str] = Field(default=None,max_length=300)
    isCorrect: Optional[bool] = None
    pointerX: Optional[float] = Field(default=None,ge=0,le=1)
    pointerY: Optional[float] = Field(default=None,ge=0,le=1)
    pauseDurationMs: Optional[int] = Field(default=None,ge=0)
    inactivityDurationMs: Optional[int] = Field(default=None,ge=0)
    meta: Optional[dict[str,Any]] = None
    @field_validator('timestamp')
    @classmethod
    def aware(cls,v):
        if v.tzinfo is None: raise ValueError('UTC offset required')
        return v

class EventBatch(BaseModel):
    events: list[RawGameplayEvent] = Field(min_length=1,max_length=100)
    @model_validator(mode='after')
    def same_context(self):
        if len({(e.sessionId,e.learnerId,e.activityId) for e in self.events})!=1:
            raise ValueError('Batch must have one session, learner and activity')
        return self

class GameSessionCreate(BaseModel):
    sessionId: str
    learnerId: str
    activityId: str
    gameTheme: Optional[str]=None
    grade: Optional[int]=Field(default=None,ge=1,le=5)

class WebcamSignal(BaseModel):
    sessionId: str
    learnerId: str
    activityId: str
    timestamp: datetime
    stepOrder: Optional[int]=Field(default=None,ge=1)
    gazeAway: Optional[bool]=None
    facePresent: Optional[bool]=None
    reliable: bool=False
    @field_validator('timestamp')
    @classmethod
    def aware(cls,v):
        if v.tzinfo is None: raise ValueError('UTC offset required')
        return v
