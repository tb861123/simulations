import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,force,potential,initial,advance,Integrator,compatibleKey,validate,equilibria} from '../src/physics';
import {referenceDerivative} from '../src/reference';
import {polarPosition,cartesianPosition} from '../src/polar';
import {createMap,portable,importPortable} from '../src/data';

test('legacy repulsive settings cannot silently reuse attraction-only results',()=>{
 const c=defaults();Object.assign(c.physics.magnets[0],{repel:true});assert.throws(()=>validate(c),/Older repulsive investigations/);
});
test('polar coordinates round-trip across quadrants and use degrees anticlockwise from +x',()=>{
 for(const xy of [[.1,.2],[-.1,.2],[-.1,-.2],[.1,-.2],[0,0]]){const p=polarPosition(...xy as [number,number]);const out=cartesianPosition(...p);out.forEach((v,i)=>assert.ok(Math.abs(v-xy[i])<1e-14));}
 assert.equal(polarPosition(0,1)[1],90);assert.equal(polarPosition(-1,0)[1],180);
 assert.ok(Math.abs(cartesianPosition(.5,-90)[1]+.5)<1e-14);
});
test('polar presentation survives portable saves; display mode does not invalidate physics',async()=>{
 const c=defaults(),key=compatibleKey(c);c.boardCoordinates='polar';assert.equal(compatibleKey(c),key);
 const m=createMap(c,equilibria(c.physics).filter(e=>e.stable)),loaded=await importPortable(portable(m));
 assert.equal(loaded.config.boardCoordinates,'polar');
});
