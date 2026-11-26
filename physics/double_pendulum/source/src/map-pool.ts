import type {MapJob,TileFrame,Checkpoint} from './map-types';
const cache:{key:string;checkpoint:Checkpoint}[]=[];
const bytes=(c:Checkpoint)=>c.states.byteLength+c.flips.byteLength+(c.peakDrift?.byteLength??0)+(c.pair?.byteLength??0);
const key=(j:MapJob)=>JSON.stringify([2,j.mode,j.n,j.bounds,j.p,j.dt,j.perturbation??1e-7]);
function lookup(j:MapJob){if(j.mode<4)return;return cache.filter(e=>e.key===key(j)&&e.checkpoint.time<=j.duration).sort((a,b)=>b.checkpoint.time-a.checkpoint.time)[0]?.checkpoint;}
function save(j:MapJob,c:Checkpoint){if(j.mode<4)return;for(let i=cache.length-1;i>=0;i--)if(cache[i].key===key(j))cache.splice(i,1);cache.push({key:key(j),checkpoint:c});while(cache.reduce((n,e)=>n+bytes(e.checkpoint),0)>64*1024*1024)cache.shift();}
export function clearMapCache(){cache.length=0;}
export function workerCount(n:number,cores:number){return Math.min(n,n<100?4:8,Math.max(1,Math.floor(cores||2)-1));}
type Tile={start:number;end:number;checkpoint?:Checkpoint;frame?:TileFrame};
// A work queue assigns small row tiles to whichever worker becomes free next.
// A time barrier ensures the published field is a single coherent experiment.
export class MapPool{
 onmessage:((e:{data:any})=>void)|null=null;
 onerror:((e:{message:string})=>void)|null=null;
 onprogress:((completed:number,total:number)=>void)|null=null;
 private workers:Worker[]=[];private tiles:Tile[]=[];private assignments:number[]=[];
 private job!:MapJob;private time=0;private target=0;private running=false;private dead=false;private pending=0;private cursor=0;private completed=0;private finishing=false;
 private timer:ReturnType<typeof setTimeout>|null=null;private repaint=false;private queuedStep=false;private speed=1;private started=0;private lastPublish=-Infinity;private lastWorkUpdate=0;private batchSteps=20;private publishing=true;private phase='init';private batchPalette='Spectrum';private cacheStatus='New calculation';
 private waiters:{resolve:(c:Checkpoint)=>void;reject:(e:Error)=>void}[]=[];
 private factory:()=>Worker;private cores:number;
 constructor(factory:()=>Worker=()=>new Worker(new URL('./map.worker.ts',import.meta.url),{type:'module'}),cores=globalThis.navigator?.hardwareConcurrency??2){this.factory=factory;this.cores=cores;}
 postMessage(m:any){if(this.dead)return;if(m.type==='init'){this.init(m.job,m.resume);return;}if(m.type==='play'){this.speed=m.speed;this.running=true;if(!this.pending&&!this.finishing)this.schedule();}else if(m.type==='pause'){this.running=false;this.clearTimer();this.repaint=true;if(!this.pending&&!this.finishing)this.next();}else if(m.type==='step'){this.running=false;this.clearTimer();this.queuedStep=true;if(!this.pending&&!this.finishing)this.next();}else if(m.type==='palette'){this.job.palette=m.palette;}}
 getSnapshot():Promise<Checkpoint>{if(this.dead)return Promise.reject(new Error('Experiment changed before the checkpoint was ready.'));if(!this.pending&&this.tiles.every(t=>t.checkpoint))return Promise.resolve(this.assemble());return new Promise((resolve,reject)=>this.waiters.push({resolve,reject}));}
 terminate(){this.dead=true;this.clearTimer();this.workers.forEach(w=>w.terminate());this.workers=[];this.waiters.splice(0).forEach(w=>w.reject(new Error('Experiment changed before save completed.')));}
 private clearTimer(){if(this.timer!==null)clearTimeout(this.timer);this.timer=null;}
 private init(job:MapJob,resume?:Checkpoint){this.job={...job};const restored=resume??lookup(job);this.time=restored?.time??0;this.cacheStatus=restored?(restored.time===job.duration?'Cached result':`Resumed from ${restored.time} s`):'New calculation';
  try{for(let i=0;i<workerCount(job.n,this.cores);i++){try{this.workers.push(this.factory());}catch(e){if(!this.workers.length)throw e;break;}}}catch(e){this.onerror?.({message:String(e)});this.terminate();return;}
  const rows=Math.max(1,Math.min(8,Math.ceil(job.n/(this.workers.length*4))));
  for(let start=0;start<job.n;start+=rows){const end=Math.min(job.n,start+rows),a=start*job.n,b=end*job.n;this.tiles.push({start,end,checkpoint:restored?{time:restored.time,states:restored.states.slice(a*4,b*4),flips:restored.flips.slice(a,b),peakDrift:restored.peakDrift?.slice(a,b),pair:restored.pair?.slice(a*4,b*4)}:undefined});}
  this.workers.forEach((w,i)=>{w.onmessage=e=>this.receive(i,e.data);w.onerror=e=>{this.onerror?.({message:e.message||'Worker failed'});this.terminate();};});this.dispatch(this.time,true,'init');
 }
 private sendNext(worker:number){if(this.dead||this.cursor>=this.tiles.length)return;const index=this.cursor++,tile=this.tiles[index],resume=tile.checkpoint;this.assignments[worker]=index;const transfer:Transferable[]=resume?[resume.states.buffer,resume.flips.buffer]:[];if(resume?.peakDrift)transfer.push(resume.peakDrift.buffer);if(resume?.pair)transfer.push(resume.pair.buffer);tile.checkpoint=undefined;this.workers[worker].postMessage({type:'task',job:{...this.job,palette:this.batchPalette},rowStart:tile.start,rowEnd:tile.end,resume,target:this.target,publish:this.publishing},transfer);}
 private receive(worker:number,m:TileFrame){if(this.dead)return;const tile=this.tiles[this.assignments[worker]];tile.frame=m;tile.checkpoint=m.checkpoint;this.completed++;this.pending--;if(!this.pending||performance.now()-this.lastWorkUpdate>75){this.lastWorkUpdate=performance.now();this.onprogress?.(this.completed,this.tiles.length);}if(this.cursor<this.tiles.length)this.sendNext(worker);if(this.pending)return;
  this.finishing=true;this.time=this.target;const elapsed=performance.now()-this.started;if(this.phase==='advance'&&this.job.mode>=4&&elapsed>0)this.batchSteps=Math.max(1,Math.min(250,Math.round(this.batchSteps*Math.max(.5,Math.min(2,40/elapsed)))));
  if(this.waiters.length){const snapshot=this.assemble();this.waiters.splice(0).forEach(w=>w.resolve(snapshot));}
  if(this.publishing){const n=this.job.n,pixels=new Uint8ClampedArray(n*n*4),states=this.job.mode<=3?new Float64Array(n*n*4):undefined,flips=this.job.mode===4?new Float64Array(n*n):undefined,growth=this.job.mode===5?new Float64Array(n*n):undefined,peakDrift=new Float64Array(n*n);let maxDrift=0,badCells=0;
   for(const t of this.tiles){const f=t.frame!,offset=t.start*n;pixels.set(f.pixels!,offset*4);if(states)states.set(f.states!,offset*4);if(flips)flips.set(f.flips!,offset);if(growth)growth.set(f.growth!,offset);if(f.peakDrift)peakDrift.set(f.peakDrift,offset);}
   for(const d of peakDrift){maxDrift=Math.max(maxDrift,d);if(!Number.isFinite(d)||d>.1)badCells++;}
   this.lastPublish=performance.now();this.onmessage?.({data:{type:'frame',palette:this.batchPalette,time:this.time,progress:this.job.mode>=4?this.time/this.job.duration:0,pixels,states,flips,growth,peakDrift,maxDrift,badCells,workers:this.workers.length,tiles:this.tiles.length,cacheStatus:this.cacheStatus}});
  }
  if(this.time>=this.job.duration-this.job.dt*1e-6){if(this.phase!=='paint')save(this.job,this.assemble());this.running=false;this.repaint=false;this.queuedStep=false;this.finishing=false;this.onmessage?.({data:{type:'done'}});return;}this.finishing=false;this.next();
 }
 private assemble():Checkpoint{const n=this.job.n,states=new Float64Array(n*n*4),flips=new Float64Array(n*n),peakDrift=new Float64Array(n*n),pair=this.job.mode===5?new Float64Array(n*n*4):undefined;for(const t of this.tiles){const c=t.checkpoint!,o=t.start*n;states.set(c.states,o*4);flips.set(c.flips,o);if(c.peakDrift)peakDrift.set(c.peakDrift,o);if(pair&&c.pair)pair.set(c.pair,o*4);}return {time:this.time,states,flips,peakDrift,pair};}
 private next(){if(this.dead||this.pending||this.finishing)return;if(this.repaint){this.repaint=false;this.dispatch(this.time,true,'paint');return;}if(this.queuedStep){this.queuedStep=false;this.dispatch(Math.min(this.job.duration,this.time+.04),true);return;}if(this.running)this.schedule();}
 private schedule(){if(this.dead||this.pending||this.timer!==null||this.time>=this.job.duration-this.job.dt*1e-6)return;this.timer=setTimeout(()=>{this.timer=null;if(!this.running||this.dead)return;const steps=this.job.mode>=4?this.batchSteps:Math.max(1,Math.round(.024*this.speed/this.job.dt)),target=Math.min(this.job.duration,Math.round(this.time/this.job.dt+steps)*this.job.dt);this.dispatch(target,performance.now()-this.lastPublish>=100||target>=this.job.duration-this.job.dt*1e-6);},this.job.mode>=4?0:Math.max(0,24-(performance.now()-this.started)));}
 private dispatch(target:number,publish:boolean,phase='advance'){this.clearTimer();this.target=target;this.publishing=publish;this.phase=phase;this.batchPalette=this.job.palette;this.cursor=0;this.completed=0;this.pending=this.tiles.length;this.started=performance.now();this.workers.forEach((_,i)=>this.sendNext(i));}
}
