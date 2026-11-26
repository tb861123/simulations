import {defaults,type Config} from './physics';

export const presets=[
 ['symmetric','Symmetric three magnets',3],
 ['square','Square · four magnets',4],
 ['pentagon','Pentagon · five magnets',5],
 ['hexagon','Hexagon · six magnets',6],
 ['heptagon','Heptagon · seven magnets',7],
 ['octagon','Octagon · eight magnets',8],
] as const;

export function presetConfig(name:string):Config{
 const preset=presets.find(p=>p[0]===name);
 if(!preset)throw Error('Unknown magnet configuration.');
 const c=defaults();
 if(preset[2]!==3)c.physics.magnets=Array.from({length:preset[2]},(_,i)=>{
  const angle=Math.PI/2+i*2*Math.PI/preset[2];
  return {x:.12*Math.cos(angle),y:.12*Math.sin(angle),k:.02};
 });
 return c;
}
