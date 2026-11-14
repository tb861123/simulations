/* =====================================================================
   SOUND MADE VISIBLE: Chladni figures
   Sprinkle sand on a metal plate, make the plate vibrate at one steady
   frequency, and the sand gathers into sharp lines and curves.

   Why: a plate (or a drum skin) can only vibrate comfortably in certain
   shapes, called MODES. Each mode has its own frequency and its own
   pattern of NODES: lines that stay still while the rest moves.
   Drive the plate near one of those frequencies and that mode grows
   huge (RESONANCE). Sand is thrown about wherever the plate moves and
   only comes to rest where it does not: on the nodal lines.

   The model:
     1. list the modes of the plate or drum, with their frequencies
     2. for the driving frequency f, add up how strongly each mode
        responds:   response ∝ 1 / (f_mode² − f² + i·f·f_mode/Q)
        (a driven, damped oscillator: large only when f ≈ f_mode)
     3. the sum gives the size of the vibration at every point
     4. each sand grain takes random hops whose size ∝ the vibration
        under it, so grains wander off the busy parts and collect on
        the quiet lines.
   ===================================================================== */
const GN = 120;                         // the vibration is worked out on a 120 × 120 grid of points
const MATERIALS = {                     // stiffness E (Pa), density (kg/m³), Poisson's ratio
  steel: { name: "Steel", E: 200e9, rho: 7850, nu: 0.29, col: ["#3a4254", "#1b202c"] },
  aluminium: { name: "Aluminium", E: 69e9, rho: 2700, nu: 0.33, col: ["#4a5262", "#262b36"] },
  brass: { name: "Brass", E: 105e9, rho: 8500, nu: 0.34, col: ["#5a4a26", "#2c2412"] },
  glass: { name: "Glass", E: 70e9, rho: 2500, nu: 0.22, col: ["#2c4250", "#141f27"] }
};
// ---- Bessel functions J_m(x): the shapes a circular drum skin can take, from centre to rim ----
const BES = (() => { const M = 10, N = 2600, dx = 0.01, t = []; for (let m = 0; m < M; m++) { const a = new Float32Array(N); for (let i = 0; i < N; i++) { const x = i * dx; let s = 0; for (let k = 0; k < 120; k++) { const tau = (k + .5) * Math.PI / 120; s += Math.cos(m * tau - x * Math.sin(tau)); } a[i] = s / 120; } t.push(a); } return { t, dx, N, M }; })();
const besselJ = (m, x) => { const u = x / BES.dx, i = Math.min(BES.N - 2, u | 0), f = u - i; return BES.t[m][i] * (1 - f) + BES.t[m][i + 1] * f; };
// the rim of a drum is clamped, so J_m must be zero there: find the zeros
const ZEROS = BES.t.map((a, m) => { const z = []; for (let i = 30; i < BES.N - 1 && z.length < 5; i++) if (a[i] * a[i + 1] < 0) z.push((i + a[i] / (a[i] - a[i + 1])) * BES.dx); return z; });

/* Step 1: build the list of modes.
   p = { shape: "square" | "rect" | "drum", side (m), thick (m), material, radius (m), tension (N/m), dx, dy (driver position 0..1) } */
function makeModel(p) {
  const modes = [], m = { p, modes };
  if (p.shape === "drum") {
    // drum skin under tension T with mass per area σ: wave speed c = √(T/σ), frequency = zero × c / (2πR)
    const c = Math.sqrt(p.tension / 0.26); m.shapes = [];
    for (let k = 0; k < BES.M; k++) ZEROS[k].forEach((z, j) => { for (const sin of k ? [0, 1] : [0]) modes.push({ n: k, m: j + 1, sin, z, f: z * c / (2 * Math.PI * p.radius), label: `(${k},${j + 1})` }); });
    for (const md of modes) { // store each mode's shape on the grid, and its "size" (mean square) for the sums below
      const s = new Float32Array(GN * GN); let q = 0;
      for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) { const x = (i + .5) / GN * 2 - 1, y = (j + .5) / GN * 2 - 1, r = Math.hypot(x, y); if (r >= 1) continue; const v = besselJ(md.n, md.z * r) * (md.sin ? Math.sin(md.n * Math.atan2(y, x)) : Math.cos(md.n * Math.atan2(y, x))); s[i + j * GN] = v; q += v * v; }
      md.norm = q / (GN * GN * Math.PI / 4); m.shapes.push(s);
      const x = p.dx * 2 - 1, y = p.dy * 2 - 1, r = Math.min(0.999, Math.hypot(x, y)); md.phi0 = besselJ(md.n, md.z * r) * (md.sin ? Math.sin(md.n * Math.atan2(y, x)) : Math.cos(md.n * Math.atan2(y, x)));
    }
  } else {
    /* flat plate, free at the edges. Mode (n, m) has n nodal lines across and m up:
       shape cos(nπx/a)·cos(mπy/b), frequency f = (π/2)·√(D/ρh)·[(n/a)² + (m/b)²],
       where D = E h³ / 12(1−ν²) is the plate's bending stiffness. Thicker = stiffer = higher. */
    const M = MATERIALS[p.material], a = p.side, b = p.shape === "rect" ? p.side * 0.7 : p.side;
    const D = M.E * p.thick ** 3 / (12 * (1 - M.nu * M.nu)), Cp = Math.PI / 2 * Math.sqrt(D / (M.rho * p.thick)); m.Cp = Cp; m.a = a; m.b = b; m.NM = 17;
    for (let n = 0; n < 17; n++) for (let k = 0; k < 17; k++) { if (!n && !k) continue; modes.push({ n, m: k, f: Cp * ((n / a) ** 2 + (k / b) ** 2), norm: (n ? .5 : 1) * (k ? .5 : 1), phi0: Math.cos(n * Math.PI * p.dx) * Math.cos(k * Math.PI * p.dy), label: `(${n},${k})` }); }
    m.cos = []; for (let n = 0; n < 17; n++) { const c = new Float32Array(GN); for (let i = 0; i < GN; i++) c[i] = Math.cos(n * Math.PI * (i + .5) / GN); m.cos.push(c); }
  }
  // a typical resonant response, used to set the scale of "how hard is the plate shaking"
  let pk = modes.map(d => d.phi0 * d.phi0 / d.norm).sort((x, y) => x - y); pk = pk.filter(v => v > 1e-4 * pk[pk.length - 1]); m.peak = pk[Math.floor(pk.length * 0.5)] || 1;   // (modes with a node at the driver are left out)
  m.res = modes.filter(d => d.phi0 * d.phi0 / d.norm > 0.2 * m.peak).map(d => d.f).sort((x, y) => x - y).filter((f, i, a) => !i || f - a[i - 1] > f * 0.004);   // the resonances this driver position can excite
  return m;
}
// Step 2 for a single point: how much the plate moves at the driver itself (complex number → size)
function driveResponse(m, f, Q) { let re = 0, im = 0; for (const d of m.modes) { const a = d.f * d.f - f * f, b = f * d.f / Q, w = d.phi0 * d.phi0 / d.norm / (a * a + b * b); re += w * a; im -= w * b; } return Math.hypot(re, im); }
// "shake": acceleration at the driver compared with a typical resonance (about 1 on resonance, about 1/Q off it)
const shake = (m, f, Q) => f * f * driveResponse(m, f, Q) / (Q * m.peak);
/* Steps 2 and 3 for the whole surface. Fills F.re and F.im (the two parts of the motion, a quarter-cycle apart)
   and F.A, the size of the vibration at each grid point scaled so the biggest is 1. */
function field(m, f, Q, F) {
  F = F || { re: new Float32Array(GN * GN), im: new Float32Array(GN * GN), A: new Float32Array(GN * GN), top: [] }; F.re.fill(0); F.im.fill(0);
  const cs = m.modes.map(d => { const a = d.f * d.f - f * f, b = f * d.f / Q, w = d.phi0 / d.norm / (a * a + b * b); return [w * a, -w * b]; });
  if (m.shapes) m.modes.forEach((d, k) => { const [cr, ci] = cs[k]; if (Math.abs(cr) + Math.abs(ci) < 1e-30) return; const s = m.shapes[k], re = F.re, im = F.im; for (let i = 0; i < GN * GN; i++) { re[i] += cr * s[i]; im[i] += ci * s[i]; } });
  else { // the plate's modes are products cos × cos, so the sum can be done one row at a time
    const NM = m.NM, tr = new Float64Array(NM), ti = new Float64Array(NM);
    for (let j = 0; j < GN; j++) {
      tr.fill(0); ti.fill(0); m.modes.forEach((d, k) => { const cy = m.cos[d.m][j]; tr[d.n] += cs[k][0] * cy; ti[d.n] += cs[k][1] * cy; });
      for (let n = 0; n < NM; n++) { const cx = m.cos[n], a = tr[n], b = ti[n], o = j * GN; for (let i = 0; i < GN; i++) { F.re[o + i] += a * cx[i]; F.im[o + i] += b * cx[i]; } }
    }
  }
  let mx = 1e-30; for (let i = 0; i < GN * GN; i++) { const v = Math.hypot(F.re[i], F.im[i]); F.A[i] = v; if (v > mx) mx = v; }
  for (let i = 0; i < GN * GN; i++) F.A[i] /= mx; F.max = mx;
  // which modes are doing the ringing? (energy share of each)
  const en = m.modes.map((d, k) => [(cs[k][0] ** 2 + cs[k][1] ** 2) * d.norm, d]), tot = en.reduce((s, e) => s + e[0], 0) || 1; F.top = en.sort((a, b) => b[0] - a[0]).slice(0, 3).map(e => [e[0] / tot, e[1]]);
  return F;
}
/* Step 4: the sand. gx, gy: grain positions (0..1). Each grain hops a random distance ∝ how hard the plate under it shakes;
   below a small threshold it stays put (the plate must throw it clear of the surface before it can move). */
function hopSand(gx, gy, A, gain, round, rnd) {
  for (let k = 0; k < gx.length; k++) {
    const a = A[(gx[k] * GN | 0) + (gy[k] * GN | 0) * GN] * gain; if (a < 0.05) continue;
    const s = Math.min(0.03, (a - 0.05) * 0.026); let x = gx[k] + (rnd() - .5) * 2 * s, y = gy[k] + (rnd() - .5) * 2 * s;
    if (round) { const dx = x - .5, dy = y - .5, r = Math.hypot(dx, dy); if (r > 0.497) { x = .5 + dx / r * 0.497; y = .5 + dy / r * 0.497; } }   // the hoop of a drum keeps the sand in
    else { x = x < 0.002 ? 0.002 : x > 0.998 ? 0.998 : x; y = y < 0.002 ? 0.002 : y > 0.998 ? 0.998 : y; }
    gx[k] = x; gy[k] = y;
  }
}
const onNodes = (gx, gy, A) => { let n = 0; for (let k = 0; k < gx.length; k++) if (A[(gx[k] * GN | 0) + (gy[k] * GN | 0) * GN] < 0.14) n++; return n / gx.length; };   // fraction of grains resting on quiet lines
// A noisy frequency scan across one resonance: returns the frequency where the measured response was biggest
function scanPeak(f0, Q, rnd) { let best = 0, bf = f0; for (let f = f0 * (0.9 + 0.003 * rnd()); f <= f0 * 1.1; f += f0 * 0.003) { const a = 1 / Math.hypot(f0 * f0 - f * f, f * f0 / Q) * (1 + 0.04 * rnd.gauss()); if (a > best) { best = a; bf = f; } } return bf; }
const DRUM_RATIOS = (() => { const z = []; ZEROS.forEach(a => a.forEach(v => z.push(v))); z.sort((a, b) => a - b); return z.slice(0, 10).map(v => v / z[0]); })();   // overtones of an ideal drum ÷ its lowest note

// ---------------- The page ----------------
const P = { shape: "square", side: 0.24, thick: 0.001, material: "steel", radius: 0.16, tension: 2000, dx: 0.5, dy: 0.5 };
let freq = 667, Q = 80, vol = 1.5, nGrain = 14000, motion = false, sweep = false, model, F, gx, gy, need = true, spec = [], order = [], tSim = 0, phaseT = 0;
const DEF = JSON.parse(JSON.stringify(P));

const ui = K.app({
  title: "Sound Made Visible", subject: "Physics",
  blurb: "Chladni figures: sand on a vibrating plate draws the shape of a resonance",
  reset: () => { Object.assign(P, DEF); sync(); setFreq(667); rebuild(true); },
  missions: [
    { title: "Find the resonances", q: "Switch on 'Sweep upwards' and watch. The sand only dances at certain frequencies, and settles into a sharp pattern each time. What is special about those frequencies?", hint: "They are the plate's own natural frequencies. At each one, a single mode of vibration grows to perhaps a hundred times the size it has in between (see the peaks on the left-hand chart). Between peaks the plate barely moves and the sand sits still.", setup() { Object.assign(P, DEF); sync(); setFreq(120); rebuild(true); set({ sweep: true, vol: 1.5, motion: false }); } },
    { title: "Why does sand collect on lines?", q: "Turn on 'Show the motion'. Red and blue are parts of the plate moving in opposite directions. Where does the sand end up: on the colours, or between them?", hint: "Between them. Along the boundary between a part moving up and a part moving down, the plate does not move at all: a nodal line. Sand is kicked away from everywhere else and stays where it is not kicked.", setup() { Object.assign(P, DEF); sync(); rebuild(true); set({ sweep: false, motion: true, vol: 1.5 }); setFreq(model.res[2]); } },
    { title: "More lines, higher note", q: "Step through the resonances with the ▸ button. Count the nodal lines crossing the plate each time and note the frequency. If the number of lines doubles, does the frequency double?", hint: "It roughly quadruples. For a plate, frequency goes as (number of lines)², because a stiff plate resists tight bending much more than gentle bending. A string or a drum skin only doubles. The batch run measures this.", setup() { Object.assign(P, DEF); sync(); rebuild(true); set({ sweep: false, motion: false, vol: 1.5 }); setFreq(model.res[0]); } },
    { title: "Move the driver", q: "Drag the yellow driver from the centre towards a corner. Which patterns can you make now that the centre could not? Then find a resonance and drag the driver onto one of its sand lines. What happens?", hint: "A mode cannot be driven from a point where it does not move. The centre is a node for every pattern that is not symmetrical, so only symmetrical ones appear there. Off-centre, many more resonances appear on the chart. Put the driver on a nodal line and that mode dies away.", setup() { Object.assign(P, DEF); P.dx = 0.5; P.dy = 0.5; sync(); rebuild(true); set({ sweep: false, motion: false, vol: 1.5 }); setFreq(model.res[3]); } },
    { title: "Thicker, bigger, different metal", q: "Sit on one resonance, then double the thickness. What happens to the pattern? Use ▸ to find the same pattern again: what is its frequency now? Try the same with the plate's size.", hint: "Double the thickness and every resonance doubles in frequency (the plate is stiffer faster than it is heavier). Double the side and every resonance drops to a quarter. The patterns themselves do not change: they depend only on the shape.", setup() { Object.assign(P, DEF); sync(); rebuild(true); set({ sweep: false, motion: false, vol: 1.5 }); setFreq(model.res[2]); } },
    { title: "Between two resonances", q: "Turn the loudness right up and set a frequency between two peaks. The pattern is neither one nor the other. Nudge the frequency: how does the pattern change?", hint: "Between resonances several modes respond by similar small amounts, and the plate's motion is their sum. Sliding the frequency changes the mixture smoothly, so the nodal lines bend, join and split. You need more loudness because nothing is resonating.", setup() { Object.assign(P, DEF); sync(); rebuild(true); set({ sweep: false, motion: false, vol: 10 }); setFreq((model.res[2] + model.res[3]) / 2); } },
    { title: "A drum", q: "Now a round drum skin, held at the rim. What shapes are its nodal lines? Step through the resonances and compare each frequency with the lowest. Are they 2×, 3×, 4×… like a guitar string?", hint: "Circles and diameters. The overtones are at 1.59, 2.14, 2.30, 2.65… times the lowest: not whole-number multiples. That is why a drum gives a thump rather than a clear musical note, while a string (whose overtones are exact multiples) sings.", setup() { Object.assign(P, DEF); P.shape = "drum"; P.dx = 0.7; P.dy = 0.5; sync(); rebuild(true); set({ sweep: false, motion: false, vol: 1.5 }); setFreq(model.res[1]); } }
  ],
  batch: [
    { title: "Lines against frequency", question: "Is a plate's resonant frequency proportional to (number of nodal lines)²?", how: "For each mode, a noisy frequency scan is made and its peak recorded (steel, 24 cm, 1 mm).", xLabel: "nodal lines across the plate, n", yLabel: "resonant frequency (Hz)", xs: [2, 4, 6, 8, 10, 12], reps: 6, yMin: 0, theory: n => makeModel(DEF).Cp * n * n / DEF.side ** 2, theoryLabel: "f ∝ n²", run: (n, r) => scanPeak(makeModel(DEF).Cp * n * n / DEF.side ** 2, 80, r), note: "The scan steps in frequency and each reading has 4% noise, so the peak is found slightly off each time. The scatter is small beside the trend: a curve, not a straight line. Plot f against n² and it becomes straight." },
    { title: "Thickness", question: "How does resonant frequency depend on the plate's thickness?", how: "The (2,0) resonance of a 24 cm steel plate is measured for each thickness.", xLabel: "thickness (mm)", yLabel: "resonant frequency (Hz)", xs: [0.5, 0.75, 1, 1.5, 2, 2.5, 3], reps: 6, yMin: 0, fit: true, theory: t => makeModel(Object.assign({}, DEF, { thick: t / 1000 })).Cp * 4 / DEF.side ** 2, theoryLabel: "f ∝ thickness", run: (t, r) => scanPeak(makeModel(Object.assign({}, DEF, { thick: t / 1000 })).Cp * 4 / DEF.side ** 2, 80, r), note: "A straight line through the origin: frequency ∝ thickness. Bending stiffness rises as thickness³ but mass only as thickness, and frequency goes as √(stiffness ÷ mass)." },
    { title: "Size", question: "How does resonant frequency depend on the length of the plate's side?", how: "The (2,0) resonance of a 1 mm steel plate is measured for each size.", xLabel: "side length (cm)", yLabel: "resonant frequency (Hz)", xs: [15, 18, 21, 24, 28, 32, 36, 40], reps: 6, yMin: 0, theory: L => makeModel(DEF).Cp * 4 / (L / 100) ** 2, theoryLabel: "f ∝ 1/L²", run: (L, r) => scanPeak(makeModel(DEF).Cp * 4 / (L / 100) ** 2, 80, r), note: "Halving the side quadruples the frequency: an inverse-square law. (A string or air column would only double: f ∝ 1/L.)" },
    { title: "Drum overtones", question: "Are a drum's overtones whole-number multiples of its lowest note?", how: "Each of the first ten resonances of a drum is scanned and divided by the lowest.", xLabel: "resonance number (in order of frequency)", yLabel: "frequency ÷ lowest frequency", xs: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], reps: 5, yMin: 0, theory: k => DRUM_RATIOS[K.clamp(Math.round(k) - 1, 0, 9)], theoryLabel: "ideal drum (Bessel zeros)", run: (k, r) => scanPeak(100 * DRUM_RATIOS[k - 1], 80, r) / 100, note: "A string's overtones would be 1, 2, 3, 4… (a straight line of gradient 1). The drum's bunch up irregularly: 1, 1.59, 2.14, 2.30, 2.65, 2.92… This is why drums sound unpitched." },
    { title: "How fast does the pattern form?", question: "Does a louder tone make the sand settle faster?", how: "2000 grains are scattered on a plate at resonance; the run times how long until 60% rest on nodal lines.", xLabel: "loudness", yLabel: "time to form the pattern (s)", xs: [0.5, 0.75, 1, 1.5, 2, 3, 4], reps: 5, yMin: 0, run(v, r) { const m = makeModel(DEF), f = field(m, m.res[2], 80), gx = new Float32Array(2000), gy = new Float32Array(2000); for (let i = 0; i < 2000; i++) { gx[i] = r(); gy[i] = r(); } const g = v * Math.min(1.5, shake(m, m.res[2], 80)); let t = 0; while (t < 4000 && onNodes(gx, gy, f.A) < 0.6) { hopSand(gx, gy, f.A, g, false, r); t++; } return t / 60; }, note: "Each grain takes a random walk, so every run differs a little. Louder means bigger hops and a quicker pattern, but with diminishing returns: the last grains to arrive are those that started in the quietest regions, where hops are small whatever the loudness." }
  ],
  notes: `<h3>What is being modelled</h3>
<p><b>The plate.</b> A thin flat plate with free edges, driven at one point by a small vibrator. Its modes are taken as cos(nπx/a)·cos(mπy/b) with frequency f = (π/2)·√(D/ρh)·[(n/a)² + (m/b)²], where D = Eh³/12(1−ν²). All modes up to n, m = 16 are included.</p>
<p><b>The drum.</b> A circular skin under even tension, fixed at the rim. Modes are Bessel functions J<sub>m</sub>(z r/R)·cos(mθ), frequency z·c/(2πR) with c = √(tension ÷ mass per area) and z a zero of J<sub>m</sub>. Skin mass 0.26 kg/m² (a typical plastic drum head).</p>
<p><b>The response.</b> Each mode is a driven, damped oscillator. Its share of the motion is (its size at the driver) ÷ (f<sub>mode</sub>² − f² + i·f·f<sub>mode</sub>/Q). The plate's motion is the sum over all modes. Q is how sharply it rings.</p>
<p><b>The sand.</b> Each grain takes a random hop every frame, with size proportional to the plate's acceleration under it, and none at all below a small threshold. Grains therefore drift out of the busy regions and collect on the nodal lines.</p>
<h3>Simplifications</h3>
<ul><li>The plate's mode shapes are the standard first approximation (exact for a plate whose edges are guided, close but not exact for truly free edges). Real Chladni figures at the same mode look similar, and real frequencies differ by some per cent.</li>
<li>The driver is a point and adds no mass. A real plate is usually clamped or bowed at that point, which shifts things a little.</li>
<li>Sand does not weigh the plate down, grains do not collide or pile up, and none falls off the edge.</li>
<li>Very fine powder in real experiments is carried by air currents to the <i>antinodes</i> instead; air is left out here.</li>
<li>The drum is ideal: no air loading and a perfectly even skin. Real drums are tuned so their overtones fall closer to harmonics.</li>
<li>Damping is the same Q for every mode.</li></ul>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("The tone");
const lf = K.slider(g, { label: "Frequency", min: 1.6, max: 3.8, step: 0.0005, value: Math.log10(freq), fmt: v => Math.pow(10, v).toFixed(v < 2.5 ? 1 : 0) + " Hz", on: v => { freq = Math.pow(10, v); need = true; tone(); } });
let r1 = K.row(g); K.btn(r1, "◂ resonance", () => hopRes(-1)); K.btn(r1, "resonance ▸", () => hopRes(1), "primary");
r1 = K.row(g); K.btn(r1, "− 1 Hz", () => setFreq(freq - 1), "small"); K.btn(r1, "+ 1 Hz", () => setFreq(freq + 1), "small");
ctl.sweep = K.toggle(g, { label: "Sweep upwards", value: false, on: v => sweep = v });
ctl.vol = K.slider(g, { label: "Loudness", min: 0.2, max: 12, step: 0.1, value: vol, fmt: v => "× " + v.toFixed(1), on: v => vol = v, tip: "Turn up to see the faint patterns between resonances." });
ctl.snd = K.toggle(g, { label: "🔊 Hear the tone", value: false, on: v => sound(v) });
g = ui.group("The plate");
ctl.shape = K.seg(g, { value: "square", options: [["square", "Square plate"], ["rect", "Rectangle"], ["drum", "Round drum"]], on: v => { P.shape = v; if (v === "drum" && P.dx === 0.5) P.dx = 0.7; if (v !== "drum" && P.dx === 0.7) P.dx = 0.5; sync(); rebuild(true); } });
const gPlate = document.createElement("div"), gDrum = document.createElement("div"); g.append(gPlate, gDrum);
ctl.material = K.seg(gPlate, { value: "steel", options: Object.keys(MATERIALS).map(k => [k, MATERIALS[k].name]), on: v => { P.material = v; rebuild(); } });
ctl.side = K.slider(gPlate, { label: "Side length", min: 0.15, max: 0.4, step: 0.01, value: P.side, fmt: v => (v * 100).toFixed(0) + " cm", on: v => { P.side = v; rebuild(); } });
ctl.thick = K.slider(gPlate, { label: "Thickness", min: 0.0005, max: 0.003, step: 0.00025, value: P.thick, fmt: v => (v * 1000).toFixed(2) + " mm", on: v => { P.thick = v; rebuild(); } });
ctl.radius = K.slider(gDrum, { label: "Drum radius", min: 0.08, max: 0.3, step: 0.01, value: P.radius, fmt: v => (v * 100).toFixed(0) + " cm", on: v => { P.radius = v; rebuild(); } });
ctl.tension = K.slider(gDrum, { label: "Skin tension", min: 500, max: 6000, step: 100, value: P.tension, unit: "N/m", on: v => { P.tension = v; rebuild(); } });
ctl.Q = K.slider(g, { label: "How sharply it rings (Q)", min: 15, max: 300, step: 5, value: Q, on: v => { Q = v; rebuild(); }, tip: "High Q: tall, narrow resonances. Low Q: heavily damped." });
K.note(g, "Drag the yellow dot to move the driver.");
g = ui.group("The sand");
ctl.motion = K.toggle(g, { label: "Show the motion (slowed down)", value: false, on: v => motion = v });
ctl.grains = K.slider(g, { label: "Grains", min: 3000, max: 30000, step: 1000, value: nGrain, on: v => { nGrain = v; scatter(); } });
K.btn(K.row(g), "Scatter the sand again", () => scatter(), "primary");
const read = K.readout(g, [["f", "driving at"], ["near", "nearest resonance"], ["on", "sand on nodal lines"], ["shake", "plate is shaking"]]);
function sync() { ctl.shape.set(P.shape); ctl.material.set(P.material); ctl.side.set(P.side); ctl.thick.set(P.thick); ctl.radius.set(P.radius); ctl.tension.set(P.tension); gPlate.style.display = P.shape === "drum" ? "none" : ""; gDrum.style.display = P.shape === "drum" ? "" : "none"; }
function set(o) { if (o.sweep != null) { sweep = o.sweep; ctl.sweep.set(sweep); } if (o.vol != null) { vol = o.vol; ctl.vol.set(vol); } if (o.motion != null) { motion = o.motion; ctl.motion.set(motion); } }
function setFreq(f) { freq = K.clamp(f, 40, 6300); lf.set(Math.log10(freq)); need = true; tone(); }
function hopRes(dir) { const r = model.res, i = dir > 0 ? r.findIndex(f => f > freq * 1.003) : r.length - 1 - [...r].reverse().findIndex(f => f < freq * 0.997); if (r[i] && i >= 0 && i < r.length) { setFreq(r[i]); if (sweep) { sweep = false; ctl.sweep.set(false); } } }
function rebuild(andScatter) {   // the plate, or the driver's position, has changed: list the modes again and redraw the resonance curve
  model = makeModel(P); need = true; spec = [];
  for (let l = 1.6; l <= 3.8; l += 0.004) { const f = Math.pow(10, l); spec.push([f, 20 * Math.log10(shake(model, f, Q) + 1e-6)]); }
  if (andScatter || !gx) scatter();
}
function scatter() { gx = new Float32Array(nGrain); gy = new Float32Array(nGrain); const round = P.shape === "drum"; for (let i = 0; i < nGrain; i++) { do { gx[i] = Math.random(); gy[i] = Math.random(); } while (round && Math.hypot(gx[i] - .5, gy[i] - .5) > 0.49); } order = []; tSim = 0; }
// ---- sound ----
let actx = null, osc = null, gain = null;
function sound(on) { try { if (on) { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); osc = actx.createOscillator(); gain = actx.createGain(); gain.gain.value = 0.05; osc.frequency.value = freq; osc.connect(gain); gain.connect(actx.destination); osc.start(); } else if (osc) { osc.stop(); osc = null; } } catch (e) { } }
function tone() { if (osc) osc.frequency.value = freq; }

// ---------------- Drawing ----------------
const cv = ui.canvas();
const mimg = document.createElement("canvas"); mimg.width = GN; mimg.height = GN; const mctx = mimg.getContext("2d"), mdata = mctx.createImageData(GN, GN);
let rect = { x: 0, y: 0, w: 1, h: 1 };
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h, round = P.shape === "drum", asp = P.shape === "rect" ? 0.7 : 1;
  const bg = c.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w * 0.7); bg.addColorStop(0, "#131a2c"); bg.addColorStop(1, "#05070d"); c.fillStyle = bg; c.fillRect(0, 0, w, h);
  const ph = Math.min(h - 36, (w - 60) * asp), pw = ph / asp * 1, x0 = Math.max(16, (w - pw) / 2 - 200), y0 = (h - ph) / 2, cx = x0 + pw / 2; rect = { x: x0, y: y0, w: pw, h: ph };
  const M = MATERIALS[P.material], cols = round ? ["#d9d2c2", "#a39a86"] : M.col;
  // the plate (or drum skin) with a soft shadow
  c.save(); c.shadowColor = "rgba(0,0,0,.7)"; c.shadowBlur = 30; c.shadowOffsetY = 10; const pg = c.createLinearGradient(x0, y0, x0 + pw, y0 + ph); pg.addColorStop(0, cols[0]); pg.addColorStop(1, cols[1]); c.fillStyle = pg;
  c.beginPath(); if (round) c.arc(cx, h / 2, ph / 2, 0, 6.3); else c.roundRect(x0, y0, pw, ph, 3); c.fill(); c.restore();
  c.save(); c.beginPath(); if (round) c.arc(cx, h / 2, ph / 2, 0, 6.3); else c.rect(x0, y0, pw, ph); c.clip();
  if (motion && F) {   // a slowed-down picture of the plate flexing: red = up, blue = down, at this instant
    const cs = Math.cos(phaseT * 7), sn = Math.sin(phaseT * 7), px = mdata.data, k = 1 / F.max;
    for (let i = 0; i < GN * GN; i++) { const v = (F.re[i] * cs - F.im[i] * sn) * k, a = Math.min(1, Math.abs(v) * 1.2), j = i * 4; if (v > 0) { px[j] = 255; px[j + 1] = 70; px[j + 2] = 70; } else { px[j] = 60; px[j + 1] = 130; px[j + 2] = 255; } px[j + 3] = 215 * a; }
    mctx.putImageData(mdata, 0, 0); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = "high"; c.drawImage(mimg, x0, y0, pw, ph);
  }
  // the sand
  c.fillStyle = round ? "rgba(40,30,18,.85)" : "rgba(255,238,205,.85)"; const sz = nGrain > 20000 ? 1.3 : 1.6;
  for (let k = 0; k < gx.length; k++) c.fillRect(x0 + gx[k] * pw - sz / 2, y0 + gy[k] * ph - sz / 2, sz, sz);
  c.restore();
  if (round) { c.strokeStyle = "#6b4a2a"; c.lineWidth = 7; c.beginPath(); c.arc(cx, h / 2, ph / 2 + 3, 0, 6.3); c.stroke(); c.strokeStyle = "#a9793f"; c.lineWidth = 1.5; c.beginPath(); c.arc(cx, h / 2, ph / 2 + 6, 0, 6.3); c.stroke(); }
  else { c.strokeStyle = "rgba(255,255,255,.18)"; c.lineWidth = 1; c.strokeRect(x0 + .5, y0 + .5, pw - 1, ph - 1); }
  // the driver
  const dx = x0 + P.dx * pw, dy = y0 + P.dy * ph, pulse = 1 + 0.25 * Math.sin(phaseT * 14); c.strokeStyle = "rgba(255,216,102,.5)"; c.lineWidth = 1.5; c.beginPath(); c.arc(dx, dy, 9 * pulse, 0, 6.3); c.stroke(); c.fillStyle = "#ffd866"; c.beginPath(); c.arc(dx, dy, 4.5, 0, 6.3); c.fill();
  c.fillStyle = "#8b98b8"; c.font = "11.5px Segoe UI,sans-serif"; c.textAlign = "left";
  c.fillText(round ? `drum skin, radius ${(P.radius * 100).toFixed(0)} cm` : `${M.name.toLowerCase()} plate, ${(P.side * 100).toFixed(0)} × ${(P.side * asp * 100).toFixed(0)} cm, ${(P.thick * 1000).toFixed(2)} mm thick`, 12, h - 12);
}
const chSpec = K.chart(ui.dock, { title: "How strongly the plate responds at each frequency (click to tune)", xLabel: "frequency (Hz)", yLabel: "response (dB)" });
const chOrd = K.chart(ui.dock, { title: "Sand resting on nodal lines", xLabel: "time since scattered (s)", yLabel: "% of grains", yMin: 0, yMax: 100 });
chSpec.el.style.cursor = "pointer";
chSpec.el.addEventListener("pointerdown", e => { const m = chSpec.map; if (!m) return; const r = chSpec.el.getBoundingClientRect(), f = m.x0 + (e.clientX - r.left - m.L) / m.pw * (m.x1 - m.x0); if (f > 30) { const near = model.res.reduce((a, b) => Math.abs(b - f) < Math.abs(a - f) ? b : a, model.res[0]); setFreq(Math.abs(near - f) < (m.x1 - m.x0) * 0.012 ? near : f); } });
K.pointer(cv.el, { down(p) { this.drag(p); }, drag(p) { const x = (p.x - rect.x) / rect.w, y = (p.y - rect.y) / rect.h; if (x < -0.05 || x > 1.05 || y < -0.05 || y > 1.05) return; P.dx = K.clamp(x, 0.02, 0.98); P.dy = K.clamp(y, 0.02, 0.98); if (Math.abs(P.dx - .5) < 0.02) P.dx = .5; if (Math.abs(P.dy - .5) < 0.02) P.dy = .5; if (P.shape === "drum") { const r = Math.hypot(P.dx - .5, P.dy - .5); if (r > 0.45) { P.dx = .5 + (P.dx - .5) / r * 0.45; P.dy = .5 + (P.dy - .5) / r * 0.45; } } rebuild(); } });

// ---------------- The loop ----------------
let frame = 0, sh = 0;
ui.run(dt => {
  phaseT += dt; tSim += dt;
  if (sweep) { freq *= Math.exp(dt * 0.045); if (freq > 6300) { freq = 6300; sweep = false; ctl.sweep.set(false); } lf.set(Math.log10(freq)); need = true; tone(); }
  if (need) { F = field(model, freq, Q, F); sh = shake(model, freq, Q); need = false; }
  hopSand(gx, gy, F.A, vol * Math.min(2, sh) * Math.min(2, dt * 60), P.shape === "drum", Math.random);
  if (frame % 6 === 0) { order.push([tSim, 100 * onNodes(gx, gy, F.A)]); if (order.length > 400) order.shift(); }
}, () => {
  if (need && model) { F = field(model, freq, Q, F); sh = shake(model, freq, Q); need = false; }
  if (gain) gain.gain.value = ui.playing ? 0.05 : 0;
  draw(); if (frame++ % 3) return;
  const xMax = Math.min(6300, Math.max(1500, freq * 1.6, model.res[5] || 0)), near = model.res.reduce((a, b) => Math.abs(b - freq) < Math.abs(a - freq) ? b : a, model.res[0]);
  chSpec.draw([{ pts: spec, color: K.cssVar("--s0") }], { xMin: 0, xMax, yMin: -50, yMax: 20, vlines: [{ x: freq, color: "#ffd866", label: freq.toFixed(0) + " Hz" }] });
  chOrd.draw([{ pts: order, type: "area", color: K.cssVar("--s2") }], { xMin: order.length ? order[0][0] : 0, xMax: Math.max(10, tSim) });
  read.set("f", freq.toFixed(freq < 300 ? 1 : 0) + " Hz"); read.set("near", near.toFixed(0) + " Hz"); read.set("on", order.length ? order[order.length - 1][1].toFixed(0) + "%" : "–"); read.set("shake", sh > 0.5 ? "hard (resonance)" : sh * vol > 0.08 ? "a little" : "hardly at all");
  ui.hud(F ? "Ringing now: " + F.top.filter(t => t[0] > 0.04).map(t => `mode ${t[1].label} <b>${(t[0] * 100).toFixed(0)}%</b>`).join(" · ") + `<br>${P.shape === "drum" ? "(diameters, circles)" : "(lines across, lines up)"} · ${model.res.length} resonances reachable from this driver position` : "");
});
sync(); rebuild(true); setFreq(model.res[2]);
ui.tip("Press 'resonance ▸' to step through the patterns · drag the yellow dot to move the driver", 8000);
