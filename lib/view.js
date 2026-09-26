import {GRID_SIZE,findSnap,resolveShapes,symbolCycleDuration} from './animation.js';
export function snapEndpoint(shapes,point,id,scale,enabled,spacing=GRID_SIZE){
  if(!enabled)return{point,link:null,kind:null};
  const gridPoint={x:Math.round(point.x/spacing)*spacing,y:Math.round(point.y/spacing)*spacing};
  const shape=findSnap(shapes,point,id,14/scale);
  if(shape){
    const gridDistance=Math.hypot(point.x-gridPoint.x,point.y-gridPoint.y)*scale;
    const shapeDistance=Math.hypot(point.x-shape.point.x,point.y-shape.point.y)*scale;
    // Coincident grid and shape anchors can keep both constraints.
    if(Math.hypot(shape.point.x-gridPoint.x,shape.point.y-gridPoint.y)*scale<.5)return{...shape,kind:'shape'};
    if(gridDistance>20||shapeDistance<gridDistance*.7)return{...shape,kind:'shape'};
  }
  return{point:gridPoint,link:null,kind:'grid'};
}
export const MAX_ZOOM=16;
export const gridLevel=zoom=>Math.min(3,Math.max(0,Math.floor(Math.log2(Math.max(1,zoom)))));
export const gridSpacing=zoom=>GRID_SIZE/(2**gridLevel(zoom));
export const startingGridScale=width=>Math.max(1,width)/(12*GRID_SIZE);
export function alignCamera(size,baseScale,zoom,pan){
  const rawScale=baseScale*zoom;let spacing=gridSpacing(zoom),scale=rawScale;
  for(let attempt=0;attempt<4;attempt++){
   const minColumns=Math.max(1,Math.ceil(size.w/(spacing*baseScale*MAX_ZOOM))),maxColumns=Math.max(minColumns,Math.floor(size.w/(spacing*baseScale*.4)));
   const columns=Math.max(minColumns,Math.min(maxColumns,Math.round(size.w/(spacing*rawScale))));scale=size.w/(columns*spacing);
   const nextSpacing=gridSpacing(scale/baseScale);if(nextSpacing===spacing)break;spacing=nextSpacing;
  }
  const step=spacing*scale;
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
export function movieDuration(frameCount,duration,loop,symbols={},frames=[]){const base=Math.max(1,loop&&frameCount>1?frameCount:frameCount-1)*duration;return frameCount===1?Math.max(base,symbolCycleDuration(resolveShapes(frames,0),symbols)):base}
