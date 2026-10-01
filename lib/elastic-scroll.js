export const clampScroll=(position,max)=>Math.max(0,Math.min(Math.max(0,max),position));
export function elasticView(position,max,reducedMotion=false){const scroll=clampScroll(position,max),over=position-scroll;return{scroll,offset:reducedMotion||!over?0:-Math.sign(over)*72*(1-Math.exp(-Math.abs(over)*.45/72))}}
export function stepElasticScroll(state,max,elapsed){
 let{position,velocity,spring=null}=state;const duration=Math.min(48,Math.max(0,elapsed));
 for(let remaining=duration;remaining>0;){const dt=Math.min(8,remaining);if(spring===null&&(position<0||position>max))spring=clampScroll(position,max);if(spring!==null){spring=clampScroll(spring,max);velocity+=((spring-position)*.0005-velocity*.032)*dt}else velocity*=Math.exp(-dt*.0045);position+=velocity*dt;remaining-=dt}
 const done=Math.abs(velocity)<.015&&Math.abs(position-(spring??clampScroll(position,max)))<.4;
 return{position:done?(spring??clampScroll(position,max)):position,velocity:done?0:velocity,spring:done?null:spring,done};
}
export function frameScrollTarget({previousCount,count,canAdd,current,max,viewport,card}){
 if(count>previousCount&&canAdd)return Math.max(0,max);
 if(!card)return clampScroll(current,max);
 const delta=card.left<viewport.left?card.left-viewport.left:card.right>viewport.right?card.right-viewport.right:0;
 return clampScroll(current+delta,max);
}
