'use client';
import NumberInput from './number-input';
import {parseStrokeWidth} from '../lib/defaults';
export default function StrokeWidthInput({value,onCommit}){
 return <NumberInput aria-label="Stroke width" value={value} onCommit={onCommit} parse={parseStrokeWidth}/>;
}
