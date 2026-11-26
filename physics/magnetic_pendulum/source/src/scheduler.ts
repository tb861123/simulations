import {type MapData,STRIDE,done,recount,divergenceKey} from './data';
export type Status='idle'|'running'|'paused'|'complete'|'cancelled';
export class Pool {
 workers:Worker[]=[]; idle=new Set<Worker>(); queue:number[]=[]; active=new Map<Worker,number>(); jobId=0; status:Status='idle'; map:MapData|null=null; kind='basin'; count=32; callback:()=>void=()=>{}; started=0; base=0; budget=1; error='';
 start(map:MapData,budget:number,callback:()=>void,kind='basin'){
  this.cancel();this.jobId++;this.map=map;this.callback=callback;this.kind=kind;this.started=performance.now();this.base=map.completed;this.budget=budget;this.error='';
  if(kind==='divergence'&&map.divergenceKey!==divergenceKey(map.config)){map.divergence.fill(NaN);map.divergenceKey=divergenceKey(map.config);}
  for(let i=0;i<map.config.n**2;i+=this.count){let needed=false;for(let j=i;j<Math.min(i+this.count,map.config.n**2);j++)if(kind==='divergence'?Number.isNaN(map.divergence[j]):!done(map.values,j,map.config)){needed=true;break;}if(needed)this.queue.push(i);}
  this.status='running';const id=this.jobId;
  for(let i=0;i<budget;i++){const w=new Worker(new URL('./compute.worker.ts',import.meta.url),{type:'module'});this.workers.push(w);this.idle.add(w);w.onerror=e=>{this.error=`Worker failed: ${e.message}`;this.pause();callback();};w.onmessage=e=>{const m=e.data;if(m.jobId!==id||id!==this.jobId||!this.map)return;const map=this.map;if(m.kind==='divergence'){if(m.result)map.divergence.set(m.result,m.start);}else if(m.values){let before=0,after=0;for(let j=0;j<m.count;j++){if(done(map.values,m.start+j,map.config))before++;if(done(m.values,j,map.config))after++;}map.values.set(m.values,m.start*STRIDE);map.completed+=after-before;}if(m.type==='tile'){this.active.delete(w);this.idle.add(w);this.dispatch();}callback();};}
  this.dispatch();callback();
 }
 dispatch(){if(this.status!=='running'||!this.map)return;for(const w of this.idle){const start=this.queue.shift();if(start===undefined)break;this.idle.delete(w);this.active.set(w,start);const count=Math.min(this.count,this.map.config.n**2-start);w.postMessage({type:'tile',jobId:this.jobId,start,count,kind:this.kind,config:this.map.config,eq:this.map.equilibria,values:this.map.values.slice(start*STRIDE,(start+count)*STRIDE),result:this.map.divergence.slice(start,start+count)});}if(!this.queue.length&&!this.active.size){this.status='complete';this.workers.forEach(w=>w.terminate());this.workers=[];this.callback();}}
 pause(){if(this.status!=='running')return;this.status='paused';this.workers.forEach(w=>w.postMessage({type:'pause'}));this.callback();}
 resume(){if(this.status!=='paused')return;this.status='running';this.workers.forEach(w=>w.postMessage({type:'resume'}));this.dispatch();this.callback();}
 cancel(){this.jobId++;this.workers.forEach(w=>w.terminate());this.workers=[];this.queue=[];this.active.clear();this.idle.clear();this.status='cancelled';}
}

