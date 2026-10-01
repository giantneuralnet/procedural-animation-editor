import {framePlan} from './recording-clock.js';
const abortError=()=>new DOMException('Export cancelled','AbortError');
export async function encodeAnimation({canvas,draw,seconds,fps,signal,onProgress=()=>{},onMode=()=>{}},library){
 if(signal?.aborted)throw abortError();
 if(!library&&typeof globalThis.VideoEncoder==='undefined')return null;
 const media=library||await import('mediabunny');
 const bitrate=fps>=60?14_000_000:9_000_000;
 if(!await media.canEncodeVideo('avc',{width:canvas.width,height:canvas.height,frameRate:fps,bitrate}))return null;
 if(signal?.aborted)throw abortError();
 const output=new media.Output({format:new media.Mp4OutputFormat({fastStart:'in-memory'}),target:new media.BufferTarget()});
 const source=new media.CanvasSource(canvas,{codec:'avc',bitrate,keyFrameInterval:2});
 output.addVideoTrack(source,{frameRate:fps});
 const plan=framePlan(seconds,fps);let cancelled=false;
 const cancel=()=>{cancelled=true;void output.cancel().catch(()=>{})};signal?.addEventListener('abort',cancel,{once:true});
 try{
  onMode('fast');await output.start();
  for(let i=0;i<plan.count;i++){
   if(cancelled||signal?.aborted)throw abortError();
   draw(plan.timestamp(i));await source.add(plan.timestamp(i),plan.duration);onProgress((i+1)/plan.count);
   // Yield for Cancel and progress painting without tying encoding to playback speed.
   if(i%12===11)await new Promise(resolve=>setTimeout(resolve,0));
  }
  if(cancelled||signal?.aborted)throw abortError();await output.finalize();
  if(cancelled||signal?.aborted)throw abortError();
  return{blob:new Blob([output.target.buffer],{type:'video/mp4'}),extension:'mp4',width:canvas.width,height:canvas.height,fps,seconds:plan.seconds,frameRateMode:'constant'};
 }catch(error){await output.cancel().catch(()=>{});if(cancelled||signal?.aborted)throw abortError();throw error}
 finally{signal?.removeEventListener('abort',cancel)}
}
