import {localToWorld,linePoint,lineGeometry,fromLinePoints,anchorPoint,lineHandles} from './animation.js';
export function shapeBounds(shape){
 let points;
 if(shape.type==='line'){
  const {start,end,control}=lineGeometry(shape),ts=[0,1];
  for(const axis of ['x','y']){const d=start[axis]-2*control[axis]+end[axis];if(d){const t=(start[axis]-control[axis])/d;if(t>0&&t<1)ts.push(t)}}
  points=ts.map(t=>linePoint(shape,t));
 }else if(shape.type==='circle'){
  const a=shape.rotation*Math.PI/180,c=localToWorld(shape,{x:shape.w/2,y:shape.h/2}),rx=Math.hypot(shape.w/2*Math.cos(a),shape.h/2*Math.sin(a)),ry=Math.hypot(shape.w/2*Math.sin(a),shape.h/2*Math.cos(a));
  points=[{x:c.x-rx,y:c.y-ry},{x:c.x+rx,y:c.y+ry}];
 }else points=[[0,0],[shape.w,0],[0,shape.h],[shape.w,shape.h]].map(([x,y])=>localToWorld(shape,{x,y}));
 const pad=(shape.stroke||0)/2;return{left:Math.min(...points.map(p=>p.x))-pad,top:Math.min(...points.map(p=>p.y))-pad,right:Math.max(...points.map(p=>p.x))+pad,bottom:Math.max(...points.map(p=>p.y))+pad};
}
export function selectionBounds(shapes){if(!shapes.length)return null;const boxes=shapes.map(shapeBounds);return{left:Math.min(...boxes.map(b=>b.left)),top:Math.min(...boxes.map(b=>b.top)),right:Math.max(...boxes.map(b=>b.right)),bottom:Math.max(...boxes.map(b=>b.bottom))}}
export function boxSelection(shapes,start,end){const box={left:Math.min(start.x,end.x),right:Math.max(start.x,end.x),top:Math.min(start.y,end.y),bottom:Math.max(start.y,end.y)};return shapes.filter(s=>{const b=shapeBounds(s);return b.left<=box.right&&b.right>=box.left&&b.top<=box.bottom&&b.bottom>=box.top}).map(s=>s.id)}
export function moveSelection(shapes,dx,dy){return Object.fromEntries(shapes.map(s=>{const base=s.type==='line'?fromLinePoints(...Object.values(lineGeometry(s))):{x:s.x,y:s.y};return[s.id,{...base,x:base.x+dx,y:base.y+dy}]}))}
export function duplicateSelection(shapes,makeId,offset){const ids=new Map(shapes.map(s=>[s.id,makeId()]));return shapes.map(s=>{const geometry=s.type==='line'?fromLinePoints(...Object.values(lineGeometry(s))):{x:s.x,y:s.y};const link=l=>l&&ids.has(l.id)?{...l,id:ids.get(l.id)}:null;return{...s,...geometry,id:ids.get(s.id),x:geometry.x+offset,y:geometry.y+offset,startLink:link(s.startLink),endLink:link(s.endLink),name:s.name+' copy'}})}
// Keep the visible states of moved frames while retaining sparse edits where possible.
export function rebaseFrameOrder(frames,order){
 let state={};const snapshots=new Map();for(const f of frames){state=structuredClone(state);for(const[id,patch]of Object.entries(f.changes))state[id]={...state[id],...patch,id};snapshots.set(f.id,state)}
 let previous={};return order.map(id=>{const original=frames.find(f=>f.id===id),target=snapshots.get(id),changes=structuredClone(original.changes);
  for(const shapeId of new Set([...Object.keys(previous),...Object.keys(target)])){
   const next=target[shapeId],before=previous[shapeId];if(!next){if(before?.visible!==false)changes[shapeId]={visible:false};continue}
   const patch={...changes[shapeId]};for(const key of new Set([...Object.keys(before||{}),...Object.keys(next)]))if(JSON.stringify(before?.[key])!==JSON.stringify(next[key]))patch[key]=next[key]??null;
   // A shape introduced in an earlier position may need to reappear at this one.
   if((!before||before.visible===false)&&next.visible!==false)patch.visible=true;
   if(Object.keys(patch).length)changes[shapeId]=patch;
  }
  previous=structuredClone(target);return{...original,changes};
 });
}
export function reorderFrames(frames,from,to){if(from===to)return frames;const order=frames.map(f=>f.id);order.splice(to,0,order.splice(from,1)[0]);return rebaseFrameOrder(frames,order)}
export function deleteFrame(frames,index){return frames.length<2?frames:rebaseFrameOrder(frames,frames.filter((_,i)=>i!==index).map(f=>f.id))}
export function styleSelection(shapes,property,value){return Object.fromEntries(shapes.map(s=>[s.id,property==='color'?{color:value}:property==='stroke'?{stroke:Math.max(0,Math.min(80,Number(value)||0)),strokeVisible:true}:{[property]:value}]))}

export function boxSelectParts(shapes,start,end){
 const inside=p=>p.x>=Math.min(start.x,end.x)&&p.x<=Math.max(start.x,end.x)&&p.y>=Math.min(start.y,end.y)&&p.y<=Math.max(start.y,end.y);
 const points={};for(const s of shapes.filter(s=>s.type==='line')){const keys=Object.entries(lineHandles(s)).filter(([,p])=>inside(p)).map(([key])=>key);if(keys.length)points[s.id]=keys}
 return{ids:boxSelection(shapes.filter(s=>s.type!=='line'),start,end),points};
}
export function mergePoints(a,b){const out=structuredClone(a);for(const[id,keys]of Object.entries(b))out[id]=[...new Set([...(out[id]||[]),...keys])];return out}
export function moveParts(shapes,ids,points,dx,dy){
 const changes=moveSelection(shapes.filter(s=>ids.includes(s.id)),dx,dy);
 for(const s of shapes){if(ids.includes(s.id)||!points[s.id]?.length||s.type!=='line')continue;const geometry=lineGeometry(s);for(const key of points[s.id])geometry[key]={x:geometry[key].x+dx,y:geometry[key].y+dy};const patch=fromLinePoints(geometry.start,geometry.end,geometry.control);
  for(const key of ['start','end'])if(points[s.id].includes(key)){const link=s[key+'Link'];if(link&&!ids.includes(link.id)){const target=shapes.find(t=>t.id===link.id),keys=points[link.id]||[];let follows=false;if(target?.type==='line'&&keys.length){const moved=lineGeometry(target);for(const k of keys)moved[k]={x:moved[k].x+dx,y:moved[k].y+dy};const before=anchorPoint(target,link),after=anchorPoint({...target,...fromLinePoints(moved.start,moved.end,moved.control)},link);follows=before&&after&&Math.hypot(after.x-before.x-dx,after.y-before.y-dy)<1e-6}if(!follows)patch[key+'Link']=null}}
  changes[s.id]=patch;
 }
 return changes;
}
export function partsBounds(shapes,ids,points){const boxes=shapes.filter(s=>ids.includes(s.id)).map(shapeBounds);for(const s of shapes){if(s.type!=='line')continue;for(const key of points[s.id]||[]){const p=lineGeometry(s)[key];boxes.push({left:p.x,right:p.x,top:p.y,bottom:p.y})}}if(!boxes.length)return null;return{left:Math.min(...boxes.map(b=>b.left)),right:Math.max(...boxes.map(b=>b.right)),top:Math.min(...boxes.map(b=>b.top)),bottom:Math.max(...boxes.map(b=>b.bottom))}}

export function reorderSelection(shapes,ids,direction){
 const order=[...shapes],selected=new Set(ids);
 if(direction==='up'){for(let i=order.length-2;i>=0;i--)if(selected.has(order[i].id)&&!selected.has(order[i+1].id))[order[i],order[i+1]]=[order[i+1],order[i]]}
 else{for(let i=1;i<order.length;i++)if(selected.has(order[i].id)&&!selected.has(order[i-1].id))[order[i],order[i-1]]=[order[i-1],order[i]]}
 if(order.every((s,i)=>s.id===shapes[i].id))return{};
 return Object.fromEntries(order.map((s,z)=>[s.id,{z}]));
}
export function isGroupSelection(ids,points){return ids.length+Object.entries(points).filter(([id])=>!ids.includes(id)).reduce((n,[,keys])=>n+keys.length,0)>1}
