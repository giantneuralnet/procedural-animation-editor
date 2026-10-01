import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveShapes,interpolateShapes} from '../lib/animation.js';
import {initialFrames} from './scene-fixture.js';
test('earlier color changes carry through independent edits until a later explicit color',()=>{const fs=structuredClone(initialFrames);fs[0].changes.circle.color='#ff0000';assert.equal(resolveShapes(fs,1).find(s=>s.id==='circle').color,'#ff0000');assert.equal(resolveShapes(fs,1).find(s=>s.id==='circle').x,400);assert.equal(resolveShapes(fs,2).find(s=>s.id==='circle').color,'#e7aa8d')});
test('blank added frames inherit resolved properties without freezing them',()=>{const fs=structuredClone(initialFrames);fs.splice(1,0,{id:'new',changes:{}});fs[0].changes.circle.w=180;assert.equal(resolveShapes(fs,1).find(s=>s.id==='circle').w,180);assert.equal(resolveShapes(fs,2).find(s=>s.id==='circle').w,200)});
test('midpoint interpolates geometry and color',()=>{const fs=structuredClone(initialFrames);fs[0].changes.circle.color='#000000';fs[1].changes.circle.color='#ffffff';const s=interpolateShapes(fs,.5).find(s=>s.id==='circle');assert.equal(s.x,310);assert.equal(s.w,180);assert.equal(s.color,'#808080')});
test('deletion carries forward and fades out',()=>{const fs=structuredClone(initialFrames);fs[1].changes.circle={visible:false};assert.equal(resolveShapes(fs,2).some(s=>s.id==='circle'),false);assert.equal(interpolateShapes(fs,.5).find(s=>s.id==='circle').opacity,.5)});
test('new shapes do not appear on earlier frames and fade in',()=>{const fs=structuredClone(initialFrames);fs[1].changes.new={...fs[0].changes.circle,x:100};assert.equal(resolveShapes(fs,0).some(s=>s.id==='new'),false);assert.equal(interpolateShapes(fs,.5).find(s=>s.id==='new').opacity,.5)});

import {findSnap,anchorPoint,linePoint,lineGeometry,fromLinePoints,resolveConnections} from '../lib/animation.js';
const close=(actual,expected)=>{assert.ok(Math.abs(actual.x-expected.x)<1e-4,`x: ${actual.x} != ${expected.x}`);assert.ok(Math.abs(actual.y-expected.y)<1e-4,`y: ${actual.y} != ${expected.y}`)};
function connectedScene(){const circle={...initialFrames[0].changes.circle,id:'circle',x:0,y:0,w:100,h:100};const line={...initialFrames[0].changes.line,id:'line',x:100,y:50,w:150,h:0,cx:75,cy:0,startLink:{id:'circle',kind:'circle',angle:0}};return [{id:'a',changes:{circle,line}},{id:'b',changes:{circle:{x:160,y:80,w:200,h:140,rotation:45}}}]}
test('circle connections follow translation, resizing, and rotation across frames',()=>{const fs=connectedScene();for(const i of [0,1]){const shapes=resolveShapes(fs,i),c=shapes.find(s=>s.id==='circle'),l=shapes.find(s=>s.id==='line');close(linePoint(l,0),anchorPoint(c,l.startLink))}});
test('circle connections stay exact throughout smooth playback',()=>{const fs=connectedScene();for(const t of [.1,.25,.5,.75,.9]){const shapes=interpolateShapes(fs,t),c=shapes.find(s=>s.id==='circle'),l=shapes.find(s=>s.id==='line');close(linePoint(l,0),anchorPoint(c,l.startLink))}});
test('line-to-line connections follow the target curve and chained connections',()=>{const fs=connectedScene();fs[0].changes.branch={...fs[0].changes.line,id:'branch',x:175,y:50,w:0,h:200,cx:0,cy:100,startLink:{id:'line',kind:'line',t:.5}};fs[1].changes.line={cy:200};for(const position of [0,.4,1]){const shapes=interpolateShapes(fs,position),branch=shapes.find(s=>s.id==='branch'),line=shapes.find(s=>s.id==='line');close(linePoint(branch,0),linePoint(line,.5))}});
test('both endpoints can stay connected to different moving circles',()=>{const fs=connectedScene();fs[0].changes.other={...fs[0].changes.circle,id:'other',x:300};fs[0].changes.line.endLink={id:'other',kind:'circle',angle:Math.PI};fs[1].changes.other={y:-100,w:160};const shapes=interpolateShapes(fs,.5),l=shapes.find(s=>s.id==='line');for(const [key,t]of [['startLink',0],['endLink',1]])close(linePoint(l,t),anchorPoint(shapes.find(s=>s.id===l[key].id),l[key]))});
test('snap finds the circle perimeter and line endpoints',()=>{const shapes=resolveShapes(connectedScene(),0);const c=findSnap(shapes,{x:0,y:52},'new',12);assert.equal(c.link.id,'circle');assert.equal(c.link.kind,'circle');const l=findSnap(shapes,{x:252,y:51},'new',12);assert.equal(l.link.id,'line');assert.equal(l.link.t,1);assert.equal(findSnap(shapes,{x:900,y:900},'new',12),null)});
test('snapping prevents self links and dependency cycles',()=>{const shapes=resolveShapes(connectedScene(),0);const branch={...shapes.find(s=>s.id==='line'),id:'branch',startLink:{id:'line',kind:'line',t:1}};const result=findSnap([...shapes,branch],{x:250,y:50},'line',10);assert.equal(result,null)});
test('explicit disconnection inherits and leaves resolved geometry in place',()=>{const fs=connectedScene(),shapes=resolveShapes(fs,1),line=shapes.find(s=>s.id==='line'),g=lineGeometry(line);fs[1].changes.line={...fromLinePoints(g.start,g.end,g.control),startLink:null,endLink:null};fs.push({id:'c',changes:{circle:{x:900}}});close(linePoint(resolveShapes(fs,2).find(s=>s.id==='line'),0),g.start)});
test('a changed attachment interpolates toward the new anchor without a jump',()=>{const fs=connectedScene();fs[1].changes.line={startLink:{id:'circle',kind:'circle',angle:Math.PI}};const expected=linePoint(resolveShapes(fs,1).find(s=>s.id==='line'),0),near=linePoint(interpolateShapes(fs,.999999).find(s=>s.id==='line'),0);assert.ok(Math.hypot(expected.x-near.x,expected.y-near.y)<.001)});
test('connections survive serialization and earlier target edits',()=>{const fs=JSON.parse(JSON.stringify(connectedScene()));fs[0].changes.circle.h=180;const shapes=resolveShapes(fs,0),line=shapes.find(s=>s.id==='line');close(linePoint(line,0),{x:100,y:90});assert.equal(resolveConnections(shapes).length,2)});

import {alignCamera,snapEndpoint,movieDuration} from '../lib/view.js';
import {supportedMovieType,movieDimensions,recordMovie,fitMovieView} from '../lib/movie.js';
test('looped playback jumps immediately at the final frame without a hold or reverse transition',()=>{const fs=structuredClone(initialFrames);assert.deepEqual(interpolateShapes(fs,2,'linear',true),resolveShapes(fs,0));assert.deepEqual(interpolateShapes(fs,2,'linear',false),resolveShapes(fs,2));assert.deepEqual(interpolateShapes(fs,2.5,'linear',true),interpolateShapes(fs,.5,'linear',false))});
test('connections follow targets on the closing transition too',()=>{const fs=connectedScene();const shapes=interpolateShapes(fs,1.5,'smooth',true),line=shapes.find(s=>s.id==='line'),circle=shapes.find(s=>s.id==='circle');close(linePoint(line,0),anchorPoint(circle,line.startLink))});
test('export duration contains only forward transitions',()=>{assert.equal(movieDuration(3,1,true),2);assert.equal(movieDuration(3,1,false),2);assert.equal(movieDuration(3,.5,true),1);assert.equal(movieDuration(1,1,true),1)});
test('camera settles with grid on the top, left and right edges',()=>{for(const [w,h,baseScale,zoom]of [[390,650,.4375,1.31],[1280,720,1.2,.73],[844,220,.3214,2.8]]){const v=alignCamera({w,h},baseScale,zoom,{x:33.4,y:-53.1}),scale=baseScale*v.zoom,step=gridSpacing(v.zoom)*scale,x=v.pan.x,y=v.pan.y;for(const n of [x/step,y/step,(w-x)/step])assert.ok(Math.abs(n-Math.round(n))<1e-8);assert.ok(v.zoom>=.4&&v.zoom<=MAX_ZOOM)}});
test('grid attraction wins over a nearby off-grid line when distances are similar',()=>{const line={...initialFrames[0].changes.line,id:'target',x:17,y:-80,w:0,h:160,cx:0,cy:80};const result=snapEndpoint([line],{x:7,y:8},'new',1,true);assert.equal(result.kind,'grid');close(result.point,{x:0,y:0});assert.equal(result.link,null)});
test('line snapping works away from a grid intersection without an attachment',()=>{const line={...initialFrames[0].changes.line,id:'target',x:40,y:0,w:0,h:160,cx:0,cy:80};const result=snapEndpoint([line],{x:42,y:35},'new',1,true);assert.equal(result.link,null);assert.equal(result.kind,'shape');assert.ok(Math.abs(result.point.x-40)<.001);const free=snapEndpoint([line],{x:42,y:35},'new',1,false);close(free.point,{x:42,y:35});assert.equal(free.link,null)});
test('a line on the grid can snap and align without attachment',()=>{const line={...initialFrames[0].changes.line,id:'target',x:0,y:0,w:160,h:0,cx:80,cy:0};const result=snapEndpoint([line],{x:1,y:2},'new',1,true);assert.equal(result.kind,'shape');close(result.point,{x:0,y:0})});
test('movie format prefers MP4 but negotiates WebM for other encoders',()=>{assert.equal(supportedMovieType({isTypeSupported:type=>type==='video/mp4'}),'video/mp4');assert.equal(supportedMovieType({isTypeSupported:type=>type==='video/webm;codecs=vp8'}),'video/webm;codecs=vp8');assert.equal(supportedMovieType({isTypeSupported:()=>false}),null);assert.equal(supportedMovieType(null),null)});
test('movies use full HD in the selected device orientation',()=>{assert.deepEqual(movieDimensions(390,650),{width:1080,height:1920});assert.deepEqual(movieDimensions(1280,650),{width:1920,height:1080});assert.deepEqual(movieDimensions(500,450,'portrait'),{width:1080,height:1920});const fit=fitMovieView(390,650,1080,1920);assert.equal(fit.x,0);assert.ok(fit.y>0);assert.ok(Math.abs(390*fit.scale-1080)<.001)});

// Exercise exporter timing, Blob delivery and resource cleanup without a browser UI.
async function withMovieRuntime(run){
 const names=['MediaRecorder','document','requestAnimationFrame','cancelAnimationFrame','setTimeout','clearTimeout','navigator','MediaStream'];const original=Object.fromEntries(names.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));let clock=performance.now(),nextId=0;const pending=new Map(),listeners=new Map(),stats={stopped:0,micStopped:0,lastProgress:0,movieStopped:0,paused:0,resumed:0};
 function schedule(fn,delay){const id=++nextId;pending.set(id,{fn,time:clock+delay});return id}
 globalThis.requestAnimationFrame=fn=>schedule(()=>fn(clock),34);globalThis.cancelAnimationFrame=id=>pending.delete(id);globalThis.setTimeout=(fn,delay)=>schedule(fn,delay);globalThis.clearTimeout=id=>pending.delete(id);
 globalThis.document={hidden:false,addEventListener:(k,fn)=>listeners.set(k,fn),removeEventListener:k=>listeners.delete(k)};
 globalThis.MediaRecorder=class{static isTypeSupported(t){return t==='video/mp4'}constructor(stream,options){this.mimeType=options.mimeType;this.state='inactive';stats.trackKinds=stream.getTracks().map(t=>t.kind)}pause(){this.state='paused';stats.paused++}resume(){this.state='recording';stats.resumed++}start(){this.state='recording';schedule(()=>this.onstart(),0)}stop(){this.state='inactive';stats.movieStopped++;schedule(()=>{this.ondataavailable({data:new Blob(['encoded video'])});this.onstop()},0)}};
 globalThis.MediaStream=class{constructor(tracks){this.tracks=tracks}getTracks(){return this.tracks}getVideoTracks(){return this.tracks.filter(t=>t.kind==='video')}getAudioTracks(){return this.tracks.filter(t=>t.kind==='audio')}};
 const audio={kind:'audio',enabled:true,stop:()=>stats.micStopped++,addEventListener(){},removeEventListener(){}};
 Object.defineProperty(globalThis,'navigator',{value:{mediaDevices:{getUserMedia:async()=>new MediaStream([audio])}},configurable:true});
 const ctx=new Proxy({},{get:()=>()=>{},set:()=>true});const canvas={width:1080,height:1920,getContext:()=>ctx,captureStream:fps=>{stats.fps=fps;return new MediaStream([{kind:'video',stop:()=>stats.stopped++}])}};document.createElement=()=>canvas;
 const options={canvas,frames:initialFrames,duration:.1,loop:true,easing:'smooth',view:{width:390,height:650,scale:.4,origin:{x:0,y:0}},onProgress:p=>stats.lastProgress=p};
 const pump=async(limit=1000)=>{for(let i=0;pending.size&&i<limit;i++){const[id,item]=[...pending].sort((a,b)=>a[1].time-b[1].time)[0];pending.delete(id);clock=item.time;item.fn();await Promise.resolve()}};
 try{await run({options,pump,stats,listeners,audio})}finally{for(const name of names){if(original[name]===undefined)delete globalThis[name];else Object.defineProperty(globalThis,name,original[name])}}
}
test('movie export produces a correctly named Blob and stops capture tracks',async()=>withMovieRuntime(async({options,pump,stats})=>{const promise=recordMovie(options);await pump();const result=await promise;assert.equal(result.extension,'mp4');assert.equal(result.blob.type,'video/mp4');assert.ok(result.blob.size>0);assert.equal(stats.lastProgress,1);assert.equal(stats.stopped,1);assert.equal(stats.movieStopped,1)}));
test('cancelled exports reject and release capture resources',async()=>withMovieRuntime(async({options,pump,stats})=>{const controller=new AbortController(),promise=recordMovie({...options,signal:controller.signal});const rejected=assert.rejects(promise,{name:'AbortError'});controller.abort();await pump();await rejected;assert.equal(stats.stopped,1)}));
test('hiding the editor aborts rather than delivering an incomplete movie',async()=>withMovieRuntime(async({options,pump,stats,listeners})=>{const promise=recordMovie(options);const rejected=assert.rejects(promise,/editor was hidden/);document.hidden=true;listeners.get('visibilitychange')();await pump();await rejected;assert.equal(stats.stopped,1)}));

import {startVoiceRecording} from '../lib/voiceover.js';
test('movie capture uses the selected FPS',async()=>withMovieRuntime(async({options,pump,stats})=>{const promise=recordMovie({...options,fps:60});await pump();await promise;assert.equal(stats.fps,60)}));
test('voiceover combines live video and microphone tracks and preserves HD dimensions',async()=>withMovieRuntime(async({options,pump,stats})=>{const take=await startVoiceRecording({source:options.canvas,width:1920,height:1080,fps:24});await pump(5);const promise=take.stop();await pump();const movie=await promise;assert.deepEqual(stats.trackKinds,['video','audio']);assert.equal(stats.fps,24);assert.equal(movie.width,1920);assert.equal(movie.height,1080);assert.equal(movie.fps,24);assert.equal(movie.extension,'mp4');assert.ok(movie.blob.size>0);assert.equal(stats.stopped,1);assert.equal(stats.micStopped,1)}));
test('pausing voiceover disables the microphone and resuming enables it again',async()=>withMovieRuntime(async({options,pump,stats,audio})=>{const states=[];const take=await startVoiceRecording({source:options.canvas,width:1080,height:1920,onState:s=>states.push(s)});await pump(3);take.pause();assert.equal(audio.enabled,false);assert.equal(stats.paused,1);take.resume();assert.equal(audio.enabled,true);assert.equal(stats.resumed,1);assert.deepEqual(states,['recording','paused','recording']);const promise=take.stop();await pump();await promise;assert.equal(stats.micStopped,1)}));
test('voiceover pauses automatically when the page becomes hidden',async()=>withMovieRuntime(async({options,pump,listeners,audio})=>{const take=await startVoiceRecording({source:options.canvas,width:1080,height:1920});await pump(3);document.hidden=true;listeners.get('visibilitychange')();assert.equal(audio.enabled,false);const promise=take.stop();await pump();await promise}));
test('cancelled microphone permission requests release a late microphone grant',async()=>withMovieRuntime(async({options,stats,audio})=>{let grant;navigator.mediaDevices.getUserMedia=()=>new Promise(resolve=>{grant=resolve});const controller=new AbortController();const promise=startVoiceRecording({source:options.canvas,width:1080,height:1920,signal:controller.signal});const rejected=assert.rejects(promise,{name:'AbortError'});controller.abort();grant(new MediaStream([audio]));await rejected;assert.equal(stats.micStopped,1);assert.equal(stats.fps,undefined)}));
test('microphone denial gives a recoverable message',async()=>withMovieRuntime(async({options})=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('denied','NotAllowedError')};await assert.rejects(startVoiceRecording({source:options.canvas,width:1080,height:1920}),/Microphone access was denied/)}));

import {cameraRect,cameraPosition,openFrontCamera,drawCameraOverlay} from '../lib/camera.js';
test('camera dragging stays within mobile and landscape canvas edges after resizing',()=>{
 for(const [w,h] of [[390,620],[844,210],[1920,850],[120,90]]){
  for(const position of [{x:0,y:0},{x:1,y:1},{x:-5,y:20}]){
   const rect=cameraRect(w,h,position);assert.ok(rect.x>=0&&rect.y>=0);assert.ok(rect.x+rect.width<=w);assert.ok(rect.y+rect.height<=h);
   assert.deepEqual(cameraPosition(rect,w,h,-1000,10000),{x:0,y:1});
  }
 }
});
test('front camera requests video only and releases a grant after cancellation',async()=>{
 let grant,constraints,stopped=0;const mediaDevices={getUserMedia:value=>{constraints=value;return new Promise(resolve=>grant=resolve)}},controller=new AbortController();
 const promise=openFrontCamera({mediaDevices,signal:controller.signal}),rejected=assert.rejects(promise,{name:'AbortError'});controller.abort();grant({getTracks:()=>[{stop:()=>stopped++}]});await rejected;
 assert.equal(constraints.audio,false);assert.equal(constraints.video.facingMode.ideal,'user');assert.equal(stopped,1);
});
test('camera permission denial gives a recoverable error',async()=>{
 await assert.rejects(openFrontCamera({mediaDevices:{getUserMedia:async()=>{throw new DOMException('Denied','NotAllowedError')}}}),/Camera access was denied/);
});
const fakeCamera=()=>({video:{readyState:2,videoWidth:640,videoHeight:480},rect:{x:100,y:20,width:120,height:160,radius:15},sourceWidth:390,sourceHeight:650});
test('camera composition covers its rounded window, mirrors the image, and scales to HD',()=>{
 const calls=[],ctx=new Proxy({},{get:(_,method)=>(...args)=>calls.push([method,...args]),set:()=>true}),overlay=fakeCamera();
 drawCameraOverlay(ctx,overlay,1080,1920);
 const image=calls.find(c=>c[0]==='drawImage');assert.deepEqual(image.slice(2),[140,0,360,480,0,0,120,160]);
 assert.ok(calls.find(c=>c[0]==='scale'&&c[1]===-1&&c[2]===1));assert.ok(calls.find(c=>c[0]==='scale'&&c[1]===1080/390));
 assert.ok(calls.findIndex(c=>c[0]==='clip')<calls.findIndex(c=>c[0]==='drawImage'));assert.equal(calls.filter(c=>c[0]==='roundRect').length,2);
});
test('interrupted camera never burns a stale image into the recording',()=>{
 const calls=[],ctx=new Proxy({},{get:(_,method)=>(...args)=>calls.push([method,...args]),set:()=>true});
 drawCameraOverlay(ctx,{...fakeCamera(),paused:true},1080,1920);assert.ok(!calls.some(c=>c[0]==='drawImage'));assert.ok(calls.some(c=>c[0]==='fillText'));
});
test('movie export composites the live camera on each rendered frame',async()=>withMovieRuntime(async({options,pump})=>{
 let reads=0;const videoFrames=[],ctx=new Proxy({},{get:(_,method)=>(...args)=>{if(method==='drawImage')videoFrames.push(args[0])},set:()=>true});options.canvas.getContext=()=>ctx;
 const overlay=fakeCamera(),promise=recordMovie({...options,getCameraOverlay:()=>{reads++;return overlay}});await pump();await promise;assert.ok(reads>2);assert.equal(videoFrames.length,reads);assert.ok(videoFrames.every(video=>video===overlay.video));
}));
test('voiceover composites camera movement live without including preview controls',async()=>withMovieRuntime(async({options,pump})=>{
 const calls=[],ctx=new Proxy({},{get:(_,method)=>(...args)=>calls.push([method,...args]),set:()=>true});options.canvas.getContext=()=>ctx;
 const overlay=fakeCamera(),take=await startVoiceRecording({source:options.canvas,width:1080,height:1920,getCameraOverlay:()=>overlay});await pump(3);overlay.rect.x=210;await pump(3);const promise=take.stop();await pump();await promise;
 assert.ok(calls.some(c=>c[0]==='roundRect'&&c[1]===100));assert.ok(calls.some(c=>c[0]==='roundRect'&&c[1]===210));assert.ok(calls.some(c=>c[0]==='drawImage'&&c[1]===overlay.video));
}));

import {shapeBounds,boxSelection,moveSelection,duplicateSelection,reorderFrames,deleteFrame} from '../lib/editing.js';
import {drawShape} from '../lib/animation.js';
test('box selection works in both drag directions and includes rotated shapes and curved lines',()=>{
 const shapes=resolveShapes(initialFrames,1),bounds=shapeBounds(shapes.find(s=>s.id==='square'));
 assert.ok(bounds.left<220);assert.deepEqual(boxSelection(shapes,{x:0,y:0},{x:1000,y:800}),shapes.map(s=>s.id));
 assert.deepEqual(boxSelection(shapes,{x:1000,y:800},{x:0,y:0}),shapes.map(s=>s.id));assert.deepEqual(boxSelection(shapes,{x:-1000,y:-1000},{x:-800,y:-800}),[]);
 const line={...initialFrames[0].changes.line,id:'arc',x:0,y:0,w:100,h:0,cx:50,cy:200,stroke:0};const b=shapeBounds(line);assert.equal(b.bottom,100);assert.deepEqual(boxSelection([line],{x:45,y:95},{x:55,y:105}),['arc']);
});
test('group movement preserves relative spacing and internal line connections',()=>{
 const fs=connectedScene(),shapes=resolveShapes(fs,1),changes=moveSelection(shapes,80,-160);fs.push({id:'moved',changes});const moved=resolveShapes(fs,2);
 for(const s of moved){const before=shapes.find(p=>p.id===s.id);close({x:s.x,y:s.y},{x:before.x+80,y:before.y-160});if(s.type==='line')for(const key of ['start','end','control']){const a=lineGeometry(before)[key],b=lineGeometry(s)[key];close(b,{x:a.x+80,y:a.y-160})}}
 close(linePoint(moved.find(s=>s.id==='line'),0),anchorPoint(moved.find(s=>s.id==='circle'),moved.find(s=>s.id==='line').startLink));
});
test('duplicating a group reconnects copies to copies and leaves originals intact',()=>{
 const shapes=resolveShapes(connectedScene(),1);let index=0;const copies=duplicateSelection(shapes,()=>`copy-${index++}`,80),resolved=resolveConnections([...shapes,...copies]),circle=resolved.find(s=>s.id==='copy-0'),line=resolved.find(s=>s.id==='copy-1');assert.equal(line.startLink.id,circle.id);close(linePoint(line,0),anchorPoint(circle,line.startLink));assert.equal(shapes[1].startLink.id,'circle');
 const lone=duplicateSelection([shapes[1]],()=> 'only',80)[0];assert.equal(lone.startLink,null);close(linePoint(lone,0),{x:linePoint(shapes[1],0).x+80,y:linePoint(shapes[1],0).y+80});
});
const visibleState=shapes=>shapes.map(s=>({...s,visible:s.visible!==false,strokeColor:s.strokeColor||null,startLink:s.startLink||null,endLink:s.endLink||null})).sort((a,b)=>a.id.localeCompare(b.id));
test('reordering any frame preserves the resolved appearance of all frame identities',()=>{
 const fs=structuredClone(initialFrames);fs[1].changes.extra={...fs[0].changes.circle,id:'extra',x:10};fs[2].changes.square={visible:false};
 const original=new Map(fs.map((f,i)=>[f.id,visibleState(resolveShapes(fs,i))]));
 for(let from=0;from<fs.length;from++)for(let to=0;to<fs.length;to++){const moved=reorderFrames(fs,from,to);moved.forEach((f,i)=>assert.deepEqual(visibleState(resolveShapes(moved,i)),original.get(f.id)));assert.equal(moved[to].id,fs[from].id)}
});
test('reordered and deleted frames retain connected geometry and avoid orphan patches',()=>{
 const fs=connectedScene(),expected=visibleState(resolveShapes(fs,1)),reordered=reorderFrames(fs,1,0);assert.deepEqual(visibleState(resolveShapes(reordered,0)),expected);const deleted=deleteFrame(fs,0);assert.deepEqual(visibleState(resolveShapes(deleted,0)),expected);assert.equal(deleteFrame(deleted,0),deleted);
});
test('reordering preserves continued inheritance where no new override is needed',()=>{
 const fs=structuredClone(initialFrames),moved=reorderFrames(fs,1,2);moved[0].changes.circle.stroke=17;for(let i=1;i<moved.length;i++)assert.equal(resolveShapes(moved,i).find(s=>s.id==='circle').stroke,17);
});
test('stroke color inherits and smoothly interpolates independently of fill color',()=>{
 const fs=structuredClone(initialFrames);fs[0].changes.circle.strokeColor='#000000';fs[2].changes.circle.strokeColor='#ffffff';assert.equal(resolveShapes(fs,1).find(s=>s.id==='circle').strokeColor,'#000000');assert.equal(interpolateShapes(fs,1.5).find(s=>s.id==='circle').strokeColor,'#808080');assert.equal(resolveShapes(fs,1).find(s=>s.id==='circle').color,fs[0].changes.circle.color);
 const calls=[],ctx=new Proxy({},{get:(_,key)=>(...args)=>calls.push([key,...args]),set:(obj,key,value)=>{obj[key]=value;calls.push(['set',key,value]);return true}});drawShape(ctx,resolveShapes(fs,0).find(s=>s.id==='circle'));assert.ok(calls.some(c=>c[0]==='fill'));assert.ok(calls.some(c=>c[0]==='stroke'));assert.ok(calls.some(c=>c[0]==='set'&&c[1]==='strokeStyle'&&c[2]==='#000000'));
});

import {frameClock,framePlan,captureCanvas} from '../lib/recording-clock.js';
import {encodeAnimation} from '../lib/fast-movie.js';
import {microphoneMixer} from '../lib/microphone-mixer.js';
import {interpolateScene} from '../lib/animation.js';
import {styleSelection} from '../lib/editing.js';
test('30 FPS cadence survives 60 Hz refresh jitter without collapsing to 20 FPS',()=>{
 const due=frameClock(30),times=Array.from({length:601},(_,i)=>i*1000/60+(i%3===0?-.15:.1)),frames=times.filter(due);assert.ok(frames.length>=300&&frames.length<=302,`Encoded ${frames.length} frames in ten seconds`);
 const stalled=frameClock(30);assert.equal(stalled(0),true);assert.equal(stalled(1000),true);assert.equal(stalled(1000.1),false);assert.equal(stalled(1033.4),true);
});
test('manual capture requests exactly one frame per call when the browser supports it',()=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'CanvasCaptureMediaStreamTrack');let requests=0,rate;
 try{globalThis.CanvasCaptureMediaStreamTrack=class{requestFrame(){requests++}};const track=new CanvasCaptureMediaStreamTrack();const capture=captureCanvas({captureStream:fps=>{rate=fps;return{getVideoTracks:()=>[track]}}},30);assert.equal(rate,0);capture.request();capture.request();assert.equal(requests,2)}finally{if(descriptor)Object.defineProperty(globalThis,'CanvasCaptureMediaStreamTrack',descriptor);else delete globalThis.CanvasCaptureMediaStreamTrack}
});
function fakeEncoder(){const stats={timestamps:[],cancelled:0,finalized:0};return{stats,library:{canEncodeVideo:async()=>true,Mp4OutputFormat:class{},BufferTarget:class{buffer=new Uint8Array([1,2,3]).buffer},Output:class{constructor(options){this.target=options.target}addVideoTrack(source,metadata){stats.metadata=metadata}async start(){}async finalize(){stats.finalized++}async cancel(){stats.cancelled++}},CanvasSource:class{async add(timestamp,duration){stats.timestamps.push([timestamp,duration])}}}}}
test('fast export writes all frames at exact 30 FPS without waiting for playback',async()=>{
 const{library,stats}=fakeEncoder(),drawn=[];const movie=await encodeAnimation({canvas:{width:1920,height:1080},draw:t=>drawn.push(t),seconds:.3,fps:30},library);
 assert.equal(stats.timestamps.length,9);assert.equal(movie.frameRateMode,'constant');assert.equal(movie.fps,30);assert.equal(movie.blob.type,'video/mp4');assert.equal(stats.metadata.frameRate,30);assert.equal(stats.finalized,1);assert.deepEqual(drawn,stats.timestamps.map(t=>t[0]));stats.timestamps.forEach(([time,duration],i)=>{assert.equal(time,i/30);assert.equal(duration,1/30)});
 for(const fps of [24,25,30,60]){const plan=framePlan(2,fps);assert.equal(plan.count,2*fps);assert.equal(plan.seconds,2);assert.equal(plan.duration,1/fps)}
});
test('fast export cancellation closes the encoder and never delivers a partial file',async()=>{
 const{library,stats}=fakeEncoder(),controller=new AbortController();await assert.rejects(encodeAnimation({canvas:{width:1080,height:1920},draw:()=>controller.abort(),seconds:1,fps:30,signal:controller.signal},library),{name:'AbortError'});assert.ok(stats.cancelled>0);assert.equal(stats.finalized,0);
});
test('unsupported fast encoders allow the real-time fallback',async()=>{const{library}=fakeEncoder();library.canEncodeVideo=async()=>false;assert.equal(await encodeAnimation({canvas:{width:1080,height:1920},seconds:1,fps:30},library),null)});
test('frame taps can transition directly to a distant frame and interrupt smoothly',()=>{
 const a=resolveShapes(initialFrames,0),c=resolveShapes(initialFrames,2),middle=interpolateScene(a,c,.5,'linear');assert.equal(middle.find(s=>s.id==='circle').x,400);
 const b=resolveShapes(initialFrames,1);assert.deepEqual(interpolateScene(middle,b,0),middle);assert.deepEqual(interpolateScene(middle,b,1),b);
});
test('group fill, stroke color and width edits affect all selected shapes and remain independent',()=>{
 const fs=structuredClone(initialFrames),selected=resolveShapes(fs,0).filter(s=>s.id!=='line');
 for(const [property,value] of [['color','#102030'],['strokeColor','#fedcba'],['stroke',12]]){const changes=styleSelection(selected,property,value);for(const[id,patch]of Object.entries(changes))fs[0].changes[id]={...fs[0].changes[id],...patch}}
 for(const s of resolveShapes(fs,1).filter(s=>s.id!=='line')){assert.equal(s.color,'#102030');assert.equal(s.strokeColor,'#fedcba');assert.equal(s.stroke,12);assert.equal(s.fill,selected.find(original=>original.id===s.id).fill)}
 assert.equal(resolveShapes(fs,1).find(s=>s.id==='line').stroke,4);assert.equal(resolveShapes(fs,2).find(s=>s.id==='circle').color,'#e7aa8d');assert.equal(styleSelection(selected,'stroke',8).circle.strokeColor,undefined);
});
async function withAudioMixer(run){const original=Object.getOwnPropertyDescriptor(globalThis,'AudioContext'),stats={connections:0,disconnections:0,stops:0,closed:0};const gain={gain:{value:1},connect(){},disconnect(){}};
 globalThis.AudioContext=class{createMediaStreamDestination(){return{stream:{getTracks:()=>[{stop:()=>stats.stops++}],getAudioTracks:()=>[{kind:'audio'}]}}}createGain(){return gain}createMediaStreamSource(){return{connect:()=>stats.connections++,disconnect:()=>stats.disconnections++}}async resume(){}async close(){stats.closed++}};
 try{await run({stats,gain})}finally{if(original)Object.defineProperty(globalThis,'AudioContext',original);else delete globalThis.AudioContext}
}
test('microphone can toggle during a recording without replacing the recorded audio track',async()=>withAudioMixer(async({stats,gain})=>{
 let stream=null;const mixer=await microphoneMixer(()=>stream),recorded=mixer.stream;assert.equal(stats.connections,0);
 stream={getAudioTracks:()=>[{readyState:'live'}]};mixer.sync();assert.equal(stats.connections,1);mixer.pause();assert.equal(gain.gain.value,0);mixer.resume();assert.equal(gain.gain.value,1);stream=null;mixer.sync();assert.equal(stats.disconnections,1);assert.equal(mixer.stream,recorded);mixer.close();assert.equal(stats.stops,1);assert.equal(stats.closed,1);
}));
test('recording with the microphone off never requests microphone permission',async()=>withMovieRuntime(async({options,pump})=>withAudioMixer(async()=>{
 navigator.mediaDevices.getUserMedia=async()=>{throw new Error('Unexpected microphone request')};const take=await startVoiceRecording({source:options.canvas,width:1080,height:1920,getMicrophoneStream:()=>null});await pump(3);const result=take.stop();await pump();assert.ok((await result).blob.size>0);
})));

import {initialFrames as blankFrames} from '../lib/animation.js';
import {DEFAULT_STYLE,DEFAULT_EASING,newShapeStyle} from '../lib/defaults.js';
import {startingGridScale,drawGrid} from '../lib/view.js';
import {drawMovieScene} from '../lib/movie-scene.js';
test('new projects have one empty frame and use linear timing',()=>{
 assert.equal(blankFrames.length,1);assert.deepEqual(resolveShapes(blankFrames,0),[]);
 const scene=interpolateShapes(initialFrames,.25,DEFAULT_EASING);assert.equal(scene.find(s=>s.id==='circle').x,265);
});
test('new shapes retain independent fill and stroke colors across shape types',()=>{
 const chosen={...DEFAULT_STYLE,color:'#176688',strokeColor:'#ff9933',stroke:9};
 for(const type of ['line','circle','rect']){const first=newShapeStyle(type),next=newShapeStyle(type,chosen);assert.equal(first.color,'#000000');assert.equal(first.strokeColor,'#ffffff');assert.equal(next.color,chosen.color);assert.equal(next.strokeColor,chosen.strokeColor);assert.equal(next.stroke,9);assert.equal(next.fill,false)}
 assert.equal(DEFAULT_STYLE.color,'#000000');assert.equal(DEFAULT_STYLE.strokeColor,'#ffffff');
});
test('the starting grid has exactly twelve columns with lines on both side edges',()=>{
 for(const width of [320,390,844,1280,1920]){const scale=startingGridScale(width),moves=[],ctx=new Proxy({},{get:(_,key)=>(...args)=>{if(key==='moveTo')moves.push(args)},set:()=>true});drawGrid(ctx,width,600,scale,{x:0,y:0});assert.ok(Math.abs(width/(80*scale)-12)<1e-9);const vertical=moves.filter(p=>p[1]===0);assert.equal(vertical.length,13);assert.equal(vertical[0][0],.5);assert.equal(vertical.at(-1)[0],width-.5)}
});
test('portrait and landscape movies extend the grid into the full frame without stretching shapes',()=>{
 for(const [vw,vh,width,height]of [[390,540,1080,1920],[844,210,1920,1080],[390,900,1080,1920]]){
  const calls=[],ctx=new Proxy({},{get:(_,key)=>(...args)=>calls.push([key,...args]),set:()=>true}),view={width:vw,height:vh,scale:startingGridScale(vw),origin:{x:0,y:0}};
  drawMovieScene(ctx,width,height,{view,shapes:resolveShapes(initialFrames,0),includeGrid:true});
  assert.ok(calls.some(c=>c[0]==='moveTo'&&c[2]===0));assert.ok(calls.some(c=>c[0]==='lineTo'&&c[2]===height));assert.ok(calls.some(c=>c[0]==='lineTo'&&c[1]===width));assert.ok(!calls.some(c=>c[0]==='clip'));
  const scaleCall=calls.find(c=>c[0]==='scale');assert.equal(scaleCall[1],scaleCall[2]);
  const fit=fitMovieView(vw,vh,width,height);if(fit.y>0){assert.ok(calls.some(c=>c[0]==='moveTo'&&c[1]===0&&c[2]<fit.y));assert.ok(calls.some(c=>c[0]==='moveTo'&&c[1]===0&&c[2]>height-fit.y))}
 }
});
test('live recording renders the complete procedural scene instead of a letterboxed screen copy',async()=>withMovieRuntime(async({options,pump})=>{
 const calls=[],ctx=new Proxy({},{get:(_,key)=>(...args)=>calls.push([key,...args]),set:()=>true});options.canvas.getContext=()=>ctx;let reads=0;
 const take=await startVoiceRecording({source:options.canvas,width:1080,height:1920,getScene:()=>{reads++;return{view:{width:390,height:540,scale:startingGridScale(390),origin:{x:0,y:0}},shapes:resolveShapes(initialFrames,0),includeGrid:true}}});await pump(3);const done=take.stop();await pump();await done;
 assert.ok(reads>2);assert.ok(!calls.some(c=>c[0]==='drawImage'));assert.ok(calls.some(c=>c[0]==='ellipse'));assert.ok(calls.some(c=>c[0]==='lineTo'&&c[2]===1920));
}));

import {boxSelectParts,moveParts,partsBounds} from '../lib/editing.js';
import {gridLevel,gridSpacing,MAX_ZOOM} from '../lib/view.js';
import {groupIntoSymbol,copyShapes,pasteShapes,timelineOf,updateTimeline} from '../lib/symbols.js';
import {symbolCycleDuration} from '../lib/animation.js';
import {createMovieRenderer} from '../lib/movie.js';
const ids=()=>{let n=0;return()=>`generated-${++n}`};
const lineForPoints={...initialFrames[0].changes.line,id:'points',x:0,y:0,w:160,h:0,cx:80,cy:120,rotation:0,startLink:null,endLink:null};
test('marquee picks only line endpoints and control points, never a crossed curve',()=>{
 const scene=[lineForPoints];assert.deepEqual(boxSelectParts(scene,{x:70,y:50},{x:90,y:70}),{ids:[],points:{}});
 const forward=boxSelectParts(scene,{x:-5,y:-5},{x:85,y:125}),backward=boxSelectParts(scene,{x:85,y:125},{x:-5,y:-5});
 assert.deepEqual(forward,backward);assert.deepEqual(forward,{ids:[],points:{points:['start','control']}});
 const square={...initialFrames[0].changes.square,id:'square',x:0,y:0,w:30,h:30};assert.deepEqual(boxSelectParts([square,...scene],{x:-5,y:-5},{x:85,y:125}).ids,['square']);
});
test('moving a box of points leaves unselected endpoints and handles fixed',()=>{
 const points={points:['start','control']},changes=moveParts([lineForPoints],[],points,30,-20),moved={...lineForPoints,...changes.points},before=lineGeometry(lineForPoints),after=lineGeometry(moved);
 close(after.end,before.end);close(after.start,{x:30,y:-20});close(after.control,{x:110,y:100});assert.deepEqual(partsBounds([lineForPoints],[],points),{left:0,right:80,top:0,bottom:120});
});
test('a mixed selection moves shapes and selected line handles together',()=>{
 const circle={...initialFrames[0].changes.circle,id:'circle',x:200,y:50},patch=moveParts([circle,lineForPoints],['circle'],{points:['end']},80,40);
 close(patch.circle,{x:280,y:90});const line={...lineForPoints,...patch.points};close(lineGeometry(line).start,lineGeometry(lineForPoints).start);close(lineGeometry(line).control,lineGeometry(lineForPoints).control);close(lineGeometry(line).end,{x:240,y:40});
});
test('moving a selected attached endpoint releases only an anchor that cannot move with it',()=>{
 const target={...lineForPoints,id:'target',cy:0},branch={...lineForPoints,id:'branch',startLink:{id:'target',kind:'line',t:0}};
 const shared=moveParts([target,branch],[],{target:['start'],branch:['start']},20,30);assert.equal(shared.branch.startLink,undefined);
 const separate=moveParts([target,branch],[],{target:['end'],branch:['start']},20,30);assert.equal(separate.branch.startLink,null);
});
test('empty fill is the default and the chosen fill style survives new shapes and color changes',()=>{
 assert.equal(DEFAULT_STYLE.fill,false);for(const fill of [false,true])for(const type of ['circle','rect','line']){const style=newShapeStyle(type,{...DEFAULT_STYLE,fill});assert.equal(style.fill,type==='line'?false:fill)}
 const empty={...initialFrames[0].changes.circle,id:'empty',fill:false},patch=styleSelection([empty],'color','#aabbcc');assert.equal({...empty,...patch.empty}.fill,false);
});
test('zoom adds exactly three finer grid levels and snaps to the visible subdivisions',()=>{
 for(const[zoom,level,spacing]of[[1,0,80],[1.24,0,80],[1.25,1,40],[1.74,1,40],[1.75,2,20],[2.49,2,20],[2.5,3,10],[16,3,10]]){assert.equal(gridLevel(zoom),level);assert.equal(gridSpacing(zoom),spacing);close(snapEndpoint([],{x:spacing+1,y:spacing-1},'new',1,true,spacing).point,{x:spacing,y:spacing})}
 for(const zoom of [.4,.99,1.24,1.25,1.26,1.74,1.75,1.76,2.49,2.5,2.51,4,8,16]){const width=390,base=startingGridScale(width),v=alignCamera({w:width,h:650},base,zoom,{x:71,y:-133}),step=gridSpacing(v.zoom)*base*v.zoom;for(const n of[v.pan.x/step,v.pan.y/step,(width-v.pan.x)/step])assert.ok(Math.abs(n-Math.round(n))<1e-8);assert.ok(v.zoom>=.4&&v.zoom<=MAX_ZOOM)}
});
test('grouping retains earlier frames and transfers future member edits into a local timeline',()=>{
 const frames=structuredClone(initialFrames),group=groupIntoSymbol(frames,1,['circle','square'],ids(),.7,'linear');assert.deepEqual(group.frames[0],frames[0]);
 for(let i=1;i<frames.length;i++){const outer=resolveShapes(group.frames,i);assert.ok(!outer.some(s=>['circle','square'].includes(s.id)));const instance=outer.find(s=>s.id===group.instance.id),children=resolveShapes(group.definition.frames,i-1);for(const child of children){const original=resolveShapes(frames,i).find(s=>s.id===child.id);close({x:child.x+instance.x,y:child.y+instance.y},original);assert.equal(child.color,original.color);assert.equal(child.rotation,original.rotation)}}
 assert.equal(group.definition.duration,.7);assert.equal(group.definition.easing,'linear');assert.equal(group.instance.timeOffset,-.7);
});
test('symbol timelines preserve color inheritance until the original explicit color change',()=>{
 const group=groupIntoSymbol(initialFrames,0,['circle'],ids());group.definition.frames[0].changes.circle.color='#112233';assert.equal(resolveShapes(group.definition.frames,1)[0].color,'#112233');assert.equal(resolveShapes(group.definition.frames,2)[0].color,'#e7aa8d');
});
test('grouped line connections remain internal and preserve resolved geometry',()=>{
 const frames=connectedScene(),group=groupIntoSymbol(frames,0,['circle','line'],ids());for(let i=0;i<2;i++){const children=resolveShapes(group.definition.frames,i),line=children.find(s=>s.id==='line'),circle=children.find(s=>s.id==='circle');assert.equal(line.startLink.id,circle.id);close(linePoint(line,0),anchorPoint(circle,line.startLink));const original=resolveShapes(frames,i).find(s=>s.id==='line');for(const key of['start','end','control']){const p=lineGeometry(line)[key];close({x:p.x+group.instance.x,y:p.y+group.instance.y},lineGeometry(original)[key])}}
});
test('copy and paste into a later frame gives new identities and preserves internal attachments',()=>{
 const scene=resolveShapes(connectedScene(),0),clipboard=copyShapes(scene,{}),pasted=pasteShapes(clipboard,ids(),0,3),frames=[{id:'a',changes:Object.fromEntries(scene.map(s=>[s.id,s]))},{id:'b',changes:Object.fromEntries(pasted.shapes.map(s=>[s.id,s]))}];
 assert.equal(resolveShapes(frames,0).length,2);assert.equal(resolveShapes(frames,1).length,4);const line=pasted.shapes.find(s=>s.type==='line'),circle=pasted.shapes.find(s=>s.type==='circle');assert.equal(line.startLink.id,circle.id);assert.notEqual(circle.id,'circle');clipboard.shapes[0].color='#abcdef';assert.notEqual(pasted.shapes[0].color,'#abcdef');
});
// A small canvas transform model checks actual nested draw coordinates and opacity.
function drawingContext(){let matrix=[1,0,0,1,0,0],alpha=1;const stack=[],drawn=[];const multiply=n=>{const[a,b,c,d,e,f]=matrix,[g,h,i,j,k,l]=n;matrix=[a*g+c*h,b*g+d*h,a*i+c*j,b*i+d*j,a*k+c*l+e,b*k+d*l+f]};const ctx={drawn,get globalAlpha(){return alpha},set globalAlpha(v){alpha=v},save(){stack.push({matrix:[...matrix],alpha})},restore(){({matrix,alpha}=stack.pop())},setTransform(...m){matrix=m},transform(...m){multiply(m)},translate(x,y){multiply([1,0,0,1,x,y])},rotate(a){multiply([Math.cos(a),Math.sin(a),-Math.sin(a),Math.cos(a),0,0])},scale(x,y){multiply([x,0,0,y,0,0])},ellipse(x,y){drawn.push({x:matrix[0]*x+matrix[2]*y+matrix[4],y:matrix[1]*x+matrix[3]*y+matrix[5],alpha})},beginPath(){},moveTo(){},lineTo(){},quadraticCurveTo(){},setLineDash(){},fill(){},stroke(){},fillRect(){}};return ctx}
function nestedScene(){const leaf={...initialFrames[0].changes.circle,id:'leaf',x:0,y:0,w:20,h:20,opacity:.5,rotation:0},child={...leaf,id:'child',type:'symbol',symbolId:'inner',x:10,y:20,w:100,h:100,opacity:.5,timeOffset:0},outer={...child,id:'outer',symbolId:'outer-def',x:100,y:200,w:200,h:200,opacity:.5};return{outer,symbols:{inner:{id:'inner',width:100,height:100,duration:1,easing:'linear',frames:[{id:'i0',changes:{leaf}},{id:'i1',changes:{leaf:{x:100}}}]},'outer-def':{id:'outer-def',width:100,height:100,duration:1,easing:'linear',frames:[{id:'o0',changes:{child}}]}}}}
test('nested symbols loop independent timelines and compose transforms and opacity',()=>{
 const{outer,symbols}=nestedScene();for(const[time,x]of[[0,140],[.5,240],[1,140],[1.5,240],[2,140],[2.5,240]]){const ctx=drawingContext();drawShape(ctx,outer,{symbols,time});assert.equal(ctx.drawn.length,1);close(ctx.drawn[0],{x,y:260});assert.equal(ctx.drawn[0].alpha,.125)}assert.equal(symbolCycleDuration([outer],symbols),1);
});
test('copying nested symbols snapshots all definitions and permits a finite paste into their own scope',()=>{
 const{outer,symbols}=nestedScene(),clipboard=copyShapes([outer],symbols),pasted=pasteShapes(clipboard,ids(),0,3);assert.equal(Object.keys(pasted.symbols).length,2);assert.notEqual(pasted.shapes[0].symbolId,outer.symbolId);assert.equal(pasted.shapes[0].timeOffset,-3);
 const outerCopy=pasted.symbols[pasted.shapes[0].symbolId],innerId=resolveShapes(outerCopy.frames,0)[0].symbolId;assert.ok(pasted.symbols[innerId]);assert.notEqual(innerId,'inner');symbols.inner.frames[0].changes.leaf.color='#123456';assert.notEqual(pasted.symbols[innerId].frames[0].changes.leaf.color,'#123456');
 const project={frames:[{id:'root',changes:{outer}}],symbols,duration:1,easing:'linear'},updated=updateTimeline(project,'inner',{frames:[{id:'paste',changes:Object.fromEntries(pasted.shapes.map(s=>[s.id,s]))}]});updated.symbols={...updated.symbols,...pasted.symbols};assert.equal(timelineOf(updated,null).frames,project.frames);const ctx=drawingContext();drawShape(ctx,outer,{symbols:updated.symbols,time:3.5});assert.equal(ctx.drawn.length,1);
});
test('movie rendering and duration include nested animation on a one-frame main timeline',()=>{
 const{outer,symbols}=nestedScene(),frames=[{id:'root',changes:{outer}}],ctx=drawingContext(),canvas={width:960,height:960,getContext:()=>ctx},view={width:960,height:960,scale:1,origin:{x:0,y:0}};
 assert.equal(movieDuration(1,1,true,symbols,frames),1);createMovieRenderer({canvas,view,frames,symbols,duration:1,loop:true,easing:'linear'})(.5);close(ctx.drawn[0],{x:240,y:260});
});

import {lineHandles} from '../lib/animation.js';
import {strokeDash,STROKE_STYLES} from '../lib/defaults.js';
import {reorderSelection,isGroupSelection} from '../lib/editing.js';
import {centerCamera} from '../lib/view.js';
test('straight lines stay straight while endpoints move and only expose two handles',()=>{
 const straight={...lineForPoints,lineKind:'straight',rotation:25},before=lineGeometry(straight);
 assert.deepEqual(Object.keys(lineHandles(straight)),['start','end']);close(linePoint(straight,.5),{x:(before.start.x+before.end.x)/2,y:(before.start.y+before.end.y)/2});
 const changes=moveParts([straight],[],{points:['end']},80,40),moved={...straight,...changes.points},geometry=lineGeometry(moved);close(geometry.start,before.start);close(geometry.end,{x:before.end.x+80,y:before.end.y+40});close(linePoint(moved,.5),{x:(geometry.start.x+geometry.end.x)/2,y:(geometry.start.y+geometry.end.y)/2});
 const flat={...straight,rotation:0};assert.deepEqual(boxSelectParts([flat],{x:75,y:115},{x:85,y:125}),{ids:[],points:{}});assert.deepEqual(boxSelectParts([flat],{x:75,y:-5},{x:85,y:5}),{ids:[],points:{}});
});
test('Bézier curves retain their independent bend handle and straight lines accept shape connections',()=>{
 const curve={...lineForPoints,lineKind:'bezier'};assert.deepEqual(Object.keys(lineHandles(curve)),['start','end','control']);assert.equal(linePoint(curve,.5).y,60);
 const fs=connectedScene();fs[0].changes.line.lineKind='straight';for(const t of[0,.5,1]){const scene=interpolateShapes(fs,t),line=scene.find(s=>s.id==='line'),circle=scene.find(s=>s.id==='circle'),geometry=lineGeometry(line);close(geometry.start,anchorPoint(circle,line.startLink));close(linePoint(line,.5),{x:(geometry.start.x+geometry.end.x)/2,y:(geometry.start.y+geometry.end.y)/2})}
});
test('stroke patterns render on shapes and both line types, reset for solid, and survive copying',()=>{
 assert.deepEqual(STROKE_STYLES.map(([key])=>key),['solid','dashed','dotted','dash-dot']);assert.deepEqual(strokeDash('solid',4),[]);assert.deepEqual(strokeDash('dashed',4),[16,12]);assert.deepEqual(strokeDash('dotted',4),[0,10]);assert.deepEqual(strokeDash('dash-dot',4),[16,8,0,8]);
 for(const type of['circle','rect','line'])for(const style of STROKE_STYLES.map(([key])=>key)){
  const calls=[],ctx=new Proxy({},{get:(_,key)=>(...args)=>calls.push([key,...args]),set:()=>true}),shape={...lineForPoints,type,strokeStyle:style,lineKind:'straight'};
  drawShape(ctx,shape);assert.deepEqual(calls.find(c=>c[0]==='setLineDash')[1],strokeDash(style,shape.stroke));if(type==='line'){assert.ok(calls.some(c=>c[0]==='lineTo'));assert.ok(!calls.some(c=>c[0]==='quadraticCurveTo'))}
  const pasted=pasteShapes(copyShapes([shape],{}),ids()).shapes[0];assert.equal(pasted.strokeStyle,style);assert.equal(pasted.lineKind,'straight');assert.equal(newShapeStyle(type,{...DEFAULT_STYLE,strokeStyle:style}).strokeStyle,style);
 }
});
test('stroke pattern changes inherit through frames and apply to every selected shape',()=>{
 const fs=structuredClone(initialFrames),scene=resolveShapes(fs,0);for(const[id,patch]of Object.entries(styleSelection(scene,'strokeStyle','dashed')))fs[0].changes[id]={...fs[0].changes[id],...patch};fs[2].changes.circle.strokeStyle='dotted';
 assert.ok(resolveShapes(fs,1).every(s=>s.strokeStyle==='dashed'));assert.equal(resolveShapes(fs,2).find(s=>s.id==='circle').strokeStyle,'dotted');assert.equal(resolveShapes(fs,2).find(s=>s.id==='line').strokeStyle,'dashed');
});
test('layer arrows move a selection one step and preserve relative order and inheritance',()=>{
 const shapes=Array.from({length:5},(_,i)=>({...initialFrames[0].changes.circle,id:String(i),z:i})),frames=[{id:'a',changes:Object.fromEntries(shapes.map(s=>[s.id,s]))},{id:'b',changes:{}}];
 frames[1].changes=reorderSelection(shapes,['1','2'],'up');assert.deepEqual(resolveShapes(frames,1).map(s=>s.id),['0','3','1','2','4']);assert.deepEqual(resolveShapes(frames,0).map(s=>s.id),['0','1','2','3','4']);
 frames.push({id:'c',changes:{'0':{color:'#112233'}}});assert.deepEqual(resolveShapes(frames,2).map(s=>s.id),['0','3','1','2','4']);
 frames[2].changes={...frames[2].changes,...reorderSelection(resolveShapes(frames,1),['1','2'],'down')};assert.deepEqual(resolveShapes(frames,2).map(s=>s.id),['0','1','2','3','4']);assert.deepEqual(reorderSelection(shapes,['4'],'up'),{});assert.deepEqual(reorderSelection(shapes,['0'],'down'),{});
});
test('multi-selection drag mode includes mixed objects and points without counting a point twice',()=>{
 assert.equal(isGroupSelection(['a','b'],{}),true);assert.equal(isGroupSelection([],{a:['start','end']}),true);assert.equal(isGroupSelection(['a'],{b:['control']}),true);assert.equal(isGroupSelection(['a'],{a:['start','end']}),false);assert.equal(isGroupSelection([],{a:['control']}),false);
});
test('entering symbols centers graphics and fits portrait and landscape cameras',()=>{
 for(const size of[{w:390,h:650},{w:844,h:230}])for(const bounds of[{left:-300,top:150,right:900,bottom:750},{left:2,top:2,right:162,bottom:162}]){
  const base=startingGridScale(size.w),camera=centerCamera(size,base,bounds),scale=base*camera.zoom;close({x:camera.pan.x+(bounds.left+bounds.right)*scale/2,y:camera.pan.y+(bounds.top+bounds.bottom)*scale/2},{x:size.w/2,y:size.h/2});assert.ok((bounds.right-bounds.left)*scale<size.w);assert.ok((bounds.bottom-bounds.top)*scale<size.h);
 }
 assert.deepEqual(centerCamera({w:390,h:650},startingGridScale(390),null),{zoom:1,pan:{x:0,y:0}});
});

import {DRAFT_KEY,serializeAnimation,parseAnimation,loadDraft,saveDraft,downloadAnimation} from '../lib/project-storage.js';
function savedAnimation(){const{outer,symbols}=nestedScene();return{project:{frames:[{id:'root',changes:{outer}},{id:'later',changes:{outer:{x:450}}}],symbols,duration:.7,easing:'linear'},preferences:{snap:false,grid:false,loop:false,movieFps:60,drawingStyle:{...DEFAULT_STYLE,fill:true,strokeStyle:'dash-dot',color:'#123456'}},editor:{scope:'inner',path:[{scope:null,frame:1,zoom:2,pan:{x:30,y:40}},{scope:'outer-def',frame:0,zoom:3,pan:{x:100,y:90}}],frame:1,zoom:4,pan:{x:10,y:20}}}}
function memoryStorage(initial={}){const data=new Map(Object.entries(initial));return{data,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)}}
test('JSON round trip keeps the complete project, nested timelines, preferences and active symbol view',()=>{
 const state=savedAnimation(),raw=serializeAnimation(state,true),restored=parseAnimation(raw);assert.deepEqual(restored,state);assert.equal(JSON.parse(raw).format,'procedural-animation');assert.equal(JSON.parse(raw).version,1);assert.ok(raw.includes('\n  "project"'));
 for(let i=0;i<state.project.frames.length;i++)assert.deepEqual(resolveShapes(restored.project.frames,i),resolveShapes(state.project.frames,i));assert.equal(restored.project.symbols.inner.frames.length,2);
});
test('automatic local saves restore the most recent edits and a fresh browser starts blank',()=>{
 const storage=memoryStorage(),state=savedAnimation();assert.deepEqual(loadDraft(storage),{state:null,canSave:true,notice:''});saveDraft(storage,state);assert.deepEqual(loadDraft(storage).state,state);
 state.project.symbols.inner.frames[1].changes.leaf.strokeStyle='dotted';state.project.frames[1].changes.outer.x=720;saveDraft(storage,state);const loaded=loadDraft(storage);assert.equal(loaded.state.project.symbols.inner.frames[1].changes.leaf.strokeStyle,'dotted');assert.equal(resolveShapes(loaded.state.project.frames,1)[0].x,720);assert.equal(storage.data.size,1);
});
test('loading saved attachments preserves frame geometry but makes later edits independent',()=>{
 const state=savedAnimation();state.project.frames=connectedScene();state.project.frames[0].changes.line.lineKind='straight';state.project.frames[0].changes.line.strokeStyle='dashed';state.project.frames[1].changes.line={z:5};state.editor={scope:null,path:[],frame:1,zoom:1,pan:{x:0,y:0}};
 const restored=parseAnimation(serializeAnimation(state));
 for(let i=0;i<state.project.frames.length;i++){const before=resolveShapes(state.project.frames,i).find(s=>s.id==='line'),after=resolveShapes(restored.project.frames,i).find(s=>s.id==='line');for(const key of ['start','end','control'])close(lineGeometry(after)[key],lineGeometry(before)[key]);assert.ok(!after.startLink&&!after.endLink)}
 const line=resolveShapes(restored.project.frames,1).find(s=>s.id==='line');assert.equal(line.lineKind,'straight');assert.equal(line.strokeStyle,'dashed');assert.equal(line.z,5);
 restored.project.frames[1].changes.circle.x+=500;assert.deepEqual(lineGeometry(resolveShapes(restored.project.frames,1).find(s=>s.id==='line')),lineGeometry(line));
});
test('malformed or unsupported drafts are preserved before a new save can replace them',()=>{
 for(const raw of['{broken',JSON.stringify({format:'procedural-animation',version:99,project:{}}),JSON.stringify({format:'procedural-animation',version:1,project:{frames:[]}})]){const storage=memoryStorage({[DRAFT_KEY]:raw}),loaded=loadDraft(storage);assert.equal(loaded.state,null);assert.equal(loaded.canSave,true);assert.ok(loaded.notice);assert.equal(storage.getItem(DRAFT_KEY),raw);assert.equal(storage.getItem(DRAFT_KEY+'.recovery'),raw);saveDraft(storage,savedAnimation());assert.equal(storage.getItem(DRAFT_KEY+'.recovery'),raw);assert.deepEqual(loadDraft(storage).state,savedAnimation())}
});
test('storage errors preserve the previous draft and allow independent JSON export',()=>{
 const previous=serializeAnimation(savedAnimation()),storage={getItem:()=>previous,setItem(){throw new DOMException('full','QuotaExceededError')}};assert.deepEqual(loadDraft(storage).state,savedAnimation());assert.throws(()=>saveDraft(storage,savedAnimation()),{name:'QuotaExceededError'});assert.equal(storage.getItem(DRAFT_KEY),previous);assert.ok(serializeAnimation(savedAnimation(),true));
 assert.equal(loadDraft({...storage,getItem:()=>'{broken'}).canSave,false);assert.ok(loadDraft({getItem(){throw new Error('blocked')}}).notice);
});
test('restore validates drawing data and recovers harmless view and preference values',()=>{
 const state=savedAnimation();state.preferences={movieFps:12.3,drawingStyle:{color:'invalid',stroke:400},snap:'bad'};state.editor={scope:'missing',path:[{scope:'missing'}],frame:500,zoom:Infinity,pan:{x:'bad',y:40}};
 const restored=parseAnimation(serializeAnimation(state));assert.equal(restored.preferences.movieFps,30);assert.equal(restored.preferences.drawingStyle.color,'#000000');assert.equal(restored.preferences.drawingStyle.stroke,80);assert.equal(restored.preferences.snap,true);assert.deepEqual(restored.editor,{scope:null,path:[],frame:1,zoom:1,pan:{x:0,y:40}});
 for(const corrupt of[project=>project.frames[0].changes.outer.x='not a number',project=>project.symbols.inner.frames[0].changes.leaf.color='bad',project=>project.symbols.inner.width=0,project=>project.symbols.inner.frames[0].changes.leaf={...project.frames[0].changes.outer,symbolId:'inner'}]){const broken=savedAnimation();corrupt(broken.project);assert.throws(()=>parseAnimation(serializeAnimation(broken)))}
});
test('JSON download provides a readable complete project file and releases its object URL',async()=>{
 const original={document:Object.getOwnPropertyDescriptor(globalThis,'document'),setTimeout:globalThis.setTimeout,create:URL.createObjectURL,revoke:URL.revokeObjectURL};let blob,clicked=0,removed=0,cleanup,revoked,link;
 try{globalThis.document={body:{appendChild:node=>link=node},createElement:()=>({style:{},click:()=>clicked++,remove:()=>removed++})};globalThis.setTimeout=callback=>{cleanup=callback};URL.createObjectURL=value=>{blob=value;return'blob:test-json'};URL.revokeObjectURL=value=>revoked=value;
  downloadAnimation(savedAnimation());assert.equal(blob.type,'application/json');assert.deepEqual(parseAnimation(await blob.text()),savedAnimation());assert.match(link.download,/^animation-.*\.json$/);assert.equal(link.href,'blob:test-json');assert.equal(clicked,1);assert.equal(removed,1);cleanup();assert.equal(revoked,'blob:test-json');
 }finally{if(original.document)Object.defineProperty(globalThis,'document',original.document);else delete globalThis.document;globalThis.setTimeout=original.setTimeout;URL.createObjectURL=original.create;URL.revokeObjectURL=original.revoke}
});

import {copyLinkedShapes,canLinkSymbols,breakSymbol} from '../lib/symbols.js';
import {symbolLocalBounds} from '../lib/editing.js';
import {symbolMatrix,multiply,IDENTITY,transformPoint,tintColor} from '../lib/matrix.js';
import {localToWorld,worldToLocal} from '../lib/animation.js';
test('symbol bounds follow current nested content instead of the original definition rectangle',()=>{
 const{outer,symbols}=nestedScene();symbols.inner.frames[0].changes.leaf.stroke=0;
 const a=shapeBounds(outer,{symbols,time:0}),b=shapeBounds(outer,{symbols,time:.5});assert.deepEqual(a,{left:120,right:160,top:240,bottom:280});assert.deepEqual(b,{left:220,right:260,top:240,bottom:280});
 assert.deepEqual(symbolLocalBounds(outer,symbols,.5),{left:120,right:160,top:40,bottom:80});symbols.inner.frames[1].changes.leaf.w=100;assert.equal(shapeBounds(outer,{symbols,time:.5}).right,340);
 assert.deepEqual(boxSelectParts([outer],{x:330,y:245},{x:335,y:260},{symbols,time:.5}).ids,['outer']);assert.deepEqual(boxSelectParts([outer],{x:105,y:205},{x:110,y:210},{symbols,time:.5}).ids,[]);
});
test('symbol tint preserves colors at white and multiplies nested tint without changing shared definitions',()=>{
 assert.equal(tintColor('#123abc','#ffffff'),'#123abc');assert.equal(tintColor('#ffffff','#80ff40'),'#80ff40');assert.equal(tintColor('#808080','#ff8000'),'#804000');
 const{outer,symbols}=nestedScene();outer.tint='#ff8000';symbols['outer-def'].frames[0].changes.child.tint='#80ffff';symbols.inner.frames[0].changes.leaf.color='#ffffff';const styles=[],ctx=new Proxy({},{get:()=>()=>{},set:(_,key,value)=>{if(key==='fillStyle')styles.push(value);return true}});drawShape(ctx,outer,{symbols,time:0});assert.equal(styles.at(-1),'#808000');assert.equal(symbols.inner.frames[0].changes.leaf.color,'#ffffff');
 const frames=[{id:'a',changes:{outer:{...outer,tint:'#ffffff'}}},{id:'b',changes:{outer:{tint:'#000000'}}}];assert.equal(interpolateShapes(frames,.5,'linear')[0].tint,'#808080');
});
test('linked copies share symbol data while normal pasted copies keep independent definitions',()=>{
 const{outer,symbols}=nestedScene(),linked=pasteShapes(copyLinkedShapes([outer]),ids(),80,0,{symbols,scope:null}),independent=pasteShapes(copyShapes([outer],symbols),ids(),80,0);
 assert.equal(linked.shapes[0].symbolId,outer.symbolId);assert.deepEqual(linked.symbols,{});assert.notEqual(independent.shapes[0].symbolId,outer.symbolId);symbols.inner.frames[0].changes.leaf.x=250;
 const original=drawingContext(),copy=drawingContext(),separate=drawingContext();drawShape(original,outer,{symbols,time:0});drawShape(copy,linked.shapes[0],{symbols,time:0});drawShape(separate,independent.shapes[0],{symbols:independent.symbols,time:0});close(copy.drawn[0],{x:original.drawn[0].x+80,y:original.drawn[0].y+80});assert.notEqual(separate.drawn[0].x,copy.drawn[0].x);
});
test('linked symbols cannot create self references directly or through a descendant',()=>{
 const{outer,symbols}=nestedScene();assert.equal(canLinkSymbols([outer],symbols,null),true);assert.equal(canLinkSymbols([outer],symbols,'outer-def'),false);assert.equal(canLinkSymbols([outer],symbols,'inner'),false);
 assert.throws(()=>pasteShapes(copyLinkedShapes([outer]),ids(),0,0,{symbols,scope:'inner'}),/cannot be pasted/);assert.equal(canLinkSymbols([{...outer,symbolId:'missing'}],symbols,null),false);
});
test('break-apart preserves nested transforms, opacity, tint and earlier frames',()=>{
 const{outer,symbols}=nestedScene();Object.assign(outer,{rotation:35,w:270,h:150,tint:'#80ff80',matrix:[1,.2,.1,1,40,30]});const frames=[{id:'before',changes:{outer}},{id:'break',changes:{}},{id:'after',changes:{outer:{visible:true,x:700}}}],broken=breakSymbol(frames,1,outer,symbols,ids(),.5);
 assert.deepEqual(broken.frames[0],frames[0]);for(const i of[1,2])assert.ok(!resolveShapes(broken.frames,i).some(s=>s.id==='outer'));assert.equal(broken.graphics.length,1);assert.equal(broken.graphics[0].symbolId,'inner');assert.equal(broken.graphics[0].tint,'#80ff80');
 const before=drawingContext(),after=drawingContext();drawShape(before,outer,{symbols,time:.5});for(const s of resolveShapes(broken.frames,1))drawShape(after,s,{symbols,time:.5});close(after.drawn[0],before.drawn[0]);assert.equal(after.drawn[0].alpha,before.drawn[0].alpha);
});
test('break-apart reconnects graphics internally and preserves rotated, stretched geometry',()=>{
 const original=connectedScene(),group=groupIntoSymbol(original,0,['circle','line'],ids()),instance={...group.instance,w:group.instance.w*1.7,h:group.instance.h*.6,rotation:40,tint:'#ff8040'},symbols={[group.definition.id]:group.definition},frames=[{id:'parent',changes:{[instance.id]:instance}}],broken=breakSymbol(frames,0,instance,symbols,()=>`apart-${Math.random()}`,0),scene=resolveShapes(broken.frames,0),circle=scene.find(s=>s.type==='circle'),line=scene.find(s=>s.type==='line');
 assert.equal(line.startLink.id,circle.id);close(linePoint(line,0),anchorPoint(circle,line.startLink));const children=resolveShapes(group.definition.frames,0),matrix=symbolMatrix(instance,group.definition);for(const key of['start','end','control'])close(lineGeometry(line)[key],transformPoint(matrix,lineGeometry(children.find(s=>s.type==='line'))[key]));
 for(const point of[{x:0,y:0},{x:circle.w,y:circle.h},{x:50,y:40}])close(worldToLocal(circle,localToWorld(circle,point)),point);
 const moved=resolveConnections(scene.map(s=>({...s,...moveSelection(scene,30,-10)[s.id]})));close(linePoint(moved.find(s=>s.type==='line'),0),anchorPoint(moved.find(s=>s.type==='circle'),line.startLink));
 const regroup=groupIntoSymbol(broken.frames,0,scene.map(s=>s.id),()=>`again-${Math.random()}`,1,'linear',symbols),before=drawingContext(),after=drawingContext();drawShape(before,circle);drawShape(after,regroup.instance,{symbols:{...symbols,[regroup.definition.id]:regroup.definition},time:0});close(after.drawn[0],before.drawn[0]);
});
test('locked objects cannot enter box selections or be moved by whole-object or point edits',()=>{
 const circle={...initialFrames[0].changes.circle,id:'locked-circle',locked:true},line={...lineForPoints,locked:true},free={...circle,id:'free',locked:false};assert.deepEqual(boxSelectParts([circle,line,free],{x:-1000,y:-1000},{x:2000,y:2000}),{ids:['free'],points:{}});assert.deepEqual(moveSelection([circle,line],80,40),{});assert.deepEqual(moveParts([line],[],{points:['start','control']},80,40),{});assert.equal(partsBounds([line],[],{points:['start']}),null);
});
test('fill and stroke switches are independent and remembered without discarding stroke width',()=>{
 for(const[fill,strokeVisible,expectedFill,expectedStroke]of[[true,false,true,false],[false,true,false,true],[false,false,false,false],[true,true,true,true]]){const calls=[],ctx=new Proxy({},{get:(_,key)=>(...args)=>calls.push(key),set:()=>true}),shape={...initialFrames[0].changes.circle,fill,strokeVisible};drawShape(ctx,shape);assert.equal(calls.includes('fill'),expectedFill);assert.equal(calls.includes('stroke'),expectedStroke);assert.equal(newShapeStyle('rect',{...DEFAULT_STYLE,fill,strokeVisible}).strokeVisible,strokeVisible)}
 const shape={...initialFrames[0].changes.circle,id:'circle',strokeVisible:false};assert.equal({...shape,...styleSelection([shape],'stroke',20).circle}.strokeVisible,false);
});
test('JSON save and load retain linked symbol identity, tint, locks and transformed graphics',()=>{
 const state=savedAnimation(),outer=state.project.frames[0].changes.outer;outer.tint='#80ff80';outer.locked=true;outer.matrix=[1,.2,.3,1,20,30];state.project.frames[0].changes.linked={...outer,id:'linked',x:600};state.preferences.drawingStyle.strokeVisible=false;
 const restored=parseAnimation(serializeAnimation(state));assert.deepEqual(restored,state);assert.equal(restored.project.frames[0].changes.linked.symbolId,restored.project.frames[0].changes.outer.symbolId);assert.equal(restored.preferences.drawingStyle.strokeVisible,false);
});

import {parseStrokeWidth} from '../lib/defaults.js';
import {rotationControl,rotationAngle,rotateShape} from '../lib/rotation.js';
test('stroke entry defaults to eight for blank or invalid input, keeping valid zero and decimals',()=>{
 assert.equal(DEFAULT_STYLE.stroke,8);assert.equal(newShapeStyle('line').stroke,8);
 for(const value of['',' ','-','abc','NaN','Infinity','-1','81',null,undefined])assert.equal(parseStrokeWidth(value),8);
 for(const[value,expected]of[['0',0],['0.5',.5],['12.',12],[' 16 ',16],['80',80]])assert.equal(parseStrokeWidth(value),expected);
});
test('rotation keeps shape center fixed and interpolates without shrinking geometry',()=>{
 const s={...initialFrames[0].changes.circle,type:'rect',id:'turn',rotation:0},center=localToWorld(s,{x:s.w/2,y:s.h/2}),patch=rotateShape(s,center,90),turned={...s,...patch};
 close(localToWorld(turned,{x:s.w/2,y:s.h/2}),center);assert.equal(turned.rotation,90);
 const fs=[{id:'a',changes:{turn:s}},{id:'b',changes:{turn:patch}},{id:'c',changes:{}}],mid=interpolateShapes(fs,.5,'linear')[0];assert.equal(mid.rotation,45);assert.equal(mid.w,s.w);assert.equal(mid.h,s.h);assert.equal(resolveShapes(fs,2)[0].rotation,90);
});
test('rotation uses symbol content center and a fixed screen gap at every zoom',()=>{
 const{outer,symbols}=nestedScene(),scene={symbols,time:.5},control=rotationControl(outer,.4,scene),pivot=worldToLocal(outer,control.center);
 assert.ok(Math.abs(Math.hypot(control.handle.x-control.base.x,control.handle.y-control.base.y)-85)<1e-8);const zoomed=rotationControl(outer,2,scene);assert.ok(Math.abs(Math.hypot(zoomed.handle.x-zoomed.base.x,zoomed.handle.y-zoomed.base.y)-17)<1e-8);
 const rotated={...outer,...rotateShape(outer,control.center,67)};close(localToWorld(rotated,pivot),control.center);assert.equal(rotated.symbolId,outer.symbolId);close(rotationControl(rotated,.4,scene).center,control.center);
});
test('rotation preserves affine transforms and uses pointer angles in their parent coordinates',()=>{
 const s={...initialFrames[0].changes.circle,matrix:[2,.5,.3,1.5,70,-25],rotation:30},pivot={x:20,y:30},center=localToWorld(s,pivot),rotated={...s,...rotateShape(s,center,90)};
 close(localToWorld(rotated,pivot),center);assert.deepEqual(rotated.matrix,s.matrix);
 const parentCenter={x:s.x+s.w/2,y:s.y+s.h/2},worldCenter=transformPoint(s.matrix,parentCenter),point=transformPoint(s.matrix,{x:parentCenter.x,y:parentCenter.y+20});assert.ok(Math.abs(rotationAngle(s,worldCenter,point)-Math.PI/2)<1e-10);assert.deepEqual(rotateShape({...s,locked:true},center,90),{});
});
test('rotated lines keep attached endpoints constrained while their free geometry changes',()=>{
 const fs=connectedScene(),scene=resolveShapes(fs,0),line=scene.find(s=>s.type==='line'),control=rotationControl(line,1);fs[1].changes.line=rotateShape(line,control.center,45);
 const result=resolveShapes(fs,1),l=result.find(s=>s.id==='line'),circle=result.find(s=>s.id==='circle');close(linePoint(l,0),anchorPoint(circle,l.startLink));assert.notDeepEqual(linePoint(l,1),linePoint(line,1));
});

import {detachProject} from '../lib/attachments.js';
test('rotation handle turns with the shape and stays exactly at the active touch',()=>{
 const s={...initialFrames[0].changes.circle,type:'rect',rotation:0},original=rotationControl(s,1),rotated={...s,...rotateShape(s,original.center,90)},turned=rotationControl(rotated,1);
 close(turned.center,original.center);close(turned.handle,{x:original.center.x-(original.handle.y-original.center.y),y:original.center.y});
 for(const pointer of [{x:25,y:78},{x:-120,y:140},{x:900,y:-60}])close(rotationControl(rotated,1,{},pointer).handle,pointer);
});
test('legacy attachments in nested shared symbols are detached once and retain all frame positions',()=>{
 const state=savedAnimation(),frames=connectedScene();state.project.symbols.inner.frames=frames;
 const migrated=detachProject(state.project);assert.equal(state.project.symbols.inner.frames[0].changes.line.startLink.id,'circle');
 for(let i=0;i<frames.length;i++)for(const key of ['start','end','control'])close(lineGeometry(resolveShapes(migrated.symbols.inner.frames,i).find(s=>s.id==='line'))[key],lineGeometry(resolveShapes(frames,i).find(s=>s.id==='line'))[key]);
 assert.equal(migrated.frames[0].changes.outer.symbolId,state.project.frames[0].changes.outer.symbolId);assert.deepEqual(detachProject(migrated),migrated);assert.ok(!JSON.stringify(migrated.symbols.inner.frames).includes('startLink'));
});
test('snapping to circle or line positions never creates an attachment',()=>{
 const scene=resolveShapes(connectedScene(),0);
 for(const point of [{x:0,y:52},{x:252,y:51}]){const snapped=snapEndpoint(scene,point,'new',1,true);assert.equal(snapped.kind,'shape');assert.equal(snapped.link,null)}
});

import {frameStart,frameSeconds,timelinePosition,timelineSeconds} from '../lib/timing.js';
import {symbolIsShared,unlinkSymbolInstance} from '../lib/symbols.js';
test('frame multipliers determine transition progress, total time and an abrupt loop boundary',()=>{
 const frames=structuredClone(initialFrames);frames[0].timeMultiplier=.5;frames[1].timeMultiplier=.25;frames[2].timeMultiplier=.125;
 assert.equal(frameStart(frames,2,2),1.5);assert.equal(timelineSeconds(frames,2),1.5);assert.equal(frameSeconds(frames[2],2),.25);assert.equal(timelinePosition(frames,.5,2),.5);assert.equal(timelinePosition(frames,1.25,2),1.5);assert.equal(timelinePosition(frames,1.5,2),0);
 const first=resolveShapes(frames,0);assert.deepEqual(interpolateShapes(frames,timelinePosition(frames,1.5,2),'linear',true),first);assert.equal(movieDuration(frames.length,2,true,{},frames),1.5);
 const reordered=reorderFrames(frames,0,2);assert.equal(reordered[2].timeMultiplier,.5);
});
test('frame multipliers persist through saving, grouping, and independent symbol copies',()=>{
 const state=savedAnimation();state.project.frames[0].timeMultiplier=.25;state.project.symbols.inner.frames[0].timeMultiplier=.125;state.editor.path[0].instanceId='outer';
 assert.deepEqual(parseAnimation(serializeAnimation(state)),state);
 const frames=structuredClone(initialFrames);frames[0].timeMultiplier=.5;const grouped=groupIntoSymbol(frames,0,['circle'],ids());assert.equal(grouped.definition.frames[0].timeMultiplier,.5);
 const pasted=pasteShapes(copyShapes([state.project.frames[0].changes.outer],state.project.symbols),ids());assert.ok(Object.values(pasted.symbols).some(s=>s.frames[0].timeMultiplier===.125));
});
test('nested symbol playback and movie exports use frame multipliers and restart immediately',()=>{
 const{outer,symbols}=nestedScene();symbols.inner.frames[0].timeMultiplier=.5;symbols.inner.frames[1].timeMultiplier=.25;
 for(const[time,x]of[[.25,240],[.5,140],[.7,220],[.75,240]]){const ctx=drawingContext();drawShape(ctx,outer,{symbols,time});close(ctx.drawn[0],{x,y:260})}
 const frames=[{id:'root',timeMultiplier:.25,changes:{outer}}];assert.equal(movieDuration(1,1,true,symbols,frames),.5);
 const ctx=drawingContext(),canvas={width:960,height:960,getContext:()=>ctx},view={width:960,height:960,scale:1,origin:{x:0,y:0}};createMovieRenderer({canvas,view,frames,symbols,duration:1,easing:'linear',loop:true})(.25);close(ctx.drawn[0],{x:240,y:260});
});
test('unlinking a shared symbol changes only that instance and deeply isolates nested edits',()=>{
 const{outer,symbols}=nestedScene(),other={...outer,id:'other',x:500},project={frames:[{id:'one',changes:{outer,other}},{id:'two',changes:{outer:{x:300}}}],symbols,duration:1,easing:'linear'};
 assert.equal(symbolIsShared(project,outer.symbolId),true);const detached=unlinkSymbolInstance(project,null,'other',outer.symbolId,ids());assert.ok(detached);assert.notEqual(detached.scope,outer.symbolId);assert.equal(symbolIsShared(detached.project,detached.scope),false);
 for(let i=0;i<2;i++){const scene=resolveShapes(detached.project.frames,i);assert.equal(scene.find(s=>s.id==='other').symbolId,detached.scope);assert.equal(scene.find(s=>s.id==='outer').symbolId,outer.symbolId)}
 const innerCopy=resolveShapes(detached.project.symbols[detached.scope].frames,0)[0].symbolId;assert.notEqual(innerCopy,'inner');detached.project.symbols[innerCopy].frames[0].changes.leaf.color='#00ff00';assert.notEqual(symbols.inner.frames[0].changes.leaf.color,'#00ff00');assert.equal(resolveShapes(project.frames,0).find(s=>s.id==='other').symbolId,outer.symbolId);
 const ctx=drawingContext();drawShape(ctx,resolveShapes(detached.project.frames,0).find(s=>s.id==='other'),{symbols:detached.project.symbols,time:.5});close(ctx.drawn[0],{x:640,y:260});
});

import {brushGeometry,brushPoint} from '../lib/brush.js';
import {patchLineHandles} from '../lib/animation.js';
import {selectionControls,selectionScale,rotationMatrix,transformParts} from '../lib/selection-transform.js';
function brushShape(){return{...initialFrames[0].changes.line,id:'brush',lineKind:'brush',...brushGeometry([{x:20,y:30},{x:40,y:18},{x:60,y:50},{x:90,y:38},{x:120,y:60}])}}
test('brush strokes preserve endpoints and create a smooth editable quadratic chain',()=>{
 const s=brushShape();close(linePoint(s,0),{x:20,y:30});close(linePoint(s,1),{x:120,y:60});assert.ok(s.path.length>5);assert.equal(Object.keys(lineHandles(s)).length,s.path.length);
 for(let i=2;i<s.path.length-2;i+=2){const a=s.path[i-1],b=s.path[i],c=s.path[i+1];close({x:b.x-a.x,y:b.y-a.y},{x:c.x-b.x,y:c.y-b.y})}
 const calls=[],ctx=new Proxy({},{get:(_,key)=>(...args)=>calls.push([key,...args]),set:()=>true});drawShape(ctx,s);assert.equal(calls.filter(c=>c[0]==='quadraticCurveTo').length,(s.path.length-1)/2);
 const bounds=shapeBounds(s);for(let i=0;i<=100;i++){const p=linePoint(s,i/100);assert.ok(p.x>=bounds.left&&p.x<=bounds.right&&p.y>=bounds.top&&p.y<=bounds.bottom)}
});
test('brush control edits interpolate, box select, copy, group and save without losing the stroke',()=>{
 const s=brushShape(),handles=lineHandles(s),original=structuredClone(handles);handles.p3={x:handles.p3.x+40,y:handles.p3.y-20};const patch=patchLineHandles(s,handles),frames=[{id:'a',changes:{brush:s}},{id:'b',changes:{brush:patch}}],mid=interpolateShapes(frames,.5,'linear')[0];close(lineHandles(mid).p3,{x:(original.p3.x+handles.p3.x)/2,y:(original.p3.y+handles.p3.y)/2});close(lineHandles(mid).p0,original.p0);
 const selected=boxSelectParts([s],{x:-100,y:-100},{x:300,y:300});assert.equal(selected.points.brush.length,s.path.length);assert.deepEqual(selected.ids,[]);
 const moved={...s,...moveParts([s],[],{brush:['p3']},10,20).brush};close(lineHandles(moved).p3,{x:original.p3.x+10,y:original.p3.y+20});close(lineHandles(moved).p0,original.p0);
 const copied=pasteShapes(copyShapes([s],{}),ids()).shapes[0];assert.deepEqual(copied.path,s.path);const grouped=groupIntoSymbol(frames,0,['brush'],ids());const child=resolveShapes(grouped.definition.frames,0)[0];close(transformPoint(symbolMatrix(grouped.instance,grouped.definition),linePoint(child,.3)),linePoint(s,.3));
 const state=savedAnimation();state.project.frames=frames;state.editor={scope:null,path:[],frame:0,zoom:1,pan:{x:0,y:0}};assert.deepEqual(parseAnimation(serializeAnimation(state)).project.frames,frames);
});
test('multi-selection transforms move all objects around a shared pivot and leave locked shapes unchanged',()=>{
 const a={...initialFrames[0].changes.circle,id:'a',rotation:20},b={...a,id:'b',x:600,matrix:[1,.2,.3,1,10,20]},locked={...a,id:'locked',locked:true},shapes=[a,b,locked],center={x:350,y:150},matrix=rotationMatrix(center,90),changes=transformParts(shapes,['a','b','locked'],{},matrix,{center,degrees:90});
 assert.equal(changes.locked,undefined);assert.equal(changes.a.rotation,110);
 for(const s of [a,b])for(const p of [{x:0,y:0},{x:s.w,y:s.h},{x:30,y:40}])close(localToWorld({...s,...changes[s.id]},p),transformPoint(matrix,localToWorld(s,p)));
 const bounds=partsBounds(shapes,['a','b'],{}),controls=selectionControls(bounds,1),scaleMatrix=selectionScale(controls.bounds,'br',{x:controls.bounds.right+100,y:controls.bounds.bottom+80}),scaled=transformParts(shapes,['a','b'],{},scaleMatrix);for(const s of [a,b])close(localToWorld({...s,...scaled[s.id]},{x:0,y:0}),transformPoint(scaleMatrix,localToWorld(s,{x:0,y:0})));
});
test('selection scale and rotation transform chosen curve points without moving unselected points',()=>{
 const s=brushShape(),line={...initialFrames[0].changes.line,id:'line',lineKind:'straight'},shapes=[s,line],points={brush:['p1','p2'],line:['end']},m=rotationMatrix({x:0,y:0},45),changes=transformParts(shapes,[],points,m);
 for(const shape of shapes){const before=lineHandles(shape),after=lineHandles({...shape,...changes[shape.id]});for(const[key,p]of Object.entries(before))close(after[key],points[shape.id].includes(key)?transformPoint(m,p):p)}
});

import {selectionBounds} from '../lib/editing.js';
import {importedImage,importedAnimation} from '../lib/importing.js';
import {validImageSource,loadImage,preloadImages,imageSources,imageBitmap} from '../lib/images.js';
const testImageSource='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/F9sAAAAASUVORK5CYII=';
test('imported images preserve aspect ratio, fit the view and round-trip inside saved animation files',()=>{
 const image=importedImage({src:testImageSource,width:1200,height:600,name:'Photo'},{x:200,y:150},{w:300,h:300},ids());assert.equal(image.w,300);assert.equal(image.h,150);assert.equal(image.x,50);assert.equal(image.y,75);assert.equal(image.type,'image');
 const state=savedAnimation();state.project.frames=[{id:'first',changes:{[image.id]:image}},{id:'next',changes:{[image.id]:{x:250,rotation:90}}}];state.editor={scope:null,path:[],frame:0,zoom:1,pan:{x:0,y:0}};
 assert.deepEqual(parseAnimation(serializeAnimation(state)).project.frames,state.project.frames);const mid=interpolateShapes(state.project.frames,.5,'linear')[0];assert.equal(mid.x,150);assert.equal(mid.rotation,45);assert.equal(mid.src,testImageSource);
 assert.equal(validImageSource('https://example.com/photo.png'),false);assert.equal(validImageSource('data:image/svg+xml;base64,AAAA'),false);const broken=structuredClone(state);broken.project.frames[0].changes[image.id].src='javascript:alert(1)';assert.throws(()=>parseAnimation(serializeAnimation(broken)));
 const copied=pasteShapes(copyShapes([image],{}),ids());assert.equal(copied.shapes[0].src,testImageSource);assert.deepEqual(boxSelectParts([image],{x:40,y:60},{x:400,y:300}).ids,[image.id]);
});
test('imported animation files become independent symbols with sparse frames, timing and nested definitions intact',()=>{
 const saved=savedAnimation(),original=structuredClone(saved);saved.project.frames[0].timeMultiplier=.5;const imported=importedAnimation(saved,{x:400,y:300},2,ids()),instance=imported.shapes[0],definition=imported.symbols[instance.symbolId];
 assert.equal(instance.timeOffset,-2);assert.equal(definition.frames.length,2);assert.equal(definition.frames[0].timeMultiplier,.5);assert.notEqual(instance.symbolId,'outer-def');assert.equal(Object.keys(imported.symbols).length,3);
 for(let i=0;i<2;i++){const source=resolveShapes(saved.project.frames,i)[0],nested=resolveShapes(definition.frames,i)[0];assert.notEqual(nested.symbolId,source.symbolId);assert.equal(nested.opacity,source.opacity);assert.equal(nested.x,source.x)}
 assert.deepEqual(saved.project.symbols,original.project.symbols);assert.throws(()=>importedAnimation({project:{frames:[{id:'blank',changes:{}}],symbols:{},duration:1,easing:'linear'}},{x:0,y:0},0,ids()),/no graphics/);
});
test('animation import preserves affine resets and positions across every frame',()=>{
 const shape={...initialFrames[0].changes.circle,id:'a',matrix:[1,0,0,1,40,80]},frames=[{id:'a',changes:{a:shape}},{id:'b',changes:{a:{matrix:null,x:240}}}],saved={project:{frames,symbols:{},duration:1,easing:'linear'}},originalBounds=selectionBounds(frames.flatMap((_,i)=>resolveShapes(frames,i))),imported=importedAnimation(saved,{x:0,y:0},0,ids()),root=imported.shapes[0],definition=imported.symbols[root.symbolId];
 for(let i=0;i<2;i++){const before=resolveShapes(frames,i)[0],after=resolveShapes(definition.frames,i)[0];for(const point of[{x:0,y:0},{x:20,y:30}]){const a=localToWorld(before,point),b=localToWorld(after,point);close(b,{x:a.x-originalBounds.left,y:a.y-originalBounds.top})}}
});
test('image decoding is shared and ready before image-bearing movies can render',async()=>{
 const Original=globalThis.Image;let loads=0;globalThis.Image=class{constructor(){this.naturalWidth=2;this.naturalHeight=1}set src(value){loads++;queueMicrotask(()=>this.onload())}};
 try{const a=loadImage(testImageSource),b=loadImage(testImageSource);assert.equal(a,b);await a;const image=importedImage({src:testImageSource,width:2,height:1,name:'Photo'},{x:0,y:0},{w:10,h:10},ids()),project={frames:[{id:'f',changes:{[image.id]:image}}],symbols:{}};await preloadImages(project);assert.equal(loads,1);assert.deepEqual(imageSources(project),[testImageSource]);assert.ok(imageBitmap(testImageSource));const calls=[],ctx=new Proxy({},{get:(_,key)=>(...args)=>calls.push([key,...args]),set:()=>true});drawShape(ctx,image);assert.equal(calls.filter(call=>call[0]==='drawImage').length,1)}finally{if(Original===undefined)delete globalThis.Image;else globalThis.Image=Original}
});

import {freeformGeometry,freeformCanClose,freeformSegments,DEFAULT_SMOOTHNESS,insideFreeform,canFill} from '../lib/freeform.js';
function penShape(closed=true){const samples=[{x:20,y:30},{x:120,y:30},{x:120,y:130},{x:20,y:130},...(closed?[{x:23,y:34}]:[])];return{...initialFrames[0].changes.line,id:'pen',lineKind:'freeform',fill:false,smoothness:DEFAULT_SMOOTHNESS,...freeformGeometry(samples,1,true)}}
test('freeform pen closes near the starting point at every zoom without duplicate seam handles',()=>{
 for(const scale of [.4,1,3,8]){const samples=[{x:0,y:0},{x:100/scale,y:0},{x:100/scale,y:100/scale},{x:0,y:100/scale},{x:12/scale,y:5/scale}];assert.ok(freeformCanClose(samples,scale));const geometry=freeformGeometry(samples,scale,true),s={...penShape(),...geometry};assert.equal(s.closed,true);assert.equal(s.path.length,4);close(linePoint(s,0),linePoint(s,1));assert.equal(Object.keys(lineHandles(s)).length,4);const segments=freeformSegments(s),first=segments[0],last=segments.at(-1);close({x:first[1].x-first[0].x,y:first[1].y-first[0].y},{x:last[3].x-last[2].x,y:last[3].y-last[2].y})}
});
test('open pen strokes, taps, and short gestures stay open with finite editable geometry',()=>{
 const s=penShape(false);assert.equal(s.closed,false);close(linePoint(s,0),{x:20,y:30});close(linePoint(s,1),{x:20,y:130});for(const samples of [[],[{x:3,y:4}],[{x:3,y:4},{x:3,y:4}],[{x:0,y:0},{x:5,y:0},{x:5,y:5},{x:1,y:1}]]){const geometry=freeformGeometry(samples,1,true);assert.equal(geometry.closed,false);assert.ok(geometry.path.length>=2);assert.ok(geometry.path.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)))}
 assert.equal(freeformGeometry([{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100},{x:25,y:0}],1,true).closed,false);
});
test('smoothness adjusts curves without changing anchors or opening the seam',()=>{
 const s=penShape(),path=structuredClone(s.path),sharp={...s,smoothness:0},smooth={...s,smoothness:1};const a=linePoint(sharp,.125),b=linePoint(smooth,.125);assert.ok(Math.abs(a.y-b.y)>1);assert.deepEqual(sharp.path,smooth.path);assert.deepEqual(s.path,path);for(let i=0;i<s.path.length;i++)close(linePoint(smooth,i/s.path.length),lineHandles(smooth)['p'+i]);close(linePoint(smooth,0),linePoint(smooth,1));
});
test('freeform control points and smoothness interpolate and inherit across sparse frames',()=>{
 const s=penShape(),handles=lineHandles(s),original=structuredClone(handles);handles.p0={x:handles.p0.x-40,y:handles.p0.y+20};const edited=patchLineHandles(s,handles),frames=[{id:'a',changes:{pen:{...s,smoothness:0}}},{id:'b',changes:{pen:{...edited,smoothness:1}}},{id:'c',changes:{}}];const mid=interpolateShapes(frames,.5,'linear')[0];close(lineHandles(mid).p0,{x:original.p0.x-20,y:original.p0.y+10});close(lineHandles(mid).p1,original.p1);assert.equal(mid.smoothness,.5);close(linePoint(mid,0),linePoint(mid,1));assert.deepEqual(resolveShapes(frames,2)[0].path,edited.path);assert.equal(resolveShapes(frames,2)[0].smoothness,1);
});
test('freeform box selection, movement and affine transforms edit just selected control points',()=>{
 const s={...penShape(),rotation:30,matrix:[1,.2,.3,1,25,10]},before=lineHandles(s),p=before.p1,parts=boxSelectParts([s],{x:p.x-1,y:p.y-1},{x:p.x+1,y:p.y+1});assert.deepEqual(parts,{ids:[],points:{pen:['p1']}});const moved={...s,...moveParts([s],[],parts.points,20,-10).pen};close(lineHandles(moved).p1,{x:p.x+20,y:p.y-10});close(lineHandles(moved).p0,before.p0);const m=rotationMatrix({x:0,y:0},60),changed={...s,...transformParts([s],[],{pen:['p0','p2']},m).pen};for(const[key,point]of Object.entries(before))close(lineHandles(changed)[key],['p0','p2'].includes(key)?transformPoint(m,point):point);close(linePoint(changed,0),linePoint(changed,1));
});
test('freeform bounds enclose curved overshoot after rotation and scaling',()=>{
 const s={...penShape(),rotation:37,matrix:[1.3,.2,-.4,.8,19,-8],smoothness:1,stroke:0},bounds=shapeBounds(s);for(let i=0;i<=1000;i++){const p=linePoint(s,i/1000);assert.ok(p.x>=bounds.left-1e-8&&p.x<=bounds.right+1e-8&&p.y>=bounds.top-1e-8&&p.y<=bounds.bottom+1e-8)}
 const flat={...s,rotation:0,matrix:null},b=shapeBounds(flat);assert.ok(b.left<flat.x&&b.top<flat.y);
});
test('closed freeform shapes fill and render the same cubic outline used by playback and export',()=>{
 for(const closed of [true,false]){const s={...penShape(closed),fill:true},calls=[],ctx=new Proxy({},{get:(_,key)=>(...args)=>calls.push([key,...args]),set:()=>true});drawShape(ctx,s);assert.equal(calls.filter(c=>c[0]==='bezierCurveTo').length,s.path.length-(closed?0:1));assert.equal(calls.some(c=>c[0]==='closePath'),closed);assert.equal(calls.some(c=>c[0]==='fill'),closed);assert.equal(canFill(s),closed);assert.equal(insideFreeform(s,{x:50,y:50}),closed);assert.equal(insideFreeform(s,{x:250,y:250}),false)}
});
test('freeform copies and symbols preserve paths, smoothing, closure and saved files',()=>{
 const s=penShape(),copied=pasteShapes(copyShapes([s],{}),ids()).shapes[0];assert.deepEqual(copied.path,s.path);assert.equal(copied.closed,true);assert.equal(copied.smoothness,s.smoothness);const frames=[{id:'a',changes:{pen:s}}],grouped=groupIntoSymbol(frames,0,['pen'],ids()),child=resolveShapes(grouped.definition.frames,0)[0];for(const t of [0,.2,.5,.85,1])close(transformPoint(symbolMatrix(grouped.instance,grouped.definition),linePoint(child,t)),linePoint(s,t));const state=savedAnimation();state.project.frames=frames;state.editor={scope:null,path:[],frame:0,zoom:1,pan:{x:0,y:0}};assert.deepEqual(parseAnimation(serializeAnimation(state)).project.frames,frames);
 for(const patch of [{path:[]},{path:[{x:0,y:NaN},{x:3,y:4},{x:4,y:5}]},{smoothness:2},{closed:'yes'}]){state.project.frames=[{id:'a',changes:{pen:{...s,...patch}}}];assert.throws(()=>parseAnimation(serializeAnimation(state)))}
});

import {smoothFreeformPath} from '../lib/freeform.js';
test('post-draw smoothing removes actual anchors, visibly reduces jitter, and restores the original detail',()=>{
 const path=Array.from({length:81},(_,i)=>({x:i*5,y:i===0||i===80?0:i%2?14:-14})),original=structuredClone(path),smooth=smoothFreeformPath(path,false,1,1),medium=smoothFreeformPath(path,false,.5,1);
 assert.ok(smooth.length<path.length/4);assert.ok(medium.length<path.length);assert.ok(smooth.every(p=>Math.abs(p.y)<4));close(smooth[0],path[0]);close(smooth.at(-1),path.at(-1));
 assert.deepEqual(smoothFreeformPath(path,false,0,1),original);assert.deepEqual(path,original);assert.deepEqual(smoothFreeformPath(path,false,1,1),smooth);
});
test('closed smoothing removes and restores control points without breaking the seam or losing the shape',()=>{
 const path=Array.from({length:100},(_,i)=>{const a=i/100*Math.PI*2,r=100+(i%2?4:-4);return{x:Math.cos(a)*r,y:Math.sin(a)*r}}),smooth=smoothFreeformPath(path,true,1,1),s={...penShape(),x:0,y:0,w:200,h:200,path:smooth};assert.ok(smooth.length>=3&&smooth.length<20);close(linePoint(s,0),linePoint(s,1));assert.ok(smooth.every(p=>Math.hypot(p.x,p.y)>80));assert.deepEqual(smoothFreeformPath(path,true,0,1),path);
 const dense=freeformGeometry([...path,path[0]],1,true,0);assert.ok(dense.path.length>90);const frames=[{id:'a',changes:{pen:s}},{id:'b',changes:{pen:{path:s.path.map((p,i)=>i===1?{x:p.x+30,y:p.y-10}:p)}}}];const mid=interpolateShapes(frames,.5,'linear')[0];close(mid.path[1],{x:s.path[1].x+15,y:s.path[1].y-5});close(linePoint(mid,0),linePoint(mid,1));
});
test('post-draw point reduction is independent of zoom and handles tiny or repeated paths',()=>{
 const path=Array.from({length:61},(_,i)=>({x:i*5,y:Math.sin(i/5)*30})),base=smoothFreeformPath(path,false,.8,1);for(const scale of [.4,3,8]){const transformed=path.map(p=>({x:p.x/scale,y:p.y/scale})),smooth=smoothFreeformPath(transformed,false,.8,scale);assert.equal(smooth.length,base.length);smooth.forEach((p,i)=>close({x:p.x*scale,y:p.y*scale},base[i]))}
 for(const path of [[{x:0,y:0},{x:0,y:0},{x:0,y:0}],[{x:0,y:0},{x:1,y:0},{x:0,y:1}]]){const smooth=smoothFreeformPath(path,true,1);assert.ok(smooth.length>=3&&smooth.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)))}
});

import {normalizeFps,normalizeDuration,NumberDraft} from '../lib/number-values.js';
import {shareMovieFile} from '../lib/sharing.js';
test('custom FPS accepts all positive safe integers and survives project restore',()=>{
 for(const fps of [1,8,12,17,23,48,75,123,240,1000]){assert.equal(normalizeFps(fps),fps);assert.equal(normalizeFps(String(fps)),fps);const saved=savedAnimation();saved.preferences.movieFps=fps;assert.equal(parseAnimation(serializeAnimation(saved)).preferences.movieFps,fps)}
 for(const value of ['',0,-3,2.5,NaN,Infinity,'text',Number.MAX_SAFE_INTEGER+1])assert.equal(normalizeFps(value),30);
});
test('numeric drafts allow deletion and partial numbers without altering the committed value',()=>{
 const field=new NumberDraft(1);field.focused=true;
 for(const text of ['', '.', '0.', '0.0', '0.05', '12.', '12.25']){field.edit(text);field.sync(1);assert.equal(field.text,text);assert.equal(field.value,1)}
 const committed=field.commit(normalizeDuration);assert.deepEqual(committed,{value:12.25,changed:true});assert.equal(field.text,'12.25');field.edit('');assert.equal(field.text,'');field.focused=false;assert.deepEqual(field.commit(normalizeDuration),{value:1,changed:true});
 assert.equal(normalizeDuration('0.025'),.025);assert.equal(normalizeDuration('120'),120);
});
test('number fields preserve active edits across external updates and commit FPS only when finished',()=>{
 const field=new NumberDraft(30);field.focused=true;field.edit('');field.sync(60);assert.equal(field.text,'');field.edit('8');assert.equal(field.value,60);assert.deepEqual(field.commit(normalizeFps),{value:8,changed:true});assert.deepEqual(field.commit(normalizeFps),{value:8,changed:false});
 field.edit('garbage');field.cancel();assert.equal(field.text,'8');field.focused=false;field.sync(17);assert.equal(field.text,'17');field.focused=true;field.edit('');assert.deepEqual(field.commit(normalizeFps),{value:30,changed:true});
 const stroke=new NumberDraft(8);stroke.focused=true;stroke.edit('');stroke.sync(8);assert.equal(stroke.text,'');stroke.edit('12.5');assert.equal(stroke.commit(parseStrokeWidth).value,12.5);
});
test('8 FPS export produces eight animation samples per second without changing frame durations',async()=>{
 const start={...initialFrames[0].changes.circle,id:'circle',x:0,y:0,w:20,h:20},frames=[{id:'a',changes:{circle:start}},{id:'b',timeMultiplier:.5,changes:{circle:{x:80}}},{id:'c',changes:{circle:{x:120}}}],ctx=drawingContext(),canvas={width:960,height:960,getContext:()=>ctx},view={width:960,height:960,scale:1,origin:{x:0,y:0}},seconds=movieDuration(frames.length,1,true,{},frames),{library,stats}=fakeEncoder();
 const movie=await encodeAnimation({canvas,seconds,fps:8,draw:createMovieRenderer({canvas,view,frames,duration:1,loop:true,easing:'linear'})},library);
 assert.equal(seconds,1.5);assert.equal(movie.seconds,1.5);assert.equal(movie.fps,8);assert.equal(stats.metadata.frameRate,8);assert.equal(stats.timestamps.length,12);assert.equal(stats.timestamps.filter(([time])=>time<1).length,8);assert.equal(stats.timestamps.filter(([time])=>time>=1).length,4);stats.timestamps.forEach(([time,duration],i)=>{assert.equal(time,i/8);assert.equal(duration,1/8)});ctx.drawn.forEach((p,i)=>close(p,{x:10+i*10,y:10}));
 const twoSeconds=framePlan(2,8);assert.equal(twoSeconds.count,16);assert.equal(twoSeconds.seconds,2);
});
test('real-time capture also receives an arbitrary FPS instead of resetting it to 30',async()=>withMovieRuntime(async({options,pump,stats})=>{const promise=recordMovie({...options,fps:8});await pump();const movie=await promise;assert.equal(stats.fps,8);assert.equal(movie.fps,8)}));
test('movie sharing sends the actual movie file and offers fallback without downloading on cancel',async()=>{
 const file=new File(['movie'],'animation.mp4',{type:'video/mp4'});let payload;
 assert.equal(await shareMovieFile(file,{canShare:()=>true,share:async data=>{payload=data}}),'shared');assert.deepEqual(payload,{files:[file]});
 assert.equal(await shareMovieFile(file,{}),'unavailable');assert.equal(await shareMovieFile(file,{canShare:()=>false,share:()=>assert.fail('must not share an unsupported file')}),'unavailable');
 assert.equal(await shareMovieFile(file,{canShare:()=>true,share:async()=>{throw new DOMException('Cancelled','AbortError')}}),'cancelled');assert.equal(await shareMovieFile(file,{canShare:()=>true,share:async()=>{throw new Error('Unavailable')}}),'unavailable');
});

import {DEFAULT_CAMERA,hasCameraFrames,resolveCamera,interpolateCamera,mixCamera,cameraFromView,cameraToView,cameraFrameEdits,validCameraPatch} from '../lib/timeline-camera.js';
import {viewWithCamera} from '../lib/movie-scene.js';
test('main camera properties inherit independently until a later explicit edit',()=>{
 let frames=[{id:'a',changes:{},camera:{x:0,y:0,zoom:1}},{id:'b',changes:{},camera:{zoom:2}},{id:'c',changes:{},camera:{x:300}},{id:'d',changes:{}}];frames=cameraFrameEdits(frames,0,{x:100,y:50,zoom:1},DEFAULT_CAMERA);
 assert.deepEqual(resolveCamera(frames,1),{x:100,y:50,zoom:2});assert.deepEqual(resolveCamera(frames,3),{x:300,y:50,zoom:2});assert.deepEqual(interpolateCamera(frames,.5),{x:100,y:50,zoom:1.5});assert.equal(interpolateCamera(frames,1.25,'smooth').x,131.25);
});
test('first camera edit seeds the legacy framing without changing earlier frames',()=>{
 const original=[{id:'a',changes:{}},{id:'b',changes:{}},{id:'c',changes:{}}],prior={x:120,y:-30,zoom:1.5},target={...prior,zoom:2};const frames=cameraFrameEdits(original,1,target,prior);assert.equal(hasCameraFrames(original),false);assert.deepEqual(resolveCamera(frames,0),prior);assert.deepEqual(resolveCamera(frames,1),target);assert.deepEqual(resolveCamera(frames,2),target);assert.deepEqual(frames[1].camera,{zoom:2});assert.equal(cameraFrameEdits(frames,1,target,target),frames);assert.deepEqual(original[0],{id:'a',changes:{}});
});
test('camera positions convert between screen sizes without changing world framing',()=>{
 const camera={x:123,y:-45,zoom:2.5};for(const width of [390,960,1920]){const base=startingGridScale(width),view=cameraToView(camera,base);assert.deepEqual(cameraFromView(view.zoom,view.pan,base),camera);const movieView=viewWithCamera({width,height:800,scale:8,origin:{x:500,y:600}},camera);assert.equal(movieView.scale,base*camera.zoom);close(movieView.origin,view.pan);assert.equal(movieView.gridLevel,3)}
});
test('camera reorder and deletion preserve the visible framing of each surviving frame',()=>{
 const frames=[{id:'a',changes:{},camera:{x:100,y:25,zoom:1}},{id:'b',changes:{},camera:{zoom:2}},{id:'c',changes:{},camera:{x:300}},{id:'d',changes:{},camera:{y:-40}}],before=new Map(frames.map((f,i)=>[f.id,resolveCamera(frames,i)]));
 for(const next of [reorderFrames(frames,0,3),reorderFrames(frames,2,0),deleteFrame(frames,0),deleteFrame(frames,1)])next.forEach((f,i)=>assert.deepEqual(resolveCamera(next,i),before.get(f.id)));
});
test('main camera keyframes survive JSON and invalid camera values are rejected',()=>{
 const saved=savedAnimation();saved.project.frames[0].camera={x:45,y:-60,zoom:1};saved.project.frames[1].camera={zoom:3};const restored=parseAnimation(serializeAnimation(saved));assert.deepEqual(restored.project.frames,saved.project.frames);
 for(const bad of [null,[],{zoom:0},{zoom:20},{x:'5'},{y:Infinity},{foo:1}]){assert.equal(validCameraPatch(bad),false);saved.project.frames[0].camera=bad;assert.throws(()=>parseAnimation(serializeAnimation(saved)))}
 assert.equal(validCameraPatch({}),true);assert.equal(validCameraPatch({zoom:.4,x:-100}),true);
});
test('camera and shapes use identical timings in an 8 FPS movie including frame multipliers',async()=>{
 const shape={...initialFrames[0].changes.circle,id:'circle',x:100,y:40,w:20,h:20},frames=[{id:'a',timeMultiplier:.5,changes:{circle:shape},camera:{x:0,y:0,zoom:1}},{id:'b',changes:{circle:{x:180}},camera:{x:80,y:40,zoom:2}}],ctx=drawingContext(),canvas={width:960,height:960,getContext:()=>ctx},view={width:960,height:960,scale:1,origin:{x:0,y:0}},duration=2,seconds=movieDuration(2,duration,true,{},frames),{library,stats}=fakeEncoder();
 await encodeAnimation({canvas,seconds,fps:8,draw:createMovieRenderer({canvas,view,frames,duration,easing:'linear'})},library);assert.equal(seconds,1);assert.equal(stats.timestamps.length,8);
 ctx.drawn.forEach((point,i)=>{const t=i/8;close(point,{x:110*(1+t),y:(50-40*t)*(1+t)})});
});
test('camera loop jumps to its first frame without a final hold and recording transitions can be interrupted',()=>{
 const frames=[{id:'a',changes:{},camera:{x:0,y:0,zoom:1}},{id:'b',changes:{},camera:{x:100,y:40,zoom:3}}];assert.deepEqual(interpolateCamera(frames,timelinePosition(frames,1,1)),DEFAULT_CAMERA);
 const halfway=mixCamera(resolveCamera(frames,0),resolveCamera(frames,1),.5);assert.deepEqual(halfway,{x:50,y:20,zoom:2});assert.deepEqual(mixCamera(halfway,DEFAULT_CAMERA,.5),{x:25,y:10,zoom:1.5});
});
test('symbol exports can ignore frame cameras and projects without camera keys retain their current view',()=>{
 const s={...initialFrames[0].changes.circle,id:'circle',x:100,y:40,w:20,h:20},frames=[{id:'a',changes:{circle:s},camera:{x:80,y:20,zoom:3}}],ctx=drawingContext(),canvas={width:960,height:960,getContext:()=>ctx},view={width:960,height:960,scale:2,origin:{x:30,y:50}};
 createMovieRenderer({canvas,view,frames,duration:1,animateCamera:false})(0);close(ctx.drawn[0],{x:250,y:150});ctx.drawn.length=0;
 createMovieRenderer({canvas,view,frames:[{id:'a',changes:{circle:s}}],duration:1})(0);close(ctx.drawn[0],{x:250,y:150});
});
test('export duration overrides preserve the chosen FPS and fractional frame timing',async()=>{
 const frames=[{id:'a',timeMultiplier:.5,changes:{}},{id:'b',changes:{}}];for(const duration of [1,3]){const{library,stats}=fakeEncoder(),seconds=movieDuration(2,duration,true,{},frames);const movie=await encodeAnimation({canvas:{width:1920,height:1080},seconds,fps:8,draw:()=>{}},library);assert.equal(stats.timestamps.length,duration*4);assert.equal(movie.seconds,duration*.5);assert.equal(movie.fps,8)}
});

import {playbackClock} from '../lib/recording-clock.js';
test('8 FPS live playback samples exactly eight steps in one second at a 60 Hz display refresh',()=>{
 const clock=playbackClock(8),times=Array.from({length:60},(_,i)=>clock(i/60)).filter(t=>t!==null);assert.deepEqual(times,Array.from({length:8},(_,i)=>i/8));assert.equal(clock(1),1);assert.equal(clock(1.001),null);
 const fromFrame=playbackClock(8,2.5);assert.equal(fromFrame(0),2.5);assert.equal(fromFrame(.125),2.625);
});
test('live playback preserves real-time durations after stalled frames and uses the selected FPS for symbols and cameras',()=>{
 const clock=playbackClock(8);assert.equal(clock(0),0);assert.equal(clock(.05),null);assert.equal(clock(.52),.5);assert.equal(clock(.53),null);assert.equal(clock(1),1);
 const frames=[{id:'a',changes:{},camera:{x:0,y:0,zoom:1}},{id:'b',changes:{},camera:{x:80,y:0,zoom:2}}],sample=playbackClock(8),samples=[];for(let i=0;i<60;i++){const seconds=sample(i/60);if(seconds!==null)samples.push({seconds,camera:interpolateCamera(frames,timelinePosition(frames,seconds,1)),symbol:timelinePosition(frames,seconds,.5)})}assert.equal(samples.length,8);samples.forEach(({seconds,camera,symbol})=>{assert.equal(camera.x,seconds*80);assert.equal(symbol,(seconds%.5)*2)});
 for(const fps of [1,12,17,24,30,60]){const next=playbackClock(fps);assert.equal(Array.from({length:240},(_,i)=>next(i/240)).filter(t=>t!==null).length,fps)}
});

import {stopPageScroll} from '../lib/page-scroll.js';
test('page scroll lock leaves slider touch input and native control gestures uncancelled',()=>{
 for(const local of ['input','.smoothness-control','select','textarea','.modal','.tool-scroll','.frame-strip','.shape-menu','.voice-tools']){let prevented=false;stopPageScroll({cancelable:true,target:{closest:selectors=>selectors.split(',').includes(local)?{}:null},preventDefault(){prevented=true}});assert.equal(prevented,false,local)}
 // A label's text node resolves through its containing control too.
 let prevented=false;stopPageScroll({cancelable:true,target:{parentElement:{closest:selectors=>selectors.includes('.smoothness-control')?{}:null}},preventDefault(){prevented=true}});assert.equal(prevented,false);
});
test('page scrolling remains blocked outside controls without interfering with handled canvas gestures',()=>{
 let prevented=0;const event={cancelable:true,target:{closest:()=>null},preventDefault(){prevented++}};stopPageScroll(event);assert.equal(prevented,1);stopPageScroll({...event,defaultPrevented:true});stopPageScroll({...event,cancelable:false});assert.equal(prevented,1);
});

import {elasticView,stepElasticScroll,frameScrollTarget} from '../lib/elastic-scroll.js';
test('frame-strip overscroll is resisted at both edges while the actual scroll position stays in bounds',()=>{
 assert.deepEqual(elasticView(100,500),{scroll:100,offset:0});const left=elasticView(-100,500),right=elasticView(600,500);assert.equal(left.scroll,0);assert.equal(right.scroll,500);assert.ok(left.offset>0&&left.offset<100);assert.equal(right.offset,-left.offset);assert.ok(elasticView(-10000,500).offset<=72);assert.deepEqual(elasticView(-100,500,true),{scroll:0,offset:0});
});
test('elastic scrolling springs precisely back to either edge and settles after a fling',()=>{
 for(const [position,velocity,max,target]of [[-100,0,500,0],[630,1,500,500],[450,3,500,500],[-100,0,0,0]]){let state={position,velocity};for(let i=0;i<500&&!state.done;i++)state=stepElasticScroll(state,max,16);assert.equal(state.done,true);assert.equal(state.position,target);assert.equal(state.velocity,0)}
 let state={position:200,velocity:.7};for(let i=0;i<500&&!state.done;i++)state=stepElasticScroll(state,1000,16);assert.ok(state.position>200&&state.position<1000);assert.equal(state.done,true);
});
test('new frames reveal the add button at the right, while ordinary selection only reveals the selected card',()=>{
 const viewport={left:0,right:300},card={left:120,right:196};assert.equal(frameScrollTarget({previousCount:4,count:5,canAdd:true,current:0,max:220,viewport,card}),220);assert.equal(frameScrollTarget({previousCount:4,count:5,canAdd:true,current:0,max:0,viewport,card}),0);
 assert.equal(frameScrollTarget({previousCount:5,count:5,canAdd:true,current:100,max:400,viewport,card}),100);assert.equal(frameScrollTarget({previousCount:5,count:5,canAdd:true,current:100,max:400,viewport,card:{left:320,right:396}}),196);assert.equal(frameScrollTarget({previousCount:4,count:5,canAdd:false,current:100,max:400,viewport,card}),100);
});
