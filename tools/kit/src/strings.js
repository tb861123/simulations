/* =====================================================================
   STRINGS: PLUCK, BOW, STRIKE
   A string fixed at both ends can only vibrate in STANDING WAVES that fit
   a whole number of half-wavelengths into its length L:
        λₙ = 2L ÷ n        fₙ = n f₁        f₁ = (1 ÷ 2L) √(T ÷ μ)
   (T: tension, μ: mass per metre). Shorter, tighter or lighter strings
   sound higher. All the harmonics sound at once; WHERE you pluck decides
   how much of each: plucking at the middle cannot excite the even
   harmonics (they have a node there), so the sound is hollower; plucking
   near the bridge gives many harmonics and a bright, twangy sound.
   Frets shorten the string: each fret raises the pitch a semitone, so
   it multiplies the length by 2^(−1/12) ≈ 0.944.
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
const f1 = (L, T, mu) => Math.sqrt(T / mu) / (2 * L);                          // fundamental frequency (Hz); μ in kg/m
// how strongly each mode n is excited by playing at a fraction p of the length
//   pluck (a triangle shape, released from rest): 2 sin(nπp) ÷ (n²π² p(1−p))
//   strike (a hammer gives a velocity at one point): sin(nπp) ÷ n
//   bow (sustained Helmholtz motion): ≈ 1/n for every n, missing the modes with a node at the bow
function modeAmp(n, p, method) { const s = Math.sin(n * Math.PI * p); if (method === "pluck") return 2 * s / (n * n * Math.PI * Math.PI * p * (1 - p)) * (Math.PI * Math.PI * p * (1 - p) / 2 / Math.max(1e-9, Math.abs(Math.sin(Math.PI * p)))); if (method === "strike") return s / n; return Math.sign(s) * (Math.abs(s) > 0.02 ? 1 : 0) / n; }
// a stiff string (piano, thick strings) is not quite harmonic: fₙ = n f₁ √(1 + B n²)
const fn = (n, F1, B) => n * F1 * Math.sqrt(1 + B * n * n);
// higher modes die away faster (air drag, internal friction); a bowed string is kept going
const tau = (n, method, dur) => method === "bow" ? 1e9 : dur / (0.8 + 0.35 * (n - 1));
const PRESETS = { guitarE: { name: "guitar low E (E2)", L: 0.648, T: 72, mu: 6.3 }, guitarHighE: { name: "guitar high E (E4)", L: 0.648, T: 72, mu: 0.39 }, violinA: { name: "violin A (A4)", L: 0.328, T: 50, mu: 0.6 }, bassE: { name: "bass guitar E (E1)", L: 0.864, T: 100, mu: 19.7 }, sono: { name: "school sonometer", L: 0.6, T: 40, mu: 1.0 } };

// ---------------- Sound (Web Audio) ----------------
const SND = { ctx: null, nodes: [] };
async function audioOn() { SND.ctx = SND.ctx || new (window.AudioContext || window.webkitAudioContext)(); await SND.ctx.resume(); return SND.ctx; }
function stopSound() { for (const n of SND.nodes) { try { n.stop(); } catch (e) { } } SND.nodes = []; }
// partials [frequency, amplitude, decay time]; a quick attack, then each partial dies away at its own rate (or is sustained)
function playPartials(parts, vol, dur) {
  const ctx = SND.ctx, t = ctx.currentTime + 0.03, norm = Math.max(1, parts.reduce((s, p) => s + Math.abs(p[1]), 0));
  for (const [f, a, tc] of parts) { if (!a || f >= ctx.sampleRate / 2 || f < 15) continue; const o = ctx.createOscillator(), g = ctx.createGain(), L = vol * a / norm; o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(L, t + 0.008); if (tc < 1e6) g.gain.setTargetAtTime(0, t + 0.008, tc / 3); else g.gain.setValueAtTime(L, t + dur - 0.1); g.gain.linearRampToValueAtTime(0, t + dur); o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + dur + 0.05); SND.nodes.push(o); }
}

// ---------------- The page ----------------
const P = { L: 0.648, T: 72, mu: 6.3, pos: 0.2, method: "pluck", fret: 0, B: 0, dur: 3, vol: 0.5, preset: "guitarE" };
let T0 = 0, strum = 0, rnd = K.rng(Date.now() % 9973 + 43);
const ui = K.app({
  title: "Strings: Pluck, Bow, Strike", subject: "Music",
  blurb: "Standing waves on a string: length, tension, mass and frets set the pitch; where and how you play sets the harmonics",
  reset: () => set({}),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "GCSE Music (string instruments and techniques: pizzicato, arco, how pitch is changed; timbre) and GCSE Physics (waves: frequency and wavelength; higher frequency for shorter, tighter strings).", adv: "A level Physics (WJEC Eduqas and others: stationary waves on strings, nodes and antinodes, f = (1/2L)√(T/μ), the practical with a sonometer or vibration generator) and A level Music (the harmonic series). Inharmonicity is beyond the spec." } },
  missions: [
    { title: "Shorter string, higher note", q: "Halve the length of the string. Predict the new frequency, then play it.", hint: "Twice the frequency: an octave higher. f₁ = (1/2L)√(T/μ), so f ∝ 1/L. That is how a guitarist's finger, or a fret, changes the note.", setup() { set({ L: 0.648 }); } },
    { title: "Tighter string", q: "Double the tension. Does the frequency double too?", hint: "No: f ∝ √T, so doubling the tension raises the frequency by √2 (about 41%, a little more than a fifth). Turning a tuning peg changes the tension.", setup() { set({}); } },
    { title: "Thick strings sound low", q: "Compare the guitar's high E and low E strings. They have the same length and similar tension. What is different?", hint: "The low E is about 16 times heavier per metre, so it is √16 = 4 times lower: two octaves (E2 = 82 Hz against E4 = 330 Hz).", setup() { set({ preset: "guitarHighE" }); } },
    { title: "Where you pluck", q: "Pluck at the middle, then near the bridge (5%). Compare the spectrum and the sound.", hint: "At the middle the even harmonics are missing (they have a node there): a soft, hollow sound. Near the bridge many harmonics are strong: bright and twangy. Guitarists use this (sul ponticello, sul tasto).", setup() { set({ pos: 0.5 }); } },
    { title: "Pluck, strike or bow", q: "Play the same string by plucking, striking and bowing. How does the sound change over time?", hint: "Plucked and struck notes die away (the high harmonics fastest, so the sound gets mellower); a bowed note keeps going because the bow keeps feeding energy in. Striking gives stronger high harmonics than plucking.", setup() { set({ method: "bow", pos: 0.12 }); } },
    { title: "Frets", q: "Play fret 12. What has happened to the string length and the note?", hint: "Fret 12 halves the vibrating length: an octave up. Each fret shortens the string by a factor of 2^(−1/12) ≈ 0.944: one semitone.", setup() { set({ fret: 12 }); } },
    { lvl: "adv", title: "Stationary wave formula", q: "Use f₁ = (1/2L)√(T/μ) to check the guitar low E: L = 0.648 m, T = 72 N, μ = 6.3 g/m.", hint: "v = √(T/μ) = √(72 ÷ 0.0063) = 107 m/s; λ = 2L = 1.296 m; f = v/λ = 82.4 Hz: E2.", setup() { set({ preset: "guitarE" }); } },
    { lvl: "adv", title: "Stiff strings", q: "Add stiffness (inharmonicity B = 0.0004, as on a piano's bass strings). Are the overtones still exact multiples of f₁?", hint: "No: fₙ = nf₁√(1 + Bn²), so the high partials are sharp. Piano tuners 'stretch' the octaves to match. An ideal flexible string has B = 0.", setup() { set({ B: 0.0004, method: "strike", pos: 0.12 }); } }
  ],
  batch: [
    { title: "Sonometer: frequency and length", question: "How does the frequency depend on the vibrating length?", how: "Sonometer: T = 40 N, μ = 1.0 g/m; length measured to ±2 mm; frequency from a signal generator at resonance (±1%). Plotted against 1/L.", xLabel: "1 ÷ length (m⁻¹)", yLabel: "frequency (Hz)", xs: [1.25, 1.67, 2, 2.5, 3.33, 4, 5], reps: 5, yMin: 0, fit: true, theory: x => f1(1 / x, 40, 0.001), theoryLabel: "(1/2L)√(T/μ)", run: (x, r) => f1(1 / x + 0.002 * r.gauss(), 40, 0.001) * (1 + 0.01 * r.gauss()), note: "A straight line through the origin: f ∝ 1/L, with gradient √(T/μ)/2 = 100 m/s here." },
    { title: "Frequency and tension", question: "How does the frequency depend on the tension?", how: "L = 0.6 m, μ = 1.0 g/m; tension from hanging masses (±1%).", xLabel: "√(tension / N)", yLabel: "frequency (Hz)", xs: [2, 3, 4, 5, 6, 7], reps: 5, yMin: 0, fit: true, theory: x => f1(0.6, x * x, 0.001), theoryLabel: "∝ √T", run: (x, r) => f1(0.6, x * x * (1 + 0.01 * r.gauss()), 0.001) * (1 + 0.01 * r.gauss()), note: "f ∝ √T: a straight line against √T. Four times the tension doubles the frequency." },
    { title: "Where you pluck: the 3rd harmonic", question: "How strong is the 3rd harmonic for different plucking positions?", how: "Ideal plucked string; amplitude of harmonic 3 relative to the fundamental.", xLabel: "plucking position (fraction of the length)", yLabel: "3rd harmonic ÷ fundamental", xs: [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.333, 0.4, 0.5], reps: 1, yMin: 0, theory: p => Math.abs(Math.sin(3 * Math.PI * p) / (9 * Math.sin(Math.PI * p))), theoryLabel: "|sin 3πp ÷ 9 sin πp|", run: p => Math.abs(modeAmp(3, p, "pluck") / modeAmp(1, p, "pluck")), note: "It vanishes when you pluck at 1/3 of the length (a node of the 3rd harmonic) and is strongest near the end." },
    { title: "Frets and semitones", question: "What frequency ratio does each fret give?", how: "Fret k leaves a length L × 2^(−k/12); f ÷ f(open string).", xLabel: "fret number", yLabel: "frequency ÷ open string", xs: [0, 1, 2, 3, 4, 5, 7, 9, 12], reps: 1, yMin: 0, theory: k => 2 ** (k / 12), theoryLabel: "2^(k/12)", run: k => f1(0.648 * 2 ** (-k / 12), 72, 0.0063) / f1(0.648, 72, 0.0063), note: "Equal steps in pitch are equal RATIOS in frequency: fret 12 doubles the frequency (an octave), fret 7 multiplies it by 1.498 (a fifth)." },
    { title: "Measuring μ with a sonometer", question: "If students find μ from the gradient of f against 1/L, how close do they get to the true 1.0 g/m?", how: "Five lengths (0.2–0.8 m), errors as above; μ = T ÷ (2 × gradient)².", yLabel: "μ found (g/m)", reps: 200, bins: 20, theory: 1.0, theoryLabel: "true", run: (x, r) => { const pts = [0.2, 0.35, 0.5, 0.65, 0.8].map(L => [1 / (L + 0.002 * r.gauss()), f1(L, 40, 0.001) * (1 + 0.01 * r.gauss())]); let sxy = 0, sxx = 0; for (const [a, b] of pts) { sxy += a * b; sxx += a * a; } const gr = sxy / sxx; return 40 / (2 * gr) ** 2 * 1000; }, note: "Within about 2%: a graph uses all the readings, so it beats any single measurement." },
    { title: "Stiff strings are sharp (A level)", question: "How far above n × f₁ is each partial of a stiff string?", how: "Inharmonicity B = 0.0004 (like a piano's bass); deviation in cents (100 cents = 1 semitone).", xLabel: "partial number n", yLabel: "sharpness (cents)", xs: [1, 2, 4, 6, 8, 10, 12, 16], reps: 1, yMin: 0, theory: n => 1200 * Math.log2(Math.sqrt(1 + 0.0004 * n * n) / Math.sqrt(1.0004)), theoryLabel: "1200 log₂(√(1 + Bn²)/√(1 + B))", run: n => 1200 * Math.log2(fn(n, 1, 0.0004) / (n * fn(1, 1, 0.0004))), note: "High partials are many cents sharp: the reason pianos are tuned with stretched octaves." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "GCSE Music", text: "String players change pitch by shortening the string (fingers, frets), changing the tension (tuning pegs) or choosing a thicker or thinner string. Techniques: arco (bowed), pizzicato (plucked), col legno, harmonics, sul ponticello (near the bridge: bright)." },
      { lvl: "std", tag: "GCSE Physics", text: "A shorter, tighter or lighter string vibrates at a higher frequency, giving a higher pitch." },
      { lvl: "adv", tag: "A level", text: "Stationary waves on a string fixed at both ends: nodes at the ends, λₙ = 2L/n, fₙ = nv/2L, with wave speed v = √(T/μ)." },
      { lvl: "adv", tag: "A level", text: "A stationary wave forms from two progressive waves travelling in opposite directions; nodes are half a wavelength apart; points between adjacent nodes vibrate in phase." },
      { lvl: "adv", tag: "A level", text: "Plucking at a point excites only the modes that do not have a node there; the n-th harmonic is missing when the string is plucked at 1/n of its length." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: "A guitar string plays 110 Hz. The guitarist presses it at the 12th fret, halving the vibrating length. What frequency is played now?", ans: "<ul><li>f ∝ 1/L, so halving L doubles f</li><li>220 Hz (an octave higher)</li></ul>" },
      { lvl: "adv", marks: 3, q: () => `A string of length ${P.L.toFixed(3)} m and mass per unit length ${P.mu} g/m is under a tension of ${P.T} N. Calculate the frequency of its fundamental.`, ans: () => `<ul><li>v = √(T/μ) = √(${P.T} ÷ ${(P.mu / 1000).toFixed(4)}) = ${Math.sqrt(P.T / (P.mu / 1000)).toFixed(1)} m/s</li><li>λ = 2L = ${(2 * P.L).toFixed(3)} m</li><li>f = v/λ = ${f1(P.L, P.T, P.mu / 1000).toFixed(1)} Hz</li></ul>` },
      { lvl: "adv", marks: 3, q: "Explain why a string plucked at its midpoint produces no second harmonic.", ans: "<ul><li>the second harmonic has a node at the midpoint</li><li>plucking at the midpoint displaces the string most there</li><li>so the shape cannot contain the second harmonic (or any even harmonic)</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li>An ideal flexible string fixed at both ends: f₁ = √(T/μ)/(2L); partials at nf₁ (a stiff string: nf₁√(1 + Bn²)). Frets shorten the vibrating length to L × 2^(−k/12).</li>
<li>Excitation at a fraction p of the length: a pluck (triangle, from rest) gives mode n an amplitude ∝ sin(nπp)/n²; a strike (an initial velocity) ∝ sin(nπp)/n; a bow (Helmholtz motion) ≈ 1/n for every mode except those with a node at the bow.</li>
<li>Damping: plucked and struck partials die away, mode n with a time ∝ 1/(0.8 + 0.35(n − 1)), so the high partials go first; a bowed note is sustained.</li>
<li>The picture shows the string's shape (the sum of the first 24 modes), slowed down and exaggerated; the sound plays at the real frequencies.</li></ul>
<h3>Left out</h3>
<ul><li>The instrument body (which radiates the sound and colours it), the bow's stick–slip friction, string vibrations in two planes, and the real spectra of instruments.</li></ul>
<p>The earlier version of this simulation is kept in <a href="original/strings.html">original/strings.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("String");
ctl.preset = K.seg(g, { value: "guitarE", options: Object.entries(PRESETS).map(([k, v]) => [k, v.name]), on: v => set({ preset: v }) });
ctl.L = K.slider(g, { label: "Length (open string)", min: 0.1, max: 1.2, step: 0.001, value: 0.648, unit: "m", on: v => P.L = v });
ctl.T = K.slider(g, { label: "Tension", min: 5, max: 200, step: 0.5, value: 72, unit: "N", on: v => P.T = v });
ctl.mu = K.slider(g, { label: "Mass per metre μ", min: 0.2, max: 25, step: 0.05, value: 6.3, unit: "g/m", on: v => P.mu = v });
ctl.fret = K.slider(g, { label: "Fret", min: 0, max: 19, step: 1, value: 0, fmt: v => v ? "fret " + v : "open string", on: v => P.fret = v });
ctl.B = K.slider(g, { label: "Stiffness (inharmonicity B, A level)", min: 0, max: 0.002, step: 0.0001, value: 0, fmt: v => v ? v.toFixed(4) : "ideal (0)", on: v => P.B = v });
g = ui.group("Playing");
ctl.method = K.seg(g, { value: "pluck", options: [["pluck", "pluck (pizzicato)"], ["strike", "strike (piano hammer)"], ["bow", "bow (arco)"]], on: v => P.method = v });
ctl.pos = K.slider(g, { label: "Playing position (from the bridge)", min: 0.02, max: 0.5, step: 0.01, value: 0.2, fmt: v => (v * 100).toFixed(0) + "% of the length", on: v => P.pos = v });
ctl.dur = K.slider(g, { label: "Note length", min: 0.5, max: 6, step: 0.5, value: 3, unit: "s", on: v => P.dur = v });
let rr = K.row(g); K.btn(rr, "▶ Play", () => play(), "primary"); K.btn(rr, "■ Stop", () => stopSound());
ctl.vol = K.slider(g, { label: "Listening volume", min: 0, max: 1, step: 0.05, value: 0.5, fmt: v => (v * 100).toFixed(0) + "%", on: v => P.vol = v });
const read = K.readout(ui.group("Readings"), [["f", "fundamental f₁"], ["note", "nearest note"], ["v", "wave speed √(T/μ)"], ["Lv", "vibrating length"], ["lam", "λ₁ = 2L"]]);
const Lnow = () => P.L * 2 ** (-P.fret / 12), F1 = () => f1(Lnow(), P.T, P.mu / 1000);
const NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
const noteOf = f => { const m = 69 + 12 * Math.log2(f / 440), r = Math.round(m); return `${NAMES[(r % 12 + 12) % 12]}${Math.floor(r / 12) - 1} (${(100 * (m - r)) >= 0 ? "+" : ""}${(100 * (m - r)).toFixed(0)} cents)`; };
function set(o) { const pr = PRESETS[o.preset || P.preset || "guitarE"]; Object.assign(P, { L: pr.L, T: pr.T, mu: pr.mu, pos: 0.2, method: "pluck", fret: 0, B: 0, dur: 3, preset: o.preset || "guitarE" }, o); for (const k of ["L", "T", "mu", "fret", "B", "pos", "dur"]) ctl[k].set(P[k]); ctl.method.set(P.method); ctl.preset.set(P.preset); strum = 0; }
async function play() { try { await audioOn(); stopSound(); const parts = []; for (let n = 1; n <= 24; n++) parts.push([fn(n, F1(), P.B), modeAmp(n, P.pos, P.method), tau(n, P.method, P.dur)]); playPartials(parts, P.vol, P.dur); strum = 0; } catch (e) { ui.tip("Sound could not start: " + e.message, 4000); } }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h);
  const x0 = 60, x1 = w - 60, cy = h * 0.4, Lf = Lnow() / P.L, xe = x0 + (x1 - x0) * Lf, A = 60;
  // neck with frets, bridge and nut
  c.fillStyle = "#3a2a18"; c.fillRect(x0 - 10, cy - 30, x1 - x0 + 20, 60); for (let k = 1; k <= 19; k++) { const x = x0 + (x1 - x0) * 2 ** (-k / 12); c.fillStyle = "#c8c0b0"; c.fillRect(x - 1.5, cy - 30, 3, 60); if ([3, 5, 7, 9, 12, 15, 17].includes(k)) { c.fillStyle = "#e8e0d0"; c.beginPath(); c.arc((x + x0 + (x1 - x0) * 2 ** (-(k - 1) / 12)) / 2, cy + 44, 3, 0, 6.3); c.fill(); } }
  c.fillStyle = "#f4f1e8"; c.fillRect(x0 - 6, cy - 34, 6, 68); c.fillRect(x1, cy - 34, 6, 68); TX(c, "bridge", x0, cy + 54, "#aab6cc", "center", "11px"); TX(c, "nut", x1, cy + 54, "#aab6cc", "center", "11px");
  if (P.fret) { c.fillStyle = "#ffd166"; c.beginPath(); c.arc(xe + 6, cy, 8, 0, 6.3); c.fill(); }
  // the string's shape: sum of the first 24 modes with their decays (slowed down)
  const ts = strum * 0.15, Fv = F1(); c.strokeStyle = "#e8e0d0"; c.lineWidth = 2; c.beginPath();
  for (let i = 0; i <= 200; i++) { const u = i / 200; let y = 0; for (let n = 1; n <= 24; n++) { const a = modeAmp(n, P.pos, P.method); if (!a) continue; const env = Math.exp(-strum / tau(n, P.method, P.dur)); y += a * env * Math.sin(n * Math.PI * u) * (P.method === "strike" ? Math.sin(2 * Math.PI * fn(n, 1, P.B) * ts) : Math.cos(2 * Math.PI * fn(n, 1, P.B) * ts)); } const x = x0 + (xe - x0) * u; i ? c.lineTo(x, cy - A * y) : c.moveTo(x, cy - A * y); }
  c.stroke(); c.lineWidth = 1; c.strokeStyle = "#e8e0d0"; c.beginPath(); c.moveTo(xe, cy); c.lineTo(x1, cy); c.stroke();
  const px = x0 + (xe - x0) * P.pos; c.strokeStyle = "#ff8a70"; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(px, cy - 80); c.lineTo(px, cy + 80); c.stroke(); c.setLineDash([]); TX(c, P.method === "bow" ? "bow" : P.method === "strike" ? "hammer" : "pluck", px, cy - 86, "#ff8a70", "center", "600 11.5px");
  // the first four modes, drawn small below
  for (let n = 1; n <= 4; n++) { const yy = h * 0.68 + (n - 1) * 34, a = modeAmp(n, P.pos, P.method); c.strokeStyle = a ? "#5ad1ff" : "#3a4a6b"; c.beginPath(); for (let i = 0; i <= 100; i++) { const u = i / 100, x = x0 + (x1 - x0) * 0.6 * u; c.lineTo(x, yy - 12 * Math.sin(n * Math.PI * u) * Math.cos(T0 * 3 * n)); } c.stroke(); TX(c, `harmonic ${n}: ${(n * Fv).toFixed(0)} Hz, ${a ? "amplitude " + Math.abs(a / modeAmp(1, P.pos, P.method) || 0).toFixed(2) : "not excited (node at the playing point)"}`, x0 + (x1 - x0) * 0.62, yy + 4, a ? "#cfd8ea" : "#56607a", "left", "11.5px"); }
  TX(c, `f₁ = ${Fv.toFixed(1)} Hz · ${noteOf(Fv)}`, 14, 26, "#eef2f8", "left", "600 14px");
}

// ---------------- Charts and readings ----------------
function charts() {
  const Fv = F1(), a1 = Math.abs(modeAmp(1, P.pos, P.method)) || 1;
  chA.opts.title = "Spectrum: how much of each harmonic"; chA.opts.xLabel = "frequency (Hz)"; chA.opts.yLabel = "relative amplitude";
  chA.draw([{ pts: Array.from({ length: 16 }, (_, i) => [fn(i + 1, Fv, P.B), Math.abs(modeAmp(i + 1, P.pos, P.method)) / a1]), type: "bars", w: Fv * 0.35, color: "#c9a0ff", label: P.method }], { yMin: 0, xMin: 0, xMax: Fv * 17 });
  const pts = []; for (let L = 0.15; L <= 1.2; L += 0.01) pts.push([1 / L, f1(L, P.T, P.mu / 1000)]);
  chB.opts.title = "Frequency against 1/L (this string)"; chB.opts.xLabel = "1 ÷ length (m⁻¹)"; chB.opts.yLabel = "f₁ (Hz)"; chB.draw([{ pts, color: "#7ee787", label: "f ∝ 1/L" }, { pts: [[1 / Lnow(), Fv]], type: "dots", r: 6, color: "#fff", label: "now" }], { yMin: 0, xMin: 0 });
  read.set("f", Fv.toFixed(2) + " Hz"); read.set("note", noteOf(Fv)); read.set("v", Math.sqrt(P.T / (P.mu / 1000)).toFixed(1) + " m/s"); read.set("Lv", Lnow().toFixed(3) + " m" + (P.fret ? ` (fret ${P.fret})` : "")); read.set("lam", (2 * Lnow()).toFixed(3) + " m");
  ui.hud("f₁ = (1/2L)√(T/μ): shorter, tighter, lighter → higher");
}
let frame = 0;
ui.run(dt => { if (dt > 0) { T0 += dt; strum += dt; if (P.method !== "bow" && strum > P.dur * 1.5) strum = 0; } }, () => { draw(); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("Press ▶ Play. Then change where and how the string is played.", 6000);
