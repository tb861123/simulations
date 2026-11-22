/* =====================================================================
   ENERGY SYSTEMS
   Muscles run on one fuel only: ATP. There is enough ATP in a muscle for
   about two seconds of flat-out effort, so it must be remade as fast as
   it is used, by three "energy systems" working side by side:

     ATP-PC       phosphocreatine (PC) rebuilds ATP almost instantly, but
                  the PC store runs out in about 10 s of flat-out work
     GLYCOLYTIC   glucose (from glycogen) is broken down WITHOUT oxygen:
                  fast, but makes lactate and H+ ions, which cause fatigue
     AEROBIC      glucose and fat are broken down WITH oxygen: slow to get
                  going and limited by how fast oxygen arrives (VO2 max),
                  but it can go on for hours

   Every tenth of a second the model works out how much energy the
   athlete needs, and takes it from the aerobic system first, then the
   others make up the shortfall. The oxygen the aerobic system could not
   supply at the start is the OXYGEN DEFICIT; the extra oxygen breathed
   afterwards to restore PC and remove lactate is EPOC.

   UNITS: power in watts per kg of body mass (W/kg); 1 ml of oxygen
   releases about 20.9 J, so 60 ml/kg/min of oxygen = 20.9 W/kg.
   ===================================================================== */
const J_PER_ML = 20.9, REST = 3.5;
const LACK = { prod: 0.004, work: 0.006 };   // lactate made by aerobic work above the threshold, and taken up by working muscles (per second)              // J per ml of O2; resting oxygen use (ml/kg/min)
const ATHLETES = {
  student: { name: "untrained student", vo2: 42, lt: 0.6, pc: 1, gly: 1, sprint: 1 },
  sprinter: { name: "sprinter", vo2: 50, lt: 0.62, pc: 1.3, gly: 1.1, sprint: 1.35 },
  middle: { name: "middle-distance runner", vo2: 64, lt: 0.75, pc: 1.1, gly: 1.2, sprint: 1.15 },
  distance: { name: "distance runner", vo2: 72, lt: 0.82, pc: 1, gly: 1.4, sprint: 1 },
  games: { name: "games player", vo2: 56, lt: 0.7, pc: 1.15, gly: 1.15, sprint: 1.15 }
};
class Athlete {
  constructor(A) {
    this.A = A; this.vo2max = A.vo2 * J_PER_ML / 60;                 // W/kg at VO2 max
    this.PC0 = 300 * A.pc; this.PC = this.PC0;                         // J/kg in the phosphocreatine store
    this.atp = 40; this.ATP0 = 40;                                      // J/kg in the ATP store itself (about 2 s flat out)
    this.gly0 = 95000 * A.gly; this.gly = this.gly0;                    // J/kg of glycogen (about 90 minutes of hard running)
    this.vo2 = REST * J_PER_ML / 60; this.lac = 1; this.glyRate = 0;   // oxygen uptake (W/kg), blood lactate (mmol/L), glycolysis speed
    this.t = 0; this.def = 0; this.epoc = 0; this.done = { atp: 0, pc: 0, gly: 0, aer: 0 }; this.now = { atp: 0, pc: 0, gly: 0, aer: 0 }; this.out = 0; this.exhausted = false; this.dist = 0; this.temp = 0;
  }
  // most power the anaerobic systems can supply right now
  maxPower() { const A = this.A; return this.vo2 + 40 * A.sprint * Math.min(1, this.PC / 40) + 14 * A.gly * Math.max(0.2, 1 - (this.lac - 4) / 22) + (this.atp > 1 ? 10 : 0); }
  /* one step of dt seconds. want = power wanted (W/kg) or "max" for flat out */
  step(dt, want) {
    const A = this.A, need = want === "max" ? this.maxPower() : want;
    // ---- AEROBIC: oxygen uptake climbs towards what is needed, but takes time (a time constant of about 25 s) and cannot pass VO2 max ----
    const o2want = Math.min(this.vo2max, Math.max(REST * J_PER_ML / 60, need)) + (need > A.lt * this.vo2max ? 0.08 * (need - A.lt * this.vo2max) : 0);   // above the lactate threshold oxygen cost creeps up
    this.vo2 += (Math.min(this.vo2max, o2want) - this.vo2) * (1 - Math.exp(-dt / (want === 0 || need < this.vo2 ? 35 : 25)));
    let aer = Math.min(need, this.vo2), gap = need - aer;
    if (this.gly <= 0) { aer = Math.min(aer, 0.55 * this.vo2max); gap = need - aer; }       // no glycogen left: fat alone cannot run fast ("hitting the wall")
    // ---- what oxygen cannot cover: the oxygen deficit, met by the other systems ----
    const pcRate = Math.min(gap, 40 * A.sprint * Math.min(1, this.PC / 40)); this.PC -= pcRate * dt; gap -= pcRate;                // ATP–PC: fastest, but the store is small
    this.glyRate += ((gap > 0 ? 1 : 0) * 14 * A.gly * Math.max(0.2, 1 - (this.lac - 4) / 22) - this.glyRate) * Math.min(1, dt / 4);    // glycolysis speeds up over a few seconds, slowed by acid
    const glyP = Math.min(gap, this.glyRate); gap -= glyP; const atpP = Math.min(gap, this.atp / dt, 20); this.atp -= atpP * dt; gap -= atpP;
    // lactate: made by glycolysis, plus a little from aerobic work above the threshold; removed fastest during light exercise
    const above = Math.max(0, aer - A.lt * this.vo2max);
    this.lac += (glyP / 62.7 * 1.2 + LACK.prod * Math.pow(above, 1.5) - LACK.work * (this.lac - 1) * Math.min(1, aer / this.vo2max) - 0.0011 * (this.lac - 1) * (want > 0 && need < 0.6 * this.vo2max ? 2.2 : 1) - (aer < A.lt * this.vo2max ? 0.004 * (this.lac - 1) * aer / this.vo2max : 0)) * dt;   /* passive removal: half-life about 10 minutes; working muscles below the threshold use lactate as fuel */
    if (this.lac < 1) this.lac = 1;
    // ---- recovery: spare oxygen rebuilds ATP and PC (half-life about 30 s); this is the fast part of EPOC ----
    const spare = Math.max(0, this.vo2 - need);
    if (spare > 0) { const pcBack = Math.min(this.PC0 - this.PC, (this.PC0 - this.PC) * (1 - Math.pow(0.5, dt / (need > 0.3 * this.vo2max ? 50 : 30))) / dt), atpBack = Math.min(this.ATP0 - this.atp, 30 * dt); this.PC += pcBack * dt; this.atp += atpBack; this.epoc += spare * dt / J_PER_ML; }
    else this.def += Math.max(0, need - this.vo2) * dt / J_PER_ML;
    this.gly -= (glyP + aer * Math.min(1, 0.1 + 0.9 * Math.pow(aer / this.vo2max, 2))) * dt * (this.gly > 0 ? 1 : 0); if (this.gly < 0) this.gly = 0;      // carbohydrate's share of aerobic fuel rises with intensity
    this.out = need - gap; this.exhausted = gap > 0.5 && want === "max" ? false : gap > 0.5;
    this.now = { atp: atpP, pc: pcRate, gly: glyP, aer }; for (const k in this.now) this.done[k] += this.now[k] * dt; this.t += dt;
    this.temp += ((this.out / this.vo2max) - this.temp) * dt / 300;
    return this.out;
  }
}
// running speed (m/s) from aerobic-equivalent power (W/kg), using the ACSM running equation (VO2 = 0.2 × speed in m/min + 3.5), plus an extra cost of sprinting
const speedOf = P => { const vo2 = P * 60 / J_PER_ML; return Math.max(0, (vo2 - REST) / 0.2 / 60) / (1 + Math.max(0, vo2 - 70) / 230); };
/* An event: returns a plan, want(t, a) gives the power wanted at time t.
   race: run at a % of VO2 max, or flat out, until the distance is covered. */
const EVENTS = {
  m100: { name: "100 m", dist: 100, pace: "max" }, m400: { name: "400 m", dist: 400, pace: "max" }, m800: { name: "800 m", dist: 800, pace: 1.35 }, m1500: { name: "1500 m", dist: 1500, pace: 1.12 },
  m5000: { name: "5000 m", dist: 5000, pace: 0.95 }, marathon: { name: "marathon", dist: 42195, pace: 0.78 },
  rsa: { name: "repeated sprints (6 × 6 s, 24 s rest)", reps: 6, work: 6, rest: 24 }, pc: { name: "ATP–PC training (10 × 8 s, 40 s rest)", reps: 10, work: 8, rest: 40 }, gly: { name: "glycolytic intervals (5 × 45 s, 90 s rest)", reps: 5, work: 45, rest: 90 },
  football: { name: "football (10 minutes)", game: 600 }
};
// a seeded "game": jogging and walking with sprints at random
function gamePlan(rnd, len) { const out = []; let t = 0; while (t < len) { const r = rnd(), d = r < 0.08 ? 3 + rnd() * 4 : 6 + rnd() * 20, p = r < 0.08 ? "max" : r < 0.4 ? 0.85 : r < 0.75 ? 0.55 : 0.3; out.push([t, t + d, p]); t += d; } return out; }
function wantAt(ev, t, a, plan, cool) {
  const E = EVENTS[ev], vmax = a.vo2max;
  if (E.dist) return a.dist >= E.dist ? (cool ? cool * vmax : 0) : E.pace === "max" ? "max" : E.pace * vmax;
  if (E.reps) { const per = E.work + E.rest, k = Math.floor(t / per); if (k >= E.reps) return cool ? cool * vmax : 0; return t - k * per < E.work ? "max" : 0.15 * vmax; }
  if (E.game) { if (t >= E.game) return cool ? cool * vmax : 0; const seg = plan.find(q => t >= q[0] && t < q[1]); return seg ? (seg[2] === "max" ? "max" : seg[2] * vmax) : 0.3 * vmax; }
}
// run an event (and some recovery) without drawing
function session(ev, athlete, rnd, opts = {}) {
  const a = new Athlete(Object.assign({}, ATHLETES[athlete], opts.tweak || {})), plan = gamePlan(rnd, 700), rec = opts.recover == null ? 300 : opts.recover, dt = 0.1; let finish = null, peakLac = 1, t = 0, share = null;
  while (t < 36000) {
    const ended = finish != null; if (ended && t > finish + rec) break;
    const w = wantAt(ev, t, a, plan, opts.cool || 0), P = a.step(dt, w); if (!ended) a.dist += speedOf(P) * dt;
    if (finish == null && (EVENTS[ev].dist ? a.dist >= EVENTS[ev].dist : EVENTS[ev].reps ? t >= EVENTS[ev].reps * (EVENTS[ev].work + EVENTS[ev].rest) : t >= EVENTS[ev].game)) finish = t;
    if (opts.each) opts.each(a, t, finish); if (a.lac > peakLac) peakLac = a.lac; if (finish === t && share == null) { const tot = a.done.atp + a.done.pc + a.done.gly + a.done.aer; share = 100 * a.done.aer / tot; } t += dt;
  }
  return { a, finish, peakLac, aerShare: share };
}

// ---------------- The page ----------------
let ev = "m400", who = "student", cool = 0, speedX = 1, ath, plan, t = 0, finish = null, log = [], rnd = K.rng(Date.now() % 99991 + 31), phase = "run";
function restart() { ath = new Athlete(Object.assign({}, ATHLETES[who])); plan = gamePlan(rnd, 700); t = 0; finish = null; log = []; }
const COLS = { atp: "#ffd166", pc: "#ff8a70", gly: "#c58cff", aer: "#6fb1ff" };
const ui = K.app({
  title: "Energy Systems", subject: "Physical Education",
  blurb: "Where the energy comes from in a sprint, a marathon and a game, and how the body recovers",
  reset: () => set({}),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "OCR GCSE (9–1) Physical Education (J587) 1.2 Physical training and the energy systems: aerobic and anaerobic exercise, EPOC, the recovery process.", adv: "OCR A level Physical Education (H555) 1.1 Energy for exercise: ATP, the ATP–PC, glycolytic and aerobic systems, the energy continuum, oxygen deficit, EPOC, OBLA and recovery." } },
  missions: [
    { title: "The 100 m", q: "A 100 m sprint, flat out. Watch the energy bar and the stores. Which system supplies most of the energy? How much oxygen does the athlete use during the race?", hint: "Almost all of it comes from the ATP store and the ATP–PC system: they are the only ones fast enough. The PC store is nearly empty by the line. The aerobic system has hardly started, because oxygen uptake takes over a minute to rise. The athlete runs almost the whole race on an oxygen deficit, repaid afterwards (EPOC).", setup() { set({ ev: "m100", who: "sprinter" }); } },
    { title: "The 400 m: why it hurts", q: "A 400 m flat out. Watch the speed, the lactate and the energy bar. When does the athlete start to slow down? Why?", hint: "PC is used up within about 10 seconds, so glycolysis takes over: fast, but making lactate and hydrogen ions. Blood lactate passes OBLA (4 mmol/L) early and climbs past 12 mmol/L; the acid slows glycolysis and the athlete fades over the last 100 m. Nobody can sprint 400 m: the trick is to ration the effort.", setup() { set({ ev: "m400", who: "middle" }); } },
    { title: "The marathon", q: "A marathon at a steady pace. Which system supplies the energy? Watch the glycogen store. What happens if it runs out? (Speed it up: 1 second is 5 minutes.)", hint: "The aerobic system supplies nearly everything, using both carbohydrate (glycogen) and fat. Lactate stays low because the pace is below the lactate threshold. If the glycogen runs out (around 30 km if the pace is too hard), fat alone cannot supply energy fast enough, and the runner is forced to slow sharply: 'hitting the wall'. Try 85% of VO₂ max.", setup() { set({ ev: "marathon", who: "distance", speed: 300 }); } },
    { title: "The energy continuum", q: "Run the 100 m, then the 800 m, then the 5000 m. For each, read off the share of the energy that came from the aerobic system at the end. Plot them (the batch run does this for you).", hint: "About 10% for the 100 m, around 50–60% for the 800 m and over 90% for the 5000 m. All three systems are always working together; what changes is the share. Events up to about 75 seconds are mainly anaerobic, longer ones mainly aerobic. This is the energy continuum.", setup() { set({ ev: "m800", who: "middle" }); } },
    { title: "Repeated sprints", q: "Six 6-second sprints with 24 seconds' rest. Watch the PC store between sprints and the speed of each sprint. Does the athlete recover fully?", hint: "PC is rebuilt during the rests, but only partly: half of it returns in about 30 seconds, all of it takes 2 to 3 minutes. So each sprint starts with less PC, uses more glycolysis, and is slower. This is what happens in football, hockey and rugby. Training raises the PC store and speeds up its recovery.", setup() { set({ ev: "rsa", who: "games" }); } },
    { title: "Recovery: oxygen debt", q: "Run the 400 m, then watch what happens after the finish. Why does the athlete go on breathing hard? How long does it take to get the PC back, and the lactate down?", hint: "Excess post-exercise oxygen consumption (EPOC). The fast part, in the first two or three minutes, restores ATP and PC and refills myoglobin. The slow part, over the next hour or so, removes lactate, brings down the heart rate, breathing and temperature. The EPOC is larger than the oxygen deficit that caused it.", setup() { set({ ev: "m400", who: "middle" }); } },
    { title: "Active or passive recovery?", q: "Run the 400 m with a passive recovery (sitting down), and note how fast the lactate falls. Then run it again with a gentle jog afterwards (cool-down at 35%).", hint: "A light jog removes lactate about twice as fast, because working muscles take it up and use it as fuel, and the raised blood flow carries it away. PC, on the other hand, recovers fastest at complete rest. So: walk or jog lightly after hard anaerobic work, rest completely between short sprints.", setup() { set({ ev: "m400", who: "middle", cool: 0 }); } },
    { title: "Training makes a difference", q: "Run the 1500 m with an untrained student, then with a middle-distance runner. Compare the times, the lactate and the share from the aerobic system.", hint: "The trained runner has a higher VO₂ max (more oxygen delivered and used each minute) and a higher lactate threshold, so a larger share of the energy comes aerobically, less lactate is made, and the race is much faster. Aerobic training improves the heart, the capillaries and the mitochondria; anaerobic training enlarges the PC store and the tolerance of lactate.", setup() { set({ ev: "m1500", who: "student" }); } },
    { lvl: "adv", title: "OBLA and pacing", q: "Run the 5000 m at 95% of VO₂ max with the distance runner, then the student at the same percentage. Watch blood lactate against the OBLA line. Why can the student not hold the pace?", hint: "OBLA (onset of blood lactate accumulation, 4 mmol/L) comes at a much lower percentage of VO₂ max in the untrained student. Above it lactate keeps rising and the race is lost. Endurance athletes train to raise their lactate threshold, and pace so as to stay just under it for as long as possible.", setup() { set({ ev: "m5000", who: "distance" }); } }
  ],
  batch: [
    { title: "The energy continuum", question: "What share of the energy comes from the aerobic system in races of different lengths?", how: "Each run: a middle-distance runner whose fitness varies by about 5%, run at a realistic pace. The result is the aerobic share of all the energy used in the race.", xLabel: "race distance (m)", yLabel: "energy from the aerobic system (%)", xs: [100, 200, 400, 800, 1500, 5000], reps: 4, yMin: 0, yMax: 100, run(x, r) { const ev = { 100: "m100", 200: "m200", 400: "m400", 800: "m800", 1500: "m1500", 5000: "m5000" }[x]; EVENTS.m200 = EVENTS.m200 || { name: "200 m", dist: 200, pace: "max" }; return session(ev, "middle", r, { recover: 0, tweak: { vo2: 64 * (1 + 0.05 * r.gauss()) } }).aerShare; }, theory: x => { const T = [[100, 10], [200, 29], [400, 43], [800, 66], [1500, 84], [5000, 94]]; for (let i = 1; i < T.length; i++) if (x <= T[i][0]) { const f = (Math.log(x) - Math.log(T[i - 1][0])) / (Math.log(T[i][0]) - Math.log(T[i - 1][0])); return T[i - 1][1] + f * (T[i][1] - T[i - 1][1]); } return 94; }, theoryLabel: "measured in athletes (Gastin 2001)", note: "Every race uses all the systems; only the share changes. The point where aerobic and anaerobic contribute equally is around 75 seconds of maximal effort, about 600 to 800 m." },
    { title: "How fast does PC come back?", question: "After a 10-second sprint, how much of the PC store is back after a given rest?", how: "Each run: a sprinter (PC store varying by 10%) sprints flat out for 10 s, then rests completely for the chosen time.", xLabel: "rest (seconds)", yLabel: "PC store restored (%)", xs: [0, 15, 30, 45, 60, 90, 120, 180], reps: 4, yMin: 0, yMax: 105, theory: x => 100 * (1 - Math.pow(0.5, x / 30)), theoryLabel: "half-life 30 s", run(x, r) { const a = new Athlete(Object.assign({}, ATHLETES.sprinter, { pc: 1.3 * (1 + 0.1 * r.gauss()) })); for (let t = 0; t < 10; t += 0.1) a.step(0.1, "max"); for (let t = 0; t < x; t += 0.1) a.step(0.1, 0); return 100 * a.PC / a.PC0; } },
    { title: "Active recovery and lactate", question: "Does a cool-down jog clear lactate faster than sitting still?", how: "Each run: a 400 m flat out, then 15 minutes of recovery at the chosen intensity. The result is blood lactate at the end.", xLabel: "recovery intensity (% of VO₂ max)", yLabel: "lactate after 15 minutes (mmol/L)", xs: [0, 10, 20, 30, 45, 60, 75, 85], reps: 4, yMin: 0, run: (x, r) => session("m400", "middle", r, { recover: 900, cool: x / 100, tweak: { vo2: 64 * (1 + 0.05 * r.gauss()) } }).a.lac, note: "Light exercise is best: hard enough to raise blood flow and use lactate as fuel, gentle enough not to make more. Above the lactate threshold the 'cool-down' starts adding lactate again." },
    { title: "Fitness and the 1500 m", question: "How much faster does a higher VO₂ max make a 1500 m runner?", how: "Each run: a middle-distance runner with the chosen VO₂ max runs 1500 m at 112% of VO₂ max (lactate threshold varies by ±3%).", xLabel: "VO₂ max (ml/kg/min)", yLabel: "1500 m time (s)", xs: [45, 50, 55, 60, 65, 70, 75], reps: 4, run: (x, r) => session("m1500", "middle", r, { recover: 0, tweak: { vo2: x * (1 + 0.02 * r.gauss()) } }).finish },
    { title: "Repeated sprints", question: "How does sprint speed fall over repeated sprints with short rests?", how: "Each run: a games player sprints 6 s, rests 24 s, six times. The result is the average speed of the chosen sprint.", xLabel: "sprint number", yLabel: "average speed (m/s)", xs: [1, 2, 3, 4, 5, 6], reps: 6, yMin: 0, run(x, r) { let d0 = null, d1 = null; session("rsa", "games", r, { recover: 0, tweak: { pc: 1.15 * (1 + 0.08 * r.gauss()) }, each: (a, t) => { if (Math.abs(t - (x - 1) * 30) < 0.05) d0 = a.dist; if (Math.abs(t - ((x - 1) * 30 + 6)) < 0.05) d1 = a.dist; } }); return (d1 - d0) / 6; }, note: "PC is only partly restored in 24 seconds, so each sprint relies more on glycolysis and is slower." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "J587 1.2", text: "Aerobic exercise uses oxygen: glucose + oxygen → energy + carbon dioxide + water. Used for long, low-to-moderate intensity activity." },
      { lvl: "std", tag: "J587 1.2", text: "Anaerobic exercise does not use oxygen: glucose → energy + lactic acid. Used for short, high-intensity activity; lactic acid causes fatigue." },
      { lvl: "std", tag: "J587 1.2", text: "EPOC (oxygen debt): the extra oxygen taken in after exercise to remove lactic acid and recover." },
      { lvl: "std", tag: "J587 1.2", text: "Recovery: cool-down (gentle exercise and stretching) helps remove lactic acid; also rehydration, nutrition (carbohydrate), ice baths and massage." },
      { lvl: "adv", tag: "H555 1.1", text: "ATP → ADP + Pi + energy (ATPase). ATP–PC system: PC → P + C + energy, coupled to resynthesise ATP (creatine kinase); 1 ATP per PC; lasts about 10 s; no fatiguing by-products." },
      { lvl: "adv", tag: "H555 1.1", text: "Glycolytic system: glucose → pyruvic acid (PFK) → lactic acid without oxygen; 2 ATP per glucose; up to about 3 minutes; lactate and H⁺ cause fatigue." },
      { lvl: "adv", tag: "H555 1.1", text: "Aerobic system: glycolysis, Krebs cycle and electron transport chain in the mitochondria; about 38 ATP per glucose; also uses fat (β-oxidation)." },
      { lvl: "adv", tag: "H555 1.1", text: "Energy continuum: all systems work together; the predominant one depends on intensity and duration. OBLA: blood lactate passing 4 mmol/L." },
      { lvl: "adv", tag: "H555 1.1", text: "Oxygen deficit: the oxygen not taken in at the start of exercise. EPOC: fast component (resynthesis of ATP and PC, myoglobin) and slow component (lactate removal, elevated ventilation, heart rate and temperature)." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: "Explain why a 100 m sprinter works anaerobically.", ans: "<ul><li>The event is very short and very high intensity</li><li>Energy is needed faster than the heart and lungs can deliver oxygen</li><li>so energy is released without oxygen (anaerobic)</li></ul>" },
      { lvl: "std", marks: 2, q: "Give the word equation for aerobic respiration.", ans: "<ul><li>glucose + oxygen →</li><li>energy + carbon dioxide + water</li></ul>" },
      { lvl: "std", marks: 3, q: "Explain why a 400 m runner breathes heavily for several minutes after the race.", ans: "<ul><li>During the race not enough oxygen could be supplied, so energy was released anaerobically</li><li>Lactic acid built up</li><li>Extra oxygen (EPOC / oxygen debt) is needed to remove the lactic acid and recover</li></ul>" },
      { lvl: "std", marks: 3, q: "Describe two ways a footballer can speed up recovery after a match.", ans: "<ul><li>Cool-down: light jogging and stretching to keep blood flowing and remove lactic acid</li><li>Rehydration and refuelling with carbohydrate (to replace glycogen)</li><li>Also: ice bath, massage, rest and sleep (any two, explained)</li></ul>" },
      { lvl: "std", marks: 2, q: () => `The marathon in the simulation was run at ${Math.round(100 * (EVENTS.marathon.pace))}% of VO₂ max. Which energy system was mainly used, and why?`, ans: "<ul><li>Aerobic</li><li>The intensity is moderate and the event lasts a long time, so enough oxygen can be supplied</li></ul>" },
      { lvl: "adv", marks: 4, q: "Describe how ATP is resynthesised by the ATP–PC system, and explain why this system can only be used for about 10 seconds.", ans: "<ul><li>PC is broken down by creatine kinase: PC → P + C + energy</li><li>The energy is used to resynthesise ATP from ADP + P (a coupled reaction)</li><li>One ATP per molecule of PC; anaerobic, in the sarcoplasm</li><li>The PC store in the muscle is small and runs out in about 10 s of maximal work</li></ul>" },
      { lvl: "adv", marks: 4, q: "Explain the fast and slow components of EPOC.", ans: "<ul><li>Fast (alactacid) component: in the first 2–3 minutes; resynthesis of ATP and PC; resaturation of myoglobin with oxygen</li><li>Slow (lactacid) component: up to an hour or more</li><li>Removal of lactate (converted to pyruvate and oxidised, or to glucose / glycogen)</li><li>Maintaining raised ventilation, heart rate and body temperature</li></ul>" },
      { lvl: "adv", marks: 3, q: "Define OBLA and explain why raising it benefits an endurance athlete.", ans: "<ul><li>Onset of blood lactate accumulation: the point at which blood lactate rises sharply above about 4 mmol/L</li><li>A higher OBLA (as a % of VO₂ max) lets the athlete work at a higher intensity aerobically</li><li>without fatiguing lactate / H⁺ build-up, delaying fatigue</li></ul>" },
      { lvl: "adv", marks: 3, q: "A games player performs repeated sprints with 30 s recovery. Explain why performance declines over the sprints.", ans: "<ul><li>PC is only partly restored in 30 s (about half in 30 s; full recovery takes 2–3 minutes)</li><li>so later sprints rely more on the glycolytic system</li><li>lactate and H⁺ accumulate, causing fatigue and slower sprints</li></ul>" }
    ]
  },
  notes: `<h3>What is being modelled</h3>
<p>Every 0.1 s the model works out the power the athlete wants (watts per kg of body mass) and where it comes from.</p>
<ul><li><b>Aerobic:</b> oxygen uptake rises towards what is needed with a time constant of about 25 s, up to VO₂ max. Above the lactate threshold the oxygen cost creeps up. With no glycogen left, fat alone supplies at most 55% of VO₂ max.</li>
<li><b>The oxygen deficit</b> (what oxygen cannot cover) is met, in order, by the ATP–PC system (fast, but slowing as the PC store empties), glycolysis (speeds up over a few seconds and is slowed by acid) and the ATP store itself.</li>
<li><b>Lactate:</b> 1 mmol/L for about 63 J/kg of glycolytic energy. Removal is fastest with light exercise.</li>
<li><b>Recovery:</b> spare oxygen rebuilds PC with a half-life of about 30 s (slower if still exercising); the oxygen used for this and for lactate removal is EPOC.</li>
<li><b>Speed</b> comes from the ACSM running equation, VO₂ = 0.2 × speed (m/min) + 3.5, with an extra cost of sprinting.</li>
<li><b>Athletes</b> differ in VO₂ max (42 to 72 ml/kg/min), lactate threshold (60 to 82% of VO₂ max) and the sizes of the PC and glycogen stores.</li></ul>
<h3>Simplifications</h3>
<ul><li>Several rates are illustrative, chosen so that race times, peak lactate after a 400 m and the energy shares (Gastin, 2001) are realistic. They are not measured from any one athlete.</li>
<li>No muscle fibre types, heat, dehydration, tactics or finishing kick; the heart and lungs are not modelled separately; no feeding during a marathon.</li>
<li>Muscle and blood lactate are treated as the same; in reality blood lactate peaks a few minutes after the effort.</li>
<li>The figure on the track is a picture of the numbers, not part of the model.</li></ul>
<h3>The earlier version</h3>
<p>The previous version of this simulation, with its worksheets, is still here: <a href="original/energy-systems.html" style="color:var(--accent)">open the earlier version</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("The activity");
ctl.ev = K.seg(g, { label: "Race", value: "m400", options: [["m100", "100 m"], ["m400", "400 m"], ["m800", "800 m"], ["m1500", "1500 m"], ["m5000", "5000 m"]], on: v => { ev = v; ctl.ev2.set(""); ctl.ev3.set(""); restart(); } });
ctl.ev2 = K.seg(g, { value: "", options: [["marathon", "marathon"], ["football", "football"]], on: v => { ev = v; ctl.ev.set(""); ctl.ev3.set(""); restart(); } });
ctl.ev3 = K.seg(g, { label: "Interval training", value: "", options: [["rsa", "6 × 6 s"], ["pc", "10 × 8 s"], ["gly", "5 × 45 s"]], on: v => { ev = v; ctl.ev.set(""); ctl.ev2.set(""); restart(); } });
ctl.pace = K.slider(g, { label: "Pace", min: 0.5, max: 1.6, step: 0.01, value: 1.12, fmt: v => Math.round(v * 100) + "% of VO₂ max", on: v => { if (EVENTS[ev].dist && EVENTS[ev].pace !== "max") EVENTS[ev].pace = v; } });
g = ui.group("The athlete");
ctl.who = K.seg(g, { value: "student", options: Object.entries(ATHLETES).map(([k, a]) => [k, a.name.split(" ")[0]]), on: v => { who = v; restart(); } });
const whoNote = K.note(g, "");
g = ui.group("Afterwards");
ctl.cool = K.slider(g, { label: "Cool-down", min: 0, max: 0.6, step: 0.05, value: 0, fmt: v => v === 0 ? "sit down (passive)" : "jog at " + Math.round(v * 100) + "% of VO₂ max", on: v => cool = v });
let r1 = K.row(g); K.btn(r1, "↺ Start again", () => restart(), "primary");
ctl.speed = K.seg(g, { label: "Speed", value: 1, options: [[0.5, "½×"], [1, "1×"], [5, "5×"], [30, "30×"], [300, "300×"]], on: v => speedX = v });
ui.headerSpeed(ctl.speed);   // playback speed lives in the header, beside Pause and Reset
const read = K.readout(g, [["t", "time"], ["d", "distance"], ["v", "speed"], ["o2", "oxygen uptake"], ["lac", "blood lactate"], ["main", "main system now"], ["def", "oxygen deficit"], ["epoc", "EPOC so far"], ["share", "aerobic share so far"]]);
function set(o) {
  ev = o.ev || "m400"; who = o.who || "middle"; cool = o.cool || 0; speedX = o.speed || 1;
  ctl.ev.set(["m100", "m400", "m800", "m1500", "m5000"].includes(ev) ? ev : ""); ctl.ev2.set(["marathon", "football"].includes(ev) ? ev : ""); ctl.ev3.set(["rsa", "pc", "gly"].includes(ev) ? ev : ""); ctl.who.set(who); ctl.cool.set(cool); ctl.speed.set(speedX); restart();
}

// ---------------- Drawing: the athlete on the track, and the three systems as fuel tanks ----------------
const cv = ui.canvas(() => { });
function figure(c, x, y, s, ph, eff, red) {   // a running figure: stride follows speed, the legs glow red with acid
  const k = Math.sin(ph), k2 = Math.cos(ph), lean = 0.12 + 0.15 * eff; c.lineCap = "round"; c.lineJoin = "round";
  const hip = [x, y - 46 * s], neck = [x + lean * 40 * s, y - 86 * s];
  const limb = (a, L1, L2, ang1, ang2, col, w) => { const k1 = [a[0] + Math.sin(ang1) * L1 * s, a[1] + Math.cos(ang1) * L1 * s], e = [k1[0] + Math.sin(ang2) * L2 * s, k1[1] + Math.cos(ang2) * L2 * s]; c.strokeStyle = col; c.lineWidth = w * s; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(k1[0], k1[1]); c.lineTo(e[0], e[1]); c.stroke(); };
  const legCol = `rgb(${Math.round(70 + 185 * red)},${Math.round(150 - 90 * red)},${Math.round(220 - 160 * red)})`;
  limb(hip, 24, 24, -0.9 * eff * k, -0.9 * eff * k - 1.1 * eff * Math.max(0, k2) - 0.1, "#3a5a85", 7); limb(neck, 18, 18, 0.9 * eff * k + 0.2, 0.9 * eff * k - 1.2, "#3a5a85", 5);
  c.strokeStyle = "#dbe6f7"; c.lineWidth = 9 * s; c.beginPath(); c.moveTo(hip[0], hip[1]); c.lineTo(neck[0], neck[1]); c.stroke();
  limb(hip, 24, 24, 0.9 * eff * k, 0.9 * eff * k - 1.1 * eff * Math.max(0, -k2) - 0.1, legCol, 8); limb(neck, 18, 18, -0.9 * eff * k + 0.2, -0.9 * eff * k - 1.2, "#e8eef8", 5.5);
  c.fillStyle = "#e8eef8"; c.beginPath(); c.arc(neck[0] + lean * 10 * s, neck[1] - 13 * s, 9 * s, 0, 6.3); c.fill();
}
let stride = 0;
function draw(dt) {
  const c = cv.ctx, w = cv.w, h = cv.h, a = ath, v = speedOf(a.out), eff = K.clamp(v / 9, 0, 1), red = K.clamp((a.lac - 2) / 12, 0, 1);
  const sky = c.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, "#0f1b33"); sky.addColorStop(1, "#1a2440"); c.fillStyle = sky; c.fillRect(0, 0, w, h);
  // the track scrolls past at the athlete's speed
  const ty = h * 0.48; c.fillStyle = "#8e3b2c"; c.fillRect(0, ty, w * 0.55, 46); c.strokeStyle = "rgba(255,255,255,.6)"; c.lineWidth = 2; for (const yy of [ty, ty + 46]) { c.beginPath(); c.moveTo(0, yy); c.lineTo(w * 0.55, yy); c.stroke(); }
  const off = (a.dist * 22) % 80; c.strokeStyle = "rgba(255,255,255,.35)"; for (let x = -off; x < w * 0.55; x += 80) { c.beginPath(); c.moveTo(x, ty + 2); c.lineTo(x, ty + 44); c.stroke(); }
  c.fillStyle = "#24522e"; c.fillRect(0, ty + 46, w * 0.55, 30); c.fillStyle = "#1c2a40"; c.fillRect(0, ty - 60, w * 0.55, 60); for (let k = 0; k < 40; k++) { c.fillStyle = ["#e05a6a", "#6fb1ff", "#ffd166", "#cfd8ea"][k % 4]; c.globalAlpha = 0.5; c.beginPath(); c.arc(((k * 37 - a.dist * 4) % (w * 0.55) + w * 0.55) % (w * 0.55), ty - 18 - (k % 3) * 14, 5, 0, 6.3); c.fill(); } c.globalAlpha = 1;
  stride += dt * (2 + v * 1.1); figure(c, w * 0.26, ty + 38, 1.25, stride, v > 0.3 ? 0.35 + eff * 0.65 : 0.05, red);
  if (a.exhausted) { c.fillStyle = "#ffb060"; c.font = "600 13px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillText("can't keep this up", w * 0.26, ty - 120); }
  // breath clouds grow with oxygen uptake
  const br = a.vo2 / a.vo2max; for (let k = 0; k < 6; k++) { const ph2 = (performance.now() / 1000 * (1 + 2 * br) + k / 6) % 1; c.fillStyle = `rgba(220,230,255,${0.25 * (1 - ph2) * br})`; c.beginPath(); c.arc(w * 0.26 + 30 + ph2 * 50, ty - 82 - ph2 * 10, 4 + ph2 * 10 * br, 0, 6.3); c.fill(); }
  // ---- the fuel tanks ----
  const tx = w * 0.6, tw = (w - tx - 30) / 4, th = h * 0.44, tyy = 40;
  const tanks = [["atp", "ATP store", a.atp / a.ATP0, "2 s"], ["pc", "PC store", a.PC / a.PC0, "10 s"], ["gly", "glycogen", a.gly / a.gly0, "90 min"], ["aer", "oxygen", a.vo2 / a.vo2max, "VO₂ max"]];
  tanks.forEach(([k, name, f, life], i) => { const x = tx + i * tw + 6, bw = tw - 14; c.fillStyle = "#121a2b"; c.strokeStyle = "#3a4c6c"; c.lineWidth = 1.5; c.beginPath(); c.roundRect(x, tyy, bw, th, 8); c.fill(); c.stroke();
    c.fillStyle = COLS[k]; c.globalAlpha = .85; c.fillRect(x + 3, tyy + 3 + (th - 6) * (1 - K.clamp(f, 0, 1)), bw - 6, (th - 6) * K.clamp(f, 0, 1)); c.globalAlpha = 1;
    const flow = a.now[k] / Math.max(1, a.out); if (flow > 0.02) { c.fillStyle = COLS[k]; c.beginPath(); c.moveTo(x + bw / 2 - 8, tyy + th + 6); c.lineTo(x + bw / 2 + 8, tyy + th + 6); c.lineTo(x + bw / 2, tyy + th + 6 + 10 + 22 * flow); c.fill(); }
    c.fillStyle = "#eef2f8"; c.font = "600 12px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillText(name, x + bw / 2, tyy - 8); c.fillStyle = "#aab6cc"; c.font = "11px Segoe UI,sans-serif"; c.fillText(k === "aer" ? Math.round(100 * f) + "% of VO₂ max" : Math.round(100 * f) + "% full", x + bw / 2, tyy + th + 50); });
  // where the energy is coming from right now
  const by = tyy + th + 84, bwid = w - tx - 30, tot = a.now.atp + a.now.pc + a.now.gly + a.now.aer || 1; let bx = tx + 6; c.font = "11px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillStyle = "#cfd8ea"; c.fillText("where the energy is coming from now", tx + 6, by - 6);
  for (const k of ["atp", "pc", "gly", "aer"]) { const ww = bwid * a.now[k] / tot; c.fillStyle = COLS[k]; c.fillRect(bx, by, ww, 18); bx += ww; }
  // lactate thermometer with OBLA
  const lx = 30, lh = h * 0.3, ly = 50, lf = K.clamp(a.lac / 20, 0, 1); c.fillStyle = "#121a2b"; c.strokeStyle = "#3a4c6c"; c.beginPath(); c.roundRect(lx, ly, 22, lh, 11); c.fill(); c.stroke(); c.fillStyle = `rgb(${Math.round(120 + 135 * red)},${Math.round(200 - 140 * red)},120)`; c.fillRect(lx + 4, ly + lh - (lh - 8) * lf - 4, 14, (lh - 8) * lf);
  const oy = ly + lh - (lh - 8) * 4 / 20 - 4; c.strokeStyle = "#ffd166"; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(lx - 4, oy); c.lineTo(lx + 30, oy); c.stroke(); c.setLineDash([]); c.fillStyle = "#ffd166"; c.font = "10.5px Segoe UI,sans-serif"; c.fillText("OBLA", lx + 32, oy + 4); c.fillStyle = "#eef2f8"; c.font = "600 12px Segoe UI,sans-serif"; c.fillText("lactate " + a.lac.toFixed(1), lx - 4, ly - 10);
  // progress
  const E = EVENTS[ev]; c.fillStyle = "#eef2f8"; c.font = "600 15px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillText(E.name + " · " + ATHLETES[who].name, 90, h - 60);
  c.font = "13px Segoe UI,sans-serif"; c.fillStyle = "#cfd8ea"; c.fillText(finish != null ? "finished in " + fmt(finish) + " · now recovering (" + fmt(t - finish) + ")" : E.dist ? Math.round(a.dist) + " m of " + E.dist + " m · " + fmt(t) : fmt(t), 90, h - 40);
}
const fmt = s => s < 60 ? s.toFixed(1) + " s" : Math.floor(s / 60) + " min " + String(Math.floor(s % 60)).padStart(2, "0") + " s";
const chE = K.chart(ui.dock, { title: "Energy from each system", xLabel: "time (s)", yLabel: "W/kg", yMin: 0 });
const chO = K.chart(ui.dock, { title: "Oxygen: deficit and EPOC", xLabel: "time (s)", yLabel: "ml/kg/min", yMin: 0 });

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => {
  const steps = Math.min(400, Math.round(dt * speedX / 0.1) || 1), h = speedX >= 30 ? Math.min(0.5, dt * speedX / steps) : 0.1;
  for (let k = 0; k < steps; k++) {
    if (finish != null && t > finish + 1800) { ui.setPlaying(false); break; }
    const want = wantAt(ev, t, ath, plan, cool), P = ath.step(h, want); if (finish == null) ath.dist += speedOf(P) * h;
    const E = EVENTS[ev]; if (finish == null && (E.dist ? ath.dist >= E.dist : E.reps ? t >= E.reps * (E.work + E.rest) : t >= E.game)) finish = t;
    t += h; if (!log.length || t - log[log.length - 1][0] >= Math.max(0.2, (finish || t) / 400)) { log.push([t, ath.now.atp, ath.now.pc, ath.now.gly, ath.now.aer, ath.vo2 * 60 / J_PER_ML, Math.min(ath.out, 60) * 60 / J_PER_ML, ath.lac]); if (log.length > 1500) log = log.filter((q, i) => i % 2 === 0); }
  }
}, dt => {
  draw(ui.playing ? Math.min(dt, 0.1) * Math.min(speedX, 2) : 0); if (frame++ % 6) return;
  const a = ath, tot = a.done.atp + a.done.pc + a.done.gly + a.done.aer || 1, xMax = Math.max(10, t);
  // stacked energy supply
  const st = (k) => log.map(q => [q[0], q.slice(1, 1 + k).reduce((s, v) => s + v, 0)]);
  chE.draw([{ pts: st(4), color: COLS.aer, type: "area", label: "aerobic" }, { pts: st(3), color: COLS.gly, type: "area", label: "glycolytic" }, { pts: st(2), color: COLS.pc, type: "area", label: "ATP–PC" }, { pts: st(1), color: COLS.atp, type: "area", label: "ATP" }], { xMin: 0, xMax, vlines: finish != null ? [{ x: finish, label: "finish" }] : [] });
  chO.draw([{ pts: log.map(q => [q[0], q[6]]), color: "#ffd166", label: "oxygen needed", dash: [5, 4] }, { pts: log.map(q => [q[0], q[5]]), color: COLS.aer, type: "area", label: "oxygen taken in", width: 2 }], { xMin: 0, xMax, yMax: a.vo2max * 60 / J_PER_ML * 2.2, hlines: [{ y: a.A.vo2, label: "VO₂ max", color: "rgba(255,255,255,.4)" }], vlines: finish != null ? [{ x: finish, label: "finish" }] : [] });
  const v = speedOf(a.out), main = Object.entries(a.now).sort((p, q) => q[1] - p[1])[0][0];
  read.set("t", fmt(t)); read.set("d", Math.round(a.dist) + " m"); read.set("v", v.toFixed(1) + " m/s"); read.set("o2", Math.round(a.vo2 * 60 / J_PER_ML) + " ml/kg/min (" + Math.round(100 * a.vo2 / a.vo2max) + "%)"); read.set("lac", a.lac.toFixed(1) + " mmol/L" + (a.lac > 4 ? " (above OBLA)" : ""));
  read.set("main", { atp: "ATP store", pc: "ATP–PC", gly: "glycolytic", aer: "aerobic" }[main]); read.set("def", a.def.toFixed(1) + " ml/kg"); read.set("epoc", a.epoc.toFixed(1) + " ml/kg"); read.set("share", Math.round(100 * a.done.aer / tot) + "%");
  const A = ATHLETES[who]; whoNote.innerHTML = `VO₂ max ${A.vo2} ml/kg/min · lactate threshold ${Math.round(A.lt * 100)}% · PC store × ${A.pc} · glycogen × ${A.gly}`;
  ctl.pace.el.style.display = EVENTS[ev].dist && EVENTS[ev].pace !== "max" ? "" : "none"; if (EVENTS[ev].dist && EVENTS[ev].pace !== "max") ctl.pace.set(EVENTS[ev].pace);
  ui.hud("");
});
set({});
ui.tip("Four fuel tanks: ATP, PC, glycogen and oxygen · the bar shows which one is supplying the muscles now", 8000);
