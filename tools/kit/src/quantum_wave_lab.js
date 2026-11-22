/* =====================================================================
   QUANTUM WAVE LAB
   Solves the time-dependent Schrödinger equation on a 256 x 144 grid:
        i dψ/dt = -½ ∇²ψ + V ψ            (units with ħ = m = 1)
   ψ is a complex number in every cell: ψ = R + iI. Writing the equation
   out for the two parts gives a pair of real equations that leapfrog:
        dR/dt = +H I        dI/dt = -H R        where  H = -½∇² + V
   |ψ|² = R² + I² is the probability of finding the particle there.
   Tunnelling, diffraction and interference are not put in by hand.
   ===================================================================== */
const GW = 256, GH = 144, NC = GW * GH, DT = 0.2;
const energyOf = k => 1 - Math.cos(k);          // kinetic energy of a wave with wavenumber k on this grid (≈ k²/2)

class Psi {
  constructor() { this.R = new Float32Array(NC); this.I = new Float32Array(NC); this.V = new Float32Array(NC); this.wall = new Uint8Array(NC); this.damp = new Float32Array(NC); this.t = 0; this.screenX = GW - 24; this.acc = new Float64Array(GH); this.setEdges(true); }
  setEdges(absorb) { this.absorb = absorb; for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { const d = Math.min(x, y, GW - 1 - x, GH - 1 - y); this.damp[x + y * GW] = absorb && d < 14 ? 1 - 0.03 * ((14 - d) / 14) ** 2 : 1; } }
  // A Gaussian wave packet: a bell-shaped envelope multiplied by a plane wave e^(i k·r)
  packet(x0, y0, kx, ky, sx, sy) {
    const { R, I } = this; this.t = 0; this.acc.fill(0);
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { const i = x + y * GW, a = Math.exp(-((x - x0) ** 2) / (4 * sx * sx) - ((y - y0) ** 2) / (4 * sy * sy)), ph = kx * (x - x0) + ky * (y - y0); R[i] = this.wall[i] ? 0 : a * Math.cos(ph); I[i] = this.wall[i] ? 0 : a * Math.sin(ph); }
    this.half(I, R, -DT / 2); this.norm0 = this.total();
  }
  // add dt × H(src) to dst   (H = -½∇² + V)
  half(dst, src, dt) {
    const V = this.V, wall = this.wall;
    for (let y = 1; y < GH - 1; y++) { let i = 1 + y * GW; for (let x = 1; x < GW - 1; x++, i++) { if (wall[i]) continue; dst[i] += dt * (-0.5 * (src[i - 1] + src[i + 1] + src[i - GW] + src[i + GW] - 4 * src[i]) + V[i] * src[i]); } }
  }
  step() {
    const { R, I, damp } = this; this.half(R, I, DT); this.half(I, R, -DT); this.t += DT;
    if (this.absorb) for (let i = 0; i < NC; i++) if (damp[i] < 1) { R[i] *= damp[i]; I[i] *= damp[i]; }
    const xs = this.screenX; for (let y = 0; y < GH; y++) { const i = xs + y * GW; this.acc[y] += R[i] * R[i] + I[i] * I[i]; }   // probability arriving at the detector screen
  }
  total(x0 = 0, x1 = GW) { const { R, I } = this; let s = 0; for (let y = 0; y < GH; y++) for (let x = x0, i = x0 + y * GW; x < x1; x++, i++) s += R[i] * R[i] + I[i] * I[i]; return s; }
  clearV() { this.V.fill(0); this.wall.fill(0); }
  slits(x, n, w, sep) { for (let y = 0; y < GH; y++) { let open = false; for (let k = 0; k < n; k++) if (Math.abs(y + .5 - (GH / 2 + (k - (n - 1) / 2) * sep)) < w / 2) open = true; if (!open) for (let d = 0; d < 3; d++) this.wall[x + d + y * GW] = 1; } }
  // Born rule: pick a position at random, with probability proportional to the pattern that reached the screen
  hit(rand) { let tot = 0; for (const v of this.acc) tot += v; if (tot <= 0) return null; let u = rand() * tot; for (let y = 0; y < GH; y++) { u -= this.acc[y]; if (u <= 0) return y + rand(); } return GH - 1; }
}
// ---- One-dimensional solver, used by the batch run for tunnelling (same method, one row of 1400 cells) ----
function transmit1D(lambda, ratio, thick) {
  const N = 1400, k = 2 * Math.PI / lambda, E = energyOf(k), R = new Float32Array(N), I = new Float32Array(N), V = new Float32Array(N), s = 45, x0 = 420, b0 = 700;
  for (let x = b0; x < b0 + thick; x++) V[x] = ratio * E;
  for (let x = 0; x < N; x++) { const a = Math.exp(-((x - x0) ** 2) / (4 * s * s)); R[x] = a * Math.cos(k * (x - x0)); I[x] = a * Math.sin(k * (x - x0)); }
  const half = (d, q, dt) => { for (let x = 1; x < N - 1; x++) d[x] += dt * (-0.5 * (q[x - 1] + q[x + 1] - 2 * q[x]) + V[x] * q[x]); };
  half(I, R, -DT / 2); const steps = Math.round((560 / Math.sin(k)) / DT);
  for (let n = 0; n < steps; n++) { half(R, I, DT); half(I, R, -DT); }
  let l = 0, r = 0; for (let x = 0; x < N; x++) { const p = R[x] * R[x] + I[x] * I[x]; x < b0 + thick / 2 ? l += p : r += p; } return r / (l + r);
}
// Textbook result for a plane wave meeting a rectangular barrier (tunnelling when E < V)
function transmitTheory(lambda, ratio, a) {
  const k = 2 * Math.PI / lambda, E = k * k / 2, V = ratio * E; if (a <= 0 || V === 0) return 1;
  if (Math.abs(E - V) < 1e-9) return 1 / (1 + E * a * a / 2);
  if (E < V) { const kap = Math.sqrt(2 * (V - E)); return 1 / (1 + V * V * Math.sinh(kap * a) ** 2 / (4 * E * (V - E))); }
  const k2 = Math.sqrt(2 * (E - V)); return 1 / (1 + V * V * Math.sin(k2 * a) ** 2 / (4 * E * (E - V)));
}
const binomial = (r, n, p) => { let c = 0; for (let i = 0; i < n; i++) if (r() < p) c++; return c; };
// Headless 2-D run through slits; returns the object so hits can be sampled from its screen pattern
function slitRun(lambda, n, w, sep) { const q = new Psi(); q.slits(100, n, w, sep); q.packet(50, GH / 2, 2 * Math.PI / lambda, 0, 12, 60); const steps = Math.round(230 / Math.sin(2 * Math.PI / lambda) / DT); for (let i = 0; i < steps; i++) q.step(); return q; }
function fringe(hits) { // spacing between the central bright band and its neighbours, from a list of hit positions
  const h = new Array(GH).fill(0); for (const y of hits) h[Math.min(GH - 1, y | 0)]++;
  const box = q => q.map((v, i) => { let t = 0, m = 0; for (let k = -3; k <= 3; k++) if (q[i + k] != null) { t += q[i + k]; m++; } return t / m; }), s = box(box(box(h))), mx = Math.max(...s), pk = [];
  for (let i = 8; i < GH - 8; i++) if (s[i] > 0.25 * mx && s[i] >= s[i - 1] && s[i] > s[i + 1]) pk.push(i + (s[i - 1] - s[i + 1]) / (2 * (s[i - 1] - 2 * s[i] + s[i + 1]) || 1));
  if (pk.length < 2) return null; let c = 0; pk.forEach((v, k) => { if (Math.abs(v - GH / 2) < Math.abs(pk[c] - GH / 2)) c = k; });
  const d = []; if (c > 0) d.push(pk[c] - pk[c - 1]); if (c < pk.length - 1) d.push(pk[c + 1] - pk[c]); return K.mean(d);
}
function fringeTheory(lambda, d, D) { const pd = y => Math.hypot(D, y + d / 2) - Math.hypot(D, y - d / 2); let a = 0, b = 300; for (let k = 0; k < 50; k++) { const m = (a + b) / 2; pd(m) < lambda ? a = m : b = m; } return (a + b) / 2; }

// ---------------------------------------------------------------- page
const psi = new Psi(); let scene = "barrier", view = "phase", tool = "launch", speed = 10, hits = [], pattern = null, perShot = 1, autoFire = true, shotSteps = 0, splitX = 128, rand = K.rng(Date.now()), launch = null, last = null, gain = 1; const S = {};
const ui = K.app({
  title: "Quantum Wave Lab", subject: "Physics", home: "../../index.html", blurb: "The Schrödinger equation, live. Fire a particle at walls you draw: tunnelling, diffraction and one-dot-at-a-time interference.",
  reset: () => setScene(scene), step: () => psi.step(),
  missions: [
    { title: "A particle that is a wave", q: "One electron, moving right. The colours show the phase of its wave; brightness shows where it is likely to be found. Watch it travel. What happens to its size? Switch the view to <b>Probability</b>.", hint: "The packet spreads out as it goes: a blend of slightly different wavelengths, which travel at different speeds. A narrower starting packet spreads faster. Nothing is 'smeared out' physically: the wave tells you the odds of where a detector would find the particle.", setup: () => setScene("free") },
    { title: "Walking through walls", q: "The barrier is 1.5 times higher than the particle's energy. A ball would always bounce back. Predict what the wave does, then watch the left and right probabilities. Make the barrier thicker.", hint: "Part of the wave leaks through: the particle has a real chance of appearing on the far side. Inside the barrier the wave dies away exponentially, so each extra bit of thickness cuts the chance by the same factor. This is how the Sun fuses hydrogen, how flash memory is erased and how a scanning tunnelling microscope sees atoms.", setup: () => { S.ratio.set(1.5, true); S.thick.set(5, true); setScene("barrier"); } },
    { title: "Over the top, yet it bounces", q: "Now the particle has <b>more</b> energy than the barrier (height 0.7 E). A ball would always get over. Does all of the wave get through?", hint: "No: some is reflected even though there is energy to spare. Waves reflect wherever their speed changes abruptly, like light at a window. At certain thicknesses the reflections from the two faces cancel and almost everything gets through (a resonance): the same idea as anti-reflection coatings on lenses.", setup: () => { S.ratio.set(0.7, true); S.thick.set(10, true); setScene("barrier"); } },
    { title: "One particle, two slits", q: "Particles are sent one at a time. Each lands as a single dot on the screen (right). Predict the pattern after 200 dots: two stripes behind the slits, or something else? Then cover one slit with the Wall tool.", hint: "Many stripes: an interference pattern, built up dot by dot. Each particle's wave goes through both slits and interferes with itself; the dot appears at one place chosen at random with probability |ψ|². Block one slit and the stripes vanish. No single dot can show you the pattern, and no theory can say where the next dot will land.", setup: () => { setScene("double"); S.per.set(10, true); } },
    { title: "The uncertainty principle", q: "A single slit. Make it narrower and narrower. You are pinning down the particle's position more precisely as it passes through. What happens to its sideways spread afterwards?", hint: "The narrower the slit, the wider the wave fans out. Squeezing position (small Δy) forces a larger spread of sideways momentum (large Δp): Δy·Δp ≥ ħ/2. It is a property of waves, not a fault in our instruments.", setup: () => { S.sw.set(14, true); setScene("single"); S.per.set(10, true); } },
    { title: "Looking changes things", q: "Let the packet travel a little, then press <b>Measure position now</b>. What happens to the wave? Press it again a moment later.", hint: "A measurement finds the particle at one place (chosen at random according to |ψ|²), and the wave collapses to a tight packet there. Because it is now very localised, its momentum is very uncertain and it spreads rapidly in all directions: measuring position has disturbed the motion.", setup: () => { setScene("free"); S.auto.set(false, true); } },
    { title: "A quantum orbit", q: "A particle in a bowl-shaped (harmonic) potential, launched sideways. How does the packet move? Then try the hard-walled circular 'corral': what becomes of the neat packet?", hint: "In the bowl the packet circles like a planet without spreading: the closest quantum mechanics comes to a classical orbit. In the corral it bounces, overlaps itself and fills the space with standing-wave ripples, like the electron ripples seen inside real corrals of atoms built with a tunnelling microscope.", setup: () => setScene("well") },
  ],
  batch: [
    { title: "Tunnelling and thickness", question: "How does the chance of tunnelling fall as the barrier gets thicker?", how: "Barrier height 1.5 E, wavelength 12 cells. For each thickness the wave equation gives the probability, then 200 particles are sent: result = % detected on the far side.", xLabel: "barrier thickness (cells)", yLabel: "particles that tunnel through (%)", xs: [1, 2, 3, 4, 6, 8, 10], reps: 6, yMin: 0,
      theory: a => transmitTheory(12, 1.5, a) * 100, theoryLabel: "plane-wave formula", run: (a, r) => binomial(r, 200, transmit1D(12, 1.5, a)) / 2, note: "The wave gives only a probability. Each particle either gets through or does not, so out of 200 the count varies from run to run, as in any real tunnelling experiment. This randomness is not a lack of knowledge: it is how nature works." },
    { title: "Tunnelling and energy", question: "How does transmission depend on the particle's energy compared with the barrier?", how: "The barrier is 6 cells thick. Its height is set as a multiple of the particle's energy; x is energy ÷ barrier height. 200 particles per run.", xLabel: "particle energy ÷ barrier height", yLabel: "particles transmitted (%)", xs: [0.4, 0.6, 0.8, 1, 1.25, 1.6, 2, 3], reps: 6, yMin: 0, yMax: 105,
      theory: x => transmitTheory(12, 1 / x, 6) * 100, theoryLabel: "plane-wave formula", run: (x, r) => binomial(r, 200, transmit1D(12, 1 / x, 6)) / 2, note: "Classically the graph would be a step: 0% below 1, 100% above. The quantum curve is smooth: some tunnelling below, some reflection above. The packet is a blend of energies, so it smooths the theory curve slightly." },
    { title: "Double slit: fringe spacing", question: "Do matter waves obey the same fringe rule as light?", how: "Slits 30 cells apart, screen 132 cells beyond. 1500 particles are detected one by one and the stripe spacing measured from the dots.", xLabel: "de Broglie wavelength (cells)", yLabel: "fringe spacing (cells)", xs: [7, 8, 9, 10, 11, 12], reps: 3,
      theory: l => fringeTheory(l, 30, 132), theoryLabel: "path difference = λ", run: (l, r) => { const q = slitRun(l, 2, 6, 30), h = []; for (let i = 0; i < 1500; i++) h.push(q.hit(r)); return fringe(h); }, note: "The pattern is built from individual random hits, so the stripe positions are only known as well as the dots allow: more particles, sharper answer. Wavelength λ = h/p: slower particles have longer waves and wider fringes." },
    { title: "Uncertainty at a slit", question: "Does squeezing a particle through a narrower gap make it spread more?", how: "Single slit, wavelength 10 cells. 600 particles per run; result = standard deviation of where they land on the screen.", xLabel: "slit width (cells)", yLabel: "spread of hits on the screen (cells)", xs: [4, 6, 8, 12, 16, 24], reps: 3, yMin: 0,
      run: (w, r) => { const q = slitRun(10, 1, w, 0), h = []; for (let i = 0; i < 600; i++) h.push(q.hit(r)); return K.sd(h); }, note: "A narrow slit fixes the sideways position tightly, so the sideways momentum becomes uncertain and the hits spread out. For very wide slits the spread is set by the slit itself, so the curve turns back up: there is a width that gives the smallest spot." },
  ],
  notes: `<h3>What is being calculated</h3><p>The wavefunction ψ = R + iI lives on a 256 × 144 grid. Each step (0.2 time units) the real and imaginary parts update each other through <code>dR/dt = HI</code>, <code>dI/dt = −HR</code> with <code>H = −½∇² + V</code>: the time-dependent Schrödinger equation with ħ = m = 1.</p>
  <h3>Reading the picture</h3><ul><li><b>Phase colours</b>: hue = phase of ψ (the rainbow stripes are wave crests, one wavelength per cycle of colour), brightness = |ψ|.</li><li><b>Probability</b>: brightness = |ψ|², the chance of finding the particle there.</li><li>Grey = impenetrable wall. Blue tint = barrier (V &gt; 0). Green tint = well (V &lt; 0).</li><li>The strip on the right is a detector screen. Each dot is one particle, placed at random according to the wave that arrived (the Born rule).</li></ul>
  <h3>Assumptions and simplifications</h3><ul><li>One particle, two dimensions, no spin, no relativity.</li><li>Units are scaled: lengths in grid cells, ħ = m = 1. For an electron with a 1 nm wavelength, one cell would be about 0.08 nm.</li><li>Brightness rescales itself so faint parts of the wave stay visible; use the probability tiles for actual amounts.</li><li>Waves are absorbed at the edges (so the particle can leave) unless you choose reflecting edges.</li><li>"Measurement" is modelled as an instant collapse to a small packet: the standard textbook rule, which the equation itself does not explain.</li><li>The grid makes very short wavelengths (below about 8 cells) slightly inaccurate.</li></ul>
  <h3>Useful equations</h3><p><code>λ = h/p</code> &nbsp; <code>E = p²/2m</code> &nbsp; <code>P = |ψ|²</code> &nbsp; <code>Δx·Δp ≥ ħ/2</code> &nbsp; <code>T ≈ e^(−2κa)</code>, <code>κ = √(2m(V−E))/ħ</code></p>`,
});
let g = ui.group("Experiment");
S.scene = K.seg(g, { value: scene, options: [["free", "Free particle"], ["barrier", "Barrier"], ["step", "Step"], ["double", "Double slit"], ["single", "Single slit"], ["well", "Bowl"], ["corral", "Corral"], ["blank", "Blank"]], on: setScene });
const rf = K.row(g); K.btn(rf, "⚛ Fire a particle", () => fire(), "primary"); K.btn(rf, "👁 Measure position now", () => measure());
g = ui.group("The particle");
S.lam = K.slider(g, { label: "Wavelength (sets momentum and energy)", min: 8, max: 30, step: 0.5, value: 12, fmt: v => `${v} cells · E = ${energyOf(2 * Math.PI / v).toFixed(3)}`, on: () => setScene(scene, true) });
S.size = K.slider(g, { label: "Packet length", min: 5, max: 30, step: 1, value: 14, unit: "cells", on: () => setScene(scene, true) });
g = ui.group("Barrier and slits");
S.ratio = K.slider(g, { label: "Barrier height", min: 0, max: 3, step: 0.05, value: 1.5, fmt: v => v.toFixed(2) + " × particle energy" + (v > 1 ? " · tunnelling" : ""), on: () => setScene(scene, true) });
S.thick = K.slider(g, { label: "Barrier thickness", min: 1, max: 30, step: 1, value: 5, unit: "cells", on: () => setScene(scene, true) });
S.sw = K.slider(g, { label: "Slit width", min: 3, max: 40, step: 1, value: 6, unit: "cells", on: () => setScene(scene, true) });
S.sep = K.slider(g, { label: "Slit separation", min: 14, max: 60, step: 1, value: 30, unit: "cells", on: () => setScene(scene, true) });
g = ui.group("Draw your own");
S.tool = K.seg(g, { value: tool, options: [["launch", "➹ Launch"], ["wall", "▬ Wall"], ["bar", "▒ Barrier"], ["erase", "⌫ Erase"]], on: v => { tool = v; ui.tip({ launch: "Drag on the picture: the particle starts where you press and flies the way you drag", wall: "Drag to draw an impenetrable wall", bar: "Drag to paint a barrier of the chosen height", erase: "Drag to rub out walls and barriers" }[v], 4500); } });
g = ui.group("Detector screen");
S.auto = K.toggle(g, { label: "Keep firing particles one after another", value: true, on: v => autoFire = v });
S.per = K.seg(g, { label: "Dots added per shot", value: 1, options: [[1, "1"], [10, "10"], [100, "100"]], on: v => perShot = v, tip: "Every particle has the same wave, so one calculation can be reused for several particles." });
K.btn(K.row(g), "Wipe the screen", () => { hits = []; });
g = ui.group("View");
S.view = K.seg(g, { value: view, options: [["phase", "Phase colours"], ["prob", "Probability"], ["real", "Real part"]], on: v => view = v });
S.speed = K.slider(g, { label: "Speed", min: 2, max: 30, step: 2, value: 10, fmt: v => v + " steps per frame", on: v => speed = v });
ui.headerSpeed(S.speed);   // playback speed lives in the header, beside Pause and Reset
S.edges = K.toggle(g, { label: "Absorbing edges (off = a closed box)", value: true, on: v => psi.setEdges(v) });
g = ui.group("Where is the particle?");
const read = K.readout(g, [["pl", "Left of the dashed line"], ["pr", "Right of the dashed line"], ["out", "Left the picture"], ["n", "Dots on the screen"]]);

let shot = null;   // how the current scene launches its particle
function setScene(s, keepHits) {
  scene = s; S.scene.set(s); psi.clearV(); if (!keepHits) hits = []; pattern = null; const lam = S.lam.value, k = 2 * Math.PI / lam, E = energyOf(k), sz = S.size.value; splitX = 128; psi.screenX = GW - 24; psi.setEdges(S.edges.value);
  shot = () => psi.packet(60, GH / 2, k, 0, sz, sz);
  if (s === "barrier") { const a = S.thick.value; for (let y = 0; y < GH; y++) for (let x = 128; x < 128 + a; x++) psi.V[x + y * GW] = S.ratio.value * E; splitX = 128 + Math.round(a / 2); shot = () => psi.packet(62, GH / 2, k, 0, sz, 34); }
  if (s === "step") { for (let y = 0; y < GH; y++) for (let x = 128; x < GW; x++) psi.V[x + y * GW] = S.ratio.value * E; shot = () => psi.packet(62, GH / 2, k, 0, sz, 34); }
  if (s === "double" || s === "single") { psi.slits(100, s === "double" ? 2 : 1, S.sw.value, S.sep.value); splitX = 101; shot = () => psi.packet(50, GH / 2, k, 0, Math.min(sz, 14), 60); }
  if (s === "well") { const w = 0.0125; for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) psi.V[x + y * GW] = Math.min(0.9, 0.5 * w * w * ((x - 128) ** 2 + (y - 72) ** 2)); psi.setEdges(false); shot = () => psi.packet(128 - 40, 72, 0, -Math.asin(Math.min(0.9, w * 40)), 1 / Math.sqrt(2 * w), 1 / Math.sqrt(2 * w)); }
  if (s === "corral") { for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { const r = Math.hypot(x - 128, y - 72); if (r > 62 && r < 66) psi.wall[x + y * GW] = 1; } shot = () => psi.packet(100, 60, k, k * 0.35, 7, 7); }
  if (s === "blank") shot = () => psi.packet(60, GH / 2, k, 0, sz, sz);
  fire();
}
function fire() { shot(); shotSteps = 0; }
function endShot() { // the shot is over: the particle is detected somewhere on the screen
  let tot = 0; for (const v of psi.acc) tot += v; if (tot > 1e-9) { pattern = Array.from(psi.acc, v => v / tot); for (let i = 0; i < perShot; i++) { const y = psi.hit(rand); if (y != null) hits.push([y, rand()]); } if (hits.length > 6000) hits.splice(0, hits.length - 6000); }
  if (autoFire) fire();
}
function measure() { // collapse: choose a cell with probability |ψ|², then restart the wave as a tight packet there
  const { R, I } = psi; let tot = psi.total(), u = rand() * tot, at = 0; for (let i = 0; i < NC; i++) { u -= R[i] * R[i] + I[i] * I[i]; if (u <= 0) { at = i; break; } }
  const x = at % GW, y = at / GW | 0; flash = { x, y, t: 1 }; psi.packet(x, y, 0, 0, 3, 3); shotSteps = -4000;
}
// ---- Drawing ----
const img = document.createElement("canvas"); img.width = GW; img.height = GH; const ictx = img.getContext("2d"), idata = ictx.createImageData(GW, GH), px = idata.data;
const cv = ui.canvas(); let vr = { s: 1, ox: 0, oy: 0 }, flash = null;
const HUE = new Uint8Array(256 * 3); for (let h = 0; h < 256; h++) { const a = h / 256 * 6, f = a % 1, q = [[1, f, 0], [1 - f, 1, 0], [0, 1, f], [0, 1 - f, 1], [f, 0, 1], [1, 0, 1 - f]][a | 0]; HUE[h * 3] = q[0] * 255; HUE[h * 3 + 1] = q[1] * 255; HUE[h * 3 + 2] = q[2] * 255; }
function paint() {
  const { R, I, V, wall } = psi; let mx = 1e-9; for (let i = 0; i < NC; i += 3) { const d = R[i] * R[i] + I[i] * I[i]; if (d > mx) mx = d; } gain += (1 / mx - gain) * 0.15;
  for (let i = 0, j = 0; i < NC; i++, j += 4) {
    let r, g2, b;
    if (wall[i]) { r = 150; g2 = 158; b = 172; }
    else {
      const re = R[i], im = I[i], d = (re * re + im * im) * gain, a = d > 1 ? 1 : d;
      if (view === "phase") { const br = Math.sqrt(a), h = ((Math.atan2(im, re) / 6.2831853 + 1) * 256 | 0) & 255; r = HUE[h * 3] * br; g2 = HUE[h * 3 + 1] * br; b = HUE[h * 3 + 2] * br; }
      else if (view === "prob") { const q = Math.sqrt(a); r = 255 * Math.min(1, q * 1.8); g2 = 255 * Math.max(0, Math.min(1, q * 1.9 - .6)); b = 255 * (q < .35 ? q * 1.6 : Math.max(0, .56 - (q - .35) * 1.5) + Math.max(0, (q - .82) * 5)); }
      else { const v = re * Math.sqrt(gain); r = v > 0 ? 255 * Math.min(1, v) : 0; b = v < 0 ? 255 * Math.min(1, -v) : 0; g2 = 40 * Math.min(1, Math.abs(v)); }
      if (V[i] > 0) { const t = Math.min(1, V[i] * 2.2); r += 26 * t; g2 += 44 * t + 8; b += 95 * t + 22; } else if (V[i] < 0) { g2 += 40; }
    }
    px[j] = r; px[j + 1] = g2; px[j + 2] = b; px[j + 3] = 255;
  }
  ictx.putImageData(idata, 0, 0);
  const c = cv.ctx, strip = 70, s = Math.min((cv.w - strip) / GW, cv.h / GH), ox = (cv.w - strip - GW * s) / 2, oy = (cv.h - GH * s) / 2; vr = { s, ox, oy };
  c.fillStyle = "#03050b"; c.fillRect(0, 0, cv.w, cv.h); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = "high"; c.drawImage(img, ox, oy, GW * s, GH * s);
  const X = x => ox + x * s, Y = y => oy + y * s;
  c.setLineDash([5, 5]); c.strokeStyle = "rgba(255,255,255,.4)"; c.lineWidth = 1; c.beginPath(); c.moveTo(X(splitX), oy); c.lineTo(X(splitX), oy + GH * s); c.stroke();
  c.strokeStyle = "rgba(126,231,135,.8)"; c.beginPath(); c.moveTo(X(psi.screenX), oy); c.lineTo(X(psi.screenX), oy + GH * s); c.stroke(); c.setLineDash([]);
  // the detector screen: one dot per particle
  const sx0 = ox + GW * s + 8; c.fillStyle = "#0a1410"; c.fillRect(sx0, oy, strip - 14, GH * s); c.strokeStyle = "#2c5a3c"; c.strokeRect(sx0 + .5, oy + .5, strip - 14, GH * s);
  c.fillStyle = "rgba(160,255,180,.85)"; for (const [y, u] of hits) c.fillRect(sx0 + 3 + u * (strip - 22), Y(y) - 1, 2, 2);
  c.font = "600 11px Segoe UI,sans-serif"; c.fillStyle = "#7ee787"; c.textAlign = "center"; c.fillText("SCREEN", sx0 + (strip - 14) / 2, oy - 5 > 10 ? oy - 5 : oy + 12);
  if (launch) { c.strokeStyle = "#fff"; c.lineWidth = 2; c.beginPath(); c.moveTo(launch.x0, launch.y0); c.lineTo(launch.x1, launch.y1); c.stroke(); c.beginPath(); c.arc(launch.x0, launch.y0, 6, 0, 6.3); c.stroke(); }
  if (flash) { c.strokeStyle = `rgba(255,255,255,${flash.t})`; c.lineWidth = 3; c.beginPath(); c.arc(X(flash.x), Y(flash.y), 6 + (1 - flash.t) * 50, 0, 6.3); c.stroke(); c.fillStyle = `rgba(255,255,255,${flash.t})`; c.font = "600 13px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillText("found here!", X(flash.x) + 12, Y(flash.y) - 10); flash.t -= 0.02; if (flash.t <= 0) flash = null; }
}
const toGrid = p => ({ x: (p.x - vr.ox) / vr.s, y: (p.y - vr.oy) / vr.s });
function brush(q, rad, fn) { for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) { const x = Math.round(q.x + dx), y = Math.round(q.y + dy); if (dx * dx + dy * dy <= rad * rad + 1 && x > 0 && y > 0 && x < GW - 1 && y < GH - 1) fn(x + y * GW); } }
function strokeTo(a, b) { const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y))), E = energyOf(2 * Math.PI / S.lam.value); for (let k = 0; k <= n; k++) { const q = { x: a.x + (b.x - a.x) * k / n, y: a.y + (b.y - a.y) * k / n };
  if (tool === "wall") brush(q, 1, i => { psi.wall[i] = 1; psi.R[i] = psi.I[i] = 0; }); if (tool === "bar") brush(q, 3, i => psi.V[i] = S.ratio.value * E); if (tool === "erase") brush(q, 5, i => { psi.wall[i] = 0; psi.V[i] = 0; }); } }
K.pointer(cv.el, {
  down(p) { if (tool === "launch") launch = { x0: p.x, y0: p.y, x1: p.x, y1: p.y }; else { last = toGrid(p); strokeTo(last, last); } },
  drag(p) { if (launch) { launch.x1 = p.x; launch.y1 = p.y; } else if (last) { const q = toGrid(p); strokeTo(last, q); last = q; } },
  up() { if (launch) { const a = toGrid({ x: launch.x0, y: launch.y0 }), dx = launch.x1 - launch.x0, dy = launch.y1 - launch.y0, len = Math.hypot(dx, dy), k = 2 * Math.PI / S.lam.value, sz = S.size.value;
      if (len > 8) { shot = () => psi.packet(K.clamp(a.x, 20, GW - 40), K.clamp(a.y, 16, GH - 16), k * dx / len, k * dy / len, sz, sz); fire(); } launch = null; } last = null; },
});
cv.el.style.cursor = "crosshair";
const chS = K.chart(ui.dock, { title: "Slice along the centre line", xLabel: "position x (cells)", yLabel: "probability density", yMin: 0, xMin: 0, xMax: GW });
const chH = K.chart(ui.dock, { title: "Where the particles landed", xLabel: "position on the screen y (cells)", yLabel: "dots", yMin: 0, xMin: 0, xMax: GH });
let frame = 0;
ui.run(() => {
  for (let k = 0; k < speed; k++) psi.step(); shotSteps += speed;
  // a shot ends when nearly all of the wave has left, or after a long time (closed boxes never empty)
  if (psi.absorb && shotSteps > 300 && (psi.total() < 0.03 * psi.norm0 || shotSteps > 5200)) endShot();
}, () => {
  paint(); if (frame++ % 3) return;
  const y0 = GH / 2 | 0, sl = [], vl = []; let mx = 1e-9; for (let x = 0; x < GW; x++) { const i = x + y0 * GW, d = psi.R[i] ** 2 + psi.I[i] ** 2; sl.push([x, d]); if (d > mx) mx = d; }
  let vm = 1e-9; for (let x = 0; x < GW; x++) vm = Math.max(vm, psi.V[x + y0 * GW]); for (let x = 0; x < GW; x++) vl.push([x, psi.wall[x + y0 * GW] ? mx : psi.V[x + y0 * GW] / Math.max(vm, energyOf(2 * Math.PI / S.lam.value) * 1.5) * mx * 0.9]);
  chS.draw([{ pts: vl, type: "area", color: K.cssVar("--s4"), label: "barrier / wall (not to scale)" }, { pts: sl, type: "area", color: K.cssVar("--s0"), label: "|ψ|²" }]);
  const h = K.histogram(hits.map(q => q[0]), 48, 0, GH), ser = [{ pts: h.pts, w: h.w, type: "bars", color: K.cssVar("--s2"), label: "dots" }];
  if (pattern && hits.length) ser.push({ pts: pattern.map((v, y) => [y + .5, v * hits.length * h.w]), color: K.cssVar("--s3"), label: "wave's prediction |ψ|²", width: 2 });
  chH.draw(ser);
  const n0 = psi.norm0 || 1, pl = psi.total(0, splitX) / n0, pr = psi.total(splitX, GW) / n0; read.set("pl", (pl * 100).toFixed(1) + "%"); read.set("pr", (pr * 100).toFixed(1) + "%"); read.set("out", (Math.max(0, 1 - pl - pr) * 100).toFixed(1) + "%"); read.set("n", hits.length);
});
setScene("barrier");
ui.tip("A particle meets a barrier taller than its energy. Some of the wave gets through anyway.", 8000);
