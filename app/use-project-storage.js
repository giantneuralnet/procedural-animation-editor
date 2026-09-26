'use client';
import {useEffect,useRef,useState} from 'react';
import {loadDraft,saveDraft} from '../lib/project-storage';
export default function useProjectStorage(state,onRestore){
 const[ready,setReady]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
 const current=useRef(state),allowed=useRef(false),timer=useRef(null);current.current=state;
 useEffect(()=>{
  try{const loaded=loadDraft(window.localStorage);allowed.current=loaded.canSave;if(loaded.state)onRestore(loaded.state);setNotice(loaded.notice)}
  catch{allowed.current=true;setError('Automatic saving is unavailable in this browser. Use Save JSON to keep a copy.')}
  setReady(true);
 },[]);
 function flush(){clearTimeout(timer.current);if(!allowed.current)return;try{saveDraft(window.localStorage,current.current);setError('')}catch{setError('Automatic saving failed. Use Save JSON to keep your latest changes.')}}
 const{project,preferences,editor}=state;
 useEffect(()=>{if(!ready)return;timer.current=setTimeout(flush,300);return()=>clearTimeout(timer.current)},[ready,project,preferences,editor]);
 useEffect(()=>{
  if(!ready)return;
  const hidden=()=>{if(document.visibilityState==='hidden')flush()};
  window.addEventListener('pagehide',flush);document.addEventListener('visibilitychange',hidden);
  return()=>{flush();window.removeEventListener('pagehide',flush);document.removeEventListener('visibilitychange',hidden)};
 },[ready]);
 return{ready,message:error||notice,dismiss:()=>{setNotice('');setError('')}};
}
