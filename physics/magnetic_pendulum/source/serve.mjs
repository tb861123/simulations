import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const root=fileURLToPath(new URL('./dist/',import.meta.url));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'};
const port=Number(process.env.PORT)||4173;
const server=http.createServer(async(req,res)=>{
 try{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const target=path.resolve(root,relative==='/'?'index.html':'.'+relative);
  if(!target.startsWith(path.resolve(root)+path.sep)){res.writeHead(403);res.end();return;}
  const bytes=await readFile(target);res.setHeader('Content-Type',mime[path.extname(target)]||'application/octet-stream');res.setHeader('Cache-Control','no-cache');res.setHeader('X-Content-Type-Options','nosniff');res.end(req.method==='HEAD'?undefined:bytes);
 }catch{res.writeHead(404);res.end('File not found. Run npm run build if dist is missing.');}
});
server.on('error',e=>{console.error(`Could not open local server: ${e.message}`);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>{const url=`http://127.0.0.1:${port}/`;console.log(`\nMagnetic Pendulum Chaos Lab\n${url}\nKeep this window open. Ctrl+C stops the server.\n`);if(process.argv.includes('--open')){const cmd=process.platform==='win32'?'cmd.exe':process.platform==='darwin'?'open':'xdg-open',args=process.platform==='win32'?['/c','start','',url]:[url];spawn(cmd,args,{windowsHide:true,stdio:'ignore'}).on('error',()=>console.log('Open the URL above in a browser.'));}});
export {server};
