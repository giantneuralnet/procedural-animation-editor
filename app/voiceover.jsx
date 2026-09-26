'use client';
import {useRef,useState,useEffect} from 'react';
import {ChevronLeft,ChevronRight,Pause,Play,Circle,Check,Mic} from 'lucide-react';
import {startVoiceRecording} from '../lib/voiceover';
import {movieDimensions} from '../lib/movie';
export default function Voiceover({getCameraOverlay,canvasRef,frame,frameCount,fps,orientation,onFrame,onPaused,onDone}){
 const[status,setStatus]=useState('ready'),[seconds,setSeconds]=useState(0),[error,setError]=useState('');
 const session=useRef(null),controller=useRef(null),closed=useRef(false),statusRef=useRef('ready');
 function state(next){statusRef.current=next;setStatus(next);onPaused(next==='paused')}
 useEffect(()=>{closed.current=false;return()=>{closed.current=true;controller.current?.abort();session.current?.cancel()}},[]);
 async function record(){if(session.current||statusRef.current==='requesting')return;setError('');state('requesting');const abort=new AbortController();controller.current=abort;try{
  const source=canvasRef.current,dimensions=movieDimensions(source.width,source.height,orientation);
  const take=await startVoiceRecording({getCameraOverlay,source,...dimensions,fps,signal:abort.signal,onState:state,onTime:setSeconds});session.current=take;
  take.result.then(movie=>{if(!closed.current)onDone(movie)}).catch(error=>{if(!closed.current&&error.name!=='AbortError'){setError(error.message);session.current=null;state('ready')}});
 }catch(error){if(!closed.current&&error.name!=='AbortError'){setError(error.message);state('ready')}}}
 function pause(){if(status==='paused')session.current?.resume();else session.current?.pause()}
 function done(){if(session.current){state('finishing');session.current.stop()}else{controller.current?.abort();onDone(null)}}
 const locked=status==='requesting'||status==='finishing',paused=status==='paused';
 return <><div className={`voice-status ${status}`} role="status"><Mic size={13}/><span>{status==='ready'?'Record your animation + microphone':status==='requesting'?'Allow microphone access…':status==='finishing'?'Finishing…':`${paused?'Paused':'Recording'} ${Math.floor(seconds/60).toString().padStart(2,'0')}:${Math.floor(seconds%60).toString().padStart(2,'0')}`}</span>{status==='ready'&&<span className="voice-fps">{fps} fps</span>}</div>{error&&<div className="voice-error" role="alert">{error}</div>}<nav className="voice-tools" aria-label="Voiceover controls"><button disabled={frame===0||locked||paused} onClick={()=>onFrame(frame-1)}><ChevronLeft size={21}/><span>Previous</span></button><button disabled={frame===frameCount-1||locked||paused} onClick={()=>onFrame(frame+1)}><ChevronRight size={21}/><span>Next</span></button><button disabled={!['recording','paused'].includes(status)} onClick={pause}>{paused?<Play size={19}/>:<Pause size={19}/>}<span>{paused?'Resume':'Pause'}</span></button><button className={`record-button ${status==='recording'?'recording':''}`} disabled={status!=='ready'} onClick={record}><Circle size={19} fill="currentColor"/><span>Record</span></button><button className="voice-done" disabled={status==='finishing'} onClick={done}><Check size={20}/><span>Done</span></button></nav></>
}
