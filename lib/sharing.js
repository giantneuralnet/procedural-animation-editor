export async function shareMovieFile(file,platform=globalThis.navigator){
 try{
  if(typeof platform?.share!=='function'||!platform.canShare?.({files:[file]}))return 'unavailable';
  await platform.share({files:[file]});return 'shared';
 }catch(error){return error?.name==='AbortError'?'cancelled':'unavailable'}
}
