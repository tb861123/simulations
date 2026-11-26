import {type Config,type Equilibrium,initial,Integrator,advance,coordinate,phaseDistance,sample} from './physics';
import {STRIDE,unpack,pack,done} from './data';
let job:any=null, paused=false;
self.onmessage=(ev:MessageEvent)=>{const m=ev.data;if(m.type==='pause'){paused=true;return;}if(m.type==='resume'){paused=false;tick();return;}if(m.type==='tile'){job={...m,cursor:0,last:0,integrator:new Integrator(m.config.physics)};paused=false;tick();}if(m.type==='trajectory'){trajectory(m);}};
function tick(){if(!job||paused)return;const j=job,c=j.config as Config,eq=j.eq as Equilibrium[],start=performance.now();
 while(j.cursor<j.count&&performance.now()-start<14){const local=j.cursor,index=j.start+local;
  if(j.kind==='divergence'){
   if(!j.a){const [x,y]=coordinate(index,c.n,c.bounds);try{j.a=initial(x,y,c);j.b=initial(x+c.perturbation,y,c);j.d0=phaseDistance(j.a.s,j.b.s,c.physics);}catch{j.result[local]=Infinity;j.cursor++;j.a=null;j.b=null;continue;}}
   const target=Math.min(c.divergenceHorizon,j.a.t+c.dt*128);advance(j.a,c,eq,j.integrator,target,128,false);advance(j.b,c,eq,j.integrator,target,128,false);
   if(j.a.outcome===-2||j.b.outcome===-2||j.d0===0){j.result[local]=Infinity;j.cursor++;j.a=null;j.b=null;}else if(j.a.t>=c.divergenceHorizon-1e-9){j.result[local]=Math.log10(Math.max(Number.MIN_VALUE,phaseDistance(j.a.s,j.b.s,c.physics))/j.d0);j.cursor++;j.a=null;j.b=null;}
  }else{
   if(done(j.values,local,c)){j.cursor++;continue;}
   const [x,y]=coordinate(index,c.n,c.bounds),cp=j.cp??(j.values[local*STRIDE+7]===-3?initial(x,y,c):unpack(j.values,local));
   advance(cp,c,eq,j.integrator,c.duration,256);pack(cp,j.values,local);j.cp=cp;
   if(cp.outcome>=0||cp.outcome===-2||cp.t>=c.duration-1e-9){j.cursor++;j.cp=null;}
  }
 }
 if(j.cursor>=j.count){postMessage({type:'tile',jobId:j.jobId,start:j.start,count:j.count,kind:j.kind,values:j.values,result:j.result});job=null;}
 else{if(performance.now()-j.last>400){postMessage({type:'partial',jobId:j.jobId,start:j.start,count:j.count,kind:j.kind,values:j.values,result:j.result,cursor:j.cursor});j.last=performance.now();}setTimeout(tick,0);}
}
function trajectory(m:any){const c=m.config as Config,eq=m.eq as Equilibrium[],points:any[]=[],cp=initial(m.x,m.y,c),integrator=new Integrator(c.physics),sep:number[][]=[];let next=0;const stride=Math.max(c.dt,c.duration/6000);let nb:ReturnType<typeof initial>|null=null;try{nb=initial(m.x+c.perturbation,m.y,c);}catch{/* An out-of-reach neighbour is unavailable, never simulated. */}
 function chunk(){const start=performance.now();while(cp.t<c.duration-1e-9&&cp.outcome===-1&&performance.now()-start<15){const target=Math.min(c.duration,cp.t+c.dt*64);while(cp.t<target-1e-11&&cp.outcome===-1){advance(cp,c,eq,integrator,Math.min(c.duration,cp.t+c.dt),1);if(nb)advance(nb,c,eq,integrator,cp.t,2,false);if(cp.t>=next||cp.outcome>=0||cp.t>=c.duration-1e-9){points.push(sample(cp,c.physics));sep.push([cp.t,nb?Math.hypot(cp.s[0]-nb.s[0],cp.s[1]-nb.s[1],cp.s[6]-nb.s[6]):NaN,nb?.s[0]??NaN,nb?.s[1]??NaN]);next+=stride;}}}
 if(cp.t>=c.duration-1e-9||cp.outcome!==-1){ // Continue neighbour to its own capture/horizon, independent of primary capture.
  finishNeighbour();return;
 }postMessage({type:'trajectory-progress',jobId:m.jobId,t:cp.t});setTimeout(chunk,0);}
 function finishNeighbour(){if(!nb){postMessage({type:'trajectory',jobId:m.jobId,points,sep,cp,neighbour:null});return;}const start=performance.now();while(nb.t<c.duration-1e-9&&nb.outcome===-1&&performance.now()-start<15)advance(nb,c,eq,integrator,c.duration,256);if(nb.t<c.duration-1e-9&&nb.outcome===-1){setTimeout(finishNeighbour,0);return;}postMessage({type:'trajectory',jobId:m.jobId,points,sep,cp,neighbour:nb});}
 points.push(sample(cp,c.physics));sep.push([0,nb?Math.hypot(cp.s[0]-nb.s[0],cp.s[1]-nb.s[1],cp.s[6]-nb.s[6]):NaN,nb?.s[0]??NaN,nb?.s[1]??NaN]);chunk();}


