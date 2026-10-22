export type EventType='click'|'touch_start'|'question_start'|'answer_select'|'answer_change'|'answer_submit'|'pause_detected'|'inactivity_end'|'game_exit';
export interface RawGameplayEvent {
 eventId:string;sessionId:string;learnerId:string;activityId:string;eventType:EventType;timestamp:string;
 stepOrder?:number;actionType?:string;questionGrade?:number;questionDifficulty?:string;gameTheme?:string;
 selectedOption?:string;isCorrect?:boolean;pointerX?:number;pointerY?:number;
 pauseDurationMs?:number;inactivityDurationMs?:number;meta?:Record<string,unknown>;
}
export interface TrackingContext {sessionId:string;learnerId:string;activityId:string;gameTheme:string;grade:number}
