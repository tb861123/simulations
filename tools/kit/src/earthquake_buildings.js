/* =====================================================================
   EARTHQUAKE ENGINEERING: a shake table for buildings
   Each building is a stack of heavy floors joined by springy columns
   (engineers call this a "shear building"). Newton's second law is
   solved for every floor, 500 times a second:
        m a = (spring forces from the columns above and below)
              + (damping forces)  -  m × (ground acceleration)
   Resonance, base isolation and tuned mass dampers are not scripted:
   they come out of F = ma.
   ===================================================================== */
const M_FLOOR = 5e4;      // mass of one floor, kg
const K_STOREY = 4e7;     // sideways stiffness of one storey's columns, N/m
const H_STOREY = 3;       // storey height, m
const DRIFT_FAIL = 0.10;  // a storey collapses if it is sheared by more than 10 cm (about 3% of its height)
const G = 9.81;

class Building {
  constructor(o) { this.o = Object.assign({ n: 5, brace: false, iso: false, tmd: false, zeta: 0.03 }, o); this.init(); }
  init() {
    const o = this.o, n = o.n; this.x = new Float64Array(n); this.v = new Float64Array(n); this.maxDrift = new Float64Array(n); this.xb = 0; this.vb = 0; this.xd = 0; this.vd = 0;
    this.k = K_STOREY * (o.brace ? 3 : 1);                               // cross-bracing makes each storey about 3x stiffer
    this.w1 = 2 * Math.sqrt(this.k / M_FLOOR) * Math.sin(Math.PI / (2 * (2 * n + 1)));   // theory: lowest natural (angular) frequency
    this.c = 2 * o.zeta / this.w1 * this.k;                              // damping in the columns, giving the chosen damping ratio
    const Mtot = n * M_FLOOR;
    this.mb = M_FLOOR; this.kb = (Mtot + this.mb) * (2 * Math.PI / 2.5) ** 2; this.cb = 2 * 0.15 * Math.sqrt(this.kb * (Mtot + this.mb));   // rubber bearings: 2.5 s period, 15% damping
    const mu = 0.04; this.md = mu * Mtot; const wd = this.w1 / (1 + mu); this.kd = this.md * wd * wd; this.cd = 2 * Math.sqrt(3 * mu / (8 * (1 + mu) ** 3)) * this.md * wd;   // damper: 4% of the building's mass, tuned to its natural frequency
    this.collapsed = -1; this.peakRoof = 0; this.fall = 0;
  }
  get f1() { return this.w1 / (2 * Math.PI); }
  roof() { return this.x[this.o.n - 1]; }
  // advance by dt seconds while the ground accelerates at ag (m/s²). All displacements are measured relative to the ground.
  step(dt, ag) {
    if (this.collapsed >= 0) { this.fall = Math.min(1, this.fall + dt * 2.5); return; }
    const { x, v, k, c } = this, o = this.o, n = o.n, a = this.a || (this.a = new Float64Array(n)); let fbase = 0;
    for (let j = 0; j < n; j++) {
      const xl = j ? x[j - 1] : (o.iso ? this.xb : 0), vl = j ? v[j - 1] : (o.iso ? this.vb : 0);
      let F = -k * (x[j] - xl) - c * (v[j] - vl);                                   // columns below pull the floor back
      if (j < n - 1) F += k * (x[j + 1] - x[j]) + c * (v[j + 1] - v[j]);           // columns above drag it along
      if (j === 0) fbase = -F;
      if (j === n - 1 && o.tmd) F += this.kd * (this.xd - x[j]) + this.cd * (this.vd - v[j]);   // the damper pushes on the roof
      a[j] = F / M_FLOOR - ag;
    }
    if (o.iso) { const ab = (-this.kb * this.xb - this.cb * this.vb + k * (x[0] - this.xb) + c * (v[0] - this.vb)) / this.mb - ag; this.vb += ab * dt; this.xb += this.vb * dt; }
    if (o.tmd) { const ad = (-this.kd * (this.xd - x[n - 1]) - this.cd * (this.vd - v[n - 1])) / this.md - ag; this.vd += ad * dt; this.xd += this.vd * dt; }
    for (let j = 0; j < n; j++) v[j] += a[j] * dt;
    for (let j = 0; j < n; j++) x[j] += v[j] * dt;
    for (let j = 0; j < n; j++) { const d = Math.abs(x[j] - (j ? x[j - 1] : (o.iso ? this.xb : 0))); if (d > this.maxDrift[j]) this.maxDrift[j] = d; if (d > DRIFT_FAIL && this.collapsed < 0) this.collapsed = j; }
    const r = Math.abs(x[n - 1]); if (r > this.peakRoof) this.peakRoof = r;
  }
  peakDrift() { return Math.max(...this.maxDrift); }
}
// A synthetic earthquake: a dozen sine waves with random frequencies near f0, inside a build-up-and-die-away envelope
function quake(rand, f0, pga, dur = 20) {
  const parts = []; for (let i = 0; i < 14; i++) parts.push([f0 * Math.exp(rand.gauss() * 0.35), rand() * 6.283, 0.5 + rand()]);
  const norm = pga * G / 3.2;
  return t => { if (t > dur) return 0; const env = Math.min(1, t / 2) * Math.min(1, (dur - t) / 6); let s = 0; for (const [f, p, a] of parts) s += a * Math.sin(6.283 * f * t + p); return s * env * norm; };
}
function runQuake(b, ag, dur = 22) { const dt = 0.002; for (let t = 0; t < dur; t += dt) b.step(dt, ag(t)); return b; }
// Steady-state roof amplitude under sine shaking (used for the resonance curves)
function sineResponse(o, f, pga) { const b = new Building(o), dt = Math.min(0.002, 0.02 / f), T = Math.max(14, 28 / f); let pk = 0; for (let t = 0; t < T; t += dt) { b.step(dt, pga * G * Math.sin(6.283 * f * t)); if (t > T * .7) pk = Math.max(pk, Math.abs(b.roof())); } return b.collapsed >= 0 ? NaN : pk; }

// ---------------------------------------------------------------- page
let blds = [], sel = 1, mode = "sine", t = 0, phase = 0, fNow = 1, xg = 0, vg = 0, agNow = 0, eq = null, hand = 0, handOn = false, rate = 1, hist, curves = [], dust = []; const S = {};
const BCOL = ["#5ad1ff", "#ffb454", "#c4a1ff"];
const ui = K.app({
  title: "Earthquake Engineering", subject: "Engineering", blurb: "A shake table for buildings: find resonance, then design your way out of it.",
  reset: () => resetAll(),
  missions: [
    { title: "Which one falls?", q: "Three buildings: 2, 5 and 10 storeys. The ground shakes at 1.3 Hz. <b>Predict</b> which is in most danger before you watch. Then try 0.7 Hz and 2.8 Hz.", hint: "Each building has its own natural frequency (taller = lower). The one whose natural frequency matches the shaking resonates: each push arrives in step with the sway, and the motion builds until the columns fail. Height alone does not decide it.", setup: () => { preset([2, 5, 10]); S.mode.set("sine", true); S.f.set(1.3, true); S.pga.set(0.15, true); } },
    { title: "Find the resonance by hand", q: "<b>You</b> are the earthquake: drag the ground left and right. Can you bring down the tall building without toppling the short one? Then the other way round.", hint: "Slow, rhythmic pushes (about one every 1.5 s) pump energy into the 10-storey tower. The short building needs fast shaking, about 3 pushes per second.", setup: () => { preset([2, 5, 10]); S.mode.set("hand", true); } },
    { title: "Mexico City, 1985", q: "The city stands on a soft, dried-out lake bed that shook at about 0.5 Hz for a long time. Mid-rise buildings of 6 to 15 storeys suffered far worse than low houses or skyscrapers. Run this earthquake several times. Does the model agree?", hint: "Soft soil filters the earthquake down to slow, long-lasting waves that match the natural period of mid-rise buildings. Low buildings are too 'fast' and very tall ones too 'slow' to resonate.", setup: () => { preset([2, 9, 12]); S.mode.set("quake", true); S.soil.set(0.7, true); S.pga.set(0.25, true); resetAll(); } },
    { title: "Stiffen it", q: "Add <b>cross-bracing</b> to the 5-storey building and sweep the frequency. What happens to its resonance peak? Is bracing always safer?", hint: "Bracing makes the building stiffer, which raises its natural frequency (f ∝ √k). That moves it away from slow shaking but towards fast shaking. Stiffer is different, not automatically safer.", setup: () => { preset([5, 5, 10]); blds[1].o.brace = true; blds[1].init(); sync(); S.mode.set("sweep", true); S.pga.set(0.1, true); resetAll(); } },
    { title: "Float the building", q: "Building 2 sits on rubber <b>base isolation</b> bearings; building 1 is identical but bolted to the ground. Shake them at their natural frequency. Where does the movement go?", hint: "The soft bearings do the moving, so the building rides almost rigidly above them and its storeys hardly shear. The isolated building has a new, very low natural frequency (about 0.4 Hz): keep clear of that.", setup: () => { preset([5, 5, 10]); blds[1].o.iso = true; blds[1].init(); sync(); S.mode.set("sine", true); S.f.set(1.3, true); S.pga.set(0.15, true); resetAll(); } },
    { title: "The tuned mass damper", q: "Taipei 101 has a 660-tonne steel ball hanging near the top. Building 2 has a damper like it; building 1 does not. Shake at their natural frequency and watch the block on the roof. How does it help?", hint: "The damper is tuned to the building's own frequency, so it swings out of step with the building and pushes back against the sway, soaking up the energy. On the resonance chart, one tall peak becomes two small ones.", setup: () => { preset([10, 10, 5]); blds[1].o.tmd = true; blds[1].init(); sync(); S.mode.set("sine", true); S.f.set(blds[0].f1, true); S.pga.set(0.06, true); resetAll(); } },
    { title: "Design brief", q: "A hospital of 8 storeys must survive a strong (0.4 g) earthquake on either soft soil or hard rock. Using bracing, isolation and a damper, find a design that survives both, five times in a row.", hint: "Base isolation deals best with fast, hard-rock shaking; on soft soil its slow sway can be a problem, where a damper helps. Real engineers combine methods and run thousands of simulated earthquakes, as the Batch run does.", setup: () => { preset([8, 8, 8]); S.mode.set("quake", true); S.soil.set(1, true); S.pga.set(0.4, true); resetAll(); } },
  ],
  batch: [
    { title: "Natural frequency and height", question: "How does a building's natural frequency depend on its number of storeys?", how: "Each building is shaken by a small random tremor, then the sways of its roof are counted.", xLabel: "storeys", yLabel: "natural frequency (Hz)", xs: [1, 2, 3, 4, 6, 8, 10, 12], reps: 5, yMin: 0,
      theory: n => 2 * Math.sqrt(K_STOREY / M_FLOOR) * Math.sin(Math.PI / (2 * (2 * n + 1))) / 6.283, theoryLabel: "shear-building theory",
      run: (n, r) => { const b = new Building({ n, zeta: 0.005 }), ag = quake(r, b.f1 * (0.6 + r()), 0.02, 6), dt = 0.002; let z = 0, t0 = null, t1 = 0, last = 0; for (let t = 0; t < 26; t += dt) { b.step(dt, ag(t)); const x = b.roof(); if (t > 8 && last < 0 && x >= 0) { z++; if (t0 == null) t0 = t; t1 = t; } last = x; } return z > 1 ? (z - 1) / (t1 - t0) : null; },
      note: "The tremor is random, so higher modes of vibration are excited by different amounts each time and add extra wiggles to the count. For tall buildings f ≈ constant ÷ number of storeys." },
    { title: "Resonance curve", question: "At what shaking frequency does a 5-storey building respond most?", how: "Steady sine shaking at 0.05 g. The roof's steady swing is recorded. Damping ratio is varied a little between runs (2–4%).", xLabel: "shaking frequency (Hz)", yLabel: "roof swing (cm)", xs: [0.4, 0.7, 0.9, 1.1, 1.2, 1.28, 1.36, 1.5, 1.8, 2.2, 2.8, 3.74, 4.5], reps: 4, yMin: 0,
      run: (f, r) => sineResponse({ n: 5, zeta: 0.02 + r() * 0.02 }, f, 0.05) * 100, note: "Near resonance the height of the peak is set almost entirely by damping, so small differences in damping give large differences in swing. Away from resonance damping hardly matters. (The small bump near 3.7 Hz is the second mode.)" },
    { title: "Soft soil: who is at risk?", question: "On soft ground (slow 0.7 Hz shaking), which heights collapse?", how: "Random 0.3 g earthquakes. Result = 1 if the building collapses, so the mean is the probability of collapse.", xLabel: "storeys", yLabel: "probability of collapse", xs: [1, 2, 3, 4, 6, 8, 10, 12], reps: 25, yMin: 0, yMax: 1.05,
      run: (n, r) => runQuake(new Building({ n }), quake(r, 0.7, 0.3)).collapsed >= 0 ? 1 : 0, note: "Every earthquake is different: its mix of frequencies sometimes lands on a building's natural frequency and sometimes misses it." },
    { title: "Hard rock: who is at risk?", question: "On rock (fast 3 Hz shaking), which heights collapse?", how: "Random, stronger (0.6 g) earthquakes with fast shaking. Result = 1 if the building collapses.", xLabel: "storeys", yLabel: "probability of collapse", xs: [1, 2, 3, 4, 6, 8, 10, 12], reps: 25, yMin: 0, yMax: 1.05,
      run: (n, r) => runQuake(new Building({ n }), quake(r, 3, 0.6)).collapsed >= 0 ? 1 : 0, note: "Compare with the soft-soil experiment: the dangerous height has changed. Building codes depend on what is under the foundations." },
    { title: "Does base isolation work?", question: "How much does isolation reduce the worst storey shear?", how: "A 5-storey building in random 0.3 g hard-rock earthquakes. x = 0 is bolted down, x = 1 is isolated.", xLabel: "base isolation (0 = no, 1 = yes)", yLabel: "worst storey drift (cm)", xs: [0, 1], reps: 30, yMin: 0,
      run: (iso, r) => { const b = new Building({ n: 5, iso: !!iso }); runQuake(b, quake(r, 3, 0.3)); return Math.min(b.peakDrift(), 0.3) * 100; }, note: "The dashed collapse limit is 10 cm. Bolted-down buildings that collapsed are recorded at the drift they reached when they failed." },
  ],
  notes: `<h3>The model</h3><ul><li>Each floor is a 50-tonne mass that can only move sideways. Each storey's columns act as a spring of stiffness 4 × 10⁷ N/m, with a little damping (3% of critical).</li><li>Newton's second law is integrated for every floor in steps of 2 ms.</li><li>Natural frequency in theory: <code>f₁ = (1/π)·√(k/m)·sin(π / (2(2N+1)))</code> for N storeys.</li></ul>
  <h3>The engineering options</h3><ul><li><b>Cross-bracing</b>: storey stiffness × 3.</li><li><b>Base isolation</b>: the building rests on rubber bearings with a 2.5 s natural period and 15% damping.</li><li><b>Tuned mass damper</b>: a block of 4% of the building's mass on the roof, on a spring tuned to the building's natural frequency.</li></ul>
  <h3>Assumptions and simplifications</h3><ul><li>Sideways motion in one direction only: no twisting, rocking or vertical shaking.</li><li>Columns are perfectly elastic until a storey is sheared by 10 cm, then that storey fails completely. Real buildings yield, crack and absorb energy before collapse.</li><li>All floors and storeys are identical.</li><li>The synthetic earthquake is a random mix of sine waves near one main frequency, lasting 20 s. Real records are more complicated.</li><li>Displacements are drawn about 8 times larger than the building's scale so that you can see them.</li><li>The ground is rigid: the building does not affect the soil.</li></ul>`,
});
let g = ui.group("Ground motion");
S.mode = K.seg(g, { value: "sine", options: [["sine", "Steady shake"], ["sweep", "Frequency sweep"], ["quake", "Earthquake"], ["hand", "Drag the ground"]], on: v => { mode = v; resetAll(); ui.tip({ sine: "Steady sine-wave shaking at the chosen frequency", sweep: "The frequency rises slowly from 0.3 Hz to 6 Hz", quake: "A random 20-second earthquake. Reset for a new one.", hand: "Drag anywhere on the picture, left and right, to shake the ground" }[v], 5000); } });
S.f = K.slider(g, { label: "Shaking frequency", min: 0.2, max: 6, step: 0.02, value: 1.3, fmt: v => v.toFixed(2) + " Hz" });
S.pga = K.slider(g, { label: "Peak ground acceleration", min: 0.02, max: 1, step: 0.01, value: 0.15, fmt: v => v.toFixed(2) + " g" });
S.soil = K.slider(g, { label: "Earthquake main frequency (soil type)", min: 0.4, max: 5, step: 0.1, value: 2, fmt: v => v.toFixed(1) + " Hz" + (v < 1 ? " · soft soil" : v > 3 ? " · hard rock" : "") });
g = ui.group("Selected building");
S.sel = K.seg(g, { value: 1, options: [[0, "Building 1"], [1, "Building 2"], [2, "Building 3"]], on: v => { sel = v; sync(); }, tip: "Or click a building in the picture." });
S.n = K.slider(g, { label: "Storeys", min: 1, max: 12, step: 1, value: 5, on: v => { blds[sel].o.n = v; blds[sel].init(); changed(); } });
S.brace = K.toggle(g, { label: "Cross-bracing (3× stiffer)", on: v => { blds[sel].o.brace = v; blds[sel].init(); changed(); } });
S.iso = K.toggle(g, { label: "Base isolation (rubber bearings)", on: v => { blds[sel].o.iso = v; blds[sel].init(); changed(); } });
S.tmd = K.toggle(g, { label: "Tuned mass damper on the roof", on: v => { blds[sel].o.tmd = v; blds[sel].init(); changed(); } });
S.zeta = K.slider(g, { label: "Damping", min: 0.5, max: 10, step: 0.5, value: 3, unit: "% of critical", on: v => { blds[sel].o.zeta = v / 100; blds[sel].init(); changed(); } });
const read = K.readout(g, [["f1", "Natural frequency"], ["T", "Natural period"], ["roof", "Peak roof sway"], ["drift", "Worst storey drift"]]);
g = ui.group("View");
S.rate = K.slider(g, { label: "Time", min: 0.1, max: 2, step: 0.1, value: 1, fmt: v => v === 1 ? "real time" : v.toFixed(1) + "×", on: v => rate = v });
ui.headerSpeed(S.rate, { label: "Speed" });   // playback speed lives in the header, beside Pause and Reset

function preset(ns) { blds = ns.map(n => new Building({ n })); sel = 1; S.sel.set(1); resetAll(); sync(); }
function sync() { const b = blds[sel]; S.n.set(b.o.n); S.brace.set(b.o.brace); S.iso.set(b.o.iso); S.tmd.set(b.o.tmd); S.zeta.set(b.o.zeta * 100); changed(); }
let curveT = 0; function changed() { clearTimeout(curveT); curveT = setTimeout(calcCurves, 120); }
function calcCurves() { // resonance curve of each building, found by shaking a copy at 46 frequencies
  curves = blds.map(b => { const pts = []; for (let i = 0; i <= 45; i++) { const f = 0.25 * Math.pow(6 / 0.25, i / 45); pts.push([f, sineResponse(b.o, f, 0.02) * 100 / 0.02 / 100]); } return pts; });
}
function resetAll() { blds.forEach(b => b.init()); t = 0; phase = 0; xg = vg = 0; hand = 0; eq = quake(K.rng(Date.now()), S.soil.value, 1); hist = { g: [], r: [[], [], []] }; dust = []; changed(); }

// ---- Drawing ----
const cv = ui.canvas(), PXM = 9, EXAG = 8;    // 9 px per metre for the buildings; sideways movement drawn 8x larger
let geo = [];
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h, gy = h - 78, sx = d => d * PXM * EXAG;
  const sky = c.createLinearGradient(0, 0, 0, gy); sky.addColorStop(0, "#0b1230"); sky.addColorStop(.7, "#3b3f78"); sky.addColorStop(1, "#c9797a"); c.fillStyle = sky; c.fillRect(0, 0, w, gy);
  const sr = K.rng(5); c.fillStyle = "rgba(255,255,255,.7)"; for (let i = 0; i < 60; i++) c.fillRect(sr() * w, sr() * gy * .55, 1.3, 1.3);
  c.fillStyle = "#1c2147"; c.beginPath(); c.moveTo(0, gy); for (let x = 0; x <= w; x += 20) c.lineTo(x, gy - 30 - 22 * Math.sin(x * .008) - 12 * Math.sin(x * .021 + 1)); c.lineTo(w, gy); c.fill();
  const gx = sx(xg);
  // the ground, in layers, sliding with the earthquake
  const soil = c.createLinearGradient(0, gy, 0, h); soil.addColorStop(0, "#4a3a2c"); soil.addColorStop(.25, "#3b2d22"); soil.addColorStop(1, "#1e1712"); c.fillStyle = soil; c.fillRect(0, gy, w, h - gy);
  c.fillStyle = "#5d8a4a"; c.fillRect(0, gy - 3, w, 6);
  c.strokeStyle = "rgba(255,255,255,.07)"; c.lineWidth = 2; for (let k = 0; k < 5; k++) { c.beginPath(); for (let x = -40; x <= w + 40; x += 16) { const y = gy + 16 + k * 13 + 3 * Math.sin(x * .03 + k); x === -40 ? c.moveTo(x + gx, y) : c.lineTo(x + gx, y); } c.stroke(); }
  c.fillStyle = "rgba(255,255,255,.14)"; const pr = K.rng(9); for (let i = 0; i < 70; i++) c.fillRect((pr() * (w + 80) - 40) + gx, gy + 8 + pr() * 60, 3, 2);
  geo = [];
  blds.forEach((b, bi) => {
    const n = b.o.n, cx = w * (0.2 + 0.3 * bi) , bw = 108, sh = H_STOREY * PXM * 1.15, base = gy - 3 - (b.o.iso ? 12 : 0), col = BCOL[bi];
    geo.push({ x0: cx - bw / 2 - 20, x1: cx + bw / 2 + 20 });
    const bx = gx + (b.o.iso ? sx(b.xb) : 0);
    // foundation / isolators
    c.fillStyle = "#6b7387"; c.fillRect(cx - bw / 2 - 8 + gx, gy - 4, bw + 16, 7);
    if (b.o.iso) { for (const dx of [-bw / 2 + 12, 0, bw / 2 - 12]) { c.fillStyle = "#15171d"; c.beginPath(); c.moveTo(cx + dx - 9 + gx, gy - 4); c.lineTo(cx + dx + 9 + gx, gy - 4); c.lineTo(cx + dx + 9 + bx, base); c.lineTo(cx + dx - 9 + bx, base); c.fill(); c.strokeStyle = "#8b93a8"; c.lineWidth = 1; for (let q = 1; q < 4; q++) { const f = q / 4; c.beginPath(); c.moveTo(cx + dx - 9 + gx + (bx - gx) * f, gy - 4 - 12 * f); c.lineTo(cx + dx + 9 + gx + (bx - gx) * f, gy - 4 - 12 * f); c.stroke(); } } c.fillStyle = "#8b93a8"; c.fillRect(cx - bw / 2 - 4 + bx, base - 4, bw + 8, 5); }
    // floors: positions from the bottom up. A collapsed storey is squashed flat.
    let y = base, xl = bx; const ys = [], xs = [];
    for (let j = 0; j < n; j++) { const hh = b.collapsed === j ? sh * (1 - 0.86 * b.fall) : sh; y -= hh; const xf = gx + sx(b.x[j]) + (b.collapsed >= 0 && j >= b.collapsed ? b.fall * 14 * Math.sign(b.x[b.collapsed] || 1) : 0); ys.push(y); xs.push(xf); }
    for (let j = 0; j < n; j++) {
      const yb = j ? ys[j - 1] : base, xb2 = j ? xs[j - 1] : bx, yt = ys[j], xt = xs[j], dmg = K.clamp(b.maxDrift[j] / DRIFT_FAIL, 0, 1), dead = b.collapsed === j;
      // wall panel (a sheared quadrilateral), tinted by how close the storey has come to failing
      const wallc = dead ? "#3a1a1f" : `rgb(${40 + dmg * 190 | 0},${52 + (1 - dmg) * 70 | 0},${88 - dmg * 40 | 0})`;
      c.fillStyle = wallc; c.beginPath(); c.moveTo(cx - bw / 2 + xb2, yb); c.lineTo(cx + bw / 2 + xb2, yb); c.lineTo(cx + bw / 2 + xt, yt); c.lineTo(cx - bw / 2 + xt, yt); c.fill();
      if (!dead) { // lit windows
        for (let q = 0; q < 4; q++) { const fx = -bw / 2 + 12 + q * (bw - 24) / 3 - 8, lit = ((bi * 7 + j * 3 + q * 5) % 5) > 1; c.fillStyle = lit ? "rgba(255,221,150,.9)" : "rgba(20,28,50,.9)"; const y0 = yb - sh * .25, y1 = yb - sh * .75, s0 = xb2 + (xt - xb2) * .25, s1 = xb2 + (xt - xb2) * .75; c.beginPath(); c.moveTo(cx + fx + s0, y0); c.lineTo(cx + fx + 16 + s0, y0); c.lineTo(cx + fx + 16 + s1, y1); c.lineTo(cx + fx + s1, y1); c.fill(); }
        if (b.o.brace) { c.strokeStyle = "rgba(255,255,255,.55)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(cx - bw / 2 + xb2, yb); c.lineTo(cx + bw / 2 + xt, yt); c.moveTo(cx + bw / 2 + xb2, yb); c.lineTo(cx - bw / 2 + xt, yt); c.stroke(); }
      }
      c.fillStyle = "#c9d2e6"; c.fillRect(cx - bw / 2 - 4 + xt, yt - 2, bw + 8, 4);    // floor slab
    }
    const top = ys[n - 1], xtop = xs[n - 1];
    if (b.o.tmd && b.collapsed < 0) { const dx = xtop + sx(b.xd - b.x[n - 1]) * 0.6; c.strokeStyle = "#c9d2e6"; c.lineWidth = 2; c.beginPath(); c.moveTo(cx - 34 + xtop, top - 2); c.lineTo(cx - 34 + xtop, top - 22); c.lineTo(cx + 34 + xtop, top - 22); c.lineTo(cx + 34 + xtop, top - 2); c.stroke(); c.strokeStyle = "#8b93a8"; c.lineWidth = 1; c.beginPath(); c.moveTo(cx - 34 + xtop, top - 11); c.lineTo(cx - 9 + dx, top - 11); c.moveTo(cx + 34 + xtop, top - 11); c.lineTo(cx + 9 + dx, top - 11); c.stroke(); c.fillStyle = "#ffe66d"; c.beginPath(); c.roundRect(cx - 10 + dx, top - 19, 20, 16, 3); c.fill(); }
    if (b.collapsed >= 0 && b.fall < 1) for (let k = 0; k < 6; k++) dust.push({ x: cx + (Math.random() - .5) * bw, y: ys[b.collapsed] + 10, vx: (Math.random() - .5) * 4, vy: -Math.random() * 1.5, t: 1 });
    // label
    c.textAlign = "center"; c.font = "600 12px Segoe UI,sans-serif"; c.fillStyle = col; c.fillText(`Building ${bi + 1}`, cx + gx * 0, h - 48);
    c.font = "11px Segoe UI,sans-serif"; c.fillStyle = b.collapsed >= 0 ? "#ff6b81" : "#c9d2e6"; c.fillText(b.collapsed >= 0 ? "COLLAPSED" : `${n} storeys · natural frequency ${b.f1.toFixed(2)} Hz`, cx, h - 32);
    if (bi === sel) { c.strokeStyle = col; c.lineWidth = 2; c.setLineDash([5, 4]); c.beginPath(); c.roundRect(cx - bw / 2 - 24, h - 64, bw + 48, 42, 8); c.stroke(); c.setLineDash([]); }
  });
  dust = dust.filter(d => d.t > 0); for (const d of dust) { d.x += d.vx; d.y += d.vy; d.t -= 0.012; c.fillStyle = `rgba(190,175,160,${d.t * .35})`; c.beginPath(); c.arc(d.x, d.y, 16 * (1.4 - d.t), 0, 6.3); c.fill(); }
  ui.hud(mode === "hand" ? "↔ drag to shake the ground" : `t = ${t.toFixed(1)} s${mode !== "quake" ? ` · shaking at <b>${fNow.toFixed(2)} Hz</b>` : t > 20 ? " · earthquake over" : ""}<br>ground acceleration ${(agNow / G).toFixed(2)} g`);
}
K.pointer(cv.el, {
  down(p) { if (mode === "hand") { handOn = true; hand0 = p.x; handBase = hand; return; } const i = geo.findIndex(q => p.x > q.x0 && p.x < q.x1); if (i >= 0) { sel = i; S.sel.set(i); sync(); } },
  drag(p) { if (handOn) hand = handBase + (p.x - hand0) / (PXM * EXAG); }, up() { handOn = false; hand = 0; },
});
let hand0 = 0, handBase = 0;
const chT = K.chart(ui.dock, { title: "Roof sway (relative to the ground)", xLabel: "time (s)", yLabel: "displacement (cm)" });
const chR = K.chart(ui.dock, { title: "Resonance curves", xLabel: "shaking frequency (Hz)", yLabel: "roof swing per g (m)", yMin: 0, xMin: 0, xMax: 6 });
let frame = 0;
ui.run(dtf => {
  const dt = 0.002, steps = Math.round(dtf * rate / dt);
  for (let s = 0; s < steps; s++) {
    t += dt; let ag = 0; const A = S.pga.value * G;
    if (mode === "sine") { fNow = S.f.value; phase += 6.283 * fNow * dt; ag = A * Math.sin(phase) * Math.min(1, t / 1.5); }
    else if (mode === "sweep") { fNow = 0.3 * Math.pow(20, (t % 100) / 100); phase += 6.283 * fNow * dt; ag = A * Math.sin(phase); }
    else if (mode === "quake") ag = eq(t) * S.pga.value;
    if (mode === "hand") { ag = 600 * (hand - xg) - 2 * 24.5 * vg; vg += ag * dt; xg += vg * dt; }      // the ground follows your hand through a stiff spring
    else { vg += ag * dt; xg += vg * dt; vg -= vg * 1.2 * dt; xg -= xg * 1.2 * dt; }                      // integrate acceleration to get where the ground is
    agNow = ag; for (const b of blds) b.step(dt, ag);
    if (Math.round(t / dt) % 10 === 0) { hist.g.push([t, xg * 100]); blds.forEach((b, i) => { hist.r[i].push([t, b.collapsed >= 0 ? NaN : b.roof() * 100]); if (hist.r[i].length > 700) hist.r[i].shift(); }); if (hist.g.length > 700) hist.g.shift(); }
  }
}, () => {
  draw(); if (frame++ % 3) return;
  chT.draw(blds.map((b, i) => ({ pts: hist.r[i], color: BCOL[i], label: "Building " + (i + 1) })));
  chR.draw(curves.map((p, i) => ({ pts: p, color: BCOL[i], label: "Building " + (i + 1) })), mode === "hand" || mode === "quake" ? {} : { vlines: [{ x: fNow, color: K.cssVar("--text"), label: "shaking now" }] });
  const b = blds[sel]; read.set("f1", b.f1.toFixed(2) + " Hz"); read.set("T", (1 / b.f1).toFixed(2) + " s"); read.set("roof", (b.peakRoof * 100).toFixed(1) + " cm"); read.set("drift", `<span style="color:${b.collapsed >= 0 ? "var(--bad)" : "inherit"}">${(b.peakDrift() * 100).toFixed(1)} cm</span>`);
});
preset([2, 5, 10]);
ui.tip("The ground is shaking at 1.3 Hz. Which building is in trouble, and why that one?");
