import {schemeColour} from './palettes';
export const colors=Array.from({length:16},(_,i)=>schemeColour('soft',i<3?i/2:((i*7)%16)/15));
export function magnetColor(m:{color?:string}|undefined,index:number){return m?.color??colors[((index%colors.length)+colors.length)%colors.length];}
export function parseColour(text:string):string|null{
 const value=text.trim();
 if(/^#?[\da-f]{6}$/i.test(value))return '#'+value.replace('#','').toLowerCase();
 if(/^#?[\da-f]{3}$/i.test(value))return '#'+value.replace('#','').split('').map(c=>c+c).join('').toLowerCase();
 const rgb=value.match(/^(?:rgb\(\s*)?(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)?$/i);
 if(!rgb||rgb.slice(1).some(c=>Number(c)>255))return null;
 return '#'+rgb.slice(1).map(c=>Number(c).toString(16).padStart(2,'0')).join('');
}
