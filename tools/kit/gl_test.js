// Headless check of the K.gl helper: node gl_test.js  (from this folder; needs Playwright). Exits non-zero on failure.
const path = require("path"), { chromium } = require("playwright");
(async () => {
  let bad = 0;
  for (const [args, q] of [[["--use-gl=swiftshader", "--enable-unsafe-swiftshader"], ""], [["--use-gl=swiftshader", "--enable-unsafe-swiftshader"], "?webgl1"], [["--disable-gpu", "--disable-webgl"], ""]]) {
    const b = await chromium.launch({ args }), p = await b.newPage(), errs = [];
    p.on("pageerror", e => errs.push(String(e))); p.on("console", m => m.type() === "error" && errs.push(m.text()));
    await p.goto("file://" + path.join(__dirname, "gl_test.html") + q); await p.waitForTimeout(500);
    const r = await p.evaluate(() => window.result), txt = await p.evaluate(() => document.body.innerText);
    console.log("\n== " + args.join(" ") + " " + q + "\n" + txt.trim());
    if (args.includes("--disable-webgl")) { if (r.ok || !/needs WebGL/.test(txt)) { bad++; console.log("FAIL: no fallback message"); } }
    else {
      const ok = r.ok && Math.abs(r.total - 1) < 0.01 && r.centre < 0.2 && /did not compile/.test(r.err) && r.png > 2000;
      if (!ok) { bad++; console.log("FAIL", JSON.stringify(r)); }
      await p.screenshot({ path: path.join(process.env.SHOT_DIR || "/tmp", "gl_test" + (q ? "_1" : "") + ".png") });
    }
    if (errs.length) { bad++; console.log("page errors:", errs); }
    await b.close();
  }
  console.log(bad ? `\n${bad} problem(s)` : "\nK.gl: all checks passed"); process.exit(bad ? 1 : 0);
})();
