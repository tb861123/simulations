import {type Config,initial,advance,Integrator,sample,coordinate} from './physics';
import {AdaptiveReference,updateReference} from './reference';
import {confidenceCode} from './confidence';
self.onmessage=async(e:MessageEvent)=>{const {config:c,eq,x,y,type,indices,baselines,rtol=1e-10,atol=1e-12}=e.data;const rows:any[]=[],count=type==='confidence'?indices.length:type==='region'?16:type==='reference'?2:3;
 try{for(let i=0;i<count;i++){
  const point=type==='confidence'?coordinate(indices[i],c.n,c.bounds):type==='region'?coordinate(i,4,c.bounds):[x,y],runs=type==='region'?[c.dt,c.dt/2]:type==='confidence'?[c.dt/2,c.dt/4]:[type==='reference'?c.dt:c.dt/2**i],results:any[]=[];
  for(const dt of runs){const cfg={...c,dt} as Config,cp=initial(point[0],point[1],cfg),reference=type==='reference'&&i===1?new AdaptiveReference(cfg.physics,rtol,atol):null,integrator=new Integrator(cfg.physics);
   while(cp.t<c.duration-1e-9&&cp.outcome===-1){if(reference){for(let step=0;step<64&&cp.t<c.duration-1e-9&&cp.outcome===-1;step++)updateReference(cp,cfg,eq,reference,Math.min(c.duration,cp.t+cfg.dt));}else{const started=performance.now();do{advance(cp,cfg,eq,integrator,c.duration,512);}while(cp.t<c.duration-1e-9&&cp.outcome===-1&&performance.now()-started<14);}postMessage({type:'progress',progress:(i+Math.min(1,cp.t/c.duration))/count});await new Promise(r=>setTimeout(r,0));}
   results.push({method:reference?'Adaptive DP5(4)':'RK4',dt,outcome:cp.outcome,time:cp.convergence,state:Array.from(cp.s),length:cp.s[5],reversals:cp.reversals,residual:cp.maxResidual,impacts:cp.impacts,impactLoss:cp.impactLoss,accepted:reference?.accepted,rejected:reference?.rejected,rtol:reference?rtol:undefined,atol:reference?atol:undefined,final:sample(cp,cfg.physics)});
  }
  rows.push({point,results});if(type==='confidence'){const code=confidenceCode(baselines[i],results[0].outcome,results[1].outcome);postMessage({type:'confidence-sample',index:indices[i],code,completed:i+1,total:count,row:rows[rows.length-1]});}
 }postMessage({type:'done',kind:type,rows});}catch(error){postMessage({type:'error',message:String(error)});}
};
