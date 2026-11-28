/* =====================================================================
   NUCLEAR FUSION: GETTING OVER (OR THROUGH) THE BARRIER
   Two nuclei are both positive, so they repel. The closer they get, the
   harder they push apart: this is the COULOMB BARRIER,
       U = k Q₁Q₂ ÷ r  = 1.44 MeV·fm × Z₁Z₂ ÷ r
   Only if they get within about 2–7 fm (1 fm = 10⁻¹⁵ m) does the strong
   force grab them and they fuse, releasing energy (E = Δm c²).
   In a hot gas the nuclei have a spread of energies (mean ³⁄₂kT), almost
   all far below the barrier. Classically they would never fuse. Quantum
   TUNNELLING lets a few through: the chance is about e^(−√(E_G ÷ E)),
   where E_G (the Gamow energy) depends on the charges and masses.
   The best compromise between "enough nuclei at this energy" (falls with
   E as e^(−E/kT)) and "chance to tunnel" (rises with E) is the GAMOW PEAK.
   Higher temperature: more fast nuclei. Higher pressure: more collisions.
   Everything is calculated in MeV, femtometres and SI units.
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
const KB = 8.617333e-11, ALPHA = 1 / 137.036, AMU = 931.494, MEV = 1.602177e-13;    // Boltzmann constant (MeV per K), fine-structure constant, atomic mass unit (MeV), joules per MeV
const SUPD = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const sup = n => (n < 0 ? "⁻" : "") + String(Math.abs(n)).split("").map(c => SUPD[+c]).join("");
// a number given as its log₁₀, written plainly when it is not too big or small
function sciL(lg, d = 2) { if (!isFinite(lg)) return lg > 0 ? "∞" : "0"; if (lg > -3 && lg < 5) return K.sig(Math.pow(10, lg), d + 1); const e = Math.floor(lg), m = Math.pow(10, lg - e); return (m.toFixed(d - 1) === "10" ? "1" : m.toFixed(d - 1)) + " × 10" + sup(m.toFixed(d - 1) === "10" ? e + 1 : e); }
const sci = (x, d) => x > 0 ? sciL(Math.log10(x), d) : "0";
// S = astrophysical S-factor (MeV·barn), taken as constant; Q = energy released (MeV); same = both nuclei the same kind
const RX = {
  pp: { name: "¹H + ¹H (the Sun)", eq: "¹H + ¹H → ²H + e⁺ + ν", Z: [1, 1], A: [1, 1], S: 4.0e-25, Q: 1.44, same: true, home: "core" },
  pD: { name: "¹H + ²H", eq: "¹H + ²H → ³He + γ", Z: [1, 1], A: [1, 2], S: 2.14e-7, Q: 5.49, home: "core" },
  DD: { name: "²H + ²H (D–D)", eq: "²H + ²H → ³He + n  or  ³H + p", Z: [1, 1], A: [2, 2], S: 0.11, Q: 3.65, same: true, home: "tokamak" },
  DT: { name: "²H + ³H (D–T)", eq: "²H + ³H → ⁴He + n", Z: [1, 1], A: [2, 3], S: 22, Q: 17.59, home: "tokamak" },
  D3: { name: "²H + ³He", eq: "²H + ³He → ⁴He + p", Z: [1, 2], A: [2, 3], S: 5.9, Q: 18.35, home: "tokamak" },
  h33: { name: "³He + ³He", eq: "³He + ³He → ⁴He + 2 ¹H", Z: [2, 2], A: [3, 3], S: 5.15, Q: 12.86, same: true, home: "core" },
  pLi: { name: "¹H + ⁷Li", eq: "¹H + ⁷Li → 2 ⁴He", Z: [1, 3], A: [1, 7], S: 0.059, Q: 17.35, home: "tokamak" },
  pN: { name: "¹H + ¹⁴N (CNO cycle)", eq: "¹H + ¹⁴N → ¹⁵O + γ  (slowest step of the CNO cycle)", Z: [1, 7], A: [1, 14], S: 3.5e-3, Q: 7.30, home: "core" },
  CC: { name: "¹²C + ¹²C", eq: "¹²C + ¹²C → ²⁰Ne + ⁴He  or  ²³Na + ¹H", Z: [6, 6], A: [12, 12], S: 8.8e16, Q: 13.9, same: true, home: "massive" }
};
const PLACES = {
  room: { name: "room temperature", T: 300, P: 1e5 },
  surface: { name: "the Sun's surface", T: 5800, P: 1e4 },
  core: { name: "the Sun's core", T: 1.57e7, P: 2.5e16 },
  tokamak: { name: "a tokamak (ITER)", T: 1.5e8, P: 5e5 },
  nif: { name: "laser fusion (NIF)", T: 6e7, P: 3.5e16 },
  giant: { name: "a red giant's core", T: 1.2e8, P: 1e21 },
  massive: { name: "a massive star's core", T: 7e8, P: 1e22 }
};
// properties of a reaction: barrier, touching distance, reduced mass, Gamow energy
function rx(key) {
  const r = RX[key], [Z1, Z2] = r.Z, [A1, A2] = r.A, R = 1.2 * (Math.cbrt(A1) + Math.cbrt(A2)), mu = A1 * A2 / (A1 + A2) * AMU;
  return Object.assign({ key, R, Ub: 1.44 * Z1 * Z2 / R, mu, EG: 2 * mu * Math.pow(Math.PI * ALPHA * Z1 * Z2, 2), Zavg: (Z1 + Z2) / 2 }, r);
}
const tunnel = (q, E) => E >= q.Ub ? 1 : Math.exp(-Math.sqrt(q.EG / E));           // chance of getting through at energy E (MeV)
const gamowE0 = (q, kT) => Math.cbrt(q.EG * kT * kT / 4);                            // the Gamow peak (MeV)
// log₁₀ of the chance per collision, averaged over the energies of colliding nuclei (∝ E e^(−E/kT))
function logChance(q, T, tun = true) {
  const kT = KB * T;
  if (!tun) { const x = q.Ub / kT; return Math.log10(1 + x) - x / Math.LN10; }
  const E0 = gamowE0(q, kT), lo = Math.min(kT, E0) * 1e-3, hi = Math.max(60 * kT, 6 * E0, q.Ub * 1.5); const N = 700, f = []; let mx = -Infinity;
  for (let i = 0; i <= N; i++) { const E = lo * Math.pow(hi / lo, i / N), v = Math.log(E / (kT * kT)) - E / kT + (E >= q.Ub ? 0 : -Math.sqrt(q.EG / E)) + Math.log(E); f.push(v); if (v > mx) mx = v; }
  let s = 0; for (let i = 0; i <= N; i++) s += Math.exp(f[i] - mx) * (i === 0 || i === N ? 0.5 : 1);
  return (mx + Math.log(s * Math.log(hi / lo) / N)) / Math.LN10;
}
// log₁₀ ⟨σv⟩ (m³ s⁻¹) = log of √(8/πμ) (kT)^(−3/2) S ∫ e^(−E/kT − √(E_G/E)) dE
function logSigV(q, T) {
  const kT = KB * T, E0 = gamowE0(q, kT), lo = E0 * 1e-3, hi = E0 * 8 + 40 * kT, N = 700; let mx = -Infinity; const f = [];
  for (let i = 0; i <= N; i++) { const E = lo * Math.pow(hi / lo, i / N), v = -E / kT - Math.sqrt(q.EG / E) + Math.log(E); f.push(v); if (v > mx) mx = v; }
  let s = 0; for (let i = 0; i <= N; i++) s += Math.exp(f[i] - mx) * (i === 0 || i === N ? 0.5 : 1);
  const lnI = mx + Math.log(s * Math.log(hi / lo) / N) + Math.log(MEV);               // ∫ dE in joules
  const muKg = q.mu * 1.78266e-30, S = q.S * MEV * 1e-28;
  return (0.5 * Math.log(8 / (Math.PI * muKg)) - 1.5 * Math.log(kT * MEV) + Math.log(S) + lnI) / Math.LN10;
}
// the gas: nuclei per m³ (fully ionised, so electrons share the pressure), reactions per m³ per s, power per m³, wait for one nucleus
function gas(q, T, P) {
  const n = P / ((1 + q.Zavg) * KB * T * MEV), lsv = logSigV(q, T), lnOther = Math.log10(q.same ? n : n / 2);
  const lRate = lsv + Math.log10(q.same ? n * n / 2 : n * n / 4);
  return { n, lsv, lRate, lPow: lRate + Math.log10(q.Q * MEV), lWait: -(lsv + lnOther) };
}
// demonstration boost: a fixed 1-2-5 multiplier per reaction so that about 1 collision in 10 gets through at its home place
function boostFor(q) { const lp = logChance(q, PLACES[q.home].T), want = Math.log10(0.1) - lp; if (want <= 0) return 1; const e = Math.floor(want), m = Math.pow(10, want - e); return (m >= 5 ? 5 : m >= 2 ? 2 : 1) * Math.pow(10, e); }
// a colliding pair's energy: collisions favour faster pairs, so energies follow E e^(−E/kT) (a gamma distribution)
const drawE = (kT, r) => -kT * Math.log(Math.max(1e-300, r() * r()));

// ---------------- The page ----------------
const P = { rx: "pp", place: "core", lT: Math.log10(1.57e7), lP: 16.4, tun: true, mode: "demo", zoom: false };
let rnd = K.rng(Date.now() % 99991 + 3), speed = 1, Q = rx("pp"), boost = 1, cnt = { sent: 0, thru: 0 }, records = [], anim = null, lastSkip = "";
const ui = K.app({
  title: "Nuclear Fusion", subject: "Physics",
  blurb: "Why fusion needs millions of degrees: the Coulomb barrier, quantum tunnelling and the Gamow peak, from the Sun to a tokamak",
  reset: () => set({ rx: P.rx, place: RX[P.rx].home }),
  levels: { std: "Standard (iGCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Physics (4PH1) 7(c) Fission and fusion: fusion is the energy source of stars; it needs a very high temperature and pressure because positive nuclei repel; it is hard to achieve on Earth. Also 5(d): kelvin temperature ∝ the mean kinetic energy of particles, and 8(c): stars fuse hydrogen into helium.", adv: "WJEC Eduqas A level Physics: nuclear energy (mass defect, E = mc², binding energy), fields of force (the barrier U = kQ₁Q₂/r) and kinetic theory (mean KE = ³⁄₂kT). Tunnelling, the Gamow peak and reaction rates are beyond the spec." } },
  missions: [
    { title: "Why so hot?", q: "Try D–T fusion at room temperature, then in a tokamak. Why does nothing happen at room temperature?", hint: "Both nuclei are positive, so they repel. At room temperature they collide with about 0.04 eV, a millionth of what is needed to get close enough: the chance per collision is effectively zero. At 150 million K they are moving fast enough that some get through. That is why fusion needs a very high temperature.", setup() { set({ rx: "DT", place: "room" }); } },
    { title: "The Sun needs quantum physics", q: "Choose ¹H + ¹H in the Sun's core. Switch tunnelling off. What is the chance per collision? Switch it back on.", hint: "Without tunnelling, a proton would need 600 keV to get over the barrier, but kT in the Sun's core is only 1.35 keV: the chance is about 10⁻¹⁹⁰, so the Sun could not shine. Quantum tunnelling lets a tiny fraction (about 1 in 10⁵ near the Gamow peak) through. Nuclei behave as waves and can 'leak' through a barrier they cannot climb.", setup() { set({ rx: "pp", place: "core", tun: false }); } },
    { title: "Hotter is much faster", q: "In the Sun's core, raise the temperature from 15.7 to 31 million K (double it). How many times bigger does the <b>chance per collision</b> get? Then look at the <b>power released</b> per m³: the pressure has stayed the same, so what has happened to the number of nuclei in each m³?", hint: "Doubling the kelvin temperature only doubles the mean kinetic energy, but the chance per collision rises about 12 times, because the few nuclei that fuse are in the far tail of the energy spread, and the tail grows very fast with temperature. (Close to 15 million K the rate rises roughly as T⁴: a core 10% hotter fuses about 45% faster. That rule only holds for small changes.) The power per m³ rises only about 2.6 times: at the same pressure a gas twice as hot has half as many nuclei per m³, and the rate goes as the number per m³ squared.", setup() { set({ rx: "pp", place: "core" }); } },
    { title: "Squeeze it", q: "Double the pressure (keeping the temperature). How much faster are reactions per m³?", hint: "At the same temperature, twice the pressure means twice as many nuclei per m³, so each nucleus meets twice as many others, and there are twice as many nuclei: the rate rises 2 × 2 = 4 times (rate ∝ n²). This is why stars need gravity to squeeze their cores, and why fusion reactors must confine the plasma.", setup() { set({ rx: "pp", place: "core" }); } },
    { title: "The easiest fuel", q: "In a tokamak (150 million K), compare D–T, D–D and ¹H + ¹H. Which is easiest? Why do reactors use D–T?", hint: "All three have charges of +1, so the barriers are similar, but D–T has by far the largest chance of fusing once the nuclei are close (its S-factor) and releases the most energy (17.6 MeV). ¹H + ¹H needs the weak force to turn a proton into a neutron, so it is about 10²⁴ times slower: fine for the Sun, which is huge and lasts billions of years, hopeless for a power station.", setup() { set({ rx: "DT", place: "tokamak" }); } },
    { title: "Bigger charges, hotter stars", q: "Try ¹²C + ¹²C in the Sun's core, then in a massive star's core. Why do heavier nuclei need hotter stars?", hint: "Carbon has 6 protons, so the barrier is 36 times larger than for two protons (U ∝ Z₁Z₂). The Sun will never be hot enough. Massive stars, squeezed harder by their own gravity, reach hundreds of millions of kelvin and fuse heavier and heavier elements.", setup() { set({ rx: "CC", place: "core" }); } },
    { lvl: "adv", title: "The classical temperature", q: "For ¹H + ¹H, use U = kQ₁Q₂/r with r = 2.4 fm to find the barrier height in J. At what temperature would ³⁄₂kT equal it? Compare with the Sun's core.", hint: "U = (8.99 × 10⁹ × (1.6 × 10⁻¹⁹)²) ÷ 2.4 × 10⁻¹⁵ = 9.6 × 10⁻¹⁴ J (0.6 MeV). ³⁄₂kT = U gives T = 2U ÷ 3k = 4.6 × 10⁹ K, 300 times hotter than the Sun's core (1.6 × 10⁷ K). The difference is made up by the fast tail of the energy spread and by tunnelling.", setup() { set({ rx: "pp", place: "core" }); } },
    { lvl: "adv", title: "Energy from the mass defect", q: "D–T: m(²H) = 2.014102 u, m(³H) = 3.016049 u, m(⁴He) = 4.002603 u, m(n) = 1.008665 u. Find the energy released.", hint: "Mass before 5.030151 u, after 5.011268 u; Δm = 0.018883 u × 931.5 MeV/u = 17.6 MeV. Most of it (14.1 MeV) is carried by the neutron, which is why reactor walls become radioactive.", setup() { set({ rx: "DT", place: "tokamak" }); } },
    { lvl: "adv", title: "The Gamow peak", q: "Look at the Gamow peak chart for D–T in a tokamak. Where are the nuclei that actually fuse, compared with kT and the barrier?", hint: "e^(−E/kT) says there are fewer and fewer nuclei at high energy; the tunnelling chance e^(−√(E_G/E)) rises steeply with energy. Their product peaks at E₀ = (E_G(kT)²/4)^⅓: here about 30 to 40 keV, several times kT (13 keV) but far below the 400 keV barrier.", setup() { set({ rx: "DT", place: "tokamak" }); } }
  ],
  batch: [
    { title: "Is the Sun hot enough without tunnelling?", question: "How does the chance per collision for ¹H + ¹H depend on temperature, with tunnelling? (Dashed line: without tunnelling.)", how: "Calculated chance per collision, averaged over the energies of colliding protons, from 3 to 30 million K. A calculation, so no scatter.", xLabel: "temperature (million K)", yLabel: "log₁₀ (chance per collision)", xs: [3, 5, 8, 12, 15.7, 20, 25, 30], reps: 1, theory: x => logChance(rx("pp"), x * 1e6, false), theoryLabel: "no tunnelling", run: x => logChance(rx("pp"), x * 1e6, true), note: "With tunnelling, about 1 colliding proton pair in 30 000 gets through the barrier at the Sun's core. Without it, about 1 in 10¹⁹⁰: the Sun would be dark. (Most pairs that do get through fall apart again: the weak force must turn a proton into a neutron while they touch, which is why ¹H + ¹H is so slow.)" },
    { title: "Do the fusing nuclei sit at the Gamow peak?", question: "What is the average energy of D–T collisions that fuse at 10 keV?", how: "Each run: 20 000 simulated collisions with energies spread as E e^(−E/kT), each weighted by its tunnelling chance. Theory: the exact mean of the Gamow peak.", yLabel: "mean energy of fusing collisions (keV)", reps: 200, bins: 24, theory: (() => { const q = rx("DT"), kT = 0.01; let s = 0, w = 0; for (let i = 1; i < 4000; i++) { const E = i * 0.05 * kT, p = E * Math.exp(-E / kT) * tunnel(q, E); s += p * E; w += p; } return s / w * 1000; })(), theoryLabel: "exact mean", run: (x, r) => { const q = rx("DT"), kT = 0.01; let s = 0, w = 0; for (let i = 0; i < 20000; i++) { const E = drawE(kT, r), p = tunnel(q, E); s += p * E; w += p; } return s / w * 1000; }, note: "The fusing nuclei are far above the average energy (³⁄₂kT = 15 keV) but far below the barrier (about 400 keV): exactly where the Gamow peak says." },
    { title: "How rare is fusion in a tokamak?", question: "What fraction of D–T collisions at 150 million K fuse?", how: "Each run: 100 000 collisions at the true odds. The number that fuse varies by chance (a Poisson spread).", yLabel: "fusions per million collisions", reps: 200, bins: 20, theory: Math.pow(10, logChance(rx("DT"), 1.5e8)) * 1e6, theoryLabel: "model's exact value", run: (x, r) => { const q = rx("DT"), kT = KB * 1.5e8; let n = 0; for (let i = 0; i < 100000; i++) if (r() < tunnel(q, drawE(kT, r))) n++; return n * 10; }, note: "Even in a tokamak only about 3 collisions in a thousand fuse. The rest bounce off, which is why the plasma must be kept hot and confined for a long time." },
    { title: "How steeply does the Sun's rate rise with temperature?", question: "Reaction rate ⟨σv⟩ for ¹H + ¹H against temperature, on log–log axes.", how: "log₁₀⟨σv⟩ against log₁₀ T from 10 to 25 million K. The gradient is the power n in rate ∝ Tⁿ.", xLabel: "log₁₀ (temperature / K)", yLabel: "log₁₀ ⟨σv⟩ (m³ s⁻¹)", xs: [7.0, 7.1, 7.2, 7.3, 7.4], reps: 1, fit: true, run: x => logSigV(rx("pp"), Math.pow(10, x)), note: "A gradient of about 4: the Sun's rate ∝ T⁴. A slightly hotter core burns much faster, which keeps stars stable: if the core heats up, it expands and cools again." },
    { title: "Why do heavy stars use the CNO cycle?", question: "The same for ¹H + ¹⁴N, the slowest step of the CNO cycle.", how: "log₁₀⟨σv⟩ against log₁₀ T from 15 to 30 million K.", xLabel: "log₁₀ (temperature / K)", yLabel: "log₁₀ ⟨σv⟩ (m³ s⁻¹)", xs: [7.2, 7.3, 7.4, 7.5], reps: 1, fit: true, run: x => logSigV(rx("pN"), Math.pow(10, x)), note: "A gradient of about 16–18: nitrogen's charge of 7 makes the barrier much higher, so the rate is extremely sensitive to temperature. Above about 17 million K (stars heavier than about 1.3 Suns) the CNO cycle wins." },
    { title: "Squeeze it: does doubling the pressure double the rate?", question: "Reactions per m³ per second against pressure, at the Sun's core temperature.", how: "log₁₀(rate) against log₁₀(pressure) for ¹H + ¹H at 15.7 million K.", xLabel: "log₁₀ (pressure / Pa)", yLabel: "log₁₀ (reactions per m³ per s)", xs: [14, 14.5, 15, 15.5, 16, 16.5, 17], reps: 1, fit: true, run: x => gas(rx("pp"), 1.57e7, Math.pow(10, x)).lRate, note: "Gradient 2.00: the rate ∝ n² ∝ P² at fixed temperature. Double the pressure, four times the rate." },
    { title: "How long does a proton in the Sun wait to fuse?", question: "Waiting times for individual protons in the Sun's core.", how: "The average wait is τ = 1 ÷ (n⟨σv⟩); each proton's actual wait is random (an exponential distribution).", yLabel: "waiting time (billion years)", reps: 300, bins: 24, theory: Math.pow(10, gas(rx("pp"), 1.57e7, 2.5e16).lWait) / 3.156e16, theoryLabel: "mean τ", run: (x, r) => -Math.log(1 - r()) * Math.pow(10, gas(rx("pp"), 1.57e7, 2.5e16).lWait) / 3.156e16, note: "A typical proton waits billions of years. That is why the Sun is still shining after 4.6 billion years: the slowness of ¹H + ¹H is what makes stars last." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4PH1 7(c)", text: "Nuclear fusion: two light nuclei join to form a heavier nucleus, releasing energy. It is the energy source of the Sun and other stars (hydrogen → helium)." },
      { lvl: "std", tag: "4PH1 7(c)", text: "Fusion needs a very high temperature (millions of kelvin) because nuclei are positive and repel: only very fast nuclei get close enough to fuse. A high pressure (density) makes collisions more frequent." },
      { lvl: "std", tag: "4PH1 5(d)", text: "Kelvin temperature is proportional to the mean kinetic energy of the particles: double the kelvin temperature, double the mean KE." },
      { lvl: "std", tag: "4PH1 7(c)", text: "Fusion is hard on Earth: the plasma must be hotter than the Sun's core and must not touch the walls (magnetic confinement in a tokamak, or lasers in NIF)." },
      { lvl: "std", tag: "4PH1 7(c)", text: "Fission splits a heavy nucleus (uranium) after it absorbs a neutron; fusion joins light nuclei. Both release energy; fusion fuel is plentiful and makes far less long-lived waste." },
      { lvl: "adv", tag: "Eduqas nuclear", text: "Energy released = (mass before − mass after) × c²; 1 u = 931.5 MeV. Binding energy per nucleon rises up to iron, so fusing light nuclei releases energy." },
      { lvl: "adv", tag: "Eduqas fields", text: "Coulomb barrier U = kQ₁Q₂/r = 1.44 MeV fm × Z₁Z₂/r. Nuclei touch at r ≈ 1.2(A₁^⅓ + A₂^⅓) fm." },
      { lvl: "adv", tag: "Eduqas thermal", text: "Mean KE of a particle = ³⁄₂kT. In the Sun's core kT ≈ 1.35 keV, far below the 600 keV barrier." },
      { lvl: "adv", tag: "beyond spec", text: "Tunnelling chance ≈ e^(−√(E_G/E)); Boltzmann factor e^(−E/kT); their product peaks at the Gamow peak E₀ = (E_G(kT)²/4)^⅓." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: "Explain why fusion only happens at very high temperatures.", ans: "<ul><li>nuclei are positively charged so they repel</li><li>only at very high temperature do they move fast enough (have enough kinetic energy) to get close enough to fuse</li></ul>" },
      { lvl: "std", marks: 2, q: () => `The temperature of a gas rises from ${K.sig(Math.pow(10, P.lT) / 2, 3)} K to ${K.sig(Math.pow(10, P.lT), 3)} K. What happens to the mean kinetic energy of its particles?`, ans: "<ul><li>the kelvin temperature doubles</li><li>so the mean kinetic energy doubles</li></ul>" },
      { lvl: "std", marks: 2, q: "Complete the equation: ²₁H + ³₁H → ⁴₂He + ?", ans: "<ul><li>¹₀n (a neutron)</li><li>mass numbers 2 + 3 = 4 + 1; atomic numbers 1 + 1 = 2 + 0</li></ul>" },
      { lvl: "std", marks: 3, q: "Give two reasons why it is difficult to build a fusion power station.", ans: "<ul><li>needs temperatures over 100 million K</li><li>the hot plasma must be kept away from the walls (strong magnetic fields)</li><li>so far it takes more energy to run than it produces (any two)</li></ul>" },
      { lvl: "adv", marks: 3, q: () => { const q = rx(P.rx); return `For ${q.name}, calculate the Coulomb barrier at the touching distance r = ${q.R.toFixed(2)} fm, in MeV and in J.`; }, ans: () => { const q = rx(P.rx); return `<ul><li>U = 1.44 MeV fm × ${q.Z[0]} × ${q.Z[1]} ÷ ${q.R.toFixed(2)} fm</li><li>= ${q.Ub.toFixed(3)} MeV</li><li>= ${(q.Ub * MEV).toExponential(2)} J</li></ul>`; } },
      { lvl: "adv", marks: 2, q: () => `Calculate the mean kinetic energy of a nucleus at ${sci(Math.pow(10, P.lT), 3)} K, in J and in keV.`, ans: () => { const E = 1.5 * 1.381e-23 * Math.pow(10, P.lT); return `<ul><li>³⁄₂kT = 1.5 × 1.38 × 10⁻²³ × ${sci(Math.pow(10, P.lT), 3)}</li><li>= ${E.toExponential(2)} J = ${K.sig(E / MEV * 1000, 3)} keV</li></ul>`; } },
      { lvl: "adv", marks: 3, q: "Explain why the Sun can fuse hydrogen although ³⁄₂kT in its core is hundreds of times smaller than the Coulomb barrier.", ans: "<ul><li>a few nuclei have energies far above the mean (the Maxwell–Boltzmann tail)</li><li>quantum tunnelling lets some pass through the barrier without enough energy to go over it</li><li>there are so many collisions that even a tiny chance gives a large total rate</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li><b>Barrier</b>: U = 1.44 MeV·fm × Z₁Z₂/r outside the touching distance R = 1.2 fm × (A₁^⅓ + A₂^⅓). Inside R, a strong-force well, drawn schematically (shallower than the real 30–50 MeV).</li>
<li><b>Collisions</b>: colliding pairs have energies spread as E e^(−E/kT) (faster pairs collide more often).</li>
<li><b>Tunnelling</b>: the chance of getting through is the Gamow factor e^(−√(E_G/E)) with E_G = 2μc²(παZ₁Z₂)²; it is 1 above the barrier. Without tunnelling, only nuclei with E above the barrier fuse.</li>
<li><b>Rates</b>: ⟨σv⟩ = √(8/πμ) (kT)^(−3/2) S ∫ e^(−E/kT − √(E_G/E)) dE with a constant S-factor for each reaction. Reactions per m³ per s = n₁n₂⟨σv⟩ (n²⟨σv⟩/2 for identical nuclei); n = P ÷ ((1 + Z)kT) for a fully ionised 50 : 50 mix.</li>
<li><b>Demonstration odds</b>: real chances are tiny, so each reaction has a fixed boost (a 1-2-5 number) chosen so that about 1 collision in 10 fuses at its usual place. The boost does not change with temperature or pressure, so comparisons stay fair; "true odds" removes it.</li></ul>
<h3>Checks (the Sun's core, 15.7 million K)</h3>
<ul><li>Barrier for ¹H + ¹H: 600 keV (accepted about 550–600 keV). kT = 1.35 keV. Gamow peak 6.1 keV (accepted about 6 keV).</li>
<li>⟨σv⟩ for ¹H + ¹H about 10⁻⁴⁹ m³/s; rate ∝ T⁴ (CNO about T¹⁶–T¹⁸), as accepted. These powers are local slopes: they hold for small changes of temperature, not for a doubling.</li>
<li>A proton in the core waits about 3–4 billion years here. The usual figure is nearer 10 billion, because the real core is about two-thirds helium by mass, so there are fewer protons to meet than in this pure-hydrogen model.</li></ul>
<h3>Left out</h3>
<ul><li>Electron screening, energy-dependent S-factors (D–T has a resonance near 64 keV), real stellar mixtures, radiation pressure, degenerate electrons, and the 3D geometry of collisions (the diagram is one line through the target nucleus).</li></ul>
<p>The earlier version of this simulation, with its worksheets, is kept in <a href="original/nuclear-fusion.html">original/nuclear-fusion.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("Reaction and place");
ctl.rx = K.seg(g, { label: "Reaction", value: "pp", options: Object.keys(RX).map(k => [k, RX[k].name]), on: v => set({ rx: v, place: P.place, lT: P.lT, lP: P.lP, tun: P.tun, mode: P.mode }) });
ctl.place = K.seg(g, { label: "Place", value: "core", options: Object.keys(PLACES).map(k => [k, PLACES[k].name]), on: v => set({ rx: P.rx, place: v, tun: P.tun, mode: P.mode }) });
ctl.lT = K.slider(g, { label: "Temperature", min: 2.4, max: 10, step: 0.01, value: P.lT, fmt: v => sciL(v, 3) + " K", on: v => { P.lT = v; fresh(); } });
ctl.lP = K.slider(g, { label: "Pressure", min: 0, max: 24, step: 0.05, value: P.lP, fmt: v => sciL(v, 2) + " Pa", on: v => { P.lP = v; fresh(); } });
ctl.tun = K.toggle(g, { label: "Quantum tunnelling", value: true, on: v => { P.tun = v; fresh(); } });
g = ui.group("Collisions");
ctl.mode = K.seg(g, { value: "demo", options: [["demo", "Demonstration odds"], ["true", "True odds"]], on: v => { P.mode = v; fresh(); } });
let rr = K.row(g); K.btn(rr, "⏩ Skip to the next fusion", () => skip(), "primary"); K.btn(rr, "📌 Record this run", () => record()); K.btn(rr, "Clear", () => { records = []; });
ctl.zoom = K.toggle(g, { label: "Zoom the energy axis on the incoming nuclei", value: false, on: v => P.zoom = v });
ctl.speed = K.slider(g, { label: "Collisions shown", min: 0.5, max: 20, step: 0.5, value: 1, fmt: v => v + " per second", on: v => speed = v });
ui.headerSpeed(ctl.speed);   // playback speed lives in the header, beside Pause and Reset
const read = K.readout(ui.group("Readings"), [["kt", "kT · mean KE (³⁄₂kT)"], ["ub", "barrier height"], ["ch", "chance per collision"], ["e0", "Gamow peak E₀"], ["pw", "power released"]]);

function fresh() { cnt = { sent: 0, thru: 0 }; anim = null; lastSkip = ""; }
function set(o) {
  Object.assign(P, { tun: true, mode: "demo" }, o);
  if (o.place) { P.lT = Math.log10(PLACES[o.place].T); P.lP = Math.log10(PLACES[o.place].P); }
  Q = rx(P.rx); boost = boostFor(Q);
  ctl.rx.set(P.rx); ctl.place.set(P.place); ctl.lT.set(P.lT); ctl.lP.set(P.lP); ctl.tun.set(P.tun); ctl.mode.set(P.mode);
  fresh();
}
const T = () => Math.pow(10, P.lT), kTnow = () => KB * T();
const odds = E => { const p = P.tun ? tunnel(Q, E) : (E >= Q.Ub ? 1 : 0); return P.mode === "demo" ? Math.min(1, p * boost) : p; };
function launch() { const E = drawE(kTnow(), rnd); const fuse = rnd() < odds(E); cnt.sent++; if (fuse) cnt.thru++; anim = { E, fuse, t: 0 }; }
// skip ahead at the true odds: how many collisions bounce back before one gets through (a geometric distribution)
function skip() {
  const lp = logChance(Q, T(), P.tun); if (lp < -300) { lastSkip = `The chance is about 10${sup(Math.round(lp))} per collision: you would wait for ever.`; return; }
  const p = Math.pow(10, lp), n = p > 0.5 ? 0 : Math.floor(Math.log(1 - rnd()) / Math.log1p(-p));
  lastSkip = `${n.toLocaleString()} collisions bounced back before one fused (true odds).`; P.mode = "true"; ctl.mode.set("true"); cnt.sent += n + 1; cnt.thru += 1;
  let E; do { E = drawE(kTnow(), rnd); } while (rnd() > tunnel(Q, E) && E < Q.Ub * 50); anim = { E, fuse: true, t: 0 };
}
function record() { const lp = logChance(Q, T(), P.tun), b = P.mode === "demo" ? boost : 1; records.push({ txt: `${Q.name}, ${sciL(P.lT, 2)} K${P.tun ? "" : ", no tunnelling"}: ${cnt.thru}/${cnt.sent} with boost ×${sci(b, 1)} → estimate ${cnt.sent ? sci(cnt.thru / cnt.sent / b * 1e6, 2) : "–"} per million (model ${sciL(lp + 6, 2)})` }); if (records.length > 6) records.shift(); }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
const LR0 = Math.log10(0.5), LR1 = 5;                                        // the distance axis: 0.5 fm to 10⁵ fm (log scale)
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h);
  const x0 = 70, x1 = w - 30, yb = h - 70, yt = 120, kT = kTnow(), W = 0.5 * Q.Ub;
  const Emax = P.zoom ? Math.max(8 * kT, 3 * gamowE0(Q, kT)) : 1.25 * Q.Ub, Emin = P.zoom ? 0 : -W * 1.2;
  const X = r => x0 + (Math.log10(Math.max(r, 0.5)) - LR0) / (LR1 - LR0) * (x1 - x0), Y = E => yb - (E - Emin) / (Emax - Emin) * (yb - yt);
  // axes
  c.strokeStyle = "#3a4560"; c.beginPath(); c.moveTo(x0, yt - 10); c.lineTo(x0, yb); c.lineTo(x1, yb); c.stroke();
  for (let e = 0; e <= 5; e++) { const x = X(Math.pow(10, e)); c.fillStyle = "#3a4560"; c.fillRect(x, yb, 1, 5); TX(c, "10" + sup(e) + " fm", x, yb + 18, "#7d8aa5", "center", "11px"); }
  TX(c, "distance between the nuclei (log scale)", (x0 + x1) / 2, yb + 36, "#aab6cc", "center", "12px");
  c.save(); c.translate(18, (yt + yb) / 2); c.rotate(-Math.PI / 2); TX(c, "energy (MeV)", 0, 0, "#aab6cc", "center", "12px"); c.restore();
  if (Emin < 0) { c.strokeStyle = "#3a4560"; c.setLineDash([3, 4]); c.beginPath(); c.moveTo(x0, Y(0)); c.lineTo(x1, Y(0)); c.stroke(); c.setLineDash([]); }
  // the potential: Coulomb barrier outside R, strong-force well inside
  c.save(); c.beginPath(); c.rect(x0, yt - 20, x1 - x0, yb - yt + 20); c.clip();
  c.strokeStyle = "#ff8a70"; c.lineWidth = 2.5; c.beginPath(); c.moveTo(X(0.5), Y(-W)); c.lineTo(X(Q.R), Y(-W)); c.lineTo(X(Q.R), Y(Q.Ub));
  for (let i = 0; i <= 200; i++) { const r = Q.R * Math.pow(1e5 / Q.R, i / 200); c.lineTo(X(r), Y(1.44 * Q.Z[0] * Q.Z[1] / r)); } c.stroke();
  c.fillStyle = "rgba(127,227,160,0.12)"; c.fillRect(X(0.5), Y(Math.min(0, Emax)), X(Q.R) - X(0.5), Y(-W) - Y(Math.min(0, Emax)));
  // energy levels: kT, mean KE, Gamow peak
  for (const [E, lab, col] of [[kT, "kT", "#6fb1ff"], [1.5 * kT, "³⁄₂kT", "#6fb1ff"], [gamowE0(Q, kT), "Gamow peak", "#7fe3a0"]]) { if (E > Emax) continue; c.strokeStyle = col; c.globalAlpha = 0.5; c.setLineDash([4, 5]); c.beginPath(); c.moveTo(x0, Y(E)); c.lineTo(x1, Y(E)); c.stroke(); c.setLineDash([]); c.globalAlpha = 1; TX(c, lab, x1 - 4, Y(E) - 4, col, "right", "11px"); }
  // the incoming nucleus
  if (anim) {
    const E = anim.E, rt = 1.44 * Q.Z[0] * Q.Z[1] / E, rtc = Math.min(rt, 1e5), over = E >= Q.Ub, tt = anim.t;
    const lr = t => Math.log10(1e5) + (Math.log10(over ? Q.R : rtc) - 5) * t;
    let r, y = Y(Math.min(E, Emax * 0.98)), fx = null;
    if (tt < 1) r = Math.pow(10, lr(tt));
    else if (!anim.fuse) r = Math.pow(10, lr(2 - Math.min(2, tt)));
    else { const u = Math.min(1, (tt - 1) / 0.6); r = (over ? Q.R : rtc) * Math.pow((0.6) / (over ? Q.R : rtc), u); if (tt > 1 && !over) { c.strokeStyle = "#ffd166"; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(X(rtc), y); c.lineTo(X(Q.R), y); c.stroke(); c.setLineDash([]); TX(c, "tunnels through", (X(rtc) + X(Q.R)) / 2, y - 8, "#ffd166", "center", "11px"); } if (u >= 1) fx = 1; if (r < Q.R) y = Y(-W * 0.6); }
    c.fillStyle = anim.fuse && tt > 1 ? "#ffd166" : "#6fb1ff"; c.beginPath(); c.arc(X(r), y, 7, 0, 6.3); c.fill();
    if (rt > 1e5 && tt < 1.2) TX(c, "turns back off the right-hand edge (too slow to get even this close)", x1, y - 12, "#7d8aa5", "right", "11px");
    if (fx) { c.fillStyle = "rgba(255,209,102,0.25)"; c.beginPath(); c.arc(X(0.6), Y(-W * 0.6), 30, 0, 6.3); c.fill(); }
  }
  c.restore();
  c.fillStyle = "#ff8a70"; c.beginPath(); c.arc(X(0.5), Y(Math.max(Emin, -W * 0.6)), 9, 0, 6.3); c.fill(); TX(c, "target", X(0.5), Y(Math.max(Emin, -W * 0.6)) + 22, "#ff8a70", "center", "11px");
  if (!P.zoom || Q.Ub <= Emax) TX(c, `barrier ${K.sig(Q.Ub * 1000, 3)} keV at ${Q.R.toFixed(1)} fm`, X(Q.R) + 8, Y(Math.min(Q.Ub, Emax)) + 4, "#ff8a70", "left", "600 12px");
  else TX(c, `↑ barrier peak ${K.sig(Q.Ub * 1000, 3)} keV, far off the top`, X(Q.R) + 8, yt + 4, "#ff8a70", "left", "600 12px");
  if (!P.zoom) TX(c, "strong-force well (drawn shallower than the real 30–50 MeV)", X(0.5) + 4, Y(-W) + 16, "#7fe3a0", "left", "11px");
  // headline text
  TX(c, Q.eq + `   (${K.sig(Q.Q, 3)} MeV released)`, 20, 26, "#eef2f8", "left", "600 14px");
  TX(c, `${PLACES[P.place] && Math.abs(P.lT - Math.log10(PLACES[P.place].T)) < 0.005 ? PLACES[P.place].name + ": " : ""}${sciL(P.lT, 3)} K, ${sciL(P.lP, 2)} Pa${P.tun ? "" : " · tunnelling OFF"}`, 20, 46, "#aab6cc", "left", "12.5px");
  const b = P.mode === "demo" ? boost : 1, lp = logChance(Q, T(), P.tun);
  TX(c, `collisions: ${cnt.sent.toLocaleString()} · fused: ${cnt.thru.toLocaleString()}` + (P.mode === "demo" ? `   ·   demonstration odds: real chance × ${sci(boost, 1)}${Math.pow(10, lp) * boost > 1 ? " (capped at 100%)" : ""}` : "   ·   true odds"), 20, 68, "#ffd166", "left", "12.5px");
  TX(c, `real chance: ${sciL(lp + 6, 2)} per million collisions · your estimate: ${cnt.sent ? sci(cnt.thru / cnt.sent / b * 1e6, 2) : "–"} per million`, 20, 88, "#aab6cc", "left", "12px");
  if (lastSkip) TX(c, lastSkip, 20, 106, "#7fe3a0", "left", "12px");
  records.forEach((q, i) => TX(c, "📌 " + q.txt, 20, h - 50 + (i - records.length + 1) * 15 - 0, "#7d8aa5", "left", "11px"));
}

// ---------------- Charts and readouts ----------------
function charts() {
  const kT = kTnow(), E0 = gamowE0(Q, kT), xm = Math.max(4 * E0, 10 * kT) * 1000, bz = [], tu = [], pr = []; let pm = 0;
  for (let i = 1; i <= 160; i++) { const E = xm / 1000 * i / 160, b = Math.exp(-E / kT), t = P.tun ? tunnel(Q, E) : (E >= Q.Ub ? 1 : 0); bz.push([E * 1000, b]); tu.push([E * 1000, t]); pr.push([E * 1000, b * t]); pm = Math.max(pm, b * t); }
  const tm = Math.max(...tu.map(p => p[1])) || 1;
  chA.opts.title = "Gamow peak"; chA.opts.xLabel = "collision energy (keV)"; chA.opts.yLabel = "relative"; chA.opts.xFmt = null;
  chA.draw([{ pts: bz, color: "#6fb1ff", label: "how many: e^(−E/kT)" }, { pts: tu.map(p => [p[0], p[1] / tm]), color: "#ff8a70", label: "chance to get through" }, { pts: pr.map(p => [p[0], pm ? p[1] / pm : 0]), type: "area", color: "#7fe3a0", label: "product" }], { xMin: 0, xMax: xm, yMin: 0, yMax: 1.05, vlines: E0 * 1000 < xm ? [{ x: E0 * 1000, color: "#7fe3a0", label: "E₀" }] : [] });
  const ser = []; for (const [k, col] of [["pp", "#6fb1ff"], ["DT", "#ffd166"], ["pN", "#ff8a70"], ["CC", "#c9a0ff"]]) { const q = rx(k), pts = []; for (let lt = 6; lt <= 9.5; lt += 0.05) { const v = logSigV(q, Math.pow(10, lt)); if (v > -60) pts.push([lt, v]); } ser.push({ pts, color: col, width: k === P.rx ? 3 : 1.4, label: RX[k].name.split(" (")[0] }); }
  if (!["pp", "DT", "pN", "CC"].includes(P.rx)) { const pts = []; for (let lt = 6; lt <= 9.5; lt += 0.05) { const v = logSigV(Q, Math.pow(10, lt)); if (v > -60) pts.push([lt, v]); } ser.push({ pts, color: "#7fe3a0", width: 3, label: Q.name }); }
  chB.opts.title = "⟨σv⟩ against T"; chB.opts.xLabel = "temperature (K)"; chB.opts.yLabel = "⟨σv⟩ (m³/s)"; chB.opts.xFmt = whole(v => "10" + sup(Math.round(v)));
  chB.draw(ser, { xMin: 6, xMax: 9.5, yMin: -60, yMax: -18, yFmt: v => "10" + sup(Math.round(v)), vlines: [{ x: P.lT, color: "#eef2f8", label: "now" }] });
  const G = gas(Q, T(), Math.pow(10, P.lP)), lp = logChance(Q, T(), P.tun), lpc = logChance(Q, T(), false);
  read.set("kt", `${K.sig(kT * 1000, 3)} keV · ${K.sig(1.5 * kT * 1000, 3)} keV`); read.set("ub", `${K.sig(Q.Ub * 1000, 3)} keV (${sci(Q.Ub / kT, 2)} × kT)`);
  read.set("ch", P.tun ? `${sciL(lp, 2)} (no tunnelling: ${sciL(lpc, 2)})` : sciL(lpc, 2)); read.set("e0", ui.level === "adv" ? `${K.sig(E0 * 1000, 3)} keV · E_G = ${K.sig(Q.EG * 1000, 4)} keV` : `${K.sig(E0 * 1000, 3)} keV`);
  read.set("pw", P.tun ? `${sciL(G.lPow, 2)} W/m³ · each nucleus waits ${sciL(G.lWait - 7.499, 2)} years` : "none (no tunnelling)");
  ui.hud(lp < -100 ? "Practically no collision gets through: too cold for this reaction" : lp < -12 ? "Very rare, but with so many nuclei it adds up" : "Fusion is happening: hot enough for this reaction");
}

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => {
  if (!(dt > 0)) return;
  if (!anim) launch(); else { anim.t += dt * 1.6 * Math.max(1, speed / 2); if (anim.t > (anim.fuse ? 2.1 : 2)) launch(); }
  if (speed > 2) for (let k = 0; k < Math.round((speed - 2) * dt); k++) { const E = drawE(kTnow(), rnd); cnt.sent++; if (rnd() < odds(E)) cnt.thru++; }
}, () => { draw(); if (frame++ % 6 === 0) charts(); });
set({ rx: "pp", place: "core" });
ui.tip("Nuclei arrive from the right with energies set by the temperature. Most bounce off the barrier; a few tunnel through and fuse.", 7000);
