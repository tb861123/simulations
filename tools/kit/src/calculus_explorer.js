/* =====================================================================
   CALCULUS EXPLORER
   DIFFERENTIATION FROM FIRST PRINCIPLES: the gradient of a curve at x is
   the limit of the gradient of a chord from (x, f(x)) to (x + h, f(x + h))
   as h shrinks to 0:
        f'(x) = lim (h → 0) [ f(x + h) − f(x) ] / h
   e.g. for f(x) = x²: [(x + h)² − x²]/h = (2xh + h²)/h = 2x + h → 2x.
   STATIONARY POINTS are where f'(x) = 0: a maximum if f''(x) < 0, a
   minimum if f''(x) > 0 (and if f''(x) = 0, look either side).
   INTEGRATION: the area under y = f(x) from a to b is the limit of a sum
   of thin strips,  ∫ f(x) dx = F(b) − F(a)  where F' = f.
   Area below the x-axis counts as negative. The TRAPEZIUM RULE uses
   n strips of width h = (b − a)/n:
        ∫ ≈ h/2 [ y0 + 2(y1 + … + y(n−1)) + yn ]
   ===================================================================== */

// ---------------- 1. The functions (each with its exact derivatives and an antiderivative) ----------------
const FN = {
  cubic: { name: "cubic ax³ + bx² + cx + d", x0: -3, x1: 3, f: (x, q) => ((q.a * x + q.b) * x + q.c) * x + q.d, d1: (x, q) => (3 * q.a * x + 2 * q.b) * x + q.c, d2: (x, q) => 6 * q.a * x + 2 * q.b, F: (x, q) => q.a * x ** 4 / 4 + q.b * x ** 3 / 3 + q.c * x * x / 2 + q.d * x, tex: q => poly(q) },
  sq: { name: "x²", x0: -3, x1: 3, f: x => x * x, d1: x => 2 * x, d2: () => 2, F: x => x ** 3 / 3, tex: () => "y = x²", fp: (x, h) => `[(${fx(x)} + h)² − ${fx(x)}²] ÷ h = (${fx(2 * x)}h + h²) ÷ h = ${fx(2 * x)} + h` },
  cube: { name: "x³", x0: -2.5, x1: 2.5, f: x => x ** 3, d1: x => 3 * x * x, d2: x => 6 * x, F: x => x ** 4 / 4, tex: () => "y = x³", fp: (x, h) => `[(${fx(x)} + h)³ − ${fx(x)}³] ÷ h = ${fx(3 * x * x)} + ${fx(3 * x)}h + h²` },
  sin: { name: "sin x (A level)", adv: true, x0: -1, x1: 7, f: Math.sin, d1: Math.cos, d2: x => -Math.sin(x), F: x => -Math.cos(x), tex: () => "y = sin x  (x in radians)" },
  exp: { name: "eˣ (A level)", adv: true, x0: -3, x1: 2.5, f: Math.exp, d1: Math.exp, d2: Math.exp, F: Math.exp, tex: () => "y = eˣ" },
  ln: { name: "ln x (A level)", adv: true, x0: 0.05, x1: 8, f: Math.log, d1: x => 1 / x, d2: x => -1 / (x * x), F: x => x * Math.log(x) - x, tex: () => "y = ln x" },
};
const fx = v => (Math.abs(v) < 1e-9 ? 0 : +v.toFixed(3)).toString();
function poly(q) { const t = []; [[q.a, "x³"], [q.b, "x²"], [q.c, "x"], [q.d, ""]].forEach(([k, s]) => { if (Math.abs(k) < 1e-9) return; const sg = k < 0 ? " − " : t.length ? " + " : "", m = Math.abs(k); t.push(sg + (m === 1 && s ? "" : fx(m)) + s); }); return "y = " + (t.join("") || "0"); }
// stationary points of the current function: solve f'(x) = 0 by scanning for sign changes then halving the interval
function stationary(Q) {
  const D = FN[Q.fn], out = [], N = 800; let px = D.x0, pv = D.d1(px, Q);
  for (let i = 1; i <= N; i++) { const x = D.x0 + (D.x1 - D.x0) * i / N, v = D.d1(x, Q); if (pv === 0 || pv * v < 0 || (Math.abs(v) < 1e-12)) { let a = px, b = x; for (let k = 0; k < 60; k++) { const m = (a + b) / 2; D.d1(a, Q) * D.d1(m, Q) <= 0 ? b = m : a = m; } const r = (a + b) / 2; if (!out.some(o => Math.abs(o.x - r) < 1e-6)) { const s2 = D.d2(r, Q), kind = s2 < -1e-9 ? "maximum" : s2 > 1e-9 ? "minimum" : (D.d1(r - 1e-3, Q) * D.d1(r + 1e-3, Q) < 0 ? (D.d1(r - 1e-3, Q) > 0 ? "maximum" : "minimum") : "point of inflection"); out.push({ x: r, y: D.f(r, Q), kind, s2 }); } } px = x; pv = v; }
  return out;
}
// points of inflection: where f'' changes sign
function inflections(Q) { const D = FN[Q.fn], out = [], N = 800; let px = D.x0, pv = D.d2(px, Q); for (let i = 1; i <= N; i++) { const x = D.x0 + (D.x1 - D.x0) * (i - 0.3183) / N, v = D.d2(x, Q); if (pv * v < 0) { let a = px, b = x; for (let k = 0; k < 50; k++) { const m = (a + b) / 2; D.d2(a, Q) * D.d2(m, Q) <= 0 ? b = m : a = m; } out.push({ x: (a + b) / 2, y: D.f((a + b) / 2, Q) }); } px = x; pv = v; } return out; }
// numerical areas: n strips from a to b
function strips(Q, method, n) {
  const D = FN[Q.fn], a = Q.a0, b = Q.b0, h = (b - a) / n; let s = 0;
  for (let i = 0; i < n; i++) { const x = a + i * h; s += method === "left" ? D.f(x, Q) : method === "right" ? D.f(x + h, Q) : method === "mid" ? D.f(x + h / 2, Q) : (D.f(x, Q) + D.f(x + h, Q)) / 2; }
  return s * h;
}
const exactArea = Q => FN[Q.fn].F(Q.b0, Q) - FN[Q.fn].F(Q.a0, Q);
function totalArea(Q) { const D = FN[Q.fn], N = 4000, h = (Q.b0 - Q.a0) / N; let s = 0; for (let i = 0; i < N; i++) s += Math.abs(D.f(Q.a0 + (i + .5) * h, Q)); return s * h; }   // area counting every part as positive

// ---------------- 2. State ----------------
const DEF = { fn: "cubic", a: 1, b: 0, c: -3, d: 1, mode: "grad", x: 1, hExp: -0.3, a0: -1, b0: 2, n: 6, method: "trap", showD1: true, showD2: false, conc: false };
const P = Object.assign({}, DEF);
const hVal = () => Math.pow(10, P.hExp);

// ---------------- 3. The page ----------------
const ui = K.app({
  title: "Calculus Explorer", subject: "Mathematics",
  blurb: "Chords become tangents, gradients become a new function, and thin strips become an area: differentiation from first principles, stationary points and integration",
  reset: () => set({}),
  levels: { std: "AS (8MA0)", adv: "A level (9MA0)", specs: {
    std: "Pearson Edexcel AS Mathematics (8MA0) Pure 7.1–7.3: the gradient as the limit of a chord, differentiation from first principles for small powers of x, gradients, tangents and normals, increasing and decreasing functions, stationary points and the second derivative; Pure 8.1–8.3: indefinite and definite integrals and the area under a curve.",
    adv: "Pearson Edexcel A level Mathematics (9MA0) Pure 7: first principles for sin x and cos x, derivatives of eˣ and ln x, concave and convex curves and points of inflection; Pure 8: area as the limit of a sum, areas below the axis and between curves; Pure 9: the trapezium rule and its over- or under-estimates." } },
  missions: [
    { title: "Chord to tangent", q: "f(x) = x² at x = 1. Shrink h towards 0. What value does the chord's gradient approach? How does the algebra in the box explain it?", hint: "The chord gradient is 2 + h, so it approaches 2 as h → 0: f'(1) = 2. In general [(x + h)² − x²]/h = 2x + h → 2x. This is differentiation from first principles.", setup: () => set({ fn: "sq", mode: "grad", x: 1, hExp: 0 }) },
    { title: "The gradient function", q: "Drag the point along y = x³ (or use the slider). The lower chart traces the gradient at every x. What shape is the gradient function?", hint: "A parabola, 3x²: always positive or zero, zero at the origin (a point of inflection), and the same for x and −x.", setup: () => set({ fn: "cube", mode: "grad", x: -2, hExp: -3 }) },
    { title: "Stationary points", q: "y = x³ − 3x + 1. Find where the gradient is zero. Which point is a maximum and which a minimum? Check with f''(x).", hint: "f'(x) = 3x² − 3 = 0 at x = ±1. f''(x) = 6x: f''(−1) = −6 < 0, a maximum at (−1, 3); f''(1) = 6 > 0, a minimum at (1, −1).", setup: () => set({ mode: "stat" }) },
    { title: "Increasing and decreasing", q: "On which intervals is y = x³ − 3x + 1 increasing? Compare with where the gradient function is above the x-axis.", hint: "Increasing where f'(x) > 0: x < −1 and x > 1 (green). Decreasing for −1 < x < 1 (red).", setup: () => set({ mode: "stat", showD1: true }) },
    { title: "Area under a curve", q: "Find the area under y = x² from 0 to 2 with 4, then 20, then 100 rectangles. What value does it approach? Check by integrating.", hint: "∫₀² x² dx = [x³/3]₀² = 8/3 ≈ 2.667. More, thinner strips give a better estimate: area is the limit of a sum.", setup: () => set({ fn: "sq", mode: "area", a0: 0, b0: 2, n: 4, method: "left" }) },
    { title: "Below the axis", q: "∫ from −1 to 2 of x³ − 3x + 1. Why is the integral different from the total shaded area?", hint: "Parts below the x-axis give a negative contribution to the integral. To find the total area, integrate each part separately and add the sizes.", setup: () => set({ mode: "area", a0: -1, b0: 2, n: 60, method: "mid" }) },
    { lvl: "adv", title: "Gradient of sin x from first principles", q: "f(x) = sin x. Move the point and watch the gradient function. Which function is it? Why must x be in radians?", hint: "The gradient function is cos x. First principles uses sin h/h → 1 and (cos h − 1)/h → 0 as h → 0, which are only true in radians.", setup: () => set({ fn: "sin", mode: "grad", x: 0, hExp: -2 }) },
    { lvl: "adv", title: "Concave, convex and inflection", q: "y = x³ − 3x + 1: where is the curve concave (f'' < 0) and convex (f'' > 0)? Where is the point of inflection?", hint: "f''(x) = 6x: concave for x < 0, convex for x > 0, point of inflection at (0, 1) where f'' changes sign. It is not a stationary point (f'(0) = −3).", setup: () => set({ mode: "stat", showD2: true, conc: true }) },
    { lvl: "adv", title: "Trapezium rule: over or under?", q: "Use the trapezium rule on eˣ from 0 to 2 with 4 strips. Is it an overestimate or an underestimate? Why?", hint: "An overestimate: eˣ is convex (curves upwards), so every trapezium's top lies above the curve. For a concave curve (like ln x) it underestimates.", setup: () => set({ fn: "exp", mode: "area", a0: 0, b0: 2, n: 4, method: "trap" }) },
  ],
  batch: [
    { title: "How fast does the chord gradient converge?", question: "For y = x³ at x = 1, how far is the chord gradient from the true gradient 3 for each h?", how: "Exact calculation (no randomness): one run per h.", xLabel: "h", yLabel: "chord gradient − 3", xs: [1, 0.8, 0.6, 0.4, 0.2, 0.1, 0.05], reps: 1, yMin: 0, theory: h => 3 * h + h * h, theoryLabel: "3h + h²", run: h => ((1 + h) ** 3 - 1) / h - 3, note: "The error is 3h + h², so it shrinks in proportion to h for small h: halving h halves the error." },
    { title: "Trapezium rule error", question: "How does the error of the trapezium rule for ∫₀^π sin x dx (exactly 2) shrink as the number of strips grows?", how: "Exact calculation: one run per n. The answer is an underestimate (sin is concave), so the size of the error is plotted.", xLabel: "strips n", yLabel: "2 − trapezium estimate", xs: [2, 3, 4, 6, 8, 12, 16], reps: 1, yMin: 0, theory: n => Math.PI ** 2 / (6 * n * n), theoryLabel: "π²/(6n²)", run: n => 2 - strips(Object.assign({}, DEF, { fn: "sin", a0: 0, b0: Math.PI }), "trap", n), note: "Doubling n divides the error by 4: the error is proportional to h². The formula comes from (h²/12)(f'(b) − f'(a))." },
    { title: "Left rectangles against the trapezium rule", question: "For ∫₀¹ eˣ dx = e − 1, how much bigger is the error with left-hand rectangles?", how: "Exact calculation: one run per n. The plotted value is (exact − left sum).", xLabel: "strips n", yLabel: "exact − left-rectangle sum", xs: [2, 4, 6, 8, 12, 16, 24], reps: 1, yMin: 0, theory: n => (Math.E - 1) / (2 * n), theoryLabel: "(e − 1)/(2n)", run: n => (Math.E - 1) - strips(Object.assign({}, DEF, { fn: "exp", a0: 0, b0: 1 }), "left", n), note: "Rectangles converge only like 1/n; the trapezium rule like 1/n². That is why the trapezium rule is used." },
    { title: "Random cubics: how many stationary points?", question: "For y = x³ + bx² + cx with b and c random between −3 and 3, how many stationary points are there on average?", how: "Each run draws 50 random cubics and records the mean number of stationary points (found from the discriminant of f'(x) = 3x² + 2bx + c).", yLabel: "mean number of stationary points", reps: 200, bins: 20, theory: 4 / 3, theoryLabel: "2 × P(b² > 3c) = 4/3", run: (x, r) => { let k = 0; for (let i = 0; i < 50; i++) { const b = 6 * r() - 3, c = 6 * r() - 3; if (4 * b * b - 12 * c > 0) k += 2; } return k / 50; }, note: "f'(x) = 0 is a quadratic: two stationary points if its discriminant 4b² − 12c > 0, none if it is negative. This happens two-thirds of the time." },
    { title: "Area by random darts", question: "Throw n random points at the square 0 ≤ x, y ≤ 1. Does the fraction under y = x² estimate ∫₀¹ x² dx = 1/3?", how: "Each run throws 400 random points.", yLabel: "estimated area", reps: 300, bins: 24, theory: 1 / 3, theoryLabel: "1/3", run: (x, r) => { let k = 0; for (let i = 0; i < 400; i++) { const px = r(), py = r(); if (py < px * px) k++; } return k / 400; }, note: "A Monte Carlo estimate: unbiased, but noisy (SD √(p(1−p)/400) ≈ 0.024). Strips are far more accurate for one variable; random points win in many dimensions." },
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "P7.1", text: "The gradient at a point is the limit of the gradient of a chord: f'(x) = lim (h→0) [f(x + h) − f(x)]/h. dy/dx is the rate of change of y with respect to x." },
      { lvl: "std", tag: "P7.2", text: "If y = xⁿ then dy/dx = nxⁿ⁻¹ (and kxⁿ → knxⁿ⁻¹). The tangent at x = a has gradient f'(a); the normal is perpendicular, gradient −1/f'(a)." },
      { lvl: "std", tag: "P7.3", text: "Increasing where f'(x) > 0, decreasing where f'(x) < 0. Stationary points: f'(x) = 0. If f''(x) < 0 it is a maximum, if f''(x) > 0 a minimum." },
      { lvl: "std", tag: "P8.2", text: "∫ xⁿ dx = xⁿ⁺¹/(n + 1) + c (n ≠ −1). Definite integral: ∫ₐᵇ f(x) dx = F(b) − F(a). It gives the area between the curve and the x-axis, negative where the curve is below the axis." },
      { lvl: "adv", tag: "P7.1", text: "d/dx sin x = cos x and d/dx cos x = −sin x (x in radians, from first principles using sin h/h → 1). d/dx eᵏˣ = keᵏˣ, d/dx ln x = 1/x." },
      { lvl: "adv", tag: "P7.3", text: "Concave where f''(x) < 0, convex where f''(x) > 0. A point of inflection is where the curve changes from concave to convex (f'' changes sign)." },
      { lvl: "adv", tag: "P9", text: "Trapezium rule: ∫ₐᵇ y dx ≈ ½h[y₀ + 2(y₁ + … + yₙ₋₁) + yₙ], h = (b − a)/n. It overestimates for convex curves and underestimates for concave ones; more strips improve it." },
    ],
    questions: [
      { lvl: "std", marks: 4, q: "Prove from first principles that the derivative of x³ is 3x².", ans: "<ul><li>gradient of chord = [(x + h)³ − x³]/h</li><li>= (3x²h + 3xh² + h³)/h</li><li>= 3x² + 3xh + h²</li><li>as h → 0 this tends to 3x², so dy/dx = 3x²</li></ul>" },
      { lvl: "std", marks: 5, q: () => `Find the stationary points of ${poly(P.fn === "cubic" ? P : DEF)} and determine their nature.`, ans: () => { const Q = P.fn === "cubic" ? P : DEF, s = stationary(Object.assign({}, Q, { fn: "cubic" })); return `<ul><li>dy/dx = ${fx(3 * Q.a)}x² ${Q.b < 0 ? "−" : "+"} ${fx(Math.abs(2 * Q.b))}x ${Q.c < 0 ? "−" : "+"} ${fx(Math.abs(Q.c))} = 0</li>${s.length ? s.map(p => `<li>x = ${fx(p.x)}, y = ${fx(p.y)}: f'' = ${fx(p.s2)} → ${p.kind}</li>`).join("") : "<li>no real solutions: no stationary points</li>"}</ul>`; } },
      { lvl: "std", marks: 3, q: "Find the area enclosed by y = x(4 − x) and the x-axis.", ans: "<ul><li>crosses the axis at x = 0 and 4</li><li>∫₀⁴ (4x − x²) dx = [2x² − x³/3]₀⁴</li><li>= 32 − 64/3 = 32/3 ≈ 10.67</li></ul>" },
      { lvl: "adv", marks: 4, q: "Use the trapezium rule with 4 strips to estimate ∫₀² eˣ dx. State, with a reason, whether it is an over- or underestimate.", ans: "<ul><li>h = 0.5; y = 1, 1.6487, 2.7183, 4.4817, 7.3891</li><li>½ × 0.5 × [1 + 7.3891 + 2(1.6487 + 2.7183 + 4.4817)] = 6.522</li><li>overestimate (exact e² − 1 = 6.389)</li><li>because eˣ is convex: the trapezia lie above the curve</li></ul>" },
      { lvl: "adv", marks: 3, q: "Show that the curve y = x³ − 3x + 1 has a point of inflection at (0, 1).", ans: "<ul><li>d²y/dx² = 6x</li><li>= 0 at x = 0, y = 1</li><li>6x changes sign (negative for x < 0, positive for x > 0), so the curve changes from concave to convex: a point of inflection</li></ul>" },
    ]
  },
  notes: `<h3>What the page does</h3><ul><li>Every function has its exact derivatives built in; the chord gradient is worked out from the function values, so you can watch it approach the exact gradient.</li><li>Stationary points are found by scanning f'(x) for sign changes and then halving the interval; their nature uses f''(x) (and the sign of f' either side if f'' = 0).</li><li>Areas: left or right rectangles, midpoint rectangles or the trapezium rule, compared with the exact F(b) − F(a).</li></ul>
<h3>Assumptions and simplifications</h3><ul><li>The computer cannot take a true limit: h stops at 10⁻⁴. With far smaller h, rounding errors in the computer's arithmetic would spoil the chord gradient.</li><li>The graph is drawn from many short straight lines; stationary points closer together than about 1% of the window could be missed.</li><li>Trigonometric functions use radians.</li></ul>`,
});

// ---------------- 4. Controls ----------------
const C = {};
let g = ui.group("Function");
C.fn = K.seg(g, { value: "cubic", options: Object.entries(FN).map(([k, v]) => [k, v.name]), on: v => set({ fn: v, mode: P.mode }) });
C.a = K.slider(g, { label: "a", min: -2, max: 2, step: 0.1, value: 1, fmt: v => v.toFixed(1), on: v => P.a = v });
C.b = K.slider(g, { label: "b", min: -4, max: 4, step: 0.1, value: 0, fmt: v => v.toFixed(1), on: v => P.b = v });
C.c = K.slider(g, { label: "c", min: -6, max: 6, step: 0.1, value: -3, fmt: v => v.toFixed(1), on: v => P.c = v });
C.d = K.slider(g, { label: "d", min: -6, max: 6, step: 0.1, value: 1, fmt: v => v.toFixed(1), on: v => P.d = v });
g = ui.group("What to explore");
C.mode = K.seg(g, { value: "grad", options: [["grad", "gradient: chord → tangent"], ["stat", "stationary points"], ["area", "area under the curve"]], on: v => { P.mode = v; showCtl(); } });
C.x = K.slider(g, { label: "Point x", min: -4, max: 4, step: 0.01, value: 1, fmt: v => v.toFixed(2), on: v => P.x = v });
C.h = K.slider(g, { label: "Chord width h", min: -4, max: 0.3, step: 0.05, value: -0.3, fmt: v => K.sig(Math.pow(10, v), 3), on: v => P.hExp = v });
C.showD1 = K.toggle(g, { label: "Show the gradient function f'(x)", value: true, on: v => P.showD1 = v });
C.showD2 = K.toggle(g, { label: "Show the second derivative f''(x)", value: false, on: v => P.showD2 = v });
C.conc = K.toggle(g, { label: "Shade concave / convex (A level)", value: false, on: v => P.conc = v });
C.a0 = K.slider(g, { label: "From x = a", min: -4, max: 4, step: 0.05, value: -1, fmt: v => v.toFixed(2), on: v => P.a0 = Math.min(v, P.b0 - 0.05) });
C.b0 = K.slider(g, { label: "To x = b", min: -4, max: 4, step: 0.05, value: 2, fmt: v => v.toFixed(2), on: v => P.b0 = Math.max(v, P.a0 + 0.05) });
C.n = K.slider(g, { label: "Number of strips n", min: 1, max: 200, step: 1, value: 6, on: v => P.n = v });
C.method = K.seg(g, { label: "Strips", value: "trap", options: [["left", "left rectangles"], ["right", "right rectangles"], ["mid", "midpoint"], ["trap", "trapezium rule"]], on: v => P.method = v });
const read = K.readout(ui.group("Numbers"), [["f", "Function"], ["r1", ""], ["r2", ""], ["r3", ""], ["r4", ""]]);
const relabel = n => n.forEach((t, i) => read.el.children[i + 1].firstElementChild.textContent = t);
function showCtl() {
  const m = P.mode, adv = ui.level === "adv", cub = P.fn === "cubic";
  for (const k of ["a", "b", "c", "d"]) C[k].el.style.display = cub ? "" : "none";
  C.x.el.style.display = C.h.el.style.display = m === "grad" ? "" : "none";
  C.showD1.el.style.display = m !== "area" ? "" : "none"; C.showD2.el.style.display = m === "stat" ? "" : "none"; C.conc.el.style.display = m === "stat" && adv ? "" : "none";
  for (const k of ["a0", "b0", "n", "method"]) C[k].el.style.display = m === "area" ? "" : "none";
  C.fn.el.querySelectorAll("button").forEach((b, i) => b.style.display = !Object.values(FN)[i].adv || adv ? "" : "none");
}
function fitRanges() { const D = FN[P.fn]; for (const k of ["x", "a0", "b0"]) { const inp = C[k].el.querySelector("input"); inp.min = D.x0; inp.max = D.x1; } }
function set(o) {
  Object.assign(P, DEF, o); if (FN[P.fn].adv && ui.setLevel && ui.level !== "adv") ui.setLevel("adv"); if ((o.conc) && ui.setLevel && ui.level !== "adv") ui.setLevel("adv");
  fitRanges(); const D = FN[P.fn]; P.x = K.clamp(P.x, D.x0, D.x1); P.a0 = K.clamp(P.a0, D.x0, D.x1); P.b0 = K.clamp(P.b0, D.x0, D.x1);
  for (const k of ["a", "b", "c", "d", "x", "n"]) C[k].set(P[k]); C.h.set(P.hExp); C.a0.set(P.a0); C.b0.set(P.b0);
  for (const k of ["fn", "mode", "method", "showD1", "showD2", "conc"]) C[k].set(P[k]); trace = []; showCtl();
}

// ---------------- 5. Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
let view = null, dragging = null, trace = [];
const M = { L: 50, R: 20, T: 20, B: 30 };
function makeView() { const D = FN[P.fn]; let lo = Infinity, hi = -Infinity; for (let i = 0; i <= 300; i++) { const x = D.x0 + (D.x1 - D.x0) * i / 300, y = D.f(x, P); if (isFinite(y)) { lo = Math.min(lo, y); hi = Math.max(hi, y); } } lo = Math.max(lo, -12); hi = Math.min(hi, 12); if (P.mode !== "area" || true) { lo = Math.min(lo, -0.5); hi = Math.max(hi, 0.5); } const p = (hi - lo) * 0.12; return { x0: D.x0, x1: D.x1, y0: lo - p, y1: hi + p }; }
const SX = x => M.L + (x - view.x0) / (view.x1 - view.x0) * (cv.w - M.L - M.R), SY = y => cv.h - M.B - (y - view.y0) / (view.y1 - view.y0) * (cv.h - M.T - M.B), WX = px => view.x0 + (px - M.L) / (cv.w - M.L - M.R) * (view.x1 - view.x0);
const TX = (c, s, x, y, col = "#c9d4ea", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,system-ui,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function curve(c, fn, col, w = 2.5, dash) { c.strokeStyle = col; c.lineWidth = w; c.setLineDash(dash || []); c.beginPath(); let pen = false; for (let px = M.L; px <= cv.w - M.R; px += 1.5) { const y = fn(WX(px)); if (!isFinite(y) || Math.abs(y) > 1e3) { pen = false; continue; } const py = SY(y); pen ? c.lineTo(px, py) : c.moveTo(px, py); pen = true; } c.stroke(); c.setLineDash([]); c.lineWidth = 1; }
K.pointer(cv.el, {
  down: p => { if (!view) return; const x = WX(p.x); if (P.mode === "grad") dragging = "x"; else if (P.mode === "area") dragging = Math.abs(x - P.a0) < Math.abs(x - P.b0) ? "a0" : "b0"; move(p); },
  drag: p => move(p), up: () => dragging = null,
  hover: p => cv.el.style.cursor = P.mode === "stat" ? "default" : "ew-resize"
});
function move(p) { if (!dragging) return; const D = FN[P.fn], x = K.clamp(WX(p.x), D.x0, D.x1); if (dragging === "x") { P.x = x; C.x.set(x); } if (dragging === "a0") { P.a0 = Math.min(x, P.b0 - 0.05); C.a0.set(P.a0); } if (dragging === "b0") { P.b0 = Math.max(x, P.a0 + 0.05); C.b0.set(P.b0); } }
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h, D = FN[P.fn], f = x => D.f(x, P); view = makeView();
  c.fillStyle = "#0b1222"; c.fillRect(0, 0, w, h);
  // grid
  const tk = (a, b, n) => { const st = Math.pow(10, Math.floor(Math.log10((b - a) / n))), m = (b - a) / n / st, step = (m < 2 ? 1 : m < 5 ? 2 : 5) * st, o = []; for (let k = Math.ceil(a / step); k * step <= b; k++) o.push(+(k * step).toPrecision(8)); return o; };
  c.strokeStyle = "#1a2440"; for (const v of tk(view.x0, view.x1, 12)) { c.beginPath(); c.moveTo(SX(v), M.T); c.lineTo(SX(v), h - M.B); c.stroke(); TX(c, String(v), SX(v), h - M.B + 15, "#8fa0bf", "center", "11px"); }
  for (const v of tk(view.y0, view.y1, 8)) { c.beginPath(); c.moveTo(M.L, SY(v)); c.lineTo(w - M.R, SY(v)); c.stroke(); TX(c, String(v), M.L - 6, SY(v) + 4, "#8fa0bf", "right", "11px"); }
  c.strokeStyle = "#5d6e93"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(M.L, SY(0)); c.lineTo(w - M.R, SY(0)); if (view.x0 < 0) { c.moveTo(SX(0), M.T); c.lineTo(SX(0), h - M.B); } c.stroke(); c.lineWidth = 1;
  c.save(); c.beginPath(); c.rect(M.L, M.T, w - M.L - M.R, h - M.T - M.B); c.clip();
  if (P.mode === "stat") {
    // shading: increasing (green) / decreasing (red) along the axis, or concave / convex
    for (let px = M.L; px < w - M.R; px += 2) { const x = WX(px), g1 = D.d1(x, P), g2 = D.d2(x, P); c.fillStyle = P.conc && ui.level === "adv" ? (g2 < 0 ? "rgba(196,161,255,.12)" : "rgba(255,230,109,.08)") : (g1 > 0 ? "rgba(126,231,135,.08)" : "rgba(255,107,129,.08)"); c.fillRect(px, M.T, 2, h); }
    if (P.showD1) curve(c, x => D.d1(x, P), "#ffb454", 1.8, [6, 4]);
    if (P.showD2) curve(c, x => D.d2(x, P), "#c4a1ff", 1.5, [2, 4]);
  }
  if (P.mode === "area") {
    const n = P.n, hh = (P.b0 - P.a0) / n;
    for (let px = Math.max(M.L, SX(P.a0)); px < Math.min(w - M.R, SX(P.b0)); px++) { const y = f(WX(px)); c.fillStyle = y >= 0 ? "rgba(90,209,255,.18)" : "rgba(255,107,129,.2)"; c.fillRect(px, Math.min(SY(y), SY(0)), 1, Math.abs(SY(y) - SY(0))); }
    c.strokeStyle = "#ffe66d"; c.fillStyle = "rgba(255,230,109,.18)";
    for (let i = 0; i < n; i++) { const xa = P.a0 + i * hh, xb = xa + hh; c.beginPath(); if (P.method === "trap") { c.moveTo(SX(xa), SY(0)); c.lineTo(SX(xa), SY(f(xa))); c.lineTo(SX(xb), SY(f(xb))); c.lineTo(SX(xb), SY(0)); } else { const y = f(P.method === "left" ? xa : P.method === "right" ? xb : xa + hh / 2); c.rect(SX(xa), Math.min(SY(y), SY(0)), SX(xb) - SX(xa), Math.abs(SY(y) - SY(0))); } c.closePath(); c.fill(); if (n <= 80) c.stroke(); }
    for (const x of [P.a0, P.b0]) { c.strokeStyle = "#fff"; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(SX(x), M.T); c.lineTo(SX(x), h - M.B); c.stroke(); c.setLineDash([]); }
  }
  curve(c, f, "#5ad1ff", 2.8);
  if (P.mode === "grad") {
    const x = P.x, hv = hVal(), y = f(x), y2 = f(x + hv), m = (y2 - y) / hv, t = D.d1(x, P), L = (view.x1 - view.x0);
    c.strokeStyle = "#7ee787"; c.lineWidth = 2; c.beginPath(); c.moveTo(SX(x - L), SY(y - t * L)); c.lineTo(SX(x + L), SY(y + t * L)); c.stroke();
    c.strokeStyle = "#ffb454"; c.setLineDash([6, 4]); c.beginPath(); c.moveTo(SX(x - L), SY(y - m * L)); c.lineTo(SX(x + L), SY(y + m * L)); c.stroke(); c.setLineDash([]); c.lineWidth = 1;
    if (Math.abs(SX(x + hv) - SX(x)) > 18) { c.strokeStyle = "#ffb454"; c.setLineDash([2, 3]); c.beginPath(); c.moveTo(SX(x), SY(y)); c.lineTo(SX(x + hv), SY(y)); c.lineTo(SX(x + hv), SY(y2)); c.stroke(); c.setLineDash([]); TX(c, "h", (SX(x) + SX(x + hv)) / 2, SY(y) + 14, "#ffb454", "center"); }
    for (const [px, py, col] of [[x, y, "#fff"], [x + hv, y2, "#ffb454"]]) { c.fillStyle = col; c.beginPath(); c.arc(SX(px), SY(py), 6, 0, 6.3); c.fill(); }
    if (P.showD1) curve(c, xx => D.d1(xx, P), "rgba(255,180,84,.35)", 1.5, [3, 5]);
  }
  if (P.mode === "stat") {
    for (const s of stationary(P)) { c.fillStyle = s.kind === "maximum" ? "#ff8a9a" : s.kind === "minimum" ? "#7ee787" : "#ffe66d"; c.beginPath(); c.arc(SX(s.x), SY(s.y), 7, 0, 6.3); c.fill(); TX(c, `${s.kind} (${fx(s.x)}, ${fx(s.y)})`, SX(s.x) + 10, SY(s.y) + (s.kind === "maximum" ? -10 : 18), c.fillStyle, "left", "600 12px"); c.strokeStyle = c.fillStyle; c.beginPath(); c.moveTo(SX(s.x) - 40, SY(s.y)); c.lineTo(SX(s.x) + 40, SY(s.y)); c.stroke(); }
    if (ui.level === "adv" && (P.showD2 || P.conc)) for (const q of inflections(P)) { c.strokeStyle = "#c4a1ff"; c.lineWidth = 2; c.beginPath(); c.arc(SX(q.x), SY(q.y), 7, 0, 6.3); c.stroke(); c.lineWidth = 1; TX(c, `point of inflection (${fx(q.x)}, ${fx(q.y)})`, SX(q.x) + 10, SY(q.y) - 10, "#c4a1ff", "left", "11px"); }
  }
  c.restore();
  TX(c, D.tex(P), M.L + 10, M.T + 18, "#5ad1ff", "left", "600 14px");
  if (P.mode === "grad") { const hv = hVal(), m = (f(P.x + hv) - f(P.x)) / hv; ui.hud(`chord gradient [f(x + h) − f(x)] ÷ h = <b style="color:#ffb454">${m.toFixed(5)}</b><br>tangent gradient f'(${fx(P.x)}) = <b style="color:#7ee787">${D.d1(P.x, P).toFixed(5)}</b>${D.fp ? "<br>" + D.fp(P.x, hv) : ""}`); }
  else if (P.mode === "area") { const ex = exactArea(P), ap = strips(P, P.method, P.n); ui.hud(`∫ from ${fx(P.a0)} to ${fx(P.b0)} = <b>${ex.toFixed(5)}</b><br>${P.n} strips (${P.method === "trap" ? "trapezium rule" : P.method + " rectangles"}): <b style="color:#ffe66d">${ap.toFixed(5)}</b> (${ap > ex ? "over" : "under"} by ${Math.abs(ap - ex).toExponential(2)})`); }
  else ui.hud(`<span style="color:#7ee787">green</span>: increasing (f' > 0) · <span style="color:#ff8a9a">red</span>: decreasing${P.showD1 ? "<br>dashed orange: gradient function f'(x)" : ""}`);
}
function panels() {
  const D = FN[P.fn], f = x => D.f(x, P); read.set("f", D.tex(P).replace("y = ", ""));
  if (P.mode === "grad") {
    relabel(["Point", "Chord gradient", "True gradient f'(x)", "Difference"]); const hv = hVal(), m = (f(P.x + hv) - f(P.x)) / hv, t = D.d1(P.x, P);
    read.set("r1", `(${fx(P.x)}, ${fx(f(P.x))}), h = ${K.sig(hv, 3)}`); read.set("r2", m.toFixed(6)); read.set("r3", t.toFixed(6)); read.set("r4", (m - t).toExponential(2));
    // chart A: gradient function traced as you move; chart B: chord gradient against h
    const key = P.fn + P.a + P.b + P.c + P.d; if (trace.key !== key) { trace = []; trace.key = key; } trace.push([P.x, t]); if (trace.length > 2000) trace.shift();
    const g = []; for (let i = 0; i <= 200; i++) { const x = D.x0 + (D.x1 - D.x0) * i / 200; g.push([x, D.d1(x, P)]); }
    chA.opts.title = "The gradient function: the gradient at every x you visit"; chA.opts.xLabel = "x"; chA.opts.yLabel = "gradient";
    chA.draw([{ pts: g, color: K.cssVar("--muted"), dash: [4, 4], label: "f'(x)" }, { pts: trace.slice(), type: "dots", r: 2.5, color: K.cssVar("--s2"), label: "visited" }], { xMin: D.x0, xMax: D.x1, vlines: [{ x: P.x }] });
    const hs = []; for (let e = 0.3; e >= -4; e -= 0.05) { const hv2 = Math.pow(10, e); hs.push([hv2, (f(P.x + hv2) - f(P.x)) / hv2]); }
    chB.opts.title = "Chord gradient as h shrinks"; chB.opts.xLabel = "h"; chB.opts.yLabel = "chord gradient";
    chB.draw([{ pts: hs.filter(p => p[0] <= 1), color: K.cssVar("--s1"), label: "chord" }, { pts: [[hv, m]], type: "dots", r: 5, color: K.cssVar("--s1") }], { xMin: 0, xMax: 1, hlines: [{ y: t, color: K.cssVar("--s2"), label: "f'(x) = " + t.toFixed(3) }] });
  } else if (P.mode === "stat") {
    const s = stationary(P); relabel(["Stationary points", "f'(x)", "Nature (f'')", "Points of inflection"]);
    read.set("r1", s.length ? s.map(p => `(${fx(p.x)}, ${fx(p.y)})`).join(", ") : "none"); read.set("r2", P.fn === "cubic" ? `${fx(3 * P.a)}x² + ${fx(2 * P.b)}x + ${fx(P.c)}` : "see the graph"); read.set("r3", s.length ? s.map(p => `${p.kind} (f'' = ${fx(p.s2)})`).join("; ") : "–");
    read.set("r4", ui.level === "adv" ? (inflections(P).map(q => `(${fx(q.x)}, ${fx(q.y)})`).join(", ") || "none") : "A level");
    const g1 = [], g2 = []; for (let i = 0; i <= 200; i++) { const x = D.x0 + (D.x1 - D.x0) * i / 200; g1.push([x, D.d1(x, P)]); g2.push([x, D.d2(x, P)]); }
    chA.opts.title = "Gradient function f'(x): stationary where it crosses 0"; chA.opts.xLabel = "x"; chA.opts.yLabel = "f'(x)"; chA.draw([{ pts: g1, color: K.cssVar("--s1"), label: "f'(x)" }], { hlines: [{ y: 0 }], vlines: s.map(p => ({ x: p.x, color: K.cssVar("--s2") })) });
    chB.opts.title = "Second derivative f''(x)"; chB.opts.xLabel = "x"; chB.opts.yLabel = "f''(x)"; chB.draw([{ pts: g2, color: K.cssVar("--s4"), label: "f''(x)" }], { hlines: [{ y: 0 }] });
  } else {
    const ex = exactArea(P), ap = strips(P, P.method, P.n); relabel(["Exact ∫ = F(b) − F(a)", "Estimate", "Error", "Total area (all positive)"]);
    read.set("r1", ex.toFixed(6)); read.set("r2", ap.toFixed(6)); read.set("r3", (ap - ex).toExponential(3)); read.set("r4", totalArea(P).toFixed(5));
    const ns = [1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64, 100, 150, 200], ser = [["left", "--s0"], ["right", "--s3"], ["mid", "--s4"], ["trap", "--s1"]].map(([m, col]) => ({ pts: ns.map(n => [n, strips(P, m, n)]), color: K.cssVar(col), label: m === "trap" ? "trapezium" : m }));
    chA.opts.title = "Estimates against the number of strips"; chA.opts.xLabel = "n"; chA.opts.yLabel = "estimate"; chA.draw(ser, { hlines: [{ y: ex, label: "exact", color: K.cssVar("--s2") }], vlines: [{ x: P.n }] });
    const er = ["left", "trap"].map((m, i) => ({ pts: ns.map(n => [Math.log10(n), Math.log10(Math.abs(strips(P, m, n) - ex) + 1e-16)]), color: K.cssVar(i ? "--s1" : "--s0"), label: m === "trap" ? "trapezium" : "left" }));
    chB.opts.title = "log₁₀ |error| against log₁₀ n (gradients −1 and −2)"; chB.opts.xLabel = "log₁₀ n"; chB.opts.yLabel = "log₁₀ |error|"; chB.draw(er);
  }
}
let frame = 0;
ui.run(() => { }, () => { draw(); if (frame++ % 4 === 0) panels(); });
ui.onLevel = v => { if (v === "std" && FN[P.fn].adv) set({ mode: P.mode }); showCtl(); };
set({});
ui.tip("Drag on the graph to move the point. Shrink h to turn the chord into a tangent.", 7000);
