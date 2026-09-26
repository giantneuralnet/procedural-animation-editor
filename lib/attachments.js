import {resolveShapes,lineGeometry,linePatch} from './animation.js';
// Read legacy attachments once and bake their visible positions into each frame.
// Symbol definition references are independent of these endpoint attachments.
export function detachProject(project){
 function detach(timeline){
  const ids=new Set(timeline.frames.flatMap(f=>Object.entries(f.changes).filter(([,s])=>s.startLink||s.endLink).map(([id])=>id)));
  if(!ids.size)return timeline;
  const frames=timeline.frames.map((frame,index)=>{
   const changes=Object.fromEntries(Object.entries(frame.changes).map(([id,patch])=>{const{startLink,endLink,...rest}=patch;return[id,rest]}));
   for(const shape of resolveShapes(timeline.frames,index))if(ids.has(shape.id)&&shape.type==='line')changes[shape.id]={...changes[shape.id],...linePatch(shape,...Object.values(lineGeometry(shape)))};
   return{...frame,changes};
  });
  return{...timeline,frames};
 }
 return{...detach(project),symbols:Object.fromEntries(Object.entries(project.symbols).map(([id,timeline])=>[id,detach(timeline)]))};
}
