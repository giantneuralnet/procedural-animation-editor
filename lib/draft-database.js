import {DRAFT_KEY,serializeAnimation,parseAnimation,loadDraft} from './project-storage.js';
export const DRAFT_DATABASE='procedural-animation';
export const DATABASE_MARKER=DRAFT_KEY+'.database';
const RECOVERY_KEY=DRAFT_KEY+'.recovery';
export function createDraftStore({indexedDB,localStorage}){
 let database=null,opening=null,mode='database',queue=Promise.resolve(),loading=null;
 function connect(){
  if(database)return Promise.resolve(database);if(opening)return opening;
  opening=new Promise((resolve,reject)=>{
   if(!indexedDB){reject(new Error('IndexedDB unavailable'));return}
   let finished=false;const request=indexedDB.open(DRAFT_DATABASE,1),timer=setTimeout(()=>fail(new Error('Database open timed out')),5000);
   function fail(error){if(finished)return;finished=true;clearTimeout(timer);reject(error)}
   request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('drafts'))request.result.createObjectStore('drafts')};
   request.onerror=()=>fail(request.error);request.onblocked=()=>fail(new Error('Database blocked'));
   request.onsuccess=()=>{if(finished){request.result.close();return}finished=true;clearTimeout(timer);database=request.result;database.onversionchange=()=>{database.close();database=null;opening=null};resolve(database)};
  }).catch(error=>{opening=null;throw error});return opening;
 }
 async function read(key){const db=await connect();return new Promise((resolve,reject)=>{const tx=db.transaction('drafts','readonly'),request=tx.objectStore('drafts').get(key);let value;request.onsuccess=()=>{value=request.result};tx.oncomplete=()=>resolve(value);tx.onerror=tx.onabort=()=>reject(tx.error||new Error('Draft read failed'))})}
 async function write(key,raw){const db=await connect();return new Promise((resolve,reject)=>{const tx=db.transaction('drafts','readwrite');tx.objectStore('drafts').put(raw,key);tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(tx.error||new Error('Draft save failed'))})}
 function migrated(){try{localStorage.setItem(DATABASE_MARKER,'1');localStorage.removeItem(DRAFT_KEY)}catch{/* Database save remains valid if browser preferences are blocked. */}}
 async function loadInitial(){
  let raw;
  try{raw=await read(DRAFT_KEY)}catch{
   let migratedBefore=false;try{migratedBefore=localStorage.getItem(DATABASE_MARKER)==='1'}catch{}
   if(migratedBefore)return{state:null,canSave:false,notice:'Your saved project could not be opened. Close other editor tabs and reload. Automatic saving is paused to protect it.'};
   mode='local';const legacy=loadDraft(localStorage);return{...legacy,notice:legacy.notice||'Larger project storage is unavailable. Save JSON to keep a backup of images.'};
  }
  if(raw!=null){try{return{state:parseAnimation(raw),canSave:true,notice:''}}catch{
   try{await write(RECOVERY_KEY,raw);return{state:null,canSave:true,notice:'The saved animation could not be restored. A recovery copy was kept on this device.'}}catch{return{state:null,canSave:false,notice:'The saved animation could not be restored. Automatic saving is paused to preserve it; use Save JSON for new work.'}}
  }}
  try{raw=localStorage.getItem(DRAFT_KEY)}catch{return{state:null,canSave:false,notice:'The previous save could not be checked. Automatic saving is paused to protect it. Load a JSON backup or start a new project.'}}
  if(!raw)return{state:null,canSave:true,notice:''};
  let state;try{state=parseAnimation(raw)}catch{try{await write(RECOVERY_KEY,raw);return{state:null,canSave:true,notice:'The saved animation could not be restored. A recovery copy was kept on this device.'}}catch{return{state:null,canSave:false,notice:'Automatic saving is paused to preserve the previous save. Use Save JSON to keep a copy.'}}}
  try{await write(DRAFT_KEY,serializeAnimation(state));migrated();return{state,canSave:true,notice:''}}catch{return{state,canSave:true,notice:'The previous project was restored. Larger project saving could not start; use Save JSON to keep a backup.'}}
 }
 function save(state){
  // Capture this revision before queued writes run; a failed write cannot erase the previous commit.
  const raw=serializeAnimation(state),operation=queue.then(async()=>{if(mode==='local'){localStorage.setItem(DRAFT_KEY,raw);return}await write(DRAFT_KEY,raw);migrated()});queue=operation.catch(()=>{});return operation;
 }
 function load(){loading=loadInitial();return loading}
 return{load,save,close:()=>Promise.allSettled([queue,loading]).then(()=>{database?.close();database=null;opening=null})};
}
