import {DEFAULT_STYLE} from './defaults.js';
import {resolveShapes} from './animation.js';
import {selectionBounds} from './editing.js';
import {pasteShapes} from './symbols.js';
export function importedImage(image,point,maxSize,makeId){const ratio=Math.min(1,maxSize.w/image.width,maxSize.h/image.height),w=image.width*ratio,h=image.height*ratio;return{...DEFAULT_STYLE,id:makeId(),type:'image',name:image.name,src:image.src,x:point.x-w/2,y:point.y-h/2,w,h,cx:0,cy:0,rotation:0,opacity:1,visible:true,fill:false,stroke:0,strokeVisible:false}}
export function importedAnimation(saved,point,time,makeId){
 const project=saved.project,allShapes=project.frames.flatMap((_,i)=>resolveShapes(project.frames,i)),bounds=selectionBounds(allShapes,{symbols:project.symbols,time:0});
 if(!bounds)throw new Error('This animation has no graphics to import.');
 const width=Math.max(1,bounds.right-bounds.left),height=Math.max(1,bounds.bottom-bounds.top),root=makeId();
 // A definition-space translation preserves every sparse frame edit and nested reference.
 const definition={id:root,width,height,duration:project.duration,easing:project.easing,frames:structuredClone(project.frames)};
 const offsets=new Map();for(const frame of definition.frames)for(const[id,patch]of Object.entries(frame.changes)){const previous=offsets.get(id)||[1,0,0,1,0,0];if(!offsets.has(id)||Object.hasOwn(patch,'matrix')){const matrix=Object.hasOwn(patch,'matrix')?(patch.matrix||[1,0,0,1,0,0]):previous;offsets.set(id,matrix);patch.matrix=[...matrix.slice(0,4),matrix[4]-bounds.left,matrix[5]-bounds.top]}}
 const instance={...DEFAULT_STYLE,id:makeId(),type:'symbol',name:'Imported animation',symbolId:root,tint:'#ffffff',x:point.x-width/2,y:point.y-height/2,w:width,h:height,cx:0,cy:0,rotation:0,opacity:1,visible:true,stroke:0};
 return pasteShapes({shapes:[instance],symbols:{...project.symbols,[root]:definition}},makeId,0,time);
}
