import {shapeBounds,symbolLocalBounds} from './editing.js';
import {localToWorld} from './animation.js';
import {inverse,transformPoint} from './matrix.js';
// Controls use the current visible content, including nested symbol timelines.
export function rotationControl(shape,scale,scene={},pointer=null){
 const b=shape.type==='symbol'?symbolLocalBounds(shape,scene.symbols||{},scene.time||0):shapeBounds({...shape,x:0,y:0,rotation:0,matrix:null}),x=(b.left+b.right)/2;
 const center=localToWorld(shape,{x,y:(b.top+b.bottom)/2}),base=localToWorld(shape,{x,y:b.bottom}),down=localToWorld(shape,{x,y:b.bottom+1}),length=Math.hypot(down.x-base.x,down.y-base.y)||1;
 const handle=pointer||{x:base.x+(down.x-base.x)*34/scale/length,y:base.y+(down.y-base.y)*34/scale/length};
 return{center,base,handle};
}
export function rotationAngle(shape,center,point){
 const matrix=inverse(shape.matrix),c=transformPoint(matrix,center),p=transformPoint(matrix,point);
 return Math.atan2(p.y-c.y,p.x-c.x);
}
// Rotate in the shape's parent coordinates, retaining any existing affine transform.
export function rotateShape(shape,center,degrees){
 if(shape.locked)return{};
 const pivot=transformPoint(inverse(shape.matrix),center),x=shape.x+shape.w/2-pivot.x,y=shape.y+shape.h/2-pivot.y,a=degrees*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
 return{x:pivot.x+x*c-y*s-shape.w/2,y:pivot.y+x*s+y*c-shape.h/2,rotation:(shape.rotation||0)+degrees};
}
