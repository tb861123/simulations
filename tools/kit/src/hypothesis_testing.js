/* =====================================================================
   HYPOTHESIS TESTING
   A claim is made about a population (the NULL HYPOTHESIS H0), for
   example "this spinner lands on red 25% of the time". We suspect
   something else (the ALTERNATIVE H1, e.g. "p > 0.25").
     1. Take a sample and count X (or work out the sample mean x̄).
     2. Ask: IF H0 were true, how likely is a result at least this
        extreme? That probability is the p-value.
     3. If it is below the significance level α, the result is
        "significant": reject H0. Otherwise there is not enough evidence.
   The CRITICAL REGION is the set of results that would make us reject
   H0. Because a sample is random, a test can be wrong:
     Type I error  : rejecting H0 when it is true   (chance ≤ α)
     Type II error : not rejecting H0 when it is false
     Power = 1 − P(Type II error): the chance of spotting a real effect.
   ===================================================================== */

// ---------------- 1. Probability tools ----------------
const LF = [0]; for (let i = 1; i <= 2000; i++) LF[i] = LF[i - 1] + Math.log(i);              // ln(n!) table
const binomPMF = (n, p, k) => k < 0 || k > n ? 0 : p <= 0 ? (k === 0 ? 1 : 0) : p >= 1 ? (k === n ? 1 : 0) : Math.exp(LF[n] - LF[k] - LF[n - k] + k * Math.log(p) + (n - k) * Math.log(1 - p));
const binomCDF = (n, p, k) => { let s = 0; for (let i = 0; i <= Math.min(k, n); i++) s += binomPMF(n, p, i); return Math.min(1, s); };   // P(X ≤ k)
const binomUpper = (n, p, k) => k <= 0 ? 1 : 1 - binomCDF(n, p, k - 1);                                                           // P(X ≥ k)
const erf = x => { const s = Math.sign(x), a = Math.abs(x), t = 1 / (1 + 0.3275911 * a); return s * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a)); };
const Phi = z => 0.5 * (1 + erf(z / Math.SQRT2));                                         // standard normal cumulative probability
function invPhi(p) { let lo = -9, hi = 9; for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; Phi(m) < p ? lo = m : hi = m; } return (lo + hi) / 2; }   // inverse normal by halving the interval
const phi = z => Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);

// ---------------- 2. The test itself ----------------
/* Critical region for X ~ B(n, p0), the Edexcel way: the most extreme values whose total probability is AT MOST α
   (α/2 in each tail for a two-tailed test). Returns lo (reject if X ≤ lo; −1 means no lower region) and hi (reject if X ≥ hi; n+1 means none). */
function binomCR(n, p0, alpha, tail) {
  let lo = -1, hi = n + 1; const a = tail === "two" ? alpha / 2 : alpha;
  if (tail !== "upper") while (lo + 1 <= n && binomCDF(n, p0, lo + 1) <= a) lo++;
  if (tail !== "lower") while (hi - 1 >= 0 && binomUpper(n, p0, hi - 1) <= a) hi--;
  const size = (lo >= 0 ? binomCDF(n, p0, lo) : 0) + (hi <= n ? binomUpper(n, p0, hi) : 0);   // the ACTUAL significance level
  return { lo, hi, size };
}
// Critical values for the sample mean x̄ ~ N(μ0, σ²/n)
function normCR(mu0, sigma, n, alpha, tail) {
  const se = sigma / Math.sqrt(n), z = invPhi(1 - (tail === "two" ? alpha / 2 : alpha));
  return { lo: tail === "upper" ? -Infinity : mu0 - z * se, hi: tail === "lower" ? Infinity : mu0 + z * se, z, se, size: alpha };
}
// P(reject H0) when the true value is v: equals the significance level if v is the H0 value, and the POWER otherwise
function pReject(P, v) {
  if (P.test === "binom") { const c = binomCR(P.n, P.p0, P.alpha, P.tail); return (c.lo >= 0 ? binomCDF(P.n, v, c.lo) : 0) + (c.hi <= P.n ? binomUpper(P.n, v, c.hi) : 0); }
  const c = normCR(P.mu0, P.sigma, P.n, P.alpha, P.tail), se = c.se; return (isFinite(c.lo) ? Phi((c.lo - v) / se) : 0) + (isFinite(c.hi) ? 1 - Phi((c.hi - v) / se) : 0);
}
// Draw one sample and test it. Returns the data, the statistic, the p-value (tail probability) and the decision.
function runTest(P, r) {
  if (P.test === "binom") {
    const d = []; let x = 0; for (let i = 0; i < P.n; i++) { const s = r() < P.ptrue; d.push(s); if (s) x++; }
    const c = binomCR(P.n, P.p0, P.alpha, P.tail), reject = x <= c.lo || x >= c.hi;
    // tail probability in the direction of H1 (for a two-tailed test, the tail the result lies in, compared with α/2)
    const lower = binomCDF(P.n, P.p0, x), upper = binomUpper(P.n, P.p0, x);
    const pv = P.tail === "lower" ? lower : P.tail === "upper" ? upper : Math.min(lower, upper);
    return { d, stat: x, pv, reject, cmp: P.tail === "two" ? P.alpha / 2 : P.alpha };
  }
  const d = []; let s = 0; for (let i = 0; i < P.n; i++) { const v = P.mutrue + P.sigma * r.gauss(); d.push(v); s += v; }
  const xb = s / P.n, c = normCR(P.mu0, P.sigma, P.n, P.alpha, P.tail), z = (xb - P.mu0) / c.se, reject = xb < c.lo || xb > c.hi;
  const pv = P.tail === "lower" ? Phi(z) : P.tail === "upper" ? 1 - Phi(z) : Math.min(Phi(z), 1 - Phi(z));
  return { d, stat: xb, z, pv, reject, cmp: P.tail === "two" ? P.alpha / 2 : P.alpha };
}
const crText = (P) => {
  if (P.test === "binom") { const c = binomCR(P.n, P.p0, P.alpha, P.tail), a = []; if (c.lo >= 0) a.push(`X ≤ ${c.lo}`); if (c.hi <= P.n) a.push(`X ≥ ${c.hi}`); return a.length ? a.join(" or ") : "none: no result is extreme enough"; }
  const c = normCR(P.mu0, P.sigma, P.n, P.alpha, P.tail), a = []; if (isFinite(c.lo)) a.push(`x̄ < ${c.lo.toFixed(2)}`); if (isFinite(c.hi)) a.push(`x̄ > ${c.hi.toFixed(2)}`); return a.join(" or ");
};
const h1Sym = t => t === "lower" ? "<" : t === "upper" ? ">" : "≠";

// ---------------- 3. Stories (each just sets sensible numbers) ----------------
const STORIES = {
  spinner: { name: "Spinner", test: "binom", p0: 0.25, tail: "upper", n: 20, ptrue: 0.25, ctx: "A four-colour spinner should land on red 1 time in 4. Ali thinks it lands on red more often.", what: "lands on red" },
  seeds: { name: "Seeds", test: "binom", p0: 0.8, tail: "lower", n: 25, ptrue: 0.8, ctx: "A seed company claims 80% of its seeds germinate. A gardener thinks the true rate is lower.", what: "germinates" },
  coin: { name: "Coin", test: "binom", p0: 0.5, tail: "two", n: 30, ptrue: 0.5, ctx: "Is this coin fair? Any bias, heads or tails, would matter.", what: "lands heads" },
  flour: { name: "Flour bags (A level)", test: "norm", mu0: 500, sigma: 6, tail: "lower", n: 10, mutrue: 500, ctx: "Bags of flour are filled with mass ~ N(500, 6²) grams. A trading standards officer suspects the machine now under-fills.", what: "mass (g)" },
  reaction: { name: "Reaction times (A level)", test: "norm", mu0: 250, sigma: 30, tail: "two", n: 16, mutrue: 250, ctx: "Reaction times (ms) are N(250, 30²). Does a sports drink change the mean reaction time?", what: "time (ms)" },
};
const DEF = { story: "spinner", test: "binom", p0: 0.25, tail: "upper", alpha: 0.05, n: 20, ptrue: 0.25, mu0: 500, sigma: 6, mutrue: 500, speed: "slow", showTrue: false, showH1: false };
const P = Object.assign({}, DEF);
let rand = K.rng(Date.now() % 1e6), cur = null, anim = 0, tally = { n: 0, rej: 0, t1: 0, t2: 0, hist: [] }, acc = 0;

// ---------------- 4. The page ----------------
const ui = K.app({
  title: "Hypothesis Testing", subject: "Mathematics",
  blurb: "Binomial and normal tests: critical regions, p-values, significance, Type I and II errors and power, with real random samples",
  reset: () => set(P.story),
  levels: { std: "AS (8MA0)", adv: "A level (9MA0)", specs: {
    std: "Pearson Edexcel AS Mathematics (8MA0) Statistics 5.1–5.2: the language of hypothesis testing (H0, H1, significance level, test statistic, one- and two-tailed tests, critical value and region, acceptance region, p-value) and the binomial test for a proportion.",
    adv: "Pearson Edexcel A level Mathematics (9MA0) Paper 3 Statistics 5.1–5.3: binomial tests, plus the test for the mean of a normal distribution with known variance (x̄ ~ N(μ, σ²/n)). Type I / II errors and power go beyond 9MA0 (Further Statistics 1) and are marked as such." } },
  missions: [
    { title: "Is the spinner biased?", q: "H0: p = 0.25, H1: p > 0.25, 20 spins, 5% level. Press ▶ and watch samples. Where is the critical region? How often is H0 rejected when the spinner is fair?", hint: "The critical region is X ≥ 9 (P(X ≥ 9) = 0.041 ≤ 0.05 but P(X ≥ 8) = 0.102). With a fair spinner H0 is wrongly rejected about 4% of the time: the ACTUAL significance level, not quite 5%, because X can only be a whole number.", setup: () => set("spinner") },
    { title: "A spinner that really is biased", q: "Make the true p = 0.4 (show the truth). The test should reject H0. Does it always?", hint: "Only about 40% of samples land in the critical region. The other 60% are Type II errors: the bias is real, but 20 spins is not enough to show it. Try n = 80.", setup: () => { set("spinner"); setP({ ptrue: 0.4, showTrue: true, speed: "fast" }); } },
    { title: "Fewer seeds germinate?", q: "H0: p = 0.8, H1: p < 0.8 with 25 seeds. The gardener gets 16 germinating. Work out the p-value. Is it significant at 5%?", hint: "P(X ≤ 16 | p = 0.8) = 0.0468 < 0.05, so reject H0: there is evidence that fewer than 80% germinate. At the 1% level it would not be significant: the conclusion depends on α, which must be chosen BEFORE looking at the data.", setup: () => { set("seeds"); setP({ speed: "slow" }); ui.setPlaying(false); forceSample(16); } },
    { title: "Two tails: is the coin fair?", q: "For a two-tailed test at 5%, why is each tail only 2.5%? Find the critical region for 30 throws.", hint: "Either kind of bias counts as evidence, so the 5% is shared between the two tails. For B(30, 0.5) the critical region is X ≤ 9 or X ≥ 21, with actual significance level 2 × 0.0214 = 0.043.", setup: () => set("coin") },
    { title: "The significance level", q: "Change α from 10% to 1%. What happens to the critical region and to how often a true H0 is rejected?", hint: "A smaller α shrinks the critical region, so fewer true H0s are rejected (fewer Type I errors), but more real effects are missed (more Type II errors). You cannot reduce both without a bigger sample.", setup: () => { set("spinner"); setP({ alpha: 0.1, speed: "fast" }); } },
    { title: "Bigger samples, sharper tests", q: "True p = 0.35, H0: p = 0.25. Compare n = 20, 50 and 150. How does the power change?", hint: "With more data the H0 distribution narrows (SD √(np(1−p)) grows more slowly than n), so the critical region starts closer to np0 in proportion and a real difference is spotted far more often. The power curve below gets steeper.", setup: () => { set("spinner"); setP({ ptrue: 0.35, showTrue: true, showH1: true, speed: "fast", n: 50 }); } },
    { lvl: "adv", title: "Under-filled flour bags", q: "x̄ ~ N(500, 6²/10) if H0 is true. Ten bags average 496.2 g. Find z and the p-value. Is there evidence at 5% that the bags are under-filled?", hint: "z = (496.2 − 500) ÷ (6/√10) = −2.00, P(Z ≤ −2.00) = 0.0227 < 0.05: reject H0. The critical value is 500 − 1.645 × 6/√10 = 496.88 g.", setup: () => { set("flour"); ui.setPlaying(false); forceSample(496.2); } },
    { lvl: "adv", title: "Power of the normal test", q: "The machine really fills to 497 g. Show the H1 curve. How often does a sample of 10 detect it? What n gives 80% power?", hint: "Power = P(x̄ < 496.88 | μ = 497) ≈ 48% with n = 10. You need about n = 25 for 80%: power grows as the two curves separate, which needs σ/√n small compared with the shift.", setup: () => { set("flour"); setP({ mutrue: 497, showTrue: true, showH1: true, speed: "fast" }); } },
    { lvl: "adv", title: "Two-tailed z test", q: "Reaction times: H0: μ = 250, H1: μ ≠ 250, n = 16. What are the critical values? Why is a one-tailed test not appropriate here?", hint: "250 ± 1.96 × 30/4 = 235.3 and 264.7 ms. The drink might speed people up or slow them down, and the direction was not predicted in advance, so both tails are needed.", setup: () => set("reaction") },
  ],
  batch: [
    { title: "How often is a true H0 rejected?", question: "With a fair spinner (p = 0.25, n = 20, 5% one-tailed), what percentage of tests wrongly reject H0?", how: "Each run does 200 tests on a fair spinner and records the percentage rejected (Type I errors).", yLabel: "% of tests rejecting H0", reps: 60, bins: 16, theory: 100 * binomCR(20, 0.25, 0.05, "upper").size, theoryLabel: "actual significance level", run: (x, r) => { const Q = Object.assign({}, DEF); let k = 0; for (let i = 0; i < 200; i++) if (runTest(Q, r).reject) k++; return k / 2; }, note: "About 4.1%, not 5%: the critical region X ≥ 9 has probability 0.041 because X is discrete. Each run is only 200 tests, so it scatters by about ±1.4 percentage points." },
    { title: "Power curve: how big a bias can 20 spins detect?", question: "How does the chance of rejecting H0: p = 0.25 depend on the spinner's true p?", how: "n = 20, H1: p > 0.25 at 5%. Each point: 100 tests at that true p.", xLabel: "true p", yLabel: "% rejecting H0", xs: [0.15, 0.25, 0.3, 0.35, 0.4, 0.5, 0.6, 0.7], reps: 6, yMin: 0, yMax: 100, theory: v => 100 * pReject(Object.assign({}, DEF), v), theoryLabel: "P(X ≥ 9 | p)", run: (v, r) => { const Q = Object.assign({}, DEF, { ptrue: v }); let k = 0; for (let i = 0; i < 100; i++) if (runTest(Q, r).reject) k++; return k; }, note: "At p = 0.25 the curve is the significance level; beyond it the curve is the power. Below 0.25 the test almost never rejects, which is right: it is one-tailed." },
    { title: "Does a bigger sample help?", question: "If the true p is 0.35, how does the power of the test of H0: p = 0.25 grow with the number of spins?", how: "H1: p > 0.25 at 5%; each point is 100 tests.", xLabel: "number of spins n", yLabel: "% rejecting H0 (power)", xs: [10, 20, 40, 60, 100, 150], reps: 5, yMin: 0, yMax: 100, theory: n => 100 * pReject(Object.assign({}, DEF, { n }), 0.35), theoryLabel: "exact binomial power", run: (n, r) => { const Q = Object.assign({}, DEF, { n, ptrue: 0.35 }); let k = 0; for (let i = 0; i < 100; i++) if (runTest(Q, r).reject) k++; return k; }, note: "The theory line wiggles because the actual significance level jumps about as n changes (discrete X). Roughly 4 times the data are needed to halve the size of effect you can detect." },
    { title: "p-values when H0 is true (A level)", question: "If H0 is true, what do the p-values of the normal test look like?", how: "Flour bags, true mean 500 g = μ0, n = 10, one-tailed. Each run is one test; the p-value is recorded.", yLabel: "p-value", reps: 600, bins: 20, lo: 0, hi: 1, theory: 0.5, theoryLabel: "mean of a uniform", run: (x, r) => runTest(Object.assign({}, DEF, STORIES.flour, { alpha: 0.05 }), r).pv, note: "Flat (uniform) from 0 to 1: every p-value is equally likely, so exactly 5% fall below 0.05. That is what the significance level means. A small p-value alone is not proof." },
    { title: "Power of the z test (A level)", question: "With a true mean of 497 g, how does the chance of detecting under-filling grow with the number of bags?", how: "H0: μ = 500, H1: μ < 500, σ = 6, 5%. Each point: 100 tests.", xLabel: "bags in the sample n", yLabel: "% rejecting H0 (power)", xs: [5, 10, 15, 20, 30, 40, 60], reps: 5, yMin: 0, yMax: 100, theory: n => 100 * pReject(Object.assign({}, DEF, STORIES.flour, { n }), 497), theoryLabel: "Φ(−1.645 + 3√n/6)", run: (n, r) => { const Q = Object.assign({}, DEF, STORIES.flour, { n, mutrue: 497 }); let k = 0; for (let i = 0; i < 100; i++) if (runTest(Q, r).reject) k++; return k; }, note: "Power = Φ(shift ÷ (σ/√n) − 1.645). It reaches 80% at about n = 25. Each point is only 100 tests, so it scatters by up to ±5 percentage points." },
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "5.1", text: "H0 states the value of the parameter (p = 0.25). H1 says how it differs: p > 0.25 or p < 0.25 (one-tailed) or p ≠ 0.25 (two-tailed). Both are about the POPULATION parameter, never the sample." },
      { lvl: "std", tag: "5.1", text: "The test statistic is the number of successes X ~ B(n, p0) if H0 is true. The critical region holds the extreme values with total probability ≤ α; the critical value is its first value. The actual significance level is P(X in the critical region | H0), usually a little below α." },
      { lvl: "std", tag: "5.1", text: "The p-value is P(a result at least as extreme as the one observed | H0). If p-value ≤ α (or α/2 in each tail for a two-tailed test) the result is significant: reject H0." },
      { lvl: "std", tag: "5.2", text: "Write the conclusion in context and without certainty: 'there is evidence at the 5% level that the spinner lands on red more than 25% of the time'. Not rejecting H0 does not prove H0." },
      { lvl: "std", tag: "5.2", text: "The significance level is the probability of incorrectly rejecting H0 when it is true." },
      { lvl: "adv", tag: "5.3", text: "If X ~ N(μ, σ²) then X̄ ~ N(μ, σ²/n). Test statistic z = (x̄ − μ0) ÷ (σ/√n); compare with ±1.6449 (5% one tail), ±1.9600 (5% two tails), ±2.3263 (1% one tail)." },
      { lvl: "adv", tag: "beyond", text: "Type I error: reject a true H0 (probability = actual significance level). Type II error: fail to reject a false H0. Power = 1 − P(Type II) rises with n and with the size of the real effect (Further Statistics 1)." },
    ],
    questions: [
      { lvl: "std", marks: 4, q: () => `X ~ B(${P.test === "binom" ? P.n : 20}, ${P.test === "binom" ? P.p0 : 0.25}). Test H0: p = ${P.test === "binom" ? P.p0 : 0.25} against H1: p ${h1Sym(P.test === "binom" ? P.tail : "upper")} ${P.test === "binom" ? P.p0 : 0.25} at the ${100 * P.alpha}% level. Find the critical region and the actual significance level.`,
        ans: () => { const Q = P.test === "binom" ? P : Object.assign({}, DEF, { alpha: P.alpha }); return `<ul><li>use B(${Q.n}, ${Q.p0}) tables, ${Q.tail === "two" ? "α/2 = " + Q.alpha / 2 + " in each tail" : "α = " + Q.alpha + " in one tail"}</li><li>critical region: ${crText(Q)}</li><li>actual significance level = ${binomCR(Q.n, Q.p0, Q.alpha, Q.tail).size.toFixed(4)}</li></ul>`; } },
      { lvl: "std", marks: 5, q: "A seed company claims 80% of its seeds germinate. Of 25 seeds sown, 16 germinate. Test, at the 5% level, whether the claim is too high.", ans: "<ul><li>H0: p = 0.8, H1: p < 0.8</li><li>X ~ B(25, 0.8) under H0</li><li>P(X ≤ 16) = 0.0468</li><li>0.0468 < 0.05, so significant: reject H0</li><li>there is evidence that fewer than 80% of the seeds germinate</li></ul>" },
      { lvl: "std", marks: 2, q: "Explain why, for a binomial test, the actual significance level is usually less than the stated significance level.", ans: "<ul><li>X can only take whole-number values, so the probability of the critical region jumps in steps</li><li>the critical region is the largest with probability ≤ α, which is usually below α</li></ul>" },
      { lvl: "adv", marks: 5, q: "The masses of bags of flour are N(μ, 6²). A sample of 10 bags has mean 496.2 g. Test at the 5% level whether μ < 500.", ans: "<ul><li>H0: μ = 500, H1: μ < 500</li><li>X̄ ~ N(500, 6²/10) under H0</li><li>z = (496.2 − 500) ÷ (6/√10) = −2.00</li><li>P(Z ≤ −2.00) = 0.0227 < 0.05 (or −2.00 < −1.6449)</li><li>reject H0: evidence that the bags are under-filled on average</li></ul>" },
      { lvl: "adv", marks: 3, q: () => P.test === "norm" ? `For H0: μ = ${P.mu0}, H1: μ ${h1Sym(P.tail)} ${P.mu0}, σ = ${P.sigma}, n = ${P.n} at ${100 * P.alpha}%, find the critical region for x̄.` : "For H0: μ = 500, H1: μ < 500, σ = 6, n = 10 at 5%, find the critical region for x̄.",
        ans: () => { const Q = P.test === "norm" ? P : Object.assign({}, DEF, STORIES.flour); const c = normCR(Q.mu0, Q.sigma, Q.n, Q.alpha, Q.tail); return `<ul><li>standard error σ/√n = ${c.se.toFixed(3)}</li><li>z = ${c.z.toFixed(4)}</li><li>critical region: ${crText(Q)}</li></ul>`; } },
      { lvl: "adv", marks: 2, q: "State what is meant by a Type II error in the context of the flour bags.", ans: "<ul><li>concluding there is no evidence that the bags are under-filled</li><li>when in fact the mean mass is less than 500 g</li></ul>" },
    ]
  },
  notes: `<h3>What the simulation does</h3><ul><li><b>Binomial test:</b> each of n trials is a success with the TRUE probability (hidden unless you show it). X counts the successes and is compared with B(n, p0), the distribution H0 predicts.</li>
<li>The critical region follows Edexcel: the most extreme values with total probability at most α (α/2 per tail if two-tailed). The tail probability shown is P(X ≥ x) or P(X ≤ x) under H0.</li>
<li><b>Normal test (A level):</b> n values from N(true μ, σ²); x̄ is compared with N(μ0, σ²/n). Critical values come from the inverse normal.</li>
<li>▶ keeps taking new samples and tallies how often H0 is rejected. If the truth equals H0, every rejection is a Type I error; otherwise every non-rejection is a Type II error.</li>
<li>The power curve (below) is the exact probability of rejecting H0 for each possible true value.</li></ul>
<h3>Assumptions and simplifications</h3><ul><li>Trials are independent with a fixed probability (binomial conditions). Real seeds in one tray, or one person's repeated reaction times, may not be independent.</li>
<li>For the normal test σ is known exactly and the population really is normal; in practice σ is estimated, which needs a t-test (not in 9MA0).</li>
<li>The sample is random. No test can fix a biased sample.</li>
<li>The random numbers come from a seeded pseudo-random generator.</li></ul>`,
});

// ---------------- 5. Controls ----------------
const C = {};
let g = ui.group("The claim");
C.story = K.seg(g, { value: "spinner", options: Object.entries(STORIES).map(([k, v]) => [k, v.name]), on: v => set(v) });
const ctxNote = K.note(g, "");
C.p0 = K.slider(g, { label: "H₀: p =", min: 0.05, max: 0.95, step: 0.05, value: 0.25, fmt: v => v.toFixed(2), on: v => setP({ p0: v }) });
C.mu0 = K.slider(g, { label: "H₀: μ =", min: 0, max: 1000, step: 1, value: 500, on: v => setP({ mu0: v }) });
C.tail = K.seg(g, { label: "Alternative hypothesis H₁", value: "upper", options: [["lower", "less than (<)"], ["upper", "more than (>)"], ["two", "different (≠)"]], on: v => setP({ tail: v }) });
C.alpha = K.seg(g, { label: "Significance level α", value: 0.05, options: [[0.01, "1%"], [0.025, "2.5%"], [0.05, "5%"], [0.1, "10%"]], on: v => setP({ alpha: v }) });
g = ui.group("The sample");
C.n = K.slider(g, { label: "Sample size n", min: 5, max: 200, step: 1, value: 20, on: v => setP({ n: v }) });
C.sigma = K.slider(g, { label: "Population SD σ (known)", min: 1, max: 60, step: 1, value: 6, on: v => setP({ sigma: v }) });
C.speed = K.seg(g, { label: "Speed", value: "slow", options: [["slow", "one at a time"], ["fast", "fast"], ["turbo", "turbo"]], on: v => P.speed = v });
ui.headerSpeed(C.speed);   // playback speed lives in the header, beside Pause and Reset
let rw = K.row(g); K.btn(rw, "Take one sample", () => { ui.setPlaying(false); newSample(true); }, "primary"); K.btn(rw, "Clear tally", () => clearTally(), "danger");
g = ui.group("The truth (normally unknown)");
C.ptrue = K.slider(g, { label: "True p", min: 0, max: 1, step: 0.01, value: 0.25, fmt: v => v.toFixed(2), on: v => setP({ ptrue: v }) });
C.mutrue = K.slider(g, { label: "True μ", min: 0, max: 1000, step: 0.5, value: 500, on: v => setP({ mutrue: v }) });
C.showTrue = K.toggle(g, { label: "Show the true value", value: false, on: v => P.showTrue = v });
C.showH1 = K.toggle(g, { label: "Overlay the true distribution (power)", value: false, on: v => P.showH1 = v });
const read = K.readout(ui.group("This sample"), [["x", "Test statistic"], ["pv", "Tail probability"], ["cr", "Critical region"], ["sz", "Actual significance level"], ["dec", "Decision"]]);
const read2 = K.readout(ui.group("All samples so far"), [["k", "Tests done"], ["rej", "H₀ rejected"], ["th", "Theory P(reject H₀)"], ["err", "Errors"]]);

function showControls() {
  const b = P.test === "binom";
  C.p0.el.style.display = C.ptrue.el.style.display = b ? "" : "none";
  C.mu0.el.style.display = C.mutrue.el.style.display = C.sigma.el.style.display = b ? "none" : "";
}
function syncControls() {
  for (const k of ["p0", "mu0", "n", "sigma", "ptrue", "mutrue"]) C[k].set(P[k]);
  for (const k of ["tail", "alpha", "speed", "showTrue", "showH1", "story"]) C[k].set(P[k]);
  ctxNote.innerHTML = STORIES[P.story].ctx; showControls();
}
function set(story) {
  const S = STORIES[story]; Object.assign(P, DEF, { story }, S);
  if (S.test === "norm" && ui.level !== "adv" && ui.setLevel) ui.setLevel("adv");
  // range of the μ sliders follows the story
  const span = Math.max(4 * P.sigma, 10); for (const k of ["mu0", "mutrue"]) { const inp = C[k].el.querySelector("input"); inp.min = Math.round(P.mu0 - span); inp.max = Math.round(P.mu0 + span); }
  syncControls(); clearTally(); newSample(true);
}
function setP(o) { Object.assign(P, o); syncControls(); clearTally(); newSample(true); }
function clearTally() { tally = { n: 0, rej: 0, t1: 0, t2: 0, hist: [] }; }
const truth = () => P.test === "binom" ? P.ptrue : P.mutrue, h0val = () => P.test === "binom" ? P.p0 : P.mu0;
const isH0True = () => Math.abs(truth() - h0val()) < 1e-9;
function newSample(animate) {
  cur = runTest(P, rand); anim = animate && P.speed === "slow" ? 0 : 1;
  tally.n++; if (cur.reject) tally.rej++; if (isH0True() && cur.reject) tally.t1++; if (!isH0True() && !cur.reject) tally.t2++;
  tally.hist.push([tally.n, 100 * tally.rej / tally.n]); if (tally.hist.length > 4000) tally.hist = tally.hist.filter((_, i) => i % 2 === 0);
}
// set up a sample with a chosen result (for the worked-example investigations)
function forceSample(v) {
  if (P.test === "binom") { const d = []; for (let i = 0; i < P.n; i++) d.push(i < v); for (let i = d.length - 1; i > 0; i--) { const j = rand.int(i + 1); [d[i], d[j]] = [d[j], d[i]]; } cur = Object.assign(runTest(P, rand), { d, stat: v }); const lo = binomCDF(P.n, P.p0, v), up = binomUpper(P.n, P.p0, v), c = binomCR(P.n, P.p0, P.alpha, P.tail); cur.pv = P.tail === "lower" ? lo : P.tail === "upper" ? up : Math.min(lo, up); cur.reject = v <= c.lo || v >= c.hi; }
  else { const se = P.sigma / Math.sqrt(P.n), d = []; let s = 0; for (let i = 0; i < P.n; i++) { const x = v + P.sigma * rand.gauss(); d.push(x); s += x; } const sh = v - s / P.n; for (let i = 0; i < P.n; i++) d[i] += sh; const z = (v - P.mu0) / se, c = normCR(P.mu0, P.sigma, P.n, P.alpha, P.tail); cur = { d, stat: v, z, pv: P.tail === "lower" ? Phi(z) : P.tail === "upper" ? 1 - Phi(z) : Math.min(Phi(z), 1 - Phi(z)), reject: v < c.lo || v > c.hi, cmp: P.tail === "two" ? P.alpha / 2 : P.alpha }; }
  anim = 1; clearTally();
}

// ---------------- 6. Running and drawing ----------------
const cv = ui.canvas();
const chR = K.chart(ui.dock, { title: "Percentage of tests rejecting H₀ so far", xLabel: "number of tests", yLabel: "% rejected", yMin: 0 });
const chP = K.chart(ui.dock, { title: "Power curve: P(reject H₀) for each true value", yLabel: "P(reject H₀)", yMin: 0, yMax: 1 });
function tick(dt) {
  if (P.speed === "slow") { anim = Math.min(1, anim + dt / 1.6); if (anim >= 1) { acc += dt; if (acc > 1.2) { acc = 0; newSample(true); } } }
  else { acc += dt * (P.speed === "fast" ? 8 : 250); while (acc >= 1) { acc--; newSample(false); } }
}
const TX = (c, s, x, y, col = "#c9d4ea", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,system-ui,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1222"; c.fillRect(0, 0, w, h);
  if (!cur) return;
  const x0 = 60, x1 = w - 30, topH = Math.min(150, h * 0.3), s0 = 40 + topH + 50, s1 = h - 46;
  const S = STORIES[P.story];
  TX(c, `① THE SAMPLE: n = ${P.n}, each one ${S.what}`, x0, 24, "#7ee787", "left", "600 12px");
  const shown = Math.max(0, Math.min(cur.d.length, Math.floor(anim * cur.d.length * 1.15)));
  if (P.test === "binom") {
    // a grid of tiles, one per trial: green = success
    const cols = Math.min(P.n, Math.max(10, Math.ceil(Math.sqrt(P.n * (x1 - x0) / topH)))), rows = Math.ceil(P.n / cols), sz = Math.min((x1 - x0) / cols, topH / rows) - 3;
    let k = 0; for (let i = 0; i < shown; i++) if (cur.d[i]) k++;
    for (let i = 0; i < P.n; i++) { const cx = x0 + (i % cols) * (sz + 3), cy = 36 + Math.floor(i / cols) * (sz + 3); c.fillStyle = i < shown ? (cur.d[i] ? "#3fcf6e" : "#3a4560") : "#151e33"; c.fillRect(cx, cy, sz, sz); }
    TX(c, `X = ${k}${shown < P.n ? " …" : ""}`, x1, 24, "#fff", "right", "600 14px");
  } else {
    // a dot plot of the n values, with x̄ and μ0
    const lo = P.mu0 - 4 * P.sigma, hi = P.mu0 + 4 * P.sigma, X = v => x0 + (v - lo) / (hi - lo) * (x1 - x0), base = 36 + topH - 18, cnt = {};
    c.strokeStyle = "#3a4a6e"; c.beginPath(); c.moveTo(x0, base + 6); c.lineTo(x1, base + 6); c.stroke();
    for (let t = Math.ceil(lo / P.sigma) * P.sigma; t <= hi; t += P.sigma) TX(c, (+t.toFixed(1)).toString(), X(t), base + 20, "#8fa0bf", "center", "11px");
    for (let i = 0; i < shown; i++) { const b = Math.round(X(cur.d[i]) / 7); cnt[b] = (cnt[b] || 0) + 1; c.fillStyle = "#7ee787"; c.beginPath(); c.arc(b * 7, base - (cnt[b] - 1) * 7, 3, 0, 6.3); c.fill(); }
    if (shown >= P.n) { c.strokeStyle = "#fff"; c.lineWidth = 2; c.beginPath(); c.moveTo(X(cur.stat), 34); c.lineTo(X(cur.stat), base + 6); c.stroke(); c.lineWidth = 1; TX(c, `x̄ = ${cur.stat.toFixed(2)}`, X(cur.stat) + 6, 44, "#fff", "left", "600 12px"); }
    c.setLineDash([4, 4]); c.strokeStyle = "#ffb454"; c.beginPath(); c.moveTo(X(P.mu0), 34); c.lineTo(X(P.mu0), base + 6); c.stroke(); c.setLineDash([]); TX(c, `μ₀ = ${P.mu0}`, X(P.mu0) - 6, 44, "#ffb454", "right");
  }
  // ② the distribution of the test statistic IF H0 IS TRUE
  const done = anim >= 1;
  TX(c, P.test === "binom" ? `② IF H₀ IS TRUE: X ~ B(${P.n}, ${P.p0})  ·  red = critical region (${crText(P)})` : `② IF H₀ IS TRUE: X̄ ~ N(${P.mu0}, ${P.sigma}²/${P.n})  ·  red = critical region (${crText(P)})`, x0, s0 - 18, "#5ad1ff", "left", "600 12px");
  c.strokeStyle = "#3a4a6e"; c.beginPath(); c.moveTo(x0, s1 + .5); c.lineTo(x1, s1 + .5); c.stroke();
  if (P.test === "binom") {
    const sdv = Math.sqrt(P.n * Math.max(P.p0 * (1 - P.p0), P.ptrue * (1 - P.ptrue), 0.02));
    let a = Math.max(0, Math.floor(Math.min(P.n * P.p0, P.showH1 ? P.n * P.ptrue : 1e9) - 4.5 * sdv)), b = Math.min(P.n, Math.ceil(Math.max(P.n * P.p0, P.showH1 ? P.n * P.ptrue : -1) + 4.5 * sdv));
    if (cur) { a = Math.min(a, cur.stat); b = Math.max(b, cur.stat); } if (b - a < 10) { a = Math.max(0, a - 5); b = Math.min(P.n, b + 5); }
    const bw = (x1 - x0) / (b - a + 1), cr = binomCR(P.n, P.p0, P.alpha, P.tail); let pm = 0;
    for (let k = a; k <= b; k++) pm = Math.max(pm, binomPMF(P.n, P.p0, k), P.showH1 ? binomPMF(P.n, P.ptrue, k) : 0);
    const Y = v => s1 - v / pm * (s1 - s0 - 10);
    for (let k = a; k <= b; k++) { const inCR = k <= cr.lo || k >= cr.hi, X = x0 + (k - a) * bw; c.fillStyle = inCR ? "#ff6b81" : "#3d7fbf"; c.fillRect(X + 1, Y(binomPMF(P.n, P.p0, k)), Math.max(1, bw - 2), s1 - Y(binomPMF(P.n, P.p0, k))); if (bw > 16 || k % Math.ceil(22 / bw) === 0) TX(c, k, X + bw / 2, s1 + 14, "#8fa0bf", "center", "11px"); }
    if (P.showH1) { c.strokeStyle = "#ffe66d"; c.lineWidth = 2; c.beginPath(); for (let k = a; k <= b; k++) { const X = x0 + (k - a) * bw, y = Y(binomPMF(P.n, P.ptrue, k)); k === a ? c.moveTo(X, y) : c.lineTo(X, y); c.lineTo(X + bw, y); } c.stroke(); c.lineWidth = 1; TX(c, `yellow: the TRUE distribution B(${P.n}, ${P.ptrue.toFixed(2)}): power = ${pReject(P, P.ptrue).toFixed(3)}`, x1, s0 + 2, "#ffe66d", "right"); }
    if (done) { const X = x0 + (cur.stat - a + .5) * bw; c.fillStyle = "#fff"; c.beginPath(); c.moveTo(X, s1 + 18); c.lineTo(X - 7, s1 + 30); c.lineTo(X + 7, s1 + 30); c.fill(); TX(c, `observed x = ${cur.stat}`, X + 10, s1 + 30, "#fff", "left", "600 11px"); }
    TX(c, `actual significance level = ${cr.size.toFixed(4)}`, x1, s0 + (P.showH1 ? 18 : 2), "#ff9aa9", "right");
  } else {
    const se = P.sigma / Math.sqrt(P.n), cr = normCR(P.mu0, P.sigma, P.n, P.alpha, P.tail), lo = Math.min(P.mu0, P.showH1 ? P.mutrue : P.mu0, cur.stat) - 4 * se, hi = Math.max(P.mu0, P.showH1 ? P.mutrue : P.mu0, cur.stat) + 4 * se;
    const X = v => x0 + (v - lo) / (hi - lo) * (x1 - x0), pk = phi(0) / se, Y = d => s1 - d / pk * (s1 - s0 - 10), dens = (v, m) => phi((v - m) / se) / se;
    for (let px = x0; px < x1; px++) { const v = lo + (px - x0) / (x1 - x0) * (hi - lo), inCR = v < cr.lo || v > cr.hi; c.fillStyle = inCR ? "rgba(255,107,129,.85)" : "rgba(61,127,191,.55)"; c.fillRect(px, Y(dens(v, P.mu0)), 1, s1 - Y(dens(v, P.mu0))); }
    if (P.showH1) { c.strokeStyle = "#ffe66d"; c.lineWidth = 2; c.beginPath(); for (let px = x0; px <= x1; px += 2) { const v = lo + (px - x0) / (x1 - x0) * (hi - lo); px === x0 ? c.moveTo(px, Y(dens(v, P.mutrue))) : c.lineTo(px, Y(dens(v, P.mutrue))); } c.stroke(); c.lineWidth = 1; TX(c, `yellow: the TRUE distribution N(${P.mutrue}, ${P.sigma}²/${P.n}): power = ${pReject(P, P.mutrue).toFixed(3)}`, x1, s0 + 2, "#ffe66d", "right"); }
    const step = +K.sig((hi - lo) / 8, 1); for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) TX(c, (+t.toFixed(2)).toString(), X(t), s1 + 14, "#8fa0bf", "center", "11px");
    for (const v of [cr.lo, cr.hi]) if (isFinite(v)) { c.strokeStyle = "#ff6b81"; c.setLineDash([4, 3]); c.beginPath(); c.moveTo(X(v), s0); c.lineTo(X(v), s1); c.stroke(); c.setLineDash([]); TX(c, v.toFixed(2), X(v), s0 - 4, "#ff9aa9", "center", "11px"); }
    if (done) { const xx = X(cur.stat); c.fillStyle = "#fff"; c.beginPath(); c.moveTo(xx, s1 + 18); c.lineTo(xx - 7, s1 + 30); c.lineTo(xx + 7, s1 + 30); c.fill(); TX(c, `observed x̄ = ${cur.stat.toFixed(2)}, z = ${cur.z.toFixed(2)}`, xx + 10, s1 + 30, "#fff", "left", "600 11px"); }
  }
  // the conclusion
  const tr = truth(), h0 = isH0True();
  let msg = !done ? "sampling…" : cur.reject ? `<b style="color:#ff8a9a">Significant: reject H₀</b>` : `<b style="color:#8fd0ff">Not significant: do not reject H₀</b>`;
  if (done && P.showTrue) msg += `<br>Truth: ${P.test === "binom" ? "p" : "μ"} = ${P.test === "binom" ? tr.toFixed(2) : tr} → ${h0 ? (cur.reject ? '<b style="color:#ffb454">Type I error</b>' : "correct") : (cur.reject ? "correct" : '<b style="color:#ffb454">Type II error</b>')}`;
  ui.hud(`H₀: ${P.test === "binom" ? "p = " + P.p0 : "μ = " + P.mu0} · H₁: ${P.test === "binom" ? "p" : "μ"} ${h1Sym(P.tail)} ${h0val()} · α = ${100 * P.alpha}%<br>${msg}`);
}
function panels() {
  if (!cur) return; const done = anim >= 1, cr = P.test === "binom" ? binomCR(P.n, P.p0, P.alpha, P.tail) : normCR(P.mu0, P.sigma, P.n, P.alpha, P.tail);
  read.set("x", done ? (P.test === "binom" ? "x = " + cur.stat : `x̄ = ${cur.stat.toFixed(2)} (z = ${cur.z.toFixed(2)})`) : "…");
  read.set("pv", done ? `${cur.pv < 1e-4 ? cur.pv.toExponential(2) : cur.pv.toFixed(4)} ${cur.pv <= cur.cmp ? "≤" : ">"} ${cur.cmp}` : "…");
  read.set("cr", crText(P)); read.set("sz", cr.size.toFixed(4)); read.set("dec", done ? (cur.reject ? "reject H₀" : "do not reject H₀") : "…");
  const th = pReject(P, truth());
  read2.set("k", tally.n.toLocaleString()); read2.set("rej", tally.n ? (100 * tally.rej / tally.n).toFixed(1) + "%" : "–");
  read2.set("th", P.showTrue ? `${(100 * th).toFixed(1)}% (${isH0True() ? "the significance level" : "the power"})` : "show the truth to see");
  read2.set("err", P.showTrue ? (isH0True() ? `${tally.t1} Type I` : `${tally.t2} Type II`) : "hidden");
  chR.draw([{ pts: tally.hist, color: K.cssVar("--s0"), label: "this run" }], { hlines: P.showTrue ? [{ y: 100 * th, color: K.cssVar("--s1"), label: "theory " + (100 * th).toFixed(1) + "%" }] : [], yMax: Math.max(10, Math.min(100, (tally.hist.length ? Math.max(...tally.hist.slice(-400).map(q => q[1])) : 10) * 1.2, P.showTrue ? 100 * th * 1.5 + 5 : 100)) });
  const pts = [], lo = P.test === "binom" ? 0 : P.mu0 - 4 * P.sigma / Math.sqrt(P.n) * 2, hi = P.test === "binom" ? 1 : P.mu0 + 4 * P.sigma / Math.sqrt(P.n) * 2;
  for (let i = 0; i <= 120; i++) { const v = lo + (hi - lo) * i / 120; pts.push([v, pReject(P, v)]); }
  const ser = [{ pts, color: K.cssVar("--s1"), label: "P(reject H₀)" }];
  if (P.showTrue && tally.n > 5) { const f = tally.rej / tally.n; ser.push({ pts: [[truth(), f, 1.96 * Math.sqrt(f * (1 - f) / tally.n)]], type: "err", color: K.cssVar("--s0"), r: 4, label: "your tests" }); }
  chP.opts.xLabel = P.test === "binom" ? "true p" : "true μ";
  chP.draw(ser, { vlines: [{ x: h0val(), color: K.cssVar("--muted"), label: "H₀" }].concat(P.showTrue ? [{ x: truth(), color: K.cssVar("--s2"), label: "truth", row: 1 }] : []), xMin: lo, xMax: hi });
}
let frame = 0;
ui.run(dt => tick(dt), () => { draw(); if (frame++ % 5 === 0) panels(); });
ui.onLevel = v => { if (v === "std" && P.test === "norm") set("spinner"); };
set("spinner");
ui.tip("Press ▶ (or Space) to keep sampling. Show the truth to count Type I and II errors.", 7000);
