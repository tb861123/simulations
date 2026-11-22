/* =====================================================================
   NATURE AND NURTURE: TWIN AND ADOPTION STUDIES
   How much of the variation in a psychological trait comes from genes?
   The classic model (the 'ACE' model) splits the variation into
     A  additive genetic effects (heritability, h²)
     C  the COMMON (shared) environment: things siblings in the same home share
     E  the UNIQUE environment: everything else (different friends,
        illnesses, chance events, and measurement error)
   with  A + C + E = 1  (the whole variance).
   IDENTICAL (monozygotic, MZ) twins share all their genes;
   NON-IDENTICAL (dizygotic, DZ) twins share on average half.
   Twins reared together share C as well. So
     r(MZ together)  = A + C
     r(DZ together)  = ½A + C
   and FALCONER'S FORMULA estimates heritability from the difference:
     h² ≈ 2 (r_MZ − r_DZ)
   MZ twins reared APART share only genes: r = A.
   ADOPTION studies compare a child with the biological parent (shares
   genes, r = ½A) and the adoptive parent (shares the home, r = C).
   For a DISORDER (like schizophrenia or OCD) we count CONCORDANCE: if one
   twin has it, how often does the other? The 'liability threshold' model:
   each person has a liability (genes + environment); the disorder appears
   if liability passes a threshold. This is a DIATHESIS–STRESS model:
   genes give a vulnerability, stress may push someone over the threshold.
   ===================================================================== */

// ---------------- 1. Generating families ----------------
// a person's trait = √A·(genes) + √C·(family environment) + √E·(own environment), each part a standard normal number
// MZ twins: the same genes. DZ twins: genes correlated 0.5. Reared together: the same family environment.
// 'eea' breaks the equal environments assumption: MZ twins are treated more alike, so they share an extra slice of environment.
function twinPairs(r, n, Q, kind) {
  const a = Math.sqrt(Q.A), c = Math.sqrt(Q.C), e = Math.sqrt(Math.max(0, 1 - Q.A - Q.C)), out = [];
  const xtra = kind === "mz" ? Math.min(Q.eea, Math.max(0, 1 - Q.A - Q.C)) : 0, eRest = Math.sqrt(Math.max(0, 1 - Q.A - Q.C - xtra)), x = Math.sqrt(xtra);
  for (let i = 0; i < n; i++) {
    const g1 = r.gauss(), g2 = kind === "dz" ? 0.5 * g1 + Math.sqrt(0.75) * r.gauss() : g1;      // genes
    const f1 = r.gauss(), f2 = kind === "apart" ? r.gauss() : f1;                                     // family (shared) environment
    const s = r.gauss();                                                                              // extra environment only MZ twins share (EEA violation)
    const t1 = a * g1 + c * f1 + (xtra ? x * s + eRest * r.gauss() : e * r.gauss()), t2 = a * g2 + c * f2 + (xtra ? x * s + eRest * r.gauss() : e * r.gauss());
    out.push([t1, t2]);
  }
  return out;
}
// adoption: child (raised by adoptive parents) compared with biological parent and adoptive parent.
// selective placement 'sel': agencies place children in homes like their birth family, so the adoptive home correlates with the birth parent's genes
function adoptions(r, n, Q) {
  const a = Math.sqrt(Q.A), c = Math.sqrt(Q.C), e = Math.sqrt(Math.max(0, 1 - Q.A - Q.C)), bio = [], adp = [];
  for (let i = 0; i < n; i++) {
    const gB = r.gauss(), gC = 0.5 * gB + Math.sqrt(0.75) * r.gauss();               // parent–child genes correlate 0.5
    const home = Q.sel * gB + Math.sqrt(1 - Q.sel * Q.sel) * r.gauss();              // the adoptive family environment
    const child = a * gC + c * home + e * r.gauss(), bioP = a * gB + c * r.gauss() + e * r.gauss(), adpP = a * r.gauss() + c * home + e * r.gauss();
    bio.push([bioP, child]); adp.push([adpP, child]);
  }
  return { bio, adp };
}
function corr(p) { const n = p.length; let mx = 0, my = 0; for (const q of p) { mx += q[0]; my += q[1]; } mx /= n; my /= n; let sxy = 0, sxx = 0, syy = 0; for (const q of p) { sxy += (q[0] - mx) * (q[1] - my); sxx += (q[0] - mx) ** 2; syy += (q[1] - my) ** 2; } return sxy / Math.sqrt(sxx * syy); }
// the threshold that a fraction 'prev' of people exceed (inverse normal by bisection)
const erf = x => { const s = Math.sign(x), a = Math.abs(x), t = 1 / (1 + 0.3275911 * a); return s * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a)); };
const Phi = z => 0.5 * (1 + erf(z / Math.SQRT2));
const zAbove = p => { let lo = -8, hi = 8; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (1 - Phi(m) > p) lo = m; else hi = m; } return (lo + hi) / 2; };
// concordance: of the twins who have the disorder, what fraction have an affected co-twin? (probandwise concordance)
function concordance(pairs, thr) { let both = 0, one = 0; for (const [x, y] of pairs) { const a = x > thr, b = y > thr; if (a && b) both++; else if (a || b) one++; } return 2 * both + one ? 2 * both / (2 * both + one) : 0; }
// the stress slider raises everyone's environmental stress by s (standard deviations of the environment part)
const threshold = Q => zAbove(Q.prev) ;
const stressShift = Q => Q.stress * Math.sqrt(Math.max(0, 1 - Q.A));

// ---------------- 2. State ----------------
const DEF = { mode: "trait", A: 0.5, C: 0.2, eea: 0, sel: 0, n: 300, prev: 0.01, stress: 0 };
const P = Object.assign({}, DEF);
let rand = K.rng(Date.now() % 1e6), S = null;
function sample() {
  const n = P.mode === "disorder" ? 20000 : P.n;
  S = { mz: twinPairs(rand, n, P, "mz"), dz: twinPairs(rand, n, P, "dz"), ap: twinPairs(rand, Math.max(30, Math.round(n / 4)), P, "apart"), ad: adoptions(rand, n, P) };
  S.rMZ = corr(S.mz); S.rDZ = corr(S.dz); S.rAp = corr(S.ap); S.rBio = corr(S.ad.bio); S.rAdp = corr(S.ad.adp);
  S.h2 = 2 * (S.rMZ - S.rDZ); S.c2 = 2 * S.rDZ - S.rMZ; S.e2 = 1 - S.rMZ;
  // disorder: a fixed threshold set so that 'prev' of an unstressed population is affected; stress moves people towards it
  const thr = threshold(P) - stressShift(P); S.thr = thr; S.cMZ = concordance(S.mz, thr); S.cDZ = concordance(S.dz, thr);
  S.prevNow = S.mz.reduce((s, q) => s + (q[0] > thr) + (q[1] > thr), 0) / (2 * S.mz.length);
}

// ---------------- 3. The page ----------------
const ui = K.app({
  title: "Nature and Nurture: Twin Studies", subject: "Psychology",
  blurb: "Generate twins and adoptees from known genetic and environmental effects, then see how well twin correlations, Falconer's formula and concordance rates recover the truth",
  reset: () => sample(),
  levels: { std: "AS (AQA 7181)", adv: "A level (AQA 7182)", specs: {
    std: "AQA AS and A level Psychology 3.2.1 Approaches: the biological approach: the influence of genes on behaviour; genotype and phenotype; twin studies and concordance rates. 3.1.4 Psychopathology: genetic explanations of OCD (diathesis–stress).",
    adv: "AQA A level Psychology (7182) 3.3.1 Issues and debates: the nature–nurture debate, the relative importance of heredity and environment, the interactionist approach; twin and adoption studies of schizophrenia and aggression (Gottesman, 1991), the diathesis–stress model, and the limitations of twin studies (the equal environments assumption, selective placement)." } },
  missions: [
    { title: "Identical v non-identical twins", q: "With heritability 0.5, compare the scatter graphs for MZ and DZ twins reared together. Which correlation is higher, and why?", hint: "MZ twins share all their genes, DZ twins about half, but both share their home. r_MZ ≈ A + C = 0.7 and r_DZ ≈ ½A + C = 0.45.", setup: () => set({ A: 0.5, C: 0.2 }) },
    { title: "No genes at all", q: "Set heritability to 0 and the shared environment to 0.4. What happens to the gap between MZ and DZ twins?", hint: "Both correlations ≈ 0.4: twins are alike only because they share a home. Equal MZ and DZ correlations point to environment, not genes.", setup: () => set({ A: 0, C: 0.4 }) },
    { title: "Concordance for a disorder", q: "Switch to 'a disorder'. About 1% of people are affected. With genes A = 0.6 and shared environment C = 0.25, what concordance rates do MZ and DZ twins show? Why is MZ concordance not 100%?", hint: "About 45% for MZ and 17% for DZ, close to Gottesman's (1991) schizophrenia figures (48% and 17%). Identical genes give the same vulnerability (diathesis), but whether someone passes the threshold also depends on their own environment (stress).", setup: () => set({ mode: "disorder", A: 0.6, C: 0.25 }) },
    { title: "Diathesis and stress", q: "In disorder mode, raise the population's stress level. What happens to the number of people affected, and to MZ concordance?", hint: "More people pass the threshold and concordance rises: the same genetic diathesis is 'triggered' more often. Genes and environment interact (the interactionist approach).", setup: () => set({ mode: "disorder", A: 0.6, C: 0 }) },
    { lvl: "adv", title: "Falconer's formula", q: "Set A = 0.4 and C = 0.3. Does h² = 2(r_MZ − r_DZ) recover the true heritability? How much does it vary from one sample of 100 pairs to the next (press Reset several times)?", hint: "On average yes (0.4), but with 100 pairs each estimate can easily be out by ±0.2: twin studies need hundreds or thousands of pairs.", setup: () => set({ A: 0.4, C: 0.3, n: 100 }) },
    { lvl: "adv", title: "The equal environments assumption", q: "Keep the true heritability at 0.4 but make MZ twins treated more alike than DZ twins (an extra shared environment of 0.15). What does Falconer's formula now say?", hint: "It overestimates: about 0.4 + 2 × 0.15 = 0.7. The extra similarity caused by environment is wrongly credited to genes. Critics of twin studies argue this happens in real life.", setup: () => set({ A: 0.4, C: 0.2, eea: 0.15, n: 500 }) },
    { lvl: "adv", title: "Adoption and selective placement", q: "Compare adopted children with their biological and adoptive parents. Then add selective placement. What happens to the evidence?", hint: "Without selective placement r(biological) ≈ ½A and r(adoptive) ≈ C. Selective placement puts children in homes like their birth families, so the adoptive home carries some of the genetic similarity: both correlations change and the two influences become confounded.", setup: () => set({ A: 0.5, C: 0.2, sel: 0.6, n: 500 }) },
  ],
  batch: [
    { title: "Falconer's estimate v true heritability", question: "Does h² = 2(r_MZ − r_DZ) give the right answer on average?", how: "Each run: 200 MZ and 200 DZ pairs reared together with shared environment C = 0.1.", xLabel: "true heritability A", yLabel: "estimated h²", xs: [0, 0.2, 0.4, 0.6, 0.8], reps: 10, theory: a => a, theoryLabel: "estimate = truth", run: (a, r) => { const Q = { A: a, C: 0.1, eea: 0 }; return 2 * (corr(twinPairs(r, 200, Q, "mz")) - corr(twinPairs(r, 200, Q, "dz"))); }, note: "The formula is unbiased when its assumptions hold, but each estimate scatters a lot: doubling a difference of two noisy correlations doubles the noise." },
    { title: "How many twin pairs?", question: "How much do heritability estimates vary for different numbers of pairs?", how: "Each run: one twin study with true A = 0.5, C = 0.2. Look at the SD and the scatter as the sample grows.", xLabel: "pairs of each type", yLabel: "estimated h²", xs: [25, 50, 100, 200, 400, 800], reps: 12, theory: () => 0.5, theoryLabel: "true h²", run: (n, r) => { const Q = { A: 0.5, C: 0.2, eea: 0 }; return 2 * (corr(twinPairs(r, n, Q, "mz")) - corr(twinPairs(r, n, Q, "dz"))); }, note: "Small twin studies give very uncertain heritabilities. The spread roughly halves each time the sample is multiplied by four (standard error ∝ 1/√n)." },
    { title: "Breaking the equal environments assumption (A level)", question: "If MZ twins share extra environment, what does Falconer's formula report?", how: "Each run: 400 pairs of each type, true A = 0.4, C = 0.2, with an extra environment shared only by MZ twins.", xLabel: "extra environment shared by MZ twins", yLabel: "estimated h²", xs: [0, 0.05, 0.1, 0.15, 0.2], reps: 8, theory: v => 0.4 + 2 * v, theoryLabel: "0.4 + 2 × extra", run: (v, r) => { const Q = { A: 0.4, C: 0.2, eea: v }; return 2 * (corr(twinPairs(r, 400, Q, "mz")) - corr(twinPairs(r, 400, Q, "dz"))); }, note: "Every bit of extra MZ similarity counts double in the heritability estimate. This is the strongest criticism of twin studies." },
    { title: "MZ concordance v heritability", question: "For a disorder affecting 1% of people, how does MZ concordance depend on heritability?", how: "Each run: 20 000 MZ pairs, liability threshold model, probandwise concordance.", xLabel: "heritability of liability", yLabel: "MZ concordance", xs: [0.2, 0.4, 0.6, 0.8, 0.9], reps: 4, yMin: 0, yMax: 1, run: (a, r) => concordance(twinPairs(r, 20000, { A: a, C: 0, eea: 0 }, "mz"), zAbove(0.01)), note: "Even with high heritability, concordance stays well below 100%: genes raise the risk but most MZ co-twins of someone with a rare disorder never pass the threshold." },
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "3.2.1", text: "Genotype: a person's genetic make-up. Phenotype: how the genes are expressed, which depends on the environment too. MZ twins have the same genotype but can have different phenotypes." },
      { lvl: "std", tag: "3.2.1", text: "Concordance rate: the percentage of twin pairs where, if one has a trait or disorder, the other has it too. Higher MZ than DZ concordance suggests a genetic influence; MZ concordance below 100% shows the environment matters." },
      { lvl: "std", tag: "3.1.4", text: "Diathesis–stress: genes give a vulnerability (diathesis); an environmental trigger (stress) is needed for the disorder to appear (e.g. OCD: Nestadt et al., 2010 found 68% MZ v 31% DZ concordance)." },
      { lvl: "adv", tag: "3.3.1", text: "Nature–nurture: heritability is the proportion of variation in a population due to genetic differences (0 to 1). It is not about individuals and changes if the environment changes. Twin studies: Falconer h² ≈ 2(r_MZ − r_DZ)." },
      { lvl: "adv", tag: "3.3.1", text: "Limitations: the equal environments assumption (MZ twins are treated more alike), selective placement in adoption, small samples, and genes–environment interaction. Schizophrenia: Gottesman (1991) MZ 48%, DZ 17%." },
    ],
    questions: [
      { lvl: "std", marks: 3, q: "Explain what a concordance rate of 48% for MZ twins and 17% for DZ twins suggests about schizophrenia.", ans: "<ul><li>MZ twins share 100% of genes, DZ about 50%, so higher MZ concordance suggests a genetic influence</li><li>but MZ concordance is not 100%</li><li>so environmental factors must also play a role (diathesis–stress)</li></ul>" },
      { lvl: "std", marks: 2, q: "Distinguish between genotype and phenotype.", ans: "<ul><li>genotype: the genetic make-up (the genes a person has)</li><li>phenotype: the characteristics expressed, resulting from the interaction of genotype with the environment</li></ul>" },
      { lvl: "adv", marks: 4, q: "MZ twins correlate 0.70 for aggression and DZ twins 0.45. Use Falconer's formula to estimate heritability and explain one reason why this might be an overestimate.", ans: "<ul><li>h² = 2(0.70 − 0.45) = 0.5</li><li>the equal environments assumption may be violated</li><li>MZ twins are often treated more similarly (dressed alike, same friends)</li><li>so part of their extra similarity is environmental but is counted as genetic</li></ul>" },
    ]
  },
  notes: `<h3>The model</h3><ul><li>Each person's trait is the sum of three independent normal parts: genes (variance A), family environment (variance C) and their own unique environment (variance E = 1 − A − C). MZ twins share genes completely, DZ twins with correlation 0.5; twins reared together share the family part.</li><li>Adoptees share genes with their biological parent (correlation 0.5) and the home with their adoptive parent. Selective placement makes the adoptive home correlate with the birth parent's genes.</li><li>Disorder mode uses a liability threshold: a person is affected if their trait (liability) is above the level that 1% (or the chosen prevalence) of people exceed. Stress shifts everyone's environmental part upwards.</li><li>Concordance is probandwise: of all affected twins, the fraction whose co-twin is affected too (the measure Gottesman reported).</li></ul>
<h3>Assumptions and simplifications</h3><ul><li>Genes act additively; no dominance, no gene–gene or gene–environment interaction (except the threshold).</li><li>Mating is random and the trait is measured without bias.</li><li>Real studies also have to deal with zygosity errors, small samples of twins reared apart and the fact that twins share a womb.</li></ul>`,
});

// ---------------- 4. Controls ----------------
const C = {};
let g = ui.group("What are we measuring?");
C.mode = K.seg(g, { value: "trait", options: [["trait", "a trait (e.g. aggression score)"], ["disorder", "a disorder (yes / no)"]], on: v => { P.mode = v; showCtl(); sample(); } });
g = ui.group("The truth: where the variation comes from");
C.A = K.slider(g, { label: "Genes A (true heritability)", min: 0, max: 1, step: 0.05, value: 0.5, on: v => { P.A = v; if (P.A + P.C > 1) { P.C = +(1 - P.A).toFixed(2); C.C.set(P.C); } sample(); } });
C.C = K.slider(g, { label: "Shared family environment C", min: 0, max: 1, step: 0.05, value: 0.2, on: v => { P.C = v; if (P.A + P.C > 1) { P.A = +(1 - P.C).toFixed(2); C.A.set(P.A); } sample(); } });
const eNote = K.note(g, "");
const gt = ui.group("Twin and adoption studies");
C.n = K.slider(gt, { label: "Pairs of each type", min: 20, max: 1000, step: 10, value: 300, on: v => { P.n = v; sample(); } });
C.eea = K.slider(gt, { label: "Extra environment shared only by MZ twins (breaks the equal environments assumption)", min: 0, max: 0.3, step: 0.05, value: 0, on: v => { P.eea = v; sample(); } });
C.sel = K.slider(gt, { label: "Selective placement of adoptees", min: 0, max: 0.9, step: 0.1, value: 0, on: v => { P.sel = v; sample(); } });
const gd = ui.group("Disorder");
C.prev = K.seg(gd, { label: "How common (unstressed population)", value: 0.01, options: [[0.01, "1% (like schizophrenia)"], [0.02, "2% (like OCD)"], [0.1, "10%"]], on: v => { P.prev = +v; sample(); } });
C.stress = K.slider(gd, { label: "Population stress (environmental triggers)", min: 0, max: 1.5, step: 0.1, value: 0, on: v => { P.stress = v; sample(); } });
let rw = K.row(ui.controls); K.btn(rw, "New sample", () => sample(), "primary");
const read = K.readout(ui.group("Results"), [["a", ""], ["b", ""], ["c", ""], ["d", ""]]);
const relabel = n => n.forEach((x, i) => read.el.children[i].firstElementChild.textContent = x);
function showCtl() { const dis = P.mode === "disorder"; gt.style.display = dis ? "none" : ""; gd.style.display = dis ? "" : "none"; C.eea.el.style.display = C.sel.el.style.display = ui.level === "adv" ? "" : "none"; eNote.innerHTML = `Unique environment E = 1 − A − C = <b>${Math.max(0, 1 - P.A - P.C).toFixed(2)}</b>`; }
function set(o) { Object.assign(P, DEF, o); for (const k of ["mode", "A", "C", "n", "eea", "sel", "prev", "stress"]) C[k].set(P[k]); showCtl(); sample(); }
ui.onLevel = showCtl;

// ---------------- 5. Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#c9d4ea", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,system-ui,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
// a small scatter graph of pairs, with r in the corner. For disorders, the threshold lines split it into affected / unaffected
function scatter(c, x0, y0, w, h, pts, title, col, r, thr) {
  c.fillStyle = "#101a2e"; c.fillRect(x0, y0, w, h); c.strokeStyle = "#2a3a5c"; c.strokeRect(x0, y0, w, h);
  TX(c, title, x0 + 8, y0 + 16, col, "left", "600 12px"); if (r != null) TX(c, "r = " + r.toFixed(2), x0 + w - 8, y0 + 16, "#fff", "right", "600 13px");
  const L = 3.6, X = v => x0 + w / 2 + v / L * (w / 2 - 6), Y = v => y0 + 10 + h / 2 - v / L * (h / 2 - 16);
  if (thr != null) { c.strokeStyle = "#ff6b81"; c.setLineDash([4, 3]); c.beginPath(); c.moveTo(X(thr), y0 + 22); c.lineTo(X(thr), y0 + h); c.moveTo(x0, Y(thr)); c.lineTo(x0 + w, Y(thr)); c.stroke(); c.setLineDash([]); }
  c.save(); c.beginPath(); c.rect(x0, y0 + 20, w, h - 20); c.clip();   // keep the dots inside the box
  const step = Math.max(1, Math.floor(pts.length / 1500));      // draw at most ~1500 points (the statistics use them all)
  for (let i = 0; i < pts.length; i += thr != null ? 1 : step) { const [a, b] = pts[i]; if (thr != null && a <= thr && b <= thr && i % 12) continue; c.fillStyle = thr != null && (a > thr || b > thr) ? (a > thr && b > thr ? "#ff6b81" : "#ffd166") : col; c.globalAlpha = thr != null && (a > thr || b > thr) ? 0.95 : 0.45; c.fillRect(X(a) - 1.5, Y(b) - 1.5, 3, 3); }
  c.globalAlpha = 1; c.restore();
}
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1222"; c.fillRect(0, 0, w, h); if (!S) return;
  const pad = 10;
  if (P.mode === "trait") {
    const cw = (w - pad * 4) / 3, ch = (h - pad * 3 - 20) / 2;
    scatter(c, pad, pad, cw, ch, S.mz, "MZ twins reared together", "#5ad1ff", S.rMZ);
    scatter(c, pad * 2 + cw, pad, cw, ch, S.dz, "DZ twins reared together", "#ffb454", S.rDZ);
    scatter(c, pad * 3 + 2 * cw, pad, cw, ch, S.ap, `MZ twins reared apart (${S.ap.length} pairs)`, "#b388ff", S.rAp);
    scatter(c, pad, pad * 2 + ch, cw, ch, S.ad.bio, "adoptee v biological parent", "#7ee787", S.rBio);
    scatter(c, pad * 2 + cw, pad * 2 + ch, cw, ch, S.ad.adp, "adoptee v adoptive parent", "#ff9aa9", S.rAdp);
    // the box of estimates
    const bx = pad * 3 + 2 * cw, by = pad * 2 + ch; c.fillStyle = "#101a2e"; c.fillRect(bx, by, cw, ch); c.strokeStyle = "#2a3a5c"; c.strokeRect(bx, by, cw, ch);
    let y = by + 20; const ln = (s, col = "#c9d4ea", f = "12.5px") => { TX(c, s, bx + 10, y, col, "left", f); y += 19; };
    ln("What the studies suggest", "#fff", "600 13px");
    ln(`Falconer: h² = 2(r_MZ − r_DZ) = ${S.h2.toFixed(2)}`, "#ffd166", "600 12.5px"); ln(`shared env. c² = 2r_DZ − r_MZ = ${S.c2.toFixed(2)}`); ln(`unique env. e² = 1 − r_MZ = ${S.e2.toFixed(2)}`);
    ln(`MZ apart: h² ≈ r = ${S.rAp.toFixed(2)}`); ln(`adoption: h² ≈ 2r(bio parent) = ${(2 * S.rBio).toFixed(2)}`); ln(`              c² ≈ r(adoptive parent) = ${S.rAdp.toFixed(2)}`);
    y += 4; ln(`Truth: A = ${P.A.toFixed(2)}, C = ${P.C.toFixed(2)}, E = ${Math.max(0, 1 - P.A - P.C).toFixed(2)}`, "#7ee787", "600 12.5px");
    TX(c, "Each dot is one pair: twin 1 across, twin 2 up (or parent across, child up).", w / 2, h - 8, "#8fa0bf", "center", "12px");
  } else {
    const cw = (w - pad * 3) / 2, ch = h - pad * 2 - 90;
    scatter(c, pad, pad, cw, ch, S.mz, "MZ twins: liability to the disorder", "#5ad1ff", null, S.thr);
    scatter(c, pad * 2 + cw, pad, cw, ch, S.dz, "DZ twins: liability to the disorder", "#ffb454", null, S.thr);
    TX(c, `MZ concordance ${(100 * S.cMZ).toFixed(0)}%`, pad + cw / 2, pad + ch + 30, "#5ad1ff", "center", "700 20px"); TX(c, `DZ concordance ${(100 * S.cDZ).toFixed(0)}%`, pad * 2 + cw * 1.5, pad + ch + 30, "#ffb454", "center", "700 20px");
    TX(c, "red dashed lines: the threshold. Yellow: one twin affected. Red: both affected. (20 000 pairs; most unaffected pairs not drawn)", w / 2, pad + ch + 58, "#8fa0bf", "center", "12px");
    TX(c, `${(100 * S.prevNow).toFixed(1)}% of people affected`, w / 2, pad + ch + 78, "#fff", "center", "600 13px");
  }
}
function panels() {
  if (P.mode === "trait") {
    relabel(["r MZ together", "r DZ together", "Falconer h²", "True A"]); read.set("a", S.rMZ.toFixed(3)); read.set("b", S.rDZ.toFixed(3)); read.set("c", S.h2.toFixed(3)); read.set("d", P.A.toFixed(2));
    chA.opts.title = "Twin and family correlations: observed v expected from the truth"; chA.opts.xLabel = "1 MZ together · 2 DZ together · 3 MZ apart · 4 bio parent · 5 adoptive parent"; chA.opts.yLabel = "correlation"; chA.opts.xFmt = chB.opts.xFmt = v => Math.abs(v - Math.round(v)) < 1e-6 ? String(Math.round(v)) : "";
    const A = P.A, Cc = P.C, eea = Math.min(P.eea, Math.max(0, 1 - A - Cc)), exp = [A + Cc + eea, A / 2 + Cc, A, A / 2, Cc], obs = [S.rMZ, S.rDZ, S.rAp, S.rBio, S.rAdp];
    chA.draw([{ pts: obs.map((v, i) => [i + 1 - 0.17, v]), type: "bars", w: 0.32, color: K.cssVar("--s0"), label: "observed" }, { pts: exp.map((v, i) => [i + 1 + 0.17, v]), type: "bars", w: 0.32, color: K.cssVar("--s1"), label: "model (with sel. placement ignored)" }], { yMin: Math.min(0, ...obs), yMax: 1 });
    chB.opts.title = "Where the variation comes from: truth v twin-study estimate"; chB.opts.xLabel = "1 genes (A, h²) · 2 shared environment (C, c²) · 3 unique environment (E, e²)"; chB.opts.yLabel = "proportion of variance";
    chB.draw([{ pts: [[0.83, P.A], [1.83, P.C], [2.83, Math.max(0, 1 - P.A - P.C)]], type: "bars", w: 0.32, color: K.cssVar("--s2"), label: "truth" }, { pts: [[1.17, S.h2], [2.17, S.c2], [3.17, S.e2]], type: "bars", w: 0.32, color: K.cssVar("--s3"), label: "Falconer estimate" }], { yMin: Math.min(0, S.c2, S.h2), yMax: 1 });
  } else {
    relabel(["MZ concordance", "DZ concordance", "People affected", "True A"]); read.set("a", (100 * S.cMZ).toFixed(1) + "%"); read.set("b", (100 * S.cDZ).toFixed(1) + "%"); read.set("c", (100 * S.prevNow).toFixed(2) + "%"); read.set("d", P.A.toFixed(2));
    // the distribution of liability with the threshold: genes alone v genes + environment
    const h = K.histogram(S.mz.map(q => q[0]), 60, -4, 4); chA.opts.xFmt = chB.opts.xFmt = null; chA.opts.title = "Liability in the population (genes + environment)"; chA.opts.xLabel = "liability"; chA.opts.yLabel = "people";
    chA.draw([{ pts: h.pts.filter(p => p[0] <= S.thr), type: "bars", w: h.w, color: K.cssVar("--s0"), label: "unaffected" }, { pts: h.pts.filter(p => p[0] > S.thr), type: "bars", w: h.w, color: K.cssVar("--s3"), label: "affected" }], { vlines: [{ x: S.thr, label: "threshold" }] });
    // concordance curve: probandwise MZ and DZ concordance across heritabilities, at the current shared environment (20 000 pairs each)
    if (!S.curve) { const r = K.rng(11), cm = [], cd = []; for (let a = 0; a <= 1.0001; a += 0.1) { const Q = { A: a, C: Math.min(P.C, 1 - a), eea: 0 }, thr = zAbove(P.prev) - P.stress * Math.sqrt(Math.max(0, 1 - a)); cm.push([a, 100 * concordance(twinPairs(r, 20000, Q, "mz"), thr)]); cd.push([a, 100 * concordance(twinPairs(r, 20000, Q, "dz"), thr)]); } S.curve = { cm, cd }; }
    chB.opts.title = `Concordance against heritability (C = ${P.C}, this prevalence and stress)`; chB.opts.xLabel = "heritability A"; chB.opts.yLabel = "concordance %";
    chB.draw([{ pts: S.curve.cm, color: K.cssVar("--s0"), label: "MZ" }, { pts: S.curve.cd, color: K.cssVar("--s1"), label: "DZ" }, { pts: [[P.A, 100 * S.cMZ], [P.A, 100 * S.cDZ]], type: "dots", r: 5, color: K.cssVar("--s2"), label: "your sample" }], { yMin: 0, yMax: 100 });
  }
}
let frame = 0;
ui.run(() => { }, () => { draw(); if (frame++ % 10 === 0) panels(); });
set({});
ui.tip("Each dot is a pair of twins. Move the genes and environment sliders and compare MZ and DZ twins.", 7000);
