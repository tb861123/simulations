/* =====================================================================
   SERIES AND CONVERGENCE
   A MACLAURIN SERIES writes a function as an infinite polynomial:
       f(x) = f(0) + f'(0)x + f''(0)x²/2! + f'''(0)x³/3! + …
   Stopping after n terms gives a polynomial that matches f, and its
   first n derivatives, at x = 0. Near 0 it is excellent; further away it
   may be poor, and outside the INTERVAL OF CONVERGENCE no number of
   terms helps:
       eˣ, sin x, cos x                     converge for every x
       ln(1 + x)                            −1 < x ≤ 1
       (1 + x)ⁿ for n not a whole number    |x| < 1   (binomial expansion)
       1/(1 − x) = 1 + x + x² + …           |x| < 1   (geometric series)
   SUMS OF SERIES: the partial sums S_N = u₁ + u₂ + … + u_N either settle
   to a limit (the series converges) or do not (it diverges). Standard
   results: Σr = ½N(N + 1), Σr² = ⅙N(N + 1)(2N + 1), Σr³ = ¼N²(N + 1)².
   ===================================================================== */
// ---------------- 1. Functions and their Maclaurin coefficients ----------------
const fact = n => { let f = 1; for (let i = 2; i <= n; i++) f *= i; return f; };
function binomC(a, k) { let c = 1; for (let i = 0; i < k; i++) c *= (a - i) / (i + 1); return c; }   // a(a − 1)…(a − k + 1)/k!
const FN = {
  binom: { name: "(1 + x)ⁿ, binomial", f: (x, q) => Math.pow(1 + x, q.p), c: (k, q) => binomC(q.p, k), R: q => Number.isInteger(q.p) && q.p >= 0 ? Infinity : 1, box: [-2, 2, -1, 5], tex: q => `(1 + x)^${q.p}` },
  geom: { name: "1/(1 − x), geometric", f: x => 1 / (1 - x), c: () => 1, R: () => 1, box: [-2, 2, -3, 8], tex: () => "1/(1 − x)" },
  exp: { name: "eˣ (A level)", adv: true, f: Math.exp, c: k => 1 / fact(k), R: () => Infinity, box: [-4, 4, -2, 12], tex: () => "eˣ" },
  sin: { name: "sin x (A level)", adv: true, f: Math.sin, c: k => k % 2 ? (k % 4 === 1 ? 1 : -1) / fact(k) : 0, R: () => Infinity, box: [-9, 9, -3, 3], tex: () => "sin x" },
  cos: { name: "cos x (A level)", adv: true, f: Math.cos, c: k => k % 2 ? 0 : (k % 4 === 0 ? 1 : -1) / fact(k), R: () => Infinity, box: [-9, 9, -3, 3], tex: () => "cos x" },
  ln: { name: "ln(1 + x) (A level)", adv: true, f: x => Math.log(1 + x), c: k => k === 0 ? 0 : (k % 2 ? 1 : -1) / k, R: () => 1, box: [-1.5, 3, -3, 2.5], tex: () => "ln(1 + x)" },
  atan: { name: "arctan x (beyond)", adv: true, f: Math.atan, c: k => k % 2 ? (k % 4 === 1 ? 1 : -1) / k : 0, R: () => 1, box: [-3, 3, -2.5, 2.5], tex: () => "arctan x" },
};
const poly = (D, q, n, x) => { let s = 0, xp = 1; for (let k = 0; k < n; k++) { s += D.c(k, q) * xp; xp *= x; } return s; };   // the first n terms (up to x^(n−1))
// numeric series: u(r), and the exact limit (or null if it diverges) and partial-sum formula where there is one
const SER = {
  r: { name: "Σ r", u: r => r, lim: null, S: N => N * (N + 1) / 2, form: "½N(N + 1)" },
  r2: { name: "Σ r²", u: r => r * r, lim: null, S: N => N * (N + 1) * (2 * N + 1) / 6, form: "⅙N(N + 1)(2N + 1)" },
  r3: { name: "Σ r³", u: r => r ** 3, lim: null, S: N => (N * (N + 1) / 2) ** 2, form: "¼N²(N + 1)²" },
  half: { name: "Σ (½)ʳ", u: r => Math.pow(0.5, r), lim: 1, S: N => 1 - Math.pow(0.5, N), form: "1 − (½)ᴺ" },
  harm: { name: "Σ 1/r (harmonic)", u: r => 1 / r, lim: null, S: null, form: "≈ ln N + 0.5772" },
  inv2: { name: "Σ 1/r² (Basel)", u: r => 1 / (r * r), lim: Math.PI ** 2 / 6, S: null, form: "→ π²/6" },
  alt: { name: "Σ (−1)ʳ⁺¹/r", u: r => (r % 2 ? 1 : -1) / r, lim: Math.LN2, S: null, form: "→ ln 2" },
};
const partial = (s, N) => { let t = 0; for (let r = 1; r <= N; r++) t += SER[s].u(r); return t; };

// ---------------- 2. State ----------------
const DEF = { mode: "mac", fn: "binom", p: -1, n: 3, x0: 0.5, ser: "inv2", N: 20, auto: false };
const P = Object.assign({}, DEF);
let grow = 0;

// ---------------- 3. The page ----------------
const ui = K.app({
  title: "Series and Convergence", subject: "Further Mathematics",
  blurb: "Polynomials that hug a curve: Maclaurin and binomial series term by term, intervals of convergence, and partial sums that settle or run away",
  reset: () => set({ mode: P.mode }),
  levels: { std: "AS Further Maths (8FM0)", adv: "A level Further Maths (9FM0)", specs: {
    std: "Pearson Edexcel AS Further Mathematics (8FM0) Core Pure 1: sums of series using the standard results Σr, Σr², Σr³. Also the binomial expansion of (1 + x)ⁿ for rational n and its validity |x| < 1 (A level Mathematics 9MA0 Pure 4.1) and convergent geometric series (Pure 4.2).",
    adv: "Pearson Edexcel A level Further Mathematics (9FM0) Core Pure 2, series: Maclaurin series f(x) = f(0) + f'(0)x + f''(0)x²/2! + …, the standard series for eˣ, sin x, cos x, ln(1 + x) and (1 + x)ⁿ with their ranges of validity, and approximations from the first few terms. Partial sums and convergence tests go beyond." } },
  missions: [
    { title: "The binomial expansion", q: "1/(1 + x) = (1 + x)⁻¹ = 1 − x + x² − x³ + … Add terms one at a time. For which x does the polynomial get closer to the curve?", hint: "Only for −1 < x < 1 (shaded). There the terms shrink and the partial sums settle; outside, the terms grow and adding more makes it worse. For rational n, the expansion is valid for |x| < 1.", setup: () => set({ fn: "binom", p: -1, n: 2 }) },
    { title: "√(1 + x)", q: "n = ½. Use the first three terms to estimate √1.1 (x = 0.1). How accurate is it?", hint: "1 + ½x − ⅛x² = 1 + 0.05 − 0.00125 = 1.04875; √1.1 = 1.048809: correct to 4 decimal places. Small x makes the series converge fast.", setup: () => set({ fn: "binom", p: 0.5, n: 3, x0: 0.1 }) },
    { title: "A whole-number power", q: "Set n = 3 in (1 + x)ⁿ. What happens after four terms? Why is there no interval of convergence any more?", hint: "(1 + x)³ = 1 + 3x + 3x² + x³ exactly: every later coefficient is 0, so the series stops and is valid for every x.", setup: () => set({ fn: "binom", p: 3, n: 2 }) },
    { title: "Standard results", q: "Σr³ from 1 to N: compare with (Σr)². Find Σ r² from r = 1 to 20 using the formula.", hint: "Σr³ = ¼N²(N + 1)² = (½N(N + 1))² = (Σr)², a lovely coincidence. Σr² to 20 = ⅙ × 20 × 21 × 41 = 2870.", setup: () => set({ mode: "sum", ser: "r3", N: 10 }) },
    { title: "Converges or diverges?", q: "Compare Σ1/r and Σ1/r². Both have terms that tend to 0. Do both sums settle down?", hint: "Σ1/r² converges (to π²/6 ≈ 1.645). Σ1/r diverges: it grows like ln N, slowly but without limit. Terms tending to 0 is necessary for convergence but not enough.", setup: () => set({ mode: "sum", ser: "harm", N: 100, auto: true }) },
    { lvl: "adv", title: "eˣ, term by term", q: "Add terms of the Maclaurin series for eˣ. How many terms are needed for x = 1 to be correct to 3 decimal places? For x = 4?", hint: "x = 1: 7 terms (the error is about 1/7! ≈ 0.0002). x = 4: about 16 terms. eˣ's series converges for every x, but larger x needs more terms.", setup: () => set({ fn: "exp", n: 3, x0: 1 }) },
    { lvl: "adv", title: "sin x and small angles", q: "sin x ≈ x − x³/6. For which x is the error less than 0.001? What is the 'small-angle' approximation?", hint: "sin x ≈ x for small x (one term), better x − x³/6 (error about x⁵/120, less than 0.001 for |x| < 0.65). The series alternates, so the error is less than the first term left out.", setup: () => set({ fn: "sin", n: 4, x0: 0.6 }) },
    { lvl: "adv", title: "ln(1 + x) at the edge", q: "Use more and more terms of ln(1 + x) at x = 1 (giving ln 2) and at x = 1.2. What is different?", hint: "At x = 1 the series 1 − ½ + ⅓ − … converges, but very slowly (the error is about 1/(2n)). At x = 1.2 it diverges: the terms 1.2ᵏ/k grow. The interval of validity is −1 < x ≤ 1.", setup: () => set({ fn: "ln", n: 8, x0: 1 }) },
  ],
  batch: [
    { title: "How many terms for eˣ at x = 1?", question: "How big is the error of the Maclaurin polynomial for e¹ with n terms?", how: "Exact calculation for each n.", xLabel: "number of terms n", yLabel: "log₁₀ (error)", xs: [2, 3, 4, 5, 6, 7, 8, 10, 12], reps: 1, theory: n => Math.log10(1 / fact(n) * (1 + 1 / (n + 1) + 1 / ((n + 1) * (n + 2)))), theoryLabel: "first missing terms 1/n! + …", run: n => Math.log10(Math.E - poly(FN.exp, P, n, 1)), note: "The error is roughly the first term left out, 1/n!, which shrinks faster than any power: eˣ's series converges very quickly near 0." },
    { title: "Σ1/r² closing in on π²/6", question: "How far is the partial sum S_N of Σ1/r² from its limit π²/6?", how: "Exact calculation for each N.", xLabel: "N", yLabel: "π²/6 − S_N", xs: [5, 10, 20, 40, 80, 160], reps: 1, yMin: 0, theory: N => 1 / N - 1 / (2 * N * N), theoryLabel: "≈ 1/N − 1/(2N²)", run: N => Math.PI ** 2 / 6 - partial("inv2", N), note: "The remaining tail is about 1/N (like the area under 1/x² beyond N): slow, and 1000 terms only give 3 decimal places." },
    { title: "Σr³ = (Σr)²", question: "Is the sum of the first N cubes always the square of the sum of the first N whole numbers?", how: "Adds the cubes one by one and divides by (Σr)².", xLabel: "N", yLabel: "Σr³ ÷ (Σr)²", xs: [1, 2, 3, 5, 10, 20, 50, 100], reps: 1, yMin: 0.9, yMax: 1.1, theory: () => 1, theoryLabel: "exactly 1", run: N => partial("r3", N) / partial("r", N) ** 2, note: "Exactly 1 every time: ¼N²(N + 1)² = (½N(N + 1))². Proving it for all N needs algebra (or induction), not just checking." },
    { title: "Alternating harmonic series", question: "How far is 1 − ½ + ⅓ − … − 1/N from ln 2 = 0.6931?", how: "Exact calculation for each even N; size of the error.", xLabel: "N", yLabel: "|ln 2 − S_N|", xs: [10, 20, 40, 80, 160, 320], reps: 1, yMin: 0, theory: N => 1 / (2 * N), theoryLabel: "≈ 1/(2N)", run: N => Math.abs(Math.LN2 - partial("alt", N)), note: "The error is about half the next term. This is ln(1 + x)'s series at the edge of its interval, x = 1: it converges, but painfully slowly." },
    { title: "Random points: is the binomial expansion any good?", question: "For random x between −2 and 2, how often do 10 terms of (1 + x)^(−1) get within 0.01 of the true value?", how: "Each run: 200 random x values; records the fraction where |error| < 0.01.", yLabel: "fraction within 0.01", reps: 300, bins: 20, run: (x, r) => { let k = 0; for (let i = 0; i < 200; i++) { const v = 4 * r() - 2; if (Math.abs(poly(FN.binom, { p: -1 }, 10, v) - 1 / (1 + v)) < 0.01) k++; } return k / 200; }, theory: 1.25 / 4, theoryLabel: "≈ 1.25/4 (−0.62 < x < 0.63)", note: "About 0.31: the error is |x|¹⁰/|1 + x|, under 0.01 only for roughly −0.62 < x < 0.63, a quarter-and-a-bit of the range. Outside |x| < 1 the expansion is useless however many terms you take." },
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "CP1", text: "Σr = ½n(n + 1), Σr² = ⅙n(n + 1)(2n + 1), Σr³ = ¼n²(n + 1)². Split sums: Σ(ar² + br) = aΣr² + bΣr. Σ from r = k to n = (Σ to n) − (Σ to k − 1)." },
      { lvl: "std", tag: "P4.1", text: "(1 + x)ⁿ = 1 + nx + n(n − 1)x²/2! + …, valid for |x| < 1 when n is negative or a fraction; for (a + bx)ⁿ take out aⁿ first: valid for |bx/a| < 1." },
      { lvl: "std", tag: "P4.2", text: "A geometric series a + ar + ar² + … converges to a/(1 − r) if |r| < 1. A series converges if its partial sums approach a limit; terms → 0 is needed but not enough (Σ1/r diverges)." },
      { lvl: "adv", tag: "CP2", text: "Maclaurin: f(x) = f(0) + f'(0)x + f''(0)x²/2! + … + f⁽ʳ⁾(0)xʳ/r! + … Each extra term matches one more derivative at 0." },
      { lvl: "adv", tag: "CP2", text: "eˣ = 1 + x + x²/2! + … (all x); sin x = x − x³/3! + x⁵/5! − … ; cos x = 1 − x²/2! + x⁴/4! − … (all x); ln(1 + x) = x − x²/2 + x³/3 − … (−1 < x ≤ 1)." },
      { lvl: "adv", tag: "CP2", text: "Series can be combined: substitute (e^(2x)), multiply (eˣ sin x), or differentiate/integrate term by term. Only use them inside the interval of validity." },
    ],
    questions: [
      { lvl: "std", marks: 4, q: "Show that Σ r(r + 1) from r = 1 to n = ⅓n(n + 1)(n + 2).", ans: "<ul><li>Σr² + Σr = ⅙n(n + 1)(2n + 1) + ½n(n + 1)</li><li>= ⅙n(n + 1)(2n + 1 + 3)</li><li>= ⅙n(n + 1)(2n + 4)</li><li>= ⅓n(n + 1)(n + 2)</li></ul>" },
      { lvl: "std", marks: 4, q: "Expand (1 + 2x)^(−½) up to x², and state the values of x for which it is valid.", ans: "<ul><li>1 + (−½)(2x) + (−½)(−3/2)(2x)²/2</li><li>= 1 − x + 3x²/2</li><li>valid for |2x| < 1</li><li>so |x| < ½</li></ul>" },
      { lvl: "adv", marks: 4, q: "Find the Maclaurin series of e^(2x) sin x up to x³.", ans: "<ul><li>e^(2x) = 1 + 2x + 2x² + 4x³/3 + …, sin x = x − x³/6 + …</li><li>multiply: x + 2x² + 2x³ − x³/6 + …</li><li>= x + 2x² + 11x³/6</li></ul>" },
      { lvl: "adv", marks: 3, q: () => `Use the first ${P.n} terms of the Maclaurin series for ${FN[P.fn].tex(P)} to estimate its value at x = ${P.x0}, and find the percentage error.`, ans: () => { const D = FN[P.fn], a = poly(D, P, P.n, P.x0), e = D.f(P.x0, P); return `<ul><li>estimate = ${a.toFixed(6)}</li><li>true value = ${e.toFixed(6)}</li><li>percentage error = ${(100 * Math.abs(a - e) / Math.abs(e || 1)).toFixed(4)}%</li></ul>`; } },
    ]
  },
  notes: `<h3>What the page does</h3><ul><li><b>Maclaurin / binomial:</b> the curve y = f(x) (white) and the polynomial made from the first n terms (coloured). The shaded band is the interval of convergence. The chart below shows how the estimate at your chosen x changes as terms are added.</li><li><b>Sums:</b> each bar is one term uᵣ; the line is the partial sum S_N, with the limit (if there is one) or the standard-result formula.</li></ul>
<h3>Simplifications</h3><ul><li>Terms are calculated from exact formulae for the coefficients, in ordinary computer arithmetic, so with very many terms or very large x, rounding errors appear.</li><li>arctan x is included for comparison; its series is not required in 9FM0 Core Pure.</li></ul>`,
});

// ---------------- 4. Controls ----------------
const C = {};
let g = ui.group("What to explore");
C.mode = K.seg(g, { value: "mac", options: [["mac", "series for a function"], ["sum", "sums of series"]], on: v => set({ mode: v }) });
const gm = ui.group("Function"), gs = ui.group("Series");
C.fn = K.seg(gm, { value: "binom", options: Object.entries(FN).map(([k, v]) => [k, v.name]), on: v => { P.fn = v; showCtl(); fitX(); } });
C.p = K.slider(gm, { label: "Power n in (1 + x)ⁿ", min: -3, max: 4, step: 0.5, value: -1, fmt: v => v === 0.5 ? "½" : v === -0.5 ? "−½" : v === 1.5 ? "3/2" : String(v), on: v => P.p = v });
C.n = K.slider(gm, { label: "Number of terms", min: 1, max: 30, step: 1, value: 3, on: v => P.n = v });
C.x0 = K.slider(gm, { label: "Estimate at x =", min: -2, max: 2, step: 0.05, value: 0.5, fmt: v => v.toFixed(2), on: v => P.x0 = v });
let rw = K.row(gm); K.btn(rw, "− term", () => { P.n = Math.max(1, P.n - 1); C.n.set(P.n); }); K.btn(rw, "+ term", () => { P.n = Math.min(30, P.n + 1); C.n.set(P.n); }, "primary");
C.ser = K.seg(gs, { value: "inv2", options: Object.entries(SER).map(([k, v]) => [k, v.name]), on: v => { P.ser = v; } });
C.N = K.slider(gs, { label: "Number of terms N", min: 1, max: 500, step: 1, value: 20, on: v => P.N = v });
C.auto = K.toggle(gs, { label: "Keep adding terms while playing", value: false, on: v => P.auto = v });
const read = K.readout(ui.group("Numbers"), [["a", ""], ["b", ""], ["c", ""], ["d", ""]]);
const relabel = n => n.forEach((x, i) => read.el.children[i].firstElementChild.textContent = x);
function showCtl() { gm.style.display = P.mode === "mac" ? "" : "none"; gs.style.display = P.mode === "sum" ? "" : "none"; C.p.el.style.display = P.fn === "binom" ? "" : "none"; C.fn.el.querySelectorAll("button").forEach((b, i) => b.style.display = !Object.values(FN)[i].adv || ui.level === "adv" ? "" : "none"); }
function fitX() { const b = FN[P.fn].box, inp = C.x0.el.querySelector("input"); inp.min = b[0]; inp.max = b[1]; P.x0 = K.clamp(P.x0, b[0], b[1]); C.x0.set(P.x0); }
function set(o) { Object.assign(P, DEF, o); if (FN[P.fn].adv && ui.setLevel && ui.level !== "adv") ui.setLevel("adv"); for (const k of ["p", "n", "N"]) C[k].set(P[k]); for (const k of ["mode", "fn", "ser", "auto"]) C[k].set(P[k]); fitX(); showCtl(); }

// ---------------- 5. Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const M = { L: 46, R: 16, T: 16, B: 28 };
let box = null; const SX = x => M.L + (x - box[0]) / (box[1] - box[0]) * (cv.w - M.L - M.R), SY = y => cv.h - M.B - (y - box[2]) / (box[3] - box[2]) * (cv.h - M.T - M.B), WX = px => box[0] + (px - M.L) / (cv.w - M.L - M.R) * (box[1] - box[0]);
const TX = (c, s, x, y, col = "#c9d4ea", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,system-ui,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
const sup = n => String(n).split("").map(d => "⁰¹²³⁴⁵⁶⁷⁸⁹"[+d]).join("");
function termsText(D, q, n) { const out = []; for (let k = 0; k < n && out.length < 7; k++) { const c = D.c(k, q); if (Math.abs(c) < 1e-12) continue; const a = +Math.abs(c).toPrecision(4); out.push((c < 0 ? " − " : out.length ? " + " : "") + (a === 1 && k ? "" : a) + (k ? "x" + (k > 1 ? sup(k) : "") : "")); } return out.join("") + (n > 7 ? " + …" : ""); }
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1222"; c.fillRect(0, 0, w, h);
  if (P.mode === "mac") {
    const D = FN[P.fn]; box = D.box; const R = D.R(P);
    if (isFinite(R)) { c.fillStyle = "rgba(126,231,135,.07)"; c.fillRect(SX(Math.max(-R, box[0])), M.T, SX(Math.min(R, box[1])) - SX(Math.max(-R, box[0])), h - M.T - M.B); TX(c, `interval of convergence ${P.fn === "ln" ? "−1 < x ≤ 1" : "|x| < 1"}`, SX(0), M.T + 14, "#7ee787", "center", "11px"); }
    c.strokeStyle = "#16203a"; for (let x = Math.ceil(box[0]); x <= box[1]; x++) { c.beginPath(); c.moveTo(SX(x), M.T); c.lineTo(SX(x), h - M.B); c.stroke(); TX(c, x, SX(x), h - M.B + 14, "#5d6e93", "center", "10px"); } for (let y = Math.ceil(box[2]); y <= box[3]; y++) { c.beginPath(); c.moveTo(M.L, SY(y)); c.lineTo(w - M.R, SY(y)); c.stroke(); TX(c, y, M.L - 6, SY(y) + 4, "#5d6e93", "right", "10px"); }
    c.strokeStyle = "#5d6e93"; c.beginPath(); c.moveTo(M.L, SY(0)); c.lineTo(w - M.R, SY(0)); c.moveTo(SX(0), M.T); c.lineTo(SX(0), h - M.B); c.stroke();
    c.save(); c.beginPath(); c.rect(M.L, M.T, w - M.L - M.R, h - M.T - M.B); c.clip();
    const curve = (fn, col, lw, dash) => { c.strokeStyle = col; c.lineWidth = lw; c.setLineDash(dash || []); c.beginPath(); let pen = false; for (let px = M.L; px <= w - M.R; px += 1.5) { const y = fn(WX(px)); if (!isFinite(y) || Math.abs(y) > 1e4) { pen = false; continue; } pen ? c.lineTo(px, SY(y)) : c.moveTo(px, SY(y)); pen = true; } c.stroke(); c.setLineDash([]); c.lineWidth = 1; };
    for (let k = 1; k < P.n; k++) curve(x => poly(D, P, k, x), `rgba(255,180,84,${0.08 + 0.25 * k / P.n})`, 1.2);   // the earlier partial sums, faint
    curve(x => D.f(x, P), "#ffffff", 3); curve(x => poly(D, P, P.n, x), "#ffb454", 2.6);
    const fx = D.f(P.x0, P), px = poly(D, P, P.n, P.x0); c.strokeStyle = "#5ad1ff"; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(SX(P.x0), M.T); c.lineTo(SX(P.x0), h - M.B); c.stroke(); c.setLineDash([]);
    for (const [v, col] of [[fx, "#fff"], [px, "#ffb454"]]) if (isFinite(v)) { c.fillStyle = col; c.beginPath(); c.arc(SX(P.x0), SY(v), 5, 0, 6.3); c.fill(); }
    c.restore();
    TX(c, `${D.tex(P)} ≈ ${termsText(D, P, P.n)}`, M.L + 10, h - M.B - 12, "#ffb454", "left", "600 14px");
    ui.hud(`${P.n} term${P.n > 1 ? "s" : ""} at x = ${P.x0}<br>series ${isFinite(px) ? px.toFixed(6) : "–"} · true ${isFinite(fx) ? fx.toFixed(6) : "undefined"}<br>${isFinite(R) && Math.abs(P.x0) > R + 1e-9 ? '<b style="color:#ff8a9a">outside the interval: it diverges</b>' : "error " + (isFinite(px - fx) ? Math.abs(px - fx).toExponential(2) : "–")}`);
  } else {
    const S = SER[P.ser], N = P.N, terms = []; let s = 0; const sums = []; for (let r = 1; r <= N; r++) { const u = S.u(r); s += u; terms.push(u); sums.push(s); }
    const x0 = 60, x1 = w - 30, y0 = 30, y1 = h - 40, mx = Math.max(...sums.map(Math.abs), ...terms.map(Math.abs), S.lim || 0) * 1.1 || 1, mn = Math.min(0, ...sums, ...terms) * 1.1, Y = v => y1 - (v - mn) / (mx - mn) * (y1 - y0), bw = (x1 - x0) / N;
    c.strokeStyle = "#5d6e93"; c.beginPath(); c.moveTo(x0, Y(0)); c.lineTo(x1, Y(0)); c.stroke();
    terms.forEach((u, i) => { c.fillStyle = u >= 0 ? "rgba(90,209,255,.55)" : "rgba(255,123,156,.6)"; c.fillRect(x0 + i * bw + (bw > 4 ? 1 : 0), Math.min(Y(u), Y(0)), Math.max(1, bw - (bw > 4 ? 2 : 0)), Math.abs(Y(u) - Y(0))); });
    c.strokeStyle = "#ffb454"; c.lineWidth = 2.5; c.beginPath(); sums.forEach((v, i) => { const X = x0 + (i + 0.5) * bw; i ? c.lineTo(X, Y(v)) : c.moveTo(X, Y(v)); }); c.stroke(); c.lineWidth = 1;
    if (S.lim != null) { c.strokeStyle = "#7ee787"; c.setLineDash([6, 4]); c.beginPath(); c.moveTo(x0, Y(S.lim)); c.lineTo(x1, Y(S.lim)); c.stroke(); c.setLineDash([]); TX(c, `limit ${S.lim.toFixed(6)}`, x1, Y(S.lim) - 6, "#7ee787", "right", "600 12px"); }
    for (const v of [mx / 1.1, 0]) TX(c, K.sig(v, 3), x0 - 6, Y(v) + 4, "#8fa0bf", "right", "11px");
    TX(c, "bars: terms uᵣ · line: partial sums S_N", x0, 20, "#c9d4ea", "left", "12px");
    ui.hud(`${S.name}, N = ${N}<br>S_N = <b>${s.toPrecision(8)}</b>${S.S ? `<br>formula ${S.form} = ${S.S(N).toPrecision(8)}` : `<br>${S.form}`}`);
  }
}
function panels() {
  if (P.mode === "mac") {
    const D = FN[P.fn]; relabel(["Next term", "Polynomial at x", "True value", "Interval of validity"]);
    const nt = D.c(P.n, P) * Math.pow(P.x0, P.n); read.set("a", K.sig(nt, 4)); read.set("b", K.sig(poly(D, P, P.n, P.x0), 8)); read.set("c", K.sig(D.f(P.x0, P), 8)); read.set("d", isFinite(D.R(P)) ? (P.fn === "ln" ? "−1 < x ≤ 1" : "|x| < 1") : "all x");
    const est = []; for (let k = 1; k <= 30; k++) est.push([k, poly(D, P, k, P.x0)]);
    chA.opts.title = `Estimate at x = ${P.x0} as terms are added`; chA.opts.xLabel = "number of terms"; chA.opts.yLabel = "estimate"; const fv = D.f(P.x0, P);
    chA.draw([{ pts: est.filter(q => Math.abs(q[1]) < 1e6), color: K.cssVar("--s1"), label: "partial sum" }, { pts: est.filter(q => Math.abs(q[1]) < 1e6), type: "dots", r: 2.5, color: K.cssVar("--s1") }], { hlines: isFinite(fv) ? [{ y: fv, color: K.cssVar("--s2"), label: "true value" }] : [], vlines: [{ x: P.n }], yMin: isFinite(fv) ? Math.min(fv - 2, Math.max(fv - 50, Math.min(...est.map(q => q[1])))) : undefined, yMax: isFinite(fv) ? Math.max(fv + 2, Math.min(fv + 50, Math.max(...est.map(q => q[1])))) : undefined });
    const err = []; for (let x = D.box[0]; x <= D.box[1]; x += (D.box[1] - D.box[0]) / 200) { const e = Math.abs(poly(D, P, P.n, x) - D.f(x, P)); if (isFinite(e) && e > 0) err.push([x, Math.max(-12, Math.log10(e))]); }
    chB.opts.title = "log₁₀ |error| of the polynomial across x"; chB.opts.xLabel = "x"; chB.opts.yLabel = "log₁₀ |error|"; chB.draw([{ pts: err, color: K.cssVar("--s3"), label: P.n + " terms" }], { vlines: [{ x: P.x0 }] });
  } else {
    const S = SER[P.ser]; relabel(["Last term u_N", "Partial sum S_N", S.lim != null ? "Limit − S_N" : "Formula", "Converges?"]);
    const s = partial(P.ser, P.N); read.set("a", K.sig(S.u(P.N), 4)); read.set("b", K.sig(s, 8)); read.set("c", S.lim != null ? K.sig(S.lim - s, 4) : S.S ? `${S.form} = ${K.sig(S.S(P.N), 8)}` : S.form); read.set("d", S.lim != null ? "yes, to " + K.sig(S.lim, 6) : "no (it grows without limit)");
    const pts = []; for (let N = 1; N <= 500; N += N < 50 ? 1 : 5) pts.push([N, partial(P.ser, N)]);
    chA.opts.title = "Partial sums up to N = 500"; chA.opts.xLabel = "N"; chA.opts.yLabel = "S_N"; chA.draw([{ pts, color: K.cssVar("--s1"), label: "S_N" }], { vlines: [{ x: P.N }], hlines: S.lim != null ? [{ y: S.lim, color: K.cssVar("--s2"), label: "limit" }] : [] });
    if (S.S) { chB.opts.title = "Adding up compared with the formula"; chB.opts.xLabel = "N"; chB.opts.yLabel = "S_N"; const a = [], b = []; for (let N = 1; N <= Math.max(10, P.N); N += Math.max(1, Math.floor(P.N / 40))) { a.push([N, partial(P.ser, N)]); b.push([N, S.S(N)]); } chB.draw([{ pts: b, color: K.cssVar("--s2"), label: "formula" }, { pts: a, type: "dots", r: 3, color: K.cssVar("--s1"), label: "added up" }]); }
    else { chB.opts.title = "Size of the terms (log₁₀ |uᵣ|)"; chB.opts.xLabel = "r"; chB.opts.yLabel = "log₁₀ |uᵣ|"; const a = []; for (let r = 1; r <= 500; r += r < 50 ? 1 : 5) a.push([r, Math.log10(Math.abs(S.u(r)))]); chB.draw([{ pts: a, color: K.cssVar("--s0"), label: "terms" }]); }
  }
}
let frame = 0, acc = 0;
ui.run(dt => { if (P.mode === "sum" && P.auto) { acc += dt * 15; while (acc >= 1) { acc--; P.N = P.N >= 500 ? 1 : P.N + 1; } C.N.set(P.N); } }, () => { draw(); if (frame++ % 5 === 0) panels(); });
ui.onLevel = v => { if (v === "std" && FN[P.fn].adv) set({ mode: P.mode }); showCtl(); };
set({});
ui.tip("Press + term to add the next term of the series. Watch where the polynomial hugs the curve.", 7000);
