/* =====================================================================
   CHROMATOGRAPHY
   Paper chromatography separates the dyes in a mixture. A spot of the
   mixture sits on a pencil baseline; the solvent soaks up the paper
   (the MOBILE phase) and carries each dye along. Dyes that are more
   soluble in the solvent, and stick less to the paper (the STATIONARY
   phase), travel further.
        Rf = distance moved by the substance ÷ distance moved by the solvent
   Each substance has its own Rf in a given solvent, so we can identify
   it by comparing with references on the same paper. A pure substance
   gives one spot; a mixture gives two or more.
   The solvent front rises fast at first, then more slowly: h = √(k t).
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
const SOLVENTS = [{ k: "water", name: "water", kW: 3.0 }, { k: "salt", name: "salt water (1% NaCl)", kW: 2.8 }, { k: "eth", name: "ethanol", kW: 1.6 }, { k: "prop", name: "propanone / petroleum ether (leaf pigments)", kW: 5.0 }, { k: "baw", name: "butanol / ethanoic acid / water (amino acids)", kW: 0.7 }];
// dyes and other substances: colour and Rf in each solvent (typical school values)
const DYES = [
  { k: "E102", name: "Tartrazine (E102)", col: "#f2d21c", rf: [0.62, 0.70, 0.08, 0, 0.20] }, { k: "E110", name: "Sunset yellow (E110)", col: "#f5891e", rf: [0.48, 0.56, 0.10, 0, 0.30] },
  { k: "E129", name: "Allura red (E129)", col: "#d6262c", rf: [0.38, 0.44, 0.12, 0, 0.35] }, { k: "E124", name: "Ponceau 4R (E124)", col: "#e8304a", rf: [0.55, 0.62, 0.06, 0, 0.15] },
  { k: "E133", name: "Brilliant blue (E133)", col: "#2a5ad8", rf: [0.90, 0.93, 0.35, 0.02, 0.45] }, { k: "E132", name: "Indigo carmine (E132)", col: "#2c2f9a", rf: [0.27, 0.33, 0.05, 0, 0.12] },
  { k: "E122", name: "Carmoisine (E122)", col: "#b8204f", rf: [0.20, 0.26, 0.15, 0, 0.40] }, { k: "E142", name: "Green S (E142)", col: "#1f9a5a", rf: [0.78, 0.82, 0.10, 0, 0.28] },
  { k: "sudan", name: "Sudan black (permanent marker)", col: "#2a2a30", rf: [0, 0, 0.82, 0.70, 0.88] }, { k: "car", name: "β-carotene", col: "#f08a1a", rf: [0, 0, 0.95, 0.95, 0.95] },
  { k: "xan", name: "Xanthophyll", col: "#e6d040", rf: [0, 0, 0.80, 0.71, 0.90] }, { k: "chla", name: "Chlorophyll a", col: "#2f8f5f", rf: [0, 0, 0.70, 0.60, 0.85] },
  { k: "chlb", name: "Chlorophyll b", col: "#7aa83a", rf: [0, 0, 0.62, 0.50, 0.80] }, { k: "gly", name: "Glycine", col: "#7b3fa0", clear: true, rf: [0.85, 0.85, 0.05, 0, 0.26] },
  { k: "ala", name: "Alanine", col: "#7b3fa0", clear: true, rf: [0.86, 0.86, 0.08, 0, 0.38] }, { k: "val", name: "Valine", col: "#7b3fa0", clear: true, rf: [0.88, 0.88, 0.12, 0, 0.60] },
  { k: "leu", name: "Leucine", col: "#7b3fa0", clear: true, rf: [0.90, 0.90, 0.20, 0, 0.73] }, { k: "lys", name: "Lysine", col: "#7b3fa0", clear: true, rf: [0.70, 0.70, 0.01, 0, 0.14] }
];
const DY = k => DYES.find(d => d.k === k);
const SAMPLES = [{ name: "(empty lane)", d: [] }, { name: "Black felt-tip ink", d: ["E102", "E129", "E133"] }, { name: "Green food colouring", d: ["E102", "E133"] }, { name: "Unknown mixture X", d: ["E110", "E142", "E122", "E132"] }, { name: "Orange sweet coating", d: ["E110", "E129"] }, { name: "Purple sweet coating", d: ["E122", "E133"] }, { name: "Red food colouring", d: ["E124"] }, { name: "Permanent marker", d: ["sudan"] }, { name: "Spinach leaf extract", d: ["car", "xan", "chla", "chlb"] }, { name: "Amino acid mixture", d: ["gly", "ala", "leu"] }, { name: "Unknown amino acid", d: ["val"] }].concat(DYES.map(D => ({ name: "Pure " + D.name, d: [D.k] })));
const SI = n => SAMPLES.findIndex(s => s.name === n);
const B = 1;                                                                     // the baseline is 1 cm above the solvent surface
// height of the solvent front above the solvent surface after t minutes; without a lid evaporation slows it (dh/dt = k/2h − 0.15)
function frontH(k, t, lid = true) { if (lid) return Math.sqrt(k * t); let h = 0.05, s = 0; const dt = 0.05; while (s < t) { h += Math.max(0, k / (2 * h) - 0.15) * dt; s += dt; } return h; }
// a spot: centre and blur (σ, cm) after moving; σ² = (spot diameter/4)² + 0.002 × distance + 2 × 0.0002 × time
const sigma = (diam, dist, t) => Math.sqrt((diam / 4) ** 2 + 0.002 * dist + 0.0004 * t);
// resolution of two spots: Rs = gap ÷ 2(σ₁ + σ₂); Rs ≥ 1 looks separate
const resolution = (rf1, rf2, F, diam, t) => Math.abs(rf1 - rf2) * F / (2 * (sigma(diam, rf1 * F, t) + sigma(diam, rf2 * F, t)));
// a student measures Rf with a ruler: each distance read with an error (SD in cm) and rounded to the nearest mm; judging the centre of a fuzzy spot adds a little
function measureRf(rf, F, diam, err, r) { const s = sigma(diam, rf * F, 30), d = Math.round((rf * F + err * r.gauss() + 0.3 * s * r.gauss()) * 10) / 10, f = Math.round((F + err * r.gauss()) * 10) / 10; return d / f; }
// thin-layer chromatography (A level): painkillers on silica with an eluent of polarity p (0 = hexane … 1 = ethyl ethanoate)
const TLC = [{ k: "asp", name: "aspirin", rf: p => 0.08 + 0.55 * p }, { k: "par", name: "paracetamol", rf: p => 0.03 + 0.32 * p }, { k: "caf", name: "caffeine", rf: p => 0.01 + 0.18 * p }, { k: "ibu", name: "ibuprofen", rf: p => 0.15 + 0.7 * p }, { k: "sal", name: "salicylic acid (aspirin breaking down)", rf: p => 0.05 + 0.45 * p }];
const TABLETS = { "Aspirin tablet": ["asp"], "Paracetamol tablet": ["par"], "Extra-strength tablet": ["par", "caf", "asp"], "Old aspirin (impure)": ["asp", "sal"], "Ibuprofen tablet": ["ibu"] };
// gas chromatography (A level): alcohols; retention time falls as the column gets hotter
const GC = [{ name: "methanol", bp: 65 }, { name: "ethanol", bp: 78 }, { name: "propan-1-ol", bp: 97 }, { name: "butan-1-ol", bp: 118 }, { name: "pentan-1-ol", bp: 138 }];
const tR = (bp, T) => 1 + 0.3 * Math.exp((bp - T) / 30), gcSig = t => 0.025 * t + 0.03;

// ---------------- The page ----------------
const P = { view: "paper", lanes: ["Black felt-tip ink", "Pure Tartrazine (E102)", "Pure Allura red (E129)", "Pure Brilliant blue (E133)", "Green food colouring"], solvent: 0, diam: 0.3, lid: true, ink: false, deep: false, sprayed: false, polar: 0.4, uv: true, tlcLanes: ["Aspirin tablet", "Old aspirin (impure)", "Extra-strength tablet"], Tcol: 90, mix: [30, 25, 20, 15, 10], err: 0.05 };
let t = 0, run = true, speed = 4, meas = [], tlcT = 0, rnd = K.rng(Date.now() % 9973 + 4);
const ui = K.app({
  title: "Chromatography", subject: "Chemistry",
  blurb: "Separate the dyes in inks and food colourings, measure Rf values, test purity, and (A level) TLC and gas chromatography",
  reset: () => set({}),
  levels: { std: "Standard (iGCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Chemistry (4CH1) 1(b) elements, compounds and mixtures: paper chromatography to separate and identify substances, Rf values, pure substances give one spot.", adv: "Pearson Edexcel A level Chemistry (9CH0) Topic 19: chromatography (TLC with Rf, the effect of the eluent; gas chromatography with retention times and peak areas; HPLC and GC–MS described)." } },
  missions: [
    { title: "Separate black ink", q: "Run the chromatogram. How many dyes are in the black felt-tip ink? Which references match them?", hint: "Three spots: yellow (tartrazine), red (allura red) and blue (brilliant blue), at the same heights as the references in lanes 2–4.", setup() { set({}); } },
    { title: "Measure Rf", q: "Take the paper out, mark the solvent front, then click spots to measure them. Work out Rf = spot distance ÷ front distance.", hint: "Measure from the baseline to the centre of the spot, and from the baseline to the front. Allura red: Rf ≈ 0.38 in water.", setup() { set({}); } },
    { title: "Identify an unknown", q: "Which dyes are in unknown mixture X? Compare it with the references.", hint: "Four spots: sunset yellow, green S, carmoisine and indigo carmine. A match needs the same Rf (and colour) in the same solvent.", setup() { set({ lanes: ["Unknown mixture X", "Pure Sunset yellow (E110)", "Pure Green S (E142)", "Pure Carmoisine (E122)", "Pure Indigo carmine (E132)"] }); } },
    { title: "Pure or a mixture?", q: "Which samples are pure substances? How can you tell?", hint: "A pure substance gives one spot (in any solvent). Red food colouring gives one spot here; the inks and green colouring give several.", setup() { set({ lanes: ["Red food colouring", "Green food colouring", "Orange sweet coating", "Purple sweet coating", "Pure Tartrazine (E102)"] }); } },
    { title: "Choosing the solvent", q: "Run the permanent marker in water, then in ethanol. Why does it move in one and not the other?", hint: "Permanent marker dye is insoluble in water, so it stays on the baseline (Rf = 0); it dissolves in ethanol and moves. The substances must dissolve in the solvent.", setup() { set({ lanes: ["Permanent marker", "Black felt-tip ink", "(empty lane)", "(empty lane)", "(empty lane)"] }); } },
    { title: "Spot too big", q: "Make the spots 1 cm across. What happens to the separation?", hint: "Big spots spread into big blurs that overlap, so close dyes cannot be told apart. Use small, concentrated spots (dry between dabs).", setup() { set({ diam: 1 }); } },
    { title: "Solvent too deep", q: "Fill the solvent above the baseline. What happens to the spots?", hint: "The dyes dissolve into the solvent in the tank instead of moving up the paper. The baseline must be above the solvent.", setup() { set({ deep: true }); } },
    { title: "A felt-tip baseline", q: "Draw the baseline in felt-tip pen instead of pencil. What goes wrong?", hint: "The ink of the line dissolves and runs, adding streaks of dye. Pencil (graphite) is insoluble, so it stays put.", setup() { set({ ink: true }); } },
    { title: "Colourless amino acids", q: "Run the amino acids in the butanol solvent. Why can't you see them? Spray the locating agent.", hint: "Amino acids are colourless. A locating agent (ninhydrin) reacts with them to make purple spots so their Rf values can be measured.", setup() { set({ solvent: 4, lanes: ["Amino acid mixture", "Unknown amino acid", "Pure Glycine", "Pure Valine", "Pure Leucine"] }); } },
    { lvl: "adv", title: "TLC: is my aspirin pure?", q: "Run TLC on fresh and old aspirin under UV. What is the extra spot in the old sample?", hint: "Salicylic acid: aspirin slowly hydrolyses in damp air. Two spots means the old sample is impure.", setup() { set({ view: "tlc" }); } },
    { lvl: "adv", title: "TLC: a more polar eluent", q: "Increase the polarity of the eluent. What happens to every Rf value? Why?", hint: "A more polar eluent competes better with the polar silica for the compounds, so they all move further (higher Rf), but may crowd together near the front.", setup() { set({ view: "tlc", polar: 0.8 }); } },
    { lvl: "adv", title: "Gas chromatography", q: "Find the retention times of the alcohols. Heat the column: what changes? Work out the percentage composition from the peak areas.", hint: "Higher boiling point → longer retention time. A hotter column shortens every retention time (peaks may merge). % of each = its peak area ÷ total area × 100.", setup() { set({ view: "gc" }); } }
  ],
  batch: [
    { title: "How precise is one Rf measurement?", question: "If 500 students each measure allura red's Rf (front 8 cm, water), how much do they vary?", how: "Each distance read with a ruler (SD 0.5 mm), rounded to the nearest mm, plus judging the centre of the spot.", yLabel: "Rf measured", reps: 500, bins: 20, theory: 0.38, theoryLabel: "true Rf", run: (x, r) => measureRf(0.38, 8, 0.3, 0.05, r), note: "Most measurements are within ±0.02 of the true value: good enough to match references on the same paper." },
    { title: "Rf error and ruler error", question: "How does the error in Rf depend on how carefully the ruler is read?", how: "Allura red, front 8 cm; |measured − true| for 100 measurements at each ruler error.", xLabel: "ruler reading error (SD, mm)", yLabel: "|error in Rf|", xs: [0, 0.5, 1, 1.5, 2, 2.5], reps: 100, yMin: 0, theory: e => Math.sqrt(2 / Math.PI) * Math.sqrt((0.0029 / 8) ** 2 * 100 + ((e / 10) ** 2 * (1 + 0.38 ** 2)) / 64 + (0.3 * sigma(0.3, 3.04, 30) / 8) ** 2), theoryLabel: "propagated error", run: (e, r) => Math.abs(measureRf(0.38, 8, 0.3, e / 10, r) - 0.38), note: "Careful reading matters, but rounding to the nearest mm and judging the spot's centre set a floor." },
    { title: "Bigger spots: worse separation?", question: "How does the spot size affect the resolution of sunset yellow and ponceau 4R?", how: "Water, front 8 cm after 25 min. Rs ≥ 1: clearly separate.", xLabel: "spot diameter (mm)", yLabel: "resolution Rs", xs: [1, 2, 4, 6, 8, 10], reps: 5, yMin: 0, theory: d => resolution(0.48, 0.55, 8, d / 10, 25), theoryLabel: "gap ÷ 2(σ₁ + σ₂)", run: (d, r) => resolution(0.48, 0.55, 8, d / 10 * (1 + 0.2 * r.gauss()), 25 * (1 + 0.05 * r.gauss())), note: "Small spots give sharp, separate spots; big spots merge." },
    { title: "Does Rf depend on how far the solvent runs?", question: "Is Rf the same whether the front moves 3 cm or 12 cm?", how: "Allura red in water; measured Rf, 40 measurements at each front distance.", xLabel: "front distance (cm)", yLabel: "Rf measured", xs: [3, 5, 8, 10, 12], reps: 40, theory: () => 0.38, theoryLabel: "true Rf", run: (F, r) => measureRf(0.38, F, 0.3, 0.05, r), note: "The mean is the same at every distance (Rf is a ratio), but short runs give less precise values: let the solvent run well up the paper." },
    { title: "How fast does the solvent rise?", question: "How does the height of the solvent front grow with time?", how: "Water (k = 3.0 cm²/min), lid on; height above the solvent surface.", xLabel: "time (min)", yLabel: "front height (cm)", xs: [1, 4, 9, 16, 25, 36, 49, 64], reps: 3, yMin: 0, theory: tt => Math.sqrt(3 * tt), theoryLabel: "h = √(kt)", run: (tt, r) => frontH(3 * (1 + 0.05 * r.gauss()), tt), note: "Fast at first, then slower and slower: h ∝ √t (capillary flow). Quadrupling the time only doubles the height." },
    { title: "Which solvent?", question: "How far does brilliant blue travel in each solvent?", how: "1 water, 2 salt water, 3 ethanol, 4 propanone mixture, 5 butanol mixture.", xLabel: "solvent", yLabel: "Rf", xs: [1, 2, 3, 4, 5], reps: 10, yMin: 0, yMax: 1, theory: s => DY("E133").rf[s - 1], theoryLabel: "true Rf", run: (s, r) => measureRf(DY("E133").rf[s - 1], 8, 0.3, 0.05, r), note: "The same dye has a different Rf in each solvent: always compare with references run on the same paper in the same solvent." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4CH1 1(b)", text: "Paper chromatography separates soluble substances (such as dyes) in a mixture. The paper is the stationary phase; the solvent is the mobile phase." },
      { lvl: "std", tag: "4CH1 1(b)", text: "Method: pencil baseline above the solvent; small concentrated spots; lid on; remove the paper before the front reaches the top and mark the front." },
      { lvl: "std", tag: "4CH1 1(b)", text: "Rf = distance moved by the substance ÷ distance moved by the solvent (from the baseline). Rf is always between 0 and 1." },
      { lvl: "std", tag: "4CH1 1(b)", text: "A pure substance gives one spot; a mixture gives more than one. Substances are identified by matching Rf values with references in the same solvent." },
      { lvl: "adv", tag: "9CH0 19", text: "TLC: a silica (or alumina) plate; spots seen under UV or with a locating agent. A more polar eluent moves polar compounds further." },
      { lvl: "adv", tag: "9CH0 19", text: "Gas chromatography: substances separate by how long they spend in the stationary liquid; retention time identifies them, peak area gives the amount. GC–MS identifies each peak by its mass spectrum." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: () => { const m = meas[meas.length - 1]; return m ? `A spot moved ${m.d.toFixed(1)} cm and the solvent ${m.f.toFixed(1)} cm. Calculate the Rf value.` : "A spot moved 3.0 cm and the solvent 8.0 cm. Calculate the Rf value."; }, ans: () => { const m = meas[meas.length - 1] || { d: 3, f: 8 }; return `<ul><li>Rf = ${m.d.toFixed(1)} ÷ ${m.f.toFixed(1)}</li><li>= ${(m.d / m.f).toFixed(2)}</li></ul>`; } },
      { lvl: "std", marks: 3, q: "Explain why the baseline is drawn in pencil and must be above the solvent.", ans: "<ul><li>pencil (graphite) is insoluble, so it does not run and mix with the spots</li><li>if the solvent were above the baseline the spots would dissolve into the solvent in the beaker</li><li>instead of moving up the paper</li></ul>" },
      { lvl: "std", marks: 2, q: "How does a chromatogram show that a food colouring is not a pure substance?", ans: "<ul><li>it gives more than one spot</li><li>each spot is a different substance</li></ul>" },
      { lvl: "adv", marks: 3, q: () => { const tot = P.mix.reduce((a, b) => a + b, 0); return `A gas chromatogram of a mixture of alcohols has peak areas ${P.mix.join(", ")} (methanol to pentan-1-ol). Calculate the percentage of ethanol.`; }, ans: () => { const tot = P.mix.reduce((a, b) => a + b, 0); return `<ul><li>total area = ${tot}</li><li>% ethanol = ${P.mix[1]} ÷ ${tot} × 100</li><li>= ${(100 * P.mix[1] / tot).toFixed(1)}%</li></ul>`; } }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li>Front height above the solvent h = √(kt) (Lucas–Washburn), k = 3.0 (water), 2.8, 1.6, 5.0, 0.7 cm²/min; the baseline is 1 cm above the solvent. Lid off: dh/dt = k/(2h) − 0.15 cm/min, so the front stalls.</li>
<li>Each substance moves Rf × the front distance. Blur σ² = (diameter/4)² + 0.002 cm × distance + 0.0004 cm²/min × time. Resolution Rs = gap ÷ 2(σ₁ + σ₂).</li>
<li>Measuring: each distance read with a ruler error and rounded to the nearest mm, plus a small error in judging the centre of a fuzzy spot.</li>
<li>Rf values are typical school values; real values depend on the paper, temperature and how saturated the tank is.</li>
<li>TLC (A level): Rf rises in a straight line with eluent polarity (illustrative). GC: retention time 1 + 0.3 e^((bp − T)/30) min; peak width 2.5% of the retention time; peak areas proportional to the amounts.</li></ul>
<p>The earlier version of this simulation, with its worksheets, is kept in <a href="original/chromatography.html">original/chromatography.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {}; const sels = [];
let g = ui.group("View");
ctl.view = K.seg(g, { value: "paper", options: [["paper", "📄 Paper"], ["tlc", "🔦 TLC (A level)"], ["gc", "📈 Gas chromatography (A level)"]], on: v => P.view = v });
g = ui.group("Lanes on the baseline");
for (let i = 0; i < 5; i++) { const s = K.$("select", ""); s.style.cssText = "width:100%;padding:4px;margin:2px 0;background:#16203a;color:inherit;border:1px solid #3a4a6b;border-radius:6px"; s.innerHTML = SAMPLES.map(q => `<option>${q.name}</option>`).join(""); s.onchange = () => { P.lanes[i] = s.value; restart(); }; g.append(s); sels.push(s); }
g = ui.group("Method");
ctl.solvent = K.seg(g, { label: "Solvent", value: 0, options: SOLVENTS.map((s, i) => [i, s.name]), on: v => { P.solvent = +v; restart(); } });
ctl.diam = K.slider(g, { label: "Spot size", min: 0.1, max: 1, step: 0.05, value: 0.3, fmt: v => (v * 10).toFixed(1) + " mm", on: v => { P.diam = v; } });
ctl.lid = K.toggle(g, { label: "Lid on the tank", value: true, on: v => P.lid = v });
ctl.ink = K.toggle(g, { label: "Mistake: felt-tip baseline", value: false, on: v => P.ink = v });
ctl.deep = K.toggle(g, { label: "Mistake: solvent above the baseline", value: false, on: v => { P.deep = v; restart(); } });
let rr = K.row(g); K.btn(rr, "⏹ Take the paper out", () => run = false, "primary"); K.btn(rr, "↺ New paper", () => restart()); K.btn(rr, "💨 Spray locating agent", () => P.sprayed = true);
ctl.speed = K.slider(g, { label: "Speed", min: 1, max: 20, step: 1, value: 4, fmt: v => v + " minutes per second", on: v => speed = v });
ctl.err = K.slider(g, { label: "Your ruler error (SD)", min: 0, max: 0.3, step: 0.01, value: 0.05, fmt: v => (v * 10).toFixed(1) + " mm", on: v => P.err = v });
g = ui.group("TLC and GC (A level)");
ctl.polar = K.slider(g, { label: "TLC eluent polarity", min: 0, max: 1, step: 0.05, value: 0.4, fmt: v => v < 0.2 ? "hexane-rich" : v > 0.8 ? "ethyl ethanoate-rich" : v.toFixed(2), on: v => P.polar = v });
ctl.uv = K.toggle(g, { label: "View under UV", value: true, on: v => P.uv = v });
ctl.Tcol = K.slider(g, { label: "GC column temperature", min: 40, max: 160, step: 5, value: 90, unit: "°C", on: v => P.Tcol = v });
const read = K.readout(ui.group("Readings"), [["a", "–"], ["b", "–"], ["c", "–"], ["d", "–"]]);
const label = (i, s) => { read.el.children[i].firstElementChild.textContent = s; };
function set(o) { Object.assign(P, { view: "paper", lanes: ["Black felt-tip ink", "Pure Tartrazine (E102)", "Pure Allura red (E129)", "Pure Brilliant blue (E133)", "Green food colouring"], solvent: 0, diam: 0.3, lid: true, ink: false, deep: false, sprayed: false, polar: 0.4, uv: true, Tcol: 90 }, o); ctl.view.set(P.view); ctl.solvent.set(P.solvent); ctl.diam.set(P.diam); ctl.lid.set(P.lid); ctl.ink.set(P.ink); ctl.deep.set(P.deep); ctl.polar.set(P.polar); ctl.uv.set(P.uv); ctl.Tcol.set(P.Tcol); sels.forEach((s, i) => s.value = P.lanes[i]); restart(); }
function restart() { t = 0; run = true; meas = []; P.sprayed = false; tlcT = 0; }
const F = () => Math.max(0, frontH(SOLVENTS[P.solvent].kW, t, P.lid) - B);                // front distance above the baseline
const PAPER = 13;                                                                // paper height above the solvent (cm)

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
let geom = null;
function blob(c, x, y, sx, sy, col, a) { const gr = c.createRadialGradient(x, y, 0, x, y, Math.max(sx, sy) * 2); gr.addColorStop(0, col); gr.addColorStop(1, "rgba(0,0,0,0)"); c.globalAlpha = a; c.fillStyle = gr; c.beginPath(); c.ellipse(x, y, sx * 2, sy * 2, 0, 0, 6.3); c.fill(); c.globalAlpha = 1; }
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); const adv = ui.level === "adv";
  if (P.view === "paper") {
    const S = (h - 70) / (PAPER + 1.5), px = w * 0.12, pw = w * 0.5, base = h - 30 - (B + 0.6) * S, Y = d => base - d * S, f = F();
    // tank, solvent and paper
    c.strokeStyle = "rgba(255,255,255,.4)"; c.strokeRect(px - 20, 20, pw + 40, h - 40); if (P.lid) { c.fillStyle = "rgba(255,255,255,.25)"; c.fillRect(px - 26, 14, pw + 52, 8); }
    const solvTop = P.deep ? base - 0.4 * S : base + B * S; c.fillStyle = "rgba(120,170,255,.25)"; c.fillRect(px - 18, solvTop, pw + 36, h - 22 - solvTop);
    c.fillStyle = "#f4f1e8"; c.fillRect(px, 30, pw, h - 60); c.fillStyle = "rgba(120,170,255,.25)"; c.fillRect(px, Y(f), pw, base - Y(f) + B * S);
    c.strokeStyle = P.ink ? "#2a2a90" : "#888"; c.lineWidth = P.ink ? 2.5 : 1; c.beginPath(); c.moveTo(px, base); c.lineTo(px + pw, base); c.stroke(); c.lineWidth = 1;
    if (!run) { c.strokeStyle = "#555"; c.setLineDash([5, 4]); c.beginPath(); c.moveTo(px, Y(f)); c.lineTo(px + pw, Y(f)); c.stroke(); c.setLineDash([]); TX(c, "front (marked)", px + pw + 6, Y(f) + 4, "#cfd8ea", "left", "11px"); }
    geom = { px, pw, base, S, spots: [] };
    P.lanes.forEach((nm, i) => { const x = px + pw * (i + 0.5) / 5, smp = SAMPLES[SI(nm)];
      if (P.ink) { c.fillStyle = "rgba(42,42,144,.35)"; c.fillRect(x - pw / 12, Y(Math.min(f * 0.5, 4)), pw / 6, base - Y(Math.min(f * 0.5, 4))); }
      for (const k of smp.d) { const D = DY(k), rf = D.rf[P.solvent], d = rf * f, s = sigma(P.diam, d, t), vis = D.clear ? (P.sprayed ? 1 : 0) : 1; const fade = P.deep ? Math.max(0, 1 - t / 3) : 1;
        if (vis * fade > 0.02) blob(c, x, Y(d), Math.max(3, s * S * 0.9), Math.max(3, s * S * 1.1), D.clear ? "#7b3fa0" : D.col, Math.min(1, 0.9 * vis * fade));
        geom.spots.push({ x, y: Y(d), k, lane: i, rf, d }); }
      TX(c, String(i + 1), x, base + 16, "#333", "center", "600 11px"); });
    if (P.deep) TX(c, "the spots are dissolving into the solvent in the tank!", px + pw / 2, base - 20, "#c0392b", "center", "600 12px");
    // ruler
    c.fillStyle = "#e8d8a0"; c.fillRect(px + pw + 30, Y(12), 24, 12 * S); for (let cm = 0; cm <= 12; cm += 0.5) { c.strokeStyle = "#333"; c.beginPath(); c.moveTo(px + pw + 30, Y(cm)); c.lineTo(px + pw + 30 + (cm % 1 ? 6 : 12), Y(cm)); c.stroke(); if (!(cm % 1)) TX(c, String(cm), px + pw + 46, Y(cm) + 4, "#333", "left", "9.5px"); }
    let y = 150; const tx = w * 0.72; TX(c, `${SOLVENTS[P.solvent].name} · ${t.toFixed(0)} min · front ${f.toFixed(1)} cm`, tx, 106, "#eef2f8", "left", "600 12.5px"); TX(c, run ? "running… take the paper out to mark the front" : "click a spot to measure it", tx, 126, run ? "#ffd166" : "#7ee787", "left", "12px");
    TX(c, "Your measurements", tx, y, "#eef2f8", "left", "600 12.5px"); y += 18; for (const m of meas.slice(-9)) { TX(c, `lane ${m.lane + 1}: ${m.d.toFixed(1)} ÷ ${m.f.toFixed(1)} = ${(m.d / m.f).toFixed(2)} (true ${m.rf.toFixed(2)})`, tx, y, "#cfd8ea", "left", "11.5px"); y += 17; }
  } else if (P.view === "tlc") {
    const lanes = Object.keys(TABLETS), pw = w * 0.5, px = w * 0.1, top = 40, bot = h - 50, Ff = Math.min(1, tlcT / 4), Y = d => bot - d * (bot - top);
    c.fillStyle = P.uv ? "#2fd06a" : "#f4f4f0"; c.fillRect(px, top - 10, pw, bot - top + 30); c.strokeStyle = "#888"; c.beginPath(); c.moveTo(px, bot); c.lineTo(px + pw, bot); c.stroke();
    c.strokeStyle = "#444"; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(px, Y(Ff)); c.lineTo(px + pw, Y(Ff)); c.stroke(); c.setLineDash([]);
    lanes.forEach((nm, i) => { const x = px + pw * (i + 0.5) / lanes.length; for (const k of TABLETS[nm]) { const T = TLC.find(q => q.k === k), rf = Math.min(0.97, T.rf(P.polar)); c.fillStyle = P.uv ? "rgba(20,40,30,.85)" : "rgba(200,200,200,.4)"; c.beginPath(); c.ellipse(x, Y(rf * Ff), 9, 6, 0, 0, 6.3); c.fill(); } TX(c, String(i + 1), x, bot + 18, "#222", "center", "600 11px"); });
    let y = 120; const tx = w * 0.66; TX(c, `Silica TLC plate, eluent polarity ${P.polar.toFixed(2)}${P.uv ? ", under UV (254 nm)" : ""}`, tx, 104, "#eef2f8", "left", "600 12.5px"); lanes.forEach((nm, i) => { TX(c, `${i + 1}: ${nm}`, tx, y + 18 * (i + 1), "#cfd8ea", "left", "12px"); });
    y += 18 * (lanes.length + 2); TLC.forEach(T => { TX(c, `${T.name}: Rf ${Math.min(0.97, T.rf(P.polar)).toFixed(2)}`, tx, y, "#aab6cc", "left", "11.5px"); y += 16; });
    if (!adv) TX(c, "TLC is A level: switch to Advanced", w - 14, h - 10, "#8fa0bf", "right", "11.5px");
  } else {
    TX(c, `Gas chromatograph: column at ${P.Tcol} °C, a mixture of five alcohols`, 20, 28, "#eef2f8", "left", "600 13.5px");
    c.fillStyle = "#3a4a6b"; c.fillRect(30, 60, 70, 40); TX(c, "injector", 65, 115, "#aab6cc", "center", "11px"); c.strokeStyle = "#ffd166"; c.lineWidth = 3; c.beginPath(); for (let i = 0; i <= 200; i++) { const a = i / 200 * 6 * 6.283, x = 150 + i * 1.6 + 20 * Math.cos(a), y = 80 + 20 * Math.sin(a); i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); c.lineWidth = 1; TX(c, "coiled column (in an oven)", 310, 125, "#aab6cc", "center", "11px"); c.fillStyle = "#3a4a6b"; c.fillRect(500, 60, 70, 40); TX(c, "detector", 535, 115, "#aab6cc", "center", "11px");
    let y = 160; GC.forEach((G, i) => { const tr = tR(G.bp, P.Tcol); TX(c, `${G.name} (bp ${G.bp} °C): retention time ${tr.toFixed(2)} min, ${P.mix[i]}% of the mixture`, 30, y, "#cfd8ea", "left", "12.5px"); y += 22; });
    TX(c, "Higher boiling point → spends longer in the stationary liquid → longer retention time. Hotter column → all faster.", 30, y + 10, "#8fa0bf", "left", "11.5px");
    if (!adv) TX(c, "GC is A level: switch to Advanced", w - 14, h - 10, "#8fa0bf", "right", "11.5px");
  }
}
K.pointer(cv.el, { down: (x, y) => { if (P.view !== "paper" || run || !geom) return; let best = null, bd = 400; for (const s of geom.spots) { const d = (s.x - x) ** 2 + (s.y - y) ** 2; if (d < bd) { bd = d; best = s; } } if (best) { const f = F(), dm = Math.round((best.d + P.err * rnd.gauss()) * 10) / 10, fm = Math.round((f + P.err * rnd.gauss()) * 10) / 10; meas.push({ lane: best.lane, d: dm, f: fm, rf: best.rf }); } } });

// ---------------- Charts and readings ----------------
function charts() {
  chA.opts.xFmt = null; chB.opts.xFmt = null;
  if (P.view === "paper") {
    const f = F(), pts = []; P.lanes.forEach((nm, i) => { for (const k of SAMPLES[SI(nm)].d) { const D = DY(k); if (!D.clear || P.sprayed) pts.push({ x: i + 1, y: D.rf[P.solvent], col: D.clear ? "#7b3fa0" : D.col }); } });
    chA.opts.title = "Rf of every spot, lane by lane"; chA.opts.xLabel = "lane"; chA.opts.yLabel = "Rf"; chA.opts.xFmt = whole(v => String(v));
    chA.draw([...new Set(pts.map(p => p.col))].map(col => ({ pts: pts.filter(p => p.col === col).map(p => [p.x, p.y]), type: "dots", r: 6, color: col, label: "" })), { xMin: 0.5, xMax: 5.5, yMin: 0, yMax: 1, hlines: SAMPLES[SI(P.lanes[0])].d.map(k => ({ y: DY(k).rf[P.solvent], color: "rgba(255,255,255,.25)" })) });
    const fp = []; for (let tt = 0; tt <= Math.max(30, t); tt += 0.5) fp.push([tt, Math.max(0, frontH(SOLVENTS[P.solvent].kW, tt, P.lid) - B)]);
    chB.opts.title = "Solvent front above the baseline"; chB.opts.xLabel = "time (min)"; chB.opts.yLabel = "cm"; chB.draw([{ pts: fp, color: "#5ad1ff", label: P.lid ? "lid on" : "lid off" }, { pts: [[t, f]], type: "dots", r: 6, color: "#fff", label: "now" }], { yMin: 0, yMax: 13 });
    label(0, "time"); label(1, "front distance"); label(2, "lane 1 spots"); label(3, "matches in lane 1"); read.set("a", t.toFixed(1) + " min"); read.set("b", f.toFixed(2) + " cm"); const l1 = SAMPLES[SI(P.lanes[0])].d; read.set("c", l1.length ? `${l1.length} (${l1.map(k => DY(k).rf[P.solvent].toFixed(2)).join(", ")})` : "–");
    read.set("d", l1.map(k => P.lanes.slice(1).some(n => SAMPLES[SI(n)].d.length === 1 && SAMPLES[SI(n)].d[0] === k) ? DY(k).name.split(" (")[0] : null).filter(Boolean).join(", ") || "–");
  } else if (P.view === "tlc") {
    const xs = []; for (let p = 0; p <= 1; p += 0.05) xs.push(p);
    chA.opts.title = "Rf against eluent polarity"; chA.opts.xLabel = "polarity"; chA.opts.yLabel = "Rf"; chA.draw(TLC.map((T, i) => ({ pts: xs.map(p => [p, Math.min(0.97, T.rf(p))]), color: ["#ff6b81", "#5ad1ff", "#ffd166", "#7ee787", "#c9a0ff"][i], label: T.name.split(" (")[0] })), { yMin: 0, yMax: 1, vlines: [{ x: P.polar, label: "now" }] });
    chB.opts.title = "–"; chB.opts.xLabel = ""; chB.opts.yLabel = ""; chB.draw([], {}); label(0, "eluent polarity"); label(1, "aspirin Rf"); label(2, "salicylic acid Rf"); label(3, "–"); read.set("a", P.polar.toFixed(2)); read.set("b", TLC[0].rf(P.polar).toFixed(2)); read.set("c", TLC[4].rf(P.polar).toFixed(2)); read.set("d", "–");
  } else {
    const tmax = Math.max(...GC.map(G => tR(G.bp, P.Tcol))) * 1.15 + 0.5, pts = []; for (let tt = 0; tt <= tmax; tt += tmax / 600) { let s = 0; GC.forEach((G, i) => { const tr = tR(G.bp, P.Tcol), sg = gcSig(tr); s += P.mix[i] / (sg * Math.sqrt(2 * Math.PI)) * Math.exp(-((tt - tr) ** 2) / (2 * sg * sg)); }); pts.push([tt, s]); }
    chA.opts.title = "Chromatogram"; chA.opts.xLabel = "time (min)"; chA.opts.yLabel = "detector signal"; chA.draw([{ pts, color: "#ffd166", label: "signal" }], { yMin: 0, vlines: GC.map(G => ({ x: tR(G.bp, P.Tcol), color: "rgba(255,255,255,.2)" })) });
    chB.opts.title = "Composition from peak areas"; chB.opts.xLabel = ""; chB.opts.yLabel = "%"; chB.opts.xFmt = whole(i => (GC[i - 1] || { name: "" }).name.replace("-1-ol", "").replace("anol", "")); chB.draw([{ pts: P.mix.map((m, i) => [i + 1, m]), type: "bars", w: 0.6, color: "#c9a0ff", label: "% (area ÷ total)" }], { yMin: 0, xMin: 0.4, xMax: 5.6 });
    const tr = GC.map(G => tR(G.bp, P.Tcol)), rs = Math.min(...tr.slice(1).map((v, i) => (v - tr[i]) / (2 * (gcSig(v) + gcSig(tr[i])))));
    label(0, "first peak"); label(1, "last peak"); label(2, "worst resolution"); label(3, "–"); read.set("a", tr[0].toFixed(2) + " min"); read.set("b", tr[4].toFixed(2) + " min"); read.set("c", rs.toFixed(2) + (rs < 1 ? " (peaks overlap)" : " (separate)")); read.set("d", "–");
  }
  ui.hud({ paper: "Rf = distance moved by the spot ÷ distance moved by the solvent", tlc: "A more polar eluent moves everything further", gc: "Retention time identifies; peak area measures" }[P.view]);
}
let frame = 0;
ui.run(dt => { if (!(dt > 0)) return; if (P.view === "paper" && run) { t += dt * speed; if (F() > PAPER - 1.5) run = false; } if (P.view === "tlc") tlcT += dt; }, () => { draw(); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("The solvent soaks up the paper and carries the dyes. Take the paper out, then click spots to measure Rf.", 7000);
