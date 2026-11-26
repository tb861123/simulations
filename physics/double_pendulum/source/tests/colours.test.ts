import {test} from 'node:test';
import assert from 'node:assert/strict';
import {colourMap} from '../src/map-colours.ts';
import {flipRGB,growthRGB,driftRGB} from '../src/palette.ts';
import {MapPool,clearMapCache} from '../src/map-pool.ts';
// @ts-ignore Production worker test bridge.
import {NodePort} from './node-port.mjs';
// @ts-ignore Production worker harness.
import {job,harness} from './worker-harness.mjs';
test('all map palettes recolour retained numerical data without mutating it',()=>{
 for(const mode of [2,3,4,5]){const j=job(mode,1,8),f=harness(j).send({type:'advance',target:1,publish:true}),data={states:f.states,flips:f.flips,growth:f.growth,peakDrift:f.peakDrift},copy=structuredClone(data);const spectrum=colourMap(j,data),ocean=colourMap({...j,palette:'Ocean'},data),ember=colourMap({...j,palette:'Ember'},data);assert.deepEqual(spectrum,f.pixels);assert.notDeepEqual(ocean,spectrum);assert.notDeepEqual(ember,ocean);assert.deepEqual(data,copy);assert.deepEqual(colourMap(j,data),spectrum);}
});
test('recoloured first-flip, divergence and drift images agree with their legends',()=>{
 const j=job(4,30,2),flips=new Float64Array([-1,1,10,30]),g=new Float64Array([0,2,4,8]),d=new Float64Array([0,1e-6,.01,.2]);for(const palette of ['Spectrum','Ocean','Ember']){const f=colourMap({...j,palette},{flips}),v=colourMap({...j,mode:5,palette},{growth:g}),e=colourMap({...j,palette},{peakDrift:d},true);for(let i=0;i<4;i++){assert.deepEqual(Array.from(f.slice(i*4,i*4+3)),flipRGB(flips[i],30,palette));assert.deepEqual(Array.from(v.slice(i*4,i*4+3)),growthRGB(g[i],palette));assert.deepEqual(Array.from(e.slice(i*4,i*4+3)),driftRGB(d[i],palette));assert.equal(f[i*4+3],255);}assert.deepEqual(Array.from(f.slice(0,3)),[232,237,239]);assert.deepEqual(Array.from(e.slice(12,15)),[255,70,170]);}
});
test('palette changes send no calculation tasks and preserve a completed checkpoint',async()=>{
 clearMapCache();let tasks=0,frames=0,done=0;const ports:NodePort[]=[];const pool=new MapPool(()=>{const port=new NodePort(),send=port.postMessage.bind(port);port.postMessage=(m:any,t:any[])=>{if(m.type==='task')tasks++;send(m,t);};ports.push(port);return port as unknown as Worker;},3);
 try{await new Promise<void>((resolve,reject)=>{pool.onerror=e=>reject(new Error(e.message));pool.onmessage=({data})=>{if(data.type==='frame')frames++;if(data.type==='done'){done++;resolve();}};pool.postMessage({type:'init',job:job(4,.08,8)});pool.postMessage({type:'play',speed:1});});const before=await pool.getSnapshot(),counts={tasks,frames,done};for(const palette of ['Ocean','Ember','Spectrum'])pool.postMessage({type:'palette',palette});await new Promise(resolve=>setTimeout(resolve,30));assert.deepEqual({tasks,frames,done},counts);assert.deepEqual(await pool.getSnapshot(),before);}finally{pool.terminate();clearMapCache();}
});
test('a paused partial map is recoloured without advancing its clock or scheduling tiles',async()=>{
 clearMapCache();let tasks=0;const pool=new MapPool(()=>{const p=new NodePort(),send=p.postMessage.bind(p);p.postMessage=(m:any,t:any[])=>{if(m.type==='task')tasks++;send(m,t);};return p as unknown as Worker;},2);
 try{await new Promise<void>((resolve,reject)=>{pool.onerror=e=>reject(new Error(e.message));pool.onmessage=({data})=>{if(data.type==='frame'&&data.time===.04)resolve();};pool.postMessage({type:'init',job:job(4,1,8)});pool.postMessage({type:'step'});});const before=await pool.getSnapshot(),count=tasks;pool.postMessage({type:'palette',palette:'Ocean'});await new Promise(resolve=>setTimeout(resolve,20));const after=await pool.getSnapshot();assert.equal(after.time,.04);assert.equal(tasks,count);assert.deepEqual(after,before);}finally{pool.terminate();clearMapCache();}
});
