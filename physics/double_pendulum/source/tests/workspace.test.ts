import {test} from 'node:test';
import assert from 'node:assert/strict';
import {angleFields,parseAngleFields,inspectPoint,visibleRegion,makeMapRun,setupChanged,sameBounds} from '../src/map-workspace.ts';
import {anglesAt,defaults,fullBounds,rad} from '../src/physics.ts';
import type {MapJob} from '../src/map-types';
const job:MapJob={mode:4,n:40,bounds:{x0:-90,x1:90,y0:-60,y1:60},p:{...defaults},dt:.004,duration:30,palette:'Spectrum'};

test('draft settings and view navigation do not mutate a launched calculation',()=>{
 const draft=structuredClone(job),run=makeMapRun(draft);
 draft.p.g=5;draft.n=100;draft.duration=120;draft.bounds.x0=-45;draft.palette='Ocean';
 assert.deepEqual(run.job,job);assert.equal(run.play,true);
 assert.equal(setupChanged(run.job,draft),true);
 assert.equal(sameBounds(run.job.bounds,draft.bounds),false);
 assert.equal(setupChanged(run.job,{...job,bounds:draft.bounds,palette:'Ocean'}),false);
 const next=makeMapRun(draft);assert.deepEqual(next.job,draft);
});
test('restoring a checkpoint keeps the calculation paused',()=>{
 const checkpoint={time:12,states:new Float64Array(job.n**2*4),flips:new Float64Array(job.n**2).fill(-1)};
 const run=makeMapRun(job,checkpoint);assert.equal(run.play,false);assert.equal(run.resume,checkpoint);
});
test('preview crops existing samples and leaves unsampled coverage blank',()=>{
 assert.deepEqual(visibleRegion(job.bounds,{x0:-180,x1:180,y0:-120,y1:120}),{sx:0,sy:0,sw:1,sh:1,dx:.25,dy:.25,dw:.5,dh:.5});
 assert.deepEqual(visibleRegion(job.bounds,{x0:-45,x1:45,y0:0,y1:60}),{sx:.25,sy:0,sw:.5,sh:.5,dx:0,dy:0,dw:1,dh:1});
 assert.equal(visibleRegion(job.bounds,{x0:100,x1:180,y0:-30,y1:30}),null);
});
test('inspection in a zoomed preview indexes the original map, not the requested grid',()=>{
 const view={x0:-45,x1:45,y0:0,y1:60};
 const p=inspectPoint(.25,.25,view,job);
 assert.equal(p.index,5*40+15);
 assert.deepEqual(p.initial,anglesAt(15,5,40,job.bounds));
 const outside=inspectPoint(.95,.25,fullBounds,job);
 assert.equal(outside.index,null);assert.deepEqual(outside.initial,[rad(162),rad(90),0,0]);
 assert.equal(inspectPoint(1,1,job.bounds,job).index,1599);
});
test('exact angle inputs reject incomplete, reversed and out-of-range drafts',()=>{
 const fields=angleFields(job.bounds);
 assert.deepEqual(parseAngleFields(fields),job.bounds);
 for(const x0 of ['','NaN','91','-181','90'])assert.equal(parseAngleFields({...fields,x0}),null);
 assert.deepEqual(parseAngleFields({...fields,x0:'-45.125'}),{...job.bounds,x0:-45.125});
});
