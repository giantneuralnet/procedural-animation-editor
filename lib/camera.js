const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export function cameraRect(width,height,position={x:1,y:0}){
 const margin=Math.min(12,width/8,height/8);
 const w=Math.max(1,Math.min(width<600?120:160,width-margin*2,(height-margin*2)*.75)),h=w/ .75;
 return{x:margin+clamp(position.x,0,1)*Math.max(0,width-w-margin*2),y:margin+clamp(position.y,0,1)*Math.max(0,height-h-margin*2),width:w,height:h,radius:Math.min(16,w/8)};
}
export function cameraPosition(rect,width,height,x,y){
 const margin=Math.min(12,width/8,height/8);
 return{x:clamp((x-margin)/Math.max(1,width-rect.width-margin*2),0,1),y:clamp((y-margin)/Math.max(1,height-rect.height-margin*2),0,1)};
}
export async function openFrontCamera({mediaDevices=globalThis.navigator?.mediaDevices,signal}={}){
 if(signal?.aborted)throw new DOMException('Camera cancelled','AbortError');
 if(!mediaDevices?.getUserMedia)throw new Error('Camera access is unavailable. Open this site in Safari or Chrome.');
 let stream;
 try{stream=await mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'user'},width:{ideal:640},height:{ideal:480},frameRate:{ideal:30,max:30}}})}
 catch(error){if(error.name==='NotAllowedError')throw new Error('Camera access was denied. Allow it in your browser settings, then turn the camera on again.');if(error.name==='NotFoundError')throw new Error('No camera was found. Connect one and try again.');throw new Error('The camera could not start. Close any other app using it and try again.')}
 if(signal?.aborted){stream.getTracks().forEach(track=>track.stop());throw new DOMException('Camera cancelled','AbortError')}
 return stream;
}
// Composite the same mirrored, cropped camera window used in the editor into HD video.
export function drawCameraOverlay(ctx,overlay,width,height){
 if(!overlay)return;
 const{video,rect,sourceWidth,sourceHeight,paused}=overlay;
 if(!video||!sourceWidth||!sourceHeight)return;
 const scale=Math.min(width/sourceWidth,height/sourceHeight),offsetX=(width-sourceWidth*scale)/2,offsetY=(height-sourceHeight*scale)/2;
 ctx.save();ctx.translate(offsetX,offsetY);ctx.scale(scale,scale);
 ctx.beginPath();ctx.roundRect(rect.x,rect.y,rect.width,rect.height,rect.radius);
 ctx.fillStyle='#24272e';ctx.shadowColor='rgba(0,0,0,.3)';ctx.shadowBlur=20;ctx.shadowOffsetY=5;ctx.fill();ctx.shadowColor='transparent';ctx.clip();
 if(!paused&&video.readyState>=2&&video.videoWidth&&video.videoHeight){
  const cover=Math.max(rect.width/video.videoWidth,rect.height/video.videoHeight),sw=rect.width/cover,sh=rect.height/cover;
  ctx.translate(rect.x+rect.width,rect.y);ctx.scale(-1,1);
  ctx.drawImage(video,(video.videoWidth-sw)/2,(video.videoHeight-sh)/2,sw,sh,0,0,rect.width,rect.height);
 }else{ctx.fillStyle='#bbc0cc';ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillText('Camera paused',rect.x+rect.width/2,rect.y+rect.height/2)}
 ctx.restore();ctx.save();ctx.translate(offsetX,offsetY);ctx.scale(scale,scale);ctx.beginPath();ctx.roundRect(rect.x+.5,rect.y+.5,rect.width-1,rect.height-1,rect.radius);ctx.strokeStyle='rgba(255,255,255,.2)';ctx.lineWidth=1;ctx.stroke();ctx.restore();
}
