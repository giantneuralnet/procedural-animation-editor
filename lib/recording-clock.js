// Keep deadlines anchored to a frame grid. Resetting to `now` after every draw
// loses a refresh whenever a 60 Hz timestamp falls just short of 33.333 ms.
export function frameClock(fps){let next=null;const interval=1000/fps;return now=>{if(next===null)next=now;if(now+.5<next)return false;next+=Math.max(1,Math.floor((now+.5-next)/interval)+1)*interval;return true}}
export function captureCanvas(canvas,fps){
 const manual=typeof globalThis.CanvasCaptureMediaStreamTrack?.prototype?.requestFrame==='function';
 const stream=canvas.captureStream(manual?0:fps),track=stream.getVideoTracks()[0];
 return{stream,request:()=>{if(manual)track.requestFrame()}};
}
export function framePlan(seconds,fps){const count=Math.max(1,Math.ceil(seconds*fps-1e-7));return{count,seconds:count/fps,timestamp:index=>index/fps,duration:1/fps}}
// Preview advances on the same time grid as exported frames. Slow display
// refreshes skip overdue samples instead of slowing the animation down.
export function playbackClock(fps,start=0){let previous=-1;return elapsed=>{const index=Math.max(0,Math.floor(elapsed*fps+1e-7));if(index===previous)return null;previous=index;return start+index/fps}}
