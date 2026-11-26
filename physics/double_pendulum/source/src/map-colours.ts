import {writeRGB,writeFlipRGB,driftRGB} from './palette.ts';
import type {MapJob} from './map-types';
export type ColourData={states?:Float64Array|null;flips?:Float64Array|null;growth?:Float64Array|null;peakDrift?:Float64Array|null};
// Display-only transform: does not integrate, mutate numerical data or change time.
export function colourMap(job:MapJob,data:ColourData,showDrift=false){
 const count=job.n*job.n,pixels=new Uint8ClampedArray(count*4),values=showDrift?data.peakDrift:job.mode===4?data.flips:job.mode===5?data.growth:data.states;
 if(!values||values.length!==count*(!showDrift&&job.mode<4?4:1))throw new Error('Map data is not ready for recolouring.');
 for(let i=0;i<count;i++){const o=i*4;
  if(showDrift)pixels.set(driftRGB(values[i],job.palette),o);
  else if(job.mode===4)writeFlipRGB(values[i],job.duration,pixels,o,job.palette);
  else if(job.mode===5)writeRGB((.72-Math.max(0,Math.min(8,values[i]))/8*.72)*Math.PI*2,0,job.palette,pixels,o);
  else writeRGB(values[o],values[o+1],job.palette,pixels,o);
  pixels[o+3]=255;
 }return pixels;
}
