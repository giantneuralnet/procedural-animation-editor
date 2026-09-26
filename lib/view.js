import {GRID_SIZE,findSnap} from './animation.js';
export function snapEndpoint(shapes,point,id,scale,enabled){
  if(!enabled)return{point,link:null,kind:null};
  const gridPoint={x:Math.round(point.x/GRID_SIZE)*GRID_SIZE,y:Math.round(point.y/GRID_SIZE)*GRID_SIZE};
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
export function alignCamera(size,baseScale,zoom,pan){
  const rawScale=baseScale*zoom;
  const minColumns=Math.max(1,Math.ceil(size.w/(GRID_SIZE*baseScale*4)));
  const maxColumns=Math.max(minColumns,Math.floor(size.w/(GRID_SIZE*baseScale*.4)));
  const columns=Math.max(minColumns,Math.min(maxColumns,Math.round(size.w/(GRID_SIZE*rawScale))));
  const scale=size.w/(columns*GRID_SIZE),step=GRID_SIZE*scale;
  const oldOrigin={x:size.w/2-460*rawScale+pan.x,y:size.h/2-300*rawScale+pan.y};
  const center={x:(size.w/2-oldOrigin.x)/rawScale,y:(size.h/2-oldOrigin.y)/rawScale};
  const origin={x:Math.round((size.w/2-center.x*scale)/step)*step,y:Math.round((size.h/2-center.y*scale)/step)*step};
  return{zoom:scale/baseScale,pan:{x:origin.x-size.w/2+460*scale,y:origin.y-size.h/2+300*scale}};
}
export function drawGrid(ctx,width,height,scale,origin){
  const step=GRID_SIZE*scale;ctx.lineWidth=1;
  for(let axis=0;axis<2;axis++){
    const limit=axis?height:width,offset=axis?origin.y:origin.x;
    for(let pos=((offset%step)+step)%step;pos<=limit+.001;pos+=step){
      const n=Math.round((pos-offset)/step);ctx.strokeStyle=n%4===0?'#2c2e35':'#25272e';ctx.beginPath();
      const crisp=Math.min(limit-.5,Math.round(pos)+.5);
      if(axis){ctx.moveTo(0,crisp);ctx.lineTo(width,crisp)}else{ctx.moveTo(crisp,0);ctx.lineTo(crisp,height)}ctx.stroke();
    }
  }
}
export function movieDuration(frameCount,duration,loop){return Math.max(1,loop&&frameCount>1?frameCount:frameCount-1)*duration}
