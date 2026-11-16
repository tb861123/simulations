/* =====================================================================
   INHERITANCE AND GENETICS
   Every individual carries two copies (alleles) of each gene, one from
   each parent. Each parent passes on ONE of its two alleles, chosen at
   random, in each sex cell (gamete). A dominant allele shows whenever it
   is present; a recessive one only when there are two copies.
   Because gametes are random, offspring ratios (3 : 1, 1 : 1, 9 : 3 : 3 : 1)
   are probabilities: real families and real vials of flies only come
   close, and closer the more offspring there are.

   Three views:
     * Fruit-fly lab: breed Drosophila and count the offspring
       (vestigial wings, ebony and black bodies, white eyes)
     * Punnett squares: pea plants, cystic fibrosis, roan cattle, sex,
       and at A level blood groups, haemophilia, dihybrids and epistasis
     * Family pedigrees: who is affected, and who is a carrier
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";   // label category axes only at whole numbers

// ---- flies: genes vg (wings, chromosome 2), b (body, chromosome 2, linked to vg), e (body, chromosome 3), w (eyes, X chromosome) ----
// a fly: { sex: "F" | "M", c2: [hap, hap] (hap = { vg, b }), c3: [e, e], X: [w, w (or null for a male's Y)] } ; capital letter = dominant allele
function gamete(f, o, r) {
  const i = r() < 0.5 ? 0 : 1, h = Object.assign({}, f.c2[i]);
  if (r() < o.rf / 100) h.b = f.c2[1 - i].b;                                   // crossing over between vg and b during meiosis
  const xi = f.sex === "F" ? (r() < 0.5 ? 0 : 1) : (r() < 0.5 ? 0 : 1);
  return { c2: h, e: f.c3[r() < 0.5 ? 0 : 1], X: f.X[xi] };                     // a male's gamete carries his X or his Y (null)
}
function mate(mum, dad, o, r) { const a = gamete(mum, o, r), b = gamete(dad, o, r), sex = b.X == null ? "M" : "F"; return { sex, c2: [a.c2, b.c2], c3: [a.e, b.e], X: sex === "M" ? [a.X, null] : [a.X, b.X] }; }
// phenotype: what the fly looks like (for the genes this cross is about)
function pheno(f, cross) {
  const p = [], has = (arr, A) => arr.some(x => x === A);
  if (cross !== "sex") p.push(has(f.c2.map(h => h.vg), "V") ? "long wings" : "vestigial wings");
  if (cross === "di") p.push(has(f.c3, "E") ? "grey body" : "ebony body");
  if (cross === "linked") p.push(has(f.c2.map(h => h.b), "B") ? "grey body" : "black body");
  if (cross === "sex") { p.push(f.X.some(x => x === "W") ? "red eyes" : "white eyes"); p.push(f.sex === "F" ? "female" : "male"); }
  return p.join(", ");
}
// the parent genotypes on offer for each cross (as text, with how to build them)
const FLY = (sex, vg1, vg2, e1 = "E", e2 = "E", w1 = "W", w2 = "W", b1 = "B", b2 = "B") => ({ sex, c2: [{ vg: vg1, b: b1 }, { vg: vg2, b: b2 }], c3: [e1, e2], X: sex === "M" ? [w1, null] : [w1, w2] });
const CROSSES = {
  mono: { name: "Wings (monohybrid)", lvl: "std", F: { VV: FLY("F", "V", "V"), Vv: FLY("F", "V", "v"), vv: FLY("F", "v", "v") }, M: { VV: FLY("M", "V", "V"), Vv: FLY("M", "V", "v"), vv: FLY("M", "v", "v") } },
  di: { name: "Wings and ebony (dihybrid)", lvl: "adv", F: { VVEE: FLY("F", "V", "V"), VvEe: FLY("F", "V", "v", "E", "e"), vvee: FLY("F", "v", "v", "e", "e") }, M: { VVEE: FLY("M", "V", "V"), VvEe: FLY("M", "V", "v", "E", "e"), vvee: FLY("M", "v", "v", "e", "e") } },
  sex: { name: "White eyes (sex-linked)", lvl: "adv", F: { "XᵂXᵂ": FLY("F", "V", "V", "E", "E", "W", "W"), "XᵂXʷ": FLY("F", "V", "V", "E", "E", "W", "w"), "XʷXʷ": FLY("F", "V", "V", "E", "E", "w", "w") }, M: { "XᵂY": FLY("M", "V", "V", "E", "E", "W"), "XʷY": FLY("M", "V", "V", "E", "E", "w") } },
  linked: { name: "Wings and black body (linked)", lvl: "adv", F: { "VB/vb": FLY("F", "V", "v", "E", "E", "W", "W", "B", "b"), "Vb/vB": FLY("F", "V", "v", "E", "E", "W", "W", "b", "B"), "vb/vb": FLY("F", "v", "v", "E", "E", "W", "W", "b", "b") }, M: { "vb/vb": FLY("M", "v", "v", "E", "E", "W", "W", "b", "b"), "VB/vb": FLY("M", "V", "v", "E", "E", "W", "W", "B", "b") } }
};
// expected proportions, by breeding a very large number of offspring with a fixed generator (exact enough to compare with)
function expected(mum, dad, o, cross) { const r = K.rng(12345), cnt = {}; for (let k = 0; k < 40000; k++) { const p = pheno(mate(mum, dad, o, r), cross); cnt[p] = (cnt[p] || 0) + 1; } for (const k in cnt) cnt[k] /= 40000; return cnt; }
// chi-squared test against the Mendelian expectation
function chi2(obs, exp, n) { let x = 0, df = -1; for (const k of new Set([...Object.keys(exp), ...Object.keys(obs)])) { const E = (exp[k] || 0) * n; if (E > 0) { x += ((obs[k] || 0) - E) ** 2 / E; df++; } } return { x, df: Math.max(1, df) }; }
function gammaP(s, x) { if (x <= 0) return 0; let sum = 1 / s, term = sum; for (let n = 1; n < 200; n++) { term *= x / (s + n); sum += term; if (term < sum * 1e-12) break; } return Math.exp(-x + s * Math.log(x) - lgamma(s)) * sum; }
function lgamma(z) { const g = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]; let x = z, y = z, t = x + 5.5; t -= (x + 0.5) * Math.log(t); let s = 1.000000000190015; for (const c of g) s += c / ++y; return -t + Math.log(2.5066282746310005 * s / x); }
const pValue = (x, df) => 1 - gammaP(df / 2, x / 2), CRIT = { 1: 3.84, 2: 5.99, 3: 7.81, 4: 9.49, 5: 11.07 };

// ---- Punnett squares: each trait gives the gametes of each parent and how a genotype looks ----
const TRAITS = {
  pea: { name: "Pea plant height", lvl: "std", a: ["T", "t"], b: ["T", "t"], show: g => g.includes("T") ? "tall" : "dwarf", col: { tall: "#7fe3a0", dwarf: "#c9a96a" } },
  cf: { name: "Cystic fibrosis (both parents carriers)", lvl: "std", a: ["F", "f"], b: ["F", "f"], show: g => g === "ff" ? "cystic fibrosis" : g.includes("f") ? "carrier (unaffected)" : "unaffected", col: { "cystic fibrosis": "#ff5d6c", "carrier (unaffected)": "#ffd166", unaffected: "#7fe3a0" } },
  roan: { name: "Roan cattle (codominance)", lvl: "std", a: ["R", "W"], b: ["R", "W"], show: g => g === "RR" ? "red" : g === "WW" ? "white" : "roan", col: { red: "#c4566b", white: "#eef2f8", roan: "#d9a0a8" } },
  sex: { name: "Boy or girl? (sex chromosomes)", lvl: "std", a: ["X", "X"], b: ["X", "Y"], show: g => g.includes("Y") ? "boy (XY)" : "girl (XX)", col: { "boy (XY)": "#6fb1ff", "girl (XX)": "#ff8ab8" } },
  abo: { name: "ABO blood groups (Iᴬi × Iᴮi)", lvl: "adv", a: ["A", "o"], b: ["B", "o"], show: g => { const s = g.split("").sort().join(""); return s === "AB" ? "group AB" : s.includes("A") ? "group A" : s.includes("B") ? "group B" : "group O"; }, col: { "group AB": "#c58cff", "group A": "#ff8a70", "group B": "#6fb1ff", "group O": "#eef2f8" } },
  haem: { name: "Haemophilia (carrier mother × normal father)", lvl: "adv", a: ["Xᴴ", "Xʰ"], b: ["Xᴴ", "Y"], show: g => g.includes("Y") ? (g.includes("ʰ") ? "boy with haemophilia" : "unaffected boy") : (g.includes("ʰ") ? "carrier girl" : "unaffected girl"), col: { "boy with haemophilia": "#ff5d6c", "unaffected boy": "#6fb1ff", "carrier girl": "#ffd166", "unaffected girl": "#ff8ab8" } },
  dihy: { name: "Pea shape and colour (RrYy × RrYy)", lvl: "adv", a: ["RY", "Ry", "rY", "ry"], b: ["RY", "Ry", "rY", "ry"], show: g => (g.includes("R") ? "round" : "wrinkled") + ", " + (g.includes("Y") ? "yellow" : "green"), col: { "round, yellow": "#ffd166", "round, green": "#7fe3a0", "wrinkled, yellow": "#c9a96a", "wrinkled, green": "#3fae5a" } },
  lab: { name: "Labrador coat (BbEe × BbEe, epistasis)", lvl: "adv", a: ["BE", "Be", "bE", "be"], b: ["BE", "Be", "bE", "be"], show: g => !g.includes("E") ? "yellow (ee hides B)" : g.includes("B") ? "black" : "chocolate", col: { black: "#222", chocolate: "#7b4a2a", "yellow (ee hides B)": "#e8c66a" } }
};
// write a genotype the usual way: dominant (capital) allele first, genes in order (RrYy rather than RYry)
const pair = (a, b) => /^[a-z]$/.test(a) && /^[A-Z]$/.test(b) ? b + a : a + b;
const combine = (x, y) => x.length === 2 && y.length === 2 && /^[A-Za-z]{2}$/.test(x + y.slice(0, 0)) && !x.startsWith("X") ? pair(x[0], y[0]) + pair(x[1], y[1]) : pair(x, y);

// ---- family pedigrees ----
const DIS = { cf: { name: "Cystic fibrosis (autosomal recessive)", kind: "rec" }, poly: { name: "Polydactyly (autosomal dominant)", kind: "dom" }, haem: { name: "Haemophilia A (X-linked recessive)", kind: "x", lvl: "adv" } };
function family(kind, r) {
  // a three-generation family; alleles: 1 = the disease allele
  const pick = () => r() < (kind === "dom" ? 0.12 : 0.3) ? 1 : 0, person = (sex, g) => ({ sex, g }), child = (m, f) => { const sex = r() < 0.5 ? "F" : "M"; if (kind === "x") return person(sex, sex === "M" ? [m.g[r() < 0.5 ? 0 : 1], null] : [m.g[r() < 0.5 ? 0 : 1], f.g[0]]); return person(sex, [m.g[r() < 0.5 ? 0 : 1], f.g[r() < 0.5 ? 0 : 1]]); };
  const founder = sex => kind === "x" ? person(sex, sex === "M" ? [r() < 0.15 ? 1 : 0, null] : [pick(), pick()]) : person(sex, [pick(), pick()]);
  const I = [founder("M"), founder("F"), founder("M"), founder("F")];
  const kids1 = [0, 1, 2].map(() => child(I[1], I[0])), kids2 = [0, 1, 2].map(() => child(I[3], I[2]));
  // the two families' children: one from each marries (make it a man and a woman)
  kids1[2].sex = "M"; if (kind === "x") kids1[2].g = [I[1].g[r() < 0.5 ? 0 : 1], null]; kids2[0].sex = "F"; if (kind === "x") kids2[0].g = [I[3].g[r() < 0.5 ? 0 : 1], I[2].g[0]];
  const III = [0, 1, 2, 3].map(() => child(kids2[0], kids1[2]));
  return { I, II: kids1.concat(kids2), III, dad: kids1[2], mum: kids2[0] };
}
const affected = (p, kind) => kind === "dom" ? p.g.includes(1) : kind === "rec" ? p.g[0] === 1 && p.g[1] === 1 : p.sex === "M" ? p.g[0] === 1 : p.g[0] === 1 && p.g[1] === 1;
const carrier = (p, kind) => kind !== "dom" && !affected(p, kind) && p.g.includes(1);
function nextChildRisk(mum, dad, kind) { // exact, from the parents' genotypes
  let aff = 0, n = 0; for (const a of mum.g) for (const b of (kind === "x" ? [dad.g[0], null] : dad.g)) { const sex = kind === "x" ? (b == null ? "M" : "F") : "F"; const c = { sex, g: kind === "x" ? (b == null ? [a, null] : [a, b]) : [a, b] }; if (affected(c, kind)) aff++; n++; } return aff / n;
}

// ---------------- The page ----------------
const P = { mode: "lab", cross: "mono", F: "Vv", M: "Vv", n: 100, rf: 17, trait: "pea", dis: "cf", show: false };
let rnd = K.rng(Date.now() % 99991 + 53), speed = 1, brood = [], shown = 0, exp = {}, gen = 1, parents = null, pun = [], fam = null;
const ui = K.app({
  title: "Inheritance and Genetics", subject: "Biology",
  blurb: "Breed fruit flies, fill Punnett squares and read family trees: Mendel's ratios and chance",
  reset: () => set({ mode: P.mode }),
  levels: { std: "Standard (iGCSE)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel International GCSE Biology (4BI1) 3(b) inheritance: genes and alleles, dominant and recessive, homozygous and heterozygous, genotype and phenotype, codominance, monohybrid crosses and Punnett squares, ratios and probabilities, pedigrees, sex determination.", adv: "OCR A level Biology A (H420) 6.1.2 patterns of inheritance: dihybrid crosses, codominance, multiple alleles, sex linkage, autosomal linkage and recombination, epistasis, and the chi-squared test." } },
  missions: [
    { title: "A 3 : 1 ratio", q: "Cross two flies that both carry one allele for vestigial wings (Vv × Vv). Predict the ratio of long to vestigial wings, then breed 100. How close is it to 3 : 1?", hint: "Each parent's gametes are half V, half v. Offspring: ¼ VV, ½ Vv, ¼ vv, so ¾ have long wings (V is dominant) and ¼ vestigial: 3 : 1. With 100 flies you might get 71 : 29 or 78 : 22. Breed 1000 and the ratio gets closer: chance evens out over larger numbers.", setup() { set({ mode: "lab", cross: "mono", F: "Vv", M: "Vv" }); } },
    { title: "A test cross", q: "A long-winged fly could be VV or Vv. How can you find out? Cross it with a vestigial (vv) fly and look at the offspring.", hint: "If it is VV, every offspring gets a V: all long wings. If it is Vv, half the offspring get v from it and v from the vv parent: half vestigial (1 : 1). A test cross with the homozygous recessive reveals the unknown genotype.", setup() { set({ mode: "lab", cross: "mono", F: "Vv", M: "vv" }); } },
    { title: "Punnett squares", q: "Fill a Punnett square for two pea plants that are both Tt. Then let offspring appear one at a time. Is a 3 : 1 ratio guaranteed in a family of 4?", hint: "The square gives the probabilities: each offspring has a 3 in 4 chance of being tall. A family of 4 could have 4 tall, or 2 dwarf, by chance. Only over many offspring does the ratio approach 3 : 1.", setup() { set({ mode: "pun", trait: "pea" }); } },
    { title: "Codominance", q: "Cross two roan cattle (RW × RW). What colours appear, and in what ratio? Why is this different from the pea cross?", hint: "Neither allele is dominant: RW cattle show both (red and white hairs mixed: roan). The ratio is 1 red : 2 roan : 1 white, and every genotype has its own phenotype.", setup() { set({ mode: "pun", trait: "roan" }); } },
    { title: "Carriers in a family", q: "Look at a family with cystic fibrosis. Two unaffected parents can have an affected child. How? Show everyone's genotype to check.", hint: "Cystic fibrosis is recessive: a person needs two copies of the allele (ff) to be affected. Carriers (Ff) are unaffected. If both parents are carriers, each child has a 1 in 4 chance of cystic fibrosis. Polydactyly is dominant: an affected child must have an affected parent.", setup() { set({ mode: "ped", dis: "cf" }); } },
    { lvl: "adv", title: "9 : 3 : 3 : 1", q: "Cross two flies heterozygous for wings and ebony body (VvEe × VvEe). Breed 160 and use the chi-squared test. Do the results fit 9 : 3 : 3 : 1?", hint: "The genes are on different chromosomes, so they assort independently: 9 long grey : 3 long ebony : 3 vestigial grey : 1 vestigial ebony. χ² with 3 degrees of freedom: if it is below 7.81 (p > 0.05), any difference is likely due to chance.", setup() { set({ mode: "lab", cross: "di", F: "VvEe", M: "VvEe", n: 160 }); } },
    { lvl: "adv", title: "Morgan's white eyes", q: "Cross a white-eyed male (XʷY) with a red-eyed female (XᵂXᵂ), then cross two of the offspring. Which flies have white eyes in the F2?", hint: "The F1 all have red eyes. In the F2, a quarter of the flies have white eyes, and all of them are males: the gene is on the X chromosome, and males have only one X. Thomas Morgan found exactly this in 1910, the first evidence that genes are on chromosomes.", setup() { set({ mode: "lab", cross: "sex", F: "XᵂXᵂ", M: "XʷY" }); } },
    { lvl: "adv", title: "Linked genes", q: "Test cross a fly carrying VB on one chromosome and vb on the other with a vb/vb fly. You might expect 1 : 1 : 1 : 1. What do you get? What does the rare group tell you?", hint: "Most offspring are the parental types (long grey, vestigial black): vg and b are on the same chromosome. The recombinants (long black, vestigial grey) come from crossing over in meiosis. Recombination frequency = recombinants ÷ total ≈ 17%: the genes are about 17 map units apart.", setup() { set({ mode: "lab", cross: "linked", F: "VB/vb", M: "vb/vb", n: 200 }); } }
  ],
  batch: [
    { title: "How close to 3 : 1?", question: "In crosses of Vv × Vv with 100 offspring each, what share have vestigial wings?", how: "200 crosses of 100 flies each. Theory: 25%.", reps: 200, bins: 20, theory: 25, theoryLabel: "Mendel: ¼", yLabel: "vestigial-winged offspring (%)", run: (x, r) => { const m = CROSSES.mono.F.Vv, d = CROSSES.mono.M.Vv; let v = 0; for (let k = 0; k < 100; k++) if (pheno(mate(m, d, { rf: 17 }, r), "mono") === "vestigial wings") v++; return v; }, note: "Most crosses land within about ±9 of 25 (two standard deviations: 2 × √(100 × 0.25 × 0.75) ≈ 8.7). Chance alone makes each vial different." },
    { title: "Bigger samples, closer ratios", question: "How far from 25% vestigial does a cross land, on average, as the number of offspring grows?", how: "Vv × Vv with 10 to 1000 offspring; the size of the difference from 25% is recorded. Theory: the expected size of the difference ≈ 0.8 × √(p(1 − p) ÷ n) × 100.", xLabel: "offspring counted", yLabel: "difference from 25% (percentage points)", xs: [10, 20, 50, 100, 200, 500, 1000], reps: 8, yMin: 0, theory: n => 0.8 * Math.sqrt(0.25 * 0.75 / n) * 100, theoryLabel: "chance alone", run: (x, r) => { const m = CROSSES.mono.F.Vv, d = CROSSES.mono.M.Vv; let v = 0; for (let k = 0; k < x; k++) if (pheno(mate(m, d, { rf: 17 }, r), "mono") === "vestigial wings") v++; return Math.abs(100 * v / x - 25); }, note: "Four times the sample halves the typical error (it falls as 1 ÷ √n). That is why Mendel counted thousands of peas." },
    { title: "A test cross", question: "In Vv × vv crosses of 100, what share of offspring have long wings?", how: "200 test crosses. Theory: 50%.", reps: 200, bins: 20, theory: 50, theoryLabel: "1 : 1", yLabel: "long-winged offspring (%)", run: (x, r) => { const m = CROSSES.mono.F.Vv, d = CROSSES.mono.M.vv; let v = 0; for (let k = 0; k < 100; k++) if (pheno(mate(m, d, { rf: 17 }, r), "mono") === "long wings") v++; return v; }, note: "Centred on 50%: the heterozygous parent gives V or v equally often." },
    { lvl: "adv", title: "Chi-squared under the null hypothesis", question: "When a dihybrid cross really does follow 9 : 3 : 3 : 1, what values of χ² do 160 offspring give?", how: "300 crosses of VvEe × VvEe, 160 offspring each; χ² against 9 : 3 : 3 : 1 (3 degrees of freedom). Theory: the mean of χ² is the degrees of freedom, 3; about 5% of values exceed the critical value 7.81.", reps: 300, bins: 24, theory: 3, theoryLabel: "mean = df = 3", yLabel: "χ²", run: (x, r) => { const m = CROSSES.di.F.VvEe, d = CROSSES.di.M.VvEe, obs = {}; for (let k = 0; k < 160; k++) { const p = pheno(mate(m, d, { rf: 17 }, r), "di"); obs[p] = (obs[p] || 0) + 1; } const e = { "long wings, grey body": 9 / 16, "long wings, ebony body": 3 / 16, "vestigial wings, grey body": 3 / 16, "vestigial wings, ebony body": 1 / 16 }; return chi2(obs, e, 160).x; }, note: "Even when the hypothesis is true, χ² is sometimes large by chance: about 1 cross in 20 would wrongly be 'rejected' at p = 0.05." },
    { lvl: "adv", title: "Measuring recombination", question: "In test crosses of linked genes, how does the measured recombination frequency compare with the distance between the genes?", how: "VB/vb × vb/vb, 200 offspring; distance (crossing-over chance) 0 to 50%. Recombinants = long black + vestigial grey. Theory: equal to the distance.", xLabel: "distance between the genes (map units)", yLabel: "recombination frequency (%)", xs: [0, 5, 10, 17, 25, 35, 50], reps: 4, yMin: 0, theory: d => d, theoryLabel: "= distance", run: (x, r) => { const m = CROSSES.linked.F["VB/vb"], d = CROSSES.linked.M["vb/vb"]; let rec = 0; for (let k = 0; k < 200; k++) { const p = pheno(mate(m, d, { rf: x }, r), "linked"); if (p === "long wings, black body" || p === "vestigial wings, grey body") rec++; } return 100 * rec / 200; }, note: "Recombination frequency measures distance along the chromosome; it can never exceed 50%, which looks the same as genes on different chromosomes." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4BI1 3.15", text: "A gene is a section of DNA coding for a protein; alleles are different forms of a gene. Dominant alleles are expressed if present; recessive ones only when homozygous." },
      { lvl: "std", tag: "4BI1 3.16", text: "Genotype: the alleles present (e.g. Tt). Phenotype: the characteristic shown (tall). Homozygous: two identical alleles; heterozygous: two different." },
      { lvl: "std", tag: "4BI1 3.17", text: "Monohybrid crosses: use a genetic diagram or Punnett square. Tt × Tt gives a 3 : 1 ratio; Tt × tt gives 1 : 1. Ratios are probabilities." },
      { lvl: "std", tag: "4BI1 3.18", text: "Codominance: both alleles are expressed in the heterozygote (roan cattle; AB blood group)." },
      { lvl: "std", tag: "4BI1 3.20", text: "Family pedigrees show how a characteristic is inherited; two unaffected parents with an affected child must both be carriers of a recessive allele." },
      { lvl: "std", tag: "4BI1 3.21", text: "Sex: females XX, males XY; each child has a 50% chance of being a boy." },
      { lvl: "adv", tag: "H420 6.1.2", text: "Dihybrid cross of two heterozygotes for unlinked genes: 9 : 3 : 3 : 1. Linked genes are inherited together unless crossing over separates them; recombination frequency = recombinants ÷ total." },
      { lvl: "adv", tag: "H420 6.1.2", text: "Sex-linked recessive conditions (haemophilia, colour blindness) are much more common in males, who have one X. Epistasis: one gene masks another (labrador ee gives yellow, 9 : 3 : 4)." },
      { lvl: "adv", tag: "H420 6.1.2", text: "Chi-squared: χ² = Σ (O − E)² ÷ E, degrees of freedom = classes − 1; compare with the critical value at p = 0.05." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: "Two pea plants, both heterozygous for height (Tt), are crossed. Use a genetic diagram to find the probability that an offspring is dwarf.", ans: "<ul><li>gametes T and t from each parent</li><li>offspring TT, Tt, Tt, tt</li><li>probability of dwarf (tt) = ¼ (25%)</li></ul>" },
      { lvl: "std", marks: 2, q: () => `In the lab ${brood.length ? shown : 100} offspring were counted. Using the expected ratio, how many would you expect to have vestigial wings from Vv × Vv?`, ans: () => `<ul><li>¼ of ${brood.length ? shown : 100}</li><li>= ${((brood.length ? shown : 100) / 4).toFixed(0)}</li></ul>` },
      { lvl: "std", marks: 3, q: "Explain how two parents without cystic fibrosis can have a child with cystic fibrosis.", ans: "<ul><li>cystic fibrosis is caused by a recessive allele</li><li>both parents are heterozygous carriers (Ff)</li><li>the child inherits f from each parent (ff): a 1 in 4 chance</li></ul>" },
      { lvl: "adv", marks: 3, q: "Explain why haemophilia is much more common in males than in females.", ans: "<ul><li>the allele is recessive and on the X chromosome</li><li>males have one X, so one copy causes the condition</li><li>females need two copies, so most with one are carriers</li></ul>" },
      { lvl: "adv", marks: 4, q: "A dihybrid test cross gave 42, 8, 9, 41 offspring (parental, recombinant, recombinant, parental). Explain the results and calculate the recombination frequency.", ans: "<ul><li>far from 1 : 1 : 1 : 1, so the genes are linked</li><li>recombinants come from crossing over in meiosis</li><li>recombination frequency = (8 + 9) ÷ 100</li><li>= 17%</li></ul>" }
    ]
  },
  notes: `<h3>What is being modelled</h3>
<ul><li><b>Flies</b>: each fly carries two copies of each chromosome. Wings (vg) and body colour (b) are on chromosome 2, ebony body (e) on chromosome 3, and white eyes (w) on the X. Each gamete gets one copy of each chromosome at random; between vg and b, crossing over happens with the chance you set (17% in real Drosophila). Males pass on either their X or their Y.</li>
<li>Expected numbers come from breeding 40 000 offspring with the same rules. The chi-squared test compares your counts with them (degrees of freedom = classes − 1).</li>
<li><b>Punnett squares</b>: each gamete is equally likely; offspring are drawn one at a time at random.</li>
<li><b>Pedigrees</b>: founders carry the disease allele with a high chance (so that the family is interesting); children get one allele from each parent at random (for X-linked genes, sons get their X from their mother).</li></ul>
<h3>Simplifications</h3>
<ul><li>Every fly survives and is counted; real vials lose some, and vestigial flies are less fit.</li>
<li>Only one crossover can happen between vg and b; no mutation.</li>
<li>The disease frequencies in the pedigrees are made high on purpose; real cystic fibrosis carriers are about 1 in 25 in the UK.</li>
<li>The earlier version also had Hardy–Weinberg, more epistasis examples and continuous variation; they are not in this version.</li></ul>
<p>The earlier version of this simulation, with its worksheets, is kept in <a href="original/inheritance.html">original/inheritance.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {}, grp = {};
let g = ui.group("View");
ctl.mode = K.seg(g, { value: "lab", options: [["lab", "🪰 Fruit-fly lab"], ["pun", "🟦 Punnett squares"], ["ped", "👪 Family pedigrees"]], on: v => set({ mode: v }) });
grp.lab = g = ui.group("Breed some flies");
ctl.cross = K.seg(g, { label: "Genes", value: "mono", options: Object.entries(CROSSES).map(([k, c]) => [k, c.name]), on: v => { const c = CROSSES[v]; set({ mode: "lab", cross: v, F: Object.keys(c.F)[1] || Object.keys(c.F)[0], M: Object.keys(c.M)[Object.keys(c.M).length > 2 ? 1 : 1] || Object.keys(c.M)[0] }); } });
const segF = K.$("div"), segM = K.$("div"); g.append(segF, segM);
ctl.n = K.slider(g, { label: "Offspring to breed", min: 20, max: 1000, step: 20, value: 100, on: v => { P.n = v; } });
ctl.rf = K.slider(g, { label: "Crossing over between vg and b", min: 0, max: 50, step: 1, value: 17, unit: "%", on: v => { P.rf = v; } });
let r1 = K.row(g); K.btn(r1, "🪰 Breed", () => breed(), "primary"); K.btn(r1, "Cross two of the offspring", () => nextGen());
grp.pun = g = ui.group("Punnett square");
ctl.trait = K.seg(g, { value: "pea", options: Object.entries(TRAITS).map(([k, t]) => [k, t.name]), on: v => { P.trait = v; pun = []; } });
let r2 = K.row(g); for (const n of [1, 10, 100]) K.btn(r2, "+" + n, () => addPun(n)); K.btn(r2, "Clear", () => pun = []);
grp.ped = g = ui.group("Family");
ctl.dis = K.seg(g, { value: "cf", options: Object.entries(DIS).map(([k, d]) => [k, d.name]), on: v => { P.dis = v; newFamily(); } });
ctl.show = K.toggle(g, { label: "Show everyone's genotype", value: false, on: v => P.show = v });
K.btn(K.row(g), "👪 A new family", () => newFamily(), "primary");
g = ui.group("Watch");
ctl.speed = K.slider(g, { label: "Speed", min: 0.25, max: 10, step: 0.25, value: 1, fmt: v => "× " + v, on: v => speed = v });
const read = K.readout(g, [["a", ""], ["b", ""], ["c", ""], ["d", ""]]);
const relabel = l => l.forEach((x, i) => read.el.children[i].firstElementChild.textContent = x);
let sF = null, sM = null;
function parentSegs() {
  segF.innerHTML = ""; segM.innerHTML = ""; const c = CROSSES[P.cross];
  sF = K.seg(segF, { label: "Female ♀", value: P.F, options: Object.keys(c.F).map(k => [k, k]), on: v => { P.F = v; gen = 1; brood = []; } });
  sM = K.seg(segM, { label: "Male ♂", value: P.M, options: Object.keys(c.M).map(k => [k, k]), on: v => { P.M = v; gen = 1; brood = []; } });
}
function breed() { const c = CROSSES[P.cross], mum = parents ? parents[0] : c.F[P.F], dad = parents ? parents[1] : c.M[P.M]; brood = []; for (let k = 0; k < P.n; k++) brood.push(mate(mum, dad, P, rnd)); shown = 0; exp = expected(mum, dad, P, P.cross); }
function nextGen() { if (!brood.length) return; const f = brood.find(x => x.sex === "F"), m = brood.find(x => x.sex === "M"); if (!f || !m) return; parents = [f, m]; gen++; breed(); }
function addPun(n) { const t = TRAITS[P.trait]; for (let k = 0; k < n; k++) { const a = t.a[rnd.int(t.a.length)], b = t.b[rnd.int(t.b.length)]; pun.push(t.show(combine(a, b))); } if (pun.length > 2000) pun = pun.slice(-2000); }
function newFamily() { fam = family(DIS[P.dis].kind, rnd); }
function set(o) {
  Object.assign(P, { cross: "mono", F: "Vv", M: "Vv", n: 100, rf: 17, trait: "pea", dis: "cf", show: false }, o);
  ctl.mode.set(P.mode); ctl.cross.set(P.cross); ctl.n.set(P.n); ctl.rf.set(P.rf); ctl.trait.set(P.trait); ctl.dis.set(P.dis); ctl.show.set(P.show);
  for (const k in grp) grp[k].style.display = k === P.mode ? "" : "none"; ctl.rf.el.style.display = P.cross === "linked" ? "" : "none";
  parentSegs(); gen = 1; parents = null; brood = []; pun = []; newFamily(); if (P.mode === "lab") breed();
  const adv = ui.level === "adv"; Object.keys(CROSSES).forEach((k, i) => ctl.cross.el.querySelectorAll("button")[i].style.display = CROSSES[k].lvl === "std" || adv ? "" : "none"); Object.keys(TRAITS).forEach((k, i) => ctl.trait.el.querySelectorAll("button")[i].style.display = TRAITS[k].lvl === "std" || adv ? "" : "none"); Object.keys(DIS).forEach((k, i) => ctl.dis.el.querySelectorAll("button")[i].style.display = !DIS[k].lvl || adv ? "" : "none");
  chA.opts.title = { lab: "Observed and expected", pun: "Observed and expected", ped: "Chance the couple's next child is affected" }[P.mode]; chB.opts.title = { lab: "Share of each type as they hatch", pun: "Share of each type as offspring are added", ped: "Who is affected in the family" }[P.mode];
  relabel({ lab: ["generation", "offspring counted", "χ² (df)", "p · conclusion"], pun: ["offspring", "most common", "expected ratio", "observed"], ped: ["affected", "carriers (hidden)", "couple's genotypes", "next child affected"] }[P.mode]);
}
ui.onLevel = () => set({ mode: P.mode });

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const T = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function drawFly(c, x, y, f, sc) {
  const longW = f.c2.some(h => h.vg === "V"), dark = (P.cross === "di" && !f.c3.includes("E")) || (P.cross === "linked" && !f.c2.some(h => h.b === "B")), red = f.X.some(w => w === "W");
  c.fillStyle = "rgba(220,235,255,0.55)"; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(x + s * 3 * sc, y - 1 * sc, (longW ? 7 : 3) * sc, 2.5 * sc, s * (longW ? 0.5 : 0.9), 0, 6.3); c.fill(); }
  c.fillStyle = dark ? "#2a2018" : "#b09060"; c.beginPath(); c.ellipse(x, y + 2 * sc, 3 * sc, 5.5 * sc, 0, 0, 6.3); c.fill();
  if (f.sex === "M") { c.fillStyle = dark ? "#000" : "#3a2a18"; c.beginPath(); c.ellipse(x, y + 5.5 * sc, 2.4 * sc, 2 * sc, 0, 0, 6.3); c.fill(); }
  c.fillStyle = red ? "#e03030" : "#f4f4f4"; c.beginPath(); c.arc(x - 1.8 * sc, y - 4 * sc, 1.6 * sc, 0, 6.3); c.arc(x + 1.8 * sc, y - 4 * sc, 1.6 * sc, 0, 6.3); c.fill();
}
function drawLab(c, w, h) {
  const n = Math.floor(shown), groups = {}; brood.slice(0, n).forEach(f => { const p = pheno(f, P.cross); (groups[p] = groups[p] || []).push(f); });
  const keys = Object.keys(exp).sort((a, b) => exp[b] - exp[a]), colW = (w - 40) / Math.max(1, keys.length), sc = Math.min(1.6, Math.max(0.8, 300 / Math.sqrt(Math.max(50, P.n)) / 12));
  T(c, gen === 1 ? `Parents: ♀ ${P.F} × ♂ ${P.M}` : `Generation F${gen - 1}: two offspring of the last vial crossed`, 20, 30, "#eef2f8", "left", "600 15px");
  keys.forEach((k, i) => { const x0 = 20 + i * colW, gs = groups[k] || [], per = Math.max(4, Math.floor((colW - 10) / (16 * sc))); T(c, k, x0 + colW / 2, 60, "#eef2f8", "center", "600 12px"); T(c, `${gs.length}  (expected ${(exp[k] * n).toFixed(0)})`, x0 + colW / 2, 78, "#ffd166", "center", "12px");
    gs.slice(0, per * 14).forEach((f, j) => drawFly(c, x0 + 10 + (j % per) * 16 * sc, 100 + Math.floor(j / per) * 18 * sc, f, sc)); if (gs.length > per * 14) T(c, `+${gs.length - per * 14} more`, x0 + colW / 2, h - 12, "#aab6cc", "center", "11px"); });
}
function drawPun(c, w, h) {
  const t = TRAITS[P.trait], na = t.a.length, nb = t.b.length, cell = Math.min(80, (h - 140) / (na + 1), (w * 0.5) / (nb + 1)), x0 = 40, y0 = 70;
  T(c, t.name, x0, 34, "#eef2f8", "left", "600 15px"); T(c, "gametes →", x0 + cell * (nb + 1) / 2 + cell / 2, y0 - 8, "#aab6cc", "center", "11px");
  t.b.forEach((g2, j) => { c.fillStyle = "rgba(111,177,255,0.2)"; c.fillRect(x0 + cell * (j + 1), y0, cell - 4, cell - 4); T(c, g2, x0 + cell * (j + 1.5) - 2, y0 + cell / 2 + 4, "#6fb1ff", "center", "600 15px"); });
  t.a.forEach((g1, i) => { c.fillStyle = "rgba(255,138,184,0.2)"; c.fillRect(x0, y0 + cell * (i + 1), cell - 4, cell - 4); T(c, g1, x0 + cell / 2 - 2, y0 + cell * (i + 1.5) + 4, "#ff8ab8", "center", "600 15px");
    t.b.forEach((g2, j) => { const gt = combine(g1, g2), ph = t.show(gt); c.fillStyle = t.col[ph] || "#555"; c.globalAlpha = 0.35; c.fillRect(x0 + cell * (j + 1), y0 + cell * (i + 1), cell - 4, cell - 4); c.globalAlpha = 1; T(c, gt, x0 + cell * (j + 1.5) - 2, y0 + cell * (i + 1.5) + 4, "#eef2f8", "center", "600 13px"); }); });
  // offspring made so far: one coloured square each
  const ox = x0 + cell * (nb + 1) + 40, ow = w - ox - 20, sq = Math.max(4, Math.min(16, Math.floor(Math.sqrt(ow * (h - 100) / Math.max(1, pun.length))) - 1)), per = Math.floor(ow / (sq + 1));
  T(c, `${pun.length} offspring`, ox, 34, "#eef2f8", "left", "600 14px");
  pun.slice(-Math.floor(per * (h - 90) / (sq + 1))).forEach((ph, k) => { c.fillStyle = t.col[ph] || "#888"; c.fillRect(ox + (k % per) * (sq + 1), 50 + Math.floor(k / per) * (sq + 1), sq, sq); });
  let ky = h - 14; Object.entries(t.col).forEach(([ph, col], i) => { c.fillStyle = col; c.fillRect(x0 + i * 170, ky - 10, 10, 10); T(c, ph, x0 + i * 170 + 14, ky, "#aab6cc", "left", "11.5px"); });
}
function drawPed(c, w, h) {
  const kind = DIS[P.dis].kind, F = fam, s = 22, gy = [80, 210, 340];
  const sym = (p, x, y, lab) => { const aff = affected(p, kind), car = carrier(p, kind); c.strokeStyle = "#eef2f8"; c.lineWidth = 2; c.fillStyle = aff ? "#ff5d6c" : "#0b1020";
    if (p.sex === "M") { c.fillRect(x - s / 2, y - s / 2, s, s); c.strokeRect(x - s / 2, y - s / 2, s, s); } else { c.beginPath(); c.arc(x, y, s / 2, 0, 6.3); c.fill(); c.stroke(); }
    if (P.show && car) { c.fillStyle = "#ffd166"; c.beginPath(); c.arc(x, y, 4, 0, 6.3); c.fill(); }
    if (P.show) { const al = kind === "x" ? (p.sex === "M" ? `X${p.g[0] ? "ʰ" : "ᴴ"}Y` : `X${p.g[0] ? "ʰ" : "ᴴ"}X${p.g[1] ? "ʰ" : "ᴴ"}`) : (kind === "dom" ? p.g.map(a => a ? "P" : "p").sort().join("") : p.g.map(a => a ? "f" : "F").sort().join("")); T(c, al, x, y + s + 6, "#ffd166", "center", "11px"); }
    T(c, lab, x - s, y - s / 2 - 4, "#7d8aa5", "center", "10px"); };
  const xs = (n, i, x0, x1) => x0 + (x1 - x0) * (i + 0.5) / n;
  // generation I: two couples; II: their children; III: children of the couple that married
  const L = w * 0.08, R = w * 0.92, mid = (L + R) / 2; c.strokeStyle = "#aab6cc"; c.lineWidth = 1.5;
  const coup = (a, b, x1, x2, y) => { c.beginPath(); c.moveTo(x1 + s / 2, y); c.lineTo(x2 - s / 2, y); c.stroke(); };
  const Ix = [L + 40, L + 140, R - 140, R - 40]; coup(0, 0, Ix[0], Ix[1], gy[0]); coup(0, 0, Ix[2], Ix[3], gy[0]);
  const IIx = [L, L + 90, L + 180, R - 180, R - 90, R]; const famLine = (px, kids, y0, y1) => { c.beginPath(); c.moveTo(px, y0); c.lineTo(px, (y0 + y1) / 2); c.moveTo(kids[0], (y0 + y1) / 2); c.lineTo(kids[kids.length - 1], (y0 + y1) / 2); for (const k of kids) { c.moveTo(k, (y0 + y1) / 2); c.lineTo(k, y1 - s / 2); } c.stroke(); };
  famLine((Ix[0] + Ix[1]) / 2, IIx.slice(0, 3), gy[0], gy[1]); famLine((Ix[2] + Ix[3]) / 2, IIx.slice(3), gy[0], gy[1]);
  c.beginPath(); c.moveTo(IIx[2] + s / 2, gy[1]); c.lineTo(IIx[3] - s / 2, gy[1]); c.stroke();
  const IIIx = [0, 1, 2, 3].map(i => mid - 180 + i * 120); famLine(mid, IIIx, gy[1], gy[2]);
  F.I.forEach((p, i) => sym(p, Ix[i], gy[0], "I-" + (i + 1))); F.II.forEach((p, i) => sym(p, IIx[i], gy[1], "II-" + (i + 1))); F.III.forEach((p, i) => sym(p, IIIx[i], gy[2], "III-" + (i + 1)));
  T(c, DIS[P.dis].name, 20, 30, "#eef2f8", "left", "600 15px"); T(c, "■ male  ● female · red = affected" + (P.show ? " · yellow dot = carrier" : ""), 20, h - 14, "#aab6cc");
}
function draw() { const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); ({ lab: drawLab, pun: drawPun, ped: drawPed })[P.mode](c, w, h); }

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => { if (!(dt > 0)) return; if (P.mode === "lab") shown = Math.min(brood.length, shown + dt * speed * Math.max(20, brood.length / 6)); if (P.mode === "pun" && pun.length < 40 && frame % 20 === 0) addPun(1); }, () => {
  draw(); if (frame++ % 5) return;
  if (P.mode === "lab") {
    const n = Math.floor(shown), obs = {}; brood.slice(0, n).forEach(f => { const p = pheno(f, P.cross); obs[p] = (obs[p] || 0) + 1; }); const keys = Object.keys(exp).sort((a, b) => exp[b] - exp[a]);
    chA.opts.xLabel = ""; chA.opts.yLabel = "number of flies"; chA.opts.xFmt = whole(v => (keys[Math.round(v)] || "").replace("wings, ", "").replace(" body", "").replace(" eyes", ""));
    chA.draw([{ pts: keys.map((k, i) => [i - 0.17, obs[k] || 0]), type: "bars", w: 0.32, color: "#ffd166", label: "observed" }, { pts: keys.map((k, i) => [i + 0.17, exp[k] * n]), type: "bars", w: 0.32, color: "#7d8aa5", label: "expected" }], { xMin: -0.6, xMax: keys.length - 0.4, yMin: 0 });
    const run = keys.map(() => []); let cum = {}; brood.slice(0, n).forEach((f, j) => { const p = pheno(f, P.cross); cum[p] = (cum[p] || 0) + 1; if (j % Math.max(1, Math.floor(n / 80)) === 0 || j === n - 1) keys.forEach((k, i) => run[i].push([j + 1, 100 * (cum[k] || 0) / (j + 1)])); });
    chB.opts.xLabel = "offspring counted"; chB.opts.yLabel = "share (%)"; chB.opts.xFmt = null;
    chB.draw(keys.map((k, i) => ({ pts: run[i], color: K.col(i), label: k.replace("wings, ", "").replace(" body", "") })).concat(keys.map((k, i) => ({ pts: [[1, 100 * exp[k]], [Math.max(2, n), 100 * exp[k]]], color: K.col(i), dash: [4, 4], width: 1 }))), { xMin: 0, xMax: Math.max(10, P.n), yMin: 0, yMax: 100 });
    const X2 = chi2(obs, exp, Math.max(1, n)), pv = pValue(X2.x, X2.df); read.set("a", gen === 1 ? "parents' offspring (F1)" : "F" + gen); read.set("b", n + " of " + brood.length); read.set("c", ui.level === "adv" ? `${X2.x.toFixed(2)} (df ${X2.df})` : "A level"); read.set("d", ui.level === "adv" ? `p = ${pv.toFixed(3)} · ${X2.x < (CRIT[X2.df] || 99) ? "fits the ratio" : "does not fit"}` : "A level");
    ui.hud(`${n} flies counted${ui.level === "adv" && n === brood.length ? `<br>χ² = ${X2.x.toFixed(2)}, critical value ${CRIT[X2.df] || "–"} (p = 0.05)` : ""}`);
  } else if (P.mode === "pun") {
    const t = TRAITS[P.trait], kinds = Object.keys(t.col), expd = {}; for (const a of t.a) for (const b of t.b) { const ph = t.show(combine(a, b)); expd[ph] = (expd[ph] || 0) + 1 / (t.a.length * t.b.length); }
    const cnt = {}; pun.forEach(p => cnt[p] = (cnt[p] || 0) + 1); chA.opts.xLabel = ""; chA.opts.yLabel = "offspring"; chA.opts.xFmt = whole(v => (kinds[Math.round(v)] || "").split(" (")[0]);
    chA.draw([{ pts: kinds.map((k, i) => [i - 0.17, cnt[k] || 0]), type: "bars", w: 0.32, color: "#ffd166", label: "observed" }, { pts: kinds.map((k, i) => [i + 0.17, (expd[k] || 0) * pun.length]), type: "bars", w: 0.32, color: "#7d8aa5", label: "expected" }], { xMin: -0.6, xMax: kinds.length - 0.4, yMin: 0 });
    const run = kinds.map(() => []), cum = {}; pun.forEach((p, j) => { cum[p] = (cum[p] || 0) + 1; if (j % Math.max(1, Math.floor(pun.length / 80)) === 0 || j === pun.length - 1) kinds.forEach((k, i) => run[i].push([j + 1, 100 * (cum[k] || 0) / (j + 1)])); });
    chB.opts.xLabel = "offspring"; chB.opts.yLabel = "share (%)"; chB.opts.xFmt = null; chB.draw(kinds.map((k, i) => ({ pts: run[i], color: t.col[k] === "#222" ? "#888" : t.col[k], label: k.split(" (")[0] })), { xMin: 0, yMin: 0, yMax: 100 });
    const g2 = (x, y) => { let a = x, b = y; while (b) [a, b] = [b, a % b]; return a; }, fr = kinds.map(k => Math.round((expd[k] || 0) * t.a.length * t.b.length)).filter(x => x > 0), gg = fr.reduce(g2);
    read.set("a", pun.length); read.set("b", kinds.reduce((a, b) => (cnt[a] || 0) >= (cnt[b] || 0) ? a : b).split(" (")[0]); read.set("c", fr.map(x => x / gg).join(" : ")); read.set("d", kinds.filter(k => expd[k]).map(k => cnt[k] || 0).join(" : "));
    ui.hud(`Each offspring: a random gamete from each parent<br>expected ${fr.map(x => x / gg).join(" : ")}`);
  } else {
    const kind = DIS[P.dis].kind, all = [...fam.I, ...fam.II, ...fam.III], aff = all.filter(p => affected(p, kind)).length, car = all.filter(p => carrier(p, kind)).length, risk = nextChildRisk(fam.mum, fam.dad, kind);
    chA.opts.xLabel = ""; chA.opts.yLabel = "probability (%)"; chA.opts.xFmt = whole(v => ["", "affected", "unaffected"][Math.round(v)] || ""); chA.draw([{ pts: [[1, 100 * risk], [2, 100 * (1 - risk)]], type: "bars", w: 0.6, color: "#ff8a70", label: "next child of II-3 and II-4" }], { xMin: 0.4, xMax: 2.6, yMin: 0, yMax: 100 });
    chB.opts.xLabel = ""; chB.opts.yLabel = "people"; chB.opts.xFmt = whole(v => ["", "generation I", "II", "III"][Math.round(v)] || ""); chB.draw([{ pts: [[1, fam.I.filter(p => affected(p, kind)).length], [2, fam.II.filter(p => affected(p, kind)).length], [3, fam.III.filter(p => affected(p, kind)).length]], type: "bars", w: 0.6, color: "#ff5d6c", label: "affected" }], { xMin: 0.4, xMax: 3.6, yMin: 0, yMax: 6 });
    const gtx = p => kind === "x" ? (p.sex === "M" ? `X${p.g[0] ? "ʰ" : "ᴴ"}Y` : `X${p.g[0] ? "ʰ" : "ᴴ"}X${p.g[1] ? "ʰ" : "ᴴ"}`) : p.g.map(a => a ? (kind === "dom" ? "P" : "f") : (kind === "dom" ? "p" : "F")).sort().join("");
    read.set("a", aff + " of " + all.length); read.set("b", P.show ? car : "?"); read.set("c", P.show ? `${gtx(fam.mum)} × ${gtx(fam.dad)}` : "hidden"); read.set("d", P.show ? Math.round(100 * risk) + "%" : "show genotypes");
    ui.hud(`II-3 and II-4 married${P.show ? `: next child ${Math.round(100 * risk)}% chance affected` : ""}`);
  }
});
set({});
ui.tip("Breed flies, then count them as they hatch · switch to Punnett squares or family trees at the top of the controls", 8000);
