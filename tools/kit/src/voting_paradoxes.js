/* =====================================================================
   VOTING PARADOXES AND THE MEDIAN VOTER
   1. THE MEDIAN VOTER (Downs, 1957). Line voters up from left to right.
      If each votes for the nearest of two parties, a party gains votes by
      moving towards the middle, so both parties drift to the position of
      the MEDIAN voter (half the voters on each side). This is one
      explanation of consensus politics and "catch-all" parties.
      It breaks down when voters abstain because no party is close
      (alienation), when candidates must first win a primary or please
      party members, or when there are three or more parties.
   2. CONDORCET'S PARADOX (1785). Majorities need not be consistent:
      a majority can prefer A to B, another B to C, and another C to A:
      a CYCLE. Then whoever sets the order of votes (the agenda) can
      choose the winner, and different counting rules (plurality,
      alternative vote, Borda count) can pick different winners.
      ARROW'S THEOREM (1951): with three or more options no ranked voting
      rule can meet every reasonable fairness condition at once.
   3. TACTICAL VOTING: voting for your second choice to stop your last
      choice, when your first choice can't win.
   ===================================================================== */
// ---------------- 1. The spatial model: voters on a left–right line ----------------
const NV = 2000;
function voters(o, r) { const v = []; for (let i = 0; i < NV; i++) { const side = r() < 0.5 + o.skew ? -1 : 1; v.push(Math.max(-1, Math.min(1, side * o.pol + (0.34 - 0.24 * o.pol) * r.gauss()))); } return v.sort((a, b) => a - b); }
const median = v => v[Math.floor(v.length / 2)];
/* who each voter supports: the nearest party, unless it is further than the alienation distance (then they abstain).
   Tactical voters (if switched on) whose favourite is third in the poll vote for the nearer of the top two instead. */
function votes(V, pos, o) {
  const n = pos.length, t = new Array(n).fill(0); let abst = 0;
  const near = x => { let b = 0; for (let k = 1; k < n; k++) if (Math.abs(x - pos[k]) < Math.abs(x - pos[b])) b = k; return b; };
  for (const x of V) { const b = near(x); if (o.alien && Math.abs(x - pos[b]) > o.alien) abst++; else t[b]++; }
  if (o.tactical && n === 3) { // a second pass: supporters of the last-placed party switch to the nearer of the top two
    const order = [0, 1, 2].sort((a, b) => t[b] - t[a]), last = order[2], t2 = new Array(n).fill(0);
    const frac = o.tactFrac == null ? 1 : o.tactFrac;
    V.forEach((x, i) => { let b = near(x); if (o.alien && Math.abs(x - pos[b]) > o.alien) return; if (b === last && (i * 0.6180339887) % 1 < frac) b = Math.abs(x - pos[order[0]]) < Math.abs(x - pos[order[1]]) ? order[0] : order[1]; t2[b]++; });
    return { t: t2, abst, sincere: t };
  }
  return { t, abst, sincere: t };
}
/* One round of party competition: each party in turn tries positions near its current one and moves (a limited step)
   to the one that wins it most votes. With primaries, a party is also pulled towards the median of its own side's voters. */
function partyRound(V, pos, o) {
  for (let k = 0; k < pos.length; k++) {
    let best = pos[k], bv = -1;
    for (let d = -0.15; d <= 0.1501; d += 0.01) { const p = Math.max(-1, Math.min(1, pos[k] + d)), q = pos.slice(); q[k] = p; const v = votes(V, q, o).t[k]; if (v > bv + 0.5 || (Math.abs(v - bv) <= 0.5 && Math.abs(d) < Math.abs(best - pos[k]))) { bv = v; best = p; } }
    let target = best;
    if (o.primary) { const side = V.filter(x => (k === 0 ? x < 0 : k === 1 ? x > 0 : Math.abs(x) < 0.3)), mm = side.length ? median(side) : pos[k]; target = (1 - o.primary) * best + o.primary * mm; }
    pos[k] += Math.max(-0.05, Math.min(0.05, target - pos[k]));
  }
  return pos;
}
// ---------------- 2. Three candidates and six kinds of ranked ballot ----------------
const CAND = ["A", "B", "C"], CC = ["#ff8a70", "#5ad1ff", "#7ee787"];
const ORDERS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];      // each group's ranking, best first
const PROFILES = {
  cycle: { name: "Condorcet's paradox", s: [35, 0, 0, 33, 32, 0] },
  spoiler: { name: "Plurality picks the wrong one", s: [40, 0, 0, 25, 0, 35] },
  borda: { name: "Borda disagrees", s: [30, 21, 0, 25, 0, 24] },
  agree: { name: "Everyone agrees", s: [45, 10, 20, 5, 10, 10] }
};
function analyse(s) { // s = weight of each of the six groups
  const tot = s.reduce((a, b) => a + b, 0) || 1, first = [0, 0, 0], borda = [0, 0, 0], pair = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  ORDERS.forEach((o, g) => { first[o[0]] += s[g]; borda[o[0]] += 2 * s[g]; borda[o[1]] += s[g]; for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) pair[o[i]][o[j]] += s[g]; });
  const beats = (a, b) => pair[a][b] > pair[b][a];
  let condorcet = null; for (let a = 0; a < 3; a++) if ([0, 1, 2].every(b => b === a || beats(a, b))) condorcet = a;
  const cycle = condorcet == null && [0, 1, 2].every(a => [0, 1, 2].some(b => b !== a && beats(b, a)));
  const plurality = first.indexOf(Math.max(...first));
  const lo = first.indexOf(Math.min(...first)), [x, y] = [0, 1, 2].filter(k => k !== lo), av = beats(x, y) ? x : beats(y, x) ? y : (first[x] >= first[y] ? x : y);  // alternative vote: drop last place, then the top two head to head
  const bordaW = borda.indexOf(Math.max(...borda));
  const agenda = [[0, 1, 2], [0, 2, 1], [1, 2, 0]].map(([a, b, c]) => { const w = beats(a, b) ? a : b; return { first: [a, b], then: c, winner: beats(w, c) ? w : beats(c, w) ? c : w }; });
  return { tot, first, borda, pair, condorcet, cycle, plurality, av, bordaW, agenda };
}
// impartial culture: every voter picks one of the six rankings at random
function randomProfile(n, r, m = 3) { if (m === 3) { const s = new Array(6).fill(0); for (let i = 0; i < n; i++) s[r.int(6)]++; return s; } }
function cycleProb(m, n, r) { // m candidates, n voters, each with a random ranking: is there a Condorcet winner?
  const W = []; for (let a = 0; a < m; a++) W.push(new Array(m).fill(0));
  for (let v = 0; v < n; v++) { const o = []; for (let k = 0; k < m; k++) o.push(k); for (let k = m - 1; k > 0; k--) { const j = r.int(k + 1); [o[k], o[j]] = [o[j], o[k]]; } for (let i = 0; i < m; i++) for (let j = i + 1; j < m; j++) W[o[i]][o[j]]++; }
  for (let a = 0; a < m; a++) { let ok = true; for (let b = 0; b < m; b++) if (b !== a && W[a][b] <= W[b][a]) { ok = false; break; } if (ok) return 0; }
  return 1;
}
const GUILBAUD = { 3: 8.77, 4: 17.56, 5: 25.13, 6: 31.52, 7: 36.94 };   // % chance of no Condorcet winner with very many voters (impartial culture)

// the third party's sincere vote share (for the batch theory line)
const S3 = (() => { let m = 0; for (let k = 1; k <= 20; k++) { const t = votes(voters({ pol: 0.1, skew: 0 }, K.rng(k * 31)), [-0.3, 0.3, 0.75], {}).t; m += 100 * t[2] / NV / 20; } return m; })();
// ---------------- The page ----------------
const DEF = { view: "median", nParty: 2, pol: 0.1, skew: 0, alien: 0, primary: 0, tactical: false, profile: "cycle", speed: 1, nRand: 101 };
const P = {};
let rnd = K.rng(Date.now() % 9973 + 3), VV = null, pos = [], round = 0, tt = 0, trail = [], rand = { n: 0, cyc: 0, hist: [] }, S = [], drag = -1;
const ui = K.app({
  title: "Voting Paradoxes and the Median Voter", subject: "Politics",
  blurb: "Why parties chase the centre (and when they don't), Condorcet's paradox, Arrow's theorem, spoilers and tactical voting",
  reset: () => set({ view: P.view }),
  levels: { std: "Standard (core ideas)", adv: "Advanced (A level)", specs: { std: "Core ideas: majority and plurality, why parties move towards the centre ground, tactical voting, why the way votes are counted can change the winner.", adv: "Pearson Edexcel A level Politics (9PL0): Component 1, 2 Political parties (consensus and adversarial politics, catch-all parties), 3 Electoral systems (AV, majoritarian systems), 4 Voting behaviour (rational choice, tactical voting); Component 3 USA (primaries and polarisation). The median voter theorem, Condorcet's paradox and Arrow's theorem are political theory beyond the spec that explains these." } },
  missions: [
    { title: "Race to the centre", q: "Two parties start far apart. Press play: where do they end up? Compare with the median voter (white line).", hint: "Each move towards the middle wins the voters in between, so both parties converge on the median voter: very similar policies (consensus politics, 'Blatcherism' in the 1990s and 2000s).", setup() { set({}); pos = [-0.7, 0.7]; } },
    { title: "A polarised electorate", q: "Polarise the voters into two camps. Do the parties still go to the middle?", hint: "Yes, in this simple model: the median is still in the middle even if few voters live there. Parties chase the median, not the crowd, so polarised voters can face centrist parties and feel unrepresented.", setup() { set({ pol: 0.55 }); pos = [-0.6, 0.6]; } },
    { title: "Alienated voters stay at home", q: "Turn on abstention (voters who are too far from every party don't vote). Now where do the parties settle?", hint: "Moving to the centre now loses your own extreme voters, who abstain. With polarised voters, parties stay apart. This helps explain adversarial politics and turnout.", setup() { set({ pol: 0.55, alien: 0.4 }); pos = [-0.6, 0.6]; } },
    { title: "A third party", q: "Add a third party in the centre. Does anyone settle down?", hint: "With three parties there is no stable position: the centre party is squeezed from both sides and parties keep leapfrogging. Downs' theorem only works for two.", setup() { set({ nParty: 3 }); } },
    { title: "Condorcet's paradox", q: "Open the paradox view. Who wins A v B, B v C and C v A? Who should win overall?", hint: "A beats B (67%), B beats C (68%), but C beats A (65%): a cycle. There is no 'will of the majority'. Each voter is rational, but the majority is not.", setup() { set({ view: "paradox", profile: "cycle" }); } },
    { title: "Control the agenda", q: "With the cycle, compare the three agendas (which pair votes first). Who wins each time?", hint: "Each agenda gives a different winner: whoever chooses the order of votes chooses the result. This is why control of the parliamentary timetable matters.", setup() { set({ view: "paradox", profile: "cycle" }); } },
    { lvl: "adv", title: "The spoiler", q: "Choose 'Plurality picks the wrong one'. Who wins by plurality (FPTP)? Who would beat everyone head to head?", hint: "A wins on first choices with 40%, but B (the Condorcet winner) beats A and C one-to-one. C's voters 'split' the anti-A vote: a spoiler. AV doesn't fix it here: B has the fewest first choices, so is eliminated first and C wins (the 'centre squeeze'). Three rules, three winners.", setup() { set({ view: "paradox", profile: "spoiler" }); } },
    { lvl: "adv", title: "Tactical voting", q: "Three parties; switch tactical voting on. What happens to the third party's vote?", hint: "Its supporters switch to the less-bad of the top two, so the third party's vote collapses: one reason FPTP tends to produce two-party systems (Duverger's law).", setup() { set({ nParty: 3, tactical: true }); pos = [-0.45, 0.45, 0.1]; } },
    { lvl: "adv", title: "Primaries pull apart", q: "Turn up primaries: candidates must first win over their own party's voters. Where do the parties settle now?", hint: "Each party is pulled towards the median of its own side, not of the whole electorate: a reason US politics has polarised as primaries became decisive.", setup() { set({ primary: 0.5 }); pos = [-0.1, 0.1]; } }
  ],
  batch: [
    { title: "How common are cycles? (three candidates)", question: "If voters rank three candidates at random, how often is there no Condorcet winner?", how: "Each run holds 40 elections and gives the % with a cycle (ties broken against a winner).", xLabel: "number of voters", yLabel: "elections with a cycle (%)", xs: [3, 5, 11, 25, 51, 101, 501], reps: 10, yMin: 0, theory: () => 8.77, theoryLabel: "Guilbaud limit 8.77%", run: (n, r) => { let c = 0; for (let k = 0; k < 40; k++) c += cycleProb(3, n, r); return 100 * c / 40; }, note: "With 3 voters the exact answer is 1/18 = 5.6%; it rises towards 8.77% as the electorate grows. Real electorates are less random than this, so cycles are rarer, but they do happen." },
    { title: "More candidates, more cycles (A level)", question: "How does the chance of a cycle grow with the number of candidates?", how: "101 voters ranking candidates at random; 40 elections per run.", xLabel: "number of candidates", yLabel: "no Condorcet winner (%)", xs: [3, 4, 5, 6, 7], reps: 8, yMin: 0, theory: m => GUILBAUD[m], theoryLabel: "large-electorate theory", run: (m, r) => { let c = 0; for (let k = 0; k < 40; k++) c += cycleProb(m, 101, r); return 100 * c / 40; }, note: "With seven options there is no majority winner over a third of the time: 'the will of the people' is not always defined. This is the heart of Arrow's impossibility theorem." },
    { title: "Do two parties converge?", question: "Starting from random positions, where does the winning party end up relative to the median voter?", how: "Two parties, voters spread normally; 40 rounds of competition.", yLabel: "winner's position − median voter", reps: 150, bins: 20, theory: 0, theoryLabel: "median voter", run: (x, r) => { const o = Object.assign({}, DEF), V = voters(o, r), p = [-1 + r() * 0.9, 0.1 + r() * 0.9]; for (let k = 0; k < 40; k++) partyRound(V, p, o); const t = votes(V, p, o).t; return p[t[0] >= t[1] ? 0 : 1] - median(V); }, note: "The winner sits within a step or two of the median voter every time: Downs' prediction." },
    { title: "Abstention keeps parties apart", question: "How far apart do the two parties end up as voters become readier to abstain?", how: "Polarised voters (two camps); a voter abstains if the nearest party is further than the distance shown.", xLabel: "abstain if nearest party is further than", yLabel: "distance between the parties", xs: [0.2, 0.3, 0.4, 0.6, 0.8, 1.2, 2], reps: 6, yMin: 0, run: (a, r) => { const o = Object.assign({}, DEF, { pol: 0.55, alien: a }), V = voters(o, r), p = [-0.6, 0.6]; for (let k = 0; k < 40; k++) partyRound(V, p, o); return Math.abs(p[1] - p[0]); }, note: "When voters stay at home unless a party is close, parties must stay near their own camp: polarisation. With no abstention (large distance) they converge." },
    { title: "Tactical voting squeezes the third party (A level)", question: "How much of the third party's vote is left as more of its supporters vote tactically?", how: "Parties at −0.3, +0.3 and +0.75 (the third party, on the right); voters normal; a share of the third party's supporters switch to the nearer of the top two.", xLabel: "third-party supporters voting tactically (%)", yLabel: "third party vote (%)", xs: [0, 20, 40, 60, 80, 100], reps: 4, yMin: 0, theory: f => S3 * (1 - f / 100), theoryLabel: "sincere share × (1 − tactical fraction)", run: (f, r) => { const o = Object.assign({}, DEF, { tactical: true, tactFrac: f / 100 }), V = voters(o, r), t = votes(V, [-0.3, 0.3, 0.75], o).t; return 100 * t[2] / (t[0] + t[1] + t[2]); }, note: "A straight-line squeeze: every tactical voter is lost. Under FPTP a party that is third in the polls loses votes it would win under a proportional system, part of Duverger's law (FPTP tends to two parties)." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "Core", text: "Majority = more than half; plurality = more than anyone else. FPTP needs only a plurality." },
      { lvl: "std", tag: "Core", text: "Tactical voting: voting for a second choice to stop a disliked candidate, when your first choice can't win. Common under FPTP; it squeezes smaller parties." },
      { lvl: "adv", tag: "9PL0 1 2", text: "Consensus politics: when the main parties share broad policies (post-war consensus, 'Third Way'). The median voter theorem explains why two vote-seeking parties converge; catch-all parties appeal beyond their core." },
      { lvl: "adv", tag: "9PL0 1 4", text: "Rational choice voting: voters weigh policies and competence. Abstention from alienation, tactical voting and valence (competence) all change the simple median-voter picture." },
      { lvl: "adv", tag: "9PL0 3 USA", text: "US primaries: candidates must win their own party's voters first, pulling them away from the centre, a cause of polarisation (with gerrymandering and partisan media)." },
      { lvl: "beyond", tag: "Beyond", text: "Condorcet's paradox: majority preferences can cycle (A > B > C > A). Arrow's theorem: no ranked voting rule with 3+ options satisfies unanimity, independence of irrelevant alternatives and non-dictatorship together." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: "Explain why two parties competing for votes may move to the centre.", ans: "<ul><li>A party that moves towards the centre keeps its own side's voters (they still prefer it to the other party) (1)</li><li>and wins voters in the middle, so it gains votes; both parties do this, ending near the median voter (1).</li></ul>" },
      { lvl: "adv", marks: 4, q: () => { const a = analyse(PROFILES.cycle.s); return `35% of voters rank A > B > C, 33% B > C > A and 32% C > A > B. Show that there is no Condorcet winner.`; }, ans: "<ul><li>A v B: A preferred by 35 + 32 = 67% (1)</li><li>B v C: B preferred by 35 + 33 = 68% (1)</li><li>C v A: C preferred by 33 + 32 = 65% (1)</li><li>Each candidate loses to another, so majorities form a cycle and none beats all others (1).</li></ul>" },
      { lvl: "adv", marks: 30, q: "Evaluate the view that UK political parties have moved closer together in their policies since 1997.", ans: "<ul><li>AO1: consensus and adversarial politics; New Labour, Cameron's modernisation; austerity; Corbyn; Brexit realignment; Starmer.</li><li>AO2: median voter logic and catch-all parties against membership pressures, Brexit polarisation, rise of Reform and Greens.</li><li>AO3: judgement about periods and policy areas.</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li>Median voter: 2,000 voters on a left–right line (−1 to +1), from one or two normal camps. Each votes for the nearest party, unless (if switched on) it is further than the abstention distance. Each round, each party tries positions up to 0.15 either side and moves (at most 0.05) towards the one that wins it most votes; with primaries it is also pulled towards the median of its own side's voters.</li>
<li>Tactical voting (three parties): supporters of the party that is last on sincere votes switch to the nearer of the other two.</li>
<li>Paradoxes: six groups of voters, one for each ranking of A, B and C. Plurality = most first choices; AV = drop the last on first choices, then the top two head to head; Borda = 2 points for a first choice, 1 for a second; Condorcet winner = beats every other candidate head to head. Agenda: the first pair votes, the winner faces the third.</li>
<li>Random elections (impartial culture): every voter picks a ranking at random.</li></ul>
<h3>Assumptions and simplifications</h3>
<ul><li>Politics is one left–right dimension (real voters care about several, e.g. Brexit, culture).</li><li>Parties only want votes (not principles, members or donors) and know exactly where voters are.</li><li>Voters choose purely on distance: no leaders, competence or loyalty (valence).</li><li>Random rankings exaggerate how often cycles happen in real electorates.</li></ul>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("What to look at");
ctl.view = K.seg(g, { value: "median", options: [["median", "Median voter"], ["paradox", "Paradoxes (3 candidates)"]], on: v => { P.view = v; showGroups(); } });
const gM = ui.group("Voters and parties");
ctl.nParty = K.seg(gM, { label: "Parties", value: 2, options: [[2, "two"], [3, "three"]], on: v => { P.nParty = +v; resetParties(); } });
ctl.pol = K.slider(gM, { label: "Polarisation of voters", min: 0, max: 0.7, step: 0.01, value: 0.1, fmt: v => v < 0.15 ? "one centre camp" : v < 0.4 ? "spread" : "two camps", on: v => { P.pol = v; VV = voters(P, K.rng(11)); } });
ctl.skew = K.slider(gM, { label: "More voters on the left / right", min: -0.2, max: 0.2, step: 0.01, value: 0, fmt: v => v ? (v > 0 ? "left +" : "right +") + Math.round(Math.abs(v) * 100) : "balanced", on: v => { P.skew = v; VV = voters(P, K.rng(11)); } });
ctl.alien = K.slider(gM, { label: "Abstain if the nearest party is further than", min: 0, max: 1, step: 0.05, value: 0, fmt: v => v ? v.toFixed(2) : "never abstain", on: v => P.alien = v });
ctl.tactical = K.toggle(gM, { label: "Tactical voting (three parties, A level)", value: false, on: v => P.tactical = v });
ctl.primary = K.slider(gM, { label: "Pull of primaries / party members (A level)", min: 0, max: 1, step: 0.05, value: 0, fmt: v => v ? Math.round(v * 100) + "%" : "none", on: v => P.primary = v });
let rr = K.row(gM); K.btn(rr, "↔ Spread the parties out", () => resetParties());
note(gM, "Drag a party along the line to place it yourself.");
const gP = ui.group("Ranked ballots: who prefers what");
ctl.profile = K.seg(gP, { value: "cycle", options: Object.entries(PROFILES).map(([k, p]) => [k, p.name]), on: v => setProfile(v) });
const sl = ORDERS.map((o, gI) => K.slider(gP, { label: o.map(i => CAND[i]).join(" > "), min: 0, max: 60, step: 1, value: 0, fmt: v => v + "%", on: v => S[gI] = v }));
ctl.nRand = K.slider(gP, { label: "Random electorates of this many voters", min: 3, max: 1001, step: 2, value: 101, on: v => { P.nRand = v; rand = { n: 0, cyc: 0, hist: [] }; } });
g = ui.group("Play"); ctl.speed = K.slider(g, { label: "Speed", min: 0.25, max: 4, step: 0.25, value: 1, fmt: v => v + "×", on: v => P.speed = v });
ui.headerSpeed(ctl.speed);   // playback speed lives in the header, beside Pause and Reset
const read = K.readout(ui.group("Readings"), [["med", "median voter"], ["pos", "party positions"], ["share", "vote shares"], ["turn", "turnout"], ["win", "winner: plurality / AV / Borda"], ["cond", "Condorcet winner"], ["rc", "random elections with a cycle"]]);
function note(parent, html) { return K.note(parent, html); }
function showGroups() { const p = P.view === "paradox"; gM.style.display = p ? "none" : ""; gP.style.display = p ? "" : "none"; }
function resetParties() { pos = P.nParty === 3 ? [-0.7, 0.7, 0] : [-0.7, 0.7]; round = 0; trail = []; }
function setProfile(k) { P.profile = k; S = PROFILES[k].s.slice(); sl.forEach((s, i) => s.set(S[i])); }
function set(o) { Object.assign(P, DEF, o); for (const k of ["view", "nParty", "pol", "skew", "alien", "tactical", "primary", "profile", "speed", "nRand"]) ctl[k].set(P[k]); VV = voters(P, K.rng(11)); resetParties(); setProfile(P.profile); rand = { n: 0, cyc: 0, hist: [] }; showGroups(); }
// ---------------- Simulation ----------------
function tick(dt) {
  tt += dt * P.speed; if (tt < 0.25) return; tt = 0;
  if (P.view === "median") { if (drag < 0) { partyRound(VV, pos, P); round++; trail.push(pos.slice()); if (trail.length > 120) trail.shift(); } }
  else { for (let k = 0; k < 5; k++) { rand.n++; rand.cyc += cycleProb(3, P.nRand, rnd); } rand.hist.push([rand.n, 100 * rand.cyc / rand.n]); if (rand.hist.length > 300) rand.hist.shift(); }
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
const PC = ["#e4003b", "#0087dc", "#faa61a"], PN = ["Left party", "Right party", "Centre party"];
let axis = null;
K.pointer(cv.el, {
  down: p => { if (P.view !== "median" || !axis) return; const x = (p.x - axis.L) / (axis.R - axis.L) * 2 - 1; let b = -1, bd = 0.08; pos.forEach((q, k) => { if (Math.abs(q - x) < bd) { bd = Math.abs(q - x); b = k; } }); drag = b; },
  drag: p => { if (drag >= 0) pos[drag] = Math.max(-1, Math.min(1, (p.x - axis.L) / (axis.R - axis.L) * 2 - 1)); }, up: () => drag = -1
});
function drawMedian(c, w, h) {
  const L = 60, R = w - 60, B = h * 0.62, T = 80; axis = { L, R }; const X = x => L + (x + 1) / 2 * (R - L);
  TX(c, `The median voter: round ${round}`, 20, 30, "#eef2f8", "left", "600 15px");
  // histogram of voters, each bar coloured by the party its voters support (grey = abstain)
  const nb = 80, bins = new Array(nb).fill(0); VV.forEach(x => bins[Math.min(nb - 1, Math.floor((x + 1) / 2 * nb))]++); const mx = Math.max(...bins);
  for (let i = 0; i < nb; i++) { const x = -1 + (i + 0.5) * 2 / nb; let b = 0; pos.forEach((q, k) => { if (Math.abs(x - q) < Math.abs(x - pos[b])) b = k; }); const ab = P.alien && Math.abs(x - pos[b]) > P.alien; c.fillStyle = ab ? "#3a4360" : PC[b]; c.globalAlpha = ab ? 1 : 0.75; const hh = bins[i] / mx * (B - T); c.fillRect(X(-1 + i * 2 / nb) + 1, B - hh, (R - L) / nb - 2, hh); }
  c.globalAlpha = 1; c.strokeStyle = "#cfd8ea"; c.beginPath(); c.moveTo(L, B); c.lineTo(R, B); c.stroke();
  TX(c, "left", L, B + 18, "#8fa0bf", "left", "12px"); TX(c, "right", R, B + 18, "#8fa0bf", "right", "12px"); TX(c, "centre", X(0), B + 18, "#8fa0bf", "center", "12px");
  const md = median(VV); c.strokeStyle = "#fff"; c.setLineDash([5, 4]); c.beginPath(); c.moveTo(X(md), T - 10); c.lineTo(X(md), B); c.stroke(); c.setLineDash([]); TX(c, "median voter", X(md), T - 16, "#fff", "center", "600 12px");
  // the parties, with their recent path
  const V = votes(VV, pos, P), tot = V.t.reduce((a, b) => a + b, 0) || 1;
  pos.forEach((q, k) => {
    c.strokeStyle = PC[k]; c.globalAlpha = 0.5; c.beginPath(); trail.forEach((tp, j) => { const y = B + 40 + (trail.length - j) * 0.9; j ? c.lineTo(X(tp[k]), y) : c.moveTo(X(tp[k]), y); }); c.stroke(); c.globalAlpha = 1;
    c.fillStyle = PC[k]; c.beginPath(); c.moveTo(X(q), B + 4); c.lineTo(X(q) - 11, B + 30); c.lineTo(X(q) + 11, B + 30); c.fill(); c.strokeStyle = "#fff"; c.stroke();
    TX(c, `${PN[k]} ${(100 * V.t[k] / tot).toFixed(1)}%${P.tactical && P.nParty === 3 ? ` (sincere ${(100 * V.sincere[k] / tot).toFixed(0)}%)` : ""}`, X(q), B + 48 + k * 15, PC[k], "center", "600 12px");
  });
  TX(c, "Bars: voters at each position, coloured by the party they vote for (dark = staying at home). Faint lines below: where the parties have been.", 20, h - 14, "#8fa0bf", "left", "11.5px");
}
function drawParadox(c, w, h) {
  const a = analyse(S), pct = v => (100 * v / a.tot).toFixed(0) + "%";
  TX(c, "Three candidates, the same ballots, different winners", 20, 30, "#eef2f8", "left", "600 15px");
  // triangle of head-to-head contests
  const cx = w * 0.27, cy = h * 0.58, r = Math.min(w * 0.17, h * 0.27), P3 = [0, 1, 2].map(k => [cx + r * Math.cos(-Math.PI / 2 + k * 2 * Math.PI / 3), cy + r * Math.sin(-Math.PI / 2 + k * 2 * Math.PI / 3)]);
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
    const wi = a.pair[i][j] >= a.pair[j][i] ? i : j, lo = wi === i ? j : i, [x1, y1] = P3[wi], [x2, y2] = P3[lo], ang = Math.atan2(y2 - y1, x2 - x1), sx = x1 + 34 * Math.cos(ang), sy = y1 + 34 * Math.sin(ang), ex = x2 - 38 * Math.cos(ang), ey = y2 - 38 * Math.sin(ang);
    c.strokeStyle = a.cycle ? "#ffd166" : "#cfd8ea"; c.lineWidth = 2.5; c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.stroke(); c.fillStyle = c.strokeStyle; c.beginPath(); c.moveTo(ex, ey); c.lineTo(ex - 12 * Math.cos(ang - 0.4), ey - 12 * Math.sin(ang - 0.4)); c.lineTo(ex - 12 * Math.cos(ang + 0.4), ey - 12 * Math.sin(ang + 0.4)); c.fill(); c.lineWidth = 1;
    TX(c, `${CAND[wi]} beats ${CAND[lo]} ${pct(a.pair[wi][lo])}–${pct(a.pair[lo][wi])}`, (sx + ex) / 2 + (wi + lo === 1 ? -6 : 6) * 0, (sy + ey) / 2 - 8, "#eef2f8", "center", "600 12px");
  }
  P3.forEach(([x, y], k) => { c.fillStyle = CC[k]; c.beginPath(); c.arc(x, y, 28, 0, 6.3); c.fill(); TX(c, CAND[k], x, y + 7, "#0b1020", "center", "700 20px"); });
  TX(c, a.cycle ? "A CYCLE: every candidate loses to someone" : a.condorcet != null ? `Condorcet winner: ${CAND[a.condorcet]} beats both others` : "No Condorcet winner (a tie)", cx, cy + r * 0.5 + 56, a.cycle ? "#ffd166" : "#7ee787", "center", "600 14px");
  // the results under each rule, and each agenda
  const x0 = w * 0.55; let y = 70;
  TX(c, "Counting rule", x0, y, "#8fa0bf", "left", "12px"); TX(c, "winner", w - 30, y, "#8fa0bf", "right", "12px"); y += 24;
  const row = (lab, win, sub) => { TX(c, lab, x0, y, "#cfd8ea", "left", "13px"); if (sub) TX(c, sub, x0, y + 15, "#8fa0bf", "left", "11px"); c.fillStyle = CC[win]; c.beginPath(); c.arc(w - 40, y - 5, 12, 0, 6.3); c.fill(); TX(c, CAND[win], w - 40, y, "#0b1020", "center", "700 13px"); y += sub ? 38 : 28; };
  row("Plurality (FPTP)", a.plurality, `first choices: ${a.first.map((v, k) => CAND[k] + " " + pct(v)).join(", ")}`);
  row("Alternative vote", a.av, `${CAND[a.first.indexOf(Math.min(...a.first))]} eliminated, then head to head`);
  row("Borda count (2, 1, 0 points)", a.bordaW, `points: ${a.borda.map((v, k) => CAND[k] + " " + (v / a.tot * 100).toFixed(0)).join(", ")}`);
  y += 6; TX(c, "Agenda: two vote first, the winner meets the third", x0, y, "#8fa0bf", "left", "12px"); y += 24;
  a.agenda.forEach(ag => row(`${CAND[ag.first[0]]} v ${CAND[ag.first[1]]}, then v ${CAND[ag.then]}`, ag.winner));
}
function draw() { const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); if (P.view === "paradox") drawParadox(c, w, h); else drawMedian(c, w, h); }

// ---------------- Charts and readings ----------------
function charts() {
  const md = median(VV);
  if (P.view === "paradox") { const a = analyse(S); chA.opts.title = "First choices and Borda points (% of the maximum)"; chA.opts.xLabel = ""; chA.opts.yLabel = "%"; chA.draw([{ pts: a.first.map((v, k) => [k - 0.17, 100 * v / a.tot]), type: "bars", w: 0.3, color: "#5ad1ff", label: "first choices" }, { pts: a.borda.map((v, k) => [k + 0.17, 50 * v / a.tot]), type: "bars", w: 0.3, color: "#c9a0ff", label: "Borda" }], { xMin: -0.6, xMax: 2.6, yMin: 0, xFmt: v => CAND[Math.round(v)] || "" }); }
  else {
  chA.opts.title = "Party positions, round by round"; chA.opts.xLabel = "round"; chA.opts.yLabel = "position (left − / right +)";
  chA.draw(pos.map((q, k) => ({ pts: trail.map((tp, j) => [round - trail.length + j + 1, tp[k]]), color: PC[k], label: PN[k] })), { yMin: -1, yMax: 1, hlines: [{ y: md, color: "#fff", label: "median voter" }] }); }
  chB.opts.title = "Random electorates: % with a Condorcet cycle"; chB.opts.xLabel = "elections"; chB.opts.yLabel = "% with a cycle";
  chB.draw([{ pts: rand.hist, color: "#ffd166", label: `${P.nRand} voters each` }], { yMin: 0, yMax: 20, hlines: [{ y: 8.77, color: "#cfd8ea", label: "8.77% (large electorates)" }] });
  const V = votes(VV, pos, P), tot = V.t.reduce((a, b) => a + b, 0) || 1, a = analyse(S);
  read.set("med", md.toFixed(2)); read.set("pos", pos.map(q => q.toFixed(2)).join(" / ")); read.set("share", V.t.map(v => (100 * v / tot).toFixed(1) + "%").join(" / ")); read.set("turn", (100 * tot / NV).toFixed(0) + "%");
  read.set("win", [a.plurality, a.av, a.bordaW].map(k => CAND[k]).join(" / ")); read.set("cond", a.cycle ? "none: a cycle" : a.condorcet != null ? CAND[a.condorcet] : "none (tie)"); read.set("rc", rand.n ? `${(100 * rand.cyc / rand.n).toFixed(1)}% of ${rand.n}` : "press play in the paradox view");
  ui.hud(P.view === "paradox" ? "Condorcet winner: beats every rival head to head" : "two parties → the median voter");
}
let frame = 0;
ui.run(dt => tick(dt), () => { draw(); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("Two parties chase votes along the left–right line. Watch where they end up.", 7000);
