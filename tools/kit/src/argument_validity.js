/* =====================================================================
   ARGUMENTS: VALIDITY, SOUNDNESS AND THE ARGUMENTS FOR GOD
   A DEDUCTIVE argument is VALID if the conclusion MUST be true whenever
   all the premises are true: its form makes it impossible to have true
   premises and a false conclusion. It is SOUND if it is valid AND its
   premises really are true. Validity is about form, not content:
        All fish can fly. All salmon are fish. So all salmon can fly.
   is valid (but unsound).
   A categorical SYLLOGISM has two premises and a conclusion, each one of
        A: All X are Y      E: No X are Y      I: Some X are Y      O: Some X are not Y
   linking three terms (subject S, predicate P, middle M) in one of four
   FIGURES. Of the 256 possible forms only 15 are valid (24 if we assume
   every term refers to something). A VENN DIAGRAM tests validity: draw
   the premises (shade empty regions, × for 'some') and see whether the
   conclusion is already drawn.
   An INDUCTIVE argument (e.g. Paley's design argument) can only make its
   conclusion probable. A PRIORI arguments (Anselm's ontological) use
   reason alone; A POSTERIORI ones (the cosmological and teleological
   arguments of Aquinas and Paley) start from experience.
   Even a valid argument is only as believable as its premises: the doubt
   in the conclusion can be as large as all the premises' doubts added up.
   ===================================================================== */
// ---------------- Categorical logic: a "model" says which of the 8 regions of the S, P, M Venn diagram have something in them ----------------
const TERMS = ["S", "P", "M"];      // bit 0 = in S, bit 1 = in P, bit 2 = in M
const inT = (reg, t) => (reg >> TERMS.indexOf(t)) & 1;
function holds(model, type, X, Y) { // does proposition (type, X, Y) hold in this model?
  for (let reg = 0; reg < 8; reg++) {
    if (!((model >> reg) & 1)) continue; const x = inT(reg, X), y = inT(reg, Y);
    if (type === "I" && x && y) return true; if (type === "O" && x && !y) return true;
    if (type === "A" && x && !y) return false; if (type === "E" && x && y) return false;
  }
  return type === "A" || type === "E";
}
const FIG = { 1: [["M", "P"], ["S", "M"]], 2: [["P", "M"], ["S", "M"]], 3: [["M", "P"], ["M", "S"]], 4: [["P", "M"], ["M", "S"]] };
function props(f) { return [[f.m1, ...FIG[f.fig][0]], [f.m2, ...FIG[f.fig][1]], [f.mc, "S", "P"]]; }
const nonEmpty = (model, t) => { for (let reg = 0; reg < 8; reg++) if ((model >> reg) & 1 && inT(reg, t)) return true; return false; };
/* Valid if no model makes both premises true and the conclusion false. Returns { valid, counter } (a counterexample model). */
function validity(f, imp) {
  const [p1, p2, c] = props(f);
  for (let model = 0; model < 256; model++) {
    if (imp && !TERMS.every(t => nonEmpty(model, t))) continue;
    if (holds(model, ...p1) && holds(model, ...p2) && !holds(model, ...c)) return { valid: false, counter: model };
  }
  return { valid: true };
}
// The traditional rules (distribution): which one does an invalid form break?
const dist = (type, pos) => pos === 0 ? (type === "A" || type === "E") : (type === "E" || type === "O");
function ruleBroken(f, imp) {
  const [p1, p2, c] = props(f), D = (pr, t) => (pr[1] === t && dist(pr[0], 0)) || (pr[2] === t && dist(pr[0], 1));
  const neg = t => t === "E" || t === "O";
  if (!D(p1, "M") && !D(p2, "M")) return "Undistributed middle: the middle term M is never about all of its class, so the premises needn't connect S and P.";
  if (D(c, "P") && !(D(p1, "P") || D(p2, "P"))) return "Illicit major: the conclusion says something about all of P, but the premise only spoke of some of P.";
  if (D(c, "S") && !(D(p1, "S") || D(p2, "S"))) return "Illicit minor: the conclusion says something about all of S, but the premise only spoke of some of S.";
  if (neg(p1[0]) && neg(p2[0])) return "Two negative premises: nothing follows from two 'no' or 'not' statements.";
  if ((neg(p1[0]) || neg(p2[0])) !== neg(c[0])) return neg(c[0]) ? "A negative conclusion needs a negative premise." : "A negative premise can only give a negative conclusion.";
  if (!imp && !["I", "O"].includes(p1[0]) && !["I", "O"].includes(p2[0]) && ["I", "O"].includes(c[0])) return "Existential fallacy: two universal premises can't prove that something exists ('some'), unless we assume every term refers to something.";
  return "Invalid form.";
}
const sentence = (type, X, Y, W) => ({ A: `All ${W[X]} are ${W[Y]}.`, E: `No ${W[X]} are ${W[Y]}.`, I: `Some ${W[X]} are ${W[Y]}.`, O: `Some ${W[X]} are not ${W[Y]}.` })[type];
const PRESETS = {
  barbara: { name: "Greeks are mortal", m1: "A", m2: "A", mc: "A", fig: 1, W: { S: "Greeks", P: "mortal", M: "humans" }, truth: [true, true] },
  salmon: { name: "Flying salmon", m1: "A", m2: "A", mc: "A", fig: 1, W: { S: "salmon", P: "things that can fly", M: "fish" }, truth: [false, true] },
  cats: { name: "Cats and dogs", m1: "A", m2: "A", mc: "A", fig: 2, W: { S: "dogs", P: "cats", M: "mammals" }, truth: [true, true] },
  atheists: { name: "Atheists and believers", m1: "A", m2: "E", mc: "E", fig: 1, W: { S: "atheists", P: "believers", M: "theists" }, truth: [true, true] },
  cosmo: { name: "Everything has a cause", m1: "A", m2: "A", mc: "A", fig: 1, W: { S: "things in the universe", P: "things with a cause", M: "contingent things" }, truth: [true, true] },
  onto: { name: "Necessary beings", m1: "A", m2: "A", mc: "A", fig: 1, W: { S: "gods", P: "things that exist", M: "necessary beings" }, truth: [true, true] }
};
// ---------------- The arguments for God as premise chains ----------------
const ARGS = {
  anselm: { name: "Ontological (Anselm, Proslogion 2)", kind: "deductive, a priori", prem: ["God is that than which nothing greater can be conceived.", "God exists at least in the mind (even the fool understands the idea).", "Existing in reality is greater than existing in the mind alone.", "If God existed only in the mind, a greater being could be conceived."], crit: "Gaunilo: the same form 'proves' a perfect island. Kant: existence is not a real predicate, so premise 3 fails." },
  kalam: { name: "Kalam cosmological", kind: "deductive, a posteriori", prem: ["Whatever begins to exist has a cause.", "The universe began to exist."], crit: "Is premise 1 known beyond the universe? Is the cause a personal God? (Hume: we have no experience of universes being made.)" },
  third: { name: "Aquinas' Third Way (contingency)", kind: "deductive, a posteriori", prem: ["Things in the world are contingent: they can fail to exist.", "If everything were contingent, at some time nothing would have existed.", "Something cannot come from nothing.", "So not everything is contingent: there is a necessary being.", "This necessary being is what everyone calls God."], crit: "Hume and Russell: the universe may just be a 'brute fact'; fallacy of composition; step 2 assumes infinite past time." },
  paley: { name: "Teleological (Paley's watch)", kind: "inductive, a posteriori", prem: ["A watch's parts fit together for a purpose, so it has a designer.", "The eye and the universe show the same kind of purposive order.", "Like effects have like causes (the analogy holds).", "No other process explains such order."], crit: "Hume: the analogy is weak, the designer could be many or flawed. Darwin: natural selection explains apparent design (attacks premise 4)." }
};

// ---------------- The page ----------------
const DEF = { view: "syll", preset: "barbara", imp: false, arg: "kalam", cred: [0.9, 0.9, 0.9, 0.9, 0.9], speed: 1 };
const P = { W: {} };
let rnd = K.rng(Date.now() % 9973 + 3), hunt = { n: 0, valid: 0, hist: [] }, tt = 0, flashModel = -1;
const ui = K.app({
  title: "Arguments: Validity and Soundness", subject: "Religion, Philosophy and Ethics",
  blurb: "Build syllogisms and test them with Venn diagrams; valid against sound, the classic fallacies; deductive and inductive arguments for God and how strong their premises must be",
  reset: () => set({ view: P.view }),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "GCSE Religious Studies: arguments for the existence of God (design, first cause), evaluating arguments, the difference between a strong and a weak argument, using evidence and reasoning.", adv: "OCR A level Religious Studies (H573/01) Philosophy of religion: arguments based on observation (teleological: Aquinas, Paley, Hume's criticisms; cosmological: Aquinas, Hume) and on reason (ontological: Anselm, Gaunilo, Kant); deductive and inductive, a priori and a posteriori arguments. Formal syllogistic logic and probability bounds are beyond the spec." } },
  missions: [
    { title: "Valid and true", q: "Look at 'Greeks are mortal'. Is it valid? Find where the Venn diagram already shows the conclusion.", hint: "After shading for both premises, every Greek left is inside 'mortal': the conclusion is already drawn, so it is valid (the form 'Barbara', AAA-1). Its premises are true, so it is sound.", setup() { set({ preset: "barbara" }); } },
    { title: "Valid but false", q: "Choose 'Flying salmon'. Is it valid? Is it sound?", hint: "Exactly the same form as the Greeks, so it is valid; but 'all fish can fly' is false, so it is unsound. Validity is about the form, soundness also about the truth of the premises.", setup() { set({ preset: "salmon" }); } },
    { title: "True premises, invalid argument", q: "Choose 'Cats and dogs'. Every premise is true. Why doesn't the conclusion follow?", hint: "Undistributed middle: both premises only say dogs and cats are inside 'mammals'; they could be different parts of it. The Venn diagram leaves a region of dogs that are not cats.", setup() { set({ preset: "cats" }); } },
    { title: "Spot the fallacy", q: "Choose 'Atheists and believers'. Which rule does it break? Can you find a real counterexample?", hint: "Illicit major: the conclusion talks about all believers, but the premise 'all theists are believers' doesn't. Some believers (e.g. in fate) need not be theists, so some atheists could be believers.", setup() { set({ preset: "atheists" }); } },
    { title: "Hunt for valid forms", q: "Press play: the page tries random syllogisms. What fraction are valid?", hint: "Only 15 of the 256 forms are valid (5.9%), 24 if every term is assumed to name something. Most arguments that 'sound right' are not valid.", setup() { set({ preset: "barbara" }); } },
    { lvl: "adv", title: "The cosmological syllogism", q: "Choose 'Everything has a cause'. Is it valid? Does it prove there is a first cause, or God?", hint: "Valid (Barbara). But it only shows each thing in the universe has a cause; concluding that the universe as a whole has one cause is the fallacy of composition (Russell), and the cause need not be God.", setup() { set({ preset: "cosmo" }); } },
    { lvl: "adv", title: "How strong are the premises?", q: "Open the arguments view. Give each premise of Aquinas' Third Way 90% belief. How much can you be sure of the conclusion?", hint: "Five premises each with 10% doubt allow up to 50% doubt in the conclusion (and 59% belief if independent). A deductive argument can be valid yet weak if its premises are doubtful.", setup() { set({ view: "args", arg: "third" }); } },
    { lvl: "adv", title: "Paley and Darwin", q: "For Paley's design argument, lower your belief in premise 4 (no other process explains such order) as you would after Darwin. What happens to the conclusion?", hint: "Inductive arguments only make conclusions probable; if natural selection is a rival explanation, the probability of design drops sharply. This is why many see Darwin's work as the strongest challenge to Paley.", setup() { set({ view: "args", arg: "paley", cred: [0.95, 0.8, 0.7, 0.2, 0.9] }); } }
  ],
  batch: [
    { title: "How many syllogisms are valid?", question: "If syllogisms are made at random, what fraction are valid?", how: "Each run: 100 random forms (mood and figure), checked against all 256 possible Venn models.", yLabel: "valid (%)", reps: 200, bins: 16, theory: 100 * 15 / 256, theoryLabel: "15 of 256", run: (x, r) => { let n = 0; for (let i = 0; i < 100; i++) if (validity(randomForm(r), false).valid) n++; return n; }, note: "About 6%: valid forms are rare. Medieval logicians named them (Barbara, Celarent, Darii, Ferio…) to remember them." },
    { title: "With existential import (A level)", question: "If every term is assumed to refer to something, what fraction are valid?", how: "As before, but models with an empty term are ignored.", yLabel: "valid (%)", reps: 200, bins: 16, theory: 100 * 24 / 256, theoryLabel: "24 of 256", run: (x, r) => { let n = 0; for (let i = 0; i < 100; i++) if (validity(randomForm(r), true).valid) n++; return n; }, note: "Nine more forms become valid (e.g. 'All S are M, all M are P, so some S are P'). Whether 'all unicorns…' implies unicorns exist matters for arguments about God's existence too." },
    { title: "Long chains of premises", question: "If each premise has a 90% chance of being true (independently), how often are all of them true?", how: "Each run: 200 imaginary worlds; result = % in which every premise is true (so a valid argument's conclusion is guaranteed).", xLabel: "number of premises", yLabel: "all premises true (%)", xs: [1, 2, 3, 4, 5, 6, 8], reps: 6, yMin: 0, yMax: 100, theory: n => 100 * 0.9 ** n, theoryLabel: "100 × 0.9ⁿ", run: (n, r) => { let ok = 0; for (let i = 0; i < 200; i++) { let all = true; for (let k = 0; k < n; k++) if (r() > 0.9) all = false; if (all) ok++; } return ok / 2; }, note: "Each extra premise multiplies in more doubt: a five-step argument with 90% premises guarantees its conclusion only 59% of the time. Longer arguments (like the Third Way) need very secure premises." },
    { title: "Students judging validity (belief bias)", question: "Students tend to accept arguments whose conclusions they already believe. How often do they wrongly accept an invalid argument with a believable conclusion?", how: "Simulated students: accept with probability set by validity (+) and believability (+), as found by Evans, Barston and Pollard (1983): roughly 70% for invalid-believable.", yLabel: "invalid-but-believable arguments accepted (%)", reps: 200, bins: 16, theory: 71, theoryLabel: "Evans et al. (1983)", run: (x, r) => { let n = 0; for (let i = 0; i < 40; i++) if (r() < 0.71) n++; return 100 * n / 40; }, note: "People judge by the conclusion, not the form. That is why philosophers set arguments out formally: a believable conclusion (e.g. 'God exists' to a believer, or 'God doesn't' to an atheist) can hide an invalid argument." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "GCSE", text: "A strong argument gives good reasons for its conclusion; an argument can be challenged by questioning a premise or by showing the conclusion doesn't follow." },
      { lvl: "std", tag: "GCSE", text: "Design argument: the world shows order and purpose, so it was designed. First cause argument: everything has a cause, so there is a first cause, God." },
      { lvl: "adv", tag: "H573/01", text: "Deductive: if the premises are true the conclusion must be (valid; sound if the premises are true). Inductive: premises make the conclusion probable. A priori: by reason alone; a posteriori: from experience." },
      { lvl: "adv", tag: "H573/01 Ont", text: "Anselm's ontological argument (Proslogion 2–3): God is that than which nothing greater can be conceived; existing in reality is greater. Gaunilo's perfect island; Kant: existence is not a predicate." },
      { lvl: "adv", tag: "H573/01 Cos", text: "Aquinas' cosmological Ways (motion, cause, contingency): no infinite regress, so a first mover/cause/necessary being. Hume: causation is learned from experience; the universe may not need a cause. Russell: fallacy of composition." },
      { lvl: "adv", tag: "H573/01 Tel", text: "Teleological: Aquinas' Fifth Way (governance of things lacking knowledge); Paley's watch (analogy, qua purpose and qua regularity). Hume: weak analogy, many designers, imperfect design; Darwin: natural selection." },
      { lvl: "beyond", tag: "Beyond", text: "Syllogisms: moods A, E, I, O; four figures; 15 valid forms (24 with existential import). Rules: middle distributed, no illicit major/minor, not two negatives. Doubt in a valid conclusion ≤ the sum of the premises' doubts." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: "Explain the difference between a valid argument and a sound argument.", ans: "<ul><li>Valid: the conclusion follows from the premises (if they were true, it would have to be true) (1).</li><li>Sound: valid and the premises actually are true (1).</li></ul>" },
      { lvl: "adv", marks: 4, q: () => { const W = P.W; return `Is this argument valid? "${sentence(...props(P)[0], W)} ${sentence(...props(P)[1], W)} Therefore ${sentence(...props(P)[2], W).toLowerCase()}"`; }, ans: () => { const v = validity(P, P.imp); return `<ul><li>Form ${P.m1}${P.m2}${P.mc}-${P.fig}.</li><li>${v.valid ? "Valid: whenever both premises are true the conclusion must be (Venn diagram shows it)." : "Invalid: " + ruleBroken(P, P.imp)}</li><li>Sound only if it is valid and both premises are true.</li></ul>`; } },
      { lvl: "adv", marks: 15, q: "Explain Kant's criticism of the ontological argument.", ans: "<ul><li>Existence is not a real (determining) predicate: it adds nothing to the concept (100 real thalers = 100 imagined thalers).</li><li>Anselm treats existence as a perfection that makes God 'greater'.</li><li>Analytic/synthetic: existential claims are synthetic, so can't be proved by analysing a concept; denying God's existence is not a contradiction (reject subject with predicate).</li></ul>" },
      { lvl: "adv", marks: 40, q: "'The teleological argument is a weak argument for the existence of God.' Discuss.", ans: "<ul><li>AO1: Paley's watch, Aquinas' Fifth Way, design qua purpose and regularity; Hume's criticisms; Darwin; modern versions (fine-tuning).</li><li>AO2: inductive strength, analogy, rival explanations, the problem of evil, cumulative case; judgement on 'weak'.</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li>A syllogism's three statements are tested against all 256 possible Venn 'models' (which of the 8 regions of the S, P, M diagram contain something). Valid = no model makes both premises true and the conclusion false; any model that does is a counterexample. With existential import, models with an empty term are ignored.</li>
<li>Rules checked for an invalid form: undistributed middle, illicit major or minor, two negatives, negative premise against conclusion, existential fallacy (distribution: A distributes its subject, E both terms, I neither, O its predicate).</li>
<li>Arguments for God: your belief (credence) in each premise. For a valid deductive argument, the least the conclusion can be believed is 1 − (sum of doubts); if the premises are independent, belief that all are true = the product. For Paley (inductive), the product is multiplied by the strength of the analogy.</li></ul>
<h3>Assumptions and simplifications</h3>
<ul><li>Only categorical syllogisms are tested; real arguments (including the ontological and cosmological ones) use richer logic (modal, causal).</li><li>Setting an argument out in a few premises leaves out much of what Anselm, Aquinas and Paley actually argued.</li><li>Probabilities of premises are personal judgements: the page shows how they combine, not what they should be. It takes no side on whether God exists.</li></ul>`
});
function randomForm(r) { const M = "AEIO"; return { m1: M[r.int(4)], m2: M[r.int(4)], mc: M[r.int(4)], fig: 1 + r.int(4) }; }

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("What to look at");
ctl.view = K.seg(g, { value: "syll", options: [["syll", "Syllogisms and Venn diagrams"], ["args", "Arguments for God (A level)"]], on: v => { P.view = v; showGroups(); } });
const gS = ui.group("The syllogism");
ctl.preset = K.seg(gS, { label: "Examples", value: "barbara", options: Object.entries(PRESETS).map(([k, p]) => [k, p.name]), on: v => setPreset(v) });
const moodOpts = [["A", "All"], ["E", "No"], ["I", "Some"], ["O", "Some … not"]];
ctl.m1 = K.seg(gS, { label: "Premise 1 (major)", value: "A", options: moodOpts, on: v => { P.m1 = v; P.truth = null; } });
ctl.m2 = K.seg(gS, { label: "Premise 2 (minor)", value: "A", options: moodOpts, on: v => { P.m2 = v; P.truth = null; } });
ctl.mc = K.seg(gS, { label: "Conclusion", value: "A", options: moodOpts, on: v => { P.mc = v; P.truth = null; } });
ctl.fig = K.seg(gS, { label: "Figure (where the middle term goes)", value: 1, options: [[1, "1: M–P, S–M"], [2, "2: P–M, S–M"], [3, "3: M–P, M–S"], [4, "4: P–M, M–S"]], on: v => { P.fig = +v; P.truth = null; } });
ctl.imp = K.toggle(gS, { label: "Assume every term refers to something (existential import, A level)", value: false, on: v => P.imp = v });
ctl.speed = K.slider(gS, { label: "Speed of the random hunt", min: 0.25, max: 4, step: 0.25, value: 1, fmt: v => v + "×", on: v => P.speed = v });
ui.headerSpeed(ctl.speed, { label: "Hunt speed" });   // playback speed lives in the header, beside Pause and Reset
const gA = ui.group("Argument for God");
ctl.arg = K.seg(gA, { value: "kalam", options: Object.entries(ARGS).map(([k, a]) => [k, a.name]), on: v => { P.arg = v; relabel(); } });
const cs = [0, 1, 2, 3, 4].map(i => K.slider(gA, { label: "Premise " + (i + 1), min: 0, max: 1, step: 0.01, value: 0.9, fmt: v => Math.round(v * 100) + "% belief", on: v => P.cred[i] = v }));
ctl.analogy = K.slider(gA, { label: "Strength of the analogy (inductive only)", min: 0, max: 1, step: 0.05, value: 0.8, fmt: v => Math.round(v * 100) + "%", on: v => P.analogy = v });
const read = K.readout(ui.group("Readings"), [["form", "form (mood-figure)"], ["valid", "valid?"], ["sound", "sound?"], ["rule", "rule broken"], ["hunt", "random forms tried / valid"], ["low", "conclusion: at least (any premises)"], ["ind", "conclusion: if premises independent"]]);
function relabel() { const a = ARGS[P.arg]; cs.forEach((s, i) => { s.el.style.display = i < a.prem.length ? "" : "none"; if (i < a.prem.length) s.el.querySelector("label span").textContent = `${i + 1}. ${a.prem[i]}`; }); ctl.analogy.el.style.display = a.kind.startsWith("inductive") ? "" : "none"; }
function showGroups() { const a = P.view === "args"; gS.style.display = a ? "none" : ""; gA.style.display = a ? "" : "none"; if (a) relabel(); }
function setPreset(k) { const p = PRESETS[k]; Object.assign(P, { preset: k, m1: p.m1, m2: p.m2, mc: p.mc, fig: p.fig, W: Object.assign({}, p.W), truth: p.truth.slice() }); ctl.m1.set(P.m1); ctl.m2.set(P.m2); ctl.mc.set(P.mc); ctl.fig.set(P.fig); ctl.preset.set(k); }
function set(o) { Object.assign(P, DEF, { analogy: 0.8 }, o); P.cred = (o.cred || DEF.cred).slice(); ctl.view.set(P.view); ctl.imp.set(P.imp); ctl.speed.set(P.speed); ctl.arg.set(P.arg); cs.forEach((s, i) => s.set(P.cred[i] != null ? P.cred[i] : 0.9)); ctl.analogy.set(P.analogy); setPreset(P.preset); hunt = { n: 0, valid: 0, hist: [] }; showGroups(); }
// ---------------- Simulation: a random hunt through syllogism forms ----------------
let lastHunt = null;
function tick(dt) { if (P.view !== "syll") return; tt += dt * P.speed * 4; while (tt >= 1) { tt--; const f = randomForm(rnd), v = validity(f, P.imp).valid; hunt.n++; if (v) hunt.valid++; lastHunt = { f, v }; hunt.hist.push([hunt.n, 100 * hunt.valid / hunt.n]); if (hunt.hist.length > 400) hunt.hist.shift(); } }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function wrap(c, text, x, y, maxW, lh, col, f) { c.font = f + " Segoe UI,sans-serif"; let line = ""; for (const wd of text.split(" ")) { const t = line ? line + " " + wd : wd; if (c.measureText(t).width > maxW && line) { TX(c, line, x, y, col, "left", f); y += lh; line = wd; } else line = t; } if (line) { TX(c, line, x, y, col, "left", f); y += lh; } return y; }
function venn(c, cx, cy, R, f, W, counter) {
  // circle centres for S (left), P (right), M (bottom)
  const C = { S: [cx - R * 0.55, cy - R * 0.3], P: [cx + R * 0.55, cy - R * 0.3], M: [cx, cy + R * 0.55] }, inside = (x, y, t) => (x - C[t][0]) ** 2 + (y - C[t][1]) ** 2 < R * R;
  const regionOf = (x, y) => (inside(x, y, "S") ? 1 : 0) | (inside(x, y, "P") ? 2 : 0) | (inside(x, y, "M") ? 4 : 0);
  // which regions do the premises force empty (shaded) or occupied (×)?
  const [p1, p2] = props(f), empty = new Set(), some = [];
  for (const [ty, X, Y] of [p1, p2]) { if (ty === "A" || ty === "E") for (let reg = 1; reg < 8; reg++) { const x = inT(reg, X), y = inT(reg, Y); if (x && (ty === "A" ? !y : y)) empty.add(reg); } }
  for (const [ty, X, Y] of [p1, p2]) if (ty === "I" || ty === "O") { const cand = []; for (let reg = 1; reg < 8; reg++) { const x = inT(reg, X), y = inT(reg, Y); if (x && (ty === "I" ? y : !y) && !empty.has(reg)) cand.push(reg); } some.push(cand); }
  // shade pixel blocks by region (cheap: a coarse grid)
  const step = 4; for (let x = cx - 2 * R; x < cx + 2 * R; x += step) for (let y = cy - 1.5 * R; y < cy + 1.8 * R; y += step) { const reg = regionOf(x + 2, y + 2); if (!reg) continue; if (empty.has(reg)) { c.fillStyle = "rgba(255,138,112,0.45)"; c.fillRect(x, y, step, step); } else if (counter != null && (counter >> reg) & 1) { c.fillStyle = "rgba(255,209,102,0.5)"; c.fillRect(x, y, step, step); } }
  c.lineWidth = 2; for (const t of TERMS) { c.strokeStyle = { S: "#5ad1ff", P: "#7ee787", M: "#c9a0ff" }[t]; c.beginPath(); c.arc(C[t][0], C[t][1], R, 0, 6.3); c.stroke(); } c.lineWidth = 1;
  TX(c, `S: ${W.S}`, C.S[0] - R * 0.9, C.S[1] - R - 8, "#5ad1ff", "left", "600 12px"); TX(c, `P: ${W.P}`, C.P[0] + R * 0.9, C.P[1] - R - 8, "#7ee787", "right", "600 12px"); TX(c, `M: ${W.M}`, C.M[0], C.M[1] + R + 18, "#c9a0ff", "center", "600 12px");
  // centre point of each region, for the × marks
  const centre = reg => { let sx = 0, sy = 0, n = 0; for (let x = cx - 2 * R; x < cx + 2 * R; x += 6) for (let y = cy - 1.5 * R; y < cy + 1.8 * R; y += 6) if (regionOf(x, y) === reg) { sx += x; sy += y; n++; } return [sx / n, sy / n]; };
  some.forEach(cand => { if (!cand.length) return; const pts = cand.map(centre); const x = pts.reduce((a, p) => a + p[0], 0) / pts.length, y = pts.reduce((a, p) => a + p[1], 0) / pts.length; TX(c, cand.length > 1 ? "×?" : "×", x, y + 6, "#ffd166", "center", "700 20px"); if (cand.length > 1) { c.strokeStyle = "#ffd166"; c.setLineDash([3, 3]); c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke(); c.setLineDash([]); } });
}
function drawSyll(c, w, h) {
  const W = P.W, [p1, p2, cc] = props(P), v = validity(P, P.imp), adv = ui.level === "adv";
  TX(c, "The argument", 20, 30, "#eef2f8", "left", "600 15px");
  let y = 58; [[sentence(...p1, W), "Premise 1"], [sentence(...p2, W), "Premise 2"], ["Therefore " + sentence(...cc, W).charAt(0).toLowerCase() + sentence(...cc, W).slice(1), "Conclusion"]].forEach(([s, lab], i) => { TX(c, lab, 20, y, "#8fa0bf", "left", "11.5px"); y = wrap(c, s, 20, y + 18, w * 0.42, 18, i === 2 ? "#ffd166" : "#eef2f8", "600 15px") + 10; if (i === 1) { c.strokeStyle = "#55627f"; c.beginPath(); c.moveTo(20, y - 4); c.lineTo(w * 0.42, y - 4); c.stroke(); y += 6; } });
  y += 8; TX(c, v.valid ? "VALID" : "INVALID", 20, y + 10, v.valid ? "#7ee787" : "#ff8a70", "left", "700 26px");
  TX(c, `form ${P.m1}${P.m2}${P.mc}-${P.fig}`, 160, y + 8, "#8fa0bf", "left", "13px"); y += 36;
  if (!v.valid) y = wrap(c, ruleBroken(P, P.imp), 20, y, w * 0.42, 17, "#ffb39a", "13px") + 6;
  else y = wrap(c, "Whenever both premises are true, the conclusion must be true: the Venn diagram for the premises already shows the conclusion.", 20, y, w * 0.42, 17, "#b7f5bf", "13px") + 6;
  if (P.truth) { const sound = v.valid && P.truth[0] && P.truth[1]; y = wrap(c, `Premise 1 is ${P.truth[0] ? "true" : "FALSE"}, premise 2 is ${P.truth[1] ? "true" : "FALSE"}, so the argument is ${sound ? "SOUND" : "UNSOUND"}.`, 20, y + 6, w * 0.42, 17, sound ? "#7ee787" : "#ffd166", "600 13px"); }
  if (!v.valid) wrap(c, "Yellow regions: a counterexample, a possible world with things in these regions where both premises are true but the conclusion is false.", 20, y + 10, w * 0.42, 16, "#8fa0bf", "11.5px");
  const R = Math.min(w * 0.13, h * 0.22); venn(c, w * 0.72, h * 0.5, R, P, W, v.valid ? null : v.counter);
  TX(c, "red = shown empty by a premise · × = something is here (×? = in one of these)", w * 0.72, h - 16, "#8fa0bf", "center", "11.5px");
  if (lastHunt && ui.playing) TX(c, `random hunt: ${lastHunt.f.m1}${lastHunt.f.m2}${lastHunt.f.mc}-${lastHunt.f.fig} ${lastHunt.v ? "✔ valid" : "✘"}`, w - 20, 30, lastHunt.v ? "#7ee787" : "#8fa0bf", "right", "12px");
}
function drawArgs(c, w, h) {
  const a = ARGS[P.arg], n = a.prem.length, cr = P.cred.slice(0, n), doubt = cr.reduce((s, v) => s + (1 - v), 0), low = Math.max(0, 1 - doubt), ind = cr.reduce((s, v) => s * v, 1) * (a.kind.startsWith("inductive") ? P.analogy : 1);
  TX(c, a.name, 20, 30, "#eef2f8", "left", "600 16px"); TX(c, a.kind, 20, 50, "#8fa0bf", "left", "12px");
  let y = 80; const bw = w * 0.5;
  a.prem.forEach((p, i) => { c.fillStyle = "#121a2e"; c.fillRect(20, y - 16, w - 40, 38); c.fillStyle = "#5ad1ff"; c.fillRect(20, y - 16, (w - 40) * cr[i], 4); TX(c, `${i + 1}.`, 30, y + 6, "#8fa0bf", "left", "600 13px"); wrap(c, p, 56, y + 6, w - 190, 16, "#eef2f8", "13px"); TX(c, Math.round(cr[i] * 100) + "%", w - 30, y + 6, "#5ad1ff", "right", "600 14px"); y += 46; });
  c.strokeStyle = "#cfd8ea"; c.beginPath(); c.moveTo(20, y - 12); c.lineTo(w - 20, y - 12); c.stroke();
  TX(c, a.kind.startsWith("inductive") ? "So, probably: the universe has a designer (God)." : "Therefore: God exists.", 30, y + 12, "#ffd166", "left", "600 15px");
  y += 40; const bar = (lab, v, col) => { TX(c, lab, 30, y, "#cfd8ea", "left", "12.5px"); c.fillStyle = "#1a2238"; c.fillRect(30, y + 6, bw, 18); c.fillStyle = col; c.fillRect(30, y + 6, bw * v, 18); TX(c, Math.round(v * 100) + "%", 36 + bw * v, y + 20, col, "left", "600 13px"); y += 44; };
  if (!a.kind.startsWith("inductive")) bar("Guaranteed belief in the conclusion (at least 1 − total doubt)", low, "#ff8a70");
  bar(a.kind.startsWith("inductive") ? "Probability of the conclusion (premises × strength of analogy)" : "Belief if the premises are independent (product)", ind, "#7ee787");
  wrap(c, "Critics: " + a.crit, 30, y + 4, w - 60, 17, "#8fa0bf", "12.5px");
}
function draw() { const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); if (P.view === "args") drawArgs(c, w, h); else drawSyll(c, w, h); }

// ---------------- Charts and readings ----------------
function charts() {
  const v = validity(P, P.imp);
  chA.opts.title = "Random hunt: % of forms found valid"; chA.opts.xLabel = "forms tried"; chA.opts.yLabel = "% valid";
  chA.draw([{ pts: hunt.hist, color: "#7ee787", label: P.imp ? "with existential import" : "no import" }], { yMin: 0, yMax: 20, hlines: [{ y: 100 * 15 / 256, color: "#cfd8ea", label: "15/256" }, { y: 100 * 24 / 256, color: "#55627f", label: "24/256" }] });
  chB.opts.title = "All 64 moods × 4 figures: valid forms (dots)"; chB.opts.xLabel = "mood (AAA … OOO)"; chB.opts.yLabel = "figure";
  const pts = [], M = "AEIO"; for (let i = 0; i < 64; i++) for (let fg = 1; fg <= 4; fg++) { const f = { m1: M[i >> 4], m2: M[(i >> 2) & 3], mc: M[i & 3], fig: fg }; if (validity(f, P.imp).valid) pts.push([i, fg]); }
  const mi = "AEIO".indexOf(P.m1) * 16 + "AEIO".indexOf(P.m2) * 4 + "AEIO".indexOf(P.mc);
  chB.draw([{ pts, type: "dots", r: 4, color: "#7ee787", label: `${pts.length} valid` }, { pts: [[mi, P.fig]], type: "dots", r: 7, color: v.valid ? "#ffd166" : "#ff8a70", label: "yours" }], { xMin: -1, xMax: 64, yMin: 0.5, yMax: 4.5, xFmt: v2 => Math.abs(v2 - Math.round(v2)) < 0.01 && Math.round(v2) % 16 === 0 && v2 < 64 ? M[Math.round(v2) >> 4] + "··" : "" });
  read.set("form", `${P.m1}${P.m2}${P.mc}-${P.fig}`); read.set("valid", v.valid ? "yes" : "no"); read.set("sound", P.truth ? (v.valid && P.truth[0] && P.truth[1] ? "yes" : "no") : "(choose an example)"); read.set("rule", v.valid ? "none" : ruleBroken(P, P.imp).split(":")[0]);
  read.set("hunt", `${hunt.n} / ${hunt.valid} (${hunt.n ? (100 * hunt.valid / hunt.n).toFixed(1) : 0}%)`);
  const a = ARGS[P.arg], cr = P.cred.slice(0, a.prem.length); read.set("low", Math.round(100 * Math.max(0, 1 - cr.reduce((s, x) => s + 1 - x, 0))) + "%"); read.set("ind", Math.round(100 * cr.reduce((s, x) => s * x, 1) * (a.kind.startsWith("inductive") ? P.analogy : 1)) + "%");
  ui.hud(P.view === "args" ? "valid ≠ true: a valid argument is only as strong as its premises" : "valid: true premises guarantee a true conclusion · sound: valid + true premises");
}
let frame = 0;
ui.run(dt => tick(dt), () => { draw(); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("Change the moods and the figure: the Venn diagram tests whether the conclusion follows.", 7000);
