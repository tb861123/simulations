/* =====================================================================
   RHYTHM AND METRE
   TEMPO is the speed of the beat in beats per minute (BPM):
        one beat lasts 60 ÷ BPM seconds.
   METRE groups beats into bars: simple metres split each beat in two
   (2/4, 3/4, 4/4); compound metres split each beat in three (6/8, 9/8,
   12/8). The first beat of a bar is usually the strongest.
   SYNCOPATION puts accents where the metre does not expect them (off the
   beat). SWING lengthens the first of each pair of quavers and shortens
   the second (a swing ratio of 2:1 turns pairs into triplet-like rhythms).
   A POLYRHYTHM plays two different even pulses at once (3 against 2):
   they line up again every lowest-common-multiple of the two.
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
const METRES = { "2/4": { beats: 2, sub: 2, name: "2/4 (simple duple)" }, "3/4": { beats: 3, sub: 2, name: "3/4 (simple triple)" }, "4/4": { beats: 4, sub: 2, name: "4/4 (simple quadruple)" }, "6/8": { beats: 2, sub: 3, name: "6/8 (compound duple)" }, "9/8": { beats: 3, sub: 3, name: "9/8 (compound triple)" }, "12/8": { beats: 4, sub: 3, name: "12/8 (compound quadruple)" }, "5/4": { beats: 5, sub: 2, name: "5/4 (irregular)" }, "7/8": { beats: 3, sub: [2, 2, 3], name: "7/8 (2+2+3)" } };
const TRACKS = [["kick", "bass drum"], ["snare", "snare"], ["hat", "hi-hat"], ["click", "metronome"]];
// how many steps (smallest subdivisions) in one bar, and where each beat starts
function layout(m) { const M = METRES[m]; if (Array.isArray(M.sub)) { const starts = []; let s = 0; for (const g of M.sub) { starts.push(s); s += g; } return { steps: s, starts, beatLen: M.sub }; } const starts = []; for (let b = 0; b < M.beats; b++) starts.push(b * M.sub); return { steps: M.beats * M.sub, starts, beatLen: new Array(M.beats).fill(M.sub) }; }
// time (s, from the start of the bar) of each step, with swing applied to pairs of subdivisions
function stepTimes(m, bpm, swing) { const L = layout(m), bt = 60 / bpm, out = []; if (Array.isArray(METRES[m].sub)) { for (let i = 0; i < L.steps; i++) out.push(i * bt / 2); return out; } L.starts.forEach((st, b) => { const n = L.beatLen[b]; for (let j = 0; j < n; j++) { let frac = j / n; if (n === 2 && j === 1) frac = swing / (1 + swing); out.push(b * bt + frac * bt); } }); return out; }   // swing ratio 1 = straight, 2 = triplet swing; in 7/8 every quaver lasts half a crotchet beat
// metrical weight of each step: downbeat 3, other beats 2, subdivisions 1 (used to score syncopation)
function weights(m) { const L = layout(m), w = new Array(L.steps).fill(1); L.starts.forEach((s, b) => w[s] = b === 0 ? 3 : 2); return w; }
// a simple syncopation score: an accent on a weak step followed by silence on the next stronger step
function syncScore(pattern, m) { const w0 = weights(m), n = pattern.length, w = Array.from({ length: n }, (_, i) => w0[i % w0.length]); let s = 0; for (let i = 0; i < n; i++) if (pattern[i]) { for (let j = 1; j < n; j++) { const k = (i + j) % n; if (w[k] > w[i]) { if (!pattern[k]) s += w[k] - w[i]; break; } if (pattern[k]) break; } } return s; }
const gcd = (a, b) => b ? gcd(b, a % b) : a, lcm = (a, b) => a * b / gcd(a, b);
const DEF = { "4/4": { kick: "2.......1.1.....", snare: "....2.......2...", hat: "1.1.1.1.1.1.1.1." } };

// ---------------- Sound (Web Audio) ----------------
const SND = { ctx: null, nodes: [], timer: null };
async function audioOn() { SND.ctx = SND.ctx || new (window.AudioContext || window.webkitAudioContext)(); await SND.ctx.resume(); return SND.ctx; }
function stopSound() { for (const n of SND.nodes) { try { n.stop(); } catch (e) { } } SND.nodes = []; }
let noiseBuf = null;
// simple drum voices: kick = falling sine, snare = noise + tone, hat = high-passed noise, click = short beep
function hit(kind, t, acc, vol) {
  const ctx = SND.ctx, g = ctx.createGain(), L = vol * (acc === 2 ? 1 : 0.5); g.connect(ctx.destination);
  if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  if (kind === "kick") { const o = ctx.createOscillator(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.15); g.gain.setValueAtTime(L, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25); o.connect(g); o.start(t); o.stop(t + 0.3); SND.nodes.push(o); }
  else if (kind === "click" || kind === "poly1" || kind === "poly2") { const o = ctx.createOscillator(); o.frequency.value = kind === "poly2" ? 660 : (acc === 2 ? 1300 : 800); g.gain.setValueAtTime(L * 0.6, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05); o.connect(g); o.start(t); o.stop(t + 0.06); SND.nodes.push(o); }
  else { const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(); s.buffer = noiseBuf; f.type = kind === "hat" ? "highpass" : "bandpass"; f.frequency.value = kind === "hat" ? 7000 : 1800; s.connect(f); f.connect(g); const d = kind === "hat" ? 0.05 : 0.16; g.gain.setValueAtTime(L * (kind === "hat" ? 0.5 : 0.9), t); g.gain.exponentialRampToValueAtTime(0.001, t + d); s.start(t); s.stop(t + d + 0.02); SND.nodes.push(s); }
}

// ---------------- The page ----------------
const P = { metre: "4/4", bpm: 100, swing: 1, bars: 2, vol: 0.6, poly: false, pa: 3, pb: 2, human: 0 };
let grid = {}, playing = false, startAt = 0, nextStep = 0, cursor = -1, tapTimes = [], rnd = K.rng(Date.now() % 9973 + 7), cells = [];
const ui = K.app({
  title: "Rhythm and Metre", subject: "Music",
  blurb: "A step sequencer for tempo, metre, accents, syncopation, swing and polyrhythm",
  reset: () => set({}),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "GCSE Music (rhythm, metre and tempo: simple and compound time, time signatures, BPM, syncopation, swing, ostinato, cross-rhythm; dance and popular music styles).", adv: "A level Music (metre and rhythm in analysis: hemiola, polyrhythm and cross-rhythm, irregular metres, swing and groove in jazz and popular music). A level Physics/maths link: period = 60/BPM, lowest common multiple." } },
  missions: [
    { title: "Tempo", q: "Set 60 BPM, then 120 BPM. How long is one beat each time? What does the bar-length readout show?", hint: "60 BPM: one beat per second. 120 BPM: half a second. Beat length = 60 ÷ BPM. A bar of 4/4 at 120 BPM lasts 2 s.", setup() { set({ bpm: 60 }); } },
    { title: "Feel the metre", q: "Play the metronome in 3/4, then in 6/8. Both bars have six quavers. How do they feel different?", hint: "3/4: three beats each split in two (ONE-and-two-and-three-and). 6/8: two beats each split in three (ONE-and-a-TWO-and-a). Same six notes, different groupings: simple against compound.", setup() { set({ metre: "3/4", preset: "metro" }); } },
    { title: "Backbeat", q: "Load the rock beat. On which beats is the snare? Move it to beats 1 and 3: how does the feel change?", hint: "Rock and pop put the snare on beats 2 and 4 (the backbeat). On 1 and 3 it sounds like a march.", setup() { set({ preset: "rock" }); } },
    { title: "Syncopation", q: "Load the syncopated pattern. Where are the accents? Watch the syncopation score as you move one accent onto a beat.", hint: "Accents on off-beats followed by silence on the next strong beat give syncopation (a 'push'). Putting them back on the beat lowers the score and sounds square.", setup() { set({ preset: "sync" }); } },
    { title: "Swing", q: "Play the hi-hat quavers straight, then with a swing ratio of 2:1. What happens to the second quaver of each pair?", hint: "It is delayed and shortened: the pair becomes long–short (like a triplet crotchet–quaver). Jazz swing is often between 1.5:1 and 2.5:1, faster tempos swinging less.", setup() { set({ preset: "rock", swing: 2 }); } },
    { title: "Irregular metre", q: "Try 7/8 grouped 2+2+3. Count along. Where are the strong beats?", hint: "Three beats of unequal length: ONE-two THREE-four FIVE-six-seven. Common in Balkan music, and in pieces like 'Money' (Pink Floyd, 7/4).", setup() { set({ metre: "7/8", preset: "metro" }); } },
    { lvl: "adv", title: "Polyrhythm: 3 against 2", q: "Switch on the polyrhythm layer with 3 against 2. How often do the two pulses line up?", hint: "Once per cycle: lcm(3, 2) = 6 equal parts. 3 against 2 is the hemiola feel; 4 against 3 lines up every 12 parts and sounds much more complex.", setup() { set({ poly: true, pa: 3, pb: 2, preset: "metro" }); } },
    { lvl: "adv", title: "Human timing", q: "Add 'human' timing of 15 ms. Does the groove still sound steady? Try 40 ms.", hint: "Small random timing errors (10–20 ms) sound natural; above about 30 ms the pulse gets sloppy. Drum machines 'humanise' by adding small random shifts.", setup() { set({ preset: "rock", human: 15 }); } }
  ],
  batch: [
    { title: "Beat length and tempo", question: "How long does one beat last at each tempo?", how: "Beat length = time between successive beats in the sequencer's schedule.", xLabel: "tempo (BPM)", yLabel: "beat length (s)", xs: [40, 60, 80, 100, 120, 140, 160, 180, 200], reps: 1, yMin: 0, theory: b => 60 / b, theoryLabel: "60 ÷ BPM", run: b => { const t = stepTimes("4/4", b, 1); return t[2] - t[0]; }, note: "Inversely proportional: doubling the tempo halves the beat. Largo is about 50 BPM (1.2 s), presto about 180 (0.33 s)." },
    { title: "Swing ratio and the off-beat", question: "When is the second quaver of a pair played, for different swing ratios?", how: "100 BPM (0.6 s beat); time of the second quaver after the beat.", xLabel: "swing ratio (first : second)", yLabel: "delay after the beat (ms)", xs: [1, 1.25, 1.5, 1.75, 2, 2.5, 3], reps: 1, yMin: 0, theory: r => 600 * r / (1 + r), theoryLabel: "600 × r ÷ (1 + r)", run: r => 1000 * stepTimes("4/4", 100, r)[1], note: "Straight (1:1) is half way (300 ms); triplet swing (2:1) is two thirds of the beat (400 ms); 3:1 is a dotted rhythm (450 ms)." },
    { title: "When polyrhythms line up", question: "How many equal parts does a cycle of a against b need before both pulses meet again?", how: "Pulse counts (a, b) with b = 2, 3 or 4 by x; counted by stepping through the cycle.", xLabel: "a (pulses in the first layer)", yLabel: "parts in one cycle", xs: [2, 3, 4, 5, 6, 7], reps: 1, yMin: 0, theory: a => lcm(Math.round(a), 3), theoryLabel: "lcm(a, 3)", run: a => { let n = 1; while (n % a || n % 3) n++; return n; }, note: "With b = 3: 3 against 2 needs 6 parts, 4 against 3 needs 12, 5 against 3 needs 15. Shared factors (6 against 3) make it simple again." },
    { title: "Human timing: how far off the grid?", question: "With random timing errors (SD 15 ms), how far is a 16-step bar's average note from the grid?", how: "Each note moved by a random amount (normal, SD 15 ms); the mean absolute offset of the 16 notes, 400 bars.", yLabel: "mean |offset| (ms)", reps: 400, bins: 24, theory: 15 * Math.sqrt(2 / Math.PI), theoryLabel: "σ√(2/π)", run: (x, r) => { let s = 0; for (let i = 0; i < 16; i++) s += Math.abs(15 * r.gauss()); return s / 16; }, note: "About 12 ms on average: below the 20–30 ms where most listeners start to hear notes as 'early' or 'late'." },
    { title: "Syncopation score", question: "How syncopated are random rhythms with more and more notes in a 4/4 bar of semiquavers?", how: "Random patterns of k onsets in two bars of quavers (16 steps, 200 per k), scored by accents on weak steps followed by silence on a stronger one.", xLabel: "notes in the two bars", yLabel: "syncopation score", xs: [2, 4, 6, 8, 10, 12, 14], reps: 200, yMin: 0, theory: null, run: (k, r) => { const p = new Array(16).fill(0), idx = Array.from({ length: 16 }, (_, i) => i); for (let i = 15; i > 0; i--) { const j = r.int(i + 1); [idx[i], idx[j]] = [idx[j], idx[i]]; } for (let i = 0; i < k; i++) p[idx[i]] = 1; return syncScore(p, "4/4"); }, note: "Syncopation peaks with a middling number of notes: very sparse or very busy rhythms leave few strong beats empty after an off-beat note." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "GCSE Music", text: "Time signatures: the top number counts beats in the bar (simple) or groups of three quavers (compound: 6/8 has two dotted-crotchet beats). The bottom number gives the note value." },
      { lvl: "std", tag: "GCSE Music", text: "Tempo markings: largo (very slow), adagio, andante (walking pace), moderato, allegro, presto (very fast); BPM measures it exactly." },
      { lvl: "std", tag: "GCSE Music", text: "Syncopation: accents off the beat. Swing: unequal quavers (long-short). Ostinato: a repeated rhythm or melody. Cross-rhythm: two conflicting rhythms at once." },
      { lvl: "adv", tag: "A level Music", text: "Hemiola: two bars of 3/4 felt as three bars of 2/4 (a 3 against 2 shift), common at baroque cadences. Irregular metres (5/4, 7/8) group beats unequally." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: () => `A piece is played at ${P.bpm} BPM in 4/4. How long is one beat, and one bar?`, ans: () => `<ul><li>one beat = 60 ÷ ${P.bpm} = ${(60 / P.bpm).toFixed(3)} s</li><li>one bar = 4 beats = ${(240 / P.bpm).toFixed(3)} s</li></ul>` },
      { lvl: "std", marks: 2, q: "Explain the difference between 3/4 and 6/8 time.", ans: "<ul><li>3/4: three crotchet beats, each divided into two quavers (simple triple)</li><li>6/8: two dotted-crotchet beats, each divided into three quavers (compound duple)</li></ul>" },
      { lvl: "adv", marks: 2, q: "In a 4 against 3 polyrhythm lasting one bar of 2 s, how often do the two pulses coincide, and what is the shortest gap between any two notes?", ans: "<ul><li>they coincide only at the start of each bar (lcm(4, 3) = 12 parts)</li><li>shortest gap = 1/12 of a bar = 0.167 s</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li>A step sequencer: each bar is divided into the metre's smallest subdivision (quavers in compound time, semiquaver-pairs as quavers in simple time). Click a cell to cycle rest → note → accent.</li>
<li>Timing: beat = 60/BPM s. Swing ratio r places the second of each pair of subdivisions at r/(1 + r) of the beat (compound metres are not swung). 'Human' timing adds a random normal offset (SD in ms) to every note.</li>
<li>The polyrhythm layer plays a pulses against b pulses evenly across each bar.</li>
<li>Syncopation score: for every note, if the next stronger position in the bar is silent, add the difference in metrical weight (downbeat 3, beat 2, other 1): a simplified version of Longuet-Higgins and Lee's measure.</li></ul>
<h3>Left out</h3>
<ul><li>Note lengths and rests beyond the grid, tuplets other than the polyrhythm layer, tempo changes (rubato, accelerando), and the dynamics of real players.</li></ul>
<p>The earlier version of this simulation is kept in <a href="original/rhythm_metre.html">original/rhythm_metre.html</a>.</p>`
});

// ---------------- Patterns ----------------
function blank() { const L = layout(P.metre), n = L.steps * P.bars; grid = {}; for (const [k] of TRACKS) grid[k] = new Array(n).fill(0); }
function preset(name) {
  blank(); const L = layout(P.metre), n = L.steps * P.bars, w = weights(P.metre);
  if (name === "metro") { for (let i = 0; i < n; i++) { const s = i % L.steps; if (L.starts.includes(s)) grid.click[i] = s === 0 ? 2 : 1; } }
  else if (name === "rock" || name === "sync") {
    for (let i = 0; i < n; i++) { const s = i % L.steps; grid.hat[i] = 1; if (s === 0) grid.kick[i] = 2; if (L.starts.indexOf(s) === 1 || L.starts.indexOf(s) === 3) grid.snare[i] = 2; if (name === "rock" && L.starts.indexOf(s) === 2) grid.kick[i] = 1; }
    // syncopated: the bass drum anticipates beats (plays just before them, then rests on the beat)
    if (name === "sync") for (let b = 0; b < P.bars; b++) { const o = b * L.steps; grid.kick.fill(0, o, o + L.steps); grid.kick[o] = 2; if (L.starts[1]) grid.kick[o + L.starts[1] + 1] = 2; if (L.starts[2]) grid.kick[o + L.starts[2] + 1] = 1; if (L.starts[3]) grid.kick[o + L.starts[3] - 1] = 2; }
  }
}
// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("Metre and tempo");
ctl.metre = K.seg(g, { value: "4/4", options: Object.entries(METRES).map(([k, v]) => [k, k]), on: v => { P.metre = v; preset("metro"); } });
ctl.bpm = K.slider(g, { label: "Tempo", min: 40, max: 220, step: 1, value: 100, unit: "BPM", on: v => P.bpm = v });
ctl.swing = K.slider(g, { label: "Swing ratio (long : short)", min: 1, max: 3, step: 0.05, value: 1, fmt: v => v === 1 ? "straight (1 : 1)" : v.toFixed(2) + " : 1", on: v => P.swing = v });
ctl.human = K.slider(g, { label: "'Human' timing error (SD)", min: 0, max: 50, step: 1, value: 0, unit: "ms", on: v => P.human = v });
let rr = K.row(g); K.btn(rr, "Metronome", () => preset("metro")); K.btn(rr, "Rock beat", () => preset("rock")); K.btn(rr, "Syncopated", () => preset("sync")); K.btn(rr, "Clear", () => blank());
g = ui.group("Polyrhythm layer");
ctl.poly = K.toggle(g, { label: "Play a against b across each bar", value: false, on: v => P.poly = v });
ctl.pa = K.slider(g, { label: "a (high click)", min: 2, max: 7, step: 1, value: 3, on: v => P.pa = v });
ctl.pb = K.slider(g, { label: "b (low click)", min: 2, max: 7, step: 1, value: 2, on: v => P.pb = v });
g = ui.group("Play");
rr = K.row(g); K.btn(rr, "▶ Play / ■ Stop", () => toggle(), "primary"); K.btn(rr, "Tap tempo", () => tap());
ctl.vol = K.slider(g, { label: "Listening volume", min: 0, max: 1, step: 0.05, value: 0.6, fmt: v => (v * 100).toFixed(0) + "%", on: v => P.vol = v });
const read = K.readout(ui.group("Readings"), [["beat", "one beat"], ["bar", "one bar"], ["step", "one step"], ["sync", "syncopation score (kick + snare)"], ["poly", "polyrhythm cycle"], ["tap", "your tapped tempo"]]);
function set(o) { Object.assign(P, { metre: "4/4", bpm: 100, swing: 1, poly: false, pa: 3, pb: 2, human: 0 }, o); ctl.metre.set(P.metre); ctl.bpm.set(P.bpm); ctl.swing.set(P.swing); ctl.human.set(P.human); ctl.poly.set(P.poly); ctl.pa.set(P.pa); ctl.pb.set(P.pb); preset(o.preset || "rock"); }
function tap() { const t = performance.now() / 1000; tapTimes = tapTimes.filter(x => t - x < 3).concat(t); if (tapTimes.length >= 2) { const d = []; for (let i = 1; i < tapTimes.length; i++) d.push(tapTimes[i] - tapTimes[i - 1]); const bpm = 60 / K.mean(d); read.set("tap", `${bpm.toFixed(1)} BPM (${tapTimes.length} taps)`); if (tapTimes.length >= 4) { P.bpm = Math.round(K.clamp(bpm, 40, 220)); ctl.bpm.set(P.bpm); } } else read.set("tap", "keep tapping…"); }
// ---------------- Scheduler: notes are booked a little ahead on the audio clock ----------------
async function toggle() { if (playing) { playing = false; clearInterval(SND.timer); stopSound(); cursor = -1; return; } try { await audioOn(); playing = true; startAt = SND.ctx.currentTime + 0.1; nextStep = 0; SND.timer = setInterval(schedule, 25); } catch (e) { ui.tip("Sound could not start: " + e.message, 4000); } }
function schedule() {
  const L = layout(P.metre), barLen = barSeconds(), ahead = SND.ctx.currentTime + 0.12;
  const n = L.steps * P.bars, times = stepTimes(P.metre, P.bpm, METRES[P.metre].sub === 2 ? P.swing : 1);
  while (true) { const bar = Math.floor(nextStep / L.steps), s = nextStep % L.steps, t = startAt + bar * barLen + times[s]; if (t > ahead) break; const i = nextStep % n;
    for (const [k] of TRACKS) if (grid[k][i]) hit(k, t + (P.human ? P.human / 1000 * rnd.gauss() : 0), grid[k][i], P.vol);
    if (P.poly && s === 0) { for (let j = 0; j < P.pa; j++) hit("poly1", t + barLen * j / P.pa, j === 0 ? 2 : 1, P.vol * 0.8); for (let j = 0; j < P.pb; j++) hit("poly2", t + barLen * j / P.pb, 1, P.vol * 0.9); }
    const ci = i; setTimeout(() => { if (playing) cursor = ci; }, Math.max(0, (t - SND.ctx.currentTime) * 1000)); nextStep++; }
}
const barSeconds = () => { const M = METRES[P.metre], bt = 60 / P.bpm; return Array.isArray(M.sub) ? layout(P.metre).steps * bt / 2 : bt * M.beats; };

// ---------------- Drawing: the grid ----------------
const cv = ui.canvas(() => { });
K.pointer(cv.el, { down: p => { for (const c of cells) if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) { grid[c.k][c.i] = (grid[c.k][c.i] + 1) % 3; return; } } });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function drawGrid() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h);
  const L = layout(P.metre), n = L.steps * P.bars, x0 = 110, gw = w - x0 - 24, cw = gw / n, y0 = 70, rh = Math.min(72, (h * 0.62) / TRACKS.length), wts = weights(P.metre);
  // the steps are drawn at their real (swung) times, so swing visibly shifts the off-beats
  const times = stepTimes(P.metre, P.bpm, METRES[P.metre].sub === 2 ? P.swing : 1), bs = barSeconds(), xt = i => x0 + gw * (Math.floor(i / L.steps) + times[i % L.steps] / bs) / P.bars;
  cells = [];
  for (let b = 0; b < P.bars; b++) { c.fillStyle = b % 2 ? "#0f1629" : "#111a30"; c.fillRect(x0 + gw * b / P.bars, y0 - 26, gw / P.bars, rh * TRACKS.length + 30); TX(c, `bar ${b + 1}`, x0 + gw * b / P.bars + 6, y0 - 10, "#8fa0bf", "left", "11px"); }
  TRACKS.forEach(([k, lab], r) => { const y = y0 + r * rh; TX(c, lab, x0 - 10, y + rh / 2 + 4, "#cfd8ea", "right", "12px");
    for (let i = 0; i < n; i++) { const x = xt(i), s = i % L.steps, v = grid[k][i], ww = Math.min(cw * 0.86, 40); c.fillStyle = v === 2 ? "#ffd166" : v === 1 ? "#5ad1ff" : (wts[s] === 3 ? "#2c3a5c" : wts[s] === 2 ? "#243150" : "#1a2440"); c.fillRect(x + 1, y + 4, ww, rh - 8); if (i === cursor) { c.strokeStyle = "#fff"; c.lineWidth = 2; c.strokeRect(x + 1, y + 4, ww, rh - 8); c.lineWidth = 1; } cells.push({ x: x + 1, y: y + 4, w: ww, h: rh - 8, k, i }); } });
  // beat numbers under the grid ("1 & 2 &", or "1 & a 2 & a")
  const sy = y0 + TRACKS.length * rh + 18, sub = ["", "&", "a", "&"]; for (let i = 0; i < n; i++) { const s = i % L.steps, bi = L.starts.lastIndexOf(L.starts.filter(q => q <= s).pop()), j = s - L.starts[bi]; TX(c, j === 0 ? String(bi + 1) : (L.beatLen[bi] === 3 ? ["", "&", "a"][j] : sub[j] || "·"), xt(i) + Math.min(cw * 0.43, 20), sy, j === 0 ? "#eef2f8" : "#6c7894", "center", j === 0 ? "600 13px" : "11px"); }
  // polyrhythm lanes
  if (P.poly) { const py = sy + 26; for (const [cnt, col, lab, dy] of [[P.pa, "#ff8a70", `${P.pa} pulses`, 0], [P.pb, "#c9a0ff", `${P.pb} pulses`, 22]]) { TX(c, lab, x0 - 10, py + dy + 4, col, "right", "11.5px"); for (let b = 0; b < P.bars; b++) for (let j = 0; j < cnt; j++) { c.fillStyle = col; c.beginPath(); c.arc(x0 + gw * (b + j / cnt) / P.bars + 6, py + dy, 6, 0, 6.3); c.fill(); } } }
  TX(c, `${METRES[P.metre].name} · ${P.bpm} BPM${P.swing > 1 && METRES[P.metre].sub === 2 ? ` · swing ${P.swing.toFixed(2)}:1` : ""} · click cells: rest → note → accent`, 14, 26, "#eef2f8", "left", "600 13.5px");
}

// ---------------- Charts and readings ----------------
function charts() {
  const L = layout(P.metre), n = L.steps, wts = weights(P.metre), sw = METRES[P.metre].sub === 2 ? P.swing : 1, times = stepTimes(P.metre, P.bpm, sw);
  chA.opts.title = "Metrical weight of each step (one bar)"; chA.opts.xLabel = "time in the bar (s)"; chA.opts.yLabel = "weight";
  const on = [], off = []; for (let s = 0; s < n; s++) { const any = grid.kick[s] || grid.snare[s]; (any ? on : off).push([times[s], wts[s]]); }
  chA.draw([{ pts: on, type: "bars", w: barSeconds() / n * 0.5, color: "#ffd166", label: "kick or snare" }, { pts: off, type: "bars", w: barSeconds() / n * 0.5, color: "#3a4a6b", label: "silent" }], { yMin: 0, yMax: 3.2, xMin: -0.05, xMax: barSeconds() });
  const pts = []; for (let r = 1; r <= 3; r += 0.05) pts.push([r, 1000 * 60 / P.bpm * r / (1 + r)]);
  chB.opts.title = "Swing: when the off-beat quaver sounds"; chB.opts.xLabel = "swing ratio"; chB.opts.yLabel = "ms after the beat"; chB.draw([{ pts, color: "#7ee787", label: `at ${P.bpm} BPM` }, { pts: [[sw, 1000 * 60 / P.bpm * sw / (1 + sw)]], type: "dots", r: 6, color: "#fff", label: "now" }], { yMin: 0, xMin: 1, xMax: 3 });
  const pat = Array.from({ length: n }, (_, s) => grid.kick[s] || grid.snare[s] ? 1 : 0);
  read.set("beat", (60 / P.bpm).toFixed(3) + " s"); read.set("bar", barSeconds().toFixed(3) + " s"); read.set("step", (barSeconds() / n * 1000).toFixed(0) + " ms (average)"); read.set("sync", String(syncScore(pat, P.metre))); read.set("poly", P.poly ? `${P.pa} against ${P.pb}: lines up every ${lcm(P.pa, P.pb)} parts (${(barSeconds() / lcm(P.pa, P.pb) * 1000).toFixed(0)} ms each)` : "off");
  ui.hud("one beat = 60 ÷ BPM seconds");
}
let frame = 0;
ui.run(() => { }, () => { drawGrid(); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("Press ▶ Play. Click the cells to change the pattern.", 6000);
