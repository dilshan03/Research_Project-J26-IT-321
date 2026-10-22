import {useEffect,useRef,useState} from 'react';
import type {RawGameplayEvent,TrackingContext} from './types';
import {createEventBuffer,generateEventId,nowISO} from './eventBuffer';
import {createTrackingEngine} from './trackingEngine';
export interface UseGameplayTrackerOptions {learnerId:string;activityId:string;gameTheme:string;grade:number;containerRef:React.RefObject<HTMLElement|null>}
export function useGameplayTracker({learnerId,activityId,gameTheme,grade,containerRef}:UseGameplayTrackerOptions){
 const [ready,setReady]=useState(false);
 const current=useRef<{buffer:ReturnType<typeof createEventBuffer>;engine:ReturnType<typeof createTrackingEngine>;context:TrackingContext}|null>(null);
 const step=useRef<number|undefined>(undefined);const previous=useRef<string|null>(null);
 const emit=(eventType:RawGameplayEvent['eventType'],extra:Partial<RawGameplayEvent>={})=>{
  if(!current.current)return;
  current.current.buffer.push({eventId:generateEventId(),timestamp:nowISO(),...current.current.context,eventType,stepOrder:step.current,...extra});
 };
 useEffect(()=>{
  if(!learnerId||!activityId||!containerRef.current)return;
  const context={sessionId:generateEventId(),learnerId,activityId,gameTheme,grade};
  const buffer=createEventBuffer();const engine=createTrackingEngine(context,()=>step.current,e=>buffer.push(e));
  current.current={buffer,engine,context};let disposed=false;
  void buffer.openSession(context).then(()=>{if(!disposed){engine.attach(containerRef.current!);setReady(true);}}).catch(console.error);
  return ()=>{disposed=true;engine.detach();setReady(false);if(current.current?.context.sessionId===context.sessionId)current.current=null;void buffer.finish(context.sessionId).catch(console.warn);};
 },[learnerId,activityId,gameTheme,grade,containerRef]);
 return {
  isTracking:ready,
  onStepStart(order:number,actionType:string,questionDifficulty?:string){step.current=order;previous.current=null;current.current?.engine.resetStep();emit('question_start',{stepOrder:order,actionType,questionDifficulty});},
  onAnswerSelect(option:string){if(step.current===undefined)return;emit('answer_select',{selectedOption:option});if(previous.current!==null&&previous.current!==option)emit('answer_change',{selectedOption:option});previous.current=option;},
  onAnswerSubmit(option:string,isCorrect:boolean){emit('answer_submit',{selectedOption:option,isCorrect});void current.current?.buffer.flush().catch(console.warn);},
  async onGameExit(){emit('game_exit');if(current.current)await current.current.buffer.finish(current.current.context.sessionId);},
 };
}
