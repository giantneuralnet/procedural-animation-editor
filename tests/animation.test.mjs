import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveShapes,interpolateShapes,initialFrames} from '../lib/animation.js';
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
test('looped playback transitions from final state back to the resolved first frame',()=>{const fs=structuredClone(initialFrames);const a=resolveShapes(fs,2).find(s=>s.id==='circle'),b=resolveShapes(fs,0).find(s=>s.id==='circle'),middle=interpolateShapes(fs,2.5,'linear',true).find(s=>s.id==='circle');assert.equal(middle.x,(a.x+b.x)/2);assert.equal(middle.w,(a.w+b.w)/2);assert.equal(interpolateShapes(fs,3,'smooth',true).find(s=>s.id==='circle').x,b.x);assert.equal(interpolateShapes(fs,2.5,'linear',false).find(s=>s.id==='circle').x,a.x)});
test('connections follow targets on the closing transition too',()=>{const fs=connectedScene();const shapes=interpolateShapes(fs,1.5,'smooth',true),line=shapes.find(s=>s.id==='line'),circle=shapes.find(s=>s.id==='circle');close(linePoint(line,0),anchorPoint(circle,line.startLink))});
test('loop adds exactly one transition to export duration',()=>{assert.equal(movieDuration(3,1,true),3);assert.equal(movieDuration(3,1,false),2);assert.equal(movieDuration(3,.5,true),1.5);assert.equal(movieDuration(1,1,true),1)});
test('camera settles with grid on the top, left and right edges',()=>{for(const [w,h,baseScale,zoom]of [[390,650,.4375,1.31],[1280,720,1.2,.73],[844,220,.3214,2.8]]){const v=alignCamera({w,h},baseScale,zoom,{x:33.4,y:-53.1}),scale=baseScale*v.zoom,step=80*scale,x=w/2-460*scale+v.pan.x,y=h/2-300*scale+v.pan.y;for(const n of [x/step,y/step,(w-x)/step])assert.ok(Math.abs(n-Math.round(n))<1e-8);assert.ok(v.zoom>=.4&&v.zoom<=4)}});
test('grid attraction wins over a nearby off-grid line when distances are similar',()=>{const line={...initialFrames[0].changes.line,id:'target',x:17,y:-80,w:0,h:160,cx:0,cy:80};const result=snapEndpoint([line],{x:7,y:8},'new',1,true);assert.equal(result.kind,'grid');close(result.point,{x:0,y:0});assert.equal(result.link,null)});
test('deliberate line attachment still works away from a grid intersection',()=>{const line={...initialFrames[0].changes.line,id:'target',x:40,y:0,w:0,h:160,cx:0,cy:80};const result=snapEndpoint([line],{x:42,y:35},'new',1,true);assert.equal(result.link.id,'target');assert.equal(result.kind,'shape');const free=snapEndpoint([line],{x:42,y:35},'new',1,false);close(free.point,{x:42,y:35});assert.equal(free.link,null)});
test('a line on the grid can stay attached and aligned',()=>{const line={...initialFrames[0].changes.line,id:'target',x:0,y:0,w:160,h:0,cx:80,cy:0};const result=snapEndpoint([line],{x:1,y:2},'new',1,true);assert.equal(result.kind,'shape');close(result.point,{x:0,y:0})});
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
 for(const s of resolveShapes(fs,1).filter(s=>s.id!=='line')){assert.equal(s.color,'#102030');assert.equal(s.strokeColor,'#fedcba');assert.equal(s.stroke,12);assert.equal(s.fill,true)}
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
