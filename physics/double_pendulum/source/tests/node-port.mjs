import {Worker} from 'node:worker_threads';
import {source} from './worker-harness.mjs';
export class NodePort{
 onmessage=null;onerror=null;
 constructor(){this.worker=new Worker(new URL('./node-worker.mjs',import.meta.url),{workerData:{source}});this.worker.on('message',data=>this.onmessage?.({data}));this.worker.on('error',e=>this.onerror?.({message:e.message}));}
 postMessage(m,transfer=[]){this.worker.postMessage(m,transfer);}
 terminate(){this.worker.terminate();}
}
