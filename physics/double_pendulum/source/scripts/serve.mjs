import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
const server=http.createServer((req,res)=>{try{const url=new URL(req.url,'http://localhost');const file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(!file.startsWith(root)){res.writeHead(403).end();return;}fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end('Not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});res.end(data);});}catch{res.writeHead(400).end('Bad request');}});
server.on('error',e=>{console.error(e.message);process.exitCode=1;});
server.listen(Number(process.env.LAB_PORT??4173),'127.0.0.1',()=>console.log(`Double Pendulum Chaos Lab\nOpen http://127.0.0.1:${server.address().port} in your browser.\nPress Ctrl+C to stop.`));
