/* =====================================================================
   WEATHER, CHAOS AND THE BUTTERFLY EFFECT
   Why can't weather be forecast more than about two weeks ahead, however
   good our instruments? Because the atmosphere is CHAOTIC: two states
   that start almost the same drift apart EXPONENTIALLY, the error
   doubling every day or two. Edward Lorenz found this in 1963 with a
   tiny model of convection (three equations):
        dx/dt = σ(y − x)      dy/dt = x(ρ − z) − y      dz/dt = xy − βz
   and later built a "weather ring" of 40 stations (Lorenz 96).
   Forecasters respond with ENSEMBLES: many forecasts from slightly
   different starts. Their spread shows how much to trust the forecast.
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
// ----- Lorenz 63, stepped with Runge–Kutta (4th order)
const L63 = { s: 10, b: 8 / 3 };
function d63(v, rho) { return [L63.s * (v[1] - v[0]), v[0] * (rho - v[2]) - v[1], v[0] * v[1] - L63.b * v[2]]; }
function rk(v, f, dt) { const a = f(v), b = f(v.map((x, i) => x + dt / 2 * a[i])), c = f(v.map((x, i) => x + dt / 2 * b[i])), d = f(v.map((x, i) => x + dt * c[i])); return v.map((x, i) => x + dt / 6 * (a[i] + 2 * b[i] + 2 * c[i] + d[i])); }
const dist = (a, b) => Math.sqrt(a.reduce((s, x, i) => s + (x - b[i]) ** 2, 0));
// a random point on the attractor (spin up from a random start)
function onAttractor(r, rho = 28) { let v = [r.gauss() * 5, r.gauss() * 5, 20 + r.gauss() * 5]; for (let i = 0; i < 1500; i++) v = rk(v, q => d63(q, rho), 0.01); return v; }
// how long until two forecasts δ apart differ by more than the threshold (model time units)
function horizon63(v0, delta, thr, rho = 28, maxT = 60) { let a = v0.slice(), b = [v0[0] + delta, v0[1], v0[2]], t = 0; const dt = 0.01; while (t < maxT) { a = rk(a, q => d63(q, rho), dt); b = rk(b, q => d63(q, rho), dt); t += dt; if (dist(a, b) > thr) return t; } return maxT; }
// largest Lyapunov exponent (growth rate of tiny errors) by repeated renormalisation
function lyap63(r, rho, T = 40) { let a = onAttractor(r, rho), d0 = 1e-8, b = [a[0] + d0, a[1], a[2]], s = 0; const dt = 0.01; for (let t = 0; t < T; t += dt) { a = rk(a, q => d63(q, rho), dt); b = rk(b, q => d63(q, rho), dt); const d = dist(a, b); s += Math.log(d / d0); b = a.map((x, i) => x + (b[i] - x) * d0 / d); } return s / T; }
// ----- Lorenz 96: a ring of N stations; dX_k/dt = (X_k+1 − X_k−2) X_k−1 − X_k + F
function d96(X, F) { const N = X.length, o = new Array(N); for (let k = 0; k < N; k++) o[k] = (X[(k + 1) % N] - X[(k - 2 + N) % N]) * X[(k - 1 + N) % N] - X[k] + F; return o; }
function spin96(r, N, F) { let X = Array.from({ length: N }, () => F + r.gauss()); for (let i = 0; i < 1000; i++) X = rk(X, q => d96(q, F), 0.01); return X; }
const rms = (a, b) => Math.sqrt(a.reduce((s, x, i) => s + (x - b[i]) ** 2, 0) / a.length);
function horizon96(r, o) { let X = spin96(r, o.N, o.F), Y = X.slice(); Y[0] += o.delta; let t = 0; const dt = 0.01; while (t < 30) { X = rk(X, q => d96(q, o.F), dt); Y = rk(Y, q => d96(q, o.F), dt); t += dt; if (rms(X, Y) > o.thr) return t * 5; } return 150; }   // days (1 time unit = 5 days)
function growth96(r, o) { let X = spin96(r, o.N, o.F), Y = X.slice(); Y[0] += 1e-6; const dt = 0.01, e0 = rms(X, Y); for (let t = 0; t < 2; t += dt) { X = rk(X, q => d96(q, o.F), dt); Y = rk(Y, q => d96(q, o.F), dt); } const e1 = rms(X, Y); return Math.log(e1 / e0) / 2; }   // per time unit

// ---------------- The page ----------------
const P = { view: "l63", mode: "two", delta: 1e-4, rho: 28, thr: 5, plane: "xz", N: 40, F: 8, ens: 100, speed: 1 };
let rnd = K.rng(Date.now() % 9973 + 31), A = null, B = null, ens = [], trailA = [], trailB = [], t = 0, sepLog = [], failedAt = null, X = null, Y = null, hov = [], err96 = [];
const ui = K.app({
  title: "Weather Chaos and the Butterfly Effect", subject: "Geography",
  blurb: "Two forecasts a butterfly-flap apart drift into completely different weather: chaos, forecast limits and ensembles",
  reset: () => set({}),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "GCSE geography and science: weather forecasting and its limits, how small differences grow (the butterfly effect), why forecasts are given as probabilities, models and their limitations.", adv: "A level geography (weather systems, forecasting) and maths/physics (non-linear systems, exponential growth of errors, Lyapunov exponents, ensembles and probabilistic forecasts)." } },
  missions: [
    { title: "The butterfly effect", q: "Two forecasts start 0.0001 apart (too small to see). Watch them go round the butterfly-shaped attractor. When do they split?", hint: "They stay together for a while, then suddenly go different ways: a tiny difference has grown exponentially. After that the two 'forecasts' are as different as two random days.", setup() { set({ mode: "two", delta: 1e-4 }); } },
    { title: "Better data, longer forecast?", q: "Make the starting difference 1000 times smaller. How much longer does the forecast stay good?", hint: "Only a few more time units: each 10× improvement adds the same small amount (ln 10 ÷ 0.906 ≈ 2.5 units). Perfect forecasts would need perfect data everywhere.", setup() { set({ mode: "two", delta: 1e-7 }); } },
    { title: "An ensemble", q: "Start 100 forecasts in a tiny blob. What happens to the blob? Is there anything you can still predict?", hint: "The blob stretches and smears over the whole attractor: individual forecasts become useless, but you can still say which states are likely (the attractor's shape: the climate). Weather services run about 50 forecasts like this every day.", setup() { set({ mode: "ens" }); } },
    { title: "When does chaos start?", q: "Lower the heating ρ below 24. What happens to the two forecasts now?", hint: "Below about 24.7 the convection settles into a steady pattern and differences shrink: predictable. Above it, chaos. Weather is in the chaotic regime.", setup() { set({ mode: "two", rho: 20 }); } },
    { title: "The weather ring", q: "Switch to the 40-station weather ring. Disturb one station a tiny amount. How does the error spread?", hint: "The error grows and spreads around the ring (with the 'wind'), until every station is wrong. With 1 time unit = 5 days, the error doubles in about 2 days, like the real atmosphere.", setup() { set({ view: "l96" }); } },
    { lvl: "adv", title: "Measuring the growth rate", q: "Look at the separation on the log graph. Does it follow a straight line? What is its gradient?", hint: "A straight line on a log scale means exponential growth: ln(separation) rises at about 0.906 per unit time (the Lyapunov exponent), so the error doubles every 0.77 time units.", setup() { set({ mode: "two", delta: 1e-8 }); } },
    { lvl: "adv", title: "More forcing, faster chaos", q: "In the weather ring, increase the forcing F from 4 to 16. How does the forecast horizon change?", hint: "Stronger forcing (more heating) makes the 'weather' more turbulent: errors grow faster and forecasts fail sooner. At small F the ring is steady and predictable.", setup() { set({ view: "l96", F: 16 }); } }
  ],
  batch: [
    { title: "Forecast horizon and starting error (Lorenz 63)", question: "How long does a forecast stay within the threshold, for different starting errors?", how: "Random starting points on the attractor; failure when the separation exceeds 5; ρ = 28.", xLabel: "log₁₀(starting difference)", yLabel: "forecast length (time units)", xs: [-1, -2, -3, -4, -5, -6, -7, -8], reps: 15, yMin: 0, theory: lg => Math.log(5 / 10 ** lg) / 0.906, theoryLabel: "ln(threshold ÷ δ) ÷ 0.906", run: (lg, r) => horizon63(onAttractor(r), 10 ** lg, 5), note: "A straight line: each 10× better start adds only about 2.5 time units. Forecasts from some starting points last longer than others (the scatter)." },
    { title: "How long does one forecast last?", question: "From random starting points, what forecast lengths do we get with δ = 10⁻⁶?", how: "Lorenz 63, threshold 5.", yLabel: "forecast length (time units)", reps: 200, bins: 24, theory: Math.log(5 / 1e-6) / 0.906, theoryLabel: "average growth", run: (x, r) => horizon63(onAttractor(r), 1e-6, 5), note: "A wide spread: some weather patterns are more predictable than others. Ensembles tell forecasters which kind of day they face." },
    { title: "When does chaos switch on?", question: "How fast do tiny errors grow, for different heating ρ?", how: "Largest Lyapunov exponent measured over 40 time units.", xLabel: "heating ρ", yLabel: "error growth rate λ (per time unit)", xs: [15, 20, 24, 26, 28, 32, 40], reps: 3, theory: rho => rho < 24.74 ? 0 : NaN, theoryLabel: "λ ≤ 0 below 24.74", run: (rho, r) => lyap63(r, rho), note: "Below ρ ≈ 24.7 errors shrink (λ < 0): steady, predictable convection. Above it λ > 0: chaos. At ρ = 28, λ ≈ 0.9." },
    { title: "Weather ring: forcing and growth rate", question: "How fast do errors grow in the 40-station ring, for different forcing F?", how: "Error growth rate over 2 time units from a 10⁻⁶ disturbance.", xLabel: "forcing F", yLabel: "growth rate (per time unit)", xs: [4, 6, 8, 10, 12, 16], reps: 4, run: (F, r) => growth96(r, { N: 40, F }), note: "More forcing, more turbulence, faster error growth. At F = 8 errors double in about 0.4 time units: about 2 days if 1 unit is 5 days." },
    { title: "Weather ring: forecast length", question: "With 1 time unit = 5 days, how long does a forecast last, for different sizes of starting error?", how: "F = 8, 40 stations; one station disturbed; failure when the RMS error exceeds 1.", xLabel: "log₁₀(starting error)", yLabel: "forecast length (days)", xs: [-1, -2, -3, -4, -5, -6], reps: 8, yMin: 0, note: "About 2 extra days for each 10× better start: forecasts beyond about two weeks are out of reach.", run: (lg, r) => horizon96(r, { N: 40, F: 8, delta: 10 ** lg, thr: 1 }) }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "GCSE", text: "Weather forecasts use computer models of the atmosphere started from observations (weather stations, satellites, balloons)." },
      { lvl: "std", tag: "GCSE", text: "The butterfly effect: tiny differences in the starting state grow until forecasts are completely different. So detailed forecasts are only useful for about a week or two." },
      { lvl: "std", tag: "GCSE", text: "Forecasters run many forecasts from slightly different starts (an ensemble) and give probabilities (e.g. 70% chance of rain)." },
      { lvl: "adv", tag: "A level", text: "Chaotic systems are deterministic but sensitive to initial conditions: errors grow exponentially, δ(t) ≈ δ₀ e^(λt) (λ: the Lyapunov exponent)." },
      { lvl: "adv", tag: "A level", text: "Forecast horizon ≈ (1/λ) ln(tolerance ÷ starting error): improving observations gives only logarithmic gains." },
      { lvl: "adv", tag: "A level", text: "Climate (the statistics of weather, the shape of the attractor) can be predicted even when individual weather cannot." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: "Explain why weather forecasts become less accurate further into the future.", ans: "<ul><li>the starting conditions can never be measured perfectly</li><li>small errors grow over time (the butterfly effect)</li><li>eventually the forecast is no better than a guess, so ensembles and probabilities are used</li></ul>" },
      { lvl: "adv", marks: 3, q: "An error grows as e^(0.906 t). How long does it take to grow from 10⁻⁶ to 5? How much longer if the starting error is 10⁻⁹?", ans: "<ul><li>t = ln(5 ÷ 10⁻⁶) ÷ 0.906 = 17.0 time units</li><li>t = ln(5 ÷ 10⁻⁹) ÷ 0.906 = 24.6</li><li>only 7.6 more units for a 1000× better start</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li><b>Lorenz 63:</b> dx/dt = σ(y − x), dy/dt = x(ρ − z) − y, dz/dt = xy − βz, with σ = 10, β = 8/3 and ρ = 28 (chaotic above about 24.74). Stepped with Runge–Kutta (4th order), Δt = 0.01. Error growth rate at ρ = 28: λ ≈ 0.906.</li>
<li><b>Lorenz 96:</b> a ring of N stations, dXₖ/dt = (Xₖ₊₁ − Xₖ₋₂)Xₖ₋₁ − Xₖ + F (advection, friction, forcing). One time unit is taken as 5 days (Lorenz and Emanuel 1998), which makes the error-doubling time at F = 8 about 2 days, as in the real atmosphere.</li>
<li>A forecast "fails" when the separation (or RMS error) exceeds the chosen threshold.</li></ul>
<h3>Left out</h3>
<ul><li>Real weather models have millions of variables, model errors as well as starting errors, and data assimilation; these toy models show only the mathematics of chaos.</li></ul>
<p>The earlier version of this simulation, with its worksheets, is kept in <a href="original/weather-chaos.html">original/weather-chaos.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("Model");
ctl.view = K.seg(g, { value: "l63", options: [["l63", "🦋 Lorenz 63: convection"], ["l96", "🌐 Lorenz 96: weather ring"]], on: v => { P.view = v; restart(); } });
ctl.mode = K.seg(g, { value: "two", options: [["two", "two forecasts"], ["ens", "ensemble"]], on: v => { P.mode = v; restart(); } });
ctl.delta = K.slider(g, { label: "Starting difference δ (log₁₀)", min: -10, max: -1, step: 0.5, value: -4, fmt: v => "10^" + v, on: v => { P.delta = 10 ** v; restart(); } });
ctl.thr = K.slider(g, { label: "Forecast fails when they differ by", min: 0.5, max: 20, step: 0.5, value: 5, on: v => P.thr = v });
ctl.speed = K.slider(g, { label: "Speed", min: 0.2, max: 5, step: 0.1, value: 1, fmt: v => v + "×", on: v => P.speed = v });
ui.headerSpeed(ctl.speed);   // playback speed lives in the header, beside Pause and Reset
g = ui.group("Lorenz 63");
ctl.rho = K.slider(g, { label: "Heating ρ", min: 10, max: 40, step: 0.5, value: 28, on: v => { P.rho = v; restart(); } });
ctl.plane = K.seg(g, { label: "View", value: "xz", options: [["xz", "x–z"], ["xy", "x–y"], ["yz", "y–z"]], on: v => P.plane = v });
ctl.ens = K.slider(g, { label: "Ensemble size", min: 10, max: 300, step: 10, value: 100, on: v => { P.ens = v; restart(); } });
g = ui.group("Lorenz 96");
ctl.N = K.slider(g, { label: "Stations", min: 20, max: 60, step: 2, value: 40, on: v => { P.N = v; restart(); } });
ctl.F = K.slider(g, { label: "Forcing F", min: 2, max: 16, step: 0.5, value: 8, on: v => { P.F = v; restart(); } });
K.btn(K.row(g), "↺ Start again", () => restart(), "primary");
const read = K.readout(ui.group("Readings"), [["t", "time"], ["sep", "separation"], ["fail", "forecast failed at"], ["pred", "expected (e^λt)"]]);
function set(o) { Object.assign(P, { view: "l63", mode: "two", delta: 1e-4, rho: 28, thr: 5, plane: "xz", N: 40, F: 8, ens: 100 }, o); ctl.view.set(P.view); ctl.mode.set(P.mode); ctl.delta.set(Math.log10(P.delta)); for (const k of ["rho", "thr", "ens", "N", "F"]) ctl[k].set(P[k]); ctl.plane.set(P.plane); restart(); }
function restart() {
  t = 0; sepLog = []; failedAt = null; trailA = []; trailB = []; hov = []; err96 = [];
  if (P.view === "l63") { A = onAttractor(rnd, P.rho); B = [A[0] + P.delta, A[1], A[2]]; ens = P.mode === "ens" ? Array.from({ length: P.ens }, () => [A[0] + P.delta * 1e3 * rnd.gauss(), A[1] + P.delta * 1e3 * rnd.gauss(), A[2] + P.delta * 1e3 * rnd.gauss()]) : []; }
  else { X = spin96(rnd, P.N, P.F); Y = X.slice(); Y[0] += P.delta; ens = P.mode === "ens" ? Array.from({ length: Math.min(30, P.ens) }, () => X.map(v => v + P.delta * rnd.gauss())) : []; }
}
function step(dt) {
  const n = Math.max(1, Math.round(dt * P.speed / 0.01 * 0.6)), h = 0.01;
  for (let i = 0; i < n; i++) {
    t += h;
    if (P.view === "l63") { A = rk(A, q => d63(q, P.rho), h); B = rk(B, q => d63(q, P.rho), h); for (let k = 0; k < ens.length; k++) ens[k] = rk(ens[k], q => d63(q, P.rho), h); const s = dist(A, B); if (i % 3 === 0) sepLog.push([t, Math.log10(Math.max(1e-12, s))]); if (failedAt == null && s > P.thr) failedAt = t; trailA.push(A.slice()); trailB.push(B.slice()); if (trailA.length > 1500) { trailA.shift(); trailB.shift(); } }
    else { X = rk(X, q => d96(q, P.F), h); Y = rk(Y, q => d96(q, P.F), h); for (let k = 0; k < ens.length; k++) ens[k] = rk(ens[k], q => d96(q, P.F), h); const e = rms(X, Y); if (i % 3 === 0) err96.push([t * 5, Math.log10(Math.max(1e-12, e))]); if (failedAt == null && e > 1) failedAt = t; if (i % 5 === 0) { hov.push(X.map((v, k) => Y[k] - v)); if (hov.length > 400) hov.shift(); } }
  }
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#070b16"; c.fillRect(0, 0, w, h);
  if (P.view === "l63") {
    const pi = { xz: [0, 2], xy: [0, 1], yz: [1, 2] }[P.plane], rng = { 0: [-25, 25], 1: [-30, 30], 2: [0, 55] }, X0 = v => 30 + (v[pi[0]] - rng[pi[0]][0]) / (rng[pi[0]][1] - rng[pi[0]][0]) * (w * 0.62), Y0 = v => h - 30 - (v[pi[1]] - rng[pi[1]][0]) / (rng[pi[1]][1] - rng[pi[1]][0]) * (h - 60);
    for (const [tr, col] of [[trailA, "rgba(90,209,255,.5)"], [trailB, "rgba(255,138,112,.5)"]]) { c.strokeStyle = col; c.beginPath(); tr.forEach((v, i) => i ? c.lineTo(X0(v), Y0(v)) : c.moveTo(X0(v), Y0(v))); c.stroke(); }
    for (const v of ens) { c.fillStyle = "rgba(255,209,102,.8)"; c.beginPath(); c.arc(X0(v), Y0(v), 2.5, 0, 6.3); c.fill(); }
    for (const [v, col] of [[A, "#5ad1ff"], [B, "#ff8a70"]]) { c.fillStyle = col; c.beginPath(); c.arc(X0(v), Y0(v), 6, 0, 6.3); c.fill(); }
    let y = 110; const tx = w * 0.68, L = (s, col = "#cfd8ea", f = "13px") => { TX(c, s, tx, y, col, "left", f); y += 24; };
    L(`ρ = ${P.rho}${P.rho < 24.74 ? " (steady, not chaotic)" : " (chaotic)"}`, "#eef2f8", "600 14px"); L("blue: forecast 1 · orange: forecast 2", "#aab6cc", "12px"); L(`(started ${P.delta.toExponential(0)} apart)`, "#aab6cc", "12px");
    L(`separation now ${dist(A, B).toExponential(2)}`, "#ffd166"); L(failedAt != null ? `forecast failed at t = ${failedAt.toFixed(2)}` : "forecasts still agree", failedAt != null ? "#ff6b81" : "#7ee787", "600 13px");
    if (ens.length) { const sp = Math.sqrt(ens.reduce((s, v) => s + dist(v, A) ** 2, 0) / ens.length); L(`ensemble spread ${sp.toFixed(2)}`, "#ffd166"); }
  } else {
    const cx = w * 0.25, cy = h * 0.5, R = Math.min(w * 0.18, h * 0.3), N = X.length;
    c.strokeStyle = "rgba(255,255,255,.2)"; c.beginPath(); c.arc(cx, cy, R, 0, 6.3); c.stroke();
    const ring = (V, col, lw) => { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); for (let k = 0; k <= N; k++) { const a = k / N * 6.283 - Math.PI / 2, rr = R + V[k % N] * 6; k ? c.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a)) : c.moveTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a)); } c.stroke(); c.lineWidth = 1; };
    for (const e of ens) ring(e, "rgba(255,209,102,.25)", 1); ring(X, "#5ad1ff", 2); ring(Y, "#ff8a70", 1.5);
    TX(c, `${N} stations · F = ${P.F} · day ${(t * 5).toFixed(1)}`, cx, cy + 4, "#eef2f8", "center", "600 12.5px");
    // Hovmöller diagram of the error: station across, time down
    const hx = w * 0.52, hw = w * 0.44, hh = h - 80, rows = hov.slice(-200); TX(c, "error at each station (across) over time (down): red +, blue −", hx, 104, "#cfd8ea", "left", "11.5px");
    rows.forEach((rw, j) => { for (let k = 0; k < N; k++) { const e = Math.max(-1, Math.min(1, rw[k] / 2)); c.fillStyle = e > 0 ? `rgba(255,107,129,${Math.min(1, Math.abs(e) + (Math.abs(rw[k]) > 1e-4 ? 0.1 : 0))})` : `rgba(90,140,255,${Math.min(1, Math.abs(e) + (Math.abs(rw[k]) > 1e-4 ? 0.1 : 0))})`; c.fillRect(hx + k * hw / N, 112 + j * (hh - 72) / 200, hw / N + 0.5, (hh - 72) / 200 + 0.5); } });
  }
}

// ---------------- Charts and readings ----------------
function charts() {
  if (P.view === "l63") {
    chA.opts.title = "Separation (log scale)"; chA.opts.xLabel = "time"; chA.opts.yLabel = "log₁₀(separation)";
    chA.draw([{ pts: sepLog, color: "#ffd166", label: "measured" }, { pts: [[0, Math.log10(P.delta)], [Math.max(10, t), Math.log10(P.delta) + 0.906 * Math.max(10, t) / Math.LN10]], color: "#56607a", dash: [5, 4], label: "e^(0.906t)" }], { yMin: Math.log10(P.delta) - 1, yMax: 2, hlines: [{ y: Math.log10(P.thr), label: "fails", color: "#ff6b81" }] });
    const xs = trailA.slice(-600).map((v, i) => [t - (Math.min(600, trailA.length) - i) * 0.01, v[0]]), xs2 = trailB.slice(-600).map((v, i) => [t - (Math.min(600, trailB.length) - i) * 0.01, v[0]]);
    chB.opts.title = "x against time"; chB.opts.xLabel = "time"; chB.opts.yLabel = "x"; chB.draw([{ pts: xs, color: "#5ad1ff", label: "forecast 1" }, { pts: xs2, color: "#ff8a70", label: "forecast 2" }], {});
    read.set("t", t.toFixed(2)); read.set("sep", dist(A, B).toExponential(2)); read.set("fail", failedAt != null ? failedAt.toFixed(2) : "–"); read.set("pred", `fails at about ${(Math.log(P.thr / P.delta) / 0.906).toFixed(1)}`);
  } else {
    chA.opts.title = "RMS error over the ring (log scale)"; chA.opts.xLabel = "days (1 unit = 5 days)"; chA.opts.yLabel = "log₁₀(error)"; chA.draw([{ pts: err96, color: "#ffd166", label: "error" }], { hlines: [{ y: 0, label: "forecast useless", color: "#ff6b81" }] });
    chB.opts.title = "Every station now"; chB.opts.xLabel = "station"; chB.opts.yLabel = "value"; chB.draw([{ pts: X.map((v, k) => [k + 1, v]), color: "#5ad1ff", label: "truth" }, { pts: Y.map((v, k) => [k + 1, v]), color: "#ff8a70", label: "forecast" }], {});
    read.set("t", (t * 5).toFixed(1) + " days"); read.set("sep", rms(X, Y).toExponential(2)); read.set("fail", failedAt != null ? (failedAt * 5).toFixed(1) + " days" : "–"); read.set("pred", "error doubles about every 2 days");
  }
  ui.hud(P.view === "l63" ? "Tiny differences grow exponentially: the butterfly effect" : "One disturbed station: the error spreads round the ring");
}
let frame = 0;
ui.run(dt => { if (dt > 0) step(dt); }, () => { draw(); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("Two forecasts start a butterfly-flap apart. Watch when they split.", 6000);
