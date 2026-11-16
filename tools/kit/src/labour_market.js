/* =====================================================================
   THE LABOUR MARKET
   Wages are a price: the price of labour. Each EMPLOYER has a job worth
   its MARGINAL REVENUE PRODUCT (MRP = extra output × price of the product);
   each WORKER has a RESERVATION WAGE (the least they would work for).
   In weekly hiring rounds they meet and agree wages; nobody sees the
   curves, yet the wage settles where the demand for labour (MRP) meets
   the supply.
     • Labour demand is DERIVED demand: it rises if the product sells for
       more or workers become more productive.
     • A MINIMUM WAGE above the market wage creates unemployment in a
       competitive market: more want to work, fewer are hired.
     • A MONOPSONY (one big employer) hires fewer people at a lower wage;
       there, a minimum wage can RAISE employment.
     • Wages differ between markets when workers cannot move easily
       (skills, distance, housing): occupational and geographical immobility.
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
const JOBS = {
  hosp: { name: "Hospitality and retail", W0: 12.0, L0: 2.5e6, ed: 0.8, es: 1.2 },
  care: { name: "Care workers", W0: 12.4, L0: 1.6e6, ed: 0.4, es: 0.8 },
  hgv: { name: "HGV drivers", W0: 16, L0: 3e5, ed: 0.5, es: 0.3 },
  nurse: { name: "Nurses", W0: 20, L0: 3.5e5, ed: 0.3, es: 0.5 },
  soft: { name: "Software developers", W0: 32, L0: 5e5, ed: 1.0, es: 0.6 }
};
// o = { W0, ed, es, n, price (× product price), prod (× productivity), migr (extra workers, fraction), floor }
// straight-line curves through (W0, half the people): demand = MRP, supply = reservation wages
const mrpQ = (q, o) => Math.max(0, o.W0 * o.price * o.prod * (1 + (1 - q / (o.n / 2)) / o.ed));
const resQ = (q, o) => Math.max(0.2 * o.W0, o.W0 * (1 + (q / (o.n / 2 * (1 + o.migr)) - 1) / o.es));
const Ld = (w, o) => K.clamp(o.n / 2 * (1 - o.ed * (w / (o.W0 * o.price * o.prod) - 1)), 0, o.n);
const Ls = (w, o) => K.clamp(o.n / 2 * (1 + o.migr) * (1 + o.es * (w / o.W0 - 1)), 0, o.n * (1 + o.migr));
// the competitive equilibrium (and a wage floor)
function compTheory(o) {
  let lo = 0, hi = 10 * o.W0; for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (Ld(m, o) > Ls(m, o)) lo = m; else hi = m; }
  const W = (lo + hi) / 2; if (o.floor > W) return { W: o.floor, L: Ld(o.floor, o), unemp: Ls(o.floor, o) - Ld(o.floor, o), Wc: W, Lc: Ld(W, o) };
  return { W, L: Ld(W, o), unemp: 0, Wc: W, Lc: Ld(W, o) };
}
// monopsony: one employer pays the same wage to everyone it hires; to hire L it must pay the L-th worker's reservation wage
// marginal cost of labour = d(L × w(L))/dL = w + L w'(L) > w, so it stops where MRP = MCL: fewer jobs, lower wage
function monoTheory(o) {
  const best = { L: 0, W: 0, profit: -1e9 }, N = 400, Lmax = Math.min(o.n, Ls(20 * o.W0, o));
  for (let i = 1; i <= N; i++) { const L = Lmax * i / N, w = Math.max(resQ(L, o), o.floor); if (Ls(w, o) + 1e-9 < L) continue; let rev = 0; for (let k = 0; k < 30; k++) rev += mrpQ(L * (k + 0.5) / 30, o) * L / 30; const pr = rev - w * L; if (pr > best.profit) Object.assign(best, { L, W: w, profit: pr }); }
  return best;
}
// people: employers (MRP) and workers (reservation wage), with a little individuality
function people(rand, o) {
  const E = [], Wk = [], nw = Math.round(o.n * (1 + o.migr));
  for (let i = 0; i < o.n; i++) E.push({ base: (1 + (1 - (i + 0.5) / (o.n / 2)) / o.ed) * (1 + 0.02 * rand.gauss()) });
  for (let i = 0; i < nw; i++) Wk.push({ base: (1 + ((i + 0.5) / (o.n / 2 * (1 + o.migr)) - 1) / o.es) * (1 + 0.02 * rand.gauss()) });
  return { E, Wk };
}
// a competitive market of haggling employers and workers (weekly rounds)
class Market {
  constructor(rand, o) { this.r = rand; this.o = o; const p = people(rand, o); this.E = p.E; this.Wk = p.Wk; this.week = 0; this.ref = null; this.history = []; this.apply(); this.newWeek(); }
  apply() { const o = this.o; for (const e of this.E) e.v = Math.max(0, o.W0 * o.price * o.prod * e.base); for (const w of this.Wk) w.c = Math.max(0.2 * o.W0, o.W0 * w.base); }
  newWeek() {
    const { r } = this; this.week++; this.deals = []; this.meetings = 0; this.stale = 0;
    for (const e of this.E) { e.done = false; e.bid = this.ref == null ? e.v * (0.55 + 0.3 * r()) : Math.min(e.v, this.ref * (0.92 + 0.07 * r())); }
    for (const w of this.Wk) { w.done = false; w.wage = null; w.ask = this.ref == null ? w.c * (1.1 + 0.35 * r()) : Math.max(w.c, this.ref * (1.02 + 0.07 * r())); }
  }
  open() { const o = this.o; let bv = -1, sc = 1e9; for (const e of this.E) if (!e.done && e.v > bv) bv = e.v; for (const w of this.Wk) if (!w.done && w.c < sc) sc = w.c; return bv >= sc && bv >= o.floor && this.meetings < o.n * 8 && this.stale < o.n * 3 + 6; }
  meet() {
    const { r, o } = this, A = this.E.filter(e => !e.done), B = this.Wk.filter(w => !w.done); if (!A.length || !B.length) return null;
    let e = A[r.int(A.length)], w = B[r.int(B.length)];
    if (r() < 0.5) { for (let k = 0; k < 2; k++) { const w2 = B[r.int(B.length)]; if (w2.ask < w.ask) w = w2; } } else { for (let k = 0; k < 2; k++) { const e2 = A[r.int(A.length)]; if (e2.bid > e.bid) e = e2; } }
    this.meetings++; let bid = e.bid; if (o.floor > bid && o.floor <= e.v) bid = o.floor;          // the law: at least the minimum wage
    let deal = bid >= w.ask, wage = null; if (deal) { wage = Math.max(o.floor, (bid + w.ask) / 2); if (wage > e.v || wage < w.c) deal = false; }
    if (deal) { e.done = w.done = true; w.wage = wage; this.deals.push({ wage, v: e.v, c: w.c }); this.stale = 0; } else { this.stale++; const st = 0.06 * o.W0; e.bid = Math.min(e.v, e.bid + st * r()); w.ask = Math.max(w.c, w.ask - st * r()); }   // no deal: both give a little ground (steps of the same size)
    return { deal, wage };
  }
  stats() { const o = this.o, D = this.deals, unemp = this.Wk.filter(w => !w.done && w.c <= Math.max(o.floor, D.length ? K.mean(D.map(d => d.wage)) : 0)).length; return { week: this.week, L: D.length, W: D.length ? K.mean(D.map(d => d.wage)) : NaN, unemp, bill: D.reduce((s, d) => s + d.wage, 0) }; }
  endWeek() { const st = this.stats(); if (this.deals.length) this.ref = st.W; this.history.push(st); return st; }
  runWeek() { while (this.open()) this.meet(); const st = this.endWeek(); this.newWeek(); return st; }
}
// two labour markets (A and B) linked by workers who move when the gap in expected wages beats their cost of moving
const SCEN = {
  same: { label: "Identical markets", mA: 1, mB: 1, cost: 0.5, unionA: 0, migB: 0, nA: 0.5 },
  skills: { label: "Skills (occupational immobility)", mA: 1.6, mB: 1, cost: 6, unionA: 0, migB: 0, nA: 0.3 },
  regions: { label: "London and the North East", mA: 1.35, mB: 1, cost: 3, unionA: 0, migB: 0, nA: 0.45 },
  union: { label: "A union in market A", mA: 1, mB: 1, cost: 1, unionA: 1.15, migB: 0, nA: 0.5 },
  migr: { label: "Migration into market B", mA: 1, mB: 1, cost: 1, unionA: 0, migB: 0.3, nA: 0.5 }
};
function makePair(rand, sc, cost) {
  const jobs = [], workers = [];
  // each market's labour demand: the MRP of the k-th worker falls as more are hired, MRP = £12 × m × (1.6 − k/40)
  for (const m of ["A", "B"]) for (let i = 0; i < 64; i++) jobs.push({ m, v: Math.max(0, 12 * (m === "A" ? sc.mA : sc.mB) * (1.6 - (i + 0.5) / 40) * (1 + 0.01 * rand.gauss())) });
  // 60 workers (plus migrants into B), with reservation wages from £6 to £11 and their own cost of moving
  const nA = Math.round(60 * sc.nA); for (let i = 0; i < 60; i++) workers.push({ m: i < nA ? "A" : "B", c: 6 + 5 * rand(), mc: cost * (0.8 + 0.4 * rand()) });
  for (let i = 0; i < Math.round(30 * sc.migB); i++) workers.push({ m: "B", c: 6 + 5 * rand(), mc: cost * (0.8 + 0.4 * rand()) });
  return { jobs, workers, week: 0, moved: 0, hist: [] };
}
// clear each market at its competitive wage (or the union wage), then let some workers move
function clearOne(jobs, workers, floor) {
  const D = jobs.map(j => j.v).sort((a, b) => b - a), S = workers.map(w => w.c).sort((a, b) => a - b);
  let L = 0; while (L < D.length && L < S.length && D[L] >= S[L]) L++;
  let W = L ? (Math.max(S[L - 1], L < D.length ? D[L] : 0) + Math.min(D[L - 1], L < S.length ? S[L] : 1e9)) / 2 : (S[0] || 0);
  if (floor > W) { W = floor; L = Math.min(D.filter(v => v >= floor).length, S.filter(c => c <= floor).length); }
  return { W, L, N: workers.length, rate: workers.length ? L / workers.length : 0 };
}
function pairWeek(p, sc, rand) {
  const A = clearOne(p.jobs.filter(j => j.m === "A"), p.workers.filter(w => w.m === "A"), sc.unionA ? 12 * sc.unionA : 0);
  const B = clearOne(p.jobs.filter(j => j.m === "B"), p.workers.filter(w => w.m === "B"), 0);
  const eA = A.W * A.rate, eB = B.W * B.rate, from = eA > eB ? "B" : "A", gap = Math.abs(eA - eB); let moved = 0;
  for (const w of p.workers) if (w.m === from && gap > w.mc && rand() < 0.08) { w.m = from === "A" ? "B" : "A"; moved++; }
  p.week++; p.moved += moved; p.hist.push({ week: p.week, WA: A.W, WB: B.W, NA: A.N, NB: B.N, eA, eB }); p.A = A; p.B = B; return { A, B, gap: A.W - B.W };
}
const base = (x = {}) => Object.assign({ W0: 12, ed: 0.8, es: 1.2, n: 40, price: 1, prod: 1, migr: 0, floor: 0 }, x);

// ---------------- The page ----------------
const P = { job: "hosp", ed: 0.8, es: 1.2, n: 40, price: 1, prod: 1, migr: 0, floor: 0, view: "comp", scen: "regions", cost: 3 };
let mk = null, pair = null, speed = 2, pause = 0, allDeals = [], weeks = [], monoL = 1, monoHist = [], pairT = 0;
const job = () => JOBS[P.job];
const opts = () => ({ W0: job().W0, ed: P.ed, es: P.es, n: P.n, price: P.price, prod: P.prod, migr: P.migr, floor: P.floor });
const gbp = v => isFinite(v) ? "£" + v.toFixed(2) : "–";
const realL = l => l * job().L0 / (P.n / 2);
const bigN = l => { const a = realL(l); return a < 1 ? "0" : a >= 1e6 ? (a / 1e6).toFixed(2) + " million" : (a / 1e3).toFixed(0) + " thousand"; };
const ui = K.app({
  title: "The Labour Market", subject: "Economics",
  blurb: "Wages set by employers and workers: derived demand, the minimum wage, monopsony, trade unions and why wages differ",
  reset: () => set({}),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "Edexcel International GCSE Economics (4EC1) 1.2.2 and 1.3: the demand for and supply of labour, wage determination, the national minimum wage and its effects, trade unions, why wages differ (skills, demand, mobility).", adv: "Edexcel A level Economics A (9EC0) Theme 3, 3.5: demand for labour (MRP, derived demand, elasticity), supply of labour, wage determination in competitive markets, monopsony (MCL and the wage gap), trade unions, the national minimum wage, occupational and geographical immobility, wage differentials." } },
  missions: [
    { title: "How wages are set", q: "Watch the weekly hiring rounds. Nobody knows the curves. Where does the wage settle? Who is not hired?", hint: "The wage settles near the crossing of labour demand (MRP) and labour supply. Employers whose jobs are worth less than the wage do not hire; workers whose reservation wage is above it do not work (they are not unemployed: they do not want the job at that wage).", setup() { set({}); } },
    { title: "The National Living Wage", q: "Set the minimum wage to £12.71 (April 2026) in hospitality. What happens to employment? Who gains and who loses?", hint: "If the market wage is below £12.71 the minimum wage binds: those in work earn more, but fewer are hired and more want to work: unemployment (the gap between the curves). How big depends on the elasticity of labour demand.", setup() { set({ floor: 12.71 }); } },
    { title: "Derived demand: a boom", q: "Raise the product price by 20% (customers spend more). What happens to wages and employment?", hint: "Each worker's MRP (= extra output × price) rises, so labour demand shifts right: higher wages and more jobs. The demand for labour is derived from the demand for the product.", setup() { set({ price: 1.2 }); } },
    { title: "Lorry driver shortage", q: "HGV drivers, 2021: many EU drivers left and training stopped during Covid. Reduce the supply (migration −20%). What happens to pay?", hint: "Supply shifts left; with inelastic supply (it takes months to train) wages rise sharply: HGV pay rose by about 10–20% in 2021 and firms offered bonuses.", setup() { set({ job: "hgv", migr: -0.2 }); } },
    { title: "A trade union", q: "A union negotiates a wage 15% above the market wage for nurses. What happens to employment, and why is the effect small?", hint: "A union wage acts like a minimum wage: higher pay for members, fewer jobs. Demand for nurses is inelastic (|PED| ≈ 0.3), so employment falls only a little; unions are strongest where demand for labour is inelastic.", setup() { set({ job: "nurse", floor: 23 }); } },
    { title: "Why wages differ: skills", q: "Switch to two markets with a skills gap. Do workers move to the better-paid market? Does the gap close?", hint: "Some move, but training takes time and money (occupational immobility), so a gap about the size of the cost of moving remains. Higher skills mean higher MRP and scarcer supply.", setup() { set({ view: "two", scen: "skills" }); } },
    { title: "London and the North East", q: "Why are wages higher in London, and why don't more people move there?", hint: "Higher MRP (productivity) in London raises wages; housing costs and family ties make moving expensive (geographical immobility), so the gap persists at about the cost of moving.", setup() { set({ view: "two", scen: "regions" }); } },
    { lvl: "adv", title: "Monopsony", q: "One employer owns every job. Compare its wage and employment with the competitive outcome. Why is MCL above the supply curve?", hint: "To hire one more worker it must raise the wage for everyone, so MCL = w + L × Δw/ΔL > w. It hires where MRP = MCL: fewer workers, at a wage below their MRP (the monopsony wage gap).", setup() { set({ view: "mono" }); } },
    { lvl: "adv", title: "Minimum wage in a monopsony", q: "Add a minimum wage between the monopsony wage and the competitive wage. What happens to employment?", hint: "Employment RISES: the minimum wage removes the reason to hold wages down (MCL becomes flat at the minimum wage up to the supply curve). This is why some economists find small or no job losses from minimum wages.", setup() { set({ view: "mono", floor: 12.0 }); } },
    { lvl: "adv", title: "Elasticity of labour demand", q: "Compare a minimum wage of £12.71 in hospitality and in care. Where is the job loss bigger?", hint: "The more elastic the demand for labour (easy substitutes: machines, self-service), the bigger the fall in employment for the same rise in wage.", setup() { set({ floor: 12.71 }); } }
  ],
  batch: [
    { title: "Minimum wage and unemployment", question: "In a competitive market, how does unemployment change as the minimum wage rises above the market wage?", how: "Hospitality-like market (|elasticity| of demand 0.8, of supply 1.2), 40 employers and 40 workers, haggling for 6 weeks, then 5 weeks averaged. Unemployment = workers willing at the wage who were not hired.", xLabel: "minimum wage (% of the market wage)", yLabel: "unemployed (people in the model)", xs: [90, 100, 105, 110, 120, 130], reps: 5, yMin: 0, theory: x => compTheory(base({ floor: 12 * x / 100 })).unemp, theoryLabel: "Ls − Ld", run: (x, r) => { const m = new Market(K.rng(Math.floor(r() * 1e9)), base({ floor: 12 * x / 100 })); for (let i = 0; i < 6; i++) m.runWeek(); const v = []; for (let i = 0; i < 5; i++) v.push(m.runWeek().unemp); return K.mean(v); }, note: "Below the market wage a minimum wage does nothing. Above it, unemployment grows with the gap between labour supply and demand. Haggling adds a little frictional unemployment even with no minimum wage." },
    { title: "Minimum wage in a monopsony", question: "How does employment change with the minimum wage when one employer has all the jobs?", how: "The same curves; the monopsonist chooses employment to maximise profit, paying max(the wage needed to attract L workers, the minimum wage).", xLabel: "minimum wage (£)", yLabel: "employment (people in the model)", xs: [0, 10, 10.5, 11, 11.5, 12, 12.5, 13, 14], reps: 1, yMin: 0, theory: x => compTheory(base({ floor: x })).L, theoryLabel: "competitive market", run: x => monoTheory(base({ floor: x })).L, note: "In the monopsony, employment rises with the minimum wage up to the competitive wage (where supply meets MRP), then falls. In a competitive market (theory line) any binding minimum wage cuts jobs." },
    { title: "Derived demand", question: "How does the wage depend on the price of the product the workers make?", how: "Product price × 0.7 to 1.3 (MRP = MPP × P); market haggling as above; average wage after settling.", xLabel: "product price (× today's)", yLabel: "wage (£ per hour)", xs: [0.7, 0.85, 1, 1.15, 1.3], reps: 5, theory: x => compTheory(base({ price: x })).W, theoryLabel: "MRP = supply", run: (x, r) => { const m = new Market(K.rng(Math.floor(r() * 1e9)), base({ price: x })); for (let i = 0; i < 6; i++) m.runWeek(); const v = []; for (let i = 0; i < 5; i++) v.push(m.runWeek().W); return K.mean(v); }, note: "A higher product price raises MRP, so firms want more workers and wages rise: the demand for labour is derived from the demand for the product." },
    { title: "Does mobility close the wage gap?", question: "After a year, how big is the wage gap between two regions as the cost of moving changes?", how: "Two regions, A with 35% higher productivity; workers move when the gap in expected wages (wage × chance of a job) beats their own cost of moving; average of weeks 45–52.", xLabel: "average cost of moving (£ per hour equivalent)", yLabel: "gap in expected wages A − B (£)", xs: [0, 1, 2, 3, 4, 6], reps: 5, yMin: 0, theory: x => 0.8 * x, theoryLabel: "≈ the cost of moving (cheapest movers)", run: (x, r) => { const sc = SCEN.regions, p = makePair(r, sc, x); for (let i = 0; i < 52; i++) pairWeek(p, sc, r); const L = p.hist.slice(-8); return K.mean(L.map(q => q.eA - q.eB)); }, note: "With free movement wages converge; the dearer it is to move (housing, retraining, family), the bigger the gap that survives. Mobility is a key reason wages differ." },
    { title: "Does haggling find the market wage?", question: "If many labour markets with the same curves each settle by haggling, what wages do they reach?", how: "40 employers and 40 workers, a new random market each time, 8 weeks, wage = average of week 8.", yLabel: "wage (£ per hour)", reps: 200, bins: 20, theory: 12, theoryLabel: "market wage", run: (x, r) => { const m = new Market(K.rng(Math.floor(r() * 1e9)), base()); let st; for (let i = 0; i < 8; i++) st = m.runWeek(); return st.W; }, note: "Close to the crossing of labour demand and supply, with some spread from the luck of who meets whom: the invisible hand works for wages too." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4EC1 1.3", text: "The demand for labour is a derived demand: it depends on the demand for the product. Wage up → quantity of labour demanded down (substitute machines, produce less)." },
      { lvl: "std", tag: "4EC1 1.3", text: "The supply of labour to a job depends on the wage, skills and training needed, working conditions and the number of people able and willing to do it." },
      { lvl: "std", tag: "4EC1 1.3", text: "A national minimum wage above the market wage raises pay for those in work but can cause unemployment (Ls > Ld). Trade unions can raise wages in the same way." },
      { lvl: "std", tag: "4EC1 1.3", text: "Wages differ because of skills and qualifications, demand for the product, unions, discrimination and how easily workers can move between jobs (occupational) and places (geographical)." },
      { lvl: "adv", tag: "9EC0 3.5.1", text: "MRP = MPP × MR. A profit-maximising firm in a competitive labour market hires where MRP = wage." },
      { lvl: "adv", tag: "9EC0 3.5.3", text: "Monopsony: MCL lies above the supply (average cost of labour) curve. The monopsonist hires where MRP = MCL, paying the wage on the supply curve: lower wage and employment than in a competitive market." },
      { lvl: "adv", tag: "9EC0 3.5.4", text: "A minimum wage between the monopsony wage and the competitive wage can raise both wages and employment. Unions can act as a countervailing power to a monopsony (bilateral monopoly)." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: "Explain why the demand for hospitality workers is a derived demand, and what happens to wages if people spend more on eating out.", ans: "<ul><li>firms want workers only to produce meals and services that customers buy</li><li>more spending raises the price/revenue from each worker's output, so demand for labour shifts right</li><li>wages and employment rise</li></ul>" },
      { lvl: "std", marks: 4, q: () => { const th = compTheory(opts()); return `On screen the minimum wage is ${P.floor ? gbp(P.floor) : "not set"} and the market wage is ${gbp(th.Wc)}. Explain the effect of setting the minimum wage at ${gbp(th.Wc * 1.1)}.`; }, ans: "<ul><li>it is above the market wage, so it binds</li><li>those who keep their jobs earn more</li><li>employers demand fewer workers (move up the demand curve); more people want to work</li><li>excess supply of labour: unemployment; size depends on the elasticity of demand for labour</li></ul>" },
      { lvl: "adv", marks: 4, q: "Using a diagram, explain why a monopsony employer pays a lower wage and employs fewer workers than a competitive labour market.", ans: "<ul><li>supply = average cost of labour; MCL above it (raising the wage for one more worker raises it for all)</li><li>hires where MRP = MCL: L_m below the competitive L</li><li>pays the wage on the supply curve at L_m: below MRP and below the competitive wage</li><li>the gap between MRP and the wage is the monopsony 'exploitation'</li></ul>" },
      { lvl: "adv", marks: 3, q: "Explain how a minimum wage could increase employment in a monopsony labour market.", ans: "<ul><li>with a minimum wage the MCL is flat at the minimum wage up to the supply curve</li><li>the employer hires where MRP = minimum wage (or where supply allows)</li><li>if the minimum wage is between the monopsony and competitive wages, employment rises</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li><b>Competitive market:</b> 40 employers (each job worth its MRP) and 40 workers (each with a reservation wage), on straight-line labour demand and supply through the market wage with the chosen elasticities, plus a little individuality. Each week they meet at random and haggle (as in <i>The Trading Pit</i>); a minimum wage makes lower wages illegal. Product price and productivity scale every MRP (derived demand); migration adds or removes workers at every wage.</li>
<li><b>Monopsony (A level):</b> one employer, the same curves. To hire L workers it pays the reservation wage of the L-th (or the minimum wage, if higher) to everyone; it learns week by week which L gives the most profit (revenue = sum of MRPs − wage × L).</li>
<li><b>Two markets:</b> in each market the MRP of the k-th worker is £12 × m × (1.6 − k/40), where m is the market's productivity; 60 workers with reservation wages of £6–£11 (plus migrants into B). Each week each market clears at its competitive wage (or a union wage in A); workers in the market with the lower expected wage (wage × chance of a job) move with an 8% chance a week if the gap beats their own cost of moving.</li></ul>
<h3>Left out</h3>
<ul><li>Hours, part-time work, non-wage benefits, taxes and benefits, search and job matching over time, training as an investment, discrimination, efficiency wages, and the real UK elasticities (illustrative values).</li></ul>
<p>The earlier version of this simulation (with a division-of-labour workshop), with its worksheets, is kept in <a href="original/labour-market.html">original/labour-market.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("View");
ctl.view = K.seg(g, { value: "comp", options: [["comp", "👷 Wage determination"], ["mono", "🏭 Monopsony (A level)"], ["two", "↔ Wage differences"]], on: v => { P.view = v; restart(); } });
g = ui.group("The job");
ctl.job = K.seg(g, { value: "hosp", options: Object.entries(JOBS).map(([k, v]) => [k, v.name]), on: v => set({ job: v, view: P.view }) });
ctl.ed = K.slider(g, { label: "Elasticity of labour demand", min: 0.1, max: 3, step: 0.05, value: 0.8, fmt: v => v.toFixed(2), on: v => { P.ed = v; apply(); } });
ctl.es = K.slider(g, { label: "Elasticity of labour supply", min: 0.1, max: 3, step: 0.05, value: 1.2, fmt: v => v.toFixed(2), on: v => { P.es = v; apply(); } });
ctl.price = K.slider(g, { label: "Product price (derived demand)", min: 0.5, max: 1.5, step: 0.01, value: 1, fmt: v => "× " + v.toFixed(2), on: v => { P.price = v; apply(); } });
ctl.prod = K.slider(g, { label: "Productivity", min: 0.5, max: 1.5, step: 0.01, value: 1, fmt: v => "× " + v.toFixed(2), on: v => { P.prod = v; apply(); } });
ctl.migr = K.slider(g, { label: "Migration (workers at every wage)", min: -0.4, max: 0.6, step: 0.01, value: 0, fmt: v => (v >= 0 ? "+" : "") + (v * 100).toFixed(0) + "%", on: v => { P.migr = v; restart(); } });
ctl.floor = K.slider(g, { label: "Minimum wage / union wage", min: 0, max: 45, step: 0.01, value: 0, fmt: v => v ? "£" + v.toFixed(2) + " an hour" : "none", on: v => { P.floor = v; apply(); } });
g = ui.group("Two markets");
ctl.scen = K.seg(g, { value: "regions", options: Object.entries(SCEN).map(([k, v]) => [k, v.label]), on: v => { P.scen = v; P.cost = SCEN[v].cost; ctl.cost.set(P.cost); restart(); } });
ctl.cost = K.slider(g, { label: "Average cost of moving", min: 0, max: 8, step: 0.1, value: 3, fmt: v => "£" + v.toFixed(1) + " an hour", on: v => { P.cost = v; restart(); } });
g = ui.group("Run");
ctl.speed = K.slider(g, { label: "Speed", min: 1, max: 6, step: 1, value: 2, fmt: v => v < 6 ? v + "×" : "a week per blink", on: v => speed = v });
let rr = K.row(g); K.btn(rr, "⏭ End the week", () => { if (P.view === "comp") { while (mk.open()) mk.meet(); finishWeek(); } else stepOther(); }); K.btn(rr, "↺ New people", () => restart());
const read = K.readout(ui.group("Readings"), [["w", "wage"], ["l", "employment"], ["u", "unemployment"], ["bill", "wage bill"], ["x", "theory"]]);
function set(o) {
  Object.assign(P, { job: "hosp", price: 1, prod: 1, migr: 0, floor: 0, n: 40, view: "comp", scen: "regions" }, o);
  const j = job(); P.ed = o.ed || j.ed; P.es = o.es || j.es; P.cost = o.cost != null ? o.cost : SCEN[P.scen].cost;
  for (const k of ["ed", "es", "price", "prod", "migr", "floor", "cost"]) ctl[k].set(P[k]); ctl.job.set(P.job); ctl.view.set(P.view); ctl.scen.set(P.scen); restart();
}
function restart() { mk = new Market(K.rng(Date.now() % 1e9), opts()); allDeals = []; weeks = []; pause = 0; monoL = 2; monoHist = []; pair = makePair(K.rng(Date.now() % 1e9 + 1), SCEN[P.scen], P.cost); pairT = 0; }
function apply() { if (!mk) return; Object.assign(mk.o, opts()); mk.apply(); }
function finishWeek() { const st = mk.endWeek(); weeks.push(st); pause = speed >= 6 ? 0 : 0.9; }
// the monopsonist tries one more or one fewer worker each week and keeps whichever makes more profit
function monoProfit(L, o) { if (L <= 0) return 0; const D = mk.E.map(e => e.v).sort((a, b) => b - a), S = mk.Wk.map(w => w.c).sort((a, b) => a - b); if (L > Math.min(D.length, S.length)) return -1e9; const w = Math.max(S[L - 1], o.floor); if (S.filter(c => c <= w).length < L) return -1e9; let rev = 0; for (let k = 0; k < L; k++) rev += D[k]; return rev - w * L; }
function stepOther() {
  if (P.view === "mono") { const o = mk.o; let best = monoL; for (const d of [-2, -1, 1, 2]) if (monoProfit(monoL + d, o) > monoProfit(best, o)) best = monoL + d; monoL = Math.max(1, best); const S = mk.Wk.map(w => w.c).sort((a, b) => a - b); monoHist.push([monoHist.length + 1, Math.max(S[monoL - 1], o.floor), monoL]); }
  else pairWeek(pair, Object.assign({}, SCEN[P.scen]), K.rng(Date.now() % 1e9));
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
// a labour-market diagram in a box
function diagram(c, x0, y0, x1, y1, o, extra) {
  const WM = Math.max(o.W0 * 2, o.floor * 1.25, o.W0 * o.price * o.prod * 1.6), LM = o.n * Math.max(1, 1 + o.migr), X = q => x0 + q / LM * (x1 - x0), Y = w => y1 - Math.min(w, WM) / WM * (y1 - y0);
  c.strokeStyle = "#1f2c47"; for (let k = 0; k <= 4; k++) { const w = WM * k / 4; c.beginPath(); c.moveTo(x0, Y(w)); c.lineTo(x1, Y(w)); c.stroke(); TX(c, "£" + w.toFixed(0), x0 - 6, Y(w) + 4, "#8fa0bf", "right", "11px"); }
  TX(c, "number of workers", (x0 + x1) / 2, y1 + 30, "#8fa0bf", "center", "11px"); for (let k = 0; k <= 4; k++) TX(c, bigN(LM * k / 4), X(LM * k / 4), y1 + 14, "#8fa0bf", "center", "10px");
  const line = (f, col, dash, a = 0, b = LM) => { c.strokeStyle = col; c.lineWidth = 2.5; c.setLineDash(dash || []); c.beginPath(); for (let k = 0; k <= 60; k++) { const q = a + (b - a) * k / 60; k ? c.lineTo(X(q), Y(f(q))) : c.moveTo(X(q), Y(f(q))); } c.stroke(); c.setLineDash([]); c.lineWidth = 1; };
  line(q => mrpQ(q, o), "#5ad1ff"); line(q => resQ(q, o), "#ffb454");
  TX(c, "D = MRP", X(LM * 0.05), Y(mrpQ(LM * 0.05, o)) - 6, "#5ad1ff", "left", "600 12px"); TX(c, "S", X(LM * 0.9), Y(resQ(LM * 0.9, o)) - 8, "#ffb454", "right", "600 12px");
  extra && extra({ X, Y, line, LM, WM });
}
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h, o = mk.o; c.fillStyle = "#0a1020"; c.fillRect(0, 0, w, h);
  if (P.view === "comp") {
    const FW = w * 0.34, n = o.n, cols = Math.ceil(n / 4), dx = (FW - 30) / cols;
    TX(c, "EMPLOYERS (a job worth its MRP)", 14, 20, "#5ad1ff", "left", "600 11.5px"); TX(c, "WORKERS (reservation wage)", 14, h / 2 + 30, "#ffb454", "left", "600 11.5px");
    mk.E.forEach((e, i) => { const x = 22 + dx * (i % cols + 0.5), y = 42 + Math.floor(i / cols) * 28; c.globalAlpha = e.done ? 1 : 0.35; c.fillStyle = "#5ad1ff"; c.fillRect(x - 7, y - 7, 14, 14); c.globalAlpha = 1; });
    const wNow = weeks.length ? weeks[weeks.length - 1].W : o.W0;
    mk.Wk.forEach((wk, i) => { const x = 22 + dx * (i % cols + 0.5), y = h / 2 + 52 + Math.floor(i / cols) * 28; c.globalAlpha = wk.done ? 1 : 0.35; c.fillStyle = "#ffb454"; c.beginPath(); c.arc(x, y, 7, 0, 6.3); c.fill(); c.globalAlpha = 1; if (wk.done) TX(c, "✓", x, y + 4, "#0a1020", "center", "600 10px"); if (!wk.done && pause > 0 && wk.c <= Math.max(o.floor, wNow)) { c.strokeStyle = "#ff6b81"; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 10, 0, 6.3); c.stroke(); c.lineWidth = 1; } });
    TX(c, `Week ${mk.week} · ${mk.deals.length} hired`, 14, h / 2 + 4, "#cfd8ea", "left", "12px"); TX(c, "bright = hired this week · red ring = wants a job at this wage but was not hired (unemployed)", 14, h - 10, "#7d8aa5", "left", "10px");
    const th = compTheory(o);
    diagram(c, FW + 60, 26, w - 20, h - 46, o, ({ X, Y, line }) => {
      if (o.floor > 0) { c.strokeStyle = "#7ee787"; c.lineWidth = 1.5; c.setLineDash([7, 4]); c.beginPath(); c.moveTo(X(0), Y(o.floor)); c.lineTo(w - 20, Y(o.floor)); c.stroke(); c.setLineDash([]); c.lineWidth = 1; TX(c, `minimum wage £${o.floor.toFixed(2)}${th.unemp > 0 ? " · unemployment " + bigN(th.unemp) : " · not binding"}`, w - 24, Y(o.floor) - 5, "#7ee787", "right", "600 11px"); if (th.unemp > 0) { c.strokeStyle = "#ff6b81"; c.lineWidth = 3; c.beginPath(); c.moveTo(X(th.L), Y(o.floor) + 6); c.lineTo(X(th.L + th.unemp), Y(o.floor) + 6); c.stroke(); c.lineWidth = 1; } }
      c.strokeStyle = "rgba(255,255,255,.55)"; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(X(0), Y(th.W)); c.lineTo(X(th.L), Y(th.W)); c.lineTo(X(th.L), h - 46); c.stroke(); c.setLineDash([]);
      mk.deals.forEach((d, k) => { c.fillStyle = "#fff"; c.beginPath(); c.arc(X(k + 0.5), Y(d.wage), 3.6, 0, 6.3); c.fill(); });
    });
  } else if (P.view === "mono") {
    const D = mk.E.map(e => e.v).sort((a, b) => b - a), S = mk.Wk.map(x => x.c).sort((a, b) => a - b), L = monoL, wage = Math.max(S[L - 1] || 0, o.floor);
    const FW = w * 0.34; TX(c, "ONE EMPLOYER: the only buyer of this kind of labour", 14, 22, "#5ad1ff", "left", "600 11.5px");
    c.fillStyle = "#24324f"; c.fillRect(30, 40, FW - 60, 70); TX(c, "🏭", FW / 2, 92, "#fff", "center", "40px");
    const cols = 8; S.forEach((s, i) => { const x = 30 + (i % cols) * (FW - 60) / (cols - 1), y = 150 + Math.floor(i / cols) * 30; const hired = i < L; c.globalAlpha = hired ? 1 : s <= wage ? 0.6 : 0.25; c.fillStyle = hired ? "#7ee787" : "#ffb454"; c.beginPath(); c.arc(x, y, 8, 0, 6.3); c.fill(); c.globalAlpha = 1; });
    TX(c, `Hired: ${L} (${bigN(L)}) at ${gbp(wage)} an hour`, 14, h - 46, "#7ee787", "left", "600 12.5px"); TX(c, "green = hired · bright orange = would work at this wage · dim = needs more", 14, h - 12, "#7d8aa5", "left", "10px");
    const mt = monoTheory(o), ct = compTheory(Object.assign({}, o, { floor: 0 }));
    diagram(c, FW + 60, 26, w - 20, h - 46, o, ({ X, Y, line, LM }) => {
      line(q => { const d = 0.01 * LM; return resQ(q, o) <= o.floor ? o.floor : (resQ(q + d, o) * (q + d) - resQ(q, o) * q) / d; }, "#ff8a70", [6, 4], 0, LM * 0.75);
      TX(c, "MCL", X(LM * 0.42), Y(Math.max(o.floor, 2 * resQ(LM * 0.42, o) - resQ(0, o))) - 6, "#ff8a70", "left", "600 12px");
      if (o.floor > 0) { c.strokeStyle = "#7ee787"; c.setLineDash([7, 4]); c.beginPath(); c.moveTo(X(0), Y(o.floor)); c.lineTo(w - 20, Y(o.floor)); c.stroke(); c.setLineDash([]); TX(c, "minimum wage £" + o.floor.toFixed(2), w - 24, Y(o.floor) - 5, "#7ee787", "right", "600 11px"); }
      c.fillStyle = "#fff"; c.beginPath(); c.arc(X(ct.L), Y(ct.W), 5, 0, 6.3); c.fill(); TX(c, "competitive", X(ct.L) + 8, Y(ct.W) + 14, "#cfd8ea", "left", "11px");
      c.fillStyle = "#ff8a70"; c.beginPath(); c.arc(X(mt.L), Y(mt.W), 6, 0, 6.3); c.fill(); TX(c, "monopsony (theory)", X(mt.L) - 8, Y(mt.W) + 16, "#ff8a70", "right", "600 11px");
      c.strokeStyle = "#7ee787"; c.lineWidth = 2; c.beginPath(); c.arc(X(L), Y(wage), 9, 0, 6.3); c.stroke(); c.lineWidth = 1; TX(c, "this week", X(L) + 11, Y(wage) - 8, "#7ee787", "left", "11px");
      c.strokeStyle = "rgba(255,138,112,.6)"; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(X(mt.L), Y(mrpQ(mt.L, o))); c.lineTo(X(mt.L), h - 46); c.stroke(); c.setLineDash([]); if (mrpQ(mt.L, o) - mt.W > 0.05) TX(c, `gap MRP − wage ${gbp(mrpQ(mt.L, o) - mt.W)}`, X(mt.L) + 6, Y((mrpQ(mt.L, o) + mt.W) / 2), "#ff8a70", "left", "11px");
    });
  } else {
    const sc = SCEN[P.scen], A = pair.A || clearOne(pair.jobs.filter(j => j.m === "A"), pair.workers.filter(x => x.m === "A"), 0), B = pair.B || clearOne(pair.jobs.filter(j => j.m === "B"), pair.workers.filter(x => x.m === "B"), 0);
    const names = P.scen === "regions" ? ["London", "North East"] : P.scen === "skills" ? ["Skilled jobs", "Unskilled jobs"] : ["Market A", "Market B"];
    const box = (x0, M, R, label, col) => {
      c.fillStyle = "rgba(255,255,255,.03)"; c.strokeStyle = "#24324f"; c.beginPath(); c.roundRect(x0, 40, w * 0.4, h - 90, 14); c.fill(); c.stroke();
      TX(c, label, x0 + 14, 66, col, "left", "600 15px"); TX(c, `wage ${gbp(R.W)} · ${R.L} of ${R.N} workers employed`, x0 + 14, 88, "#cfd8ea", "left", "12.5px");
      const ws = pair.workers.filter(x => x.m === M), cols = 10; ws.forEach((x, i) => { const px = x0 + 26 + (i % cols) * (w * 0.4 - 52) / (cols - 1), py = 120 + Math.floor(i / cols) * 26; c.fillStyle = i < R.L ? col : "rgba(160,170,190,.4)"; c.beginPath(); c.arc(px, py, 8, 0, 6.3); c.fill(); });
      const jobsM = pair.jobs.filter(j => j.m === M).length; TX(c, `${jobsM} employers · MRP × ${(M === "A" ? sc.mA : sc.mB).toFixed(2)}${M === "A" && sc.unionA ? " · union wage £" + (12 * sc.unionA).toFixed(2) : ""}`, x0 + 14, h - 64, "#8fa0bf", "left", "11.5px");
    };
    box(w * 0.05, "A", A, names[0], "#5ad1ff"); box(w * 0.55, "B", B, names[1], "#ffb454");
    const gap = A.W - B.W; c.fillStyle = "#c9a0ff"; TX(c, `gap ${gbp(gap)}`, w * 0.5, h / 2 - 10, "#c9a0ff", "center", "600 14px"); TX(c, gap > 0 ? "⟵ movers" : "movers ⟶", w * 0.5, h / 2 + 12, "#c9a0ff", "center", "13px");
    TX(c, `Week ${pair.week} · ${pair.moved} workers have moved · average cost of moving £${P.cost.toFixed(1)} an hour`, w / 2, h - 18, "#cfd8ea", "center", "12px");
  }
}

// ---------------- Charts and readings ----------------
function charts() {
  const o = mk.o, adv = ui.level === "adv";
  if (P.view === "comp") {
    const th = compTheory(o), last = weeks[weeks.length - 1];
    chA.opts.title = "Every hire's wage"; chA.opts.xLabel = "week"; chA.opts.yLabel = "£ per hour"; chA.opts.xFmt = null;
    chA.draw([{ pts: allDeals, type: "dots", r: 2, color: "#cfd8ea", label: "hires" }, { pts: weeks.map(d => [d.week + 0.5, d.W]), color: "#5ad1ff", label: "average wage" }], { xMin: Math.max(1, mk.week - 20), xMax: mk.week + 1, yMin: 0, hlines: [{ y: th.W, label: "theory", color: "#7fe3a0" }] });
    chB.opts.title = "Employment and unemployment"; chB.opts.xLabel = "week"; chB.opts.yLabel = "people (model)";
    chB.draw([{ pts: weeks.map(d => [d.week, d.L]), color: "#7ee787", label: "employed" }, { pts: weeks.map(d => [d.week, d.unemp]), color: "#ff6b81", label: "unemployed" }], { xMin: Math.max(1, mk.week - 20), xMax: mk.week + 1, yMin: 0, hlines: [{ y: th.L, label: "theory employment", color: "#56607a" }] });
    read.set("w", last ? `${gbp(last.W)} an hour (theory ${gbp(th.W)})` : "–"); read.set("l", last ? `${bigN(last.L)} (theory ${bigN(th.L)})` : "–"); read.set("u", last ? `${bigN(last.unemp)} (theory ${bigN(th.unemp)})` : "–"); read.set("bill", last ? `£${(last.bill * job().L0 / (P.n / 2) * 37.5 / 1e6).toFixed(0)} million a week` : "–");
    read.set("x", adv ? `elasticity of demand ${o.ed.toFixed(2)}, of supply ${o.es.toFixed(2)}${o.floor > th.Wc ? `; wage +${((o.floor / th.Wc - 1) * 100).toFixed(1)}% → jobs ${((th.L / th.Lc - 1) * 100).toFixed(1)}%` : ""}` : "D = MRP meets S");
    ui.hud(th.unemp > 0 ? "The minimum wage is above the market wage: unemployment" : "Employers and workers agree wages; the wage settles where MRP meets supply");
  } else if (P.view === "mono") {
    const mt = monoTheory(o), ct = compTheory(Object.assign({}, o, { floor: 0 })), xs = []; for (let m = 0.6; m <= 1.6; m += 0.025) xs.push(m * o.W0);
    chA.opts.title = "The employer learns"; chA.opts.xLabel = "week"; chA.opts.yLabel = "wage (£) · workers ÷ 4"; chA.opts.xFmt = null;
    chA.draw([{ pts: monoHist.map(q => [q[0], q[1]]), color: "#7ee787", label: "wage paid" }, { pts: monoHist.map(q => [q[0], q[2] / 4]), color: "#5ad1ff", label: "workers ÷ 4" }], { yMin: 0, hlines: [{ y: mt.W, label: "monopsony wage", color: "#ff8a70" }] });
    chB.opts.title = "Employment against the minimum wage"; chB.opts.xLabel = "minimum wage (£)"; chB.opts.yLabel = "employment (model)";
    chB.draw([{ pts: xs.map(x => [x, monoTheory(Object.assign({}, o, { floor: x })).L]), color: "#ff8a70", label: "monopsony" }, { pts: xs.map(x => [x, compTheory(Object.assign({}, o, { floor: x })).L]), color: "#5ad1ff", label: "competitive" }], { yMin: 0, vlines: o.floor ? [{ x: o.floor, label: "now", color: "#7ee787" }] : [] });
    const S = mk.Wk.map(x => x.c).sort((a, b) => a - b), wNow = Math.max(S[monoL - 1] || 0, o.floor);
    read.set("w", `${gbp(wNow)} (monopsony theory ${gbp(mt.W)}, competitive ${gbp(ct.W)})`); read.set("l", `${bigN(monoL)} (theory ${bigN(mt.L)}, competitive ${bigN(ct.L)})`); read.set("u", "–"); read.set("bill", `£${(wNow * realL(monoL) * 37.5 / 1e6).toFixed(0)} million a week`); read.set("x", `MRP at the last worker ${gbp(mrpQ(mt.L, o))}: wage gap ${gbp(mrpQ(mt.L, o) - mt.W)}`);
    ui.hud(adv ? "A monopsonist hires where MRP = MCL and pays the wage on the supply curve" : "Monopsony is part of the A level course: switch to Advanced for the full story");
  } else {
    const H = pair.hist;
    chA.opts.title = "Wages in the two markets"; chA.opts.xLabel = "week"; chA.opts.yLabel = "£ per hour"; chA.opts.xFmt = null;
    chA.draw([{ pts: H.map(q => [q.week, q.WA]), color: "#5ad1ff", label: "A" }, { pts: H.map(q => [q.week, q.WB]), color: "#ffb454", label: "B" }], { yMin: 0 });
    chB.opts.title = "Where the workers are"; chB.opts.xLabel = "week"; chB.opts.yLabel = "workers";
    chB.draw([{ pts: H.map(q => [q.week, q.NA]), color: "#5ad1ff", label: "in A" }, { pts: H.map(q => [q.week, q.NB]), color: "#ffb454", label: "in B" }], { yMin: 0 });
    const A = pair.A, B = pair.B; read.set("w", A ? `A ${gbp(A.W)} · B ${gbp(B.W)} · gap ${gbp(A.W - B.W)}` : "–"); read.set("l", A ? `A ${A.L} of ${A.N} · B ${B.L} of ${B.N}` : "–"); read.set("u", A ? `A ${A.N - A.L} · B ${B.N - B.L} without a job` : "–"); read.set("bill", "–"); read.set("x", `workers moved so far: ${pair.moved}`);
    ui.hud("Workers move to the better-paid market if the gap beats their cost of moving");
  }
}

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => {
  if (!(dt > 0)) return;
  if (P.view !== "comp") { pairT += dt * speed * speed * 0.7; while (pairT >= 1) { pairT--; stepOther(); } return; }
  if (pause > 0) { pause -= dt * Math.max(1, speed / 2); if (pause <= 0) mk.newWeek(); return; }
  if (speed >= 6) { while (mk.open()) { const ev = mk.meet(); if (ev && ev.deal) allDeals.push([mk.week + mk.deals.length / (mk.o.n + 1), ev.wage]); } finishWeek(); mk.newWeek(); return; }
  let k = Math.max(1, Math.round(speed * speed * dt * 12)); while (k-- > 0 && mk.open()) { const ev = mk.meet(); if (ev && ev.deal) allDeals.push([mk.week + mk.deals.length / (mk.o.n + 1), ev.wage]); }
  if (!mk.open()) finishWeek(); if (allDeals.length > 2500) allDeals.splice(0, 500);
}, () => { draw(); if (frame++ % 5 === 0) charts(); });
set({});
ui.tip("Squares are employers, circles are workers. Each week they meet and agree wages; white dots are this week's hires.", 7000);
