/* =====================================================================
   RADIOACTIVE DECAY
   An unstable nucleus can decay at any moment, giving out radiation.
   Nothing can predict WHEN a particular nucleus will decay: it is
   completely random. All we can know is the chance that it decays in
   the next second, and that chance never changes, however long the
   nucleus has already waited.

   From that one fact:
     * in each time step, each remaining nucleus decays with the same
       probability p, so the number left falls by the same FRACTION in
       every equal time: an exponential decay, N = N0 e^(-lambda t)
     * the half-life (the time for half to decay) is the same whatever
       the starting number:  T1/2 = ln 2 / lambda
     * activity (decays per second) = lambda x N

   The second view is a bench with a source, absorbers and a
   Geiger-Muller tube: how far does each kind of radiation go?
   ===================================================================== */
const LN2 = Math.LN2;
// isotopes for the sample: half-life in its own unit, and what it gives out
const ISO = {
  dice: { name: "Dice (p = 1/6)", half: 3.8, unit: "throws", tdisp: 1, emits: "", col: "#ffd166", dice: true, use: "Each 'nucleus' is a dice: a six means it has decayed. Each throw is one time step." },
  pa: { name: "Protactinium-234m", half: 70, unit: "s", tdisp: 1, emits: "β", col: "#7fe3a0", use: "Made in schools from uranium salts in a 'protactinium generator' to measure a half-life in a lesson." },
  rn: { name: "Radon-220 (thoron)", half: 56, unit: "s", tdisp: 1, emits: "α", col: "#ff8a70", use: "A radioactive gas given off by rocks containing thorium. Radon gases are the largest source of background radiation in the UK." },
  tc: { name: "Technetium-99m", half: 6.0, unit: "hours", tdisp: 1, emits: "γ", col: "#8ac6ff", use: "The most widely used medical tracer. Its gamma rays escape the body to reach a camera, and its 6-hour half-life means little remains after a day." },
  i: { name: "Iodine-131", half: 8.0, unit: "days", tdisp: 1, emits: "β γ", col: "#c58cff", use: "Taken up by the thyroid gland: used to treat thyroid cancer, and a dangerous product of nuclear accidents." },
  co: { name: "Cobalt-60", half: 5.27, unit: "years", tdisp: 1, emits: "β γ", col: "#5fd3c8", use: "Strong gamma rays: used to sterilise medical equipment and food, and in radiotherapy." },
  c: { name: "Carbon-14", half: 5730, unit: "years", tdisp: 1, emits: "β", col: "#e6c88a", use: "Made in the atmosphere and taken in by every living thing. After death it decays, so the fraction left dates the remains (radiocarbon dating)." }
};
// sources on the bench: activity (decays per second), what reaches the counter, and how efficient the tube is for each kind
const SOURCES = {
  am: { name: "Americium-241 (α, some γ)", A: 37000, alpha: 1, beta: 0, gamma: 0.36, half: "432 years" },
  sr: { name: "Strontium-90 (β)", A: 37000, alpha: 0, beta: 2, gamma: 0, half: "29 years" },
  co: { name: "Cobalt-60 (γ, weak β)", A: 185000, alpha: 0, beta: 1, gamma: 2, half: "5.3 years" },
  none: { name: "No source: background only", A: 0, alpha: 0, beta: 0, gamma: 0, half: "" }
};
const WINDOW = 0.5, EFF = { alpha: 0.9, beta: 0.85, gamma: 0.02 };     // tube window area (cm²) and the chance a particle that enters it is counted
const BG = 0.4;                                                          // background count rate (counts per second)
const ABS = { none: "nothing", paper: "paper", al: "aluminium", pb: "lead" };
// share of each kind that gets through: d = distance (cm), mat = absorber, x = its thickness (mm)
function transmit(kind, d, mat, x) {
  if (kind === "alpha") return d > 4 || mat !== "none" ? 0 : 1;                         // stopped by a sheet of paper or a few cm of air
  if (kind === "beta") { const air = Math.exp(-d / 150); if (mat === "pb") return x >= 1 ? 0 : air * Math.exp(-x / 0.25); if (mat === "al") return x >= 3 ? 0 : air * Math.exp(-x / 0.6); return air * (mat === "paper" ? 0.97 : 1); }
  if (mat === "pb") return Math.pow(0.5, x / 12); if (mat === "al") return Math.pow(0.5, x / 45); return 1;   // gamma: halved by every 12 mm of lead (45 mm of aluminium)
}
// expected count rate (counts per second) at distance d with an absorber
function countRate(src, d, mat, x, bg = true) { const S = SOURCES[src], geo = WINDOW / (4 * Math.PI * d * d); let r = 0; for (const k of ["alpha", "beta", "gamma"]) r += S.A * S[k] * geo * transmit(k, d, mat, x) * EFF[k]; return r + (bg ? BG : 0); }
function poisson(mu, rnd) { if (mu > 50) return Math.max(0, Math.round(mu + Math.sqrt(mu) * rnd.gauss())); let L = Math.exp(-mu), k = 0, p = 1; do { k++; p *= rnd(); } while (p > L); return k - 1; }

// a sample of nuclei: each step, each one left decays with probability p
function decayRun(N0, p, steps, rnd) { const out = [N0]; let N = N0; for (let s = 0; s < steps; s++) { let d = 0; for (let i = 0; i < N; i++) if (rnd() < p) d++; N -= d; out.push(N); } return out; }

// ---------------- The page ----------------
let view = "sample", iso = "pa", N0 = 2500, nuc = null, alive = 0, t = 0, steps = 0, dtStep = 0, p = 0, speed = 1, accS = 0, nlog = [], alog = [], flashes = [], sound = false, audio = null, rnd = K.rng(Date.now() % 99991 + 23);
let src = "sr", dist = 5, mat = "none", thick = 1, counts = 0, ctime = 0, recent = [], parts = [], benchT = 0, timer = null;
function restart() {
  const I = ISO[iso]; dtStep = I.half / 20; p = I.dice ? 1 / 6 : 1 - Math.pow(0.5, 1 / 20); if (I.dice) dtStep = 1;
  nuc = new Uint8Array(N0).fill(1); alive = N0; t = 0; steps = 0; nlog = [[0, N0]]; alog = []; flashes = []; accS = 0;
}
const ui = K.app({
  title: "Radioactive Decay", subject: "Physics",
  blurb: "Random decay, half-life, and what stops alpha, beta and gamma",
  reset: () => set({}),
  levels: { std: "Standard (iGCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Physics (4PH1) 7(a) Radioactivity and 7(b) Fission and fusion context: random decay, activity, half-life, α, β and γ, background radiation, uses and dangers.", adv: "WJEC Eduqas A level Physics: nuclear decay. λ, A = λN, N = N₀e^(−λt), T½ = ln 2/λ, ln N against t, carbon dating." } },
  missions: [
    { title: "Which one is next?", q: "2500 nuclei of protactinium-234m. Each flash is a nucleus decaying. Watch one particular nucleus. Can you tell when it will decay? Is there any pattern in where the decays happen?", hint: "No. Every nucleus has the same chance of decaying in the next second, and it does not 'age': one that has survived a long time is no more likely to go next. Decay is random: you cannot predict which nucleus decays next, or when. Yet the sample as a whole behaves very predictably.", setup() { set({ iso: "pa", N0: 2500, speed: 0.5 }); } },
  { title: "Half-life", q: "Watch the graph of nuclei left. How long does it take for half to decay? Then half of what is left? Read off three half-lives from the graph.", hint: "The same time every time: 70 seconds for protactinium-234m. In each half-life, half of the nuclei left decay, so the curve falls to ½, ¼, ⅛ … of the start. The activity (decays per second) halves in the same time, because it is proportional to the number left.", setup() { set({ iso: "pa", N0: 2500, speed: 2 }); } },
    { title: "Dice", q: "Each dot is now a dice. Every 'throw', any dice showing a six is removed. How many throws until half are gone? Does it matter how many dice you start with?", hint: "About 3.8 throws, whether you start with 100 or 10 000: each dice has a 1 in 6 chance each throw, so the number removed is always the same fraction of those left. Radioactive nuclei behave exactly like this. The dice model is how half-life experiments were first explained in schools.", setup() { set({ iso: "dice", N0: 1000, speed: 1.5 }); } },
    { title: "Small samples are noisy", q: "Start with only 100 nuclei and watch the graph. Then 10 000. Which follows the smooth theory curve more closely? Why?", hint: "With 100 nuclei the number decaying in each step is a small, very random number, so the curve is jagged and the half-life you measure could be well off. With 10 000 the random ups and downs average out. The relative scatter goes as 1 ÷ √N: a hundred times more nuclei, ten times smoother.", setup() { set({ iso: "pa", N0: 100, speed: 2 }); } },
    { title: "What stops alpha, beta and gamma?", q: "Switch to 'Source and Geiger counter'. For each source in turn, put paper, then aluminium, then lead between it and the tube. What stops each kind of radiation?", hint: "Alpha particles are stopped by a sheet of paper (or a few centimetres of air). Beta particles pass through paper but are stopped by a few millimetres of aluminium. Gamma rays pass through both and are only reduced by thick lead or concrete: every 12 mm of lead halves them. Alpha is the most ionising, gamma the least.", setup() { set({ view: "bench", src: "sr", dist: 4, mat: "paper" }); } },
    { title: "Background radiation", q: "Remove the source altogether. Does the counter fall silent? Note the count rate, then put a weak source far away. How should you correct your readings?", hint: "Even with no source the tube counts about 24 a minute: background radiation from radon gas, rocks and buildings, cosmic rays, food and medical sources. Measure it first and subtract it from every reading. When a source is far away or heavily shielded, its counts can be smaller than the background, and the corrected value is very uncertain.", setup() { set({ view: "bench", src: "none" }); } },
    { title: "Further away", q: "Use the gamma source with nothing in the way. Move the tube from 5 cm to 10 cm, then 20 cm. What happens to the corrected count rate each time you double the distance?", hint: "It falls to about a quarter: the inverse-square law. The radiation spreads out over a sphere whose area grows as distance squared, so the tube catches a smaller share. Keeping your distance is one of the three simple ways to reduce your dose, with less time and more shielding. Handle sources with tongs.", setup() { set({ view: "bench", src: "co", dist: 5, mat: "none" }); } },
    { title: "The right isotope for the job", q: "Compare technetium-99m (gamma, 6 hours) with carbon-14 (beta, 5730 years). Which could be injected into a patient to see an organ with a camera outside the body? Which could date a wooden spear? Why not the other way round?", hint: "A medical tracer must give out gamma rays (alpha and beta would not get out of the body, and would do harm inside it), and must have a short half-life, so it is active long enough for the scan but almost gone in a day. Dating needs a long half-life, comparable with the age being measured: carbon-14 suits remains from a few hundred to about 50 000 years old.", setup() { set({ iso: "tc", N0: 2500, speed: 2 }); } },
    { lvl: "adv", title: "The decay constant", q: "Look at the ln N graph. What shape is it? Read its gradient and compare with λ shown in the readings. Then use T½ = ln 2 / λ to check the half-life.", hint: "ln N against t is a straight line, because N = N₀e^(−λt) gives ln N = ln N₀ − λt. Its gradient is −λ. For protactinium-234m, λ = 0.693 ÷ 70 s = 0.0099 per second. Near the end, when few nuclei are left, the points scatter: random fluctuations become large compared with N.", setup() { set({ iso: "pa", N0: 10000, speed: 2 }); } },
    { lvl: "adv", title: "Carbon dating", q: "A sample of carbon-14 decays. How long until 25% is left? What fraction is left after 20 000 years? Why does carbon dating stop working beyond about 50 000 years?", hint: "25% left means two half-lives: 11 460 years. After 20 000 years the fraction is e^(−λt) = 0.089. Beyond about 50 000 years (nearly nine half-lives) less than 0.2% remains and its count rate is swamped by the background, so the uncertainty becomes enormous.", setup() { set({ iso: "c", N0: 10000, speed: 2 }); } }
  ],
  batch: [
    { title: "Measuring a half-life", question: "If you measure the half-life of 1000 nuclei again and again, how much do your answers vary?", how: "Each run: 1000 protactinium-234m nuclei; the time when half have decayed is read from the run.", xLabel: "", yLabel: "measured half-life (s)", reps: 300, bins: 24, lo: 60, hi: 80, theory: 70, theoryLabel: "half-life", run(x, r) { let N = 1000; const pp = 1 - Math.pow(0.5, 1 / 70); for (let s = 1; s < 2000; s++) { for (let i = N; i > 0; i--) if (r() < pp) N--; if (N <= 500) return s; } }, note: "Every nucleus is random, so the moment the 500th decays varies from run to run, by a few seconds either way." },
    { title: "Sample size and scatter", question: "How does the scatter in the number left depend on the size of the sample?", how: "Each run: the number left after one half-life is counted; the result is its difference from N₀/2, as a percentage of N₀/2.", xLabel: "starting number of nuclei, N₀", yLabel: "difference from N₀/2 (%)", xs: [50, 100, 200, 500, 1000, 2000, 5000, 10000], reps: 30, run(x, r) { let N = 0; for (let i = 0; i < x; i++) if (r() >= 0.5) N++; return 100 * Math.abs(N - x / 2) / (x / 2); }, theory: x => 100 * 0.798 / Math.sqrt(x), theoryLabel: "∝ 1/√N₀", note: "Four times as many nuclei halves the relative scatter. With the 10²⁰ or so nuclei in a real sample the decay curve is perfectly smooth." },
    { title: "The ln N graph", question: "Does the gradient of ln N against t give the decay probability?", how: "Each run: 5000 nuclei with the chosen decay probability per step, followed for 3 half-lives; a straight line is fitted to ln N against time and its gradient taken.", xLabel: "decay probability per step, p", yLabel: "minus the gradient of ln N", xs: [0.02, 0.05, 0.1, 0.15, 0.2, 0.3], reps: 5, yMin: 0, fit: true, theory: x => -Math.log(1 - x), theoryLabel: "λ = −ln(1 − p)", run(x, r) { const n = Math.ceil(3 * LN2 / -Math.log(1 - x)), a = decayRun(5000, x, n, r).map((N, s) => [s, Math.log(N)]); return -K.linfit(a).m; }, note: "For small p, λ ≈ p. Larger p (a big chance each step) makes the steps coarse, and λ = −ln(1 − p) is a little larger than p." },
    { title: "Random counts", question: "If you count for 10 seconds again and again, how much do the counts vary?", how: "Each run: the strontium-90 source at 20 cm with no absorber; the counts in 10 seconds, including background.", xLabel: "", yLabel: "counts in 10 s", reps: 400, bins: 24, theory: countRate("sr", 20, "none", 0) * 10, theoryLabel: "expected", run: (x, r) => poisson(countRate("sr", 20, "none", 0) * 10, r), note: "Counts follow a Poisson distribution: the standard deviation is the square root of the mean. Counting for longer gives more counts and a smaller percentage uncertainty." },
    { title: "Inverse-square law", question: "How does the count rate from a gamma source depend on distance?", how: "Each run: the cobalt-60 source, counts in 60 s at the chosen distance, minus a background measured for 60 s.", xLabel: "distance (cm)", yLabel: "corrected count rate (per s)", xs: [3, 4, 5, 7, 10, 14, 20], reps: 5, yMin: 0, theory: d => countRate("co", d, "none", 0, false), theoryLabel: "∝ 1/d²", run: (d, r) => (poisson(countRate("co", d, "none", 0) * 60, r) - poisson(BG * 60, r)) / 60, note: "At large distances the corrected rate is small compared with the background, so its percentage uncertainty grows." },
    { title: "Absorbing gamma rays", question: "How does the count rate from a gamma source fall as more lead is added?", how: "Each run: cobalt-60 at 4 cm behind the chosen thickness of lead; 60 s count, background subtracted.", xLabel: "thickness of lead (mm)", yLabel: "corrected count rate (per s)", xs: [2, 5, 10, 15, 20, 30, 40], reps: 5, yMin: 0, theory: x => countRate("co", 4, "pb", x, false), theoryLabel: "halved every 12 mm", run: (x, r) => (poisson(countRate("co", 4, "pb", x) * 60, r) - poisson(BG * 60, r)) / 60, note: "Exponential: the same thickness always removes the same fraction. There is no thickness that stops gamma rays completely. (The cobalt-60 source also gives out weak beta particles, which the first 1 mm of lead stops, so the experiment starts at 2 mm.)" },
    { title: "Absorbing beta particles", question: "How much aluminium does it take to stop beta particles?", how: "Each run: strontium-90 at 4 cm behind the chosen thickness of aluminium; 60 s count, background subtracted.", xLabel: "thickness of aluminium (mm)", yLabel: "corrected count rate (per s)", xs: [0, 0.5, 1, 1.5, 2, 2.5, 3, 4], reps: 5, run: (x, r) => (poisson(countRate("sr", 4, "al", x) * 60, r) - poisson(BG * 60, r)) / 60, note: "Unlike gamma rays, beta particles have a maximum range: by about 3 mm of aluminium the corrected count is zero, give or take the background." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4PH1 7(a)", text: "Radioactive decay is random: it cannot be predicted when a particular nucleus will decay. It is not affected by temperature or chemical reactions." },
      { lvl: "std", tag: "4PH1 7(a)", text: "Activity is the rate of decay, measured in becquerels (Bq): 1 Bq = 1 decay per second." },
      { lvl: "std", tag: "4PH1 7(a)", text: "Half-life: the time taken for half of the unstable nuclei in a sample to decay, or for the activity to halve." },
      { lvl: "std", tag: "4PH1 7(a)", text: "Alpha (helium nucleus, 2 protons + 2 neutrons): stopped by paper or a few cm of air, strongly ionising. Beta (fast electron): stopped by a few mm of aluminium. Gamma (electromagnetic wave): reduced by thick lead or concrete, weakly ionising." },
      { lvl: "std", tag: "4PH1 7(a)", text: "Background radiation comes from radon gas, rocks and buildings, cosmic rays, food and medical uses. Measure it and subtract it from readings." },
      { lvl: "std", tag: "4PH1 7(a)", text: "Uses depend on penetration and half-life: tracers (γ, short half-life), sterilising (γ), smoke alarms (α), thickness gauges (β), radiotherapy, dating (long half-life)." },
      { lvl: "adv", tag: "A level Eduqas", text: "A = λN; N = N₀e^(−λt); A = A₀e^(−λt); T½ = ln 2 / λ. The decay constant λ is the probability per unit time that a given nucleus decays." },
      { lvl: "adv", tag: "A level Eduqas", text: "ln N = ln N₀ − λt: a graph of ln N (or ln A) against t is a straight line of gradient −λ." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: "Explain what is meant by the statement that radioactive decay is random.", ans: "<ul><li>It is not possible to predict when a particular nucleus will decay</li><li>or which nucleus in a sample will decay next (each has the same, constant probability)</li></ul>" },
      { lvl: "std", marks: 3, q: () => `A sample of ${ISO[iso].name} contains ${N0} unstable nuclei. Its half-life is ${ISO[iso].half} ${ISO[iso].unit}. How many remain undecayed after ${(3 * ISO[iso].half).toPrecision(3)} ${ISO[iso].unit}?`, ans: () => `<ul><li>${(3 * ISO[iso].half).toPrecision(3)} ${ISO[iso].unit} is three half-lives</li><li>${N0} → ${N0 / 2} → ${N0 / 4} → ${N0 / 8}</li><li>${Number.isInteger(N0 / 8) ? N0 / 8 : `about ${Math.round(N0 / 8)} (half-life gives the expected number: ${N0 / 8} on average, but only whole nuclei can decay)`} nuclei remain</li></ul>` },
      { lvl: "std", marks: 3, q: () => { const c = countRate(src, dist, mat, thick); return `A Geiger counter records ${Math.round(c * 60)} counts per minute near a source. With the source removed it records ${Math.round(BG * 60)} counts per minute. Calculate the count rate due to the source, and explain why the second reading is needed.`; }, ans: () => { const c = countRate(src, dist, mat, thick); return `<ul><li>${Math.round(c * 60)} − ${Math.round(BG * 60)} = ${Math.round(c * 60) - Math.round(BG * 60)} counts per minute</li><li>The counter also detects background radiation</li><li>which must be subtracted to find the count rate from the source alone</li></ul>`; } },
      { lvl: "std", marks: 3, q: "A source gives a high count with nothing between it and a Geiger tube. The count is unchanged by a sheet of paper, but falls to background with 5 mm of aluminium. Which type of radiation does the source emit? Explain.", ans: "<ul><li>Beta</li><li>Not alpha, because paper did not reduce the count</li><li>Not gamma, because aluminium stopped it completely (gamma would pass through)</li></ul>" },
      { lvl: "std", marks: 3, q: "Explain why technetium-99m, a gamma emitter with a half-life of 6 hours, is suitable as a medical tracer.", ans: "<ul><li>Gamma rays pass out of the body to be detected outside</li><li>and are weakly ionising, so cause little damage</li><li>The half-life is long enough to complete the scan but short enough that little activity remains in the patient after a day or so</li></ul>" },
      { lvl: "std", marks: 2, q: "Uranium-238 decays by alpha emission to thorium. Write the nuclear equation. (U: 92 protons; Th: 90 protons)", ans: "<ul><li>²³⁸₉₂U → ²³⁴₉₀Th + ⁴₂He</li><li>Mass number falls by 4 and atomic number by 2</li></ul>" },
      { lvl: "adv", marks: 3, q: "Calculate the decay constant of iodine-131 (half-life 8.0 days) in s⁻¹, and the activity of a sample containing 4.0 × 10¹⁵ nuclei.", ans: "<ul><li>λ = ln 2 ÷ (8.0 × 24 × 3600) = 1.0 × 10⁻⁶ s⁻¹</li><li>A = λN = 1.0 × 10⁻⁶ × 4.0 × 10¹⁵</li><li>= 4.0 × 10⁹ Bq</li></ul>" },
      { lvl: "adv", marks: 4, q: "A wooden spear has 18% of the carbon-14 found in living wood. Estimate its age. (Half-life of carbon-14 = 5730 years.)", ans: "<ul><li>λ = ln 2 ÷ 5730 = 1.21 × 10⁻⁴ per year</li><li>N/N₀ = e^(−λt), so t = −ln(0.18) ÷ λ</li><li>= 1.715 ÷ 1.21 × 10⁻⁴</li><li>≈ 14 000 years</li></ul>" },
      { lvl: "adv", marks: 3, q: "Explain why a graph of ln(count rate) against time for a short-lived source may curve and level off at long times.", ans: "<ul><li>The measured count includes background radiation, which does not decay</li><li>As the source activity falls, background becomes a larger share of the count</li><li>so ln(count) tends to ln(background); subtract background before plotting</li></ul>" }
    ]
  },
  notes: `<h3>What is being modelled</h3>
<ul><li><b>The sample:</b> each nucleus is followed separately. In each time step (one twentieth of a half-life) every undecayed nucleus decays with the same probability p = 1 − 2^(−1/20), chosen by a random number. Nothing else is programmed: the exponential curve and the half-life come out of the randomness. The dashed curve is N₀e^(−λt), λ = −ln(1 − p) per step.</li>
<li><b>Dice:</b> p = 1/6 per throw.</li>
<li><b>The bench:</b> the count rate is source activity × (window area ÷ 4πd²) × the share getting through the air and absorber × the tube's efficiency for that kind of radiation, plus background (0.4 counts per second). Counts are then drawn at random (a Poisson process).</li>
<li><b>Ranges:</b> alpha travels at most 4 cm in air and is stopped by any absorber; beta is reduced by aluminium and stopped by 3 mm of it (1 mm of lead); gamma is halved by every 12 mm of lead and every 45 mm of aluminium, and never completely stopped.</li>
<li><b>Sources</b> are typical school sealed sources: Am-241 37 kBq, Sr-90 37 kBq (with its daughter Y-90, two betas per decay), Co-60 185 kBq.</li></ul>
<h3>Simplifications</h3>
<ul><li>The sample shows at most 10 000 nuclei; a real sample has around 10²⁰.</li>
<li>Each nucleus decays to a stable product: no decay chains. (Decay chains, with secular and transient equilibrium, are in the earlier version of this simulation.)</li>
<li>Beta particles have a spread of energies; here one simple absorption rule stands for all of them. Gamma absorption ignores scattering. The tube never saturates.</li>
<li>The flying particles drawn on the bench are a small sample to show directions and stopping; the counter uses the formula above.</li>
<li>Half-lives are real; the sample's time runs at the speed you choose.</li></ul>
<h3>The earlier version</h3>
<p>The previous version of this simulation, with its worksheets, is still here: <a href="original/radioactive-decay.html" style="color:var(--accent)">open the earlier version</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("");
ctl.view = K.seg(g, { value: "sample", options: [["sample", "A sample decaying"], ["bench", "Source and Geiger counter"]], on: v => { ui.mission(null); setView(v); } });
const sampleGroup = g = ui.group("The sample");
ctl.iso = K.seg(g, { label: "Nuclei", value: "pa", options: [["dice", "dice"], ["pa", "Pa-234m"], ["rn", "Rn-220"], ["tc", "Tc-99m"]], on: v => { iso = v; ctl.iso2.set(""); restart(); syncIso(); } });
ctl.iso2 = K.seg(g, { value: "", options: [["i", "I-131"], ["co", "Co-60"], ["c", "C-14"]], on: v => { iso = v; ctl.iso.set(""); restart(); syncIso(); } });
const isoNote = K.note(g, "");
ctl.N0 = K.slider(g, { label: "Starting number", min: 100, max: 10000, step: 100, value: N0, on: v => { N0 = v; restart(); } });
ctl.speed = K.slider(g, { label: "Speed", min: 0.25, max: 6, step: 0.25, value: 1, fmt: v => v + (v === 1 ? " half-life" : " half-lives") + " a minute", on: v => speed = v });
ui.headerSpeed(ctl.speed);   // playback speed lives in the header, beside Pause and Reset
let r1 = K.row(g); K.btn(r1, "↺ Start again", () => restart(), "primary");
K.note(g, "Click a nucleus to make it decay now.");
const benchGroup = g = ui.group("The bench");
ctl.src = K.seg(g, { label: "Source", value: "sr", options: [["am", "Am-241 (α)"], ["sr", "Sr-90 (β)"], ["co", "Co-60 (γ)"], ["none", "none"]], on: v => { src = v; resetCount(); } });
ctl.mat = K.seg(g, { label: "In between", value: "none", options: [["none", "nothing"], ["paper", "paper"], ["al", "aluminium"], ["pb", "lead"]], on: v => { mat = v; syncThick(); resetCount(); } });
ctl.thick = K.slider(g, { label: "Thickness", min: 0.5, max: 50, step: 0.5, value: 1, unit: "mm", on: v => { thick = v; resetCount(); } });
ctl.dist = K.slider(g, { label: "Distance to the tube", min: 1, max: 40, step: 0.5, value: 5, unit: "cm", on: v => { dist = v; resetCount(); } });
r1 = K.row(g); K.btn(r1, "Count for 60 s", () => { resetCount(); timer = 60; }, "primary"); K.btn(r1, "Reset count", () => resetCount());
ctl.sound = K.toggle(g, { label: "Hear the clicks", value: false, on: v => { sound = v; if (v && !audio) try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } } });
const read = K.readout(ui.group("Readings"), [["a", ""], ["b", ""], ["c", ""], ["d", ""], ["e", ""], ["f", ""]]);
const readLabels = (labs) => { const sp = read.el.querySelectorAll("span"); labs.forEach((l, i) => { sp[i].textContent = l; sp[i].parentNode.style.display = l ? "" : "none"; }); };
function resetCount() { counts = 0; ctime = 0; recent = []; timer = null; }
function syncThick() { ctl.thick.el.style.display = mat === "al" || mat === "pb" ? "" : "none"; if (mat === "pb" && thick < 2) { thick = 10; ctl.thick.set(10); } if (mat === "al" && thick > 6) { thick = 1; ctl.thick.set(1); } }
function syncIso() { const I = ISO[iso]; isoNote.innerHTML = `<b>${I.name}</b>: half-life ${I.half} ${I.unit}${I.emits ? ", emits " + I.emits : ""}. ${I.use}`; }
function setView(v) { view = v; ctl.view.set(v); sampleGroup.style.display = v === "sample" ? "" : "none"; benchGroup.style.display = v === "bench" ? "" : "none"; readLabels(v === "sample" ? ["time", "nuclei left", "decayed", "activity now", "half-life", ui.level === "adv" ? "decay constant λ" : ""] : ["counts", "counting time", "count rate", "background", "corrected rate", "expected"]); }
function set(o) {
  iso = o.iso || "pa"; ctl.iso.set(["dice", "pa", "rn", "tc"].includes(iso) ? iso : ""); ctl.iso2.set(["i", "co", "c"].includes(iso) ? iso : ""); N0 = o.N0 || 2500; ctl.N0.set(N0); speed = o.speed || 1; ctl.speed.set(speed);
  src = o.src || "sr"; ctl.src.set(src); mat = o.mat || "none"; ctl.mat.set(mat); dist = o.dist || 5; ctl.dist.set(dist); syncThick(); restart(); syncIso(); resetCount(); setView(o.view || "sample");
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
function click(f) { if (!sound || !audio) return; const o = audio.createOscillator(), gn = audio.createGain(); o.type = "square"; o.frequency.value = 1800 + 600 * Math.random(); gn.gain.setValueAtTime(0.12 * f, audio.currentTime); gn.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.012); o.connect(gn); gn.connect(audio.destination); o.start(); o.stop(audio.currentTime + 0.015); }
let grid = null;
function layout() { const w = cv.w, h = cv.h, side = Math.min(h - 30, w * 0.62), n = Math.ceil(Math.sqrt(N0)), cell = side / n; grid = { x0: 20 + (w * 0.62 - side) / 2, y0: (h - side) / 2, cell, n }; }
function drawSample(dt) {
  const c = cv.ctx, w = cv.w, h = cv.h, I = ISO[iso]; layout(); const { x0, y0, cell, n } = grid; c.fillStyle = "#070b14"; c.fillRect(0, 0, w, h);
  const r = Math.max(0.8, cell * 0.36), col = I.col;
  // undecayed nuclei glow in the isotope's colour; decayed ones are dim grey
  c.fillStyle = "#1e2533"; c.beginPath(); for (let i = 0; i < N0; i++) if (!nuc[i]) { const x = x0 + (i % n + .5) * cell, y = y0 + ((i / n | 0) + .5) * cell; c.moveTo(x + r, y); c.arc(x, y, r, 0, 6.3); } c.fill();
  c.fillStyle = col; c.beginPath(); for (let i = 0; i < N0; i++) if (nuc[i]) { const x = x0 + (i % n + .5) * cell, y = y0 + ((i / n | 0) + .5) * cell; if (I.dice && cell > 9) c.rect(x - r, y - r, 2 * r, 2 * r); else { c.moveTo(x + r, y); c.arc(x, y, r, 0, 6.3); } } c.fill();
  c.globalCompositeOperation = "lighter"; c.lineCap = "round";
  for (let k = flashes.length - 1; k >= 0; k--) { const f = flashes[k], x = x0 + (f.i % n + .5) * cell, y = y0 + ((f.i / n | 0) + .5) * cell, L = f.kind === "α" ? 10 : 34; f.life -= dt * 2.2; if (f.life <= 0) { flashes.splice(k, 1); continue; }
    c.fillStyle = `rgba(255,255,255,${f.life})`; c.beginPath(); c.arc(x, y, r + 5 * (1 - f.life), 0, 6.3); c.fill();
    if (f.kind) { const d = (1 - f.life) * L * 1.6, ex = x + Math.cos(f.a) * d, ey = y + Math.sin(f.a) * d; c.strokeStyle = f.kind === "α" ? `rgba(255,120,90,${f.life})` : f.kind === "β" ? `rgba(120,200,255,${f.life})` : `rgba(140,255,160,${f.life})`; c.lineWidth = f.kind === "α" ? 3 : 1.4; c.beginPath(); c.moveTo(x + Math.cos(f.a) * d * .3, y + Math.sin(f.a) * d * .3); c.lineTo(ex, ey); c.stroke(); } }
  c.globalCompositeOperation = "source-over";
  // the story on the right
  const tx = w * 0.64 + 10; c.fillStyle = "#eef2f8"; c.font = "600 15px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillText(I.name, tx, 40); c.font = "12.5px Segoe UI,sans-serif"; c.fillStyle = "#aab6cc"; c.fillText("half-life " + I.half + " " + I.unit + (I.emits ? " · emits " + I.emits : ""), tx, 60);
  const hl = t / I.half; c.fillStyle = col; c.font = "600 34px Segoe UI,sans-serif"; c.fillText(alive.toLocaleString(), tx, 112); c.fillStyle = "#aab6cc"; c.font = "12.5px Segoe UI,sans-serif"; c.fillText("left of " + N0.toLocaleString() + " (" + (100 * alive / N0).toFixed(1) + "%)", tx, 132);
  c.fillStyle = "#eef2f8"; c.font = "600 22px Segoe UI,sans-serif"; c.fillText(fmtT(t), tx, 176); c.fillStyle = "#aab6cc"; c.font = "12.5px Segoe UI,sans-serif"; c.fillText("= " + hl.toFixed(2) + " half-lives", tx, 194);
  // a bar for each half-life: what fraction was left at its end
  const bw = Math.min(30, (w - tx - 20) / 7); for (let k = 0; k <= 6; k++) { const s = k * 20, N = s < nlog.length ? nlog[s][1] : null, bh = 120; c.fillStyle = "rgba(255,255,255,.08)"; c.fillRect(tx + k * (bw + 4), 230, bw, bh); if (N != null) { c.fillStyle = col; c.globalAlpha = .8; c.fillRect(tx + k * (bw + 4), 230 + bh * (1 - N / N0), bw, bh * N / N0); c.globalAlpha = 1; } c.fillStyle = "#aab6cc"; c.font = "10.5px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillText(k + "", tx + k * (bw + 4) + bw / 2, 230 + bh + 14); c.fillText(k === 0 ? "1" : "1/" + Math.pow(2, k), tx + k * (bw + 4) + bw / 2, 224); } c.textAlign = "left"; c.fillText("nuclei left after each half-life", tx, 386);
}
const PER = { s: "second", hours: "hour", days: "day", years: "year", throws: "throw" };
const fmtT = x => { const I = ISO[iso]; return (x < 10 ? x.toFixed(1) : x < 1000 ? x.toFixed(0) : Math.round(x).toLocaleString()) + " " + I.unit; };
function drawBench(dt) {
  const c = cv.ctx, w = cv.w, h = cv.h, cy = h * 0.58, S = SOURCES[src], ppc = K.clamp((w - 420) / Math.max(dist + 3, 6), 10, 70), sx = 110, tubeX = sx + dist * ppc, absX = sx + 0.45 * dist * ppc - (mat === "paper" ? 1 : Math.min(60, thick * ppc / 10)) / 2;
  c.fillStyle = "#0a0f1a"; c.fillRect(0, 0, w, h); c.fillStyle = "#151c2b"; c.fillRect(0, cy + 46, w, 10);
  // ruler
  c.strokeStyle = "rgba(200,210,230,.35)"; c.fillStyle = "rgba(200,210,230,.6)"; c.font = "10.5px Segoe UI,sans-serif"; c.textAlign = "center"; c.lineWidth = 1; c.beginPath(); for (let k = 0; k <= Math.max(dist + 4, 10); k++) { const x = sx + k * ppc; c.moveTo(x, cy + 58); c.lineTo(x, cy + (k % 5 ? 63 : 68)); if (k % 5 === 0) c.fillText(k + " cm", x, cy + 80); } c.stroke();
  // source in its holder
  c.fillStyle = "#5b6578"; c.fillRect(sx - 40, cy - 12, 40, 24); c.fillStyle = src === "none" ? "#2a3140" : "#ffd166"; c.beginPath(); c.arc(sx, cy, 7, 0, 6.3); c.fill(); c.fillStyle = "#cfd8ea"; c.font = "600 12px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillText(S.name, sx - 40, cy - 40); c.textAlign = "center";
  // absorber
  if (mat !== "none") { const th = mat === "paper" ? 3 : Math.max(3, Math.min(60, thick * ppc / 10)); c.fillStyle = mat === "paper" ? "#f3eee2" : mat === "al" ? "#b9c2cf" : "#6c7385"; c.fillRect(absX, cy - 60, th, 120); c.fillStyle = "#cfd8ea"; c.font = "11px Segoe UI,sans-serif"; c.fillText(ABS[mat] + (mat === "paper" ? "" : " " + thick + " mm"), absX + th / 2, cy + 104); }
  // the Geiger-Muller tube and counter
  c.fillStyle = "#3c4456"; c.fillRect(tubeX, cy - 14, 120, 28); c.fillStyle = "#a6b4c8"; c.fillRect(tubeX, cy - 10, 4, 20); c.strokeStyle = "#8d98ad"; c.lineWidth = 2; c.beginPath(); c.moveTo(tubeX + 120, cy); c.quadraticCurveTo(tubeX + 160, cy, tubeX + 170, cy - 60); c.stroke();
  const bx = Math.min(tubeX + 140, w - 170), by = cy - 170; c.fillStyle = "#1b2433"; c.strokeStyle = "#3a4c6c"; c.beginPath(); c.roundRect(bx, by, 150, 84, 8); c.fill(); c.stroke(); c.fillStyle = "#081008"; c.fillRect(bx + 12, by + 12, 126, 40); c.fillStyle = "#7fe3a0"; c.font = "600 26px Consolas,monospace"; c.textAlign = "right"; c.fillText(String(counts).padStart(5, "0"), bx + 132, by + 43); c.fillStyle = "#aab6cc"; c.font = "11px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillText(timer != null ? "counting: " + Math.max(0, 60 - ctime).toFixed(0) + " s left" : "counts · " + ctime.toFixed(0) + " s", bx + 75, by + 72);
  // a sample of the particles, flying out in all directions and stopping where they would
  if (src !== "none") { const kinds = []; for (const k of ["alpha", "beta", "gamma"]) if (S[k]) kinds.push(k); const rate = 40 * dt * speedB; for (let q = 0; q < rate + (Math.random() < rate % 1 ? 1 : 0); q++) { const k = kinds[Math.floor(Math.random() * kinds.length)], a = (Math.random() - .5) * 0.8; parts.push({ k, x: sx, y: cy, a, d: 0, stop: stopAt(k, a) }); } }
  c.lineCap = "round";
  for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i], v = (q.k === "alpha" ? 6 : q.k === "beta" ? 14 : 22) * ppc * dt; q.d += v; const ex = sx + Math.cos(q.a) * q.d, ey = cy + Math.sin(q.a) * q.d; if (q.d > q.stop || ex > w + 10 || ey < 0 || ey > h) { parts.splice(i, 1); continue; }
    c.strokeStyle = q.k === "alpha" ? "#ff8a70" : q.k === "beta" ? "#8ac6ff" : "#8cff9c"; c.lineWidth = q.k === "alpha" ? 3 : 1.5; c.beginPath(); c.moveTo(ex - Math.cos(q.a) * 8, ey - Math.sin(q.a) * 8); c.lineTo(ex, ey); c.stroke(); }
  if (parts.length > 900) parts.splice(0, parts.length - 900);
  c.textAlign = "left"; c.font = "11.5px Segoe UI,sans-serif"; let lx = 20; for (const [k, n2, cl] of [["alpha", "α particles", "#ff8a70"], ["beta", "β particles", "#8ac6ff"], ["gamma", "γ rays", "#8cff9c"]]) { c.fillStyle = cl; c.fillRect(lx, h - 22, 14, 3); c.fillText(n2, lx + 20, h - 17); lx += 110; }
  function stopAt(k, a) { const toAbs = (absX - sx) / Math.max(0.3, Math.cos(a)); if (k === "alpha") return mat !== "none" ? Math.min(toAbs, 4 * ppc) : 4 * ppc * (0.8 + 0.2 * Math.random()); if (k === "beta") return Math.random() < transmit("beta", 0, mat, thick) ? 150 * ppc * Math.random() + 20 * ppc : mat === "none" ? 150 * ppc : toAbs + Math.random() * 3; return Math.random() < transmit("gamma", 0, mat, thick) ? 1e4 : toAbs + Math.random() * 8; }
}
let speedB = 1;
K.pointer(cv.el, { down(p) { if (view !== "sample" || !grid) return; const i = Math.floor((p.y - grid.y0) / grid.cell) * grid.n + Math.floor((p.x - grid.x0) / grid.cell); if (i >= 0 && i < N0 && nuc[i] && p.x > grid.x0 && p.x < grid.x0 + grid.n * grid.cell) { nuc[i] = 0; alive--; flashes.push({ i, life: 1, kind: ISO[iso].emits.split(" ")[0], a: Math.random() * 6.3 }); click(1); } } });
const chN = K.chart(ui.dock, { title: "Nuclei left", yMin: 0 });
const chA = K.chart(ui.dock, { title: "Activity", yMin: 0 });

// ---------------- The loop ----------------
let frame = 0, decLast = 0;
ui.run(dt => {
  if (view === "sample") {
    accS += dt * speed * 20 / 60; let n = 0; const I = ISO[iso];      // 20 steps per half-life; speed = half-lives a minute
    while (accS >= 1 && n++ < 5) { accS--; let dec = 0; const kind = I.emits.split(" ")[0];
      for (let i = 0; i < N0; i++) if (nuc[i] && rnd() < p) { nuc[i] = 0; dec++; if (flashes.length < 260) flashes.push({ i, life: 1, kind, a: rnd() * 6.3 }); }
      alive -= dec; steps++; t = steps * dtStep; nlog.push([t, alive]); alog.push([t, dec / dtStep]); if (dec) click(Math.min(1, dec / 30)); }
  } else {
    const dtm = dt * speedB; ctime += dtm; const mu = countRate(src, dist, mat, thick) * dtm, k = poisson(mu, rnd); counts += k; for (let q = 0; q < Math.min(k, 6); q++) click(0.7);
    recent.push([ctime, k]); while (recent.length && recent[0][0] < ctime - 10) recent.shift();
    if (timer != null && ctime >= 60) { ui.setPlaying(false); ui.tip(`60 s count: ${counts} counts = ${(counts / 60).toFixed(2)} per second (background about ${BG} per second)`, 9000); timer = null; }
  }
}, dt => {
  dt = Math.min(dt, 0.1);
  if (view === "bench") { drawBench(ui.playing ? dt : 0); if (frame++ % 6) return; const rr = recent.reduce((s, q) => s + q[1], 0) / Math.max(1, Math.min(10, ctime)), ex = countRate(src, dist, mat, thick);
    read.set("a", counts); read.set("b", ctime.toFixed(0) + " s"); read.set("c", rr.toFixed(1) + " /s (last 10 s)"); read.set("d", BG + " /s"); read.set("e", Math.max(0, rr - BG).toFixed(1) + " /s"); read.set("f", ex.toFixed(2) + " /s");
    const ds = [], dt2 = []; for (let d = 1; d <= 40; d += 0.5) { ds.push([d, countRate(src, d, mat, thick)]); } for (let x = 0; x <= (mat === "al" ? 6 : 50); x += mat === "al" ? 0.1 : 1) dt2.push([x, countRate(src, dist, mat === "none" || mat === "paper" ? "pb" : mat, x)]);
    chN.draw([{ pts: ds, color: K.cssVar("--s0"), label: "expected count rate" }, { pts: [[dist, rr]], type: "dots", color: "#fff", r: 5, label: "measured" }, { pts: [[1, BG], [40, BG]], color: "rgba(255,255,255,.4)", dash: [4, 4], label: "background" }], { title: "Count rate against distance", xLabel: "distance (cm)", yLabel: "counts per second", xMin: 0, xMax: 40, yMax: Math.max(2, Math.min(ds[0][1], 4 * countRate(src, dist, mat, thick) + 2)) });
    chA.draw([{ pts: dt2, color: K.cssVar("--s1"), label: "expected" }, { pts: [[1, BG], [50, BG]], color: "rgba(255,255,255,.4)", dash: [4, 4], label: "background" }], { title: "Count rate against thickness of " + (mat === "al" ? "aluminium" : "lead") + ", at " + dist + " cm", xLabel: "thickness (mm)", yLabel: "counts per second", xMin: 0, xMax: mat === "al" ? 6 : 50 }); ui.hud(""); return; }
  drawSample(ui.playing ? dt : 0); if (frame++ % 6) return;
  const I = ISO[iso], lam = -Math.log(1 - p) / dtStep, tmax = Math.max(6 * I.half, t), th = []; for (let k = 0; k <= 80; k++) { const tt = tmax * k / 80; th.push([tt, N0 * Math.exp(-lam * tt)]); }
  const adv = ui.level === "adv";
  if (adv) chN.draw([{ pts: nlog.filter(q => q[1] > 0).map(q => [q[0], Math.log(q[1])]), type: "dots", color: I.col, r: 2.2, label: "ln N" }, { pts: [[0, Math.log(N0)], [tmax, Math.log(N0) - lam * tmax]], color: K.cssVar("--s1"), dash: [5, 4], label: "gradient −λ" }], { title: "ln N against time", xLabel: "time (" + I.unit + ")", yLabel: "ln N", xMin: 0, xMax: tmax, yMin: 0 });
  else chN.draw([{ pts: nlog, color: I.col, width: 2.2, label: "nuclei left" }, { pts: th, color: K.cssVar("--s1"), dash: [5, 4], label: "N₀ halved every half-life" }], { title: "Nuclei left", xLabel: "time (" + I.unit + ")", yLabel: "nuclei", xMin: 0, xMax: tmax, yMin: 0, vlines: [1, 2, 3].map(k => ({ x: k * I.half, label: k + " × T½", color: "rgba(255,255,255,.35)" })) });
  chA.draw([{ pts: alog, type: "bars", w: dtStep * 0.9, color: I.col, alpha: .7, label: "decays per " + PER[I.unit] }, { pts: th.map(q => [q[0], lam * q[1]]), color: K.cssVar("--s1"), dash: [5, 4], label: "A = λN" }], { title: "Activity", xLabel: "time (" + I.unit + ")", yLabel: "decays per " + PER[I.unit], xMin: 0, xMax: tmax, yMin: 0 });
  read.set("a", fmtT(t)); read.set("b", alive.toLocaleString()); read.set("c", (N0 - alive).toLocaleString()); read.set("d", alog.length ? (alog[alog.length - 1][1]).toFixed(1) + " per " + PER[I.unit] : "–"); read.set("e", I.half + " " + I.unit); read.set("f", lam.toPrecision(3) + " per " + PER[I.unit]);
  ui.hud("");
});
ui.onLevel = () => { if (view === "sample") setView("sample"); };
set({});
ui.tip("Every nucleus has the same chance of decaying each moment · nobody can say which goes next", 8000);
