'use client';
import useImages from './use-images';
import {useEffect,useRef} from 'react';
import {drawShape,lineHandles} from '../lib/animation';
import {drawGrid} from '../lib/view';
export default function TouchPreview({touch,size,scale,shapes,selected,grid,hint,level,symbols,time}){
 const imageVersion=useImages(),ref=useRef(null),width=148,height=108;
 useEffect(()=>{const c=ref.current,dpr=window.devicePixelRatio||1;c.width=width*dpr;c.height=height*dpr;const ctx=c.getContext('2d');ctx.scale(dpr,dpr);ctx.fillStyle='#191b20';ctx.fillRect(0,0,width,height);
 const center=hint?{x:(touch.world.x+hint.x)/2,y:(touch.world.y+hint.y)/2}:touch.world,magnification=scale*2,origin={x:width/2-center.x*magnification,y:height/2-center.y*magnification};
 if(grid)drawGrid(ctx,width,height,magnification,origin,level);
 ctx.save();ctx.translate(origin.x,origin.y);ctx.scale(magnification,magnification);shapes.forEach(s=>drawShape(ctx,s,{symbols,time}));
 const line=shapes.find(s=>s.id===selected&&s.type==='line');if(line){const points=lineHandles(line);for(const p of Object.values(points)){ctx.beginPath();ctx.arc(p.x,p.y,3/magnification,0,Math.PI*2);ctx.fillStyle='#191b20';ctx.strokeStyle='#b6a1fb';ctx.lineWidth=1.2/magnification;ctx.fill();ctx.stroke()}}
 if(hint){ctx.beginPath();ctx.arc(hint.x,hint.y,7/magnification,0,Math.PI*2);ctx.strokeStyle='#b4d7a0';ctx.lineWidth=1.5/magnification;ctx.stroke()}
 ctx.restore();const x=origin.x+touch.world.x*magnification,y=origin.y+touch.world.y*magnification;ctx.strokeStyle='#ffffff85';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-5,y);ctx.lineTo(x+5,y);ctx.moveTo(x,y-5);ctx.lineTo(x,y+5);ctx.stroke();
 },[touch,size,scale,shapes,selected,grid,hint,level,symbols,time,imageVersion]);
 const left=Math.max(8,size.w-width-12),top=12;
 return <div className="touch-preview" style={{left,top,width,height}} aria-hidden="true"><canvas ref={ref}/></div>
}
