import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
import assert from 'node:assert/strict';
const file=fs.readdirSync(new URL('../dist/assets/',import.meta.url)).find(x=>x.startsWith('accuracy.worker-'));
const source=fs.readFileSync(new URL('../dist/assets/'+file,import.meta.url),'utf8');
function run(initial,duration){const messages=[],context={onmessage:null,postMessage:m=>messages.push(m)};vm.createContext(context);vm.runInContext(source,context);context.onmessage({data:{initial,duration,dt:.008,p:{l1:1,l2:1,m1:1,m2:1,g:9.81}}});return messages.at(-1);}
test('built accuracy worker resolves fourth-order convergence in regular motion',()=>{const r=run([.1,.15,0,0],2);assert.equal(r.type,'done');assert.equal(r.results.length,3);assert.ok(r.coarseError>r.fineError*10);assert.ok(r.ratio>10&&r.ratio<22);assert.ok(r.results[2].drift<r.results[0].drift);assert.ok(r.results.every(x=>x.flip===null));});
test('accuracy check reports actual rounded horizon and independent first flips',()=>{const r=run([2.9,2.8,0,0],3.001);assert.equal(r.duration,3);assert.ok(r.results.every(x=>Number.isFinite(x.drift)));assert.ok(r.results.every(x=>x.flip!==null&&x.flip>=0&&x.flip<=r.duration));assert.ok(Math.abs(r.results[1].flip-r.results[2].flip)<.01);});
