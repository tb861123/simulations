/* =====================================================================
   MODELS OF MEMORY
   THE MULTI-STORE MODEL (Atkinson and Shiffrin, 1968):
     sensory register → (attention) → short-term memory → (rehearsal)
     → long-term memory. STM: acoustic coding, capacity about 7 ± 2
     items (Miller, 1956), duration about 18–30 s without rehearsal
     (Peterson and Peterson, 1959). LTM: semantic coding, very large,
     potentially lifelong.
   This page simulates a CLASS of participants. Each one has a small
   REHEARSAL BUFFER in STM (a few slots). Rehearsal time is shared among the
   words in the buffer, and each second of rehearsal strengthens a word's
   LTM trace. When a new word arrives and the
   buffer is full, a random old word is pushed out.
   At recall, words still in STM come out first (the RECENCY effect);
   early words had the buffer to themselves for longer, so they reached
   LTM more often (the PRIMACY effect). Together: the SERIAL POSITION
   CURVE (Murdock, 1962). Counting backwards for 30 s before recall
   empties STM and removes recency (Glanzer and Cunitz, 1966).
   THE WORKING MEMORY MODEL (Baddeley and Hitch, 1974): STM is a set of
   parts: central executive, phonological loop, visuo-spatial sketchpad
   (and episodic buffer). Two tasks that need the SAME part interfere;
   tasks using different parts can be done together (dual-task studies).
   ===================================================================== */
// ---------------- 1. One simulated participant ----------------
// learn a list of n words at 'rate' seconds per word, buffer of B slots, transfer rate theta per second; 'delay' seconds of counting backwards before recall
function freeRecall(r, Q) {
  const n = Q.n, buf = [], time = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    if (buf.length >= Q.B) buf.splice(r.int(buf.length), 1);         // displace a random word to make room
    buf.push(i);
    for (const j of buf) time[j] += Q.rate / buf.length;                 // rehearsal time is SHARED by the words in the buffer (early words share with fewer)
  }
  const inSTM = new Set(Q.delay > 0 ? [] : buf);                          // counting backwards empties STM
  return time.map((t, i) => inSTM.has(i) ? r() < 0.95 : r() < 1 - Math.exp(-Q.theta * t) * (1 - Q.ltmBoost));
}
// Peterson and Peterson: recall of a trigram after t seconds of counting backwards
const ppTheory = t => Math.min(1, 1.18 * Math.exp(-t / 6.5));   // fitted to resemble the original results (about 80% at 3 s, under 10% at 18 s)
// digit span: each person's span varies (letters about 7.3, digits about 9.3: Jacobs, 1887); chunking packs about 3 items into each chunk
function spanOf(r, kind, chunk) { const m = kind === "digits" ? 9.3 : 7.3, s = 1.2 + 0.5 * r.gauss() * 0; return Math.max(3, Math.round((m + 1.3 * r.gauss()) * (chunk ? 1.6 : 1))); }
// dual task (working memory): time for task 1 alone, or with a second task using the same or a different slave system
function dualTaskRT(r, cond) { const base = 1.6, noise = 0.18 * r.gauss(); return base + noise + (cond === "same" ? 0.75 + 0.15 * r.gauss() : cond === "different" ? 0.12 + 0.08 * r.gauss() : 0); }

// ---------------- 2. State ----------------
const DEF = { mode: "serial", n: 15, B: 4, rate: 2, theta: 0.16, delay: 0, ltmBoost: 0, people: 30, ppDelay: 9, span: "letters", chunk: false, task2: "different" };
const P = Object.assign({}, DEF);
let demo = null, dt0 = 0, curve = [], curves = {}, rand = K.rng(Date.now() % 1e6);
const WORDS = "APPLE RIVER CHAIR TIGER PENCIL GARDEN CLOCK BREAD MIRROR ROCKET CANDLE PIANO TRAIN ISLAND WINDOW SPOON HORSE CLOUD LADDER BOTTLE".split(" ");
// one participant's trial, recorded as events for the animation
function startDemo() { demo = { t: 0, i: -1, buf: [], ltm: new Set(), time: new Array(P.n).fill(0), phase: "learn", recalled: null }; }
function runClass() { const tot = new Array(P.n).fill(0); for (let p = 0; p < P.people; p++) freeRecall(rand, P).forEach((ok, i) => { if (ok) tot[i]++; }); curve = tot.map((v, i) => [i + 1, v / P.people]); const key = P.delay > 0 ? "delay" : "now"; curves[key] = curve; }

// ---------------- 3. The page ----------------
const ui = K.app({
  title: "Models of Memory", subject: "Psychology",
  blurb: "A class of simulated participants learns word lists: the multi-store model's serial position curve, STM duration and capacity, and dual tasks in the working memory model",
  reset: () => { startDemo(); runClass(); },
  levels: { std: "AS (AQA 7181)", adv: "A level (AQA 7182)", specs: {
    std: "AQA AS and A level Psychology (7181/7182) 3.1.2 Memory: the multi-store model (sensory register, STM, LTM; coding, capacity and duration), types of long-term memory, the working memory model (central executive, phonological loop, visuo-spatial sketchpad, episodic buffer), explanations for forgetting, eyewitness testimony.",
    adv: "AQA A level Psychology (7182) Memory plus Research methods: evaluating the classic studies (Peterson and Peterson, Jacobs, Miller, Glanzer and Cunitz, Baddeley) for validity, controls and sampling; interpreting curves and dual-task data; and the strengths and limitations of each model." } },
  missions: [
    { title: "The serial position curve", q: "Watch one participant learn 15 words, then see the whole class's recall by position in the list. Which words are remembered best? Why?", hint: "The first few (primacy) and the last few (recency). Early words were rehearsed more and reached LTM; the last words are still in STM at recall. The middle words got little rehearsal and were pushed out of STM.", setup: () => set({ mode: "serial" }) },
    { title: "Counting backwards", q: "Add a 30-second counting-backwards task before recall (Glanzer and Cunitz, 1966). Which part of the curve disappears?", hint: "Recency vanishes: counting fills STM and displaces the last words. Primacy is unaffected because those words were already in LTM. This supports separate STM and LTM stores.", setup: () => set({ mode: "serial", delay: 30 }) },
    { title: "Slower presentation", q: "Present the words every 4 s instead of every 2 s. Which part of the curve changes?", hint: "Primacy (and the middle) rises: more rehearsal time means more transfer to LTM. Recency barely changes: the last words are in STM either way. Rehearsal affects LTM, not STM.", setup: () => set({ mode: "serial", rate: 4 }) },
    { title: "How long does STM last?", q: "Peterson and Peterson (1959): recall a trigram (e.g. KXR) after counting backwards for 3 to 18 s. Run the class at each delay. What happens?", hint: "About 75–80% after 3 s falling to under 10% after 18 s: without rehearsal, STM lasts less than about 18–30 s. Counting stops rehearsal, but it may also cause interference rather than pure decay.", setup: () => set({ mode: "duration", ppDelay: 3 }) },
    { title: "Capacity: digit span", q: "Test the class's span for letters and for digits. What is the average? What does chunking do?", hint: "About 7 letters and 9 digits (Jacobs, 1887; Miller's 'magical number 7 ± 2'). Chunking (grouping into meaningful units like FBI-BBC) lets more items fit because the capacity is in chunks.", setup: () => set({ mode: "span", span: "letters" }) },
    { lvl: "adv", title: "Dual tasks and working memory", q: "Do a verbal reasoning task alone, with a second verbal task (same slave system), and with a visual task (different system). Compare the times.", hint: "Two verbal tasks compete for the phonological loop and slow each other a lot; a visual task uses the visuo-spatial sketchpad and hardly interferes. Evidence that STM has separate components (Baddeley and Hitch).", setup: () => set({ mode: "dual", task2: "same" }) },
  ],
  batch: [
    { title: "Serial position curve", question: "For a class of 30, what fraction recall each word, by its position in a 15-word list?", how: "Each point: one class of 30 simulated participants, immediate free recall.", xLabel: "position in the list", yLabel: "proportion recalled", xs: [1, 2, 3, 4, 5, 7, 9, 11, 13, 14, 15], reps: 4, yMin: 0, yMax: 1, run: (pos, r) => { let k = 0; for (let p = 0; p < 30; p++) if (freeRecall(r, Object.assign({}, DEF))[pos - 1]) k++; return k / 30; }, note: "U-shaped: primacy (first few) and recency (last four or so) with a trough in the middle." },
    { title: "Glanzer and Cunitz: does a delay remove recency?", question: "How does recall of the LAST word change with the length of a counting-backwards delay?", how: "Each point: a class of 30; recall of word 15.", xLabel: "delay before recall (s)", yLabel: "recall of the last word", xs: [0, 10, 30], reps: 6, yMin: 0, yMax: 1, run: (d, r) => { let k = 0; for (let p = 0; p < 30; p++) if (freeRecall(r, Object.assign({}, DEF, { delay: d }))[14]) k++; return k / 30; }, note: "Any filled delay empties the STM buffer in this model, so the last word drops to LTM-only recall. Glanzer and Cunitz found recency had gone by 30 s." },
    { title: "Peterson and Peterson: duration of STM", question: "What fraction of trigrams are recalled after counting backwards for t seconds?", how: "Each point: 24 participants × 8 trials.", xLabel: "delay t (s)", yLabel: "proportion recalled", xs: [3, 6, 9, 12, 15, 18], reps: 4, yMin: 0, yMax: 1, theory: ppTheory, theoryLabel: "fitted decay 1.18e^(−t/6.5)", run: (t, r) => { let k = 0; for (let i = 0; i < 24 * 8; i++) if (r() < ppTheory(t)) k++; return k / 192; }, note: "A steep fall: most information is lost within about 18 s without rehearsal. (The model is fitted to resemble the original findings.)" },
    { title: "Digit span (Jacobs)", question: "What is the digit span of a randomly chosen participant?", how: "Each run: one participant.", yLabel: "digit span", reps: 400, bins: 12, lo: 4.5, hi: 14.5, theory: 9.3, theoryLabel: "Jacobs: 9.3 digits", run: (x, r) => spanOf(r, "digits", false), note: "Most spans are within about ±2 of the mean, echoing Miller's 7 ± 2 for letters and words. Individual differences (age, practice, chunking) matter." },
    { title: "Dual-task interference (A level)", question: "How much slower is a verbal task when done with a second task using the same slave system, compared with a different one?", how: "Each run: one participant; time (same system) − time (different system).", yLabel: "extra time with the same system (s)", reps: 300, bins: 20, theory: 0.63, theoryLabel: "model's average slow-down", run: (x, r) => dualTaskRT(r, "same") - dualTaskRT(r, "different"), note: "Positive for almost everyone: tasks competing for one component of working memory interfere. The model's numbers are illustrative, not from a particular study." },
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "3.1.2", text: "MSM: sensory register (modality-specific, very brief, large capacity) → attention → STM (acoustic, about 7 ± 2 items, about 18–30 s) → rehearsal → LTM (semantic, unlimited, lifelong). Retrieval brings LTM back into STM." },
      { lvl: "std", tag: "3.1.2", text: "Evidence: Peterson and Peterson (duration of STM), Jacobs and Miller (capacity), Baddeley (1966: acoustic coding in STM, semantic in LTM), serial position effect and Glanzer and Cunitz, case study HM." },
      { lvl: "std", tag: "3.1.2", text: "WMM: central executive (attention, controls the slave systems, limited capacity), phonological loop (phonological store + articulatory process), visuo-spatial sketchpad (visual cache + inner scribe), episodic buffer (added 2000; links to LTM). Evidence: dual-task studies, KF's case." },
      { lvl: "std", tag: "3.1.2", text: "Evaluation: MSM is supported by brain-damage and experimental evidence, but STM and LTM are not single stores (KF; types of LTM) and rehearsal is not the only route to LTM. Many studies use artificial stimuli (low ecological validity)." },
      { lvl: "adv", tag: "Research methods", text: "Classic memory studies are lab experiments with good control and replicability, but artificial tasks (trigrams, word lists) may lack mundane realism; small or student samples limit generalisation." },
    ],
    questions: [
      { lvl: "std", marks: 4, q: () => { const a = curves.now ? curves.now : curve; return `In your class, words 1–3 were recalled by ${(100 * K.mean(a.slice(0, 3).map(q => q[1]))).toFixed(0)}% and words 13–15 by ${(100 * K.mean(a.slice(-3).map(q => q[1]))).toFixed(0)}%, but words 6–9 by ${(100 * K.mean(a.slice(5, 9).map(q => q[1]))).toFixed(0)}%. Explain these results using the multi-store model.`; }, ans: "<ul><li>primacy: the first words were rehearsed more, so were transferred to LTM</li><li>recency: the last words were still in STM at recall</li><li>middle words: displaced from STM by later words before being rehearsed enough</li><li>so the results support separate STM and LTM stores</li></ul>" },
      { lvl: "std", marks: 3, q: "Describe the procedure and findings of Peterson and Peterson (1959).", ans: "<ul><li>participants saw consonant trigrams and then counted backwards in threes from a given number for 3–18 s (to prevent rehearsal)</li><li>about 80% recall after 3 s, falling to under 10% after 18 s</li><li>STM duration without rehearsal is very short (about 18 s)</li></ul>" },
      { lvl: "std", marks: 4, q: "Explain how dual-task studies support the working memory model.", ans: "<ul><li>two tasks that use the same slave system (e.g. two verbal tasks) are done worse together than separately</li><li>tasks using different systems (verbal and visual) can be done together with little loss</li><li>so STM must have separate components with their own limited capacity</li><li>this cannot be explained by a single unitary STM store</li></ul>" },
      { lvl: "adv", marks: 6, q: "Evaluate the multi-store model of memory. [Use evidence from the simulation and from research]", ans: "<ul><li>strength: research support for separate stores (serial position curve and Glanzer and Cunitz, coding/duration/capacity differences, HM)</li><li>limitation: STM is not unitary (KF: verbal STM damaged but visual intact; dual-task evidence)</li><li>limitation: LTM is not unitary (episodic, semantic, procedural)</li><li>limitation: rehearsal is not necessary for transfer (flashbulb memories; Craik and Watkins' type of rehearsal matters)</li><li>methodology: artificial lab tasks, so lower ecological validity</li></ul>" },
    ]
  },
  notes: `<h3>The simulated participants</h3><ul><li><b>Free recall:</b> each participant keeps a rehearsal buffer of B words in STM. When a new word arrives and the buffer is full, a random word is displaced. Each second of rehearsal is shared among the words in the buffer, and a word's chance of reaching LTM is 1 − e^(−θ × its rehearsal time). At immediate recall, words still in the buffer are recalled 95% of the time; others only if they reached LTM. A counting delay empties the buffer.</li><li><b>Duration:</b> recall after t seconds of counting backwards follows 1.18e^(−t/6.5) (at most 1), fitted to resemble Peterson and Peterson's results.</li><li><b>Span:</b> each person's span is drawn from a normal distribution around 7.3 letters or 9.3 digits (Jacobs, 1887), with chunking multiplying the number of items that fit.</li><li><b>Dual tasks:</b> illustrative times: a second task on the same slave system adds about 0.75 s; on a different system about 0.1 s.</li></ul>
<h3>Assumptions and simplifications</h3><ul><li>This is a model in the spirit of Atkinson and Shiffrin's buffer model, not a fit to one study. Real participants use strategies (grouping, imagery, meaning) that the model leaves out.</li><li>Forgetting from STM here is by displacement only; real forgetting may also involve decay and interference.</li><li>Ethics: real memory studies need informed consent and the right to withdraw; simulated participants have neither problem, which is one reason to simulate before running a study.</li></ul>`,
});

// ---------------- 4. Controls ----------------
const C = {};
let g = ui.group("Experiment");
C.mode = K.seg(g, { value: "serial", options: [["serial", "free recall: serial position"], ["duration", "STM duration"], ["span", "STM capacity: span"], ["dual", "working memory: dual task (A level)"]], on: v => set({ mode: v }) });
const gs = ui.group("Free recall"), gd = ui.group("Duration"), gp = ui.group("Span"), gw = ui.group("Dual task");
C.n = K.slider(gs, { label: "Words in the list", min: 6, max: 20, step: 1, value: 15, on: v => { P.n = v; startDemo(); runClass(); } });
C.rate = K.slider(gs, { label: "Seconds per word", min: 1, max: 5, step: 0.5, value: 2, unit: "s", on: v => { P.rate = v; startDemo(); runClass(); } });
C.B = K.slider(gs, { label: "Rehearsal buffer (STM slots)", min: 2, max: 7, step: 1, value: 4, on: v => { P.B = v; startDemo(); runClass(); } });
C.delay = K.seg(gs, { label: "Before recall", value: 0, options: [[0, "recall at once"], [10, "count backwards 10 s"], [30, "count backwards 30 s"]], on: v => { P.delay = v; startDemo(); runClass(); } });
C.people = K.slider(gs, { label: "Participants in the class", min: 5, max: 200, step: 5, value: 30, on: v => { P.people = v; runClass(); } });
C.ppDelay = K.slider(gd, { label: "Counting-backwards delay", min: 0, max: 18, step: 3, value: 9, unit: "s", on: v => P.ppDelay = v });
C.span = K.seg(gp, { value: "letters", options: [["letters", "letters"], ["digits", "digits"]], on: v => P.span = v });
C.chunk = K.toggle(gp, { label: "Allow chunking (e.g. FBI BBC USA)", value: false, on: v => P.chunk = v });
C.task2 = K.seg(gw, { label: "Second task", value: "different", options: [["none", "none"], ["same", "verbal (same system)"], ["different", "visual (different system)"]], on: v => P.task2 = v });
let rw = K.row(ui.controls); K.btn(rw, "▶ Run the class again", () => { runClass(); runOthers(); startDemo(); }, "primary");
const read = K.readout(ui.group("Results"), [["a", ""], ["b", ""], ["c", ""]]);
const relabel = n => n.forEach((x, i) => read.el.children[i].firstElementChild.textContent = x);
let others = {};
function runOthers() {
  const pp = []; for (let t = 0; t <= 18; t += 3) { let k = 0; for (let i = 0; i < P.people * 4; i++) if (rand() < ppTheory(t)) k++; pp.push([t, k / (P.people * 4)]); } others.pp = pp;
  others.spans = Array.from({ length: P.people }, () => spanOf(rand, P.span, P.chunk));
  others.rt = ["none", "same", "different"].map(cnd => Array.from({ length: P.people }, () => dualTaskRT(rand, cnd)));
}
function showCtl() { gs.style.display = P.mode === "serial" ? "" : "none"; gd.style.display = P.mode === "duration" ? "" : "none"; gp.style.display = P.mode === "span" ? "" : "none"; gw.style.display = P.mode === "dual" ? "" : "none"; C.mode.el.querySelectorAll("button")[3].style.display = ui.level === "adv" ? "" : "none"; }
function set(o) { Object.assign(P, DEF, o); if (P.mode === "dual" && ui.setLevel && ui.level !== "adv") ui.setLevel("adv"); for (const k of ["mode", "n", "rate", "B", "delay", "people", "ppDelay", "span", "chunk", "task2"]) C[k].set(P[k]); curves = {}; if (P.delay) { const d = P.delay; P.delay = 0; runClass(); P.delay = d; } runClass(); runOthers(); startDemo(); showCtl(); }

// ---------------- 5. Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#c9d4ea", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,system-ui,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function rbox(c, x, y, w, h, col, title) { c.fillStyle = "#121b30"; c.fillRect(x, y, w, h); c.strokeStyle = col; c.lineWidth = 2; c.strokeRect(x, y, w, h); c.lineWidth = 1; TX(c, title, x + w / 2, y - 8, col, "center", "600 13px"); }
function tick(dt) {
  if (P.mode !== "serial" || !demo) return; demo.t += dt * 1.6;
  if (demo.phase === "learn") { const i = Math.floor(demo.t / P.rate); while (demo.i < Math.min(i, P.n - 1)) { demo.i++; if (demo.buf.length >= P.B) demo.buf.splice(rand.int(demo.buf.length), 1); demo.buf.push(demo.i); } for (const j of demo.buf) { const share = dt * 1.6 / demo.buf.length; demo.time[j] += share; if (!demo.ltm.has(j) && rand() < 1 - Math.exp(-P.theta * share)) demo.ltm.add(j); } if (demo.t > P.n * P.rate + 1) { demo.phase = P.delay ? "delay" : "recall"; demo.t0 = demo.t; if (P.delay) demo.buf = []; } }
  else if (demo.phase === "delay") { if (demo.t - demo.t0 > 4) { demo.phase = "recall"; demo.t0 = demo.t; } }
  else if (demo.phase === "recall") { if (!demo.recalled) { demo.recalled = new Set([...demo.buf.filter(() => rand() < 0.95), ...demo.ltm]); } if (demo.t - demo.t0 > 6) startDemo(); }
}
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1222"; c.fillRect(0, 0, w, h);
  if (P.mode === "serial") {
    const d = demo; const sx = 20, sw = w * 0.2, stx = w * 0.3, stw = w * 0.22, lx = w * 0.62, lw = w * 0.34, y0 = 70, hh = h - 160;
    rbox(c, sx, y0, sw, hh * 0.35, "#c4a1ff", "SENSORY REGISTER"); rbox(c, stx, y0, stw, hh, "#ffb454", "SHORT-TERM MEMORY"); rbox(c, lx, y0, lw, hh, "#7ee787", "LONG-TERM MEMORY");
    c.strokeStyle = "#5d6e93"; c.lineWidth = 2; for (const [a, b, lab] of [[sx + sw, stx, "attention"], [stx + stw, lx, "rehearsal"]]) { c.beginPath(); c.moveTo(a + 4, y0 + 40); c.lineTo(b - 4, y0 + 40); c.stroke(); TX(c, lab, (a + b) / 2, y0 + 30, "#8fa0bf", "center", "11px"); } c.lineWidth = 1;
    if (d.i >= 0 && d.phase === "learn") TX(c, WORDS[d.i % WORDS.length], sx + sw / 2, y0 + 50, "#fff", "center", "600 16px");
    // rehearsal buffer slots
    for (let k = 0; k < P.B; k++) { const y = y0 + 20 + k * 44, j = d.buf[k]; c.fillStyle = "#0b1222"; c.fillRect(stx + 14, y, stw - 28, 36); c.strokeStyle = "#5d6e93"; c.strokeRect(stx + 14, y, stw - 28, 36); if (j != null) TX(c, WORDS[j % WORDS.length], stx + stw / 2, y + 23, "#ffd9a0", "center", "600 14px"); }
    TX(c, d.phase === "delay" ? "counting backwards: 397, 394, 391…" : `${P.B} slots: a new word pushes out a random old one`, stx + stw / 2, y0 + hh - 14, "#8fa0bf", "center", "11px");
    [...d.ltm].sort((a, b) => a - b).forEach((j, k) => TX(c, WORDS[j % WORDS.length] + "  (word " + (j + 1) + ")", lx + 16 + (k % 2) * lw / 2, y0 + 30 + Math.floor(k / 2) * 22, "#7ee787", "left", "13px"));
    // list and recall result
    const ly = h - 64; TX(c, "list:", 20, ly, "#8fa0bf", "left", "12px"); for (let j = 0; j < P.n; j++) { const x = 60 + j * Math.min(64, (w - 80) / P.n); const rec = d.recalled && d.recalled.has(j); TX(c, WORDS[j % WORDS.length].slice(0, 6), x, ly, j > d.i ? "#3a4a6e" : d.phase === "recall" ? (rec ? "#7ee787" : "#ff6b81") : "#c9d4ea", "left", "11px"); }
    if (d.phase === "recall") TX(c, `recalled ${d.recalled.size} of ${P.n}: green = recalled, red = forgotten`, 20, ly + 26, "#c9d4ea", "left", "600 13px");
    ui.hud(d.phase === "learn" ? `presenting word ${d.i + 1} of ${P.n}` : d.phase === "delay" ? "delay: counting backwards" : "free recall (any order)");
  } else if (P.mode === "duration") {
    const t = P.ppDelay, p = ppTheory(t), cols = 12, rows = Math.ceil(P.people / cols), s = Math.min(46, (w - 60) / cols, (h - 200) / rows);
    TX(c, `PETERSON AND PETERSON: see a trigram (e.g. KXR), count backwards in 3s for ${t} s, then recall it`, 20, 30, "#ffd166", "left", "600 14px");
    const rr = K.rng(7 + t); for (let i = 0; i < P.people; i++) { const ok = rr() < p, x = 30 + (i % cols) * (s + 8), y = 70 + Math.floor(i / cols) * (s + 26); c.fillStyle = ok ? "#2e9e5b" : "#7a2633"; c.beginPath(); c.arc(x + s / 2, y + s / 2, s / 2, 0, 6.3); c.fill(); TX(c, ok ? "KXR" : "K??", x + s / 2, y + s + 14, ok ? "#7ee787" : "#ff9aa9", "center", "11px"); }
    ui.hud(`delay ${t} s: about ${(100 * p).toFixed(0)}% recall the trigram`);
  } else if (P.mode === "span") {
    const sp = others.spans, m = K.mean(sp); TX(c, `SPAN TEST (${P.span}${P.chunk ? ", with chunking" : ""}): read a sequence, repeat it back; the sequence grows until they fail`, 20, 30, "#ffd166", "left", "600 14px");
    const ex = P.span === "digits" ? "7 3 9 1 5 8 2 6 4 0 3" : P.chunk ? "FBI BBC USA NHS ITV" : "K R P T M L B X Q S W"; TX(c, "example sequence: " + ex, 20, 60, "#c9d4ea", "left", "14px Consolas,monospace,");
    sp.slice(0, 40).forEach((v, i) => { const y = 90 + (i % 20) * ((h - 120) / 20), x = 20 + Math.floor(i / 20) * w / 2; TX(c, `P${i + 1}`, x, y + 12, "#8fa0bf", "left", "11px"); c.fillStyle = "#5ad1ff"; c.fillRect(x + 36, y, v * (w / 2 - 80) / 20, 12); TX(c, v, x + 40 + v * (w / 2 - 80) / 20, y + 11, "#fff", "left", "11px"); });
    ui.hud(`class mean span ${m.toFixed(1)} ${P.chunk ? "items (in chunks)" : P.span}`);
  } else {
    const rt = others.rt, lab = ["task alone", "+ verbal task (same system)", "+ visual task (different system)"];
    TX(c, "WORKING MEMORY: a verbal reasoning task, alone or with a second task", 20, 30, "#ffd166", "left", "600 14px");
    // the working memory model diagram, highlighting which systems are in use
    const cx = w / 2, cy = 120; const box = (x, y, bw, bh, t, on) => { c.fillStyle = on ? "rgba(255,180,84,.22)" : "#121b30"; c.fillRect(x - bw / 2, y, bw, bh); c.strokeStyle = on ? "#ffb454" : "#5d6e93"; c.lineWidth = 2; c.strokeRect(x - bw / 2, y, bw, bh); c.lineWidth = 1; TX(c, t, x, y + bh / 2 + 5, "#fff", "center", "600 13px"); };
    box(cx, cy - 40, 220, 44, "central executive", true); box(cx - 200, cy + 70, 220, 44, "phonological loop", true); box(cx + 200, cy + 70, 220, 44, "visuo-spatial sketchpad", P.task2 === "different"); box(cx, cy + 150, 200, 40, "episodic buffer", false);
    if (P.task2 === "same") TX(c, "BOTH tasks need the phonological loop → interference", cx - 200, cy + 140, "#ff9aa9", "center", "600 12px"); if (P.task2 === "different") TX(c, "tasks use different slave systems → little interference", cx, cy + 220, "#7ee787", "center", "600 12px");
    const yb = h - 110; lab.forEach((l, i) => { const m = K.mean(rt[i]), on = (i === 0 && P.task2 === "none") || (i === 1 && P.task2 === "same") || (i === 2 && P.task2 === "different"); c.fillStyle = on ? "#ffb454" : "#3d7fbf"; c.fillRect(220, yb + i * 30, m * 160, 22); TX(c, l, 210, yb + i * 30 + 16, "#c9d4ea", "right", "12px"); TX(c, m.toFixed(2) + " s", 226 + m * 160, yb + i * 30 + 16, "#fff", "left", "600 12px"); });
    ui.hud(`mean time: alone ${K.mean(rt[0]).toFixed(2)} s`);
  }
}
function panels() {
  if (P.mode === "serial") {
    const a = curve; relabel(["Primacy (words 1–3)", "Middle (words 6–9)", "Recency (last 3)"]); read.set("a", (100 * K.mean(a.slice(0, 3).map(q => q[1]))).toFixed(0) + "%"); read.set("b", (100 * K.mean(a.slice(5, 9).map(q => q[1]))).toFixed(0) + "%"); read.set("c", (100 * K.mean(a.slice(-3).map(q => q[1]))).toFixed(0) + "%");
    chA.opts.title = `Serial position curve: ${P.people} participants`; chA.opts.xLabel = "position in the list"; chA.opts.yLabel = "proportion recalled";
    const ser = []; if (curves.now) ser.push({ pts: curves.now, color: K.cssVar("--s1"), label: "recall at once" }); if (curves.delay) ser.push({ pts: curves.delay, color: K.cssVar("--s0"), label: "after counting" }); chA.draw(ser.concat(ser.map(s => ({ pts: s.pts, type: "dots", color: s.color }))), { yMin: 0, yMax: 1 });
    const times = []; for (let i = 0; i < P.n; i++) times.push([i + 1, 0]); const rr = K.rng(5); for (let p = 0; p < 200; p++) { const buf = [], tm = new Array(P.n).fill(0); for (let i = 0; i < P.n; i++) { if (buf.length >= P.B) buf.splice(rr.int(buf.length), 1); buf.push(i); for (const j of buf) tm[j] += P.rate / buf.length; } tm.forEach((v, i) => times[i][1] += v / 200); }
    chB.opts.title = "Average rehearsal time each word got"; chB.opts.xLabel = "position in the list"; chB.opts.yLabel = "seconds in STM"; chB.draw([{ pts: times, type: "bars", w: 0.7, color: K.cssVar("--s4") }], { yMin: 0 });
  } else if (P.mode === "duration") {
    relabel(["Delay", "Recalled (class)", "Model"]); read.set("a", P.ppDelay + " s"); read.set("b", (100 * others.pp.find(q => q[0] === P.ppDelay)[1]).toFixed(0) + "%"); read.set("c", (100 * ppTheory(P.ppDelay)).toFixed(0) + "%");
    const th = []; for (let t = 0; t <= 18; t += 0.5) th.push([t, ppTheory(t)]); chA.opts.title = "Recall against delay (class results and the model)"; chA.opts.xLabel = "delay (s)"; chA.opts.yLabel = "proportion recalled"; chA.draw([{ pts: th, color: K.cssVar("--s1"), label: "model" }, { pts: others.pp, type: "dots", r: 5, color: K.cssVar("--s0"), label: "class" }], { yMin: 0, yMax: 1, vlines: [{ x: P.ppDelay }] });
    chB.opts.title = ""; chB.opts.xLabel = chB.opts.yLabel = ""; chB.draw([]);
  } else if (P.mode === "span") {
    const sp = others.spans; relabel(["Mean span", "SD", "Range"]); read.set("a", K.mean(sp).toFixed(2)); read.set("b", K.sd(sp).toFixed(2)); read.set("c", `${Math.min(...sp)}–${Math.max(...sp)}`);
    const hg = K.histogram(sp, Math.max(...sp) - Math.min(...sp) + 1, Math.min(...sp) - 0.5, Math.max(...sp) + 0.5); chA.opts.title = "Spans in the class"; chA.opts.xLabel = "span"; chA.opts.yLabel = "participants"; chA.draw([{ pts: hg.pts, w: hg.w, type: "bars", color: K.cssVar("--s0"), alpha: .8 }], { vlines: [{ x: 7, label: "Miller: 7 ± 2", color: K.cssVar("--s2") }] });
    chB.opts.title = ""; chB.opts.xLabel = chB.opts.yLabel = ""; chB.draw([]);
  } else {
    const rt = others.rt; relabel(["Alone", "Same system", "Different system"]); ["a", "b", "c"].forEach((k, i) => read.set(k, `${K.mean(rt[i]).toFixed(2)} s (SD ${K.sd(rt[i]).toFixed(2)})`));
    chA.opts.title = "Mean time with ± 1 SD"; chA.opts.xLabel = "condition: 1 alone, 2 same, 3 different"; chA.opts.yLabel = "time (s)"; chA.draw([{ pts: rt.map((a, i) => [i + 1, K.mean(a), K.sd(a)]), type: "err", r: 5, color: K.cssVar("--s1") }], { xMin: 0.5, xMax: 3.5, yMin: 0 });
    chB.opts.title = ""; chB.opts.xLabel = chB.opts.yLabel = ""; chB.draw([]);
  }
}
let frame = 0;
ui.run(dt => tick(dt), () => { draw(); if (frame++ % 6 === 0) panels(); });
ui.onLevel = v => { if (v === "std" && P.mode === "dual") set({}); showCtl(); };
set({});
ui.tip("One participant learns the list (top); the chart shows the whole class's recall.", 7000);
