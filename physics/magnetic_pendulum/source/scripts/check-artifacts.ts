import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {importPortable,STRIDE} from '../src/data';
const m=await importPortable(new Blob([readFileSync('default-investigation.mplab')]));console.log({resolution:m.config.n,completed:m.completed,checkpointColumns:STRIDE,checked:Array.from({length:m.config.n**2},(_,i)=>m.values[i*STRIDE+26]).filter(x=>x>0).length});
const html=readFileSync('standalone.html','utf8');if(html.includes('/assets/'))throw Error('Unembedded asset reference');const script=html.match(/<script type="module">([\s\S]*)<\/script>/)?.[1];if(!script)throw Error('Missing embedded module');mkdirSync('work',{recursive:true});writeFileSync('work/standalone-syntax.mjs',script);
