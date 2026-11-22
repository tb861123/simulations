/* =====================================================================
   ATOMIC STRUCTURE AND ISOTOPES
   An atom: a tiny nucleus of PROTONS (+1) and NEUTRONS (0), with
   ELECTRONS (−1) in shells around it.
     atomic number Z = protons (this decides the element)
     mass number   A = protons + neutrons
     charge          = protons − electrons (ions have lost or gained electrons)
   ISOTOPES: atoms of the same element (same protons) with different
   numbers of neutrons, so different masses.
   RELATIVE ATOMIC MASS Ar: the average mass of the atoms in a natural
   sample, weighted by how common each isotope is:
       Ar = Σ (isotope mass × abundance) ÷ 100
   A mass spectrometer measures it by "weighing" atoms one at a time.
   Isotope masses and abundances: IUPAC / NIST data.
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
const SYM = ["", "H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne", "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar", "K", "Ca", "Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn", "Ga", "Ge", "As", "Se", "Br", "Kr"];
const NAME = ["", "hydrogen", "helium", "lithium", "beryllium", "boron", "carbon", "nitrogen", "oxygen", "fluorine", "neon", "sodium", "magnesium", "aluminium", "silicon", "phosphorus", "sulfur", "chlorine", "argon", "potassium", "calcium", "scandium", "titanium", "vanadium", "chromium", "manganese", "iron", "cobalt", "nickel", "copper", "zinc", "gallium", "germanium", "arsenic", "selenium", "bromine", "krypton"];
// natural isotopes: [mass number, abundance %, exact mass in u]
const ISO = {
  1: [[1, 99.9885, 1.007825], [2, 0.0115, 2.014102]], 2: [[3, 0.000134, 3.016029], [4, 99.999866, 4.002603]], 3: [[6, 7.59, 6.015123], [7, 92.41, 7.016004]], 4: [[9, 100, 9.012182]],
  5: [[10, 19.9, 10.012937], [11, 80.1, 11.009305]], 6: [[12, 98.93, 12], [13, 1.07, 13.003355]], 7: [[14, 99.636, 14.003074], [15, 0.364, 15.000109]], 8: [[16, 99.757, 15.994915], [17, 0.038, 16.999132], [18, 0.205, 17.99916]],
  9: [[19, 100, 18.998403]], 10: [[20, 90.48, 19.99244], [21, 0.27, 20.993847], [22, 9.25, 21.991385]], 11: [[23, 100, 22.98977]], 12: [[24, 78.99, 23.985042], [25, 10.0, 24.985837], [26, 11.01, 25.982593]],
  13: [[27, 100, 26.981538]], 14: [[28, 92.223, 27.976927], [29, 4.685, 28.976495], [30, 3.092, 29.97377]], 15: [[31, 100, 30.973762]], 16: [[32, 94.99, 31.972071], [33, 0.75, 32.971458], [34, 4.25, 33.967867], [36, 0.01, 35.967081]],
  17: [[35, 75.76, 34.968853], [37, 24.24, 36.965903]], 18: [[36, 0.3365, 35.967546], [38, 0.0632, 37.962732], [40, 99.6003, 39.962383]], 19: [[39, 93.2581, 38.963707], [40, 0.0117, 39.963999], [41, 6.7302, 40.961826]],
  20: [[40, 96.941, 39.962591], [42, 0.647, 41.958618], [43, 0.135, 42.958767], [44, 2.086, 43.955481], [46, 0.004, 45.953693], [48, 0.187, 47.952534]],
  29: [[63, 69.15, 62.929601], [65, 30.85, 64.927794]], 35: [[79, 50.69, 78.918338], [81, 49.31, 80.916291]]
};
const ELEMS = Object.keys(ISO).map(Number);
// well-known radioactive isotopes and their half-lives
const RADIO = { "1-3": "12.3 years", "4-7": "53 days", "4-10": "1.4 million years", "6-11": "20 minutes", "6-14": "5730 years", "7-13": "10 minutes", "8-15": "2 minutes", "9-18": "110 minutes", "11-22": "2.6 years", "11-24": "15 hours", "13-26": "720 000 years", "15-32": "14 days", "16-35": "87 days", "17-36": "300 000 years", "18-39": "269 years", "19-40": "1.25 billion years (found naturally)", "20-41": "100 000 years", "20-48": "6 × 10¹⁹ years (found naturally)", "29-64": "12.7 hours", "35-82": "35 hours" };
function status(Z, A) {
  const nat = (ISO[Z] || []).find(q => q[0] === A), key = Z + "-" + A;
  if (RADIO[key]) return { kind: "radioactive", txt: "radioactive: half-life " + RADIO[key] };
  if (nat) return { kind: "stable", txt: "stable, found naturally (" + K.sig(nat[1], 3) + "%)" };
  const As = (ISO[Z] || []).map(q => q[0]); if (!As.length) return { kind: "?", txt: "" };
  return Math.min(...As.map(a => Math.abs(a - A))) <= 3 ? { kind: "radioactive", txt: "radioactive: decays quickly (not found naturally)" } : { kind: "none", txt: "does not exist: far too many or too few neutrons" };
}
const Ar = (Z, exact = true) => (ISO[Z] || []).reduce((s, q) => s + (exact ? q[2] : q[0]) * q[1] / 100, 0);
// electrons in orbitals, filled in order (aufbau); chromium and copper are exceptions
const ORB = [["1s", 2], ["2s", 2], ["2p", 6], ["3s", 2], ["3p", 6], ["4s", 2], ["3d", 10], ["4p", 6]];
function orbitals(Z, e) {
  const o = {}; let left = Z; for (const [n, cap] of ORB) { o[n] = Math.min(cap, left); left -= o[n]; }
  if (Z === 24) { o["4s"] = 1; o["3d"] = 5; } if (Z === 29) { o["4s"] = 1; o["3d"] = 10; }
  let d = e - Z;                                                             // ions: lose electrons from the outermost shell (4s before 3d), gain them into the next free orbital
  while (d < 0) { const out = ["4p", "4s", "3d", "3p", "3s", "2p", "2s", "1s"].find(k => o[k] > 0); if (!out) break; o[out]--; d++; }
  while (d > 0) { const nx = ORB.find(([n, cap]) => o[n] < cap); if (!nx) break; o[nx[0]]++; d--; }
  return o;
}
const shells = o => [o["1s"], o["2s"] + o["2p"], o["3s"] + o["3p"] + o["3d"], o["4s"] + o["4p"]].filter((v, i, a) => v > 0 || a.slice(i).some(x => x > 0));
const SUPD = "⁰¹²³⁴⁵⁶⁷⁸⁹", sup = n => String(n).split("").map(c => SUPD[+c]).join(""), SUBD = "₀₁₂₃₄₅₆₇₈₉", sub = n => String(n).split("").map(c => SUBD[+c]).join("");
const configTxt = o => ["1s", "2s", "2p", "3s", "3p", "3d", "4s", "4p"].filter(n => o[n] > 0).map(n => n + sup(o[n])).join(" ");   // written in shell order, as in the exam
// first ionisation energies, kJ/mol, H to Kr
const IE1 = [0, 1312, 2372, 520, 900, 801, 1086, 1402, 1314, 1681, 2081, 496, 738, 578, 787, 1012, 1000, 1251, 1521, 419, 590, 633, 659, 651, 653, 717, 762, 760, 737, 745, 906, 579, 762, 947, 941, 1140, 1351];
// successive ionisation energies estimated with Slater's rules (the real values are smaller, but the jumps are in the same places)
function slaterIEs(Z) {
  const out = [];
  for (let e = Z; e >= 1; e--) {
    const o = orbitals(Z, e), outer = ["4p", "4s", "3d", "3p", "3s", "2p", "2s", "1s"].find(k => o[k] > 0), n = +outer[0], grp = { "1s": [["1s"]], "2s": [["2s", "2p"]], "2p": [["2s", "2p"]], "3s": [["3s", "3p"]], "3p": [["3s", "3p"]], "3d": [["3d"]], "4s": [["4s", "4p"]], "4p": [["4s", "4p"]] }[outer][0];
    let S = 0; const same = grp.reduce((s, k) => s + o[k], 0) - 1; S += same * (outer === "1s" ? 0.30 : 0.35);
    if (outer === "3d") S += ["1s", "2s", "2p", "3s", "3p"].reduce((s, k) => s + o[k], 0) * 1.0;
    else for (const [k] of ORB) { const nk = +k[0]; if (grp.includes(k)) continue; if (nk === n - 1 || (k === "3d" && n === 4)) S += o[k] * 0.85; else if (nk < n - 1) S += o[k] * 1.0; }
    const ns = [0, 1, 2, 3, 3.7][n], Zeff = Z - S; out.push(1312 * Zeff * Zeff / (ns * ns));
  }
  return out;
}

// ---------------- The page ----------------
const P = { view: "atom", Z: 11, N: 12, e: 11, mix: "natural", pc: 25, exact: true, moving: true };
let rnd = K.rng(Date.now() % 99991 + 13), speed = 1, sample = [], runAvg = [], flying = null, t = 0;
const ui = K.app({
  title: "Atomic Structure and Isotopes", subject: "Chemistry",
  blurb: "Build atoms and ions from protons, neutrons and electrons; make isotopes; weigh atoms to find the relative atomic mass",
  reset: () => set({ Z: P.Z }),
  levels: { std: "Standard (iGCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Chemistry (4CH1) 1(c) Atomic structure: protons, neutrons, electrons and their relative masses and charges; atomic number, mass number, isotopes, relative atomic mass from isotope abundances; electronic configurations (2,8,8,…) and ions. 1(d) The Periodic Table.", adv: "Pearson Edexcel A level Chemistry (9CH0) Topic 1: electron configurations in s, p and d orbitals (with Cr and Cu exceptions, 4s emptied before 3d in ions); successive and first ionisation energies as evidence for shells and sub-shells; mass spectrometry and Ar." } },
  missions: [
    { title: "Build sodium", q: "Build a sodium atom: 11 protons, 12 neutrons, 11 electrons. Write its electronic configuration and its mass number.", hint: "2,8,1: two electrons in the first shell, eight in the second, one in the third. Mass number = 11 + 12 = 23. Its symbol is ²³₁₁Na.", setup() { set({ Z: 11, N: 12, e: 11 }); } },
    { title: "Make an ion", q: "Take one electron away from sodium. What is the charge? Then build a chloride ion (17 protons, 18 electrons).", hint: "Na⁺: 11 protons (+11) and 10 electrons (−10): charge +1, configuration 2,8 (like neon). Cl⁻: 17 protons and 18 electrons: charge −1, configuration 2,8,8 (like argon). Ions have full outer shells.", setup() { set({ Z: 11, N: 12, e: 11 }); } },
    { title: "Isotopes of chlorine", q: "Make chlorine-35 and chlorine-37. What is different? Weigh a sample of natural chlorine. Why is Ar 35.5, not a whole number?", hint: "Both have 17 protons and 17 electrons (same chemistry); chlorine-37 has 2 more neutrons. Natural chlorine is about 75% Cl-35 and 25% Cl-37: Ar = (35 × 75 + 37 × 25) ÷ 100 = 35.5. No single atom has a mass of 35.5.", setup() { set({ Z: 17, N: 18, e: 17 }); } },
    { title: "Carbon-14", q: "Give carbon two extra neutrons (carbon-14). Is it still carbon? Is it stable?", hint: "Still carbon (6 protons), but carbon-14 is radioactive with a half-life of 5730 years; it is used for radiocarbon dating. Too many neutrons for its protons makes a nucleus unstable.", setup() { set({ Z: 6, N: 6, e: 6 }); } },
    { title: "Full shells", q: "Build argon. Why is it so unreactive? Compare potassium (one more proton).", hint: "Argon is 2,8,8: a full outer shell, so it does not need to gain, lose or share electrons. Potassium is 2,8,8,1: one electron in a new shell, easily lost, so it is very reactive.", setup() { set({ Z: 18, N: 22, e: 18 }); } },
    { title: "Copper's Ar", q: "Weigh a big sample of copper. Its isotopes are 63 (69%) and 65 (31%). Check Ar with the formula.", hint: "Ar = (63 × 69.15 + 65 × 30.85) ÷ 100 = 63.6 with mass numbers; with the exact isotope masses it is 63.55, the data-book value. A bigger sample gives an average closer to Ar.", setup() { set({ Z: 29, N: 34, e: 29 }); speed = 20; ctl.speed.set(20); } },
    { lvl: "adv", title: "s, p and d", q: "Build potassium, then copper. Write their configurations in s, p, d notation. What is unusual about copper?", hint: "K: 1s² 2s² 2p⁶ 3s² 3p⁶ 4s¹ (4s fills before 3d). Cu: [Ar] 3d¹⁰ 4s¹, not 3d⁹ 4s²: a full 3d sub-shell is more stable (chromium does the same: 3d⁵ 4s¹).", setup() { set({ Z: 19, N: 20, e: 19, view: "atom" }); } },
    { lvl: "adv", title: "Transition metal ions", q: "Take two electrons from copper to make Cu²⁺. Which orbital loses electrons first?", hint: "4s is emptied first, then 3d: Cu²⁺ is [Ar] 3d⁹. Once the 3d orbitals are filled, 4s is higher in energy.", setup() { set({ Z: 29, N: 34, e: 29, view: "atom" }); } },
    { lvl: "adv", title: "Successive ionisation energies", q: "Look at the successive ionisation energies of aluminium (log scale). Where are the big jumps, and what do they tell you?", hint: "Three electrons come off fairly easily, then a big jump (the 4th comes from the second shell, much closer to the nucleus and less shielded), and another big jump before the last two. So aluminium is 2,8,3, in Group 3.", setup() { set({ Z: 13, N: 14, e: 13, view: "ie" }); } },
    { lvl: "adv", title: "First ionisation energy across a period", q: "Look at first ionisation energies from Na to Ar. Why does it dip at aluminium and at sulfur?", hint: "Generally it rises (more protons, same shielding). Al dips: its outer electron is in 3p, higher in energy than 3s. S dips: its fourth 3p electron is paired, and the repulsion between the pair makes it easier to remove.", setup() { set({ Z: 16, N: 16, e: 16, view: "ie" }); } }
  ],
  batch: [
    { title: "Is chlorine's Ar really 35.5?", question: "500 samples of 100 chlorine atoms each: what average mass does each give?", how: "Each run picks 100 atoms at random from natural chlorine (75.76% ³⁵Cl, 24.24% ³⁷Cl, exact masses) and averages their masses. Theory: Ar = 35.45.", yLabel: "average mass of 100 atoms (u)", reps: 500, bins: 24, theory: Ar(17), theoryLabel: "Ar", run: (x, r) => sampleMean(17, 100, r), note: "The averages scatter around 35.45 with a standard deviation of about 0.09: chance decides how many of each isotope are in a sample of 100." },
    { title: "Bigger samples, better answers?", question: "How close is the average of N chlorine atoms to Ar, for bigger and bigger samples?", how: "N = 10 to 3000 atoms; the size of the error |average − Ar|. Theory: the typical error √(2/π) × σ ÷ √N, where σ = 0.86 u is the spread of single atoms.", xLabel: "number of atoms weighed N", yLabel: "error in the average (u)", xs: [10, 30, 100, 300, 1000, 3000], reps: 20, yMin: 0, theory: n => Math.sqrt(2 / Math.PI) * sdAtoms(17) / Math.sqrt(n), theoryLabel: "∝ 1 ÷ √N", run: (x, r) => Math.abs(sampleMean(17, x, r) - Ar(17)), note: "The error falls as 1 ÷ √N: 100 times more atoms, 10 times more precise. A real mass spectrometer counts millions of ions." },
    { title: "How does the mix set Ar?", question: "How does the relative atomic mass depend on the percentage of chlorine-37?", how: "Samples of 1000 atoms of a chlorine mix with 0% to 100% ³⁷Cl.", xLabel: "chlorine-37 (%)", yLabel: "average mass (u)", xs: [0, 20, 40, 60, 80, 100], reps: 3, fit: true, theory: p => 34.968853 * (1 - p / 100) + 36.965903 * p / 100, theoryLabel: "weighted average", run: (x, r) => { let s = 0; for (let i = 0; i < 1000; i++) s += r() < x / 100 ? 36.965903 : 34.968853; return s / 1000; }, note: "A straight line from 34.97 (all ³⁵Cl) to 36.97 (all ³⁷Cl): Ar is a weighted average. Natural chlorine (24% ³⁷Cl) sits a quarter of the way along." },
    { title: "Why is copper 63.5, not 63.6?", question: "Does it matter whether we use exact isotope masses or mass numbers?", how: "Samples of 10 000 copper atoms: 1 = exact isotope masses, 2 = mass numbers (63 and 65).", xLabel: "1 exact masses, 2 mass numbers", yLabel: "average mass (u)", xs: [1, 2], reps: 5, run: (x, r) => sampleMean(29, 10000, r, x === 1), note: "Exact masses give 63.55 (the data-book value); mass numbers give 63.62. Real isotope masses are not whole numbers (except carbon-12, by definition), because of the mass defect." },
    { title: "Magnesium: three isotopes", question: "Does the weighted average work with three isotopes?", how: "300 samples of 1000 magnesium atoms (²⁴Mg 79%, ²⁵Mg 10%, ²⁶Mg 11%). Theory: Ar = 24.31.", yLabel: "average mass (u)", reps: 300, bins: 24, theory: Ar(12), theoryLabel: "Ar", run: (x, r) => sampleMean(12, 1000, r), note: "Yes: Ar = Σ(mass × abundance) ÷ 100 for any number of isotopes." },
    { title: "How common is carbon-13?", question: "In samples of 1000 carbon atoms, what percentage is carbon-13?", how: "300 samples; natural abundance 1.07%.", yLabel: "carbon-13 in the sample (%)", reps: 300, bins: 16, theory: 1.07, theoryLabel: "natural abundance", run: (x, r) => { let n = 0; for (let i = 0; i < 1000; i++) if (r() < 0.0107) n++; return n / 10; }, note: "Rare isotopes scatter a lot (about ±0.3% around 1.07%): with only about 11 carbon-13 atoms per sample, chance matters. To measure a rare isotope precisely you need a very large sample." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4CH1 1(c)", text: "Proton: relative mass 1, charge +1. Neutron: mass 1, charge 0. Electron: mass 1/1836 (about 0.0005), charge −1. Protons and neutrons are in the nucleus; electrons in shells around it." },
      { lvl: "std", tag: "4CH1 1(c)", text: "Atomic number = number of protons (defines the element). Mass number = protons + neutrons. In an atom, electrons = protons, so it is neutral." },
      { lvl: "std", tag: "4CH1 1(c)", text: "Isotopes: atoms of the same element with different numbers of neutrons. Same chemical properties (same electrons), different masses." },
      { lvl: "std", tag: "4CH1 1(c)", text: "Relative atomic mass Ar = Σ (mass of isotope × % abundance) ÷ 100: the weighted average mass compared with 1/12 of a carbon-12 atom." },
      { lvl: "std", tag: "4CH1 1(c)", text: "Electronic configuration: shells hold 2, 8, 8 (for the first 20 elements). Group number = electrons in the outer shell; period = number of shells." },
      { lvl: "std", tag: "4CH1 1(c)", text: "Ions: atoms that have lost (positive) or gained (negative) electrons, usually to get a full outer shell. Na⁺ is 2,8; Cl⁻ is 2,8,8." },
      { lvl: "adv", tag: "9CH0 1", text: "Sub-shells: s (2), p (6), d (10). Order of filling: 1s 2s 2p 3s 3p 4s 3d 4p. Cr and Cu are exceptions (3d⁵ 4s¹, 3d¹⁰ 4s¹). Transition-metal ions lose 4s electrons first." },
      { lvl: "adv", tag: "9CH0 1", text: "Successive ionisation energies rise, with big jumps when an electron is removed from a shell closer to the nucleus: evidence for shells, and a way to find the group." },
      { lvl: "adv", tag: "9CH0 1", text: "First ionisation energy rises across a period (more protons, similar shielding), falls down a group (more shielding, larger radius); dips at Group 3 (p electron) and Group 6 (paired p electron)." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: () => `An atom has ${P.Z} protons and ${P.N} neutrons. Give its atomic number, mass number and the number of electrons in the atom.`, ans: () => `<ul><li>atomic number ${P.Z}</li><li>mass number ${P.Z + P.N}</li><li>${P.Z} electrons (it is neutral)</li></ul>` },
      { lvl: "std", marks: 2, q: "What are isotopes?", ans: "<ul><li>atoms of the same element (same number of protons)</li><li>with different numbers of neutrons</li></ul>" },
      { lvl: "std", marks: 3, q: "Chlorine is 75% chlorine-35 and 25% chlorine-37. Calculate its relative atomic mass.", ans: "<ul><li>Ar = (35 × 75 + 37 × 25) ÷ 100</li><li>= (2625 + 925) ÷ 100</li><li>= 35.5</li></ul>" },
      { lvl: "std", marks: 2, q: () => `Give the electronic configuration of ${NAME[P.Z]} and of its usual ion.`, ans: () => { const o = shells(orbitals(P.Z, P.Z)); return `<ul><li>atom: ${o.join(",")}</li><li>ion: ${usualIon(P.Z)}</li></ul>`; } },
      { lvl: "adv", marks: 2, q: () => `Write the full electron configuration (s, p, d) of ${NAME[P.Z]}.`, ans: () => `<ul><li>${configTxt(orbitals(P.Z, P.Z))}</li></ul>` },
      { lvl: "adv", marks: 3, q: "The first five ionisation energies of an element are 578, 1817, 2745, 11 577, 14 842 kJ/mol. Which group is it in? Explain.", ans: "<ul><li>Group 3 (it is aluminium)</li><li>big jump between the 3rd and 4th ionisation energies</li><li>the 4th electron is removed from a shell closer to the nucleus</li></ul>" },
      { lvl: "adv", marks: 2, q: "Explain why the first ionisation energy of sulfur is lower than that of phosphorus.", ans: "<ul><li>sulfur's electron is removed from a 3p orbital that holds two (paired) electrons</li><li>repulsion between the paired electrons makes it easier to remove</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li>Atomic number Z = protons; mass number A = protons + neutrons; charge = protons − electrons. Elements hydrogen to calcium, copper and bromine.</li>
<li>Shells and orbitals fill in the order 1s 2s 2p 3s 3p 4s 3d 4p, with the chromium and copper exceptions; ions lose electrons from the outermost orbital (4s before 3d) and gain them in the next free one. At Standard the shells are shown as 2, 8, 8, …; for copper and bromine the third shell holds 18.</li>
<li>Isotope masses and abundances: IUPAC / NIST values. Ar = Σ (mass × abundance) ÷ 100. A sample of N atoms is drawn at random from the isotope mix, so its average scatters around Ar with standard deviation σ ÷ √N.</li>
<li>Stability: natural isotopes are stable (potassium-40 and calcium-48 are natural but radioactive); well-known radioactive isotopes are listed with half-lives; other isotopes within 3 neutrons of a natural one are called radioactive; anything further is marked as not existing.</li>
<li>A level: successive ionisation energies are estimated with Slater's shielding rules (IE ≈ 1312 kJ/mol × Z_eff² ÷ n*²). They are too large but show the jumps between shells in the right places. First ionisation energies are data.</li></ul>
<h3>Simplifications</h3>
<ul><li>Shell (Bohr) picture: real electrons occupy orbitals, not circular orbits. Not to scale: the nucleus is about 100 000 times smaller than the atom.</li>
<li>Natural abundances are fixed (they vary slightly from place to place).</li>
<li>The earlier version's time-of-flight mass spectrometer is not included; the "weighing" spectrum here shows the same idea.</li></ul>
<p>The earlier version of this simulation, with its worksheets, is kept in <a href="original/atomic-structure.html">original/atomic-structure.html</a>.</p>`
});

// ---------------- Helpers for sampling ----------------
function mixOf(Z) { if (P.mix === "own" && Z === P.Z && ISO[Z].length >= 2) { const [a, b] = [...ISO[Z]].sort((x, y) => y[1] - x[1]); return [[a[0], 100 - P.pc, a[2]], [b[0], P.pc, b[2]]]; } return ISO[Z]; }
function pick(Z, r, exact = true) { const m = mixOf(Z); let u = r() * 100; for (const q of m) { u -= q[1]; if (u <= 0) return exact ? q[2] : q[0]; } return exact ? m[m.length - 1][2] : m[m.length - 1][0]; }
function sampleMean(Z, n, r, exact = true) { let s = 0; for (let i = 0; i < n; i++) s += pick(Z, r, exact); return s / n; }
function sdAtoms(Z) { const a = Ar(Z); return Math.sqrt(ISO[Z].reduce((s, q) => s + q[1] / 100 * (q[2] - a) ** 2, 0)); }
function usualIon(Z) { const g = groupOf(Z); if (!g) return "none"; const ch = g <= 3 ? g : g >= 5 && g <= 7 ? g - 8 : 0; if (!ch) return "none (noble gas / no simple ion)"; return `${SYM[Z]}${Math.abs(ch) > 1 ? sup(Math.abs(ch)) : ""}${ch > 0 ? "⁺" : "⁻"}: ${shells(orbitals(Z, Z - ch)).join(",")}`; }
function groupOf(Z) { if (Z === 1) return 1; if (Z === 2) return 8; if (Z === 29) return null; const o = orbitals(Z, Z), sh = shells(o), outer = sh[sh.length - 1]; return Z === 35 ? 7 : outer; }

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("View");
ctl.view = K.seg(g, { value: "atom", options: [["atom", "⚛ Atom and isotopes"], ["ie", "⚡ Ionisation energies (A level)"]], on: v => { P.view = v; } });
g = ui.group("Build the atom");
ctl.Z = K.seg(g, { label: "Element", value: 11, options: ELEMS.map(z => [z, SYM[z]]), on: v => set({ Z: v }) });
const pm = (lab, f) => { const r = K.row(g); const s = document.createElement("span"); s.textContent = lab; s.style.cssText = "min-width:90px;color:var(--muted);font-size:13px;align-self:center"; r.append(s); K.btn(r, "−", () => f(-1)); K.btn(r, "+", () => f(1)); return r; };
pm("Protons", d => { const i = ELEMS.indexOf(P.Z) + d; if (i >= 0 && i < ELEMS.length) { const Z = ELEMS[i], ch = P.Z - P.e; set({ Z, N: Math.round(Ar(Z, false)) - Z, e: Z - ch }); } });
pm("Neutrons", d => { P.N = Math.max(0, Math.min(60, P.N + d)); fresh(); });
pm("Electrons", d => { const e = P.e + d; if (e >= 0 && Math.abs(P.Z - e) <= 3) { flying = { d, t: 0 }; P.e = e; } });
let ri = K.row(g); K.btn(ri, "Neutral atom", () => { P.e = P.Z; }); K.btn(ri, "Its usual ion", () => { const gp = groupOf(P.Z), ch = gp && gp <= 3 ? gp : gp >= 5 && gp <= 7 ? gp - 8 : 0; if (ch) { flying = { d: -Math.sign(ch), t: 0 }; P.e = P.Z - ch; } });
ctl.isos = K.row(g);
g = ui.group("Isotope sample");
ctl.mix = K.seg(g, { value: "natural", options: [["natural", "Natural abundances"], ["own", "Your own mix"]], on: v => { P.mix = v; ctl.pc.el.style.display = v === "own" ? "" : "none"; newSample(); } });
ctl.pc = K.slider(g, { label: "Second isotope", min: 0, max: 100, step: 1, value: 25, unit: "%", on: v => { P.pc = v; newSample(); } });
ctl.exact = K.toggle(g, { label: "Use exact isotope masses (not mass numbers)", value: true, on: v => { P.exact = v; newSample(); } });
let rw = K.row(g); K.btn(rw, "↺ New sample", () => newSample(), "primary");
ctl.speed = K.slider(g, { label: "Weighing speed", min: 1, max: 200, step: 1, value: 8, unit: "atoms per second", on: v => speed = v });
ui.headerSpeed(ctl.speed);   // playback speed lives in the header, beside Pause and Reset
const read = K.readout(ui.group("Readings"), [["sym", "symbol"], ["cfg", "electrons"], ["ch", "charge"], ["st", "nucleus"], ["ar", "Ar (data) · sample average"]]);
function newSample() { sample = []; runAvg = []; }
function fresh() { newSample(); }
function set(o) {
  Object.assign(P, o); const Z = P.Z;
  if (o.N === undefined && o.Z !== undefined) P.N = Math.round(Ar(Z, false)) - Z;
  if (o.e === undefined && o.Z !== undefined) P.e = Z;
  ctl.Z.set(Z); ctl.view.set(P.view); ctl.mix.set(P.mix); ctl.pc.el.style.display = P.mix === "own" ? "" : "none";
  ctl.isos.innerHTML = ""; for (const q of ISO[Z]) K.btn(ctl.isos, `${SYM[Z]}-${q[0]}`, () => { P.N = q[0] - Z; fresh(); });
  newSample();
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h);
  const Z = P.Z, A = Z + P.N, o = orbitals(Z, P.e), sh = shells(o), cx = w * 0.32, cy = h * 0.5, R0 = Math.min(w * 0.3, h * 0.42);
  // nucleus: protons and neutrons packed in a ball
  const nn = Z + P.N, nr = 5 + 1.6 * Math.cbrt(nn) * 4;
  for (let i = 0; i < nn; i++) { const a = i * 2.39996, rr = nr * Math.sqrt((i + 0.5) / nn); const isP = (i * 7919) % nn < Z; c.fillStyle = isP ? "#ff6b6b" : "#9aa3b5"; c.beginPath(); c.arc(cx + rr * Math.cos(a), cy + rr * Math.sin(a), 4.5, 0, 6.3); c.fill(); }
  // shells and electrons
  const nS = Math.max(sh.length, 1);
  sh.forEach((n, k) => { const r = nr + 22 + (R0 - nr - 22) * (k + 1) / nS; c.strokeStyle = "#3a4560"; c.lineWidth = 1.5; c.beginPath(); c.arc(cx, cy, r, 0, 6.3); c.stroke();
    for (let i = 0; i < n; i++) { const a = (P.moving ? t * (0.6 / (k + 1)) : 0) + i / n * 2 * Math.PI; c.fillStyle = "#6fb1ff"; c.beginPath(); c.arc(cx + r * Math.cos(a), cy + r * Math.sin(a), 5, 0, 6.3); c.fill(); } });
  if (flying && flying.t < 1) { const r = R0 * (flying.d < 0 ? 1 + flying.t * 0.4 : 1.4 - flying.t * 0.4), a = 0.6; c.fillStyle = "#ffd166"; c.beginPath(); c.arc(cx + r * Math.cos(a), cy - r * Math.sin(a), 6, 0, 6.3); c.fill(); TX(c, flying.d < 0 ? "electron lost" : "electron gained", cx + r * Math.cos(a) + 10, cy - r * Math.sin(a), "#ffd166", "left", "11px"); }
  // symbol card
  const ch = Z - P.e, x0 = w * 0.66; let y = 60;
  c.font = "700 54px Segoe UI,sans-serif"; c.fillStyle = "#eef2f8"; c.textAlign = "left"; c.fillText(SYM[Z], x0 + 50, y + 50); const symW = c.measureText(SYM[Z]).width;
  TX(c, String(A), x0 + 46, y + 14, "#ffd166", "right", "600 20px"); TX(c, String(Z), x0 + 46, y + 52, "#ff6b6b", "right", "600 20px");
  if (ch) TX(c, (Math.abs(ch) > 1 ? Math.abs(ch) : "") + (ch > 0 ? "+" : "−"), x0 + 54 + symW, y + 14, ch > 0 ? "#ff8a70" : "#6fb1ff", "left", "600 20px");
  y += 90; const L = (s, col = "#aab6cc", f = "13px") => { TX(c, s, x0, y, col, "left", f); y += 22; };
  L(`${NAME[Z]}-${A}${ch ? (ch > 0 ? " ion" : " ion (" + (Z === 17 ? "chloride" : Z === 35 ? "bromide" : Z === 8 ? "oxide" : Z === 9 ? "fluoride" : Z === 16 ? "sulfide" : NAME[Z] + "-ide") + ")") : " atom"}`, "#eef2f8", "600 15px");
  L(`${Z} protons (+${Z}), ${P.N} neutrons, ${P.e} electrons (−${P.e})`, "#aab6cc");
  L(`charge: ${ch > 0 ? "+" + ch : ch < 0 ? "−" + Math.abs(ch) : "0 (neutral)"}`, ch ? "#ffd166" : "#7fe3a0");
  L(`electrons: ${sh.join(",")}`, "#6fb1ff", "600 13px");
  if (ui.level === "adv") L(configTxt(o), "#c9a0ff", "12.5px");
  const s = status(Z, A); L(s.txt, s.kind === "stable" ? "#7fe3a0" : s.kind === "radioactive" ? "#ffd166" : "#ff5d6c", "12.5px");
  TX(c, "red: protons · grey: neutrons · blue: electrons (not to scale: the nucleus is really 100 000 times smaller)", 20, h - 16, "#7d8aa5", "left", "11px");
}

// ---------------- Charts ----------------
function charts() {
  const Z = P.Z, ch = Z - P.e;
  if (P.view === "atom") {
    const masses = mixOf(Z), cnt = {}; for (const m of sample) cnt[m] = (cnt[m] || 0) + 1; const n = sample.length || 1;
    chA.opts.title = `Mass spectrum of the sample (${sample.length} atoms)`; chA.opts.xLabel = "mass (u)"; chA.opts.yLabel = "abundance (%)"; chA.opts.xFmt = null;
    const lo = Math.min(...masses.map(q => q[0])) - 1.5, hi = Math.max(...masses.map(q => q[0])) + 1.5;
    chA.draw([{ pts: masses.map(q => [P.exact ? q[2] : q[0], q[1]]), type: "bars", w: 0.5, color: "#3a4560", label: "data book" }, { pts: Object.keys(cnt).map(m => [+m, cnt[m] / n * 100]), type: "bars", w: 0.3, color: "#ffd166", label: "this sample" }], { xMin: lo, xMax: hi, yMin: 0, yMax: 100 });
    const ar = masses.reduce((s, q) => s + (P.exact ? q[2] : q[0]) * q[1] / 100, 0);
    chB.opts.title = "Running average mass"; chB.opts.xLabel = "atoms weighed"; chB.opts.yLabel = "average (u)"; chB.opts.xFmt = null;
    chB.draw([{ pts: runAvg, color: "#6fb1ff", label: "average so far" }], { xMin: 0, xMax: Math.max(50, sample.length), yMin: lo + 1, yMax: hi - 1, hlines: [{ y: ar, color: "#7fe3a0", label: "Ar = " + ar.toFixed(3) }] });
  } else {
    const ies = slaterIEs(Z), o = orbitals(Z, Z);
    chA.opts.title = `Successive ionisation energies of ${NAME[Z]} (estimated)`; chA.opts.xLabel = "electron removed"; chA.opts.yLabel = "log₁₀ (IE in kJ/mol)"; chA.opts.xFmt = null;
    chA.draw([{ pts: ies.map((v, i) => [i + 1, Math.log10(v)]), type: "bars", w: 0.7, color: "#c9a0ff" }], { xMin: 0.4, xMax: Z + 0.6, yMin: 2 });
    chB.opts.title = "First ionisation energy, H to Kr (data)"; chB.opts.xLabel = "atomic number"; chB.opts.yLabel = "kJ/mol"; chB.opts.xFmt = null;
    chB.draw([{ pts: IE1.slice(1).map((v, i) => [i + 1, v]), color: "#6fb1ff", label: "first IE" }, { pts: [[Z, IE1[Z]]], type: "dots", r: 6, color: "#ffd166", label: SYM[Z] }], { xMin: 0, xMax: 37, yMin: 0 });
  }
  const sh = shells(orbitals(Z, P.e)), ar = Ar(Z, P.exact);
  read.set("sym", `${SYM[Z]}-${Z + P.N} (Z = ${Z}, A = ${Z + P.N})`); read.set("cfg", ui.level === "adv" ? configTxt(orbitals(Z, P.e)) : sh.join(","));
  read.set("ch", ch ? (ch > 0 ? "+" + ch : "−" + -ch) : "0"); read.set("st", status(Z, Z + P.N).kind); read.set("ar", `${ar.toFixed(2)} · ${sample.length ? (sample.reduce((s, m) => s + m, 0) / sample.length).toFixed(3) : "–"}`);
  ui.hud(ch ? `An ion: ${Math.abs(ch)} electron${Math.abs(ch) > 1 ? "s" : ""} ${ch > 0 ? "lost" : "gained"}` : status(Z, Z + P.N).kind === "stable" ? "A stable atom" : "Unusual number of neutrons");
}

// ---------------- The loop ----------------
let frame = 0, acc = 0;
ui.run(dt => {
  if (!(dt > 0)) return; t += dt; if (flying) { flying.t += dt * 1.5; if (flying.t > 1) flying = null; }
  acc += dt * speed; while (acc >= 1) { acc--; sample.push(pick(P.Z, rnd, P.exact)); const n = sample.length; const prev = runAvg.length ? runAvg[runAvg.length - 1][1] : 0; runAvg.push([n, prev + (sample[n - 1] - prev) / n]); if (sample.length > 20000) { newSample(); } }
}, () => { draw(); if (frame++ % 5 === 0) charts(); });
set({ Z: 11 });
ui.tip("Build an atom with the − / + buttons. Change the protons for a new element, the neutrons for an isotope, the electrons for an ion.", 7000);
