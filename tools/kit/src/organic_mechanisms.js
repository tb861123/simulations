/* =====================================================================
   ORGANIC MECHANISMS AND SYNTHESIS
   Organic chemistry is a map: each compound is a place, each reaction a
   road with its own reagents and conditions. A synthesis is a route.
   Every step loses some product, so the overall yield is the PRODUCT of
   the step yields: three steps at 80% give only 51%.
   A MECHANISM shows how the electrons move. A curly arrow starts at a
   pair of electrons (a lone pair or a bond) and ends where the pair goes.
     NUCLEOPHILES (OH⁻, CN⁻, NH₃) bring a lone pair to a δ+ carbon.
     ELECTROPHILES (H⁺ of HBr, Br₂, NO₂⁺) accept a pair from a C=C or ring.
   Some choices are a competition: hot ethanolic hydroxide favours
   ELIMINATION (alkene), warm aqueous hydroxide favours SUBSTITUTION
   (alcohol). The lab experiments below are simple rate models with the
   errors of real measurements added.
   ===================================================================== */
const R = 8.314;
/* ---- The compounds: [key, name, formula, column, row, groups, level] ---- */
const C_ = [
  ["ethane", "ethane", "C₂H₆", 0, 0, [], "std"], ["bromoethane", "bromoethane", "C₂H₅Br", 1, 0, ["halo"], "std"], ["nitrile", "propanenitrile", "C₂H₅CN", 2, 0, ["nitrile"], "adv"], ["propacid", "propanoic acid", "C₂H₅COOH", 3, 0, ["acid"], "adv"], ["ethylamine", "ethylamine", "C₂H₅NH₂", 4, 0, ["amine"], "adv"],
  ["benzene", "benzene", "C₆H₆", 6, 0, ["arene"], "adv"], ["nitrobenzene", "nitrobenzene", "C₆H₅NO₂", 7, 0, ["arene", "nitro"], "adv"],
  ["ethene", "ethene", "CH₂=CH₂", 0, 1, ["alkene"], "std"], ["ethanol", "ethanol", "C₂H₅OH", 1, 1, ["prim", "iodo"], "std"], ["ethanal", "ethanal", "CH₃CHO", 2, 1, ["ald", "iodo"], "adv"], ["hydroxynitrile", "2-hydroxypropanenitrile", "CH₃CH(OH)CN", 3, 1, ["sec", "nitrile", "iodo"], "adv"],
  ["phenylethanone", "phenylethanone", "C₆H₅COCH₃", 6, 1, ["arene", "ket", "iodo"], "adv"], ["phenylamine", "phenylamine", "C₆H₅NH₂", 7, 1, ["arene", "amine", "anil"], "adv"],
  ["dibromo", "1,2-dibromoethane", "CH₂BrCH₂Br", 0, 2, ["halo"], "std"], ["poly", "poly(ethene)", "–(CH₂CH₂)ₙ–", 1, 2, ["polymer"], "std"], ["ester", "ethyl ethanoate", "CH₃COOC₂H₅", 2, 2, ["ester"], "std"], ["acid", "ethanoic acid", "CH₃COOH", 3, 2, ["acid"], "std"],
  ["acylcl", "ethanoyl chloride", "CH₃COCl", 4, 2, ["acylcl"], "adv"], ["amide", "N-ethylethanamide", "CH₃CONHC₂H₅", 5, 2, ["amide"], "adv"], ["glucose", "glucose", "C₆H₁₂O₆", 0, 3, [], "std"]
];
const CI = k => C_.findIndex(c => c[0] === k);
/* ---- The reactions: [from, to, reagents and conditions, type, mechanism, typical yield, level, bend of the drawn road] ---- */
const E_ = [
  ["ethane", "bromoethane", "Br₂, UV light", "free-radical substitution", "frs", 0.4, "std"],
  ["ethene", "ethane", "H₂, nickel catalyst, 150 °C", "addition (hydrogenation)", null, 0.95, "std"],
  ["ethene", "bromoethane", "HBr (room temperature)", "electrophilic addition", "eadd", 0.9, "adv"],
  ["ethene", "ethanol", "steam, H₃PO₄ catalyst, 300 °C, 60 atm", "addition (hydration)", null, 0.95, "std", 0.18],
  ["ethene", "dibromo", "bromine water (Br₂)", "electrophilic addition", "eadd", 0.95, "std"],
  ["ethene", "poly", "high pressure, catalyst", "addition polymerisation", null, 0.9, "std"],
  ["glucose", "ethanol", "yeast, 30 °C, no air", "fermentation", null, 0.45, "std"],
  ["ethanol", "ethene", "conc. H₃PO₄, hot (or Al₂O₃)", "elimination (dehydration)", null, 0.8, "adv", 0.18],
  ["bromoethane", "ethanol", "NaOH(aq), warm (reflux)", "nucleophilic substitution", "sn2", 0.85, "adv", 0.18],
  ["ethanol", "bromoethane", "KBr + conc. H₂SO₄", "substitution", null, 0.7, "adv", 0.18],
  ["bromoethane", "ethene", "KOH in ethanol, hot (reflux)", "elimination", "e2", 0.75, "adv", -0.2],
  ["bromoethane", "nitrile", "KCN in ethanol, reflux", "nucleophilic substitution (adds a carbon)", "sn2cn", 0.7, "adv"],
  ["bromoethane", "ethylamine", "excess NH₃ in ethanol, heat in a sealed tube", "nucleophilic substitution", "sn2nh3", 0.6, "adv", -0.35],
  ["nitrile", "propacid", "dilute HCl, reflux", "hydrolysis", null, 0.8, "adv"],
  ["ethanol", "ethanal", "K₂Cr₂O₇ / H₂SO₄, distil off as it forms", "oxidation", null, 0.55, "adv", 0.18],
  ["ethanal", "ethanol", "LiAlH₄ in dry ether", "reduction", null, 0.85, "adv", 0.18],
  ["ethanal", "acid", "K₂Cr₂O₇ / H₂SO₄, reflux", "oxidation", null, 0.85, "adv"],
  ["ethanol", "acid", "K₂Cr₂O₇ / H₂SO₄, reflux (excess oxidant)", "oxidation", null, 0.8, "std", -0.25],
  ["acid", "ethanol", "LiAlH₄ in dry ether", "reduction", null, 0.8, "adv", -0.25],
  ["ethanal", "hydroxynitrile", "HCN with KCN (pH about 8)", "nucleophilic addition", "nadd", 0.8, "adv"],
  ["ethanol", "ester", "ethanoic acid, conc. H₂SO₄, warm (an equilibrium)", "esterification (condensation)", null, 0.67, "std"],
  ["acid", "ester", "ethanol, conc. H₂SO₄, warm (an equilibrium)", "esterification (condensation)", null, 0.67, "std", 0.18],
  ["ester", "acid", "dilute acid or NaOH(aq), reflux", "hydrolysis", null, 0.85, "adv", 0.18],
  ["acid", "acylcl", "PCl₅ (or SOCl₂)", "substitution of OH by Cl", null, 0.8, "adv"],
  ["acylcl", "ester", "ethanol, room temperature", "addition–elimination", "addel", 0.9, "adv", -0.4],
  ["acylcl", "amide", "ethylamine, room temperature", "addition–elimination", null, 0.9, "adv"],
  ["benzene", "nitrobenzene", "conc. HNO₃ + conc. H₂SO₄, 50 °C", "electrophilic substitution", "esub", 0.85, "adv"],
  ["nitrobenzene", "phenylamine", "Sn + conc. HCl, reflux; then NaOH", "reduction", null, 0.7, "adv"],
  ["benzene", "phenylethanone", "CH₃COCl + AlCl₃ catalyst", "electrophilic substitution (Friedel–Crafts acylation)", null, 0.75, "adv"]
];
/* ---- Tests for functional groups: [name, level, what happens] ---- */
const TESTS = [
  ["Bromine water", "std", g => g.includes("alkene") ? ["orange → colourless (decolourised): C=C present", true] : g.includes("anil") ? ["white precipitate (2,4,6-tribromophenylamine)", true] : ["stays orange", false]],
  ["Acidified K₂Cr₂O₇, warm", "std", g => g.some(x => ["prim", "sec", "ald"].includes(x)) ? ["orange → green: a primary or secondary alcohol, or an aldehyde, is oxidised", true] : ["stays orange", false]],
  ["Sodium carbonate solution", "std", g => g.includes("acid") ? ["fizzes: CO₂ (turns limewater milky): a carboxylic acid", true] : g.includes("acylcl") ? ["fizzes (it reacts with the water to give an acid and HCl)", true] : ["no fizzing", false]],
  ["Tollens' reagent, warm", "adv", g => g.includes("ald") ? ["silver mirror: an aldehyde", true] : ["no change", false]],
  ["Fehling's solution, warm", "adv", g => g.includes("ald") ? ["blue → brick-red precipitate: an aldehyde", true] : ["stays blue", false]],
  ["2,4-DNPH (Brady's reagent)", "adv", g => g.includes("ald") || g.includes("ket") ? ["orange precipitate: a carbonyl (C=O) group", true] : ["no precipitate", false]],
  ["Iodine + NaOH, warm (iodoform)", "adv", g => g.includes("iodo") ? ["pale yellow precipitate of CHI₃ (antiseptic smell): CH₃CO– or CH₃CH(OH)–", true] : ["no precipitate", false]],
  ["PCl₅", "adv", g => g.some(x => ["prim", "sec", "acid"].includes(x)) ? ["steamy fumes of HCl: an O–H group", true] : ["no fumes", false]],
  ["NaOH(aq), warm; then HNO₃ and AgNO₃", "adv", g => g.includes("halo") ? ["cream precipitate (AgBr): a bromoalkane", true] : g.includes("acylcl") ? ["white precipitate (AgCl) at once: an acyl chloride", true] : ["no precipitate", false]]
];
/* ---- Lab experiments ---- */
// (a) hydrolysis of halogenoalkanes with water in ethanol (AgNO₃ shows the halide): rate set by the C–X bond enthalpy
const BOND = { Cl: 346, Br: 290, I: 228 }, CLASS = { 1: 1, 2: 4, 3: 60 };
const kHyd = (X, cls, T) => 0.02 * Math.exp(-0.037 * (BOND[X] - 228)) * CLASS[cls] / 60 * Math.exp(-80000 / R * (1 / T - 1 / 323));
// a person decides when the cloudiness is first seen: 3% reacted, judged with a 15% scatter
const pptTime = (X, cls, T, r) => -Math.log(1 - 0.03 * (1 + 0.15 * (r ? r.gauss() : 0))) / kHyd(X, cls, T);
// (b) oxidation of ethanol: alcohol → aldehyde → acid; distillation removes the aldehyde (bp 21 °C) as it forms
function oxid(distil, tEnd, kd = 0.06, dt = 0.5) { let a = 1, b = 0, c = 0, out = 0; const k1 = 0.02, k2 = 0.015, pts = [[0, a, b, c, out]]; for (let t = dt; t <= tEnd + 1e-9; t += dt) { const r1 = k1 * a, r2 = k2 * b, rd = distil ? kd * b : 0; a -= r1 * dt; b += (r1 - r2 - rd) * dt; c += r2 * dt; out += rd * dt; pts.push([t, a, b, c, out]); } return pts; }
// (c) substitution or elimination? ratio E : S rises with temperature (higher Ea), ethanol solvent (stronger base) and branching
const elimFrac = (solvent, cls, T) => { const r = 0.25 * (solvent === "eth" ? 8 : 1) * { 1: 0.1, 2: 1, 3: 6 }[cls] * Math.exp(-20000 / R * (1 / T - 1 / 298)); return r / (1 + r); };
// (d) esterification equilibrium: CH₃COOH + C₂H₅OH ⇌ CH₃COOC₂H₅ + H₂O, Kc ≈ 4; a moles of alcohol per mole of acid
const esterEq = a => (4 * (1 + a) - Math.sqrt(16 * (1 + a) ** 2 - 48 * a)) / 6;
function esterRun(a, cat, tEnd, dt = 1) { let x = 0; const k = cat ? 0.004 : 0.0001, pts = [[0, 0]]; for (let t = dt; t <= tEnd + 1e-9; t += dt) { x += k * ((1 - x) * (a - x) - x * x / 4) * dt; pts.push([t, x]); } return pts; }
// a multi-step route done in a real lab: each step's yield scatters around its typical value
const routeYield = (steps, r) => steps.reduce((p, y) => p * Math.min(1, Math.max(0.05, y * (1 + 0.12 * r.gauss()))), 1);

/* ---- Mechanism drawings: atoms [x, y, text, colour], bonds [a, b, order or "d" for partial], arrows [from, to, bend]; points are atom names, "a-b" (middle of a bond) or [x, y] ---- */
const RED = "#ff7b7b", BRN = "#d99a5b", BLU = "#7ab8ff", GRN = "#7ee787";
const MECH = {
  sn2: { title: "Nucleophilic substitution (SN2): bromoethane + OH⁻", st: [
    { cap: "The lone pair on OH⁻ attacks the δ+ carbon; the C–Br bond breaks heterolytically.", at: { O: [10, 25, "HO:⁻", RED], C: [40, 25, "C"], Br: [60, 25, "Br", BRN], H1: [40, 11, "H"], Me: [40, 40, "CH₃"], H2: [31, 32, "H"] }, b: [["C", "Br", 1], ["C", "H1", 1], ["C", "Me", 1], ["C", "H2", 1]], ar: [[[17, 22], [35, 23], -9], ["C-Br", "Br", -8]], lab: [[43, 19, "δ+"], [62, 18, "δ−"]] },
    { cap: "Transition state: one bond half made, one half broken (SN2: two particles in the slow step).", at: { O: [21, 25, "HO", RED], C: [40, 25, "C"], Br: [59, 25, "Br", BRN], H1: [40, 11, "H"], Me: [40, 40, "CH₃"], H2: [33, 31, "H"] }, b: [["O", "C", "d"], ["C", "Br", "d"], ["C", "H1", 1], ["C", "Me", 1], ["C", "H2", 1]], lab: [[66, 12, "‡ ⁻"]] },
    { cap: "Products: ethanol and a bromide ion (the leaving group).", at: { O: [26, 25, "HO", RED], C: [40, 25, "C"], Br: [70, 25, "Br⁻", BRN], H1: [40, 11, "H"], Me: [40, 40, "CH₃"], H2: [49, 32, "H"] }, b: [["O", "C", 1], ["C", "H1", 1], ["C", "Me", 1], ["C", "H2", 1]] }] },
  sn2cn: { title: "Nucleophilic substitution: bromoethane + CN⁻ (adds a carbon)", st: [
    { cap: "The lone pair on the carbon of CN⁻ attacks the δ+ carbon; Br⁻ leaves.", at: { N: [10, 25, "N≡C:⁻", BLU], C: [40, 25, "C"], Br: [60, 25, "Br", BRN], H1: [40, 11, "H"], Me: [40, 40, "CH₃"], H2: [31, 32, "H"] }, b: [["C", "Br", 1], ["C", "H1", 1], ["C", "Me", 1], ["C", "H2", 1]], ar: [[[19, 22], [35, 23], -9], ["C-Br", "Br", -8]], lab: [[43, 19, "δ+"], [62, 18, "δ−"]] },
    { cap: "Product: propanenitrile, CH₃CH₂CN, one carbon longer. Hydrolysis then gives propanoic acid.", at: { N: [18, 25, "N≡C", BLU], C: [40, 25, "C"], Br: [70, 25, "Br⁻", BRN], H1: [40, 11, "H"], Me: [40, 40, "CH₃"], H2: [49, 32, "H"] }, b: [["N", "C", 1], ["C", "H1", 1], ["C", "Me", 1], ["C", "H2", 1]] }] },
  sn2nh3: { title: "Nucleophilic substitution: bromoethane + ammonia", st: [
    { cap: "The lone pair on NH₃ attacks the δ+ carbon; Br⁻ leaves.", at: { N: [12, 25, "H₃N:", BLU], C: [40, 25, "C"], Br: [60, 25, "Br", BRN], H1: [40, 11, "H"], Me: [40, 40, "CH₃"], H2: [31, 32, "H"] }, b: [["C", "Br", 1], ["C", "H1", 1], ["C", "Me", 1], ["C", "H2", 1]], ar: [[[19, 22], [35, 23], -9], ["C-Br", "Br", -8]], lab: [[43, 19, "δ+"], [62, 18, "δ−"]] },
    { cap: "A second NH₃ removes H⁺ from the N: ethylamine + NH₄Br. Excess NH₃ stops the amine reacting again.", at: { N: [22, 25, "H₂N", BLU], C: [40, 25, "C"], Br: [70, 25, "NH₄⁺ Br⁻", BRN], H1: [40, 11, "H"], Me: [40, 40, "CH₃"], H2: [49, 32, "H"] }, b: [["N", "C", 1], ["C", "H1", 1], ["C", "Me", 1], ["C", "H2", 1]] }] },
  e2: { title: "Elimination: bromoethane + OH⁻ in hot ethanol", st: [
    { cap: "OH⁻ acts as a base, taking H⁺ from the carbon next to C–Br; that bond's electrons form the C=C; Br⁻ leaves.", at: { O: [8, 8, "HO:⁻", RED], H: [28, 13, "H"], C1: [34, 26, "C"], C2: [52, 26, "C"], Br: [68, 26, "Br", BRN], a: [26, 36, "H"], b: [40, 39, "H"], c: [52, 12, "H"], d: [58, 39, "H"] }, b: [["H", "C1", 1], ["C1", "C2", 1], ["C2", "Br", 1], ["C1", "a", 1], ["C1", "b", 1], ["C2", "c", 1], ["C2", "d", 1]], ar: [[[14, 8], "H", -6], ["H-C1", "C1-C2", 8], ["C2-Br", "Br", -8]] },
    { cap: "Products: ethene, water and Br⁻. Hot, ethanolic conditions favour elimination.", at: { O: [10, 10, "H₂O", RED], C1: [34, 26, "C"], C2: [52, 26, "C"], Br: [72, 26, "Br⁻", BRN], a: [26, 36, "H"], b: [26, 16, "H"], c: [60, 16, "H"], d: [60, 36, "H"] }, b: [["C1", "C2", 2], ["C1", "a", 1], ["C1", "b", 1], ["C2", "c", 1], ["C2", "d", 1]] }] },
  eadd: { title: "Electrophilic addition: ethene + HBr", st: [
    { cap: "The π electrons of C=C attack the δ+ H of HBr; the H–Br bond breaks heterolytically.", at: { C1: [30, 32, "C"], C2: [48, 32, "C"], H: [46, 16, "H"], Br: [60, 6, "Br", BRN], a: [22, 42, "H"], b: [22, 22, "H"], c: [56, 42, "H"], d: [36, 42, "H"] }, b: [["C1", "C2", 2], ["H", "Br", 1], ["C1", "a", 1], ["C1", "b", 1], ["C2", "c", 1]], ar: [["C1-C2", "H", -8], ["H-Br", "Br", -6]], lab: [[40, 14, "δ+"], [66, 4, "δ−"]] },
    { cap: "A carbocation forms; Br⁻ uses a lone pair to attack the positive carbon.", at: { C1: [30, 32, "C"], C2: [48, 32, "C⁺"], H: [30, 18, "H"], Br: [72, 30, ":Br⁻", BRN], a: [22, 42, "H"], b: [20, 26, "H"], c: [56, 42, "H"], d: [48, 18, "H"] }, b: [["C1", "C2", 1], ["C1", "H", 1], ["C1", "a", 1], ["C1", "b", 1], ["C2", "c", 1], ["C2", "d", 1]], ar: [[[68, 28], [52, 30], 6]] },
    { cap: "Product: bromoethane. (With Br₂, the Br–Br bond is polarised by the C=C: 1,2-dibromoethane.)", at: { C1: [30, 32, "C"], C2: [48, 32, "C"], H: [30, 18, "H"], Br: [62, 32, "Br", BRN], a: [22, 42, "H"], b: [20, 26, "H"], c: [48, 46, "H"], d: [48, 18, "H"] }, b: [["C1", "C2", 1], ["C1", "H", 1], ["C1", "a", 1], ["C1", "b", 1], ["C2", "c", 1], ["C2", "d", 1], ["C2", "Br", 1]] }] },
  nadd: { title: "Nucleophilic addition: ethanal + HCN (KCN)", st: [
    { cap: "CN⁻ attacks the δ+ carbon of C=O; the π electrons move onto the oxygen.", at: { N: [8, 30, "N≡C:⁻", BLU], C: [40, 30, "C"], O: [40, 12, "O", RED], Me: [28, 42, "CH₃"], H: [54, 40, "H"] }, b: [["C", "O", 2], ["C", "Me", 1], ["C", "H", 1]], ar: [[[18, 27], [36, 29], -8], ["C-O", "O", 8]], lab: [[44, 26, "δ+"], [44, 8, "δ−"]] },
    { cap: "The O⁻ of the intermediate takes H⁺ from HCN (regenerating CN⁻).", at: { N: [22, 22, "N≡C", BLU], C: [40, 30, "C"], O: [40, 14, "O:⁻", RED], Me: [28, 42, "CH₃"], H: [54, 40, "H"], HC: [62, 6, "H–CN"] }, b: [["N", "C", 1], ["C", "O", 1], ["C", "Me", 1], ["C", "H", 1]], ar: [[[45, 12], [58, 7], -6]] },
    { cap: "Product: 2-hydroxypropanenitrile. The C=O is planar, so CN⁻ attacks from either side: a racemic mixture.", at: { N: [22, 22, "N≡C", BLU], C: [40, 30, "C"], O: [40, 14, "OH", RED], Me: [28, 42, "CH₃"], H: [54, 40, "H"] }, b: [["N", "C", 1], ["C", "O", 1], ["C", "Me", 1], ["C", "H", 1]] }] },
  addel: { title: "Addition–elimination: ethanoyl chloride + ethanol", st: [
    { cap: "A lone pair on ethanol's O attacks the very δ+ carbon; the π electrons go onto O.", at: { E: [8, 30, "C₂H₅–OH", RED], C: [40, 30, "C"], O: [40, 12, "O", RED], Me: [28, 42, "CH₃"], Cl: [56, 40, "Cl", GRN] }, b: [["C", "O", 2], ["C", "Me", 1], ["C", "Cl", 1]], ar: [[[18, 27], [36, 29], -8], ["C-O", "O", 8]], lab: [[44, 26, "δ+"]] },
    { cap: "The C=O reforms and Cl⁻ is eliminated; then H⁺ is lost from the O.", at: { E: [16, 22, "C₂H₅–O⁺H", RED], C: [40, 30, "C"], O: [40, 14, "O⁻", RED], Me: [28, 42, "CH₃"], Cl: [58, 42, "Cl", GRN] }, b: [["E", "C", 1], ["C", "O", 1], ["C", "Me", 1], ["C", "Cl", 1]], ar: [[[44, 15], "C-O", 8], ["C-Cl", "Cl", -8]] },
    { cap: "Products: ethyl ethanoate and HCl (steamy fumes). Fast and complete, unlike esterification with the acid.", at: { E: [20, 24, "C₂H₅–O", RED], C: [40, 30, "C"], O: [40, 12, "O", RED], Me: [28, 42, "CH₃"], Cl: [66, 40, "HCl", GRN] }, b: [["E", "C", 1], ["C", "O", 2], ["C", "Me", 1]] }] },
  esub: { title: "Electrophilic substitution: nitration of benzene", st: [
    { cap: "The electrophile NO₂⁺ (from HNO₃ + H₂SO₄) is attacked by the delocalised π electrons of the ring.", ring: [30, 26, "full"], at: { N: [62, 20, "⁺NO₂", BLU] }, b: [], ar: [[[38, 22], [58, 19], -8]] },
    { cap: "Intermediate: the delocalisation is partly broken (a positive horseshoe). The C–H bond electrons move back into the ring.", ring: [30, 26, "horse"], at: { N: [50, 10, "NO₂", BLU], H: [52, 22, "H"] }, b: [], c1: true, ar: [[[45, 18], [36, 24], 6]] },
    { cap: "Product: nitrobenzene; H⁺ is lost (and reforms H₂SO₄, the catalyst). The stable ring is kept: substitution, not addition.", ring: [30, 26, "full"], at: { N: [54, 26, "NO₂", BLU], H: [72, 26, "H⁺"] }, b: [], c2: true }] },
  frs: { title: "Free-radical substitution: ethane + bromine in UV light", st: [
    { cap: "Initiation: UV light breaks Br–Br homolytically, one electron to each atom.", eq: ["Br₂ → 2Br•  (UV)"] },
    { cap: "Propagation: a chain reaction; each step uses one radical and makes another.", eq: ["Br• + C₂H₆ → HBr + •C₂H₅", "•C₂H₅ + Br₂ → C₂H₅Br + Br•"] },
    { cap: "Termination: two radicals meet. Further substitution gives a mixture (C₂H₄Br₂ …): a low yield.", eq: ["2Br• → Br₂", "•C₂H₅ + Br• → C₂H₅Br", "2•C₂H₅ → C₄H₁₀"] }] }
};

// label a category axis only at whole numbers
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
// ---------------- The page ----------------
const DEF = { lab: "hyd", T: 323, X: "Br", cls: 1, solvent: "aq", distil: true, ratio: 1, cat: true };
const P = Object.assign({}, DEF); let sel = null, from = null, route = null, edge = null, stage = 0, test = null, lt = 0, lspeed = 10;
const ui = K.app({
  title: "Organic Mechanisms and Synthesis", subject: "Chemistry",
  blurb: "A map of organic reactions: plan routes, step through curly-arrow mechanisms, test for functional groups, and run competing reactions in the lab",
  reset: () => set({}),
  levels: { std: "Standard (iGCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Chemistry (4CH1) 4(c)–4(g): substitution of alkanes with bromine in UV, addition reactions of alkenes (bromine water, steam, polymerisation), ethanol by hydration and by fermentation, oxidation of ethanol to ethanoic acid, carboxylic acids with carbonates, esters from alcohols and acids.", adv: "Pearson Edexcel A level Chemistry (9CH0) Topic 6 (halogenoalkanes: nucleophilic substitution and elimination, relative rates for C–Cl, C–Br, C–I; alcohols: oxidation to aldehydes by distillation and to acids by reflux), Topic 17 (carbonyls: nucleophilic addition of HCN, reduction with LiAlH₄, tests with Tollens', Fehling's, 2,4-DNPH and iodoform; carboxylic acids, esters and acyl chlorides) and Topic 18 (benzene: electrophilic substitution; amines, amides; organic synthesis and multi-step routes)." } },
  missions: [
    { title: "From sugar to vinegar", q: "Click glucose, then ethanoic acid. What is the route, and what is its overall yield?", hint: "Fermentation (yeast, 30 °C, no air) gives ethanol; oxidation (acidified potassium dichromate, or microbes in air) gives ethanoic acid. Overall yield = 0.45 × 0.80 ≈ 36%: every step loses some.", setup() { set({}); pick("glucose"); pick("acid"); } },
    { title: "Testing for C=C", q: "Click ethene and use bromine water. Then try ethane and poly(ethene). Which decolourise it?", hint: "Only ethene: bromine adds across the C=C double bond (an addition reaction), so the orange colour goes. Ethane and poly(ethene) are saturated: no change.", setup() { set({}); select("ethene"); doTest(0); } },
    { title: "Making an ester", q: "Click ethanol, then ethyl ethanoate. Then run the Esterification lab: why does the yield stop at about two-thirds?", hint: "Esterification is an equilibrium (Kc ≈ 4), so with 1 mol of each only 2/3 mol of ester forms. Concentrated sulfuric acid is a catalyst: it speeds up reaching equilibrium but does not move it.", setup() { set({ lab: "ester" }); pick("ethanol"); pick("ester"); } },
    { lvl: "adv", title: "SN2, step by step", q: "Click the road from bromoethane to ethanol. Step through the mechanism: where does each curly arrow start and end?", hint: "Arrow 1 starts at a lone pair on OH⁻ and ends at the δ+ carbon. Arrow 2 starts at the middle of the C–Br bond and ends on Br, which leaves as Br⁻. Curly arrows always move a pair of electrons.", setup() { set({}); showEdge("bromoethane", "ethanol"); } },
    { lvl: "adv", title: "Substitution or elimination?", q: "Lab: Substitution or elimination. Compare aqueous and ethanolic hydroxide at 25 °C and at 78 °C, for a primary and a tertiary bromoalkane.", hint: "Elimination is favoured by ethanol as solvent (OH⁻ acts as a base), by higher temperature (it has the higher activation energy) and by branching. Aqueous, warm conditions with a primary bromoalkane give mostly the alcohol.", setup() { set({ lab: "elim" }); showEdge("bromoethane", "ethene"); } },
    { lvl: "adv", title: "Which halogenoalkane is fastest?", q: "Lab: Hydrolysis race. Which forms a precipitate first with silver nitrate in ethanol: C–Cl, C–Br or C–I? Why?", hint: "C–I first (yellow AgI), then C–Br (cream), C–Cl last (white). The rate depends on breaking the C–X bond: C–I is the weakest (228 kJ/mol), even though C–Cl is the most polar. Bond enthalpy wins over polarity.", setup() { set({ lab: "hyd" }); } },
    { lvl: "adv", title: "Aldehyde or acid?", q: "Lab: Oxidation of ethanol. Compare distilling as it forms with heating under reflux. Why do they give different products?", hint: "Ethanal boils at 21 °C: distilling it off at once stops it being oxidised further. Under reflux it condenses back and is oxidised to ethanoic acid. Test the product with Tollens' or Fehling's to see an aldehyde.", setup() { set({ lab: "ox", distil: true }); showEdge("ethanol", "ethanal"); } },
    { lvl: "adv", title: "Adding a carbon", q: "Plan a route from ethene to propanoic acid. How many steps? What is the overall yield?", hint: "Ethene → bromoethane (HBr) → propanenitrile (KCN in ethanol: this adds the carbon) → propanoic acid (hydrolysis). Three steps: about 0.9 × 0.7 × 0.8 ≈ 50%.", setup() { set({}); pick("ethene"); pick("propacid"); } },
    { lvl: "adv", title: "Identify by tests", q: "Click ethanal, then phenylethanone. Run 2,4-DNPH, Tollens' and iodoform on each. Which tests tell them apart?", hint: "Both give an orange 2,4-DNPH precipitate (C=O). Only ethanal (an aldehyde) gives a silver mirror. Both give iodoform (both have CH₃CO–).", setup() { set({}); select("ethanal"); doTest(5); } },
    { lvl: "adv", title: "Benzene: substitution, not addition", q: "Show the nitration mechanism. Why does benzene substitute rather than add, unlike ethene?", hint: "Adding would destroy the delocalised ring, which is very stable (about 150 kJ/mol). By losing H⁺ the ring is restored. The electrophile NO₂⁺ is made from concentrated HNO₃ and H₂SO₄.", setup() { set({}); showEdge("benzene", "nitrobenzene"); } }
  ],
  batch: [
    { title: "Hydrolysis race: C–Cl, C–Br, C–I", question: "How long until silver halide first clouds the tube for 1-chloro-, 1-bromo- and 1-iodobutane?", how: "50 °C; the time a student judges the first cloudiness (±15%). 1 = Cl, 2 = Br, 3 = I.", xLabel: "halogen (1 Cl, 2 Br, 3 I)", yLabel: "log₁₀(time / s)", xs: [1, 2, 3], reps: 10, theory: i => Math.log10(pptTime(["Cl", "Br", "I"][Math.round(i) - 1] || "Br", 1, 323)), theoryLabel: "model", run: (i, r) => Math.log10(pptTime(["Cl", "Br", "I"][i - 1], 1, 323, r)), note: "Each step down the group is about ten times faster (a log scale): the weaker C–X bond breaks more easily." },
    { title: "Primary, secondary, tertiary", question: "How does branching change the time for a bromoalkane to cloud the silver nitrate?", how: "1-bromobutane (1°), 2-bromobutane (2°), 2-bromo-2-methylpropane (3°); 50 °C; ±15% judging.", xLabel: "class (1°, 2°, 3°)", yLabel: "time to cloud (s)", xs: [1, 2, 3], reps: 10, yMin: 0, theory: c => pptTime("Br", Math.round(c), 323), theoryLabel: "model", run: (c, r) => pptTime("Br", c, 323, r), note: "Tertiary is fastest: it reacts by SN1 through a stable tertiary carbocation." },
    { lvl: "adv", title: "Elimination and temperature", question: "What percentage of 2-bromopropane is eliminated (propene) at each temperature, in ethanolic and aqueous hydroxide?", how: "Product mixture analysed by gas chromatography (±2%). Ethanolic KOH.", xLabel: "temperature (°C)", yLabel: "% alkene", xs: [20, 35, 50, 65, 78], reps: 6, yMin: 0, yMax: 100, theory: T => 100 * elimFrac("eth", 2, T + 273), theoryLabel: "ethanolic", run: (T, r) => Math.max(0, Math.min(100, 100 * elimFrac("eth", 2, T + 273) + 2 * r.gauss())), note: "Higher temperature favours elimination, which has the higher activation energy. In water (not shown) it would stay mostly substitution." },
    { title: "Esterification: more alcohol, more ester?", question: "How much ester forms from 1 mol of ethanoic acid with different amounts of ethanol?", how: "At equilibrium, Kc = 4; found by titrating the acid left (±0.02 mol).", xLabel: "moles of ethanol", yLabel: "moles of ester", xs: [0.5, 1, 2, 3, 4, 6], reps: 6, yMin: 0, yMax: 1, theory: a => esterEq(a), theoryLabel: "Kc = 4", run: (a, r) => esterEq(a) + 0.02 * r.gauss(), note: "Using an excess of the cheaper reagent pushes the equilibrium to the right (Le Chatelier): 2/3 mol with equal amounts, 0.93 mol with six times the alcohol." },
    { lvl: "adv", title: "Yield of a three-step route", question: "Ethene → bromoethane → propanenitrile → propanoic acid, made by 300 students. What overall yields do they get?", how: "Typical step yields 90%, 70% and 80%; each student's yields scatter by ±12% of the typical value.", yLabel: "overall yield (%)", reps: 300, bins: 24, theory: 100 * 0.9 * 0.7 * 0.8, theoryLabel: "0.9 × 0.7 × 0.8", run: (x, r) => 100 * routeYield([0.9, 0.7, 0.8], r), note: "Yields multiply: about 50%. Longer routes lose much more, which is why chemists look for the shortest route." },
    { lvl: "adv", title: "Distil quickly to keep the aldehyde", question: "How much of the ethanol ends up as collected ethanal, depending on how fast it distils off?", how: "Ethanol → ethanal (k = 0.02 s⁻¹) → ethanoic acid (0.015 s⁻¹); distillation removes ethanal at rate k_d; ±3% in the analysis.", xLabel: "distillation rate k_d (s⁻¹)", yLabel: "% collected as ethanal", xs: [0.005, 0.01, 0.02, 0.05, 0.1, 0.2], reps: 6, yMin: 0, yMax: 100, theory: kd => 100 * oxid(true, 600, kd)[1200][4], theoryLabel: "model", run: (kd, r) => 100 * oxid(true, 600, kd)[1200][4] + 3 * r.gauss(), note: "The faster the aldehyde escapes, the less is oxidised further. Under reflux (k_d = 0) none is collected." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4CH1 4(c)", text: "Alkanes react with bromine in UV light by substitution: a hydrogen atom is replaced by a bromine atom." },
      { lvl: "std", tag: "4CH1 4(d)", text: "Alkenes decolourise bromine water (addition across C=C). Ethene adds steam (H₃PO₄ catalyst, 300 °C, 60–70 atm) to make ethanol, and polymerises to poly(ethene)." },
      { lvl: "std", tag: "4CH1 4(e)", text: "Ethanol by fermentation (yeast, 30 °C, no air; renewable, slow, impure) or hydration of ethene (fast, pure, non-renewable). Ethanol is oxidised to ethanoic acid." },
      { lvl: "std", tag: "4CH1 4(f)–(g)", text: "Carboxylic acids are weak acids; with carbonates they give CO₂. Acid + alcohol (conc. H₂SO₄ catalyst) ⇌ ester + water." },
      { lvl: "adv", tag: "9CH0 6", text: "Halogenoalkanes: nucleophilic substitution with OH⁻(aq) (alcohol), CN⁻ in ethanol (nitrile, +1 C), NH₃ in ethanol (amine). Elimination with OH⁻ in hot ethanol (alkene). Rate: C–I > C–Br > C–Cl (bond enthalpy)." },
      { lvl: "adv", tag: "9CH0 6", text: "Primary alcohols → aldehydes (distil off at once) → carboxylic acids (reflux). Secondary → ketones. Tertiary: not oxidised. Acidified dichromate goes orange → green." },
      { lvl: "adv", tag: "9CH0 17", text: "Carbonyls: nucleophilic addition of HCN/KCN (hydroxynitrile, racemic); reduction by LiAlH₄. Tests: 2,4-DNPH (any C=O), Tollens' and Fehling's (aldehydes only), iodoform (CH₃CO– and CH₃CH(OH)–)." },
      { lvl: "adv", tag: "9CH0 17–18", text: "Acyl chlorides react fast and completely with alcohols (esters), water (acids), ammonia and amines (amides): addition–elimination. Benzene undergoes electrophilic substitution (nitration, Friedel–Crafts) to keep its delocalised ring." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: "Give two advantages of making ethanol by hydration of ethene rather than by fermentation, and one disadvantage.", ans: "<ul><li>faster; continuous process</li><li>purer product (no distillation from a dilute mixture)</li><li>but ethene comes from crude oil: non-renewable</li></ul>" },
      { lvl: "std", marks: 2, q: "Describe the test for a carbon–carbon double bond and its result.", ans: "<ul><li>add bromine water</li><li>it turns from orange to colourless</li></ul>" },
      { lvl: "adv", marks: 4, q: "Describe the mechanism of the reaction of bromoethane with aqueous hydroxide ions, and name it.", ans: "<ul><li>nucleophilic substitution</li><li>curly arrow from a lone pair on OH⁻ to the δ+ carbon</li><li>curly arrow from the C–Br bond to Br</li><li>products ethanol and Br⁻</li></ul>" },
      { lvl: "adv", marks: 3, q: () => { const r = route; return r && r.length > 1 ? `A route has ${r.length} steps with yields ${r.map(e => Math.round(e[5] * 100) + "%").join(", ")}. Calculate the overall yield.` : "A route has three steps with yields 90%, 70% and 80%. Calculate the overall yield."; }, ans: () => { const r = route && route.length > 1 ? route : [[0, 0, 0, 0, 0, 0.9], [0, 0, 0, 0, 0, 0.7], [0, 0, 0, 0, 0, 0.8]]; return `<ul><li>multiply the step yields: ${r.map(e => e[5].toFixed(2)).join(" × ")}</li><li>= ${(100 * r.reduce((p, e) => p * e[5], 1)).toFixed(0)}%</li></ul>`; } },
      { lvl: "adv", marks: 2, q: "Why does hot ethanolic KOH give mainly ethene from bromoethane, but aqueous NaOH gives ethanol?", ans: "<ul><li>in ethanol OH⁻ acts mainly as a base (removes H⁺): elimination</li><li>in water it acts as a nucleophile: substitution; higher temperature also favours elimination</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li>The map holds 20 compounds and 29 reactions from the specifications, each with its reagents, conditions, type and a typical yield (illustrative). A route is the shortest chain of reactions (fewest steps) from one compound to another; its overall yield is the product of the step yields.</li>
<li>Tests: each compound's functional groups decide each result.</li>
<li>Hydrolysis race: rate constant k ∝ e^(−0.037 × (C–X bond enthalpy − 228)) (so each step from I to Br to Cl is about ten times slower), × 4 for secondary and × 60 for tertiary, with Ea = 80 kJ/mol for temperature. A cloud is seen when 3% has reacted (judged ±15%).</li>
<li>Oxidation: ethanol → ethanal → ethanoic acid, first-order steps (0.02 and 0.015 s⁻¹); distillation removes ethanal at rate k_d.</li>
<li>Substitution or elimination: E : S = 0.25 × (8 in ethanol) × (0.1, 1 or 6 for 1°, 2°, 3°) × e^(−20 000/R (1/T − 1/298)).</li>
<li>Esterification: Kc = 4; with a moles of ethanol per mole of acid the ester at equilibrium solves x² = 4(1 − x)(a − x). Without acid catalyst the approach is 40 times slower.</li></ul>
<h3>Simplifications</h3>
<ul><li>Typical yields are rounded classroom values; real ones depend on technique.</li><li>Side reactions are left out (for example, further substitution in the amine and free-radical reactions is only described).</li><li>Mechanisms are drawn flat; 3-D shapes and the inversion in SN2 are only suggested.</li></ul>`
});

// ---------------- Controls ----------------
const ctl = {}; let g = ui.group("Reaction map");
K.note(g, "Click a compound to select it; click a second one to find a route. Click a road (or a step in the route) to see its mechanism.");
let rr = K.row(g); K.btn(rr, "◀ Mechanism step", () => { stage = Math.max(0, stage - 1); }); K.btn(rr, "Next step ▶", () => { const m = edge && MECH[edge[4]]; if (m) stage = Math.min(m.st.length - 1, stage + 1); }, "primary");
K.btn(K.row(g), "✕ Clear the route", () => { from = null; route = null; edge = null; sel = null; test = null; });
const gt = ui.group("Test the selected compound"); const tbtns = TESTS.map((T, i) => K.btn(gt, T[0], () => doTest(i), "small"));
g = ui.group("Lab experiment");
ctl.lab = K.seg(g, { value: "hyd", options: [["hyd", "Hydrolysis race"], ["ox", "Oxidation of ethanol"], ["elim", "Substitution or elimination"], ["ester", "Esterification"]], on: v => { P.lab = v; lt = 0; sync(); } });
ctl.T = K.slider(g, { label: "Temperature", min: 293, max: 353, step: 1, value: 323, fmt: v => (v - 273) + " °C", on: v => { P.T = v; lt = 0; } });
ctl.cls = K.seg(g, { label: "Bromoalkane", value: 1, options: [[1, "primary"], [2, "secondary"], [3, "tertiary"]], on: v => { P.cls = v; lt = 0; } });
ctl.solvent = K.seg(g, { label: "Hydroxide in", value: "aq", options: [["aq", "water"], ["eth", "ethanol"]], on: v => { P.solvent = v; } });
ctl.distil = K.toggle(g, { label: "Distil the product off as it forms", value: true, on: v => { P.distil = v; lt = 0; } });
ctl.ratio = K.slider(g, { label: "Moles of ethanol per mole of acid", min: 0.5, max: 6, step: 0.5, value: 1, on: v => { P.ratio = v; lt = 0; } });
ctl.cat = K.toggle(g, { label: "Conc. H₂SO₄ catalyst", value: true, on: v => { P.cat = v; lt = 0; } });
K.btn(K.row(g), "↺ Start the experiment again", () => lt = 0, "primary");
const read = K.readout(ui.group("Readings"), [["a", "selected"], ["b", "route"], ["c", "overall yield"], ["d", "lab result"]]);
function sync() { ctl.lab.set(P.lab); ctl.T.set(P.T); ctl.cls.set(P.cls); ctl.solvent.set(P.solvent); ctl.distil.set(P.distil); ctl.ratio.set(P.ratio); ctl.cat.set(P.cat); const on = (c, v) => c.el.style.display = v ? "" : "none";
  on(ctl.T, P.lab !== "ester"); on(ctl.cls, P.lab === "hyd" || P.lab === "elim"); on(ctl.solvent, P.lab === "elim"); on(ctl.distil, P.lab === "ox"); on(ctl.ratio, P.lab === "ester"); on(ctl.cat, P.lab === "ester");
  const adv = ui.level === "adv"; tbtns.forEach((b, i) => b.style.display = adv || TESTS[i][1] === "std" ? "" : "none"); ctl.lab.el.querySelectorAll("button").forEach((b, i) => b.style.display = adv || i === 3 ? "" : "none"); if (!adv && P.lab !== "ester") { P.lab = "ester"; ctl.lab.set("ester"); sync(); } }
function set(o) { Object.assign(P, DEF, o); from = null; route = null; edge = null; sel = null; test = null; stage = 0; lt = 0; if (ui.level !== "adv" && !o.lab) P.lab = "ester"; sync(); }
const visC = c => ui.level === "adv" || c[6] === "std", visE = e => (ui.level === "adv" || e[6] === "std") && visC(C_[CI(e[0])]) && visC(C_[CI(e[1])]);
function select(k) { sel = k; test = null; }
// breadth-first search for the route with fewest steps
function findRoute(a, b) { const prev = { [a]: null }, q = [a]; while (q.length) { const u = q.shift(); if (u === b) break; for (const e of E_) if (e[0] === u && visE(e) && !(e[1] in prev)) { prev[e[1]] = e; q.push(e[1]); } } if (!(b in prev)) return null; const out = []; let v = b; while (prev[v]) { out.unshift(prev[v]); v = prev[v][0]; } return out; }
function pick(k) { if (from && from !== k) { route = findRoute(from, k); edge = route && route.find(e => MECH[e[4]]) || (route && route[0]) || null; stage = 0; from = null; sel = k; } else { from = k; route = null; sel = k; } test = null; }
function showEdge(a, b) { edge = E_.find(e => e[0] === a && e[1] === b); route = [edge]; stage = 0; sel = b; }
function doTest(i) { if (!sel) return; test = [i, TESTS[i][2](C_[CI(sel)][5])]; }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function WRAP(c, s, x, y, maxW, lh = 15, col = "#8fa0bf", f = "11.5px") { c.font = f + " Segoe UI,sans-serif"; let line = ""; for (const wd of s.split(" ")) { if (c.measureText(line + wd).width > maxW && line) { TX(c, line, x, y, col, "left", f); y += lh; line = ""; } line += wd + " "; } TX(c, line, x, y, col, "left", f); return y + lh; }
let nodes = [], roads = [];
function arrowHead(c, x, y, ang, s = 7) { c.beginPath(); c.moveTo(x, y); c.lineTo(x - s * Math.cos(ang - 0.4), y - s * Math.sin(ang - 0.4)); c.lineTo(x - s * Math.cos(ang + 0.4), y - s * Math.sin(ang + 0.4)); c.closePath(); c.fill(); }
// a road between two compounds: a gently curved line with an arrow at the end; returns its middle point
function road(c, a, b, bend, col, wdt) { const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, sx = a.x + ux * 30, sy = a.y + uy * 14, ex = b.x - ux * 30, ey = b.y - uy * 14, mx = (sx + ex) / 2 - uy * bend * L, my = (sy + ey) / 2 + ux * bend * L;
  c.strokeStyle = col; c.lineWidth = wdt; c.beginPath(); c.moveTo(sx, sy); c.quadraticCurveTo(mx, my, ex, ey); c.stroke(); c.fillStyle = col; arrowHead(c, ex, ey, Math.atan2(ey - my, ex - mx)); c.lineWidth = 1; return { x: 0.25 * sx + 0.5 * mx + 0.25 * ex, y: 0.25 * sy + 0.5 * my + 0.25 * ey }; }
function drawMech(c, m, x0, y0, W, H) {
  const s = Math.min(W / 82, H / 50), X = v => x0 + v * s, Y = v => y0 + v * s, st = m.st[Math.min(stage, m.st.length - 1)];
  TX(c, m.title, x0, y0 - 8, "#eef2f8", "left", "600 12.5px"); TX(c, `step ${Math.min(stage, m.st.length - 1) + 1} of ${m.st.length}`, x0 + W, y0 - 8, "#8fa0bf", "right", "11px");
  if (st.eq) { st.eq.forEach((q, i) => TX(c, q, X(6), Y(12 + i * 10), "#ffd166", "left", "600 15px")); }
  const P_ = p => typeof p === "string" ? (p.includes("-") ? (() => { const [a, b] = p.split("-"); return [(st.at[a][0] + st.at[b][0]) / 2, (st.at[a][1] + st.at[b][1]) / 2]; })() : st.at[p].slice(0, 2)) : p;
  if (st.ring) { const [cx, cy, mode] = st.ring, r = 11; c.strokeStyle = "#cfd8ea"; c.lineWidth = 2; c.beginPath(); for (let k = 0; k <= 6; k++) { const a = k * Math.PI / 3 + Math.PI / 6, px = X(cx + r * Math.cos(a)), py = Y(cy + r * Math.sin(a)); k ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke();
    c.beginPath(); if (mode === "full") c.arc(X(cx), Y(cy), r * 0.6 * s, 0, 6.3); else c.arc(X(cx), Y(cy), r * 0.6 * s, -0.9, 4.0, true); c.stroke(); c.lineWidth = 1; if (mode === "horse") TX(c, "+", X(cx), Y(cy) + 5, "#ffd166", "center", "600 16px");
    const rc = [cx + r * Math.cos(-Math.PI / 6), cy + r * Math.sin(-Math.PI / 6)]; if (st.c1) { c.strokeStyle = "#cfd8ea"; c.beginPath(); c.moveTo(X(rc[0]), Y(rc[1])); c.lineTo(X(48), Y(12)); c.moveTo(X(rc[0]), Y(rc[1])); c.lineTo(X(50), Y(21)); c.stroke(); }
    if (st.c2) { const rp = [cx + r, cy]; c.strokeStyle = "#cfd8ea"; c.beginPath(); c.moveTo(X(rp[0]), Y(rp[1])); c.lineTo(X(50), Y(26)); c.stroke(); } }
  for (const [a, b, o] of st.b || []) { const [x1, y1] = st.at[a], [x2, y2] = st.at[b], dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, sh = 3.2, p1 = [x1 + ux * sh, y1 + uy * sh], p2 = [x2 - ux * sh, y2 - uy * sh];
    c.strokeStyle = "#cfd8ea"; c.lineWidth = 1.6; c.setLineDash(o === "d" ? [4, 4] : []); const offs = o === 2 ? [-0.8, 0.8] : [0]; for (const of of offs) { c.beginPath(); c.moveTo(X(p1[0] - uy * of), Y(p1[1] + ux * of)); c.lineTo(X(p2[0] - uy * of), Y(p2[1] + ux * of)); c.stroke(); } c.setLineDash([]); c.lineWidth = 1; }
  for (const k in st.at || {}) { const [x, y, t, col] = st.at[k]; c.fillStyle = "#0b1020"; c.font = "600 14px Segoe UI,sans-serif"; const tw = c.measureText(t).width; c.fillRect(X(x) - tw / 2 - 2, Y(y) - 10, tw + 4, 18); TX(c, t, X(x), Y(y) + 5, col || "#eef2f8", "center", "600 14px"); }
  for (const [x, y, t] of st.lab || []) TX(c, t, X(x), Y(y), "#ffb454", "left", "11px");
  for (const [a, b, bend] of st.ar || []) { const p = P_(a), q = P_(b), mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1, cxp = mx - dy / L * bend, cyp = my + dx / L * bend;
    c.strokeStyle = "#ff9f43"; c.fillStyle = "#ff9f43"; c.lineWidth = 2; c.beginPath(); c.moveTo(X(p[0]), Y(p[1])); c.quadraticCurveTo(X(cxp), Y(cyp), X(q[0]), Y(q[1])); c.stroke(); arrowHead(c, X(q[0]), Y(q[1]), Math.atan2(q[1] - cyp, q[0] - cxp), 9); c.lineWidth = 1; }
  WRAP(c, st.cap, x0, y0 + H + 6, W, 15, "#cfd8ea", "12px");
}
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h, adv = ui.level === "adv"; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h);
  const mapH = h * 0.52, colW = (w - 40) / 8, rowH = (mapH - 30) / 3.3, pos = k => { const C = C_[CI(k)]; return { x: 20 + colW * (C[3] + 0.5), y: 24 + rowH * C[4] }; };
  // roads
  roads = []; const onRoute = e => route && route.includes(e);
  for (const e of E_) { if (!visE(e)) continue; const a = pos(e[0]), b = pos(e[1]), hot = onRoute(e), act = edge === e; const mid = road(c, a, b, e[7] || 0, act ? "#ffd166" : hot ? "#7ee787" : "rgba(143,160,191,.35)", act || hot ? 2.6 : 1.3); roads.push({ e, x: mid.x, y: mid.y }); }
  // compounds
  nodes = []; for (const C of C_) { if (!visC(C)) continue; const p = pos(C[0]), on = sel === C[0], st = from === C[0];
    c.font = "600 12px Segoe UI,sans-serif"; const tw = Math.max(c.measureText(C[1]).width, 60) + 14; c.fillStyle = on ? "rgba(90,209,255,.25)" : "#16203a"; c.strokeStyle = st ? "#ffd166" : on ? "#5ad1ff" : "#3a4a6b"; c.lineWidth = st || on ? 2 : 1;
    c.beginPath(); c.roundRect(p.x - tw / 2, p.y - 15, tw, 32, 8); c.fill(); c.stroke(); c.lineWidth = 1; TX(c, C[1], p.x, p.y - 1, "#eef2f8", "center", "600 11.5px"); TX(c, C[2], p.x, p.y + 12, "#8fa0bf", "center", "10.5px"); nodes.push({ k: C[0], x: p.x, y: p.y, w: tw }); }
  // lower panel: mechanism on the left, details on the right
  const y0 = mapH + 26, lw = w * 0.56; c.strokeStyle = "rgba(255,255,255,.12)"; c.beginPath(); c.moveTo(10, mapH + 6); c.lineTo(w - 10, mapH + 6); c.stroke();
  const m = edge && MECH[edge[4]] && (adv || edge[4] === "frs") ? MECH[edge[4]] : null;
  if (m) drawMech(c, m, 20, y0, lw - 40, h - y0 - 46); else WRAP(c, edge ? `${edge[3]}: ${adv ? "no mechanism is needed for this one in the specification." : "mechanisms are A level."}` : "Click a road between two compounds (or plan a route) to see what happens.", 20, y0 + 6, lw - 40, 16, "#8fa0bf", "12px");
  let x = lw + 10, y = y0; const tw = w - x - 16;
  if (route) { TX(c, route.length ? `Route: ${route.length} step${route.length > 1 ? "s" : ""}` : "", x, y, "#eef2f8", "left", "600 12.5px"); y += 18;
    route.forEach((e, i) => { const on = e === edge; y = WRAP(c, `${i + 1}. ${C_[CI(e[0])][1]} → ${C_[CI(e[1])][1]}: ${e[2]} (${e[3]}, ~${Math.round(e[5] * 100)}%)`, x, y, tw, 14, on ? "#ffd166" : "#cfd8ea", "11.5px") + 2; });
    if (route.length > 1) { TX(c, `Overall yield ≈ ${route.map(e => Math.round(e[5] * 100) + "%").join(" × ")} = ${(100 * route.reduce((p, e) => p * e[5], 1)).toFixed(0)}%`, x, y + 4, "#7ee787", "left", "600 12px"); y += 22; } }
  else if (from) TX(c, `From ${C_[CI(from)][1]}: now click the target compound`, x, y, "#ffd166", "left", "12px");
  else if (route === null && sel && !from) { }
  if (test && sel) { y += 8; TX(c, `${TESTS[test[0]][0]} on ${C_[CI(sel)][1]}:`, x, y, "#eef2f8", "left", "600 12px"); y = WRAP(c, test[1][0], x, y + 16, tw, 15, test[1][1] ? "#7ee787" : "#aab6cc", "12px"); }
  if (route === null && from === null && sel === null && !edge) TX(c, "Nothing selected", x, y, "#8fa0bf", "left", "12px");
  ui.hud("");
}
K.pointer(cv.el, { down: ({ x, y }) => { for (const n of nodes) if (Math.abs(x - n.x) < n.w / 2 && Math.abs(y - n.y) < 16) { pick(n.k); return; } let best = null, bd = 400; for (const r of roads) { const d = (r.x - x) ** 2 + (r.y - y) ** 2; if (d < bd) { bd = d; best = r; } } if (best) { if (route && route.includes(best.e)) edge = best.e; else { edge = best.e; route = [best.e]; } stage = 0; sel = best.e[1]; } } });

// ---------------- Lab experiments (charts) ----------------
function charts() {
  const T = P.T; let res = "–"; chA.opts.xFmt = null; chB.opts.xFmt = null;
  if (P.lab === "hyd") { const ser = [], tm = 600; ["Cl", "Br", "I"].forEach((X, i) => { const k = kHyd(X, P.cls, T), pts = []; for (let tt = 0; tt <= tm; tt += 5) pts.push([tt, 100 * (1 - Math.exp(-k * Math.min(tt, lt)))]); ser.push({ pts, color: ["#e8e8e8", "#f5deb3", "#ffe66d"][i], label: `C–${X} (Ag${X} ${["white", "cream", "yellow"][i]})` }); });
    chA.opts.title = `Race at ${T - 273} °C`; chA.opts.xLabel = "time (s)"; chA.opts.yLabel = "% hydrolysed"; chA.draw(ser, { xMin: 0, xMax: tm, yMin: 0, yMax: 30, hlines: [{ y: 3, color: "rgba(255,255,255,.3)", label: "cloud first seen" }] });
    chB.opts.title = "Bond enthalpy against time to cloud"; chB.opts.xLabel = "C–X bond enthalpy (kJ/mol)"; chB.opts.yLabel = "time (s, log scale)"; chB.opts.yFmt = v => K.sig(Math.pow(10, v), 2); chB.draw([{ pts: ["I", "Br", "Cl"].map(X => [BOND[X], Math.log10(pptTime(X, P.cls, T))]), type: "dots", r: 6, color: "#5ad1ff", label: "I, Br, Cl" }], { xMin: 210, xMax: 360 });
    res = ["Cl", "Br", "I"].map(X => `${X} ${K.sig(pptTime(X, P.cls, T), 2)} s`).join(", ");
  } else if (P.lab === "ox") { const pts = oxid(P.distil, 300); chB.opts.yFmt = null;
    chA.opts.title = P.distil ? "Distilling as it forms" : "Heating under reflux"; chA.opts.xLabel = "time (s)"; chA.opts.yLabel = "fraction"; const u = pts.filter(p => p[0] <= lt + 0.01);
    chA.draw([{ pts: u.map(p => [p[0], p[1]]), color: "#5ad1ff", label: "ethanol" }, { pts: u.map(p => [p[0], p[2]]), color: "#ffb454", label: "ethanal in flask" }, { pts: u.map(p => [p[0], p[3]]), color: "#ff7b9c", label: "ethanoic acid" }, { pts: u.map(p => [p[0], p[4]]), color: "#7ee787", label: "ethanal collected" }], { xMin: 0, xMax: 300, yMin: 0, yMax: 1 });
    const last = u[u.length - 1]; chB.opts.title = "Products so far"; chB.opts.xLabel = ""; chB.opts.yLabel = "%"; chB.opts.xFmt = whole(v => ["", "ethanol", "ethanal", "acid", "collected"][Math.round(v)] || ""); chB.draw([{ pts: [1, 2, 3, 4].map(i => [i, 100 * last[i]]), type: "bars", w: 0.6, color: "#c4a1ff", label: "" }], { xMin: 0.4, xMax: 4.6, yMin: 0, yMax: 100 });
    res = `${(100 * last[4]).toFixed(0)}% collected as ethanal, ${(100 * last[3]).toFixed(0)}% acid`;
  } else if (P.lab === "elim") { chB.opts.yFmt = null; const xs = []; for (let t = 293; t <= 353; t += 2) xs.push(t);
    chA.opts.title = "% alkene (elimination) against temperature"; chA.opts.xLabel = "temperature (°C)"; chA.opts.yLabel = "% alkene"; chA.draw([1, 2, 3].map(cl => ({ pts: xs.map(t => [t - 273, 100 * elimFrac(P.solvent, cl, t)]), color: ["#5ad1ff", "#ffb454", "#ff7b9c"][cl - 1], label: ["primary", "secondary", "tertiary"][cl - 1], width: cl === P.cls ? 3 : 1.4 })), { xMin: 20, xMax: 80, yMin: 0, yMax: 100, vlines: [{ x: T - 273, label: "now" }] });
    const f = elimFrac(P.solvent, P.cls, T); chB.opts.title = "Products"; chB.opts.xLabel = ""; chB.opts.yLabel = "%"; chB.opts.xFmt = whole(v => ["", "alcohol (substitution)", "alkene (elimination)"][Math.round(v)] || ""); chB.draw([{ pts: [[1, 100 * (1 - f)], [2, 100 * f]], type: "bars", w: 0.5, color: "#7ee787", label: "" }], { xMin: 0.4, xMax: 2.6, yMin: 0, yMax: 100 });
    res = `${(100 * f).toFixed(0)}% alkene in ${P.solvent === "eth" ? "ethanol" : "water"}`;
  } else { chB.opts.yFmt = null; const pts = esterRun(P.ratio, P.cat, 1500), u = pts.filter(p => p[0] <= lt * 5 + 0.01), eq = esterEq(P.ratio);
    chA.opts.title = "Ester formed (1 mol of acid)"; chA.opts.xLabel = "time (s)"; chA.opts.yLabel = "mol ester"; chA.draw([{ pts: u, color: "#7ee787", label: P.cat ? "with H₂SO₄" : "no catalyst" }], { xMin: 0, xMax: 1500, yMin: 0, yMax: 1, hlines: [{ y: eq, color: "rgba(255,209,102,.6)", label: `equilibrium ${eq.toFixed(2)} mol` }] });
    const as = []; for (let a = 0.25; a <= 6; a += 0.25) as.push([a, esterEq(a)]); chB.opts.title = "Equilibrium yield against ethanol used"; chB.opts.xLabel = "mol ethanol per mol acid"; chB.opts.yLabel = "mol ester"; chB.draw([{ pts: as, color: "#5ad1ff", label: "Kc = 4" }, { pts: [[P.ratio, eq]], type: "dots", r: 6, color: "#ffd166", label: "now" }], { xMin: 0, xMax: 6, yMin: 0, yMax: 1 });
    res = `${u[u.length - 1][1].toFixed(2)} mol ester (equilibrium ${eq.toFixed(2)})`;
  }
  read.set("a", sel ? C_[CI(sel)][1] : "–"); read.set("b", route ? `${route.length} step${route.length === 1 ? "" : "s"}` : from ? "pick a target" : "–"); read.set("c", route && route.length ? (100 * route.reduce((p, e) => p * e[5], 1)).toFixed(0) + "%" : "–"); read.set("d", res);
}
let frame = 0;
ui.onLevel = () => { sync(); };
ui.run(dt => { if (dt > 0) lt = Math.min(600, lt + dt * lspeed); }, () => { draw(); if (frame++ % 5 === 0) charts(); });
set({});
ui.tip("Click two compounds to plan a route. Click any road to see what happens, and step through its mechanism.", 7000);
