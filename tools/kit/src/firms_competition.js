/* =====================================================================
   FIRMS, COSTS AND COMPETITION
   A firm makes the most profit at the output where the extra revenue
   from one more unit (marginal revenue, MR) equals the extra cost
   (marginal cost, MC). Whether that profit lasts depends on the market:
   with no barriers, profit attracts new firms, which push the price
   down until profits are normal (price = lowest average cost). With
   high barriers, a few firms (or one) keep the price high.

   Three views:
     * One firm: its costs and revenue, and the profit rectangle
     * Market structures: firms entering and leaving, from monopoly to
       perfect competition (each firm chooses its best output given what
       the others make: the Cournot model)
     * Price game (A level): two firms deciding to charge high or low,
       again and again (the prisoner's dilemma)
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";   // label category axes only at whole numbers

// ---- one firm: cost C(q) = FC + c q + d q² (so MC rises and AC is U-shaped) ----
const FIRM = { FC: 400, c: 10, d: 0.25 };
const TC = q => FIRM.FC + FIRM.c * q + FIRM.d * q * q, MC = q => FIRM.c + 2 * FIRM.d * q, AC = q => q > 0 ? TC(q) / q : Infinity, AVC = q => FIRM.c + FIRM.d * q;
const qMinAC = Math.sqrt(FIRM.FC / FIRM.d), minAC = AC(qMinAC);    // 40 units at £30
// demand facing the firm: a price taker sees a flat AR = P; a price maker sees AR = A − B q
const AR = (q, o) => o.taker ? o.P : Math.max(0, o.A - o.B * q), MR = (q, o) => o.taker ? o.P : o.A - 2 * o.B * q;
function bestQ(o) {   // the output each objective aims for
  let q = 0;
  if (o.obj === "profit") { q = o.taker ? (o.P - FIRM.c) / (2 * FIRM.d) : (o.A - FIRM.c) / (2 * o.B + 2 * FIRM.d); }       // MR = MC
  else if (o.obj === "revenue") q = o.taker ? 120 : o.A / (2 * o.B);                                                          // MR = 0 (a price taker would sell all it could)
  else { let lo = 0, hi = 200; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (AR(m, o) >= AC(m)) lo = m; else hi = m; } q = lo; }   // sales: as many as possible without a loss (AR = AC)
  return Math.max(0, Math.min(150, q));
}

// ---- a market of identical firms (Cournot): demand P = a − b Q; each firm has the cost above plus a sunk entry cost ----
function cournot(n, a, b) { const q = (a - FIRM.c) / (b * (n + 1) + 2 * FIRM.d); const P = a - b * n * q; return { q, P, profit: (P - AVC(q)) * q - FIRM.FC, Q: n * q }; }
/* run a market for some years: entry when profits beat the entry cost, exit after losses
   o = { a (market size), b, barrier (sunk entry cost, £), legal (no entry allowed), n0 }  */
function marketYears(o, r, years) {
  let n = o.n0, hist = [];
  for (let y = 0; y < years; y++) {
    const shock = 1 + 0.04 * r.gauss(), eq = cournot(n, o.a * shock, o.b);
    hist.push({ y, n, P: eq.P, q: eq.q, profit: eq.profit });
    if (!o.legal && eq.profit > o.barrier / 10 && r() < 0.5) n += 1 + Math.min(2, Math.floor((eq.profit - o.barrier / 10) / 3000));   // big profits draw several entrants at once                 // profit beats the yearly cost of the entry investment: a new firm joins
    else if (eq.profit < 0 && n > 1 && r() < 0.6) n--;                           // losses: a firm leaves
  }
  return hist;
}

// ---- the price game: High or Low price, repeated ----
const PAY = { HH: [10, 10], HL: [2, 15], LH: [15, 2], LL: [5, 5] };     // £ thousand profit per round for (me, rival)
const STRATS = {
  cartel: { name: "Always high (cartel)", f: () => "H" },
  undercut: { name: "Always low", f: () => "L" },
  tft: { name: "Tit for tat", f: (my, th) => th.length ? th[th.length - 1] : "H" },
  grim: { name: "Grim trigger", f: (my, th) => th.includes("L") ? "L" : "H" },
  wsls: { name: "Win-stay, lose-shift", f: (my, th) => { if (!my.length) return "H"; const p = PAY[my[my.length - 1] + th[th.length - 1]][0]; return p >= 10 ? my[my.length - 1] : (my[my.length - 1] === "H" ? "L" : "H"); } },
  random: { name: "Random", f: (my, th, r) => r() < 0.5 ? "H" : "L" }
};
function match(sa, sb, rounds, err, r) {
  const A = [], B = [], sc = [0, 0], log = [];
  for (let k = 0; k < rounds; k++) {
    let a = STRATS[sa].f(A, B, r), b = STRATS[sb].f(B, A, r);
    if (r() < err) a = a === "H" ? "L" : "H"; if (r() < err) b = b === "H" ? "L" : "H";      // mistakes: a price set wrongly by accident
    A.push(a); B.push(b); const p = PAY[a + b]; sc[0] += p[0]; sc[1] += p[1]; log.push([k + 1, sc[0], sc[1]]);
  }
  return { A, B, sc, log };
}

// ---------------- The page ----------------
const P = { mode: "firm", taker: false, P: 40, A: 80, B: 0.5, obj: "profit", mkt: "perfect", a: 200, b: 0.1, barrier: 0, legal: false, sa: "tft", sb: "undercut", err: 0, rounds: 30 };
let rnd = K.rng(Date.now() % 99991 + 41), speed = 1, q = 10, dayLog = [], mk = null, game = null, gameT = 0;
const MKT = {
  perfect: { name: "Perfect competition", a: 200, b: 0.1, barrier: 0, legal: false, n0: 3, note: "Many small firms, identical products, no barriers to entry." },
  monocomp: { name: "Monopolistic competition", a: 200, b: 0.5, barrier: 500, legal: false, n0: 2, note: "Many firms with slightly different products (each faces a steeper demand), low barriers." },
  oligopoly: { name: "Oligopoly", a: 200, b: 0.5, barrier: 15000, legal: false, n0: 3, note: "A few large firms; high barriers (big sunk costs, brand loyalty)." },
  monopoly: { name: "Monopoly", a: 200, b: 0.5, barrier: 0, legal: true, n0: 1, note: "One firm; a legal barrier (a patent or licence) stops anyone else entering." }
};
const ui = K.app({
  title: "Firms, Costs and Competition", subject: "Economics",
  blurb: "Costs, revenue and profit; firms entering and leaving; from monopoly to perfect competition",
  reset: () => set({ mode: P.mode }),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "Edexcel International GCSE Economics (4EC1) 1.4 the role of firms: costs (fixed, variable, total, average), revenue, profit and loss; business objectives (profit, revenue, sales maximisation); competitive and monopoly markets; barriers to entry; economies of scale.", adv: "Edexcel A level Economics A (9EC0) Theme 3: costs and revenues (MC, AC, MR), profit maximisation MC = MR, normal and supernormal profit, shutdown; market structures (perfect competition, monopolistic competition, oligopoly, monopoly, contestability), concentration ratios, game theory and collusion." } },
  missions: [
    { title: "Where is profit greatest?", q: "The firm starts by making 10 units a day and moves its output each day to try to earn more. Watch the totals graph. Where does it settle? What is true of MC and MR there?", hint: "Profit = total revenue − total cost, the gap between the TR and TC curves. It is greatest where the curves are furthest apart, which is where their slopes are equal: marginal revenue = marginal cost. Producing one more beyond that adds more to cost than to revenue.", setup() { set({ mode: "firm" }); } },
    { title: "Fixed and variable costs", q: "At an output of 40, read off the fixed cost, variable cost and total cost. Why does average cost fall at first and then rise?", hint: "Fixed costs (£400 here: rent, machines) do not change with output, so spreading them over more units makes the average fall. Variable costs per unit rise as the factory gets crowded (diminishing returns). Together they give a U-shaped average cost, lowest at 40 units (£30 each).", setup() { set({ mode: "firm", taker: true, P: 30 }); } },
    { title: "Different objectives", q: "Switch between profit, revenue and sales maximisation. How do output, price and profit change? Why might a firm not maximise profit?", hint: "Revenue maximisation (MR = 0) and sales maximisation (as much as possible without a loss, AR = AC) both mean more output and a lower price than profit maximisation. Managers may be paid by sales or market share, or a firm may want to grow and keep rivals out.", setup() { set({ mode: "firm", obj: "revenue" }); } },
    { title: "Profit attracts entry", q: "Start a perfectly competitive market with 3 firms making big profits. Watch firms enter. What happens to the price and to each firm's profit? Where does the price settle?", hint: "Supernormal profit with no barriers draws new firms in, raising supply and pushing the price down. Entry stops when profit is normal (zero economic profit): the price ends near the lowest average cost (£30). That is productive efficiency, and price = marginal cost is allocative efficiency.", setup() { set({ mode: "market", mkt: "perfect" }); } },
    { title: "A monopoly", q: "Now a monopoly protected by a legal barrier. Compare its price and profit with the competitive market. Who gains and who loses?", hint: "The monopolist restricts output to where MR = MC and charges a high price, well above average cost, so it keeps supernormal profit for ever. Consumers pay more and buy less; there is a deadweight loss. Patents allow this deliberately, to reward invention.", setup() { set({ mode: "market", mkt: "monopoly" }); } },
    { title: "Barriers to entry", q: "In an oligopoly, raise or lower the cost of entering the market. How many firms survive, and what happens to the price?", hint: "High sunk costs (advertising, research, specialist factories) mean newcomers need years of profit to pay back the investment, so only a few firms stay and prices stay above average cost. Low barriers make the market contestable: the threat of entry keeps prices down even with few firms.", setup() { set({ mode: "market", mkt: "oligopoly" }); } },
    { lvl: "adv", title: "The prisoner's dilemma", q: "Two firms each choose a High or Low price every month. Look at the payoff matrix: what is each firm's dominant strategy? Is the outcome good for them?", hint: "Whatever the rival does, charging Low pays more (15 > 10 if they go High; 5 > 2 if they go Low): Low is dominant, and both Low (5, 5) is the Nash equilibrium. But both High (10, 10) would be better for both. That is why firms are tempted to collude, and why cartels are illegal.", setup() { set({ mode: "game", sa: "undercut", sb: "undercut" }); } },
    { lvl: "adv", title: "Tit for tat", q: "Play tit for tat (copy what the rival did last month) against a cartel member, then against always-low. Then add mistakes. Which strategies do well over many rounds?", hint: "Repeated games change everything: tit for tat cooperates with cooperators and punishes undercutters, so collusion can last without any agreement (tacit collusion). Mistakes can set off long price wars between strict strategies; forgiving ones like win-stay, lose-shift recover.", setup() { set({ mode: "game", sa: "tft", sb: "cartel" }); } }
  ],
  batch: [
    { title: "Where is profit greatest?", question: "How does the firm's profit depend on its output (price maker, demand P = 80 − 0.5q)?", how: "Output 5 to 100; costs vary by ±2% each day. Theory: profit = TR − TC, greatest where MR = MC (q = 46.7).", xLabel: "output a day", yLabel: "profit (£ a day)", xs: [5, 15, 25, 35, 45, 55, 65, 75, 85, 100], reps: 4, theory: x => (80 - 0.5 * x) * x - TC(x), theoryLabel: "TR − TC", run: (x, r) => (80 - 0.5 * x) * x - TC(x) * (1 + 0.02 * r.gauss()), note: "A hill: profit rises while MR > MC and falls once MC > MR. The top is at MR = MC." },
    { title: "More firms, lower prices", question: "How does the market price depend on the number of competing firms?", how: "Cournot competition with demand P = 200 − 0.5Q (±3% shocks); 1 to 20 firms. Theory: P = a − b n q with q = (a − c) ÷ (b(n + 1) + 2d).", xLabel: "number of firms", yLabel: "price (£)", xs: [1, 2, 3, 4, 6, 8, 10, 15, 20], reps: 4, yMin: 0, theory: n => cournot(Math.round(n), 200, 0.5).P, theoryLabel: "Cournot", run: (x, r) => cournot(x, 200 * (1 + 0.03 * r.gauss()), 0.5).P, note: "A monopoly charges the most; each extra rival pushes the price down, quickly at first, then towards marginal cost." },
    { title: "Where does a competitive price settle?", question: "In a perfectly competitive market with free entry and exit, where does the price end up after 80 years?", how: "Each run starts with 3 firms; demand P = 200 − 0.1Q with ±4% yearly shocks; firms enter after profits and leave after losses. Theory: the lowest average cost, £30.", reps: 100, bins: 20, theory: minAC, theoryLabel: "lowest AC", yLabel: "price in year 80 (£)", run: (x, r) => { const h = marketYears({ a: 200, b: 0.1, barrier: 0, legal: false, n0: 3 }, r, 80); return h[h.length - 1].P; }, note: "Prices end near the lowest average cost: profits are competed away (normal profit). They scatter because demand changes each year and entry takes time." },
    { title: "Barriers and the number of firms", question: "How many firms survive as the cost of entering rises?", how: "Demand P = 200 − 0.5Q; sunk entry cost £0 to £30 000; 60 years each.", xLabel: "entry cost (£ thousand)", yLabel: "firms after 60 years", xs: [0, 1, 2, 5, 10, 15, 20, 30], reps: 4, yMin: 0, run: (x, r) => { const h = marketYears({ a: 200, b: 0.5, barrier: x * 1000, legal: false, n0: 1 }, r, 60); return h[h.length - 1].n; }, note: "High barriers protect the firms already there, so the market stays concentrated and prices stay higher." },
    { lvl: "adv", title: "Which pricing strategy earns most?", question: "Over 50 rounds against every strategy (including itself), which one earns most on average, with 5% mistakes?", how: "1 Always high, 2 Always low, 3 Tit for tat, 4 Grim trigger, 5 Win-stay lose-shift, 6 Random. Score = average profit per round over a round-robin.", xLabel: "strategy (1–6)", yLabel: "average profit per round (£k)", xs: [1, 2, 3, 4, 5, 6], reps: 4, yMin: 0, run: (x, r) => { const keys = Object.keys(STRATS), me = keys[x - 1]; let s = 0; for (const k of keys) s += match(me, k, 50, 0.05, r).sc[0]; return s / (50 * keys.length); }, note: "The ranking depends on who else is playing. Here always-low comes top because it exploits the naive always-high and random players; grim trigger and win-stay, lose-shift come close by cooperating with each other and punishing undercutters. In Axelrod's famous tournaments, with fewer naive players, tit for tat won." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4EC1 1.4.3", text: "Fixed costs do not change with output; variable costs do. Total cost = fixed + variable. Average cost = total cost ÷ output." },
      { lvl: "std", tag: "4EC1 1.4.3", text: "Revenue = price × quantity. Profit = total revenue − total cost." },
      { lvl: "std", tag: "4EC1 1.4.5", text: "Business objectives: profit maximisation, revenue maximisation, sales (market share) maximisation, survival." },
      { lvl: "std", tag: "4EC1 1.4.6", text: "Competitive markets have many firms and low barriers: low prices and choice. A monopoly has one firm and high barriers: higher prices, possibly less innovation, but maybe economies of scale." },
      { lvl: "adv", tag: "9EC0 3.3", text: "Profit maximisation: MC = MR. Normal profit: AR = AC; supernormal: AR > AC. Short-run shutdown if price < AVC." },
      { lvl: "adv", tag: "9EC0 3.4", text: "Perfect competition in the long run: P = MC = minimum AC (allocative and productive efficiency). Monopoly: P > MC, deadweight loss, supernormal profit protected by barriers." },
      { lvl: "adv", tag: "9EC0 3.4", text: "Oligopoly: interdependence, concentration ratios, collusion (overt or tacit) and the prisoner's dilemma; contestable markets where the threat of entry disciplines prices." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: () => `At an output of ${Math.round(q)}, total cost is £${TC(q).toFixed(0)}. Calculate the average cost.`, ans: () => `<ul><li>AC = TC ÷ q = ${TC(q).toFixed(0)} ÷ ${Math.round(q)}</li><li>= £${AC(Math.round(q)).toFixed(2)}</li></ul>` },
      { lvl: "std", marks: 3, q: "Explain why a firm with high fixed costs may lower its average cost by producing more.", ans: "<ul><li>fixed costs stay the same however much is produced</li><li>spread over more units, fixed cost per unit falls</li><li>so average cost falls (until rising variable costs per unit outweigh it)</li></ul>" },
      { lvl: "std", marks: 4, q: "Explain how barriers to entry allow a monopoly to keep high profits.", ans: "<ul><li>high profits would normally attract new firms</li><li>barriers (patents, high start-up costs, control of resources, brand loyalty) stop them entering</li><li>so supply does not increase and the price stays high</li><li>the monopoly keeps supernormal profit in the long run</li></ul>" },
      { lvl: "adv", marks: 3, q: "Explain why profit is maximised where MC = MR.", ans: "<ul><li>if MR > MC, producing one more unit adds more to revenue than cost: profit rises</li><li>if MC > MR, the last unit lowered profit</li><li>so profit is greatest where they are equal</li></ul>" },
      { lvl: "adv", marks: 4, q: "Using the payoff matrix (both high 10/10, one low 15/2, both low 5/5), explain why firms may end up charging low prices and how repetition can change this.", ans: "<ul><li>low is the dominant strategy: better whatever the rival does</li><li>both choose low: Nash equilibrium (5, 5), worse for both than (10, 10)</li><li>in a repeated game, strategies such as tit for tat punish undercutting</li><li>so tacit collusion at high prices can be sustained</li></ul>" }
    ]
  },
  notes: `<h3>What is being modelled</h3>
<ul><li><b>Costs</b>: total cost = £400 + £10 q + £0.25 q². So MC = 10 + 0.5 q, and AC is U-shaped with its lowest point at q = 40, AC = £30.</li>
<li><b>One firm</b>: a price taker faces a fixed price; a price maker faces demand P = A − B q, so MR = A − 2B q. Each day the firm moves a third of the way towards the output its objective calls for.</li>
<li><b>Markets</b>: identical firms with these costs share demand P = a − b Q. Each firm chooses the output that maximises its profit given what the others make (Cournot). Each year demand changes by about ±4%; if profit beats a tenth of the sunk entry cost a new firm may join; after a loss a firm may leave. A legal barrier blocks entry entirely.</li>
<li><b>Price game</b>: payoffs per round (both high £10k each; one low £15k against £2k; both low £5k each). Mistakes flip a choice by accident.</li></ul>
<h3>Simplifications</h3>
<ul><li>Firms in a market are identical and products are not differentiated (monopolistic competition is shown by a steeper demand for each firm).</li>
<li>There are no economies of scale beyond the U-shaped cost curve; the earlier version had a view of economies of scale, price discrimination, cartels and the kinked demand curve.</li>
<li>All numbers are illustrative.</li></ul>
<p>The earlier version of this simulation, with its worksheets, is kept in <a href="original/firms-competition.html">original/firms-competition.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {}, grp = {};
let g = ui.group("View");
ctl.mode = K.seg(g, { value: "firm", options: [["firm", "🏭 One firm"], ["market", "🏪 Market structures"], ["game", "🎲 Price game (A level)"]], on: v => set({ mode: v }) });
grp.firm = g = ui.group("The firm");
ctl.taker = K.seg(g, { label: "Demand", value: false, options: [[true, "Price taker (flat AR)"], [false, "Price maker (AR slopes down)"]], on: v => { P.taker = v; showFirm(); } });
ctl.P = K.slider(g, { label: "Market price", min: 5, max: 70, step: 1, value: 40, unit: "£", on: v => P.P = v });
ctl.A = K.slider(g, { label: "Demand: highest price (A)", min: 30, max: 120, step: 1, value: 80, unit: "£", on: v => P.A = v });
ctl.obj = K.seg(g, { label: "Objective", value: "profit", options: [["profit", "Profit (MC = MR)"], ["revenue", "Revenue (MR = 0)"], ["sales", "Sales (AR = AC)"]], on: v => P.obj = v });
grp.market = g = ui.group("The market");
ctl.mkt = K.seg(g, { value: "perfect", options: Object.entries(MKT).map(([k, m]) => [k, m.name]), on: v => set({ mode: "market", mkt: v }) });
const mNote = K.note(g, "");
ctl.barrier = K.slider(g, { label: "Cost of entering (sunk)", min: 0, max: 30000, step: 500, value: 0, fmt: v => "£" + v.toLocaleString(), on: v => P.barrier = v });
ctl.legal = K.toggle(g, { label: "Legal barrier (no new firms allowed)", value: false, on: v => P.legal = v });
ctl.a = K.slider(g, { label: "Size of the market", min: 100, max: 300, step: 10, value: 200, on: v => P.a = v });
K.btn(K.row(g), "↺ Start the market again", () => newMarket(), "primary");
grp.game = g = ui.group("Two firms, repeated");
ctl.sa = K.seg(g, { label: "Firm A plays", value: "tft", options: Object.entries(STRATS).map(([k, s]) => [k, s.name]), on: v => { P.sa = v; newGame(); } });
ctl.sb = K.seg(g, { label: "Firm B plays", value: "undercut", options: Object.entries(STRATS).map(([k, s]) => [k, s.name]), on: v => { P.sb = v; newGame(); } });
ctl.err = K.slider(g, { label: "Mistakes", min: 0, max: 0.2, step: 0.01, value: 0, fmt: v => Math.round(v * 100) + "% of moves", on: v => { P.err = v; newGame(); } });
K.btn(K.row(g), "↺ Play again", () => newGame(), "primary");
g = ui.group("Watch");
ctl.speed = K.slider(g, { label: "Speed", min: 0.25, max: 5, step: 0.25, value: 1, fmt: v => "× " + v, on: v => speed = v });
ui.headerSpeed(ctl.speed);   // playback speed lives in the header, beside Pause and Reset
const read = K.readout(g, [["a", ""], ["b", ""], ["c", ""], ["d", ""]]);
const relabel = l => l.forEach((x, i) => read.el.children[i].firstElementChild.textContent = x);
function showFirm() { ctl.P.el.style.display = P.taker ? "" : "none"; ctl.A.el.style.display = P.taker ? "none" : ""; }
function newMarket() { mk = { n: MKT[P.mkt].n0, hist: [], y: 0, acc: 0, firms: [] }; for (let i = 0; i < mk.n; i++) mk.firms.push({ age: 99 }); }
function newGame() { game = match(P.sa, P.sb, P.rounds, P.err, rnd); gameT = 0; }
function set(o) {
  const m = MKT[o.mkt || "perfect"];
  Object.assign(P, { taker: false, P: 40, A: 80, B: 0.5, obj: "profit", mkt: "perfect", a: m.a, b: m.b, barrier: m.barrier, legal: m.legal, sa: "tft", sb: "undercut", err: 0 }, o);
  for (const k of ["P", "A", "barrier", "a", "err"]) ctl[k].set(P[k]); for (const k of ["mode", "taker", "obj", "mkt", "sa", "sb"]) ctl[k].set(P[k]); ctl.legal.set(P.legal);
  for (const k in grp) grp[k].style.display = k === P.mode ? "" : "none"; showFirm(); q = 10; dayLog = []; newMarket(); newGame(); mNote.textContent = m.note;
  chA.opts.title = { firm: "Total revenue and total cost", market: "Price and the lowest average cost", game: "Running total profit" }[P.mode];
  chB.opts.title = { firm: "Profit each day", market: "Number of firms", game: "Payoff matrix: profit per round (£k)" }[P.mode];
  relabel({ firm: ["output", "price", "average cost", "profit a day"], market: ["firms", "price", "profit per firm", "concentration (CR4 · HHI)"], game: ["round", "firm A total", "firm B total", "both high (cooperating)"] }[P.mode]);
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const T = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function costDiagram(c, x0, y0, w, h, o, qNow, curves) {
  const X = qq => x0 + 40 + qq / 120 * (w - 60), Y = v => y0 + h - 30 - v / 100 * (h - 50);
  c.strokeStyle = "#7d8aa5"; c.lineWidth = 1; c.beginPath(); c.moveTo(X(0), Y(100)); c.lineTo(X(0), Y(0)); c.lineTo(X(120), Y(0)); c.stroke();
  T(c, "£ per unit", X(0) - 8, Y(100) - 6, "#aab6cc", "left", "11px"); T(c, "output", X(120), Y(0) + 18, "#aab6cc", "right", "11px"); for (const v of [0, 20, 40, 60, 80, 100]) T(c, v, X(0) - 5, Y(v) + 4, "#7d8aa5", "right", "10px"); for (const v of [0, 40, 80, 120]) T(c, v, X(v), Y(0) + 14, "#7d8aa5", "center", "10px");
  // profit (or loss) rectangle: (AR − AC) × q
  const ar = curves.ar(qNow), ac = AC(qNow); if (qNow > 0.5 && isFinite(ac)) { c.fillStyle = ar >= ac ? "rgba(127,227,160,0.25)" : "rgba(255,93,108,0.25)"; c.fillRect(X(0), Y(Math.max(ar, ac)), X(qNow) - X(0), Y(Math.min(ar, ac)) - Y(Math.max(ar, ac))); T(c, ar >= ac ? "profit" : "loss", X(qNow / 2), Y((ar + ac) / 2) + 4, ar >= ac ? "#7fe3a0" : "#ff5d6c", "center", "600 12px"); }
  const line = (f, col, lab, dash) => { c.strokeStyle = col; c.lineWidth = 2.2; c.setLineDash(dash || []); c.beginPath(); let first = true; for (let qq = 1; qq <= 120; qq += 1) { const v = f(qq); if (!isFinite(v) || v > 105 || v < -5) { first = true; continue; } first ? c.moveTo(X(qq), Y(v)) : c.lineTo(X(qq), Y(v)); first = false; } c.stroke(); c.setLineDash([]); let lq = 115; while (lq > 2 && !(f(lq) <= 100 && f(lq) >= 0)) lq -= 3; T(c, lab, X(lq) + 4, Y(f(lq)) - 4, col, "left", "600 11px"); };
  line(AC, "#ffb347", "AC"); if (ui.level === "adv") line(AVC, "#c9a96a", "AVC", [4, 3]); line(MC, "#ff5d6c", "MC");
  line(curves.ar, "#6fb1ff", curves.arLab || "AR"); if (curves.mr) line(curves.mr, "#7fe3a0", "MR", [6, 4]);
  c.strokeStyle = "#eef2f8"; c.setLineDash([2, 3]); c.beginPath(); c.moveTo(X(qNow), Y(0)); c.lineTo(X(qNow), Y(Math.max(ar, 0))); c.stroke(); c.setLineDash([]); c.fillStyle = "#fff"; c.beginPath(); c.arc(X(qNow), Y(ar), 5, 0, 6.3); c.fill();
}
function drawFirm(c, w, h) {
  const o = { taker: P.taker, P: P.P, A: P.A, B: P.B, obj: P.obj };
  costDiagram(c, 10, 30, w * 0.62, h - 30, o, q, { ar: qq => AR(qq, o), mr: o.taker ? null : qq => MR(qq, o), arLab: o.taker ? "AR = MR = P" : "AR (demand)" });
  const x = w * 0.66; let y = 140; const L = (s, col = "#eef2f8", f = "13px") => { T(c, s, x, y, col, "left", f); y += 22; };
  const qq = Math.round(q), pr = AR(qq, o), tr = pr * qq, tc = TC(qq);
  L(`Making ${qq} a day at £${pr.toFixed(2)} each`, "#eef2f8", "600 14px"); y += 4;
  L(`fixed cost £${FIRM.FC}`); L(`variable cost £${(tc - FIRM.FC).toFixed(0)}`); L(`total cost £${tc.toFixed(0)}`, "#ffb347"); L(`total revenue £${tr.toFixed(0)}`, "#6fb1ff");
  L(`profit £${(tr - tc).toFixed(0)} a day`, tr >= tc ? "#7fe3a0" : "#ff5d6c", "600 15px"); y += 6;
  L(`MC £${MC(qq).toFixed(1)} · MR £${(o.taker ? o.P : MR(qq, o)).toFixed(1)}`, "#aab6cc");
  if (ui.level === "adv" && o.taker) { L(`shutdown below £${FIRM.c.toFixed(0)} (lowest AVC)`, "#c9a96a", "12px"); L(`break-even at £${minAC.toFixed(0)} (lowest AC)`, "#ffb347", "12px"); }
}
function drawMarket(c, w, h) {
  const eq = cournot(mk.n, P.a, P.b), gw = w * 0.42, n = mk.n, cols = Math.ceil(Math.sqrt(n * 1.6)), cell = Math.min(60, (gw - 20) / cols), sz = cell * 0.8 * Math.min(1, 0.4 + eq.q / 60);
  T(c, `${MKT[P.mkt].name}: ${n} firm${n > 1 ? "s" : ""}`, 20, 34, "#eef2f8", "left", "600 15px");
  mk.firms.forEach((f, i) => { const x = 24 + (i % cols) * cell, y = 60 + Math.floor(i / cols) * cell; c.fillStyle = eq.profit > 1 ? "#7fe3a0" : eq.profit < -1 ? "#ff5d6c" : "#ffd166"; c.globalAlpha = f.age < 2 ? 0.5 + 0.5 * Math.sin(performance.now() / 120) : 1; c.fillRect(x, y, sz, sz); c.globalAlpha = 1; if (f.age < 2) T(c, "new", x + sz / 2, y + sz / 2 + 4, "#0b1020", "center", "600 10px"); });
  if (mk.leaving) { T(c, "a firm has left", 24, h - 20, "#ff5d6c", "left", "600 12px"); }
  // a typical firm's diagram: its own AR (residual demand given the others' output), MR, MC and AC
  const others = (n - 1) * eq.q, o = { taker: false, A: P.a - P.b * others, B: P.b };
  costDiagram(c, gw + 10, 20, w - gw - 20, h - 20, o, eq.q, { ar: qq => o.A - o.B * qq, mr: qq => o.A - 2 * o.B * qq, arLab: "AR (this firm)" });
}
function drawGame(c, w, h) {
  const G2 = game, k = Math.min(G2.A.length, Math.floor(gameT));
  // payoff matrix
  const mx = 30, my = 60, cw = 120, ch = 54; T(c, "Firm B →", mx + 100 + cw, my - 24, "#aab6cc", "center"); T(c, "Firm A ↓", mx, my + ch + 10, "#aab6cc");
  [["H", "High price"], ["L", "Low price"]].forEach(([b, lb], j) => T(c, lb, mx + 100 + cw * j + cw / 2, my - 6, "#eef2f8", "center", "600 12px"));
  [["H", "High"], ["L", "Low"]].forEach(([a, la], i) => { T(c, la, mx + 90, my + ch * i + ch / 2 + 4, "#eef2f8", "right", "600 12px"); [["H"], ["L"]].forEach(([b], j) => { const p = PAY[a + b], x = mx + 100 + cw * j, y = my + ch * i, last = k > 0 && G2.A[k - 1] === a && G2.B[k - 1] === b; c.fillStyle = last ? "rgba(255,209,102,0.25)" : "rgba(255,255,255,0.05)"; c.fillRect(x, y, cw - 4, ch - 4); T(c, `${p[0]} , ${p[1]}`, x + cw / 2, y + ch / 2 + 4, a + b === "LL" ? "#ffd166" : "#eef2f8", "center", "600 14px"); if (a + b === "LL") T(c, "Nash ★", x + cw / 2, y + ch - 10, "#ffd166", "center", "10px"); }); });
  // the match so far: one square per round, green high, red low
  const sx = 30, sy = my + 2 * ch + 50, sq = Math.min(22, (w - 60) / G2.A.length);
  T(c, STRATS[P.sa].name, sx, sy - 8, "#eef2f8", "left", "600 12px"); T(c, STRATS[P.sb].name, sx, sy + sq + 36, "#eef2f8", "left", "600 12px");
  for (let i = 0; i < k; i++) { c.fillStyle = G2.A[i] === "H" ? "#7fe3a0" : "#ff5d6c"; c.fillRect(sx + i * sq, sy, sq - 2, sq - 2); c.fillStyle = G2.B[i] === "H" ? "#7fe3a0" : "#ff5d6c"; c.fillRect(sx + i * sq, sy + sq + 4, sq - 2, sq - 2); }
  T(c, "■ high price   ■ low price", sx, sy + 2 * sq + 60, "#aab6cc"); c.fillStyle = "#7fe3a0"; c.fillRect(sx - 2, sy + 2 * sq + 50, 10, 10); c.fillStyle = "#ff5d6c"; c.fillRect(sx + 82, sy + 2 * sq + 50, 10, 10);
}
function draw() { const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); ({ firm: drawFirm, market: drawMarket, game: drawGame })[P.mode](c, w, h); }

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => {
  if (!(dt > 0)) return; const s = dt * speed;
  if (P.mode === "firm") { const o = { taker: P.taker, P: P.P, A: P.A, B: P.B, obj: P.obj }; q += (bestQ(o) - q) * Math.min(1, s * 0.8); if (!dayLog.length || frame % 15 === 0) { dayLog.push([dayLog.length, (AR(q, o) - AC(q)) * q]); if (dayLog.length > 200) dayLog.shift(); } }
  else if (P.mode === "market") {
    mk.acc += s; if (mk.acc > 0.6) { mk.acc = 0; const step = marketYears({ a: P.a, b: P.b, barrier: P.barrier, legal: P.legal, n0: mk.n }, rnd, 2); const before = mk.n; mk.n = step[1].n; mk.y++; mk.hist.push({ y: mk.y, P: step[0].P, n: step[0].n, profit: step[0].profit }); if (mk.hist.length > 150) mk.hist.shift();
      for (const f of mk.firms) f.age++; while (mk.firms.length < mk.n) mk.firms.push({ age: 0 }); mk.leaving = mk.firms.length > mk.n; if (mk.leaving) mk.firms.splice(Math.floor(rnd() * mk.firms.length), mk.firms.length - mk.n); }
  } else gameT = Math.min(game.A.length, gameT + s * 2);
}, () => {
  draw(); if (frame++ % 5) return;
  if (P.mode === "firm") {
    const o = { taker: P.taker, P: P.P, A: P.A, B: P.B, obj: P.obj }, tr = [], tc = []; for (let qq = 0; qq <= 120; qq += 2) { tr.push([qq, AR(qq, o) * qq]); tc.push([qq, TC(qq)]); }
    chA.opts.xLabel = "output a day"; chA.opts.yLabel = "£ a day"; chB.opts.xLabel = "day"; chB.opts.yLabel = "profit (£)";
    chA.draw([{ pts: tr, color: "#6fb1ff", label: "TR" }, { pts: tc, color: "#ffb347", label: "TC" }, { pts: [[q, AR(q, o) * q], [q, TC(q)]], color: "#7fe3a0", width: 3, label: "profit gap" }], { xMin: 0, xMax: 120, yMin: 0 });
    chB.draw([{ pts: dayLog, color: "#7fe3a0", label: "profit" }], { hlines: [{ y: 0, color: "#7d8aa5" }] });
    read.set("a", Math.round(q) + " a day"); read.set("b", "£" + AR(q, o).toFixed(2)); read.set("c", "£" + AC(q).toFixed(2)); read.set("d", "£" + ((AR(q, o) - AC(q)) * q).toFixed(0));
    ui.hud(`MC £${MC(q).toFixed(1)} · MR £${(o.taker ? o.P : MR(q, o)).toFixed(1)}<br>${Math.abs(MC(q) - (o.taker ? o.P : MR(q, o))) < 1 ? "<b>MC = MR</b>: most profit" : MC(q) < (o.taker ? o.P : MR(q, o)) ? "MR > MC: making more adds profit" : "MC > MR: making less adds profit"}`);
  } else if (P.mode === "market") {
    const H = mk.hist, eq = cournot(mk.n, P.a, P.b); chA.opts.xLabel = "year"; chA.opts.yLabel = "£"; chB.opts.xLabel = "year"; chB.opts.yLabel = "firms";
    chA.draw([{ pts: H.map(x => [x.y, x.P]), color: "#6fb1ff", label: "price" }], { yMin: 0, hlines: [{ y: minAC, color: "#ffb347", label: "lowest AC (£30)" }] });
    chB.draw([{ pts: H.map(x => [x.y, x.n]), color: "#7fe3a0", label: "firms" }], { yMin: 0 });
    read.set("a", mk.n); read.set("b", "£" + eq.P.toFixed(1)); read.set("c", "£" + eq.profit.toFixed(0) + " a year"); read.set("d", `${Math.min(100, Math.round(400 / mk.n))}% · ${Math.round(10000 / mk.n)}`);
    ui.hud(`year ${mk.y} · price £${eq.P.toFixed(1)}<br>each firm: ${eq.profit > 1 ? '<b style="color:#7fe3a0">supernormal profit</b>' : eq.profit < -1 ? '<b style="color:#ff5d6c">loss</b>' : "normal profit"}`);
  } else {
    const k = Math.min(game.A.length, Math.floor(gameT)), L = game.log.slice(0, k);
    chA.opts.xLabel = "round"; chA.opts.yLabel = "£ thousand"; chB.opts.xLabel = ""; chB.opts.yLabel = "";
    chA.draw([{ pts: L.map(x => [x[0], x[1]]), color: "#ff8a70", label: "firm A" }, { pts: L.map(x => [x[0], x[2]]), color: "#6fb1ff", label: "firm B" }, { pts: [[0, 0], [P.rounds, 10 * P.rounds]], color: "#7fe3a0", dash: [5, 4], label: "if both always high" }], { xMin: 0, xMax: P.rounds, yMin: 0 });
    chB.opts.xFmt = whole(v => ["", "both high", "A low", "B low", "both low"][Math.round(v)] || ""); chB.draw([{ pts: [[1, 10], [2, 15], [3, 2], [4, 5]], type: "bars", w: 0.35, color: "#ff8a70", label: "firm A" }, { pts: [[1.4, 10], [2.4, 2], [3.4, 15], [4.4, 5]], type: "bars", w: 0.35, color: "#6fb1ff", label: "firm B" }], { xMin: 0.5, xMax: 4.9, yMin: 0 });
    const both = game.A.slice(0, k).filter((a, i) => a === "H" && game.B[i] === "H").length;
    read.set("a", `${k} of ${P.rounds}`); read.set("b", `£${L.length ? L[L.length - 1][1] : 0}k`); read.set("c", `£${L.length ? L[L.length - 1][2] : 0}k`); read.set("d", k ? Math.round(100 * both / k) + "%" : "–");
    ui.hud(`each round: both high 10 + 10 · one undercuts 15 + 2 · both low 5 + 5`);
  }
  if (P.mode !== "game") chB.opts.xFmt = null;
  ctl.mode.el.querySelectorAll("button")[2].style.display = ui.level === "adv" ? "" : "none"; if (ui.level !== "adv" && P.mode === "game") set({ mode: "firm" });
});
set({});
ui.tip("The firm adjusts its output each day · switch views at the top of the controls", 7000);
