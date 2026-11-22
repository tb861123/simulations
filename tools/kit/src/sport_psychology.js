/* =====================================================================
   MOTIVATION, CONFIDENCE AND LEADERSHIP
   Three models from sport psychology, each turned into numbers:
     ATTRIBUTION (Weiner)  after each result an athlete explains it: ability or
                    effort (INTERNAL) or luck or task difficulty (EXTERNAL);
                    lasting (STABLE) or changeable (UNSTABLE). Blaming lack of
                    ability for losses and luck for wins leads to LEARNED
                    HELPLESSNESS. SELF-EFFICACY (Bandura) is built from
                    performance accomplishments, vicarious experience, verbal
                    persuasion and control of emotional arousal.
     ACHIEVEMENT MOTIVATION (Atkinson and McClelland)  each person has a need
                    to achieve (NAch) and a need to avoid failure (NAF). The pull
                    towards a task with chance of success Pₛ is
                       (NAch − NAF) × Pₛ × (1 − Pₛ)
                    so high achievers seek 50:50 challenges and failure-avoiders
                    pick very easy or impossible ones.
     LEADERSHIP     Chelladurai: performance and satisfaction are best when the
                    leader's ACTUAL behaviour matches what the situation REQUIRES
                    and what the members PREFER. Fiedler: task-orientated leaders
                    suit very favourable or very unfavourable situations,
                    person-orientated leaders moderately favourable ones.
   ===================================================================== */
// ---- 1. A season: 30 matches ----
const STYLES = { serving: "Self-serving (wins: ability; losses: bad luck)", helpless: "Learned helplessness (wins: luck; losses: no ability)", mastery: "Mastery (wins: ability; losses: not enough effort)" };
// how each style explains a result: [locus, stability]
const ATTR = { serving: { win: ["internal", "stable", "ability"], loss: ["external", "unstable", "luck"] }, helpless: { win: ["external", "unstable", "luck"], loss: ["internal", "stable", "ability"] }, mastery: { win: ["internal", "stable", "ability"], loss: ["internal", "unstable", "effort"] } };
function season(o, r, n = 30) {
  let se = o.se0, drop = null, low = 0; const out = [];
  for (let m = 1; m <= n; m++) {
    const effort = Math.max(0.2, Math.min(1.2, 0.4 + 0.6 * se + 0.2 * o.goals)), perf = o.skill + 0.35 * (effort - 0.7) + 0.3 * r.gauss(), win = perf > o.opp;   // effort follows confidence and good goals
    const a = ATTR[o.style][win ? "win" : "loss"];
    // self-efficacy: performance accomplishments count most when put down to internal, stable causes
    let d = win ? (a[0] === "internal" ? 0.05 : 0.015) : (a[2] === "ability" ? -0.055 : a[2] === "effort" ? -0.02 : -0.03);
    d += (o.vicarious ? 0.006 : 0) + (o.persuasion ? 0.006 : 0) + (o.arousal ? 0.004 : 0) - 0.04 * (se - 0.5);   // the other three sources, and a pull back towards normal
    se = Math.max(0, Math.min(1, se + d)); low = se < 0.2 ? low + 1 : 0; if (low >= 4 && drop === null) drop = m;
    out.push({ m, win, perf, se, effort, attr: a });
    if (drop !== null) break;
  }
  return { out, drop, wins: out.filter(q => q.win).length };
}
// ---- 2. Achievement motivation ----
const tendency = (nach, naf, ps) => (nach - naf) * ps * (1 - ps);
// an athlete chooses the opponent (chance of winning) that maximises their tendency, with a little noise
function choose(nach, naf, r) { let best = 0.5, bv = -1e9; for (let ps = 0.05; ps <= 0.951; ps += 0.05) { const v = tendency(nach, naf, ps) + 0.01 * r.gauss(); if (v > bv) { bv = v; best = ps; } } return best; }
// ---- 3. Leadership ----
// Chelladurai: style on a scale 0 (democratic, person-centred) to 1 (autocratic, task-centred)
const chel = (actual, required, preferred) => ({ perf: 100 - 120 * Math.abs(actual - required), sat: 100 - 120 * Math.abs(actual - preferred) });
// Fiedler: favourableness 1 (very unfavourable) to 8 (very favourable); performance of task- and person-orientated leaders
const fiedlerTask = f => 70 + 20 * Math.abs(f - 4.5) / 3.5, fiedlerPerson = f => 90 - 20 * Math.abs(f - 4.5) / 3.5;

// ---------------- The page ----------------
const DEF = { view: "season", style: "serving", skill: 0.5, opp: 0.5, se0: 0.6, vicarious: false, persuasion: false, arousal: false, goals: 0.5, nach: 0.8, naf: 0.3, actual: 0.5, required: 0.6, preferred: 0.4, fav: 6 };
const P = Object.assign({}, DEF); let S = null, k = 0, seed = 1;
const ui = K.app({
  title: "Motivation, Confidence and Leadership", subject: "Physical Education",
  blurb: "A season of wins and losses explained by attribution and self-efficacy, achievement motivation and the challenges athletes choose, and leaders who fit (or do not fit) their team",
  reset: () => set({ view: P.view }),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "OCR GCSE (9–1) Physical Education (J587) 2.2 Sports psychology: mental preparation, goal setting (SMART targets), types of guidance and feedback, intrinsic and extrinsic motivation and confidence.", adv: "OCR A level Physical Education (H555) 2.2 Sport psychology: achievement motivation theory (Atkinson and McClelland: NAch and NAF, probability and incentive value of success), attribution theory (Weiner's model, learned helplessness, attribution retraining), self-efficacy and confidence (Bandura's four sources, Vealey), goal setting (SMARTER), leadership (Chelladurai's multidimensional model; Fiedler's contingency model)." } },
  missions: [
    { title: "Goals that work", q: "Season view. Compare vague goals (low) with SMART goals (high). How do effort, confidence and results change?", hint: "Specific, measurable, achievable goals focus attention and effort and give clear evidence of progress, so confidence and performance rise. 'Do your best' is not a goal.", setup() { set({ view: "season", goals: 0.1 }); } },
    { title: "Sources of confidence", q: "A struggling athlete (low starting confidence). Switch on vicarious experience, verbal persuasion and arousal control one at a time. Which helps most?", hint: "Performance accomplishments matter most, but watching a similar person succeed, encouragement from the coach and controlling nerves all add. Together they can stop a downward spiral.", setup() { set({ view: "season", se0: 0.3, opp: 0.55 }); } },
    { lvl: "adv", title: "Learned helplessness", q: "Same athlete, same opponents: compare the self-serving style with learned helplessness. What happens to confidence, effort and whether the athlete keeps playing?", hint: "Blaming losses on a lack of ability (internal, stable) and wins on luck makes failure feel permanent: effort and self-efficacy fall, results get worse, and the athlete may drop out. The self-serving style protects confidence.", setup() { set({ view: "season", style: "helpless", opp: 0.55 }); } },
    { lvl: "adv", title: "Attribution retraining", q: "Now the mastery style: losses are put down to effort (internal, unstable). Why is this better for long-term motivation?", hint: "Effort can be changed, so a loss becomes something to work on, not proof of failure. Coaches retrain attributions from 'I'm no good' to 'I didn't prepare well enough'.", setup() { set({ view: "season", style: "mastery", opp: 0.55 }); } },
    { lvl: "adv", title: "Who wants a close game?", q: "Achievement motivation. Compare a high achiever (NAch 0.8, NAF 0.2) with a failure-avoider (NAch 0.2, NAF 0.8). Which opponents do they choose?", hint: "The high achiever seeks a 50:50 challenge, where success means most. The failure-avoider picks a sure win or a hopeless task, where failure carries no shame. Coaches can build NAch by setting achievable challenges and rewarding effort.", setup() { set({ view: "ach", nach: 0.8, naf: 0.2 }); } },
    { lvl: "adv", title: "The right leader", q: "Leadership. A team in a crisis (very unfavourable situation) and a settled, successful team. Which leader suits each? Then match a coach to what the players prefer.", hint: "Fiedler: task-orientated leaders do best when the situation is very favourable or very unfavourable; person-orientated leaders in between. Chelladurai: performance needs actual behaviour to match what is required; satisfaction needs it to match what players prefer.", setup() { set({ view: "lead", fav: 1 }); } }
  ],
  batch: [
    { title: "Goal setting and wins", question: "How many of 30 matches does an athlete win with goals of different quality?", how: "Evenly matched opponents; self-serving attributions; 0 = vague, 1 = fully SMART.", xLabel: "goal quality", yLabel: "wins out of 30", xs: [0, 0.25, 0.5, 0.75, 1], reps: 10, yMin: 0, run: (gq, r) => season(Object.assign({}, DEF, { goals: gq }), r).wins, note: "Better goals raise effort and confidence: more wins on average, but every season has luck in it too." },
    { lvl: "adv", title: "Attribution style and dropping out", question: "What share of struggling athletes drop out within a season, for each attribution style?", how: "Slightly stronger opponents; starting confidence 0.5. 1 self-serving, 2 learned helplessness, 3 mastery.", xLabel: "style (1 self-serving, 2 helpless, 3 mastery)", yLabel: "% dropping out", xs: [1, 2, 3], reps: 40, yMin: 0, yMax: 100, run: (i, r) => season(Object.assign({}, DEF, { style: ["serving", "helpless", "mastery"][i - 1], opp: 0.6, se0: 0.5 }), r).drop !== null ? 100 : 0, note: "Learned helplessness makes dropping out far more likely: losses feel permanent and personal." },
    { title: "Sources of self-efficacy", question: "How confident is a struggling athlete after a season, with 0 to 3 extra sources of self-efficacy?", how: "Starting confidence 0.3; sources added in order: vicarious experience, verbal persuasion, arousal control.", xLabel: "extra sources", yLabel: "self-efficacy after the season", xs: [0, 1, 2, 3], reps: 15, yMin: 0, yMax: 1, run: (n, r) => { const R = season(Object.assign({}, DEF, { se0: 0.3, opp: 0.55, vicarious: n >= 1, persuasion: n >= 2, arousal: n >= 3 }), r); return R.out[R.out.length - 1].se; }, note: "Each source helps a little; performance accomplishments (winning and owning it) remain the most powerful." },
    { lvl: "adv", title: "Atkinson: tendency against chance of success", question: "How attractive is a task with each chance of success, for a high achiever?", how: "NAch 0.8, NAF 0.2; ±0.005 variation between people.", xLabel: "chance of success Pₛ", yLabel: "tendency to approach", xs: [0.1, 0.3, 0.5, 0.7, 0.9], reps: 5, theory: ps => tendency(0.8, 0.2, ps), theoryLabel: "(NAch − NAF) Pₛ(1 − Pₛ)", run: (ps, r) => tendency(0.8, 0.2, ps) + 0.005 * r.gauss(), note: "Greatest at Pₛ = 0.5: a real challenge. For a failure-avoider the curve turns upside down." },
    { lvl: "adv", title: "Fiedler: which leader when?", question: "How much better does a task-orientated leader do than a person-orientated one, at each level of favourableness?", how: "Team performance score; ±3 points of match-to-match noise.", xLabel: "favourableness (1 very unfavourable – 8 very favourable)", yLabel: "task − person leader", xs: [1, 2, 3, 4, 5, 6, 7, 8], reps: 6, theory: f => fiedlerTask(f) - fiedlerPerson(f), theoryLabel: "Fiedler", run: (f, r) => fiedlerTask(f) - fiedlerPerson(f) + 3 * r.gauss(), note: "Task-orientated leaders win at the extremes; person-orientated leaders in the middle." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "J587 2.2", text: "SMART goals: specific, measurable, achievable, realistic, time-bound. Goals increase motivation and focus, and show progress." },
      { lvl: "std", tag: "J587 2.2", text: "Intrinsic motivation comes from within (enjoyment, pride); extrinsic from outside (trophies, praise, money). Confidence grows from success and encouragement." },
      { lvl: "adv", tag: "H555 2.2", text: "Achievement motivation (Atkinson and McClelland): NAch (need to achieve) against NAF (need to avoid failure). High NAch: seek challenge (Pₛ ≈ 0.5), persist, take risks. High NAF: avoid 50:50 tasks, give up, fear evaluation." },
      { lvl: "adv", tag: "H555 2.2", text: "Weiner's attribution model: locus of causality (internal/external) × stability (stable/unstable): ability, effort, task difficulty, luck. Learned helplessness: failure attributed to internal, stable causes. Attribution retraining: attribute failure to effort or tactics." },
      { lvl: "adv", tag: "H555 2.2", text: "Bandura's self-efficacy: performance accomplishments (strongest), vicarious experiences, verbal persuasion, emotional arousal. Vealey: sport confidence from trait confidence, competitive orientation and the situation." },
      { lvl: "adv", tag: "H555 2.2", text: "Leadership: Chelladurai's multidimensional model (required, actual and preferred behaviour → performance and satisfaction). Fiedler: task-orientated for very favourable or unfavourable situations, person-orientated for moderate ones." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: "Explain how setting SMART goals can improve performance.", ans: "<ul><li>specific and measurable goals focus attention and effort</li><li>achievable goals build confidence when met</li><li>time-bound goals give deadlines and show progress, keeping motivation high</li></ul>" },
      { lvl: "adv", marks: 4, q: "Explain how a coach could use attribution retraining with a player showing learned helplessness.", ans: "<ul><li>the player attributes failure to internal, stable causes (lack of ability)</li><li>coach encourages attributions to controllable, unstable causes (effort, tactics)</li><li>and attributes success to internal stable causes (ability)</li><li>this raises self-efficacy and persistence</li></ul>" },
      { lvl: "adv", marks: 3, q: () => `A high achiever has NAch = ${P.nach.toFixed(1)} and NAF = ${P.naf.toFixed(1)}. Use Atkinson's model to explain which opponent they prefer.`, ans: () => `<ul><li>tendency = (NAch − NAF) × Pₛ × (1 − Pₛ) = ${(P.nach - P.naf).toFixed(1)} × Pₛ(1 − Pₛ)</li><li>${P.nach > P.naf ? "positive, greatest when Pₛ = 0.5" : "negative: least unattractive at very high or very low Pₛ"}</li><li>${P.nach > P.naf ? "so they choose evenly matched opponents" : "so they choose sure wins or hopeless matches"}</li></ul>` }
    ]
  },
  notes: `<h3>The models</h3>
<ul><li><b>Season:</b> performance = skill + 0.35 × (effort − 0.7) + luck (SD 0.3); a win if it beats the opponent's level. Effort = 0.4 + 0.6 × self-efficacy + 0.2 × goal quality. After each match self-efficacy changes by the result and how it is explained (internal attributions for wins +0.05, external +0.015; losses put down to ability −0.055, to luck −0.03, to effort −0.02), plus small boosts from vicarious experience, persuasion and arousal control (+0.006, +0.006, +0.004 a match), and a pull of 4% a match back towards 0.5. Four matches in a row below 0.2 means dropping out.</li>
<li><b>Achievement motivation:</b> tendency = (NAch − NAF) × Pₛ × (1 − Pₛ); each athlete chooses the opponent with the highest tendency.</li>
<li><b>Chelladurai:</b> performance = 100 − 120 × |actual − required|; satisfaction = 100 − 120 × |actual − preferred| (style from 0 democratic to 1 autocratic). <b>Fiedler:</b> task-orientated 70 + 20 × distance from the middle; person-orientated the reverse.</li></ul>
<h3>Simplifications</h3><ul><li>These are teaching versions of psychological theories: the numbers show the shape of each idea, not measured effects.</li><li>Personality, aggression, social facilitation and group cohesion are in other simulations (Arousal, Anxiety and Performance) or left out.</li></ul>`
});

// ---------------- Controls ----------------
const ctl = {}; let g = ui.group("View");
ctl.view = K.seg(g, { value: "season", options: [["season", "🏆 A season"], ["ach", "🎯 Achievement motivation"], ["lead", "🧭 Leadership"]], on: v => set({ view: v }) });
const gp = {}; gp.season = g = ui.group("The athlete");
ctl.style = K.seg(g, { label: "Attribution style", value: "serving", options: Object.entries(STYLES).map(([k2, s]) => [k2, s.split(" (")[0]]), on: v => { P.style = v; rerun(); } });
ctl.skill = K.slider(g, { label: "Skill", min: 0.2, max: 0.8, step: 0.05, value: 0.5, on: v => { P.skill = v; rerun(); } });
ctl.opp = K.slider(g, { label: "Strength of opponents", min: 0.2, max: 0.8, step: 0.05, value: 0.5, on: v => { P.opp = v; rerun(); } });
ctl.se0 = K.slider(g, { label: "Self-efficacy at the start", min: 0.1, max: 0.9, step: 0.05, value: 0.6, on: v => { P.se0 = v; rerun(); } });
ctl.goals = K.slider(g, { label: "Goal quality", min: 0, max: 1, step: 0.05, value: 0.5, fmt: v => v < 0.3 ? "vague ('do your best')" : v > 0.75 ? "SMART" : "partly SMART", on: v => { P.goals = v; rerun(); } });
ctl.vicarious = K.toggle(g, { label: "Vicarious experience (sees a similar player succeed)", value: false, on: v => { P.vicarious = v; rerun(); } });
ctl.persuasion = K.toggle(g, { label: "Verbal persuasion (coach's encouragement)", value: false, on: v => { P.persuasion = v; rerun(); } });
ctl.arousal = K.toggle(g, { label: "Emotional arousal control (stress management)", value: false, on: v => { P.arousal = v; rerun(); } });
gp.ach = g = ui.group("Achievement motivation");
ctl.nach = K.slider(g, { label: "Need to achieve (NAch)", min: 0, max: 1, step: 0.05, value: 0.8, on: v => P.nach = v });
ctl.naf = K.slider(g, { label: "Need to avoid failure (NAF)", min: 0, max: 1, step: 0.05, value: 0.3, on: v => P.naf = v });
gp.lead = g = ui.group("Leadership");
ctl.fav = K.slider(g, { label: "Favourableness of the situation (Fiedler)", min: 1, max: 8, step: 1, value: 6, fmt: v => v + (v <= 2 ? " (crisis)" : v >= 7 ? " (settled, successful)" : ""), on: v => P.fav = v });
ctl.required = K.slider(g, { label: "Behaviour the situation requires", min: 0, max: 1, step: 0.05, value: 0.6, fmt: v => v < 0.35 ? "democratic" : v > 0.65 ? "autocratic" : "mixed", on: v => P.required = v });
ctl.preferred = K.slider(g, { label: "Behaviour the players prefer", min: 0, max: 1, step: 0.05, value: 0.4, fmt: v => v < 0.35 ? "democratic" : v > 0.65 ? "autocratic" : "mixed", on: v => P.preferred = v });
ctl.actual = K.slider(g, { label: "The coach's actual behaviour", min: 0, max: 1, step: 0.05, value: 0.5, fmt: v => v < 0.35 ? "democratic" : v > 0.65 ? "autocratic" : "mixed", on: v => P.actual = v });
K.btn(K.row(ui.group("")), "🎲 Play the season again", () => { seed++; rerun(); }, "primary");
const read = K.readout(ui.group("Results"), [["a", "–"], ["b", "–"], ["c", "–"], ["d", "–"]]);
const label = (i, s) => { read.el.children[i].firstElementChild.textContent = s; };
function sync() { ctl.view.set(P.view); for (const q in gp) gp[q].style.display = q === P.view ? "" : "none"; ctl.style.set(P.style); for (const q of ["skill", "opp", "se0", "goals", "nach", "naf", "fav", "required", "preferred", "actual"]) ctl[q].set(P[q]); for (const q of ["vicarious", "persuasion", "arousal"]) ctl[q].set(P[q]);
  const adv = ui.level === "adv"; ctl.style.el.style.display = adv ? "" : "none"; ctl.view.el.querySelectorAll("button").forEach((b, i) => b.style.display = adv || i === 0 ? "" : "none"); }
function set(o) { Object.assign(P, DEF, o); if (ui.level !== "adv") { P.view = "season"; if (!o.style) P.style = "serving"; } sync(); rerun(); }
function rerun() { S = season(P, K.rng(seed * 313 + 7)); k = 0; }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function WRAP(c, s, x, y, maxW, lh = 15, col = "#8fa0bf", f = "11.5px") { c.font = f + " Segoe UI,sans-serif"; let line = ""; for (const wd of s.split(" ")) { if (c.measureText(line + wd).width > maxW && line) { TX(c, line, x, y, col, "left", f); y += lh; line = ""; } line += wd + " "; } TX(c, line, x, y, col, "left", f); return y + lh; }
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h, adv = ui.level === "adv"; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h);
  if (P.view === "season") { const n = Math.min(S.out.length, Math.floor(k)), sh = S.out.slice(0, n), cur = sh[sh.length - 1];
    TX(c, `A season: match ${n} of 30${S.drop && n >= S.out.length ? ` · dropped out after match ${S.drop}` : ""}`, 24, 32, S.drop && n >= S.out.length ? "#ff6b81" : "#eef2f8", "left", "600 15px");
    const sz = Math.min(28, (w - 60) / 30); sh.forEach((q, i) => { c.fillStyle = q.win ? "#7ee787" : "#ff6b81"; c.fillRect(24 + i * sz, 50, sz - 3, sz - 3); TX(c, q.win ? "W" : "L", 24 + i * sz + (sz - 3) / 2, 50 + sz / 2 + 2, "#0b1020", "center", "600 11px"); });
    // Weiner's 2 × 2 grid with a count of attributions in each box
    const gx = 24, gy = 120, cw = 150, chh = 70, cnt = { "internal stable": 0, "internal unstable": 0, "external stable": 0, "external unstable": 0 }; sh.forEach(q => cnt[q.attr[0] + " " + q.attr[1]]++);
    TX(c, "Weiner's attribution model: how the results were explained", gx, gy - 10, "#eef2f8", "left", "600 12.5px"); [["internal stable", "ability"], ["internal unstable", "effort"], ["external stable", "task difficulty"], ["external unstable", "luck"]].forEach(([key, lab], i) => { const x = gx + (i % 2) * cw, y = gy + Math.floor(i / 2) * chh; c.strokeStyle = "#3a4a6b"; c.strokeRect(x, y, cw - 6, chh - 6); c.fillStyle = `rgba(90,209,255,${Math.min(0.5, cnt[key] / 30)})`; c.fillRect(x, y, cw - 6, chh - 6); TX(c, lab, x + 8, y + 20, "#eef2f8", "left", "600 12px"); TX(c, `${key}: ${cnt[key]}`, x + 8, y + 40, "#aab6cc", "left", "11px"); });
    TX(c, "stable", gx + cw / 2 - 3, gy + 2 * chh + 12, "#8fa0bf", "center", "11px"); TX(c, "unstable", gx + 1.5 * cw - 3, gy + 2 * chh + 12, "#8fa0bf", "center", "11px");
    // self-efficacy gauge and the athlete's thought after the last match
    const tx = gx + 2 * cw + 30; let ty = 130; TX(c, "Self-efficacy", tx, ty, "#eef2f8", "left", "600 12.5px"); c.fillStyle = "#1a2238"; c.fillRect(tx, ty + 10, 260, 16); c.fillStyle = cur && cur.se < 0.25 ? "#ff6b81" : "#ffd166"; c.fillRect(tx, ty + 10, 260 * (cur ? cur.se : P.se0), 16); TX(c, `${(cur ? cur.se : P.se0).toFixed(2)}`, tx + 268, ty + 23, "#cfd8ea", "left", "12px");
    ty += 50; TX(c, "Effort", tx, ty, "#eef2f8", "left", "600 12.5px"); c.fillStyle = "#1a2238"; c.fillRect(tx, ty + 10, 260, 16); c.fillStyle = "#5ad1ff"; c.fillRect(tx, ty + 10, 260 * Math.min(1, (cur ? cur.effort : 0.7) / 1.2), 16);
    if (cur) { ty += 60; const say = cur.win ? { ability: "\"I won because I'm good at this.\"", luck: "\"I got lucky today.\"" }[cur.attr[2]] : { luck: "\"Bad luck: the ball bounced their way.\"", ability: "\"I'm just not good enough.\"", effort: "\"I didn't work hard enough. I'll train harder.\"" }[cur.attr[2]]; WRAP(c, `After match ${cur.m} (${cur.win ? "won" : "lost"}): ${say}`, tx, ty, w - tx - 20, 18, cur.win ? "#7ee787" : "#ff9aa8", "italic 13px"); }
    if (!adv) TX(c, "Attribution styles are A level", w - 16, h - 12, "#8fa0bf", "right", "11px");
  } else if (P.view === "ach") { TX(c, "Which opponent would you choose?", 24, 32, "#eef2f8", "left", "600 15px");
    const r = K.rng(seed), ps = choose(P.nach, P.naf, r); const opps = [0.1, 0.3, 0.5, 0.7, 0.9]; opps.forEach((p, i) => { const x = 40 + i * 120, on = Math.abs(p - ps) < 0.11; c.fillStyle = on ? "rgba(255,209,102,.25)" : "#16203a"; c.strokeStyle = on ? "#ffd166" : "#3a4a6b"; c.fillRect(x, 70, 100, 90); c.strokeRect(x, 70, 100, 90); TX(c, `${(100 * p).toFixed(0)}%`, x + 50, 110, "#eef2f8", "center", "600 18px"); TX(c, "chance of winning", x + 50, 130, "#8fa0bf", "center", "10.5px"); TX(c, p < 0.3 ? "top seed" : p > 0.7 ? "beginner" : p === 0.5 ? "evenly matched" : "", x + 50, 150, "#aab6cc", "center", "11px"); });
    let y = 200; y = WRAP(c, P.nach > P.naf ? `NAch (${P.nach.toFixed(2)}) is greater than NAF (${P.naf.toFixed(2)}): a high achiever. They choose an evenly matched opponent: winning means most when it is hard.` : `NAF (${P.naf.toFixed(2)}) is at least NAch (${P.nach.toFixed(2)}): a failure-avoider. They choose a sure win or a hopeless match, where losing is no shame.`, 40, y, w - 80, 18, "#cfd8ea", "13px");
    WRAP(c, "Atkinson: tendency to approach = (NAch − NAF) × Pₛ × (1 − Pₛ), where Pₛ is the chance of success and 1 − Pₛ the incentive value of success.", 40, y + 10, w - 80, 16, "#aab6cc", "12px");
  } else { TX(c, "Leaders and teams", 24, 32, "#eef2f8", "left", "600 15px"); const C = chel(P.actual, P.required, P.preferred);
    // three arrows on the democratic–autocratic scale
    const x0 = 60, x1 = w * 0.55, y = 110, X = v => x0 + (x1 - x0) * v; c.strokeStyle = "#3a4a6b"; c.lineWidth = 4; c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); c.lineWidth = 1; TX(c, "democratic / person-centred", x0, y + 24, "#8fa0bf", "left", "11px"); TX(c, "autocratic / task-centred", x1, y + 24, "#8fa0bf", "right", "11px");
    [["required", P.required, "#ffb454", -1], ["preferred", P.preferred, "#c4a1ff", 1], ["actual", P.actual, "#5ad1ff", 0]].forEach(([n, v, col, off]) => { c.fillStyle = col; c.beginPath(); c.arc(X(v), y, 9, 0, 6.3); c.fill(); TX(c, n, X(v), y - 18 + off * 0 - (off === -1 ? 0 : off === 1 ? -16 : 16) * -1, col, "center", "600 11.5px"); });
    TX(c, `Performance ${C.perf.toFixed(0)} (actual vs required)`, x0, y + 60, "#ffd166", "left", "600 13px"); TX(c, `Satisfaction ${C.sat.toFixed(0)} (actual vs preferred)`, x0, y + 82, "#c4a1ff", "left", "600 13px");
    WRAP(c, "Chelladurai: the best results come when the coach's actual behaviour matches what the situation requires (performance) and what the players prefer (satisfaction). Large squads, team sports and time pressure call for more autocratic leadership; experienced, older players often prefer a democratic style.", x0, y + 110, x1 - x0 + 120, 16, "#aab6cc", "12px");
    const tx = w * 0.66; TX(c, `Fiedler: favourableness ${P.fav} of 8`, tx, 70, "#eef2f8", "left", "600 12.5px"); TX(c, `task-orientated leader: ${fiedlerTask(P.fav).toFixed(0)}`, tx, 96, "#ffb454", "left", "12.5px"); TX(c, `person-orientated leader: ${fiedlerPerson(P.fav).toFixed(0)}`, tx, 116, "#7ee787", "left", "12.5px");
    WRAP(c, P.fav <= 2 || P.fav >= 7 ? "Very unfavourable or very favourable: a task-orientated leader does best (take control in a crisis; just keep a good team on task)." : "Moderately favourable: a person-orientated leader does best (relationships and morale matter most).", tx, 146, w - tx - 20, 16, "#aab6cc", "12px");
  }
  ui.hud("");
}
function charts() { chA.opts.xFmt = null; chB.opts.xFmt = null;
  if (P.view === "season") { const n = Math.min(S.out.length, Math.floor(k)), sh = S.out.slice(0, n);
    chA.opts.title = "Self-efficacy and effort"; chA.opts.xLabel = "match"; chA.opts.yLabel = "0–1"; chA.draw([{ pts: sh.map(q => [q.m, q.se]), color: "#ffd166", label: "self-efficacy" }, { pts: sh.map(q => [q.m, q.effort / 1.2]), color: "#5ad1ff", label: "effort" }], { xMin: 1, xMax: 30, yMin: 0, yMax: 1, hlines: [{ y: 0.2, color: "rgba(255,107,129,.5)", label: "drop-out zone" }] });
    const st = Object.keys(STYLES).map((s2, i) => [i + 1, K.mean([1, 2, 3, 4, 5, 6, 7, 8].map(q => season(Object.assign({}, P, { style: s2 }), K.rng(q * 31)).wins))]); chB.opts.title = "Average wins by attribution style"; chB.opts.xLabel = ""; chB.opts.yLabel = "wins"; chB.opts.xFmt = v => Math.abs(v - Math.round(v)) < 0.01 ? ["", "self-serving", "helpless", "mastery"][Math.round(v)] || "" : ""; chB.draw([{ pts: st, type: "bars", w: 0.5, color: "#c4a1ff", label: "" }], { xMin: 0.4, xMax: 3.6, yMin: 0 });
    label(0, "wins"); label(1, "self-efficacy now"); label(2, "style"); label(3, "dropped out"); read.set("a", sh.filter(q => q.win).length + " of " + n); read.set("b", sh.length ? sh[sh.length - 1].se.toFixed(2) : P.se0.toFixed(2)); read.set("c", STYLES[P.style].split(" (")[0]); read.set("d", S.drop && n >= S.out.length ? "after match " + S.drop : "no");
  } else if (P.view === "ach") { const ps = []; for (let p = 0; p <= 1.0001; p += 0.02) ps.push(p);
    chA.opts.title = "Tendency to approach"; chA.opts.xLabel = "chance of success Pₛ"; chA.opts.yLabel = "tendency"; chA.draw([{ pts: ps.map(p => [p, tendency(P.nach, P.naf, p)]), color: "#ffd166", label: "this athlete" }, { pts: ps.map(p => [p, tendency(0.8, 0.2, p)]), color: "rgba(126,231,135,.5)", dash: [4, 3], label: "high achiever" }, { pts: ps.map(p => [p, tendency(0.2, 0.8, p)]), color: "rgba(255,107,129,.5)", dash: [4, 3], label: "failure-avoider" }], { xMin: 0, xMax: 1 });
    const r = K.rng(seed), picks = []; for (let i = 0; i < 100; i++) { const a = r(), b = r(); picks.push(choose(a, b, r)); } const hst = [0.05, 0.25, 0.5, 0.75, 0.95].map(c0 => [c0, picks.filter(p => Math.abs(p - c0) < 0.125 || (c0 === 0.05 && p < 0.15) || (c0 === 0.95 && p > 0.85)).length]);
    chB.opts.title = "What 100 random athletes choose"; chB.opts.xLabel = "chance of success chosen"; chB.opts.yLabel = "athletes"; chB.draw([{ pts: hst, type: "bars", w: 0.12, color: "#5ad1ff", label: "" }], { xMin: 0, xMax: 1, yMin: 0 });
    label(0, "NAch − NAF"); label(1, "chosen Pₛ"); label(2, "type"); label(3, "tendency there"); const pc = choose(P.nach, P.naf, K.rng(seed)); read.set("a", (P.nach - P.naf).toFixed(2)); read.set("b", (100 * pc).toFixed(0) + "%"); read.set("c", P.nach > P.naf ? "high achiever" : "failure-avoider"); read.set("d", tendency(P.nach, P.naf, pc).toFixed(3));
  } else { const vs = []; for (let v = 0; v <= 1.0001; v += 0.02) vs.push(v); const fs = [1, 2, 3, 4, 5, 6, 7, 8];
    chA.opts.title = "Chelladurai: the coach's style"; chA.opts.xLabel = "actual behaviour (0 democratic – 1 autocratic)"; chA.opts.yLabel = "score"; chA.draw([{ pts: vs.map(v => [v, chel(v, P.required, P.preferred).perf]), color: "#ffd166", label: "performance" }, { pts: vs.map(v => [v, chel(v, P.required, P.preferred).sat]), color: "#c4a1ff", label: "satisfaction" }], { xMin: 0, xMax: 1, yMin: 0, yMax: 105, vlines: [{ x: P.actual, label: "coach" }] });
    chB.opts.title = "Fiedler's contingency model"; chB.opts.xLabel = "favourableness"; chB.opts.yLabel = "team performance"; chB.draw([{ pts: fs.map(f => [f, fiedlerTask(f)]), color: "#ffb454", label: "task-orientated" }, { pts: fs.map(f => [f, fiedlerPerson(f)]), color: "#7ee787", label: "person-orientated" }], { xMin: 1, xMax: 8, yMin: 60, yMax: 95, vlines: [{ x: P.fav, label: "now" }] });
    const C = chel(P.actual, P.required, P.preferred); label(0, "performance"); label(1, "satisfaction"); label(2, "Fiedler: better leader"); label(3, "favourableness"); read.set("a", C.perf.toFixed(0)); read.set("b", C.sat.toFixed(0)); read.set("c", fiedlerTask(P.fav) > fiedlerPerson(P.fav) ? "task-orientated" : "person-orientated"); read.set("d", P.fav + " of 8"); }
}
let frame = 0;
ui.onLevel = () => { sync(); if (ui.level !== "adv" && P.view !== "season") set({ view: "season" }); };
ui.run(dt => { if (dt > 0 && S) k = Math.min(S.out.length, k + dt * 3); }, () => { draw(); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("Play a season and watch how each result is explained, and what that does to confidence.", 7000);
