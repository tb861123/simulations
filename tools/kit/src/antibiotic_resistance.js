/* =====================================================================
   ANTIBIOTIC RESISTANCE DURING AN INFECTION
   Bacteria in an infection divide every hour or so. An antibiotic kills
   them only while its concentration is above their MIC (the minimum
   inhibitory concentration). By chance, a few bacteria carry mutations
   that raise their MIC. Normally the drug and the immune system clear
   everything, but if the course is stopped early, doses are missed, or
   the drug level is only just above the MIC, the sensitive bacteria die
   and the resistant ones are left to multiply: natural selection,
   inside one patient.

   Three strains: sensitive (S), partly resistant (I, MIC × 4) and
   resistant (R, MIC × 32). Each hour is split into small steps; when a
   strain is rare its births, deaths and mutations are random
   (Poisson), so two patients on the same treatment can end differently.
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
const DRUGS = {
  amox: { name: "Amoxicillin-like", half: 1, dose: 500, vd: 20, every: 8, mic: 2, kmax: 1.85, note: "short half-life: high peaks, low troughs" },
  cipro: { name: "Ciprofloxacin-like", half: 4, dose: 500, vd: 150, every: 12, mic: 0.5, kmax: 0.9, note: "medium half-life" },
  doxy: { name: "Doxycycline-like", half: 18, dose: 100, vd: 50, every: 24, mic: 0.5, kmax: 0.9, note: "long half-life: steady levels" }
};
const STR = [{ k: "S", name: "sensitive", micX: 1, cost: 0, col: "#7fe3a0" }, { k: "I", name: "partly resistant", micX: 4, cost: 0.05, col: "#ffd166" }, { k: "R", name: "resistant", micX: 32, cost: 0.15, col: "#ff5d6c" }];
const G = 0.7, KCAP = 1e10, MU = 1e-10, IMM = 0.3, ILL = 1e8;      // growth per hour, carrying capacity, mutation per division, max kill per hour, immune kill per hour, "feels ill" level
function poisson(lam, r) { if (lam <= 0) return 0; if (lam > 50) return Math.max(0, Math.round(lam + Math.sqrt(lam) * r.gauss())); let L = Math.exp(-lam), k = 0, p = 1; do { k++; p *= r(); } while (p > L); return k - 1; }
/* one patient. o = { drug, doseX (× the usual dose), days (course length), stop (day the patient stops; 0 = finishes), miss (chance of missing each dose), n0 (bacteria at the start), pre (share resistant at the start), virus }
   returns hourly records, doses and the outcome */
function patient(o, r, keepLog = true) {
  const D = DRUGS[o.drug], kel = Math.log(2) / D.half, dt = 0.05, nDoses = Math.round(o.days * 24 / D.every), stopH = o.stop ? o.stop * 24 : Infinity;
  let N = [o.n0 * (1 - o.pre), 0, o.n0 * o.pre], C = 0, t = 0, doses = [], log = [], cleared = null;
  for (let d = 0; d < nDoses; d++) { const tt = 1 + d * D.every; doses.push({ t: tt, taken: tt < stopH && r() >= o.miss }); }
  let di = 0; const T = Math.max(o.days, 14) * 24 + 48;
  while (t < T) {
    while (di < doses.length && doses[di].t <= t) { if (doses[di].taken) C += o.doseX * D.dose / D.vd; di++; }
    const tot = N[0] + N[1] + N[2], crowd = Math.max(0, 1 - tot / KCAP), imm = IMM / (1 + tot / 1e5);       // the immune system copes with small numbers, is overwhelmed by large ones
    const next = N.slice();
    for (let i = 0; i < 3; i++) {
      if (o.virus) { next[i] = 0; continue; }
      const mic = D.mic * STR[i].micX, kill = D.kmax * C * C / (C * C + mic * mic), b = G * (1 - STR[i].cost) * crowd, d = kill + imm;     // births and deaths per bacterium per hour
      const births = N[i] < 1e4 ? poisson(N[i] * b * dt, r) : N[i] * b * dt, deaths = N[i] < 1e4 ? Math.min(N[i] + births, poisson(N[i] * d * dt, r)) : N[i] * d * dt;
      next[i] += births - deaths;
      if (i < 2) { const m = births * MU; const mut = m < 50 ? poisson(m, r) : m; next[i] -= mut; next[i + 1] += mut; }      // a few divisions produce a more resistant mutant
    }
    N = next.map(x => Math.max(0, x)); C *= Math.exp(-kel * dt); t += dt;
    if (cleared == null && N[0] + N[1] + N[2] < 1) cleared = t;
    if (keepLog && Math.abs(t / 0.5 - Math.round(t / 0.5)) < 1e-6) log.push([t, ...N, C]);
  }
  const fin = N[0] + N[1] + N[2];
  return { log, doses, N, cleared, cured: fin < 1, resistant: fin >= 1 && N[2] / fin > 0.5, relapsed: fin >= 1, T };
}
// a virus infection: rises and is cleared by the immune system, whatever the antibiotic does
const virusLoad = t => 1e8 * Math.exp(-Math.pow((t - 72) / 40, 2));

// ---------------- The page ----------------
const P = { drug: "amox", doseX: 1, days: 7, stop: 0, miss: 0, n0: 1e8, pre: 0, virus: false };
let rnd = K.rng(Date.now() % 99991 + 61), run = null, t = 0, speed = 1, cells = [];
const ui = K.app({
  title: "Antibiotic Resistance", subject: "Biology and medicine",
  blurb: "Natural selection inside one patient: bacteria, the drug level and the immune system",
  reset: () => set({}),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Biology (4BI1): antibiotics kill bacteria but not viruses; resistant bacteria arise by mutation and are selected when antibiotics are used; completing the course and not over-prescribing (3(c) evolution, 2(h)/5(d) medicine).", adv: "OCR A level Biology A (H420) 4.1.1 communicable diseases and antibiotics, 4.2.2 evolution: mutation, variation and selection pressure; antibiotic resistance (MRSA), and how prescribing practice affects it. MIC, pharmacokinetics and the mutant selection window are beyond the spec." } },
  missions: [
    { title: "A full course", q: "Treat the infection with a full 7-day course. Watch the bacteria (log scale) and the drug level. Why do some bacteria survive the first few doses?", hint: "Each dose pushes the drug above the MIC for a few hours and kills sensitive bacteria fast; between doses the level falls and survivors start dividing again. Over a week the numbers fall below about a thousand, and the immune system finishes them off. A few partly resistant mutants may appear but are killed too.", setup() { set({}); } },
    { title: "Stopping when you feel better", q: "The patient feels better after 3 days and stops. What happens over the next week? Which strain comes back?", hint: "Feeling better means the numbers have fallen below the 'feels ill' level, not that every bacterium is dead. If the survivors are too many for the immune system, they grow back, and the most resistant ones were the most likely to survive: they make up more of the relapse. Run it several times: chance decides each patient.", setup() { set({ stop: 3 }); } },
    { title: "Missed doses", q: "Set the patient to miss 40% of doses. Compare with a full course.", hint: "Missed doses leave long gaps with the drug below the MIC, when bacteria multiply freely. Treatment often fails, and partly resistant strains get a head start. The batch run 'Missed doses' shows how the chance of cure falls.", setup() { set({ miss: 0.4 }); } },
    { title: "Antibiotics for a cold", q: "Treat a virus (a cold) with antibiotics. Does the antibiotic change how long it lasts?", hint: "No: antibiotics act on bacterial cell walls, ribosomes and enzymes, which viruses do not have. The immune system clears the virus in about a week either way. Using antibiotics for viral infections only gives bacteria elsewhere in the body more chances to evolve resistance.", setup() { set({ virus: true }); } },
    { title: "Resistance caught from someone else", q: "Start with 0.1% of the bacteria already resistant (caught from another person). Does a full course still work?", hint: "The sensitive majority is killed, but the resistant ones are hardly touched by the drug and soon take over: the infection returns, now almost entirely resistant. A different antibiotic is needed. This is how resistant strains like MRSA spread in hospitals.", setup() { set({ pre: 0.001 }); } },
    { lvl: "adv", title: "The mutant selection window", q: "Halve the dose of the doxycycline-like drug. Look at where the drug level sits between the MIC lines.", hint: "When the level sits above the sensitive MIC but below the partly resistant MIC for long periods (the mutant selection window), sensitive bacteria die while partly resistant mutants grow: ideal conditions for selecting resistance. High enough doses keep levels above the resistant mutants' MIC, closing the window.", setup() { set({ drug: "doxy", doseX: 0.5 }); } },
    { lvl: "adv", title: "Half-life and dosing", q: "Compare the amoxicillin-like drug (half-life 1 h, every 8 h) with the doxycycline-like one (18 h, once a day). Which spends more time above the MIC?", hint: "A short half-life gives high peaks but long troughs below the MIC; a long half-life gives steadier levels. What matters for many antibiotics is the time above the MIC (or the area under the curve above it), which is why dosing intervals differ between drugs.", setup() { set({ drug: "amox" }); } }
  ],
  batch: [
    { title: "Stopping early", question: "What is the chance of a cure if the patient stops taking a 7-day course after a given number of days?", how: "Amoxicillin-like drug, 10⁸ bacteria at the start; 25 patients for each day of stopping (7 = the full course). Each patient scores 1 if cured, 0 if not, so the mean is the chance of cure.", xLabel: "day the patient stops", yLabel: "chance of cure (%)", xs: [1, 2, 3, 4, 5, 6, 7], reps: 25, yMin: 0, yMax: 105, run: (x, r) => 100 * (patient(Object.assign({}, P, { drug: "amox", stop: x === 7 ? 0 : x, pre: 0, miss: 0, doseX: 1, virus: false, n0: 1e8 }), r, false).cured ? 1 : 0), note: "Stopping in the first few days usually fails, even though the patient may feel better: the survivors grow back. Each point is a proportion of 25 patients, so it scatters by about ±10%." },
    { title: "Low doses select resistance", question: "How often does the infection end up mostly resistant (partly or fully) when the dose is too low?", how: "Doxycycline-like drug, full 7-day course, 10⁹ bacteria at the start; dose 0.25 to 2 times the usual; 20 patients each. Scores 1 if the bacteria left at the end are mostly partly or fully resistant.", xLabel: "dose (× usual)", yLabel: "ends mostly resistant (%)", xs: [0.25, 0.5, 0.75, 1, 1.5, 2], reps: 20, yMin: 0, yMax: 105, run: (x, r) => { const q = patient(Object.assign({}, P, { drug: "doxy", doseX: x, stop: 0, miss: 0, pre: 0, virus: false, n0: 1e9 }), r, false), f = q.N[0] + q.N[1] + q.N[2]; return 100 * (f >= 1 && q.N[1] + q.N[2] > q.N[0] ? 1 : 0); }, note: "Low doses sit in the mutant selection window: the drug holds back the sensitive bacteria but not the rare mutants, which take over. Adequate doses kill the mutants too." },
    { title: "Missed doses", question: "How does the chance of cure fall as more doses are missed?", how: "Full 7-day course of the amoxicillin-like drug; each dose missed with the chosen chance; 25 patients each.", xLabel: "doses missed (%)", yLabel: "chance of cure (%)", xs: [0, 10, 20, 30, 40, 50, 60], reps: 25, yMin: 0, yMax: 105, run: (x, r) => 100 * (patient(Object.assign({}, P, { drug: "amox", miss: x / 100, stop: 0, pre: 0, doseX: 1, virus: false, n0: 1e8 }), r, false).cured ? 1 : 0), note: "A few missed doses are tolerated; many are not." },
    { title: "Resistance already present", question: "If some bacteria are already resistant at the start, how often does a full course fail?", how: "Amoxicillin-like drug, full course; share resistant at the start from 0 to 1% (log steps); 20 patients each.", xLabel: "log₁₀ (share resistant at the start)", yLabel: "treatment fails (%)", xs: [-8, -7, -6, -5, -4, -3, -2], reps: 20, yMin: 0, yMax: 105, run: (x, r) => 100 * (patient(Object.assign({}, P, { drug: "amox", pre: Math.pow(10, x), stop: 0, miss: 0, doseX: 1, virus: false, n0: 1e8 }), r, false).cured ? 0 : 1), note: "With 10⁸ bacteria, a share of 10⁻⁸ is about one resistant cell; occasionally the immune system catches it, but almost always it survives the drug and multiplies, and the infection returns, resistant. Once resistance is in an infection, the same antibiotic will not cure it." },
    { lvl: "adv", title: "Dose and cure", question: "How does the chance of cure depend on the dose of the doxycycline-like drug?", how: "Full 7-day course, 10⁹ bacteria; dose from 0.25 to 3 times the usual; 20 patients each.", xLabel: "dose (× usual)", yLabel: "chance of cure (%)", xs: [0.25, 0.5, 0.75, 1, 1.5, 2, 3], reps: 20, yMin: 0, yMax: 105, run: (x, r) => 100 * (patient(Object.assign({}, P, { drug: "doxy", doseX: x, stop: 0, miss: 0, pre: 0, virus: false, n0: 1e9 }), r, false).cured ? 1 : 0), note: "Too low a dose keeps the drug in the mutant selection window: cure is unreliable and resistance is selected. Higher doses cure more reliably (but real drugs have side effects that limit the dose)." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4BI1", text: "Antibiotics kill bacteria (or stop them growing) but do not affect viruses." },
      { lvl: "std", tag: "4BI1 3.39", text: "Resistance arises by random mutation. When an antibiotic is used, resistant bacteria survive and reproduce, passing on the resistance: natural selection. Their numbers increase." },
      { lvl: "std", tag: "4BI1", text: "To slow the spread of resistance: finish the course, do not use antibiotics for viral infections, limit their use in farming, and keep good hygiene in hospitals." },
      { lvl: "adv", tag: "H420 4.1.1", text: "Resistant strains such as MRSA and C. difficile are a major problem in hospitals; the development of new antibiotics is slow and expensive." },
      { lvl: "adv", tag: "H420 4.2.2", text: "Selection pressure: the antibiotic is the selective agent; variation already exists in the population (or arises by mutation); the advantageous allele increases in frequency." },
      { lvl: "beyond", tag: "Beyond the spec", text: "MIC: the lowest concentration that stops growth. The mutant selection window lies between the MIC of the sensitive strain and that of resistant mutants; drug levels there select resistance." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: "Explain why antibiotics should not be prescribed for colds.", ans: "<ul><li>colds are caused by viruses, which antibiotics do not affect</li><li>unnecessary use increases the chance of resistant bacteria being selected</li></ul>" },
      { lvl: "std", marks: 4, q: "Explain how a population of bacteria can become resistant to an antibiotic.", ans: "<ul><li>a random mutation gives some bacteria resistance</li><li>the antibiotic kills the non-resistant bacteria</li><li>resistant bacteria survive and reproduce (no competition)</li><li>they pass on the allele, so the resistant population grows</li></ul>" },
      { lvl: "std", marks: 2, q: "Explain why patients should finish a course of antibiotics even when they feel better.", ans: "<ul><li>some bacteria (possibly the more resistant ones) may still be alive</li><li>they could multiply again, and the infection returns, more resistant</li></ul>" },
      { lvl: "std", marks: 2, q: () => { const fin = run.N[0] + run.N[1] + run.N[2]; return `In this patient, ${fin < 1 ? "all the bacteria were cleared" : `${K.sig(fin, 2)} bacteria remain, ${Math.round(100 * run.N[2] / Math.max(1, fin))}% of them resistant`}. Use the graphs to suggest why.`; }, ans: "<ul><li>refer to whether the drug level stayed above the MIC of each strain</li><li>and whether the course was completed / doses missed</li></ul>" },
      { lvl: "adv", marks: 3, q: "Bacteria divide every 30 minutes and a mutation giving resistance arises once in 10⁸ divisions. Explain why an infection of 10⁹ bacteria almost certainly contains resistant mutants.", ans: "<ul><li>producing 10⁹ bacteria takes about 10⁹ divisions</li><li>expected mutants = 10⁹ × 10⁻⁸ = about 10</li><li>so several resistant cells are likely present before treatment starts</li></ul>" }
    ]
  },
  notes: `<h3>What is being modelled</h3>
<ul><li><b>Bacteria</b>: three strains. Each divides at 0.7 per hour (resistant strains a little slower: resistance has a cost), slowing as the total approaches 10¹⁰. The MIC of the partly resistant strain is 4 times, and of the resistant strain 32 times, that of the sensitive one. Each division has a 10⁻¹⁰ chance of producing the next, more resistant strain.</li>
<li><b>Antibiotic</b>: each dose adds dose ÷ volume of distribution to the concentration, which then halves every half-life. The kill rate is kmax × C² ÷ (C² + MIC²), with kmax 1.85, 0.9 and 0.9 per hour for the three drugs, so it is strong well above the MIC and weak below it.</li>
<li><b>Immune system</b>: kills 0.3 per hour when bacteria are few, much less when they are many (× 1 ÷ (1 + N/10⁵)).</li>
<li>When a strain has fewer than 10 000 cells, its births, deaths and mutations are random (Poisson); otherwise they are averages. A patient is cured when no bacteria are left.</li>
<li><b>Virus</b>: an illustrative viral load that the immune system clears in about a week; antibiotics have no effect on it.</li></ul>
<h3>Simplifications</h3>
<ul><li>One well-mixed infection site; no bacteria sharing resistance genes (plasmids), no biofilms, no different tissues.</li>
<li>Drug numbers are 'like' real antibiotics, not real prescribing data.</li>
<li>The earlier version had more presets and a batch settings table; they are not in this version.</li></ul>
<p>The earlier version of this simulation, with its worksheets, is kept in <a href="original/antibiotic-resistance.html">original/antibiotic-resistance.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("The infection");
ctl.virus = K.seg(g, { label: "What is making the patient ill?", value: false, options: [[false, "Bacteria"], [true, "A virus (a cold)"]], on: v => { P.virus = v; newRun(); } });
ctl.n0 = K.slider(g, { label: "Bacteria at the start", min: 5, max: 10, step: 0.5, value: 8, fmt: v => "10^" + v, on: v => { P.n0 = Math.pow(10, v); newRun(); } });
ctl.pre = K.slider(g, { label: "Already resistant at the start", min: -9, max: -2, step: 0.5, value: -9, fmt: v => v <= -9 ? "none" : "10^" + v + " of them", on: v => { P.pre = v <= -9 ? 0 : Math.pow(10, v); newRun(); } });
g = ui.group("The prescription");
ctl.drug = K.seg(g, { value: "amox", options: Object.entries(DRUGS).map(([k, d]) => [k, d.name]), on: v => { P.drug = v; newRun(); } });
const drugNote = K.note(g, "");
ctl.doseX = K.slider(g, { label: "Dose", min: 0.25, max: 3, step: 0.25, value: 1, fmt: v => "× " + v + " the usual", on: v => { P.doseX = v; newRun(); } });
ctl.days = K.slider(g, { label: "Course length", min: 3, max: 14, step: 1, value: 7, unit: "days", on: v => { P.days = v; newRun(); } });
g = ui.group("The patient");
ctl.stop = K.slider(g, { label: "Stops taking it after", min: 0, max: 13, step: 1, value: 0, fmt: v => v ? `day ${v}` : "finishes the course", on: v => { P.stop = v; newRun(); } });
ctl.miss = K.slider(g, { label: "Misses doses", min: 0, max: 0.8, step: 0.05, value: 0, fmt: v => Math.round(v * 100) + "%", on: v => { P.miss = v; newRun(); } });
K.btn(K.row(g), "↺ A new patient (same treatment)", () => newRun(), "primary");
g = ui.group("Watch");
ctl.speed = K.slider(g, { label: "Speed", min: 0.5, max: 24, step: 0.5, value: 6, fmt: v => v + " hours a second", on: v => speed = v });
const read = K.readout(g, [["day", "day"], ["bact", "bacteria"], ["res", "resistant share"], ["drug", "drug level"], ["feel", "patient"], ["out", "outcome so far"]]);
function newRun() { run = patient(P, rnd); t = 0; cells = []; drugNote.textContent = DRUGS[P.drug].note + `: half-life ${DRUGS[P.drug].half} h, every ${DRUGS[P.drug].every} h.`; }
function set(o) { Object.assign(P, { drug: "amox", doseX: 1, days: 7, stop: 0, miss: 0, n0: 1e8, pre: 0, virus: false }, o); ctl.drug.set(P.drug); ctl.virus.set(P.virus); ctl.doseX.set(P.doseX); ctl.days.set(P.days); ctl.stop.set(P.stop); ctl.miss.set(P.miss); ctl.n0.set(Math.log10(P.n0)); ctl.pre.set(P.pre ? Math.log10(P.pre) : -9); speed = 6; ctl.speed.set(6); newRun(); }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, { title: "Bacteria (log scale)", xLabel: "day", yLabel: "log₁₀ number" }), chB = K.chart(ui.dock, { title: "Drug level and the MIC of each strain", xLabel: "day", yLabel: "mg/L" });
const T = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function stateAt(tt) { const L = run.log, i = Math.min(L.length - 1, Math.max(0, Math.round(tt / 0.5) - 1)); return L[i] || [0, 0, 0, 0, 0]; }
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h, s = stateAt(t), D = DRUGS[P.drug], C = s[4], tot = s[1] + s[2] + s[3], load = P.virus ? virusLoad(t) : tot;
  c.fillStyle = `rgb(${11},${16 + Math.min(40, C / D.mic * 4)},${32 + Math.min(80, C / D.mic * 8)})`; c.fillRect(0, 0, w, h);
  // the tissue sample: up to 400 drawn cells, in proportion to the strains, more when there are more bacteria (log scale)
  const nDraw = load < 1 ? 0 : Math.min(400, Math.round(40 * Math.log10(load + 1))), cellsWanted = P.virus ? [nDraw, 0, 0] : [0, 1, 2].map(i => tot > 0 ? Math.round(nDraw * s[i + 1] / tot) : 0);
  for (let i = 0; i < 3; i++) { const have = cells.filter(q => q.i === i); while (have.length < cellsWanted[i]) { const q = { i, x: Math.random() * w, y: 40 + Math.random() * (h - 80), a: Math.random() * 6.3 }; cells.push(q); have.push(q); } while (have.length > cellsWanted[i]) { const q = have.pop(); cells.splice(cells.indexOf(q), 1); } }
  for (const q of cells) { q.x += Math.sin(q.a += 0.02) * 0.3; c.save(); c.translate(q.x, q.y); c.rotate(q.a); c.fillStyle = P.virus ? "#c58cff" : STR[q.i].col; if (P.virus) { c.beginPath(); c.arc(0, 0, 3, 0, 6.3); c.fill(); } else { c.beginPath(); c.roundRect(-7, -2.5, 14, 5, 2.5); c.fill(); } c.restore(); }
  for (let k = 0; k < 6; k++) { c.fillStyle = "rgba(240,240,255,0.35)"; c.beginPath(); c.arc((k * 197 + t * 8) % w, 60 + (k * 131) % (h - 120), 14, 0, 6.3); c.fill(); }   // white blood cells
  T(c, `day ${(t / 24).toFixed(1)}`, 20, 30, "#eef2f8", "left", "600 15px");
  let kx = 20; for (const st of P.virus ? [{ col: "#c58cff", name: "virus" }] : STR) { c.fillStyle = st.col; c.fillRect(kx, h - 18, 12, 6); T(c, st.name, kx + 16, h - 11, "#aab6cc", "left", "11.5px"); kx += 140; } c.fillStyle = "rgba(240,240,255,0.5)"; c.beginPath(); c.arc(kx + 6, h - 15, 6, 0, 6.3); c.fill(); T(c, "white blood cell", kx + 16, h - 11, "#aab6cc", "left", "11.5px");
  T(c, "blue tint = antibiotic", w - 20, h - 11, "#6fb1ff", "right", "11.5px");
}

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => { if (!(dt > 0)) return; t = Math.min(run.T, t + dt * speed); }, () => {
  draw(); if (frame++ % 5) return;
  const L = run.log.filter(q => q[0] <= t), D = DRUGS[P.drug], lg = v => v >= 1 ? Math.log10(v) : NaN;
  const ser = P.virus ? [{ pts: L.map(q => [q[0] / 24, lg(virusLoad(q[0]))]), color: "#c58cff", label: "virus" }] : STR.map((st, i) => ({ pts: L.map(q => [q[0] / 24, lg(q[i + 1])]), color: st.col, label: st.name }));
  chA.draw(ser, { xMin: 0, xMax: run.T / 24, yMin: 0, yMax: 10.5, hlines: [{ y: Math.log10(ILL), color: "#ff8a70", label: "feels ill above this" }] });
  const doseLines = run.doses.filter(d => d.t <= t).map(d => ({ x: d.t / 24, color: d.taken ? "rgba(111,177,255,0.35)" : "rgba(255,93,108,0.6)", dash: d.taken ? [2, 3] : [6, 2] }));
  chB.draw([{ pts: L.map(q => [q[0] / 24, q[4]]), color: "#6fb1ff", width: 2.4, label: "drug level" }], { xMin: 0, xMax: run.T / 24, yMin: 0, yMax: Math.max(D.mic * 70, ...run.log.map(q => q[4])) * 1.05, vlines: doseLines, hlines: STR.map(st => ({ y: D.mic * st.micX, color: st.col, label: "MIC " + st.name })) });
  const s = stateAt(t), tot = s[1] + s[2] + s[3], ill = P.virus ? virusLoad(t) > ILL * 0.3 : tot > ILL;
  read.set("day", (t / 24).toFixed(1)); read.set("bact", P.virus ? "(virus)" : tot < 1 ? "none" : K.sig(tot, 2)); read.set("res", tot >= 1 ? Math.round(100 * s[3] / tot) + "%" : "–"); read.set("drug", s[4].toFixed(2) + " mg/L"); read.set("feel", ill ? "ill" : "feels fine");
  read.set("out", t < run.T ? (tot < 1 && !P.virus ? "cleared" : "…") : P.virus ? "virus cleared by the immune system" : run.cured ? "cured" : run.resistant ? "relapse: resistant" : "relapse");
  ui.hud(P.virus ? "Antibiotics have no effect on viruses" : `${tot < 1 ? "<b>no bacteria left</b>" : `${K.sig(tot, 2)} bacteria`}<br>doses taken: ${run.doses.filter(d => d.t <= t && d.taken).length}, missed: ${run.doses.filter(d => d.t <= t && !d.taken).length}`);
});
set({});
ui.tip("Bacteria are coloured by strain: green sensitive, yellow partly resistant, red resistant · 1 second = 6 hours", 7000);
