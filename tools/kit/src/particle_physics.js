/* =====================================================================
   PARTICLE PHYSICS
   Atoms are made of protons, neutrons and electrons. Protons and
   neutrons are themselves made of QUARKS:
        proton = uud (charge ⅔ + ⅔ − ⅓ = +1), neutron = udd (0)
   Particles made of quarks are HADRONS: BARYONS (three quarks) and
   MESONS (a quark and an antiquark). Quarks are never seen alone.
   LEPTONS (electron, muon, neutrinos) are not made of quarks.
   In every reaction, CHARGE Q, BARYON NUMBER B and LEPTON NUMBER L
   are conserved. STRANGENESS S is conserved in strong interactions but
   can change by 1 in weak ones (e.g. Λ⁰ → p + π⁻).
   Beta-minus decay: n → p + e⁻ + ν̄ₑ, a d quark becoming a u quark
   through the weak interaction (a W⁻ boson).
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
const QCHG = { u: 2 / 3, d: -1 / 3, s: -1 / 3, c: 2 / 3, b: -1 / 3, t: 2 / 3 };
// the 20 particles: charge, baryon number, lepton number (and family numbers), strangeness, what they are made of
const PARTICLES = {
  proton: { s: "p", Q: 1, B: 1, L: 0, S: 0, quarks: "uud", kind: "baryon" }, neutron: { s: "n", Q: 0, B: 1, L: 0, S: 0, quarks: "udd", kind: "baryon" },
  electron: { s: "e⁻", Q: -1, B: 0, L: 1, Le: 1, S: 0, kind: "lepton" }, positron: { s: "e⁺", Q: 1, B: 0, L: -1, Le: -1, S: 0, kind: "lepton" },
  neutrino_e: { s: "νₑ", Q: 0, B: 0, L: 1, Le: 1, S: 0, kind: "lepton" }, antineutrino_e: { s: "ν̄ₑ", Q: 0, B: 0, L: -1, Le: -1, S: 0, kind: "lepton" },
  pi_plus: { s: "π⁺", Q: 1, B: 0, L: 0, S: 0, quarks: "ud̄", kind: "meson" }, pi_minus: { s: "π⁻", Q: -1, B: 0, L: 0, S: 0, quarks: "ūd", kind: "meson" }, pi_zero: { s: "π⁰", Q: 0, B: 0, L: 0, S: 0, quarks: "uū/dd̄", kind: "meson" },
  kaon_plus: { s: "K⁺", Q: 1, B: 0, L: 0, S: 1, quarks: "us̄", kind: "meson" }, kaon_minus: { s: "K⁻", Q: -1, B: 0, L: 0, S: -1, quarks: "ūs", kind: "meson" },
  photon: { s: "γ", Q: 0, B: 0, L: 0, S: 0, kind: "boson" },
  muon: { s: "μ⁻", Q: -1, B: 0, L: 1, Lm: 1, S: 0, kind: "lepton" }, antimuon: { s: "μ⁺", Q: 1, B: 0, L: -1, Lm: -1, S: 0, kind: "lepton" },
  neutrino_mu: { s: "νμ", Q: 0, B: 0, L: 1, Lm: 1, S: 0, kind: "lepton" }, antineutrino_mu: { s: "ν̄μ", Q: 0, B: 0, L: -1, Lm: -1, S: 0, kind: "lepton" },
  lambda: { s: "Λ⁰", Q: 0, B: 1, L: 0, S: -1, quarks: "uds", kind: "baryon" }, sigma_plus: { s: "Σ⁺", Q: 1, B: 1, L: 0, S: -1, quarks: "uus", kind: "baryon" },
  antiproton: { s: "p̄", Q: -1, B: -1, L: 0, S: 0, quarks: "ūūd̄", kind: "antibaryon" }, antineutron: { s: "n̄", Q: 0, B: -1, L: 0, S: 0, quarks: "ūd̄d̄", kind: "antibaryon" }
};
const PK = Object.keys(PARTICLES); for (const k of PK) { const p = PARTICLES[k]; p.Le = p.Le || 0; p.Lm = p.Lm || 0; }
const EXAMPLES = [
  { n: "β⁻ decay: n → p + e⁻ + ν̄ₑ", r: ["neutron"], p: ["proton", "electron", "antineutrino_e"], d: "Weak interaction: a d quark changes to a u quark via a W⁻ boson." },
  { n: "β⁺ decay: p → n + e⁺ + νₑ", r: ["proton"], p: ["neutron", "positron", "neutrino_e"], d: "Weak interaction: a u quark changes to a d quark via a W⁺ boson (only inside some nuclei, which supply the energy)." },
  { n: "Electron capture: p + e⁻ → n + νₑ", r: ["proton", "electron"], p: ["neutron", "neutrino_e"], d: "Weak interaction: a proton absorbs an inner-shell electron." },
  { n: "Forbidden: p → e⁺ + γ", r: ["proton"], p: ["positron", "photon"], d: "Baryon number goes from 1 to 0 (and lepton number from 0 to −1): forbidden. This is why protons are stable." },
  { n: "Pion decay: π⁺ → μ⁺ + νμ", r: ["pi_plus"], p: ["antimuon", "neutrino_mu"], d: "Weak interaction: a charged pion decays to an antimuon and a muon neutrino." },
  { n: "Kaon production: p + p → p + Λ⁰ + K⁺", r: ["proton", "proton"], p: ["proton", "lambda", "kaon_plus"], d: "Strong interaction: strangeness is conserved (0 → −1 + 1), so strange particles are made in pairs." },
  { n: "Lambda decay: Λ⁰ → p + π⁻", r: ["lambda"], p: ["proton", "pi_minus"], d: "Weak interaction: the s quark becomes a u quark, so strangeness changes by 1. The Λ⁰ lives 10⁻¹⁰ s, very long for a hadron." },
  { n: "Muon decay: μ⁻ → e⁻ + ν̄ₑ + νμ", r: ["muon"], p: ["electron", "antineutrino_e", "neutrino_mu"], d: "Weak interaction: electron and muon lepton numbers are each conserved." },
  { n: "Forbidden: μ⁻ → e⁻ + γ", r: ["muon"], p: ["electron", "photon"], d: "Q and L balance, but the muon family number L_μ goes from 1 to 0: never observed (beyond the spec)." },
  { n: "Annihilation: e⁻ + e⁺ → γ + γ", r: ["electron", "positron"], p: ["photon", "photon"], d: "A particle and its antiparticle annihilate: all their mass becomes energy, two photons to conserve momentum." }
];
const sum = (ks, f) => ks.reduce((s, k) => s + (PARTICLES[k][f] || 0), 0);
// check a reaction: which quantities balance, and the verdict
function check(r, p) {
  const out = {}; for (const f of ["Q", "B", "L", "Le", "Lm", "S"]) out[f] = [sum(r, f), sum(p, f)];
  const ok = ["Q", "B", "L"].every(f => out[f][0] === out[f][1]), dS = Math.abs(out.S[1] - out.S[0]);
  out.verdict = !ok ? "forbidden" : dS === 0 ? "allowed (strong, electromagnetic or weak)" : dS === 1 ? "allowed only by the weak interaction (S changes by 1)" : "forbidden (S changes by 2 or more)";
  out.ok = ok && dS <= 1; return out;
}
// quarks and hadrons
const KNOWN = { uud: "proton p", udd: "neutron n", uds: "Λ⁰ (or Σ⁰)", uus: "Σ⁺", dds: "Σ⁻", uuu: "Δ⁺⁺", ddd: "Δ⁻", uss: "Ξ⁰", dss: "Ξ⁻", sss: "Ω⁻", "ud̄": "π⁺", "dū": "π⁻", "us̄": "K⁺", "sū": "K⁻", "ds̄": "K⁰", "sd̄": "K̄⁰", "uū": "π⁰", "dd̄": "π⁰", "ss̄": "φ meson", "ūūd̄": "antiproton p̄", "ūd̄d̄": "antineutron n̄" };
const isAnti = q => q.length > 1, flav = q => q[0], toks = s => s.match(/.̄?/gu) || [];
const norm = qs => qs.filter(q => !isAnti(q)).sort().join("") + "|" + qs.filter(isAnti).sort().join("");
const KNORM = Object.fromEntries(Object.entries(KNOWN).map(([k, v]) => [norm(toks(k)), v]));
function hadron(qs) {
  qs = qs.filter(Boolean); if (!qs.length) return null; const nq = qs.filter(q => !isAnti(q)).length, na = qs.length - nq;
  const Q = qs.reduce((s, q) => s + (isAnti(q) ? -1 : 1) * QCHG[flav(q)], 0), B = (nq - na) / 3, S = qs.reduce((s, q) => s + (flav(q) === "s" ? (isAnti(q) ? 1 : -1) : 0), 0);
  let kind, ok = true; if (qs.length === 3 && na === 0) kind = "baryon (qqq)"; else if (qs.length === 3 && nq === 0) kind = "antibaryon (q̄q̄q̄)"; else if (qs.length === 2 && nq === 1) kind = "meson (qq̄)"; else { ok = false; kind = qs.length === 1 ? "a single quark: never seen alone (confinement)" : "not allowed: quarks only combine as qqq, q̄q̄q̄ or qq̄"; }
  return { Q, B, S, kind, ok, name: KNORM[norm(qs)] || (ok ? "an excited or exotic state" : "–") };
}
const frac = v => { const t = Math.round(v * 3); if (t % 3 === 0) return (t > 0 ? "+" : t < 0 ? "−" : "") + Math.abs(t / 3); return (t > 0 ? "+" : "−") + Math.abs(t) + "/3"; };
// exact chance that a random reaction (particles picked with equal chances) conserves the chosen quantities: count every combination
function exactP(nr, np, fields, sLimit) {
  const conv = (n) => { let d = new Map([["0,0,0,0", 1]]); for (let i = 0; i < n; i++) { const nd = new Map(); for (const [k, w] of d) { const v = k.split(",").map(Number); for (const pk of PK) { const p = PARTICLES[pk], key = [v[0] + p.Q, v[1] + p.B, v[2] + p.L, v[3] + p.S].join(","); nd.set(key, (nd.get(key) || 0) + w / PK.length); } } d = nd; } return d; };
  const R = conv(nr), Pd = conv(np), idx = { Q: 0, B: 1, L: 2 }; let pr = 0;
  for (const [a, wa] of R) { const va = a.split(",").map(Number); for (const [b, wb] of Pd) { const vb = b.split(",").map(Number); if (fields.every(f => va[idx[f]] === vb[idx[f]]) && (sLimit == null || Math.abs(va[3] - vb[3]) <= sLimit)) pr += wa * wb; } }
  return pr;
}
function randReact(nr, np, r) { const pick = () => PK[Math.floor(r() * PK.length)]; return [Array.from({ length: nr }, pick), Array.from({ length: np }, pick)]; }
// beta-minus decay of a free neutron: electron kinetic energy from the allowed spectrum N(T) ∝ pE(Q − T)², Q = 0.782 MeV
const ME = 0.511, QB = 0.782, betaN = T => { const E = T + ME, p = Math.sqrt(E * E - ME * ME); return p * E * (QB - T) ** 2; };
const BETA_MAX = Math.max(...Array.from({ length: 200 }, (_, i) => betaN(QB * i / 200)));
const betaMean = (() => { let a = 0, b = 0; for (let i = 0; i < 2000; i++) { const T = QB * (i + 0.5) / 2000, n = betaN(T); a += T * n; b += n; } return a / b; })();
function betaT(r) { for (;;) { const T = r() * QB; if (r() * BETA_MAX < betaN(T)) return T; } }
const FEYN = [
  ["beta_minus", "β⁻ decay: n → p + e⁻ + ν̄ₑ", "A d quark in the neutron becomes a u quark, emitting a virtual W⁻ boson, which decays to an electron and an electron antineutrino."],
  ["beta_plus", "β⁺ decay: p → n + e⁺ + νₑ", "A u quark becomes a d quark, emitting a virtual W⁺, which decays to a positron and an electron neutrino."],
  ["capture", "Electron capture: p + e⁻ → n + νₑ", "A proton captures an inner electron; a W boson is exchanged."],
  ["annihilation", "Annihilation: e⁻ + e⁺ → γ + γ", "The electron and positron annihilate; two photons carry away the energy and momentum."],
  ["muon", "Muon decay: μ⁻ → e⁻ + ν̄ₑ + νμ", "The muon becomes a muon neutrino, emitting a W⁻ that decays to an electron and an electron antineutrino."]
];

// ---------------- The page ----------------
const P = { view: "quarks", q1: "u", q2: "u", q3: "d", ex: 0, feyn: 0, Z: 6, A: 14 };
let react = { r: ["neutron"], p: ["proton", "electron", "antineutrino_e"] }, T = 0, bubble = [];
const ui = K.app({
  title: "Particle Physics", subject: "Physics",
  blurb: "Quarks, leptons and hadrons, conservation laws, Feynman diagrams, and what's inside the atom",
  reset: () => set({}),
  levels: { std: "Standard (iGCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Physics (4PH1) 7: the structure of the atom (protons, neutrons, electrons; relative masses and charges), atomic and mass numbers, isotopes, beta-minus decay. Quarks, leptons and conservation laws are not in 4PH1.", adv: "WJEC Eduqas A level Physics: particles and nuclear structure: quarks (u, d), leptons, hadrons (baryons and mesons), antiparticles, the four forces, conservation of charge, baryon number and lepton number in reactions. Strangeness, lepton family numbers and Feynman diagrams are beyond the spec." } },
  missions: [
    { title: "Inside the atom", q: "Choose carbon-14 in the Atom view. How many protons, neutrons and electrons? What are their relative masses and charges?", hint: "6 protons (+1, mass 1), 8 neutrons (0, mass 1), 6 electrons (−1, mass about 1/1840). Atomic number Z = 6 (protons), mass number A = 14 (protons + neutrons).", setup() { set({ view: "atom", Z: 6, A: 14 }); } },
    { title: "Isotopes", q: "Compare carbon-12 and carbon-14. What is the same and what is different?", hint: "Isotopes have the same number of protons (same element, same chemistry) but different numbers of neutrons, so different mass numbers. Carbon-14 is radioactive (β⁻ decay to nitrogen-14).", setup() { set({ view: "atom", Z: 6, A: 12 }); } },
    { title: "Beta-minus decay", q: "In β⁻ decay a neutron changes. What does it become, and what happens to Z and A?", hint: "n → p + e⁻ (+ an antineutrino). The electron is the beta particle. Z goes up by 1, A stays the same: ¹⁴₆C → ¹⁴₇N + β⁻.", setup() { set({ view: "react", ex: 0 }); } },
    { lvl: "adv", title: "Proton: uud", q: "Build a proton from quarks. Check its charge and baryon number. Now build a neutron.", hint: "u (+⅔) + u (+⅔) + d (−⅓) = +1; B = ⅓ × 3 = 1. Neutron udd: ⅔ − ⅓ − ⅓ = 0.", setup() { set({ view: "quarks", q1: "u", q2: "u", q3: "d" }); } },
    { lvl: "adv", title: "Mesons", q: "Build a π⁺ from u and d̄. What is its baryon number? Why can't a meson be made of two quarks?", hint: "π⁺ = ud̄: charge ⅔ + ⅓ = +1, B = ⅓ − ⅓ = 0. Mesons are a quark and an antiquark; two quarks (B = ⅔) is not allowed.", setup() { set({ view: "quarks", q1: "u", q2: "d̄", q3: "" }); } },
    { lvl: "adv", title: "Is it allowed?", q: "Check p → e⁺ + γ. Which law does it break?", hint: "Charge balances (+1 → +1) but baryon number goes 1 → 0 and lepton number 0 → −1: forbidden. Proton decay has never been seen (lifetime > 10³⁴ years).", setup() { set({ view: "react", ex: 3 }); } },
    { lvl: "adv", title: "Strangeness", q: "Compare kaon production (p + p → p + Λ⁰ + K⁺) with Λ⁰ decay (Λ⁰ → p + π⁻). Which conserves strangeness?", hint: "Production: S 0 → −1 + 1 = 0, a strong interaction (strange particles made in pairs). Decay: S −1 → 0, so only the weak interaction can do it: slow, about 10⁻¹⁰ s. (Strangeness is beyond the spec.)", setup() { set({ view: "react", ex: 5 }); } },
    { lvl: "adv", title: "Feynman: β⁻ decay", q: "Watch the Feynman diagram for β⁻ decay. Which boson carries the weak interaction here?", hint: "A W⁻ boson: a d quark becomes a u quark and emits a W⁻, which decays to an electron and an electron antineutrino. (Feynman diagrams are beyond the spec.)", setup() { set({ view: "feyn", feyn: 0 }); } }
  ],
  batch: [
    { title: "How often is charge conserved by chance?", question: "If we make random reactions with 1 particle before and 2 after, how often does charge balance?", how: "Particles picked with equal chances from the 20 in the list; 500 random reactions per run; exact value from counting every combination.", yLabel: "% with charge conserved", reps: 100, bins: 20, theory: 100 * exactP(1, 2, ["Q"]), theoryLabel: "exact", run: (x, r) => { let n = 0; for (let i = 0; i < 500; i++) { const [a, b] = randReact(1, 2, r); if (sum(a, "Q") === sum(b, "Q")) n++; } return 100 * n / 500; }, note: "About 30%: charge alone rules out most random reactions." },
    { title: "Q, B and L all at once?", question: "How often does a random 1 → 2 reaction conserve charge, baryon number and lepton number together?", how: "As above.", yLabel: "% allowed", reps: 100, bins: 20, theory: 100 * exactP(1, 2, ["Q", "B", "L"]), theoryLabel: "exact", run: (x, r) => { let n = 0; for (let i = 0; i < 500; i++) { const [a, b] = randReact(1, 2, r); if (check(a, b).Q.every((v, _, A) => v === A[0]) && sum(a, "B") === sum(b, "B") && sum(a, "L") === sum(b, "L")) n++; } return 100 * n / 500; }, note: "Under 5%: the conservation laws together are very restrictive, which is why physicists use them to predict which reactions can happen." },
    { title: "More products, less chance?", question: "How does the chance of conserving charge depend on the number of products?", how: "1 particle before, 1 to 5 after; 500 random reactions per run.", xLabel: "number of products", yLabel: "% with charge conserved", xs: [1, 2, 3, 4, 5], reps: 10, yMin: 0, theory: n => 100 * exactP(1, n, ["Q"]), theoryLabel: "exact", run: (n, r) => { let k = 0; for (let i = 0; i < 500; i++) { const [a, b] = randReact(1, n, r); if (sum(a, "Q") === sum(b, "Q")) k++; } return 100 * k / 500; }, note: "The spread of possible total charges widens with more particles, so hitting the right one exactly becomes less likely." },
    { title: "Does strangeness make it rarer?", question: "Of random 2 → 2 reactions, how many conserve Q, B, L and strangeness (strong interactions)?", how: "500 random reactions per run.", yLabel: "% allowed with S conserved", reps: 100, bins: 20, theory: 100 * exactP(2, 2, ["Q", "B", "L"], 0), theoryLabel: "exact", run: (x, r) => { let n = 0; for (let i = 0; i < 500; i++) { const [a, b] = randReact(2, 2, r), c = check(a, b); if (c.Q[0] === c.Q[1] && c.B[0] === c.B[1] && c.L[0] === c.L[1] && c.S[0] === c.S[1]) n++; } return 100 * n / 500; }, note: "Only about 2%: strangeness adds one more law that strong interactions must obey." },
    { title: "Why are beta electrons spread out?", question: "What kinetic energies do electrons from neutron β⁻ decay have?", how: "Sampled from the allowed spectrum N(T) ∝ pE(Q − T)² with Q = 0.782 MeV.", yLabel: "electron kinetic energy (MeV)", reps: 1000, bins: 24, theory: betaMean, theoryLabel: "mean of the spectrum", run: (x, r) => betaT(r), note: "A spread from 0 to 0.78 MeV, not a single value: a third particle (the antineutrino) carries away the rest. This puzzle led Pauli to predict the neutrino in 1930." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4PH1 7", text: "Protons (mass 1, charge +1) and neutrons (mass 1, charge 0) are in the nucleus; electrons (mass about 1/2000, charge −1) orbit it. Atomic number Z = protons; mass number A = protons + neutrons." },
      { lvl: "std", tag: "4PH1 7", text: "Isotopes: atoms of the same element (same Z) with different numbers of neutrons (different A)." },
      { lvl: "std", tag: "4PH1 7", text: "β⁻ decay: a neutron changes into a proton and an electron; the electron is emitted. Z increases by 1, A is unchanged." },
      { lvl: "adv", tag: "Eduqas", text: "Hadrons are made of quarks: baryons qqq (p = uud, n = udd), mesons qq̄ (π⁺ = ud̄). u: +⅔, d: −⅓. Leptons (e, μ, ν) are fundamental." },
      { lvl: "adv", tag: "Eduqas", text: "Conservation in every reaction: charge Q, baryon number B (quarks ⅓, antiquarks −⅓), lepton number L (leptons +1, antileptons −1)." },
      { lvl: "adv", tag: "Eduqas", text: "Four forces: strong (holds quarks and nuclei), weak (beta decay; W and Z bosons), electromagnetic (photon), gravity." },
      { lvl: "beyond", tag: "Beyond the spec", text: "Strangeness: conserved in strong interactions, changes by 1 in weak ones. Lepton numbers are conserved for each family (L_e, L_μ) separately." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: () => `An atom has ${P.Z} protons and mass number ${P.A}. State the numbers of neutrons and electrons, and its atomic number.`, ans: () => `<ul><li>neutrons = ${P.A} − ${P.Z} = ${P.A - P.Z}</li><li>electrons = ${P.Z} (a neutral atom)</li><li>atomic number Z = ${P.Z}</li></ul>` },
      { lvl: "std", marks: 2, q: "Complete: ¹⁴₆C → ¹⁴₇N + ?", ans: "<ul><li>a beta particle (electron) ⁰₋₁e</li><li>14 = 14 + 0 and 6 = 7 + (−1)</li></ul>" },
      { lvl: "adv", marks: 3, q: "Show that the reaction p + p → p + p + π⁰ obeys the conservation laws.", ans: "<ul><li>Q: 1 + 1 = 1 + 1 + 0 ✓</li><li>B: 1 + 1 = 1 + 1 + 0 ✓</li><li>L: 0 = 0 ✓</li></ul>" },
      { lvl: "adv", marks: 2, q: "State the quark structure of a neutron and use it to show the neutron's charge is zero.", ans: "<ul><li>udd</li><li>+⅔ − ⅓ − ⅓ = 0</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li>Standard quantum numbers for 20 particles (charge, baryon number, lepton number and the electron and muon family numbers, strangeness). The checker adds them up on each side: Q, B and L must balance; if only S changes by 1 the reaction can only be weak; a change of 2 or more is forbidden in one step.</li>
<li>Energy, momentum, spin and the tau family are not checked (so some 'allowed' reactions cannot happen for energy reasons, e.g. a free proton cannot β⁺ decay).</li>
<li>Bubble-chamber pictures are cartoons: charged tracks curve one way or the other by the sign of the charge, neutral particles are dashed, neutrinos leave no track.</li>
<li>Batch runs pick particles at random with equal chances; exact values come from counting every combination. The β⁻ spectrum uses N(T) ∝ pE(Q − T)² with Q = 0.782 MeV (no Coulomb correction).</li></ul>
<p>The earlier version of this simulation (with more examples and a quark confinement animation), with its worksheets, is kept in <a href="original/particle-physics.html">original/particle-physics.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {}, QS = ["", "u", "d", "s", "c", "ū", "d̄", "s̄", "c̄"];
let g = ui.group("View");
ctl.view = K.seg(g, { value: "quarks", options: [["atom", "⚛ The atom"], ["quarks", "🔴 Quarks (A level)"], ["react", "⚖ Conservation"], ["feyn", "〰 Feynman diagrams"]], on: v => P.view = v });
g = ui.group("The atom");
ctl.Z = K.slider(g, { label: "Protons (atomic number Z)", min: 1, max: 20, step: 1, value: 6, on: v => { P.Z = v; if (P.A < v) { P.A = v; ctl.A.set(v); } } });
ctl.A = K.slider(g, { label: "Mass number A", min: 1, max: 44, step: 1, value: 14, on: v => { P.A = Math.max(v, P.Z); } });
g = ui.group("Build a hadron");
ctl.q1 = K.seg(g, { label: "Quark 1", value: "u", options: QS.slice(1).map(q => [q, q]), on: v => P.q1 = v });
ctl.q2 = K.seg(g, { label: "Quark 2", value: "u", options: QS.slice(1).map(q => [q, q]), on: v => P.q2 = v });
ctl.q3 = K.seg(g, { label: "Quark 3", value: "d", options: QS.map(q => [q, q || "none"]), on: v => P.q3 = v });
g = ui.group("Reactions");
ctl.ex = K.seg(g, { label: "Examples", value: 0, options: EXAMPLES.map((e, i) => [i, e.n]), on: v => { P.ex = +v; react = { r: EXAMPLES[P.ex].r.slice(), p: EXAMPLES[P.ex].p.slice() }; makeBubble(); } });
const sel = K.$("select", ""); sel.style.cssText = "width:100%;padding:5px;margin:4px 0;background:var(--panel2,#16203a);color:inherit;border:1px solid #3a4a6b;border-radius:6px"; sel.innerHTML = PK.map(k => `<option value="${k}">${PARTICLES[k].s}  ${k.replace(/_/g, " ")}</option>`).join(""); g.append(sel);
let rr = K.row(g); K.btn(rr, "+ before", () => { if (react.r.length < 4) react.r.push(sel.value); makeBubble(); }); K.btn(rr, "+ after", () => { if (react.p.length < 5) react.p.push(sel.value); makeBubble(); }); K.btn(rr, "clear", () => { react = { r: [], p: [] }; makeBubble(); });
g = ui.group("Feynman diagrams (beyond the spec)");
ctl.feyn = K.seg(g, { value: 0, options: FEYN.map((f, i) => [i, f[1]]), on: v => { P.feyn = +v; T = 0; } });
const read = K.readout(ui.group("Readings"), [["a", "–"], ["b", "–"], ["c", "–"], ["d", "–"]]);
const label = (i, s) => { read.el.children[i].firstElementChild.textContent = s; };
function set(o) { Object.assign(P, { view: "quarks", q1: "u", q2: "u", q3: "d", ex: 0, feyn: 0, Z: 6, A: 14 }, o); for (const k of ["view", "q1", "q2", "q3", "ex", "feyn"]) ctl[k].set(P[k]); ctl.Z.set(P.Z); ctl.A.set(P.A); react = { r: EXAMPLES[P.ex].r.slice(), p: EXAMPLES[P.ex].p.slice() }; makeBubble(); T = 0; }
// cartoon bubble-chamber tracks for the products
function makeBubble() { const r = K.rng(react.p.join().length * 7 + 3); bubble = react.p.map((k, i) => ({ k, a: -0.9 + 1.8 * (i + 0.5) / Math.max(1, react.p.length) + 0.2 * r.gauss(), curv: PARTICLES[k].Q * (0.6 + 0.6 * r()), len: 0.6 + 0.4 * r() })); T = 0; }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
const QCOL = { u: "#ff6b81", d: "#5ad1ff", s: "#7ee787", c: "#ffd166" };
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#070b16"; c.fillRect(0, 0, w, h); const adv = ui.level === "adv";
  if (P.view === "atom") {
    const N = P.A - P.Z, cx = w * 0.32, cy = h * 0.5, r = 7, nuc = []; const rng = K.rng(P.Z * 100 + P.A);
    for (let i = 0; i < P.A; i++) { const a = i * 2.39996, rad = r * 1.05 * Math.sqrt(i + 0.5); nuc.push([cx + rad * Math.cos(a), cy + rad * Math.sin(a), i < P.Z ? "p" : "n"]); }
    nuc.sort(() => rng() - 0.5).forEach(([x, y, t]) => { c.fillStyle = t === "p" ? "#ff6b81" : "#8fa0bf"; c.beginPath(); c.arc(x, y, r, 0, 6.3); c.fill(); TX(c, t === "p" ? "+" : "", x, y + 4, "#fff", "center", "600 10px"); });
    const shells = [2, 8, 8, 18]; let e = P.Z, sh = 0; while (e > 0) { const n = Math.min(e, shells[sh]), R = 70 + sh * 45; c.strokeStyle = "rgba(255,255,255,.15)"; c.beginPath(); c.arc(cx, cy, R, 0, 6.3); c.stroke(); for (let i = 0; i < n; i++) { const a = i / n * 6.283 + T * 0.4 / (sh + 1); c.fillStyle = "#ffd166"; c.beginPath(); c.arc(cx + R * Math.cos(a), cy + R * Math.sin(a), 4.5, 0, 6.3); c.fill(); } e -= n; sh++; }
    const names = ["", "H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne", "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar", "K", "Ca"];
    let y = 110; const L = (s, col = "#cfd8ea", f = "13px") => { TX(c, s, w * 0.62, y, col, "left", f); y += 26; };
    L(`${names[P.Z]}-${P.A}:  ${P.A}${names[P.Z]} with Z = ${P.Z}`, "#eef2f8", "600 16px"); L(`${P.Z} protons (red): charge +1, mass 1`, "#ff6b81"); L(`${N} neutrons (grey): charge 0, mass 1`, "#aab6cc"); L(`${P.Z} electrons (yellow): charge −1, mass ≈ 1/1840`, "#ffd166");
    y += 10; L(N > P.Z * 1.35 + 1 ? "Too many neutrons for stability: likely β⁻ decay (n → p + e⁻)" : N < P.Z - 1 ? "Too few neutrons: likely β⁺ decay or electron capture" : "A plausible stable or near-stable isotope", "#c9a0ff", "12.5px");
    TX(c, "not to scale: the nucleus is about 100 000 times smaller than the atom", 14, h - 12, "#7d8aa5", "left", "11px");
  } else if (P.view === "quarks") {
    const qs = [P.q1, P.q2, P.q3].filter(Boolean), H = hadron(qs), cx = w * 0.3, cy = h * 0.48;
    c.strokeStyle = H.ok ? "rgba(255,255,255,.25)" : "rgba(255,107,129,.5)"; c.lineWidth = 2; c.beginPath(); c.arc(cx, cy, 110, 0, 6.3); c.stroke(); c.lineWidth = 1;
    qs.forEach((q, i) => { const a = i / qs.length * 6.283 + T * 0.8, x = cx + 55 * Math.cos(a) + 6 * Math.sin(T * 5 + i), y = cy + 55 * Math.sin(a) + 6 * Math.cos(T * 4 + i), col = QCOL[flav(q)]; if (isAnti(q)) { c.strokeStyle = col; c.lineWidth = 4; c.beginPath(); c.arc(x, y, 20, 0, 6.3); c.stroke(); c.lineWidth = 1; } else { c.fillStyle = col; c.beginPath(); c.arc(x, y, 20, 0, 6.3); c.fill(); } TX(c, q, x, y + 6, isAnti(q) ? col : "#0a1020", "center", "600 17px"); });
    if (H.ok) for (let i = 0; i < qs.length; i++) for (let j = i + 1; j < qs.length; j++) { c.strokeStyle = "rgba(255,255,255,.2)"; c.setLineDash([3, 4]); const a = i / qs.length * 6.283 + T * 0.8, b = j / qs.length * 6.283 + T * 0.8; c.beginPath(); c.moveTo(cx + 55 * Math.cos(a), cy + 55 * Math.sin(a)); c.lineTo(cx + 55 * Math.cos(b), cy + 55 * Math.sin(b)); c.stroke(); c.setLineDash([]); }
    let y = 110; const L = (s, col = "#cfd8ea", f = "13px") => { TX(c, s, w * 0.58, y, col, "left", f); y += 26; };
    L(qs.join(" ") + "  →  " + (H.ok ? H.name : "?"), "#eef2f8", "600 17px"); L(H.kind, H.ok ? "#7ee787" : "#ff6b81", "600 13px");
    L(`charge Q = ${qs.map(q => frac((isAnti(q) ? -1 : 1) * QCHG[flav(q)])).join(" ")} = ${frac(H.Q)}`); L(`baryon number B = ${frac(H.B)}`); if (adv) L(`strangeness S = ${H.S} (beyond the spec)`, "#c9a0ff");
    L("filled = quark · ring = antiquark · u +⅔, d −⅓, s −⅓", "#7d8aa5", "11.5px");
    if (!adv) TX(c, "Quarks are A level: switch to Advanced for the full story", 14, h - 12, "#8fa0bf", "left", "11.5px");
  } else if (P.view === "react") {
    const C = check(react.r, react.p), cx = w * 0.32, cy = h * 0.55, k = Math.min(1, T / 1.5);
    TX(c, react.r.map(q => PARTICLES[q].s).join(" + ") + "  →  " + react.p.map(q => PARTICLES[q].s).join(" + "), 20, 30, "#eef2f8", "left", "600 17px");
    c.strokeStyle = "rgba(255,255,255,.08)"; for (let i = 0; i < 40; i++) { c.beginPath(); c.arc(30 + (i * 97) % (w * 0.6), 60 + (i * 53) % (h - 80), 1.5, 0, 6.3); c.stroke(); }
    react.r.forEach((q, i) => { const p = PARTICLES[q], y0 = cy + (i - (react.r.length - 1) / 2) * 30; c.strokeStyle = p.Q ? "#cfd8ea" : "rgba(207,216,234,.5)"; c.setLineDash(p.Q ? [] : [5, 4]); c.lineWidth = 2; c.beginPath(); c.moveTo(30, y0); c.lineTo(cx, cy); c.stroke(); c.setLineDash([]); c.lineWidth = 1; TX(c, p.s, 30, y0 - 6, "#cfd8ea", "left", "13px"); });
    if (C.ok) for (const b of bubble) { const p = PARTICLES[b.k]; if (p.kind === "lepton" && !p.Q) continue; c.strokeStyle = p.Q > 0 ? "#ff8a70" : p.Q < 0 ? "#5ad1ff" : "rgba(255,255,255,.5)"; c.setLineDash(p.Q ? [] : [5, 4]); c.lineWidth = 2; c.beginPath(); let x = cx, y = cy, a = b.a; c.moveTo(x, y); for (let s = 0; s < 60 * k * b.len; s++) { a += b.curv * 0.02; x += 4 * Math.cos(a); y += 4 * Math.sin(a); c.lineTo(x, y); } c.stroke(); c.setLineDash([]); c.lineWidth = 1; TX(c, p.s, x + 6, y, "#eef2f8", "left", "13px"); }
    else { TX(c, "✗ forbidden: it cannot happen", cx, cy - 20, "#ff6b81", "center", "600 15px"); }
    c.fillStyle = "#ffd166"; c.beginPath(); c.arc(cx, cy, 5, 0, 6.3); c.fill();
    let y = 70; const L = (s, col, f = "13px") => { TX(c, s, w * 0.62, y, col, "left", f); y += 24; };
    for (const [f, nm, lv] of [["Q", "charge Q", 0], ["B", "baryon number B", 1], ["L", "lepton number L", 1], ["S", "strangeness S", 2], ["Le", "L_e", 2], ["Lm", "L_μ", 2]]) { if (lv && !adv) continue; const [a, b] = C[f], okk = a === b; L(`${nm}: ${a} → ${b} ${okk ? "✓" : f === "S" && Math.abs(a - b) === 1 ? "(changes by 1: weak only)" : "✗"}`, okk ? "#7ee787" : f === "S" && Math.abs(a - b) === 1 ? "#ffd166" : "#ff6b81", lv === 2 ? "12px" : "13px"); }
    y += 6; L(C.verdict, C.ok ? "#7ee787" : "#ff6b81", "600 13px"); const ex = EXAMPLES.find(e => e.r.join() === react.r.join() && e.p.join() === react.p.join()); if (ex) { c.font = "12px Segoe UI"; const words = ex.d.split(" "); let line = ""; for (const wd of words) { if (c.measureText(line + wd).width > w * 0.36) { L(line, "#aab6cc", "12px"); line = ""; } line += wd + " "; } L(line, "#aab6cc", "12px"); }
    TX(c, "cartoon bubble chamber: + tracks curve one way, − the other, neutral dashed, neutrinos unseen", 14, h - 12, "#7d8aa5", "left", "11px");
  } else {
    const [key, name, desc] = FEYN[P.feyn], k = Math.min(1, T / 2.5), x0 = w * 0.18, x1 = w * 0.62, y0 = h - 70, y1 = 70, ym = (y0 + y1) / 2;
    const line = (a, b, col, txt, kind) => { const t = K.clamp((k - a[2]) / 0.3, 0, 1); if (t <= 0) return; const ex = a[0] + (b[0] - a[0]) * t, ey = a[1] + (b[1] - a[1]) * t; c.strokeStyle = col; c.lineWidth = 2.5; c.beginPath(); if (kind === "wave") { const n = 12; for (let i = 0; i <= 40 * t; i++) { const s = i / 40, x = a[0] + (b[0] - a[0]) * s, y = a[1] + (b[1] - a[1]) * s, nx = -(b[1] - a[1]), ny = b[0] - a[0], L = Math.hypot(nx, ny), off = 6 * Math.sin(s * n * 6.283); i ? c.lineTo(x + nx / L * off, y + ny / L * off) : c.moveTo(x, y); } } else { c.moveTo(a[0], a[1]); c.lineTo(ex, ey); } c.stroke(); c.lineWidth = 1; if (t > 0.9) TX(c, txt, (a[0] + b[0]) / 2 + 10, (a[1] + b[1]) / 2, col, "left", "600 14px"); };
    const V1 = [x0, ym + 40], V2 = [x1, ym - 40];
    const D = { beta_minus: [[[x0 - 60, y0, 0], [...V1, 0], "#5ad1ff", "d"], [[...V1, 0.3], [x0 - 60, y1, 0.3], "#ff6b81", "u"], [[...V1, 0.3], [...V2, 0.3], "#ffd166", "W⁻", "wave"], [[...V2, 0.6], [x1 + 90, y1 + 20, 0.6], "#7ee787", "e⁻"], [[...V2, 0.6], [x1 + 90, ym + 40, 0.6], "#c9a0ff", "ν̄ₑ"]],
      beta_plus: [[[x0 - 60, y0, 0], [...V1, 0], "#ff6b81", "u"], [[...V1, 0.3], [x0 - 60, y1, 0.3], "#5ad1ff", "d"], [[...V1, 0.3], [...V2, 0.3], "#ffd166", "W⁺", "wave"], [[...V2, 0.6], [x1 + 90, y1 + 20, 0.6], "#7ee787", "e⁺"], [[...V2, 0.6], [x1 + 90, ym + 40, 0.6], "#c9a0ff", "νₑ"]],
      capture: [[[x0 - 60, y0, 0], [...V1, 0], "#ff6b81", "u (in p)"], [[...V1, 0.3], [x0 - 60, y1, 0.3], "#5ad1ff", "d (in n)"], [[...V1, 0.3], [...V2, 0.3], "#ffd166", "W⁺", "wave"], [[x1 + 90, y0, 0], [...V2, 0], "#7ee787", "e⁻"], [[...V2, 0.6], [x1 + 90, y1, 0.6], "#c9a0ff", "νₑ"]],
      annihilation: [[[x0 - 60, y0, 0], [...V1, 0], "#7ee787", "e⁻"], [[x1 + 90, y0, 0], [...V1, 0], "#ff8a70", "e⁺"], [[...V1, 0.35], [x0 - 60, y1, 0.35], "#ffd166", "γ", "wave"], [[...V1, 0.35], [x1 + 90, y1, 0.35], "#ffd166", "γ", "wave"]],
      muon: [[[x0 - 60, y0, 0], [...V1, 0], "#5ad1ff", "μ⁻"], [[...V1, 0.3], [x0 - 60, y1, 0.3], "#c9a0ff", "νμ"], [[...V1, 0.3], [...V2, 0.3], "#ffd166", "W⁻", "wave"], [[...V2, 0.6], [x1 + 90, y1 + 20, 0.6], "#7ee787", "e⁻"], [[...V2, 0.6], [x1 + 90, ym + 40, 0.6], "#c9a0ff", "ν̄ₑ"]] }[key];
    for (const L of D) line(L[0], L[1], L[2], L[3], L[4]);
    c.strokeStyle = "#56607a"; c.beginPath(); c.moveTo(w - 40, y0); c.lineTo(w - 40, y1); c.stroke(); TX(c, "time ↑", w - 44, y1 - 8, "#8fa0bf", "right", "11px");
    TX(c, name, 20, 28, "#eef2f8", "left", "600 15px"); TX(c, desc, 20, h - 16, "#aab6cc", "left", "12px");
  }
}

// ---------------- Charts and readings ----------------
function charts() {
  chA.opts.xFmt = null; chB.opts.xFmt = null;
  if (P.view === "atom") {
    chA.opts.title = "Particles in the atom"; chA.opts.xLabel = ""; chA.opts.yLabel = "number"; chA.opts.xFmt = whole(i => ["", "protons", "neutrons", "electrons"][i] || "");
    chA.draw([{ pts: [[1, P.Z]], type: "bars", w: 0.6, color: "#ff6b81", label: "p" }, { pts: [[2, P.A - P.Z]], type: "bars", w: 0.6, color: "#8fa0bf", label: "n" }, { pts: [[3, P.Z]], type: "bars", w: 0.6, color: "#ffd166", label: "e" }], { yMin: 0, xMin: 0.4, xMax: 3.6 });
    const pts = []; for (let Z = 1; Z <= 20; Z++) pts.push([Z, Z <= 20 ? Math.round(Z * (1 + 0.006 * Z * Z / 4)) : 0]);
    chB.opts.title = "Neutrons against protons (stable nuclei)"; chB.opts.xLabel = "protons Z"; chB.opts.yLabel = "neutrons N"; chB.draw([{ pts, color: "#7ee787", label: "stable band (approx.)" }, { pts: [[0, 0], [20, 20]], color: "#56607a", dash: [4, 4], label: "N = Z" }, { pts: [[P.Z, P.A - P.Z]], type: "dots", r: 6, color: "#ffd166", label: "now" }], { xMin: 0, yMin: 0 });
    label(0, "atomic number Z"); label(1, "mass number A"); label(2, "neutrons"); label(3, "electrons (neutral atom)"); read.set("a", String(P.Z)); read.set("b", String(P.A)); read.set("c", String(P.A - P.Z)); read.set("d", String(P.Z));
  } else if (P.view === "react") {
    const C = check(react.r, react.p), fs = ui.level === "adv" ? ["Q", "B", "L", "S"] : ["Q", "B", "L"];
    chA.opts.title = "Before and after"; chA.opts.xLabel = ""; chA.opts.yLabel = "total"; chA.opts.xFmt = whole(i => fs[i - 1] || "");
    chA.draw([{ pts: fs.map((f, i) => [i + 0.83, C[f][0]]), type: "bars", w: 0.3, color: "#5ad1ff", label: "before" }, { pts: fs.map((f, i) => [i + 1.17, C[f][1]]), type: "bars", w: 0.3, color: "#ffd166", label: "after" }], { xMin: 0.4, xMax: fs.length + 0.6 });
    const hs = []; const r = K.rng(5); for (let i = 0; i < 3000; i++) hs.push(betaT(r)); const hh = K.histogram(hs, 20);
    chB.opts.title = "β⁻ electron energies (neutron decay)"; chB.opts.xLabel = "kinetic energy (MeV)"; chB.opts.yLabel = "number"; chB.draw([{ pts: hh.pts, w: hh.w, type: "bars", color: "#7ee787", label: "electrons" }], { vlines: [{ x: QB, label: "Q = 0.782 MeV", color: "#ff8a70" }] });
    label(0, "charge Q"); label(1, "baryon number B"); label(2, "lepton number L"); label(3, "verdict"); read.set("a", C.Q.join(" → ")); read.set("b", C.B.join(" → ")); read.set("c", C.L.join(" → ")); read.set("d", C.verdict);
  } else {
    const qs = [P.q1, P.q2, P.q3].filter(Boolean), H = hadron(qs);
    chA.opts.title = "Charges of the quarks"; chA.opts.xLabel = ""; chA.opts.yLabel = "charge (e)"; chA.opts.xFmt = whole(i => qs[i - 1] || (i === qs.length + 1 ? "total" : ""));
    chA.draw([{ pts: qs.map((q, i) => [i + 1, (isAnti(q) ? -1 : 1) * QCHG[flav(q)]]), type: "bars", w: 0.6, color: "#c9a0ff", label: "quark" }, { pts: [[qs.length + 1, H.Q]], type: "bars", w: 0.6, color: "#ffd166", label: "total" }], { xMin: 0.4, xMax: qs.length + 1.6, yMin: -1.2, yMax: 2.2 });
    chB.opts.title = "Particle families (the 20 in the reaction list)"; chB.opts.xLabel = ""; chB.opts.yLabel = "number"; const kinds = ["baryon", "antibaryon", "meson", "lepton", "boson"]; chB.opts.xFmt = whole(i => kinds[i - 1] || "");
    chB.draw([{ pts: kinds.map((kk, i) => [i + 1, PK.filter(p => PARTICLES[p].kind === kk).length]), type: "bars", w: 0.6, color: "#5ad1ff", label: "particles" }], { yMin: 0, xMin: 0.4, xMax: kinds.length + 0.6 });
    label(0, "hadron"); label(1, "charge"); label(2, "baryon number"); label(3, "type"); read.set("a", H.name); read.set("b", frac(H.Q)); read.set("c", frac(H.B)); read.set("d", H.kind);
  }
  ui.hud({ atom: "Protons and neutrons in the nucleus, electrons around it", quarks: "Quarks combine as qqq (baryons) or qq̄ (mesons)", react: "Q, B and L must balance in every reaction", feyn: "Feynman diagrams: time runs upwards" }[P.view]);
}
let frame = 0;
ui.run(dt => { if (dt > 0) T += dt; }, () => { draw(); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("Four views: the atom, quarks, conservation laws and Feynman diagrams.", 6000);
