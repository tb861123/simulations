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

// ---- Blocks of material: a rectangle or a triangular prism, centre (cx, cy), size w × h (mm), turned by ang ----
// local coordinates of a point: along the block's width (lx) and height (ly)
function toLocal(b, x, y) { const dx = x - b.cx, dy = y - b.cy, c = Math.cos(b.ang), s = Math.sin(b.ang); return { lx: dx * c + dy * s, ly: -dx * s + dy * c }; }
function toWorld(b, lx, ly) { const c = Math.cos(b.ang), s = Math.sin(b.ang); return { x: b.cx + lx * c - ly * s, y: b.cy + lx * s + ly * c }; }
function insideBlock(b, x, y) {
  const { lx, ly } = toLocal(b, x, y); if (Math.abs(ly) > b.h / 2) return false;
  if (b.shape === "prism") return Math.abs(lx) <= (b.w / 2) * (ly + b.h / 2) / b.h;   // apex at the top, base at the bottom
  return Math.abs(lx) <= b.w / 2;
}
function blockHandles(b) { return { size: toWorld(b, b.w / 2, b.h / 2), rot: toWorld(b, 0, -b.h / 2 - 14) }; }   // square: resize · round: turn
function blockCorners(b) { return b.shape === "prism" ? [[0, -b.h / 2], [b.w / 2, b.h / 2], [-b.w / 2, b.h / 2]].map(p => toWorld(b, p[0], p[1])) : [[-b.w / 2, -b.h / 2], [b.w / 2, -b.h / 2], [b.w / 2, b.h / 2], [-b.w / 2, b.h / 2]].map(p => toWorld(b, p[0], p[1])); }
function eachCellIn(b, fn) {
  const r = Math.hypot(b.w, b.h) / 2 + 1, x0 = Math.max(1, Math.floor(b.cx - r)), x1 = Math.min(GW - 2, Math.ceil(b.cx + r)), y0 = Math.max(1, Math.floor(b.cy - r)), y1 = Math.min(GH - 2, Math.ceil(b.cy + r));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (insideBlock(b, x, y)) fn(x + y * GW);
}

class Tank {
  constructor() {
    this.u = new Float32Array(NC); this.up = new Float32Array(NC); this.un = new Float32Array(NC); // height now, one step ago, next
    this.c2 = new Float32Array(NC).fill(C2);   // (wave speed)² in each cell: lower inside "glass" (shallow water)
    this.damp = new Float32Array(NC);          // energy absorbed at the edges so waves do not bounce back
    this.wall = new Uint8Array(NC); this.solid = new Uint8Array(NC); this.drawn = new Uint8Array(NC); this.glass = new Uint8Array(NC);
    // refractive index of every cell (1 = open water), and the two numbers the "matched" equation needs (see step)
    this.nIdx = new Float32Array(NC).fill(1); this.kap = new Float32Array(NC).fill(C2); this.rr = new Float32Array(NC).fill(1); this.matl = new Uint8Array(NC);
    this.blocks = [];        // movable blocks of material: { shape: "rect" | "prism", cx, cy, w, h, ang (radians), n }
    this.matched = false;    // true = no partial reflections at the edge of the glass (see step)
    this.anti = false;       // true = the second dipper moves in antiphase (half a cycle out of step) with the first
    this.inten = new Float32Array(NC);         // time-averaged u² (what a detector or your eye would record)
    this.sources = []; this.plane = false; this.lambda = 16; this.amp = 1; this.mach = 0; this.n = 1.5; this.t = 0;
    this.slits = { n: 0, w: 8, sep: 40, x: 90 };
    this.gapRule = true;   // true: GCSE rule (gap < λ blocks the wave); false: real behaviour from the wave equation alone
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
    // The gap rule (GCSE): a gap narrower than the wavelength does not let the wave through.
    // Real waves squeeze a tiny fraction of their energy through such a gap; here the gap is
    // "plugged" (held still like a wall, so the wave reflects) but still drawn as open water.
    this.solid.set(this.wall);
    if (s.n > 0 && !this.gapPasses()) for (let y = 0; y < GH; y++) for (let x = s.x - 1; x <= s.x + 1; x++) this.solid[x + y * GW] = 1;
    // refractive index of each cell: hand-drawn (or scene) glass uses the n slider, each block has its own n
    const N = this.nIdx; for (let i = 0; i < NC; i++) N[i] = this.glass[i] ? this.n : 1;
    for (const b of this.blocks) eachCellIn(b, i => { N[i] = b.n; });
    // light (or water waves) travel n times slower inside the glass: (wave speed)² = c² ÷ n²
    for (let i = 0; i < NC; i++) { const n = N[i]; this.c2[i] = C2 / (n * n); this.kap[i] = C2 / n; this.rr[i] = 1 / n; this.matl[i] = n !== 1 ? 1 : 0; }
    this.anyMat = this.matl.some(v => v);
  }
  // Can the wave pass through the gaps? Only if each gap is at least one wavelength wide.
  // Under the GCSE rule a gap passes the wave only if it is at least one wavelength wide.
  // In real behaviour the wave equation alone decides: a weak wave always leaks through.
  gapPasses() { return !this.gapRule || this.slits.w >= this.lambda; }
  calm() { this.u.fill(0); this.up.fill(0); this.inten.fill(0); this.t = 0; }
  step() {
    const { u, up, un, c2, damp, solid } = this; this.t++;
    // 1. Drive the sources: each one pushes the water up and down sinusoidally
    const ramp = Math.min(1, this.t / (2 * this.lambda / CW));
    if (this.plane) { const a = 0.11 * this.amp * ramp * Math.sin(2 * Math.PI * CW / this.lambda * this.t); for (let y = 1; y < GH - 1; y++) u[18 + y * GW] += a; }
    let k = 0;
    for (const s of this.sources) {
      const lam = s.lambda || this.lambda; s.ph = (s.ph || 0) + 2 * Math.PI * CW / lam;
      if (this.mach && !s.fixed) { s.x += this.mach * CW; if (s.x > GW - 20) { s.x = 20; } }
      let off = 0; if (!s.fixed) { if (this.anti && k === 1) off = Math.PI; k++; }   // antiphase: the second dipper is half a cycle behind the first
      const xi = Math.round(s.x), yi = Math.round(s.y); if (xi > 1 && xi < GW - 2 && yi > 1 && yi < GH - 2) u[xi + yi * GW] += 0.9 * (s.amp || this.amp) * Math.sin(s.ph + off);
    }
    // 2. The wave equation: a cell accelerates towards the average height of its four neighbours
    if (this.matched && this.anyMat) {
      /* "Matched" glass: no partial reflections. In the ordinary equation the glass only slows the wave, and any
         sudden change of speed reflects part of the wave (as light reflects faintly off a window). Here the glass is
         also given a different "springiness" and "heaviness" (like the pressure and density of a fluid), chosen so that
         its wave impedance equals the water's: the wave still slows down by n, but nothing bounces back at a straight-on
         boundary (and almost nothing at a slant). An anti-reflection coating on a lens does the same job.
         Equation:  d²u/dt² = κ ∇·(r ∇u)  with κ = c²/n and r = 1/n, so the speed² is κr = c²/n² but the impedance is unchanged. */
      const kap = this.kap, rr = this.rr;
      for (let y = 1; y < GH - 1; y++) {
        let i = 1 + y * GW;
        for (let x = 1; x < GW - 1; x++, i++) {
          if (solid[i]) { un[i] = 0; continue; }   // walls (and plugged gaps) hold the water still
          const ri = rr[i], ui = u[i];
          const lap = (ri + rr[i - 1]) * (u[i - 1] - ui) + (ri + rr[i + 1]) * (u[i + 1] - ui) + (ri + rr[i - GW]) * (u[i - GW] - ui) + (ri + rr[i + GW]) * (u[i + GW] - ui);
          un[i] = ui + (ui - up[i]) * (1 - damp[i]) + 0.5 * kap[i] * lap;
        }
      }
    } else for (let y = 1; y < GH - 1; y++) {
      let i = 1 + y * GW;
      for (let x = 1; x < GW - 1; x++, i++) {
        if (solid[i]) { un[i] = 0; continue; }   // walls (and plugged gaps) hold the water still
        const lap = u[i - 1] + u[i + 1] + u[i - GW] + u[i + GW] - 4 * u[i];
        un[i] = u[i] + (u[i] - up[i]) * (1 - damp[i]) + c2[i] * lap;
      }
    }
    this.up = u; this.u = un; this.un = up;
    // 3. Running average of u² = intensity (brightness of the pattern)
    const I = this.inten, v = this.u; for (let i = 0; i < NC; i++) I[i] += (v[i] * v[i] - I[i]) * 0.012;
  }
  screen(x) { const p = new Array(GH); for (let y = 0; y < GH; y++) p[y] = this.inten[x + y * GW]; return p; }
  row(y) { y = Math.round(y); const p = new Array(GW); for (let x = 0; x < GW; x++) p[x] = this.inten[x + y * GW]; return p; }   // intensity along a horizontal line
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
// Mean distance between the calm stripes (nodes) of a stationary wave, from the intensity along a line between xa and xb
function nodeSpacing(p, xa, xb) {
  const box = q => q.map((v, i) => { let t = 0, n = 0; for (let k = -1; k <= 1; k++) if (q[i + k] != null) { t += q[i + k]; n++; } return t / n; });
  const s = box(p), mx = Math.max(...s.slice(xa, xb)), mins = [];
  for (let i = xa + 1; i < xb - 1; i++) if (s[i] < 0.35 * mx && s[i] <= s[i - 1] && s[i] < s[i + 1]) { const d = (s[i - 1] - s[i + 1]) / (2 * (s[i - 1] - 2 * s[i] + s[i + 1]) || 1); mins.push(i + d); }
  return mins.length > 2 ? (mins[mins.length - 1] - mins[0]) / (mins.length - 1) : null;
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
let profileMode = "screen", view = "height", tool = "source", screenX = 290, probes = [{ x: 200, y: 60, h: [] }, { x: 200, y: 120, h: [] }], speed = 3, scene = "two";
const S = {};   // the sliders, so that scenes can set them

const ui = K.app({
  title: "Ripple Tank", subject: "Physics", blurb: "One wave equation: interference, diffraction, refraction, lenses and sonic booms all emerge from it.",
  levels: { std: "Standard (iGCSE)", adv: "Advanced (A level)", specs: {
    std: "Pearson Edexcel International GCSE Physics (4PH1) Section 3(a) Properties of waves: transverse and longitudinal waves; amplitude, wavefront, frequency, wavelength and period; v = fλ and f = 1/T; reflection, refraction (a change of speed) and diffraction; the Doppler effect.",
    adv: "WJEC Eduqas A level Physics Component 3: the nature of waves and wave properties (diffraction, path difference, phase, coherence, interference, Young's slits λ = ay/D, the diffraction grating d sin θ = nλ, stationary waves) and refraction (n = c/v, n₁ sin θ₁ = n₂ sin θ₂, critical angle). The single-slit minimum sin θ = λ/a is beyond the spec." } },
  reset: () => setScene(scene),
  step: () => tank.step(),
  missions: [
    { title: "Two sources", q: "Two dippers bob in step. Where is the water calm, and why? Switch the view to <b>Intensity</b> to see the pattern, then drag a source closer to the other.", hint: "Calm lines (nodal lines) are where a crest from one source always meets a trough from the other: path difference = ½λ, 1½λ… Moving the sources closer spreads the lines apart.", setup: () => setScene("two") },
    { title: "Young's double slit", q: "Predict first: if you <b>halve</b> the slit separation, what happens to the fringe spacing on the screen (right-hand chart)? Then test it. What about doubling the wavelength?", hint: "Fringe spacing ≈ λD/d. Halving d doubles the spacing; doubling λ doubles it too. Compare the measured and theory tiles.", setup: () => setScene("double") },
    { title: "Diffraction through a gap", q: "Make the gap much wider than the wavelength, then the same size, then narrower than the wavelength. When does the wave spread out the most? What happens when the gap is too narrow?", hint: "Spreading is greatest when gap = wavelength: the wave fans out in semicircles. A wider gap spreads it less. Under the GCSE rule a gap narrower than the wavelength does not let the wave through at all: it is reflected. Switch <b>Gaps narrower than λ</b> to Real behaviour to see what really happens: a weak wave leaks through and spreads out in all directions. A wide gap gives a beam with sharp shadows: that is why light (tiny λ) seems to travel in straight lines but sound bends round doorways.", setup: () => setScene("single") },
    { title: "Refraction", q: "The green block is glass (slower waves). Watch the wavefronts cross into it and out again. What happens to the wavelength, the direction and the frequency? Probe A is in the water, probe B in the glass. Drag the round handle to turn the block, or change its n. (The faint ripples bouncing back off the block are <b>partial reflections</b>: switch them off in <b>Barrier and glass</b> to see the refraction on its own.)", hint: "Inside the glass the wavelength shrinks by the factor n and the wavefronts bend so that the wave travels closer to the normal; coming out they bend back. The frequency is unchanged: the two probe traces have the same period. The bigger n, or the more the block is turned, the bigger the change of direction.", setup: () => setScene("refract") },
    { title: "Find the focus", q: "A convex lens is just glass that is thicker in the middle. Use Intensity view to find the focal point. Then change the refractive index: where does the focus move?", hint: "The middle of each wavefront is delayed the most, so the wavefront curves inward and converges. Larger n means more delay and a shorter focal length.", setup: () => { setScene("lens"); S.view.set("inten", true); } },
    { title: "Break the sound barrier", q: "The source is moving. Compare the wavelength in front of it and behind it. Now slide <b>Source speed</b> past 1.0× the wave speed. What forms?", hint: "In front, crests bunch up (higher pitch); behind, they spread. Above the wave speed the source outruns its own waves, which pile into a V-shaped shock: a sonic boom, or the bow wave of a boat.", setup: () => setScene("doppler") },
    { title: "Engineer's challenge", q: "Blank tank, plane waves. Using only the <b>Wall</b> and <b>Glass</b> tools, make the signal at probe A as large as you possibly can. What shapes work?", hint: "Try a curved (parabolic) wall behind the probe, a hand-drawn lens in front of it, or a wall with gaps spaced so that the waves through each gap arrive in step (a zone plate).", setup: () => { setScene("blank"); S.plane.set(true, true); S.tool.set("wall", true); } },
    { lvl: "adv", title: "Path difference and phase", q: "Two sources. Hover over the water: the box at the top right gives the <b>path difference</b> from the two sources in wavelengths. Check it on a bright line and on a calm line. Now switch on <b>Second dipper in antiphase</b>. What happens to the middle line, and why?", hint: "In phase: bright (constructive) where the path difference is nλ, calm (destructive) where it is (n + ½)λ. In antiphase the sources start half a cycle apart, so the rules swap: the centre line (path difference 0) becomes calm. Interference needs coherent sources: a constant phase difference.", setup: () => { setScene("two"); S.view.set("inten", true); S.anti.set(false, true); } },
    { lvl: "adv", title: "Stationary waves", q: "Plane waves hit a straight wall and reflect back on themselves. Switch the view to <b>Intensity</b>: the chart now shows the intensity along the centre line. Measure the distance between neighbouring nodes (the calm stripes) and compare it with the wavelength. Then change λ.", hint: "The incoming and reflected waves superpose to make a stationary wave. Nodes (no movement) are λ/2 apart, with antinodes halfway between. Unlike a progressive wave, a stationary wave carries no energy along: every point between two nodes moves in phase. The tiles show the measured node spacing and λ/2.", setup: () => { setScene("standing"); S.view.set("inten", true); } },
    { lvl: "adv", title: "The diffraction grating", q: "Five slits instead of two. Compare the bright fringes on the screen with the double slit: where are they, and how sharp? Use <b>d sin θ = nλ</b> to predict the angle of the first order, then check it on the screen chart.", hint: "The bright orders are in the same places as for two slits with the same d (path difference nλ between neighbouring slits), but they are much sharper and brighter, with faint subsidiary maxima between. That is why a grating measures wavelengths so precisely. The tile gives the theory position of the first order on the screen.", setup: () => { setScene("double"); S.ns.set(5, true); S.view.set("inten", true); } },
    { lvl: "adv", title: "Total internal reflection", q: "The dipper is <b>inside</b> a block of glass (n = 2). Which waves get out into the water, and which are trapped? Predict the angle of the cone that escapes, then raise and lower n.", hint: "Waves meeting the face at more than the critical angle (sin c = 1/n = 0.5, so c = 30°) are totally internally reflected; only a cone within 30° of the normal escapes. Raise n and the cone narrows. This is how optical fibres trap light.", setup: () => setScene("tir") },
  ],
  batch: [
    { title: "Fringe spacing vs slit separation", question: "Does Young's fringe spacing follow λD/d?", how: "Plane waves (λ = 10 mm) pass two slits; the screen is 200 mm away. A few random stray ripples are added to every run.", xLabel: "slit separation d (mm)", yLabel: "fringe spacing (mm)", xs: [36, 40, 46, 52, 60, 70], reps: 3, theory: d => fringeTheory(10, d, 200), theoryLabel: "path difference = λ",
      run: (d, r) => slitRun(r, 10, d), note: "Stray ripples in the tank (random each run) shift the fringes slightly, and peaks can only be located to a fraction of a millimetre. Real ripple tanks are much noisier." },
    { title: "Fringe spacing vs wavelength", question: "Longer waves: wider or narrower fringes?", how: "Slit separation fixed at 40 mm, screen 200 mm away.", xLabel: "wavelength λ (mm)", yLabel: "fringe spacing (mm)", xs: [6, 7, 8, 9, 10, 11, 12], reps: 3, theory: l => fringeTheory(l, 40, 200), theoryLabel: "path difference = λ",
      run: (l, r) => slitRun(r, l, 40), note: "Stray ripples shift the peaks slightly. The slits are 12 mm wide, so every wavelength tested (up to 12 mm) can pass through them (the gap must be at least λ). At long wavelengths the slits are about one wavelength wide, so each spreads widely and the fringes are broad, so the peak is harder to pin down." },
    { title: "Wavelength inside glass", question: "How does the wavelength change in a slower medium?", how: "A plane wave (λ = 16 mm) enters a block with refractive index n; crest spacing is measured inside.", xLabel: "refractive index n", yLabel: "wavelength in block (mm)", xs: [1, 1.25, 1.5, 1.75, 2, 2.5], reps: 3, theory: n => 16 / n, theoryLabel: "λ / n",
      run: (n, r) => { const t = new Tank(); t.plane = true; t.lambda = 16; t.n = n; for (let y = 0; y < GH; y++) for (let x = 120; x < GW; x++) t.glass[x + y * GW] = 1; t.rebuild(); addNoise(t, r); for (let i = 0; i < 520 * Math.max(1, n * .8); i++) t.step(); return crestSpacing(t, 60 + r.int(60), 135, 250); },
      note: "The grid is made of 1 mm cells, so short wavelengths are slightly distorted (the simulation's own 'numerical dispersion'), and the stray ripples add noise." },
    { title: "Doppler: wavelength ahead of a moving source", question: "How much are the waves squashed in front of a moving source?", how: "A source (λ = 16 mm at rest) moves at a fraction of the wave speed; crest spacing is measured ahead of it.", xLabel: "source speed ÷ wave speed", yLabel: "wavelength ahead (mm)", xs: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6], reps: 3, theory: m => 16 * (1 - m), theoryLabel: "λ(1 − v/c)",
      run: (m, r) => { const t = new Tank(); t.lambda = 16; t.mach = m; t.sources.push({ x: 30, y: 90 }); addNoise(t, r); const steps = m > 0 ? Math.min(420, Math.floor(150 / (m * CW))) : 420; for (let i = 0; i < steps; i++) t.step(); const sx = Math.round(t.sources[0].x), front = Math.floor(30 + CW * steps) - 6; return crestSpacing(t, 90, sx + 8, Math.min(GW - 20, sx + 150, front)); },   // measure only between the source and the first crest it sent out: beyond that there are only stray ripples
      note: "Crests are measured only between the source and the first crest it sent out. Close to the source the wavefronts are strongly curved, which shifts the zero-crossings slightly, so the measured values sit a little below the line. Faster than about 0.6 × the wave speed the squashed wavelength (under 6 mm) is too short for the 1 mm grid to show faithfully." },
    { title: "Stationary waves: node spacing", question: "How far apart are the nodes of a stationary wave?", how: "Plane waves reflect from a straight wall 240 mm away. After the pattern settles, the calm stripes (nodes) along the centre line are found from the time-averaged intensity.", xLabel: "wavelength λ (mm)", yLabel: "distance between nodes (mm)", xs: [10, 12, 14, 16, 20, 24], reps: 3, yMin: 0, fit: true, theory: l => l / 2, theoryLabel: "λ / 2",
      run: (l, r) => { const t = new Tank(); t.plane = true; t.lambda = l; for (let y = 1; y < GH - 1; y++) for (let x = 260; x < 263; x++) t.drawn[x + y * GW] = 1; t.rebuild(); addNoise(t, r); for (let i = 0; i < 1500; i++) t.step(); return nodeSpacing(t.row(GH / 2), 40, 250); },
      note: "The incoming and reflected waves superpose; nodes are λ/2 apart whatever the wavelength. The stray ripples and the 1 mm grid give a little scatter." },
  ],
  notes: `<h3>What is being calculated</h3><p>The tank is a grid of 320 × 180 cells, each 1 mm across. Each time step (1 ms) every cell is pulled towards the average height of its four neighbours: this is the 2-D wave equation, solved by finite differences. Wave speed is 0.5 m/s in open water.</p>
  <h3>What emerges on its own</h3><ul><li>Superposition and interference</li><li>Diffraction through gaps and round edges</li><li>Reflection from walls</li><li>Refraction and focusing where the wave speed changes</li><li>Doppler shift and shock waves from a moving source</li></ul>
  <h3>Assumptions and simplifications</h3><ul><li>Small-amplitude waves: no breaking, and in the equation all wavelengths travel at the same speed (real water waves are dispersive; the grid adds a small effect, below).</li><li>"Glass" is a region where waves travel n times slower (n from 1 to 3). In a real ripple tank you get this with shallower water. Hand-drawn glass and the lens use the n slider; each movable block (rectangle or prism) has its own n.</li><li><b>Partial reflections.</b> Wherever the wave speed changes suddenly, part of the wave reflects, just as a window reflects a little light. Switching partial reflections off makes the glass "matched": it is given a different springiness and heaviness as well as a lower speed, so that its wave impedance equals the water's (the job an anti-reflection coating does on a lens). The wave still slows down and bends by exactly the same amount, but almost nothing bounces back: for n = 1.5 the reflected energy falls from about 4% (as Fresnel's equations predict for light) to under 0.1%. For very large n (near 3) the 1 mm grid itself still reflects a couple of per cent. Total internal reflection still happens.</li><li>Gaps narrower than the wavelength: with <b>GCSE rule</b> selected (the default) such a gap lets no wave through (the gap is held still like a wall, so the wave reflects). This is the rule used at GCSE, and it is a simplification. Switch to <b>Real behaviour</b> to let the wave equation decide on its own: some of the wave leaks through, much weaker than through a wide gap, and spreads out almost evenly like a new point source. Most of the wave is reflected. (In a real tank how much gets through also depends on how thick the barrier is.) A gap equal to λ gives the most spreading, and wider gaps spread the wave less: those two parts are not programmed in, they come out of the wave equation.</li><li>Walls hold the water still (a fixed boundary), so reflections are inverted. Real tank walls behave more like free boundaries.</li><li>Waves are absorbed at the tank edges (like the foam beach in a real tank) unless you switch that off.</li><li>The grid makes very short wavelengths (below about 8 mm) travel slightly too slowly.</li><li>Intensity is the average of height² over roughly the last 80 ms.</li><li>The wave equation is worked out on a 320 × 180 grid (1 mm cells) by the ordinary processor, exactly as before, so the probes, the screen chart and the Batch run are unchanged. The graphics card (WebGL) only draws it: it blends smoothly between cells and lights each screen pixel from the slope of the water, so wavefronts look smooth rather than made of 1 mm squares. Without WebGL the tank is drawn in 2D as before.</li></ul>
  <h3>Useful equations</h3><p><code>v = fλ</code> &nbsp; <code>f = 1/T</code> &nbsp; <code>fringe spacing ≈ λD/d</code> &nbsp; <code>n = c₁/c₂ = λ₁/λ₂</code> &nbsp; <code>λ′ = λ(1 − v/c)</code></p>
  <p>A level: <code>n₁ sin θ₁ = n₂ sin θ₂</code> &nbsp; <code>sin c = 1/n</code> &nbsp; <code>d sin θ = nλ</code> &nbsp; node spacing <code>λ/2</code> &nbsp; bright where path difference <code>= nλ</code>, dark where <code>= (n + ½)λ</code> (sources in phase)</p>
  <h3>Keys</h3><p><kbd>Space</kbd> pause · right-click or the Erase tool removes things · <b>Block</b> tool: click to add a block, drag it to move, drag the square handle to resize and the round handle to turn it</p>`,
  revise: {
    ideas: [
      { lvl: "std", tag: "4PH1 3(a)", text: "Waves transfer energy (and information) without transferring matter. Transverse waves vibrate at right angles to the direction of travel (water ripples, light, all electromagnetic waves); longitudinal waves vibrate along it (sound)." },
      { lvl: "std", tag: "4PH1 3(a)", text: "Amplitude: the largest displacement from rest. Wavelength λ: the distance from one crest to the next. Frequency f: waves per second (Hz). Period T = 1/f. Wavefront: a line joining points on the same crest." },
      { lvl: "std", tag: "4PH1 3(a)", text: "Wave speed v = f × λ. The frequency is set by the source and never changes when the wave enters a new material; the speed and the wavelength do." },
      { lvl: "std", tag: "4PH1 3(a)", text: "Reflection: angle of incidence = angle of reflection. Refraction: a change of direction because the wave changes speed at a boundary; slower means shorter wavelength and bending towards the normal." },
      { lvl: "std", tag: "4PH1 3(a)", text: "Diffraction: waves spread out through a gap or round an edge. The spreading is greatest when the gap is about the same size as the wavelength." },
      { lvl: "std", tag: "4PH1 3(a)", text: "Doppler effect: a moving source squashes the waves in front of it (shorter λ, higher f) and stretches those behind it (longer λ, lower f)." },
      { lvl: "adv", tag: "Eduqas C3", text: "Superposition: where waves meet, their displacements add. Coherent sources (constant phase difference) give a steady interference pattern: in phase, constructive where the path difference is nλ, destructive where it is (n + ½)λ." },
      { lvl: "adv", tag: "Eduqas C3", text: "Young's double slit: λ = ay/D (a slit separation, y fringe spacing, D distance to the screen), valid when y ≪ D. Diffraction grating: d sin θ = nλ, giving sharp, bright orders." },
      { lvl: "adv", tag: "Eduqas C3", text: "Stationary waves form when two identical waves travel in opposite directions (often a wave and its reflection). Nodes are λ/2 apart; points between neighbouring nodes move in phase; no energy is carried along." },
      { lvl: "adv", tag: "Eduqas C3", text: "Refractive index n = c/v. Snell's law n₁ sin θ₁ = n₂ sin θ₂. Going into a slower material (higher n) the wave bends towards the normal. Critical angle: sin c = n₂/n₁; beyond it, total internal reflection." },
      { lvl: "beyond", tag: "Beyond the spec", text: "Single slit of width a: the first minimum is at sin θ = λ/a, so a narrower slit spreads the wave more. Wave impedance: a sudden change of impedance (not just of speed) is what causes partial reflection." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: () => `The dipper makes waves of wavelength ${tank.lambda} mm at ${(1000 * CW / tank.lambda).toFixed(1)} Hz. Calculate the wave speed in m/s.`, ans: () => `<ul><li>v = f × λ</li><li>= ${(1000 * CW / tank.lambda).toFixed(1)} × ${(tank.lambda / 1000).toFixed(3)} m</li><li>= ${(CW).toFixed(2)} m/s</li></ul>` },
      { lvl: "std", marks: 2, q: "A dipper makes 12 waves in 4.0 s. Calculate the frequency and the period.", ans: "<ul><li>f = 12 ÷ 4.0 = 3.0 Hz</li><li>T = 1/f = 0.33 s</li></ul>" },
      { lvl: "std", marks: 3, q: "Water waves pass from deep water into shallow water, where they travel more slowly. State what happens to their frequency, wavelength and direction (they meet the boundary at an angle).", ans: "<ul><li>Frequency stays the same</li><li>Wavelength decreases (v = fλ with v smaller)</li><li>They bend towards the normal (refraction)</li></ul>" },
      { lvl: "std", marks: 2, q: "Explain why you can hear someone talking round a corner but cannot see them.", ans: "<ul><li>Sound has a wavelength similar to the width of a doorway, so it diffracts (spreads) a lot</li><li>Light's wavelength is far smaller than the doorway, so it hardly diffracts</li></ul>" },
      { lvl: "std", marks: 2, q: "Give one difference between a transverse and a longitudinal wave, with an example of each.", ans: "<ul><li>Transverse: vibrations at right angles to the direction the wave travels, e.g. water ripples or light</li><li>Longitudinal: vibrations along the direction of travel, e.g. sound</li></ul>" },
      { lvl: "std", marks: 3, q: "An ambulance drives towards you with its siren on, passes and drives away. Describe and explain what you hear.", ans: "<ul><li>The pitch is higher as it approaches and lower as it moves away (Doppler effect)</li><li>Approaching, the waves in front are squashed: shorter wavelength, higher frequency</li><li>Moving away, the waves behind are stretched: longer wavelength, lower frequency</li></ul>" },
      { lvl: "adv", marks: 3, q: () => `Plane waves of wavelength ${tank.slits.n >= 2 ? tank.lambda : 10} mm pass through two slits ${tank.slits.sep} mm apart onto a screen ${screenX - tank.slits.x} mm away. Calculate the fringe spacing using λ = ay/D.`, ans: () => { const l = tank.slits.n >= 2 ? tank.lambda : 10, a = tank.slits.sep, D = screenX - tank.slits.x; return `<ul><li>y = λD/a</li><li>= ${l} × ${D} ÷ ${a}</li><li>= ${(l * D / a).toFixed(1)} mm (the formula assumes y ≪ D; the tank's exact theory tile allows for larger angles)</li></ul>`; } },
      { lvl: "adv", marks: 3, q: "A grating has 300 lines per mm. Light of wavelength 589 nm falls on it. Calculate the angle of the second-order maximum and the highest order seen.", ans: "<ul><li>d = 1/300 mm = 3.33 × 10⁻⁶ m</li><li>sin θ = 2 × 589 × 10⁻⁹ ÷ 3.33 × 10⁻⁶ = 0.353, θ = 20.7°</li><li>n ≤ d/λ = 5.66, so the highest order is 5</li></ul>" },
      { lvl: "adv", marks: 3, q: () => `A stationary wave forms between a dipper and a wall. The nodes are ${(tank.lambda / 2).toFixed(1)} mm apart and the frequency is ${(1000 * CW / tank.lambda).toFixed(1)} Hz. Calculate the speed of the progressive waves.`, ans: () => `<ul><li>λ = 2 × node spacing = ${tank.lambda} mm</li><li>v = fλ = ${(1000 * CW / tank.lambda).toFixed(1)} × ${(tank.lambda / 1000).toFixed(3)}</li><li>= ${CW.toFixed(2)} m/s</li></ul>` },
      { lvl: "adv", marks: 3, q: "A wave meets the boundary into a block of refractive index 1.50 at an angle of incidence of 40°, from a medium of index 1.00. Calculate the angle of refraction, and the critical angle for waves leaving the block.", ans: "<ul><li>sin θ₂ = 1.00 × sin 40° ÷ 1.50 = 0.429, θ₂ = 25.4°</li><li>sin c = 1/1.50 = 0.667</li><li>c = 41.8°</li></ul>" },
      { lvl: "adv", marks: 2, q: "Two dippers 40 mm apart vibrate in antiphase. Describe the water on the line exactly halfway between them, and explain.", ans: "<ul><li>It is calm (a nodal line)</li><li>The path difference is zero, but the sources are half a cycle apart, so a crest from one always meets a trough from the other (destructive interference)</li></ul>" },
      { lvl: "adv", marks: 3, q: "State the conditions needed to see a steady two-source interference pattern, and explain why two separate lamps do not give one.", ans: "<ul><li>The sources must be coherent: same frequency and a constant phase difference</li><li>(and similar amplitudes, for good contrast)</li><li>Two lamps emit in random, independent bursts, so their phase difference changes constantly and the pattern averages out</li></ul>" }
    ]
  }
});

function addNoise(t, r) { for (let k = 0; k < 3; k++) t.sources.push({ x: 40 + r() * 240, y: 20 + r() * 140, lambda: 9 + r() * 20, amp: 0.025, fixed: true, ph: r() * 6.28 }); }
// What the gap rule says about the current slit width and wavelength (shown in Measurements)
function gapVerdict() {
  const w = tank.slits.w, l = tank.lambda;
  if (!tank.slits.n) return "no slits";
  if (w < l) return tank.gapRule ? `gap ${w} < λ ${l} mm: blocked` : `gap < λ: weak, spreads everywhere`;
  if (w <= 1.2 * l) return `gap ≈ λ: most spreading`;
  return `gap ${(w / l).toFixed(1)}λ: less spreading`;
}
let lastPass = true;   // so a tip appears when the gap closes or opens
function gapTip() { const p = tank.gapPasses(); if (!tank.gapRule) { lastPass = p; return; } if (tank.slits.n && p !== lastPass) ui.tip(p ? "Gap ≥ wavelength: the wave gets through and diffracts." : "Gap narrower than the wavelength: the wave cannot pass and is reflected.", 3500); lastPass = p; }
function slitRun(r, lambda, d) {
  const t = new Tank(); t.plane = true; t.lambda = lambda; t.slits = { n: 2, w: 12, sep: d, x: 90 }; t.rebuild(); addNoise(t, r);
  for (let i = 0; i < 1000; i++) t.step(); return fringeSpacing(t.screen(290));
}

// ---- Controls ----
let g = ui.group("Scene");
S.scene = K.seg(g, { value: scene, options: [["one", "One source"], ["two", "Two sources"], ["single", "Single slit"], ["double", "Double slit"], ["refract", "Refraction"], ["lens", "Lens"], ["mirror", "Mirror"], ["doppler", "Doppler"], ["standing", "Stationary wave"], ["tir", "Inside a block"], ["blank", "Blank"]], on: setScene });
g = ui.group("Draw on the water");
S.tool = K.seg(g, { value: tool, options: [["source", "● Source"], ["wall", "▬ Wall"], ["glass", "◆ Glass"], ["block", "▭ Block"], ["erase", "⌫ Erase"], ["pa", "Probe A"], ["pb", "Probe B"]], on: v => { tool = v; ui.tip({ source: "Click to add a source · drag a source to move it", wall: "Drag to draw a wall", glass: "Drag to paint glass (slow region)", block: "Click to add a block · drag it to move · square handle: resize · round handle: turn",  erase: "Drag to rub out walls, glass and sources", pa: "Click to place probe A", pb: "Click to place probe B" }[v], 3500); } });
g = ui.group("Waves");
S.lambda = K.slider(g, { label: "Wavelength", min: 6, max: 40, step: 0.5, value: 16, fmt: v => `${v} mm · ${(1000 * CW / v).toFixed(1)} Hz`, on: v => { tank.lambda = v; tank.rebuild(); gapTip(); } });
S.amp = K.slider(g, { label: "Amplitude", min: 0.2, max: 2, step: 0.1, value: 1, on: v => tank.amp = v });
S.plane = K.toggle(g, { label: "Plane waves from the left (a straight dipper)", value: false, on: v => tank.plane = v });
S.mach = K.slider(g, { label: "Source speed", min: 0, max: 1.6, step: 0.05, value: 0, fmt: v => v ? v.toFixed(2) + " × wave speed" : "at rest", on: v => tank.mach = v });
g = ui.group("Barrier and glass");
S.ns = K.seg(g, { label: "Slits in the barrier", value: 0, options: [[0, "None"], [1, "1"], [2, "2"], [3, "3"], [5, "5"]], on: v => { tank.slits.n = v; tank.rebuild(); gapTip(); } });
S.sw = K.slider(g, { label: "Slit width", min: 2, max: 60, step: 1, value: 8, unit: "mm", on: v => { tank.slits.w = v; tank.rebuild(); gapTip(); } });
S.gapRule = K.seg(g, { label: "Gaps narrower than λ", value: "gcse", options: [["gcse", "GCSE rule"], ["real", "Real behaviour"]], on: v => { tank.gapRule = v === "gcse"; tank.rebuild(); lastPass = tank.gapPasses(); ui.tip(v === "gcse" ? "GCSE rule: a gap narrower than the wavelength blocks the wave (it reflects)." : "Real behaviour: a gap narrower than λ lets a weak wave through, which spreads out in all directions.", 4000); }, tip: "What happens when the gap is narrower than the wavelength. The GCSE rule says the wave cannot pass. In reality a small part leaks through and spreads out like a new point source." });
S.sep = K.slider(g, { label: "Slit separation d", min: 12, max: 90, step: 1, value: 40, unit: "mm", on: v => { tank.slits.sep = v; tank.rebuild(); } });
S.n = K.slider(g, { label: "Refractive index of drawn glass and the lens", min: 1, max: 3, step: 0.05, value: 1.5, on: v => { tank.n = v; tank.rebuild(); } });
S.refl = K.toggle(g, { label: "Partial reflections at the glass (off = no waves bounce back off the glass, so refraction is easier to see)", value: true, on: v => { tank.matched = !v; } });
// ---- Movable blocks of material ----
let selB = null;   // the block being edited
g = ui.group("Block of material"); const blockGroup = g;
const bNote = K.note(g, "Choose the <b>▭ Block</b> tool and click the water to add a block, or press <b>Add a block</b>.");
S.bshape = K.seg(g, { label: "Shape", value: "rect", options: [["rect", "Rectangle"], ["prism", "Prism (triangle)"]], on: v => { if (selB) { selB.shape = v; tank.rebuild(); } } });
S.bn = K.slider(g, { label: "Refractive index n", min: 1, max: 3, step: 0.01, value: 1.5, fmt: v => v.toFixed(2) + (v === 1 ? " (same as the water)" : ""), on: v => { if (selB) { selB.n = v; tank.rebuild(); } } });
S.bw = K.slider(g, { label: "Width", min: 6, max: 240, step: 1, value: 70, unit: "mm", on: v => { if (selB) { selB.w = v; tank.rebuild(); } } });
S.bh = K.slider(g, { label: "Height", min: 6, max: 170, step: 1, value: 50, unit: "mm", on: v => { if (selB) { selB.h = v; tank.rebuild(); } } });
S.ba = K.slider(g, { label: "Angle turned", min: -180, max: 180, step: 1, value: 0, unit: "°", on: v => { if (selB) { selB.ang = v * Math.PI / 180; tank.rebuild(); } } });
const rb = K.row(g); K.btn(rb, "＋ Add a block", () => addBlock(GW / 2, GH / 2)); const bDel = K.btn(rb, "Delete this block", () => { if (selB) { tank.blocks = tank.blocks.filter(b => b !== selB); selectBlock(tank.blocks[tank.blocks.length - 1] || null); tank.rebuild(); } }, "danger");
function addBlock(x, y, o = {}) {
  const b = Object.assign({ shape: S.bshape.value, cx: x, cy: y, w: 70, h: 50, ang: 0, n: S.bn.value }, o);
  tank.blocks.push(b); selectBlock(b); tank.rebuild(); return b;
}
function selectBlock(b) {
  selB = b; for (const k of ["bshape", "bn", "bw", "bh", "ba"]) S[k].el.style.opacity = b ? "" : ".45"; bDel.disabled = !b;
  bNote.innerHTML = b ? `Editing block ${tank.blocks.indexOf(b) + 1} of ${tank.blocks.length}. With the <b>▭ Block</b> tool: drag it to move, drag the square handle to resize, drag the round handle to turn it.` : "Choose the <b>▭ Block</b> tool and click the water to add a block, or press <b>Add a block</b>.";
  if (!b) return; S.bshape.set(b.shape); S.bn.set(b.n); S.bw.set(Math.round(b.w)); S.bh.set(Math.round(b.h)); S.ba.set(Math.round(b.ang * 180 / Math.PI));
}
// ---- A level extras ----
g = ui.group("A level"); const advGroup = g;
S.anti = K.toggle(g, { label: "Second dipper in antiphase (half a cycle out of step)", value: false, on: v => { tank.anti = v; } });
S.prof = K.seg(g, { label: "The intensity chart shows", value: "screen", options: [["screen", "Along the screen"], ["row", "Along the centre line"]], on: v => { profileMode = v; } });
K.note(g, "Hover over the water to see the path difference from the first two dippers, in wavelengths.");
ui.onLevel = v => { advGroup.style.display = v === "adv" ? "" : "none"; if (v !== "adv") { S.anti.set(false, true); } };
g = ui.group("View");
S.view = K.seg(g, { value: view, options: [["height", "Water height"], ["inten", "Intensity"]], on: v => view = v, tip: "Intensity is the time-averaged brightness: it makes interference patterns stand out." });
S.speed = K.slider(g, { label: "Simulation speed", min: 1, max: 6, step: 1, value: 3, fmt: v => v + "×", on: v => speed = v });
ui.headerSpeed(S.speed);   // playback speed lives in the header, beside Pause and Reset
S.absorb = K.toggle(g, { label: "Absorbing edges (off = waves bounce back)", value: true, on: v => tank.setEdges(v) });
const r1 = K.row(g); K.btn(r1, "Calm the water", () => tank.calm()); K.btn(r1, "Clear drawing", () => { tank.drawn.fill(0); tank.glass.fill(0); tank.blocks = []; selectBlock(null); tank.rebuild(); }, "danger");
g = ui.group("Measurements");
const read = K.readout(g, [["lam", "Wavelength"], ["f", "Frequency"], ["gap", "Gap vs wavelength"], ["fs", "Fringe spacing (screen)"], ["ft", "Theory (path difference λ)"], ["ns", "Node spacing (centre line)"], ["nt", "Theory λ/2"]]);
K.note(g, "The dashed line is the screen. Drag it sideways. The right-hand chart shows the intensity along it (or along the centre line, at A level).");

// ---- Scenes ----
function setScene(s) {
  scene = s; S.scene.set(s); tank.calm(); tank.drawn.fill(0); tank.glass.fill(0); tank.blocks = []; selectBlock(null); tank.sources = []; probes.forEach(p => p.h = []);
  S.prof.set(s === "standing" ? "row" : "screen", true);
  let plane = false, ns = 0, mach = 0, lam = 16, sw = 8, sep = 40; probes[0].x = 200; probes[0].y = 60; probes[1].x = 200; probes[1].y = 120; screenX = 290;
  if (s === "one") tank.sources.push({ x: 160, y: 90 });
  if (s === "two") { tank.sources.push({ x: 70, y: 66 }, { x: 70, y: 114 }); }
  if (s === "single") { plane = true; ns = 1; sw = 14; lam = 12; }
  if (s === "double") { plane = true; ns = 2; lam = 10; sw = 12; }   // slits a little wider than λ, so the wave gets through
  if (s === "refract") { plane = true; addBlock(205, 90, { shape: "rect", w: 110, h: 130, ang: 30 * Math.PI / 180, n: 1.5 }); probes[0].x = 60; probes[0].y = 90; probes[1].x = 205; probes[1].y = 90; }   // a glass block turned 30°: waves meet its face at 30° to the normal
  if (s === "standing") { plane = true; for (let y = 1; y < GH - 1; y++) for (let x = 260; x < 263; x++) tank.drawn[x + y * GW] = 1; probes[0].x = 200; probes[0].y = 90; probes[1].x = 204; probes[1].y = 90; }   // a straight wall reflects the plane waves back on themselves
  if (s === "tir") { addBlock(85, 90, { shape: "rect", w: 150, h: 150, ang: 0, n: 2 }); tank.sources.push({ x: 115, y: 90 }); probes[0].x = 230; probes[0].y = 90; probes[1].x = 230; probes[1].y = 40; }   // a dipper inside a block of glass
  if (s === "lens") { plane = true; lam = 12; const R = 120, t = 20; for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (Math.hypot(x - (100 + R - t), y - 90) < R && Math.hypot(x - (100 - R + t), y - 90) < R) tank.glass[x + y * GW] = 1; probes[0].x = 215; probes[0].y = 90; probes[1].x = 215; probes[1].y = 40; }
  if (s === "mirror") { lam = 12; const f = 55; for (let y = 6; y < GH - 6; y++) { const x = Math.round(285 - (y - 90) ** 2 / (4 * f)); for (let k = 0; k < 3; k++) tank.drawn[x + k + y * GW] = 1; } tank.sources.push({ x: 285 - f, y: 90 }); probes[0].x = 60; probes[0].y = 50; probes[1].x = 60; probes[1].y = 130; screenX = 40; }
  if (s === "doppler") { tank.sources.push({ x: 30, y: 90 }); mach = 0.5; probes[0].x = 280; probes[0].y = 90; probes[1].x = 30; probes[1].y = 40; }
  S.plane.set(plane, true); S.ns.set(ns, true); S.mach.set(mach, true); S.lambda.set(lam, true); S.sw.set(sw, true); S.sep.set(sep, true);
  tank.rebuild(); lastPass = tank.gapPasses();
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
  const u = tank.u, I = tank.inten, wall = tank.wall, glass = tank.matl;
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
  // blocks of material: outline, refractive index, and (for the one being edited) its handles
  for (const b of tank.blocks) {
    const P = blockCorners(b), sel = b === selB; c.strokeStyle = sel ? "#ffe66d" : "rgba(170,255,200,.8)"; c.lineWidth = sel ? 2 : 1.3;
    c.beginPath(); P.forEach((q, k) => k ? c.lineTo(X(q.x), Y(q.y)) : c.moveTo(X(q.x), Y(q.y))); c.closePath(); c.stroke();
    c.fillStyle = "rgba(255,255,255,.9)"; c.textAlign = "center"; const lp = toWorld(b, 0, b.shape === "prism" ? b.h / 4 : -b.h / 2 + 10); c.fillText("n = " + b.n.toFixed(2), X(lp.x), Y(lp.y) + 4);   // label just inside the top edge (the base of a prism)
    if (sel && tool === "block") {
      const h = blockHandles(b); c.fillStyle = "#ffe66d"; c.fillRect(X(h.size.x) - 5, Y(h.size.y) - 5, 10, 10);
      c.strokeStyle = "#ffe66d"; c.lineWidth = 1.2; const top = toWorld(b, 0, -b.h / 2); c.beginPath(); c.moveTo(X(top.x), Y(top.y)); c.lineTo(X(h.rot.x), Y(h.rot.y)); c.stroke();
      c.beginPath(); c.arc(X(h.rot.x), Y(h.rot.y), 6, 0, 6.3); c.fill();
    }
  }
  c.lineWidth = 1;
  // sources and probes
  for (const sc of tank.sources) { const p = 3 + 2 * Math.sin(sc.ph || 0); c.fillStyle = "#fff"; c.beginPath(); c.arc(X(sc.x), Y(sc.y), 4, 0, 6.3); c.fill(); c.strokeStyle = "rgba(255,255,255,.6)"; c.beginPath(); c.arc(X(sc.x), Y(sc.y), 6 + p, 0, 6.3); c.stroke(); }
  probes.forEach((p, k) => { const col = k ? "#ffb454" : "#7ee787"; c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.arc(X(p.x), Y(p.y), 7, 0, 6.3); c.stroke(); c.fillStyle = col; c.textAlign = "left"; c.fillText(k ? "B" : "A", X(p.x) + 10, Y(p.y) + 4); });
  // scale bar: 50 mm
  c.strokeStyle = "#fff"; c.lineWidth = 2; c.beginPath(); c.moveTo(ox + 14, oy + GH * s - 14); c.lineTo(ox + 14 + 50 * s, oy + GH * s - 14); c.stroke(); c.fillStyle = "#fff"; c.textAlign = "left"; c.fillText("5 cm", ox + 14, oy + GH * s - 20);
  if (hover) {
    // A level: path difference from the first two dippers, in wavelengths
    const d = tank.sources.filter(q => !q.fixed); let pd = "";
    if (ui.level === "adv" && d.length >= 2) pd = ` · path difference ${(Math.abs(Math.hypot(hover.x - d[0].x, hover.y - d[0].y) - Math.hypot(hover.x - d[1].x, hover.y - d[1].y)) / tank.lambda).toFixed(2)} λ`;
    ui.hud(`x ${hover.x.toFixed(0)} mm · y ${hover.y.toFixed(0)} mm${pd}`);
  } else ui.hud("");
}

// ---- Mouse / touch ----
const toGrid = p => ({ x: (p.x - vr.ox) / vr.s - .5, y: (p.y - vr.oy) / vr.s - .5 });
let dragSrc = null, lastPt = null, dragScreen = false, blockDrag = null;   // blockDrag: { mode: "move" | "size" | "rot", dx, dy }
function brush(x, y, rad, fn) { for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) { const xx = Math.round(x + dx), yy = Math.round(y + dy); if (dx * dx + dy * dy <= rad * rad && xx > 0 && xx < GW - 1 && yy > 0 && yy < GH - 1) fn(xx + yy * GW); } }
function stroke(a, b) {
  const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y)));
  for (let k = 0; k <= n; k++) { const x = a.x + (b.x - a.x) * k / n, y = a.y + (b.y - a.y) * k / n;
    if (tool === "wall") brush(x, y, 1.5, i => tank.drawn[i] = 1);
    if (tool === "glass") brush(x, y, 6, i => tank.glass[i] = 1);
    if (tool === "erase") { brush(x, y, 6, i => { tank.drawn[i] = 0; tank.glass[i] = 0; }); tank.sources = tank.sources.filter(s => Math.hypot(s.x - x, s.y - y) > 7); const nb = tank.blocks.filter(b => !insideBlock(b, x, y)); if (nb.length !== tank.blocks.length) { tank.blocks = nb; if (!nb.includes(selB)) selectBlock(nb[nb.length - 1] || null); } }
  }
  tank.rebuild();
}
K.pointer(cv.el, {
  down(p) {
    const q = toGrid(p), erase = p.e.button === 2;
    if (tool === "block") {   // grab a handle of the block being edited, or a block, or add a new one
      if (selB) { const h = blockHandles(selB); if (Math.hypot(q.x - h.size.x, q.y - h.size.y) < 6) { blockDrag = { mode: "size" }; return; } if (Math.hypot(q.x - h.rot.x, q.y - h.rot.y) < 7) { blockDrag = { mode: "rot" }; return; } }
      const hit = [...tank.blocks].reverse().find(b => insideBlock(b, q.x, q.y));
      if (hit) { selectBlock(hit); blockDrag = { mode: "move", dx: q.x - hit.cx, dy: q.y - hit.cy }; return; }
      if (p.e.button !== 2) { addBlock(q.x, q.y); blockDrag = { mode: "move", dx: 0, dy: 0 }; } return;
    }
    if (Math.abs(q.x - screenX) < 5 && tool !== "wall" && tool !== "glass") { dragScreen = true; return; }
    if (erase) { const keep = tool; tool = "erase"; stroke(q, q); tool = keep; return; }
    if (tool === "source") { dragSrc = tank.sources.find(s => Math.hypot(s.x - q.x, s.y - q.y) < 8); if (!dragSrc && tank.sources.length < 8) { dragSrc = { x: q.x, y: q.y }; tank.sources.push(dragSrc); } }
    else if (tool === "pa" || tool === "pb") { const pr = probes[tool === "pa" ? 0 : 1]; pr.x = K.clamp(Math.round(q.x), 2, GW - 3); pr.y = K.clamp(Math.round(q.y), 2, GH - 3); pr.h = []; }
    else { lastPt = q; stroke(q, q); }
  },
  drag(p) {
    const q = toGrid(p); hover = q;
    if (blockDrag && selB) {
      const b = selB;
      if (blockDrag.mode === "move") { b.cx = K.clamp(q.x - blockDrag.dx, 0, GW); b.cy = K.clamp(q.y - blockDrag.dy, 0, GH); }
      if (blockDrag.mode === "size") { const l = toLocal(b, q.x, q.y); b.w = K.clamp(Math.round(2 * Math.abs(l.lx)), 6, 240); b.h = K.clamp(Math.round(2 * Math.abs(l.ly)), 6, 170); S.bw.set(b.w); S.bh.set(b.h); }
      if (blockDrag.mode === "rot") { let a = Math.round(Math.atan2(q.x - b.cx, -(q.y - b.cy)) * 180 / Math.PI); if (a > 180) a -= 360; b.ang = a * Math.PI / 180; S.ba.set(a); }
      tank.rebuild(); return;
    }
    if (dragScreen) screenX = K.clamp(Math.round(q.x), 24, GW - 20);
    else if (dragSrc) { dragSrc.x = K.clamp(q.x, 3, GW - 4); dragSrc.y = K.clamp(q.y, 3, GH - 4); }
    else if (tool === "pa" || tool === "pb") { const pr = probes[tool === "pa" ? 0 : 1]; pr.x = K.clamp(Math.round(q.x), 2, GW - 3); pr.y = K.clamp(Math.round(q.y), 2, GH - 3); }
    else if (lastPt) { stroke(lastPt, q); lastPt = q; }
  },
  up() { dragSrc = null; lastPt = null; dragScreen = false; blockDrag = null; },
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
  const prof = tank.screen(screenX), alongRow = profileMode === "row" && ui.level === "adv";
  chScreen.opts.title = alongRow ? "Intensity along the centre line" : "Intensity along the screen"; chScreen.opts.xLabel = alongRow ? "distance from the left (mm)" : "position on screen y (mm)"; chScreen.opts.xMax = alongRow ? GW : GH;
  if (alongRow) { const rw = tank.row(GH / 2); chScreen.draw([{ pts: rw.map((v, x) => [x, v]).slice(20, GW - 16), type: "area", color: K.cssVar("--s0") }]); }
  else chScreen.draw([{ pts: prof.map((v, y) => [y, v]), type: "area", color: K.cssVar("--s0") }]);
  const wallX = scene === "standing" ? 255 : GW - 20, nsp = scene === "standing" || alongRow ? nodeSpacing(tank.row(GH / 2), 40, wallX) : null;
  read.set("ns", nsp ? nsp.toFixed(1) + " mm" : "–"); read.set("nt", scene === "standing" || alongRow ? (tank.lambda / 2).toFixed(1) + " mm" : "–");
  const fs = tank.slits.n >= 2 && tank.plane ? fringeSpacing(prof) : null, D = screenX - tank.slits.x;
  read.set("lam", tank.lambda + " mm"); read.set("gap", gapVerdict()); read.set("f", (1000 * CW / tank.lambda).toFixed(1) + " Hz");
  read.set("fs", fs ? fs.toFixed(1) + " mm" : "–"); read.set("ft", tank.slits.n >= 2 && D > 20 ? fringeTheory(tank.lambda, tank.slits.sep, D).toFixed(1) + " mm" : "–");
});
setScene("two");
ui.onLevel(ui.level);   // show or hide the A level group to match the level remembered from last time
ui.tip("Click the water to add a source · drag sources around · try the scenes on the right");
