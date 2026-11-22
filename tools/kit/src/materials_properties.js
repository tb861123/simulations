/* =====================================================================
   MATERIALS: PROPERTIES AND SELECTION
   A TENSILE TEST pulls a sample until it breaks and plots
        STRESS σ = force ÷ cross-section area   (MPa = N/mm²)
        STRAIN ε = extension ÷ original length
   From the curve:
     STIFFNESS: Young's modulus E = σ ÷ ε on the straight (elastic) part
     YIELD STRENGTH: where it starts to stretch permanently (plastic)
     TENSILE STRENGTH (UTS): the highest stress it can take
     DUCTILITY: how far it stretches before breaking (% elongation)
     TOUGHNESS: energy absorbed = area under the curve
   Brittle materials (glass, acrylic, ceramics, many composites) break
   with no plastic stretch, and their strength varies a lot from sample
   to sample because it depends on the largest hidden crack.
   Designers choose materials against a BRIEF: what load, how stiff, how
   light, how cheap. A selection (Ashby) chart plots one property against
   another on log scales so families of materials can be compared, and a
   FACTOR OF SAFETY makes the part stronger than the load it should see:
        factor of safety = strength ÷ working stress
   ===================================================================== */
// ---------------- The materials (typical values; real grades vary) ----------------
// E GPa, rho kg/m³, ys yield MPa (0 = brittle), uts MPa, el elongation at break %, cost £/kg, sd = sample-to-sample scatter of strength, fam
const MAT = [
  { k: "steel", name: "Mild steel", fam: "ferrous metal", E: 210, rho: 7850, ys: 250, uts: 400, el: 25, cost: 0.8, sd: 0.04 },
  { k: "stain", name: "Stainless steel", fam: "ferrous metal", E: 193, rho: 8000, ys: 215, uts: 505, el: 40, cost: 3.5, sd: 0.04 },
  { k: "alu", name: "Aluminium 6061", fam: "non-ferrous metal", E: 69, rho: 2700, ys: 275, uts: 310, el: 12, cost: 2.8, sd: 0.04 },
  { k: "brass", name: "Brass", fam: "non-ferrous metal", E: 100, rho: 8500, ys: 200, uts: 350, el: 30, cost: 6, sd: 0.04 },
  { k: "ti", name: "Titanium alloy", fam: "non-ferrous metal", E: 114, rho: 4430, ys: 880, uts: 950, el: 14, cost: 25, sd: 0.03 },
  { k: "abs", name: "ABS", fam: "thermoplastic", E: 2.3, rho: 1050, ys: 40, uts: 44, el: 25, cost: 2.2, sd: 0.06 },
  { k: "pmma", name: "Acrylic (PMMA)", fam: "thermoplastic", E: 3.0, rho: 1180, ys: 0, uts: 70, el: 4, cost: 3, sd: 0.15 },
  { k: "hdpe", name: "HDPE", fam: "thermoplastic", E: 1.0, rho: 950, ys: 25, uts: 30, el: 300, cost: 1.6, sd: 0.06 },
  { k: "pp", name: "Polypropylene", fam: "thermoplastic", E: 1.5, rho: 905, ys: 33, uts: 35, el: 150, cost: 1.4, sd: 0.06 },
  { k: "nylon", name: "Nylon 6", fam: "thermoplastic", E: 2.8, rho: 1140, ys: 70, uts: 80, el: 50, cost: 3.2, sd: 0.06 },
  { k: "oak", name: "Oak (along grain)", fam: "hardwood", E: 12, rho: 700, ys: 0, uts: 90, el: 1.2, cost: 1.6, sd: 0.18 },
  { k: "pine", name: "Pine (along grain)", fam: "softwood", E: 9, rho: 500, ys: 0, uts: 70, el: 1.1, cost: 0.9, sd: 0.2 },
  { k: "mdf", name: "MDF", fam: "manufactured board", E: 3.5, rho: 750, ys: 0, uts: 18, el: 0.6, cost: 0.6, sd: 0.08 },
  { k: "ply", name: "Birch plywood", fam: "manufactured board", E: 8, rho: 650, ys: 0, uts: 40, el: 0.8, cost: 1.3, sd: 0.1 },
  { k: "glass", name: "Glass", fam: "ceramic", E: 70, rho: 2500, ys: 0, uts: 45, el: 0.065, cost: 1.2, sd: 0.25 },
  { k: "gfrp", name: "Glass fibre (GRP)", fam: "composite", E: 25, rho: 1900, ys: 0, uts: 300, el: 1.4, cost: 6, sd: 0.1 },
  { k: "cfrp", name: "Carbon fibre (CFRP)", fam: "composite", E: 150, rho: 1600, ys: 0, uts: 1500, el: 1.0, cost: 40, sd: 0.08 }
];
const FAMC = { "ferrous metal": "#cfd8ea", "non-ferrous metal": "#ffd166", "thermoplastic": "#5ad1ff", "hardwood": "#c8955a", "softwood": "#e6b980", "manufactured board": "#a0785a", "ceramic": "#7ee787", "composite": "#c9a0ff" };
const byK = k => MAT.find(m => m.k === k);
// Enhancement (A level): work hardening raises yield and UTS but cuts ductility; annealing does the opposite (metals only)
function treated(m, t) { if (!m.ys || t === "none") return m; const f = t === "work" ? { ys: 1.6, uts: 1.15, el: 0.4 } : { ys: 0.75, uts: 0.92, el: 1.35 }; return Object.assign({}, m, { ys: Math.min(m.ys * f.ys, m.uts * f.uts * 0.97), uts: m.uts * f.uts, el: m.el * f.el }); }
/* Stress (MPa) at strain e (as a fraction) for material m. Ductile: straight line to yield, then strain hardening up to the UTS
   at about 60% of the elongation, then necking (the stress the machine reads falls) until fracture. Brittle: straight to fracture. */
function stress(m, e, scale = 1) {
  const E = m.E * 1000, ef = m.el / 100, ey = (m.ys || m.uts) * scale / E;
  if (!m.ys) return e <= Math.min(ef, m.uts * scale / E) ? E * e : null;          // brittle: straight line until it snaps
  if (e <= ey) return E * e;
  const eu = Math.max(ey * 1.5, ef * 0.6);
  if (e <= eu) { const t = (e - ey) / (eu - ey); return m.ys * scale + (m.uts - m.ys) * scale * (1 - (1 - t) ** 2.2); }
  if (e <= ef) { const t = (e - eu) / (ef - eu); return m.uts * scale * (1 - 0.25 * t * t); }
  return null;
}
const breakStrain = (m, scale = 1) => m.ys ? m.el / 100 : Math.min(m.el / 100, m.uts * scale / (m.E * 1000));
function toughness(m, scale = 1) { const ef = breakStrain(m, scale), n = 400; let a = 0; for (let i = 0; i < n; i++) { const s = stress(m, (i + 0.5) / n * ef, scale); a += (s || 0) * ef / n; } return a; }   // MJ/m³ (MPa × strain)
// a real sample: strength scattered (brittle materials: Weibull, a few very weak samples)
const sampleScale = (m, r) => m.ys ? 1 + m.sd * r.gauss() : Math.pow(-Math.log(1 - r() * 0.9999), 1 / (1.2 / m.sd)) / Math.pow(Math.log(2), 1 / (1.2 / m.sd));
const Phi = z => { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2), p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; };

// ---------------- Design briefs: a tie (rod in tension) carrying a load ----------------
const BRIEFS = {
  shelf: { name: "Shelf bracket tie", F: 2000, L: 0.3, stretch: 0.5, note: "carries 2 kN, may stretch at most 0.5 mm" },
  bike: { name: "Bike frame tube (as a tie)", F: 5000, L: 0.6, stretch: 0.3, note: "5 kN, stiff: at most 0.3 mm stretch; light matters" },
  toy: { name: "Toy pull-cord link", F: 200, L: 0.1, stretch: 2, note: "200 N, cheap, can stretch 2 mm" }
};
/* For each material: the cross-section area needed for strength (with the factor of safety) and for stiffness, then the
   mass and cost of the part. Area for strength A = FoS × F ÷ strength; for stiffness A = F L ÷ (E × stretch). */
function design(m, b, fos) { const str = m.ys || m.uts, As = fos * b.F / str, Ak = b.F * b.L / (m.E * 1000 * b.stretch / 1000 * 1) / 1, A = Math.max(As, Ak), mass = m.rho * A * 1e-6 * b.L; return { As, Ak, A, mass, cost: mass * m.cost, gov: As >= Ak ? "strength" : "stiffness" }; }

// ---------------- The page ----------------
const DEF = { view: "test", mat: "steel", treat: "none", speed: 1, brief: "bike", fos: 2, weight: 0.5, idx: "Eρ", cvLoad: 0.15 };
const P = {};
let rnd = K.rng(Date.now() % 9973 + 3), e = 0, scale = 1, broken = false, curve = [], results = [], tt = 0;
const ui = K.app({
  title: "Materials: Properties and Selection", subject: "Design and Technology",
  blurb: "Tensile tests of seventeen materials: stiffness, strength, ductility and toughness; selection charts, design briefs and the factor of safety",
  reset: () => set({ view: P.view }),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "AQA GCSE Design and Technology (8552) 3.1.6 Materials and their working properties (strength, hardness, toughness, malleability, ductility, elasticity); 3.2.2 Forces and stresses; the categories of materials (ferrous and non-ferrous metals, polymers, timbers, manufactured boards, composites).", adv: "AQA A level Design and Technology: Product Design (7552) 3.1.1 Materials and their applications; 3.1.2 Performance characteristics of materials (tensile strength, stiffness, toughness, ductility, elasticity and plasticity); 3.1.3 Enhancement of materials (work hardening, annealing); mathematical skills: stress, strain, Young's modulus, factor of safety, interpreting graphs. Ashby charts and Weibull scatter are beyond the spec." } },
  missions: [
    { title: "Pull a steel bar", q: "Watch mild steel's tensile test. Where does it stop springing back and start stretching permanently? Where is it strongest?", hint: "The straight line is elastic (it would spring back). At the yield point (about 250 MPa) it starts to stretch plastically. The peak is the UTS (400 MPa); then it necks and breaks at about 25% strain: very ductile.", setup() { set({ mat: "steel" }); } },
    { title: "Brittle against ductile", q: "Test acrylic, then HDPE. Which stretches further? Which absorbs more energy before breaking?", hint: "Acrylic snaps at about 4% strain with no warning: brittle. HDPE yields and draws out to hundreds of %: ductile and tough (the area under its curve is far larger), though much weaker.", setup() { set({ mat: "pmma" }); } },
    { title: "Stiff is not strong", q: "Compare glass and nylon. Which is stiffer (steeper line)? Which is stronger?", hint: "Glass is 25 times stiffer (E = 70 GPa against 2.8) but breaks at a similar stress, suddenly. Stiffness, strength and toughness are different properties.", setup() { set({ mat: "glass" }); } },
    { title: "Every sample is different", q: "Test 20 samples of pine, then 20 of aluminium. Which gives more consistent strengths? Why?", hint: "Metals vary by a few per cent. Timber varies by ±20% or more (knots, grain, moisture): designers use a bigger factor of safety for wood.", setup() { set({ mat: "pine" }); } },
    { title: "Choose for the brief", q: "Open the selection view with the bike tube brief. Which material gives the lightest tube? Which the cheapest?", hint: "Lightest by far: carbon fibre (about 64 g). Steel, aluminium and titanium all come out about the same mass (about 230 g), because stiffness, not strength, sets the size and their E/ρ is almost equal; steel is cheapest. Real aluminium frames win by using fatter, thinner-walled tubes, which are stiffer in bending.", setup() { set({ view: "select", brief: "bike" }); } },
    { lvl: "adv", title: "Work hardening and annealing", q: "Test mild steel as supplied, then work hardened, then annealed. What changes?", hint: "Work hardening (e.g. cold rolling) raises yield strength a lot but cuts ductility: harder to form. Annealing (heat, slow cool) restores ductility so the metal can be bent or pressed again. Stiffness E doesn't change.", setup() { set({ mat: "steel", treat: "work" }); } },
    { lvl: "adv", title: "Factor of safety", q: "In the selection view, change the factor of safety from 1.5 to 4. How does the part change?", hint: "Area for strength ∝ FoS, so mass and cost rise in proportion where strength governs. Where stiffness governs, the FoS makes no difference until strength takes over.", setup() { set({ view: "select", brief: "shelf", fos: 1.5 }); } },
    { lvl: "adv", title: "Specific stiffness", q: "On the selection chart, which materials lie above the line E/ρ = 26 (steel's)? What does that line mean?", hint: "Materials on the same line give equally light parts for a stiff tie. Steel, aluminium and titanium all have E/ρ ≈ 26 MN m/kg: aluminium is not 'stiffer for its weight'. Only carbon fibre lies well above.", setup() { set({ view: "select", idx: "Eρ" }); } }
  ],
  batch: [
    { title: "Twenty steel samples", question: "If 20 samples of mild steel are tested, how much does the tensile strength vary?", how: "Strength scatter ±4% (SD), as for a typical steel bar.", yLabel: "UTS (MPa)", reps: 200, bins: 20, theory: 400, theoryLabel: "data-book UTS", run: (x, r) => 400 * sampleScale(byK("steel"), r), note: "A narrow bell curve: metals are consistent, so a modest factor of safety is enough." },
    { title: "Twenty glass samples", question: "How does the strength of glass samples vary?", how: "Brittle: each sample's strength depends on its largest flaw (a Weibull distribution).", yLabel: "strength (MPa)", reps: 200, bins: 20, theory: 45, theoryLabel: "typical (median)", run: (x, r) => 45 * sampleScale(byK("glass"), r), note: "Lopsided, with a long tail of weak samples: a few hidden cracks make some pieces fail at half the typical strength. Brittle materials need large factors of safety, or tempering/lamination." },
    { title: "Factor of safety and failure (A level)", question: "If loads vary ±15% and strengths ±8%, what fraction of parts fail at each factor of safety?", how: "1,000 parts per run; a part fails if its strength is below the load it meets.", xLabel: "factor of safety", yLabel: "parts that fail (%)", xs: [1, 1.1, 1.2, 1.3, 1.5, 1.75, 2], reps: 6, yMin: 0, theory: f => 100 * Phi(-(f - 1) / Math.sqrt(0.15 ** 2 + (0.08 * f) ** 2)), theoryLabel: "Φ(−(FoS − 1)/√(σL² + σS²))", run: (f, r) => { let n = 0; for (let i = 0; i < 1000; i++) if (f * (1 + 0.08 * r.gauss()) < 1 + 0.15 * r.gauss()) n++; return n / 10; }, note: "With FoS = 1, half the parts fail; by 1.5 almost none do. Uncertainty in loads and materials is the reason for a factor of safety, so the right FoS depends on how uncertain they are." },
    { title: "Stiffness: measuring E from the graph", question: "If students find E from the slope of 5 elastic readings, how close do they get for aluminium?", how: "Extension readings ±2% noise; true E = 69 GPa.", yLabel: "E measured (GPa)", reps: 200, bins: 20, theory: 69, theoryLabel: "true E", run: (x, r) => { const pts = []; for (let i = 1; i <= 5; i++) { const s = i * 40; pts.push([s / 69000 * (1 + 0.02 * r.gauss()), s]); } return K.linfit(pts).m / 1000; }, note: "Within a few per cent: a best-fit line through several readings averages out the noise." },
    { title: "The lightest bike tube (A level)", question: "How heavy is the bike tube in each material?", how: "Material 1 mild steel, 2 aluminium, 3 titanium, 4 CFRP, 5 GRP, 6 oak; FoS 2; mass from the larger of the strength and stiffness areas; each sample's strength scattered.", xLabel: "material (1 steel … 6 oak)", yLabel: "mass (g)", xs: [1, 2, 3, 4, 5, 6], reps: 6, yMin: 0, theory: i => 1000 * design(byK(["steel", "alu", "ti", "cfrp", "gfrp", "oak"][i - 1]), BRIEFS.bike, 2).mass, theoryLabel: "data-book design", run: (i, r) => { const m = byK(["steel", "alu", "ti", "cfrp", "gfrp", "oak"][i - 1]), s = sampleScale(m, r), mm = Object.assign({}, m, { ys: m.ys * s, uts: m.uts * s }); return 1000 * design(mm, BRIEFS.bike, 2).mass; }, note: "Steel, aluminium and titanium come out almost the same: here stiffness sets the size, and their E/ρ is nearly equal. Carbon fibre wins. Scatter only matters where strength sets the size." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "8552 3.1.6", text: "Strength: resists a force without breaking. Toughness: absorbs energy without breaking (opposite of brittle). Ductility: can be drawn out (wire). Malleability: can be hammered or pressed into shape. Elasticity: returns to shape. Hardness: resists scratching and wear." },
      { lvl: "std", tag: "8552 3.2.2", text: "Forces: tension (pulling), compression (squashing), bending, shear, torsion. Materials are chosen for the forces they will meet." },
      { lvl: "std", tag: "8552 3.1.6", text: "Categories: ferrous metals (contain iron, mostly magnetic, rust: mild steel), non-ferrous (aluminium, brass, copper), thermoplastics (re-formable: ABS, acrylic, HDPE), thermosets, hardwoods, softwoods, manufactured boards, composites (GRP, CFRP)." },
      { lvl: "adv", tag: "7552 3.1.2", text: "Stress = F/A (N/mm² = MPa); strain = ΔL/L; Young's modulus E = stress/strain in the elastic region (stiffness). Yield strength, UTS and elongation at break come from the stress–strain graph; toughness is the area under it." },
      { lvl: "adv", tag: "7552 3.1.3", text: "Enhancement: work hardening raises strength and hardness but lowers ductility; annealing restores ductility; case hardening, tempering and hardening for steels; additives and fillers for polymers; laminating and treating timbers." },
      { lvl: "adv", tag: "7552 3.1.1", text: "Factor of safety = failure stress ÷ working stress. Larger where loads or materials are uncertain (timber, brittle materials) or failure is dangerous." },
      { lvl: "beyond", tag: "Beyond", text: "Ashby charts plot two properties on log scales. For a light, stiff tie choose high E/ρ; for a light, stiff beam high E^½/ρ. Brittle strengths follow a Weibull distribution." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: "Explain why acrylic is not suitable for a child's swing seat.", ans: "<ul><li>Acrylic is brittle / not tough (1)</li><li>so it could crack suddenly under the impact of a child landing, giving sharp edges (1).</li></ul>" },
      { lvl: "adv", marks: 3, q: () => `A ${byK(P.mat).name.toLowerCase()} rod of cross-section 20 mm² carries a load of 1.5 kN. Calculate the stress and the factor of safety against ${byK(P.mat).ys ? "yield" : "fracture"}.`, ans: () => { const m = treated(byK(P.mat), P.treat), s = 1500 / 20, str = m.ys || m.uts; return `<ul><li>σ = F/A = 1500 ÷ 20 = ${s} N/mm² (MPa) (1)</li><li>FoS = ${str.toFixed(0)} ÷ ${s} (1)</li><li>= ${(str / s).toFixed(2)} (1)${str / s < 1 ? ": it would fail" : ""}</li></ul>`; } },
      { lvl: "adv", marks: 2, q: "In a tensile test, a stress of 120 MPa gives a strain of 0.0017. Calculate Young's modulus.", ans: "<ul><li>E = σ/ε = 120 ÷ 0.0017 (1)</li><li>= 70,600 MPa ≈ 71 GPa (aluminium) (1)</li></ul>" },
      { lvl: "adv", marks: 9, q: "A designer is choosing between aluminium and carbon fibre for a bicycle frame. Evaluate the choice.", ans: "<ul><li>Properties: CFRP higher specific stiffness and strength (lighter frame); aluminium ductile, tough, dents rather than cracks, recyclable.</li><li>Manufacture: aluminium tubes welded/hydroformed, cheaper; CFRP laid up in moulds, labour intensive.</li><li>Cost and market: CFRP for racing, aluminium for mid-range; sustainability and repair; justified conclusion.</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li>Typical data for 17 materials (E, density, yield strength, UTS, elongation, cost per kg). Ductile curves: straight to yield, strain hardening to the UTS, then necking until fracture. Brittle materials (no yield): almost straight to fracture. Timber values are along the grain.</li>
<li>Each test sample's strength is scattered: metals and polymers by a normal distribution (a few %), brittle materials by a Weibull distribution (a long tail of weak samples).</li>
<li>Enhancement (metals): work hardening ×1.6 yield, ×1.15 UTS, ×0.4 elongation; annealing ×0.75, ×0.92, ×1.35. E is unchanged.</li>
<li>Design brief: a tie of length L carrying force F with at most a given stretch. Area for strength = FoS × F ÷ (yield, or UTS if brittle); for stiffness = F L ÷ (E × stretch). The larger area is used; mass = ρ A L, cost = mass × £/kg.</li></ul>
<h3>Assumptions and simplifications</h3>
<ul><li>Typical values only: real grades, heat treatments, moisture (wood) and temperature (polymers) change them a lot.</li><li>Polymers are treated as if they don't creep; composites and wood as if loaded along the fibres.</li><li>Only tension is modelled; bending, buckling, fatigue and impact are not.</li><li>Costs are rough raw-material prices, not the cost of making the part.</li></ul>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("What to look at");
ctl.view = K.seg(g, { value: "test", options: [["test", "Tensile test"], ["select", "Selection and design"]], on: v => { P.view = v; showGroups(); } });
const gT = ui.group("Tensile test");
const fams = [...new Set(MAT.map(m => m.fam))];
ctl.mat = K.seg(gT, { value: "steel", options: MAT.map(m => [m.k, m.name.replace(" (along grain)", "")]), on: v => { P.mat = v; restart(); } });
ctl.treat = K.seg(gT, { label: "Enhancement (metals, A level)", value: "none", options: [["none", "as supplied"], ["work", "work hardened"], ["anneal", "annealed"]], on: v => { P.treat = v; restart(); } });
ctl.speed = K.slider(gT, { label: "Test speed", min: 0.25, max: 4, step: 0.25, value: 1, fmt: v => v + "×", on: v => P.speed = v });
ui.headerSpeed(ctl.speed);   // playback speed lives in the header, beside Pause and Reset
let rr = K.row(gT); K.btn(rr, "↺ New sample", () => restart(), "primary"); K.btn(rr, "Test 20 samples", () => { for (let i = 0; i < 20; i++) { const m = treated(byK(P.mat), P.treat), s = sampleScale(m, rnd); results.push([P.mat, P.treat, m.uts * s]); } });
K.btn(rr, "Clear results", () => results = []);
const gS = ui.group("Design brief: a tie in tension");
ctl.brief = K.seg(gS, { value: "bike", options: Object.entries(BRIEFS).map(([k, b]) => [k, b.name]), on: v => P.brief = v });
ctl.fos = K.slider(gS, { label: "Factor of safety", min: 1, max: 5, step: 0.1, value: 2, fmt: v => v.toFixed(1), on: v => P.fos = v });
ctl.weight = K.slider(gS, { label: "Rank by: cost ← → mass", min: 0, max: 1, step: 0.05, value: 0.5, fmt: v => v < 0.2 ? "cost" : v > 0.8 ? "mass" : "both", on: v => P.weight = v });
ctl.idx = K.seg(gS, { label: "Selection chart (A level)", value: "Eρ", options: [["Eρ", "E against density"], ["Sρ", "strength against density"], ["Ec", "E against cost"]], on: v => P.idx = v });
const read = K.readout(ui.group("Readings"), [["E", "Young's modulus E"], ["ys", "yield strength"], ["uts", "tensile strength (this sample)"], ["el", "elongation at break"], ["tough", "toughness (area)"], ["now", "stress / strain now"], ["best", "best for the brief"]]);
function showGroups() { const s = P.view === "select"; gT.style.display = s ? "none" : ""; gS.style.display = s ? "" : "none"; }
function restart() { const m = treated(byK(P.mat), P.treat); scale = sampleScale(m, rnd); e = 0; broken = false; curve = []; }
function set(o) { Object.assign(P, DEF, o); for (const k of ["view", "mat", "treat", "speed", "brief", "fos", "weight", "idx"]) ctl[k].set(P[k]); results = []; restart(); showGroups(); }
// ---------------- Simulation: the machine stretches the sample ----------------
function tick(dt) {
  if (P.view !== "test") return; const m = treated(byK(P.mat), P.treat), ef = breakStrain(m, scale);
  if (broken) { tt += dt; if (tt > 2.5 / P.speed) { tt = 0; results.push([P.mat, P.treat, Math.max(...curve.map(c => c[1]))]); restart(); } return; }
  e += dt * P.speed * ef / 5; const s = stress(m, e, scale);   // a whole test takes about 5 s at 1×
  if (s == null || e >= ef) { broken = true; tt = 0; return; }
  curve.push([e, s]);
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const nice = v => { const p = Math.pow(10, Math.floor(Math.log10(v))), q = v / p; return (q < 1.5 ? 1 : q < 3.5 ? 2 : q < 7.5 ? 5 : 10) * p; };
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function drawTest(c, w, h) {
  const m = treated(byK(P.mat), P.treat), ef = breakStrain(m, scale), sNow = curve.length ? curve[curve.length - 1][1] : 0;
  TX(c, `Tensile test: ${m.name}${P.treat !== "none" && m.ys ? (P.treat === "work" ? " (work hardened)" : " (annealed)") : ""}`, 20, 30, "#eef2f8", "left", "600 15px");
  // the machine and the dog-bone sample
  const mx = 40, mw = w * 0.3, top = 70, L0 = h * 0.42, ext = Math.min(1, e / Math.max(ef, 0.02)) * L0 * Math.min(1, ef * 2.2 + 0.02), cxm = mx + mw / 2;
  c.fillStyle = "#2b3a5c"; c.fillRect(mx, top - 20, mw, 24); c.fillRect(mx, top + L0 + ext + 40, mw, 24); c.fillStyle = "#3a4a6b"; c.fillRect(mx + 6, top - 20, 14, L0 + ext + 84); c.fillRect(mx + mw - 20, top - 20, 14, L0 + ext + 84);
  const gw = 46, sw = 22 * (1 - (m.ys && e > ef * 0.6 ? 0.45 * ((e - ef * 0.6) / (ef * 0.4)) ** 1.5 : 0)), col = FAMC[m.fam];
  c.fillStyle = "#55627f"; c.fillRect(cxm - gw / 2 - 6, top + 4, gw + 12, 30); c.fillRect(cxm - gw / 2 - 6, top + L0 + ext + 6, gw + 12, 30);
  c.fillStyle = col; c.fillRect(cxm - gw / 2, top + 10, gw, 26); c.fillRect(cxm - gw / 2, top + L0 + ext + 4, gw, 26);
  const yA = top + 36, yB = top + L0 + ext + 4, neckY = (yA + yB) / 2;
  c.beginPath(); c.moveTo(cxm - 11, yA); c.lineTo(cxm - 11, neckY - 30); c.quadraticCurveTo(cxm - sw / 2, neckY, cxm - 11, neckY + 30); c.lineTo(cxm - 11, yB); c.lineTo(cxm + 11, yB); c.lineTo(cxm + 11, neckY + 30); c.quadraticCurveTo(cxm + sw / 2, neckY, cxm + 11, neckY - 30); c.lineTo(cxm + 11, yA); c.closePath(); c.fill();
  if (broken) { c.fillStyle = "#0b1020"; c.fillRect(cxm - 20, neckY - 3, 40, 6); TX(c, m.ys ? "necked and broke" : "snapped!", cxm, neckY + 26, "#ff8a70", "center", "600 13px"); }
  TX(c, `F = ${(sNow * 20 / 1000).toFixed(2)} kN on 20 mm²`, cxm, top + L0 + ext + 90, "#cfd8ea", "center", "12px");
  // the stress–strain curve
  const L = mx + mw + 80, R = w - 30, T = 70, B = h - 50, emax = Math.max(ef * 1.08, 0.002), smax = Math.max(m.uts * 1.3, 10) * Math.max(1, scale);
  const X = x => L + x / emax * (R - L), Y = y => B - y / smax * (B - T);
  const st = nice(smax / 5); c.strokeStyle = "#2a3550"; for (let v = 0; v <= smax; v += st) { c.beginPath(); c.moveTo(L, Y(v)); c.lineTo(R, Y(v)); c.stroke(); TX(c, v.toFixed(0), L - 6, Y(v) + 4, "#8fa0bf", "right", "11px"); }
  for (let i = 0; i <= 5; i++) TX(c, (100 * emax * i / 5).toPrecision(2) + "%", X(emax * i / 5), B + 16, "#8fa0bf", "center", "11px");
  c.strokeStyle = "#cfd8ea"; c.strokeRect(L, T, R - L, B - T); TX(c, "stress (MPa)", L, T - 8, "#8fa0bf", "left", "11.5px"); TX(c, "strain", R, B + 32, "#8fa0bf", "right", "11.5px");
  // the area under the curve (toughness) and the curve itself
  if (curve.length > 1) { c.fillStyle = "rgba(201,160,255,0.18)"; c.beginPath(); c.moveTo(X(0), Y(0)); curve.forEach(([a, b]) => c.lineTo(X(a), Y(b))); c.lineTo(X(curve[curve.length - 1][0]), Y(0)); c.fill(); c.strokeStyle = col; c.lineWidth = 2.6; c.beginPath(); curve.forEach(([a, b], i) => i ? c.lineTo(X(a), Y(b)) : c.moveTo(X(a), Y(b))); c.stroke(); c.lineWidth = 1; }
  if (m.ys) { c.strokeStyle = "#ffd166"; c.setLineDash([4, 3]); c.beginPath(); c.moveTo(L, Y(m.ys * scale)); c.lineTo(R, Y(m.ys * scale)); c.stroke(); c.setLineDash([]); TX(c, "yield", R - 4, Y(m.ys * scale) - 5, "#ffd166", "right", "11.5px"); }
  c.strokeStyle = "#ff8a70"; c.setLineDash([4, 3]); c.beginPath(); c.moveTo(L, Y(m.uts * scale)); c.lineTo(R, Y(m.uts * scale)); c.stroke(); c.setLineDash([]); TX(c, "UTS (this sample)", R - 4, Y(m.uts * scale) - 5, "#ff8a70", "right", "11.5px");
  // inset: a close-up of the elastic part (it is too steep to see at full scale for metals)
  const e2 = 2.2 * (m.ys || m.uts) * scale / (m.E * 1000);
  if (m.ys && e2 < emax * 0.2) { const iw = 200, ih = 130, ix = R - iw - 12, iy = B - ih - 12, Xi = x => ix + x / e2 * iw, Yi = y => iy + ih - y / smax * ih; c.fillStyle = "#0e1528"; c.fillRect(ix, iy, iw, ih); c.strokeStyle = "#55627f"; c.strokeRect(ix, iy, iw, ih); c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); curve.filter(p => p[0] <= e2).forEach(([a2, b2], i) => i ? c.lineTo(Xi(a2), Yi(b2)) : c.moveTo(Xi(a2), Yi(b2))); c.stroke(); c.lineWidth = 1; TX(c, `close-up to ${(100 * e2).toPrecision(2)}% strain: elastic line, slope E = ${m.E} GPa`, ix + 4, iy + 14, "#8fa0bf", "left", "10.5px"); }
  else TX(c, "elastic: straight line, slope = E", X(Math.min(ef, (m.ys || m.uts) / (m.E * 1000)) * 0.4) + 8, Y((m.ys || m.uts) * 0.3), "#8fa0bf", "left", "11px");
}
const R0 = w => w * 0.5;
function drawSelect(c, w, h) {
  const b = BRIEFS[P.brief], adv = ui.level === "adv";
  TX(c, `Design brief: ${b.name}: ${b.note}`, 20, 30, "#eef2f8", "left", "600 14px");
  TX(c, "area needed = the larger of FoS × F ÷ strength and F L ÷ (E × stretch);  mass = ρ A L", R0(w) + 30, 76, "#8fa0bf", "left", "11.5px");
  // the selection (Ashby-style) chart, log–log
  const L = 70, R = w * 0.5, T = 60, B = h - 50, xs = P.idx === "Ec" ? [0.3, 100] : [300, 10000], ys = P.idx === "Sρ" ? [5, 3000] : [0.3, 400];
  const X = v => L + Math.log10(v / xs[0]) / Math.log10(xs[1] / xs[0]) * (R - L), Y = v => B - Math.log10(v / ys[0]) / Math.log10(ys[1] / ys[0]) * (B - T);
  c.strokeStyle = "#2a3550"; [0.1, 1, 10, 100, 1000, 10000].forEach(v => { if (v >= xs[0] && v <= xs[1]) { c.beginPath(); c.moveTo(X(v), T); c.lineTo(X(v), B); c.stroke(); TX(c, v, X(v), B + 15, "#8fa0bf", "center", "11px"); } if (v >= ys[0] && v <= ys[1]) { c.beginPath(); c.moveTo(L, Y(v)); c.lineTo(R, Y(v)); c.stroke(); TX(c, v, L - 6, Y(v) + 4, "#8fa0bf", "right", "11px"); } });
  c.strokeStyle = "#cfd8ea"; c.strokeRect(L, T, R - L, B - T);
  TX(c, P.idx === "Ec" ? "cost (£/kg)" : "density (kg/m³)", (L + R) / 2, B + 32, "#8fa0bf", "center", "11.5px"); TX(c, P.idx === "Sρ" ? "strength (MPa)" : "Young's modulus E (GPa)", L, T - 8, "#8fa0bf", "left", "11.5px");
  if (P.idx !== "Ec") { const ref = P.idx === "Eρ" ? 210 / 7850 : 250 / 7850; c.strokeStyle = "#ffd166"; c.setLineDash([6, 4]); c.beginPath(); c.moveTo(X(xs[0]), Y(ref * xs[0])); c.lineTo(X(xs[1]), Y(ref * xs[1])); c.stroke(); c.setLineDash([]); TX(c, P.idx === "Eρ" ? "same E/ρ as steel" : "same strength/ρ as steel", X(400), Y(ref * 400) - 8, "#ffd166", "left", "11px"); }
  MAT.forEach(m => { const xv = P.idx === "Ec" ? m.cost : m.rho, yv = P.idx === "Sρ" ? (m.ys || m.uts) : m.E; c.fillStyle = FAMC[m.fam]; c.beginPath(); c.arc(X(xv), Y(yv), 6, 0, 6.3); c.fill(); TX(c, m.name.replace(" (along grain)", "").replace(" (PMMA)", ""), X(xv) + 8, Y(yv) + 4, "#cfd8ea", "left", "10.5px"); });
  // the design table: area needed, mass, cost; ranked
  const rows = MAT.map(m => ({ m, d: design(m, b, P.fos) })); const mn = Math.min(...rows.map(r => r.d.mass)), cn = Math.min(...rows.map(r => r.d.cost));
  rows.forEach(r => r.score = P.weight * Math.log(r.d.mass / mn) + (1 - P.weight) * Math.log(r.d.cost / cn)); rows.sort((a, b) => a.score - b.score);
  const tx = R + 30; let y = 100; TX(c, "material", tx, y, "#8fa0bf", "left", "11.5px"); TX(c, "area mm²", tx + 190, y, "#8fa0bf", "right", "11.5px"); TX(c, "set by", tx + 250, y, "#8fa0bf", "right", "11.5px"); TX(c, "mass", tx + 320, y, "#8fa0bf", "right", "11.5px"); TX(c, "cost", tx + 380, y, "#8fa0bf", "right", "11.5px");
  const rh = Math.min(19, (h - 120) / MAT.length);
  rows.forEach((r, i) => { y = 100 + (i + 1) * rh; if (i === 0) { c.fillStyle = "rgba(126,231,135,0.15)"; c.fillRect(tx - 4, y - rh + 5, 390, rh); } c.fillStyle = FAMC[r.m.fam]; c.fillRect(tx, y - 9, 8, 8); TX(c, r.m.name.replace(" (along grain)", ""), tx + 14, y, "#cfd8ea", "left", "11.5px"); TX(c, r.d.A.toFixed(r.d.A < 10 ? 1 : 0), tx + 190, y, "#cfd8ea", "right", "11.5px"); TX(c, r.d.gov, tx + 250, y, r.d.gov === "stiffness" ? "#5ad1ff" : "#ffd166", "right", "11px"); TX(c, (r.d.mass * 1000).toFixed(r.d.mass < 0.01 ? 1 : 0) + " g", tx + 320, y, "#cfd8ea", "right", "11.5px"); TX(c, "£" + r.d.cost.toFixed(r.d.cost < 0.1 ? 3 : 2), tx + 380, y, "#cfd8ea", "right", "11.5px"); });
}
function draw() { const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); if (P.view === "select") drawSelect(c, w, h); else drawTest(c, w, h); }

// ---------------- Charts and readings ----------------
function charts() {
  const m = treated(byK(P.mat), P.treat);
  chA.opts.title = "Compare materials: stress–strain (typical)"; chA.opts.xLabel = "strain (%)"; chA.opts.yLabel = "stress (MPa)";
  const same = MAT.filter(x => x.fam === byK(P.mat).fam || x.k === "steel" || x.k === "pmma").slice(0, 5);
  chA.draw(same.map(x => { const tx = x.k === P.mat ? m : x, ef = breakStrain(tx), pts = []; for (let i = 0; i <= 80; i++) { const s = stress(tx, ef * i / 80); if (s != null) pts.push([100 * ef * i / 80, s]); } return { pts, color: FAMC[x.fam], label: x.name.split(" ")[0], width: x.k === P.mat ? 3 : 1.5, dash: x.k === P.mat ? [] : [4, 3] }; }), { xMin: 0, xMax: Math.min(60, 100 * breakStrain(m) * 1.5 + 0.5), yMin: 0 });
  chB.opts.title = "Tensile strengths of the samples tested"; chB.opts.xLabel = "UTS (MPa)"; chB.opts.yLabel = "samples";
  const mine = results.filter(rw => rw[0] === P.mat && rw[1] === P.treat).map(rw => rw[2]);
  if (mine.length) { const hg = K.histogram(mine, 12); chB.draw([{ pts: hg.pts, w: hg.w, type: "bars", color: FAMC[m.fam], alpha: .8, label: `${mine.length} samples: mean ${K.mean(mine).toFixed(0)}, SD ${K.sd(mine).toFixed(1)}` }], { vlines: [{ x: m.uts, color: "#ff8a70", label: "data book" }] }); } else chB.draw([], { title: "Press 'Test 20 samples'" });
  const b = BRIEFS[P.brief], best = MAT.map(x => ({ x, d: design(x, b, P.fos) })); const mn = Math.min(...best.map(r => r.d.mass)), cn = Math.min(...best.map(r => r.d.cost)); best.sort((p, q) => (P.weight * Math.log(p.d.mass / mn) + (1 - P.weight) * Math.log(p.d.cost / cn)) - (P.weight * Math.log(q.d.mass / mn) + (1 - P.weight) * Math.log(q.d.cost / cn)));
  const sNow = curve.length ? curve[curve.length - 1][1] : 0;
  read.set("E", m.E + " GPa"); read.set("ys", m.ys ? m.ys.toFixed(0) + " MPa" : "none: brittle"); read.set("uts", (m.uts * scale).toFixed(0) + " MPa (book " + m.uts.toFixed(0) + ")"); read.set("el", m.el >= 1 ? m.el.toFixed(0) + "%" : m.el.toFixed(2) + "%");
  read.set("tough", toughness(m, scale).toPrecision(3) + " MJ/m³"); read.set("now", `${sNow.toFixed(0)} MPa / ${(100 * e).toPrecision(3)}%`); read.set("best", `${best[0].x.name.replace(" (along grain)", "")} (${(best[0].d.mass * 1000).toFixed(0)} g, £${best[0].d.cost.toFixed(2)})`);
  ui.hud(P.view === "select" ? "" : "σ = F/A · ε = ΔL/L · E = σ/ε");
}
let frame = 0;
ui.run(dt => tick(dt), () => { draw(); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("The machine pulls the sample until it breaks. Watch the stress–strain curve draw itself.", 7000);
