/* =====================================================================
   SAMPLING AND DATA
   The POPULATION here is every day from 1 May to 31 October (184 days)
   at one weather station in one year, like the Edexcel large data set.
   Measuring every day is a CENSUS; picking some of them is a SAMPLE.
     simple random : every day equally likely (numbered, random numbers)
     systematic    : every k-th day from a random start (k = N ÷ n)
     stratified    : the same fraction of each month (the strata)
     quota         : n/6 days from each month, the first ones found
     opportunity   : whatever is easiest (days in a row in the summer holidays)
   Then the sample is summarised:
     location: mean x̄ = Σx/n, median, mode
     spread  : variance σ² = Σ(x − x̄)²/n = Σx²/n − x̄², σ, range, IQR
     outliers: below Q1 − 1.5×IQR or above Q3 + 1.5×IQR (or x̄ ± 2σ)
   and drawn as box plots, histograms (frequency density) and
   cumulative frequency graphs.
   ===================================================================== */

// ---------------- 1. An illustrative "large data set" ----------------
const MONTHS = ["May", "Jun", "Jul", "Aug", "Sep", "Oct"], MLEN = [31, 30, 31, 31, 30, 31], N = 184;
const MSTART = MLEN.reduce((a, l, i) => (a.push(i ? a[i - 1] + MLEN[i - 1] : 0), a), []);
const monthOf = d => { let m = 0; while (m < 5 && d >= MSTART[m + 1]) m++; return m; };
const dateOf = d => { const m = monthOf(d); return `${d - MSTART[m] + 1} ${MONTHS[m]}`; };
// Each station's typical climate (made up but realistic): mean summer temperature, seasonal swing, rain chance and size, sunshine, gusts
const STATIONS = {
  camborne: { name: "Camborne", T: 14.5, A: 3.2, pr: 0.55, rm: 4.5, sun: 6, gust: 30 },
  heathrow: { name: "Heathrow", T: 16.5, A: 4.6, pr: 0.42, rm: 4, sun: 6.4, gust: 24 },
  hurn: { name: "Hurn", T: 15.3, A: 4.0, pr: 0.45, rm: 4.6, sun: 6.5, gust: 25 },
  leeming: { name: "Leeming", T: 14.0, A: 4.0, pr: 0.48, rm: 3.6, sun: 5, gust: 25 },
  leuchars: { name: "Leuchars", T: 13.0, A: 3.6, pr: 0.5, rm: 3.4, sun: 5.2, gust: 27 },
  beijing: { name: "Beijing", T: 23.0, A: 8.5, pr: 0.3, rm: 12, sun: 7.2, gust: 22 },
  jacksonville: { name: "Jacksonville", T: 26.0, A: 3.5, pr: 0.45, rm: 9, sun: 8, gust: 23 },
  perth: { name: "Perth", T: 15.5, A: -2.5, pr: 0.45, rm: 5, sun: 6.5, gust: 30 },
};
const VARS = {
  temp: { name: "Daily mean temperature", unit: "°C", dp: 1 },
  rain: { name: "Daily total rainfall", unit: "mm", dp: 1 },
  sun: { name: "Daily total sunshine", unit: "hours", dp: 1 },
  gust: { name: "Daily maximum gust", unit: "knots", dp: 0 },
};
const cache = {};
// Builds one station-year. Values are fixed for each station and year (seeded), so the "population" never changes.
function population(st, yr) {
  const key = st + yr; if (cache[key]) return cache[key];
  const S = STATIONS[st], r = K.rng((st.length * 7919 + yr * 31) >>> 0), out = []; let e = 0, wet = false;
  for (let d = 0; d < N; d++) {
    const season = Math.cos(2 * Math.PI * (d - 80) / 365);                 // warmest about late July
    e = 0.7 * e + Math.sqrt(1 - 0.49) * 2.1 * r.gauss();                    // weather spells: one day is like the day before
    wet = r() < (wet ? Math.min(0.9, S.pr + 0.2) : Math.max(0.05, S.pr - 0.15)) * (1 + 0.3 * (1 - season));
    const temp = S.T + S.A * season + (yr === 1987 ? -0.6 : 0) + e;
    let rain = wet ? -Math.log(1 - r()) * S.rm * (0.6 + 0.6 * (1 - season)) : 0;
    let rainCode = rain;                                                     // "tr" = trace (under 0.05 mm) is stored as −1
    if (wet && r() < 0.15) rainCode = -1;
    const sun = Math.max(0, Math.min(15.5, (wet ? 0.45 : 1.25) * S.sun * (0.75 + 0.35 * season) + 1.8 * r.gauss()));
    const gust = Math.max(6, Math.round(S.gust * (wet ? 1.15 : 0.9) + 6 * r.gauss() + (r() < 0.02 ? 25 : 0)));
    const missing = r() < 0.025;                                             // "n/a": a broken instrument
    out.push({ temp: +temp.toFixed(1), rain: rainCode < 0 ? -1 : +rain.toFixed(1), sun: +sun.toFixed(1), gust, na: missing ? (["temp", "rain", "sun", "gust"][r.int(4)]) : null });
  }
  return cache[key] = out;
}
// A value after cleaning: trace → 0 (or left out), n/a → left out
function clean(row, v, Q) { if (row.na === v) return null; const x = row[v]; if (x === -1) return Q.trace === "zero" ? 0 : null; return x; }

// ---------------- 2. Sampling ----------------
function sampleDays(method, n, r) {
  n = Math.min(n, N); const out = [];
  if (method === "census") { for (let d = 0; d < N; d++) out.push(d); return out; }
  if (method === "random") { const a = [...Array(N).keys()]; for (let i = 0; i < n; i++) { const j = i + r.int(N - i); [a[i], a[j]] = [a[j], a[i]]; out.push(a[i]); } return out.sort((p, q) => p - q); }
  if (method === "systematic") { const k = N / n, s = r() * k; for (let i = 0; i < n; i++) out.push(Math.floor(s + i * k)); return out; }
  if (method === "stratified") {           // proportional allocation: n × (days in month ÷ 184), rounded so they add up to n
    const want = MLEN.map(l => n * l / N), base = want.map(Math.floor); let left = n - base.reduce((a, b) => a + b, 0);
    want.map((w, i) => [w - base[i], i]).sort((a, b) => b[0] - a[0]).slice(0, left).forEach(([, i]) => base[i]++);
    MLEN.forEach((l, m) => { const a = [...Array(l).keys()]; for (let i = 0; i < base[m]; i++) { const j = i + r.int(l - i); [a[i], a[j]] = [a[j], a[i]]; out.push(MSTART[m] + a[i]); } });
    return out.sort((p, q) => p - q);
  }
  if (method === "quota") { const per = Math.floor(n / 6), extra = n - 6 * per; MLEN.forEach((l, m) => { for (let i = 0; i < per + (m < extra ? 1 : 0); i++) out.push(MSTART[m] + i); }); return out; }   // the first days of each month
  const s0 = Math.min(80, N - n); for (let i = 0; i < n; i++) out.push(s0 + i); return out;   // opportunity: n days in a row from 20 July (the summer holidays), or as near as fits
}
// ---------------- 3. Statistics (Edexcel conventions) ----------------
function stats(vals) {
  const s = vals.slice().sort((a, b) => a - b), n = s.length; if (!n) return null;
  // the k-th value from the bottom for a fraction f: if nf is a whole number, average that value and the next; otherwise round up
  const q = f => { const p = n * f; return Number.isInteger(p) ? (s[p - 1] + s[Math.min(n - 1, p)]) / 2 : s[Math.ceil(p) - 1]; };
  let sx = 0, sxx = 0; for (const v of s) { sx += v; sxx += v * v; }
  const mean = sx / n, varN = Math.max(0, sxx / n - mean * mean);
  const Q1 = q(0.25), Q2 = q(0.5), Q3 = q(0.75), IQR = Q3 - Q1;
  return { n, s, sx, sxx, mean, sd: Math.sqrt(varN), sdS: n > 1 ? Math.sqrt(varN * n / (n - 1)) : 0, Q1, Q2, Q3, IQR, min: s[0], max: s[n - 1], range: s[n - 1] - s[0], P10: q(0.1), P90: q(0.9) };
}
function outliers(st, rule) { if (!st) return { lo: -Infinity, hi: Infinity }; return rule === "iqr" ? { lo: st.Q1 - 1.5 * st.IQR, hi: st.Q3 + 1.5 * st.IQR } : { lo: st.mean - 2 * st.sd, hi: st.mean + 2 * st.sd }; }

// ---------------- 4. State ----------------
const DEF = { st: "heathrow", yr: 2015, v: "temp", method: "random", n: 30, trace: "zero", rule: "iqr", showPop: true, unequal: false, seed: 1, speed: 2 };
const P = Object.assign({}, DEF);
let sample = [], shown = 0, acc = 0, repeat = [];
const popVals = Q => population(Q.st, Q.yr).map(r => clean(r, Q.v, Q)).filter(x => x != null);
function takeSample() { sample = sampleDays(P.method, P.n, K.rng(P.seed)); shown = 0; acc = 0; repeat = []; }
const sampVals = () => sample.slice(0, shown).map(d => clean(population(P.st, P.yr)[d], P.v, P)).filter(x => x != null);
// one sample's mean (for the batch runs and the repeated-sampling chart)
const sampleMean = (Q, r) => { const pop = population(Q.st, Q.yr), v = sampleDays(Q.method, Q.n, r).map(d => clean(pop[d], Q.v, Q)).filter(x => x != null); return K.mean(v); };

// ---------------- 5. The page ----------------
const ui = K.app({
  title: "Sampling and Data", subject: "Mathematics",
  blurb: "A large data set of daily weather: sample it five ways, clean it, then box plots, histograms, cumulative frequency, outliers, mean and standard deviation",
  reset: () => set({}),
  levels: { std: "AS (8MA0)", adv: "A level (9MA0)", specs: {
    std: "Pearson Edexcel AS Mathematics (8MA0) Statistics 1 and 2: populations, census and sample, sampling units and frames; simple random, systematic, stratified, quota and opportunity sampling; histograms, frequency polygons, box plots, cumulative frequency; mean, median, mode, variance and standard deviation, IQR and percentiles; outliers and cleaning data; the large data set (weather, 1987 and 2015).",
    adv: "Pearson Edexcel A level Mathematics (9MA0) Statistics 1 and 2: the same content in more depth: Sxx and σ² = Sxx/n, coding (y = (x − a)/b), linear interpolation from grouped data, histograms with unequal class widths (frequency density), comparing distributions and the large data set." } },
  missions: [
    { title: "Census or sample?", q: "Take a census of Heathrow's temperature (all 184 days). Then take a simple random sample of 20. How close is the sample mean? Why might you sample instead of taking a census?", hint: "The sample mean is usually within about 1 °C of the census mean. A sample is quicker and cheaper; a census gives the exact population value but takes longer (and is impossible if testing destroys the item).", setup: () => set({ method: "census", n: 184 }) },
    { title: "Opportunity sampling", q: "A student records the temperature on 30 days in a row in the summer holidays, from 20 July (an opportunity sample). Compare its mean with the population mean. What has gone wrong?", hint: "Late July and August are the warmest part of the period, so the mean is far too high: the sample is biased because it does not represent the whole of May to October.", setup: () => set({ method: "opportunity", n: 30 }) },
    { title: "Systematic sampling", q: "Take every 6th day from a random start (n = 30). Is the sample spread across the whole period? What sampling frame did you need?", hint: "Yes: it covers every month evenly. The sampling frame is the numbered list of all 184 days. Systematic sampling is simple, but can be biased if there is a pattern with the same period as k.", setup: () => set({ method: "systematic", n: 30 }) },
    { title: "Stratified sampling", q: "Stratify by month (n = 30). How many days come from each month, and why? Press New sample several times: is the mean more consistent than simple random sampling?", hint: "5 from each 30-day month, and 5 or 6 from each 31-day month: in proportion to the size of each stratum. Because every month is always represented, the mean varies less from sample to sample.", setup: () => set({ method: "stratified", n: 30 }) },
    { title: "Box plots and outliers", q: "Rainfall at Camborne: look at the box plot. Which days are outliers by the 1.5 × IQR rule? Is the distribution symmetrical?", hint: "Rainfall is strongly positively skewed: most days have little or no rain, a few have a lot. Several wet days lie above Q3 + 1.5 × IQR. They are real, not errors, so they should not be removed.", setup: () => set({ st: "camborne", v: "rain", method: "census", n: 184 }) },
    { title: "Cleaning the data: 'tr' and 'n/a'", q: "Rainfall has 'tr' (trace, under 0.05 mm) and 'n/a' (not available). Change how trace is treated. What happens to the mean and the median?", hint: "Treating tr as 0 keeps those days as dry-ish days; leaving them out removes small values, so the mean and median rise. n/a values must always be left out. Always say how you cleaned the data.", setup: () => set({ st: "heathrow", v: "rain", method: "census", n: 184 }) },
    { title: "Comparing two places", q: "Compare Beijing's and Heathrow's temperature in 2015 (census). Which is warmer on average? Which is more variable? Use the median and IQR, or the mean and standard deviation.", hint: "Beijing is warmer (higher mean and median) and much more variable (bigger SD and IQR): its continental climate swings from hot summer to cool autumn. Compare a measure of location AND a measure of spread, in context.", setup: () => set({ st: "beijing", method: "census", n: 184 }) },
    { lvl: "adv", title: "Histograms with unequal classes", q: "Rainfall with unequal classes (0–1, 1–5, 5–10, 10–20, 20–50 mm). Why must the bars show frequency density, not frequency?", hint: "Frequency density = frequency ÷ class width, so the AREA of each bar is proportional to the frequency. A wide class would otherwise look far too important.", setup: () => set({ st: "camborne", v: "rain", method: "census", n: 184, unequal: true }) },
    { lvl: "adv", title: "Standard deviation from Σx and Σx²", q: "For a sample of 15 days, use n, Σx and Σx² (in the readings) to work out the variance and standard deviation. Check with the value shown.", hint: "σ² = Σx²/n − (Σx/n)² = Sxx/n. Edexcel uses the divisor n. The divisor n − 1 gives a slightly larger value (an unbiased estimate of the population variance).", setup: () => set({ method: "random", n: 15 }) },
  ],
  batch: [
    { title: "How close is a sample mean?", question: "Simple random samples of 20 days of Heathrow temperature, 2015: how close is each sample mean to the population mean?", how: "Each run takes a new simple random sample of 20 and records its mean.", yLabel: "sample mean temperature (°C)", reps: 400, bins: 24, theory: K.mean(popVals(DEF)), theoryLabel: "population mean", run: (x, r) => sampleMean(Object.assign({}, DEF, { n: 20 }), r), note: "Centred on the population mean (random sampling is unbiased), SD about σ/√20 ≈ 0.9 °C." },
    { title: "Bigger samples, less scatter", question: "How does the spread of sample means depend on the sample size?", how: "Simple random sampling. Each point: the SD of 200 sample means.", xLabel: "sample size n", yLabel: "SD of the sample means (°C)", xs: [5, 10, 20, 40, 80, 120, 160], reps: 4, yMin: 0, theory: n => { const s = stats(popVals(DEF)); return s.sd / Math.sqrt(n) * Math.sqrt((N - n) / (N - 1)); }, theoryLabel: "σ/√n × √((N − n)/(N − 1))", run: (n, r) => { const m = []; for (let i = 0; i < 200; i++) m.push(sampleMean(Object.assign({}, DEF, { n }), r)); return K.sd(m); }, note: "Falls like 1/√n, and faster near n = 184, when the sample is almost a census (the finite population correction)." },
    { title: "Does a bigger opportunity sample help?", question: "How far is the mean of n days in a row from 20 July from the population mean?", how: "Opportunity sampling (n consecutive days in the summer holidays). Deterministic: every run gives the same answer.", xLabel: "sample size n", yLabel: "error in the mean (°C)", xs: [10, 20, 40, 60, 90, 120, 150, 184], reps: 1, theory: () => 0, theoryLabel: "no error", run: n => sampleMean(Object.assign({}, DEF, { method: "opportunity", n }), K.rng(1)) - K.mean(popVals(DEF)), note: "Biased (too warm) until the sample is almost the whole population: the summer holiday days are the warmest of the season. More data collected the wrong way does not remove bias." },
    { title: "Stratified or simple random?", question: "Which gives more consistent sample means of temperature, n = 30?", how: "Each run: 200 samples by each method; records SD(stratified) ÷ SD(random).", yLabel: "SD stratified ÷ SD random", reps: 40, bins: 16, theory: 1, theoryLabel: "no difference", run: (x, r) => { const a = [], b = []; for (let i = 0; i < 200; i++) { a.push(sampleMean(Object.assign({}, DEF, { method: "stratified" }), r)); b.push(sampleMean(DEF, r)); } return K.sd(a) / K.sd(b); }, note: "Below 1: stratifying by month removes the month-to-month (seasonal) differences from the sampling error, so the estimate is more precise." },
    { title: "How many outliers? (rain against temperature)", question: "In samples of 30 days, how many values does the 1.5 × IQR rule flag as outliers for rainfall at Camborne?", how: "Each run: a random sample of 30 rainfall values (tr = 0); counts the outliers.", yLabel: "number of outliers", reps: 300, bins: 12, lo: -0.5, hi: 11.5, run: (x, r) => { const Q = Object.assign({}, DEF, { st: "camborne", v: "rain" }), pop = population(Q.st, Q.yr), v = sampleDays("random", 30, r).map(d => clean(pop[d], "rain", Q)).filter(x => x != null), s = stats(v), o = outliers(s, "iqr"); return v.filter(x => x < o.lo || x > o.hi).length; }, note: "Skewed data produce several 'outliers' in almost every sample: they are part of the distribution, not mistakes. For roughly normal data (temperature) the rule flags very few." },
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "1.1", text: "Population: everything of interest. Census: measures every member (accurate, but slow and costly). Sample: some members, chosen from a sampling frame (a list of sampling units)." },
      { lvl: "std", tag: "1.1", text: "Simple random: every sample of size n equally likely. Systematic: every k-th item from a random start. Stratified: random samples from each group in proportion to its size. Quota: fill set numbers per group, not at random. Opportunity: whoever is available (easy, but likely biased)." },
      { lvl: "std", tag: "2.3", text: "Mean x̄ = Σx/n; variance σ² = Σ(x − x̄)²/n = Σx²/n − x̄²; σ is the standard deviation. Median and quartiles resist outliers; the mean and SD do not." },
      { lvl: "std", tag: "2.4", text: "An outlier is an extreme value: e.g. below Q1 − 1.5×IQR or above Q3 + 1.5×IQR, or more than 2 standard deviations from the mean. Cleaning data: remove errors and missing values (n/a), and decide how to treat 'tr' (trace)." },
      { lvl: "std", tag: "2.1", text: "Histograms: the area of each bar is proportional to the frequency, so the height is frequency density = frequency ÷ class width. Box plots show min, Q1, median, Q3, max and outliers (crosses)." },
      { lvl: "adv", tag: "2.3", text: "Coding: if y = (x − a)/b then ȳ = (x̄ − a)/b and σy = σx/b. Linear interpolation estimates the median and quartiles from a grouped frequency table." },
      { lvl: "std", tag: "LDS", text: "The large data set: daily weather from 5 UK stations (Camborne, Heathrow, Hurn, Leeming, Leuchars) and 3 overseas (Beijing, Jacksonville, Perth), May to October 1987 and 2015. This page imitates it; the numbers are invented." },
    ],
    questions: [
      { lvl: "std", marks: 2, q: "Explain why recording the temperature on 30 consecutive days from 20 July would not give a representative sample of the daily temperature from May to October.", ans: "<ul><li>all the days are in one part of the season (late July and August)</li><li>this is the warmest part, so the sample mean would be biased (too high)</li></ul>" },
      { lvl: "std", marks: 3, q: "Describe how to take a stratified sample of 30 days, stratified by month, from the 184 days.", ans: "<ul><li>work out the number from each month in proportion: e.g. 30 × 31/184 ≈ 5 for May (5 or 6 per month, total 30)</li><li>number the days in each month</li><li>use random numbers to choose that many days from each month</li></ul>" },
      { lvl: "std", marks: 3, q: () => { const s = stats(sampVals()); return s ? `A sample of ${s.n} days has Σx = ${K.sig(s.sx, 5)} and Σx² = ${K.sig(s.sxx, 6)}. Find the mean and standard deviation.` : "Take a sample first."; }, ans: () => { const s = stats(sampVals()); return s ? `<ul><li>x̄ = ${K.sig(s.sx, 5)}/${s.n} = ${s.mean.toFixed(3)}</li><li>σ² = ${K.sig(s.sxx, 6)}/${s.n} − ${s.mean.toFixed(3)}² = ${(s.sd ** 2).toFixed(3)}</li><li>σ = ${s.sd.toFixed(3)}</li></ul>` : ""; } },
      { lvl: "std", marks: 3, q: () => { const s = stats(sampVals()); return s ? `The sample has Q1 = ${K.sig(s.Q1, 4)} and Q3 = ${K.sig(s.Q3, 4)}. Find the limits for outliers using the 1.5 × IQR rule. Is ${K.sig(s.max, 4)} an outlier?` : "Take a sample first."; }, ans: () => { const s = stats(sampVals()); if (!s) return ""; const o = outliers(s, "iqr"); return `<ul><li>IQR = ${K.sig(s.IQR, 4)}</li><li>limits ${K.sig(o.lo, 4)} and ${K.sig(o.hi, 4)}</li><li>${s.max > o.hi ? "yes" : "no"}: ${K.sig(s.max, 4)} is ${s.max > o.hi ? "above" : "below"} ${K.sig(o.hi, 4)}</li></ul>`; } },
      { lvl: "adv", marks: 3, q: "Temperatures are coded with y = (x − 15)/2. The coded data have ȳ = 0.6 and σy = 1.4. Find the mean and standard deviation of x.", ans: "<ul><li>x = 2y + 15</li><li>x̄ = 2 × 0.6 + 15 = 16.2 °C</li><li>σx = 2 × 1.4 = 2.8 °C</li></ul>" },
      { lvl: "adv", marks: 2, q: "A histogram of rainfall has a class 5–10 mm with frequency 12, drawn with height 2.4. What height should the bar for 10–20 mm with frequency 8 have?", ans: "<ul><li>frequency density 12 ÷ 5 = 2.4, so height = frequency density</li><li>8 ÷ 10 = 0.8</li></ul>" },
    ]
  },
  notes: `<h3>The data</h3><p>An invented data set in the style of the Edexcel large data set: 8 stations × May–October × 1987 and 2015. Temperatures follow the season with spells of warm and cool weather (each day is like the day before); rain falls on some days with an exponential amount; sunshine is lower on wet days; gusts occasionally reach gale force. About 2.5% of values are 'n/a' and some rain values are 'tr' (trace: under 0.05 mm). Values are fixed for each station and year, so the population never changes. <b>They are not real Met Office observations.</b></p>
<h3>Statistics</h3><ul><li>Quartiles and median use Edexcel's rule for raw data: for the k-th value, if nk is a whole number average that value and the next, otherwise round up.</li><li>The standard deviation uses the divisor n (σ). The divisor n − 1 is shown too.</li><li>Outliers: 1.5 × IQR beyond the quartiles, or more than 2σ from the mean.</li></ul>
<h3>Simplifications</h3><ul><li>Real weather is more complicated (fronts, thunderstorms, sea breezes); these values are only realistic in their general pattern.</li><li>The quota sample takes the first days of each month (a typical 'first found' quota); real quota samples depend on the interviewer.</li></ul>`,
});

// ---------------- 6. Controls ----------------
const C = {};
let g = ui.group("The population");
C.st = K.seg(g, { value: "heathrow", options: Object.entries(STATIONS).map(([k, v]) => [k, v.name]), on: v => { P.st = v; takeSample(); } });
C.yr = K.seg(g, { value: 2015, options: [[1987, "1987"], [2015, "2015"]], on: v => { P.yr = v; takeSample(); } });
C.v = K.seg(g, { label: "Variable", value: "temp", options: Object.entries(VARS).map(([k, v]) => [k, v.name.replace("Daily ", "")]), on: v => { P.v = v; takeSample(); } });
g = ui.group("Sampling");
C.method = K.seg(g, { value: "random", options: [["census", "census"], ["random", "simple random"], ["systematic", "systematic"], ["stratified", "stratified (by month)"], ["quota", "quota"], ["opportunity", "opportunity"]], on: v => { P.method = v; if (v === "census") { P.n = N; C.n.set(N); } takeSample(); } });
C.n = K.slider(g, { label: "Sample size n", min: 5, max: 184, step: 1, value: 30, on: v => { P.n = v; if (P.method === "census" && v < N) { P.method = "random"; C.method.set("random"); } takeSample(); } });
C.speed = K.slider(g, { label: "Days added per second", min: 0, max: 4, step: 1, value: 2, fmt: v => ["2", "5", "15", "60", "all at once"][v], on: v => P.speed = v });
ui.headerSpeed(C.speed);   // playback speed lives in the header, beside Pause and Reset
let rw = K.row(g); K.btn(rw, "🎲 New sample", () => { P.seed = Math.floor(Math.random() * 1e6); takeSample(); }, "primary"); K.btn(rw, "Repeat 200 times", () => repeatSampling());
g = ui.group("Cleaning and display");
C.trace = K.seg(g, { label: "Rainfall 'tr' (trace) values", value: "zero", options: [["zero", "count as 0"], ["omit", "leave out"]], on: v => P.trace = v });
C.rule = K.seg(g, { label: "Outlier rule", value: "iqr", options: [["iqr", "beyond 1.5 × IQR"], ["sd", "beyond x̄ ± 2σ"]], on: v => P.rule = v });
C.showPop = K.toggle(g, { label: "Show the population's box plot (normally unknown)", value: true, on: v => P.showPop = v });
C.unequal = K.toggle(g, { label: "Histogram with unequal class widths (frequency density)", value: false, on: v => P.unequal = v });
const read = K.readout(ui.group("Sample statistics"), [["n", "n, Σx, Σx²"], ["loc", "Mean, median"], ["sp", "σ (÷ n), s (÷ n − 1)"], ["q", "Q1, Q3, IQR"], ["out", "Outliers"], ["pop", "Population mean, σ"]]);
function set(o) { Object.assign(P, DEF, o); if (P.unequal && ui.setLevel && ui.level !== "adv") ui.setLevel("adv"); for (const k of ["st", "yr", "v", "method", "trace", "rule", "showPop", "unequal", "n", "speed"]) C[k].set(P[k]); P.seed = Math.floor(Math.random() * 1e6); takeSample(); }
function repeatSampling() { repeat = []; const r = K.rng(Math.floor(Math.random() * 1e9)); for (let i = 0; i < 200; i++) repeat.push(sampleMean(P, r)); }

// ---------------- 7. Drawing ----------------
const cv = ui.canvas(() => { });
const chH = K.chart(ui.dock, { title: "Histogram of the sample", yLabel: "frequency", yMin: 0 });
const chC = K.chart(ui.dock, { title: "Cumulative frequency", yLabel: "cumulative frequency", yMin: 0 });
const TX = (c, s, x, y, col = "#c9d4ea", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,system-ui,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function colourFor(v, lo, hi) { const t = K.clamp((v - lo) / ((hi - lo) || 1), 0, 1); return `hsl(${220 - 200 * t},70%,${35 + 20 * t}%)`; }
function tick(dt) { if (shown >= sample.length) return; if (P.speed === 4) { shown = sample.length; return; } acc += dt * [2, 5, 15, 60][P.speed]; while (acc >= 1 && shown < sample.length) { acc--; shown++; } }
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1222"; c.fillRect(0, 0, w, h);
  const pop = population(P.st, P.yr), V = VARS[P.v], pv = popVals(P), ps = stats(pv), lo = Math.min(...pv), hi = Math.max(...pv);
  // --- the calendar: one cell per day, coloured by its value; sampled days outlined
  const x0 = 82, cw = Math.min(26, (w - x0 - 20) / 31), ch = Math.min(22, (h * 0.46 - 40) / 6), y0 = 34, inS = new Set(sample.slice(0, shown)), next = sample[shown];
  TX(c, `THE POPULATION: ${V.name.toLowerCase()} at ${STATIONS[P.st].name}, 1 May – 31 Oct ${P.yr} (N = 184 days)`, 20, 20, "#ffd166", "left", "600 12px");
  for (let m = 0; m < 6; m++) {
    TX(c, MONTHS[m], x0 - 10, y0 + m * (ch + 3) + ch * 0.7, "#8fa0bf", "right", "11px");
    for (let k = 0; k < MLEN[m]; k++) {
      const d = MSTART[m] + k, row = pop[d], v = clean(row, P.v, P), X = x0 + k * cw, Y = y0 + m * (ch + 3);
      c.fillStyle = v == null ? "#2a2f3d" : colourFor(v, lo, hi); c.globalAlpha = inS.has(d) || P.method === "census" ? 1 : 0.35; c.fillRect(X + 1, Y, cw - 2, ch); c.globalAlpha = 1;
      if (row.na === P.v || row[P.v] === -1) TX(c, row.na === P.v ? "n/a" : "tr", X + cw / 2, Y + ch * 0.68, "#fff", "center", "9px");
      if (inS.has(d) && P.method !== "census") { c.strokeStyle = "#fff"; c.lineWidth = 2; c.strokeRect(X + 1, Y, cw - 2, ch); c.lineWidth = 1; }
      if (d === next) { c.strokeStyle = "#ffd166"; c.lineWidth = 2; c.strokeRect(X - 1, Y - 2, cw + 2, ch + 4); c.lineWidth = 1; }
    }
  }
  // colour key
  const ky = y0 + 6 * (ch + 3) + 6; for (let i = 0; i < 100; i++) { c.fillStyle = colourFor(lo + (hi - lo) * i / 99, lo, hi); c.fillRect(x0 + i * 2, ky, 2, 8); } TX(c, `${K.sig(lo, 3)}`, x0 - 4, ky + 8, "#8fa0bf", "right", "10px"); TX(c, `${K.sig(hi, 3)} ${V.unit}`, x0 + 204, ky + 8, "#8fa0bf", "left", "10px");
  TX(c, P.method === "census" ? "census: every day measured" : `bright, outlined = in the sample (${Math.min(shown, sample.length)} of ${sample.length})`, x0 + 300, ky + 8, "#c9d4ea", "left", "11px");
  // --- box plots and a dot plot on a shared scale
  const bx0 = x0, bx1 = w - 30, X = v => bx0 + (v - lo) / ((hi - lo) || 1) * (bx1 - bx0), by = ky + 40, sv = sampVals(), ss = stats(sv);
  c.strokeStyle = "#3a4a6e"; c.beginPath(); c.moveTo(bx0, h - 30); c.lineTo(bx1, h - 30); c.stroke();
  const tks = 8; for (let i = 0; i <= tks; i++) { const v = lo + (hi - lo) * i / tks; TX(c, K.sig(v, 3), X(v), h - 16, "#8fa0bf", "center", "11px"); }
  TX(c, V.unit, bx1, h - 4, "#8fa0bf", "right", "11px");
  const box = (s, y, col, label, alpha) => {
    if (!s) return; const o = outliers(s, P.rule), inl = s.s.filter(v => v >= o.lo && v <= o.hi), wl = inl.length ? inl[0] : s.min, wh = inl.length ? inl[inl.length - 1] : s.max, bh = 26;
    c.globalAlpha = alpha; c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.moveTo(X(wl), y); c.lineTo(X(s.Q1), y); c.moveTo(X(s.Q3), y); c.lineTo(X(wh), y); c.moveTo(X(wl), y - 8); c.lineTo(X(wl), y + 8); c.moveTo(X(wh), y - 8); c.lineTo(X(wh), y + 8); c.stroke();
    c.fillStyle = col + "33"; c.fillRect(X(s.Q1), y - bh / 2, X(s.Q3) - X(s.Q1), bh); c.strokeRect(X(s.Q1), y - bh / 2, X(s.Q3) - X(s.Q1), bh); c.beginPath(); c.moveTo(X(s.Q2), y - bh / 2); c.lineTo(X(s.Q2), y + bh / 2); c.stroke();
    for (const v of s.s) if (v < o.lo || v > o.hi) { c.beginPath(); c.moveTo(X(v) - 4, y - 4); c.lineTo(X(v) + 4, y + 4); c.moveTo(X(v) + 4, y - 4); c.lineTo(X(v) - 4, y + 4); c.stroke(); }
    c.fillStyle = col; c.beginPath(); c.arc(X(s.mean), y, 3.5, 0, 6.3); c.fill(); c.lineWidth = 1; c.globalAlpha = 1; TX(c, label, bx0 - 10, y + 4, col, "right", "600 11px");
  };
  if (P.showPop) box(ps, by, "#ffd166", "population", 0.85);
  box(ss, by + 46, "#5ad1ff", "sample", 1);
  // dot plot of the sample
  const cnt = {}, dy0 = h - 40; for (const v of sv) { const b = Math.round(X(v) / 6); cnt[b] = (cnt[b] || 0) + 1; } const mx = Math.max(1, ...Object.values(cnt)), step = Math.min(6, (dy0 - by - 80) / mx); for (const k in cnt) for (let j = 0; j < cnt[k]; j++) { c.fillStyle = "#7ee787"; c.beginPath(); c.arc(k * 6, dy0 - j * step, 2.6, 0, 6.3); c.fill(); }
  ui.hud(ss ? `sample mean <b>${ss.mean.toFixed(2)}</b> · population mean <b>${ps.mean.toFixed(2)}</b> ${V.unit}<br>error ${(ss.mean - ps.mean >= 0 ? "+" : "")}${(ss.mean - ps.mean).toFixed(2)} · ● = mean, ✕ = outlier` : "");
}
function panels() {
  const sv = sampVals(), s = stats(sv), ps = stats(popVals(P)), V = VARS[P.v];
  read.set("n", s ? `${s.n}, ${K.sig(s.sx, 5)}, ${K.sig(s.sxx, 6)}` : "–");
  read.set("loc", s ? `${s.mean.toFixed(2)}, ${K.sig(s.Q2, 4)}` : "–"); read.set("sp", s ? `${s.sd.toFixed(3)}, ${s.sdS.toFixed(3)}` : "–");
  read.set("q", s ? `${K.sig(s.Q1, 4)}, ${K.sig(s.Q3, 4)}, ${K.sig(s.IQR, 4)}` : "–");
  if (s) { const o = outliers(s, P.rule), ol = s.s.filter(v => v < o.lo || v > o.hi); read.set("out", `${ol.length ? ol.slice(0, 6).join(", ") + (ol.length > 6 ? "…" : "") : "none"} (limits ${K.sig(o.lo, 3)}, ${K.sig(o.hi, 3)})`); } else read.set("out", "–");
  read.set("pop", P.showPop ? `${ps.mean.toFixed(2)}, ${ps.sd.toFixed(3)} ${V.unit}` : "hidden");
  // histogram: equal classes, or unequal ones drawn as frequency density
  if (s && repeat.length < 2) {
    let edges;
    if (P.unequal) edges = P.v === "rain" ? [0, 1, 5, 10, 20, 50] : (() => { const L = Math.floor(s.min), H = Math.ceil(s.max) + 1e-9, sp = H - L; return [L, L + sp * 0.2, L + sp * 0.4, L + sp * 0.5, L + sp * 0.6, L + sp * 0.8, H].map(v => +v.toFixed(1)); })();
    else { const k = Math.max(5, Math.min(14, Math.round(Math.sqrt(s.n)))), L = Math.floor(s.min), H = Math.ceil(s.max + 1e-9) + (Number.isInteger(s.max) ? 1 : 0), wd = Math.max(1, Math.ceil((H - L) / k)); edges = []; for (let e = L; e <= H + wd; e += wd) { edges.push(e); if (e > s.max) break; } }
    const bars = []; for (let i = 0; i < edges.length - 1; i++) { const a = edges[i], b = edges[i + 1], f = sv.filter(v => v >= a && (v < b || (i === edges.length - 2 && v <= b))).length; bars.push({ a, b, f }); }
    const series = bars.map(q => ({ pts: [[(q.a + q.b) / 2, P.unequal ? q.f / (q.b - q.a) : q.f]], type: "bars", w: q.b - q.a, color: K.cssVar("--s0"), alpha: .8 }));
    chH.opts.title = P.unequal ? "Histogram (unequal classes): area ∝ frequency" : "Histogram of the sample"; chH.opts.yLabel = P.unequal ? "frequency density" : "frequency"; chH.opts.xLabel = V.unit;
    chH.draw(series, { xMin: edges[0], xMax: edges[edges.length - 1] });
  } else if (repeat.length >= 2) { const hg = K.histogram(repeat, 20); chH.opts.title = "200 repeated samples: their means"; chH.opts.yLabel = "samples"; chH.opts.xLabel = "sample mean (" + V.unit + ")"; chH.draw([{ pts: hg.pts, w: hg.w, type: "bars", color: K.cssVar("--s4"), alpha: .8 }], { vlines: [{ x: ps.mean, color: K.cssVar("--s2"), label: "population mean" }] }); }
  else chH.draw([]);
  if (s) { const pts = [[s.min - 1e-9, 0]]; s.s.forEach((v, i) => pts.push([v, i + 1])); chC.opts.xLabel = V.unit; chC.draw([{ pts, color: K.cssVar("--s1"), label: "cumulative frequency" }], { yMax: s.n, vlines: [{ x: s.Q1, label: "Q1", color: K.cssVar("--muted") }, { x: s.Q2, label: "median", color: K.cssVar("--s2"), row: 1 }, { x: s.Q3, label: "Q3", color: K.cssVar("--muted"), row: 2 }], hlines: [{ y: s.n / 4 }, { y: s.n / 2 }, { y: 3 * s.n / 4 }] }); }
  else chC.draw([]);
}
let frame = 0;
ui.run(dt => tick(dt), () => { draw(); if (frame++ % 5 === 0) panels(); });
ui.onLevel = v => { if (v === "std") { P.unequal = false; C.unequal.set(false); } C.unequal.el.style.display = v === "adv" ? "" : "none"; };
ui.onLevel(ui.level);
set({});
ui.tip("Each cell is one day. Watch the sample being chosen, then compare it with the whole population.", 7000);
