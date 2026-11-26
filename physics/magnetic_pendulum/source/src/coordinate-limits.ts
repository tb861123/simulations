import type {Bounds} from './physics';
// The release chart excludes the equator. Leave a small, explicit numerical
// margin so a rounded maximum is still accepted by releaseZ().
export const releaseRadius=(L:number)=>L*(1-1e-12);
export const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
export function coordinateLimit(other:number,L:number){const radius=releaseRadius(L),a=Math.min(Math.abs(other),radius);return Math.sqrt((radius-a)*(radius+a));}
export function fitBounds(bounds:Bounds,L:number):Bounds {const radius=releaseRadius(L),r=Math.hypot(Math.max(Math.abs(bounds.xmin),Math.abs(bounds.xmax)),Math.max(Math.abs(bounds.ymin),Math.abs(bounds.ymax)));if(r<=radius)return {...bounds};const scale=radius/r;return {xmin:bounds.xmin*scale,xmax:bounds.xmax*scale,ymin:bounds.ymin*scale,ymax:bounds.ymax*scale};}
export function boundLimits(bounds:Bounds,key:keyof Bounds,L:number):[number,number]{const isX=key[0]==='x',other=isX?Math.max(Math.abs(bounds.ymin),Math.abs(bounds.ymax)):Math.max(Math.abs(bounds.xmin),Math.abs(bounds.xmax)),limit=coordinateLimit(other,L),lo=isX?bounds.xmin:bounds.ymin,hi=isX?bounds.xmax:bounds.ymax,gap=Math.max(Number.EPSILON*Math.max(Math.abs(lo),Math.abs(hi),L)*4,Math.min((hi-lo)*.001,L*1e-9));return key.endsWith('min')?[-limit,Math.min(limit,hi-gap)]:[Math.max(-limit,lo+gap),limit];}
export function clampBound(bounds:Bounds,key:keyof Bounds,value:number,L:number):Bounds {const fitted=fitBounds(bounds,L),[min,max]=boundLimits(fitted,key,L);return {...fitted,[key]:Number.isFinite(value)?clamp(value,min,max):fitted[key]};}
export function fitRelease(x:number,y:number,L:number):[number,number]{const r=Math.hypot(x,y),radius=releaseRadius(L);return r<=radius?[x,y]:[x*radius/r,y*radius/r];}
