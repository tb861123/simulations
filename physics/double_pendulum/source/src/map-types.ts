import type {Bounds,Params} from './physics';
export type MapJob={mode:number;n:number;bounds:Bounds;p:Params;dt:number;duration:number;palette:string;perturbation?:number};
export type Checkpoint={time:number;states:Float64Array;flips:Float64Array;peakDrift?:Float64Array;pair?:Float64Array};
export type TileFrame={type:'frame';time:number;rowStart:number;rowEnd:number;palette?:string;pixels?:Uint8ClampedArray;states?:Float64Array;flips?:Float64Array;growth?:Float64Array;peakDrift?:Float64Array;checkpoint?:Checkpoint};
