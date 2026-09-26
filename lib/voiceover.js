import {frameClock,captureCanvas} from './recording-clock.js';
import {microphoneMixer} from './microphone-mixer.js';
import {drawCameraOverlay} from './camera.js';
import {supportedMovieType,normalizeFps,fitMovieView} from './movie.js';
export async function startVoiceRecording({source,width,height,fps=30,getCameraOverlay,getMicrophoneStream,signal,onState=()=>{},onTime=()=>{}}){
 const mimeType=supportedMovieType(globalThis.MediaRecorder,true);
 if(!mimeType||!source.captureStream||(!getMicrophoneStream&&!navigator.mediaDevices?.getUserMedia))throw new Error('Microphone recording is unavailable here. Open this site in Safari or Chrome.');
 if(signal?.aborted)throw new DOMException('Recording cancelled','AbortError');
 let mic,mixer;
 if(getMicrophoneStream){mixer=await microphoneMixer(getMicrophoneStream);mic=mixer.stream}else try{mic=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false})}catch(error){if(error.name==='NotAllowedError')throw new Error('Microphone access was denied. Allow it in your browser settings, then press Record again.');if(error.name==='NotFoundError')throw new Error('No microphone was found. Connect one and try again.');throw error}
 if(signal?.aborted){mixer?.close();mic.getTracks().forEach(t=>t.stop());throw new DOMException('Recording cancelled','AbortError')}
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext('2d');fps=normalizeFps(fps);
 let video,stream,recorder,raf,timer,settled=false,closing=false,paused=false,started=0,pausedAt=0,pausedTotal=0,lastTime=-Infinity,capture;const due=frameClock(fps);
 let resolveResult,rejectResult;const chunks=[];const result=new Promise((resolve,reject)=>{resolveResult=resolve;rejectResult=reject});result.catch(()=>{});
 const elapsed=()=>!started?0:Math.max(0,((paused?pausedAt:performance.now())-started-pausedTotal)/1000);
 const draw=()=>{ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#191b20';ctx.fillRect(0,0,width,height);const fit=fitMovieView(source.width,source.height,width,height);ctx.drawImage(source,fit.x,fit.y,source.width*fit.scale,source.height*fit.scale);drawCameraOverlay(ctx,getCameraOverlay?.(),width,height)};
 const cleanup=()=>{cancelAnimationFrame(raf);clearTimeout(timer);document.removeEventListener('visibilitychange',visibility);signal?.removeEventListener('abort',cancel);if(mixer)mixer.close();else mic.getTracks().forEach(t=>{t.removeEventListener?.('ended',lostMic);t.stop()});video?.getTracks().forEach(t=>t.stop())};
 const fail=error=>{if(settled)return;settled=true;try{if(recorder&&recorder.state!=='inactive')recorder.stop()}catch{}cleanup();rejectResult(error)};
 function cancel(){fail(new DOMException('Recording cancelled','AbortError'))}
 function lostMic(){fail(new Error('The microphone disconnected. Please reconnect it and record again.'))}
 function pause(){if(settled||closing||paused||recorder?.state!=='recording')return;recorder.pause();paused=true;pausedAt=performance.now();if(mixer)mixer.pause();else mic.getAudioTracks().forEach(t=>t.enabled=false);onState('paused');onTime(elapsed())}
 function resume(){if(settled||closing||!paused)return;pausedTotal+=performance.now()-pausedAt;paused=false;if(mixer)mixer.resume();else mic.getAudioTracks().forEach(t=>t.enabled=true);recorder.resume();onState('recording')}
 function visibility(){if(document.hidden)pause()}
 function tick(now){if(settled||closing)return;try{mixer?.sync();if(!paused&&due(now)){draw();capture.request();if(now-lastTime>=100){onTime(elapsed());lastTime=now}}}catch(error){fail(error);return}raf=requestAnimationFrame(tick)}
 function stop(){if(!settled&&!closing){closing=true;cancelAnimationFrame(raf);try{if(recorder.state==='paused'){pausedTotal+=performance.now()-pausedAt;paused=false;recorder.resume()}draw();capture.request();recorder.stop();timer=setTimeout(()=>fail(new Error('The recording could not finish. Please try again.')),8000)}catch(error){fail(error)}}return result}
 try{
  draw();capture=captureCanvas(canvas,fps);video=capture.stream;stream=new MediaStream([...video.getVideoTracks(),...mic.getAudioTracks()]);
  recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:fps===60?14_000_000:9_000_000,audioBitsPerSecond:128_000});
  recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};
  recorder.onerror=()=>fail(new Error('The recording was interrupted. Please try again.'));
  recorder.onstart=()=>{started=performance.now();draw();capture.request();onState('recording');raf=requestAnimationFrame(tick)};
  recorder.onstop=()=>{if(settled)return;settled=true;const seconds=elapsed();cleanup();const type=recorder.mimeType||mimeType,blob=new Blob(chunks,{type});if(!blob.size){rejectResult(new Error('The recording was empty. Please try again.'));return}resolveResult({blob,extension:type.includes('mp4')?'mp4':'webm',width,height,fps,seconds,frameRateMode:'variable'})};
  signal?.addEventListener('abort',cancel,{once:true});document.addEventListener('visibilitychange',visibility);if(!mixer)mic.getAudioTracks().forEach(t=>t.addEventListener?.('ended',lostMic));recorder.start(250);
 }catch(error){fail(error);throw error}
 return{result,pause,resume,stop,cancel};
}
