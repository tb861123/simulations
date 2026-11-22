/* =====================================================================
   HEART, LUNGS AND BLOOD IN EXERCISE: how the body controls them
   The CARDIAC CONTROL CENTRE (CCC) in the medulla sets heart rate through
   the sympathetic nerve (speeds up) and the vagus nerve (slows down), using
   information from:
     PROPRIOCEPTORS   movement of muscles and joints (fast: the first rise)
     CHEMORECEPTORS   CO₂ and acidity (H⁺) in the blood (slower)
     BARORECEPTORS    blood pressure in the arteries (brake if it rises too far)
     THERMORECEPTORS  body temperature
   plus ADRENALINE, which raises heart rate even before exercise starts
   (the anticipatory rise). Cardiac output Q = stroke volume SV × heart rate HR.
   SV depends on VENOUS RETURN (Starling's law: more blood in, more out),
   helped by the skeletal muscle pump, the respiratory pump and pocket valves.
   The VASCULAR SHUNT: arterioles to muscles dilate and those to the gut
   constrict, so muscles' share of Q rises from about 20% to 80%.
   The RESPIRATORY CONTROL CENTRE raises breathing rate and depth
   (VE = TV × f) mainly in response to CO₂.
   In a long, hot session sweating thins the plasma, SV falls and HR drifts
   up: CARDIOVASCULAR DRIFT.
   ===================================================================== */
// a session: list of [duration (s), intensity 0–1 (fraction of VO₂max), label]
const SESSIONS = {
  steady: { name: "Steady run", seq: [[60, 0, "rest"], [30, -1, "about to start (anticipation)"], [180, 0.35, "warm-up"], [1500, 0.65, "steady run"], [300, 0.25, "active cool-down"], [300, 0, "rest"]] },
  interval: { name: "Interval session", seq: [[60, 0, "rest"], [30, -1, "about to start"], [180, 0.35, "warm-up"], ...[1, 2, 3, 4, 5].flatMap(k => [[60, 0.95, "fast rep " + k], [90, 0.3, "recovery jog"]]), [300, 0.2, "cool-down"]] },
  stop: { name: "Sprint, then stand still", seq: [[60, 0, "rest"], [30, -1, "about to start"], [120, 0.4, "warm-up"], [60, 1, "all-out effort"], [240, 0, "stand still (passive recovery)"]] }
};
const sessionLen = k => SESSIONS[k].seq.reduce((s, q) => s + q[0], 0);
const phaseAt = (k, t) => { let a = 0; for (const q of SESSIONS[k].seq) { if (t < a + q[0]) return q; a += q[0]; } return SESSIONS[k].seq[SESSIONS[k].seq.length - 1]; };
/* The body, simulated second by second. o: trained (bool), age, temp (°C air), drink (bool), anxiety (0–1), betaBlock (bool), pump (skeletal muscle pump works), session. */
function body(o) {
  const tr = o.trained, HRrest = tr ? 52 : 72, HRmax = 220 - o.age, SVrest = tr ? 95 : 70, SVmax = tr ? 160 : 115, VO2max = tr ? 4.0 : 3.0, mass = 70;
  let HR = HRrest, SV = SVrest, VE = 7, CO2 = 0, fast = 0, heat = 0, plasma = 1, chem = 0; const out = [], T = sessionLen(o.session);
  for (let t = 0; t <= T; t++) {
    const ph = phaseAt(o.session, t), x = Math.max(0, ph[1]), antic = ph[1] < 0 ? 1 : 0;
    // demand for oxygen and the CO₂ it makes (lags: CO₂ builds over about 40 s, faster above the threshold)
    const VO2 = 0.3 + x * (VO2max - 0.3); CO2 += ((x > 0.75 ? 1.25 : 1) * x - CO2) / 40; chem += (Math.max(0, CO2 - 0.15) - chem) / 25;
    fast += (x - fast) / 6;                                                                 // proprioceptors respond within seconds
    heat += 0.0006 * x * (1 + Math.max(0, o.temp - 15) / 15) - heat * (o.temp < 25 ? 0.0045 : 0.0021); heat = Math.max(0, heat);   // body heat: made by exercise, lost faster in cool air
    if (!o.drink) plasma = Math.max(0.86, plasma - 0.000015 * x * (1 + Math.max(0, o.temp - 10) / 10)); else plasma = Math.min(1, plasma + 0.00002);
    // the cardiac control centre: sympathetic drive from each receptor, then baroreceptor brake; adrenaline for anticipation
    let drive = 0.12 * (antic || 0) * (0.5 + o.anxiety) + 0.55 * fast + 0.4 * chem + 0.6 * heat;
    if (o.betaBlock) drive *= 0.6;
    // venous return: muscle pump (only while moving), respiratory pump (deep breathing), plasma volume, pooling in the legs when standing still after hard work
    const pumpOn = o.pump && x > 0.05 ? 1 : 0, VR = Math.min(1, (0.55 + 0.35 * pumpOn * Math.min(1, x / 0.4) + 0.1 * Math.min(1, VE / 60)) * plasma);
    const SVtarget = SVrest + (SVmax - SVrest) * Math.min(1, 1.2 * Math.max(x, fast * 0.8)) * VR - (1 - VR) * 25;
    SV += (SVtarget - SV) / 15;
    const HRtarget = Math.min(HRmax, HRrest + (HRmax - HRrest) * Math.min(1, drive) * (1.25 - 0.25 * VR) + (SVtarget < SVrest ? (SVrest - SVtarget) * 0.4 : 0));
    HR += (HRtarget - HR) / (HRtarget > HR ? 8 : 25);                                     // rises fast, falls slowly
    const Q = HR * SV / 1000;                                                               // L/min
    // breathing: respiratory control centre driven by CO₂ (chemoreceptors) and movement (proprioceptors)
    const VEt = 7 + 140 * Math.min(1, 0.35 * fast + 0.75 * CO2) * (tr ? 0.9 : 1); VE += (VEt - VE) / 10; const f = 12 + 38 * Math.min(1, (VE - 7) / 140) ** 0.8, TV = VE / f;
    // the vascular shunt: share of cardiac output to the working muscles
    const muscle = 0.2 + 0.65 * Math.min(1, fast * 1.1), skin = 0.05 + 0.15 * Math.min(1, heat * 3), gutKid = Math.max(0.03, 0.47 - 0.42 * Math.min(1, fast * 1.1)), brain = 0.75 / Q, rest = Math.max(0, 1 - muscle - skin - gutKid - brain);
    const avO2 = VO2 / Q * 1000 / 10;                                                       // ml O₂ per 100 ml blood
    out.push({ t, ph: ph[2], x, HR, SV, Q, VE, f, TV, VO2, avO2, muscle, skin, gutKid, brain, other: rest, chem, fast, heat, plasma, BP: 90 + 25 * x * VR - (1 - VR) * 15 });
  }
  return out;
}
const at = (run, label) => run.filter(q => q.ph === label);
// steady-state heart rate at an intensity (for the batch run): 5 minutes at that intensity
function steadyHR(x, o, r) { const oo = Object.assign({}, o, { session: "custom" }); SESSIONS.custom = { name: "", seq: [[300, x, "x"]] }; const R = body(oo); return R[R.length - 1].HR + 3 * r.gauss(); }

// ---------------- The page ----------------
const DEF = { session: "steady", trained: false, age: 17, temp: 18, drink: true, anxiety: 0.5, betaBlock: false, pump: true };
const P = Object.assign({}, DEF); let run = null, t = 0, speed = 30;
const ui = K.app({
  title: "Heart, Lungs and Blood in Exercise", subject: "Physical Education",
  blurb: "How the cardiac and respiratory control centres respond to exercise: receptors, nerves and adrenaline, venous return, the vascular shunt and cardiovascular drift",
  reset: () => set({ session: P.session }),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "OCR GCSE (9–1) Physical Education (J587) 1.1 cardiovascular and respiratory systems: heart rate, stroke volume and cardiac output, breathing rate and tidal volume during exercise, redistribution of blood (vascular shunting), the short-term effects of exercise and recovery.", adv: "OCR A level Physical Education (H555) 1.1 cardiovascular system: the cardiac control centre (sympathetic and parasympathetic nervous systems; chemoreceptors, proprioceptors, baroreceptors; adrenaline and the anticipatory rise), Starling's law and venous return mechanisms (skeletal muscle pump, respiratory pump, pocket valves), the vascular shunt, a-vO₂ difference, cardiovascular drift; respiratory system: the respiratory control centre and chemical, mechanical and thermal control of breathing." } },
  missions: [
    { title: "Before the start", q: "Watch heart rate in the 30 seconds before the run begins. Why does it rise before any exercise?", hint: "The anticipatory rise: adrenaline is released as the athlete prepares, acting on the SA node. Raise the anxiety slider: the rise is bigger.", setup() { set({ session: "steady" }); } },
    { title: "Q = SV × HR", q: "Steady run. Read SV, HR and Q at rest and during the run. Which rises more?", hint: "Q rises from about 5 to 15–20 L/min. HR roughly doubles or more; SV rises too, mainly early, as venous return increases (Starling's law), then levels off.", setup() { set({ session: "steady" }); } },
    { title: "Where does the blood go?", q: "Watch the blood distribution bars from rest to the steady run. What happens to the share going to the muscles and to the gut?", hint: "The vascular shunt: arterioles and pre-capillary sphincters to the muscles dilate, those to the gut and kidneys constrict. Muscles get about 20% of Q at rest and 80% in hard exercise (of a much bigger Q).", setup() { set({ session: "steady" }); } },
    { title: "Trained against untrained", q: "Compare a trained and an untrained 17-year-old. Resting HR, HR during the run, SV and recovery?", hint: "Training enlarges the heart (bigger SV), so the same output needs fewer beats: bradycardia at rest (about 50 bpm), lower HR at the same pace, faster recovery.", setup() { set({ session: "steady", trained: true }); } },
    { lvl: "adv", title: "Which receptor?", q: "Interval session. Look at the receptor bars. Which responds first when a rep starts, and which keeps HR high afterwards?", hint: "Proprioceptors respond within seconds of movement; chemoreceptors follow as CO₂ and H⁺ build up and stay active into the recovery. The CCC sends impulses down the sympathetic accelerator nerve to the SA node.", setup() { set({ session: "interval" }); } },
    { lvl: "adv", title: "Standing still after a sprint", q: "Sprint, then stand still. What happens to stroke volume and blood pressure? Now switch off the skeletal muscle pump during the warm-up too.", hint: "Without the muscle pump, blood pools in the legs, venous return falls, SV and blood pressure drop: dizziness. An active cool-down keeps the pump working and clears lactate faster.", setup() { set({ session: "stop" }); } },
    { lvl: "adv", title: "Cardiovascular drift", q: "Steady run at 30 °C with no drinks. What happens to HR and SV during the 25 minutes at constant pace?", hint: "Sweating reduces plasma volume and more blood goes to the skin, so venous return and SV fall; HR drifts upwards to keep Q up. Drinking reduces the drift.", setup() { set({ session: "steady", temp: 30, drink: false }); } }
  ],
  batch: [
    { title: "Heart rate and intensity", question: "What steady heart rate goes with each exercise intensity?", how: "5 minutes at each intensity; untrained 17-year-old; ±3 bpm measurement scatter.", xLabel: "intensity (% of VO₂max)", yLabel: "heart rate (bpm)", xs: [0, 20, 40, 60, 80, 100], reps: 5, fit: true, run: (x, r) => steadyHR(x / 100, DEF, r), note: "Close to a straight line from resting to maximum heart rate: the basis of training zones (Karvonen)." },
    { title: "Trained and untrained hearts", question: "At the same intensity, how does a trained athlete's heart rate compare?", how: "5 minutes at each intensity; trained (bigger SV, resting HR 52) against untrained (resting 72).", xLabel: "intensity (% of VO₂max)", yLabel: "HR untrained − trained (bpm)", xs: [0, 20, 40, 60, 80], reps: 5, run: (x, r) => steadyHR(x / 100, DEF, r) - steadyHR(x / 100, Object.assign({}, DEF, { trained: true }), r), note: "About 20 bpm lower at rest and at moderate work: a bigger stroke volume means fewer beats for the same output." },
    { lvl: "adv", title: "Cardiovascular drift and temperature", question: "How much does heart rate drift upwards over 25 minutes of steady running, with no drinks, at different air temperatures?", how: "Drift = HR at the end of the steady run − HR 3 minutes in; ±2 bpm scatter.", xLabel: "air temperature (°C)", yLabel: "drift (bpm)", xs: [5, 10, 15, 20, 25, 30, 35], reps: 4, yMin: 0, run: (T, r) => { const R = body(Object.assign({}, DEF, { temp: T, drink: false })), s = at(R, "steady run"); return s[s.length - 1].HR - s[180].HR + 2 * r.gauss(); }, note: "The hotter it is, the more sweat, the smaller the plasma volume and the bigger the drift." },
    { lvl: "adv", title: "Anticipatory rise and anxiety", question: "How high does heart rate rise in the 30 s before the start?", how: "HR at the start minus resting HR; ±2 bpm.", xLabel: "anxiety (0–1)", yLabel: "anticipatory rise (bpm)", xs: [0, 0.25, 0.5, 0.75, 1], reps: 5, yMin: 0, run: (a, r) => { const R = body(Object.assign({}, DEF, { anxiety: a })); return R[90].HR - R[55].HR + 2 * r.gauss(); }, note: "Adrenaline released before the start raises HR more in anxious athletes." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "J587 1.1", text: "During exercise heart rate, stroke volume and cardiac output rise (Q = SV × HR); breathing rate and tidal volume rise (minute ventilation VE = TV × f)." },
      { lvl: "std", tag: "J587 1.1", text: "Vascular shunting: during exercise more blood goes to the working muscles and less to the digestive system, by vasodilation and vasoconstriction." },
      { lvl: "adv", tag: "H555 1.1", text: "Cardiac control centre (medulla): sympathetic nerve raises HR, parasympathetic (vagus) lowers it. Receptors: proprioceptors (movement), chemoreceptors (CO₂, pH), baroreceptors (blood pressure). Adrenaline: anticipatory rise." },
      { lvl: "adv", tag: "H555 1.1", text: "Starling's law: greater venous return stretches the ventricle more, giving a stronger contraction and bigger SV. Venous return: skeletal muscle pump, respiratory pump, pocket valves, smooth muscle in veins, gravity." },
      { lvl: "adv", tag: "H555 1.1", text: "Vascular shunt mechanism: controlled by the vasomotor centre; pre-capillary sphincters and arterioles dilate to muscles, constrict to organs. a-vO₂ difference rises in exercise as muscles extract more oxygen." },
      { lvl: "adv", tag: "H555 1.1", text: "Cardiovascular drift: in prolonged exercise in the heat, sweating reduces plasma volume, venous return and SV fall, and HR rises to maintain Q. Respiratory control centre: chemoreceptors (CO₂), proprioceptors, thermoreceptors." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: () => run ? `During the run, SV is ${run[1000].SV.toFixed(0)} ml and HR ${run[1000].HR.toFixed(0)} bpm. Calculate cardiac output in litres per minute.` : "Calculate cardiac output.", ans: () => run ? `<ul><li>Q = SV × HR</li><li>= ${run[1000].SV.toFixed(0)} × ${run[1000].HR.toFixed(0)} = ${(run[1000].SV * run[1000].HR).toFixed(0)} ml/min</li><li>= ${(run[1000].SV * run[1000].HR / 1000).toFixed(1)} L/min</li></ul>` : "" },
      { lvl: "adv", marks: 4, q: "Explain how the cardiac control centre increases heart rate at the start of exercise.", ans: "<ul><li>proprioceptors detect movement; chemoreceptors detect rising CO₂/H⁺</li><li>information goes to the cardiac control centre in the medulla</li><li>impulses via the sympathetic (accelerator) nerve to the SA node</li><li>adrenaline also stimulates the SA node; HR rises</li></ul>" },
      { lvl: "adv", marks: 3, q: "Explain why an active cool-down is better than standing still after hard exercise.", ans: "<ul><li>the skeletal muscle pump keeps venous return up</li><li>prevents blood pooling, so SV and blood pressure stay up (no dizziness)</li><li>keeps oxygen supply high to remove lactate and repay EPOC faster</li></ul>" }
    ]
  },
  notes: `<h3>The model (one second at a time)</h3>
<ul><li>Intensity follows the session (fraction of VO₂max). Proprioceptor drive follows intensity within about 6 s; CO₂ builds over about 40 s (faster above 75%), and chemoreceptor drive follows it; heat builds with intensity and air temperature.</li>
<li>Heart rate = resting + (maximum − resting) × sympathetic drive (proprioceptors, chemoreceptors, heat, adrenaline before the start), with more beats when venous return is poor; HR rises with a time constant of 8 s and falls with 25 s. Maximum HR = 220 − age.</li>
<li>Stroke volume rises from resting (70 ml untrained, 95 trained) towards maximum (115 or 160 ml) with intensity, scaled by venous return (muscle pump, respiratory pump, plasma volume). Without the muscle pump, or standing still, venous return drops.</li>
<li>Plasma volume falls with sweating if the athlete does not drink (down to 86%), causing drift. Blood shares: muscles 20% → 85%, gut and kidneys 47% → 5%, skin up with heat, brain 0.75 L/min.</li>
<li>Breathing: VE from 7 L/min towards 140 L/min, driven by CO₂ and movement; f and TV split it.</li></ul>
<h3>Simplifications</h3><ul><li>Numbers are typical, not one person's; real responses vary widely.</li><li>The beta-blocker switch simply cuts sympathetic drive by 40%: they are banned in some sports (shooting, archery) for this reason.</li></ul>`
});

// ---------------- Controls ----------------
const ctl = {}; let g = ui.group("Session");
ctl.session = K.seg(g, { value: "steady", options: Object.entries(SESSIONS).filter(([k]) => k !== "custom").map(([k, x]) => [k, x.name]), on: v => set({ session: v }) });
g = ui.group("Athlete and conditions");
ctl.trained = K.toggle(g, { label: "Trained endurance athlete", value: false, on: v => { P.trained = v; rerun(); } });
ctl.age = K.slider(g, { label: "Age", min: 12, max: 70, step: 1, value: 17, unit: "years", on: v => { P.age = v; rerun(); } });
ctl.anxiety = K.slider(g, { label: "Anxiety before the start", min: 0, max: 1, step: 0.05, value: 0.5, on: v => { P.anxiety = v; rerun(); } });
ctl.temp = K.slider(g, { label: "Air temperature", min: 0, max: 38, step: 1, value: 18, unit: "°C", on: v => { P.temp = v; rerun(); } });
ctl.drink = K.toggle(g, { label: "Drinks during the session", value: true, on: v => { P.drink = v; rerun(); } });
ctl.pump = K.toggle(g, { label: "Skeletal muscle pump working", value: true, on: v => { P.pump = v; rerun(); } });
ctl.betaBlock = K.toggle(g, { label: "Beta-blocker (cuts sympathetic drive)", value: false, on: v => { P.betaBlock = v; rerun(); } });
ctl.speed = K.slider(g, { label: "Speed", min: 5, max: 120, step: 5, value: 30, fmt: v => v + "× real time", on: v => speed = v });
K.btn(K.row(g), "↺ Start again", () => t = 0, "primary");
const read = K.readout(ui.group("Now"), [["ph", "phase"], ["hr", "heart rate"], ["sv", "stroke volume"], ["q", "cardiac output"], ["ve", "breathing VE = TV × f"], ["av", "a-vO₂ difference"]]);
function sync() { ctl.session.set(P.session); for (const k of ["age", "anxiety", "temp"]) ctl[k].set(P[k]); for (const k of ["trained", "drink", "pump", "betaBlock"]) ctl[k].set(P[k]); const adv = ui.level === "adv"; ctl.betaBlock.el.style.display = adv ? "" : "none"; ctl.pump.el.style.display = adv ? "" : "none"; }
function set(o) { Object.assign(P, DEF, o); sync(); rerun(); }
function rerun() { run = body(P); t = 0; }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h, adv = ui.level === "adv"; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); if (!run) return;
  const k = Math.min(run.length - 1, Math.floor(t)), s = run[k], beat = (t * s.HR / 60 / speed * speed) % 1;
  TX(c, `${SESSIONS[P.session].name}: ${s.ph}`, 24, 32, "#eef2f8", "left", "600 15px"); TX(c, `${Math.floor(s.t / 60)} min ${(s.t % 60).toFixed(0).padStart(2, "0")} s · intensity ${(100 * s.x).toFixed(0)}% of VO₂max`, 24, 52, "#aab6cc", "left", "12px");
  // the control centre and its inputs
  const bx = 30, by = 80; c.fillStyle = "#1a2238"; c.fillRect(bx, by, 200, 54); TX(c, "Cardiac control centre", bx + 100, by + 22, "#eef2f8", "center", "600 12.5px"); TX(c, "(medulla oblongata)", bx + 100, by + 40, "#8fa0bf", "center", "11px");
  const inputs = [["Proprioceptors (movement)", s.fast, "#5ad1ff"], ["Chemoreceptors (CO₂, H⁺)", Math.min(1, s.chem * 2), "#7ee787"], ["Thermoreceptors (heat)", Math.min(1, s.heat * 3), "#ffb454"], ["Adrenaline (anticipation)", s.ph.includes("about to start") ? 0.3 + 0.7 * P.anxiety : 0, "#ff6b81"]];
  inputs.forEach(([n, v, col], i) => { const y = by + 76 + i * 30; c.fillStyle = "#1a2238"; c.fillRect(bx, y, 200, 12); c.fillStyle = col; c.fillRect(bx, y, 200 * v, 12); TX(c, n, bx, y - 3, adv ? "#cfd8ea" : "#8fa0bf", "left", "11px"); });
  TX(c, adv ? "→ sympathetic (accelerator) nerve to the SA node" : "→ nerves to the heart", bx, by + 210, "#ffd166", "left", "11.5px");
  // the heart, beating, with SV shown as its size
  const hx = w * 0.42, hy = 150, size = 30 + 0.25 * s.SV, pulse = 1 + 0.12 * Math.max(0, Math.sin(beat * 6.283)); c.fillStyle = "#c0392b"; c.beginPath(); c.ellipse(hx, hy, size * pulse * 0.8, size * pulse, 0, 0, 6.3); c.fill();
  TX(c, `${s.HR.toFixed(0)} bpm`, hx, hy + 6, "#fff", "center", "600 16px"); TX(c, `SV ${s.SV.toFixed(0)} ml · Q ${s.Q.toFixed(1)} L/min`, hx, hy + size + 26, "#cfd8ea", "center", "12.5px");
  // lungs
  const lx = w * 0.42, ly = 330, br = 1 + 0.25 * Math.sin(t * s.f / 60 * 6.283 / speed * speed); c.fillStyle = "rgba(255,170,190,.55)"; c.beginPath(); c.ellipse(lx - 30, ly, 22 * br * (0.6 + s.TV / 3), 40, 0, 0, 6.3); c.fill(); c.beginPath(); c.ellipse(lx + 30, ly, 22 * br * (0.6 + s.TV / 3), 40, 0, 0, 6.3); c.fill();
  TX(c, `VE ${s.VE.toFixed(0)} L/min = ${s.TV.toFixed(2)} L × ${s.f.toFixed(0)} breaths`, lx, ly + 62, "#cfd8ea", "center", "12px");
  // blood distribution (the vascular shunt)
  const dx = w * 0.66, dw = w - dx - 24; TX(c, "Where the blood goes (share of Q)", dx, 90, "#eef2f8", "left", "600 12.5px");
  [["Working muscles", s.muscle, "#ff6b81"], ["Gut and kidneys", s.gutKid, "#ffb454"], ["Skin", s.skin, "#ffd166"], ["Brain", s.brain, "#c4a1ff"], ["Heart and other", s.other, "#8fa0bf"]].forEach(([n, v, col], i) => { const y = 108 + i * 40; c.fillStyle = "#1a2238"; c.fillRect(dx, y + 10, dw, 14); c.fillStyle = col; c.fillRect(dx, y + 10, dw * Math.max(0, Math.min(1, v)), 14); TX(c, `${n}: ${(100 * v).toFixed(0)}% (${(v * s.Q).toFixed(1)} L/min)`, dx, y + 6, "#cfd8ea", "left", "11.5px"); });
  if (adv) { TX(c, `muscle pump helping venous return: ${P.pump && s.x > 0.05 ? "yes" : "no"}`, dx, 320, "#aab6cc", "left", "11.5px"); TX(c, `plasma volume ${(100 * s.plasma).toFixed(0)}%`, dx, 338, "#aab6cc", "left", "11.5px"); }
  ui.hud("");
}
function charts() { if (!run) return; const k = Math.min(run.length - 1, Math.floor(t)), S = run.slice(0, k + 1).filter((q, i) => i % 5 === 0), T = run.length / 60, s = run[k];
  chA.opts.title = "Heart rate, stroke volume and output"; chA.opts.xLabel = "minutes"; chA.opts.yLabel = "bpm / ml / L·min⁻¹ ×10"; chA.draw([{ pts: S.map(q => [q.t / 60, q.HR]), color: "#ff6b81", label: "HR (bpm)" }, { pts: S.map(q => [q.t / 60, q.SV]), color: "#5ad1ff", label: "SV (ml)" }, { pts: S.map(q => [q.t / 60, 10 * q.Q]), color: "#ffd166", label: "Q × 10 (L/min)" }], { xMin: 0, xMax: T, yMin: 0, yMax: 220 });
  chB.opts.title = "Breathing and blood to muscles"; chB.opts.xLabel = "minutes"; chB.opts.yLabel = "L/min or %"; chB.draw([{ pts: S.map(q => [q.t / 60, q.VE]), color: "#7ee787", label: "VE (L/min)" }, { pts: S.map(q => [q.t / 60, 100 * q.muscle]), color: "#ff6b81", label: "% of Q to muscles" }, { pts: S.map(q => [q.t / 60, q.BP]), color: "#c4a1ff", dash: [4, 3], label: "mean blood pressure" }], { xMin: 0, xMax: T, yMin: 0 });
  read.set("ph", s.ph); read.set("hr", s.HR.toFixed(0) + " bpm"); read.set("sv", s.SV.toFixed(0) + " ml"); read.set("q", s.Q.toFixed(1) + " L/min"); read.set("ve", `${s.VE.toFixed(0)} L/min`); read.set("av", ui.level === "adv" ? s.avO2.toFixed(1) + " ml per 100 ml" : "A level");
}
let frame = 0;
ui.onLevel = () => sync();
ui.run(dt => { if (dt > 0 && run) t = Math.min(run.length - 1, t + dt * speed); }, () => { draw(); if (frame++ % 5 === 0) charts(); });
set({});
ui.tip("One session, second by second. Watch the receptors, the heart, the lungs and where the blood goes.", 7000);
