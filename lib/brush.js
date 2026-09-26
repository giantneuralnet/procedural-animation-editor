const midpoint=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
export function brushGeometry(samples){
 const source=samples.length>1?samples:[samples[0],{x:samples[0].x+.01,y:samples[0].y}],smooth=source.map((p,i)=>i===0||i===source.length-1?p:{x:(source[i-1].x+p.x*6+source[i+1].x)/8,y:(source[i-1].y+p.y*6+source[i+1].y)/8});
 const x=Math.min(...smooth.map(p=>p.x)),y=Math.min(...smooth.map(p=>p.y)),path=[smooth[0]];
 for(let i=1;i<smooth.length;i++)path.push(smooth[i],i===smooth.length-1?smooth[i]:midpoint(smooth[i],smooth[i+1]));
 return{x,y,w:Math.max(...smooth.map(p=>p.x))-x,h:Math.max(...smooth.map(p=>p.y))-y,cx:0,cy:0,rotation:0,matrix:null,path:path.map(p=>({x:p.x-x,y:p.y-y}))};
}
export function brushPoint(path,t){const count=(path.length-1)/2,segment=Math.min(count-1,Math.floor(Math.max(0,t)*count)),u=Math.min(1,Math.max(0,t)*count-segment),a=path[segment*2],b=path[segment*2+1],c=path[segment*2+2];return{x:(1-u)**2*a.x+2*(1-u)*u*b.x+u*u*c.x,y:(1-u)**2*a.y+2*(1-u)*u*b.y+u*u*c.y}}
export function brushExtrema(path){const points=[];for(let i=0;i+2<path.length;i+=2){const[a,b,c]=path.slice(i,i+3);points.push(a,c);for(const axis of ['x','y']){const d=a[axis]-2*b[axis]+c[axis],t=d?(a[axis]-b[axis])/d:0;if(t>0&&t<1)points.push(brushPoint([a,b,c],t))}}return points}
