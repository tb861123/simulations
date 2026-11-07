// Turns dist/index.html + assets into ONE self-contained HTML file (the repository convention for simulations).
// The compute worker is already inlined by Vite (?worker&inline), so the result works from file:// in Chrome / Edge.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, '../dist');
let html = readFileSync(join(dist, 'index.html'), 'utf8');
const esc = (s) => s.replace(/<\/(script|style)/gi, '<\\/$1');
html = html.replace(/<link rel="stylesheet"[^>]*href="\.\/(assets\/[^"]+\.css)"[^>]*>/g, (_, f) => `<style>${esc(readFileSync(join(dist, f), 'utf8'))}</style>`);
let script = '';
html = html.replace(/<script type="module"[^>]*src="\.\/(assets\/[^"]+\.js)"[^>]*><\/script>/g, (_, f) => { script += esc(readFileSync(join(dist, f), 'utf8')); return ''; });
if (!script) throw new Error('no module script found in dist/index.html');
html = html.replace('</body>', () => `<script type="module">${script}</script></body>`); // function form: the script contains $& / $' sequences
// The shared VIEW BAR block (Hide controls / Hide readouts / Full screen), copied unchanged from the other
// simulations into ../viewbar.html. Its script becomes a module so that it runs AFTER the app module above
// (modules run in document order) and finds the panels the app has rendered.
const viewbar = readFileSync(resolve(here, '../viewbar.html'), 'utf8').replace('<script>', '<script type="module">');
html = html.replace('</body>', () => viewbar + '</body>');
const out = resolve(here, '../../three-body-chaos.html');
writeFileSync(out, html);
console.log('wrote', out, (html.length / 1048576).toFixed(2), 'MB;', readdirSync(join(dist, 'assets')).length, 'asset files inlined');
