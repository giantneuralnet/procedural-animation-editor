'use client';
import {useRef,useState,useEffect} from 'react';
import {Pause,Play,Circle,Check,Mic,MicOff,Video,VideoOff,Download} from 'lucide-react';
import {startVoiceRecording} from '../lib/voiceover';
import {movieDimensions} from '../lib/movie';
import useMicrophone from './use-microphone';
export default function Voiceover({camera,canvasRef,getRecordingScene,fps,orientation,onPaused,onDone,onExport}){
 const[status,setStatus]=useState('ready'),[seconds,setSeconds]=useState(0),[error,setError]=useState('');
 const microphone=useMicrophone(),session=useRef(null),controller=useRef(null),closed=useRef(false),statusRef=useRef('ready');
 function state(next){statusRef.current=next;setStatus(next);onPaused(next==='paused')}
 useEffect(()=>{closed.current=false;return()=>{closed.current=true;controller.current?.abort();session.current?.cancel()}},[]);
 async function record(){if(session.current||statusRef.current==='requesting')return;setError('');state('requesting');const abort=new AbortController();controller.current=abort;try{
  const source=canvasRef.current,dimensions=movieDimensions(source.width,source.height,orientation);
  const take=await startVoiceRecording({getScene:getRecordingScene,getCameraOverlay:camera.getOverlay,getMicrophoneStream:microphone.getStream,source,...dimensions,fps,signal:abort.signal,onState:state,onTime:setSeconds});session.current=take;
  take.result.then(movie=>{if(!closed.current)onDone(movie)}).catch(error=>{if(!closed.current&&error.name!=='AbortError'){setError(error.message);session.current=null;state('ready')}});
 }catch(error){if(!closed.current&&error.name!=='AbortError'){setError(error.message);state('ready')}}}
 function pause(){if(status==='paused')session.current?.resume();else session.current?.pause()}
 function done(){if(session.current){state('finishing');session.current.stop()}else{controller.current?.abort();onDone(null)}}
 const locked=status==='requesting'||status==='finishing',paused=status==='paused',loading=microphone.status==='loading'||camera.status==='loading';
 return <>
 <div className={`voice-status ${status}`} role="status"><span>{status==='ready'?'Tap frames to transition':status==='requesting'?'Preparing…':status==='finishing'?'Finishing…':`${paused?'Paused':'Recording'} ${Math.floor(seconds/60).toString().padStart(2,'0')}:${Math.floor(seconds%60).toString().padStart(2,'0')}`}</span></div>
 {(error||microphone.error)&&<div className="voice-error" role="alert">{error||microphone.error}</div>}

 <nav className="voice-tools" aria-label="Recording controls">
 <button aria-label="Front camera" aria-pressed={camera.enabled} className={camera.enabled?'active':''} disabled={locked} onClick={camera.toggle}>{camera.enabled?<Video size={21}/>:<VideoOff size={21}/>}<span>Camera</span></button>
 <button aria-label="Microphone" aria-pressed={microphone.enabled} className={microphone.enabled?'active':''} disabled={locked} onClick={microphone.toggle}>{microphone.enabled?<Mic size={20}/>:<MicOff size={20}/>}<span>{microphone.status==='loading'?'Allow mic…':'Microphone'}</span></button>
 <button disabled={!['recording','paused'].includes(status)} onClick={pause}>{paused?<Play size={19}/>:<Pause size={19}/>}<span>{paused?'Resume':'Pause'}</span></button>
 <button className={`record-button ${status==='recording'?'recording':''}`} disabled={status!=='ready'||loading} onClick={record}><Circle size={19} fill="currentColor"/><span>Record</span></button>
 <button aria-label="Export animation" disabled={status!=='ready'||microphone.enabled||loading} title={microphone.enabled?'Turn off the microphone to export the animation; use Record for live audio.':'Export the full animation'} onClick={onExport}><Download size={20}/><span>Export</span></button>
 <button className="voice-done" disabled={status==='finishing'} onClick={done}><Check size={20}/><span>Done</span></button></nav></>
}
