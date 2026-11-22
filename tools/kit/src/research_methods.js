/* =====================================================================
   RESEARCH METHODS: CHOOSING AND USING INFERENTIAL TESTS
   A psychologist cannot test everyone, so they test a SAMPLE and ask:
   "could a difference (or correlation) this big have happened by chance
   if there were really no effect?" The NULL HYPOTHESIS says there is no
   effect. An inferential test turns the data into one number (the
   CALCULATED VALUE) and compares it with a CRITICAL VALUE from a table.
   If the result is unlikely enough under the null hypothesis
   (probability ≤ the significance level, usually p ≤ 0.05) we reject
   the null hypothesis and call the result SIGNIFICANT.

   CHOOSING A TEST (the AQA decision tree):
                     unrelated design     related design        correlation
     nominal data    chi-squared          sign test             chi-squared
     ordinal data    Mann-Whitney U       Wilcoxon T            Spearman's rho
     interval data   unrelated t-test     related t-test        Pearson's r
   (the bottom row are PARAMETRIC tests: they need interval data that is
   roughly normal with similar spread in each condition)

   Every study here is simulated: we KNOW whether there really is an
   effect, so we can see Type I errors (a significant result when there
   is no effect: a false positive) and Type II errors (no significant
   result when there IS an effect: a false negative).
   ===================================================================== */

// ---------------- 1. Maths helpers ----------------
const erf = x => { const s = Math.sign(x), a = Math.abs(x), t = 1 / (1 + 0.3275911 * a); return s * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a)); };
const Phi = z => 0.5 * (1 + erf(z / Math.SQRT2));                       // standard normal cumulative probability
const zCrit = a => { let lo = 0, hi = 10; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (1 - Phi(m) > a) lo = m; else hi = m; } return (lo + hi) / 2; };   // z with P(Z > z) = a
function lgamma(x) { const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7]; if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x); x -= 1; let a = c[0]; const t = x + g + 0.5; for (let i = 1; i < 9; i++) a += c[i] / (x + i); return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a); }
// regularised incomplete beta function (continued fraction, as in Numerical Recipes) → needed for the t distribution
function betacf(a, b, x) { let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap; if (Math.abs(d) < 1e-30) d = 1e-30; d = 1 / d; let h = d; for (let m = 1; m <= 200; m++) { const m2 = 2 * m; let aa = m * (b - m) * x / ((qam + m2) * (a + m2)); d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30; d = 1 / d; h *= d * c; aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2)); d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 3e-12) break; } return h; }
function ibeta(x, a, b) { if (x <= 0) return 0; if (x >= 1) return 1; const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x)); return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b; }
const tUpper = (t, df) => 0.5 * ibeta(df / (df + t * t), df / 2, 0.5);    // P(T > t) for t > 0
const tCrit = (a, df) => { let lo = 0, hi = 60; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (tUpper(m, df) > a) lo = m; else hi = m; } return (lo + hi) / 2; };
// approximate power: P(T > critical t − δ), where δ is the expected size of the test statistic when the effect is real
const tPower = (delta, df, a) => { const x = tCrit(a, df) - delta; return x >= 0 ? tUpper(x, df) : 1 - tUpper(-x, df); };
const tDens = (t, df) => Math.exp(lgamma((df + 1) / 2) - lgamma(df / 2) - 0.5 * Math.log(df * Math.PI) - (df + 1) / 2 * Math.log(1 + t * t / df));
// ranks with ties given the average of the ranks they share (e.g. two scores tied for 3rd and 4th both get 3.5)
function rank(v) { const idx = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]), r = new Array(v.length); for (let i = 0; i < idx.length;) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; const av = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[idx[k][1]] = av; i = j + 1; } return r; }
const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
const sdev = a => { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) * (x - m), 0) / (a.length - 1)); };

// ---------------- 2. Exact null distributions → critical values ----------------
// For the 'smaller value' tests (U, T, S) the calculated value must be EQUAL TO OR LESS THAN the critical value.
// The critical value is the largest value whose probability (of that or less) under the null hypothesis is ≤ α (one tail).
const cache = {};
function critFromCdf(pmf, a) { let c = 0, crit = -1; for (let u = 0; u < pmf.length; u++) { c += pmf[u]; if (c <= a + 1e-12) crit = u; else break; } return crit; }
// Mann-Whitney: P(U = u) for group sizes m and n, from the recursion p(m,n,u) = m/(m+n)·p(m−1,n,u−n) + n/(m+n)·p(m,n−1,u)
function mwPmf(m, n) { const key = "mw" + m + "," + n; if (cache[key]) return cache[key]; let prev = []; for (let i = 0; i <= m; i++) { const row = []; for (let j = 0; j <= n; j++) { const a = new Float64Array(i * j + 1); if (i === 0 || j === 0) a[0] = 1; else { const up = prev[j], left = row[j - 1]; for (let u = 0; u <= i * j; u++) a[u] = (i / (i + j)) * (u - j >= 0 && u - j < up.length ? up[u - j] : 0) + (j / (i + j)) * (u < left.length ? left[u] : 0); } row.push(a); } prev = row; } return cache[key] = prev[n]; }
// Wilcoxon: the sum of the ranks of the positive differences, when each rank is equally likely to be + or −
function wilPmf(n) { const key = "w" + n; if (cache[key]) return cache[key]; let p = new Float64Array(1); p[0] = 1; for (let k = 1; k <= n; k++) { const q = new Float64Array(p.length + k); for (let s = 0; s < p.length; s++) { q[s] += 0.5 * p[s]; q[s + k] += 0.5 * p[s]; } p = q; } return cache[key] = p; }
// sign test: the number of + signs is binomial(n, ½)
function binPmf(n) { const p = []; for (let k = 0; k <= n; k++) p.push(Math.exp(lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1) - n * Math.LN2)); return p; }
// Spearman: the null hypothesis says every pairing of the ranks is equally likely.
// Small N (≤ 12): count every pairing exactly (dynamic programming over which ranks have been used) → the distribution of Σd².
// Larger N: estimate it by shuffling the ranks 20 000 times.
function spearD2Pmf(n) {
  const key = "sd" + n; if (cache[key]) return cache[key]; const maxD = n * (n * n - 1) / 3, full = 1 << n; let cur = new Map([[0, new Float64Array(maxD + 1)]]); cur.get(0)[0] = 1;
  for (let i = 0; i < n; i++) { const nxt = new Map(); for (const [mask, arr] of cur) for (let j = 0; j < n; j++) if (!(mask & (1 << j))) { const m2 = mask | (1 << j), d = (i - j) * (i - j); let a = nxt.get(m2); if (!a) { a = new Float64Array(maxD + 1); nxt.set(m2, a); } for (let s = 0; s + d <= maxD; s++) if (arr[s]) a[s + d] += arr[s]; } cur = nxt; }
  const tot = cur.get(full - 1), f = tot.reduce((a, b) => a + b, 0); return cache[key] = tot.map(x => x / f);
}
function spearNull(n) { const key = "s" + n; if (cache[key]) return cache[key]; const r = K.rng(4242 + n), out = new Float64Array(20000), a = [...Array(n).keys()]; for (let k = 0; k < out.length; k++) { for (let i = n - 1; i > 0; i--) { const j = r.int(i + 1);[a[i], a[j]] = [a[j], a[i]]; } let d2 = 0; for (let i = 0; i < n; i++) d2 += (a[i] - i) * (a[i] - i); out[k] = 1 - 6 * d2 / (n * (n * n - 1)); } out.sort(); return cache[key] = out; }
// critical rho: the smallest rho with P(rho ≥ critical) ≤ α  (a large rho means a SMALL Σd²)
function spearCrit(n, a) {
  if (n <= 12) { const p = spearD2Pmf(n); let c = critFromCdf(p, a); while (c > 0 && p[c] === 0) c--;   // Σd² is always even, so step back to a value that can actually happen
    return c < 0 ? 1.0001 : 1 - 6 * c / (n * (n * n - 1)); }
  const v = spearNull(n), N = v.length; let i = N;   // walk down through the distinct values while the tail is still ≤ α
  while (i > 0) { let j = i - 1; const val = v[j]; while (j > 0 && v[j - 1] === val) j--; if ((N - j) / N <= a + 1e-12) i = j; else break; }
  return i < N ? v[i] : 1.0001;
}
// ---------------- 3. The tests ----------------
const TESTS = {
  chi: { name: "Chi-squared χ²", design: ["unrelated", "correlation"], level: "nominal", rule: "≥", para: false },
  sign: { name: "Sign test S", design: ["related"], level: "nominal", rule: "≤", para: false },
  mw: { name: "Mann-Whitney U", design: ["unrelated"], level: "ordinal", rule: "≤", para: false },
  wil: { name: "Wilcoxon T", design: ["related"], level: "ordinal", rule: "≤", para: false },
  spear: { name: "Spearman's rho", design: ["correlation"], level: "ordinal", rule: "≥", para: false },
  tu: { name: "Unrelated t-test", design: ["unrelated"], level: "interval", rule: "≥", para: true },
  tr: { name: "Related t-test", design: ["related"], level: "interval", rule: "≥", para: true },
  pear: { name: "Pearson's r", design: ["correlation"], level: "interval", rule: "≥", para: true },
};
const treeTest = (design, level) => Object.keys(TESTS).find(k => TESTS[k].level === level && TESTS[k].design.includes(design));

// ---------------- 4. Simulated participants ----------------
// unrelated: two separate groups (A = control, B = experimental, shifted up by d standard deviations)
// related: the same people do both conditions; 'sim' is how alike one person's two scores are (individual differences)
// correlation: two variables with true correlation r
const toInterval = z => Math.max(0, Math.round(15 + 4 * z));                 // e.g. words recalled out of 30
const toOrdinal = z => Math.max(1, Math.min(10, Math.round(5.5 + 1.7 * z))); // a rating from 1 to 10
function makeData(r, Q) {
  const n = Q.n, conv = Q.level === "interval" ? toInterval : toOrdinal, D = { design: Q.design, level: Q.level };
  if (Q.design === "unrelated") {
    const zA = [], zB = []; for (let i = 0; i < n; i++) { zA.push(r.gauss()); zB.push(r.gauss() + Q.d); }
    if (Q.level === "nominal") { D.table = [[zA.filter(z => z > 0.4).length, zA.filter(z => z <= 0.4).length], [zB.filter(z => z > 0.4).length, zB.filter(z => z <= 0.4).length]]; D.rows = ["condition A", "condition B"]; D.cols = ["passed", "failed"]; }
    else { D.A = zA.map(conv); D.B = zB.map(conv); }
  } else if (Q.design === "related") {
    const A = [], B = []; for (let i = 0; i < n; i++) { const p = r.gauss() * Math.sqrt(Q.sim), e = Math.sqrt(1 - Q.sim); A.push(p + e * r.gauss()); B.push(p + e * r.gauss() + Q.d); }
    D.A = A.map(Q.level === "interval" ? toInterval : toOrdinal); D.B = B.map(Q.level === "interval" ? toInterval : toOrdinal);   // nominal: we only keep the SIGN of B − A
  } else {
    const X = [], Y = []; for (let i = 0; i < n; i++) { const x = r.gauss(); X.push(x); Y.push(Q.r * x + Math.sqrt(1 - Q.r * Q.r) * r.gauss()); }
    if (Q.level === "nominal") { const t = [[0, 0], [0, 0]]; for (let i = 0; i < n; i++) t[X[i] > 0 ? 0 : 1][Y[i] > 0 ? 0 : 1]++; D.table = t; D.rows = ["high X", "low X"]; D.cols = ["high Y", "low Y"]; }
    else { D.X = X.map(conv); D.Y = Y.map(conv); }
  }
  return D;
}
// carry out test k on data D. Returns the calculated value, the critical value and whether it is significant
function runTest(k, D, Q) {
  const one = Q.tails === 1, aT = one ? Q.alpha : Q.alpha / 2, R = { k, steps: [] };
  if (k === "chi") {
    const t = D.table, rs = t.map(r => r[0] + r[1]), cs = [t[0][0] + t[1][0], t[0][1] + t[1][1]], N = rs[0] + rs[1]; let chi = 0; R.E = [[0, 0], [0, 0]];
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const E = rs[i] * cs[j] / N; R.E[i][j] = E; if (E > 0) chi += (t[i][j] - E) ** 2 / E; }
    R.calc = chi; R.df = 1; R.crit = zCrit(aT) ** 2;   // with 1 degree of freedom, χ² is the square of a z score
    R.dir = t[1][0] / Math.max(1, rs[1]) > t[0][0] / Math.max(1, rs[0]); R.lowE = R.E.flat().some(e => e < 5);
    R.steps = [`expected frequency = row total × column total ÷ grand total`, `χ² = Σ (O − E)² / E = ${chi.toFixed(3)}`, `degrees of freedom = (rows − 1)(columns − 1) = 1`];
  } else if (k === "sign") {
    const dif = D.B.map((b, i) => b - D.A[i]), plus = dif.filter(x => x > 0).length, minus = dif.filter(x => x < 0).length, n = plus + minus;
    R.calc = Math.min(plus, minus); R.n = n; R.crit = n > 0 ? critFromCdf(binPmf(n), aT) : -1; R.dir = plus > minus; R.pmf = n > 0 ? binPmf(n) : [1];
    R.steps = [`+ signs (B higher): ${plus},  − signs: ${minus},  ties (left out): ${dif.length - n}`, `S = the less frequent sign = ${R.calc}`, `N = ${n} (ties not counted)`];
  } else if (k === "mw") {
    const all = D.A.concat(D.B), rk = rank(all), n1 = D.A.length, n2 = D.B.length, RA = rk.slice(0, n1).reduce((s, x) => s + x, 0), RB = rk.slice(n1).reduce((s, x) => s + x, 0);
    const UA = n1 * n2 + n1 * (n1 + 1) / 2 - RA, UB = n1 * n2 - UA; R.calc = Math.min(UA, UB); R.crit = critFromCdf(mwPmf(n1, n2), aT); R.dir = RB / n2 > RA / n1; R.ranks = rk;
    R.steps = [`rank all ${n1 + n2} scores together (ties share the average rank)`, `sum of ranks: R_A = ${RA}, R_B = ${RB}`, `U_A = n₁n₂ + n₁(n₁+1)/2 − R_A = ${UA},  U_B = ${UB}`, `U = the smaller = ${R.calc}`];
  } else if (k === "wil") {
    const dif = D.B.map((b, i) => b - D.A[i]).filter(x => x !== 0), rk = rank(dif.map(Math.abs)), Tp = rk.filter((_, i) => dif[i] > 0).reduce((s, x) => s + x, 0), Tm = rk.filter((_, i) => dif[i] < 0).reduce((s, x) => s + x, 0), n = dif.length;
    R.calc = Math.min(Tp, Tm); R.n = n; R.crit = n > 0 ? critFromCdf(wilPmf(n), aT) : -1; R.dir = Tp > Tm;
    R.steps = [`differences B − A (zeros left out): N = ${n}`, `rank the sizes of the differences, ignoring the sign`, `sum of ranks of + differences = ${Tp},  of − differences = ${Tm}`, `T = the smaller = ${R.calc}`];
  } else if (k === "spear") {
    const n = D.X.length, rx = rank(D.X), ry = rank(D.Y), d2 = rx.reduce((s, x, i) => s + (x - ry[i]) ** 2, 0); R.calc = 1 - 6 * d2 / (n * (n * n - 1)); R.n = n; R.crit = spearCrit(n, aT); R.dir = R.calc > 0; R.rx = rx; R.ry = ry;
    R.steps = [`rank X and rank Y separately`, `d = difference in ranks for each person; Σd² = ${d2}`, `rho = 1 − 6Σd² / (n(n² − 1)) = ${R.calc.toFixed(3)}`];
  } else if (k === "pear") {
    const n = D.X.length, mx = mean(D.X), my = mean(D.Y); let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { sxy += (D.X[i] - mx) * (D.Y[i] - my); sxx += (D.X[i] - mx) ** 2; syy += (D.Y[i] - my) ** 2; }
    R.calc = sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0; R.df = n - 2; const tc = tCrit(aT, R.df); R.crit = tc / Math.sqrt(R.df + tc * tc); R.dir = R.calc > 0;   // critical r from the critical t
    R.steps = [`r = Σ(x − x̄)(y − ȳ) / √(Σ(x − x̄)² Σ(y − ȳ)²) = ${R.calc.toFixed(3)}`, `degrees of freedom = N − 2 = ${R.df}`];
  } else if (k === "tu") {
    const n1 = D.A.length, n2 = D.B.length, m1 = mean(D.A), m2 = mean(D.B), s1 = sdev(D.A), s2 = sdev(D.B), sp = Math.sqrt(((n1 - 1) * s1 * s1 + (n2 - 1) * s2 * s2) / (n1 + n2 - 2)), t = sp ? (m2 - m1) / (sp * Math.sqrt(1 / n1 + 1 / n2)) : 0;
    R.calc = t; R.df = n1 + n2 - 2; R.crit = tCrit(aT, R.df); R.dir = t > 0;
    R.steps = [`means: A = ${m1.toFixed(2)}, B = ${m2.toFixed(2)};  SDs ${s1.toFixed(2)}, ${s2.toFixed(2)}`, `t = (x̄_B − x̄_A) / (s_pooled √(1/n₁ + 1/n₂)) = ${t.toFixed(3)}`, `degrees of freedom = n₁ + n₂ − 2 = ${R.df}`];
  } else if (k === "tr") {
    const dif = D.B.map((b, i) => b - D.A[i]), n = dif.length, md = mean(dif), sd = sdev(dif), t = sd ? md / (sd / Math.sqrt(n)) : 0;
    R.calc = t; R.df = n - 1; R.crit = tCrit(aT, R.df); R.dir = t > 0;
    R.steps = [`differences d = B − A: mean ${md.toFixed(2)}, SD ${sd.toFixed(2)}`, `t = d̄ / (s_d / √N) = ${t.toFixed(3)}`, `degrees of freedom = N − 1 = ${R.df}`];
  }
  // Is it significant? 'smaller' tests: calc ≤ crit; others: |calc| ≥ crit. A one-tailed test also needs the result in the predicted direction.
  const beyond = TESTS[k].rule === "≤" ? R.crit >= 0 && R.calc <= R.crit : (k === "chi" ? R.calc >= R.crit : Math.abs(R.calc) >= R.crit);
  R.sig = beyond && (!one || R.dir); R.wrongWay = beyond && one && !R.dir; return R;
}
// one whole simulated study → 1 if significant, 0 if not (used by the batch runs)
const studySig = (r, Q) => runTest(Q.test || treeTest(Q.design, Q.level), makeData(r, Q), Q).sig ? 1 : 0;

// ---------------- 5. State ----------------
const DEF = { design: "unrelated", level: "ordinal", test: "mw", own: false, d: 0.8, r: 0.5, n: 12, sim: 0.6, alpha: 0.05, tails: 1, rate: 0.6 };
const P = Object.assign({}, DEF);
let rand = K.rng(Date.now() % 1e6), data = null, res = null, tally = { n: 0, sig: 0, hist: [] }, acc = 0;
function trueEffect() { return P.design === "correlation" ? P.r !== 0 : P.d !== 0; }
function study() {
  data = makeData(rand, P); const want = treeTest(P.design, P.level); res = P.test === want || P.own === false ? runTest(want, data, P) : null;
  if (P.own && P.test !== want) { const T = TESTS[P.test]; res = { wrong: true, want }; if (T.design.includes(P.design) && T.level !== P.level && P.level !== "nominal" && T.level !== "nominal") res = Object.assign(runTest(P.test, data, P), { wrong: true, want }); }
  if (res && res.calc != null) { tally.n++; tally.sig += res.sig ? 1 : 0; tally.hist.push([tally.n, tally.sig / tally.n]); if (tally.hist.length > 500) tally.hist.shift(); }
}
const clearTally = () => { tally = { n: 0, sig: 0, hist: [] }; };

// ---------------- 6. The page ----------------
const ui = K.app({
  title: "Research Methods: Inferential Tests", subject: "Psychology",
  blurb: "Run simulated studies, choose the right test with the decision tree, compare calculated and critical values and see Type I and Type II errors happen",
  reset: () => { clearTally(); study(); },
  levels: { std: "AS (AQA 7181)", adv: "A level (AQA 7182)", specs: {
    std: "AQA AS Psychology (7181) 3.2.3 Research methods: experimental designs (independent groups, repeated measures, matched pairs), levels of measurement, the sign test, probability and significance (p ≤ 0.05), use of statistical tables and critical values, Type I and Type II errors.",
    adv: "AQA A level Psychology (7182) 3.2.3 Research methods: factors affecting the choice of statistical test (difference/correlation, design, level of data): Spearman's rho, Pearson's r, Wilcoxon, Mann-Whitney, related t-test, unrelated t-test and chi-squared; one- and two-tailed tests; parametric criteria; Type I and Type II errors." } },
  missions: [
    { title: "Which test?", q: "Switch on 'I'll choose the test myself'. For each design and level of data, pick the test you think fits. Can you complete the whole decision tree?", hint: "Ask three questions: difference or correlation? related or unrelated design? nominal, ordinal or interval data? Mann-Whitney is for an unrelated design with ordinal data, Wilcoxon for related ordinal, Spearman for ordinal correlation, chi-squared for nominal unrelated data or association, the sign test for nominal related data.", setup: () => set({ own: true }) },
    { title: "The sign test", q: "Each participant does both conditions; we only record whether they did better (+) or worse (−) in condition B. With 12 participants, how few − signs must there be for p ≤ 0.05 (one-tailed)?", hint: "The critical value of S for N = 12 at 0.05 one-tailed is 2: S must be 2 or fewer. Ties are left out, which lowers N.", setup: () => set({ design: "related", level: "nominal", n: 12, d: 0.8 }) },
    { title: "Type I errors", q: "Set the true effect to 0 (the null hypothesis is TRUE). Run lots of studies. What proportion come out significant at 0.05?", hint: "About 5% or slightly fewer (the ranked tests can't hit 5% exactly). Each of those is a Type I error: a false positive. A stricter level (0.01) makes them rarer.", setup: () => set({ d: 0, rate: 8 }) },
    { title: "Type II errors and sample size", q: "A real but modest effect (d = 0.5) with 8 people per group. How often is it detected? Now increase N.", hint: "With N = 8 most studies miss the effect (Type II errors). Bigger samples give more power. A stricter significance level (0.01) also makes Type II errors MORE likely.", setup: () => set({ d: 0.5, n: 8, rate: 8 }) },
    { title: "One- or two-tailed?", q: "Run studies with a one-tailed test, then a two-tailed one. Which finds the effect more often? When are you allowed to use one-tailed?", hint: "One-tailed tests have smaller critical thresholds so they find a real effect (in the predicted direction) more often. Use one only when previous research justifies predicting the direction (a directional hypothesis).", setup: () => set({ d: 0.6, n: 12, rate: 8 }) },
    { lvl: "adv", title: "Repeated measures v independent groups", q: "Compare Wilcoxon (related) with Mann-Whitney (unrelated) for the same effect and N. Then change how alike each person's two scores are.", hint: "When a person's two scores are similar (strong individual differences), a related design removes those participant variables, so the same effect is detected far more often. With 'how alike' near 0 there is no advantage.", setup: () => set({ design: "related", level: "ordinal", d: 0.5, n: 12, sim: 0.7, rate: 8 }) },
    { lvl: "adv", title: "Parametric power", q: "Interval data, unrelated design: compare the unrelated t-test with Mann-Whitney on the same kind of data. Which has more power?", hint: "The t-test is slightly more powerful when its criteria are met (interval data, normal, similar variances), but only slightly: Mann-Whitney is about 95% as efficient on normal data and is safer when the data are skewed or only ordinal.", setup: () => set({ design: "unrelated", level: "interval", d: 0.6, n: 12, rate: 8 }) },
    { lvl: "adv", title: "Correlation", q: "A correlation study with a true r = 0.4. With N = 10, how often is Spearman's rho significant? How large must N be to find it most of the time?", hint: "With N = 10 the critical rho is about 0.56 (one-tailed 0.05) so a true 0.4 is usually missed. Around N = 40 the power reaches about 80%.", setup: () => set({ design: "correlation", level: "ordinal", r: 0.4, n: 10, rate: 8 }) },
  ],
  batch: [
    { title: "Type I error rate", question: "If there is NO real effect, how often is an unrelated t-test significant at each significance level?", how: "Each run: one study, 12 per group, true effect 0, one-tailed. Result 1 = significant (a Type I error), 0 = not. The mean is the Type I error rate.", xLabel: "significance level α", yLabel: "proportion significant", xs: [0.01, 0.025, 0.05, 0.1], reps: 300, yMin: 0, yMax: 0.15, theory: a => a, theoryLabel: "α", run: (a, r) => studySig(r, { design: "unrelated", level: "interval", test: "tu", n: 12, d: 0, alpha: a, tails: 1 }), note: "The false-positive rate equals the significance level: that is what p ≤ 0.05 means. Run 20 studies with no effect and you expect about one 'significant' result." },
    { title: "Power and sample size (Mann-Whitney)", question: "With a real effect of d = 0.8, how often does a study with N per group find it?", how: "Each run: one study, one-tailed Mann-Whitney at 0.05 on ratings out of 10. 1 = significant (correct), 0 = Type II error.", xLabel: "participants per group", yLabel: "proportion significant (power)", xs: [5, 8, 12, 16, 20, 25, 30], reps: 150, yMin: 0, yMax: 1, theory: n => tPower(0.8 * Math.sqrt(0.955 * n / 2), 2 * n - 2, 0.05), theoryLabel: "t approximation", run: (n, r) => studySig(r, { design: "unrelated", level: "ordinal", test: "mw", n, d: 0.8, alpha: 0.05, tails: 1 }), note: "Small studies miss real effects most of the time (Type II errors). Psychologists aim for power of about 0.8. Ratings out of 10 create many tied ranks, so the simulation runs a little below the smooth approximation." },
    { title: "Related designs and participant variables (A level)", question: "How does the power of a repeated measures study (Wilcoxon) depend on how alike each person's two scores are?", how: "Each run: one study with 12 participants doing both conditions (words recalled), d = 0.5, Wilcoxon one-tailed at 0.05.", xLabel: "how alike a person's two scores are", yLabel: "proportion significant (power)", xs: [0, 0.3, 0.5, 0.7, 0.85], reps: 150, yMin: 0, yMax: 1, theory: s => tPower(0.5 * Math.sqrt(0.955 * 12 / (2 * (1 - s))), 11, 0.05), theoryLabel: "t approximation", run: (s, r) => studySig(r, { design: "related", level: "interval", test: "wil", n: 12, d: 0.5, sim: s, alpha: 0.05, tails: 1 }), note: "Using the same people removes individual differences from the comparison, so the more those differences matter, the bigger the advantage of a repeated measures design." },
    { title: "Spearman's rho: how big a sample? (A level)", question: "With a true correlation of 0.4, how often is Spearman's rho significant for each N?", how: "Each run: one correlation study, ratings 1–10, one-tailed 0.05.", xLabel: "N", yLabel: "proportion significant (power)", xs: [6, 10, 15, 20, 30, 40, 50], reps: 120, yMin: 0, yMax: 1, theory: n => Phi(Math.atanh(0.4) * Math.sqrt(0.91 * (n - 3)) - 1.645), theoryLabel: "Fisher z approximation", run: (n, r) => studySig(r, { design: "correlation", level: "ordinal", test: "spear", n, r: 0.4, alpha: 0.05, tails: 1 }), note: "Moderate correlations need large samples. A small study that 'finds no correlation' may just have had too little power." },
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "3.2.3", text: "Significance: the probability that the result happened by chance if the null hypothesis is true. Psychology usually uses p ≤ 0.05; 0.01 when a mistake would be serious or the research is new/controversial." },
      { lvl: "std", tag: "3.2.3", text: "Type I error: rejecting a TRUE null hypothesis (false positive), more likely with a lenient level (0.10). Type II error: retaining a FALSE null hypothesis (false negative), more likely with a strict level (0.01) or a small sample." },
      { lvl: "std", tag: "3.2.3", text: "Sign test: related design, nominal data (+/−). Ignore ties. S = the less frequent sign. Significant if S ≤ the critical value for N (number of non-tied pairs)." },
      { lvl: "adv", tag: "3.2.3", text: "Choosing a test: difference or correlation? related or unrelated? nominal, ordinal or interval? Chi-squared, sign, Mann-Whitney, Wilcoxon, Spearman, unrelated t, related t, Pearson." },
      { lvl: "adv", tag: "3.2.3", text: "Calculated v critical: for Mann-Whitney U, Wilcoxon T and the sign test S the calculated value must be EQUAL TO OR LESS THAN the critical value. For the others it must be EQUAL TO OR MORE THAN it. One-tailed for directional hypotheses." },
      { lvl: "adv", tag: "3.2.3", text: "Parametric tests (t-tests, Pearson) need interval data, roughly normal distributions and similar variances. They are more powerful when these hold." },
    ],
    questions: [
      { lvl: "std", marks: 2, q: "Explain what is meant by a Type I error.", ans: "<ul><li>the null hypothesis is rejected / the result is accepted as significant</li><li>when the null hypothesis is actually true (a false positive: the effect was due to chance)</li></ul>" },
      { lvl: "std", marks: 3, q: "In a repeated measures study, 9 participants did better with music, 2 did worse and 1 scored the same. The critical value of S for N = 11 at p ≤ 0.05 (one-tailed) is 2. Is the result significant? Explain.", ans: "<ul><li>S = 2 (the less frequent sign); the tie is ignored so N = 11</li><li>S ≤ the critical value of 2</li><li>so the result is significant at p ≤ 0.05: reject the null hypothesis</li></ul>" },
      { lvl: "adv", marks: 3, q: "A psychologist compares the stress ratings (1 to 10) of two different groups of nurses. Identify the appropriate statistical test and justify your choice.", ans: "<ul><li>Mann-Whitney U</li><li>it tests for a difference with an unrelated (independent groups) design</li><li>ratings are ordinal data</li></ul>" },
      { lvl: "adv", marks: 4, q: "Explain why a researcher might choose p ≤ 0.01 rather than p ≤ 0.05, and the risk of doing so.", ans: "<ul><li>0.01 makes a Type I error less likely</li><li>used when being wrong would be costly (e.g. a drug trial) or the finding is new/controversial</li><li>but it makes a Type II error more likely</li><li>a real effect may be missed, especially with a small sample</li></ul>" },
    ]
  },
  notes: `<h3>The model</h3><ul><li>Participants' scores come from a normal distribution. In condition B scores are shifted up by d standard deviations (the true effect). Ratings out of 10 are made by rounding (ordinal data); 'words recalled' are made by rounding a wider scale (interval data); nominal data is 'passed or failed' (above or below a cut-off) or, for related designs, just the sign of the change.</li><li>In a related design each person has their own level (individual differences) plus separate noise in each condition; 'how alike' is the correlation between a person's two scores.</li><li>Critical values for Mann-Whitney, Wilcoxon and the sign test are calculated exactly from their null distributions (as in published tables). Critical values for t, Pearson and chi-squared come from the t and χ² distributions. Spearman's critical values are exact for N ≤ 12 (every pairing of ranks counted) and estimated by shuffling the ranks 20 000 times for larger N, so they can differ slightly from a printed table there.</li></ul>
<h3>Assumptions and simplifications</h3><ul><li>Every participant is a random sample from the same population; there are no order effects, demand characteristics or experimenter effects.</li><li>Chi-squared is shown for a 2 × 2 table only, without Yates' correction (as in AQA). Expected frequencies below 5 make it unreliable: the page warns you.</li><li>Ties are handled with average ranks; the small correction to critical values for ties is ignored.</li></ul>`,
});

// ---------------- 7. Controls ----------------
const C = {};
let g = ui.group("The study");
C.design = K.seg(g, { label: "Design", value: "unrelated", options: [["unrelated", "independent groups"], ["related", "repeated measures"], ["correlation", "correlation"]], on: v => { P.design = v; autoTest(); fresh(); } });
C.level = K.seg(g, { label: "Level of data", value: "ordinal", options: [["nominal", "nominal"], ["ordinal", "ordinal"], ["interval", "interval"]], on: v => { P.level = v; autoTest(); fresh(); } });
C.own = K.toggle(g, { label: "I'll choose the test myself", value: false, on: v => { P.own = v; autoTest(); fresh(); } });
C.test = K.seg(g, { label: "Statistical test", value: "mw", options: Object.entries(TESTS).map(([k, t]) => [k, t.name]), on: v => { P.test = v; fresh(); } });
g = ui.group("The truth (normally hidden from the researcher!)");
C.d = K.slider(g, { label: "True effect d (difference in standard deviations)", min: 0, max: 1.5, step: 0.1, value: 0.8, on: v => { P.d = v; fresh(); } });
C.r = K.slider(g, { label: "True correlation r", min: 0, max: 0.9, step: 0.05, value: 0.5, on: v => { P.r = v; fresh(); } });
C.sim = K.slider(g, { label: "How alike a person's two scores are", min: 0, max: 0.9, step: 0.05, value: 0.6, on: v => { P.sim = v; fresh(); } });
g = ui.group("Testing");
C.n = K.slider(g, { label: "N (participants per group / pairs)", min: 5, max: 50, step: 1, value: 12, on: v => { P.n = v; fresh(); } });
C.alpha = K.seg(g, { label: "Significance level", value: 0.05, options: [[0.1, "0.10"], [0.05, "0.05"], [0.01, "0.01"]], on: v => { P.alpha = +v; fresh(); } });
C.tails = K.seg(g, { label: "Hypothesis", value: 1, options: [[1, "directional (one-tailed)"], [2, "non-directional (two-tailed)"]], on: v => { P.tails = +v; fresh(); } });
C.rate = K.slider(ui.controls, { label: "Studies per second when playing", min: 0.2, max: 20, step: 0.2, value: 0.6, on: v => P.rate = v });
let rw = K.row(ui.controls); K.btn(rw, "Run one study", () => { ui.setPlaying(false); study(); }, "primary"); K.btn(rw, "Run 50 studies", () => { for (let i = 0; i < 50; i++) study(); }); K.btn(rw, "Clear tally", () => clearTally());
const read = K.readout(ui.group("Your studies (current settings)"), [["n", "Studies run"], ["s", "Significant"], ["e", "Error rate"]]);
function autoTest() { if (!P.own) { P.test = treeTest(P.design, P.level); C.test.set(P.test); } showCtl(); }
function showCtl() { C.d.el.style.display = P.design === "correlation" ? "none" : ""; C.r.el.style.display = P.design === "correlation" ? "" : "none"; C.sim.el.style.display = P.design === "related" ? "" : "none"; C.test.el.style.opacity = P.own ? 1 : 0.6; }
function fresh() { clearTally(); study(); }
function set(o) { Object.assign(P, DEF, o); for (const k of ["design", "level", "own", "d", "r", "sim", "n", "alpha", "tails", "rate"]) C[k].set(P[k]); P.test = o.test || treeTest(P.design, P.level); C.test.set(P.test); showCtl(); fresh(); }

// ---------------- 8. Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#c9d4ea", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,system-ui,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
const COLA = "#5ad1ff", COLB = "#ffb454";
function drawData(c, x0, y0, w, h) {
  const D = data; c.strokeStyle = "#2a3a5c"; c.strokeRect(x0, y0, w, h);
  const ctx = { unrelated: "Does a memory technique help? A = without it, B = with it (different people)", related: "Does a memory technique help? The same people do A (without) and B (with)", correlation: "Is X related to Y? (e.g. hours of revision and test score)" }[D.design];
  TX(c, ctx, x0 + 10, y0 + 18, "#c9d4ea", "left", "600 12px");
  const lvlTxt = { nominal: D.design === "related" ? "nominal: only + (better in B) or − (worse)" : "nominal: categories (counts in a table)", ordinal: "ordinal: ratings from 1 to 10", interval: "interval: words recalled (equal units)" }[D.level]; TX(c, lvlTxt, x0 + 10, y0 + 36, "#8fa0bf", "left", "12px");
  const T = y0 + 64, H = h - 84;
  if (D.table) {   // a 2 × 2 contingency table with observed (and expected) frequencies
    const cw = Math.min(140, w / 3.4), ch = 54, tx = x0 + w / 2 - 1.5 * cw, ty = T + H / 2 - ch * 1.5;
    D.cols.forEach((s, j) => TX(c, s, tx + cw * (1.5 + j), ty + 30, "#c9d4ea", "center", "600 13px")); D.rows.forEach((s, i) => TX(c, s, tx + cw * 0.5, ty + ch * (1.5 + i) + 5, i ? COLB : COLA, "center", "600 13px"));
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const x = tx + cw * (1 + j), y = ty + ch * (1 + i); c.strokeStyle = "#5d6e93"; c.strokeRect(x, y, cw, ch); TX(c, D.table[i][j], x + cw / 2, y + 28, "#fff", "center", "600 20px"); if (res && res.E) TX(c, "expected " + res.E[i][j].toFixed(1), x + cw / 2, y + 46, res.E[i][j] < 5 ? "#ff9aa9" : "#8fa0bf", "center", "11px"); }
    return;
  }
  if (D.design === "correlation") {
    const lo = Math.min(...D.X, ...D.Y), hi = Math.max(...D.X, ...D.Y) + 0.001, L = x0 + 50, B = T + H - 20, W = w - 70, HH = H - 30, X = v => L + (v - lo) / (hi - lo) * W, Y = v => B - (v - lo) / (hi - lo) * HH;
    c.strokeStyle = "#5d6e93"; c.beginPath(); c.moveTo(L, T); c.lineTo(L, B); c.lineTo(L + W, B); c.stroke(); TX(c, "X", L + W, B + 16, "#8fa0bf", "right"); TX(c, "Y", L - 10, T + 10, "#8fa0bf", "right");
    const seen = {}; D.X.forEach((x, i) => { const key = x + "," + D.Y[i], k = seen[key] = (seen[key] || 0) + 1, ang = k * 2.4, rad = k > 1 ? 7 * Math.sqrt(k - 1) : 0;   // identical points are fanned out so you can count them
      c.fillStyle = COLA; c.globalAlpha = 0.8; c.beginPath(); c.arc(X(x) + rad * Math.cos(ang), Y(D.Y[i]) + rad * Math.sin(ang), 5, 0, 6.3); c.fill(); c.globalAlpha = 1; });
    return;
  }
  const all = D.A.concat(D.B), lo = Math.min(...all) - 0.5, hi = Math.max(...all) + 0.5, B = T + H - 10, Y = v => B - (v - lo) / (hi - lo) * (H - 20), xa = x0 + w * 0.3, xb = x0 + w * 0.7;
  TX(c, "A", xa, B + 8, COLA, "center", "600 13px"); TX(c, "B", xb, B + 8, COLB, "center", "600 13px");
  if (D.design === "related") {   // each line is one person: up (green) = better in B, down (red) = worse, flat = tie
    D.A.forEach((a, i) => { const b = D.B[i], j = (i - D.A.length / 2) * 3; c.strokeStyle = b > a ? "#7ee787" : b < a ? "#ff6b81" : "#8fa0bf"; c.globalAlpha = 0.6; c.beginPath(); c.moveTo(xa + j, Y(a)); c.lineTo(xb + j, Y(b)); c.stroke(); c.globalAlpha = 1; c.fillStyle = COLA; c.beginPath(); c.arc(xa + j, Y(a), 3.5, 0, 6.3); c.fill(); c.fillStyle = COLB; c.beginPath(); c.arc(xb + j, Y(b), 3.5, 0, 6.3); c.fill(); });
    if (D.level === "nominal") { const s = D.A.map((a, i) => D.B[i] > a ? "+" : D.B[i] < a ? "−" : "0").join(" "); TX(c, "signs: " + s, x0 + w / 2, T - 8, "#ffd166", "center", "600 13px"); }
  } else {
    const dots = (v, x, col) => { const seen = {}; v.forEach(s => { const k = seen[s] = (seen[s] || 0) + 1; c.fillStyle = col; c.beginPath(); c.arc(x + (k % 2 ? 1 : -1) * Math.floor(k / 2) * 9, Y(s), 4, 0, 6.3); c.fill(); }); };
    dots(D.A, xa, COLA); dots(D.B, xb, COLB);
    const mid = v => D.level === "interval" ? mean(v) : [...v].sort((a, b) => a - b)[Math.floor((v.length - 1) / 2)];
    [[D.A, xa], [D.B, xb]].forEach(([v, x]) => { c.strokeStyle = "#fff"; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 50, Y(mid(v))); c.lineTo(x + 50, Y(mid(v))); c.stroke(); c.lineWidth = 1; TX(c, (D.level === "interval" ? "mean " : "median ") + (+mid(v).toFixed(1)), x + 56, Y(mid(v)) + 4, "#fff", "left", "11px"); });
  }
  for (let s = Math.ceil(lo); s <= hi; s += D.level === "interval" ? 5 : 1) TX(c, s, x0 + 24, Y(s) + 4, "#8fa0bf", "right", "10px");
}
function drawWorking(c, x0, y0, w) {
  let y = y0 + 18; const line = (s, col = "#c9d4ea", f = "13px") => { TX(c, s, x0, y, col, "left", f); y += 21; };
  const want = treeTest(P.design, P.level);
  line("Decision tree: " + (P.design === "correlation" ? "correlation" : "difference → " + (P.design === "unrelated" ? "unrelated design" : "related design")) + " → " + P.level + " data", "#8fa0bf", "12px");
  line("⇒ " + TESTS[want].name, "#ffd166", "600 15px");
  if (res && res.wrong) { line("✗ You chose " + TESTS[P.test].name + ". That test is for " + TESTS[P.test].design.join(" or ") + " designs with " + TESTS[P.test].level + " data.", "#ff9aa9", "600 12px"); if (res.calc == null) return; line("(here it is anyway, but it isn't the right test)", "#ff9aa9", "12px"); }
  else if (P.own) line("✓ correct choice", "#7ee787", "600 12px");
  const R = res; if (!R || R.calc == null) return; y += 4;
  for (const s of R.steps) line(s, "#c9d4ea", "12.5px");
  y += 4; const fmt = v => TESTS[R.k].rule === "≤" ? String(v) : (+v).toFixed(3);
  line(`calculated value = ${fmt(R.calc)}${R.n != null && R.k !== "spear" ? ` (N = ${R.n})` : R.df != null ? ` (df = ${R.df})` : ""}`, "#fff", "600 14px");
  line(`critical value (${P.tails === 1 ? "one" : "two"}-tailed, p ≤ ${P.alpha}) = ${R.crit < 0 ? "none: sample too small" : fmt(R.crit)}`, "#fff", "600 14px");
  line(`rule: calculated value must be ${TESTS[R.k].rule === "≤" ? "≤" : "≥"} the critical value${P.tails === 1 ? ", in the predicted direction" : ""}`, "#8fa0bf", "12px");
  if (R.lowE) line("⚠ an expected frequency is below 5: chi-squared is unreliable", "#ff9aa9", "12px");
  y += 4; line(R.sig ? `SIGNIFICANT (p ≤ ${P.alpha}): reject the null hypothesis` : R.wrongWay ? "big enough, but in the WRONG direction for a one-tailed test: retain the null hypothesis" : `not significant: retain the null hypothesis`, R.sig ? "#7ee787" : "#ff9aa9", "700 14px");
  const truth = trueEffect(); line(truth ? (R.sig ? "Truth: there IS an effect, so this is a correct decision." : "Truth: there IS an effect, so this is a TYPE II ERROR (false negative).") : (R.sig ? "Truth: there is NO effect, so this is a TYPE I ERROR (false positive)." : "Truth: there is no effect, so this is a correct decision."), truth === R.sig ? "#c9d4ea" : "#ffd166", "600 13px");
}
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1222"; c.fillRect(0, 0, w, h);
  if (!data) return; drawData(c, 12, 12, w * 0.47, h - 24); drawWorking(c, w * 0.5 + 10, 12, w * 0.5 - 20);
}
// the null distribution: what the calculated value looks like when the null hypothesis is true; the critical region is shaded
function nullChart() {
  const R = res; chA.opts.title = "If the null hypothesis were true: distribution of the calculated value"; chA.opts.yLabel = "probability";
  if (!R || R.calc == null) { chA.draw([], {}); return; }
  const k = R.k, crit = R.crit, crPts = [], okPts = []; let line = null, xl = "";
  const push = (x, p, inCrit) => (inCrit ? crPts : okPts).push([x, p]);
  if (k === "mw" || k === "wil" || k === "sign") {
    const pmf = k === "mw" ? mwPmf(data.A.length, data.B.length) : k === "wil" ? wilPmf(R.n) : binPmf(R.n), M = pmf.length - 1;
    // the 'smaller of two' statistic: P(min = u) = 2·P(U = u) below the middle
    for (let u = 0; u <= Math.floor(M / 2); u++) push(u, (2 * u === M ? 1 : 2) * pmf[u], crit >= 0 && u <= crit);
    xl = k === "mw" ? "U" : k === "wil" ? "T" : "S";
  } else if (k === "spear") { const n = R.n, sc = n * (n * n - 1); let vals; if (n <= 12) { vals = []; spearD2Pmf(n).forEach((p, D) => { if (p > 0) vals.push([1 - 6 * D / sc, p]); }); } else vals = K.histogram(Array.from(spearNull(n)), 40, -1, 1).pts.map(p => [p[0], p[1] / 20000]); for (const [x, p] of vals) push(x, p, P.tails === 2 ? Math.abs(x) >= crit - 1e-9 : x >= crit - 1e-9); xl = "rho"; }
  else if (k === "chi") { for (let x = 0.05; x <= 12; x += 0.1) push(x, Math.exp(-x / 2) / Math.sqrt(2 * Math.PI * x), x >= crit); xl = "χ²"; line = true; }
  else if (k === "pear") { const n = R.df + 2; for (let x = -0.99; x <= 0.99; x += 0.02) push(x, Math.exp(lgamma((n - 1) / 2) - lgamma((n - 2) / 2) - 0.5 * Math.log(Math.PI)) * Math.pow(1 - x * x, (n - 4) / 2), P.tails === 2 ? Math.abs(x) >= crit : x >= crit); xl = "r"; line = true; }
  else { for (let x = -5; x <= 5; x += 0.05) push(x, tDens(x, R.df), P.tails === 2 ? Math.abs(x) >= crit : x >= crit); xl = "t"; line = true; }
  chA.opts.xLabel = xl;
  const ser = line ? [{ pts: okPts.concat(crPts).sort((a, b) => a[0] - b[0]), type: "area", color: K.cssVar("--s0"), label: "null distribution" }, { pts: crPts.filter(p => p[0] >= (P.tails === 2 || k === "chi" ? -Infinity : crit)), type: "area", color: K.cssVar("--s3"), label: "critical region" }]
    : [{ pts: okPts, type: "bars", w: k === "spear" ? (R.n <= 12 ? 12 / (R.n * (R.n * R.n - 1)) : 0.05) : 1, color: K.cssVar("--s0"), label: "null distribution" }, { pts: crPts, type: "bars", w: k === "spear" ? (R.n <= 12 ? 12 / (R.n * (R.n * R.n - 1)) : 0.05) : 1, color: K.cssVar("--s3"), label: "critical region" }];
  if (line && P.tails === 2 && k !== "chi") { ser[1].pts = crPts.filter(p => p[0] > 0); ser.push({ pts: crPts.filter(p => p[0] < 0), type: "area", color: K.cssVar("--s3") }); }
  chA.draw(ser, { yMin: 0, vlines: [{ x: R.calc, color: K.cssVar("--s2"), label: "your calculated value" }] });
}
function panels() {
  read.set("n", tally.n); read.set("s", tally.sig + (tally.n ? ` (${(100 * tally.sig / tally.n).toFixed(0)}%)` : ""));
  const truth = trueEffect(); read.set("e", tally.n ? (truth ? `Type II: ${(100 * (1 - tally.sig / tally.n)).toFixed(0)}%` : `Type I: ${(100 * tally.sig / tally.n).toFixed(0)}%`) : "–");
  nullChart();
  chB.opts.title = truth ? "Proportion of studies that found the real effect (power)" : "Proportion of studies with a false positive (Type I errors)"; chB.opts.xLabel = "studies run"; chB.opts.yLabel = "proportion significant";
  chB.draw([{ pts: tally.hist, color: K.cssVar("--s1") }], { yMin: 0, yMax: 1, hlines: truth ? [] : [{ y: P.alpha, label: "α = " + P.alpha }] });
}
let frame = 0;
ui.run(dt => { acc += dt * P.rate; while (acc >= 1) { acc--; study(); } }, () => { draw(); if (frame++ % 6 === 0) panels(); });
set({});
ui.tip("Each study is simulated: you can see the truth the researcher can't. Is the result significant, and is the decision right?", 8000);
