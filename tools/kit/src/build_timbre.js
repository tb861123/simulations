/* =====================================================================
   BUILD A TIMBRE
   Two instruments playing the same note at the same loudness still sound
   different: they have a different TIMBRE (tone colour). Timbre comes from
     1. the SPECTRUM: how strong each harmonic (f, 2f, 3f …) is, and
     2. the ENVELOPE: how the sound starts and dies away
        (Attack, Decay, Sustain, Release: ADSR).
   Any repeating waveform can be built by adding sine waves at whole-number
   multiples of the fundamental (Fourier's idea). More strong high
   harmonics → a "brighter" sound; the SPECTRAL CENTROID (the amplitude-
   weighted average frequency) measures brightness.
   Our ears find the pitch from the REPEAT TIME of the wave, so even with
   the fundamental removed we still hear its pitch: the missing fundamental.
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
const NH = 12;                                                          // number of harmonics we mix
// ready-made spectra (amplitude of harmonic 1 … 12)
const PRESETS = {
  sine: { name: "sine (pure tone)", h: n => n === 1 ? 1 : 0, env: [0.01, 0.1, 1, 0.1] },
  square: { name: "square", h: n => n % 2 ? 1 / n : 0, env: [0.01, 0.1, 1, 0.1] },
  saw: { name: "sawtooth", h: n => 1 / n, env: [0.01, 0.1, 1, 0.1] },
  triangle: { name: "triangle", h: n => n % 2 ? 1 / (n * n) : 0, env: [0.01, 0.1, 1, 0.1] },
  flute: { name: "flute-like", h: n => [1, 0.45, 0.18, 0.08, 0.04, 0.02][n - 1] || 0, env: [0.08, 0.1, 0.9, 0.15] },
  clarinet: { name: "clarinet-like", h: n => n % 2 ? 1 / n : 0.04 / n, env: [0.05, 0.1, 0.9, 0.1] },
  oboe: { name: "oboe-like (nasal)", h: n => [0.4, 0.75, 1, 0.8, 0.55, 0.4, 0.3, 0.2, 0.12, 0.08, 0.05, 0.03][n - 1], env: [0.04, 0.1, 0.85, 0.1] },
  brass: { name: "brass-like", h: n => Math.exp(-0.18 * (n - 3) * (n - 3) / 4) * (n < 3 ? 0.6 + 0.2 * n : 1), env: [0.09, 0.15, 0.8, 0.15] },
  pluck: { name: "plucked string", h: n => Math.abs(Math.sin(n * Math.PI * 0.2)) / (n * n) * 6, env: [0.005, 1.4, 0, 0.3] },
  bell: { name: "bell-like (odd)", h: n => [1, 0, 0.6, 0, 0.5, 0, 0.4, 0, 0.3, 0, 0.25, 0][n - 1], env: [0.003, 2.2, 0, 0.6] }
};
// value of the ADSR envelope at time t (s) for a note held for 'hold' seconds
function envAt(t, env, hold) { const [A, D, S, R] = env; let v; if (t < A) v = t / A; else if (t < A + D) v = 1 - (1 - S) * (t - A) / D; else v = S; if (S === 0 && t >= A + D) v = 0; if (t > hold) { const vh = envAt(hold, env, 1e9); v = Math.max(0, vh * (1 - (t - hold) / R)); } return Math.max(0, v); }
// the waveform: sum of harmonics with given amplitudes and phases
const waveAt = (t, f0, amps, ph) => amps.reduce((s, a, i) => s + a * Math.sin(2 * Math.PI * (i + 1) * f0 * t + (ph ? ph[i] : 0)), 0);
// brightness: amplitude-weighted mean frequency
const centroid = (f0, amps) => { let s = 0, w = 0; amps.forEach((a, i) => { s += Math.abs(a) * (i + 1) * f0; w += Math.abs(a); }); return w ? s / w : 0; };
// the ear's (and a tuner's) way of finding pitch: the smallest delay at which the wave matches itself
function autoPitch(fn, fs = 16000, N = 1600) { const x = []; for (let i = 0; i < N; i++) x.push(fn(i / fs)); const r = [], lo = Math.floor(fs / 1200), hi = Math.floor(fs / 40); let best = -1e9; for (let L = lo; L <= hi; L++) { let s = 0; for (let i = 0; i + L < N; i++) s += x[i] * x[i + L]; s /= (N - L); r[L] = s; best = Math.max(best, s); } for (let L = lo + 1; L < hi; L++) if (r[L] >= 0.97 * best && r[L] >= r[L - 1] && r[L] >= r[L + 1]) { const a = r[L - 1], b = r[L], c = r[L + 1], d = (a - c) / (2 * (a - 2 * b + c) || 1); return fs / (L + d); } return 0; }

// ---------------- Sound (Web Audio) ----------------
const SND = { ctx: null, nodes: [] };
async function audioOn() { SND.ctx = SND.ctx || new (window.AudioContext || window.webkitAudioContext)(); await SND.ctx.resume(); return SND.ctx; }
function stopSound() { for (const n of SND.nodes) { try { n.stop(); } catch (e) { } } SND.nodes = []; }
// one oscillator per harmonic, all sharing the ADSR envelope; a 'bright decay' option lets high harmonics fade faster (like real instruments)
function playNote(f0, amps, env, hold, vol, brightDecay) {
  const ctx = SND.ctx, t = ctx.currentTime + 0.03, norm = Math.max(1, amps.reduce((s, a) => s + Math.abs(a), 0)), [A, D, S, R] = env;
  amps.forEach((a, i) => { const f = f0 * (i + 1); if (!a || f >= ctx.sampleRate / 2) return; const o = ctx.createOscillator(), g = ctx.createGain(), L = vol * a / norm, k = brightDecay ? 1 / (1 + 0.25 * i) : 1; o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(L, t + A); g.gain.setTargetAtTime(L * S * (S ? 1 : 0) + 1e-5, t + A, Math.max(0.01, D * k / 3)); g.gain.setValueAtTime(S ? L * S : 1e-5, t + Math.max(A + D, hold)); g.gain.linearRampToValueAtTime(0, t + Math.max(A + D, hold) + R); o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + Math.max(A + D, hold) + R + 0.05); SND.nodes.push(o); });
}

// ---------------- The page ----------------
const P = { f0: 220, h: [], env: [0.01, 0.1, 1, 0.1], hold: 1.2, vol: 0.5, miss: false, bright: false, preset: "saw", phases: "zero" };
let phs = new Array(NH).fill(0), T0 = 0, rnd = K.rng(Date.now() % 9973 + 91);
const amps = () => P.h.map((a, i) => (P.miss && i === 0) ? 0 : a);
const ui = K.app({
  title: "Build a Timbre", subject: "Music",
  blurb: "Mix harmonics and shape the envelope to design a sound: why instruments sound different on the same note",
  reset: () => set({}),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "GCSE Music (timbre and sonority: why the same note sounds different on different instruments; instrument families; synthesisers) and GCSE Physics (sound waves, frequency and amplitude).", adv: "A level Music (timbre, the harmonic series, synthesis in music technology) and A level Physics (superposition; Fourier ideas behind it). The missing fundamental and spectral centroid are extension ideas from psychoacoustics." } },
  missions: [
    { title: "Pure tone to buzzy", q: "Start with a sine wave, then add harmonics 2, 3, 4 … one at a time. How does the sound and the waveform change?", hint: "The pitch stays the same (it is set by the fundamental's repeat time); the sound gets brighter and buzzier, and the waveform gets more jagged.", setup() { set({ preset: "sine" }); } },
    { title: "Build a square wave", q: "Use only odd harmonics with amplitudes 1, 1/3, 1/5 … What shape appears? What does it sound like?", hint: "A square wave: hollow, clarinet-like, because there are no even harmonics. The more odd harmonics you add, the squarer the corners (with a small overshoot at each edge).", setup() { set({ preset: "square" }); } },
    { title: "Same spectrum, different envelope", q: "Play the sawtooth with a slow attack (0.4 s), then with a fast attack and quick decay to zero. Does it sound like the same instrument?", hint: "No. The start of a note (the attack transient) is a big part of how we recognise an instrument: a slow attack sounds bowed or blown, a sudden attack with decay sounds plucked or struck.", setup() { set({ preset: "saw", env: [0.4, 0.1, 1, 0.3] }); } },
    { title: "The missing fundamental", q: "Choose 'oboe-like', then remove the fundamental. Does the pitch go up to the 2nd harmonic?", hint: "No: you still hear the same pitch. The remaining harmonics (2f, 3f, 4f …) still repeat every 1/f seconds, and your ear finds that repeat. This is why you can hear a bass line on tiny phone speakers.", setup() { set({ preset: "oboe" }); } },
    { title: "Brightness", q: "Compare the flute-like and brass-like sounds. Which has the higher spectral centroid? Which sounds brighter?", hint: "Brass has strong harmonics up to the 5th–6th, so its centroid is higher and it sounds brighter and more brassy. The flute is mostly fundamental: soft and pure.", setup() { set({ preset: "flute" }); } },
    { title: "Phase does not matter (much)", q: "Randomise the phases of the harmonics. The waveform shape changes a lot. Does the sound?", hint: "Hardly at all for a steady note: the ear mostly hears the amplitudes of the harmonics, not how they line up. The same spectrum can have very different waveforms.", setup() { set({ preset: "saw" }); } },
    { lvl: "adv", title: "Fourier synthesis", q: "Build a triangle wave from 1, 1/9, 1/25 … (odd harmonics, 1/n²). Why does it need fewer harmonics than a square wave to look right?", hint: "Its harmonics shrink as 1/n² (a square's as 1/n), so the high ones matter much less: a triangle has no sudden jumps, only corners. Smoother waves have spectra that fall off faster.", setup() { set({ preset: "triangle" }); } },
    { lvl: "adv", title: "Real instruments lose their brightness", q: "Choose 'plucked string' and switch on 'high harmonics decay faster'. How does the tone change during the note?", hint: "It starts bright and mellows as it fades, like a real guitar or piano: the high harmonics lose energy faster (air drag, internal friction). A synthesiser imitates this with a low-pass filter that closes during the note.", setup() { set({ preset: "pluck", bright: true }); } }
  ],
  batch: [
    { title: "Building a square wave", question: "How close does the sum of odd harmonics get to a perfect square wave?", how: "Square wave of amplitude 1; sum of odd harmonics (4/π)(1/n) up to the N-th odd one; RMS error over one cycle (2000 samples).", xLabel: "number of odd harmonics used", yLabel: "RMS error", xs: [1, 2, 3, 4, 6, 8, 12, 16, 24], reps: 1, yMin: 0, theory: N => Math.sqrt(Math.max(0, 1 - 8 / (Math.PI * Math.PI) * Array.from({ length: Math.round(N) }, (_, k) => 1 / (2 * k + 1) ** 2).reduce((a, b) => a + b, 0))), theoryLabel: "√(1 − Σ 8/π²n²)", run: N => { let e = 0; for (let i = 0; i < 2000; i++) { const t = (i + 0.5) / 2000; let s = 0; for (let k = 0; k < N; k++) { const n = 2 * k + 1; s += 4 / (Math.PI * n) * Math.sin(2 * Math.PI * n * t); } e += (s - (t < 0.5 ? 1 : -1)) ** 2; } return Math.sqrt(e / 2000); }, note: "The error falls, but slowly (about 1/√N): the sharp edges need many harmonics. The little overshoot at each edge (the Gibbs effect) never quite goes away." },
    { title: "Brightness of a sawtooth", question: "How does the spectral centroid of a 220 Hz sawtooth rise as more harmonics are added?", how: "Harmonics 1 … N with amplitudes 1/n; centroid measured from a computed spectrum (DFT of 0.1 s).", xLabel: "number of harmonics N", yLabel: "spectral centroid (Hz)", xs: [1, 2, 3, 4, 6, 8, 10, 12], reps: 1, yMin: 0, theory: N => { N = Math.round(N); let s = 0; for (let n = 1; n <= N; n++) s += 1 / n; return 220 * N / s; }, theoryLabel: "220 × N ÷ (1 + ½ + … + 1/N)", run: N => { const fs = 22050, M = 2205, x = []; for (let i = 0; i < M; i++) { let s = 0; for (let n = 1; n <= N; n++) s += Math.sin(2 * Math.PI * n * 220 * i / fs) / n; x.push(s); } let sw = 0, sa = 0; for (let k = 1; k < 400; k++) { let re = 0, im = 0; for (let i = 0; i < M; i += 1) { const a = 2 * Math.PI * k * i / M; re += x[i] * Math.cos(a); im -= x[i] * Math.sin(a); } const m = Math.hypot(re, im); if (m > 1) { sw += m * k * fs / M; sa += m; } } return sw / sa; }, note: "Brightness rises steadily with more harmonics. Sound engineers use the centroid to describe 'bright' against 'dark' tones." },
    { title: "The missing fundamental", question: "If the lowest harmonics are removed, what pitch does an autocorrelation pitch tracker (like the ear) find?", how: "Harmonics k, k+1 … k+5 of 200 Hz, equal amplitudes; pitch found from the first strong peak of the autocorrelation.", xLabel: "lowest harmonic present", yLabel: "pitch found (Hz)", xs: [1, 2, 3, 4, 5, 6], reps: 1, yMin: 0, yMax: 1300, theory: () => 200, theoryLabel: "200 Hz", run: k => autoPitch(t => { let s = 0; for (let n = k; n < k + 6; n++) s += Math.sin(2 * Math.PI * 200 * n * t); return s; }), note: "Still 200 Hz, even with the first five harmonics gone (the lowest present is 1200 Hz). Pitch comes from the repeat time, which all the harmonics share." },
    { title: "Same spectrum, different waveform", question: "If eight equal harmonics have random phases, how tall is the waveform's highest peak?", how: "Harmonics 1–8, amplitude 1 each, phases random; peak of the summed wave over one cycle. With all phases aligned the peak would be 8.", yLabel: "peak height", reps: 300, bins: 24, theory: 8, theoryLabel: "phases aligned", run: (x, r) => { const ph = Array.from({ length: 8 }, () => r() * 2 * Math.PI); let m = 0; for (let i = 0; i < 1000; i++) { const t = i / 1000; let s = 0; for (let n = 1; n <= 8; n++) s += Math.cos(2 * Math.PI * n * t + ph[n - 1]); m = Math.max(m, Math.abs(s)); } return m; }, note: "Usually 4–6: identical spectra (and nearly identical sounds) but very different shapes. Waveform shape alone does not tell you the timbre." },
    { title: "Pitch from autocorrelation", question: "How accurately does autocorrelation find the pitch of a sawtooth with background noise?", how: "220 Hz sawtooth (8 harmonics) plus random noise of increasing size; 30 trials per noise level; error in cents.", xLabel: "noise ÷ signal (RMS)", yLabel: "pitch error (cents)", xs: [0, 0.25, 0.5, 1, 1.5, 2], reps: 30, yMin: 0, theory: () => 0, theoryLabel: "no error", run: (x, r) => { const nz = Array.from({ length: 1700 }, () => r.gauss()); const rms = Math.sqrt(Array.from({ length: 8 }, (_, i) => 0.5 / (i + 1) ** 2).reduce((a, b) => a + b, 0)); const fp = autoPitch(t => { let s = 0; for (let n = 1; n <= 8; n++) s += Math.sin(2 * Math.PI * 220 * n * t) / n; return s + x * rms * nz[Math.round(t * 16000)]; }); return Math.abs(1200 * Math.log2(fp / 220)); }, note: "Errors of only a cent or two up to noise ÷ signal ≈ 0.5. When the noise is as strong as the note, the tracker often locks on to the wrong octave or harmonic (errors of 1200 cents or more). Tuner apps face exactly this problem." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "GCSE Music", text: "Timbre (tone colour, sonority) is what makes a flute and a violin sound different on the same note. It depends on the mix of harmonics and on how the note starts and ends." },
      { lvl: "std", tag: "GCSE Music", text: "Synthesisers build sounds from waveforms (sine, square, sawtooth, triangle), filters and an ADSR envelope: attack, decay, sustain, release." },
      { lvl: "std", tag: "GCSE Physics", text: "The pitch of a note depends on its frequency; its loudness on its amplitude. Two notes can share both and still differ in waveform shape." },
      { lvl: "adv", tag: "A level", text: "Superposition: any periodic wave is a sum of sine waves at whole-number multiples of its fundamental frequency (a Fourier series)." },
      { lvl: "adv", tag: "Extension", text: "The missing fundamental: the perceived pitch of a complex tone is its repeat rate, so it is unchanged when the fundamental is removed." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: "A trumpet and a clarinet both play a 440 Hz note at the same loudness. Explain why they sound different.", ans: "<ul><li>they have a different timbre: different amounts of each harmonic (the clarinet mainly odd harmonics)</li><li>and different attacks / envelopes</li></ul>" },
      { lvl: "std", marks: 1, q: "What does the 'A' in an ADSR envelope control?", ans: "<ul><li>Attack: how quickly the note reaches full volume at the start</li></ul>" },
      { lvl: "adv", marks: 3, q: () => `A note has a fundamental of ${P.f0} Hz. Give the frequencies of its 2nd, 3rd and 5th harmonics. Which of these would be missing from a square wave?`, ans: () => `<ul><li>${2 * P.f0} Hz, ${3 * P.f0} Hz, ${5 * P.f0} Hz</li><li>a square wave has only odd harmonics</li><li>so the 2nd harmonic (${2 * P.f0} Hz) is missing</li></ul>` }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li>The sound is the sum of up to 12 harmonics nf₀ with the amplitudes you set (phases zero or random), shaped by an ADSR envelope (linear attack, exponential decay to the sustain level, linear release).</li>
<li>Optional: higher harmonics decay faster (each with a decay time ÷ (1 + 0.25(n − 1))), like a real plucked or struck instrument.</li>
<li>Spectral centroid = Σ fₙaₙ ÷ Σ aₙ. Pitch is estimated by autocorrelation: the smallest delay at which the wave nearly matches itself.</li>
<li>The presets are simplified spectra that suggest each instrument; real instruments' spectra change with pitch, loudness and time.</li></ul>
<h3>Left out</h3>
<ul><li>Noise in the attack (breath, bow scrape, hammer thump), vibrato, formants (fixed resonances of the instrument body, which matter a lot for the voice and oboe), and inharmonic partials (bells, drums).</li></ul>
<p>The earlier version of this simulation is kept in <a href="original/build_timbre.html">original/build_timbre.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = { h: [] };
let g = ui.group("Starting sound");
ctl.preset = K.seg(g, { value: "saw", options: Object.entries(PRESETS).map(([k, v]) => [k, v.name]), on: v => set({ preset: v }) });
ctl.f0 = K.slider(g, { label: "Fundamental frequency", min: 55, max: 880, step: 1, value: 220, unit: "Hz", on: v => P.f0 = v });
g = ui.group("Harmonics (amplitude of each)");
for (let n = 1; n <= NH; n++) ctl.h.push(K.slider(g, { label: n === 1 ? "harmonic 1 (the fundamental, f₀)" : `harmonic ${n} (${n} × f₀)`, min: 0, max: 1, step: 0.01, value: 0, fmt: v => v.toFixed(2), on: v => P.h[n - 1] = v }));
let rr = K.row(g); K.btn(rr, "Random phases", () => { phs = phs.map(() => rnd() * 2 * Math.PI); P.phases = "random"; }); K.btn(rr, "Zero phases", () => { phs = phs.map(() => 0); P.phases = "zero"; });
ctl.miss = K.toggle(g, { label: "Remove the fundamental", value: false, on: v => P.miss = v });
g = ui.group("Envelope (ADSR) and playing");
const ENV = ["Attack", "Decay", "Sustain level", "Release"]; ctl.env = ENV.map((lab, i) => K.slider(g, { label: lab, min: i === 2 ? 0 : 0.003, max: i === 2 ? 1 : (i === 1 ? 3 : 1.5), step: i === 2 ? 0.01 : 0.001, value: P.env[i], fmt: v => i === 2 ? (v * 100).toFixed(0) + "%" : v.toFixed(3) + " s", on: v => P.env[i] = v }));
ctl.hold = K.slider(g, { label: "Key held for", min: 0.1, max: 4, step: 0.1, value: 1.2, unit: "s", on: v => P.hold = v });
ctl.bright = K.toggle(g, { label: "High harmonics decay faster", value: false, on: v => P.bright = v });
rr = K.row(g); K.btn(rr, "▶ Play", () => play(), "primary"); K.btn(rr, "■ Stop", () => stopSound());
ctl.vol = K.slider(g, { label: "Listening volume", min: 0, max: 1, step: 0.05, value: 0.5, fmt: v => (v * 100).toFixed(0) + "%", on: v => P.vol = v });
const read = K.readout(ui.group("Readings"), [["pitch", "pitch you hear (autocorrelation)"], ["cent", "spectral centroid (brightness)"], ["nh", "harmonics present"], ["per", "repeat time"]]);
function set(o) { const pr = PRESETS[o.preset || "saw"]; Object.assign(P, { f0: 220, env: pr.env.slice(), hold: 1.2, miss: false, bright: false, preset: o.preset || "saw" }, o); P.h = Array.from({ length: NH }, (_, i) => +Math.min(1, Math.max(0, pr.h(i + 1))).toFixed(2)); phs = phs.map(() => 0); ctl.h.forEach((s, i) => s.set(P.h[i])); ctl.env.forEach((s, i) => s.set(P.env[i])); ctl.f0.set(P.f0); ctl.hold.set(P.hold); ctl.miss.set(P.miss); ctl.bright.set(P.bright); ctl.preset.set(P.preset); }
async function play() { try { await audioOn(); stopSound(); playNote(P.f0, amps(), P.env, P.hold, P.vol, P.bright); T0 = 0; } catch (e) { ui.tip("Sound could not start: " + e.message, 4000); } }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function drawView() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h);
  const a = amps(), x0 = 50, x1 = w - 30;
  // the separate harmonics, stacked (only those present)
  const on = a.map((v, i) => [v, i]).filter(([v]) => v > 0.005), rowH = Math.min(26, (h * 0.42) / Math.max(1, on.length));
  TX(c, "the harmonics you are adding (two cycles of the fundamental)", x0, 24, "#8fa0bf", "left", "12px");
  on.forEach(([v, i], k) => { const yy = 44 + rowH * (k + 0.5); c.strokeStyle = `hsl(${200 + i * 13},80%,${55 + 15 * v}%)`; c.lineWidth = 1.3; c.beginPath(); for (let j = 0; j <= 300; j++) { const u = j / 300, x = x0 + (x1 - x0) * u, y = yy - rowH * 0.42 * v * Math.sin(2 * Math.PI * (i + 1) * 2 * u + phs[i]); j ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); TX(c, `${i + 1}f`, x0 - 8, yy + 4, "#8fa0bf", "right", "10.5px"); });
  // the sum, scaled so its biggest peak fits
  const top = 44 + rowH * on.length + 34, hb = Math.max(40, Math.min(120, (h - top - 50) / 2)), yb = top + hb, ys = []; let pk = 1e-6;
  for (let j = 0; j <= 600; j++) { const u = j / 600, v = a.reduce((s, q, i) => s + q * Math.sin(2 * Math.PI * (i + 1) * 2 * u + phs[i]), 0); ys.push(v); pk = Math.max(pk, Math.abs(v)); }
  c.strokeStyle = "#2a3550"; c.lineWidth = 1; c.beginPath(); c.moveTo(x0, yb); c.lineTo(x1, yb); c.stroke();
  TX(c, "= the waveform you hear (their sum)", x0, top - 12, "#eef2f8", "left", "600 13px");
  c.strokeStyle = "#ffd166"; c.lineWidth = 2.2; c.beginPath(); ys.forEach((v, j) => { const x = x0 + (x1 - x0) * j / 600, y = yb - hb * 0.95 * v / pk; j ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke(); c.lineWidth = 1;
  // mark one period
  c.strokeStyle = "#7ee787"; c.beginPath(); c.moveTo(x0, yb + hb + 8); c.lineTo((x0 + x1) / 2, yb + hb + 8); c.stroke(); TX(c, `one repeat: 1/f₀ = ${(1000 / P.f0).toFixed(2)} ms`, (x0 * 3 + x1) / 4, yb + hb + 22, "#7ee787", "center", "11.5px");
}

// ---------------- Charts and readings ----------------
function charts() {
  const a = amps();
  chA.opts.title = "Spectrum"; chA.opts.xLabel = "frequency (Hz)"; chA.opts.yLabel = "amplitude";
  const cen = centroid(P.f0, a);
  chA.draw([{ pts: a.map((v, i) => [(i + 1) * P.f0, v]), type: "bars", w: P.f0 * 0.4, color: "#c9a0ff", label: "harmonics" }, { pts: [[cen, 0], [cen, 1.05]], color: "#ffd166", label: "centroid" }], { yMin: 0, yMax: 1.05, xMin: 0, xMax: P.f0 * (NH + 1) });
  const pts = [], T = Math.max(P.env[0] + P.env[1], P.hold) + P.env[3] + 0.3; for (let i = 0; i <= 200; i++) { const t = T * i / 200; pts.push([t, envAt(t, P.env, P.hold)]); }
  chB.opts.title = "Envelope: loudness over the note"; chB.opts.xLabel = "time (s)"; chB.opts.yLabel = "level"; chB.draw([{ pts, type: "area", color: "#7ee787", label: "ADSR" }, { pts: [[P.hold, 0], [P.hold, 1]], color: "#ff8a70", label: "key released" }], { yMin: 0, yMax: 1.05, xMin: 0 });
  const pf = autoPitch(t => waveAt(t, P.f0, a, phs));
  read.set("pitch", pf ? pf.toFixed(1) + " Hz" + (P.miss ? " (fundamental removed!)" : "") : "none"); read.set("cent", cen.toFixed(0) + " Hz (" + (cen / P.f0).toFixed(2) + " × f₀)"); read.set("nh", a.filter(v => v > 0.005).map((v, i) => i).length + " of " + NH); read.set("per", (1000 / P.f0).toFixed(2) + " ms");
  ui.hud("Timbre = which harmonics + how the note starts and ends");
}
let frame = 0, dirty = "";
ui.run(dt => { if (dt > 0) T0 += dt; }, () => { drawView(); const k = JSON.stringify([P, phs]); if (k !== dirty && frame++ % 3 === 0) { dirty = k; charts(); } });
set({});
ui.tip("Press ▶ Play, then drag the harmonic sliders and play again.", 6000);
