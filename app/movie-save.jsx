'use client';
import {useState,useEffect,useMemo,useRef} from 'react';
import {Download,Share2,X} from 'lucide-react';
import {shareMovieFile} from '../lib/sharing';
export function MovieSaveActions({movie,filename}){
 const[fallback,setFallback]=useState(false),[sharing,setSharing]=useState(false);
 const file=useMemo(()=>new File([movie.blob],filename,{type:movie.blob.type.split(';')[0]}),[movie.blob,filename]);
 async function share(){setFallback(false);setSharing(true);try{if(await shareMovieFile(file)==='unavailable')setFallback(true)}finally{setSharing(false)}}
 return <><button className="done-button download-button" disabled={sharing} onClick={share}><Share2 size={17}/>Share movie</button>{fallback?<><p className="save-hint" role="status">Sharing isn’t available in this browser. Download a copy to share.</p><a className="done-button download-button secondary" href={movie.url} download={filename}><Download size={17}/>Download movie</a></>:<p className="save-hint">Choose Save Video in the share sheet to save to Photos, when available.</p>}</>

}
export default function MovieSave({recording,onClose}){
 const[url,setUrl]=useState(''),dialog=useRef(null);
 useEffect(()=>{const next=URL.createObjectURL(recording.blob);setUrl(next);return()=>URL.revokeObjectURL(next)},[recording.blob]);
 useEffect(()=>{dialog.current.querySelector('button').focus();const key=e=>{if(e.key==='Escape')onClose();if(e.key==='Tab'){const els=[...dialog.current.querySelectorAll('button:not(:disabled),a[href],video')],first=els[0],last=els.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}};window.addEventListener('keydown',key);return()=>{window.removeEventListener('keydown',key)}},[]);
 return <div className="modal-backdrop" onClick={onClose}><div ref={dialog} className="modal movie-modal" role="dialog" aria-modal="true" aria-labelledby="recording-title" onClick={e=>e.stopPropagation()}><div className="modal-heading"><h2 id="recording-title">Recorded movie</h2><button className="icon-button" onClick={onClose} aria-label="Back to editing"><X size={20}/></button></div><video className="movie-preview" src={url} controls playsInline/><div className="movie-details"><span>{recording.width} × {recording.height}</span><span>{recording.fps} fps{recording.frameRateMode==='variable'?' target':''} · {recording.seconds.toFixed(1)} s</span></div><MovieSaveActions movie={{...recording,url}} filename={`recording.${recording.extension}`}/><button className="back-to-edit" onClick={onClose}>Back to editing</button></div></div>
}
