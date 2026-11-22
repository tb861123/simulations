/* =====================================================================
   PROBABILITY DISTRIBUTIONS
   A GALTON BOARD: each ball meets n pegs and goes right with probability
   p, left otherwise. Its final bin is the number of "rights", so the bins
   fill up in the shape of the BINOMIAL distribution X ~ B(n, p):
       P(X = r) = nCr · p^r · (1 − p)^(n − r),   mean np,   variance np(1 − p)
   With many rows the shape becomes the bell-shaped NORMAL distribution
   N(μ, σ²). That is why the normal approximation to the binomial works:
       B(n, p) ≈ N(np, np(1 − p)) when n is large and p is not too extreme,
   with a CONTINUITY CORRECTION (X ≤ 6 becomes Y < 6.5) because a whole
   number on a bar chart covers half a unit either side.
   Beyond 9MA0: events at random in time give the POISSON distribution,
       P(X = r) = e^(−λ) λ^r / r!,   mean = variance = λ.
   ===================================================================== */

// ---------------- 1. Probability tools ----------------
const LF = [0]; for (let i = 1; i <= 400; i++) LF[i] = LF[i - 1] + Math.log(i);       // ln(n!)
const nCr = (n, r) => Math.round(Math.exp(LF[n] - LF[r] - LF[n - r]));
const binP = (n, p, k) => k < 0 || k > n ? 0 : p <= 0 ? +(k === 0) : p >= 1 ? +(k === n) : Math.exp(LF[n] - LF[k] - LF[n - k] + k * Math.log(p) + (n - k) * Math.log(1 - p));
const poiP = (l, k) => k < 0 ? 0 : Math.exp(-l + k * Math.log(l) - LF[k]);
const erf = x => { const s = Math.sign(x), a = Math.abs(x), t = 1 / (1 + 0.3275911 * a); return s * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a)); };
const Phi = z => 0.5 * (1 + erf(z / Math.SQRT2));
function invPhi(p) { let lo = -9, hi = 9; for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; Phi(m) < p ? lo = m : hi = m; } return (lo + hi) / 2; }
const npdf = (x, m, s) => Math.exp(-((x - m) ** 2) / (2 * s * s)) / (s * Math.sqrt(2 * Math.PI));
// a Poisson count: multiply uniforms until the product drops below e^(−λ) (Knuth's method; λ is small here)
function poisson(r, l) { const L = Math.exp(-l); let k = 0, q = 1; do { k++; q *= r(); } while (q > L); return k - 1; }
function binom(r, n, p) { let k = 0; for (let i = 0; i < n; i++) if (r() < p) k++; return k; }

// ---------------- 2. State ----------------
const DEF = { dist: "binom", n: 10, p: 0.5, mu: 50, sigma: 10, lam: 3, region: "le", a: 3, b: 6, approx: false, inv: 0.95, speed: 1, invMode: false };
const P = Object.assign({}, DEF);
let rand = K.rng(Date.now() % 1e6), balls = [], counts = [], vals = [], acc = 0, dropped = 0;
const isDisc = () => P.dist !== "norm";
const lo = () => P.dist === "binom" ? 0 : P.dist === "pois" ? 0 : P.mu - 4 * P.sigma;
const hi = () => P.dist === "binom" ? P.n : P.dist === "pois" ? Math.max(8, Math.ceil(P.lam + 4.5 * Math.sqrt(P.lam) + 2)) : P.mu + 4 * P.sigma;
const NBN = 48;                                         // bins for the continuous (normal) histogram
const nBins = () => isDisc() ? hi() - lo() + 1 : NBN;
const mean = () => P.dist === "binom" ? P.n * P.p : P.dist === "pois" ? P.lam : P.mu;
const vari = () => P.dist === "binom" ? P.n * P.p * (1 - P.p) : P.dist === "pois" ? P.lam : P.sigma ** 2;
// exact probability of the chosen region
function exactProb() {
  const a = P.a, b = P.b, R = P.region;
  if (P.dist === "norm") { const F = x => Phi((x - P.mu) / P.sigma); return R === "le" ? F(b) : R === "ge" ? 1 - F(a) : Math.max(0, F(b) - F(a)); }
  const f = k => P.dist === "binom" ? binP(P.n, P.p, k) : poiP(P.lam, k); let s = 0;
  const top = P.dist === "binom" ? P.n : 400;
  for (let k = 0; k <= top; k++) { const inR = R === "le" ? k <= b : R === "ge" ? k >= a : k >= a && k <= b; if (inR) s += f(k); }
  return Math.min(1, s);
}
// the normal approximation N(np, np(1 − p)) with and without the continuity correction
function approxProb(cc) {
  const m = mean(), s = Math.sqrt(vari()), F = x => Phi((x - m) / s), h = cc ? 0.5 : 0, R = P.region;
  return R === "le" ? F(P.b + h) : R === "ge" ? 1 - F(P.a - h) : Math.max(0, F(P.b + h) - F(P.a - h));
}
const inRegion = v => { const R = P.region; return R === "le" ? v <= P.b + 1e-9 : R === "ge" ? v >= P.a - 1e-9 : v >= P.a - 1e-9 && v <= P.b + 1e-9; };
const regionText = (sym = "X") => P.region === "le" ? `P(${sym} ≤ ${fmtV(P.b)})` : P.region === "ge" ? `P(${sym} ≥ ${fmtV(P.a)})` : `P(${fmtV(P.a)} ≤ ${sym} ≤ ${fmtV(P.b)})`;
const fmtV = v => isDisc() ? String(Math.round(v)) : (+v.toFixed(2)).toString();

// ---------------- 3. The page ----------------
const ui = K.app({
  title: "Probability Distributions", subject: "Mathematics",
  blurb: "A Galton board builds the binomial distribution ball by ball; areas under the normal curve, inverse normal, and the normal approximation",
  reset: () => clearBalls(),
  levels: { std: "AS (8MA0)", adv: "A level (9MA0)", specs: {
    std: "Pearson Edexcel AS Mathematics (8MA0) Statistics 3.1 and 4.1: discrete probability distributions, the binomial distribution as a model, its conditions, and calculating binomial probabilities P(X = r), P(X ≤ r).",
    adv: "Pearson Edexcel A level Mathematics (9MA0) Statistics 4.1–4.3: binomial and normal distributions, areas under the normal curve, the inverse normal, standardising Z = (X − μ)/σ, the points of inflection at μ ± σ, choosing a model, and the normal approximation to the binomial with a continuity correction. The Poisson distribution goes beyond 9MA0 (Further Statistics 1)." } },
  missions: [
    { title: "Build a binomial distribution", q: "Ten rows of pegs, p = 0.5. Before you watch: which bin will catch the most balls? Drop a few hundred. Does the shape match the bars predicted by B(10, 0.5)?", hint: "The middle bin (5) is most likely: there are 10C5 = 252 different paths to it but only 1 path to bin 0. P(X = 5) = 252 × 0.5¹⁰ ≈ 0.246. The histogram settles onto the predicted outline as more balls fall.", setup: () => set({}) },
    { title: "A biased board", q: "Make p = 0.2 (each ball goes right only 1 time in 5). Where is the peak now, and is the distribution symmetrical?", hint: "The peak moves to 2 = np, and the shape is positively skewed (a long tail to the right). It is only symmetrical when p = 0.5.", setup: () => set({ p: 0.2, speed: 2 }) },
    { title: "Cumulative probability", q: "X ~ B(10, 0.3). Find P(X ≤ 2) from the board and compare with the exact answer. Why is P(X < 3) the same?", hint: "P(X ≤ 2) = 0.3828. X is a whole number, so 'less than 3' and 'at most 2' are the same event; with a continuous variable they would not need converting.", setup: () => set({ p: 0.3, region: "le", b: 2, speed: 3 }) },
    { title: "Mean and variance", q: "Compare the sample mean and variance of the balls with np and np(1 − p) for n = 20, p = 0.25.", hint: "The mean settles near 5 and the variance near 3.75. The variance is largest at p = 0.5 for a given n and shrinks to 0 as p → 0 or 1.", setup: () => set({ n: 20, p: 0.25, speed: 4 }) },
    { lvl: "adv", title: "Areas under the normal curve", q: "IQ ~ N(100, 15²). What proportion of people have IQ between 85 and 115? Between 70 and 130? Check the 68–95–99.7 rule.", hint: "P(85 < X < 115) = 0.6827 (within 1 σ), P(70 < X < 130) = 0.9545 (within 2 σ). The points of inflection of the curve are at μ ± σ: 85 and 115.", setup: () => set({ dist: "norm", mu: 100, sigma: 15, region: "between", a: 85, b: 115, speed: 4 }) },
    { lvl: "adv", title: "Inverse normal", q: "Bags of sugar ~ N(1010, 6²) grams. What mass is exceeded by only 5% of bags? Use the inverse normal slider.", hint: "x = 1010 + 1.6449 × 6 = 1019.9 g. The inverse normal works backwards from an area to a value: P(X < x) = 0.95 gives z = 1.6449.", setup: () => set({ dist: "norm", mu: 1010, sigma: 6, invMode: true, inv: 0.95, region: "ge", a: 1019.9, speed: 3 }) },
    { lvl: "adv", title: "From board to bell", q: "Increase the number of rows to 40, p = 0.5. Overlay the normal approximation. How closely does N(np, np(1 − p)) fit?", hint: "Very closely: N(20, 10). With p = 0.5 the approximation is good even for small n; the larger n is, the better it gets (central limit theorem).", setup: () => set({ n: 40, p: 0.5, approx: true, speed: 6 }) },
    { lvl: "adv", title: "The continuity correction", q: "X ~ B(30, 0.4). Compare the exact P(X ≤ 10) with the normal approximation, with and without the continuity correction.", hint: "Exact 0.2915. N(12, 7.2): P(Y < 10.5) = 0.2883 (with correction) but P(Y < 10) = 0.2280 (without). The bar for X = 10 stretches from 9.5 to 10.5, so the area must go to 10.5.", setup: () => set({ n: 30, p: 0.4, approx: true, region: "le", b: 10, speed: 4 }) },
    { lvl: "adv", title: "When does the approximation fail?", q: "Set n = 20, p = 0.05 with the overlay. Why is the normal approximation poor here?", hint: "np = 1, so the distribution is squashed against 0 and strongly skewed; the bell spills into negative values. Rule of thumb: n large and p close to 0.5 (np and n(1 − p) both above about 5).", setup: () => set({ n: 20, p: 0.05, approx: true, region: "le", b: 0, speed: 4 }) },
    { lvl: "adv", title: "Random events: Poisson (beyond 9MA0)", q: "Customers arrive at random, on average 3 per minute. Each ball counts the arrivals in one minute. Is the mean equal to the variance?", hint: "For a Poisson distribution, mean = variance = λ = 3. P(X = 0) = e⁻³ = 0.0498. It is the limit of B(n, λ/n) as n → ∞: many tiny chances of an arrival.", setup: () => set({ dist: "pois", lam: 3, speed: 3 }) },
  ],
  batch: [
    { title: "Does the mean equal np?", question: "Drop 50 balls on a board with n = 20, p = 0.3. How close is the sample mean to np = 6?", how: "Each run drops 50 balls and records their mean bin.", yLabel: "sample mean of X", reps: 300, bins: 24, theory: 6, theoryLabel: "np", run: (x, r) => { let s = 0; for (let i = 0; i < 50; i++) s += binom(r, 20, 0.3); return s / 50; }, note: "Each sample mean scatters around 6 with standard deviation √(np(1−p)/50) = √(4.2/50) ≈ 0.29." },
    { title: "Variance and p", question: "How does the variance of X ~ B(20, p) depend on p?", how: "Each run drops 400 balls and records the sample variance of their bins.", xLabel: "probability p", yLabel: "variance of X", xs: [0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95], reps: 5, yMin: 0, theory: p => 20 * p * (1 - p), theoryLabel: "np(1 − p)", run: (p, r) => { const v = []; for (let i = 0; i < 400; i++) v.push(binom(r, 20, p)); return K.sd(v) ** 2; }, note: "A parabola, largest at p = 0.5 (variance n/4) and symmetrical: p and 1 − p give the same spread, mirrored." },
    { title: "The 68–95–99.7 rule (A level)", question: "What fraction of a normal population lies within k standard deviations of the mean?", how: "Each run draws 500 values from N(100, 15²) and records the fraction within k σ of 100.", xLabel: "k (standard deviations)", yLabel: "fraction within μ ± kσ", xs: [0.5, 1, 1.5, 2, 2.5, 3], reps: 6, yMin: 0, yMax: 1, theory: k => 2 * Phi(k) - 1, theoryLabel: "2Φ(k) − 1", run: (k, r) => { let c = 0; for (let i = 0; i < 500; i++) if (Math.abs(15 * r.gauss()) <= 15 * k) c++; return c / 500; }, note: "0.683 at 1σ, 0.954 at 2σ, 0.997 at 3σ, whatever μ and σ are. That is why standardising with Z = (X − μ)/σ lets one table serve every normal distribution." },
    { title: "Normal approximation with a continuity correction (A level)", question: "For X ~ B(n, 0.3), how close is the normal approximation to P(X ≤ np) for different n?", how: "Each run simulates 2000 values of X and records the fraction with X ≤ ⌊np⌋. The theory line is the normal approximation with continuity correction.", xLabel: "n", yLabel: "P(X ≤ ⌊np⌋)", xs: [5, 10, 20, 40, 80, 160], reps: 5, yMin: 0.4, yMax: 0.8, theory: n => { const m = 0.3 * n, s = Math.sqrt(n * 0.21); return Phi((Math.floor(m) + 0.5 - m) / s); }, theoryLabel: "normal approx. Φ((⌊np⌋ + 0.5 − np)/σ)", run: (n, r) => { const t = Math.floor(0.3 * n); let c = 0; for (let i = 0; i < 2000; i++) if (binom(r, n, 0.3) <= t) c++; return c / 2000; }, note: "The points (the true binomial probability) jump about because ⌊np⌋ jumps; the approximation follows them more and more closely as n grows." },
    { title: "Poisson: mean = variance? (beyond 9MA0)", question: "For counts of random events, is the variance equal to the mean λ?", how: "Each run counts events in 300 intervals and records variance ÷ mean (the dispersion index).", xLabel: "mean rate λ", yLabel: "variance ÷ mean", xs: [0.5, 1, 2, 4, 8, 12], reps: 6, yMin: 0, yMax: 2, theory: () => 1, theoryLabel: "1 for a Poisson distribution", run: (l, r) => { const v = []; for (let i = 0; i < 300; i++) v.push(poisson(r, l)); return K.sd(v) ** 2 / K.mean(v); }, note: "Close to 1 at every rate. Real counts often have a ratio above 1 (overdispersion): buses that bunch, or illnesses that spread, are not independent events." },
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4.1", text: "X ~ B(n, p) models the number of successes in n trials when: there is a fixed number of trials; each trial is success or failure; trials are independent; the probability of success p is the same each time." },
      { lvl: "std", tag: "4.1", text: "P(X = r) = nCr p^r (1 − p)^(n − r). nCr counts the routes through the board to bin r. Use cumulative tables or a calculator for P(X ≤ r); P(X ≥ r) = 1 − P(X ≤ r − 1)." },
      { lvl: "std", tag: "3.1", text: "A discrete probability distribution lists every value with its probability; the probabilities add to 1. A discrete uniform distribution gives each value the same probability." },
      { lvl: "adv", tag: "4.2", text: "X ~ N(μ, σ²): bell-shaped, symmetrical about μ, with points of inflection at μ ± σ. About 68% within 1σ, 95% within 2σ, 99.7% within 3σ. Standardise with Z = (X − μ)/σ." },
      { lvl: "adv", tag: "4.2", text: "Inverse normal: from a probability, find x (or the z value), e.g. P(Z < z) = 0.95 gives z = 1.6449. To find an unknown μ or σ, form equations using z values." },
      { lvl: "adv", tag: "4.3", text: "If n is large and p is close to 0.5, B(n, p) ≈ N(np, np(1 − p)). Use a continuity correction: P(X ≤ 10) ≈ P(Y < 10.5), P(X ≥ 10) ≈ P(Y > 9.5), P(X = 10) ≈ P(9.5 < Y < 10.5)." },
      { lvl: "beyond", tag: "FS1", text: "Poisson Po(λ): events occur singly, independently and at a constant average rate. Mean = variance = λ. Not in 9MA0 (Further Statistics 1)." },
    ],
    questions: [
      { lvl: "std", marks: 2, q: () => P.dist === "binom" ? `X ~ B(${P.n}, ${P.p}). Find P(X = ${Math.round(P.n * P.p)}).` : "X ~ B(10, 0.5). Find P(X = 5).", ans: () => { const n = P.dist === "binom" ? P.n : 10, p = P.dist === "binom" ? P.p : 0.5, r = Math.round(n * p); return `<ul><li>${n}C${r} × ${p}^${r} × ${+(1 - p).toFixed(2)}^${n - r} = ${nCr(n, r)} × …</li><li>= ${binP(n, p, r).toFixed(4)}</li></ul>`; } },
      { lvl: "std", marks: 3, q: "A fair spinner has 5 equal sectors, one red. It is spun 12 times. Find the probability that it lands on red at least 3 times.", ans: "<ul><li>X ~ B(12, 0.2)</li><li>P(X ≥ 3) = 1 − P(X ≤ 2)</li><li>= 1 − 0.5583 = 0.4417</li></ul>" },
      { lvl: "std", marks: 2, q: "Give two conditions needed for the number of seeds that germinate in a tray of 20 to be modelled by B(20, p).", ans: "<ul><li>each seed germinates independently of the others</li><li>each seed has the same probability p of germinating (and there is a fixed number, 20)</li></ul>" },
      { lvl: "adv", marks: 3, q: "X ~ N(100, 15²). Find P(X > 120) and the value of x such that P(X < x) = 0.9.", ans: "<ul><li>z = (120 − 100)/15 = 1.333; P(X > 120) = 1 − 0.9088 = 0.0912</li><li>P(Z < z) = 0.9 gives z = 1.2816</li><li>x = 100 + 1.2816 × 15 = 119.2</li></ul>" },
      { lvl: "adv", marks: 4, q: "The masses of apples are normally distributed. 10% weigh less than 100 g and 5% more than 160 g. Find μ and σ.", ans: "<ul><li>(100 − μ)/σ = −1.2816</li><li>(160 − μ)/σ = 1.6449</li><li>subtract: 60 = 2.9265σ, σ = 20.5 g</li><li>μ = 100 + 1.2816 × 20.5 = 126.3 g</li></ul>" },
      { lvl: "adv", marks: 4, q: "X ~ B(30, 0.4). Use a normal approximation to find P(X ≤ 10).", ans: "<ul><li>np = 12, np(1 − p) = 7.2, so Y ~ N(12, 7.2)</li><li>continuity correction: P(Y < 10.5)</li><li>z = (10.5 − 12)/√7.2 = −0.559</li><li>P = 0.288 (exact 0.2915)</li></ul>" },
    ]
  },
  notes: `<h3>What happens</h3><ul><li><b>Binomial:</b> each ball meets n rows of pegs and goes right with probability p at each one. Its bin is the number of rights: a B(n, p) value. The outline shows the exact probabilities × the number of balls.</li>
<li><b>Normal (A level):</b> values are drawn from N(μ, σ²) (Box–Muller method) and fall into 48 narrow bins; the curve is the density scaled to the number of balls.</li>
<li><b>Poisson (beyond 9MA0):</b> each ball is one interval of time; events fall at random in it, and the ball drops into the bin for the number of events.</li>
<li>The shaded region is the probability you choose. "Balls in region" is the fraction observed so far; the exact value comes from the formula.</li></ul>
<h3>Assumptions and simplifications</h3><ul><li>Every bounce is independent and has the same chance p: real Galton boards are not quite like this (balls keep some sideways momentum).</li>
<li>The normal distribution has tails that go on for ever; the board only shows μ ± 4σ (99.99% of values).</li>
<li>Random numbers come from a seeded pseudo-random generator.</li></ul>`,
});

// ---------------- 4. Controls ----------------
const C = {};
let g = ui.group("Distribution");
C.dist = K.seg(g, { value: "binom", options: [["binom", "Binomial"], ["norm", "Normal (A level)"], ["pois", "Poisson (beyond)"]], on: v => set({ dist: v, n: P.n, p: P.p }) });
C.n = K.slider(g, { label: "Rows of pegs n", min: 1, max: 60, step: 1, value: 10, on: v => upd({ n: v }) });
C.p = K.slider(g, { label: "Chance of going right p", min: 0, max: 1, step: 0.01, value: 0.5, fmt: v => v.toFixed(2), on: v => upd({ p: v }) });
C.mu = K.slider(g, { label: "Mean μ", min: 0, max: 1200, step: 1, value: 50, on: v => upd({ mu: v }) });
C.sigma = K.slider(g, { label: "Standard deviation σ", min: 1, max: 60, step: 0.5, value: 10, on: v => upd({ sigma: v }) });
C.lam = K.slider(g, { label: "Mean rate λ (events per interval)", min: 0.2, max: 15, step: 0.1, value: 3, fmt: v => v.toFixed(1), on: v => upd({ lam: v }) });
g = ui.group("Probability to find");
C.region = K.seg(g, { value: "le", options: [["le", "P(X ≤ b)"], ["ge", "P(X ≥ a)"], ["between", "P(a ≤ X ≤ b)"]], on: v => { P.region = v; showCtl(); } });
C.a = K.slider(g, { label: "a", min: 0, max: 60, step: 1, value: 3, fmt: v => fmtV(v), on: v => P.a = v });
C.b = K.slider(g, { label: "b", min: 0, max: 60, step: 1, value: 6, fmt: v => fmtV(v), on: v => P.b = v });
C.approx = K.toggle(g, { label: "Overlay the normal approximation N(np, np(1 − p)) (A level)", value: false, on: v => P.approx = v });
C.invMode = K.toggle(g, { label: "Inverse normal: find x from a probability (A level)", value: false, on: v => { P.invMode = v; showCtl(); } });
C.inv = K.slider(g, { label: "P(X < x) =", min: 0.005, max: 0.995, step: 0.005, value: 0.95, fmt: v => v.toFixed(3), on: v => P.inv = v });
g = ui.group("Balls");
C.speed = K.slider(g, { label: "Balls per second", min: 0, max: 7, step: 1, value: 1, fmt: v => [1, 3, 10, 30, 100, 300, 1000, 3000][v] + "", on: v => P.speed = v });
ui.headerSpeed(C.speed);   // playback speed lives in the header, beside Pause and Reset
let rw = K.row(g); K.btn(rw, "Drop 1", () => drop(1)); K.btn(rw, "Drop 100", () => drop(100, true)); K.btn(rw, "Drop 1000", () => drop(1000, true)); K.btn(rw, "Clear", () => clearBalls(), "danger");
const read = K.readout(ui.group("Numbers"), [["ex", "Exact probability"], ["sim", "Balls in region"], ["ap", "Normal approximation"], ["mv", "Mean, variance (theory)"], ["smv", "Mean, variance (balls)"], ["k", "Balls"]]);

function showCtl() {
  const d = P.dist, adv = ui.level === "adv";
  C.n.el.style.display = C.p.el.style.display = d === "binom" ? "" : "none";
  C.mu.el.style.display = C.sigma.el.style.display = d === "norm" ? "" : "none";
  C.lam.el.style.display = d === "pois" ? "" : "none";
  C.approx.el.style.display = d === "binom" && adv ? "" : "none";
  C.invMode.el.style.display = d === "norm" ? "" : "none"; C.inv.el.style.display = d === "norm" && P.invMode ? "" : "none";
  C.a.el.style.display = P.region !== "le" ? "" : "none"; C.b.el.style.display = P.region !== "ge" ? "" : "none";
  C.dist.el.querySelectorAll("button").forEach((b, i) => b.style.display = i === 0 || adv ? "" : "none");
}
// keep a and b inside the range of X, with the right step size
function fitAB() {
  const st = isDisc() ? 1 : +(P.sigma / 50).toPrecision(1), L = isDisc() ? lo() : Math.floor(lo() / st) * st, H = hi();
  for (const k of ["a", "b"]) { const inp = C[k].el.querySelector("input"); inp.min = L; inp.max = H; inp.step = st; P[k] = K.clamp(isDisc() ? Math.round(P[k]) : P[k], L, H); C[k].set(P[k]); }
  const m = C.mu.el.querySelector("input"); m.min = Math.max(0, Math.round(P.mu - 300)); m.max = Math.round(P.mu + 300); C.mu.set(P.mu);
}
function set(o) {
  Object.assign(P, DEF, o);
  if ((P.dist !== "binom" || P.approx) && ui.level !== "adv" && ui.setLevel) ui.setLevel("adv");
  if (P.dist === "norm" && !("a" in o) && !("b" in o)) { P.a = P.mu - P.sigma; P.b = P.mu + P.sigma; }
  if (P.dist === "pois" && !("b" in o)) { P.b = Math.round(P.lam); }
  for (const k of ["n", "p", "sigma", "lam", "inv", "speed"]) C[k].set(P[k]);
  for (const k of ["dist", "region", "approx", "invMode"]) C[k].set(P[k]);
  fitAB(); showCtl(); clearBalls();
}
function upd(o) { Object.assign(P, o); fitAB(); clearBalls(); }
function clearBalls() { balls = []; counts = new Array(nBins()).fill(0); vals = []; dropped = 0; }
const binOf = v => isDisc() ? v - lo() : K.clamp(Math.floor((v - lo()) / (hi() - lo()) * NBN), 0, NBN - 1);
// one new ball: decide its whole path now (a list of left/right bounces), then animate it
function newBall() {
  if (P.dist === "binom") { const path = []; let k = 0; for (let i = 0; i < P.n; i++) { const right = rand() < P.p; path.push(right); if (right) k++; } return { path, v: k, t: 0 }; }
  if (P.dist === "norm") { const v = P.mu + P.sigma * rand.gauss(); return { v, t: 0, wob: rand() * 6.28 }; }
  const ev = [], l = P.lam; let tt = -Math.log(1 - rand()) / l; while (tt < 1) { ev.push(tt); tt += -Math.log(1 - rand()) / l; }   // gaps between random events are exponential
  return { v: ev.length, ev, t: 0 };
}
function land(b) { if (b.v >= lo() - 1e-9 && b.v <= hi() + 1e-9) counts[binOf(b.v)]++; vals.push(b.v); dropped++; }
function drop(k, instant) { for (let i = 0; i < k; i++) { const b = newBall(); if (instant || balls.length > 300) land(b); else balls.push(b); } }

// ---------------- 5. Animation and drawing ----------------
const cv = ui.canvas();
const chA = K.chart(ui.dock, { title: "Probability distribution (bars) and your balls (dots)", yLabel: "probability", yMin: 0 });
const chB = K.chart(ui.dock, { title: "Cumulative probability P(X ≤ x)", yLabel: "P(X ≤ x)", yMin: 0, yMax: 1 });
const RATE = [1, 3, 10, 30, 100, 300, 1000, 3000];
function tick(dt) {
  acc += dt * RATE[P.speed]; let k = Math.floor(acc); acc -= k;
  if (k > 40) { drop(k, true); k = 0; } drop(k);
  const dur = P.dist === "binom" ? Math.max(0.6, P.n * 0.09) : 1.4;
  for (const b of balls) b.t += dt / dur * (RATE[P.speed] > 30 ? 3 : 1);
  balls = balls.filter(b => { if (b.t >= 1) { land(b); return false; } return true; });
}
const TX = (c, s, x, y, col = "#c9d4ea", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,system-ui,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1222"; c.fillRect(0, 0, w, h);
  const x0 = 60, x1 = w - 40, nb = nBins(), bw = (x1 - x0) / nb, boardTop = 30, boardBot = Math.min(h * 0.46, 30 + (P.dist === "binom" ? Math.max(6, P.n) * 14 : 200)), hb = h - 34, ht = boardBot + 40;
  const BX = i => x0 + (i + 0.5) * bw;                    // centre of bin i
  const VX = v => isDisc() ? BX(v - lo()) : x0 + (v - lo()) / (hi() - lo()) * (x1 - x0);
  // --- the board
  if (P.dist === "binom") {
    const rows = P.n, dy = (boardBot - boardTop) / Math.max(1, rows), r = Math.max(1.2, Math.min(4, bw * 0.12, dy * 0.25));
    c.fillStyle = "#5d6e93"; for (let i = 0; i < rows; i++) for (let j = 0; j <= i; j++) { c.beginPath(); c.arc(VX(j + (rows - i) / 2), boardTop + (i + 0.5) * dy, r, 0, 6.3); c.fill(); }
    for (const b of balls) {                       // a ball at row t·n, between pegs, x = (rights so far) + (rows left)/2
      const tt = b.t * (rows + 1), i = Math.min(rows, Math.floor(tt)), f = tt - Math.floor(tt); let k = 0; for (let q = 0; q < i && q < rows; q++) if (b.path[q]) k++;
      const xa = k + (rows - i) / 2, xb = i < rows ? k + (b.path[i] ? 1 : 0) + (rows - i - 1) / 2 : xa, x = VX(xa + (xb - xa) * f), y = boardTop + (Math.min(tt, rows + 1)) * dy - dy * 0.5 - Math.sin(Math.PI * f) * dy * 0.3;
      c.fillStyle = "#ffd166"; c.beginPath(); c.arc(x, Math.min(y, hb), Math.max(2, Math.min(5, bw * 0.2)), 0, 6.3); c.fill();
    }
    TX(c, `GALTON BOARD: ${rows} row${rows > 1 ? "s" : ""}, each bounce goes right with probability ${P.p.toFixed(2)}`, x0, 18, "#ffd166", "left", "600 12px");
  } else if (P.dist === "norm") {
    c.fillStyle = "#3a4560"; for (let i = 0; i < 14; i++) for (let j = 0; j < 40; j++) { if ((i + j) % 2) continue; c.beginPath(); c.arc(x0 + (j + 0.5) / 40 * (x1 - x0), boardTop + 10 + i * (boardBot - boardTop - 10) / 14, 1.6, 0, 6.3); c.fill(); }
    for (const b of balls) { const x = VX(P.mu) + (VX(b.v) - VX(P.mu)) * Math.min(1, b.t * 1.25) + Math.sin(b.wob + b.t * 30) * 3 * (1 - b.t), y = boardTop + b.t * (hb - boardTop); c.fillStyle = "#ffd166"; c.beginPath(); c.arc(x, y, 3, 0, 6.3); c.fill(); }
    TX(c, `A "board" with very many rows: values X ~ N(${P.mu}, ${P.sigma}²)`, x0, 18, "#ffd166", "left", "600 12px");
  } else {
    const sy = boardTop + 14, sh = Math.min(26, (boardBot - sy) / 6 - 8);
    TX(c, `RANDOM EVENTS: each ball is one interval, events at an average rate λ = ${P.lam}`, x0, 18, "#ffd166", "left", "600 12px");
    balls.slice(-6).forEach((b, i) => { const y = sy + i * (sh + 8), tt = Math.min(1, b.t * 1.6); c.fillStyle = "#151e33"; c.fillRect(x0, y, x1 - x0, sh); c.fillStyle = "#3a4a6e"; c.fillRect(x0, y, (x1 - x0) * tt, sh); let k = 0; for (const e of b.ev) if (e <= tt) { k++; c.fillStyle = "#ffd166"; c.fillRect(x0 + e * (x1 - x0) - 1.5, y + 3, 3, sh - 6); } TX(c, k + (tt < 1 ? "…" : ""), x1 + 6, y + 18, "#fff"); });
  }
  // --- the bins (histogram of the balls) and the exact distribution
  const tot = Math.max(1, dropped), pr = i => P.dist === "binom" ? binP(P.n, P.p, i + lo()) : P.dist === "pois" ? poiP(P.lam, i + lo()) : (Phi((lo() + (i + 1) * (hi() - lo()) / NBN - P.mu) / P.sigma) - Phi((lo() + i * (hi() - lo()) / NBN - P.mu) / P.sigma));
  let pm = 0.02; for (let i = 0; i < nb; i++) pm = Math.max(pm, pr(i), dropped ? counts[i] / tot : 0);
  const Y = q => hb - q / pm * (hb - ht);
  c.strokeStyle = "#3a4a6e"; c.beginPath(); c.moveTo(x0, hb + .5); c.lineTo(x1, hb + .5); c.stroke();
  for (let i = 0; i < nb; i++) {
    const v = isDisc() ? i + lo() : lo() + (i + 0.5) * (hi() - lo()) / NBN, inR = inRegion(v), q = counts[i] / tot;
    c.fillStyle = inR ? "#ff9f43" : "#3d7fbf"; if (dropped) c.fillRect(x0 + i * bw + 1, Y(q), Math.max(1, bw - 2), hb - Y(q));
    if (isDisc()) { c.strokeStyle = "rgba(255,255,255,.85)"; c.lineWidth = 1.5; c.strokeRect(x0 + i * bw + 1, Y(pr(i)), Math.max(1, bw - 2), hb - Y(pr(i))); c.lineWidth = 1; }
    if (isDisc() && (bw > 18 || i % Math.ceil(20 / bw) === 0)) TX(c, i + lo(), BX(i), hb + 14, "#8fa0bf", "center", "11px");
    if (P.dist === "binom" && bw > 26 && P.n <= 16) TX(c, nCr(P.n, i), BX(i), ht - 6, "#5d6e93", "center", "10px");
  }
  if (P.dist === "binom" && bw > 26 && P.n <= 16) TX(c, "routes:", x0 - 6, ht - 6, "#5d6e93", "right", "10px");
  if (!isDisc()) {   // the density curve, scaled to bin width, with its region shaded
    const bwv = (hi() - lo()) / NBN; c.strokeStyle = "#fff"; c.lineWidth = 2; c.beginPath();
    for (let px = x0; px <= x1; px += 2) { const v = lo() + (px - x0) / (x1 - x0) * (hi() - lo()), y = Y(npdf(v, P.mu, P.sigma) * bwv); px === x0 ? c.moveTo(px, y) : c.lineTo(px, y); } c.stroke(); c.lineWidth = 1;
    c.fillStyle = "rgba(255,159,67,.25)"; for (let px = x0; px <= x1; px++) { const v = lo() + (px - x0) / (x1 - x0) * (hi() - lo()); if (inRegion(v)) c.fillRect(px, Y(npdf(v, P.mu, P.sigma) * bwv), 1, hb - Y(npdf(v, P.mu, P.sigma) * bwv)); }
    for (let k = -3; k <= 3; k++) TX(c, (+(P.mu + k * P.sigma).toFixed(1)).toString(), VX(P.mu + k * P.sigma), hb + 14, "#8fa0bf", "center", "11px");
    for (const k of [-1, 1]) { c.fillStyle = "#c4a1ff"; c.beginPath(); c.arc(VX(P.mu + k * P.sigma), Y(npdf(P.mu + k * P.sigma, P.mu, P.sigma) * bwv), 4, 0, 6.3); c.fill(); }
    TX(c, "● points of inflection at μ ± σ", x1, ht - 6, "#c4a1ff", "right", "11px");
    if (P.invMode) { const z = invPhi(P.inv), x = P.mu + z * P.sigma; c.strokeStyle = "#7ee787"; c.lineWidth = 2; c.setLineDash([5, 4]); c.beginPath(); c.moveTo(VX(x), ht); c.lineTo(VX(x), hb); c.stroke(); c.setLineDash([]); c.lineWidth = 1; TX(c, `P(X < x) = ${P.inv.toFixed(3)} → z = ${z.toFixed(4)}, x = ${P.mu} + ${z.toFixed(4)} × ${P.sigma} = ${x.toFixed(2)}`, VX(x) + (VX(x) > (x0 + x1) / 2 ? -8 : 8), ht + 12, "#7ee787", VX(x) > (x0 + x1) / 2 ? "right" : "left", "600 12px"); }
  }
  if (P.approx && P.dist === "binom") {   // the normal approximation, as a density per unit (one bar = one unit wide)
    const m = mean(), s = Math.sqrt(vari()); if (s > 0) { c.strokeStyle = "#7ee787"; c.lineWidth = 2.2; c.beginPath(); for (let px = x0; px <= x1; px += 2) { const v = lo() - 0.5 + (px - x0) / (x1 - x0) * (hi() - lo() + 1), y = Y(npdf(v, m, s)); px === x0 ? c.moveTo(px, y) : c.lineTo(px, y); } c.stroke(); c.lineWidth = 1; TX(c, `green: N(${m.toFixed(2)}, ${(s * s).toFixed(2)})`, x1, ht + 12, "#7ee787", "right", "600 12px");
      const edge = P.region === "le" ? P.b + 0.5 : P.region === "ge" ? P.a - 0.5 : null; if (edge != null) { const xe = x0 + (edge - lo() + 0.5) / (hi() - lo() + 1) * (x1 - x0); c.strokeStyle = "#7ee787"; c.setLineDash([4, 3]); c.beginPath(); c.moveTo(xe, ht + 20); c.lineTo(xe, hb); c.stroke(); c.setLineDash([]); TX(c, `${edge} (continuity correction)`, xe + 4, ht + 52, "#7ee787", "left", "11px"); } }
  }
  TX(c, `${regionText()} = ${exactProb().toFixed(4)}   ·   balls in region: ${dropped ? (vals.filter(inRegion).length / dropped).toFixed(4) : "–"}`, x0, ht - (P.dist === "binom" && bw > 26 && P.n <= 16 ? 20 : 6), "#ff9f43", "left", "600 12px");
}
function panels() {
  const ex = exactProb(); read.set("ex", `${regionText()} = ${ex.toFixed(4)}`);
  read.set("sim", dropped ? `${vals.filter(inRegion).length} of ${dropped} = ${(vals.filter(inRegion).length / dropped).toFixed(4)}` : "–");
  read.set("ap", P.dist === "binom" && ui.level === "adv" ? `${approxProb(true).toFixed(4)} with c.c. · ${approxProb(false).toFixed(4)} without` : P.dist === "norm" ? `z = (x − ${P.mu}) / ${P.sigma}` : "–");
  read.set("mv", `${K.sig(mean(), 4)}, ${K.sig(vari(), 4)}`);
  read.set("smv", vals.length > 1 ? `${K.mean(vals).toFixed(3)}, ${(K.sd(vals) ** 2).toFixed(3)}` : "–"); read.set("k", dropped.toLocaleString());
  // charts: exact distribution vs observed, and the cumulative distribution
  const L = lo(), H = hi(), A = [], B = [], O = [], CO = []; let cum = 0, ocum = 0;
  if (isDisc()) { for (let k = L; k <= H; k++) { const p = P.dist === "binom" ? binP(P.n, P.p, k) : poiP(P.lam, k); A.push([k, p]); cum += p; B.push([k, cum]); if (dropped) { O.push([k, counts[k - L] / dropped]); ocum += counts[k - L] / dropped; CO.push([k, ocum]); } } }
  else { for (let i = 0; i <= 120; i++) { const x = L + (H - L) * i / 120; A.push([x, npdf(x, P.mu, P.sigma)]); B.push([x, Phi((x - P.mu) / P.sigma)]); } const bwv = (H - L) / NBN; if (dropped) for (let i = 0; i < NBN; i++) { O.push([L + (i + .5) * bwv, counts[i] / dropped / bwv]); ocum += counts[i] / dropped; CO.push([L + (i + 1) * bwv, ocum]); } }
  chA.opts.xLabel = chB.opts.xLabel = "x"; chA.opts.yLabel = isDisc() ? "P(X = x)" : "probability density";
  chA.draw(isDisc() ? [{ pts: A, type: "bars", w: 0.7, color: K.cssVar("--s0"), alpha: .55, label: "exact" }, { pts: O, type: "dots", color: K.cssVar("--s1"), label: "balls" }] : [{ pts: A, color: K.cssVar("--s0"), label: "density" }, { pts: O, type: "dots", color: K.cssVar("--s1"), r: 2.5, label: "balls" }], { xMin: L - (isDisc() ? .6 : 0), xMax: H + (isDisc() ? .6 : 0) });
  chB.draw([{ pts: B, color: K.cssVar("--s0"), label: "exact", type: "line" }, { pts: CO, type: "dots", color: K.cssVar("--s1"), r: 2.5, label: "balls" }], { xMin: L - (isDisc() ? .6 : 0), xMax: H + (isDisc() ? .6 : 0), hlines: P.invMode && P.dist === "norm" ? [{ y: P.inv, color: K.cssVar("--s2"), label: "P = " + P.inv }] : [] });
}
let frame = 0;
ui.run(dt => tick(dt), () => { draw(); if (frame++ % 6 === 0) panels(); });
ui.onLevel = v => { if (v === "std" && P.dist !== "binom") set({}); showCtl(); };
set({});
ui.tip("Balls bounce left or right at every peg. Watch which bins fill up.", 6000);
