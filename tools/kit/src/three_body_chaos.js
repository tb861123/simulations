/* =====================================================================
   THREE-BODY CHAOS
   Newton's law of gravitation between every pair of bodies:
        F = G m1 m2 / r²       (here G = 1)
   Two bodies give neat ellipses for ever. Add a third and there is, in
   general, no formula for the motion at all. Stranger still, the tiniest
   change at the start grows exponentially: the "twin universe" shows it.
   ===================================================================== */
const SOFT = 1e-4;   // softening: stops the force becoming infinite if two points pass through each other

class System {
  constructor(bodies) { this.b = bodies.map(q => Object.assign({ ax: 0, ay: 0 }, q)); this.t = 0; this.merge = false; this.acc(); }
  // acceleration of every body from every other body
  acc() {
    const b = this.b, n = b.length; for (const q of b) { q.ax = 0; q.ay = 0; }
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const dx = b[j].x - b[i].x, dy = b[j].y - b[i].y, r2 = dx * dx + dy * dy + SOFT, inv = 1 / (r2 * Math.sqrt(r2));
      b[i].ax += b[j].m * dx * inv; b[i].ay += b[j].m * dy * inv; b[j].ax -= b[i].m * dx * inv; b[j].ay -= b[i].m * dy * inv;
    }
  }
  // a safe time step: a small fraction of the shortest "orbit time" of any pair
  suggestDt() { const b = this.b; let m = 0.004; for (let i = 0; i < b.length; i++) for (let j = i + 1; j < b.length; j++) { const d2 = (b[j].x - b[i].x) ** 2 + (b[j].y - b[i].y) ** 2 + SOFT, s = 0.02 * Math.sqrt(d2 * Math.sqrt(d2) / (b[i].m + b[j].m + 1e-9)); if (s < m) m = s; } return Math.max(m, 2e-6); }
  // leapfrog (kick-drift-kick): half-step the velocities, move, recompute forces, half-step again. Conserves energy well.
  step(dt) {
    const b = this.b; for (const q of b) { q.vx += q.ax * dt / 2; q.vy += q.ay * dt / 2; q.x += q.vx * dt; q.y += q.vy * dt; }
    this.acc(); for (const q of b) { q.vx += q.ax * dt / 2; q.vy += q.ay * dt / 2; } this.t += dt;
    if (this.merge) this.collide();
  }
  collide() { const b = this.b; for (let i = 0; i < b.length; i++) for (let j = i + 1; j < b.length; j++) { const A = b[i], B = b[j]; if (Math.hypot(A.x - B.x, A.y - B.y) < radius(A) + radius(B)) { const m = A.m + B.m; A.x = (A.x * A.m + B.x * B.m) / m; A.y = (A.y * A.m + B.y * B.m) / m; A.vx = (A.vx * A.m + B.vx * B.m) / m; A.vy = (A.vy * A.m + B.vy * B.m) / m; A.m = m; b.splice(j, 1); this.acc(); return; } } }
  advance(T) { const end = this.t + T; let n = 0; while (this.t < end && n++ < 2e6) this.step(Math.min(this.suggestDt(), end - this.t)); }
  energy() { const b = this.b; let ke = 0, pe = 0; for (let i = 0; i < b.length; i++) { ke += 0.5 * b[i].m * (b[i].vx ** 2 + b[i].vy ** 2); for (let j = i + 1; j < b.length; j++) pe -= b[i].m * b[j].m / Math.sqrt((b[j].x - b[i].x) ** 2 + (b[j].y - b[i].y) ** 2 + SOFT); } return { ke, pe, e: ke + pe }; }
  com() { let m = 0, x = 0, y = 0; for (const q of this.b) { m += q.m; x += q.m * q.x; y += q.m * q.y; } return { x: x / m, y: y / m, m }; }
  // has a body escaped? (far from the others and moving away)
  escaped(R = 12) { const c = this.com(); return this.b.some(q => Math.hypot(q.x - c.x, q.y - c.y) > R); }
}
const radius = q => 0.012 * Math.cbrt(q.m / 1) + 0.004;
function zeroMomentum(bs) { let m = 0, px = 0, py = 0, x = 0, y = 0; for (const q of bs) { m += q.m; px += q.m * q.vx; py += q.m * q.vy; x += q.m * q.x; y += q.m * q.y; } for (const q of bs) { q.vx -= px / m; q.vy -= py / m; q.x -= x / m; q.y -= y / m; } return bs; }
const COLS = ["#ffd166", "#5ad1ff", "#ff7b9c", "#7ee787", "#c4a1ff", "#ffffff"];
const PRESETS = {
  figure8: { name: "Figure-eight", make: () => { const x = 0.97000436, y = -0.24308753, vx = -0.93240737, vy = -0.86473146; return [{ m: 1, x, y, vx: -vx / 2, vy: -vy / 2 }, { m: 1, x: -x, y: -y, vx: -vx / 2, vy: -vy / 2 }, { m: 1, x: 0, y: 0, vx, vy }]; } },
  lagrange: { name: "Lagrange triangle", make: () => { const R = 1, w = Math.sqrt(1 / (Math.sqrt(3) * R * R * R)); return [0, 1, 2].map(k => { const a = k * 2.0943951 + 1.5708; return { m: 1, x: R * Math.cos(a), y: R * Math.sin(a), vx: -w * R * Math.sin(a), vy: w * R * Math.cos(a) }; }); } },
  pyth: { name: "Pythagorean 3-4-5", make: () => zeroMomentum([{ m: 3, x: 1, y: 3, vx: 0, vy: 0 }, { m: 4, x: -2, y: -1, vx: 0, vy: 0 }, { m: 5, x: 1, y: -1, vx: 0, vy: 0 }]) },
  moon: { name: "Star, planet, moon", make: () => zeroMomentum([{ m: 1, x: 0, y: 0, vx: 0, vy: 0 }, { m: 0.01, x: 1, y: 0, vx: 0, vy: 1.005 }, { m: 1e-4, x: 1.035, y: 0, vx: 0, vy: 1.005 + Math.sqrt(0.01 / 0.035) }]) },
  binary: { name: "Planet of two suns", make: () => zeroMomentum([{ m: 0.5, x: -0.4, y: 0, vx: 0, vy: -Math.sqrt(1 / 0.8) / 2 }, { m: 0.5, x: 0.4, y: 0, vx: 0, vy: Math.sqrt(1 / 0.8) / 2 }, { m: 1e-5, x: 2.4, y: 0, vx: 0, vy: Math.sqrt(1 / 2.4), planet: true }]) },
  trojan: { name: "Trojan asteroids", make: () => { const bs = [{ m: 1, x: 0, y: 0, vx: 0, vy: 0 }, { m: 0.001, x: 1, y: 0, vx: 0, vy: Math.sqrt(1.001) }]; for (const a of [1.047, -1.047, 1.2, -0.9, 3.14]) bs.push({ m: 1e-9, x: Math.cos(a), y: Math.sin(a), vx: -Math.sin(a) * Math.sqrt(1.001), vy: Math.cos(a) * Math.sqrt(1.001) }); return zeroMomentum(bs); } },
  trisolaris: { name: "Planet of three suns", make: r => { const bs = randomTriple(r || K.rng(7), 1.6); bs.push({ m: 1e-6, x: bs[0].x + 0.14, y: bs[0].y, vx: bs[0].vx, vy: bs[0].vy + Math.sqrt(1 / 0.14), planet: true }); return bs; } },
  random: { name: "Random triple", make: r => randomTriple(r || K.rng(Date.now()), 1.2) },
};
function randomTriple(r, size) { return zeroMomentum([0, 1, 2].map(() => ({ m: 1, x: (r() - .5) * 2 * size, y: (r() - .5) * 2 * size, vx: (r() - .5) * 0.8, vy: (r() - .5) * 0.8 }))); }
// distance between two universes: add up how far apart each body is from its twin
function gap(A, B) { let s = 0; const n = Math.min(A.b.length, B.b.length); for (let i = 0; i < n; i++) s += (A.b[i].x - B.b[i].x) ** 2 + (A.b[i].y - B.b[i].y) ** 2; return Math.sqrt(s); }
// Headless: how long until two universes that start a distance delta apart have clearly separated (gap > 0.3)?
function horizon(bodies, delta, tMax = 150) { const A = new System(bodies), B = new System(bodies.map(q => Object.assign({}, q))); B.b[0].x += delta; B.acc(); let n = 0; while (A.t < tMax && n++ < 3e6) { const dt = Math.min(A.suggestDt(), B.suggestDt()); A.step(dt); B.step(dt); if (gap(A, B) > 0.3) return A.t; if (A.escaped(30)) return null; } return null; }

// ---------------------------------------------------------------- page
let sys, twin, preset = "figure8", speed = 1, delta = 1e-6, showTwin = true, hist, e0 = 0, cam = { x: 0, y: 0, s: 150, zoom: 1 }, trails = [], twinTrails = [], flux0 = 1, drag = null, newMass = 1; const S = {};
const ui = K.app({
  title: "Three-Body Chaos", subject: "Astrophysics", blurb: "Newton's gravity, three bodies, and the reason long-range prediction is impossible.",
  reset: () => load(preset),
  missions: [
    { title: "Two universes", q: "The ghost rings are a twin universe, identical except that one star started <b>one millionth</b> of a unit to the side. Watch the left-hand chart. How long before the twins disagree completely?", hint: "The gap grows by the same <i>factor</i> in each interval of time: a straight line on the logarithmic chart. That is exponential growth, the signature of chaos. Once the gap is as big as the orbits, prediction has failed.", setup: () => { S.twin.set(true, true); setDelta(-6); load("random"); } },
    { title: "Does better measurement help?", q: "Make the starting difference 1000 times smaller (drag it from 10⁻⁶ to 10⁻⁹). Predict: will the twins now agree for 1000 times longer?", hint: "No. Each factor of 1000 in precision buys only the same fixed amount of extra time, because the error grows exponentially. To predict twice as far ahead you must <i>square</i> your precision. This is why weather forecasts run out after about two weeks.", setup: () => { S.twin.set(true, true); setDelta(-6); load("pyth"); } },
    { title: "A perfect figure-eight", q: "Three equal stars chase each other round a figure-eight: an exact solution found in 1993. Is it stable? Pause, drag one star a little, and play.", hint: "It survives small nudges (it is one of very few stable three-body orbits) but a larger push sends it into chaos, usually ending with one star thrown out. Nobody has yet found a real figure-eight system in the sky.", setup: () => { load("figure8"); } },
    { title: "The triangle that cannot last", q: "Lagrange showed in 1772 that three equal masses can orbit in a perfect triangle. The twin starts 10⁻⁶ away. How long does the real one keep its shape?", hint: "With equal masses the triangle is unstable: rounding errors in the arithmetic (about 10⁻¹⁶) are enough to break it eventually. Nature has rounding errors too. Now look at the Trojan asteroids, where one mass dominates and the triangle <i>is</i> stable.", setup: () => { S.twin.set(true, true); setDelta(-6); load("lagrange"); } },
    { title: "Trojan asteroids", q: "A star, a Jupiter-like planet, and asteroids placed 60° ahead of and behind the planet, plus some elsewhere. Which asteroids keep their place?", hint: "Those at 60° ahead and behind (the L4 and L5 Lagrange points) stay put: thousands of real Trojan asteroids share Jupiter's orbit there. The others wander. Chaos and stability can exist side by side in one system.", setup: () => { S.twin.set(false, true); load("trojan"); } },
    { title: "Planet of three suns", q: "A planet orbits one sun of a chaotic triple. The right-hand chart shows the sunlight it receives; the green band is habitable. How long do the 'stable eras' last? Could life adapt?", hint: "Calm stretches end without warning when another sun swings past: the planet may be stolen by a different sun, frozen in deep space or scorched. This is the setting of Liu Cixin's novel <i>The Three-Body Problem</i>. Real triple stars that last are hierarchical: a close pair with a distant third.", setup: () => { S.twin.set(false, true); load("trisolaris"); } },
    { title: "Build a solar system", q: "Start with star, planet and moon. Drag in empty space to launch new bodies (the drag sets speed and direction). Can you add a second planet with its own moon that survives 50 time units?", hint: "Stable systems are hierarchical: each orbit is much smaller than the next one out, and small bodies stay well inside their planet's sphere of influence (the Hill sphere). Put orbits too close together and they perturb each other into chaos.", setup: () => { S.twin.set(false, true); load("moon"); S.mass.set(-2, true); } },
  ],
  batch: [
    { title: "The horizon of predictability", question: "How much longer can you predict if you measure more precisely?", how: "The Pythagorean system, with the twin started 10ˣ away. We time how long until the twins are 0.3 apart.", xLabel: "log₁₀ of the starting difference", yLabel: "time until the twins disagree", xs: [-12, -10, -8, -6, -4, -2], reps: 5, fit: true, yMin: 0,
      run: (x, r) => horizon(PRESETS.pyth.make().map(q => Object.assign(q, { vx: q.vx + r.gauss() * 1e-3, vy: q.vy + r.gauss() * 1e-3 })), Math.pow(10, x), 200), note: "Each run begins from a very slightly different version of the system, and in a chaotic system close encounters (where errors grow fastest) come at different times. A straight line here means time ∝ log(precision): a million times more precision buys only a fixed number of extra time units." },
    { title: "Lifetimes of triple stars", question: "How long does a random triple system last before a star is thrown out?", how: "Three equal stars start at random positions with small random velocities. We time how long until one is 12 units from the centre of mass.", xLabel: "", yLabel: "time until a star is ejected", reps: 120, bins: 24, lo: 0, hi: 300,
      run: (x, r) => { const s = new System(randomTriple(r, 1.2)); let n = 0; while (s.t < 300 && n++ < 3e5) { s.step(s.suggestDt()); if (n % 20 === 0 && s.escaped(12)) return s.t; } return 300; }, note: "There is no typical lifetime: most triples break up quickly, but a few last a very long time (those piled up at 300 were still going when we stopped). The distribution has a long tail. Almost every triple ends as a close binary plus one runaway star." },
    { title: "How robust is the figure-eight?", question: "How big a nudge can the figure-eight orbit take?", how: "Every velocity gets a random kick of the given size. Result = 1 if the three stars are still together after 100 time units (about 16 orbits).", xLabel: "size of the random kick to each velocity", yLabel: "chance of survival", xs: [0, 0.01, 0.02, 0.04, 0.07, 0.1, 0.15], reps: 12, yMin: 0, yMax: 1.05,
      run: (x, r) => { const s = new System(zeroMomentum(PRESETS.figure8.make().map(q => Object.assign(q, { vx: q.vx + r.gauss() * x, vy: q.vy + r.gauss() * x })))); let n = 0; while (s.t < 100 && n++ < 4e5) { s.step(s.suggestDt()); if (n % 50 === 0 && s.escaped(8)) return 0; } return 1; }, note: "Whether a kicked figure-eight survives depends on the direction of the kick as well as its size, so results near the edge of the stable region are a matter of chance." },
    { title: "A planet with two suns", question: "How close to a binary star can a planet orbit safely?", how: "Two equal suns orbit 0.8 apart. A planet starts on a circular orbit of the given radius (random starting angle). Result = 1 if it is still within 3× its starting distance after 150 time units.", xLabel: "planet's orbit radius ÷ separation of the suns", yLabel: "chance of survival", xs: [1.2, 1.5, 1.8, 2.1, 2.4, 2.8, 3.2], reps: 10, yMin: 0, yMax: 1.05,
      run: (x, r) => { const a = r() * 6.283, R = x * 0.8, v = Math.sqrt(1 / R); const s = new System(zeroMomentum([{ m: 0.5, x: -0.4, y: 0, vx: 0, vy: -Math.sqrt(1 / 0.8) / 2 }, { m: 0.5, x: 0.4, y: 0, vx: 0, vy: Math.sqrt(1 / 0.8) / 2 }, { m: 1e-6, x: R * Math.cos(a), y: R * Math.sin(a), vx: -v * Math.sin(a), vy: v * Math.cos(a) }])); let n = 0; while (s.t < 150 && n++ < 4e5) { s.step(s.suggestDt()); if (n % 50 === 0) { const d = Math.hypot(s.b[2].x, s.b[2].y); if (d > 3 * R || d < 0.3) return 0; } } return 1; },
      note: "Close in, the planet feels two separate suns tugging in turn and its orbit is chaotic; far out, the pair acts like one sun. Astronomers find the boundary at roughly 2 to 2.5 times the suns' separation, and real planets with two suns (such as Kepler-16b) orbit just outside it." },
  ],
  notes: `<h3>What is being calculated</h3><p>For every pair of bodies, Newton's law <code>F = Gm₁m₂/r²</code> (with G = 1). The equations of motion are stepped forward with the <b>leapfrog</b> method, using a time step that shrinks automatically during close encounters. The energy chart is a check on the arithmetic: total energy should stay constant.</p>
  <h3>The twin universe</h3><p>A second, invisible copy of the system is calculated alongside the first. Its first body starts a tiny distance to the side. The chart plots the total distance between the two universes on a logarithmic scale, so a straight rising line means exponential growth.</p>
  <h3>Assumptions and simplifications</h3><ul><li>Motion is in a flat plane (2-D). Real triples move in 3-D.</li><li>Bodies are points. They only merge if you switch collisions on.</li><li>Newtonian gravity only: no relativity, no tides, no gas.</li><li>Units are scaled: G = 1, and masses, distances and times are in arbitrary units. For Sun–Earth, 1 distance unit = 1 AU and 2π time units = 1 year.</li><li>Sunlight on the planet assumes star brightness ∝ mass³·⁵ and the inverse-square law.</li><li>The computer itself rounds numbers at about the 16th significant figure, so even the "real" universe on screen is one of many possible ones: fitting, for a chaotic system.</li></ul>
  <h3>Mouse</h3><p>Drag a body to move it · drag in empty space to launch a new body · when paused, drag an arrowhead to change a velocity · right-click a body to delete it · mouse wheel zooms.</p>`,
});
let g = ui.group("Systems");
S.preset = K.seg(g, { value: preset, options: Object.entries(PRESETS).map(([k, v]) => [k, v.name]), on: v => load(v) });
g = ui.group("Twin universe");
S.twin = K.toggle(g, { label: "Show the twin universe (ghost rings)", value: true, on: v => { showTwin = v; } });
S.delta = K.slider(g, { label: "Starting difference", min: -12, max: -2, step: 1, value: -6, fmt: v => `10<sup>${v}</sup> units`, on: v => { delta = Math.pow(10, v); load(preset, true); }, tip: "How far the twin's first body is displaced at t = 0." });
g = ui.group("Add your own");
S.mass = K.slider(g, { label: "Mass of new bodies", min: -6, max: 1, step: 0.5, value: 0, fmt: v => v === 0 ? "1 (a star)" : v <= -5 ? "tiny (asteroid)" : v <= -1.5 ? (Math.pow(10, v)).toPrecision(1) + " (planet)" : Math.pow(10, v).toPrecision(2), on: v => newMass = Math.pow(10, v) });
S.merge = K.toggle(g, { label: "Bodies merge when they collide", value: false, on: v => { sys.merge = v; twin.merge = v; } });
K.note(g, "Drag in empty space to launch a body. Pause to see and drag the velocity arrows.");
g = ui.group("View");
S.speed = K.slider(g, { label: "Speed", min: 0.1, max: 5, step: 0.1, value: 1, fmt: v => v.toFixed(1) + "×", on: v => speed = v });
S.auto = K.toggle(g, { label: "Camera follows the action", value: true });
const r1 = K.row(g); K.btn(r1, "Clear trails", () => { trails.forEach(t => t.length = 0); twinTrails.forEach(t => t.length = 0); });
g = ui.group("Measurements");
const read = K.readout(g, [["t", "Time"], ["gap", "Twins are apart by"], ["x10", "Error grows ×10 every"], ["de", "Energy drift"]]);

function setDelta(e) { S.delta.set(e); delta = Math.pow(10, e); }
function load(p, keep) {
  preset = p; S.preset.set(p); const bs = PRESETS[p].make(); bs.forEach((q, i) => q.c = q.planet ? "#7ee787" : q.m < 1e-6 ? "#c9d2e6" : COLS[i % COLS.length]);
  sys = new System(bs); makeTwin(); sys.merge = twin.merge = S.merge.value; e0 = sys.energy().e; hist = { gap: [], ke: [], pe: [], e: [], flux: [] }; trails = bs.map(() => []); twinTrails = bs.map(() => []); flux0 = flux() || 1; cam.zoom = 1; fit(true);
}
function makeTwin() { twin = new System(sys.b.map(q => Object.assign({}, q))); twin.t = sys.t; twin.b[0].x += delta; twin.acc(); twin.merge = sys.merge; }
function flux() { const p = sys.b.find(q => q.planet); if (!p) return null; let f = 0; for (const q of sys.b) if (q.m > 0.05) f += Math.pow(q.m, 3.5) / ((q.x - p.x) ** 2 + (q.y - p.y) ** 2 + 1e-4); return f; }
function fit(snap) { // aim the camera at the centre of mass and zoom to keep the bodies in view (ignoring any that have escaped)
  const c = sys.com(); let R = 0.6; for (const q of sys.b) { const d = Math.hypot(q.x - c.x, q.y - c.y); if (d < 14 && d > R) R = d; }
  const s = Math.min(cv.w, cv.h) / (2.5 * R), k = snap ? 1 : 0.03; cam.x += (c.x - cam.x) * k; cam.y += (c.y - cam.y) * k; cam.s += (s - cam.s) * k;
}
// ---- Drawing ----
const cv = ui.canvas(); let stars = [];
{ const r = K.rng(42); for (let i = 0; i < 260; i++) stars.push([r(), r(), r() * 1.3 + .3, r()]); }
const SX = x => cv.w / 2 + (x - cam.x) * cam.s * cam.zoom, SY = y => cv.h / 2 - (y - cam.y) * cam.s * cam.zoom, WX = px => cam.x + (px - cv.w / 2) / (cam.s * cam.zoom), WY = py => cam.y - (py - cv.h / 2) / (cam.s * cam.zoom);
const drawR = q => Math.max(2.5, 5 + 2.2 * Math.log10(q.m * 1000 + 1) + (q.m >= 0.1 ? 4 : 0));
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; if (S.auto.value && !drag) fit(false);
  const bg = c.createRadialGradient(w * .5, h * .5, 0, w * .5, h * .5, w * .75); bg.addColorStop(0, "#0b1026"); bg.addColorStop(1, "#02030a"); c.fillStyle = bg; c.fillRect(0, 0, w, h);
  for (const [x, y, r, a] of stars) { c.fillStyle = `rgba(255,255,255,${.25 + a * .6})`; c.fillRect(((x * w - cam.x * 6) % w + w) % w, ((y * h + cam.y * 6) % h + h) % h, r, r); }
  // trails: older parts fade out
  c.lineCap = "round"; c.lineJoin = "round";
  const trail = (pts, col, wd, dash) => { const n = pts.length; if (n < 2) return; c.strokeStyle = col; c.setLineDash(dash || []); for (let k = 0; k < 6; k++) { const a = Math.floor(n * k / 6), b = Math.min(n - 1, Math.floor(n * (k + 1) / 6)); if (b <= a) continue; c.globalAlpha = (k + 1) / 6 * (dash ? .5 : .9); c.lineWidth = wd * (0.5 + k / 10); c.beginPath(); c.moveTo(SX(pts[a][0]), SY(pts[a][1])); for (let i = a + 1; i <= b; i++) c.lineTo(SX(pts[i][0]), SY(pts[i][1])); c.stroke(); } c.globalAlpha = 1; c.setLineDash([]); };
  if (showTwin) twin.b.forEach((q, i) => twinTrails[i] && trail(twinTrails[i], "#ffffff", 1, [3, 5]));
  sys.b.forEach((q, i) => trails[i] && trail(trails[i], q.c, q.m < 1e-6 ? 1.2 : 2.2));
  // bodies: a soft glow plus a bright core
  c.globalCompositeOperation = "lighter";
  for (const q of sys.b) { const x = SX(q.x), y = SY(q.y), r = drawR(q), gl = q.m >= 0.1 ? r * 4.5 : r * 2.2; const gr = c.createRadialGradient(x, y, 0, x, y, gl); gr.addColorStop(0, q.c); gr.addColorStop(.25, q.c + "88"); gr.addColorStop(1, q.c + "00"); c.fillStyle = gr; c.beginPath(); c.arc(x, y, gl, 0, 6.3); c.fill(); }
  c.globalCompositeOperation = "source-over";
  for (const q of sys.b) { c.fillStyle = "#fff"; c.beginPath(); c.arc(SX(q.x), SY(q.y), drawR(q) * .55, 0, 6.3); c.fill(); }
  if (showTwin) { c.strokeStyle = "rgba(255,255,255,.85)"; c.lineWidth = 1.5; c.setLineDash([3, 3]); for (const q of twin.b) { c.beginPath(); c.arc(SX(q.x), SY(q.y), drawR(q) + 4, 0, 6.3); c.stroke(); } c.setLineDash([]); }
  // velocity arrows when paused (drag the arrowhead to change the velocity)
  if (!ui.playing) for (const q of sys.b) { const x0 = SX(q.x), y0 = SY(q.y), x1 = SX(q.x + q.vx * VS), y1 = SY(q.y + q.vy * VS); c.strokeStyle = c.fillStyle = "#7ee787"; c.lineWidth = 2; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); c.beginPath(); c.arc(x1, y1, 5, 0, 6.3); c.fill(); }
  if (drag && drag.type === "launch") { c.strokeStyle = "#7ee787"; c.lineWidth = 2; c.setLineDash([5, 4]); c.beginPath(); c.moveTo(SX(drag.x0), SY(drag.y0)); c.lineTo(drag.px, drag.py); c.stroke(); c.setLineDash([]); c.fillStyle = "#7ee787"; c.beginPath(); c.arc(SX(drag.x0), SY(drag.y0), 5, 0, 6.3); c.fill(); }
  const f = flux(); let era = "";
  if (f != null) { const rel = f / flux0; era = rel > 2.2 ? "<b style='color:#ff6b81'>CHAOTIC ERA: scorched</b>" : rel < 0.45 ? "<b style='color:#5ad1ff'>CHAOTIC ERA: frozen</b>" : "<b style='color:#7ee787'>Stable era</b>"; }
  ui.hud(`t = ${sys.t.toFixed(1)}${era ? "<br>" + era : ""}${sys.escaped(12) ? "<br><span style='color:#ffb454'>a body has been ejected</span>" : ""}`);
}
// ---- Pointer ----
const VS = 0.35;
function pick(p, list, fn, tol) { let best = null, bd = tol; list.forEach((q, i) => { const [x, y] = fn(q); const d = Math.hypot(SX(x) - p.x, SY(y) - p.y); if (d < bd) { bd = d; best = i; } }); return best; }
K.pointer(cv.el, {
  down(p) {
    if (p.e.button === 2) { const i = pick(p, sys.b, q => [q.x, q.y], 18); if (i != null && sys.b.length > 1) { sys.b.splice(i, 1); trails.splice(i, 1); twinTrails.splice(i, 1); sys.acc(); makeTwin(); e0 = sys.energy().e; } return; }
    if (!ui.playing) { const i = pick(p, sys.b, q => [q.x + q.vx * VS, q.y + q.vy * VS], 12); if (i != null) { drag = { type: "vel", i }; return; } }
    const i = pick(p, sys.b, q => [q.x, q.y], 18); if (i != null) { drag = { type: "move", i }; return; }
    drag = { type: "launch", x0: WX(p.x), y0: WY(p.y), px: p.x, py: p.y };
  },
  drag(p) {
    if (!drag) return; const q = sys.b[drag.i];
    if (drag.type === "move") { q.x = WX(p.x); q.y = WY(p.y); trails[drag.i].length = 0; sys.acc(); }
    else if (drag.type === "vel") { q.vx = (WX(p.x) - q.x) / VS; q.vy = (WY(p.y) - q.y) / VS; }
    else { drag.px = p.x; drag.py = p.y; }
  },
  up(p) {
    if (!drag) return;
    if (drag.type === "launch") { const vx = (WX(p.x) - drag.x0) * 1.5, vy = (WY(p.y) - drag.y0) * 1.5, i = sys.b.length; sys.b.push({ m: newMass, x: drag.x0, y: drag.y0, vx, vy, ax: 0, ay: 0, c: newMass < 1e-6 ? "#c9d2e6" : COLS[i % COLS.length] }); trails.push([]); twinTrails.push([]); }
    sys.acc(); makeTwin(); e0 = sys.energy().e; hist.gap = []; drag = null;
  },
});
cv.el.addEventListener("wheel", e => { e.preventDefault(); cam.zoom = K.clamp(cam.zoom * (e.deltaY < 0 ? 1.15 : 0.87), 0.15, 12); }, { passive: false });
const chG = K.chart(ui.dock, { title: "Twin universes: how far apart?", xLabel: "time", yLabel: "log₁₀ (gap)" });
const chE = K.chart(ui.dock, { title: "Energy", xLabel: "time", yLabel: "energy" });
let frame = 0, lyap = null;
ui.run(dtf => {
  if (drag && drag.type !== "launch") return;
  const end = sys.t + dtf * speed; let n = 0;
  while (sys.t < end && n++ < 3000) { const dt = Math.min(sys.suggestDt(), twin.suggestDt(), end - sys.t + 1e-9); sys.step(dt); twin.step(dt); }
  const push = (tr, bs) => bs.forEach((q, i) => { const t = tr[i]; if (!t) return; const l = t[t.length - 1]; if (!l || Math.hypot(SX(q.x) - SX(l[0]), SY(q.y) - SY(l[1])) > 2) { t.push([q.x, q.y]); if (t.length > 900) t.shift(); } });
  push(trails, sys.b); push(twinTrails, twin.b); twinTrails.forEach(t => { while (t.length > 160) t.shift(); });
  if (frame % 2 === 0) { const en = sys.energy(), gp = gap(sys, twin); hist.gap.push([sys.t, Math.log10(gp + 1e-16)]); hist.ke.push([sys.t, en.ke]); hist.pe.push([sys.t, en.pe]); hist.e.push([sys.t, en.e]); const f = flux(); if (f != null) hist.flux.push([sys.t, Math.log10(f / flux0)]); for (const k in hist) if (hist[k].length > 1200) hist[k].shift(); }
}, () => {
  draw(); if (frame++ % 4) return;
  // estimate the growth rate from the part of the curve before the gap saturates
  const pts = hist.gap.filter(p => p[1] < -1 && p[1] > -15); lyap = pts.length > 30 ? K.linfit(pts) : null;
  chG.draw([{ pts: hist.gap, color: "#ff7b9c", width: 2.2 }], { hlines: [{ y: 0, label: "as big as the orbits: prediction has failed", color: K.cssVar("--warn") }], yMin: Math.log10(delta) - 1, yMax: 1.5 });
  if (hist.flux.length) chE.draw([{ pts: hist.flux, color: "#ffd166", width: 2 }], { title: "Sunlight on the planet", yLabel: "log₁₀ (sunlight ÷ start)", yMin: -3, yMax: 3, hlines: [{ y: Math.log10(2.2), color: "#ff6b81", label: "too hot" }, { y: Math.log10(0.45), color: "#5ad1ff", label: "too cold" }] });
  else chE.draw([{ pts: hist.ke, color: "#ffb454", label: "kinetic" }, { pts: hist.pe, color: "#5ad1ff", label: "potential" }, { pts: hist.e, color: "#7ee787", label: "total", width: 2.4 }], { title: "Energy", yLabel: "energy", yMin: null, yMax: null });
  const gp = gap(sys, twin); read.set("t", sys.t.toFixed(1)); read.set("gap", gp < 1e-3 ? gp.toExponential(1) : gp.toFixed(2)); read.set("x10", lyap && lyap.m > 0.01 ? (1 / lyap.m).toFixed(1) + " time units" : "–"); read.set("de", (Math.abs((sys.energy().e - e0) / (e0 || 1)) * 100).toExponential(1) + "%");
});
load("pyth");
ui.tip("The white rings are a twin universe that started a millionth of a unit away. Watch them part company.", 9000);
