export const DEFAULT_STYLE={color:'#000000',strokeColor:'#ffffff',stroke:4,strokeStyle:'solid',fill:false};
export const DEFAULT_EASING='linear';
export function newShapeStyle(type,style=DEFAULT_STYLE){return{...DEFAULT_STYLE,...style,fill:type!=='line'&&Boolean(style.fill??DEFAULT_STYLE.fill)}}

export const STROKE_STYLES=[['solid','Solid'],['dashed','Dashed'],['dotted','Dotted'],['dash-dot','Dash-dot']];
export function strokeDash(style,width){const unit=Math.max(1,width);return(style==='dashed'?[4,3]:style==='dotted'?[0,2.5]:style==='dash-dot'?[4,2,0,2]:[]).map(n=>n*unit)}
