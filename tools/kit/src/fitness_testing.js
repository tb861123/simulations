/* =====================================================================
   FITNESS TESTING
   A squad of simulated performers. Each has TRUE values for every
   component of fitness (aerobic endurance, speed, power, flexibility,
   strength, agility, reaction time, muscular endurance). A fitness test
   never measures the true value exactly:
       recorded score = true score + day-to-day variation + trial-to-trial
                        variation + tester error + protocol effects
   So we can ask:
     • RELIABILITY: does the same person get the same score on a retest?
       (typical error TE = SD of the differences ÷ √2)
     • VALIDITY: does the test measure what it claims to? (compare with a
       lab "criterion" measurement)
     • Is a change after training REAL, or just noise? (smallest worthwhile
       change SWC = 0.2 × the between-performer SD)
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
const NAMES = [["Ben", "Dev", "Finn", "Harry", "Jack", "Kai", "Mo", "Oscar", "Sam", "Umar", "Will", "Yusuf", "Alfie", "Cal", "Ethan"], ["Aisha", "Chloe", "Ella", "Grace", "Isla", "Lily", "Nia", "Priya", "Ruby", "Tara", "Violet", "Zara", "Bea", "Dina", "Freya"]];
// Each test: component, unit, typical mean and SD for boys / girls aged 16 (illustrative), whether lower is better,
// typical error (day-to-day + trial), how much the hand-timing tester adds, the effect of no warm-up, the learning effect,
// the share of the score that is not the component (validity), and the OCR spec that names it.
const TESTS = {
  msft: { name: "Multi-stage fitness (bleep) test", comp: "aerobic endurance", unit: "level", m: [10.3, 8.0], sd: [1.7, 1.7], low: false, te: 0.45, tester: 0, warm: -0.2, learn: -0.3, other: 0.25, dp: 1, health: true, max: true, spec: "J587, H555" },
  cooper: { name: "Cooper 12-minute run", comp: "aerobic endurance", unit: "m", m: [2650, 2250], sd: [300, 280], low: false, te: 70, tester: 15, warm: -40, learn: -60, other: 0.3, dp: 0, health: true, max: true, spec: "J587, H555" },
  sprint: { name: "30 m sprint", comp: "speed", unit: "s", m: [4.55, 5.15], sd: [0.28, 0.33], low: true, te: 0.05, tester: 0.12, warm: 0.12, learn: 0.04, other: 0.2, dp: 2, health: false, max: true, spec: "J587" },
  vj: { name: "Vertical jump", comp: "power", unit: "cm", m: [46, 36], sd: [8, 7], low: false, te: 2.5, tester: 1.5, warm: -2.5, learn: -1.5, other: 0.25, dp: 0, health: false, max: true, spec: "J587, H555" },
  sitreach: { name: "Sit and reach", comp: "flexibility", unit: "cm", m: [25, 30], sd: [7, 7], low: false, te: 1.4, tester: 0.8, warm: -3, learn: -0.8, other: 0.4, dp: 0, health: true, max: true, spec: "J587, H555" },
  grip: { name: "Hand grip dynamometer", comp: "strength", unit: "kg", m: [40, 27], sd: [7, 5], low: false, te: 1.6, tester: 0.3, warm: -1, learn: -0.8, other: 0.2, dp: 0, health: true, max: true, spec: "J587, H555" },
  illinois: { name: "Illinois agility run", comp: "agility", unit: "s", m: [16.4, 18.4], sd: [1.0, 1.2], low: true, te: 0.25, tester: 0.15, warm: 0.3, learn: 0.5, other: 0.25, dp: 2, health: false, max: true, spec: "J587" },
  ruler: { name: "Ruler drop", comp: "reaction time", unit: "cm", m: [18, 19], sd: [4, 4], low: true, te: 3.5, tester: 1, warm: 0.5, learn: 1, other: 0.15, dp: 0, health: false, max: true, spec: "J587" },
  situp: { name: "One-minute sit-up test", comp: "muscular endurance", unit: "sit-ups", m: [45, 38], sd: [8, 8], low: false, te: 3, tester: 2, warm: -1, learn: -2, other: 0.3, dp: 0, health: true, max: true, spec: "J587, H555" },
  pressup: { name: "One-minute press-up test", comp: "muscular endurance", unit: "press-ups", m: [30, 18], sd: [10, 8], low: false, te: 3, tester: 2, warm: -1, learn: -1.5, other: 0.3, dp: 0, health: true, max: true, spec: "J587, H555" },
  qc: { name: "Queens College step test", comp: "aerobic endurance", unit: "ml/kg/min", m: [48, 40], sd: [6, 6], low: false, te: 3.2, tester: 1.5, warm: 0, learn: -0.5, other: 0.35, dp: 1, health: true, max: false, spec: "H555", adv: true }
};
const RATINGS = ["Excellent", "Above average", "Average", "Below average", "Poor"], RCOL = ["#7ee787", "#b5e86b", "#ffd166", "#ffa45c", "#ff6b81"];
// rating from the approximate norm table (mean ± 0.5 SD and ± 1.25 SD bands for the performer's sex)
function rating(t, score, sex) { const T = TESTS[t], z = (score - T.m[sex]) / T.sd[sex] * (T.low ? -1 : 1); return z > 1.25 ? 0 : z > 0.5 ? 1 : z > -0.5 ? 2 : z > -1.25 ? 3 : 4; }
const normCuts = (t, sex) => { const T = TESTS[t], s = T.low ? -1 : 1; return [1.25, 0.5, -0.5, -1.25].map(z => T.m[sex] + s * z * T.sd[sex]); };
// a squad: true component z-scores linked by a general fitness factor (and a shared speed factor)
function makeSquad(o, r) {
  const sq = [], lvl = { inactive: -0.8, typical: 0, county: 1.2 }[o.fitness];
  for (let i = 0; i < o.n; i++) {
    const sex = o.sex === "mixed" ? i % 2 : o.sex === "girls" ? 1 : 0, g = lvl + 0.7 * r.gauss(), spd = r.gauss(), z = {};
    for (const t in TESTS) { const T = TESTS[t], fast = ["sprint", "illinois", "vj"].includes(t) ? 0.5 * spd : 0; z[t] = 0.6 * g + fast + 0.55 * r.gauss(); z[t + "_o"] = r.gauss(); }   // _o: the part of the score that is not the component
    const nk = sq.filter(q => q.sex === sex).length, L = NAMES[sex]; sq.push({ name: L[nk % L.length] + (nk >= L.length ? " " + (1 + Math.floor(nk / L.length)) : ""), sex, z, gain: 0.6 + 0.8 * r(), age: o.age });
  }
  return sq;
}
// the true score on a test (component + the test-specific part), with training gains added
function trueScore(p, t, train = 0) { const T = TESTS[t], sgn = T.low ? -1 : 1, age = p.age === "17-19" ? 0.15 : 0; return T.m[p.sex] + sgn * T.sd[p.sex] * ((Math.sqrt(1 - T.other) * (p.z[t] + train + age) + Math.sqrt(T.other) * p.z[t + "_o"])); }
// the component itself (the "criterion" a lab would measure), in the test's units
function criterion(p, t, train = 0) { const T = TESTS[t], sgn = T.low ? -1 : 1, age = p.age === "17-19" ? 0.15 : 0; return T.m[p.sex] + sgn * T.sd[p.sex] * (p.z[t] + train + age); }
// one test session: day-to-day error once, then each trial adds its own error; best (or mean) of the trials
// o = { tester (× hand-timing error), warm, practice, motivation (0–1), varied, trials, best }
function measure(p, t, o, r, train = 0, first = true) {
  const T = TESTS[t], sgn = T.low ? -1 : 1, day = r.gauss() * T.te * 0.6 * (o.varied ? 1.6 : 1);
  let base = trueScore(p, t, train) + day;
  if (!o.warm) base += T.warm; if (first && !o.practice) base += T.learn;
  if (T.max) base -= sgn * (1 - o.motivation) * T.sd[p.sex] * 0.6;                // maximal tests depend on effort
  const tr = []; for (let k = 0; k < o.trials; k++) tr.push(base + r.gauss() * T.te * 0.8 + r.gauss() * T.tester * o.tester);
  const v = o.best ? (T.low ? Math.min(...tr) : Math.max(...tr)) : K.mean(tr), f = 10 ** T.dp;
  return Math.round(v * f) / f;
}
// predicted VO₂ max and other derived values
const vo2msft = L => 3.46 * (Math.floor(L) + (L % 1) * 10 / (0.4325 * Math.floor(L) + 7.0048)) + 12.2;
const vo2cooper = d => (d - 504.9) / 44.73;
const lewis = (m, cm) => Math.sqrt(4.9) * m * Math.sqrt(cm / 100) * 9.81;
const rulerT = cm => Math.sqrt(2 * cm / 100 / 9.81);
const tePair = (a, b) => K.sd(a.map((x, i) => b[i] - x)) / Math.SQRT2;
const BASE = () => ({ n: 20, sex: "mixed", age: "15-16", fitness: "typical", tester: 1, warm: true, practice: true, motivation: 0.9, varied: false, trials: 2, best: true });
const Phi = x => 0.5 * (1 + Math.sign(x) * Math.sqrt(1 - Math.exp(-2 * x * x / Math.PI)));   // normal CDF (good approximation)

// ---------------- The page ----------------
const P = Object.assign(BASE(), { test: "vj", graph: "results", train: "none", weeks: 8, seed: 1 });
let rnd, squad = [], res = [], res2 = [], resT = [], prog = 0, speed = 1, picked = null;
const ui = K.app({
  title: "Fitness Testing", subject: "Physical education",
  blurb: "A squad of simulated performers does the standard fitness tests: ratings, reliability, validity and real change",
  reset: () => set({}),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "OCR GCSE (9–1) Physical Education (J587) 1.2.a: components of fitness (health- and skill-related), the fitness tests that measure them, collecting and interpreting data (mean, rating against norms), reliability and validity, quantitative and qualitative, objective and subjective data.", adv: "OCR A level Physical Education (H555) 1.2: fitness testing (maximal and submaximal, direct and indirect, including the Queens College step test and direct gas analysis), principles of testing; typical error and the smallest worthwhile change are beyond the specification." } },
  missions: [
    { title: "30 m sprint", q: "Run the 30 m sprint for the squad. What is the mean, the median and the range? Who rates as excellent?", hint: "Most cluster around the middle (average); a few are excellent or poor. With mixed squads, compare boys' and girls' ratings against their own norm tables, not each other's times.", setup() { set({ test: "sprint" }); } },
    { title: "Multi-stage fitness test", q: "Watch the bleep test. Why do performers drop out at different levels? Which component does it measure?", hint: "Aerobic endurance (cardiovascular fitness). It is maximal: performers run until they can't keep up, so motivation matters. The level predicts VO₂ max (indirectly).", setup() { set({ test: "msft" }); } },
    { title: "Ruler drop", q: "Measure reaction time with the ruler drop. Use t = √(2d ÷ g) to change the distance into a time.", hint: "A 20 cm catch is t = √(2 × 0.20 ÷ 9.81) = 0.20 s. Single drops vary a lot, so average several trials.", setup() { set({ test: "ruler", trials: 3, best: false }); } },
    { title: "Reliability: test and retest", q: "Test the squad on the vertical jump, then retest a week later (Retest graph). Do people get the same score twice?", hint: "Close but not identical: points scatter around the line of perfect agreement. The scatter comes from day-to-day and trial-to-trial variation and the tester: that is reliability.", setup() { set({ test: "vj", graph: "retest" }); } },
    { title: "Why protocols matter", q: "Turn off the warm-up and the practice attempt and make the tester careless. What happens to the sprint scores and their reliability?", hint: "Times get slower (no warm-up, no practice) and more variable (tester error): a standardised protocol makes tests fair and reliable.", setup() { set({ test: "sprint", warm: false, practice: false, tester: 3, graph: "retest" }); } },
    { title: "Fitness profile", q: "Click a performer and look at their profile across every test. What are their strengths and weaknesses? What training would you suggest?", hint: "A profile shows which components are good (health- or skill-related) and which need work, so training can be specific to the weaknesses that matter for their sport.", setup() { set({ test: "vj", graph: "profile" }); picked = squad[0]; } },
    { title: "Before and after training", q: "Give the squad 8 weeks of aerobic training and retest on the bleep test. Did everyone improve?", hint: "Most improve, by different amounts (individual response). Some apparent changes are measurement noise: a small rise may not be real.", setup() { set({ test: "msft", train: "aerobic", graph: "training" }); } },
    { title: "Validity: sit and reach", q: "Compare sit and reach scores with the true hamstring flexibility (Validity graph). Is the test valid?", hint: "Partly: arm and leg length and back flexibility also change the score, so people with the same hamstring flexibility score differently. A goniometer is a more valid measure.", setup() { set({ test: "sitreach", graph: "validity" }); } },
    { lvl: "adv", title: "Submaximal: Queens College", q: "Run the Queens College step test. Why is it useful for people who should not do a maximal test? What makes it less accurate?", hint: "It predicts VO₂ max from the heart rate after 3 minutes of stepping, so no one runs to exhaustion. But it assumes heart rate rises with workload in the same way for everyone, so predictions can be several ml/kg/min out.", setup() { set({ test: "qc", graph: "validity" }); } },
    { lvl: "adv", title: "Smallest worthwhile change", q: "With 4 weeks of training, how many performers' bleep test changes are bigger than the smallest worthwhile change? Are the rest real changes?", hint: "Changes smaller than about the typical error could be noise. SWC = 0.2 × the squad's SD; a change is likely real only if it beats both the SWC and the noise (beyond the H555 specification).", setup() { set({ test: "msft", train: "aerobic", weeks: 4, graph: "training" }); } }
  ],
  batch: [
    { title: "Test and retest: how big is the typical error?", question: "If 500 performers jump twice, a week apart, how much do their scores differ?", how: "Vertical jump, standard protocol (warm-up, practice, best of 2). Result: retest − first test for each performer.", yLabel: "retest − test (cm)", reps: 500, bins: 24, theory: 0, theoryLabel: "no change", run: (x, r) => { const p = makeSquad(Object.assign(BASE(), { n: 1 }), r)[0], o = BASE(); return measure(p, "vj", o, r, 0, false) - measure(p, "vj", o, r, 0, true); }, note: "Centred near 0 with an SD of about 3.6 cm, which is √2 × the typical error (about 2.6 cm). Untick the practice attempt in a real test and the second score is higher: the learning effect." },
    { title: "How many drops for a reliable ruler-drop score?", question: "How much does the average of n ruler drops vary for the same person?", how: "One performer, mean of n drops, repeated on different days; result = |measured mean − true score|.", xLabel: "number of drops averaged", yLabel: "error of the mean (cm)", xs: [1, 2, 3, 5, 8, 10], reps: 40, yMin: 0, theory: n => Math.sqrt(2 / Math.PI) * Math.sqrt((3.5 * 0.6) ** 2 + ((3.5 * 0.8) ** 2 + 1) / n), theoryLabel: "√(2/π) × √(day² + trial² ÷ n)", run: (n, r) => { const p = makeSquad(Object.assign(BASE(), { n: 1 }), r)[0], o = Object.assign(BASE(), { trials: n, best: false }); return Math.abs(measure(p, "ruler", o, r, 0, false) - trueScore(p, "ruler")); }, note: "More drops help at first, then level off: averaging removes trial-to-trial error but not day-to-day variation." },
    { title: "Can a retest show a real improvement?", question: "If training truly raises bleep test scores by Δ levels, what percentage of performers show a change bigger than the smallest worthwhile change?", how: "Squads of 20; true gain Δ for everyone; SWC = 0.2 × the squad's SD (about 0.4 levels).", xLabel: "true gain (levels)", yLabel: "% beating the SWC", xs: [0, 0.25, 0.5, 0.75, 1, 1.5], reps: 6, yMin: 0, yMax: 100, theory: d => 100 * (1 - Phi((0.42 - d) / (Math.SQRT2 * 0.45))), theoryLabel: "Φ((Δ − SWC) ÷ (√2 TE))", run: (d, r) => { const sq = makeSquad(BASE(), r), o = BASE(), a = sq.map(p => measure(p, "msft", o, r, 0, false)), swc = 0.2 * K.sd(a); let k = 0; sq.forEach((p, i) => { const b = measure(p, "msft", o, r, d / TESTS.msft.sd[p.sex] / Math.sqrt(1 - TESTS.msft.other), false); if (b - a[i] > swc) k++; }); return 100 * k / sq.length; }, note: "With no real change, about a quarter still 'improve' by chance; it takes a true gain of about 1 level before nearly everyone's retest shows it." },
    { title: "Ruler drop: distance and reaction time", question: "How does the catch distance depend on reaction time?", how: "Reaction time set directly; catch distance ½gt² plus a small trial error.", xLabel: "reaction time (s)", yLabel: "catch distance (cm)", xs: [0.12, 0.15, 0.18, 0.21, 0.24, 0.27], reps: 10, yMin: 0, theory: t => 0.5 * 9.81 * t * t * 100, theoryLabel: "d = ½gt²", run: (t, r) => 0.5 * 9.81 * (t + 0.01 * r.gauss()) ** 2 * 100, note: "Distance grows with the square of the reaction time: double the time, four times the distance, which is why the ruler drop separates slow reactions well." },
    { title: "Does the bleep test measure VO₂ max?", question: "How close is the VO₂ max predicted from the bleep test to the lab (direct gas analysis) value?", how: "Performers with a set true VO₂ max (boys); predicted = 3.46 × (L + S ÷ (0.4325L + 7.0048)) + 12.2 from their measured level.", xLabel: "true VO₂ max (ml/kg/min)", yLabel: "predicted VO₂ max", xs: [38, 42, 46, 50, 54, 58], reps: 10, theory: v => v, theoryLabel: "perfect agreement", run: (v, r) => { const p = makeSquad(Object.assign(BASE(), { n: 1, sex: "boys" }), r)[0]; p.z.msft = (v - 48) / 6; const L = measure(p, "msft", BASE(), r, 0, false); return vo2msft(L); }, note: "On average the prediction follows the true value (valid for groups), but individuals scatter by a few ml/kg/min: pacing, running technique and motivation also change the level reached." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "J587 1.2.a", text: "Health-related components: cardiovascular endurance, muscular endurance, strength, flexibility, body composition. Skill-related: agility, balance, coordination, power, reaction time, speed." },
      { lvl: "std", tag: "J587 1.2.a", text: "Tests: multi-stage fitness test and Cooper run (aerobic endurance), 30 m sprint (speed), vertical jump (power), sit and reach (flexibility), grip dynamometer (strength), Illinois (agility), ruler drop (reaction time), sit-up and press-up tests (muscular endurance)." },
      { lvl: "std", tag: "J587 1.2.a", text: "Reliable: gives the same result when repeated (standard protocol, warm-up, same tester and conditions). Valid: measures what it claims to measure." },
      { lvl: "std", tag: "J587 1.2.a", text: "Quantitative data are numbers; qualitative data are descriptions. Objective data are measured facts; subjective data are opinions." },
      { lvl: "adv", tag: "H555 1.2", text: "Maximal tests (to exhaustion, e.g. bleep test) depend on motivation; submaximal tests (e.g. Queens College) are safer but predict rather than measure. Direct tests (gas analysis) measure; indirect tests predict." },
      { lvl: "beyond", tag: "Beyond the spec", text: "Typical error TE = SD of the test–retest differences ÷ √2. A change is probably real if it is bigger than the smallest worthwhile change (0.2 × the between-performer SD) and the noise." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: () => { const v = res.map(x => x.score); return v.length ? `The squad's ${TESTS[P.test].name.toLowerCase()} scores (${TESTS[P.test].unit}) have a range from ${Math.min(...v)} to ${Math.max(...v)}. Calculate the range and the mean (mean shown on screen: ${K.mean(v).toFixed(2)}).` : "Run a test first."; }, ans: () => { const v = res.map(x => x.score); return v.length ? `<ul><li>range = ${Math.max(...v)} − ${Math.min(...v)} = ${(Math.max(...v) - Math.min(...v)).toFixed(2)} ${TESTS[P.test].unit}</li><li>mean = total ÷ number = ${K.mean(v).toFixed(2)}</li></ul>` : "–"; } },
      { lvl: "std", marks: 3, q: "Explain how a PE teacher could make the 30 m sprint test more reliable.", ans: "<ul><li>standard warm-up and a practice run</li><li>same tester, same timing method (timing gates rather than a stopwatch), same surface and weather</li><li>take the best (or mean) of several trials</li></ul>" },
      { lvl: "std", marks: 2, q: "A performer catches the ruler at 25 cm. Calculate their reaction time (t = √(2d ÷ g), g = 9.81 m/s²).", ans: "<ul><li>t = √(2 × 0.25 ÷ 9.81)</li><li>= 0.23 s</li></ul>" },
      { lvl: "adv", marks: 4, q: "Evaluate the multi-stage fitness test as a measure of VO₂ max.", ans: "<ul><li>+ large groups at once, cheap, simple, norms available</li><li>− indirect (predicts VO₂ max), maximal so motivation matters</li><li>− pacing, turning skill and running economy affect the level reached</li><li>− conditions (surface, temperature) vary; direct gas analysis is more valid</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li><b>Performers:</b> true components as z-scores linked by a general fitness factor (and a shared speed factor for speed, agility and power). True test scores have typical means and spreads for 16-year-olds (illustrative), plus a test-specific part that is not the component (limb length, technique, pacing), so no test is perfectly valid.</li>
<li><b>Recorded score</b> = true + day-to-day variation + trial variation + tester error (× the tester setting) + protocol effects: no warm-up (worse), no practice (the learning effect on the first test), low motivation (worse on maximal tests), varied conditions (bigger day-to-day variation). Best or mean of the trials, rounded as a tester records it.</li>
<li><b>Ratings:</b> Excellent above mean + 1.25 SD, Above average above + 0.5 SD, Average within ± 0.5 SD, Below average to − 1.25 SD, Poor below (an approximation to the published norm tables, which differ between sources).</li>
<li><b>Equations:</b> bleep VO₂ max = 3.46 × (L + S ÷ (0.4325L + 7.0048)) + 12.2; Cooper VO₂ max = (d − 504.9) ÷ 44.73; Lewis power = √4.9 × m × √h × 9.81; ruler t = √(2d ÷ g).</li>
<li><b>Training</b> raises the true z-score of the trained components by up to 0.6 SD × each person's responsiveness (0.6–1.4), with a time constant of 6 weeks.</li>
<li>Typical error TE = SD of the differences ÷ √2; CV = TE ÷ mean; SWC = 0.2 × the between-performer SD (Hopkins 2000).</li></ul>
<h3>Left out</h3>
<ul><li>Injury, fatigue from other tests on the same day, growth and maturation, the menstrual cycle, the many versions of each norm table, and real test-specific details (bleep test shuttle times).</li></ul>
<p>The earlier version of this simulation (with the Harvard step test and animated test views), with its worksheets, is kept in <a href="original/fitness-testing.html">original/fitness-testing.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("Test");
ctl.test = K.seg(g, { value: "vj", options: Object.entries(TESTS).map(([k, v]) => [k, v.name + (v.adv ? " (A level)" : "")]), on: v => { P.test = v; runTest(); } });
ctl.graph = K.seg(g, { label: "Graph", value: "results", options: [["results", "Squad results"], ["retest", "Retest"], ["training", "Training"], ["validity", "Validity"], ["profile", "Profile"]], on: v => P.graph = v });
g = ui.group("Squad");
ctl.n = K.slider(g, { label: "Performers", min: 6, max: 30, step: 1, value: 20, on: v => { P.n = v; newSquad(); } });
ctl.sex = K.seg(g, { value: "mixed", options: [["boys", "boys"], ["girls", "girls"], ["mixed", "mixed"]], on: v => { P.sex = v; newSquad(); } });
ctl.age = K.seg(g, { value: "15-16", options: [["15-16", "15–16"], ["17-19", "17–19"]], on: v => { P.age = v; newSquad(); } });
ctl.fitness = K.seg(g, { value: "typical", options: [["inactive", "inactive"], ["typical", "typical"], ["county", "county level"]], on: v => { P.fitness = v; newSquad(); } });
K.btn(K.row(g), "↺ New squad", () => { P.seed++; newSquad(); });
g = ui.group("Protocol");
ctl.warm = K.toggle(g, { label: "Warm-up", value: true, on: v => { P.warm = v; runTest(); } });
ctl.practice = K.toggle(g, { label: "Practice attempt first", value: true, on: v => { P.practice = v; runTest(); } });
ctl.motivation = K.slider(g, { label: "Motivation", min: 0.3, max: 1, step: 0.05, value: 0.9, fmt: v => (v * 100).toFixed(0) + "%", on: v => { P.motivation = v; runTest(); } });
ctl.tester = K.slider(g, { label: "Tester error", min: 0, max: 3, step: 0.1, value: 1, fmt: v => v === 0 ? "none (timing gates)" : "× " + v.toFixed(1), on: v => { P.tester = v; runTest(); } });
ctl.varied = K.toggle(g, { label: "Varied conditions (weather, time of day)", value: false, on: v => { P.varied = v; runTest(); } });
ctl.trials = K.slider(g, { label: "Trials", min: 1, max: 5, step: 1, value: 2, on: v => { P.trials = v; runTest(); } });
ctl.best = K.seg(g, { value: true, options: [[true, "best trial"], [false, "mean of trials"]], on: v => { P.best = v === true || v === "true"; runTest(); } });
g = ui.group("Training between tests");
ctl.train = K.seg(g, { value: "none", options: [["none", "none"], ["aerobic", "aerobic"], ["strength", "strength"], ["speed", "speed and power"], ["flex", "flexibility"], ["circuit", "circuit"]], on: v => { P.train = v; runTest(); } });
ctl.weeks = K.slider(g, { label: "Weeks of training", min: 2, max: 16, step: 1, value: 8, on: v => { P.weeks = v; runTest(); } });
g = ui.group("Run");
ctl.speed = K.slider(g, { label: "Speed", min: 0.25, max: 4, step: 0.25, value: 1, fmt: v => v + "×", on: v => speed = v });
ui.headerSpeed(ctl.speed);   // playback speed lives in the header, beside Pause and Reset
K.btn(K.row(g), "⏭ Finish", () => prog = 1, "primary");
const read = K.readout(ui.group("Squad statistics"), [["mean", "mean"], ["med", "median · mode"], ["range", "range"], ["sd", "SD (A level)"], ["te", "typical error · CV (beyond the spec)"], ["swc", "smallest worthwhile change (beyond the spec)"], ["sel", "selected performer"]]);
const TRAINS = { aerobic: ["msft", "cooper", "qc"], strength: ["grip", "pressup", "situp"], speed: ["sprint", "vj", "illinois"], flex: ["sitreach"], circuit: ["situp", "pressup", "msft", "cooper", "illinois", "grip"] };
const trainGain = (p, t) => P.train !== "none" && TRAINS[P.train].includes(t) ? 0.6 * p.gain * (1 - Math.exp(-P.weeks / 6)) : 0;
function set(o) { Object.assign(P, BASE(), { test: "vj", graph: "results", train: "none", weeks: 8 }, o); for (const k of ["n", "motivation", "tester", "trials", "weeks"]) ctl[k].set(P[k]); for (const k of ["test", "graph", "sex", "age", "fitness", "train"]) ctl[k].set(P[k]); ctl.warm.set(P.warm); ctl.practice.set(P.practice); ctl.varied.set(P.varied); ctl.best.set(P.best); picked = null; newSquad(); }
function newSquad() { rnd = K.rng(P.seed * 7919 + 13); squad = makeSquad(P, rnd); runTest(); }
// test, retest a week later (no training) and a test after the training block, for every performer
function runTest() { const r = K.rng(P.seed * 31 + Object.keys(TESTS).indexOf(P.test)), t = P.test; res = squad.map(p => ({ p, score: measure(p, t, P, r, 0, true) })); res2 = squad.map(p => ({ p, score: measure(p, t, P, r, 0, false) })); resT = squad.map(p => ({ p, score: measure(p, t, P, r, trainGain(p, t), false) })); res.forEach(x => x.rate = rating(t, x.score, x.p.sex)); prog = 0; }

// ---------------- Drawing: the squad doing the test ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
let lanes = [];
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h, T = TESTS[P.test], n = res.length; c.fillStyle = "#0a1020"; c.fillRect(0, 0, w, h);
  TX(c, T.name, 16, 26, "#eef2f8", "left", "600 15px"); TX(c, `${T.comp} · ${T.health ? "health" : "skill"}-related · ${T.max ? "maximal" : "submaximal"} · ${T.spec}`, 16, 46, "#8fa0bf", "left", "12px");
  const vals = res.map(x => x.score), lo = Math.min(...vals), hi = Math.max(...vals), top = 62, lh = Math.min(26, (h - top - 20) / n), x0 = 120, x1 = w - 140; lanes = [];
  const running = ["msft", "cooper", "sprint", "illinois"].includes(P.test);
  res.forEach((x, i) => {
    const y = top + i * lh + lh / 2, k = T.low ? (hi - x.score) / Math.max(1e-9, hi - lo) : (x.score - lo) / Math.max(1e-9, hi - lo), f = 0.25 + 0.75 * k;
    // progress: in a timed race the fastest finish first; in "how many / how far" tests the best keep going longest
    const done = T.low ? Math.min(1, prog * (1 + 0.6 * k)) : Math.min(f, prog * 1.2), fin = T.low ? done >= 1 : prog * 1.2 >= f;
    c.fillStyle = i % 2 ? "rgba(255,255,255,.025)" : "rgba(255,255,255,.05)"; c.fillRect(x0, y - lh / 2, x1 - x0, lh);
    TX(c, x.p.name, x0 - 8, y + 4, x === picked || x.p === picked ? "#ffd166" : x.p.sex ? "#f5a3d0" : "#7fc8ff", "right", "12px");
    if (running) { const px = x0 + (x1 - x0) * (P.test === "msft" ? (Math.abs(((done * 12) % 2) - 1)) : done); c.fillStyle = fin && !T.low ? "#56607a" : x.p.sex ? "#f5a3d0" : "#7fc8ff"; c.beginPath(); c.arc(px, y, Math.min(8, lh / 3), 0, 6.3); c.fill(); }
    else { c.fillStyle = (x.p.sex ? "#f5a3d0" : "#7fc8ff") + "aa"; c.fillRect(x0, y - lh / 3, (x1 - x0) * done, lh * 2 / 3); }
    if (fin) { TX(c, `${x.score} ${T.unit}`, x1 + 8, y + 4, "#eef2f8", "left", "600 12px"); c.fillStyle = RCOL[x.rate]; c.beginPath(); c.arc(x1 + 112, y, 5, 0, 6.3); c.fill(); }
    lanes.push([y - lh / 2, y + lh / 2, x.p]);
  });
  if (prog >= 1) TX(c, "dot colour = rating (green excellent … red poor) · click a name for their profile", 16, h - 8, "#7d8aa5", "left", "11px");
}
K.pointer(cv.el, { down: (x, y) => { const l = lanes.find(q => y >= q[0] && y < q[1]); if (l) { picked = l[2]; P.graph = "profile"; ctl.graph.set("profile"); } } });

// ---------------- Charts and statistics ----------------
function charts() {
  const T = TESTS[P.test], v = res.map(x => x.score), adv = ui.level === "adv";
  chA.opts.xFmt = null; chB.opts.xFmt = null;
  if (P.graph === "results" || P.graph === "profile") {
    const order = [...res].sort((a, b) => T.low ? a.score - b.score : b.score - a.score);
    chA.opts.title = "Squad results (best first)"; chA.opts.xLabel = "performer"; chA.opts.yLabel = T.unit;
    chA.draw(RATINGS.map((nm, k) => ({ pts: order.map((x, i) => [i + 1, x.score, x.rate]).filter(q => q[2] === k).map(q => [q[0], q[1]]), type: "bars", w: 0.8, color: RCOL[k], label: nm })).filter(s => s.pts.length), { xMin: 0.4, xMax: v.length + 0.6, hlines: [{ y: K.mean(v), label: "mean", color: "#fff" }] });
  }
  if (P.graph === "results") {
    chB.opts.title = "How many in each rating"; chB.opts.xLabel = ""; chB.opts.yLabel = "performers"; chB.opts.xFmt = whole(i => ["", "Excellent", "Above", "Average", "Below", "Poor"][i] || "");
    chB.draw(RATINGS.map((nm, k) => ({ pts: [[k + 1, res.filter(x => x.rate === k).length]], type: "bars", w: 0.7, color: RCOL[k], label: "" })), { xMin: 0.4, xMax: 5.6, yMin: 0 });
  } else if (P.graph === "retest") {
    const pts = res.map((x, i) => [x.score, res2[i].score]), a = Math.min(...pts.flat()), b = Math.max(...pts.flat()), te = tePair(res.map(x => x.score), res2.map(x => x.score));
    chA.opts.title = "Test against retest a week later"; chA.opts.xLabel = "test (" + T.unit + ")"; chA.opts.yLabel = "retest";
    chA.draw([{ pts, type: "dots", r: 4, color: "#5ad1ff", label: "performers" }, { pts: [[a, a], [b, b]], color: "#7ee787", dash: [5, 4], label: "perfect agreement" }, ...(adv ? [{ pts: [[a, a + 2 * te], [b, b + 2 * te]], color: "#56607a", dash: [2, 3], label: "± 2 TE" }, { pts: [[a, a - 2 * te], [b, b - 2 * te]], color: "#56607a", dash: [2, 3] }] : [])], {});
    chB.opts.title = "Differences (retest − test)"; chB.opts.xLabel = "performer"; chB.opts.yLabel = T.unit; chB.draw([{ pts: res.map((x, i) => [i + 1, res2[i].score - x.score]), type: "bars", w: 0.7, color: "#c9a0ff", label: "difference" }], { hlines: [{ y: 0 }] });
  } else if (P.graph === "training") {
    const swc = 0.2 * K.sd(v); chA.opts.title = `Before and after ${P.weeks} weeks of ${P.train === "none" ? "no" : P.train} training`; chA.opts.xLabel = "performer"; chA.opts.yLabel = T.unit;
    chA.draw([{ pts: res2.map((x, i) => [i + 1, x.score]), type: "dots", r: 4, color: "#8fa0bf", label: "before" }, { pts: resT.map((x, i) => [i + 1, x.score]), type: "dots", r: 4, color: "#7ee787", label: "after" }], {});
    const ch = resT.map((x, i) => (x.score - res2[i].score) * (T.low ? -1 : 1));
    chB.opts.title = "Improvement" + (adv ? " (bands: ± smallest worthwhile change)" : ""); chB.opts.xLabel = "performer"; chB.opts.yLabel = T.unit;
    chB.draw([{ pts: ch.map((d, i) => [i + 1, d]), type: "bars", w: 0.7, color: "#7ee787", label: "better (+)" }], { hlines: adv ? [{ y: swc, label: "SWC", color: "#ffd166" }, { y: -swc, color: "#ffd166" }, { y: 0 }] : [{ y: 0 }] });
  } else if (P.graph === "validity") {
    const pts = res.map(x => [criterion(x.p, P.test), P.test === "msft" ? vo2msft(x.score) : x.score]), f = K.linfit(pts);
    chA.opts.title = "Test against the criterion (true component)"; chA.opts.xLabel = { msft: "lab VO₂ max (direct gas analysis), in test units", sitreach: "hamstring flexibility (goniometer), in test units", vj: "peak power (force plate), in test units" }[P.test] || "true component, in test units"; chA.opts.yLabel = P.test === "msft" ? "predicted VO₂ max" : "test score";
    chA.draw([{ pts, type: "dots", r: 4, color: "#5ad1ff", label: "performers" }, { pts: [[Math.min(...pts.map(p => p[0])), f.m * Math.min(...pts.map(p => p[0])) + f.c], [Math.max(...pts.map(p => p[0])), f.m * Math.max(...pts.map(p => p[0])) + f.c]], color: "#ffd166", label: `r = ${f.r.toFixed(2)}` }], {});
    chB.opts.title = "Validity of each test (correlation with the component)"; chB.opts.xLabel = ""; chB.opts.yLabel = "r"; const ks = Object.keys(TESTS); chB.opts.xFmt = whole(i => (ks[i - 1] || "").slice(0, 6));
    chB.draw([{ pts: ks.map((k, i) => [i + 1, Math.sqrt(1 - TESTS[k].other) * 0.95]), type: "bars", w: 0.7, color: "#c9a0ff", label: "typical r" }], { yMin: 0, yMax: 1, xMin: 0.4, xMax: ks.length + 0.6 });
  }
  if (P.graph === "profile") {
    const p = picked || squad[0], r = K.rng(5), ks = Object.keys(TESTS).filter(k => !TESTS[k].adv || adv);
    chB.opts.title = `${p.name}'s profile (rating on every test)`; chB.opts.xLabel = ""; chB.opts.yLabel = "rating (5 = excellent)"; chB.opts.xFmt = whole(i => (ks[i - 1] || "").slice(0, 6));
    chB.draw(ks.map((k, i) => { const rt = rating(k, measure(p, k, P, r), p.sex); return { pts: [[i + 1, 5 - rt]], type: "bars", w: 0.7, color: TESTS[k].health ? "#7ee787" : "#5ad1ff", label: i === 0 ? "health-related" : i === 2 ? "skill-related" : "" }; }), { yMin: 0, yMax: 5, xMin: 0.4, xMax: ks.length + 0.6 });
  }
  // statistics
  const sorted = [...v].sort((a, b) => a - b), med = sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2, cnt = {}; v.forEach(x => cnt[x] = (cnt[x] || 0) + 1); const mx = Math.max(...Object.values(cnt)), modes = Object.keys(cnt).filter(k => cnt[k] === mx);
  const te = tePair(res.map(x => x.score), res2.map(x => x.score)), dp = T.dp + 1;
  read.set("mean", `${K.mean(v).toFixed(dp)} ${T.unit}`); read.set("med", `${med.toFixed(dp)} · ${mx > 1 ? modes.slice(0, 3).join(", ") : "no mode"}`); read.set("range", `${sorted[0]} to ${sorted[sorted.length - 1]} (${(sorted[sorted.length - 1] - sorted[0]).toFixed(T.dp)} ${T.unit})`);
  read.set("sd", adv ? K.sd(v).toFixed(dp) + " " + T.unit : "–"); read.set("te", adv ? `${te.toFixed(dp)} ${T.unit} · ${(te / K.mean(v) * 100).toFixed(1)}%` : "–"); read.set("swc", adv ? `${(0.2 * K.sd(v)).toFixed(dp)} ${T.unit}` : "–");
  const ps = picked ? res.find(x => x.p === picked) : null; read.set("sel", ps ? `${ps.p.name}: ${ps.score} ${T.unit}, ${RATINGS[ps.rate]}${P.test === "msft" ? `, VO₂ max ≈ ${vo2msft(ps.score).toFixed(1)}` : P.test === "cooper" ? `, VO₂ max ≈ ${vo2cooper(ps.score).toFixed(1)}` : P.test === "ruler" ? `, t = ${rulerT(ps.score).toFixed(3)} s` : P.test === "vj" ? `, Lewis power ≈ ${lewis(65, ps.score).toFixed(0)} W (65 kg)` : ""}` : "click a name");
  ui.hud(prog < 1 ? "Testing the squad…" : { results: "Ratings from the norm table for each performer's sex", retest: "Reliable tests give the same score twice", training: "Is the change bigger than the noise?", validity: "Valid tests follow the true component closely", profile: "Strengths and weaknesses across every test" }[P.graph]);
}
let frame = 0;
ui.run(dt => { if (dt > 0 && prog < 1) prog = Math.min(1, prog + dt * speed / 5); }, () => { draw(); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("The squad does the test lane by lane. Change the protocol or the graph on the left.", 6000);
