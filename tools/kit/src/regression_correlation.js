/* =====================================================================
   REGRESSION AND CORRELATION
   Bivariate data: pairs (x, y). The LEAST-SQUARES REGRESSION LINE of
   y on x, y = a + bx, is the line that makes the sum of the squared
   vertical distances (residuals) as small as possible:
       b = Sxy / Sxx,  a = ȳ − b x̄   (it always passes through (x̄, ȳ))
   The PRODUCT MOMENT CORRELATION COEFFICIENT measures how close the
   points are to a straight line:
       r = Sxy / √(Sxx · Syy),   −1 ≤ r ≤ 1
   where Sxx = Σ(x − x̄)², Syy = Σ(y − ȳ)², Sxy = Σ(x − x̄)(y − ȳ).
   Use the line to predict y INSIDE the range of the data
   (interpolation); outside it (extrapolation) is unreliable.
   A level: test H0: ρ = 0 using critical values of r, and use logs to
   turn y = kbˣ (log y against x) or y = axⁿ (log y against log x)
   into straight lines.
   ===================================================================== */

// ---------------- 1. Statistics ----------------
function summary(pts) {
  const n = pts.length; if (n < 2) return null;
  let sx = 0, sy = 0; for (const [x, y] of pts) { sx += x; sy += y; }
  const mx = sx / n, my = sy / n; let Sxx = 0, Syy = 0, Sxy = 0;
  for (const [x, y] of pts) { Sxx += (x - mx) ** 2; Syy += (y - my) ** 2; Sxy += (x - mx) * (y - my); }
  const b = Sxx ? Sxy / Sxx : 0, a = my - b * mx, r = Sxx && Syy ? Sxy / Math.sqrt(Sxx * Syy) : 0;
  let SSres = 0; for (const [x, y] of pts) SSres += (y - a - b * x) ** 2;
  return { n, mx, my, Sxx, Syy, Sxy, a, b, r, SSres };
}
// Student's t distribution (for critical values of r): regularised incomplete beta by continued fractions
function lgam(x) { const g = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]; let y = x, t = x + 5.5; t -= (x + 0.5) * Math.log(t); let s = 1.000000000190015; for (const c of g) s += c / ++y; return -t + Math.log(2.5066282746310005 * s / x); }
function betacf(a, b, x) { let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap; if (Math.abs(d) < 1e-30) d = 1e-30; d = 1 / d; let h = d; for (let m = 1; m <= 200; m++) { const m2 = 2 * m; let aa = m * (b - m) * x / ((qam + m2) * (a + m2)); d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30; d = 1 / d; h *= d * c; aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2)); d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 3e-12) break; } return h; }
function ibeta(x, a, b) { if (x <= 0) return 0; if (x >= 1) return 1; const bt = Math.exp(lgam(a + b) - lgam(a) - lgam(b) + a * Math.log(x) + b * Math.log(1 - x)); return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b; }
const tUpper = (t, df) => 0.5 * ibeta(df / (df + t * t), df / 2, 0.5);                       // P(T > t) for t ≥ 0
// critical value of r: if ρ = 0 then t = r√(n − 2)/√(1 − r²) has a t distribution with n − 2 degrees of freedom
function rCrit(n, tailP) { if (n < 4) return 1; let lo = 0, hi = 1; for (let i = 0; i < 60; i++) { const r = (lo + hi) / 2, t = r * Math.sqrt((n - 2) / (1 - r * r)); tUpper(t, n - 2) > tailP ? lo = r : hi = r; } return (lo + hi) / 2; }
const erf = x => { const s = Math.sign(x), a = Math.abs(x), t = 1 / (1 + 0.3275911 * a); return s * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a)); };
const Phi = z => 0.5 * (1 + erf(z / Math.SQRT2));

// ---------------- 2. Data sets ----------------
// A random sample of n points from a population with correlation ρ (x and y normal).
function randomData(r, n, rho) { const out = []; for (let i = 0; i < n; i++) { const u = r.gauss(), v = r.gauss(); out.push([50 + 15 * u, 50 + 15 * (rho * u + Math.sqrt(1 - rho * rho) * v)]); } return out; }
const SETS = {
  random: { name: "Random sample", xl: "x", yl: "y", gen: (r, Q) => randomData(r, Q.n, Q.rho), note: "A sample from a population whose true correlation ρ you choose. Different samples give different values of r." },
  arms: { name: "Arm span and height", xl: "arm span (cm)", yl: "height (cm)", gen: r => { const o = []; for (let i = 0; i < 24; i++) { const h = 158 + 12 * r.gauss(); o.push([+(h + 2 * r.gauss() - 1).toFixed(1), +h.toFixed(1)]); } return o; }, note: "A class of 24 students. Arm span is close to height for most people (Leonardo's 'Vitruvian Man' rule)." },
  icecream: { name: "Ice creams and drownings", xl: "ice creams sold (thousands)", yl: "drownings", gen: r => { const o = []; for (let m = 0; m < 24; m++) { const T = 12 + 9 * Math.sin((m % 12 - 3) / 12 * 2 * Math.PI) + 2 * r.gauss(); o.push([+(20 + 6 * T + 12 * r.gauss()).toFixed(0) / 1, Math.max(0, Math.round(1 + 0.45 * T + 2 * r.gauss()))]); } return o; }, note: "Two years of monthly data. Strong positive correlation, but ice cream does not cause drowning: both rise in hot weather (a confounding variable)." },
  weather: { name: "Daily weather (LDS style)", xl: "daily total sunshine (hours)", yl: "daily max temperature (°C)", gen: r => { const o = []; for (let d = 0; d < 31; d++) { const s = Math.max(0, Math.min(15, 6 + 4 * r.gauss())); o.push([+s.toFixed(1), +(17 + 0.55 * s + 2.2 * r.gauss()).toFixed(1)]); } return o; }, note: "Illustrative data in the style of the Edexcel large data set (31 days in summer at one UK station). Not real Met Office readings." },
  bacteria: { name: "Bacteria growth y = kbˣ (A level)", xl: "time x (hours)", yl: "number of bacteria y", adv: true, gen: r => { const o = []; for (let x = 0; x <= 10; x++) o.push([x, Math.round(120 * Math.pow(1.6, x) * Math.exp(0.08 * r.gauss()))]); return o; }, note: "A culture that grows by a fixed percentage each hour: y = kbˣ. Plot log y against x to get a straight line with gradient log b and intercept log k." },
  kepler: { name: "Planets y = axⁿ (A level)", xl: "distance from the Sun x (AU)", yl: "orbital period y (years)", adv: true, gen: () => [[0.387, 0.241], [0.723, 0.615], [1, 1], [1.524, 1.881], [5.203, 11.86], [9.537, 29.46], [19.19, 84.01], [30.07, 164.8]], note: "Real data for the eight planets. Plot log y against log x: the gradient is n (Kepler found n = 1.5) and the intercept is log a." },
};
const DEF = { set: "random", n: 20, rho: 0.7, resid: true, squares: false, line: true, mean: true, xp: 50, tr: "none", test: false, tail: "one", alpha: 0.05, seed: 3 };
const P = Object.assign({}, DEF);
let raw = [], view = null, drag = null, hoverIdx = -1;
const lg = v => Math.log10(v);
// the data actually plotted (after a log transformation, A level)
const plotted = () => raw.map(([x, y]) => P.tr === "logy" ? [x, lg(y)] : P.tr === "loglog" ? [lg(x), lg(y)] : [x, y]).filter(p => isFinite(p[0]) && isFinite(p[1]));
const axisName = () => { const S = SETS[P.set]; return P.tr === "logy" ? [S.xl, "log₁₀ " + S.yl] : P.tr === "loglog" ? ["log₁₀ " + S.xl, "log₁₀ " + S.yl] : [S.xl, S.yl]; };
function fitView() { const p = plotted(); if (!p.length) { view = { x0: 0, x1: 100, y0: 0, y1: 100 }; return; } let x0 = Math.min(...p.map(q => q[0])), x1 = Math.max(...p.map(q => q[0])), y0 = Math.min(...p.map(q => q[1])), y1 = Math.max(...p.map(q => q[1])); const dx = (x1 - x0) || 1, dy = (y1 - y0) || 1; view = { x0: x0 - dx * .25, x1: x1 + dx * .25, y0: y0 - dy * .2, y1: y1 + dy * .2 }; }

// ---------------- 3. The page ----------------
const ui = K.app({
  title: "Regression and Correlation", subject: "Mathematics",
  blurb: "Drag the points: least-squares regression line, residuals, PMCC, outliers and leverage, interpolation and extrapolation, correlation tests and log graphs",
  reset: () => set(P.set),
  levels: { std: "AS (8MA0)", adv: "A level (9MA0)", specs: {
    std: "Pearson Edexcel AS Mathematics (8MA0) Statistics 2.2: scatter diagrams and regression lines for bivariate data, explanatory and response variables, interpolation and the danger of extrapolation, informal interpretation of correlation, and correlation does not imply causation. 2.4 outliers and cleaning data.",
    adv: "Pearson Edexcel A level Mathematics (9MA0): the product moment correlation coefficient and hypothesis tests for zero correlation (Statistics 5.1, critical values of r), and using logarithmic graphs to estimate the parameters of y = axⁿ and y = kbˣ (Pure 6.6)." } },
  missions: [
    { title: "Find the best line", q: "Switch off the line and the residuals. Guess where the best-fit line goes. Now show the residuals and squares: what is the least-squares line making as small as possible?", hint: "The sum of the squared residuals (the total area of the squares). Any other line has a bigger total. The line always passes through the mean point (x̄, ȳ).", setup: () => { set("random"); setP({ line: false, resid: false, squares: false }); ui.tip("Turn the line back on when you have made your guess", 6000); } },
    { title: "Drag one point", q: "Drag the point furthest to the right up and down. Then drag a point near the middle. Which changes the line more?", hint: "A point far from x̄ has high LEVERAGE: it acts like a long lever and swings the gradient. A point near x̄ mainly moves the line up and down a little.", setup: () => { set("random"); setP({ squares: false }); } },
    { title: "One outlier", q: "Arm span and height: drag one point far away from the others (a typing error?). What happens to r? Should you remove it?", hint: "One outlier can change r a lot. Remove it only if there is a reason (a recording error); a genuine unusual value should be kept and discussed. That is 'cleaning data' (2.4).", setup: () => set("arms") },
    { title: "Predict safely", q: "Weather data: use the line to predict the maximum temperature for 8 hours of sunshine, then for 25 hours. Which prediction is reliable?", hint: "8 hours is inside the data (interpolation) and reliable. 25 hours is extrapolation, beyond the data and also impossible (there are only about 16 hours of daylight in summer).", setup: () => { set("weather"); setP({ xp: 8 }); } },
    { title: "Correlation is not causation", q: "Ice creams and drownings are strongly correlated. Does selling ice cream cause drowning? What is going on?", hint: "No. Both are caused by a third (confounding) variable: hot weather, when people buy ice cream AND go swimming. Correlation shows association, not cause.", setup: () => set("icecream") },
    { title: "How much does r vary?", q: "Random samples of 10 from a population with ρ = 0.3. Press New sample repeatedly. How far does r stray?", hint: "With n = 10, r can easily be anywhere from about −0.4 to 0.8. Small samples give very unreliable correlation coefficients.", setup: () => { set("random"); setP({ n: 10, rho: 0.3 }); } },
    { lvl: "adv", title: "Is the correlation significant?", q: "Test H0: ρ = 0 against H1: ρ > 0 at 5% for a random sample of 12 with true ρ = 0.4. Compare r with the critical value.", hint: "Critical value for n = 12, one tail 5%: 0.4973. A sample with r above it gives evidence of positive correlation. With a true ρ of 0.4 many samples of 12 fail to show it (a Type II error).", setup: () => { set("random"); setP({ n: 12, rho: 0.4, test: true, tail: "one" }); } },
    { lvl: "adv", title: "Exponential growth: y = kbˣ", q: "Plot log y against x. Find the gradient and intercept, then work out k and b.", hint: "log y = log k + x log b. Gradient ≈ 0.204 so b = 10^0.204 ≈ 1.6 (60% growth an hour); intercept ≈ 2.08 so k = 10^2.08 ≈ 120.", setup: () => { set("bacteria"); setP({ tr: "logy" }); } },
    { lvl: "adv", title: "Kepler's third law: y = axⁿ", q: "Plot log (period) against log (distance). What is n? What does the intercept tell you?", hint: "log y = log a + n log x. The gradient is 1.50, so T² ∝ r³ (Kepler's third law). The intercept is 0, so a = 1 in units of years and AU (the Earth's orbit).", setup: () => { set("kepler"); setP({ tr: "loglog" }); } },
  ],
  batch: [
    { title: "How variable is r?", question: "Samples of 20 from a population with ρ = 0.5: what values of r do they give?", how: "Each run takes a new random sample of 20 and records r.", yLabel: "sample PMCC r", reps: 500, bins: 25, lo: -0.2, hi: 1, theory: 0.5, theoryLabel: "population ρ", run: (x, r) => summary(randomData(r, 20, 0.5)).r, note: "Skewed: r cannot exceed 1, so the spread is longer below 0.5. The mean is very slightly below ρ. Standard deviation about (1 − ρ²)/√n ≈ 0.17." },
    { title: "False alarms (A level)", question: "If there is no correlation in the population, how often is r significant at 5% (one-tailed)?", how: "ρ = 0. Each point: 200 samples of size n, the percentage with r above the critical value.", xLabel: "sample size n", yLabel: "% significant", xs: [5, 8, 12, 20, 30, 50], reps: 5, yMin: 0, yMax: 15, theory: () => 5, theoryLabel: "significance level", run: (n, r) => { const c = rCrit(n, 0.05); let k = 0; for (let i = 0; i < 200; i++) if (summary(randomData(r, n, 0)).r > c) k++; return k / 2; }, note: "About 5% at every n: the critical values are set so that this happens. Each point is only 200 samples (±1.5 percentage points)." },
    { title: "Power of the correlation test (A level)", question: "With true ρ = 0.4, how often does a sample give significant positive correlation at 5%?", how: "Each point: 200 samples of size n.", xLabel: "sample size n", yLabel: "% significant (power)", xs: [6, 10, 15, 20, 30, 45, 60], reps: 5, yMin: 0, yMax: 100, theory: n => 100 * Phi(Math.atanh(0.4) * Math.sqrt(n - 3) - 1.6449), theoryLabel: "Fisher z approximation", run: (n, r) => { const c = rCrit(n, 0.05); let k = 0; for (let i = 0; i < 200; i++) if (summary(randomData(r, n, 0.4)).r > c) k++; return k / 2; }, note: "A moderate correlation needs about 40 points to be detected 80% of the time. The Fisher z formula is an approximation, slightly off for tiny n." },
    { title: "Leverage of one outlier", question: "Twenty points with no correlation plus ONE extra point d units to the right (at y = 1.5d above the mean). How big does r get?", how: "x and y have SD 15. Each run: a new sample of 20 plus the outlier at (50 + d, 50 + 1.5d).", xLabel: "distance of the outlier d", yLabel: "r with the outlier", xs: [0, 15, 30, 45, 60, 90, 120], reps: 8, yMin: -0.5, yMax: 1, theory: d => { const e = d * d * 20 / 21; return 1.5 * e / Math.sqrt((19 * 225 + e) * (19 * 225 + 2.25 * e)); }, theoryLabel: "approximate expected r", run: (d, r) => { const p = randomData(r, 20, 0); p.push([50 + d, 50 + 1.5 * d]); return summary(p).r; }, note: "A single far-away point can create a 'strong' correlation from nothing. Always look at the scatter diagram, not just r." },
    { title: "Estimating Kepler's n (A level)", question: "If every measured period has a 10% random error, how well does the log–log gradient estimate n = 1.5?", how: "Each run multiplies each planet's period by a random factor (SD 10%) and fits log y on log x.", yLabel: "gradient n", reps: 400, bins: 24, theory: 1.5, theoryLabel: "Kepler's n", run: (x, r) => summary(SETS.kepler.gen().map(([a, b]) => [lg(a), lg(b * Math.exp(0.1 * r.gauss()))])).b, note: "Very precise: the planets span almost two powers of ten in distance, so the gradient is pinned down (high Sxx). Errors near the ends matter most." },
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "2.2", text: "The explanatory (independent) variable goes on the x-axis; the response (dependent) variable on the y-axis. The regression line of y on x is y = a + bx." },
      { lvl: "std", tag: "2.2", text: "b is the change in y for each extra unit of x (interpret it in context); a is the value of y when x = 0, which may be meaningless if x = 0 is outside the data." },
      { lvl: "std", tag: "2.2", text: "Interpolation (predicting within the range of the data) is reliable if the correlation is strong; extrapolation (outside it) is not, because the pattern may not continue." },
      { lvl: "std", tag: "2.2", text: "Correlation describes how close points are to a straight line: positive, negative or none, strong or weak. Correlation does not imply causation (look for a confounding variable)." },
      { lvl: "std", tag: "2.4", text: "An outlier is far from the pattern of the other points. It can strongly affect r and the line, especially if it is far from x̄ (high leverage). Remove it only if it is an error." },
      { lvl: "adv", tag: "5.1", text: "Test H0: ρ = 0 against H1: ρ > 0, ρ < 0 or ρ ≠ 0 by comparing r with the critical value for n at the chosen significance level. The test assumes the data come from a bivariate normal population." },
      { lvl: "adv", tag: "P6.6", text: "y = kbˣ → log y = log k + x log b (straight line of log y against x). y = axⁿ → log y = log a + n log x (straight line of log y against log x)." },
    ],
    questions: [
      { lvl: "std", marks: 2, q: () => { const s = summary(plotted()); return s ? `The regression line is y = ${s.a.toFixed(2)} + ${s.b.toFixed(3)}x. Interpret the gradient ${s.b.toFixed(3)} in context (${axisName()[1]} against ${axisName()[0]}).` : "Add some points first."; }, ans: () => { const s = summary(plotted()); return s ? `<ul><li>for each extra unit of ${axisName()[0]}</li><li>${axisName()[1]} ${s.b >= 0 ? "increases" : "decreases"} by about ${Math.abs(s.b).toFixed(3)} on average</li></ul>` : ""; } },
      { lvl: "std", marks: 2, q: "A student uses the regression line of maximum temperature on hours of sunshine, from data with 0–14 hours, to predict the temperature for 20 hours of sunshine. Explain why this may be unreliable.", ans: "<ul><li>20 hours is outside the range of the data: extrapolation</li><li>the linear pattern may not continue (and 20 hours of sunshine may be impossible)</li></ul>" },
      { lvl: "std", marks: 2, q: "Towns with more doctors have more deaths. Does this show that doctors cause deaths? Explain.", ans: "<ul><li>no: correlation does not imply causation</li><li>a third variable (population size) causes both</li></ul>" },
      { lvl: "adv", marks: 4, q: () => { const n = P.set === "random" ? P.n : 12; return `A sample of ${n} pairs has r = 0.55. Test at the 5% level whether there is positive correlation in the population.`; }, ans: () => { const n = P.set === "random" ? P.n : 12, c = rCrit(n, 0.05); return `<ul><li>H0: ρ = 0, H1: ρ > 0</li><li>critical value for n = ${n} at 5% (one tail): ${c.toFixed(4)}</li><li>0.55 ${0.55 > c ? ">" : "<"} ${c.toFixed(4)}: ${0.55 > c ? "significant, reject H0" : "not significant, do not reject H0"}</li><li>${0.55 > c ? "there is evidence of positive correlation" : "insufficient evidence of positive correlation"}</li></ul>`; } },
      { lvl: "adv", marks: 4, q: "A graph of log₁₀ y against x is a straight line through (0, 2.1) and (5, 3.1). Find k and b in y = kbˣ.", ans: "<ul><li>log y = log k + x log b</li><li>intercept: log k = 2.1, k = 10^2.1 = 126</li><li>gradient = (3.1 − 2.1)/5 = 0.2 = log b</li><li>b = 10^0.2 = 1.58</li></ul>" },
    ]
  },
  notes: `<h3>What the page does</h3><ul><li>The regression line is the least-squares line of y on x: b = Sxy/Sxx, a = ȳ − bx̄. Residuals are drawn as vertical lines (the squares show what is being minimised).</li>
<li>r = Sxy/√(SxxSyy). Critical values for the A level test come from the exact t distribution (t = r√(n − 2)/√(1 − r²), n − 2 degrees of freedom), so they match the tables in the formula booklet.</li>
<li>Log graphs use log base 10. Values ≤ 0 cannot be logged and are left out.</li>
<li><b>Click</b> an empty space to add a point, <b>drag</b> a point to move it, <b>right-click</b> (or drag it off the plot) to delete it.</li></ul>
<h3>Assumptions and simplifications</h3><ul><li>Random samples come from a bivariate normal population with correlation ρ; real data may be curved, clustered or contain errors.</li>
<li>The arm-span, ice-cream and weather sets are invented to look realistic (the weather set imitates the style of the Edexcel large data set but is not Met Office data). The planet data are real.</li>
<li>The regression of y on x assumes x is measured without error; all the scatter is in y.</li></ul>`,
});

// ---------------- 4. Controls ----------------
const C = {};
let g = ui.group("Data");
C.set = K.seg(g, { value: "random", options: Object.entries(SETS).map(([k, v]) => [k, v.name]), on: v => set(v) });
const setNote = K.note(g, "");
C.n = K.slider(g, { label: "Sample size n", min: 4, max: 100, step: 1, value: 20, on: v => { P.n = v; regen(); } });
C.rho = K.slider(g, { label: "True correlation ρ", min: -1, max: 1, step: 0.05, value: 0.7, fmt: v => v.toFixed(2), on: v => { P.rho = v; regen(); } });
let rw = K.row(g); K.btn(rw, "🎲 New sample", () => { P.seed = Math.floor(Math.random() * 1e6); regen(); }, "primary"); K.btn(rw, "Clear all points", () => { raw = []; }, "danger");
g = ui.group("Show");
C.line = K.toggle(g, { label: "Regression line y = a + bx", value: true, on: v => P.line = v });
C.resid = K.toggle(g, { label: "Residuals", value: true, on: v => P.resid = v });
C.squares = K.toggle(g, { label: "Squared residuals (what least squares minimises)", value: false, on: v => P.squares = v });
C.mean = K.toggle(g, { label: "Mean point (x̄, ȳ)", value: true, on: v => P.mean = v });
C.xp = K.slider(g, { label: "Predict y at x =", min: 0, max: 100, step: 0.1, value: 50, on: v => P.xp = v });
g = C.advG = ui.group("A level");
C.tr = K.seg(g, { label: "Axes", value: "none", options: [["none", "y against x"], ["logy", "log y against x"], ["loglog", "log y against log x"]], on: v => { P.tr = v; fitView(); fitXp(); } });
C.test = K.toggle(g, { label: "Hypothesis test for zero correlation", value: false, on: v => P.test = v });
C.tail = K.seg(g, { value: "one", options: [["one", "one-tailed (H₁: ρ > 0 or ρ < 0)"], ["two", "two-tailed (H₁: ρ ≠ 0)"]], on: v => P.tail = v });
C.alpha = K.seg(g, { label: "Significance level", value: 0.05, options: [[0.1, "10%"], [0.05, "5%"], [0.025, "2.5%"], [0.01, "1%"]], on: v => P.alpha = v });
const read = K.readout(ui.group("Numbers"), [["n", "n, x̄, ȳ"], ["s", "Sxx, Syy, Sxy"], ["line", "Regression line"], ["r", "PMCC r"], ["pred", "Prediction"], ["test", "Test"]]);

function showCtl() { const adv = ui.level === "adv"; C.advG.style.display = adv ? "" : "none"; C.n.el.style.display = C.rho.el.style.display = P.set === "random" ? "" : "none"; C.set.el.querySelectorAll("button").forEach((b, i) => b.style.display = !Object.values(SETS)[i].adv || adv ? "" : "none"); }
function fitXp() { const p = plotted(); if (!p.length) return; const inp = C.xp.el.querySelector("input"), st = +((view.x1 - view.x0) / 200).toPrecision(1); inp.min = Math.floor(view.x0 / st) * st; inp.max = view.x1; inp.step = st; P.xp = K.clamp(P.xp, +inp.min, view.x1); C.xp.set(P.xp); }
function regen() { raw = SETS[P.set].gen(K.rng(P.seed), P); fitView(); fitXp(); }
function set(k) {
  Object.assign(P, DEF, { set: k, seed: Math.floor(Math.random() * 1e6) });
  if (SETS[k].adv && ui.level !== "adv" && ui.setLevel) ui.setLevel("adv");
  for (const q of ["n", "rho"]) C[q].set(P[q]); for (const q of ["set", "line", "resid", "squares", "mean", "tr", "test", "tail", "alpha"]) C[q].set(P[q]);
  setNote.innerHTML = SETS[k].note; showCtl(); regen(); P.xp = K.mean(plotted().map(p => p[0])); C.xp.set(P.xp);
}
function setP(o) { Object.assign(P, o); for (const q of ["n", "rho", "xp"]) C[q].set(P[q]); for (const q of ["line", "resid", "squares", "mean", "tr", "test", "tail", "alpha"]) C[q].set(P[q]); if ("n" in o || "rho" in o) regen(); if ("tr" in o) { fitView(); fitXp(); } if ("xp" in o) C.xp.set(o.xp); }

// ---------------- 5. Drawing and dragging ----------------
const cv = ui.canvas(() => { });
const chR = K.chart(ui.dock, { title: "Residuals (y − ŷ) against x", yLabel: "residual" });
const chH = K.chart(ui.dock, { title: "r from new samples (same population)", xLabel: "r", yLabel: "samples", yMin: 0 });
let rHist = [];
const M = { L: 78, R: 24, T: 24, B: 46 };
const toPx = (x, y) => [M.L + (x - view.x0) / (view.x1 - view.x0) * (cv.w - M.L - M.R), cv.h - M.B - (y - view.y0) / (view.y1 - view.y0) * (cv.h - M.T - M.B)];
const fromPx = (px, py) => [view.x0 + (px - M.L) / (cv.w - M.L - M.R) * (view.x1 - view.x0), view.y0 + (cv.h - M.B - py) / (cv.h - M.T - M.B) * (view.y1 - view.y0)];
// convert a plotted point back to raw data (undo the logs)
const toRaw = (x, y) => P.tr === "logy" ? [x, Math.pow(10, y)] : P.tr === "loglog" ? [Math.pow(10, x), Math.pow(10, y)] : [x, y];
const TX = (c, s, x, y, col = "#c9d4ea", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,system-ui,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function nearest(p) { const pts = plotted(); let bi = -1, bd = 14; pts.forEach((q, i) => { const [x, y] = toPx(q[0], q[1]), d = Math.hypot(x - p.x, y - p.y); if (d < bd) { bd = d; bi = i; } }); return bi; }
K.pointer(cv.el, {
  down: p => { if (p.e.button === 2) { const i = nearest(p); if (i >= 0) raw.splice(i, 1); return; } const i = nearest(p); if (i >= 0) drag = i; else { const [x, y] = fromPx(p.x, p.y); const q = toRaw(x, y); if (isFinite(q[1])) { raw.push(q); drag = raw.length - 1; } } },
  drag: p => { if (drag == null) return; const out = p.x < M.L - 30 || p.x > cv.w + 10 || p.y < -10 || p.y > cv.h - M.B + 40; if (out) { raw.splice(drag, 1); drag = null; return; } const [x, y] = fromPx(p.x, p.y); raw[drag] = toRaw(x, y); },
  up: () => { drag = null; }, hover: p => { hoverIdx = nearest(p); cv.el.style.cursor = hoverIdx >= 0 ? "grab" : "crosshair"; }
});
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1222"; c.fillRect(0, 0, w, h); if (!view) return;
  const pts = plotted(), s = summary(pts), [xl, yl] = axisName();
  // grid and axes
  const tick = (a, b, n) => { const st = Math.pow(10, Math.floor(Math.log10((b - a) / n))), m = (b - a) / n / st, step = (m < 2 ? 1 : m < 5 ? 2 : 5) * st, o = []; for (let k = Math.ceil(a / step); k * step <= b; k++) o.push(+(k * step).toPrecision(10)); return o; };
  c.strokeStyle = "#1c2742"; c.lineWidth = 1; c.font = "11px Segoe UI";
  for (const v of tick(view.x0, view.x1, 10)) { const [x] = toPx(v, 0); c.beginPath(); c.moveTo(x, M.T); c.lineTo(x, h - M.B); c.stroke(); TX(c, String(v), x, h - M.B + 15, "#8fa0bf", "center", "11px"); }
  for (const v of tick(view.y0, view.y1, 8)) { const [, y] = toPx(0, v); c.beginPath(); c.moveTo(M.L, y); c.lineTo(w - M.R, y); c.stroke(); TX(c, String(v), M.L - 6, y + 4, "#8fa0bf", "right", "11px"); }
  c.strokeStyle = "#3a4a6e"; c.strokeRect(M.L, M.T, w - M.L - M.R, h - M.T - M.B);
  TX(c, xl, (M.L + w - M.R) / 2, h - 12, "#c9d4ea", "center"); c.save(); c.translate(14, (M.T + h - M.B) / 2); c.rotate(-Math.PI / 2); TX(c, yl, 0, 0, "#c9d4ea", "center"); c.restore();
  c.save(); c.beginPath(); c.rect(M.L, M.T, w - M.L - M.R, h - M.T - M.B); c.clip();
  if (s && pts.length >= 2) {
    const xmin = Math.min(...pts.map(q => q[0])), xmax = Math.max(...pts.map(q => q[0]));
    // the range of the data: inside = interpolation, outside = extrapolation
    const [ax] = toPx(xmin, 0), [bx] = toPx(xmax, 0); c.fillStyle = "rgba(255,107,129,.06)"; c.fillRect(M.L, M.T, ax - M.L, h); c.fillRect(bx, M.T, w - bx, h);
    if (P.squares) for (const [x, y] of pts) { const yh = s.a + s.b * x, [px, py] = toPx(x, y), [, ph] = toPx(x, yh), side = Math.abs(py - ph); c.fillStyle = "rgba(255,180,84,.16)"; c.strokeStyle = "rgba(255,180,84,.5)"; const sx = (view.x1 - view.x0) / (w - M.L - M.R) / ((view.y1 - view.y0) / (h - M.T - M.B)); const side2 = side; c.fillRect(px, Math.min(py, ph), side2, side); c.strokeRect(px, Math.min(py, ph), side2, side); }
    if (P.resid) for (const [x, y] of pts) { const [px, py] = toPx(x, y), [, ph] = toPx(x, s.a + s.b * x); c.strokeStyle = "#ffb454"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(px, py); c.lineTo(px, ph); c.stroke(); }
    if (P.line) { const [x0p, y0p] = toPx(view.x0, s.a + s.b * view.x0), [x1p, y1p] = toPx(view.x1, s.a + s.b * view.x1); c.strokeStyle = "#5ad1ff"; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x0p, y0p); c.lineTo(x1p, y1p); c.stroke(); c.lineWidth = 1; }
    if (P.mean) { const [mx, my] = toPx(s.mx, s.my); c.strokeStyle = "#c4a1ff"; c.lineWidth = 2; c.beginPath(); c.moveTo(mx - 8, my); c.lineTo(mx + 8, my); c.moveTo(mx, my - 8); c.lineTo(mx, my + 8); c.stroke(); c.lineWidth = 1; TX(c, "(x̄, ȳ)", mx + 8, my - 8, "#c4a1ff"); }
    if (P.line) { // prediction at x = xp
      const yp = s.a + s.b * P.xp, [px, py] = toPx(P.xp, yp), [, pyb] = toPx(P.xp, view.y0), ext = P.xp < xmin || P.xp > xmax; c.strokeStyle = ext ? "#ff6b81" : "#7ee787"; c.setLineDash([5, 4]); c.beginPath(); c.moveTo(px, pyb); c.lineTo(px, py); c.lineTo(M.L, py); c.stroke(); c.setLineDash([]);
      c.fillStyle = c.strokeStyle; c.beginPath(); c.arc(px, py, 5, 0, 6.3); c.fill(); TX(c, `ŷ = ${K.sig(yp, 4)} ${ext ? "(EXTRAPOLATION)" : "(interpolation)"}`, px + 8, py - 8, c.strokeStyle, "left", "600 12px");
    }
  }
  pts.forEach(([x, y], i) => { const [px, py] = toPx(x, y); c.fillStyle = i === drag || i === hoverIdx ? "#fff" : "#7ee787"; c.beginPath(); c.arc(px, py, i === drag ? 7 : 5, 0, 6.3); c.fill(); c.strokeStyle = "#0b1222"; c.stroke(); });
  c.restore();
  if (s && P.line) TX(c, `y = ${K.sig(s.a, 4)} ${s.b < 0 ? "−" : "+"} ${K.sig(Math.abs(s.b), 4)}x     r = ${s.r.toFixed(4)}     Σ residual² = ${K.sig(s.SSres, 4)}`, M.L + 8, M.T + 16, "#5ad1ff", "left", "600 13px");
  const tst = testResult(s); ui.hud(tst ? tst.html : "");
}
function testResult(s) {
  if (!s || !P.test || ui.level !== "adv" || s.n < 4) return null;
  const tp = P.tail === "two" ? P.alpha / 2 : P.alpha, cr = rCrit(s.n, tp), sig = P.tail === "two" ? Math.abs(s.r) > cr : (s.r >= 0 ? s.r > cr : -s.r > cr), dir = s.r >= 0 ? "ρ > 0" : "ρ < 0";
  return { cr, sig, html: `H₀: ρ = 0 · H₁: ${P.tail === "two" ? "ρ ≠ 0" : dir} · ${100 * P.alpha}% level<br>critical value ${P.tail === "two" ? "±" : s.r < 0 ? "−" : ""}${cr.toFixed(4)} (n = ${s.n})<br>r = ${s.r.toFixed(4)} → ${sig ? '<b style="color:#ff8a9a">significant: reject H₀</b>' : '<b style="color:#8fd0ff">not significant</b>'}` };
}
function panels() {
  const pts = plotted(), s = summary(pts);
  read.set("n", s ? `${s.n}, ${K.sig(s.mx, 4)}, ${K.sig(s.my, 4)}` : pts.length + " point" + (pts.length === 1 ? "" : "s"));
  read.set("s", s ? `${K.sig(s.Sxx, 4)}, ${K.sig(s.Syy, 4)}, ${K.sig(s.Sxy, 4)}` : "–");
  read.set("line", s ? `y = ${K.sig(s.a, 4)} ${s.b < 0 ? "−" : "+"} ${K.sig(Math.abs(s.b), 4)}x` : "–");
  read.set("r", s ? `${s.r.toFixed(4)} (${Math.abs(s.r) > 0.8 ? "strong" : Math.abs(s.r) > 0.5 ? "moderate" : Math.abs(s.r) > 0.2 ? "weak" : "little or no"} ${s.r >= 0 ? "positive" : "negative"})` : "–");
  if (s) { const yp = s.a + s.b * P.xp; let txt = `x = ${K.sig(P.xp, 4)} → ŷ = ${K.sig(yp, 4)}`; if (P.tr === "logy") txt += ` → y = ${K.sig(Math.pow(10, yp), 4)}`; if (P.tr === "loglog") txt += ` → y = ${K.sig(Math.pow(10, yp), 4)} at x = ${K.sig(Math.pow(10, P.xp), 4)}`; read.set("pred", txt); } else read.set("pred", "–");
  const t = testResult(s); read.set("test", t ? `|r| ${t.sig ? ">" : "≤"} ${t.cr.toFixed(4)}: ${t.sig ? "reject H₀" : "do not reject H₀"}` : ui.level === "adv" ? "switch the test on" : "A level");
  if (P.tr === "logy" && s) read.set("line", `log y = ${K.sig(s.a, 4)} + ${K.sig(s.b, 4)}x → k = ${K.sig(Math.pow(10, s.a), 4)}, b = ${K.sig(Math.pow(10, s.b), 4)}`);
  if (P.tr === "loglog" && s) read.set("line", `log y = ${K.sig(s.a, 4)} + ${K.sig(s.b, 4)} log x → a = ${K.sig(Math.pow(10, s.a), 4)}, n = ${K.sig(s.b, 4)}`);
  chR.opts.xLabel = axisName()[0];
  chR.draw(s ? [{ pts: pts.map(([x, y]) => [x, y - s.a - s.b * x]), type: "dots", color: K.cssVar("--s1"), label: "residuals" }] : [], { hlines: [{ y: 0, color: K.cssVar("--muted") }] });
  if (P.set === "random") { const h = K.histogram(rHist.length ? rHist : [0], 20, -1, 1); chH.draw(rHist.length ? [{ pts: h.pts, w: h.w, type: "bars", color: K.cssVar("--s0"), alpha: .8, label: `${rHist.length} samples of ${P.n}` }] : [], { xMin: -1, xMax: 1, vlines: [{ x: P.rho, color: K.cssVar("--s2"), label: "ρ" }].concat(s ? [{ x: s.r, color: K.cssVar("--s1"), label: "this sample", row: 1 }] : []) }); }
  else { chH.opts.title = "r from new samples (choose Random sample)"; chH.draw([], { xMin: -1, xMax: 1 }); }
  if (P.set === "random") chH.opts.title = "r from new samples (same population)";
}
let frame = 0, hKey = "", hAcc = 0;
// while playing, keep drawing fresh samples from the same population in the background to build up the histogram of r
ui.run(dt => { if (P.set !== "random") return; const key = P.n + "," + P.rho; if (key !== hKey) { hKey = key; rHist = []; } hAcc += dt * 20; const r = K.rng(Math.floor(Math.random() * 1e9)); while (hAcc >= 1 && rHist.length < 3000) { hAcc--; rHist.push(summary(randomData(r, P.n, P.rho)).r); } }, () => { draw(); if (frame++ % 5 === 0) panels(); });
ui.onLevel = v => { if (v === "std" && SETS[P.set].adv) set("random"); else { if (v === "std") { P.tr = "none"; C.tr.set("none"); P.test = false; C.test.set(false); fitView(); } showCtl(); } };
set("random");
ui.tip("Click to add a point, drag to move one, right-click to delete.", 7000);
