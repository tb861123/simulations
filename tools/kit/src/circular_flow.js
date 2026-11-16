/* =====================================================================
   THE CIRCULAR FLOW OF INCOME AND THE MULTIPLIER
   Firms pay households incomes (wages, rent, profit). Households spend
   most of it on firms' goods (consumption, C) and the rest LEAKS out:
       saving S (to banks), taxes T (to government), imports M (abroad).
   Money comes back in as INJECTIONS:
       investment I (from banks), government spending G, exports X.
   National income settles where injections = withdrawals:
       Y* = (I + G + X) ÷ MPW,  where MPW = MPS + MPT + MPM.
   A new injection is spent, becomes someone's income, is partly spent
   again, and so on: the MULTIPLIER  k = 1 ÷ (1 − MPC) = 1 ÷ MPW.
   One "round" is about a quarter of a year. Money is in £ billion.
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
// o = { s, t, m (marginal propensities), I, G, X (£bn a quarter), nH (households), spread (of MPCs), sigma (income inequality), tilt (richer save more), v (accelerator), noise }
function makeEcon(o, r) {
  const H = [];
  for (let i = 0; i < o.nH; i++) H.push({ z: r.gauss(), g: r.gauss() });
  let tot = 0; for (const h of H) { h.inc = Math.exp(o.sigma * h.z); tot += h.inc; } for (const h of H) h.w = h.inc / tot;   // income shares (log-normal)
  const zbar = H.reduce((s, h) => s + h.z, 0) / H.length, sdz = Math.sqrt(H.reduce((s, h) => s + (h.z - zbar) ** 2, 0) / H.length) || 1;   // the average household (not weighted by income)
  const c0 = 1 - o.s - o.t - o.m;
  // each household's MPC: the average, plus its own difference, minus "tilt" if it is richer than average
  for (const h of H) h.c = K.clamp(c0 + o.spread * h.g - o.tilt * 0.12 * (h.z - zbar) / sdz, 0.02, 0.98);
  const cBar = H.reduce((s, h) => s + h.w * h.c, 0);                             // the economy's MPC = income-weighted average
  const J = o.I + o.G + o.X, Y0 = o.start != null ? o.start : J / (1 - cBar);
  return { o, H, c: cBar, Y: Y0, Yp: Y0, round: 0, hist: [], extra: { G: 0, I: 0, X: 0 }, flows: null };
}
// one round: last round's spending on UK goods becomes this round's income
function stepEcon(e, r) {
  const o = e.o, Y = e.Y, wd = 1 - e.c, sh = o.s + o.t + o.m || 1;
  const I = Math.max(0, o.I + e.extra.I + o.v * (Y - e.Yp)), G = o.G + e.extra.G, X = o.X + e.extra.X;
  const C = e.c * Y * (1 + o.noise * 0.02 * (r ? r.gauss() : 0));
  const f = { Y, C, S: wd * Y * o.s / sh, T: wd * Y * o.t / sh, M: wd * Y * o.m / sh, I, G, X };
  e.Yp = Y; e.Y = C + I + G + X; e.round++; e.flows = f; e.hist.push(Object.assign({ round: e.round }, f)); return f;
}
// the multiplier measured in the model: the same economy (same households, same random numbers) with and without extra spending
function measureK(o, r, rounds = 40, dG = 10) {
  const seed = Math.floor(r() * 1e9), a = makeEcon(o, K.rng(seed)), b = makeEcon(o, K.rng(seed)), ra = K.rng(seed + 1), rb = K.rng(seed + 1);
  b.extra.G = dG; let peak = 0;
  for (let i = 0; i < rounds; i++) { stepEcon(a, ra); stepEcon(b, rb); peak = Math.max(peak, (b.Y - a.Y) / dG); }
  return { k: (b.Y - a.Y) / dG, peak, cBar: a.c };
}
const BASE = () => ({ s: 0.1, t: 0.15, m: 0.15, I: 100, G: 110, X: 75.6, nH: 200, spread: 0.05, sigma: 0.6, tilt: 0, v: 0, noise: 0 });
// AD/AS (A level): AD from the multiplier; SRAS (classical: wages adjust) or a Keynesian AS curve
function adY(P, A) { return A.Yad * (1 - 0.45 * (P / 100 - 1)); }
function asP(Y, A) { if (A.view === "keynes") { const x = K.clamp((Y - 0.85 * A.Yf) / (0.15 * A.Yf), 0, 0.995); return 100 + A.cost + 6 * x * x / (1 - x); } return A.Pe + A.cost + 60 * (Y / A.Yf - 1); }
function adasEq(A) { let lo = 0, hi = 400; for (let k = 0; k < 60; k++) { const P = (lo + hi) / 2; if (adY(P, A) > (A.view === "keynes" ? invKeynes(P, A) : A.Yf * (1 + (P - A.Pe - A.cost) / 60))) lo = P; else hi = P; } const P = (lo + hi) / 2; return { P, Y: adY(P, A) }; }
function invKeynes(P, A) { let lo = 0, hi = A.Yf * 0.9999; if (asP(hi, A) < P) return A.Yf; for (let k = 0; k < 50; k++) { const m = (lo + hi) / 2; if (asP(m, A) < P) lo = m; else hi = m; } return (lo + hi) / 2; }

// ---------------- The page ----------------
const P = Object.assign(BASE(), { sectors: 5, view: "flow", dJ: 10, detail: 10 });
let rnd = K.rng(Date.now() % 99991 + 3), econ = null, speed = 1, acc = 0, dots = [], kRun = null, A = null;
const ui = K.app({
  title: "The Circular Flow and the Multiplier", subject: "Economics",
  blurb: "Money flowing between households, firms, banks, government and overseas: injections, withdrawals, the multiplier and AD/AS",
  reset: () => set({}),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "Edexcel International GCSE Economics (4EC1) 2.2–2.3: the circular flow of income in outline, injections (I, G, X) and withdrawals (S, T, M), aggregate demand AD = C + I + G + (X − M). The multiplier calculation is A level (9EC0 2.4.4).", adv: "Edexcel A level Economics A (9EC0) Theme 2, 2.4.2–2.4.4 and 2.3: the circular flow, injections and withdrawals, MPC, MPS, MPT, MPM, MPW, the multiplier k = 1 ÷ (1 − MPC) = 1 ÷ MPW, the accelerator, AD/AS (SRAS, classical and Keynesian LRAS), output gaps, demand-pull and cost-push shocks." } },
  missions: [
    { title: "Follow the money", q: "Watch the flows. Which way does money go between households and firms? Where does money leak out, and where does it come back in?", hint: "Firms pay incomes to households; households spend most of it back on firms (C). Saving, taxes and imports leak out; investment, government spending and exports flow back in to firms.", setup() { set({}); } },
    { title: "Two sectors", q: "Choose 2 sectors (households and firms only). What happens to national income round after round?", hint: "With no leakages and no injections, every pound earned is spent: income goes round and round unchanged. Real economies have all five sectors.", setup() { set({ sectors: 2 }); } },
    { title: "Injections = withdrawals", q: "Start national income at £400bn. Where does it settle? Compare total injections and withdrawals once it settles.", hint: "It rises until withdrawals (S + T + M) equal injections (I + G + X): at Y = J ÷ MPW. If injections exceed withdrawals, income grows; if withdrawals exceed injections, it shrinks.", setup() { set({ start: 400 }); } },
    { title: "The multiplier", q: "Switch to the multiplier view and add £10bn of government spending. How much does national income rise, round by round?", hint: "First £10bn, then MPC × 10, then MPC² × 10, … The total approaches £10bn ÷ MPW = £10bn × 2.5 = £25bn (MPW 0.4). Most of the effect comes in the first few rounds.", setup() { set({ view: "mult" }); kick("G"); } },
    { title: "Leaky economies", q: "Raise the MPM from 0.15 to 0.4 (a very open economy). Add £10bn of G again. What happens to the multiplier?", hint: "More leaks out in imports each round, so the multiplier falls: 1 ÷ (0.1 + 0.15 + 0.4) = 1.5. Small open economies have small multipliers.", setup() { set({ view: "mult", m: 0.4 }); kick("G"); } },
    { lvl: "adv", title: "Who gets the money?", q: "Make richer households save more (tilt), then add £10bn of G. Is the multiplier still 1 ÷ MPW?", hint: "No: the economy's MPC is the income-weighted average, and the richest have the most income but the lowest MPC, so the multiplier falls below 1 ÷ (average MPW). Spending aimed at poorer households has a bigger multiplier.", setup() { set({ view: "mult", tilt: 1 }); kick("G"); } },
    { lvl: "adv", title: "The accelerator", q: "Set the accelerator v to 0.6 and add £10bn of investment. What does income do?", hint: "Rising income makes firms invest more (I = I₀ + v ΔY), which raises income further: the rise overshoots and then oscillates (the multiplier–accelerator model of the business cycle).", setup() { set({ view: "mult", v: 0.6 }); kick("I"); } },
    { lvl: "adv", title: "Demand-pull inflation", q: "In the AD/AS view, raise AD with £20bn of extra G in a classical economy at full capacity. What happens to output and prices in the short and long run?", hint: "Short run: output and the price level rise (positive output gap). Then wages catch up, SRAS shifts left, and output returns to potential with a permanently higher price level.", setup() { set({ view: "adas", asView: "classical" }); kick("G", 20); } },
    { lvl: "adv", title: "Spare capacity", q: "Switch to the Keynesian AS curve with a big negative output gap. Does extra G raise prices or output?", hint: "Mostly output: on the flat part of the Keynesian AS curve there is spare capacity, so demand raises real output with little inflation. Near full capacity the same boost mainly raises prices.", setup() { set({ view: "adas", asView: "keynes", I: 60 }); kick("G", 20); } }
  ],
  batch: [
    { title: "Does the multiplier equal 1 ÷ MPW?", question: "In economies made of 200 households whose MPCs differ, what multiplier do we measure?", how: "MPS 0.1, MPT 0.15, MPM 0.15 on average (MPW 0.4); each household's MPC differs (SD 0.05); incomes log-normal. ΔY after 40 rounds ÷ £10bn of extra G, with the same economy without it.", yLabel: "multiplier", reps: 300, bins: 24, theory: 2.5, theoryLabel: "1 ÷ MPW", run: (x, r) => measureK(BASE(), r).k, note: "Close to 2.5 on average; each economy's value differs a little because its MPC is the income-weighted average of its households' MPCs." },
    { title: "Bigger leakages, smaller multiplier", question: "How does the multiplier change with the marginal propensity to import?", how: "As above, sweeping MPM.", xLabel: "MPM", yLabel: "multiplier", xs: [0.05, 0.1, 0.2, 0.3, 0.4, 0.5], reps: 5, yMin: 0, theory: m => 1 / (0.25 + m), theoryLabel: "1 ÷ (MPS + MPT + MPM)", run: (x, r) => measureK(Object.assign(BASE(), { m: x }), r).k, note: "Every leakage shrinks the multiplier: open economies with high imports get less extra income from the same injection." },
    { title: "Rounds of spending", question: "How quickly does the multiplier build up?", how: "MPC 0.8 (MPW 0.2) with identical households; cumulative ΔY ÷ ΔG after n rounds.", xLabel: "rounds", yLabel: "ΔY ÷ ΔG so far", xs: [1, 2, 3, 4, 5, 6, 8, 10, 15], reps: 1, yMin: 0, theory: n => (1 - 0.8 ** n) / 0.2, theoryLabel: "(1 − MPCⁿ) ÷ (1 − MPC)", run: (x, r) => measureK(Object.assign(BASE(), { s: 0.05, t: 0.1, m: 0.05, spread: 0 }), r, x).k, note: "A geometric series: 1, 1.8, 2.44, … approaching 5. Half the long-run effect arrives within about three rounds." },
    { title: "Who gets the money?", question: "If richer households save more of each extra pound, what happens to the multiplier?", how: "Tilt 0 to 1: richer households' MPC lower by up to 0.12 per SD of (log) income; 1 ÷ (1 − income-weighted MPC) shown as theory.", xLabel: "tilt (richer save more)", yLabel: "multiplier", xs: [0, 0.25, 0.5, 0.75, 1], reps: 5, theory: x => 1 / (1 - makeEcon(Object.assign(BASE(), { tilt: x }), K.rng(7)).c), theoryLabel: "1 ÷ (1 − weighted MPC)", run: (x, r) => measureK(Object.assign(BASE(), { tilt: x }), r).k, note: "The multiplier falls below 1 ÷ (average MPW): what matters is the MPC of those who receive the income." },
    { title: "The accelerator", question: "How much does income overshoot when investment responds to growth?", how: "Peak ΔY ÷ ΔG over 40 rounds, identical households, accelerator v from 0 to 1 (theory: the same model with no randomness).", xLabel: "accelerator v", yLabel: "peak ΔY ÷ ΔG", xs: [0, 0.2, 0.4, 0.6, 0.8, 1], reps: 3, yMin: 0, theory: v => measureK(Object.assign(BASE(), { v, spread: 0 }), K.rng(3)).peak, theoryLabel: "multiplier–accelerator", run: (x, r) => measureK(Object.assign(BASE(), { v: x }), r).peak, note: "With a strong accelerator, income overshoots its new level and oscillates: one explanation of booms and busts." },
    { title: "Does income settle where J = W?", question: "Starting from £400bn, where does national income settle when spending is a little random?", how: "Injections £400bn a quarter, MPW 0.4, spending noise 2% a round; income after 60 rounds.", yLabel: "national income (£bn a quarter)", reps: 300, bins: 24, theory: 1000, theoryLabel: "J ÷ MPW", run: (x, r) => { const e = makeEcon(Object.assign(BASE(), { I: 140, G: 160, X: 100, noise: 1, start: 400 }), r); for (let i = 0; i < 60; i++) stepEcon(e, r); return e.Y; }, note: "Income climbs from £400bn and settles around £1,000bn, where withdrawals (0.4 × Y) equal injections (£400bn)." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4EC1 2.2", text: "The circular flow: firms pay incomes to households; households spend on firms' goods and services. Withdrawals (leakages): saving, taxes, imports. Injections: investment, government spending, exports." },
      { lvl: "std", tag: "4EC1 2.2", text: "Aggregate demand AD = C + I + G + (X − M). A rise in any component raises AD, output and employment (if there is spare capacity)." },
      { lvl: "std", tag: "4EC1 2.2", text: "If injections are greater than withdrawals, national income rises; if smaller, it falls. It settles where injections = withdrawals." },
      { lvl: "adv", tag: "9EC0 2.4.4", text: "MPC + MPS + MPT + MPM = 1. Multiplier k = 1 ÷ (1 − MPC) = 1 ÷ MPW (with MPC on domestic goods). ΔY = k × ΔJ." },
      { lvl: "adv", tag: "9EC0 2.4.4", text: "The multiplier is smaller in practice: time lags, leakages that change, crowding out, confidence and spare capacity all matter." },
      { lvl: "adv", tag: "9EC0 2.3", text: "AD/AS: in the short run more AD raises output and prices (positive output gap). Classical view: wages adjust so output returns to potential. Keynesian view: spare capacity means AD can raise output with little inflation." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: "Explain the difference between an injection and a withdrawal in the circular flow, with an example of each.", ans: "<ul><li>injection: money entering the flow not from households' spending on domestic goods, e.g. government spending, exports, investment</li><li>withdrawal: income not passed on in the flow, e.g. saving, taxes, imports</li><li>injections raise national income; withdrawals reduce it</li></ul>" },
      { lvl: "adv", marks: 2, q: () => `On screen MPS = ${P.s}, MPT = ${P.t} and MPM = ${P.m}. Calculate the multiplier.`, ans: () => `<ul><li>MPW = ${P.s} + ${P.t} + ${P.m} = ${(P.s + P.t + P.m).toFixed(2)}</li><li>k = 1 ÷ ${(P.s + P.t + P.m).toFixed(2)} = ${(1 / (P.s + P.t + P.m)).toFixed(2)}</li></ul>` },
      { lvl: "adv", marks: 3, q: () => `The government spends an extra £${P.dJ}bn. With the multiplier on screen, by how much will national income rise in the long run? Give two reasons why it may rise by less.`, ans: () => `<ul><li>ΔY = k × ΔG = ${(1 / (P.s + P.t + P.m)).toFixed(2)} × ${P.dJ} = £${(P.dJ / (P.s + P.t + P.m)).toFixed(1)}bn</li><li>crowding out of private spending; time lags; no spare capacity (prices rise instead); confidence; higher imports</li></ul>` },
      { lvl: "adv", marks: 4, q: "Using an AD/AS diagram, explain the short-run and long-run effects of a large rise in government spending when the economy is at full employment (classical view).", ans: "<ul><li>AD shifts right; short run: output above potential and price level higher (positive output gap)</li><li>labour is scarce; wages rise; SRAS shifts left</li><li>long run: output back at LRAS, price level permanently higher</li><li>demand-pull inflation, no lasting gain in output</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li>Each round, firms' revenue (C + I + G + X) becomes next round's income Y. Households spend a share c of their income on UK goods (the MPC on domestic goods) and the rest leaks out as saving, tax and imports in proportion to MPS, MPT and MPM, so c = 1 − MPW.</li>
<li>Households (A level settings): 200 households with log-normal incomes; each household's MPC is the average plus its own difference, and with the tilt richer households have lower MPCs. The economy's MPC is the income-weighted average.</li>
<li>Accelerator: I = I₀ + v × (income this round − income last round), never below zero. Optional random wobble in consumer spending.</li>
<li>Default flows: national income about £714bn a quarter (close to UK GDP in 2024, about £2.85 trillion a year); the propensities are illustrative and give a multiplier of 2.5.</li>
<li>AD/AS: AD = Y_AD(1 − 0.45(P/100 − 1)), where Y_AD is the circular-flow income; classical SRAS P = Pₑ + costs + 60(Y/Y_f − 1), with expected prices Pₑ catching up with actual prices each round (wages adjust); Keynesian AS flat with spare capacity, rising steeply to vertical at full capacity Y_f.</li></ul>
<h3>Left out</h3>
<ul><li>Interest rates, money and crowding out; taxes and imports that depend on things other than income; confidence and expectations; inventories; the government budget; real UK propensities (these are illustrative).</li></ul>
<p>The earlier version of this simulation, with its worksheets, is kept in <a href="original/circular-flow.html">original/circular-flow.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("View");
ctl.view = K.seg(g, { value: "flow", options: [["flow", "🔄 Circular flow"], ["mult", "📶 Multiplier"], ["adas", "📈 AD/AS (A level)"]], on: v => { P.view = v; } });
ctl.sectors = K.seg(g, { label: "Sectors", value: 5, options: [[2, "2"], [3, "3 + banks"], [4, "4 + government"], [5, "5 + overseas"]], on: v => set({ sectors: +v, view: P.view }) });
g = ui.group("Withdrawals (marginal propensities)");
ctl.s = K.slider(g, { label: "MPS (saving)", min: 0, max: 0.4, step: 0.01, value: 0.1, on: v => { P.s = v; rebuild(); } });
ctl.t = K.slider(g, { label: "MPT (tax)", min: 0, max: 0.4, step: 0.01, value: 0.15, on: v => { P.t = v; rebuild(); } });
ctl.m = K.slider(g, { label: "MPM (imports)", min: 0, max: 0.5, step: 0.01, value: 0.15, on: v => { P.m = v; rebuild(); } });
g = ui.group("Injections (£bn a quarter)");
ctl.I = K.slider(g, { label: "Investment I", min: 0, max: 250, step: 1, value: 100, unit: "£bn", on: v => { P.I = v; rebuild(); } });
ctl.G = K.slider(g, { label: "Government spending G", min: 0, max: 250, step: 1, value: 110, unit: "£bn", on: v => { P.G = v; rebuild(); } });
ctl.X = K.slider(g, { label: "Exports X", min: 0, max: 250, step: 0.1, value: 75.6, unit: "£bn", on: v => { P.X = v; rebuild(); } });
ctl.dJ = K.slider(g, { label: "Size of a new injection", min: 1, max: 50, step: 1, value: 10, unit: "£bn", on: v => P.dJ = v });
let rr = K.row(g); K.btn(rr, "+ G", () => kick("G"), "primary"); K.btn(rr, "+ I", () => kick("I")); K.btn(rr, "+ X", () => kick("X")); K.btn(rr, "↺ undo", () => { econ.extra = { G: 0, I: 0, X: 0 }; kRun = null; });
g = ui.group("Households and firms (A level)");
ctl.spread = K.slider(g, { label: "How much MPCs differ", min: 0, max: 0.15, step: 0.005, value: 0.05, on: v => { P.spread = v; rebuild(); } });
ctl.tilt = K.slider(g, { label: "Richer households save more", min: 0, max: 1, step: 0.05, value: 0, on: v => { P.tilt = v; rebuild(); } });
ctl.v = K.slider(g, { label: "Accelerator v", min: 0, max: 1, step: 0.05, value: 0, on: v => { P.v = v; econ.o.v = v; } });
ctl.noise = K.slider(g, { label: "Random ups and downs in spending", min: 0, max: 3, step: 0.1, value: 0, on: v => { P.noise = v; econ.o.noise = v; } });
g = ui.group("AD/AS (A level)");
ctl.asView = K.seg(g, { label: "Aggregate supply", value: "classical", options: [["classical", "classical (wages adjust)"], ["keynes", "Keynesian (spare capacity)"]], on: v => { A.view = v; A.Pe = 100; } });
ctl.cost = K.slider(g, { label: "Costs (cost-push shock)", min: -20, max: 30, step: 1, value: 0, fmt: v => (v > 0 ? "+" : "") + v + " on the price level", on: v => A.cost = v });
ctl.Yf = K.slider(g, { label: "Productive potential", min: 600, max: 900, step: 5, value: 714, unit: "£bn", on: v => A.Yf = v });
g = ui.group("Run");
ctl.speed = K.slider(g, { label: "Speed", min: 0.25, max: 8, step: 0.25, value: 1, fmt: v => v + " rounds a second", on: v => speed = v });
const read = K.readout(ui.group("Readings"), [["Y", "national income Y"], ["eq", "equilibrium J ÷ MPW"], ["JW", "injections · withdrawals"], ["k", "multiplier 1 ÷ MPW"], ["ad", "AD = C + I + G + (X − M)"], ["gap", "output gap · price level"]]);
function set(o) {
  Object.assign(P, BASE(), { sectors: 5, view: "flow", dJ: 10 }, o);
  if (P.sectors < 5) { P.m = 0; P.X = 0; } if (P.sectors < 4) { P.t = 0; P.G = 0; } if (P.sectors < 3) { P.s = 0; P.I = 0; }
  if (o.sectors && o.sectors < 5 && o.start == null) { P.start = (P.I + P.G + P.X) / Math.max(0.01, P.s + P.t + P.m) || 600; if (P.sectors === 2) P.start = 600; }
  for (const k of ["s", "t", "m", "I", "G", "X", "dJ", "spread", "tilt", "v", "noise"]) ctl[k].set(P[k]); ctl.view.set(P.view); ctl.sectors.set(P.sectors);
  A = { Yf: 714, cost: 0, Pe: 100, view: o.asView || "classical", Yad: 714 }; ctl.asView.set(A.view); ctl.cost.set(0); ctl.Yf.set(714);
  rebuild(true);
}
function rebuild(fresh) { const keep = econ && !fresh ? { Y: econ.Y, extra: econ.extra } : null; econ = makeEcon(Object.assign({}, P, { start: keep ? keep.Y : P.start }), rnd); if (keep) econ.extra = keep.extra; delete P.start; kRun = null; dots = []; }
function kick(kind, size) { const d = size || P.dJ; econ.extra[kind] += d; kRun = { kind, d, from: econ.round, Ybase: econ.Y, c: econ.c, layers: [] }; }
const mpw = () => Math.max(1e-6, 1 - econ.c);

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
const COL = { Y: "#7ee787", C: "#5ad1ff", S: "#ffd166", I: "#ffd166", T: "#ff8a70", G: "#ff8a70", M: "#c9a0ff", X: "#c9a0ff" };
function boxes(w, h) { return { H: [w * 0.13, h * 0.5], F: [w * 0.87, h * 0.5], B: [w * 0.5, h * 0.2], Gv: [w * 0.5, h * 0.5], O: [w * 0.5, h * 0.8] }; }
// each flow: a path from one box to another, its colour and its size
function paths(w, h) {
  const b = boxes(w, h), up = h * 0.06, f = econ.flows || { Y: econ.Y, C: econ.c * econ.Y, S: 0, T: 0, M: 0, I: P.I, G: P.G, X: P.X };
  const L = [["Y", [b.F, [w * 0.7, h * 0.06], [w * 0.3, h * 0.06], b.H], "incomes (wages, rent, profit)"], ["C", [b.H, [w * 0.3, h * 0.92], [w * 0.7, h * 0.92], b.F], "consumer spending C"]];
  if (P.sectors >= 3) L.push(["S", [b.H, [w * 0.3, h * 0.26], b.B], "saving S"], ["I", [b.B, [w * 0.7, h * 0.26], b.F], "investment I"]);
  if (P.sectors >= 4) L.push(["T", [b.H, [w * 0.32, h * 0.5 - up], b.Gv], "tax T"], ["G", [b.Gv, [w * 0.68, h * 0.5 - up], b.F], "government spending G"]);
  if (P.sectors >= 5) L.push(["M", [b.H, [w * 0.3, h * 0.74], b.O], "imports M"], ["X", [b.O, [w * 0.7, h * 0.74], b.F], "exports X"]);
  return L.map(([k, pts, label]) => ({ k, pts, label, v: f[k] }));
}
function along(pts, u) { const seg = []; let tot = 0; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); tot += d; } let s = u * tot; for (let i = 0; i < seg.length; i++) { if (s <= seg[i]) { const k = s / seg[i]; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k]; } s -= seg[i]; } return pts[pts.length - 1]; }
function draw(dt) {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0a1020"; c.fillRect(0, 0, w, h);
  if (P.view === "flow") {
    const L = paths(w, h), b = boxes(w, h);
    for (const p of L) { c.strokeStyle = COL[p.k] + "55"; c.lineWidth = 2 + 10 * Math.sqrt(Math.max(0, p.v) / 800); c.beginPath(); p.pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); c.lineWidth = 1; const [mx, my] = along(p.pts, 0.5); TX(c, `${p.label}: £${Math.max(0, p.v).toFixed(0)}bn`, p.k === "Y" ? w * 0.3 : mx, p.k === "Y" ? my + 22 : my - 8, COL[p.k], "center", "600 11.5px"); }
    // money dots (one per £10bn), moving along each flow
    for (const p of L) { const n = Math.round(Math.max(0, p.v) / P.detail); for (let i = 0; i < n; i++) { const u = ((performance.now() / 1000 * 0.18 * speed ** 0.5 + i / n) % 1), [x, y] = along(p.pts, u); c.fillStyle = COL[p.k]; c.beginPath(); c.arc(x, y, 3, 0, 6.3); c.fill(); } }
    const bx = (pos, label, col, sub) => { c.fillStyle = "#16203a"; c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.roundRect(pos[0] - 70, pos[1] - 30, 140, 60, 12); c.fill(); c.stroke(); c.lineWidth = 1; TX(c, label, pos[0], pos[1] - 2, "#eef2f8", "center", "600 14px"); TX(c, sub, pos[0], pos[1] + 16, "#8fa0bf", "center", "11px"); };
    bx(b.H, "🏠 Households", "#5ad1ff", "earn Y, spend C"); bx(b.F, "🏭 Firms", "#7ee787", "sell goods, pay incomes");
    if (P.sectors >= 3) bx(b.B, "🏦 Banks", "#ffd166", "S → I"); if (P.sectors >= 4) bx(b.Gv, "🏛 Government", "#ff8a70", "T → G"); if (P.sectors >= 5) bx(b.O, "🌍 Overseas", "#c9a0ff", "M → X");
    const f = econ.flows; if (f) { const J = f.I + f.G + f.X, W = f.S + f.T + f.M; TX(c, `Round ${econ.round}: injections £${J.toFixed(0)}bn ${J > W + 0.5 ? ">" : J < W - 0.5 ? "<" : "="} withdrawals £${W.toFixed(0)}bn → income ${J > W + 0.5 ? "rising" : J < W - 0.5 ? "falling" : "steady"}`, w / 2, h - 10, "#eef2f8", "center", "600 12.5px"); }
  } else if (P.view === "mult") {
    // the multiplier as layers: the first round's spending, then what is re-spent from it, round after round
    const gx0 = 70, gx1 = w - 30, gy0 = 70, gy1 = h - 50, N = 15, kTh = Math.min(30, 1 / mpw()), d = kRun ? kRun.d : P.dJ, yMax = d * Math.max(kTh, kRun ? Math.max(1, ...econ.hist.slice(kRun.from).map(q => (q.Y - kRun.Ybase) / d)) : 0) * 1.1, X = i => gx0 + (i + 0.5) / N * (gx1 - gx0), Y = v => gy1 - v / yMax * (gy1 - gy0), bw = (gx1 - gx0) / N * 0.7;
    c.strokeStyle = "#1f2c47"; for (let k = 0; k <= 4; k++) { const v = yMax * k / 4; c.beginPath(); c.moveTo(gx0, Y(v)); c.lineTo(gx1, Y(v)); c.stroke(); TX(c, "£" + v.toFixed(0) + "bn", gx0 - 6, Y(v) + 4, "#8fa0bf", "right", "11px"); }
    const cc = econ.c; for (let i = 0; i < N; i++) { let base = 0; for (let j = 0; j <= i; j++) { const layer = d * cc ** j; c.fillStyle = `hsl(${200 - j * 12},70%,${60 - j * 2}%)`; c.fillRect(X(i) - bw / 2, Y(base + layer), bw, Y(base) - Y(base + layer)); base += layer; } TX(c, String(i + 1), X(i), gy1 + 14, "#8fa0bf", "center", "11px"); }
    c.strokeStyle = "#ffd166"; c.setLineDash([6, 4]); c.beginPath(); c.moveTo(gx0, Y(d * kTh)); c.lineTo(gx1, Y(d * kTh)); c.stroke(); c.setLineDash([]); TX(c, `long run: £${d}bn × ${kTh.toFixed(2)} = £${(d * kTh).toFixed(1)}bn`, gx1 - 4, Y(d * kTh) - 6, "#ffd166", "right", "600 12px");
    if (kRun) { const pts = econ.hist.slice(kRun.from + 1).map((q, i) => [X(i), Y(q.Y - kRun.Ybase)]).slice(0, N); c.strokeStyle = "#fff"; c.lineWidth = 2.5; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); c.lineWidth = 1; pts.forEach(([x, y]) => { c.fillStyle = "#fff"; c.beginPath(); c.arc(x, y, 3.5, 0, 6.3); c.fill(); }); }
    TX(c, "Rise in national income after each round", 14, 22, "#eef2f8", "left", "600 13px"); TX(c, `colours: the first £${d}bn, then each round of re-spending (× MPC ${cc.toFixed(2)} each time) · white: measured`, 14, 42, "#aab6cc", "left", "11.5px");
    TX(c, "round", (gx0 + gx1) / 2, gy1 + 32, "#8fa0bf", "center", "11px"); if (!kRun) TX(c, "Press + G, + I or + X to inject new spending", w / 2, h / 2, "#eef2f8", "center", "600 15px");
  } else {
    // AD/AS
    A.Yad = econ.Y; const eq = adasEq(A), gx0 = 70, gx1 = w - 30, gy0 = 30, gy1 = h - 50, YM = A.Yf * 1.4, PM = 180, X = y => gx0 + y / YM * (gx1 - gx0), Yp = p => gy1 - (p - 40) / (PM - 40) * (gy1 - gy0);
    c.strokeStyle = "#1f2c47"; for (let p = 40; p <= PM; p += 20) { c.beginPath(); c.moveTo(gx0, Yp(p)); c.lineTo(gx1, Yp(p)); c.stroke(); TX(c, String(p), gx0 - 6, Yp(p) + 4, "#8fa0bf", "right", "11px"); }
    for (let y = 0; y <= YM; y += 200) TX(c, "£" + y, X(y), gy1 + 14, "#8fa0bf", "center", "11px"); TX(c, "real national output (£bn a quarter)", (gx0 + gx1) / 2, gy1 + 32, "#8fa0bf", "center", "11px");
    const curve = (f, col, lab) => { c.strokeStyle = col; c.lineWidth = 2.5; c.beginPath(); let first = true; for (let p = 41; p <= PM; p += 1) { const y = f(p); if (!isFinite(y)) continue; first ? c.moveTo(X(y), Yp(p)) : c.lineTo(X(y), Yp(p)); first = false; } c.stroke(); c.lineWidth = 1; };
    curve(p => adY(p, A), "#5ad1ff"); TX(c, "AD", X(adY(60, A)) + 6, Yp(60), "#5ad1ff", "left", "600 13px");
    if (A.view === "keynes") { curve(p => invKeynes(p, A), "#ffb454"); TX(c, "AS (Keynesian)", X(A.Yf) - 6, Yp(170), "#ffb454", "right", "600 13px"); }
    else { curve(p => A.Yf * (1 + (p - A.Pe - A.cost) / 60), "#ffb454"); TX(c, "SRAS", X(A.Yf * (1 + (165 - A.Pe - A.cost) / 60)) - 4, Yp(165), "#ffb454", "right", "600 13px"); c.strokeStyle = "#7ee787"; c.lineWidth = 2; c.beginPath(); c.moveTo(X(A.Yf), gy0); c.lineTo(X(A.Yf), gy1); c.stroke(); c.lineWidth = 1; TX(c, "LRAS", X(A.Yf) + 5, gy1 - 8, "#7ee787", "left", "600 13px"); }
    c.fillStyle = "#fff"; c.beginPath(); c.arc(X(eq.Y), Yp(eq.P), 5, 0, 6.3); c.fill(); c.strokeStyle = "rgba(255,255,255,.5)"; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(gx0, Yp(eq.P)); c.lineTo(X(eq.Y), Yp(eq.P)); c.lineTo(X(eq.Y), gy1); c.stroke(); c.setLineDash([]);
    const gap = (eq.Y / A.Yf - 1) * 100; TX(c, `output gap ${gap >= 0 ? "+" : ""}${gap.toFixed(1)}% (${gap > 0.5 ? "positive: inflationary pressure" : gap < -0.5 ? "negative: spare capacity, unemployment" : "about zero"})`, gx0 + 10, gy0 + 14, gap > 0.5 ? "#ff8a70" : gap < -0.5 ? "#5ad1ff" : "#7ee787", "left", "600 12.5px");
    if (ui.level !== "adv") TX(c, "AD/AS is part of the A level course: switch to Advanced for the full story", gx0 + 10, gy0 + 34, "#8fa0bf", "left", "11.5px");
  }
}

// ---------------- Charts and readings ----------------
function charts() {
  const H = econ.hist.slice(-60), f = econ.flows, J = P.I + P.G + P.X + econ.extra.G + econ.extra.I + econ.extra.X, eqY = mpw() < 1e-4 ? econ.Y : J / mpw();
  chA.opts.title = "National income"; chA.opts.xLabel = "round (quarter)"; chA.opts.yLabel = "£bn a quarter"; chA.opts.xFmt = null;
  chA.draw([{ pts: H.map(q => [q.round, q.Y]), color: "#7ee787", label: "Y" }], { yMin: 0, hlines: [{ y: eqY, label: "J ÷ MPW", color: "#ffd166" }] });
  chB.opts.title = "Aggregate demand"; chB.opts.xLabel = ""; chB.opts.yLabel = "£bn a quarter"; chB.opts.xFmt = whole(v => ["", "C", "I", "G", "X", "−M", "AD"][v] || "");
  if (f) chB.draw([{ pts: [[1, f.C + f.M]], type: "bars", w: 0.7, color: "#5ad1ff", label: "C" }, { pts: [[2, f.I]], type: "bars", w: 0.7, color: "#ffd166", label: "I" }, { pts: [[3, f.G]], type: "bars", w: 0.7, color: "#ff8a70", label: "G" }, { pts: [[4, f.X]], type: "bars", w: 0.7, color: "#c9a0ff", label: "X" }, { pts: [[5, -f.M]], type: "bars", w: 0.7, color: "#8a6fc9", label: "−M" }, { pts: [[6, f.C + f.I + f.G + f.X]], type: "bars", w: 0.7, color: "#7ee787", label: "AD" }], { xMin: 0.4, xMax: 6.6 });
  read.set("Y", `£${econ.Y.toFixed(1)}bn a quarter (£${(econ.Y * 4 / 1000).toFixed(2)} trillion a year)`); read.set("eq", `£${eqY.toFixed(1)}bn`);
  if (f) { read.set("JW", `£${(f.I + f.G + f.X).toFixed(1)}bn · £${(f.S + f.T + f.M).toFixed(1)}bn`); read.set("ad", `${f.C.toFixed(0)} + ${f.I.toFixed(0)} + ${f.G.toFixed(0)} + (${f.X.toFixed(0)} − ${f.M.toFixed(0)}) = £${(f.C + f.I + f.G + f.X).toFixed(0)}bn`); }
  read.set("k", `${mpw() < 1e-4 ? "∞ (no leakages)" : (1 / mpw()).toFixed(2)} (MPC on UK goods ${econ.c.toFixed(3)})${ui.level === "adv" ? "" : " · A level"}`);
  if (P.view === "adas") { const eq = adasEq(A); read.set("gap", `${((eq.Y / A.Yf - 1) * 100).toFixed(1)}% · ${eq.P.toFixed(1)}`); } else read.set("gap", "(AD/AS view)");
  ui.hud(P.view === "mult" ? "Each round, MPC × the last round's extra income is spent again" : P.view === "adas" ? "AD meets AS: output, prices and the output gap" : "Money flows round; income settles where injections = withdrawals");
}

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => {
  if (!(dt > 0)) return; acc += dt * speed;
  while (acc >= 1) { acc--; stepEcon(econ, rnd); if (P.view === "adas" && A.view === "classical") { A.Yad = econ.Y; const eq = adasEq(A); A.Pe += 0.25 * ((eq.P - A.cost) - A.Pe); } }   // classical: wages and expected prices catch up
}, dt => { draw(dt); if (frame++ % 5 === 0) charts(); });
set({});
ui.tip("Dots are money (one per £10bn) flowing round the economy. Try the multiplier view and press + G.", 7000);
