export const DEFAULT_STYLE={color:'#000000',strokeColor:'#ffffff',stroke:4,fill:false};
export const DEFAULT_EASING='linear';
export function newShapeStyle(type,style=DEFAULT_STYLE){return{...DEFAULT_STYLE,...style,fill:type!=='line'&&Boolean(style.fill??DEFAULT_STYLE.fill)}}
