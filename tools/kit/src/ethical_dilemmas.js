/* =====================================================================
   ETHICAL THEORIES AND DILEMMAS
   Four normative theories in the OCR specification, applied to the same
   dilemmas so you can see where they agree and where they part company:
     NATURAL LAW (Aquinas): reason discovers our God-given purposes; the
       primary precepts (preserve life, reproduce, educate, live in an
       ordered society, worship God) give secondary precepts. The
       DOCTRINE OF DOUBLE EFFECT allows an act with a bad side-effect if
       the act itself is good or neutral, the bad effect is not the means
       or the intention, and there is a proportionate reason.
     KANTIAN ETHICS: act only on a maxim you could will to be a universal
       law; treat people always as ends, never merely as means. Duties
       hold whatever the consequences.
     UTILITARIANISM: the right act produces the greatest balance of
       pleasure over pain for all affected. Bentham (ACT) weighs each act
       with the HEDONIC CALCULUS (intensity, duration, certainty,
       propinquity, fecundity, purity, extent); RULE utilitarians (Mill)
       follow the rules that generally maximise happiness.
     SITUATION ETHICS (Fletcher): the only absolute is agape, self-giving
       love; do whatever is the most loving thing in this situation.
   The second view models a society where people make promises: ACT
   utilitarians break a promise whenever breaking it does more good right
   now; RULE utilitarians and Kantians keep them. Who ends up happier?
   ===================================================================== */
const THEORIES = [["nl", "Natural law", "#ffd166"], ["kant", "Kantian ethics", "#5ad1ff"], ["util", "Utilitarianism", "#7ee787"], ["se", "Situation ethics", "#f78fd6"]];
const V = { yes: ["✔", "#7ee787"], no: ["✘", "#ff8a70"], dis: ["?", "#ffd166"] };
/* ---------------- The dilemmas ----------------
   Each returns, for the current settings o (n people saved, p chance of success, suffering, act/rule), a verdict and the
   reasoning for each theory, plus the hedonic-calculus scores used by the utilitarian. */
const DIL = {
  trolley: { name: "The runaway trolley (switch)", act: "Pull the lever", story: o => `A runaway trolley will kill ${o.n} people on the track. Pulling a lever sends it onto a side track where it will kill one person.` },
  bridge: { name: "The footbridge", act: "Push the large man", story: o => `The trolley will kill ${o.n} people. The only way to stop it is to push a large man off a footbridge into its path; he will die.` },
  door: { name: "The murderer at the door", act: "Lie to the murderer", story: o => `Your friend is hiding in your house. A murderer knocks and asks where your friend is. A lie would probably (${Math.round(o.p * 100)}%) save your friend.` },
  euth: { name: "Voluntary euthanasia", act: "Help the patient die", story: o => `A terminally ill patient, mentally competent, in ${o.suffer > 0.66 ? "unbearable" : o.suffer > 0.33 ? "severe" : "moderate"} pain that cannot be relieved, repeatedly asks a doctor to help them die.` },
  whistle: { name: "Whistleblowing at work", act: "Blow the whistle", story: o => `Your company is hiding a safety defect that may injure ${o.n} customers. Reporting it will probably cost you your job.` },
  promise: { name: "The broken promise", act: "Break the promise to help", story: o => `You promised to meet a friend for an important event. On the way you find a stranger injured; staying to help means breaking the promise.` }
};
function verdicts(k, o) {
  const n = o.n, p = o.p, rule = o.rule, R = {};
  // hedonic calculus (act utilitarian): net pleasure of acting minus not acting, from rough scores out of 10 for each criterion
  const hc = {
    trolley: { act: { intensity: 8, duration: 9, certainty: 9 * p + 1, propinquity: 9, fecundity: 6, purity: 4, extent: n * p - 1 }, not: {} },   // extent: expected lives saved (n × chance) − the one who dies for certain
    bridge: { act: { intensity: 8, duration: 9, certainty: 9 * p + 1, propinquity: 9, fecundity: 4, purity: 3, extent: n * p - 1 }, not: {} },
    door: { act: { intensity: 9, duration: 9, certainty: 10 * p, propinquity: 10, fecundity: 5, purity: 6, extent: 1 }, not: {} },
    euth: { act: { intensity: 10 * o.suffer, duration: 6, certainty: 9, propinquity: 10, fecundity: 4, purity: 7, extent: 1 + o.suffer }, not: {} },
    whistle: { act: { intensity: 7, duration: 8, certainty: 8 * p + 2, propinquity: 6, fecundity: 7, purity: 5, extent: n - 2 }, not: {} },
    promise: { act: { intensity: 9, duration: 7, certainty: 8, propinquity: 10, fecundity: 5, purity: 6, extent: 1 }, not: {} }
  }[k].act;
  const net = Object.values(hc).slice(0, 6).reduce((a, v) => a + v, 0) / 6 * hc.extent;     // average strength × number of people better off
  const say = (v, steps) => ({ v, steps });
  if (k === "trolley") {
    R.nl = say("yes", ["Act: turning the trolley is in itself neutral.", "Intention: to save life (primary precept), not to kill.", "The one death is a side-effect, not the means of saving the others.", `Proportionate: ${n} lives against 1.`, "Double effect allows it."]);
    R.kant = say("dis", ["Maxim 'kill one to save more' can't be universalised without treating life as a sum.", "But the one person is not used as a means: their death plays no part in the rescue.", "Kantians disagree: many say permissible, some forbid active killing."]);
    R.util = rule ? say(n > 1 ? "yes" : "no", ["Rule: 'minimise deaths in unavoidable accidents' generally maximises happiness.", `${n} saved against 1 lost.`]) : say(net > 0 ? "yes" : "no", [`Hedonic calculus: ${n} people spared against 1 killed.`, `Net score ${net.toFixed(0)} (with ${Math.round(p * 100)}% certainty).`, net > 0 ? "Greatest happiness: pull." : "Not worth it."]);
    R.se = say("yes", ["Agape seeks the good of all the people involved.", "Pragmatism: what works? Fewer deaths.", "Personalism: every life matters; the most loving outcome saves the most."]);
  } else if (k === "bridge") {
    R.nl = say("no", ["Pushing an innocent man to his death is an intrinsically evil act.", "His death is the MEANS of stopping the trolley, so double effect cannot apply.", "Primary precept: preserve (innocent) life."]);
    R.kant = say("no", ["The man is used merely as a means (a brake).", "Humanity formula: never treat a person merely as a means.", "Consequences don't change a duty."]);
    R.util = rule ? say("no", ["Rule: 'never kill innocent bystanders' generally maximises happiness (trust, security).", "Breaking it here would undermine the rule."]) : say(net > 0 ? "yes" : "no", [`Hedonic calculus: ${n} spared against 1 killed.`, `But certainty is only ${Math.round(p * 100)}%: will he really stop it?`, `Net ${net.toFixed(0)}: ${net > 0 ? "push" : "don't push"}.`]);
    R.se = say("dis", ["Agape is for persons, and here persons are at stake on both sides.", "Pragmatism may favour pushing; personalism resists using someone.", "Fletcher's critics: it depends on the person deciding."]);
  } else if (k === "door") {
    R.nl = say("no", ["Lying misuses speech, whose purpose is to communicate truth (Aquinas).", "Lying is intrinsically wrong; you may refuse to answer or stay silent."]);
    R.kant = say("no", ["'Lie when it seems useful' can't be universalised: if everyone lied, no one would believe anyone and lies would stop working.", "Kant's own answer: a duty of truthfulness even to the murderer.", "You are not responsible for what the murderer then does."]);
    R.util = rule ? say("yes", ["A rule 'tell the truth except to save innocent life from murderers' would maximise happiness.", "Strong rule utilitarians might keep 'never lie': but most allow this exception."]) : say(net > 0 ? "yes" : "no", [`A lie saves a life with ${Math.round(p * 100)}% probability.`, "The cost is small: one false statement to someone intending murder.", `Net ${net.toFixed(0)}: lie.`]);
    R.se = say("yes", ["Love for your friend comes first; rules like 'don't lie' serve love, not the other way round.", "Fletcher: love is the only norm; lying here is the loving act."]);
  } else if (k === "euth") {
    R.nl = say("no", ["Primary precept: preserve life. Deliberately ending innocent life is intrinsically wrong.", "Double effect permits strong pain relief that may shorten life (intention: relieve pain), but not a lethal dose meant to kill."]);
    R.kant = say("no", ["Kant: ending your life to escape pain treats yourself merely as a means to comfort.", "Some modern Kantians argue autonomy supports it: a disputed reading."]);
    R.util = rule ? say(o.suffer > 0.33 ? "yes" : "dis", ["Rule: allow voluntary euthanasia with strict safeguards (Mill: liberty over one's own body).", "Rule utilitarians worry about a slippery slope; safeguards answer it."]) : say(net > 15 ? "yes" : net > 6 ? "dis" : "no", [`Suffering level ${Math.round(o.suffer * 10)}/10 drives intensity and duration of pain avoided.`, `Net ${net.toFixed(0)}.`, "Family grief and the doctor's distress count too."]);
    R.se = say(o.suffer > 0.33 ? "yes" : "dis", ["Fletcher supported voluntary euthanasia: love respects the person's choice and ends needless suffering.", "Each case is judged on its situation, not by a rule."]);
  } else if (k === "whistle") {
    R.nl = say("yes", ["Primary precepts: preserve life (customers) and live in an ordered society.", "Truthfulness and justice; loyalty to an employer can't require covering up harm."]);
    R.kant = say("yes", ["Hiding a defect treats customers merely as means to profit.", "A maxim of deceiving customers could not be universalised.", "Duty to truth, whatever it costs you."]);
    R.util = rule ? say("yes", ["Rule: 'report dangers to the public' maximises happiness (trust in products, safety)."]) : say(net > 0 ? "yes" : "no", [`${n} customers protected against harm to you (job) and the company.`, `Net ${net.toFixed(0)}.`]);
    R.se = say("yes", ["Agape for the customers who may be injured outweighs loyalty to the company.", "Personalism: people before profits."]);
  } else {
    R.nl = say("yes", ["Preserving life is a primary precept; keeping an appointment is not.", "Help the injured stranger (Good Samaritan)."]);
    R.kant = say("dis", ["Keeping promises is a perfect duty; helping others an imperfect duty.", "Kant says perfect duties generally take priority, but a life at risk makes many Kantians disagree.", "(W.D. Ross's prima facie duties, beyond the spec, weigh them.)"]);
    R.util = rule ? say("yes", ["Rule: 'keep promises unless breaking one prevents serious harm' maximises happiness."]) : say(net > 0 ? "yes" : "no", ["The stranger's suffering prevented far outweighs the friend's disappointment.", `Net ${net.toFixed(0)}.`]);
    R.se = say("yes", ["Love for the neighbour in need; the friend, loving too, would understand."]);
  }
  return { R, hc, net };
}

/* ---------------- The society of promises ----------------
   N people. Each round, pairs make a deal: one promises to deliver something worth b to the other; keeping it costs c (random).
   Deals only happen if the other person trusts promises enough (probability = trust). Every completed deal also creates a surplus s
   for both (cooperation). Act utilitarians break a promise if, right now, c > b (breaking does more good). Rule utilitarians and
   Kantians always keep. Situation ethicists break only if c > 3b (a serious, loving reason). Trust follows the recent keep rate. */
function society(o, r, rounds) {
  const N = 200, kinds = [], out = { welfare: [], trust: [], kept: 0, made: 0 };
  for (let i = 0; i < N; i++) { const u = r(); kinds.push(u < o.fAct ? "act" : u < o.fAct + o.fSE ? "se" : "rule"); }
  let trust = o.trust0;
  for (let t = 0; t < rounds; t++) {
    let W = 0, kept = 0, made = 0;
    for (let i = 0; i < N / 2; i++) {
      const pr = kinds[r.int(N)]; if (r() > trust) continue;           // no trust, no deal
      made++; const b = 1, c = Math.max(0, o.cost * (0.5 + r.gauss() * o.spread + 0.5));
      const breakIt = pr === "act" ? c > b : pr === "se" ? c > 3 * b : false;
      if (breakIt) W += c * 0.999 - 0.2; else { W += b - c + 2 * o.surplus; kept++; }
    }
    trust += 0.08 * ((made ? kept / made : 1) - trust);                 // trust drifts towards how often promises are kept
    trust = Math.max(0.02, Math.min(1, trust));
    out.welfare.push(W / (N / 2)); out.trust.push(trust); out.kept += kept; out.made += made;
  }
  return out;
}

// ---------------- The page ----------------
const DEF = { view: "dilemma", dil: "trolley", n: 5, p: 0.9, suffer: 0.8, rule: false, fAct: 0.5, fSE: 0, cost: 0.8, spread: 0.6, surplus: 0.5, trust0: 0.9, speed: 1 };
const P = {};
let rnd = K.rng(Date.now() % 9973 + 3), SOC = null, socT = 0, tt = 0, live = null, anim = 0;
const ui = K.app({
  title: "Ethical Theories and Dilemmas", subject: "Religion, Philosophy and Ethics",
  blurb: "Natural law, Kant, utilitarianism and situation ethics applied to the same dilemmas, the hedonic calculus, and a society where act and rule utilitarians make promises",
  reset: () => set({ view: P.view }),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "GCSE Religious Studies (e.g. AQA 8062 / OCR J625): Christian and secular moral reasoning, situation ethics and agape, the sanctity of life, euthanasia, absolute and relative morality.", adv: "OCR A level Religious Studies (H573/02) Religion and ethics: Natural law (Aquinas, primary and secondary precepts, double effect), Situation ethics (Fletcher, agape, working principles), Kantian ethics (categorical imperative, universalisability, persons as ends), Utilitarianism (Bentham's hedonic calculus, act and rule, Mill); applied to euthanasia and business ethics (whistleblowing). W.D. Ross and game theory are beyond the spec." } },
  missions: [
    { title: "Pull the lever?", q: "Five people on the track, one on the side track. What does each theory say? Which agree?", hint: "Utilitarianism and situation ethics: pull (more lives). Natural law: permitted by double effect (the death is a side-effect). Kant: disputed. Three of four can support pulling.", setup() { set({ dil: "trolley" }); } },
    { title: "Push the man?", q: "Now the footbridge: the numbers are the same. Why do natural law and Kant change their answer?", hint: "The man's death is the means of saving the others: double effect no longer applies, and he is used merely as a means. Only act utilitarianism cares purely about the numbers.", setup() { set({ dil: "bridge" }); } },
    { title: "Kant and the murderer", q: "Should you lie to the murderer at the door? Why does Kant say no?", hint: "A maxim of lying whenever useful could not be a universal law (lies would stop being believed). Kant also says a duty to truth isn't overridden by consequences, a famous objection to his theory.", setup() { set({ dil: "door" }); } },
    { title: "Euthanasia", q: "Change the patient's suffering. Which theories change their verdict and which never do?", hint: "Natural law and Kant (traditional reading) are absolutist: no amount of suffering permits killing. Utilitarianism and situation ethics are consequentialist/relativist: their answers depend on the situation.", setup() { set({ dil: "euth", suffer: 0.3 }); } },
    { title: "Where all agree", q: "Look at whistleblowing. Do the theories agree? Does agreement mean the answer is certain?", hint: "All four support blowing the whistle, for different reasons (precepts, duty, consequences, love). Convergence strengthens a conclusion, though it still depends on facts (is the danger real?).", setup() { set({ dil: "whistle" }); } },
    { title: "The hedonic calculus", q: "For the trolley, lower the chance the plan works. How does the utilitarian verdict change?", hint: "Certainty is one of Bentham's seven criteria: an uncertain good counts for less. Here the extent is the expected number saved (5 × chance) minus the one who certainly dies: below a 20% chance, pulling the lever does more harm than good.", setup() { set({ dil: "trolley", p: 0.3 }); } },
    { lvl: "adv", title: "Act or rule?", q: "Switch to rule utilitarianism for the footbridge. Why does the verdict change?", hint: "A rule 'never kill innocent bystanders' generally maximises happiness (people can trust that they won't be sacrificed). Rule utilitarianism can agree with Kant in practice while still judging by consequences.", setup() { set({ dil: "bridge", rule: true }); } },
    { lvl: "adv", title: "A society of act utilitarians", q: "Open the society view with half act utilitarians. Watch trust and average welfare. Then make everyone a rule utilitarian.", hint: "Each broken promise does a little good right now, but trust erodes, deals stop happening, and everyone ends up poorer. Rule utilitarians (and Kantians) keep the trust that makes cooperation possible: a strong argument for rule over act utilitarianism.", setup() { set({ view: "society", fAct: 0.5 }); } },
    { lvl: "adv", title: "Situation ethics in society", q: "Replace the act utilitarians with situation ethicists (break only for a serious reason). Is trust kept?", hint: "Rarely broken promises keep trust high: situation ethics behaves much like a rule-follower most of the time, with exceptions for serious need, as Fletcher intended.", setup() { set({ view: "society", fAct: 0, fSE: 0.5 }); } }
  ],
  batch: [
    { title: "Act utilitarians and welfare", question: "How does average welfare depend on the fraction of act utilitarians in the society?", how: "200 people, 150 rounds; average welfare per deal-pair over the last 50 rounds.", xLabel: "act utilitarians (%)", yLabel: "average welfare", xs: [0, 10, 25, 50, 75, 100], reps: 6, run: (x, r) => { const s = society(Object.assign({}, DEF, { fAct: x / 100 }), r, 150); return K.mean(s.welfare.slice(-50)); }, note: "Each act-utilitarian promise-breaker does slightly more good in the moment, yet welfare falls as their share grows: lost trust destroys the cooperation that produced most of the good. A classic argument (Hume, Mill) for rule utilitarianism." },
    { title: "Trust in the long run", question: "How much trust survives as more people break promises when it suits them?", how: "As above; trust after 150 rounds.", xLabel: "act utilitarians (%)", yLabel: "trust (share of promises kept)", xs: [0, 10, 25, 50, 75, 100], reps: 6, yMin: 0, yMax: 1, theory: x => 1 - (x / 100) * keepGap(), theoryLabel: "1 − fraction × P(break)", run: (x, r) => { const s = society(Object.assign({}, DEF, { fAct: x / 100 }), r, 150); return s.trust[s.trust.length - 1]; }, note: "Trust settles at the share of promises kept: each act utilitarian breaks a promise whenever its cost exceeds its benefit. Kant's point: a maxim of breaking promises when convenient undermines the very practice of promising." },
    { title: "Where Kant and utilitarianism part company", question: "In random rescue dilemmas, how often do Kantian and act-utilitarian verdicts agree?", how: "Each dilemma: acting saves 2–10 people at the cost of 1; with probability q the one person is used as a means (footbridge-type), otherwise the death is a side-effect (switch-type). Kant: acts only if no one is used as a means; act utilitarian: always acts.", xLabel: "chance the victim is used as a means, q", yLabel: "dilemmas where they agree (%)", xs: [0, 0.2, 0.4, 0.6, 0.8, 1], reps: 6, yMin: 0, yMax: 100, theory: q => 100 * (1 - q), theoryLabel: "100(1 − q)", run: (q, r) => { let a = 0; for (let i = 0; i < 100; i++) { const means = r() < q, util = 2 + r.int(9) > 1, kant = !means; if (util === kant) a++; } return a; }, note: "They agree on 'side-effect' cases and disagree on 'means' cases: the means–end distinction, not the numbers, separates deontology from consequentialism." },
    { title: "Hedonic calculus and certainty", question: "For the trolley with 5 on the track, how does the act-utilitarian score depend on how certain the rescue is?", how: "Net hedonic score of pulling the lever; each criterion estimated with ±1 point of disagreement between students.", xLabel: "certainty of success", yLabel: "net hedonic score", xs: [0, 0.2, 0.4, 0.6, 0.8, 1], reps: 6, theory: p => verdicts("trolley", Object.assign({}, DEF, { p })).net, theoryLabel: "calculus with exact scores", run: (p, r) => { const h = verdicts("trolley", Object.assign({}, DEF, { p })).hc; let s = 0; for (const k of ["intensity", "duration", "certainty", "propinquity", "fecundity", "purity"]) s += h[k] + r.gauss(); return s / 6 * h.extent; }, note: "The score rises steadily with certainty and is negative below 20% (5 × chance < 1 life). The scatter shows a known weakness of the calculus: different people give different scores, so it is less exact than it looks." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "GCSE", text: "Absolute morality: some acts are always right or wrong (natural law, Kant). Relative morality: the right act depends on the situation or its consequences (situation ethics, utilitarianism)." },
      { lvl: "std", tag: "GCSE", text: "Situation ethics (Joseph Fletcher, 1966): the only absolute is agape (unconditional love); do the most loving thing in each situation." },
      { lvl: "adv", tag: "H573/02 NL", text: "Natural law (Aquinas): telos; primary precepts (preserve life, reproduce, educate, live in society, worship God); secondary precepts; real and apparent goods; the doctrine of double effect (act good or neutral; bad effect not intended nor the means; proportionate reason)." },
      { lvl: "adv", tag: "H573/02 Kant", text: "Kant: good will and duty; hypothetical against categorical imperatives; formulations: universal law, humanity as an end, kingdom of ends; perfect and imperfect duties; the murderer at the door objection." },
      { lvl: "adv", tag: "H573/02 Util", text: "Bentham: principle of utility, hedonic calculus (intensity, duration, certainty, propinquity, fecundity, purity, extent), act utilitarianism. Mill: higher and lower pleasures, rule utilitarianism, harm principle." },
      { lvl: "adv", tag: "H573/02 SE", text: "Fletcher's four working principles (pragmatism, relativism, positivism, personalism) and six propositions (e.g. love is the only norm; love and justice are the same; the end justifies the means)." },
      { lvl: "adv", tag: "H573/02 applied", text: "Euthanasia: sanctity against quality of life, autonomy; voluntary and non-voluntary. Business ethics: corporate social responsibility, whistleblowing, good ethics as good business, globalisation." }
    ],
    questions: [
      { lvl: "std", marks: 4, q: "Explain how a Christian following situation ethics might respond to euthanasia.", ans: "<ul><li>Agape is the only absolute; rules like 'do not kill' serve love (1 + 1).</li><li>Judge each case: if ending life is the most loving act for a suffering patient who asks, it may be right (1); Fletcher supported voluntary euthanasia (1).</li></ul>" },
      { lvl: "adv", marks: 15, q: "Explain how the doctrine of double effect distinguishes the switch and footbridge trolley cases.", ans: "<ul><li>Conditions of double effect: nature of the act, intention, means–end, proportionality.</li><li>Switch: diverting is neutral; death foreseen but not intended, not the means; 5 against 1 proportionate.</li><li>Footbridge: the man's death is the means of stopping the trolley; act is killing the innocent; fails the conditions.</li></ul>" },
      { lvl: "adv", marks: 40, q: "'Rule utilitarianism is a better approach to moral decision-making than act utilitarianism.' Discuss.", ans: "<ul><li>AO1: Bentham's act utilitarianism and hedonic calculus; Mill's rule utilitarianism, higher pleasures, harm principle.</li><li>AO2: act: flexible, but can justify injustice (footbridge, scapegoat), hard to calculate; rule: protects rights and trust (promising), but rule worship or collapse into act (Smart).</li><li>Evaluation using examples; reasoned conclusion.</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li>Dilemmas (trolley cases: extent = people saved × chance of success − 1): each theory's verdict and reasons are written out for each dilemma, using standard textbook readings; '?' marks verdicts on which followers of that theory genuinely disagree. The act-utilitarian verdict uses a rough hedonic calculus: the average of six criterion scores (out of 10) × the extent (net number of people better off). Certainty depends on the chance of success you set.</li>
<li>Society of promises: 200 people; each round up to 100 deals. A deal happens only if trust allows it. The promiser keeps the promise (cost c, benefit 1, plus a cooperation surplus for both) or breaks it (saving c, the other loses out). Act utilitarians break when c > 1, situation ethicists when c > 3, rule utilitarians and Kantians never. Trust moves 8% of the way to the share of promises kept each round.</li></ul>
<h3>Assumptions and simplifications</h3>
<ul><li>The theories are far richer than a verdict: the reasons matter more than the tick or cross, and scholars disagree about applications (especially Kant and situation ethics).</li><li>Hedonic scores are illustrative judgements, not measurements; the calculus can't really put numbers on pleasure.</li><li>The promise model is a simple game-theory sketch: real trust depends on reputation, relationships and law.</li><li>Virtue ethics, divine command theory and Ross's prima facie duties are not modelled.</li></ul>`
});
function keepGap() { const c = DEF.cost, sp = DEF.spread; return 1 - (0.5 * (1 + erf((1 - c) / (c * sp * Math.SQRT2)))); }
function erf(x) { const t = 1 / (1 + 0.3275911 * Math.abs(x)), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; }

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("What to look at");
ctl.view = K.seg(g, { value: "dilemma", options: [["dilemma", "Dilemmas"], ["society", "A society of promises (A level)"]], on: v => { P.view = v; showGroups(); } });
const gD = ui.group("The dilemma");
ctl.dil = K.seg(gD, { value: "trolley", options: Object.entries(DIL).map(([k, d]) => [k, d.name]), on: v => { P.dil = v; anim = 0; } });
ctl.n = K.slider(gD, { label: "People who would be saved / protected", min: 1, max: 20, step: 1, value: 5, on: v => P.n = v });
ctl.p = K.slider(gD, { label: "Chance the action works (certainty)", min: 0, max: 1, step: 0.05, value: 0.9, fmt: v => Math.round(v * 100) + "%", on: v => P.p = v });
ctl.suffer = K.slider(gD, { label: "Patient's suffering (euthanasia)", min: 0, max: 1, step: 0.05, value: 0.8, fmt: v => Math.round(v * 10) + " / 10", on: v => P.suffer = v });
ctl.rule = K.toggle(gD, { label: "Rule utilitarianism (Mill) instead of act (Bentham)", value: false, on: v => P.rule = v });
const gS = ui.group("The society");
ctl.fAct = K.slider(gS, { label: "Act utilitarians", min: 0, max: 1, step: 0.05, value: 0.5, fmt: v => Math.round(v * 100) + "%", on: v => { P.fAct = Math.min(v, 1 - P.fSE); restartSoc(); } });
ctl.fSE = K.slider(gS, { label: "Situation ethicists", min: 0, max: 1, step: 0.05, value: 0, fmt: v => Math.round(v * 100) + "%", on: v => { P.fSE = Math.min(v, 1 - P.fAct); restartSoc(); } });
K.note(gS, "Everyone else is a rule utilitarian or a Kantian: they always keep promises.");
ctl.surplus = K.slider(gS, { label: "Value of cooperation (per deal)", min: 0, max: 2, step: 0.1, value: 0.5, on: v => { P.surplus = v; restartSoc(); } });
ctl.speed = K.slider(gS, { label: "Speed", min: 0.25, max: 4, step: 0.25, value: 1, fmt: v => v + "×", on: v => P.speed = v });
const read = K.readout(ui.group("Readings"), [["agree", "theories that support acting"], ["net", "hedonic calculus net score"], ["trust", "trust in promises"], ["wel", "average welfare per pair"], ["kept", "promises kept"]]);
function showGroups() { const s = P.view === "society"; gD.style.display = s ? "none" : ""; gS.style.display = s ? "" : "none"; }
function restartSoc() { live = { trust: P.trust0, t: 0, W: [], T: [], kinds: null, kept: 0, made: 0 }; const r = K.rng(77); live.kinds = []; for (let i = 0; i < 200; i++) { const u = r(); live.kinds.push(u < P.fAct ? "act" : u < P.fAct + P.fSE ? "se" : "rule"); } live.last = []; }
function set(o) { Object.assign(P, DEF, o); for (const k of ["view", "dil", "n", "p", "suffer", "rule", "fAct", "fSE", "surplus", "speed"]) ctl[k].set(P[k]); restartSoc(); showGroups(); }
// ---------------- Simulation: one round of the society every so often ----------------
function tick(dt) {
  anim += dt;
  if (P.view !== "society") return; tt += dt * P.speed * 6; if (tt < 1) return; tt = 0;
  const N = 200; let W = 0, kept = 0, made = 0; live.last = [];
  for (let i = 0; i < N / 2; i++) { const who = rnd.int(N), pr = live.kinds[who]; if (rnd() > live.trust) { live.last.push([who, "none"]); continue; } made++; const c = Math.max(0, P.cost * (0.5 + rnd.gauss() * P.spread + 0.5)), br = pr === "act" ? c > 1 : pr === "se" ? c > 3 : false; if (br) W += c * 0.999 - 0.2; else { W += 1 - c + 2 * P.surplus; kept++; } live.last.push([who, br ? "broke" : "kept"]); }
  live.trust = Math.max(0.02, Math.min(1, live.trust + 0.08 * ((made ? kept / made : 1) - live.trust))); live.t++; live.W.push([live.t, W / (N / 2)]); live.T.push([live.t, live.trust]); live.kept += kept; live.made += made; if (live.W.length > 300) { live.W.shift(); live.T.shift(); }
}

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function wrap(c, text, x, y, maxW, lh, col, f) { c.font = f + " Segoe UI,sans-serif"; const words = text.split(" "); let line = ""; for (const wd of words) { const t = line ? line + " " + wd : wd; if (c.measureText(t).width > maxW && line) { TX(c, line, x, y, col, "left", f); y += lh; line = wd; } else line = t; } if (line) { TX(c, line, x, y, col, "left", f); y += lh; } return y; }
const person = (c, x, y, col, s = 1) => { c.fillStyle = col; c.beginPath(); c.arc(x, y - 18 * s, 5 * s, 0, 6.3); c.fill(); c.fillRect(x - 3 * s, y - 13 * s, 6 * s, 13 * s); };
function drawScene(c, x, y, w, h) { // a small picture of the dilemma
  const k = P.dil; c.strokeStyle = "#55627f"; c.lineWidth = 3;
  if (k === "trolley" || k === "bridge") {
    const ty = y + h * 0.6; c.beginPath(); c.moveTo(x, ty); c.lineTo(x + w, ty); c.stroke();
    if (k === "trolley") { c.beginPath(); c.moveTo(x + w * 0.35, ty); c.lineTo(x + w * 0.7, ty - h * 0.35); c.lineTo(x + w, ty - h * 0.35); c.stroke(); person(c, x + w * 0.85, ty - h * 0.35, "#ffd166"); TX(c, "lever", x + w * 0.33, ty + 22, "#8fa0bf", "center", "11px"); c.strokeStyle = "#ffd166"; c.beginPath(); c.moveTo(x + w * 0.33, ty + 6); c.lineTo(x + w * 0.33 + 10 * Math.sin(anim * 2), ty - 10); c.stroke(); }
    else { c.fillStyle = "#3a4a6b"; c.fillRect(x + w * 0.45, ty - h * 0.5, w * 0.2, 8); person(c, x + w * 0.55, ty - h * 0.5, "#ffd166", 1.4); }
    for (let i = 0; i < Math.min(P.n, 12); i++) person(c, x + w * 0.75 + i * 12 - (i > 5 ? 72 : 0), ty - (i > 5 ? 22 : 0) + 0, "#cfd8ea");
    const tx = x + ((anim * 30) % (w * 0.3)); c.fillStyle = "#ff8a70"; c.fillRect(tx, ty - 22, 40, 18); TX(c, "trolley", tx + 20, ty - 26, "#ff8a70", "center", "11px");
  } else {
    const icon = { door: "🚪", euth: "🏥", whistle: "📣", promise: "🤝" }[k]; c.font = `${Math.min(h * 0.6, 80)}px Segoe UI Emoji,sans-serif`; c.textAlign = "center"; c.fillText(icon, x + w / 2, y + h * 0.7);
  }
  c.lineWidth = 1;
}
function drawDilemma(c, w, h) {
  const d = DIL[P.dil], { R, hc, net } = verdicts(P.dil, P), adv = ui.level === "adv";
  TX(c, d.name, 20, 30, "#eef2f8", "left", "600 16px");
  let y = wrap(c, d.story(P), 20, 54, w * 0.55, 18, "#cfd8ea", "13px");
  TX(c, `Should you: ${d.act.toLowerCase()}?`, 20, y + 6, "#ffd166", "left", "600 13.5px");
  drawScene(c, w * 0.6, 40, w * 0.37, 120);
  // four verdict cards
  const top = Math.max(y + 24, 175), cw = (w - 50) / 4, chh = h - top - 20;
  THEORIES.forEach(([k, name, col], i) => {
    const x = 20 + i * (cw + 3.3), r = R[k]; c.fillStyle = "#121a2e"; c.fillRect(x, top, cw - 6, chh); c.fillStyle = col; c.fillRect(x, top, cw - 6, 4);
    TX(c, k === "util" ? (P.rule ? "Rule utilitarianism" : "Act utilitarianism") : name, x + 10, top + 24, col, "left", "600 13.5px");
    const [sym, sc] = V[r.v]; TX(c, sym, x + cw - 20, top + 28, sc, "right", "700 24px"); TX(c, r.v === "yes" ? "do it" : r.v === "no" ? "don't" : "disputed", x + cw - 46, top + 26, sc, "right", "600 12px");
    let yy = top + 50; for (const s of r.steps) { yy = wrap(c, "• " + s, x + 10, yy, cw - 26, 16, "#cfd8ea", "12px") + 4; if (yy > top + chh - 10) break; }
  });
}
function drawSociety(c, w, h) {
  TX(c, `A society of promises: round ${live.t}`, 20, 30, "#eef2f8", "left", "600 16px");
  TX(c, "Each square is a person. Blue: act utilitarian · pink: situation ethicist · grey: rule utilitarian / Kantian. Flashes: green = kept a promise, red = broke one, dark = no one trusted them enough to make a deal.", 20, 50, "#8fa0bf", "left", "11.5px");
  const cols = 20, cs = Math.min((w * 0.55) / cols, (h - 100) / 10), x0 = 20, y0 = 70, flash = new Map(live.last.map(([a, b]) => [a, b]));
  live.kinds.forEach((kd, i) => { const x = x0 + (i % cols) * cs, y = y0 + Math.floor(i / cols) * cs; c.fillStyle = kd === "act" ? "#2f6fb0" : kd === "se" ? "#a3528c" : "#55627f"; c.fillRect(x, y, cs - 3, cs - 3); const f = flash.get(i); if (f) { c.strokeStyle = f === "kept" ? "#7ee787" : f === "broke" ? "#ff5c5c" : "#0b1020"; c.lineWidth = 3; c.strokeRect(x + 1.5, y + 1.5, cs - 6, cs - 6); c.lineWidth = 1; } });
  const gx = x0 + cols * cs + 40, gw = w - gx - 30; TX(c, "Trust", gx, 100, "#eef2f8", "left", "600 14px"); c.fillStyle = "#1a2238"; c.fillRect(gx, 110, gw, 26); c.fillStyle = live.trust > 0.6 ? "#7ee787" : live.trust > 0.3 ? "#ffd166" : "#ff5c5c"; c.fillRect(gx, 110, gw * live.trust, 26); TX(c, Math.round(live.trust * 100) + "%", gx + 8, 128, "#0b1020", "left", "600 13px");
  const wNow = live.W.length ? K.mean(live.W.slice(-20).map(q => q[1])) : 0; TX(c, `Average welfare (last 20 rounds): ${wNow.toFixed(2)}`, gx, 170, "#eef2f8", "left", "600 13px");
  y = 200; [["If everyone keeps promises", "trust stays high, deals happen, everyone gains the cooperation surplus."], ["Each act-utilitarian break", "does a little more good this time (saves its cost c > benefit)…"], ["…but trust falls", "and with it the deals, so the long-run total falls."]].forEach(([a, b]) => { TX(c, a, gx, y, "#ffd166", "left", "600 12px"); y = wrap(c, b, gx, y + 16, gw, 15, "#cfd8ea", "12px") + 8; });
}
var y = 0;
function draw() { const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); if (P.view === "society") drawSociety(c, w, h); else drawDilemma(c, w, h); }

// ---------------- Charts and readings ----------------
function charts() {
  const { R, hc, net } = verdicts(P.dil, P);
  if (P.view === "dilemma") {
    chA.opts.title = "Hedonic calculus for acting (scores out of 10)"; chA.opts.xLabel = ""; chA.opts.yLabel = "score";
    const keys = ["intensity", "duration", "certainty", "propinquity", "fecundity", "purity"];
    chA.draw([{ pts: keys.map((k, i) => [i, hc[k]]), type: "bars", w: 0.6, color: "#7ee787", label: `× extent ${hc.extent.toFixed(1)} → net ${net.toFixed(0)}` }], { xMin: -0.5, xMax: 5.5, yMin: 0, yMax: 10, xFmt: v => Math.abs(v - Math.round(v)) < 0.01 ? keys[Math.round(v)] || "" : "" });
    chB.opts.title = "Verdicts across all six dilemmas"; chB.opts.xLabel = ""; chB.opts.yLabel = "theories that support acting";
    const ks = Object.keys(DIL); chB.draw([{ pts: ks.map((k, i) => [i, Object.values(verdicts(k, P).R).filter(r => r.v === "yes").length + 0.5 * Object.values(verdicts(k, P).R).filter(r => r.v === "dis").length]), type: "bars", w: 0.6, color: "#c9a0ff", label: "yes = 1, disputed = ½" }], { xMin: -0.5, xMax: 5.5, yMin: 0, yMax: 4, xFmt: v => Math.abs(v - Math.round(v)) < 0.01 ? ["trolley", "bridge", "door", "euthan.", "whistle", "promise"][Math.round(v)] || "" : "" });
  } else {
    chA.opts.title = "Trust in promises"; chA.opts.xLabel = "round"; chA.opts.yLabel = "trust"; chA.draw([{ pts: live.T, color: "#7ee787", label: "trust" }], { yMin: 0, yMax: 1 });
    chB.opts.title = "Average welfare per pair"; chB.opts.xLabel = "round"; chB.opts.yLabel = "welfare"; chB.draw([{ pts: live.W, color: "#ffd166", label: "welfare" }], { yMin: 0 });
  }
  read.set("agree", Object.values(R).filter(r => r.v === "yes").length + " of 4 (" + Object.values(R).filter(r => r.v === "dis").length + " disputed)"); read.set("net", net.toFixed(1));
  read.set("trust", Math.round(live.trust * 100) + "%"); read.set("wel", live.W.length ? K.mean(live.W.slice(-20).map(q => q[1])).toFixed(2) : "–"); read.set("kept", live.made ? (100 * live.kept / live.made).toFixed(1) + "%" : "–");
  ui.hud(P.view === "society" ? "act: break if it does more good now · rule: keep the rule that does most good" : "absolutist: NL, Kant · relativist: SE · consequentialist: utilitarianism");
}
let frame = 0;
ui.run(dt => tick(dt), () => { draw(); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("Four theories, one dilemma. Change the dilemma and the sliders to see whose verdict changes.", 7000);
