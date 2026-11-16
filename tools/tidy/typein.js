/* ==== Type a value into any slider ====
   Click the value shown beside a slider (or Tab to it and press Enter), type a number, press Enter
   (Escape cancels). Units are optional: "2.2", "2.2 mF" and "2200 μF" all work if the slider shows farads.
   How: the page decides how a slider position is shown (log scales, unit prefixes, £ and so on), so this
   tries slider positions, reads what the page displays for each, and homes in on the one that matches
   (a bisection search). Values beyond the slider's range go to the nearest end. */
(function () {
  "use strict";
  if (window.__typeinDone) return; window.__typeinDone = true;
  const PRE = { p: 1e-12, n: 1e-9, "μ": 1e-6, "µ": 1e-6, u: 1e-6, m: 1e-3, k: 1e3, M: 1e6, G: 1e9 };
  const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
  // read a displayed value such as "2.2 mF", "4.7 × 10⁵ Pa", "£30,000", "−12 °C" as a plain number
  function parseVal(text) {
    const t = String(text).replace(/[−–]/g, "-").replace(/[   ]/g, " ");
    const m = t.match(/-?(?:\d{1,3}(?:[, ]\d{3})+|\d+)(?:\.\d+)?|-?\.\d+/);
    if (!m) return null;
    let v = parseFloat(m[0].replace(/[, ]/g, "")), rest = t.slice(m.index + m[0].length);
    const pw = m[0] === "10" && rest.match(/^(?:\^\s*(-?\d+(?:\.\d+)?)|(⁻?[⁰¹²³⁴⁵⁶⁷⁸⁹]+))/);         // a bare power of ten: 10⁻⁹ or 10^6.5
    if (pw) { v = Math.pow(10, pw[1] != null ? +pw[1] : (pw[2][0] === "⁻" ? -1 : 1) * +[...pw[2].replace("⁻", "")].map(c => SUP.indexOf(c)).join("")); rest = rest.slice(pw[0].length); }
    const ex = rest.match(/^\s*(?:[×x*]\s*10\s*(?:\^\s*(-?\d+)|(⁻?[⁰¹²³⁴⁵⁶⁷⁸⁹]+))|[eE]([-+]?\d+))/);
    if (ex) { const p = ex[1] != null ? +ex[1] : ex[3] != null ? +ex[3] : (ex[2][0] === "⁻" ? -1 : 1) * +[...ex[2].replace("⁻", "")].map(c => SUP.indexOf(c)).join(""); v *= Math.pow(10, p); rest = rest.slice(ex[0].length); }
    const wd = rest.match(/^\s*(thousand|million|billion|trillion)\b/i);    // "1 million K"
    if (wd) { v *= { thousand: 1e3, million: 1e6, billion: 1e9, trillion: 1e12 }[wd[1].toLowerCase()]; rest = rest.slice(wd[0].length); }
    const pm = !wd && rest.match(/^\s*([pnμµumkMG])(?=[A-Za-zΩ°])/);                 // a unit prefix such as m in mF or k in kΩ
    if (pm) v *= PRE[pm[1]];
    return isFinite(v) ? { v, unit: rest } : null;
  }
  // what the user typed, read in the same units as the current display when they gave no unit
  // what was typed, in the units on display unless a unit was typed too ("2.2", "2.2 mF" and "1e-6" all work)
  function typedVal(raw, shown) {
    const q = parseVal(raw); if (!q) return null;
    if (/[A-Za-zμµΩ°%£$€]/.test(q.unit)) return q;
    const s = parseVal(shown); return parseVal(raw + (s ? " " + s.unit.trim() : ""));
  }
  // find the slider position whose display g(pos) is closest to target; g may be async
  async function invert(r, g, target) {
    const lo = +r.min || 0, hi = r.max === "" ? 100 : +r.max, st = r.step === "any" || !+r.step ? (hi - lo) / 10000 : +r.step;
    const n = Math.max(1, Math.round((hi - lo) / st)), pos = i => +(lo + i * st).toFixed(10);
    let e0 = 0, e1 = n, a = await g(pos(0)), b = await g(pos(n));              // ends may show words ("off"): step in to the first numbers
    while (a == null && e0 < Math.min(n, 60)) a = await g(pos(++e0));
    while (b == null && e1 > e0 && n - e1 < 60) b = await g(pos(--e1));
    if (a == null || b == null || a === b) return null;
    const up = b > a;
    if (up ? target < a : target > a) return pos(e0 > 0 ? 0 : e0);
    if (up ? target > b : target < b) return pos(e1 < n ? n : e1);
    let i0 = e0, i1 = e1, v0 = a, v1 = b;
    while (i1 - i0 > 1) { const im = (i0 + i1) >> 1, vm = await g(pos(im)); if (vm == null) break; if ((vm < target) === up) { i0 = im; v0 = vm; } else { i1 = im; v1 = vm; } }
    return Math.abs(v0 - target) <= Math.abs(v1 - target) ? pos(i0) : pos(i1);
  }
  const textOf = el => { const c = el.cloneNode(true); c.querySelectorAll("sup").forEach(x => x.replaceWith("^" + x.textContent)); return c.textContent; };
  const frame = () => new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));
  function display(r) {
    const ctl = r.closest(".ctl"), prev = r.previousElementSibling;
    return (r.id && document.getElementById("o_" + r.id)) || (ctl && ctl.querySelectorAll('input[type="range"]').length === 1 && ctl.querySelector("label output, label b, label span.val, output")) ||
      (prev && prev.tagName === "LABEL" && prev.querySelector("output, b, span.val"));
  }
  function attach(r) {
    const out = display(r); if (!out || out.dataset.typein) return;
    out.dataset.typein = "1"; out.classList.add("typein"); out.tabIndex = 0; out.title = "Click to type a value";
    const fire = (type) => r.dispatchEvent(new Event(type, { bubbles: true }));
    async function commit(raw) {
      const shown = textOf(out), start = r.value, t = typedVal(raw, shown);
      if (!t) return;
      let probe = async p => { r.value = p; fire("input"); const q = parseVal(textOf(out)); return q ? q.v : null; };
      let p = await invert(r, probe, t.v);
      if (p == null) { probe = async p2 => { r.value = p2; fire("input"); fire("change"); await frame(); const q = parseVal(textOf(out)); return q ? q.v : null; }; p = await invert(r, probe, t.v); }
      r.value = p == null ? start : p; fire("input"); fire("change");
    }
    function edit() {
      if (out.querySelector("input")) return;
      const shown = textOf(out), box = document.createElement("input"), q = parseVal(shown);
      box.type = "text"; box.className = "typeinBox"; box.value = q ? shown.trim() : ""; box.setAttribute("aria-label", "Type a value");
      out.style.display = "none"; out.after(box); box.focus(); box.select();
      let done = false;
      const finish = ok => { if (done) return; done = true; const v = box.value; box.remove(); out.style.display = ""; if (ok && v.trim() && v.trim() !== shown.trim()) commit(v); };
      box.addEventListener("keydown", e => { e.stopPropagation(); if (e.key === "Enter") finish(true); if (e.key === "Escape") finish(false); });
      box.addEventListener("blur", () => finish(true));
      box.addEventListener("click", e => { e.stopPropagation(); e.preventDefault(); });
    }
    out.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); edit(); });
    out.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); edit(); } });
  }
  const css = document.createElement("style");
  css.textContent = ".typein{cursor:text;border-bottom:1px dashed currentColor;padding:0 1px}.typein:hover,.typein:focus{outline:1px solid var(--accent,#6fb1ff);outline-offset:1px;border-radius:3px}.typeinBox{width:9em;font:inherit;font-size:12.5px;padding:1px 4px;margin-left:4px;border-radius:4px;border:1px solid var(--accent,#6fb1ff);background:var(--panel-2,#1b2438);color:var(--text,#eef2f8)}";
  document.head.append(css);
  const scan = () => document.querySelectorAll('input[type="range"]').forEach(attach);
  window.addEventListener("load", () => setTimeout(scan, 400));
  new MutationObserver(() => { clearTimeout(scan.t); scan.t = setTimeout(scan, 300); }).observe(document.documentElement, { childList: true, subtree: true });
})();
