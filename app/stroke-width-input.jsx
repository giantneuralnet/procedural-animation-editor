'use client';
import {useEffect,useRef,useState} from 'react';
import {parseStrokeWidth} from '../lib/defaults';
export default function StrokeWidthInput({value,onCommit}){
 const[draft,setDraft]=useState(String(value)),focused=useRef(false),dirty=useRef(false);
 useEffect(()=>{if(!focused.current)setDraft(String(value))},[value]);
 function commit(){const width=parseStrokeWidth(draft);setDraft(String(width));if(dirty.current||width!==value)onCommit(width);dirty.current=false}
 return <input className="stroke-width-input" type="text" inputMode="decimal" value={draft} onFocus={()=>{focused.current=true}} onChange={e=>{dirty.current=true;setDraft(e.target.value)}} onBlur={()=>{focused.current=false;commit()}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.currentTarget.blur()}if(e.key==='Escape')commit()}}/>;
}
