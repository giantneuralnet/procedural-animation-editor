'use client';
import {useRef} from 'react';
export default function SmoothnessSlider({value,onBegin,onChange}){
 const editing=useRef(false);
 const begin=()=>{if(!editing.current){editing.current=true;onBegin()}};
 const end=()=>{editing.current=false};
 return <label className="smoothness-control"><span>Smoothness</span><input type="range" aria-label="Freeform smoothness" min="0" max="100" step="1" value={Math.round(value*100)} onPointerDown={begin} onPointerUp={end} onPointerCancel={end} onBlur={end} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(e.key))begin()}} onKeyUp={end} onChange={e=>{begin();onChange(Number(e.target.value)/100)}}/><output>{Math.round(value*100)}%</output></label>;
}
