/* =====================================================================
   FIELDWORK: SAMPLING AND STATISTICS
   You cannot measure every pebble on a beach, so you SAMPLE:
     random (every place has an equal chance), systematic (every so many
     km), stratified (the same number in each zone), opportunistic (where
     it is easy: quick, but biased).
   Each fieldtrip gets slightly different results by chance. A bigger
   sample gives a mean closer to the truth (the spread of means falls as
   SD ÷ √n), but no sample size fixes a BIASED method.
   STATISTICAL TESTS ask whether a pattern could just be chance:
     Spearman's rank rs = 1 − 6Σd² ÷ (n³ − n): is there a correlation?
     chi-squared Σ(O − E)² ÷ E: are two things linked (shape and zone)?
     Student's t-test: do two groups' means differ?
   Compare the answer with the critical value: at the 0.05 level a
   result happens by chance only 1 time in 20 when there is no real
   pattern (a Type I error); a real but weak pattern can still be missed
   with too few sites (a Type II error).
   ===================================================================== */
const clamp = K.clamp, mean = a => a.reduce((s, x) => s + x, 0) / a.length;
const sdev = a => { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };
const sdevN = a => { if (!a.length) return 0; const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length); };   // Pearson's worked SD divides by n
const erf = x => { const s = Math.sign(x), a = Math.abs(x), t = 1 / (1 + 0.3275911 * a); return s * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a)); };
const Phi = x => 0.5 * (1 + erf(x / Math.SQRT2));

// ---------------- a. The field sites: a strip L km long (t along it, y across it) ----------------
const SITES = {
  beach: { name: "Pebble beach (like Chesil Beach)", L: 18, unit: "mm", what: "mean pebble long axis", item: "pebbles", zones: ["west end", "middle", "east end"], cats: ["angular", "sub-rounded", "rounded"], catName: "pebble shape",
    hyp: "Pebble size increases from west to east along the beach.", h0: "There is no relationship between pebble size and distance along the beach.",
    access: [0.5, 5.5], accessName: ["car park (West Bay)", "car park and footpath"], mult: true, sdItem: 0.35, sdLocal: 0.14, err: 1, dp: 0,
    trueAt: (t, y, s, L) => (12 + s * 38 * t / L) * (1 + 0.12 * (y - 0.5)), catP: (t, s, L) => { const f = s * t / L; return [0.5 - 0.4 * f, 0.3, 0.2 + 0.4 * f]; } },
  river: { name: "A river downstream (Bradshaw model)", L: 20, unit: "m", what: "mean channel width", item: "width readings", zones: ["upper course", "middle course", "lower course"], cats: ["angular", "sub-angular", "rounded"], catName: "bedload shape",
    hyp: "The river channel gets wider with distance downstream.", h0: "There is no relationship between channel width and distance downstream.",
    access: [3, 9], accessName: ["bridge at the village", "footbridge"], mult: true, sdItem: 0.1, sdLocal: 0.22, err: 0.1, dp: 1,
    trueAt: (t, y, s, L) => 1.6 + s * 7 * Math.pow(t / L, 0.9), catP: (t, s, L) => { const f = s * t / L; return [0.5 - 0.4 * f, 0.3, 0.2 + 0.4 * f]; } },
  town: { name: "Town centre: environmental quality", L: 2.5, unit: "points", what: "mean EQS score", item: "surveyors' scores", zones: ["centre", "inner area", "suburbs"], cats: ["shops and services", "housing", "vacant"], catName: "land use",
    hyp: "Environmental quality improves with distance from the town centre.", h0: "There is no relationship between environmental quality and distance from the centre.",
    access: [0.2, 0.8], accessName: ["station", "high street"], mult: false, sdItem: 3, sdLocal: 4, err: 1, dp: 1,
    trueAt: (t, y, s, L) => -4 + s * 16 * (t / L) - 4 * (0.5 - y),   // side streets (y near 1) are quieter than the main road
    catP: (t, s, L) => { const f = t / L; return [0.4 + s * (0.3 - 0.6 * f), 0.4 + s * (-0.25 + 0.55 * f), 0.2 + s * (-0.05 + 0.1 * Math.sin(Math.PI * f))]; } }
};
const zoneOf = (t, L) => Math.min(2, Math.floor(3 * t / L));
// smooth local differences, fixed for each site (they are part of the place, the same every visit)
function localNoise(site, t, y) {
  const S = SITES[site]; if (!S._ph) { const r = K.rng(site.length * 101 + 7); S._ph = []; for (let k = 0; k < 7; k++) S._ph.push([r() * 6.283, r() * 6.283, 0.6 + 2.4 * r(), 0.5 + 1.5 * r()]); }
  let v = 0; for (const [a, b, ft, fy] of S._ph) v += Math.sin(a + ft * 6.283 * t / S.L * 3) * Math.cos(b + fy * 3.1 * y);
  return v / Math.sqrt(S._ph.length / 2) * 0.7;
}
function placeMean(site, t, y, s) { const S = SITES[site], b = S.trueAt(t, y, s, S.L), n = localNoise(site, t, y); return S.mult ? b * Math.exp(S.sdLocal * n) : b + S.sdLocal * n; }

// ---------------- b. Sampling: where the sites go ----------------
function placeSites(site, method, n, r, own) {
  const S = SITES[site], L = S.L, out = [];
  if (method === "own") return (own || []).map(q => ({ t: q.t, y: q.y }));
  if (method === "systematic") { const u = r(); for (let i = 0; i < n; i++) out.push({ t: (i + u) * L / n, y: 0.5 }); }                       // every L/n km from a random start
  else if (method === "stratified") { for (let i = 0; i < n; i++) out.push({ t: (i % 3 + r()) * L / 3, y: r() }); out.sort((a, b) => a.t - b.t); }   // equal numbers in each third
  else if (method === "opportunistic") { for (let i = 0; i < n; i++) { const a = S.access[i % S.access.length]; out.push({ t: clamp(a + (r() - 0.3) * 0.12 * L, 0.01 * L, 0.99 * L), y: clamp(0.5 + (r() - 0.5) * 0.4, 0, 1) }); } out.sort((a, b) => a.t - b.t); }   // near the car parks and paths
  else { for (let i = 0; i < n; i++) out.push({ t: r() * L, y: r() }); out.sort((a, b) => a.t - b.t); }
  return out;
}
// ---------------- c. Collecting data: k items at each site ----------------
function measureSite(site, q, p, r) {
  const S = SITES[site], mu = placeMean(site, q.t, q.y, p.s), k = Math.max(1, Math.round(p.k)), cats = [0, 0, 0], Pc = S.catP(q.t, p.s, S.L); let sum = 0;
  for (let j = 0; j < k; j++) {
    let v = S.mult ? mu * Math.exp(S.sdItem * r.gauss() - S.sdItem * S.sdItem / 2) : mu + S.sdItem * r.gauss();
    if (p.eye) v = S.mult ? v * 1.25 : v + 3;          // picked by eye: the bigger pebbles, the nicer-looking streets
    v += S.err * p.err * r.gauss();                     // the ruler, tape or surveyor is not perfect
    sum += v; const u = r(); cats[u < Pc[0] ? 0 : u < Pc[0] + Pc[1] ? 1 : 2]++;
  }
  return { t: q.t, y: q.y, v: sum / k, cats, zone: zoneOf(q.t, S.L) };
}
function collect(site, p, seed, own) { const r = K.rng(seed), qs = placeSites(site, p.method, Math.round(p.n), r, own), r2 = K.rng(seed * 7 + 3); return qs.map(q => measureSite(site, q, p, r2)); }

// ---------------- d. Statistics ----------------
const atPos = (s, pos) => { const i = clamp(pos, 1, s.length) - 1, lo = Math.floor(i), f = i - lo; return lo + 1 < s.length ? s[lo] + f * (s[lo + 1] - s[lo]) : s[lo]; };
function describe(vals) { const s = vals.slice().sort((a, b) => a - b), n = s.length; if (!n) return null; const LQ = atPos(s, (n + 1) / 4), UQ = atPos(s, 3 * (n + 1) / 4); return { n, mean: mean(s), median: atPos(s, (n + 1) / 2), min: s[0], max: s[n - 1], range: s[n - 1] - s[0], LQ, UQ, IQR: UQ - LQ, sd: sdevN(s) }; }
function ranks(a) { const idx = a.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]), r = new Array(a.length); let i = 0; while (i < idx.length) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j + 2) / 2; i = j + 1; } return r; }   // tied values share their mean rank
function spearman(xs, ys) { const n = xs.length; if (n < 3) return null; const rx = ranks(xs), ry = ranks(ys); let d2 = 0; for (let i = 0; i < n; i++) d2 += (rx[i] - ry[i]) ** 2; return { rs: 1 - 6 * d2 / (n * (n * n - 1)), d2, rx, ry, n }; }
// critical values, two-tailed (Zar 1972); above n = 30 from Student's t
const SP05 = { 5: 1.000, 6: 0.886, 7: 0.786, 8: 0.738, 9: 0.700, 10: 0.648, 11: 0.618, 12: 0.587, 13: 0.560, 14: 0.538, 15: 0.521, 16: 0.503, 17: 0.485, 18: 0.472, 19: 0.460, 20: 0.447, 21: 0.435, 22: 0.425, 23: 0.415, 24: 0.406, 25: 0.398, 26: 0.390, 27: 0.382, 28: 0.375, 29: 0.368, 30: 0.362 };
const SP01 = { 6: 1.000, 7: 0.929, 8: 0.881, 9: 0.833, 10: 0.794, 11: 0.755, 12: 0.727, 13: 0.703, 14: 0.679, 15: 0.654, 16: 0.635, 17: 0.615, 18: 0.600, 19: 0.584, 20: 0.570, 21: 0.556, 22: 0.544, 23: 0.532, 24: 0.521, 25: 0.511, 26: 0.501, 27: 0.491, 28: 0.483, 29: 0.475, 30: 0.467 };
function lgam(x) { const g = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]; let y = x, t = x + 5.5; t -= (x + 0.5) * Math.log(t); let s = 1.000000000190015; for (const c of g) s += c / ++y; return -t + Math.log(2.5066282746310005 * s / x); }
function tCdf(t, df) { const c = Math.exp(lgam((df + 1) / 2) - lgam(df / 2)) / Math.sqrt(df * Math.PI); let s = 0; const N = 400, h = t / N; for (let i = 0; i <= N; i++) { const x = i * h; s += (i === 0 || i === N ? 0.5 : 1) * c * Math.pow(1 + x * x / df, -(df + 1) / 2); } return 0.5 + s * h; }
function tInv(p, df) { let lo = 0, hi = 50; for (let k = 0; k < 60; k++) { const md = (lo + hi) / 2; if (tCdf(md, df) < 1 - p / 2) lo = md; else hi = md; } return (lo + hi) / 2; }
const CACHE = {};
const tCrit = (df, a) => df < 1 ? NaN : CACHE["t" + df + a] ?? (CACHE["t" + df + a] = +tInv(a, df).toFixed(3));
function spCrit(n, a) { const T = a === 0.01 ? SP01 : SP05; if (T[n] !== undefined) return T[n]; if (n < 5 || (a === 0.01 && n < 6)) return NaN; const t = tCrit(n - 2, a); return t / Math.sqrt(n - 2 + t * t); }
const CHI05 = [0, 3.84, 5.99, 7.81, 9.49, 11.07, 12.59], CHI01 = [0, 6.63, 9.21, 11.34, 13.28, 15.09, 16.81];
function chiSq(data) {   // zones (rows) × categories (columns): observed O against expected E = row total × column total ÷ N
  const O = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; for (const d of data) for (let c = 0; c < 3; c++) O[d.zone][c] += d.cats[c];
  const rows = O.map(r => r[0] + r[1] + r[2]), cols = [0, 1, 2].map(c => O[0][c] + O[1][c] + O[2][c]), N = rows[0] + rows[1] + rows[2];
  const ri = [0, 1, 2].filter(i => rows[i] > 0), ci = [0, 1, 2].filter(j => cols[j] > 0); if (ri.length < 2 || ci.length < 2) return null;
  let chi = 0, small = 0; const E = O.map(() => [0, 0, 0]);
  for (const i of ri) for (const j of ci) { const e = rows[i] * cols[j] / N; E[i][j] = e; chi += (O[i][j] - e) ** 2 / e; if (e < 5) small++; }
  const df = (ri.length - 1) * (ci.length - 1); return { O, E, rows, cols, N, chi, df, c05: CHI05[df], c01: CHI01[df], small };
}
function tTest(data) {   // the first zone against the last: t = (x̄₁ − x̄₂) ÷ √(s₁²/n₁ + s₂²/n₂), df = n₁ + n₂ − 2
  const A = data.filter(d => d.zone === 0).map(d => d.v), B = data.filter(d => d.zone === 2).map(d => d.v), n1 = A.length, n2 = B.length; if (n1 < 2 || n2 < 2) return { n1, n2, ok: false };
  const m1 = mean(A), m2 = mean(B), s1 = sdevN(A), s2 = sdevN(B), se = Math.sqrt(s1 * s1 / n1 + s2 * s2 / n2), df = n1 + n2 - 2, t = se > 0 ? (m1 - m2) / se : 0, c05 = tCrit(df, 0.05);
  return { n1, n2, ok: true, m1, m2, s1, s2, t, df, c05, c01: tCrit(df, 0.01), sig: Math.abs(t) >= c05 };
}
function mwCrit(n1, n2, a) {   // Mann–Whitney: the largest U with two-tailed probability ≤ a, by counting every arrangement
  if (n1 > n2) [n1, n2] = [n2, n1]; const key = "mw" + n1 + "|" + n2 + "|" + a; if (CACHE[key] !== undefined) return CACHE[key]; if (n1 < 2 || n1 + n2 > 60) return (CACHE[key] = NaN);
  const max = n1 * n2; let prev = []; for (let j = 0; j <= n2; j++) { prev.push(new Float64Array(max + 1)); prev[j][0] = 1; }
  for (let i = 1; i <= n1; i++) { const cur = [new Float64Array(max + 1)]; cur[0][0] = 1; for (let j = 1; j <= n2; j++) { const c = new Float64Array(max + 1); for (let u = 0; u <= max; u++) c[u] = cur[j - 1][u] + (u - j >= 0 ? prev[j][u - j] : 0); cur.push(c); } prev = cur; }
  const dist = prev[n2]; let tot = 0; for (const v of dist) tot += v; let cum = 0, crit = -1; for (let u = 0; u <= max; u++) { cum += dist[u]; if (2 * cum / tot <= a) crit = u; else break; }
  return (CACHE[key] = crit < 0 ? NaN : crit);
}
function mannWhitney(data) {
  const A = data.filter(d => d.zone === 0).map(d => d.v), B = data.filter(d => d.zone === 2).map(d => d.v), n1 = A.length, n2 = B.length; if (n1 < 2 || n2 < 2) return { ok: false, n1, n2 };
  const rk = ranks(A.concat(B)), R1 = rk.slice(0, n1).reduce((s, x) => s + x, 0), U1 = n1 * n2 + n1 * (n1 + 1) / 2 - R1, U = Math.min(U1, n1 * n2 - U1);
  return { ok: true, n1, n2, R1, R2: rk.slice(n1).reduce((s, x) => s + x, 0), U, crit: mwCrit(n1, n2, 0.05) };
}
function analyse(site, data) { const xs = data.map(d => d.t), ys = data.map(d => d.v), n = data.length, sp = spearman(xs, ys), c05 = spCrit(n, 0.05); return { desc: describe(ys), sp, c05, c01: spCrit(n, 0.01), sig: !!(sp && isFinite(c05) && Math.abs(sp.rs) >= c05), chi: chiSq(data), tt: tTest(data), mw: mannWhitney(data) }; }

// ---------------- e. The truth (a perfect survey of 3000 places) and many fieldtrips ----------------
const TRUTH = {};
function truth(site, p) {
  const key = [site, p.s, p.k, p.err, p.eye ? 1 : 0].join("|"); if (TRUTH[key]) return TRUTH[key];
  const S = SITES[site], r = K.rng(99), N = 3000; let sum = 0; for (let i = 0; i < N; i++) sum += placeMean(site, (i + r()) * S.L / N, r(), p.s);
  const r2 = K.rng(5), one = [], tt = []; for (let i = 0; i < N; i++) { const t = r2() * S.L, d = measureSite(site, { t, y: r2() }, p, r2); one.push(d.v); tt.push(t); }
  const r3 = K.rng(11), op = []; for (let i = 0; i < 800; i++) for (const q of placeSites(site, "opportunistic", S.access.length, r3)) op.push(measureSite(site, q, p, r3).v);
  const tmean = sum / N; return (TRUTH[key] = { tmean, sdOne: sdev(one), rsPop: spearman(tt, one).rs, opBias: mean(op) - tmean, bias: mean(one) - tmean });
}
const powerTheory = (rho, n) => { if (n < 5) return 0; const z = Math.atanh(clamp(rho, -0.999, 0.999)), se = Math.sqrt(1.06 / (n - 3)); return Phi(Math.abs(z) / se - 1.96) + Phi(-Math.abs(z) / se - 1.96); };   // Fisher's z, variance 1.06/(n − 3) for Spearman

// ---------------- The page ----------------
const DEF = { view: "trip", speed: 1, site: "beach", method: "random", n: 15, k: 10, err: 1, eye: false, s: 1, reveal: false, reveal2: false, seed: 1, test: "spearman" };
const P = Object.assign({}, DEF);
let data = [], data2 = [], shown = 0, acc = 0, own = [], trips = [], tAcc = 0, an = null;
const ui = K.app({
  title: "Fieldwork: Sampling and Statistics", subject: "Geography",
  blurb: "Sample a beach, a river or a town: random, systematic, stratified or opportunistic sites, then test your hypothesis with Spearman's rank, chi-squared and Student's t-test",
  reset: () => set({}),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel GCSE Geography A (1GA0) Component 3 fieldwork: hypotheses and null hypotheses; random, systematic, stratified and opportunistic sampling; mean, median, range, interquartile range; scatter graphs and lines of best fit; reliability. Spearman's rank is an extension.", adv: "Pearson Edexcel A level Geography (9GE0) Component 4 (NEA) and quantitative skills: sampling frameworks, standard deviation (÷ n) and standard error, Spearman's rank 2A(5), Student's t-test 2A(8), chi-squared 2B(10), significance, Type I and II errors and power. Mann–Whitney U is an alternative for non-normal data (not a specified exam technique)." } },
  missions: [
    { title: "Random sampling", q: "Sample 15 random sites along the beach. Does pebble size increase to the east? How close is your mean to the true mean?", hint: "The scatter graph rises to the east (longshore drift sorts the pebbles). Your mean is close to the truth but not exact: another trip would differ a little by chance.", setup() { set({ view: "trip", method: "random", n: 15 }); } },
    { title: "Systematic sampling", q: "Take a site every 1.5 km. What are its advantages over random sampling?", hint: "It covers the whole beach evenly, so the pattern shows clearly and no stretch is missed. It could be biased if the sites line up with a regular pattern (like groynes).", setup() { set({ view: "trip", method: "systematic", n: 12 }); } },
    { title: "Stratified sampling", q: "Take the same number of sites in each zone. Compare the box plots for the west, middle and east.", hint: "Every zone is represented equally, so you can compare them fairly; the medians rise from west to east and the boxes barely overlap.", setup() { set({ view: "trip", method: "stratified", n: 12 }); } },
    { title: "Opportunistic sampling", q: "Measure near the car parks. Reveal the true pattern. What has gone wrong?", hint: "The easy places are all at the western, small-pebble end: the mean is far too low (biased) and the pattern is hidden. Taking more sites the same way does not fix it.", setup() { set({ view: "trip", method: "opportunistic", n: 15, reveal: true }); } },
    { title: "Too few sites", q: "With only 5 sites, press New sites a few times. Is the Spearman result significant?", hint: "With n = 5, rs must be a perfect 1.000 to be significant at 0.05. A real but weak pattern is often missed with so few sites.", setup() { set({ view: "stats", test: "spearman", n: 5, s: 0.4 }); } },
    { title: "River width downstream", q: "Measure the width at 10 systematic sites. Does the Bradshaw model hold?", hint: "Width increases downstream (rs close to +1, significant): discharge grows as tributaries join.", setup() { set({ view: "stats", test: "spearman", site: "river", method: "systematic", n: 10, k: 3 }); } },
    { title: "Is your data reliable?", q: "Show a second group's readings of the same sites. Are they the same? How could you make them more reliable?", hint: "With only 3 rough measurements per site they differ a lot. Measure more items at each site, more carefully, and they agree better.", setup() { set({ view: "trip", n: 10, k: 3, err: 3, reveal2: true }); } },
    { title: "How many sites do you need?", q: "Run many fieldtrips on a weak pattern with 10 sites. What fraction find it? Try 30 sites.", hint: "Only about half find a significant result with 10 sites (the others make a Type II error); with 30 almost all do. That fraction is the test's power.", setup() { set({ view: "many", n: 10, s: 0.15 }); } },
    { lvl: "adv", title: "Chi-squared: shape and zone", q: "Is pebble shape linked to the zone? Work through O, E and Σ(O − E)²/E.", hint: "Expected E = row total × column total ÷ grand total. With 4 degrees of freedom the critical value at 0.05 is 9.49: above it, reject the null hypothesis.", setup() { set({ view: "stats", test: "chi", method: "stratified", n: 15 }); } },
    { lvl: "adv", title: "Student's t-test: centre and suburbs", q: "Does the mean environmental quality of the centre differ from the suburbs?", hint: "t = (x̄₁ − x̄₂) ÷ √(s₁²/n₁ + s₂²/n₂) with df = n₁ + n₂ − 2; compare |t| with the critical value (2.228 for df = 10 at 0.05).", setup() { set({ view: "stats", test: "tt", site: "town", method: "stratified", n: 18, k: 3 }); } },
    { lvl: "adv", title: "False alarms", q: "Set no pattern at all and run many trips. What fraction still find a 'significant' correlation?", hint: "About 5%: the 0.05 level means a 1 in 20 chance of a Type I error when the null hypothesis is true.", setup() { set({ view: "many", n: 15, s: 0 }); } }
  ],
  batch: [
    { title: "How close is one fieldtrip's mean?", question: "Many classes each sample 10 random sites on the beach. How spread out are their means?", how: "500 fieldtrips; 10 pebbles at each site.", yLabel: "mean pebble size (mm)", reps: 500, bins: 24, theory: truth("beach", Object.assign({}, DEF)).tmean, theoryLabel: "true mean", run: (x, r) => mean(collect("beach", Object.assign({}, DEF, { n: 10 }), Math.floor(r() * 1e9)).map(d => d.v)), note: "Centred on the true mean with SD close to (SD of one site) ÷ √10: the standard error. Random sampling is unbiased." },
    { title: "Does a bigger sample fix a biased method?", question: "How far is the opportunistic mean from the truth for more and more sites?", how: "Sites near the car parks; 20 trips at each sample size.", xLabel: "number of sites", yLabel: "error in the mean (mm)", xs: [5, 10, 15, 20, 30, 40], reps: 20, theory: () => truth("beach", Object.assign({}, DEF)).opBias, theoryLabel: "method bias", run: (n, r) => mean(collect("beach", Object.assign({}, DEF, { method: "opportunistic", n: Math.round(n) }), Math.floor(r() * 1e9)).map(d => d.v)) - truth("beach", Object.assign({}, DEF)).tmean, note: "The error stays about the same however many sites you take: a biased method stays biased. Only the scatter shrinks." },
    { title: "How many sites to find a real pattern?", question: "With a weak pattern, what fraction of fieldtrips find a significant Spearman's rank correlation?", how: "Strength 0.15, random sites; each point is the share of 40 trips that are significant at 0.05.", xLabel: "number of sites", yLabel: "share significant", xs: [6, 10, 15, 20, 30, 40], reps: 3, yMin: 0, yMax: 1, theory: n => powerTheory(truth("beach", Object.assign({}, DEF, { s: 0.15 })).rsPop, Math.round(n)), theoryLabel: "power (Fisher z)", run: (n, r) => { let k = 0; for (let i = 0; i < 40; i++) if (analyse("beach", collect("beach", Object.assign({}, DEF, { s: 0.15, n: Math.round(n) }), Math.floor(r() * 1e9))).sig) k++; return k / 40; }, note: "The power rises with the number of sites: with 6 only a few trips find the pattern (Type II errors), with 30 or more almost all do. The formula is rough for very small samples." },
    { title: "False alarms when there is no pattern (A level)", question: "When there is no real pattern, what fraction of fieldtrips find a 'significant' correlation?", how: "Strength 0 (no trend at all); each point is the share of 40 trips significant at 0.05.", xLabel: "number of sites", yLabel: "share significant", xs: [6, 10, 15, 20, 30], reps: 5, yMin: 0, yMax: 0.25, theory: () => 0.05, theoryLabel: "0.05", run: (n, r) => { let k = 0; for (let i = 0; i < 40; i++) if (analyse("beach", collect("beach", Object.assign({}, DEF, { s: 0, n: Math.round(n) }), Math.floor(r() * 1e9))).sig) k++; return k / 40; }, note: "About 5% at every sample size: the significance level is the chance of a Type I error." },
    { title: "Stratified or random: which is more precise?", question: "How far is the mean from the truth with stratified sampling, for different numbers of sites?", how: "Stratified sites (equal numbers per zone); 30 trips each. The SD column is the typical error.", xLabel: "number of sites", yLabel: "error in the mean (mm)", xs: [6, 9, 12, 18, 24, 30, 45], reps: 30, theory: () => 0, theoryLabel: "unbiased", run: (n, r) => mean(collect("beach", Object.assign({}, DEF, { method: "stratified", n: Math.round(n) }), Math.floor(r() * 1e9)).map(d => d.v)) - truth("beach", Object.assign({}, DEF)).tmean, note: "Unbiased, and the spread falls as 1 ÷ √n; it is about half that of random sampling, because each zone is always represented." },
    { title: "Chi-squared when there is no link (A level)", question: "If pebble shape is not linked to the zone, what values of chi-squared do fieldtrips get?", how: "Strength 0, 15 stratified sites × 10 pebbles; 400 trips.", yLabel: "χ²", reps: 400, bins: 24, theory: 4, theoryLabel: "df = 4", run: (x, r) => { const c = chiSq(collect("beach", Object.assign({}, DEF, { s: 0, method: "stratified" }), Math.floor(r() * 1e9))); return c ? c.chi : 0; }, note: "The mean is about the degrees of freedom (4) and about 5% are above the critical value 9.49." },
    { title: "Student's t-test when there is no difference (A level)", question: "If the centre and suburbs do not differ, what values of t do fieldtrips get?", how: "Town, strength 0, 18 stratified sites (6 per zone), centre against suburbs, SDs dividing by n; 500 trips.", yLabel: "t", reps: 500, bins: 24, theory: 0, theoryLabel: "no difference", run: (x, r) => { const t = tTest(collect("town", Object.assign({}, DEF, { site: "town", s: 0, method: "stratified", n: 18, k: 3 }), Math.floor(r() * 1e9))); return t.ok ? t.t : 0; }, note: "Close to 0 (the fixed local differences between the two zones shift it slightly) with an SD a little above 1 (about 1.2 with 6 sites in each group); dividing the SDs by n makes t slightly bigger than the textbook version, so about 7% pass ±2.228." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "C3", text: "A hypothesis predicts a pattern; the null hypothesis says there is none. Sampling: random (equal chance), systematic (regular intervals), stratified (in proportion to each zone), opportunistic (convenient but biased)." },
      { lvl: "std", tag: "C3", text: "Mean, median, mode, range and interquartile range (UQ − LQ) describe data; a scatter graph with a line of best fit shows a relationship. Reliable data would be the same if repeated." },
      { lvl: "std", tag: "ext", text: "Spearman's rank: rs = 1 − 6Σd² ÷ (n³ − n), from −1 to +1. Significant if |rs| ≥ the critical value for n at 0.05." },
      { lvl: "adv", tag: "QS", text: "Standard error = SD ÷ √n. A biased method is not fixed by a bigger sample. Significance 0.05: a 5% chance of a Type I error (rejecting a true null). A Type II error misses a real pattern; power = 1 − P(Type II)." },
      { lvl: "adv", tag: "2B(10)", text: "Chi-squared Σ(O − E)²/E with E = row total × column total ÷ N, df = (rows − 1)(columns − 1); each E should be at least 5." },
      { lvl: "adv", tag: "2A(8)", text: "Student's t-test: t = (x̄₁ − x̄₂) ÷ √(s₁²/n₁ + s₂²/n₂), df = n₁ + n₂ − 2; compare |t| with the two-tailed critical value." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: "Explain one advantage and one disadvantage of opportunistic sampling.", ans: "<ul><li>advantage: quick, easy and safe (near car parks and paths)</li><li>disadvantage: biased: the places are not typical of the whole site</li></ul>" },
      { lvl: "std", marks: 3, q: () => an && an.desc ? `Your ${an.desc.n} sites have a median of ${an.desc.median.toFixed(1)} and quartiles ${an.desc.LQ.toFixed(1)} and ${an.desc.UQ.toFixed(1)}. Calculate the interquartile range and say what it shows.` : "Collect some data first, then come back.", ans: () => an && an.desc ? `<ul><li>IQR = UQ − LQ = ${an.desc.UQ.toFixed(1)} − ${an.desc.LQ.toFixed(1)}</li><li>= ${an.desc.IQR.toFixed(1)} ${SITES[P.site].unit}</li><li>the spread of the middle half of the data (not affected by extreme values)</li></ul>` : "" },
      { lvl: "std", marks: 3, q: () => an && an.sp ? `Your Spearman's rank is rs = ${an.sp.rs.toFixed(3)} with ${an.sp.n} sites (critical value ${isFinite(an.c05) ? an.c05.toFixed(3) : "–"} at 0.05). What can you conclude?` : "Collect at least 5 sites first.", ans: () => an && an.sp ? `<ul><li>${an.sig ? "|rs| ≥ the critical value, so the correlation is significant at 0.05" : "|rs| is below the critical value, so it is not significant at 0.05"}</li><li>${an.sig ? "reject the null hypothesis: there is a " + (an.sp.rs > 0 ? "positive" : "negative") + " relationship" : "we cannot reject the null hypothesis (it could be chance)"}</li><li>only a 5% chance of a result this strong by chance</li></ul>` : "" },
      { lvl: "adv", marks: 4, q: () => an && an.tt && an.tt.ok ? `Group 1: mean ${an.tt.m1.toFixed(2)}, SD ${an.tt.s1.toFixed(2)}, n = ${an.tt.n1}. Group 2: mean ${an.tt.m2.toFixed(2)}, SD ${an.tt.s2.toFixed(2)}, n = ${an.tt.n2}. Calculate t and say whether the difference is significant at 0.05.` : "Use stratified sampling so both end zones have at least 2 sites.", ans: () => an && an.tt && an.tt.ok ? `<ul><li>t = (x̄₁ − x̄₂) ÷ √(s₁²/n₁ + s₂²/n₂)</li><li>= ${an.tt.t.toFixed(2)}</li><li>df = ${an.tt.df}, critical value ${an.tt.c05}</li><li>${an.tt.sig ? "|t| ≥ critical: significant, reject the null hypothesis" : "|t| < critical: not significant"}</li></ul>` : "" }
    ]
  },
  notes: `<h3>The models</h3>
<ul><li>Each place's true value is a trend along the site (scaled by the strength) with smooth local differences that are the same every visit; each item measured there differs at random (pebbles lognormal, SD 35%; widths 10%; EQS ±3 points), then measuring error; picking by eye adds +25% (or +3 points).</li>
<li>Sampling: random places; systematic every L/n from a random start; stratified equal numbers in each third; opportunistic close to the car parks, bridges or station.</li>
<li>Statistics: quartiles at (n + 1)/4; SD dividing by n (Pearson's worked method); Spearman's rank with ties averaged and critical values from Zar (1972) (above n = 30 from t); chi-squared 3 × 3 with a warning when E < 5; Student's t-test (first and last zones) with Edexcel's formula and critical values from the t distribution; Mann–Whitney U with exact critical values.</li>
<li>The truth comes from a perfect survey of 3000 places; power from Fisher's z with variance 1.06/(n − 3).</li></ul>
<h3>Left out</h3><ul><li>Weather, tides, time of day, safety and access; real sites are messier. All sites are illustrative (the beach is inspired by Chesil Beach).</li></ul>
<p>The earlier version of this simulation and its worksheets are kept in <a href="original/fieldwork-sampling.html">original/fieldwork-sampling.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {}, grp = {};
let gg = ui.group("View");
ctl.view = K.seg(gg, { value: "trip", options: [["trip", "🗺 fieldtrip"], ["stats", "📊 statistics"], ["many", "🎲 many fieldtrips"]], on: v => { P.view = v; showGroups(); if (v === "many") trips = []; } });
ctl.speed = K.slider(gg, { label: "Speed", min: 0.5, max: 20, step: 0.5, value: 1, fmt: v => v + "×", on: v => P.speed = v });
gg = ui.group("Your fieldwork");
ctl.site = K.seg(gg, { value: "beach", options: Object.keys(SITES).map(k => [k, SITES[k].name.split(" (")[0].split(":")[0]]), on: v => { P.site = v; own = []; newTrip(); } });
ctl.method = K.seg(gg, { value: "random", options: [["random", "random"], ["systematic", "systematic"], ["stratified", "stratified"], ["opportunistic", "opportunistic"], ["own", "your own (click the map)"]], on: v => { P.method = v; newTrip(); } });
ctl.n = K.slider(gg, { label: "Number of sites", min: 3, max: 45, step: 1, value: 15, on: v => { P.n = v; newTrip(); } });
ctl.k = K.slider(gg, { label: "Items measured at each site", min: 1, max: 30, step: 1, value: 10, on: v => { P.k = v; newTrip(); } });
ctl.err = K.slider(gg, { label: "Measuring error", min: 0, max: 5, step: 0.5, value: 1, fmt: v => v ? "× " + v : "perfect", on: v => { P.err = v; newTrip(); } });
ctl.s = K.slider(gg, { label: "Strength of the real pattern", min: 0, max: 1.5, step: 0.05, value: 1, fmt: v => v ? "× " + v.toFixed(2) : "no pattern", on: v => { P.s = v; newTrip(); } });
ctl.eye = K.toggle(gg, { label: "Pick items by eye (biased)", value: false, on: v => { P.eye = v; newTrip(); } });
ctl.reveal = K.toggle(gg, { label: "Show the true pattern", value: false, on: v => P.reveal = v });
ctl.reveal2 = K.toggle(gg, { label: "Show a second group's readings (reliability)", value: false, on: v => { P.reveal2 = v; newTrip(); } });
let rr = K.row(gg); K.btn(rr, "🎲 New sites", () => { P.seed = Math.floor(Math.random() * 1e6) + 2; newTrip(); }, "primary"); K.btn(rr, "↶ Undo my last site", () => { own.pop(); newTrip(); });
grp.stats = gg = ui.group("Statistical test");
ctl.test = K.seg(gg, { value: "spearman", options: [["spearman", "Spearman's rank"], ["desc", "mean, median, IQR"], ["chi", "chi-squared (A level)"], ["tt", "Student's t (A level)"], ["mw", "Mann–Whitney U (A level)"]], on: v => P.test = v });
const read = K.readout(ui.group("Readings"), [["a", ""], ["b", ""], ["c", ""], ["d", ""], ["e", ""]]);
const relabel = names => names.forEach((n, i) => read.el.children[i].firstElementChild.textContent = n);
function showGroups() { grp.stats.style.display = P.view === "stats" ? "" : "none"; }
function newTrip() { data = collect(P.site, P, P.seed, own); data2 = P.reveal2 ? collect(P.site, P, P.seed, own).map((d, i) => measureSite(P.site, d, P, K.rng(P.seed * 13 + i))) : []; shown = P.view === "trip" ? 0 : data.length; acc = 0; trips = []; an = analyse(P.site, data.slice(0, shown)); }
function set(o) {
  Object.assign(P, DEF, o); own = [];
  for (const k of ["speed", "n", "k", "err", "s"]) ctl[k].set(P[k]);
  for (const k of ["site", "method", "eye", "reveal", "reveal2", "test", "view"]) ctl[k].set(P[k]);
  newTrip(); showGroups();
}

// ---------------- Simulation: sites revealed 2 a second; many fieldtrips 10 a second ----------------
function tick(dt) {
  const s = dt * P.speed;
  if (P.view === "trip" && shown < data.length) { acc += s * 2; while (acc >= 1 && shown < data.length) { acc--; shown++; } }
  if (P.view !== "trip") shown = data.length;
  if (P.view === "many" && trips.length < 2000) { tAcc += s * 10; while (tAcc >= 1) { tAcc--; const d = collect(P.site, P, Math.floor(Math.random() * 1e9), own); if (d.length >= 3) { const a = analyse(P.site, d); trips.push({ m: mean(d.map(x => x.v)), rs: a.sp ? a.sp.rs : 0, sig: a.sig }); } } }
  an = analyse(P.site, data.slice(0, shown));
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
const ZCOL = ["#00aec3", "#f1af28", "#a86dab"];
const geom = (w, h) => ({ x0: 40, x1: w - 40, y0: 110, y1: Math.min(h - 40, 110 + (w - 80) * 0.22) });
function drawMap(c, w, h, bare) {
  const S = SITES[P.site], G = geom(w, h), X = t => G.x0 + (G.x1 - G.x0) * t / S.L, Y = y => G.y0 + (G.y1 - G.y0) * y;
  // the place: beach (sea above, shingle), river (a channel widening downstream) or town (streets, buildings thinning out)
  if (P.site === "beach") { c.fillStyle = "#1e4a7a"; c.fillRect(G.x0, G.y0 - 50, G.x1 - G.x0, 50); for (let i = 0; i < 80; i++) { const t = i / 80 * S.L; c.fillStyle = "#b8a888"; c.fillRect(X(t), G.y0, (G.x1 - G.x0) / 80 + 1, G.y1 - G.y0); } }
  else if (P.site === "river") { c.fillStyle = "#3a5a3c"; c.fillRect(G.x0, G.y0, G.x1 - G.x0, G.y1 - G.y0); c.fillStyle = "#3a7ad0"; c.beginPath(); for (let i = 0; i <= 60; i++) { const t = i / 60 * S.L, wd = 4 + 30 * t / S.L; c.lineTo(X(t), (G.y0 + G.y1) / 2 - wd / 2 + 10 * Math.sin(i / 5)); } for (let i = 60; i >= 0; i--) { const t = i / 60 * S.L, wd = 4 + 30 * t / S.L; c.lineTo(X(t), (G.y0 + G.y1) / 2 + wd / 2 + 10 * Math.sin(i / 5)); } c.fill(); }
  else { c.fillStyle = "#2a2f3a"; c.fillRect(G.x0, G.y0, G.x1 - G.x0, G.y1 - G.y0); for (let i = 0; i < 50; i++) for (let j = 0; j < 6; j++) { const t = (i + 0.5) / 50 * S.L, dens = 1 - 0.6 * i / 50; if (((i * 7 + j * 13) % 10) / 10 < dens) { c.fillStyle = i < 15 ? "#7a6a5a" : "#5a6a5a"; c.fillRect(X(t) - 5, Y((j + 0.5) / 6) - 5, 10, 10); } } c.fillStyle = "#555b66"; c.fillRect(G.x0, Y(0.08), G.x1 - G.x0, 6); }
  for (let z = 1; z < 3; z++) { c.strokeStyle = "rgba(255,255,255,.4)"; c.setLineDash([5, 4]); c.beginPath(); c.moveTo(X(z * S.L / 3), G.y0 - 8); c.lineTo(X(z * S.L / 3), G.y1 + 8); c.stroke(); c.setLineDash([]); }
  S.zones.forEach((zn, z) => TX(c, zn, X((z + 0.5) * S.L / 3), G.y1 + 22, ZCOL[z], "center", "600 12px"));
  S.access.forEach((a, i) => { c.fillStyle = "#fff"; c.fillRect(X(a) - 6, G.y1 - 6, 12, 12); TX(c, "P " + S.accessName[i], X(a), G.y1 + 40, "#cfd8ea", "center", "11px"); });
  // the sites, coloured by value
  const vals = data.map(d => d.v), lo = Math.min(...vals), hi = Math.max(...vals);
  data.slice(0, shown).forEach((d, i) => { const f = hi > lo ? (d.v - lo) / (hi - lo) : 0.5; c.fillStyle = `rgb(${Math.round(80 + 175 * f)},${Math.round(200 - 80 * f)},${Math.round(255 - 200 * f)})`; c.beginPath(); c.arc(X(d.t), Y(d.y), 7, 0, 6.3); c.fill(); c.strokeStyle = "#0b1020"; c.stroke(); if (i === shown - 1) { c.strokeStyle = "#fff"; c.lineWidth = 2; c.beginPath(); c.arc(X(d.t), Y(d.y), 11, 0, 6.3); c.stroke(); c.lineWidth = 1; } });
  if (bare) return;
  TX(c, `${S.name} · ${S.L} km · ${P.method === "own" ? "your own sites (click the map)" : P.method + " sampling"} · ${shown} of ${data.length} sites`, 14, 26, "#eef2f8", "left", "600 14px");
  TX(c, `Hypothesis: ${S.hyp}`, 14, 48, "#ffd166", "left", "12.5px"); TX(c, `Null hypothesis: ${S.h0}`, 14, 66, "#cfd8ea", "left", "12px");
  const T = truth(P.site, P), A = an && an.desc;
  if (A) TX(c, `your mean ${A.mean.toFixed(1)} ${S.unit}${P.reveal ? ` · true mean ${T.tmean.toFixed(1)} ${S.unit}` : ""}${an.sp ? ` · Spearman rs ${an.sp.rs.toFixed(2)} ${an.sig ? "(significant at 0.05)" : "(not significant)"}` : ""}`, 14, h - 16, "#7ee787", "left", "600 13px");
}
function drawStats(c, w, h) {
  const S = SITES[P.site], adv = ui.level === "adv", D = data.slice(0, shown); let y = 30; const L = (s, col = "#cfd8ea", f = "12.5px") => { TX(c, s, 16, y, col, "left", f); y += 20; };
  L(`${S.name} · ${D.length} sites · ${S.what} (${S.unit})`, "#eef2f8", "600 15px");
  const t = (P.test === "chi" || P.test === "tt" || P.test === "mw") && !adv ? "spearman" : P.test;
  if (t === "spearman") {
    L("Spearman's rank: rank distance and value, d = difference in ranks, rs = 1 − 6Σd² ÷ (n³ − n)", "#ffd166");
    if (an.sp) { const rows = D.slice(0, 18); TX(c, "site   distance (km)   rank   value   rank     d      d²", 16, y, "#8fa0bf", "left", "12px monospace"); y += 18; rows.forEach((d, i) => { const rx = an.sp.rx[i], ry = an.sp.ry[i]; TX(c, `${String(i + 1).padStart(3)}   ${d.t.toFixed(2).padStart(9)}   ${rx.toFixed(1).padStart(6)}  ${d.v.toFixed(1).padStart(6)}  ${ry.toFixed(1).padStart(5)}  ${(rx - ry).toFixed(1).padStart(5)}  ${((rx - ry) ** 2).toFixed(2).padStart(6)}`, 16, y, "#cfd8ea", "left", "12px monospace"); y += 16; }); if (D.length > 18) L(`… and ${D.length - 18} more sites`, "#8fa0bf", "11.5px"); y += 6;
      L(`Σd² = ${an.sp.d2.toFixed(1)} · n = ${an.sp.n} · rs = 1 − 6 × ${an.sp.d2.toFixed(1)} ÷ (${an.sp.n}³ − ${an.sp.n}) = ${an.sp.rs.toFixed(3)}`, "#eef2f8", "600 13px");
      L(isFinite(an.c05) ? `critical value at 0.05: ${an.c05.toFixed(3)}${isFinite(an.c01) ? ` · at 0.01: ${an.c01.toFixed(3)}` : ""} → ${an.sig ? "SIGNIFICANT: reject the null hypothesis" : "not significant: cannot reject the null hypothesis"}` : "fewer than 5 sites: no critical value", an.sig ? "#7ee787" : "#ff8a70", "600 13px"); }
    else L("Collect at least 3 sites.", "#ff8a70");
  } else if (t === "desc") {
    const A = an.desc; if (!A) { L("No data yet."); return; }
    L("Describing the data: middle and spread", "#ffd166");
    L(`mean = Σx ÷ n = ${A.mean.toFixed(2)} ${S.unit}`); L(`median (the ((n + 1) ÷ 2)th value) = ${A.median.toFixed(2)}`); L(`range = ${A.max.toFixed(1)} − ${A.min.toFixed(1)} = ${A.range.toFixed(2)}`);
    L(`lower quartile (the ((n + 1) ÷ 4)th value) = ${A.LQ.toFixed(2)} · upper quartile = ${A.UQ.toFixed(2)} · IQR = ${A.IQR.toFixed(2)}`);
    if (adv) { L(`standard deviation (÷ n) = ${A.sd.toFixed(2)} · standard error = SD ÷ √n = ${(A.sd / Math.sqrt(A.n)).toFixed(2)}`, "#c58aff"); }
    L(`sorted: ${D.map(d => d.v).sort((a, b) => a - b).map(v => v.toFixed(1)).join(", ")}`, "#8fa0bf", "11.5px");
  } else if (t === "chi") {
    const X = an.chi; if (!X) { L("Need sites in at least two zones."); return; }
    L(`Chi-squared: is ${S.catName} linked to the zone? E = row total × column total ÷ N`, "#ffd166");
    TX(c, "zone            " + S.cats.map(s => s.slice(0, 12).padStart(14)).join("") + "    total", 16, y, "#8fa0bf", "left", "12px monospace"); y += 18;
    S.zones.forEach((z, i) => { TX(c, z.padEnd(16) + [0, 1, 2].map(j => `${X.O[i][j]} (${X.E[i][j].toFixed(1)})`.padStart(14)).join("") + String(X.rows[i]).padStart(9), 16, y, ZCOL[i], "left", "12px monospace"); y += 18; });
    y += 6; L("observed (expected) counts", "#8fa0bf", "11.5px");
    L(`χ² = Σ(O − E)² ÷ E = ${X.chi.toFixed(2)} · df = (3 − 1)(3 − 1) = ${X.df} · critical value at 0.05 = ${X.c05}${X.small ? ` · warning: ${X.small} expected values below 5` : ""}`, "#eef2f8", "600 13px");
    L(X.chi >= X.c05 ? "SIGNIFICANT: reject the null hypothesis (shape is linked to the zone)" : "not significant: no evidence of a link", X.chi >= X.c05 ? "#7ee787" : "#ff8a70", "600 13px");
  } else if (t === "tt") {
    const T = an.tt; if (!T.ok) { L("Need at least 2 sites in the first and last zones (use stratified sampling)."); return; }
    L(`Student's t-test: ${S.zones[0]} against ${S.zones[2]}`, "#ffd166");
    L(`group 1 (${S.zones[0]}): n₁ = ${T.n1}, mean x̄₁ = ${T.m1.toFixed(2)}, SD s₁ (÷ n) = ${T.s1.toFixed(2)}`, ZCOL[0]); L(`group 2 (${S.zones[2]}): n₂ = ${T.n2}, mean x̄₂ = ${T.m2.toFixed(2)}, SD s₂ (÷ n) = ${T.s2.toFixed(2)}`, ZCOL[2]);
    L(`t = (x̄₁ − x̄₂) ÷ √(s₁²/n₁ + s₂²/n₂) = (${T.m1.toFixed(2)} − ${T.m2.toFixed(2)}) ÷ √(${(T.s1 ** 2 / T.n1).toFixed(3)} + ${(T.s2 ** 2 / T.n2).toFixed(3)}) = ${T.t.toFixed(3)}`, "#eef2f8", "600 13px");
    L(`df = n₁ + n₂ − 2 = ${T.df} (check against an Edexcel mark scheme) · critical value at 0.05: ${T.c05} · at 0.01: ${T.c01}`);
    L(T.sig ? "SIGNIFICANT: reject the null hypothesis (the means differ)" : "not significant: cannot reject the null hypothesis", T.sig ? "#7ee787" : "#ff8a70", "600 13px");
  } else {
    const M = an.mw; if (!M.ok) { L("Need at least 2 sites in the first and last zones."); return; }
    L(`Mann–Whitney U (ranks, for non-normal data; not a specified 9GE0 exam test): ${S.zones[0]} against ${S.zones[2]}`, "#ffd166");
    L(`n₁ = ${M.n1}, n₂ = ${M.n2} · rank sums R₁ = ${M.R1}, R₂ = ${M.R2}`); L(`U₁ = n₁n₂ + n₁(n₁ + 1)/2 − R₁; U = the smaller of U₁ and n₁n₂ − U₁ = ${M.U}`, "#eef2f8", "600 13px");
    L(isFinite(M.crit) ? `critical value at 0.05: ${M.crit} (significant if U ≤ it) → ${M.U <= M.crit ? "SIGNIFICANT" : "not significant"}` : "groups too small for a critical value", isFinite(M.crit) && M.U <= M.crit ? "#7ee787" : "#ff8a70", "600 13px");
  }
}
function drawMany(c, w, h) {
  const T = truth(P.site, P), n = trips.length, sig = trips.filter(q => q.sig).length;
  TX(c, `${n} fieldtrips with the same plan: ${P.n} ${P.method} sites, ${P.k} ${SITES[P.site].item} each`, 14, 28, "#eef2f8", "left", "600 15px");
  TX(c, `${n ? (100 * sig / n).toFixed(1) : 0}% found a significant correlation at 0.05${P.s === 0 ? " (false alarms: Type I errors)" : ` (power; theory ${(100 * powerTheory(T.rsPop, Math.round(P.n))).toFixed(0)}%)`}`, 14, 52, P.s === 0 ? "#ff8a70" : "#7ee787", "left", "600 14px");
  if (n > 1) { const ms = trips.map(q => q.m); TX(c, `means: average ${mean(ms).toFixed(2)} (true ${T.tmean.toFixed(2)}), spread SD ${sdev(ms).toFixed(2)} (random sampling theory: SD of one site ÷ √n = ${(T.sdOne / Math.sqrt(P.n)).toFixed(2)})`, 14, 76, "#cfd8ea", "left", "13px"); }
  c.save(); c.translate(0, 30); c.globalAlpha = 0.45; drawMap(c, w, h - 30, true); c.restore();   // the site in the background
}
function draw() { const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); ({ trip: drawMap, stats: drawStats, many: drawMany })[P.view](c, w, h); }
K.pointer(cv.el, { down: p => { if (P.method !== "own" || P.view !== "trip") return; const S = SITES[P.site], G = geom(cv.w, cv.h); if (p.x < G.x0 || p.x > G.x1 || p.y < G.y0 || p.y > G.y1) return; own.push({ t: (p.x - G.x0) / (G.x1 - G.x0) * S.L, y: (p.y - G.y0) / (G.y1 - G.y0) }); own.sort((a, b) => a.t - b.t); newTrip(); shown = data.length; an = analyse(P.site, data); } });

// ---------------- Charts and readings ----------------
function charts() {
  const S = SITES[P.site], adv = ui.level === "adv", D = data.slice(0, shown), T = truth(P.site, P);
  if (P.view !== "many") {
    const pts = D.map(d => [d.t, d.v]), series = [{ pts: pts.length ? pts : [[0, 0]], type: "dots", r: 5, color: "#ffd166", label: "your sites" }];
    if (pts.length >= 2) { const f = K.linfit(pts); series.push({ pts: [[0, f.c], [S.L, f.c + f.m * S.L]], color: "#7ee787", label: "line of best fit" }); }
    if (P.reveal) { const tr = []; for (let i = 0; i <= 60; i++) { const t = i / 60 * S.L; let s = 0; for (let j = 0; j < 8; j++) s += placeMean(P.site, t, (j + 0.5) / 8, P.s); tr.push([t, s / 8]); } series.push({ pts: tr, color: "#5ad1ff", dash: [4, 3], label: "true pattern" }); }
    if (P.reveal2 && data2.length) series.push({ pts: data2.slice(0, shown).map(d => [d.t, d.v]), type: "dots", r: 4, color: "#e83181", label: "second group" });
    chA.opts.title = "Scatter graph"; chA.opts.xLabel = "distance (km)"; chA.opts.yLabel = `${S.what} (${S.unit})`; chA.draw(series, { xMin: 0, xMax: S.L });
    // box plots by zone (min, LQ, median, UQ, max)
    const bx = []; for (let z = 0; z < 3; z++) { const v = D.filter(d => d.zone === z).map(d => d.v); const A = describe(v); if (!A) continue; bx.push({ pts: [[z, A.LQ], [z, A.UQ]], color: ZCOL[z], width: 18, label: S.zones[z] }, { pts: [[z, A.min], [z, A.max]], color: ZCOL[z], width: 1.5 }, { pts: [[z - 0.22, A.median], [z + 0.22, A.median]], color: "#fff", width: 2.5 }); }
    chB.opts.title = "Box plots by zone"; chB.opts.xLabel = S.zones.map((z, i) => i + " " + z).join(" · "); chB.opts.yLabel = S.unit; chB.draw(bx.length ? bx : [{ pts: [[0, 0]], type: "dots", r: 0 }], { xMin: -0.6, xMax: 2.6 });
    const A = an.desc; relabel(["sites so far", "mean", "median (IQR)", "Spearman's rs", adv ? "SD (÷ n) and standard error" : "true mean (when shown)"]);
    read.set("a", String(D.length)); read.set("b", A ? A.mean.toFixed(2) + " " + S.unit : "–"); read.set("c", A ? `${A.median.toFixed(1)} (${A.IQR.toFixed(1)})` : "–"); read.set("d", an.sp ? an.sp.rs.toFixed(3) + (an.sig ? " ✓ significant" : " (not significant)") : "–");
    read.set("e", adv ? (A ? `${A.sd.toFixed(2)}, ${(A.sd / Math.sqrt(A.n)).toFixed(2)}` : "–") : P.reveal ? T.tmean.toFixed(2) + " " + S.unit : "hidden");
  } else {
    const ms = trips.map(q => q.m), rss = trips.map(q => q.rs);
    if (ms.length > 1) { const lo = Math.min(...ms), hi = Math.max(...ms), hgm = K.histogram(ms, 24, lo, hi + 1e-9); chA.opts.title = "Each trip's mean"; chA.opts.xLabel = S.unit; chA.opts.yLabel = "trips"; chA.draw([{ pts: hgm.pts, w: hgm.w, type: "bars", color: "#5ad1ff", label: "trips" }], { yMin: 0, vlines: [{ x: T.tmean, color: "#7ee787", label: "true mean" }] }); }
    if (rss.length > 1) { const hgr = K.histogram(rss, 24, -1, 1); chB.opts.title = "Each trip's Spearman rs"; chB.opts.xLabel = "rs"; chB.opts.yLabel = "trips"; const cr = spCrit(Math.round(P.n), 0.05); chB.draw([{ pts: hgr.pts, w: hgr.w, type: "bars", color: "#ffd166", label: "trips" }], { xMin: -1, xMax: 1, yMin: 0, vlines: isFinite(cr) ? [{ x: cr, color: "#ff6b6b", label: "critical" }, { x: -cr, color: "#ff6b6b" }] : [] }); }
    relabel(["fieldtrips", "share significant", "spread of the means (SD)", "standard error (random sampling)", "whole-site rs"]);
    read.set("a", String(trips.length)); read.set("b", trips.length ? (100 * trips.filter(q => q.sig).length / trips.length).toFixed(1) + "%" : "–"); read.set("c", ms.length > 1 ? sdev(ms).toFixed(2) : "–"); read.set("d", (T.sdOne / Math.sqrt(P.n)).toFixed(2)); read.set("e", T.rsPop.toFixed(2));
  }
}
ui.hud("");
let frame = 0;
ui.run(dt => { if (dt > 0) tick(dt); }, () => { draw(); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("Three views: a fieldtrip, the statistics, and many fieldtrips.", 6000);
