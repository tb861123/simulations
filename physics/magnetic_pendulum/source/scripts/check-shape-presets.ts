import assert from 'node:assert/strict';
import {presets,presetConfig} from '../src/presets';
import {validate,equilibria,simulate,defaults} from '../src/physics';
assert.deepEqual(presetConfig('symmetric'),defaults());
for(const [name,,count] of presets){
 const c=presetConfig(name);validate(c);
 assert.equal(c.physics.magnets.length,count);
 const eq=equilibria(c.physics).filter(e=>e.stable);
 assert.ok(eq.length>0);
 const cp=simulate(.031,.08,{...c,duration:1},eq);
 assert.ok(cp.s.every(Number.isFinite));
 assert.notEqual(cp.outcome,-2);
 console.log(`${name}: ${count} magnets, ${eq.length} stable equilibria; finite 1 s trajectory`);
}
