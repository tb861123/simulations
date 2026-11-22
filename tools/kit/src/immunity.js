/* =====================================================================
   IMMUNITY AND VACCINATION
   When a pathogen gets past the skin and mucus:
     • PHAGOCYTES engulf and digest pathogens (non-specific, fast);
     • LYMPHOCYTES recognise the pathogen's ANTIGENS. The matching
       lymphocytes divide (CLONAL EXPANSION) and become plasma cells that
       release ANTIBODIES specific to that antigen. Antibodies clump
       pathogens together and help phagocytes find them.
     • Some become MEMORY CELLS. Next time the same pathogen arrives the
       response is FASTER and BIGGER (the secondary response), so we
       don't fall ill: we are IMMUNE.
   VACCINATION puts harmless antigens in the body (a dead or weakened
   pathogen, or part of one), so memory cells form without illness.
   Antibiotics kill bacteria, but not viruses.
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
const PATHOGENS = { bact: { name: "bacterium (e.g. Salmonella)", r: 1.5, abx: true, col: "#7ee787" }, virus: { name: "virus (e.g. flu)", r: 1.8, abx: false, col: "#ff8a70" }, fungus: { name: "fungus (e.g. athlete's foot)", r: 0.8, abx: false, col: "#e8d43a" }, prot: { name: "protoctist (e.g. malaria)", r: 1.2, abx: false, col: "#c9a0ff" } };
// The smooth model, day by day. P: pathogen load (1 = enough to make you ill), C: plasma-cell clone, A: antibody level.
// After a lag (about a week first time, a day with memory cells) the clone divides for 5 days, then the plasma cells die away.
// o = { T (days), events: [{ t, type: infect|vaccine|passive|antibiotic, dose }], pathogen, g (clone growth ×), memK (memory ×), phago (×), mem (starting memory) }
function body(o) {
  const dt = 0.02, out = [], ev = (o.events || []).slice().sort((a, b) => a.t - b.t), path = PATHOGENS[o.pathogen || "bact"], g = 1.15 * (o.g || 1), ph = 0.5 * (o.phago || 1);
  let P = 0, C = 0, A = 0, H = 0, exp = -1, vac = 0, mem = o.mem || 1, abx = false, ill = 0; const peaks = [];
  for (let t = 0; t <= o.T; t += dt) {
    while (ev.length && ev[0].t <= t + 1e-9) { const e = ev.shift(); if (e.type === "infect") P += e.dose; if (e.type === "vaccine") vac += 1; if (e.type === "passive") A += e.dose; if (e.type === "antibiotic") abx = true; }
    const ag = P + vac, lag = mem > 1 ? 1.0 : 7;
    if (exp < 0) { H = Math.max(0, H + dt * (ag > 0.002 ? 1 / lag : -0.2)); if (H >= 1) { exp = 0; C = mem; } }
    else if (exp < 5) { C += dt * g * C; exp += dt; if (exp >= 5) mem = Math.max(mem, 8 * (o.memK || 1)); }
    else { C -= dt * 0.4 * C; if (C < 0.5 && ag < 0.002) { exp = -1; H = 0; C = 0; } }
    A += dt * (0.02 * C - 0.25 * A);
    P += dt * (path.r * P * (1 - P / 50) - ph * P / (1 + P) - 1.2 * A * P - (abx && path.abx ? 3 * P : 0)); if (P < 1e-7) P = 0;
    vac = Math.max(0, vac - dt * vac * 0.35); if (vac < 1e-3) vac = 0;
    if (P > 1) ill += dt;
    if (Math.round(t / dt) % 5 === 0) out.push({ t, P, A, C, mem });
  }
  // antibody peaks: local maxima of the antibody level (above 0.2) over a ±1 day window
  for (let i = 10; i < out.length - 10; i++) { const a = out[i].A; if (a > 0.2 && out.slice(i - 10, i + 11).every(q => q.A <= a)) { if (!peaks.length || out[i].t - peaks[peaks.length - 1][0] > 3) peaks.push([out[i].t, a]); } }
  return { out, ill, peaks, mem };
}
const avg = o => body(Object.assign({ g: 1, memK: 1, phago: 1 }, o));
const person = (r, o) => body(Object.assign({ g: 1 + 0.08 * r.gauss(), memK: Math.max(0.3, 1 + 0.2 * r.gauss()), phago: Math.max(0.3, 1 + 0.2 * r.gauss()) }, o));
const SCENES = {
  first: { label: "First infection", T: 40, ev: [{ t: 2, type: "infect", dose: 0.01 }] },
  again: { label: "Infected again 60 days later", T: 100, ev: [{ t: 2, type: "infect", dose: 0.01 }, { t: 62, type: "infect", dose: 0.01 }] },
  vaccine: { label: "Vaccinated, then infected", T: 80, ev: [{ t: 2, type: "vaccine" }, { t: 42, type: "infect", dose: 0.01 }] },
  passive: { label: "Antibody injection (passive), then infected twice", T: 100, ev: [{ t: 2, type: "passive", dose: 3 }, { t: 7, type: "infect", dose: 0.01 }, { t: 70, type: "infect", dose: 0.01 }] },
  antibiotic: { label: "Infected, antibiotics on day 5", T: 40, ev: [{ t: 2, type: "infect", dose: 0.01 }, { t: 7, type: "antibiotic" }] },
  weak: { label: "Weakened immune system (e.g. HIV)", T: 40, ev: [{ t: 2, type: "infect", dose: 0.01 }], g: 0.65 }
};

// ---------------- The page ----------------
const P = { scene: "first", pathogen: "bact", dose: 0.01, speed: 2 };
let res = null, day = 0, rnd = K.rng(Date.now() % 9973 + 7), cells = [];
const ui = K.app({
  title: "Immunity and Vaccination", subject: "Biology",
  blurb: "Phagocytes, lymphocytes and antibodies fight an infection; memory cells, vaccination and why the second response is faster",
  reset: () => set({}),
  levels: { std: "Standard (iGCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Biology (4BI1): pathogens (bacteria, viruses, fungi, protoctists) and 2(h) the immune system: phagocytes ingest pathogens, lymphocytes release antibodies specific to the pathogen, vaccination and memory cells (antibodies produced sooner, faster and in greater quantity).", adv: "OCR A level Biology A (H420) 4.1.1: non-specific defences and phagocytosis, the specific immune response (clonal selection and expansion; T helper, T killer, B, plasma and memory cells), antibodies (opsonins, agglutinins, antitoxins), primary and secondary responses, active and passive, natural and artificial immunity, vaccination, antibiotics." } },
  missions: [
    { title: "A first infection", q: "Watch a first infection with bacteria. Why does the person fall ill before the antibodies rise?", hint: "Phagocytes act at once but cannot keep up; specific lymphocytes take about a week to be activated and divide, so antibodies only rise after the pathogen has multiplied: several days of illness.", setup() { set({ scene: "first" }); } },
    { title: "The second time", q: "The same pathogen arrives again 60 days later. Compare the two antibody responses.", hint: "Memory cells respond within a day: the secondary response is faster, bigger (about 8 times here) and lasts longer, so the pathogen is destroyed before it causes illness. You are immune.", setup() { set({ scene: "again" }); } },
    { title: "Vaccination", q: "Vaccinate, then infect 40 days later. Is the person ill at all?", hint: "The vaccine's antigens trigger a primary response and memory cells without illness, so the real infection meets a secondary response.", setup() { set({ scene: "vaccine" }); } },
    { title: "Antibiotics and viruses", q: "Give antibiotics on day 5 for a bacterial infection, then for a virus. What is the difference?", hint: "Antibiotics kill bacteria (or stop them growing), so the bacterial infection ends sooner; they do nothing to viruses, which live inside our cells. Overusing them selects for resistant bacteria.", setup() { set({ scene: "antibiotic", pathogen: "bact" }); } },
    { title: "A big dose", q: "Increase the number of pathogens that get in. What happens to the illness?", hint: "A bigger dose reaches the illness threshold sooner, before the lymphocytes have responded, so the illness is longer. Hygiene reduces the dose.", setup() { set({ scene: "first", dose: 1 }); } },
    { lvl: "adv", title: "Passive immunity", q: "Inject antibodies, then infect twice. Why does the protection not last?", hint: "Passive immunity: ready-made antibodies protect at once but are broken down within weeks, and no memory cells form, so a later infection is a primary response. (Active immunity, from infection or vaccination, makes memory cells.)", setup() { set({ scene: "passive" }); } },
    { lvl: "adv", title: "A weakened immune system", q: "Make the clonal expansion weaker (as with HIV killing T helper cells). What happens?", hint: "Fewer B cells are activated and they divide more slowly, so antibodies stay low and the infection lasts much longer: opportunistic infections.", setup() { set({ scene: "weak" }); } }
  ],
  batch: [
    { title: "How much bigger is the secondary response?", question: "Across 200 people, how many times bigger is the second antibody peak than the first?", how: "Infection, then the same pathogen 60 days later; each person's clone growth (±8%), memory and phagocytes (±20%) vary.", yLabel: "secondary ÷ primary antibody peak", reps: 200, bins: 24, theory: avg({ T: 100, events: SCENES.again.ev }).peaks.map(p => p[1]).reduce((a, b) => b / a), theoryLabel: "average person", run: (x, r) => { const b = person(r, { T: 100, events: SCENES.again.ev }); return b.peaks.length > 1 ? b.peaks[1][1] / b.peaks[0][1] : null; }, note: "Usually several times bigger, with a lopsided spread: people whose first response was weak gain most from their memory cells." },
    { title: "Time to the antibody peak", question: "How long after re-infection does the antibody level peak, for different gaps between infections?", how: "Average person; days from the second infection to the second peak.", xLabel: "days between infections", yLabel: "days to the second peak", xs: [30, 40, 60, 120, 200, 300], reps: 3, yMin: 0, theory: gap => { const b = avg({ T: gap + 40, events: [{ t: 2, type: "infect", dose: 0.01 }, { t: 2 + gap, type: "infect", dose: 0.01 }] }); return b.peaks[1] ? b.peaks[1][0] - 2 - gap : NaN; }, theoryLabel: "average person", run: (gap, r) => { const b = person(r, { T: gap + 40, events: [{ t: 2, type: "infect", dose: 0.01 }, { t: 2 + gap, type: "infect", dose: 0.01 }] }); return b.peaks[1] ? b.peaks[1][0] - 2 - gap : null; }, note: "About a week, whatever the gap: memory cells last for years. The first peak takes about two weeks." },
    { title: "Bigger doses, more illness", question: "How many days is someone ill, for different doses of pathogen?", how: "First infection; each person varies; dose relative to the usual.", xLabel: "log₁₀(dose ÷ usual)", yLabel: "days ill", xs: [-1, 0, 1, 2, 3], reps: 20, yMin: 0, theory: x => avg({ T: 40, events: [{ t: 2, type: "infect", dose: 0.01 * 10 ** x }] }).ill, theoryLabel: "average person", run: (x, r) => person(r, { T: 40, events: [{ t: 2, type: "infect", dose: 0.01 * 10 ** x }] }).ill, note: "More pathogens reach the illness threshold sooner, before the specific response arrives." },
    { title: "Does vaccination protect against big doses?", question: "How many days is a vaccinated person ill, for different doses?", how: "Vaccinated 40 days before the infection.", xLabel: "log₁₀(dose ÷ usual)", yLabel: "days ill", xs: [-1, 0, 1, 2, 3], reps: 20, yMin: 0, theory: x => avg({ T: 80, events: [{ t: 2, type: "vaccine" }, { t: 42, type: "infect", dose: 0.01 * 10 ** x }] }).ill, theoryLabel: "average person", run: (x, r) => person(r, { T: 80, events: [{ t: 2, type: "vaccine" }, { t: 42, type: "infect", dose: 0.01 * 10 ** x }] }).ill, note: "Vaccinated people are protected against normal doses; only a huge dose can outrun the secondary response." },
    { title: "Antibiotics: bacteria or virus?", question: "Do antibiotics shorten the illness?", how: "Antibiotics from day 5. 1 bacterium, no antibiotics; 2 bacterium + antibiotics; 3 virus, no antibiotics; 4 virus + antibiotics.", xLabel: "case", yLabel: "days ill", xs: [1, 2, 3, 4], reps: 20, yMin: 0, theory: x => avg({ T: 40, pathogen: x <= 2 ? "bact" : "virus", events: [{ t: 2, type: "infect", dose: 0.01 }].concat(x % 2 === 0 ? [{ t: 7, type: "antibiotic" }] : []) }).ill, theoryLabel: "average person", run: (x, r) => person(r, { T: 40, pathogen: x <= 2 ? "bact" : "virus", events: [{ t: 2, type: "infect", dose: 0.01 }].concat(x % 2 === 0 ? [{ t: 7, type: "antibiotic" }] : []) }).ill, note: "Antibiotics cut a bacterial illness short but make no difference to a virus." },
    { title: "How long does passive immunity last?", question: "If someone is given antibodies and then infected, how ill are they, for different delays?", how: "Antibody injection on day 2; infection after the delay; average person with varied responses.", xLabel: "days from the injection to the infection", yLabel: "days ill", xs: [5, 10, 20, 30, 40, 60], reps: 10, yMin: 0, theory: d => avg({ T: d + 40, events: [{ t: 2, type: "passive", dose: 3 }, { t: 2 + d, type: "infect", dose: 0.01 }] }).ill, theoryLabel: "average person", run: (d, r) => person(r, { T: d + 40, events: [{ t: 2, type: "passive", dose: 3 }, { t: 2 + d, type: "infect", dose: 0.01 }] }).ill, note: "Protection fades within weeks as the injected antibodies are broken down: no memory cells are made." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4BI1 1", text: "Pathogens are microorganisms that cause disease: bacteria, viruses, fungi and protoctists." },
      { lvl: "std", tag: "4BI1 2(h)", text: "Phagocytes engulf and digest pathogens. Lymphocytes produce antibodies that are specific to the antigens on a pathogen." },
      { lvl: "std", tag: "4BI1 2(h)", text: "Memory cells remain after an infection. On a second infection, antibodies are produced sooner, faster and in greater quantity, so the person does not fall ill: immunity." },
      { lvl: "std", tag: "4BI1 2(h)", text: "Vaccination: a harmless form of the antigen stimulates lymphocytes to make antibodies and memory cells, without illness." },
      { lvl: "beyond", tag: "Not 4BI1 wording", text: "Antibiotics kill bacteria (or stop them reproducing) but do not affect viruses." },
      { lvl: "adv", tag: "H420 4.1.1", text: "Specific response: clonal selection (the B cell with the matching receptor), T helper cells release cytokines, clonal expansion, plasma cells secrete antibodies, memory cells. T killer cells destroy infected cells." },
      { lvl: "adv", tag: "H420 4.1.1", text: "Antibodies: opsonins (mark pathogens for phagocytes), agglutinins (clump pathogens), antitoxins (neutralise toxins). Structure: two heavy and two light chains, variable regions bind the antigen." },
      { lvl: "adv", tag: "H420 4.1.1", text: "Active immunity (your own antibodies and memory cells: natural infection or artificial vaccination) lasts; passive immunity (antibodies given: placenta, breast milk or injection) is immediate but short-lived." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: "Explain why a person who has had measles does not usually catch it again.", ans: "<ul><li>memory cells remain from the first infection</li><li>on a second infection antibodies are produced faster and in larger amounts</li><li>the virus is destroyed before symptoms develop</li></ul>" },
      { lvl: "std", marks: 2, q: "Explain why antibiotics should not be used to treat a cold.", ans: "<ul><li>colds are caused by viruses</li><li>antibiotics do not kill viruses (and overuse leads to resistant bacteria)</li></ul>" },
      { lvl: "adv", marks: 4, q: "Describe the events from the entry of a bacterium to the production of antibodies in a primary immune response.", ans: "<ul><li>phagocytes engulf the bacterium and present its antigens</li><li>T helper cells with the matching receptor are activated and release cytokines</li><li>the matching B cells are selected and divide (clonal expansion)</li><li>they become plasma cells that secrete antibodies; memory cells also form</li></ul>" },
      { lvl: "adv", marks: 3, q: () => { const r = res; return r && r.peaks.length > 1 ? `On screen the first antibody peak is ${r.peaks[0][1].toFixed(1)} and the second ${r.peaks[1][1].toFixed(1)} (arbitrary units). Calculate how many times bigger the secondary response is and explain the difference.` : "Explain why the secondary immune response is faster and larger than the primary response."; }, ans: () => { const r = res; return `<ul>${r && r.peaks.length > 1 ? `<li>${r.peaks[1][1].toFixed(1)} ÷ ${r.peaks[0][1].toFixed(1)} = ${(r.peaks[1][1] / r.peaks[0][1]).toFixed(1)} times</li>` : ""}<li>many memory cells specific to the antigen already exist</li><li>they are activated quickly and divide into many plasma cells</li></ul>`; } }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li>A smooth, day-by-day model of one body. Pathogen load P grows (rate r: bacteria 1.5, viruses 1.8, fungi 0.8, protoctists 1.2 per day, up to a ceiling) and is removed by phagocytes (fast but easily overwhelmed) and by antibodies (in proportion to the antibody level). P > 1 counts as being ill.</li>
<li>Lymphocytes: once antigen is present the matching cells are activated after a lag (7 days the first time, 1 day with memory cells), then divide for 5 days (clonal expansion) into plasma cells, which make antibodies and then die away. Memory: after a response the starting clone is 8 times bigger.</li>
<li>Vaccine: antigen without growth, removed over a few days. Passive immunity: antibodies added directly. Antibiotics: an extra death rate for bacteria only.</li>
<li>People differ: in batch runs each person's clone growth varies by about 8% and their memory and phagocytes by about 20%.</li>
<li>The tissue picture is drawn from the smooth model (numbers of cells ∝ the model's values); the sizes are arbitrary units, not real counts.</li></ul>
<h3>Left out</h3>
<ul><li>T killer cells and infected-cell death in detail, inflammation and fever, mutation of the pathogen (new flu each year), antibiotic resistance (see Antibiotic Resistance), and spread between people (see Epidemics).</li></ul>
<p>The earlier version of this simulation (an agent model of the tissue and more scenarios), with its worksheets, is kept in <a href="original/immunity.html">original/immunity.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("Scenario");
ctl.scene = K.seg(g, { value: "first", options: Object.entries(SCENES).map(([k, v]) => [k, v.label]), on: v => { P.scene = v; restart(); } });
ctl.pathogen = K.seg(g, { label: "Pathogen", value: "bact", options: Object.entries(PATHOGENS).map(([k, v]) => [k, v.name]), on: v => { P.pathogen = v; restart(); } });
ctl.dose = K.slider(g, { label: "Number of pathogens getting in", min: 0.001, max: 10, step: 0.001, value: 0.01, fmt: v => "× " + (v / 0.01).toPrecision(2) + " the usual", on: v => { P.dose = v; restart(); } });
ctl.speed = K.slider(g, { label: "Speed", min: 0.5, max: 10, step: 0.5, value: 2, unit: "days per second", on: v => P.speed = v });
ui.headerSpeed(ctl.speed);   // playback speed lives in the header, beside Pause and Reset
K.btn(K.row(g), "↺ Start again", () => restart(), "primary");
const read = K.readout(ui.group("Readings"), [["d", "day"], ["p", "pathogens"], ["a", "antibodies"], ["ill", "days ill so far"], ["m", "memory"]]);
function set(o) { Object.assign(P, { scene: "first", pathogen: "bact", dose: 0.01 }, o); ctl.scene.set(P.scene); ctl.pathogen.set(P.pathogen); ctl.dose.set(P.dose); restart(); }
function restart() { const S = SCENES[P.scene]; res = avg({ T: S.T, g: S.g || 1, pathogen: P.pathogen, events: S.ev.map(e => e.type === "infect" ? Object.assign({}, e, { dose: P.dose }) : e) }); day = 0; cells = []; for (let i = 0; i < 12; i++) cells.push({ x: Math.random(), y: 0.3 + 0.6 * Math.random(), kind: "phago", vx: 0, vy: 0 }); }
const stateAt = d => res.out[Math.min(res.out.length - 1, Math.max(0, Math.round(d / 0.1)))];

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function draw(dt) {
  const c = cv.ctx, w = cv.w, h = cv.h, st = stateAt(day), path = PATHOGENS[P.pathogen]; c.fillStyle = "#1a0d14"; c.fillRect(0, 0, w, h);
  // tissue cells and a capillary
  const rng = K.rng(5); for (let i = 0; i < 40; i++) { c.fillStyle = "rgba(255,170,170,.12)"; c.beginPath(); c.ellipse(rng() * w, 40 + rng() * (h - 140), 30, 20, rng() * 3, 0, 6.3); c.fill(); }
  c.fillStyle = "rgba(200,40,60,.35)"; c.fillRect(0, h - 80, w, 50); TX(c, "capillary: phagocytes, lymphocytes and antibodies arrive in the blood", 14, h - 86, "#ffb0b8", "left", "11.5px");
  // pathogens (number ∝ load), antibodies (Y shapes ∝ level), plasma cells (∝ clone, log)
  const nP = Math.min(260, Math.round(st.P * 40)), nA = Math.min(160, Math.round(st.A * 12)), nC = Math.min(30, Math.round(Math.log10(1 + st.C) * 6)), pr = K.rng(11);
  for (let i = 0; i < nP; i++) { const x = (pr() * w + Math.sin(day * 2 + i) * 6), y = 40 + pr() * (h - 150); const clump = st.A > 0.3 && i % 3 === 0; c.fillStyle = path.col; if (P.pathogen === "virus") { c.beginPath(); c.arc(x, y, 3.5, 0, 6.3); c.fill(); } else { c.beginPath(); c.ellipse(x + (clump ? 4 : 0), y, 6, 3, i, 0, 6.3); c.fill(); } }
  for (let i = 0; i < nA; i++) { const x = pr() * w, y = 40 + pr() * (h - 150); c.strokeStyle = "#ffd166"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, y + 5); c.lineTo(x, y); c.lineTo(x - 4, y - 4); c.moveTo(x, y); c.lineTo(x + 4, y - 4); c.stroke(); c.lineWidth = 1; }
  for (let i = 0; i < nC; i++) { const x = 30 + (i * 37) % (w - 60), y = h - 70 + (i % 2) * 18; c.fillStyle = "#5ad1ff"; c.beginPath(); c.arc(x, y, 7, 0, 6.3); c.fill(); TX(c, "B", x, y + 4, "#0a1020", "center", "600 9px"); }
  // phagocytes chase the nearest pathogen positions (drawn as big cells)
  for (const ph of cells) { const tx = 0.5 + 0.4 * Math.sin(day * 0.7 + ph.x * 9), ty = 0.4 + 0.3 * Math.cos(day * 0.5 + ph.y * 7); ph.x += (tx - ph.x) * 0.01; ph.y += (ty - ph.y) * 0.01; c.fillStyle = "rgba(240,240,255,.8)"; c.beginPath(); c.arc(ph.x * w, 40 + ph.y * (h - 160), 13, 0, 6.3); c.fill(); c.fillStyle = "#8a7ad8"; c.beginPath(); c.arc(ph.x * w + 3, 40 + ph.y * (h - 160) - 2, 5, 0, 6.3); c.fill(); }
  const ill = st.P > 1; TX(c, `Day ${day.toFixed(1)}: ${ill ? "ILL (symptoms)" : st.P > 0.01 ? "infected, no symptoms yet" : "healthy"}`, 14, 26, ill ? "#ff6b81" : "#7ee787", "left", "600 15px");
  TX(c, "white: phagocytes · coloured: pathogens · yellow Y: antibodies · blue B: plasma cells (lymphocytes)", 14, h - 10, "#c8a0a8", "left", "11px");
  const ev = SCENES[P.scene].ev.filter(e => e.t <= day && e.t > day - 1.5); for (const e of ev) TX(c, { infect: "⚠ pathogens enter", vaccine: "💉 vaccine", passive: "💉 antibodies injected", antibiotic: "💊 antibiotics" }[e.type], w / 2, 60, "#ffd166", "center", "600 16px");
}

// ---------------- Charts and readings ----------------
function charts() {
  const cut = res.out.filter(q => q.t <= day), T = SCENES[P.scene].T;
  chA.opts.title = "Antibodies and pathogens"; chA.opts.xLabel = "day"; chA.opts.yLabel = "level (arbitrary units)";
  const maxA = Math.max(1, ...res.out.map(q => q.A));
  chA.draw([{ pts: cut.map(q => [q.t, q.A]), color: "#ffd166", label: "antibodies" }, { pts: cut.map(q => [q.t, Math.min(q.P, 50) / 50 * maxA]), color: PATHOGENS[P.pathogen].col, label: "pathogens (scaled)" }, { pts: res.out.map(q => [q.t, q.A]), color: "rgba(255,209,102,.25)", dash: [3, 3], label: "" }], { xMin: 0, xMax: T, yMin: 0, hlines: [{ y: maxA / 50, label: "illness threshold", color: "#ff6b81" }], vlines: SCENES[P.scene].ev.map(e => ({ x: e.t, color: "rgba(255,255,255,.25)" })) });
  chB.opts.title = "Plasma cells (log scale)"; chB.opts.xLabel = "day"; chB.opts.yLabel = "cells (log₁₀)"; chB.draw([{ pts: cut.map(q => [q.t, Math.log10(1 + q.C)]), color: "#5ad1ff", label: "clone" }], { xMin: 0, xMax: T, yMin: 0 });
  const st = stateAt(day), illSoFar = res.out.filter(q => q.t <= day && q.P > 1).length * 0.1;
  read.set("d", day.toFixed(1)); read.set("p", st.P < 0.001 ? "none" : st.P.toFixed(2) + (st.P > 1 ? " (ill)" : "")); read.set("a", st.A.toFixed(2)); read.set("ill", illSoFar.toFixed(1) + ` (whole run ${res.ill.toFixed(1)})`); read.set("m", st.mem > 1 ? `memory cells (× ${st.mem.toFixed(0)})` : "none yet");
  ui.hud(st.P > 1 ? "The pathogens are multiplying faster than they are destroyed" : st.A > 0.5 ? "Antibodies are clearing the infection" : "Phagocytes patrol; lymphocytes wait for their antigen");
}
let frame = 0;
ui.run(dt => { if (dt > 0) { day += dt * P.speed; if (day > SCENES[P.scene].T) day = SCENES[P.scene].T; } }, dt => { draw(dt); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("Watch the antibodies rise. Then try 'Infected again' and 'Vaccinated'.", 6000);
