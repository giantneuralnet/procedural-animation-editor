'use client';
import {useImperativeHandle,useReducer,useRef} from 'react';
import {NumberDraft} from '../lib/number-values';
export default function NumberInput({value,onCommit,parse,ref,inputMode='decimal',className='',...props}){
 const model=useRef(null),[,refresh]=useReducer(n=>n+1,0);
 if(!model.current)model.current=new NumberDraft(value);
 const draft=model.current;draft.sync(value);
 function commit(){const result=draft.commit(parse);if(result.changed)onCommit(result.value);refresh();return result.value}
 useImperativeHandle(ref,()=>({commit}));
 return <input {...props} className={`number-input ${className}`} type="text" inputMode={inputMode} value={draft.text} onFocus={()=>{draft.focused=true}} onChange={e=>{draft.edit(e.target.value);refresh()}} onBlur={()=>{draft.focused=false;commit()}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.currentTarget.blur()}if(e.key==='Escape'){e.preventDefault();e.stopPropagation();draft.cancel();e.currentTarget.blur();refresh()}}}/>;
}
