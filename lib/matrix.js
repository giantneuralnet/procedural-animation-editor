export const IDENTITY=[1,0,0,1,0,0];
export function multiply(a,b){const[A,B,C,D,E,F]=a,[g,h,i,j,k,l]=b;return[A*g+C*h,B*g+D*h,A*i+C*j,B*i+D*j,A*k+C*l+E,B*k+D*l+F]}
export function transformPoint(matrix,p){const[a,b,c,d,e,f]=matrix||IDENTITY;return{x:a*p.x+c*p.y+e,y:b*p.x+d*p.y+f}}
export function inverse(matrix){const[a,b,c,d,e,f]=matrix||IDENTITY,det=a*d-b*c;if(Math.abs(det)<1e-12)return IDENTITY;return[d/det,-b/det,-c/det,a/det,(c*f-d*e)/det,(b*e-a*f)/det]}
export function shapeMatrix(s){const a=(s.rotation||0)*Math.PI/180,c=Math.cos(a),d=Math.sin(a),x=s.x+s.w/2,y=s.y+s.h/2;return multiply(s.matrix||IDENTITY,[c,d,-d,c,x-c*s.w/2+d*s.h/2,y-d*s.w/2-c*s.h/2])}
export function symbolMatrix(s,definition){return multiply(shapeMatrix(s),[s.w/definition.width,0,0,s.h/definition.height,0,0])}
export function translateShape(s,dx,dy){return s.matrix?{matrix:[...s.matrix.slice(0,4),s.matrix[4]+dx,s.matrix[5]+dy]}:{x:s.x+dx,y:s.y+dy}}
export function tintColor(color,tint='#ffffff'){return '#'+[1,3,5].map(i=>Math.round(parseInt(color.slice(i,i+2),16)*parseInt(tint.slice(i,i+2),16)/255).toString(16).padStart(2,'0')).join('')}
