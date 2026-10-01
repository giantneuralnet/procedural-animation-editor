// Freeform paths retain a stable set of anchors. Smoothing only changes the
// tangents, so editing or animating smoothness never renumbers control points.
export const DEFAULT_SMOOTHNESS=.65;
export const canFill=shape=>shape.type!=='line'||(shape.lineKind==='freeform'&&shape.closed);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function segmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return distance(p,{x:a.x+dx*t,y:a.y+dy*t})}
function simplify(points,tolerance){
 if(points.length<3)return points;
 const keep=new Set([0,points.length-1]),stack=[[0,points.length-1]];
 while(stack.length){const[first,last]=stack.pop();let farthest=-1,max=tolerance;for(let i=first+1;i<last;i++){const d=segmentDistance(points[i],points[first],points[last]);if(d>max){max=d;farthest=i}}if(farthest!==-1){keep.add(farthest);stack.push([first,farthest],[farthest,last])}}
 return [...keep].sort((a,b)=>a-b).map(i=>points[i]);
}
export function freeformCanClose(samples,scale=1){const radius=18/scale;return samples.length>=4&&distance(samples[0],samples.at(-1))<=radius&&samples.some(p=>distance(samples[0],p)>radius*1.5)}
export function freeformGeometry(samples,scale=1,finish=false){
 let points=samples.filter((p,i)=>!i||distance(p,samples[i-1])>.001),closed=finish&&freeformCanClose(points,scale);
 if(!points.length)points=[{x:0,y:0}];
 if(closed){points=points.slice(0,-1);while(points.length>3&&distance(points[0],points.at(-1))<9/scale)points.pop();points=simplify([...points,points[0]],2/scale).slice(0,-1);closed=points.length>=3}
 else points=simplify(points,2/scale);
 if(points.length<2)points=[points[0],{x:points[0].x+.01,y:points[0].y}];
 const x=Math.min(...points.map(p=>p.x)),y=Math.min(...points.map(p=>p.y));
 return{x,y,w:Math.max(...points.map(p=>p.x))-x,h:Math.max(...points.map(p=>p.y))-y,cx:0,cy:0,rotation:0,matrix:null,closed,path:points.map(p=>({x:p.x-x,y:p.y-y}))};
}
function segment(shape,i){
 const points=shape.path,n=points.length,at=j=>points[shape.closed?(j+n)%n:Math.max(0,Math.min(n-1,j))],a=at(i),b=at(i+1),before=at(i-1),after=at(i+2),k=Math.max(0,Math.min(1,shape.smoothness??DEFAULT_SMOOTHNESS))/6;
 return[a,{x:a.x+(b.x-before.x)*k,y:a.y+(b.y-before.y)*k},{x:b.x-(after.x-a.x)*k,y:b.y-(after.y-a.y)*k},b];
}
export function freeformSegments(shape){return Array.from({length:shape.path.length-(shape.closed?0:1)},(_,i)=>segment(shape,i))}
function cubic([a,b,c,d],t){const u=1-t;return{x:u*u*u*a.x+3*u*u*t*b.x+3*u*t*t*c.x+t*t*t*d.x,y:u*u*u*a.y+3*u*u*t*b.y+3*u*t*t*c.y+t*t*t*d.y}}
export function freeformPoint(shape,t){const count=shape.path.length-(shape.closed?0:1),position=Math.max(0,Math.min(1,t))*count,i=Math.min(count-1,Math.floor(position));return cubic(segment(shape,i),position-i)}
export function freeformExtrema(shape,transform=p=>p){
 const points=[];
 for(const local of freeformSegments(shape)){const curve=local.map(transform),[a,b,c,d]=curve;points.push(a,d);for(const axis of ['x','y']){const A=-a[axis]+3*b[axis]-3*c[axis]+d[axis],B=2*(a[axis]-2*b[axis]+c[axis]),C=b[axis]-a[axis],disc=B*B-4*A*C,roots=Math.abs(A)<1e-12?(Math.abs(B)<1e-12?[]:[-C/B]):disc<0?[]:[(-B+Math.sqrt(disc))/(2*A),(-B-Math.sqrt(disc))/(2*A)];for(const t of roots)if(t>0&&t<1)points.push(cubic(curve,t))}}
 return points;
}
export function insideFreeform(shape,p){
 if(!shape.closed||!shape.fill)return false;
 let inside=false,previous=shape.path[0];
 for(const curve of freeformSegments(shape))for(let i=1;i<=12;i++){const next=cubic(curve,i/12);if((next.y>p.y)!==(previous.y>p.y)&&p.x<(previous.x-next.x)*(p.y-next.y)/(previous.y-next.y)+next.x)inside=!inside;previous=next}
 return inside;
}
