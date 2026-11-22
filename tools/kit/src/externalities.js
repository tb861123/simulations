/* =====================================================================
   MARKET FAILURE AND EXTERNALITIES
   A market weighs only the PRIVATE benefits to buyers and the PRIVATE
   costs to sellers. An EXTERNALITY is a cost or benefit to someone
   else (a "third party") who is not part of the deal:
       social cost    = private cost + external cost      (MSC = MPC + MEC)
       social benefit = private benefit + external benefit (MSB = MPB + MEB)
   Left alone, a market makes too much of things with external costs and
   too little of things with external benefits. Four views:
     * Externalities: 40 buyers and 40 sellers trade; every unit sold
       sends a cost (or a benefit) to the people downstream
     * Cap and trade: firms with different costs of cutting pollution
       buy and sell permits
     * Public goods: households decide whether to pay for street lights
     * The market for lemons (A level): when buyers cannot see quality
   ===================================================================== */

// ---- 1. A market with an externality ----
// Demand (private benefit) P = 200 − 5Q, supply (private cost) P = 5Q: the free market makes 20 a day at £100.
const PROD = {
  chem: { name: "Chemicals (river pollution)", ext: -40, side: "prod", unit: "tonnes of chemicals", icon: "🏭", third: "the town downstream", gap: 0 },
  drinks: { name: "Sugary drinks", ext: -40, side: "cons", unit: "crates of drinks", icon: "🥤", third: "the NHS (taxpayers)", gap: 30 },
  bags: { name: "Plastic bags", ext: -30, side: "cons", unit: "thousand bags", icon: "🛍", third: "wildlife and the sea", gap: 0 },
  flu: { name: "Flu jabs", ext: 30, side: "cons", unit: "hundred jabs", icon: "💉", third: "people who catch less flu", gap: -20 },
  train: { name: "Apprenticeship training", ext: 24, side: "prod", unit: "apprentices", icon: "🧑‍🔧", third: "other firms who hire them later", gap: 0 }
};
const N = 40, val = i => 200 - 5 * (i + 0.5), cost = j => 5 * (j + 0.5);
/* One day of trading. o = { prod, tax, sub, cap, info (share of the information gap closed, 0–1) }
   Each morning every buyer says the most they will pay and every seller the least they will accept: their value or cost,
   give or take a little (mood, news, guesswork: ±£8). The market finds the price at which the number of buyers still
   willing equals the number of sellers still willing, and those pairs trade (a "call market", like an opening auction).
   Returns the trades and the day's quantity, external effect and welfare loss compared with the social optimum. */
function day(o, r) {
  const p = PROD[o.prod], gap = p.gap * (1 - (o.info || 0));       // perceived benefit = true benefit + gap (people misjudge harm or benefit)
  const B = Array.from({ length: N }, (_, i) => ({ v: val(i) + gap + 8 * r.gauss(), tv: val(i) })).sort((x, y) => y.v - x.v);
  const S = Array.from({ length: N }, (_, j) => ({ c: cost(j) + (o.tax || 0) - (o.sub || 0) + 8 * r.gauss(), tc: cost(j) })).sort((x, y) => x.c - y.c);
  let q = 0; while (q < N && q < (o.cap == null ? N : o.cap) && B[q].v >= S[q].c) q++;
  const price = q ? K.clamp((B[q - 1].v + S[q - 1].c) / 2, 0, 250) : 0, trades = [];
  for (let k = 0; k < q; k++) trades.push({ price, v: B[k].tv, c: S[k].tc });
  const Q = trades.length, ext = p.ext * Q, W = trades.reduce((t, x) => t + x.v - x.c + p.ext, 0);
  return { trades, Q, ext, loss: optimum(o.prod).W - W, price: Q ? K.mean(trades.map(x => x.price)) : 0 };
}
// the social optimum: make every unit whose social benefit is at least its social cost
function optimum(prod) { const e = PROD[prod].ext; let W = 0, Q = 0; for (let i = 0; i < N; i++) { const s = val(i) - cost(i) + e; if (s >= 0) { W += s; Q++; } } return { Q: (200 + e) / 10, W, Qn: Q }; }
const qPolicy = o => { const p = PROD[o.prod]; const q = (200 + p.gap * (1 - (o.info || 0)) - (o.tax || 0) + (o.sub || 0)) / 10; return Math.max(0, Math.min(o.cap == null ? 40 : o.cap, q)); };
const lossTheory = o => { const d = qPolicy(o) - optimum(o.prod).Q; return 5 * d * d; };     // the triangle: ½ × ΔQ × (10 ΔQ)

// ---- 2. Cap and trade ----
const E0 = [120, 100, 90, 90, 80, 80, 70, 70], ETOT = 700;       // each firm's emissions with no cuts (thousand tonnes of CO₂)
const KBASE = [0.625, 0.94, 1.25, 1.875, 2.5, 3.75, 5, 7.5];      // how steeply each firm's cost of cutting rises (marginal abatement cost = k × cut)
function kSet(spread) { const g = Math.exp(K.mean(KBASE.map(Math.log))), k = KBASE.map(x => g * Math.pow(x / g, spread)), s = k.reduce((t, x) => t + 1 / x, 0); return k.map(x => x * s / 5); }
function permitPrice(cap, ks) { const need = ETOT - cap; if (need <= 0) return 0; let lo = 0, hi = 2000; for (let it = 0; it < 60; it++) { const p = (lo + hi) / 2, a = E0.reduce((t, e, i) => t + Math.min(e, p / ks[i]), 0); if (a < need) lo = p; else hi = p; } return (lo + hi) / 2; }
class Permits {
  constructor(cap, spread, r) { this.ks = kSet(spread); this.cap = cap; this.r = r; this.a = E0.map(e => e - cap * e / ETOT); this.trades = []; this.idle = 0; this.flying = []; }
  mac(i) { return this.ks[i] * this.a[i]; }
  cost() { return this.a.reduce((t, a, i) => t + 0.5 * this.ks[i] * a * a, 0); }          // £ thousand: area under each firm's MAC line
  equalCost() { const f = Math.max(0, (ETOT - this.cap) / ETOT); return E0.reduce((t, e, i) => t + 0.5 * this.ks[i] * (f * e) ** 2, 0); }
  step() {   // two firms meet: the one for whom cutting is dearer buys a lot of permits from the other, at a price in between
    const r = this.r, i = r.int(8), j = r.int(8); if (i === j) return null;
    const [b, s] = this.mac(i) > this.mac(j) ? [i, j] : [j, i], gain = this.mac(b) - this.mac(s); if (gain < 1.5) { this.idle++; return null; }
    const lot = Math.min(5, gain / (this.ks[b] + this.ks[s]), this.a[b], E0[s] - this.a[s]); if (lot <= 0.01) { this.idle++; return null; }   // never more than would make their costs equal
    const price = (this.mac(b) + this.mac(s)) / 2; this.a[b] -= lot; this.a[s] += lot; this.idle = 0; const t = { b, s, lot, price, n: this.trades.length + 1 }; this.trades.push(t); return t;
  }
  done() { return this.idle > 200 || this.trades.length > 2000; }
}

// ---- 3. Public goods ----
/* N households each have £10 a round. Every £1 put in the pot creates £m of street lighting, shared equally by all.
   Types: free riders give nothing; conditional co-operators give about 85% of what others gave last time; altruists give everything. */
function pgRun(o, r, rounds) {
  const n = o.n, types = Array.from({ length: n }, (_, i) => i < Math.round(o.free * n) ? "free" : i < Math.round(o.free * n) + Math.round(o.alt * n) ? "alt" : "cond");
  let last = null; const out = [];
  for (let t = 0; t < rounds; t++) {
    const give = types.map((ty, i) => { if (o.tax) return o.tax; if (ty === "free") return 0; if (ty === "alt") return 10; if (last == null) return K.clamp(5 + 2 * r.gauss(), 0, 10); const others = (last.reduce((a, b) => a + b, 0) - last[i]) / (n - 1); return K.clamp(0.85 * others + 1 * r.gauss(), 0, 10); });
    const pot = give.reduce((a, b) => a + b, 0), share = pot * o.m / n; out.push({ give, types, pot, pay: give.map(g => 10 - g + share) }); last = give;
  }
  return out;
}

// ---- 4. The market for lemons ----
/* 60 used cars of random quality q (0 to 1). An owner will sell for at least £10 000 × q; a buyer would pay r × £10 000 × q if they knew q.
   Buyers cannot see quality, so they offer r × the average quality of the cars still for sale. Owners of good cars refuse and leave. */
function lemons(o, r, rounds = 8) {
  const cars = Array.from({ length: 60 }, () => ({ q: r(), cert: r() < o.cert, state: "sale" })); const hist = [];
  for (let t = 0; t < rounds; t++) {
    const onSale = cars.filter(c => c.state === "sale" && !c.cert); const avg = onSale.length ? K.mean(onSale.map(c => c.q)) : 0, offer = o.r * avg * 10000;
    for (const c of onSale) if (c.q * 10000 > offer) c.state = "left";     // owners of better cars than the offer pays for withdraw them
    hist.push({ offer, avg, left: cars.filter(c => c.state === "sale").length });
  }
  for (const c of cars) if (c.state === "sale") c.state = "sold";
  return { cars, hist, sold: cars.filter(c => c.state === "sold").length / 60 };
}

// ---------------- The page ----------------
const P = { mode: "ext", prod: "chem", policy: "none", tax: 40, sub: 24, cap: 16, info: 0.5, pcap: 500, spread: 1, n: 12, m: 4, free: 0.3, alt: 0.1, ptax: 0, r: 1.5, cert: 0 };
let rnd = K.rng(Date.now() % 99991 + 11), speed = 1;
let mk = { d: null, t: 0, hist: [], parts: [], days: 0 };
let pm = null, pmHist = [], pmFly = [];
let pg = { rounds: [], t: 0 };
let lem = { res: null, t: 0, round: 0 };

const ui = K.app({
  title: "Market Failure and Externalities", subject: "Economics",
  blurb: "Third parties, pollution permits, free riders and lemons",
  reset: () => set({ mode: P.mode }),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "Edexcel International GCSE Economics (4EC1) 1.2.6 and 2.1: market failure; external costs and benefits of production and consumption; social cost = private cost + external cost; government responses (indirect taxes, subsidies, regulation, information, pollution permits, state provision); public goods and free riders.", adv: "Edexcel A level Economics A (9EC0) Theme 1, 1.3 market failure (externalities with MPC/MSC/MPB/MSB and the welfare loss, public goods, information gaps) and 1.4 government intervention (Pigouvian taxes, subsidies, tradable pollution permits, regulation, information provision); asymmetric information (the market for lemons)." } },
  missions: [
    { title: "The river", q: "A chemical works sells to its customers; every tonne also pollutes the river, costing the town downstream £40. Watch a day of trading. How many tonnes are made, and how many would be best for society as a whole?", hint: "The market makes about 20 a day, where private benefit = private cost. But each tonne also costs the town £40, so the social cost (MSC) is £40 higher than the private cost. The best amount for society is where MSB = MSC: 16 a day. The 4 extra tonnes each cost society more than they are worth: the shaded triangle is the welfare loss.", setup() { set({ mode: "ext", prod: "chem" }); } },
    { title: "A tax on pollution", q: "Put a £40 a tonne tax on the chemical works. What happens to the amount made, the price, and the welfare loss? Now try £20 and £60.", hint: "A tax equal to the external cost makes the firm pay the full social cost: it 'internalises' the externality. Output falls to 16, the price rises and the welfare loss almost vanishes. A smaller tax leaves some loss; a bigger one makes too little, which is a loss too. This is a Pigouvian tax. The batch run 'Where should the tax be set?' sweeps it.", setup() { set({ mode: "ext", prod: "chem", policy: "tax", tax: 40 }); } },
    { title: "Too few flu jabs", q: "Flu jabs protect other people too. Do people buy enough? What would a subsidy of £30 per hundred jabs do?", hint: "With an external benefit, the market makes too little: people only count their own benefit. Here people also under-rate the jab, so even fewer are bought. A subsidy lowers the price and raises the quantity towards the social optimum (where MSB = MSC). Information campaigns can also close the gap.", setup() { set({ mode: "ext", prod: "flu" }); } },
    { title: "Sugary drinks", q: "People underestimate the harm from sugary drinks, and their treatment costs the NHS. Compare a tax, a ban on some sales (a limit of 12 a day) and an information campaign. Which gets closest to the optimum?", hint: "Two failures here: an external cost (NHS) and an information gap (people think the drinks are better for them than they are). An information campaign closes only the gap; a tax can deal with both; a quota fixes the quantity but raises no money and is hard to set right. The UK Soft Drinks Industry Levy (2018) taxed sugary drinks by sugar content.", setup() { set({ mode: "ext", prod: "drinks" }); } },
    { title: "Cap and trade", q: "Eight firms must cut emissions to a cap of 500 thousand tonnes. Watch them trade permits. Who buys and who sells? Where does the price settle?", hint: "Firms that find cutting expensive buy permits; firms that can cut cheaply sell them and cut more. Trading stops when every firm's marginal cost of cutting is the same: the permit price (about £40 a tonne here). The cap is met at the lowest total cost, much lower than making every firm cut by the same share.", setup() { set({ mode: "permits", pcap: 500 }); } },
    { title: "Too many permits", q: "Set the cap to 750 thousand tonnes: more than the firms emit anyway. What happens to the price? What does that mean for pollution?", hint: "The price falls to zero: permits are worthless, and nobody cuts anything. This happened in the first phase of the EU Emissions Trading System (2005–07), when too many permits were handed out. A cap only works if it is tight.", setup() { set({ mode: "permits", pcap: 750 }); } },
    { title: "Free riders", q: "Twelve households each have £10 a round to keep or put towards street lights. Every £1 put in makes £4 of lighting, shared by all twelve. Watch the contributions round by round. Why do they fall?", hint: "Each £1 you give brings you back only £4 ÷ 12 = 33p, so keeping your money is always better for you, yet everyone would be better off if everyone gave. Free riders give nothing; others start generous but give less when they see free riders. That is why public goods like street lights are paid for by compulsory taxes.", setup() { set({ mode: "pg" }); } },
    { title: "A compulsory tax", q: "Now make everyone pay £10 in tax for the lights. Compare everyone's earnings with the voluntary rounds.", hint: "With everyone paying, the pot is £120 and makes £480 of lighting: £40 each, against £10 if they kept their money. Everyone, including the would-be free riders, is better off. Non-excludable goods are underprovided by markets, so the state provides them.", setup() { set({ mode: "pg", ptax: 10 }); } },
    { lvl: "adv", title: "The market for lemons", q: "Buyers value cars 1.5 times as much as their owners do, so every sale should happen. But buyers cannot tell good cars from 'lemons'. Watch round by round. Which cars leave the market?", hint: "Buyers offer a price based on average quality. Owners of good cars find that too low and withdraw. The average quality falls, so the offer falls, and more good cars leave. The market unravels until only lemons are left (Akerlof, 1970). Inspection reports, warranties and dealers' reputations are fixes: try 'Cars with inspection reports'.", setup() { set({ mode: "lemons", r: 1.5 }); } },
    { lvl: "adv", title: "Cutting costs with permits", q: "Make the firms all the same (spread 0), then very different. When do permits save the most compared with equal cuts?", hint: "If every firm has the same costs, equal cuts are already the cheapest way and trading changes nothing. The more firms differ, the more there is to gain from letting the cheap cutters do most of the cutting. This is why economists favour permits or a carbon tax over uniform regulation.", setup() { set({ mode: "permits", spread: 0 }); } }
  ],
  batch: [
    { title: "Does a free market overproduce?", question: "With a £40 external cost on every unit, how much does an unregulated market make each day?", how: "200 days of trading, chemicals, no policy. Theory: the market makes 20 (where demand = supply); the social optimum is 16.", reps: 200, bins: 16, theory: 20, theoryLabel: "market theory", yLabel: "units made in a day", run: (x, r) => day({ prod: "chem" }, r).Q, note: "The market lands near 20 a day, well above the social optimum of 16. Traders' prices wobble a little from day to day, so the quantity varies by a unit or two." },
    { title: "Where should the tax be set?", question: "How does the welfare loss depend on the size of a tax on each tonne?", how: "Chemicals (external cost £40 a tonne), tax from £0 to £80; 6 days at each. Welfare loss = the best possible total welfare − the day's total (including the town's cost). Theory: the triangle ½ × ΔQ × (10 ΔQ).", xLabel: "tax (£ a tonne)", yLabel: "welfare loss (£ a day)", xs: [0, 10, 20, 30, 40, 50, 60, 70, 80], reps: 6, yMin: 0, theory: t => lossTheory({ prod: "chem", tax: t }), run: (x, r) => day({ prod: "chem", tax: x }, r).loss, note: "A U shape with its lowest point at a tax equal to the external cost (£40): a Pigouvian tax. The measured losses sit a little above the triangle: when traders misjudge, sometimes the wrong buyers and sellers trade, which wastes a little surplus of its own." },
    { title: "Subsidising training", question: "Apprentices bring a £24 external benefit to other firms. How large a subsidy brings training up to the social optimum (22.4 a day)?", how: "Subsidy per apprentice from £0 to £48, 6 days at each. Theory: Q = (200 + subsidy) ÷ 10.", xLabel: "subsidy (£ per apprentice)", yLabel: "apprentices trained a day", xs: [0, 8, 16, 24, 32, 40, 48], reps: 6, yMin: 15, theory: s => qPolicy({ prod: "train", sub: s }), run: (x, r) => day({ prod: "train", sub: x }, r).Q, note: "Quantity rises in a straight line, reaching the optimum when the subsidy equals the external benefit (£24)." },
    { title: "Cap and trade: where does the price settle?", question: "How does the permit price depend on the cap?", how: "Eight firms trade until no swap saves money; each run records the last trade price. Theory: the price at which the firms' cuts add up to 700 − cap.", xLabel: "cap (thousand tonnes)", yLabel: "permit price (£ a tonne)", xs: [300, 350, 400, 450, 500, 550, 600, 650, 700, 750], reps: 3, yMin: 0, theory: c => permitPrice(c, kSet(1)), run: (x, r) => { const m = new Permits(x, 1, r); while (!m.done()) m.step(); return m.trades.length ? m.trades[m.trades.length - 1].price : 0; }, note: "Tighter caps mean dearer permits. At a cap of 700 or more, firms need not cut at all and the price is zero: over-allocation." },
    { title: "Free riders: do people keep giving?", question: "In a voluntary street-lights fund, what share of their money do households give, round by round?", how: "12 households (30% free riders, 10% altruists, the rest conditional co-operators), each £1 makes £4 shared by all. The selfish (Nash) prediction is 0%; the social optimum is 100%.", xLabel: "round", yLabel: "share given (%)", xs: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], reps: 10, yMin: 0, run: (x, r) => { const o = pgRun({ n: 12, m: 4, free: 0.3, alt: 0.1 }, r, x); return o[x - 1].pot / 120 * 100; }, note: "About 40% at first, falling towards 20%: contributions decay as co-operators see free riders, just as in classroom and laboratory experiments." },
    { lvl: "adv", title: "The market for lemons", question: "How does the share of cars sold depend on how much more buyers value cars than owners do?", how: "60 cars, 8 rounds of offers, no inspection reports. Theory: (r ÷ 2)⁸ of the cars remain, because each round the offer falls by a factor r ÷ 2.", xLabel: "buyer value ÷ owner value (r)", yLabel: "share of cars sold (%)", xs: [1, 1.25, 1.5, 1.75, 1.9, 2, 2.25, 2.5, 3], reps: 8, yMin: 0, theory: x => 100 * Math.min(1, Math.pow(x / 2, 8)), run: (x, r) => 100 * lemons({ r: x, cert: 0 }, r).sold, note: "Unless buyers value cars at least twice as much as owners, the market unravels and most good trades never happen." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4EC1 1.2.6", text: "An externality is a cost or benefit to a third party, not included in the price. External costs: pollution, congestion. External benefits: education, vaccination." },
      { lvl: "std", tag: "4EC1 1.2.6", text: "Social cost = private cost + external cost. Social benefit = private benefit + external benefit." },
      { lvl: "std", tag: "4EC1 1.2.6", text: "With external costs a free market overproduces; with external benefits it underproduces. Both are market failure: resources are misallocated." },
      { lvl: "std", tag: "4EC1 2.1.1", text: "Government responses: indirect taxes, subsidies, regulation (limits, bans), information, pollution permits and state provision. Each has costs and may not hit the right level." },
      { lvl: "std", tag: "4EC1 2.1.2", text: "Public goods are non-rival and non-excludable, so free riders can enjoy them without paying: markets underprovide them, and governments provide them from taxes." },
      { lvl: "adv", tag: "9EC0 1.3.2", text: "On the diagram: MSC = MPC + MEC. The social optimum is where MSB = MSC. The welfare loss is the triangle between the market and the optimum quantity." },
      { lvl: "adv", tag: "9EC0 1.4.1", text: "A Pigouvian tax equal to the marginal external cost at the optimum internalises the externality. In practice the MEC is hard to measure." },
      { lvl: "adv", tag: "9EC0 1.4.1", text: "Tradable permits: the cap fixes the quantity of pollution; trading lets firms with low abatement costs cut more, so the cap is met at least cost. Problems: setting the cap, over-allocation, monitoring." },
      { lvl: "adv", tag: "9EC0 1.3.4", text: "Information gaps (asymmetric information): when sellers know more than buyers, good products can be driven out (the market for lemons). Fixes: warranties, inspections, regulation." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: "Define an external cost and give an example.", ans: "<ul><li>a cost to a third party not involved in the transaction / not paid by producer or consumer</li><li>e.g. pollution from a factory affecting people living nearby</li></ul>" },
      { lvl: "std", marks: 3, q: "Explain why a free market produces too much of a good whose production causes pollution.", ans: "<ul><li>firms base output on private costs only</li><li>the external cost to third parties is ignored, so social cost is greater than private cost</li><li>output is above the socially optimal level</li></ul>" },
      { lvl: "std", marks: 2, q: () => `In the simulation, ${mk.d ? mk.d.Q : 20} units were made today and each causes an external cost of £${Math.abs(PROD[P.prod].ext)}. Calculate the total external ${PROD[P.prod].ext < 0 ? "cost" : "benefit"}.`, ans: () => `<ul><li>${mk.d ? mk.d.Q : 20} × £${Math.abs(PROD[P.prod].ext)}</li><li>= £${(mk.d ? mk.d.Q : 20) * Math.abs(PROD[P.prod].ext)}</li></ul>` },
      { lvl: "std", marks: 4, q: "Evaluate the use of a tax to reduce the consumption of sugary drinks.", ans: "<ul><li>raises the price, so quantity demanded falls; revenue can fund the NHS</li><li>firms may reformulate (as with the UK levy, sugar content fell)</li><li>but demand may be price inelastic, so consumption falls little; it is regressive</li><li>the right tax is hard to set because the external cost is hard to measure</li></ul>" },
      { lvl: "std", marks: 2, q: "Explain why street lighting is unlikely to be provided by the free market.", ans: "<ul><li>it is non-excludable: people who do not pay cannot be stopped from benefiting (free riders)</li><li>so firms cannot charge enough to cover costs</li></ul>" },
      { lvl: "adv", marks: 4, q: "Draw and explain a diagram showing the welfare loss from a negative production externality.", ans: "<ul><li>MPB = MSB downward sloping; MPC upward; MSC above MPC by the MEC</li><li>market quantity where MPB = MPC; social optimum where MSB = MSC (lower)</li><li>welfare loss triangle between the two quantities, between MSC and MSB</li><li>the units beyond the optimum cost society more than their benefit</li></ul>" },
      { lvl: "adv", marks: 3, q: "Explain why tradable pollution permits can achieve a reduction in pollution at a lower cost than a uniform limit on each firm.", ans: "<ul><li>firms have different marginal abatement costs</li><li>those with low costs cut more and sell permits; those with high costs buy permits</li><li>trading equalises marginal abatement costs, minimising the total cost of meeting the cap</li></ul>" },
      { lvl: "adv", marks: 4, q: "Explain how asymmetric information can lead to the collapse of the market for used cars.", ans: "<ul><li>sellers know quality, buyers do not, so buyers offer a price based on average quality</li><li>owners of good cars find the price too low and withdraw them</li><li>average quality falls, so the price buyers will pay falls</li><li>the process repeats until only low-quality cars (lemons) are traded: adverse selection</li></ul>" }
    ]
  },
  notes: `<h3>What is being modelled</h3>
<ul><li><b>Externalities</b>: 40 buyers with private values £197.50, £192.50 … £2.50 and 40 sellers with private costs £2.50 … £197.50 (demand P = 200 − 5Q, supply P = 5Q). They meet in random pairs; a buyer bids a random amount below their value and a seller asks a random amount above their cost; they trade if the bid reaches the ask. Each unit sold causes the same external cost or benefit. A tax raises every seller's cost; a subsidy lowers it; a limit stops trading after that many deals; an information campaign closes a share of the gap between what people think the good is worth and its true value. Welfare = Σ (true value − cost ± external effect) over the day's trades.</li>
<li><b>Cap and trade</b>: eight firms emit 120, 100, 90, 90, 80, 80, 70 and 70 thousand tonnes. Cutting gets dearer the more a firm cuts: marginal abatement cost = k × cut, with k different for each firm. Permits are handed out in proportion to emissions. Two firms meet at random and trade up to 5 thousand tonnes of permits (never more than would make their marginal costs equal) if their marginal costs differ by more than £1.50, at the price halfway between.</li>
<li><b>Public goods</b>: each round every household has £10; each £1 given makes £m shared by all. Free riders give nothing, altruists everything, conditional co-operators about 85% of what the others gave last round.</li>
<li><b>Lemons</b>: 60 cars of uniformly random quality. Buyers offer r × the average quality on sale; owners whose cars are worth more than the offer withdraw them. Cars with inspection reports sell at their true value.</li></ul>
<h3>Simplifications</h3>
<ul><li>All numbers are illustrative. External costs are the same for every unit; in reality they often rise with the amount of pollution.</li>
<li>Traders do not learn from day to day, and there is no haggling: each day clears at one price.</li>
<li>The government knows the external cost exactly; in reality measuring it is the hardest part.</li>
<li>Permit trading has no transaction costs, no banking of permits and no cheating.</li>
<li>Elasticities are fixed; the earlier version let you change them and had more presets based on UK policies.</li></ul>
<p>The earlier version of this simulation, with its worksheets, is kept in <a href="original/externalities.html">original/externalities.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {}, grp = {};
let g = ui.group("View");
ctl.mode = K.seg(g, { value: "ext", options: [["ext", "🏭 Externalities"], ["permits", "📜 Cap and trade"], ["pg", "💡 Public goods"], ["lemons", "🚗 Lemons"]], on: v => set({ mode: v }) });
grp.ext = g = ui.group("The market");
ctl.prod = K.seg(g, { label: "Product", value: "chem", options: Object.entries(PROD).map(([k, v]) => [k, v.icon + " " + v.name.split(" (")[0]]), on: v => set({ mode: "ext", prod: v }) });
const prodNote = K.note(g, "");
ctl.policy = K.seg(g, { label: "Government policy", value: "none", options: [["none", "None"], ["tax", "Tax"], ["sub", "Subsidy"], ["cap", "Limit"], ["info", "Information"]], on: v => { P.policy = v; showPolicy(); } });
ctl.tax = K.slider(g, { label: "Tax per unit", min: 0, max: 80, step: 1, value: P.tax, unit: "£", on: v => P.tax = v });
ctl.sub = K.slider(g, { label: "Subsidy per unit", min: 0, max: 60, step: 1, value: P.sub, unit: "£", on: v => P.sub = v });
ctl.cap = K.slider(g, { label: "Most that may be sold a day", min: 4, max: 40, step: 1, value: P.cap, on: v => P.cap = v });
ctl.info = K.slider(g, { label: "Share of the information gap closed", min: 0, max: 1, step: 0.05, value: P.info, fmt: v => Math.round(v * 100) + "%", on: v => P.info = v });
grp.permits = g = ui.group("Cap and trade");
ctl.pcap = K.slider(g, { label: "Cap on emissions", min: 250, max: 800, step: 10, value: P.pcap, unit: "kt", on: v => { P.pcap = v; restart(); } });
ctl.spread = K.slider(g, { label: "How different the firms' costs are", min: 0, max: 1.5, step: 0.1, value: P.spread, on: v => { P.spread = v; restart(); } });
grp.pg = g = ui.group("Street lights");
ctl.n = K.slider(g, { label: "Households", min: 4, max: 20, step: 1, value: P.n, on: v => { P.n = v; restart(); } });
ctl.m = K.slider(g, { label: "Lighting made by each £1 given", min: 1, max: 12, step: 0.5, value: P.m, unit: "£", on: v => { P.m = v; restart(); } });
ctl.free = K.slider(g, { label: "Free riders", min: 0, max: 1, step: 0.05, value: P.free, fmt: v => Math.round(v * 100) + "%", on: v => { P.free = v; restart(); } });
ctl.alt = K.slider(g, { label: "Altruists", min: 0, max: 0.5, step: 0.05, value: P.alt, fmt: v => Math.round(v * 100) + "%", on: v => { P.alt = v; restart(); } });
ctl.ptax = K.slider(g, { label: "Compulsory tax each round", min: 0, max: 10, step: 1, value: 0, unit: "£", on: v => { P.ptax = v; restart(); } });
grp.lemons = g = ui.group("Used cars (A level)");
ctl.r = K.slider(g, { label: "Buyers' value ÷ owners' value", min: 1, max: 3, step: 0.05, value: P.r, on: v => { P.r = v; restart(); } });
ctl.cert = K.slider(g, { label: "Cars with inspection reports", min: 0, max: 1, step: 0.05, value: 0, fmt: v => Math.round(v * 100) + "%", on: v => { P.cert = v; restart(); } });
g = ui.group("Watch");
K.btn(K.row(g), "↺ Start again", () => restart(), "primary");
ctl.speed = K.slider(g, { label: "Speed", min: 0.25, max: 4, step: 0.25, value: 1, fmt: v => "× " + v, on: v => speed = v });
ui.headerSpeed(ctl.speed);   // playback speed lives in the header, beside Pause and Reset
const read = K.readout(g, [["a", ""], ["b", ""], ["c", ""], ["d", ""]]);
const relabel = l => l.forEach((t, i) => read.el.children[i].firstElementChild.textContent = t);
function showPolicy() { for (const k of ["tax", "sub", "cap", "info"]) ctl[k].el.style.display = P.policy === k ? "" : "none"; }
const pol = () => ({ prod: P.prod, tax: P.policy === "tax" ? P.tax : 0, sub: P.policy === "sub" ? P.sub : 0, cap: P.policy === "cap" ? P.cap : null, info: P.policy === "info" ? P.info : 0 });

function restart() {
  mk = { d: null, t: 0, hist: [], parts: [], days: 0 }; pm = new Permits(P.pcap, P.spread, rnd); pmHist = []; pmFly = [];
  pg = { rounds: pgRun({ n: P.n, m: P.m, free: P.free, alt: P.alt, tax: P.ptax }, rnd, 10), t: 0 }; lem = { res: lemons({ r: P.r, cert: P.cert }, rnd), t: 0 };
}
function set(o) {
  Object.assign(P, { prod: "chem", policy: "none", tax: 40, sub: 24, cap: 16, info: 0.5, pcap: 500, spread: 1, n: 12, m: 4, free: 0.3, alt: 0.1, ptax: 0, r: 1.5, cert: 0 }, o);
  if (o.prod === "flu" && !o.policy) P.sub = 30;
  for (const k of ["tax", "sub", "cap", "info", "pcap", "spread", "n", "m", "free", "alt", "ptax", "r", "cert"]) ctl[k].set(P[k]); for (const k of ["mode", "prod", "policy"]) ctl[k].set(P[k]);
  for (const k in grp) grp[k].style.display = k === P.mode ? "" : "none"; showPolicy(); restart();
  chA.opts.title = { ext: "Units made each day", permits: "Price of each permit trade", pg: "Share of money given each round", lemons: "Cars still for sale" }[P.mode];
  chB.opts.title = { ext: "Welfare loss each day", permits: "Total cost of meeting the cap", pg: "Average earnings each round", lemons: "Average quality and the buyers' offer" }[P.mode];
  relabel({ ext: ["units made today", "average price", "external effect today", "welfare loss today"], permits: ["permit price now", "trades", "total cost (trading)", "cost with equal cuts"], pg: ["round", "given this round", "lighting each", "best possible each"], lemons: ["round", "buyers offer", "cars for sale", "average quality on sale"] }[P.mode]);
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const T = (c, t, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(t, x, y); };
const DAY = 4;   // seconds of animation per trading day at × 1

// the MPC/MSC/MPB/MSB diagram, drawn on the stage
function diagram(c, x0, y0, w, h) {
  const p = PROD[P.prod], o = pol(), X = q => x0 + 40 + q / 40 * (w - 50), Y = v => y0 + h - 26 - v / 240 * (h - 40);
  c.strokeStyle = "#7d8aa5"; c.lineWidth = 1; c.beginPath(); c.moveTo(X(0), Y(240)); c.lineTo(X(0), Y(0)); c.lineTo(X(40), Y(0)); c.stroke();
  T(c, "£", X(0) - 14, Y(230)); T(c, "quantity a day", X(40), Y(0) + 18, "#aab6cc", "right"); for (const v of [0, 50, 100, 150, 200]) T(c, v, X(0) - 6, Y(v) + 4, "#7d8aa5", "right", "10.5px"); for (const q of [0, 10, 20, 30, 40]) T(c, q, X(q), Y(0) + 13, "#7d8aa5", "center", "10.5px");
  // each line is labelled near its top end: falling lines at the left, rising lines at the right
  const line = (f, col, lab, dash, lq) => { c.strokeStyle = col; c.lineWidth = 2.2; c.setLineDash(dash || []); c.beginPath(); let first = true; for (let q = 0; q <= 40; q += 0.5) { const v = f(q); if (v < -10 || v > 260) { first = true; continue; } first ? c.moveTo(X(q), Y(v)) : c.lineTo(X(q), Y(v)); first = false; } c.stroke(); c.setLineDash([]); const rising = f(10) > f(0), q = lq != null ? lq : rising ? 33 : 3, v = K.clamp(f(q), 8, 235); T(c, lab, X(q) + (rising ? -6 : 6), Y(v) - 5, col, rising ? "right" : "left", "600 11px"); };
  const mpb = q => 200 - 5 * q, mpc = q => 5 * q, msb = p.side === "cons" ? q => mpb(q) + p.ext : mpb, msc = p.side === "prod" ? q => mpc(q) - p.ext : mpc;
  const Qm = qPolicy(o), Qs = optimum(P.prod).Q;
  // welfare loss triangle: between the quantity made and the optimum, between MSB and MSC
  c.fillStyle = "rgba(255,93,108,0.30)"; c.beginPath(); c.moveTo(X(Qs), Y(msb(Qs))); for (let q = Qs; Qm > Qs ? q <= Qm : q >= Qm; q += Qm > Qs ? 0.25 : -0.25) c.lineTo(X(q), Y(msc(q))); for (let q = Qm; Qm > Qs ? q >= Qs : q <= Qs; q += Qm > Qs ? -0.25 : 0.25) c.lineTo(X(q), Y(msb(q))); c.fill();
  line(mpb, "#6fb1ff", p.side === "cons" && p.ext ? "MPB" : "MPB = MSB"); line(mpc, "#ffb347", p.side === "prod" && p.ext ? "MPC" : "MPC = MSC");
  if (p.side === "cons") line(msb, "#7fe3a0", "MSB", [6, 4]); else line(msc, "#ff8a70", "MSC", [6, 4]);
  if (p.gap && o.info < 1) line(q => mpb(q) + p.gap * (1 - o.info), "#9a86c9", "what buyers think", [2, 4], 9);
  if (o.tax) line(q => mpc(q) + o.tax, "#ffd166", "MPC + tax", [3, 3], 27); if (o.sub) line(q => mpc(q) - o.sub, "#ffd166", "MPC − subsidy", [3, 3], 38); if (o.cap != null) { c.strokeStyle = "#ffd166"; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(X(o.cap), Y(0)); c.lineTo(X(o.cap), Y(230)); c.stroke(); c.setLineDash([]); T(c, "limit", X(o.cap) + 3, Y(225), "#ffd166"); }
  for (const [q, col, lab] of [[Qs, "#7fe3a0", "Q* (best for society)"], [Qm, "#eef2f8", "Q (expected)"]]) { c.strokeStyle = col; c.setLineDash([2, 3]); c.beginPath(); c.moveTo(X(q), Y(0)); c.lineTo(X(q), Y(150)); c.stroke(); c.setLineDash([]); }
  T(c, `Q* = ${Qs.toFixed(1)}`, X(Qs), Y(0) - 6, "#7fe3a0", "center", "600 11px");
  // today's trades so far: each dot is one unit at the price it sold for
  if (mk.d) { const n = Math.min(mk.d.trades.length, Math.floor(mk.d.trades.length * mk.t / DAY) + 1); mk.d.trades.slice(0, n).sort((a, b) => b.v - a.v).forEach((tr, i) => { c.fillStyle = "rgba(255,255,255,0.85)"; c.beginPath(); c.arc(X(i + 0.5), Y(tr.price), 2.8, 0, 6.3); c.fill(); }); }
  T(c, "● today's deals at the price the market found", x0 + 44, y0 + 12, "#aab6cc", "left", "11px");
}
function drawExt(c, w, h) {
  const p = PROD[P.prod], sw = w * 0.46, dW = w - sw - 10, d = mk.d;
  // left: sellers → buyers, with the external effect flowing to the third party
  T(c, p.icon + " sellers", 30, 150, "#ffb347", "left", "600 14px"); T(c, "buyers 🧑‍🤝‍🧑", sw - 20, 150, "#6fb1ff", "right", "600 14px");
  const n = d ? Math.min(d.trades.length, Math.floor(d.trades.length * mk.t / DAY)) : 0;
  for (let i = 0; i < 40; i++) { const x = 40 + (i % 10) * ((sw - 80) / 10) * 0.42, y = 175 + Math.floor(i / 10) * 18; c.fillStyle = i < n ? "#ffb347" : "rgba(255,179,71,0.25)"; c.fillRect(x, y, 10, 10); c.fillStyle = i < n ? "#6fb1ff" : "rgba(111,177,255,0.25)"; c.beginPath(); c.arc(sw - 40 - (i % 10) * ((sw - 80) / 10) * 0.42, y + 5, 5, 0, 6.3); c.fill(); }
  T(c, `${n} sold so far today`, sw / 2, 260, "#eef2f8", "center", "600 13px");
  // the third party
  const ty = h - 120, bad = p.ext < 0; c.fillStyle = bad ? "rgba(255,93,108,0.12)" : "rgba(127,227,160,0.12)"; c.beginPath(); c.roundRect(24, ty - 10, sw - 48, 100, 12); c.fill();
  T(c, `Third party: ${p.third}`, 40, ty + 12, bad ? "#ff8a70" : "#7fe3a0", "left", "600 13px");
  T(c, `${bad ? "external cost" : "external benefit"} £${Math.abs(p.ext)} for every unit`, 40, ty + 32, "#aab6cc");
  T(c, `${bad ? "−" : "+"}£${Math.abs(p.ext) * n} today`, 40, ty + 68, bad ? "#ff5d6c" : "#7fe3a0", "left", "700 22px");
  for (const q of mk.parts) { c.fillStyle = bad ? `rgba(160,110,60,${q.a})` : `rgba(127,227,160,${q.a})`; c.beginPath(); c.arc(q.x, q.y, 5, 0, 6.3); c.fill(); }
  diagram(c, sw + 10, 40, dW - 10, h - 50);
  const o = pol(); T(c, o.tax ? `Tax £${o.tax} a unit` : o.sub ? `Subsidy £${o.sub} a unit` : o.cap != null ? `Limit: ${o.cap} a day` : o.info ? `Information campaign: ${Math.round(o.info * 100)}% of the gap closed` : "No policy: a free market", 30, h - 8, "#ffd166", "left", "600 12.5px");
}
function drawPermits(c, w, h) {
  const m = pm, bw = (w - 60) / 8, base = h - 70, sc = (h - 230) / 125, p = permitPrice(P.pcap, m.ks);
  for (let i = 0; i < 8; i++) {
    const x = 30 + i * bw + bw / 2, emit = E0[i] - m.a[i];
    c.fillStyle = "#56607a"; c.fillRect(x - 22, base - 40, 44, 40); c.fillStyle = "#7d8aa5"; c.fillRect(x + 8, base - 40 - 24, 10, 24);    // factory and chimney
    c.fillStyle = "rgba(170,182,204,0.18)"; c.fillRect(x - 16, base - 40 - E0[i] * sc, 32, E0[i] * sc - 24);
    c.fillStyle = "rgba(140,140,150,0.75)"; c.fillRect(x - 16, base - 40 - emit * sc, 32, Math.max(0, emit * sc - 24));                       // smoke = what it still emits
    T(c, `${emit.toFixed(0)} kt`, x, base - 46 - E0[i] * sc, "#eef2f8", "center", "600 11px");
    T(c, `firm ${"ABCDEFGH"[i]}`, x, base + 16, "#aab6cc", "center"); T(c, `cuts cost £${m.ks[i].toFixed(1)}/t more`, x, base + 30, "#7d8aa5", "center", "10px"); T(c, `per kt cut`, x, base + 42, "#7d8aa5", "center", "10px");
    T(c, `MAC £${m.mac(i).toFixed(0)}`, x, base - 12, Math.abs(m.mac(i) - p) < 4 ? "#7fe3a0" : "#ffd166", "center", "600 11px");
  }
  for (const f of pmFly) { const x = 30 + (f.s + (f.b - f.s) * f.f) * bw + bw / 2, y = base - 60 - Math.sin(f.f * Math.PI) * 80; c.fillStyle = "#ffd166"; c.fillRect(x - 9, y - 6, 18, 12); T(c, "£" + f.price.toFixed(0), x, y - 10, "#ffd166", "center", "10.5px"); }
  T(c, `Cap ${P.pcap} kt (firms emit ${ETOT} kt with no cuts)`, w / 2, 26, "#eef2f8", "center", "600 14px");
  T(c, "MAC = marginal abatement cost: what cutting one more tonne would cost each firm. Trading stops when they are all equal.", w / 2, 46, "#aab6cc", "center", "12px");
}
function drawPG(c, w, h) {
  const R = pg.rounds, k = Math.min(R.length - 1, Math.floor(pg.t / 2)), rd = R[k], n = rd.give.length, hw = (w - 60) / n, base = h - 90, lit = rd.pot / (10 * n);
  // street lights: brightness shows how much was raised
  for (let i = 0; i <= 4; i++) { const x = 40 + i * (w - 80) / 4; c.strokeStyle = "#56607a"; c.lineWidth = 4; c.beginPath(); c.moveTo(x, base); c.lineTo(x, 120); c.lineTo(x + 20, 120); c.stroke(); const gr = c.createRadialGradient(x + 20, 126, 2, x + 20, 126, 30 + 120 * lit); gr.addColorStop(0, `rgba(255,226,140,${0.2 + 0.8 * lit})`); gr.addColorStop(1, "rgba(255,226,140,0)"); c.fillStyle = gr; c.fillRect(x - 150, 90, 340, base - 90); }
  const cols = { free: "#ff5d6c", cond: "#6fb1ff", alt: "#7fe3a0" };
  for (let i = 0; i < n; i++) {
    const x = 30 + i * hw + hw / 2; c.fillStyle = cols[rd.types[i]]; c.beginPath(); c.moveTo(x - hw * 0.38, base); c.lineTo(x - hw * 0.38, base - 34); c.lineTo(x, base - 52); c.lineTo(x + hw * 0.38, base - 34); c.lineTo(x + hw * 0.38, base); c.fill();
    c.fillStyle = "#ffd166"; const coins = Math.round(rd.give[i]); for (let j = 0; j < coins; j++) { c.beginPath(); c.ellipse(x, base + 12 + j * -4 + 40, Math.min(9, hw * 0.3), 3, 0, 0, 6.3); c.fill(); }
    T(c, "£" + rd.give[i].toFixed(0), x, base + 70, "#eef2f8", "center", "11px");
  }
  T(c, `Round ${k + 1} of ${R.length}: £${rd.pot.toFixed(0)} given of £${10 * n} → £${(rd.pot * P.m).toFixed(0)} of lighting, £${(rd.pot * P.m / n).toFixed(2)} for each household`, w / 2, 30, "#eef2f8", "center", "600 14px");
  T(c, "■ free rider   ■ conditional co-operator   ■ altruist", w / 2, 52, "#aab6cc", "center"); for (const [col, dx] of [["#ff5d6c", -170], ["#6fb1ff", -82], ["#7fe3a0", 80]]) { c.fillStyle = col; c.fillRect(w / 2 + dx - 5, 43, 10, 10); }
  if (P.ptax) T(c, `Compulsory tax: everyone pays £${P.ptax}`, w / 2, 74, "#ffd166", "center", "600 13px");
}
function drawLemons(c, w, h) {
  const L = lem.res, rd = Math.min(L.hist.length, Math.floor(lem.t / 1.5)), cw = Math.min(70, (w - 60) / 12), chh = Math.min(42, (h - 160) / 5);
  L.cars.forEach((car, i) => {
    const x = 30 + (i % 12) * (cw + 4), y = 90 + Math.floor(i / 12) * (chh + 8); let gone = false;
    if (!car.cert) { for (let t = 0; t < rd; t++) if (car.q * 10000 > L.hist[t].offer) gone = true; }
    const hue = Math.round(car.q * 120); c.globalAlpha = gone ? 0.15 : 1; c.fillStyle = `hsl(${hue},65%,50%)`; c.beginPath(); c.roundRect(x, y + chh * 0.25, cw, chh * 0.5, 6); c.fill(); c.beginPath(); c.roundRect(x + cw * 0.2, y + chh * 0.05, cw * 0.55, chh * 0.3, 5); c.fill();
    c.fillStyle = "#111"; for (const f of [0.22, 0.78]) { c.beginPath(); c.arc(x + cw * f, y + chh * 0.78, chh * 0.13, 0, 6.3); c.fill(); }
    if (car.cert) T(c, "✔", x + cw - 8, y + 10, "#fff", "center", "600 11px"); c.globalAlpha = 1;
  });
  const hst = rd ? L.hist[rd - 1] : null;
  T(c, rd ? `Round ${rd}: buyers offer £${hst.offer.toFixed(0)} (${P.r} × the average quality on sale)` : "Buyers cannot see quality. Each round they offer r × the value of an average car still for sale.", w / 2, 30, "#eef2f8", "center", "600 14px");
  T(c, "colour = quality (green good, red lemon) · faded = owner withdrew it · ✔ = inspection report", w / 2, 52, "#aab6cc", "center");
}
function draw() { const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#070b14"; c.fillRect(0, 0, w, h); ({ ext: drawExt, permits: drawPermits, pg: drawPG, lemons: drawLemons })[P.mode](c, w, h); }

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => {
  if (!(dt > 0)) return; const s = dt * speed;
  if (P.mode === "ext") {
    if (!mk.d || mk.t >= DAY + 1) { if (mk.d) { mk.hist.push([mk.days, mk.d.Q, mk.d.loss]); if (mk.hist.length > 60) mk.hist.shift(); } mk.d = day(pol(), rnd); mk.t = 0; mk.days++; mk.sold = 0; }
    mk.t += s; const n = Math.min(mk.d.trades.length, Math.floor(mk.d.trades.length * mk.t / DAY));
    while (mk.sold < n) { mk.sold++; for (let k = 0; k < 3; k++) mk.parts.push({ x: cv.w * 0.23 + (rnd() - 0.5) * 60, y: 280, vy: 60 + rnd() * 40, vx: (rnd() - 0.5) * 40, a: 1 }); }
    for (const q of mk.parts) { q.x += q.vx * s; q.y += q.vy * s; if (q.y > cv.h - 135) { q.vy = 0; q.vx = 0; q.a -= s; } } mk.parts = mk.parts.filter(q => q.a > 0).slice(-150);
  } else if (P.mode === "permits") {
    if (!pm.done()) { pm._acc = (pm._acc || 0) + s * 6; while (pm._acc > 1 && !pm.done()) { pm._acc--; let t = null; for (let k = 0; k < 50 && !t && !pm.done(); k++) t = pm.step(); if (t) { pmFly.push(Object.assign({ f: 0 }, t)); pmHist.push([t.n, t.price, pm.cost()]); } } }
    for (const f of pmFly) f.f += s * 1.5; pmFly = pmFly.filter(f => f.f < 1);
  } else if (P.mode === "pg") { pg.t = Math.min(pg.t + s, 2 * pg.rounds.length - 0.01); }
  else { lem.t = Math.min(lem.t + s, 1.5 * lem.res.hist.length + 0.01); }
}, () => {
  draw(); if (frame++ % 5) return;
  if (P.mode === "ext") {
    const p = PROD[P.prod], o = pol(), H = mk.hist, Qs = optimum(P.prod).Q, Qm = qPolicy(o), d = mk.d;
    chA.opts.xLabel = "day"; chA.opts.yLabel = "units made"; chB.opts.xLabel = "day"; chB.opts.yLabel = "welfare loss (£)";
    chA.draw([{ pts: H.map(q => [q[0], q[1]]), type: "dots", color: "#eef2f8", r: 3.5, label: "each day" }], { yMin: 0, yMax: 40, hlines: [{ y: Qs, color: "#7fe3a0", label: "social optimum" }, { y: Qm, color: "#ffd166", label: "expected" }] });
    chB.draw([{ pts: H.map(q => [q[0], q[2]]), type: "bars", w: 0.7, color: "#ff5d6c", label: "measured" }], { yMin: 0, yMax: Math.max(20, lossTheory(o), ...H.map(q => q[2])) * 1.2, hlines: [{ y: lossTheory(o), color: "#ffd166", label: "triangle (theory)" }] });
    prodNote.innerHTML = `${p.icon} <b>${p.name}</b>: each unit ${p.ext < 0 ? "costs" : "benefits"} ${p.third} £${Math.abs(p.ext)}${p.gap ? `. Buyers ${p.gap > 0 ? "overvalue" : "undervalue"} it by £${Math.abs(p.gap)} (an information gap).` : "."}`;
    if (d) { read.set("a", `${d.Q} (best: ${Qs.toFixed(1)})`); read.set("b", "£" + d.price.toFixed(0)); read.set("c", (p.ext < 0 ? "−£" : "+£") + Math.abs(d.ext)); read.set("d", "£" + d.loss.toFixed(0)); }
    ui.hud(`Day ${mk.days}<br>made <b>${d ? d.Q : "–"}</b> · best for society <b>${Qs.toFixed(1)}</b><br>welfare loss today <b style="color:#ff8a70">£${d ? d.loss.toFixed(0) : "–"}</b>`);
  } else if (P.mode === "permits") {
    const p = permitPrice(P.pcap, pm.ks), last = pmHist.length ? pmHist[pmHist.length - 1] : null;
    chA.opts.xLabel = "trade number"; chA.opts.yLabel = "price (£ a tonne)"; chB.opts.xLabel = "trade number"; chB.opts.yLabel = "total cost (£ million)";
    chA.draw([{ pts: pmHist.map(q => [q[0], q[1]]), type: "dots", color: "#ffd166", r: 3, label: "trade price" }], { yMin: 0, xMin: 0, hlines: [{ y: p, color: "#7fe3a0", label: "theory £" + p.toFixed(1) }] });
    chB.draw([{ pts: [[0, pm.equalCost() / 1000]].concat(pmHist.map(q => [q[0], q[2] / 1000])), color: "#6fb1ff", label: "with trading" }], { yMin: 0, xMin: 0, hlines: [{ y: pm.equalCost() / 1000, color: "#ff8a70", label: "equal cuts" }] });
    read.set("a", last ? "£" + last[1].toFixed(1) : "–"); read.set("b", pmHist.length); read.set("c", "£" + (pm.cost() / 1000).toFixed(1) + " m"); read.set("d", "£" + (pm.equalCost() / 1000).toFixed(1) + " m");
    ui.hud(`${pm.done() ? "<b>Trading has stopped</b>" : "Firms are trading…"}<br>price ${last ? "£" + last[1].toFixed(1) : "–"} (theory £${p.toFixed(1)})<br>saving vs equal cuts: <b>${(100 * (1 - pm.cost() / Math.max(1e-9, pm.equalCost()))).toFixed(0)}%</b>`);
  } else if (P.mode === "pg") {
    const R = pg.rounds, k = Math.min(R.length - 1, Math.floor(pg.t / 2)), n = P.n, shown = R.slice(0, k + 1);
    chA.opts.xLabel = "round"; chA.opts.yLabel = "share given (%)"; chB.opts.xLabel = "round"; chB.opts.yLabel = "earnings (£)";
    const byType = ty => shown.map((r, t) => { const idx = r.types.map((x, i) => x === ty ? i : -1).filter(i => i >= 0); return idx.length ? [t + 1, K.mean(idx.map(i => r.give[i])) * 10] : [t + 1, NaN]; });
    chA.draw([{ pts: shown.map((r, t) => [t + 1, r.pot / (10 * n) * 100]), color: "#eef2f8", width: 2.6, label: "everyone" }, { pts: byType("cond"), color: "#6fb1ff", label: "co-operators" }, { pts: byType("free"), color: "#ff5d6c", label: "free riders" }], { xMin: 1, xMax: 10, yMin: 0, yMax: 105, hlines: [{ y: 100, color: "#7fe3a0", label: "best for the street" }] });
    const pay = ty => shown.map((r, t) => { const idx = r.types.map((x, i) => x === ty ? i : -1).filter(i => i >= 0); return [t + 1, idx.length ? K.mean(idx.map(i => r.pay[i])) : NaN]; });
    chB.draw([{ pts: pay("free"), color: "#ff5d6c", label: "free riders" }, { pts: pay("cond"), color: "#6fb1ff", label: "co-operators" }], { xMin: 1, xMax: 10, yMin: 0, hlines: [{ y: 10, color: "#7d8aa5", label: "keep everything" }, { y: 10 * P.m, color: "#7fe3a0", label: "if everyone gave all" }] });
    read.set("a", (k + 1) + " of 10"); read.set("b", Math.round(R[k].pot / (10 * n) * 100) + "%"); read.set("c", "£" + (R[k].pot * P.m / n).toFixed(2)); read.set("d", "£" + (10 * P.m).toFixed(0));
    ui.hud(`Each £1 given returns only <b>£${(P.m / n).toFixed(2)}</b> to the giver<br>but £${P.m} to the street as a whole`);
  } else {
    const L = lem.res, rd = Math.min(L.hist.length, Math.floor(lem.t / 1.5)), H = L.hist.slice(0, rd);
    chA.opts.xLabel = "round"; chA.opts.yLabel = "cars for sale"; chB.opts.xLabel = "round"; chB.opts.yLabel = "£";
    const th = []; for (let t = 0; t <= 8; t++) th.push([t, 60 * (P.cert + (1 - P.cert) * Math.min(1, Math.pow(P.r / 2, t)))]);
    chA.draw([{ pts: th, color: "#7d8aa5", dash: [5, 4], label: "theory" }, { pts: [[0, 60]].concat(H.map((q, t) => [t + 1, q.left])), color: "#ffd166", label: "simulation" }], { xMin: 0, xMax: 8, yMin: 0, yMax: 62 });
    chB.draw([{ pts: H.map((q, t) => [t + 1, q.offer]), color: "#6fb1ff", label: "buyers' offer" }, { pts: H.map((q, t) => [t + 1, q.avg * 10000]), color: "#7fe3a0", label: "owners' value of average car" }], { xMin: 0, xMax: 8, yMin: 0 });
    const hh = rd ? H[rd - 1] : null; read.set("a", rd + " of 8"); read.set("b", hh ? "£" + hh.offer.toFixed(0) : "–"); read.set("c", hh ? hh.left : 60); read.set("d", hh ? hh.avg.toFixed(2) : "0.50");
    ui.hud(`${rd >= 8 ? `<b>${Math.round(L.sold * 100)}%</b> of cars sold` : "Owners deciding…"}<br>every sale would make both sides better off`);
  }
  ctl.mode.el.querySelectorAll("button")[3].style.display = ui.level === "adv" ? "" : "none"; if (ui.level !== "adv" && P.mode === "lemons") set({ mode: "ext" });
});
set({});
ui.tip("Choose a product and a policy; each day 40 buyers and 40 sellers trade · switch views at the top of the controls", 8000);
