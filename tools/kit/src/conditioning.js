/* =====================================================================
   LEARNING: CLASSICAL AND OPERANT CONDITIONING
   CLASSICAL CONDITIONING (Pavlov): a neutral stimulus (a bell) is paired
   with an unconditioned stimulus (food) that naturally causes an
   unconditioned response (salivation). After pairings the bell alone
   (now a CONDITIONED stimulus) causes salivation (a CONDITIONED
   response). How strong the association V grows is modelled by the
   Rescorla–Wagner rule:   ΔV = αβ(λ − V)
   (learning is fast at first, then slows as V approaches the maximum λ).
   EXTINCTION: the bell without food → V falls. After a rest the response
   partly returns (SPONTANEOUS RECOVERY). Similar sounds also cause some
   response (STIMULUS GENERALISATION).
   OPERANT CONDITIONING (Skinner): behaviour followed by REINFORCEMENT
   becomes more likely. Positive reinforcement adds something pleasant;
   negative reinforcement removes something unpleasant; punishment makes
   behaviour less likely. SCHEDULES of reinforcement:
     continuous (every response)        fast learning, fast extinction
     fixed ratio FR-n (every nth)        high rate, pause after reward
     variable ratio VR-n (on average n)  high steady rate, very hard to extinguish
     fixed interval FI-t (first after t s)  'scalloped' pattern
     variable interval VI-t              slow steady rate
   ===================================================================== */
// ---------------- 1. Classical: Rescorla–Wagner ----------------
function rwTrial(V, food, ab, lambda = 1) { return V + ab * ((food ? lambda : 0) - V); }
const salivaDrops = (r, V) => Math.max(0, Math.round(10 * V + 1.2 * r.gauss() * Math.sqrt(0.2 + V)));   // the measured response is noisy
const generalise = (V, diff, width) => V * Math.exp(-(diff * diff) / (2 * width * width));
// ---------------- 2. Operant: a rat in a Skinner box ----------------
const SCHEDS = { crf: { name: "continuous", ratio: 1 }, fr: { name: "fixed ratio", ratio: 10 }, vr: { name: "variable ratio", ratio: 10 }, fi: { name: "fixed interval", interval: 30 }, vi: { name: "variable interval", interval: 30 } };
function newRat(r) { return { p: 0.03, E: 1, pExt0: null, u: 0, count: 0, since: 0, nextVar: 1 + r.int(19), nextT: 30, presses: 0, rewards: 0, record: [[0, 0]], t: 0, lastPress: -1, extStart: null }; }
// one second in the box: the rat may press; the schedule decides if the press is reinforced
function ratSecond(R, r, Q) {
  R.t++; R.since++; const S = Q.sched, ext = Q.extinct; if (!ext) R.pExt0 = null;
  let pNow = R.p; if (S === "fi" && !ext && R.rewards > 3) pNow = R.p * Math.min(1, 0.08 + Math.pow(R.since / Q.interval, 2));   // after learning, presses bunch up just before the interval ends (scallop)
  if (S === "fr" && !ext && R.rewards > 3 && R.count === 0 && R.since < 4) pNow *= 0.15;                                            // post-reinforcement pause
  if (r() < pNow) {
    R.presses++; R.count++; let rein = false;
    if (!ext) { if (S === "crf") rein = true; else if (S === "fr") rein = R.count >= Q.ratio; else if (S === "vr") rein = R.count >= R.nextVar; else if (S === "fi") rein = R.since >= Q.interval; else rein = R.since >= R.nextT; }
    if (rein) { R.E += 0.2 * (R.count - R.E); R.rewards++; R.count = 0; R.since = 0; R.nextVar = 1 + r.int(2 * Q.ratio - 1); R.nextT = 1 + r.int(2 * Q.interval - 1); R.p += 0.12 * (0.95 - R.p); }
    else if (ext) {
      // extinction: unrewarded presses only start to weaken pressing once there have been more of them than the rat usually makes
      // between rewards (E); the fading is also slower for a rat used to long runs without food (partial reinforcement effect)
      if (R.pExt0 == null) { R.pExt0 = R.p; R.u = 0; }
      R.u++; R.p = R.pExt0 * Math.exp(-Math.max(0, R.u - R.E) / (3 * R.E + 10));
    }
    R.lastPress = R.t;
  }
  R.record.push([R.t, R.presses]); if (R.record.length > 1200) R.record.shift();
}
// train on a schedule, then extinguish: how many presses before the rat stops (no press for 120 s)?
function extinctionPresses(r, sched, ratio) { const Q = { sched, ratio, interval: 30, extinct: false }, R = newRat(r); for (let s = 0; s < 1500; s++) ratSecond(R, r, Q); Q.extinct = true; const start = R.presses; let quiet = 0; for (let s = 0; s < 6000 && quiet < 120; s++) { const b = R.presses; ratSecond(R, r, Q); quiet = R.presses > b ? 0 : quiet + 1; } return R.presses - start; }

// ---------------- 3. State ----------------
const DEF = { mode: "classical", ab: 0.2, food: true, width: 1.5, pitch: 0, sched: "crf", ratio: 10, interval: 30, extinct: false, speed: 4 };
const P = Object.assign({}, DEF);
let rand = K.rng(Date.now() % 1e6), V = 0, trials = [], phase = "acq", rest = false, rat = null, acc = 0, flash = 0, lastDrops = 0;
function restart() { V = 0; trials = []; rat = newRat(rand); acc = 0; }
function pavlovTrial() { const food = P.food && !P.extinctC; const Vg = generalise(V, P.pitch, P.width), drops = salivaDrops(rand, Vg); trials.push({ n: trials.length + 1, V: Vg, drops, food }); V = rwTrial(V, food, P.ab); lastDrops = drops; flash = 1; if (trials.length > 300) trials.shift(); }   // the response on a trial depends on V BEFORE that trial's learning

// ---------------- 4. The page ----------------
const ui = K.app({
  title: "Learning: Conditioning", subject: "Psychology",
  blurb: "Pavlov's dog with the Rescorla–Wagner learning curve, extinction, spontaneous recovery and generalisation; a Skinner box rat on different reinforcement schedules",
  reset: () => restart(),
  levels: { std: "AS (AQA 7181)", adv: "A level (AQA 7182)", specs: {
    std: "AQA AS and A level Psychology (7181/7182) 3.2.1 Approaches: the behaviourist approach: classical conditioning (Pavlov) and operant conditioning (Skinner): types of reinforcement and punishment; also 3.1.4 Psychopathology: the two-process model of phobias (classical conditioning to acquire, operant conditioning to maintain).",
    adv: "AQA A level Psychology (7182): evaluating the behaviourist approach (lab experiments with animals, extrapolation to humans, determinism) and applying learning theory: schedules of reinforcement, extinction, the partial reinforcement effect and behavioural therapies (systematic desensitisation, flooding, token economies)." } },
  missions: [
    { title: "Pavlov's dog", q: "Pair the bell with food on each trial. How quickly does salivation to the bell grow? Why does it slow down?", hint: "Fast at first, then levelling off: each trial adds a fraction of what is left to learn (Rescorla–Wagner, ΔV = αβ(λ − V)). The bell has become a conditioned stimulus.", setup: () => set({ mode: "classical" }) },
    { title: "Extinction and spontaneous recovery", q: "After about 20 pairings, switch the food off. What happens? Then press 'Rest overnight'.", hint: "Salivation fades (extinction): the bell no longer predicts food. After a rest some response returns (spontaneous recovery), so extinction is new learning, not forgetting.", setup: () => set({ mode: "classical" }, () => { for (let i = 0; i < 20; i++) pavlovTrial(); P.food = false; C.food.set(false); }) },
    { title: "Generalisation", q: "After conditioning to one bell, ring a higher or lower bell. Is there still salivation? How does it depend on the difference?", hint: "Yes, but less for bigger differences: a generalisation gradient. Little Albert's fear of the rat generalised to other white furry things (Watson and Rayner, 1920).", setup: () => set({ mode: "classical" }, () => { for (let i = 0; i < 25; i++) pavlovTrial(); P.food = false; C.food.set(false); P.pitch = 1.5; C.pitch.set(1.5); }) },
    { title: "A rat learns to press", q: "Continuous reinforcement: every press gives food. Watch the cumulative record (presses against time). What happens to its slope?", hint: "It gets steeper as pressing is reinforced (operant conditioning by positive reinforcement). The slope of a cumulative record is the response rate.", setup: () => set({ mode: "operant", sched: "crf" }) },
    { title: "Schedules of reinforcement", q: "Compare fixed ratio, variable ratio, fixed interval and variable interval. Which gives the fastest pressing? Which gives a scalloped record?", hint: "Ratio schedules give fast pressing (more presses = more food), VR the steadiest. Fixed interval gives a scallop: little pressing just after food, speeding up as the time comes round again. Variable interval gives slow, steady pressing.", setup: () => set({ mode: "operant", sched: "fi" }) },
    { lvl: "adv", title: "Which is hardest to extinguish?", q: "Train on continuous reinforcement, then switch to extinction. Repeat after training on variable ratio. Which rat keeps pressing longer?", hint: "The VR rat: it is used to many unrewarded presses, so non-reward is not surprising (the partial reinforcement extinction effect). That is why gambling (a VR schedule) is so persistent.", setup: () => set({ mode: "operant", sched: "vr" }) },
  ],
  batch: [
    { title: "Rescorla–Wagner learning curve", question: "How many drops of saliva does the bell produce after n pairings with food?", how: "Each point: one dog's response on trial n (noisy measurement), αβ = 0.2.", xLabel: "pairings", yLabel: "drops of saliva", xs: [1, 2, 4, 6, 8, 12, 16, 24], reps: 8, yMin: 0, theory: n => 10 * (1 - Math.pow(0.8, n - 1)), theoryLabel: "10(1 − 0.8ⁿ⁻¹)", run: (n, r) => { let v = 0; for (let i = 1; i < n; i++) v = rwTrial(v, true, 0.2); return salivaDrops(r, v); }, note: "Negatively accelerated: big gains early, small gains later. Individual trials scatter because the response is noisy." },
    { title: "Generalisation gradient", question: "After conditioning to one tone, how much salivation do other tones produce?", how: "Each point: one dog's response to a tone that differs by the given amount (conditioned to V ≈ 1).", xLabel: "difference from the trained tone", yLabel: "drops of saliva", xs: [0, 0.5, 1, 1.5, 2, 3, 4], reps: 8, yMin: 0, theory: d => 10 * generalise(0.995, d, 1.5), theoryLabel: "bell-shaped gradient", run: (d, r) => salivaDrops(r, generalise(0.995, d, 1.5)), note: "The more different the stimulus, the weaker the response. Discrimination training (food only with one tone) would make the gradient narrower." },
    { title: "Partial reinforcement extinction effect (A level)", question: "After training on a variable ratio schedule (VR-n), how many presses before the rat gives up in extinction?", how: "Each point: one rat trained for 25 minutes, then food stops; counts presses until it stops for 2 minutes. n = 1 is continuous reinforcement.", xLabel: "average presses per reward (VR-n)", yLabel: "presses in extinction", xs: [1, 2, 5, 10, 20], reps: 4, yMin: 0, run: (n, r) => extinctionPresses(r, n === 1 ? "crf" : "vr", n), note: "Rats trained with rarer, unpredictable rewards keep pressing much longer when rewards stop: non-reward is less of a surprise." },
    { title: "Response rate under ratio schedules", question: "How fast does the rat press on a variable ratio schedule, for different ratios?", how: "Each point: one rat over 25 minutes; presses per minute in the last 10 minutes.", xLabel: "VR-n", yLabel: "presses per minute", xs: [1, 2, 5, 10, 20, 40], reps: 4, yMin: 0, run: (n, r) => { const Q = { sched: n === 1 ? "crf" : "vr", ratio: n, interval: 30, extinct: false }, R = newRat(r); for (let s = 0; s < 900; s++) ratSecond(R, r, Q); const a = R.presses; for (let s = 0; s < 600; s++) ratSecond(R, r, Q); return (R.presses - a) / 10; }, note: "Higher ratios keep the rate high only if enough rewards still arrive to sustain learning; very lean schedules learned from scratch lead to slow learning ('ratio strain')." },
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "3.2.1", text: "Classical conditioning: UCS (food) → UCR (salivation). NS (bell) paired with UCS repeatedly → CS → CR. Extinction (CS without UCS), spontaneous recovery, stimulus generalisation and discrimination." },
      { lvl: "std", tag: "3.2.1", text: "Operant conditioning: learning from consequences. Positive reinforcement (add a reward), negative reinforcement (remove something unpleasant, e.g. avoidance), punishment (makes behaviour less likely). Skinner's boxes with rats and pigeons." },
      { lvl: "std", tag: "3.1.4", text: "Two-process model of phobias (Mowrer): acquired by classical conditioning (Little Albert), maintained by negative reinforcement (avoidance reduces anxiety, so the fear is never extinguished)." },
      { lvl: "adv", tag: "3.2.1", text: "Schedules: continuous, fixed/variable ratio, fixed/variable interval. Partial reinforcement (especially variable) makes behaviour resistant to extinction." },
      { lvl: "adv", tag: "Evaluation", text: "Behaviourism: scientific, controlled lab methods and real applications (token economies, systematic desensitisation), but mostly animal research, environmental determinism, and it ignores cognition (social learning theory adds mediational processes)." },
    ],
    questions: [
      { lvl: "std", marks: 4, q: "Using Pavlov's research, explain how a dog learns to salivate to a bell. Use the terms UCS, UCR, NS, CS and CR.", ans: "<ul><li>food (UCS) naturally produces salivation (UCR)</li><li>the bell (NS) is repeatedly presented just before the food</li><li>the bell becomes a CS</li><li>it produces salivation on its own: the CR</li></ul>" },
      { lvl: "std", marks: 3, q: "Explain the difference between negative reinforcement and punishment.", ans: "<ul><li>negative reinforcement removes something unpleasant after a behaviour</li><li>so the behaviour becomes MORE likely (e.g. leaving to escape anxiety)</li><li>punishment adds an unpleasant consequence (or removes a pleasant one), making behaviour LESS likely</li></ul>" },
      { lvl: "adv", marks: 4, q: "Explain why a gambler on a slot machine may keep playing long after winning stops, using operant conditioning.", ans: "<ul><li>slot machines pay out on a variable ratio schedule</li><li>wins come unpredictably after an average number of plays, producing a high, steady response rate</li><li>so a long run without a win is not unusual and does not signal that rewards have stopped</li><li>behaviour learned on variable partial reinforcement is highly resistant to extinction</li></ul>" },
    ]
  },
  notes: `<h3>The models</h3><ul><li><b>Classical:</b> associative strength V follows the Rescorla–Wagner rule ΔV = αβ(λ − V) with λ = 1 when food follows the bell and 0 when it does not. Salivation = 10V drops plus measurement noise. A different-pitched bell gives V × e^(−d²/2w²). 'Rest overnight' restores part of the lost strength (spontaneous recovery, modelled as recovering 35% of what extinction removed).</li><li><b>Operant:</b> each second the rat presses with probability p. Reinforced presses raise p; the rat keeps a running average E of how many presses it usually makes per reward. In extinction, pressing only starts to fade once unrewarded presses exceed E, and fades more slowly for large E, so rats used to frequent rewards give up sooner. FI scallops and FR post-reward pauses are built in once the schedule is learned.</li></ul>
<h3>Assumptions and simplifications</h3><ul><li>Real animals vary, get full (satiation), and learn about timing in more complex ways.</li><li>The parameters are chosen to show the classic patterns, not fitted to particular experiments.</li><li>Applying animal findings to humans (extrapolation) is a major criticism of the behaviourist approach.</li></ul>`,
});

// ---------------- 5. Controls ----------------
const C = {};
let g = ui.group("Type of conditioning");
C.mode = K.seg(g, { value: "classical", options: [["classical", "classical (Pavlov)"], ["operant", "operant (Skinner)"]], on: v => set({ mode: v }) });
const gc = ui.group("Pavlov's dog"), go = ui.group("Skinner box");
C.food = K.toggle(gc, { label: "Food follows the bell (switch off for extinction)", value: true, on: v => P.food = v });
C.ab = K.slider(gc, { label: "Learning rate αβ", min: 0.05, max: 0.6, step: 0.05, value: 0.2, on: v => P.ab = v });
C.pitch = K.slider(gc, { label: "Bell pitch (difference from the trained bell)", min: -4, max: 4, step: 0.5, value: 0, on: v => P.pitch = v });
let rw = K.row(gc); K.btn(rw, "🔔 One trial", () => { ui.setPlaying(false); pavlovTrial(); }, "primary"); K.btn(rw, "Rest overnight", () => { V = V + 0.35 * (Math.max(...trials.map(t => t.V), 0) - V); trials.push({ n: trials.length + 1, V, drops: null, rest: true }); });
C.sched = K.seg(go, { label: "Schedule", value: "crf", options: Object.entries(SCHEDS).map(([k, v]) => [k, v.name]), on: v => { P.sched = v; } });
C.ratio = K.slider(go, { label: "Ratio n (presses per reward)", min: 2, max: 40, step: 1, value: 10, on: v => P.ratio = v });
C.interval = K.slider(go, { label: "Interval t (seconds)", min: 5, max: 120, step: 5, value: 30, unit: "s", on: v => P.interval = v });
C.extinct = K.toggle(go, { label: "Extinction: no more food", value: false, on: v => P.extinct = v });
C.speed = K.slider(ui.controls, { label: "Speed", min: 0.5, max: 20, step: 0.5, value: 4, fmt: v => v + "×", on: v => P.speed = v });
ui.headerSpeed(C.speed);   // playback speed lives in the header, beside Pause and Reset
let rw2 = K.row(ui.controls); K.btn(rw2, "Start again", () => restart(), "danger");
const read = K.readout(ui.group("Now"), [["a", ""], ["b", ""], ["c", ""]]);
const relabel = n => n.forEach((x, i) => read.el.children[i].firstElementChild.textContent = x);
function showCtl() { gc.style.display = P.mode === "classical" ? "" : "none"; go.style.display = P.mode === "operant" ? "" : "none"; C.ratio.el.style.display = P.sched === "fr" || P.sched === "vr" ? "" : "none"; C.interval.el.style.display = P.sched === "fi" || P.sched === "vi" ? "" : "none"; }
function set(o, then) { Object.assign(P, DEF, o); for (const k of ["mode", "food", "ab", "pitch", "sched", "ratio", "interval", "extinct", "speed"]) C[k].set(P[k]); showCtl(); restart(); if (then) then(); }
C.sched.el.addEventListener("click", showCtl);

// ---------------- 6. Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#c9d4ea", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,system-ui,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function tick(dt) { if (P.mode === "classical") { acc += dt * P.speed * 0.4; while (acc >= 1) { acc--; pavlovTrial(); } flash = Math.max(0, flash - dt * 2); } else { acc += dt * P.speed * 3; while (acc >= 1) { acc--; ratSecond(rat, rand, P); } } }
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1222"; c.fillRect(0, 0, w, h);
  if (P.mode === "classical") {
    const cx = w * 0.32, cy = h * 0.5;
    // a simple dog: body, head, ear, and drops of saliva falling into a measuring tube
    c.fillStyle = "#c9a36b"; c.beginPath(); c.ellipse(cx - 80, cy + 20, 110, 55, 0, 0, 6.3); c.fill(); c.beginPath(); c.ellipse(cx + 60, cy - 40, 55, 45, 0, 0, 6.3); c.fill(); c.fillStyle = "#8a6a3a"; c.beginPath(); c.ellipse(cx + 40, cy - 85, 18, 30, -0.4, 0, 6.3); c.fill(); c.fillStyle = "#000"; c.beginPath(); c.arc(cx + 80, cy - 50, 5, 0, 6.3); c.fill(); c.fillRect(cx - 160, cy + 60, 16, 50); c.fillRect(cx - 40, cy + 60, 16, 50);
    const drops = Math.min(14, lastDrops); for (let i = 0; i < drops; i++) { c.fillStyle = "#7fdcff"; c.beginPath(); c.arc(cx + 100, cy - 10 + i * 9 * (1 - flash * 0.5), 4, 0, 6.3); c.fill(); }
    c.strokeStyle = "#8fa0bf"; c.strokeRect(cx + 120, cy - 20, 24, 140); c.fillStyle = "#5ad1ff"; const lv = Math.min(1, lastDrops / 14); c.fillRect(cx + 121, cy + 120 - 140 * lv, 22, 140 * lv); TX(c, `${lastDrops} drops`, cx + 132, cy + 140, "#5ad1ff", "center", "600 13px");
    // the bell and the food
    const pitchCol = P.pitch === 0 ? "#ffd166" : "#ffb454"; c.fillStyle = pitchCol; c.globalAlpha = 0.4 + 0.6 * flash; c.beginPath(); c.arc(w * 0.72, h * 0.25, 30, Math.PI, 0); c.lineTo(w * 0.72 + 36, h * 0.25 + 22); c.lineTo(w * 0.72 - 36, h * 0.25 + 22); c.fill(); c.globalAlpha = 1; TX(c, P.pitch === 0 ? "trained bell" : `bell ${P.pitch > 0 ? "higher" : "lower"} by ${Math.abs(P.pitch)}`, w * 0.72, h * 0.25 + 44, pitchCol, "center", "600 12px");
    TX(c, P.food ? "🍖 food after the bell" : "no food (extinction)", w * 0.72, h * 0.25 + 76, P.food ? "#7ee787" : "#ff9aa9", "center", "600 14px");
    TX(c, `associative strength V = ${V.toFixed(3)}`, w * 0.72, h * 0.6, "#fff", "center", "600 15px"); TX(c, `ΔV = αβ(λ − V) = ${P.ab} × (${P.food ? 1 : 0} − ${V.toFixed(2)})`, w * 0.72, h * 0.6 + 24, "#c9d4ea", "center", "13px");
    ui.hud(`trial ${trials.length}<br>${!P.food && trials.length ? "extinction: bell without food" : V < 0.2 ? "bell is still (nearly) neutral" : "bell is a conditioned stimulus"}`);
  } else {
    const R = rat, bx = 40, by = 60, bw = w * 0.45, bh = h - 140;
    c.fillStyle = "#121b30"; c.fillRect(bx, by, bw, bh); c.strokeStyle = "#8fa0bf"; c.lineWidth = 2; c.strokeRect(bx, by, bw, bh); c.lineWidth = 1; TX(c, "SKINNER BOX", bx + bw / 2, by - 12, "#8fa0bf", "center", "600 13px");
    const pressedNow = R.t - R.lastPress < 1; c.fillStyle = pressedNow ? "#ffb454" : "#5d6e93"; c.fillRect(bx + bw - 60, by + bh * 0.4 + (pressedNow ? 6 : 0), 50, 10); TX(c, "lever", bx + bw - 35, by + bh * 0.4 - 8, "#c9d4ea", "center", "11px");
    c.fillStyle = "#8fa0bf"; c.fillRect(bx + bw - 50, by + bh * 0.7, 40, 24); TX(c, "food tray", bx + bw - 30, by + bh * 0.7 + 40, "#c9d4ea", "center", "11px");
    const rx = bx + bw - 120 + (pressedNow ? 30 : 0) - (1 - R.p) * 120, ry = by + bh * 0.55; c.fillStyle = "#d9d9d9"; c.beginPath(); c.ellipse(rx, ry, 40, 22, 0, 0, 6.3); c.fill(); c.beginPath(); c.ellipse(rx + 38, ry - 8, 16, 12, 0, 0, 6.3); c.fill(); c.fillStyle = "#ff9aa9"; c.beginPath(); c.arc(rx + 32, ry - 22, 6, 0, 6.3); c.fill(); c.strokeStyle = "#d9d9d9"; c.lineWidth = 3; c.beginPath(); c.moveTo(rx - 40, ry); c.quadraticCurveTo(rx - 80, ry + 20, rx - 70, ry + 40); c.stroke(); c.lineWidth = 1;
    if (R.since < 2 && R.rewards) TX(c, "🍖 reinforced!", bx + bw - 30, by + bh * 0.7 - 14, "#7ee787", "center", "600 12px");
    const S = SCHEDS[P.sched], desc = P.sched === "crf" ? "every press gives food" : P.sched === "fr" ? `food after every ${P.ratio}th press` : P.sched === "vr" ? `food after a random number of presses (average ${P.ratio})` : P.sched === "fi" ? `food for the first press after ${P.interval} s` : `food for the first press after a random time (average ${P.interval} s)`;
    TX(c, `${S.name}: ${desc}${P.extinct ? " · EXTINCTION (no food)" : ""}`, bx + bw + 20, by + 10, P.extinct ? "#ff9aa9" : "#ffd166", "left", "600 13px");
    TX(c, `time ${Math.floor(R.t / 60)} min ${R.t % 60} s`, bx + bw + 20, by + 40, "#c9d4ea", "left", "13px"); TX(c, `presses ${R.presses} · rewards ${R.rewards}`, bx + bw + 20, by + 62, "#c9d4ea", "left", "13px"); TX(c, `chance of pressing each second: ${(100 * R.p).toFixed(0)}%`, bx + bw + 20, by + 84, "#c9d4ea", "left", "13px");
    ui.hud(`cumulative record below: slope = rate of pressing`);
  }
}
function panels() {
  if (P.mode === "classical") {
    relabel(["Trials", "Associative strength V", "Last response"]); read.set("a", trials.length); read.set("b", V.toFixed(3)); read.set("c", lastDrops + " drops");
    chA.opts.title = "Learning curve: salivation to the bell on each trial"; chA.opts.xLabel = "trial"; chA.opts.yLabel = "drops"; chA.draw([{ pts: trials.filter(t => t.drops != null).map(t => [t.n, t.drops]), type: "dots", r: 3, color: K.cssVar("--s0"), label: "drops" }, { pts: trials.map(t => [t.n, 10 * t.V]), color: K.cssVar("--s1"), label: "10 × V" }], { yMin: 0, yMax: 12, vlines: trials.filter(t => t.rest).map(t => ({ x: t.n, label: "rest" })) });
    const Gp = []; for (let d = -4; d <= 4.001; d += 0.1) Gp.push([d, 10 * generalise(V, d, P.width)]); chB.opts.title = "Generalisation: response to bells of other pitches now"; chB.opts.xLabel = "pitch difference"; chB.opts.yLabel = "expected drops"; chB.draw([{ pts: Gp, color: K.cssVar("--s4") }], { yMin: 0, yMax: 11, vlines: [{ x: P.pitch }] });
  } else {
    relabel(["Presses", "Rewards", "Presses per minute (last minute)"]); read.set("a", rat.presses); read.set("b", rat.rewards); const rec = rat.record, last = rec[rec.length - 1], prev = rec[Math.max(0, rec.length - 61)]; read.set("c", (last[1] - prev[1]).toFixed(0));
    chA.opts.title = "Cumulative record: total presses against time"; chA.opts.xLabel = "time (s)"; chA.opts.yLabel = "total presses"; chA.draw([{ pts: rec, color: K.cssVar("--s1"), label: SCHEDS[P.sched].name }], { yMin: 0 });
    chB.opts.title = "Chance of pressing each second"; chB.opts.xLabel = "time (s)"; chB.opts.yLabel = "probability"; if (!rat.ph) rat.ph = []; rat.ph.push([rat.t, rat.p]); if (rat.ph.length > 600) rat.ph.shift(); chB.draw([{ pts: rat.ph, color: K.cssVar("--s2") }], { yMin: 0, yMax: 1 });
  }
}
let frame = 0;
ui.run(dt => tick(dt), () => { draw(); if (frame++ % 6 === 0) panels(); });
set({});
ui.tip("Each trial: bell, then food. Watch the saliva tube and the learning curve.", 7000);
