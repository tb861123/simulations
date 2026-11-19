/* =====================================================================
   SEA LEVEL RISE
   The sea is rising because the world is warming:
     • THERMAL EXPANSION: warmer water takes up more space;
     • melting GLACIERS on land;
     • melting ICE SHEETS on Greenland and Antarctica.
   (Melting sea ice and ice shelves that already float hardly change sea
   level: floating ice already displaces its own weight of water.)
   Even a small rise matters most during STORMS: a storm surge on top of
   a high tide on top of a higher sea. Floods that used to happen once a
   century happen far more often.
   The ocean and ice sheets respond slowly, so the sea keeps rising for
   centuries after temperatures stop rising: COMMITTED sea level rise.
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
// global warming (°C above pre-industrial) for each pathway; history then a simple shape to 2060, 2100 and 2300
const SCEN = { stop: { name: "all emissions stop in 2025", f: [1.25, 1.2, 1.1] }, zero: { name: "net zero by 2050 (≈1.5 °C)", f: [1.5, 1.5, 1.3] }, low: { name: "low emissions (like SSP1-2.6)", f: [1.8, 1.6, 1.4] }, mid: { name: "middle (like SSP2-4.5)", f: [2.1, 2.7, 3.6] }, high: { name: "high emissions (like SSP5-8.5)", f: [2.4, 4.4, 7.5] } };
function temp(y, sc) { if (y <= 2024) return 1.2 * Math.max(0, (y - 1880) / 144) ** 2.2; const f = SCEN[sc].f; if (y <= 2060) return 1.2 + (f[0] - 1.2) * (y - 2024) / 36; if (y <= 2100) return f[0] + (f[1] - f[0]) * (y - 2060) / 40; return f[1] + (f[2] - f[1]) * Math.min(1, (y - 2100) / 200); }
// the four contributions (mm), each driven by warming; k holds uncertain multipliers for the batch runs
function project(sc, k = {}) {
  k = Object.assign({ w: 1, th: 1, gl: 1, gr: 1, an: 1 }, k); const S = 1.65, out = []; let th = 0, gl = 0, gr = 0, an = 0, Td = 0;
  for (let y = 1900; y <= 2300; y += 0.5) {
    const T = temp(y, sc) * (y > 2024 ? 1 + (k.w - 1) * Math.min(1, (y - 2024) / 76) : 1); Td += 0.5 * (T - Td) / 150;     // the deep ocean warms slowly
    th += 0.5 * S * k.th * (0.7 * T + 1.0 * Td);                                    // thermal expansion: surface and deep ocean
    gl += 0.5 * S * k.gl * T * Math.max(0, 1 - gl / 260);                           // glaciers: run out of ice (about 26 cm in total here)
    gr += 0.5 * S * k.gr * (0.25 * T + 0.09 * T * T);                              // Greenland: surface melting speeds up with warming
    an += 0.5 * S * k.an * (0.15 * T + (y > 2024 ? 0.08 * Math.max(0, T - 1.5) ** 2 + 0.02 * Math.max(0, T - 3) ** 3 : 0));   // Antarctica: ice shelves weaken at higher warming
    out.push({ y, T, th, gl, gr, an, tot: th + gl + gr + an });
  }
  return out;
}
const at = (o, y) => o[Math.min(o.length - 1, Math.max(0, Math.round((y - 1900) * 2)))];
const rise = (o, y, base = 2005) => (at(o, y).tot - at(o, base).tot) / 10;            // cm since 2005
// uncertain multipliers (each run): warming ×/÷ 1.25, thermal ±20%, glaciers ±25%, Greenland ×/÷ 1.5, Antarctica ×/÷ 1.8
const drawK = r => ({ w: Math.exp(0.22 * r.gauss()), th: 1 + 0.2 * r.gauss(), gl: 1 + 0.25 * r.gauss(), gr: Math.exp(0.4 * r.gauss()), an: Math.exp(0.6 * r.gauss()) });
// storms: annual highest water above mean high tide follows a Gumbel distribution (μ 0.8 m, β 0.25 m)
const GUM = { mu: 0.8, beta: 0.25 };
const returnLevel = T => GUM.mu - GUM.beta * Math.log(-Math.log(1 - 1 / T));
const pExceed = x => 1 - Math.exp(-Math.exp(-(x - GUM.mu) / GUM.beta));
const gumbel = r => GUM.mu - GUM.beta * Math.log(-Math.log(Math.max(1e-12, r())));
// the coast: a made-up town; elevation (m above today's mean sea level) on a grid
const PLACES = { estuary: { name: "estuary town (UK-like)", tide: 2.2, slope: 0.012, people: 20000 }, delta: { name: "delta city", tide: 1.2, slope: 0.004, people: 600000 }, island: { name: "low coral island", tide: 0.9, slope: 0.006, people: 5000 } };
function makeCoast(place, seed) { const r = K.rng(seed), G = 80, H = 50, z = [], pl = PLACES[place], waves = Array.from({ length: 6 }, () => [r() * 6, r() * 6, r() * 6.28, 0.3 + r() * 0.8]); for (let j = 0; j < H; j++) for (let i = 0; i < G; i++) { const d = i / G, base = place === "island" ? 3.2 * Math.max(0, 1 - Math.hypot(d - 0.5, j / H - 0.5) * 2.2) : (d - 0.15) * G * pl.slope * 8; let n = 0; for (const [a, b, p, s] of waves) n += s * Math.sin(a * d * 6 + b * j / H * 6 + p); z.push(base + 0.5 * n + (place === "estuary" && Math.abs(j / H - 0.55) < 0.06 + 0.06 * d ? -2.5 : 0)); } const homes = []; for (let k = 0; k < 160; k++) { const i = Math.floor(r() * G), j = Math.floor(r() * H); if (z[j * G + i] > 0.5 && z[j * G + i] < 6) homes.push([i, j]); } return { G, H, z, homes }; }

// ---------------- The page ----------------
const P = { scen: "mid", year: 2024, place: "estuary", wall: 0, storm: 0, speed: 2, ice: false };
let proj = null, coast = null, run = true, iceT = 0;
const ui = K.app({
  title: "Sea Level Rise", subject: "Climate and geography",
  blurb: "Why the sea is rising, how fast, and what it means for a low-lying coast in storms, from 1900 to 2300",
  reset: () => set({}),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "GCSE geography and science: causes of sea level rise (thermal expansion, melting land ice), the effects on coasts (flooding, storm surges, erosion, migration), responses (sea walls, managed retreat), evidence from tide gauges and satellites.", adv: "A level geography (coastal systems and the carbon/water cycles): eustatic sea level change, thermal expansion and ice-sheet contributions, committed rise, storm-surge return periods and risk, adaptation and mitigation; IPCC projections and their uncertainty." } },
  missions: [
    { title: "Why is the sea rising?", q: "Run from 1900 to today. Which parts add the most to sea level rise so far?", hint: "Thermal expansion and melting glaciers have added the most (about 80% together); Greenland and Antarctica are growing. About 20 cm since 1900, now about 4 mm a year and speeding up.", setup() { set({ year: 1900 }); } },
    { title: "Floating or land ice?", q: "Open the ice demo. Melt an ice cube floating in water, and one on a stone. Which raises the water level?", hint: "Only the land ice: floating ice already displaces its own weight of water. That is why melting Arctic sea ice adds almost nothing, but Greenland and Antarctica (ice on land) add a lot.", setup() { set({ ice: true }); } },
    { title: "Which future?", q: "Compare the low and high emissions pathways. How much higher is the sea in 2100? In 2300?", hint: "About half a metre (low) against over three-quarters of a metre (high) by 2100, but by 2300 the gap is metres: the ice sheets respond slowly, so today's emissions decide the coast of centuries ahead.", setup() { set({ scen: "high", year: 2024 }); } },
    { title: "Committed rise", q: "Stop all emissions in 2025. Does the sea stop rising?", hint: "No: the deep ocean keeps warming and the ice sheets keep losing ice for centuries, so the sea keeps rising (about 1 m by 2300 even here). That is committed sea level rise.", setup() { set({ scen: "stop", year: 2024 }); } },
    { title: "Storms on a higher sea", q: "Add a 1-in-100-year storm to the town in 2024, then in 2100. What changes?", hint: "The same storm floods much more land when the sea starts higher. A rise of half a metre makes today's 100-year flood happen every few years.", setup() { set({ storm: 100, year: 2100 }); } },
    { title: "Build a sea wall", q: "Build a 2 m sea wall. How long does it protect the town? What happens when it is overtopped?", hint: "It protects the land behind it until storm water rises above the wall; then everything behind floods at once. Walls must be raised as the sea rises (or the town must adapt or retreat).", setup() { set({ wall: 2, storm: 100, year: 2060 }); } },
    { lvl: "adv", title: "Return periods", q: "How often does today's 1-in-100-year storm level happen after 0.5 m of rise?", hint: "With a Gumbel distribution of storm heights (β = 0.25 m), each 0.25 m of rise multiplies the frequency by e: 0.5 m of rise → about 7 times more often, roughly once every 14 years.", setup() { set({ storm: 100, year: 2100 }); } }
  ],
  batch: [
    { title: "Sea level rise by 2100 in each pathway", question: "Allowing for the uncertainty in the science, how much will the sea rise by 2100 (from 2005)?", how: "1 stop 2025, 2 net zero, 3 low, 4 middle, 5 high. Each run draws warming, expansion, glaciers, Greenland and Antarctica at random.", xLabel: "pathway (1 stop, 2 net zero, 3 low, 4 middle, 5 high)", yLabel: "rise by 2100 (cm)", xs: [1, 2, 3, 4, 5], reps: 30, yMin: 0, theory: x => rise(project(["stop", "zero", "low", "mid", "high"][Math.round(x) - 1]), 2100), theoryLabel: "central values", run: (x, r) => rise(project(["stop", "zero", "low", "mid", "high"][x - 1], drawK(r)), 2100), note: "Every pathway rises tens of centimetres (much of it already committed); the gap between pathways and the uncertainty both grow with time." },
    { title: "How sure are we? (middle pathway)", question: "What range of rise by 2100 do 500 possible worlds give?", how: "Middle pathway; all five uncertain parts drawn at random.", yLabel: "rise by 2100 (cm)", reps: 500, bins: 24, theory: rise(project("mid"), 2100), theoryLabel: "central", run: (x, r) => rise(project("mid", drawK(r)), 2100), note: "A skewed spread with a long high tail, mostly from Antarctica: low chances of a much bigger rise matter for planning." },
    { title: "How much more often is the 100-year flood?", question: "After a rise of x metres, how many times more often is today's 1-in-100-year storm level reached?", how: "Storm heights from a Gumbel distribution (β = 0.25 m); 200 simulated years per run, counting years above today's 100-year level.", xLabel: "sea level rise (m)", yLabel: "times more often", xs: [0, 0.1, 0.2, 0.3, 0.4, 0.5], reps: 20, yMin: 0, theory: s => pExceed(returnLevel(100) - s) / 0.01, theoryLabel: "Gumbel: ≈ e^(rise/β)", run: (s, r) => { let n = 0; for (let i = 0; i < 2000; i++) if (gumbel(r) + s > returnLevel(100)) n++; return n / 2000 / 0.01; }, note: "Each 25 cm of rise multiplies flood frequency by about e (2.7): half a metre makes it about 7 times more often." },
    { title: "Committed rise after emissions stop", question: "If emissions stop in 2025, how much does the sea still rise by different years?", how: "Stop-2025 pathway with uncertain science.", xLabel: "year", yLabel: "rise since 2005 (cm)", xs: [2050, 2100, 2150, 2200, 2300], reps: 20, yMin: 0, theory: y => rise(project("stop"), y), theoryLabel: "central", run: (y, r) => rise(project("stop", drawK(r)), y), note: "It keeps rising for centuries: the deep ocean and the ice sheets are still catching up with the warming we have already caused." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "GCSE", text: "Sea level is rising because of thermal expansion of warming sea water and melting land ice (glaciers, Greenland and Antarctic ice sheets). Melting floating sea ice adds almost nothing." },
      { lvl: "std", tag: "GCSE", text: "Global sea level has risen about 20 cm since 1900 and is now rising about 4 mm a year, faster than before." },
      { lvl: "std", tag: "GCSE", text: "Effects: coastal flooding (especially in storm surges), erosion, salt water in farmland and drinking water, loss of homes and habitats; low-lying islands and deltas are most at risk." },
      { lvl: "std", tag: "GCSE", text: "Responses: hard engineering (sea walls, barriers), managed retreat, raising buildings; and cutting emissions to limit future rise." },
      { lvl: "adv", tag: "A level", text: "Eustatic change (global volume of water) versus isostatic change (land rising or sinking). Committed rise: the ocean and ice sheets keep responding for centuries." },
      { lvl: "adv", tag: "A level", text: "Return period = 1 ÷ annual chance. With extreme-value (Gumbel) statistics, a small rise in mean level makes extreme floods many times more frequent." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: "Explain why melting Arctic sea ice does not raise sea level much, but melting Greenland ice does.", ans: "<ul><li>sea ice already floats, displacing its own weight of water</li><li>Greenland's ice is on land, so its meltwater adds to the ocean's volume</li></ul>" },
      { lvl: "std", marks: 3, q: () => `On screen, sea level in ${Math.round(P.year)} is ${rise(proj, P.year, 1900).toFixed(0)} cm above 1900. Describe two effects this could have on a low-lying coastal town.`, ans: "<ul><li>more frequent flooding, especially when storm surges coincide with high tides</li><li>coastal erosion and loss of land; salt water contaminating farmland and water supplies</li><li>homes and businesses damaged; people may need to move</li></ul>" },
      { lvl: "adv", marks: 3, q: "Explain why sea level would keep rising for centuries even if emissions stopped today.", ans: "<ul><li>heat continues to mix into the deep ocean, so thermal expansion continues</li><li>ice sheets respond slowly to warming already reached</li><li>so sea level is 'committed' to rise long after temperatures stabilise</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li><b>Warming:</b> history rises to 1.2 °C in 2024; each pathway follows a simple shape through 2060, 2100 and 2300 (low like SSP1-2.6, middle like SSP2-4.5, high like SSP5-8.5).</li>
<li><b>Contributions (rates in mm per year):</b> thermal expansion ∝ 0.7T + 1.0 × deep-ocean warming (which follows T over 150 years); glaciers ∝ T, running out after about 26 cm; Greenland ∝ 0.25T + 0.09T²; Antarctica ∝ 0.15T, plus extra ice loss above 1.5 °C and much more above 3 °C. Tuned to give about 20 cm from 1901 to 2018, about 4 mm/yr now, and 2100 rises close to the IPCC (AR6) central values (0.44, 0.56, 0.77 m for low, middle, high).</li>
<li><b>Uncertainty (batch runs):</b> warming ×/÷ 1.25, thermal ±20%, glaciers ±25%, Greenland ×/÷ 1.5, Antarctica ×/÷ 1.8.</li>
<li><b>Coast:</b> a made-up landscape; land below mean sea level is sea, below high tide floods at every high tide, below high tide + the storm surge floods in a storm. A wall protects land behind it until the water is higher than the wall.</li>
<li><b>Storms:</b> the year's highest surge above high tide follows a Gumbel distribution (μ 0.8 m, β 0.25 m).</li></ul>
<h3>Left out</h3>
<ul><li>Regional differences in sea level rise, land rising or sinking (isostasy, subsidence), waves and erosion, ice-sheet tipping points (shown only as a steep rise at high warming), and the real geography of any town.</li></ul>
<p>The earlier version of this simulation (with freehand sea walls and three detailed coasts), with its worksheets, is kept in <a href="original/sea-level-rise.html">original/sea-level-rise.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("The future");
ctl.scen = K.seg(g, { value: "mid", options: Object.entries(SCEN).map(([k, v]) => [k, v.name]), on: v => { P.scen = v; proj = project(v); } });
ctl.year = K.slider(g, { label: "Year", min: 1900, max: 2300, step: 1, value: 2024, on: v => { P.year = v; run = false; } });
ctl.speed = K.slider(g, { label: "Speed", min: 0.5, max: 20, step: 0.5, value: 2, unit: "years per second", on: v => P.speed = v });
let rr = K.row(g); K.btn(rr, "▶ Run on", () => run = true, "primary"); K.btn(rr, "⏮ 1900", () => { P.year = 1900; ctl.year.set(1900); }); K.btn(rr, "Today", () => { P.year = 2024; ctl.year.set(2024); });
g = ui.group("The coast");
ctl.place = K.seg(g, { value: "estuary", options: Object.entries(PLACES).map(([k, v]) => [k, v.name]), on: v => { P.place = v; coast = makeCoast(v, 7); } });
ctl.storm = K.seg(g, { label: "Storm", value: 0, options: [[0, "none"], [1, "1-in-1-year"], [10, "1-in-10"], [100, "1-in-100"], [1000, "1-in-1000"]], on: v => P.storm = +v });
ctl.wall = K.slider(g, { label: "Sea wall height (above today's high tide)", min: 0, max: 5, step: 0.1, value: 0, fmt: v => v ? v.toFixed(1) + " m" : "no wall", on: v => P.wall = v });
ctl.ice = K.toggle(g, { label: "🧊 Ice demo: floating ice and land ice", value: false, on: v => { P.ice = v; iceT = 0; } });
const read = K.readout(ui.group("Readings"), [["sl", "rise since 1900"], ["rate", "rate now"], ["parts", "thermal · glaciers · Greenland · Antarctica"], ["T", "warming"], ["fl", "land flooded at high tide · in the storm"], ["hm", "homes flooded"], ["f100", "today's 100-year flood happens"]]);
function set(o) { Object.assign(P, { scen: "mid", year: 2024, place: "estuary", wall: 0, storm: 0, ice: false }, o); for (const k of ["year", "wall"]) ctl[k].set(P[k]); ctl.scen.set(P.scen); ctl.place.set(P.place); ctl.storm.set(P.storm); ctl.ice.set(P.ice); proj = project(P.scen); coast = makeCoast(P.place, 7); run = !o.year || o.year < 2024 ? !!o.year && o.year < 2024 : false; iceT = 0; }
// water level now (m above today's mean sea level): sea level change since 2024 + half the tide + storm surge
function levels() { const s = (at(proj, P.year).tot - at(proj, 2024).tot) / 1000, pl = PLACES[P.place]; return { msl: s, high: s + pl.tide / 2, storm: P.storm ? s + pl.tide / 2 + returnLevel(P.storm) : null }; }
function flooding() { const L = levels(), wallTop = PLACES[P.place].tide / 2 + P.wall; let hi = 0, st = 0, land = 0, homes = 0; const { G, H, z } = coast; const behind = i => P.wall > 0 && i / G > 0.18; const flooded = (zz, i, lev) => zz < lev && !(behind(i) && lev < wallTop);
  for (let j = 0; j < H; j++) for (let i = 0; i < G; i++) { const zz = z[j * G + i]; if (zz <= 0) continue; land++; if (flooded(zz, i, L.high)) hi++; else if (L.storm != null && flooded(zz, i, L.storm)) st++; }
  for (const [i, j] of coast.homes) { const zz = z[j * G + i]; if (flooded(zz, i, L.high) || (L.storm != null && flooded(zz, i, L.storm))) homes++; }
  return { hi: hi / land, st: st / land, homes, L, flooded }; }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h);
  if (P.ice) {
    const k = Math.min(1, iceT / 6); TX(c, "Ice demo: the same ice cube, floating (left) and on land (right)", 20, 28, "#eef2f8", "left", "600 14px");
    for (const [i, land] of [[0, false], [1, true]]) { const x = 80 + i * w * 0.45, y = 80, gw = 180, gh = 260, lv0 = 150, lv = land ? lv0 - 10 * k : lv0; c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = 2; c.strokeRect(x, y, gw, gh); c.lineWidth = 1; c.fillStyle = "rgba(90,160,255,.35)"; c.fillRect(x + 2, y + lv, gw - 4, gh - lv - 2);
      if (land) { c.fillStyle = "#6a6a6a"; c.fillRect(x + 100, y + 90, 70, gh - 92); } const s = 40 * (1 - k); if (s > 1) { c.fillStyle = "rgba(220,240,255,.9)"; if (land) c.fillRect(x + 115, y + 90 - s, s, s); else c.fillRect(x + 50, y + lv - s * 0.1, s, s * 0.9 > 0 ? s * 0.9 : 0); }
      c.strokeStyle = "#ffd166"; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(x - 10, y + lv0); c.lineTo(x + gw + 10, y + lv0); c.stroke(); c.setLineDash([]); TX(c, land ? `land ice: the level rises ${(14 * k).toFixed(0)} mm` : "floating ice: the level does not change", x, y + gh + 24, land ? "#ff8a70" : "#7ee787", "left", "600 12.5px"); }
    return;
  }
  const F = flooding(), { G, H, z } = coast, mw = w * 0.62, mh = h * 0.62, cw = mw / G, ch = mh / H;
  for (let j = 0; j < H; j++) for (let i = 0; i < G; i++) { const zz = z[j * G + i]; let col; if (zz <= F.L.msl) col = "#1c4a7a"; else if (F.flooded(zz, i, F.L.high)) col = "#3a78c0"; else if (F.L.storm != null && F.flooded(zz, i, F.L.storm)) col = "#7fb8ff"; else col = `hsl(${100 - Math.min(60, zz * 8)},${35}%,${22 + Math.min(30, zz * 4)}%)`; c.fillStyle = col; c.fillRect(10 + i * cw, 40 + j * ch, cw + 0.5, ch + 0.5); }
  if (P.wall > 0) { c.strokeStyle = F.L.storm != null && F.L.storm > PLACES[P.place].tide / 2 + P.wall ? "#ff6b81" : "#cfd8ea"; c.lineWidth = 4; c.beginPath(); c.moveTo(10 + 0.18 * mw, 40); c.lineTo(10 + 0.18 * mw, 40 + mh); c.stroke(); c.lineWidth = 1; }
  for (const [i, j] of coast.homes) { const zz = z[j * G + i], fl = F.flooded(zz, i, F.L.high) || (F.L.storm != null && F.flooded(zz, i, F.L.storm)); c.fillStyle = fl ? "#ff6b81" : "#f4f1e8"; c.fillRect(10 + i * cw - 2, 40 + j * ch - 2, 4, 4); }
  TX(c, `${Math.round(P.year)} · ${PLACES[P.place].name} · sea ${(F.L.msl * 100).toFixed(0)} cm above today${P.storm ? ` · 1-in-${P.storm}-year storm` : ""}`, 12, 26, "#eef2f8", "left", "600 13px");
  // key
  let ky = 60; const kx = w * 0.66; for (const [col, t] of [["#1c4a7a", "sea"], ["#3a78c0", "flooded at high tide"], ["#7fb8ff", "flooded in the storm"], ["#ff6b81", "flooded home"], ["#f4f1e8", "home"]]) { c.fillStyle = col; c.fillRect(kx, ky - 9, 12, 12); TX(c, t, kx + 18, ky + 1, "#cfd8ea", "left", "11.5px"); ky += 18; }
  // cross-section along the middle row
  const sy = 40 + mh + 30, sh = h - sy - 20, j0 = Math.round(H * 0.35), X = i => 10 + i * cw, Y = zz => sy + sh * 0.5 - zz * sh / 12;
  c.fillStyle = "#4a3a20"; c.beginPath(); c.moveTo(X(0), sy + sh); for (let i = 0; i < G; i++) c.lineTo(X(i), Y(z[j0 * G + i])); c.lineTo(X(G), sy + sh); c.fill();
  const lev = F.L.storm != null ? F.L.storm : F.L.high; c.fillStyle = "rgba(90,160,255,.45)"; c.beginPath(); c.moveTo(X(0), Y(lev)); for (let i = 0; i < G; i++) { const zz = z[j0 * G + i]; c.lineTo(X(i), Y(Math.max(zz, F.flooded(zz, i, lev) ? lev : zz))); } c.lineTo(X(G), sy + sh); c.lineTo(X(0), sy + sh); c.fill();
  if (P.wall > 0) { c.fillStyle = "#cfd8ea"; c.fillRect(X(0.18 * G) - 3, Y(PLACES[P.place].tide / 2 + P.wall), 6, Y(z[j0 * G + Math.round(0.18 * G)]) - Y(PLACES[P.place].tide / 2 + P.wall)); }
  TX(c, "cross-section (vertical scale exaggerated)", 12, sy - 6, "#8fa0bf", "left", "11px");
}

// ---------------- Charts and readings ----------------
function charts() {
  const pts = proj.filter((q, i) => i % 4 === 0), now = at(proj, P.year), cm = v => v / 10;
  chA.opts.title = "Sea level since 1900 (stacked by cause)"; chA.opts.xLabel = "year"; chA.opts.yLabel = "cm above 1900";
  chA.draw([{ pts: pts.map(q => [q.y, cm(q.th)]), type: "area", color: "#5ad1ff", label: "thermal" }, { pts: pts.map(q => [q.y, cm(q.th + q.gl)]), type: "area", color: "#7ee787", label: "glaciers" }, { pts: pts.map(q => [q.y, cm(q.th + q.gl + q.gr)]), type: "area", color: "#ffd166", label: "Greenland" }, { pts: pts.map(q => [q.y, cm(q.tot)]), type: "area", color: "#ff8a70", label: "Antarctica" }, { pts: [[1900, 0], [1950, 5.5], [1993, 13], [2010, 17.5], [2023, 22]], type: "dots", r: 4, color: "#fff", label: "measured (approx.)" }], { xMin: 1900, xMax: 2300, yMin: 0, vlines: [{ x: P.year, label: "now" }] });
  chB.opts.title = "Warming pathway"; chB.opts.xLabel = "year"; chB.opts.yLabel = "°C above pre-industrial"; chB.draw(Object.keys(SCEN).map((s, i) => ({ pts: Array.from({ length: 81 }, (_, k) => [1900 + k * 5, temp(1900 + k * 5, s)]), color: s === P.scen ? "#ff8a70" : "rgba(160,170,190,.35)", label: s === P.scen ? SCEN[s].name : "" })), { xMin: 1900, xMax: 2300, yMin: 0, vlines: [{ x: P.year }] });
  const F = flooding(), rate = (at(proj, P.year).tot - at(proj, P.year - 10).tot) / 10;
  read.set("sl", cm(now.tot).toFixed(1) + " cm"); read.set("rate", rate.toFixed(1) + " mm per year"); read.set("parts", `${cm(now.th).toFixed(0)} · ${cm(now.gl).toFixed(0)} · ${cm(now.gr).toFixed(0)} · ${cm(now.an).toFixed(0)} cm`); read.set("T", now.T.toFixed(2) + " °C");
  read.set("fl", `${(F.hi * 100).toFixed(1)}% · ${(F.st * 100).toFixed(1)}%`); read.set("hm", `${F.homes} of ${coast.homes.length} (≈ ${Math.round(F.homes / coast.homes.length * PLACES[P.place].people).toLocaleString()} people)`);
  const s = (at(proj, P.year).tot - at(proj, 2024).tot) / 1000, f = pExceed(returnLevel(100) - s); read.set("f100", s <= 0 ? "once in 100 years" : `about every ${Math.max(1, 1 / f).toFixed(0)} years (${(f / 0.01).toFixed(1)} × more often)`);
  ui.hud(P.ice ? "Only ice on land raises sea level" : P.storm ? "A storm surge on top of a high tide on top of a higher sea" : "Thermal expansion + melting land ice");
}
let frame = 0;
ui.run(dt => { if (!(dt > 0)) return; iceT += dt; if (run && !P.ice) { P.year = Math.min(2300, P.year + dt * P.speed); if (frame % 10 === 0) ctl.year.set(Math.round(P.year)); if (P.year >= 2300) run = false; } }, () => { draw(); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("Press ▶ Run on to move forward in time. Try a storm, a sea wall and the ice demo.", 6000);
