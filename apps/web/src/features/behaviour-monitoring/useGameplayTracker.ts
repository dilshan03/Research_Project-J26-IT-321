import {useEffect,useRef,useState} from 'react';
import type {RawGameplayEvent,TrackingContext} from './types';
import {createEventBuffer,generateEventId,nowISO} from './eventBuffer';
import {createTrackingEngine} from './trackingEngine';
export interface UseGameplayTrackerOptions {learnerId:string;activityId:string;gameTheme:string;grade:number;containerRef:React.RefObject<HTMLElement|null>;onGameplayEvent?:(event:RawGameplayEvent)=>void}
export function useGameplayTracker({learnerId,activityId,gameTheme,grade,containerRef,onGameplayEvent}:UseGameplayTrackerOptions){
 const [ready,setReady]=useState(false);
 const current=useRef<{buffer:ReturnType<typeof createEventBuffer>;engine:ReturnType<typeof createTrackingEngine>;context:TrackingContext}|null>(null);
 const step=useRef<number|undefined>(undefined);const previous=useRef<string|null>(null);
 const callbackRef=useRef(onGameplayEvent);
 useEffect(()=>{callbackRef.current=onGameplayEvent;},[onGameplayEvent]);
 const summaryEventsRef=useRef<RawGameplayEvent[]>([]);
 const saveSummary=(context:TrackingContext)=>{
  // Temporary local demo summary. The backend buffer remains the source of truth.
  try {
   if (typeof window !== 'undefined') {
    sessionStorage.setItem('mathquest:gameplay-summary:v1',JSON.stringify({
     sessionId:context.sessionId,activityId:context.activityId,updatedAt:Date.now(),
     events:summaryEventsRef.current.map(e=>({
      eventId:e.eventId,sessionId:e.sessionId,timestamp:e.timestamp,eventType:e.eventType,
      stepOrder:e.stepOrder,isCorrect:e.isCorrect,selectedOption:e.selectedOption
     }))
    }));
   }
  }catch(error){console.warn('Unable to save local gameplay summary',error);}
 };
 const forward=(event:RawGameplayEvent)=>{
  // Avoid duplicates; cap browser-tab storage while backend retains full events.
  if(!summaryEventsRef.current.some(e=>e.eventId===event.eventId)){
   summaryEventsRef.current.push(event);
   if(summaryEventsRef.current.length>2000)summaryEventsRef.current.shift();
   if(current.current)saveSummary(current.current.context);
  }
  try{callbackRef.current?.(event);}catch(error){console.warn('Gameplay summary callback failed',error);}
 };
 const emit=(eventType:RawGameplayEvent['eventType'],extra:Partial<RawGameplayEvent>={})=>{
  if(!current.current)return;
  const event:RawGameplayEvent={eventId:generateEventId(),timestamp:nowISO(),...current.current.context,eventType,stepOrder:step.current,...extra};
  current.current.buffer.push(event);forward(event);
 };
 useEffect(()=>{
  if(!learnerId||!activityId||!containerRef.current)return;
  const context={sessionId:generateEventId(),learnerId,activityId,gameTheme,grade};
  summaryEventsRef.current=[];
  saveSummary(context);
  const buffer=createEventBuffer();const engine=createTrackingEngine(context,()=>step.current,e=>{buffer.push(e);forward(e);});
  current.current={buffer,engine,context};
  if(containerRef.current){engine.attach(containerRef.current);setReady(true);}
  void buffer.openSession(context).catch(error=>console.warn('Behaviour backend unavailable; local tracking continues',error));
  return ()=>{engine.detach();saveSummary(context);if(current.current?.context.sessionId===context.sessionId)current.current=null;void buffer.finish(context.sessionId).catch(console.warn);};
 },[learnerId,activityId,gameTheme,grade,containerRef]);
 return {
  isTracking:ready,
  onStepStart(order:number,actionType:string,questionDifficulty?:string){step.current=order;previous.current=null;current.current?.engine.resetStep();emit('question_start',{stepOrder:order,actionType,questionDifficulty});},
  onAnswerSelect(option:string){if(step.current===undefined)return;emit('answer_select',{selectedOption:option});if(previous.current!==null&&previous.current!==option)emit('answer_change',{selectedOption:option});previous.current=option;},
  onAnswerSubmit(option:string,isCorrect:boolean){emit('answer_submit',{selectedOption:option,isCorrect});previous.current=null;void current.current?.buffer.flush().catch(console.warn);},
  async onGameExit(){emit('game_exit');if(current.current)await current.current.buffer.finish(current.current.context.sessionId);},
 };
}
