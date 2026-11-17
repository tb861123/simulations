/* =====================================================================
   ATOMIC SPECTRA AND ENERGY LEVELS
   Electrons in an atom can only have certain energies (ENERGY LEVELS).
   For hydrogen:  Eₙ = −13.6 eV ÷ n².
   When an electron drops from a higher level to a lower one, the atom
   gives out ONE photon carrying the energy difference:
        ΔE = hf = hc ÷ λ        (hc = 1240 eV nm)
   Each element has its own set of levels, so its own LINE SPECTRUM:
     • emission: bright lines on a dark background (a hot gas, a discharge tube)
     • absorption: dark lines on a continuous spectrum (cool gas in front of
       white light): only photons with exactly the right energy are absorbed.
   Above n = ∞ (0 eV) the electron is free: 13.6 eV ionises hydrogen.
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
const HC = 1239.84;                                                            // h × c in eV nm
const EH = n => -13.6 / (n * n);                                               // hydrogen energy levels (eV)
const lamH = (ni, nf) => HC / (EH(ni) - EH(nf));                                // wavelength of the photon for ni → nf (nm)
const RYD = 1.0968e7;                                                          // Rydberg constant for hydrogen (m⁻¹)
const SERIES = { all: [0, "all"], lyman: [1, "Lyman (to n = 1, ultraviolet)"], balmer: [2, "Balmer (to n = 2, visible)"], paschen: [3, "Paschen (to n = 3, infrared)"] };
// measured lines for other elements (nm), the brightest few
const ELEMENTS = {
  H: { name: "Hydrogen" },
  He: { name: "Helium", lines: [388.9, 447.1, 471.3, 492.2, 501.6, 587.6, 667.8, 706.5] },
  Na: { name: "Sodium", lines: [330.3, 498.3, 568.8, 589.0, 589.6, 615.4, 819.5] },
  Ne: { name: "Neon", lines: [585.2, 588.2, 594.5, 597.6, 603.0, 607.4, 614.3, 616.4, 621.7, 626.6, 633.4, 638.3, 640.2, 650.7, 659.9, 692.9, 703.2] }
};
// the colour of light of wavelength λ (nm); ultraviolet and infrared drawn pale
function lamCol(l, a = 1) {
  if (l < 380) return `rgba(200,170,255,${a * 0.7})`; if (l > 750) return `rgba(255,170,150,${a * 0.6})`;
  let r = 0, g = 0, b = 0; if (l < 440) { r = (440 - l) / 60; b = 1; } else if (l < 490) { g = (l - 440) / 50; b = 1; } else if (l < 510) { g = 1; b = (510 - l) / 20; } else if (l < 580) { r = (l - 510) / 70; g = 1; } else if (l < 645) { r = 1; g = (645 - l) / 65; } else r = 1;
  const f = l < 420 ? 0.4 + 0.6 * (l - 380) / 40 : l > 700 ? 0.4 + 0.6 * (750 - l) / 50 : 1; return `rgba(${Math.round(255 * r * f)},${Math.round(255 * g * f)},${Math.round(255 * b * f)},${a})`;
}
const region = l => l < 10 ? "X-ray" : l < 380 ? "ultraviolet" : l <= 750 ? "visible" : l < 1e6 ? "infrared" : "microwave";
// all hydrogen lines in a series (lower level nf, upper levels up to nmax)
function hLines(series, nmax = 8) { const out = []; for (let nf = 1; nf < nmax; nf++) { if (series !== "all" && SERIES[series][0] !== nf) continue; for (let ni = nf + 1; ni <= nmax; ni++) out.push({ ni, nf, l: lamH(ni, nf), E: EH(ni) - EH(nf) }); } return out; }
// a random cascade: from level n the electron drops to any lower level with equal chances; returns the photons
function cascade(n, r) { const out = []; while (n > 1) { const m = 1 + Math.floor(r() * (n - 1)); out.push({ ni: n, nf: m, l: lamH(n, m) }); n = m; } return out; }
// exact expected fraction of visible photons in cascades from n (recursion over equal-chance drops)
function visFrac(n0) { const memo = {}; const f = n => { if (n === 1) return [0, 0]; if (memo[n]) return memo[n]; let v = 0, t = 0; for (let m = 1; m < n; m++) { const [vv, tt] = f(m), l = lamH(n, m), vis = l >= 380 && l <= 750 ? 1 : 0; v += (vis + vv) / (n - 1); t += (1 + tt) / (n - 1); } return memo[n] = [v, t]; }; const [v, t] = f(n0); return v / t; }
// a diffraction-grating spectrometer: d sin θ = λ (first order); the angle is read with a random error
function gratingRead(l, N, err, r) { const d = 1e6 / N, s = l / d; if (s >= 1) return NaN; const th = Math.asin(s) * 180 / Math.PI + err * r.gauss(); return d * Math.sin(th * Math.PI / 180); }
// laser populations in the steady state (fractions of atoms): pump rate W (per lifetime of the upper laser level)
function laser(kind, W) { if (kind === 3) { const n2 = W / (1 + W); return { up: n2, low: 1 - n2, inv: n2 > 1 - n2 }; } const n2 = W / (1 + W) * 0.5; return { up: n2, low: n2 * 0.02, ground: 1 - n2 * 1.02, inv: n2 > n2 * 0.02 && W > 0 }; }

// ---------------- The page ----------------
const P = { el: "H", mode: "emission", series: "balmer", ni: 3, nf: 2, view: "atom", N: 600, err: 0.1, laserKind: 4, pump: 0.5, rate: 3, repeat: false };
let rnd = K.rng(Date.now() % 9973 + 11), level = 1, photons = [], flashes = [], seen = {}, nextEvent = 0, T = 0, lastJump = null, gratingLog = [];
const ui = K.app({
  title: "Atomic Spectra and Energy Levels", subject: "Physics",
  blurb: "Energy levels, emission and absorption lines, photon energies, the diffraction grating and lasers",
  reset: () => set({}),
  levels: { std: "Standard (iGCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Physics (4PH1) 3(c) the electromagnetic spectrum: the order of the spectrum, all travel at the same speed in a vacuum, the colours of visible light, v = fλ, uses and dangers of infrared and ultraviolet. Energy levels and line spectra are not in 4PH1.", adv: "WJEC Eduqas A level Physics: photons (E = hf, the electronvolt), energy levels and line spectra, emission and absorption, ionisation; lasers (population inversion, pumping, metastable levels). The Rydberg formula is beyond the spec." } },
  missions: [
    { title: "The visible spectrum", q: "Look at the spectrum strip. Put the colours in order of wavelength. Which end has the most energetic photons?", hint: "Violet (about 400 nm) to red (about 700 nm). Shorter wavelength means higher frequency (v = fλ, the same speed for all) and more energetic photons: ultraviolet beyond violet, infrared beyond red.", setup() { set({ el: "H", series: "all" }); } },
    { title: "Hydrogen's lines", q: "Watch the discharge tube. Each jump down gives out one photon. Which jumps give visible light?", hint: "Drops to n = 2 (the Balmer series) give visible lines: H-α red 656 nm (3 → 2), H-β blue-green 486 nm, H-γ and H-δ violet. Drops to n = 1 are ultraviolet (Lyman); to n = 3 infrared (Paschen).", setup() { set({ el: "H", series: "balmer" }); } },
    { title: "Calculate a line", q: "Choose 4 → 2. Find ΔE from the energy levels, then λ = hc ÷ ΔE.", hint: "E₄ = −0.85 eV, E₂ = −3.40 eV, ΔE = 2.55 eV = 4.09 × 10⁻¹⁹ J; λ = hc ÷ ΔE = 1240 ÷ 2.55 = 486 nm (H-β, blue-green).", setup() { set({ el: "H", ni: 4, nf: 2 }); } },
    { title: "Absorption lines", q: "Switch to absorption. Why are only some colours missing from the white light?", hint: "Only photons whose energy exactly matches a jump up from the lowest level(s) can be absorbed. The atom re-emits in a random direction, so those colours are dark in the beam: the same wavelengths as the emission lines.", setup() { set({ el: "H", mode: "absorption" }); } },
    { title: "Fingerprints of elements", q: "Compare hydrogen, helium, sodium and neon. How could you tell which gas is in a lamp or a star?", hint: "Each element has its own energy levels, so its own pattern of lines, like a fingerprint. Sodium's strong yellow pair (589 nm) dominates street lamps; helium was discovered in the Sun's spectrum before it was found on Earth.", setup() { set({ el: "Na" }); } },
    { title: "Ionisation", q: "What energy is needed to free the electron from hydrogen's ground state? What is the shortest wavelength in the Lyman series?", hint: "13.6 eV (from n = 1 to 0 eV). The Lyman lines crowd towards 1240 ÷ 13.6 = 91 nm: the series limit.", setup() { set({ el: "H", series: "lyman" }); } },
    { lvl: "adv", title: "Diffraction grating", q: "Measure H-α with a 600 lines/mm grating. Find the angle and use d sin θ = λ. How does a finer grating help?", hint: "d = 1/600 mm = 1667 nm; sin θ = 656 ÷ 1667 → θ = 23.2°. More lines per mm spread the lines further apart, so the same angle error gives a smaller wavelength error.", setup() { set({ el: "H", view: "grating", ni: 3, nf: 2 }); } },
    { lvl: "adv", title: "Laser: population inversion", q: "Compare the 3-level (ruby) and 4-level (Nd:YAG) lasers. How hard must each be pumped to get a population inversion?", hint: "3-level: the lower laser level is the ground state, so more than half of all atoms must be pumped up (pump × lifetime > 1). 4-level: the lower laser level empties quickly, so almost any pumping gives an inversion: much more efficient.", setup() { set({ view: "laser", laserKind: 3, pump: 0.6 }); } }
  ],
  batch: [
    { title: "Do the Balmer lines fit Rydberg's formula?", question: "Measured with a grating, do the Balmer wavelengths follow 1/λ = R(1/2² − 1/n²)?", how: "600 lines/mm grating, angle read with an error SD of 0.1°; 10 readings for each upper level.", xLabel: "upper level n", yLabel: "wavelength (nm)", xs: [3, 4, 5, 6, 7, 8, 9], reps: 10, theory: n => 1e9 / (RYD * (1 / 4 - 1 / (n * n))), theoryLabel: "Rydberg formula", run: (n, r) => gratingRead(lamH(n, 2), 600, 0.1, r), note: "The lines crowd together towards 365 nm (the series limit) as n rises." },
    { title: "Measure the Rydberg constant", question: "If 200 students each measure H-α to H-δ and fit 1/λ against (1/4 − 1/n²), what values of R do they get?", how: "Gradient of 1/λ against (1/4 − 1/n²) through the origin, each angle read with SD 0.1° on a 600 lines/mm grating.", yLabel: "Rydberg constant (× 10⁷ m⁻¹)", reps: 200, bins: 20, theory: RYD / 1e7, theoryLabel: "R_H", run: (x, r) => { let sxy = 0, sxx = 0; for (let n = 3; n <= 6; n++) { const xx = 1 / 4 - 1 / (n * n), y = 1e9 / gratingRead(lamH(n, 2), 600, 0.1, r); sxy += xx * y; sxx += xx * xx; } return sxy / sxx / 1e7; }, note: "The class average is very close to 1.097 × 10⁷ m⁻¹; individual values scatter by about 1% because of the angle readings." },
    { title: "The Lyman series converges to 13.6 eV", question: "How do the photon energies of the Lyman lines change as n rises?", how: "ΔE = E_n − E₁ for n = 2 to 20 (exact).", xLabel: "upper level n", yLabel: "photon energy (eV)", xs: [2, 3, 4, 5, 6, 8, 10, 15, 20], reps: 1, theory: n => 13.6 * (1 - 1 / (n * n)), theoryLabel: "13.6(1 − 1/n²)", run: n => EH(n) - EH(1), note: "The energies approach 13.6 eV, the ionisation energy: above it the electron is free and any energy can be absorbed (a continuum)." },
    { title: "How fine a grating?", question: "How much does a single H-α measurement vary with gratings of different line density?", how: "Angle error SD 0.1°; 40 readings at each grating; result = |error| in nm.", xLabel: "lines per mm", yLabel: "|error| in H-α (nm)", xs: [100, 300, 600, 900, 1200], reps: 40, yMin: 0, theory: N => { const d = 1e6 / N, th = Math.asin(656.3 / d); return d * Math.cos(th) * 0.1 * Math.PI / 180 * Math.sqrt(2 / Math.PI); }, theoryLabel: "d cos θ × Δθ × √(2/π)", run: (N, r) => Math.abs(gratingRead(656.3, N, 0.1, r) - 656.3), note: "A finer grating spreads the spectrum over bigger angles, so the same reading error matters less." },
    { title: "How many photons can we see?", question: "In random cascades from n = 6, what fraction of the photons are visible?", how: "Each drop goes to any lower level with equal chances; 50 atoms per run.", yLabel: "visible fraction (%)", reps: 200, bins: 20, theory: 100 * visFrac(6), theoryLabel: "exact average", run: (x, r) => { let v = 0, t = 0; for (let a = 0; a < 50; a++) for (const p of cascade(6, r)) { t++; if (p.l >= 380 && p.l <= 750) v++; } return 100 * v / t; }, note: "Most photons from hydrogen are ultraviolet or infrared: only drops that end on n = 2 are visible." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4PH1 3(c)", text: "The electromagnetic spectrum in order of increasing wavelength: gamma, X-rays, ultraviolet, visible (violet → red), infrared, microwaves, radio. All travel at 3 × 10⁸ m/s in a vacuum; v = fλ." },
      { lvl: "std", tag: "4PH1 3(c)", text: "Uses and dangers: ultraviolet (security marking, sterilising; skin cancer, eye damage), infrared (heaters, remote controls, thermal imaging; burns)." },
      { lvl: "adv", tag: "Eduqas", text: "Electrons occupy discrete energy levels. A transition between levels emits or absorbs one photon with hf = ΔE. 1 eV = 1.6 × 10⁻¹⁹ J." },
      { lvl: "adv", tag: "Eduqas", text: "Emission spectrum: bright lines (hot, low-pressure gas). Absorption spectrum: dark lines on a continuous spectrum (cool gas in front of a hot source). Same wavelengths for the same element." },
      { lvl: "adv", tag: "Eduqas", text: "Ionisation energy: from the ground state to 0 eV (13.6 eV for hydrogen). Diffraction grating: d sin θ = nλ." },
      { lvl: "adv", tag: "Eduqas", text: "Laser: stimulated emission gives identical, in-phase photons; needs a population inversion (more atoms in the upper level), produced by pumping into a metastable level." },
      { lvl: "beyond", tag: "Beyond the spec", text: "Rydberg formula: 1/λ = R(1/n_f² − 1/n_i²), R = 1.097 × 10⁷ m⁻¹." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: "Red light has a wavelength of 656 nm. Calculate its frequency (c = 3.0 × 10⁸ m/s).", ans: "<ul><li>f = v ÷ λ = 3.0 × 10⁸ ÷ 656 × 10⁻⁹</li><li>= 4.6 × 10¹⁴ Hz</li></ul>" },
      { lvl: "adv", marks: 3, q: () => `An electron in hydrogen drops from n = ${P.ni} to n = ${P.nf}. Calculate the energy of the photon in J and its wavelength.`, ans: () => { const dE = EH(P.ni) - EH(P.nf); return `<ul><li>ΔE = ${EH(P.ni).toFixed(2)} − (${EH(P.nf).toFixed(2)}) = ${dE.toFixed(2)} eV</li><li>= ${(dE * 1.6e-19).toExponential(2)} J</li><li>λ = hc ÷ ΔE = ${lamH(P.ni, P.nf).toFixed(0)} nm (${region(lamH(P.ni, P.nf))})</li></ul>`; } },
      { lvl: "adv", marks: 3, q: "Explain how an absorption spectrum is produced and why its lines match the emission lines of the same element.", ans: "<ul><li>white light (all wavelengths) passes through a cool gas</li><li>photons with energy exactly equal to a level difference are absorbed; re-emitted in all directions</li><li>so those wavelengths are dark; the level differences (so the wavelengths) are the same as in emission</li></ul>" },
      { lvl: "adv", marks: 3, q: "Explain why a 4-level laser needs less pumping than a 3-level laser.", ans: "<ul><li>a population inversion is needed between the upper and lower laser levels</li><li>in a 3-level laser the lower level is the ground state, so over half the atoms must be pumped</li><li>in a 4-level laser the lower laser level empties rapidly, so a few atoms in the upper level are enough</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li>Hydrogen: Bohr energy levels Eₙ = −13.6/n² eV (n = 1 to 8 shown). A photon's wavelength λ = hc/ΔE with hc = 1239.84 eV nm. Helium, sodium and neon: their brightest measured lines (no level diagram).</li>
<li>Discharge tube: collisions lift the electron to a random level; it then drops to a lower level chosen at random (equal chances), one photon per jump, until it reaches n = 1. Absorption: white-light photons pass through; only those matching a jump up from n = 1 (or n = 2 for the Balmer view) are absorbed, then re-emitted in a random direction.</li>
<li>Spectrometer: first-order diffraction grating d sin θ = λ, the angle read with a random error.</li>
<li>Laser (A level): steady-state populations. 3-level: N₂/N₁ = pump rate × lifetime. 4-level: the lower laser level empties at once.</li>
<li>The atom picture is not to scale (orbit radii really grow as n²); real line brightnesses (transition probabilities), fine structure and Doppler broadening are left out.</li></ul>
<p>Black-body spectra are in <i>Stellar Life Cycle</i>, red-shift in <i>The Expanding Universe</i>. The earlier version of this simulation, with its worksheets, is kept in <a href="original/atomic-spectra.html">original/atomic-spectra.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("View");
ctl.view = K.seg(g, { value: "atom", options: [["atom", "⚛ Atom and spectrum"], ["grating", "📐 Grating (A level)"], ["laser", "🔴 Laser (A level)"]], on: v => P.view = v });
g = ui.group("Atom");
ctl.el = K.seg(g, { label: "Element", value: "H", options: Object.entries(ELEMENTS).map(([k, v]) => [k, v.name]), on: v => { P.el = v; seen = {}; } });
ctl.mode = K.seg(g, { label: "Spectrum", value: "emission", options: [["emission", "emission (discharge tube)"], ["absorption", "absorption (white light through gas)"]], on: v => { P.mode = v; seen = {}; } });
ctl.series = K.seg(g, { label: "Series (hydrogen)", value: "balmer", options: Object.entries(SERIES).map(([k, v]) => [k, v[1]]), on: v => { P.series = v; seen = {}; } });
ctl.rate = K.slider(g, { label: "Jumps per second", min: 0.5, max: 20, step: 0.5, value: 3, on: v => P.rate = v });
g = ui.group("Your transition (hydrogen)");
ctl.ni = K.slider(g, { label: "From level nᵢ", min: 2, max: 8, step: 1, value: 3, on: v => { P.ni = v; if (P.nf >= v) { P.nf = v - 1; ctl.nf.set(P.nf); } } });
ctl.nf = K.slider(g, { label: "To level n_f", min: 1, max: 7, step: 1, value: 2, on: v => { P.nf = Math.min(v, P.ni - 1); } });
let rr = K.row(g); K.btn(rr, "⚡ Do my transition", () => jump(P.ni, P.nf), "primary"); ctl.repeat = K.toggle(g, { label: "Repeat my transition", value: false, on: v => P.repeat = v });
g = ui.group("Grating (A level)");
ctl.N = K.slider(g, { label: "Lines per mm", min: 100, max: 1200, step: 50, value: 600, on: v => P.N = v });
ctl.err = K.slider(g, { label: "Angle reading error (SD)", min: 0, max: 0.5, step: 0.01, value: 0.1, unit: "°", on: v => P.err = v });
K.btn(K.row(g), "📏 Take a reading", () => { const l = P.el === "H" ? lamH(P.ni, P.nf) : ELEMENTS[P.el].lines[0], m = gratingRead(l, P.N, P.err, rnd); gratingLog.push([gratingLog.length + 1, m]); });
g = ui.group("Laser (A level)");
ctl.laserKind = K.seg(g, { value: 4, options: [[3, "3-level (ruby)"], [4, "4-level (Nd:YAG)"]], on: v => P.laserKind = +v });
ctl.pump = K.slider(g, { label: "Pumping (× 1/lifetime)", min: 0, max: 3, step: 0.05, value: 0.5, on: v => P.pump = v });
const read = K.readout(ui.group("Readings"), [["t", "your transition"], ["E", "photon energy"], ["l", "wavelength · frequency"], ["r", "region"]]);
function set(o) { Object.assign(P, { el: "H", mode: "emission", series: "balmer", ni: 3, nf: 2, view: "atom", N: 600, err: 0.1, laserKind: 4, pump: 0.5, repeat: false }, o); for (const k of ["ni", "nf", "N", "err", "pump"]) ctl[k].set(P[k]); for (const k of ["view", "el", "mode", "series", "laserKind"]) ctl[k].set(P[k]); ctl.repeat.set(P.repeat); seen = {}; photons = []; gratingLog = []; level = 1; }
// emit a photon for a jump ni → nf (hydrogen) or a line λ (other elements)
function emit(l, ni, nf, dir) { const a = dir != null ? dir : rnd() * 6.283; photons.push({ l, a, r: 0, ni, nf }); const key = l.toFixed(1); seen[key] = (seen[key] || 0) + 1; lastJump = { l, ni, nf }; }
function jump(ni, nf) { level = nf; emit(lamH(ni, nf), ni, nf); flashes.push({ n: nf, t: 0 }); }
function event() {
  if (P.el !== "H") { const L = ELEMENTS[P.el].lines, l = L[Math.floor(rnd() * L.length)]; if (P.mode === "emission") emit(l); else { const key = l.toFixed(1); seen[key] = (seen[key] || 0) + 1; photons.push({ l, a: rnd() * 6.283, r: 0, abs: true }); } return; }
  if (P.repeat) { jump(P.ni, P.nf); return; }
  const lowest = P.series === "all" ? 1 : SERIES[P.series][0];
  if (P.mode === "emission") { if (level <= lowest) { level = lowest + 1 + Math.floor(rnd() * (8 - lowest)); return; } const m = Math.max(lowest, 1 + Math.floor(rnd() * (level - 1))); const ok = P.series === "all" || m === lowest; if (ok) jump(level, m); else level = m; }
  else { const nUp = lowest + 1 + Math.floor(rnd() * (8 - lowest)); const l = lamH(nUp, lowest), key = l.toFixed(1); seen[key] = (seen[key] || 0) + 1; photons.push({ l, a: rnd() * 6.283, r: 0, abs: true, ni: nUp, nf: lowest }); level = nUp; }
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
const lx = l => Math.log(l / 90) / Math.log(2000 / 90);                         // position on the log spectrum strip (90–2000 nm)
function strip(c, x, y, w, h, lines, mode, logScale) {
  const pos = l => logScale ? lx(l) : (l - 380) / 370;
  if (mode === "absorption") for (let i = 0; i < w; i++) { const l = logScale ? 90 * (2000 / 90) ** (i / w) : 380 + 370 * i / w; c.fillStyle = l >= 380 && l <= 750 ? lamCol(l) : "#222a3a"; c.fillRect(x + i, y, 1, h); } else { c.fillStyle = "#000"; c.fillRect(x, y, w, h); }
  for (const [l, a] of lines) { const p = pos(l); if (p < 0 || p > 1) continue; c.fillStyle = mode === "absorption" ? "#000" : lamCol(l, Math.min(1, 0.35 + a)); c.fillRect(x + p * w - 1.5, y, 3, h); }
  if (logScale) { for (const l of [100, 200, 380, 750, 1000, 2000]) TX(c, l + " nm", x + lx(l) * w, y + h + 13, "#8fa0bf", "center", "10px"); TX(c, "ultraviolet", x + lx(180) * w, y - 5, "#c9a0ff", "center", "10.5px"); TX(c, "visible", x + lx(530) * w, y - 5, "#eef2f8", "center", "10.5px"); TX(c, "infrared", x + lx(1300) * w, y - 5, "#ff9a8a", "center", "10.5px"); }
  else for (const l of [400, 500, 600, 700]) TX(c, l + " nm", x + pos(l) * w, y + h + 13, "#8fa0bf", "center", "10px");
}
function draw(dt) {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#070b16"; c.fillRect(0, 0, w, h); const adv = ui.level === "adv";
  const lines = Object.entries(seen).map(([k, v]) => [+k, Math.min(1, v / 6)]);
  if (P.view === "atom") {
    // the atom (not to scale: radius ∝ n)
    const ax = w * 0.22, ay = h * 0.4, R = Math.min(w * 0.2, h * 0.36);
    for (let n = 1; n <= 8; n++) { c.strokeStyle = "rgba(255,255,255,.12)"; c.beginPath(); c.arc(ax, ay, R * n / 8, 0, 6.3); c.stroke(); }
    c.fillStyle = "#ff6b81"; c.beginPath(); c.arc(ax, ay, 7, 0, 6.3); c.fill();
    if (P.el === "H") { const an = T * 3 / level; c.fillStyle = "#5ad1ff"; c.beginPath(); c.arc(ax + R * level / 8 * Math.cos(an), ay + R * level / 8 * Math.sin(an), 5, 0, 6.3); c.fill(); }
    for (const p of photons) { const x = ax + p.r * Math.cos(p.a), y = ay + p.r * Math.sin(p.a); c.strokeStyle = p.abs ? "rgba(255,255,255,.4)" : lamCol(p.l); c.lineWidth = 2; c.beginPath(); for (let k = 0; k < 18; k++) { const rr = p.r - k * 1.5, px = ax + rr * Math.cos(p.a) - Math.sin(p.a) * 4 * Math.sin(k * 1.2), py = ay + rr * Math.sin(p.a) + Math.cos(p.a) * 4 * Math.sin(k * 1.2); k ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke(); c.lineWidth = 1; }
    TX(c, `${ELEMENTS[P.el].name}: ${P.mode === "emission" ? "discharge tube" : "white light through the gas"}`, 14, 22, "#eef2f8", "left", "600 14px"); TX(c, "atom not to scale", 14, h * 0.4 + R + 18, "#7d8aa5", "left", "10.5px");
    // energy level diagram (hydrogen) or line energies
    const ex = w * 0.47, ew = w * 0.5, ey0 = 44, ey1 = h * 0.6, Ey = E => ey0 + (ey1 - ey0) * (1 - Math.sqrt(-E / 13.6));
    if (P.el === "H") {
      for (let n = 1; n <= 8; n++) { c.strokeStyle = n === level ? "#5ad1ff" : "rgba(255,255,255,.5)"; c.beginPath(); c.moveTo(ex, Ey(EH(n))); c.lineTo(ex + ew * 0.62, Ey(EH(n))); c.stroke(); if (n <= 5 || n === 8) TX(c, `n = ${n}: ${EH(n).toFixed(2)} eV`, ex + ew * 0.64, Ey(EH(n)) + 4, "#aab6cc", "left", "11px"); }
      c.setLineDash([4, 4]); c.strokeStyle = "#7ee787"; c.beginPath(); c.moveTo(ex, ey0); c.lineTo(ex + ew * 0.62, ey0); c.stroke(); c.setLineDash([]); TX(c, "0 eV: ionised", ex + ew * 0.64, ey0 + 4, "#7ee787", "left", "11px");
      const L = hLines(P.series); L.forEach((q, i) => { const x = ex + 10 + (ew * 0.58) * (i + 0.5) / L.length; c.strokeStyle = lamCol(q.l, 0.7); c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, Ey(EH(q.ni))); c.lineTo(x, Ey(EH(q.nf)) - 4); c.stroke(); c.lineWidth = 1; });
      const mx = ex + ew * 0.55; c.strokeStyle = "#ffd166"; c.lineWidth = 3; c.beginPath(); c.moveTo(mx, Ey(EH(P.ni))); c.lineTo(mx, Ey(EH(P.nf)) - 6); c.stroke(); c.lineWidth = 1; c.fillStyle = "#ffd166"; c.beginPath(); c.moveTo(mx, Ey(EH(P.nf))); c.lineTo(mx - 6, Ey(EH(P.nf)) - 10); c.lineTo(mx + 6, Ey(EH(P.nf)) - 10); c.fill();
      TX(c, `your jump ${P.ni} → ${P.nf}: ΔE = ${(EH(P.ni) - EH(P.nf)).toFixed(2)} eV, λ = ${lamH(P.ni, P.nf).toFixed(0)} nm`, ex, h * 0.6 + 26, "#ffd166", "left", "600 12px");
    } else { TX(c, `${ELEMENTS[P.el].name} lines: photon energy ΔE = hc ÷ λ`, ex, 30, "#eef2f8", "left", "600 12.5px"); ELEMENTS[P.el].lines.forEach((l, i) => { const y = 50 + i * Math.min(22, (h * 0.6 - 50) / ELEMENTS[P.el].lines.length); c.fillStyle = lamCol(l); c.fillRect(ex, y - 8, 20, 10); TX(c, `${l} nm → ${(HC / l).toFixed(2)} eV (${region(l)})`, ex + 28, y + 1, "#cfd8ea", "left", "11.5px"); }); }
    // spectra
    strip(c, 20, h * 0.76, w - 40, 22, lines, P.mode, true); strip(c, 20, h * 0.89, w - 40, 22, lines, P.mode, false);
    TX(c, "spectroscope view (visible part)", 20, h * 0.89 - 5, "#8fa0bf", "left", "10.5px");
  } else if (P.view === "grating") {
    const l = P.el === "H" ? lamH(P.ni, P.nf) : ELEMENTS[P.el].lines[0], d = 1e6 / P.N, s = l / d, th = s < 1 ? Math.asin(s) : NaN, cx = w * 0.15, cy = h * 0.5, L = w * 0.7;
    c.fillStyle = "#3a4a6b"; c.fillRect(cx - 4, cy - 80, 8, 160); TX(c, `grating: ${P.N} lines/mm, d = ${d.toFixed(0)} nm`, cx - 10, cy - 90, "#aab6cc", "left", "11.5px");
    c.strokeStyle = "#fff"; c.lineWidth = 3; c.beginPath(); c.moveTo(20, cy); c.lineTo(cx, cy); c.stroke(); c.lineWidth = 1; c.strokeStyle = "rgba(255,255,255,.3)"; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + L, cy); c.stroke(); TX(c, "zero order (white)", cx + L - 4, cy - 6, "#cfd8ea", "right", "11px");
    if (isFinite(th)) for (const sg of [1, -1]) { c.strokeStyle = lamCol(l); c.lineWidth = 3; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + L * Math.cos(th), cy - sg * L * Math.sin(th)); c.stroke(); c.lineWidth = 1; }
    if (isFinite(th)) { c.strokeStyle = "#ffd166"; c.beginPath(); c.arc(cx, cy, 70, -th, 0); c.stroke(); TX(c, `θ = ${(th * 180 / Math.PI).toFixed(2)}°`, cx + 76, cy - 10, "#ffd166", "left", "600 13px"); }
    TX(c, `First order: d sin θ = λ → λ = ${d.toFixed(0)} × sin ${isFinite(th) ? (th * 180 / Math.PI).toFixed(2) : "–"}° = ${l.toFixed(1)} nm`, 20, 28, "#eef2f8", "left", "600 14px");
    TX(c, `Readings so far: ${gratingLog.map(q => q[1].toFixed(1)).slice(-8).join(", ") || "press 📏 Take a reading"}`, 20, h - 20, "#aab6cc", "left", "12px");
  } else {
    const L = laser(P.laserKind, P.pump), x0 = w * 0.1, lw = w * 0.35, Y = [h * 0.82, h * 0.6, h * 0.42, h * 0.2];
    const lvls = P.laserKind === 3 ? [["ground state = lower laser level", L.low, Y[0]], ["metastable upper laser level", L.up, Y[2]], ["pump band", 0.02, Y[3]]] : [["ground state", L.ground, Y[0]], ["lower laser level (empties fast)", L.low, Y[1]], ["metastable upper laser level", L.up, Y[2]], ["pump band", 0.02, Y[3]]];
    for (const [nm, f, y] of lvls) { c.strokeStyle = "#cfd8ea"; c.lineWidth = 2; c.beginPath(); c.moveTo(x0, y); c.lineTo(x0 + lw, y); c.stroke(); c.lineWidth = 1; c.fillStyle = "#5ad1ff"; const nd = Math.round(f * 40); for (let i = 0; i < nd; i++) { c.beginPath(); c.arc(x0 + 8 + (i % 20) * (lw - 16) / 19, y - 8 - Math.floor(i / 20) * 10, 3.5, 0, 6.3); c.fill(); } TX(c, `${nm}: ${(f * 100).toFixed(0)}%`, x0 + lw + 12, y + 4, "#aab6cc", "left", "12px"); }
    const arrow = (y1, y2, x, col, txt) => { c.strokeStyle = col; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y1); c.lineTo(x, y2); c.stroke(); c.lineWidth = 1; TX(c, txt, x + 6, (y1 + y2) / 2, col, "left", "11.5px"); };
    arrow(Y[0], Y[3], x0 - 30, "#7ee787", "pump"); arrow(Y[2], P.laserKind === 3 ? Y[0] : Y[1], x0 + lw * 0.5, "#ff6b81", "laser light");
    TX(c, L.inv ? "Population inversion: stimulated emission wins, the laser works" : "No population inversion: absorption wins, no laser beam", w * 0.1, 30, L.inv ? "#7ee787" : "#ff6b81", "left", "600 14px");
    if (L.inv) { c.strokeStyle = "#ff3b3b"; c.lineWidth = 6; c.beginPath(); c.moveTo(w * 0.62, h * 0.5); c.lineTo(w - 20, h * 0.5); c.stroke(); c.lineWidth = 1; }
  }
  if (!adv && P.view !== "atom") TX(c, "This view is A level: switch to Advanced", w - 14, h - 10, "#8fa0bf", "right", "11.5px");
}

// ---------------- Charts and readings ----------------
function charts() {
  const adv = ui.level === "adv"; chA.opts.xFmt = null; chB.opts.xFmt = null;
  if (P.view === "laser") {
    const pts3 = [], pts4 = []; for (let W = 0; W <= 3; W += 0.05) { const a = laser(3, W), b = laser(4, W); pts3.push([W, (a.up - a.low) * 100]); pts4.push([W, (b.up - b.low) * 100]); }
    chA.opts.title = "Inversion: upper − lower laser level"; chA.opts.xLabel = "pumping (× 1/lifetime)"; chA.opts.yLabel = "% of atoms"; chA.draw([{ pts: pts3, color: "#ff8a70", label: "3-level" }, { pts: pts4, color: "#7ee787", label: "4-level" }], { hlines: [{ y: 0, label: "inversion above this line" }], vlines: [{ x: P.pump, label: "now" }] });
    const Lp = laser(P.laserKind, P.pump); chB.opts.title = "Populations now"; chB.opts.xLabel = ""; chB.opts.yLabel = "% of atoms"; chB.opts.xFmt = whole(i => ["", "lower laser level", "upper laser level"][i] || ""); chB.draw([{ pts: [[1, Lp.low * 100]], type: "bars", w: 0.6, color: "#5ad1ff", label: "lower" }, { pts: [[2, Lp.up * 100]], type: "bars", w: 0.6, color: Lp.inv ? "#7ee787" : "#ff6b81", label: "upper" }], { yMin: 0, yMax: 100, xMin: 0.4, xMax: 2.6 });
  } else if (P.view === "grating") {
    const l = P.el === "H" ? lamH(P.ni, P.nf) : ELEMENTS[P.el].lines[0];
    chA.opts.title = "Your readings"; chA.opts.xLabel = "reading"; chA.opts.yLabel = "λ (nm)"; chA.draw([{ pts: gratingLog, type: "dots", r: 4, color: "#ffd166", label: "readings" }], { hlines: [{ y: l, label: "true " + l.toFixed(1) }] });
    const pts = []; for (let N = 100; N <= 1200; N += 50) { const d = 1e6 / N; if (l / d < 1) pts.push([N, Math.asin(l / d) * 180 / Math.PI]); }
    chB.opts.title = "Angle against grating lines per mm"; chB.opts.xLabel = "lines per mm"; chB.opts.yLabel = "θ (°)"; chB.draw([{ pts, color: lamCol(l), label: "first order" }], { yMin: 0 });
  } else {
    const L = P.el === "H" ? hLines("all", 12) : ELEMENTS[P.el].lines.map(l => ({ l, E: HC / l }));
    chA.opts.title = P.el === "H" ? "Photon energy of every line" : "Photon energies of the lines"; chA.opts.xLabel = "wavelength (nm, log scale)"; chA.opts.yLabel = "photon energy (eV)"; chA.opts.xFmt = v => { const l = 10 ** v; return [100, 200, 500, 1000, 2000].some(q => Math.abs(q - l) / q < 0.02) ? String(Math.round(l)) : ""; };
    chA.draw([{ pts: L.map(q => [Math.log10(q.l), q.E]), type: "dots", r: 3.5, color: "#ffd166", label: "lines" }, { pts: (() => { const p = []; for (let v = 1.9; v <= 3.4; v += 0.02) p.push([v, HC / 10 ** v]); return p; })(), color: "#56607a", dash: [5, 4], label: "E = hc ÷ λ" }], { xMin: 1.9, xMax: 3.4, yMin: 0, bands: [{ x0: Math.log10(380), x1: Math.log10(750), color: "rgba(255,255,255,.06)" }] });
    const counts = Object.entries(seen).map(([k, v]) => [+k, v]).sort((a, b) => a[0] - b[0]);
    chB.opts.title = "Photons seen so far"; chB.opts.xLabel = "wavelength (nm)"; chB.opts.yLabel = "number"; chB.draw(counts.length ? [{ pts: counts, type: "bars", w: 6, color: "#5ad1ff", label: P.mode === "emission" ? "emitted" : "absorbed" }] : [], { yMin: 0 });
  }
  const l = lamH(P.ni, P.nf), dE = EH(P.ni) - EH(P.nf); read.set("t", `${P.ni} → ${P.nf}`); read.set("E", `${dE.toFixed(2)} eV = ${(dE * 1.602e-19).toExponential(2)} J`); read.set("l", `${l.toFixed(1)} nm · ${(2.998e8 / (l * 1e-9)).toExponential(2)} Hz`); read.set("r", region(l));
  ui.hud(P.view === "laser" ? "A laser needs a population inversion" : P.view === "grating" ? "d sin θ = λ" : P.mode === "emission" ? "Each jump down gives out one photon: ΔE = hc ÷ λ" : "Only photons with exactly the right energy are absorbed");
}
let frame = 0;
ui.run(dt => {
  if (!(dt > 0)) return; T += dt; nextEvent -= dt * P.rate; if (nextEvent <= 0 && P.view === "atom") { event(); nextEvent = 1; }
  for (const p of photons) p.r += dt * 260; photons = photons.filter(p => p.r < Math.max(cv.w, cv.h));
}, dt => { draw(dt); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("Each jump down gives out one photon. Watch the lines build up in the spectrum.", 6000);
