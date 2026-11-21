/* =====================================================================
   BEHAVIOURAL ECONOMICS: real people, not robots
   Traditional economics assumes RATIONAL consumers who weigh every
   cost and benefit perfectly. Behavioural economics finds predictable
   departures from this:
     BOUNDED RATIONALITY   limited time and information: people use rules
                           of thumb (heuristics) and stick with DEFAULTS.
     ANCHORING             an irrelevant number pulls our estimates towards it.
     BOUNDED SELF-CONTROL  we overvalue now against later (present bias),
                           so we join the gym and then do not go.
     SOCIAL NORMS, HERDING we copy others, even when our own information
                           says otherwise.
     FAIRNESS              we reject offers we think are unfair, even at a cost.
   Governments use CHOICE ARCHITECTURE (nudges: defaults, framing, social
   comparisons) to steer choices without banning or taxing anything.
   400 simulated people each follow simple rules with individual differences;
   the batch runs compare them with what a perfectly rational person would do.
   ===================================================================== */
const N = 400;
// ---- 1. Pensions: opt-in, active choice or opt-out (automatic enrolment) ----
// each person's true net benefit b ~ N(0.6, 0.5) (rational people join if b > 0); acting costs effort c ~ exponential, mean = inertia
function pensions(design, inertia, r, n = N) { let join = 0, wrong = 0; const who = []; for (let i = 0; i < n; i++) { const b = 0.6 + 0.5 * r.gauss(), c = -inertia * Math.log(1 - r() + 1e-12);
  const inn = design === "in" ? b - c > 0 : design === "active" ? b > 0 : b + c > 0; if (inn) join++; if (inn !== (b > 0)) wrong++; who.push(inn ? (b > 0 ? 1 : 2) : (b > 0 ? 3 : 0)); } return { pct: 100 * join / n, wrong: 100 * wrong / n, who }; }
// the same thing worked out exactly (averaging over the distributions), for the theory lines
function pensionsExact(design, inertia) { let s = 0, m = 0; for (let k = 1; k < 400; k++) { const z = -3 + 6 * k / 400, pz = Math.exp(-z * z / 2), b = 0.6 + 0.5 * z; let pIn; if (design === "active") pIn = b > 0 ? 1 : 0; else if (design === "in") pIn = b > 0 ? (inertia > 0 ? 1 - Math.exp(-b / inertia) : 1) : 0; else pIn = b > 0 ? 1 : (inertia > 0 ? Math.exp(b / inertia) : 0); s += pz * pIn; m += pz; } return 100 * s / m; }
// ---- 2. Anchoring: say the last two digits of your phone number, then bid for a bottle of wine ----
const wtp = (anchor, w, r) => Math.max(0, (1 - w) * (30 + 8 * r.gauss()) + w * anchor + 3 * r.gauss());
// ---- 3. Present bias: the gym. Each of 8 sessions a month: benefit later B = 10, cost now C ~ U(4, 12). Go if β·B > C ----
const pGo = beta => Math.max(0, Math.min(1, (10 * beta - 4) / 8));
// a month for one member: plans assume β = 1 (naive), so everyone who expects ≥ 5 visits buys the £50 flat fee
function gymMonth(beta, r) { const b = Math.max(0.3, Math.min(1, beta + 0.08 * r.gauss())); let v = 0; for (let k = 0; k < 8; k++) if (b * 10 > 4 + 8 * r()) v++; return v; }
// ---- 4. Herding: a queue chooses between two restaurants; each has a private signal that is right with probability q ----
// Bayesian rule (Bikhchandani, Hirshleifer and Welch): follow the crowd once one choice leads by 2 or more, otherwise follow your signal
function cascade(q, r, n = N) { const better = 0, ch = []; let d = 0; for (let i = 0; i < n; i++) { const sig = r() < q ? better : 1 - better; let c; if (d >= 2) c = 0; else if (d <= -2) c = 1; else c = sig; ch.push(c); d += c === 0 ? 1 : -1; } return ch; }
const wrongCascadeTheory = q => (2 - q) * (1 - q) / (2 * (1 - q + q * q));
// ---- 5. Fairness: the ultimatum game for £10. Responders reject offers below their own threshold t ~ N(μ, 0.1) ----
const acceptP = (s, mu) => { if (mu <= 0) return s > 0 ? 1 : 0; const z = (s - mu) / 0.1; return 0.5 * (1 + erf(z / Math.SQRT2)); };
function erf(x) { const t = 1 / (1 + 0.3275911 * Math.abs(x)), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; }
function ultimatum(s, mu, r, n = 50) { let pay = 0, acc = 0; for (let i = 0; i < n; i++) { const t = mu <= 0 ? 0 : mu + 0.1 * r.gauss(); if (s >= t && s > 0) { acc++; pay += 10 * (1 - s); } } return { pay: pay / n, acc: acc / n }; }
// ---- 6. Social norms: a letter compares each home's energy use with the neighbours' average ----
// above-average homes cut by k × (how far above); below-average homes drift UP (the boomerang) unless the letter adds a smiley 😊
function letters(k, smiley, r, n = N) { const use = [], after = []; for (let i = 0; i < n; i++) use.push(Math.max(500, 3100 * Math.exp(0.3 * r.gauss()))); const avg = K.mean(use);
  for (const u of use) { const gap = (u - avg) / avg; let ch = gap > 0 ? -k * gap : (smiley ? 0 : -0.5 * k * gap); ch += 0.01 * r.gauss(); after.push(u * (1 + ch)); } return { use, after, avg, avg2: K.mean(after), pct: 100 * (K.mean(after) / avg - 1) }; }

// ---------------- The page ----------------
const DEF = { sc: "pension", design: "in", inertia: 0.6, w: 0.3, beta: 0.7, commit: false, q: 0.7, mu: 0.3, offer: 0.4, k: 0.06, smiley: false };
const P = Object.assign({}, DEF); let rnd = K.rng(Date.now() % 9973 + 5), res = null, anim = 0, seed = 1;
const SC = { pension: "🏦 Pensions: the default", anchor: "⚓ Anchoring", gym: "🏋 Present bias: the gym", herd: "🍽 Herding", fair: "🤝 Fairness", norm: "💡 Social norms" };
const ui = K.app({
  title: "Behavioural Economics", subject: "Economics",
  blurb: "Four hundred imperfect people: defaults, anchors, present bias, herding, fairness and nudges, against what a rational robot would do",
  reset: () => set({ sc: P.sc }),
  levels: { std: "Standard (AS)", adv: "Advanced (A level)", specs: { std: "Pearson Edexcel A level Economics A (9EC0) Theme 1, 1.2.8 Alternative views of consumer behaviour: the assumption of rationality and why people act irrationally: bounded rationality, bounded self-control, biases (rules of thumb, anchoring, social norms), the importance of fairness. (Behavioural economics is not in iGCSE.)", adv: "9EC0 1.2.8 and 1.4.1 (government intervention): choice architecture and nudges (default choices, restricted and mandated choice, framing), their effectiveness and limitations; links to information gaps (1.3) and game theory (3.4.5, the ultimatum game). Information cascades and the boomerang effect go beyond the specification." } },
  missions: [
    { title: "The power of the default", q: "Pensions. Compare opt-in with opt-out (automatic enrolment). Each person would gain by joining or not, whatever the design. Why does the design change how many join?", hint: "Changing your status takes effort, so many people stick with the default (inertia, bounded rationality). Opt-out raised UK private-sector participation from 42% (2012) to 86% (2019) with no change in the pension itself.", setup() { set({ sc: "pension", design: "in" }); } },
    { title: "Who is nudged the wrong way?", q: "Opt-out. Look at the dark red people: enrolled although the pension is not good for them. How many? Is a default ever free?", hint: "A default that suits most people catches a few for whom it is wrong (those with debts to pay off first, say). Active choice makes everyone decide: fewer mistakes, but it takes everyone's effort.", setup() { set({ sc: "pension", design: "out" }); } },
    { title: "Anchored by a phone number", q: "Anchoring. Everyone says the last two digits of their phone number, then bids for a bottle of wine worth about £30 to them. Is the bid related to a number that has nothing to do with wine?", hint: "Yes: people with high numbers bid more. In Ariely's experiment, people in the top fifth of numbers bid two to three times as much as the bottom fifth. Shops use anchors too: 'was £99, now £49'.", setup() { set({ sc: "anchor" }); } },
    { title: "Paying not to go to the gym", q: "Present bias. Everyone who expects to go at least 5 times a month buys the £50 flat fee. How many times do they actually go? What does each visit really cost?", hint: "When the time comes, today's effort looms larger than the future benefit (β < 1), so people go less than planned and pay more per visit than the £10 pay-as-you-go price. DellaVigna and Malmendier found US members paid about $17 a visit.", setup() { set({ sc: "gym" }); } },
    { title: "Follow the crowd", q: "Herding. People choose a restaurant one at a time, each with their own tip-off (right 70% of the time) and the queue in front of them. Run it several times. How often does the whole crowd end up at the worse one?", hint: "Once two more people have chosen one place, it is rational to ignore your own signal and follow: an information cascade. Then nobody's private information is added, so a cascade can lock onto the wrong choice (about a quarter of the time at 70%).", setup() { set({ sc: "herd" }); } },
    { title: "Rejecting free money", q: "Fairness. A proposer offers a share of £10; if the responder refuses, both get nothing. A rational responder accepts any positive offer. What offer earns the proposer most when people care about fairness?", hint: "Low offers are rejected as unfair, so the proposer earns most by offering 30–40%. Real ultimatum games around the world show the same. With rational responders (fairness 0) the best offer would be almost nothing.", setup() { set({ sc: "fair" }); } },
    { lvl: "adv", title: "The boomerang", q: "Social norms. A letter tells every home how its energy use compares with the neighbours'. Why might average use barely fall? Add a smiley face for the low users.", hint: "High users cut back, but low users learn they are below average and drift up: the boomerang effect. Praise (an injunctive norm, 😊) stops the drift. Real letters (Opower) cut use by about 2%.", setup() { set({ sc: "norm", smiley: false }); } },
    { lvl: "adv", title: "Nudge or regulation?", q: "Compare the three pension designs at high inertia. What are the advantages of a nudge over a law that forces everyone to save? What are its limits?", hint: "A nudge keeps freedom of choice and is cheap, but it works least on people who are most active and may lead some to the wrong choice; its effects can fade; and someone has to decide what the default should be (paternalism).", setup() { set({ sc: "pension", design: "out", inertia: 1.2 }); } }
  ],
  batch: [
    { title: "Opt-in, active choice or opt-out?", question: "What share of people join a pension under each design?", how: "400 people; inertia 0.6. 1 = opt-in, 2 = active (mandated) choice, 3 = opt-out (automatic enrolment).", xLabel: "design (1 opt-in, 2 active, 3 opt-out)", yLabel: "% enrolled", xs: [1, 2, 3], reps: 10, yMin: 0, yMax: 100, theory: x => pensionsExact(["in", "active", "out"][Math.round(x) - 1] || "active", 0.6), theoryLabel: "expected", run: (x, r) => pensions(["in", "active", "out"][x - 1], 0.6, r).pct, note: "The pension is the same; only the default changes. Active choice shows what people would choose if acting cost nothing (88%)." },
    { title: "Inertia and opt-in", question: "How does the effort of acting change participation under opt-in?", how: "400 people each run; inertia = the mean effort cost of acting.", xLabel: "inertia", yLabel: "% enrolled under opt-in", xs: [0, 0.25, 0.5, 0.75, 1, 1.5], reps: 8, yMin: 0, yMax: 100, theory: x => pensionsExact("in", x), theoryLabel: "expected", run: (x, r) => pensions("in", x, r).pct, note: "With no inertia people choose rationally (88%). The more effort acting takes, the more stay with the default of not saving." },
    { title: "Anchoring: bids by phone number", question: "Does an irrelevant number change what people will pay?", how: "Anchoring strength 0.3; 40 bidders in each fifth of phone numbers (mid-points 10, 30, 50, 70, 90).", xLabel: "anchor (last two digits)", yLabel: "mean bid (£)", xs: [10, 30, 50, 70, 90], reps: 8, yMin: 0, fit: true, theory: a => 0.7 * 30 + 0.3 * a, theoryLabel: "0.7 × value + 0.3 × anchor", run: (a, r) => { let s = 0; for (let i = 0; i < 40; i++) s += wtp(a, 0.3, r); return s / 40; }, note: "A rational bidder ignores the anchor (a flat line at £30). Here bids rise by 30p for every point of a meaningless number." },
    { title: "Present bias and the price of a visit", question: "How much does each gym visit really cost flat-fee members, depending on how present-biased they are?", how: "£50 a month, 8 chances to go; 200 members each month. β = 1 means no present bias.", xLabel: "present bias β", yLabel: "£ per visit", xs: [0.6, 0.7, 0.8, 0.9, 1], reps: 6, yMin: 0, theory: b => 50 / (8 * pGo(b)), theoryLabel: "£50 ÷ expected visits", run: (b, r) => { let v = 0; for (let i = 0; i < 200; i++) v += gymMonth(b, r); return 50 * 200 / v; }, note: "With β = 1 members go 6 times (£8.33 a visit, cheaper than pay-as-you-go). With strong present bias they pay far more per visit than the £10 they avoided." },
    { lvl: "adv", title: "How often does the herd go wrong?", question: "In what share of queues does the crowd end up at the worse restaurant?", how: "400 diners in each queue; 100 queues at each accuracy of private signals.", xLabel: "accuracy of each private signal q", yLabel: "% of crowds at the worse place", xs: [0.55, 0.6, 0.7, 0.8, 0.9], reps: 100, yMin: 0, yMax: 100, theory: q => 100 * wrongCascadeTheory(q), theoryLabel: "cascade theory", run: (q, r) => { const ch = cascade(q, r); return ch.filter(c => c === 1).length > N / 2 ? 100 : 0; }, note: "Even with fairly good information a cascade locks onto the wrong place surprisingly often, because after two people agree, nobody else's information is used." },
    { title: "Ultimatum: the most profitable offer", question: "Which share of £10 earns a proposer most, when responders care about fairness?", how: "Responders reject offers below their own threshold, mean 30% of the pot (SD 10%); 50 responders per point.", xLabel: "share offered", yLabel: "proposer's average payoff (£)", xs: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6], reps: 10, yMin: 0, theory: s => 10 * (1 - s) * acceptP(s, 0.3), theoryLabel: "(1 − share) × chance accepted", run: (s, r) => ultimatum(s, 0.3, r).pay, note: "The best offer is about 40%: well above the near-zero offer a model of purely selfish, rational people would predict." },
    { lvl: "adv", title: "Social-norm letters across 200 towns", question: "By how much do comparison letters (no smiley) change a town's average energy use?", how: "400 homes per town; above-average homes cut by 6% × (how far above); below-average homes drift up by half as much.", yLabel: "% change in average use", reps: 200, bins: 22, run: (x, r) => letters(0.06, false, r).pct, note: "Small: the boomerang from low users cancels part of the saving from high users. Adding praise for low users makes the fall bigger." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "9EC0 1.2.8", text: "Traditional theory assumes rational consumers who maximise utility with full information. Behavioural economics studies why real people do not." },
      { lvl: "std", tag: "9EC0 1.2.8", text: "Bounded rationality: limited information, time and brainpower, so people use rules of thumb and stick with defaults. Bounded self-control: present bias (gyms, saving, smoking)." },
      { lvl: "std", tag: "9EC0 1.2.8", text: "Biases: anchoring (irrelevant numbers sway judgements), availability (vivid events seem likely), social norms and herding (copying others). People also value fairness and will pay to punish unfairness." },
      { lvl: "adv", tag: "9EC0 1.4.1", text: "Choice architecture (nudges): default choices (auto-enrolment), restricted choice, mandated (active) choice, framing and social comparisons. They change behaviour without banning options or changing incentives." },
      { lvl: "adv", tag: "9EC0 1.4.1", text: "Evaluating nudges: cheap and keep freedom of choice; but effects may be small or fade, some people are nudged into the wrong choice, and choosing the default is itself paternalistic (government failure)." },
      { lvl: "beyond", tag: "Beyond the spec", text: "Information cascades: once a few people agree, followers rationally ignore their own information, so a crowd can confidently go the wrong way." }
    ],
    questions: [
      { lvl: "std", marks: 4, q: "Explain, using the idea of bounded rationality, why automatic enrolment increased the number of people saving into a pension.", ans: "<ul><li>people have limited time and information and find pension decisions complex</li><li>they tend to stick with the default (inertia, procrastination)</li><li>under opt-in the default was not saving; under opt-out it is saving</li><li>so many more people save without any change in the incentive</li></ul>" },
      { lvl: "std", marks: 2, q: "Give one example of anchoring that a retailer might use.", ans: "<ul><li>showing a high 'was' price beside the sale price</li><li>so the sale price seems a bargain compared with the anchor</li></ul>" },
      { lvl: "adv", marks: 4, q: () => `In the ultimatum game, proposers here earn most by offering about ${(100 * bestOffer(P.mu)).toFixed(0)}% of the pot. Explain why this differs from the prediction of traditional economic theory.`, ans: () => `<ul><li>a rational, self-interested responder accepts any positive offer</li><li>so theory predicts the smallest possible offer</li><li>real responders reject offers they see as unfair, giving up money to punish</li><li>so proposers offer about ${(100 * bestOffer(P.mu)).toFixed(0)}% to be accepted</li></ul>` },
      { lvl: "adv", marks: 4, q: "Evaluate the use of social-norm letters as a way to reduce household energy use.", ans: "<ul><li>cheap; no loss of freedom; reduces use by high users</li><li>but the boomerang effect: low users may increase use</li><li>effects are small (about 2%) and may fade over time</li><li>could be improved with praise for low users; may need taxes or regulation alongside</li></ul>" }
    ]
  },
  notes: `<h3>The models</h3>
<ul><li><b>Pensions:</b> each person's net benefit from joining is b ~ Normal(0.6, 0.5), so 88% would gain. Acting (changing from the default) costs effort c ~ exponential with mean = inertia. Opt-in: join if b − c > 0. Opt-out: stay in if b + c > 0. Active choice: join if b > 0.</li>
<li><b>Anchoring:</b> bid = (1 − w) × own value + w × anchor + noise; own value ~ Normal(£30, £8); w = anchoring strength.</li>
<li><b>Present bias:</b> 8 chances a month; going costs C ~ Uniform(4, 12) now and gives B = 10 later; a person goes if β × B > C. People plan with β = 1 (naive), so all who expect ≥ 5 visits buy the £50 flat fee. A commitment device (pre-booked classes with a fine) raises β by 0.15.</li>
<li><b>Herding:</b> Bikhchandani–Hirshleifer–Welch: each diner's private signal is right with probability q; once one choice leads by two, everyone follows the crowd. Wrong-cascade probability (2 − q)(1 − q) ÷ 2(1 − q + q²).</li>
<li><b>Fairness:</b> each responder rejects offers below a threshold ~ Normal(μ, 0.1).</li>
<li><b>Social norms:</b> homes' use is log-normal around 3100 kWh; above-average homes cut by k × (gap ÷ average); below-average homes rise by half that unless praised.</li></ul>
<h3>Simplifications</h3><ul><li>Each person follows one simple rule; real people mix many motives.</li><li>Effect sizes are chosen to match well-known studies roughly (UK auto-enrolment, Ariely's anchoring, DellaVigna and Malmendier's gyms, Opower letters); they are illustrations, not estimates.</li><li>Nobody learns from experience within a run.</li></ul>`
});

// ---------------- Controls ----------------
const ctl = {}; let g = ui.group("Scenario");
ctl.sc = K.seg(g, { value: "pension", options: Object.entries(SC).map(([k, n]) => [k, n]), on: v => set({ sc: v }) });
const gp = {}; gp.pension = g = ui.group("Pension design");
ctl.design = K.seg(g, { value: "in", options: [["in", "opt-in"], ["active", "active choice"], ["out", "opt-out (auto-enrolment)"]], on: v => { P.design = v; rerun(); } });
ctl.inertia = K.slider(g, { label: "Inertia (effort of acting)", min: 0, max: 1.5, step: 0.05, value: 0.6, on: v => { P.inertia = v; rerun(); } });
gp.anchor = g = ui.group("Anchoring");
ctl.w = K.slider(g, { label: "Anchoring strength w", min: 0, max: 0.6, step: 0.05, value: 0.3, fmt: v => v ? v.toFixed(2) : "0 (rational)", on: v => { P.w = v; rerun(); } });
gp.gym = g = ui.group("The gym");
ctl.beta = K.slider(g, { label: "Present bias β (1 = none)", min: 0.4, max: 1, step: 0.05, value: 0.7, on: v => { P.beta = v; rerun(); } });
ctl.commit = K.toggle(g, { label: "Nudge: pre-booked classes (commitment device)", value: false, on: v => { P.commit = v; rerun(); } });
gp.herd = g = ui.group("Herding");
ctl.q = K.slider(g, { label: "Accuracy of each private signal", min: 0.5, max: 0.95, step: 0.05, value: 0.7, fmt: v => (v * 100).toFixed(0) + "%", on: v => { P.q = v; rerun(); } });
gp.fair = g = ui.group("Ultimatum game");
ctl.mu = K.slider(g, { label: "How much responders care about fairness", min: 0, max: 0.45, step: 0.05, value: 0.3, fmt: v => v ? `reject below about ${(v * 100).toFixed(0)}%` : "not at all (rational)", on: v => { P.mu = v; rerun(); } });
ctl.offer = K.slider(g, { label: "Proposer offers", min: 0.05, max: 0.6, step: 0.05, value: 0.4, fmt: v => `£${(10 * v).toFixed(2)} (${(v * 100).toFixed(0)}%)`, on: v => { P.offer = v; rerun(); } });
gp.norm = g = ui.group("Energy letters");
ctl.k = K.slider(g, { label: "How strongly people respond", min: 0, max: 0.15, step: 0.01, value: 0.06, on: v => { P.k = v; rerun(); } });
ctl.smiley = K.toggle(g, { label: "Add 😊 praise for below-average homes", value: false, on: v => { P.smiley = v; rerun(); } });
K.btn(K.row(ui.group("")), "🎲 New people", () => { seed++; rerun(); }, "primary");
const read = K.readout(ui.group("Results"), [["a", "–"], ["b", "–"], ["c", "–"], ["d", "–"]]);
const label = (i, s) => { read.el.children[i].firstElementChild.textContent = s; };
function sync() { ctl.sc.set(P.sc); for (const k in gp) gp[k].style.display = k === P.sc ? "" : "none"; ctl.design.set(P.design); ctl.inertia.set(P.inertia); ctl.w.set(P.w); ctl.beta.set(P.beta); ctl.commit.set(P.commit); ctl.q.set(P.q); ctl.mu.set(P.mu); ctl.offer.set(P.offer); ctl.k.set(P.k); ctl.smiley.set(P.smiley);
  ctl.sc.el.querySelectorAll("button")[5].style.display = ui.level === "adv" ? "" : "none"; }
function set(o) { Object.assign(P, DEF, o); if (ui.level !== "adv" && P.sc === "norm") P.sc = "pension"; sync(); rerun(); }
const bestOffer = mu => { let b = 0, bp = -1; for (let s = 0.01; s <= 0.99; s += 0.01) { const p = (1 - s) * acceptP(s, mu); if (p > bp) { bp = p; b = s; } } return b; };
// run the current scenario once with this seed (the picture animates people deciding one by one)
function rerun() { const r = K.rng(seed * 7919 + 13); anim = 0;
  if (P.sc === "pension") res = Object.assign(pensions(P.design, P.inertia, r), { all: ["in", "active", "out"].map(d => pensions(d, P.inertia, K.rng(seed * 7919 + 13)).pct) });
  else if (P.sc === "anchor") { const a = [], b = []; for (let i = 0; i < N; i++) { const an = r.int(100); a.push(an); b.push(wtp(an, P.w, r)); } res = { a, b }; }
  else if (P.sc === "gym") { const beta = Math.min(1, P.beta + (P.commit ? 0.15 : 0)), v = []; for (let i = 0; i < N; i++) v.push(gymMonth(beta, r)); res = { v, beta }; }
  else if (P.sc === "herd") res = { ch: cascade(P.q, r) };
  else if (P.sc === "fair") { const t = []; for (let i = 0; i < N; i++) t.push(P.mu <= 0 ? 0 : P.mu + 0.1 * r.gauss()); res = { t }; }
  else res = letters(P.k, P.smiley, r); }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function WRAP(c, s, x, y, maxW, lh = 15, col = "#8fa0bf", f = "11.5px") { c.font = f + " Segoe UI,sans-serif"; let line = ""; for (const wd of s.split(" ")) { if (c.measureText(line + wd).width > maxW && line) { TX(c, line, x, y, col, "left", f); y += lh; line = ""; } line += wd + " "; } TX(c, line, x, y, col, "left", f); return y + lh; }
// the crowd: 400 little people on a 20 × 20 grid, coloured by what they did
function crowd(c, x0, y0, sz, colOf, shown) { const d = sz / 20; for (let i = 0; i < N; i++) { const gx = i % 20, gy = Math.floor(i / 20), x = x0 + (gx + 0.5) * d, y = y0 + (gy + 0.5) * d; c.fillStyle = i < shown ? colOf(i) : "#2a3550"; c.beginPath(); c.arc(x, y - d * 0.12, d * 0.17, 0, 6.3); c.fill(); c.beginPath(); c.ellipse(x, y + d * 0.2, d * 0.22, d * 0.18, 0, Math.PI, 0); c.fill(); } }
function draw(dt) {
  const c = cv.ctx, w = cv.w, h = cv.h, adv = ui.level === "adv"; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); if (!res) return;
  anim = Math.min(N, anim + (dt || 0.016) * 260); const shown = Math.floor(anim), sz = Math.min(h - 70, w * 0.42), x0 = 24, y0 = 46; let tx = x0 + sz + 30, y = 40; const tw = w - tx - 20;
  TX(c, SC[P.sc], x0, 28, "#eef2f8", "left", "600 15px");
  const leg = (items) => { items.forEach(([col, t]) => { c.fillStyle = col; c.beginPath(); c.arc(tx + 6, y - 4, 6, 0, 6.3); c.fill(); TX(c, t, tx + 18, y, "#cfd8ea", "left", "12px"); y += 20; }); y += 6; };
  if (P.sc === "pension") { crowd(c, x0, y0, sz, i => ["#56607a", "#7ee787", "#ff6b81", "#ffb454"][res.who[i]], shown);
    TX(c, { in: "Opt-in: you are not in the scheme unless you sign up", active: "Active choice: everyone must tick yes or no", out: "Opt-out: you are in unless you ask to leave" }[P.design], tx, y, "#eef2f8", "left", "600 13px"); y += 26;
    leg([["#7ee787", "in the scheme, and it is good for them"], ["#ff6b81", "in the scheme, though it is not good for them"], ["#ffb454", "not in, though it would be good for them"], ["#56607a", "not in, and rightly so"]]);
    y = WRAP(c, `${res.pct.toFixed(0)}% enrolled; ${res.wrong.toFixed(0)}% are in the 'wrong' group for them. A rational robot (no inertia) would give 88% whatever the design.`, tx, y, tw, 17, "#cfd8ea", "13px");
    y = WRAP(c, "Real world: UK automatic enrolment (from 2012) raised private-sector pension saving from 42% to 86% of eligible employees.", tx, y + 8, tw, 15, "#8fa0bf", "11.5px");
  } else if (P.sc === "anchor") { crowd(c, x0, y0, sz, i => { const a = res.a[i]; return `hsl(${200 - 1.6 * a},70%,60%)`; }, shown);
    TX(c, "1. Write down the last two digits of your phone number.", tx, y, "#eef2f8", "left", "600 13px"); y += 20; TX(c, "2. Would you pay that many pounds for this wine? What is your top bid?", tx, y, "#eef2f8", "left", "600 13px"); y += 26;
    leg([["hsl(200,70%,60%)", "low number"], ["hsl(40,70%,60%)", "high number"]]);
    const lo = res.b.filter((v, i) => res.a[i] < 20), hi = res.b.filter((v, i) => res.a[i] >= 80); y = WRAP(c, `Bottom fifth of numbers bid £${K.mean(lo).toFixed(2)} on average; top fifth bid £${K.mean(hi).toFixed(2)} (${(100 * K.mean(hi) / K.mean(lo)).toFixed(0)}%). The number tells them nothing about wine.`, tx, y, tw, 17, "#cfd8ea", "13px");
  } else if (P.sc === "gym") { const flat = res.v.filter(() => true); crowd(c, x0, y0, sz, i => res.v[i] >= 5 ? "#7ee787" : res.v[i] >= 3 ? "#ffb454" : "#ff6b81", shown);
    TX(c, "Everyone planned at least 5 visits, so all bought the £50 flat fee.", tx, y, "#eef2f8", "left", "600 13px"); y += 26; leg([["#7ee787", "went 5+ times (the plan)"], ["#ffb454", "went 3–4 times"], ["#ff6b81", "went 0–2 times"]]);
    const vis = K.mean(flat); y = WRAP(c, `They went ${vis.toFixed(1)} times on average: £${(50 / vis).toFixed(2)} per visit, against £10 pay-as-you-go. When the time comes, today's effort outweighs tomorrow's benefit (β = ${res.beta.toFixed(2)}).`, tx, y, tw, 17, "#cfd8ea", "13px");
  } else if (P.sc === "herd") { crowd(c, x0, y0, sz, i => res.ch[i] === 0 ? "#7ee787" : "#ff6b81", shown);
    const cA = res.ch.slice(0, shown).filter(v => v === 0).length; TX(c, "Diners choose one at a time, seeing the queue in front", tx, y, "#eef2f8", "left", "600 13px"); y += 26; leg([["#7ee787", "the better restaurant"], ["#ff6b81", "the worse restaurant"]]);
    let ci = -1, d = 0; for (let i = 0; i < res.ch.length; i++) { d += res.ch[i] === 0 ? 1 : -1; if (Math.abs(d) >= 2) { ci = i + 1; break; } }
    y = WRAP(c, `So far: ${cA} at the better place, ${shown - cA} at the worse. ${ci > 0 ? `A cascade began after diner ${ci}: from then on everyone followed the crowd, whatever their own tip-off said.` : ""}`, tx, y, tw, 17, "#cfd8ea", "13px");
  } else if (P.sc === "fair") { const acc = i => res.t[i] <= P.offer && P.offer > 0; crowd(c, x0, y0, sz, i => acc(i) ? "#7ee787" : "#ff6b81", shown);
    TX(c, `The proposer offers £${(10 * P.offer).toFixed(2)} of £10`, tx, y, "#eef2f8", "left", "600 13px"); y += 26; leg([["#7ee787", "accepts"], ["#ff6b81", "rejects: both get nothing"]]);
    const a = res.t.filter((t, i) => acc(i)).length / N; y = WRAP(c, `${(100 * a).toFixed(0)}% accept, so the proposer expects £${(10 * (1 - P.offer) * a).toFixed(2)}. Best offer here: about ${(100 * bestOffer(P.mu)).toFixed(0)}%. A rational responder would accept even 1p.`, tx, y, tw, 17, "#cfd8ea", "13px");
  } else { const up = i => res.after[i] > res.use[i]; crowd(c, x0, y0, sz, i => up(i) ? "#ff6b81" : res.after[i] < res.use[i] * 0.995 ? "#7ee787" : "#8fa0bf", shown);
    TX(c, "\"Your use compared with your neighbours\" letters", tx, y, "#eef2f8", "left", "600 13px"); y += 26; leg([["#7ee787", "cut their use"], ["#ff6b81", "used more (the boomerang)"]]);
    y = WRAP(c, `Average use changed by ${res.pct.toFixed(1)}% (${res.avg.toFixed(0)} → ${res.avg2.toFixed(0)} kWh a year). ${P.smiley ? "Praise stops low users drifting up." : "Low users learn they are 'below average' and drift up."}`, tx, y, tw, 17, "#cfd8ea", "13px");
  }
  ui.hud("");
}

// ---------------- Charts ----------------
function charts() { if (!res) return; chA.opts.xFmt = null; chB.opts.xFmt = null; const lab = l => l.forEach((t, i) => label(i, t));
  if (P.sc === "pension") { const ks = [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5];
    chA.opts.title = "% enrolled against inertia"; chA.opts.xLabel = "inertia"; chA.opts.yLabel = "% enrolled"; chA.draw([["in", "#ffb454", "opt-in"], ["active", "#8fa0bf", "active choice"], ["out", "#7ee787", "opt-out"]].map(([d, col, l]) => ({ pts: ks.map(k => [k, pensionsExact(d, k)]), color: col, label: l })), { yMin: 0, yMax: 100, vlines: [{ x: P.inertia, label: "now" }] });
    chB.opts.title = "This crowd under each design"; chB.opts.xLabel = ""; chB.opts.yLabel = "% enrolled"; chB.opts.xFmt = v => ["", "opt-in", "active", "opt-out"][Math.round(v)] || ""; chB.draw([{ pts: res.all.map((p, i) => [i + 1, p]), type: "bars", w: 0.5, color: "#5ad1ff", label: "" }], { xMin: 0.4, xMax: 3.6, yMin: 0, yMax: 100, hlines: [{ y: 88, color: "rgba(255,255,255,.3)", label: "rational: 88%" }] });
    lab(["design", "% enrolled", "% in the 'wrong' group", "rational choice"]); read.set("a", { in: "opt-in", active: "active choice", out: "opt-out" }[P.design]); read.set("b", res.pct.toFixed(0) + "%"); read.set("c", res.wrong.toFixed(0) + "%"); read.set("d", "88%");
  } else if (P.sc === "anchor") { const pts = res.a.map((a, i) => [a, res.b[i]]), f = K.linfit(pts);
    chA.opts.title = "Bid against phone number"; chA.opts.xLabel = "last two digits"; chA.opts.yLabel = "bid (£)"; chA.draw([{ pts, type: "dots", r: 2, color: "#5ad1ff", alpha: 0.6, label: "each person" }, { pts: [[0, f.c], [99, f.c + 99 * f.m]], color: "#ffd166", label: "best fit" }, { pts: [[0, 30], [99, 30]], color: "#8fa0bf", dash: [5, 4], label: "rational" }], { xMin: 0, xMax: 100, yMin: 0 });
    const qs = [0, 1, 2, 3, 4].map(k => K.mean(res.b.filter((v, i) => res.a[i] >= 20 * k && res.a[i] < 20 * k + 20))); chB.opts.title = "Mean bid by fifth of phone numbers"; chB.opts.xLabel = "fifth"; chB.opts.yLabel = "£"; chB.opts.xFmt = v => ["", "00–19", "20–39", "40–59", "60–79", "80–99"][Math.round(v)] || ""; chB.draw([{ pts: qs.map((q, i) => [i + 1, q]), type: "bars", w: 0.6, color: "#ffb454", label: "" }], { xMin: 0.4, xMax: 5.6, yMin: 0 });
    lab(["anchoring strength", "gradient (£ per point)", "correlation r", "rational gradient"]); read.set("a", P.w.toFixed(2)); read.set("b", f.m.toFixed(2)); read.set("c", f.r.toFixed(2)); read.set("d", "0");
  } else if (P.sc === "gym") { const hist = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(v => [v, res.v.filter(x => x === v).length]), bs = []; for (let b = 0.4; b <= 1.001; b += 0.02) bs.push([b, 50 / Math.max(0.01, 8 * pGo(b))]);
    chA.opts.title = "Visits in the month"; chA.opts.xLabel = "visits"; chA.opts.yLabel = "members"; chA.draw([{ pts: hist, type: "bars", w: 0.7, color: "#c4a1ff", label: "" }], { xMin: -0.5, xMax: 8.5, yMin: 0, vlines: [{ x: 5, color: "#ffd166", label: "planned" }] });
    chB.opts.title = "Price per visit against present bias"; chB.opts.xLabel = "β"; chB.opts.yLabel = "£ per visit"; chB.draw([{ pts: bs, color: "#7ee787", label: "flat fee £50" }, { pts: [[0.4, 10], [1, 10]], color: "#8fa0bf", dash: [5, 4], label: "pay as you go £10" }], { xMin: 0.4, xMax: 1, yMin: 0, yMax: 40, vlines: [{ x: res.beta, label: "now" }] });
    const vis = K.mean(res.v); lab(["β (with nudge)", "visits planned", "visits made", "£ per visit"]); read.set("a", res.beta.toFixed(2)); read.set("b", "5 or more"); read.set("c", vis.toFixed(1)); read.set("d", "£" + (50 / vis).toFixed(2));
  } else if (P.sc === "herd") { let d = 0; const pts = res.ch.map((c, i) => [i + 1, (d += c === 0 ? 1 : -1)]); const qs = []; for (let q = 0.5; q <= 0.951; q += 0.025) qs.push([q, 100 * wrongCascadeTheory(q)]);
    chA.opts.title = "Lead of the better restaurant"; chA.opts.xLabel = "diner"; chA.opts.yLabel = "better − worse"; chA.draw([{ pts: pts.slice(0, Math.max(1, Math.floor(anim))), color: "#7ee787", label: "running lead" }], { xMin: 0, xMax: N, hlines: [{ y: 0, color: "rgba(255,255,255,.3)" }] });
    chB.opts.title = "Chance the crowd goes wrong"; chB.opts.xLabel = "signal accuracy"; chB.opts.yLabel = "%"; chB.draw([{ pts: qs, color: "#ff6b81", label: "theory" }], { xMin: 0.5, xMax: 0.95, yMin: 0, yMax: 55, vlines: [{ x: P.q, label: "now" }] });
    const fin = res.ch.filter(c => c === 0).length; lab(["signal accuracy", "at the better place", "outcome", "chance of a wrong cascade"]); read.set("a", (100 * P.q).toFixed(0) + "%"); read.set("b", fin + " of " + N); read.set("c", fin > N / 2 ? "crowd right" : "crowd wrong"); read.set("d", (100 * wrongCascadeTheory(P.q)).toFixed(0) + "%");
  } else if (P.sc === "fair") { const ss = []; for (let s = 0; s <= 1.0001; s += 0.02) ss.push(s);
    chA.opts.title = "Chance an offer is accepted"; chA.opts.xLabel = "share offered"; chA.opts.yLabel = "probability"; chA.draw([{ pts: ss.map(s => [s, acceptP(s, P.mu)]), color: "#7ee787", label: "fair-minded" }, { pts: ss.map(s => [s, s > 0 ? 1 : 0]), color: "#8fa0bf", dash: [5, 4], label: "rational" }], { xMin: 0, xMax: 1, yMin: 0, yMax: 1.05, vlines: [{ x: P.offer, label: "offer" }] });
    chB.opts.title = "Proposer's expected payoff"; chB.opts.xLabel = "share offered"; chB.opts.yLabel = "£"; chB.draw([{ pts: ss.map(s => [s, 10 * (1 - s) * acceptP(s, P.mu)]), color: "#ffd166", label: "payoff" }], { xMin: 0, xMax: 1, yMin: 0, vlines: [{ x: bestOffer(P.mu), label: "best" }] });
    const a = res.t.filter(t => t <= P.offer).length / N; lab(["offer", "% accepting", "proposer expects", "best offer"]); read.set("a", (100 * P.offer).toFixed(0) + "%"); read.set("b", (100 * a).toFixed(0) + "%"); read.set("c", "£" + (10 * (1 - P.offer) * a).toFixed(2)); read.set("d", (100 * bestOffer(P.mu)).toFixed(0) + "%");
  } else { const ch = res.use.map((u, i) => [u, 100 * (res.after[i] / u - 1)]);
    chA.opts.title = "Change in use against use before"; chA.opts.xLabel = "use before (kWh)"; chA.opts.yLabel = "% change"; chA.draw([{ pts: ch, type: "dots", r: 2, color: "#5ad1ff", alpha: 0.6, label: "each home" }], { vlines: [{ x: res.avg, label: "average" }], hlines: [{ y: 0, color: "rgba(255,255,255,.3)" }] });
    const h = K.histogram(res.use, 20); chB.opts.title = "Homes' energy use"; chB.opts.xLabel = "kWh a year"; chB.opts.yLabel = "homes"; chB.draw([{ pts: h.pts, w: h.w, type: "bars", color: "#c4a1ff", label: "" }], { yMin: 0 });
    lab(["response k", "average before", "average after", "% change"]); read.set("a", P.k.toFixed(2)); read.set("b", res.avg.toFixed(0)); read.set("c", res.avg2.toFixed(0)); read.set("d", res.pct.toFixed(1) + "%"); }
}
let frame = 0;
ui.onLevel = () => { sync(); if (ui.level !== "adv" && P.sc === "norm") set({ sc: "pension" }); };
ui.run(() => { }, dt => { if (dt > 0 || frame < 2) draw(dt > 0 ? dt : 0.016); if (frame++ % 5 === 0) charts(); });
set({});
ui.tip("Each dot is a person deciding. Pick a scenario, change the design, and compare with what a perfectly rational robot would do.", 7000);
