import {drawShape} from './animation.js';
import {drawGrid} from './view.js';
export function fitMovieView(sourceWidth,sourceHeight,width,height){const scale=Math.min(width/sourceWidth,height/sourceHeight);return{scale,x:(width-sourceWidth*scale)/2,y:(height-sourceHeight*scale)/2}}
// Extend the infinite canvas into the movie's extra area instead of adding bands.
// A single uniform scale keeps circles, grid squares, and camera placement intact.
export function drawMovieScene(ctx,width,height,{view,shapes,includeGrid=false}){
 const fit=fitMovieView(view.width,view.height,width,height),scale=view.scale*fit.scale,origin={x:fit.x+view.origin.x*fit.scale,y:fit.y+view.origin.y*fit.scale};
 ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#191b20';ctx.fillRect(0,0,width,height);
 if(includeGrid)drawGrid(ctx,width,height,scale,origin);
 ctx.save();ctx.translate(origin.x,origin.y);ctx.scale(scale,scale);shapes.forEach(shape=>drawShape(ctx,shape));ctx.restore();
}
