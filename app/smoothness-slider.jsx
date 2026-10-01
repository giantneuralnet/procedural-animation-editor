'use client';
import {useRef} from 'react';
export default function SmoothnessSlider({value,onBegin,onChange}){
 const editing=useRef(false),latest=useRef(value);latest.current=value;
 const end=()=>{editing.current=false};
 function update(event){
  const next=Number(event.currentTarget.value)/100;
  if(next===latest.current)return;
  if(!editing.current){editing.current=true;onBegin()}
  latest.current=next;onChange(next);
 }
 return <label className="smoothness-control"><span>Smoothness</span><input type="range" aria-label="Freeform smoothness" min="0" max="100" step="1" value={Math.round(value*100)} onPointerDown={end} onPointerUp={end} onPointerCancel={end} onBlur={end} onKeyUp={end} onInput={update} onChange={update}/><output>{Math.round(value*100)}%</output></label>;
}
