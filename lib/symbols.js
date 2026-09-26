import {timelinePosition,frameStart} from './timing.js';
import {symbolMatrix,multiply,IDENTITY,translateShape,tintColor} from './matrix.js';
import {resolveShapes,lineGeometry,fromLinePoints,interpolateShapes,linePatch} from './animation.js';
import {selectionBounds,duplicateSelection} from './editing.js';
import {DEFAULT_STYLE} from './defaults.js';
export function timelineOf(project,scope){return scope?project.symbols[scope]:project}
export function updateTimeline(project,scope,changes){return scope?{...project,symbols:{...project.symbols,[scope]:{...project.symbols[scope],...changes}}}:{...project,...changes}}
export function groupIntoSymbol(frames,index,ids,makeId,duration=1,easing='linear',symbols={}){
 const current=resolveShapes(frames,index).filter(s=>ids.includes(s.id));if(!current.length)return null;
 const bounds=selectionBounds(current,{symbols,time:frameStart(frames,index,duration)}),left=bounds.left,top=bounds.top,width=Math.max(1,bounds.right-left),height=Math.max(1,bounds.bottom-top),symbolId=makeId(),instanceId=makeId();
 const snapshots=frames.map((_,i)=>resolveShapes(frames,i));
 let previous={};
 const inner=frames.slice(index).map((frame,offset)=>{
  const scene=snapshots[index+offset],changes={},next={};
  for(const id of ids){const s=scene.find(s=>s.id===id);if(!s){if(previous[id]?.visible!==false)changes[id]={visible:false};next[id]={...previous[id],visible:false};continue}
   const geometry=s.type==='line'?linePatch(s,...Object.values(lineGeometry(s))):{},base={...s,...geometry},link=l=>l&&ids.includes(l.id)?l:null;
   const local={...base,...translateShape(base,-left,-top),startLink:link(s.startLink),endLink:link(s.endLink)};
   if(s.type==='symbol')local.timeOffset=(s.timeOffset||0)+frameStart(frames,index,duration);
   if(offset===0||!previous[id]||previous[id].visible===false)changes[id]={...local,visible:true};
   else{const patch={};for(const key of Object.keys(local))if(JSON.stringify(local[key])!==JSON.stringify(previous[id][key])||Object.hasOwn(frame.changes[id]||{},key))patch[key]=local[key];if(Object.keys(patch).length)changes[id]=patch}
   next[id]=local;
  }
  previous=next;return{id:makeId(),...(frame.timeMultiplier?{timeMultiplier:frame.timeMultiplier}:{}),changes};
 });
 const instance={...DEFAULT_STYLE,id:instanceId,type:'symbol',name:'Symbol',tint:'#ffffff',symbolId,x:left,y:top,w:width,h:height,cx:0,cy:0,rotation:0,opacity:1,stroke:0,z:Math.max(...current.map(s=>s.z??snapshots[index].findIndex(t=>t.id===s.id))),visible:true,timeOffset:-frameStart(frames,index,duration)};
 const next=frames.map((frame,i)=>{if(i<index)return frame;const changes={...frame.changes};for(const id of ids)delete changes[id];if(i===index){for(const id of ids)changes[id]={visible:false};changes[instanceId]=instance}
  // Freeze cross-boundary anchors in world space; internal connections remain local.
  for(const s of snapshots[i])if(s.type==='line'&&!ids.includes(s.id)&&[s.startLink,s.endLink].some(l=>l&&ids.includes(l.id)))changes[s.id]={...changes[s.id],...linePatch(s,...Object.values(lineGeometry(s))),startLink:ids.includes(s.startLink?.id)?null:s.startLink,endLink:ids.includes(s.endLink?.id)?null:s.endLink};
  return{...frame,changes};
 });
 return{frames:next,instance,definition:{id:symbolId,width,height,frames:inner,duration,easing}};
}
export function copyShapes(shapes,symbols){const definitions={};function visit(id){if(!id||definitions[id]||!symbols[id])return;definitions[id]=structuredClone(symbols[id]);for(const f of symbols[id].frames)for(const s of Object.values(f.changes))if(s.symbolId)visit(s.symbolId)}for(const s of shapes)visit(s.symbolId);return{shapes:structuredClone(shapes),symbols:definitions}}
export function pasteShapes(clipboard,makeId,offset=0,time=0,context={}){
 if(clipboard.linked){
  if(!canLinkSymbols(clipboard.shapes,context.symbols||{},context.scope))throw new Error('A linked symbol cannot be pasted inside itself or one of its children.');
  return{shapes:duplicateSelection(clipboard.shapes,makeId,offset).map(s=>({...s,timeOffset:-time})),symbols:{}};
 }
 const symbolIds=new Map(Object.keys(clipboard.symbols||{}).map(id=>[id,makeId()])),definitions={};
 for(const[id,definition]of Object.entries(clipboard.symbols||{})){const copy=structuredClone(definition);copy.id=symbolIds.get(id);for(const f of copy.frames){f.id=makeId();for(const s of Object.values(f.changes))if(symbolIds.has(s.symbolId))s.symbolId=symbolIds.get(s.symbolId)}definitions[copy.id]=copy}
 const shapes=duplicateSelection(clipboard.shapes,makeId,offset).map(s=>s.type==='symbol'?{...s,symbolId:symbolIds.get(s.symbolId)||s.symbolId,timeOffset:-time}:s);
 return{shapes,symbols:definitions};
}

export function copyLinkedShapes(shapes){return{shapes:structuredClone(shapes),symbols:{},linked:true}}
export function canLinkSymbols(shapes,symbols,scope=null){
 function reaches(id,seen=new Set()){if(id===scope)return true;if(seen.has(id))return false;seen.add(id);const definition=symbols[id];if(!definition)return true;return definition.frames.some(f=>Object.values(f.changes).some(s=>s.symbolId&&reaches(s.symbolId,seen)))}
 return shapes.every(s=>s.type==='symbol'&&Object.hasOwn(symbols,s.symbolId)&&!reaches(s.symbolId));
}
export function breakSymbol(frames,index,instance,symbols,makeId,time){
 const definition=symbols[instance.symbolId];if(!definition)return null;
 const localTime=Math.max(0,time+(instance.timeOffset||0)),children=interpolateShapes(definition.frames,timelinePosition(definition.frames,localTime,definition.duration),definition.easing,true),ids=new Map(children.map(s=>[s.id,makeId()])),matrix=symbolMatrix(instance,definition);
 const graphics=children.map(child=>{const tint=instance.tint||'#ffffff',link=l=>l&&ids.has(l.id)?{...l,id:ids.get(l.id)}:null;return{...child,id:ids.get(child.id),matrix:multiply(matrix,child.matrix||IDENTITY),opacity:child.opacity*instance.opacity,...(child.type==='symbol'?{tint:tintColor(child.tint||'#ffffff',tint),timeOffset:(child.timeOffset||0)+(instance.timeOffset||0)}:{color:tintColor(child.color,tint),strokeColor:tintColor(child.strokeColor||child.color,tint)}),startLink:link(child.startLink),endLink:link(child.endLink)}});
 const scene=resolveShapes(frames,index),order=scene.flatMap(s=>s.id===instance.id?graphics:[s]),changes=Object.fromEntries(order.map((s,z)=>[s.id,{z}]));
 for(const graphic of graphics)changes[graphic.id]={...graphic,z:order.findIndex(s=>s.id===graphic.id)};changes[instance.id]={visible:false};
 return{graphics,frames:frames.map((frame,i)=>{if(i<index)return frame;const next={...frame.changes};delete next[instance.id];return{...frame,changes:i===index?{...next,...changes}:next}})};
}

export function symbolIsShared(project,symbolId){
 const references=new Set();for(const[scope,timeline]of [[null,project],...Object.entries(project.symbols)])for(const frame of timeline.frames)for(const[id,patch]of Object.entries(frame.changes))if(patch.symbolId===symbolId)references.add(JSON.stringify([scope,id]));
 return references.size>1;
}
export function unlinkSymbolInstance(project,parentScope,instanceId,symbolId,makeId){
 const parent=timelineOf(project,parentScope),instance=parent.frames.flatMap((_,i)=>resolveShapes(parent.frames,i)).find(s=>s.id===instanceId&&s.symbolId===symbolId);if(!instance)return null;
 const independent=pasteShapes(copyShapes([instance],project.symbols),makeId),nextId=independent.shapes[0].symbolId;
 const frames=parent.frames.map(frame=>{const patch=frame.changes[instanceId];return patch?.symbolId===symbolId?{...frame,changes:{...frame.changes,[instanceId]:{...patch,symbolId:nextId}}}:frame});
 return{project:updateTimeline({...project,symbols:{...project.symbols,...independent.symbols}},parentScope,{frames}),scope:nextId};
}
