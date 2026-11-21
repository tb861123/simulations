/* =====================================================================
   MARKOV CHAINS
   A system is in one of several STATES. Each step it moves to another
   state at random, with probabilities that depend ONLY on where it is
   now (not on how it got there). These are collected in a TRANSITION
   MATRIX T: the entry in row i, column j is P(next state j | now in i),
   and each row adds up to 1.
   If the row vector πₙ gives the probabilities of being in each state
   after n steps, then  πₙ₊₁ = πₙT  and so  πₙ = π₀Tⁿ.
   For many chains πₙ settles to a STEADY STATE π with π = πT: the
   long-run fraction of time spent in each state, whatever the start.
   An ABSORBING state is one you never leave (a probability of 1 of
   staying). Gambler's ruin: a gambler with £k bets £1 at a time until
   they reach £0 or £N; for a fair game P(ruin) = 1 − k/N and the
   expected number of bets is k(N − k).
   ===================================================================== */
// ---------------- 1. Matrix tools ----------------
const vecMat = (v, T) => T[0].map((_, j) => v.reduce((s, vi, i) => s + vi * T[i][j], 0));
const matMul = (A, B) => A.map(r => B[0].map((_, j) => r.reduce((s, a, k) => s + a * B[k][j], 0)));
function matPow(T, n) { let R = T.map((r, i) => r.map((_, j) => +(i === j))), B = T; while (n > 0) { if (n & 1) R = matMul(R, B); B = matMul(B, B); n >>= 1; } return R; }
// steady state: iterate π ← πT many times (fine for these small chains), starting from uniform
function steady(T) { let v = T.map(() => 1 / T.length); for (let k = 0; k < 5000; k++) v = vecMat(v, T); return v; }
const step = (T, i, r) => { let u = r(), j = 0; while (j < T.length - 1 && u >= T[i][j]) { u -= T[i][j]; j++; } return j; };

// ---------------- 2. Ready-made chains ----------------
function chain(Q) {
  if (Q.ch === "weather") return { names: ["sunny", "rainy"], cols: ["#ffd166", "#5ad1ff"], T: [[1 - Q.p, Q.p], [Q.q, 1 - Q.q]], start: 0 };
  if (Q.ch === "brands") return { names: ["Brand A", "Brand B", "Brand C"], cols: ["#ff7b9c", "#7ee787", "#c4a1ff"], T: [[0.8, 0.15, 0.05], [0.1, 0.7, 0.2], [0.2, 0.2, 0.6]], start: 0 };
  if (Q.ch === "ruin") { const N = Q.N, T = []; for (let i = 0; i <= N; i++) { const r = new Array(N + 1).fill(0); if (i === 0 || i === N) r[i] = 1; else { r[i + 1] = Q.w; r[i - 1] = 1 - Q.w; } T.push(r); } return { names: [...Array(N + 1).keys()].map(i => "£" + i), cols: [...Array(N + 1).keys()].map(i => i === 0 ? "#ff6b81" : i === N ? "#7ee787" : `hsl(${200 + i * 10},60%,62%)`), T, start: Q.k, absorbing: [0, N] }; }
  return { names: ["home", "school", "shop", "park"], cols: ["#ffb454", "#5ad1ff", "#7ee787", "#c4a1ff"], T: [[0.1, 0.6, 0.2, 0.1], [0.5, 0, 0.3, 0.2], [0.6, 0, 0.1, 0.3], [0.7, 0, 0.1, 0.2]], start: 0 };
}

// ---------------- 3. State ----------------
const DEF = { ch: "weather", p: 0.3, q: 0.5, N: 6, k: 3, w: 0.5, tokens: 300, speed: 2 };
const P = Object.assign({}, DEF);
let toks = [], nStep = 0, hist = [], walker = 0, visits = [], acc = 0, rand = K.rng(Date.now() % 1e6), absorbedAt = [];
function restart() { const c = chain(P); toks = Array.from({ length: P.tokens }, () => ({ s: c.start, ps: c.start, t: 1 })); nStep = 0; hist = [count()]; walker = c.start; visits = c.T.map(() => 0); absorbedAt = []; }
function count() { const c = chain(P), n = c.T.map(() => 0); for (const t of toks) n[t.s]++; return n.map(v => v / Math.max(1, toks.length)); }
function advance() { const c = chain(P); for (const t of toks) { t.ps = t.s; t.s = step(c.T, t.s, rand); t.t = 0; if (c.absorbing && c.absorbing.includes(t.s) && !c.absorbing.includes(t.ps)) absorbedAt.push(nStep + 1); } nStep++; hist.push(count()); if (hist.length > 400) hist.shift(); walker = step(c.T, walker, rand); visits[walker]++; }

// ---------------- 4. The page ----------------
const ui = K.app({
  title: "Markov Chains", subject: "Further Mathematics",
  blurb: "Hundreds of tokens hop between states by a transition matrix: πₙ = π₀Tⁿ, the steady state, and absorbing chains like gambler's ruin",
  reset: () => restart(), step: () => advance(),
  levels: { std: "Transition matrices", adv: "Steady states and absorption", specs: {
    std: "Uses the matrix multiplication of Pearson Edexcel Further Mathematics Core Pure 3 (8FM0/9FM0): a transition matrix, the distribution after n steps πₙ = π₀Tⁿ, and comparing simulated tokens with the matrix prediction. Markov chains themselves are not a named topic in Edexcel 9FM0; they appear in other boards' Further Statistics and Decision options.",
    adv: "Beyond Edexcel 9FM0: the steady-state (equilibrium) distribution π = πT, long-run proportions of time, absorbing states, the probability of absorption and the expected time to absorption (gambler's ruin)." } },
  missions: [
    { title: "Sunny or rainy?", q: "A sunny day is followed by rain with probability 0.3; a rainy day by sun with probability 0.5. Start everyone on a sunny day. What fraction are sunny after 1, 2, 3 days?", hint: "π₁ = (0.7, 0.3); π₂ = (0.7 × 0.7 + 0.3 × 0.5, …) = (0.64, 0.36); π₃ = (0.628, 0.372). The tokens (dots) agree with the matrix (lines) up to random scatter.", setup: () => set({ ch: "weather" }) },
    { title: "The steady state", q: "Keep running. What fraction of days are sunny in the long run? Does it depend on the starting weather?", hint: "π = πT gives π_sunny = 0.5/(0.3 + 0.5) = 0.625. Start in any state: the chain forgets where it began.", setup: () => set({ ch: "weather", speed: 4 }) },
    { title: "Brand switching", q: "Every customer starts with Brand A. Which brand ends up with the biggest market share?", hint: "Even though A keeps 80% of its customers each month, the steady state is about (0.41, 0.36, 0.23): B gains because it keeps 70% and wins 15% from A, 20% from C.", setup: () => set({ ch: "brands", speed: 3 }) },
    { title: "Tⁿ", q: "Look at the matrix Tⁿ in the readings as n grows. What happens to its rows?", hint: "Every row of Tⁿ tends to the steady state π: whatever the starting state, the probabilities after many steps are the same.", setup: () => set({ ch: "brands" }) },
    { lvl: "adv", title: "Gambler's ruin", q: "A gambler with £3 bets £1 on fair coin tosses until reaching £0 or £6. What fraction end ruined? How long does it take on average?", hint: "For a fair game P(ruin) = 1 − k/N = 1 − 3/6 = 0.5, and the expected number of bets is k(N − k) = 9. £0 and £6 are absorbing states: tokens pile up there.", setup: () => set({ ch: "ruin", N: 6, k: 3, w: 0.5, speed: 3 }) },
    { lvl: "adv", title: "A slightly unfair game", q: "Make the chance of winning each bet 0.45 (like a casino). Start with £3, target £6. How likely is ruin now?", hint: "P(ruin) = (r^k − r^N)/(1 − r^N) with r = 0.55/0.45: about 0.65. A small edge per bet becomes a big edge over a whole game.", setup: () => set({ ch: "ruin", N: 6, k: 3, w: 0.45, speed: 3 }) },
  ],
  batch: [
    { title: "Long-run fraction of sunny days", question: "Follow one chain for 365 days. What fraction of days are sunny?", how: "p = 0.3 (sun → rain), q = 0.5 (rain → sun), starting sunny. Each run: one year.", yLabel: "fraction of sunny days", reps: 300, bins: 24, theory: 0.625, theoryLabel: "steady state q/(p + q)", run: (x, r) => { const T = chain(DEF).T; let s = 0, k = 0; for (let d = 0; d < 365; d++) { s = step(T, s, r); if (s === 0) k++; } return k / 365; }, note: "Close to 0.625, but successive days are linked (spells of weather), so a year's fraction scatters more than 365 independent days would." },
    { title: "Probability of ruin (A level)", question: "In a fair game with target £10, how does the chance of ruin depend on the starting money k?", how: "Each point: 100 games from £k; records the fraction ruined.", xLabel: "starting money k (£)", yLabel: "P(ruin)", xs: [1, 2, 3, 4, 5, 6, 7, 8, 9], reps: 4, yMin: 0, yMax: 1, theory: k => 1 - k / 10, theoryLabel: "1 − k/N", run: (k, r) => { let ru = 0; for (let g = 0; g < 100; g++) { let m = k; while (m > 0 && m < 10) m += r() < 0.5 ? 1 : -1; if (m === 0) ru++; } return ru / 100; }, note: "A straight line: in a fair game your chance of reaching the target is your share of the total money, k/N." },
    { title: "How long does a game last? (A level)", question: "In a fair game with target £10, how many bets until it ends?", how: "Each point: the mean number of bets in 100 games from £k.", xLabel: "starting money k (£)", yLabel: "mean number of bets", xs: [1, 2, 3, 4, 5, 6, 7, 8, 9], reps: 4, yMin: 0, theory: k => k * (10 - k), theoryLabel: "k(N − k)", run: (k, r) => { let tot = 0; for (let g = 0; g < 100; g++) { let m = k, n = 0; while (m > 0 && m < 10) { m += r() < 0.5 ? 1 : -1; n++; } tot += n; } return tot / 100; }, note: "Longest from the middle (25 bets from £5). Individual games vary enormously, so each mean of 100 games still scatters." },
    { title: "Mean return time (A level)", question: "Starting in a sunny day, how many days until the next sunny day, on average?", how: "Each run: the mean gap between sunny days over 1000 days.", yLabel: "mean days between sunny days", reps: 300, bins: 24, theory: 1 / 0.625, theoryLabel: "1/π_sunny", run: (x, r) => { const T = chain(DEF).T; let s = 0, last = 0, gaps = 0, n = 0; for (let d = 1; d <= 1000; d++) { s = step(T, s, r); if (s === 0) { gaps += d - last; last = d; n++; } } return gaps / n; }, note: "The mean return time to a state is 1 ÷ its steady-state probability (Kac's lemma): 1/0.625 = 1.6 days." },
    { title: "Brand A's share after n months", question: "Everyone starts with Brand A. What share has A after n months?", how: "Each point: 300 customers simulated for n months; the fraction with A.", xLabel: "months n", yLabel: "share of Brand A", xs: [0, 1, 2, 3, 5, 8, 12, 20], reps: 5, yMin: 0, yMax: 1, theory: n => matPow(chain({ ch: "brands" }).T, n)[0][0], theoryLabel: "row 1 of Tⁿ", run: (n, r) => { const T = chain({ ch: "brands" }).T; let k = 0; for (let c = 0; c < 300; c++) { let s = 0; for (let m = 0; m < n; m++) s = step(T, s, r); if (s === 0) k++; } return k / 300; }, note: "Falls from 1 to the steady-state share (about 0.40) within about a year. The matrix power gives the exact expected share." },
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "Markov", text: "Transition matrix T: entry (i, j) = P(move to j | in i). Rows add to 1. The next state depends only on the current state (the Markov property)." },
      { lvl: "std", tag: "CP3 link", text: "Row vector of probabilities: πₙ₊₁ = πₙT, so πₙ = π₀Tⁿ. Row i of Tⁿ gives the probabilities after n steps starting from state i." },
      { lvl: "adv", tag: "beyond", text: "Steady state π = πT with entries adding to 1: solve the simultaneous equations. For two states with p = P(1 → 2), q = P(2 → 1): π = (q/(p + q), p/(p + q))." },
      { lvl: "adv", tag: "beyond", text: "Absorbing state: T(i, i) = 1. Fair gambler's ruin from £k to £0 or £N: P(ruin) = 1 − k/N, expected duration k(N − k). Mean return time to state i = 1/πᵢ." },
    ],
    questions: [
      { lvl: "std", marks: 3, q: () => `T = (${(1 - P.p).toFixed(2)} ${P.p.toFixed(2)} ; ${P.q.toFixed(2)} ${(1 - P.q).toFixed(2)}). Today is sunny. Find the probability that it is sunny in two days' time.`, ans: () => { const T = chain(Object.assign({}, P, { ch: "weather" })).T, v = vecMat(vecMat([1, 0], T), T); return `<ul><li>π₁ = (1, 0)T = (${T[0].map(x => x.toFixed(2)).join(", ")})</li><li>π₂ = π₁T</li><li>P(sunny) = ${v[0].toFixed(4)}</li></ul>`; } },
      { lvl: "adv", marks: 4, q: () => `Find the steady-state distribution for the weather chain with p = ${P.p} and q = ${P.q}.`, ans: () => `<ul><li>π = (a, b) with a + b = 1 and a = a(1 − p) + bq</li><li>ap = bq</li><li>a = q/(p + q) = ${(P.q / (P.p + P.q)).toFixed(4)}</li><li>b = ${(P.p / (P.p + P.q)).toFixed(4)}</li></ul>` },
      { lvl: "adv", marks: 2, q: "A gambler with £4 plays a fair game, stopping at £0 or £10. Find the probability of reaching £10 and the expected number of bets.", ans: "<ul><li>P(reach £10) = 4/10 = 0.4</li><li>expected bets = 4 × 6 = 24</li></ul>" },
    ]
  },
  notes: `<h3>What the page does</h3><ul><li>Each dot is a token (a customer, a day, a gambler). Every step each token moves according to its row of T, using random numbers. The bars show the fraction of tokens in each state; the lines on the chart show the matrix prediction π₀Tⁿ.</li><li>One highlighted token is followed for a long time to measure the long-run fraction of time in each state.</li></ul>
<h3>Assumptions and simplifications</h3><ul><li>The Markov property: the future depends only on the present state. Real weather and shoppers have longer memories.</li><li>The probabilities stay the same every step (a time-homogeneous chain).</li><li>The brands and places chains are invented examples.</li></ul>`,
});

// ---------------- 5. Controls ----------------
const C = {};
let g = ui.group("Chain");
C.ch = K.seg(g, { value: "weather", options: [["weather", "weather (2 states)"], ["brands", "brand switching (3)"], ["places", "where am I? (4)"], ["ruin", "gambler's ruin (A level)"]], on: v => set({ ch: v }) });
C.p = K.slider(g, { label: "p = P(sunny → rainy)", min: 0, max: 1, step: 0.05, value: 0.3, fmt: v => v.toFixed(2), on: v => { P.p = v; restart(); } });
C.q = K.slider(g, { label: "q = P(rainy → sunny)", min: 0, max: 1, step: 0.05, value: 0.5, fmt: v => v.toFixed(2), on: v => { P.q = v; restart(); } });
C.N = K.slider(g, { label: "Target £N", min: 2, max: 10, step: 1, value: 6, on: v => { P.N = v; P.k = Math.min(P.k, v - 1); C.k.set(P.k); restart(); } });
C.k = K.slider(g, { label: "Starting money £k", min: 1, max: 9, step: 1, value: 3, on: v => { P.k = Math.min(v, P.N - 1); restart(); } });
C.w = K.slider(g, { label: "Chance of winning each bet", min: 0.3, max: 0.7, step: 0.01, value: 0.5, fmt: v => v.toFixed(2), on: v => { P.w = v; restart(); } });
g = ui.group("Tokens");
C.tokens = K.slider(g, { label: "Number of tokens", min: 50, max: 1000, step: 50, value: 300, on: v => { P.tokens = v; restart(); } });
C.speed = K.slider(g, { label: "Steps per second", min: 0.5, max: 10, step: 0.5, value: 2, on: v => P.speed = v });
const read = K.readout(ui.group("Numbers"), [["n", "Step n"], ["sim", "Tokens in each state"], ["th", "π₀Tⁿ (theory)"], ["ss", "Steady state / absorption"], ["Tn", "Tⁿ"]]);
function showCtl() { const w = P.ch === "weather", r = P.ch === "ruin"; C.p.el.style.display = C.q.el.style.display = w ? "" : "none"; C.N.el.style.display = C.k.el.style.display = C.w.el.style.display = r ? "" : "none"; C.ch.el.querySelectorAll("button")[3].style.display = ui.level === "adv" ? "" : "none"; }
function set(o) { Object.assign(P, DEF, o); if (P.ch === "ruin" && ui.setLevel && ui.level !== "adv") ui.setLevel("adv"); for (const k of ["p", "q", "N", "k", "w", "tokens", "speed"]) C[k].set(P[k]); C.ch.set(P.ch); showCtl(); restart(); }

// ---------------- 6. Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, { title: "Fraction in each state: tokens (dots) and π₀Tⁿ (lines)", xLabel: "step n", yLabel: "fraction", yMin: 0, yMax: 1 });
const chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#c9d4ea", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,system-ui,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function layout(n, w, h) { if (P.ch === "ruin") return [...Array(n).keys()].map(i => [80 + i * (w - 160) / (n - 1), h * 0.42]); const R = Math.min(w, h) * 0.3, cx = w * 0.42, cy = h * 0.47; return [...Array(n).keys()].map(i => [cx + R * Math.cos(-Math.PI / 2 + 2 * Math.PI * i / n), cy + R * Math.sin(-Math.PI / 2 + 2 * Math.PI * i / n)]); }
function draw(dt) {
  const c = cv.ctx, w = cv.w, h = cv.h, ch = chain(P), n = ch.T.length, pos = layout(n, w, h), rad = Math.min(48, Math.min(w, h) * 0.09, P.ch === "ruin" ? (w - 160) / (n - 1) * 0.38 : 99);
  c.fillStyle = "#0b1222"; c.fillRect(0, 0, w, h);
  // arrows with probabilities (not for the long ruin chain, where they are drawn simply)
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const pr = ch.T[i][j]; if (pr <= 0) continue; const [x1, y1] = pos[i], [x2, y2] = pos[j];
    if (i === j) { if (P.ch === "ruin" && !(ch.absorbing || []).includes(i)) continue; const a = P.ch === "ruin" ? -Math.PI / 2 : Math.atan2(y1 - h * 0.47, x1 - w * 0.42); const lx = x1 + Math.cos(a) * (rad + 16), ly = y1 + Math.sin(a) * (rad + 16); c.strokeStyle = "rgba(201,212,234,.5)"; c.lineWidth = 1 + 4 * pr; c.beginPath(); c.arc(lx, ly, 16, 0, 6.3); c.stroke(); c.lineWidth = 1; TX(c, pr.toFixed(2), lx + Math.cos(a) * 30, ly + Math.sin(a) * 30 + 4, "#c9d4ea", "center", "11px"); continue; }
    const ang = Math.atan2(y2 - y1, x2 - x1), off = 7, ox = -Math.sin(ang) * off, oy = Math.cos(ang) * off, sx = x1 + Math.cos(ang) * rad + ox, sy = y1 + Math.sin(ang) * rad + oy, ex = x2 - Math.cos(ang) * (rad + 4) + ox, ey = y2 - Math.sin(ang) * (rad + 4) + oy;
    c.strokeStyle = c.fillStyle = "rgba(201,212,234,.55)"; c.lineWidth = 1 + 4 * pr; c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.stroke(); c.lineWidth = 1; c.beginPath(); c.moveTo(ex, ey); c.lineTo(ex - 10 * Math.cos(ang - 0.4), ey - 10 * Math.sin(ang - 0.4)); c.lineTo(ex - 10 * Math.cos(ang + 0.4), ey - 10 * Math.sin(ang + 0.4)); c.fill();
    if (P.ch !== "ruin" || j === i + 1) TX(c, pr.toFixed(2), (sx + ex) / 2 + ox * 2.2, (sy + ey) / 2 + oy * 2.2 + 4, "#ffe66d", "center", "600 11px"); }
  // states, with the tokens currently in each (a dot each, sliding in after a move)
  const cnt = count();
  for (let i = 0; i < n; i++) { const [x, y] = pos[i]; c.fillStyle = "#121b30"; c.beginPath(); c.arc(x, y, rad, 0, 6.3); c.fill(); c.strokeStyle = ch.cols[i]; c.lineWidth = 3; c.stroke(); c.lineWidth = 1; TX(c, ch.names[i], x, y - rad - 8, ch.cols[i], "center", "600 13px"); TX(c, (100 * cnt[i]).toFixed(0) + "%", x, y + rad + 18, "#fff", "center", "600 12px"); }
  const slot = {}; toks.forEach((t, idx) => { t.t = Math.min(1, t.t + dt * P.speed * 2.5); const k = slot[t.s] = (slot[t.s] || 0) + 1, ga = k * 2.39996, rr = Math.min(rad - 6, 2.2 * Math.sqrt(k)), [tx, ty] = pos[t.s], [fx, fy] = pos[t.ps], e = t.t * t.t * (3 - 2 * t.t), x = fx + (tx - fx) * e + Math.cos(ga) * rr, y = fy + (ty - fy) * e + Math.sin(ga) * rr; c.fillStyle = ch.cols[t.s]; c.fillRect(x - 1.5, y - 1.5, 3, 3); });
  const [wx, wy] = pos[walker]; c.strokeStyle = "#fff"; c.lineWidth = 2; c.beginPath(); c.arc(wx, wy, rad + 5, 0, 6.3); c.stroke(); c.lineWidth = 1;
  ui.hud(`step n = ${nStep}<br>${toks.length} tokens; ring = one token followed for ever`);
}
function panels() {
  const ch = chain(P), n = ch.T.length, cnt = count(), pi0 = ch.T.map((_, i) => +(i === ch.start)), th = vecMat(pi0, matPow(ch.T, nStep)), f = v => v.toFixed(3);
  read.set("n", nStep); read.set("sim", cnt.map(f).join(", ")); read.set("th", th.map(f).join(", "));
  if (P.ch === "ruin") { const r = (1 - P.w) / P.w, pr = Math.abs(P.w - 0.5) < 1e-9 ? 1 - P.k / P.N : (Math.pow(r, P.k) - Math.pow(r, P.N)) / (1 - Math.pow(r, P.N)); read.set("ss", `P(ruin) = ${f(pr)}${Math.abs(P.w - 0.5) < 1e-9 ? `, mean bets ${P.k * (P.N - P.k)}` : ""}${absorbedAt.length ? ` (tokens: mean ${K.mean(absorbedAt).toFixed(1)} bets so far)` : ""}`); }
  else read.set("ss", "π = " + steady(ch.T).map(f).join(", "));
  const Tn = matPow(ch.T, nStep); read.set("Tn", n <= 4 ? Tn.map(r => "(" + r.map(v => v.toFixed(2)).join(" ") + ")").join(" ") : "too big to show");
  const L = Math.max(10, hist.length - 1), base = nStep - (hist.length - 1), series = [];
  for (let i = 0; i < n; i++) { if (P.ch === "ruin" && n > 7 && i !== 0 && i !== n - 1 && i !== P.k) continue; const tl = []; for (let s = 0; s <= L; s++) tl.push([base + s, vecMat(pi0, matPow(ch.T, base + s))[i]]); series.push({ pts: tl, color: ch.cols[i], label: ch.names[i] }); series.push({ pts: hist.map((hh, s) => [base + s, hh[i]]), type: "dots", r: 2, color: ch.cols[i] }); }
  chA.draw(series, { xMin: base, xMax: base + L });
  const tot = visits.reduce((a, b) => a + b, 0);
  if (P.ch === "ruin") { chB.opts.title = "When tokens were absorbed (number of bets)"; chB.opts.xLabel = "bets"; chB.opts.yLabel = "tokens"; if (absorbedAt.length > 1) { const hg = K.histogram(absorbedAt, 20, 0, Math.max(...absorbedAt) + 1); chB.draw([{ pts: hg.pts, w: hg.w, type: "bars", color: K.cssVar("--s4"), alpha: .8 }], { vlines: Math.abs(P.w - 0.5) < 1e-9 ? [{ x: P.k * (P.N - P.k), label: "k(N − k)" }] : [] }); } else chB.draw([]); }
  else { chB.opts.title = `One token's share of time in each state (${tot} steps) against π`; chB.opts.xLabel = "state"; chB.opts.yLabel = "fraction of time"; chB.opts.xFmt = v => Math.abs(v - Math.round(v)) < 1e-6 && ch.names[Math.round(v)] ? ch.names[Math.round(v)] : ""; const ss = steady(ch.T); chB.draw([{ pts: ss.map((v, i) => [i - 0.17, v]), type: "bars", w: 0.3, color: K.cssVar("--s2"), label: "steady state π" }, { pts: visits.map((v, i) => [i + 0.17, tot ? v / tot : 0]), type: "bars", w: 0.3, color: K.cssVar("--s1"), label: "followed token" }], { xMin: -0.6, xMax: n - 0.4, yMin: 0 }); }
  if (P.ch === "ruin") chB.opts.xFmt = null;
}
let frame = 0;
ui.run(dt => { acc += dt * P.speed; while (acc >= 1) { acc--; advance(); } }, dt => { draw(dt); if (frame++ % 6 === 0) panels(); });
ui.onLevel = v => { if (v === "std" && P.ch === "ruin") set({}); showCtl(); };
set({});
ui.tip("Each dot is a token. Every step, each one moves at random using its row of the transition matrix.", 7000);
