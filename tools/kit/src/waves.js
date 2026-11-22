/* =====================================================================
   RIPPLE TANK
   A real wave simulation: the water surface is a grid of 320 x 180 cells
   (1 cell = 1 mm) and every cell obeys the 2-D wave equation
        d²u/dt² = c² (d²u/dx² + d²u/dy²)
   Nothing about interference, diffraction, refraction or reflection is
   "programmed in": they all emerge from that one rule.
   ===================================================================== */
const GW = 320, GH = 180, NC = GW * GH;
const CW = 0.5;            // wave speed in cells per time step (0.5 mm per ms = 0.5 m/s, like shallow water)
const C2 = CW * CW;

class Tank {
  constructor() {
    this.u = new Float32Array(NC); this.up = new Float32Array(NC); this.un = new Float32Array(NC); // height now, one step ago, next
    this.c2 = new Float32Array(NC).fill(C2);   // (wave speed)² in each cell: lower inside "glass" (shallow water)
    this.damp = new Float32Array(NC);          // energy absorbed at the edges so waves do not bounce back
    this.wall = new Uint8Array(NC); this.drawn = new Uint8Array(NC); this.glass = new Uint8Array(NC);
    this.inten = new Float32Array(NC);         // time-averaged u² (what a detector or your eye would record)
    this.sources = []; this.plane = false; this.lambda = 16; this.amp = 1; this.mach = 0; this.n = 1.5; this.t = 0;
    this.slits = { n: 0, w: 8, sep: 40, x: 90 };
    this.setEdges(true);
  }
  setEdges(absorb) {
    this.absorb = absorb;
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      const d = Math.min(x, y, GW - 1 - x, GH - 1 - y);
      this.damp[x + y * GW] = absorb && d < 16 ? 0.14 * ((16 - d) / 16) ** 2 : 0.0006;
    }
  }
  // Build the wall map: anything drawn by hand, plus the barrier with its slits
  rebuild() {
    const s = this.slits; this.wall.set(this.drawn);
    if (s.n > 0) for (let y = 0; y < GH; y++) {
      let open = false;
      for (let k = 0; k < s.n; k++) { const cy = GH / 2 + (k - (s.n - 1) / 2) * s.sep; if (Math.abs(y + .5 - cy) < s.w / 2) open = true; }
      if (!open) for (let x = s.x - 1; x <= s.x + 1; x++) this.wall[x + y * GW] = 1;
    }
    const g = C2 / (this.n * this.n);   // light (or water waves) travel n times slower inside the glass
    for (let i = 0; i < NC; i++) this.c2[i] = this.glass[i] ? g : C2;
  }
  calm() { this.u.fill(0); this.up.fill(0); this.inten.fill(0); this.t = 0; }
  step() {
    const { u, up, un, c2, damp, wall } = this; this.t++;
    // 1. Drive the sources: each one pushes the water up and down sinusoidally
    const ramp = Math.min(1, this.t / (2 * this.lambda / CW));
    if (this.plane) { const a = 0.11 * this.amp * ramp * Math.sin(2 * Math.PI * CW / this.lambda * this.t); for (let y = 1; y < GH - 1; y++) u[18 + y * GW] += a; }
    for (const s of this.sources) {
      const lam = s.lambda || this.lambda; s.ph = (s.ph || 0) + 2 * Math.PI * CW / lam;
      if (this.mach && !s.fixed) { s.x += this.mach * CW; if (s.x > GW - 20) { s.x = 20; } }
      const xi = Math.round(s.x), yi = Math.round(s.y); if (xi > 1 && xi < GW - 2 && yi > 1 && yi < GH - 2) u[xi + yi * GW] += 0.9 * (s.amp || this.amp) * Math.sin(s.ph);
    }
    // 2. The wave equation: a cell accelerates towards the average height of its four neighbours
    for (let y = 1; y < GH - 1; y++) {
      let i = 1 + y * GW;
      for (let x = 1; x < GW - 1; x++, i++) {
        if (wall[i]) { un[i] = 0; continue; }
        const lap = u[i - 1] + u[i + 1] + u[i - GW] + u[i + GW] - 4 * u[i];
        un[i] = u[i] + (u[i] - up[i]) * (1 - damp[i]) + c2[i] * lap;
      }
    }
    this.up = u; this.u = un; this.un = up;
    // 3. Running average of u² = intensity (brightness of the pattern)
    const I = this.inten, v = this.u; for (let i = 0; i < NC; i++) I[i] += (v[i] * v[i] - I[i]) * 0.012;
  }
  screen(x) { const p = new Array(GH); for (let y = 0; y < GH; y++) p[y] = this.inten[x + y * GW]; return p; }
}

// Spacing between the central bright fringe and its neighbours on the screen (mm)
function fringeSpacing(p) {
  // smooth twice with a 9 mm window so small bumps are not mistaken for fringes
  const box = q => q.map((v, i) => { let t = 0, n = 0; for (let k = -4; k <= 4; k++) if (q[i + k] != null) { t += q[i + k]; n++; } return t / n; });
  const s = box(box(p)), mx = Math.max(...s), pk = [];
  for (let i = 18; i < GH - 18; i++) if (s[i] > 0.3 * mx && s[i] >= s[i - 1] && s[i] > s[i + 1]) { // refine the peak position with a parabola
    const d = (s[i - 1] - s[i + 1]) / (2 * (s[i - 1] - 2 * s[i] + s[i + 1]) || 1); pk.push(i + d);
  }
  if (pk.length < 2) return null;
  let c = 0; pk.forEach((v, k) => { if (Math.abs(v - GH / 2) < Math.abs(pk[c] - GH / 2)) c = k; });
  const d = []; if (c > 0) d.push(pk[c] - pk[c - 1]); if (c < pk.length - 1) d.push(pk[c + 1] - pk[c]);
  return d.length ? K.mean(d) : null;
}
// Theory: bright fringes lie where the path difference from the two slits is a whole number of wavelengths.
function fringeTheory(lambda, d, D) { // first-order position, solved exactly (no small-angle approximation)
  const pd = y => Math.hypot(D, y + d / 2) - Math.hypot(D, y - d / 2); let a = 0, b = 400;
  for (let k = 0; k < 50; k++) { const m = (a + b) / 2; pd(m) < lambda ? a = m : b = m; } return (a + b) / 2;
}
// Mean spacing between wave crests along a row (mm): used to measure wavelength
function crestSpacing(tank, y, xa, xb) {
  const u = tank.u, z = []; for (let x = xa; x < xb; x++) { const a = u[x + y * GW], b = u[x + 1 + y * GW]; if (a < 0 && b >= 0) z.push(x + a / (a - b)); }
  return z.length > 1 ? (z[z.length - 1] - z[0]) / (z.length - 1) : null;
}

// ---------------------------------------------------------------- page
const tank = new Tank();
let view = "height", tool = "source", screenX = 290, probes = [{ x: 200, y: 60, h: [] }, { x: 200, y: 120, h: [] }], speed = 3, scene = "two";
const S = {};   // the sliders, so that scenes can set them

const ui = K.app({
  title: "Ripple Tank", subject: "Physics", blurb: "One wave equation: interference, diffraction, refraction, lenses and sonic booms all emerge from it.",
  reset: () => setScene(scene),
  step: () => tank.step(),
  missions: [
    { title: "Two sources", q: "Two dippers bob in step. Where is the water calm, and why? Switch the view to <b>Intensity</b> to see the pattern, then drag a source closer to the other.", hint: "Calm lines (nodal lines) are where a crest from one source always meets a trough from the other: path difference = ½λ, 1½λ… Moving the sources closer spreads the lines apart.", setup: () => setScene("two") },
    { title: "Young's double slit", q: "Predict first: if you <b>halve</b> the slit separation, what happens to the fringe spacing on the screen (right-hand chart)? Then test it. What about doubling the wavelength?", hint: "Fringe spacing ≈ λD/d. Halving d doubles the spacing; doubling λ doubles it too. Compare the measured and theory tiles.", setup: () => setScene("double") },
    { title: "Diffraction through a gap", q: "Make the gap much wider than the wavelength, then about the same size. When does the wave spread out the most?", hint: "Spreading is greatest when gap ≈ wavelength. A wide gap gives a beam with sharp shadows: that is why light (tiny λ) seems to travel in straight lines but sound bends round doorways.", setup: () => setScene("single") },
    { title: "Refraction", q: "The green region is glass (slower waves). Watch the wavefronts cross the boundary. What happens to the wavelength, the direction and the frequency? Probe A is in air, probe B in glass.", hint: "Wavelength shrinks by the factor n, the wave bends towards the normal, and frequency is unchanged: the two probe traces have the same period.", setup: () => setScene("refract") },
    { title: "Find the focus", q: "A convex lens is just glass that is thicker in the middle. Use Intensity view to find the focal point. Then change the refractive index: where does the focus move?", hint: "The middle of each wavefront is delayed the most, so the wavefront curves inward and converges. Larger n means more delay and a shorter focal length.", setup: () => { setScene("lens"); S.view.set("inten", true); } },
    { title: "Break the sound barrier", q: "The source is moving. Compare the wavelength in front of it and behind it. Now slide <b>Source speed</b> past 1.0× the wave speed. What forms?", hint: "In front, crests bunch up (higher pitch); behind, they spread. Above the wave speed the source outruns its own waves, which pile into a V-shaped shock: a sonic boom, or the bow wave of a boat.", setup: () => setScene("doppler") },
    { title: "Engineer's challenge", q: "Blank tank, plane waves. Using only the <b>Wall</b> and <b>Glass</b> tools, make the signal at probe A as large as you possibly can. What shapes work?", hint: "Try a curved (parabolic) wall behind the probe, a hand-drawn lens in front of it, or a wall with gaps spaced so that the waves through each gap arrive in step (a zone plate).", setup: () => { setScene("blank"); S.plane.set(true, true); S.tool.set("wall", true); } },
  ],
  batch: [
    { title: "Fringe spacing vs slit separation", question: "Does Young's fringe spacing follow λD/d?", how: "Plane waves (λ = 10 mm) pass two slits; the screen is 200 mm away. A few random stray ripples are added to every run.", xLabel: "slit separation d (mm)", yLabel: "fringe spacing (mm)", xs: [36, 40, 46, 52, 60, 70], reps: 3, theory: d => fringeTheory(10, d, 200), theoryLabel: "path difference = λ",
      run: (d, r) => slitRun(r, 10, d), note: "Stray ripples in the tank (random each run) shift the fringes slightly, and peaks can only be located to a fraction of a millimetre. Real ripple tanks are much noisier." },
    { title: "Fringe spacing vs wavelength", question: "Longer waves: wider or narrower fringes?", how: "Slit separation fixed at 40 mm, screen 200 mm away.", xLabel: "wavelength λ (mm)", yLabel: "fringe spacing (mm)", xs: [6, 7, 8, 9, 10, 11, 12], reps: 3, theory: l => fringeTheory(l, 40, 200), theoryLabel: "path difference = λ",
      run: (l, r) => slitRun(r, l, 40), note: "Stray ripples shift the peaks slightly. At long wavelengths the slits (8 mm wide) are no longer small compared with λ and the fringes are broad, so the peak is harder to pin down." },
    { title: "Wavelength inside glass", question: "How does the wavelength change in a slower medium?", how: "A plane wave (λ = 16 mm) enters a block with refractive index n; crest spacing is measured inside.", xLabel: "refractive index n", yLabel: "wavelength in block (mm)", xs: [1, 1.25, 1.5, 1.75, 2, 2.5], reps: 3, theory: n => 16 / n, theoryLabel: "λ / n",
      run: (n, r) => { const t = new Tank(); t.plane = true; t.lambda = 16; t.n = n; for (let y = 0; y < GH; y++) for (let x = 120; x < GW; x++) t.glass[x + y * GW] = 1; t.rebuild(); addNoise(t, r); for (let i = 0; i < 520 * Math.max(1, n * .8); i++) t.step(); return crestSpacing(t, 60 + r.int(60), 135, 250); },
      note: "The grid is made of 1 mm cells, so short wavelengths are slightly distorted (the simulation's own 'numerical dispersion'), and the stray ripples add noise." },
    { title: "Doppler: wavelength ahead of a moving source", question: "How much are the waves squashed in front of a moving source?", how: "A source (λ = 16 mm at rest) moves at a fraction of the wave speed; crest spacing is measured ahead of it.", xLabel: "source speed ÷ wave speed", yLabel: "wavelength ahead (mm)", xs: [0, 0.15, 0.3, 0.45, 0.6, 0.75], reps: 3, theory: m => 16 * (1 - m), theoryLabel: "λ(1 − v/c)",
      run: (m, r) => { const t = new Tank(); t.lambda = 16; t.mach = m; t.sources.push({ x: 30, y: 90 }); addNoise(t, r); const steps = m > 0 ? Math.min(420, Math.floor(150 / (m * CW))) : 420; for (let i = 0; i < steps; i++) t.step(); const sx = Math.round(t.sources[0].x); return crestSpacing(t, 90, sx + 8, Math.min(GW - 20, sx + 150)); },
      note: "Close to the source the wavefronts are strongly curved and the amplitude changes quickly, which shifts the zero-crossings used to measure the spacing." },
  ],
  notes: `<h3>What is being calculated</h3><p>The tank is a grid of 320 × 180 cells, each 1 mm across. Each time step (1 ms) every cell is pulled towards the average height of its four neighbours: this is the 2-D wave equation, solved by finite differences. Wave speed is 0.5 m/s in open water.</p>
  <h3>What emerges on its own</h3><ul><li>Superposition and interference</li><li>Diffraction through gaps and round edges</li><li>Reflection from walls</li><li>Refraction and focusing where the wave speed changes</li><li>Doppler shift and shock waves from a moving source</li></ul>
  <h3>Assumptions and simplifications</h3><ul><li>Small-amplitude waves: no breaking, and all wavelengths travel at the same speed (real water waves are dispersive).</li><li>"Glass" is a region where waves travel n times slower. In a real ripple tank you get this with shallower water.</li><li>Walls hold the water still (a fixed boundary), so reflections are inverted. Real tank walls behave more like free boundaries.</li><li>Waves are absorbed at the tank edges (like the foam beach in a real tank) unless you switch that off.</li><li>The grid makes very short wavelengths (below about 8 mm) travel slightly too slowly.</li><li>Intensity is the average of height² over roughly the last 80 ms.</li><li>The wave equation is worked out on a 320 × 180 grid (1 mm cells) by the ordinary processor, exactly as before, so the probes, the screen chart and the Batch run are unchanged. The graphics card (WebGL) only draws it: it blends smoothly between cells and lights each screen pixel from the slope of the water, so wavefronts look smooth rather than made of 1 mm squares. Without WebGL the tank is drawn in 2D as before.</li></ul>
  <h3>Useful equations</h3><p><code>v = fλ</code> &nbsp; <code>fringe spacing ≈ λD/d</code> &nbsp; <code>n = c₁/c₂ = λ₁/λ₂</code> &nbsp; <code>λ′ = λ(1 − v/c)</code></p>
  <h3>Keys</h3><p><kbd>Space</kbd> pause · right-click or the Erase tool removes things</p>`,
});

function addNoise(t, r) { for (let k = 0; k < 3; k++) t.sources.push({ x: 40 + r() * 240, y: 20 + r() * 140, lambda: 9 + r() * 20, amp: 0.025, fixed: true, ph: r() * 6.28 }); }
function slitRun(r, lambda, d) {
  const t = new Tank(); t.plane = true; t.lambda = lambda; t.slits = { n: 2, w: 8, sep: d, x: 90 }; t.rebuild(); addNoise(t, r);
  for (let i = 0; i < 1000; i++) t.step(); return fringeSpacing(t.screen(290));
}

// ---- Controls ----
let g = ui.group("Scene");
S.scene = K.seg(g, { value: scene, options: [["one", "One source"], ["two", "Two sources"], ["single", "Single slit"], ["double", "Double slit"], ["refract", "Refraction"], ["lens", "Lens"], ["mirror", "Mirror"], ["doppler", "Doppler"], ["blank", "Blank"]], on: setScene });
g = ui.group("Draw on the water");
S.tool = K.seg(g, { value: tool, options: [["source", "● Source"], ["wall", "▬ Wall"], ["glass", "◆ Glass"], ["erase", "⌫ Erase"], ["pa", "Probe A"], ["pb", "Probe B"]], on: v => { tool = v; ui.tip({ source: "Click to add a source · drag a source to move it", wall: "Drag to draw a wall", glass: "Drag to paint glass (slow region)", erase: "Drag to rub out walls, glass and sources", pa: "Click to place probe A", pb: "Click to place probe B" }[v], 3500); } });
g = ui.group("Waves");
S.lambda = K.slider(g, { label: "Wavelength", min: 6, max: 40, step: 0.5, value: 16, fmt: v => `${v} mm · ${(1000 * CW / v).toFixed(1)} Hz`, on: v => tank.lambda = v });
S.amp = K.slider(g, { label: "Amplitude", min: 0.2, max: 2, step: 0.1, value: 1, on: v => tank.amp = v });
S.plane = K.toggle(g, { label: "Plane waves from the left (a straight dipper)", value: false, on: v => tank.plane = v });
S.mach = K.slider(g, { label: "Source speed", min: 0, max: 1.6, step: 0.05, value: 0, fmt: v => v ? v.toFixed(2) + " × wave speed" : "at rest", on: v => tank.mach = v });
g = ui.group("Barrier and glass");
S.ns = K.seg(g, { label: "Slits in the barrier", value: 0, options: [[0, "None"], [1, "1"], [2, "2"], [3, "3"], [5, "5"]], on: v => { tank.slits.n = v; tank.rebuild(); } });
S.sw = K.slider(g, { label: "Slit width", min: 2, max: 60, step: 1, value: 8, unit: "mm", on: v => { tank.slits.w = v; tank.rebuild(); } });
S.sep = K.slider(g, { label: "Slit separation d", min: 12, max: 90, step: 1, value: 40, unit: "mm", on: v => { tank.slits.sep = v; tank.rebuild(); } });
S.n = K.slider(g, { label: "Glass refractive index n", min: 1.1, max: 2.5, step: 0.05, value: 1.5, on: v => { tank.n = v; tank.rebuild(); } });
g = ui.group("View");
S.view = K.seg(g, { value: view, options: [["height", "Water height"], ["inten", "Intensity"]], on: v => view = v, tip: "Intensity is the time-averaged brightness: it makes interference patterns stand out." });
S.speed = K.slider(g, { label: "Simulation speed", min: 1, max: 6, step: 1, value: 3, fmt: v => v + "×", on: v => speed = v });
ui.headerSpeed(S.speed);   // playback speed lives in the header, beside Pause and Reset
S.absorb = K.toggle(g, { label: "Absorbing edges (off = waves bounce back)", value: true, on: v => tank.setEdges(v) });
const r1 = K.row(g); K.btn(r1, "Calm the water", () => tank.calm()); K.btn(r1, "Clear drawing", () => { tank.drawn.fill(0); tank.glass.fill(0); tank.rebuild(); }, "danger");
g = ui.group("Measurements");
const read = K.readout(g, [["lam", "Wavelength"], ["f", "Frequency"], ["fs", "Fringe spacing (screen)"], ["ft", "Theory λD/d"]]);
K.note(g, "The dashed line is the screen. Drag it sideways. The right-hand chart shows the intensity along it.");

// ---- Scenes ----
function setScene(s) {
  scene = s; S.scene.set(s); tank.calm(); tank.drawn.fill(0); tank.glass.fill(0); tank.sources = []; probes.forEach(p => p.h = []);
  let plane = false, ns = 0, mach = 0, lam = 16, sw = 8, sep = 40; probes[0].x = 200; probes[0].y = 60; probes[1].x = 200; probes[1].y = 120; screenX = 290;
  if (s === "one") tank.sources.push({ x: 160, y: 90 });
  if (s === "two") { tank.sources.push({ x: 70, y: 66 }, { x: 70, y: 114 }); }
  if (s === "single") { plane = true; ns = 1; sw = 14; lam = 12; }
  if (s === "double") { plane = true; ns = 2; lam = 10; }
  if (s === "refract") { plane = true; for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (x > 150 + (y - 90) * 0.7) tank.glass[x + y * GW] = 1; probes[0].x = 60; probes[0].y = 90; probes[1].x = 250; probes[1].y = 90; }
  if (s === "lens") { plane = true; lam = 12; const R = 120, t = 20; for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (Math.hypot(x - (100 + R - t), y - 90) < R && Math.hypot(x - (100 - R + t), y - 90) < R) tank.glass[x + y * GW] = 1; probes[0].x = 215; probes[0].y = 90; probes[1].x = 215; probes[1].y = 40; }
  if (s === "mirror") { lam = 12; const f = 55; for (let y = 6; y < GH - 6; y++) { const x = Math.round(285 - (y - 90) ** 2 / (4 * f)); for (let k = 0; k < 3; k++) tank.drawn[x + k + y * GW] = 1; } tank.sources.push({ x: 285 - f, y: 90 }); probes[0].x = 60; probes[0].y = 50; probes[1].x = 60; probes[1].y = 130; screenX = 40; }
  if (s === "doppler") { tank.sources.push({ x: 30, y: 90 }); mach = 0.5; probes[0].x = 280; probes[0].y = 90; probes[1].x = 30; probes[1].y = 40; }
  S.plane.set(plane, true); S.ns.set(ns, true); S.mach.set(mach, true); S.lambda.set(lam, true); S.sw.set(sw, true); S.sep.set(sep, true);
  tank.rebuild();
}

// ---- Drawing the tank ----
const img = document.createElement("canvas"); img.width = GW; img.height = GH; const ictx = img.getContext("2d"), idata = ictx.createImageData(GW, GH), px = idata.data;
let vr = { s: 1, ox: 0, oy: 0 }, hover = null;
/* ---- The graphics card (WebGL) draws the water ----
   The wave equation is still worked out on the CPU (Tank.step, above), exactly as before. Each frame the
   heights, the intensity and the walls and glass are handed to the graphics card, which colours every
   SCREEN pixel rather than every 1 mm cell: it blends smoothly between cells (bicubic interpolation) and
   lights the surface from its slope at each pixel, so wavefronts look smooth instead of blocky.
   Without WebGL the old 2D drawing is used. */
const gv = K.gl.create(ui.stage, { dprMax: 2, antialias: false, fallback: "No WebGL here: drawing the tank without the graphics card.", onLost: () => { wgl.on = false; } });
const wgl = { on: false };
const WAVE_FS = `precision highp float;
uniform sampler2D uT; uniform vec2 uN; uniform float uView, uGain; varying vec2 vUv;
vec4 cell(vec2 i) { return texture2D(uT, (clamp(i, vec2(0.0), uN - 1.0) + 0.5) / uN); }      // r height, g intensity, b wall, a glass
vec4 cr(float t) { float t2 = t * t, t3 = t2 * t; return vec4(-0.5 * t3 + t2 - 0.5 * t, 1.5 * t3 - 2.5 * t2 + 1.0, -1.5 * t3 + 2.0 * t2 + 0.5 * t, 0.5 * t3 - 0.5 * t2); }
vec2 smooth2(vec2 p) {   // height and intensity, bicubic (Catmull-Rom) between cell centres
  vec2 i = floor(p), f = p - i; vec4 wx = cr(f.x), wy = cr(f.y); vec2 s = vec2(0.0);
  for (int y = 0; y < 4; y++) { vec2 row = vec2(0.0); for (int x = 0; x < 4; x++) row += wx[x] * cell(i + vec2(float(x) - 1.0, float(y) - 1.0)).rg; s += wy[y] * row; }
  vec2 a = cell(i).rg, b = cell(i + vec2(1.0, 0.0)).rg, c = cell(i + vec2(0.0, 1.0)).rg, d = cell(i + 1.0).rg;
  return clamp(s, min(min(a, b), min(c, d)), max(max(a, b), max(c, d)));   // no overshoot (dark rings) next to a sharp spike such as a source
}
vec2 lin2(vec2 p) {      // walls and glass, blended linearly so their edges are smooth
  vec2 i = floor(p), f = p - i;
  return mix(mix(cell(i).ba, cell(i + vec2(1.0, 0.0)).ba, f.x), mix(cell(i + vec2(0.0, 1.0)).ba, cell(i + 1.0).ba, f.x), f.y);
}
void main() {
  vec2 p = vec2(vUv.x, 1.0 - vUv.y) * uN - 0.5;          // position in cells (row 0 at the top, as on the CPU)
  vec2 hv = smooth2(p), wg = lin2(p); vec3 c;
  if (uView < 0.5) {     // water height: the same colour scale as the 2D drawing, plus a highlight from the slope
    float w = hv.x * 4.0, v = w / (1.0 + abs(w)), t = v * 0.5 + 0.5, s = (smooth2(p + vec2(1.0, 0.0)).x - smooth2(p - vec2(1.0, 0.0)).x) * 150.0;
    c = vec3(6.0 + t * t * 150.0 + s, 26.0 + t * 190.0 + s, 70.0 + t * 175.0 + s * 0.6);
    c += vec3(8.0, 30.0, -14.0) * smoothstep(0.2, 0.8, wg.y);
  } else {               // intensity: time-averaged height squared
    float q = min(1.0, sqrt(max(hv.y, 0.0) * uGain));
    c = 255.0 * vec3(min(1.0, q * 1.7), clamp(q * 1.9 - 0.65, 0.0, 1.0), q < 0.35 ? q * 1.5 : max(0.0, 0.52 - (q - 0.35) * 1.4) + max(0.0, (q - 0.82) * 5.0));
    c += vec3(0.0, 26.0, 18.0) * smoothstep(0.2, 0.8, wg.y);
  }
  c = mix(clamp(c, 0.0, 255.0), vec3(196.0, 204.0, 218.0), smoothstep(0.3, 0.7, wg.x));   // walls
  gl_FragColor = vec4(c / 255.0, 1.0);
}`;
if (gv.ok && K.gl.floatType(gv.gl).kind !== "byte") {
  try { wgl.prog = K.gl.program(gv.gl, K.gl.QUAD_VS, WAVE_FS); wgl.quad = K.gl.quad(gv.gl); wgl.tex = K.gl.target(gv.gl, GW, GH, { float: true }); wgl.buf = new Float32Array(4 * NC); wgl.on = true; }
  catch (e) { console.warn(e.message); K.gl.notice(ui.stage, "WebGL did not start properly: drawing the tank without it."); }
} else if (gv.ok) K.gl.notice(ui.stage, "This graphics card cannot store decimal numbers in textures: drawing the tank without it.");
window.__glInfo = () => ({ gpu: wgl.on, grid: GW + " × " + GH, model: "CPU", webgl: gv.ok ? (gv.gl2 ? 2 : 1) : 0 });
const cv = ui.canvas();
function paint() {
  const u = tank.u, I = tank.inten, wall = tank.wall, glass = tank.glass;
  // the intensity picture rescales itself so that the brightest region (beyond the dipper) is just white
  let mxI = 1e-6; for (let y = 4; y < GH; y += 5) for (let x = 30; x < GW; x += 5) if (I[x + y * GW] > mxI) mxI = I[x + y * GW];
  const iGain = 1 / (0.75 * mxI);
  const c = cv.ctx, s = Math.min(cv.w / GW, cv.h / GH), ox = (cv.w - GW * s) / 2, oy = (cv.h - GH * s) / 2; vr = { s, ox, oy };
  if (wgl.on) {
    // hand this frame's tank to the graphics card and let it colour the pixels
    const B = wgl.buf; for (let i = 0, j = 0; i < NC; i++, j += 4) { B[j] = u[i]; B[j + 1] = I[i]; B[j + 2] = wall[i]; B[j + 3] = glass[i]; }
    const gl = gv.gl, d = gv.dpr; wgl.tex.upload(B);
    K.gl.bindTarget(gl, null); gl.clearColor(0.016, 0.027, 0.055, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.viewport(Math.round(ox * d), Math.round((cv.h - oy - GH * s) * d), Math.round(GW * s * d), Math.round(GH * s * d));
    wgl.prog.set({ uT: wgl.tex, uN: [GW, GH], uView: view === "height" ? 0 : 1, uGain: iGain }); wgl.quad.draw(wgl.prog);
    c.clearRect(0, 0, cv.w, cv.h);
  } else {
  for (let i = 0, j = 0; i < NC; i++, j += 4) {
    let r, g2, b;
    if (wall[i]) { r = 196; g2 = 204; b = 218; }
    else if (view === "height") {
      // colour by height, plus a highlight from the slope so the surface looks lit from the side
      const w = u[i] * 4, v = w / (1 + Math.abs(w)), t = v * .5 + .5, s = (u[i + 1] - u[i - 1] || 0) * 150;
      r = 6 + t * t * 150 + s; g2 = 26 + t * 190 + s; b = 70 + t * 175 + s * .6;
      if (glass[i]) { g2 += 30; r += 8; b -= 14; }
    } else {
      const q = Math.min(1, Math.sqrt(I[i] * iGain));
      r = 255 * Math.min(1, q * 1.7); g2 = 255 * Math.max(0, Math.min(1, q * 1.9 - .65)); b = 255 * (q < .35 ? q * 1.5 : Math.max(0, .52 - (q - .35) * 1.4) + Math.max(0, (q - .82) * 5));
      if (glass[i]) { g2 += 26; b += 18; }
    }
    px[j] = r; px[j + 1] = g2; px[j + 2] = b; px[j + 3] = 255;
  }
  ictx.putImageData(idata, 0, 0);
  c.fillStyle = "#04070e"; c.fillRect(0, 0, cv.w, cv.h); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = "high"; c.drawImage(img, ox, oy, GW * s, GH * s);
  }
  const X = x => ox + (x + .5) * s, Y = y => oy + (y + .5) * s;
  // screen line
  c.setLineDash([6, 5]); c.strokeStyle = "rgba(255,255,255,.75)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(X(screenX), oy); c.lineTo(X(screenX), oy + GH * s); c.stroke(); c.setLineDash([]);
  c.font = "600 11px Segoe UI,sans-serif"; c.fillStyle = "rgba(255,255,255,.85)"; c.textAlign = "center"; c.fillText("screen ↔", X(screenX), oy + 14);
  // sources and probes
  for (const sc of tank.sources) { const p = 3 + 2 * Math.sin(sc.ph || 0); c.fillStyle = "#fff"; c.beginPath(); c.arc(X(sc.x), Y(sc.y), 4, 0, 6.3); c.fill(); c.strokeStyle = "rgba(255,255,255,.6)"; c.beginPath(); c.arc(X(sc.x), Y(sc.y), 6 + p, 0, 6.3); c.stroke(); }
  probes.forEach((p, k) => { const col = k ? "#ffb454" : "#7ee787"; c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.arc(X(p.x), Y(p.y), 7, 0, 6.3); c.stroke(); c.fillStyle = col; c.textAlign = "left"; c.fillText(k ? "B" : "A", X(p.x) + 10, Y(p.y) + 4); });
  // scale bar: 50 mm
  c.strokeStyle = "#fff"; c.lineWidth = 2; c.beginPath(); c.moveTo(ox + 14, oy + GH * s - 14); c.lineTo(ox + 14 + 50 * s, oy + GH * s - 14); c.stroke(); c.fillStyle = "#fff"; c.textAlign = "left"; c.fillText("5 cm", ox + 14, oy + GH * s - 20);
  if (hover) ui.hud(`x ${hover.x.toFixed(0)} mm · y ${hover.y.toFixed(0)} mm`); else ui.hud("");
}

// ---- Mouse / touch ----
const toGrid = p => ({ x: (p.x - vr.ox) / vr.s - .5, y: (p.y - vr.oy) / vr.s - .5 });
let dragSrc = null, lastPt = null, dragScreen = false;
function brush(x, y, rad, fn) { for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) { const xx = Math.round(x + dx), yy = Math.round(y + dy); if (dx * dx + dy * dy <= rad * rad && xx > 0 && xx < GW - 1 && yy > 0 && yy < GH - 1) fn(xx + yy * GW); } }
function stroke(a, b) {
  const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y)));
  for (let k = 0; k <= n; k++) { const x = a.x + (b.x - a.x) * k / n, y = a.y + (b.y - a.y) * k / n;
    if (tool === "wall") brush(x, y, 1.5, i => tank.drawn[i] = 1);
    if (tool === "glass") brush(x, y, 6, i => tank.glass[i] = 1);
    if (tool === "erase") { brush(x, y, 6, i => { tank.drawn[i] = 0; tank.glass[i] = 0; }); tank.sources = tank.sources.filter(s => Math.hypot(s.x - x, s.y - y) > 7); }
  }
  tank.rebuild();
}
K.pointer(cv.el, {
  down(p) {
    const q = toGrid(p), erase = p.e.button === 2;
    if (Math.abs(q.x - screenX) < 5 && tool !== "wall" && tool !== "glass") { dragScreen = true; return; }
    if (erase) { const keep = tool; tool = "erase"; stroke(q, q); tool = keep; return; }
    if (tool === "source") { dragSrc = tank.sources.find(s => Math.hypot(s.x - q.x, s.y - q.y) < 8); if (!dragSrc && tank.sources.length < 8) { dragSrc = { x: q.x, y: q.y }; tank.sources.push(dragSrc); } }
    else if (tool === "pa" || tool === "pb") { const pr = probes[tool === "pa" ? 0 : 1]; pr.x = K.clamp(Math.round(q.x), 2, GW - 3); pr.y = K.clamp(Math.round(q.y), 2, GH - 3); pr.h = []; }
    else { lastPt = q; stroke(q, q); }
  },
  drag(p) {
    const q = toGrid(p); hover = q;
    if (dragScreen) screenX = K.clamp(Math.round(q.x), 24, GW - 20);
    else if (dragSrc) { dragSrc.x = K.clamp(q.x, 3, GW - 4); dragSrc.y = K.clamp(q.y, 3, GH - 4); }
    else if (tool === "pa" || tool === "pb") { const pr = probes[tool === "pa" ? 0 : 1]; pr.x = K.clamp(Math.round(q.x), 2, GW - 3); pr.y = K.clamp(Math.round(q.y), 2, GH - 3); }
    else if (lastPt) { stroke(lastPt, q); lastPt = q; }
  },
  up() { dragSrc = null; lastPt = null; dragScreen = false; },
  hover(p) { const q = toGrid(p); hover = q.x >= 0 && q.x < GW && q.y >= 0 && q.y < GH ? q : null; cv.el.style.cursor = Math.abs(q.x - screenX) < 5 ? "ew-resize" : "crosshair"; },
  leave() { hover = null; },
});

// ---- Charts ----
const chProbe = K.chart(ui.dock, { title: "Probes: water height against time", xLabel: "time (ms)", yLabel: "height" });
const chScreen = K.chart(ui.dock, { title: "Intensity along the screen", xLabel: "position on screen y (mm)", yLabel: "intensity", yMin: 0, xMin: 0, xMax: GH });
let frame = 0;
ui.run(() => {
  for (let k = 0; k < speed; k++) { tank.step(); probes.forEach(p => { p.h.push([tank.t, tank.u[p.x + p.y * GW]]); if (p.h.length > 420) p.h.shift(); }); }
}, () => {
  paint();
  if (frame++ % 3) return;
  chProbe.draw([{ pts: probes[0].h, color: "#7ee787", label: "A" }, { pts: probes[1].h, color: "#ffb454", label: "B" }]);
  const prof = tank.screen(screenX); chScreen.draw([{ pts: prof.map((v, y) => [y, v]), type: "area", color: K.cssVar("--s0") }]);
  const fs = tank.slits.n >= 2 && tank.plane ? fringeSpacing(prof) : null, D = screenX - tank.slits.x;
  read.set("lam", tank.lambda + " mm"); read.set("f", (1000 * CW / tank.lambda).toFixed(1) + " Hz");
  read.set("fs", fs ? fs.toFixed(1) + " mm" : "–"); read.set("ft", tank.slits.n >= 2 && D > 20 ? fringeTheory(tank.lambda, tank.slits.sep, D).toFixed(1) + " mm" : "–");
});
setScene("two");
ui.tip("Click the water to add a source · drag sources around · try the scenes on the right");
