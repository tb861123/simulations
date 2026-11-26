import {anglesAt,createRK4Stepper} from './physics';
import {energyBarrier} from './energy-barrier';
import {stateEnergy,growth} from './diagnostics';
import {writeRGB,writeFlipRGB} from './palette';
import type {MapJob,TileFrame,Checkpoint} from './map-types';
let job:MapJob,states:Float64Array,flips:Float64Array,peakDrift:Float64Array,pair:Float64Array|undefined,initialEnergy:Float64Array,forbidden:Uint8Array,time=0,rowStart=0,rowEnd=0,step:ReturnType<typeof createRK4Stepper>;
function send(publish:boolean,checkpoint=false){
 const m:TileFrame={type:'frame',time,rowStart,rowEnd,palette:job.palette},transfer:Transferable[]=[];
 if(publish){
  const pixels=new Uint8ClampedArray(flips.length*4);
  for(let i=0;i<flips.length;i++){
   const o=i*4;if(job.mode===4)writeFlipRGB(flips[i],job.duration,pixels,o,job.palette);else if(job.mode===5){const g=growth(states,pair!,o,job.p,job.perturbation??1e-7);writeRGB((.72-Math.max(0,Math.min(8,g))/8*.72)*Math.PI*2,0,job.palette,pixels,o);}else writeRGB(states[o],states[o+1],job.palette,pixels,o);pixels[o+3]=255;
  }
  m.pixels=pixels;transfer.push(pixels.buffer);
  if(job.mode<=3){m.states=states.slice();transfer.push(m.states.buffer);}
  if(job.mode===4){m.flips=flips.slice();transfer.push(m.flips.buffer);}
  m.peakDrift=peakDrift.slice();transfer.push(m.peakDrift.buffer);
  if(pair){m.growth=new Float64Array(flips.length);for(let i=0;i<flips.length;i++)m.growth[i]=growth(states,pair,i*4,job.p,job.perturbation??1e-7);transfer.push(m.growth.buffer);}
 }
 if(checkpoint){m.checkpoint={time,states:states.slice(),flips:flips.slice(),peakDrift:peakDrift.slice(),pair:pair?.slice()};transfer.push(m.checkpoint.states.buffer,m.checkpoint.flips.buffer,m.checkpoint.peakDrift!.buffer);if(m.checkpoint.pair)transfer.push(m.checkpoint.pair.buffer);}
 (self as unknown as {postMessage:(m:TileFrame,t:Transferable[])=>void}).postMessage(m,transfer);
}
function advance(target:number){
 const steps=Math.max(0,Math.round((target-time)/job.dt));
 for(let i=0;i<flips.length;i++){
  if(job.mode===4&&(flips[i]>=0||forbidden[i]))continue;
  const o=i*4;
  for(let k=0;k<steps;k++){
   const a=states[o],b=states[o+1];step(states,o);if(pair)step(pair,o);
   const scale=(job.p.m1+job.p.m2)*job.p.g*job.p.l1+job.p.m2*job.p.g*job.p.l2;
   const drift=100*Math.abs(stateEnergy(states,o,job.p)-initialEnergy[i])/Math.max(Math.abs(initialEnergy[i]),scale,1e-10);
   peakDrift[i]=Math.max(peakDrift[i],Number.isFinite(drift)?drift:Infinity);
   if(job.mode===4){
    let f=Infinity;
    if(Math.abs(a)>Math.PI||Math.abs(b)>Math.PI)f=0;
    else {
     if(states[o]>Math.PI&&a<=Math.PI)f=Math.min(f,(Math.PI-a)/(states[o]-a));
     if(states[o]<-Math.PI&&a>=-Math.PI)f=Math.min(f,(-Math.PI-a)/(states[o]-a));
     if(states[o+1]>Math.PI&&b<=Math.PI)f=Math.min(f,(Math.PI-b)/(states[o+1]-b));
     if(states[o+1]<-Math.PI&&b>=-Math.PI)f=Math.min(f,(-Math.PI-b)/(states[o+1]-b));
    }
    if(Number.isFinite(f)){flips[i]=time+k*job.dt+Math.max(0,Math.min(1,f))*job.dt;break;}
   }
  }
 }
 time=Math.round((time+steps*job.dt)/job.dt)*job.dt;
}
onmessage=e=>{
 const m=e.data;
 if(m.type==='init'||m.type==='task'){
  job=m.job;rowStart=m.rowStart??0;rowEnd=m.rowEnd??job.n;time=0;step=createRK4Stepper(job.p,job.dt);
  states=new Float64Array((rowEnd-rowStart)*job.n*4);flips=new Float64Array((rowEnd-rowStart)*job.n).fill(-1);peakDrift=new Float64Array(flips.length);initialEnergy=new Float64Array(flips.length);forbidden=new Uint8Array(flips.length);pair=job.mode===5?new Float64Array(states.length):undefined;
  const resume=m.resume as Checkpoint|undefined;
  if(resume){states.set(resume.states);flips.set(resume.flips);if(resume.peakDrift)peakDrift.set(resume.peakDrift);if(pair&&resume.pair)pair.set(resume.pair);time=resume.time;}
  else for(let y=rowStart;y<rowEnd;y++)for(let x=0;x<job.n;x++)states.set(anglesAt(x,y,job.n,job.bounds),((y-rowStart)*job.n+x)*4);
  for(let y=rowStart;y<rowEnd;y++)for(let x=0;x<job.n;x++){const i=(y-rowStart)*job.n+x,s=anglesAt(x,y,job.n,job.bounds);initialEnergy[i]=stateEnergy(s,0,job.p);if(job.mode===4)forbidden[i]=energyBarrier(s,job.p).neitherCanFlip?1:0;if(pair&&!resume?.pair){pair.set(s,i*4);pair[i*4]+=job.perturbation??1e-7;}}
  if(m.type==='task'){advance(Math.min(job.duration,m.target));send(m.publish,true);}else send(true,time>=job.duration-job.dt*1e-6&&job.mode>=4);
 }else if(m.type==='advance'){
  advance(Math.min(job.duration,m.target));send(m.publish,job.mode>=4&&time>=job.duration-job.dt*1e-6);
 }else if(m.type==='palette'){job.palette=m.palette;send(true);}
};
