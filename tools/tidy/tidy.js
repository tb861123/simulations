
/* ==== Tidy layout ====
   Rearranges the side panels after the simulation has built them. It never changes the model.
   Left:  the level note becomes one line ("iGCSE · topic") with the full note in a drop-down;
          presets become a drop-down menu; every section heading folds; seed / quality / picture
          go into a "More settings" group at the bottom.
   Right: tabs (Live, Graphs, Practical, Learn, Exam); four to six key readings with "More readings";
          every section folds. Folding and the chosen tab are remembered in this browser only.
   Each simulation can set window.TIDY = { std: "...", adv: "...", live: [], graphs: [], learn: [],
   practical: [], settings: [], readings: 6, move: { "<id or CSS selector>": "graphs" },
   hint: "#lvlHint", presets: "#presets", levelHead: "Level", readingsHead: ["Readings"], readingsGrid: "<CSS selector>" }
   before this runs (headings are matched by their start; a moved <h2> takes its folding body with it). */
function tidyRun() {
  "use strict";
  const CFG = Object.assign({ std: "", adv: "", live: [], graphs: [], learn: [], practical: [], exam: [], settings: [], readings: 6, move: {}, hint: "#lvlHint", presets: "#presets", levelHead: "Level", readingsHead: ["Readings"], readingsGrid: "" }, window.TIDY || {});
  const L = document.getElementById("left"), R = document.getElementById("right");
  if (!L || !R || L.dataset.tidy) return;
  L.dataset.tidy = "1";
  const KEY = "tidy:" + location.pathname.split("/").slice(-2).join("/") + ":";
  const store = {
    get(k, d) { try { const v = localStorage.getItem(KEY + k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(KEY + k, v); } catch (e) { /* private window: just don't remember */ } }
  };
  const txt = el => (el ? el.textContent : "").replace(/\s+/g, " ").trim();
  const head = el => el.tagName === "H2" ? txt(el) : el.tagName === "DETAILS" ? txt(el.querySelector("summary")) : (el.querySelector && el.querySelector("h2") ? txt(el.querySelector("h2")) : "");
  const starts = (t, list) => list.some(s => t.toLowerCase().startsWith(s.toLowerCase()));
  const isAdv = () => document.body.classList.contains("lvl-adv");
  const nudge = () => { window.dispatchEvent(new Event("resize")); };

  /* Wrap each <h2> and the siblings after it (up to the next heading or block that holds one) in a folding group. */
  function foldHeadings(panel, skip) {
    panel.querySelectorAll("h2").forEach(h => {
      if (skip(h) || h.closest("details") || h.closest(".tidyMenu") || h.dataset.tidyDone) return;
      if (h.parentNode.id === "tour" || h.closest("#tour")) return;
      h.dataset.tidyDone = "1";
      const body = document.createElement("div"); body.className = "tidyBody";
      let n = h.nextSibling;
      while (n && !(n.nodeType === 1 && (n.tagName === "H2" || n.tagName === "DETAILS" || n.classList.contains("reopen") || (n.querySelector && n.querySelector("h2"))))) {
        const next = n.nextSibling; body.appendChild(n); n = next;
      }
      h.after(body);
      h.classList.add("tidyH");
      const k = "fold:" + panel.id + ":" + txt(h).slice(0, 40);
      const set = shut => { h.classList.toggle("shut", shut); body.classList.toggle("shut", shut); };
      set(store.get(k, "0") === "1");
      h.addEventListener("click", e => {
        if (e.target.closest("button,input,select,a,label")) return;
        const shut = !h.classList.contains("shut"); set(shut); store.set(k, shut ? "1" : "0"); nudge();
      });
    });
  }

  /* ---- Left: level line ---- */
  const hint = CFG.hint ? document.querySelector(CFG.hint) : null;
  if (hint) {
    const lvH = [...L.querySelectorAll("h2")].find(h => txt(h).toLowerCase() === String(CFG.levelHead).toLowerCase());
    if (lvH) lvH.classList.add("tidyHide");
    const det = document.createElement("details"); det.className = "tidyInfo";
    const sum = document.createElement("summary"); det.appendChild(sum);
    hint.before(det); det.appendChild(hint);
    const line = () => {
      const s = isAdv() ? CFG.adv : CFG.std;
      sum.innerHTML = (s || (isAdv() ? "A level" : "GCSE")) + '<span class="tidyI" title="What this level covers">ⓘ</span>';
    };
    line();
    new MutationObserver(line).observe(document.body, { attributes: true, attributeFilter: ["class"] });
    det.addEventListener("toggle", nudge);
  }

  /* ---- Left: presets menu ---- */
  const pre = CFG.presets ? document.querySelector(CFG.presets) : null;
  if (pre) {
    const pH = [...L.querySelectorAll("h2")].find(h => /^presets/i.test(txt(h)));
    if (pH) pH.classList.add("tidyHide");
    const btn = document.createElement("button"); btn.type = "button"; btn.className = "tidyPresetsBtn";
    btn.innerHTML = '<span>Presets ▾</span><span class="cur"></span>';
    pre.before(btn);
    const menu = document.createElement("div"); menu.className = "tidyMenu tidyHide";
    menu.innerHTML = '<p class="tidyMenuHint">Hover over a preset to see what it sets up.</p>';
    menu.appendChild(pre); document.body.appendChild(menu);
    const titles = () => pre.querySelectorAll("button").forEach(b => {
      const sm = b.querySelector("small"); if (sm && !b.title) b.title = txt(sm);
    });
    const cur = () => {
      const on = pre.querySelector("button.on");
      let t = "";
      if (on) { const c = on.cloneNode(true); c.querySelectorAll("small").forEach(s => s.remove()); t = txt(c); }
      btn.querySelector(".cur").textContent = t;
    };
    titles(); cur();
    new MutationObserver(() => { titles(); cur(); }).observe(pre, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] });
    const close = () => menu.classList.add("tidyHide");
    const open = () => {
      const r = btn.getBoundingClientRect();
      const w = Math.min(460, window.innerWidth - r.left - 16);
      menu.style.left = r.left + "px"; menu.style.top = (r.bottom + 4) + "px"; menu.style.width = w + "px";
      menu.style.maxHeight = (window.innerHeight - r.bottom - 14) + "px";
      menu.classList.remove("tidyHide");
    };
    btn.addEventListener("click", e => { e.stopPropagation(); menu.classList.contains("tidyHide") ? open() : close(); });
    menu.addEventListener("click", e => { if (e.target.closest("button")) setTimeout(close, 0); });
    document.addEventListener("click", e => { if (!menu.contains(e.target) && e.target !== btn) close(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
    window.addEventListener("resize", close);
    L.addEventListener("scroll", close);
  }

  /* ---- Left: fold headings, then gather the "More settings" ---- */
  const SET_RE = /^(picture|quality|display|graphics|random seed|seed|animation)\b/i;
  foldHeadings(L, h => h.classList.contains("tidyHide"));
  const more = document.createElement("details"); more.className = "tidyMore";
  more.innerHTML = "<summary>More settings</summary>";
  L.querySelectorAll("h2.tidyH").forEach(h => {
    const t = txt(h);
    if (SET_RE.test(t) || starts(t, CFG.settings)) { const bd = h.nextElementSibling; more.appendChild(h); if (bd) more.appendChild(bd); h.classList.remove("tidyH"); h.style.cursor = "default"; }
  });
  ["#quality", "#seed", "#rseed", "[id$='Seed']", "[id$='seed']"].forEach(sel => L.querySelectorAll(sel).forEach(inp => {
    if (more.contains(inp)) return;
    const c = inp.closest(".ctl") || inp.closest(".row"); if (c && L.contains(c)) more.appendChild(c);
  }));
  /* "How the model works" belongs with the other explanations on the right */
  const toLearn = [];
  [...L.querySelectorAll("details")].forEach(d => { if (/how the model works/i.test(head(d))) toLearn.push(d); });
  if (more.children.length > 1) {
    L.appendChild(more);
    more.open = store.get("more", "0") === "1";
    more.addEventListener("toggle", () => store.set("more", more.open ? "1" : "0"));
  }

  /* ---- Right: tabs ---- */
  foldHeadings(R, () => false);
  const TABS = [["live", "Live"], ["graphs", "Graphs"], ["practical", "Practical"], ["learn", "Learn"], ["exam", "Exam"]];
  const panes = {}, bar = document.createElement("div"); bar.className = "tidyTabs";
  const kids = [...R.children].filter(k => !k.classList.contains("reopen"));
  let firstChart = true;
  const classify = (t, els) => {
    const low = t.toLowerCase(), has = sel => els.some(e => e.matches && (e.matches(sel) || e.querySelector(sel)));
    for (const [k] of TABS) if (t && starts(t, CFG[k] || [])) return k;
    if (has("#tour")) return "live";
    if (has("#exam") || /exam practice|exam question/.test(low)) return "exam";
    if (!t) return "live";   // unheaded blocks (e.g. a readout above the first heading) stay on Live
    if (/practical|^🧪/.test(low) || els[0].matches && els[0].matches(".lab")) return "practical";
    if (/key idea|key equation|how the model|equations|spec|glossary|data source|story|notes|definitions|further/.test(low)) return "learn";
    if (/what's happening|what is happening|readings|guided tour|^tour/.test(low)) return "live";
    if (has("canvas,svg")) { if (firstChart) { firstChart = false; return "live"; } return "graphs"; }
    return "live";
  };
  // an h2 and its folding body travel together
  const groups = [];
  for (let i = 0; i < kids.length; i++) {
    const k = kids[i];
    if (k.tagName === "H2" && kids[i + 1] && kids[i + 1].classList.contains("tidyBody")) { groups.push([k, kids[i + 1]]); i++; }
    else groups.push([k]);
  }
  // elements a simulation asks to move (e.g. charts that sit under the readings) go to their own tab
  Object.entries(CFG.move).forEach(([key, tab]) => {
    const list = /^[A-Za-z][\w-]*$/.test(key) ? [document.getElementById(key)] : [...R.querySelectorAll(key)];
    list.forEach(e => {
      if (!e || !R.contains(e)) return;
      const body = e.tagName === "H2" && e.nextElementSibling && e.nextElementSibling.classList.contains("tidyBody") ? e.nextElementSibling : null;
      groups.forEach(g => { const i = g.indexOf(e); if (i >= 0) g.splice(i, body ? 2 : 1); });
      e.remove(); if (body) body.remove();
      (panes[tab] = panes[tab] || []).push(e); if (body) panes[tab].push(body);
    });
  });
  groups.forEach(g => { if (!g.some(n => R.contains(n))) return; const tab = classify(head(g[0]), g); (panes[tab] = panes[tab] || []).push(...g); });
  toLearn.forEach(d => (panes.learn = panes.learn || []).push(d));
  const reopen = R.querySelector(":scope > .reopen");
  const paneEls = {};
  TABS.forEach(([k, name]) => {
    if (!panes[k] || !panes[k].length) return;
    const p = document.createElement("div"); p.className = "tidyPane"; p.dataset.tab = k;
    panes[k].forEach(n => p.appendChild(n));
    paneEls[k] = p;
    const b = document.createElement("button"); b.type = "button"; b.textContent = name; b.dataset.tab = k;
    bar.appendChild(b);
  });
  if (reopen) reopen.after(bar); else R.prepend(bar);
  Object.values(paneEls).forEach(p => R.appendChild(p));
  const show = k => {
    const hidden = n => { const b = bar.querySelector('button[data-tab="' + n + '"]'); return !paneEls[n] || (b && b.classList.contains("tidyHide")); };
    if (hidden(k)) k = Object.keys(paneEls).find(n => !hidden(n)) || Object.keys(paneEls)[0];
    Object.entries(paneEls).forEach(([n, p]) => p.classList.toggle("tidyHide", n !== k));
    bar.querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.tab === k));
    store.set("tab", k); R.scrollTop = 0; nudge();
  };
  bar.addEventListener("click", e => { const b = e.target.closest("button"); if (b) show(b.dataset.tab); });
  // a tab whose contents are all for the other level (e.g. A level practicals at Standard) is hidden
  const levelTabs = () => {
    const off = isAdv() ? ".stdOnly" : ".advOnly";
    let cur = store.get("tab", "live");
    bar.querySelectorAll("button").forEach(b => {
      const empty = [...paneEls[b.dataset.tab].children].every(c => c.matches(off) || c.matches(".tidyBody") && c.previousElementSibling && c.previousElementSibling.matches(off));
      b.classList.toggle("tidyHide", empty);
      if (empty && b.dataset.tab === cur) cur = null;
    });
    if (!cur) show("live");
  };
  new MutationObserver(levelTabs).observe(document.body, { attributes: true, attributeFilter: ["class"] });
  if (Object.keys(paneEls).length < 2) bar.classList.add("tidyHide");
  show(store.get("tab", "live"));
  levelTabs();
  window.tidyShowTab = show;   // a simulation (or test) can switch tab

  /* ---- Right: only the first few readings, with "More readings" ---- */
  const rH = [...R.querySelectorAll("h2.tidyH")].find(h => starts(txt(h), CFG.readingsHead));
  if (rH || CFG.readingsGrid) {
    const body = rH && rH.nextElementSibling;
    const grid = CFG.readingsGrid ? R.querySelector(CFG.readingsGrid) : body && [...body.children].sort((a, b) => b.children.length - a.children.length)[0];
    if (grid && grid.children.length > CFG.readings) {
      const tg = document.createElement("button"); tg.type = "button"; tg.className = "tidyMoreR";
      grid.after(tg);
      let all = store.get("allReadings", "0") === "1";
      const apply = () => {
        const items = [...grid.children];
        items.forEach(c => c.classList.remove("tidyX"));
        if (grid.offsetParent === null) return;
        const vis = items.filter(c => c.offsetParent !== null || getComputedStyle(c).display !== "none" && c.getClientRects().length);
        const extra = vis.slice(CFG.readings);
        tg.classList.toggle("tidyHide", !extra.length);
        tg.textContent = all ? "Fewer readings ▴" : "More readings (" + extra.length + ") ▾";
        if (!all) extra.forEach(c => c.classList.add("tidyX"));
      };
      tg.addEventListener("click", () => { all = !all; store.set("allReadings", all ? "1" : "0"); apply(); nudge(); });
      apply();
      new MutationObserver(apply).observe(grid, { childList: true });
      new MutationObserver(apply).observe(document.body, { attributes: true, attributeFilter: ["class"] });
      bar.addEventListener("click", () => setTimeout(apply, 0));
    }
  }
  nudge();
}
// wait until the simulation has drawn its first frames, so headings and readings it fills in then exist
window.addEventListener("load", () => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(tidyRun, 250))));
