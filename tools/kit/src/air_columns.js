/* =====================================================================
   AIR COLUMNS AND WIND INSTRUMENTS
   In a wind instrument the air inside the tube vibrates in a STANDING
   WAVE. At an OPEN end the air moves freely (a displacement antinode);
   at a CLOSED end it cannot move (a displacement node).
     open at both ends (flute, recorder):  λₙ = 2L/n,       fₙ = n c / 2L       (all harmonics)
     closed at one end (clarinet-like):    λₙ = 4L/(2n−1),  fₙ = (2n−1) c / 4L  (odd harmonics only)
   c is the speed of sound, which rises with temperature: c ≈ 331 + 0.6 θ m/s
   (θ in °C), so wind instruments go sharp as they warm up.
   The antinode actually sits a little OUTSIDE an open end: the END
   CORRECTION e ≈ 0.6 r (r = tube radius), so the "acoustic" length is
   L + e for each open end. Opening a finger hole shortens the tube.
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
const cOf = th => 331 + 0.6 * th;                                       // speed of sound in air (m/s)
// acoustic length: physical length plus an end correction of 0.6 r for each open end
const Leff = (L, r, type, corr = true) => L + (corr ? (type === "open" ? 2 : 1) * 0.6 * r : 0);
// frequency of the n-th mode that the tube supports (n = 1, 2, 3 ...)
const fMode = (n, L, r, type, th, corr = true) => type === "open" ? n * cOf(th) / (2 * Leff(L, r, type, corr)) : (2 * n - 1) * cOf(th) / (4 * Leff(L, r, type, corr));
const harmNo = (n, type) => type === "open" ? n : 2 * n - 1;          // which harmonic of f₁ that mode is
const PRESETS = { flute: { name: "flute-like (open)", type: "open", L: 0.6, r: 0.0095 }, clarinet: { name: "clarinet-like (closed)", type: "closed", L: 0.6, r: 0.0075 }, pan: { name: "pan pipe (closed)", type: "closed", L: 0.15, r: 0.006 }, organ: { name: "organ pipe 8′ (open)", type: "open", L: 2.4, r: 0.06 }, tube: { name: "resonance tube (closed)", type: "closed", L: 0.33, r: 0.018 } };

// ---------------- Sound (Web Audio) ----------------
const SND = { ctx: null, nodes: [] };
async function audioOn() { SND.ctx = SND.ctx || new (window.AudioContext || window.webkitAudioContext)(); await SND.ctx.resume(); return SND.ctx; }
function stopSound() { for (const n of SND.nodes) { try { n.stop(); } catch (e) { } } SND.nodes = []; }
// sustained partials [frequency, amplitude] with a soft attack and release, plus a little breath noise
function playPartials(parts, vol, dur, breath) {
  const ctx = SND.ctx, t = ctx.currentTime + 0.03, norm = Math.max(1, parts.reduce((s, p) => s + Math.abs(p[1]), 0));
  for (const [f, a] of parts) { if (!a || f >= ctx.sampleRate / 2 || f < 15) continue; const o = ctx.createOscillator(), g = ctx.createGain(), L = vol * a / norm; o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(L, t + 0.06); g.gain.setValueAtTime(L, t + dur - 0.12); g.gain.linearRampToValueAtTime(0, t + dur); o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + dur + 0.05); SND.nodes.push(o); }
  if (breath > 0) { const n = ctx.sampleRate * dur, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; const s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = buf; bp.type = "bandpass"; bp.frequency.value = parts[0][0] * 2; bp.Q.value = 2; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * breath * 0.25, t + 0.04); g.gain.setValueAtTime(vol * breath * 0.25, t + dur - 0.12); g.gain.linearRampToValueAtTime(0, t + dur); s.connect(bp); bp.connect(g); g.connect(ctx.destination); s.start(t); s.stop(t + dur + 0.05); SND.nodes.push(s); }
}

// ---------------- The page ----------------
const P = { type: "open", L: 0.6, r: 0.0095, th: 20, hole: 1, mode: 1, corr: true, show: "disp", vol: 0.5, dur: 2, breath: 0.4, preset: "flute" };
let T0 = 0;
const ui = K.app({
  title: "Air Columns and Wind Instruments", subject: "Music",
  blurb: "Standing waves in open and closed tubes: length, temperature, finger holes and end correction set the pitch",
  reset: () => set({}),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "GCSE Music (woodwind and brass: how pitch is changed with holes, valves and slides; timbre of flute against clarinet) and GCSE Physics (waves; frequency = speed ÷ wavelength).", adv: "A level Physics (stationary waves in air columns: open and closed pipes, nodes and antinodes, end correction; the resonance-tube practical to measure the speed of sound) and A level Music (the harmonic series, overblowing)." } },
  missions: [
    { title: "Longer tube, lower note", q: "Double the length of the tube. Predict what happens to the frequency.", hint: "It halves (down an octave): f = c/2L for an open tube. That is why a bassoon or tuba is long and a piccolo short.", setup() { set({ L: 0.3 }); } },
    { title: "Open and closed", q: "Make an open tube and a closed tube of the same length. Which sounds lower, and by how much?", hint: "The closed tube is an octave lower: f₁ = c/4L instead of c/2L. Its lowest mode fits only a QUARTER wavelength in the tube.", setup() { set({ type: "closed" }); } },
    { title: "The missing even harmonics", q: "Look at the spectrum of the closed tube. Which harmonics are missing? How does it sound compared with the open tube?", hint: "A closed tube can only have a node at one end and an antinode at the other, so it supports only odd harmonics (1, 3, 5 …). This gives the hollow, 'woody' tone of a clarinet.", setup() { set({ preset: "clarinet" }); } },
    { title: "Finger holes", q: "Open finger holes to shorten the tube to 75% of its length. What happens to the pitch?", hint: "An open hole acts like the end of the tube, so the air column is shorter and the note is higher: 1/0.75 = 1.33 times the frequency, a fourth higher.", setup() { set({ hole: 0.75 }); } },
    { title: "Warming up", q: "Play at 10 °C, then at 30 °C. Why do players warm up their instruments before tuning?", hint: "Sound travels faster in warm air (c ≈ 331 + 0.6θ), so every note goes up: about 3.5% here, more than half a semitone. Players tune once the instrument is at playing temperature.", setup() { set({ th: 10 }); } },
    { title: "Overblowing", q: "Choose mode 2 for the open tube and mode 2 for the closed tube. How far up does each jump?", hint: "Open tube: to the 2nd harmonic, an octave up (the flute overblows at the octave). Closed tube: to the 3rd harmonic, an octave and a fifth up (the clarinet overblows at the twelfth).", setup() { set({ mode: 2 }); } },
    { lvl: "adv", title: "End correction", q: "Turn the end correction off and on for a wide organ pipe. How big is the effect?", hint: "e ≈ 0.6r for each open end. For a 2.4 m pipe of radius 6 cm the acoustic length rises by 7.2 cm (3%), lowering the note by about half a semitone. Thin tubes barely change.", setup() { set({ preset: "organ", corr: false }); } },
    { lvl: "adv", title: "Resonance tube practical", q: "A 512 Hz tuning fork is held over a tube in water. Find the length of air for the first resonance and use it to measure c.", hint: "First resonance: L + e = λ/4. With c = 343 m/s, λ = 0.670 m, so L ≈ 0.168 − 0.011 = 0.157 m. Find the second resonance too: the difference L₂ − L₁ = λ/2, which cancels the end correction.", setup() { set({ preset: "tube", L: 0.157 }); } }
  ],
  batch: [
    { title: "Resonance tube: frequency and length", question: "How does the resonant frequency of a closed tube depend on 1/(length)?", how: "Closed tube, radius 1.8 cm, 20 °C; length read to ±2 mm, frequency (tuning forks / signal generator) ±0.5%.", xLabel: "1 ÷ length (m⁻¹)", yLabel: "first resonance (Hz)", xs: [2, 3, 4, 5, 6, 7, 8], reps: 5, yMin: 0, fit: true, theory: x => fMode(1, 1 / x, 0.018, "closed", 20), theoryLabel: "c / 4(L + 0.6r)", run: (x, r) => fMode(1, 1 / x + 0.002 * r.gauss(), 0.018, "closed", 20) * (1 + 0.005 * r.gauss()), note: "Nearly straight, but it curves below c/4L for short tubes: the end correction matters more when L is small. Plot L against 1/f instead and the intercept gives −e." },
    { title: "Finding c and e from L against 1/f", question: "Plotting L against 1/f: the gradient is c/4 and the intercept is −e. What value of c do students get?", how: "Five tuning forks (256–512 Hz), first resonance, errors as above; least-squares line.", yLabel: "speed of sound found (m/s)", reps: 200, bins: 20, theory: cOf(20), theoryLabel: "true c at 20 °C", run: (x, r) => { const pts = [256, 320, 384, 440, 512].map(f => { const L = cOf(20) / (4 * f) - 0.6 * 0.018; return [1 / (f * (1 + 0.005 * r.gauss())), L + 0.002 * r.gauss()]; }); const fit = K.linfit(pts); return 4 * fit.m; }, note: "About ±1%. Because the end correction appears only in the intercept, the gradient gives c without needing to know e." },
    { title: "Open against closed", question: "How does the frequency of each mode compare for open and closed tubes?", how: "L = 0.6 m, r = 0.95 cm, 20 °C, end correction included. Frequency of mode n for each.", xLabel: "mode number n", yLabel: "frequency (Hz)", xs: [1, 2, 3, 4, 5, 6], reps: 1, yMin: 0, theory: n => fMode(Math.round(n), 0.6, 0.0095, "open", 20), theoryLabel: "open: nc/2L′", run: n => fMode(n, 0.6, 0.0095, "closed", 20), note: "Dots (closed: (2n − 1)c/4L′) start an octave below the open line and climb in steps of c/2L′: only odd harmonics of a lower fundamental." },
    { title: "Temperature and tuning", question: "How does the pitch of a 0.6 m flute change with temperature?", how: "Open tube with end correction; deviation from its pitch at 20 °C, in cents (100 cents = 1 semitone).", xLabel: "air temperature (°C)", yLabel: "pitch change (cents)", xs: [0, 5, 10, 15, 20, 25, 30, 35], reps: 1, theory: th => 1200 * Math.log2(cOf(th) / cOf(20)), theoryLabel: "1200 log₂(c/c₂₀)", run: th => 1200 * Math.log2(fMode(1, 0.6, 0.0095, "open", th) / fMode(1, 0.6, 0.0095, "open", 20)), note: "About 3 cents per °C: a cold flute is a quarter-tone flat. String instruments go the other way (the strings slacken), so ensembles retune." },
    { title: "Finger holes and semitones", question: "What tube length is needed for each semitone above the lowest note?", how: "Open tube, 0.6 m with end correction; the effective length for k semitones up.", xLabel: "semitones above the lowest note", yLabel: "air column length (m)", xs: [0, 1, 2, 3, 4, 5, 7, 9, 12], reps: 1, yMin: 0, theory: k => Leff(0.6, 0.0095, "open") * 2 ** (-k / 12) - 2 * 0.6 * 0.0095, theoryLabel: "L′ 2^(−k/12) − 2e", run: k => cOf(20) / (2 * fMode(1, 0.6, 0.0095, "open", 20) * 2 ** (k / 12)) - 2 * 0.6 * 0.0095, note: "Each hole must be about 5.6% further up the tube than the last. At 12 semitones the tube is (almost) half as long: the octave." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "GCSE Music", text: "Woodwind players change pitch by covering and uncovering holes (changing the length of the air column) and by overblowing; brass players use valves or a slide (more tubing = lower) and their lips to choose a harmonic." },
      { lvl: "std", tag: "GCSE Music", text: "The clarinet (a closed tube) has a darker, hollow tone because its sound is mostly odd harmonics; the flute (open) has all the harmonics." },
      { lvl: "std", tag: "GCSE Physics", text: "Wave speed = frequency × wavelength. A longer tube holds a longer wavelength, so the frequency is lower." },
      { lvl: "adv", tag: "A level", text: "Open end: displacement antinode (pressure node). Closed end: displacement node (pressure antinode). Open pipe fₙ = nc/2L; closed pipe fₙ = (2n − 1)c/4L." },
      { lvl: "adv", tag: "A level", text: "End correction: the antinode forms about 0.6r beyond an open end. In the resonance-tube experiment, using two successive resonances (L₂ − L₁ = λ/2) removes it." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: "A recorder plays a note of 523 Hz. The player lifts a finger, making the air column shorter. Explain what happens to the pitch.", ans: "<ul><li>a shorter air column holds a shorter wavelength</li><li>so the frequency is higher: the pitch rises</li></ul>" },
      { lvl: "adv", marks: 3, q: () => `A tube of length ${P.L.toFixed(3)} m is ${P.type === "open" ? "open at both ends" : "closed at one end"}. The air is at ${P.th} °C. Ignoring end correction, calculate the frequency of its fundamental.`, ans: () => `<ul><li>c = 331 + 0.6 × ${P.th} = ${cOf(P.th).toFixed(1)} m/s</li><li>λ = ${P.type === "open" ? "2L" : "4L"} = ${((P.type === "open" ? 2 : 4) * P.L).toFixed(3)} m</li><li>f = c/λ = ${fMode(1, P.L, P.r, P.type, P.th, false).toFixed(1)} Hz</li></ul>` },
      { lvl: "adv", marks: 4, q: "In a resonance-tube experiment with a 384 Hz fork, resonances occur at air lengths of 0.211 m and 0.658 m. Find the speed of sound and the end correction.", ans: "<ul><li>L₂ − L₁ = λ/2, so λ = 2 × 0.447 = 0.894 m</li><li>c = fλ = 384 × 0.894 = 343 m/s</li><li>L₁ + e = λ/4 = 0.2235 m</li><li>e = 0.0125 m (about 1.3 cm)</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li>A cylindrical tube, open at both ends or closed at one. Open: fₙ = nc/2L′; closed: fₙ = (2n − 1)c/4L′, with L′ = L + 0.6r per open end (switchable). c = 331 + 0.6θ m/s.</li>
<li>Finger holes are modelled as simply cutting the tube at that point (the effective length × the hole fraction).</li>
<li>The sound: sustained partials at the tube's modes with amplitudes falling as 1/harmonic number (the chosen mode played as the 'note', with its own overtones), plus a little band-pass filtered breath noise.</li>
<li>The picture shows the standing wave of the chosen mode, slowed down enormously: air displacement (particles) or pressure.</li></ul>
<h3>Left out</h3>
<ul><li>The mouthpiece, reed or lips (which set which mode sounds and add their own colour), conical bores (oboe, saxophone: these behave like open tubes), the bell of brass instruments, and the real effect of hole size and position.</li></ul>
<p>The earlier version of this simulation is kept in <a href="original/air_columns.html">original/air_columns.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("Tube");
ctl.preset = K.seg(g, { value: "flute", options: Object.entries(PRESETS).map(([k, v]) => [k, v.name]), on: v => set({ preset: v }) });
ctl.type = K.seg(g, { value: "open", options: [["open", "open at both ends"], ["closed", "closed at one end"]], on: v => P.type = v });
ctl.L = K.slider(g, { label: "Tube length", min: 0.05, max: 3, step: 0.001, value: 0.6, unit: "m", on: v => P.L = v });
ctl.r = K.slider(g, { label: "Tube radius", min: 0.002, max: 0.08, step: 0.0005, value: 0.0095, fmt: v => (v * 100).toFixed(2) + " cm", on: v => P.r = v });
ctl.hole = K.slider(g, { label: "Finger holes open: air column length", min: 0.5, max: 1, step: 0.01, value: 1, fmt: v => v === 1 ? "all closed (whole tube)" : (v * 100).toFixed(0) + "% of the tube", on: v => P.hole = v });
ctl.th = K.slider(g, { label: "Air temperature", min: -10, max: 40, step: 1, value: 20, unit: "°C", on: v => P.th = v });
ctl.corr = K.toggle(g, { label: "Include end correction (0.6r per open end)", value: true, on: v => P.corr = v });
g = ui.group("Playing");
ctl.mode = K.seg(g, { value: 1, options: [[1, "mode 1"], [2, "mode 2"], [3, "mode 3"], [4, "mode 4"]], on: v => P.mode = +v });
ctl.show = K.seg(g, { value: "disp", options: [["disp", "air displacement"], ["press", "pressure"]], on: v => P.show = v });
let rr = K.row(g); K.btn(rr, "▶ Play", () => play(), "primary"); K.btn(rr, "■ Stop", () => stopSound());
ctl.breath = K.slider(g, { label: "Breath noise", min: 0, max: 1, step: 0.05, value: 0.4, fmt: v => (v * 100).toFixed(0) + "%", on: v => P.breath = v });
ctl.vol = K.slider(g, { label: "Listening volume", min: 0, max: 1, step: 0.05, value: 0.5, fmt: v => (v * 100).toFixed(0) + "%", on: v => P.vol = v });
const read = K.readout(ui.group("Readings"), [["f", "note playing"], ["note", "nearest note"], ["c", "speed of sound"], ["lam", "wavelength"], ["Le", "acoustic length L′"]]);
const NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
const noteOf = f => { const m = 69 + 12 * Math.log2(f / 440), r = Math.round(m); return `${NAMES[(r % 12 + 12) % 12]}${Math.floor(r / 12) - 1} (${(100 * (m - r)) >= 0 ? "+" : ""}${(100 * (m - r)).toFixed(0)} cents)`; };
const Lair = () => P.L * P.hole, Fnow = (n = P.mode) => fMode(n, Lair(), P.r, P.type, P.th, P.corr);
function set(o) { const pr = PRESETS[o.preset || "flute"]; Object.assign(P, { type: pr.type, L: pr.L, r: pr.r, th: 20, hole: 1, mode: 1, corr: true, preset: o.preset || "flute" }, o); for (const k of ["L", "r", "hole", "th"]) ctl[k].set(P[k]); ctl.type.set(P.type); ctl.mode.set(P.mode); ctl.preset.set(P.preset); ctl.corr.set(P.corr); }
// the note sounds at the chosen mode; its overtones are the tube's higher modes that are whole multiples of it
async function play() { try { await audioOn(); stopSound(); const f0 = Fnow(), parts = []; for (let k = 1; k <= 16; k++) { const f = f0 * k; const h = Math.round(f / Fnow(1)); const ok = P.type === "open" || h % 2 === 1; parts.push([f, ok ? 1 / k : 0.06 / k]); } playPartials(parts, P.vol, P.dur, P.breath); } catch (e) { ui.tip("Sound could not start: " + e.message, 4000); } }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
// displacement amplitude along the tube (x = 0 at the mouthpiece end, 1 at the far end) for harmonic number h
function dispShape(u, h) { return P.type === "open" ? Math.cos(h * Math.PI * u) : Math.sin(h * Math.PI / 2 * u); }
const pd = []; for (let i = 0; i < 520; i++) pd.push([Math.random(), Math.random()]);
function drawTube() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h);
  const x0 = 70, xw = w - 140, Lmax = Math.max(0.3, P.L), x1 = x0 + xw * (P.L / Lmax), xa = x0 + xw * (Lair() / Lmax), cy = h * 0.24, th = Math.min(70, Math.max(26, P.r * 1600));
  const hN = harmNo(P.mode, P.type);
  // the tube walls (the closed end on the left is the mouthpiece/reed end)
  c.fillStyle = "#24304a"; c.fillRect(x0, cy - th / 2 - 8, x1 - x0, 8); c.fillRect(x0, cy + th / 2, x1 - x0, 8);
  if (P.type === "closed") { c.fillStyle = "#8fa0bf"; c.fillRect(x0 - 8, cy - th / 2 - 8, 8, th + 16); TX(c, "closed end: node", x0 - 4, cy + th / 2 + 26, "#8fa0bf", "left", "11px"); } else TX(c, "open end: antinode", x0, cy + th / 2 + 26, "#8fa0bf", "left", "11px");
  if (P.hole < 1) { c.fillStyle = "#0b1020"; for (let k = 0; k < 4; k++) { const hx = xa + k * 18; if (hx < x1 - 6) c.fillRect(hx - 5, cy - th / 2 - 8, 10, 8); } TX(c, "open holes", xa + 20, cy - th / 2 - 14, "#ffd166", "center", "11px"); }
  TX(c, "open end: antinode", xa, cy + th / 2 + 26, "#8fa0bf", P.hole < 1 ? "center" : "right", "11px");
  // particles: each moves along the tube by an amount set by the standing-wave shape
  const wt = Math.sin(T0 * 3);
  for (const [a, b] of pd) { const u = a, s = dispShape(u, hN); const x = x0 + (xa - x0) * u + s * wt * 16, y = cy - th / 2 + 3 + b * (th - 6); if (x > xa + 2) continue; c.fillStyle = P.show === "disp" ? "#cfe3ff" : "#3b4a6a"; c.fillRect(x - 1, y - 1, 2.2, 2.2); }
  // envelope of the standing wave beneath the tube
  const gy = cy + th / 2 + 110, gh = 70; c.strokeStyle = "#2a3550"; c.beginPath(); c.moveTo(x0, gy); c.lineTo(xa, gy); c.stroke();
  const shape = u => P.show === "disp" ? dispShape(u, hN) : (P.type === "open" ? Math.sin(hN * Math.PI * u) : Math.cos(hN * Math.PI / 2 * (1 - u)));
  for (const sgn of [1, -1]) { c.strokeStyle = sgn > 0 ? (P.show === "disp" ? "#5ad1ff" : "#ff8a70") : "#3a4a6b"; c.lineWidth = 2; c.beginPath(); for (let i = 0; i <= 160; i++) { const u = i / 160; const y = gy - sgn * gh * shape(u) * (sgn > 0 ? wt : 1); i ? c.lineTo(x0 + (xa - x0) * u, y) : c.moveTo(x0, y); } c.stroke(); }
  c.lineWidth = 1; TX(c, P.show === "disp" ? "air displacement along the tube (blue): antinodes at open ends" : "pressure variation (red): nodes at open ends", x0, gy + gh + 22, "#8fa0bf", "left", "11.5px");
  // nodes marked
  for (let i = 0; i <= 400; i++) { const u = i / 400, v = shape(u), v2 = shape((i + 1) / 400); if (i < 400 && v * v2 <= 0 && Math.abs(v) + Math.abs(v2) > 0) { const x = x0 + (xa - x0) * u; c.fillStyle = "#ffd166"; c.beginPath(); c.arc(x, gy, 4, 0, 6.3); c.fill(); TX(c, "N", x, gy - 8, "#ffd166", "center", "600 11px"); } }
  TX(c, `${Fnow().toFixed(1)} Hz · ${noteOf(Fnow())} · mode ${P.mode} = harmonic ${hN} of ${Fnow(1).toFixed(1)} Hz`, 14, 26, "#eef2f8", "left", "600 14px");
}

// ---------------- Charts and readings ----------------
function charts() {
  const f1v = Fnow(1), pts = [], gone = [];
  for (let h = 1; h <= 12; h++) { const ok = P.type === "open" || h % 2 === 1; (ok ? pts : gone).push([h * f1v, ok ? 1 / h : 0.02]); }
  chA.opts.title = "Modes this tube can support"; chA.opts.xLabel = "frequency (Hz)"; chA.opts.yLabel = "relative amplitude";
  chA.draw([{ pts, type: "bars", w: f1v * 0.4, color: "#5ad1ff", label: "supported" }, { pts: gone, type: "bars", w: f1v * 0.4, color: "#3a4a6b", label: "missing" }], { yMin: 0, xMin: 0, xMax: f1v * 13 });
  const op = [], cl = []; for (let L = 0.1; L <= 3; L += 0.02) { op.push([L, fMode(1, L, P.r, "open", P.th, P.corr)]); cl.push([L, fMode(1, L, P.r, "closed", P.th, P.corr)]); }
  chB.opts.title = "Lowest note against length"; chB.opts.xLabel = "tube length (m)"; chB.opts.yLabel = "f₁ (Hz)"; chB.draw([{ pts: op, color: "#7ee787", label: "open" }, { pts: cl, color: "#c9a0ff", label: "closed" }, { pts: [[Lair(), f1v]], type: "dots", r: 6, color: "#fff", label: "now" }], { yMin: 0, yMax: Math.min(3000, Math.max(400, f1v * 2)), xMin: 0 });
  const lam = cOf(P.th) / Fnow(); read.set("f", Fnow().toFixed(1) + " Hz"); read.set("note", noteOf(Fnow())); read.set("c", cOf(P.th).toFixed(1) + " m/s"); read.set("lam", lam.toFixed(3) + " m"); read.set("Le", Leff(Lair(), P.r, P.type, P.corr).toFixed(3) + " m");
  ui.hud(P.type === "open" ? "Open: fₙ = nc/2L′ (all harmonics)" : "Closed: fₙ = (2n − 1)c/4L′ (odd harmonics only)");
}
let frame = 0;
ui.run(dt => { if (dt > 0) T0 += dt; }, () => { drawTube(); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("Press ▶ Play. Try open against closed, and the four modes.", 6000);
