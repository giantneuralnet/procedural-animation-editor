'use client';
import {useState,useRef,useEffect,useCallback} from 'react';
import {X,Video} from 'lucide-react';
import {cameraRect,cameraPosition,openFrontCamera} from '../lib/camera';
export function useFrontCamera(size){
 const[enabled,setEnabled]=useState(false),[status,setStatus]=useState('off'),[error,setError]=useState(''),[position,setPosition]=useState({x:1,y:0});
 const videoRef=useRef(null),streamRef=useRef(null),overlayRef=useRef(null);
 const rect=cameraRect(size.w,size.h,position);
 overlayRef.current=enabled&&status!=='loading'?{rect,sourceWidth:size.w,sourceHeight:size.h}:null;
 const getOverlay=useCallback(()=>{const overlay=overlayRef.current,video=videoRef.current,track=streamRef.current?.getVideoTracks()[0];return overlay&&video&&track?.readyState==='live'?{...overlay,video,paused:track.muted||video.readyState<2}:null},[]);
 useEffect(()=>{
  if(!enabled){setStatus('off');return}
  const controller=new AbortController();let stream;
  setStatus('loading');setError('');
  const hide=()=>{controller.abort();stream?.getTracks().forEach(t=>t.stop());setEnabled(false)};
  window.addEventListener('pagehide',hide);
  openFrontCamera({signal:controller.signal}).then(async next=>{
   stream=next;streamRef.current=stream;const video=videoRef.current;
   if(!video||controller.signal.aborted){stream.getTracks().forEach(t=>t.stop());return}
   video.srcObject=stream;
   const track=stream.getVideoTracks()[0];
   track.onmute=()=>{if(!controller.signal.aborted)setStatus('paused')};
   track.onunmute=()=>{if(!controller.signal.aborted)setStatus('ready')};
   track.onended=()=>{if(!controller.signal.aborted){setError('The camera disconnected. Turn it on again to reconnect.');setEnabled(false)}};
   await video.play();if(!controller.signal.aborted)setStatus(track.muted?'paused':'ready');
  }).catch(error=>{if(controller.signal.aborted)return;setError(error.message);setEnabled(false)});
  return()=>{controller.abort();window.removeEventListener('pagehide',hide);stream?.getTracks().forEach(t=>{t.onmute=null;t.onunmute=null;t.onended=null;t.stop()});streamRef.current=null;if(videoRef.current)videoRef.current.srcObject=null};
 },[enabled]);
 return{enabled,status,error,rect,videoRef,getOverlay,setPosition,close:()=>setEnabled(false),toggle:()=>setEnabled(v=>!v),dismissError:()=>setError('')};
}
export default function CameraOverlay({camera,size}){
 const drag=useRef(null),{enabled,status,error,rect,videoRef,setPosition}=camera;
 function down(e){if(e.button!==0||e.target.closest('button'))return;e.preventDefault();e.currentTarget.focus();e.currentTarget.setPointerCapture(e.pointerId);drag.current={pointer:e.pointerId,x:e.clientX,y:e.clientY,left:rect.x,top:rect.y}}
 function move(e){const start=drag.current;if(!start||start.pointer!==e.pointerId)return;setPosition(cameraPosition(rect,size.w,size.h,start.left+e.clientX-start.x,start.top+e.clientY-start.y))}
 function key(e){const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!delta)return;e.preventDefault();e.stopPropagation();const step=e.shiftKey?30:10;setPosition(cameraPosition(rect,size.w,size.h,rect.x+delta[0]*step,rect.y+delta[1]*step))}
 return <>{enabled&&<div className="camera-window" tabIndex={0} role="group" aria-label="Front camera. Drag or use arrow keys to move." style={{left:rect.x,top:rect.y,width:rect.width,height:rect.height,borderRadius:rect.radius}} onPointerDown={down} onPointerMove={move} onPointerUp={()=>drag.current=null} onPointerCancel={()=>drag.current=null} onLostPointerCapture={()=>drag.current=null} onKeyDown={key}>
 <video ref={videoRef} autoPlay muted playsInline disablePictureInPicture aria-label="Front camera preview"/>
 {status!=='ready'&&<div className="camera-placeholder" role="status"><Video size={21}/><span>{status==='loading'?'Starting camera…':'Camera paused'}</span></div>}
 <button className="camera-close" aria-label="Turn off camera" title="Turn off camera" onClick={camera.close}><X size={14}/></button>
 </div>}{error&&<div className="camera-error" role="alert"><span>{error}</span><button className="icon-button" aria-label="Dismiss camera error" onClick={camera.dismissError}><X size={18}/></button></div>}</>
}
