export const FRAME_TIMES=[[.125,'⅛×'],[.25,'¼×'],[.5,'½×'],[1,'1×'],[2,'2×'],[4,'4×']];
export const frameMultiplier=frame=>FRAME_TIMES.some(([value])=>value===frame?.timeMultiplier)?frame.timeMultiplier:1;
export const frameSeconds=(frame,duration)=>frameMultiplier(frame)*duration;
export const frameStart=(frames,index,duration)=>frames.slice(0,index).reduce((time,frame)=>time+frameSeconds(frame,duration),0);
export const timelineSeconds=(frames,duration)=>frameStart(frames,frames.length,duration);
export function timelinePosition(frames,seconds,duration,loop=true){
 if(!frames.length)return 0;const total=timelineSeconds(frames,duration);let time=loop?((seconds%total)+total)%total:Math.max(0,seconds);
 for(let i=0;i<frames.length;i++){const span=frameSeconds(frames[i],duration);if(time<span)return i+time/span;time-=span}
 return frames.length-1;
}
