import {detachProject} from './attachments.js';
import {DEFAULT_STYLE} from './defaults.js';
export const DRAFT_KEY='procedural-animation.draft.v1';
const FORMAT='procedural-animation',VERSION=1;
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const safeId=value=>typeof value==='string'&&value.length>0&&!['__proto__','constructor','prototype'].includes(value);
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const color=value=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
function validTimeline(timeline,symbols){
 if(!record(timeline)||!Array.isArray(timeline.frames)||!timeline.frames.length||!finite(timeline.duration)||timeline.duration<=0||!['linear','smooth'].includes(timeline.easing))return false;
 const frameIds=new Set(),shapes=new Map();
 for(const frame of timeline.frames){
  if(!record(frame)||!safeId(frame.id)||frameIds.has(frame.id)||!record(frame.changes))return false;frameIds.add(frame.id);
  for(const[id,patch]of Object.entries(frame.changes)){
   if(!safeId(id)||!record(patch))return false;const shape={...shapes.get(id),...patch};shapes.set(id,shape);
   if(shape.visible===false)continue;
   if(!['circle','rect','line','symbol'].includes(shape.type)||!['x','y','w','h','cx','cy','rotation','opacity','stroke'].every(key=>finite(shape[key]))||!color(shape.color)||(shape.strokeColor!=null&&!color(shape.strokeColor)))return false;
   if((shape.tint!=null&&!color(shape.tint))||(shape.matrix!=null&&(!Array.isArray(shape.matrix)||shape.matrix.length!==6||!shape.matrix.every(finite))))return false;
   if(shape.type==='symbol'&&(!safeId(shape.symbolId)||!Object.hasOwn(symbols,shape.symbolId)))return false;
   for(const key of['startLink','endLink']){const link=shape[key];if(link!=null&&(!record(link)||!safeId(link.id)||!['line','circle'].includes(link.kind)||!finite(link.kind==='line'?link.t:link.angle)))return false}
  }
 }
 return true;
}
function validProject(project){
 if(!record(project)||!record(project.symbols)||!validTimeline(project,project.symbols))return false;
 for(const[id,symbol]of Object.entries(project.symbols))if(!safeId(id)||!record(symbol)||!finite(symbol.width)||symbol.width<=0||!finite(symbol.height)||symbol.height<=0||!validTimeline(symbol,project.symbols))return false;
 const done=new Set(),active=new Set();function visit(id){if(active.has(id))return false;if(done.has(id))return true;active.add(id);for(const frame of project.symbols[id].frames)for(const patch of Object.values(frame.changes))if(patch.symbolId&&(!Object.hasOwn(project.symbols,patch.symbolId)||!visit(patch.symbolId)))return false;active.delete(id);done.add(id);return true}
 return Object.keys(project.symbols).every(visit);
}
const bool=(value,fallback)=>typeof value==='boolean'?value:fallback;
const camera=view=>({zoom:finite(view?.zoom)?Math.max(.4,Math.min(16,view.zoom)):1,pan:{x:finite(view?.pan?.x)?view.pan.x:0,y:finite(view?.pan?.y)?view.pan.y:0}});
function editorState(project,editor={}){
 let scope=null,path=[];
 if(safeId(editor.scope)&&Object.hasOwn(project.symbols,editor.scope)&&Array.isArray(editor.path)&&editor.path.length){
  let valid=true;
  for(let i=0;i<editor.path.length;i++){
   const entry=editor.path[i],parent=i===0?null:entry?.scope,next=i===editor.path.length-1?editor.scope:editor.path[i+1]?.scope;
   if(!record(entry)||entry.scope!==parent||(parent!==null&&!Object.hasOwn(project.symbols,parent))||!Object.hasOwn(project.symbols,next)){valid=false;break}
   const timeline=parent===null?project:project.symbols[parent];
   if(!timeline.frames.some(f=>Object.values(f.changes).some(p=>p.symbolId===next))){valid=false;break}
   path.push({scope:parent,frame:Math.max(0,Math.min(timeline.frames.length-1,Number.isInteger(entry.frame)?entry.frame:0)),...camera(entry)});
  }
  if(valid)scope=editor.scope;else path=[];
 }
 const timeline=scope?project.symbols[scope]:project;
 return{scope,path,frame:Math.max(0,Math.min(timeline.frames.length-1,Number.isInteger(editor.frame)?editor.frame:0)),...camera(editor)};
}
export function serializeAnimation(state,pretty=false){return JSON.stringify({format:FORMAT,version:VERSION,savedAt:new Date().toISOString(),project:state.project,preferences:state.preferences,editor:state.editor},null,pretty?2:0)}
export function parseAnimation(raw){
 const saved=JSON.parse(raw,(key,value)=>{if(['__proto__','constructor','prototype'].includes(key))throw new Error('Invalid project key');return value});
 if(!record(saved)||saved.format!==FORMAT||saved.version!==VERSION||!validProject(saved.project))throw new Error('Invalid animation file');
 saved.project=detachProject(saved.project);
 const p=record(saved.preferences)?saved.preferences:{},style=record(p.drawingStyle)?p.drawingStyle:{};
 return{project:saved.project,preferences:{snap:bool(p.snap,true),grid:bool(p.grid,true),loop:bool(p.loop,true),movieFps:[24,25,30,60].includes(p.movieFps)?p.movieFps:30,drawingStyle:{...DEFAULT_STYLE,color:color(style.color)?style.color:DEFAULT_STYLE.color,strokeColor:color(style.strokeColor)?style.strokeColor:DEFAULT_STYLE.strokeColor,stroke:finite(style.stroke)?Math.max(0,Math.min(80,style.stroke)):DEFAULT_STYLE.stroke,fill:bool(style.fill,DEFAULT_STYLE.fill),strokeVisible:bool(style.strokeVisible,true),strokeStyle:['solid','dashed','dotted','dash-dot'].includes(style.strokeStyle)?style.strokeStyle:'solid'}},editor:editorState(saved.project,record(saved.editor)?saved.editor:{})};
}
export function loadDraft(storage){
 let raw;try{raw=storage.getItem(DRAFT_KEY)}catch{return{state:null,canSave:true,notice:'Automatic saving is unavailable in this browser. Use Save JSON to keep a copy.'}}
 if(!raw)return{state:null,canSave:true,notice:''};
 try{return{state:parseAnimation(raw),canSave:true,notice:''}}catch{
  // Preserve an unreadable draft before any new automatic save can replace it.
  try{storage.setItem(DRAFT_KEY+'.recovery',raw);return{state:null,canSave:true,notice:'The saved animation could not be restored. A recovery copy was kept on this device.'}}
  catch{return{state:null,canSave:false,notice:'The saved animation could not be restored. Automatic saving is paused to preserve it; use Save JSON for new work.'}}
 }
}
export function saveDraft(storage,state){storage.setItem(DRAFT_KEY,serializeAnimation(state))}
export function downloadAnimation(state){
 const blob=new Blob([serializeAnimation(state,true)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
 try{link.href=url;link.download=`animation-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;link.style.display='none';document.body.appendChild(link);link.click()}finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}
}
