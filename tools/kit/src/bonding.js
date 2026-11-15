/* =====================================================================
   BONDING AND STRUCTURE
   Why does salt melt at 801 °C but water at 0 °C? Why does copper bend
   and conduct while salt shatters and only conducts when molten?

   Three kinds of bond hold particles together:
     IONIC     metal atoms GIVE electrons to non-metal atoms; the + and -
               ions attract in every direction: a giant lattice
     COVALENT  non-metal atoms SHARE pairs of electrons. Either small
               molecules (strong bonds inside, weak forces between them)
               or a giant network in which every atom is bonded
     METALLIC  metal atoms let their outer electrons go: positive ions in
               a "sea" of electrons that can move anywhere

   The left of the picture shows how the bond forms. The right shows the
   structure as particles between two electrodes: heat it, switch on the
   battery, or hit it with a hammer. Melting and boiling points are real.
   ===================================================================== */
// shells: electrons in each shell of the atoms; mp and bp in °C (sublimes = goes straight to gas)
const SUBS = {
  NaCl: { type: "ionic", name: "sodium chloride", mp: 801, bp: 1413, m: ["Na", [2, 8, 1]], n: ["Cl", [2, 8, 7]], give: 1, ratio: [1, 1], cation: "Na⁺", anion: "Cl⁻" },
  MgO: { type: "ionic", name: "magnesium oxide", mp: 2852, bp: 3600, m: ["Mg", [2, 8, 2]], n: ["O", [2, 6]], give: 2, ratio: [1, 1], cation: "Mg²⁺", anion: "O²⁻" },
  H2: { type: "molecular", name: "hydrogen", mp: -259, bp: -253, mol: { c: "H", nb: ["H"], ord: [1], lone: 0, nlone: 0 } },
  Cl2: { type: "molecular", name: "chlorine", mp: -101, bp: -34, mol: { c: "Cl", nb: ["Cl"], ord: [1], lone: 3, nlone: 3 } },
  H2O: { type: "molecular", name: "water", mp: 0, bp: 100, mol: { c: "O", nb: ["H", "H"], ord: [1, 1], lone: 2, nlone: 0, angle: 104.5 } },
  NH3: { type: "molecular", name: "ammonia", mp: -78, bp: -33, mol: { c: "N", nb: ["H", "H", "H"], ord: [1, 1, 1], lone: 1, nlone: 0, angle: 107 } },
  CH4: { type: "molecular", name: "methane", mp: -182, bp: -162, mol: { c: "C", nb: ["H", "H", "H", "H"], ord: [1, 1, 1, 1], lone: 0, nlone: 0, angle: 109.5 } },
  CO2: { type: "molecular", name: "carbon dioxide", mp: -78, bp: -78, sublimes: true, mol: { c: "C", nb: ["O", "O"], ord: [2, 2], lone: 0, nlone: 2, angle: 180 } },
  N2: { type: "molecular", name: "nitrogen", mp: -210, bp: -196, mol: { c: "N", nb: ["N"], ord: [3], lone: 1, nlone: 1 } },
  diamond: { type: "giant", name: "diamond (carbon)", mp: 3550, bp: 4827, sublimes: true, net: "diamond" },
  graphite: { type: "giant", name: "graphite (carbon)", mp: 3652, bp: 4827, sublimes: true, net: "graphite", conducts: true },
  SiO2: { type: "giant", name: "silicon dioxide (sand)", mp: 1713, bp: 2950, net: "silica" },
  Na: { type: "metal", name: "sodium", mp: 98, bp: 883, sym: "Na", q: 1 },
  Al: { type: "metal", name: "aluminium", mp: 660, bp: 2519, sym: "Al", q: 3 },
  Cu: { type: "metal", name: "copper", mp: 1085, bp: 2562, sym: "Cu", q: 2 }
};
const ELEM = { H: { col: "#e8eef8", r: 0.55, outer: 1 }, C: { col: "#5b6578", r: 0.8, outer: 4 }, N: { col: "#6fb1ff", r: 0.78, outer: 5 }, O: { col: "#ff6b6b", r: 0.76, outer: 6 }, Cl: { col: "#7fe3a0", r: 0.95, outer: 7 }, Na: { col: "#b18cff", r: 1 }, Mg: { col: "#8fd3a0", r: 1 } };
const STATE = (S, T) => T < S.mp ? "solid" : S.sublimes || T >= S.bp ? "gas" : "liquid";
// does it conduct? Only if charged particles are free to move
function conducts(S, T) { const st = STATE(S, T); if (S.type === "metal") return st !== "gas"; if (S.type === "ionic") return st === "liquid"; if (S.conducts) return true; return false; }

/* ---- a small model for the batch run: particles on a grid, each held by bonds to its neighbours ----
   At temperature T a particle breaks free with a chance that falls steeply with the energy holding it: P = 0.05 exp(-b E / T),
   where b is the number of bound neighbours. Free particles can rejoin. Melting is when half are free. */
function meltModel(E, rnd) {
  const N = 12, grid = new Uint8Array(N * N).fill(1); let T = 0.1 * E;
  for (; T < 6 * E; T += E * 0.01) {
    for (let k = 0; k < N * N * 2; k++) { const i = Math.floor(rnd() * N * N), x = i % N, y = (i / N) | 0; let b = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) b += grid[((y + dy + N) % N) * N + (x + dx + N) % N]; if (grid[i]) { if (rnd() < 0.05 * Math.exp(-b * E / T)) grid[i] = 0; } else if (rnd() < 0.05 * Math.exp(-(4 - b) * E / T) * (b / 4)) grid[i] = 1; }
    let free = 0; for (const v of grid) if (!v) free++; if (free > N * N / 2) return T;
  }
  return T;
}
// real data for the batch run
const IONIC = { 1: [["NaCl", 801], ["KCl", 770], ["NaF", 993], ["LiCl", 610], ["KBr", 734]], 2: [["MgCl₂", 714], ["CaCl₂", 772], ["Na₂O", 1132], ["CaF₂", 1418]], 4: [["MgO", 2852], ["CaO", 2613], ["SrO", 2531], ["BaO", 1923]], 6: [["Al₂O₃", 2072], ["Cr₂O₃", 2435]] };
const ALKANES = [[16, -162], [30, -89], [44, -42], [58, -1], [72, 36], [86, 69], [100, 98], [114, 126]];
const NOBLE = [[2, -269], [10, -246], [18, -186], [36, -153], [54, -108]];

// ---------------- The page ----------------
let sub = "NaCl", T = 20, battery = false, hammer = null, form = 0, parts = [], carriers = [], rnd = K.rng(Date.now() % 99991 + 37), spark = [], crack = 0;
const S = () => SUBS[sub];
const ui = K.app({
  title: "Bonding and Structure", subject: "Chemistry",
  blurb: "How ionic, covalent and metallic bonds form, and why that decides melting, conducting and shattering",
  reset: () => set({}),
  levels: { std: "Standard (iGCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Chemistry (4CH1) 1(f) Ionic bonding, 1(g) Covalent bonding, 1(h) Metallic bonding, with structure and properties.", adv: "Pearson Edexcel A level Chemistry (9CH0) Topic 2 Bonding and structure: ionic, covalent and metallic bonding, electronegativity and polarity, intermolecular forces." } },
  missions: [
    { title: "Giving electrons away", q: "Sodium chloride. Press 'Show how it forms' and watch the left-hand picture. Which atom loses an electron, and which gains one? What are the electron arrangements before and after?", hint: "Sodium (2,8,1) gives its single outer electron to chlorine (2,8,7). Both end up with a full outer shell, like a noble gas: Na⁺ is 2,8 and Cl⁻ is 2,8,8. The ions have opposite charges and attract strongly in all directions, building a giant lattice. For magnesium oxide, two electrons move, giving Mg²⁺ and O²⁻.", setup() { set({ sub: "NaCl" }); form = 0; } },
    { title: "Why salt shatters", q: "Salt at room temperature. Switch the battery on: does it conduct? Now hit it with the hammer. What happens, and why?", hint: "Solid salt does not conduct: its ions are locked in place. The hammer pushes one layer along by one ion, so positive meets positive and negative meets negative: the layers repel and the crystal splits. Ionic compounds are hard but brittle.", setup() { set({ sub: "NaCl", T: 20 }); } },
    { title: "Molten salt conducts", q: "Heat the salt past 801 °C with the battery on. What changes at the melting point? Which way do the ions move?", hint: "When molten, the ions are free to move: positive Na⁺ ions drift to the negative electrode and negative Cl⁻ ions to the positive one, carrying the current. The bulb lights. Dissolving salt in water frees the ions too. This is why electrolysis needs molten or dissolved compounds.", setup() { set({ sub: "NaCl", T: 700, battery: true }); } },
    { title: "Sharing electrons", q: "Water. Look at the dot-and-cross diagram. How many electrons does each bond contain? How many electrons are in oxygen's outer shell, counting the shared ones? Now try ammonia, methane and carbon dioxide.", hint: "Each covalent bond is a shared pair of electrons: one from each atom. Oxygen shares two pairs and keeps two lone pairs, so it has 8 in its outer shell; each hydrogen has 2. Carbon dioxide has two double bonds (two shared pairs each), and nitrogen a triple bond.", setup() { set({ sub: "H2O" }); } },
    { title: "Why water boils at 100 °C", q: "Heat ice slowly through 0 °C and 100 °C. When water boils, are its covalent bonds breaking? Compare methane, which boils at −162 °C.", hint: "No: the molecules stay whole (H₂O in the gas is still H₂O). Boiling only separates molecules, which are held together by weak forces between them, not by the strong covalent bonds inside them. Small molecules have weaker intermolecular forces, so methane boils far below room temperature. Water's forces are unusually strong (hydrogen bonds), which is why it is liquid at room temperature.", setup() { set({ sub: "H2O", T: -30 }); } },
    { title: "Diamond and graphite", q: "Both are pure carbon. Compare diamond and graphite: their structures, whether they conduct, and what the hammer does.", hint: "Both are giant covalent structures with very high melting points: every atom is held by strong covalent bonds. In diamond each carbon bonds to four others in a rigid 3-D network: the hardest natural substance, and no free electrons, so no conduction. In graphite each carbon bonds to three others in flat layers, leaving one electron per atom free to move along the layers: it conducts, and the layers slide (pencil 'lead').", setup() { set({ sub: "diamond" }); } },
    { title: "A sea of electrons", q: "Copper. Switch on the battery: what moves? Then hit it with the hammer. Compare with salt.", hint: "Metals are positive ions in a sea of delocalised electrons. The electrons drift through the lattice and carry the current, even in the solid. Hit it and the layers of ions slide over each other but the electron sea keeps holding them together, so the metal bends instead of shattering: metals are malleable and ductile.", setup() { set({ sub: "Cu", T: 20, battery: true }); } },
    { title: "Melting points compared", q: "Use the table under the picture. Put sodium chloride, water, diamond and copper in order of melting point, and give the reason for each.", hint: "Diamond (3550 °C: millions of strong covalent bonds must break) > copper (1085 °C: strong metallic bonding) > sodium chloride (801 °C: strong ionic bonds in a giant lattice) > water (0 °C: only weak intermolecular forces between molecules). Giant structures melt high; simple molecules melt low.", setup() { set({ sub: "CH4", T: -200 }); } },
    { lvl: "adv", title: "Stronger forces, higher boiling points", q: "Run the batch experiments 'Boiling points of alkanes' and 'Noble gases'. Why do larger molecules and atoms boil at higher temperatures?", hint: "London (instantaneous dipole–induced dipole) forces grow with the number of electrons, because a larger electron cloud is more easily distorted. Longer molecules also have more surface in contact. So boiling points rise steadily with relative molecular mass, from methane (−162 °C) to octane (126 °C).", setup() { set({ sub: "CH4", T: -200 }); } }
  ],
  batch: [
    { title: "Bond strength and melting", question: "In a lattice of particles held by bonds, how does the melting temperature depend on the strength of each bond?", how: "Each run: 144 particles on a grid, each held by bonds to its four neighbours. The temperature is raised steadily; a particle breaks free with a chance that falls steeply with the energy holding it. The result is the temperature at which half are free.", xLabel: "strength of one bond (model units)", yLabel: "melting temperature (model units)", xs: [1, 2, 3, 4, 5, 6], reps: 4, yMin: 0, fit: true, run: (E, r) => meltModel(E, r), note: "A straight line through the origin: double the bond strength and the melting point doubles. This is why giant structures, where melting breaks strong bonds, melt so much higher than simple molecules, where it only overcomes weak forces between molecules." },
    { title: "Ionic charge and melting point", question: "Do ionic compounds with more highly charged ions melt at higher temperatures?", how: "Each run: one compound is picked at random from those whose ion charges multiply to the value shown (e.g. Mg²⁺ and O²⁻ give 4), and its melting point is 'measured' to within 2%.", xLabel: "charge on cation × charge on anion", yLabel: "melting point (°C)", xs: [1, 2, 4, 6], reps: 8, yMin: 0, run(x, r) { const L = IONIC[x], q = L[Math.floor(r() * L.length)]; return q[1] * (1 + 0.02 * r.gauss()); }, note: "Larger charges attract more strongly, so more energy is needed to separate the ions. The spread within each group comes from the different sizes of the ions: small ions get closer and attract more strongly." },
    { title: "Boiling points of alkanes", question: "How does the boiling point of an alkane depend on the size of its molecules?", how: "Each run: one alkane from methane to octane; its boiling point is 'measured' to within 2 °C.", xLabel: "relative molecular mass", yLabel: "boiling point (°C)", xs: ALKANES.map(q => q[0]), reps: 4, fit: true, run: (x, r) => ALKANES.find(q => q[0] === x)[1] + 2 * r.gauss(), note: "Bigger molecules have more electrons and more surface in contact, so the forces between molecules are stronger and more energy is needed to separate them." },
    { title: "Noble gases", question: "How does the boiling point of a noble gas depend on the number of electrons in its atoms?", how: "Each run: helium, neon, argon, krypton or xenon; boiling point measured to within 2 °C.", xLabel: "electrons in one atom", yLabel: "boiling point (°C)", xs: NOBLE.map(q => q[0]), reps: 4, fit: true, run: (x, r) => NOBLE.find(q => q[0] === x)[1] + 2 * r.gauss(), note: "Noble gases are single atoms, so the only forces between them are London forces, which grow with the number of electrons." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4CH1 1(f)", text: "Ionic bonding: metal atoms lose electrons to form positive ions; non-metal atoms gain electrons to form negative ions. The bond is the strong electrostatic attraction between oppositely charged ions." },
      { lvl: "std", tag: "4CH1 1(f)", text: "Ionic compounds form giant lattices: high melting and boiling points; conduct only when molten or dissolved, when the ions are free to move." },
      { lvl: "std", tag: "4CH1 1(g)", text: "Covalent bond: a shared pair of electrons between two non-metal atoms. Simple molecular substances have low melting and boiling points because only weak intermolecular forces must be overcome; they do not conduct." },
      { lvl: "std", tag: "4CH1 1(g)", text: "Giant covalent structures (diamond, graphite, silicon dioxide) have very high melting points because many strong covalent bonds must be broken. Graphite conducts because each carbon has one delocalised electron." },
      { lvl: "std", tag: "4CH1 1(h)", text: "Metallic bonding: positive metal ions in a sea of delocalised electrons. Metals conduct because the electrons can move; they are malleable because layers of ions can slide." },
      { lvl: "adv", tag: "9CH0 Topic 2", text: "Electronegativity: the ability of an atom to attract the bonding electrons in a covalent bond. A difference gives a polar bond (δ+ and δ−); a large difference gives ionic bonding." },
      { lvl: "adv", tag: "9CH0 Topic 2", text: "Intermolecular forces: London forces (all molecules, increasing with the number of electrons), permanent dipole–dipole forces, and hydrogen bonds (H bonded to N, O or F)." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: "Describe how sodium and chlorine atoms form sodium chloride. (Na 2,8,1; Cl 2,8,7)", ans: "<ul><li>Sodium atom loses one electron to form Na⁺ (2,8)</li><li>Chlorine atom gains one electron to form Cl⁻ (2,8,8)</li><li>The oppositely charged ions attract (ionic bond)</li></ul>" },
      { lvl: "std", marks: 3, q: "Explain why sodium chloride has a high melting point.", ans: "<ul><li>It has a giant ionic lattice</li><li>with strong electrostatic attractions between oppositely charged ions</li><li>a lot of energy is needed to overcome these</li></ul>" },
      { lvl: "std", marks: 2, q: "Explain why solid sodium chloride does not conduct electricity but molten sodium chloride does.", ans: "<ul><li>In the solid the ions cannot move</li><li>When molten the ions are free to move and carry charge</li></ul>" },
      { lvl: "std", marks: 2, q: () => { const s = S(); return s.type === "molecular" ? `Draw a dot-and-cross diagram for ${s.name}, showing outer electrons only.` : "Draw a dot-and-cross diagram for a molecule of water, showing outer electrons only."; }, ans: () => { const s = S().type === "molecular" ? S() : SUBS.H2O, m = s.mol; return `<ul><li>${m.c} bonded to ${m.nb.join(", ")}: ${m.ord.map(o => o === 1 ? "one shared pair" : o === 2 ? "two shared pairs (double bond)" : "three shared pairs (triple bond)").join(", ")}</li><li>${m.lone ? m.lone + " lone pair(s) on " + m.c : "no lone pairs on " + m.c}; every atom has a full outer shell (H: 2, others: 8)</li></ul>`; } },
      { lvl: "std", marks: 3, q: "Explain why methane has a very low boiling point although its covalent bonds are strong.", ans: "<ul><li>Methane is a simple molecular substance</li><li>Only the weak forces between molecules (intermolecular forces) are overcome on boiling</li><li>the strong covalent bonds within the molecules are not broken</li></ul>" },
      { lvl: "std", marks: 4, q: "Explain why graphite conducts electricity but diamond does not, and why graphite is soft but diamond is hard.", ans: "<ul><li>In graphite each carbon is bonded to three others, leaving one delocalised electron per atom free to move and carry charge</li><li>In diamond each carbon is bonded to four others, so there are no free electrons</li><li>Graphite's layers are held by weak forces and can slide</li><li>Diamond is a rigid 3-D network of strong covalent bonds</li></ul>" },
      { lvl: "std", marks: 3, q: "Explain why metals are malleable and conduct electricity.", ans: "<ul><li>Metals consist of layers of positive ions in a sea of delocalised electrons</li><li>The layers can slide over each other without breaking the metallic bonding</li><li>The delocalised electrons can move through the structure carrying charge</li></ul>" },
      { lvl: "adv", marks: 3, q: "Explain why the boiling points of the noble gases increase down the group.", ans: "<ul><li>The only forces between atoms are London (dispersion) forces</li><li>Atoms further down have more electrons</li><li>so larger instantaneous and induced dipoles form, giving stronger forces that need more energy to overcome</li></ul>" },
      { lvl: "adv", marks: 3, q: "Explain why water has a much higher boiling point than methane, although their molecules are a similar size.", ans: "<ul><li>Water forms hydrogen bonds between molecules: H bonded to the very electronegative O, with lone pairs on O</li><li>Methane has only London forces (C–H bonds are nearly non-polar)</li><li>Hydrogen bonds are much stronger, so more energy is needed to separate water molecules</li></ul>" }
    ]
  },
  notes: `<h3>What is being shown</h3>
<ul><li><b>Forming the bond</b> (left): electron shells drawn as rings. Ionic: the outer electron(s) of the metal move to the non-metal. Covalent: a dot-and-cross diagram with shared pairs where the shells overlap, bond angles as measured. Metallic and giant covalent: the structure.</li>
<li><b>The structure</b> (right): a slice of the solid between two electrodes. Melting and boiling points are real values. Below the melting point particles vibrate in place, more as the temperature rises; between melting and boiling they move about; above boiling (or for substances that sublime) they fly apart.</li>
<li><b>Conduction</b> needs charged particles that are free to move: ions in a molten or dissolved ionic compound, delocalised electrons in a metal or graphite.</li>
<li><b>The hammer</b> pushes the top layers along: ionic layers shift until like charges meet and repel, so the crystal splits; metal layers slide and stay bonded; diamond does not move.</li>
<li><b>Batch run</b>: one experiment uses a model lattice (particles that break free with a chance that falls with bond strength); the others use real data with measurement scatter added.</li></ul>
<h3>Simplifications</h3>
<ul><li>The structures are flat slices of three-dimensional lattices, with a few dozen particles; real crystals contain about 10²³.</li>
<li>Particles and electrons are not to scale. Electron shells are drawn as circles, which is a model, not a picture.</li>
<li>Molecules in the simple molecular structure are drawn as small clusters and do not rotate or react.</li>
<li>Dissolving, polarisation of ions and dative bonds are not shown (the earlier version has dative bonds and electronegativity in detail).</li></ul>
<h3>The earlier version</h3>
<p>The previous version of this simulation, with its worksheets, is still here: <a href="original/bonding.html" style="color:var(--accent)">open the earlier version</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("Substance");
const opt = t => Object.entries(SUBS).filter(([, s]) => s.type === t).map(([k]) => [k, k.replace(/(\d)/g, d => "₀₁₂₃₄₅₆₇₈₉"[d]).replace("diamond", "diamond").replace("graphite", "graphite")]);
ctl.ionic = K.seg(g, { label: "Ionic", value: "NaCl", options: opt("ionic"), on: v => pick(v, "ionic") });
ctl.molecular = K.seg(g, { label: "Simple molecules", value: "", options: opt("molecular").slice(0, 4), on: v => pick(v, "molecular") });
ctl.molecular2 = K.seg(g, { value: "", options: opt("molecular").slice(4), on: v => pick(v, "molecular2") });
ctl.giant = K.seg(g, { label: "Giant covalent", value: "", options: opt("giant"), on: v => pick(v, "giant") });
ctl.metal = K.seg(g, { label: "Metals", value: "", options: opt("metal"), on: v => pick(v, "metal") });
function pick(v, from) { for (const k of ["ionic", "molecular", "molecular2", "giant", "metal"]) if (k !== from) ctl[k].set(""); sub = v; form = 0; build(); }
g = ui.group("Test it");
ctl.T = K.slider(g, { label: "Temperature", min: -273, max: 5000, step: 1, value: 20, fmt: v => v + " °C", on: v => { T = v; } });
let r1 = K.row(g); K.btn(r1, "Room temperature", () => { T = 20; ctl.T.set(20); }); K.btn(r1, "Just above melting", () => { T = Math.min(5000, S().mp + 20); ctl.T.set(T); });
ctl.battery = K.toggle(g, { label: "Battery and bulb connected", value: false, on: v => battery = v });
r1 = K.row(g); K.btn(r1, "🔨 Hit it with a hammer", () => { hammer = 0; crack = 0; }, "primary"); K.btn(r1, "Show how it forms", () => { form = 0; });
const read = K.readout(ui.group("Properties"), [["type", "structure"], ["mp", "melting point"], ["bp", "boiling point"], ["st", "state now"], ["cond", "conducts now?"], ["held", "held together by"]]);
function set(o) { sub = o.sub || "NaCl"; T = o.T == null ? 20 : o.T; battery = !!o.battery; const t = S().type; for (const k of ["ionic", "molecular", "molecular2", "giant", "metal"]) ctl[k].set(""); const key = t === "molecular" ? (opt("molecular").slice(0, 4).some(q => q[0] === sub) ? "molecular" : "molecular2") : t; ctl[key].set(sub); ctl.T.set(T); ctl.battery.set(battery); form = 0; hammer = null; build(); }

// ---------------- The structure: particles on a lattice ----------------
const NX = 10, NY = 7;
function build() {
  const s = S(); parts = []; carriers = []; hammer = null; crack = 0;
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    let kind; if (s.type === "ionic") kind = (i + j) % 2 ? "-" : "+"; else if (s.type === "metal") kind = "m"; else if (s.type === "giant") kind = s.net === "silica" ? ((i + j) % 2 ? "O" : "Si") : "C"; else kind = "mol";
    if (s.net === "graphite" && j % 2 === 1) { /* graphite: layers are drawn as rows of hexagons with a gap */ }
    parts.push({ hx: i, hy: j, x: i, y: j, vx: 0, vy: 0, kind, row: j, a: rnd() * 6.3, w: (rnd() - .5) * 2 });
  }
  if (s.type === "metal" || s.conducts) for (let k = 0; k < (s.type === "metal" ? s.q * 22 : 26); k++) carriers.push({ x: rnd() * (NX - 1), y: s.conducts ? Math.floor(rnd() * NY) + 0.5 : rnd() * (NY - 1), vx: 0, vy: 0 });
}
function stepParts(dt) {
  const s = S(), st = STATE(s, T), heat = K.clamp((T + 273) / (s.mp + 273), 0, 3), flow = battery && conducts(s, T);
  for (const p of parts) {
    if (st === "solid" && !p.free) {
      const amp = 0.06 + 0.12 * heat; p.a += dt * (8 + 6 * heat); const shift = hammer != null ? hammerShift(p) : { x: 0, y: 0 };
      p.x = p.hx + shift.x + Math.sin(p.a) * amp; p.y = p.hy + shift.y + Math.cos(p.a * 1.3) * amp;
    } else {
      const sp = st === "gas" ? 5 : 1.2 + heat; p.vx += (rnd() - .5) * sp * 4 * dt; p.vy += (rnd() - .5) * sp * 4 * dt + (st === "liquid" ? 0.8 * dt : 0); p.vx *= 0.98; p.vy *= 0.98;
      if (flow && s.type === "ionic") p.vx += (p.kind === "+" ? -1 : 1) * 0.6 * dt;           // positive ions to the negative electrode (left), negative ions to the positive electrode (right)
      p.x += p.vx * dt; p.y += p.vy * dt; const top = st === "gas" ? -0.4 : NY * 0.25;
      if (p.x < -0.3) { p.x = -0.3; p.vx = Math.abs(p.vx); } if (p.x > NX - 0.7) { p.x = NX - 0.7; p.vx = -Math.abs(p.vx); } if (p.y > NY - 0.6) { p.y = NY - 0.6; p.vy = -Math.abs(p.vy); } if (p.y < top) { p.y = top; p.vy = Math.abs(p.vy); }
      p.a += dt * p.w * 3;
    }
  }
  for (const e of carriers) { e.vx += (rnd() - .5) * 6 * dt; e.vy += (rnd() - .5) * (s.conducts ? 0 : 6) * dt; if (flow) e.vx += 1.6 * dt; e.vx *= 0.96; e.vy *= 0.96; e.x += e.vx * dt; e.y += e.vy * dt; if (e.x > NX - 0.6) e.x -= NX - 0.3; if (e.x < -0.4) e.x += NX - 0.3; if (e.y < -0.2 || e.y > NY - 0.8) e.vy = -e.vy; }
  if (hammer != null) { hammer += dt; if (hammer > 3.5) hammer = null; }
  // as soon as it melts, the lattice is free
  if (st !== "solid") for (const p of parts) if (!p.free) { p.free = true; p.vx = (rnd() - .5); p.vy = (rnd() - .5); } else if (st === "solid") {}
  if (st === "solid" && parts.some(p => p.free)) { for (const p of parts) { p.free = false; } }
}
/* the hammer pushes the top rows along. Ionic: after half a spacing, like charges line up and the top part flies off.
   Metal and graphite: the layers slide a whole spacing and stay. Diamond and silica: nothing moves. Molecular: crumbles. */
function hammerShift(p) {
  const s = S(), f = K.clamp(hammer / 0.8, 0, 1), top = p.row < NY / 2;
  if (!top) return { x: 0, y: 0 };
  if (s.type === "ionic") { const after = Math.max(0, hammer - 0.8); return { x: f, y: -after * after * 2.5 }; }
  if (s.type === "metal" || s.net === "graphite") return { x: f, y: 0 };
  if (s.type === "molecular") return { x: f * 0.6 + Math.sin(p.hx * 7) * f * 0.3, y: -f * 0.3 * Math.cos(p.hx * 5) };
  return { x: 0, y: 0 };
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
function shells(c, x, y, R, sym, sh, col, mark, gained, fade) {
  c.fillStyle = col; c.beginPath(); c.arc(x, y, R * 0.28, 0, 6.3); c.fill(); c.fillStyle = "#10141c"; c.font = "600 " + Math.round(R * 0.22) + "px Segoe UI,sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(sym, x, y + 1); c.textBaseline = "alphabetic";
  sh.forEach((n, k) => { const rr = R * (0.45 + 0.27 * k); c.strokeStyle = "rgba(200,215,240,.4)"; c.lineWidth = 1.2; c.beginPath(); c.arc(x, y, rr, 0, 6.3); c.stroke(); for (let e = 0; e < n; e++) { const a = -Math.PI / 2 + e * 2 * Math.PI / Math.max(n, 1) + (k === sh.length - 1 && fade ? 0.4 : 0); dotOrCross(c, x + Math.cos(a) * rr, y + Math.sin(a) * rr, gained && k === sh.length - 1 && e >= n - gained ? (mark === "x" ? "o" : "x") : mark, 4); } });
}
function dotOrCross(c, x, y, mark, s) { if (mark === "x") { c.strokeStyle = "#ffd166"; c.lineWidth = 2; c.beginPath(); c.moveTo(x - s, y - s); c.lineTo(x + s, y + s); c.moveTo(x + s, y - s); c.lineTo(x - s, y + s); c.stroke(); } else { c.fillStyle = "#8ac6ff"; c.beginPath(); c.arc(x, y, s, 0, 6.3); c.fill(); } }
function drawForm(c, x0, y0, W, H) {
  const s = S(), cx = x0 + W / 2, cy = y0 + H / 2; form = Math.min(1, form);
  c.fillStyle = "#eef2f8"; c.font = "600 13px Segoe UI,sans-serif"; c.textAlign = "center";
  if (s.type === "ionic") {
    const R = Math.min(W / 4.2, H / 2.6), f = K.clamp((form - 0.2) / 0.5, 0, 1), done = form > 0.75, mx = cx - W * 0.24, nx = cx + W * 0.24, give = s.give;
    const msh = s.m[1].slice(), nsh = s.n[1].slice(); if (done) { msh.pop(); nsh[nsh.length - 1] += give; }
    shells(c, mx, cy, R * (done ? 0.82 : 1), s.m[0], msh, ELEM[s.m[0]].col, "x"); shells(c, nx, cy, R, s.n[0], nsh, ELEM[s.n[0]].col, "o", done ? give : 0);
    if (!done) for (let e = 0; e < give; e++) { const rr = R * (0.45 + 0.27 * (s.m[1].length - 1)), a0 = -Math.PI / 2 + e * 2 * Math.PI / give, sx = mx + Math.cos(a0) * rr, sy = cy + Math.sin(a0) * rr, ex = nx - R * (0.45 + 0.27 * (nsh.length - 1)), ey = cy + (e - (give - 1) / 2) * 16; const ease = f * f * (3 - 2 * f); dotOrCross(c, sx + (ex - sx) * ease, sy + (ey - sy) * ease - Math.sin(ease * Math.PI) * 40, "x", 5); }
    if (done) { for (const [x, R2, ch] of [[mx, R * 0.82, s.cation], [nx, R, s.anion]]) { const rr = R2 * (0.45 + 0.27 * 2) + 10; c.strokeStyle = "#cfd8ea"; c.lineWidth = 2; c.beginPath(); c.moveTo(x - rr + 8, cy - rr); c.lineTo(x - rr, cy - rr); c.lineTo(x - rr, cy + rr); c.lineTo(x - rr + 8, cy + rr); c.moveTo(x + rr - 8, cy - rr); c.lineTo(x + rr, cy - rr); c.lineTo(x + rr, cy + rr); c.lineTo(x + rr - 8, cy + rr); c.stroke(); c.fillStyle = "#ffd166"; c.font = "600 16px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillText(ch.replace(/^[A-Z][a-z]?/, ""), x + rr + 3, cy - rr + 4); c.textAlign = "center"; } }
    c.fillStyle = "#eef2f8"; c.font = "600 13px Segoe UI,sans-serif"; c.fillText(done ? `${s.cation} (${msh.join(",")})   +   ${s.anion} (${nsh.join(",")})` : `${s.m[0]} (${s.m[1].join(",")})   +   ${s.n[0]} (${s.n[1].join(",")})`, cx, y0 + H - 8);
    c.fillStyle = "#aab6cc"; c.font = "12px Segoe UI,sans-serif"; c.fillText(done ? "both now have a full outer shell; opposite charges attract" : give + " electron" + (give > 1 ? "s move" : " moves") + " from the metal to the non-metal", cx, y0 + 16);
  } else if (s.type === "molecular") {
    const m = s.mol, Rc = Math.min(W, H) * 0.2, el = ELEM[m.c], n = m.nb.length, ang = (m.angle || 180) * Math.PI / 180;
    const dirs = n === 1 ? [0] : n === 2 ? [-ang / 2 + Math.PI / 2 - Math.PI / 2, ang / 2 - ang] : n === 3 ? [Math.PI / 2 - 0.9, Math.PI / 2 + 0.9, -Math.PI / 2] : [Math.PI / 4, 3 * Math.PI / 4, -3 * Math.PI / 4, -Math.PI / 4];
    if (n === 2) { dirs[0] = Math.PI / 2 - ang / 2; dirs[1] = Math.PI / 2 + ang / 2; if (m.angle === 180) { dirs[0] = 0; dirs[1] = Math.PI; } }
    const ccx = n === 1 ? cx - Rc * 0.7 : cx, ccy = n === 2 && m.angle !== 180 ? cy - Rc * 0.3 : cy;
    const draw1 = (x, y, R, sym, col) => { c.strokeStyle = col; c.globalAlpha = .9; c.lineWidth = 2; c.beginPath(); c.arc(x, y, R, 0, 6.3); c.stroke(); c.globalAlpha = 1; c.fillStyle = col; c.font = "600 " + Math.round(R * 0.45) + "px Segoe UI,sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(sym, x, y); c.textBaseline = "alphabetic"; };
    const used = [];
    m.nb.forEach((sym, k) => { const e2 = ELEM[sym], Rn = Rc * (sym === "H" ? 0.72 : 0.95), d = (Rc + Rn) * 0.64, a = dirs[k], x = ccx + Math.cos(a) * d, y = ccy + Math.sin(a) * d; draw1(x, y, Rn, sym, e2.col);
      const mx2 = ccx + Math.cos(a) * (Rc - (Rc + Rn - d) / 2), my2 = ccy + Math.sin(a) * (Rc - (Rc + Rn - d) / 2); used.push(a);
      for (let p = 0; p < m.ord[k]; p++) { const off = (p - (m.ord[k] - 1) / 2) * 13, px = mx2 - Math.sin(a) * off, py = my2 + Math.cos(a) * off; dotOrCross(c, px - Math.cos(a) * 5, py - Math.sin(a) * 5, "o", 3.5); dotOrCross(c, px + Math.cos(a) * 5, py + Math.sin(a) * 5, "x", 3.5); }
      for (let L = 0; L < (k === 0 || n > 1 ? m.nlone : 0); L++) { const la = a + (L - (m.nlone - 1) / 2) * (m.nlone === 3 ? 1.2 : 1.4); const lx = x + Math.cos(la) * Rn * 0.86, ly = y + Math.sin(la) * Rn * 0.86; dotOrCross(c, lx - Math.sin(la) * 5, ly + Math.cos(la) * 5, "x", 3.5); dotOrCross(c, lx + Math.sin(la) * 5, ly - Math.cos(la) * 5, "x", 3.5); }
    });
    draw1(ccx, ccy, Rc, m.c, el.col);
    // lone pairs on the central atom, in the directions away from the bonds
    const free = []; for (let k = 0; k < 24; k++) free.push(k * Math.PI / 12); const score = a => Math.min(...used.map(u => Math.abs(Math.atan2(Math.sin(a - u), Math.cos(a - u))))); free.sort((p, q) => score(q) - score(p));
    const picks = []; for (const a of free) { if (picks.length >= m.lone) break; if (picks.every(q => Math.abs(Math.atan2(Math.sin(a - q), Math.cos(a - q))) > 1)) picks.push(a); }
    for (const la of picks) { const lx = ccx + Math.cos(la) * Rc * 0.86, ly = ccy + Math.sin(la) * Rc * 0.86; dotOrCross(c, lx - Math.sin(la) * 5, ly + Math.cos(la) * 5, "o", 3.5); dotOrCross(c, lx + Math.sin(la) * 5, ly - Math.cos(la) * 5, "o", 3.5); }
    c.fillStyle = "#aab6cc"; c.font = "12px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillText("● electrons from " + m.c + "   ✕ electrons from " + [...new Set(m.nb)].join(", ") + (m.angle && n > 1 ? "   ·   bond angle " + m.angle + "°" : ""), cx, y0 + H - 8);
    c.fillText("each line of shared electrons is one covalent bond: a shared pair", cx, y0 + 16);
  } else drawLattice(c, x0 + 20, y0 + 40, W - 40, H - 70, true);
}
function drawLattice(c, x0, y0, W, H, closeup) {
  const s = S(), sx = W / NX, sy = H / NY, X = x => x0 + (x + 0.5) * sx, Y = y => y0 + (y + 0.5) * sy, r = Math.min(sx, sy) * (s.type === "ionic" ? 0.32 : s.type === "metal" ? 0.36 : 0.22), st = STATE(s, T);
  // bonds for giant covalent structures
  if (s.type === "giant" && st === "solid") { c.strokeStyle = "rgba(200,215,240,.55)"; c.lineWidth = 2; c.beginPath();
    for (const p of parts) { const sh = hammer != null ? hammerShift(p) : { x: 0, y: 0 }; for (const q of parts) { const dx = q.hx - p.hx, dy = q.hy - p.hy; const link = s.net === "graphite" ? (dy === 0 && dx === 1) || (dx === 0 && dy === 1 && (p.hx + p.hy) % 2 === 0 && p.hy % 2 === 0) : (dx === 1 && dy === 0) || (dy === 1 && dx === 0) || (s.net === "diamond" && dx === 1 && dy === 1 && (p.hx + p.hy) % 2 === 0); if (link) { c.moveTo(X(p.x), Y(p.y)); c.lineTo(X(q.x), Y(q.y)); } } } c.stroke(); }
  if (s.type === "metal") { c.fillStyle = "rgba(111,177,255,.08)"; c.fillRect(x0, y0, W, H); }
  for (const p of parts) {
    const x = X(p.x), y = Y(p.y);
    if (p.kind === "mol") { const m = s.mol, n = m.nb.length + 1, rr = r * 0.9; for (let k = 0; k < n; k++) { const a = p.a + k * 2 * Math.PI / n, d = k ? rr * 1.2 : 0, sym = k ? m.nb[k - 1] : m.c; c.fillStyle = ELEM[sym].col; c.beginPath(); c.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, rr * (sym === "H" ? 0.55 : 0.8), 0, 6.3); c.fill(); } continue; }
    const col = p.kind === "+" ? ELEM[s.m[0]].col : p.kind === "-" ? ELEM[s.n[0]].col : p.kind === "m" ? "#d6a46c" : p.kind === "O" ? "#ff6b6b" : p.kind === "Si" ? "#c9b48a" : "#6f7a90";
    const gr = c.createRadialGradient(x - r * .3, y - r * .3, 1, x, y, r); gr.addColorStop(0, "#fff"); gr.addColorStop(0.3, col); gr.addColorStop(1, col); c.fillStyle = gr; c.beginPath(); c.arc(x, y, p.kind === "-" ? r * 1.25 : r, 0, 6.3); c.fill();
    if (p.kind === "+" || p.kind === "-" || p.kind === "m") { c.fillStyle = "#10141c"; c.font = "600 " + Math.round(r * 0.9) + "px Segoe UI,sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(p.kind === "m" ? "+" : p.kind === "+" ? "+" : "−", x, y + 1); c.textBaseline = "alphabetic"; }
  }
  c.fillStyle = "#8ac6ff"; for (const e of carriers) { c.beginPath(); c.arc(X(e.x), Y(e.y), 3, 0, 6.3); c.fill(); }
  if (hammer != null && s.type === "ionic" && hammer > 0.7 && hammer < 1.6) { c.fillStyle = "rgba(255,90,80,.35)"; c.fillRect(x0, Y(NY / 2 - 0.5) - 8, W, 16); c.fillStyle = "#ffb39f"; c.font = "600 13px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillText("like charges meet: they repel", x0 + W / 2, Y(NY / 2 - 0.5) - 14); }
  if (hammer != null && (s.net === "diamond" || s.net === "silica") && hammer < 1.5) { c.fillStyle = "#ffd166"; c.font = "600 13px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillText("nothing moves: every atom is held by strong covalent bonds", x0 + W / 2, y0 - 6); }
}
function draw(dt) {
  const c = cv.ctx, w = cv.w, h = cv.h, s = S(), st = STATE(s, T); c.fillStyle = "#080c15"; c.fillRect(0, 0, w, h);
  const fw = w * 0.42; c.fillStyle = "#0e1524"; c.beginPath(); c.roundRect(10, 10, fw - 20, h - 20, 10); c.fill(); c.fillStyle = "#cfd8ea"; c.font = "600 13px Segoe UI,sans-serif"; c.textAlign = "left";
  c.fillText({ ionic: "Ionic bonding", molecular: "Covalent bonding: a simple molecule", giant: "Giant covalent structure", metal: "Metallic bonding" }[s.type], 22, 32);
  if (s.type === "ionic" && form < 1) form += dt * 0.3;
  drawForm(c, 10, 36, fw - 20, h - 56);
  // the structure between two electrodes
  const x0 = fw + 30, y0 = 60, W = w - fw - 60, H = h - 170;
  c.fillStyle = "#121a2b"; c.fillRect(x0 - 16, y0 - 10, W + 32, H + 20); drawLattice(c, x0, y0, W, H);
  c.fillStyle = "#59647a"; c.fillRect(x0 - 26, y0 - 20, 10, H + 40); c.fillRect(x0 + W + 16, y0 - 20, 10, H + 40);
  c.fillStyle = "#6fb1ff"; c.font = "600 14px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillText("−", x0 - 21, y0 - 26); c.fillStyle = "#ff8a8a"; c.fillText("+", x0 + W + 21, y0 - 26);
  // the circuit and bulb
  const by = h - 50, on = battery && conducts(s, T); c.strokeStyle = battery ? "#8d98ad" : "#3a4256"; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x0 - 21, y0 + H + 20); c.lineTo(x0 - 21, by); c.lineTo(x0 + W + 21, by); c.lineTo(x0 + W + 21, y0 + H + 20); c.stroke();
  const bx = x0 + W / 2; c.fillStyle = on ? "#fff3b0" : "#2a3140"; if (on) { c.shadowColor = "#ffe066"; c.shadowBlur = 30; } c.beginPath(); c.arc(bx, by, 14, 0, 6.3); c.fill(); c.shadowBlur = 0; c.fillStyle = "#cfd8ea"; c.font = "12px Segoe UI,sans-serif"; c.fillText(battery ? (on ? "the bulb lights: it conducts" : "no current: nothing free to carry charge") : "battery disconnected", bx, by + 32);
  const sc2 = { solid: "solid", liquid: "liquid", gas: s.sublimes && T >= s.mp ? "gas (it sublimes)" : "gas" }[st];
  c.fillStyle = "#eef2f8"; c.font = "600 14px Segoe UI,sans-serif"; c.fillText(s.name + " at " + T + " °C: " + sc2, bx, 34);
}
const chT = K.chart(ui.dock, { title: "Melting and boiling points", xLabel: "", yLabel: "°C" });
const chC = K.chart(ui.dock, { title: "Heating curve", xLabel: "energy put in (arbitrary units)", yLabel: "temperature (°C)" });

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => stepParts(Math.min(dt, 0.05)), dt => {
  draw(Math.min(dt, 0.1)); if (frame++ % 10) return; const s = S();
  const list = ["H2", "CH4", "Cl2", "NH3", "H2O", "Na", "NaCl", "Al", "Cu", "SiO2", "MgO", "diamond"], cols = { ionic: "#ffd166", molecular: "#6fb1ff", giant: "#c58cff", metal: "#d6a46c" };
  chT.draw(list.map((k, i) => ({ pts: [[i + 1, SUBS[k].mp]], type: "bars", w: 0.7, color: k === sub ? "#ffffff" : cols[SUBS[k].type], alpha: .85 })).concat([{ pts: [[0, T], [13, T]], color: "#ff8a70", dash: [4, 4], label: "temperature now" }]), { xMin: 0.3, xMax: 12.7, xFmt: v => Math.abs(v - Math.round(v)) < 0.01 ? (list[Math.round(v) - 1] || "").replace(/(\d)/g, d => "₀₁₂₃₄₅₆₇₈₉"[d]).replace("diamond", "C") : "", yLabel: "melting point (°C)" });
  const lat = s.type === "molecular" ? 1 : 3, Lm = 1.5 * lat, Lb = 5 * lat, pts = []; let q = 2; const t0 = Math.min(-200, s.mp - 150);   /* melting and boiling take far more energy for giant structures than for simple molecules */
  pts.push([0, t0]); pts.push([q, s.mp]); if (!s.sublimes) { pts.push([q + Lm, s.mp]); q += Lm + 2; pts.push([q, s.bp]); pts.push([q + Lb, s.bp]); q += Lb; } else { pts.push([q + Lb + Lm, s.mp]); q += Lb + Lm; } pts.push([q + 1, (s.sublimes ? s.mp : s.bp) + 150]);
  chC.draw([{ pts, color: K.cssVar("--s0"), width: 2.2, label: s.name }], { hlines: [{ y: T, label: "now", color: "#ff8a70" }], yMin: t0 });
  read.set("type", { ionic: "giant ionic lattice", molecular: "simple molecules", giant: "giant covalent", metal: "giant metallic lattice" }[s.type]); read.set("mp", s.mp + " °C"); read.set("bp", s.sublimes ? "sublimes at " + s.mp + " °C" : s.bp + " °C"); read.set("st", STATE(s, T)); read.set("cond", conducts(s, T) ? "yes" : "no");
  read.set("held", { ionic: "attraction between + and − ions", molecular: "weak forces between molecules (strong covalent bonds within)", giant: "strong covalent bonds throughout", metal: "attraction between + ions and the sea of electrons" }[s.type]);
  ui.hud("");
});
set({});
ui.tip("Left: how the bond forms · right: the structure. Heat it, connect the battery, or hit it", 8000);
