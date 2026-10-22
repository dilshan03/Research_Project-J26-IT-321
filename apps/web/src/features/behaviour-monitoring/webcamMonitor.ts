// Browser-only derived signals. Install: npm install webgazer @mediapipe/tasks-vision
// Camera access requires explicit user/guardian consent and secure context (HTTPS or localhost).
import {FaceLandmarker,FilesetResolver} from '@mediapipe/tasks-vision';
export type WebcamSample={timestamp:string;gazeAway:boolean|null;facePresent:boolean|null;reliable:boolean};
export async function startWebcamMonitoring(video:HTMLVideoElement,onSample:(sample:WebcamSample)=>void){
 const stream=await navigator.mediaDevices.getUserMedia({video:true,audio:false});
 video.srcObject=stream;await video.play();
 const vision=await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm');
 const face=await FaceLandmarker.createFromOptions(vision,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'},runningMode:'VIDEO',numFaces:1});
 let active=true;let busy=false;
 const timer=setInterval(()=>{if(!active||busy||video.readyState<2)return;busy=true;try{
  const result=face.detectForVideo(video,performance.now());
  // Face landmarks are NOT gaze estimates. WebGazer must be calibrated separately.
  onSample({timestamp:new Date().toISOString(),gazeAway:null,facePresent:result.faceLandmarks.length>0,reliable:false});
 }finally{busy=false;}},500);
 return ()=>{active=false;clearInterval(timer);face.close();stream.getTracks().forEach(t=>t.stop());video.srcObject=null;};
}
