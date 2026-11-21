/* =====================================================================
   DIFFERENTIAL EQUATIONS
   A first-order differential equation dy/dx = f(x, y) tells you the
   GRADIENT of the solution at every point. Drawing a short line with
   that gradient at many points gives a SLOPE FIELD (direction field);
   solution curves follow the arrows. Each starting point gives a
   different particular solution: together they are the general solution.
   EULER'S METHOD steps along the field:  y(n+1) = y(n) + h f(x(n), y(n)).
   It is easy but drifts off the true curve; halving h roughly halves the
   error.
   SECOND ORDER (A level): a mass on a spring with damping obeys
       x'' + 2kx' + ω²x = 0     (auxiliary equation m² + 2km + ω² = 0)
     k < ω  light damping: complex roots, x = e^(−kt)(A cos pt + B sin pt)
     k = ω  critical damping: repeated root, x = (A + Bt)e^(−ωt)
     k > ω  heavy damping: two real negative roots, no oscillation
     k = 0  simple harmonic motion, x = A cos ωt + B sin ωt
   A driving force F cos Ωt adds a particular integral; near Ω = ω the
   response becomes large (resonance).
   ===================================================================== */
// ---------------- 1. The first-order equations (with exact solutions where there is a nice one) ----------------
const FO = {
  growth: { name: "dy/dx = y", f: (x, y) => y, exact: (x, x0, y0) => y0 * Math.exp(x - x0), sol: "y = Ae^x", box: [-2, 3, -4, 8] },
  relax: { name: "dy/dx = 4 − 2y", f: (x, y) => 4 - 2 * y, exact: (x, x0, y0) => 2 + (y0 - 2) * Math.exp(-2 * (x - x0)), sol: "y = 2 + Ae^(−2x)  (integrating factor e^(2x))", box: [-1, 4, -2, 6] },
  linear: { name: "dy/dx = x − y", f: (x, y) => x - y, exact: (x, x0, y0) => x - 1 + (y0 - x0 + 1) * Math.exp(-(x - x0)), sol: "y = x − 1 + Ae^(−x)  (integrating factor eˣ)", box: [-3, 4, -4, 4] },
  logistic: { name: "dy/dx = y(2 − y)", f: (x, y) => y * (2 - y), exact: (x, x0, y0) => { if (y0 === 0) return 0; const A = (2 - y0) / y0; return 2 / (1 + A * Math.exp(-2 * (x - x0))); }, sol: "y = 2 ÷ (1 + Ae^(−2x))  (separate the variables)", box: [-2, 4, -1, 4] },
  circles: { name: "dy/dx = −x/y", f: (x, y) => -x / y, exact: (x, x0, y0) => { const r2 = x0 * x0 + y0 * y0; return x * x > r2 ? NaN : Math.sign(y0) * Math.sqrt(r2 - x * x); }, sol: "x² + y² = c  (separate the variables)", box: [-4, 4, -3, 3] },
  sinx: { name: "dy/dx = sin x − y", f: (x, y) => Math.sin(x) - y, exact: (x, x0, y0) => { const p = t => (Math.sin(t) - Math.cos(t)) / 2; return p(x) + (y0 - p(x0)) * Math.exp(-(x - x0)); }, sol: "y = ½(sin x − cos x) + Ae^(−x)", box: [-2, 8, -2, 2] },
};
// Euler and RK4 for a system: state s = [..], derivative d(t, s)
function euler(f, x0, y0, h, x1) { const pts = [[x0, y0]]; let x = x0, y = y0; const n = Math.round(Math.abs(x1 - x0) / h), sh = Math.sign(x1 - x0) * h; for (let i = 0; i < n; i++) { y += sh * f(x, y); x += sh; if (!isFinite(y) || Math.abs(y) > 1e6) break; pts.push([x, y]); } return pts; }
function rk4(d, t, s, h) { const k1 = d(t, s), k2 = d(t + h / 2, s.map((v, i) => v + h / 2 * k1[i])), k3 = d(t + h / 2, s.map((v, i) => v + h / 2 * k2[i])), k4 = d(t + h, s.map((v, i) => v + h * k3[i])); return s.map((v, i) => v + h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])); }
// second order: x'' = −2k x' − ω² x + F cos(Ω t), written as a pair of first-order equations
const osc = Q => (t, s) => [s[1], -2 * Q.k * s[1] - Q.w * Q.w * s[0] + Q.F * Math.cos(Q.W * t)];

// ---------------- 2. State ----------------
const DEF = { mode: "field", eq: "relax", h: 0.5, showEuler: true, showExact: true, x0: 0, y0: 0.5, w: 2 * Math.PI / 2, k: 0.4, F: 0, W: 3, xs0: 1, vs0: 0 };
const P = Object.assign({}, DEF);
let starts = [[0, 0.5]], t = 0, st = [1, 0], trail = [];
const kind = () => P.k < P.w - 1e-9 ? (P.k === 0 ? "no damping: simple harmonic motion" : "light damping (underdamped)") : Math.abs(P.k - P.w) < 1e-9 ? "critical damping" : "heavy damping (overdamped)";

// ---------------- 3. The page ----------------
const ui = K.app({
  title: "Differential Equations", subject: "Further Mathematics",
  blurb: "Slope fields and solution curves, Euler's method stepping along them, and a damped, driven mass on a spring from the auxiliary equation",
  reset: () => { t = 0; st = [P.xs0, P.vs0]; trail = []; },
  levels: { std: "First order (9FM0)", adv: "Second order (9FM0)", specs: {
    std: "Pearson Edexcel A level Further Mathematics (9FM0) Core Pure 2, differential equations: first-order equations solved by separating variables or an integrating factor, general and particular solutions, families of solution curves, and the slope field. Euler's step-by-step method is in Further Pure 1 (FP1 numerical methods).",
    adv: "Pearson Edexcel A level Further Mathematics (9FM0) Core Pure 2: second-order equations with constant coefficients, the auxiliary equation, complementary function and particular integral; simple harmonic motion; damped oscillations (light, critical, heavy damping) and forced oscillations. Resonance is an extension." } },
  missions: [
    { title: "Reading a slope field", q: "dy/dx = 4 − 2y. Where is the gradient zero? Click several starting points. What happens to every solution as x grows?", hint: "The gradient is zero along y = 2. Every solution approaches y = 2: above it they fall, below it they rise. The general solution y = 2 + Ae^(−2x) shows why.", setup: () => set({ eq: "relax" }) },
    { title: "One family, many particular solutions", q: "dy/dx = x − y. Click to start curves at different points. Do any two solution curves ever cross?", hint: "No: through each point there is exactly one gradient, so solution curves can't cross. Each starting point (boundary condition) picks out one value of A in y = x − 1 + Ae^(−x).", setup: () => set({ eq: "linear" }) },
    { title: "Euler's method", q: "dy/dx = y from (0, 1). With h = 0.5, how far is Euler's estimate of y(3) from the true value e³? Halve h a few times.", hint: "Euler uses the gradient at the START of each step, so it falls behind a curve that gets steeper. Error at x = 3: about 8.7 with h = 0.5, 5.5 with h = 0.25 … roughly halving each time (the method is first order).", setup: () => set({ eq: "growth", h: 0.5, x0: 0, y0: 1 }) },
    { title: "Separating variables: circles", q: "dy/dx = −x/y. Click a few points. What shape are the solutions? What goes wrong with Euler's method?", hint: "y dy = −x dx gives x² + y² = c: circles. Euler always steps along the tangent, which points outwards, so it spirals out and gets worse each lap.", setup: () => set({ eq: "circles", x0: 0, y0: 2, h: 0.25 }) },
    { title: "Logistic growth", q: "dy/dx = y(2 − y). Start curves at y = 0.1, 1 and 3. What are the equilibrium solutions? Which is stable?", hint: "y = 0 and y = 2 (gradient zero). y = 2 is stable: nearby solutions move towards it. y = 0 is unstable: a tiny positive y grows away from it.", setup: () => set({ eq: "logistic", x0: 0, y0: 0.1 }) },
    { lvl: "adv", title: "Simple harmonic motion", q: "No damping (k = 0). Measure the period. How does it compare with 2π/ω?", hint: "x'' = −ω²x has auxiliary roots ±iω, so x = A cos ωt + B sin ωt with period 2π/ω = 2 s here. The phase-plane path is a closed ellipse: no energy is lost.", setup: () => set({ mode: "osc", k: 0, F: 0 }) },
    { lvl: "adv", title: "Light, critical and heavy damping", q: "Increase k from 0.4 to ω (critical) and beyond. Which settles to rest fastest without overshooting? Look at the auxiliary equation's roots.", hint: "k < ω: complex roots −k ± ip, a decaying oscillation. k = ω: a repeated root −ω, the fastest return with no overshoot (car suspension aims near this). k > ω: two real roots, a slow creep back.", setup: () => set({ mode: "osc", k: 0.4, F: 0 }) },
    { lvl: "adv", title: "Driving it: resonance", q: "Light damping (k = 0.3) and a driving force. Vary Ω near ω = π. When is the steady oscillation largest?", hint: "The particular integral has amplitude F ÷ √((ω² − Ω²)² + (2kΩ)²), largest when Ω is close to ω: resonance. The complementary function dies away, leaving only the particular integral.", setup: () => set({ mode: "osc", k: 0.3, F: 3, W: 3 }) },
  ],
  batch: [
    { title: "Euler's method: error against step size", question: "For dy/dx = y from (0, 1), how big is the error in Euler's estimate of y(1) = e?", how: "Exact calculation for each step size.", xLabel: "step h", yLabel: "e − Euler estimate", xs: [0.025, 0.05, 0.1, 0.2, 0.25, 0.5], reps: 1, yMin: 0, theory: h => Math.E * h / 2, theoryLabel: "≈ eh/2", run: h => Math.E - Math.pow(1 + h, 1 / h), note: "Close to a straight line through the origin: the error is proportional to h (Euler is a first-order method). To gain one more decimal place, take ten times as many steps." },
    { title: "Logistic: where do solutions settle?", question: "dy/dx = y(2 − y): start at a random y between 0.05 and 4. What is y at x = 5?", how: "Each run: a random starting value, solved accurately (RK4 with step 0.01).", yLabel: "y at x = 5", reps: 300, bins: 24, theory: 2, theoryLabel: "stable equilibrium y = 2", run: (x, r) => { let s = [0.05 + 3.95 * r()]; for (let i = 0; i < 500; i++) s = rk4((t, q) => [q[0] * (2 - q[0])], 0, s, 0.01); return s[0]; }, note: "Every positive start ends very close to 2: it is a stable equilibrium. (Only y = 0 exactly would stay put.)" },
    { title: "Period of SHM (A level)", question: "For x'' = −ω²x, does the measured period match 2π/ω?", how: "Solved with RK4; the period is the time between two upward crossings of x = 0.", xLabel: "ω (rad s⁻¹)", yLabel: "period (s)", xs: [1, 1.5, 2, 3, 4, 6, 8], reps: 1, yMin: 0, theory: w => 2 * Math.PI / w, theoryLabel: "2π/ω", run: w => { const f = osc({ k: 0, w, F: 0, W: 1 }); let s = [0, 1], tt = 0; const h = 0.001, cross = []; while (cross.length < 2 && tt < 50) { const n = rk4(f, tt, s, h); if (s[0] < 0 && n[0] >= 0) cross.push(tt + h * (-s[0]) / (n[0] - s[0])); s = n; tt += h; } return cross[1] - cross[0]; }, note: "The period depends only on ω, not on the amplitude: the defining property of SHM." },
    { title: "Settling time and damping (A level)", question: "How long until the oscillation stays within 1% of its start (ω = π)?", how: "x(0) = 1, x'(0) = 0, solved with RK4 for each damping constant k.", xLabel: "damping k", yLabel: "time to settle (s)", xs: [0.25, 0.5, 1, 2, 2.5, 3, 3.14, 4, 6, 8], reps: 1, yMin: 0, theory: k => k < Math.PI ? Math.log(100) / k : NaN, theoryLabel: "≈ ln 100 / k (light damping)", run: k => { const f = osc({ k, w: Math.PI, F: 0, W: 1 }); let s = [1, 0], tt = 0, last = 0; const h = 0.002; while (tt < 60) { s = rk4(f, tt, s, h); tt += h; if (Math.abs(s[0]) > 0.01) last = tt; } return last; }, note: "With light damping the envelope e^(−kt) sets the time; it is fastest close to critical damping (k = ω ≈ 3.14; for a 1% band, a little below it, since a tiny overshoot is allowed); heavier damping makes it slower again because the slow root of the auxiliary equation creeps back." },
    { title: "Resonance curve (A level)", question: "Drive the oscillator (ω = π, k = 0.3) at frequency Ω. How big is the steady oscillation?", how: "RK4 for 60 s, then the largest |x| in the last 10 s.", xLabel: "driving Ω (rad s⁻¹)", yLabel: "steady amplitude", xs: [1, 2, 2.5, 2.8, 3, 3.14, 3.3, 3.5, 4, 5], reps: 1, yMin: 0, theory: W => 3 / Math.sqrt((Math.PI ** 2 - W * W) ** 2 + (0.6 * W) ** 2), theoryLabel: "F/√((ω² − Ω²)² + (2kΩ)²)", run: W => { const f = osc({ k: 0.3, w: Math.PI, F: 3, W }); let s = [0, 0], tt = 0, mx = 0; const h = 0.005; while (tt < 60) { s = rk4(f, tt, s, h); tt += h; if (tt > 50) mx = Math.max(mx, Math.abs(s[0])); } return mx; }, note: "A sharp peak near Ω = ω: the particular integral's amplitude. Less damping gives a taller, narrower peak." },
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "CP2", text: "Separable: dy/dx = f(x)g(y) → ∫ dy/g(y) = ∫ f(x) dx. Linear: dy/dx + P(x)y = Q(x) → multiply by the integrating factor e^(∫P dx), then d/dx(y × IF) = Q × IF." },
      { lvl: "std", tag: "CP2", text: "The general solution has an arbitrary constant: a family of curves. A boundary condition (a point on the curve) gives the particular solution. Solution curves never cross." },
      { lvl: "std", tag: "FP1", text: "Euler: y(n+1) = y(n) + h f(x(n), y(n)). Each step follows the tangent, so it drifts from the curve; the error is roughly proportional to h." },
      { lvl: "adv", tag: "CP2", text: "a y'' + b y' + c y = 0: auxiliary equation am² + bm + c = 0. Real roots α, β: y = Ae^(αx) + Be^(βx). Repeated root α: y = (A + Bx)e^(αx). Complex p ± iq: y = e^(px)(A cos qx + B sin qx)." },
      { lvl: "adv", tag: "CP2", text: "General solution = complementary function + particular integral. Try a PI like the right-hand side (λ cos Ωt + μ sin Ωt for cos Ωt)." },
      { lvl: "adv", tag: "CP2", text: "x'' + 2kx' + ω²x = 0: SHM if k = 0 (period 2π/ω); light damping if k < ω, critical if k = ω, heavy if k > ω." },
    ],
    questions: [
      { lvl: "std", marks: 5, q: "Solve dy/dx + 2y = 4 given y = 0.5 when x = 0.", ans: "<ul><li>integrating factor e^(2x)</li><li>d/dx(ye^(2x)) = 4e^(2x)</li><li>ye^(2x) = 2e^(2x) + c</li><li>y = 2 + ce^(−2x); x = 0, y = 0.5: c = −1.5</li><li>y = 2 − 1.5e^(−2x)</li></ul>" },
      { lvl: "std", marks: 3, q: () => `Use Euler's method with h = ${P.h} to estimate y at x = ${P.h * 2} for dy/dx = y with y(0) = 1.`, ans: () => `<ul><li>y₁ = 1 + ${P.h} × 1 = ${1 + P.h}</li><li>y₂ = ${1 + P.h} + ${P.h} × ${1 + P.h} = ${f3((1 + P.h) ** 2)}</li><li>(true value e^${P.h * 2} = ${f3(Math.exp(2 * P.h))})</li></ul>` },
      { lvl: "adv", marks: 4, q: "Find the general solution of x'' + 4x' + 13x = 0 and describe the motion.", ans: "<ul><li>m² + 4m + 13 = 0</li><li>m = −2 ± 3i</li><li>x = e^(−2t)(A cos 3t + B sin 3t)</li><li>light damping: oscillations whose amplitude decays</li></ul>" },
      { lvl: "adv", marks: 5, q: "Find a particular integral of x'' + 9x = 16 cos t, and hence the general solution.", ans: "<ul><li>try x = λ cos t + μ sin t: −λ cos t + 9λ cos t = 16 cos t</li><li>8λ = 16, λ = 2, μ = 0</li><li>PI: 2 cos t</li><li>CF: A cos 3t + B sin 3t</li><li>x = A cos 3t + B sin 3t + 2 cos t</li></ul>" },
    ]
  },
  notes: `<h3>What the page does</h3><ul><li><b>Slope field:</b> a short line with gradient f(x, y) at each grid point. Click to start a solution curve there: it is drawn from the exact solution (solid) and by Euler's method with step h (dots).</li><li><b>Oscillator:</b> x'' + 2kx' + ω²x = F cos Ωt solved accurately (fourth-order Runge–Kutta, step 0.002 s), shown as a mass on a spring, an x–t graph and a phase-plane path (x against x').</li></ul>
<h3>Assumptions and simplifications</h3><ul><li>The spring obeys Hooke's law and the damping force is proportional to velocity; real dampers and springs are only approximately linear.</li><li>The "exact" curves use the formulae from solving the equations; Euler's dots show what a simple step-by-step method gives.</li><li>Equations such as dy/dx = −x/y are undefined where y = 0, where solutions stop.</li></ul>`,
});
const f3 = v => (+v.toFixed(4)).toString();

// ---------------- 4. Controls ----------------
const C = {};
let g = ui.group("What to explore");
C.mode = K.seg(g, { value: "field", options: [["field", "slope fields (first order)"], ["osc", "damped spring (second order)"]], on: v => set({ mode: v }) });
const gf = ui.group("First order"), go = ui.group("Second order: x'' + 2kx' + ω²x = F cos Ωt");
C.eq = K.seg(gf, { value: "relax", options: Object.entries(FO).map(([k, v]) => [k, v.name]), on: v => { P.eq = v; const b = FO[v].box; starts = [[b[0] + (b[1] - b[0]) * 0.2, (b[2] + b[3]) / 2]]; } });
C.h = K.slider(gf, { label: "Euler step h", min: 0.05, max: 1, step: 0.05, value: 0.5, fmt: v => v.toFixed(2), on: v => P.h = v });
C.showEuler = K.toggle(gf, { label: "Show Euler's method", value: true, on: v => P.showEuler = v });
C.showExact = K.toggle(gf, { label: "Show the exact solution", value: true, on: v => P.showExact = v });
K.note(gf, "Click the field to start a new solution curve.");
let rw = K.row(gf); K.btn(rw, "Clear curves", () => starts = [], "danger");
C.w = K.slider(go, { label: "ω (natural angular frequency)", min: 0.5, max: 8, step: 0.05, value: Math.PI, fmt: v => v.toFixed(2) + " rad s⁻¹", on: v => { P.w = v; ui.config.reset(); } });
C.k = K.slider(go, { label: "Damping k", min: 0, max: 10, step: 0.05, value: 0.4, fmt: v => v.toFixed(2), on: v => { P.k = v; ui.config.reset(); } });
let rw2 = K.row(go); K.btn(rw2, "Critical: k = ω", () => { P.k = P.w; C.k.set(P.k); ui.config.reset(); });
C.F = K.slider(go, { label: "Driving force F", min: 0, max: 10, step: 0.25, value: 0, on: v => { P.F = v; ui.config.reset(); } });
C.W = K.slider(go, { label: "Driving frequency Ω", min: 0.25, max: 8, step: 0.05, value: 3, fmt: v => v.toFixed(2) + " rad s⁻¹", on: v => { P.W = v; ui.config.reset(); } });
const read = K.readout(ui.group("Numbers"), [["a", ""], ["b", ""], ["c", ""], ["d", ""]]);
const relabel = n => n.forEach((x, i) => read.el.children[i].firstElementChild.textContent = x);
function showCtl() { gf.style.display = P.mode === "field" ? "" : "none"; go.style.display = P.mode === "osc" ? "" : "none"; C.mode.el.querySelectorAll("button")[1].style.display = ui.level === "adv" ? "" : "none"; }
function set(o) { Object.assign(P, DEF, { w: Math.PI }, o); if (P.mode === "osc" && ui.setLevel && ui.level !== "adv") ui.setLevel("adv"); for (const k of ["h", "w", "k", "F", "W"]) C[k].set(P[k]); for (const k of ["mode", "eq", "showEuler", "showExact"]) C[k].set(P[k]); starts = [[P.x0, P.y0]]; ui.config.reset(); showCtl(); }

// ---------------- 5. Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const M = { L: 46, R: 16, T: 16, B: 28 };
let box = null; const SX = x => M.L + (x - box[0]) / (box[1] - box[0]) * (cv.w - M.L - M.R), SY = y => cv.h - M.B - (y - box[2]) / (box[3] - box[2]) * (cv.h - M.T - M.B);
const WX = px => box[0] + (px - M.L) / (cv.w - M.L - M.R) * (box[1] - box[0]), WY = py => box[2] + (cv.h - M.B - py) / (cv.h - M.T - M.B) * (box[3] - box[2]);
const TX = (c, s, x, y, col = "#c9d4ea", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,system-ui,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
const COLS = ["#5ad1ff", "#ffb454", "#7ee787", "#ff7b9c", "#c4a1ff", "#ffe66d"];
K.pointer(cv.el, { down: p => { if (P.mode !== "field" || !box) return; starts.push([+WX(p.x).toFixed(2), +WY(p.y).toFixed(2)]); if (starts.length > 6) starts.shift(); }, hover: () => cv.el.style.cursor = P.mode === "field" ? "crosshair" : "default" });
function tick(dt) { if (P.mode !== "osc") return; if (!P.F && t > 15) ui.config.reset();   // start again once it has (nearly) settled
  const f = osc(P), h = 0.002; let n = Math.round(dt / h); while (n-- > 0) { st = rk4(f, t, st, h); t += h; } trail.push([t, st[0], st[1]]); if (trail.length > 3000) trail.shift(); }
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1222"; c.fillRect(0, 0, w, h);
  if (P.mode === "field") {
    const E = FO[P.eq]; box = E.box;
    c.strokeStyle = "#16203a"; for (let x = Math.ceil(box[0]); x <= box[1]; x++) { c.beginPath(); c.moveTo(SX(x), M.T); c.lineTo(SX(x), h - M.B); c.stroke(); TX(c, x, SX(x), h - M.B + 14, "#5d6e93", "center", "10px"); } for (let y = Math.ceil(box[2]); y <= box[3]; y++) { c.beginPath(); c.moveTo(M.L, SY(y)); c.lineTo(w - M.R, SY(y)); c.stroke(); TX(c, y, M.L - 6, SY(y) + 4, "#5d6e93", "right", "10px"); }
    c.strokeStyle = "#5d6e93"; c.beginPath(); c.moveTo(M.L, SY(0)); c.lineTo(w - M.R, SY(0)); c.moveTo(SX(0), M.T); c.lineTo(SX(0), h - M.B); c.stroke();
    // the slope field: a short segment with gradient f(x, y), drawn the same length on screen
    const nx = 28, ny = Math.round(nx * (h - M.T - M.B) / (w - M.L - M.R)), sx = (w - M.L - M.R) / (box[1] - box[0]), sy = (h - M.T - M.B) / (box[3] - box[2]);
    for (let i = 0; i <= nx; i++) for (let j = 0; j <= ny; j++) { const x = box[0] + (box[1] - box[0]) * (i + 0.5) / (nx + 1), y = box[2] + (box[3] - box[2]) * (j + 0.5) / (ny + 1), m = E.f(x, y); if (!isFinite(m)) continue; const ang = Math.atan2(m * sy, sx), L = 7; const px = SX(x), py = SY(y); c.strokeStyle = `hsla(${200 - Math.min(160, Math.abs(m) * 30)},60%,62%,.55)`; c.lineWidth = 1.4; c.beginPath(); c.moveTo(px - L * Math.cos(ang), py + L * Math.sin(ang)); c.lineTo(px + L * Math.cos(ang), py - L * Math.sin(ang)); c.stroke(); }
    c.lineWidth = 1; c.save(); c.beginPath(); c.rect(M.L, M.T, w - M.L - M.R, h - M.T - M.B); c.clip();
    starts.forEach(([x0, y0], i) => {
      const col = COLS[i % COLS.length];
      if (P.showExact) { c.strokeStyle = col; c.lineWidth = 2.5; c.beginPath(); let pen = false; for (let px = M.L; px <= w - M.R; px += 2) { const x = WX(px), y = E.exact(x, x0, y0); if (!isFinite(y) || Math.abs(y) > 1e3) { pen = false; continue; } pen ? c.lineTo(px, SY(y)) : c.moveTo(px, SY(y)); pen = true; } c.stroke(); c.lineWidth = 1; }
      if (P.showEuler) { const pts = euler(E.f, x0, y0, P.h, box[1]); c.strokeStyle = col; c.globalAlpha = 0.7; c.setLineDash([3, 3]); c.beginPath(); pts.forEach(([x, y], k) => k ? c.lineTo(SX(x), SY(y)) : c.moveTo(SX(x), SY(y))); c.stroke(); c.setLineDash([]); c.globalAlpha = 1; for (const [x, y] of pts) { c.fillStyle = col; c.fillRect(SX(x) - 2.5, SY(y) - 2.5, 5, 5); } }
      c.fillStyle = "#fff"; c.beginPath(); c.arc(SX(x0), SY(y0), 5, 0, 6.3); c.fill();
    });
    c.restore();
    ui.hud(`${E.name}<br>general solution: ${E.sol}${P.showEuler ? "<br>■ Euler, step h = " + P.h : ""}`);
  } else {
    // the mass on a spring (left), the x–t graph (right)
    const x = st[0], cx = w * 0.18, top = 30, scale = Math.min(70, (h - 140) / 4), y = h / 2 + x * scale;
    c.fillStyle = "#3a4a6e"; c.fillRect(cx - 50, top - 10, 100, 10); c.strokeStyle = "#c9d4ea"; c.lineWidth = 2; c.beginPath(); c.moveTo(cx, top); const coils = 14; for (let i = 1; i <= coils; i++) c.lineTo(cx + (i % 2 ? 14 : -14), top + (y - 30 - top) * i / coils); c.lineTo(cx, y - 30); c.stroke(); c.lineWidth = 1;
    c.fillStyle = "#ffb454"; c.fillRect(cx - 28, y - 30, 56, 56); c.strokeStyle = "rgba(255,255,255,.2)"; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(cx - 60, h / 2 - 2); c.lineTo(cx + 60, h / 2 - 2); c.stroke(); c.setLineDash([]); TX(c, "equilibrium", cx + 64, h / 2 + 2, "#8fa0bf", "left", "11px");
    if (P.k > 0) { c.fillStyle = "#3a4a6e"; c.fillRect(cx + 40, top, 10, 60); TX(c, "damper", cx + 54, top + 30, "#8fa0bf", "left", "11px"); }
    const gx0 = w * 0.36, gx1 = w - 20, T = 10, gy = h / 2, X = tt => gx0 + (tt - (t - T)) / T * (gx1 - gx0);
    c.strokeStyle = "#3a4a6e"; c.beginPath(); c.moveTo(gx0, gy); c.lineTo(gx1, gy); c.moveTo(gx0, 30); c.lineTo(gx0, h - 30); c.stroke(); TX(c, "x against t (last 10 s; x measured downwards from equilibrium)", gx0 + 6, 24, "#c9d4ea");
    if (P.k > 0 && P.k < P.w && P.F === 0) { c.strokeStyle = "rgba(255,230,109,.4)"; c.setLineDash([4, 4]); for (const s of [1, -1]) { c.beginPath(); for (let px = gx0; px <= gx1; px += 3) { const tt = t - T + (px - gx0) / (gx1 - gx0) * T; if (tt < 0) continue; const env = s * envAmp() * Math.exp(-P.k * tt); px === gx0 ? c.moveTo(px, gy + env * scale) : c.lineTo(px, gy + env * scale); } c.stroke(); } c.setLineDash([]); }
    c.strokeStyle = "#5ad1ff"; c.lineWidth = 2; c.beginPath(); let pen = false; for (const [tt, xx] of trail) { if (tt < t - T) continue; pen ? c.lineTo(X(tt), gy - xx * scale) : c.moveTo(X(tt), gy - xx * scale); pen = true; } c.stroke(); c.lineWidth = 1;
    const disc = 4 * P.k * P.k - 4 * P.w * P.w, rts = disc < 0 ? `m = −${P.k.toFixed(2)} ± ${Math.sqrt(-disc / 4).toFixed(2)}i` : disc === 0 ? `m = −${P.k.toFixed(2)} (repeated)` : `m = ${(-P.k + Math.sqrt(disc) / 2).toFixed(2)}, ${(-P.k - Math.sqrt(disc) / 2).toFixed(2)}`;
    ui.hud(`<b>${kind()}</b><br>auxiliary equation m² + ${(2 * P.k).toFixed(2)}m + ${(P.w * P.w).toFixed(2)} = 0<br>${rts}${P.F ? `<br>driven: F = ${P.F}, Ω = ${P.W.toFixed(2)}` : ""}`);
  }
}
function envAmp() { const p = Math.sqrt(Math.max(1e-9, P.w * P.w - P.k * P.k)); return Math.hypot(P.xs0, (P.vs0 + P.k * P.xs0) / p); }
function panels() {
  if (P.mode === "field") {
    const E = FO[P.eq], s0 = starts[starts.length - 1]; relabel(["Starting point", "Gradient there", "Euler at the right edge", "Exact at the right edge"]);
    if (!s0) { ["a", "b", "c", "d"].forEach(k => read.set(k, "–")); chA.draw([]); chB.draw([]); return; }
    const pts = euler(E.f, s0[0], s0[1], P.h, box[1]), last = pts[pts.length - 1], ex = E.exact(last[0], s0[0], s0[1]);
    read.set("a", `(${s0[0]}, ${s0[1]})`); read.set("b", f3(E.f(s0[0], s0[1]))); read.set("c", `y(${f3(last[0])}) ≈ ${f3(last[1])}`); read.set("d", isFinite(ex) ? f3(ex) : "undefined");
    chA.opts.title = "Exact solution and Euler's method (latest curve)"; chA.opts.xLabel = "x"; chA.opts.yLabel = "y"; const exPts = []; for (let i = 0; i <= 200; i++) { const x = s0[0] + (box[1] - s0[0]) * i / 200, y = E.exact(x, s0[0], s0[1]); if (isFinite(y) && Math.abs(y) < 1e3) exPts.push([x, y]); }
    chA.draw([{ pts: exPts, color: K.cssVar("--s0"), label: "exact" }, { pts: pts, type: "dots", r: 3, color: K.cssVar("--s1"), label: "Euler" }]);
    chB.opts.title = "Error of Euler's method along the curve"; chB.opts.xLabel = "x"; chB.opts.yLabel = "Euler − exact"; chB.draw([{ pts: pts.map(([x, y]) => [x, y - E.exact(x, s0[0], s0[1])]).filter(p => isFinite(p[1])), color: K.cssVar("--s3"), label: "error" }], { hlines: [{ y: 0 }] });
  } else {
    relabel(["Displacement x", "Velocity x'", "Type of damping", "Steady amplitude (theory)"]); read.set("a", st[0].toFixed(3)); read.set("b", st[1].toFixed(3)); read.set("c", kind());
    read.set("d", P.F ? (P.F / Math.sqrt((P.w ** 2 - P.W ** 2) ** 2 + (2 * P.k * P.W) ** 2)).toFixed(3) : "no driving force");
    chA.opts.title = "Phase plane: velocity against displacement"; chA.opts.xLabel = "x"; chA.opts.yLabel = "x'"; chA.draw([{ pts: trail.slice(-1500).map(q => [q[1], q[2]]), color: K.cssVar("--s4"), label: "path" }, { pts: [[st[0], st[1]]], type: "dots", r: 5, color: K.cssVar("--s1") }]);
    const R = []; for (let W = 0.1; W <= 8; W += 0.05) R.push([W, 1 / Math.sqrt((P.w ** 2 - W * W) ** 2 + (2 * P.k * W) ** 2)]);
    chB.opts.title = "Resonance: steady amplitude per unit force against Ω"; chB.opts.xLabel = "Ω (rad s⁻¹)"; chB.opts.yLabel = "amplitude ÷ F"; chB.draw([{ pts: R, color: K.cssVar("--s2"), label: "theory" }], { yMin: 0, yMax: Math.min(3, Math.max(...R.map(q => q[1])) * 1.1), vlines: [{ x: P.w, label: "ω" }].concat(P.F ? [{ x: P.W, label: "Ω", color: K.cssVar("--s1"), row: 1 }] : []) });
  }
}
let frame = 0;
ui.run(dt => tick(dt), () => { draw(); if (frame++ % 5 === 0) panels(); });
ui.onLevel = v => { if (v === "std" && P.mode === "osc") set({}); showCtl(); };
set({});
ui.tip("Click on the slope field to start a solution curve. Dots are Euler's method.", 7000);
