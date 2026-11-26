import {readFileSync,writeFileSync} from 'node:fs';
import {basename} from 'node:path';
const index=readFileSync('dist/index.html','utf8'),jsPath=index.match(/src="([^" ]+\.js)"/)[1],cssPath=index.match(/href="([^" ]+\.css)"/)[1];
let script=readFileSync('dist'+jsPath,'utf8');
script=script.replace(/new URL\("(\/assets\/[^" ]+\.js)",import\.meta\.url\)/g,(_,path)=>`URL.createObjectURL(new Blob([${JSON.stringify(readFileSync('dist'+path,'utf8'))}],{type:"text/javascript"}))`);
script=script.replace(/<\/script/gi,'<\\/script');
const css=readFileSync('dist'+cssPath,'utf8');
writeFileSync('standalone.html',`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#10151e"><title>Magnetic Pendulum · Offline Lab</title><style>${css}</style></head><body><div id="root"></div><script type="module">${script}</script></body></html>`);
console.log('Created standalone.html: same built application and embedded worker source; no HTTP server required. File-origin storage remains browser-dependent.');
