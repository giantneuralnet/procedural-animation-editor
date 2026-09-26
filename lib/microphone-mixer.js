// A stable audio track lets the microphone be enabled or disabled mid-recording.
export async function microphoneMixer(getStream){
 const Context=globalThis.AudioContext||globalThis.webkitAudioContext;
 if(!Context)throw new Error('Live recording is unavailable in this browser. You can still export the animation.');
 const context=new Context(),destination=context.createMediaStreamDestination(),gain=context.createGain();gain.connect(destination);
 let source=null,current=null;
 const sync=()=>{const next=getStream();if(next===current)return;source?.disconnect();source=null;current=next;if(current?.getAudioTracks().some(t=>t.readyState==='live')){source=context.createMediaStreamSource(current);source.connect(gain)}};
 const close=()=>{source?.disconnect();gain.disconnect();destination.stream.getTracks().forEach(t=>t.stop());void context.close().catch(()=>{})};
 try{await context.resume();sync()}catch(error){close();throw error}
 return{stream:destination.stream,sync,pause:()=>{gain.gain.value=0},resume:()=>{gain.gain.value=1;sync()},close};
}
