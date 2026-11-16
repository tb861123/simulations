/* =====================================================================
   TAXES, SUBSIDIES AND PRICE CONTROLS
   A market of real people: each BUYER has a private value (the most they
   would pay), each SELLER a private cost (the least they would accept).
   They haggle; nobody sees the curves, yet the price settles where
   demand meets supply. Then the government steps in:
     • an indirect tax drives a WEDGE between what consumers pay and what
       sellers keep. Who really pays depends on elasticities:
         consumers' share = PES ÷ (PES + |PED|)
     • a subsidy works the other way (the government pays part of the price);
     • a MAXIMUM price below equilibrium causes a shortage (queues, black
       markets); a MINIMUM price above it causes a surplus.
   Prices are in £; each trader stands for many real units.
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
// Products: free-market price P0, real quantity Q0 (per period), illustrative elasticities
const PRODUCTS = {
  coffee: { name: "Takeaway coffee", unit: "cup", P0: 3.0, Q0: 1e7, per: "a day", ped: 0.8, pes: 1.5 },
  petrol: { name: "Petrol", unit: "litre", P0: 0.62, Q0: 1.2e8, per: "a day", ped: 0.3, pes: 1.5 },
  drinks: { name: "Sugary drinks", unit: "litre", P0: 1.0, Q0: 1.3e7, per: "a day", ped: 1.2, pes: 2 },
  cigs: { name: "Cigarettes", unit: "pack", P0: 4.5, Q0: 3.6e6, per: "a day", ped: 0.4, pes: 2 },
  flats: { name: "Rented flats", unit: "flat", P0: 1300, Q0: 5e6, per: "a month", ped: 0.4, pes: 0.3 },
  tickets: { name: "Concert tickets", unit: "ticket", P0: 80, Q0: 20000, per: "a concert", ped: 1, pes: 0.05 },
  alcohol: { name: "Cheap alcohol", unit: "unit of alcohol", P0: 0.45, Q0: 2e7, per: "a day", ped: 0.8, pes: 2 },
  wheat: { name: "Wheat", unit: "tonne", P0: 180, Q0: 38000, per: "a day", ped: 0.3, pes: 0.4 },
  power: { name: "Household electricity", unit: "kWh", P0: 0.52, Q0: 2.6e8, per: "a day", ped: 0.2, pes: 1 }
};
// o = { P0, ped, pes, n, t (specific tax £), r (ad valorem rate), s (subsidy £), cap, floor, black, buy }
// what the seller keeps when the consumer pays P, and the consumer price a seller with cost c needs
const keepOf = (P, o) => P / (1 + o.r) - o.t + o.s;
const needOf = (c, o) => (c + o.t - o.s) * (1 + o.r);
// straight-line curves through (P0, half the traders): q is the number of units
const Dq = (P, o) => K.clamp(o.n / 2 * (1 - o.ped * (P / o.P0 - 1)), 0, o.n);      // quantity demanded at consumer price P
const Sq = (k, o) => K.clamp(o.n / 2 * (1 + o.pes * (k / o.P0 - 1)), 0, o.n);      // quantity supplied when sellers keep k
const Dinv = (q, o) => Math.max(0, o.P0 * (1 + (1 - q / (o.n / 2)) / o.ped));        // the value of the q-th unit
const Sinv = (q, o) => Math.max(0, o.P0 * (1 + (q / (o.n / 2) - 1) / o.pes));        // the cost of the q-th unit

class Market {
  constructor(rand, o) {
    this.r = rand; this.o = o; const n = o.n; this.day = 0; this.ref = null; this.history = [];
    this.buyers = []; this.sellers = [];
    for (let i = 0; i < n; i++) { this.buyers.push({ v: Math.max(0.01 * o.P0, Dinv(i + 0.5, o) * (1 + 0.015 * rand.gauss())) }); this.sellers.push({ c: Math.max(0.005 * o.P0, Sinv(i + 0.5, o) * (1 + 0.015 * rand.gauss())) }); }
    this.newDay();
  }
  newDay() {
    const { r, o } = this; this.day++; this.trades = []; this.bm = []; this.gov = 0; this.meetings = 0; this.stale = 0;
    for (const b of this.buyers) { b.done = false; b.price = null; b.got = false; b.bid = this.ref == null ? b.v * (0.55 + 0.3 * r()) : Math.min(b.v, this.ref * (0.9 + 0.08 * r())); }   // open low…
    for (const s of this.sellers) { s.done = false; s.price = null; s.gov = false; const m = needOf(s.c, o); s.ask = this.ref == null ? m * (1.1 + 0.35 * r()) : Math.max(m, this.ref * (1.02 + 0.08 * r())); }   // …and high
  }
  // can any remaining pair still make a legal deal that suits both?
  open() { const o = this.o; let bv = -1, sc = 1e12; for (const b of this.buyers) if (!b.done && b.v > bv) bv = b.v; for (const s of this.sellers) if (!s.done) sc = Math.min(sc, needOf(s.c, o)); return bv >= sc && bv >= o.floor && sc <= o.cap && this.meetings < o.n * 8 && this.stale < o.n * 3 + 6; }
  meet() {
    const { r, o } = this, B = this.buyers.filter(b => !b.done), S = this.sellers.filter(s => !s.done); if (!B.length || !S.length) return null;
    let b = B[r.int(B.length)], s = S[r.int(S.length)];
    if (r() < 0.5) { for (let k = 0; k < 2; k++) { const s2 = S[r.int(S.length)]; if (s2.ask < s.ask) s = s2; } } else { for (let k = 0; k < 2; k++) { const b2 = B[r.int(B.length)]; if (b2.bid > b.bid) b = b2; } }   // people shop around a little
    const need = needOf(s.c, o); this.meetings++; let bid = b.bid, ask = s.ask;
    if (o.cap < ask && o.cap >= need) ask = o.cap;           // the law caps the price: a seller who still covers costs must accept it
    if (o.floor > bid && o.floor <= b.v) bid = o.floor;       // the law sets a minimum price: a keen buyer must pay it
    let deal = bid >= ask, price = null;
    if (deal) { price = K.clamp((bid + ask) / 2, o.floor, o.cap); if (price < need || price > b.v) deal = false; }
    if (deal) { b.done = s.done = b.got = true; b.price = s.price = price; this.trades.push({ price, keep: keepOf(price, o), v: b.v, c: s.c }); this.stale = 0; }
    else { this.stale++; const st = 0.08 * o.P0; b.bid = Math.min(b.v, b.bid + st * r()); s.ask = Math.max(need, s.ask - st * r()); }   // no deal: both give a little ground (steps of the same size)
    return { b, s, deal, price, bid, ask };
  }
  // after legal trading: the black market (resale to keener buyers) and government purchases of a surplus
  afterHours() {
    const { r, o } = this;
    if (o.black && o.cap < 1e11) {
      const want = this.buyers.filter(b => !b.got && b.v > o.cap).sort((a, b) => b.v - a.v), have = this.buyers.filter(b => b.got).sort((a, b) => a.v - b.v);
      for (let i = 0; i < Math.min(want.length, have.length); i++) { const u = want[i], h = have[i]; if (u.v <= h.v) break; if (r() < 0.6) { const p = (u.v + h.v) / 2; this.bm.push({ price: p, from: h.v, to: u.v }); h.got = false; u.got = true; } }
    }
    if (o.buy && o.floor > 0) for (const s of this.sellers) if (!s.done && needOf(s.c, o) <= o.floor) { s.done = s.gov = true; this.gov++; }
  }
  endDay() { this.afterHours(); const st = this.stats(); if (this.trades.length) this.ref = st.price; this.history.push(st); return st; }
  runDay() { while (this.open()) this.meet(); const st = this.endDay(); this.newDay(); return st; }
  stats() {
    const T = this.trades, o = this.o; let cs = 0, ps = 0, tax = 0;
    for (const x of T) { cs += x.v - x.price; ps += x.keep - x.c; tax += x.price - x.keep; }
    for (const x of this.bm) cs += x.to - x.from;                                      // resale moves the good to someone who values it more
    for (const s of this.sellers) if (s.gov) ps += keepOf(o.floor, o) - s.c;
    const govCost = this.gov * o.floor;
    const shortage = o.cap < 1e11 ? this.buyers.filter(b => !b.done && b.v >= o.cap).length : 0, surplus = o.floor > 0 ? this.sellers.filter(s => !s.done && needOf(s.c, o) <= o.floor).length : 0;
    return { day: this.day, q: T.length, price: T.length ? K.mean(T.map(x => x.price)) : NaN, keep: T.length ? K.mean(T.map(x => x.keep)) : NaN, cs, ps, tax, govCost, total: cs + ps + tax - govCost, bmQ: this.bm.length, bmP: this.bm.length ? K.mean(this.bm.map(x => x.price)) : NaN, shortage, surplus, gov: this.gov };
  }
}
// straight-line theory: the consumer price where demand = supply (after the wedge), surpluses and the deadweight loss
function theory(o) {
  let lo = 0, hi = 20 * o.P0; for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (Dq(m, o) > Sq(keepOf(m, o), o)) lo = m; else hi = m; }
  let Pc = (lo + hi) / 2, Q = Dq(Pc, o), note = "", gap = 0, Pbm = NaN;
  if (o.cap < Pc) { const qd = Dq(o.cap, o), qs = Sq(keepOf(o.cap, o), o); Pc = o.cap; Q = Math.min(qd, qs); gap = qd - qs; note = "shortage"; Pbm = Dinv(qs, o); }
  if (o.floor > Pc) { const qd = Dq(o.floor, o), qs = Sq(keepOf(o.floor, o), o); Pc = o.floor; gap = qs - qd; Q = qd; note = "surplus"; }
  const Pk = keepOf(Pc, o), N = 400, area = (f, a, b) => { let s = 0; for (let i = 0; i < N; i++) s += f(a + (b - a) * (i + 0.5) / N) * (b - a) / N; return s; };
  const Q0 = o.n / 2, cs = area(q => Dinv(q, o) - Pc, 0, Q), ps = area(q => Pk - Sinv(q, o), 0, Q), tax = (Pc - Pk) * Q, max = area(q => Dinv(q, o) - Sinv(q, o), 0, Q0);
  const govQ = note === "surplus" && o.buy ? gap : 0, psG = note === "surplus" && o.buy ? area(q => Pk - Sinv(q, o), Q, Q + gap) : 0;
  return { Pc, Pk, Q, Q0, note, gap, Pbm, cs, ps: ps + psG, tax, govCost: govQ * Pc, max, dwl: max - cs - ps - psG - tax + govQ * Pc, share: (Pc - o.P0) / Math.max(1e-9, Pc - Pk) };
}
// headless: the same traders with and without the policy (same random numbers), averaged over a few days
function settle(seed, o, key, warm = 6, days = 5) { const m = new Market(K.rng(seed), o); for (let i = 0; i < warm; i++) m.runDay(); const v = []; for (let i = 0; i < days; i++) { const st = m.runDay(); v.push(key(st, m)); } return K.mean(v.filter(isFinite)); }
const base = (x = {}) => Object.assign({ P0: 1, ped: 1, pes: 1, n: 40, t: 0, r: 0, s: 0, cap: 1e12, floor: 0, black: false, buy: false }, x);

// ---------------- The page ----------------
const P = { product: "coffee", ped: 0.8, pes: 1.5, n: 40, t: 0, r: 0, s: 0, cap: 0, floor: 0, black: false, buy: false };
let mk = null, speed = 2, pause = 0, allTrades = [], days = [];
const pr = () => PRODUCTS[P.product];
const opts = () => ({ P0: pr().P0, ped: P.ped, pes: P.pes, n: P.n, t: P.t, r: P.r, s: P.s, cap: P.cap > 0 ? P.cap : 1e12, floor: P.floor, black: P.black, buy: P.buy });
const money = v => !isFinite(v) ? "–" : pr().P0 < 5 ? (Math.abs(v) < 1 ? (v * 100).toFixed(1) + "p" : "£" + v.toFixed(2)) : "£" + v.toFixed(0);
const realQ = q => q * pr().Q0 / (P.n / 2);
const bigMoney = v => { const a = Math.abs(v); return (v < 0 ? "−" : "") + (a >= 1e9 ? "£" + (a / 1e9).toFixed(2) + " billion" : a >= 1e6 ? "£" + (a / 1e6).toFixed(1) + " million" : a >= 1e3 ? "£" + (a / 1e3).toFixed(0) + " thousand" : "£" + a.toFixed(0)); };
const bigQ = q => { const a = realQ(q); return (a >= 1e6 ? (a / 1e6).toFixed(1) + " million" : a >= 1e3 ? (a / 1e3).toFixed(0) + " thousand" : a.toFixed(0)) + " " + pr().unit + "s"; };
const ui = K.app({
  title: "Taxes, Subsidies and Price Controls", subject: "Economics",
  blurb: "Indirect taxes, subsidies, maximum and minimum prices in a market of real traders: who pays, shortages, surpluses and deadweight loss",
  reset: () => set({}),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "Edexcel International GCSE Economics (4EC1) 1.2.4–1.2.5 and 2.1: indirect taxes (specific and ad valorem), subsidies, maximum and minimum prices, the effect on price and quantity, who bears the tax, shortages and surpluses.", adv: "Edexcel A level Economics A (9EC0) Theme 1, 1.2.9 and 1.4.1: the incidence of indirect taxes and subsidies (PED and PES), consumer and producer surplus, deadweight loss, maximum and minimum prices, government failure (rent control, buffer stocks)." } },
  missions: [
    { title: "Who pays a tax?", q: "Put a 50p tax on each cup of coffee. Before running: will the price rise by 50p, 0p or something between? Watch the traders.", hint: "Between: here consumers pay about two-thirds and the coffee shops about a third. The tax drives a wedge between the price consumers pay and what sellers keep; fewer cups are sold.", setup() { set({ product: "coffee", t: 0.5 }); } },
    { title: "Fuel duty and VAT", q: "UK petrol: duty 52.95p a litre plus 20% VAT on top (2025). How much of the pump price is tax? Who bears most of it?", hint: "About 60% of the pump price is tax. Demand for petrol is inelastic (|PED| ≈ 0.3), so drivers bear most of it and the quantity hardly falls: one reason fuel is taxed so heavily.", setup() { set({ product: "petrol", t: 0.5295, r: 0.2 }); } },
    { title: "The sugar levy", q: "The Soft Drinks Industry Levy (2018) is 24p a litre for drinks with 8 g or more sugar per 100 ml. What happens to the quantity bought?", hint: "Demand for sugary drinks is fairly elastic (many substitutes), so the quantity falls a lot: that was the aim. In practice firms cut the sugar: average sugar in soft drinks fell 44% between 2015 and 2019 (Public Health England).", setup() { set({ product: "drinks", t: 0.24 }); } },
    { title: "VAT: an ad valorem tax", q: "Set VAT at 20% on coffee. How is it different from a specific tax?", hint: "An ad valorem tax is a percentage of the price, so the supply curve pivots (the gap grows with price) instead of shifting parallel. VAT has been 20% in the UK since January 2011.", setup() { set({ product: "coffee", r: 0.2 }); } },
    { title: "Energy Price Guarantee", q: "In October 2022 the government paid part of every household's electricity bill (about 18p a kWh). Who gained, and what did it cost?", hint: "Consumers pay much less; with inelastic demand most of the subsidy goes to them, and consumption rises a little. The cost is the subsidy × quantity: tens of millions of pounds a day for electricity alone.", setup() { set({ product: "power", s: 0.18 }); } },
    { title: "Rent control", q: "Cap rents at £1,000 a month. How many people who want a flat at that rent cannot get one? Who gets the flats?", hint: "A maximum price below equilibrium: more people want flats, fewer are offered, so there is a shortage. Who gets one is down to luck (or connections), not who values it most.", setup() { set({ product: "flats", cap: 1000 }); } },
    { title: "Ticket touts", q: "Concert tickets are sold at £50 (below what fans would pay) and touts can resell them. What price do touts' tickets sell for?", hint: "A shortage at £50, and a black market: tickets end up with keener fans at a much higher price. The theory black-market price is what buyers would pay for the number of tickets available.", setup() { set({ product: "tickets", cap: 50, black: true }); } },
    { title: "Minimum unit pricing", q: "Scotland has a minimum price of 65p per unit of alcohol (from 2024). Who is affected? What happens to the amount bought?", hint: "A minimum price above the free-market price of cheap alcohol: drinkers of cheap, strong drinks pay more and buy less. Unlike a tax, the extra money goes to sellers, not the government.", setup() { set({ product: "alcohol", floor: 0.65 }); } },
    { lvl: "adv", title: "Farm price support", q: "Set a minimum price for wheat of £220 a tonne and let the government buy the surplus. What does it cost, and what happens to the stock?", hint: "Farmers sell more than consumers want; the government must buy the surplus and store or destroy it (the EU's 'grain mountains'). Cost = minimum price × surplus, every day: a government failure.", setup() { set({ product: "wheat", floor: 220, buy: true }); } },
    { lvl: "adv", title: "Incidence and elasticity", q: "Put a £1 tax on cigarettes. Check that consumers' share = PES ÷ (PES + |PED|). Then make supply very inelastic.", hint: "With |PED| 0.4 and PES 2, consumers pay 2 ÷ 2.4 = 83%. When supply is inelastic, sellers cannot escape and bear most of the tax. Whichever side is less able to walk away pays more.", setup() { set({ product: "cigs", t: 1 }); } },
    { lvl: "adv", title: "Deadweight loss", q: "Double the coffee tax from 50p to £1. What happens to the deadweight loss?", hint: "It roughly quadruples: the triangle grows with the square of the tax (½ × tax × fall in quantity, and the fall is proportional to the tax).", setup() { set({ product: "coffee", t: 1 }); } }
  ],
  batch: [
    { title: "Who pays? It depends on PED", question: "How does consumers' share of a tax change with the price elasticity of demand?", how: "A tax of 30% of the free-market price; PES 1; 60 traders each side; the same traders with and without the tax (8 days each after settling). Share = rise in consumer price ÷ tax.", xLabel: "|PED|", yLabel: "consumers' share of the tax (%)", xs: [0.2, 0.5, 1, 2, 5], reps: 6, yMin: 0, yMax: 100, theory: d => 100 / (1 + d), theoryLabel: "PES ÷ (PES + |PED|)", run: (x, r) => { const seed = Math.floor(r() * 1e9), o = base({ ped: x, n: 60 }), p0 = settle(seed, o, s => s.price, 8, 8), p1 = settle(seed, Object.assign({}, o, { t: 0.3 }), s => s.price, 8, 8); return (p1 - p0) / 0.3 * 100; }, note: "The more elastic the demand, the less of the tax consumers pay: they can walk away, so sellers must absorb it." },
    { title: "Who pays? It depends on PES", question: "How does consumers' share of a tax change with the price elasticity of supply?", how: "As above with |PED| 1, sweeping PES.", xLabel: "PES", yLabel: "consumers' share of the tax (%)", xs: [0.2, 0.5, 1, 2, 5], reps: 6, yMin: 0, yMax: 100, theory: e => 100 * e / (e + 1), theoryLabel: "PES ÷ (PES + |PED|)", run: (x, r) => { const seed = Math.floor(r() * 1e9), o = base({ pes: x, n: 60 }), p0 = settle(seed, o, s => s.price, 8, 8), p1 = settle(seed, Object.assign({}, o, { t: 0.3 }), s => s.price, 8, 8); return (p1 - p0) / 0.3 * 100; }, note: "Elastic supply passes most of the tax on to consumers; inelastic supply (a fixed number of seats, flats or acres) means sellers bear it." },
    { title: "Does a higher tax always raise more?", question: "How does tax revenue change as the tax per unit rises, with elastic demand?", how: "|PED| 3, PES 1; revenue per day from the traders (units × tax).", xLabel: "tax (% of the free-market price)", yLabel: "tax revenue per day (£, model units)", xs: [0, 10, 20, 30, 40, 50, 60, 70], reps: 4, yMin: 0, theory: x => { const t = theory(base({ ped: 3, t: x / 100 })); return t.tax; }, theoryLabel: "straight-line theory", run: (x, r) => settle(Math.floor(r() * 1e9), base({ ped: 3, t: x / 100 }), s => s.tax), note: "Revenue rises, peaks and falls: a high tax shrinks the market so much that it raises less. Governments use elasticities to set tax rates." },
    { title: "Deadweight loss and the size of the tax", question: "Does doubling a tax double the deadweight loss?", how: "|PED| 1, PES 1, 60 traders; the same traders with and without the tax; deadweight loss = the gains from trade (value − cost) of the units no longer traded (the measured fall in quantity, at the margin).", xLabel: "tax (% of the free-market price)", yLabel: "deadweight loss per day (£, model units)", xs: [0, 10, 20, 30, 40, 50], reps: 5, yMin: 0, theory: x => theory(base({ n: 60, t: x / 100 })).dwl, theoryLabel: "triangle ½ × t × ΔQ", run: (x, r) => { const seed = Math.floor(r() * 1e9), o = base({ n: 60 }), m = new Market(K.rng(seed), o), dq = settle(seed, o, st => st.q, 8, 8) - settle(seed, Object.assign({}, o, { t: x / 100 }), st => st.q, 8, 8);
      const D = m.buyers.map(b => b.v).sort((a, b) => b - a), S = m.sellers.map(q => q.c).sort((a, b) => a - b); let q0 = 0; while (q0 < D.length && D[q0] >= S[q0]) q0++; let L = 0; for (let k = q0 - 1; k >= 0 && k >= q0 - dq; k--) L += (D[k] - S[k]) * Math.min(1, k - (q0 - dq) + 1); return L; }, note: "The loss grows roughly with the square of the tax: doubling the tax about quadruples it. Every unit lost was worth more to a buyer than it cost a seller to make: nobody gets that value, not even the government." },
    { title: "Maximum price: how big is the shortage?", question: "How does the shortage under a maximum price depend on how far below equilibrium it is set?", how: "|PED| 1, PES 1, 40 traders; shortage = buyers willing to pay the maximum price who got nothing.", xLabel: "maximum price (% of the free-market price)", yLabel: "shortage (units per day)", xs: [50, 60, 70, 80, 90, 100, 110], reps: 5, yMin: 0, theory: x => Math.max(0, theory(base({ cap: x / 100 })).gap), theoryLabel: "Qd − Qs", run: (x, r) => settle(Math.floor(r() * 1e9), base({ cap: x / 100 }), s => s.shortage), note: "The further below equilibrium, the bigger the shortage; above equilibrium the maximum price does nothing (it is not binding)." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4EC1 1.2.5", text: "An indirect tax is paid to the government by sellers: specific (a fixed amount per unit, e.g. fuel duty) or ad valorem (a percentage of the price, e.g. VAT at 20%). Supply shifts up (left) by the tax." },
      { lvl: "std", tag: "4EC1 1.2.5", text: "The price consumers pay rises by less than the tax (unless demand is perfectly inelastic): consumers and producers share the burden. Tax revenue = tax per unit × quantity." },
      { lvl: "std", tag: "4EC1 1.2.5", text: "A subsidy is paid by the government to producers: supply shifts down (right), the price falls and the quantity rises. Cost to the government = subsidy per unit × quantity." },
      { lvl: "std", tag: "4EC1 2.1", text: "A maximum price below equilibrium causes a shortage (excess demand): queues, waiting lists, black markets. A minimum price above equilibrium causes a surplus (excess supply)." },
      { lvl: "adv", tag: "9EC0 1.2.9", text: "Incidence: consumers' share of a specific tax = PES ÷ (PES + |PED|) on straight lines. The more inelastic side bears more of the tax." },
      { lvl: "adv", tag: "9EC0 1.2.9", text: "Deadweight loss = ½ × tax × fall in quantity: gains from trade that no longer happen, collected by nobody. It grows with the square of the tax." },
      { lvl: "adv", tag: "9EC0 1.4.1", text: "Government failure: rent controls shrink the supply of rented homes in the long run (supply is more elastic); minimum prices with buffer stocks are expensive and wasteful." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: () => { const th = theory(opts()); return `On screen, the tax is ${money(th.Pc - th.Pk)} per ${pr().unit} and ${bigQ(th.Q)} are sold ${pr().per}. Calculate the tax revenue.`; }, ans: () => { const th = theory(opts()); return `<ul><li>revenue = tax per unit × quantity</li><li>= ${money(th.Pc - th.Pk)} × ${bigQ(th.Q)} = ${bigMoney((th.Pc - th.Pk) * realQ(th.Q))} ${pr().per}</li></ul>`; } },
      { lvl: "std", marks: 3, q: "Explain, using a diagram, the effect of a specific tax on the price and quantity of cigarettes.", ans: "<ul><li>supply shifts up by the tax (parallel, a vertical distance equal to the tax)</li><li>price rises by less than the tax; quantity falls a little (demand is inelastic)</li><li>consumers bear most of the tax; producers keep the price minus the tax</li></ul>" },
      { lvl: "std", marks: 2, q: "Explain one disadvantage of a maximum price on rented flats.", ans: "<ul><li>quantity supplied falls below quantity demanded: a shortage</li><li>people who value flats most may not get one (queues, discrimination, black-market side payments)</li></ul>" },
      { lvl: "adv", marks: 3, q: "A tax of £1 per pack is placed on cigarettes. |PED| = 0.4 and PES = 2. Calculate how much of the tax consumers pay and explain why.", ans: "<ul><li>consumers' share = PES ÷ (PES + |PED|) = 2 ÷ 2.4 = 0.83</li><li>consumers pay about 83p, producers about 17p</li><li>demand is much less elastic than supply, so consumers cannot avoid the higher price</li></ul>" },
      { lvl: "adv", marks: 4, q: "Evaluate the use of a minimum price with government buying of the surplus to support farmers' incomes.", ans: "<ul><li>farmers' incomes rise and become stable; food security</li><li>but a surplus must be bought, stored or destroyed: high cost to taxpayers, opportunity cost</li><li>consumers pay more; resources misallocated (overproduction); dumping abroad harms other farmers</li><li>judgement: direct income support or insurance may be cheaper and cause less distortion</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li>40 buyers with private values and 40 sellers with private costs, placed on straight-line curves through the free-market price with the chosen PED and PES (plus a little individuality). Each trader buys or sells one unit per period; each unit stands for many real units of the product.</li>
<li>Haggling as in <i>The Trading Pit</i>: random meetings, shopping around, bids rising and asks falling after failed meetings; each day opens near yesterday's average price.</li>
<li>Taxes and subsidies: a seller keeps P ÷ (1 + VAT rate) − specific tax + subsidy. Maximum and minimum prices make deals outside the limit illegal.</li>
<li>Black market (optional): after legal trading, a buyer who could not buy can buy from a buyer who did but values the good less, at a price halfway between their values (60% chance each).</li>
<li>Government purchases (optional): under a minimum price, unsold sellers who would sell at that price sell to the government. Its stock is counted as worth nothing to consumers.</li>
<li>Theory lines are the straight-line demand and supply; consumers' share of a tax = rise in consumer price ÷ (consumer price − sellers' price). Surpluses and the deadweight loss are areas under the straight lines (best case, in which the keenest buyers are served).</li></ul>
<h3>Left out</h3>
<ul><li>Shops' stocks, branding and the long run (more sellers enter or leave); collection costs and tax avoidance; how firms change the product (as with the sugar levy); the real UK elasticities, which are illustrative values in the range of published estimates.</li></ul>
<p>The earlier version of this simulation, with its worksheets, is kept in <a href="original/taxes-price-controls.html">original/taxes-price-controls.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("The market");
ctl.product = K.seg(g, { value: "coffee", options: Object.entries(PRODUCTS).map(([k, v]) => [k, v.name]), on: v => set({ product: v }) });
ctl.ped = K.slider(g, { label: "Price elasticity of demand |PED|", min: 0.1, max: 5, step: 0.05, value: 0.8, fmt: v => v.toFixed(2) + (v < 1 ? " (inelastic)" : v > 1 ? " (elastic)" : " (unit)"), on: v => { P.ped = v; restart(); } });
ctl.pes = K.slider(g, { label: "Price elasticity of supply PES", min: 0.05, max: 5, step: 0.05, value: 1.5, fmt: v => v.toFixed(2) + (v < 1 ? " (inelastic)" : v > 1 ? " (elastic)" : " (unit)"), on: v => { P.pes = v; restart(); } });
ctl.n = K.slider(g, { label: "Traders on each side", min: 10, max: 80, step: 2, value: 40, on: v => { P.n = v; restart(); } });
g = ui.group("Taxes and subsidies");
const pct = (v, f) => f(v / 100 * pr().P0);
ctl.t = K.slider(g, { label: "Specific tax per unit", min: 0, max: 150, step: 0.05, value: 0, fmt: v => v ? pct(v, money) : "none", on: v => { P.t = v / 100 * pr().P0; apply(); } });
ctl.r = K.slider(g, { label: "Ad valorem tax (VAT)", min: 0, max: 100, step: 1, value: 0, fmt: v => v ? v + "%" : "none", on: v => { P.r = v / 100; apply(); } });
ctl.s = K.slider(g, { label: "Subsidy per unit", min: 0, max: 80, step: 0.05, value: 0, fmt: v => v ? pct(v, money) : "none", on: v => { P.s = v / 100 * pr().P0; apply(); } });
g = ui.group("Price controls");
ctl.cap = K.slider(g, { label: "Maximum price", min: 30, max: 160, step: 0.5, value: 160, fmt: v => v >= 160 ? "none" : pct(v, money), on: v => { P.cap = v >= 160 ? 0 : v / 100 * pr().P0; apply(); } });
ctl.floor = K.slider(g, { label: "Minimum price", min: 0, max: 200, step: 0.5, value: 0, fmt: v => v ? pct(v, money) : "none", on: v => { P.floor = v / 100 * pr().P0; apply(); } });
ctl.black = K.toggle(g, { label: "Black market (resale)", value: false, on: v => { P.black = v; apply(); } });
ctl.buy = K.toggle(g, { label: "Government buys the surplus", value: false, on: v => { P.buy = v; apply(); } });
g = ui.group("Run");
ctl.speed = K.slider(g, { label: "Speed", min: 1, max: 6, step: 1, value: 2, fmt: v => v < 6 ? v + "×" : "a day per blink", on: v => speed = v });
let rr = K.row(g); K.btn(rr, "⏭ End the day", () => { while (mk.open()) mk.meet(); finishDay(); }); K.btn(rr, "↺ New traders", () => restart());
const read = K.readout(ui.group("Readings"), [["pc", "price consumers pay"], ["pk", "price sellers keep"], ["q", "quantity sold"], ["share", "who pays the tax"], ["rev", "tax revenue / subsidy cost"], ["ctl", "shortage or surplus"], ["wel", "consumer · producer surplus · deadweight loss"]]);
function set(o) {
  Object.assign(P, { product: o.product || "coffee", t: 0, r: 0, s: 0, cap: 0, floor: 0, black: false, buy: false, n: 40 }, o);
  const d = pr(); P.ped = o.ped || d.ped; P.pes = o.pes || d.pes;
  ctl.product.set(P.product); ctl.ped.set(P.ped); ctl.pes.set(P.pes); ctl.n.set(P.n);
  ctl.t.set(P.t / d.P0 * 100); ctl.r.set(P.r * 100); ctl.s.set(P.s / d.P0 * 100); ctl.cap.set(P.cap ? P.cap / d.P0 * 100 : 160); ctl.floor.set(P.floor / d.P0 * 100); ctl.black.set(P.black); ctl.buy.set(P.buy);
  restart();
}
function restart() { mk = new Market(K.rng(Date.now() % 1e9), opts()); allTrades = []; days = []; pause = 0; }
function apply() { if (!mk) return; Object.assign(mk.o, opts()); }
function finishDay() { const st = mk.endDay(); days.push(st); pause = speed >= 6 ? 0 : 0.9; }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h, o = mk.o, th = theory(o), adv = ui.level === "adv"; c.fillStyle = "#0a1020"; c.fillRect(0, 0, w, h);
  // ---- the trading floor (left): buyers and sellers sorted by value and cost
  const FW = w * 0.34, n = o.n, cols = Math.ceil(n / 4), dx = (FW - 30) / cols;
  TX(c, "BUYERS", 14, 20, "#5ad1ff", "left", "600 11.5px"); TX(c, "SELLERS", 14, h / 2 + 30, "#ffb454", "left", "600 11.5px");
  const dot = (a, i, top, col) => { const row = Math.floor(i / cols), x = 22 + dx * (i % cols + 0.5), y = (top ? 40 : h / 2 + 50) + row * 28; c.globalAlpha = a.done || a.got ? 1 : 0.35; c.fillStyle = col; c.beginPath(); c.arc(x, y, 7, 0, 6.3); c.fill(); c.globalAlpha = 1;
    if (top && !a.got && a.v >= Math.max(o.cap < 1e11 ? o.cap : 0, 0) && o.cap < 1e11 && pause > 0) { c.strokeStyle = "#ff6b81"; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 10, 0, 6.3); c.stroke(); c.lineWidth = 1; }
    if (!top && a.gov) { c.strokeStyle = "#c9a0ff"; c.lineWidth = 2; c.strokeRect(x - 9, y - 9, 18, 18); c.lineWidth = 1; }
    if (!top && !a.done && o.floor > 0 && needOf(a.c, o) <= o.floor && pause > 0) { c.strokeStyle = "#7ee787"; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 10, 0, 6.3); c.stroke(); c.lineWidth = 1; } };
  mk.buyers.forEach((b, i) => dot(b, i, true, "#5ad1ff")); mk.sellers.forEach((s, i) => dot(s, i, false, "#ffb454"));
  TX(c, `Day ${mk.day} · ${mk.trades.length} deals${mk.bm.length ? ` · ${mk.bm.length} resold on the black market` : ""}${mk.gov ? ` · government bought ${mk.gov}` : ""}`, 14, h / 2 + 4, "#cfd8ea", "left", "12px");
  TX(c, "bright = traded today · red ring = wanted to buy, got nothing · green ring = unsold · purple box = sold to the government", 14, h - 10, "#7d8aa5", "left", "10px");
  // ---- the diagram (right)
  const gx0 = FW + 60, gx1 = w - 20, gy0 = 26, gy1 = h - 46, PM = Math.max(o.P0 * 2.2, th.Pc * 1.35, o.floor * 1.2, needOf(Sinv(o.n * 0.6, o), o) * 1.1), QM = n, X = q => gx0 + q / QM * (gx1 - gx0), Y = p => gy1 - Math.min(p, PM) / PM * (gy1 - gy0);
  c.strokeStyle = "#1f2c47"; c.font = "11px Segoe UI,sans-serif";
  for (let k = 0; k <= 4; k++) { const p = PM * k / 4; c.beginPath(); c.moveTo(gx0, Y(p)); c.lineTo(gx1, Y(p)); c.stroke(); TX(c, money(p), gx0 - 6, Y(p) + 4, "#8fa0bf", "right", "11px"); }
  TX(c, `quantity (${pr().unit}s ${pr().per})`, (gx0 + gx1) / 2, gy1 + 32, "#8fa0bf", "center", "11px"); for (let k = 0; k <= 4; k++) TX(c, bigQ(QM * k / 4).replace(" " + pr().unit + "s", ""), X(QM * k / 4), gy1 + 15, "#8fa0bf", "center", "10.5px");
  const fillQ = (q0, q1, top, bot, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(X(q0), Y(top(q0))); for (let k = 1; k <= 30; k++) { const q = q0 + (q1 - q0) * k / 30; c.lineTo(X(q), Y(top(q))); } for (let k = 30; k >= 0; k--) { const q = q0 + (q1 - q0) * k / 30; c.lineTo(X(q), Y(bot(q))); } c.fill(); };
  const Pc = th.Pc, Pk = th.Pk, Q = th.Q;
  if (adv) { fillQ(0, Q, q => Dinv(q, o), () => Pc, "rgba(90,209,255,.18)"); fillQ(0, Q, () => Pk, q => Sinv(q, o), "rgba(255,180,84,.18)"); }
  if (Math.abs(Pc - Pk) > 1e-9 && Q > 0) { c.fillStyle = Pc > Pk ? "rgba(196,161,255,.32)" : "rgba(255,107,129,.25)"; c.fillRect(X(0), Y(Math.max(Pc, Pk)), X(Q) - X(0), Y(Math.min(Pc, Pk)) - Y(Math.max(Pc, Pk))); }
  if (adv && th.dwl > 0.01 * th.max) { if (Q < th.Q0) fillQ(Q, th.Q0, q => Dinv(q, o), q => Sinv(q, o), "rgba(160,170,190,.35)"); else fillQ(th.Q0, Q, q => Sinv(q, o), q => Dinv(q, o), "rgba(160,170,190,.35)"); }
  // curves: demand, supply with no tax (dashed) and with the wedge (what consumers must pay)
  const line = (f, col, dash, wd = 2.5) => { c.strokeStyle = col; c.lineWidth = wd; c.setLineDash(dash || []); c.beginPath(); for (let k = 0; k <= 60; k++) { const q = QM * k / 60, y = Y(f(q)); k ? c.lineTo(X(q), y) : c.moveTo(X(q), y); } c.stroke(); c.setLineDash([]); c.lineWidth = 1; };
  const wedge = o.t || o.r || o.s; line(q => Dinv(q, o), "#5ad1ff"); line(q => Sinv(q, o), "#ffb454", wedge ? [6, 4] : null, wedge ? 1.5 : 2.5); if (wedge) line(q => needOf(Sinv(q, o), o), "#ffb454");
  TX(c, "D", X(QM * 0.04), Y(Dinv(QM * 0.04, o)) - 6, "#5ad1ff", "left", "600 13px"); TX(c, wedge ? (o.s > o.t && !o.r ? "S + subsidy" : "S + tax") : "S", X(QM * 0.93), Y(needOf(Sinv(QM * 0.93, o), o)) - 8, "#ffb454", "right", "600 13px"); if (wedge) TX(c, "S (no tax)", X(QM * 0.97), Y(Sinv(QM * 0.97, o)) + 14, "#ffb454", "right", "11px");
  const hl = (p, col, txt, dash = [7, 4]) => { c.strokeStyle = col; c.lineWidth = 1.5; c.setLineDash(dash); c.beginPath(); c.moveTo(gx0, Y(p)); c.lineTo(gx1, Y(p)); c.stroke(); c.setLineDash([]); c.lineWidth = 1; TX(c, txt, gx1 - 4, Y(p) - 5, col, "right", "600 11px"); };
  if (o.cap < 1e11) hl(o.cap, "#ff6b81", `maximum price ${money(o.cap)}${th.note === "shortage" ? ` · shortage ${bigQ(th.gap)}` : " · not binding"}`);
  if (o.floor > 0) hl(o.floor, "#7ee787", `minimum price ${money(o.floor)}${th.note === "surplus" ? ` · surplus ${bigQ(th.gap)}` : " · not binding"}`);
  if (th.note === "shortage" && o.black) hl(th.Pbm, "#c9a0ff", `black-market price ≈ ${money(th.Pbm)}`, [2, 3]);
  // free-market point and the new outcome
  c.fillStyle = "#fff"; c.beginPath(); c.arc(X(th.Q0), Y(o.P0), 4, 0, 6.3); c.fill(); TX(c, "free market", X(th.Q0) + 7, Y(o.P0) + 14, "#cfd8ea", "left", "10.5px");
  if (wedge || th.note) { c.strokeStyle = "rgba(255,255,255,.6)"; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(gx0, Y(Pc)); c.lineTo(X(Q), Y(Pc)); c.lineTo(X(Q), gy1); c.stroke(); c.beginPath(); c.moveTo(gx0, Y(Pk)); c.lineTo(X(Q), Y(Pk)); c.stroke(); c.setLineDash([]);
    TX(c, "consumers pay " + money(Pc), gx0 + 4, Y(Pc) - 4, "#5ad1ff", "left", "600 11px"); if (Math.abs(Pc - Pk) > 1e-9) TX(c, "sellers keep " + money(Pk), gx0 + 4, Y(Pk) + 13, "#ffb454", "left", "600 11px"); }
  mk.trades.forEach((t, k) => { c.fillStyle = "#fff"; c.strokeStyle = "#0a1020"; c.lineWidth = 1.5; c.beginPath(); c.arc(X(k + 0.5), Y(t.price), 3.8, 0, 6.3); c.fill(); c.stroke(); c.lineWidth = 1; });
  // key
  let ky = gy1 - 8 - 15 * (adv ? 4 : wedge ? 1 : 0); const kx = gx1 - 150; const key = [["rgba(196,161,255,.7)", (o.s > o.t + 1e-9 && !o.r) ? "subsidy cost" : "tax revenue"], ...(adv ? [["rgba(90,209,255,.6)", "consumer surplus"], ["rgba(255,180,84,.6)", "producer surplus"], ["rgba(160,170,190,.7)", "deadweight loss"]] : []), ["#fff", "● today's deals"]];
  for (const [col, txt] of key) { if (!wedge && txt.startsWith("tax")) continue; c.fillStyle = col; if (txt[0] !== "●") c.fillRect(kx, ky - 8, 10, 10); TX(c, txt, txt[0] === "●" ? kx : kx + 15, ky + 1, "#dfe8f7", "left", "11px"); ky += 15; }
}

// ---------------- Charts and readings ----------------
function charts() {
  const o = mk.o, th = theory(o), adv = ui.level === "adv", st = mk.stats(), last = days[days.length - 1] || st;
  chA.opts.title = "Prices in every deal"; chA.opts.xLabel = "day"; chA.opts.yLabel = "price (£)"; chA.opts.yFmt = v => money(v);
  chA.draw([{ pts: allTrades, type: "dots", r: 2, color: "#cfd8ea", label: "consumers paid" }, { pts: days.map(d => [d.day + 0.5, d.price]), color: "#5ad1ff", label: "average paid" }, { pts: days.map(d => [d.day + 0.5, d.keep]), color: "#ffb454", label: "sellers kept" }], { xMin: Math.max(1, mk.day - 20), xMax: mk.day + 1, yMin: 0, hlines: [{ y: th.Pc, label: "theory", color: "#7fe3a0" }, { y: o.P0, label: "free market", color: "#56607a" }] });
  const wedgeT = th.Pc - th.Pk, meas = isFinite(last.price) && Math.abs(wedgeT) > 1e-9 && !th.note ? K.clamp((last.price - o.P0) / (last.price - last.keep) * 100, 0, 100) : NaN;
  chB.opts.title = "Who pays the tax?"; chB.opts.xLabel = ""; chB.opts.yLabel = "share of the tax (%)"; chB.opts.xFmt = whole(v => ["", "theory", "measured", adv ? "PES ÷ (PES + |PED|)" : ""][v] || "");
  const thS = Math.abs(wedgeT) > 1e-9 && !th.note ? th.share * 100 : NaN, fS = 100 * o.pes / (o.pes + o.ped);
  const vals = [[1, thS], [2, meas], ...(adv && isFinite(thS) ? [[3, fS]] : [])].filter(p => isFinite(p[1]));
  chB.draw([{ pts: vals.map(([x, y]) => [x - 0.17, y]), type: "bars", w: 0.32, color: "#5ad1ff", label: "consumers" }, { pts: vals.map(([x, y]) => [x + 0.17, 100 - y]), type: "bars", w: 0.32, color: "#ffb454", label: "producers" }], { xMin: 0.4, xMax: adv ? 3.6 : 2.6, yMin: 0, yMax: 100 });
  const tax = th.Pc - th.Pk;
  read.set("pc", `${money(th.Pc)} (today ${money(last.price)})`); read.set("pk", `${money(th.Pk)} (today ${money(last.keep)})`);
  read.set("q", `${bigQ(th.Q)} ${pr().per} (free market ${bigQ(th.Q0)})`);
  read.set("share", Math.abs(tax) > 1e-9 && !th.note ? `consumers ${(th.share * 100).toFixed(0)}%, producers ${(100 - th.share * 100).toFixed(0)}% (today ${isFinite(meas) ? meas.toFixed(0) + "%" : "–"} consumers)` : "no tax");
  read.set("rev", Math.abs(tax) > 1e-9 ? `${tax > 0 ? "revenue" : "subsidy cost"} ${bigMoney(Math.abs(tax) * realQ(th.Q))} ${pr().per}` : th.govCost ? `buying the surplus costs ${bigMoney(th.govCost * realQ(1))} ${pr().per}` : "–");
  read.set("ctl", th.note ? `${th.note}: ${bigQ(th.gap)} (today ${th.note === "shortage" ? last.shortage : last.surplus} traders)${o.black && last.bmQ ? `; black market ${money(last.bmP)}` : ""}` : "none");
  const sc = realQ(1); read.set("wel", adv ? `${bigMoney(th.cs * sc)} · ${bigMoney(th.ps * sc)} · ${bigMoney(Math.max(0, th.dwl) * sc)} ${pr().per}` : "(Advanced level)");
  ui.hud(th.note === "shortage" ? "Maximum price below equilibrium: a shortage" : th.note === "surplus" ? "Minimum price above equilibrium: a surplus" : Math.abs(tax) > 1e-9 ? (tax > 0 ? "The tax drives a wedge between what consumers pay and what sellers keep" : "The subsidy lowers the price consumers pay") : "Buyers and sellers haggle; the price settles where demand meets supply");
}

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => {
  if (!(dt > 0)) return;
  if (pause > 0) { pause -= dt * Math.max(1, speed / 2); if (pause <= 0) mk.newDay(); return; }
  if (speed >= 6) { while (mk.open()) { const ev = mk.meet(); if (ev && ev.deal) allTrades.push([mk.day + mk.trades.length / (mk.o.n + 1), ev.price]); } finishDay(); mk.newDay(); return; }
  let k = Math.max(1, Math.round(speed * speed * dt * 12)); while (k-- > 0 && mk.open()) { const ev = mk.meet(); if (ev && ev.deal) allTrades.push([mk.day + mk.trades.length / (mk.o.n + 1), ev.price]); }
  if (!mk.open()) finishDay();
  if (allTrades.length > 2500) allTrades.splice(0, 500);
}, () => { draw(); if (frame++ % 5 === 0) charts(); });
set({});
ui.tip("Blue buyers and orange sellers haggle; each deal is a white dot on the diagram. Add a tax and watch the wedge open.", 7000);
