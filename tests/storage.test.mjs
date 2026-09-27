import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBObjectStore} from 'fake-indexeddb';
import {createDraftStore,DRAFT_DATABASE,DATABASE_MARKER} from '../lib/draft-database.js';
import {DRAFT_KEY,serializeAnimation,parseAnimation,saveDraft} from '../lib/project-storage.js';
import {DEFAULT_STYLE} from '../lib/defaults.js';
const source='data:image/webp;base64,AAAA';
function state(src=source){const image={...DEFAULT_STYLE,type:'image',src,x:0,y:0,w:100,h:100,cx:0,cy:0,rotation:0,opacity:1,visible:true};return{project:{duration:1,easing:'linear',symbols:{},frames:[{id:'a',changes:{photo:{...image,id:'photo'}}},{id:'b',changes:{photo:{x:200},copy:{...image,id:'copy'}}}]},preferences:{snap:true,grid:true,loop:true,movieFps:30,drawingStyle:DEFAULT_STYLE},editor:{scope:null,path:[],frame:0,zoom:1,pan:{x:0,y:0}}}}
function local(initial={},limit=Infinity){const data=new Map(Object.entries(initial));return{data,getItem:key=>data.get(key)??null,removeItem:key=>data.delete(key),setItem(key,value){if(value.length>limit)throw new DOMException('Quota exceeded','QuotaExceededError');data.set(key,value)}}}
function legacy(state){return JSON.stringify({format:'procedural-animation',version:1,...state})}
async function rawDatabase(indexedDB,key,raw){const db=await new Promise((resolve,reject)=>{const request=indexedDB.open(DRAFT_DATABASE,1);request.onupgradeneeded=()=>request.result.createObjectStore('drafts');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});try{return await new Promise((resolve,reject)=>{const tx=db.transaction('drafts',raw===undefined?'readonly':'readwrite'),store=tx.objectStore('drafts'),request=raw===undefined?store.get(key):store.put(raw,key);tx.oncomplete=()=>resolve(request.result);tx.onerror=tx.onabort=()=>reject(tx.error)})}finally{db.close()}}
test('portable image saves deduplicate copies and nested definitions while accepting legacy files',()=>{
 const saved=state();saved.project.symbols.inner={id:'inner',width:100,height:100,duration:1,easing:'linear',frames:[{id:'inner-frame',changes:{nested:{...saved.project.frames[0].changes.photo,id:'nested'}}}]};
 const raw=serializeAnimation(saved),packed=JSON.parse(raw);assert.equal(packed.version,2);assert.equal(Object.keys(packed.assets).length,1);assert.equal(raw.split(source).length-1,1);assert.deepEqual(parseAnimation(raw),saved);assert.deepEqual(parseAnimation(legacy(saved)),saved);
 delete packed.assets['image-0'];assert.throws(()=>parseAnimation(JSON.stringify(packed)),/image asset/);
});
test('large image projects that exceed localStorage quota commit and restore in IndexedDB',async()=>{
 const saved=state('data:image/webp;base64,'+'A'.repeat(6*1024*1024)),localStorage=local({},5*1024*1024),indexedDB=new IDBFactory(),store=createDraftStore({indexedDB,localStorage});assert.throws(()=>saveDraft(localStorage,saved),{name:'QuotaExceededError'});assert.equal((await store.load()).state,null);await store.save(saved);await store.close();
 const reopened=createDraftStore({indexedDB,localStorage});assert.deepEqual((await reopened.load()).state,saved);assert.equal(localStorage.getItem(DRAFT_KEY),null);assert.equal(localStorage.getItem(DATABASE_MARKER),'1');await reopened.close();
});
test('legacy saves migrate only after a successful database commit',async()=>{
 const saved=state(),raw=legacy(saved),localStorage=local({[DRAFT_KEY]:raw}),indexedDB=new IDBFactory(),store=createDraftStore({indexedDB,localStorage});assert.deepEqual((await store.load()).state,saved);assert.equal(localStorage.getItem(DRAFT_KEY),null);assert.deepEqual(parseAnimation(await rawDatabase(indexedDB,DRAFT_KEY)),saved);await store.close();
});
test('failed migration retains the original local save and restores the project',async()=>{
 const saved=state(),raw=legacy(saved),localStorage=local({[DRAFT_KEY]:raw}),indexedDB=new IDBFactory(),store=createDraftStore({indexedDB,localStorage}),put=IDBObjectStore.prototype.put;
 try{IDBObjectStore.prototype.put=function(){throw new DOMException('Full','QuotaExceededError')};const result=await store.load();assert.deepEqual(result.state,saved);assert.ok(result.notice);assert.equal(localStorage.getItem(DRAFT_KEY),raw);assert.equal(localStorage.getItem(DATABASE_MARKER),null)}finally{IDBObjectStore.prototype.put=put;await store.close()}
});
test('an aborted database write preserves the last complete save and later writes recover',async()=>{
 const indexedDB=new IDBFactory(),localStorage=local(),store=createDraftStore({indexedDB,localStorage}),before=state(),after=state();after.project.frames[0].changes.photo.x=900;await store.load();await store.save(before);const put=IDBObjectStore.prototype.put;
 try{IDBObjectStore.prototype.put=function(...args){const request=put.apply(this,args);this.transaction.abort();return request};await assert.rejects(store.save(after))}finally{IDBObjectStore.prototype.put=put}
 assert.deepEqual(parseAnimation(await rawDatabase(indexedDB,DRAFT_KEY)),before);await store.save(after);assert.deepEqual((await store.load()).state,after);await store.close();
});
test('queued saves preserve the newest edit across rapid changes and a fresh reopen',async()=>{
 const indexedDB=new IDBFactory(),localStorage=local(),store=createDraftStore({indexedDB,localStorage});await store.load();const saves=[];for(let x=0;x<12;x++){const saved=state();saved.project.frames[0].changes.photo.x=x;saves.push(store.save(saved))}await Promise.all(saves);await store.close();const fresh=createDraftStore({indexedDB,localStorage});assert.equal((await fresh.load()).state.project.frames[0].changes.photo.x,11);await fresh.close();
});
test('an unavailable database does not overwrite a migrated project with a stale local draft',async()=>{
 const localStorage=local({[DATABASE_MARKER]:'1',[DRAFT_KEY]:legacy(state())}),store=createDraftStore({indexedDB:null,localStorage}),loaded=await store.load();assert.equal(loaded.state,null);assert.equal(loaded.canSave,false);assert.match(loaded.notice,/protect/);assert.ok(localStorage.getItem(DRAFT_KEY));await store.close();
});
test('an unreadable database draft is backed up before replacement and legacy storage is not substituted',async()=>{
 const indexedDB=new IDBFactory(),localStorage=local({[DRAFT_KEY]:legacy(state())});await rawDatabase(indexedDB,DRAFT_KEY,'{broken');const store=createDraftStore({indexedDB,localStorage}),loaded=await store.load();assert.equal(loaded.state,null);assert.equal(loaded.canSave,true);assert.equal(await rawDatabase(indexedDB,DRAFT_KEY+'.recovery'),'{broken');assert.equal(await rawDatabase(indexedDB,DRAFT_KEY),'{broken');await store.close();
});
test('legacy fallback remains available when IndexedDB is unsupported',async()=>{
 const saved=state(),localStorage=local({[DRAFT_KEY]:legacy(saved)}),store=createDraftStore({indexedDB:null,localStorage});assert.deepEqual((await store.load()).state,saved);saved.project.frames[0].changes.photo.x=45;await store.save(saved);assert.deepEqual(parseAnimation(localStorage.getItem(DRAFT_KEY)),saved);await store.close();
});
