/* =====================================================================
   TRAINING AND ADAPTATION
   Two time scales:
     * ONE SESSION (seconds to minutes): the heart and lungs respond to
       exercise. Cardiac output Q = stroke volume × heart rate;
       minute ventilation VE = tidal volume × breathing rate.
     * WEEKS OF TRAINING (days to months): each session adds FITNESS (which
       builds slowly and fades slowly) and FATIGUE (which builds fast and
       fades fast). Performance = fitness − fatigue: the Banister model.
       The body adapts (higher VO₂ max, lower resting heart rate) if the
       training is regular, progressive and specific, and loses the gains
       if training stops (reversibility). Too much too soon risks injury.
   All rates are illustrative, chosen to give realistic sizes.
   ===================================================================== */
const METHOD = {
  continuous: { name: "Continuous", aer: 1.0, str: 0.05, f: 1.0, spec: { run5k: 1.0, sprint: 0.25, shot: 0.05 }, col: "#6fb1ff" },
  interval: { name: "Interval", aer: 0.95, str: 0.15, f: 1.1, spec: { run5k: 0.9, sprint: 0.6, shot: 0.1 }, col: "#c58cff" },
  fartlek: { name: "Fartlek", aer: 0.9, str: 0.1, f: 1.0, spec: { run5k: 0.85, sprint: 0.45, shot: 0.08 }, col: "#7fe3a0" },
  circuit: { name: "Circuit", aer: 0.6, str: 0.5, f: 1.0, spec: { run5k: 0.5, sprint: 0.5, shot: 0.4 }, col: "#ffd166" },
  weights: { name: "Weights", aer: 0.1, str: 1.0, f: 0.8, spec: { run5k: 0.1, sprint: 0.6, shot: 1.0 }, col: "#ff8a70" },
  plyo: { name: "Plyometrics", aer: 0.15, str: 0.8, f: 0.9, inj: 1.8, spec: { run5k: 0.15, sprint: 1.0, shot: 0.7 }, col: "#ff5d8a" },
  hiit: { name: "HIIT", aer: 0.9, str: 0.25, f: 1.2, inj: 1.3, spec: { run5k: 0.8, sprint: 0.7, shot: 0.15 }, col: "#5fe3d8" }
};
const EVENT = { run5k: "5 km run", sprint: "100 m sprint", shot: "Shot put" };
const gauss = r => { let u = 0; while (!u) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283 * r()); };
// Training load of one session (Banister's TRIMP): minutes × intensity, weighted so hard minutes count much more
const trimp = (min, I, m) => min * I * 0.64 * Math.exp(1.92 * I) * METHOD[m].f;

/* ---------- WEEKS OF TRAINING: one day at a time ----------
   o: plan and athlete settings. Returns one record per day. */
const PLAN0 = { weeks: 12, perWeek: 3, I: 0.7, min: 40, method: "continuous", event: "run5k", over: 5, vary: false, breakW: 0, taper: 0, cut: 0.5, age: 16, vo2: 42, rhr: 68, resp: 1, base: 18, miss: 0.05, injOn: true };
function runPlan(o, rand) {
  o = Object.assign({}, PLAN0, o); const days = o.weeks * 7 + o.breakW * 7, out = [];
  // pattern of training days in a week, spread out (e.g. 3 per week: Mon, Wed, Fri)
  const pat = [[], [2], [1, 4], [0, 2, 4], [0, 1, 3, 5], [0, 1, 2, 4, 5], [0, 1, 2, 3, 4, 5], [0, 1, 2, 3, 4, 5, 6]][o.perWeek];
  let g = o.base, h = o.base, acute = o.base, chronic = o.base, aerPool = o.base * 0.6, strPool = o.base * 0.15, aerGain = 0, strGain = 0, injured = 0, same = 0, injuries = 0, expInj = 0, overDays = 0;
  const methods = Object.keys(METHOD);
  for (let d = 0; d < days; d++) {
    const wk = Math.floor(d / 7), dow = d % 7, onPlan = wk < o.weeks, race = d === o.weeks * 7 - 1;
    let m = o.method; if (o.vary && onPlan) m = ["continuous", "fartlek", "interval", "circuit"][wk % 4];
    same = o.vary ? 0 : wk;
    let load = o.base * 0.5, trained = false, missed = false, inj = false;          // everyday activity
    if (onPlan && pat.includes(dow) && !race) {
      // PROGRESSIVE OVERLOAD: a little more each week. TAPER: cut the volume in the last days before the race.
      let min = o.min * Math.pow(1 + o.over / 100, wk); if (d >= o.weeks * 7 - 1 - o.taper) min *= 1 - o.cut;
      // TEDIUM: the same method week after week makes missing sessions more likely
      const pMiss = o.miss + (same > 4 ? 0.02 * (same - 4) : 0);
      if (injured > 0) { inj = true; }
      else if (rand() < pMiss) missed = true;
      else { load = trimp(min, o.I, m); trained = true; }
    }
    if (injured > 0) { injured--; inj = true; load = 0; }
    // fitness (slow) and fatigue (fast): moving averages of the load
    g += (load * (trained ? METHOD[m].spec[o.event] : 0.5) - g) / 42; h += (load - h) / 7;
    acute += (load - acute) / 7; chronic += (load - chronic) / 28;
    const acwr = acute / Math.max(1, chronic);
    // INJURY RISK rises steeply when this week's load is much more than the athlete is used to
    if (trained) { const p = 0.001 * Math.exp(6 * (acwr - 1)) * (METHOD[m].inj || 1); expInj += p; if (o.injOn && rand() < p) { injuries++; injured = 7 + Math.floor(rand() * 14); } }
    // OVERTRAINING: fatigue far above fitness for many days stops adaptation
    overDays = h > 2.2 * Math.max(g, 10) ? overDays + 1 : 0; const over = overDays > 10;
    // ADAPTATION: a 35-day pool of aerobic (or strength) training; gains rise towards a ceiling, with diminishing returns
    aerPool += (load * (trained ? METHOD[m].aer : 0.6) - aerPool) / 35; strPool += (load * (trained ? METHOD[m].str : 0.15) - strPool) / 35;
    const room = K.clamp((80 - o.vo2) / 35, 0.1, 1.3);
    const aerTarget = over ? aerGain : o.resp * 0.22 * room * Math.max(0, 1 - Math.exp(-Math.max(0, aerPool - o.base * 0.6) / 25));
    const strTarget = o.resp * 0.3 * Math.max(0, 1 - Math.exp(-Math.max(0, strPool - o.base * 0.15) / 15));
    aerGain += (aerTarget - aerGain) / 21; strGain += (strTarget - strGain) / 28;
    const perf = 100 + 0.3 * o.resp * (g - o.base * 0.5) - 0.18 * (h - o.base);
    out.push({ d, wk, m, load, trained, missed, inj, race, g, h, perf, acwr, vo2: o.vo2 * (1 + aerGain), rhr: o.rhr * (1 - 0.18 * aerGain / 0.22 * 0.6) + (over ? 4 : 0), str: 100 * strGain, aerGain, injuries, expInj, over });
  }
  return out;
}
const raceDay = (plan, o) => plan[(o.weeks || PLAN0.weeks) * 7 - 1];

/* ---------- ONE SESSION: second by second ----------
   intensity profile: warm-up, the main set (shape depends on the method), cool-down */
function intensityAt(t, s) {
  const W = s.warm * 60, M = s.min * 60, C = s.cool * 60, I = s.I;
  if (t < 60) return 0.0;                                      // a minute standing at the start line
  t -= 60; if (t < W) return 0.3 + (0.6 * I - 0.3) * t / W;
  t -= W; if (t < M) {
    const m = s.method;
    if (m === "interval") return t % 240 < 120 ? Math.min(1, I + 0.15) : Math.max(0.3, I - 0.3);
    if (m === "fartlek") return K.clamp(I + 0.18 * Math.sin(t / 50) + 0.1 * Math.sin(t / 13), 0.3, 1);
    if (m === "circuit") return t % 60 < 45 ? Math.min(1, I + 0.05) : 0.35;
    if (m === "weights") return t % 130 < 40 ? 0.55 : 0.25;
    if (m === "plyo") return t % 60 < 10 ? 0.95 : 0.25;
    if (m === "hiit") return t % 60 < 30 ? 0.95 : 0.35;
    return I;
  }
  t -= M; if (t < C) return 0.5 * I * (1 - t / C) + 0.15;
  return 0;
}
class Session {
  /* s: { method, I, min, warm, cool, drift, age, vo2 (now), vo20 (before training), rhr, mass, lt } */
  constructor(s) { this.s = s; this.t = 0; this.HR = s.rhr; this.VO2 = 3.5; this.Iel = 0; this.antic = 0; this.total = 60 + (s.warm + s.min + s.cool) * 60 + 90; this.step(0); }
  hrMax() { return 220 - this.s.age; }
  step(dt) {
    const s = this.s, I = intensityAt(this.t, s);
    // the same pace is easier for a fitter athlete: relative intensity falls as VO₂ max rises
    const Irel = I * s.vo20 / s.vo2;
    // ANTICIPATORY RISE: adrenaline before the start lifts HR (up to +12 bpm in the last minute)
    this.antic = this.t < 60 ? 12 * this.t / 60 : Math.max(0, this.antic - dt * 0.4);
    // target HR by the heart-rate reserve (Karvonen) method; HR moves towards it with a lag
    const drift = s.drift && this.t > 20 * 60 + 60 && I > 0.4 ? (this.t - 21 * 60) / 600 : 0;      // CARDIOVASCULAR DRIFT: +1 bpm per 10 min after 20 min
    const target = s.rhr + Irel * (this.hrMax() - s.rhr) + this.antic + drift;
    const tau = target > this.HR ? 25 : 55; this.HR += (target - this.HR) * (1 - Math.exp(-dt / tau));
    this.VO2 += (3.5 + Irel * (s.vo2 - 3.5) - this.VO2) * (1 - Math.exp(-dt / 30));
    this.Iel = Irel; this.I = I;
    const svRest = 5000 / s.rhr; this.SV = svRest * (1 + 0.35 * Math.min(1, Math.max(0, (this.HR - s.rhr) / (this.hrMax() - s.rhr)) / 0.45)) - drift * 0.6;  // SV rises then plateaus at about 45% effort
    this.Q = this.SV * this.HR / 1000;                       // L/min
    // breathing: VE rises with oxygen use, faster above the lactate threshold
    this.VE = 0.025 * this.VO2 * s.mass * (1 + 1.6 * Math.max(0, Irel - s.lt)) + 3;
    this.TV = Math.min(0.5 + (0.55 * 4.8 - 0.5) * Math.min(1, (this.VE - 6) / 60), 2.64); this.f = this.VE / this.TV;
    this.avo2 = this.VO2 * s.mass / Math.max(1, this.Q) / 10;   // ml of O₂ taken from each 100 ml of blood
    this.t += dt;
  }
}
function steadyHR(I, o = {}) { const s = new Session(Object.assign({ method: "continuous", I, min: 30, warm: 0, cool: 0, drift: false, age: 16, vo2: 42, vo20: 42, rhr: 68, mass: 60, lt: 0.75 }, o)); for (let t = 0; t < 60 + 25 * 60; t += 1) s.step(1); return s.HR; }

// ---------------- The page ----------------
const P = Object.assign({}, PLAN0, { view: "session", warm: 10, cool: 8, drift: false, mass: 60, lt: 0.75, atWeek: 0, seed: 1 });
let sess, plan = [], speed = 20, dayShown = 0, dayRate = 3, phase = "", hlog = [], qlog = [];
function athleteAt(w) { const base = runPlan(Object.assign({}, P, { injOn: false, miss: 0 }), () => 0.5); const d = base[Math.min(base.length - 1, Math.max(0, w * 7 - 1))]; return w ? { vo2: d.vo2, rhr: d.rhr } : { vo2: P.vo2, rhr: P.rhr }; }
function restartSession() { const a = athleteAt(P.atWeek); sess = new Session({ method: P.method, I: P.I, min: P.min, warm: P.warm, cool: P.cool, drift: P.drift, age: P.age, vo2: a.vo2, vo20: P.vo2, rhr: a.rhr, mass: P.mass, lt: P.lt }); hlog = []; qlog = []; }
function restartPlan(keepDay) { plan = runPlan(P, K.rng(P.seed * 7919 + 13)); if (!keepDay) dayShown = 0; }
const ui = K.app({
  title: "Training and Adaptation", subject: "Physical education",
  blurb: "Heart and lungs in one session, and how the body adapts over weeks",
  reset: () => set({}),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "OCR GCSE (9–1) Physical Education (J587) 1.1 cardiovascular and respiratory systems (HR, SV, cardiac output, tidal volume, breathing rate, minute ventilation; short- and long-term effects of exercise) and 1.2 Physical training (principles of training: SPORT, FITT, progressive overload, specificity, reversibility, tedium; training methods; warm-up and cool-down).", adv: "OCR A level Physical Education (H555) 1.1 Applied anatomy and physiology (Q = SV × HR, VE = TV × f, a-vO₂ difference, cardiovascular drift, Karvonen) and exercise physiology: periodisation, tapering, training for aerobic capacity and strength, injury prevention (acute:chronic load)." } },
  missions: [
    { title: "Q = SV × HR", q: "Watch a continuous run. As the heart rate rises, what happens to stroke volume? Check Q = SV × HR with the numbers.", hint: "Heart rate rises with intensity. Stroke volume rises too at first (the heart fills and contracts more strongly), then levels off at about 40–50% effort. So cardiac output rises mostly through heart rate at high intensity. Q goes from about 5 L/min at rest to over 20 L/min.", setup() { set({ view: "session", method: "continuous" }); } },
    { title: "Warm-up and cool-down", q: "Look at the heart rate before the start, during the warm-up and during the cool-down. Why does it rise before the athlete even moves? Why cool down?", hint: "The anticipatory rise: adrenaline lifts the heart rate before exercise. The warm-up raises heart rate and breathing gradually, warming muscles and preparing the body. The cool-down keeps blood flowing to remove lactic acid and prevent blood pooling, bringing the heart rate down gradually.", setup() { set({ view: "session", warm: 10, cool: 8 }); } },
    { title: "Interval training", q: "Switch to interval training. Which training zone is the heart rate in during the work periods? During the rests?", hint: "Work periods push into the anaerobic zone (80–90% of HR max); rest periods let it fall back to the aerobic zone. Intervals let you do more high-intensity work than one continuous effort.", setup() { set({ view: "session", method: "interval", I: 0.75 }); } },
    { title: "A trained heart", q: "Set 'Athlete as after week' to 12. Compare resting heart rate, resting stroke volume and the heart rate for the same run with week 0.", hint: "After training: lower resting HR (bradycardia) and a larger resting stroke volume (the heart muscle is bigger and stronger: hypertrophy). The same pace now takes a lower heart rate, because VO₂ max is higher and the pace is a smaller share of it.", setup() { set({ view: "session", atWeek: 12 }); } },
    { title: "A 12-week plan", q: "Switch to the weeks view. Three runs a week, 5% more each week. How much does VO₂ max rise? What happens to resting heart rate?", hint: "VO₂ max rises by about 10–15% over 12 weeks for an untrained teenager; resting HR falls by several beats. Gains are fastest at first and then level off: diminishing returns.", setup() { set({ view: "weeks" }); } },
    { title: "Fitness and fatigue", q: "Look at the fitness, fatigue and performance chart. Why does performance dip the day after each session, yet rise over the weeks?", hint: "Each session adds fatigue (fast to build, fast to fade, about a week) and fitness (slow to build, slow to fade, about six weeks). Performance = fitness − fatigue. Just after training, fatigue wins; over weeks, fitness accumulates. This is why rest days matter.", setup() { set({ view: "weeks" }); } },
    { title: "Reversibility", q: "Add a 6-week break at the end. What happens to the gains? How quickly?", hint: "Reversibility: 'use it or lose it'. Gains fade over a few weeks once training stops, the fastest losses first. A little maintenance training keeps most of them.", setup() { set({ view: "weeks", breakW: 6 }); } },
    { title: "Too much, too soon", q: "Raise the overload to 20% per week. Watch the acute:chronic load ratio and the injuries (red). Why does a big jump in training cause injuries?", hint: "Injury risk rises steeply when this week's load is much more than the athlete has been used to over the past month (ratio above about 1.3–1.5). Progressive overload should be gradual: about 5–10% per week.", setup() { set({ view: "weeks", over: 20 }); } },
    { title: "Specificity", q: "Choose the shot put as the event and keep continuous running. Does performance in the event improve much? Try weights instead.", hint: "Specificity: training must match the demands of the activity. Running builds aerobic fitness, which matters little for the shot put; weights (and plyometrics) build the strength and power it needs.", setup() { set({ view: "weeks", event: "shot", method: "continuous" }); } },
    { lvl: "adv", title: "Tapering", q: "Add a taper: cut training by half for the last 10 days. Is race-day performance higher? Try 0, 10 and 25 days.", hint: "Fatigue fades in about a week but fitness lasts about six weeks, so a short taper sheds fatigue while keeping fitness: race-day performance rises. Too long and fitness starts to fade. Studies suggest 8–14 days is best (Bosquet et al., 2007).", setup() { set({ view: "weeks", taper: 10 }); } },
    { lvl: "adv", title: "Cardiovascular drift", q: "Turn on cardiovascular drift and run 45 minutes. What happens to heart rate and stroke volume after 20 minutes, even at a steady pace?", hint: "Sweating reduces blood plasma volume, so less blood returns to the heart: stroke volume falls, and heart rate rises to keep cardiac output up. Drinking during exercise reduces drift.", setup() { set({ view: "session", drift: true, min: 45, warm: 5, cool: 5 }); } }
  ],
  batch: [
    { title: "Heart rate and intensity (Karvonen)", question: "What steady heart rate does each intensity give?", how: "Each run: a 16-year-old (resting HR about 68 ± 6) runs 25 minutes at the chosen % of heart-rate reserve; the heart rate at the end is recorded.", xLabel: "intensity (% of heart-rate reserve)", yLabel: "heart rate (bpm)", xs: [40, 50, 60, 70, 80, 90], reps: 8, fit: true, run: (x, r) => steadyHR(x / 100, { rhr: 68 + 6 * gauss(r) }), theory: x => 68 + x / 100 * (204 - 68), theoryLabel: "HR rest + % × (HR max − HR rest)", note: "A straight line: the Karvonen method. The gradient is the heart-rate reserve, HR max − HR rest." },
    { title: "Responders and non-responders", question: "Do all athletes gain the same from the same 12-week plan?", how: "Each run: one athlete, whose responsiveness to training varies (about ± 30%, as in the HERITAGE study), follows the default plan with random missed sessions.", reps: 200, bins: 24, lo: 0, hi: 30, run(x, r) { const resp = Math.max(0.05, 1 + 0.3 * gauss(r)); const p = runPlan({ resp }, r); return 100 * raceDay(p, PLAN0).aerGain; }, theory: 100 * runPlan({ miss: 0 }, () => 0.9)[83].aerGain, theoryLabel: "average athlete, no missed sessions", note: "A wide spread: some athletes gain twice as much as others from the same training, and a few hardly respond. Genetics matters." },
    { title: "Frequency", question: "How many sessions a week give the biggest VO₂ max gain over 12 weeks?", how: "Each run: the default plan with the chosen number of sessions per week.", xLabel: "sessions per week", yLabel: "VO₂ max gain (%)", xs: [1, 2, 3, 4, 5, 6], reps: 4, yMin: 0, run: (x, r) => 100 * raceDay(runPlan({ perWeek: x }, r), PLAN0).aerGain, note: "More sessions, more gain, but with diminishing returns: the fifth or sixth session adds little, and adds fatigue and injury risk." },
    { title: "Reversibility: how fast are gains lost?", question: "What share of the VO₂ max gain is kept after a break?", how: "Each run: the 12-week plan, then a break of the chosen length doing only everyday activity.", xLabel: "break (weeks)", yLabel: "gain kept (%)", xs: [0, 1, 2, 3, 4, 6, 8, 10, 12], reps: 3, yMin: 0, run(x, r) { const p = runPlan({ breakW: x, miss: 0 }, r); return 100 * p[p.length - 1].aerGain / Math.max(1e-6, p[83].aerGain); }, theory: x => 100 * Math.exp(-x * 7 / 35), theoryLabel: "simple exponential loss (35 days)", note: "Gains fade over weeks. The model loses them a little more slowly at first than a simple exponential, because the body takes time to respond in both directions." },
    { title: "Overload: how much is too much?", question: "How many injuries happen with bigger weekly increases?", how: "Each run: one athlete on the 12-week plan with the chosen overload per week; injuries counted.", xLabel: "overload (% more each week)", yLabel: "injuries in 12 weeks", xs: [0, 5, 10, 15, 20, 25], reps: 30, yMin: 0, run: (x, r) => raceDay(runPlan({ over: x }, r), PLAN0).injuries, theory: x => raceDay(runPlan({ over: x, miss: 0, injOn: false }, () => 0.5), PLAN0).expInj, theoryLabel: "expected from the risk model", note: "Injuries climb steeply above about 10% per week, as the acute:chronic load ratio rises. Gradual overload is safer." },
    { lvl: "adv", title: "Best taper length", question: "How many days of reduced training before race day give the best performance?", how: "Each run: the 12-week plan with training halved for the chosen number of days before the race; performance on race day.", xLabel: "taper (days)", yLabel: "race-day performance", xs: [0, 3, 6, 9, 12, 15, 20, 25, 30], reps: 4, run: (x, r) => raceDay(runPlan({ taper: x, miss: 0, injOn: false, resp: 1 + 0.05 * gauss(r) }, r), PLAN0).perf, note: "A peak at about one to two weeks: long enough for fatigue to fade, short enough that fitness is kept (Bosquet et al., 2007: 8–14 days)." },
    { title: "Specificity", question: "Which training method improves 5 km performance most?", how: "Each run: the 12-week plan using one method (1 continuous, 2 interval, 3 fartlek, 4 circuit, 5 weights, 6 plyometrics, 7 HIIT); race-day performance for a 5 km run.", xLabel: "method (1 cont · 2 int · 3 fart · 4 circ · 5 wts · 6 plyo · 7 HIIT)", yLabel: "race-day performance (5 km)", xs: [1, 2, 3, 4, 5, 6, 7], reps: 4, run: (x, r) => raceDay(runPlan({ method: Object.keys(METHOD)[x - 1], miss: 0, injOn: false, taper: 7 }, r), PLAN0).perf, note: "Aerobic methods (continuous, interval, fartlek, HIIT) help a 5 km runner most; weights and plyometrics help little. Try the shot put in the simulation to see the reverse." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "J587 1.1", text: "Cardiac output (Q) = stroke volume (SV) × heart rate (HR). Minute ventilation (VE) = tidal volume (TV) × breathing rate (f). All rise during exercise." },
      { lvl: "std", tag: "J587 1.1", text: "Short-term effects of exercise: anticipatory rise, increased HR, SV, Q, breathing rate and depth; lactic acid if anaerobic. Long-term effects: lower resting HR (bradycardia), bigger stronger heart (cardiac hypertrophy), higher SV, quicker recovery, increased capillarisation and VO₂ max." },
      { lvl: "std", tag: "J587 1.2", text: "Principles of training (SPORT): Specificity, Progressive overload, Reversibility, Tedium; and FITT: Frequency, Intensity, Time, Type." },
      { lvl: "std", tag: "J587 1.2", text: "Training zones: maximum HR = 220 − age; aerobic zone 60–80% of max HR; anaerobic zone 80–90%." },
      { lvl: "std", tag: "J587 1.2", text: "Training methods: continuous, fartlek, interval, circuit, weight, plyometric, HIIT. Warm-up: raise pulse, stretch, skill rehearsal. Cool-down: low-intensity exercise and stretching to remove lactic acid and prevent blood pooling." },
      { lvl: "adv", tag: "H555 1.1", text: "Karvonen: training HR = HR rest + % × (HR max − HR rest). Cardiovascular drift: after about 20 min, SV falls (lower plasma volume from sweating) and HR rises to maintain Q." },
      { lvl: "adv", tag: "H555 1.1", text: "a-vO₂ difference: the difference in oxygen content between arterial and venous blood; it widens during exercise and with training, as muscles extract more oxygen." },
      { lvl: "adv", tag: "H555", text: "Periodisation: macro-, meso- and microcycles; tapering reduces volume (not intensity) before competition so fatigue falls while fitness is kept. Injury risk rises with a high acute:chronic workload ratio." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: () => `In the simulation, stroke volume is ${sess.SV.toFixed(0)} ml and heart rate ${sess.HR.toFixed(0)} bpm. Calculate the cardiac output in litres per minute.`, ans: () => `<ul><li>Q = SV × HR = ${sess.SV.toFixed(0)} × ${sess.HR.toFixed(0)} = ${(sess.SV * sess.HR).toFixed(0)} ml/min</li><li>= ${(sess.SV * sess.HR / 1000).toFixed(1)} L/min</li></ul>` },
      { lvl: "std", marks: 2, q: "A 16-year-old wants to train in the aerobic zone. Calculate the range of heart rates they should aim for.", ans: "<ul><li>Max HR = 220 − 16 = 204 bpm</li><li>60–80%: 122 to 163 bpm</li></ul>" },
      { lvl: "std", marks: 3, q: "Explain why the resting heart rate of an endurance athlete is lower than that of an untrained person.", ans: "<ul><li>Training causes cardiac hypertrophy: the heart gets bigger and stronger</li><li>so stroke volume increases</li><li>the same cardiac output is reached with fewer beats (bradycardia)</li></ul>" },
      { lvl: "std", marks: 4, q: "Describe how a 100 m sprinter could apply the principles of specificity and progressive overload.", ans: "<ul><li>Specificity: use training that matches the event, e.g. interval sprints, plyometrics, weights for power</li><li>using the anaerobic energy systems and the muscles used in sprinting</li><li>Progressive overload: gradually increase the load, e.g. more repetitions, heavier weights, shorter rests</li><li>small increases (about 5–10% a week) to avoid injury</li></ul>" },
      { lvl: "std", marks: 2, q: "Explain what is meant by reversibility.", ans: "<ul><li>Fitness gains are lost when training stops or is reduced</li><li>e.g. through injury; gains fade over weeks ('use it or lose it')</li></ul>" },
      { lvl: "adv", marks: 3, q: "Explain why heart rate gradually rises during a long run at a constant pace.", ans: "<ul><li>Cardiovascular drift: sweating reduces plasma volume</li><li>so venous return and stroke volume fall</li><li>heart rate increases to maintain cardiac output</li></ul>" },
      { lvl: "adv", marks: 3, q: "Using the idea of fitness and fatigue, explain why athletes taper before a competition.", ans: "<ul><li>Training produces fitness (slow to build and lose) and fatigue (fast to build and lose)</li><li>Reducing volume for 1–2 weeks lets fatigue fall</li><li>while most fitness is kept, so performance peaks on the day</li></ul>" },
      { lvl: "adv", marks: 2, q: "Calculate the Karvonen training heart rate at 70% for an athlete aged 20 with a resting heart rate of 60 bpm.", ans: "<ul><li>HR max = 200; reserve = 200 − 60 = 140</li><li>60 + 0.7 × 140 = 158 bpm</li></ul>" }
    ]
  },
  notes: `<h3>What is being modelled</h3>
<p><b>One session (every second)</b></p>
<ul><li>Maximum heart rate = 220 − age. Target heart rate = HR rest + intensity × (HR max − HR rest) (the Karvonen or heart-rate-reserve method). The heart rate moves towards its target with a lag: about 25 s going up, 55 s coming down.</li>
<li>Anticipatory rise: up to +12 bpm in the minute before the start. Cardiovascular drift (A level): +1 bpm per 10 minutes after 20 minutes, with stroke volume falling slightly.</li>
<li>Stroke volume at rest = 5000 ÷ resting HR (so resting cardiac output is about 5 L/min); it rises by 35% up to about 45% effort, then levels off.</li>
<li>Oxygen use VO₂ = 3.5 + intensity × (VO₂ max − 3.5) ml/kg/min. Minute ventilation follows VO₂, rising faster above the lactate threshold. Tidal volume rises towards 55% of a 4.8 L vital capacity; breathing rate = VE ÷ TV.</li>
<li>A fitter athlete running at the same pace works at a lower share of their VO₂ max, so their heart rate is lower.</li></ul>
<p><b>Weeks of training (every day)</b></p>
<ul><li>Load of a session = minutes × intensity × 0.64 e^(1.92 × intensity) (Banister's TRIMP), times a factor for the method. Everyday activity adds a little load on other days.</li>
<li>Fitness is a 42-day moving average of training specific to the event; fatigue is a 7-day moving average of all load. Performance = 100 + fitness term − fatigue term (Banister's impulse–response model).</li>
<li>VO₂ max and strength rise towards a ceiling set by a 35-day pool of aerobic (or strength) training, with diminishing returns, scaled by the athlete's responsiveness; gains follow with a three-week lag, and fade when the pool falls (reversibility).</li>
<li>Injury: the daily risk on a training day is 0.1% × e^(6 × (ratio − 1)), where the ratio is the 7-day load ÷ the 28-day load (the acute:chronic ratio, Gabbett 2016); higher for plyometrics and HIIT. An injury stops training for 1–3 weeks.</li>
<li>Tedium: after 4 weeks of the same method, the chance of missing a session rises by 2% a week. Overtraining: if fatigue stays far above fitness for 10 days, adaptation stops and resting HR rises.</li></ul>
<h3>Simplifications</h3>
<ul><li>All rates are illustrative, chosen to give realistic sizes, not fitted to any one athlete.</li>
<li>Nutrition, sleep, illness, heat, muscle fibre types, skill and psychology are left out.</li>
<li>HR max = 220 − age is an average: real athletes vary by ± 10 bpm.</li></ul>
<p>The earlier version of this simulation, with its worksheets, is kept in <a href="original/training-adaptation.html">original/training-adaptation.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {}, grp = {};
let g = ui.group("View");
ctl.view = K.seg(g, { value: "session", options: [["session", "🏃 One session"], ["weeks", "📅 Weeks of training"]], on: v => { P.view = v; show(); } });
g = ui.group("FITT: the session");
ctl.method = K.seg(g, { label: "Type (method)", value: "continuous", options: Object.entries(METHOD).slice(0, 4).map(([k, m]) => [k, m.name]), on: v => pick(v) });
ctl.method2 = K.seg(g, { value: "", options: Object.entries(METHOD).slice(4).map(([k, m]) => [k, m.name]), on: v => pick(v) });
ctl.I = K.slider(g, { label: "Intensity (% of heart-rate reserve)", min: 0.4, max: 0.95, step: 0.05, value: 0.7, fmt: v => Math.round(v * 100) + "%", on: v => { P.I = v; changed(); } });
ctl.min = K.slider(g, { label: "Time (main set)", min: 10, max: 90, step: 5, value: 40, unit: " min", on: v => { P.min = v; changed(); } });
ctl.perWeek = K.slider(g, { label: "Frequency (sessions per week)", min: 1, max: 7, step: 1, value: 3, on: v => { P.perWeek = v; changed(); } });
g = grp.session = ui.group("Session");
ctl.warm = K.slider(g, { label: "Warm-up", min: 0, max: 20, step: 1, value: 10, unit: " min", on: v => { P.warm = v; restartSession(); } });
ctl.cool = K.slider(g, { label: "Cool-down", min: 0, max: 15, step: 1, value: 8, unit: " min", on: v => { P.cool = v; restartSession(); } });
ctl.atWeek = K.slider(g, { label: "Athlete as after week", min: 0, max: 24, step: 1, value: 0, on: v => { P.atWeek = v; restartSession(); } });
ctl.drift = K.toggle(g, { label: "Cardiovascular drift (A level)", value: false, on: v => { P.drift = v; sess.s.drift = v; } });
K.btn(K.row(g), "↺ Start the session again", () => restartSession(), "primary");
g = grp.weeks = ui.group("The plan");
ctl.event = K.seg(g, { label: "Training for", value: "run5k", options: Object.entries(EVENT), on: v => { P.event = v; changed(); } });
ctl.weeks = K.slider(g, { label: "Length of plan", min: 4, max: 24, step: 1, value: 12, unit: " weeks", on: v => { P.weeks = v; changed(); } });
ctl.over = K.slider(g, { label: "Progressive overload", min: 0, max: 25, step: 1, value: 5, unit: "% per week", on: v => { P.over = v; changed(); } });
ctl.vary = K.toggle(g, { label: "Vary the methods (avoid tedium)", value: false, on: v => { P.vary = v; changed(); } });
ctl.breakW = K.slider(g, { label: "Break after the plan (reversibility)", min: 0, max: 12, step: 1, value: 0, unit: " weeks", on: v => { P.breakW = v; changed(); } });
ctl.taper = K.slider(g, { label: "Taper before race day (A level)", min: 0, max: 30, step: 1, value: 0, unit: " days", on: v => { P.taper = v; changed(); } });
let r1 = K.row(g); K.btn(r1, "🎲 Another athlete's luck", () => { P.seed++; changed(); }); K.btn(r1, "▶ Replay", () => { dayShown = 0; });
g = ui.group("Athlete");
ctl.age = K.slider(g, { label: "Age", min: 12, max: 60, step: 1, value: 16, unit: " years", on: v => { P.age = v; changed(); } });
ctl.vo2 = K.slider(g, { label: "Starting VO₂ max", min: 25, max: 70, step: 1, value: 42, unit: " ml/kg/min", on: v => { P.vo2 = v; changed(); } });
ctl.rhr = K.slider(g, { label: "Starting resting HR", min: 40, max: 90, step: 1, value: 68, unit: " bpm", on: v => { P.rhr = v; changed(); } });
ctl.resp = K.slider(g, { label: "Responsiveness to training", min: 0.2, max: 2, step: 0.05, value: 1, fmt: v => "× " + v.toFixed(2), on: v => { P.resp = v; changed(); } });
g = ui.group("Watch");
ctl.speed = K.slider(g, { label: "Speed", min: 1, max: 60, step: 1, value: 20, fmt: v => P.view === "session" ? v + "× real time" : (v / 6).toFixed(1) + " days per second", on: v => { speed = v; dayRate = v / 6; } });
ui.headerSpeed(ctl.speed);   // playback speed lives in the header, beside Pause and Reset
const read = K.readout(g, [["a", ""], ["b", ""], ["c", ""], ["d", ""], ["e", ""], ["f", ""]]);   // relabelled for each view
function pick(v) { P.method = v; ctl.method.set(Object.keys(METHOD).indexOf(v) < 4 ? v : ""); ctl.method2.set(Object.keys(METHOD).indexOf(v) >= 4 ? v : ""); changed(); }
function changed() { restartSession(); restartPlan(true); }
function show() { grp.session.style.display = P.view === "session" ? "" : "none"; grp.weeks.style.display = P.view === "weeks" ? "" : "none"; ctl.view.set(P.view); ctl.speed.set(speed); }
function set(o) {
  Object.assign(P, PLAN0, { view: P.view, warm: 10, cool: 8, drift: false, atWeek: 0 }, o);
  for (const k of ["I", "min", "perWeek", "warm", "cool", "atWeek", "weeks", "over", "breakW", "taper", "age", "vo2", "rhr", "resp"]) ctl[k].set(P[k]);
  ctl.drift.set(P.drift); ctl.vary.set(P.vary); ctl.event.set(P.event); pick(P.method); show(); restartSession(); restartPlan(); dayShown = 0;
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
function zoneName(hr) { const p = hr / (220 - P.age); return p < 0.6 ? "below training zones" : p < 0.8 ? "aerobic zone (60–80%)" : p < 0.9 ? "anaerobic zone (80–90%)" : "above 90% of max"; }
function drawSession(c, w, h) {
  const s = sess, t = s.t, I = s.I || 0;
  phase = t < 60 ? "Before the start" : t < 60 + P.warm * 60 ? "Warm-up" : t < 60 + (P.warm + P.min) * 60 ? METHOD[P.method].name + " training" : t < 60 + (P.warm + P.min + P.cool) * 60 ? "Cool-down" : "Recovery";
  c.fillStyle = "#eef2f8"; c.font = "600 14px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillText(`${phase}  ·  ${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`, 16, 26);
  c.font = "12px Segoe UI,sans-serif"; c.fillStyle = "#aab6cc"; c.fillText(`effort ${Math.round(I * 100)}% of heart-rate reserve${P.atWeek ? ` · athlete after ${P.atWeek} weeks of training` : ""}`, 16, 44);
  // the athlete: a runner whose stride speed follows the intensity
  const gx = w * 0.18, gy = h * 0.62, ph = (performance.now() / 1000) * (1 + 6 * I) * 2.2, sw = 0.25 + 0.6 * I;
  c.strokeStyle = "#dfe6f0"; c.lineWidth = 6; c.lineCap = "round"; const hip = [gx, gy - 70], sh = [gx + 6 * I, gy - 140];
  c.beginPath(); c.arc(sh[0] + 4, sh[1] - 22, 15, 0, 6.3); c.stroke();
  const limb = (o, a, L1, L2, k) => { const k1 = [o[0] + L1 * Math.sin(a), o[1] + L1 * Math.cos(a)], k2 = [k1[0] + L2 * Math.sin(a - k), k1[1] + L2 * Math.cos(a - k)]; c.beginPath(); c.moveTo(o[0], o[1]); c.lineTo(k1[0], k1[1]); c.lineTo(k2[0], k2[1]); c.stroke(); };
  c.beginPath(); c.moveTo(...hip); c.lineTo(...sh); c.stroke();
  for (const sg of [1, -1]) { limb(hip, sg * sw * Math.sin(ph), 38, 36, sg * Math.sin(ph) > 0 ? 0 : 1.1 * sw); limb(sh, -sg * sw * Math.sin(ph) * 1.1, 28, 26, -1.2); }
  c.strokeStyle = "#3a4560"; c.lineWidth = 3; c.beginPath(); c.moveTo(gx - 80, gy + 4); c.lineTo(gx + 80, gy + 4); c.stroke();
  // the heart: beats at the heart rate, size shows stroke volume
  const hx = w * 0.45, hy = h * 0.4, beat = (t * s.HR / 60) % 1, sq = beat < 0.25 ? 1 - 0.18 * Math.sin(beat / 0.25 * Math.PI) : 1, R = (22 + s.SV * 0.12) * sq;
  c.fillStyle = "#e0465a"; c.beginPath(); c.moveTo(hx, hy + R * 0.9); c.bezierCurveTo(hx - R * 1.5, hy - R * 0.1, hx - R * 0.7, hy - R * 1.2, hx, hy - R * 0.45); c.bezierCurveTo(hx + R * 0.7, hy - R * 1.2, hx + R * 1.5, hy - R * 0.1, hx, hy + R * 0.9); c.fill();
  // the lungs: fill with each breath; depth shows tidal volume
  const lx = w * 0.72, ly = h * 0.4, br = 0.5 - 0.5 * Math.cos(t * s.f / 60 * 6.283), L = 30 + 22 * s.TV / 2.6 * br + 6;
  c.fillStyle = "#ff9fb0"; c.globalAlpha = 0.85; for (const sg of [-1, 1]) { c.beginPath(); c.ellipse(lx + sg * (L * 0.55 + 6), ly + 8, L * 0.55, L, sg * 0.15, 0, 6.3); c.fill(); } c.globalAlpha = 1; c.strokeStyle = "#ffd3dc"; c.lineWidth = 4; c.beginPath(); c.moveTo(lx, ly - L - 18); c.lineTo(lx, ly - L * 0.4); c.stroke();
  c.textAlign = "center"; c.fillStyle = "#eef2f8"; c.font = "600 15px Segoe UI,sans-serif";
  c.fillText(`Q = SV × HR`, hx, h * 0.72); c.font = "14px Segoe UI,sans-serif"; c.fillText(`${s.Q.toFixed(1)} L/min = ${s.SV.toFixed(0)} ml × ${s.HR.toFixed(0)} bpm`, hx, h * 0.72 + 22);
  c.font = "600 15px Segoe UI,sans-serif"; c.fillText(`VE = TV × f`, lx, h * 0.72); c.font = "14px Segoe UI,sans-serif"; c.fillText(`${s.VE.toFixed(0)} L/min = ${s.TV.toFixed(2)} L × ${s.f.toFixed(0)} per min`, lx, h * 0.72 + 22);
  c.font = "12px Segoe UI,sans-serif"; c.fillStyle = "#aab6cc"; c.fillText(zoneName(s.HR), hx, h * 0.72 + 42);
}
function drawWeeks(c, w, h) {
  const n = plan.length, wks = Math.ceil(n / 7), cell = Math.min(38, (w - 120) / wks, (h - 230) / 7), x0 = 80, y0 = 56, shown = Math.floor(dayShown);
  c.fillStyle = "#eef2f8"; c.font = "600 14px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillText(`Training for the ${EVENT[P.event].toLowerCase()}: ${P.perWeek} × ${P.min} min a week at ${Math.round(P.I * 100)}%, +${P.over}% a week`, 16, 26);
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]; c.font = "11px Segoe UI,sans-serif"; c.fillStyle = "#aab6cc"; days.forEach((d, i) => c.fillText(d, 40, y0 + i * cell + cell * 0.65));
  const maxL = Math.max(...plan.map(p => p.load), 1);
  for (let i = 0; i < Math.min(n, shown + 1); i++) {
    const p = plan[i], x = x0 + p.wk * cell, y = y0 + (p.d % 7) * cell;
    c.fillStyle = p.inj ? "#d94a4a" : p.race ? "#ffd166" : p.trained ? METHOD[p.m].col : p.wk >= P.weeks ? "#2a3040" : "#1a2030"; c.globalAlpha = p.trained ? 0.35 + 0.65 * p.load / maxL : 1; c.fillRect(x + 1, y + 1, cell - 2, cell - 2); c.globalAlpha = 1;
    if (p.missed) { c.strokeStyle = "#8c96aa"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x + 5, y + 5); c.lineTo(x + cell - 5, y + cell - 5); c.moveTo(x + cell - 5, y + 5); c.lineTo(x + 5, y + cell - 5); c.stroke(); }
    if (p.over) { c.fillStyle = "#ff8a70"; c.fillRect(x + 1, y + cell - 4, cell - 2, 3); }
  }
  c.fillStyle = "#aab6cc"; c.textAlign = "center"; for (let k = 0; k < wks; k += wks > 16 ? 2 : 1) c.fillText("w" + (k + 1), x0 + k * cell + cell / 2, y0 - 6);
  if (P.taper) { c.fillStyle = "#ffffff22"; const d0 = P.weeks * 7 - 1 - P.taper; c.fillText("taper", x0 + (d0 / 7 + P.taper / 14) * cell, y0 + 7 * cell + 14); }
  // before and after
  const d = plan[Math.min(n - 1, shown)], first = plan[0], bx = 80, by = y0 + 7 * cell + 40;
  c.textAlign = "left"; c.font = "600 13px Segoe UI,sans-serif"; c.fillStyle = "#eef2f8"; c.fillText(`Day ${shown + 1} (week ${d.wk + 1})${d.race ? " · RACE DAY" : ""}${d.inj ? " · injured" : ""}${d.over ? " · overtrained" : ""}`, bx, by);
  const rows = [["VO₂ max", first.vo2 / (1 + first.aerGain), d.vo2, " ml/kg/min", 1], ["Resting HR", P.rhr, d.rhr, " bpm", 0], ["Resting stroke volume", 5000 / P.rhr, 5000 / d.rhr, " ml", 0], ["Strength gain", 0, d.str, "%", 1], ["Performance", 100, d.perf, "", 1]];
  rows.forEach(([lab, a, b, u, dp], i) => { const y = by + 24 + i * 22; c.fillStyle = "#aab6cc"; c.font = "12.5px Segoe UI,sans-serif"; c.fillText(lab, bx, y); c.fillStyle = "#eef2f8"; c.fillText(`${a.toFixed(dp)} → ${b.toFixed(dp)}${u}`, bx + 170, y); const ch = b - a; c.fillStyle = (lab === "Resting HR" ? ch < 0 : ch > 0) ? "#7fe3a0" : ch === 0 ? "#aab6cc" : "#ff8a70"; c.fillText(`${ch >= 0 ? "+" : ""}${ch.toFixed(dp)}`, bx + 340, y); });
  // key
  let kx = x0 + wks * cell + 24, ky = y0 + 10; c.font = "11.5px Segoe UI,sans-serif"; for (const [col, t] of Object.values(METHOD).map(m => [m.col, m.name]).concat([["#d94a4a", "injured"], ["#ffd166", "race day"]])) { c.fillStyle = col; c.fillRect(kx, ky - 9, 10, 10); c.fillStyle = "#aab6cc"; c.fillText(t, kx + 14, ky); ky += 17; }
  c.fillText("✕ missed session", kx, ky + 2);
}
function draw() { const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#080c15"; c.fillRect(0, 0, w, h); (P.view === "session" ? drawSession : drawWeeks)(c, w, h); }
const chA = K.chart(ui.dock, { title: "", xLabel: "", yLabel: "" }), chB = K.chart(ui.dock, { title: "", xLabel: "", yLabel: "" });
const lab = (ch, t, x, y) => { ch.opts.title = t; ch.opts.xLabel = x; ch.opts.yLabel = y; };
function charts() {
  if (P.view === "session") {
    const mx = 220 - P.age, T = sess.total / 60;
    lab(chA, "Heart rate and training zones", "time (min)", "bpm");
    const zones = [{ y: 0.6 * mx, color: "#7fe3a0aa", label: "60% (aerobic zone above)" }, { y: 0.8 * mx, color: "#ff8a70aa", label: "80% (anaerobic zone above)" }, { y: 0.9 * mx, color: "#ff5d6caa", label: "90%" }];
    chA.draw([{ pts: hlog.map(q => [q[0], q[1]]), color: "#e0465a", width: 2.2, label: "heart rate" }], { xMin: 0, xMax: T, yMin: 40, yMax: mx + 10, hlines: ui.level === "adv" ? [{ y: P.rhr + 0.6 * (mx - P.rhr), color: "#7fe3a0aa", label: "Karvonen 60%" }, { y: P.rhr + 0.8 * (mx - P.rhr), color: "#ff8a70aa", label: "Karvonen 80%" }, { y: mx, color: "#ffffff55", label: "max " + mx }] : zones.concat([{ y: mx, color: "#ffffff55", label: "max " + mx }]) });
    lab(chB, "Heart and lungs", "time (min)", "L/min, ml"); chB.draw([{ pts: hlog.map(q => [q[0], q[2]]), color: "#ffd166", width: 2, label: "cardiac output Q (L/min)" }, { pts: hlog.map(q => [q[0], q[3] / 10]), color: "#c58cff", width: 2, label: "stroke volume (×10 ml)" }, { pts: hlog.map(q => [q[0], q[4] / 5]), color: "#6fb1ff", width: 2, label: "ventilation VE (÷5 L/min)" }], { xMin: 0, xMax: T, yMin: 0 });
  } else {
    const n = Math.min(plan.length, Math.floor(dayShown) + 1), sl = plan.slice(0, n), X = n => n / 7;
    lab(chA, "Fitness, fatigue and performance", "weeks", "");
    chA.draw([{ pts: sl.map(p => [X(p.d), p.g]), color: "#7fe3a0", width: 2, label: "fitness" }, { pts: sl.map(p => [X(p.d), p.h]), color: "#ff8a70", width: 1.6, label: "fatigue" }, { pts: sl.map(p => [X(p.d), p.perf - 80]), color: "#ffd166", width: 2.4, label: "performance − 80" }], { xMin: 0, xMax: plan.length / 7, yMin: 0, vlines: P.taper ? [{ x: (P.weeks * 7 - 1 - P.taper) / 7, color: "#ffffff55", label: "taper" }] : [] });
    lab(chB, "Load and injury risk", "weeks", "acute:chronic ratio");
    chB.draw([{ pts: sl.map(p => [X(p.d), p.acwr]), color: "#c58cff", width: 2, label: "acute:chronic load" }, { pts: sl.filter(p => p.inj && !plan[p.d - 1]?.inj).map(p => [X(p.d), p.acwr]), type: "dots", color: "#d94a4a", r: 5, label: "injury" }], { xMin: 0, xMax: plan.length / 7, yMin: 0, yMax: Math.max(2, ...sl.map(p => p.acwr)), hlines: [{ y: 0.8, color: "#7fe3a0aa", label: "0.8" }, { y: 1.3, color: "#7fe3a0aa", label: "1.3: safer between" }, { y: 1.5, color: "#ff5d6caa", label: "1.5: high risk above" }] });
  }
}

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => {
  if (!(dt > 0)) return;
  if (P.view === "session") { let left = dt * speed; while (left > 0 && sess.t < sess.total) { const h = Math.min(1, left); left -= h; sess.step(h); if (!hlog.length || sess.t - hlog[hlog.length - 1][0] * 60 >= 5) hlog.push([sess.t / 60, sess.HR, sess.Q, sess.SV, sess.VE]); } }
  else dayShown = Math.min(plan.length - 1, dayShown + dt * dayRate);
}, () => {
  draw(); if (frame++ % 6) return; charts();
  let rows;
  if (P.view === "session") rows = [["heart rate", sess.HR.toFixed(0) + " bpm"], ["stroke volume", sess.SV.toFixed(0) + " ml"], ["cardiac output", sess.Q.toFixed(1) + " L/min"], ["breathing rate", sess.f.toFixed(0) + " per min"], ["tidal volume", sess.TV.toFixed(2) + " L"], ui.level === "adv" ? ["a-vO₂ difference", sess.avo2.toFixed(1) + " ml per 100 ml"] : ["minute ventilation", sess.VE.toFixed(0) + " L/min"]];
  else { const d = plan[Math.floor(dayShown)], r = raceDay(plan, P); rows = [["VO₂ max now", d.vo2.toFixed(1)], ["resting HR now", d.rhr.toFixed(0) + " bpm"], ["acute:chronic", d.acwr.toFixed(2)], ["injuries so far", d.injuries], ["sessions missed", plan.slice(0, d.d + 1).filter(p => p.missed).length], ["race-day performance", r.perf.toFixed(1)]]; }
  rows.forEach(([l, v], i) => { read.set("abcdef"[i], v); const e = read.el.children[i].firstElementChild; if (e.textContent !== l) e.textContent = l; });
  ctl.taper.el.style.display = ui.level === "adv" ? "" : "none"; ctl.drift.el.style.display = ui.level === "adv" ? "" : "none";
  ui.hud(P.view === "session" ? `<b style="font-size:15px">${sess.HR.toFixed(0)} bpm</b><br>${zoneName(sess.HR)}` : `<b style="font-size:15px">Week ${plan[Math.floor(dayShown)].wk + 1}</b><br>VO₂ max ${plan[Math.floor(dayShown)].vo2.toFixed(1)}`);
});
set({});
ui.tip("Two views: one training session, or weeks of training. Pick a mission to start.", 7000);
