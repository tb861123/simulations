import {writeFileSync} from 'node:fs';
import {defaults,equilibria} from '../src/physics';
import {createMap} from '../src/data';
import {Pool} from '../src/scheduler';
import {BrowserWorker} from '../tests/worker-adapter';
(globalThis as any).Worker=BrowserWorker;
const c=defaults(),eq=equilibria(c.physics).filter(e=>e.stable),rows:any[]=[];
for(const workers of [4,1]){const m=createMap(c,eq),pool=new Pool(),start=performance.now(),cpu=process.cpuUsage();let last=-1;try{await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>{pool.cancel();reject(Error('180 s wall-clock watchdog'));},180000);pool.start(m,workers,()=>{const tenth=Math.floor(m.completed/1000);if(tenth!==last){last=tenth;console.log(`${workers} workers: ${m.completed}/10000`);}if(pool.error){clearTimeout(timer);pool.cancel();reject(Error(pool.error));}if(pool.status==='complete'){clearTimeout(timer);resolve();}});});const elapsedMs=performance.now()-start,usage=process.cpuUsage(cpu);rows.push({workers,completed:m.completed,elapsedMs,cpuMs:(usage.user+usage.system)/1000,status:'complete'});}catch(e){rows.push({workers,completed:m.completed,elapsedMs:performance.now()-start,status:String(e)});}writeFileSync('BENCHMARK-REPEAT.json',JSON.stringify({generated:new Date().toISOString(),note:'Follow-up wall-clock and process CPU measurements after an unusually slow four-worker run in BENCHMARKS.json. Device scheduling/suspension was not controlled. These are Node worker_threads, not browser timings.',configuration:c,rows},null,2));}
