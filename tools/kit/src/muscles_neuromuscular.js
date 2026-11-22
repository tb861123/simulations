/* =====================================================================
   MUSCLES AND THE NEUROMUSCULAR SYSTEM
   A muscle is controlled in MOTOR UNITS: one motor neurone and all the
   fibres it supplies. A motor unit obeys the ALL-OR-NONE law: an impulse
   above threshold makes every one of its fibres contract fully, or none.
   So the brain grades force in two ways:
     SPATIAL SUMMATION (recruitment)  bring in more motor units, small slow
                    ones first and big fast ones last (the size principle);
     WAVE SUMMATION  send impulses faster, so each twitch starts before the
                    last has relaxed; at high frequency the twitches fuse
                    into one smooth, maximal contraction: TETANUS.
   Three FIBRE TYPES: slow oxidative (type I: weak, tireless), fast oxidative
   glycolytic (type IIa) and fast glycolytic (type IIx: strong, tires fast).
   PROPRIOCEPTORS: muscle spindles detect stretch and trigger the stretch
   reflex; Golgi tendon organs detect tension and, after a few seconds of a
   strong contraction, make the muscle relax (autogenic inhibition), which
   PNF stretching uses to gain range.
   ===================================================================== */
const TYPES = { I: { name: "Slow oxidative (type I)", col: "#ff6b81", twitch: 0.11, force: 1, fat: 0.0005, rec: 0.01 }, IIa: { name: "Fast oxidative glycolytic (type IIa)", col: "#c4a1ff", twitch: 0.05, force: 3, fat: 0.006, rec: 0.02 }, IIx: { name: "Fast glycolytic (type IIx)", col: "#f5f5f5", twitch: 0.035, force: 6, fat: 0.03, rec: 0.03 } };
// a single twitch: force rises and falls with time-to-peak tp (s): f(t) = (t/tp) e^(1 − t/tp)
const twitch = (t, tp) => t <= 0 ? 0 : (t / tp) * Math.exp(1 - t / tp);
// force of one motor unit stimulated at f Hz for a time T: twitches add, but the fibre cannot exceed about 4 × one twitch (saturation)
function unitForce(f, tp, T = 1, dt = 0.002) { const out = []; let last = -1; const spikes = []; for (let t = 0; t <= T; t += dt) { if (f > 0 && t - last >= 1 / f - 1e-9) { spikes.push(t); last = t; } let s = 0; for (const sp of spikes) s += twitch(t - sp, tp); out.push([t, 4 * Math.tanh(s / 4)]); } return out; }
const peakAt = f => { const pts = unitForce(f, TYPES.IIa.twitch, 0.6); return Math.max(...pts.map(p => p[1])) / 4 * 100; };
// a muscle of 120 motor units, ordered smallest (type I) to largest (IIx): the size principle
function makeMuscle(pctI, r) { const n = 120, nI = Math.round(n * pctI), nIIx = Math.round((n - nI) * 0.4), out = [];
  for (let i = 0; i < n; i++) { const tp = i < nI ? "I" : i < n - nIIx ? "IIa" : "IIx", T = TYPES[tp]; out.push({ type: tp, size: T.force * (0.8 + 0.4 * (r ? r() : 0.5)) * (1 + i / n), fat: 1, T }); }
  out.sort((a, b) => a.size - b.size); return out; }
const maxForce = m => m.reduce((s, u) => s + u.size, 0);
/* Hold a target force (fraction of the fresh maximum) for a time; each second the brain recruits units in size order until the target is met.
   Active units fatigue (type IIx fastest); resting ones recover. Returns force and units active each second, and when the target can no longer be met. */
function hold(m, target, secs) { const F0 = maxForce(m), out = []; let fail = null;
  for (let s = 0; s <= secs; s++) { let need = target * F0, got = 0, n = 0; for (const u of m) { if (got >= need) { u.fat = Math.min(1, u.fat + u.T.rec); continue; } got += u.size * u.fat; n++; u.fat = Math.max(0, u.fat - u.T.fat); }
    out.push({ s, force: 100 * Math.min(got, need) / F0, units: n, byType: ["I", "IIa", "IIx"].map(k => m.filter(u => u.type === k).reduce((a, u) => a + u.fat, 0) / Math.max(1, m.filter(u => u.type === k).length)) });
    if (got < need * 0.98 && fail === null) fail = s; }
  return { out, fail }; }
// number of motor units recruited (size principle) to produce a force, fresh muscle
function recruited(m, target) { const need = target * maxForce(m); let got = 0, n = 0; for (const u of m) { if (got >= need) break; got += u.size; n++; } return n; }
// flexibility: range of motion gain (degrees) over 6 weeks; PNF > static > ballistic, with individual differences
const ROM_GAIN = { static: 9, pnf: 13, ballistic: 6 };
const romGain = (method, weeks, r) => ROM_GAIN[method] * (1 - Math.exp(-weeks / 4)) / (1 - Math.exp(-6 / 4)) * (1 + 0.25 * r.gauss());

// ---------------- The page ----------------
const DEF = { view: "unit", freq: 10, ftype: "IIa", pctI: 0.5, target: 0.4, secs: 120, stretch: "pnf", phase: 0 };
const P = Object.assign({}, DEF); let muscle = null, holdRes = null, t = 0, seed = 1;
const ui = K.app({
  title: "Muscles and the Neuromuscular System", subject: "Physical Education",
  blurb: "Motor units and the all-or-none law, wave summation and tetanus, recruitment by size, fibre types and fatigue, spindles, Golgi tendon organs and PNF stretching",
  reset: () => set({ view: P.view }),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "OCR GCSE (9–1) Physical Education (J587) 1.1 Applied anatomy and physiology: the muscular system (antagonistic pairs, types of contraction) and how muscles produce more force; slow and fast twitch fibres and their suitability for different activities.", adv: "OCR A level Physical Education (H555) 1.1 Applied anatomy and physiology: neuromuscular system: muscle fibre types (slow oxidative, fast oxidative glycolytic, fast glycolytic) and their characteristics, motor units and the all-or-none law, spatial summation (recruitment), wave summation and tetanic contraction, proprioceptors (muscle spindles and Golgi tendon organs) and PNF stretching." } },
  missions: [
    { title: "Faster impulses, more force", q: "Single motor unit. Stimulate at 2 Hz, then 10 Hz, then 50 Hz. What happens to the twitches?", hint: "At 2 Hz each twitch relaxes before the next. At 10 Hz they start to add up (wave summation). At 50 Hz they fuse into one smooth, strong contraction: tetanus. More force without extra motor units.", setup() { set({ view: "unit", freq: 2 }); } },
    { title: "Slow and fast fibres", q: "Compare the twitch of a type I and a type IIx motor unit at 5 Hz. Which is faster? Which needs a higher frequency to reach tetanus?", hint: "Type IIx twitches are about three times quicker, so they relax between impulses at frequencies where type I twitches already fuse. Type I units are weaker but use oxygen and hardly tire.", setup() { set({ view: "unit", freq: 5, ftype: "I" }); } },
    { title: "Recruitment by size", q: "Whole muscle. Raise the target force from 10% to 90%. Which motor units join first? When do the type IIx units join?", hint: "The size principle: small type I units first (fine control at low force), then IIa, and the big IIx units only near maximal effort. Light jogging uses mostly type I fibres; a sprint start recruits everything.", setup() { set({ view: "muscle", target: 0.1 }); } },
    { title: "Sprinter or marathon runner?", q: "Hold 60% of maximum force with a muscle that is 20% type I (a sprinter's), then 80% type I (a marathon runner's). Who keeps it up longer?", hint: "The fast-fibre muscle is stronger but its IIx fibres tire within seconds. The slow-fibre muscle cannot produce as much force but sustains moderate forces for a long time. Fibre type suits the event.", setup() { set({ view: "muscle", target: 0.6, pctI: 0.2 }); } },
    { lvl: "adv", title: "PNF stretching", q: "Stretching. Watch a PNF stretch: stretch, contract the muscle isometrically, then relax and stretch further. Why does the second stretch go further?", hint: "During the 6–10 s isometric contraction the Golgi tendon organs sense high tension and inhibit the muscle (autogenic inhibition), overriding the muscle spindles' stretch reflex. The relaxed muscle can then be stretched further.", setup() { set({ view: "stretch", stretch: "pnf" }); } },
    { lvl: "adv", title: "The stretch reflex", q: "Now a ballistic (bouncing) stretch. What do the muscle spindles do? Why is this riskier?", hint: "Rapid stretch fires the spindles, which trigger the stretch reflex: the muscle contracts against the stretch. Bouncing works against it and can cause strains; static and PNF stretches avoid triggering the reflex strongly.", setup() { set({ view: "stretch", stretch: "ballistic" }); } }
  ],
  batch: [
    { title: "Force against impulse frequency", question: "How does the peak force of a motor unit depend on the frequency of impulses?", how: "A type IIa unit stimulated for 0.6 s; the peak force as % of full tetanus; ±3% measurement noise.", xLabel: "impulse frequency (Hz)", yLabel: "peak force (% of tetanus)", xs: [1, 5, 10, 20, 30, 50, 80], reps: 5, yMin: 0, theory: f => peakAt(f), theoryLabel: "summed twitches", run: (f, r) => peakAt(f) * (1 + 0.03 * r.gauss()), note: "An S-shaped curve: little gain until twitches overlap, a steep rise, then a plateau at tetanus." },
    { title: "Recruitment and force", question: "How many motor units are recruited for each force?", how: "A 120-unit muscle (50% type I), each with its own size; units recruited smallest first.", xLabel: "force (% of maximum)", yLabel: "motor units recruited", xs: [10, 20, 40, 60, 80, 100], reps: 6, yMin: 0, run: (f, r) => recruited(makeMuscle(0.5, r), f / 100), note: "Early on, each extra unit adds little force (small units), so many units are needed for low forces; near maximum, the last few big units add a lot. That is the size principle giving fine control at low force." },
    { title: "Fibre type and endurance", question: "How long can a muscle hold 50% of its maximum, depending on its share of type I fibres?", how: "Hold until the target can no longer be met (up to 600 s).", xLabel: "share of type I fibres", yLabel: "time to failure (s)", xs: [0.2, 0.35, 0.5, 0.65, 0.8], reps: 6, yMin: 0, run: (p, r) => { const h = hold(makeMuscle(p, r), 0.5, 600); return h.fail == null ? 600 : h.fail; }, note: "More type I fibres, much longer endurance: they are fatigue-resistant because they make ATP aerobically." },
    { lvl: "adv", title: "Which stretch gains most range?", question: "How much range of motion do 6 weeks of each type of stretching add?", how: "1 ballistic, 2 static, 3 PNF; individuals vary by ±25%.", xLabel: "method (1 ballistic, 2 static, 3 PNF)", yLabel: "gain in range (degrees)", xs: [1, 2, 3], reps: 20, yMin: 0, theory: i => ROM_GAIN[["ballistic", "static", "pnf"][Math.round(i) - 1] || "static"], theoryLabel: "typical", run: (i, r) => romGain(["ballistic", "static", "pnf"][i - 1], 6, r), note: "PNF gives the largest gains (autogenic inhibition lets the muscle relax into a deeper stretch); ballistic the least, and it carries the most risk." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "J587 1.1", text: "Slow twitch fibres (type I): contract slowly, produce little force, are very fatigue-resistant: endurance events. Fast twitch fibres (type II): contract quickly and powerfully but tire quickly: sprinting, jumping, throwing." },
      { lvl: "std", tag: "J587 1.1", text: "Muscles work in antagonistic pairs (biceps and triceps); contractions can be isotonic (concentric shortening, eccentric lengthening) or isometric (no change in length)." },
      { lvl: "adv", tag: "H555 1.1", text: "Fibre types: slow oxidative (I), fast oxidative glycolytic (IIa), fast glycolytic (IIx). Differences in motor neurone size, contraction speed, force, fatigue resistance, mitochondria, myoglobin and capillary density." },
      { lvl: "adv", tag: "H555 1.1", text: "A motor unit = a motor neurone and its fibres. All-or-none law: a stimulus at or above threshold makes all the fibres contract fully. Force is graded by spatial summation (recruiting more and larger units) and wave summation (more frequent impulses, up to tetanus)." },
      { lvl: "adv", tag: "H555 1.1", text: "Muscle spindles detect stretch and cause the stretch reflex. Golgi tendon organs detect tension and cause autogenic inhibition (relaxation). PNF: stretch, isometric contraction for 6–10 s, relax and stretch further." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: "Explain why a 100 m sprinter benefits from a high proportion of fast twitch fibres.", ans: "<ul><li>fast twitch fibres contract quickly</li><li>and produce large forces / power</li><li>the race is short, so their fast fatigue does not matter</li></ul>" },
      { lvl: "adv", marks: 4, q: "Explain how wave summation and spatial summation allow a muscle to produce a strong, smooth contraction.", ans: "<ul><li>wave summation: repeated impulses before relaxation add the twitches</li><li>high frequency gives a fused tetanic contraction (smooth, maximal)</li><li>spatial summation: recruiting more motor units, bigger ones last</li><li>units can also fire in rotation (asynchronously) to delay fatigue</li></ul>" },
      { lvl: "adv", marks: 3, q: "Explain the role of the Golgi tendon organs in PNF stretching.", ans: "<ul><li>during the isometric contraction, tension in the tendon rises</li><li>Golgi tendon organs detect it and cause autogenic inhibition</li><li>the muscle relaxes, so it can be stretched further</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li><b>A twitch:</b> f(t) = (t/tₚ) e^(1 − t/tₚ), time to peak tₚ = 110 ms (type I), 50 ms (IIa), 35 ms (IIx). Twitches add; the total saturates at about four times one twitch (4 tanh(sum/4)), giving tetanus.</li>
<li><b>Muscle:</b> 120 motor units; a chosen share are type I, of the rest 60% IIa and 40% IIx. Unit size (force) is 1 (I), 3 (IIa) or 6 (IIx), with individual variation, and units are recruited from smallest to largest.</li>
<li><b>Fatigue:</b> each second an active unit loses 0.05% (I), 0.6% (IIa) or 3% (IIx) of its force; resting units recover 1–3% a second.</li>
<li><b>Stretching:</b> range-of-motion gains after 6 weeks: PNF 13°, static 9°, ballistic 6° on average, with ±25% individual differences (typical of training studies).</li></ul>
<h3>Simplifications</h3><ul><li>Twitch shapes and fatigue rates are simplified; real fatigue depends on blood flow, pH and glycogen.</li><li>Units are recruited strictly by size; real recruitment varies with the task.</li></ul>`
});

// ---------------- Controls ----------------
const ctl = {}; let g = ui.group("View");
ctl.view = K.seg(g, { value: "unit", options: [["unit", "⚡ One motor unit"], ["muscle", "💪 Whole muscle"], ["stretch", "🧘 Stretching (A level)"]], on: v => set({ view: v }) });
const gp = {}; gp.unit = g = ui.group("Motor unit");
ctl.freq = K.slider(g, { label: "Impulse frequency", min: 0, max: 80, step: 1, value: 10, unit: "Hz", on: v => { P.freq = v; t = 0; } });
ctl.ftype = K.seg(g, { label: "Fibre type", value: "IIa", options: [["I", "Type I"], ["IIa", "Type IIa"], ["IIx", "Type IIx"]], on: v => { P.ftype = v; t = 0; } });
gp.muscle = g = ui.group("Muscle");
ctl.pctI = K.slider(g, { label: "Share of type I (slow) fibres", min: 0.1, max: 0.9, step: 0.05, value: 0.5, fmt: v => (v * 100).toFixed(0) + "%" + (v < 0.3 ? " (sprinter)" : v > 0.7 ? " (marathon runner)" : ""), on: v => { P.pctI = v; rebuild(); } });
ctl.target = K.slider(g, { label: "Target force", min: 0.05, max: 1, step: 0.05, value: 0.4, fmt: v => (v * 100).toFixed(0) + "% of maximum", on: v => { P.target = v; rebuild(); } });
gp.stretch = g = ui.group("Stretch");
ctl.stretch = K.seg(g, { label: "Method", value: "pnf", options: [["static", "Static"], ["pnf", "PNF"], ["ballistic", "Ballistic"]], on: v => { P.stretch = v; t = 0; } });
K.btn(K.row(ui.group("")), "↺ Again", () => { t = 0; seed++; rebuild(); }, "primary");
const read = K.readout(ui.group("Readings"), [["a", "–"], ["b", "–"], ["c", "–"], ["d", "–"]]);
const label = (i, s) => { read.el.children[i].firstElementChild.textContent = s; };
function sync() { ctl.view.set(P.view); for (const k in gp) gp[k].style.display = k === P.view ? "" : "none"; ctl.freq.set(P.freq); ctl.ftype.set(P.ftype); ctl.pctI.set(P.pctI); ctl.target.set(P.target); ctl.stretch.set(P.stretch); ctl.view.el.querySelectorAll("button")[2].style.display = ui.level === "adv" ? "" : "none"; }
function set(o) { Object.assign(P, DEF, o); if (ui.level !== "adv" && P.view === "stretch") P.view = "unit"; sync(); rebuild(); t = 0; }
function rebuild() { muscle = makeMuscle(P.pctI, K.rng(seed)); holdRes = hold(makeMuscle(P.pctI, K.rng(seed)), P.target, P.secs); t = 0; }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function WRAP(c, s, x, y, maxW, lh = 15, col = "#8fa0bf", f = "11.5px") { c.font = f + " Segoe UI,sans-serif"; let line = ""; for (const wd of s.split(" ")) { if (c.measureText(line + wd).width > maxW && line) { TX(c, line, x, y, col, "left", f); y += lh; line = ""; } line += wd + " "; } TX(c, line, x, y, col, "left", f); return y + lh; }
// the stretching sequence: [time s, phase, muscle length (0–1), spindle activity, GTO activity, muscle tension]
function stretchState(method, tt) { if (method === "pnf") { if (tt < 3) return { ph: "1. Passive stretch to the limit", L: 0.6 * tt / 3, sp: 0.3, gto: 0.1, ten: 0.2 }; if (tt < 11) return { ph: "2. Isometric contraction against a partner (6–10 s)", L: 0.6, sp: 0.2, gto: Math.min(1, (tt - 3) / 4), ten: 0.9 }; if (tt < 13) return { ph: "3. Relax: Golgi tendon organs inhibit the muscle", L: 0.6, sp: 0.05, gto: 0.6, ten: 0.05 }; return { ph: "4. Stretch further while it is inhibited", L: Math.min(0.85, 0.6 + 0.25 * (tt - 13) / 3), sp: 0.15, gto: 0.4, ten: 0.1 }; }
  if (method === "static") return { ph: tt < 3 ? "Slow stretch to the limit" : "Hold for 30 s: spindles quieten down", L: Math.min(0.72, 0.65 * tt / 3 + 0.004 * Math.max(0, tt - 3)), sp: tt < 3 ? 0.4 : Math.max(0.1, 0.4 - 0.03 * (tt - 3)), gto: 0.15, ten: 0.15 };
  const b = Math.abs(Math.sin(tt * 3)); return { ph: "Bouncing: the stretch reflex fights back", L: 0.4 + 0.25 * b, sp: 0.3 + 0.7 * b, gto: 0.1, ten: 0.2 + 0.7 * b }; }
function draw(dt) {
  const c = cv.ctx, w = cv.w, h = cv.h, adv = ui.level === "adv"; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h);
  if (P.view === "unit") { const T = TYPES[P.ftype];
    // a motor neurone to a bundle of fibres; impulses run down the axon
    TX(c, `One ${T.name} motor unit`, 24, 34, "#eef2f8", "left", "600 15px");
    c.fillStyle = "#ffd166"; c.beginPath(); c.arc(70, 90, 18, 0, 6.3); c.fill(); TX(c, "motor neurone", 70, 124, "#8fa0bf", "center", "11px");
    c.strokeStyle = "#ffd166"; c.lineWidth = 3; c.beginPath(); c.moveTo(88, 90); c.lineTo(w * 0.42, 90); c.stroke(); c.lineWidth = 1;
    if (P.freq > 0) { const period = 1 / P.freq, slow = 4; for (let k = 0; k < 8; k++) { const ph = ((t / slow) % period) / period, x = 88 + ((ph + k / 8 * 0) % 1) * (w * 0.42 - 88); if (k === 0) { c.fillStyle = "#fff"; c.beginPath(); c.arc(x, 90, 5, 0, 6.3); c.fill(); } } }
    // fibres contract with the current force
    const pts = unitForce(P.freq, T.twitch, 1), idx = Math.floor(((t / 4) % 1) / 0.002), F = pts[Math.min(pts.length - 1, idx)][1] / 4;
    for (let k = 0; k < 6; k++) { const y = 60 + k * 14, len = (w * 0.38) * (1 - 0.18 * F); c.fillStyle = T.col; c.globalAlpha = 0.85; c.fillRect(w * 0.42 + 10, y, len, 9); c.globalAlpha = 1; c.strokeStyle = "#ffd166"; c.beginPath(); c.moveTo(w * 0.42, 90); c.lineTo(w * 0.42 + 10, y + 4); c.stroke(); }
    TX(c, "muscle fibres (all contract together: all-or-none)", w * 0.42 + 10, 160, "#8fa0bf", "left", "11px");
    let y = 200; y = WRAP(c, P.freq === 0 ? "No impulses: the fibres are relaxed." : P.freq < 6 ? "Low frequency: separate twitches, each relaxing before the next." : P.freq < 30 ? "Twitches overlap and add up: wave summation." : "Twitches fuse into one smooth maximal contraction: tetanus.", 24, y, w - 48, 18, "#cfd8ea", "13px");
    TX(c, `force now ${(100 * F).toFixed(0)}% of tetanus (slowed down 4×)`, 24, y + 10, "#ffd166", "left", "600 13px");
  } else if (P.view === "muscle") { const R = holdRes, k = Math.min(R.out.length - 1, Math.floor(t * 8)), st = R.out[k];
    TX(c, `Holding ${(100 * P.target).toFixed(0)}% of maximum force · ${st.s} s`, 24, 34, "#eef2f8", "left", "600 15px");
    // motor units as a grid, smallest first; lit if recruited, shaded by fatigue
    const cols = 20, sz = Math.min(26, (w * 0.6) / cols), x0 = 24, y0 = 60; let need = P.target * maxForce(muscle), got = 0; const m2 = makeMuscle(P.pctI, K.rng(seed)); const fresh = hold(m2, P.target, k);
    m2.forEach((u, i) => { const x = x0 + (i % cols) * sz, y = y0 + Math.floor(i / cols) * sz; const on = got < need; if (on) got += u.size * u.fat; c.fillStyle = u.T.col; c.globalAlpha = on ? 0.25 + 0.75 * u.fat : 0.12; c.beginPath(); c.arc(x + sz / 2, y + sz / 2, Math.sqrt(u.size) * sz * 0.14 + 2, 0, 6.3); c.fill(); c.globalAlpha = 1; });
    let tx = x0 + cols * sz + 20, ty = 70; for (const kk of ["I", "IIa", "IIx"]) { c.fillStyle = TYPES[kk].col; c.beginPath(); c.arc(tx + 6, ty - 4, 6, 0, 6.3); c.fill(); TX(c, TYPES[kk].name, tx + 18, ty, "#cfd8ea", "left", "11.5px"); ty += 20; }
    ty += 8; TX(c, `${st.units} of 120 motor units active`, tx, ty, "#ffd166", "left", "600 13px"); ty += 20; TX(c, R.fail == null ? "target still met" : st.s >= R.fail ? `cannot hold the target since ${R.fail} s` : `will fail at ${R.fail} s`, tx, ty, R.fail != null && st.s >= R.fail ? "#ff6b81" : "#cfd8ea", "left", "12.5px"); ty += 26;
    WRAP(c, "Small type I units are recruited first. As they and the IIa units tire (fading circles), bigger IIx units are called in, and they tire fastest of all.", tx, ty, w - tx - 16, 16, "#aab6cc", "12px");
  } else { const s = stretchState(P.stretch, t % 18);
    TX(c, { pnf: "PNF stretch of the hamstrings", static: "Static stretch", ballistic: "Ballistic (bouncing) stretch" }[P.stretch], 24, 34, "#eef2f8", "left", "600 15px"); TX(c, s.ph, 24, 56, "#ffd166", "left", "600 13px");
    // a leg raised by a partner: angle from the muscle length
    const hx = w * 0.3, hy = h * 0.72, ang = -Math.PI / 2 * (0.3 + 0.75 * s.L), L1 = 150; c.strokeStyle = "#8fa0bf"; c.lineWidth = 14; c.lineCap = "round"; c.beginPath(); c.moveTo(hx - 160, hy); c.lineTo(hx, hy); c.stroke(); c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx + L1 * Math.cos(ang), hy + L1 * Math.sin(ang)); c.stroke(); c.lineWidth = 1; c.lineCap = "butt";
    c.strokeStyle = `rgba(255,107,129,${0.4 + 0.6 * s.ten})`; c.lineWidth = 6 + 6 * s.ten; c.beginPath(); c.moveTo(hx + 10, hy + 10); c.lineTo(hx + L1 * 0.8 * Math.cos(ang) + 8, hy + L1 * 0.8 * Math.sin(ang) + 10); c.stroke(); c.lineWidth = 1;
    TX(c, `hip angle ${(90 * (0.3 + 0.75 * s.L)).toFixed(0)}°`, hx + 40, hy + 30, "#cfd8ea", "left", "12px");
    // receptor meters
    const bar = (x, y, v, lab, col) => { c.fillStyle = "#1a2238"; c.fillRect(x, y, 200, 14); c.fillStyle = col; c.fillRect(x, y, 200 * v, 14); TX(c, lab, x, y - 5, "#cfd8ea", "left", "12px"); };
    const bx = w * 0.58; bar(bx, 110, s.sp, "Muscle spindles (detect stretch → contract)", "#ffb454"); bar(bx, 160, s.gto, "Golgi tendon organs (detect tension → relax)", "#7ee787"); bar(bx, 210, s.ten, "Muscle tension", "#ff6b81");
    WRAP(c, P.stretch === "pnf" ? "The isometric contraction raises tendon tension; the Golgi tendon organs respond with autogenic inhibition, so the muscle relaxes and the stretch can go further." : P.stretch === "ballistic" ? "Rapid stretches fire the muscle spindles, which make the muscle contract to protect itself (the stretch reflex): the stretch is fought and injury risk rises." : "A slow stretch held for 30 s lets the spindles adapt, so the stretch reflex fades and the muscle lengthens a little.", bx, 260, w - bx - 20, 17, "#aab6cc", "12.5px");
  }
  ui.hud("");
}
// ---------------- Charts ----------------
function charts() { chA.opts.xFmt = null; chB.opts.xFmt = null;
  if (P.view === "unit") { const T = TYPES[P.ftype], pts = unitForce(P.freq, T.twitch, 1).filter((p, i) => i % 3 === 0).map(p => [p[0] * 1000, 25 * p[1]]);
    chA.opts.title = "Force from this motor unit"; chA.opts.xLabel = "time (ms)"; chA.opts.yLabel = "% of tetanus"; chA.draw([{ pts, color: T.col, label: `${P.freq} Hz` }], { xMin: 0, xMax: 1000, yMin: 0, yMax: 105 });
    const fs = [0, 1, 2, 4, 6, 8, 10, 15, 20, 30, 40, 60, 80], fc = k => fs.map(f => [f, Math.max(...unitForce(f, TYPES[k].twitch, 0.6).map(p => p[1])) / 4 * 100]);
    chB.opts.title = "Force–frequency curve"; chB.opts.xLabel = "impulse frequency (Hz)"; chB.opts.yLabel = "peak force (% of tetanus)"; chB.draw(["I", "IIa", "IIx"].map(k => ({ pts: fc(k), color: TYPES[k].col, label: "type " + k, width: k === P.ftype ? 3 : 1.4 })), { xMin: 0, xMax: 80, yMin: 0, yMax: 105, vlines: [{ x: P.freq, label: "now" }] });
    label(0, "frequency"); label(1, "fibre type"); label(2, "twitch time to peak"); label(3, "peak force"); read.set("a", P.freq + " Hz"); read.set("b", P.ftype); read.set("c", (T.twitch * 1000).toFixed(0) + " ms"); read.set("d", (Math.max(...unitForce(P.freq, T.twitch, 0.6).map(p => p[1])) / 4 * 100).toFixed(0) + "%");
  } else if (P.view === "muscle") { const R = holdRes, k = Math.min(R.out.length - 1, Math.floor(t * 8)), S = R.out.slice(0, k + 1);
    chA.opts.title = "Force held and units active"; chA.opts.xLabel = "time (s)"; chA.opts.yLabel = "% / units"; chA.draw([{ pts: S.map(q => [q.s, q.force]), color: "#5ad1ff", label: "force (% of max)" }, { pts: S.map(q => [q.s, q.units]), color: "#ffd166", label: "units active" }], { xMin: 0, xMax: P.secs, yMin: 0, yMax: 120 });
    chB.opts.title = "Fatigue by fibre type"; chB.opts.xLabel = "time (s)"; chB.opts.yLabel = "% of fresh force"; chB.draw(["I", "IIa", "IIx"].map((kk, j) => ({ pts: S.map(q => [q.s, 100 * q.byType[j]]), color: TYPES[kk].col, label: "type " + kk })), { xMin: 0, xMax: P.secs, yMin: 0, yMax: 105 });
    label(0, "target"); label(1, "units recruited (fresh)"); label(2, "time to failure"); label(3, "type I share"); read.set("a", (100 * P.target).toFixed(0) + "%"); read.set("b", recruited(makeMuscle(P.pctI, K.rng(seed)), P.target) + " of 120"); read.set("c", R.fail == null ? `over ${P.secs} s` : R.fail + " s"); read.set("d", (100 * P.pctI).toFixed(0) + "%");
  } else { const ts = []; for (let x = 0; x <= 18; x += 0.1) ts.push(x); const S = ts.map(x => stretchState(P.stretch, x));
    chA.opts.title = "Receptors during the stretch"; chA.opts.xLabel = "time (s)"; chA.opts.yLabel = "activity"; chA.draw([{ pts: ts.map((x, i) => [x, S[i].sp]), color: "#ffb454", label: "spindles" }, { pts: ts.map((x, i) => [x, S[i].gto]), color: "#7ee787", label: "Golgi tendon organs" }, { pts: ts.map((x, i) => [x, S[i].L]), color: "#5ad1ff", label: "stretch" }], { xMin: 0, xMax: 18, yMin: 0, yMax: 1.05, vlines: [{ x: t % 18 }] });
    chB.opts.title = "Range gained over 6 weeks"; chB.opts.xLabel = "week"; chB.opts.yLabel = "degrees"; const wk = [0, 1, 2, 3, 4, 5, 6]; chB.draw(["ballistic", "static", "pnf"].map((m, j) => ({ pts: wk.map(x => [x, ROM_GAIN[m] * (1 - Math.exp(-x / 4)) / (1 - Math.exp(-1.5))]), color: ["#ff6b81", "#ffb454", "#7ee787"][j], label: m, width: m === P.stretch ? 3 : 1.4 })), { xMin: 0, xMax: 6, yMin: 0 });
    const s = stretchState(P.stretch, t % 18); label(0, "method"); label(1, "spindle activity"); label(2, "GTO activity"); label(3, "gain after 6 weeks"); read.set("a", P.stretch); read.set("b", (100 * s.sp).toFixed(0) + "%"); read.set("c", (100 * s.gto).toFixed(0) + "%"); read.set("d", ROM_GAIN[P.stretch] + "°"); }
}
let frame = 0;
ui.onLevel = () => sync();
ui.run(dt => { if (dt > 0) t += dt; }, dt => { draw(dt > 0 ? dt : 0.016); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("Start with one motor unit and turn up the impulse frequency. Then switch to the whole muscle.", 7000);
