import {drawShape,interpolateShapes} from './animation.js';
import {drawGrid,movieDuration} from './view.js';
export function supportedMovieType(Recorder=globalThis.MediaRecorder){
  if(!Recorder)return null;
  return ['video/mp4','video/mp4;codecs=avc1.42E028','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(type=>Recorder.isTypeSupported(type))||null;
}
export function movieDimensions(width,height){const factor=Math.min(3,1080/Math.max(width,height));return{width:Math.max(2,Math.round(width*factor/2)*2),height:Math.max(2,Math.round(height*factor/2)*2)}}
export function recordMovie({canvas,frames,duration,loop,easing,view,includeGrid=false,signal,onProgress=()=>{}}){
  return new Promise((resolve,reject)=>{
    const mimeType=supportedMovieType();
    if(!mimeType||!canvas.captureStream){reject(new Error('Movie export is unavailable in this browser. Try Safari or Chrome.'));return}
    if(signal?.aborted){reject(new DOMException('Export cancelled','AbortError'));return}
    let recorder,stream,raf,timer,finished=false,started=0;const chunks=[];
    const total=movieDuration(frames.length,duration,loop),ctx=canvas.getContext('2d');
    const ratio=canvas.width/view.width;
    function draw(seconds){
      ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#191b20';ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.save();ctx.scale(ratio,canvas.height/view.height);
      if(includeGrid)drawGrid(ctx,view.width,view.height,view.scale,view.origin);
      ctx.translate(view.origin.x,view.origin.y);ctx.scale(view.scale,view.scale);
      interpolateShapes(frames,seconds/duration,easing,loop).forEach(s=>drawShape(ctx,s));ctx.restore();
    }
    function cleanup(){cancelAnimationFrame(raf);clearTimeout(timer);signal?.removeEventListener('abort',abort);document.removeEventListener('visibilitychange',visibility);stream?.getTracks().forEach(track=>track.stop())}
    function fail(error){if(finished)return;finished=true;if(recorder?.state!=='inactive'&&recorder)recorder.stop();cleanup();reject(error)}
    function abort(){fail(new DOMException('Export cancelled','AbortError'))}
    function visibility(){if(document.hidden)fail(new Error('Export stopped because the editor was hidden. Keep it open and try again.'))}
    function tick(now){if(finished)return;const seconds=Math.min(total,(now-started)/1000);try{draw(seconds);onProgress(seconds/total)}catch(error){fail(error);return}if(seconds>=total){timer=setTimeout(()=>{if(recorder.state!=='inactive')recorder.stop();timer=setTimeout(()=>fail(new Error('The movie encoder did not finish. Please try again.')),8000)},80)}else raf=requestAnimationFrame(tick)}
    try{
      draw(0);stream=canvas.captureStream(30);recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:6_000_000});
      recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};
      recorder.onerror=()=>fail(new Error('The browser could not encode this movie. Please try again.'));
      recorder.onstart=()=>{started=performance.now();raf=requestAnimationFrame(tick)};
      recorder.onstop=()=>{
        if(finished)return;finished=true;cleanup();
        const type=recorder.mimeType||mimeType,blob=new Blob(chunks,{type});
        if(!blob.size){reject(new Error('The movie was empty. Please try again.'));return}
        onProgress(1);resolve({blob,extension:type.includes('mp4')?'mp4':'webm'});
      };
      signal?.addEventListener('abort',abort,{once:true});document.addEventListener('visibilitychange',visibility);
      recorder.start(250);
    }catch(error){fail(error)}
  });
}
