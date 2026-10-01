// Lock the document while leaving native controls and local scroll containers
// in charge of their own touch gestures (especially range sliders on iOS).
const LOCAL_INTERACTION='.tool-scroll,.frame-strip,.shape-menu,.voice-tools,.modal,.smoothness-control,input,select,textarea';
export function stopPageScroll(event){
 if(!event.cancelable||event.defaultPrevented)return;
 const target=event.target?.closest?event.target:event.target?.parentElement;
 if(!target?.closest(LOCAL_INTERACTION))event.preventDefault();
}
