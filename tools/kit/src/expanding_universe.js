/* =====================================================================
   THE EXPANDING UNIVERSE AND HUBBLE'S LAW
   Light from distant galaxies is RED-SHIFTED: every line in its spectrum
   is moved to a longer wavelength by the same factor (1 + z).
       z = Δλ ÷ λ        speed of recession v ≈ c z  (for small z)
   The further away a galaxy, the faster it recedes:
       HUBBLE'S LAW   v = H₀ d
   This is what happens if space itself is stretching: every galaxy sees
   every other moving away, faster the further it is (like raisins in
   rising dough). Run the expansion backwards: everything started together
   about 1/H₀ ago (the Hubble time, about 14 billion years).
   Distances come from STANDARD CANDLES: objects of known brightness
   (Cepheid variable stars, Type Ia supernovae). The dimmer one looks, the
   further away it is:  m − M = 5 log₁₀(d ÷ 10 pc).
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
const C = 299792.458;                                                                  // km/s
const LINES = [["Ca K", 393.4], ["Ca H", 396.8], ["Hβ", 486.1], ["Mg", 517.3], ["Na", 589.3], ["Hα", 656.3]];
// comoving distance (Mpc) to redshift z: (c/H₀) ∫ dz / E(z), E = √(Ωm(1+z)³ + ΩΛ)
function comoving(z, H0, model) { if (model === "hubble") return C * z / H0; const om = model === "lcdm" ? 0.315 : 1, ol = model === "lcdm" ? 0.685 : 0; let s = 0; const n = 200; for (let i = 0; i < n; i++) { const zz = (i + 0.5) / n * z; s += 1 / Math.sqrt(om * (1 + zz) ** 3 + ol) * z / n; } return C / H0 * s; }
function zOf(d, H0, model) { if (model === "hubble") return d * H0 / C; let lo = 0, hi = 10; for (let k = 0; k < 50; k++) { const m = (lo + hi) / 2; if (comoving(m, H0, model) < d) lo = m; else hi = m; } return (lo + hi) / 2; }
// one survey: galaxies at random distances (spread evenly in space), distance from a standard candle, speed from the redshift
// o = { H0, model, n, dmax, candle: "cepheid" | "sn", sig (mag scatter), cal (calibration error, fraction), vpec (km/s), fitMax }
function survey(o, r) {
  const gals = [];
  for (let i = 0; i < o.n; i++) {
    const d = o.dmax * Math.cbrt(Math.max(0.0005, r())), zc = zOf(d, o.H0, o.model), dl = (o.model === "hubble" ? d : d * (1 + zc));
    const vp = o.vpec * r.gauss(), zobs = (1 + zc) * (1 + vp / C) - 1 + 30 / C * r.gauss();
    const dm = dl * Math.pow(10, o.sig * r.gauss() / 5) * (1 + o.cal);                 // distance from the candle's apparent brightness
    gals.push({ d, dm, z: zobs, v: C * zobs, sd: dm * 0.46 * Math.max(o.sig, 0.02) });
  }
  return gals;
}
// weighted least-squares line through the origin, v = H d
function fitH(gals, fitMax) {
  const use = gals.filter(g => g.dm <= (fitMax || 1e9)); if (use.length < 2) return { H: NaN, err: NaN, n: use.length };
  let H = 70; for (let it = 0; it < 3; it++) { let sxy = 0, sxx = 0; for (const g of use) { const w = 1 / (30 * 30 + 250 * 250 + H * H * g.sd * g.sd); sxy += w * g.dm * g.v; sxx += w * g.dm * g.dm; } H = sxy / sxx; }
  let sxx = 0, chi = 0; for (const g of use) { const w = 1 / (30 * 30 + 250 * 250 + H * H * g.sd * g.sd); sxx += w * g.dm * g.dm; chi += w * (g.v - H * g.dm) ** 2; }
  return { H, err: Math.sqrt(1 / sxx) * Math.sqrt(Math.max(1, chi / Math.max(1, use.length - 1))), n: use.length };
}
const REAL = [["Virgo", 16.5, 1180], ["Fornax", 20, 1380], ["Hydra", 54, 3800], ["Centaurus", 45, 3400], ["Perseus", 75, 5370], ["Coma", 100, 6925], ["Abell 1367", 92, 6500], ["Hercules", 155, 11000], ["Abell 2199", 135, 9100], ["Pisces", 70, 4800]];

// ---------------- The page ----------------
const P = { H0: 70, model: "hubble", n: 40, dmax: 300, candle: "sn", sig: 0.15, cal: 0, vpec: 300, fitMax: 0, view: "grid", beta: 0.05, lam: 656.3 };
let rnd = K.rng(Date.now() % 99991 + 53), speed = 1, gals = [], shown = 0, scaleA = 1, field = [], observer = null, picked = null, acc = 0;
const ui = K.app({
  title: "The Expanding Universe", subject: "Astrophysics",
  blurb: "Red-shift, Hubble's law and the age of the universe, from a survey of galaxies",
  reset: () => set({}),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "GCSE / iGCSE physics: red-shift (light from distant galaxies is shifted to longer wavelengths), more distant galaxies move away faster, evidence for the Big Bang and an expanding universe.", adv: "A level physics (WJEC Eduqas and others): Δλ/λ = v/c, Hubble's law v = H₀d, the Hubble constant from data, the age of the universe ≈ 1/H₀, standard candles; the accelerating expansion (ΛCDM) is beyond the specification." } },
  missions: [
    { title: "Everything moves away", q: "Watch the grid expand. Click a different galaxy to stand on it. Does it look as if you are at the centre?", hint: "From any galaxy, every other galaxy moves away, and the further one moves faster. There is no centre: space itself is stretching everywhere.", setup() { set({ view: "grid" }); } },
    { title: "Red-shift", q: "Look at the spectrum of a distant galaxy. How are its lines different from the lab spectrum? Are all lines shifted by the same amount?", hint: "Every line moves to a longer (redder) wavelength by the same factor (1 + z): Δλ/λ is the same for each line. That is the signature of motion away from us (and of stretching space).", setup() { set({ view: "spectra" }); } },
    { title: "Measure Hubble's law", q: "Observe 40 galaxies. Is there a straight-line relationship between distance and speed? What is H₀?", hint: "Yes: v = H₀d, a straight line through the origin; the gradient is H₀ (about 70 km/s per Mpc here). Each galaxy's distance comes from a standard candle and its speed from its red-shift.", setup() { set({}); measureAll(); } },
    { title: "Age of the universe", q: "Use 1/H₀ to estimate the age of the universe. (1 Mpc = 3.09 × 10¹⁹ km.)", hint: "1/H₀ = 1 ÷ (70 km/s per Mpc) = 3.09 × 10¹⁹ ÷ 70 s = 4.4 × 10¹⁷ s ≈ 14 billion years. Real age (with the expansion changing over time): 13.8 billion years.", setup() { set({}); measureAll(); } },
    { title: "Hubble in 1929", q: "Try a small, noisy survey of nearby galaxies (like Hubble's). How confident can you be in H₀?", hint: "Nearby, galaxies' own motions (a few hundred km/s) are as big as the expansion speed, and Hubble's distances were too small: he got about 500 km/s per Mpc. With so few, scattered points the uncertainty is large.", setup() { set({ n: 20, dmax: 2.5, candle: "cepheid", sig: 0.4, cal: -0.85, vpec: 200 }); measureAll(); } },
    { title: "Wrong yardstick", q: "Make all distances 20% too big (a calibration error) and observe many galaxies. Do more galaxies fix it?", hint: "No: a systematic error moves every point the same way, so the fit converges on the wrong answer (about 58 instead of 70), with small error bars around the wrong value. More data only beats random errors.", setup() { set({ cal: 0.2, n: 200 }); measureAll(); } },
    { lvl: "adv", title: "The accelerating universe", q: "Switch to ΛCDM and observe supernovae out to 4000 Mpc. Do the far ones lie on the straight line?", hint: "At large distances the points curve away from the line: distant supernovae are fainter (further) than a constant expansion predicts, because the expansion is speeding up (dark energy). This won the 2011 Nobel Prize.", setup() { set({ model: "lcdm", dmax: 4000, n: 80, candle: "sn" }); measureAll(); } },
    { lvl: "adv", title: "Redshift calculator", q: "For the Hα line, set v = 0.05c. Find Δλ and z. What would the relativistic formula give at 0.5c?", hint: "Δλ = λv/c = 656.3 × 0.05 = 32.8 nm; z = 0.05. At high speeds use 1 + z = √((1 + β)/(1 − β)): at 0.5c, z = 0.73 (not 0.5).", setup() { set({ view: "spectra", beta: 0.05 }); } }
  ],
  batch: [
    { title: "Do more galaxies shrink the random error?", question: "How does the scatter of H₀ from different surveys change with the number of galaxies?", how: "Supernovae to 300 Mpc, brightness scatter 0.15 mag, peculiar velocities 300 km/s; |H₀ fitted − 70|.", xLabel: "number of galaxies", yLabel: "error in H₀ (km/s per Mpc)", xs: [10, 20, 40, 80, 160], reps: 20, yMin: 0, theory: n => 0.75 * Math.sqrt(40 / n), theoryLabel: "∝ 1 ÷ √N", run: (x, r) => Math.abs(fitH(survey(Object.assign({}, P0(), { n: x }), r)).H - 70), note: "Random errors average out: four times as many galaxies halve the error." },
    { title: "Can more galaxies fix a calibration error?", question: "If every distance is 20% too big, does observing more galaxies help?", how: "As above, with all distances × 1.2.", xLabel: "number of galaxies", yLabel: "H₀ fitted (km/s per Mpc)", xs: [10, 20, 40, 80, 160], reps: 10, theory: () => 70 / 1.2, theoryLabel: "70 ÷ 1.2", run: (x, r) => fitH(survey(Object.assign({}, P0(), { n: x, cal: 0.2 }), r)).H, note: "No: the answer converges on 58, not 70. A systematic error must be found and corrected, not averaged away." },
    { title: "Peculiar velocities nearby", question: "Galaxies also move through space at a few hundred km/s. How does that affect H₀ from nearby galaxies only?", how: "40 galaxies within the distance shown; peculiar velocities 300 km/s; |H₀ − 70|.", xLabel: "furthest galaxy (Mpc)", yLabel: "error in H₀ (km/s per Mpc)", xs: [10, 20, 50, 100, 200, 400], reps: 15, yMin: 0, run: (x, r) => Math.abs(fitH(survey(Object.assign({}, P0(), { dmax: x }), r)).H - 70), note: "Nearby, a galaxy's own motion is as big as its expansion speed, so H₀ is very uncertain. Far away the expansion dominates." },
    { title: "H₀ from 500 surveys", question: "If 500 teams each surveyed 40 galaxies, what values of H₀ would they get?", how: "Supernovae to 300 Mpc, as above.", yLabel: "H₀ fitted (km/s per Mpc)", reps: 500, bins: 24, theory: 70, theoryLabel: "true", run: (x, r) => fitH(survey(P0(), r)).H, note: "A bell-shaped spread around the true value: each survey's quoted ±1σ error should contain 70 about two times in three." },
    { title: "Age of the universe", question: "What Hubble time 1/H₀ does each survey give?", how: "As above; 1/H₀ in billions of years = 977.8 ÷ H₀.", yLabel: "Hubble time (billion years)", reps: 500, bins: 24, theory: 977.8 / 70, theoryLabel: "977.8 ÷ 70", run: (x, r) => 977.8 / fitH(survey(P0(), r)).H, note: "About 14 billion years. The real age (13.8 billion years) is close because the slowing and speeding up of the expansion almost cancel." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "GCSE", text: "Red-shift: light from distant galaxies is shifted towards longer wavelengths (the red end). This means they are moving away from us." },
      { lvl: "std", tag: "GCSE", text: "The further away a galaxy, the greater its red-shift, so the faster it is moving away: the universe is expanding." },
      { lvl: "std", tag: "GCSE", text: "Evidence for the Big Bang: red-shift of distant galaxies and the cosmic microwave background radiation (CMB)." },
      { lvl: "adv", tag: "A level", text: "z = Δλ/λ ≈ v/c for v ≪ c. Hubble's law v = H₀d; H₀ ≈ 70 km s⁻¹ Mpc⁻¹ (2.3 × 10⁻¹⁸ s⁻¹)." },
      { lvl: "adv", tag: "A level", text: "Age of the universe ≈ 1/H₀ ≈ 14 billion years (assuming constant expansion)." },
      { lvl: "adv", tag: "A level", text: "Standard candles: Cepheids (period–luminosity law) and Type Ia supernovae (M ≈ −19.3). m − M = 5 log₁₀(d/10 pc)." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: "What is meant by red-shift, and what does it tell us about distant galaxies?", ans: "<ul><li>light from the galaxy is shifted to longer wavelengths</li><li>the galaxy is moving away from us (the further, the faster)</li></ul>" },
      { lvl: "adv", marks: 3, q: () => `The Hα line (656.3 nm) from a galaxy is observed at ${(656.3 * (1 + P.beta)).toFixed(1)} nm. Find its speed and its distance (H₀ = 70 km/s per Mpc).`, ans: () => `<ul><li>z = Δλ/λ = ${(656.3 * P.beta).toFixed(1)} ÷ 656.3 = ${P.beta.toFixed(3)}</li><li>v = cz = ${(C * P.beta).toFixed(0)} km/s</li><li>d = v/H₀ = ${(C * P.beta / 70).toFixed(0)} Mpc</li></ul>` },
      { lvl: "adv", marks: 3, q: "Show that 1/H₀ is about 14 billion years when H₀ = 70 km s⁻¹ Mpc⁻¹ (1 Mpc = 3.09 × 10¹⁹ km).", ans: "<ul><li>H₀ = 70 ÷ 3.09 × 10¹⁹ = 2.27 × 10⁻¹⁸ s⁻¹</li><li>1/H₀ = 4.4 × 10¹⁷ s</li><li>÷ 3.16 × 10⁷ s per year = 1.4 × 10¹⁰ years</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li>Galaxies are spread evenly through space (distance d ∝ ∛(random) up to the furthest galaxy). Simple Hubble law: z = H₀d/c. ΛCDM (Ωm = 0.315, ΩΛ = 0.685) or matter only: comoving distance D = (c/H₀)∫dz/E(z), and standard candles measure the luminosity distance (1 + z)D.</li>
<li>Distance from a standard candle: the measured brightness scatters by σ magnitudes (a distance error of about 46% × σ), and every distance can be multiplied by a calibration error (1 + error).</li>
<li>Speed from the red-shift v = cz, including each galaxy's own (peculiar) motion, (1 + z_obs) = (1 + z_cos)(1 + v_pec/c), and a 30 km/s measurement error.</li>
<li>Fit: weighted least squares through the origin, weight 1/(30² + 250² + H²σ_d²); the quoted error is scaled by √(χ²/ν). Hubble time = 977.8/H₀ billion years.</li></ul>
<h3>Left out</h3>
<ul><li>Dust, K-corrections, Malmquist bias, the details of the Cepheid and supernova calibrations, and the "Hubble tension" (Planck 67.4 against SH0ES 73.0).</li></ul>
<p>The earlier version of this simulation, with its worksheets, is kept in <a href="original/expanding-universe.html">original/expanding-universe.html</a>.</p>`
});
const P0 = () => ({ H0: 70, model: "hubble", n: 40, dmax: 300, candle: "sn", sig: 0.15, cal: 0, vpec: 300 });

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("View");
ctl.view = K.seg(g, { value: "grid", options: [["grid", "🌌 Expanding space"], ["spectra", "🌈 Spectra and red-shift"]], on: v => P.view = v });
ctl.beta = K.slider(g, { label: "Galaxy speed (for the spectrum)", min: 0, max: 0.9, step: 0.005, value: 0.05, fmt: v => `${(v * C).toFixed(0)} km/s (${v.toFixed(3)} c)`, on: v => P.beta = v });
g = ui.group("The real universe");
ctl.H0 = K.slider(g, { label: "True H₀", min: 40, max: 100, step: 1, value: 70, unit: "km/s per Mpc", on: v => { P.H0 = v; newSurvey(); } });
ctl.model = K.seg(g, { label: "Expansion", value: "hubble", options: [["hubble", "simple Hubble law"], ["lcdm", "ΛCDM (accelerating)"], ["matter", "matter only (slowing)"]], on: v => { P.model = v; newSurvey(); } });
g = ui.group("Your survey");
ctl.n = K.slider(g, { label: "Number of galaxies", min: 5, max: 300, step: 5, value: 40, on: v => { P.n = v; newSurvey(); } });
ctl.dmax = K.slider(g, { label: "Furthest galaxy", min: 1, max: 4000, step: 1, value: 300, unit: "Mpc", on: v => { P.dmax = v; newSurvey(); } });
ctl.candle = K.seg(g, { label: "Distance from", value: "sn", options: [["cepheid", "Cepheid stars"], ["sn", "Type Ia supernovae"]], on: v => { P.candle = v; newSurvey(); } });
ctl.sig = K.slider(g, { label: "Brightness scatter", min: 0, max: 0.6, step: 0.01, value: 0.15, unit: "mag", on: v => { P.sig = v; newSurvey(); } });
ctl.cal = K.slider(g, { label: "Calibration error", min: -0.9, max: 0.5, step: 0.01, value: 0, fmt: v => (v > 0 ? "+" : "") + (v * 100).toFixed(0) + "% on every distance", on: v => { P.cal = v; newSurvey(); } });
ctl.vpec = K.slider(g, { label: "Galaxies' own motions", min: 0, max: 1000, step: 10, value: 300, unit: "km/s", on: v => { P.vpec = v; newSurvey(); } });
let rr = K.row(g); K.btn(rr, "🔭 Observe all now", () => measureAll(), "primary"); K.btn(rr, "↺ New survey", () => newSurvey());
ctl.speed = K.slider(g, { label: "Observing speed", min: 0.5, max: 20, step: 0.5, value: 1, fmt: v => v * 2 + " galaxies per second", on: v => speed = v });
const read = K.readout(ui.group("Readings"), [["H", "H₀ fitted"], ["age", "Hubble time 1/H₀"], ["n", "galaxies observed"], ["last", "latest galaxy"], ["z", "spectrum: z and Δλ(Hα)"]]);
function newSurvey() { gals = survey(Object.assign({}, P, { sig: P.candle === "cepheid" ? Math.max(P.sig, 0.1) : P.sig, dmax: P.candle === "cepheid" ? Math.min(P.dmax, 40) : P.dmax }), rnd); shown = 0; picked = null; }
function measureAll() { shown = gals.length; }
function set(o) { Object.assign(P, P0(), { fitMax: 0, view: "grid", beta: 0.05 }, o); for (const k of ["H0", "n", "dmax", "sig", "cal", "vpec", "beta"]) ctl[k].set(P[k]); ctl.model.set(P.model); ctl.candle.set(P.candle); ctl.view.set(P.view); newSurvey(); makeField(); }
function makeField() { field = []; for (let i = 0; i < 70; i++) field.push({ x: (rnd() - 0.5) * 2, y: (rnd() - 0.5) * 2, hue: 200 + rnd() * 60, s: 2 + rnd() * 3 }); observer = field[0]; observer.x = 0; observer.y = 0; scaleA = 1; }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
let fieldView = { cx: 0, cy: 0, R: 1 };
K.pointer(cv.el, { down: (x, y) => { if (P.view !== "grid") return; const { cx, cy, R } = fieldView; let best = null, bd = 400; for (const f of field) { const fx = cx + (f.x - observer.x) * scaleA * R, fy = cy + (f.y - observer.y) * scaleA * R, d = (fx - x) ** 2 + (fy - y) ** 2; if (d < bd) { bd = d; best = f; } } if (best) { observer = best; ui.tip("You are now standing on this galaxy: everything else still moves away from you.", 3000); } } });
function spectrum(c, x, y, w, h, z, label) {
  const lo = 380, hi = 760; for (let i = 0; i < w; i++) { const l = lo + (hi - lo) * i / w, hue = 270 - (l - 380) / 380 * 270; c.fillStyle = `hsl(${hue},80%,45%)`; c.fillRect(x + i, y, 1, h); }
  c.fillStyle = "#000"; for (const [, l0] of LINES) { const l = l0 * (1 + z); if (l > lo && l < hi) c.fillRect(x + (l - lo) / (hi - lo) * w - 1.5, y, 3, h); }
  TX(c, label, x, y - 6, "#eef2f8", "left", "600 12px"); for (const l of [400, 500, 600, 700]) TX(c, l + " nm", x + (l - lo) / (hi - lo) * w, y + h + 14, "#7d8aa5", "center", "10px");
}
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#05070f"; c.fillRect(0, 0, w, h);
  if (P.view === "grid") {
    const cx = w * 0.32, cy = h * 0.5, R = Math.min(w * 0.3, h * 0.45); fieldView = { cx, cy, R };
    c.strokeStyle = "rgba(120,140,200,0.18)"; for (let k = -10; k <= 10; k++) { const off = k * 0.2 * scaleA * R; c.beginPath(); c.moveTo(cx + off - observer.x * scaleA * R, 0); c.lineTo(cx + off - observer.x * scaleA * R, h); c.stroke(); c.beginPath(); c.moveTo(0, cy + off - observer.y * scaleA * R); c.lineTo(w * 0.64, cy + off - observer.y * scaleA * R); c.stroke(); }
    for (const f of field) { const fx = cx + (f.x - observer.x) * scaleA * R, fy = cy + (f.y - observer.y) * scaleA * R; if (fx < 0 || fx > w * 0.64 || fy < 0 || fy > h) continue; const dd = Math.hypot(f.x - observer.x, f.y - observer.y); c.fillStyle = f === observer ? "#ffd166" : `hsl(${f.hue},70%,70%)`; c.beginPath(); c.arc(fx, fy, f.s, 0, 6.3); c.fill(); if (f !== observer && dd > 0.05) { const vx = (f.x - observer.x) / dd, vy = (f.y - observer.y) / dd, L = dd * 30; c.strokeStyle = "rgba(255,138,112,0.6)"; c.beginPath(); c.moveTo(fx, fy); c.lineTo(fx + vx * L, fy + vy * L); c.stroke(); } }
    TX(c, "Click a galaxy to stand on it · arrows: speed away from you (∝ distance)", 14, 22, "#eef2f8", "left", "600 12.5px");
    TX(c, `scale factor ${scaleA.toFixed(2)}`, 14, h - 14, "#7d8aa5", "left", "11px");
    // the latest galaxy's spectrum on the right
    const gl = gals[Math.max(0, shown - 1)]; if (gl) { spectrum(c, w * 0.67, h * 0.25, w * 0.3, 30, 0, "lab spectrum (at rest)"); spectrum(c, w * 0.67, h * 0.45, w * 0.3, 30, gl.z, `latest galaxy: z = ${gl.z.toFixed(4)}`); TX(c, `distance ${gl.dm.toFixed(1)} Mpc (from the ${P.candle === "sn" ? "supernova" : "Cepheid"}'s brightness)`, w * 0.67, h * 0.62, "#aab6cc", "left", "11.5px"); TX(c, `speed ${gl.v.toFixed(0)} km/s (from the red-shift, v = cz)`, w * 0.67, h * 0.62 + 18, "#aab6cc", "left", "11.5px"); }
  } else {
    const z = Math.sqrt((1 + P.beta) / (1 - P.beta)) - 1, zl = P.beta;
    spectrum(c, 40, 80, w - 80, 46, 0, "lab spectrum (hydrogen, calcium, magnesium, sodium lines)");
    spectrum(c, 40, 190, w - 80, 46, ui.level === "adv" ? z : zl, `galaxy moving away at ${(P.beta * C).toFixed(0)} km/s`);
    let y = 290; const L = (s, col = "#aab6cc") => { TX(c, s, 40, y, col, "left", "13px"); y += 24; };
    L(`Every line shifts by the same factor 1 + z: Hα 656.3 nm → ${(656.3 * (1 + (ui.level === "adv" ? z : zl))).toFixed(1)} nm`, "#eef2f8");
    L(`z = Δλ/λ ≈ v/c = ${zl.toFixed(3)}`, "#ffd166");
    if (ui.level === "adv") L(`relativistic: 1 + z = √((1 + β)/(1 − β)) → z = ${z.toFixed(3)} ${P.beta > 0.1 ? "(v = cz is no longer accurate)" : ""}`, "#c9a0ff");
    L(`distance by Hubble's law: d = v/H₀ = ${(P.beta * C / P.H0).toFixed(0)} Mpc`, "#7fe3a0");
  }
}

// ---------------- Charts ----------------
function charts() {
  const obs = gals.slice(0, shown), f = fitH(obs, P.fitMax), dmax = Math.max(10, ...gals.map(q => q.dm)) * 1.05;
  chA.opts.title = "Hubble diagram"; chA.opts.xLabel = "distance (Mpc)"; chA.opts.yLabel = "speed of recession (km/s)"; chA.opts.xFmt = null;
  const ser = [{ pts: obs.map(q => [q.dm, q.v]), type: "dots", r: 3.5, color: "#ffd166", label: "galaxies" }];
  if (isFinite(f.H)) ser.push({ pts: [[0, 0], [dmax, f.H * dmax]], color: "#7fe3a0", label: `fit: H₀ = ${f.H.toFixed(1)}` });
  ser.push({ pts: [[0, 0], [dmax, P.H0 * dmax]], color: "#56607a", dash: [5, 4], label: `true H₀ = ${P.H0}` });
  chA.draw(ser, { xMin: 0, xMax: dmax, yMin: 0 });
  chB.opts.title = "Real galaxy clusters"; chB.opts.xLabel = "distance (Mpc)"; chB.opts.yLabel = "km/s"; chB.opts.xFmt = null;
  const fr = fitH(REAL.map(([, d, v]) => ({ dm: d, v, sd: d * 0.1 })));
  chB.draw([{ pts: REAL.map(([, d, v]) => [d, v]), type: "dots", r: 4, color: "#6fb1ff", label: "clusters" }, { pts: [[0, 0], [160, fr.H * 160]], color: "#7fe3a0", label: `H₀ = ${fr.H.toFixed(0)}` }, { pts: [[0, 0], [160, 67.4 * 160]], color: "#ff8a70", dash: [4, 4], label: "Planck 67.4" }, { pts: [[0, 0], [160, 73 * 160]], color: "#c9a0ff", dash: [4, 4], label: "SH0ES 73.0" }], { xMin: 0, xMax: 160, yMin: 0 });
  const gl = obs[obs.length - 1];
  read.set("H", isFinite(f.H) ? `${f.H.toFixed(1)} ± ${f.err.toFixed(1)} km/s per Mpc` : "observe more galaxies"); read.set("age", isFinite(f.H) ? (977.8 / f.H).toFixed(1) + " billion years" : "–"); read.set("n", `${shown} of ${gals.length}`);
  read.set("last", gl ? `${gl.dm.toFixed(1)} Mpc, ${gl.v.toFixed(0)} km/s` : "–"); read.set("z", `${P.beta.toFixed(3)} · ${(656.3 * P.beta).toFixed(1)} nm`);
  ui.hud(shown < 3 ? "Observe galaxies: distance from a standard candle, speed from the red-shift" : "v = H₀d: the gradient of the line is the Hubble constant");
}

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => {
  if (!(dt > 0)) return; scaleA *= Math.exp(dt * 0.06); if (scaleA > 2.6) scaleA = 1;
  acc += dt * 2 * speed; while (acc >= 1 && shown < gals.length) { acc--; shown++; } if (shown >= gals.length) acc = 0;
}, () => { draw(); if (frame++ % 5 === 0) charts(); });
set({});
ui.tip("Galaxies are observed one at a time and added to the Hubble diagram. Click a galaxy in the picture to stand on it.", 7000);
