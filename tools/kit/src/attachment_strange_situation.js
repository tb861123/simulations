/* =====================================================================
   ATTACHMENT: THE STRANGE SITUATION AND THE DEVELOPMENT OF ATTACHMENT
   1. AINSWORTH'S STRANGE SITUATION (1970s): a controlled observation of
      a 12–18 month old in seven 3-minute episodes:
        1 infant and caregiver play      5 infant left ALONE
        2 a stranger joins               6 stranger returns
        3 caregiver leaves (separation)  7 caregiver returns (REUNION)
        4 caregiver returns (REUNION)
      Observers rate exploration (secure base), stranger anxiety,
      separation anxiety and reunion behaviour, and classify the infant:
        Type B SECURE: explores, upset when caregiver leaves, seeks and is
                       quickly comforted on reunion
        Type A INSECURE-AVOIDANT: explores, shows little distress, ignores
                       or avoids the caregiver on reunion
        Type C INSECURE-RESISTANT: explores little, very distressed, seeks
                       AND resists contact on reunion, hard to comfort
      In this model each infant's type comes from their first year of
      experience: how SENSITIVE their caregiver was (how often comfort
      came when they signalled) and how CONSISTENT that was (Ainsworth's
      caregiver sensitivity hypothesis), plus a little temperament.
      CULTURAL VARIATION (van IJzendoorn and Kroonenberg, 1988): the mix of
      types differs between countries.
   2. SCHAFFER AND EMERSON (1964): 60 Glasgow babies studied at home.
      Stages: asocial → indiscriminate → specific (about 7 months) →
      multiple attachments (87% by 18 months). The first specific
      attachment was usually to the most RESPONSIVE carer, not the one who
      spent most time with the baby.
   ===================================================================== */
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));

// ---------------- 1. The first year: what the infant learns ----------------
// Each day the caregiver's mood varies around their sensitivity s (more if they are inconsistent, consistency c).
// The infant makes 20 bids for comfort a day for 30 'sample' days. It learns
//   T  = how often comfort came (trust that the caregiver is available)
//   Kc = how predictable comfort was from day to day (the spread of daily rates, with chance variation removed)
function firstYear(r, s, c) {
  let tot = 0; const days = [];
  for (let d = 0; d < 30; d++) { const m = clamp(s + (1 - c) * 0.5 * r.gauss()); let k = 0; for (let b = 0; b < 20; b++) if (r() < m) k++; days.push(k / 20); tot += k; }
  const T = tot / 600, sd = Math.sqrt(days.reduce((a, b) => a + (b - T) ** 2, 0) / 29), v = Math.max(0, sd * sd - T * (1 - T) / 20);
  return { s, c, T, Kc: clamp(1 - Math.sqrt(v) / 0.3), R: r.gauss() };   // R: temperament (how reactive the baby is)
}
// Ainsworth-style 1–7 scales for the reunion episodes. Avoidance grows when comfort rarely came but predictably (the infant learns not
// to signal). Resistance grows when comfort was unpredictable (the infant clings and protests). 'stress' = how unusual separation is in the culture.
const AV = { t: 0.6, s: 0.18 }, RS = { t: 0.7, s: 0.3 };
function codeInfant(I, r, stress = 1) {
  I.av = clamp(1 + 6 * clamp((AV.t - I.T) / AV.s) * I.Kc + 0.5 * r.gauss(), 1, 7);
  I.rs = clamp(1 + 6 * clamp((RS.t - I.Kc) / RS.s) + 0.5 * I.R + 2.5 * (stress - 1) + 0.5 * r.gauss(), 1, 7);
  I.type = I.av >= 4 && I.av >= I.rs ? "A" : I.rs >= 4 ? "C" : "B"; return I;
}
// a culture: caregivers' sensitivity varies around mu, consistency around mc
function sample(r, n, Q) { const out = []; for (let i = 0; i < n; i++) out.push(codeInfant(firstYear(r, clamp(Q.mu + 0.17 * r.gauss()), clamp(Q.mc + 0.12 * r.gauss())), r, Q.stress)); return out; }
const pct = (S, t) => 100 * S.filter(i => i.type === t).length / S.length;
// the published percentages (van IJzendoorn and Kroonenberg, 1988, rounded) and model settings that reproduce them
const CULT = {
  all: { name: "All 32 studies", A: 21, B: 65, C: 14, mu: 0.6, mc: 0.84, stress: 1 },
  uk: { name: "Great Britain", A: 22, B: 75, C: 3, mu: 0.62, mc: 0.95, stress: 1 },
  us: { name: "USA", A: 21, B: 65, C: 14, mu: 0.6, mc: 0.84, stress: 1 },
  de: { name: "Germany", A: 35, B: 57, C: 8, mu: 0.54, mc: 0.88, stress: 1 },
  jp: { name: "Japan", A: 5, B: 68, C: 27, mu: 0.74, mc: 0.84, stress: 1.6 },
  il: { name: "Israel", A: 7, B: 64, C: 29, mu: 0.7, mc: 0.8, stress: 1.3 },
  cn: { name: "China", A: 25, B: 50, C: 25, mu: 0.56, mc: 0.8, stress: 1.05 },
};

// ---------------- 2. One infant through the Strange Situation ----------------
const EP = [["Caregiver and infant play", 1, 0], ["Stranger joins", 1, 1], ["Caregiver leaves (separation)", 0, 1], ["Caregiver returns (reunion 1)", 1, 0], ["Infant left alone", 0, 0], ["Stranger returns", 0, 1], ["Caregiver returns (reunion 2)", 1, 0]];
// H = the infant's inner arousal (shown as heart rate). What the infant SHOWS depends on its type: avoidant infants hide distress
// (but Sroufe and Waters found their heart rates rose just as much), resistant infants show more.
function ssStep(I, X, h) {
  const e = Math.min(6, Math.floor(X.t / 3)), [, mum, str] = EP[e], av = (I.av - 1) / 6, rs = (I.rs - 1) / 6;
  let target = 0.12 + 0.12 * I.R * 0.5;
  if (!mum) target = 0.62 + 0.1 * I.R + (str ? -0.12 * (1 - rs) : 0.22);   // separation distress; a stranger can comfort a little
  else if (str) target += 0.18;                                              // stranger anxiety
  const down = mum ? 0.35 + 3 * (1 - av) * (1 - rs) * Math.max(0.2, I.T) : 1.5;   // how fast comfort works: fast for secure infants
  const tau = target > X.H ? 0.4 : (mum ? 1 / down : 2); X.H += (target - X.H) / tau * h;
  X.shown = clamp(X.H * (1 - 0.8 * av + 0.35 * rs));
  X.explore = clamp(mum ? (1 - X.H) * (1 - 0.6 * rs) : (1 - 1.2 * X.shown) * 0.7);
  const reunion = (e === 3 || e === 6) && X.t - 3 * e < 2;
  X.seek = mum ? clamp(X.H * 1.6 * (1 - av) + (reunion ? 0.4 * (1 - av) : 0)) : 0;
  X.resist = mum && reunion ? rs : 0; X.avoid = mum && reunion ? av : 0; X.ep = e; X.t += h;
}

// ---------------- 3. Schaffer and Emerson: the development of attachment ----------------
// carers: mother, father, grandparent, older sibling. Each has a responsiveness and an amount of time with the baby.
// From 2 months the baby's bond with each carer grows at a rate set mostly by responsiveness (squared) and a little by time.
// A SPECIFIC attachment shows (separation protest) once the bond passes a threshold AND the baby is cognitively ready (about 7 months).
const CARERS = [["mother", "#ff9aa9"], ["father", "#5ad1ff"], ["grandparent", "#ffd166"], ["sibling", "#7ee787"]];
function newBaby(r, Q) { return { ready: 7 + 1.1 * r.gauss(), rho: Q.resp.map(m => clamp(m + 0.2 * r.gauss(), 0.05, 1)), time: Q.time.slice(), A: [0, 0, 0, 0], first: -1, att: [false, false, false, false], firstAge: null }; }
function babyMonth(b, age, h) {
  if (age < 2) return;
  for (let j = 0; j < 4; j++) b.A[j] += h * 0.34 * b.rho[j] * b.rho[j] * (0.7 + 0.3 * b.time[j]);
  if (age >= b.ready) for (let j = 0; j < 4; j++) if (!b.att[j] && b.A[j] >= 1) { b.att[j] = true; if (b.first < 0) { b.first = j; b.firstAge = age; } }
}
const nAtt = b => b.att.filter(Boolean).length;
function growUp(r, Q, months = 18) { const b = newBaby(r, Q); for (let a = 0; a < months; a += 0.05) babyMonth(b, a, 0.05); return b; }

// ---------------- 4. State ----------------
const DEF = { mode: "ss", cult: "all", mu: 0.6, mc: 0.84, stress: 1, n: 100, sspeed: 1.5, resp: [0.8, 0.55, 0.45, 0.35], time: [1, 0.4, 0.3, 0.5], dspeed: 0.6 };
const P = JSON.parse(JSON.stringify(DEF));
let rand = K.rng(Date.now() % 1e6), SAMPLE = [], who = 0, X = null, trace = [], babies = [], age = 0, devHist = [];
function newSample() { SAMPLE = sample(rand, P.n, P); who = SAMPLE.findIndex(i => i.type === "B"); if (who < 0) who = 0; startSS(); }
function startSS() { X = { t: 0, H: 0.12, shown: 0.1, explore: 0.8, seek: 0, resist: 0, avoid: 0, ep: 0, x: 0.6 }; trace = []; }
function newBabies() { babies = []; for (let i = 0; i < 60; i++) babies.push(newBaby(rand, P)); age = 0; devHist = []; }

// ---------------- 5. The page ----------------
const ui = K.app({
  title: "Attachment: The Strange Situation", subject: "Psychology",
  blurb: "Infants whose attachment type grows from their caregiver's sensitivity go through Ainsworth's Strange Situation; compare cultures, and watch Schaffer and Emerson's stages of attachment unfold",
  reset: () => { newSample(); newBabies(); },
  levels: { std: "AS (AQA 7181)", adv: "A level (AQA 7182)", specs: {
    std: "AQA AS and A level Psychology 3.1.3 Attachment: Schaffer's stages of attachment and multiple attachments, the role of the father; Ainsworth's Strange Situation: types of attachment (secure, insecure-avoidant, insecure-resistant); caregiver sensitivity.",
    adv: "AQA A level Psychology (7182) 3.1.3 Attachment: cultural variations in attachment, including van IJzendoorn; Bowlby's monotropic theory and the internal working model; evaluating the Strange Situation (validity in other cultures, temperament explanations, imposed etic)." } },
  missions: [
    { title: "A secure infant", q: "Watch one secure (Type B) infant go through all seven episodes. When does distress appear? What happens at each reunion?", hint: "Happy exploration with the caregiver as a secure base, some stranger anxiety, clear separation anxiety, then on reunion the infant seeks contact, is comforted quickly and goes back to playing.", setup: () => set({ mode: "ss" }, () => pick("B")) },
    { title: "Avoidant and resistant", q: "Now watch an avoidant (A) infant and then a resistant (C) infant. Compare what they SHOW with their heart rate.", hint: "The avoidant infant shows little distress and ignores the caregiver at reunion, but its heart rate rises just like the others (Sroufe and Waters, 1977): it is hiding distress. The resistant infant is very distressed, seeks contact but pushes away, and is slow to settle.", setup: () => set({ mode: "ss" }, () => pick("A")) },
    { title: "Caregiver sensitivity", q: "Choose 'my own settings'. Lower the average caregiver sensitivity. What happens to the percentage of secure infants? Then lower consistency instead.", hint: "Less sensitive (but consistent) care produces more avoidant infants; inconsistent care produces more resistant infants. This is Ainsworth's caregiver sensitivity hypothesis (supported by De Wolff and van IJzendoorn's meta-analysis, though the correlation was only modest).", setup: () => set({ mode: "ss", cult: "own" }) },
    { lvl: "adv", title: "Cultural variation", q: "Compare Germany and Japan. Which type is unusually common in each? What might explain it?", hint: "Germany: more avoidant (encouraging independence). Japan: more resistant and almost no avoidant: Japanese infants were rarely separated from their mothers, so the Strange Situation was far more stressful for them. The test may not measure the same thing in every culture (an imposed etic).", setup: () => set({ mode: "ss", cult: "de" }) },
    { lvl: "adv", title: "Small samples", q: "Set the sample size to 30 and press 'New sample' several times for one country. How much does the % secure jump around?", hint: "By several percentage points either way. Van IJzendoorn found variation WITHIN countries was 1.5 times bigger than BETWEEN countries, and many samples were small, so 'national' figures should be treated with caution.", setup: () => set({ mode: "ss", cult: "uk", n: 30 }) },
    { title: "Stages of attachment", q: "Switch to 'development'. Watch 60 babies grow to 18 months. When do specific attachments appear? Who is the first attachment usually to?", hint: "Around 7–9 months (the specific stage, with separation and stranger anxiety), usually the mother (about 85% here; 65% in Schaffer and Emerson's study, with many more joint first attachments). Multiple attachments follow soon after for some, and most have several by 18 months (87% in Schaffer and Emerson's study).", setup: () => set({ mode: "dev" }) },
    { title: "Responsive v present", q: "Make the father very responsive but give him little time with the baby. Then make him present all the time but unresponsive. Which matters more?", hint: "Responsiveness. Schaffer and Emerson found babies attached to the carers who responded most sensitively to their signals, not those who spent most time with them or fed them.", setup: () => set({ mode: "dev", resp: [0.8, 0.9, 0.45, 0.35], time: [1, 0.2, 0.3, 0.5] }) },
  ],
  batch: [
    { title: "Caregiver sensitivity and secure attachment", question: "How does the percentage of secure infants depend on the average sensitivity of caregivers?", how: "Each run: a sample of 100 infants (consistency 0.84), all assessed in the Strange Situation.", xLabel: "average caregiver sensitivity", yLabel: "% secure (Type B)", xs: [0.4, 0.5, 0.6, 0.7, 0.8], reps: 6, yMin: 0, yMax: 100, run: (m, r) => pct(sample(r, 100, { mu: m, mc: 0.84, stress: 1 }), "B"), note: "More sensitive care gives more secure attachment, but even at high sensitivity some infants are classed as insecure: temperament and inconsistency matter too." },
    { title: "How much do small samples vary? (A level)", question: "If every British sample came from the same population (75% secure), how much would the % secure vary with sample size?", how: "Each run: one sample of n infants with the Great Britain settings.", xLabel: "sample size n", yLabel: "% secure", xs: [20, 40, 80, 160, 320], reps: 10, yMin: 40, yMax: 100, theory: () => 75, theoryLabel: "population ≈ 75%", run: (n, r) => pct(sample(r, n, CULT.uk), "B"), note: "Look at the SD: samples of 20 to 40 (common in the 1980s) can easily be 10 percentage points off. Differences between countries need large samples to be trusted." },
    { title: "The father's responsiveness", question: "What percentage of babies have attached to more than one person by 18 months, depending on how responsive the father is?", how: "Each run: 60 babies (like Schaffer and Emerson) followed to 18 months; mother responsiveness 0.8.", xLabel: "father's responsiveness", yLabel: "% with multiple attachments at 18 months", xs: [0.2, 0.4, 0.55, 0.7, 0.9], reps: 5, yMin: 0, yMax: 100, run: (f, r) => { let k = 0; for (let i = 0; i < 60; i++) if (nAtt(growUp(r, { resp: [0.8, f, 0.45, 0.35], time: [1, 0.4, 0.3, 0.5] })) >= 2) k++; return 100 * k / 60; }, note: "A responsive father is very often a second attachment figure (or even the first)." },
    { title: "Time spent v responsiveness", question: "If the father is NOT very responsive (0.35), does spending more time with the baby help much?", how: "Each run: 60 babies to 18 months; father responsiveness 0.35, time varied.", xLabel: "father's time with the baby (1 = as much as the mother)", yLabel: "% attached to father by 18 months", xs: [0.1, 0.3, 0.5, 0.7, 1], reps: 5, yMin: 0, yMax: 100, run: (t, r) => { let k = 0; for (let i = 0; i < 60; i++) if (growUp(r, { resp: [0.8, 0.35, 0.45, 0.35], time: [1, t, 0.3, 0.5] }).att[1]) k++; return 100 * k / 60; }, note: "Only a little: in this model, as in Schaffer and Emerson's findings, sensitive responding builds attachment far more than simply being there." },
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "3.1.3", text: "Strange Situation: controlled observation, 7 episodes of 3 minutes, measuring proximity seeking, exploration and secure base behaviour, stranger anxiety, separation anxiety and response to reunion." },
      { lvl: "std", tag: "3.1.3", text: "Types: secure (B, about 60–75%), insecure-avoidant (A, about 20–25%), insecure-resistant (C, about 3–15%). Ainsworth's caregiver sensitivity hypothesis: sensitive, consistent care produces secure attachment." },
      { lvl: "std", tag: "3.1.3", text: "Schaffer and Emerson (1964): 60 Glasgow babies, observed monthly at home and mothers interviewed. Stages: asocial (0–2 months), indiscriminate (2–7 months), specific (from ~7 months: separation and stranger anxiety), multiple (87% by 18 months). Attachment follows responsiveness, not time spent." },
      { lvl: "adv", tag: "3.1.3", text: "Cultural variation (van IJzendoorn and Kroonenberg, 1988): meta-analysis of 32 studies in 8 countries. Secure most common everywhere; more avoidant in Germany, more resistant in Japan and Israel; variation within countries was 1.5 times the variation between them." },
      { lvl: "adv", tag: "3.1.3", text: "Evaluation: good inter-rater reliability, but it may be an imposed etic; temperament (Kagan) may explain behaviour better than caregiving; the avoidant infant's raised heart rate (Sroufe and Waters) shows hidden distress." },
    ],
    questions: [
      { lvl: "std", marks: 3, q: "Describe how an insecure-resistant infant behaves in the Strange Situation.", ans: "<ul><li>explores little, stays close to the caregiver</li><li>shows high stranger and separation anxiety</li><li>on reunion seeks comfort but also resists it (e.g. pushes away) and is hard to comfort</li></ul>" },
      { lvl: "std", marks: 4, q: "Outline the findings of Schaffer and Emerson's study of the development of attachment.", ans: "<ul><li>most babies formed their first specific attachment at around 7 months (25–32 weeks)</li><li>multiple attachments followed, with 87% having multiple attachments by 18 months</li><li>the first attachment was usually to the mother</li><li>babies attached to those who responded most sensitively, not those who spent most time with them</li></ul>" },
      { lvl: "adv", marks: 4, q: "Explain one strength and one limitation of van IJzendoorn and Kroonenberg's study of cultural variation.", ans: "<ul><li>strength: a meta-analysis of a very large combined sample (about 2000 infants) increases reliability</li><li>limitation: it compared countries, not cultures; variation within countries was bigger than between them</li><li>many samples were small, so country percentages may be unreliable</li><li>the Strange Situation was developed in the USA and may be an imposed etic</li></ul>" },
    ]
  },
  notes: `<h3>The models</h3><ul><li><b>Where attachment types come from:</b> each infant's caregiver has a sensitivity (chance of responding to a bid for comfort) and a consistency (how much that varies from day to day). The infant learns how often comfort came (trust) and how predictable it was. Low but predictable comfort raises the avoidance score; unpredictable comfort raises the resistance score; temperament and the cultural novelty of separation add to resistance. Avoidance or resistance of 4 or more (on 1–7 scales) gives type A or C, otherwise B.</li><li><b>The Strange Situation:</b> the infant's inner arousal rises when the caregiver leaves (less if the stranger comforts, more if alone) and falls on reunion at a rate that depends on the attachment. What the infant shows is arousal scaled down (avoidant) or up (resistant).</li><li><b>Development:</b> each baby has four carers. From 2 months the bond with each grows mainly with the carer's responsiveness (squared) and a little with time together. A specific attachment appears when a bond passes a threshold and the baby is ready (about 7 months, varying between babies).</li><li>The culture settings were chosen to reproduce van IJzendoorn and Kroonenberg's percentages; they are not measurements of real parenting.</li></ul>
<h3>Assumptions and simplifications</h3><ul><li>Real attachment also depends on temperament, the whole family, stress, and the child's later experiences; disorganised attachment (Type D) is not included.</li><li>Observers code behaviour; here the codes are produced directly from the model with some random error.</li><li>Reducing parenting to two numbers is a huge simplification: the model shows the logic of the theories, not real families.</li></ul>`,
});

// ---------------- 6. Controls ----------------
const C = {};
let g = ui.group("Topic");
C.mode = K.seg(g, { value: "ss", options: [["ss", "the Strange Situation"], ["dev", "development (Schaffer and Emerson)"]], on: v => set({ mode: v }) });
const gs = ui.group("Sample of infants");
C.cult = K.seg(gs, { label: "Culture", value: "all", options: [...Object.entries(CULT).map(([k, v]) => [k, v.name]), ["own", "my own settings"]], on: v => { P.cult = v; applyCult(); newSample(); } });
C.mu = K.slider(gs, { label: "Average caregiver sensitivity", min: 0.3, max: 0.95, step: 0.01, value: 0.6, on: v => { P.mu = v; newSample(); } });
C.mc = K.slider(gs, { label: "Average caregiver consistency", min: 0.4, max: 1, step: 0.01, value: 0.84, on: v => { P.mc = v; newSample(); } });
C.stress = K.slider(gs, { label: "How unusual separation is for infants", min: 0.8, max: 1.8, step: 0.05, value: 1, on: v => { P.stress = v; newSample(); } });
C.n = K.slider(gs, { label: "Sample size", min: 20, max: 400, step: 10, value: 100, on: v => { P.n = v; newSample(); } });
let rw = K.row(gs); K.btn(rw, "New sample", () => newSample(), "primary");
const gw = ui.group("Watch one infant");
rw = K.row(gw); K.btn(rw, "A secure infant", () => pick("B")); K.btn(rw, "An avoidant infant", () => pick("A")); K.btn(rw, "A resistant infant", () => pick("C"));
C.sspeed = K.slider(gw, { label: "Speed (minutes per second)", min: 0.2, max: 6, step: 0.1, value: 1.5, on: v => P.sspeed = v });
const gd = ui.group("Carers (development)");
CARERS.forEach(([nm], j) => { C["r" + j] = K.slider(gd, { label: `${nm}: responsiveness`, min: 0.05, max: 1, step: 0.05, value: DEF.resp[j], on: v => { P.resp[j] = v; newBabies(); } }); C["t" + j] = K.slider(gd, { label: `${nm}: time with the baby`, min: 0, max: 1, step: 0.05, value: DEF.time[j], on: v => { P.time[j] = v; newBabies(); } }); });
C.dspeed = K.slider(gd, { label: "Speed (months per second)", min: 0.1, max: 3, step: 0.1, value: 0.6, on: v => P.dspeed = v });
const read = K.readout(ui.group("Results"), [["a", ""], ["b", ""], ["c", ""]]);
const relabel = n => n.forEach((x, i) => read.el.children[i].firstElementChild.textContent = x);
function pick(t) { const opts = SAMPLE.map((i, k) => [i, k]).filter(([i]) => i.type === t); if (opts.length) who = opts[rand.int(opts.length)][1]; else { let tries = 0; while (tries++ < 20 && !SAMPLE.some(i => i.type === t)) SAMPLE.push(...sample(rand, 20, P)); const k = SAMPLE.findIndex(i => i.type === t); who = k < 0 ? 0 : k; } startSS(); }
function applyCult() { if (P.cult !== "own") { const c = CULT[P.cult]; P.mu = c.mu; P.mc = c.mc; P.stress = c.stress; C.mu.set(P.mu); C.mc.set(P.mc); C.stress.set(P.stress); } showCtl(); }
function showCtl() { gs.style.display = gw.style.display = P.mode === "ss" ? "" : "none"; gd.style.display = P.mode === "dev" ? "" : "none"; const own = P.cult === "own"; for (const k of ["mu", "mc", "stress"]) C[k].el.style.opacity = own ? 1 : 0.55; }
function set(o, then) { const d = JSON.parse(JSON.stringify(DEF)); Object.keys(P).forEach(k => delete P[k]); Object.assign(P, d, o); for (const k of ["mode", "cult", "n", "sspeed", "dspeed"]) C[k].set(P[k]); CARERS.forEach((_, j) => { C["r" + j].set(P.resp[j]); C["t" + j].set(P.time[j]); }); if (P.cult !== "own") applyCult(); else { C.mu.set(P.mu); C.mc.set(P.mc); C.stress.set(P.stress); showCtl(); } newSample(); newBabies(); if (then) then(); }
C.mu.el.addEventListener("pointerdown", () => { if (P.cult !== "own") { P.cult = "own"; C.cult.set("own"); showCtl(); } });
C.mc.el.addEventListener("pointerdown", () => { if (P.cult !== "own") { P.cult = "own"; C.cult.set("own"); showCtl(); } });
C.stress.el.addEventListener("pointerdown", () => { if (P.cult !== "own") { P.cult = "own"; C.cult.set("own"); showCtl(); } });

// ---------------- 7. Running ----------------
function tick(dt) {
  if (P.mode === "ss") { if (X.t >= 21) return; const I = SAMPLE[who], m = dt * P.sspeed; for (let t = 0; t < m && X.t < 21; t += 0.01) { ssStep(I, X, 0.01); if (Math.round(X.t * 100) % 10 === 0) trace.push([X.t, X.shown, X.H, X.explore]); } }
  else { if (age >= 18) return; const m = dt * P.dspeed; for (let t = 0; t < m && age < 18; t += 0.05) { for (const b of babies) babyMonth(b, age, 0.05); age += 0.05; if (Math.round(age * 20) % 5 === 0) devHist.push([age, 100 * babies.filter(b => nAtt(b) >= 1).length / 60, 100 * babies.filter(b => nAtt(b) >= 2).length / 60]); } }
}

// ---------------- 8. Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#c9d4ea", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,system-ui,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
const TYPE = { A: ["insecure-avoidant (Type A)", "#ffd166"], B: ["secure (Type B)", "#7ee787"], C: ["insecure-resistant (Type C)", "#ff9aa9"] };
function person(c, x, y, col, lab, s = 1) { c.fillStyle = col; c.beginPath(); c.arc(x, y - 46 * s, 13 * s, 0, 6.3); c.fill(); c.fillRect(x - 12 * s, y - 32 * s, 24 * s, 34 * s); TX(c, lab, x, y + 18, col, "center", "600 12px"); }
function drawSS(c, w, h) {
  const I = SAMPLE[who], e = X.ep, [nm, mum, str] = EP[e], rx = 20, ry = 40, rwid = w * 0.58, rh = h - 80;
  c.fillStyle = "#121b30"; c.fillRect(rx, ry, rwid, rh); c.strokeStyle = "#3a4a6c"; c.strokeRect(rx, ry, rwid, rh);
  c.fillStyle = "#2a3a5c"; c.fillRect(rx + rwid - 10, ry + rh * 0.35, 10, rh * 0.3); TX(c, "door", rx + rwid - 14, ry + rh * 0.33, "#8fa0bf", "right", "11px");
  TX(c, `Episode ${e + 1} of 7: ${nm}`, rx, 26, "#fff", "left", "700 15px");
  // toys, caregiver's chair, stranger's chair
  for (let k = 0; k < 4; k++) { c.fillStyle = ["#ffd166", "#5ad1ff", "#7ee787", "#b388ff"][k]; c.fillRect(rx + rwid * (0.55 + 0.07 * (k % 2)), ry + rh * (0.25 + 0.12 * k), 16, 16); } TX(c, "toys", rx + rwid * 0.6, ry + rh * 0.2, "#8fa0bf", "center", "11px");
  const mx = rx + rwid * 0.18, my = ry + rh * 0.55;
  if (mum) person(c, mx, my, "#ff9aa9", "caregiver"); if (str) person(c, rx + rwid * 0.4, ry + rh * 0.88, "#8fa0bf", "stranger");
  // the infant moves towards the toys when exploring and towards the caregiver when seeking proximity; towards the door when alone and upset
  const toyX = rx + rwid * 0.6, tx = mum ? toyX - (toyX - mx - 40) * clamp(X.seek - 0.25 * X.avoid) : (X.shown > 0.4 ? rx + rwid - 60 : toyX - 30);
  X.x = X.x == null ? toyX : X.x; X.bx = (X.bx == null ? tx : X.bx + (tx - X.bx) * 0.06); const bx = X.bx, by = ry + rh * 0.62;
  c.fillStyle = "#ffe0bd"; c.beginPath(); c.arc(bx, by - 18, 10, 0, 6.3); c.fill(); c.fillStyle = TYPE[I.type][1]; c.beginPath(); c.ellipse(bx, by, 11, 13, 0, 0, 6.3); c.fill();
  if (X.shown > 0.45) TX(c, X.shown > 0.75 ? "😭" : "😟", bx + 14, by - 26, "#fff", "left", "18px"); else if (X.explore > 0.5) TX(c, "🙂", bx + 14, by - 26, "#fff", "left", "16px");
  if (X.resist > 0.3) TX(c, "pushes away!", bx, by + 34, "#ff9aa9", "center", "600 12px"); else if (X.avoid > 0.4) TX(c, "turns away", bx, by + 34, "#ffd166", "center", "600 12px"); else if (mum && X.seek > 0.5) TX(c, "seeks contact", bx, by + 34, "#7ee787", "center", "600 12px");
  // ratings panel
  const px = rx + rwid + 24; let y = 50; const bar = (lab, v, col) => { TX(c, lab, px, y, "#c9d4ea", "left", "12px"); c.fillStyle = "#1d2b4a"; c.fillRect(px, y + 5, w - px - 20, 10); c.fillStyle = col; c.fillRect(px, y + 5, (w - px - 20) * clamp(v), 10); y += 34; };
  bar("exploration (secure base)", X.explore, "#7ee787"); bar("distress SHOWN", X.shown, "#ff9aa9"); bar("heart rate (inner arousal)", X.H, "#ff6b81"); bar("proximity seeking", X.seek, "#5ad1ff"); bar("contact resistance", X.resist, "#ffb454"); bar("avoidance of caregiver", X.avoid, "#ffd166");
  y += 6; TX(c, `Reunion codes (1–7): avoidance ${I.av.toFixed(1)} · resistance ${I.rs.toFixed(1)}`, px, y, "#fff", "left", "600 12.5px"); y += 22;
  TX(c, X.t >= 21 ? "Classified: " + TYPE[I.type][0] : "Classification after episode 7…", px, y, X.t >= 21 ? TYPE[I.type][1] : "#8fa0bf", "left", "700 14px"); y += 22;
  TX(c, `Caregiver: sensitivity ${I.s.toFixed(2)}, consistency ${I.c.toFixed(2)}`, px, y, "#8fa0bf", "left", "12px");
  ui.hud(`infant ${who + 1} of ${SAMPLE.length} · ${Math.floor(X.t)} min`);
}
function drawDev(c, w, h) {
  // 60 babies in a 10 × 6 grid. Rings show who each baby has a specific attachment to (outer ring = first attachment).
  const cols = 10, rows = 6, cw = (w - 40) / cols, ch = (h - 80) / rows;
  TX(c, `Age ${age.toFixed(1)} months: ${age < 2 ? "asocial stage" : babies.some(b => nAtt(b) > 0) ? (babies.filter(b => nAtt(b) >= 2).length > 30 ? "multiple attachments" : "specific attachments forming") : "indiscriminate stage"}`, 20, 26, "#fff", "left", "700 15px");
  babies.forEach((b, i) => { const x = 20 + cw * (i % cols + 0.5), y = 50 + ch * (Math.floor(i / cols) + 0.5); c.fillStyle = "#ffe0bd"; c.beginPath(); c.arc(x, y, 9, 0, 6.3); c.fill();
    let r = 13; const order = [b.first, ...[0, 1, 2, 3].filter(j => j !== b.first)]; for (const j of order) if (j >= 0 && b.att[j]) { c.strokeStyle = CARERS[j][1]; c.lineWidth = 3; c.beginPath(); c.arc(x, y, r, 0, 6.3); c.stroke(); r += 4; } c.lineWidth = 1;
    // a faint bar for the strongest bond still forming
    const s = Math.max(...b.A); if (!nAtt(b)) { c.fillStyle = "#2a3a5c"; c.fillRect(x - 12, y + 16, 24, 3); c.fillStyle = "#8fa0bf"; c.fillRect(x - 12, y + 16, 24 * clamp(s), 3); } });
  let x = 20; for (const [nm, col] of CARERS) { c.fillStyle = col; c.fillRect(x, h - 22, 12, 12); TX(c, nm, x + 16, h - 12, "#c9d4ea", "left", "12px"); x += 110; } TX(c, "ring = specific attachment (innermost = first)", x + 10, h - 12, "#8fa0bf", "left", "12px");
  ui.hud(`${babies.filter(b => nAtt(b) >= 1).length} of 60 attached · ${babies.filter(b => nAtt(b) >= 2).length} with multiple`);
}
function draw() { const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1222"; c.fillRect(0, 0, w, h); if (P.mode === "ss") drawSS(c, w, h); else drawDev(c, w, h); }
function panels() {
  chA.opts.xFmt = v => ({ 1: "A avoidant", 2: "B secure", 3: "C resistant" })[Math.round(v)] && Math.abs(v - Math.round(v)) < 0.01 ? ({ 1: "A avoidant", 2: "B secure", 3: "C resistant" })[Math.round(v)] : "";
  if (P.mode === "ss") {
    const pA = pct(SAMPLE, "A"), pB = pct(SAMPLE, "B"), pC = pct(SAMPLE, "C"); relabel(["Secure (B)", "Avoidant (A)", "Resistant (C)"]); read.set("a", pB.toFixed(0) + "%"); read.set("b", pA.toFixed(0) + "%"); read.set("c", pC.toFixed(0) + "%");
    const ref = P.cult !== "own" ? CULT[P.cult] : null; chA.opts.title = `Your sample of ${SAMPLE.length}` + (ref ? ` v ${ref.name} (van IJzendoorn and Kroonenberg)` : ""); chA.opts.xLabel = "attachment type"; chA.opts.yLabel = "% of infants";
    const ser = [{ pts: [[ref ? 0.83 : 1, pA], [ref ? 1.83 : 2, pB], [ref ? 2.83 : 3, pC]], type: "bars", w: ref ? 0.32 : 0.6, color: K.cssVar("--s0"), label: "simulated sample" }]; if (ref) ser.push({ pts: [[1.17, ref.A], [2.17, ref.B], [3.17, ref.C]], type: "bars", w: 0.32, color: K.cssVar("--s1"), label: "published" });
    chA.draw(ser, { yMin: 0, yMax: 100, xMin: 0.4, xMax: 3.6 });
    chB.opts.xFmt = null; chB.opts.title = "This infant through the seven episodes"; chB.opts.xLabel = "minutes (episode boundaries every 3)"; chB.opts.yLabel = "level";
    chB.draw([{ pts: trace.map(q => [q[0], q[1]]), color: "#ff9aa9", label: "distress shown" }, { pts: trace.map(q => [q[0], q[2]]), color: "#ff6b81", label: "heart rate (arousal)", dash: [5, 4] }, { pts: trace.map(q => [q[0], q[3]]), color: "#7ee787", label: "exploration" }], { xMin: 0, xMax: 21, yMin: 0, yMax: 1, vlines: [3, 6, 9, 12, 15, 18].map(x => ({ x, color: "#2a3a5c" })) });
  } else {
    const n1 = babies.filter(b => nAtt(b) >= 1).length, n2 = babies.filter(b => nAtt(b) >= 2).length, mumFirst = babies.filter(b => b.first === 0).length; relabel(["With a specific attachment", "With multiple attachments", "First attachment to mother"]); read.set("a", `${n1} of 60`); read.set("b", `${n2} of 60`); read.set("c", n1 ? `${Math.round(100 * mumFirst / n1)}%` : "–");
    chA.opts.xFmt = null; chA.opts.title = "% of babies with a specific attachment / multiple attachments"; chA.opts.xLabel = "age (months)"; chA.opts.yLabel = "% of babies";
    chA.draw([{ pts: devHist.map(q => [q[0], q[1]]), color: K.cssVar("--s0"), label: "specific" }, { pts: devHist.map(q => [q[0], q[2]]), color: K.cssVar("--s1"), label: "multiple" }, { pts: [[18, 87]], type: "dots", r: 5, color: K.cssVar("--s2"), label: "S&E 1964" }], { xMin: 0, xMax: 18, yMin: 0, yMax: 100, vlines: [{ x: 2, label: "asocial | indiscriminate" }, { x: 7, label: "specific", row: 1 }] });
    chB.opts.xFmt = null; chB.opts.title = "Who did babies attach to? (all attachments so far)"; chB.opts.xLabel = "carer"; chB.opts.yLabel = "% of babies";
    chB.opts.xFmt = v => Math.abs(v - Math.round(v)) < 0.01 && v >= 1 && v <= 4 ? CARERS[Math.round(v) - 1][0] : "";
    chB.draw([{ pts: CARERS.map((_, j) => [j + 1, 100 * babies.filter(b => b.att[j]).length / 60]), type: "bars", w: 0.6, color: K.cssVar("--s4") }], { yMin: 0, yMax: 100, xMin: 0.4, xMax: 4.6 });
  }
}
let frame = 0;
ui.run(tick, () => { draw(); if (frame++ % 6 === 0) panels(); });
set({}, () => pick("B"));
ui.tip("Watch one infant go through Ainsworth's seven episodes. The bars show what the observers rate.", 7000);
