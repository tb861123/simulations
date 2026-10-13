// Independent check: click every one-click batch experiment in a simulation,
// run it, wait until the panel stops changing, record time + panel text + screenshot.
const { chromium } = require('playwright');
// Reads the experiment's question, the panel set-up (label = value) and the note.
function getInfo(i) {
  const box = document.querySelector('[data-batchbox]');
  const btn = box.querySelector(`[data-exp="${i}"]`);
  const clean = el => { const c = el.cloneNode(true); c.querySelectorAll('select,input,option,button').forEach(x => x.remove()); return c.textContent.replace(/\s+/g, ' ').trim(); };
  const lab = e => { const l = e.id && box.querySelector(`label[for="${e.id}"]`); if (l) return clean(l);
    const par = e.closest('label'); if (par) return clean(par);
    let s = e.previousElementSibling; while (s && !/LABEL|SPAN|DIV|B|STRONG/.test(s.tagName)) s = s.previousElementSibling;
    if (s && clean(s).length && clean(s).length < 60) return clean(s);
    const pp = e.parentElement; if (pp && clean(pp).length < 60 && clean(pp).length) return clean(pp);
    return e.id; };
  const setup = [...box.querySelectorAll('select, input')].filter(e => e.offsetParent && e.type !== 'checkbox' && e.type !== 'hidden').map(e =>
    [lab(e), e.tagName === 'SELECT' ? (e.options[e.selectedIndex] || {}).text : e.value]);
  const mode = [...box.querySelectorAll('button.on')].map(b => b.textContent.trim()).find(t => /^(Repeat|Sweep)$/.test(t))
    || setup.map(s => s[1]).find(v => /^(Repeat|Sweep)/.test(v || ''));
  // the explanation lives in one of these boxes, depending on the simulation; take the longest real one
  const cands = ['bnote', 'bNote', 'b_note', 'bInfo'].map(id => document.getElementById(id)).filter(e => e && !/^(Running|Ready)/.test(e.innerText.trim()));
  const noteEl = cands.sort((a, b) => b.innerText.length - a.innerText.length)[0];
  const lines = btn.innerText.split('\n').map(s => s.trim()).filter(Boolean);
  return { q: lines[0], sub: lines.slice(1).join(' '), mode, setup, note: noteEl ? noteEl.innerText.trim() : '' };
}

const fs = require('fs');
const path = require('path');
process.chdir(__dirname);   // runs/ and shots/ go next to this script
fs.mkdirSync('runs', { recursive: true }); fs.mkdirSync('shots', { recursive: true });
const [fileArg, throttle = '1', only = ''] = process.argv.slice(2);
const file = path.resolve(fileArg);
const name = file.split('/').slice(-2)[0];
const STABLE = /planet_formation/.test(file) ? 25000 : 4000;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  if (+throttle > 1) { const c = await p.context().newCDPSession(p); await c.send('Emulation.setCPUThrottlingRate', { rate: +throttle }); }
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + file); await p.waitForTimeout(800);
  await p.evaluate(() => [...document.querySelectorAll('button')].find(x => /batch/i.test(x.textContent)).click());
  await p.waitForTimeout(500);
  // the overlay = nearest ancestor of the run button that also contains the experiment buttons
  const exps = await p.evaluate(() => {
    const run = document.getElementById('bRun') || document.getElementById('b_run') || document.getElementById('bGo');
    const skip0 = /^(Repeat|Sweep|✕|▶|■|⬇|Use the current)/;
    const nExp = e => [...e.querySelectorAll('button')].filter(x => !x.id && x.offsetParent && !skip0.test(x.textContent.trim())).length;
    let box = run; while (box && !(box.offsetWidth > 600 && box.offsetHeight > 400 && nExp(box) >= 3)) box = box.parentElement;
    box.setAttribute('data-batchbox', '1');
    const skip = /^(Repeat|Sweep|✕|▶|■|⬇|Use the current)/;
    const bs = [...box.querySelectorAll('button')].filter(x => !x.id && x.offsetParent && !skip.test(x.textContent.trim()));
    bs.forEach((x, i) => x.setAttribute('data-exp', i));
    return bs.map(x => x.innerText.replace(/\s+/g, ' ').trim());
  });
  const out = [];
  for (let i = 0; i < exps.length; i++) {
    if (only && !only.split(',').includes(String(i))) continue;
    await p.click(`[data-exp="${i}"]`); await p.waitForTimeout(400);
    const cfg = await p.evaluate(() => [...document.querySelectorAll('[data-batchbox] select, [data-batchbox] input')].filter(e => e.offsetParent).map(e => (e.id || '?') + '=' + (e.tagName === 'SELECT' ? e.options[e.selectedIndex]?.text : e.type === 'checkbox' ? e.checked : e.value)).join(' | '));
    const pre = await p.evaluate(getInfo, i);
    const t0 = Date.now();
    await p.evaluate(() => { const r = document.getElementById('bRun') || document.getElementById('b_run') || document.getElementById('bGo'); if (!r.disabled) r.click(); });
    // wait until the panel text has not changed for STABLE ms (cap 15 min)
    let last = '', since = Date.now();
    while (Date.now() - t0 < 900000) {
      await p.waitForTimeout(500);
      const t = await p.evaluate(() => document.querySelector('[data-batchbox]').innerText);
      if (t !== last) { last = t; since = Date.now(); } else if (Date.now() - since > STABLE) break;
    }
    const secs = (since - t0) / 1000;
    await p.screenshot({ path: `shots/${name}-${i}.png` });
    const post = await p.evaluate(getInfo, i);
    out.push({ i, q: exps[i], cfg, secs, text: last, setup: pre.setup, mode: pre.mode, qline: pre.q, sub: pre.sub, notePre: pre.note, note: post.note });
    console.log(`${name} #${i} ${secs.toFixed(1)}s  ${exps[i].slice(0, 60)}`);
  }
  fs.writeFileSync(`runs/${name}${+throttle > 1 ? '-x' + throttle : ''}.json`, JSON.stringify({ file, errs, out }, null, 1));
  console.log(`${name} done, errors: ${errs.length}`);
  await b.close();
})();
