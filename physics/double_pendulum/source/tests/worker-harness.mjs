import fs from 'node:fs';
import vm from 'node:vm';
const filename=fs.readdirSync(new URL('../dist/assets/',import.meta.url)).find(x=>x.startsWith('map.worker-'));
export const source=fs.readFileSync(new URL('../dist/assets/'+filename,import.meta.url),'utf8');
export function harness(job,rowStart=0,rowEnd=job.n,resume){
 const messages=[],context={Float64Array,Uint8ClampedArray,Math,Number,Array,Infinity,onmessage:null,postMessage:(m,transfer)=>messages.push(structuredClone(m,{transfer}))};
 context.self=context;vm.createContext(context);vm.runInContext(source,context);
 const send=m=>{context.onmessage({data:m});return messages.at(-1);};
 send({type:'init',job,rowStart,rowEnd,resume});return {send,messages};
}
export const job=(mode=4,duration=1,n=8)=>({mode,n,bounds:{x0:-180,x1:180,y0:-180,y1:180},p:{l1:1,l2:1,m1:1,m2:1,g:9.81},dt:.004,duration,palette:'Spectrum'});
