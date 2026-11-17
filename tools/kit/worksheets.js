// Teacher-side: writes worksheets.html beside every ★ enhanced simulation (or the ones named).
// One printable sheet per investigation card and per batch experiment, then teacher notes with
// each batch experiment's result from a test run (fixed seeds, so the numbers are reproducible).
// Run from this folder after `node build.js`:   node worksheets.js            (all)
//                                                node worksheets.js waves enzymes   (some, by folder name)
// Needs Playwright (the same Chromium the tests use).
const fs = require("fs"), path = require("path"), { chromium } = require("playwright");
const src = fs.readFileSync(path.join(__dirname, "build.js"), "utf8");
const SIMS = [...src.matchAll(/\["([a-z_]+)\.js", "([a-z_]+)", "([a-z-]+\.html)", "[^"]*", "([a-z_]+)"\]/g)].map(m => ({ folder: m[2], file: m[3], subject: m[4] }));
const want = process.argv.slice(2), list = want.length ? SIMS.filter(s => want.includes(s.folder)) : SIMS;
(async () => {
  const b = await chromium.launch(); let next = 0;
  const worker = async () => {
    while (next < list.length) {
      const s = list[next++], dir = path.join(__dirname, "..", "..", s.subject, s.folder), t0 = Date.now();
      const p = await b.newPage(); const errs = []; p.on("pageerror", e => errs.push(String(e).slice(0, 200)));
      try {
        await p.goto("file://" + path.join(dir, s.file)); await p.waitForTimeout(600);
        const html = await p.evaluate(file => { const ui = K.ui, o = ui.config, results = {}; for (const e of o.batch || []) { try { results[e.title] = K.batchSummary(e); } catch (er) { results[e.title] = "(could not run: " + er.message + ")"; } } return K.worksheetDoc(o, ui.allPicks(), { file, results }); }, s.file);
        fs.writeFileSync(path.join(dir, "worksheets.html"), html);
        console.log(`${s.folder}: ${((Date.now() - t0) / 1000).toFixed(0)} s${errs.length ? " ERRORS " + errs.join(" | ") : ""}`);
      } catch (e) { console.log(`${s.folder}: FAILED ${String(e).slice(0, 200)}`); }
      await p.close();
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]); await b.close();
})();
