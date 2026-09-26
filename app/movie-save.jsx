'use client';
import {useState,useEffect,useMemo,useRef} from 'react';
import {Download,Share2,X} from 'lucide-react';
export function MovieSaveActions({movie,filename}){
 const[error,setError]=useState(''),[sharing,setSharing]=useState(false);
 const file=useMemo(()=>new File([movie.blob],filename,{type:movie.blob.type.split(';')[0]}),[movie.blob,filename]);
 const supported=typeof navigator!=='undefined'&&typeof navigator.share==='function'&&navigator.canShare?.({files:[file]});
 async function share(){setError('');setSharing(true);try{await navigator.share({files:[file]})}catch(error){if(error.name!=='AbortError')setError('Sharing is unavailable here. Download the movie, or open this site in Safari or Chrome.')}finally{setSharing(false)}}
 return <>{supported&&<><button className="done-button download-button" disabled={sharing} onClick={share}><Share2 size={17}/>Save / share video</button><p className="save-hint">Choose Save Video in the share sheet to save to Photos, when available.</p></>}<a className={`done-button download-button ${supported?'secondary':''}`} href={movie.url} download={filename}><Download size={17}/>Download movie</a>{!supported&&<p className="save-hint">For the camera roll, open this site in a browser that supports video sharing, such as Safari on iPhone.</p>}{error&&<p className="export-error" role="alert">{error}</p>}</>
}
export default function MovieSave({recording,onClose}){
 const[url,setUrl]=useState(''),dialog=useRef(null);
 useEffect(()=>{const next=URL.createObjectURL(recording.blob);setUrl(next);return()=>URL.revokeObjectURL(next)},[recording.blob]);
 useEffect(()=>{dialog.current.querySelector('button').focus();const key=e=>{if(e.key==='Escape')onClose();if(e.key==='Tab'){const els=[...dialog.current.querySelectorAll('button:not(:disabled),a[href],video')],first=els[0],last=els.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}};window.addEventListener('keydown',key);return()=>{window.removeEventListener('keydown',key)}},[]);
 return <div className="modal-backdrop" onClick={onClose}><div ref={dialog} className="modal movie-modal" role="dialog" aria-modal="true" aria-labelledby="recording-title" onClick={e=>e.stopPropagation()}><div className="modal-heading"><h2 id="recording-title">Recorded movie</h2><button className="icon-button" onClick={onClose} aria-label="Back to editing"><X size={20}/></button></div><video className="movie-preview" src={url} controls playsInline/><div className="movie-details"><span>{recording.width} × {recording.height}</span><span>{recording.fps} fps{recording.frameRateMode==='variable'?' target':''} · {recording.seconds.toFixed(1)} s</span></div><MovieSaveActions movie={{...recording,url}} filename={`recording.${recording.extension}`}/><button className="back-to-edit" onClick={onClose}>Back to editing</button></div></div>
}
