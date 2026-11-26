import {anglesAt,rad,type Bounds,type State} from './physics.ts';
import type {Checkpoint,MapJob} from './map-types';

export type MapRun={job:MapJob;resume?:Checkpoint;play:boolean};
export type AngleFields=Record<keyof Bounds,string>;
export const angleFields=(b:Bounds):AngleFields=>({x0:String(b.x0),x1:String(b.x1),y0:String(b.y0),y1:String(b.y1)});
export function parseAngleFields(fields:AngleFields):Bounds|null{
 const {x0,x1,y0,y1}=fields,b={x0:Number(x0),x1:Number(x1),y0:Number(y0),y1:Number(y1)};
 if(Object.values(fields).some(v=>!v.trim())||Object.values(b).some(v=>!Number.isFinite(v)||v < -180||v>180)||b.x1-b.x0<1e-7||b.y1-b.y0<1e-7)return null;
 return b;
}
export function sameBounds(a:Bounds,b:Bounds){return a.x0===b.x0&&a.x1===b.x1&&a.y0===b.y0&&a.y1===b.y1;}
export function setupChanged(applied:MapJob,draft:MapJob){return applied.mode!==draft.mode||applied.n!==draft.n||applied.dt!==draft.dt||applied.duration!==draft.duration||(draft.mode===5&&(applied.perturbation??1e-7)!==(draft.perturbation??1e-7))||(Object.keys(applied.p) as (keyof MapJob['p'])[]).some(k=>applied.p[k]!==draft.p[k]);}
// Only an explicit launch or checkpoint restore constructs a run. Copy drafts so
// subsequent edits cannot mutate settings used for drawing, inspection or export.
export function makeMapRun(draft:MapJob,resume?:Checkpoint):MapRun{
 return {job:{...draft,bounds:{...draft.bounds},p:{...draft.p}},resume,play:!resume};
}
export function visibleRegion(sampled:Bounds,view:Bounds){
 const x0=Math.max(sampled.x0,view.x0),x1=Math.min(sampled.x1,view.x1),y0=Math.max(sampled.y0,view.y0),y1=Math.min(sampled.y1,view.y1);
 if(x1<=x0||y1<=y0)return null;
 const sw=sampled.x1-sampled.x0,sh=sampled.y1-sampled.y0,vw=view.x1-view.x0,vh=view.y1-view.y0;
 return {sx:(x0-sampled.x0)/sw,sy:(sampled.y1-y1)/sh,sw:(x1-x0)/sw,sh:(y1-y0)/sh,dx:(x0-view.x0)/vw,dy:(view.y1-y1)/vh,dw:(x1-x0)/vw,dh:(y1-y0)/vh};
}
export function viewPoint(x:number,y:number,view:Bounds){return {theta1:view.x0+x*(view.x1-view.x0),theta2:view.y1-y*(view.y1-view.y0)};}
export function inspectPoint(x:number,y:number,view:Bounds,job?:MapJob|null):{initial:State;index:number|null}{
 const {theta1,theta2}=viewPoint(x,y,view),b=job?.bounds;
 if(!job||!b||theta1<b.x0||theta1>b.x1||theta2<b.y0||theta2>b.y1)return {initial:[rad(theta1),rad(theta2),0,0],index:null};
 const n=job.n,ix=Math.max(0,Math.min(n-1,Math.floor((theta1-b.x0)/(b.x1-b.x0)*n))),iy=Math.max(0,Math.min(n-1,Math.floor((b.y1-theta2)/(b.y1-b.y0)*n)));
 return {initial:anglesAt(ix,iy,n,b),index:iy*n+ix};
}
