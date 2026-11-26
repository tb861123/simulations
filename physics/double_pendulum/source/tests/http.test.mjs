import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
test('production launcher serves page, module and worker',async()=>{
 const p=spawn(process.execPath,['scripts/serve.mjs'],{stdio:['ignore','pipe','pipe'],env:{...process.env,LAB_PORT:'0'}});
 try{
  const output=await new Promise((resolve,reject)=>{p.once('error',reject);p.stderr.once('data',v=>reject(new Error(String(v))));p.stdout.once('data',v=>resolve(String(v)));});
  const base=output.match(/http:\/\/127\.0\.0\.1:\d+/)[0],r=await fetch(base);assert.equal(r.status,200);const html=await r.text();assert.match(html,/Double Pendulum Chaos Lab/);
  const js=html.match(/src="([^"]+\.js)"/)[1],asset=await fetch(base+js);assert.equal(asset.status,200);assert.match(asset.headers.get('content-type'),/javascript/);
  const worker=fs.readdirSync('dist/assets').find(x=>x.startsWith('map.worker-'));const w=await fetch(base+'/assets/'+worker);assert.equal(w.status,200);assert.match(w.headers.get('content-type'),/javascript/);
 }finally{p.kill();}
});
