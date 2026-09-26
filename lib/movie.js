import {drawShape,interpolateShapes} from './animation.js';
import {drawGrid,movieDuration} from './view.js';
export function supportedMovieType(Recorder=globalThis.MediaRecorder,audio=false){
  if(!Recorder)return null;
  return (audio?['video/mp4','video/mp4;codecs=avc1.42E028,mp4a.40.2','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm']:['video/mp4','video/mp4;codecs=avc1.42E028','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm']).find(type=>Recorder.isTypeSupported(type))||null;
}
export const MOVIE_FPS=[24,25,30,60];
export function movieDimensions(width,height,orientation){const landscape=orientation?orientation==='landscape':width>=height;return landscape?{width:1920,height:1080}:{width:1080,height:1920}}
export function fitMovieView(sourceWidth,sourceHeight,width,height){const scale=Math.min(width/sourceWidth,height/sourceHeight);return{scale,x:(width-sourceWidth*scale)/2,y:(height-sourceHeight*scale)/2}}
export function normalizeFps(fps){return MOVIE_FPS.includes(Number(fps))?Number(fps):30}
export function recordMovie({canvas,frames,duration,loop,easing,view,includeGrid=false,fps=30,signal,onProgress=()=>{}}){
  return new Promise((resolve,reject)=>{
    const mimeType=supportedMovieType();
    if(!mimeType||!canvas.captureStream){reject(new Error('Movie export is unavailable in this browser. Try Safari or Chrome.'));return}
    if(signal?.aborted){reject(new DOMException('Export cancelled','AbortError'));return}
    let recorder,stream,raf,timer,finished=false,started=0;const chunks=[];
    const total=movieDuration(frames.length,duration,loop),ctx=canvas.getContext('2d');
    const fit=fitMovieView(view.width,view.height,canvas.width,canvas.height);fps=normalizeFps(fps);let lastDraw=-Infinity;
    function draw(seconds){
      ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#191b20';ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.save();ctx.translate(fit.x,fit.y);ctx.scale(fit.scale,fit.scale);ctx.beginPath();ctx.rect(0,0,view.width,view.height);ctx.clip();
      if(includeGrid)drawGrid(ctx,view.width,view.height,view.scale,view.origin);
      ctx.translate(view.origin.x,view.origin.y);ctx.scale(view.scale,view.scale);
      interpolateShapes(frames,seconds/duration,easing,loop).forEach(s=>drawShape(ctx,s));ctx.restore();
    }
    function cleanup(){cancelAnimationFrame(raf);clearTimeout(timer);signal?.removeEventListener('abort',abort);document.removeEventListener('visibilitychange',visibility);stream?.getTracks().forEach(track=>track.stop())}
    function fail(error){if(finished)return;finished=true;if(recorder?.state!=='inactive'&&recorder)recorder.stop();cleanup();reject(error)}
    function abort(){fail(new DOMException('Export cancelled','AbortError'))}
    function visibility(){if(document.hidden)fail(new Error('Export stopped because the editor was hidden. Keep it open and try again.'))}
    function tick(now){if(finished)return;const seconds=Math.min(total,(now-started)/1000);try{if(now-lastDraw>=1000/fps||seconds>=total){draw(seconds);lastDraw=now}onProgress(seconds/total)}catch(error){fail(error);return}if(seconds>=total){timer=setTimeout(()=>{if(recorder.state!=='inactive')recorder.stop();timer=setTimeout(()=>fail(new Error('The movie encoder did not finish. Please try again.')),8000)},80)}else raf=requestAnimationFrame(tick)}
    try{
      draw(0);stream=canvas.captureStream(fps);recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:fps===60?14_000_000:9_000_000});
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
