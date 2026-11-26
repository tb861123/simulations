// Inline the Vite build in dist/ (main JS, CSS and module workers) into one HTML file,
// ../magnetic-pendulum.html, that opens straight from disk. Run from source/: npm run build && node scripts/single-file.mjs
import {readFileSync,writeFileSync} from 'node:fs';
const dist='dist',out='../magnetic-pendulum.html',title='Magnetic Pendulum Chaos Lab';
const index=readFileSync(dist+'/index.html','utf8');
const jsPath=index.match(/src="([^" ]+\.js)"/)[1],cssPath=index.match(/href="([^" ]+\.css)"/)[1];
const meta=(index.match(/<meta name="description"[^>]*>/)||[''])[0];
let script=readFileSync(dist+jsPath,'utf8');
let n=0;
// Chrome refuses *module* workers from blob: URLs on a file:// page, so run the
// (import-free) worker bundles as classic workers, each from one shared blob URL.
const blobs=[];
script=script.replace(/new Worker\(new URL\("(\/assets\/[^" ]+\.js)",import\.meta\.url\),\{type:"module"\}\)/g,(_,p)=>{n++;let i=blobs.indexOf(p);if(i<0){i=blobs.length;blobs.push(p);}return `new Worker(__wb[${i}])`;});
script=`const __wb=[${blobs.map(p=>`URL.createObjectURL(new Blob([${JSON.stringify(readFileSync(dist+p,'utf8'))}],{type:"text/javascript"}))`).join(',')}];\n`+script;
script=script.replace(/<\/script/gi,'<\\/script');
const css=readFileSync(dist+cssPath,'utf8');
writeFileSync(out,`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0b1019">${meta}<title>${title}</title><style>${css}</style></head><body><div id="root"></div><script type="module">${script}</script></body></html>`);
console.log('workers inlined:',n);
