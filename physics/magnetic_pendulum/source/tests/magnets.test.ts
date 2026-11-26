import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,validate,force,equilibria,compatibleKey} from '../src/physics';
import {createMap,portable,importPortable} from '../src/data';
import {parseColour,magnetColor} from '../src/magnet-colour';

test('colour entry accepts Hex and RGB and rejects invalid channels',()=>{
 assert.equal(parseColour('#Ab12Cd'),'#ab12cd');
 assert.equal(parseColour('#abc'),'#aabbcc');
 assert.equal(parseColour('rgb(18, 171, 52)'),'#12ab34');
 assert.equal(parseColour('18, 171, 52'),'#12ab34');
 for(const bad of ['256,0,0','-1,0,0','#zz1234','red',''])assert.equal(parseColour(bad),null);
 assert.equal(magnetColor({color:'#12ab34'},10),'#12ab34');
 const original=defaults(),recoloured=defaults();recoloured.physics.magnets[0].color='#12ab34';
 assert.equal(compatibleKey(original),compatibleKey(recoloured),'appearance must not invalidate computed physics');
 const c=defaults();c.physics.magnets[0].color='invalid';assert.throws(()=>validate(c));
});

test('variable magnet counts validate, contribute force and invalidate cached maps',()=>{
 const c=defaults(),before=force(.02,.03,c.physics);
 c.physics.magnets.push({x:.07,y:-.09,k:.013});
 validate(c);
 assert.notDeepEqual(force(.02,.03,c.physics),before);
 assert.notEqual(compatibleKey(c),compatibleKey(defaults()));
 c.physics.magnets=c.physics.magnets.slice(0,1);validate(c);
 c.physics.magnets=Array.from({length:16},(_,i)=>({x:i*.01,y:0,k:.001}));validate(c);
 c.physics.magnets.push({x:0,y:0,k:0});assert.throws(()=>validate(c),/1 and 16/);
 c.physics.magnets=[];assert.throws(()=>validate(c),/1 and 16/);
});

test('additional magnets retain coordinates and strengths in portable investigations',async()=>{
 const c=defaults();c.physics.magnets.push({x:.04321,y:-.08765,k:.01234,color:'#12ab34'});
 const m=createMap(c,equilibria(c.physics).filter(e=>e.stable));
 const restored=await importPortable(portable(m));
 assert.deepEqual(restored.config.physics.magnets,c.physics.magnets);
});
