'use client';
import {useEffect,useRef} from 'react';
import {X} from 'lucide-react';
export default function EditorDialog({title,onClose,children}){
 const ref=useRef(null),close=useRef(onClose);close.current=onClose;
 useEffect(()=>{const previous=document.activeElement;ref.current?.querySelector('button')?.focus();const key=e=>{if(e.key==='Escape'){e.stopPropagation();close.current()}if(e.key==='Tab'){const nodes=[...ref.current.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled)')],first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}};window.addEventListener('keydown',key);return()=>{window.removeEventListener('keydown',key);if(previous?.isConnected)previous.focus()}},[]);
 return <div className="modal-backdrop" onClick={onClose}><div ref={ref} className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={e=>e.stopPropagation()}><div className="modal-heading"><h2>{title}</h2><button className="icon-button" aria-label={`Close ${title.toLowerCase()}`} onClick={onClose}><X size={20}/></button></div>{children}</div></div>
}
