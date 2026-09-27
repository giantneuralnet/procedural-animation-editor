const cache=new Map(),tinted=new Map(),listeners=new Set();let revision=0;
export const validImageSource=src=>typeof src==='string'&&/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(src);
export const subscribeImages=listener=>{listeners.add(listener);return()=>listeners.delete(listener)};
export const imageRevision=()=>revision;
const changed=()=>{revision++;for(const listener of listeners)listener()};
export function loadImage(src){
 if(cache.has(src))return cache.get(src).promise;
 if(!validImageSource(src)||typeof Image==='undefined')return Promise.reject(new Error('This image could not be loaded.'));
 const entry={image:null,promise:null},image=new Image();cache.set(src,entry);
 entry.promise=new Promise((resolve,reject)=>{image.onload=()=>{entry.image=image;changed();resolve(image)};image.onerror=()=>{changed();reject(new Error('This image could not be loaded.'))};image.src=src});return entry.promise;
}
export function imageBitmap(src,tint='#ffffff'){
 const image=cache.get(src)?.image;if(!image){void loadImage(src).catch(()=>{});return null}
 if(tint==='#ffffff')return image;const key=src+'|'+tint;if(tinted.has(key))return tinted.get(key);
 const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);ctx.globalCompositeOperation='multiply';ctx.fillStyle=tint;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.globalCompositeOperation='destination-in';ctx.drawImage(image,0,0);
 if(tinted.size>=4)tinted.delete(tinted.keys().next().value);tinted.set(key,canvas);return canvas;
}
export function imageSources(project){
 const sources=new Set();for(const timeline of [project,...Object.values(project.symbols||{})])for(const frame of timeline.frames||[])for(const patch of Object.values(frame.changes))if(patch.src)sources.add(patch.src);
 return [...sources];
}
export async function preloadImages(project){await Promise.all(imageSources(project).map(loadImage))}
export async function importImageFile(file){
 if(file.size>40*1024*1024)throw new Error('Choose an image smaller than 40 MB.');
 const url=URL.createObjectURL(file),image=new Image();
 try{await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('This image format could not be opened. Try a JPEG, PNG, or WebP image.'));image.src=url});
  const ratio=Math.min(1,1600/Math.max(image.naturalWidth,image.naturalHeight)),width=Math.max(1,Math.round(image.naturalWidth*ratio)),height=Math.max(1,Math.round(image.naturalHeight*ratio)),canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;canvas.getContext('2d').drawImage(image,0,0,width,height);
  const src=canvas.toDataURL('image/webp',.88);await loadImage(src);return{src,width,height,name:file.name.replace(/\.[^.]+$/,'')||'Image'};
 }finally{URL.revokeObjectURL(url)}
}
