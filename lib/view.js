import {timelineSeconds} from './timing.js';
import {GRID_SIZE,findSnap,resolveShapes,symbolCycleDuration} from './animation.js';
export function snapEndpoint(shapes,point,id,scale,enabled,spacing=GRID_SIZE){
  if(!enabled)return{point,link:null,kind:null};
  const gridPoint={x:Math.round(point.x/spacing)*spacing,y:Math.round(point.y/spacing)*spacing};
  const shape=findSnap(shapes,point,id,14/scale);
  if(shape){
    const gridDistance=Math.hypot(point.x-gridPoint.x,point.y-gridPoint.y)*scale;
    const shapeDistance=Math.hypot(point.x-shape.point.x,point.y-shape.point.y)*scale;
    // Snapping aligns positions without creating a persistent attachment.
    if(Math.hypot(shape.point.x-gridPoint.x,shape.point.y-gridPoint.y)*scale<.5)return{point:shape.point,link:null,kind:'shape'};
    if(gridDistance>20||shapeDistance<gridDistance*.7)return{point:shape.point,link:null,kind:'shape'};
  }
  return{point:gridPoint,link:null,kind:'grid'};
}
export const MAX_ZOOM=16;
export const gridLevel=zoom=>zoom>=2.5?3:zoom>=1.75?2:zoom>=1.25?1:0;
export const gridSpacing=zoom=>GRID_SIZE/(2**gridLevel(zoom));
export const startingGridScale=width=>Math.max(1,width)/(12*GRID_SIZE);
export function alignCamera(size,baseScale,zoom,pan){
  const rawScale=baseScale*zoom,intervals=[[.4,1.25],[1.25,1.75],[1.75,2.5],[2.5,MAX_ZOOM]];let best=null;
  for(let level=0;level<intervals.length;level++){
   const spacing=GRID_SIZE/(2**level),[low,high]=intervals[level],factor=size.w/(spacing*baseScale);
   const minColumns=Math.max(1,level===3?Math.ceil(factor/high):Math.floor(factor/high)+1),maxColumns=Math.floor(factor/low+1e-9);
   if(maxColumns<minColumns)continue;
   const columns=Math.max(minColumns,Math.min(maxColumns,Math.round(factor/zoom))),candidate=factor/columns,error=Math.abs(Math.log(candidate/zoom));
   if(!best||error<best.error)best={scale:baseScale*candidate,spacing,error};
  }
  const scale=best?.scale||rawScale,step=(best?.spacing||gridSpacing(zoom))*scale;
  const oldOrigin=pan;
  const center={x:(size.w/2-oldOrigin.x)/rawScale,y:(size.h/2-oldOrigin.y)/rawScale};
  const origin={x:Math.round((size.w/2-center.x*scale)/step)*step,y:Math.round((size.h/2-center.y*scale)/step)*step};
  return{zoom:scale/baseScale,pan:origin};
}
export function drawGrid(ctx,width,height,scale,origin,level=0){
  const divisions=2**level,step=GRID_SIZE*scale/divisions;ctx.lineWidth=1;
  for(let axis=0;axis<2;axis++){
    const limit=axis?height:width,offset=axis?origin.y:origin.x;
    for(let pos=((offset%step)+step)%step;pos<=limit+.001;pos+=step){
      const n=Math.round((pos-offset)/step);ctx.strokeStyle=n%(4*divisions)===0?'#2c2e35':n%divisions===0?'#292b32':'#23252c';ctx.beginPath();
      const crisp=Math.min(limit-.5,Math.round(pos)+.5);
      if(axis){ctx.moveTo(0,crisp);ctx.lineTo(width,crisp)}else{ctx.moveTo(crisp,0);ctx.lineTo(crisp,height)}ctx.stroke();
    }
  }
}
export function movieDuration(frameCount,duration,loop,symbols={},frames=[]){const base=frames.length?timelineSeconds(frames,duration):Math.max(1,frameCount)*duration;return frameCount===1?Math.max(base,symbolCycleDuration(resolveShapes(frames,0),symbols)):base}

export function centerCamera(size,baseScale,bounds){
 if(!bounds)return{zoom:1,pan:{x:0,y:0}};
 const width=Math.max(80,bounds.right-bounds.left),height=Math.max(80,bounds.bottom-bounds.top),padding=Math.min(64,Math.min(size.w,size.h)*.15);
 const zoom=Math.max(.4,Math.min(4,(size.w-padding*2)/(width*baseScale),(size.h-padding*2)/(height*baseScale))),scale=baseScale*zoom;
 return{zoom,pan:{x:size.w/2-(bounds.left+bounds.right)*scale/2,y:size.h/2-(bounds.top+bounds.bottom)*scale/2}};
}
