/* =====================================================================
   AROUSAL, ANXIETY AND PERFORMANCE
   Arousal is how "switched on" a performer is, from deeply relaxed to
   panic. Too little and they are flat and careless; too much and they
   tense up, lose concentration and make mistakes. The best level
   depends on the skill: fine, complex skills (a putt) need low arousal;
   gross, simple skills (a rugby tackle, a lift) need high arousal.

   The athlete attempts the skill again and again. The chance of success
   on each attempt comes from the theory chosen:
     * inverted-U    success peaks at a moderate, skill-dependent arousal
     * drive theory  more arousal → more of the dominant response
                     (good for experts, bad for beginners)
     * catastrophe   with high cognitive anxiety, going past the peak
                     causes a sudden collapse, slow to recover
     * zone (ZOF)    each performer has their own best band
   Other views: mental preparation in a competition, the audience
   (social facilitation) and groups (Ringelmann effect, social loafing).
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";   // label category axes only at whole numbers
const SKILLS = {
  putt: { name: "Golf putt", gross: 0, cx: 0.8, icon: "⛳" }, free: { name: "Basketball free throw", gross: 0.3, cx: 0.5, icon: "🏀" },
  pen: { name: "Football penalty", gross: 0.5, cx: 0.4, icon: "⚽" }, tackle: { name: "Rugby tackle", gross: 1, cx: 0.1, icon: "🏉" }, lift: { name: "Weightlifting (clean and jerk)", gross: 0.9, cx: 0.3, icon: "🏋" }
};
// arousal A is on a scale of 0 (asleep) to 100 (panic)
function curveParams(o) { const S = SKILLS[o.skill], sk = o.expert ? 1 : 0; return { opt: 30 + 30 * S.gross - 25 * S.cx + 15 * sk + 8 * (o.extro || 0), w: 18 + 10 * sk, peak: 0.35 + 0.55 * (o.expert ? 0.95 : 0.4), floor: 0.05 }; }
/* chance of success at arousal A. o = { skill, expert, theory, cog (cognitive anxiety 0–1), zone (centre of the athlete's zone), collapsed } */
function success(A, o, state) {
  const c = curveParams(o);
  if (o.theory === "drive") { const lo = c.floor + 0.1, hi = c.peak; return o.expert ? lo + (hi - lo) * A / 100 : hi - (hi - lo) * A / 100; }   // more arousal → more of the dominant response
  if (o.theory === "zof") { const z = o.zone, half = 8; const d = A < z - half ? z - half - A : A > z + half ? A - z - half : 0; return c.floor + (c.peak - c.floor) * Math.exp(-0.5 * (d / 10) ** 2); }
  const iu = c.floor + (c.peak - c.floor) * Math.exp(-0.5 * ((A - c.opt) / c.w) ** 2);
  if (o.theory === "cat" && o.cog >= 0.3) {
    // catastrophe theory: once arousal passes the edge of the cliff, performance collapses; it recovers only when arousal falls well below
    const edge = c.opt + c.w * (1.6 - 1.2 * o.cog), back = edge - 40 * o.cog;
    if (state) { if (A > edge) state.collapsed = true; else if (A < back) state.collapsed = false; }
    const coll = state ? state.collapsed : A > edge; return coll ? c.floor + 0.03 : (A < c.opt ? iu : Math.max(iu, c.peak * 0.97));
  }
  return iu;
}

// ---- mental preparation: arousal and worry during a competition ----
const SCEN = { final: { name: "Cup final shoot-out", imp: 0.9, crowd: 0.9 }, league: { name: "League match", imp: 0.5, crowd: 0.5 }, friendly: { name: "Dull friendly", imp: 0.1, crowd: 0.1 }, trial: { name: "Trial in front of scouts", imp: 0.8, crowd: 0.2 } };
const TECH = {
  none: { name: "Nothing", dA: 0, dC: 0, std: true }, imagery: { name: "Imagery / mental rehearsal", dA: -8, dC: -15, bonus: 0.03, std: true }, attention: { name: "Selective attention", dA: -4, dC: -5, crowdCut: 0.6, std: true },
  positive: { name: "Positive self-talk", dA: -3, dC: -20, std: true }, breathing: { name: "Deep breathing", dA: -15, dC: -5, std: true }, psych: { name: "Psyching up", dA: 18, dC: 5, std: true },
  pmr: { name: "Progressive muscle relaxation", dA: -22, dC: -5 }, centring: { name: "Centring", dA: -12, dC: -12 }
};
function competition(o, r, onStep) {
  // 36 attempts over a match; arousal is pulled towards a level set by importance, the crowd and rising pressure; misses add worry
  const S = SCEN[o.scen], T2 = TECH[o.tech]; let A = 25 + 40 * S.imp, C = 20 + 50 * S.imp, hits = 0, used = false; const st = { collapsed: false }, out = [];
  for (let k = 0; k < 36; k++) {
    const pressure = k / 36 * 20 * S.imp, crowd = 25 * S.crowd * (T2.crowdCut && used ? 1 - T2.crowdCut : 1), target = 15 + 35 * S.imp + crowd + pressure;
    const keepA = used && T2.dA ? T2.dA * 0.7 : 0, keepC = used ? T2.dC * 0.7 : 0;     // a technique keeps working after it is first used
    A += (target + keepA - A) * 0.3 + 3 * r.gauss(); C += (20 + 60 * S.imp + pressure + keepC - C) * 0.2 + 2 * r.gauss();
    if (o.tech !== "none" && (o.when === "start" ? k === 0 : Math.abs(A - curveParams(o).opt) > 15 && !used)) { A += T2.dA; C += T2.dC; used = true; }
    if (used && o.when === "always") { A += T2.dA * 0.3; C += T2.dC * 0.3; }
    A = K.clamp(A, 0, 100); C = K.clamp(C, 0, 100);
    const p = Math.min(0.98, success(A, Object.assign({}, o, { cog: C / 100 }), st) * (1 - 0.35 * Math.max(0, C - 50) / 50) + (used ? T2.bonus || 0 : 0)), hit = r() < p; if (hit) hits++; else { A += 3; C += 6; }
    out.push({ k, A, C, p, hit }); if (onStep) onStep(out[k]);
  }
  return { out, rate: hits / 36 };
}
// ---- audience: Zajonc's social facilitation: an audience raises arousal ----
const audArousal = (n, o) => o.base + (o.eval ? 14 : 8) * Math.log10(1 + n) * (o.home ? 0.85 : 1.1);
// ---- groups: Ringelmann (1913): effort per person falls as the group grows ----
const RINGEL = { 1: 100, 2: 93, 3: 85, 8: 49 };
function teamPull(n, o, r) { const coord = 1 - 0.035 * (n - 1) * (o.practice ? 0.5 : 1), loaf = 1 - (o.ident ? 0.01 : 0.045) * (n - 1) * (o.cohesion ? 0.6 : 1); const per = coord * loaf * (1 + 0.05 * r.gauss()); return { per: 100 * per, coord: 100 * coord, loaf: 100 * loaf }; }

// ---------------- The page ----------------
const P = { mode: "arousal", skill: "pen", expert: true, theory: "iu", cog: 0.5, zone: 45, auto: true, A: 40, scen: "final", tech: "none", when: "start", aud: 0, base: 30, eval: true, home: true, n: 4, ident: false, cohesion: false, practice: false };
let rnd = K.rng(Date.now() % 99991 + 47), speed = 1, t = 0, attempts = [], st = { collapsed: false }, lastShot = -1, ball = null, comp = null, compK = 0, team = null;
const ui = K.app({
  title: "Arousal, Anxiety and Performance", subject: "Physical Education",
  blurb: "The inverted-U, drive and catastrophe theories, mental preparation, audiences and groups",
  reset: () => set({ mode: P.mode }),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "OCR GCSE (9–1) Physical Education (J587) 2.2 sports psychology: mental preparation for performance (imagery, mental rehearsal, selective attention, positive thinking). Arousal, the inverted-U and the other theories here are not on J587: they are A level (H555 2.2) and are introduced simply.", adv: "OCR A level Physical Education (H555) 2.2 sport psychology: arousal (drive theory, inverted-U, catastrophe theory, zone of optimal functioning), anxiety (cognitive and somatic), stress management techniques, social facilitation and inhibition (evaluation apprehension), group dynamics (Ringelmann effect, social loafing, Steiner's model)." } },
  missions: [
    { title: "The inverted-U", q: "Watch an expert take penalties as their arousal sweeps from calm to panic and back. When do they score most? What goes wrong when arousal is too low, and too high?", hint: "Success is highest at a moderate arousal (the optimum). Too low: the player is under-aroused, lacks focus and effort. Too high: muscles tense, attention narrows too much, and they make mistakes. The dots on the graph trace out an upside-down U.", setup() { set({ skill: "pen", theory: "iu" }); } },
    { title: "Fine or gross skill?", q: "Compare a golf putt with a rugby tackle. Where is each one's best arousal? Why?", hint: "A putt is a fine, complex skill needing precise control and calm: its optimum is low. A tackle is a gross, simple skill using big muscle groups and aggression: its optimum is high. Experts also cope with higher arousal than beginners.", setup() { set({ skill: "putt", theory: "iu" }); } },
    { title: "Beginners and experts", q: "Switch the athlete to a beginner. Under drive theory, what does high arousal do to a beginner's performance? To an expert's?", hint: "Drive theory: performance = habit × drive. Arousal brings out the dominant (well-learned) response. For an expert that response is correct, so performance rises; for a beginner it is often wrong, so performance gets worse. This is why beginners should learn in calm conditions.", setup() { set({ theory: "drive", expert: false }); } },
    { title: "Catastrophe!", q: "Use catastrophe theory with high cognitive anxiety (worry). What happens when arousal passes the peak? Does performance come back as soon as arousal falls a little?", hint: "With high worry, going past the optimum causes a sudden, dramatic drop: a catastrophe (a choke). Performance does not recover just by calming down a little: arousal has to fall well below where it collapsed (hysteresis). Low cognitive anxiety gives a gentle inverted-U instead.", setup() { set({ theory: "cat", cog: 0.7 }); } },
    { title: "Mental preparation", q: "A cup-final shoot-out sends arousal and worry soaring. Try each technique before the start: imagery, selective attention, positive self-talk, deep breathing. Which helps most? Would psyching up help?", hint: "Techniques that lower arousal and worry (imagery and mental rehearsal, deep breathing, positive self-talk) bring the player back into their zone. Selective attention cuts out the crowd. Psyching up only helps if arousal is too low, as in a dull friendly. The batch run compares them over 100 competitions.", setup() { set({ mode: "comp", scen: "final", tech: "imagery" }); } },
    { title: "The audience", q: "Increase the crowd from 0 to 60 000 for an expert and for a beginner. Who gets better, and who gets worse?", hint: "An audience raises arousal (Zajonc). For experts doing well-learned skills this helps (social facilitation); for beginners it hurts (social inhibition). An evaluating audience (scouts, coaches) raises arousal most: evaluation apprehension.", setup() { set({ mode: "aud" }); } },
    { title: "Pulling together?", q: "Add people to the tug-of-war team one at a time. Does each person pull as hard in a team of 8 as on their own?", hint: "No: in Ringelmann's 1913 rope-pulling study, eight people pulled at only about half their individual effort each. Part is coordination loss (not pulling at the same moment), part is motivation loss: social loafing. Making each person's effort identifiable reduces loafing.", setup() { set({ mode: "group", n: 1 }); } },
    { lvl: "adv", title: "Zone of optimal functioning", q: "Use Hanin's zone of optimal functioning. Move the athlete's zone to a low or high arousal. How is this different from the inverted-U?", hint: "The inverted-U says the optimum is a single point that depends on the task. ZOF says each performer has their own band, which may be low, middle or high, and within it performance is at its best (a plateau, not a peak). Coaches help each athlete learn where their zone is.", setup() { set({ theory: "zof", zone: 70 }); } },
    { lvl: "adv", title: "Steiner's model", q: "With a team of 6, make efforts identifiable, build cohesion and practise together. How close does actual productivity get to potential?", hint: "Steiner: actual productivity = potential productivity − losses due to faulty processes (coordination losses + motivation losses). Practice cuts coordination losses; identifiability and cohesion cut motivation losses (social loafing).", setup() { set({ mode: "group", n: 6, ident: true, cohesion: true, practice: true }); } }
  ],
  batch: [
    { title: "The inverted-U", question: "How does an expert's penalty success rate depend on arousal?", how: "40 penalties at each arousal level from 0 to 100. Theory: the inverted-U curve for this skill and level.", xLabel: "arousal (0–100)", yLabel: "success rate (%)", xs: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100], reps: 3, yMin: 0, theory: A => 100 * success(A, { skill: "pen", expert: true, theory: "iu" }), theoryLabel: "inverted-U", run: (x, r) => { let h = 0; for (let k = 0; k < 40; k++) if (r() < success(x, { skill: "pen", expert: true, theory: "iu" })) h++; return 100 * h / 40; }, note: "The results trace out the upside-down U, with scatter because each attempt is a matter of chance: 40 attempts give a success rate to within about ±8%." },
    { title: "Fine and gross skills", question: "Where is the best arousal for a rugby tackle compared with a golf putt?", how: "Expert rugby tackles, 40 at each arousal level. The dashed line is the golf putt.", xLabel: "arousal (0–100)", yLabel: "success rate (%)", xs: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100], reps: 3, yMin: 0, theory: A => 100 * success(A, { skill: "putt", expert: true, theory: "iu" }), theoryLabel: "golf putt", run: (x, r) => { let h = 0; for (let k = 0; k < 40; k++) if (r() < success(x, { skill: "tackle", expert: true, theory: "iu" })) h++; return 100 * h / 40; }, note: "The tackle's peak is far to the right of the putt's: gross, simple skills need high arousal, fine complex ones low." },
    { title: "Drive theory for a beginner", question: "Under drive theory, how does a beginner's free-throw success change with arousal?", how: "Beginner, 40 free throws at each arousal level. Theory: a straight line falling (the dominant response is wrong).", xLabel: "arousal (0–100)", yLabel: "success rate (%)", xs: [0, 20, 40, 60, 80, 100], reps: 4, yMin: 0, theory: A => 100 * success(A, { skill: "free", expert: false, theory: "drive" }), theoryLabel: "drive theory", run: (x, r) => { let h = 0; for (let k = 0; k < 40; k++) if (r() < success(x, { skill: "free", expert: false, theory: "drive" })) h++; return 100 * h / 40; }, note: "The more aroused the beginner, the worse they do: their dominant response is still the wrong one." },
    { title: "Which mental preparation works best?", question: "In a cup-final shoot-out, which technique (used before the start) gives the best success rate?", how: "Each run is a 36-attempt competition for an expert penalty taker. 1 nothing, 2 imagery, 3 selective attention, 4 positive self-talk, 5 deep breathing, 6 psyching up.", xLabel: "technique (1–6)", yLabel: "success rate (%)", xs: [1, 2, 3, 4, 5, 6], reps: 15, yMin: 0, run: (x, r) => 100 * competition({ skill: "pen", expert: true, theory: "iu", scen: "final", tech: ["none", "imagery", "attention", "positive", "breathing", "psych"][x - 1], when: "start" }, r).rate, note: "Techniques that bring arousal down help in a high-pressure final; psyching up makes it worse. Each competition is short, so results scatter: compare the means and their error bars." },
    { title: "The audience: experts and beginners", question: "How does the size of the audience change an expert's success rate?", how: "Expert penalty taker, an evaluating home crowd from 0 to 60 000; 40 penalties each. The dashed line is a beginner.", xLabel: "audience (log₁₀ of spectators + 1)", yLabel: "success rate (%)", xs: [0, 1, 2, 3, 4, 4.8], reps: 3, yMin: 0, theory: x => 100 * success(audArousal(Math.pow(10, x) - 1, { base: 30, eval: true, home: true }), { skill: "pen", expert: false, theory: "iu" }), theoryLabel: "beginner", run: (x, r) => { const A = audArousal(Math.pow(10, x) - 1, { base: 30, eval: true, home: true }); let h = 0; for (let k = 0; k < 40; k++) if (r() < success(A, { skill: "pen", expert: true, theory: "iu" })) h++; return 100 * h / 40; }, note: "A small crowd lifts the expert towards their optimum (social facilitation) while pushing the beginner past theirs (social inhibition). A huge evaluating crowd can push even an expert past their best." },
    { title: "The Ringelmann effect", question: "How does effort per person change with the size of the team?", how: "Tug of war, no identifiability, cohesion or practice; ±5% person to person. Dashed: Ringelmann's 1913 rope-pulling results (1, 2, 3 and 8 people).", xLabel: "people in the team", yLabel: "effort per person (% of their solo effort)", xs: [1, 2, 3, 4, 5, 6, 7, 8], reps: 5, yMin: 0, yMax: 110, theory: n => { const k = Object.keys(RINGEL).map(Number); let a = 1, b = 8; for (const x of k) { if (x <= n) a = x; if (x >= n && b >= x) b = x; } return a === b ? RINGEL[a] : RINGEL[a] + (RINGEL[b] - RINGEL[a]) * (n - a) / (b - a); }, theoryLabel: "Ringelmann 1913", run: (x, r) => teamPull(x, {}, r).per, note: "Effort per person falls steadily as the team grows: coordination losses and social loafing." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "J587 2.2", text: "Mental preparation: imagery and mental rehearsal (picturing a successful performance), selective attention (focusing on relevant cues, ignoring the crowd) and positive thinking (self-talk) control anxiety and improve performance." },
      { lvl: "std", tag: "H555 2.2 (intro)", text: "Arousal is a state of physical and mental readiness. The inverted-U theory: performance improves as arousal rises to an optimum, then gets worse." },
      { lvl: "std", tag: "H555 2.2 (intro)", text: "Fine, complex skills (a putt) need low arousal; gross, simple skills (a tackle) need high arousal. Experts cope with higher arousal than beginners." },
      { lvl: "adv", tag: "H555 2.2", text: "Drive theory: performance = habit × drive; arousal increases the dominant response, good for experts, bad for beginners." },
      { lvl: "adv", tag: "H555 2.2", text: "Catastrophe theory: with high cognitive anxiety, going beyond the optimum causes a dramatic drop; recovery needs a large fall in arousal (hysteresis)." },
      { lvl: "adv", tag: "H555 2.2", text: "Zone of optimal functioning (Hanin): each performer has their own band of best arousal; performance plateaus within it." },
      { lvl: "adv", tag: "H555 2.2", text: "Social facilitation (Zajonc): an audience raises arousal, helping experts and hindering novices; evaluation apprehension makes it stronger." },
      { lvl: "adv", tag: "H555 2.2", text: "Ringelmann effect: individual effort falls as group size rises. Steiner: actual productivity = potential − losses due to faulty processes (coordination and motivation: social loafing)." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: "Describe how a footballer could use mental rehearsal before a penalty shoot-out.", ans: "<ul><li>picture themselves taking the penalty: run-up, contact, ball going in</li><li>rehearse it in their mind (seeing and feeling it) before stepping up</li><li>reduces anxiety / increases confidence, so they stay calm and focused</li></ul>" },
      { lvl: "std", marks: 2, q: "Explain why a golfer putting needs a lower level of arousal than a rugby player making a tackle.", ans: "<ul><li>putting is a fine skill needing precise control / concentration</li><li>high arousal causes tension and loss of fine control; a tackle is a gross skill using strength and aggression</li></ul>" },
      { lvl: "std", marks: 2, q: () => `In the simulation the athlete succeeded on ${attempts.filter(a => a.hit).length} of ${attempts.length} attempts. Calculate the success rate as a percentage.`, ans: () => `<ul><li>${attempts.filter(a => a.hit).length} ÷ ${Math.max(1, attempts.length)} × 100</li><li>= ${(100 * attempts.filter(a => a.hit).length / Math.max(1, attempts.length)).toFixed(0)}%</li></ul>` },
      { lvl: "adv", marks: 4, q: "Compare drive theory with the inverted-U theory of arousal.", ans: "<ul><li>drive: a linear relationship, more arousal always increases the dominant response</li><li>inverted-U: performance improves to an optimum then falls</li><li>drive explains why experts improve under pressure and novices get worse</li><li>inverted-U better explains why even experts choke at very high arousal</li></ul>" },
      { lvl: "adv", marks: 3, q: "Explain catastrophe theory, referring to cognitive anxiety.", ans: "<ul><li>when cognitive anxiety (worry) is high and somatic arousal passes the optimum</li><li>performance drops suddenly and dramatically</li><li>it recovers only if arousal falls well below the point of collapse (hysteresis)</li></ul>" },
      { lvl: "adv", marks: 3, q: "Suggest strategies a coach could use to reduce social loafing in a team.", ans: "<ul><li>make individual contributions identifiable (statistics, feedback)</li><li>set individual and team goals; build cohesion and responsibility</li><li>give each player a specific, valued role</li></ul>" }
    ]
  },
  notes: `<h3>What is being modelled</h3>
<ul><li><b>Inverted-U</b>: success = floor + (peak − floor) × e^(−½((A − A*) ÷ w)²). The optimum A* = 30 + 30 × grossness − 25 × complexity + 15 for an expert; width w = 18 (+10 for an expert); experts have a higher peak.</li>
<li><b>Drive theory</b>: a straight line, rising for experts and falling for beginners.</li>
<li><b>Catastrophe theory</b>: with cognitive anxiety C ≥ 30%, performance stays high until arousal passes A* + w(1.6 − 1.2C), then drops to near the floor and recovers only below that point − 40C.</li>
<li><b>ZOF</b>: best performance anywhere within ±8 of the athlete's zone centre, falling off outside it.</li>
<li><b>Competition</b>: arousal moves towards a level set by importance, the crowd and pressure rising through the match, with random changes; misses add arousal and worry. Each technique shifts arousal and cognitive anxiety when used, and keeps most of its effect for the rest of the match (selective attention also cuts the crowd's effect; imagery adds 3% confidence). Worry above 50 also lowers the chance of success.</li>
<li><b>Audience</b>: arousal rises with log₁₀(spectators + 1), more for an evaluating audience and an away crowd.</li>
<li><b>Groups</b>: effort per person = coordination factor × motivation factor; practice halves coordination losses, identifiability and cohesion reduce social loafing.</li>
<li>Every attempt succeeds or fails at random with the chance the theory gives.</li></ul>
<h3>Simplifications</h3>
<ul><li>The theories are drawn as clean curves; real athletes vary a lot from day to day, and the theories are argued about by psychologists.</li>
<li>Arousal is one number (with cognitive anxiety separate only for catastrophe theory and competitions).</li>
<li>The earlier version also had leadership (Fiedler), self-efficacy and attribution; they are not in this version.</li></ul>
<p>The earlier version of this simulation, with its worksheets, is kept in <a href="original/arousal-performance.html">original/arousal-performance.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {}, grp = {};
let g = ui.group("View");
ctl.mode = K.seg(g, { value: "arousal", options: [["arousal", "📈 Arousal"], ["comp", "🧘 Mental preparation"], ["aud", "👀 Audience"], ["group", "🤝 Groups"]], on: v => set({ mode: v }) });
grp.athlete = g = ui.group("The athlete");
ctl.skill = K.seg(g, { value: "pen", options: Object.entries(SKILLS).map(([k, s]) => [k, s.icon + " " + s.name.split(" (")[0]]), on: v => { P.skill = v; clearRun(); } });
ctl.expert = K.seg(g, { value: true, options: [[true, "Expert"], [false, "Beginner"]], on: v => { P.expert = v; clearRun(); } });
grp.theory = g = ui.group("Theory and arousal");
ctl.theory = K.seg(g, { value: "iu", options: [["iu", "Inverted-U"], ["drive", "Drive theory"], ["cat", "Catastrophe"], ["zof", "Zone (ZOF)"]], on: v => { P.theory = v; clearRun(); } });
ctl.cog = K.slider(g, { label: "Cognitive anxiety (worry)", min: 0, max: 1, step: 0.05, value: 0.5, fmt: v => Math.round(v * 100) + "%", on: v => { P.cog = v; clearRun(); } });
ctl.zone = K.slider(g, { label: "Centre of the athlete's zone", min: 15, max: 85, step: 1, value: 45, on: v => { P.zone = v; clearRun(); } });
ctl.auto = K.toggle(g, { label: "Arousal sweeps up and down by itself", value: true, on: v => P.auto = v });
ctl.A = K.slider(g, { label: "Arousal", min: 0, max: 100, step: 1, value: 40, on: v => { P.A = v; P.auto = false; ctl.auto.set(false); } });
K.btn(K.row(g), "Clear attempts", () => clearRun());
grp.comp = g = ui.group("The competition");
ctl.scen = K.seg(g, { value: "final", options: Object.entries(SCEN).map(([k, s]) => [k, s.name]), on: v => { P.scen = v; newComp(); } });
ctl.tech = K.seg(g, { label: "Technique", value: "none", options: Object.entries(TECH).map(([k, s]) => [k, s.name]), on: v => { P.tech = v; newComp(); } });
ctl.when = K.seg(g, { label: "When", value: "start", options: [["start", "before the start"], ["need", "when out of the zone"]], on: v => { P.when = v; newComp(); } });
K.btn(K.row(g), "↺ Play the competition again", () => newComp(), "primary");
grp.aud = g = ui.group("The audience");
ctl.aud = K.slider(g, { label: "Spectators", min: 0, max: 4.8, step: 0.1, value: 0, fmt: v => Math.round(Math.pow(10, v) - 1).toLocaleString(), on: v => { P.aud = v; clearRun(); } });
ctl.eval = K.toggle(g, { label: "Evaluating (scouts, coaches, judges)", value: true, on: v => { P.eval = v; clearRun(); } });
ctl.home = K.seg(g, { value: true, options: [[true, "Home crowd"], [false, "Away crowd"]], on: v => { P.home = v; clearRun(); } });
grp.group = g = ui.group("Tug of war");
ctl.n = K.slider(g, { label: "People in the team", min: 1, max: 8, step: 1, value: 4, on: v => { P.n = v; newTeam(); } });
ctl.ident = K.toggle(g, { label: "Each person's effort is measured (identifiable)", value: false, on: v => { P.ident = v; newTeam(); } });
ctl.cohesion = K.toggle(g, { label: "Task cohesion (shared goal)", value: false, on: v => { P.cohesion = v; newTeam(); } });
ctl.practice = K.toggle(g, { label: "Practised pulling together", value: false, on: v => { P.practice = v; newTeam(); } });
g = ui.group("Watch");
ctl.speed = K.slider(g, { label: "Speed", min: 0.5, max: 10, step: 0.5, value: 1, fmt: v => "× " + v, on: v => speed = v });
const read = K.readout(g, [["a", ""], ["b", ""], ["c", ""], ["d", ""]]);
const relabel = l => l.forEach((x, i) => read.el.children[i].firstElementChild.textContent = x);
function clearRun() { attempts = []; st = { collapsed: false }; t = 0; lastShot = -1; ctl.cog.el.style.display = P.theory === "cat" ? "" : "none"; ctl.zone.el.style.display = P.theory === "zof" ? "" : "none"; }
function newComp() { comp = competition(Object.assign({}, P), rnd); compK = 0; }
const NOISE0 = { gauss: () => 0 };   // no person-to-person variation for the live view
function newTeam() { team = teamPull(P.n, P, NOISE0); }
function arousalNow() { if (P.mode === "aud") return audArousal(Math.pow(10, P.aud) - 1, { base: P.base, eval: P.eval, home: P.home }); if (P.mode === "comp") return comp.out[Math.min(35, Math.floor(compK))].A; return P.auto ? 50 - 48 * Math.cos(t * 2 * Math.PI / 60) : P.A; }
function set(o) {
  Object.assign(P, { skill: "pen", expert: true, theory: "iu", cog: 0.5, zone: 45, auto: true, A: 40, scen: "final", tech: "none", when: "start", aud: 0, eval: true, home: true, n: 4, ident: false, cohesion: false, practice: false }, o);
  for (const k of ["cog", "zone", "A", "aud", "n"]) ctl[k].set(P[k]); for (const k of ["mode", "skill", "expert", "theory", "scen", "tech", "when", "home"]) ctl[k].set(P[k]); for (const k of ["auto", "eval", "ident", "cohesion", "practice"]) ctl[k].set(P[k]);
  grp.athlete.style.display = P.mode === "group" ? "none" : ""; grp.theory.style.display = P.mode === "arousal" ? "" : "none"; for (const k of ["comp", "aud", "group"]) grp[k].style.display = P.mode === k ? "" : "none";
  clearRun(); newComp(); newTeam(); speed = o.speed || 1; ctl.speed.set(speed);
  chA.opts.title = { arousal: "Success against arousal", comp: "Arousal and worry through the competition", aud: "Success against audience size", group: "Effort per person against team size" }[P.mode];
  chB.opts.title = { arousal: "Arousal over time", comp: "Chance of success on each attempt", aud: "Arousal against audience size", group: "Steiner's model" }[P.mode];
  relabel({ arousal: ["arousal", "chance of success now", "attempts", "success rate so far"], comp: ["attempt", "arousal", "worry (cognitive anxiety)", "success rate"], aud: ["spectators", "arousal", "chance of success", "success rate so far"], group: ["team size", "team pull", "effort per person", "lost: coordination · loafing"] }[P.mode]);
  // A level only: catastrophe and ZOF, two techniques
  const adv = ui.level === "adv"; ctl.theory.el.querySelectorAll("button")[2].style.display = ctl.theory.el.querySelectorAll("button")[3].style.display = adv ? "" : "none";
  Object.keys(TECH).forEach((k, i) => ctl.tech.el.querySelectorAll("button")[i].style.display = TECH[k].std || adv ? "" : "none");
}
ui.onLevel = () => set({ mode: P.mode });

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const T = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function athlete(c, x, y, A, cog) {
  // a simple figure: heart rate, sweat and (with worry) a thought bubble
  const hr = Math.round(60 + 1.3 * A), shake = A > 75 ? (A - 75) * 0.15 * Math.sin(performance.now() / 30) : 0;
  c.strokeStyle = "#eef2f8"; c.lineWidth = 5; c.lineCap = "round"; c.beginPath(); c.arc(x + shake, y - 92, 14, 0, 6.3); c.stroke();
  c.beginPath(); c.moveTo(x + shake, y - 78); c.lineTo(x, y - 30); c.moveTo(x, y - 30); c.lineTo(x - 16, y); c.moveTo(x, y - 30); c.lineTo(x + 18, y); c.moveTo(x, y - 65); c.lineTo(x - 20, y - 45); c.moveTo(x, y - 65); c.lineTo(x + 22, y - 50); c.stroke();
  if (A > 60) { c.fillStyle = "#5ab0ff"; for (let k = 0; k < Math.round((A - 60) / 10); k++) { c.beginPath(); c.arc(x - 18 + k * 9, y - 100 + ((performance.now() / 20 + k * 13) % 30), 2.5, 0, 6.3); c.fill(); } }
  T(c, `♥ ${hr}`, x + 30, y - 98, A > 70 ? "#ff5d6c" : "#ff8a70", "left", "600 14px");
  if (cog > 0.45) { c.fillStyle = "rgba(255,255,255,0.12)"; c.beginPath(); c.ellipse(x - 70, y - 140, 52, 22, 0, 0, 6.3); c.fill(); T(c, cog > 0.75 ? "Don't miss!!" : "What if I miss?", x - 70, y - 136, "#ffd166", "center", "11.5px"); }
}
function drawTarget(c, x, y, skill) { c.strokeStyle = "#eef2f8"; c.lineWidth = 3; if (skill === "putt") { c.fillStyle = "#2c6b33"; c.beginPath(); c.ellipse(x, y, 60, 12, 0, 0, 6.3); c.fill(); c.fillStyle = "#000"; c.beginPath(); c.ellipse(x, y, 8, 3, 0, 0, 6.3); c.fill(); } else if (skill === "free") { c.beginPath(); c.moveTo(x + 30, y - 150); c.lineTo(x + 30, y); c.stroke(); c.strokeStyle = "#ff8a3d"; c.beginPath(); c.ellipse(x, y - 110, 18, 5, 0, 0, 6.3); c.stroke(); } else { c.strokeRect(x - 40, y - 60, 80, 60); } }
function drawArousal(c, w, h, A, cog) {
  const gy = h - 60, ax = w * 0.3, tx = w * 0.7, S = SKILLS[P.skill];
  c.fillStyle = "#16301c"; c.fillRect(0, gy, w, h - gy); athlete(c, ax, gy, A, cog); drawTarget(c, tx, gy, P.skill);
  if (ball) { const f = Math.min(1, ball.f), bx = ax + 30 + (tx + ball.off - ax - 30) * f, by = gy - 20 - Math.sin(Math.PI * f) * (P.skill === "putt" ? 5 : 120) + (P.skill === "free" ? -90 * f : 0); c.fillStyle = "#fff"; c.beginPath(); c.arc(bx, by, 7, 0, 6.3); c.fill(); if (ball.f > 1.05) T(c, ball.hit ? "✓" : "✗", tx, gy - 170, ball.hit ? "#7fe3a0" : "#ff5d6c", "center", "700 28px"); }
  // the arousal meter
  const mx = 30, my = 40, mw = Math.min(300, w * 0.35); const gr = c.createLinearGradient(mx, 0, mx + mw, 0); gr.addColorStop(0, "#5ab0ff"); gr.addColorStop(0.5, "#7fe3a0"); gr.addColorStop(1, "#ff5d6c"); c.fillStyle = gr; c.fillRect(mx, my, mw, 12);
  c.fillStyle = "#fff"; c.beginPath(); c.moveTo(mx + mw * A / 100, my - 4); c.lineTo(mx + mw * A / 100 - 6, my - 12); c.lineTo(mx + mw * A / 100 + 6, my - 12); c.fill(); T(c, "calm", mx, my + 28, "#5ab0ff"); T(c, "panic", mx + mw, my + 28, "#ff5d6c", "right"); T(c, `arousal ${Math.round(A)}`, mx + mw / 2, my + 28, "#eef2f8", "center", "600 12px");
  T(c, `${S.icon} ${S.name} · ${P.expert ? "expert" : "beginner"}`, mx, my + 56, "#aab6cc", "left", "12.5px");
  if (st.collapsed) T(c, "CATASTROPHE: performance has collapsed", w / 2, my + 90, "#ff5d6c", "center", "700 16px");
}
function drawGroup(c, w, h) {
  const n = P.n, gy = h * 0.6, rx = w * 0.15; c.strokeStyle = "#c9a96a"; c.lineWidth = 6; c.beginPath(); c.moveTo(rx - 40, gy - 40); c.lineTo(w - 80, gy - 40); c.stroke();
  for (let i = 0; i < n; i++) { const x = rx + i * Math.min(80, (w * 0.6) / n), eff = team.per / 100 * (1 + 0.04 * Math.sin(performance.now() / 300 + i)); c.strokeStyle = "#eef2f8"; c.lineWidth = 4; c.beginPath(); c.arc(x, gy - 80, 10, 0, 6.3); c.stroke(); c.beginPath(); c.moveTo(x, gy - 70); c.lineTo(x - 12, gy - 30); c.lineTo(x - 22, gy); c.moveTo(x - 12, gy - 30); c.lineTo(x, gy); c.moveTo(x - 4, gy - 55); c.lineTo(x + 14, gy - 40); c.stroke();
    c.fillStyle = "rgba(255,255,255,0.1)"; c.fillRect(x - 14, gy - 150, 10, 50); c.fillStyle = eff > 0.8 ? "#7fe3a0" : eff > 0.6 ? "#ffd166" : "#ff8a70"; c.fillRect(x - 14, gy - 100 - 50 * Math.min(1, eff), 10, 50 * Math.min(1, eff)); }
  c.fillStyle = "#56607a"; c.fillRect(w - 80, gy - 70, 50, 60); T(c, "force meter", w - 55, gy, "#aab6cc", "center", "11px"); T(c, `${(n * team.per / 100 * 500).toFixed(0)} N`, w - 55, gy - 80, "#ffd166", "center", "600 15px");
  T(c, `${n} pulling: each at ${team.per.toFixed(0)}% of their solo effort`, 30, 40, "#eef2f8", "left", "600 15px"); T(c, "bars: effort of each person", 30, 62, "#aab6cc");
}
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h);
  if (P.mode === "group") return drawGroup(c, w, h);
  const A = arousalNow(), cog = P.mode === "comp" ? comp.out[Math.min(35, Math.floor(compK))].C / 100 : P.theory === "cat" ? P.cog : 0.2;
  drawArousal(c, w, h, A, ui.level === "adv" || P.mode === "comp" ? cog : 0);
  if (P.mode === "comp") T(c, `${SCEN[P.scen].name} · attempt ${Math.min(36, Math.floor(compK) + 1)} of 36 · technique: ${TECH[P.tech].name}`, w - 20, h - 20, "#eef2f8", "right", "600 12.5px");
  if (P.mode === "aud") { const n = Math.round(Math.pow(10, P.aud) - 1), shown = Math.min(400, n); for (let i = 0; i < shown; i++) { c.fillStyle = `hsl(${(i * 47) % 360},40%,${P.home ? 55 : 35}%)`; c.fillRect(20 + (i * 37) % (w - 40), 110 + ((i * 53) % 60), 4, 6); } T(c, `${n.toLocaleString()} watching${P.eval ? " (evaluating)" : ""}`, w - 20, 100, "#aab6cc", "right"); }
}

// ---------------- The loop ----------------
let frame = 0;
ui.run(dt => {
  if (!(dt > 0)) return; const s = dt * speed; t += s; if (ball) ball.f += s * 1.6;
  if (P.mode === "comp") { const prev = Math.floor(compK); compK = Math.min(35.99, compK + s * 0.5); if (Math.floor(compK) !== prev) { const a = comp.out[Math.floor(compK)]; ball = { f: 0, hit: a.hit, off: a.hit ? 0 : (rnd() < 0.5 ? -1 : 1) * (30 + 40 * rnd()) }; } return; }
  if (P.mode === "group") return;
  const k = Math.floor(t / 2); if (k !== lastShot) { lastShot = k; const A = arousalNow(), o = Object.assign({}, P); const p = success(A, o, st), hit = rnd() < p; attempts.push({ t, A, p, hit }); if (attempts.length > 400) attempts.shift(); ball = { f: 0, hit, off: hit ? 0 : (rnd() < 0.5 ? -1 : 1) * (30 + 40 * rnd()) }; }
}, () => {
  draw(); if (frame++ % 5) return;
  if (P.mode === "arousal" || P.mode === "aud") {
    const o = Object.assign({}, P), curve = []; for (let A = 0; A <= 100; A += 2) curve.push([A, 100 * success(A, o, null)]);
    const A = arousalNow(), bins = []; for (let b = 0; b < 10; b++) { const s2 = attempts.filter(a => a.A >= b * 10 && a.A < b * 10 + 10); if (s2.length >= 3) bins.push([b * 10 + 5, 100 * s2.filter(a => a.hit).length / s2.length]); }
    if (P.mode === "arousal") {
      chA.opts.xLabel = "arousal"; chA.opts.yLabel = "success (%)"; chB.opts.xLabel = "time (s)"; chB.opts.yLabel = "arousal";
      chA.draw([{ pts: curve, color: "#7d8aa5", dash: [5, 4], label: P.theory === "cat" ? "theory (no collapse)" : "theory" }, { pts: bins, type: "dots", color: "#ffd166", r: 5, label: "your attempts" }, { pts: [[A, 100 * success(A, o, null)]], type: "dots", color: "#fff", r: 4 }], { xMin: 0, xMax: 100, yMin: 0, yMax: 100 });
      chB.draw([{ pts: attempts.map(a => [a.t, a.A]), color: "#ff8a70", label: "arousal" }, { pts: attempts.filter(a => a.hit).map(a => [a.t, a.A]), type: "dots", color: "#7fe3a0", r: 3, label: "success" }, { pts: attempts.filter(a => !a.hit).map(a => [a.t, a.A]), type: "dots", color: "#ff5d6c", r: 3, label: "miss" }], { yMin: 0, yMax: 100 });
    } else {
      const ex = [], be = []; for (let x = 0; x <= 4.8; x += 0.2) { const Aa = audArousal(Math.pow(10, x) - 1, P); ex.push([x, 100 * success(Aa, Object.assign({}, P, { expert: true, theory: "iu" }), null)]); be.push([x, 100 * success(Aa, Object.assign({}, P, { expert: false, theory: "iu" }), null)]); }
      chA.opts.xLabel = "audience (log₁₀ of spectators + 1)"; chA.opts.yLabel = "success (%)"; chB.opts.xLabel = "audience (log₁₀ of spectators + 1)"; chB.opts.yLabel = "arousal";
      chA.draw([{ pts: ex, color: "#7fe3a0", label: "expert (facilitation)" }, { pts: be, color: "#ff8a70", label: "beginner (inhibition)" }], { xMin: 0, xMax: 4.8, yMin: 0, yMax: 100, vlines: [{ x: P.aud, color: "#fff" }] });
      const ar = []; for (let x = 0; x <= 4.8; x += 0.2) ar.push([x, audArousal(Math.pow(10, x) - 1, P)]); chB.draw([{ pts: ar, color: "#ffd166", label: "arousal" }], { xMin: 0, xMax: 4.8, yMin: 0, yMax: 100, hlines: [{ y: curveParams(P).opt, color: "#7fe3a0", label: "this athlete's optimum" }] });
    }
    const hits = attempts.filter(a => a.hit).length; read.set("a", Math.round(A)); read.set("b", Math.round(100 * success(A, P, null)) + "%"); read.set("c", P.mode === "aud" ? Math.round(Math.pow(10, P.aud) - 1).toLocaleString() : attempts.length); read.set(P.mode === "aud" ? "b" : "b", Math.round(100 * success(A, P, null)) + "%"); read.set("d", attempts.length ? Math.round(100 * hits / attempts.length) + "%" : "–");
    if (P.mode === "aud") { read.set("a", Math.round(Math.pow(10, P.aud) - 1).toLocaleString()); read.set("b", Math.round(A)); read.set("c", Math.round(100 * success(A, P, null)) + "%"); }
    ui.hud(`arousal <b>${Math.round(A)}</b> · optimum about ${Math.round(curveParams(P).opt)}<br>${A < curveParams(P).opt - 15 ? "under-aroused: flat, unfocused" : A > curveParams(P).opt + 15 ? "over-aroused: tense, anxious" : "in the zone"}`);
  } else if (P.mode === "comp") {
    const k = Math.floor(compK), O = comp.out.slice(0, k + 1), opt = curveParams(P).opt; chA.opts.xLabel = "attempt"; chA.opts.yLabel = "0–100"; chB.opts.xLabel = "attempt"; chB.opts.yLabel = "chance of success (%)";
    chA.draw([{ pts: O.map(a => [a.k + 1, a.A]), color: "#ff8a70", label: "arousal" }, { pts: O.map(a => [a.k + 1, a.C]), color: "#c58cff", dash: [5, 4], label: "worry" }], { xMin: 1, xMax: 36, yMin: 0, yMax: 100, hlines: [{ y: opt + 12, color: "#7fe3a0", label: "" }, { y: opt - 12, color: "#7fe3a0", label: "the athlete's zone" }] });
    chB.draw([{ pts: O.map(a => [a.k + 1, 100 * a.p]), type: "bars", w: 0.7, color: "#5ab0ff", label: "chance" }, { pts: O.filter(a => a.hit).map(a => [a.k + 1, 100 * a.p + 4]), type: "dots", color: "#7fe3a0", r: 3, label: "scored" }], { xMin: 0.5, xMax: 36.5, yMin: 0, yMax: 105 });
    const a = comp.out[k], hits = O.filter(x => x.hit).length; read.set("a", (k + 1) + " of 36"); read.set("b", Math.round(a.A)); read.set("c", Math.round(a.C)); read.set("d", Math.round(100 * hits / O.length) + "%");
    ui.hud(`arousal ${Math.round(a.A)} · zone ${Math.round(opt - 12)}–${Math.round(opt + 12)}<br>${hits} of ${O.length} scored`);
  } else {
    const per = [], pot = []; for (let n = 1; n <= 8; n++) per.push([n, teamPull(n, P, NOISE0).per]); chA.opts.xLabel = "people"; chA.opts.yLabel = "effort per person (%)"; chB.opts.xLabel = ""; chB.opts.yLabel = "team pull (N)";
    chA.draw([{ pts: per, color: "#ffd166", label: "this team" }, { pts: Object.entries(RINGEL).map(([n, v]) => [+n, v]), type: "dots", color: "#ff8a70", r: 5, label: "Ringelmann 1913" }], { xMin: 1, xMax: 8, yMin: 0, yMax: 110 });
    const potN = P.n * 500, coordL = potN * (1 - team.coord / 100), act = P.n * team.per / 100 * 500;
    chB.opts.xFmt = whole(v => ["", "potential", "− coordination", "− motivation", "= actual"][Math.round(v)] || ""); chB.draw([{ pts: [[1, potN]], type: "bars", w: 0.6, color: "#7fe3a0", label: "potential" }, { pts: [[2, coordL]], type: "bars", w: 0.6, color: "#ff8a70", label: "losses" }, { pts: [[3, Math.max(0, potN - coordL - act)]], type: "bars", w: 0.6, color: "#ff5d6c" }, { pts: [[4, act]], type: "bars", w: 0.6, color: "#ffd166", label: "actual" }], { xMin: 0.5, xMax: 4.5, yMin: 0 });
    read.set("a", P.n); read.set("b", act.toFixed(0) + " N"); read.set("c", team.per.toFixed(0) + "%"); read.set("d", `${(100 - team.coord).toFixed(0)}% · ${(100 - team.loaf).toFixed(0)}%`);
    ui.hud(`Steiner: actual = potential − coordination losses − motivation losses`);
  }
  if (P.mode !== "group") chB.opts.xFmt = null;
});
set({});
ui.tip("The athlete attempts the skill every 2 seconds · switch views at the top of the controls", 7000);
