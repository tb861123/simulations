import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRK4Stepper,rk4,defaults,energy,rad,type State} from '../src/physics.ts';
test('allocation-free RK4 agrees with reference across parameters and rotations',()=>{
 for(const p of [defaults,{l1:.7,l2:1.8,m1:2,m2:.4,g:3.7}])for(const start of [[.1,.2,0,0],[2.8,-1.5,0,0],[0,0,20,25]]){
  let reference=[...start] as State;const data=new Float64Array([99,...start,88]),step=createRK4Stepper(p,.004);
  for(let i=0;i<2500;i++){reference=rk4(reference,.004,p);step(data,1);}
  for(let j=0;j<4;j++)assert.ok(Math.abs(data[j+1]-reference[j])<1e-8,`${j}: ${data[j+1]} vs ${reference[j]}`);
  assert.equal(data[0],99);assert.equal(data[5],88);
 }
});
test('optimised RK4 conserves energy over 30 seconds',()=>{const initial:State=[rad(170),rad(85),0,0],s=new Float64Array(initial),step=createRK4Stepper(defaults,.002);for(let i=0;i<15000;i++)step(s);assert.ok(Math.abs(energy(Array.from(s) as State).total-energy(initial).total)<2e-4);});
test('optimised state retains tiny initial differences',()=>{const a:State=[rad(100),0,0,0],b:State=[rad(100+1e-8),0,0,0],step=createRK4Stepper(defaults,.004);step(a);step(b);assert.notEqual(a[0],b[0]);});
