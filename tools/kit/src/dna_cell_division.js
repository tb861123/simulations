/* =====================================================================
   DNA, PROTEIN SYNTHESIS AND CELL DIVISION
   DNA is a double helix: two strands of nucleotides joined by base pairs,
   A with T and C with G. A GENE is a section of DNA that codes for a
   protein: every three bases (a CODON) code for one amino acid.
     TRANSCRIPTION (nucleus): the gene is copied into mRNA (U instead of T).
     TRANSLATION (ribosome): tRNA molecules with matching anticodons bring
     amino acids, which are joined in the order of the codons.
   A MUTATION changes the bases. A substitution changes one codon (silent,
   missense or nonsense); an insertion or deletion shifts the reading
   frame, changing every codon after it.
   MITOSIS makes two identical cells (growth, repair, asexual
   reproduction). MEIOSIS makes four genetically different haploid gametes:
   chromosomes pair up and line up at random (independent assortment), and
   at A level swap pieces (crossing over).
   The gene used is the start of human β-globin (HBB); sickle-cell anaemia
   is a single substitution in codon 7: GAG → GTG.
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
// the genetic code (DNA coding-strand codons → amino acid, three-letter abbreviations)
const CODE = {}; (() => { const b = "TCAG", aa = "FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG"; let k = 0; for (const x of b) for (const y of b) for (const z of b) CODE[x + y + z] = aa[k++]; })();
const AA3 = { F: "Phe", L: "Leu", S: "Ser", Y: "Tyr", "*": "STOP", C: "Cys", W: "Trp", P: "Pro", H: "His", Q: "Gln", R: "Arg", I: "Ile", M: "Met", T: "Thr", N: "Asn", K: "Lys", V: "Val", A: "Ala", D: "Asp", E: "Glu", G: "Gly" };
const AACOL = { F: "#e8a33d", L: "#e8a33d", I: "#e8a33d", M: "#e8a33d", V: "#e8a33d", A: "#e8a33d", W: "#e8a33d", P: "#c9a0ff", G: "#c9a0ff", S: "#7fe3a0", T: "#7fe3a0", C: "#7fe3a0", Y: "#7fe3a0", N: "#7fe3a0", Q: "#7fe3a0", D: "#ff6b6b", E: "#ff6b6b", K: "#6fb1ff", R: "#6fb1ff", H: "#6fb1ff", "*": "#ffffff" };
const HBB = "ATGGTGCACCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAG";            // human β-globin, codons 1–18
const BASECOL = { A: "#ff6b6b", T: "#ffd166", G: "#7fe3a0", C: "#6fb1ff", U: "#ffb347" };
const PAIR = { A: "T", T: "A", G: "C", C: "G" };
const translate = s => { const out = []; for (let i = 0; i + 3 <= s.length; i += 3) { const a = CODE[s.slice(i, i + 3)]; out.push(a); if (a === "*") break; } return out; };
// what kind of mutation: compare the proteins
function classify(orig, mut) {
  if (orig.length % 3 !== mut.length % 3 || orig.length !== mut.length) return "frameshift";
  const a = translate(orig), b = translate(mut); if (a.join("") === b.join("")) return "silent";
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return b[i] === "*" ? "nonsense" : "missense";
  return "missense";
}
function mutate(s, kind, pos, r) {
  const bases = "ATGC";
  if (kind === "sub") { let nb; do { nb = bases[Math.floor(r() * 4)]; } while (nb === s[pos]); return s.slice(0, pos) + nb + s.slice(pos + 1); }
  if (kind === "ins") return s.slice(0, pos) + bases[Math.floor(r() * 4)] + s.slice(pos);
  return s.slice(0, pos) + s.slice(pos + 1);
}
// the cell cycle (hours) for an onion root tip cell
const PHASES = [["G1", 6], ["S", 6], ["G2", 5], ["prophase", 1.4], ["metaphase", 0.4], ["anaphase", 0.2], ["telophase", 0.5], ["cytokinesis", 0.5]];
const CYCLE = PHASES.reduce((s, p) => s + p[1], 0), MITOSIS = PHASES.slice(3).reduce((s, p) => s + p[1], 0);
// mitotic index along a root: cells divide in the meristem near the tip and stop 1.5–3 mm back
const miModel = d => 100 * MITOSIS / CYCLE * 1 / (1 + Math.exp((d - 1.6) / 0.25));
// meiosis: a gamete takes one chromosome of each pair at random; with crossing over, one swap per pair
function gamete(n, r, cross) { const g = []; for (let i = 0; i < n; i++) { const fromMum = r() < 0.5; if (!cross) g.push(fromMum ? "M" : "F"); else { const x = r(); g.push((fromMum ? "M" : "F") + (r() < 0.5 ? "" : "×" + x.toFixed(2))); } } return g.join(""); }

// ---------------- The page ----------------
const P = { view: "dna", kind: "sub", pos: 19, n: 2, cross: false, dist: 0.5 };
let rnd = K.rng(Date.now() % 99991 + 23), speed = 1, gene = HBB, step = 0, tried = { silent: 0, missense: 0, nonsense: 0, frameshift: 0 }, cellT = 0, gam = {}, meiT = 0, meiOri = [], field = [], counts = [], t = 0;
const ui = K.app({
  title: "DNA, Protein Synthesis and Cell Division", subject: "Biology",
  blurb: "From the double helix to proteins, mutations, mitosis and meiosis",
  reset: () => set({ view: P.view }),
  levels: { std: "Standard (iGCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Biology (4BI1) 3(b): genes, chromosomes and the genome; DNA as a double helix with paired bases A–T, C–G; RNA and uracil; protein synthesis (transcription and translation: mRNA, ribosomes, tRNA, codons, anticodons); mitosis and meiosis; 46 and 23 chromosomes; mutation and its effects. Protein synthesis is Biology only.", adv: "OCR A level Biology A (H420) 2.1.3 nucleotides and nucleic acids (antiparallel strands, the genetic code, transcription and translation), 2.1.6 the cell cycle, mitosis, meiosis with crossing over and independent assortment, the root tip squash and mitotic index (PAG1), 6.1.1 substitution, insertion and deletion mutations." } },
  missions: [
    { title: "Base pairing", q: "Look at the double helix. Which base always pairs with A, and which with C? Check the base composition chart.", hint: "A pairs with T, C pairs with G (complementary base pairing). So in double-stranded DNA the amount of A equals T and C equals G (Chargaff's rule), though A + T need not equal C + G.", setup() { set({ view: "dna" }); } },
    { title: "Making a protein", q: "Watch transcription and translation. What is the mRNA codon for the first amino acid? What is its anticodon on the tRNA?", hint: "DNA coding strand ATG → mRNA AUG (U replaces T) → tRNA anticodon UAC, carrying methionine, the start of every protein. The ribosome reads one codon (3 bases) at a time and joins the amino acids into a chain.", setup() { set({ view: "dna" }); } },
    { title: "Sickle cell", q: "Make the sickle-cell mutation. What changes in the protein? Why does one base matter so much?", hint: "Codon 7 GAG → GTG: glutamic acid (charged, water-loving) becomes valine (hydrophobic). The haemoglobin molecules stick together at low oxygen, so red cells become sickle-shaped and block capillaries.", setup() { set({ view: "dna" }); sickle(); } },
    { title: "Three kinds of substitution", q: "Make several random substitutions. Which are silent, which missense, which nonsense? Why are many mutations harmless?", hint: "The code is degenerate: several codons code for the same amino acid, so many substitutions (especially in the third base) are silent. Missense changes one amino acid; nonsense makes a stop codon, cutting the protein short.", setup() { set({ view: "dna", kind: "sub" }); } },
    { title: "Frameshift", q: "Insert one base near the start of the gene. How much of the protein changes? Compare an insertion near the end.", hint: "Inserting or deleting a base shifts the reading frame: every codon after it is read differently, so the rest of the protein is different (and often hits a stop codon soon). The nearer the start, the worse.", setup() { set({ view: "dna", kind: "ins", pos: 4 }); } },
    { title: "Mitosis", q: "Follow a cell through the cycle. When is the DNA copied? What does each new cell end up with?", hint: "DNA is copied in S phase (interphase), so each chromosome becomes two identical chromatids. In mitosis the chromatids are pulled apart, so each new cell gets an identical, complete set (2n): used for growth, repair and asexual reproduction.", setup() { set({ view: "mitosis" }); } },
    { title: "Root tip squash", q: "Count the cells in a field near the tip. What percentage are dividing (the mitotic index)? Move further from the tip.", hint: "Near the tip (the meristem) about 10–15% of cells are in mitosis; 2–3 mm back almost none: the cells there are elongating and differentiating instead of dividing.", setup() { set({ view: "squash", dist: 0.5 }); } },
    { title: "Meiosis makes variety", q: "Make lots of gametes from a cell with 2 pairs of chromosomes. How many different kinds are there? What about 3 pairs? Humans (23 pairs)?", hint: "Each pair lines up at random, so each gamete gets one of each pair at random: 2ⁿ kinds. 2 pairs: 4; 3 pairs: 8; humans: 2²³ ≈ 8.4 million, before crossing over adds even more. Random fertilisation then multiplies this again.", setup() { set({ view: "meiosis", n: 2 }); } },
    { lvl: "adv", title: "Crossing over", q: "Switch on crossing over. Are the gametes still just the 2ⁿ types?", hint: "No: at each chiasma, chromatids of a homologous pair swap sections, so each chromosome in a gamete can be a new mix of maternal and paternal alleles. Together with independent assortment, almost every gamete is unique.", setup() { set({ view: "meiosis", n: 3, cross: true }); } },
    { lvl: "adv", title: "Phase durations", q: "In the root tip squash, use the counts to estimate how long metaphase lasts, given a 20-hour cycle.", hint: "Time in a phase ≈ (cells in that phase ÷ total cells) × cell cycle time. For example 5 metaphase cells out of 250: 5/250 × 20 h = 0.4 h (24 minutes).", setup() { set({ view: "squash", dist: 0.3 }); } }
  ],
  batch: [
    { title: "How often is a substitution silent?", question: "In 100 random single-base substitutions in the β-globin gene, what percentage do not change the protein?", how: "Each run: 100 random substitutions in codons 2–18 (any base to any other). Theory: the exact percentage from trying every possible substitution.", yLabel: "silent substitutions (%)", reps: 200, bins: 20, theory: (() => { let n = 0, s = 0; for (let p = 3; p < HBB.length; p++) for (const b of "ATGC") if (b !== HBB[p]) { n++; if (classify(HBB, HBB.slice(0, p) + b + HBB.slice(p + 1)) === "silent") s++; } return 100 * s / n; })(), theoryLabel: "exact", run: (x, r) => { let s = 0; for (let i = 0; i < 100; i++) { const p = 3 + Math.floor(r() * (HBB.length - 3)); if (classify(HBB, mutate(HBB, "sub", p, r)) === "silent") s++; } return s; }, note: "About a quarter of substitutions change nothing, because the genetic code is degenerate (mostly a change in the third base of a codon)." },
    { title: "Frameshift: where it happens matters", question: "How many amino acids change when one base is inserted at different points in the gene?", how: "Insert a random base before codon 2 to 17 of the 18-codon gene; count the amino acids that differ (up to the first stop).", xLabel: "codon where the base is inserted", yLabel: "amino acids changed", xs: [2, 4, 6, 8, 10, 12, 14, 16], reps: 5, yMin: 0, run: (x, r) => { const m = mutate(HBB, "ins", (x - 1) * 3 + Math.floor(r() * 3), r), a = translate(HBB), b = translate(m); let d = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++; return d; }, note: "An insertion early in the gene changes almost every amino acid after it; near the end, only a few. (The first amino acid after the insertion sometimes stays the same by chance.)" },
    { title: "Meiosis: how many kinds of gamete?", question: "From 500 gametes, how many different combinations of chromosomes appear?", how: "n = 1 to 6 pairs of chromosomes, independent assortment only (no crossing over). Theory: 2ⁿ.", xLabel: "pairs of chromosomes n", yLabel: "different gametes seen", xs: [1, 2, 3, 4, 5, 6], reps: 4, yMin: 0, theory: n => Math.pow(2, n), theoryLabel: "2ⁿ", run: (x, r) => { const s = new Set(); for (let i = 0; i < 500; i++) s.add(gamete(x, r, false)); return s.size; }, note: "The number of kinds doubles with every extra pair. 500 gametes are enough to find all 64 kinds with 6 pairs; for humans (23 pairs, 8.4 million kinds) you would need millions." },
    { title: "Mitotic index along a root", question: "How does the percentage of dividing cells change with distance from the root tip?", how: "Each run: classify 150 cells in one field of view at that distance. Theory: the model's curve.", xLabel: "distance from the tip (mm)", yLabel: "mitotic index (%)", xs: [0.25, 0.5, 1, 1.5, 2, 2.5, 3], reps: 4, yMin: 0, theory: miModel, theoryLabel: "model", run: (x, r) => { let n = 0; for (let i = 0; i < 150; i++) if (r() < miModel(x) / 100) n++; return n / 150 * 100; }, note: "Cell division happens in the meristem near the tip; further back the cells elongate and differentiate. Counting only 150 cells gives a few % of scatter." },
    { title: "How long does each phase last?", question: "Estimate the time in metaphase from counts of 250 cells near the tip (cycle 20 hours).", how: "Time ≈ (cells in metaphase ÷ cells counted) × 20 h. True value 0.4 h.", yLabel: "metaphase time estimated (h)", reps: 200, bins: 16, theory: 0.4, theoryLabel: "true", run: (x, r) => { let n = 0; for (let i = 0; i < 250; i++) if (r() < 0.4 / CYCLE) n++; return n / 250 * CYCLE; }, note: "Short phases are hard to time this way: with only about 5 cells in metaphase, chance makes a big difference. Count more fields for a better estimate." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4BI1 3.16B", text: "DNA: two strands coiled into a double helix, joined by pairs of bases: adenine–thymine, cytosine–guanine. A gene is a section of DNA that codes for a protein." },
      { lvl: "std", tag: "4BI1 3.17B", text: "RNA is single-stranded and has uracil (U) instead of thymine. mRNA carries a copy of the gene out of the nucleus." },
      { lvl: "std", tag: "4BI1 3.18B", text: "Transcription: the gene is copied into mRNA in the nucleus. Translation: at a ribosome, tRNA anticodons pair with mRNA codons; each tRNA brings a specific amino acid; the amino acids join into a polypeptide." },
      { lvl: "std", tag: "4BI1 3.34", text: "A mutation is a change in the DNA. Most have no effect; some change the amino acid sequence and so the protein's shape and function. Ionising radiation and some chemicals (mutagens) increase the rate." },
      { lvl: "std", tag: "4BI1 3.28", text: "Mitosis: one division making two genetically identical diploid cells: growth, repair, cloning, asexual reproduction. DNA is copied before it starts." },
      { lvl: "std", tag: "4BI1 3.30", text: "Meiosis: two divisions making four genetically different haploid gametes. Human body cells have 46 chromosomes (23 pairs); gametes have 23. Random fertilisation restores 46." },
      { lvl: "adv", tag: "H420 2.1.3", text: "Strands are antiparallel (5′→3′ and 3′→5′). Replication is semi-conservative: helicase unzips, DNA polymerase adds nucleotides to the 3′ end. The genetic code is a triplet code, degenerate, non-overlapping and universal." },
      { lvl: "adv", tag: "H420 2.1.6", text: "Cell cycle: G1, S (DNA replication), G2, mitosis (prophase, metaphase, anaphase, telophase), cytokinesis; checkpoints at G1, G2 and the spindle. Mitotic index = cells in mitosis ÷ total cells." },
      { lvl: "adv", tag: "H420 2.1.6", text: "Meiosis creates variation by independent assortment (2ⁿ combinations) in metaphase I and crossing over between non-sister chromatids at chiasmata in prophase I." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: "A DNA strand reads ATG GTG CAC. Write the complementary strand and the mRNA made from it.", ans: "<ul><li>complementary strand: TAC CAC GTG</li><li>mRNA (copying the coding strand, U for T): AUG GUG CAC</li></ul>" },
      { lvl: "std", marks: 3, q: "Describe how a protein is made from the information in a gene.", ans: "<ul><li>the gene is copied into mRNA (transcription) in the nucleus</li><li>mRNA moves to a ribosome; tRNA brings amino acids, its anticodon matching each codon</li><li>amino acids are joined in the order of the codons (translation)</li></ul>" },
      { lvl: "std", marks: 2, q: "Explain why a mutation may have no effect on a protein.", ans: "<ul><li>the new codon may code for the same amino acid (the code has several codons per amino acid)</li><li>or the change may be outside the part of the gene that codes for the protein / not affect its shape</li></ul>" },
      { lvl: "std", marks: 3, q: "Give three differences between mitosis and meiosis.", ans: "<ul><li>mitosis: 2 cells; meiosis: 4</li><li>mitosis: diploid, identical; meiosis: haploid, genetically different</li><li>mitosis: growth and repair; meiosis: gametes</li></ul>" },
      { lvl: "adv", marks: 3, q: () => `In a root tip squash, ${counts.length ? counts.reduce((s, q) => s + q.div, 0) : 18} of ${counts.length ? counts.reduce((s, q) => s + q.tot, 0) : 150} cells were dividing. Calculate the mitotic index and suggest where the field of view was.`, ans: () => { const d = counts.length ? counts.reduce((s, q) => s + q.div, 0) : 18, tt = counts.length ? counts.reduce((s, q) => s + q.tot, 0) : 150; return `<ul><li>mitotic index = ${d} ÷ ${tt} × 100 = ${(d / tt * 100).toFixed(1)}%</li><li>${d / tt > 0.05 ? "near the tip, in the meristem, where cells divide" : "further back from the tip, where cells elongate rather than divide"}</li></ul>`; } },
      { lvl: "adv", marks: 2, q: "Explain how crossing over increases genetic variation.", ans: "<ul><li>non-sister chromatids of homologous chromosomes exchange sections at chiasmata (prophase I)</li><li>producing new combinations of alleles on each chromosome</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li>The gene: the first 18 codons of human β-globin (HBB), read with the standard genetic code. Mutations are made on the coding strand and the new protein is read until the first stop codon. Silent: same protein; missense: one amino acid changed; nonsense: a stop codon early; frameshift: an insertion or deletion of one base.</li>
<li>Cell cycle of an onion root tip cell: G1 6 h, S 6 h, G2 5 h, prophase 1.4 h, metaphase 0.4 h, anaphase 0.2 h, telophase 0.5 h, cytokinesis 0.5 h (about 20 h). Mitosis is slowed down on screen so you can watch it. Shown with 2n = 4.</li>
<li>Root tip squash: each cell is in a phase with chance proportional to that phase's length; cells stop dividing about 1.5–2 mm from the tip (the mitotic index falls along a smooth curve).</li>
<li>Meiosis: each pair of chromosomes lines up at random, so each gamete takes one of each pair at random (2ⁿ kinds). With crossing over, each pair swaps sections at one point.</li></ul>
<h3>Simplifications</h3>
<ul><li>Only the start of one gene; no introns, promoters or regulation. The earlier version's A level replication, Meselson–Stahl and lac operon views are not included here.</li>
<li>Chromosome numbers are kept small to see them; checkpoints are described but not simulated.</li></ul>
<p>The earlier version of this simulation, with its worksheets, is kept in <a href="original/dna-cell-division.html">original/dna-cell-division.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {}, grp = {};
let g = ui.group("View");
ctl.view = K.seg(g, { value: "dna", options: [["dna", "🧬 DNA and proteins"], ["mitosis", "🔄 Cell cycle and mitosis"], ["squash", "🔬 Root tip squash"], ["meiosis", "🎲 Meiosis"]], on: v => set({ view: v }) });
grp.dna = g = ui.group("Gene and mutations");
ctl.kind = K.seg(g, { label: "Mutation", value: "sub", options: [["sub", "substitution"], ["ins", "insertion"], ["del", "deletion"]], on: v => P.kind = v });
ctl.pos = K.slider(g, { label: "At base number", min: 4, max: 54, step: 1, value: 19, on: v => P.pos = v });
let r1 = K.row(g); K.btn(r1, "Make the mutation", () => doMutate(), "primary"); K.btn(r1, "🎲 Random substitution", () => { P.kind = "sub"; ctl.kind.set("sub"); P.pos = 4 + Math.floor(rnd() * 51); ctl.pos.set(P.pos); doMutate(); });
let r2 = K.row(g); K.btn(r2, "Sickle-cell mutation", () => sickle()); K.btn(r2, "↺ Original gene", () => { gene = HBB; step = 0; });
grp.mitosis = g = ui.group("Cell cycle");
K.note(g, "An onion root tip cell, 2n = 4. Mitosis is slowed down so you can watch it.");
grp.squash = g = ui.group("Root tip squash");
ctl.dist = K.slider(g, { label: "Distance from the root tip", min: 0.1, max: 3, step: 0.1, value: 0.5, unit: "mm", on: v => { P.dist = v; newField(); } });
let r3 = K.row(g); K.btn(r3, "Count this field", () => countField(), "primary"); K.btn(r3, "New field of view", () => newField()); K.btn(r3, "Clear results", () => { counts = []; });
grp.meiosis = g = ui.group("Meiosis");
ctl.n = K.seg(g, { label: "Pairs of chromosomes", value: 2, options: [[2, "2"], [3, "3"], [4, "4"]], on: v => { P.n = v; gam = {}; } });
ctl.cross = K.toggle(g, { label: "Crossing over (A level)", value: false, on: v => { P.cross = v; gam = {}; } });
let r4 = K.row(g); K.btn(r4, "Make 100 gametes", () => { for (let i = 0; i < 100; i++) addGamete(); }, "primary"); K.btn(r4, "Clear", () => { gam = {}; });
ctl.speed = K.slider(ui.group("Watch"), { label: "Speed", min: 0.25, max: 4, step: 0.25, value: 1, fmt: v => v + "×", on: v => speed = v });
const read = K.readout(ui.group("Readings"), [["a", ""], ["b", ""], ["c", ""], ["d", ""]]);
const relabel = l => l.forEach((x, i) => read.el.children[i].firstElementChild.textContent = x);
function doMutate() { const before = gene, after = mutate(gene, P.kind, Math.min(P.pos - 1, gene.length - 1), rnd); const k = classify(HBB, after); gene = after; step = 0; tried[k]++; ui.tip(`${P.kind === "sub" ? "Substitution" : P.kind === "ins" ? "Insertion" : "Deletion"} at base ${P.pos}: ${k}`, 3000); }
function sickle() { gene = HBB.slice(0, 19) + "T" + HBB.slice(20); step = 0; tried.missense++; ui.tip("Sickle cell: codon 7 GAG → GTG (glutamic acid → valine)", 4000); }
function addGamete() { const k = gamete(P.n, rnd, P.cross); gam[k] = (gam[k] || 0) + 1; }
function newField() { field = []; const W = 9, H = 6; for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const div = rnd() < miModel(P.dist + j * 0.02) / 100; let ph = "interphase"; if (div) { let u = rnd() * MITOSIS; for (const [n, d] of PHASES.slice(3)) { u -= d; if (u <= 0) { ph = n; break; } } } field.push({ i, j, ph, a: rnd() * 6.28 }); } }
function countField() { const div = field.filter(c => c.ph !== "interphase").length; counts.push({ d: P.dist, div, tot: field.length, phases: PHASES.slice(3).map(([n]) => field.filter(c => c.ph === n).length) }); if (counts.length > 30) counts.shift(); ui.tip(`${div} of ${field.length} cells dividing: mitotic index ${(div / field.length * 100).toFixed(1)}%`, 3000); }
function set(o) {
  Object.assign(P, o); ctl.view.set(P.view); ctl.kind.set(P.kind); ctl.pos.set(P.pos); ctl.dist.set(P.dist); ctl.n.set(P.n); ctl.cross.set(P.cross);
  for (const k in grp) grp[k].style.display = k === P.view ? "" : "none";
  if (P.view === "dna" && o.view) { gene = HBB; step = 0; } if (P.view === "squash") newField(); if (P.view === "meiosis") gam = {};
  relabel({ dna: ["codon being read", "protein so far", "mutation type", "length of protein"], mitosis: ["phase", "time in the cycle", "DNA per cell", "chromosomes"], squash: ["distance from tip", "cells dividing here", "mitotic index (this field)", "fields counted"], meiosis: ["pairs (n)", "possible kinds 2ⁿ", "gametes made", "kinds seen"] }[P.view]);
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function drawDNA(c, w, h) {
  const n = Math.min(gene.length, 54), bw = Math.min(16, (w - 60) / n), x0 = 30, y0 = 60;
  // the double helix, drawn flat as a twisted ladder: coding strand on top, template strand below
  for (let i = 0; i < n; i++) {
    const x = x0 + i * bw, ph = i * 0.6 + t * 0.6, dy = 16 * Math.sin(ph), b = gene[i], tb = PAIR[b];
    c.strokeStyle = "rgba(255,255,255,0.25)"; c.beginPath(); c.moveTo(x + bw / 2, y0 + 30 + dy); c.lineTo(x + bw / 2, y0 + 70 - dy); c.stroke();
    c.fillStyle = BASECOL[b]; c.fillRect(x + 1, y0 + 30 + dy - 6, bw - 2, 12); c.fillStyle = BASECOL[tb]; c.fillRect(x + 1, y0 + 70 - dy - 6, bw - 2, 12);
    if (bw >= 12) { TX(c, b, x + bw / 2, y0 + 30 + dy + 4, "#0b1020", "center", "600 9px"); TX(c, tb, x + bw / 2, y0 + 70 - dy + 4, "#0b1020", "center", "600 9px"); }
    if (gene !== HBB && b !== HBB[i]) { c.strokeStyle = "#fff"; c.strokeRect(x, y0 + 30 + dy - 8, bw, 16); }
  }
  TX(c, "coding strand", x0, y0 + 8, "#aab6cc", "left", "11px"); TX(c, "template strand", x0, y0 + 102, "#aab6cc", "left", "11px");
  // transcription: mRNA built along the gene, up to the current step
  const cod = Math.floor(step), y1 = y0 + 140; TX(c, "mRNA (transcription)", x0, y1 - 8, "#ffb347", "left", "600 12px");
  const nm = Math.min(gene.length, Math.floor(step * 3 + 3)); for (let i = 0; i < nm; i++) { const b = gene[i] === "T" ? "U" : gene[i]; c.fillStyle = BASECOL[b]; c.fillRect(x0 + i * bw + 1, y1, bw - 2, 14); if (bw >= 12) TX(c, b, x0 + i * bw + bw / 2, y1 + 11, "#0b1020", "center", "600 9px"); }
  // translation: the ribosome over the current codon, the tRNA and the growing chain
  const prot = translate(gene), shown = prot.slice(0, Math.min(prot.length, cod + 1)), rx = x0 + Math.min(cod, Math.floor(gene.length / 3) - 1) * 3 * bw;
  c.fillStyle = "rgba(201,160,255,0.25)"; c.fillRect(rx - 4, y1 - 4, 3 * bw + 8, 40); TX(c, "ribosome", rx + 1.5 * bw, y1 + 50, "#c9a0ff", "center", "11px");
  const y2 = y1 + 90; TX(c, "protein (translation)", x0, y2 - 10, "#7fe3a0", "left", "600 12px");
  shown.forEach((a, i) => { const x = x0 + i * 46; c.fillStyle = AACOL[a]; c.beginPath(); c.arc(x + 18, y2 + 14, 16, 0, 6.3); c.fill(); TX(c, AA3[a], x + 18, y2 + 18, "#0b1020", "center", "600 10px"); if (i) { c.strokeStyle = "#7d8aa5"; c.beginPath(); c.moveTo(x - 10, y2 + 14); c.lineTo(x + 2, y2 + 14); c.stroke(); } });
  // the normal protein for comparison
  const y3 = y2 + 56; TX(c, "normal β-globin (first 18 amino acids)", x0, y3 - 8, "#7d8aa5", "left", "11px");
  translate(HBB).forEach((a, i) => { const x = x0 + i * 46, diff = shown[i] && shown[i] !== a; c.fillStyle = AACOL[a]; c.globalAlpha = 0.5; c.beginPath(); c.arc(x + 18, y3 + 12, 12, 0, 6.3); c.fill(); c.globalAlpha = 1; TX(c, AA3[a], x + 18, y3 + 16, "#0b1020", "center", "9px"); if (diff) { c.strokeStyle = "#ff5d6c"; c.lineWidth = 2; c.beginPath(); c.arc(x + 18, y3 + 12, 15, 0, 6.3); c.stroke(); c.lineWidth = 1; } });
  TX(c, "colours: hydrophobic (orange), polar (green), acidic (red), basic (blue), special (purple)", x0, h - 14, "#7d8aa5", "left", "11px");
}
// a chromosome: two chromatids (or one), coloured by pair, from mum (dark) or dad (light)
function chromo(c, x, y, len, ang, col, two) { c.save(); c.translate(x, y); c.rotate(ang); c.strokeStyle = col; c.lineWidth = 6; c.lineCap = "round"; if (two) { c.beginPath(); c.moveTo(-3, -len / 2); c.lineTo(-3, len / 2); c.moveTo(3, -len / 2); c.lineTo(3, len / 2); c.stroke(); c.fillStyle = "#fff"; c.beginPath(); c.arc(0, 0, 3, 0, 6.3); c.fill(); } else { c.beginPath(); c.moveTo(0, -len / 2); c.lineTo(0, len / 2); c.stroke(); } c.restore(); }
const PCOL = [["#d0453a", "#ff9a8f"], ["#3a7dd0", "#8fc0ff"], ["#3aa66b", "#9be8b8"], ["#c9a000", "#ffe066"]];
function phaseAt(tt) { let u = tt % CYCLE; for (const [n, d] of PHASES) { if (u < d) return [n, u / d]; u -= d; } return ["G1", 0]; }
function drawMitosis(c, w, h) {
  const [ph, f] = phaseAt(cellT), cx = w * 0.4, cy = h * 0.5, R = Math.min(w, h) * 0.3, two = !["G1", "telophase", "cytokinesis"].includes(ph) && !(ph === "anaphase" && f > 0.3);
  const pinch = ph === "cytokinesis" ? f : 0;
  c.strokeStyle = "#7fe3a0"; c.lineWidth = 3; if (pinch > 0) { c.beginPath(); c.ellipse(cx - R * 0.55 * pinch, cy, R * (1 - 0.4 * pinch), R * 0.9, 0, 0, 6.3); c.stroke(); c.beginPath(); c.ellipse(cx + R * 0.55 * pinch, cy, R * (1 - 0.4 * pinch), R * 0.9, 0, 0, 6.3); c.stroke(); } else { c.beginPath(); c.ellipse(cx, cy, R * 1.1, R * 0.9, 0, 0, 6.3); c.stroke(); }
  const nuc = ["G1", "S", "G2"].includes(ph) || (ph === "prophase" && f < 0.6) || ph === "telophase" || ph === "cytokinesis";
  if (nuc && !["telophase", "cytokinesis"].includes(ph)) { c.strokeStyle = "#56607a"; c.setLineDash([4, 3]); c.beginPath(); c.arc(cx, cy, R * 0.45, 0, 6.3); c.stroke(); c.setLineDash([]); }
  if (["metaphase", "anaphase"].includes(ph)) { c.strokeStyle = "rgba(255,255,255,0.18)"; for (let k = -4; k <= 4; k++) { c.beginPath(); c.moveTo(cx - R, cy); c.lineTo(cx, cy + k * 12); c.lineTo(cx + R, cy); c.stroke(); } }
  for (let p = 0; p < 2; p++) for (let m = 0; m < 2; m++) {
    const col = PCOL[p][m], len = p ? 30 : 46, k = p * 2 + m;
    if (["G1", "S", "G2"].includes(ph)) { chromo(c, cx - 40 + k * 26, cy + 10 * Math.sin(k * 2 + t), len * 0.8, 0.3 * Math.sin(k + t * 0.3), col, ph === "G2" || (ph === "S" && f > 0.5)); }
    else if (ph === "prophase") chromo(c, cx - 50 + k * 34, cy - 10 + 18 * Math.sin(k * 1.7), len, k * 0.7, col, true);
    else if (ph === "metaphase") chromo(c, cx, cy - 60 + k * 40, len, Math.PI / 2, col, true);
    else if (ph === "anaphase") { const s = R * 0.75 * f; chromo(c, cx - s, cy - 60 + k * 40, len, Math.PI / 2, col, false); chromo(c, cx + s, cy - 60 + k * 40, len, Math.PI / 2, col, false); }
    else { for (const sgn of [-1, 1]) chromo(c, cx + sgn * R * (0.6 + 0.0 * pinch) + (k - 1.5) * 12, cy - 30 + k * 20, len * 0.8, 0.2, col, false); }
  }
  TX(c, ph, cx, cy - R - 24, "#ffd166", "center", "600 16px");
  TX(c, { G1: "G1: the cell grows and makes proteins", S: "S phase: DNA is copied: each chromosome becomes two chromatids", G2: "G2: more growth; the cell checks the copied DNA", prophase: "Prophase: chromosomes coil up and become visible; the nuclear membrane breaks down", metaphase: "Metaphase: chromosomes line up across the middle on the spindle", anaphase: "Anaphase: chromatids are pulled to opposite ends", telophase: "Telophase: two new nuclei form", cytokinesis: "Cytokinesis: the cytoplasm divides: two identical cells" }[ph], 20, h - 16, "#aab6cc", "left", "13px");
}
function drawSquash(c, w, h) {
  const W = 9, H = 6, cw = Math.min((w - 40) / W, (h - 80) / H), ox = (w - W * cw) / 2, oy = 40;
  for (const q of field) {
    const x = ox + q.i * cw, y = oy + q.j * cw; c.fillStyle = "#d9b8c8"; c.strokeStyle = "#8a5a74"; c.lineWidth = 1.5; c.fillRect(x + 1, y + 1, cw - 2, cw * 0.95 - 2); c.strokeRect(x + 1, y + 1, cw - 2, cw * 0.95 - 2);
    const mx = x + cw / 2, my = y + cw * 0.47; c.fillStyle = "#5a1f45"; c.strokeStyle = "#5a1f45"; c.lineWidth = 3;
    if (q.ph === "interphase") { c.beginPath(); c.arc(mx, my, cw * 0.18, 0, 6.3); c.fill(); }
    else if (q.ph === "prophase") { for (let k = 0; k < 5; k++) { c.beginPath(); c.moveTo(mx - 12 + k * 5, my - 10); c.quadraticCurveTo(mx - 6 + k * 3, my, mx - 10 + k * 5, my + 10); c.stroke(); } }
    else if (q.ph === "metaphase") { c.beginPath(); c.moveTo(mx - 3, my - cw * 0.3); c.lineTo(mx - 3, my + cw * 0.3); c.moveTo(mx + 3, my - cw * 0.3); c.lineTo(mx + 3, my + cw * 0.3); c.stroke(); }
    else if (q.ph === "anaphase") { c.beginPath(); c.moveTo(mx - cw * 0.25, my - cw * 0.25); c.lineTo(mx - cw * 0.25, my + cw * 0.25); c.moveTo(mx + cw * 0.25, my - cw * 0.25); c.lineTo(mx + cw * 0.25, my + cw * 0.25); c.stroke(); }
    else { c.beginPath(); c.arc(mx - cw * 0.25, my, cw * 0.12, 0, 6.3); c.arc(mx + cw * 0.25, my, cw * 0.12, 0, 6.3); c.fill(); if (q.ph === "cytokinesis") { c.strokeStyle = "#8a5a74"; c.beginPath(); c.moveTo(mx, y + 2); c.lineTo(mx, y + cw * 0.93); c.stroke(); } }
  }
  TX(c, `Onion root tip, stained, ×400 · ${P.dist.toFixed(1)} mm from the tip`, ox, 26, "#eef2f8", "left", "600 13px");
  TX(c, "Dividing cells have dark, visible chromosomes; interphase cells show a round nucleus.", ox, h - 14, "#aab6cc", "left", "12px");
}
function drawMeiosis(c, w, h) {
  // one cell going through meiosis I and II, then the collected gametes
  const phase = Math.floor(meiT) % 5, cx = w * 0.3, cy = h * 0.5, R = Math.min(w * 0.22, h * 0.36);
  const steps = ["Interphase: DNA copied", "Meiosis I: pairs line up at random (independent assortment)", "Meiosis I: pairs separate", "Meiosis II: chromatids separate", "Four haploid gametes, all different"];
  c.strokeStyle = "#7fe3a0"; c.lineWidth = 2;
  if (phase < 3) { c.beginPath(); c.ellipse(cx, cy, R, R * 0.8, 0, 0, 6.3); c.stroke(); }
  for (let p = 0; p < P.n; p++) {
    const flip = meiOri[p], y = cy - R * 0.5 + p * R / Math.max(1, P.n - 1) * (P.n > 1 ? 1 : 0), len = 34 - p * 5;
    const cm = PCOL[p][flip ? 1 : 0], cf = PCOL[p][flip ? 0 : 1];
    if (phase === 0) { chromo(c, cx - 40 + p * 30, cy - 20, len, 0.3, PCOL[p][0], true); chromo(c, cx - 30 + p * 30, cy + 25, len, -0.3, PCOL[p][1], true); }
    else if (phase === 1) { chromo(c, cx - 12, y, len, 0, cm, true); chromo(c, cx + 12, y, len, 0, cf, true); }
    else if (phase === 2) { chromo(c, cx - R * 0.6, y, len, 0, cm, true); chromo(c, cx + R * 0.6, y, len, 0, cf, true); }
  }
  if (phase >= 3) for (let q = 0; q < 4; q++) { const gx = cx + (q % 2 ? 1 : -1) * R * 0.55, gy = cy + (q < 2 ? -1 : 1) * R * 0.45; c.strokeStyle = "#7fe3a0"; c.beginPath(); c.arc(gx, gy, R * 0.32, 0, 6.3); c.stroke(); for (let p = 0; p < P.n; p++) chromo(c, gx - 15 + p * 12, gy, 26 - p * 4, 0, PCOL[p][(meiOri[p] ? 1 : 0) ^ (q % 2)], false); }
  TX(c, steps[phase], cx, cy + R + 30, "#ffd166", "center", "600 13px");
  TX(c, `2n = ${2 * P.n}: dark = from the mother, light = from the father`, 20, 26, "#aab6cc", "left", "12px");
}
function draw() { const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); ({ dna: drawDNA, mitosis: drawMitosis, squash: drawSquash, meiosis: drawMeiosis })[P.view](c, w, h); }

// ---------------- Charts ----------------
function charts() {
  if (P.view === "dna") {
    const cnt = b => [...gene].filter(x => x === b).length, cntT = b => [...gene].filter(x => PAIR[x] === b).length;
    chA.opts.title = "Base composition (both strands)"; chA.opts.xLabel = ""; chA.opts.yLabel = "number of bases"; chA.opts.xFmt = whole(v => "ATGC"[Math.round(v)] || "");
    chA.draw([..."ATGC"].map((b, i) => ({ pts: [[i, cnt(b) + cntT(b)]], type: "bars", w: 0.6, color: BASECOL[b] })), { xMin: -0.6, xMax: 3.6, yMin: 0 });
    chB.opts.title = "Mutations you have made"; chB.opts.xLabel = ""; chB.opts.yLabel = "number"; chB.opts.xFmt = whole(v => ["silent", "missense", "nonsense", "frameshift"][Math.round(v)] || "");
    chB.draw([{ pts: ["silent", "missense", "nonsense", "frameshift"].map((k, i) => [i, tried[k]]), type: "bars", w: 0.6, color: "#c9a0ff" }], { xMin: -0.6, xMax: 3.6, yMin: 0 });
    const prot = translate(gene), cod = Math.min(Math.floor(step), Math.floor(gene.length / 3) - 1), codon = gene.slice(cod * 3, cod * 3 + 3);
    read.set("a", `${codon} → mRNA ${codon.replace(/T/g, "U")} → ${AA3[CODE[codon]] || "–"}`); read.set("b", prot.slice(0, cod + 1).map(a => AA3[a]).join("-")); read.set("c", gene === HBB ? "none" : classify(HBB, gene)); read.set("d", prot.filter(a => a !== "*").length + " amino acids");
    ui.hud(gene === HBB ? "Normal β-globin: transcription then translation" : `Mutated gene: ${classify(HBB, gene)}`);
  } else if (P.view === "mitosis") {
    const pts = []; for (let tt = 0; tt <= 2 * CYCLE; tt += 0.1) { const [ph, f] = phaseAt(tt); pts.push([tt, ph === "S" ? 2 + 2 * f : ["G2", "prophase", "metaphase", "anaphase", "telophase"].includes(ph) ? 4 : ph === "cytokinesis" ? 4 - 2 * f : 2]); }
    chA.opts.title = "DNA per cell"; chA.opts.xLabel = "time (hours)"; chA.opts.yLabel = "DNA (relative)"; chA.opts.xFmt = null;
    chA.draw([{ pts, color: "#6fb1ff", label: "2C → 4C → 2C" }], { xMin: 0, xMax: 2 * CYCLE, yMin: 0, yMax: 5, vlines: [{ x: cellT % (2 * CYCLE), color: "#ffd166", label: "now" }] });
    chB.opts.title = "Time in each phase"; chB.opts.xLabel = ""; chB.opts.yLabel = "hours"; chB.opts.xFmt = whole(v => (PHASES[Math.round(v)] || [""])[0].slice(0, 5));
    chB.draw([{ pts: PHASES.map((p, i) => [i, p[1]]), type: "bars", w: 0.6, color: "#7fe3a0" }], { xMin: -0.6, xMax: PHASES.length - 0.4, yMin: 0 });
    const [ph] = phaseAt(cellT); read.set("a", ph); read.set("b", (cellT % CYCLE).toFixed(1) + " h of " + CYCLE.toFixed(0) + " h"); read.set("c", ph === "S" ? "being copied" : ["G1", "telophase", "cytokinesis"].includes(ph) ? "2C (per new cell)" : "4C"); read.set("d", "2n = 4");
    ui.hud("Mitosis makes two genetically identical cells");
  } else if (P.view === "squash") {
    const md = []; for (let d = 0; d <= 3; d += 0.05) md.push([d, miModel(d)]);
    chA.opts.title = "Mitotic index along the root"; chA.opts.xLabel = "distance from the tip (mm)"; chA.opts.yLabel = "mitotic index (%)"; chA.opts.xFmt = null;
    chA.draw([{ pts: md, color: "#56607a", dash: [5, 4], label: "model" }, { pts: counts.map(q => [q.d, q.div / q.tot * 100]), type: "dots", r: 5, color: "#ffd166", label: "your counts" }], { xMin: 0, xMax: 3, yMin: 0, yMax: 20 });
    const tot = counts.reduce((s, q) => s + q.tot, 0) || 1, ph = PHASES.slice(3).map(([n], i) => counts.reduce((s, q) => s + q.phases[i], 0));
    chB.opts.title = ui.level === "adv" ? "Phase durations from your counts (× 20 h cycle)" : "Cells counted in each phase"; chB.opts.xLabel = ""; chB.opts.yLabel = ui.level === "adv" ? "hours" : "cells"; chB.opts.xFmt = whole(v => (PHASES[Math.round(v) + 3] || [""])[0].slice(0, 5));
    chB.draw([{ pts: ph.map((n, i) => [i, ui.level === "adv" ? n / tot * CYCLE : n]), type: "bars", w: 0.6, color: "#c9a0ff" }], { xMin: -0.6, xMax: 4.6, yMin: 0 });
    const div = field.filter(q => q.ph !== "interphase").length;
    read.set("a", P.dist.toFixed(1) + " mm"); read.set("b", `${div} of ${field.length}`); read.set("c", (div / field.length * 100).toFixed(1) + "%"); read.set("d", counts.length);
    ui.hud(P.dist < 1.2 ? "The meristem: cells here divide" : "Elongation zone: cells grow longer instead of dividing");
  } else {
    const keys = Object.keys(gam).sort(), tot = keys.reduce((s, k) => s + gam[k], 0);
    chA.opts.title = P.cross ? "Gametes (each is a new mix)" : "Kinds of gamete made"; chA.opts.xLabel = P.cross ? "" : "gamete (M = mother's chromosome, F = father's, one per pair)"; chA.opts.yLabel = "number"; chA.opts.xFmt = P.cross ? null : whole(v => keys[Math.round(v)] || "");
    chA.draw(P.cross ? [{ pts: [[0, keys.length]], type: "bars", w: 0.6, color: "#c9a0ff", label: "different gametes" }, { pts: [[1, tot]], type: "bars", w: 0.6, color: "#56607a", label: "gametes made" }] : [{ pts: keys.map((k, i) => [i, gam[k]]), type: "bars", w: 0.6, color: "#c9a0ff" }], { xMin: -0.6, xMax: Math.max(P.cross ? 2 : 1, keys.length) - 0.4, yMin: 0 });
    const pts = []; for (let n = 1; n <= 23; n++) pts.push([n, Math.log10(Math.pow(2, n))]);
    chB.opts.title = "Kinds of gamete: 2ⁿ (log scale)"; chB.opts.xLabel = "pairs of chromosomes n"; chB.opts.yLabel = "log₁₀ (kinds)"; chB.opts.xFmt = null;
    chB.draw([{ pts, color: "#7fe3a0", label: "2ⁿ" }, { pts: [[P.n, Math.log10(Math.pow(2, P.n))], [23, Math.log10(Math.pow(2, 23))]], type: "dots", r: 6, color: "#ffd166", label: "you · humans (8.4 million)" }], { xMin: 0, xMax: 24, yMin: 0 });
    read.set("a", P.n); read.set("b", Math.pow(2, P.n)); read.set("c", tot); read.set("d", keys.length);
    ui.hud("Independent assortment: each pair lines up at random");
  }
}

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => {
  if (!(dt > 0)) return; t += dt;
  if (P.view === "dna") step = Math.min(Math.floor(gene.length / 3) - 0.01, step + dt * speed * 0.7);
  if (P.view === "mitosis") { const [ph] = phaseAt(cellT); cellT += dt * speed * (["G1", "S", "G2"].includes(ph) ? 2.5 : 0.25); }
  if (P.view === "meiosis") { const before = Math.floor(meiT); meiT += dt * speed * 0.5; if (Math.floor(meiT) % 5 === 0 && Math.floor(meiT) !== before) { meiOri = Array.from({ length: P.n }, () => rnd() < 0.5); addGamete(); } }
}, () => { draw(); if (frame++ % 5 === 0) charts(); });
meiOri = [false, true, false, true];
set({ view: "dna" });
ui.tip("Four views at the top of the controls: DNA and proteins, the cell cycle, a root tip squash and meiosis.", 7000);
