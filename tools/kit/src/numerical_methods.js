/* =====================================================================
   NUMERICAL METHODS: SOLVING f(x) = 0 WHEN ALGEBRA CANNOT
   1. CHANGE OF SIGN: if f is continuous and f(a), f(b) have opposite
      signs, there is a root between a and b. INTERVAL BISECTION halves
      the interval each step, keeping the half with the sign change.
      It can be fooled by an asymptote (a sign change with no root) and
      misses a repeated root (a root with no sign change).
   2. FIXED-POINT ITERATION: rearrange f(x) = 0 into x = g(x), then
      x(n+1) = g(x(n)). On a graph of y = g(x) and y = x it makes a
      STAIRCASE (if g' > 0) or a COBWEB (if g' < 0). It converges if
      |g'(x)| < 1 near the root and diverges if |g'(x)| > 1.
   3. NEWTON–RAPHSON: follow the tangent down to the x-axis:
        x(n+1) = x(n) − f(x(n)) / f'(x(n))
      Very fast near a root (the number of correct digits roughly
      doubles each step), but fails if f'(x) ≈ 0 (a flat tangent) or
      from a bad starting value (it can cycle or jump to another root).
   ===================================================================== */

// ---------------- 1. Equations, each with rearrangements x = g(x) ----------------
const EQ = {
  cubic: { name: "x³ − x − 1 = 0", f: x => x ** 3 - x - 1, df: x => 3 * x * x - 1, x0: -1, x1: 2.5, roots: [1.324717957244746],
    gs: [{ t: "x = ∛(x + 1)", g: x => Math.cbrt(x + 1) }, { t: "x = x³ − 1", g: x => x ** 3 - 1 }, { t: "x = √(1 + 1/x)", g: x => Math.sqrt(1 + 1 / x) }], a: 1, b: 2, start: 1 },
  cos: { name: "cos x − x = 0", f: x => Math.cos(x) - x, df: x => -Math.sin(x) - 1, x0: -0.5, x1: 1.8, roots: [0.7390851332151607],
    gs: [{ t: "x = cos x", g: Math.cos }, { t: "x = arccos x", g: x => Math.acos(x) }], a: 0, b: 1, start: 0.2 },
  exp: { name: "eˣ − 3x = 0", f: x => Math.exp(x) - 3 * x, df: x => Math.exp(x) - 3, x0: -0.5, x1: 2.2, roots: [0.6190612867359452, 1.512134551657842],
    gs: [{ t: "x = eˣ/3", g: x => Math.exp(x) / 3 }, { t: "x = ln(3x)", g: x => Math.log(3 * x) }], a: 1, b: 2, start: 1 },
  sqrt2: { name: "x² − 2 = 0", f: x => x * x - 2, df: x => 2 * x, x0: 0.2, x1: 2.6, roots: [Math.SQRT2],
    gs: [{ t: "x = 2/x", g: x => 2 / x }, { t: "x = ½(x + 2/x)", g: x => (x + 2 / x) / 2 }, { t: "x = x − (x² − 2)/4", g: x => x - (x * x - 2) / 4 }], a: 1, b: 2, start: 1 },
  cycle: { name: "x³ − 2x + 2 = 0", f: x => x ** 3 - 2 * x + 2, df: x => 3 * x * x - 2, x0: -2.5, x1: 1.8, roots: [-1.769292354238631],
    gs: [{ t: "x = ∛(2x − 2)", g: x => Math.cbrt(2 * x - 2) }, { t: "x = (x³ + 2)/2", g: x => (x ** 3 + 2) / 2 }], a: -2, b: -1, start: 0 },
  asym: { name: "1/(x − 2) = 0 (asymptote)", f: x => 1 / (x - 2), df: x => -1 / (x - 2) ** 2, x0: 0.5, x1: 3.5, roots: [],
    gs: [{ t: "x = x + 1/(x − 2)", g: x => x + 1 / (x - 2) }], a: 1, b: 3.3, start: 2.5 },
  double: { name: "(x − 1)²(x + 2) = 0 (repeated root)", f: x => (x - 1) ** 2 * (x + 2), df: x => 2 * (x - 1) * (x + 2) + (x - 1) ** 2, x0: -2.8, x1: 2.2, roots: [-2, 1],
    gs: [{ t: "x = x − (x − 1)²(x + 2)/6", g: x => x - (x - 1) ** 2 * (x + 2) / 6 }], a: 0, b: 2, start: 2 },
};
const nearestRoot = (E, x) => E.roots.length ? E.roots.reduce((b, r) => Math.abs(r - x) < Math.abs(b - x) ? r : b) : NaN;

// ---------------- 2. One step of each method ----------------
function nrStep(E, x) { const d = E.df(x); return Math.abs(d) < 1e-14 ? NaN : x - E.f(x) / d; }
function bisectStep(E, I) { const m = (I.a + I.b) / 2, fm = E.f(m); if (E.f(I.a) * fm <= 0) return { a: I.a, b: m, m }; return { a: m, b: I.b, m }; }
// run a method for up to n steps; returns the list of iterates
function runMethod(E, method, gi, start, n, I) {
  const xs = [start];
  if (method === "bisect") { let J = { a: I.a, b: I.b }; xs[0] = (J.a + J.b) / 2; for (let k = 0; k < n; k++) { J = bisectStep(E, J); xs.push((J.a + J.b) / 2); } return xs; }
  let x = start; for (let k = 0; k < n; k++) { x = method === "nr" ? nrStep(E, x) : E.gs[gi].g(x); if (!isFinite(x) || Math.abs(x) > 1e6) { xs.push(NaN); break; } xs.push(x); } return xs;
}

// ---------------- 3. State ----------------
const DEF = { eq: "cubic", method: "iter", gi: 0, start: 1, a: 1, b: 2, auto: true, dp: 6 };
const P = Object.assign({}, DEF);
let xs = [], I = { a: 1, b: 2 }, hist = [], tAcc = 0;
function restart() { xs = [P.method === "bisect" ? (P.a + P.b) / 2 : P.start]; I = { a: P.a, b: P.b }; hist = [{ a: P.a, b: P.b }]; tAcc = 0; }
function step() {
  const E = EQ[P.eq], x = xs[xs.length - 1]; if (!isFinite(x) || xs.length > 60) return;
  if (P.method === "bisect") { if (E.f(I.a) * E.f(I.b) > 0) return; I = bisectStep(E, I); hist.push({ a: I.a, b: I.b }); xs.push((I.a + I.b) / 2); }
  else { let nx = P.method === "nr" ? nrStep(E, x) : E.gs[P.gi].g(x); if (!isFinite(nx) || Math.abs(nx) > 1e6) nx = NaN; xs.push(nx); }
}

// ---------------- 4. The page ----------------
const ui = K.app({
  title: "Numerical Methods", subject: "Mathematics",
  blurb: "Solve equations step by step: change of sign and bisection, staircase and cobweb diagrams for x = g(x), Newton–Raphson, and how each can fail",
  reset: () => restart(), step: () => step(),
  levels: { std: "A level (9MA0)", adv: "Beyond: convergence", specs: {
    std: "Pearson Edexcel A level Mathematics (9MA0) Pure 9.1–9.3: locating roots by a change of sign (and where it fails: asymptotes and repeated roots), iteration x(n+1) = g(x(n)) with staircase and cobweb diagrams, convergence and divergence, and the Newton–Raphson method and its failures. (Numerical methods are not in AS 8MA0.)",
    adv: "Beyond 9MA0: why iteration converges when |g'(α)| < 1 (the error is multiplied by about g'(α) each step), the speed of convergence (linear for iteration and bisection, quadratic for Newton–Raphson), and Newton–Raphson as the iteration x = x − f(x)/f'(x). Useful for Further Mathematics and computing." } },
  missions: [
    { title: "Is there a root?", q: "f(x) = x³ − x − 1. Work out f(1) and f(2). How do you know there is a root between them? Bisect the interval: how many steps to get the root to 3 decimal places?", hint: "f(1) = −1 < 0 and f(2) = 5 > 0, and f is continuous, so a root lies in [1, 2]. Each step halves the interval: after 10 steps it is less than 0.001 wide. The root is 1.32472 (5 d.p.).", setup: () => set({ eq: "cubic", method: "bisect", a: 1, b: 2 }) },
    { title: "A staircase", q: "Iterate x = ∛(x + 1) from x₀ = 1. Watch the staircase diagram. Does it converge? Why do the steps get smaller?", hint: "It converges to 1.3247. Near the root the curve y = g(x) is much flatter than y = x (gradient about 0.19), so each step is about a fifth of the one before.", setup: () => set({ eq: "cubic", method: "iter", gi: 0, start: 1 }) },
    { title: "The wrong rearrangement", q: "Now use x = x³ − 1 from the same start (and then from 1.33, very close to the root). What happens?", hint: "It diverges, even from 1.33: near the root the curve y = x³ − 1 is steeper than y = x (gradient about 5.3), so every step moves further away. The same equation can give a good or a useless iteration.", setup: () => set({ eq: "cubic", method: "iter", gi: 1, start: 1.33 }) },
    { title: "A cobweb", q: "Solve cos x = x by iterating x = cos x from x₀ = 0.2. Why is it a cobweb, not a staircase?", hint: "y = cos x slopes downwards near the root (gradient −sin 0.739 = −0.67), so the iterates jump from one side of the root to the other and spiral in. Downward slope → cobweb; upward slope → staircase.", setup: () => set({ eq: "cos", method: "iter", gi: 0, start: 0.2 }) },
    { title: "Two roots, two iterations", q: "eˣ = 3x has two roots. Iterate x = eˣ/3 from x₀ = 1, then from x₀ = 1.6. Then try x = ln(3x). Which root can each one find?", hint: "x = eˣ/3 converges to 0.6191 (gentle slope there) but runs away from 1.5121 (steep slope). x = ln(3x) does the opposite: it finds 1.5121. Each rearrangement can only find the roots where it is flatter than y = x.", setup: () => set({ eq: "exp", method: "iter", gi: 0, start: 1 }) },
    { title: "Newton–Raphson", q: "Solve x² − 2 = 0 by Newton–Raphson from x₀ = 1. Count the correct decimal places after each step.", hint: "1 → 1.5 → 1.41667 → 1.4142157 → 1.41421356237: about 1, 2, 5, then 11 correct digits. The number of correct digits roughly doubles every step (quadratic convergence).", setup: () => set({ eq: "sqrt2", method: "nr", start: 1 }) },
    { title: "When Newton–Raphson fails", q: "x³ − 2x + 2 = 0 from x₀ = 0. What happens? Then try x₀ = −1.5.", hint: "From 0 it cycles 0, 1, 0, 1, … forever and never finds the root. From −1.5 it converges quickly to −1.7693. Also try a start near ±0.816, where f'(x) = 0: the tangent is almost flat and the next value shoots far away.", setup: () => set({ eq: "cycle", method: "nr", start: 0 }) },
    { title: "Change of sign without a root", q: "f(x) = 1/(x − 2) on [1, 3.3]: f(1) < 0 and f(3.3) > 0. Bisect. Does it find a root?", hint: "No: the interval closes in on x = 2, where there is an asymptote, not a root. The change of sign rule needs f to be continuous on the interval.", setup: () => set({ eq: "asym", method: "bisect", a: 1, b: 3.3 }) },
    { title: "A root without a change of sign", q: "f(x) = (x − 1)²(x + 2). Is there a change of sign in [0, 2]? Is there a root?", hint: "f(0) = 2 and f(2) = 4: no sign change, yet x = 1 is a root (the curve touches the axis). A repeated root, or two roots close together, can be missed by a change-of-sign search.", setup: () => set({ eq: "double", method: "bisect", a: 0, b: 2 }) },
    { lvl: "adv", title: "How fast? Errors step by step", q: "Compare the error chart for x = cos x, bisection and Newton–Raphson on the same equation. Which error falls in a straight line on the log graph, and which falls faster and faster?", hint: "Iteration and bisection: straight lines (the error is multiplied by a constant each step: about 0.67 for x = cos x and exactly 0.5 for bisection). Newton–Raphson: a curve that plunges, because the error is roughly squared each step.", setup: () => set({ eq: "cos", method: "nr", start: 0.2 }) },
  ],
  batch: [
    { title: "Bisection: how small is the error?", question: "For x³ − x − 1 = 0 on [1, 2], how far is the midpoint after n bisections from the true root?", how: "Exact calculation, one run per n. The theory line is the guaranteed bound: half the interval width, 1/2ⁿ⁺¹.", xLabel: "bisections n", yLabel: "|midpoint − root|", xs: [1, 2, 3, 4, 5, 6, 7, 8], reps: 1, yMin: 0, theory: n => 1 / 2 ** (n + 1), theoryLabel: "bound 1/2ⁿ⁺¹", run: n => Math.abs(runMethod(EQ.cubic, "bisect", 0, 1, n, { a: 1, b: 2 })[n] - EQ.cubic.roots[0]), note: "The error never exceeds the bound, but it is not always close to it: sometimes the midpoint lands near the root by luck." },
    { title: "Iteration: the error ratio", question: "Iterating x = cos x, what is each error divided by the error before it?", how: "Exact calculation from x₀ = 0.2. The theory is g'(α) = −sin α at the root α = 0.7391.", xLabel: "step n", yLabel: "error(n) ÷ error(n − 1)", xs: [2, 4, 6, 8, 10, 12, 14, 16], reps: 1, theory: () => -Math.sin(EQ.cos.roots[0]), theoryLabel: "g'(α) = −sin α", run: n => { const v = runMethod(EQ.cos, "iter", 0, 0.2, n), a = EQ.cos.roots[0]; return (v[n] - a) / (v[n - 1] - a); }, note: "Negative because the iterates swap sides (a cobweb). The ratio settles at g'(α) = −0.674: iteration converges if, and only if, |g'(α)| < 1." },
    { title: "Newton–Raphson: correct digits", question: "Solving x² − 2 = 0 from x₀ = 3, how many correct decimal places after each step?", how: "Exact calculation; correct digits = −log₁₀|error|.", xLabel: "step n", yLabel: "correct digits", xs: [1, 2, 3, 4, 5], reps: 1, yMin: 0, theory: n => { let e = 3 - Math.SQRT2; for (let k = 0; k < n; k++) e = e * e / (2 * (Math.SQRT2 + e)); return Math.min(16, -Math.log10(e)); }, theoryLabel: "eₙ₊₁ = eₙ²/(2xₙ)", run: n => Math.min(16, -Math.log10(Math.abs(runMethod(EQ.sqrt2, "nr", 0, 3, n)[n] - Math.SQRT2) || 1e-16)), note: "Slow at first (far from the root), then the digits roughly double each step until the computer runs out of precision (about 16 digits)." },
    { title: "Random starting points for Newton–Raphson", question: "Start Newton–Raphson for eˣ − 3x = 0 at a random x₀ between −1 and 3. Which root does it end up at?", how: "Each run: one random start; records the value reached after 40 steps (or nothing if it fails).", yLabel: "root reached", reps: 300, bins: 20, lo: 0.4, hi: 1.7, run: (x, r) => { const v = runMethod(EQ.exp, "nr", 0, -1 + 4 * r(), 40), e = v[v.length - 1]; return isFinite(e) ? e : null; }, note: "Two piles: starts left of ln 3 ≈ 1.0986 (where f'(x) = 0) slide to 0.619; starts to the right go to 1.512. Starts very near 1.0986 get flung far away first: Newton–Raphson's 'basins' can be surprising." },
    { title: "Steps to reach 6 decimal places", question: "Iteration x = ∛(x + 1) from a random x₀ in [0, 3]: how many steps to get within 0.0000005 of the root?", how: "Each run: one random start.", yLabel: "steps needed", reps: 300, bins: 12, lo: 0.5, hi: 12.5, theory: Math.log(5e-7 / 0.9) / Math.log(1 / (3 * Math.cbrt(2.324717957244746) ** 2)), theoryLabel: "≈ ln(tolerance ÷ typical start error) ÷ ln|g'(α)|", run: (x, r) => { let v = 3 * r(); for (let k = 1; k < 60; k++) { v = Math.cbrt(v + 1); if (Math.abs(v - EQ.cubic.roots[0]) < 5e-7) return k; } return 60; }, note: "With |g'(α)| ≈ 0.19 each step gains about 0.7 decimal places, so roughly 8 steps whatever the start." },
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "9.1", text: "If f(x) is continuous on [a, b] and f(a) and f(b) have opposite signs, then f(x) = 0 has a root in (a, b). To show a root is α to a given accuracy, check the sign of f at the bounds, e.g. f(1.3245) and f(1.3255)." },
      { lvl: "std", tag: "9.1", text: "A change of sign can fail: an asymptote gives a sign change with no root; a repeated root (touching the axis), or two roots close together, gives a root with no sign change." },
      { lvl: "std", tag: "9.2", text: "Iteration x(n+1) = g(x(n)): a staircase if the iterates approach from one side, a cobweb if they alternate. It may converge or diverge depending on the rearrangement and the starting value." },
      { lvl: "std", tag: "9.3", text: "Newton–Raphson: x(n+1) = x(n) − f(x(n))/f'(x(n)). It fails if f'(x(n)) = 0 (or is near 0), and can cycle or jump to a different root from a poor starting value." },
      { lvl: "adv", tag: "beyond", text: "Near a root α, error(n+1) ≈ g'(α) × error(n): iteration converges if |g'(α)| < 1 (staircase if 0 < g' < 1, cobweb if −1 < g' < 0). Newton–Raphson: error(n+1) ≈ (f''(α)/2f'(α)) × error(n)², quadratic convergence." },
    ],
    questions: [
      { lvl: "std", marks: 3, q: "Show that x³ − x − 1 = 0 has a root α between 1.3 and 1.4, and that α = 1.32 to 2 decimal places.", ans: "<ul><li>f(1.3) = −0.103 < 0, f(1.4) = 0.344 > 0: sign change, f continuous, so a root in (1.3, 1.4)</li><li>f(1.315) = −0.0410 < 0 and f(1.325) = 0.00128 > 0</li><li>sign change, so 1.315 < α < 1.325 and α = 1.32 (2 d.p.)</li></ul>" },
      { lvl: "std", marks: 3, q: "Use x(n+1) = ∛(x(n) + 1) with x₀ = 1 to find x₁, x₂ and x₃ to 4 decimal places.", ans: "<ul><li>x₁ = ∛2 = 1.2599</li><li>x₂ = 1.3123</li><li>x₃ = 1.3224</li></ul>" },
      { lvl: "std", marks: 3, q: "f(x) = x² − 2. Use one step of Newton–Raphson from x₀ = 1.5 to find x₁. Explain why x₀ = 0 cannot be used.", ans: "<ul><li>f'(x) = 2x; x₁ = 1.5 − (0.25)/(3) = 1.41667</li><li>at x₀ = 0, f'(0) = 0</li><li>the tangent is horizontal and never meets the x-axis (division by zero)</li></ul>" },
      { lvl: "std", marks: 2, q: () => { const E = EQ[P.eq]; return `For ${E.name}, explain why the iteration ${E.gs[P.gi] ? E.gs[P.gi].t : "x = g(x)"} ${P.method === "iter" && xs.length > 3 && isFinite(xs[xs.length - 1]) && Math.abs(xs[xs.length - 1] - xs[xs.length - 2]) < 1e-4 ? "converges" : "may not converge"} from x₀ = ${fmt(P.start)}, with reference to the diagram.`; }, ans: "<ul><li>near the root, compare the gradient of y = g(x) with the gradient of y = x (1)</li><li>if the curve is flatter (|g'| < 1) the steps shrink and it converges; if steeper, the steps grow and it diverges</li></ul>" },
      { lvl: "adv", marks: 3, q: "x = cos x has root α = 0.7391. Explain why iterating x = cos x converges, and why the diagram is a cobweb.", ans: "<ul><li>g'(x) = −sin x, g'(α) = −0.674</li><li>|g'(α)| < 1, so the errors shrink (multiplied by about 0.67 each step)</li><li>g'(α) < 0, so the iterates alternate sides of α: a cobweb</li></ul>" },
    ]
  },
  notes: `<h3>What the page does</h3><ul><li><b>Bisection:</b> starts with [a, b], checks the sign of f at the midpoint and keeps the half with a sign change. The bracket is drawn on the graph.</li><li><b>Iteration:</b> draws y = g(x) and y = x. From x₀ it goes up (or down) to the curve, across to y = x, and repeats: the staircase or cobweb diagram.</li><li><b>Newton–Raphson:</b> draws each tangent from (xₙ, f(xₙ)) down to the x-axis.</li><li>Errors are measured from the exact root (known here; in real problems it is not).</li></ul>
<h3>Assumptions and simplifications</h3><ul><li>The computer works to about 16 significant figures, so errors below about 10⁻¹⁵ are rounding, not the method.</li><li>An iteration is stopped after 60 steps or if it runs off beyond ±10⁶ (diverged).</li><li>Drag on the graph to choose a new starting value.</li></ul>`,
});
const fmt = v => isFinite(v) ? (+v.toFixed(P.dp)).toString() : "—";

// ---------------- 5. Controls ----------------
const C = {};
let g = ui.group("Equation f(x) = 0");
C.eq = K.seg(g, { value: "cubic", options: Object.entries(EQ).map(([k, v]) => [k, v.name]), on: v => set({ eq: v, method: P.method }) });
g = ui.group("Method");
C.method = K.seg(g, { value: "iter", options: [["bisect", "change of sign: bisection"], ["iter", "iteration x = g(x)"], ["nr", "Newton–Raphson"]], on: v => { P.method = v; showCtl(); restart(); } });
const gBox = K.$("div"); g.append(gBox);
C.start = K.slider(g, { label: "Starting value x₀", min: -3, max: 3, step: 0.01, value: 1, fmt: v => v.toFixed(2), on: v => { P.start = v; restart(); } });
C.a = K.slider(g, { label: "Interval from a", min: -3, max: 3, step: 0.05, value: 1, fmt: v => v.toFixed(2), on: v => { P.a = v; restart(); } });
C.b = K.slider(g, { label: "to b", min: -3, max: 3, step: 0.05, value: 2, fmt: v => v.toFixed(2), on: v => { P.b = v; restart(); } });
C.auto = K.toggle(g, { label: "Step automatically while playing", value: true, on: v => P.auto = v });
let rw = K.row(g); K.btn(rw, "Next step ▸", () => { ui.setPlaying(false); step(); }, "primary"); K.btn(rw, "Start again", () => restart());
const read = K.readout(ui.group("Numbers"), [["n", "Step n"], ["x", "xₙ"], ["fx", "f(xₙ)"], ["err", "Error from the root"], ["st", "Status"]]);
function buildG() { gBox.innerHTML = ""; const E = EQ[P.eq]; C.gi = K.seg(gBox, { label: "Rearrangement", value: P.gi, options: E.gs.map((q, i) => [i, q.t]), on: v => { P.gi = v; restart(); } }); }
function showCtl() { const m = P.method; C.gi.el.style.display = m === "iter" ? "" : "none"; C.start.el.style.display = m !== "bisect" ? "" : "none"; C.a.el.style.display = C.b.el.style.display = m === "bisect" ? "" : "none"; }
function set(o) {
  const E = EQ[o.eq || DEF.eq]; Object.assign(P, DEF, { start: E.start, a: E.a, b: E.b }, o); if (P.gi >= E.gs.length) P.gi = 0;
  for (const k of ["start", "a", "b"]) { const inp = C[k].el.querySelector("input"); inp.min = E.x0; inp.max = E.x1; C[k].set(P[k]); }
  C.eq.set(P.eq); C.method.set(P.method); C.auto.set(P.auto); buildG(); showCtl(); restart();
}

// ---------------- 6. Drawing ----------------
const cv = ui.canvas(() => { });
const chX = K.chart(ui.dock, { title: "Iterates xₙ", xLabel: "step n", yLabel: "xₙ" });
const chE = K.chart(ui.dock, { title: "log₁₀ |error| (straight line = linear convergence)", xLabel: "step n", yLabel: "log₁₀ |xₙ − α|" });
let view = null; const M = { L: 50, R: 20, T: 20, B: 30 };
const SX = x => M.L + (x - view.x0) / (view.x1 - view.x0) * (cv.w - M.L - M.R), SY = y => cv.h - M.B - (y - view.y0) / (view.y1 - view.y0) * (cv.h - M.T - M.B), WX = px => view.x0 + (px - M.L) / (cv.w - M.L - M.R) * (view.x1 - view.x0);
const TX = (c, s, x, y, col = "#c9d4ea", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,system-ui,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function curve(c, fn, col, w = 2.5, dash) { c.strokeStyle = col; c.lineWidth = w; c.setLineDash(dash || []); c.beginPath(); let pen = false, py0 = 0; for (let px = M.L; px <= cv.w - M.R; px += 1) { const y = fn(WX(px)); if (!isFinite(y) || Math.abs(y) > 1e4) { pen = false; continue; } const py = SY(y); if (pen && Math.abs(py - py0) > cv.h) pen = false; pen ? c.lineTo(px, py) : c.moveTo(px, py); pen = true; py0 = py; } c.stroke(); c.setLineDash([]); c.lineWidth = 1; }
function makeView() {
  const E = EQ[P.eq]; let fn = P.method === "iter" ? E.gs[P.gi].g : E.f, lo = Infinity, hi = -Infinity;
  for (let i = 0; i <= 200; i++) { const x = E.x0 + (E.x1 - E.x0) * i / 200, y = fn(x); if (isFinite(y) && Math.abs(y) < 50) { lo = Math.min(lo, y); hi = Math.max(hi, y); } }
  if (P.method === "iter") { lo = Math.min(lo, E.x0); hi = Math.max(hi, E.x1); }
  lo = Math.max(lo, -8); hi = Math.min(hi, 8); lo = Math.min(lo, -0.3); hi = Math.max(hi, 0.3); const p = (hi - lo) * 0.08; return { x0: E.x0, x1: E.x1, y0: lo - p, y1: hi + p };
}
K.pointer(cv.el, { down: p => pick(p), drag: p => pick(p), hover: () => cv.el.style.cursor = "crosshair" });
function pick(p) { if (!view) return; const x = +WX(p.x).toFixed(2); if (P.method === "bisect") { if (Math.abs(x - P.a) < Math.abs(x - P.b)) { P.a = Math.min(x, P.b - 0.05); C.a.set(P.a); } else { P.b = Math.max(x, P.a + 0.05); C.b.set(P.b); } } else { P.start = x; C.start.set(x); } restart(); }
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h, E = EQ[P.eq]; view = makeView(); c.fillStyle = "#0b1222"; c.fillRect(0, 0, w, h);
  const tk = (a, b, n) => { const st = Math.pow(10, Math.floor(Math.log10((b - a) / n))), m = (b - a) / n / st, s2 = (m < 2 ? 1 : m < 5 ? 2 : 5) * st, o = []; for (let k = Math.ceil(a / s2); k * s2 <= b; k++) o.push(+(k * s2).toPrecision(8)); return o; };
  c.strokeStyle = "#1a2440"; for (const v of tk(view.x0, view.x1, 12)) { c.beginPath(); c.moveTo(SX(v), M.T); c.lineTo(SX(v), h - M.B); c.stroke(); TX(c, String(v), SX(v), h - M.B + 15, "#8fa0bf", "center", "11px"); }
  for (const v of tk(view.y0, view.y1, 8)) { c.beginPath(); c.moveTo(M.L, SY(v)); c.lineTo(w - M.R, SY(v)); c.stroke(); TX(c, String(v), M.L - 6, SY(v) + 4, "#8fa0bf", "right", "11px"); }
  c.strokeStyle = "#5d6e93"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(M.L, SY(0)); c.lineTo(w - M.R, SY(0)); if (view.x0 < 0 && view.x1 > 0) { c.moveTo(SX(0), M.T); c.lineTo(SX(0), h - M.B); } c.stroke(); c.lineWidth = 1;
  c.save(); c.beginPath(); c.rect(M.L, M.T, w - M.L - M.R, h - M.T - M.B); c.clip();
  const last = xs[xs.length - 1];
  if (P.method === "iter") {
    const G = E.gs[P.gi].g; curve(c, x => x, "#8fa0bf", 1.5, [6, 4]); curve(c, G, "#5ad1ff", 2.6);
    // the staircase / cobweb: (x0, 0) → (x0, g(x0)) → (x1, x1) → (x1, g(x1)) → ...
    c.strokeStyle = "#ffb454"; c.lineWidth = 1.8; c.beginPath(); c.moveTo(SX(xs[0]), SY(0)); for (let i = 0; i < xs.length - 1; i++) { const a = xs[i], b = xs[i + 1]; if (!isFinite(b)) break; c.lineTo(SX(a), SY(b)); c.lineTo(SX(b), SY(b)); } c.stroke(); c.lineWidth = 1;
    xs.forEach((x, i) => { if (!isFinite(x)) return; c.fillStyle = i === xs.length - 1 ? "#fff" : "#ffb454"; c.beginPath(); c.arc(SX(x), SY(0), 4, 0, 6.3); c.fill(); if (i < 4) TX(c, "x" + "₀₁₂₃"[i], SX(x), SY(0) + 16, "#ffb454", "center", "11px"); });
    TX(c, "y = x", SX(view.x1) - 40, SY(view.x1) + 18, "#8fa0bf"); TX(c, "y = " + E.gs[P.gi].t.slice(4), M.L + 10, M.T + 36, "#5ad1ff", "left", "600 13px");
  } else {
    curve(c, E.f, "#5ad1ff", 2.6);
    if (P.method === "nr") {
      for (let i = 0; i < xs.length - 1; i++) { const a = xs[i], b = xs[i + 1]; if (!isFinite(a)) break; const fa = E.f(a); c.strokeStyle = "rgba(255,180,84,.5)"; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(SX(a), SY(0)); c.lineTo(SX(a), SY(fa)); c.stroke(); c.setLineDash([]);
        const d = E.df(a); c.strokeStyle = "#ffb454"; c.lineWidth = 1.8; c.beginPath(); const L = view.x1 - view.x0; if (isFinite(b)) { c.moveTo(SX(a), SY(fa)); c.lineTo(SX(b), SY(0)); } else { c.moveTo(SX(a - L), SY(fa - d * L)); c.lineTo(SX(a + L), SY(fa + d * L)); } c.stroke(); c.lineWidth = 1; }
      xs.forEach((x, i) => { if (!isFinite(x)) return; c.fillStyle = i === xs.length - 1 ? "#fff" : "#ffb454"; c.beginPath(); c.arc(SX(x), SY(0), 4, 0, 6.3); c.fill(); if (i < 4) TX(c, "x" + "₀₁₂₃"[i], SX(x), SY(0) + 16, "#ffb454", "center", "11px"); });
    } else {
      hist.forEach((J, i) => { const y = h - M.B - 10 - i * 8; if (y < M.T + 40) return; c.strokeStyle = i === hist.length - 1 ? "#ffe66d" : "rgba(255,230,109,.35)"; c.lineWidth = 3; c.beginPath(); c.moveTo(SX(J.a), y); c.lineTo(SX(J.b), y); c.stroke(); c.lineWidth = 1; });
      for (const [x, lab] of [[I.a, "a"], [I.b, "b"]]) { const fx = E.f(x); c.fillStyle = fx < 0 ? "#ff6b81" : "#7ee787"; c.beginPath(); c.arc(SX(x), SY(Math.max(view.y0, Math.min(view.y1, fx))), 5, 0, 6.3); c.fill(); c.strokeStyle = c.fillStyle; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(SX(x), SY(0)); c.lineTo(SX(x), SY(Math.max(view.y0, Math.min(view.y1, fx)))); c.stroke(); c.setLineDash([]); TX(c, `f(${lab}) ${fx < 0 ? "< 0" : "> 0"}`, SX(x) + (lab === "a" ? -6 : 6), SY(0) + (SX(I.b) - SX(I.a) < 90 ? (lab === "a" ? -8 : 18) : -8), c.fillStyle, lab === "a" ? "right" : "left", "11px"); }
    }
    TX(c, "y = f(x),  " + E.name, M.L + 10, M.T + 18, "#5ad1ff", "left", "600 13px");
  }
  for (const r of E.roots) { c.strokeStyle = "rgba(126,231,135,.6)"; c.beginPath(); c.arc(SX(r), SY(P.method === "iter" ? r : 0), 8, 0, 6.3); c.stroke(); }
  c.restore();
  const st = status(); ui.hud(`${P.method === "bisect" ? `[${fmt(I.a)}, ${fmt(I.b)}], width ${K.sig(I.b - I.a, 3)}` : "x" + sub(xs.length - 1) + " = " + fmt(last)}<br>${st}`);
}
const sub = n => String(n).split("").map(d => "₀₁₂₃₄₅₆₇₈₉"[+d]).join("");
function status() {
  const E = EQ[P.eq], last = xs[xs.length - 1], prev = xs[xs.length - 2];
  if (P.method === "bisect") { if (E.f(P.a) * E.f(P.b) > 0) return '<b style="color:#ffb454">no change of sign in [a, b]</b>'; const r = nearestRoot(E, last); return !isFinite(r) || Math.abs(E.f(last)) > 1 ? '<b style="color:#ff8a9a">sign change, but |f| is not getting small: no root here!</b>' : "change of sign: a root in the interval"; }
  if (!isFinite(last)) return '<b style="color:#ff8a9a">failed (diverged or division by zero)</b>';
  if (xs.length > 6 && P.method === "nr" && Math.abs(xs[xs.length - 1] - xs[xs.length - 3]) < 1e-9 && Math.abs(last - prev) > 1e-3) return '<b style="color:#ffb454">stuck in a cycle</b>';
  if (prev != null && Math.abs(last - prev) < 1e-10) return '<b style="color:#7ee787">converged</b>';
  if (xs.length > 4 && Math.abs(last - prev) > Math.abs(xs[xs.length - 3] - xs[xs.length - 4]) * 1.05) return '<b style="color:#ff8a9a">diverging</b>';
  return "iterating…";
}
function panels() {
  const E = EQ[P.eq], n = xs.length - 1, last = xs[n], r = nearestRoot(E, isFinite(last) ? last : 0);
  read.set("n", n); read.set("x", fmt(last)); read.set("fx", isFinite(last) ? K.sig(E.f(last), 4) : "—"); read.set("err", isFinite(last) && isFinite(r) ? K.sig(Math.abs(last - r), 3) : "—"); read.set("st", status().replace(/<[^>]+>/g, ""));
  chX.draw([{ pts: xs.map((x, i) => [i, x]).filter(p => isFinite(p[1]) && Math.abs(p[1]) < 100), color: K.cssVar("--s1"), label: "xₙ" }, { pts: xs.map((x, i) => [i, x]).filter(p => isFinite(p[1]) && Math.abs(p[1]) < 100), type: "dots", color: K.cssVar("--s1") }], { hlines: E.roots.map(q => ({ y: q, color: K.cssVar("--s2") })) });
  chE.draw([{ pts: xs.map((x, i) => [i, Math.log10(Math.abs(x - nearestRoot(E, x)) + 1e-17)]).filter(p => isFinite(p[1])), color: K.cssVar("--s3"), label: "log₁₀|error|" }, { pts: xs.map((x, i) => [i, Math.log10(Math.abs(x - nearestRoot(E, x)) + 1e-17)]).filter(p => isFinite(p[1])), type: "dots", color: K.cssVar("--s3") }]);
}
let frame = 0;
ui.run(dt => { if (!P.auto) return; tAcc += dt; if (tAcc > 0.9) { tAcc = 0; if (xs.length < 40) step(); } }, () => { draw(); if (frame++ % 5 === 0) panels(); });
set({});
ui.tip("Click or drag on the graph to choose the starting value. Step through, or let it play.", 7000);
