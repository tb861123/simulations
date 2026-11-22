/* =====================================================================
   STRANGE ATTRACTORS
   Three simple equations say how fast x, y and z change. Follow them
   from any starting point and the path settles onto a shape: the
   ATTRACTOR. Some attractors are a single point or a loop. "Strange"
   ones are fractal surfaces folded over and over, and on them the motion
   is CHAOTIC: two paths that start a hair's breadth apart drift apart
   exponentially fast, so long-term prediction is impossible even though
   the rules contain no randomness at all.

   The rate at which nearby paths separate is the largest LYAPUNOV
   EXPONENT λ: the gap grows like e^(λt). λ > 0 means chaos; λ = 0 a
   steady cycle; λ < 0 everything settles to a point.

   The picture: up to a million particles, each following the equations,
   moved by the graphics card and drawn with glowing trails. The Batch
   run and the Lyapunov estimates use the main processor.
   ===================================================================== */
"use strict";
/* Each attractor: the equations (for the CPU), the same in GLSL (for the graphics card), its parameters, a time step,
   where its middle is and how big it is (to fit the view), and a camera angle. Maps (Clifford, de Jong) jump rather than flow. */
const ATT = {
  rossler: { start: [1, 1, 1], name: "Rössler", eq: "x′ = −y − z<br>y′ = x + a·y<br>z′ = b + z(x − c)", p: [["a", 0.2, 0, 0.4], ["b", 0.2, 0, 2], ["c", 5.7, 1, 12]], dt: 0.02, ctr: [0, 0, 3], sc: 0.075, cam: [0.6, 0.35],
    f: (x, y, z, P) => [-y - z, x + P[0] * y, P[1] + z * (x - P[2])], glsl: "vec3(-p.y - p.z, p.x + P.x * p.y, P.y + p.z * (p.x - P.z))", lam: 0.0714 },
  aizawa: { start: [0.1, 0, 0], name: "Aizawa", eq: "x′ = (z − b)x − d·y<br>y′ = d·x + (z − b)y<br>z′ = c + a·z − z³/3 − (x² + y²)(1 + e·z) + f·z·x³", p: [["a", 0.95, 0.5, 1.2], ["b", 0.7, 0.4, 1], ["c", 0.6, 0.3, 0.9], ["d", 3.5, 1, 5]], fixed: [0.25, 0.1], dt: 0.01, ctr: [0, 0, 0.6], sc: 0.55, cam: [0.4, 0.5],
    f: (x, y, z, P) => [(z - P[1]) * x - P[3] * y, P[3] * x + (z - P[1]) * y, P[2] + P[0] * z - z * z * z / 3 - (x * x + y * y) * (1 + 0.25 * z) + 0.1 * z * x * x * x], glsl: "vec3((p.z - P.y) * p.x - P.w * p.y, P.w * p.x + (p.z - P.y) * p.y, P.z + P.x * p.z - p.z * p.z * p.z / 3.0 - (p.x * p.x + p.y * p.y) * (1.0 + 0.25 * p.z) + 0.1 * p.z * p.x * p.x * p.x)" },
  thomas: { start: [0.1, 0, 0], name: "Thomas", eq: "x′ = sin y − b·x<br>y′ = sin z − b·y<br>z′ = sin x − b·z", p: [["b", 0.208186, 0, 0.35]], dt: 0.05, ctr: [0, 0, 0], sc: 0.24, cam: [0.7, 0.6],
    f: (x, y, z, P) => [Math.sin(y) - P[0] * x, Math.sin(z) - P[0] * y, Math.sin(x) - P[0] * z], glsl: "vec3(sin(p.y) - P.x * p.x, sin(p.z) - P.x * p.y, sin(p.x) - P.x * p.z)" },
  halvorsen: { start: [-1.48, -1.51, 2.04], name: "Halvorsen", eq: "x′ = −a·x − 4y − 4z − y²<br>y′ = −a·y − 4z − 4x − z²<br>z′ = −a·z − 4x − 4y − x²", p: [["a", 1.27, 1.25, 2]], dt: 0.006, ctr: [-3, -3, -3], sc: 0.11, cam: [0.8, 0.6],
    f: (x, y, z, P) => [-P[0] * x - 4 * y - 4 * z - y * y, -P[0] * y - 4 * z - 4 * x - z * z, -P[0] * z - 4 * x - 4 * y - x * x], glsl: "vec3(-P.x * p.x - 4.0 * p.y - 4.0 * p.z - p.y * p.y, -P.x * p.y - 4.0 * p.z - 4.0 * p.x - p.z * p.z, -P.x * p.z - 4.0 * p.x - 4.0 * p.y - p.x * p.x)" },
  chen: { start: [-0.1, 0.5, -0.6], name: "Chen", eq: "x′ = a(y − x)<br>y′ = (c − a)x − x·z + c·y<br>z′ = x·y − b·z", p: [["a", 35, 25, 45], ["b", 3, 1, 6], ["c", 28, 18, 32]], dt: 0.002, ctr: [0, 0, 23], sc: 0.026, cam: [0.3, 0.2],
    f: (x, y, z, P) => [P[0] * (y - x), (P[2] - P[0]) * x - x * z + P[2] * y, x * y - P[1] * z], glsl: "vec3(P.x * (p.y - p.x), (P.z - P.x) * p.x - p.x * p.z + P.z * p.y, p.x * p.y - P.y * p.z)" },
  dadras: { start: [1, 1, 1], name: "Dadras", eq: "x′ = y − a·x + b·y·z<br>y′ = c·y − x·z + z<br>z′ = d·x·y − e·z", p: [["a", 3, 2, 4], ["b", 2.7, 1.5, 3.5], ["c", 1.7, 1, 2.5], ["d", 2, 1, 3], ["e", 9, 6, 12]], dt: 0.008, ctr: [2, -2, -2], sc: 0.1, cam: [0.5, 0.4],
    f: (x, y, z, P) => [y - P[0] * x + P[1] * y * z, P[2] * y - x * z + z, P[3] * x * y - P[4] * z], glsl: "vec3(p.y - P.x * p.x + P.y * p.y * p.z, P.z * p.y - p.x * p.z + p.z, P.w * p.x * p.y - E.x * p.z)" },
  sprott: { start: [0.63, 0.47, -0.54], name: "Sprott", eq: "x′ = y + a·x·y + x·z<br>y′ = 1 − b·x² + y·z<br>z′ = x − x² − y²", p: [["a", 2.07, 1.5, 2.5], ["b", 1.79, 1.4, 2.2]], dt: 0.01, ctr: [0.75, 0, 0], sc: 0.85, cam: [0.3, 0.9],
    f: (x, y, z, P) => [y + P[0] * x * y + x * z, 1 - P[1] * x * x + y * z, x - x * x - y * y], glsl: "vec3(p.y + P.x * p.x * p.y + p.x * p.z, 1.0 - P.y * p.x * p.x + p.y * p.z, p.x - p.x * p.x - p.y * p.y)" },
  clifford: { start: [0.1, 0.1, 0], name: "Clifford (a map)", map: true, eq: "x<sub>next</sub> = sin(a·y) + c·cos(a·x)<br>y<sub>next</sub> = sin(b·x) + d·cos(b·y)", p: [["a", -1.4, -2, 2], ["b", 1.6, -2, 2], ["c", 1.0, -2, 2], ["d", 0.7, -2, 2]], ctr: [0, 0, 0], sc: 0.42,
    f: (x, y, z, P) => [Math.sin(P[0] * y) + P[2] * Math.cos(P[0] * x), Math.sin(P[1] * x) + P[3] * Math.cos(P[1] * y), 0], glsl: "vec3(sin(P.x * p.y) + P.z * cos(P.x * p.x), sin(P.y * p.x) + P.w * cos(P.y * p.y), 0.0)" },
  dejong: { start: [0.1, 0.1, 0], name: "de Jong (a map)", map: true, eq: "x<sub>next</sub> = sin(a·y) − cos(b·x)<br>y<sub>next</sub> = sin(c·x) − cos(d·y)", p: [["a", 1.4, -3, 3], ["b", -2.3, -3, 3], ["c", 2.4, -3, 3], ["d", -2.1, -3, 3]], ctr: [0, 0, 0], sc: 0.45,
    f: (x, y, z, P) => [Math.sin(P[0] * y) - Math.cos(P[1] * x), Math.sin(P[2] * x) - Math.cos(P[3] * y), 0], glsl: "vec3(sin(P.x * p.y) - cos(P.y * p.x), sin(P.z * p.x) - cos(P.w * p.y), 0.0)" }
};
// one fourth-order Runge–Kutta step of size h (a careful way to follow a curve: four slopes averaged)
function rk4(A, P, s, h) {
  const [x, y, z] = s, k1 = A.f(x, y, z, P), k2 = A.f(x + h / 2 * k1[0], y + h / 2 * k1[1], z + h / 2 * k1[2], P), k3 = A.f(x + h / 2 * k2[0], y + h / 2 * k2[1], z + h / 2 * k2[2], P), k4 = A.f(x + h * k3[0], y + h * k3[1], z + h * k3[2], P);
  return [x + h / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]), y + h / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]), z + h / 6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2])];
}
const advance = (A, P, s, h) => A.map ? A.f(s[0], s[1], s[2], P) : rk4(A, P, s, h);

// largest Lyapunov exponent (Benettin's method): follow two paths 1e-8 apart; every so often measure how much the gap grew, add up the logs, and shrink the gap back
function lyapunov(key, P, rand, T = 1500) {
  const A = ATT[key], h = A.map ? 1 : Math.min(A.dt, 0.01), d0 = 1e-8;
  let s = [A.start[0] + (rand() - 0.5) * 0.2, A.start[1] + (rand() - 0.5) * 0.2, A.start[2] + (rand() - 0.5) * (A.map ? 0 : 0.2)];
  for (let i = 0; i < (A.map ? 1000 : 50 / h); i++) { s = advance(A, P, s, h); if (!isFinite(s[0]) || Math.abs(s[0]) > 1e6) return NaN; }   // settle onto the attractor first
  let q = [s[0] + d0, s[1], s[2]], sum = 0; const steps = A.map ? 20000 : Math.round(T / h), every = A.map ? 1 : 10;
  for (let i = 1; i <= steps; i++) {
    s = advance(A, P, s, h); q = advance(A, P, q, h);
    if (i % every === 0) { const dx = q[0] - s[0], dy = q[1] - s[1], dz = q[2] - s[2], d = Math.hypot(dx, dy, dz) || 1e-300; sum += Math.log(d / d0); q = [s[0] + dx * d0 / d, s[1] + dy * d0 / d, s[2] + dz * d0 / d]; if (!isFinite(s[0])) return NaN; }
  }
  return sum / (steps * (A.map ? 1 : h));   // per unit time (flows) or per iteration (maps)
}
// two paths starting d0 apart: log10 of their distance after time t
function separation(key, P, rand, t, d0 = 1e-6) {
  const A = ATT[key], h = A.dt / 2; let s = [A.start[0] + (rand() - 0.5) * 0.2, A.start[1] + (rand() - 0.5) * 0.2, A.start[2] + (rand() - 0.5) * 0.2];
  for (let i = 0; i < 60 / h; i++) s = rk4(A, P, s, h);
  let q = [s[0] + d0, s[1], s[2]]; for (let i = 0; i < Math.round(t / h); i++) { s = rk4(A, P, s, h); q = rk4(A, P, q, h); }
  return Math.log10(Math.hypot(q[0] - s[0], q[1] - s[1], q[2] - s[2]));
}
const params = key => ATT[key].p.map(q => q[1]);

// =====================================================================
// THE PAGE (everything below runs only in the browser)
// =====================================================================
if (typeof module !== "undefined") module.exports = { ATT, lyapunov, separation, rk4, params };
else page();
function page() {
let key = "thomas", P = params(key), nPart = 512, sub = 2, fade = 0.9, exposure = 1, pal = 0, autoRot = true, pair = true;
const cam = { yaw: 0.4, pitch: 0.5, dist: 3.2 };
const ui = K.app({
  title: "Strange Attractors", subject: "Explore",
  blurb: "Simple equations, no randomness, endless unpredictable motion",
  reset: () => choose(key, true),
  missions: [
    { title: "A gallery of shapes", q: "Step through every attractor. Each is just three equations for how x, y and z change. Which look like ribbons, which like shells, which like knots? Read the equations under 'The attractor': can you guess anything about the shape from them?", hint: "Symmetric equations give symmetric shapes: Thomas's (x → y → z → x) has three-fold symmetry, Halvorsen's too. Rössler's has one slow loop that occasionally flicks up out of the plane (the z term switches on only when x > c). Nobody can predict the detailed shape by looking: you have to compute it.", setup() { choose("thomas", true); } },
    { title: "The butterfly effect", q: "With 'Two starts' on, two particles begin 0.000001 apart. Watch the separation chart (it is logarithmic). How long until their paths are completely different?", hint: "The gap grows exponentially (a straight line on the log chart) until it is as big as the attractor itself, then it stops growing. For Rössler, λ ≈ 0.07, so each 33 time units the gap grows 10 times: from 10⁻⁶ to 1 takes about 200 time units. Halving the starting error only buys 10 more time units. That is why weather forecasts fail after about two weeks.", setup() { choose("rossler", true); ctl.pair.set(true, true); } },
    { title: "The road to chaos", q: "Pick Rössler and set c = 2.5. The motion is one simple loop. Raise c slowly: 3.5, 4.2, 4.6, 5.7. Watch the loop and the Lyapunov readout. What happens to the loop before chaos starts?", hint: "The loop doubles: at about c = 3 it goes round twice before repeating (period 2), at about 4.2 four times (period 4), then 8, 16… faster and faster, until at about 4.5 it never repeats: chaos, and λ becomes positive. This 'period-doubling cascade' happens in dripping taps, heart rhythms and populations too (Feigenbaum).", setup() { choose("rossler", true); setP(2, 2.5); } },
    { title: "Every start, the same shape", q: "Press 'Scatter the particles' (it throws them all over the place, then lets them go) a few times. Every particle starts somewhere different. Where do they end up?", hint: "On the same shape every time: that is what 'attractor' means. The motion along it is unpredictable, but the shape it moves on is completely predictable. Weather is like that too: you cannot say whether it will rain on 3 August next year, but you can say what the climate (the attractor) will be like.", setup() { choose("aizawa", true); } },
    { title: "Turn the friction down", q: "Choose Thomas. b is like friction. Start at b = 0.32 and turn it down slowly to 0.05. What happens at about 0.208? And near 0?", hint: "Above about 0.33 every path settles to one point. Below it, cycles appear, then (around 0.2) chaos. As b approaches 0 the attractor fills a lattice of cells and the motion becomes like a random walk ('labyrinth chaos'), even though nothing random is in the equations.", setup() { choose("thomas", true); setP(0, 0.32); } },
    { title: "Maps: jumps, not flows", q: "Choose Clifford. Here x and y do not flow: they jump, by a rule, a million times over. Change a, b, c or d by a tiny amount. Does the picture change smoothly?", hint: "Often it changes smoothly, then suddenly collapses into a handful of dots (a periodic orbit: λ < 0) or explodes into a cloud. Chaos and order are finely interleaved in the parameter space. The batch run maps λ against a.", setup() { choose("clifford", true); } }
  ],
  batch: [
    { title: "Rössler: the road to chaos", question: "How does the largest Lyapunov exponent change as the Rössler parameter c rises?", how: "Each run starts near (1, 1, 1) with a small random change, follows the path for 50 time units to settle, then measures λ over 1500 time units (two paths 10⁻⁸ apart, renormalised every 0.1).", xLabel: "c", yLabel: "largest Lyapunov exponent λ", xs: [2.5, 3, 3.5, 4, 4.2, 4.5, 5, 5.7, 7, 9], reps: 3, run: (x, r) => lyapunov("rossler", [0.2, 0.2, x], r), note: "λ is zero (a cycle) through the period doublings up to about c = 4.2, then turns positive: chaos. At c = 5.7 it is about 0.07 (published value 0.0714). Short runs and different starting points give slightly different estimates." },
    { title: "Two nearby starts", question: "Two Rössler paths start 10⁻⁶ apart. How does the distance between them grow?", how: "Each run: settle onto the attractor, add a 10⁻⁶ shift, follow both for the time shown, and record log₁₀ of the distance between them.", xLabel: "time", yLabel: "log₁₀ (distance apart)", xs: [0, 25, 50, 75, 100, 125, 150], reps: 6, theory: t => -6 + 0.0714 * t / Math.LN10, theoryLabel: "10⁻⁶ × e^(0.0714 t)", run: (x, r) => separation("rossler", [0.2, 0.2, 5.7], r, x), note: "The gap grows roughly exponentially (a rising straight line on this log scale), but the test run rose a little more slowly than the λ = 0.0714 line, about e^(0.054 t) over 150 time units: a fresh gap first has to turn to line up with the direction of greatest stretching, and the stretching is uneven around the attractor (fast in some places, slow or even shrinking in others). Single runs wander a lot. After about 250 time units the gap reaches the size of the attractor and stops growing." },
    { title: "Thomas: friction and chaos", question: "How does the friction b change λ for the Thomas attractor?", how: "Each run: start near (0.1, 0, 0), settle, then measure λ over 1500 time units.", xLabel: "b", yLabel: "largest Lyapunov exponent λ", xs: [0.05, 0.1, 0.15, 0.18, 0.21, 0.25, 0.3], reps: 3, run: (x, r) => lyapunov("thomas", [x], r), note: "λ is largest for small b (labyrinth chaos), small or zero in windows of order, and zero once b is large enough for the motion to settle into a cycle or a point. The estimates are noisy: Thomas's chaos is slow, and 1500 time units is not long for it." },
    { title: "Clifford map: chaos and order", question: "How does λ for the Clifford map change with a (b = 1.6, c = 1, d = 0.7)?", how: "Each run: start near (0.1, 0.1), 1000 jumps to settle, then λ per jump over 20 000 jumps.", xLabel: "a", yLabel: "λ (per jump)", xs: [-2, -1.6, -1.2, -0.8, -0.4, 0, 0.4, 0.8, 1.2, 1.6, 2], reps: 3, run: (x, r) => lyapunov("clifford", [x, 1.6, 1.0, 0.7], r), note: "Positive λ means a chaotic, cloud-like attractor; negative λ means the points settle onto a few dots or a smooth closed curve. Order and chaos alternate as a changes. Different starts can land on different attractors when two exist side by side." }
  ],
  notes: `<h3>What is being modelled</h3>
<p>Each 3D attractor is a set of three <b>differential equations</b> (x′ means the rate at which x changes). A point's path is found by stepping forward in time with the fourth-order Runge–Kutta method. The two <b>maps</b> (Clifford and de Jong) are rules for jumping from one point to the next.</p>
<ul><li>Up to a million particles are followed at once by the graphics card, starting near the attractor's usual starting point; each is drawn as a dot that leaves a fading trail. Particles that fly off (for some parameter values the motion is not bounded) are started again.</li>
<li>Colour shows how fast a particle is moving.</li>
<li><b>Lyapunov exponent</b> (Benettin's method, on the main processor): follow two paths 10⁻⁸ apart; every so often add up the log of how much the gap has grown, and shrink it back to 10⁻⁸. The average growth rate is λ (per unit of time, or per jump for maps).</li>
<li><b>Two starts</b>: two paths 10⁻⁶ apart, followed on the main processor, drawn as orange and blue trails.</li></ul>
<h3>Assumptions and limits</h3>
<ul><li>The time step is small but finite, and the graphics card works with about 7 significant figures. In chaos, rounding errors grow like any other small difference, so individual particles' paths are not exact; the shape of the attractor, and λ, are reliable.</li>
<li>The equations are mathematical models. Rössler's and Chen's came from studying chemical and electronic oscillators; most of the others were designed to be chaotic.</li>
<li>Lyapunov estimates come from finite runs and vary a little from start to start.</li></ul>
<p>The most famous attractor, Lorenz's (1963) "butterfly", is in <a href="../../climate/weather_chaos/weather-chaos.html">Weather and Chaos</a>, and the double pendulum is in <a href="../../physics/simple_harmonic_motion/simple-harmonic-motion.html">Simple Harmonic Motion</a>. See also the <a href="../fractal_explorer/fractal-explorer.html">Fractal Explorer</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {}; let g = ui.group("The attractor");
ctl.att = K.seg(g, { label: "Choose", value: key, options: Object.keys(ATT).map(k => [k, ATT[k].name.replace(" (a map)", "")]), on: v => choose(v, true) });
const eqEl = K.note(g, ""); eqEl.style.cssText += ";font:13px/1.5 Consolas,monospace;color:var(--text)";
const pg = ui.group("Parameters (drag to morph it)"); let pSliders = [];
g = ui.group("Particles");
ctl.n = K.slider(g, { label: "Particles", min: 128, max: 1024, step: 128, value: nPart, fmt: v => (v * v / 1e6 >= 1 ? (v * v / 1e6).toFixed(2) + " million" : Math.round(v * v / 1000) + " thousand"), on: v => { nPart = v; makeParticles(); } });
ctl.trail = K.slider(g, { label: "Trail length", min: 0, max: 0.99, step: 0.01, value: fade, fmt: v => v < 0.05 ? "none" : v.toFixed(2), on: v => fade = v });
ctl.exp = K.slider(g, { label: "Brightness", min: 0.2, max: 4, step: 0.1, value: exposure, fmt: v => "× " + v.toFixed(1), on: v => exposure = v });
ctl.pal = K.seg(g, { label: "Colours", value: 0, options: [[0, "Aurora"], [1, "Fire"], [2, "Ice"], [3, "Rainbow"]], on: v => pal = v });
ctl.sub = K.slider(g, { label: "Speed (steps per frame)", min: 1, max: 8, step: 1, value: sub, on: v => sub = v }); ui.headerSpeed(ctl.sub, { label: "Speed" });
ctl.rot = K.toggle(g, { label: "Turn slowly", value: true, on: v => autoRot = v });
ctl.pair = K.toggle(g, { label: "Two starts 0.000001 apart (the butterfly effect)", value: true, on: v => { pair = v; resetPair(); } });
let r1 = K.row(g); K.btn(r1, "🎲 Scatter the particles", () => scatter(false), "primary"); K.btn(r1, "📷 Screenshot", () => K.gl.screenshot("strange-attractor", view, cv));
K.note(g, "Drag to turn the view, scroll to zoom.");
const read = K.readout(g, [["lam", "largest Lyapunov exponent"], ["kind", "so the motion is"], ["sep", "two starts: distance apart"], ["t", "two starts: time"]]);

function setP(i, v) { P[i] = v; if (pSliders[i]) pSliders[i].set(v); updateLyap(); }
function choose(k, resetView) {
  key = k; ctl.att.set(k); const A = ATT[k]; P = params(k);
  eqEl.innerHTML = A.eq; pg.querySelectorAll(".k-ctl").forEach(e => e.remove());
  pSliders = A.p.map(([nm, v, lo, hi], i) => K.slider(pg, { label: nm, min: lo, max: hi, step: (hi - lo) / 400, value: v, fmt: x => (+x).toFixed(3), on: x => { P[i] = x; updateLyap(); } }));
  if (resetView) { cam.yaw = A.cam ? A.cam[0] : 0; cam.pitch = A.cam ? A.cam[1] : 0; cam.dist = 3.2; }
  makeProgram(); scatter(true); resetPair(); updateLyap();
}
let lyT = 0; function updateLyap() { clearTimeout(lyT); lyT = setTimeout(() => { const l = lyapunov(key, P, K.rng(7), ATT[key].map ? 0 : 300); read.set("lam", isFinite(l) ? l.toFixed(3) + (ATT[key].map ? " per jump" : " per unit time") : "it flies off"); read.set("kind", !isFinite(l) ? "unbounded" : l > 0.01 ? "chaotic" : l > 0.002 ? "weakly chaotic" : l > -0.002 ? "a cycle" : "settling down"); }, 250); }

// ---------------- The graphics card ----------------
let glReady = false; const view = K.gl.create(ui.stage, { dprMax: 1.5, onResize: () => glReady && makeAcc() });
const cv = ui.canvas(() => { });
const gl = view.gl, ok = view.ok;
let quad, state, acc, prStep, prDraw, prFade, prShow, pts, accW = 0, accH = 0;
const HASH = `float hash(vec2 p) { p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }`;
if (ok) {
  quad = K.gl.quad(gl);
  prFade = K.gl.program(gl, K.gl.QUAD_VS, `precision highp float; varying vec2 vUv; uniform sampler2D uAcc; uniform float uFade; void main() { gl_FragColor = texture2D(uAcc, vUv) * uFade; }`);
  prShow = K.gl.program(gl, K.gl.QUAD_VS, `precision highp float; varying vec2 vUv; uniform sampler2D uAcc; uniform float uExp;
    void main() { vec3 a = texture2D(uAcc, vUv).rgb; vec2 d = vUv - 0.5; vec3 bg = mix(vec3(0.03, 0.035, 0.07), vec3(0.0, 0.0, 0.015), length(d) * 1.4);
      vec3 c = 1.0 - exp(-a * uExp); gl_FragColor = vec4(bg + pow(c, vec3(0.85)), 1.0); }`);
  // drawing: each particle is one point, placed by the camera, coloured by its speed
  prDraw = K.gl.program(gl, `precision highp float; attribute vec2 aPos; uniform sampler2D uState; uniform mat3 uRot; uniform vec3 uCtr; uniform float uSc, uDist, uAspect, uMap, uPal, uBright, uSpeed; varying vec3 vCol;
    vec3 pal(float t) { t = clamp(t, 0.0, 1.0);
      if (uPal < 0.5) return mix(mix(vec3(0.1, 0.9, 0.8), vec3(0.45, 0.35, 1.0), smoothstep(0.0, 0.5, t)), vec3(1.0, 0.35, 0.65), smoothstep(0.5, 1.0, t));
      if (uPal < 1.5) return mix(mix(vec3(0.8, 0.1, 0.02), vec3(1.0, 0.55, 0.05), smoothstep(0.0, 0.5, t)), vec3(1.0, 0.95, 0.6), smoothstep(0.5, 1.0, t));
      if (uPal < 2.5) return mix(mix(vec3(0.05, 0.25, 0.9), vec3(0.3, 0.75, 1.0), smoothstep(0.0, 0.5, t)), vec3(0.9, 0.97, 1.0), smoothstep(0.5, 1.0, t));
      return 0.55 + 0.45 * cos(6.2832 * (t * 0.8 + vec3(0.0, 0.33, 0.67))); }
    void main() { vec4 s = texture2D(uState, aPos); vec3 q = uRot * ((s.xyz - uCtr) * uSc);
      float d = uMap > 0.5 ? uDist : uDist - q.z; gl_Position = d > 0.1 ? vec4(q.x * 1.8 / d / uAspect, q.y * 1.8 / d, 0.0, 1.0) : vec4(2.0, 2.0, 0.0, 1.0);
      gl_PointSize = 1.0; vCol = pal(s.w * uSpeed) * uBright; }`,
    `precision highp float; varying vec3 vCol; void main() { gl_FragColor = vec4(vCol, 1.0); }`);
}
function makeAcc() { if (!ok) return; const w = view.el.width, h = view.el.height; if (w === accW && h === accH) return; if (acc) acc.dispose(); acc = K.gl.pingpong(gl, w, h, { float: true, blend: true }); acc.upload(null); accW = w; accH = h; }
// the step: each particle (one texel: x, y, z and its speed) moves on by a few Runge–Kutta steps (or jumps, for a map)
function makeProgram() {
  if (!ok) return; const A = ATT[key];
  prStep = K.gl.program(gl, K.gl.QUAD_VS, `precision highp float; varying vec2 vUv; uniform sampler2D uState; uniform vec4 P; uniform vec4 E; uniform vec3 uStart, uCtr; uniform float uH, uSub, uSeed, uSc, uMap;
    ${HASH}
    vec3 F(vec3 p) { return ${A.glsl}; }
    void main() {
      vec4 s = texture2D(uState, vUv); vec3 p = s.xyz, v = vec3(0.0);
      for (int k = 0; k < 8; k++) { if (float(k) >= uSub) break;
        if (uMap > 0.5) { vec3 n = F(p); v = n - p; p = n; }
        else { vec3 k1 = F(p), k2 = F(p + 0.5 * uH * k1), k3 = F(p + 0.5 * uH * k2), k4 = F(p + uH * k3); v = (k1 + 2.0 * k2 + 2.0 * k3 + k4) / 6.0; p += uH * v; } }
      float r = hash(vUv * 917.0 + uSeed);
      bool lost = !(p.x == p.x) || !(p.y == p.y) || !(p.z == p.z) || length((p - uCtr) * uSc) > 6.0;
      if (lost || r < 0.0005) p = uStart + (vec3(hash(vUv * 31.0 + uSeed), hash(vUv * 57.0 + uSeed * 1.3), hash(vUv * 83.0 + uSeed * 1.7)) - 0.5) * (uMap > 0.5 ? vec3(2.0, 2.0, 0.0) : vec3(0.6));
      gl_FragColor = vec4(p, length(v));
    }`);
}
function makeParticles() {
  if (!ok) return; if (state) state.dispose(); state = K.gl.pingpong(gl, nPart, nPart, { float: true }); if (prStep) scatter(true);
  const idx = new Float32Array(2 * nPart * nPart); for (let k = 0; k < nPart * nPart; k++) { idx[2 * k] = (k % nPart + .5) / nPart; idx[2 * k + 1] = (Math.floor(k / nPart) + .5) / nPart; }
  pts = K.gl.points(gl, { aPos: 2 }).set("aPos", idx, gl.STATIC_DRAW);
}
function scatter(settle) { if (!ok || !state) return; const A = ATT[key], d = new Float32Array(4 * nPart * nPart), r = Math.random, spread = A.map ? 2 : 1 / A.sc;
  for (let k = 0; k < nPart * nPart; k++) { d[4 * k] = A.ctr[0] + (r() - 0.5) * spread; d[4 * k + 1] = A.ctr[1] + (r() - 0.5) * spread; d[4 * k + 2] = A.map ? 0 : A.ctr[2] + (r() - 0.5) * spread; }
  if (A.map) for (let k = 0; k < nPart * nPart; k++) { d[4 * k] = (r() - 0.5) * 3; d[4 * k + 1] = (r() - 0.5) * 3; }
  else if (key === "halvorsen" || key === "sprott") for (let k = 0; k < nPart * nPart; k++) for (let j = 0; j < 3; j++) d[4 * k + j] = A.start[j] + (r() - 0.5) * 0.5;   // these two have other, non-chaotic attractors nearby: start close to the usual point
  state.upload(d); if (acc) acc.upload(null); speedRef = null;
  if (settle) for (let k = 0; k < (A.map ? 30 : 60); k++) { prStep.set({ uState: state.read, P: [P[0] || 0, P[1] || 0, P[2] || 0, P[3] || 0], E: [P[4] || 0, 0, 0, 0], uStart: A.start, uCtr: A.ctr, uH: A.dt || 0, uSub: 8, uSeed: Math.random() * 100, uSc: A.sc, uMap: A.map ? 1 : 0 }); quad.draw(prStep, state.write); state.swap(); }
}
let speedRef = null;   // a typical speed, for the colour scale (worked out on the CPU once per attractor and setting)
function typicalSpeed() { const A = ATT[key]; let s = A.start.slice(), sum = 0, n = 0; for (let i = 0; i < 3000; i++) { const t = A.map ? A.f(s[0], s[1], s[2], P) : rk4(A, P, s, A.dt); const v = A.map ? Math.hypot(t[0] - s[0], t[1] - s[1]) : Math.hypot(...A.f(...s, P)); s = t; if (i > 500 && isFinite(v)) { sum += v; n++; } } return n ? sum / n : 1; }

// ---------------- Two nearby starts (CPU) ----------------
let pA, pB, pT, trA, trB, sepLog, xLog;
function resetPair() { const A = ATT[key], h = A.map ? 1 : A.dt; let s = A.start.slice(); for (let i = 0; i < (A.map ? 200 : 40 / h); i++) s = advance(A, P, s, h); pA = s; pB = [s[0] + 1e-6, s[1], s[2]]; pT = 0; trA = []; trB = []; sepLog = []; xLog = { a: [], b: [] }; }
function stepPair(n) { const A = ATT[key], h = A.map ? 1 : A.dt; for (let i = 0; i < n; i++) { pA = advance(A, P, pA, h); pB = advance(A, P, pB, h); pT += h;
  if (!isFinite(pA[0]) || !isFinite(pB[0])) { resetPair(); return; } }
  trA.push(pA.slice()); trB.push(pB.slice()); if (trA.length > 400) { trA.shift(); trB.shift(); }
  const d = Math.hypot(pA[0] - pB[0], pA[1] - pB[1], pA[2] - pB[2]); sepLog.push([pT, Math.log10(Math.max(d, 1e-12))]); xLog.a.push([pT, pA[0]]); xLog.b.push([pT, pB[0]]);
  if (sepLog.length > 600) { sepLog.shift(); xLog.a.shift(); xLog.b.shift(); } }

// ---------------- Camera ----------------
function rot() { const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  // turn about the vertical axis, then tip: rows are screen-right, screen-up, towards the viewer (column-major for WebGL)
  const m = [cy, 0, -sy, sy * sp, cp, cy * sp, sy * cp, -sp, cy * cp]; return m; }
function project(p, m, w, h) { const A = ATT[key], x = (p[0] - A.ctr[0]) * A.sc, y = (p[1] - A.ctr[1]) * A.sc, z = (p[2] - A.ctr[2]) * A.sc;
  if (A.map) return [w / 2 + x * 1.8 / cam.dist * h / 2, h / 2 - y * 1.8 / cam.dist * h / 2];
  const qx = m[0] * x + m[3] * y + m[6] * z, qy = m[1] * x + m[4] * y + m[7] * z, qz = m[2] * x + m[5] * y + m[8] * z, d = cam.dist - qz; if (d < 0.1) return null; return [w / 2 + qx * 1.8 / d * h / 2, h / 2 - qy * 1.8 / d * h / 2]; }
let grab = null;
K.pointer(cv.el, { down(p) { grab = { x: p.x, y: p.y, yaw: cam.yaw, pitch: cam.pitch }; }, drag(p) { if (!grab || ATT[key].map) return; cam.yaw = grab.yaw + (p.x - grab.x) * 0.008; cam.pitch = K.clamp(grab.pitch + (p.y - grab.y) * 0.008, -1.5, 1.5); }, up() { grab = null; } });
cv.el.addEventListener("wheel", e => { e.preventDefault(); cam.dist = K.clamp(cam.dist * Math.exp(e.deltaY * 0.0012), 0.8, 12); }, { passive: false });

// ---------------- Drawing ----------------
function frame(dt) {
  const A = ATT[key], c = cv.ctx, w = cv.w, h = cv.h; if (autoRot && !grab && !A.map) cam.yaw += dt * 0.12;
  if (speedRef == null) speedRef = typicalSpeed();
  const m = rot(); c.clearRect(0, 0, w, h);
  if (ok && state && acc) {
    // 1. move every particle
    prStep.set({ uState: state.read, P: [P[0] || 0, P[1] || 0, P[2] || 0, P[3] || 0], E: [P[4] || 0, 0, 0, 0], uStart: A.start, uCtr: A.ctr, uH: A.dt || 0, uSub: ui.playing ? (A.map ? 1 : sub) : 0, uSeed: Math.random() * 100, uSc: A.sc, uMap: A.map ? 1 : 0 });
    quad.draw(prStep, state.write); state.swap();
    // 2. fade the old trails, 3. add every particle's dot
    prFade.set({ uAcc: acc.read, uFade: A.map ? Math.max(fade, 0.97) : fade }); quad.draw(prFade, acc.write);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    prDraw.set({ uState: state.read, uRot: m, uCtr: A.ctr, uSc: A.sc, uDist: cam.dist, uAspect: view.w / view.h, uMap: A.map ? 1 : 0, uPal: pal, uBright: (A.map ? 0.006 : 0.012) * 262144 / (nPart * nPart) * (1 - (A.map ? 0.97 : fade) + 0.05) * 4, uSpeed: 0.6 / (speedRef || 1) });
    pts.draw(prDraw, nPart * nPart); gl.disable(gl.BLEND); acc.swap();
    // 4. show
    K.gl.bindTarget(gl, null); prShow.set({ uAcc: acc.read, uExp: exposure }); quad.draw(prShow);
  }
  // the two nearby starts, drawn on the 2D canvas over the top
  if (pair && trA.length > 1) for (const [tr, col] of [[trA, "rgba(255,170,60,"], [trB, "rgba(90,200,255,"]]) {
    if (A.map) { c.fillStyle = col + "0.8)"; for (const q of tr) { const a = project(q, m, w, h); if (a) c.fillRect(a[0] - 1.5, a[1] - 1.5, 3, 3); } continue; }   // a map jumps, so dots rather than a line
    c.lineWidth = 2; for (let i = 1; i < tr.length; i++) { const a = project(tr[i - 1], m, w, h), b = project(tr[i], m, w, h); if (!a || !b) continue; c.strokeStyle = col + (0.15 + 0.85 * i / tr.length) + ")"; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
    const e = project(tr[tr.length - 1], m, w, h); if (e) { c.fillStyle = col + "1)"; c.beginPath(); c.arc(e[0], e[1], 4.5, 0, TAU); c.fill(); } }
  if (!ok) { c.fillStyle = "#05060c"; c.fillRect(0, 0, w, h); }
}
const TAU = Math.PI * 2;
const chS = K.chart(ui.dock, { title: "Two starts: distance apart (log scale)", xLabel: "time", yLabel: "log₁₀ distance", yMin: -7, yMax: 1.5 });
const chX = K.chart(ui.dock, { title: "Two starts: x against time", xLabel: "time", yLabel: "x" });

// ---------------- The loop ----------------
glReady = true; makeAcc(); makeParticles(); choose(key, true);
let fr = 0;
ui.run(() => { if (pair) stepPair(ATT[key].map ? 1 : sub * 2); }, dt => {
  frame(dt); if (fr++ % 5) return;
  if (pair) { chS.draw([{ pts: sepLog, color: K.cssVar("--s1") }], {}); chX.draw([{ pts: xLog.a, color: "#ffaa3c", label: "orange" }, { pts: xLog.b, color: "#5ac8ff", label: "blue", dash: [4, 3] }], {});
    const d = sepLog.length ? Math.pow(10, sepLog[sepLog.length - 1][1]) : 0; read.set("sep", d.toExponential(1)); read.set("t", pT.toFixed(1)); }
  ui.hud(`<b style="font-size:15px">${ATT[key].name}</b><br>${(nPart * nPart / 1e6).toFixed(2)} million particles`);
});
window.attTest = { choose, setP, scatter };
ui.tip("Each glowing dot follows the same three equations · drag to turn the view · move the parameter sliders to morph the shape", 8000);
}
