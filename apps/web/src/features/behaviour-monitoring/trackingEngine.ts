import type {RawGameplayEvent,TrackingContext} from './types';
import {generateEventId,nowISO} from './eventBuffer';
export function createTrackingEngine(context:TrackingContext,getStep:()=>number|undefined,emit:(e:RawGameplayEvent)=>void){
 let el:HTMLElement|null=null;let last=Date.now();let paused=false;let active=false;let interval:ReturnType<typeof setInterval>|undefined;let lastTouch=0;
 const send=(eventType:RawGameplayEvent['eventType'],extra:Partial<RawGameplayEvent>={})=>{
  const stepOrder=getStep();if(stepOrder===undefined)return;
  emit({eventId:generateEventId(),timestamp:nowISO(),...context,stepOrder,eventType,...extra});
 };
 const interact=()=>{const now=Date.now();if(paused){send('inactivity_end',{pauseDurationMs:now-last});paused=false;}last=now;};
 const coords=(x:number,y:number)=>({pointerX:Math.max(0,Math.min(1,x/Math.max(innerWidth,1))),pointerY:Math.max(0,Math.min(1,y/Math.max(innerHeight,1)))});
 const click=(e:MouseEvent)=>{if(Date.now()-lastTouch<650)return;interact();send('click',coords(e.clientX,e.clientY));};
 const touch=(e:TouchEvent)=>{lastTouch=Date.now();interact();const t=e.touches[0];if(t)send('touch_start',coords(t.clientX,t.clientY));};
 const poll=()=>{if(!active||getStep()===undefined)return;if(!paused&&Date.now()-last>=5000){paused=true;send('pause_detected');}};
 return {
  attach(container:HTMLElement){if(active)this.detach();el=container;last=Date.now();paused=false;active=true;el.addEventListener('click',click);el.addEventListener('touchstart',touch,{passive:true});interval=setInterval(poll,1000);},
  detach(){if(!active)return;el?.removeEventListener('click',click);el?.removeEventListener('touchstart',touch);if(interval)clearInterval(interval);active=false;el=null;},
  resetStep(){last=Date.now();paused=false;}
 };
}
