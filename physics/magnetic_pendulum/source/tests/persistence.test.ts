import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,equilibria,simulate} from '../src/physics';
import {createMap,pack,save,listSaved,loadSave,removeSave,STRIDE} from '../src/data';
test('IndexedDB round-trip, summary-only listing and deletion',async()=>{const c=defaults(),m=createMap(c,equilibria(c.physics).filter(e=>e.stable));pack(simulate(.03,.08,{...c,duration:5},m.equilibria),m.values,0);m.name='Persistence test';await save(m);const summaries=await listSaved();assert.ok(summaries.some(s=>s.id===m.id));assert.ok(!('values' in summaries[0]));const restored=await loadSave(m.id);assert.deepEqual(restored.values,m.values);assert.deepEqual(restored.divergence,m.divergence);assert.deepEqual(restored.config,m.config);await removeSave(m.id);assert.ok(!(await listSaved()).some(s=>s.id===m.id));await assert.rejects(loadSave(m.id));});
test('unavailable browser storage rejects saving, rather than returning success',async()=>{const previous=globalThis.indexedDB;Object.defineProperty(globalThis,'indexedDB',{value:{open(){throw new Error('Storage denied');}},configurable:true});const c=defaults(),m=createMap(c,[]);try{await assert.rejects(save(m),/Storage denied/);}finally{Object.defineProperty(globalThis,'indexedDB',{value:previous,configurable:true});}});
