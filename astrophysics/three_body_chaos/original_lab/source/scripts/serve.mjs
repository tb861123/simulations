// Tiny local HTTP server for the supplied build (Node.js only, no npm install needed).
//   node source/scripts/serve.mjs            -> http://127.0.0.1:4173/
// Serving over HTTP is the recommended way to run the lab (stable origin for saved investigations);
// opening three-body-chaos.html directly also works in Chrome / Edge.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');     // the three_body_chaos folder
const port = Number(process.env.PORT) || 4173;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.gz': 'application/gzip', '.png': 'image/png', '.md': 'text/markdown; charset=utf-8', '.csv': 'text/csv' };

const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent((req.url ?? '/').split('?')[0]);
    if (p === '/' || p === '') p = '/three-body-chaos.html';
    const file = normalize(join(root, p));
    if (!file.startsWith(root) || /[\\/]node_modules[\\/]/.test(file)) { res.writeHead(403).end('forbidden'); return; }
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' }).end(body);
  } catch { res.writeHead(404).end('not found'); }
});
server.listen(port, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${port}/`;
  console.log(`Three-Body Chaos Lab is running at ${url}\nKeep this window open while you use the lab. Press Ctrl+C to stop.`);
  if (!process.env.NO_OPEN) { const cmd = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`; exec(cmd, () => {}); }
});
server.on('error', (e) => { console.error(e.code === 'EADDRINUSE' ? `Port ${port} is busy: set another with  set PORT=4180  and run again.` : e.message); process.exit(1); });
