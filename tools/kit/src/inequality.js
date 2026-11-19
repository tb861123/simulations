/* =====================================================================
   INEQUALITY: INCOME, WEALTH AND REDISTRIBUTION
   INCOME is a flow (pay, pensions, benefits, returns each year); WEALTH
   is a stock (savings, property, shares). Wealth is far more unequal.
   The LORENZ CURVE plots the share of income held by the poorest x% of
   people; the GINI coefficient is the gap between it and the line of
   equality (0 = everyone equal, 1 = one person has everything):
        Gini = Σ|xᵢ − xⱼ| ÷ (2n² × mean)
   Inequality comes from differences in skills, luck, jobs, inheritance
   and returns on wealth. Taxes and benefits redistribute: the ONS
   measures income at stages: original → gross (+ benefits) →
   disposable (− income tax and NI) → post-tax (− VAT).
   Redistribution can cost efficiency: if people earn less when taxed,
   tax revenue peaks below 100% (the LAFFER CURVE).
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
// ---------------- statistics ----------------
function gini(a) { const x = a.map(v => Math.max(0, v)).sort((p, q) => p - q), n = x.length, s = x.reduce((p, q) => p + q, 0); if (!s) return 0; let c = 0; x.forEach((v, i) => c += (2 * (i + 1) - n - 1) * v); return c / (n * s); }   // the same as Σ|xᵢ − xⱼ| ÷ (2n² mean), but fast
function lorenz(a) { const x = a.map(v => Math.max(0, v)).sort((p, q) => p - q), s = x.reduce((p, q) => p + q, 0) || 1, pts = [[0, 0]]; let c = 0; x.forEach((v, i) => { c += v; if (i % Math.max(1, Math.floor(x.length / 100)) === 0 || i === x.length - 1) pts.push([(i + 1) / x.length, c / s]); }); return pts; }
const median = a => { const x = a.slice().sort((p, q) => p - q), n = x.length; return n % 2 ? x[(n - 1) / 2] : (x[n / 2 - 1] + x[n / 2]) / 2; };
const Phi = z => { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2), p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; };
// ---------------- UK taxes 2026/27 (simplified: check HMRC) ----------------
function incomeTax(y) { const pa = Math.max(0, 12570 - Math.max(0, (y - 100000) / 2)), t = Math.max(0, y - pa); return 0.2 * Math.min(t, 37700) + 0.4 * Math.max(0, Math.min(t, 125140) - 37700) + 0.45 * Math.max(0, t - 125140); }
const NI = e => 0.08 * Math.max(0, Math.min(e, 50270) - 12570) + 0.02 * Math.max(0, e - 50270);
// ---------------- the population ----------------
const MED = 39000;   // median full-time pay (ONS ASHE 2025, about £39,039)
function person(r, o, z = r.gauss(), w = 0, age = 20 + Math.floor(r() * 65)) { return { age, z, wealth: w || Math.max(0, o.w0 * Math.exp(1.2 * r.gauss()) * (0.3 + age / 50)), orig: 0, gross: 0, disp: 0, post: 0, job: "ft" }; }
function newPop(o, r) { const pop = []; for (let i = 0; i < o.n; i++) pop.push(person(r, o)); return { pop, year: 0, hist: [], r, o }; }
function yearStep(S) {
  const { pop, r, o } = S; let rev = 0, nWork = 0; const gr = Math.pow(1 + o.g, S.year);   // growth raises pay, pensions and benefits each year (tax thresholds stay frozen)
  for (const p of pop) {
    p.age++;
    if (p.age > 85) { // death: the estate passes (after inheritance tax) to a new adult whose skill partly follows the parent's
      const w = p.wealth, iht = o.iht * Math.max(0, w - 325000); rev += iht; const z = o.rho * p.z + Math.sqrt(1 - o.rho * o.rho) * r.gauss();
      Object.assign(p, person(r, o, z, 1, 20)); p.wealth = o.inherit ? Math.max(0, w - iht) : 0; }
    const retired = p.age >= 66; let earn = 0;
    if (!retired) { const u = r(); p.job = u < o.unemp ? "un" : u < o.unemp + o.pt ? "pt" : "ft"; if (p.job !== "un") { earn = gr * MED * Math.exp(o.sSkill * p.z + o.sLuck * r.gauss()) * (p.job === "pt" ? 0.5 : 1); const floor = o.nlw * 1950 * (p.job === "pt" ? 0.5 : 1); if (o.nlw && earn < floor) { if (r() < o.jobs * (floor - earn) / floor) { p.job = "un"; earn = 0; } else earn = floor; } } nWork++; }
    else { p.job = "ret"; earn = gr * 0.3 * MED * Math.exp(o.sSkill * p.z); }
    const ret = p.wealth * (o.ret + o.sRet * r.gauss());
    p.orig = earn + Math.max(0, ret);
    let ben = 0; if (retired) ben = gr * o.pension; else if (o.ben === "means") ben = Math.max(0, gr * o.benefit - 0.55 * earn); else if (o.ben === "ubi") ben = gr * o.benefit;
    p.gross = p.orig + ben; let tax;
    if (o.tax === "uk") tax = incomeTax(p.orig) + (retired ? 0 : NI(earn)); else if (o.tax === "flat") tax = o.flat * p.orig; else if (o.tax === "poll") tax = Math.min(p.gross, 3000); else tax = 0;
    rev += tax; p.disp = p.gross - tax; const spend = Math.min(p.disp, 25000) + (1 - o.save) * Math.max(0, p.disp - 25000) + (retired ? 0.04 : 0.03) * p.wealth; const vat = o.vat * 0.6 * spend / (1 + o.vat); rev += vat; p.post = p.disp - vat;
    p.wealth = Math.max(0, p.wealth + ret + p.disp - spend);
    p.ben = ben;
  }
  if (o.ben === "share") { const each = rev / pop.length; for (const p of pop) { p.gross += each; p.disp += each; p.post += each; } }
  S.year++;
  const g = { year: S.year, orig: gini(pop.map(p => p.orig)), disp: gini(pop.map(p => p.disp)), wealth: gini(pop.map(p => p.wealth)), post: gini(pop.map(p => p.post)), gross: gini(pop.map(p => p.gross)) };
  const md = median(pop.map(p => p.disp)); if (!S.md0) S.md0 = md; g.rel = pop.filter(p => p.disp < 0.6 * md).length / pop.length; g.abs = pop.filter(p => p.disp < 0.6 * S.md0).length / pop.length; g.md = md; S.hist.push(g); if (S.hist.length > 200) S.hist.shift(); return g;
}
// ---------------- luck: the trading game ----------------
// pairs pool their money and split it at random (keeping a share 'save' back); an optional wealth tax is shared out equally
function tradeRound(m, r, save, wtax) { const n = m.length; for (let k = 0; k < n; k++) { const i = r.int(n), j = r.int(n); if (i === j) continue; const pot = (1 - save) * (m[i] + m[j]), e = r(); m[i] = save * m[i] + e * pot; m[j] = save * m[j] + (1 - e) * pot; } if (wtax) { let t = 0; for (let i = 0; i < n; i++) { const x = wtax * m[i]; m[i] -= x; t += x; } for (let i = 0; i < n; i++) m[i] += t / n; } }
// ---------------- Kuznets: farms and cities ----------------
const KZ = { mu1: Math.log(12000), s1: 0.25, mu2: Math.log(30000), s2: 0.7 };
// exact Gini of a mixture of two log-normal groups (E|X − Y| has a closed form for log-normals)
function eAbs(m1, s1, m2, s2) { const s = Math.sqrt(s1 * s1 + s2 * s2), d = m1 - m2, e1 = Math.exp(m1 + s1 * s1 / 2), e2 = Math.exp(m2 + s2 * s2 / 2); const pos = e1 * Phi((d + s1 * s1) / s) - e2 * Phi((d - s2 * s2) / s), neg = e2 * Phi((-d + s2 * s2) / s) - e1 * Phi((-d - s1 * s1) / s); return pos + neg; }
function kuznetsGini(u) { const p = [1 - u, u], G = [[KZ.mu1, KZ.s1], [KZ.mu2, KZ.s2]], m = G.map(([a, b]) => Math.exp(a + b * b / 2)); let num = 0; for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) num += p[i] * p[j] * eAbs(G[i][0], G[i][1], G[j][0], G[j][1]); return num / (2 * (p[0] * m[0] + p[1] * m[1])); }
// ---------------- equity and efficiency ----------------
const lafferRev = (t, e, mean = MED) => t * mean * Math.pow(1 - t, e);

// ---------------- The page ----------------
const DEF = { view: "pop", n: 400, sSkill: 0.45, sLuck: 0.2, unemp: 0.05, pt: 0.15, rho: 0.4, w0: 60000, ret: 0.04, sRet: 0.1, save: 0.2, inherit: true, iht: 0.4, tax: "uk", flat: 0.25, vat: 0.2, ben: "means", benefit: 5100, pension: 12548, nlw: 12.71, jobs: 0.1, g: 0.015, tsave: 0, wtax: 0, urban: 0.1, migrate: true, t: 0.3, e: 0.5, speed: 1 };
const P = Object.assign({}, DEF);
let rnd = K.rng(Date.now() % 9973 + 29), run = true, S = null, money = [], tradeT = 0, kz = null, acc = 0, lastG = null;
const opts = () => P;
const ui = K.app({
  title: "Inequality and Redistribution", subject: "Economics",
  blurb: "A population that earns, saves, inherits and pays tax: Lorenz curves and Gini, poverty, luck, the Kuznets curve, and the equity–efficiency trade-off",
  reset: () => set({}),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "Edexcel International GCSE Economics (4EC1): distribution of income and wealth, causes of inequality, relative and absolute poverty, progressive, regressive and proportional taxes, benefits and redistribution, the national minimum wage.", adv: "Edexcel A level Economics A (9EC0) 4.2.2 (inequality: Lorenz curve and Gini coefficient, causes, the significance of capitalism), 4.5.2 (taxation: the Laffer curve, equity and efficiency), poverty measures. The Kuznets curve is beyond the spec." } },
  missions: [
    { title: "Income or wealth?", q: "Run the population for 30 years. Which is more unequal, income or wealth? Compare the Lorenz curves.", hint: "Wealth: its Lorenz curve bows much further from the line of equality (Gini about 0.6 against about 0.3 for disposable income in the UK). Wealth builds up over a lifetime, earns returns and is inherited.", setup() { set({}); } },
    { title: "Taxes and benefits", q: "Switch off all taxes and benefits, then turn the UK system back on. How much does the Gini fall from original to disposable income?", hint: "The UK's progressive income tax and benefits cut the Gini a lot (ONS: about 0.5 for original income to about 0.33 disposable). VAT is regressive: post-tax income is a little more unequal than disposable.", setup() { set({ tax: "none", ben: "none" }); } },
    { title: "Poverty", q: "Raise unemployment to 15%. What happens to relative and absolute poverty? Then make the economy grow faster.", hint: "Relative poverty (below 60% of this year's median) rises with unemployment. Growth lifts everyone, so absolute poverty (a fixed line) falls even if relative poverty does not.", setup() { set({ unemp: 0.15 }); } },
    { title: "Luck alone", q: "Play the trading game: everyone starts with £100 and trades at random. Does the money stay equal?", hint: "No: it spreads into an exponential distribution with a Gini of about 0.5, even though nobody is more skilled. Keeping some money back (saving) or a wealth tax narrows the spread.", setup() { set({ view: "luck" }); } },
    { title: "The minimum wage", q: "Raise the National Living Wage to £16 an hour with 'jobs lost' at 30%. What happens to the Gini and to unemployment?", hint: "Low earners who keep their jobs get more, which narrows inequality, but some lose their jobs, which widens it. The overall effect depends on how many jobs are lost: a real policy trade-off.", setup() { set({ nlw: 16, jobs: 0.3 }); } },
    { title: "Inheritance", q: "Switch inheritance tax off, then make children's skills follow their parents' more closely (0.8). What happens to wealth inequality over 100 years?", hint: "Wealth concentrates in families: estates pass on untaxed and well-paid parents tend to have well-paid children. Inheritance tax and low skill persistence (social mobility) slow this down.", setup() { set({ iht: 0, rho: 0.8 }); } },
    { lvl: "adv", title: "Kuznets curve", q: "Watch people move from farms to cities. What shape does the Gini trace as the city share rises?", hint: "An inverted U: inequality rises as some people move to higher, more varied city pay, then falls once most have moved. The idea is Kuznets' (1955); real data are mixed. Beyond the spec.", setup() { set({ view: "kuznets", urban: 0.02 }); } },
    { lvl: "adv", title: "Laffer curve", q: "With an elasticity of taxable income of 0.5, which flat tax rate raises the most revenue? What happens to GDP and the Gini?", hint: "t* = 1 ÷ (1 + e) = 67%. Above it, higher rates raise less. Higher rates cut the Gini but also earnings: the equity–efficiency trade-off. HMRC (2012) estimated e ≈ 0.48 for top earners.", setup() { set({ view: "laffer", t: 0.3, e: 0.5 }); } }
  ],
  batch: [
    { title: "Does luck alone create inequality?", question: "After a long trading game, how unequal is the money?", how: "200 people, £100 each; each round every person trades with a random partner (pool and split at random); 400 rounds; Gini at the end.", yLabel: "Gini", reps: 100, bins: 20, theory: 0.5 * (1 - 1 / 200), theoryLabel: "exponential: ½(1 − 1/n)", run: (x, r) => { const m = new Array(200).fill(100); for (let k = 0; k < 400; k++) tradeRound(m, r, 0, 0); return gini(m); }, note: "About 0.5 every time: random exchange alone gives an exponential distribution. Inequality does not prove that some people are more skilled." },
    { title: "Saving in the trading game", question: "How does keeping some money back from each trade change the final Gini?", how: "As above, each person keeps a share λ of their money out of each trade.", xLabel: "share kept back λ", yLabel: "Gini", xs: [0, 0.2, 0.4, 0.6, 0.8], reps: 20, yMin: 0, theory: l => gammaGini(1 + 3 * l / (1 - l)), theoryLabel: "gamma distribution", run: (l, r) => { const m = new Array(200).fill(100); for (let k = 0; k < 400; k++) tradeRound(m, r, l, 0); return gini(m); }, note: "Saving narrows the spread: the money follows a gamma distribution whose Gini falls as λ rises (theory: Chakraborti and Chakrabarti, 2000)." },
    { title: "How much does redistribution lower the Gini?", question: "A flat income tax at rate t with all revenue shared out equally: what happens to the Gini?", how: "400 log-normal earners (σ = 0.6); disposable = (1 − t) × income + share.", xLabel: "tax rate t", yLabel: "Gini of disposable income", xs: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7], reps: 10, yMin: 0, theory: t => (1 - t) * (2 * Phi(0.6 / Math.SQRT2) - 1), theoryLabel: "(1 − t) × G(original)", run: (t, r) => { const y = Array.from({ length: 400 }, () => Math.exp(0.6 * r.gauss())), m = K.mean(y); return gini(y.map(v => (1 - t) * v + t * m)); }, note: "Exactly (1 − t) × the original Gini: a flat tax with equal sharing is strongly redistributive, because the shared revenue is worth more to the poor." },
    { title: "How many are in relative poverty?", question: "What share of people fall below 60% of the median, for more or less spread-out incomes?", how: "400 log-normal incomes with spread σ.", xLabel: "spread σ (log-normal)", yLabel: "share in relative poverty", xs: [0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1], reps: 10, yMin: 0, theory: s => Phi(Math.log(0.6) / s), theoryLabel: "Φ(ln 0.6 ÷ σ)", run: (s, r) => { const y = Array.from({ length: 400 }, () => Math.exp(s * r.gauss())), md = median(y); return y.filter(v => v < 0.6 * md).length / 400; }, note: "Relative poverty depends on the spread of incomes, not on how rich the country is: double everyone's income and it does not change." },
    { title: "The Kuznets curve (A level, beyond the spec)", question: "How does the Gini change as people move from farms to cities?", how: "Farm incomes log-normal around £12,000 (σ 0.25), city around £30,000 (σ 0.7); 800 people sampled at each urban share.", xLabel: "share living in cities", yLabel: "Gini", xs: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1], reps: 10, yMin: 0, theory: u => kuznetsGini(u), theoryLabel: "exact mixture Gini", run: (u, r) => gini(Array.from({ length: 800 }, () => r() < u ? Math.exp(KZ.mu2 + KZ.s2 * r.gauss()) : Math.exp(KZ.mu1 + KZ.s1 * r.gauss()))), note: "An inverted U, peaking when roughly half have moved, then settling at the city's own (higher) inequality." },
    { title: "Where does the Laffer curve peak? (A level)", question: "How does revenue per person depend on a flat tax rate when people earn less as they are taxed more?", how: "Elasticity of taxable income e = 0.5; 400 log-normal earners; each earns w(1 − t)^e.", xLabel: "tax rate t", yLabel: "revenue per person (£)", xs: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.67, 0.7, 0.8, 0.9, 1], reps: 5, yMin: 0, theory: t => lafferRev(t, 0.5, MED * Math.exp(0.6 * 0.6 / 2)), theoryLabel: "t × mean × (1 − t)^e", run: (t, r) => K.mean(Array.from({ length: 400 }, () => t * MED * Math.exp(0.6 * r.gauss()) * Math.pow(1 - t, 0.5))), note: "Revenue peaks at t* = 1 ÷ (1 + e) = 67%. With a bigger elasticity the peak is lower: the reason some argue for lower top rates." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4EC1", text: "Income is a flow; wealth is a stock. Causes of inequality: differences in skills and education, jobs and unemployment, inheritance, returns on wealth, discrimination, luck." },
      { lvl: "std", tag: "4EC1", text: "Absolute poverty: too little to meet basic needs (a fixed line). Relative poverty: below 60% of median income (moves with the median)." },
      { lvl: "std", tag: "4EC1", text: "Progressive tax: takes a larger share of higher incomes (UK income tax). Regressive: a larger share of lower incomes (VAT as a share of income). Proportional: the same share (a flat tax)." },
      { lvl: "adv", tag: "9EC0 4.2.2", text: "The Lorenz curve shows cumulative share of income against cumulative share of population; Gini = area between it and the line of equality ÷ the whole triangle (0 to 1). UK disposable income Gini about 0.33 (ONS, FYE 2024)." },
      { lvl: "adv", tag: "9EC0 4.5.2", text: "Laffer curve: beyond some rate, higher taxes reduce revenue because people work, declare or earn less. Equity–efficiency trade-off: redistribution can reduce incentives." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: "Explain why VAT is described as regressive.", ans: "<ul><li>poorer people spend a larger share of their income</li><li>so VAT takes a larger share of a low income than of a high one</li></ul>" },
      { lvl: "std", marks: 2, q: () => `Median disposable income in the model is £${(lastG ? lastG.md : 30000).toFixed(0)}. What is the relative poverty line?`, ans: () => `<ul><li>60% of the median</li><li>£${(0.6 * (lastG ? lastG.md : 30000)).toFixed(0)} a year</li></ul>` },
      { lvl: "adv", marks: 3, q: "Calculate the income tax paid on £60,000 in 2026/27 (personal allowance £12,570, 20% on the next £37,700, 40% above).", ans: "<ul><li>taxable £47,430</li><li>20% × £37,700 = £7,540; 40% × £9,730 = £3,892</li><li>total £11,432</li></ul>" },
      { lvl: "adv", marks: 2, q: "If the elasticity of taxable income is 0.5, at what flat rate is revenue greatest?", ans: "<ul><li>t* = 1 ÷ (1 + e)</li><li>= 1 ÷ 1.5 ≈ 67%</li></ul>" }
    ]
  },
  notes: `<h3>The model (population)</h3>
<ul><li>Pay = £39,000 × e^(σ_skill z + σ_luck ε): log-normal earnings. Skills last a lifetime; a child's skill = ρ × parent's + √(1 − ρ²) × new luck. Unemployment and part-time (half pay) are random each year. Over-66s get a workplace pension (30% of a typical wage for their skill) plus the state pension.</li>
<li>Minimum wage: anyone paid below NLW × 1,950 hours is raised to it, but loses their job with chance (jobs lost) × gap ÷ minimum.</li>
<li>Wealth earns r ± σ_r a year. People spend all income up to £25,000, save a share of the rest, and spend 3% (4% if retired) of their wealth. At 85 a person dies and a new 20-year-old inherits the estate after inheritance tax (40% above £325,000).</li>
<li>UK 2026/27 (simplified; check HMRC): personal allowance £12,570 tapered above £100,000; 20%, 40%, 45%; employee NI 8% then 2%; VAT 20% on 60% of spending; Universal Credit about £5,100 a year, tapered at 55%; state pension £12,548.</li>
<li>Gini = Σ|xᵢ − xⱼ| ÷ (2n² mean). Relative poverty: below 60% of this year's median; absolute: below 60% of year 1's median.</li></ul>
<h3>Left out</h3>
<ul><li>Households (no equivalisation), housing costs and house prices, benefits in kind, tax avoidance, migration. Parameters are illustrative.</li></ul>
<h3>Data</h3>
<ul><li>ONS Household income inequality FYE 2024 (Gini 32.9%); ONS wealth in Great Britain 2018–2020 (Gini about 0.6); HMRC rates 2026/27; GOV.UK NLW £12.71 (April 2026); DWP HBAI FYE 2024; HMRC (2012) elasticity 0.48.</li></ul>
<p>The earlier version of this simulation and its worksheets are kept in <a href="original/inequality.html">original/inequality.html</a>.</p>`
});
// log-gamma (for the gamma-distribution Gini of the trading game with saving)
function lgam(x) { const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]; let y = x, t = x + 5.5; t -= (x + 0.5) * Math.log(t); let s = 1.000000000190015; for (const q of c) s += q / ++y; return -t + Math.log(2.5066282746310005 * s / x); }
// Gini of a gamma distribution with shape n: Γ(n + ½) ÷ (√π Γ(n + 1))
const gammaGini = n => Math.exp(lgam(n + 0.5) - lgam(n + 1)) / Math.sqrt(Math.PI);

// ---------------- Controls ----------------
const ctl = {}, grp = {};
let g = ui.group("View");
ctl.view = K.seg(g, { value: "pop", options: [["pop", "👥 earn, save, inherit"], ["luck", "🎲 luck: the trading game"], ["kuznets", "🏙 Kuznets curve (A level)"], ["laffer", "⚖ equity and efficiency (A level)"]], on: v => { P.view = v; showGroups(); } });
ctl.speed = K.slider(g, { label: "Speed", min: 0.25, max: 8, step: 0.25, value: 1, fmt: v => v + "×", on: v => P.speed = v });
grp.pop = g = ui.group("Earnings and wealth");
const S1 = (k, label, min, max, step, fmt) => ctl[k] = K.slider(g, { label, min, max, step, value: P[k], fmt, on: v => P[k] = v });
const pc = v => (v * 100).toFixed(0) + "%", gbp = v => "£" + Math.round(v).toLocaleString("en-GB");
S1("sSkill", "Spread of skills (σ)", 0, 1, 0.05, v => v.toFixed(2)); S1("sLuck", "Luck in pay each year (σ)", 0, 0.6, 0.05, v => v.toFixed(2)); S1("unemp", "Unemployment", 0, 0.3, 0.01, pc); S1("pt", "Part-time work", 0, 0.4, 0.01, pc);
S1("rho", "Children's skills follow parents'", 0, 0.95, 0.05, v => v.toFixed(2)); S1("ret", "Average return on wealth (r)", 0, 0.1, 0.005, pc); S1("save", "Saving out of income above £25,000", 0, 0.6, 0.05, pc); S1("g", "Economic growth (g)", 0, 0.05, 0.005, pc);
grp.tax = g = ui.group("Taxes and benefits");
ctl.tax = K.seg(g, { value: "uk", options: [["uk", "UK income tax + NI"], ["flat", "flat tax"], ["poll", "poll tax"], ["none", "none"]], on: v => P.tax = v });
S1("flat", "Flat tax rate", 0, 0.6, 0.01, pc); S1("vat", "VAT", 0, 0.3, 0.01, pc);
ctl.ben = K.seg(g, { value: "means", options: [["means", "means-tested (UC)"], ["ubi", "basic income"], ["share", "share all revenue"], ["none", "no benefits"]], on: v => P.ben = v });
S1("benefit", "Benefit (a year)", 0, 15000, 100, gbp); S1("pension", "State pension (a year)", 0, 20000, 100, gbp); S1("iht", "Inheritance tax above £325,000", 0, 0.8, 0.05, pc); S1("nlw", "National Living Wage (£ an hour; 0 = none)", 0, 20, 0.01, v => v ? "£" + v.toFixed(2) : "none"); S1("jobs", "Jobs lost to the minimum wage", 0, 0.5, 0.01, pc);
grp.luck = g = ui.group("Trading game");
ctl.tsave = K.slider(g, { label: "Share kept back from each trade", min: 0, max: 0.9, step: 0.05, value: 0, fmt: pc, on: v => P.tsave = v });
ctl.wtax = K.slider(g, { label: "Wealth tax each round (shared out)", min: 0, max: 0.05, step: 0.002, value: 0, fmt: v => (v * 100).toFixed(1) + "%", on: v => P.wtax = v });
let rr = K.row(g); K.btn(rr, "Everyone back to £100", () => { money = new Array(200).fill(100); tradeT = 0; });
grp.kuznets = g = ui.group("Farms and cities");
ctl.urban = K.slider(g, { label: "Share living in cities", min: 0, max: 1, step: 0.01, value: 0.1, fmt: pc, on: v => P.urban = v });
ctl.migrate = K.toggle(g, { label: "People keep moving to the cities", value: true, on: v => P.migrate = v });
grp.laffer = g = ui.group("Equity and efficiency");
ctl.t = K.slider(g, { label: "Flat tax rate (revenue shared equally)", min: 0, max: 1, step: 0.01, value: 0.3, fmt: pc, on: v => P.t = v });
ctl.e = K.slider(g, { label: "Elasticity of taxable income e", min: 0, max: 2, step: 0.05, value: 0.5, on: v => P.e = v });
const read = K.readout(ui.group("Readings"), [["a", ""], ["b", ""], ["c", ""], ["d", ""], ["e", ""], ["f", ""]]);
const relabel = names => names.forEach((n, i) => read.el.children[i].firstElementChild.textContent = n);
function showGroups() { for (const k in grp) grp[k].style.display = (k === P.view || (k === "tax" && P.view === "pop")) ? "" : "none"; }
function set(o) { Object.assign(P, DEF, o); for (const k in ctl) if (ctl[k].set && k in P && k !== "view") ctl[k].set(P[k]); ctl.view.set(P.view); S = newPop(P, rnd); for (let i = 0; i < 25; i++) lastG = yearStepWrap(); S.hist = S.hist.slice(-1); money = new Array(200).fill(100); tradeT = 0; kz = []; showGroups(); }
function yearStepWrap() { return yearStep(S); }

// ---------------- Simulation ----------------
function tick(dt) {
  acc += dt * P.speed;
  if (P.view === "pop") { while (acc > 0.7) { acc -= 0.7; lastG = yearStepWrap(); } }
  else if (P.view === "luck") { while (acc > 0.05) { acc -= 0.05; tradeRound(money, rnd, P.tsave, P.wtax); tradeT++; } }
  else if (P.view === "kuznets") { while (acc > 0.2) { acc -= 0.2; if (P.migrate && P.urban < 1) { P.urban = Math.min(1, P.urban + 0.005); ctl.urban.set(+P.urban.toFixed(3)); } kz.push([P.urban, gini(kSample(600))]); if (kz.length > 400) kz.shift(); } }
  else acc = 0;
}
const kSample = n => Array.from({ length: n }, (_, i) => (i / n) < P.urban ? Math.exp(KZ.mu2 + KZ.s2 * rnd.gauss()) : Math.exp(KZ.mu1 + KZ.s1 * rnd.gauss()));

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
const JOBC = { ft: "#5ad1ff", pt: "#7ee787", un: "#ff6b81", ret: "#c9a0ff" };
// Pen's parade: everyone lined up from poorest to richest, the height of each bar their income
function parade(c, x0, y0, w, h, items, val, colr, title, cap) {
  const s = items.slice().sort((a, b) => val(a) - val(b)), top = Math.max(1, cap || val(s[Math.floor(s.length * 0.98)]) * 1.05), bw = w / s.length;
  TX(c, title, x0, y0 - 8, "#eef2f8", "left", "600 13px");
  s.forEach((p, i) => { const v = val(p), hh = Math.min(h, h * v / top); c.fillStyle = colr(p); c.fillRect(x0 + i * bw, y0 + h - hh, Math.max(1, bw - 0.3), hh); if (v > top) { c.fillStyle = "#fff"; c.fillRect(x0 + i * bw, y0, Math.max(1, bw - 0.3), 2); } });
  c.strokeStyle = "#2a3550"; c.beginPath(); c.moveTo(x0, y0 + h); c.lineTo(x0 + w, y0 + h); c.stroke();
  return top;
}
function drawPop(c, w, h) {
  const pop = S.pop, md = median(pop.map(p => p.disp));
  const top = parade(c, 30, 40, w - 60, h * 0.42, pop, p => p.disp, p => JOBC[p.job], `Pen's parade: everyone's disposable income, poorest to richest (year ${S.year})`);
  const yl = 40 + h * 0.42 - h * 0.42 * 0.6 * md / top; c.strokeStyle = "#ffd166"; c.setLineDash([5, 4]); c.beginPath(); c.moveTo(30, yl); c.lineTo(w - 30, yl); c.stroke(); c.setLineDash([]); TX(c, `poverty line £${(0.6 * md).toFixed(0)}`, 36, yl - 4, "#ffd166", "left", "11px");
  const ym = 40 + h * 0.42 - h * 0.42 * md / top; c.strokeStyle = "#fff"; c.setLineDash([2, 3]); c.beginPath(); c.moveTo(30, ym); c.lineTo(w - 30, ym); c.stroke(); c.setLineDash([]); TX(c, `median £${md.toFixed(0)}`, w - 34, ym - 4, "#fff", "right", "11px");
  [["full-time", "ft"], ["part-time", "pt"], ["unemployed", "un"], ["retired", "ret"]].forEach(([t, k], i) => { c.fillStyle = JOBC[k]; c.fillRect(30 + i * 120, h * 0.5 + 12, 10, 10); TX(c, t, 44 + i * 120, h * 0.5 + 21, "#cfd8ea", "left", "11.5px"); });
  parade(c, 30, h * 0.6 + 20, w - 60, h * 0.3, pop, p => p.wealth, () => "#c9a0ff", "Wealth parade (tallest bars cut off at the top)");
}
function drawLuck(c, w, h) {
  const s = money.slice().sort((a, b) => a - b), mx = Math.max(400, s[s.length - 1]), bw = (w - 60) / s.length, H = h * 0.55;
  TX(c, `The trading game: 200 people, round ${tradeT}. Everyone started with £100.`, 30, 30, "#eef2f8", "left", "600 13px");
  s.forEach((v, i) => { c.fillStyle = v > 100 ? "#7ee787" : "#ff8a70"; const hh = H * v / mx; c.fillRect(30 + i * bw, 50 + H - hh, Math.max(1, bw - 0.4), hh); });
  const y100 = 50 + H - H * 100 / mx; c.strokeStyle = "#fff"; c.setLineDash([4, 3]); c.beginPath(); c.moveTo(30, y100); c.lineTo(w - 30, y100); c.stroke(); c.setLineDash([]); TX(c, "£100 (where everyone started)", w - 34, y100 - 5, "#fff", "right", "11px");
  const top10 = s.slice(-20).reduce((a, b) => a + b, 0) / s.reduce((a, b) => a + b, 0);
  TX(c, `Gini ${gini(money).toFixed(3)} · the richest 10% hold ${(top10 * 100).toFixed(0)}% · ${s.filter(v => v < 50).length} people have under £50`, 30, 50 + H + 30, "#ffd166", "left", "600 13px");
  TX(c, "Nobody is more skilled: each trade splits the two players' money at random.", 30, 50 + H + 54, "#cfd8ea", "left", "12px");
}
function drawKuz(c, w, h) {
  const n = 300, cols = 30, cs = Math.min((w - 60) / cols, (h - 140) / 10);
  TX(c, `${(P.urban * 100).toFixed(0)}% of people live in cities`, 30, 30, "#eef2f8", "left", "600 13px");
  for (let i = 0; i < n; i++) { const city = i / n < P.urban; c.fillStyle = city ? "#ffd166" : "#7ee787"; c.beginPath(); c.arc(30 + (i % cols) * cs + cs / 2, 50 + Math.floor(i / cols) * cs + cs / 2, cs * 0.38, 0, 6.3); c.fill(); }
  TX(c, "green: farms (low, similar incomes) · gold: cities (higher, more spread out)", 30, 50 + 10 * cs + 22, "#cfd8ea", "left", "12px");
  TX(c, `Gini now ${kuznetsGini(P.urban).toFixed(3)} (exact for these two groups)`, 30, 50 + 10 * cs + 46, "#ffd166", "left", "600 13px");
}
function drawLaffer(c, w, h) {
  const t = P.t, e = P.e, x0 = 60, x1 = w - 40, y0 = 50, y1 = h - 50, X = v => x0 + (x1 - x0) * v, mx = lafferRev(1 / (1 + e), e), Y = v => y1 - (y1 - y0) * v / (mx * 1.15);
  c.strokeStyle = "#2a3550"; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0, y1); c.lineTo(x1, y1); c.stroke();
  c.strokeStyle = "#7ee787"; c.lineWidth = 2.5; c.beginPath(); for (let i = 0; i <= 100; i++) { const v = i / 100; i ? c.lineTo(X(v), Y(lafferRev(v, e))) : c.moveTo(X(v), Y(lafferRev(v, e))); } c.stroke(); c.lineWidth = 1;
  const ts = 1 / (1 + e); c.strokeStyle = "#ffd166"; c.setLineDash([4, 3]); c.beginPath(); c.moveTo(X(ts), y0); c.lineTo(X(ts), y1); c.stroke(); c.setLineDash([]); TX(c, `peak t* = 1 ÷ (1 + e) = ${(ts * 100).toFixed(0)}%`, X(ts) + 6, y0 + 14, "#ffd166", "left", "600 12px");
  c.fillStyle = "#fff"; c.beginPath(); c.arc(X(t), Y(lafferRev(t, e)), 7, 0, 6.3); c.fill();
  TX(c, "The Laffer curve: revenue per person against the tax rate", x0, y0 - 18, "#eef2f8", "left", "600 13px"); TX(c, "tax rate", x1, y1 + 30, "#8fa0bf", "right", "11.5px"); for (let v = 0; v <= 1; v += 0.2) TX(c, (v * 100).toFixed(0) + "%", X(v), y1 + 14, "#6c7894", "center", "10.5px");
}
function draw() { const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); ({ pop: drawPop, luck: drawLuck, kuznets: drawKuz, laffer: drawLaffer })[P.view](c, w, h); }

// ---------------- Charts and readings ----------------
function charts() {
  const eq = [[0, 0], [1, 1]];
  if (P.view === "pop") {
    const pop = S.pop, G = lastG;
    chA.opts.title = "Lorenz curves"; chA.opts.xLabel = "share of people (poorest first)"; chA.opts.yLabel = "share held"; chA.draw([{ pts: eq, color: "#3a4a6b", label: "equality" }, { pts: lorenz(pop.map(p => p.orig)), color: "#ff8a70", label: "original income" }, { pts: lorenz(pop.map(p => p.disp)), color: "#5ad1ff", label: "disposable" }, { pts: lorenz(pop.map(p => p.wealth)), color: "#c9a0ff", label: "wealth" }], { xMin: 0, xMax: 1, yMin: 0, yMax: 1 });
    chB.opts.title = "Gini and poverty over time"; chB.opts.xLabel = "year"; chB.opts.yLabel = "Gini / share"; chB.draw([{ pts: S.hist.map(q => [q.year, q.orig]), color: "#ff8a70", label: "original" }, { pts: S.hist.map(q => [q.year, q.disp]), color: "#5ad1ff", label: "disposable" }, { pts: S.hist.map(q => [q.year, q.wealth]), color: "#c9a0ff", label: "wealth" }, { pts: S.hist.map(q => [q.year, q.rel]), color: "#ffd166", dash: [4, 3], label: "relative poverty" }], { yMin: 0, yMax: 1 });
    relabel(["Gini: original → gross", "Gini: disposable → post-tax", "Gini of wealth", "relative poverty", "absolute poverty", "median disposable income"]);
    read.set("a", `${G.orig.toFixed(3)} → ${G.gross.toFixed(3)}`); read.set("b", `${G.disp.toFixed(3)} → ${G.post.toFixed(3)}`); read.set("c", G.wealth.toFixed(3)); read.set("d", (G.rel * 100).toFixed(1) + "%"); read.set("e", (G.abs * 100).toFixed(1) + "%"); read.set("f", "£" + G.md.toFixed(0));
    ui.hud("UK (ONS): disposable income Gini 0.33; wealth Gini about 0.6");
  } else if (P.view === "luck") {
    const h = K.histogram(money, 24, 0, Math.max(500, Math.max(...money))), m = K.mean(money), ex = h.pts.map(([x]) => [x, 200 * h.w * Math.exp(-x / m) / m]);
    chA.opts.title = "How much money people have"; chA.opts.xLabel = "£"; chA.opts.yLabel = "people"; chA.draw([{ pts: h.pts, w: h.w, type: "bars", color: "#7ee787", label: "people" }, { pts: ex, color: "#ffd166", label: "exponential" }], { xMin: 0, yMin: 0 });
    chB.opts.title = "Lorenz curve"; chB.opts.xLabel = "share of people"; chB.opts.yLabel = "share of money"; chB.draw([{ pts: eq, color: "#3a4a6b", label: "equality" }, { pts: lorenz(money), color: "#7ee787", label: "now" }], { xMin: 0, xMax: 1, yMin: 0, yMax: 1 });
    relabel(["round", "Gini", "theory (no saving, no tax)", "richest person", "poorest person", ""]);
    read.set("a", String(tradeT)); read.set("b", gini(money).toFixed(3)); read.set("c", "≈ 0.5 (exponential)"); read.set("d", "£" + Math.max(...money).toFixed(0)); read.set("e", "£" + Math.min(...money).toFixed(2)); read.set("f", "");
    ui.hud("Random trading alone makes money unequal");
  } else if (P.view === "kuznets") {
    const th = []; for (let u = 0; u <= 1.0001; u += 0.02) th.push([u, kuznetsGini(u)]);
    chA.opts.title = "Kuznets curve"; chA.opts.xLabel = "share in cities"; chA.opts.yLabel = "Gini"; chA.draw([{ pts: th, color: "#ffd166", label: "theory" }, { pts: kz, type: "dots", r: 2.5, color: "#5ad1ff", label: "sampled" }, { pts: [[P.urban, kuznetsGini(P.urban)]], type: "dots", r: 6, color: "#fff", label: "now" }], { xMin: 0, xMax: 1, yMin: 0, yMax: 0.5 });
    const smp = kSample(800); chB.opts.title = "Lorenz curve now"; chB.opts.xLabel = "share of people"; chB.opts.yLabel = "share of income"; chB.draw([{ pts: eq, color: "#3a4a6b", label: "equality" }, { pts: lorenz(smp), color: "#ffd166", label: "now" }], { xMin: 0, xMax: 1, yMin: 0, yMax: 1 });
    relabel(["share in cities", "Gini (exact)", "Gini (sample of 600)", "mean income", "", ""]);
    read.set("a", (P.urban * 100).toFixed(0) + "%"); read.set("b", kuznetsGini(P.urban).toFixed(3)); read.set("c", gini(smp).toFixed(3)); read.set("d", "£" + K.mean(smp).toFixed(0)); read.set("e", ""); read.set("f", "");
    ui.hud("Kuznets (1955): inequality first rises, then falls, as an economy develops");
  } else {
    const t = P.t, e = P.e, G0 = 2 * Phi(0.6 / Math.SQRT2) - 1, pts = [], gdp = []; for (let v = 0; v <= 1.0001; v += 0.02) { pts.push([(1 - v) * G0, Math.pow(1 - v, e)]); }
    chA.opts.title = "Equity against efficiency"; chA.opts.xLabel = "Gini (lower = more equal)"; chA.opts.yLabel = "GDP per person (÷ no-tax level)"; chA.draw([{ pts, color: "#c9a0ff", label: "possible choices" }, { pts: [[(1 - t) * G0, Math.pow(1 - t, e)]], type: "dots", r: 6, color: "#fff", label: "now" }], { xMin: 0, yMin: 0, yMax: 1.05 });
    const y = Array.from({ length: 400 }, (_, i) => Math.exp(0.6 * Math.SQRT2 * inverfApprox((i + 0.5) / 400 * 2 - 1))), m = K.mean(y), disp = y.map(v => (1 - t) * v * Math.pow(1 - t, e) + t * m * Math.pow(1 - t, e));
    chB.opts.title = "Lorenz: before and after"; chB.opts.xLabel = "share of people"; chB.opts.yLabel = "share of income"; chB.draw([{ pts: eq, color: "#3a4a6b", label: "equality" }, { pts: lorenz(y), color: "#ff8a70", label: "before tax" }, { pts: lorenz(disp), color: "#5ad1ff", label: "after tax and sharing" }], { xMin: 0, xMax: 1, yMin: 0, yMax: 1 });
    relabel(["tax rate", "revenue per person", "revenue-maximising rate", "GDP per person (÷ no tax)", "Gini after", "Gini before"]);
    read.set("a", (t * 100).toFixed(0) + "%"); read.set("b", "£" + lafferRev(t, e, MED * Math.exp(0.18)).toFixed(0)); read.set("c", (100 / (1 + e)).toFixed(0) + "%"); read.set("d", (Math.pow(1 - t, e) * 100).toFixed(0) + "%"); read.set("e", ((1 - t) * G0).toFixed(3)); read.set("f", G0.toFixed(3));
    ui.hud("Laffer: revenue peaks at t* = 1 ÷ (1 + e)");
  }
}
// inverse error function (for evenly spaced log-normal incomes in the equity–efficiency view)
function inverfApprox(x) { const a = 0.147, l = Math.log(1 - x * x), t = 2 / (Math.PI * a) + l / 2; return Math.sign(x) * Math.sqrt(Math.sqrt(t * t - l / a) - t); }
let frame = 0;
ui.run(dt => { if (dt > 0) tick(dt); }, () => { draw(); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("Press Play to run the years. Choose a view at the top of the controls.", 6000);
