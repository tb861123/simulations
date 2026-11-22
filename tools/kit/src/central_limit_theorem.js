/* =====================================================================
   CENTRAL LIMIT THEOREM
   Take ANY population (draw your own). Repeatedly:
     1. pick n values at random          (a sample)
     2. work out their mean              (a statistic)
     3. add that mean to a histogram     (the sampling distribution)
   The theorem says the histogram of means tends to a normal curve,
   centred on the population mean, with spread  sigma / sqrt(n),
   whatever shape the population has. See if you can break it.
   ===================================================================== */
const NB = 40, XMAX = 10, BW = XMAX / NB;      // the population is 40 bars covering values 0 to 10

class Population {
  constructor(heights) { this.h = Float64Array.from(heights); this.update(); }
  update() { // turn bar heights into probabilities, then work out the true mean and standard deviation
    let tot = 0; for (const v of this.h) tot += v; if (tot <= 0) { this.h.fill(1); tot = NB; }
    this.cum = new Float64Array(NB); let c = 0, mu = 0; for (let i = 0; i < NB; i++) { const p = this.h[i] / tot; c += p; this.cum[i] = c; mu += p * (i + .5) * BW; }
    let v = 0, m3 = 0; for (let i = 0; i < NB; i++) { const p = this.h[i] / tot, d = (i + .5) * BW - mu; v += p * (d * d + BW * BW / 12); m3 += p * (d * d * d + d * BW * BW / 4); }
    this.mu = mu; this.sigma = Math.sqrt(v); this.skew = m3 / Math.pow(v, 1.5);
  }
  draw(rand) { const u = rand(); let lo = 0, hi = NB - 1; while (lo < hi) { const mid = (lo + hi) >> 1; this.cum[mid] < u ? lo = mid + 1 : hi = mid; } return (lo + rand()) * BW; }   // pick a bar, then a point inside it
  sample(rand, n) { const s = new Array(n); for (let i = 0; i < n; i++) s[i] = this.draw(rand); return s; }
}
const STATS = {
  mean: { name: "Mean", f: s => K.mean(s) },
  median: { name: "Median", f: s => { const a = s.slice().sort((p, q) => p - q), m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; } },
  max: { name: "Maximum", f: s => Math.max(...s) },
  sd: { name: "Std dev", f: s => K.sd(s) },
};
const SHAPES = {
  uniform: { name: "Uniform", h: i => 1 },
  skew: { name: "Skewed", h: i => Math.exp(-i / 6) },
  bimodal: { name: "Two humps", h: i => Math.exp(-((i - 8) ** 2) / 18) + Math.exp(-((i - 31) ** 2) / 18) },
  ushape: { name: "U-shape", h: i => Math.pow(Math.abs(i - 19.5) / 20, 2.5) + 0.02 },
  outlier: { name: "Rare outliers", h: i => (i >= 4 && i < 9 ? 1 : 0) + (i >= 37 ? 0.06 : 0) },
  spikes: { name: "Two spikes", h: i => (i === 4 || i === 35 ? 1 : 0) },
  normal: { name: "Bell", h: i => Math.exp(-((i - 19.5) ** 2) / 50) },
};
const makePop = k => new Population(Array.from({ length: NB }, (_, i) => SHAPES[k].h(i)));
const skewness = a => { const m = K.mean(a), s = K.sd(a); let t = 0; for (const v of a) t += ((v - m) / s) ** 3; return t / a.length; };

// ---------------------------------------------------------------- page
let pop = makePop("skew"), n = 5, stat = "mean", mode = "slow", vals = [], cis = [], covered = 0, ciCount = 0, anim = null, lastSample = [], lastStat = null, zoom = false, showCurve = true, traceSD = {}, rand = K.rng(Date.now()), lastBin = null; const S = {};
const ui = K.app({
  title: "Central Limit Theorem", subject: "Statistics", blurb: "Draw any population you like. The means of samples from it still pile up into a bell curve.",
  reset: () => clearSamples(),
  missions: [
    { title: "Where does the bell come from?", q: "The population is badly skewed. Watch samples of 5 being drawn and their means dropping into the bottom histogram. Then switch to <b>Turbo</b>. What shape appears? Is it centred where you expected?", hint: "The means pile up in a bell shape centred on the population mean (the dashed line), even though no individual value comes from a bell-shaped population. Averaging cancels out the extremes.", setup: () => { setShape("skew"); S.n.set(5, true); S.stat.set("mean", true); S.mode.set("slow", true); } },
    { title: "Bigger samples", q: "Try n = 2, then 10, then 50 (use Turbo). What happens to the width of the histogram of means? By what factor must n grow to halve the width?", hint: "The spread of the means is σ/√n, the 'standard error'. To halve it you need four times the sample size; to get ten times more precision you need a hundred times the data. The left-hand chart collects your results.", setup: () => { setShape("skew"); S.n.set(2, true); S.stat.set("mean", true); S.mode.set("turbo", true); } },
    { title: "Try to break it", q: "Drag on the top panel to draw the strangest population you can. Can you find one whose sample means (n = 30) do <i>not</i> form a bell?", hint: "Within this box you cannot: any population with a finite spread obeys the theorem. Odd shapes just need a larger n before the bell appears. (Populations with infinite variance, like the Cauchy distribution, do break it, but they do not fit in a box.)", setup: () => { setShape("ushape"); S.n.set(30, true); S.stat.set("mean", true); S.mode.set("turbo", true); ui.tip("Drag up and down on the top panel to reshape the population", 8000); } },
    { title: "How big is 'big enough'?", q: "Textbooks say n = 30 is enough. For this population with rare outliers, look at the histogram of means with n = 30. Is it a symmetrical bell yet? What about n = 100?", hint: "With rare, extreme values the sampling distribution stays lopsided (several bumps: samples with 0, 1, 2… outliers) long after n = 30. 'n ≥ 30' is a rule of thumb, not a law: skewed data such as incomes or insurance claims need much more.", setup: () => { setShape("outlier"); S.n.set(30, true); S.stat.set("mean", true); S.mode.set("turbo", true); } },
    { title: "Not every statistic is normal", q: "Change the statistic to <b>Maximum</b> on the uniform population, n = 20. Does the sampling distribution become a bell? Try Median and Std dev too.", hint: "The maximum piles up against the top of the range and stays skewed for ever: the theorem is about sums and means. The median and the standard deviation do become roughly normal for large n, but more slowly and with a different spread.", setup: () => { setShape("uniform"); S.n.set(20, true); S.stat.set("max", true); S.mode.set("turbo", true); } },
    { title: "What does '95% confident' mean?", q: "Each bar in the right-hand chart is a 95% confidence interval worked out from one sample. Red ones miss the true mean. Run a few hundred samples. What fraction miss? Now set n = 3 with the skewed population.", hint: "About 1 in 20 should miss: that is what 95% means. It is a statement about the method over many samples, not about any single interval. With tiny samples from a skewed population the method under-performs, because it leans on the theorem.", setup: () => { setShape("normal"); S.n.set(25, true); S.stat.set("mean", true); S.mode.set("fast", true); } },
  ],
  batch: [
    { title: "The standard error", question: "How does the spread of sample means depend on sample size?", how: "Skewed population. For each n, 400 samples are drawn and the standard deviation of their means is recorded.", xLabel: "sample size n", yLabel: "SD of the sample means", xs: [1, 2, 4, 8, 16, 32, 64, 100], reps: 6, yMin: 0, theory: x => makePop("skew").sigma / Math.sqrt(x), theoryLabel: "σ / √n",
      run: (x, r) => { const p = makePop("skew"), m = []; for (let i = 0; i < 400; i++) m.push(K.mean(p.sample(r, x))); return K.sd(m); }, note: "Each estimate comes from only 400 sample means, so it has sampling error of its own (about 3.5%). Even a standard error has a standard error." },
    { title: "How fast does skew disappear?", question: "How lopsided is the distribution of means for different n?", how: "Skewed population. For each n, the skewness of 3000 sample means is measured (0 = symmetrical).", xLabel: "sample size n", yLabel: "skewness of the sample means", xs: [1, 2, 4, 8, 16, 32, 64], reps: 6, theory: x => makePop("skew").skew / Math.sqrt(x), theoryLabel: "population skewness / √n",
      run: (x, r) => { const p = makePop("skew"), m = []; for (let i = 0; i < 3000; i++) m.push(K.mean(p.sample(r, x))); return skewness(m); }, note: "Skewness is sensitive to the few most extreme sample means, so it is a noisy thing to measure." },
    { title: "Do 95% intervals cover 95%?", question: "How often does a 95% confidence interval contain the true mean?", how: "Population with rare outliers. For each n, 1000 intervals (mean ± 1.96 × s/√n) are built and the percentage that contain μ is recorded.", xLabel: "sample size n", yLabel: "intervals containing μ (%)", xs: [3, 5, 10, 20, 40, 80, 160], reps: 6, yMax: 100, theory: () => 95, theoryLabel: "the promised 95%",
      run: (x, r) => { const p = makePop("outlier"); let c = 0; for (let i = 0; i < 1000; i++) { const s = p.sample(r, x), m = K.mean(s), e = 1.96 * K.sd(s) / Math.sqrt(x); if (Math.abs(m - p.mu) <= e) c++; } return c / 10; }, note: "Coverage is estimated from 1000 intervals, so it wobbles by about ±0.7 percentage points. The shortfall at small n is real: small samples often contain no outlier at all, so they underestimate both the mean and the spread." },
    { title: "Mean or median?", question: "For bell-shaped data, which is the more precise estimate of the centre?", how: "Bell-shaped population. Ratio = (SD of 1000 sample medians) ÷ (SD of 1000 sample means). Above 1 means the median is noisier.", xLabel: "sample size n", yLabel: "SD of medians ÷ SD of means", xs: [5, 11, 21, 41, 81], reps: 6, theory: () => 1.2533, theoryLabel: "√(π/2) ≈ 1.25 for large n",
      run: (x, r) => { const p = makePop("normal"), a = [], b = []; for (let i = 0; i < 1000; i++) { const s = p.sample(r, x); a.push(STATS.median.f(s)); b.push(K.mean(s)); } return K.sd(a) / K.sd(b); }, note: "For normal data the mean uses the information more efficiently: the median needs about 57% more data for the same precision. With outliers it is the other way round, which is why median house prices are quoted." },
  ],
  notes: `<h3>What happens</h3><ul><li>The population is the set of 40 bars you can draw, covering values 0 to 10. Bar height = how common that value is.</li><li>A sample is n independent random draws from it (with replacement).</li><li>The chosen statistic of each sample goes into the bottom histogram: the <b>sampling distribution</b>.</li><li>The dashed curve is the theorem's prediction for the mean: normal, centred on μ, standard deviation σ/√n.</li></ul>
  <h3>Confidence intervals</h3><p>For each sample the page works out <code>mean ± 1.96 × s/√n</code>, where s is that sample's own standard deviation. (For small n a statistician would use a t-value instead of 1.96: the shortfall you see at small n is partly that.)</p>
  <h3>Assumptions and simplifications</h3><ul><li>Draws are independent and the population never changes. Real sampling can be biased or clustered, and no theorem repairs a biased sample.</li><li>Values are limited to 0–10, so every population here has a finite variance and the theorem must work. Heavy-tailed populations with infinite variance are the genuine exceptions.</li><li>Random numbers come from a computer algorithm (a pseudo-random generator).</li></ul>`,
});
let g = ui.group("Population");
S.shape = K.seg(g, { value: "skew", options: Object.entries(SHAPES).map(([k, v]) => [k, v.name]), on: v => setShape(v), tip: "…or <b>drag on the top panel</b> to draw your own." });
g = ui.group("Sampling");
S.n = K.slider(g, { label: "Sample size n", min: 1, max: 100, step: 1, value: 5, on: v => { n = v; clearSamples(true); } });
S.stat = K.seg(g, { label: "Statistic worked out from each sample", value: "mean", options: Object.entries(STATS).map(([k, v]) => [k, v.name]), on: v => { stat = v; clearSamples(true); } });
S.mode = K.seg(g, { label: "Speed", value: "slow", options: [["slow", "Slow"], ["fast", "Fast"], ["turbo", "Turbo"]], on: v => { mode = v; anim = null; ui.setPlaying(true); } });
ui.headerSpeed(S.mode);   // playback speed lives in the header, beside Pause and Reset
const r1 = K.row(g); K.btn(r1, "Draw one sample", () => { ui.setPlaying(false); anim = null; takeSample(true); }); K.btn(r1, "Clear samples", () => clearSamples(), "danger");
g = ui.group("View");
S.curve = K.toggle(g, { label: "Show the normal curve predicted by the theorem", value: true, on: v => showCurve = v });
S.zoom = K.toggle(g, { label: "Zoom in on the sampling distribution", value: false, on: v => zoom = v });
g = ui.group("Numbers");
const read = K.readout(g, [["mu", "Population mean μ"], ["sig", "Population SD σ"], ["mm", "Mean of the statistics"], ["sm", "SD of the statistics"], ["se", "Theory σ/√n"], ["k", "Samples taken"]]);

function setShape(k) { S.shape.set(k); pop = makePop(k); traceSD = {}; clearSamples(); }
function clearSamples(keepTrace) { vals = []; cis = []; covered = 0; ciCount = 0; anim = null; lastSample = []; lastStat = null; if (!keepTrace) traceSD = {}; }
function record(s) {
  const v = STATS[stat].f(s); if (!isFinite(v)) return; vals.push(v); if (vals.length > 200000) vals.shift(); lastSample = s; lastStat = v;
  if (n > 1) { const m = K.mean(s), e = 1.96 * K.sd(s) / Math.sqrt(n), hit = Math.abs(m - pop.mu) <= e; cis.push([m - e, m + e, hit]); if (cis.length > 60) cis.shift(); ciCount++; if (hit) covered++; }
}
function takeSample(animate) {
  const s = pop.sample(rand, n);
  if (animate) anim = { s, t: 0, balls: s.map((x, i) => ({ x, delay: i * Math.min(0.06, 0.9 / n) })), v: STATS[stat].f(s), done: false }; else record(s);
}
// ---- Drawing ----
const cv = ui.canvas(); let G = {};
function layout() { const w = cv.w, h = cv.h; G = { x0: 64, x1: w - 28, p0: 34, p1: h * 0.34, t0: h * 0.42, t1: h * 0.5, s0: h * 0.59, s1: h - 30 }; G.X = v => G.x0 + v / XMAX * (G.x1 - G.x0); }
function range() { if (!zoom || vals.length < 20) return [0, XMAX]; const m = K.mean(vals), s = K.sd(vals) || 0.1; return [m - 4.5 * s, m + 4.5 * s]; }
function draw(dt) {
  layout(); const c = cv.ctx, w = cv.w, h = cv.h, { x0, x1, p0, p1, t0, t1, s0, s1, X } = G;
  const bg = c.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, "#0c1428"); bg.addColorStop(1, "#070b16"); c.fillStyle = bg; c.fillRect(0, 0, w, h);
  c.font = "600 12px Segoe UI,sans-serif"; c.textAlign = "left";
  // --- 1. the population
  c.fillStyle = "#ffb454"; c.fillText("① THE POPULATION  (drag to reshape it)", x0, p0 - 12);
  const hm = Math.max(...pop.h), bw = (x1 - x0) / NB;
  for (let i = 0; i < NB; i++) { const bh = pop.h[i] / hm * (p1 - p0); const gr = c.createLinearGradient(0, p1 - bh, 0, p1); gr.addColorStop(0, "#ffc978"); gr.addColorStop(1, "#b9650a"); c.fillStyle = gr; c.fillRect(x0 + i * bw + 1, p1 - bh, bw - 2, bh); }
  c.strokeStyle = "#3a4a6e"; c.lineWidth = 1; c.beginPath(); c.moveTo(x0, p1 + .5); c.lineTo(x1, p1 + .5); c.stroke();
  c.font = "11px Segoe UI,sans-serif"; c.fillStyle = "#8fa0bf"; c.textAlign = "center"; for (let v = 0; v <= 10; v++) c.fillText(v, X(v), p1 + 14);
  const muLine = (ya, yb) => { c.setLineDash([5, 4]); c.strokeStyle = "#fff"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(X(pop.mu), ya); c.lineTo(X(pop.mu), yb); c.stroke(); c.setLineDash([]); };
  muLine(p0, p1); c.fillStyle = "#fff"; c.textAlign = "left"; c.fillText(`μ = ${pop.mu.toFixed(2)}`, X(pop.mu) + 6, p0 + 10);
  c.strokeStyle = "rgba(255,255,255,.5)"; c.beginPath(); c.moveTo(X(pop.mu - pop.sigma), p0 + 22); c.lineTo(X(pop.mu + pop.sigma), p0 + 22); c.stroke(); c.fillStyle = "rgba(255,255,255,.7)"; c.fillText(`± σ = ${pop.sigma.toFixed(2)}`, X(pop.mu + pop.sigma) + 6, p0 + 26);
  // --- 2. one sample
  c.font = "600 12px Segoe UI,sans-serif"; c.fillStyle = "#7ee787"; c.textAlign = "left"; c.fillText(`② ONE SAMPLE OF ${n}`, x0, t0 - 8);
  c.fillStyle = "rgba(255,255,255,.04)"; c.fillRect(x0, t0, x1 - x0, t1 - t0); c.strokeStyle = "#3a4a6e"; c.strokeRect(x0 + .5, t0 + .5, x1 - x0, t1 - t0);
  const rb = Math.max(2.5, Math.min(6, 60 / Math.sqrt(n) / 3));
  let shown = lastSample, sv = lastStat, markerY = t1 + 8;
  if (anim) {
    anim.t += dt * 1.2; shown = []; let allDown = true;
    for (const b of anim.balls) { const tt = anim.t - b.delay; if (tt < 0) { allDown = false; continue; } const fall = Math.min(1, tt / 0.45), y = p1 - 4 + (t1 - rb - 2 - (p1 - 4)) * fall * fall; if (fall < 1) allDown = false; c.fillStyle = "#b5f5c0"; c.beginPath(); c.arc(X(b.x), y, rb, 0, 6.3); c.fill(); }
    if (allDown) { if (!anim.tDown) anim.tDown = anim.t; const k = Math.min(1, (anim.t - anim.tDown - 0.25) / 0.5); sv = anim.v; markerY = t1 + 8 + Math.max(0, k) * (s1 - t1 - 20); if (k >= 1 && !anim.done) { anim.done = true; record(anim.s); anim = null; } } else sv = null;
  } else for (const v of shown) { c.fillStyle = "rgba(181,245,192,.8)"; c.beginPath(); c.arc(X(v), t1 - rb - 2, rb, 0, 6.3); c.fill(); }
  // --- 3. the sampling distribution
  const [r0, r1] = range(), RX = v => x0 + (v - r0) / (r1 - r0) * (x1 - x0), nb = 100, bwid = (r1 - r0) / nb, counts = new Uint32Array(nb);
  for (const v of vals) { const i = Math.floor((v - r0) / bwid); if (i >= 0 && i < nb) counts[i]++; }
  let cm = 4; for (const q of counts) if (q > cm) cm = q;
  const se = pop.sigma / Math.sqrt(n), peak = vals.length * bwid / (se * Math.sqrt(2 * Math.PI)); if (showCurve && stat === "mean" && peak > cm) cm = peak;
  c.font = "600 12px Segoe UI,sans-serif"; c.fillStyle = "#5ad1ff"; c.textAlign = "left"; c.fillText(`③ THE ${STATS[stat].name.toUpperCase()} OF EVERY SAMPLE SO FAR  (${vals.length.toLocaleString()} samples)`, x0, s0 - 10);
  const sbw = (x1 - x0) / nb; for (let i = 0; i < nb; i++) if (counts[i]) { const bh = counts[i] / cm * (s1 - s0 - 6); const gr = c.createLinearGradient(0, s1 - bh, 0, s1); gr.addColorStop(0, "#7fdcff"); gr.addColorStop(1, "#1672a8"); c.fillStyle = gr; c.fillRect(x0 + i * sbw + .5, s1 - bh, sbw - 1, bh); }
  c.strokeStyle = "#3a4a6e"; c.beginPath(); c.moveTo(x0, s1 + .5); c.lineTo(x1, s1 + .5); c.stroke();
  c.font = "11px Segoe UI,sans-serif"; c.fillStyle = "#8fa0bf"; c.textAlign = "center"; const tk = zoom && vals.length >= 20 ? 8 : 10; for (let k = 0; k <= tk; k++) { const v = r0 + (r1 - r0) * k / tk; c.fillText(zoom ? v.toFixed(2) : v.toFixed(0), RX(v), s1 + 14); }
  if (pop.mu > r0 && pop.mu < r1) { c.setLineDash([5, 4]); c.strokeStyle = "#fff"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(RX(pop.mu), s0); c.lineTo(RX(pop.mu), s1); c.stroke(); c.setLineDash([]); }
  if (showCurve && stat === "mean" && vals.length > 5) { c.strokeStyle = "#ff7b9c"; c.lineWidth = 2.2; c.setLineDash([7, 4]); c.beginPath(); for (let px = x0; px <= x1; px += 2) { const v = r0 + (px - x0) / (x1 - x0) * (r1 - r0), y = s1 - peak * Math.exp(-((v - pop.mu) ** 2) / (2 * se * se)) / cm * (s1 - s0 - 6); px === x0 ? c.moveTo(px, y) : c.lineTo(px, y); } c.stroke(); c.setLineDash([]); c.fillStyle = "#ff7b9c"; c.textAlign = "right"; c.fillText("theorem: normal, SD = σ/√n", x1, s0 + 4); }
  if (sv != null && (anim || !ui.playing || mode === "slow")) { const mxp = anim && markerY > t1 + 30 ? RX(sv) * Math.min(1, (markerY - t1) / (s1 - t1 - 20)) + X(sv) * (1 - Math.min(1, (markerY - t1) / (s1 - t1 - 20))) : X(sv); c.fillStyle = "#fff"; c.beginPath(); c.moveTo(mxp, markerY + 9); c.lineTo(mxp - 7, markerY - 3); c.lineTo(mxp + 7, markerY - 3); c.fill(); c.textAlign = "left"; c.font = "600 11px Segoe UI,sans-serif"; c.fillText(`${STATS[stat].name.toLowerCase()} = ${sv.toFixed(2)}`, mxp + 11, markerY + 6); }
}
// drag on the population panel to reshape it
function sculpt(p) {
  if (p.y < G.p0 - 20 || p.y > G.p1 + 16 && lastBin == null) return; const i = K.clamp(Math.floor((p.x - G.x0) / (G.x1 - G.x0) * NB), 0, NB - 1), v = K.clamp((G.p1 - p.y) / (G.p1 - G.p0), 0, 1);
  const hm = Math.max(...pop.h, 1e-9), a = lastBin == null ? i : lastBin.i, va = lastBin == null ? v : lastBin.v;
  for (let k = Math.min(a, i); k <= Math.max(a, i); k++) pop.h[k] = hm * (a === i ? v : va + (v - va) * (k - a) / (i - a));
  lastBin = { i, v }; pop.update(); clearSamples(); S.shape.set("custom");
}
K.pointer(cv.el, { down: p => { lastBin = null; sculpt(p); }, drag: p => { if (lastBin) sculpt(p); }, up: () => lastBin = null, hover: p => cv.el.style.cursor = p.y > G.p0 - 20 && p.y < G.p1 ? "crosshair" : "default" });

const chS = K.chart(ui.dock, { title: "Spread of the sample means for each n you have tried", xLabel: "sample size n", yLabel: "SD of sample means", yMin: 0, xMin: 0, xMax: 100 });
const ciBox = K.$("div"); ciBox.style.position = "relative"; ui.dock.append(ciBox); const ci = K.canvas(ciBox);
function drawCI() {
  const c = ci.ctx, w = ci.w, h = ci.h; c.clearRect(0, 0, w, h); const text = K.cssVar("--text"), muted = K.cssVar("--muted");
  c.font = "600 12px Segoe UI,sans-serif"; c.fillStyle = text; c.textAlign = "left"; c.textBaseline = "middle"; c.fillText("95% confidence intervals (last 60 samples)", 14, 12);
  c.font = "11px Segoe UI,sans-serif"; c.textAlign = "right"; c.fillStyle = muted; c.fillText(ciCount ? `${(covered / ciCount * 100).toFixed(1)}% of ${ciCount.toLocaleString()} intervals contain μ` : n < 2 ? "needs n ≥ 2" : "", w - 12, 12);
  if (!cis.length) return; let lo = Infinity, hi = -Infinity; for (const q of cis) { if (q[0] < lo) lo = q[0]; if (q[1] > hi) hi = q[1]; } lo = Math.min(lo, pop.mu - .1); hi = Math.max(hi, pop.mu + .1);
  const Y = v => h - 22 - (v - lo) / (hi - lo) * (h - 52), L = 46; c.strokeStyle = muted; c.setLineDash([5, 4]); c.beginPath(); c.moveTo(L, Y(pop.mu)); c.lineTo(w - 10, Y(pop.mu)); c.stroke(); c.setLineDash([]); c.textAlign = "right"; c.fillStyle = muted; c.fillText("μ", L - 6, Y(pop.mu)); c.fillText(hi.toFixed(1), L - 6, Y(hi)); c.fillText(lo.toFixed(1), L - 6, Y(lo));
  cis.forEach((q, i) => { const x = L + 8 + i * (w - L - 24) / 60; c.strokeStyle = q[2] ? K.cssVar("--s0") : K.cssVar("--bad"); c.lineWidth = q[2] ? 2 : 3; c.beginPath(); c.moveTo(x, Y(q[0])); c.lineTo(x, Y(q[1])); c.stroke(); c.fillStyle = c.strokeStyle; c.beginPath(); c.arc(x, Y((q[0] + q[1]) / 2), 2.2, 0, 6.3); c.fill(); });
}
let frame = 0, acc = 0;
ui.run(dt => {
  if (lastBin) return;
  if (mode === "slow") { if (!anim) takeSample(true); }
  else { acc += dt * (mode === "fast" ? 25 : 3000); const k = Math.floor(acc); acc -= k; for (let i = 0; i < k; i++) takeSample(false); }
}, dt => {
  draw(dt); if (frame++ % 5) return;
  if (stat === "mean" && vals.length >= 30) traceSD[n] = K.sd(vals.length > 5000 ? vals.slice(-5000) : vals);
  const tp = []; for (let k = 1; k <= 100; k++) tp.push([k, pop.sigma / Math.sqrt(k)]);
  chS.draw([{ pts: tp, color: K.cssVar("--s3"), dash: [6, 4], label: "theory σ/√n" }, { pts: Object.entries(traceSD).map(([k, v]) => [+k, v]), type: "dots", color: K.cssVar("--s0"), r: 4.5, label: "your results" }]);
  drawCI();
  read.set("mu", pop.mu.toFixed(3)); read.set("sig", pop.sigma.toFixed(3)); read.set("mm", vals.length ? K.mean(vals).toFixed(3) : "–"); read.set("sm", vals.length > 1 ? K.sd(vals.length > 20000 ? vals.slice(-20000) : vals).toFixed(3) : "–"); read.set("se", (pop.sigma / Math.sqrt(n)).toFixed(3)); read.set("k", vals.length.toLocaleString());
});
ui.onTheme = drawCI;
ui.tip("Each green ball is one random value from the population · the white marker is the sample's mean");
