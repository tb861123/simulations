/* =====================================================================
   ELECTORAL SYSTEMS
   The SAME votes can give very different parliaments. Every voter here
   fills in a ranked ballot (1st, 2nd, 3rd choice …), and each system
   reads it differently:
     FPTP (Westminster): one MP per constituency; the candidate with the
       most first choices wins, even with far less than half.
     SV (supplementary vote: mayors until 2023): only the top two stay;
       other ballots move to whichever of those two was their 2nd choice.
     AV (alternative vote; rejected in the 2011 referendum): eliminate
       the last-placed candidate and move their ballots on, until someone
       has over half.
     STV (Northern Ireland Assembly, Scottish councils): several MPs per
       large constituency; quota = votes ÷ (seats + 1) + 1; surpluses and
       eliminated candidates' ballots transfer.
     AMS (Scottish Parliament): FPTP constituency seats, then top-up list
       seats shared by the D'Hondt rule, divisor = list votes ÷ (seats won + 1).
     LIST PR (D'Hondt): seats in proportion to national votes, above a threshold.
   PROPORTIONALITY: the Gallagher index LSq = √(½ Σ (vote % − seat %)²);
   0 = perfectly proportional, above ~10 = very disproportional.
   ===================================================================== */
// ---------------- Parties: left–right position (used for later preferences), colour ----------------
const PARTIES = [
  { id: "G", name: "Green", x: -0.8, col: "#5fcf6f" },
  { id: "L", name: "Labour", x: -0.4, col: "#e4003b" },
  { id: "N", name: "Nationalist", x: -0.3, col: "#fdf38e", regional: true },
  { id: "D", name: "Lib Dem", x: 0.05, col: "#faa61a" },
  { id: "C", name: "Conservative", x: 0.45, col: "#0087dc" },
  { id: "R", name: "Reform", x: 0.85, col: "#12b6cf" }
];
const NP = PARTIES.length, ROWS = 10, COLS = 10, NC = ROWS * COLS, NB = 240;   // 100 constituencies, 240 sample ballots each
// Preset national first-preference shares (%) and how concentrated each party's vote is geographically
const PRESETS = {
  uk24: { name: "UK 2024-like", v: [7, 34, 3, 12, 24, 15], conc: [0.25, 0.25, 1, 0.8, 0.3, 0.15] },
  two: { name: "Two big parties", v: [1, 46, 0, 9, 44, 0], conc: [0.2, 0.2, 1, 0.3, 0.2, 0.2] },
  frag: { name: "Five-way split", v: [12, 22, 3, 18, 21, 24], conc: [0.3, 0.35, 1, 0.6, 0.35, 0.25] }
};
const SYS = [["fptp", "FPTP"], ["sv", "SV"], ["av", "AV"], ["stv", "STV"], ["ams", "AMS"], ["list", "List PR"]];

/* ---------------- Make the electorate ----------------
   Each party has a smooth "geography" field across the 10 × 10 grid; its share in a constituency is its national share
   × e^(1.6 × concentration × field), scaled so the national shares come out as set. The Nationalists only stand in the top two rows (their region).
   Each sample ballot ranks parties: first choice drawn from the constituency's shares, the rest ordered by closeness
   on the left–right scale to that first choice, with some randomness. */
function geography(r) {
  const g = PARTIES.map(() => { const blobs = []; for (let k = 0; k < 4; k++) blobs.push([r() * COLS, r() * ROWS, r.gauss()]); const f = []; for (let c = 0; c < NC; c++) { const x = c % COLS, y = Math.floor(c / COLS); let s = 0; for (const [bx, by, a] of blobs) s += a * Math.exp(-((x - bx) ** 2 + (y - by) ** 2) / 12); f.push(s); } const m = K.mean(f), sd = K.sd(f) || 1; return f.map(v => (v - m) / sd); });
  g[4] = g[1].map(v => -v);   // Labour and Conservative strongholds are opposites (towns against shires), as in real two-party politics
  return g;
}
function electorate(o, geo, r) {
  // constituency shares; the multipliers m are adjusted a few times so the national shares come out as set
  const tot = o.v.reduce((a, b) => a + b, 0) || 1, target = o.v.map(v => v / tot), m = new Array(NP).fill(1), noise = [];
  for (let c = 0; c < NC; c++) noise.push(PARTIES.map(() => 0.12 * r.gauss()));
  const shares = () => { const W = []; for (let c = 0; c < NC; c++) { const y = Math.floor(c / COLS); let w = PARTIES.map((p, i) => p.regional && y >= 2 ? 0 : target[i] * m[i] * Math.exp(o.conc[i] * 1.6 * geo[i][c] + noise[c][i])); const s = w.reduce((a, b) => a + b, 0) || 1; W.push(w.map(v => v / s)); } return W; };
  let W = shares();
  for (let it = 0; it < 8; it++) { for (let i = 0; i < NP; i++) { const nat = K.mean(W.map(w => w[i])); if (nat > 0) m[i] *= target[i] / nat; } W = shares(); }
  const cons = [];
  for (let c = 0; c < NC; c++) {
    const w = W[c];
    const ballots = [];
    for (let b = 0; b < NB; b++) {
      let u = r(), first = 0; while (first < NP - 1 && u > w[first]) { u -= w[first]; first++; }
      const rest = PARTIES.map((p, i) => [i, Math.abs(p.x - PARTIES[first].x) + 0.35 * r.gauss() + (w[i] ? 0 : 9)]).filter(([i]) => i !== first).sort((a, b) => a[1] - b[1]).map(q => q[0]).filter(i => w[i] > 0);
      ballots.push([first].concat(rest.slice(0, o.depth - 1)));
    }
    cons.push({ ballots, w });
  }
  return cons;
}
// national first-preference vote shares actually produced (the constituencies are equal-sized)
const nationalShares = E => { const t = new Array(NP).fill(0); for (const c of E) for (const b of c.ballots) t[b[0]]++; const s = t.reduce((a, b) => a + b, 0); return t.map(v => v / s); };

// ---------------- The counting rules ----------------
const tallyFirst = (ballots, alive) => { const t = new Array(NP).fill(0); for (const b of ballots) { const f = b.find(i => alive[i]); if (f != null) t[f]++; } return t; };
function fptp(c) { const t = tallyFirst(c.ballots, new Array(NP).fill(true)); return t.indexOf(Math.max(...t)); }
function sv(c) { // top two on first preferences; other ballots count only if their 2nd choice is one of the two
  const t = tallyFirst(c.ballots, new Array(NP).fill(true)), top = t.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]).slice(0, 2).map(q => q[1]);
  if (t[top[0]] > c.ballots.length / 2) return top[0];
  const f = [t[top[0]], t[top[1]]]; for (const b of c.ballots) if (!top.includes(b[0]) && b[1] != null) { const k = top.indexOf(b[1]); if (k >= 0) f[k]++; }
  return f[0] >= f[1] ? top[0] : top[1];
}
function av(c) { // eliminate the lowest until someone has a majority of the ballots still in play
  const alive = c.w.map(v => v > 0);
  for (let round = 0; round < NP; round++) { const t = tallyFirst(c.ballots, alive), live = t.reduce((a, b) => a + b, 0), best = t.indexOf(Math.max(...t)); if (t[best] > live / 2) return best; let lo = -1; for (let i = 0; i < NP; i++) if (alive[i] && (lo < 0 || t[i] < t[lo])) lo = i; alive[lo] = false; }
  return fptp(c);
}
/* STV in one multi-member constituency. Each party stands as many candidates as there are seats; a voter ranks all of
   their party's candidates in order, then the next party's, and so on. Fractional (Gregory-style) surplus transfers. */
function stv(ballots, seats) {
  const cands = []; for (let p = 0; p < NP; p++) for (let j = 0; j < seats; j++) cands.push(p);
  const bal = ballots.map(b => ({ pref: b.flatMap(p => { const o = []; for (let j = 0; j < seats; j++) o.push(p * seats + j); return o; }), w: 1 }));
  const quota = Math.floor(bal.length / (seats + 1)) + 1, alive = cands.map(() => true), elected = [];
  const top = b => b.pref.find(k => alive[k]);
  while (elected.length < seats) {
    const t = cands.map(() => 0); for (const b of bal) { const k = top(b); if (k != null) t[k] += b.w; }
    const nAlive = alive.filter(Boolean).length;
    if (nAlive <= seats - elected.length) { cands.forEach((p, k) => { if (alive[k]) { elected.push(p); alive[k] = false; } }); break; }
    let best = -1; t.forEach((v, k) => { if (alive[k] && (best < 0 || v > t[best])) best = k; });
    if (t[best] >= quota) { const f = (t[best] - quota) / t[best]; for (const b of bal) if (top(b) === best) b.w *= f; elected.push(cands[best]); alive[best] = false; }
    else { let lo = -1; t.forEach((v, k) => { if (alive[k] && (lo < 0 || v < t[lo])) lo = k; }); alive[lo] = false; }
  }
  return elected;
}
function dhondt(votes, seats, already = null, threshold = 0) { // highest averages: divisor = votes ÷ (seats already won + 1)
  const tot = votes.reduce((a, b) => a + b, 0), s = already ? already.slice() : new Array(votes.length).fill(0), got = new Array(votes.length).fill(0);
  for (let k = 0; k < seats; k++) { let best = -1, bv = -1; votes.forEach((v, i) => { if (v / tot < threshold) return; const q = v / (s[i] + 1); if (q > bv) { bv = q; best = i; } }); if (best < 0) break; s[best]++; got[best]++; }
  return got;
}
/* Run one system on the electorate. Returns { seats: [per party], winners: [per constituency or district], total } */
function count(sys, E, o) {
  const seats = new Array(NP).fill(0), winners = [];
  if (sys === "fptp" || sys === "sv" || sys === "av" || sys === "ams") { const f = sys === "sv" ? sv : sys === "av" ? av : fptp; for (const c of E) { const w = f(c); winners.push(w); seats[w]++; } }
  if (sys === "ams") { const nList = Math.round(NC * o.amsList / (1 - o.amsList)); const add = dhondt(nationalShares(E), nList, seats.slice()); add.forEach((v, i) => seats[i] += v); }
  if (sys === "stv") { const m = o.mag; for (let g = 0; g < NC; g += m) { const pool = []; for (let c = g; c < Math.min(NC, g + m); c++) pool.push(...E[c].ballots); const el = stv(pool, Math.min(m, NC - g)); el.forEach(p => seats[p]++); winners.push(el); } }
  if (sys === "list") { const s = dhondt(nationalShares(E), NC, null, o.threshold); s.forEach((v, i) => seats[i] = v); }
  return { seats, winners, total: seats.reduce((a, b) => a + b, 0) };
}
const gallagher = (v, s, tot) => Math.sqrt(0.5 * v.reduce((a, vi, i) => a + (100 * vi - 100 * s[i] / tot) ** 2, 0));
const enp = (s, tot) => 1 / s.reduce((a, v) => a + (v / tot) ** 2, 0);     // effective number of parties in parliament (beyond spec)
function wasted(E, R, sys) { // FPTP-type systems: % of first preferences cast for a candidate who did not win the constituency
  if (!["fptp", "sv", "av", "ams"].includes(sys)) return null; let w = 0, n = 0; E.forEach((c, k) => { for (const b of c.ballots) { n++; if (b[0] !== R.winners[k]) w++; } }); return 100 * w / n;
}

// ---------------- The page ----------------
const DEF = { preset: "uk24", sys: "fptp", depth: 6, mag: 5, threshold: 0.05, amsList: 0.43, swing: 2, speed: 1 };
const P = {};
let rnd = K.rng(Date.now() % 9973 + 3), GEO = geography(K.rng(7)), E = null, RES = {}, V = null, hist = [], tt = 0, elec = 0;
const ui = K.app({
  title: "Electoral Systems", subject: "Politics",
  blurb: "The same ranked ballots counted six ways: FPTP, supplementary vote, alternative vote, STV, AMS and list PR. Seats against votes, proportionality and wasted votes",
  reset: () => set({}),
  levels: { std: "Standard (core ideas)", adv: "Advanced (A level)", specs: { std: "Core ideas for students starting Politics (and GCSE Citizenship): how FPTP works, safe and marginal seats, why small parties with spread-out support win few seats, what a proportional system is.", adv: "Pearson Edexcel A level Politics (9PL0) Component 1 UK Politics, 3 Electoral systems: 3.1 FPTP, AMS, STV and SV (processes, advantages and disadvantages); 3.3 analysis of the impact of electoral systems on government and party systems; the 2011 AV referendum. Gallagher index and effective number of parties are beyond the spec." } },
  missions: [
    { title: "A majority from a minority", q: "Count the UK-2024-like votes by FPTP. What share of the votes does the biggest party have? What share of the seats?", hint: "About 36% of the votes gives about half the seats, worth about 13 points more than its vote share; push Labour up a few points and it has a 'manufactured majority'. The winner's vote is spread efficiently, winning many seats by small margins, while Reform's 15% wins nothing.", setup() { set({}); } },
    { title: "Spread thin or concentrated?", q: "Compare Reform and the Lib Dems under FPTP. Which gets more seats per vote? Why?", hint: "Reform's vote is spread evenly, so it comes second in many places and wins few. The Lib Dems' vote is concentrated in some areas, so a smaller national share wins more seats.", setup() { set({}); } },
    { title: "Wasted votes", q: "Under FPTP, what percentage of votes went to losing candidates? Look at the map: which seats are safe?", hint: "Often over half of all votes elect nobody. Deep-coloured seats are won with big majorities (safe); in marginals a small swing changes the winner.", setup() { set({}); } },
    { title: "Proportional representation", q: "Switch to list PR. How close are seat shares to vote shares now? Who gains, who loses?", hint: "Seats ≈ votes, so the Gallagher index falls from about 15–20 to 1–3. Smaller parties gain; no party has a majority, so a coalition would be needed.", setup() { set({ sys: "list" }); } },
    { title: "Two-party politics", q: "Choose 'Two big parties' and FPTP. Then the five-way split. When is FPTP most and least proportional?", hint: "With two big parties FPTP gives a clear winner and is reasonably proportional for them. With five similar-sized parties it becomes almost a lottery: small swings give huge seat changes.", setup() { set({ preset: "two" }); } },
    { lvl: "adv", title: "The supplementary vote", q: "Compare FPTP with SV (as used for mayors until 2023). Does every winner now have over 50%?", hint: "No: SV only counts second choices for the top two, and ballots whose 2nd choice is someone else are exhausted, so winners can still have under half of all votes.", setup() { set({ sys: "sv" }); } },
    { lvl: "adv", title: "STV and district size", q: "Choose STV. Change the number of seats per constituency from 3 to 9. What happens to proportionality and to small parties?", hint: "Bigger districts mean lower quotas (25% with 3 seats, 10% with 9), so more parties win seats and LSq falls. Voters can also rank candidates within a party.", setup() { set({ sys: "stv", mag: 3 }); } },
    { lvl: "adv", title: "AMS: topping up", q: "Choose AMS. How do the list seats correct the constituency result? Who wins most list seats?", hint: "List seats go mostly to parties under-represented in the constituencies (small parties, and the losers of FPTP); the big winner gets few or none. With enough list seats the result is close to proportional.", setup() { set({ sys: "ams" }); } },
    { lvl: "adv", title: "Thresholds", q: "List PR with a 5% threshold, then 0%. Which parties are affected?", hint: "Parties under the threshold get no seats, and their votes are effectively wasted; their share goes to bigger parties. Thresholds keep out very small or extreme parties.", setup() { set({ sys: "list", threshold: 0.05 }); } }
  ],
  batch: [
    { title: "FPTP: the cube law", question: "In a two-party contest under FPTP, how does a party's share of seats depend on its share of the two-party vote?", how: "'Two big parties', with Labour's share changed (Conservatives take the rest of the two-party vote). A new electorate each run.", xLabel: "Labour share of the two-party vote (%)", yLabel: "Labour share of the two-party seats (%)", xs: [40, 44, 46, 48, 50, 52, 54, 56, 60], reps: 4, yMin: 0, yMax: 100, theory: v => { const q = Math.pow(v / (100 - v), 3); return 100 * q / (1 + q); }, theoryLabel: "cube law s/(1−s) = (v/(1−v))³", run: (x, r) => { const o = Object.assign({}, DEF, { v: [1, 90 * x / 100, 0, 9, 90 * (1 - x / 100), 0], conc: PRESETS.two.conc }); const E2 = electorate(o, GEO, r), R = count("fptp", E2, o); return 100 * R.seats[1] / (R.seats[1] + R.seats[4]); }, note: "A small lead in votes becomes a big lead in seats: the winner's bonus. The cube law (an old rule of thumb for UK elections) fits roughly; how steep the real curve is depends on how many seats are marginal. Here the curve also sits a little to the right: this country's geography (and where the Lib Dems win) slightly favours the Conservatives, an electoral bias like those in real UK elections." },
    { title: "How proportional is each system?", question: "With the UK-2024-like votes, how disproportional is each system?", how: "System 1 FPTP, 2 SV, 3 AV, 4 STV (5 seats), 5 AMS (43% list seats), 6 list PR (5% threshold). A new electorate each run.", xLabel: "system (1 FPTP … 6 list PR)", yLabel: "Gallagher index LSq", xs: [1, 2, 3, 4, 5, 6], reps: 4, yMin: 0, run: (x, r) => { const o = Object.assign({}, DEF, PRESETS.uk24); const E2 = electorate(o, GEO, r), R = count(SYS[x - 1][0], E2, o); return gallagher(nationalShares(E2), R.seats, R.total); }, note: "FPTP, SV and AV (all single-member, majoritarian) are far less proportional than STV, AMS and list PR. AV is not a proportional system: it can even exaggerate landslides." },
    { title: "Concentration wins seats", question: "A party has 12% of the vote. How many FPTP seats does it win as its support becomes more geographically concentrated?", how: "UK-2024-like votes; the Lib Dems' concentration is changed.", xLabel: "Lib Dem concentration", yLabel: "Lib Dem seats (of 100)", xs: [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5], reps: 4, yMin: 0, run: (x, r) => { const conc = PRESETS.uk24.conc.slice(); conc[3] = x; const o = Object.assign({}, DEF, { v: PRESETS.uk24.v, conc }); return count("fptp", electorate(o, GEO, r), o).seats[3]; }, note: "Evenly spread, 12% wins almost nothing; concentrated, the same 12% wins seats where the party is strong. This is why FPTP is kinder to regional parties (like the SNP) than to nationally spread ones. The gain levels off: beyond a point, extra concentration just piles up bigger majorities in seats already won." },
    { title: "List PR: the threshold", question: "How does the threshold change proportionality in list PR?", how: "Votes: Reform 32%, Conservative 27%, Labour 26%, Lib Dem 8%, Green 4%, Nationalist 3%; D'Hondt over 100 seats.", xLabel: "threshold (%)", yLabel: "Gallagher index LSq", xs: [0, 2, 3, 4, 5, 7, 10], reps: 4, yMin: 0, run: (x, r) => { const o = Object.assign({}, DEF, { v: [4, 26, 3, 8, 27, 32], conc: PRESETS.frag.conc, threshold: x / 100 }); const E2 = electorate(o, GEO, r), R = count("list", E2, o); return gallagher(nationalShares(E2), R.seats, R.total); }, note: "Low until the threshold passes a party's share, then a jump: that party's votes win nothing and its seats go to others." },
    { title: "STV: seats per constituency (A level)", question: "How does proportionality depend on the number of seats in each STV constituency?", how: "UK-2024-like votes; districts made of 1 to 10 neighbouring constituencies.", xLabel: "seats per constituency", yLabel: "Gallagher index LSq", xs: [1, 2, 3, 4, 5, 7, 10], reps: 3, yMin: 0, run: (x, r) => { const o = Object.assign({}, DEF, PRESETS.uk24, { mag: x }); const E2 = electorate(o, GEO, r), R = count("stv", E2, o); return gallagher(nationalShares(E2), R.seats, R.total); }, note: "One seat per constituency is just AV. Each extra seat lowers the quota, letting smaller parties win; the Irish Dáil uses 3–5, the NI Assembly 5." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "Core", text: "FPTP: one MP per constituency; the candidate with the most votes wins (a plurality, not necessarily a majority). Simple, strong link between MP and constituency, usually a single-party government." },
      { lvl: "std", tag: "Core", text: "FPTP gives a 'winner's bonus' and under-represents parties whose support is spread evenly (Reform, Greens, earlier the Lib Dems). Safe seats and wasted votes mean many votes make no difference." },
      { lvl: "adv", tag: "9PL0 1 3.1", text: "AMS (Scottish Parliament, Senedd until 2026): constituency FPTP seats plus regional list seats shared by modified D'Hondt (divisor = list votes ÷ (seats already won + 1)). More proportional, keeps constituency MPs; creates two classes of member." },
      { lvl: "adv", tag: "9PL0 1 3.1", text: "STV (NI Assembly, Scottish local councils): multi-member constituencies, preferences, Droop quota = votes ÷ (seats + 1) + 1, surplus and elimination transfers. Proportional and allows choice within parties; complex counting, large constituencies." },
      { lvl: "adv", tag: "9PL0 1 3.1", text: "SV (mayors until the Elections Act 2022 changed them to FPTP): two preferences; if nobody has 50%, all but the top two are eliminated and second choices counted. Winners have broader support, but many ballots exhaust." },
      { lvl: "adv", tag: "9PL0 1 3.3", text: "Impact: FPTP tends to two-party dominance and single-party majorities; proportional systems (AMS, STV) bring multi-party systems and coalition or minority government (Scotland, Wales, NI power-sharing)." },
      { lvl: "beyond", tag: "Beyond", text: "Gallagher index LSq = √(½Σ(vᵢ − sᵢ)²). UK general elections are often 15–25 (2015: 15; 2024: about 24); list PR countries 1–5." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: () => { const R = RES[P.sys] || RES.fptp, b = R.seats.indexOf(Math.max(...R.seats)); return `In this ${SYS.find(s => s[0] === P.sys)[1]} election the largest party won ${(100 * V[b]).toFixed(1)}% of the votes. What share of the seats did it win, and is that a majority?`; }, ans: () => { const R = RES[P.sys] || RES.fptp, b = R.seats.indexOf(Math.max(...R.seats)); return `<ul><li>${R.seats[b]} of ${R.total} seats = ${(100 * R.seats[b] / R.total).toFixed(1)}%</li><li>${R.seats[b] > R.total / 2 ? "Yes: a majority of the seats" : "No: a hung parliament"} from ${V[b] > 0.5 ? "a majority" : "a minority"} of the votes.</li></ul>`; } },
      { lvl: "std", marks: 4, q: "Explain two criticisms of FPTP.", ans: "<ul><li>Disproportional: seat shares don't match vote shares; e.g. a party with a third of the votes can win a majority of seats (1 + 1).</li><li>Wasted votes / safe seats: votes for losing candidates, and surplus votes for winners, have no effect; campaigning focuses on marginals (1 + 1). Also: small parties with spread-out support under-represented.</li></ul>" },
      { lvl: "adv", marks: 3, q: "In a 4-seat STV constituency, 50,000 valid votes are cast. Calculate the Droop quota.", ans: "<ul><li>Quota = votes ÷ (seats + 1) + 1 (1)</li><li>= 50,000 ÷ 5 + 1 (1)</li><li>= 10,001 (1)</li></ul>" },
      { lvl: "adv", marks: 30, q: "Evaluate the view that the UK should replace FPTP with a more proportional system for general elections.", ans: "<ul><li>AO1: features of FPTP, AMS, STV; 2011 AV referendum; evidence from Scotland, Wales, NI.</li><li>AO2: disproportionality (2024: Labour 34% votes, 63% seats; Reform 14% votes, 5 seats), wasted votes, safe seats, strong government, constituency link, coalition risk.</li><li>AO3: weigh fairness and legitimacy against stability and accountability; consider which system, not just whether; reach a supported judgement.</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li>A country of 100 equal constituencies on a 10 × 10 grid. Each party's share in each constituency = national share × e^(concentration × a smooth random geography), rescaled so national shares match the sliders; so some parties are strong in some areas. The Nationalists stand only in the top two rows.</li>
<li>Each constituency has 240 sample ballots. A ballot's first choice is drawn from the constituency's shares; its later choices are the other parties in order of closeness on a left–right scale (Green, Labour, Nationalist, Lib Dem, Conservative, Reform), with some randomness. You can limit how many preferences voters give.</li>
<li>Counting rules: FPTP (most first choices), SV (top two; others transfer only via their 2nd choice), AV (eliminate the lowest until a majority of continuing ballots), STV (groups of neighbouring constituencies; each party stands as many candidates as seats; Droop quota; fractional surplus transfers), AMS (FPTP constituencies + list seats by modified D'Hondt on national first choices), list PR (national D'Hondt with a threshold).</li>
<li>Gallagher index LSq = √(½ Σ (vote % − seat %)²). Wasted votes = first choices for candidates who did not win the constituency.</li></ul>
<h3>Assumptions and simplifications</h3>
<ul><li>Everyone votes sincerely (no tactical voting) and turnout is equal everywhere; constituencies are equal in size.</li><li>AMS and list PR use one national region rather than the real regions; the same votes are used for constituency and list.</li><li>Preferences follow one left–right scale, which real voters don't always follow.</li><li>The parties and numbers are illustrative, not a forecast.</li></ul>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("The election");
ctl.preset = K.seg(g, { label: "Votes", value: "uk24", options: Object.entries(PRESETS).map(([k, p]) => [k, p.name]), on: v => set({ preset: v, sys: P.sys }) });
ctl.sys = K.seg(g, { label: "Count them by", value: "fptp", options: SYS, on: v => { P.sys = v; } });
const vs = PARTIES.map((p, i) => K.slider(g, { label: `${p.name} (national first choices)`, min: 0, max: 60, step: 1, value: PRESETS.uk24.v[i], fmt: v => v + "%", on: v => { P.v[i] = v; regen(); } }));
g = ui.group("Elections");
ctl.swing = K.slider(g, { label: "Random swing between elections", min: 0, max: 5, step: 0.5, value: 2, fmt: v => v ? "±" + v + " points" : "none", on: v => P.swing = v });
ctl.speed = K.slider(g, { label: "Speed", min: 0.25, max: 4, step: 0.25, value: 1, fmt: v => v + "×", on: v => P.speed = v });
let rr = K.row(g); K.btn(rr, "🗳 New election now", () => newElection(), "primary");
g = ui.group("A level");
ctl.mag = K.slider(g, { label: "STV: seats per constituency", min: 1, max: 10, step: 1, value: 5, on: v => { P.mag = v; recount(); } });
ctl.amsList = K.slider(g, { label: "AMS: share of seats that are list seats", min: 0, max: 0.6, step: 0.01, value: 0.43, fmt: v => Math.round(v * 100) + "%", on: v => { P.amsList = v; recount(); } });
ctl.threshold = K.slider(g, { label: "List PR: threshold", min: 0, max: 0.12, step: 0.005, value: 0.05, fmt: v => (v * 100).toFixed(1) + "%", on: v => { P.threshold = v; recount(); } });
ctl.depth = K.slider(g, { label: "Preferences each voter gives", min: 1, max: 6, step: 1, value: 6, fmt: v => v === 1 ? "first choice only" : v + " choices", on: v => { P.depth = v; regen(); } });
const read = K.readout(ui.group("This election"), [["big", "largest party: votes → seats"], ["gov", "outcome"], ["lsq", "Gallagher index LSq"], ["wast", "wasted votes (single-member)"], ["enp", "effective parties (beyond spec)"], ["n", "elections held"]]);
function set(o) {
  const pr = PRESETS[o.preset || DEF.preset]; Object.assign(P, DEF, { v: pr.v.slice(), conc: pr.conc.slice() }, o);
  for (const k of ["preset", "sys", "swing", "speed", "mag", "amsList", "threshold", "depth"]) ctl[k].set(P[k]);
  vs.forEach((s, i) => s.set(P.v[i])); hist = []; elec = 0; regen();
}
function regen(vv) { E = electorate(Object.assign({}, P, { v: vv || P.v }), GEO, rnd); V = nationalShares(E); recount(); }
function recount() { for (const [s] of SYS) RES[s] = count(s, E, P); }
function newElection() { const vv = P.v.map(v => Math.max(0, v + (v ? P.swing * rnd.gauss() * Math.sqrt(v / 20) : 0))); regen(vv); elec++; hist.push(SYS.map(([s]) => gallagher(V, RES[s].seats, RES[s].total))); if (hist.length > 60) hist.shift(); }
// ---------------- Simulation: a fresh election (with a random swing) every few seconds ----------------
function tick(dt) { tt += dt * P.speed; if (tt > 4) { tt = 0; newElection(); } }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function hemicycle(c, cx, cy, R0, R1, seats) { // seats in a semicircle, ordered left to right by party position
  const N = seats.reduce((a, b) => a + b, 0); if (!N) return; const order = PARTIES.map((p, i) => i).sort((a, b) => PARTIES[a].x - PARTIES[b].x), list = []; order.forEach(i => { for (let k = 0; k < seats[i]; k++) list.push(i); });
  const rows = Math.max(3, Math.round(Math.sqrt(N / 4))), radii = []; for (let r = 0; r < rows; r++) radii.push(R0 + (R1 - R0) * r / (rows - 1));
  const tot = radii.reduce((a, b) => a + b, 0), pos = []; let used = 0;
  radii.forEach((r, k) => { const n = k === rows - 1 ? N - used : Math.round(N * r / tot); used += n; for (let j = 0; j < n; j++) { const a = Math.PI * (1 - (n > 1 ? j / (n - 1) : 0.5)); pos.push([a, r]); } });
  pos.sort((p, q) => q[0] - p[0]); const dot = Math.min(9, (R1 - R0) / rows * 0.42 + 2, Math.PI * R1 / (N / rows) * 0.42);
  pos.forEach(([a, r], k) => { c.fillStyle = PARTIES[list[k]].col; c.beginPath(); c.arc(cx + r * Math.cos(a), cy - r * Math.sin(a), dot, 0, 6.3); c.fill(); });
  c.fillStyle = "#cfd8ea"; c.font = "600 13px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillText(`${N} seats · majority ${Math.floor(N / 2) + 1}`, cx, cy + 18);
}
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); if (!E) return;
  const R = RES[P.sys], name = SYS.find(s => s[0] === P.sys)[1];
  TX(c, `Election ${elec + 1}: counted by ${name}`, 20, 28, "#eef2f8", "left", "600 15px");
  // the map: constituencies (or STV districts) coloured by winner, shade by winning margin
  const ms = Math.min((h - 110) / ROWS, w * 0.3 / COLS), mx = 20, my = 50;
  if (P.sys === "stv" || P.sys === "list") {
    if (P.sys === "stv") { R.winners.forEach((el, gI) => { const cells = []; for (let k = gI * P.mag; k < Math.min(NC, gI * P.mag + P.mag); k++) cells.push(k); el.slice().sort((a, b) => PARTIES[a].x - PARTIES[b].x).forEach((p, j) => { const k = cells[j]; c.fillStyle = PARTIES[p].col; c.fillRect(mx + (k % COLS) * ms, my + Math.floor(k / COLS) * ms, ms - 1, ms - 1); }); c.strokeStyle = "#0b1020"; c.lineWidth = 3; }); TX(c, `${R.winners.length} STV constituencies of ${P.mag} seats (each block)`, mx, my + ROWS * ms + 18, "#8fa0bf", "left", "11.5px"); }
    else { TX(c, "One national list: no constituencies", mx, my + 20, "#8fa0bf", "left", "12px"); V.forEach((v, i) => { c.fillStyle = PARTIES[i].col; c.fillRect(mx, my + 40 + i * 26, v * ms * COLS * 1.6, 18); TX(c, `${PARTIES[i].name} ${(v * 100).toFixed(1)}%${v < P.threshold && v > 0 ? " (below threshold)" : ""}`, mx + v * ms * COLS * 1.6 + 6, my + 54 + i * 26, "#cfd8ea", "left", "12px"); }); }
  } else {
    E.forEach((cn, k) => { const win = R.winners[k], t = tallyFirst(cn.ballots, new Array(NP).fill(true)).sort((a, b) => b - a), marg = (t[0] - t[1]) / NB; c.globalAlpha = 0.45 + Math.min(0.55, marg * 2.5); c.fillStyle = PARTIES[win].col; c.fillRect(mx + (k % COLS) * ms, my + Math.floor(k / COLS) * ms, ms - 1, ms - 1); }); c.globalAlpha = 1;
    TX(c, "100 constituencies · deep colour = safe seat, pale = marginal", mx, my + ROWS * ms + 18, "#8fa0bf", "left", "11.5px");
    if (P.sys === "ams") TX(c, `+ ${R.total - NC} list seats`, mx, my + ROWS * ms + 34, "#8fa0bf", "left", "11.5px");
  }
  // the chamber
  const hx = mx + COLS * ms + (w - (mx + COLS * ms)) * 0.5, hr = Math.min((w - mx - COLS * ms) * 0.42, h * 0.38);
  hemicycle(c, hx, my + hr + 30, hr * 0.38, hr, R.seats);
  // votes against seats table
  const ty = my + hr + 66, tx = hx - 190; TX(c, "party", tx, ty, "#8fa0bf", "left", "11.5px"); TX(c, "votes", tx + 200, ty, "#8fa0bf", "right", "11.5px"); TX(c, "seats", tx + 270, ty, "#8fa0bf", "right", "11.5px"); TX(c, "seat % − vote %", tx + 380, ty, "#8fa0bf", "right", "11.5px");
  PARTIES.forEach((p, i) => { const y = ty + 18 + i * 18, sp = 100 * R.seats[i] / R.total, d = sp - 100 * V[i]; c.fillStyle = p.col; c.fillRect(tx, y - 9, 10, 10); TX(c, p.name, tx + 16, y, "#cfd8ea", "left", "12px"); TX(c, (100 * V[i]).toFixed(1) + "%", tx + 200, y, "#cfd8ea", "right", "12px"); TX(c, `${R.seats[i]} (${sp.toFixed(0)}%)`, tx + 270, y, "#cfd8ea", "right", "600 12px"); TX(c, (d > 0 ? "+" : "") + d.toFixed(1), tx + 380, y, d > 2 ? "#7ee787" : d < -2 ? "#ff8a70" : "#cfd8ea", "right", "12px"); });
}

// ---------------- Charts and readings ----------------
function charts() {
  if (!E) return; const R = RES[P.sys];
  chA.opts.title = "The same votes, six systems: seat shares"; chA.opts.xLabel = ""; chA.opts.yLabel = "% of seats";
  const ser = PARTIES.map((p, i) => ({ pts: SYS.map(([s], k) => [k + (i - 2.5) * 0.13, 100 * RES[s].seats[i] / RES[s].total]), type: "bars", w: 0.12, color: p.col, label: p.name.split(" ")[0] }));
  chA.draw(ser, { xMin: -0.5, xMax: 5.5, yMin: 0, xFmt: v => (SYS[Math.round(v)] || [, ""])[1] });
  chB.opts.title = "Gallagher index in each election"; chB.opts.xLabel = "election"; chB.opts.yLabel = "LSq";
  const off = elec - hist.length; chB.draw(SYS.map(([s, n], k) => ({ pts: hist.map((hh, j) => [off + j + 1, hh[k]]), color: ["#ff8a70", "#ffd166", "#c9a0ff", "#7ee787", "#5ad1ff", "#cfd8ea"][k], label: n })), { yMin: 0, xMin: Math.max(1, off + 1), xMax: Math.max(10, elec) });
  const b = R.seats.indexOf(Math.max(...R.seats)), wv = wasted(E, R, P.sys);
  read.set("big", `${PARTIES[b].name}: ${(100 * V[b]).toFixed(1)}% → ${(100 * R.seats[b] / R.total).toFixed(1)}%`);
  read.set("gov", R.seats[b] > R.total / 2 ? `${PARTIES[b].name} majority of ${2 * R.seats[b] - R.total}` : "hung parliament: coalition or minority");
  read.set("lsq", gallagher(V, R.seats, R.total).toFixed(1)); read.set("wast", wv == null ? "–" : wv.toFixed(0) + "%"); read.set("enp", enp(R.seats, R.total).toFixed(2) + " (votes " + (1 / V.reduce((a, v) => a + v * v, 0)).toFixed(2) + ")"); read.set("n", elec);
  ui.hud(P.sys === "stv" ? "Droop quota = votes ÷ (seats + 1) + 1" : P.sys === "ams" || P.sys === "list" ? "D'Hondt: divisor = votes ÷ (seats won + 1)" : "LSq = √(½ Σ (vote % − seat %)²)");
}
let frame = 0;
ui.run(dt => tick(dt), () => { if (frame++ % 3 === 0) draw(); if (frame % 9 === 0) charts(); });
set({});
ui.tip("Every voter fills in a ranked ballot. Switch between the systems to see the same votes give different parliaments.", 7000);
