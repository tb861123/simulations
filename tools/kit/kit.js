"use strict";
/* =====================================================================
   K: the small shared toolkit behind the ★ enhanced simulations.
   It builds the page frame (header, stage, chart dock, side panel),
   the sliders and buttons, the live charts, the Investigations cards
   and the Batch run window. Each simulation's own code (below this
   script in the page) holds the science.
   ===================================================================== */
const K = (() => {
  const $ = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const col = i => cssVar("--s" + (i % 6));
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;

  // ---- Repeatable random numbers: the same seed always gives the same run ----
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    const r = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    r.gauss = () => { let u = 0; while (!u) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283185307179586 * r()); };
    r.int = n => Math.floor(r() * n);
    r.pick = arr => arr[Math.floor(r() * arr.length)];
    return r;
  }
  // ---- Simple statistics ----
  const mean = a => a.reduce((s, v) => s + v, 0) / (a.length || 1);
  const sd = a => { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) * (v - m), 0) / (a.length - 1)); };
  const se = a => sd(a) / Math.sqrt(a.length || 1);
  function linfit(pts) { // least-squares straight line through [x,y] points
    const n = pts.length, mx = mean(pts.map(p => p[0])), my = mean(pts.map(p => p[1]));
    let sxy = 0, sxx = 0, syy = 0; for (const [x, y] of pts) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; syy += (y - my) ** 2; }
    const m = sxy / (sxx || 1); return { m, c: my - m * mx, r: sxy / Math.sqrt((sxx * syy) || 1), n };
  }
  function download(name, text) { const a = $("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
  const sig = (v, n = 3) => { if (v == null || !isFinite(v)) return "–"; if (v === 0) return "0"; const a = Math.abs(v); if (a >= 1e5 || a < 1e-3) return v.toExponential(n - 1); return String(+v.toPrecision(n)); };

  // ---- Controls ----
  function slider(parent, o) {
    const w = $("div", "k-ctl"), lab = $("label"), name = $("span", "", o.label), val = $("b"), inp = $("input");
    inp.type = "range"; inp.min = o.min; inp.max = o.max; inp.step = o.step || 1; inp.value = o.value;
    const fmt = o.fmt || (v => sig(v, 4) + (o.unit ? " " + o.unit : ""));
    const show = () => val.innerHTML = fmt(+inp.value);
    lab.append(name, val); w.append(lab, inp); if (o.tip) w.append($("small", "", o.tip)); parent.append(w); show();
    inp.addEventListener("input", () => { show(); o.on && o.on(+inp.value); });
    return { el: w, get value() { return +inp.value; }, set(v, fire) { inp.value = v; show(); if (fire) o.on && o.on(+inp.value); } };
  }
  function seg(parent, o) {
    const w = $("div", "k-ctl"); if (o.label) w.append($("label", "", `<span>${o.label}</span>`));
    const row = $("div", "k-seg"); w.append(row); if (o.tip) w.append($("small", "", o.tip)); parent.append(w);
    let value = o.value; const btns = [];
    const paint = () => btns.forEach(([v, b]) => b.classList.toggle("on", v === value));
    for (const [v, label, title] of o.options) { const b = $("button", "k-btn", label); if (title) b.title = title; b.onclick = () => { value = v; paint(); o.on && o.on(v); }; row.append(b); btns.push([v, b]); }
    paint();
    return { el: w, get value() { return value; }, set(v, fire) { value = v; paint(); if (fire) o.on && o.on(v); } };
  }
  function toggle(parent, o) {
    const w = $("div", "k-toggle" + (o.value ? " on" : ""), `<i></i><span>${o.label}</span>`); parent.append(w); let value = !!o.value;
    w.onclick = () => { value = !value; w.classList.toggle("on", value); o.on && o.on(value); };
    return { el: w, get value() { return value; }, set(v, fire) { value = !!v; w.classList.toggle("on", value); if (fire) o.on && o.on(value); } };
  }
  function btn(parent, label, on, cls) { const b = $("button", "k-btn " + (cls || ""), label); b.onclick = on; parent.append(b); return b; }
  function row(parent) { const r = $("div", "k-row"); parent.append(r); return r; }
  function readout(parent, items) { // small tiles of live numbers
    const g = $("div", "k-read"), map = {}; parent.append(g);
    for (const [id, label] of items) { const d = $("div", "", `<span>${label}</span><b>–</b>`); g.append(d); map[id] = d.lastChild; }
    return { el: g, set(id, v) { if (map[id].textContent !== String(v)) map[id].innerHTML = v; } };
  }
  function note(parent, html) { const s = $("small", "", html); s.style.cssText = "display:block;color:var(--muted);margin:-2px 0 10px;font-size:12px;line-height:1.35"; parent.append(s); return s; }

  // ---- A canvas that stays sharp on high-DPI screens and follows its container's size ----
  function canvas(parent, onresize) {
    const cv = $("canvas"); parent.append(cv); const c = { el: cv, ctx: cv.getContext("2d"), w: 1, h: 1, dpr: 1 };
    const fit = () => {
      const w = parent.clientWidth, h = parent.clientHeight; if (!w || !h) return;
      c.dpr = Math.min(window.devicePixelRatio || 1, 2); c.w = w; c.h = h; cv.width = Math.round(w * c.dpr); cv.height = Math.round(h * c.dpr);
      c.ctx.setTransform(c.dpr, 0, 0, c.dpr, 0, 0); onresize && onresize(c);
    };
    new ResizeObserver(fit).observe(parent); fit(); return c;
  }
  // Pointer handling in the element's own pixel coordinates
  function pointer(el, h) {
    const pos = e => { const r = el.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, e }; };
    let down = false;
    el.addEventListener("pointerdown", e => { down = true; el.setPointerCapture(e.pointerId); h.down && h.down(pos(e)); });
    el.addEventListener("pointermove", e => { const p = pos(e); if (down) h.drag && h.drag(p); else h.hover && h.hover(p); });
    const up = e => { if (down) { down = false; h.up && h.up(pos(e)); } };
    el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
    el.addEventListener("pointerleave", e => h.leave && h.leave(pos(e)));
    el.addEventListener("contextmenu", e => e.preventDefault());
  }

  // ---- Charts ----
  const charts = new Set();
  function niceTicks(a, b, n) {
    const span = (b - a) || 1, raw = span / n, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
    const step = (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p, t = [];
    for (let v = Math.ceil(a / step - 1e-9) * step; v <= b + step * 1e-6; v += step) t.push(Math.abs(v) < step * 1e-9 ? 0 : v);
    return { t, step };
  }
  const tickFmt = (v, step) => { const a = Math.abs(v); if (a >= 1e5 || (a > 0 && a < 1e-3)) return v.toExponential(0); return v.toFixed(clamp(-Math.floor(Math.log10(step) + 1e-9), 0, 4)); };
  /* chart(parent,{title,xLabel,yLabel,xMin,xMax,yMin,yMax,yZero})  then  .draw(series, extra)
     series: [{pts:[[x,y(,err)]...], type:"line"|"dots"|"bars"|"area"|"err", color, label, dash, width, r}]
     extra:  {xMin..yMax overrides, vlines:[{x,color,label,dash}], hlines:[{y,...}], bands:[{x0,x1,color}]} */
  function chart(parent, o = {}) {
    const wrap = $("div", "k-chart"), cv = $("canvas"); wrap.append(cv); parent.append(wrap);
    const ctx = cv.getContext("2d"); let last = [[], {}];
    const api = { el: wrap, opts: o, draw(series, extra) { last = [series || [], extra || {}]; render(); }, redraw: () => render(), map: null };
    function render() {
      const W = wrap.clientWidth, H = wrap.clientHeight; if (W < 40 || H < 40) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      const [series, ex] = last, q = Object.assign({}, o, ex);
      const text = cssVar("--text"), muted = cssVar("--muted"), grid = cssVar("--grid");
      // work out the axis ranges from the data unless they are fixed
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const s of series) for (const p of s.pts) { if (!isFinite(p[1]) || !isFinite(p[0])) continue; const e = p[2] || 0, hw = s.type === "bars" ? (s.w || 0) / 2 : 0; if (p[0] - hw < x0) x0 = p[0] - hw; if (p[0] + hw > x1) x1 = p[0] + hw; if (p[1] - e < y0) y0 = p[1] - e; if (p[1] + e > y1) y1 = p[1] + e; }
      for (const l of q.hlines || []) { if (l.y < y0) y0 = l.y; if (l.y > y1) y1 = l.y; }
      if (!isFinite(x0)) { x0 = 0; x1 = 1; } if (!isFinite(y0)) { y0 = 0; y1 = 1; }
      if (q.yZero || series.some(s => s.type === "bars")) { y0 = Math.min(0, y0); y1 = Math.max(0, y1); }
      const py = (y1 - y0) * 0.08 || Math.abs(y1) * 0.1 || 1; if (q.yMin == null && y0 !== 0) y0 -= py; if (q.yMax == null) y1 += py;
      if (x1 === x0) { x0 -= 0.5; x1 += 0.5; }
      if (q.xMin != null) x0 = q.xMin; if (q.xMax != null) x1 = q.xMax; if (q.yMin != null) y0 = q.yMin; if (q.yMax != null) y1 = q.yMax;
      const L = 54, R = 12, T = 24, B = q.xLabel ? 34 : 22, pw = W - L - R, ph = H - T - B;
      const X = x => L + (x - x0) / (x1 - x0) * pw, Y = y => T + ph - (y - y0) / (y1 - y0) * ph;
      api.map = { X, Y, x0, x1, y0, y1, L, T, pw, ph };
      ctx.font = "11px Segoe UI,system-ui,sans-serif"; ctx.lineWidth = 1;
      for (const b of q.bands || []) { ctx.fillStyle = b.color; ctx.fillRect(X(Math.max(x0, b.x0)), T, X(Math.min(x1, b.x1)) - X(Math.max(x0, b.x0)), ph); }
      const xt = niceTicks(x0, x1, Math.max(2, Math.floor(pw / 70))), yt = niceTicks(y0, y1, Math.max(2, Math.floor(ph / 28)));
      ctx.strokeStyle = grid; ctx.fillStyle = muted; ctx.beginPath();
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      for (const v of xt.t) { const x = Math.round(X(v)) + .5; ctx.moveTo(x, T); ctx.lineTo(x, T + ph); ctx.fillText(q.xFmt ? q.xFmt(v) : tickFmt(v, xt.step), x, T + ph + 4); }
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      for (const v of yt.t) { const y = Math.round(Y(v)) + .5; ctx.moveTo(L, y); ctx.lineTo(L + pw, y); ctx.fillText(q.yFmt ? q.yFmt(v) : tickFmt(v, yt.step), L - 5, y); }
      ctx.stroke(); ctx.strokeStyle = muted; ctx.strokeRect(L + .5, T + .5, pw, ph);
      if (q.xLabel) { ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillText(q.xLabel, L + pw / 2, H - 3); }
      if (q.yLabel) { ctx.save(); ctx.translate(11, T + ph / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(q.yLabel, 0, 0); ctx.restore(); }
      ctx.save(); ctx.beginPath(); ctx.rect(L, T, pw, ph); ctx.clip();
      series.forEach((s, i) => {
        const c = s.color || col(i); ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = s.width || 1.8; ctx.setLineDash(s.dash || []); ctx.globalAlpha = s.alpha == null ? 1 : s.alpha;
        const P = s.pts;
        if (s.type === "bars") { const w = Math.max(1, Math.abs(X(s.w || 1) - X(0)) - 1); for (const p of P) { const yy = Y(p[1]); ctx.fillRect(X(p[0]) - w / 2, Math.min(yy, Y(0)), w, Math.abs(Y(0) - yy)); } }
        else if (s.type === "dots" || s.type === "err") {
          const r = s.r || 3;
          for (const p of P) { const x = X(p[0]), y = Y(p[1]); if (s.type === "err" && p[2]) { const e = Math.abs(Y(p[1] + p[2]) - y); ctx.beginPath(); ctx.moveTo(x, y - e); ctx.lineTo(x, y + e); ctx.moveTo(x - 4, y - e); ctx.lineTo(x + 4, y - e); ctx.moveTo(x - 4, y + e); ctx.lineTo(x + 4, y + e); ctx.stroke(); } ctx.beginPath(); ctx.arc(x, y, r, 0, 6.3); ctx.fill(); }
        } else {
          ctx.beginPath(); let pen = false;
          for (const p of P) { if (!isFinite(p[1])) { pen = false; continue; } const x = X(p[0]), y = Y(p[1]); pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y); pen = true; }
          if (s.type === "area" && P.length) { ctx.stroke(); ctx.lineTo(X(P[P.length - 1][0]), Y(Math.max(y0, 0))); ctx.lineTo(X(P[0][0]), Y(Math.max(y0, 0))); ctx.globalAlpha *= .22; ctx.fill(); } else ctx.stroke();
        }
        ctx.setLineDash([]); ctx.globalAlpha = 1;
      });
      for (const l of q.vlines || []) { ctx.strokeStyle = l.color || muted; ctx.setLineDash(l.dash || [5, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X(l.x), T); ctx.lineTo(X(l.x), T + ph); ctx.stroke(); ctx.setLineDash([]); if (l.label) { ctx.fillStyle = l.color || muted; ctx.textAlign = X(l.x) > L + pw * .7 ? "right" : "left"; ctx.textBaseline = "top"; ctx.fillText(l.label, X(l.x) + (ctx.textAlign === "right" ? -5 : 5), T + 4 + (l.row || 0) * 13); } }
      for (const l of q.hlines || []) { ctx.strokeStyle = l.color || muted; ctx.setLineDash(l.dash || [5, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(L, Y(l.y)); ctx.lineTo(L + pw, Y(l.y)); ctx.stroke(); ctx.setLineDash([]); if (l.label) { ctx.fillStyle = l.color || muted; ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText(l.label, L + pw - 5, Y(l.y) - 2); } }
      ctx.restore();
      // title on the left, legend on the right
      ctx.textBaseline = "middle"; ctx.textAlign = "left"; ctx.fillStyle = text; ctx.font = "600 12px Segoe UI,system-ui,sans-serif"; ctx.font = "11px Segoe UI,system-ui,sans-serif"; let lx = W - R;
      for (let i = series.length - 1; i >= 0; i--) { const s = series[i]; if (!s.label) continue; const w = ctx.measureText(s.label).width; lx -= w; ctx.fillStyle = muted; ctx.fillText(s.label, lx, 12); lx -= 12; ctx.fillStyle = s.color || col(i); ctx.fillRect(lx, 8, 8, 8); lx -= 10; }
      if (q.title) { // the title gives way (with an ellipsis) if the legend needs the room
        ctx.font = "600 12px Segoe UI,system-ui,sans-serif"; ctx.fillStyle = text; let t = q.title; const room = lx - L - 8;
        if (ctx.measureText(t).width > room) { while (t.length > 3 && ctx.measureText(t + "…").width > room) t = t.slice(0, -1); t = t.length > 3 ? t + "…" : ""; }
        ctx.fillText(t, L, 12);
      }
    }
    new ResizeObserver(render).observe(wrap); charts.add(api); return api;
  }
  function histogram(vals, bins, lo, hi) { // returns bar points [centre, count] and the bin width
    if (lo == null) lo = Math.min(...vals); if (hi == null) hi = Math.max(...vals); if (hi === lo) { hi += .5; lo -= .5; }
    const w = (hi - lo) / bins, c = new Array(bins).fill(0);
    for (const v of vals) { const i = Math.floor((v - lo) / w); if (i >= 0 && i <= bins) c[Math.min(i, bins - 1)]++; }
    return { pts: c.map((n, i) => [lo + (i + .5) * w, n]), w };
  }

  // ---- The page frame ----
  function app(o) {
    document.title = o.title + " · Science Simulations";
    const saved = (() => { try { return localStorage.getItem("k-theme"); } catch (e) { return null; } })();
    if (saved) document.documentElement.dataset.theme = saved;
    const top = $("header", "k-top"), main = $("main", "k-main");
    top.innerHTML = `<a class="k-home" href="${o.home || "../../index.html"}" title="Back to the list of simulations">◂ All simulations</a>
      <div class="k-title"><span class="k-chip">${o.subject}</span><h1>${o.title}</h1><span class="k-blurb">${o.blurb || ""}</span></div><div class="k-actions"></div>`;
    const act = top.querySelector(".k-actions");
    const left = $("section", "k-left"), stage = $("div", "k-stage"), dock = $("div", "k-dock"), side = $("aside", "k-side");
    left.append(stage, dock); main.append(left, side); document.body.append(top, main);
    const ui = { stage, dock, side, playing: true, speed: 1, canvas: fn => canvas(stage, fn) };
    // header buttons
    const bPlay = btn(act, "⏸ Pause", () => ui.setPlaying(!ui.playing)); bPlay.title = "Space bar";
    ui.setPlaying = p => { ui.playing = p; bPlay.innerHTML = p ? "⏸ Pause" : "▶ Play"; bPlay.classList.toggle("primary", !p); };
    if (o.step) btn(act, "⏭ Step", () => { ui.setPlaying(false); o.step(); }).title = "Advance one step while paused";
    if (o.reset) btn(act, "↺ Reset", () => o.reset());
    if (o.batch) btn(act, "📊 Batch run", () => openBatch(), "").title = "Run the model many times and plot the results against theory";
    btn(act, "◐", () => { const t = document.documentElement.dataset.theme === "light" ? "" : "light"; document.documentElement.dataset.theme = t; try { localStorage.setItem("k-theme", t); } catch (e) { } charts.forEach(c => c.redraw()); ui.onTheme && ui.onTheme(); }).title = "Light / dark";
    btn(act, "⛶", () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).title = "Full screen";
    addEventListener("keydown", e => { if (e.code === "Space" && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) { e.preventDefault(); ui.setPlaying(!ui.playing); } if (e.key === "Escape") ov.classList.remove("on"); });
    // side panel tabs
    const tabs = $("nav", "k-tabs"), panes = {}; side.append(tabs);
    const names = [["controls", "Controls"], ["missions", "Investigate"]].concat(o.revise ? [["revise", "Revise"]] : [], [["notes", "The model"]]);
    const show = id => { for (const [k] of names) { panes[k].classList.toggle("on", k === id); panes[k]._tab.classList.toggle("on", k === id); } };
    for (const [k, label] of names) { const b = $("button", "", label); b.onclick = () => show(k); tabs.append(b); panes[k] = $("div", "k-pane" + (k === "notes" ? " k-notes" : "")); panes[k]._tab = b; side.append(panes[k]); }
    show("controls"); ui.controls = panes.controls; ui.showTab = show;
    ui.group = title => { const g = $("div", "k-group", title ? `<h3>${title}</h3>` : ""); panes.controls.append(g); return g; };
    panes.notes.innerHTML = o.notes || "";
    // investigations: each card sets the simulation up and pins its question over the stage
    let banner = null;
    ui.mission = m => {
      if (banner) banner.remove(); banner = null; if (!m) return;
      banner = $("div", "k-banner", `<button class="x" title="Close">✕</button><b>${m.title}</b><br>${m.q}${m.hint ? `<details><summary>What to look for</summary>${m.hint}</details>` : ""}`);
      banner.querySelector(".x").onclick = () => { banner.remove(); banner = null; }; stage.append(banner);
    };
    const mcards = (o.missions || []).map(m => {
      const c = $("div", "k-mcard", `<h4><em></em>${m.title}${m.lvl === "adv" ? ' <span class="k-tag adv">A level</span>' : ""}</h4><p>${m.q}</p>`);
      btn(c, "Set it up ▸", () => { c.classList.add("done"); c.querySelector("em").textContent = "✓"; m.setup && m.setup(); ui.mission(m); ui.setPlaying(true); show("controls"); }, "small primary");
      panes.missions.append(c); return [m, c];
    });
    /* ---- Level (Standard / Advanced) and the Revise tab ----
       o.levels = { std: "Standard (iGCSE)", adv: "Advanced (A level)", specs: { std: "...", adv: "..." } }
       o.revise = { ideas: [{ lvl: "std"|"adv"|"beyond", tag, text }], questions: [{ lvl, q, marks, ans }] }   (q and ans may be functions, so they can use the numbers on screen)
       Advanced shows everything; Standard hides anything marked "adv". */
    ui.level = "std"; try { const l = localStorage.getItem("k-level"); if (l === "adv" || l === "std") ui.level = l; } catch (e) { }
    if (!o.levels) ui.level = "adv";
    const val = v => typeof v === "function" ? v() : v;
    function renderLevel() {
      let k = 0; for (const [m, c] of mcards) { const on = m.lvl !== "adv" || ui.level === "adv"; c.style.display = on ? "" : "none"; if (on) { k++; if (!c.classList.contains("done")) c.querySelector("em").textContent = k; } }
      if (!o.revise) return; const P = panes.revise, see = x => x.lvl !== "adv" || ui.level === "adv", tagName = { std: "std", adv: "adv", beyond: "beyond" };
      P.innerHTML = (o.levels ? `<p class="k-spec">${o.levels.specs[ui.level]}</p>` : "") + `<h3>Key ideas</h3>` + o.revise.ideas.filter(see).map(x => `<div class="k-idea"><span class="k-tag ${tagName[x.lvl]}">${x.tag}</span> ${val(x.text)}</div>`).join("") +
        `<h3>Exam practice</h3>` + o.revise.questions.filter(see).map((x, i) => `<div class="k-mcard k-q"><h4><em>${i + 1}</em><span class="k-tag ${tagName[x.lvl]}">${x.lvl === "adv" ? "A level" : "GCSE"}</span><span class="k-marks">[${x.marks} mark${x.marks > 1 ? "s" : ""}]</span></h4><p>${val(x.q)}</p><details><summary>Mark scheme</summary>${val(x.ans)}</details></div>`).join("");
      if (o.revise.questions.some(x => typeof x.q === "function")) btn(P, "↻ Use the numbers on screen now", renderLevel, "small");
    }
    if (o.levels) { const lg = $("div", "k-group k-level"); panes.controls.append(lg); const sg = seg(lg, { value: ui.level, options: [["std", o.levels.std], ["adv", o.levels.adv]], on: v => { ui.level = v; try { localStorage.setItem("k-level", v); } catch (e) { } hint.textContent = o.levels.specs[v]; renderLevel(); ui.onLevel && ui.onLevel(v); } }); const hint = $("small", "", o.levels.specs[ui.level]); hint.style.cssText = "display:block;color:var(--muted);font-size:11.5px;margin-top:-4px"; lg.append(hint); ui.setLevel = v => sg.set(v, true); }
    renderLevel(); ui.renderRevise = renderLevel;
    // floating hint and heads-up text over the stage
    let tipEl = null, tipT = 0;
    ui.tip = (text, ms = 6000) => { if (!tipEl) { tipEl = $("div", "k-tip"); stage.append(tipEl); } tipEl.innerHTML = text; tipEl.style.opacity = 1; clearTimeout(tipT); tipT = setTimeout(() => tipEl.style.opacity = 0, ms); };
    let hudEl = null; ui.hud = html => { if (!hudEl) { hudEl = $("div", "k-hud"); stage.append(hudEl); } if (hudEl._h !== html) { hudEl.innerHTML = html; hudEl._h = html; } hudEl.style.display = html ? "" : "none"; };
    // animation loop: step(dt) only while playing, draw() every frame
    ui.run = (step, draw) => { let t0 = performance.now(); const f = t => { const dt = Math.min(0.05, (t - t0) / 1000); t0 = t; if (ui.playing && !ov.classList.contains("on")) step(dt); draw(dt); requestAnimationFrame(f); }; requestAnimationFrame(f); };

    // ---- Batch run window ----
    const ov = $("div", "k-overlay"); document.body.append(ov);
    let bstate = null;
    function openBatch() {
      ov.classList.add("on"); if (bstate) return;
      const modal = $("div", "k-modal"), list = $("div", "k-blist", `<h2>📊 Batch run</h2><p>Runs the model many times without drawing it, then compares the results with theory. Pick a question:</p>`), mainB = $("div", "k-bmain");
      modal.append(list, mainB); ov.append(modal); ov.addEventListener("pointerdown", e => { if (e.target === ov) ov.classList.remove("on"); });
      mainB.innerHTML = `<div class="k-bhead"><h3></h3></div><div class="k-bbar"></div><div class="k-bchart"></div><div class="k-bfoot"><div class="k-btable"></div><div class="k-bnote"></div></div>`;
      const head = mainB.querySelector("h3"), bar = mainB.querySelector(".k-bbar"), tbl = mainB.querySelector(".k-btable"), noteEl = mainB.querySelector(".k-bnote");
      btn(mainB.querySelector(".k-bhead"), "✕ Close", () => ov.classList.remove("on"));
      const ch = chart(mainB.querySelector(".k-bchart"), {});
      const bRun = btn(bar, "▶ Run", () => runExp(), "primary"), prog = $("div", "k-prog", "<i></i>"), status = $("span", "", ""); status.style.cssText = "color:var(--muted);font-size:12.5px;min-width:110px";
      const bCsv = btn(bar, "⬇ CSV", () => bstate.rows.length && download(o.title.replace(/\W+/g, "-").toLowerCase() + "-batch.csv", bstate.csv()));
      bar.insertBefore(prog, bCsv); bar.insertBefore(status, bCsv);
      bstate = { exp: null, rows: [], token: 0, csv() { const e = this.exp; return [(e.xs ? e.xLabel + "," : "") + "repeat,seed," + e.yLabel].concat(this.rows.map(r => (e.xs ? r[0] + "," : "") + r[1] + "," + r[2] + "," + r[3])).join("\n"); } };
      const items = o.batch.map(e => { const b = $("button", "k-bitem", `<b>${e.title}</b><span>${e.question}</span>`); b.onclick = () => pick(e); list.append(b); return [e, b]; });
      function pick(e) { bstate.token++; bstate.exp = e; bstate.rows = []; items.forEach(([x, b]) => b.classList.toggle("on", x === e)); head.innerHTML = `${e.title}<p>${e.question} ${e.how || ""}</p>`; noteEl.innerHTML = `<b>Why do the points scatter?</b> ${e.note || "Each run starts from different random numbers, so results vary. The mean of several runs is more trustworthy than any single run, and the standard error says how trustworthy."}`; tbl.innerHTML = ""; status.textContent = e.xs ? `${e.xs.length} settings × ${e.reps || 6} runs` : `${e.reps || 200} runs`; prog.firstChild.style.width = 0; paint(); }
      function paint() {
        const e = bstate.exp, rows = bstate.rows, series = [], extra = { title: "", xLabel: e.xs ? e.xLabel : e.yLabel, yLabel: e.xs ? e.yLabel : "number of runs" };
        if (e.xs) {
          const groups = e.xs.map(x => rows.filter(r => r[0] === x).map(r => r[3])), done = e.xs.map((x, i) => [x, groups[i]]).filter(g => g[1].length);
          if (e.theory) { const a = Math.min(...e.xs), b = Math.max(...e.xs), tp = []; for (let i = 0; i <= 80; i++) { const x = a + (b - a) * i / 80; tp.push([x, e.theory(x)]); } series.push({ pts: tp, color: cssVar("--s1"), label: e.theoryLabel || "theory", dash: [6, 4] }); }
          series.push({ pts: rows.map(r => [r[0], r[3]]), type: "dots", color: cssVar("--s0"), alpha: .3, r: 2.5, label: "single runs" });
          series.push({ pts: done.map(([x, g]) => [x, mean(g), se(g)]), type: "err", color: cssVar("--s0"), r: 4.5, label: "mean ± SE" });
          let fitTxt = "";
          if (e.fit && done.length > 2) { const f = linfit(done.map(([x, g]) => [x, mean(g)])), a = Math.min(...e.xs), b = Math.max(...e.xs); series.push({ pts: [[a, f.m * a + f.c], [b, f.m * b + f.c]], color: cssVar("--s2"), label: "best-fit line" }); fitTxt = `<tr><td colspan="6" style="text-align:left">Best-fit line: gradient <b>${sig(f.m)}</b>, intercept ${sig(f.c)}, r = ${f.r.toFixed(3)}</td></tr>`; }
          extra.xMin = Math.min(...e.xs) - (Math.max(...e.xs) - Math.min(...e.xs)) * .05; extra.xMax = Math.max(...e.xs) + (Math.max(...e.xs) - Math.min(...e.xs)) * .05; if (e.yMin != null) extra.yMin = e.yMin; if (e.yMax != null) extra.yMax = e.yMax;
          tbl.innerHTML = `<table><tr><th>${e.xLabel}</th><th>runs</th><th>mean</th><th>SD</th><th>SE</th>${e.theory ? "<th>theory</th>" : ""}</tr>` + done.map(([x, g]) => `<tr><td>${sig(x, 4)}</td><td>${g.length}</td><td>${sig(mean(g))}</td><td>${sig(sd(g))}</td><td>${sig(se(g))}</td>${e.theory ? `<td>${sig(e.theory(x))}</td>` : ""}</tr>`).join("") + fitTxt + "</table>";
        } else {
          const v = rows.map(r => r[3]);
          if (v.length) { const h = histogram(v, e.bins || 24, e.lo, e.hi); series.push({ pts: h.pts, w: h.w, type: "bars", color: cssVar("--s0"), alpha: .8 }); extra.vlines = [{ x: mean(v), color: cssVar("--s2"), label: "mean " + sig(mean(v)) }]; if (e.theory != null) extra.vlines.push({ x: +e.theory, color: cssVar("--s1"), label: (e.theoryLabel || "theory") + " " + sig(+e.theory), row: 1 }); }
          tbl.innerHTML = v.length ? `<table><tr><th>runs</th><th>mean</th><th>SD</th><th>SE</th><th>min</th><th>max</th>${e.theory != null ? "<th>theory</th>" : ""}</tr><tr><td>${v.length}</td><td>${sig(mean(v))}</td><td>${sig(sd(v))}</td><td>${sig(se(v))}</td><td>${sig(Math.min(...v))}</td><td>${sig(Math.max(...v))}</td>${e.theory != null ? `<td>${sig(+e.theory)}</td>` : ""}</tr></table>` : "";
        }
        ch.opts.xFmt = null; ch.draw(series, extra);
      }
      function runExp() {
        const e = bstate.exp, token = ++bstate.token; bstate.rows = []; const tasks = [];
        if (e.xs) { for (let r = 0; r < (e.reps || 6); r++) for (const x of e.xs) tasks.push([x, r]); } else for (let r = 0; r < (e.reps || 200); r++) tasks.push([0, r]);
        let i = 0; const seed0 = (Date.now() % 100000) * 7 + 1; bRun.textContent = "■ Stop"; bRun.onclick = () => { bstate.token++; fin(); };
        const fin = () => { bRun.textContent = "▶ Run again"; bRun.onclick = () => runExp(); paint(); };
        (function slice() {
          if (token !== bstate.token) return; const t = performance.now();
          while (i < tasks.length && performance.now() - t < 40) { const [x, r] = tasks[i], seed = seed0 + i * 101; const y = e.run(x, rng(seed)); if (y != null && isFinite(y)) bstate.rows.push([x, r + 1, seed, +(+y).toPrecision(6)]); i++; }
          prog.firstChild.style.width = (100 * i / tasks.length) + "%"; status.textContent = `${i} / ${tasks.length} runs`; paint();
          if (i < tasks.length) setTimeout(slice, 0); else fin();
        })();
      }
      pick(o.batch[0]);
    }
    ui.openBatch = openBatch;
    return ui;
  }
  return { $, cssVar, col, clamp, lerp, rng, mean, sd, se, linfit, download, sig, slider, seg, toggle, btn, row, readout, note, canvas, pointer, chart, histogram, app };
})();
