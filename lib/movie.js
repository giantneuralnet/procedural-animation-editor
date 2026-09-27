import {preloadImages,imageSources} from './images.js';
import {timelinePosition} from './timing.js';
import {drawMovieScene} from './movie-scene.js';
export {fitMovieView} from './movie-scene.js';
import {frameClock,captureCanvas} from './recording-clock.js';
import {encodeAnimation} from './fast-movie.js';
import {drawCameraOverlay} from './camera.js';
import {interpolateShapes} from './animation.js';
import {movieDuration} from './view.js';
export function supportedMovieType(Recorder=globalThis.MediaRecorder,audio=false){
  if(!Recorder)return null;
  return (audio?['video/mp4','video/mp4;codecs=avc1.42E028,mp4a.40.2','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm']:['video/mp4','video/mp4;codecs=avc1.42E028','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm']).find(type=>Recorder.isTypeSupported(type))||null;
}
export const MOVIE_FPS=[24,25,30,60];
export function movieDimensions(width,height,orientation){const landscape=orientation?orientation==='landscape':width>=height;return landscape?{width:1920,height:1080}:{width:1080,height:1920}}

export function normalizeFps(fps){return MOVIE_FPS.includes(Number(fps))?Number(fps):30}
export function recordMovieRealtime({canvas,frames,symbols={},duration,loop,easing,view,includeGrid=false,fps=30,getCameraOverlay,signal,onProgress=()=>{}}){
  return new Promise((resolve,reject)=>{
    const mimeType=supportedMovieType();
    if(!mimeType||!canvas.captureStream){reject(new Error('Movie export is unavailable in this browser. Try Safari or Chrome.'));return}
    if(signal?.aborted){reject(new DOMException('Export cancelled','AbortError'));return}
    let recorder,stream,raf,timer,finished=false,started=0;const chunks=[];
    const total=movieDuration(frames.length,duration,loop,symbols,frames);fps=normalizeFps(fps);const due=frameClock(fps);let capture;
    const draw=createMovieRenderer({canvas,frames,symbols,duration,loop,easing,view,includeGrid,getCameraOverlay});
    function cleanup(){cancelAnimationFrame(raf);clearTimeout(timer);signal?.removeEventListener('abort',abort);document.removeEventListener('visibilitychange',visibility);stream?.getTracks().forEach(track=>track.stop())}
    function fail(error){if(finished)return;finished=true;if(recorder?.state!=='inactive'&&recorder)recorder.stop();cleanup();reject(error)}
    function abort(){fail(new DOMException('Export cancelled','AbortError'))}
    function visibility(){if(document.hidden)fail(new Error('Export stopped because the editor was hidden. Keep it open and try again.'))}
    function tick(now){if(finished)return;const seconds=Math.min(total,(now-started)/1000);try{if(due(now)||seconds>=total){draw(seconds);capture.request()}onProgress(seconds/total)}catch(error){fail(error);return}if(seconds>=total){timer=setTimeout(()=>{if(recorder.state!=='inactive')recorder.stop();timer=setTimeout(()=>fail(new Error('The movie encoder did not finish. Please try again.')),8000)},80)}else raf=requestAnimationFrame(tick)}
    try{
      draw(0);capture=captureCanvas(canvas,fps);stream=capture.stream;recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:fps===60?14_000_000:9_000_000});
      recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};
      recorder.onerror=()=>fail(new Error('The browser could not encode this movie. Please try again.'));
      recorder.onstart=()=>{started=performance.now();draw(0);capture.request();raf=requestAnimationFrame(tick)};
      recorder.onstop=()=>{
        if(finished)return;finished=true;cleanup();
        const type=recorder.mimeType||mimeType,blob=new Blob(chunks,{type});
        if(!blob.size){reject(new Error('The movie was empty. Please try again.'));return}
        onProgress(1);resolve({blob,extension:type.includes('mp4')?'mp4':'webm',width:canvas.width,height:canvas.height,fps,seconds:total,frameRateMode:'variable'});
      };
      signal?.addEventListener('abort',abort,{once:true});document.addEventListener('visibilitychange',visibility);
      recorder.start(250);
    }catch(error){fail(error)}
  });
}

export function createMovieRenderer({canvas,frames,symbols={},duration,loop,easing,view,includeGrid=false,getCameraOverlay}){
 const ctx=canvas.getContext('2d');
 return seconds=>{drawMovieScene(ctx,canvas.width,canvas.height,{view,includeGrid,symbols,time:seconds,shapes:interpolateShapes(frames,timelinePosition(frames,seconds,duration,false),easing,false)});drawCameraOverlay(ctx,getCameraOverlay?.(),canvas.width,canvas.height)};
}
export async function recordMovie(options){
 const imageProject={frames:options.frames,symbols:options.symbols||{}};if(imageSources(imageProject).length)await preloadImages(imageProject);
 const fps=normalizeFps(options.fps);
 if(typeof globalThis.VideoEncoder!=='undefined'&&!options.getCameraOverlay?.()){
  const movie=await encodeAnimation({...options,fps,draw:createMovieRenderer(options),seconds:movieDuration(options.frames.length,options.duration,options.loop,options.symbols,options.frames)});
  if(movie)return movie;
 }
 options.onMode?.('live');return recordMovieRealtime({...options,fps});
}
