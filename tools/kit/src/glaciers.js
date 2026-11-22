/* =====================================================================
   GLACIERS
   A glacier grows where more snow falls each year than melts
   (ACCUMULATION, high up) and shrinks where more melts than falls
   (ABLATION, lower down). The boundary is the equilibrium line (ELA,
   the snowline at the end of summer). The MASS BALANCE is the yearly
   gain or loss of ice. Ice flows downhill under its own weight (it
   deforms like very stiff toffee, and slides if its base is wet), so a
   glacier carries ice from where it gains to where it loses.
   Warm the climate by 1 °C and the ELA rises by about 150 m: the glacier
   shrinks back until it finds a new balance, leaving moraines behind.
   Glaciers erode by ABRASION and PLUCKING: corries (on shady, sheltered
   slopes), U-shaped troughs, arêtes and pyramidal peaks. Freeze–thaw
   weathering is most active where the temperature crosses 0 °C often.
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
// ---------------- mass balance and the flowline glacier ----------------
const ELA0 = 1300, LAPSE = 1 / 0.0065;                       // ELA rises 154 m per °C
const elaOf = (dT, snow) => ELA0 + LAPSE * dT - 400 * (snow - 1);
const balance = (z, ela) => Math.min(2, 0.007 * (z - ela));   // m of ice per year
const NX = 125, DX = 200, SLOPE = 0.1, ZTOP = 2000;           // 25 km valley falling 100 m per km from 2000 m
const bed = i => ZTOP - SLOPE * i * DX;
const GAMMA = 2 * 2.4e-24 * Math.pow(917 * 9.81, 3) / 5 * 3.156e7;   // Glen's law (n = 3) deformation, per year
function newGlacier() { return { H: new Array(NX).fill(0), t: 0, maxL: 0, moraines: [], hist: [] }; }
function glStep(G, ela, dt, slide) {
  // explicit steps must be short enough for the thickest, steepest ice (diffusion stability), so the year is split up as needed
  let left = dt;
  while (left > 1e-9) {
    const H = G.H, s = H.map((h, i) => bed(i) + h), q = new Array(NX + 1).fill(0); let Dmax = 1;
    for (let i = 0; i < NX - 1; i++) { const Hm = (H[i] + H[i + 1]) / 2, gs = (s[i + 1] - s[i]) / DX, D = GAMMA * Math.pow(Hm, 5) * gs * gs + (slide ? 5e-11 * 3.156e7 * Math.pow(Hm, 3) * gs * gs : 0); q[i + 1] = -D * gs; Dmax = Math.max(Dmax, D); }
    const h = Math.min(left, 0.4 * DX * DX / Dmax);
    for (let i = 0; i < NX; i++) H[i] = Math.max(0, H[i] + h * (balance(s[i], ela) - (q[i + 1] - q[i]) / DX));
    left -= h; G.t += h;
  }
  const L = glLength(G); if (L > G.maxL) G.maxL = L; return L;
}
const glLength = G => { let i = NX - 1; while (i > 0 && G.H[i] < 1) i--; return G.H[0] < 1 ? 0 : (i + 1) * DX; };
// steady length predicted by the mean-surface-height rule: L = 2(b₀ − ELA + H̄)/s, H̄ ≈ 130 m
const Ltheory = ela => Math.max(0, 2 * (ZTOP - ela + 130) / SLOPE);
function settleGlacier(ela, years = 1500, slide = false) { const G = newGlacier(); for (let t = 0; t < years; t += 1) glStep(G, ela, 1, slide); return G; }
// ---------------- corrie aspect: snow + drift onto the lee (wind from the SW) − melt from the midday sun (south) ----------------
const corrieBal = a => 0.55 + 0.75 * Math.cos((a - 45) * Math.PI / 180) - 0.95 * Math.cos((a - 190) * Math.PI / 180) * 1 - 0.15;
// ---------------- trough: Nye's channel flow ∇²u = −1 in the ice; erosion ∝ (bed drag)² ----------------
const TW = 60, TH = 30;
function newTrough() { const rock = []; for (let j = 0; j < TH; j++) { rock.push([]); for (let i = 0; i < TW; i++) rock[j].push(j < TH - 3 - Math.abs(i - TW / 2) * 0.85 ? 0 : 1); } return { rock, t: 0, acc: Array.from({ length: TH }, () => new Array(TW).fill(0)) }; }   // j = 0 is the ice surface; a V-shaped valley
function troughStep(T, years) {
  const u = Array.from({ length: TH }, () => new Array(TW).fill(0)), ice = (j, i) => j >= 0 && j < TH && i >= 0 && i < TW && !T.rock[j][i];
  for (let it = 0; it < 220; it++) for (let j = 0; j < TH; j++) for (let i = 0; i < TW; i++) if (ice(j, i)) { const up = j === 0 ? u[j + 1][i] : u[j - 1][i], dn = ice(j + 1, i) ? u[j + 1][i] : 0, l = ice(j, i - 1) ? u[j][i - 1] : 0, r = ice(j, i + 1) ? u[j][i + 1] : 0; u[j][i] += 1.7 * ((up + dn + l + r + 1) / 4 - u[j][i]); }
  // drag on each rock cell next to ice = how fast the neighbouring ice moves; erosion ∝ drag²
  let eroded = 0; for (let j = 1; j < TH; j++) for (let i = 1; i < TW - 1; i++) if (T.rock[j][i]) { let d = 0; for (const [dj, di] of [[-1, 0], [0, -1], [0, 1], [1, 0]]) if (ice(j + dj, i + di)) d = Math.max(d, u[j + dj][i + di]); if (d > 0) { T.acc[j][i] += d * d * years * 2e-5; if (T.acc[j][i] > 1) { T.rock[j][i] = 0; eroded++; } } }
  T.t += years; return u;
}
// fit the cross-section: height of the bed above its lowest point ∝ (distance from the centre)^b
function troughB(T) { const pts = []; let low = 0; const prof = []; for (let i = 0; i < TW; i++) { let j = 0; while (j < TH && !T.rock[j][i]) j++; prof.push(j); low = Math.max(low, j); } let ci = 0, n = 0; prof.forEach((p, i) => { if (p === low) { ci += i; n++; } }); ci /= n; prof.forEach((p, i) => { const x = Math.abs(i - ci), y = low - p; if (x >= 2 && y > 0 && p > 0) pts.push([Math.log(x), Math.log(y)]); }); return pts.length > 3 ? K.linfit(pts).m : NaN; }
// ---------------- freeze–thaw: daily temperatures cross 0 °C ----------------
function freezeThaw(mean, r, amp = 8, day = 5, noise = 3) { let n = 0, prev = mean; for (let d = 0; d < 365; d++) for (let h = 0; h < 24; h += 3) { const T = mean + amp * Math.sin(2 * Math.PI * d / 365) + day * Math.sin(2 * Math.PI * h / 24) + noise * (r ? r.gauss() * 0.6 : 0); if (prev < 0 && T >= 0) n++; prev = T; } return n; }

// ---------------- The page ----------------
const DEF = { view: "glacier", dT: 0, snow: 1, slide: false, aspect: 45, Tmean: 0, speed: 1 };
const P = Object.assign({}, DEF);
let rnd = K.rng(Date.now() % 9973 + 31), G = null, Lhist = [], TR = null, uField = null, ftYear = null;
const ui = K.app({
  title: "Glaciers", subject: "Geography",
  blurb: "A valley glacier that grows and shrinks with the climate; corries, U-shaped troughs and freeze–thaw",
  reset: () => set({}),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel GCSE Geography A (1GA0) Topic 1C Glaciated upland landscapes and processes: glacial and periglacial processes (freeze–thaw, abrasion, plucking), accumulation and ablation, landforms of erosion (corries, arêtes, pyramidal peaks, U-shaped valleys, truncated spurs, hanging valleys) and deposition (moraines, drumlins).", adv: "Pearson Edexcel A level Geography (9GE0) Option 1A Glaciated landscapes and change: glacier mass balance and the ELA, warm- and cold-based ice and movement (internal deformation, basal sliding), response to climate change, glacial erosion processes and landforms, periglacial processes." } },
  missions: [
    { title: "Accumulation and ablation", q: "Look at the glacier and its mass balance. Where does it gain ice and where does it lose it? Why does ice keep flowing down even though the glacier is not growing?", hint: "Above the ELA more snow falls than melts (accumulation); below it more melts (ablation). Ice flows from the accumulation zone to replace what melts below. In balance, the snout stays still while the ice moves.", setup() { set({}); } },
    { title: "Warmer climate", q: "Warm the climate by 1.5 °C. How far does the ELA rise, and how far does the snout retreat?", hint: "The ELA rises about 230 m (154 m per °C). The glacier shrinks back over decades to centuries until the ablation zone is small enough: several kilometres here.", setup() { set({ dT: 1.5 }); } },
    { title: "Moraines", q: "Cool the climate to grow the glacier, then warm it. What is left where the snout reached furthest?", hint: "A terminal moraine marks the furthest advance. As the glacier retreats in stages, recessional moraines are left where the snout paused.", setup() { set({ dT: -1 }); } },
    { title: "Which way does a corrie face?", q: "Turn the slope round to every direction. Which aspect gives a corrie glacier the best balance (in the UK)?", hint: "North to north-east: shaded from the midday sun (less melting) and on the lee side of the prevailing south-westerly winds, so drifting snow builds up there.", setup() { set({ view: "corrie" }); } },
    { title: "V to U", q: "Fill the V-shaped river valley with ice and watch it erode. What shape does it become, and why?", hint: "A U shape: the ice drags hardest on the bed and lower sides, widening and deepening the valley. Spurs are cut off (truncated spurs) and tributary valleys are left hanging.", setup() { set({ view: "trough" }); } },
    { title: "Freeze–thaw", q: "Change the mean temperature from −10 to +10 °C. Where is freeze–thaw weathering most active?", hint: "Near 0 °C, where the temperature crosses freezing most often: water in cracks freezes, expands by 9%, and wedges the rock apart. It produces scree slopes below corrie back walls.", setup() { set({ view: "freeze", Tmean: -5 }); } },
    { lvl: "adv", title: "Warm-based ice", q: "Let the glacier slide at its base. How do its length and speed change?", hint: "With meltwater at the bed, basal sliding adds to internal deformation: the glacier flows faster and becomes thinner and longer. Warm-based glaciers erode much more (abrasion and plucking need sliding).", setup() { set({ slide: true }); } }
  ],
  batch: [
    { title: "Does the snowline rise about 150 m per °C?", question: "How does the measured ELA change with warming?", how: "10 stakes for 5 years; each year's weather moves the ELA (SD 40 m).", xLabel: "warming (°C)", yLabel: "ELA (m)", xs: [-2, -1, 0, 1, 2, 3], reps: 5, fit: true, theory: d => elaOf(d, 1), theoryLabel: "154 m per °C", run: (d, r) => { let s = 0; for (let y = 0; y < 5; y++) s += elaOf(d, 1) + 40 * r.gauss(); return s / 5; }, note: "A straight line of gradient about 154 m per °C (the air cools 6.5 °C per km of height)." },
    { title: "How long is a glacier in a warmer climate?", question: "What steady length does the glacier reach for each amount of warming?", how: "Flowline ice model run for 1500 years at each climate.", xLabel: "warming (°C)", yLabel: "length (km)", xs: [-1, -0.5, 0, 1, 2, 3], reps: 1, yMin: 0, theory: d => Ltheory(elaOf(d, 1)) / 1000, theoryLabel: "L = 2(b₀ − ELA + H̄)/s", run: d => glLength(settleGlacier(elaOf(d, 1))) / 1000, note: "About 2.5–3 km shorter per °C: a small warming makes a big change. The simple rule is within about 10%; it is less good for the longest glaciers, which reach the end of the valley in this model." },
    { title: "Which way should a corrie face?", question: "How does a corrie glacier's balance depend on the direction its slope faces?", how: "Snow + drifting onto the lee of SW winds − melt from the midday sun; each year varies ±0.3 m.", xLabel: "aspect (° from north)", yLabel: "balance (m a year)", xs: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330], reps: 5, theory: corrieBal, theoryLabel: "model", run: (a, r) => corrieBal(a) + 0.3 * r.gauss(), note: "Best facing north to north-east, worst facing south-south-west: most UK corries face N–NE (e.g. Red Tarn on Helvellyn)." },
    { title: "Does ice turn a V into a U?", question: "How does the shape exponent b (bed height ∝ distance^b) change as ice erodes a valley?", how: "Nye channel flow in the cross-section; erosion ∝ (bed drag)²; b fitted on log axes (V ≈ 1, U ≈ 2).", xLabel: "thousands of years", yLabel: "shape exponent b", xs: [0, 10, 20, 30, 40, 50, 60], reps: 1, yMin: 0, theory: () => 2, theoryLabel: "parabola (U)", run: k => { const T = newTrough(); for (let y = 0; y < k; y += 5) troughStep(T, 5000); return troughB(T); }, note: "It starts near 1 (a V) and reaches about 2 (a parabola, the U shape) after roughly 40 thousand years as the ice widens the floor and steepens the sides. Left longer, b keeps rising: a flat-floored trough." },
    { title: "When is freeze–thaw most active? (A level)", question: "How many freeze–thaw cycles a year are there for each mean annual temperature?", how: "Yearly cycle ±8 °C, day–night ±5 °C, weather ±1.8 °C; readings every 3 hours.", xLabel: "mean annual temperature (°C)", yLabel: "freeze–thaw cycles a year", xs: [-14, -10, -6, -4, -2, 0, 2, 4, 6, 10, 14], reps: 5, yMin: 0, theory: m => freezeThaw(m, null), theoryLabel: "without weather", run: (m, r) => freezeThaw(m, r), note: "Most active within a few degrees of 0 °C (where both the daily and yearly cycles cross freezing). Very cold places stay frozen; warm places rarely freeze. Weather adds extra crossings." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "1C", text: "Accumulation: snowfall, avalanches, drifting. Ablation: melting, evaporation, calving. The ELA separates the accumulation and ablation zones; a glacier advances if accumulation > ablation." },
      { lvl: "std", tag: "1C", text: "Erosion: abrasion (rock embedded in the ice scrapes the bed) and plucking (ice freezes onto rock and pulls it away). Freeze–thaw shatters exposed rock above the ice." },
      { lvl: "std", tag: "1C", text: "Landforms: corries (armchair hollows, often facing N–NE in the UK), arêtes (between two corries), pyramidal peaks (three or more), U-shaped valleys, truncated spurs, hanging valleys, ribbon lakes; moraines (terminal, lateral, medial) and drumlins." },
      { lvl: "adv", tag: "1A", text: "Mass balance = accumulation − ablation over a year. Cold-based glaciers move only by internal deformation; warm-based also slide on meltwater (and erode much more)." },
      { lvl: "adv", tag: "1A", text: "Response to climate change: the ELA rises ≈ 150 m per °C; the glacier adjusts over a response time of decades to centuries, leaving recessional moraines." }
    ],
    questions: [
      { lvl: "std", marks: 4, q: "Explain how a corrie forms.", ans: "<ul><li>snow collects in a hollow on a shaded (N–NE) slope and turns to ice</li><li>plucking steepens the back wall; freeze–thaw adds scree</li><li>rotational movement and abrasion deepen the hollow</li><li>a rock lip forms where erosion is less; when the ice melts a tarn may fill the hollow</li></ul>" },
      { lvl: "adv", marks: 2, q: () => `If the climate warms by ${P.dT || 1} °C, by how much does the ELA rise (lapse rate 6.5 °C per km)?`, ans: () => `<ul><li>ΔELA = ΔT ÷ 0.0065</li><li>= ${((P.dT || 1) / 0.0065).toFixed(0)} m</li></ul>` }
    ]
  },
  notes: `<h3>The models</h3>
<ul><li>Mass balance b = 0.007 (z − ELA) m a year (at most +2); ELA = 1300 m + 154 m per °C − 40 m per 10% more snowfall.</li>
<li>Flowline glacier (shallow-ice approximation): ice flux = ΓH⁵|∇s|² (Glen's law, n = 3, A = 2.4 × 10⁻²⁴ Pa⁻³ s⁻¹) plus sliding ∝ H³|∇s|² when warm-based; a straight valley falling 100 m per km from 2000 m. Steady length rule L = 2(b₀ − ELA + H̄)/s with H̄ ≈ 130 m.</li>
<li>Corrie balance = snow + drift onto lee slopes (prevailing wind from the SW) − melt from the midday sun (illustrative).</li>
<li>Trough: Nye's channel-flow model ∇²u = −1 solved in the cross-section; each rock cell next to the ice erodes ∝ (ice speed beside it)².</li>
<li>Freeze–thaw: temperature = yearly cycle + day–night cycle + weather; a cycle is counted each time it rises through 0 °C.</li></ul>
<h3>Left out</h3><ul><li>Real valley shapes and tributaries, debris cover, calving, isostasy, ice temperature in detail. Constants are illustrative.</li></ul>
<p>The earlier version of this simulation and its worksheets are kept in <a href="original/glaciers.html">original/glaciers.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {}, grp = {};
let g = ui.group("View");
ctl.view = K.seg(g, { value: "glacier", options: [["glacier", "🏔 valley glacier"], ["corrie", "🧭 corrie aspect"], ["trough", "⛰ V to U"], ["freeze", "❄ freeze–thaw"]], on: v => { P.view = v; showGroups(); } });
ctl.speed = K.slider(g, { label: "Speed", min: 0.25, max: 8, step: 0.25, value: 1, fmt: v => v + "×", on: v => P.speed = v });
ui.headerSpeed(ctl.speed);   // playback speed lives in the header, beside Pause and Reset
grp.glacier = g = ui.group("Climate");
ctl.dT = K.slider(g, { label: "Warming (+) or cooling (−)", min: -2, max: 3, step: 0.1, value: 0, unit: "°C", on: v => P.dT = v });
ctl.snow = K.slider(g, { label: "Snowfall", min: 0.5, max: 1.5, step: 0.05, value: 1, fmt: v => (v * 100).toFixed(0) + "% of today", on: v => P.snow = v });
ctl.slide = K.toggle(g, { label: "Warm-based: basal sliding (A level)", value: false, on: v => P.slide = v });
let rr = K.row(g); K.btn(rr, "↺ Grow from bare rock", () => { G = newGlacier(); Lhist = []; });
grp.corrie = g = ui.group("Corrie");
ctl.aspect = K.slider(g, { label: "Direction the slope faces", min: 0, max: 359, step: 1, value: 45, fmt: v => v + "° (" + ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(v / 45) % 8] + ")", on: v => P.aspect = v });
grp.trough = g = ui.group("Trough");
rr = K.row(g); K.btn(rr, "↺ A new V-shaped valley", () => { TR = newTrough(); uField = null; });
grp.freeze = g = ui.group("Freeze–thaw");
ctl.Tmean = K.slider(g, { label: "Mean annual temperature", min: -15, max: 15, step: 0.5, value: 0, unit: "°C", on: v => P.Tmean = v });
const read = K.readout(ui.group("Readings"), [["a", ""], ["b", ""], ["c", ""], ["d", ""], ["e", ""]]);
const relabel = names => names.forEach((n, i) => read.el.children[i].firstElementChild.textContent = n);
function showGroups() { for (const k in grp) grp[k].style.display = k === P.view ? "" : "none"; }
function set(o) { Object.assign(P, DEF, o); for (const k of ["dT", "snow", "aspect", "Tmean", "speed"]) ctl[k].set(P[k]); ctl.slide.set(P.slide); ctl.view.set(P.view); G = settleGlacier(elaOf(0, 1), 800); G.t = 0; G.maxL = glLength(G); G.moraines = []; Lhist = []; TR = newTrough(); uField = null; showGroups(); }

// ---------------- Simulation ----------------
let lastL = 0, trAcc = 0;
function tick(dt) {
  const s = dt * P.speed;
  if (P.view === "glacier") { const yrs = s * 25, ela = elaOf(P.dT, P.snow) + 40 * rnd.gauss() * 0.3; glStep(G, ela, yrs, P.slide); const L = glLength(G); if (L < lastL - 1 && lastL >= G.maxL - 1 && !G.moraines.some(m => Math.abs(m - lastL) < 300)) G.moraines.push(lastL); lastL = L; if (!Lhist.length || G.t - Lhist[Lhist.length - 1][0] >= 5) Lhist.push([G.t, L / 1000]); if (Lhist.length > 400) Lhist.shift(); }
  if (P.view === "trough") { trAcc += s; if (trAcc > 0.4) { trAcc = 0; uField = troughStep(TR, 2000); } }
  if (P.view === "freeze") ftYear = null;
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function drawGlacier(c, w, h) {
  const x0 = 40, x1 = w - 30, y0 = 60, y1 = h - 50, X = i => x0 + (x1 - x0) * i / (NX - 1), Y = z => y1 - (y1 - y0) * (z - (ZTOP - SLOPE * NX * DX) * 0) / ZTOP * 0.92 - 0, ela = elaOf(P.dT, P.snow);
  c.fillStyle = "#5a4a3a"; c.beginPath(); c.moveTo(X(0), y1); for (let i = 0; i < NX; i++) c.lineTo(X(i), Y(bed(i))); c.lineTo(X(NX - 1), y1); c.fill();
  c.fillStyle = "#d8ecff"; c.beginPath(); c.moveTo(X(0), Y(bed(0))); for (let i = 0; i < NX; i++) c.lineTo(X(i), Y(bed(i) + G.H[i] * 3)); for (let i = NX - 1; i >= 0; i--) c.lineTo(X(i), Y(bed(i))); c.fill();
  c.strokeStyle = "#5ad1ff"; c.setLineDash([6, 4]); c.beginPath(); c.moveTo(x0, Y(ela)); c.lineTo(x1, Y(ela)); c.stroke(); c.setLineDash([]); TX(c, `ELA ${ela.toFixed(0)} m: accumulation above, ablation below`, x1, Y(ela) - 6, "#5ad1ff", "right", "600 12px");
  for (const m of G.moraines) { const i = Math.min(NX - 1, Math.round(m / DX)); c.fillStyle = "#b8a080"; c.beginPath(); c.arc(X(i), Y(bed(i)) - 4, 7, Math.PI, 0); c.fill(); }
  const L = glLength(G), si = Math.min(NX - 1, Math.round(L / DX)); TX(c, "snout", X(si), Y(bed(si)) + 18, "#eef2f8", "center", "11.5px");
  // flow arrows inside the ice
  const t = performance.now() / 1000; for (let i = 3; i < si; i += 8) { if (G.H[i] < 20) continue; const off = (t * 0.6 + i) % 1; c.fillStyle = "#3a7bd5"; c.beginPath(); c.arc(X(i + off * 4), Y(bed(i) + G.H[i] * 1.5), 2.5, 0, 6.3); c.fill(); }
  c.fillStyle = "rgba(11,16,32,.8)"; c.fillRect(12, 12, 470, 26);   // dark backing so the headline reads over the ice
  TX(c, `${G.t.toFixed(0)} years · length ${(L / 1000).toFixed(2)} km · ice ×3 thicker than true scale`, 20, 30, "#eef2f8", "left", "600 14px");
}
function drawCorrie(c, w, h) {
  const cx = w * 0.35, cy = h * 0.5, R = Math.min(w, h) * 0.33;
  c.strokeStyle = "#2a3550"; c.beginPath(); c.arc(cx, cy, R, 0, 6.3); c.stroke(); ["N", "E", "S", "W"].forEach((d, k) => TX(c, d, cx + (R + 16) * Math.sin(k * Math.PI / 2), cy - (R + 16) * Math.cos(k * Math.PI / 2) + 4, "#cfd8ea", "center", "600 13px"));
  c.beginPath(); for (let a = 0; a <= 360; a += 3) { const b = corrieBal(a), r = R * (b + 2) / 4, x = cx + r * Math.sin(a * Math.PI / 180), y = cy - r * Math.cos(a * Math.PI / 180); a ? c.lineTo(x, y) : c.moveTo(x, y); } c.closePath(); c.fillStyle = "rgba(90,209,255,.15)"; c.fill(); c.strokeStyle = "#5ad1ff"; c.stroke();
  c.strokeStyle = "#7a8394"; c.setLineDash([3, 3]); c.beginPath(); c.arc(cx, cy, R * 0.5, 0, 6.3); c.stroke(); c.setLineDash([]); TX(c, "zero balance", cx + R * 0.5 + 4, cy, "#7a8394", "left", "10.5px");
  const a = P.aspect * Math.PI / 180; c.strokeStyle = "#ffd166"; c.lineWidth = 3; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + R * Math.sin(a), cy - R * Math.cos(a)); c.stroke(); c.lineWidth = 1;
  TX(c, "☀ midday sun from the south: more melting", cx, cy + R + 40, "#ffd166", "center", "12px"); TX(c, "🌬 prevailing wind from the SW: snow drifts onto NE slopes", cx, 30, "#cfd8ea", "center", "12px");
  TX(c, `balance facing ${P.aspect}°: ${corrieBal(P.aspect).toFixed(2)} m a year`, w * 0.7, h * 0.4, corrieBal(P.aspect) > 0 ? "#7ee787" : "#ff8a70", "left", "600 15px");
  TX(c, corrieBal(P.aspect) > 0 ? "a corrie glacier can survive and erode here" : "too much melting: no corrie glacier", w * 0.7, h * 0.4 + 24, "#cfd8ea", "left", "12.5px");
}
function drawTrough(c, w, h) {
  const cs = Math.min((w - 80) / TW, (h - 80) / TH), x0 = (w - cs * TW) / 2, y0 = 50;
  let umax = 1e-9; if (uField) for (const row of uField) for (const v of row) umax = Math.max(umax, v);
  for (let j = 0; j < TH; j++) for (let i = 0; i < TW; i++) { if (TR.rock[j][i]) c.fillStyle = "#6a5a48"; else { const u = uField ? uField[j][i] / umax : 0.5; c.fillStyle = `rgb(${Math.round(150 + 80 * u)},${Math.round(200 + 40 * u)},255)`; } c.fillRect(x0 + i * cs, y0 + j * cs, cs + 0.5, cs + 0.5); }
  TX(c, `${(TR.t / 1000).toFixed(0)} thousand years of ice · shape exponent b = ${(troughB(TR) || 0).toFixed(2)} (V ≈ 1, U ≈ 2) · paler ice moves faster`, 20, 30, "#eef2f8", "left", "600 13.5px");
}
function drawFreeze(c, w, h) {
  const x0 = 60, x1 = w - 30, y0 = 60, y1 = h - 60, X = d => x0 + (x1 - x0) * d / 365, Y = T => (y0 + y1) / 2 - T * (y1 - y0) / 50, r = K.rng(7);
  c.strokeStyle = "#2a3550"; c.beginPath(); c.moveTo(x0, Y(0)); c.lineTo(x1, Y(0)); c.stroke(); TX(c, "0 °C", x0 - 6, Y(0) + 4, "#8fa0bf", "right", "11px");
  c.strokeStyle = "#5ad1ff"; c.beginPath(); let prev = null, n = 0; for (let d = 0; d < 365; d++) for (let hh = 0; hh < 24; hh += 3) { const T = P.Tmean + 8 * Math.sin(2 * Math.PI * d / 365) + 5 * Math.sin(2 * Math.PI * hh / 24) + 3 * r.gauss() * 0.6, x = X(d + hh / 24); prev === null ? c.moveTo(x, Y(T)) : c.lineTo(x, Y(T)); if (prev !== null && prev < 0 && T >= 0) { n++; } prev = T; } c.stroke();
  TX(c, `mean ${P.Tmean} °C: ${n} freeze–thaw cycles this year`, 20, 30, "#eef2f8", "left", "600 14px"); TX(c, "each rise through 0 °C after freezing = one cycle: water in cracks froze (expanding 9%) then thawed", 20, h - 20, "#cfd8ea", "left", "12px");
}
function draw() { const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); ({ glacier: drawGlacier, corrie: drawCorrie, trough: drawTrough, freeze: drawFreeze })[P.view](c, w, h); }

// ---------------- Charts and readings ----------------
function charts() {
  if (P.view === "glacier") {
    const ela = elaOf(P.dT, P.snow), bp = []; for (let z = 0; z <= 2000; z += 50) bp.push([balance(z, ela), z]);
    chA.opts.title = "Length over time"; chA.opts.xLabel = "years"; chA.opts.yLabel = "km"; chA.draw([{ pts: Lhist, color: "#5ad1ff", label: "length" }, { pts: Lhist.length ? [[Lhist[0][0], Ltheory(ela) / 1000], [Math.max(Lhist[0][0] + 1, G.t), Ltheory(ela) / 1000]] : [], color: "#ffd166", dash: [5, 4], label: "steady length (rule)" }], { yMin: 0 });
    chB.opts.title = "Mass balance against height"; chB.opts.xLabel = "balance (m of ice a year)"; chB.opts.yLabel = "height (m)"; chB.draw([{ pts: bp, color: "#7ee787", label: "b(z)" }, { pts: [[0, 0], [0, 2000]], color: "#3a4a6b", label: "" }], { xMin: -10, xMax: 2.5, yMin: 0 });
    const L = glLength(G); let vol = 0; G.H.forEach(hh => vol += hh * DX); relabel(["length", "steady length (rule)", "ELA", "thickest ice", "ice in the valley (per m width)"]);
    read.set("a", (L / 1000).toFixed(2) + " km"); read.set("b", (Ltheory(ela) / 1000).toFixed(2) + " km"); read.set("c", ela.toFixed(0) + " m"); read.set("d", Math.max(...G.H).toFixed(0) + " m"); read.set("e", (vol / 1e6).toFixed(2) + " km²");
    ui.hud("Accumulation above the ELA, ablation below: ice flows between them");
  } else if (P.view === "corrie") {
    const pts = []; for (let a = 0; a <= 360; a += 5) pts.push([a, corrieBal(a)]);
    chA.opts.title = "Corrie balance against aspect"; chA.opts.xLabel = "aspect (° from north)"; chA.opts.yLabel = "m a year"; chA.draw([{ pts, color: "#5ad1ff", label: "balance" }, { pts: [[P.aspect, corrieBal(P.aspect)]], type: "dots", r: 6, color: "#fff", label: "now" }, { pts: [[0, 0], [360, 0]], color: "#3a4a6b", label: "" }], { xMin: 0, xMax: 360 });
    chB.draw([], {}); chB.opts.title = "";
    relabel(["aspect", "balance", "best aspect", "worst aspect", ""]);
    let best = 0, worst = 0; for (let a = 0; a < 360; a++) { if (corrieBal(a) > corrieBal(best)) best = a; if (corrieBal(a) < corrieBal(worst)) worst = a; }
    read.set("a", P.aspect + "°"); read.set("b", corrieBal(P.aspect).toFixed(2) + " m a year"); read.set("c", best + "°"); read.set("d", worst + "°"); read.set("e", "");
    ui.hud("UK corries face north to north-east");
  } else if (P.view === "trough") {
    const prof = []; for (let i = 0; i < TW; i++) { let j = 0; while (j < TH && !TR.rock[j][i]) j++; prof.push([i, -j]); }
    chA.opts.title = "Valley floor profile"; chA.opts.xLabel = "across the valley"; chA.opts.yLabel = "height"; chA.draw([{ pts: prof, color: "#c9a0ff", label: "bed" }], {});
    chB.draw([], {}); chB.opts.title = "";
    relabel(["time", "shape exponent b", "", "", ""]); read.set("a", (TR.t / 1000).toFixed(0) + " thousand years"); read.set("b", (troughB(TR) || 0).toFixed(2)); read.set("c", ""); read.set("d", ""); read.set("e", "");
    ui.hud("The ice drags hardest low on the sides: V becomes U");
  } else {
    const pts = []; for (let m = -15; m <= 15; m += 0.5) pts.push([m, freezeThaw(m, null)]);
    chA.opts.title = "Freeze–thaw cycles against mean temperature"; chA.opts.xLabel = "°C"; chA.opts.yLabel = "cycles a year"; chA.draw([{ pts, color: "#5ad1ff", label: "without weather" }, { pts: [[P.Tmean, freezeThaw(P.Tmean, null)]], type: "dots", r: 6, color: "#fff", label: "now" }], { yMin: 0 });
    chB.draw([], {}); chB.opts.title = "";
    relabel(["mean temperature", "cycles a year (no weather)", "", "", ""]); read.set("a", P.Tmean + " °C"); read.set("b", String(freezeThaw(P.Tmean, null))); read.set("c", ""); read.set("d", ""); read.set("e", "");
    ui.hud("Freeze–thaw peaks near 0 °C");
  }
}
let frame = 0;
ui.run(dt => { if (dt > 0) tick(dt); }, () => { draw(); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("The glacier is in balance with today's climate. Warm it and watch.", 6000);
