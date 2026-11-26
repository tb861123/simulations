// Browser worker protocol bridge for true parallel CPU tests/benchmarks in Node.
import {parentPort,workerData} from 'node:worker_threads';
import vm from 'node:vm';
globalThis.self=globalThis;globalThis.onmessage=null;
globalThis.postMessage=(m,transfer=[])=>parentPort.postMessage(m,transfer);
vm.runInThisContext(workerData.source);
parentPort.on('message',data=>globalThis.onmessage({data}));
