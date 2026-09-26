import {shapeBounds} from './editing.js';
import {inverse,transformPoint} from './matrix.js';
// Controls use the current visible content, including nested symbol timelines.
export function rotationControl(shape,scale,scene={}){
 const b=shapeBounds(shape,scene),x=(b.left+b.right)/2;
 return{center:{x,y:(b.top+b.bottom)/2},base:{x,y:b.bottom},handle:{x,y:b.bottom+34/scale}};
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
