import test from 'node:test';
import assert from 'node:assert/strict';
import {palettes,recolour,schemeColour} from '../src/palettes';
import {defaults,equilibria,compatibleKey} from '../src/physics';
import {createMap,portable,importPortable,canExtend} from '../src/data';
test('schemes preserve physics, cached progress and portable colour settings',async()=>{
 const c=defaults(),m=createMap(c,equilibria(c.physics).filter(e=>e.stable)),key=compatibleKey(c);
 for(const scheme of palettes){
  const updated={...c,palette:scheme.id,physics:{...c.physics,magnets:recolour(c.physics.magnets,scheme.id)}};
  assert.equal(compatibleKey(updated),key);assert.ok(canExtend(m,updated));
  for(const magnet of updated.physics.magnets)assert.match(magnet.color!,/^#[0-9a-f]{6}$/);
 }
 m.config={...c,palette:'forest',physics:{...c.physics,magnets:recolour(c.physics.magnets,'forest')}};
 const loaded=await importPortable(portable(m));assert.deepEqual(loaded.config,m.config);
});
test('palette ramps clamp endpoints and interpolate valid continuous colours',()=>{
 for(const p of palettes){assert.equal(schemeColour(p.id,-1),p.stops[0]);assert.equal(schemeColour(p.id,2),p.stops[2]);for(let j=0;j<=100;j++)assert.match(schemeColour(p.id,j/100),/^#[0-9a-f]{6}$/);}
});
