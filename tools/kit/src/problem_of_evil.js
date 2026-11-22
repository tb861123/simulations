/* =====================================================================
   THE PROBLEM OF EVIL
   THE LOGICAL PROBLEM (Epicurus, Hume, J.L. Mackie 1955): these cannot
   all be true together, given two extra premises (a good being removes
   evil as far as it can; an omnipotent being can do anything):
        God is omnipotent · God is wholly good · Evil exists
   A THEODICY tries to show God has a morally sufficient reason for
   allowing evil, so the three are consistent after all:
     AUGUSTINE: evil is a privation (lack) of good, not a thing God made;
       it came from the free choice of angels and humans (the Fall);
       natural evil is a fitting punishment; God's grace saves some.
     IRENAEUS and John HICK: humans are made in God's image but must grow
       into his likeness. A world with real challenges, pain and freedom,
       at an EPISTEMIC DISTANCE from God (so we are not compelled to
       believe), is a 'vale of soul-making' where virtue can be chosen.
     The FREE WILL DEFENCE (Plantinga): a world with free creatures who
       sometimes choose evil may be better than one with robots.
   THE EVIDENTIAL PROBLEM (William Rowe, 1979): some suffering seems
   pointless (a fawn burned slowly in a forest fire); if there is so much
   apparently pointless suffering, God's existence is less probable.
   The soul-making model here tests Hick's idea; the Bayes view shows how
   evidence of apparently pointless evil shifts a belief, and how
   'sceptical theism' (we can't expect to see God's reasons) answers it.
   ===================================================================== */
// ---------------- 1. The soul-making world ----------------
/* N people. Each step, hardships (natural evil) strike at random with a severity. Free people may help (virtue grows in both)
   or harm others (moral evil). Hardship that someone can bear with help builds fortitude; crushing hardship (beyond what can be
   borne) destroys rather than builds: 'dysteleological' suffering, Hick's hardest case. Epistemic distance: if God were obvious,
   good acts would be done from fear or reward, so they would build less genuine virtue. */
const NP = 160;
function newWorld(o, r) { const people = []; for (let i = 0; i < NP; i++) people.push({ v: 0.2 + 0.1 * r(), x: r(), y: r(), crushed: 0, flash: 0, kind: "" }); return { people, t: 0, suffering: 0, crushed: 0, helps: 0, harms: 0, virtue0: people.reduce((a, p) => a + p.v, 0) / NP, hist: [] }; }
function worldStep(W, o, r, record) {
  W.t++; const ps = W.people, gen = 0.15 + 0.85 * o.distance;            // how much virtue a free act really builds (more with greater epistemic distance)
  for (const p of ps) {
    if (record) { p.flash = Math.max(0, p.flash - 1); }
    if (r() < o.natural * 0.08) {                                         // a hardship strikes
      const sev = -Math.log(1 - r()) * o.severity; W.suffering += sev;
      const helper = ps[r.int(NP)], helps = r() < o.free * (0.25 + 0.6 * helper.v / (1 + helper.v));
      const bearable = sev * (helps ? 0.5 : 1) < 2.2;
      if (bearable) { p.v += 0.03 * sev * o.free * gen; if (helps) { helper.v += 0.04 * sev * gen; W.helps++; if (record) { helper.flash = 6; helper.kind = "help"; } } }
      else { p.v = Math.max(0, p.v - 0.05 * sev); p.crushed++; W.crushed++; }
      if (record) { p.flash = 8; p.kind = bearable ? "hard" : "crush"; }
    }
    if (r() < o.free * 0.012 / (1 + 3 * p.v)) {                           // a free choice to harm someone (moral evil)
      const victim = ps[r.int(NP)], sev = -Math.log(1 - r()) * 0.8; W.harms++; W.suffering += sev; victim.v += 0.01 * gen * o.free; p.v = Math.max(0, p.v - 0.01);
      if (record) { p.flash = 8; p.kind = "harm"; }
    }
  }
  if (record && W.t % 4 === 0) { W.hist.push([W.t, ps.reduce((a, p) => a + p.v, 0) / NP, W.suffering / W.t]); if (W.hist.length > 400) W.hist.shift(); }
}
const meanV = W => W.people.reduce((a, p) => a + p.v, 0) / NP;
function runWorld(o, r, steps = 300) { const W = newWorld(o, r); for (let i = 0; i < steps; i++) worldStep(W, o, r, false); return W; }
// ---------------- 2. The evidential problem: Bayes' theorem ----------------
/* Prior P(G). Each case of apparently pointless suffering: how likely would we be to see it if God exists, compared with if not?
   With no God, apparently pointless suffering is expected (likelihood 0.9). With God, we would expect to see it only if God's reasons
   are often beyond us: P(see | God) = 0.9 × sceptical + 0.3 × (1 − sceptical), where 'sceptical' is how far we accept sceptical theism. */
function posterior(prior, n, sc) { const lG = 0.9 * sc + 0.3 * (1 - sc), lN = 0.9; const odds = prior / (1 - prior) * Math.pow(lG / lN, n); return odds / (1 + odds); }
// ---------------- 3. The logical problem: the triad and the theodicies ----------------
const THEO = {
  none: { name: "No theodicy", add: [], ok: false, says: "Mackie: if God is all-powerful he could remove evil; if wholly good he would want to. Evil exists, so God (as defined) does not. The triad is inconsistent.", crit: "Theists reply that Mackie's hidden premises are false: a good God may allow evil for a greater good." },
  free: { name: "Free will defence (Plantinga)", add: ["A world with free creatures who sometimes do wrong is better than one with none.", "Even an omnipotent God cannot make free creatures who never choose evil (it is not a logically possible thing to do)."], ok: true, says: "If it is even possible that God has this reason, the triad is consistent: the logical problem is answered (not the evidential one).", crit: "Mackie: God could have made people who always freely choose the good. And free will doesn't explain natural evil (earthquakes, disease)." },
  aug: { name: "Augustine", add: ["Evil is not a thing God created, but a privation (lack) of good.", "Evil entered through the free choice of angels and of Adam and Eve (the Fall).", "Natural evil is a just consequence of the Fall; God's grace offers salvation."], ok: true, says: "God made a perfect world; evil comes from creatures misusing freedom, so God is not its author.", crit: "Schleiermacher: a perfect creation going wrong is a contradiction. Evolution: suffering existed long before humans. Is it just to punish all for Adam's sin?" },
  iren: { name: "Irenaeus and Hick (soul-making)", add: ["God made humans in his image, to grow into his likeness by their own choices.", "Real moral growth needs a challenging world, freedom, and epistemic distance from God.", "The good of souls freely made good outweighs the suffering, and all will finally be saved."], ok: true, says: "Suffering has a purpose: it is the environment for growing compassion, courage and love.", crit: "D.Z. Phillips: love cannot be shown by allowing suffering as a means. The amount and kind of suffering (Holocaust, children, animals) seem far beyond what soul-making needs." }
};

// ---------------- The page ----------------
const DEF = { view: "soul", natural: 0.5, severity: 0.8, free: 0.8, distance: 0.8, theo: "none", prior: 0.5, nCase: 10, sc: 0, speed: 1 };
const P = {};
let rnd = K.rng(Date.now() % 9973 + 3), WLD = null, tt = 0;
const ui = K.app({
  title: "The Problem of Evil", subject: "Religion, Philosophy and Ethics",
  blurb: "The logical problem and the theodicies of Augustine, Irenaeus and Hick; a 'vale of soul-making' you can test; Rowe's evidential problem with Bayes' theorem",
  reset: () => set({ view: P.view }),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "GCSE Religious Studies: the problem of evil and suffering (moral and natural evil), the inconsistent triad, Christian responses: free will, soul-making, the Fall, prayer and charity.", adv: "OCR A level Religious Studies (H573/01) Philosophy of religion, The problem of evil: the logical problem (Epicurus, Mackie) and the evidential problem (Rowe, Paul); Augustine's theodicy; Hick's development of Irenaeus' theodicy (soul-making, epistemic distance); the free will defence. Bayesian probability and the simulation are beyond the spec." } },
  missions: [
    { title: "Moral and natural evil", q: "Watch the world. Which flashes are natural evil (hardship) and which moral evil (people choosing harm)? Turn free will to zero: which disappears?", hint: "Red/orange flashes are hardships (natural evil); purple are harms chosen by people (moral evil). With no freedom, moral evil vanishes, but so does every chosen act of help and the virtue it builds: the free will defence in miniature.", setup() { set({}); } },
    { title: "The inconsistent triad", q: "Open the logical problem with no theodicy. Why does Mackie say the three statements can't all be true?", hint: "With two hidden premises (a good being removes evil as far as it can; there are no limits to what an omnipotent being can do), the three claims contradict each other.", setup() { set({ view: "logic", theo: "none" }); } },
    { title: "A vale of soul-making", q: "Return to the world. Is virtue growing? Set natural evil to zero: what happens to growth?", hint: "With no hardship there is nothing to help with or endure, so virtue hardly grows: Hick's point that a hedonistic paradise could not make souls.", setup() { set({ natural: 0 }); } },
    { title: "Too much suffering", q: "Increase the severity of hardship. What happens to virtue and to the number of people crushed?", hint: "Up to a point, harder challenges build more; beyond it, suffering crushes people rather than making them: dysteleological suffering, the strongest objection to Hick.", setup() { set({ severity: 2.5 }); } },
    { lvl: "adv", title: "Epistemic distance", q: "Reduce epistemic distance (make God obvious). Why does virtue grow more slowly?", hint: "If God's presence were overwhelming, people would do good from fear or for reward, not freely. Hick: an epistemic distance makes genuine faith and goodness possible.", setup() { set({ distance: 0.1 }); } },
    { lvl: "adv", title: "Augustine or Irenaeus?", q: "Compare the two theodicies in the logical-problem view. Which explains natural evil better?", hint: "Augustine: natural evil is the result of the Fall (hard to square with evolution). Irenaeus/Hick: natural evil is part of a soul-making environment (looks forward, not back), but must explain its excess.", setup() { set({ view: "logic", theo: "iren" }); } },
    { lvl: "adv", title: "Rowe's fawn", q: "Open the evidential view. Start at 50% belief. How does belief change after 10 cases of apparently pointless suffering?", hint: "If each case is 3 times more likely without God, 10 cases make God's existence very improbable (well under 1%). Rowe: this is evidence, not proof.", setup() { set({ view: "bayes", sc: 0 }); } },
    { lvl: "adv", title: "Sceptical theism", q: "Increase 'sceptical theism' (we shouldn't expect to see God's reasons). What happens to the evidential argument?", hint: "If apparently pointless suffering is just as expected with God as without, seeing it is no evidence either way: the posterior stays at the prior. The debate turns on that likelihood.", setup() { set({ view: "bayes", sc: 0.8 }); } }
  ],
  batch: [
    { title: "How much hardship makes souls?", question: "How does the growth of virtue depend on how severe hardships are?", how: "160 people, 300 steps, free will 0.8, epistemic distance 0.8; result = average virtue gained.", xLabel: "severity of hardship", yLabel: "average virtue gained", xs: [0, 0.25, 0.5, 0.75, 1, 1.5, 2, 3], reps: 5, run: (x, r) => { const o = Object.assign({}, DEF, { severity: x }); const W = runWorld(o, r); return meanV(W) - W.virtue0; }, note: "An inverted U in this model: some challenge builds virtue, too much crushes it. Whether our world sits on the rising or falling side is exactly what Hick and his critics dispute." },
    { title: "Freedom and virtue", question: "How does the growth of virtue depend on how free people are?", how: "160 people, 300 steps; result = average virtue gained. (Chosen harms rise with freedom too: watch the live counter.)", xLabel: "free will", yLabel: "average virtue gained", xs: [0, 0.2, 0.4, 0.6, 0.8, 1], reps: 5, run: (x, r) => { const o = Object.assign({}, DEF, { free: x }); const W = runWorld(o, r); return meanV(W) - W.virtue0; }, note: "With no freedom there is no moral evil, but no virtue grows either; more freedom means more chosen good and more chosen harm. Whether the good outweighs the harm is the free will defence's central (and disputed) claim." },
    { title: "Rowe: belief after apparently pointless suffering", question: "Starting from different priors, how does belief in God change after n cases of apparently pointless suffering?", how: "Each person's prior belief is random (20–80%); no sceptical theism (each case 3× more likely without God).", xLabel: "cases of apparently pointless suffering", yLabel: "belief in God (%)", xs: [0, 1, 2, 4, 6, 10], reps: 8, yMin: 0, yMax: 100, theory: n => 100 * posterior(0.5, n, 0), theoryLabel: "Bayes from a 50% prior", run: (n, r) => 100 * posterior(0.2 + 0.6 * r(), n, 0), note: "Whatever the starting belief, the evidence pulls everyone the same way, and priors matter less as evidence mounts. This is the shape of the evidential problem." },
    { title: "Sceptical theism weakens the evidence (A level)", question: "After 10 cases, how does belief depend on how far we accept sceptical theism?", how: "Prior 50%.", xLabel: "sceptical theism (0 = none, 1 = full)", yLabel: "belief in God after 10 cases (%)", xs: [0, 0.2, 0.4, 0.6, 0.8, 1], reps: 3, yMin: 0, yMax: 100, theory: s => 100 * posterior(0.5, 10, s), theoryLabel: "Bayes", run: (s, r) => 100 * posterior(0.5 * (1 + 0.02 * r.gauss()), 10, s), note: "Full sceptical theism makes apparently pointless suffering exactly as likely with God as without: no evidence at all. Critics reply that it also undermines our moral judgements and knowledge of God's goodness." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "GCSE", text: "Moral evil: suffering caused by humans choosing wrongly (war, murder). Natural evil: suffering not caused by humans (earthquakes, disease)." },
      { lvl: "std", tag: "GCSE", text: "The inconsistent triad: if God is omnipotent and omnibenevolent, why is there evil? Responses: free will, soul-making (suffering helps people grow), the Fall, and practical responses (prayer, charity, the example of Jesus)." },
      { lvl: "adv", tag: "H573/01", text: "Logical problem (Epicurus, Hume, Mackie): the triad plus 'a good being eliminates evil as far as it can' and 'no limits to omnipotence' is inconsistent. Evidential problem (Rowe, Paul): the amount and kinds of suffering make God's existence improbable." },
      { lvl: "adv", tag: "H573/01 Aug", text: "Augustine: God created a good world; evil is a privation of good; it arose from the free will of angels and humans (the Fall); natural evil is just punishment; salvation by grace. Criticisms: Schleiermacher (logical contradiction of a perfect world going wrong), evolution, justice of inherited guilt, hell." },
      { lvl: "adv", tag: "H573/01 Hick", text: "Irenaeus/Hick: image and likeness; a 'vale of soul-making'; epistemic distance; counterfactual hypothesis (a world without pain would have no moral growth); universal salvation. Criticisms: excess and dysteleological suffering, D.Z. Phillips (love does not use suffering as a means), universalism removes incentive." },
      { lvl: "beyond", tag: "Beyond", text: "Plantinga's free will defence answers the logical problem by showing consistency is possible. Bayes: posterior odds = prior odds × likelihood ratio; sceptical theism argues the likelihood ratio is close to 1." }
    ],
    questions: [
      { lvl: "std", marks: 4, q: "Explain two Christian responses to the problem of evil.", ans: "<ul><li>Free will: God gave humans free will so they can choose to love; evil is a consequence of misusing it (1 + 1).</li><li>Soul-making: suffering allows people to develop virtues such as courage and compassion (1 + 1). (Also: the Fall, suffering is a test, Jesus suffered too.)</li></ul>" },
      { lvl: "adv", marks: 15, q: "Explain Hick's concept of epistemic distance.", ans: "<ul><li>Humans created at a distance from God's obvious presence (not spatial but in knowledge).</li><li>So belief and goodness are freely chosen, not compelled; if God were overwhelmingly evident we would not be free.</li><li>Part of the vale of soul-making developed from Irenaeus (image to likeness).</li></ul>" },
      { lvl: "adv", marks: 40, q: "'Augustine's theodicy is a more successful response to the problem of evil than Irenaeus' theodicy.' Discuss.", ans: "<ul><li>AO1: both theodicies with key concepts (privation, Fall, grace; image/likeness, soul-making, epistemic distance, universalism).</li><li>AO2: logical and evidential problems; natural evil; science; justice; excessive suffering; universalism.</li><li>Evaluation reaching a supported conclusion.</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li>Soul-making world: 160 people each with a 'virtue' score. Each step a hardship strikes a person with probability 0.08 × natural evil; its severity is random (exponential, mean = the severity setting). Someone may freely help (more likely if virtuous and free). If the hardship (halved when helped) is bearable, the sufferer gains fortitude and the helper compassion; if not, the person is 'crushed' and loses virtue. Free people sometimes choose harm (moral evil), less often when virtuous. All virtue gains are multiplied by 0.15 + 0.85 × epistemic distance.</li>
<li>Evidential problem: Bayes' theorem. Each case of apparently pointless suffering has likelihood 0.9 if there is no God and 0.9s + 0.3(1 − s) if there is a God (s = how far sceptical theism is accepted). Posterior odds = prior odds × (likelihood ratio)ⁿ.</li>
<li>Logical problem: the triad, Mackie's two hidden premises, and the extra premises each theodicy adds, with the main criticisms.</li></ul>
<h3>Assumptions and simplifications</h3>
<ul><li>The soul-making world is a cartoon of Hick's idea: real virtue and suffering can't be put on a number line, and the rules (not the theology) produce its results. It neither proves nor disproves any theodicy.</li><li>The Bayesian numbers are illustrative: the whole debate is about what the likelihoods really are.</li><li>The page takes no side on whether God exists.</li></ul>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("What to look at");
ctl.view = K.seg(g, { value: "soul", options: [["soul", "A soul-making world"], ["logic", "The logical problem"], ["bayes", "The evidential problem (A level)"]], on: v => { P.view = v; showGroups(); } });
const gW = ui.group("The world");
ctl.natural = K.slider(gW, { label: "Natural evil: how often hardships strike", min: 0, max: 1, step: 0.05, value: 0.5, fmt: v => v ? Math.round(v * 100) + "%" : "none (a paradise)", on: v => { P.natural = v; } });
ctl.severity = K.slider(gW, { label: "How severe hardships are", min: 0, max: 3, step: 0.05, value: 0.8, fmt: v => v.toFixed(2), on: v => { P.severity = v; } });
ctl.free = K.slider(gW, { label: "Free will", min: 0, max: 1, step: 0.05, value: 0.8, fmt: v => v ? v.toFixed(2) : "none (robots)", on: v => { P.free = v; } });
ctl.distance = K.slider(gW, { label: "Epistemic distance (A level)", min: 0, max: 1, step: 0.05, value: 0.8, fmt: v => v < 0.2 ? "God obvious to all" : v > 0.7 ? "God hidden: faith is free" : "some", on: v => { P.distance = v; } });
ctl.speed = K.slider(gW, { label: "Speed", min: 0.25, max: 4, step: 0.25, value: 1, fmt: v => v + "×", on: v => P.speed = v });
ui.headerSpeed(ctl.speed);   // playback speed lives in the header, beside Pause and Reset
let rr = K.row(gW); K.btn(rr, "↺ New world", () => { WLD = newWorld(P, rnd); }, "primary");
const gL = ui.group("The logical problem");
ctl.theo = K.seg(gL, { value: "none", options: Object.entries(THEO).map(([k, t]) => [k, t.name]), on: v => P.theo = v });
const gB = ui.group("The evidential problem");
ctl.prior = K.slider(gB, { label: "Belief in God before the evidence", min: 0.01, max: 0.99, step: 0.01, value: 0.5, fmt: v => Math.round(v * 100) + "%", on: v => P.prior = v });
ctl.nCase = K.slider(gB, { label: "Cases of apparently pointless suffering", min: 0, max: 20, step: 1, value: 10, on: v => P.nCase = v });
ctl.sc = K.slider(gB, { label: "Sceptical theism (we can't expect to see God's reasons)", min: 0, max: 1, step: 0.05, value: 0, fmt: v => Math.round(v * 100) + "%", on: v => P.sc = v });
const read = K.readout(ui.group("Readings"), [["v", "average virtue (start → now)"], ["s", "suffering per step"], ["h", "acts of help / harm"], ["c", "people crushed"], ["post", "belief after the evidence"], ["lr", "likelihood ratio per case"]]);
function showGroups() { gW.style.display = P.view === "soul" ? "" : "none"; gL.style.display = P.view === "logic" ? "" : "none"; gB.style.display = P.view === "bayes" ? "" : "none"; }
function set(o) { Object.assign(P, DEF, o); for (const k of ["view", "natural", "severity", "free", "distance", "speed", "theo", "prior", "nCase", "sc"]) ctl[k].set(P[k]); WLD = newWorld(P, rnd); showGroups(); }
// ---------------- Simulation ----------------
function tick(dt) { if (P.view !== "soul") return; tt += dt * P.speed * 12; while (tt >= 1) { tt--; worldStep(WLD, P, rnd, true); } }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function wrap(c, text, x, y, maxW, lh, col, f) { c.font = f + " Segoe UI,sans-serif"; let line = ""; for (const wd of text.split(" ")) { const t = line ? line + " " + wd : wd; if (c.measureText(t).width > maxW && line) { TX(c, line, x, y, col, "left", f); y += lh; line = wd; } else line = t; } if (line) { TX(c, line, x, y, col, "left", f); y += lh; } return y; }
function drawSoul(c, w, h) {
  TX(c, `A world of ${NP} people · step ${WLD.t}`, 20, 30, "#eef2f8", "left", "600 15px");
  TX(c, "colour: virtue (grey → gold) · flashes: orange = hardship borne, red = crushed, green = helped someone, purple = chose to harm", 20, 50, "#8fa0bf", "left", "11.5px");
  const x0 = 30, y0 = 70, W = w * 0.62, H = h - 100;
  for (const p of WLD.people) {
    const x = x0 + p.x * W, y = y0 + p.y * H, t = Math.min(1, p.v / 3);
    c.fillStyle = `rgb(${Math.round(110 + 145 * t)},${Math.round(120 + 89 * t)},${Math.round(150 - 48 * t)})`; c.beginPath(); c.arc(x, y, 6 + 4 * t, 0, 6.3); c.fill();
    if (p.flash) { c.strokeStyle = { hard: "#ff9a5a", crush: "#ff3b3b", help: "#7ee787", harm: "#c06bff" }[p.kind]; c.lineWidth = 2.5; c.beginPath(); c.arc(x, y, 9 + 4 * t + (8 - p.flash), 0, 6.3); c.stroke(); c.lineWidth = 1; }
  }
  const gx = x0 + W + 30, gw = w - gx - 20; let y = 90;
  const box = (lab, val, col) => { c.fillStyle = "#121a2e"; c.fillRect(gx, y - 18, gw, 52); TX(c, lab, gx + 10, y, "#aab6cc", "left", "12px"); TX(c, val, gx + 10, y + 24, col, "left", "600 18px"); y += 62; };
  box("average virtue", `${WLD.virtue0.toFixed(2)} → ${meanV(WLD).toFixed(2)}`, "#ffd166"); box("suffering per step", (WLD.suffering / Math.max(1, WLD.t)).toFixed(2), "#ff9a5a"); box("help / harm chosen", `${WLD.helps} / ${WLD.harms}`, "#7ee787"); box("crushed by suffering", WLD.crushed, "#ff5c5c");
  wrap(c, P.natural === 0 ? "A paradise: no hardship, so nothing to endure or help with." : P.free === 0 ? "No freedom: no one chooses evil, but no one chooses good either." : P.severity > 2 ? "Much suffering is too great to bear: it crushes rather than builds." : "Challenges people can meet, with help, build virtue: Hick's 'vale of soul-making'.", gx, y + 4, gw, 16, "#cfd8ea", "12.5px");
}
function drawLogic(c, w, h) {
  const T = THEO[P.theo]; TX(c, "The logical problem of evil", 20, 30, "#eef2f8", "left", "600 16px");
  const cx = w * 0.27, cy = h * 0.47, r = Math.min(w * 0.17, h * 0.3), pts = [[cx, cy - r], [cx - r * 0.95, cy + r * 0.6], [cx + r * 0.95, cy + r * 0.6]], labs = ["God is omnipotent", "God is wholly good", "Evil exists"];
  c.strokeStyle = T.ok ? "#7ee787" : "#ff5c5c"; c.lineWidth = 3; c.setLineDash(T.ok ? [] : [8, 6]); c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.stroke(); c.setLineDash([]); c.lineWidth = 1;
  pts.forEach(([x, y], i) => { c.fillStyle = "#1a2238"; c.fillRect(x - 80, y - 18, 160, 32); c.strokeStyle = "#cfd8ea"; c.strokeRect(x - 80, y - 18, 160, 32); TX(c, labs[i], x, y + 4, "#eef2f8", "center", "600 13px"); });
  TX(c, T.ok ? "consistent" : "inconsistent", cx, cy + 10, T.ok ? "#7ee787" : "#ff5c5c", "center", "700 18px");
  TX(c, "+ Mackie's hidden premises: a good being removes evil as far as it can; an omnipotent being can do anything.", 20, h - 20, "#8fa0bf", "left", "11.5px");
  const x0 = w * 0.55, mw = w - x0 - 24; let y = 64;
  TX(c, T.name, x0, y, "#ffd166", "left", "600 15px"); y += 24;
  y = wrap(c, T.says, x0, y, mw, 17, "#eef2f8", "13px") + 10;
  if (T.add.length) { TX(c, "Extra premises the theodicy adds:", x0, y, "#8fa0bf", "left", "12px"); y += 18; T.add.forEach(a => { y = wrap(c, "+ " + a, x0, y, mw, 17, "#b7f5bf", "13px") + 4; }); y += 8; }
  TX(c, "Criticisms:", x0, y, "#8fa0bf", "left", "12px"); y += 18; wrap(c, T.crit, x0, y, mw, 17, "#ffb39a", "13px");
}
function drawBayes(c, w, h) {
  const post = posterior(P.prior, P.nCase, P.sc), lG = 0.9 * P.sc + 0.3 * (1 - P.sc);
  TX(c, "The evidential problem: how much should apparently pointless suffering change belief?", 20, 30, "#eef2f8", "left", "600 15px");
  let y = 60; y = wrap(c, `Rowe's fawn: a fawn trapped in a forest fire suffers for days and dies; no good seems to come of it. If God exists, how likely is it that we would see suffering like this? (${(lG * 100).toFixed(0)}% here.) If not? (90%.) Each such case multiplies the odds of God by ${(lG / 0.9).toFixed(2)}.`, 20, y, w - 40, 18, "#cfd8ea", "13px");
  const bx = 40, bw = w - 100, by = y + 30;
  const bar = (lab, v, col, yy) => { TX(c, lab, bx, yy, "#cfd8ea", "left", "13px"); c.fillStyle = "#1a2238"; c.fillRect(bx, yy + 8, bw, 26); c.fillStyle = col; c.fillRect(bx, yy + 8, bw * v, 26); TX(c, (v * 100).toFixed(v < 0.01 ? 2 : 0) + "%", bx + bw * v + 8, yy + 27, col, "left", "600 14px"); };
  bar("Belief in God before (prior)", P.prior, "#5ad1ff", by); bar(`After ${P.nCase} cases (posterior)`, post, "#ffd166", by + 60);
  // small multiples: one dot per case
  for (let i = 0; i < P.nCase; i++) TX(c, "🦌", bx + i * 26, by + 140, "#ff9a5a", "left", "18px");
  wrap(c, P.sc > 0.7 ? "Strong sceptical theism: we wouldn't expect to see God's reasons, so the suffering is little evidence either way." : "Little sceptical theism: each case counts as evidence against God. Theists reply that our inability to see a reason doesn't show there isn't one.", bx, by + 180, bw, 17, "#8fa0bf", "12.5px");
}
function draw() { const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); if (P.view === "logic") drawLogic(c, w, h); else if (P.view === "bayes") drawBayes(c, w, h); else drawSoul(c, w, h); }

// ---------------- Charts and readings ----------------
function charts() {
  if (P.view === "bayes") {
    chA.opts.title = "Belief as cases accumulate"; chA.opts.xLabel = "cases"; chA.opts.yLabel = "belief in God (%)";
    chA.draw([0, 0.5, 1].map((s, k) => { const pts = []; for (let n = 0; n <= 20; n++) pts.push([n, 100 * posterior(P.prior, n, s)]); return { pts, color: ["#ff8a70", "#ffd166", "#7ee787"][k], label: `sceptical ${s * 100}%` }; }), { yMin: 0, yMax: 100, vlines: [{ x: P.nCase, color: "#fff" }] });
    chB.opts.title = "Posterior against prior (after the cases set)"; chB.opts.xLabel = "prior (%)"; chB.opts.yLabel = "posterior (%)";
    const pts = []; for (let i = 1; i < 100; i++) pts.push([i, 100 * posterior(i / 100, P.nCase, P.sc)]);
    chB.draw([{ pts, color: "#ffd166", label: "posterior" }, { pts: [[0, 0], [100, 100]], color: "#55627f", dash: [4, 3], label: "no change" }], { xMin: 0, xMax: 100, yMin: 0, yMax: 100 });
  } else {
    chA.opts.title = "Average virtue over time"; chA.opts.xLabel = "step"; chA.opts.yLabel = "virtue";
    chA.draw([{ pts: WLD.hist.map(q => [q[0], q[1]]), color: "#ffd166", label: "average virtue" }], { yMin: 0 });
    chB.opts.title = "Suffering per step (average so far)"; chB.opts.xLabel = "step"; chB.opts.yLabel = "suffering";
    chB.draw([{ pts: WLD.hist.map(q => [q[0], q[2]]), color: "#ff9a5a", label: "suffering" }], { yMin: 0 });
  }
  read.set("v", `${WLD.virtue0.toFixed(2)} → ${meanV(WLD).toFixed(2)}`); read.set("s", (WLD.suffering / Math.max(1, WLD.t)).toFixed(2)); read.set("h", `${WLD.helps} / ${WLD.harms}`); read.set("c", WLD.crushed);
  read.set("post", (100 * posterior(P.prior, P.nCase, P.sc)).toFixed(1) + "%"); read.set("lr", ((0.9 * P.sc + 0.3 * (1 - P.sc)) / 0.9).toFixed(2));
  ui.hud(P.view === "bayes" ? "posterior odds = prior odds × (likelihood ratio)ⁿ" : P.view === "logic" ? "omnipotent + wholly good + evil exists: consistent?" : "natural evil · moral evil · soul-making");
}
let frame = 0;
ui.run(dt => tick(dt), () => { draw(); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("Hardships strike, people help or harm. Does suffering make souls, or crush them?", 7000);
