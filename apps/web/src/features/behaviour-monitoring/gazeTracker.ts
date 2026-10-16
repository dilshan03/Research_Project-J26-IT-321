// WebGazer requires explicit calibration for meaningful gaze-away detection.
// Import after npm install webgazer (types may require a local declaration).
export async function startGazeTracker(onGaze:(x:number,y:number)=>void){
 const mod=await import('webgazer');
 const webgazer=mod.default;
 webgazer.setGazeListener((data:{x:number;y:number}|null)=>{if(data)onGaze(data.x,data.y);});
 await webgazer.begin();
 return ()=>{webgazer.clearGazeListener();webgazer.end();};
}
