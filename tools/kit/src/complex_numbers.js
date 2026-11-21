/* =====================================================================
   COMPLEX NUMBERS ON THE ARGAND DIAGRAM
   z = x + iy is plotted as the point (x, y). In MODULUS–ARGUMENT form
       z = r(cos θ + i sin θ) = re^(iθ),  r = |z| = √(x² + y²),  θ = arg z
   ADDING is vector addition. MULTIPLYING multiplies the moduli and ADDS
   the arguments: so multiplying by i rotates by 90°, and by e^(iθ)
   rotates by θ. DIVIDING divides the moduli and subtracts the arguments.
   De Moivre:  [r(cos θ + i sin θ)]ⁿ = rⁿ(cos nθ + i sin nθ)
   The n solutions of zⁿ = w lie on a circle of radius |w|^(1/n), equally
   spaced 2π/n apart: for w = 1 they are the ROOTS OF UNITY, the vertices
   of a regular n-gon, and they add up to 0.
   LOCI: |z − a| = r is a circle centre a; |z − a| = |z − b| is the
   perpendicular bisector of a and b; arg(z − a) = θ is a half-line.
   ===================================================================== */
// ---------------- 1. Complex arithmetic (a complex number is [re, im]) ----------------
const add = (a, b) => [a[0] + b[0], a[1] + b[1]], sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const mul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const div = (a, b) => { const d = b[0] * b[0] + b[1] * b[1] || 1e-12; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
const mod = a => Math.hypot(a[0], a[1]), arg = a => Math.atan2(a[1], a[0]);
const polar = (r, t) => [r * Math.cos(t), r * Math.sin(t)];
const powC = (a, n) => polar(Math.pow(mod(a), n), n * arg(a));          // de Moivre
const conj = a => [a[0], -a[1]];
const f2 = v => (Math.abs(v) < 5e-4 ? 0 : +v.toFixed(3));
const cstr = a => { const x = f2(a[0]), y = f2(a[1]); if (!y) return String(x); const ys = Math.abs(y) === 1 ? "" : String(Math.abs(y)); return (x ? x + (y < 0 ? " − " : " + ") : y < 0 ? "−" : "") + ys + "i"; };
const deg = t => (t * 180 / Math.PI);
const argStr = t => { const q = t / Math.PI, fr = [[0, "0"], [1, "π"], [-1, "−π"], [0.5, "π/2"], [-0.5, "−π/2"], [0.25, "π/4"], [-0.25, "−π/4"], [0.75, "3π/4"], [-0.75, "−3π/4"], [1 / 3, "π/3"], [-1 / 3, "−π/3"], [2 / 3, "2π/3"], [-2 / 3, "−2π/3"], [1 / 6, "π/6"], [-1 / 6, "−π/6"], [5 / 6, "5π/6"], [-5 / 6, "−5π/6"]]; for (const [v, s] of fr) if (Math.abs(q - v) < 1e-3) return s; return t.toFixed(3); };

// ---------------- 2. State ----------------
const DEF = { mode: "arith", op: "mul", z: [1.5, 1], w: [0.5, 1.2], n: 5, root: [1, 0], locus: "circle", a: [1, 1], b: [-1, 0], r: 1.5, theta: 45, region: false, anim: true };
const P = JSON.parse(JSON.stringify(DEF));
let tAnim = 0, drag = null;

// ---------------- 3. The page ----------------
const ui = K.app({
  title: "Complex Numbers", subject: "Further Mathematics",
  blurb: "Drag points on the Argand diagram: multiplication as rotation and scaling, de Moivre's theorem, the nth roots of a number, and loci",
  reset: () => set({ mode: P.mode }),
  levels: { std: "AS Further Maths (8FM0)", adv: "A level Further Maths (9FM0)", specs: {
    std: "Pearson Edexcel AS Further Mathematics (8FM0) Core Pure 2: complex numbers, the Argand diagram, modulus and argument, modulus–argument form, multiplying and dividing (moduli multiply, arguments add), complex roots of polynomials with real coefficients (conjugate pairs), and loci and regions: |z − a| = r, |z − a| = |z − b|, arg(z − a) = θ.",
    adv: "Pearson Edexcel A level Further Mathematics (9FM0) Core Pure 1: exponential form re^(iθ), de Moivre's theorem, powers zⁿ, the nth roots of a complex number and of unity (geometrically, a regular polygon), and the sum of the roots of unity." } },
  missions: [
    { title: "Multiplying by i", q: "Make w = i (drag it to (0, 1)). What does multiplying z by i do to the point? Do it again (i²z). Where is it now?", hint: "Multiplying by i rotates z by 90° anticlockwise about the origin (|i| = 1, arg i = π/2). Twice gives a half-turn: i²z = −z. This is why i² = −1.", setup: () => set({ mode: "arith", op: "mul", z: [1.5, 1], w: [0, 1] }) },
    { title: "Moduli multiply, arguments add", q: "Drag z and w. Compare |zw| with |z| × |w|, and arg(zw) with arg z + arg w.", hint: "|zw| = |z||w| always. arg(zw) = arg z + arg w (subtract 2π if it goes past π, to stay in the principal range −π < θ ≤ π).", setup: () => set({ mode: "arith", op: "mul" }) },
    { title: "Adding is like vectors", q: "Choose z + w. How do you find z + w on the diagram? What about z − w?", hint: "Tip to tail: z + w is the fourth corner of the parallelogram on 0, z and w. z − w is the vector from w to z, and |z − w| is the distance between the points.", setup: () => set({ mode: "arith", op: "add" }) },
    { title: "Conjugates", q: "Choose z and z*. What is z × z*? Why are complex roots of real polynomials always conjugate pairs?", hint: "z* is the reflection in the real axis; zz* = |z|², a real number. For a polynomial with real coefficients, taking the conjugate of p(z) = 0 gives p(z*) = 0, so z* is a root too.", setup: () => set({ mode: "arith", op: "conj" }) },
    { title: "A circle locus", q: "|z − (1 + i)| = 1.5. Describe the locus. Then shade |z − (1 + i)| ≤ 1.5.", hint: "All points 1.5 from 1 + i: a circle, centre (1, 1), radius 1.5. The region ≤ is the inside of the circle, including the boundary.", setup: () => set({ mode: "loci", locus: "circle", a: [1, 1], r: 1.5 }) },
    { title: "Equidistant from two points", q: "|z − a| = |z − b|. Drag a and b. What is the locus?", hint: "The perpendicular bisector of the line segment from a to b: every point on it is the same distance from both.", setup: () => set({ mode: "loci", locus: "bisect", a: [1, 1], b: [-1, 0] }) },
    { title: "A half-line", q: "arg(z − (1 + i)) = π/4. Why is it only a half-line, not a whole line? Where does it start?", hint: "Points on the other half would have argument π/4 − π = −3π/4. The half-line starts at 1 + i (which is not included, since arg 0 is undefined).", setup: () => set({ mode: "loci", locus: "arg", a: [1, 1], theta: 45 }) },
    { lvl: "adv", title: "De Moivre: powers spiral", q: "z = 1.1e^(iπ/6). Watch z, z², z³, … What shape do the powers make? When is it a circle?", hint: "Each power multiplies the modulus by 1.1 and adds π/6 to the argument, giving an equiangular (logarithmic) spiral. If |z| = 1 the powers stay on the unit circle; if |z| < 1 they spiral in.", setup: () => set({ mode: "power", z: polar(1.1, Math.PI / 6), n: 12 }) },
    { lvl: "adv", title: "Roots of unity", q: "Find all the solutions of z⁵ = 1. Where are they? What do they add up to?", hint: "z = e^(2πik/5), k = 0, …, 4: the vertices of a regular pentagon on the unit circle. They add to 0 (the polygon is balanced about the origin).", setup: () => set({ mode: "roots", n: 5, root: [1, 0] }) },
    { lvl: "adv", title: "Cube roots of a complex number", q: "Solve z³ = 8i. Drag the point w = 8i and watch the three roots move.", hint: "|w| = 8, arg w = π/2, so the roots have modulus 2 and arguments π/6, 5π/6 and −π/2: √3 + i, −√3 + i and −2i. They form an equilateral triangle; moving w rotates them by a third of the angle.", setup: () => set({ mode: "roots", n: 3, root: [0, 8] }) },
  ],
  batch: [
    { title: "Random quadratics: real or complex roots?", question: "z² + bz + c = 0 with b and c random between −2 and 2. How often are the roots complex (not real)?", how: "Each run: 200 random quadratics; records the fraction with b² − 4c < 0.", yLabel: "fraction with complex roots", reps: 300, bins: 24, theory: 5 / 12, theoryLabel: "5/12", run: (x, r) => { let k = 0; for (let i = 0; i < 200; i++) { const b = 4 * r() - 2, c = 4 * r() - 2; if (b * b < 4 * c) k++; } return k / 200; }, note: "Complex roots need c > b²/4, which happens 5/12 of the time here. Every one of those comes as a conjugate pair." },
    { title: "The roots of unity add to zero (A level)", question: "For each n, what is the modulus of the sum of the n solutions of zⁿ = 1?", how: "Exact calculation with the computer's arithmetic.", xLabel: "n", yLabel: "|sum of the roots|", xs: [2, 3, 4, 5, 6, 8, 10, 12], reps: 1, yMin: -0.5, yMax: 1, theory: () => 0, theoryLabel: "0", run: n => { let s = [0, 0]; for (let k = 0; k < n; k++) s = add(s, polar(1, 2 * Math.PI * k / n)); return mod(s); }, note: "Zero (up to rounding at about 10⁻¹⁵) for every n ≥ 2: the roots form a regular polygon centred at 0. Algebraically, the sum is a geometric series (1 − ωⁿ)/(1 − ω) = 0." },
    { title: "Powers grow like rⁿ (A level)", question: "If |z| = 1.1, how big is |zⁿ|?", how: "Multiplies z by itself n times (no de Moivre shortcut) and measures the modulus.", xLabel: "n", yLabel: "|zⁿ|", xs: [1, 2, 4, 6, 8, 10, 15, 20], reps: 1, yMin: 0, theory: n => Math.pow(1.1, n), theoryLabel: "1.1ⁿ", run: n => { const z = polar(1.1, 0.7); let p = [1, 0]; for (let k = 0; k < n; k++) p = mul(p, z); return mod(p); }, note: "Repeated multiplication agrees with de Moivre's rⁿ: the modulus grows geometrically whatever the argument." },
    { title: "Distance between random points on the unit circle", question: "z and w are random points with |z| = |w| = 1. What is |z − w| on average?", how: "Each run: the mean of |z − w| for 100 random pairs.", yLabel: "mean |z − w|", reps: 300, bins: 24, theory: 4 / Math.PI, theoryLabel: "4/π", run: (x, r) => { let s = 0; for (let i = 0; i < 100; i++) s += mod(sub(polar(1, 2 * Math.PI * r()), polar(1, 2 * Math.PI * r()))); return s / 100; }, note: "|z − w| = 2|sin(φ/2)| where φ is the angle between them; averaging over φ gives 4/π ≈ 1.27." },
    { title: "Random points in a circle locus", question: "Throw random points into the square −2 ≤ x, y ≤ 2. What fraction satisfies |z| ≤ 1?", how: "Each run: 400 random points.", yLabel: "fraction with |z| ≤ 1", reps: 300, bins: 24, theory: Math.PI / 16, theoryLabel: "π/16 (area ratio)", run: (x, r) => { let k = 0; for (let i = 0; i < 400; i++) if (mod([4 * r() - 2, 4 * r() - 2]) <= 1) k++; return k / 400; }, note: "The region is a disc of area π inside a square of area 16: a Monte Carlo estimate of π/16 ≈ 0.196." },
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "CP2", text: "z = x + iy: |z| = √(x² + y²); arg z is the angle from the positive real axis, −π < arg z ≤ π (check the quadrant). Modulus–argument form z = r(cos θ + i sin θ)." },
      { lvl: "std", tag: "CP2", text: "|z₁z₂| = |z₁||z₂|, arg(z₁z₂) = arg z₁ + arg z₂; |z₁/z₂| = |z₁|/|z₂|, arg(z₁/z₂) = arg z₁ − arg z₂ (adjust by 2π if needed)." },
      { lvl: "std", tag: "CP2", text: "zz* = |z|². Non-real roots of polynomials with real coefficients come in conjugate pairs; z² − 2Re(z)z + |z|² is a real quadratic factor." },
      { lvl: "std", tag: "CP2", text: "Loci: |z − a| = r circle; |z − a| = |z − b| perpendicular bisector of a and b; arg(z − a) = θ half-line from a (a excluded). Regions use ≤, < etc." },
      { lvl: "adv", tag: "CP1", text: "Exponential form z = re^(iθ). De Moivre: (r(cos θ + i sin θ))ⁿ = rⁿ(cos nθ + i sin nθ), used for powers and to derive multiple-angle formulae." },
      { lvl: "adv", tag: "CP1", text: "zⁿ = w = Re^(iφ) has n roots z = R^(1/n) e^(i(φ + 2πk)/n), k = 0, …, n − 1: a regular n-gon. The nth roots of unity 1, ω, ω², … sum to 0." },
    ],
    questions: [
      { lvl: "std", marks: 4, q: () => `z = ${cstr(P.z)} and w = ${cstr(P.w)}. Find zw and z/w in the form a + bi.`, ans: () => `<ul><li>zw = ${cstr(mul(P.z, P.w))}</li><li>z/w = z w* / |w|² = ${cstr(mul(P.z, conj(P.w)))} ÷ ${f2(mod(P.w) ** 2)}</li><li>= ${cstr(div(P.z, P.w))}</li></ul>` },
      { lvl: "std", marks: 3, q: () => `Find the modulus and argument of z = ${cstr(P.z)}, and write z in modulus–argument form.`, ans: () => `<ul><li>|z| = ${f2(mod(P.z))}</li><li>arg z = ${argStr(arg(P.z))} (${deg(arg(P.z)).toFixed(1)}°), checking the quadrant</li><li>z = ${f2(mod(P.z))}(cos ${argStr(arg(P.z))} + i sin ${argStr(arg(P.z))})</li></ul>` },
      { lvl: "std", marks: 3, q: "Sketch the locus |z − 3 + i| = |z + 1 − i| and find its Cartesian equation.", ans: "<ul><li>|z − (3 − i)| = |z − (−1 + i)|: perpendicular bisector of (3, −1) and (−1, 1)</li><li>midpoint (1, 0), gradient of the segment −1/2, so the bisector has gradient 2</li><li>y = 2x − 2</li></ul>" },
      { lvl: "adv", marks: 4, q: "Solve z³ = 8i, giving your answers in the form a + bi.", ans: "<ul><li>8i = 8e^(iπ/2)</li><li>z = 2e^(i(π/2 + 2πk)/3), k = 0, 1, 2</li><li>arguments π/6, 5π/6, −π/2</li><li>z = √3 + i, −√3 + i, −2i</li></ul>" },
      { lvl: "adv", marks: 4, q: "Use de Moivre's theorem to show that cos 3θ = 4cos³θ − 3cos θ.", ans: "<ul><li>cos 3θ + i sin 3θ = (cos θ + i sin θ)³</li><li>expand: cos³θ + 3i cos²θ sin θ − 3cos θ sin²θ − i sin³θ</li><li>real parts: cos 3θ = cos³θ − 3cos θ sin²θ</li><li>= cos³θ − 3cos θ(1 − cos²θ) = 4cos³θ − 3cos θ</li></ul>" },
    ]
  },
  notes: `<h3>What the page does</h3><ul><li>Points are complex numbers on the Argand diagram (1 square = 1 unit). Drag any point with a handle.</li><li><b>Arithmetic:</b> the result is drawn with arcs showing the arguments and its modulus; × also animates the rotation and stretch.</li><li><b>Powers (A level):</b> z, z², …, zⁿ by de Moivre, joined into a spiral.</li><li><b>Roots (A level):</b> all n solutions of zⁿ = w, joined into a polygon.</li><li><b>Loci:</b> each point of the plane is tested against the condition to shade a region.</li></ul>
<h3>Simplifications</h3><ul><li>Arguments are shown in the principal range −π < θ ≤ π, in radians (and degrees).</li><li>Points snap to 0.05 when dragged, so values like 1.5 + i are easy to set.</li><li>Calculations use ordinary computer arithmetic (about 15 significant figures).</li></ul>`,
});

// ---------------- 4. Controls ----------------
const C = {};
let g = ui.group("What to explore");
C.mode = K.seg(g, { value: "arith", options: [["arith", "arithmetic"], ["loci", "loci and regions"], ["power", "powers (A level)"], ["roots", "nth roots (A level)"]], on: v => set({ mode: v }) });
const ga = ui.group("Arithmetic"), gl = ui.group("Loci"), gr = ui.group("Powers and roots");
C.op = K.seg(ga, { value: "mul", options: [["add", "z + w"], ["sub", "z − w"], ["mul", "z × w"], ["div", "z ÷ w"], ["conj", "z and z*"]], on: v => { P.op = v; tAnim = 0; } });
C.anim = K.toggle(ga, { label: "Animate the rotation for z × w", value: true, on: v => P.anim = v });
C.locus = K.seg(gl, { value: "circle", options: [["circle", "|z − a| = r"], ["bisect", "|z − a| = |z − b|"], ["arg", "arg(z − a) = θ"]], on: v => P.locus = v });
C.r = K.slider(gl, { label: "r", min: 0.25, max: 4, step: 0.25, value: 1.5, on: v => P.r = v });
C.theta = K.slider(gl, { label: "θ", min: -180, max: 180, step: 15, value: 45, fmt: v => `${v}° (${argStr(v * Math.PI / 180)})`, on: v => P.theta = v });
C.region = K.toggle(gl, { label: "Shade the region (≤ for |…|, between 0 and θ for arg)", value: false, on: v => P.region = v });
C.n = K.slider(gr, { label: "n", min: 2, max: 16, step: 1, value: 5, on: v => P.n = v });
K.note(gr, "Drag z (powers) or w (roots) on the diagram.");
const read = K.readout(ui.group("Numbers"), [["a", ""], ["b", ""], ["c", ""], ["d", ""]]);
const relabel = n => n.forEach((x, i) => read.el.children[i].firstElementChild.textContent = x);
function showCtl() { ga.style.display = P.mode === "arith" ? "" : "none"; gl.style.display = P.mode === "loci" ? "" : "none"; gr.style.display = P.mode === "power" || P.mode === "roots" ? "" : "none"; C.r.el.style.display = P.locus === "circle" ? "" : "none"; C.theta.el.style.display = P.locus === "arg" ? "" : "none"; C.mode.el.querySelectorAll("button").forEach((b, i) => b.style.display = i < 2 || ui.level === "adv" ? "" : "none"); }
function set(o) { Object.assign(P, JSON.parse(JSON.stringify(DEF)), o); if ((P.mode === "power" || P.mode === "roots") && ui.setLevel && ui.level !== "adv") ui.setLevel("adv"); for (const k of ["op", "anim", "locus", "r", "theta", "region", "n", "mode"]) C[k].set(P[k]); tAnim = 0; showCtl(); }

// ---------------- 5. Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
let V = null;
const S = p => [V.ox + p[0] * V.u, V.oy - p[1] * V.u], W = (x, y) => [(x - V.ox) / V.u, (V.oy - y) / V.u];
const TX = (c, s, x, y, col = "#c9d4ea", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,system-ui,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function arrowTo(c, p, col, w = 2.5, from = [0, 0]) { const [x0, y0] = S(from), [x1, y1] = S(p), a = Math.atan2(y1 - y0, x1 - x0); c.strokeStyle = c.fillStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); if (Math.hypot(x1 - x0, y1 - y0) > 8) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x1 - 10 * Math.cos(a - 0.4), y1 - 10 * Math.sin(a - 0.4)); c.lineTo(x1 - 10 * Math.cos(a + 0.4), y1 - 10 * Math.sin(a + 0.4)); c.fill(); } c.lineWidth = 1; }
function dot(c, p, col, label, handle) { const [x, y] = S(p); c.fillStyle = col; c.beginPath(); c.arc(x, y, handle ? 7 : 5, 0, 6.3); c.fill(); if (handle) { c.strokeStyle = "#fff"; c.lineWidth = 1.5; c.stroke(); c.lineWidth = 1; } if (label) TX(c, label, x + 10, y - 10, col, "left", "600 13px"); }
function argArc(c, t, R, col) { c.strokeStyle = col; c.lineWidth = 1.5; c.beginPath(); c.arc(V.ox, V.oy, R, 0, -t, t > 0); c.stroke(); c.lineWidth = 1; }
const handles = () => P.mode === "arith" ? (P.op === "conj" ? [["z", P.z]] : [["z", P.z], ["w", P.w]]) : P.mode === "power" ? [["z", P.z]] : P.mode === "roots" ? [["root", P.root]] : P.locus === "bisect" ? [["a", P.a], ["b", P.b]] : [["a", P.a]];
K.pointer(cv.el, {
  down: p => { let best = null, bd = 30; for (const [k, q] of handles()) { const [x, y] = S(q), d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = k; } } drag = best; },
  drag: p => { if (!drag) return; const [x, y] = W(p.x, p.y), sn = v => Math.round(v * 20) / 20; P[drag] = [sn(x), sn(y)]; tAnim = 1; },
  up: () => drag = null, hover: p => { let on = false; for (const [, q] of handles()) { const [x, y] = S(q); if (Math.hypot(p.x - x, p.y - y) < 30) on = true; } cv.el.style.cursor = on ? "grab" : "default"; }
});
function draw(dt) {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1222"; c.fillRect(0, 0, w, h);
  const span = P.mode === "roots" ? Math.max(2.4, Math.pow(mod(P.root), 1 / P.n) * 1.5, Math.min(mod(P.root) * 1.08, 10)) : P.mode === "power" ? Math.max(3, ...Array.from({ length: P.n + 1 }, (_, k) => mod(powC(P.z, k)) * 1.1)) : 4;
  V = { u: Math.min(w, h) / (2 * span + 0.6), ox: w / 2, oy: h / 2 };
  // grid and axes
  c.strokeStyle = "#16203a"; const step = V.u < 25 ? Math.ceil(30 / V.u) : 1; for (let k = -40; k <= 40; k += step) { const [x] = S([k, 0]), [, y] = S([0, k]); c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); if (k && x > 10 && x < w - 10) TX(c, k, x, V.oy + 14, "#5d6e93", "center", "10px"); if (k && y > 10 && y < h - 10) TX(c, k + "i", V.ox - 6, y + 4, "#5d6e93", "right", "10px"); }
  c.strokeStyle = "#5d6e93"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, V.oy); c.lineTo(w, V.oy); c.moveTo(V.ox, 0); c.lineTo(V.ox, h); c.stroke(); c.lineWidth = 1; TX(c, "Re", w - 26, V.oy - 8, "#8fa0bf"); TX(c, "Im", V.ox + 8, 16, "#8fa0bf");
  if (P.mode === "arith") {
    tAnim = Math.min(1, tAnim + dt / 2.5); const z = P.z, wv = P.w;
    if (P.op === "add" || P.op === "sub") { const r = P.op === "add" ? add(z, wv) : sub(z, wv); c.setLineDash([5, 4]); if (P.op === "add") { arrowTo(c, r, "rgba(90,209,255,.5)", 1.5, wv); arrowTo(c, r, "rgba(255,180,84,.5)", 1.5, z); } else arrowTo(c, z, "rgba(126,231,135,.7)", 1.5, wv); c.setLineDash([]); arrowTo(c, z, "#5ad1ff"); arrowTo(c, wv, "#ffb454"); arrowTo(c, r, "#7ee787", 3.5); dot(c, r, "#7ee787", P.op === "add" ? "z + w" : "z − w"); }
    if (P.op === "mul" || P.op === "div") {
      const r = P.op === "mul" ? mul(z, wv) : div(z, wv), tz = arg(z), tr = arg(r);
      argArc(c, tz, 34, "#5ad1ff"); argArc(c, arg(wv), 48, "#ffb454");
      let shown = r; if (P.anim && P.op === "mul" && tAnim < 1) { const k = tAnim < 0.5 ? tAnim * 2 : 1, k2 = tAnim < 0.5 ? 0 : (tAnim - 0.5) * 2; shown = polar(mod(z) * (1 + (mod(wv) - 1) * k2), tz + arg(wv) * k); }
      c.strokeStyle = "rgba(126,231,135,.3)"; c.beginPath(); c.arc(V.ox, V.oy, mod(shown) * V.u, 0, 6.3); c.stroke(); argArc(c, arg(shown), 62, "#7ee787");
      arrowTo(c, z, "#5ad1ff"); arrowTo(c, wv, "#ffb454"); arrowTo(c, shown, "#7ee787", 3.5); dot(c, shown, "#7ee787", P.op === "mul" ? "zw" : "z/w");
      if (P.op === "mul") TX(c, `rotate by arg w = ${argStr(arg(wv))}, then stretch by |w| = ${f2(mod(wv))}`, 20, h - 20, "#c9d4ea", "left", "13px");
    }
    if (P.op === "conj") { const r = conj(z); c.setLineDash([4, 4]); c.strokeStyle = "#8fa0bf"; const [x1, y1] = S(z), [x2, y2] = S(r); c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); c.setLineDash([]); arrowTo(c, z, "#5ad1ff"); arrowTo(c, r, "#c4a1ff"); dot(c, r, "#c4a1ff", "z*"); TX(c, `zz* = |z|² = ${f2(mod(z) ** 2)} (real)`, 20, h - 20, "#c9d4ea", "left", "13px"); }
    dot(c, z, "#5ad1ff", "z", true); if (P.op !== "conj") dot(c, wv, "#ffb454", "w", true);
    ui.hud(`z = ${cstr(z)}${P.op !== "conj" ? "<br>w = " + cstr(wv) : ""}`);
  } else if (P.mode === "power") {
    const pts = []; for (let k = 0; k <= P.n; k++) pts.push(powC(P.z, k));
    c.strokeStyle = "rgba(255,255,255,.18)"; c.beginPath(); c.arc(V.ox, V.oy, V.u, 0, 6.3); c.stroke();
    c.strokeStyle = "#ffb454"; c.lineWidth = 1.5; c.beginPath(); for (let s = 0; s <= P.n * 30; s++) { const p = powC(P.z, s / 30); const [x, y] = S(p); s ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); c.lineWidth = 1;
    pts.forEach((p, k) => { c.strokeStyle = "rgba(255,180,84,.25)"; const [x, y] = S(p); c.beginPath(); c.moveTo(V.ox, V.oy); c.lineTo(x, y); c.stroke(); dot(c, p, k === 1 ? "#5ad1ff" : "#ffb454", k === 0 ? "1" : k === 1 ? "z" : "z" + String(k).split("").map(d => "⁰¹²³⁴⁵⁶⁷⁸⁹"[+d]).join(""), k === 1); });
    ui.hud(`z = ${f2(mod(P.z))}e^(i${argStr(arg(P.z))})<br>zⁿ = ${f2(mod(P.z))}ⁿ e^(i n ${argStr(arg(P.z))})`);
  } else if (P.mode === "roots") {
    const R = Math.pow(mod(P.root), 1 / P.n), ph = arg(P.root), rs = []; for (let k = 0; k < P.n; k++) rs.push(polar(R, (ph + 2 * Math.PI * k) / P.n));
    c.strokeStyle = "rgba(255,255,255,.2)"; c.beginPath(); c.arc(V.ox, V.oy, R * V.u, 0, 6.3); c.stroke();
    c.fillStyle = "rgba(126,231,135,.12)"; c.strokeStyle = "#7ee787"; c.lineWidth = 2; c.beginPath(); rs.forEach((p, k) => { const [x, y] = S(p); k ? c.lineTo(x, y) : c.moveTo(x, y); }); c.closePath(); c.fill(); c.stroke(); c.lineWidth = 1;
    rs.forEach((p, k) => dot(c, p, "#7ee787", "z" + String(k).split("").map(d => "₀₁₂₃₄₅₆₇₈₉"[+d]).join("")));
    arrowTo(c, P.root, "#ffb454", 2); dot(c, P.root, "#ffb454", "w", true);
    ui.hud(`zⁿ = w = ${cstr(P.root)}<br>n = ${P.n} roots, modulus |w|^(1/n) = ${f2(R)}, ${(360 / P.n).toFixed(1)}° apart`);
  } else {
    // loci: test points of the plane
    const test = (q, region) => { const d = mod(sub(q, P.a)); if (P.locus === "circle") return region ? d <= P.r : Math.abs(d - P.r); if (P.locus === "bisect") { const e = mod(sub(q, P.b)); return region ? d <= e : Math.abs(d - e); } const t = arg(sub(q, P.a)), th = P.theta * Math.PI / 180; return region ? (th >= 0 ? t >= 0 && t <= th : t <= 0 && t >= th) : null; };
    if (P.region) { c.fillStyle = "rgba(90,209,255,.16)"; for (let y = 0; y < h; y += 4) for (let x = 0; x < w; x += 4) if (test(W(x + 2, y + 2), true)) c.fillRect(x, y, 4, 4); }
    c.strokeStyle = "#5ad1ff"; c.lineWidth = 3;
    if (P.locus === "circle") { const [x, y] = S(P.a); c.beginPath(); c.arc(x, y, P.r * V.u, 0, 6.3); c.stroke(); }
    if (P.locus === "bisect") { const m = [(P.a[0] + P.b[0]) / 2, (P.a[1] + P.b[1]) / 2], d = sub(P.b, P.a), n = [-d[1], d[0]], L = 50 / (mod(n) || 1); const [x1, y1] = S(add(m, [n[0] * L, n[1] * L])), [x2, y2] = S(sub(m, [n[0] * L, n[1] * L])); c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); c.lineWidth = 1; c.setLineDash([4, 4]); c.strokeStyle = "#8fa0bf"; const [ax, ay] = S(P.a), [bx, by] = S(P.b); c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke(); c.setLineDash([]); dot(c, m, "#8fa0bf", "midpoint"); dot(c, P.b, "#ffb454", "b", true); }
    if (P.locus === "arg") { const th = P.theta * Math.PI / 180, [x, y] = S(P.a), [x2, y2] = S(add(P.a, polar(60, th))); c.beginPath(); c.moveTo(x, y); c.lineTo(x2, y2); c.stroke(); c.lineWidth = 1; c.strokeStyle = "#8fa0bf"; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(x, y); c.lineTo(x + 80, y); c.stroke(); c.setLineDash([]); c.strokeStyle = "#ffe66d"; c.beginPath(); c.arc(x, y, 30, 0, -th, th > 0); c.stroke(); c.strokeStyle = "#5ad1ff"; c.fillStyle = "#0b1222"; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 6, 0, 6.3); c.fill(); c.stroke(); }
    c.lineWidth = 1; dot(c, P.a, "#ffb454", "a = " + cstr(P.a), true);
    ui.hud(P.locus === "circle" ? `|z − (${cstr(P.a)})| = ${P.r}<br>circle, centre (${f2(P.a[0])}, ${f2(P.a[1])}), radius ${P.r}` : P.locus === "bisect" ? `|z − (${cstr(P.a)})| = |z − (${cstr(P.b)})|<br>perpendicular bisector of a and b` : `arg(z − (${cstr(P.a)})) = ${argStr(P.theta * Math.PI / 180)}<br>half-line from a (a not included)`);
  }
}
function panels() {
  if (P.mode === "arith") {
    const r = P.op === "add" ? add(P.z, P.w) : P.op === "sub" ? sub(P.z, P.w) : P.op === "mul" ? mul(P.z, P.w) : P.op === "div" ? div(P.z, P.w) : conj(P.z);
    relabel(["z: modulus, argument", "w: modulus, argument", "Result", "Result: modulus, argument"]);
    read.set("a", `${f2(mod(P.z))}, ${argStr(arg(P.z))} (${deg(arg(P.z)).toFixed(1)}°)`); read.set("b", `${f2(mod(P.w))}, ${argStr(arg(P.w))} (${deg(arg(P.w)).toFixed(1)}°)`); read.set("c", cstr(r)); read.set("d", `${f2(mod(r))}, ${argStr(arg(r))} (${deg(arg(r)).toFixed(1)}°)`);
    const bars = [[1, mod(P.z)], [2, mod(P.w)], [3, mod(r)]], ang = [[1, deg(arg(P.z))], [2, deg(arg(P.w))], [3, deg(arg(r))]];
    chA.opts.xFmt = chB.opts.xFmt = v => Math.abs(v - Math.round(v)) < 1e-6 ? ["", "z", "w", "result"][Math.round(v)] || "" : ""; chA.opts.title = "Moduli" + (P.op === "mul" ? ": |zw| = |z| × |w|" : ""); chA.opts.xLabel = chB.opts.xLabel = ""; chA.opts.yLabel = "modulus"; chA.draw([{ pts: bars, type: "bars", w: 0.6, color: K.cssVar("--s0") }], { xMin: 0.4, xMax: 3.6 });
    chB.opts.title = "Arguments (degrees)" + (P.op === "mul" ? ": arg(zw) = arg z + arg w" : ""); chB.opts.yLabel = "argument (°)"; chB.draw([{ pts: ang, type: "bars", w: 0.6, color: K.cssVar("--s1") }], { xMin: 0.4, xMax: 3.6, yMin: -180, yMax: 180 });
    return;
  }
  chA.opts.xFmt = chB.opts.xFmt = null;
  if (P.mode === "power") {
    relabel(["z", "|z|, arg z", "zⁿ", "|zⁿ| = |z|ⁿ"]); const zn = powC(P.z, P.n); read.set("a", cstr(P.z)); read.set("b", `${f2(mod(P.z))}, ${argStr(arg(P.z))}`); read.set("c", cstr(zn)); read.set("d", f2(mod(zn)));
    const M = [], A = []; for (let k = 0; k <= P.n; k++) { M.push([k, Math.pow(mod(P.z), k)]); A.push([k, deg(arg(powC(P.z, k)))]); }
    chA.opts.title = "|zᵏ| grows (or shrinks) geometrically"; chA.opts.xLabel = "k"; chA.opts.yLabel = "|zᵏ|"; chA.draw([{ pts: M, color: K.cssVar("--s1") }, { pts: M, type: "dots", color: K.cssVar("--s1") }], { yMin: 0 });
    chB.opts.title = "arg zᵏ (principal value, degrees)"; chB.opts.xLabel = "k"; chB.opts.yLabel = "°"; chB.draw([{ pts: A, type: "dots", r: 4, color: K.cssVar("--s0") }], { yMin: -180, yMax: 180 });
  } else if (P.mode === "roots") {
    const R = Math.pow(mod(P.root), 1 / P.n), rs = []; let s = [0, 0]; for (let k = 0; k < P.n; k++) { const q = polar(R, (arg(P.root) + 2 * Math.PI * k) / P.n); rs.push(q); s = add(s, q); }
    relabel(["w", "Roots: modulus", "First root z₀", "Sum of the roots"]); read.set("a", cstr(P.root)); read.set("b", f2(R)); read.set("c", cstr(rs[0]) + `  (arg ${argStr(arg(rs[0]))})`); read.set("d", cstr(s));
    chA.opts.title = "Arguments of the roots (degrees)"; chA.opts.xLabel = "k"; chA.opts.yLabel = "°"; chA.draw([{ pts: rs.map((q, k) => [k, deg(arg(q))]), type: "dots", r: 5, color: K.cssVar("--s2") }], { yMin: -180, yMax: 180, xMin: -0.5, xMax: P.n - 0.5 });
    chB.opts.title = "Real and imaginary parts of each root"; chB.opts.xLabel = "k"; chB.opts.yLabel = "value"; chB.draw([{ pts: rs.map((q, k) => [k, q[0]]), type: "dots", r: 4, color: K.cssVar("--s0"), label: "Re" }, { pts: rs.map((q, k) => [k, q[1]]), type: "dots", r: 4, color: K.cssVar("--s1"), label: "Im" }], { hlines: [{ y: 0 }], xMin: -0.5, xMax: P.n - 0.5 });
  } else {
    relabel(["Locus", "Cartesian form", "a", "b"]);
    const [p, q] = P.a; read.set("a", P.locus === "circle" ? "circle" : P.locus === "bisect" ? "perpendicular bisector" : "half-line"); read.set("c", cstr(P.a)); read.set("d", P.locus === "bisect" ? cstr(P.b) : "–");
    if (P.locus === "circle") read.set("b", `(x − ${f2(p)})² + (y − ${f2(q)})² = ${f2(P.r * P.r)}`);
    else if (P.locus === "bisect") { const [r, s] = P.b; read.set("b", `${f2(2 * (r - p))}x + ${f2(2 * (s - q))}y = ${f2(r * r + s * s - p * p - q * q)}`); }
    else { const th = P.theta * Math.PI / 180; read.set("b", Math.abs(Math.cos(th)) < 1e-9 ? `x = ${f2(p)}, ${Math.sin(th) > 0 ? "y > " : "y < "}${f2(q)}` : `y − ${f2(q)} = ${f2(Math.tan(th))}(x − ${f2(p)}), ${Math.cos(th) > 0 ? "x > " : "x < "}${f2(p)}`); }
    // along the real axis z = x: which real numbers are on the locus?
    const DA = [], DB = [], AR = []; for (let x = -4; x <= 4.001; x += 0.05) { DA.push([x, mod(sub([x, 0], P.a))]); DB.push([x, mod(sub([x, 0], P.b))]); AR.push([x, deg(arg(sub([x, 0], P.a)))]); }
    chA.opts.title = "Along the real axis: distances |x − a| and |x − b|"; chA.opts.xLabel = "x (real numbers)"; chA.opts.yLabel = "distance";
    chA.draw([{ pts: DA, color: K.cssVar("--s1"), label: "|x − a|" }].concat(P.locus === "bisect" ? [{ pts: DB, color: K.cssVar("--s0"), label: "|x − b|" }] : []), { hlines: P.locus === "circle" ? [{ y: P.r, label: "r", color: K.cssVar("--s2") }] : [] });
    chB.opts.title = "Along the real axis: arg(x − a) in degrees"; chB.opts.xLabel = "x (real numbers)"; chB.opts.yLabel = "°"; chB.draw([{ pts: AR, color: K.cssVar("--s4"), label: "arg(x − a)" }], { yMin: -180, yMax: 180, hlines: P.locus === "arg" ? [{ y: P.theta, label: "θ", color: K.cssVar("--s2") }] : [] });
  }
}
let frame = 0;
ui.run(dt => { }, dt => { draw(dt); if (frame++ % 5 === 0) panels(); });
ui.onLevel = v => { if (v === "std" && (P.mode === "power" || P.mode === "roots")) set({}); showCtl(); };
set({});
ui.tip("Drag the points with white rings. Multiplying by w rotates z by arg w and stretches it by |w|.", 7000);
