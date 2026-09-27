'use client';
import {useEffect,useRef,useState} from 'react';
import {createDraftStore} from '../lib/draft-database';
export default function useProjectStorage(state,onRestore){
 const[ready,setReady]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
 const current=useRef(state),restore=useRef(onRestore),allowed=useRef(false),timer=useRef(null),store=useRef(null),active=useRef(false),revision=useRef(0);current.current=state;restore.current=onRestore;
 useEffect(()=>{
  let cancelled=false;active.current=true;let localStorage,indexedDB;try{localStorage=window.localStorage}catch{}try{indexedDB=window.indexedDB}catch{}
  const persistence=createDraftStore({localStorage,indexedDB});store.current=persistence;
  persistence.load().then(loaded=>{if(cancelled)return;allowed.current=loaded.canSave;if(loaded.state)restore.current(loaded.state);setNotice(loaded.notice);setReady(true)}).catch(()=>{if(cancelled)return;allowed.current=false;setError('Your saved animation could not be opened. Reload or load a JSON backup. Automatic saving is paused to protect it.');setReady(true)});
  return()=>{if(allowed.current)flush();cancelled=true;active.current=false;clearTimeout(timer.current);void persistence.close()};
 },[]);
 function flush(){clearTimeout(timer.current);if(!allowed.current||!store.current)return;const version=++revision.current;
  try{Promise.resolve(store.current.save(current.current)).then(()=>{if(active.current&&version===revision.current)setError('')}).catch(report)}catch(error){report(error)}
  function report(error){if(!active.current||version!==revision.current)return;setError(error?.name==='QuotaExceededError'?'Device storage is full. Your previous save is safe. Save JSON to keep your latest changes.':'Automatic saving failed. Your previous save is safe. Use Save JSON to keep your latest changes.')}
 }
 const{project,preferences,editor}=state;
 useEffect(()=>{if(!ready)return;timer.current=setTimeout(flush,250);return()=>clearTimeout(timer.current)},[ready,project,preferences,editor]);
 useEffect(()=>{if(!ready)return;const hidden=()=>{if(document.visibilityState==='hidden')flush()};window.addEventListener('pagehide',flush);document.addEventListener('visibilitychange',hidden);return()=>{window.removeEventListener('pagehide',flush);document.removeEventListener('visibilitychange',hidden)}},[ready]);
 return{ready,resume:()=>{allowed.current=true;setNotice('');setError('')},message:error||notice,dismiss:()=>{setNotice('');setError('')}};
}
