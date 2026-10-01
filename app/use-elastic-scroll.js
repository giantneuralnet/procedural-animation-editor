'use client';
import {useEffect,useRef} from 'react';
import {clampScroll,elasticView,stepElasticScroll} from '../lib/elastic-scroll';
export default function useElasticScroll(ref){
 const state=useRef({position:0,velocity:0}),drag=useRef(null),raf=useRef(null),wheelTimer=useRef(null),reduced=useRef(false);
 const max=()=>Math.max(0,(ref.current?.scrollWidth||0)-(ref.current?.clientWidth||0));
 function stop(){cancelAnimationFrame(raf.current);raf.current=null;clearTimeout(wheelTimer.current);wheelTimer.current=null}
 function paint(){const row=ref.current;if(!row)return;const view=elasticView(state.current.position,max(),reduced.current);row.scrollLeft=view.scroll;row.style.transform=view.offset?`translate3d(${view.offset}px,0,0)`:''}
 function settle(){if(ref.current&&state.current.position===clampScroll(state.current.position,max()))state.current.position=ref.current.scrollLeft;stop();drag.current=null;state.current={position:clampScroll(state.current.position,max()),velocity:0};paint()}
 function animate(){stop();if(reduced.current){settle();return}let last=performance.now();const tick=now=>{state.current=stepElasticScroll(state.current,max(),now-last);last=now;paint();if(!state.current.done)raf.current=requestAnimationFrame(tick);else raf.current=null};raf.current=requestAnimationFrame(tick)}
 function begin(x,now){const row=ref.current;if(!row)return;const overscroll=state.current.position-clampScroll(state.current.position,max());stop();if(!overscroll)state.current.position=row.scrollLeft;row.scrollTo({left:row.scrollLeft,behavior:'auto'});state.current={position:state.current.position,velocity:0};drag.current={x,position:state.current.position,last:state.current.position,time:now}}
 function move(x,now){const start=drag.current;if(!start)return;const position=start.position-(x-start.x),dt=Math.max(1,now-start.time),velocity=Math.max(-3,Math.min(3,(position-start.last)/dt));state.current={position,velocity:dt>100?0:state.current.velocity*.55+velocity*.45};start.last=position;start.time=now;paint()}
 function release(now,cancel=false){const start=drag.current;drag.current=null;if(!start)return;if(cancel||now-start.time>100)state.current.velocity=0;animate()}
 function scrollTo(position){settle();const row=ref.current;if(row)row.scrollTo({left:clampScroll(position,max()),behavior:reduced.current?'auto':'smooth'})}
 useEffect(()=>{
  const row=ref.current,query=window.matchMedia('(prefers-reduced-motion: reduce)'),update=()=>{reduced.current=query.matches};update();query.addEventListener('change',update);
  const wheel=e=>{if(e.ctrlKey||drag.current)return;e.preventDefault();const factor=e.deltaMode===1?16:e.deltaMode===2?row.clientWidth:1,delta=(Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY)*factor;if(!delta)return;const over=state.current.position-clampScroll(state.current.position,max());stop();if(!over)state.current.position=row.scrollLeft;state.current.position=Math.max(-240,Math.min(max()+240,state.current.position+delta));state.current.velocity=0;delete state.current.spring;paint();wheelTimer.current=setTimeout(animate,85)};
  row.addEventListener('wheel',wheel,{passive:false});return()=>{stop();row.removeEventListener('wheel',wheel);query.removeEventListener('change',update);row.style.transform=''};
 },[]);
 return{begin,move,release,settle,scrollTo,max};
}
