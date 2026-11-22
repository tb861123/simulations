/* =====================================================================
   NUTRITION AND ERGOGENIC AIDS
   Muscles run on carbohydrate (stored as GLYCOGEN) and fat. The harder
   you work, the larger the share from carbohydrate. Glycogen stores are
   small (about 500 g, enough for 90–120 minutes of hard running); when
   they run out the athlete "hits the wall": fat alone can only fuel a
   slower pace. Carbo-loading and carbohydrate drinks delay this.
   Sweating loses water: losing more than about 2% of body mass lowers
   performance (dehydration), and drinking far more than you sweat is
   dangerous too (hyponatraemia).
   An ERGOGENIC AID is anything that improves performance: nutritional
   (carbohydrate, creatine, caffeine, bicarbonate, nitrate), physiological
   (altitude training, blood doping) or pharmacological (EPO, steroids).
   Some are legal, some banned; all have side effects or risks.
   DRUG TESTING: even an accurate test gives many false positives when few
   athletes dope, because the rare true positives are outnumbered (Bayes).
   ===================================================================== */
const AIDS = {
  carbo: { name: "Glycogen (carbo-) loading", type: "nutritional", legal: "legal", eff: "glycogen stores up to 1.6 × normal", risk: "weight gain from stored water; digestive upset" },
  caffeine: { name: "Caffeine", type: "nutritional / pharmacological", legal: "legal (monitored by WADA)", eff: "more fat used, effort feels easier (+1.5% pace)", risk: "dehydration, insomnia, anxiety, heart palpitations" },
  creatine: { name: "Creatine monohydrate", type: "nutritional", legal: "legal", eff: "phosphocreatine stores +20% and faster recovery between sprints", risk: "weight gain (water), cramp, possible kidney strain" },
  bicarb: { name: "Sodium bicarbonate", type: "nutritional", legal: "legal", eff: "buffers lactic acid (H⁺): helps 1–7 minute events", risk: "stomach cramps, vomiting, diarrhoea" },
  nitrate: { name: "Nitrate (beetroot juice)", type: "nutritional", legal: "legal", eff: "better oxygen economy (about 2%)", risk: "stomach upset; red urine" },
  altitude: { name: "Altitude training", type: "physiological", legal: "legal", eff: "more red blood cells: VO₂max +3% for a few weeks", risk: "hard to train intensely at altitude; altitude sickness; effect fades" },
  epo: { name: "EPO / blood doping", type: "pharmacological / physiological", legal: "BANNED", eff: "many more red blood cells: VO₂max +7%", risk: "thicker blood: clots, stroke, heart attack; bans; infection (blood doping)" }
};
const AK = Object.keys(AIDS);
/* A marathon, minute by minute. o: pct (target pace as % of VO₂max), cho (carbohydrate eaten, g/h), drink (L/h), temp (°C), aids (set of keys), day (day-to-day form, ±). */
function marathon(o, r) {
  const a = o.aids, VO2max = 60 * (a.has("epo") ? 1.07 : 1) * (a.has("altitude") ? 1.03 : 1) * (1 + (o.day || 0)), mass = 65, econ = a.has("nitrate") ? 0.98 : 1;
  let gly = (380 + 90) * (a.has("carbo") ? 1.6 : 1), dist = 0, water = 0, wall = null; const out = [];
  for (let t = 0; t < 360 && dist < 42195; t++) {
    let i = o.pct / 100 * (a.has("caffeine") ? 1.015 : 1);
    if (gly <= 0) { i = Math.min(i, 0.62); if (wall === null) wall = { t, km: dist / 1000 }; }        // out of glycogen: fat alone limits the pace
    const lossPct = 100 * water / mass, hyd = 1 - 0.02 * Math.max(0, lossPct - 1.5);                    // dehydration beyond about 2% of body mass slows the runner
    const vo2 = i * VO2max * hyd, speed = Math.max(60, (vo2 - 3.5) / 0.2 / econ);                     // running economy: VO₂ = 3.5 + 0.2 × speed (m/min)
    const kcal = vo2 * mass / 1000 * 5, choShare = Math.min(1, Math.max(0.2, 0.3 + 1.8 * (i - 0.5))) * (a.has("caffeine") ? 0.9 : 1);
    gly -= kcal * choShare / 4 - o.cho / 60 * 0.8; gly = Math.min(gly, 900);                           // 4 kcal per g of carbohydrate; about 80% of eaten carbohydrate reaches the muscles in time
    const sweat = (0.25 + 0.04 * Math.max(0, o.temp - 8) + 0.5 * i) / 60; water += sweat - o.drink / 60;
    dist += speed; out.push({ t, km: dist / 1000, speed: speed * 0.06, gly: Math.max(0, gly), loss: 100 * water / mass, i });
  }
  const last = out[out.length - 1], over = last.km * 1000 - 42195, time = last.t + 1 - over / (last.speed / 0.06);
  return { out, wall, time, loss: last.loss, hypo: o.drink > 0 && water < -1.5 };
}
// an 800 m: a base time scaled by each aid's effect and by dehydration
function eight(o, r) { const a = o.aids; let t = 120 * (1 + (o.day || 0)); if (a.has("epo")) t *= 0.975; if (a.has("altitude")) t *= 0.99; if (a.has("bicarb")) t *= 0.985; if (a.has("caffeine")) t *= 0.99; if (a.has("nitrate")) t *= 0.992; if (a.has("creatine")) t *= 0.997; return t; }
// ten 30 m sprints with a rest between: phosphocreatine (PC) falls in each sprint and is half-restored in about 30 s
function sprints(o, rest = 30) { const a = o.aids, store = a.has("creatine") ? 1.2 : 1, tau = a.has("creatine") ? 26 : 32; let pc = store; const out = [];
  for (let k = 1; k <= 10; k++) { const fatigue = Math.max(0, 1 - pc / store) * 0.09 + (k - 1) * (a.has("bicarb") ? 0.003 : 0.005); out.push([k, 4.2 * (1 + fatigue) * (1 + (o.day || 0))]); pc -= 0.55 * store; pc = Math.max(0, pc); pc = store - (store - pc) * Math.exp(-rest / tau); } return out; }
// drug testing: N athletes, a share dope; the test catches dopers with probability sens and wrongly flags clean athletes with probability 1 − spec
function testing(o, r) { const N = 1000, dope = [], pos = []; for (let i = 0; i < N; i++) { const d = r() < o.prev; dope.push(d); pos.push(d ? r() < o.sens : r() > o.spec); } const tp = pos.filter((p, i) => p && dope[i]).length, fp = pos.filter((p, i) => p && !dope[i]).length; return { dope, pos, tp, fp, ppv: tp + fp ? tp / (tp + fp) : NaN }; }
const ppvTheory = (p, se, sp) => p * se / (p * se + (1 - p) * (1 - sp));

// ---------------- The page ----------------
const DEF = { view: "race", event: "marathon", pct: 80, cho: 0, drink: 0.4, temp: 15, aids: [], prev: 0.02, sens: 0.9, spec: 0.995 };
const P = Object.assign({}, DEF, { aids: [] }); let res = null, cmp = null, tst = null, k = 0, seed = 1;
const ui = K.app({
  title: "Nutrition and Ergogenic Aids", subject: "Physical Education",
  blurb: "Glycogen and hitting the wall, sweat and dehydration, legal and banned performance aids, and why drug tests give false positives",
  reset: () => set({ view: P.view }),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "OCR GCSE (9–1) Physical Education (J587) 2.3 Health, fitness and well-being: a balanced diet, the role of carbohydrates, fats, proteins, vitamins, minerals, fibre and water; carbohydrate loading and hydration for performance; and 2.2 performance-enhancing drugs (types, effects, risks) in sport.", adv: "OCR A level Physical Education (H555) 1.2 Exercise physiology: diet and nutrition and their effects on physical activity (glycogen loading, hydration), ergogenic aids (pharmacological: EPO, anabolic steroids; physiological: blood doping, altitude training, cooling; nutritional: creatine, caffeine, sodium bicarbonate, nitrate, glycogen loading) with their benefits, risks and legality; and 3.2 contemporary issues: ethics of drug use and drug testing." } },
  missions: [
    { title: "Hitting the wall", q: "Run the marathon at 80% of VO₂max with no carbohydrate during the race. When do the glycogen stores run out? What happens to the pace?", hint: "Around 30–33 km the stores run out: the runner 'hits the wall' and can only keep a pace fat can fuel, so the last few km are much slower. Starting a little slower would make the glycogen last.", setup() { set({ view: "race", event: "marathon", pct: 80, cho: 0 }); } },
    { title: "Carbo-loading and gels", q: "Now switch on glycogen loading, then add 60 g of carbohydrate an hour. Does the runner avoid the wall?", hint: "Loading raises the stores by up to 60%, and carbohydrate during the race tops them up: the wall moves later or disappears, and the finish time improves by several minutes.", setup() { set({ view: "race", event: "marathon", pct: 80, cho: 0, aids: ["carbo"] }); } },
    { title: "Drink enough, not too much", q: "Race at 25 °C drinking nothing, then drinking 0.8 L an hour. What happens to body mass lost and the finish time? What if you drink 1.5 L an hour?", hint: "Losing more than about 2% of body mass slows the runner. Drinking to roughly match sweat prevents it. Drinking far more than you sweat dilutes the blood's sodium (hyponatraemia), which can be fatal.", setup() { set({ view: "race", event: "marathon", temp: 25, drink: 0 }); } },
    { title: "Which aid for which event?", q: "Try each aid in the 800 m, then in the repeated sprints. Which help most in each event, and which are legal?", hint: "800 m: bicarbonate buffers the acid from anaerobic glycolysis; EPO raises oxygen delivery (but is banned and dangerous). Repeated sprints: creatine raises PC stores and speeds recovery between sprints. Match the aid to the energy system the event uses.", setup() { set({ view: "race", event: "800" }); } },
    { lvl: "adv", title: "False positives", q: "Drug testing. 2% of 1000 athletes dope. The test catches 90% of dopers and wrongly flags 0.5% of clean athletes. Of all positive tests, what share are real dopers?", hint: "About 18 true positives and 5 false positives: about 4 in 5 positives are real. If only 0.5% dope, false positives can outnumber true ones. That is why a B sample, a biological passport and very specific tests matter.", setup() { set({ view: "test", prev: 0.02 }); } },
    { lvl: "adv", title: "EPO: the cost", q: "Add EPO to the marathon. How much time does it save? Read its risks. Why is it banned?", hint: "About 7% more VO₂max can save several minutes. But thicker blood raises the risk of clots, strokes and heart attacks, especially when dehydrated; it is unfair and against the spirit of sport.", setup() { set({ view: "race", event: "marathon", aids: ["epo"] }); } }
  ],
  batch: [
    { title: "Carbohydrate during the marathon", question: "How does eating carbohydrate during the race change the finish time?", how: "80% of VO₂max, no loading, 15 °C, drinking 0.4 L/h; day-to-day form ±1%.", xLabel: "carbohydrate eaten (g per hour)", yLabel: "finish time (min)", xs: [0, 15, 30, 45, 60, 90], reps: 6, theory: c => marathon(Object.assign({}, DEF, { cho: c, aids: new Set() })).time, theoryLabel: "average day", run: (c, r) => marathon(Object.assign({}, DEF, { cho: c, aids: new Set(), day: 0.01 * r.gauss() })).time, note: "Gels delay the wall; once it is avoided, extra carbohydrate gives little more." },
    { title: "Dehydration and pace", question: "How much slower does a runner go at each level of dehydration?", how: "Speed as % of the fully hydrated speed at the same effort; individuals vary ±0.5%.", xLabel: "body mass lost (%)", yLabel: "speed (% of hydrated)", xs: [0, 1, 2, 3, 4, 5], reps: 6, theory: l => 100 * (1 - 0.02 * Math.max(0, l - 1.5)), theoryLabel: "model", run: (l, r) => 100 * (1 - 0.02 * Math.max(0, l - 1.5)) + 0.5 * r.gauss(), note: "Little effect below about 2%, then about 2% slower for each extra 1% lost." },
    { title: "Creatine and repeated sprints", question: "How much do ten 30 m sprints slow down, with and without creatine, for different rests?", how: "Percentage by which sprint 10 is slower than sprint 1 (difference without − with creatine); ±0.3% noise.", xLabel: "rest between sprints (s)", yLabel: "extra slowing without creatine (%)", xs: [10, 20, 30, 45, 60], reps: 5, run: (rest, r) => { const a = sprints({ aids: new Set() }, rest), b = sprints({ aids: new Set(["creatine"]) }, rest); return 100 * (a[9][1] / a[0][1] - b[9][1] / b[0][1]) + 0.3 * r.gauss(); }, note: "Creatine helps most with short rests, when PC has least time to recover." },
    { lvl: "adv", title: "How trustworthy is a positive test?", question: "What share of positive tests are real dopers, for each share of athletes doping?", how: "1000 athletes; sensitivity 90%, specificity 99.5%.", xLabel: "athletes doping (%)", yLabel: "positives that are real (%)", xs: [0.5, 1, 2, 5, 10, 20], reps: 10, yMin: 0, yMax: 100, theory: p => 100 * ppvTheory(p / 100, 0.9, 0.995), theoryLabel: "Bayes' theorem", run: (p, r) => 100 * testing({ prev: p / 100, sens: 0.9, spec: 0.995 }, r).ppv, note: "When doping is rare, a large share of positives are false. Re-testing the B sample and using several independent tests protects clean athletes." },
    { title: "200 marathon runners, no fuel plan", question: "What finish times do runners get at 82% of VO₂max with no loading or gels?", how: "Day-to-day form ±2%.", yLabel: "finish time (min)", reps: 200, bins: 20, run: (x, r) => marathon(Object.assign({}, DEF, { pct: 82, aids: new Set(), day: 0.02 * r.gauss() })).time, note: "A long tail: those whose glycogen runs out early lose a lot of time in the last kilometres." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "J587 2.3", text: "A balanced diet: carbohydrates (main energy for exercise), fats (energy at low intensity), protein (growth and repair), vitamins and minerals, fibre, water. Athletes need more carbohydrate and water." },
      { lvl: "std", tag: "J587 2.3", text: "Carbohydrate loading increases glycogen stores before endurance events. Dehydration (losing over about 2% of body mass) reduces performance; drink before, during and after." },
      { lvl: "std", tag: "J587 2.2", text: "Performance-enhancing drugs (PEDs): stimulants, narcotic analgesics, anabolic agents, peptide hormones (EPO), diuretics, beta-blockers. Each has benefits for some events and serious health risks; they are banned." },
      { lvl: "adv", tag: "H555 1.2", text: "Glycogen loading: deplete then high-carbohydrate diet with tapered training (modified Sherman). Hydration: sweat rate rises with heat and intensity; replace losses, with electrolytes in long events." },
      { lvl: "adv", tag: "H555 1.2", text: "Nutritional aids: creatine (PC stores, repeated sprints), caffeine (fat use, alertness), sodium bicarbonate (buffering, 1–7 minute events), nitrate (oxygen economy). Physiological: altitude training (legal), blood doping (banned). Pharmacological: EPO, anabolic steroids (banned)." },
      { lvl: "adv", tag: "H555 3.2", text: "Drug testing: WADA, whereabouts, the biological passport. A positive test's reliability depends on how common doping is (base rate) as well as the test's accuracy." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: "Explain why a marathon runner might 'hit the wall' and how diet can prevent it.", ans: "<ul><li>glycogen stores run out (after about 90–120 minutes of hard running)</li><li>fat alone cannot fuel the same pace, so the runner slows sharply</li><li>carbohydrate loading before, and carbohydrate drinks or gels during the race</li></ul>" },
      { lvl: "adv", marks: 4, q: "Evaluate the use of creatine supplements by a games player.", ans: "<ul><li>benefit: more phosphocreatine; faster recovery between repeated sprints; more training intensity</li><li>legal and widely used</li><li>but: weight gain (water) may slow endurance; cramp; possible kidney strain</li><li>little benefit for aerobic parts of the game</li></ul>" },
      { lvl: "adv", marks: 3, q: () => `In a squad of 1000 with ${(P.prev * 100).toFixed(1)}% doping, a test with 90% sensitivity and 99.5% specificity is used. Estimate the share of positives that are real.`, ans: () => { const tp = 1000 * P.prev * 0.9, fp = 1000 * (1 - P.prev) * 0.005; return `<ul><li>true positives ≈ ${tp.toFixed(1)}</li><li>false positives ≈ ${fp.toFixed(1)}</li><li>share real = ${tp.toFixed(1)} ÷ ${(tp + fp).toFixed(1)} = ${(100 * tp / (tp + fp)).toFixed(0)}%</li></ul>`; } }
    ]
  },
  notes: `<h3>The models</h3>
<ul><li><b>Marathon</b> (a 65 kg runner, VO₂max 60 ml/kg/min): speed from running economy, VO₂ = 3.5 + 0.2 × speed (m/min). Energy = VO₂ × 5 kcal per litre; the carbohydrate share rises with intensity (30% at 50% VO₂max, 84% at 80%, 100% above 89%). Glycogen starts at 470 g (× 1.6 when loaded); 80% of carbohydrate eaten during the race is available. With no glycogen the pace is capped at 62% of VO₂max. Sweat 0.25 L/h + 0.04 L/h per °C above 8 °C + 0.5 L/h × intensity; over 1.5% body mass lost, speed falls 2% per extra 1%.</li>
<li><b>Aids:</b> EPO +7% VO₂max, altitude +3%, nitrate −2% oxygen cost, caffeine +1.5% sustainable intensity and 10% more fat use, creatine +20% PC stores and faster resynthesis, bicarbonate slower acid fatigue. These are typical reported sizes, not guarantees; individuals vary.</li>
<li><b>800 m:</b> a base time of 2:00 scaled by each aid. <b>Sprints:</b> each 30 m sprint uses 55% of the PC store; PC recovers exponentially (half in about 22–25 s).</li>
<li><b>Testing:</b> each doper tests positive with probability = sensitivity; each clean athlete with probability 1 − specificity.</li></ul>
<h3>Simplifications</h3><ul><li>No pacing strategy, hills, wind or heat illness; glycogen is a single store.</li><li>Effects of aids are simply multiplied together; real interactions are complex.</li></ul>`
});

// ---------------- Controls ----------------
const ctl = {}; let g = ui.group("View");
ctl.view = K.seg(g, { value: "race", options: [["race", "🏃 Race"], ["test", "🧪 Drug testing (A level)"]], on: v => set({ view: v }) });
const gR = g = ui.group("The race");
ctl.event = K.seg(g, { label: "Event", value: "marathon", options: [["marathon", "Marathon"], ["800", "800 m"], ["sprints", "10 × 30 m sprints"]], on: v => { P.event = v; rerun(); } });
ctl.pct = K.slider(g, { label: "Target pace", min: 60, max: 90, step: 1, value: 80, fmt: v => v + "% of VO₂max", on: v => { P.pct = v; rerun(); } });
ctl.cho = K.slider(g, { label: "Carbohydrate during the race", min: 0, max: 90, step: 5, value: 0, unit: "g/h", on: v => { P.cho = v; rerun(); } });
ctl.drink = K.slider(g, { label: "Drinking", min: 0, max: 1.5, step: 0.1, value: 0.4, fmt: v => v.toFixed(1) + " L/h", on: v => { P.drink = v; rerun(); } });
ctl.temp = K.slider(g, { label: "Air temperature", min: 0, max: 32, step: 1, value: 15, unit: "°C", on: v => { P.temp = v; rerun(); } });
const gA = ui.group("Ergogenic aids (tick to use)"); const tg = {}; for (const kk of AK) tg[kk] = K.toggle(gA, { label: `${AIDS[kk].name} ${AIDS[kk].legal === "BANNED" ? "⛔" : ""}`, value: false, on: v => { const s = new Set(P.aids); v ? s.add(kk) : s.delete(kk); P.aids = [...s]; rerun(); } });
const gT = g = ui.group("Testing");
ctl.prev = K.slider(g, { label: "Athletes doping", min: 0.002, max: 0.2, step: 0.002, value: 0.02, fmt: v => (v * 100).toFixed(1) + "%", on: v => { P.prev = v; rerun(); } });
ctl.sens = K.slider(g, { label: "Sensitivity (dopers caught)", min: 0.5, max: 0.99, step: 0.01, value: 0.9, fmt: v => (v * 100).toFixed(0) + "%", on: v => { P.sens = v; rerun(); } });
ctl.spec = K.slider(g, { label: "Specificity (clean athletes cleared)", min: 0.95, max: 0.999, step: 0.001, value: 0.995, fmt: v => (v * 100).toFixed(1) + "%", on: v => { P.spec = v; rerun(); } });
K.btn(K.row(ui.group("")), "↺ Run again", () => { seed++; rerun(); }, "primary");
const read = K.readout(ui.group("Results"), [["a", "–"], ["b", "–"], ["c", "–"], ["d", "–"]]);
const label = (i, s) => { read.el.children[i].firstElementChild.textContent = s; };
function sync() { ctl.view.set(P.view); ctl.event.set(P.event); for (const q of ["pct", "cho", "drink", "temp", "prev", "sens", "spec"]) ctl[q].set(P[q]); for (const kk of AK) tg[kk].set(P.aids.includes(kk)); const adv = ui.level === "adv"; gR.style.display = P.view === "race" ? "" : "none"; gA.style.display = P.view === "race" ? "" : "none"; gT.style.display = P.view === "test" ? "" : "none"; ctl.view.el.querySelectorAll("button")[1].style.display = adv ? "" : "none";
  for (const q of ["pct", "cho", "drink", "temp"]) ctl[q].el.style.display = P.event === "marathon" ? "" : "none"; }
function set(o) { Object.assign(P, DEF, { aids: [] }, o); if (ui.level !== "adv") P.view = "race"; sync(); rerun(); }
function rerun() { const o = Object.assign({}, P, { aids: new Set(P.aids) }), none = Object.assign({}, P, { aids: new Set() }); k = 0;
  if (P.event === "marathon") { res = marathon(o); cmp = marathon(none); } else if (P.event === "800") { res = { time: eight(o) }; cmp = { time: eight(none) }; } else { res = { reps: sprints(o) }; cmp = { reps: sprints(none) }; }
  tst = testing(P, K.rng(seed * 997)); }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function WRAP(c, s, x, y, maxW, lh = 15, col = "#8fa0bf", f = "11.5px") { c.font = f + " Segoe UI,sans-serif"; let line = ""; for (const wd of s.split(" ")) { if (c.measureText(line + wd).width > maxW && line) { TX(c, line, x, y, col, "left", f); y += lh; line = ""; } line += wd + " "; } TX(c, line, x, y, col, "left", f); return y + lh; }
const fmtT = m => `${Math.floor(m / 60)}:${String(Math.floor(m % 60)).padStart(2, "0")}:${String(Math.round((m % 1) * 60)).padStart(2, "0")}`;
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h, adv = ui.level === "adv"; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); if (!res) return;
  if (P.view === "race") {
    let tx = w * 0.56, ty = 40; TX(c, "Aids in use", tx, ty, "#eef2f8", "left", "600 13px"); ty += 20; if (!P.aids.length) { TX(c, "none", tx, ty, "#8fa0bf", "left", "12px"); ty += 18; }
    for (const kk of P.aids) { const A = AIDS[kk]; TX(c, `${A.name}: ${A.legal}`, tx, ty, A.legal === "BANNED" ? "#ff6b81" : "#7ee787", "left", "600 12px"); ty += 15; ty = WRAP(c, `${A.type}. Effect: ${A.eff}. Risks: ${A.risk}.`, tx + 10, ty, w - tx - 26, 14, "#aab6cc", "11px") + 4; }
    if (P.event === "marathon") { const R = res.out, i = Math.min(R.length - 1, Math.floor(k)), s = R[i];
      TX(c, `Marathon: ${s.km.toFixed(1)} km after ${s.t} min`, 24, 34, "#eef2f8", "left", "600 15px");
      // the course as a line with the runner, and the glycogen and water tanks
      const x0 = 30, x1 = w * 0.5, y = 100; c.strokeStyle = "#3a4a6b"; c.lineWidth = 6; c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); c.lineWidth = 1; for (let km = 0; km <= 42; km += 5) TX(c, km + "", x0 + (x1 - x0) * km / 42.195, y + 20, "#8fa0bf", "center", "10.5px");
      if (res.wall) { const xw = x0 + (x1 - x0) * res.wall.km / 42.195; c.fillStyle = "#ff6b81"; c.fillRect(xw - 2, y - 16, 4, 32); TX(c, "the wall", xw, y - 22, "#ff6b81", "center", "600 11px"); }
      const xr = x0 + (x1 - x0) * Math.min(1, s.km / 42.195); c.fillStyle = "#ffd166"; c.beginPath(); c.arc(xr, y, 8, 0, 6.3); c.fill();
      const tank = (x, frac, lab, col, v) => { c.strokeStyle = "#8fa0bf"; c.strokeRect(x, 160, 60, 130); c.fillStyle = col; c.fillRect(x, 160 + 130 * (1 - frac), 60, 130 * frac); TX(c, lab, x + 30, 308, "#cfd8ea", "center", "11.5px"); TX(c, v, x + 30, 324, "#aab6cc", "center", "11px"); };
      tank(40, s.gly / 900, "glycogen", "#ffb454", s.gly.toFixed(0) + " g"); tank(140, Math.max(0, 1 - s.loss / 6), "body water", s.loss > 2 ? "#ff6b81" : "#5ad1ff", `${s.loss.toFixed(1)}% lost`);
      TX(c, `pace ${s.speed.toFixed(1)} km/h`, 240, 190, "#eef2f8", "left", "600 14px"); TX(c, s.i < P.pct / 100 * 0.99 ? "slowed: no glycogen left" : "at target effort", 240, 210, s.i < P.pct / 100 * 0.99 ? "#ff6b81" : "#7ee787", "left", "12px");
      if (i >= R.length - 1) { TX(c, `Finish: ${fmtT(res.time)}`, 240, 250, "#ffd166", "left", "600 16px"); TX(c, `without aids: ${fmtT(cmp.time)}`, 240, 270, "#aab6cc", "left", "12px"); if (res.hypo) TX(c, "⚠ drinking far more than sweat: risk of hyponatraemia", 24, h - 20, "#ff6b81", "left", "600 12px"); }
    } else if (P.event === "800") { TX(c, "800 m", 24, 34, "#eef2f8", "left", "600 15px"); TX(c, `Time: ${(res.time / 60 | 0)}:${(res.time % 60).toFixed(2).padStart(5, "0")}`, 24, 80, "#ffd166", "left", "600 22px"); TX(c, `without aids: 2:00.00 · ${(100 * (1 - res.time / cmp.time)).toFixed(1)}% faster`, 24, 106, "#aab6cc", "left", "12.5px");
      WRAP(c, "The 800 m draws on aerobic respiration and anaerobic glycolysis: lactic acid (H⁺) builds up. Aids that buffer acid (bicarbonate) or carry more oxygen (EPO, altitude) help most.", 24, 140, w * 0.48, 17, "#cfd8ea", "12.5px");
    } else { const R = res.reps; TX(c, "Ten 30 m sprints, 30 s rest", 24, 34, "#eef2f8", "left", "600 15px"); R.forEach(([n, tt], j) => { const y = 60 + j * 26; c.fillStyle = "#5ad1ff"; c.fillRect(110, y, (tt - 3.8) * 300, 16); TX(c, `sprint ${n}: ${tt.toFixed(2)} s`, 24, y + 13, "#cfd8ea", "left", "12px"); });
      WRAP(c, "Each sprint uses phosphocreatine (ATP–PC system); 30 s of rest restores only part of it, so later sprints slow. Creatine raises the store and speeds recovery.", 24, 340, w * 0.48, 17, "#cfd8ea", "12.5px"); }
  } else { const T = tst; TX(c, "1000 athletes tested", 24, 34, "#eef2f8", "left", "600 15px");
    const cols = 40, sz = Math.min(14, (w * 0.55) / cols); T.dope.forEach((d, i) => { const x = 24 + (i % cols) * sz, y = 56 + Math.floor(i / cols) * sz; c.fillStyle = T.pos[i] ? (d ? "#ff6b81" : "#ffd166") : (d ? "#7a2a3a" : "#2a3550"); c.fillRect(x, y, sz - 2, sz - 2); });
    let tx = 24 + cols * sz + 20, ty = 70; [["#ff6b81", "doping, tested positive"], ["#7a2a3a", "doping, missed"], ["#ffd166", "clean, but tested positive (false positive)"], ["#2a3550", "clean, negative"]].forEach(([col, s]) => { c.fillStyle = col; c.fillRect(tx, ty - 10, 12, 12); TX(c, s, tx + 18, ty, "#cfd8ea", "left", "12px"); ty += 20; });
    ty += 10; TX(c, `${T.tp} true positives, ${T.fp} false positives`, tx, ty, "#eef2f8", "left", "600 13px"); ty += 22; TX(c, `Share of positives that are real: ${isFinite(T.ppv) ? (100 * T.ppv).toFixed(0) + "%" : "–"}`, tx, ty, "#ffd166", "left", "600 14px"); ty += 26;
    WRAP(c, "When doping is rare, even a very accurate test flags almost as many clean athletes as cheats. Confirming with a B sample and the biological passport protects the innocent.", tx, ty, w - tx - 16, 16, "#aab6cc", "12px"); }
  ui.hud("");
}
function charts() { if (!res) return; chA.opts.xFmt = null; chB.opts.xFmt = null;
  if (P.view === "race" && P.event === "marathon") { const R = res.out, i = Math.min(R.length - 1, Math.floor(k)), S = R.slice(0, i + 1);
    chA.opts.title = "Pace and glycogen"; chA.opts.xLabel = "km"; chA.opts.yLabel = "km/h, or g ÷ 50"; chA.draw([{ pts: S.map(q => [q.km, q.speed]), color: "#ffd166", label: "pace (km/h)" }, { pts: S.map(q => [q.km, q.gly / 50]), color: "#ffb454", dash: [4, 3], label: "glycogen ÷ 50 (g)" }, { pts: cmp.out.map(q => [q.km, q.speed]), color: "rgba(255,255,255,.3)", label: "no aids" }], { xMin: 0, xMax: 42.2, yMin: 0 });
    chB.opts.title = "Body mass lost by sweating"; chB.opts.xLabel = "km"; chB.opts.yLabel = "% of body mass"; chB.draw([{ pts: S.map(q => [q.km, q.loss]), color: "#5ad1ff", label: "lost" }], { xMin: 0, xMax: 42.2, hlines: [{ y: 2, color: "rgba(255,107,129,.6)", label: "2%: performance falls" }] });
    label(0, "finish time"); label(1, "without aids"); label(2, "hit the wall"); label(3, "body mass lost"); read.set("a", fmtT(res.time)); read.set("b", fmtT(cmp.time)); read.set("c", res.wall ? `${res.wall.km.toFixed(1)} km` : "no"); read.set("d", res.loss.toFixed(1) + "%");
  } else if (P.view === "race" && P.event === "800") { const all = AK.map(kk => [kk, eight({ aids: new Set([kk]) })]); chA.opts.title = "Each aid alone: 800 m time"; chA.opts.xLabel = ""; chA.opts.yLabel = "s"; chA.opts.xFmt = v => Math.abs(v - Math.round(v)) < 0.01 ? (all[Math.round(v)] || [""])[0] : ""; chA.draw([{ pts: all.map((q, n) => [n, q[1]]), type: "bars", w: 0.6, color: "#c4a1ff", label: "" }], { xMin: -0.6, xMax: AK.length - 0.4, yMin: 115, yMax: 121 });
    chB.opts.title = "–"; chB.draw([], {}); label(0, "time"); label(1, "without aids"); label(2, "improvement"); label(3, "–"); read.set("a", res.time.toFixed(2) + " s"); read.set("b", "120.00 s"); read.set("c", (100 * (1 - res.time / cmp.time)).toFixed(1) + "%"); read.set("d", "–");
  } else if (P.view === "race") { chA.opts.title = "Sprint times"; chA.opts.xLabel = "sprint"; chA.opts.yLabel = "s"; chA.draw([{ pts: res.reps, color: "#5ad1ff", label: "with these aids" }, { pts: cmp.reps, color: "rgba(255,255,255,.4)", dash: [4, 3], label: "no aids" }], { xMin: 1, xMax: 10 });
    const rs = [10, 20, 30, 45, 60, 90]; chB.opts.title = "Slowing by sprint 10 against rest"; chB.opts.xLabel = "rest (s)"; chB.opts.yLabel = "% slower"; chB.draw([{ pts: rs.map(x => { const a = sprints({ aids: new Set(P.aids) }, x); return [x, 100 * (a[9][1] / a[0][1] - 1)]; }), color: "#7ee787", label: "these aids" }, { pts: rs.map(x => { const a = sprints({ aids: new Set() }, x); return [x, 100 * (a[9][1] / a[0][1] - 1)]; }), color: "rgba(255,255,255,.4)", dash: [4, 3], label: "no aids" }], { yMin: 0 });
    label(0, "sprint 1"); label(1, "sprint 10"); label(2, "slowing"); label(3, "total"); read.set("a", res.reps[0][1].toFixed(2) + " s"); read.set("b", res.reps[9][1].toFixed(2) + " s"); read.set("c", (100 * (res.reps[9][1] / res.reps[0][1] - 1)).toFixed(1) + "%"); read.set("d", res.reps.reduce((s, q) => s + q[1], 0).toFixed(2) + " s");
  } else { const ps = []; for (let p = 0.002; p <= 0.2; p += 0.002) ps.push([100 * p, 100 * ppvTheory(p, P.sens, P.spec)]);
    chA.opts.title = "Share of positives that are real"; chA.opts.xLabel = "athletes doping (%)"; chA.opts.yLabel = "%"; chA.draw([{ pts: ps, color: "#ffd166", label: "Bayes" }, { pts: [[100 * P.prev, 100 * tst.ppv]], type: "dots", r: 6, color: "#fff", label: "this squad" }], { xMin: 0, xMax: 20, yMin: 0, yMax: 100 });
    chB.opts.title = "Positive tests"; chB.opts.xLabel = ""; chB.opts.yLabel = "athletes"; chB.opts.xFmt = v => Math.abs(v - Math.round(v)) < 0.01 ? ["", "true positives", "false positives"][Math.round(v)] || "" : ""; chB.draw([{ pts: [[1, tst.tp], [2, tst.fp]], type: "bars", w: 0.5, color: "#ff6b81", label: "" }], { xMin: 0.4, xMax: 2.6, yMin: 0 });
    label(0, "true positives"); label(1, "false positives"); label(2, "share real"); label(3, "Bayes"); read.set("a", tst.tp); read.set("b", tst.fp); read.set("c", (100 * tst.ppv).toFixed(0) + "%"); read.set("d", (100 * ppvTheory(P.prev, P.sens, P.spec)).toFixed(0) + "%"); }
}
let frame = 0;
ui.onLevel = () => { sync(); if (ui.level !== "adv" && P.view === "test") set({ view: "race" }); };
ui.run(dt => { if (dt > 0 && res && res.out) k = Math.min(res.out.length - 1, k + dt * 12); }, () => { draw(); if (frame++ % 5 === 0) charts(); });
set({});
ui.tip("Run the marathon and watch the glycogen tank. Then add aids: which are legal?", 7000);
