/* =====================================================================
   LUNGS AND GAS EXCHANGE
   Breathing brings fresh air into the alveoli. Oxygen DIFFUSES across a
   very thin wall into the blood, where haemoglobin in the red blood
   cells picks it up; carbon dioxide diffuses the other way.
   Diffusion is fast when (Fick's law):
       rate ∝ surface area × difference in concentration ÷ thickness
   Each red blood cell spends less than a second in a lung capillary,
   so anything that slows diffusion (thick or damaged walls, less
   oxygen in the air at altitude, a faster heart in exercise) can stop
   the blood filling up with oxygen.

   The model finds the steady state: breathing sets the gas in the
   alveolus, then the blood is followed along one capillary, step by
   step, until everything agrees.
   ===================================================================== */
const VD = 0.15, VC = 75;    // dead space (L) and capillary blood volume (mL)
const sat = (p, p50) => { const x = Math.pow(Math.max(p, 0) / p50, 2.7); return x / (1 + x); };                    // haemoglobin saturation (a Hill curve)
const content = (p, p50, cap) => cap * sat(p, p50) + 0.000225 * Math.max(p, 0);                                       // mL O₂ per mL of blood: bound + dissolved
function pressureFor(C, p50, cap) { let lo = 0, hi = 100; for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (content(m, p50, cap) < C) lo = m; else hi = m; } return (lo + hi) / 2; }
const pBar = altM => Math.exp(6.63268 - 0.1112 * altM / 1000 - 0.00149 * (altM / 1000) ** 2) * 0.13332;              // air pressure (kPa): West's formula for high mountains

/* o = { alt (m), ex (0–1 of maximum), trained, acclim, area (m²), thick (µm), narrow (0–0.9 airway narrowing), hb (g/dL), co (COHb share),
         bohr, manual, f (breaths/min), vt (L), smoker } */
function solve(o) {
  const PB = pBar(o.alt), PIO2 = 0.2093 * (PB - 6.27);                                                // oxygen in the air reaching the lungs, after water vapour
  const VO2 = 0.25 + o.ex * (o.trained ? 3.8 : 2.75), R = 0.8 + 0.2 * o.ex, VCO2 = R * VO2;          // oxygen used and CO₂ made (L/min)
  const Q = (5 + o.ex * (o.trained ? 20 : 15)) * Math.sqrt(14.5 / o.hb);                              // cardiac output (L/min): the heart pumps harder when blood carries less
  const VAmax = (o.trained ? 150 : 120) * Math.pow(1 - o.narrow, 4);                                  // narrow airways limit how much air you can move (Poiseuille)
  const cap = 1.34 * o.hb * (1 - o.co) / 100;                                                         // mL O₂ the haemoglobin in 1 mL of blood can carry (CO blocks some)
  const p50L = 3.55 * (1 - 0.5 * o.co) * (o.bohr ? 0.95 : 1), p50T = 3.55 * (1 - 0.5 * o.co) * (o.bohr ? 1.15 + 0.35 * o.ex : 1);   // Bohr shift: lower P50 in the lungs, higher in working muscle
  const D = 3.0 * o.area / o.thick * (0.45 + 0.55 * o.ex) * (o.smoker ? 0.8 : 1);                   // diffusing capacity (mL O₂/min/kPa): Fick's law; more capillaries open in exercise
  const tc = VC * (1 + o.ex) / (Q * 1000 / 60);                                                       // seconds each red cell spends in a lung capillary
  const shunt = 0.02 + 0.25 * o.narrow * o.narrow + (o.smoker ? 0.02 : 0);
  let PAO2 = 13, PACO2 = 5.3, VA = 4.3, f = 12, VT = 0.5, Ca = 0.2, Cv = 0.15, prof = [], limited = false;
  for (let it = 0; it < 60; it++) {
    if (o.manual) { VA = Math.max(0.05, o.f * (o.vt - VD)); f = o.f; VT = o.vt; VA = Math.min(VA, VAmax); }
    else {
      // automatic breathing: keep CO₂ near 5.3 kPa (lower in hard exercise), plus extra breathing when oxygen is low (much stronger once acclimatised)
      const target = 5.3 - 1.2 * Math.max(0, o.ex - 0.6) / 0.4, drive = 1 + (o.acclim ? 2.2 : 1) * Math.max(0, (8.5 - PAO2) / 4);
      const want = 0.115 * VCO2 * 1000 / target * drive; VA = VA + (Math.min(want, VAmax) - VA) * 0.5;
      f = Math.min(50, 12 + 28 * o.ex + 4 * (drive - 1)); VT = VA / f + VD;
    }
    PACO2 = 0.115 * VCO2 * 1000 / VA; PAO2 = Math.max(0.3, PIO2 - PACO2 / R);                        // alveolar gas equations
    // follow the blood along the capillary: oxygen diffuses in at D × (PAO₂ − P_blood)
    Cv = Math.max(0.15 * cap, Ca - VO2 / Q); limited = Ca - VO2 / Q < 0.15 * cap;                        // Fick principle: venous = arterial − uptake ÷ blood flow
    let C = Cv; prof = []; const n = 60, dt = tc / n;
    for (let k = 0; k <= n; k++) { const Pc = pressureFor(C, p50L, cap); prof.push([k / n, Pc, sat(Pc, p50L)]); if (k < n) C = Math.min(C + D / 60 * (PAO2 - Pc) / VC * dt, content(PAO2, p50L, cap)); }
    Ca = Ca + ((1 - shunt) * C + shunt * Cv - Ca) * 0.5;
  }
  const PaO2 = pressureFor(Ca, p50L, cap), Sa = sat(PaO2, p50L), Pv = pressureFor(Cv, p50T, cap), eq = prof.findIndex(q => q[1] > PAO2 - 0.15);
  return { PB, PIO2, PAO2, PACO2, PaO2, Sa, SpO2: Sa * (1 - o.co) + o.co, Pv, Sv: sat(Pv, p50T), Ca, Cv, VO2: limited ? Q * (Ca - Cv) : VO2, Q, VA, f, VT, VE: f * VT, tc, D, prof, eqFrac: eq < 0 ? null : eq / 60, cap, p50L, p50T, HR: Math.round((o.trained ? 55 : 70) + o.ex * (190 - (o.trained ? 55 : 70)) + (Q / (5 + o.ex * (o.trained ? 20 : 15)) - 1) * 40), /* heart rate: up with exercise, higher when the blood carries less oxygen */ limited };
}

// ---------------- The page ----------------
const BASE = { alt: 0, ex: 0, trained: false, acclim: false, area: 70, thick: 0.5, narrow: 0, hb: 14.5, co: 0, bohr: true, manual: false, f: 12, vt: 0.5, smoker: false };
const P = Object.assign({}, BASE);
let S = solve(P), rnd = K.rng(Date.now() % 99991 + 31), speed = 1, t = 0, spiro = [], cells = [], dots = [], deep = -1;
const ui = K.app({
  title: "Lungs and Gas Exchange", subject: "Biology and medicine",
  blurb: "Breathing, diffusion in the alveoli, and what altitude, exercise and disease do to it",
  reset: () => set({}),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Biology (4BI1) 2(g) gas exchange in humans: ventilation by the intercostal muscles and diaphragm, adaptations of the alveoli for diffusion, the effects of smoking; the effect of exercise on breathing (2.50); red blood cells and haemoglobin (2(h)). Altitude and the pulse oximeter are beyond the spec.", adv: "OCR A level Biology A (H420) 3.1.1 exchange surfaces (features of efficient exchange, lung volumes, spirometer, ventilation rate) and 3.1.2 transport in animals (haemoglobin, the oxygen dissociation curve, the Bohr effect, carbon monoxide)." } },
  missions: [
    { title: "Breathing in and out", q: "Watch the chest. What do the diaphragm and ribs do when you breathe in? How do they make air flow in?", hint: "Breathing in: the diaphragm contracts and flattens, the external intercostal muscles pull the ribs up and out. The chest volume increases, so the pressure inside falls below the air outside and air flows in. Breathing out at rest is mostly passive: the muscles relax and the lungs spring back.", setup() { set({}); } },
    { title: "Inside an alveolus", q: "Look at the alveolus and capillary. Red blood cells arrive dark and leave bright. How far along the capillary are they full of oxygen? What makes diffusion here so fast?", hint: "At rest the blood is full within about the first third of the capillary. Diffusion is fast because the wall is only about 0.5 µm thick (two flattened cells), the total area is about 70 m² (a tennis court), breathing keeps the alveolar oxygen high and blood flow carries oxygen away, so the concentration gradient stays steep.", setup() { set({}); } },
    { title: "Exercise", q: "Raise exercise to 80%. What happens to the breathing rate, the depth of breathing and the heart rate? Does the blood still fill with oxygen?", hint: "Breathing gets faster and deeper and the heart pumps much more blood, so each red cell spends only about a third of a second in the capillary. In a healthy lung that is still just enough: there is a big safety margin. More capillaries open, increasing the surface area.", setup() { set({ ex: 0.8 }); } },
    { title: "Fibrosis: a thicker wall", q: "Make the alveolar wall 2 µm thick (lung fibrosis). Is the blood still saturated at rest? What about during exercise?", hint: "Diffusion is inversely proportional to thickness, so it is four times slower. At rest the blood still just fills before the end of the capillary; in exercise the faster blood leaves before it is full, and the oxygen saturation falls. People with fibrosis become breathless on exertion first.", setup() { set({ thick: 2, ex: 0 }); } },
    { title: "Emphysema", q: "Reduce the surface area to 25 m², as when smoking breaks down alveolar walls (emphysema). What happens, and why?", hint: "Fewer, larger air sacs have far less surface area, so less oxygen diffuses per second. The blood may not fill, especially in exercise. Damaged airways also make breathing out hard. Smoking also adds carbon monoxide and paralyses the cilia.", setup() { set({ area: 25, smoker: true }); } },
    { title: "Altitude", q: "Climb to 5000 m without acclimatising. The air still has 21% oxygen. Why does the blood carry less? Now acclimatise.", hint: "The air pressure is about half, so each breath holds about half as much oxygen and the partial pressure of oxygen in the alveoli falls. Haemoglobin is less saturated. After acclimatising, breathing is much deeper (driving the CO₂ down, which lets the alveolar oxygen rise) and the body makes more red blood cells over weeks.", setup() { set({ alt: 5000 }); } },
    { title: "Carbon monoxide", q: "Set carbon monoxide to 30% (COHb). How much oxygen does the blood carry? What does the pulse oximeter say?", hint: "CO binds to haemoglobin about 250 times more strongly than oxygen, so 30% of the haemoglobin carries nothing, and the rest holds on to its oxygen more tightly. Oxygen content falls by a third or more. A pulse oximeter cannot tell carboxyhaemoglobin from oxyhaemoglobin, so it reads nearly 100%: dangerously reassuring.", setup() { set({ co: 0.3 }); } },
    { title: "Shallow breathing", q: "Take over the breathing: 40 breaths a minute of 0.3 L each (12 L/min). Compare with 12 breaths of 1 L. Same air in and out each minute, so why is one so much worse?", hint: "The first 0.15 L of every breath only fills the airways (dead space), where no gas exchange happens. Shallow breaths waste a larger share: 40 × (0.3 − 0.15) = 6 L/min reaches the alveoli against 12 × 0.85 = 10.2 L/min. CO₂ builds up and oxygen falls.", setup() { set({ manual: true, f: 40, vt: 0.3 }); } },
    { lvl: "adv", title: "The dissociation curve", q: "Show the oxygen dissociation curve. Find the arterial and venous points at rest, then at 80% exercise. How much oxygen is unloaded in each case?", hint: "At rest the venous blood is still about 75% saturated: only a quarter is unloaded. In exercise the muscles' PO₂ is lower and the Bohr shift (more CO₂, acid and heat) moves the curve to the right, so much more is unloaded. The steep part of the curve is at the PO₂ of working tissues.", setup() { set({ ex: 0, curve: true }); } },
    { lvl: "adv", title: "No Bohr shift", q: "Turn off the Bohr shift and run 90% exercise. How does the venous saturation change?", hint: "Without the right shift in working muscle, haemoglobin holds on to more of its oxygen at the same PO₂, so less is unloaded and the venous blood is more saturated (or the muscles must work at a lower PO₂). The Bohr effect helps deliver oxygen exactly where CO₂ is being made.", setup() { set({ ex: 0.9, bohr: false, curve: true }); } }
  ],
  batch: [
    { title: "Altitude and oxygen saturation", question: "How does arterial oxygen saturation change as you climb (not acclimatised, at rest)?", how: "Altitude 0 to 7000 m. Each run is a different person: haemoglobin, lung area and wall thickness vary by about 7–10%.", xLabel: "altitude (m)", yLabel: "SaO₂ (%)", xs: [0, 1000, 2000, 3000, 4000, 5000, 6000, 7000], reps: 5, yMin: 0, yMax: 102, theory: a => 100 * solve(Object.assign({}, BASE, { alt: a })).Sa, theoryLabel: "average person", run: (x, r) => 100 * solve(person(r, { alt: x })).Sa, note: "Almost no change up to about 2000 m, because the top of the dissociation curve is flat. Above that, saturation falls steeply. People differ more and more as they climb." },
    { title: "Acclimatisation", question: "How much does acclimatising raise the saturation at altitude?", how: "Acclimatised climbers at rest, 0 to 8000 m. The dashed line is the unacclimatised average person.", xLabel: "altitude (m)", yLabel: "SaO₂ (%)", xs: [0, 2000, 4000, 5000, 6000, 7000, 8000], reps: 5, yMin: 0, yMax: 102, theory: a => 100 * solve(Object.assign({}, BASE, { alt: a })).Sa, theoryLabel: "not acclimatised", run: (x, r) => 100 * solve(person(r, { alt: x, acclim: true })).Sa, note: "Breathing much harder blows off CO₂, which raises the alveolar oxygen (the alveolar gas equation). Acclimatised climbers have reached the summit of Everest without bottled oxygen, with an arterial saturation of only about 50–60%." },
    { title: "A thicker wall", question: "How does the membrane thickness affect arterial saturation at rest and in exercise?", how: "Membrane thickness 0.5 to 5 µm, 80% exercise, at sea level. The dashed line is the average person at rest.", xLabel: "membrane thickness (µm)", yLabel: "SaO₂ (%)", xs: [0.5, 1, 1.5, 2, 3, 4, 5], reps: 5, yMin: 0, yMax: 102, theory: x => 100 * solve(Object.assign({}, BASE, { thick: x })).Sa, theoryLabel: "at rest", run: (x, r) => 100 * solve(person(r, { thick: x, ex: 0.8 })).Sa, note: "In exercise the blood moves through too fast for a thick wall: saturation falls well before it does at rest. Diffusion rate ∝ 1 ÷ thickness (Fick's law)." },
    { title: "Shallow breathing and dead space", question: "With the same 6 L of air a minute, how does breathing rate affect the CO₂ in the alveoli?", how: "Manual breathing, 6 L/min in total, 6 to 30 breaths a minute (tidal volume = 6 ÷ rate). Theory: PACO₂ = 0.115 × VCO₂ ÷ (6 − rate × 0.15).", xLabel: "breaths a minute", yLabel: "alveolar PCO₂ (kPa)", xs: [6, 8, 10, 12, 15, 18, 21, 24, 27, 30], reps: 3, yMin: 0, theory: f => 0.115 * 200 / (6 - f * VD), theoryLabel: "alveolar ventilation equation", run: (x, r) => { const pp = person(r, { manual: true, f: x, vt: 6 / x }); return solve(pp).PACO2; }, note: "Rapid shallow breathing moves the same air but more of it is wasted in the dead space, so less reaches the alveoli and CO₂ builds up." },
    { title: "Carbon monoxide and oxygen carried", question: "How does carbon monoxide affect the oxygen the blood carries, and what does a pulse oximeter show?", how: "COHb 0 to 50%; arterial oxygen content against the simple prediction (1 − COHb) × normal content.", xLabel: "COHb (%)", yLabel: "O₂ content (mL per 100 mL of blood)", xs: [0, 10, 20, 30, 40, 50], reps: 4, yMin: 0, theory: x => (1 - x / 100) * solve(BASE).Ca * 100, theoryLabel: "(1 − COHb) × normal", run: (x, r) => 100 * solve(person(r, { co: x / 100 })).Ca, note: "Oxygen content falls in proportion to the blocked haemoglobin, while the pulse oximeter (try it in the simulation) still reads nearly 100%." },
    { title: "How much do people differ at 4000 m?", question: "At 4000 m, at rest and not acclimatised, how much does SaO₂ vary between people?", how: "300 people, each with their own haemoglobin, lung area, wall thickness, breathing response and metabolism.", reps: 300, bins: 24, theory: 100 * solve(Object.assign({}, BASE, { alt: 4000 })).Sa, theoryLabel: "average person", yLabel: "SaO₂ (%)", run: (x, r) => 100 * solve(person(r, { alt: 4000 })).Sa, note: "On the steep part of the dissociation curve, small differences between people give big differences in saturation: some cope well, some do not. That is one reason altitude sickness is hard to predict." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4BI1 2.43", text: "Ventilation: breathing in, the diaphragm contracts and flattens and the external intercostal muscles raise the ribs; the volume of the thorax increases, its pressure falls and air flows in." },
      { lvl: "std", tag: "4BI1 2.45", text: "Alveoli are adapted for gas exchange: a huge surface area, walls one cell thick, a good blood supply and ventilation that keep the concentration gradient steep, and a moist lining." },
      { lvl: "std", tag: "4BI1 2.47", text: "Smoking: carbon monoxide reduces the oxygen the blood can carry; tar damages cilia and alveoli (emphysema reduces surface area); it causes bronchitis, lung cancer and heart disease." },
      { lvl: "std", tag: "4BI1 2.50", text: "Exercise increases the rate and depth of breathing (and heart rate) to supply more oxygen and remove more carbon dioxide." },
      { lvl: "std", tag: "4BI1 2.59", text: "Red blood cells contain haemoglobin, which combines with oxygen in the lungs (oxyhaemoglobin) and releases it in respiring tissues." },
      { lvl: "beyond", tag: "Beyond the spec", text: "At altitude the air pressure is lower, so each breath holds less oxygen; acclimatisation includes deeper breathing and making more red blood cells." },
      { lvl: "adv", tag: "H420 3.1.1", text: "Spirometer: tidal volume, vital capacity, residual volume. Ventilation rate = tidal volume × breathing rate. Dead space: air in the airways that does not reach the alveoli." },
      { lvl: "adv", tag: "H420 3.1.2", text: "The oxygen dissociation curve is S-shaped (cooperative binding). The Bohr effect: more CO₂ shifts it to the right, so haemoglobin unloads more oxygen in respiring tissues. Fetal haemoglobin's curve lies to the left." },
      { lvl: "adv", tag: "H420 3.1.2", text: "Carbon monoxide binds haemoglobin almost irreversibly, reducing the oxygen carried and shifting the curve left." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: "Describe how air is drawn into the lungs.", ans: "<ul><li>diaphragm contracts and flattens; external intercostal muscles contract, raising the ribs</li><li>volume of the thorax increases</li><li>pressure inside falls below atmospheric, so air flows in</li></ul>" },
      { lvl: "std", marks: 4, q: "Explain how the alveoli are adapted for efficient gas exchange.", ans: "<ul><li>large surface area (many alveoli)</li><li>thin walls / one cell thick: short diffusion distance</li><li>rich capillary network keeps the concentration gradient</li><li>ventilation brings fresh air and removes CO₂</li></ul>" },
      { lvl: "std", marks: 3, q: () => `In the simulation the breathing rate is ${S.f.toFixed(0)} breaths a minute and each breath is ${S.VT.toFixed(2)} L. Calculate the volume breathed per minute and explain why it rises in exercise.`, ans: () => `<ul><li>${S.f.toFixed(0)} × ${S.VT.toFixed(2)} = ${(S.f * S.VT).toFixed(1)} L per minute</li><li>muscles respire faster, needing more oxygen</li><li>and producing more carbon dioxide, which must be removed</li></ul>` },
      { lvl: "std", marks: 2, q: "Explain why carbon monoxide in cigarette smoke reduces the oxygen reaching the tissues.", ans: "<ul><li>CO combines with haemoglobin (more strongly than oxygen)</li><li>so less haemoglobin is available to carry oxygen</li></ul>" },
      { lvl: "adv", marks: 3, q: "Explain the Bohr effect and why it is advantageous during exercise.", ans: "<ul><li>higher CO₂ (lower pH) lowers haemoglobin's affinity for oxygen</li><li>the dissociation curve shifts to the right</li><li>more oxygen is unloaded in actively respiring tissues, where CO₂ is highest</li></ul>" },
      { lvl: "adv", marks: 3, q: "A person breathes 15 times a minute with a tidal volume of 0.45 dm³; the dead space is 0.15 dm³. Calculate the pulmonary ventilation and the alveolar ventilation.", ans: "<ul><li>pulmonary ventilation = 15 × 0.45 = 6.75 dm³ min⁻¹</li><li>alveolar ventilation = 15 × (0.45 − 0.15)</li><li>= 4.5 dm³ min⁻¹</li></ul>" },
      { lvl: "adv", marks: 2, q: "Suggest why fetal haemoglobin has a higher affinity for oxygen than adult haemoglobin.", ans: "<ul><li>the fetus must take oxygen from the mother's blood in the placenta</li><li>where the PO₂ is low; a curve to the left loads oxygen at lower PO₂</li></ul>" }
    ]
  },
  notes: `<h3>What is being modelled</h3>
<ul><li><b>Air pressure</b> at altitude from West's formula (33.7 kPa on Everest, as measured). Inspired PO₂ = 0.2093 × (pressure − 6.3 kPa water vapour).</li>
<li><b>Breathing</b>: alveolar ventilation = rate × (tidal volume − 0.15 L dead space). Automatic breathing keeps alveolar CO₂ near 5.3 kPa (lower in hard exercise) and adds a drive when oxygen is low (2.2 times as strong once acclimatised). Narrow airways limit the most air you can move (∝ (1 − narrowing)⁴).</li>
<li><b>Alveolar gas equations</b>: PACO₂ = 0.115 × VCO₂ (mL/min) ÷ alveolar ventilation (L/min); PAO₂ = PIO₂ − PACO₂ ÷ R.</li>
<li><b>Diffusion (Fick's law)</b>: diffusing capacity = 3.0 × area ÷ thickness mL O₂/min/kPa, with 45% of capillaries in use at rest rising to 100% in hard exercise. Along the capillary, oxygen enters at D × (PAO₂ − P_blood). Each red cell spends 75–150 mL ÷ cardiac output in a capillary: about 0.9 s at rest and 0.3–0.4 s in hard exercise.</li>
<li><b>Haemoglobin</b>: 1.34 mL O₂ per g, saturation from a Hill curve (P50 3.55 kPa, n 2.7), plus dissolved oxygen. Bohr shift: P50 5% lower in the lungs and 15–50% higher in working muscle. Carbon monoxide blocks part of the haemoglobin and shifts the rest to the left; a pulse oximeter counts COHb as oxygen.</li>
<li><b>Body</b>: oxygen use 0.25 L/min at rest up to 3 L/min (5 for an athlete); cardiac output 5 up to 20 L/min (25), higher with anaemia. Fick principle: venous content = arterial − uptake ÷ cardiac output. 2% of blood misses fresh air (more with narrow airways or smoking).</li>
<li>Batch runs use different people: haemoglobin ±7%, lung area ±10%, wall thickness ±10%.</li></ul>
<h3>Simplifications</h3>
<ul><li>A steady state only; one average alveolus and capillary stands for the whole lung.</li>
<li>Haemoglobin reacts instantly; CO₂ exchange is assumed complete.</li>
<li>Acclimatisation only changes breathing here (no extra red cells unless you raise the haemoglobin yourself).</li>
<li>The earlier version also had a soda-lime spirometer, fetal haemoglobin and twelve presets; they are not in this version.</li></ul>
<p>The earlier version of this simulation, with its worksheets, is kept in <a href="original/gas-exchange.html">original/gas-exchange.html</a>.</p>`
});
function person(r, o) { const q = Object.assign({}, BASE, o); q.hb *= 1 + 0.07 * r.gauss(); q.area *= 1 + 0.1 * r.gauss(); q.thick *= 1 + 0.1 * r.gauss(); return q; }   // a different person each run

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("The person");
ctl.ex = K.slider(g, { label: "Exercise", min: 0, max: 1, step: 0.05, value: 0, fmt: v => Math.round(v * 100) + "% of maximum", on: v => { P.ex = v; update(); } });
ctl.trained = K.toggle(g, { label: "Trained athlete", value: false, on: v => { P.trained = v; update(); } });
ctl.alt = K.slider(g, { label: "Altitude", min: 0, max: 8848, step: 100, value: 0, unit: "m", on: v => { P.alt = v; update(); } });
ctl.acclim = K.toggle(g, { label: "Acclimatised to altitude", value: false, on: v => { P.acclim = v; update(); } });
g = ui.group("Lungs and blood");
ctl.area = K.slider(g, { label: "Alveolar surface area", min: 10, max: 100, step: 1, value: 70, unit: "m²", on: v => { P.area = v; update(); } });
ctl.thick = K.slider(g, { label: "Alveolar wall thickness", min: 0.2, max: 5, step: 0.1, value: 0.5, unit: "µm", on: v => { P.thick = v; update(); } });
ctl.narrow = K.slider(g, { label: "Airways narrowed (asthma)", min: 0, max: 0.8, step: 0.05, value: 0, fmt: v => Math.round(v * 100) + "%", on: v => { P.narrow = v; update(); } });
ctl.hb = K.slider(g, { label: "Haemoglobin", min: 5, max: 21, step: 0.5, value: 14.5, unit: "g/dL", on: v => { P.hb = v; update(); } });
ctl.co = K.slider(g, { label: "Carbon monoxide (COHb)", min: 0, max: 0.6, step: 0.01, value: 0, fmt: v => Math.round(v * 100) + "%", on: v => { P.co = v; update(); } });
ctl.smoker = K.toggle(g, { label: "Smoker", value: false, on: v => { P.smoker = v; if (v && P.co < 0.05) { P.co = 0.06; ctl.co.set(0.06); } update(); } });
g = ui.group("Breathing");
ctl.manual = K.toggle(g, { label: "I control the breathing", value: false, on: v => { P.manual = v; update(); } });
ctl.f = K.slider(g, { label: "Breaths a minute", min: 4, max: 50, step: 1, value: 12, on: v => { P.f = v; update(); } });
ctl.vt = K.slider(g, { label: "Tidal volume (each breath)", min: 0.2, max: 3, step: 0.05, value: 0.5, unit: "L", on: v => { P.vt = v; update(); } });
let r1 = K.row(g); K.btn(r1, "🫁 Deepest breath (vital capacity)", () => { deep = 0; });
const advG = g = ui.group("A level");
ctl.bohr = K.toggle(g, { label: "Bohr shift", value: true, on: v => { P.bohr = v; update(); } });
ctl.curve = K.seg(g, { label: "Right-hand graph", value: "cap", options: [["cap", "PO₂ along the capillary"], ["odc", "Dissociation curve"]], on: v => { P.curve = v === "odc"; } });
g = ui.group("Watch");
ctl.speed = K.slider(g, { label: "Speed", min: 0.1, max: 2, step: 0.1, value: 1, fmt: v => "× " + v.toFixed(1) + (v === 1 ? " (real time)" : ""), on: v => speed = v });
const read = K.readout(g, [["pa", "alveolar PO₂"], ["sa", "arterial saturation"], ["co2", "alveolar PCO₂"], ["ve", "breathing (rate × depth)"], ["q", "heart rate · cardiac output"], ["tc", "time in the capillary"]]);
function update() { S = solve(P); for (const k of ["f", "vt"]) ctl[k].el.style.display = P.manual ? "" : "none"; }
function set(o) { Object.assign(P, BASE, { curve: false }, o); for (const k of ["ex", "alt", "area", "thick", "narrow", "hb", "co", "f", "vt"]) ctl[k].set(P[k]); for (const k of ["trained", "acclim", "smoker", "manual", "bohr"]) ctl[k].set(P[k]); ctl.curve.set(P.curve ? "odc" : "cap"); update(); }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, { title: "Spirometer trace", xLabel: "seconds", yLabel: "lung volume (L)" }), chB = K.chart(ui.dock, { yMin: 0 });
const TLC = 6, RV = 1.2, FRC = 2.4;
const T2 = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
let vol = FRC;
function lungVolume() {
  if (deep >= 0) { const d = deep; return d < 3 ? FRC + (TLC - FRC) * Math.sin(Math.PI / 2 * d / 3) : d < 7 ? TLC - (TLC - RV) * Math.sin(Math.PI / 2 * (d - 3) / 4) : RV + (FRC - RV) * Math.min(1, (d - 7) / 2); }
  return FRC + Math.min(S.VT, TLC - FRC) * (1 - Math.cos(2 * Math.PI * S.f / 60 * t)) / 2;
}
function drawChest(c, x0, w, h) {
  const fill = (vol - RV) / (TLC - RV), cx = x0 + w / 2, top = 70, lw = w * 0.2 * (0.8 + 0.35 * fill), lh = (h - 170) * (0.75 + 0.25 * fill), dia = top + 40 + lh;
  c.strokeStyle = "#c9d3e6"; c.lineWidth = 8; c.beginPath(); c.moveTo(cx, top - 30); c.lineTo(cx, top + 30); c.stroke();     // trachea
  c.lineWidth = 5; c.beginPath(); c.moveTo(cx, top + 30); c.lineTo(cx - 30, top + 60); c.moveTo(cx, top + 30); c.lineTo(cx + 30, top + 60); c.stroke();
  for (const s of [-1, 1]) { const g2 = c.createRadialGradient(cx + s * (lw * 0.75), top + 40 + lh / 2, 10, cx + s * (lw * 0.75), top + 40 + lh / 2, lw * 1.2); g2.addColorStop(0, "#ff9fae"); g2.addColorStop(1, "#c4566b"); c.fillStyle = g2; c.beginPath(); c.ellipse(cx + s * (lw * 0.75 + 8), top + 40 + lh / 2, lw * 0.7, lh / 2, 0, 0, 6.3); c.fill(); }
  // ribs: lift up and out as the chest fills
  c.strokeStyle = "rgba(238,242,248,0.55)"; c.lineWidth = 4; for (let i = 0; i < 6; i++) { const y = top + 50 + i * lh / 6 - fill * 8 * (6 - i) / 6; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(cx + s * 6, y); c.quadraticCurveTo(cx + s * (lw * 1.7 + 6 * fill), y + 10, cx + s * (lw * 1.6), y + 34); c.stroke(); } }
  // diaphragm: domed when relaxed, flatter when contracted
  c.strokeStyle = "#ffb347"; c.lineWidth = 5; c.beginPath(); c.moveTo(cx - lw * 1.7, dia + 10); c.quadraticCurveTo(cx, dia - 60 * (1 - fill), cx + lw * 1.7, dia + 10); c.stroke();
  T2(c, "diaphragm", cx + lw * 1.7, dia + 28, "#ffb347", "right", "11px"); T2(c, "ribs and intercostal muscles", cx - lw * 1.7, top + 30, "#aab6cc", "left", "11px");
  T2(c, `${vol.toFixed(2)} L in the lungs`, cx, h - 20, "#eef2f8", "center", "600 13px");
}
function drawAlveolus(c, x0, w, h) {
  const ax = x0 + w * 0.45, ay = 160, ar = Math.min(w * 0.3, 120), capY = ay + ar + 26, capL = x0 + 20, capR = x0 + w - 20;
  // alveolus: oxygen (blue) and CO₂ (grey) molecules, more of them the higher the partial pressure
  c.fillStyle = "rgba(255,159,174,0.12)"; c.beginPath(); c.arc(ax, ay, ar, 0, 6.3); c.fill(); c.strokeStyle = "#ff9fae"; c.lineWidth = Math.max(2, P.thick * 4); c.stroke();
  const ph = performance.now() / 1000, nO = Math.round(S.PAO2 * 4), nC = Math.round(S.PACO2 * 4);
  for (let i = 0; i < nO + nC; i++) { const a = i * 2.39996 + ph * 0.3 * (1 + i % 3), rr = ar * 0.85 * Math.sqrt(((i * 0.618) % 1)); c.fillStyle = i < nO ? "#5ab0ff" : "#aab6cc"; c.beginPath(); c.arc(ax + rr * Math.cos(a), ay + rr * Math.sin(a), 3, 0, 6.3); c.fill(); }
  T2(c, `alveolus: PO₂ ${S.PAO2.toFixed(1)} kPa, PCO₂ ${S.PACO2.toFixed(1)} kPa`, ax, ay - ar - 12, "#eef2f8", "center", "600 12px");
  // capillary: red cells go from dark (deoxygenated) to bright as they load
  c.fillStyle = "rgba(160,40,60,0.25)"; c.fillRect(capL, capY - 18, capR - capL, 36); c.strokeStyle = "#c4566b"; c.lineWidth = 2; c.strokeRect(capL, capY - 18, capR - capL, 36);
  const colAt = sv => `rgb(${Math.round(110 + 145 * sv)},${Math.round(20 + 40 * sv)},${Math.round(60 + 10 * sv)})`;
  for (const cl of cells) { const k = Math.min(60, Math.round(cl.x * 60)), sv = S.prof[k][2]; c.fillStyle = colAt(sv); c.beginPath(); c.ellipse(capL + cl.x * (capR - capL), capY + cl.y, 13, 9, 0, 0, 6.3); c.fill(); }
  for (const d of dots) { c.fillStyle = d.k ? "#aab6cc" : "#5ab0ff"; c.beginPath(); c.arc(d.x, d.y, 2.6, 0, 6.3); c.fill(); }
  T2(c, "blood in →", capL, capY + 36, "#aab6cc", "left", "11px"); T2(c, "→ to the heart", capR, capY + 36, "#aab6cc", "right", "11px");
  if (S.eqFrac != null) { const xe = capL + S.eqFrac * (capR - capL); c.strokeStyle = "#7fe3a0"; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(xe, capY - 26); c.lineTo(xe, capY + 26); c.stroke(); c.setLineDash([]); T2(c, "full here", xe, capY + 50, "#7fe3a0", "center", "11px"); } else T2(c, "blood leaves before it is full!", (capL + capR) / 2, capY + 50, "#ff5d6c", "center", "600 12px");
  // pulse oximeter
  const ox = x0 + w - 150, oy = h - 90; c.fillStyle = "#1a2236"; c.beginPath(); c.roundRect(ox, oy, 130, 64, 10); c.fill(); T2(c, "SpO₂", ox + 10, oy + 18, "#aab6cc", "left", "11px"); T2(c, Math.round(100 * S.SpO2) + "%", ox + 10, oy + 48, S.SpO2 < 0.9 ? "#ff5d6c" : "#7fe3a0", "left", "700 26px"); T2(c, "♥ " + S.HR, ox + 120, oy + 48, "#ff8a70", "right", "600 15px");
  if (P.co > 0.05) T2(c, "(cannot tell CO from O₂)", ox + 65, oy + 80, "#ffb347", "center", "10.5px");
}
function draw() { const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#070b14"; c.fillRect(0, 0, w, h); const cw = Math.round(w * 0.38); drawChest(c, 0, cw, h); drawAlveolus(c, cw, w - cw, h); }

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => {
  if (!(dt > 0)) return; const s = dt * speed; t += s; if (deep >= 0) { deep += s; if (deep > 9) deep = -1; }
  vol = lungVolume(); spiro.push([t, vol]); while (spiro.length && spiro[0][0] < t - 30) spiro.shift();
  // red cells move along the capillary: the whole length in the transit time
  if (!cells.length || cells[cells.length - 1].x > 0.11) cells.push({ x: 0, y: (rnd() - 0.5) * 10 });
  for (const cl of cells) cl.x += s / S.tc; cells = cells.filter(cl => cl.x < 1.02);
  // oxygen molecules crossing into the blood (and CO₂ coming out), at a rate set by the uptake
  const w = cv.w, cw = Math.round(w * 0.38), ax = cw + (w - cw) * 0.45, capY = 160 + Math.min((w - cw) * 0.3, 120) + 26;
  if (rnd() < S.VO2 * s * 12) dots.push({ x: ax + (rnd() - 0.5) * 120, y: capY - 70, k: 0, vy: 60 }); if (rnd() < S.VO2 * 0.9 * s * 12) dots.push({ x: ax + (rnd() - 0.5) * 120, y: capY, k: 1, vy: -60 });
  for (const d of dots) d.y += d.vy * s; dots = dots.filter(d => d.k ? d.y > capY - 80 : d.y < capY + 4);
}, () => {
  draw(); if (frame++ % 5) return;
  chA.draw([{ pts: spiro, color: "#5ab0ff", label: "volume" }], { xMin: t - 30, xMax: t, yMin: 0, yMax: 6.5, hlines: ui.level === "adv" ? [{ y: TLC, color: "#7d8aa5", label: "total lung capacity" }, { y: RV, color: "#7d8aa5", label: "residual volume" }] : [] });
  if (P.curve) {
    chB.opts.title = "Oxygen dissociation curve"; chB.opts.xLabel = "PO₂ (kPa)"; chB.opts.yLabel = "saturation (%)";
    const L = [], Tt = []; for (let p = 0; p <= 16; p += 0.2) { L.push([p, 100 * sat(p, S.p50L)]); Tt.push([p, 100 * sat(p, S.p50T)]); }
    chB.draw([{ pts: L, color: "#ff5d6c", label: "in the lungs" }, { pts: Tt, color: "#ffb347", dash: [5, 4], label: "in the muscles (Bohr shift)" }, { pts: [[S.PaO2, 100 * S.Sa]], type: "dots", color: "#ff5d6c", r: 6, label: "arterial" }, { pts: [[S.Pv, 100 * S.Sv]], type: "dots", color: "#6fb1ff", r: 6, label: "venous" }], { xMin: 0, xMax: 16, yMin: 0, yMax: 102 });
  } else {
    chB.opts.title = "PO₂ along the capillary"; chB.opts.xLabel = "distance along the capillary (0 = arrives, 1 = leaves)"; chB.opts.yLabel = "PO₂ in the blood (kPa)";
    chB.draw([{ pts: S.prof.map(q => [q[0], q[1]]), color: "#ff5d6c", label: "blood" }], { xMin: 0, xMax: 1, yMin: 0, yMax: Math.max(14, S.PAO2 * 1.1), hlines: [{ y: S.PAO2, color: "#5ab0ff", label: "alveolar PO₂" }] });
  }
  read.set("pa", S.PAO2.toFixed(1) + " kPa"); read.set("sa", (100 * S.Sa).toFixed(1) + "%"); read.set("co2", S.PACO2.toFixed(1) + " kPa"); read.set("ve", `${S.f.toFixed(0)} × ${S.VT.toFixed(2)} L = ${S.VE.toFixed(1)} L/min`); read.set("q", `${S.HR} /min · ${S.Q.toFixed(1)} L/min`); read.set("tc", S.tc.toFixed(2) + " s");
  advG.style.display = ui.level === "adv" ? "" : "none"; if (ui.level !== "adv" && P.curve) { P.curve = false; ctl.curve.set("cap"); }
  ui.hud(`air pressure ${S.PB.toFixed(0)} kPa${P.alt ? ` at ${P.alt} m` : ""}<br>oxygen used ${(S.VO2 * 1000).toFixed(0)} mL/min${S.limited ? ' <b style="color:#ff5d6c">(limited!)</b>' : ""}`);
});
set({});
ui.tip("Left: the chest breathing · right: one alveolus and its capillary; red cells brighten as they load oxygen", 8000);
