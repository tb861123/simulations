/* =====================================================================
   HEART AND CIRCULATION
   The heart is two pumps side by side. The right side sends blood to
   the lungs; the left side sends it round the rest of the body: a
   DOUBLE circulation.

   The model is a loop of eight containers of blood joined by pipes:

     left atrium -> left ventricle -> arteries -> veins ->
     right atrium -> right ventricle -> lung arteries -> lung veins -> (back)

   * Blood flows from higher pressure to lower:  flow = pressure difference / resistance
   * A valve lets blood through one way only.
   * A blood vessel is a stretchy bag:           pressure = volume / compliance
   * A heart chamber is a bag whose wall stiffens when its muscle
     contracts:                                  pressure = stiffness(t) x (volume - slack volume)

   Nothing else is put in. The pressure waves, the opening and shutting
   of the valves, blood pressure "120 over 80", and what happens in
   exercise or disease all follow from those rules.

   UNITS: millilitres, seconds, mmHg (millimetres of mercury).
   ===================================================================== */
const BASE = {
  hr: 70,            // heart rate, beats per minute
  contract: 1,       // strength of the ventricles' squeeze (1 = normal)
  rsys: 1,           // resistance of the body's small arteries (1 = normal)
  stiff: 1,          // stiffness of the large arteries (1 = young adult)
  blood: 5,          // blood volume, litres
  tone: 0,           // exercise: extra blood squeezed out of the veins by the working muscles (ml)
  ven: 1,            // exercise: how much the veins are tightened (1 = resting)
  avR: 1, mvLeak: 0, avLeak: 0, mvR: 1,     // valve faults: narrowed (resistance x) or leaky (fraction of the normal opening that stays open)
  narrow: 0          // coronary artery narrowed by this percentage
};
const CH = ["la", "lv", "sa", "sv", "ra", "rv", "pa", "pv"];   // the eight containers, in the order blood meets them

class Circ {
  constructor(P) { this.P = Object.assign({}, BASE, P); this.V = { la: 60, lv: 120, sa: 130, sv: 400, ra: 50, rv: 120, pa: 50, pv: 60 }; this.fixVolume(); this.t = 0; this.tc = 0; this.beat = { n: 0 }; this.acc = this.fresh(); this.Pr = {}; this.Q = {}; this.o2 = 1; this.pressures(0, 0); }
  fresh() { return { sys: 0, dia: 999, edv: 0, esv: 999, map: 0, la: 0, cvp: 0, pap: 0, out: 0, t: 0, lvmax: 0 }; }
  // only part of the blood stretches the vessel walls; the rest just fills them. Losing blood (or squeezing the veins) changes the stretched part.
  stressed() { return 1230 + (this.P.blood - 5) * 320 + this.P.tone; }
  fixVolume() { let s = 0; for (const k of CH) s += this.V[k]; const f = this.stressed() / s; for (const k of CH) this.V[k] *= f; }
  // how hard each chamber's muscle is squeezing at this moment of the beat (0 relaxed to 1 fully contracted)
  activation() {
    const T = 60 / this.hrNow(), t = this.tc, Ta = Math.min(0.17, 0.22 * T), pr = 0.16 * (0.45 + 0.55 * Math.min(1, T / 0.85)), Ts = 0.14 + 0.2 * T;
    const ea = t < Ta ? Math.sin(Math.PI * t / Ta) ** 2 : 0, tv = t - pr, ev = tv > 0 && tv < Ts ? Math.sin(Math.PI * tv / Ts) ** 2 : 0;
    return { ea, ev, T, pr, Ts, Ta };
  }
  hrNow() { return this.P.hr; }
  // If the coronary arteries are narrowed, the heart muscle cannot get enough oxygen when it is working hard, and its squeeze weakens.
  supply() { const demand = this.P.hr / 70 * Math.max(60, this.beat.sys || 120) / 120 * (0.6 + 0.4 * this.P.contract), reserve = 4.6 * (1 - Math.pow(this.P.narrow / 100, 2.2)); return Math.min(1, reserve / demand); }
  pressures(ea, ev) {
    const V = this.V, P = this.P, Pr = this.Pr, c = P.contract * this.o2 * this.o2;      // muscle short of oxygen cannot squeeze as hard
    Pr.lv = (0.075 + (2.6 * c - 0.075) * ev) * (V.lv - 8) + 0.0000035 * Math.max(0, V.lv - 60) ** 3;      // the last term: an over-full ventricle is hard to stretch further
    Pr.rv = (0.045 + (0.62 * Math.sqrt(c) - 0.045) * ev) * (V.rv - 8) + 0.000002 * Math.max(0, V.rv - 60) ** 3;
    Pr.la = (0.16 + 0.14 * ea) * (V.la - 4); Pr.ra = (0.11 + 0.12 * ea) * (V.ra - 4);
    Pr.sa = V.sa / (1.45 / P.stiff); Pr.sv = V.sv / (75 / P.ven); Pr.pa = V.pa / 4.2; Pr.pv = V.pv / 11;
  }
  step(dt) {
    const { ea, ev, T } = this.activation(); this.pressures(ea, ev); const V = this.V, P = this.P, Pr = this.Pr, Q = this.Q;
    const valve = (dp, R, leak) => dp > 0 ? dp / R : leak * dp / R;                // forwards freely; backwards only if the valve leaks
    Q.mv = valve(Pr.la - Pr.lv, 0.0055 * P.mvR, P.mvLeak);       // mitral (bicuspid) valve
    Q.av = valve(Pr.lv - Pr.sa, 0.011 * P.avR, P.avLeak);        // aortic valve
    Q.sys = (Pr.sa - Pr.sv) / (1.02 * P.rsys);                   // through the body's capillaries
    Q.vc = (Pr.sv - Pr.ra) / (0.03 / Math.sqrt(P.ven));                              // venae cavae into the right atrium
    Q.tv = valve(Pr.ra - Pr.rv, 0.004, 0);                       // tricuspid valve
    Q.pvv = valve(Pr.rv - Pr.pa, 0.006, 0);                      // pulmonary valve
    Q.pul = (Pr.pa - Pr.pv) / 0.105;                             // through the lungs
    Q.pven = (Pr.pv - Pr.la) / 0.02;                             // pulmonary veins into the left atrium
    V.la += (Q.pven - Q.mv) * dt; V.lv += (Q.mv - Q.av) * dt; V.sa += (Q.av - Q.sys) * dt; V.sv += (Q.sys - Q.vc) * dt;
    V.ra += (Q.vc - Q.tv) * dt; V.rv += (Q.tv - Q.pvv) * dt; V.pa += (Q.pvv - Q.pul) * dt; V.pv += (Q.pul - Q.pven) * dt;
    // keep a running record of this beat
    const a = this.acc; if (Pr.sa > a.sys) a.sys = Pr.sa; if (Pr.sa < a.dia) a.dia = Pr.sa; if (V.lv > a.edv) a.edv = V.lv; if (V.lv < a.esv) a.esv = V.lv; if (Pr.lv > a.lvmax) a.lvmax = Pr.lv;
    a.map += Pr.sa * dt; a.la += Pr.la * dt; a.cvp += Pr.ra * dt; a.pap += Pr.pa * dt; a.out += Q.sys * dt; a.t += dt;
    this.t += dt; this.tc += dt;
    if (this.tc >= T) {      // the beat is over: work out its figures and start the next
      this.tc -= T; const n = this.beat.n + 1; this.beat = { n, sys: a.sys, dia: a.dia, edv: a.edv, esv: a.esv, sv: a.edv - a.esv, ef: 100 * (a.edv - a.esv) / a.edv, map: a.map / a.t, la: a.la / a.t, cvp: a.cvp / a.t, pap: a.pap / a.t, co: a.out / a.t * 60 / 1000, fwd: a.out, hr: 60 / a.t, lvmax: a.lvmax };
      this.o2 += (this.supply() - this.o2) * 0.35; this.acc = this.fresh(); if (this.onBeat) this.onBeat(this.beat);
    }
  }
  // which part of the cardiac cycle is this?
  phase() { const Q = this.Q, { ea, ev } = this.activation(); return Q.av > 1 ? "ventricles contracting: blood ejected" : Q.mv > 1 ? (ea > 0.1 ? "atria contracting: topping up the ventricles" : "heart relaxed: ventricles filling") : ev > 0.02 && this.tc < this.activation().pr + this.activation().Ts / 2 ? "ventricles start to squeeze: all valves shut" : "ventricles relaxing: all valves shut"; }
}
// run a heart until it settles and return an average over the last few beats, with a little beat-to-beat variation
function settle(P, rnd, secs = 14) { const c = new Circ(P), beats = []; c.onBeat = b => beats.push(b); const hr0 = c.P.hr; for (let t = 0; t < secs; t += 0.0005) { c.step(0.0005); if (rnd && c.tc < 0.0005) c.P.hr = hr0 * (1 + 0.02 * rnd.gauss()); } const last = beats.slice(-4), m = k => last.reduce((s, b) => s + b[k], 0) / last.length; return { sys: m("sys"), dia: m("dia"), sv: m("sv"), co: m("co"), ef: m("ef"), la: m("la"), map: m("map"), edv: m("edv"), o2: c.o2 }; }
// what an exercise level (0 to 1) does to the body's settings
const exercise = x => ({ hr: 70 + 110 * x, contract: 1 + 0.9 * x, rsys: 1 / (1 + 2.6 * x), tone: 300 * x, ven: 1 + 2.5 * x });

// ---------------- The page ----------------
const P = Object.assign({}, BASE);
let circ = new Circ(P), rate = 1, wig = [], loop = [], ghost = null, reflex = false, sound = false, exLevel = 0, ecg = [], parts = [], audio = null, lastQ = { mv: 0, av: 0 }, flash = { s1: 0, s2: 0 };
circ.P = P;   // the page's sliders change the running heart directly
function reseed() { circ = new Circ(P); circ.P = P; hookBeat(); for (let t = 0; t < 8; t += 0.0005) circ.step(0.0005); wig = []; loop = []; ecg = []; }
function hookBeat() {
  circ.onBeat = b => {
    if (!reflex) return;
    /* The baroreceptor reflex: stretch sensors in the arteries report the blood pressure to the brain, which adjusts heart rate
       and the tightness of the small arteries to bring the average pressure back towards normal (about 100 mmHg here). */
    const err = 100 - b.map; P.hr = K.clamp(P.hr + 0.5 * err, 45, 185); P.rsys = K.clamp(P.rsys + 0.012 * err, 0.35, 2.6); ctl.hr.set(Math.round(P.hr)); ctl.rsys.set(Math.round(P.rsys * 20) / 20);
  };
}

const ui = K.app({
  title: "Heart and Circulation", subject: "Biology and medicine",
  blurb: "Two pumps, four valves and five litres of blood: pressure and flow from first principles",
  reset: () => { set({}); },
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Biology (4BI1) 2(h) Transport: the heart, double circulation, valves, heart rate in exercise, coronary heart disease. The pressure graphs and valve disease are beyond the spec.", adv: "OCR A level Biology A (H420) 3.1.2 Transport in animals (the cardiac cycle, pressure changes, the ECG); 5.1.5 for control of heart rate." } },
  missions: [
    { title: "Follow the blood", q: "Pick one red dot leaving the left ventricle and follow it all the way round. How many times does it pass through the heart before it is back where it started? Where does it change colour, and why?", hint: "Twice: this is a double circulation. Left side → body, where the blood gives up oxygen (red to blue) → right side → lungs, where it picks oxygen up again (blue to red) → left side. Passing through the heart a second time gives the blood a fresh push at high pressure after the lungs, which a single loop (as in a fish) cannot do.", setup() { set({ rate: 0.5 }); } },
    { title: "One-way doors", q: "In slow motion, watch the four valves. Which two are open while the ventricles fill? Which two while the ventricles squeeze? What would happen if a valve did not shut?", hint: "Filling: the valves between atria and ventricles (tricuspid and bicuspid/mitral) are open and the two exit valves (pulmonary and aortic) are shut. Squeezing: the other way round. Each valve is pushed open or shut by the blood itself, by whichever side has the higher pressure. The 'lub' is the atrial-side valves snapping shut; the 'dub' is the exit valves shutting. A valve that does not shut lets blood slosh backwards (try 'Leaky mitral valve').", setup() { set({ rate: 0.25 }); } },
    { title: "Left and right", q: "Compare the pressure numbers in the two ventricles when they squeeze. Which is higher, and by about how many times? Look at the thickness of the two walls.", hint: "The left ventricle reaches about 120 mmHg, the right only about 25. The left has to push blood all the way round the body through a high resistance; the right only through the lungs, which are close by and delicate (high pressure there would force fluid into the air sacs). The left wall is about three times thicker. Both pump exactly the same volume each beat: they are in series.", setup() { set({ rate: 0.5 }); } },
    { title: "Exercise", q: "Slide 'Exercise' up to a sprint. What happens to the heart rate, the volume pumped per beat and the cardiac output? Does blood pressure rise as much as the output does?", hint: "Cardiac output = heart rate × stroke volume. In hard exercise the rate can go from 70 to about 180 and each beat pumps more, because the heart squeezes harder (adrenaline) and the working muscles squeeze blood back to it. Output rises from 5 to over 20 litres a minute. Blood pressure rises only modestly, because the small arteries in the muscles widen, lowering the resistance.", setup() { set({}); } },
    { title: "A narrowed coronary artery", q: "The heart muscle has its own blood supply, the coronary arteries. Narrow them by 70% (fatty deposits). At rest, is there a problem? Now exercise. What happens to the heart's oxygen supply and its pumping?", hint: "At rest the narrowed artery still delivers enough. In exercise the heart muscle needs several times more oxygen, the artery cannot supply it, and the muscle weakens: the output falls short and the person feels chest pain (angina). If a clot blocks the artery completely, that part of the muscle dies: a heart attack. Risk factors include smoking, a diet high in saturated fat, obesity and high blood pressure.", setup() { set({ narrow: 70 }); } },
    { title: "Blood loss", q: "Reduce the blood volume from 5 to 4 litres with the reflexes off. What happens to blood pressure and the volume pumped per beat? Now switch the reflexes on. What does the body do?", hint: "With less blood returning, the ventricles fill less, so each beat pumps less (stretch the muscle less and it contracts less strongly: Starling's law) and pressure falls. Pressure sensors in the arteries detect this; the brain speeds up the heart and narrows the small arteries, bringing the pressure back up. A fast, weak pulse is a classic sign of serious bleeding.", setup() { set({}); } },
    { title: "High blood pressure", q: "Raise 'Resistance of small arteries' and 'Stiffness of large arteries' (both happen with age, salt, smoking and stress). What happens to the two blood pressure numbers? Why is this bad for the heart?", hint: "Narrower small arteries raise both numbers. Stiffer large arteries cannot stretch to absorb each pulse, so the top number (systolic) rises and the bottom one (diastolic) falls: a bigger pulse. The left ventricle must generate more pressure every beat, for life; its wall thickens and it may eventually fail, and the high pressure damages arteries in the brain, kidneys and heart.", setup() { set({}); } },
    { lvl: "adv", title: "The cardiac cycle on a graph", q: "On the left-hand graph, find the moments when the red (ventricle) line crosses the blue (atrium) line and the orange (aorta) line. What happens to the valves at each crossing? Where is the ventricle changing pressure without changing volume?", hint: "Ventricle rises above atrium: the mitral valve shuts (first heart sound). Ventricle rises above aorta: the aortic valve opens and blood is ejected. Ventricle falls below aorta: the aortic valve shuts (second sound; the small notch on the aortic line). Ventricle falls below atrium: the mitral valve opens and filling begins. Between the first two, and between the last two, both valves are shut: isovolumetric contraction and relaxation, the vertical sides of the pressure–volume loop.", setup() { set({ rate: 0.25 }); } },
    { lvl: "adv", title: "Starling's law of the heart", q: "Press 'Keep this loop', then raise the blood volume to 5.6 litres. How does the pressure–volume loop change? What happens to the stroke volume, and why does this matter for keeping the two sides of the heart in step?", hint: "More filling stretches the ventricle (the loop's right-hand side moves right), and it responds by ejecting more: the loop gets wider. This is the Frank–Starling mechanism. It automatically matches the two sides: if the right ventricle pumps a little more than the left, the extra blood arrives at the left, stretches it, and the left pumps more on the next beat.", setup() { set({}); } },
    { lvl: "adv", title: "Faulty valves", q: "Try each valve fault in turn. For a narrowed aortic valve, compare peak pressure in the ventricle with the pressure in the aorta. For a leaky mitral valve, watch the left atrium and the pressure in the lungs.", hint: "Narrowed (stenosed) aortic valve: the ventricle must generate far more pressure than reaches the aorta, so it does extra work for less output. Leaky mitral valve: part of each beat goes backwards into the atrium, so the forward output falls and pressure backs up into the lungs, causing breathlessness. In both, the pressure–volume loop changes shape in a way a cardiologist can recognise.", setup() { set({ fault: "as" }); } },
    { lvl: "adv", title: "Heart failure", q: "The ventricles have been weakened to 30% of normal strength, and the kidneys have responded to the poor circulation by retaining a litre of extra fluid. What has happened to the ejection fraction, the size of the heart and the pressure in the left atrium? Why do people with heart failure get breathless?", hint: "The weak ventricle ejects a smaller fraction of its contents (normal is 55 to 70%), so blood dams up behind it: the ventricle dilates and the pressure in the left atrium and lung veins rises. Above about 18 to 25 mmHg, fluid is forced out of the lung capillaries into the air sacs, so gas exchange suffers. With the reflexes on, the body's attempt to restore blood pressure (faster rate, tighter arteries) makes the failing heart work harder still.", setup() { set({ contract: 0.3, blood: 6 }); } }
  ],
  batch: [
    { title: "Heart rate and output", question: "Does a faster heart always pump more?", how: "Each run: a resting heart (nothing else changed) is driven at the chosen rate until it settles. Small beat-to-beat variation is included.", xLabel: "heart rate (beats per minute)", yLabel: "cardiac output (litres per minute)", xs: [40, 55, 70, 90, 110, 130, 150, 170, 190, 210], reps: 3, yMin: 0, run: (x, r) => settle({ hr: x }, r).co, note: "Output rises with rate at first, then levels off: at very high rates there is too little time between beats for the ventricles to fill. In real exercise the heart also squeezes harder and the muscles return more blood, which is why output can still rise fourfold." },
    { title: "Starling's law", question: "How does the amount of blood returning to the heart change what it pumps?", how: "Each run: the blood volume is set and the heart left to settle at 70 beats per minute with no reflexes.", xLabel: "blood volume (litres)", yLabel: "stroke volume (ml per beat)", xs: [3.6, 4, 4.4, 4.8, 5.2, 5.6, 6], reps: 3, yMin: 0, run: (x, r) => settle({ blood: x }, r).sv, note: "More blood means fuller ventricles, and a fuller ventricle ejects more. At the top the curve flattens: an over-full ventricle cannot stretch much further." },
    { title: "Resistance and blood pressure", question: "How does narrowing the small arteries change blood pressure?", how: "Each run: the resistance of the body's small arteries is set (1 = normal). The result is the average arterial pressure.", xLabel: "resistance of small arteries (× normal)", yLabel: "mean arterial pressure (mmHg)", xs: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2], reps: 3, yMin: 0, fit: true, run: (x, r) => settle({ rsys: x }, r).map, note: "Pressure = flow × resistance, so if the heart's output stayed the same the line would be straight through the origin. It curves over, because pumping against a higher pressure reduces the output a little." },
    { title: "Stiff arteries", question: "What does stiffening of the large arteries do to the pulse?", how: "Each run: arterial stiffness is set (1 = young adult; 2 to 3 is typical in old age). The result is the pulse pressure: systolic minus diastolic.", xLabel: "stiffness of large arteries (× normal)", yLabel: "pulse pressure (mmHg)", xs: [0.6, 1, 1.5, 2, 2.5, 3], reps: 3, yMin: 0, run: (x, r) => { const s = settle({ stiff: x }, r); return s.sys - s.dia; } },
    { title: "Exercise with a narrowed coronary artery", question: "How does a narrowed coronary artery limit what the heart can do?", how: "Each run: exercise at the chosen intensity with the coronary arteries 75% narrowed. Compare with the next experiment.", xLabel: "exercise intensity (%)", yLabel: "cardiac output (litres per minute)", xs: [0, 15, 30, 45, 60, 80, 100], reps: 3, yMin: 0, run: (x, r) => settle(Object.assign({ narrow: 75 }, exercise(x / 100)), r).co },
    { title: "Exercise with healthy arteries", question: "The same exercise test on a healthy heart.", how: "Each run: exercise at the chosen intensity with healthy coronary arteries.", xLabel: "exercise intensity (%)", yLabel: "cardiac output (litres per minute)", xs: [0, 15, 30, 45, 60, 80, 100], reps: 3, yMin: 0, run: (x, r) => settle(exercise(x / 100), r).co },
    { title: "A failing heart", question: "How do the ejection fraction and lung pressure change as the ventricles weaken?", how: "Each run: the strength of the ventricles' squeeze is set, with 5.8 litres of blood (a failing circulation makes the kidneys retain fluid). The result is the average pressure in the left atrium, which is also the pressure in the lung veins.", xLabel: "strength of the ventricles (× normal)", yLabel: "left atrial pressure (mmHg)", xs: [0.25, 0.35, 0.5, 0.65, 0.8, 1, 1.3], reps: 3, yMin: 0, run: (x, r) => settle({ contract: x, blood: 5.8 }, r).la, note: "Above roughly 18 to 20 mmHg fluid starts to leak into the lungs (pulmonary oedema)." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4BI1 2(h)", text: "The heart has four chambers. The right side pumps deoxygenated blood to the lungs; the left side pumps oxygenated blood to the body: a double circulation." },
      { lvl: "std", tag: "4BI1 2(h)", text: "Valves keep blood flowing one way. The left ventricle has the thickest wall because it pumps blood all round the body at high pressure." },
      { lvl: "std", tag: "4BI1 2(h)", text: "Arteries carry blood away from the heart at high pressure (thick, elastic walls); veins carry it back at low pressure (thin walls, valves); capillaries (walls one cell thick) exchange substances with the tissues." },
      { lvl: "std", tag: "4BI1 2(h)", text: "Heart rate rises in exercise and under the influence of adrenaline, supplying the muscles with more oxygen and glucose for respiration." },
      { lvl: "std", tag: "4BI1 2(h)", text: "Coronary heart disease: fatty deposits narrow the coronary arteries, reducing the supply of oxygen to the heart muscle. Risk factors include smoking, diet, obesity and high blood pressure." },
      { lvl: "adv", tag: "H420 3.1.2", text: "Cardiac cycle: atrial systole, ventricular systole, diastole. Valves open and close in response to pressure differences across them. Cardiac output = heart rate × stroke volume." },
      { lvl: "adv", tag: "H420 3.1.2", text: "The heart is myogenic. The sinoatrial node starts each beat; the wave of excitation spreads over the atria, is delayed at the atrioventricular node, then passes down the bundle of His and up through the Purkyne fibres so the ventricles contract from the apex upwards." },
      { lvl: "adv", tag: "H420 3.1.2", text: "ECG: P wave = atria depolarising; QRS complex = ventricles depolarising; T wave = ventricles repolarising." },
      { lvl: "adv", tag: "H420 5.1.5", text: "Heart rate is controlled by the cardiovascular centre in the medulla oblongata, using signals from baroreceptors (pressure) and chemoreceptors (pH / carbon dioxide), through accelerator (sympathetic) and vagus (parasympathetic) nerves." }
    ],
    questions: [
      { lvl: "std", marks: 4, q: "Describe the route taken by a red blood cell from the vena cava until it leaves the heart in the aorta.", ans: "<ul><li>Vena cava → right atrium → right ventricle</li><li>→ pulmonary artery → lungs (capillaries)</li><li>→ pulmonary vein → left atrium</li><li>→ left ventricle → aorta</li></ul>" },
      { lvl: "std", marks: 2, q: "Explain why the wall of the left ventricle is thicker than the wall of the right ventricle.", ans: "<ul><li>The left ventricle pumps blood all round the body; the right only to the lungs</li><li>so it needs more muscle to generate a higher pressure / more force</li></ul>" },
      { lvl: "std", marks: 2, q: "State the function of the valves in the heart and explain what makes them open and close.", ans: "<ul><li>They prevent the backflow of blood (keep it flowing in one direction)</li><li>They are pushed open or shut by the blood itself: higher pressure behind opens them, higher pressure in front shuts them</li></ul>" },
      { lvl: "std", marks: 3, q: () => `Your heart is beating at ${Math.round(circ.beat.hr || P.hr)} beats per minute and pumping ${Math.round(circ.beat.fwd || 70)} cm³ of blood round the body each beat. Calculate its cardiac output in litres per minute.`, ans: () => { const h = Math.round(circ.beat.hr || P.hr), s = Math.round(circ.beat.fwd || 70); return `<ul><li>cardiac output = heart rate × stroke volume</li><li>= ${h} × ${s} = ${h * s} cm³ per minute</li><li>= ${(h * s / 1000).toFixed(1)} litres per minute</li></ul>`; } },
      { lvl: "std", marks: 3, q: "Explain why heart rate increases during exercise.", ans: "<ul><li>Muscles respire faster / need more energy</li><li>so they need more oxygen and glucose delivered</li><li>and more carbon dioxide (and heat / lactic acid) removed, so blood must be pumped round faster</li></ul>" },
      { lvl: "std", marks: 4, q: "Explain how coronary heart disease can lead to a heart attack, and give two risk factors.", ans: "<ul><li>Fatty deposits build up in the walls of the coronary arteries, narrowing them</li><li>so less blood, and therefore less oxygen, reaches the heart muscle</li><li>If an artery is blocked (often by a clot), muscle cells cannot respire aerobically and die</li><li>Two risk factors from: smoking, diet high in saturated fat / salt, obesity, high blood pressure, lack of exercise, stress, inherited factors</li></ul>" },
      { lvl: "adv", marks: 4, q: "Describe the pressure changes that open and close the aortic (semilunar) valve and the atrioventricular valve on the left side of the heart during one cardiac cycle.", ans: "<ul><li>Ventricular pressure rises above atrial pressure: the atrioventricular valve closes</li><li>Ventricular pressure rises above aortic pressure: the aortic valve opens and blood is ejected</li><li>Ventricle relaxes; its pressure falls below aortic pressure: the aortic valve closes</li><li>Ventricular pressure falls below atrial pressure: the atrioventricular valve opens and the ventricle fills</li></ul>" },
      { lvl: "adv", marks: 3, q: () => `In your simulation the left ventricle holds ${Math.round(circ.beat.edv || 125)} cm³ when full and ${Math.round(circ.beat.esv || 50)} cm³ after contracting. Calculate the stroke volume and the ejection fraction.`, ans: () => { const a = Math.round(circ.beat.edv || 125), b = Math.round(circ.beat.esv || 50); return `<ul><li>stroke volume = ${a} − ${b} = ${a - b} cm³</li><li>ejection fraction = ${a - b} ÷ ${a}</li><li>= ${(100 * (a - b) / a).toFixed(0)}% (normal is about 55–70%)</li></ul>`; } },
      { lvl: "adv", marks: 4, q: "Describe how the heartbeat is initiated and coordinated.", ans: "<ul><li>The sinoatrial node (SAN) generates a wave of excitation that spreads over the atria, which contract</li><li>A band of non-conducting tissue stops it passing directly to the ventricles; it reaches the atrioventricular node (AVN), where it is delayed (allowing the ventricles to fill)</li><li>It then passes down the bundle of His in the septum</li><li>and up through the Purkyne fibres, so the ventricles contract from the apex upwards</li></ul>" },
      { lvl: "adv", marks: 3, q: "On an ECG the interval between two successive R peaks is 0.50 s. Calculate the heart rate, and state what the P wave and the QRS complex represent.", ans: "<ul><li>heart rate = 60 ÷ 0.50 = 120 beats per minute</li><li>P wave: depolarisation (excitation) of the atria</li><li>QRS complex: depolarisation of the ventricles</li></ul>" },
      { lvl: "adv", marks: 3, q: "After a sudden loss of blood, heart rate rises. Explain how this response is brought about.", ans: "<ul><li>Blood pressure falls and is detected by baroreceptors (in the aorta and carotid arteries)</li><li>Impulses pass to the cardiovascular centre in the medulla oblongata</li><li>which sends more impulses along the accelerator (sympathetic) nerve to the SAN, increasing its rate</li></ul>" }
    ]
  },
  notes: `<h3>What is being modelled</h3>
<p>A "lumped" model of the circulation of the kind used in medical research and teaching.</p>
<ul><li><b>Eight containers</b> of blood in a loop: four heart chambers, the body's arteries and veins, and the lung arteries and veins.</li>
<li><b>Flow</b> between neighbours = pressure difference ÷ resistance. Four of the connections are valves, which allow flow one way only (unless you make them leak).</li>
<li><b>Vessels</b>: pressure = volume ÷ compliance. The veins are about fifty times stretchier than the arteries, which is why most of the blood sits in them at low pressure.</li>
<li><b>Chambers</b>: pressure = stiffness × volume, where the stiffness rises and falls with each beat as the muscle contracts and relaxes. The atria contract about 0.16 s before the ventricles.</li>
<li><b>Blood pressure, stroke volume, cardiac output and ejection fraction</b> are measured from the model each beat, not set.</li>
<li><b>Reflexes</b> (when switched on) nudge the heart rate and the resistance of the small arteries after every beat to bring the mean arterial pressure back towards 100 mmHg.</li>
<li><b>Coronary narrowing</b>: the heart's oxygen demand is taken as rate × pressure; if a narrowed artery cannot meet it, the squeeze weakens.</li>
<li><b>The ECG</b> is drawn to match the timing of the model's beat; it is not calculated from electrical activity.</li></ul>
<h3>Simplifications</h3>
<ul><li>Each container has one pressure throughout: no pulse wave travelling along the arteries, no difference between head and feet, no gravity.</li>
<li>The picture is a diagram. Dots show the direction and rate of flow, not real red blood cells, and the body and lungs are each drawn as a single bed of capillaries.</li>
<li>Exercise is a single slider that changes heart rate, strength of contraction, artery resistance and the squeeze on the veins together. Breathing, temperature and blood chemistry are left out.</li>
<li>No abnormal rhythms: every beat is started on time by the pacemaker.</li>
<li>Blood is not made, lost through the kidneys or shifted into the tissues, so long-term control of blood pressure is not modelled.</li>
<li>All values are for a typical healthy adult at rest and vary a good deal between people.</li></ul>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("The body");
ctl.ex = K.slider(g, { label: "Exercise", min: 0, max: 100, step: 5, value: 0, fmt: v => v === 0 ? "resting" : v < 35 ? "walking (" + v + "%)" : v < 70 ? "jogging (" + v + "%)" : "sprinting (" + v + "%)", on: v => { exLevel = v / 100; Object.assign(P, exercise(exLevel)); ctl.hr.set(Math.round(P.hr)); ctl.contract.set(P.contract); ctl.rsys.set(Math.round(P.rsys * 20) / 20); circ.fixVolume(); } });
ctl.hr = K.slider(g, { label: "Heart rate", min: 35, max: 210, step: 1, value: 70, unit: "beats/min", on: v => { P.hr = v; } });
ctl.contract = K.slider(g, { label: "Strength of the ventricles", min: 0.2, max: 2, step: 0.05, value: 1, fmt: v => "× " + v.toFixed(2), on: v => { P.contract = v; }, tip: "Raised by adrenaline; reduced in heart failure" });
ctl.rsys = K.slider(g, { label: "Resistance of small arteries", min: 0.3, max: 2.6, step: 0.05, value: 1, fmt: v => "× " + v.toFixed(2), on: v => { P.rsys = v; } });
ctl.stiff = K.slider(g, { label: "Stiffness of large arteries", min: 0.6, max: 3, step: 0.1, value: 1, fmt: v => "× " + v.toFixed(1), on: v => { P.stiff = v; } });
ctl.blood = K.slider(g, { label: "Blood volume", min: 3.4, max: 6, step: 0.1, value: 5, unit: "litres", on: v => { P.blood = v; circ.fixVolume(); } });
ctl.reflex = K.toggle(g, { label: "Reflexes: the body defends its blood pressure", value: false, on: v => { reflex = v; } });
g = ui.group("Things that go wrong");
ctl.narrow = K.slider(g, { label: "Coronary arteries narrowed by", min: 0, max: 95, step: 5, value: 0, unit: "%", on: v => { P.narrow = v; } });
ctl.fault = K.seg(g, { label: "Valves", value: "", options: [["", "healthy"], ["as", "narrow aortic"], ["mr", "leaky mitral"], ["ar", "leaky aortic"]], on: v => fault(v) });
function fault(v) { P.avR = v === "as" ? 18 : 1; P.mvLeak = v === "mr" ? 0.008 : 0; P.avLeak = v === "ar" ? 0.008 : 0; }
g = ui.group("Watch");
ctl.rate = K.seg(g, { label: "Speed", value: 1, options: [[0.1, "⅒"], [0.25, "¼"], [0.5, "½"], [1, "real time"]], on: v => rate = v });
ctl.sound = K.toggle(g, { label: "Heart sounds (lub-dub)", value: false, on: v => { sound = v; if (v && !audio) try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } } });
let r1 = K.row(g); K.btn(r1, "Keep this loop for comparison", () => { ghost = loop.slice(); }); K.btn(r1, "Forget it", () => { ghost = null; });
const read = K.readout(g, [["hr", "heart rate"], ["bp", "blood pressure"], ["sv", "stroke volume"], ["co", "cardiac output"], ["ef", "ejection fraction"], ["la", "pressure in lung veins"], ["o2", "heart muscle's oxygen supply"], ["ph", "now"]]);
function set(o) {
  Object.assign(P, BASE, { hr: 70 }); exLevel = 0; for (const k of ["contract", "narrow", "blood", "stiff", "rsys"]) if (o[k] != null) P[k] = o[k];
  ctl.ex.set(0); ctl.hr.set(P.hr); ctl.contract.set(P.contract); ctl.rsys.set(P.rsys); ctl.stiff.set(P.stiff); ctl.blood.set(P.blood); ctl.narrow.set(P.narrow); ctl.fault.set(o.fault || ""); fault(o.fault || ""); reflex = false; ctl.reflex.set(false);
  rate = o.rate || 1; ctl.rate.set(rate); ghost = null; reseed();
}

// ---------------- The picture ----------------
/* The route of the blood, as a closed chain of points in "heart units" (the heart is drawn from the front, so its right side is on the left
   of the picture). Each stretch belongs to one of the eight containers; dots are carried along at a speed set by the flow. */
const ROUTE = {
  la: [[0.62, -0.62], [0.52, -0.38], [0.46, -0.12]],
  lv: [[0.46, -0.12], [0.44, 0.3], [0.3, 0.52], [0.17, 0.2], [0.14, -0.3]],
  sa: [[0.14, -0.3], [0.12, -0.95], [0.35, -1.3], [0.9, -1.25], [1.75, -0.9], [2.1, 0], [2.0, 1.0], [1.3, 1.5], [0.5, 1.62], [-0.5, 1.62]],
  sv: [[-0.5, 1.62], [-1.3, 1.5], [-2.0, 1.0], [-2.1, 0], [-1.7, -0.75], [-1.0, -0.8], [-0.72, -0.62]],
  ra: [[-0.72, -0.62], [-0.6, -0.36], [-0.52, -0.1]],
  rv: [[-0.52, -0.1], [-0.5, 0.25], [-0.34, 0.45], [-0.2, 0.15], [-0.16, -0.32]],
  pa: [[-0.16, -0.32], [-0.22, -0.9], [-0.7, -1.35], [-1.25, -1.72], [-0.6, -2.02], [0, -2.08], [0.6, -2.02]],
  pv: [[0.6, -2.02], [1.25, -1.72], [1.0, -1.15], [0.74, -0.85], [0.62, -0.62]]
};
const INFLOW = { la: "pven", lv: "mv", sa: "av", sv: "sys", ra: "vc", rv: "tv", pa: "pvv", pv: "pul" }, OUTFLOW = { la: "mv", lv: "av", sa: "sys", sv: "vc", ra: "tv", rv: "pvv", pa: "pul", pv: "pven" };
const pathLen = {}, cum = {}; for (const k of CH) { const p = ROUTE[k]; let L = 0; cum[k] = [0]; for (let i = 1; i < p.length; i++) { L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); cum[k].push(L); } pathLen[k] = L; }
function along(k, x, out) { const p = ROUTE[k], d = x * pathLen[k], c = cum[k]; let i = 1; while (i < c.length - 1 && c[i] < d) i++; const f = (d - c[i - 1]) / (c[i] - c[i - 1] || 1); out[0] = p[i - 1][0] + (p[i][0] - p[i - 1][0]) * f; out[1] = p[i - 1][1] + (p[i][1] - p[i - 1][1]) * f; out[2] = p[i][0] - p[i - 1][0]; out[3] = p[i][1] - p[i - 1][1]; }
function seedParts() { parts = []; const tot = CH.reduce((s, k) => s + circ.V[k], 0); for (const k of CH) { const n = Math.round(900 * circ.V[k] / tot); for (let i = 0; i < n; i++) parts.push({ k, x: Math.random(), off: (Math.random() - .5) * 2, j: Math.random() }); } }
function moveParts(dt) {
  for (const p of parts) {
    const V = Math.max(8, circ.V[p.k]), qi = circ.Q[INFLOW[p.k]], qo = circ.Q[OUTFLOW[p.k]]; p.x += (qi + (qo - qi) * p.x) / V * dt;      // blood moves faster where more is flowing and the container is emptier
    if (p.x >= 1) { p.k = CH[(CH.indexOf(p.k) + 1) % 8]; p.x = 0; } else if (p.x < 0) { p.k = CH[(CH.indexOf(p.k) + 7) % 8]; p.x = 0.999; }
  }
}
const cv = ui.canvas(() => { });
const RED = [232, 62, 62], BLUE = [72, 112, 232], mix = f => `rgb(${RED.map((r, i) => Math.round(BLUE[i] + (r - BLUE[i]) * f)).join()})`;
const oxy = (k, x) => k === "la" || k === "lv" || k === "pv" ? 1 : k === "sa" ? (x < 0.72 ? 1 : 1 - (x - 0.72) / 0.28) : k === "pa" ? (x < 0.62 ? 0 : (x - 0.62) / 0.38) : 0;
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h, S = Math.min(h / 4.62, w / 6.2), cx = w * 0.47, cy = h * 0.548, X = x => cx + x * S, Y = y => cy + y * S, q = [0, 0, 0, 0], Vv = circ.V, Pr = circ.Pr, Q = circ.Q;
  c.fillStyle = "#070a12"; c.fillRect(0, 0, w, h);
  // the lungs and the body, each drawn as one bed of fine vessels
  const bed = (x, y, rx, ry, label, col) => { c.fillStyle = col; c.beginPath(); c.ellipse(X(x), Y(y), rx * S, ry * S, 0, 0, 6.3); c.fill(); c.fillStyle = "rgba(220,228,245,.75)"; c.font = "600 12px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillText(label, X(x), Y(y) + 4); };
  bed(0, -2.05, 1.05, 0.34, "LUNGS: oxygen in, carbon dioxide out", "rgba(120,150,210,.16)"); bed(0, 1.62, 1.2, 0.3, "BODY: oxygen delivered to the tissues", "rgba(210,130,120,.14)");
  // the vessels as tubes
  c.lineCap = "round"; c.lineJoin = "round";
  for (const [k, wd] of [["sa", 0.2], ["sv", 0.26], ["pa", 0.19], ["pv", 0.2]]) { const p = ROUTE[k]; for (let i = 1; i < p.length; i++) { c.strokeStyle = mix(oxy(k, cum[k][i] / pathLen[k])).replace("rgb", "rgba").replace(")", ",.26)"); c.lineWidth = wd * S * (k === "sa" ? 0.9 + 0.25 * (Pr.sa - 80) / 40 : 1); c.beginPath(); c.moveTo(X(p[i - 1][0]), Y(p[i - 1][1])); c.lineTo(X(p[i][0]), Y(p[i][1])); c.stroke(); } }
  // the heart muscle
  const { ev, ea } = circ.activation(), sq = 1 - 0.035 * ev; c.fillStyle = `rgb(${Math.round(128 + 40 * ev)},${Math.round(46 + 8 * ev)},58)`; c.beginPath();
  c.moveTo(X(0), Y(-0.72)); c.bezierCurveTo(X(0.5), Y(-1.02), X(1.02 * sq), Y(-0.78), X(0.98 * sq), Y(-0.2)); c.bezierCurveTo(X(0.95 * sq), Y(0.45), X(0.52), Y(0.98 * sq), X(0.12), Y(1.02 * sq));
  c.bezierCurveTo(X(-0.4), Y(0.9 * sq), X(-0.95 * sq), Y(0.42), X(-1.0 * sq), Y(-0.22)); c.bezierCurveTo(X(-1.02 * sq), Y(-0.8), X(-0.5), Y(-1.02), X(0), Y(-0.72)); c.fill();
  // the four chambers: their size follows the volume of blood in them
  const chamber = (x, y, rx, ry, V, V0, o, rot) => { const f = Math.pow(Math.max(V, 5) / V0, 0.45); c.fillStyle = "#1c0a10"; c.beginPath(); c.ellipse(X(x), Y(y), rx * S * f, ry * S * f, rot, 0, 6.3); c.fill(); c.fillStyle = mix(o).replace("rgb", "rgba").replace(")", ",.33)"); c.fill(); };
  chamber(-0.6, -0.42, 0.27, 0.24, Vv.ra, 55, 0, 0); chamber(0.56, -0.44, 0.26, 0.22, Vv.la, 60, 1, 0); chamber(-0.4, 0.24, 0.3, 0.44, Vv.rv, 120, 0, 0.25); chamber(0.36, 0.24, 0.24, 0.45, Vv.lv, 120, 1, -0.2);
  // the conduction system (Advanced): pacemaker, relay and the fibres that carry the signal to the ventricles
  if (ui.level === "adv") { const a = circ.activation(), tv = circ.tc - a.pr, lit = (on) => on ? "#fff7b0" : "rgba(255,240,150,.25)"; c.lineWidth = 2; c.strokeStyle = lit(circ.tc < 0.09); c.beginPath(); c.moveTo(X(-0.78), Y(-0.7)); c.quadraticCurveTo(X(-0.4), Y(-0.75), X(-0.03), Y(-0.1)); c.stroke();
    c.strokeStyle = lit(tv > -0.03 && tv < 0.07); c.beginPath(); c.moveTo(X(-0.03), Y(-0.1)); c.lineTo(X(0.02), Y(0.72)); c.moveTo(X(0.02), Y(0.72)); c.quadraticCurveTo(X(-0.5), Y(0.8), X(-0.75), Y(0.2)); c.moveTo(X(0.02), Y(0.72)); c.quadraticCurveTo(X(0.55), Y(0.85), X(0.72), Y(0.2)); c.stroke();
    c.fillStyle = lit(circ.tc < 0.06); c.beginPath(); c.arc(X(-0.78), Y(-0.7), 5, 0, 6.3); c.fill(); c.fillStyle = lit(circ.tc > 0.06 && tv < 0.02); c.beginPath(); c.arc(X(-0.03), Y(-0.1), 5, 0, 6.3); c.fill();
    c.fillStyle = "rgba(255,247,176,.85)"; c.font = "10.5px Segoe UI,sans-serif"; c.textAlign = "right"; c.fillText("SAN", X(-0.84), Y(-0.74)); c.textAlign = "left"; c.fillText("AVN", X(0.03), Y(-0.14)); }
  // blood
  for (const p of parts) { along(p.k, p.x, q); const L = Math.hypot(q[2], q[3]) || 1, wd = (p.k === "lv" || p.k === "rv" ? 0.15 : p.k === "la" || p.k === "ra" ? 0.13 : p.k === "sv" ? 0.1 : 0.075) * S * (p.k === "sa" && p.x > 0.75 || p.k === "pa" && p.x > 0.65 ? 2.6 : 1); c.fillStyle = mix(oxy(p.k, p.x)); c.beginPath(); c.arc(X(q[0]) - q[3] / L * p.off * wd, Y(q[1]) + q[2] / L * p.off * wd, 2.3, 0, 6.3); c.fill(); }
  // the valves: two flaps that swing open with the flow
  const valve = (x, y, ang, flow, name, lx, ly) => { const open = K.clamp(flow / 60, 0, 1), wd = 0.13 * S, a = ang + Math.PI / 2; c.strokeStyle = flow < -1 ? "#ffd166" : "#f4f0e6"; c.lineWidth = 2.6; for (const s of [-1, 1]) { const hx = X(x) + Math.cos(a) * wd * s, hy = Y(y) + Math.sin(a) * wd * s, th = a + Math.PI * (s > 0 ? 1 : 0) + s * open * 1.25; c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx + Math.cos(th) * wd * 0.95, hy + Math.sin(th) * wd * 0.95); c.stroke(); }
    c.fillStyle = flow < -1 ? "#ffd166" : "rgba(220,228,245,.7)"; c.font = "10.5px Segoe UI,sans-serif"; c.textAlign = lx < 0 ? "right" : "left"; c.fillText(name + (flow < -1 ? " (leaking!)" : ""), X(x + lx), Y(y + ly)); };
  valve(-0.52, -0.1, Math.PI / 2, Q.tv, "tricuspid valve", -0.2, 0.02); valve(0.46, -0.12, Math.PI / 2, Q.mv, "bicuspid (mitral) valve", 0.2, 0.02); valve(-0.16, -0.36, -Math.PI / 2, Q.pvv, "", 0, 0); valve(0.14, -0.34, -Math.PI / 2, Q.av, "", 0, 0);
  // labels and live pressures
  const lab = (x, y, t, p, al) => { c.textAlign = al || "center"; c.fillStyle = "#f2f5fb"; c.font = "600 11.5px Segoe UI,sans-serif"; c.fillText(t, X(x), Y(y)); if (p != null) { c.fillStyle = "#ffd28a"; c.font = "11.5px Segoe UI,sans-serif"; c.fillText(Math.round(p) + " mmHg", X(x), Y(y) + 14); } };
  lab(-0.6, -0.48, "right atrium", Pr.ra); lab(0.58, -0.5, "left atrium", Pr.la); lab(-0.42, 0.2, "right ventricle", Pr.rv); lab(0.38, 0.2, "left ventricle", Pr.lv);
  lab(1.02, -1.38, "aorta", Pr.sa, "left"); lab(-1.2, -1.42, "pulmonary artery", Pr.pa, "right"); lab(1.3, -1.9, "pulmonary vein", null, "left"); lab(-2.2, -0.2, "vena cava", null, "right"); lab(2.2, -0.2, "arteries", null, "left"); lab(-2.2, 0.9, "veins", Pr.sv, "right");
  c.fillStyle = "rgba(200,210,230,.55)"; c.font = "11px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillText("Seen from the front: the heart's right side is on your left.", 12, h - 10);
  // the ECG, like a hospital monitor
  const ex = w - 262, ey = h - 84, ew = 250, eh = 72; c.fillStyle = "rgba(4,10,8,.85)"; c.strokeStyle = "#1f4a38"; c.lineWidth = 1; c.beginPath(); c.roundRect(ex, ey, ew, eh, 8); c.fill(); c.stroke(); c.strokeStyle = "#58f0a0"; c.lineWidth = 1.6; c.beginPath(); const t1 = circ.t; ecg.forEach((e, i) => { const px = ex + ew - 6 - (t1 - e[0]) / 3 * (ew - 12), py = ey + eh * 0.68 - e[1] * eh * 0.5; i ? c.lineTo(px, py) : c.moveTo(px, py); }); c.stroke();
  c.fillStyle = "#58f0a0"; c.font = "600 11px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillText("ECG" + (ui.level === "adv" ? "  (P · QRS · T)" : ""), ex + 8, ey + 14); c.textAlign = "right"; c.fillText("♥ " + Math.round(circ.beat.hr || P.hr), ex + ew - 8, ey + 14);
  if (flash.s1 > 0 || flash.s2 > 0) { c.fillStyle = `rgba(255,255,255,${Math.max(flash.s1, flash.s2)})`; c.font = "600 15px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillText(flash.s1 > flash.s2 ? "lub" : "dub", X(0), Y(1.22)); flash.s1 -= 0.03; flash.s2 -= 0.03; }
}
// a drawn ECG that keeps time with the model: P wave as the atria fire, QRS as the ventricles fire, T as they recover
function ecgValue() { const a = circ.activation(), t = circ.tc, g = (t0, w, hh) => hh * Math.exp(-(((t - t0) / w) ** 2)); return g(0.05, 0.028, 0.12) - g(a.pr - 0.018, 0.009, 0.1) + g(a.pr, 0.011, 0.9) - g(a.pr + 0.02, 0.011, 0.2) + g(a.pr + a.Ts * 0.78, 0.05, 0.24); }
function thump(freq, vol) { if (!sound || !audio) return; const o = audio.createOscillator(), gn = audio.createGain(); o.frequency.value = freq; o.type = "sine"; gn.gain.setValueAtTime(vol, audio.currentTime); gn.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.12); o.connect(gn); gn.connect(audio.destination); o.start(); o.stop(audio.currentTime + 0.13); }

const chW = K.chart(ui.dock, { title: "Pressures on the left side", xLabel: "time (s)", yLabel: "mmHg", yMin: 0 });
const chL = K.chart(ui.dock, { title: "Left ventricle: pressure against volume", xLabel: "volume of blood in the left ventricle (ml)", yLabel: "pressure (mmHg)", yMin: 0, xMin: 0 });

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => {
  let left = rate * Math.max(dt, 1 / 120); const h = 0.0005;
  while (left > 0) {
    circ.step(h); left -= h; const Q = circ.Q;
    if (lastQ.mv > 1 && Q.mv <= 1 && circ.activation().ev > 0.01) { flash.s1 = 1; thump(55, 0.5); } if (lastQ.av > 1 && Q.av <= 1) { flash.s2 = 1; thump(80, 0.4); } lastQ.mv = Q.mv; lastQ.av = Q.av;
    if (Math.round(circ.t / h) % 16 === 0) { wig.push([circ.t, circ.Pr.lv, circ.Pr.sa, circ.Pr.la]); loop.push([circ.V.lv, circ.Pr.lv]); ecg.push([circ.t, ecgValue()]); }
  }
  while (wig.length && wig[0][0] < circ.t - 3) wig.shift(); while (ecg.length && ecg[0][0] < circ.t - 3) ecg.shift(); const keep = Math.round(60 / P.hr / 0.008 * 1.15); if (loop.length > keep) loop.splice(0, loop.length - keep);
  moveParts(rate * Math.max(dt, 1 / 120));
}, () => {
  draw(); if (frame++ % 4) return;
  const b = circ.beat, t0 = circ.t - 3;
  chW.draw([{ pts: wig.map(q => [q[0] - t0, q[2]]), color: "#ffb347", label: "aorta" }, { pts: wig.map(q => [q[0] - t0, q[1]]), color: "#ff5d6c", label: "left ventricle", width: 2.2 }, { pts: wig.map(q => [q[0] - t0, q[3]]), color: "#6fb1ff", label: "left atrium" }], { xMin: 0, xMax: 3, yMax: Math.max(140, (b.lvmax || 120) * 1.1) });
  chL.draw((ghost ? [{ pts: ghost, color: "#7d8aa5", label: "kept loop", width: 1.4 }] : []).concat([{ pts: loop, color: "#ff5d6c", label: "this beat", width: 2.2 }, { pts: [[circ.V.lv, circ.Pr.lv]], type: "dots", color: "#fff", r: 4 }]), { xMax: Math.max(160, (b.edv || 120) * 1.15), yMax: Math.max(140, (b.lvmax || 120) * 1.1) });
  if (b.n) { read.set("hr", Math.round(b.hr) + " beats/min"); read.set("bp", Math.round(b.sys) + " / " + Math.round(b.dia) + " mmHg"); read.set("sv", Math.round(b.sv) + " ml" + (Math.abs(b.sv - b.fwd) > 4 ? " (" + Math.round(b.fwd) + " goes forwards)" : "")); read.set("co", b.co.toFixed(1) + " litres/min"); read.set("ef", Math.round(b.ef) + "%"); read.set("la", Math.round(b.la) + " mmHg" + (b.la > 18 ? " (fluid on the lungs)" : "")); read.set("o2", circ.o2 > 0.98 ? "enough" : Math.round(100 * circ.o2) + "% of what it needs"); }
  read.set("ph", circ.phase().split(":")[0]);
  ui.hud(b.n ? `<b style="font-size:15px">${Math.round(b.sys)} / ${Math.round(b.dia)} mmHg</b> · ♥ ${Math.round(b.hr)}<br>${Math.round(b.fwd)} ml a beat · ${b.co.toFixed(1)} litres a minute<br><span style="color:#ffd28a">${circ.phase()}</span>${circ.o2 < 0.98 ? `<br><span style="color:#ff8a70">heart muscle short of oxygen</span>` : ""}` : "");
});
hookBeat(); reseed(); seedParts();
ui.tip("Red blood carries oxygen, blue has given it up · numbers are pressures in mmHg", 8000);
