'use client';
import {useState,useRef,useEffect,useCallback} from 'react';
export default function useMicrophone(){
 const[enabled,setEnabled]=useState(false),[status,setStatus]=useState('off'),[error,setError]=useState('');
 const stream=useRef(null),request=useRef(0),mounted=useRef(true);
 const close=useCallback(()=>{request.current++;stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;if(mounted.current){setEnabled(false);setStatus('off')}},[]);
 useEffect(()=>{mounted.current=true;window.addEventListener('pagehide',close);return()=>{mounted.current=false;close();window.removeEventListener('pagehide',close)}},[close]);
 async function toggle(){if(enabled){close();return}const id=++request.current;setEnabled(true);setStatus('loading');setError('');try{
  if(!navigator.mediaDevices?.getUserMedia)throw new Error('Microphone access is unavailable in this browser.');
  const next=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
  if(!mounted.current||id!==request.current){next.getTracks().forEach(t=>t.stop());return}
  stream.current=next;setStatus('ready');next.getAudioTracks().forEach(t=>{t.onended=()=>{close();if(mounted.current)setError('The microphone disconnected. Turn it on again to reconnect.')}});
 }catch(error){if(!mounted.current||id!==request.current)return;close();setError(error.name==='NotAllowedError'?'Microphone access was denied. Allow it in your browser settings, then try again.':error.message)}}
 const getStream=useCallback(()=>stream.current,[]);
 return{enabled,status,error,getStream,toggle,close};
}
