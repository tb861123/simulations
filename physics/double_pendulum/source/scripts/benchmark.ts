import {performance} from 'node:perf_hooks';
import {availableParallelism} from 'node:os';
import {rk4,createRK4Stepper,anglesAt,fullBounds,defaults} from '../src/physics.ts';
import {MapPool,clearMapCache} from '../src/map-pool.ts';
// @ts-ignore Test bridge runs real CPU worker threads using the built browser worker.
import {NodePort} from '../tests/node-port.mjs';
const median=(a:number[])=>{const s=[...a].sort((x,y)=>x-y),i=Math.floor(s.length/2);return s.length%2?s[i]:(s[i-1]+s[i])/2;};
const samples={reference:[] as number[],optimised:[] as number[]};let maxKernelDifference=0;
for(let trial=0;trial<5;trial++){
 const results:Float64Array[]=[];
 for(const method of ['reference','optimised'] as const){
  const out=new Float64Array(40*40*4),step=createRK4Stepper(defaults,.004),started=performance.now();
  for(let y=0;y<40;y++)for(let x=0;x<40;x++){let s=anglesAt(x,y,40,fullBounds);for(let k=0;k<500;k++){if(method==='reference')s=rk4(s,.004);else step(s);}out.set(s,(y*40+x)*4);}
  samples[method].push(performance.now()-started);results.push(out);
 }
 for(let i=0;i<results[0].length;i++)maxKernelDifference=Math.max(maxKernelDifference,Math.abs(results[0][i]-results[1][i]));
}
const j={mode:4,n:100,bounds:fullBounds,p:defaults,dt:.004,duration:5,palette:'Spectrum'};
function run(cores:number){clearMapCache();return new Promise<{ms:number;frame:any}>((resolve,reject)=>{let frame:any;const start=performance.now(),pool=new MapPool(()=>new NodePort() as unknown as Worker,cores);pool.onerror=e=>{pool.terminate();reject(new Error(e.message));};pool.onmessage=({data})=>{if(data.type==='frame')frame=data;else {pool.terminate();resolve({ms:performance.now()-start,frame});}};pool.postMessage({type:'init',job:j});pool.postMessage({type:'play',speed:1});});}
const single:number[]=[],parallel:number[]=[];let maxFlipDifference=0,workers=1;
for(let i=0;i<3;i++){const a=await run(2),b=await run(Math.min(5,availableParallelism()));single.push(a.ms);parallel.push(b.ms);workers=b.frame.workers;for(let k=0;k<a.frame.flips.length;k++)maxFlipDifference=Math.max(maxFlipDifference,Math.abs(a.frame.flips[k]-b.frame.flips[k]));}
console.log(JSON.stringify({node:process.version,logicalCpusAvailable:availableParallelism(),kernel:{workload:'1600 systems × 500 steps, dt=0.004; discard first of 5 runs',milliseconds:samples,medianReferenceMs:median(samples.reference.slice(1)),medianOptimisedMs:median(samples.optimised.slice(1)),speedup:median(samples.reference.slice(1))/median(samples.optimised.slice(1)),maxAbsoluteDifference:maxKernelDifference},workerPool:{workload:'100×100 first-flip map, 5 simulated seconds, dt=0.004; includes startup, colour, messages and assembly; caches cleared each run',workers,singleWorkerMs:single,parallelWorkerMs:parallel,speedup:median(single)/median(parallel),maxFlipTimeDifferenceSeconds:maxFlipDifference}},null,2));
