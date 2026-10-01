// Camera position is the world coordinate at the viewport's top-left corner.
// Keeping it in world units preserves framing when the screen size changes.
export const DEFAULT_CAMERA={x:0,y:0,zoom:1};
export const hasCameraFrames=frames=>frames.some(frame=>frame.camera&&Object.keys(frame.camera).length);
export function resolveCamera(frames,index,base=DEFAULT_CAMERA){let camera={...base};for(let i=0;i<=Math.min(index,frames.length-1);i++)camera={...camera,...frames[i].camera};return camera}
export function mixCamera(a,b,progress,easing='linear'){const p=Math.max(0,Math.min(1,progress)),t=easing==='smooth'?p*p*(3-2*p):p;return Object.fromEntries(['x','y','zoom'].map(key=>[key,a[key]+(b[key]-a[key])*t]))}
export function interpolateCamera(frames,position,easing='linear'){const p=Math.max(0,Math.min(frames.length-1,position)),i=Math.floor(p);return mixCamera(resolveCamera(frames,i),resolveCamera(frames,i+1),p-i,easing)}
export function cameraFromView(zoom,pan,baseScale){return{x:-pan.x/(baseScale*zoom),y:-pan.y/(baseScale*zoom),zoom}}
export function cameraToView(camera,baseScale){return{zoom:camera.zoom,pan:{x:-camera.x*baseScale*camera.zoom,y:-camera.y*baseScale*camera.zoom}}}
export function cameraFrameEdits(frames,index,next,previous=DEFAULT_CAMERA){
 const patch=Object.fromEntries(['x','y','zoom'].filter(key=>Math.abs(next[key]-previous[key])>1e-9).map(key=>[key,next[key]]));
 if(!Object.keys(patch).length||!frames[index])return frames;
 const keyed=hasCameraFrames(frames);
 return frames.map((frame,i)=>i===index?{...frame,camera:{...(!keyed&&i===0?previous:{}),...frame.camera,...patch}}:!keyed&&i===0?{...frame,camera:{...previous}}:frame);
}
export function validCameraPatch(camera){return camera!==null&&typeof camera==='object'&&!Array.isArray(camera)&&Object.entries(camera).every(([key,value])=>['x','y','zoom'].includes(key)&&Number.isFinite(value)&&(key!=='zoom'||value>=.4&&value<=16))}
