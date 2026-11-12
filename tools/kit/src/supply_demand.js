/* =====================================================================
   THE TRADING PIT: supply and demand from the bottom up
   No curve is drawn first. Instead there are people:
     - each BUYER has a private value: the most they would pay
     - each SELLER has a private cost: the least they would accept
   They meet at random and haggle. A buyer who fails to buy bids a bit
   more next time; a seller who fails to sell asks a bit less. Nobody
   knows the "equilibrium price", yet the market finds it. The supply
   and demand curves are simply everyone's values and costs, sorted.
   ===================================================================== */
class Market {
  constructor(rand, o = {}) {
    this.r = rand; this.o = Object.assign({ n: 24, dShift: 0, sShift: 0, dSpread: 1, sSpread: 1, tax: 0, cap: 999, floor: 0 }, o);
    const n = this.o.n; this.base = []; for (let i = 0; i < n; i++) this.base.push({ f: 1 - 2 * (i + .5) / n, nv: (rand() - .5) * 5, nc: (rand() - .5) * 5 });   // each trader's place in the spread, plus a little individuality
    this.buyers = this.base.map(() => ({})); this.sellers = this.base.map(() => ({})); this.day = 0; this.ref = null; this.history = []; this.apply(); this.newDay();
  }
  // values and costs follow the sliders: shift moves everyone, spread stretches the range
  apply() { const o = this.o; this.base.forEach((b, i) => { this.buyers[i].v = Math.max(1, 60 + o.dShift + 40 * o.dSpread * b.f + b.nv); this.sellers[i].c = Math.max(1, 60 + o.sShift - 40 * o.sSpread * b.f + b.nc); }); }
  newDay() {
    const { r, o } = this; this.day++; this.trades = []; this.meetings = 0; this.stale = 0;
    for (const b of this.buyers) { b.done = false; b.price = null; b.bid = this.ref == null ? b.v * (0.6 + 0.3 * r()) : Math.min(b.v, this.ref * (0.88 + 0.1 * r())); }                        // open low…
    for (const s of this.sellers) { s.done = false; s.price = null; const m = s.c + o.tax; s.ask = this.ref == null ? m * (1.1 + 0.35 * r()) : Math.max(m, this.ref * (1.02 + 0.1 * r())); }     // …and high
  }
  // can any remaining pair still do a deal that is legal and worthwhile for both?
  open() { const o = this.o; let bv = -1, sc = 1e9; for (const b of this.buyers) if (!b.done && b.v > bv) bv = b.v; for (const s of this.sellers) if (!s.done && s.c + o.tax < sc) sc = s.c + o.tax; return bv >= sc && bv >= o.floor && sc <= o.cap && this.meetings < this.o.n * 6 && this.stale < this.o.n * 2.5 + 6; }   // the closing bell rings after a long spell with no deals
  // one random buyer meets a seller
  meet() {
    const { r, o } = this, B = this.buyers.filter(b => !b.done), S = this.sellers.filter(s => !s.done); if (!B.length || !S.length) return null;
    let b = B[r.int(B.length)], s = S[r.int(S.length)];
    // people shop around: half the time a buyer compares three sellers and approaches the cheapest, half the time a seller seeks out the keenest of three buyers
    if (r() < 0.5) { for (let k = 0; k < 2; k++) { const s2 = S[r.int(S.length)]; if (s2.ask < s.ask) s = s2; } } else { for (let k = 0; k < 2; k++) { const b2 = B[r.int(B.length)]; if (b2.bid > b.bid) b = b2; } }
    const min = s.c + o.tax; this.meetings++;
    let bid = b.bid, ask = s.ask;
    if (o.cap < ask && o.cap >= min) ask = o.cap;         // the law caps the price: a seller who can still profit must accept it
    if (o.floor > bid && o.floor <= b.v) bid = o.floor;   // the law sets a minimum price: a buyer who still values it must pay it
    let deal = bid >= ask, price = null;
    if (deal) { price = K.clamp((bid + ask) / 2, o.floor, o.cap); if (price < min || price > b.v) deal = false; }
    if (deal) { b.done = s.done = true; b.price = s.price = price; this.trades.push({ price, v: b.v, c: s.c }); this.stale = 0; }
    else { this.stale++; b.bid += (b.v - b.bid) * 0.5 * r(); s.ask -= (s.ask - min) * 0.5 * r(); }   // no deal: both give a little ground
    return { b, s, deal, price, bid, ask };
  }
  endDay() { const st = this.stats(); if (this.trades.length) this.ref = st.price; this.history.push(st); return st; }
  runDay() { while (this.open()) this.meet(); const st = this.endDay(); this.newDay(); return st; }
  stats() { const T = this.trades, t = this.o.tax; let cs = 0, ps = 0; for (const x of T) { cs += x.v - x.price; ps += x.price - t - x.c; } return { day: this.day, q: T.length, price: T.length ? K.mean(T.map(x => x.price)) : NaN, cs, ps, tax: t * T.length, total: cs + ps + t * T.length }; }
  // What a textbook would predict from the sorted values and costs
  theory() {
    const o = this.o, D = this.buyers.map(b => b.v).sort((a, b) => b - a), S0 = this.sellers.map(s => s.c).sort((a, b) => a - b), S = S0.map(c => c + o.tax), n = D.length;
    let q0 = 0; while (q0 < n && D[q0] >= S0[q0]) q0++; let q = 0; while (q < n && D[q] >= S[q]) q++;
    const lo = Math.max(q ? S[q - 1] : 0, q < n ? D[q] : 0), hi = Math.min(q ? D[q - 1] : 999, q < n ? S[q] : 999); let p = q ? (lo + hi) / 2 : NaN, note = "", gapN = 0;
    const want = x => D.filter(v => v >= x).length, offer = x => S.filter(c => c <= x).length;
    if (o.cap < p) { p = o.cap; gapN = want(p) - offer(p); q = Math.min(want(p), offer(p)); note = "shortage"; }
    if (o.floor > p) { p = o.floor; gapN = offer(p) - want(p); q = Math.min(want(p), offer(p)); note = "surplus"; }
    let max = 0; for (let k = 0; k < q0; k++) max += D[k] - S0[k]; let cs = 0, ps = 0; for (let k = 0; k < q; k++) { cs += D[k] - p; ps += p - o.tax - S0[k]; }
    return { D, S, S0, q, q0, p, cs, ps, tax: o.tax * q, max, dwl: max - cs - ps - o.tax * q, note, gapN };
  }
}
// Headless: let the market settle for some days, then average the next few
function settle(rand, o, key, warm = 8, days = 5) { const m = new Market(rand, o); for (let i = 0; i < warm; i++) m.runDay(); const v = []; for (let i = 0; i < days; i++) { const st = m.runDay(); v.push(key(st, m)); } return K.mean(v.filter(isFinite)); }

// ---------------------------------------------------------------- page
let mk, speed = 2, showVals = true, stalls = [], pause = 0, pops = [], allTrades = []; const S = {};
const money = v => "£" + v.toFixed(0);
const ui = K.app({
  title: "The Trading Pit", subject: "Economics", blurb: "Supply and demand built from people who haggle. Nobody sets the price, yet the market finds it.",
  reset: () => restart(),
  missions: [
    { title: "The invisible hand", q: "Each trader knows only their own number. Look at the right-hand diagram: where do the sorted values and costs cross? Now watch several days of trading. Where do prices settle?", hint: "Prices converge on the crossing point, the equilibrium, within a few days, although no trader knows where it is. Buyers who overpaid bid less the next day; sellers who failed to sell ask less. Adam Smith called this the invisible hand; Vernon Smith won a Nobel Prize for showing it in classroom experiments like this one.", setup: () => { resetSliders(); restart(); } },
    { title: "Who is left out?", q: "With private values showing, watch who goes home without trading at the end of a day. What do those buyers and sellers have in common? Is it a bad thing that they did not trade?", hint: "Buyers with low values and sellers with high costs are left out: there is no price at which both would gain. That is the market doing its job: goods go to those who value them most, made by those who can make them most cheaply.", setup: () => { resetSliders(); S.vals.set(true, true); S.speed.set(1, true); restart(); } },
    { title: "A demand shock", q: "Let the price settle, then drag <b>Buyers' values</b> up by £20 (the product has gone viral). Predict the new price and quantity before the traders find them. Does the price rise by the full £20?", hint: "Demand shifts right: price and quantity both rise, but price rises by less than £20 because higher prices pull in extra sellers. How the £20 is shared between a higher price and a higher quantity depends on how steep the supply curve is.", setup: () => { resetSliders(); restart(); } },
    { title: "Who really pays a tax?", q: "The government taxes sellers £20 per unit. Before running it: will the price buyers pay rise by £20, £0, or something between? Watch what happens to the number of trades too.", hint: "The price rises by about £10: the burden is shared, even though sellers hand over the money. The grey triangle is the deadweight loss: trades that would have benefited both sides but no longer happen. Nobody gets that money, not even the government.", setup: () => { resetSliders(); S.tax.set(20, true); restart(); } },
    { title: "Tax and elasticity", q: "Same £20 tax, but now buyers are desperate (a steep, inelastic demand curve: think petrol or cigarettes). Who bears most of the tax now? How much does quantity fall?", hint: "The side that is less able to walk away bears more of the tax. With inelastic demand the price rises by nearly the whole tax, quantity barely falls and the deadweight loss is small: which is why governments tax fuel, alcohol and tobacco.", setup: () => { resetSliders(); S.tax.set(20, true); S.dsp.set(2.4, true); restart(); } },
    { title: "Rent control", q: "A price cap of £45 is imposed, well below the equilibrium. What happens to the number of trades? Count the buyers who wanted to buy at £45 but could not. Who ends up with the goods?", hint: "Fewer sellers are willing at £45, so fewer trades happen and there is a shortage. The lucky buyers gain, but who gets the goods is now down to luck, not who values them most: a keen buyer may miss out while a lukewarm one gets served. Queues, waiting lists and side-payments follow.", setup: () => { resetSliders(); S.cap.set(45, true); restart(); } },
    { title: "A minimum price", q: "Now a price floor of £75 (as with a minimum wage, where the 'sellers' are workers). What happens to the quantity traded? Who gains and who loses?", hint: "Sellers who do trade gain from the higher price, but fewer units are bought and there is a surplus of willing sellers who cannot find a buyer. How big that effect is depends on how elastic demand is: try steepening the demand curve.", setup: () => { resetSliders(); S.floor.set(75, true); restart(); } },
  ],
  batch: [
    { title: "Tax and the price buyers pay", question: "If sellers are taxed £t per unit, how much does the price rise?", how: "24 buyers and 24 sellers. The market settles for 8 days; the mean price over the next 5 days is recorded.", xLabel: "tax per unit (£)", yLabel: "price paid by buyers (£)", xs: [0, 5, 10, 15, 20, 30, 40], reps: 8,
      theory: t => 60 + t / 2, theoryLabel: "equilibrium (half the tax passed on)", run: (t, r) => settle(r, { tax: t }, s => s.price), note: "Prices come from haggling, not from an auctioneer, and each market has its own random set of traders. Individual trades scatter around the equilibrium, especially with only a couple of dozen traders." },
    { title: "Deadweight loss of a tax", question: "Does doubling a tax double the harm?", how: "Deadweight loss = the largest possible total gain from trade minus the gain actually achieved (buyers + sellers + tax revenue).", xLabel: "tax per unit (£)", yLabel: "total gains lost (£ per day)", xs: [0, 10, 20, 30, 40, 50], reps: 8, yMin: 0,
      theory: t => 24 / 160 * t * t / 2, theoryLabel: "∝ tax² (the triangle)", run: (t, r) => settle(r, { tax: t }, (s, m) => m.theory().max - s.total), note: "Even with no tax the pit loses a little, because random haggling sometimes pairs the 'wrong' traders. The loss from the tax grows with the square of the tax: doubling the tax roughly quadruples the damage." },
    { title: "Price cap and quantity", question: "How does a maximum price change the number of trades?", how: "Equilibrium price is about £60. The cap is set at different levels and the trades per day are counted.", xLabel: "price cap (£)", yLabel: "units traded per day", xs: [30, 40, 50, 60, 70, 80], reps: 8, yMin: 0,
      theory: c => 24 * Math.min(c - 20, 40) / 80, theoryLabel: "sellers willing at that price", run: (c, r) => settle(r, { cap: c }, s => s.q), note: "Below the equilibrium the quantity is limited by how many sellers can cover their costs at the capped price. Above it, the cap makes no difference at all: it is 'not binding'." },
    { title: "Thin and thick markets", question: "Is the price steadier when there are more traders?", how: "After 8 days to settle, the average price on each of the next 10 days is recorded. Result = how much those daily prices vary (their standard deviation).", xLabel: "traders on each side", yLabel: "day-to-day variation in price (£)", xs: [4, 8, 16, 32, 60], reps: 10, yMin: 0,
      run: (n, r) => { const m = new Market(r, { n }); for (let i = 0; i < 8; i++) m.runDay(); const p = []; for (let i = 0; i < 10; i++) { const st = m.runDay(); if (isFinite(st.price)) p.push(st.price); } return p.length > 2 ? K.sd(p) : null; }, note: "In a thin market each day's price depends on which few traders happened to meet, so it jumps about. In a thick market those accidents average out. That is one reason trade concentrates in exchanges and marketplaces, and why prices of rarely traded things (houses, paintings) are so uncertain." },
  ],
  notes: `<h3>The rules</h3><ul><li>Each buyer wants one unit a day and has a private value; each seller can make one unit and has a private cost.</li><li>Traders shop around a little: a buyer compares three sellers and approaches the cheapest, or a seller seeks out the keenest of three buyers. The buyer has a bid in mind, the seller an asking price. If bid ≥ ask they trade halfway between.</li><li>If not, both give ground: the bid creeps up towards the buyer's value, the ask creeps down towards the seller's cost (plus any tax).</li><li>Next day everyone opens near yesterday's average price.</li></ul>
  <h3>The diagram</h3><p>The demand curve is the buyers' values sorted from highest to lowest; the supply curve is the sellers' costs sorted from lowest to highest. <b>Consumer surplus</b> = value − price. <b>Producer surplus</b> = price − cost (− tax). <b>Deadweight loss</b> = gains from trade that no longer happen.</p>
  <h3>Assumptions and simplifications</h3><ul><li>One identical product, one unit each, no stock carried over, no advertising or brand loyalty.</li><li>Traders follow a simple rule of thumb; they are not strategic and never collude.</li><li>Values and costs are fixed from day to day unless you move a slider.</li><li>Taxes are collected from sellers. (Taxing buyers instead gives the same outcome: try explaining why.)</li><li>Under a price cap, who gets served is random. The shaded areas show the best case, in which the keenest buyers are served.</li><li>Straight-line theory in the batch run assumes evenly spread values and costs.</li></ul>`,
});
let g = ui.group("The market");
S.n = K.slider(g, { label: "Traders on each side", min: 4, max: 60, step: 1, value: 24, on: () => restart() });
S.dsh = K.slider(g, { label: "Buyers' values (shift demand)", min: -30, max: 30, step: 1, value: 0, fmt: v => (v > 0 ? "+" : "") + "£" + v, on: v => { mk.o.dShift = v; mk.apply(); } });
S.ssh = K.slider(g, { label: "Sellers' costs (shift supply)", min: -30, max: 30, step: 1, value: 0, fmt: v => (v > 0 ? "+" : "") + "£" + v, on: v => { mk.o.sShift = v; mk.apply(); } });
S.dsp = K.slider(g, { label: "Demand steepness", min: 0.2, max: 2.5, step: 0.1, value: 1, fmt: v => v.toFixed(1) + (v > 1.6 ? " · inelastic" : v < 0.6 ? " · elastic" : ""), on: v => { mk.o.dSpread = v; mk.apply(); } });
S.ssp = K.slider(g, { label: "Supply steepness", min: 0.2, max: 2.5, step: 0.1, value: 1, fmt: v => v.toFixed(1) + (v > 1.6 ? " · inelastic" : v < 0.6 ? " · elastic" : ""), on: v => { mk.o.sSpread = v; mk.apply(); } });
g = ui.group("Government");
S.tax = K.slider(g, { label: "Tax on sellers, per unit", min: 0, max: 50, step: 1, value: 0, fmt: v => v ? "£" + v : "none", on: v => mk.o.tax = v });
S.cap = K.slider(g, { label: "Maximum price (cap)", min: 20, max: 121, step: 1, value: 121, fmt: v => v > 120 ? "none" : "£" + v, on: v => mk.o.cap = v > 120 ? 999 : v });
S.floor = K.slider(g, { label: "Minimum price (floor)", min: 0, max: 110, step: 1, value: 0, fmt: v => v ? "£" + v : "none", on: v => mk.o.floor = v });
g = ui.group("View");
S.vals = K.toggle(g, { label: "Show everyone's private value or cost", value: true, on: v => showVals = v });
S.speed = K.slider(g, { label: "Speed", min: 1, max: 6, step: 1, value: 2, fmt: v => v < 6 ? v + "×" : "a day per blink", on: v => speed = v });
g = ui.group("Today against the textbook");
const read = K.readout(g, [["p", "Average price today"], ["pt", "Textbook price"], ["q", "Trades today"], ["qt", "Textbook quantity"], ["eff", "Efficiency yesterday"], ["dwl", "Textbook deadweight loss"]]);

function resetSliders() { S.dsh.set(0); S.ssh.set(0); S.dsp.set(1); S.ssp.set(1); S.tax.set(0); S.cap.set(121); S.floor.set(0); S.n.set(24); }
function restart() {
  mk = new Market(K.rng(Date.now()), { n: S.n.value, dShift: S.dsh.value, sShift: S.ssh.value, dSpread: S.dsp.value, sSpread: S.ssp.value, tax: S.tax.value, cap: S.cap.value > 120 ? 999 : S.cap.value, floor: S.floor.value });
  stalls = [null, null, null]; pops = []; allTrades = []; pause = 0; place();
}
// ---- Layout: the pit on the left, the diagram on the right ----
const cv = ui.canvas(() => mk && place()); let PW = 400;
function place() {
  PW = cv.w * 0.44; const n = mk.o.n, cols = Math.ceil(n / (n > 30 ? 3 : 2)), dx = (PW - 50) / cols;
  const put = (list, top) => list.forEach((a, i) => { const row = Math.floor(i / cols), col = i % cols; a.hx = 30 + dx * (col + .5) + (row % 2) * dx * .25; a.hy = top ? 62 + row * 46 : cv.h - 64 - row * 46; if (a.x == null) { a.x = a.hx; a.y = a.hy; } });
  put(mk.buyers, true); put(mk.sellers, false);
}
function person(c, a, col, label) {
  const sc = mk.o.n > 30 ? 0.8 : 1, x = a.x, y = a.y; c.globalAlpha = a.done ? 0.32 : 1;
  c.fillStyle = "rgba(0,0,0,.35)"; c.beginPath(); c.ellipse(x, y + 13 * sc, 9 * sc, 3 * sc, 0, 0, 6.3); c.fill();
  c.fillStyle = col; c.beginPath(); c.moveTo(x - 8 * sc, y + 12 * sc); c.quadraticCurveTo(x - 8 * sc, y - 3 * sc, x, y - 3 * sc); c.quadraticCurveTo(x + 8 * sc, y - 3 * sc, x + 8 * sc, y + 12 * sc); c.fill(); c.beginPath(); c.arc(x, y - 8 * sc, 5.5 * sc, 0, 6.3); c.fill();
  if (showVals) { c.font = `${mk.o.n > 30 ? 9 : 10.5}px Segoe UI,sans-serif`; c.fillStyle = "#dfe8f7"; c.textAlign = "center"; c.fillText(label, x, y + 26 * sc); }
  if (a.done && a.price != null) { c.globalAlpha = .8; c.fillStyle = "#7ee787"; c.font = "600 10px Segoe UI,sans-serif"; c.fillText("✓ " + money(a.price), x, y - 17 * sc); }
  c.globalAlpha = 1;
}
function draw(dt) {
  const c = cv.ctx, w = cv.w, h = cv.h; const bg = c.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, "#0d152b"); bg.addColorStop(1, "#080c18"); c.fillStyle = bg; c.fillRect(0, 0, w, h);
  // --- the pit
  c.fillStyle = "rgba(255,255,255,.03)"; c.strokeStyle = "#24324f"; c.beginPath(); c.roundRect(10, h / 2 - 46, PW - 20, 92, 14); c.fill(); c.stroke();
  c.font = "600 11px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillStyle = "#5ad1ff"; c.fillText("BUYERS" + (showVals ? "  (the most each would pay)" : ""), 14, 18); c.fillStyle = "#ffb454"; c.fillText("SELLERS" + (showVals ? "  (the least each would accept" + (mk.o.tax ? ", before tax)" : ")") : ""), 14, h - 8);
  c.fillStyle = "#8fa0bf"; c.textAlign = "center"; c.fillText(`DAY ${mk.day}  ·  TRADING FLOOR`, PW / 2, h / 2 - 30);
  for (const a of [...mk.buyers, ...mk.sellers]) { const tx = a.tx != null ? a.tx : a.hx, ty = a.ty != null ? a.ty : a.hy, k = Math.min(1, dt * 7 * Math.max(1, speed * .7)); a.x += (tx - a.x) * k; a.y += (ty - a.y) * k; }
  mk.buyers.forEach(b => person(c, b, "#5ad1ff", money(b.v))); mk.sellers.forEach(s => person(c, s, "#ffb454", money(s.c)));
  // speech bubbles at the stalls
  for (const st of stalls) if (st && st.t > 0.35) {
    const bub = (a, txt, up, col) => { const y = a.y + (up ? -30 : 34); c.font = "600 11px Segoe UI,sans-serif"; const tw = c.measureText(txt).width + 12; c.fillStyle = "rgba(8,14,26,.9)"; c.strokeStyle = col; c.lineWidth = 1; c.beginPath(); c.roundRect(a.x - tw / 2, y - 10, tw, 19, 6); c.fill(); c.stroke(); c.fillStyle = col; c.textAlign = "center"; c.fillText(txt, a.x, y + 4); };
    bub(st.ev.b, "bid " + money(st.ev.bid), true, "#5ad1ff"); bub(st.ev.s, "ask " + money(st.ev.ask), false, "#ffb454");
    if (st.t > 0.7) { c.font = "600 15px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillStyle = st.ev.deal ? "#7ee787" : "#ff6b81"; c.fillText(st.ev.deal ? "deal " + money(st.ev.price) : "no deal", st.ev.b.x + 24, h / 2 + 5); }
  }
  // --- the diagram
  const th = mk.theory(), n = mk.o.n, gx0 = PW + 62, gx1 = w - 22, gy0 = 30, gy1 = h - 40, PMAX = 130, X = q => gx0 + q / n * (gx1 - gx0), Y = p => gy1 - Math.min(p, PMAX) / PMAX * (gy1 - gy0);
  c.strokeStyle = "#1f2c47"; c.lineWidth = 1; c.font = "11px Segoe UI,sans-serif"; c.fillStyle = "#8fa0bf"; c.textAlign = "right";
  for (let p = 0; p <= PMAX; p += 20) { c.beginPath(); c.moveTo(gx0, Y(p)); c.lineTo(gx1, Y(p)); c.stroke(); c.fillText("£" + p, gx0 - 6, Y(p) + 4); }
  c.textAlign = "center"; const qs = n > 30 ? 10 : n > 12 ? 4 : 2; for (let q = 0; q <= n; q += qs) c.fillText(q, X(q), gy1 + 15); c.fillText("quantity (units per day)", (gx0 + gx1) / 2, gy1 + 31);
  c.save(); c.translate(PW + 16, (gy0 + gy1) / 2); c.rotate(-Math.PI / 2); c.fillText("price", 0, 0); c.restore();
  // shaded gains from trade (textbook best case)
  const pBuy = th.p, pSell = th.p - mk.o.tax;
  for (let k = 0; k < th.q0; k++) {
    if (k < th.q) { c.fillStyle = "rgba(90,209,255,.22)"; c.fillRect(X(k), Y(th.D[k]), X(k + 1) - X(k), Y(pBuy) - Y(th.D[k])); c.fillStyle = "rgba(255,180,84,.22)"; c.fillRect(X(k), Y(pSell), X(k + 1) - X(k), Y(th.S0[k]) - Y(pSell)); if (mk.o.tax) { c.fillStyle = "rgba(196,161,255,.3)"; c.fillRect(X(k), Y(pBuy), X(k + 1) - X(k), Y(pSell) - Y(pBuy)); } }
    else { c.fillStyle = "rgba(160,170,190,.3)"; c.fillRect(X(k), Y(th.D[k]), X(k + 1) - X(k), Y(th.S0[k]) - Y(th.D[k])); }
  }
  const steps = (arr, col, dash, wd) => { c.strokeStyle = col; c.lineWidth = wd || 2.5; c.setLineDash(dash || []); c.beginPath(); arr.forEach((v, k) => { k ? c.lineTo(X(k), Y(v)) : c.moveTo(X(0), Y(v)); c.lineTo(X(k + 1), Y(v)); }); c.stroke(); c.setLineDash([]); };
  if (mk.o.tax) steps(th.S0, "#ffb454", [4, 4], 1.5); steps(th.D, "#5ad1ff"); steps(th.S, "#ffb454");
  c.font = "600 12px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillStyle = "#5ad1ff"; c.fillText("Demand", X(0) + 6, Y(th.D[0]) - 7); c.fillStyle = "#ffb454"; c.textAlign = "right"; c.fillText(mk.o.tax ? "Supply + tax" : "Supply", X(n) - 4, Y(th.S[n - 1]) - 7);
  const hline = (p, col, txt) => { c.strokeStyle = col; c.lineWidth = 1.5; c.setLineDash([7, 4]); c.beginPath(); c.moveTo(gx0, Y(p)); c.lineTo(gx1, Y(p)); c.stroke(); c.setLineDash([]); c.fillStyle = col; c.textAlign = "right"; c.font = "600 11px Segoe UI,sans-serif"; c.fillText(txt, gx1 - 4, Y(p) - 5); };
  if (mk.o.cap < 200) hline(mk.o.cap, "#ff6b81", "price cap " + money(mk.o.cap) + (th.note === "shortage" ? ` · shortage of ${th.gapN}` : " · not binding"));
  if (mk.o.floor > 0) hline(mk.o.floor, "#7ee787", "price floor " + money(mk.o.floor) + (th.note === "surplus" ? ` · surplus of ${th.gapN}` : " · not binding"));
  if (isFinite(th.p)) { c.strokeStyle = "rgba(255,255,255,.55)"; c.lineWidth = 1; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(gx0, Y(th.p)); c.lineTo(X(th.q), Y(th.p)); c.lineTo(X(th.q), gy1); c.stroke(); c.setLineDash([]); }
  // today's trades, in the order they happened
  mk.trades.forEach((t, k) => { c.fillStyle = "#fff"; c.strokeStyle = "#0d152b"; c.lineWidth = 1.5; c.beginPath(); c.arc(X(k + .5), Y(t.price), 4.2, 0, 6.3); c.fill(); c.stroke(); });
  // legend
  c.font = "11px Segoe UI,sans-serif"; c.textAlign = "left"; let ly = gy0 + 4; const lx = gx0 + (gx1 - gx0) * 0.34;
  for (const [col, txt] of [["rgba(90,209,255,.6)", "buyers' gain " + money(th.cs)], ["rgba(255,180,84,.6)", "sellers' gain " + money(th.ps)], ...(mk.o.tax ? [["rgba(196,161,255,.7)", "tax revenue " + money(th.tax)]] : []), ...(th.dwl > 0.5 ? [["rgba(160,170,190,.7)", "deadweight loss " + money(th.dwl)]] : []), ["#fff", "● today's trades"]]) { c.fillStyle = "rgba(8,14,26,.6)"; c.fillRect(lx - 4, ly - 9, 182, 15); c.fillStyle = col; if (txt[0] !== "●") c.fillRect(lx, ly - 6, 10, 10); c.fillStyle = txt[0] === "●" ? "#fff" : "#dfe8f7"; c.fillText(txt, txt[0] === "●" ? lx : lx + 15, ly + 3); ly += 16; }
}
const chP = K.chart(ui.dock, { title: "Every trade so far", xLabel: "day", yLabel: "price (£)" });
const chS = K.chart(ui.dock, { title: "Who gains from trade (per day)", xLabel: "day", yLabel: "£", yMin: 0 });
let frame = 0;
function finishDay() { mk.endDay(); pause = speed >= 6 ? 0 : 0.9; }
ui.run(dt => {
  if (pause > 0) { pause -= dt * Math.max(1, speed / 2); if (pause <= 0) { mk.newDay(); for (const a of [...mk.buyers, ...mk.sellers]) a.tx = a.ty = null; } return; }
  if (speed >= 6) { while (mk.open()) { const ev = mk.meet(); if (ev && ev.deal) allTrades.push([mk.day + mk.trades.length / (mk.o.n + 1), ev.price]); } finishDay(); mk.newDay(); stalls = [null, null, null]; return; }
  // up to three pairs haggle at once, each at its own stall
  for (let k = 0; k < 3; k++) {
    let st = stalls[k];
    if (!st) { if (!mk.open()) continue; const ev = mk.meet(); if (!ev) continue; const x = PW * (0.2 + 0.3 * k); ev.b.tx = x; ev.b.ty = cv.h / 2 - 12; ev.s.tx = x; ev.s.ty = cv.h / 2 + 16; stalls[k] = { ev, t: 0 }; if (ev.deal) allTrades.push([mk.day + mk.trades.length / (mk.o.n + 1), ev.price]); continue; }
    st.t += dt * speed * 4; if (st.t > 1.25) { st.ev.b.tx = st.ev.b.ty = st.ev.s.tx = st.ev.s.ty = null; stalls[k] = null; }
  }
  if (!mk.open() && stalls.every(s => !s)) finishDay();
  if (allTrades.length > 2500) allTrades.splice(0, 500);
}, dt => {
  draw(dt); if (frame++ % 5) return; const th = mk.theory(), H = mk.history, st = mk.stats();
  chP.draw([{ pts: allTrades, type: "dots", color: K.cssVar("--s0"), r: 2.2, alpha: .7, label: "trades" }, { pts: H.map(d => [d.day + .5, d.price]), color: K.cssVar("--s2"), label: "daily average", width: 2.2 }], { hlines: isFinite(th.p) ? [{ y: th.p, label: "textbook equilibrium", color: K.cssVar("--s1") }] : [], xMin: Math.max(1, mk.day - 24), xMax: mk.day + 1 });
  chS.draw([{ pts: H.map(d => [d.day, d.cs]), color: K.cssVar("--s0"), label: "buyers" }, { pts: H.map(d => [d.day, d.ps]), color: K.cssVar("--s1"), label: "sellers" }, { pts: H.map(d => [d.day, d.tax]), color: K.cssVar("--s4"), label: "tax" }, { pts: H.map(d => [d.day, d.total]), color: K.cssVar("--s2"), label: "total", width: 2.4 }], { hlines: [{ y: th.max, label: "largest possible total" }], xMin: Math.max(1, mk.day - 24), xMax: mk.day + 1 });
  const last = H[H.length - 1];
  read.set("p", isFinite(st.price) ? "£" + st.price.toFixed(1) : "–"); read.set("pt", isFinite(th.p) ? "£" + th.p.toFixed(1) : "–"); read.set("q", st.q); read.set("qt", th.q); read.set("eff", last ? (last.total / th.max * 100).toFixed(0) + "%" : "–"); read.set("dwl", "£" + Math.max(0, th.dwl).toFixed(0));
});
restart();
ui.tip("Blue buyers and orange sellers meet in the middle and haggle. Watch the white dots on the diagram.", 8000);
