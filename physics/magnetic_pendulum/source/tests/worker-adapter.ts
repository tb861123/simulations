import {Worker as NodeWorker} from 'node:worker_threads';
import {buildSync} from 'esbuild';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
// Runs the actual browser worker implementation with only its message transport adapted.
mkdirSync('work',{recursive:true});
const workerPaths=Object.fromEntries(['compute','diagnostics'].map(kind=>{const bundled=buildSync({entryPoints:[`src/${kind}.worker.ts`],bundle:true,write:false,format:'esm',platform:'node',target:'node22'}).outputFiles[0].text,path=resolve(`work/node-${kind}-worker-${process.pid}.mjs`);writeFileSync(path,`import {parentPort} from 'node:worker_threads';globalThis.self=globalThis;globalThis.postMessage=(m)=>parentPort.postMessage(m);parentPort.on('message',m=>globalThis.onmessage({data:m}));\n${bundled}`);return [kind,path];}));
export class BrowserWorker {
 inner:NodeWorker;onmessage:((e:{data:any})=>void)|null=null;onerror:((e:{message:string})=>void)|null=null;
 constructor(kind:unknown='compute'){this.inner=new NodeWorker(workerPaths[kind==='diagnostics'?'diagnostics':'compute']);this.inner.on('message',data=>this.onmessage?.({data}));this.inner.on('error',e=>this.onerror?.({message:e.message}));}
 postMessage(m:any){this.inner.postMessage(m);}
 terminate(){void this.inner.terminate();}
}
