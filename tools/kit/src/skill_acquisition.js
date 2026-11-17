/* =====================================================================
   SKILL ACQUISITION AND REACTION TIME
   • REACTION TIME: time from a stimulus to the start of the response.
     More choices take longer (Hick's law: RT = a + b log₂N).
     Response time = reaction time + movement time.
   • INFORMATION PROCESSING: input → decision → output → feedback. We
     can only deal with one stimulus at a time (single-channel
     hypothesis), so a dummy (feint) delays the response to the real
     move: the psychological refractory period (PRP).
   • PRACTICE: performance improves quickly at first, then more slowly
     (the learning curve). How much is kept a week later (retention)
     depends on HOW we practise: rest (massed / distributed), whole or
     part, fixed or varied, guidance and feedback.
   • CLASSIFICATION of skills on continua (difficulty, environment, …).
   • SCHEMA: varied practice builds a rule we can use in new situations.
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
// ----- reaction time: Hick's law with a skewed spread (normal + exponential tail)
const HICK = { a: 0.221, b: 0.123 };
const meanRT = (N, o = {}) => (HICK.a + HICK.b * Math.log2(N)) * (o.slow || 1) + (o.age === "older" ? 0.04 : 0) + (o.tired ? 0.03 : 0);
function oneRT(N, r, o) { const m = meanRT(N, o), tau = 0.03 + 0.01 * Math.log2(N); return Math.max(0.1, m - tau + 0.025 * r.gauss() - tau * Math.log(1 - r() * 0.999)); }
// ----- the PRP: a dummy at time 0, the real move after a gap; the second response waits for the first decision to finish
const DECIDE1 = 0.22;
const prpRT = (gap, base = 0.34) => gap < 0.04 ? base + 0.02 : base + Math.max(0, DECIDE1 - gap);
// ----- practice: learners with their own ability practise a skill; success probability follows a learning curve
const SKILLS = {
  crawl: { name: "Front crawl", diff: 0.8, env: 0.2, pace: 0.2, musc: 0.9, cont: 1.0, org: 0.75, desc: "complex (breathing, arms, legs), closed in a pool, self-paced, gross, continuous, highly organised" },
  serve: { name: "Tennis serve", diff: 0.75, env: 0.15, pace: 0.1, musc: 0.85, cont: 0.1, org: 0.55, desc: "complex, closed, self-paced, gross, discrete, quite low organisation (toss, swing, follow-through can be practised apart)" },
  pass: { name: "Football pass in a game", diff: 0.6, env: 0.95, pace: 0.85, musc: 0.8, cont: 0.15, org: 0.6, desc: "fairly complex decisions, open, externally paced, gross, discrete" },
  dart: { name: "Throwing a dart", diff: 0.2, env: 0.05, pace: 0.05, musc: 0.1, cont: 0.05, org: 0.8, desc: "simple, closed, self-paced, fine, discrete" },
  layup: { name: "Basketball lay-up", diff: 0.6, env: 0.6, pace: 0.5, musc: 0.85, cont: 0.5, org: 0.35, desc: "serial: dribble, steps, jump and shot can be practised as parts (low organisation)" },
  cycling: { name: "Cycling", diff: 0.3, env: 0.4, pace: 0.2, musc: 0.9, cont: 1.0, org: 0.95, desc: "continuous and highly organised: hard to break into parts" },
  golf: { name: "Golf putt", diff: 0.3, env: 0.05, pace: 0.0, musc: 0.15, cont: 0.05, org: 0.9, desc: "simple, closed, self-paced, fine, discrete, highly organised" },
  gym: { name: "Gymnastics floor routine", diff: 0.9, env: 0.1, pace: 0.1, musc: 0.9, cont: 0.55, org: 0.2, desc: "complex, closed, serial, low organisation (separate elements)" },
  catch: { name: "Catching a cricket ball", diff: 0.45, env: 0.8, pace: 0.9, musc: 0.4, cont: 0.05, org: 0.85, desc: "open, externally paced, discrete" },
  dive: { name: "Springboard dive", diff: 0.85, env: 0.05, pace: 0.05, musc: 0.9, cont: 0.1, org: 0.95, desc: "complex, closed, discrete, highly organised and dangerous (mechanical guidance helps)" },
  tackle: { name: "Rugby tackle", diff: 0.55, env: 0.95, pace: 0.9, musc: 1.0, cont: 0.1, org: 0.85, desc: "open, externally paced, gross" },
  juggle: { name: "Juggling three balls", diff: 0.7, env: 0.05, pace: 0.3, musc: 0.3, cont: 0.9, org: 0.6, desc: "continuous, fairly fine, closed" }
};
const CONTINUA = [["diff", "simple", "complex", "difficulty"], ["env", "closed", "open", "environment"], ["pace", "self-paced", "externally paced", "pacing (A level)"], ["musc", "fine", "gross", "muscular involvement (A level)"], ["cont", "discrete", "continuous", "continuity (A level)"], ["org", "low", "high", "organisation (A level)"]];
// o = { skill, method: whole|part|prog, rest (s between attempts), varied, guidance: visual|verbal|manual|mechanical, fb: KR|KP, fbFreq (0–1), attempts }
// learning rate per attempt and the extra effects, worked out from the practice conditions (illustrative sizes)
function rates(o) {
  const s = SKILLS[o.skill], massed = o.rest < 10;
  let k = 0.045, perf = 1, ret = 0.86;
  if (massed) { perf -= 0.08; k *= 0.8; ret -= 0.06; } else if (o.rest >= 30) { ret += 0.05; }   // fatigue in massed practice; distributed practice is remembered better
  if (o.method === "part") { k *= 1 + 0.6 * s.diff * (1 - s.org); ret += 0.12 * (1 - s.org) - 0.15 * s.org; }        // parts are easier to learn, but highly organised skills lose the links between them
  if (o.method === "prog") { k *= 1 + 0.35 * s.diff * (1 - s.org); ret += 0.08 * (1 - s.org) - 0.06 * s.org; }
  if (o.varied) { perf -= 0.04; ret += 0.06 * s.env + 0.02; }                                   // varied practice: worse in practice, better retention and transfer (especially open skills)
  const g = { visual: 1.15, verbal: 1.0, manual: 0.95, mechanical: 0.9 }[o.guidance]; k *= g; if (o.guidance === "mechanical" && s.diff > 0.8) k *= 1.25;
  k *= 0.7 + 0.6 * o.fbFreq; if (o.fbFreq > 0.5) ret -= 0.25 * (o.fbFreq - 0.5);              // more feedback speeds practice, but too much creates dependence (guidance hypothesis)
  if (o.fb === "KP") k *= 1.08;
  return { k: k * (1.2 - 0.6 * s.diff), perf, ret: Math.min(0.98, ret) };
}
const P0 = 0.1, PMAX = 0.95;
const curve = (n, k) => PMAX - (PMAX - P0) * Math.exp(-k * n);
// one learner practising: success (1) or failure (0) for each attempt; then a retention test a week later
function practise(o, r, ability = 1) {
  const R = rates(o), out = []; let p = 0;
  for (let i = 1; i <= o.attempts; i++) { p = curve(i, R.k * ability) * R.perf; out.push(r() < p ? 1 : 0); }
  const retTrue = curve(o.attempts, R.k * ability) * R.ret; return { out, end: curve(o.attempts, R.k * ability) * R.perf, ret: retTrue, retMeas: K.mean(Array.from({ length: 20 }, () => r() < retTrue ? 1 : 0)) };
}
// ----- schema: throwing a beanbag; the learner works out a rule (effort for each distance) from practice throws
function schema(o, r) {
  const prior = 1 + 0.45 * r.gauss(), noise = 0.35;                                            // their first guess at the rule is out by about 45%
  const ds = []; for (let i = 0; i < 30; i++) ds.push(6 + (o.variety ? (2 * r() - 1) * o.variety : 0));
  // the learner fits landing distance = (rule slope) × distance with the error spread over the practised range (a simple schema)
  const dbar = K.mean(ds), sxx = ds.reduce((s, d) => s + (d - dbar) ** 2, 0), w0 = 1 / 0.45 ** 2, w = sxx / noise ** 2 / 36;
  const slopeErr = (prior - 1) * w0 / (w0 + w) + noise / 6 * r.gauss() / Math.sqrt(30);
  return Math.abs(slopeErr * (9 - 6) + noise * 0.5 * r.gauss());
}
const schemaTheory = v => { let s = 0; const r = K.rng(99); for (let i = 0; i < 4000; i++) s += schema({ variety: v }, r); return s / 4000; };
const schemaCache = {}; const schemaTh = v => schemaCache[v] != null ? schemaCache[v] : (schemaCache[v] = schemaTheory(v));
const BASE = () => ({ skill: "crawl", method: "whole", rest: 30, varied: false, guidance: "visual", fb: "KR", fbFreq: 0.5, attempts: 60 });

// ---------------- The page ----------------
const P = Object.assign(BASE(), { view: "react", N: 1, sit: "tennis", gap: 0.12, dummy: true, learners: 10, variety: 0, guess: false, age: "young", tired: false });
let rnd = K.rng(Date.now() % 9973 + 1), simRT = [], you = [], youT = null, light = -1, lightAt = 0, waitUntil = 0, simNext = 0, practiseRun = null, prT = 0, schemaRun = null, guesses = {}, reveal = false, procT = 0, testQueue = [];
const ui = K.app({
  title: "Skill Acquisition and Reaction Time", subject: "Physical education",
  blurb: "Reaction time and Hick's law, information processing, the learning curve and how practice, guidance and feedback change it",
  reset: () => set({}),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "OCR GCSE (9–1) Physical Education (J587) 2.2 sports psychology: classification of skills (difficulty and environment continua), types of guidance (visual, verbal, manual, mechanical), types of feedback (intrinsic, extrinsic, KP, KR, positive, negative), reaction time. Hick's law, the PRP and learning curves are enrichment (beyond the OCR specs).", adv: "OCR A level Physical Education (H555) 2.1 skill acquisition: classification (continuity, pacing, organisation, muscular involvement), types and methods of practice, stages of learning (Fitts and Posner), guidance and feedback, information processing, memory models, schema theory and transfer." } },
  missions: [
    { title: "Simple reaction time", q: "Press ▶ Take the test yourself with 1 choice (Space bar when the light comes on). How does your reaction time compare with the simulated performer's?", hint: "Simple reaction times are usually about 0.2 s. They vary from try to try and the spread is skewed (a few slow ones), so take the average of several.", setup() { set({ view: "react", N: 1 }); } },
    { title: "Hick's law", q: "Run the full Hick's law test (1, 2, 4 and 8 choices). How does reaction time change as the number of choices doubles?", hint: "Each doubling adds about the same time (about 0.12 s): RT = a + b log₂N. This is why good players disguise their shots: more options for the opponent means slower reactions. (Hick's law is beyond the OCR specs.)", setup() { set({ view: "react", N: 4 }); } },
    { title: "Response time", q: "A sprinter reacts in 0.15 s and takes 0.25 s to move off the blocks. What is the response time? What could they train to improve it?", hint: "Response time = reaction time + movement time = 0.40 s. Reaction time improves with practice, anticipation and concentrating on the right cue; movement time with power training.", setup() { set({ view: "react", N: 1 }); } },
    { title: "The dummy", q: "In the processing view, watch the returner face a dummy then the real move. Why is the response delayed?", hint: "Single-channel hypothesis: the brain processes one stimulus at a time, so the real move waits until the dummy has been dealt with: the psychological refractory period. A well-timed dummy (about 0.1 s before the real move) gives the biggest delay.", setup() { set({ view: "proc", dummy: true, gap: 0.1 }); } },
    { title: "Guidance", q: "Teach beginners the front crawl with visual, then verbal, then manual guidance. Which works best for beginners, and why?", hint: "Beginners (cognitive stage) need a clear picture of the skill, so visual guidance (a demonstration) works best; too much verbal information overloads them. Manual and mechanical guidance help with safety and the feel of a movement.", setup() { set({ view: "practice", guidance: "visual" }); } },
    { title: "Feedback", q: "Give feedback after every attempt (100%), then after half of them. Which group practises better? Which remembers more a week later?", hint: "100% feedback gives the best practice performance but learners come to depend on it, so they remember less without it (the guidance hypothesis). Fading the feedback helps retention.", setup() { set({ view: "practice", fbFreq: 1 }); } },
    { title: "Classify the skills", q: "Place each skill on the difficulty and environment continua, then reveal the answers.", hint: "Difficulty: simple (few decisions, e.g. a dart) to complex (many decisions and parts, e.g. a gymnastics routine). Environment: closed (stable, predictable, e.g. a golf putt) to open (changing, e.g. a pass in a game).", setup() { set({ view: "classify", guess: true }); } },
    { lvl: "adv", title: "Massed or distributed?", q: "Compare massed practice (no rest) and distributed practice (60 s rests) for the front crawl. Which is better a week later?", hint: "Distributed practice: less fatigue and time to think, so better learning and retention, especially for complex, demanding skills and beginners. Massed practice suits simple, discrete skills and experienced performers.", setup() { set({ view: "practice", rest: 0 }); } },
    { lvl: "adv", title: "Whole or part?", q: "Teach a gymnastics routine (low organisation) by parts, then cycling (high organisation). When does part practice work?", hint: "Low-organisation skills (separate parts) can be taught in parts; highly organised skills (cycling, a dive) lose their timing when split, so whole (or progressive part) practice is better.", setup() { set({ view: "practice", skill: "gym", method: "part" }); } },
    { lvl: "adv", title: "Schema and variable practice", q: "Practise beanbag throws at 6 m only, then with ±3 m of variety. Which group is more accurate at a new 9 m target?", hint: "Variable practice builds a stronger schema (the rule linking effort and distance), so performers adapt better to new situations: recall and recognition schema (Schmidt). Fixed practice suits closed skills.", setup() { set({ view: "schema", variety: 0 }); } }
  ],
  batch: [
    { title: "Does Hick's law hold?", question: "How does the mean reaction time change with the number of choices?", how: "Simulated performer, 20 reactions at each number of choices, 40 runs each; plotted against log₂N.", xLabel: "number of choices N", yLabel: "mean reaction time (s)", xs: [1, 2, 3, 4, 5, 6, 7, 8], reps: 40, theory: N => meanRT(N), theoryLabel: "0.221 + 0.123 log₂N", run: (N, r) => K.mean(Array.from({ length: 20 }, () => oneRT(N, r, {}))), note: "Each doubling of choices adds the same time: equal steps at 1, 2, 4 and 8. (Hick's law is beyond the OCR specs.)" },
    { title: "How much does a single reaction vary?", question: "What is the spread of 1000 simple reactions?", how: "One choice, simulated performer.", yLabel: "reaction time (s)", reps: 1000, bins: 30, theory: meanRT(1), theoryLabel: "mean", run: (x, r) => oneRT(1, r, {}), note: "Skewed: most reactions near 0.2 s, a tail of slow ones and none much below 0.1 s (faster counts as a false start). One reaction is a poor measure: average several." },
    { title: "The psychological refractory period", question: "How long is the reaction to the real move after a dummy, for different gaps?", how: "Dummy at time 0, real move after the gap; choice reaction time 0.34 s without a dummy; 20 runs each with stage-time variation.", xLabel: "gap between the dummy and the real move (s)", yLabel: "reaction to the real move (s)", xs: [0.02, 0.06, 0.1, 0.15, 0.2, 0.25, 0.35, 0.5], reps: 20, yMin: 0, theory: g => prpRT(g), theoryLabel: "single-channel model", run: (g, r) => prpRT(g) + 0.02 * r.gauss(), note: "Very short gaps are grouped and treated as one; from about 0.05 s the response waits for the dummy's decision, falling 1 ms for every 1 ms of gap until the dummy has been processed." },
    { title: "Massed or distributed practice?", question: "How does the rest between attempts affect retention a week later?", how: "Front crawl, 10 learners, 60 attempts, whole practice, visual guidance, feedback half the time; retention test (20 attempts) a week later.", xLabel: "rest between attempts (s)", yLabel: "retention (% success)", xs: [0, 5, 15, 30, 60], reps: 20, yMin: 0, yMax: 100, theory: s => 100 * curve(60, rates(Object.assign(BASE(), { rest: s })).k) * rates(Object.assign(BASE(), { rest: s })).ret, theoryLabel: "model expectation", run: (s, r) => 100 * practise(Object.assign(BASE(), { rest: s }), r, 1 + 0.2 * r.gauss()).retMeas, note: "Distributed practice wins for a demanding, continuous skill: less fatigue and better retention." },
    { title: "Part or whole practice?", question: "When is part practice better than whole practice?", how: "A complex skill with organisation from 0 (separate parts) to 1 (highly organised); retention with part practice minus whole practice; 10 learners each.", xLabel: "organisation of the skill", yLabel: "part − whole (retention, % points)", xs: [0, 0.25, 0.5, 0.75, 1], reps: 20, theory: org => { SKILLS._t = Object.assign({}, SKILLS.gym, { org }); const a = rates(Object.assign(BASE(), { skill: "_t", method: "part" })), b = rates(Object.assign(BASE(), { skill: "_t" })); return 100 * (curve(60, a.k) * a.ret - curve(60, b.k) * b.ret); }, theoryLabel: "model expectation", run: (org, r) => { SKILLS._t = Object.assign({}, SKILLS.gym, { org }); const ab = 1 + 0.2 * r.gauss(); return 100 * (practise(Object.assign(BASE(), { skill: "_t", method: "part" }), r, ab).retMeas - practise(Object.assign(BASE(), { skill: "_t" }), r, ab).retMeas); }, note: "Part practice helps low-organisation skills and harms highly organised ones, where the parts must flow together." },
    { title: "Variable practice and schema", question: "How accurate is a throw at a new 9 m target after practice with different amounts of variety?", how: "30 practice throws around 6 m (± the variety); error at the new target.", xLabel: "variety in practice (± m)", yLabel: "error at the new 9 m target (m)", xs: [0, 0.5, 1, 2, 3], reps: 60, yMin: 0, theory: v => schemaTh(v), theoryLabel: "model expectation", run: (v, r) => schema({ variety: v }, r), note: "Variety lets the learner work out the rule linking effort and distance (a schema), so they cope with a distance they have never practised." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "J587 2.2", text: "Skills are classified on continua: difficulty (simple–complex) and environment (closed–open). Most skills sit between the ends." },
      { lvl: "std", tag: "J587 2.2", text: "Guidance: visual (demonstrations; best for beginners), verbal (instructions; best for experienced performers), manual (physically moving the performer), mechanical (equipment such as floats or harnesses; safety)." },
      { lvl: "std", tag: "J587 2.2", text: "Feedback: intrinsic (from your own senses) or extrinsic (from others); knowledge of performance (technique) or results (outcome); positive or negative." },
      { lvl: "std", tag: "J587 2.2", text: "Reaction time: from the stimulus to the start of the response. Response time = reaction time + movement time." },
      { lvl: "beyond", tag: "Beyond the spec", text: "Hick's law: choice reaction time rises with log₂ of the number of choices. Single-channel hypothesis and the PRP: a dummy delays the response to the real move." },
      { lvl: "adv", tag: "H555 2.1", text: "Stages of learning (Fitts and Posner): cognitive (many errors, needs visual guidance), associative (fewer errors, practice), autonomous (automatic, verbal feedback, fine-tuning)." },
      { lvl: "adv", tag: "H555 2.1", text: "Practice: massed (no rest; simple, discrete skills, fit and experienced performers) vs distributed (rests; complex, demanding skills, beginners); whole, part, progressive part (by organisation and complexity); fixed (closed skills) vs variable (open skills, builds schema)." },
      { lvl: "adv", tag: "H555 2.1", text: "Schema theory (Schmidt): recall schema (initial conditions, response specifications) and recognition schema (sensory consequences, response outcome); variable practice builds them; transfer can be positive, negative, zero or bilateral." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: "A sprinter reacts in 0.18 s and takes 0.32 s to leave the blocks. Calculate their response time.", ans: "<ul><li>response time = reaction time + movement time</li><li>= 0.18 + 0.32 = 0.50 s</li></ul>" },
      { lvl: "std", marks: 3, q: "Classify a tennis serve on the difficulty and environment continua, and justify your answer.", ans: "<ul><li>complex: several parts and decisions (toss, swing, placement)</li><li>closed: the server controls it; the environment is stable</li><li>a justification for each</li></ul>" },
      { lvl: "std", marks: 3, q: "Explain which type of guidance is most suitable for a beginner learning to swim.", ans: "<ul><li>visual: a demonstration gives a clear mental picture</li><li>mechanical (floats) for safety and confidence</li><li>beginners are in the cognitive stage and can be overloaded by verbal detail</li></ul>" },
      { lvl: "adv", marks: 4, q: "Evaluate the use of massed practice for a novice learning the front crawl.", ans: "<ul><li>massed: continuous practice with no rest</li><li>front crawl is complex, continuous and demanding: fatigue reduces quality and learning</li><li>novices need time to process feedback: distributed practice better</li><li>massed could suit short, simple drills or fit, experienced swimmers</li></ul>" },
      { lvl: "adv", marks: 3, q: "Explain how variable practice helps a footballer pass accurately in a match.", ans: "<ul><li>practising passes over different distances, angles and pressure</li><li>builds a schema (recall and recognition) linking the situation to the movement</li><li>so the player can adapt to new situations in an open game</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li><b>Reaction time:</b> mean RT = 0.221 + 0.123 log₂N s (Hick's law), plus a skewed spread (normal with SD 0.025 s and an exponential tail of about 0.03 s); never below 0.1 s. Older or tired performers are slower.</li>
<li><b>PRP:</b> a choice RT of 0.34 s with no dummy; with a dummy, the real move waits for the dummy's decision (0.22 s): RT₂ = 0.34 + max(0, 0.22 − gap). Gaps under 0.04 s are grouped (treated as one, +0.02 s).</li>
<li><b>Practice:</b> success probability p = 0.95 − 0.85 e^(−kn) after n attempts, with k depending on the skill's difficulty and on the practice conditions; each attempt succeeds with probability p. Retention a week later = end level × a retention factor. The sizes of the effects (rest, part or whole by organisation, variety, guidance, feedback frequency) are illustrative, chosen to follow the textbook findings.</li>
<li><b>Schema:</b> the learner starts with a rule for effort against distance that is wrong by about 45%; throws at different distances let them correct it (a weighted average of their first guess and the evidence from the spread of distances).</li></ul>
<h3>Left out</h3>
<ul><li>Motivation, anxiety and arousal, individual learning styles, the real shapes of learning curves for each skill, memory models in detail, and anticipation.</li></ul>
<p>The earlier version of this simulation (with memory models, more practice options and a classification test), with its worksheets, is kept in <a href="original/skill-acquisition.html">original/skill-acquisition.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("View");
ctl.view = K.seg(g, { value: "react", options: [["react", "⚡ Reaction time"], ["proc", "🧠 Processing"], ["practice", "📈 Practice"], ["classify", "🧩 Classifying"], ["schema", "🎯 Schema (A level)"]], on: v => { P.view = v; } });
g = ui.group("Reaction time");
ctl.N = K.slider(g, { label: "Number of choices", min: 1, max: 8, step: 1, value: 1, on: v => { P.N = v; simRT = []; } });
ctl.age = K.seg(g, { label: "Simulated performer", value: "young", options: [["young", "16-year-old"], ["older", "60-year-old"]], on: v => { P.age = v; simRT = []; } });
ctl.tired = K.toggle(g, { label: "Tired", value: false, on: v => { P.tired = v; simRT = []; } });
let rr = K.row(g); K.btn(rr, "▶ Take the test yourself (10)", () => startTest([P.N]), "primary"); K.btn(rr, "Hick's law test", () => startTest([1, 2, 4, 8]));
K.note(g, "Keys 1–8 for the lights (Space for one choice), or click a light. Pressing too early is a false start.");
g = ui.group("Processing");
ctl.sit = K.seg(g, { value: "tennis", options: [["tennis", "tennis return"], ["goal", "penalty save"], ["bat", "cricket batter"], ["tackle", "rugby tackle"]], on: v => P.sit = v });
ctl.dummy = K.toggle(g, { label: "Dummy (feint) first", value: true, on: v => P.dummy = v });
ctl.gap = K.slider(g, { label: "Gap before the real move", min: 0.02, max: 0.5, step: 0.01, value: 0.12, unit: "s", on: v => P.gap = v });
g = ui.group("Practice");
ctl.skill = K.seg(g, { value: "crawl", options: Object.entries(SKILLS).map(([k, v]) => [k, v.name]), on: v => { P.skill = v; newPractice(); } });
ctl.method = K.seg(g, { label: "Method", value: "whole", options: [["whole", "whole"], ["part", "part"], ["prog", "progressive part"]], on: v => { P.method = v; newPractice(); } });
ctl.rest = K.slider(g, { label: "Rest between attempts", min: 0, max: 60, step: 5, value: 30, fmt: v => v + " s" + (v < 10 ? " (massed)" : " (distributed)"), on: v => { P.rest = v; newPractice(); } });
ctl.varied = K.toggle(g, { label: "Variable practice (not fixed)", value: false, on: v => { P.varied = v; newPractice(); } });
ctl.guidance = K.seg(g, { label: "Guidance", value: "visual", options: [["visual", "visual"], ["verbal", "verbal"], ["manual", "manual"], ["mechanical", "mechanical"]], on: v => { P.guidance = v; newPractice(); } });
ctl.fb = K.seg(g, { label: "Feedback", value: "KR", options: [["KR", "knowledge of results"], ["KP", "knowledge of performance"]], on: v => { P.fb = v; newPractice(); } });
ctl.fbFreq = K.slider(g, { label: "Feedback after", min: 0, max: 1, step: 0.05, value: 0.5, fmt: v => (v * 100).toFixed(0) + "% of attempts", on: v => { P.fbFreq = v; newPractice(); } });
ctl.learners = K.slider(g, { label: "Learners", min: 4, max: 20, step: 1, value: 10, on: v => { P.learners = v; newPractice(); } });
g = ui.group("Classifying and schema");
ctl.guess = K.toggle(g, { label: "Test yourself (click the continua to place the skill)", value: false, on: v => { P.guess = v; reveal = false; } });
K.btn(K.row(g), "Reveal the answers", () => reveal = true);
ctl.variety = K.slider(g, { label: "Schema: variety in practice", min: 0, max: 3, step: 0.25, value: 0, fmt: v => v ? "± " + v + " m" : "fixed at 6 m", on: v => { P.variety = v; newSchema(); } });
const read = K.readout(ui.group("Readings"), [["a", "–"], ["b", "–"], ["c", "–"], ["d", "–"]]);
const label = (i, s) => { read.el.children[i].firstElementChild.textContent = s; };
function set(o) {
  Object.assign(P, BASE(), { view: "react", N: 1, sit: "tennis", gap: 0.12, dummy: true, learners: 10, variety: 0, guess: false, age: "young", tired: false }, o);
  for (const k of ["N", "gap", "rest", "fbFreq", "learners", "variety"]) ctl[k].set(P[k]); for (const k of ["view", "sit", "skill", "method", "guidance", "fb", "age"]) ctl[k].set(P[k]); ctl.dummy.set(P.dummy); ctl.varied.set(P.varied); ctl.guess.set(P.guess); ctl.tired.set(P.tired);
  simRT = []; reveal = false; guesses = {}; newPractice(); newSchema();
}
function newPractice() { const r = K.rng(Date.now() % 9973), runs = []; for (let i = 0; i < P.learners; i++) runs.push(practise(P, r, 1 + 0.2 * r.gauss())); practiseRun = runs; prT = 0; }
function newSchema() { const r = K.rng(77), throws = [], prior = 1 + 0.45 * r.gauss(); for (let i = 0; i < 30; i++) { const d = 6 + (P.variety ? (2 * r() - 1) * P.variety : 0); throws.push([d, d * (1 + (prior - 1) * Math.exp(-i * (P.variety ? 0.15 : 0.02))) + 0.35 * r.gauss()]); } schemaRun = { throws, err: K.mean(Array.from({ length: 400 }, () => schema(P, r))) }; }
// ----- your own reaction test
function startTest(list) { testQueue = []; for (const N of list) for (let i = 0; i < (list.length > 1 ? 8 : 10); i++) testQueue.push(N); P.view = "react"; ctl.view.set("react"); nextLight(); ui.tip("Get ready… press the key for the light that comes on", 2500); }
function nextLight() { light = -1; youT = testQueue.length ? testQueue[0] : null; waitUntil = performance.now() + 1000 + Math.random() * 2000; }
function respond(k) {
  if (youT == null) return; const now = performance.now();
  if (light < 0) { you.push({ N: youT, rt: null, false: true }); ui.tip("False start! Wait for the light.", 1500); nextLight(); return; }
  if (k !== light && youT > 1) { ui.tip("Wrong light", 1000); return; }
  you.push({ N: youT, rt: (now - lightAt) / 1000 }); testQueue.shift(); if (testQueue.length) nextLight(); else { youT = null; light = -1; ui.tip("Test finished: see your results on the graph", 3000); }
}
addEventListener("keydown", e => { if (youT == null) return; if (e.code === "Space" && youT === 1) { e.preventDefault(); e.stopPropagation(); respond(0); } else if (/^[1-8]$/.test(e.key)) respond(+e.key - 1); }, true);

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
let lightRects = [], contRects = [];
K.pointer(cv.el, { down: (x, y) => {
  if (P.view === "react") { const i = lightRects.findIndex(q => Math.hypot(x - q[0], y - q[1]) < 30); if (i >= 0) respond(i); }
  if (P.view === "classify" && P.guess) { const q = contRects.find(q => y > q.y - 14 && y < q.y + 14 && x > q.x0 - 10 && x < q.x1 + 10); if (q) guesses[P.skill + q.key] = K.clamp((x - q.x0) / (q.x1 - q.x0), 0, 1); }
} });
function draw(t) {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0a1020"; c.fillRect(0, 0, w, h); const adv = ui.level === "adv";
  if (P.view === "react") {
    const N = youT || P.N, n = Math.max(N, 1); lightRects = [];
    if (youT != null && light < 0 && performance.now() > waitUntil) { light = Math.floor(Math.random() * youT); lightAt = performance.now(); }
    for (let i = 0; i < n; i++) { const x = w / 2 + (i - (n - 1) / 2) * Math.min(90, (w - 100) / n), y = h * 0.38, on = youT != null ? light === i : (t % 2.5 > 1.5 && Math.floor(t / 2.5) % n === i); lightRects.push([x, y]); c.fillStyle = on ? "#ffd166" : "#24324f"; c.beginPath(); c.arc(x, y, 26, 0, 6.3); c.fill(); if (on) { c.fillStyle = "rgba(255,209,102,.25)"; c.beginPath(); c.arc(x, y, 40, 0, 6.3); c.fill(); } TX(c, String(i + 1), x, y + 50, "#8fa0bf", "center", "12px"); }
    TX(c, youT != null ? `Your test: ${N} choice${N > 1 ? "s" : ""} · ${testQueue.length} left` : `Simulated performer: ${P.N} choice${P.N > 1 ? "s" : ""}`, w / 2, 40, "#eef2f8", "center", "600 15px");
    const last = simRT[simRT.length - 1], ly = you.filter(q => q.rt)[you.filter(q => q.rt).length - 1];
    TX(c, last ? `performer's last reaction: ${last.toFixed(3)} s · response time with a 0.15 s movement: ${(last + 0.15).toFixed(3)} s` : "", w / 2, h * 0.62, "#aab6cc", "center", "13px");
    if (ly) TX(c, `your last reaction: ${ly.rt.toFixed(3)} s`, w / 2, h * 0.62 + 24, "#7ee787", "center", "600 13px");
    TX(c, "Hick's law: RT = a + b log₂N (beyond the OCR specs)", w / 2, h - 16, "#7d8aa5", "center", "11px");
  } else if (P.view === "proc") {
    const stages = [["INPUT", "senses: see the ball, the opponent", "#5ad1ff"], ["DECISION", "perception, memory, choose a response", "#ffd166"], ["OUTPUT", "nerves to muscles: the movement", "#7ee787"], ["FEEDBACK", "intrinsic and extrinsic: how did it go?", "#c9a0ff"]];
    const T = 1.6, tt = (procT % T), rt2 = P.dummy ? prpRT(P.gap) : 0.34, t2 = P.dummy ? P.gap : 0;
    stages.forEach(([nm, d, col], i) => { const x = 30 + i * (w - 60) / 4, active = (i === 0 && tt < 0.1) || (i === 1 && tt > 0.05 && tt < t2 + rt2 - 0.1) || (i === 2 && tt > t2 + rt2 && tt < t2 + rt2 + 0.3) || (i === 3 && tt > t2 + rt2 + 0.3); c.fillStyle = active ? col + "55" : "#16203a"; c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.roundRect(x + 6, 60, (w - 60) / 4 - 12, 80, 12); c.fill(); c.stroke(); c.lineWidth = 1; TX(c, nm, x + (w - 60) / 8, 92, col, "center", "600 15px"); TX(c, d, x + (w - 60) / 8, 116, "#aab6cc", "center", "11px"); });
    // timeline
    const X = s => 60 + s * (w - 120) / 1.0, y0 = h * 0.55;
    c.strokeStyle = "#8fa0bf"; c.beginPath(); c.moveTo(X(0), y0); c.lineTo(X(1), y0); c.stroke(); for (let s = 0; s <= 1; s += 0.1) TX(c, s.toFixed(1) + " s", X(s), y0 + 18, "#8fa0bf", "center", "10.5px");
    const bar = (a, b, y, col, txt) => { c.fillStyle = col; c.fillRect(X(a), y, X(b) - X(a), 16); TX(c, txt, X(a) + 4, y - 4, col, "left", "11.5px"); };
    if (P.dummy) { bar(0, DECIDE1, y0 - 70, "#ff8a70", "dummy: processed (0.22 s)"); bar(P.gap, P.gap + 0.04, y0 - 40, "#ffd166", "real move appears"); bar(Math.max(DECIDE1, P.gap), t2 + rt2, y0 - 20, "#7ee787", "real move processed → response"); if (P.gap > 0.04 && P.gap < DECIDE1) { c.fillStyle = "rgba(255,107,129,.3)"; c.fillRect(X(P.gap), y0 - 24, X(DECIDE1) - X(P.gap), 30); TX(c, "PRP: waiting", X((P.gap + DECIDE1) / 2), y0 + 34, "#ff6b81", "center", "600 12px"); } }
    else bar(0, 0.34, y0 - 20, "#7ee787", "real move processed → response (0.34 s)");
    c.strokeStyle = "#fff"; c.beginPath(); c.moveTo(X(Math.min(1, tt)), y0 - 80); c.lineTo(X(Math.min(1, tt)), y0 + 4); c.stroke();
    TX(c, `${{ tennis: "Tennis returner", goal: "Goalkeeper facing a penalty", bat: "Cricket batter", tackle: "Rugby tackler" }[P.sit]}: response to the real move ${(t2 + rt2).toFixed(2)} s after the ${P.dummy ? "dummy" : "move"} (${rt2.toFixed(2)} s after the real move)`, 20, h - 50, "#eef2f8", "left", "600 13px");
    TX(c, "Single-channel hypothesis: one stimulus at a time (beyond the OCR specs; information processing is A level)", 20, h - 26, "#7d8aa5", "left", "11.5px");
  } else if (P.view === "practice") {
    const n = Math.min(P.attempts, Math.floor(prT)), runs = practiseRun, cols = 10, cw = (w - 40) / Math.max(1, runs.length);
    TX(c, `${SKILLS[P.skill].name}: ${runs.length} learners, attempt ${n} of ${P.attempts}`, 20, 26, "#eef2f8", "left", "600 15px"); TX(c, `${P.method} practice · ${P.rest < 10 ? "massed" : "distributed"} (${P.rest} s rests) · ${P.varied ? "variable" : "fixed"} · ${P.guidance} guidance · ${P.fb} after ${(P.fbFreq * 100).toFixed(0)}%`, 20, 46, "#8fa0bf", "left", "12px");
    runs.forEach((ru, i) => { const x = 20 + cw * (i + 0.5), succ = ru.out.slice(0, n), rate = succ.length ? K.mean(succ.slice(-10)) : 0, stage = rate < 0.4 ? "cognitive" : rate < 0.8 ? "associative" : "autonomous";
      c.fillStyle = "#16203a"; c.fillRect(x - cw * 0.4, 70, cw * 0.8, h - 140); c.fillStyle = rate < 0.4 ? "#ff8a70" : rate < 0.8 ? "#ffd166" : "#7ee787"; c.fillRect(x - cw * 0.4, 70 + (h - 140) * (1 - rate), cw * 0.8, (h - 140) * rate);
      const last = succ[succ.length - 1]; TX(c, last == null ? "" : last ? "✓" : "✗", x, 64, last ? "#7ee787" : "#ff6b81", "center", "600 13px"); if (adv) TX(c, stage, x, h - 54, "#8fa0bf", "center", "10px"); TX(c, `L${i + 1}`, x, h - 40, "#aab6cc", "center", "11px"); });
    TX(c, "bar height: success rate in the last 10 attempts" + (adv ? " · stage of learning (Fitts and Posner) underneath" : ""), 20, h - 14, "#7d8aa5", "left", "11px");
  } else if (P.view === "classify") {
    const s = SKILLS[P.skill], x0 = 230, x1 = w - 60; contRects = [];
    TX(c, s.name, 20, 30, "#eef2f8", "left", "600 16px"); TX(c, P.guess && !reveal ? "Click each line to place the skill, then press Reveal" : s.desc, 20, 52, "#aab6cc", "left", "12.5px");
    CONTINUA.forEach(([key, a, b, nm], i) => { const isAdv = i >= 2; if (isAdv && !adv) return; const y = 100 + i * ((h - 140) / 6);
      TX(c, nm, 20, y + 4, isAdv ? "#c9a0ff" : "#eef2f8", "left", "600 12.5px"); c.strokeStyle = "#56607a"; c.lineWidth = 3; c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); c.lineWidth = 1; TX(c, a, x0, y + 22, "#8fa0bf", "center", "11px"); TX(c, b, x1, y + 22, "#8fa0bf", "center", "11px");
      contRects.push({ key, y, x0, x1 }); const gv = guesses[P.skill + key];
      if (gv != null) { c.fillStyle = "#5ad1ff"; c.beginPath(); c.arc(x0 + gv * (x1 - x0), y, 9, 0, 6.3); c.fill(); }
      if (!P.guess || reveal) { c.fillStyle = "#ffd166"; c.beginPath(); c.moveTo(x0 + s[key] * (x1 - x0), y - 12); c.lineTo(x0 + s[key] * (x1 - x0) - 8, y - 24); c.lineTo(x0 + s[key] * (x1 - x0) + 8, y - 24); c.fill(); } });
    TX(c, "Yellow: the answer · blue: your guess", 20, h - 14, "#7d8aa5", "left", "11px");
  } else {
    const S = (w - 120) / 12, gy = h * 0.7, X = d => 60 + d * S;
    c.fillStyle = "#1a3a24"; c.fillRect(0, gy, w, h - gy); for (let d = 0; d <= 12; d++) TX(c, d + " m", X(d), gy + 18, "#8fa0bf", "center", "10.5px");
    for (const [tg, col] of [[6, "#ffd166"], [9, "#ff8a70"]]) { c.strokeStyle = col; c.lineWidth = 3; c.beginPath(); c.ellipse(X(tg), gy, 22, 7, 0, 0, 6.3); c.stroke(); c.lineWidth = 1; TX(c, tg === 9 ? "new target" : "practice", X(tg), gy - 14, col, "center", "11.5px"); }
    if (P.variety) { c.fillStyle = "rgba(255,209,102,.15)"; c.fillRect(X(6 - P.variety), gy - 4, 2 * P.variety * S, 8); }
    const k = Math.min(schemaRun.throws.length, Math.floor(prT / 2)); schemaRun.throws.slice(0, k).forEach(([d, land]) => { c.fillStyle = "#5ad1ff"; c.beginPath(); c.arc(X(land), gy + 4, 4, 0, 6.3); c.fill(); });
    TX(c, `Schema: practise ${P.variety ? `between ${6 - P.variety} and ${6 + P.variety} m` : "at 6 m only"}, then throw at a new 9 m target · average error at 9 m ≈ ${schemaRun.err.toFixed(2)} m`, 20, gy + 48, "#eef2f8", "left", "600 13.5px");
    if (!adv) TX(c, "Schema theory is A level (H555): switch to Advanced for the full story", 20, 52, "#8fa0bf", "left", "11.5px");
  }
}

// ---------------- Charts and readings ----------------
function charts() {
  const adv = ui.level === "adv"; chA.opts.xFmt = null; chB.opts.xFmt = null;
  if (P.view === "react") {
    const xs = [1, 2, 3, 4, 5, 6, 7, 8], yourN = [...new Set(you.filter(q => q.rt).map(q => q.N))].sort((a, b) => a - b), ym = yourN.map(N => [Math.log2(N), K.mean(you.filter(q => q.N === N && q.rt).map(q => q.rt))]);
    chA.opts.title = "Reaction time against choices (Hick's law)"; chA.opts.xLabel = "number of choices (log scale)"; chA.opts.yLabel = "reaction time (s)"; chA.opts.xFmt = v => { const N = 2 ** v; return Math.abs(N - Math.round(N)) < 0.02 ? String(Math.round(N)) : ""; };
    const ser = [{ pts: xs.map(N => [Math.log2(N), meanRT(N, P)]), color: "#ffd166", label: "simulated performer" }]; if (ym.length) ser.push({ pts: ym, type: "dots", r: 6, color: "#7ee787", label: "you (mean)" }); if (ym.length > 1) { const f = K.linfit(ym); ser.push({ pts: [[0, f.c], [3, f.c + 3 * f.m]], color: "#7ee787", dash: [5, 4], label: `your line: ${f.c.toFixed(3)} + ${f.m.toFixed(3)} log₂N` }); }
    chA.draw(ser, { xMin: -0.1, xMax: 3.1, yMin: 0 });
    const v = simRT.concat(you.filter(q => q.rt).map(q => q.rt)); chB.opts.title = "Spread of reaction times"; chB.opts.xLabel = "reaction time (s)"; chB.opts.yLabel = "number"; if (v.length > 3) { const hst = K.histogram(v, 16); chB.draw([{ pts: hst.pts, w: hst.w, type: "bars", color: "#5ad1ff", label: "reactions" }], { vlines: [{ x: 0.1, label: "false start limit", color: "#ff6b81" }] }); } else chB.draw([], {});
    label(0, "performer's mean (theory)"); label(1, "performer: last 10"); label(2, "your mean"); label(3, "false starts"); read.set("a", meanRT(P.N, P).toFixed(3) + " s"); read.set("b", simRT.length ? K.mean(simRT.slice(-10)).toFixed(3) + " s" : "–"); const yr = you.filter(q => q.rt); read.set("c", yr.length ? `${K.mean(yr.map(q => q.rt)).toFixed(3)} s (${yr.length} reactions)` : "take the test"); read.set("d", String(you.filter(q => q.false).length));
  } else if (P.view === "proc") {
    const pts = []; for (let gp = 0.02; gp <= 0.5; gp += 0.01) pts.push([gp, prpRT(gp)]);
    chA.opts.title = "The PRP: response to the real move"; chA.opts.xLabel = "gap after the dummy (s)"; chA.opts.yLabel = "reaction time (s)"; chA.draw([{ pts, color: "#ff8a70", label: "with a dummy" }, { pts: [[P.gap, prpRT(P.gap)]], type: "dots", r: 6, color: "#fff", label: "now" }], { yMin: 0, hlines: [{ y: 0.34, label: "no dummy", color: "#7ee787" }] });
    chB.opts.title = "Stage times"; chB.opts.xLabel = ""; chB.opts.yLabel = "s"; chB.opts.xFmt = whole(i => ["", "input", "decision", "output"][i] || ""); chB.draw([{ pts: [[1, 0.05], [2, P.dummy ? prpRT(P.gap) - 0.05 : 0.29], [3, 0.3]], type: "bars", w: 0.6, color: "#5ad1ff", label: "time" }], { yMin: 0, xMin: 0.4, xMax: 3.6 });
    label(0, "reaction to the real move"); label(1, "delay caused by the dummy"); label(2, "gap"); label(3, "–"); read.set("a", (P.dummy ? prpRT(P.gap) : 0.34).toFixed(3) + " s"); read.set("b", P.dummy ? (prpRT(P.gap) - 0.34).toFixed(3) + " s" : "none"); read.set("c", P.gap + " s"); read.set("d", "–");
  } else if (P.view === "practice") {
    const n = Math.min(P.attempts, Math.floor(prT)), runs = practiseRun, R = rates(P), mean = []; for (let i = 1; i <= n; i++) mean.push([i, 100 * K.mean(runs.map(ru => K.mean(ru.out.slice(Math.max(0, i - 10), i))))]);
    chA.opts.title = "Learning curve"; chA.opts.xLabel = "attempt"; chA.opts.yLabel = "success (%)";
    const th = []; for (let i = 1; i <= P.attempts; i++) th.push([i, 100 * curve(i, R.k) * R.perf]);
    chA.draw([{ pts: th, color: "#56607a", dash: [5, 4], label: "model" }, { pts: mean, color: "#ffd166", label: "squad (last 10 attempts)" }, ...(n >= P.attempts ? [{ pts: [[P.attempts + 5, 100 * K.mean(runs.map(ru => ru.retMeas))]], type: "dots", r: 6, color: "#c9a0ff", label: "a week later" }] : [])], { yMin: 0, yMax: 100, xMin: 0, xMax: P.attempts + 8, ...(adv ? { hlines: [{ y: 40, label: "cognitive → associative", color: "#3a4a6b" }, { y: 80, label: "→ autonomous", color: "#3a4a6b" }] } : {}) });
    const comp = [["whole", { method: "whole" }], ["part", { method: "part" }], ["massed", { rest: 0 }], ["varied", { varied: true }], ["100% fb", { fbFreq: 1 }], ["25% fb", { fbFreq: 0.25 }]];
    chB.opts.title = "Retention a week later (model): other methods"; chB.opts.xLabel = ""; chB.opts.yLabel = "%"; chB.opts.xFmt = whole(i => (comp[i - 1] || [""])[0]);
    chB.draw([{ pts: comp.map(([, o], i) => { const q = Object.assign({}, P, o), rr2 = rates(q); return [i + 1, 100 * curve(q.attempts, rr2.k) * rr2.ret]; }), type: "bars", w: 0.6, color: "#c9a0ff", label: "retention" }], { yMin: 0, yMax: 100, xMin: 0.4, xMax: comp.length + 0.6 });
    label(0, "success now (last 10)"); label(1, "end of practice (model)"); label(2, "retention a week later"); label(3, "stage of learning"); const now = mean.length ? mean[mean.length - 1][1] : 0; read.set("a", now.toFixed(0) + "%"); read.set("b", (100 * curve(P.attempts, R.k) * R.perf).toFixed(0) + "%"); read.set("c", n >= P.attempts ? (100 * K.mean(runs.map(ru => ru.retMeas))).toFixed(0) + "% (model " + (100 * curve(P.attempts, R.k) * R.ret).toFixed(0) + "%)" : "after practice"); read.set("d", adv ? (now < 40 ? "cognitive" : now < 80 ? "associative" : "autonomous") : "(A level)");
  } else if (P.view === "classify") {
    const s = SKILLS[P.skill], ks = CONTINUA.filter((q, i) => adv || i < 2);
    chA.opts.title = "Where the skill sits (0 = left end, 1 = right end)"; chA.opts.xLabel = ""; chA.opts.yLabel = ""; chA.opts.xFmt = whole(i => (ks[i - 1] || ["", "", "", ""])[3].split(" ")[0]);
    chA.draw([{ pts: ks.map((q, i) => [i + 1, !P.guess || reveal ? s[q[0]] : 0]), type: "bars", w: 0.6, color: "#ffd166", label: "answer" }], { yMin: 0, yMax: 1, xMin: 0.4, xMax: ks.length + 0.6 });
    const sc = ks.filter(q => guesses[P.skill + q[0]] != null).map(q => 1 - Math.abs(guesses[P.skill + q[0]] - s[q[0]]));
    chB.opts.title = "Your placements"; chB.opts.xLabel = ""; chB.opts.yLabel = ""; chB.draw([{ pts: ks.map((q, i) => [i + 1, guesses[P.skill + q[0]] != null ? guesses[P.skill + q[0]] : 0]), type: "bars", w: 0.6, color: "#5ad1ff", label: "your guess" }], { yMin: 0, yMax: 1, xMin: 0.4, xMax: ks.length + 0.6 });
    label(0, "skill"); label(1, "your accuracy"); label(2, "–"); label(3, "–"); read.set("a", s.name); read.set("b", sc.length && reveal ? (100 * K.mean(sc)).toFixed(0) + "%" : "place and reveal"); read.set("c", "–"); read.set("d", "–");
  } else {
    chA.opts.title = "Practice throws: where they landed"; chA.opts.xLabel = "target distance (m)"; chA.opts.yLabel = "landing (m)"; chA.draw([{ pts: schemaRun.throws, type: "dots", r: 4, color: "#5ad1ff", label: "throws" }, { pts: [[3, 3], [10, 10]], color: "#7ee787", dash: [5, 4], label: "on target" }], {});
    const xs = [0, 0.5, 1, 2, 3]; chB.opts.title = "Error at the new 9 m target"; chB.opts.xLabel = "variety in practice (± m)"; chB.opts.yLabel = "m"; chB.draw([{ pts: xs.map(v => [v, schemaTh(v)]), color: "#ff8a70", label: "model" }, { pts: [[P.variety, schemaRun.err]], type: "dots", r: 6, color: "#fff", label: "now" }], { yMin: 0 });
    label(0, "error at 9 m"); label(1, "practice"); label(2, "–"); label(3, "–"); read.set("a", schemaRun.err.toFixed(2) + " m"); read.set("b", P.variety ? "variable" : "fixed"); read.set("c", "–"); read.set("d", "–");
  }
  ui.hud({ react: "More choices → slower reactions", proc: "Input → decision → output → feedback", practice: "Fast gains at first, then slower: the learning curve", classify: "Skills sit on continua, not in boxes", schema: "Varied practice builds a rule for new situations" }[P.view]);
}
let frame = 0, T = 0;
ui.run(dt => {
  if (!(dt > 0)) return; T += dt; procT += dt * 0.5; prT += dt * 6;
  if (P.view === "react" && youT == null && T > simNext) { simRT.push(oneRT(P.N, rnd, P)); if (simRT.length > 300) simRT.shift(); simNext = T + 2.5; }
}, () => { draw(T); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("Five views: reaction time, processing, practice, classifying and schema. Try ▶ Take the test yourself.", 6000);
