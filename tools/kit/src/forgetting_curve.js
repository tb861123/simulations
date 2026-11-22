/* =====================================================================
   FORGETTING
   THE FORGETTING CURVE (Ebbinghaus, 1885): memory falls fast at first,
   then more slowly. Here retention R = (1 + 3t/S)^(−½), where S is the
   memory's STABILITY (a 'power-law' curve, which fits real data better
   than a simple exponential). Each successful revision raises S, so the next decline is
   slower: SPACED revision (reviews spread out) beats MASSED revision
   (cramming), even for the same total time.
   INTERFERENCE: memories compete. RETROACTIVE interference: new
   learning disrupts old memories. PROACTIVE interference: old learning
   disrupts new memories. The more similar the material, the worse the
   interference (McGeoch and McDonald, 1931).
   RETRIEVAL FAILURE: the memory is there but cannot be found without
   the right CUE (encoding specificity, Tulving). Context-dependent
   forgetting: recall is better in the same environment as learning
   (Godden and Baddeley, 1975, divers on land and under water).
   State-dependent forgetting: better in the same internal state
   (Carter and Cassaday, 1998, antihistamines).
   ===================================================================== */
// ---------------- 1. Models (each person varies a little) ----------------
// retention of material after reviews at the given days (day 0 = first learning); stability grows with each review, more if the review came after some forgetting
// retention t days after the last review for a memory of stability S: a power-law forgetting curve (fast, then slow)
const Rf = (t, S) => Math.pow(1 + 3 * t / S, -0.5);
function retentionCurve(reviews, S0, gain, days, person = 1) {
  const pts = [], rv = reviews.slice().sort((a, b) => a - b); let S = S0 * person, last = 0, k = 0;
  for (let d = 0; d <= days + 1e-9; d += 0.25) { while (k < rv.length && rv[k] <= d) { const R = Rf(rv[k] - last, S); S *= 1 + gain * (1 - R) + 0.15; last = rv[k]; k++; } pts.push([d, Rf(d - last, S)]); }
  return pts;
}
const retentionAt = (reviews, S0, gain, day, person) => { const c = retentionCurve(reviews, S0, gain, day, person); return c[c.length - 1][1]; };
const SCHED = { none: { name: "learn once", r: [] }, massed: { name: "cram: 4 reviews on day 1", r: [0.25, 0.5, 0.75, 1] }, spaced: { name: "spaced: days 1, 3, 7, 14", r: [1, 3, 7, 14] }, expand: { name: "expanding: days 1, 2, 4, 8, 16", r: [1, 2, 4, 8, 16] } };
// interference: words recalled from list A (20 words) after learning list B of a given similarity, with a retention interval
function interference(r, kind, sim) { const base = 14, loss = kind === "none" ? 0 : (kind === "retro" ? 9 : 7) * sim; return Math.max(0, Math.min(20, Math.round(base - loss + 2.2 * r.gauss()))); }
// retrieval: words recalled (of 36) when learning and recall contexts match or not
function contextRecall(r, learn, recall, effect) { const m = 11.5 * (learn === recall ? 1 : 1 - effect); return Math.max(0, Math.round(m + 2.5 * r.gauss())); }

// ---------------- 2. State ----------------
const DEF = { mode: "curve", sched: "spaced", S0: 1.0, gain: 2.5, exam: 30, people: 30, kind: "retro", sim: 0.8, effect: 0.35, state: "context" };
const P = Object.assign({}, DEF);
let rand = K.rng(Date.now() % 1e6), cls = [], anim = 0;
function runClass() {
  cls = [];
  if (P.mode === "curve") for (let i = 0; i < P.people; i++) cls.push(Math.exp(0.25 * rand.gauss()));
  if (P.mode === "interf") for (const k of ["none", "retro", "pro"]) cls.push(Array.from({ length: P.people }, () => interference(rand, k, P.sim)));
  if (P.mode === "cue") for (const [a, b] of [["L", "L"], ["L", "W"], ["W", "L"], ["W", "W"]]) cls.push(Array.from({ length: Math.max(4, Math.round(P.people / 4)) }, () => contextRecall(rand, a, b, P.effect)));
  anim = 0;
}

// ---------------- 3. The page ----------------
const ui = K.app({
  title: "Forgetting", subject: "Psychology",
  blurb: "Why we forget: the Ebbinghaus forgetting curve and spaced revision, proactive and retroactive interference, and context- and state-dependent retrieval failure, with simulated classes",
  reset: () => runClass(),
  levels: { std: "AS (AQA 7181)", adv: "A level (AQA 7182)", specs: {
    std: "AQA AS and A level Psychology (7181/7182) 3.1.2 Memory: explanations for forgetting: proactive and retroactive interference, and retrieval failure due to the absence of cues (context- and state-dependent forgetting, encoding specificity).",
    adv: "AQA A level Psychology (7182) Memory and research methods: evaluating forgetting research (McGeoch and McDonald, Godden and Baddeley, Carter and Cassaday) for ecological validity and controls; designing and analysing experiments (independent groups and repeated measures; the 2 × 2 design). The forgetting curve and spacing effect are applied research, beyond the specification." } },
  missions: [
    { title: "The forgetting curve", q: "Learn once and do nothing else. How much is left after 1 day? After a week? What shape is the curve?", hint: "Most is lost in the first day or two, then the curve flattens: Ebbinghaus's exponential-like decline. Real figures depend on the material: meaningful material is forgotten more slowly than nonsense syllables.", setup: () => set({ mode: "curve", sched: "none" }) },
    { title: "Cram or space it out?", q: "Compare cramming (4 reviews on day 1) with spacing (days 1, 3, 7, 14). Which leaves more for an exam on day 30? Both use 4 reviews!", hint: "Spaced wins easily: each review comes after some forgetting, and effortful retrieval strengthens the memory more (the spacing effect). Cramming feels effective on day 1 but fades fast.", setup: () => set({ mode: "curve", sched: "massed" }) },
    { title: "Retroactive interference", q: "Learn list A, then a very similar list B (synonyms). Then recall A. Compare with no list B. Try dissimilar material.", hint: "Similar new learning disrupts recall of the old list most (McGeoch and McDonald, 1931: synonyms worst, numbers barely interfered).", setup: () => set({ mode: "interf", kind: "retro", sim: 0.9 }) },
    { title: "Proactive interference", q: "Now earlier learning interferes with a new list. Is it as strong as retroactive interference in this model?", hint: "Both reduce recall. Proactive interference builds up over several similar lists (Underwood, 1957: recall of a list fell with the number of lists learned before).", setup: () => set({ mode: "interf", kind: "pro", sim: 0.9 }) },
    { title: "Divers: context-dependent forgetting", q: "Godden and Baddeley (1975): divers learned words on land or under water, and recalled them on land or under water. Which conditions do best?", hint: "Matching contexts (land–land, water–water) recall about 40% more than mismatched ones: the environment acts as a retrieval cue. But the contexts were extremely different, which limits how far the finding generalises (e.g. to exam halls).", setup: () => set({ mode: "cue", state: "context" }) },
    { lvl: "adv", title: "Design: independent groups", q: "The divers' study used four groups. Why would repeated measures be difficult here? What is the independent variable and the dependent variable?", hint: "IVs: learning context and recall context (2 × 2). DV: words recalled. Repeated measures would need different word lists and counterbalancing (order effects), but give better control of individual differences.", setup: () => set({ mode: "cue", state: "context", people: 40 }) },
  ],
  batch: [
    { title: "Ebbinghaus forgetting curve", question: "Learn once: what fraction is retained after t days (class average)?", how: "Each point: a class of 30 with individual differences in memory stability.", xLabel: "days since learning", yLabel: "retention", xs: [0, 0.5, 1, 2, 4, 7, 14, 30], reps: 4, yMin: 0, yMax: 1, theory: t => Rf(t, DEF.S0), theoryLabel: "(1 + 3t/S)^−½ for the average person", run: (t, r) => { let s = 0; for (let i = 0; i < 30; i++) s += retentionAt([], DEF.S0, DEF.gain, t, Math.exp(0.25 * r.gauss())); return s / 30; }, note: "Steep then shallow. The class average falls slightly more slowly than the average person's curve, because people with very stable memories keep some for longer." },
    { title: "How many spaced reviews?", question: "Spacing reviews on days 1, 2, 4, 8, 16, …: how much is retained on day 30 for different numbers of reviews?", how: "Each point: a class of 30.", xLabel: "number of spaced reviews", yLabel: "retention on day 30", xs: [0, 1, 2, 3, 4, 5], reps: 4, yMin: 0, yMax: 1, run: (n, r) => { const rv = [1, 2, 4, 8, 16].slice(0, n); let s = 0; for (let i = 0; i < 30; i++) s += retentionAt(rv, DEF.S0, DEF.gain, 30, Math.exp(0.25 * r.gauss())); return s / 30; }, note: "Each well-timed review adds a lot of stability. In this model the gain is larger when the review comes after more forgetting (a 'desirable difficulty')." },
    { title: "Similarity and retroactive interference", question: "How many of 20 words from list A are recalled after learning list B, as B becomes more similar?", how: "Each point: a class of 30. Similarity 0 = numbers, 1 = synonyms.", xLabel: "similarity of list B", yLabel: "words recalled from A", xs: [0, 0.2, 0.4, 0.6, 0.8, 1], reps: 4, yMin: 0, yMax: 20, theory: s => 14 - 9 * s, theoryLabel: "model average", run: (s, r) => { let t = 0; for (let i = 0; i < 30; i++) t += interference(r, "retro", s); return t / 30; }, note: "Falls steadily with similarity, the pattern McGeoch and McDonald reported. The model is a straight line by assumption; the real relationship need not be." },
    { title: "Godden and Baddeley: matched minus mismatched", question: "How many more words are recalled when learning and recall contexts match?", how: "Each run: 10 divers per condition; mean(matched) − mean(mismatched).", yLabel: "extra words recalled when contexts match", reps: 300, bins: 24, theory: 11.5 * DEF.effect, theoryLabel: "model effect", run: (x, r) => { const m = Array.from({ length: 20 }, (_, i) => contextRecall(r, i % 2 ? "W" : "L", i % 2 ? "W" : "L", DEF.effect)), mm = Array.from({ length: 20 }, (_, i) => contextRecall(r, i % 2 ? "W" : "L", i % 2 ? "L" : "W", DEF.effect)); return K.mean(m) - K.mean(mm); }, note: "About 4 extra words out of about 11, but with only 10 divers per group the difference varies from study to study: one reason replications matter." },
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "3.1.2", text: "Interference: forgetting because one memory blocks another. Proactive: old disrupts new. Retroactive: new disrupts old. More likely when the memories are similar (McGeoch and McDonald)." },
      { lvl: "std", tag: "3.1.2", text: "Retrieval failure: information is available in LTM but not accessible without cues. Encoding specificity principle: cues help if present at encoding and at retrieval. Context-dependent (external environment) and state-dependent (internal state) forgetting." },
      { lvl: "std", tag: "3.1.2", text: "Evaluation: interference has strong lab support but uses artificial word lists over short times; retrieval failure is supported by real-world studies, but the contexts used are often extreme, and cues may matter less for complex material (recognition is less affected than recall)." },
      { lvl: "adv", tag: "Research methods", text: "Godden and Baddeley used a 2 × 2 independent-groups design (learn on land/under water × recall on land/under water). Field conditions increase ecological validity but reduce control (temperature, noise)." },
      { lvl: "beyond", tag: "applied", text: "Ebbinghaus's forgetting curve: rapid early loss, then levelling off. Spaced practice and retrieval practice (testing yourself) produce longer-lasting learning than massed study." },
    ],
    questions: [
      { lvl: "std", marks: 4, q: "Explain the difference between proactive and retroactive interference, using an example of each.", ans: "<ul><li>proactive: earlier learning disrupts recall of later learning</li><li>e.g. remembering your old phone number when trying to recall your new one</li><li>retroactive: later learning disrupts recall of earlier learning</li><li>e.g. after learning Spanish vocabulary, French words learned earlier are harder to recall</li></ul>" },
      { lvl: "std", marks: 4, q: () => { if (P.mode !== "cue" || cls.length < 4) return "Godden and Baddeley found matched contexts gave higher recall. Explain this using retrieval failure."; const m = cls.map(a => K.mean(a).toFixed(1)); return `In your simulation the mean recall was: land–land ${m[0]}, land–water ${m[1]}, water–land ${m[2]}, water–water ${m[3]}. Explain these results using retrieval failure.`; }, ans: "<ul><li>matched conditions recall more than mismatched</li><li>the learning context (land or water) is encoded with the words and acts as a cue</li><li>when the recall context differs, the cue is absent, so information is available but not accessible</li><li>this is context-dependent forgetting (encoding specificity)</li></ul>" },
      { lvl: "adv", marks: 6, q: "Discuss interference as an explanation of forgetting.", ans: "<ul><li>describe proactive and retroactive interference; similarity matters</li><li>support: lab experiments (McGeoch and McDonald) with controlled lists</li><li>support from real life: Baddeley and Hitch (1977) rugby players forgot more names of teams with more games in between</li><li>limitation: artificial lists and short intervals: low ecological validity</li><li>limitation: interference may be overcome by cues (Tulving and Psotka), suggesting retrieval failure explains some interference effects</li></ul>" },
    ]
  },
  notes: `<h3>The models</h3><ul><li><b>Forgetting curve:</b> retention (1 + 3t/S)^(−½) after the last review. Each review raises the stability S by a factor 1 + 0.15 + gain × (amount forgotten since the last review), so reviews after some forgetting help most. Each person's starting stability varies (lognormal, ±25%).</li><li><b>Interference:</b> about 14 of 20 words are recalled with no interference; similar interfering material removes up to 9 (retroactive) or 7 (proactive), with individual variation (SD 2.2 words).</li><li><b>Retrieval cues:</b> about 11.5 words of 36 recalled in a matched context and a fraction fewer in a mismatched one (SD 2.5).</li></ul>
<h3>Assumptions and simplifications</h3><ul><li>The numbers are chosen to resemble the classic findings, not taken from a single data set; real effects depend on material, motivation and individual differences.</li><li>Forgetting has several causes at once (decay, interference, retrieval failure, consolidation); the model separates them for clarity.</li><li>Simulated participants need no consent or debriefing, but a real study would.</li></ul>`,
});

// ---------------- 4. Controls ----------------
const C = {};
let g = ui.group("Explanation of forgetting");
C.mode = K.seg(g, { value: "curve", options: [["curve", "forgetting curve and revision"], ["interf", "interference"], ["cue", "retrieval failure (cues)"]], on: v => set({ mode: v }) });
const gc = ui.group("Revision"), gi = ui.group("Interference"), gr = ui.group("Retrieval cues");
C.sched = K.seg(gc, { value: "spaced", options: Object.entries(SCHED).map(([k, v]) => [k, v.name]), on: v => { P.sched = v; runClass(); } });
C.S0 = K.slider(gc, { label: "Starting stability S (how meaningful the material is)", min: 0.3, max: 5, step: 0.1, value: 1.2, unit: "days", on: v => { P.S0 = v; } });
C.exam = K.slider(gc, { label: "Exam on day", min: 7, max: 60, step: 1, value: 30, on: v => P.exam = v });
C.kind = K.seg(gi, { value: "retro", options: [["retro", "retroactive (new disrupts old)"], ["pro", "proactive (old disrupts new)"]], on: v => { P.kind = v; runClass(); } });
C.sim = K.slider(gi, { label: "Similarity of the other material", min: 0, max: 1, step: 0.1, value: 0.8, fmt: v => v < 0.2 ? "numbers (unrelated)" : v < 0.5 ? "unrelated words" : v < 0.8 ? "related words" : "synonyms", on: v => { P.sim = v; runClass(); } });
C.state = K.seg(gr, { value: "context", options: [["context", "context: land / under water"], ["state", "state: drug / no drug"]], on: v => { P.state = v; runClass(); } });
C.effect = K.slider(gr, { label: "Size of the cue effect", min: 0, max: 0.6, step: 0.05, value: 0.35, fmt: v => Math.round(v * 100) + "% fewer when mismatched", on: v => { P.effect = v; runClass(); } });
C.people = K.slider(ui.controls, { label: "Participants", min: 8, max: 200, step: 4, value: 30, on: v => { P.people = v; runClass(); } });
let rw = K.row(ui.controls); K.btn(rw, "▶ Run the study again", () => runClass(), "primary");
const read = K.readout(ui.group("Results"), [["a", ""], ["b", ""], ["c", ""], ["d", ""]]);
const relabel = n => n.forEach((x, i) => read.el.children[i].firstElementChild.textContent = x);
function showCtl() { gc.style.display = P.mode === "curve" ? "" : "none"; gi.style.display = P.mode === "interf" ? "" : "none"; gr.style.display = P.mode === "cue" ? "" : "none"; }
function set(o) { Object.assign(P, DEF, o); for (const k of ["mode", "sched", "S0", "exam", "kind", "sim", "state", "effect", "people"]) C[k].set(P[k]); showCtl(); runClass(); }

// ---------------- 5. Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#c9d4ea", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,system-ui,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function person(c, x, y, s, col, frac) { c.fillStyle = col; c.beginPath(); c.arc(x, y - s * 0.9, s * 0.35, 0, 6.3); c.fill(); c.fillRect(x - s * 0.3, y - s * 0.5, s * 0.6, s * 0.7); if (frac != null) { c.fillStyle = "#0b1222"; c.fillRect(x - s * 0.5, y + s * 0.3, s, 5); c.fillStyle = "#7ee787"; c.fillRect(x - s * 0.5, y + s * 0.3, s * frac, 5); } }
function draw(dt) {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1222"; c.fillRect(0, 0, w, h); anim = Math.min(1, anim + dt / 3);
  if (P.mode === "curve") {
    const x0 = 60, x1 = w - 30, y0 = 50, y1 = h - 60, D = P.exam, X = d => x0 + d / D * (x1 - x0), Y = v => y1 - v * (y1 - y0);
    c.strokeStyle = "#3a4a6e"; c.strokeRect(x0, y0, x1 - x0, y1 - y0); for (let k = 0; k <= 4; k++) TX(c, k * 25 + "%", x0 - 6, Y(k / 4) + 4, "#8fa0bf", "right", "11px"); for (let d = 0; d <= D; d += D > 30 ? 10 : 5) TX(c, "day " + d, X(d), y1 + 16, "#8fa0bf", "center", "11px");
    const show = Math.max(0.5, anim * D);
    cls.slice(0, 40).forEach(pf => { const pts = retentionCurve(SCHED[P.sched].r, P.S0, P.gain, show, pf); c.strokeStyle = "rgba(90,209,255,.18)"; c.beginPath(); pts.forEach(([d, v], i) => i ? c.lineTo(X(d), Y(v)) : c.moveTo(X(d), Y(v))); c.stroke(); });
    for (const [k, col] of [["none", "#8fa0bf"], [P.sched, "#ffb454"]]) { const pts = retentionCurve(SCHED[k].r, P.S0, P.gain, show, 1); c.strokeStyle = col; c.lineWidth = 3; c.beginPath(); pts.forEach(([d, v], i) => i ? c.lineTo(X(d), Y(v)) : c.moveTo(X(d), Y(v))); c.stroke(); c.lineWidth = 1; }
    for (const d of SCHED[P.sched].r) if (d <= show) { c.strokeStyle = "rgba(255,180,84,.5)"; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(X(d), y0); c.lineTo(X(d), y1); c.stroke(); c.setLineDash([]); TX(c, "review", X(d) + 3, y0 + 12, "#ffb454", "left", "10px"); }
    c.strokeStyle = "#ff6b81"; c.beginPath(); c.moveTo(X(D), y0); c.lineTo(X(D), y1); c.stroke(); TX(c, "EXAM", X(D) - 4, y0 + 26, "#ff6b81", "right", "600 12px");
    TX(c, `retention: grey = learn once, orange = ${SCHED[P.sched].name}; thin lines = individual students`, x0, 30, "#c9d4ea", "left", "13px");
    const ex = K.mean(cls.map(pf => retentionAt(SCHED[P.sched].r, P.S0, P.gain, D, pf))); ui.hud(`class average on exam day: <b>${(100 * ex).toFixed(0)}%</b>`);
  } else if (P.mode === "interf") {
    const labels = ["learn A, rest, recall A", P.kind === "retro" ? "learn A, learn B, recall A" : "learn B, learn A, recall A", ""], cols = ["#7ee787", "#ffb454"], gw = (w - 60) / 2;
    TX(c, P.kind === "retro" ? "RETROACTIVE INTERFERENCE: new learning (list B) disrupts recall of old (list A)" : "PROACTIVE INTERFERENCE: earlier learning (list B) disrupts recall of new (list A)", 20, 28, "#ffd166", "left", "600 14px");
    [0, 1].forEach(gi2 => { const data = cls[gi2 === 0 ? 0 : P.kind === "retro" ? 1 : 2], x0 = 30 + gi2 * gw; TX(c, gi2 === 0 ? "control group" : "experimental group", x0 + gw / 2, 62, "#c9d4ea", "center", "600 13px"); TX(c, labels[gi2], x0 + gw / 2, 80, "#8fa0bf", "center", "12px");
      const cols2 = 6, s = Math.min(36, (gw - 40) / cols2); data.slice(0, 36).forEach((v, i) => person(c, x0 + 30 + (i % cols2) * (s + 14), 130 + Math.floor(i / cols2) * (s + 24), s, cols[gi2], Math.min(1, anim * 1.5) * v / 20)); TX(c, `mean ${K.mean(data).toFixed(1)} of 20 words`, x0 + gw / 2, h - 30, cols[gi2], "center", "600 14px"); });
    ui.hud(`similarity: ${C.sim.el.querySelector("b").textContent}`);
  } else {
    const names = P.state === "context" ? ["learn on land → recall on land", "learn on land → recall under water", "learn under water → recall on land", "learn under water → recall under water"] : ["no drug → no drug", "no drug → drug", "drug → no drug", "drug → drug"], match = [1, 0, 0, 1];
    TX(c, P.state === "context" ? "CONTEXT-DEPENDENT FORGETTING (like Godden and Baddeley, 1975): 4 groups of divers" : "STATE-DEPENDENT FORGETTING (like Carter and Cassaday, 1998): antihistamine or none", 20, 28, "#ffd166", "left", "600 14px");
    const bw = (w - 80) / 4; names.forEach((n, i) => { const x = 40 + i * bw, m = K.mean(cls[i]), hh = (h - 170) * m / 20 * Math.min(1, anim * 1.5); c.fillStyle = match[i] ? (P.state === "context" ? (i === 0 ? "#c9a36b" : "#3d7fbf") : "#7ee787") : "#5d6e93"; c.fillRect(x + 10, h - 80 - hh, bw - 20, hh); TX(c, m.toFixed(1), x + bw / 2, h - 86 - hh, "#fff", "center", "600 14px"); TX(c, n, x + bw / 2, h - 60, "#c9d4ea", "center", "11px"); TX(c, match[i] ? "MATCHED" : "mismatched", x + bw / 2, h - 42, match[i] ? "#7ee787" : "#ff9aa9", "center", "600 11px"); });
    ui.hud(`matched mean ${K.mean(cls[0].concat(cls[3])).toFixed(1)} · mismatched ${K.mean(cls[1].concat(cls[2])).toFixed(1)} words`);
  }
}
function panels() {
  if (P.mode === "curve") {
    relabel(["Learn once: exam day", "Your schedule: exam day", "Reviews", "Day 1 retention (schedule)"]); const a = K.mean(cls.map(pf => retentionAt([], P.S0, P.gain, P.exam, pf))), b = K.mean(cls.map(pf => retentionAt(SCHED[P.sched].r, P.S0, P.gain, P.exam, pf)));
    read.set("a", (100 * a).toFixed(1) + "%"); read.set("b", (100 * b).toFixed(1) + "%"); read.set("c", SCHED[P.sched].r.length); read.set("d", (100 * K.mean(cls.map(pf => retentionAt(SCHED[P.sched].r, P.S0, P.gain, 1.01, pf)))).toFixed(0) + "%");
    chA.opts.title = "Every schedule, class average"; chA.opts.xLabel = "day"; chA.opts.yLabel = "retention"; chA.draw(Object.keys(SCHED).map((k, i) => ({ pts: retentionCurve(SCHED[k].r, P.S0, P.gain, P.exam, 1), color: K.cssVar("--s" + i), label: k })), { yMin: 0, yMax: 1, vlines: [{ x: P.exam, label: "exam" }] });
    const ex = cls.map(pf => retentionAt(SCHED[P.sched].r, P.S0, P.gain, P.exam, pf)), hg = K.histogram(ex, 12, 0, 1); chB.opts.title = "Students' retention on exam day (your schedule)"; chB.opts.xLabel = "retention"; chB.opts.yLabel = "students"; chB.draw([{ pts: hg.pts, w: hg.w, type: "bars", color: K.cssVar("--s1"), alpha: .8 }]);
  } else if (P.mode === "interf") {
    const ctl = cls[0], ex = cls[P.kind === "retro" ? 1 : 2]; relabel(["Control mean (SD)", "Experimental mean (SD)", "Difference", "Effect size (Cohen's d)"]);
    read.set("a", `${K.mean(ctl).toFixed(1)} (${K.sd(ctl).toFixed(1)})`); read.set("b", `${K.mean(ex).toFixed(1)} (${K.sd(ex).toFixed(1)})`); read.set("c", (K.mean(ctl) - K.mean(ex)).toFixed(1) + " words"); read.set("d", ((K.mean(ctl) - K.mean(ex)) / Math.sqrt((K.sd(ctl) ** 2 + K.sd(ex) ** 2) / 2)).toFixed(2));
    const S = []; for (let s = 0; s <= 1.0001; s += 0.1) S.push([s, 14 - (P.kind === "retro" ? 9 : 7) * s]); chA.opts.title = "Model: words recalled against similarity"; chA.opts.xLabel = "similarity"; chA.opts.yLabel = "words recalled from A"; chA.draw([{ pts: S, color: K.cssVar("--s1") }], { yMin: 0, yMax: 20, vlines: [{ x: P.sim }] });
    const ha = K.histogram(ctl, 10, 0, 20), hb = K.histogram(ex, 10, 0, 20); chB.opts.title = "Distributions of scores"; chB.opts.xLabel = "words recalled"; chB.opts.yLabel = "participants"; chB.draw([{ pts: ha.pts.map(p => [p[0] - 0.5, p[1]]), w: ha.w / 2, type: "bars", color: K.cssVar("--s2"), label: "control" }, { pts: hb.pts.map(p => [p[0] + 0.5, p[1]]), w: hb.w / 2, type: "bars", color: K.cssVar("--s1"), label: "experimental" }]);
  } else {
    const m = cls.map(a => K.mean(a)); relabel(["Matched (mean)", "Mismatched (mean)", "Difference", "Participants per group"]); read.set("a", ((m[0] + m[3]) / 2).toFixed(1)); read.set("b", ((m[1] + m[2]) / 2).toFixed(1)); read.set("c", ((m[0] + m[3] - m[1] - m[2]) / 2).toFixed(1) + " words"); read.set("d", cls[0].length);
    chA.opts.title = "Interaction plot: recall by learning and recall context"; chA.opts.xLabel = "recall context: 0 = same as land/no drug, 1 = water/drug"; chA.opts.yLabel = "mean words"; chA.draw([{ pts: [[0, m[0]], [1, m[1]]], color: K.cssVar("--s1"), label: P.state === "context" ? "learned on land" : "learned without" }, { pts: [[0, m[2]], [1, m[3]]], color: K.cssVar("--s0"), label: P.state === "context" ? "learned under water" : "learned with drug" }], { xMin: -0.2, xMax: 1.2, yMin: 0 });
    chB.opts.title = ""; chB.opts.xLabel = chB.opts.yLabel = ""; chB.draw([]);
  }
}
let frame = 0;
ui.run(() => { }, dt => { draw(dt); if (frame++ % 6 === 0) panels(); });
set({});
ui.tip("Thin lines are individual students. Compare cramming with spacing for the same number of reviews.", 7000);
