/* =====================================================================
   SOCIAL INFLUENCE
   CONFORMITY (Asch, 1951): participants judged which of three lines
   matched a standard line, after confederates had all given the same
   WRONG answer on 12 'critical' trials. About 37% of answers conformed;
   about 75% conformed at least once and 25% never did.
     group size: conformity rose up to about 3 confederates, then levelled off
     unanimity: one dissenting confederate cut conformity sharply
     task difficulty: harder (more similar lines) → more conformity
   Types: compliance (go along publicly), identification, internalisation.
   Explanations: normative social influence (to be liked) and
   informational social influence (to be right).
   OBEDIENCE (Milgram, 1963): 65% of participants gave the maximum
   450 V 'shock' when told to by an experimenter. Situational variables
   changed this: proximity, location, the authority's uniform.
   Explanations: agentic state, legitimacy of authority.
   MINORITY INFLUENCE (Moscovici, 1969): a small, CONSISTENT, COMMITTED
   and FLEXIBLE minority can gradually convert a majority. Each
   conversion makes the next more likely: the SNOWBALL effect, the
   route to SOCIAL CHANGE.
   This page simulates participants with different personal tendencies.
   ===================================================================== */
// ---------------- 1. Asch ----------------
const SIZE = [0, 0.09, 0.4, 0.88, 0.94, 0.97, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];   // effect of the number of confederates (rises then plateaus, after Asch 1955)
const PEOPLE_A = 0.42, PEOPLE_B = 0.72;                                             // each person's personal tendency to conform ~ Beta(a, b) (mean about 0.37)
function betaDraw(r, a, b) { const g = k => { if (k < 1) return g(k + 1) * Math.pow(r(), 1 / k); const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d); while (true) { let x, v; do { x = r.gauss(); v = 1 + c * x; } while (v <= 0); v = v * v * v; const u = r(); if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v; } }; const x = g(a), y = g(b); return x / (x + y); }
function aschProb(Q, tendency) { let p = tendency * SIZE[Math.min(15, Q.n)] * (1 + 1.2 * (Q.diff - 0.3)); if (Q.dissent) p *= 0.22; if (Q.private) p *= 0.33; return Math.min(1, Math.max(0, p)); }
function aschPerson(r, Q) { const t = betaDraw(r, PEOPLE_A, PEOPLE_B), p = aschProb(Q, t); let k = 0; for (let i = 0; i < 12; i++) if (r() < p) k++; return { t, k }; }
// ---------------- 2. Milgram ----------------
const MILG = { base: { name: "baseline (Yale, voice feedback)", p: 0.65 }, room: { name: "learner in the same room", p: 0.40 }, touch: { name: "touch: press the hand onto the plate", p: 0.30 }, phone: { name: "experimenter gives orders by phone", p: 0.205 }, office: { name: "run-down office building", p: 0.475 }, ordinary: { name: "experimenter in ordinary clothes", p: 0.20 }, peers: { name: "two other teachers rebel", p: 0.10 } };
function milgramStop(r, cond) { if (r() < MILG[cond].p) return 450; const u = r(); return u < 0.3 ? 300 : u < 0.55 ? 315 : 15 * Math.round((150 + r() * 270) / 15); }   // non-obedient people stop somewhere from 150 V, often near 300 V (the 'intense shock' point)
// ---------------- 3. Minority influence (agents) ----------------
function minoritySim(r, Q, steps) { const N = 100, core = Q.minority, ag = Array.from({ length: N }, (_, i) => i < core ? 1 : 0), hist = [];
  for (let s = 0; s < steps; s++) { const nB = ag.reduce((a, b) => a + b, 0), f = nB / N;
    for (let i = core; i < N; i++) { if (!ag[i]) { if (r() < 0.004 * Q.consist * (1 + Q.commit) * f + 0.02 * Q.consist * f * f) ag[i] = 1; } else if (r() < 0.006 * (1 - Q.consist) * (1 - f) + (Q.flex ? 0 : 0.003)) ag[i] = 0; }
    if (Q.consist < 0.5 && r() < 0.02) { const j = r.int(core); ag[j] = 1 - ag[j]; }       // an inconsistent minority wavers
    hist.push(nB / N); }
  return { ag, hist };
}

// ---------------- 4. State ----------------
const DEF = { mode: "asch", n: 6, dissent: false, private: false, diff: 0.3, cond: "base", minority: 4, consist: 0.9, commit: 0.6, flex: true, people: 40 };
const P = Object.assign({}, DEF);
let rand = K.rng(Date.now() % 1e6), people = [], mstate = null, mstep = 0, anim = 0, mAcc = 0;
function runStudy() { anim = 0; if (P.mode === "asch") people = Array.from({ length: P.people }, () => aschPerson(rand, P)); if (P.mode === "milgram") people = Array.from({ length: P.people }, () => milgramStop(rand, P.cond)); if (P.mode === "minority") { mstate = { ag: Array.from({ length: 100 }, (_, i) => i < P.minority ? 1 : 0), hist: [] }; mstep = 0; } }

// ---------------- 5. The page ----------------
const ui = K.app({
  title: "Social Influence", subject: "Psychology",
  blurb: "Run Asch's line study, Milgram's obedience study and its variations, and watch a consistent minority convert a majority, with simulated participants",
  reset: () => runStudy(),
  levels: { std: "AS (AQA 7181)", adv: "A level (AQA 7182)", specs: {
    std: "AQA AS and A level Psychology (7181/7182) 3.1.1 Social influence: types and explanations of conformity; Asch's research and variations (group size, unanimity, task difficulty); conformity to social roles (Zimbardo); obedience (Milgram) and situational variables (proximity, location, uniform); explanations (agentic state, legitimacy of authority, authoritarian personality); resistance (social support, locus of control); minority influence (consistency, commitment, flexibility) and social change.",
    adv: "AQA A level Psychology (7182): evaluating social influence research (ethics: deception, protection from harm, right to withdraw; validity; temporal and cultural context), and using the data: percentages, distributions and sampling variation." } },
  missions: [
    { title: "Asch's line study", q: "Run Asch's study with 6 confederates. What percentage of critical answers conform? What fraction of participants never conform?", hint: "About a third of answers conform (Asch: 36.8%); about a quarter never conform and three-quarters conform at least once. Big individual differences.", setup: () => set({ mode: "asch", n: 6 }) },
    { title: "Group size", q: "Change the number of confederates from 1 to 15. When does conformity stop increasing?", hint: "It rises sharply up to about 3 confederates, then levels off: adding more makes little difference (Asch, 1955).", setup: () => set({ mode: "asch", n: 1 }) },
    { title: "A dissenter", q: "Add one confederate who gives the right answer. What happens to conformity?", hint: "It falls to about a quarter of its level (Asch found 5.5%). Social support breaks the group's unanimity and frees the participant from normative pressure: a key way to resist social influence.", setup: () => set({ mode: "asch", dissent: true }) },
    { title: "Harder task, private answers", q: "Make the lines more similar (harder). Then let participants write answers privately. Which kind of influence does each change show?", hint: "Harder tasks increase conformity: informational influence (people look to others when unsure). Private answers reduce it: much of the conformity was normative (compliance, not changed belief).", setup: () => set({ mode: "asch", diff: 0.8 }) },
    { title: "Milgram's obedience study", q: "Run the baseline condition with 40 participants. How many go to 450 V? Where do the others stop?", hint: "About 65% (26 of 40) gave the maximum shock; all went to at least 300 V in Milgram's study. Each sample of 40 differs a little by chance.", setup: () => set({ mode: "milgram", cond: "base" }) },
    { title: "Situational variables", q: "Compare proximity (same room, touch), location (run-down office) and uniform (ordinary clothes). Which variable has the biggest effect?", hint: "Touch (30%) and an ordinary-clothed or phoning experimenter (20%) reduce obedience most. Closeness to the victim and the legitimacy and presence of the authority matter more than the building.", setup: () => set({ mode: "milgram", cond: "touch" }) },
    { lvl: "adv", title: "Minority influence", q: "A consistent, committed minority of 4 out of 100. Run for a while. Does the majority change? Now make the minority inconsistent.", hint: "A consistent minority slowly gains converts, and then faster as each convert adds pressure (the snowball effect). An inconsistent minority makes little headway: consistency is the key (Moscovici's blue-green slides).", setup: () => set({ mode: "minority", consist: 0.9 }) },
  ],
  batch: [
    { title: "Asch: group size", question: "What percentage of critical answers conform, for different numbers of confederates?", how: "Each point: 40 simulated participants × 12 critical trials.", xLabel: "number of confederates", yLabel: "% conforming answers", xs: [1, 2, 3, 4, 6, 8, 12, 15], reps: 4, yMin: 0, yMax: 60, theory: n => 100 * PEOPLE_A / (PEOPLE_A + PEOPLE_B) * SIZE[n] * (1 + 1.2 * (DEF.diff - 0.3)), theoryLabel: "model average", run: (n, r) => { let k = 0; for (let i = 0; i < 40; i++) k += aschPerson(r, Object.assign({}, DEF, { n })).k; return 100 * k / 480; }, note: "Rises steeply to 3 then plateaus, as Asch found. Each point is one study of 40 people, so the points scatter around the model's average." },
    { title: "Asch: who never conforms?", question: "In a study of 40, what fraction of participants never conform on any of the 12 critical trials?", how: "Each run: one study of 40 (6 confederates).", yLabel: "fraction who never conformed", reps: 300, bins: 20, theory: 0.25, theoryLabel: "Asch: about 25%", run: (x, r) => { let k = 0; for (let i = 0; i < 40; i++) if (aschPerson(r, DEF).k === 0) k++; return k / 40; }, note: "Close to a quarter on average: people differ a lot in their tendency to conform. Samples of 40 give anything from about 10% to 40%." },
    { title: "Milgram's variations", question: "What percentage obey to 450 V in each condition? (1 baseline, 2 same room, 3 touch, 4 phone, 5 office, 6 ordinary clothes, 7 rebel peers)", how: "Each point: a sample of 40 participants.", xLabel: "condition", yLabel: "% obedient to 450 V", xs: [1, 2, 3, 4, 5, 6, 7], reps: 4, yMin: 0, yMax: 100, theory: k => 100 * Object.values(MILG)[Math.round(k) - 1].p, theoryLabel: "Milgram's percentages", run: (k, r) => { const cnd = Object.keys(MILG)[k - 1]; let o = 0; for (let i = 0; i < 40; i++) if (milgramStop(r, cnd) === 450) o++; return 100 * o / 40; }, note: "Samples of 40 vary by about ±7 percentage points, so small differences between real variations (each run with 40 people) should be interpreted carefully." },
    { title: "Consistency and minority influence (A level)", question: "After 300 rounds, what share of the population holds the minority view, for different levels of consistency?", how: "Each point: one population of 100 with a committed minority of 4.", xLabel: "consistency of the minority", yLabel: "share holding the minority view", xs: [0.1, 0.3, 0.5, 0.7, 0.9, 1], reps: 4, yMin: 0, yMax: 1, run: (c, r) => { const s = minoritySim(r, Object.assign({}, DEF, { consist: c }), 300); return s.hist[s.hist.length - 1]; }, note: "Little change until the minority is quite consistent; then conversions snowball. The model's rates are chosen to show the pattern, not fitted to data." },
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "3.1.1", text: "Conformity types: compliance (public only), identification (with a group we value), internalisation (private and public). Explanations: NSI (desire to be liked) and ISI (desire to be right, especially when unsure)." },
      { lvl: "std", tag: "3.1.1", text: "Asch: 36.8% conformity on critical trials; 25% never conformed. Conformity rose with group size up to 3, fell to 5.5% with one dissenter, and rose with task difficulty. Limitations: 1950s US male students; artificial task; deception." },
      { lvl: "std", tag: "3.1.1", text: "Milgram: 65% went to 450 V. Lower with proximity (40% same room, 30% touch), lower legitimacy (47.5% office), lower authority (20% ordinary person or by phone). Explanations: agentic state, legitimacy of authority; dispositional: authoritarian personality." },
      { lvl: "std", tag: "3.1.1", text: "Resistance: social support (a dissenter or disobedient peer) and an internal locus of control. Minority influence: consistency (synchronic and diachronic), commitment (augmentation principle), flexibility; leads to internalisation and, through snowballing, social change." },
      { lvl: "adv", tag: "Issues", text: "Ethics: Milgram and Asch used deception; Milgram's participants were distressed, and the right to withdraw was undermined by prods. Today these studies would need careful justification, debriefing and protection from harm." },
    ],
    questions: [
      { lvl: "std", marks: 3, q: () => { if (P.mode !== "asch" || !people.length) return "In Asch's study, 25% of participants never conformed. Explain what this suggests about conformity."; const k = people.reduce((a, b) => a + b.k, 0), nv = people.filter(p => !p.k).length; return `In your simulated study (${P.people} participants, ${P.n} confederates${P.dissent ? ", one dissenter" : ""}), ${(100 * k / (12 * P.people)).toFixed(1)}% of critical answers conformed and ${nv} participants never conformed. What do these results suggest?`; }, ans: "<ul><li>a substantial minority of answers conformed even though the correct answer was obvious</li><li>but many people resisted, and there are large individual differences</li><li>situational factors (group size, unanimity, difficulty) change the level of conformity</li></ul>" },
      { lvl: "std", marks: 4, q: "Explain how two situational variables affect obedience, referring to Milgram's variations.", ans: "<ul><li>proximity: with the learner in the same room obedience fell to 40% (touch 30%): the consequences are harder to ignore</li><li>location: in a run-down office building 47.5%: less legitimate setting</li><li>uniform: an ordinary-clothed experimenter: 20%: less perceived legitimate authority</li><li>(any two, each explained)</li></ul>" },
      { lvl: "adv", marks: 6, q: "Discuss the role of consistency in minority influence, referring to research.", ans: "<ul><li>Moscovici (1969): a consistent minority calling blue slides 'green' produced 8.4% green answers; inconsistent only 1.25%</li><li>consistency makes others rethink (deeper processing, internalisation)</li><li>commitment and flexibility also matter (Nemeth: a rigid minority is less persuasive)</li><li>snowball effect explains social change (e.g. suffragettes)</li><li>evaluation: artificial tasks, and lab groups lack real-world power and history</li></ul>" },
    ]
  },
  notes: `<h3>The models</h3><ul><li><b>Asch:</b> each simulated participant has a personal tendency to conform drawn from a Beta distribution (mean about 0.37, many near 0). On each of 12 critical trials they conform with probability tendency × group-size effect × difficulty, reduced to 22% with a dissenter and 33% with private answers.</li><li><b>Milgram:</b> each participant obeys to 450 V with the probability Milgram found for that condition; otherwise they stop at a voltage from 150 V up, often near 300 V.</li><li><b>Minority:</b> 100 agents. Majority members convert with a probability that rises with the minority's consistency and commitment and with the share already converted (snowball). Converts may drift back if the minority is inconsistent or rigid.</li></ul>
<h3>Assumptions and simplifications</h3><ul><li>The percentages come from the original studies (1950s–60s, mostly American men): later replications and other cultures give different figures.</li><li>Real behaviour depends on personality, culture, gender and the exact procedure; the model only varies the situational factors you can control.</li><li>The minority model is illustrative: its rates were chosen to show consistency and snowballing, not fitted to data.</li><li>Simulation avoids the ethical problems (deception, distress) of re-running these studies with real people.</li></ul>`,
});

// ---------------- 6. Controls ----------------
const C = {};
let g = ui.group("Study");
C.mode = K.seg(g, { value: "asch", options: [["asch", "Asch: conformity"], ["milgram", "Milgram: obedience"], ["minority", "minority influence (A level)"]], on: v => set({ mode: v }) });
const ga = ui.group("Asch's procedure"), gm = ui.group("Milgram's variation"), gn = ui.group("The minority");
C.n = K.slider(ga, { label: "Number of confederates", min: 1, max: 15, step: 1, value: 6, on: v => { P.n = v; runStudy(); } });
C.dissent = K.toggle(ga, { label: "One confederate gives the right answer", value: false, on: v => { P.dissent = v; runStudy(); } });
C.diff = K.slider(ga, { label: "Task difficulty (how similar the lines are)", min: 0, max: 1, step: 0.1, value: 0.3, fmt: v => v < 0.3 ? "easy" : v < 0.7 ? "medium" : "hard", on: v => { P.diff = v; runStudy(); } });
C.private = K.toggle(ga, { label: "Answers written privately", value: false, on: v => { P.private = v; runStudy(); } });
C.cond = K.seg(gm, { value: "base", options: Object.entries(MILG).map(([k, v]) => [k, v.name]), on: v => { P.cond = v; runStudy(); } });
C.minority = K.slider(gn, { label: "Size of the minority (of 100)", min: 1, max: 20, step: 1, value: 4, on: v => { P.minority = v; runStudy(); } });
C.consist = K.slider(gn, { label: "Consistency", min: 0, max: 1, step: 0.05, value: 0.9, on: v => P.consist = v });
C.commit = K.slider(gn, { label: "Commitment", min: 0, max: 1, step: 0.05, value: 0.6, on: v => P.commit = v });
C.flex = K.toggle(gn, { label: "Flexible (not rigid or dogmatic)", value: true, on: v => P.flex = v });
C.people = K.slider(ui.controls, { label: "Participants", min: 10, max: 200, step: 10, value: 40, on: v => { P.people = v; runStudy(); } });
let rw = K.row(ui.controls); K.btn(rw, "▶ Run the study again", () => runStudy(), "primary");
const read = K.readout(ui.group("Results"), [["a", ""], ["b", ""], ["c", ""]]);
const relabel = n => n.forEach((x, i) => read.el.children[i].firstElementChild.textContent = x);
function showCtl() { ga.style.display = P.mode === "asch" ? "" : "none"; gm.style.display = P.mode === "milgram" ? "" : "none"; gn.style.display = P.mode === "minority" ? "" : "none"; C.people.el.style.display = P.mode === "minority" ? "none" : ""; C.mode.el.querySelectorAll("button")[2].style.display = ui.level === "adv" ? "" : "none"; }
function set(o) { Object.assign(P, DEF, o); if (P.mode === "minority" && ui.setLevel && ui.level !== "adv") ui.setLevel("adv"); for (const k of ["mode", "n", "dissent", "diff", "private", "cond", "minority", "consist", "commit", "flex", "people"]) C[k].set(P[k]); showCtl(); runStudy(); }

// ---------------- 7. Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#c9d4ea", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,system-ui,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function person(c, x, y, s, col) { c.fillStyle = col; c.beginPath(); c.arc(x, y - s * 0.95, s * 0.32, 0, 6.3); c.fill(); c.beginPath(); c.moveTo(x - s * 0.4, y + s * 0.3); c.quadraticCurveTo(x, y - s * 0.9, x + s * 0.4, y + s * 0.3); c.fill(); }
function tick(dt) { anim = Math.min(1, anim + dt / 4); if (P.mode === "minority" && mstate) { mAcc += dt * 30; const steps = Math.floor(mAcc); mAcc -= steps; for (let k = 0; k < steps && mstep < 600; k++) { const N = 100, core = P.minority, ag = mstate.ag, nB = ag.reduce((a, b) => a + b, 0), f = nB / N; for (let i = core; i < N; i++) { if (!ag[i]) { if (rand() < 0.004 * P.consist * (1 + P.commit) * f + 0.02 * P.consist * f * f) ag[i] = 1; } else if (rand() < 0.006 * (1 - P.consist) * (1 - f) + (P.flex ? 0 : 0.003)) ag[i] = 0; } if (P.consist < 0.5 && rand() < 0.02) { const j = rand.int(core); ag[j] = 1 - ag[j]; } mstate.hist.push(nB / N); mstep++; } } }
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1222"; c.fillRect(0, 0, w, h);
  if (P.mode === "asch") {
    // the line task and the group around the table
    const lx = w * 0.12, ly = 40, L = 110 + 0, cmp = [L * (1.05 + 0.5 * (1 - P.diff)), L, L * (0.95 - 0.4 * (1 - P.diff))].map(v => Math.max(30, v));
    TX(c, "standard", lx, ly + 14, "#8fa0bf", "center", "11px"); c.fillStyle = "#fff"; c.fillRect(lx - 3, ly + 24, 6, L); ["A", "B", "C"].forEach((n, i) => { const x = lx + 70 + i * 50; c.fillRect(x - 3, ly + 24, 6, cmp[i]); TX(c, n, x, ly + 14, "#8fa0bf", "center", "600 12px"); });
    TX(c, "correct: B · the confederates all say 'A'", lx + 100, ly + L + 50, "#c9d4ea", "center", "12px");
    const cx = w * 0.62, cy = h * 0.3, R = Math.min(w * 0.28, h * 0.2); for (let i = 0; i <= Math.min(P.n, 15); i++) { const a = Math.PI * (0.15 + 0.7 * i / Math.max(1, Math.min(P.n, 15))), x = cx + R * Math.cos(a) * 1.4, y = cy + R * Math.sin(a) * 0.6; const isP = i === Math.min(P.n, 15) - 1 && false; person(c, x, y, 22, i === 0 && P.dissent ? "#7ee787" : "#8fa0bf"); TX(c, i === 0 && P.dissent ? "'B'" : "'A'", x, y - 32, i === 0 && P.dissent ? "#7ee787" : "#ff9aa9", "center", "600 11px"); }
    person(c, cx, cy + R * 0.95, 30, "#ffb454"); TX(c, "real participant", cx, cy + R * 0.95 + 26, "#ffb454", "center", "600 12px");
    // the class's results: one row of 12 trials per participant
    const y0 = h * 0.56, show = Math.ceil(anim * people.length), rows = Math.min(people.length, Math.floor((h - y0 - 10) / 9)), cols = Math.ceil(people.length / rows) || 1, cw = (w - 60) / cols;
    TX(c, "each participant's 12 critical trials (red = conformed)", 30, y0 - 8, "#c9d4ea", "left", "12px");
    people.slice(0, show).forEach((p, i) => { const col = Math.floor(i / rows), row = i % rows, x = 30 + col * cw, y = y0 + row * 9; const rr = K.rng(i * 31 + 7); for (let t = 0; t < 12; t++) { c.fillStyle = t < p.k ? "#ff6b81" : "#2e9e5b"; c.fillRect(x + t * Math.min(12, (cw - 10) / 12), y, Math.min(11, (cw - 10) / 12 - 1), 7); } });
    const k = people.reduce((a, b) => a + b.k, 0); ui.hud(`conforming answers: <b>${(100 * k / (12 * people.length)).toFixed(1)}%</b><br>never conformed: ${people.filter(p => !p.k).length} of ${people.length}`);
  } else if (P.mode === "milgram") {
    const v = 15 + Math.floor(anim * 29) * 15, x0 = 60, x1 = w - 40, y0 = 60, yb = h - 70;
    TX(c, `MILGRAM: ${MILG[P.cond].name}`, 20, 30, "#ffd166", "left", "600 14px");
    const levels = [[15, "slight"], [75, "moderate"], [135, "strong"], [195, "very strong"], [255, "intense"], [315, "extreme intensity"], [375, "danger: severe"], [435, "XXX"]];
    c.fillStyle = "#121b30"; c.fillRect(x0, yb, x1 - x0, 26); levels.forEach(([vv, lab]) => { const x = x0 + (vv - 15) / 435 * (x1 - x0); TX(c, lab, x + 4, yb + 18, vv >= 375 ? "#ff9aa9" : "#8fa0bf", "left", "10px"); });
    for (let s = 15; s <= 450; s += 15) { const x = x0 + (s - 15) / 435 * (x1 - x0); TX(c, s, x, yb + 42, "#5d6e93", "center", "9px"); }
    // each participant climbs the shock generator until their stopping point
    const lane = Math.min(10, (yb - y0 - 20) / people.length); people.forEach((stop, i) => { const reach = Math.min(stop, v), x = x0 + (reach - 15) / 435 * (x1 - x0), y = y0 + i * lane; c.fillStyle = "rgba(255,180,84,.3)"; c.fillRect(x0, y, x - x0, Math.max(2, lane - 2)); c.fillStyle = stop === 450 && v >= 450 ? "#ff6b81" : v > stop ? "#7ee787" : "#ffb454"; c.fillRect(x - 3, y, 6, Math.max(2, lane - 2)); });
    const ob = people.filter(s => s === 450).length; ui.hud(`switch reached: ${v} V<br>${v >= 450 ? `<b>${ob} of ${people.length} (${(100 * ob / people.length).toFixed(0)}%) went to 450 V</b>` : `still going: ${people.filter(s => s >= v).length}`}<br>green = refused to continue`);
  } else {
    const ag = mstate.ag, cols = 20, s = Math.min((w - 40) / cols, (h - 120) / 5); TX(c, "MINORITY INFLUENCE: each square is one person (green = minority view)", 20, 30, "#ffd166", "left", "600 14px");
    ag.forEach((v, i) => { const x = 20 + (i % cols) * s, y = 50 + Math.floor(i / cols) * s; c.fillStyle = v ? (i < P.minority ? "#2e9e5b" : "#7ee787") : "#3d7fbf"; c.fillRect(x + 2, y + 2, s - 4, s - 4); if (i < P.minority) { c.strokeStyle = "#fff"; c.lineWidth = 2; c.strokeRect(x + 2, y + 2, s - 4, s - 4); c.lineWidth = 1; } });
    TX(c, "white border: the original committed minority", 20, 50 + 5 * s + 20, "#c9d4ea", "left", "12px");
    ui.hud(`round ${mstep}: ${ag.filter(Boolean).length}% hold the minority view`);
  }
}
function panels() {
  if (P.mode === "asch") {
    const k = people.reduce((a, b) => a + b.k, 0), never = people.filter(p => !p.k).length, once = people.filter(p => p.k).length; relabel(["Conforming answers", "Never conformed", "Conformed at least once"]); read.set("a", (100 * k / (12 * people.length)).toFixed(1) + "%"); read.set("b", `${never} (${(100 * never / people.length).toFixed(0)}%)`); read.set("c", `${once} (${(100 * once / people.length).toFixed(0)}%)`);
    const hc = new Array(13).fill(0); people.forEach(p => hc[p.k]++); chA.opts.title = "How many of the 12 critical trials each person conformed on"; chA.opts.xLabel = "conforming answers (of 12)"; chA.opts.yLabel = "participants"; chA.draw([{ pts: hc.map((v, i) => [i, v]), type: "bars", w: 0.8, color: K.cssVar("--s3") }], { xMin: -0.6, xMax: 12.6 });
    const G = []; for (let n = 1; n <= 15; n++) G.push([n, 100 * PEOPLE_A / (PEOPLE_A + PEOPLE_B) * aschProb(Object.assign({}, P, { n }), 1)]); chB.opts.title = "Model: conformity against group size (current settings)"; chB.opts.xLabel = "confederates"; chB.opts.yLabel = "% conforming"; chB.draw([{ pts: G, color: K.cssVar("--s1") }, { pts: G, type: "dots", color: K.cssVar("--s1") }], { yMin: 0, vlines: [{ x: P.n }] });
  } else if (P.mode === "milgram") {
    const ob = people.filter(s => s === 450).length; relabel(["Obeyed to 450 V", "Milgram's figure", "Mean stopping voltage"]); read.set("a", `${ob} of ${people.length} (${(100 * ob / people.length).toFixed(0)}%)`); read.set("b", (100 * MILG[P.cond].p).toFixed(1) + "%"); read.set("c", K.mean(people).toFixed(0) + " V");
    const hc = K.histogram(people, 20, 142.5, 457.5); chA.opts.title = "Where participants stopped"; chA.opts.xLabel = "maximum voltage given"; chA.opts.yLabel = "participants"; chA.draw([{ pts: hc.pts, w: hc.w, type: "bars", color: K.cssVar("--s3"), alpha: .8 }]);
    const keys = Object.keys(MILG); chB.opts.title = "Milgram's variations (% obedient)"; chB.opts.xLabel = "1 base · 2 room · 3 touch · 4 phone · 5 office · 6 clothes · 7 peers"; chB.opts.yLabel = "%"; chB.draw([{ pts: keys.map((k, i) => [i + 1, 100 * MILG[k].p]), type: "bars", w: 0.7, color: K.cssVar("--s0") }, { pts: [[keys.indexOf(P.cond) + 1, 100 * ob / people.length]], type: "dots", r: 6, color: K.cssVar("--s1"), label: "your sample" }], { xMin: 0.4, xMax: 7.6, yMin: 0, yMax: 100 });
  } else {
    relabel(["Round", "Minority view now", "Original minority"]); read.set("a", mstep); read.set("b", mstate.ag.filter(Boolean).length + "%"); read.set("c", P.minority + "%");
    chA.opts.title = "Share holding the minority view"; chA.opts.xLabel = "round"; chA.opts.yLabel = "share"; chA.draw([{ pts: mstate.hist.map((v, i) => [i, v]), color: K.cssVar("--s2") }], { yMin: 0, yMax: 1 });
    const R = []; for (let f = 0; f <= 1.0001; f += 0.05) R.push([f, 100 * (0.004 * P.consist * (1 + P.commit) * f + 0.02 * P.consist * f * f)]); chB.opts.title = "Chance a majority member converts each round (snowball)"; chB.opts.xLabel = "share already holding the minority view"; chB.opts.yLabel = "% per round"; chB.draw([{ pts: R, color: K.cssVar("--s1") }], { yMin: 0 });
  }
}
let frame = 0;
ui.run(dt => tick(dt), () => { draw(); if (frame++ % 6 === 0) panels(); });
ui.onLevel = v => { if (v === "std" && P.mode === "minority") set({}); showCtl(); };
set({});
ui.tip("Each row is one simulated participant's 12 critical trials.", 7000);
