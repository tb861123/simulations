/* =====================================================================
   GERRYMANDERING AND DISTRICT MAPS
   In single-member systems (US House elections, Westminster), whoever
   draws the district boundaries can change the result without changing
   a single vote. Two tricks:
     PACKING: put the other side's voters into a few districts they win
       by huge margins (wasting their surplus votes);
     CRACKING: spread the rest thinly across many districts they narrowly
       lose (wasting all of those votes).
   A WASTED VOTE is any vote for a loser, plus any vote for a winner
   beyond the 50% + 1 needed. The EFFICIENCY GAP is
        (Blue wasted − Red wasted) ÷ all votes
   A big gap means one side's votes are being wasted much more.
   Courts and reformers compare a map with thousands of RANDOM legal maps
   (equal population, contiguous): if a map is an extreme outlier, it was
   probably drawn on purpose. In the UK, independent Boundary Commissions
   draw constituencies; in most US states the state legislature does.
   ===================================================================== */
const N = 10, NCELL = N * N, ND = 10;   // a 10 × 10 grid of precincts (1,000 voters each) and 10 districts
// ---------------- Voters: a city (blue-leaning), suburbs and countryside (red-leaning) ----------------
function precincts(o, r) {
  const cx = 2.6, cy = 3.2, raw = [];
  for (let k = 0; k < NCELL; k++) { const x = k % N, y = Math.floor(k / N), d = Math.hypot(x - cx, y - cy), d2 = Math.hypot(x - 7.5, y - 7.8); raw.push(1.6 * Math.exp(-d * d / (2 * o.city * o.city)) + 0.9 * Math.exp(-d2 * d2 / 3) - 0.6 + 0.35 * r.gauss()); }
  // shift every precinct by the same amount until Blue's overall share matches the slider (a uniform swing)
  let lo = -5, hi = 5, sh = 0; const share = s => K.mean(raw.map(v => 1 / (1 + Math.exp(-(v + s) * 1.6))));
  for (let i = 0; i < 40; i++) { sh = (lo + hi) / 2; if (share(sh) < o.blue) lo = sh; else hi = sh; }
  return raw.map(v => 1 / (1 + Math.exp(-(v + sh) * 1.6)));   // Blue share in each precinct
}
// ---------------- District plans ----------------
const nb = k => { const x = k % N, y = Math.floor(k / N), o = []; if (x > 0) o.push(k - 1); if (x < N - 1) o.push(k + 1); if (y > 0) o.push(k - N); if (y < N - 1) o.push(k + N); return o; };
const NB = Array.from({ length: NCELL }, (_, k) => nb(k));
const stripes = () => Array.from({ length: NCELL }, (_, k) => Math.floor(k / N));                     // ten rows
const columns = () => Array.from({ length: NCELL }, (_, k) => k % N);                                 // ten columns
const blocks = () => Array.from({ length: NCELL }, (_, k) => { const x = k % N, y = Math.floor(k / N); return (y < 5 ? 0 : 5) + Math.floor(x / 2); });   // 2 × 5 blocks
function contiguous(plan, d) { // is district d one connected piece?
  const cells = []; for (let k = 0; k < NCELL; k++) if (plan[k] === d) cells.push(k); if (!cells.length) return true;
  const seen = new Set([cells[0]]), st = [cells[0]]; while (st.length) { const k = st.pop(); for (const j of NB[k]) if (plan[j] === d && !seen.has(j)) { seen.add(j); st.push(j); } }
  return seen.size === cells.length;
}
function results(plan, B) { // seats, wasted votes, efficiency gap, district shares
  const v = new Array(ND).fill(0), n = new Array(ND).fill(0); for (let k = 0; k < NCELL; k++) { v[plan[k]] += B[k]; n[plan[k]]++; }
  let seatsB = 0, wB = 0, wR = 0; const shares = [];
  for (let d = 0; d < ND; d++) { if (!n[d]) continue; const b = v[d], r = n[d] - b, need = n[d] / 2; shares.push(b / n[d]); if (b > r) { seatsB++; wB += b - need; wR += r; } else { wR += r - need; wB += b; } }
  const tot = n.reduce((a, c) => a + c, 0);
  return { seatsB, seatsR: shares.length - seatsB, gap: (wB - wR) / tot, shares, sizes: n, wB, wR };
}
/* A random legal map: start from a plan and make many random swaps of two neighbouring precincts in different
   districts (so every district keeps 10 precincts), keeping only swaps that leave both districts in one piece.
   With a score function it becomes a GERRYMANDER MACHINE (simulated annealing): it keeps swaps that help one party. */
function swapStep(plan, r, score, T) {
  // move a precinct k from district a into a neighbouring district b, and in return move a precinct m of b that touches a into a
  const k = r.int(NCELL), a = plan[k], nbs = NB[k].filter(j => plan[j] !== a); if (!nbs.length) return false;
  const b = plan[r.pick(nbs)], cand = []; for (let m = 0; m < NCELL; m++) if (plan[m] === b && m !== k && NB[m].some(j => plan[j] === a && j !== k)) cand.push(m);
  if (!cand.length) return false; const m = r.pick(cand);
  plan[k] = b; plan[m] = a;
  if (!contiguous(plan, a) || !contiguous(plan, b)) { plan[k] = a; plan[m] = b; return false; }
  if (score) { const s1 = score(plan); if (s1 < plan._s && r() > Math.exp((s1 - plan._s) / T)) { plan[k] = a; plan[m] = b; return false; } plan._s = s1; }
  return true;
}
const smoothSeats = (B, side) => plan => { const R = results(plan, B); return R.shares.reduce((s, x) => s + 1 / (1 + Math.exp(-((side > 0 ? x : 1 - x) - 0.5) / 0.015)), 0); };
function randomPlan(r, steps = 1500) { const p = stripes(); for (let i = 0; i < steps; i++) swapStep(p, r); return p; }
function gerrymander(B, side, r, steps = 12000, start) { const p = start ? start.slice() : randomPlan(r, 300), sc = smoothSeats(B, side); p._s = sc(p); for (let i = 0; i < steps; i++) swapStep(p, r, sc, 0.5 * (1 - i / steps) + 0.01); return p; }

// ---------------- The page ----------------
const DEF = { blue: 0.5, city: 2.2, plan: "stripes", speed: 1 };
const P = {};
let rnd = K.rng(Date.now() % 9973 + 3), B = null, plan = null, machine = null, ensemble = [], tt = 0, paintD = -1;
const ui = K.app({
  title: "Gerrymandering and District Maps", subject: "Politics",
  blurb: "Draw the districts, change the result: packing and cracking, wasted votes, the efficiency gap, and testing a map against thousands of random fair maps",
  reset: () => set({}),
  levels: { std: "Standard (core ideas)", adv: "Advanced (A level)", specs: { std: "Core ideas: constituencies and boundaries, how drawing boundaries can change who wins, safe and marginal seats, why independent Boundary Commissions draw UK constituencies.", adv: "Pearson Edexcel A level Politics (9PL0) Component 3 USA: Congress (House elections, incumbency, redistricting and gerrymandering, Supreme Court cases such as Rucho v Common Cause 2019 and Allen v Milligan 2023); Component 1 UK: FPTP, electoral bias and boundary reviews. The efficiency gap and ensemble analysis are beyond the spec." } },
  missions: [
    { title: "Same votes, different winners", q: "Blue has exactly 50% of the votes. Compare rows, columns and blocks as district maps. How many seats does Blue win with each?", hint: "Each map gives a different split, from about 4–6 to 6–4, without any vote changing. Where the lines go matters as much as how people vote.", setup() { set({ plan: "stripes" }); } },
    { title: "Gerrymander for Red", q: "Press 'Gerrymander for Red' and watch the machine redraw the map. How many seats does Red get from 50% of the votes?", hint: "It packs Blue voters into a few districts Blue wins with huge margins and cracks the rest across districts Red wins narrowly: 7 or 8 seats from half the votes.", setup() { set({}); startMachine(-1); } },
    { title: "Now for Blue", q: "Gerrymander the same votes for Blue. How many seats now?", hint: "The same trick works both ways: a party that draws the lines can turn 50% of the votes into most of the seats.", setup() { set({}); startMachine(1); } },
    { title: "Spot the packing", q: "After a gerrymander, find the packed districts (huge margins) and the cracked ones (narrow wins). Which party wastes more votes?", hint: "The victim's votes are wasted in both kinds of district: surplus votes in packed ones, losing votes in cracked ones. The efficiency gap measures the difference.", setup() { set({}); startMachine(-1); } },
    { title: "Draw your own", q: "Click a precinct, then drag across others to add them to its district. Can you give Blue 7 seats? What rule must you break to make it easy?", hint: "It's easy if districts can have different numbers of voters (malapportionment), which is why courts require equal populations ('one person, one vote', Reynolds v Sims 1964).", setup() { set({ plan: "blocks" }); } },
    { lvl: "adv", title: "Is this map an outlier?", q: "Run the ensemble of random legal maps. Where does the gerrymandered map sit compared with them?", hint: "Random fair maps mostly give Blue 4–6 seats. A map giving 2 or 8 is far outside the range: strong statistical evidence of deliberate gerrymandering (used in US state courts).", setup() { set({}); startMachine(-1); } },
    { lvl: "adv", title: "Natural packing", q: "Make the city very concentrated. Even random maps now favour one side. Why?", hint: "Blue voters packed into a dense city waste surplus votes even under neutral maps: 'unintentional gerrymandering' by geography, as with Democrats in cities. Similar efficiency effects create electoral bias in the UK.", setup() { set({ city: 1.3 }); } }
  ],
  batch: [
    { title: "Random fair maps", question: "With 50% of the votes, how many seats does Blue win on random legal maps?", how: "Each run: 1,500 random swaps from rows (about 2 s for all runs); every district has 10 precincts and is in one piece.", yLabel: "Blue seats (of 10)", reps: 150, bins: 11, lo: -0.5, hi: 10.5, theory: 5, theoryLabel: "proportional", run: (x, r) => results(randomPlan(r), precincts(DEF, K.rng(3))).seatsB, note: "Fair maps cluster around 4–6 seats. The spread itself is a warning: even neutral line-drawing changes results, so 'fair' needs defining." },
    { title: "How much can a gerrymander win?", question: "How many seats can a map drawn for Blue win, at different shares of the vote?", how: "Gerrymander machine (12,000 annealing steps) for Blue.", xLabel: "Blue share of the votes (%)", yLabel: "Blue seats (of 10)", xs: [35, 40, 45, 50, 55, 60], reps: 3, yMin: 0, yMax: 10, theory: v => v / 10, theoryLabel: "proportional", run: (v, r) => { const Bv = precincts(Object.assign({}, DEF, { blue: v / 100 }), K.rng(3)); return results(gerrymander(Bv, 1, r), Bv).seatsB; }, note: "A gerrymander can win a majority of seats from well under half of the votes: the dots lie far above the proportional line." },
    { title: "Efficiency gap of fair maps", question: "How big is the efficiency gap on random legal maps?", how: "Blue 50%; random maps as before.", yLabel: "efficiency gap (%)", reps: 150, bins: 20, theory: 0, theoryLabel: "no bias", run: (x, r) => 100 * results(randomPlan(r), precincts(DEF, K.rng(3))).gap, note: "Centred near zero (with a lean from geography): one proposed legal test treated gaps above about 7% as suspicious. Compare with a gerrymandered map's gap." },
    { title: "Seats and votes, rows as districts", question: "With simple row districts, how do seats follow votes?", how: "Rows as districts; uniform swing changes Blue's share.", xLabel: "Blue share of the votes (%)", yLabel: "Blue seats (of 10)", xs: [35, 40, 45, 50, 55, 60, 65], reps: 4, yMin: 0, yMax: 10, theory: v => v / 10, theoryLabel: "proportional", run: (v, r) => results(stripes(), precincts(Object.assign({}, DEF, { blue: v / 100 }), r)).seatsB, note: "A steep S-curve, as under any single-member system: a small swing flips several districts. Random noise in the precincts makes each run a little different." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "Core", text: "A constituency (US: district) elects one representative. Boundaries decide which voters are grouped together, so they can change the result without changing any votes." },
      { lvl: "std", tag: "Core", text: "Gerrymandering = drawing boundaries for party advantage: packing opponents into a few seats and cracking the rest across many. UK boundaries are drawn by independent Boundary Commissions." },
      { lvl: "adv", tag: "9PL0 3 USA", text: "US House districts are redrawn after each census, mostly by state legislatures: partisan gerrymanders create safe seats, fewer competitive races and (with primaries) polarisation; some states use independent commissions." },
      { lvl: "adv", tag: "9PL0 3 USA", text: "Supreme Court: equal populations required (Reynolds v Sims 1964); racial gerrymanders limited by the Voting Rights Act (Allen v Milligan 2023); partisan gerrymandering is a political question federal courts won't decide (Rucho v Common Cause 2019)." },
      { lvl: "adv", tag: "9PL0 1 3.3", text: "Electoral bias in UK FPTP comes from unequal constituency sizes, turnout differences and how efficiently each party's vote is spread, not from deliberate gerrymanders." },
      { lvl: "beyond", tag: "Beyond", text: "Wasted votes: all votes for losers plus winners' votes beyond 50%. Efficiency gap = (wasted A − wasted B) ÷ total votes. Ensemble analysis compares a map with thousands of random legal maps." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: () => { const R = results(plan, B); return `On this map Blue has ${(100 * K.mean(B)).toFixed(0)}% of the votes and wins ${R.seatsB} of 10 seats. Explain how the map could give Blue more seats with the same votes.`; }, ans: "<ul><li>Redraw boundaries so Red voters are packed into a few districts (1)</li><li>and the remaining districts each have a narrow Blue majority (cracking Red), so Blue wins more seats (1).</li></ul>" },
      { lvl: "adv", marks: 3, q: "A district has 1,000 voters: Blue 700, Red 300. How many votes does each party waste?", ans: "<ul><li>Blue needs 501 to win: wastes 700 − 501 = 199 (accept 200) (1)</li><li>Red loses: wastes all 300 (1)</li><li>Packing Blue into such districts wastes many Blue votes (1).</li></ul>" },
      { lvl: "adv", marks: 30, q: "Evaluate the view that the way House districts are drawn undermines democracy in the USA.", ans: "<ul><li>AO1: redistricting process, partisan and racial gerrymandering, Supreme Court cases, independent commissions (e.g. California, Arizona).</li><li>AO2: safe seats, low competition, polarisation via primaries; but geography and self-sorting also explain safe seats; courts and commissions limit abuse.</li><li>AO3: weigh effects on representation, accountability and turnout; judgement.</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li>A 10 × 10 grid of precincts of 1,000 voters each. Blue is strongest in a city (top left) and a smaller town (bottom right); Red in the countryside. Every precinct is shifted by the same amount (a uniform swing) so that Blue's total matches the slider.</li>
<li>10 districts. Seats: the party with more votes in a district wins it. Wasted votes: every vote for the loser, plus the winner's votes above half. Efficiency gap = (Blue wasted − Red wasted) ÷ all votes (positive = Blue's votes are wasted more).</li>
<li>Random legal maps: from rows, make random swaps (a precinct moves into a neighbouring district, and one of that district's precincts touching the first district moves back), keeping only swaps that leave each district in one piece (so sizes stay equal). The gerrymander machine uses the same swaps but keeps those that raise its party's (smoothed) seat count, accepting a few bad ones early on (simulated annealing).</li></ul>
<h3>Assumptions and simplifications</h3>
<ul><li>Everyone votes, for one of two parties; precincts are equal in size and can't be split.</li><li>Real line-drawers also must respect county lines, communities and the Voting Rights Act; this machine only keeps districts equal and in one piece.</li><li>Random maps here come from a simple swap chain, not the carefully designed samplers used in court cases.</li></ul>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("The voters");
ctl.blue = K.slider(g, { label: "Blue share of all votes", min: 0.3, max: 0.7, step: 0.01, value: 0.5, fmt: v => Math.round(v * 100) + "%", on: v => { P.blue = v; B = precincts(P, K.rng(3)); ensemble = []; } });
ctl.city = K.slider(g, { label: "How concentrated is the city?", min: 1.2, max: 4, step: 0.1, value: 2.2, fmt: v => v < 1.8 ? "dense" : v < 2.8 ? "medium" : "spread out", on: v => { P.city = v; B = precincts(P, K.rng(3)); ensemble = []; } });
g = ui.group("Draw the districts");
ctl.plan = K.seg(g, { label: "Start from", value: "stripes", options: [["stripes", "rows"], ["columns", "columns"], ["blocks", "blocks"], ["random", "a random fair map"]], on: v => { P.plan = v; newPlan(); } });
let rr = K.row(g); K.btn(rr, "🔴 Gerrymander for Red", () => startMachine(-1)); K.btn(rr, "🔵 Gerrymander for Blue", () => startMachine(1));
K.note(g, "Or click a precinct and drag over others to put them in its district.");
g = ui.group("Test the map (A level)");
rr = K.row(g); K.btn(rr, "🎲 Run 200 random fair maps", () => runEnsemble(), "primary");
ctl.speed = K.slider(g, { label: "Machine speed", min: 0.25, max: 4, step: 0.25, value: 1, fmt: v => v + "×", on: v => P.speed = v });
ui.headerSpeed(ctl.speed);   // playback speed lives in the header, beside Pause and Reset
const read = K.readout(ui.group("This map"), [["seats", "seats Blue – Red"], ["votes", "votes Blue – Red"], ["wasted", "wasted votes Blue / Red"], ["gap", "efficiency gap"], ["sizes", "district sizes"], ["contig", "every district in one piece?"], ["ens", "random maps with as many Blue seats"]]);
function newPlan() { machine = null; plan = P.plan === "columns" ? columns() : P.plan === "blocks" ? blocks() : P.plan === "random" ? randomPlan(rnd) : stripes(); }
function startMachine(side) { if (!plan) newPlan(); const sc = smoothSeats(B, side); plan._s = sc(plan); machine = { side, sc, step: 0, steps: 9000 }; }
function runEnsemble() { ensemble = []; for (let i = 0; i < 200; i++) ensemble.push(results(randomPlan(rnd, 1200), B).seatsB); }
function set(o) { Object.assign(P, DEF, o); for (const k of ["blue", "city", "plan", "speed"]) ctl[k].set(P[k]); B = precincts(P, K.rng(3)); ensemble = []; newPlan(); }
// ---------------- Simulation: the gerrymander machine works a little each frame ----------------
function tick(dt) {
  if (!machine) return; const n = Math.round(80 * P.speed);
  for (let i = 0; i < n && machine.step < machine.steps; i++, machine.step++) swapStep(plan, rnd, machine.sc, 0.5 * (1 - machine.step / machine.steps) + 0.01);
  if (machine.step >= machine.steps) machine = null;
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
let geo = null;
const cellAt = p => { if (!geo) return -1; const x = Math.floor((p.x - geo.x0) / geo.cs), y = Math.floor((p.y - geo.y0) / geo.cs); return x >= 0 && x < N && y >= 0 && y < N ? y * N + x : -1; };
K.pointer(cv.el, { down: p => { const k = cellAt(p); if (k >= 0) { machine = null; paintD = plan[k]; } }, drag: p => { const k = cellAt(p); if (k >= 0 && paintD >= 0) plan[k] = paintD; }, up: () => paintD = -1 });
const blend = s => { const t = Math.max(0, Math.min(1, (s - 0.2) / 0.6)); return `rgb(${Math.round(225 - 175 * t)},${Math.round(70 + 40 * t)},${Math.round(70 + 170 * t)})`; };
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); if (!plan) return;
  const R = results(plan, B), cs = Math.min((h - 90) / N, w * 0.5 / N), x0 = 30, y0 = 60; geo = { x0, y0, cs };
  TX(c, machine ? `Gerrymander machine working for ${machine.side > 0 ? "Blue" : "Red"}… step ${machine.step}` : "Precincts (colour = how Blue or Red) and district boundaries", x0, 32, machine ? "#ffd166" : "#eef2f8", "left", "600 14px");
  for (let k = 0; k < NCELL; k++) { c.fillStyle = blend(B[k]); c.fillRect(x0 + (k % N) * cs, y0 + Math.floor(k / N) * cs, cs, cs); }
  // district winners: a faint wash, then thick boundaries
  const winB = new Array(ND).fill(false), v = new Array(ND).fill(0), n = new Array(ND).fill(0); for (let k = 0; k < NCELL; k++) { v[plan[k]] += B[k]; n[plan[k]]++; } for (let d = 0; d < ND; d++) winB[d] = v[d] > n[d] / 2;
  c.strokeStyle = "#fff"; c.lineWidth = 3.5; c.beginPath();
  for (let k = 0; k < NCELL; k++) { const x = k % N, y = Math.floor(k / N), X = x0 + x * cs, Y = y0 + y * cs; if (x === N - 1 || plan[k + 1] !== plan[k]) { c.moveTo(X + cs, Y); c.lineTo(X + cs, Y + cs); } if (y === N - 1 || plan[k + N] !== plan[k]) { c.moveTo(X, Y + cs); c.lineTo(X + cs, Y + cs); } if (x === 0) { c.moveTo(X, Y); c.lineTo(X, Y + cs); } if (y === 0) { c.moveTo(X, Y); c.lineTo(X + cs, Y); } }
  c.stroke(); c.lineWidth = 1;
  // label each district at its centre with its winner and margin
  for (let d = 0; d < ND; d++) { let sx = 0, sy = 0; const cells = []; for (let k = 0; k < NCELL; k++) if (plan[k] === d) { sx += k % N; sy += Math.floor(k / N); cells.push(k); } if (!cells.length) continue; let best = cells[0], bd = 1e9; const mx = sx / cells.length, my = sy / cells.length; for (const k of cells) { const dd = (k % N - mx) ** 2 + (Math.floor(k / N) - my) ** 2; if (dd < bd) { bd = dd; best = k; } } const X = x0 + (best % N + 0.5) * cs, Y = y0 + (Math.floor(best / N) + 0.5) * cs; c.fillStyle = winB[d] ? "#1d4fd8" : "#c81e1e"; c.beginPath(); c.arc(X, Y, cs * 0.32, 0, 6.3); c.fill(); c.strokeStyle = "#fff"; c.stroke(); TX(c, Math.round(100 * v[d] / n[d]) + "", X, Y + 4, "#fff", "center", "600 11px"); }
  TX(c, "circles: district winner, with Blue's % of the vote", x0, y0 + N * cs + 18, "#8fa0bf", "left", "11.5px");
  // seat bar and the votes
  const bx = x0 + N * cs + 50, bw = w - bx - 30; TX(c, "Seats", bx, 80, "#eef2f8", "left", "600 14px");
  for (let d = 0; d < ND; d++) { const s = R.shares.slice().sort((a, b) => b - a)[d]; c.fillStyle = s > 0.5 ? "#3b82f6" : "#ef4444"; c.fillRect(bx + d * bw / ND, 92, bw / ND - 4, 34); }
  TX(c, `Blue ${R.seatsB} – ${R.seatsR} Red`, bx, 148, "#eef2f8", "left", "600 18px");
  TX(c, "Votes", bx, 186, "#eef2f8", "left", "600 14px"); const bv = K.mean(B); c.fillStyle = "#3b82f6"; c.fillRect(bx, 196, bw * bv, 22); c.fillStyle = "#ef4444"; c.fillRect(bx + bw * bv, 196, bw * (1 - bv), 22); TX(c, `Blue ${(100 * bv).toFixed(0)}% – ${(100 * (1 - bv)).toFixed(0)}% Red`, bx, 240, "#eef2f8", "left", "600 14px");
  // district shares sorted: packing and cracking show up as a lopsided pattern
  TX(c, "Blue % in each district, lowest to highest", bx, 280, "#eef2f8", "left", "600 13px");
  const sh = R.shares.slice().sort((a, b) => a - b), hh = h - 330; sh.forEach((s, i) => { const X = bx + i * bw / sh.length; c.fillStyle = s > 0.5 ? "#3b82f6" : "#ef4444"; c.fillRect(X + 2, 300 + hh * (1 - s), bw / sh.length - 4, hh * s); });
  c.strokeStyle = "#fff"; c.setLineDash([4, 3]); c.beginPath(); c.moveTo(bx, 300 + hh / 2); c.lineTo(bx + bw, 300 + hh / 2); c.stroke(); c.setLineDash([]); TX(c, "50%", bx + bw, 300 + hh / 2 - 4, "#fff", "right", "11px");
}

// ---------------- Charts and readings ----------------
function charts() {
  if (!plan) return; const R = results(plan, B), tot = NCELL;
  chA.opts.title = "Random fair maps: Blue seats"; chA.opts.xLabel = "Blue seats"; chA.opts.yLabel = "maps";
  if (ensemble.length) { const hg = K.histogram(ensemble, 11, -0.5, 10.5); chA.draw([{ pts: hg.pts, w: hg.w, type: "bars", color: "#8fa0bf", alpha: .8, label: ensemble.length + " random maps" }], { xMin: -0.5, xMax: 10.5, vlines: [{ x: R.seatsB, color: "#ffd166", label: "this map" }] }); }
  else chA.draw([], { xMin: -0.5, xMax: 10.5, title: "Press 🎲 to compare with random fair maps" });
  chB.opts.title = "Wasted votes (thousands)"; chB.opts.xLabel = ""; chB.opts.yLabel = "wasted votes";
  chB.draw([{ pts: [[0, R.wB]], type: "bars", w: 0.5, color: "#3b82f6", label: "Blue" }, { pts: [[1, R.wR]], type: "bars", w: 0.5, color: "#ef4444", label: "Red" }], { xMin: -0.6, xMax: 1.6, yMin: 0, xFmt: v => Math.abs(v - Math.round(v)) < 0.01 ? ["Blue", "Red"][Math.round(v)] || "" : "" });
  read.set("seats", `${R.seatsB} – ${R.seatsR}`); read.set("votes", `${(100 * K.mean(B)).toFixed(1)}% – ${(100 - 100 * K.mean(B)).toFixed(1)}%`); read.set("wasted", `${R.wB.toFixed(1)}k / ${R.wR.toFixed(1)}k`);
  read.set("gap", `${(100 * R.gap).toFixed(1)}% ${Math.abs(R.gap) > 0.07 ? (R.gap > 0 ? "(hurts Blue)" : "(hurts Red)") : "(small)"}`);
  const sz = R.sizes.filter(x => x); read.set("sizes", Math.min(...sz) === Math.max(...sz) ? "all equal (10 precincts)" : `<span style="color:#ff8a70">${Math.min(...sz)} to ${Math.max(...sz)}: unequal!</span>`);
  let ok = true; for (let d = 0; d < ND; d++) if (!contiguous(plan, d)) ok = false; read.set("contig", ok ? "yes" : '<span style="color:#ff8a70">no</span>');
  read.set("ens", ensemble.length ? `${(100 * ensemble.filter(s => R.seatsB > 5 ? s >= R.seatsB : s <= R.seatsB).length / ensemble.length).toFixed(1)}% (${R.seatsB > 5 ? "≥" : "≤"} ${R.seatsB})` : "run the test");
  ui.hud("wasted = votes for the loser + winner's votes above 50%");
}
let frame = 0;
ui.run(dt => tick(dt), () => { draw(); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("Same votes, different lines: try the ready-made maps, then press a gerrymander button.", 7000);
