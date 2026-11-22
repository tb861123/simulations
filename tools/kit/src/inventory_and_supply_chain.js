/* =====================================================================
   STOCK CONTROL AND THE SUPPLY CHAIN
   A shop or factory holds STOCK so it never has to turn customers away,
   but stock costs money to hold (storage, insurance, cash tied up, waste).
   The BAR-GATE (stock control) graph shows stock falling as it is used and
   jumping up when a delivery arrives:
     RE-ORDER LEVEL: when stock falls to this level, order more
     LEAD TIME: days between ordering and the delivery arriving
     BUFFER (SAFETY) STOCK: the minimum kept in case demand is high or a
       delivery is late;   re-order level = daily usage × lead time + buffer
     RE-ORDER QUANTITY: how much is ordered each time
   JUST-IN-TIME (JIT) orders little and often so almost no stock is held:
   cheap and lean, but one late delivery and the shelves are empty.
   Bigger orders mean fewer ordering costs but more holding costs; the
   ECONOMIC ORDER QUANTITY (EOQ = √(2DS/H), beyond the spec) balances them.
   THE BULLWHIP EFFECT: each business up a supply chain sees only the
   orders of the one below and over-reacts, so small wobbles in what
   shoppers buy become big swings at the factory.
   ===================================================================== */
const gbp = (v, dp = 0) => (v < 0 ? "−£" : "£") + Math.abs(v).toLocaleString("en-GB", { minimumFractionDigits: dp, maximumFractionDigits: dp });
const Phi = z => { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2), p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; };

/* ---------------- Stock control: one day at a time ----------------
   o: d (mean daily demand), sd, L (lead time days), Q (re-order quantity), buf (buffer stock), jit (order daily),
      late (chance a delivery is 3 days late), H (holding cost per unit per day), S (cost per order), short (lost contribution per unit) */
const rol = o => o.d * o.L + o.buf;                                     // re-order level
function newStock(o) { return { day: 0, stock: o.jit ? rol(o) : rol(o) + o.Q * 0.6, pipe: [], hist: [], held: 0, orders: 0, lost: 0, sold: 0, outDays: 0, cycles: 0, cycOut: 0, cycleHitZero: false }; }
function stockDay(S, o, r) {
  S.day++;
  // customers: today's demand (never negative)
  const dem = Math.max(0, Math.round(o.d + o.sd * r.gauss())), sell = Math.min(S.stock, dem);
  S.stock -= sell; S.sold += sell; if (dem > sell) { S.lost += dem - sell; S.outDays++; S.cycleHitZero = true; }
  // deliveries due today arrive at closing time (so an order placed today has to cover L days of customers)
  for (const p of S.pipe) if (p.due === S.day) { S.stock += p.q; S.cycles++; if (S.cycleHitZero) S.cycOut++; S.cycleHitZero = false; p.done = true; }
  S.pipe = S.pipe.filter(p => !p.done);
  // ordering: compare stock on hand + on order with the re-order level
  const onOrder = S.pipe.reduce((a, p) => a + p.q, 0), position = S.stock + onOrder;
  let q = 0;
  if (o.jit) q = Math.max(0, o.d * (o.L + 1) + o.buf - position);     // JIT: top up every day to just enough for the lead time and tomorrow
  else if (position <= rol(o)) q = o.Q;
  if (q > 0) { S.orders++; const delay = o.L + (r() < o.late ? 3 : 0); S.pipe.push({ q, due: S.day + delay, placed: S.day }); }
  S.held += S.stock;
  S.hist.push([S.day, S.stock, dem, q]); if (S.hist.length > 400) S.hist.shift();
  return dem;
}
const costs = (S, o) => { const n = Math.max(1, S.day); return { hold: o.H * S.held / n, order: o.S * S.orders / n, lost: o.short * S.lost / n }; };
function runStock(o, r, days) { const S = newStock(o); for (let i = 0; i < days; i++) stockDay(S, o, r); return S; }

/* ---------------- The bullwhip effect: a four-stage chain ----------------
   Each stage forecasts demand as the average of the orders it received in the last p weeks, and orders enough to bring
   its "order-up-to" level S = L × forecast back up:   order = S(now) − S(last week) + demand last week.
   For a stage facing random, independent demand, theory (Chen et al., 2000) gives
        variance of orders ÷ variance of demand = 1 + 2L/p + 2L²/p²          */
const bwTheory = (L, p) => 1 + 2 * L / p + 2 * L * L / (p * p);
function newChain(o) { const st = []; for (let k = 0; k < 4; k++) st.push({ seen: new Array(o.p).fill(o.base), Sprev: o.L * o.base, last: o.base, orders: [] }); return { week: 0, demand: [], st }; }
function chainWeek(C, o, r) {
  C.week++; let d = Math.max(0, o.base * (1 + (o.step && C.week > 20 ? 0.2 : 0)) + o.base * o.noise * r.gauss()); C.demand.push(d);
  for (const s of C.st) {                         // shop → wholesaler → distributor → factory: each one's orders are the next one's demand
    s.seen.push(d); s.seen.shift(); const F = K.mean(s.seen), S = o.L * F;
    const q = S - s.Sprev + d; s.Sprev = S; s.orders.push(q); d = Math.max(0, q);     // orders can't be negative (can't send stock back)
    if (s.orders.length > 400) s.orders.shift();
  }
  if (C.demand.length > 400) C.demand.shift();
}
const variance = a => { const m = K.mean(a); return a.reduce((s, v) => s + (v - m) ** 2, 0) / Math.max(1, a.length - 1); };

// ---------------- The page ----------------
const DEF = { view: "stock", d: 20, sd: 6, L: 5, Q: 200, buf: 30, jit: false, late: 0, H: 0.05, S: 40, short: 8, speed: 1, p: 4, noise: 0.1, step: false, base: 100, Lb: 2 };
const P = {};
let rnd = K.rng(Date.now() % 9973 + 3), ST = null, CH = null, acc = 0;
const ui = K.app({
  title: "Stock Control and the Supply Chain", subject: "Business",
  blurb: "Bar-gate stock graphs, re-order levels, lead times and buffer stock; just-in-time; the cost of holding stock; the bullwhip effect up a supply chain",
  reset: () => set({ view: P.view }),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "GCSE Business (Pearson Edexcel 1BS0) 2.3.2 Working with suppliers: interpreting bar-gate stock graphs (maximum, re-order level, re-order quantity, lead time, buffer stock), just-in-time stock control, the role of procurement and logistics.", adv: "Pearson Edexcel A level Business (9BS0) 2.4.3 Stock control: stock control diagrams, buffer stocks, the implications of poor stock control, JIT, waste minimisation and lean production; 2.4.2 capacity. EOQ and the bullwhip effect are beyond the spec." } },
  missions: [
    { title: "Read the bar-gate graph", q: "Find the re-order level, the lead time and the re-order quantity on the graph. How long does each delivery last?", hint: "Stock falls about 20 a day. At the re-order level (20 × 5 + 30 = 130) an order of 200 goes in; 5 days later it arrives and stock jumps by 200. 200 tyres last about 10 days.", setup() { set({}); } },
    { title: "Why keep a buffer?", q: "Set the buffer stock to 0. How often do the shelves run empty?", hint: "Without a buffer, stock only just lasts the lead time on an average day. On a busier-than-average week it runs out roughly half the time: lost sales and annoyed customers.", setup() { set({ buf: 0 }); } },
    { title: "Longer lead time", q: "The supplier now takes 10 days instead of 5. What must happen to the re-order level?", hint: "Re-order level = usage × lead time + buffer = 20 × 10 + 30 = 230. Order earlier, and the extra uncertainty over a longer wait needs more buffer.", setup() { set({ L: 10, buf: 30 }); } },
    { title: "Just in time", q: "Switch to JIT with a 1-day lead time. How much stock is held now? What is the catch?", hint: "Average stock falls from about 130 to about 30: less cash tied up, less space, less waste. But the business depends completely on its supplier.", setup() { set({ jit: true, L: 1, buf: 10 }); } },
    { title: "JIT with an unreliable supplier", q: "Keep JIT but make 10% of deliveries 3 days late. What happens to lost sales?", hint: "With almost no stock, every late delivery empties the shelves. JIT needs reliable suppliers, close relationships, and often nearby suppliers.", setup() { set({ jit: true, L: 1, buf: 10, late: 0.1 }); } },
    { lvl: "adv", title: "Order big or order often?", q: "Change the re-order quantity. Watch the holding cost and the ordering cost on the cost chart. Where is total cost lowest?", hint: "Big orders: few orders but lots of stock held. Small orders: little stock but many orders. EOQ = √(2 × 20 × 40 ÷ 0.05) ≈ 179 tyres balances them (beyond the spec).", setup() { set({ Q: 60 }); } },
    { lvl: "adv", title: "The bullwhip effect", q: "Switch to the supply chain. Shoppers buy about 100 a week, ±10%. How much do the factory's orders swing?", hint: "Each stage reads the orders below as demand and over-corrects. The swing grows at every step: the factory sees far bigger variation than the shoppers ever made.", setup() { set({ view: "chain" }); } },
    { lvl: "adv", title: "A small step in demand", q: "Make shoppers buy 20% more from week 20. Compare the shop's orders with the factory's.", hint: "A permanent 20% rise produces a huge spike at the factory, then a slump: it looks like a boom then a collapse. Sharing sales data along the chain (and shorter lead times) tames the bullwhip.", setup() { set({ view: "chain", step: true, noise: 0.02 }); } }
  ],
  batch: [
    { title: "Buffer stock and stockouts", question: "How does the chance of running out before a delivery depend on the buffer stock?", how: "Demand 20 ± 6 a day, lead time 5 days, order 200. 2 years per run; result = % of delivery cycles in which the shelves ran empty.", xLabel: "buffer stock (units)", yLabel: "cycles with a stockout (%)", xs: [0, 5, 10, 15, 20, 25, 30, 40], reps: 6, yMin: 0, theory: b => 100 * (1 - Phi((b - 10) / (6 * Math.sqrt(5)))), theoryLabel: "1 − Φ((buffer − d/2) ÷ σ√L)", run: (b, r) => { const S = runStock(Object.assign({}, DEF, { buf: b }), r, 730); return S.cycles ? 100 * S.cycOut / S.cycles : null; }, note: "Each extra σ√L ≈ 13 tyres of buffer cuts the risk sharply. Demand over the lead time varies by σ√L because day-to-day ups and downs partly cancel. Stock is only checked once a day, so on average the order goes in about half a day's sales (d/2 = 10) below the re-order level: the theory allows for that." },
    { title: "Re-order quantity and cost (A level)", question: "How does the daily cost of stock depend on how much is ordered each time?", how: "Holding £0.05 per tyre per day, £40 per order, buffer 30; one year per run.", xLabel: "re-order quantity", yLabel: "holding + ordering cost (£ per day)", xs: [50, 100, 150, 200, 300, 400, 600], reps: 6, theory: Q => 0.05 * (Q / 2 + 30) + 40 * 20 / Q, theoryLabel: "H(Q/2 + buffer) + S·d/Q", run: (Q, r) => { const o = Object.assign({}, DEF, { Q }); const S = runStock(o, r, 365), c = costs(S, o); return c.hold + c.order; }, note: "A U-shape: ordering costs fall as 1/Q while holding costs rise with Q. The bottom is at EOQ = √(2dS/H) ≈ 179." },
    { title: "JIT and late deliveries", question: "With JIT, how do lost sales depend on how often deliveries are late?", how: "JIT, lead time 1 day, buffer 10; one year per run.", xLabel: "deliveries that are 3 days late (%)", yLabel: "sales lost (%)", xs: [0, 2, 5, 10, 15, 20], reps: 6, yMin: 0, run: (x, r) => { const S = runStock(Object.assign({}, DEF, { jit: true, L: 1, buf: 10, late: x / 100 }), r, 365); return 100 * S.lost / (S.lost + S.sold); }, note: "Even a few late deliveries cost sales, because there is almost no buffer to fall back on. Compare: with buffer stock of 30 and a 5-day lead time the same late deliveries matter much less." },
    { title: "Bullwhip and lead time (beyond spec)", question: "How much more do the shop's orders vary than its customers' demand?", how: "One stage (the shop), forecast = average of the last 4 weeks; 300 weeks per run.", xLabel: "lead time L (weeks)", yLabel: "variance of orders ÷ variance of demand", xs: [1, 2, 3, 4, 6, 8], reps: 6, yMin: 0, theory: L => bwTheory(L, 4), theoryLabel: "1 + 2L/p + 2L²/p²", run: (L, r) => { const o = Object.assign({}, DEF, { L, noise: 0.1 }), C = newChain(o); for (let i = 0; i < 300; i++) chainWeek(C, o, r); return variance(C.st[0].orders.slice(50)) / variance(C.demand.slice(50)); }, note: "The amplification grows with the square of the lead time: long lead times mean big safety margins that swing with every forecast change." },
    { title: "Up the chain (beyond spec)", question: "How does the swing in orders grow from shop to factory?", how: "Lead time 2 weeks, 4-week average forecasts, demand ±10%.", xLabel: "stage (1 = shop … 4 = factory)", yLabel: "variance ratio (orders ÷ shoppers)", xs: [1, 2, 3, 4], reps: 6, yMin: 0, theory: k => Math.pow(bwTheory(2, 4), k), theoryLabel: "(1 + 2L/p + 2L²/p²)ᵏ (rough)", run: (k, r) => { const o = Object.assign({}, DEF, { L: 2, noise: 0.1 }), C = newChain(o); for (let i = 0; i < 300; i++) chainWeek(C, o, r); return variance(C.st[k - 1].orders.slice(50)) / variance(C.demand.slice(50)); }, note: "The swing multiplies at each stage, even faster than the rough theory (which treats each stage's demand as random and independent: in fact each stage passes on lumpy, correlated orders, which are amplified even more)." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "1BS0 2.3.2", text: "Bar-gate stock graph: stock falls as it is used and rises vertically when a delivery arrives. Maximum stock, re-order level, re-order quantity, buffer (minimum) stock and lead time can all be read from it." },
      { lvl: "std", tag: "1BS0 2.3.2", text: "Re-order level = usage per day × lead time + buffer stock. Lead time is the time between ordering and receiving stock." },
      { lvl: "std", tag: "1BS0 2.3.2", text: "JIT: stock arrives just as it is needed. Less money tied up, less space and waste; but needs reliable suppliers, no bulk discounts, and production stops if a delivery is late." },
      { lvl: "adv", tag: "9BS0 2.4.3", text: "Too much stock: storage and insurance costs, cash tied up (opportunity cost), waste, obsolescence. Too little: lost sales and reputation, production stoppages, rush orders at higher cost." },
      { lvl: "adv", tag: "9BS0 2.4.3", text: "Lean production minimises waste of all kinds (stock, time, defects, movement). JIT and kaizen are parts of lean; they can give competitive advantage through lower costs." },
      { lvl: "beyond", tag: "Beyond", text: "EOQ = √(2 × annual demand × cost per order ÷ holding cost per unit per year). The bullwhip effect: order variability grows up a supply chain; sharing point-of-sale data and shorter lead times reduce it." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: () => `A shop uses ${P.d} tyres a day. The lead time is ${P.L} days and it keeps a buffer of ${P.buf}. Calculate the re-order level.`, ans: () => `<ul><li>${P.d} × ${P.L} = ${P.d * P.L}</li><li>+ ${P.buf} = ${rol(P)} tyres</li></ul>` },
      { lvl: "std", marks: 3, q: "Explain one advantage and one disadvantage of JIT for a sandwich shop.", ans: "<ul><li>Advantage: fresh ingredients, little waste of perishable stock / less cash tied up (1 + 1 development).</li><li>Disadvantage: if a delivery is late the shop cannot make sandwiches, losing sales (1).</li></ul>" },
      { lvl: "adv", marks: 4, q: "Analyse the possible effects of holding too much stock on a business's cash flow and profit.", ans: "<ul><li>Cash tied up in stock cannot pay bills: liquidity falls, may need an overdraft (1 + 1).</li><li>Holding costs (storage, insurance) and waste/obsolescence reduce profit (1 + 1).</li></ul>" },
      { lvl: "adv", marks: 10, q: "A car maker is considering moving to JIT for all its components. Evaluate whether it should.", ans: "<ul><li>Knowledge: JIT, lean production, buffer stock, supplier relationships.</li><li>Application: thousands of parts; global supply chains; production line stops if one part missing.</li><li>Analysis: lower stockholding, space and cash; higher dependence on suppliers' reliability and transport; lost bulk discounts; quality must be right first time.</li><li>Evaluation: depends on supplier proximity and reliability, risk of disruption (pandemics, shipping), cost of a stoppage; many firms now hold buffer stock of critical parts (\"just in case\"). Justified judgement.</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li>Stock control, one day at a time: deliveries due today arrive; customers want d ± sd items (rounded, never negative); what can't be served is lost; then if stock on hand + on order ≤ re-order level (d × L + buffer), an order of the re-order quantity is placed, arriving L days later (or L + 3 days if it is late).</li>
<li>JIT: every day, order just enough to bring stock on hand + on order back to d × (L + 1) + buffer (the lead time plus the next day).</li>
<li>Costs per day: holding = H × average stock; ordering = S × orders ÷ days; lost sales = lost contribution × units lost ÷ days.</li>
<li>Supply chain (bullwhip): four stages; each forecasts demand as the average of the last p weeks it saw, keeps an order-up-to level L × forecast, and orders (new level − old level + demand last week), never below zero. Its orders are the next stage's demand.</li></ul>
<h3>Assumptions and simplifications</h3>
<ul><li>One product; demand each day is independent of other days; no seasons, promotions or perishability.</li><li>Every delivery is complete and correct; the supplier never runs out (except in the chain view).</li><li>Costs per unit are constant (no bulk discounts); lost customers don't come back later.</li><li>Figures are illustrative.</li></ul>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("What to look at");
ctl.view = K.seg(g, { value: "stock", options: [["stock", "Stock control (one shop)"], ["chain", "Supply chain (A level)"]], on: v => { P.view = v; showGroups(); restart(); } });
const gS = ui.group("Bike-shop tyres");
ctl.d = K.slider(gS, { label: "Average daily demand", min: 5, max: 50, step: 1, value: 20, unit: "a day", on: v => { P.d = v; restart(); } });
ctl.sd = K.slider(gS, { label: "Day-to-day variation (SD)", min: 0, max: 15, step: 1, value: 6, fmt: v => "±" + v, on: v => { P.sd = v; restart(); } });
ctl.L = K.slider(gS, { label: "Lead time", min: 1, max: 15, step: 1, value: 5, unit: "days", on: v => { P.L = v; restart(); } });
ctl.Q = K.slider(gS, { label: "Re-order quantity", min: 20, max: 600, step: 10, value: 200, on: v => { P.Q = v; restart(); } });
ctl.buf = K.slider(gS, { label: "Buffer stock", min: 0, max: 120, step: 5, value: 30, on: v => { P.buf = v; restart(); } });
ctl.jit = K.toggle(gS, { label: "Just-in-time: order a little every day", value: false, on: v => { P.jit = v; restart(); } });
ctl.late = K.slider(gS, { label: "Deliveries that are 3 days late", min: 0, max: 0.3, step: 0.01, value: 0, fmt: v => Math.round(v * 100) + "%", on: v => { P.late = v; restart(); } });
const gC = ui.group("Costs (A level)");
ctl.H = K.slider(gC, { label: "Holding cost per tyre per day", min: 0.01, max: 0.2, step: 0.01, value: 0.05, fmt: v => gbp(v, 2), on: v => P.H = v });
ctl.S = K.slider(gC, { label: "Cost of placing an order", min: 5, max: 150, step: 5, value: 40, fmt: v => gbp(v), on: v => P.S = v });
ctl.short = K.slider(gC, { label: "Contribution lost per missed sale", min: 0, max: 30, step: 1, value: 8, fmt: v => gbp(v), on: v => P.short = v });
const gB = ui.group("Supply chain");
ctl.Lb = K.slider(gB, { label: "Lead time at every stage", min: 1, max: 8, step: 1, value: 2, unit: "weeks", on: v => { P.Lb = v; restart(); } });
ctl.p = K.slider(gB, { label: "Weeks averaged in each forecast", min: 1, max: 12, step: 1, value: 4, on: v => { P.p = v; restart(); } });
ctl.noise = K.slider(gB, { label: "Variation in shoppers' demand", min: 0, max: 0.3, step: 0.01, value: 0.1, fmt: v => "±" + Math.round(v * 100) + "%", on: v => { P.noise = v; restart(); } });
ctl.step = K.toggle(gB, { label: "Shoppers buy 20% more from week 20", value: false, on: v => { P.step = v; restart(); } });
g = ui.group("Play"); ctl.speed = K.slider(g, { label: "Speed", min: 0.25, max: 4, step: 0.25, value: 1, fmt: v => v + "×", on: v => P.speed = v });
const read = K.readout(ui.group("Readings"), [["rol", "re-order level"], ["avg", "average stock held"], ["out", "days with empty shelves"], ["serv", "customers served"], ["cost", "cost per day: hold / order / lost"], ["eoq", "EOQ √(2dS/H) (beyond spec)"], ["bw", "order swing: shop → factory"]]);
function showGroups() { const c = P.view === "chain"; gS.style.display = gC.style.display = c ? "none" : ""; gB.style.display = c ? "" : "none"; }
function restart() { ST = newStock(P); CH = newChain(Object.assign({}, P, { L: P.Lb })); acc = 0; }
function set(o) { Object.assign(P, DEF, o); if (o.view === "chain" && o.L == null) P.Lb = 2; for (const k of ["view", "d", "sd", "L", "Q", "buf", "jit", "late", "H", "S", "short", "Lb", "p", "noise", "step", "speed"]) ctl[k].set(P[k]); showGroups(); restart(); }
// ---------------- Simulation ----------------
function tick(dt) {
  acc += dt * P.speed * (P.view === "chain" ? 4 : 8);     // days (or weeks) per second
  while (acc >= 1) { acc--; if (P.view === "chain") { chainWeek(CH, Object.assign({}, P, { L: P.Lb }), rnd); } else stockDay(ST, P, rnd); }
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function drawStock(c, w, h) {
  const H = ST.hist.slice(-90), L = 70, R = w - 230, T = 56, B = h - 44, smax = Math.max(rol(P) + P.Q + P.d * 2, ...H.map(x => x[1])) * 1.1;
  const d0 = H.length ? H[0][0] : 0, X = d => L + (d - d0) / 90 * (R - L), Y = s => B - s / smax * (B - T);
  TX(c, `Bar-gate stock graph (last 90 days) · day ${ST.day}`, L, 30, "#eef2f8", "left", "600 14px");
  c.strokeStyle = "#2a3550"; c.lineWidth = 1; const st = smax > 500 ? 100 : smax > 200 ? 50 : 25;
  for (let s = 0; s <= smax; s += st) { c.beginPath(); c.moveTo(L, Y(s)); c.lineTo(R, Y(s)); c.stroke(); TX(c, s, L - 6, Y(s) + 4, "#8fa0bf", "right", "11px"); }
  const hl = (v, col, lab, dash) => { c.strokeStyle = col; c.setLineDash(dash || [6, 4]); c.lineWidth = 1.5; c.beginPath(); c.moveTo(L, Y(v)); c.lineTo(R, Y(v)); c.stroke(); c.setLineDash([]); TX(c, lab, R + 6, Y(v) + 4, col, "left", "600 12px"); };
  if (!P.jit) hl(rol(P) + P.Q - P.d * P.L, "#7ee787", "maximum ≈ " + Math.round(rol(P) + P.Q - P.d * P.L), [2, 3]);
  hl(rol(P), "#ffd166", `re-order level ${rol(P)}`); hl(P.buf, "#ff9a5a", `buffer stock ${P.buf}`);
  // stock line: falls during the day, jumps at deliveries (drawn as steps, like a bar-gate graph)
  c.strokeStyle = "#5ad1ff"; c.lineWidth = 2.4; c.beginPath(); let prev = null;
  for (const [d, s] of H) { if (prev == null) c.moveTo(X(d - 1), Y(s)); else { c.lineTo(X(d - 1), Y(prev)); } c.lineTo(X(d), Y(s)); prev = s; }
  c.stroke(); c.lineWidth = 1;
  // empty shelves and orders
  for (const [d, s, dem, q] of H) { if (s === 0 && dem > 0) { c.fillStyle = "rgba(255,92,92,0.35)"; c.fillRect(X(d - 1), T, X(d) - X(d - 1), B - T); } if (q > 0 && !P.jit) { c.fillStyle = "#ffd166"; c.beginPath(); c.moveTo(X(d), B + 4); c.lineTo(X(d) - 5, B + 13); c.lineTo(X(d) + 5, B + 13); c.fill(); } }
  for (const p of ST.pipe) if (!P.jit) { c.strokeStyle = "rgba(255,209,102,0.6)"; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(X(p.placed), B + 8); c.lineTo(X(p.due), B + 8); c.stroke(); c.setLineDash([]); TX(c, "🚚", Math.min(R - 10, X(p.due)), B + 13, "#ffd166", "center", "14px"); }
  c.strokeStyle = "#cfd8ea"; c.strokeRect(L, T, R - L, B - T); TX(c, "days →   ▲ order placed · red = shelves empty, sales lost", L, B + 32, "#8fa0bf", "left", "11.5px");
  TX(c, "stock", L - 40, T - 8, "#8fa0bf", "left", "11px");
  // the shelf: boxes of stock now
  const sx = R + 110, sw = w - sx - 16, n = Math.min(400, ST.stock), per = Math.ceil(Math.max(1, smax) / 200), cols = 10, cs = Math.min(sw / cols, 12);
  TX(c, `On the shelf: ${ST.stock}`, sx, 30, "#eef2f8", "left", "600 13px");
  for (let i = 0; i < Math.ceil(n / per); i++) { c.fillStyle = "#5ad1ff"; c.fillRect(sx + (i % cols) * cs, B - (Math.floor(i / cols) + 1) * cs, cs - 2, cs - 2); }
  TX(c, `(1 box = ${per})`, sx, B + 16, "#8fa0bf", "left", "11px");
}
function drawChain(c, w, h) {
  const names = ["Shoppers", "Shop", "Wholesaler", "Distributor", "Factory"], n = 60, wk = CH.demand.length;
  TX(c, `Supply chain: orders each week (week ${CH.week})`, 20, 30, "#eef2f8", "left", "600 14px");
  const series = [CH.demand].concat(CH.st.map(s => s.orders)), lh = (h - 70) / 5;
  const all = series.flatMap(a => a.slice(-n)), mx = Math.max(150, ...all), cols = ["#cfd8ea", "#5ad1ff", "#7ee787", "#ffd166", "#ff8a70"];
  series.forEach((a, k) => {
    const y0 = 50 + k * lh, yb = y0 + lh - 12, L = 130, R = w - 130, data = a.slice(-n);
    TX(c, names[k], 20, y0 + lh / 2, cols[k], "left", "600 13px"); if (k) TX(c, "orders ↑", 20, y0 + lh / 2 + 16, "#8fa0bf", "left", "11px");
    c.strokeStyle = "#2a3550"; c.beginPath(); c.moveTo(L, yb); c.lineTo(R, yb); c.stroke();
    const Y = v => yb - v / mx * (lh - 16); c.strokeStyle = "#3a4a6b"; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(L, Y(100)); c.lineTo(R, Y(100)); c.stroke(); c.setLineDash([]);
    const bw = (R - L) / n; data.forEach((v, i) => { c.fillStyle = cols[k]; c.globalAlpha = 0.8; c.fillRect(L + i * bw + 1, Math.min(Y(Math.max(0, v)), yb), bw - 2, Math.abs(yb - Y(Math.max(0, v)))); }); c.globalAlpha = 1;
    const sdv = Math.sqrt(variance(a.slice(-100))); TX(c, `swing ±${sdv.toFixed(0)}`, w - 20, y0 + lh / 2, cols[k], "right", "600 12px");
    if (k < 4) TX(c, "▲", L - 20, yb + 10, "#55627f", "center", "12px");
  });
}
function draw() { const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); if (P.view === "chain") drawChain(c, w, h); else drawStock(c, w, h); }

// ---------------- Charts and readings ----------------
function charts() {
  const adv = ui.level === "adv";
  if (P.view === "stock") {
    chA.opts.title = adv ? "Cost per day against re-order quantity" : "Lost sales and stock held (so far)"; chA.opts.xLabel = adv ? "re-order quantity" : ""; chA.opts.yLabel = adv ? "£ per day" : "";
    if (adv) { const hp = [], op = [], tp = []; for (let Q = 20; Q <= 600; Q += 10) { const hh = P.H * (Q / 2 + P.buf), oo = P.S * P.d / Q; hp.push([Q, hh]); op.push([Q, oo]); tp.push([Q, hh + oo]); } chA.draw([{ pts: hp, color: "#5ad1ff", label: "holding" }, { pts: op, color: "#ffd166", label: "ordering" }, { pts: tp, color: "#7ee787", label: "total" }, { pts: [[P.Q, P.H * (P.Q / 2 + P.buf) + P.S * P.d / P.Q]], type: "dots", r: 6, color: "#fff", label: "now" }], { xMin: 0, xMax: 600, yMin: 0, vlines: [{ x: Math.sqrt(2 * P.d * P.S / P.H), label: "EOQ" }] }); }
    else { const sv = ST.sold + ST.lost; chA.draw([{ pts: [[1, ST.sold / Math.max(1, ST.day)], [2, ST.lost / Math.max(1, ST.day)], [3, ST.held / Math.max(1, ST.day)]], type: "bars", w: 0.6, color: "#5ad1ff" }], { xMin: 0.4, xMax: 3.6, xFmt: v => ["", "sold / day", "lost / day", "average stock"][Math.round(v)] || "" }); }
    chB.opts.title = "Daily demand (grey) and stock (blue)"; chB.opts.xLabel = "day"; chB.opts.yLabel = "units";
    const H = ST.hist.slice(-90); chB.draw([{ pts: H.map(x => [x[0], x[2]]), type: "bars", w: 0.8, color: "#55627f", label: "demand" }, { pts: H.map(x => [x[0], x[1]]), color: "#5ad1ff", label: "stock" }], { yMin: 0 });
  } else {
    chA.opts.title = "How much each stage's orders swing (SD)"; chA.opts.xLabel = ""; chA.opts.yLabel = "SD of weekly orders";
    const sds = [CH.demand].concat(CH.st.map(s => s.orders)).map(a => Math.sqrt(variance(a.slice(-150))));
    chA.draw([{ pts: sds.map((v, i) => [i, v]), type: "bars", w: 0.6, color: "#ff8a70" }], { xMin: -0.5, xMax: 4.5, yMin: 0, xFmt: v => ["shoppers", "shop", "wholesaler", "distributor", "factory"][Math.round(v)] || "" });
    chB.opts.title = "Shoppers against factory orders"; chB.opts.xLabel = "week"; chB.opts.yLabel = "units";
    const off = CH.week - CH.demand.length; chB.draw([{ pts: CH.demand.slice(-80).map((v, i, a) => [CH.week - a.length + i + 1, v]), color: "#cfd8ea", label: "shoppers" }, { pts: CH.st[3].orders.slice(-80).map((v, i, a) => [CH.week - a.length + i + 1, v]), color: "#ff8a70", label: "factory orders" }], {});
  }
  const c = costs(ST, P), sv = ST.sold + ST.lost;
  read.set("rol", P.jit ? `top up daily to ${P.d * (P.L + 1) + P.buf}` : `${P.d} × ${P.L} + ${P.buf} = ${rol(P)}`); read.set("avg", (ST.held / Math.max(1, ST.day)).toFixed(0)); read.set("out", `${ST.outDays} of ${ST.day}`); read.set("serv", sv ? (100 * ST.sold / sv).toFixed(1) + "%" : "–");
  read.set("cost", `${gbp(c.hold, 2)} / ${gbp(c.order, 2)} / ${gbp(c.lost, 2)}`); read.set("eoq", Math.round(Math.sqrt(2 * P.d * P.S / P.H)));
  const vd = variance(CH.demand.slice(-150)); read.set("bw", vd > 0 && CH.demand.length > 20 ? `×${(variance(CH.st[0].orders.slice(-150)) / vd).toFixed(1)} → ×${(variance(CH.st[3].orders.slice(-150)) / vd).toFixed(0)} (variance)` : "–");
  ui.hud(P.view === "chain" ? "each stage orders = new target − old target + demand seen" : "re-order level = usage × lead time + buffer stock");
}
let frame = 0;
ui.run(dt => tick(dt), () => { draw(); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("Stock falls as tyres are sold. When it reaches the re-order level, an order goes in; the lorry arrives after the lead time.", 7000);
