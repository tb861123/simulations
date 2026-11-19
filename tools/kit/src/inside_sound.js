/* =====================================================================
   INSIDE A SOUND
   A sound is a LONGITUDINAL wave: air particles vibrate back and forth
   along the direction the wave travels, making COMPRESSIONS (particles
   bunched, higher pressure) and RAREFACTIONS (spread out, lower pressure).
     • FREQUENCY (Hz, vibrations per second) → we hear PITCH;
     • AMPLITUDE (size of the pressure swing) → we hear LOUDNESS;
     • the WAVEFORM (its shape) → we hear TIMBRE: any repeating wave is a
       sum of sine waves at f, 2f, 3f, … (its HARMONICS or partials).
   The wave travels at the speed of sound v (about 343 m/s in air at 20 °C):
        v = f λ        (λ = wavelength, the distance between compressions)
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
// harmonic amplitudes (first 16) for each waveform: sine 1; square 1/n (odd); triangle ±1/n² (odd); sawtooth ±1/n (all)
const SHAPES = { sine: "sine", square: "square", triangle: "triangle", saw: "sawtooth" };
function partials(shape, N = 16) { const a = []; for (let n = 1; n <= N; n++) a.push(shape === "sine" ? (n === 1 ? 1 : 0) : shape === "square" ? (n % 2 ? 1 / n : 0) : shape === "triangle" ? (n % 2 ? (-1) ** ((n - 1) / 2) / (n * n) : 0) : (-1) ** (n + 1) / n); return a; }
// the waveform value at phase θ (one cycle = 2π), as the sum of its partials (scaled so the biggest swing is about 1)
const SCALE = { sine: 1, square: Math.PI / 4, triangle: Math.PI * Math.PI / 8, saw: 1 / 1.85 };
const wave = (shape, th, a = partials(shape)) => SCALE[shape] * a.reduce((s, v, i) => s + v * Math.sin((i + 1) * th), 0);
// speed of sound: air 331 + 0.6T m/s; water ≈ 1480 m/s; steel ≈ 5960 m/s
const MEDIA = { air: { name: "air", v: T => 331 + 0.6 * T }, water: { name: "water", v: () => 1480 }, steel: { name: "steel", v: () => 5960 } };
// sound level: 0 dB at the threshold of hearing (20 µPa); every ×10 in pressure adds 20 dB
const dB = p => 20 * Math.log10(p / 20e-6);
// measuring the size of each harmonic from a sampled waveform (a discrete Fourier transform), as a sound analyser does
function dft(samples, n) { let re = 0, im = 0; const N = samples.length; for (let k = 0; k < N; k++) { const th = 2 * Math.PI * n * k / N; re += samples[k] * Math.cos(th); im += samples[k] * Math.sin(th); } return 2 * Math.hypot(re, im) / N; }

// ---------------- Sound (Web Audio) ----------------
const SND = { ctx: null, nodes: [] };
async function audioOn() { SND.ctx = SND.ctx || new (window.AudioContext || window.webkitAudioContext)(); await SND.ctx.resume(); return SND.ctx; }
function stopSound() { for (const n of SND.nodes) { try { n.stop(); } catch (e) { } } SND.nodes = []; }
// play a set of partials [frequency, amplitude] with an envelope; negative amplitudes are played inverted (a negative gain)
function playPartials(parts, o) {
  const ctx = SND.ctx, t = ctx.currentTime + 0.03, norm = Math.max(1, parts.reduce((s, p) => s + Math.abs(p[1]), 0));
  for (const [f, a] of parts) {
    if (!a || f >= ctx.sampleRate / 2 || f < 15) continue; const osc = ctx.createOscillator(), g = ctx.createGain(), L = o.vol * a / norm;
    osc.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(L, t + 0.02); g.gain.setValueAtTime(L, t + o.dur - 0.08); g.gain.linearRampToValueAtTime(0, t + o.dur);
    osc.connect(g); g.connect(ctx.destination); osc.start(t); osc.stop(t + o.dur + 0.05); SND.nodes.push(osc);
  }
}

// ---------------- The page ----------------
const P = { f: 262, amp: 0.6, shape: "sine", medium: "air", T: 20, scope: false, tb: 1, vdiv: 0.5, vol: 0.4, harm: 16, speed: 1 };
let T0 = 0, paused = false, rnd = K.rng(Date.now() % 9973 + 41);
const ui = K.app({
  title: "Inside a Sound", subject: "Music",
  blurb: "Air particles, compressions and rarefactions; pitch, loudness and waveform; v = fλ, the oscilloscope and the spectrum",
  reset: () => set({}),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "GCSE Music (the elements of music: pitch, dynamics, timbre/sonority) and GCSE Physics (sound as a longitudinal wave, compressions and rarefactions, frequency and amplitude, v = fλ, the range of human hearing 20 Hz–20 kHz, reading oscilloscope traces).", adv: "A level Physics (WJEC Eduqas and others: progressive waves, superposition, the speed of sound, intensity and the decibel scale) and A level Music (timbre and the harmonic series). Fourier analysis is beyond most specifications." } },
  missions: [
    { title: "Compressions and rarefactions", q: "Watch the air particles. Do they travel along with the wave? Where are the compressions?", hint: "Each particle only vibrates back and forth around its own place; the pattern of compressions (bunched, high pressure) and rarefactions (spread out, low pressure) is what travels. That is a longitudinal wave.", setup() { set({}); } },
    { title: "Higher pitch", q: "Double the frequency from 262 Hz (middle C) to 524 Hz. What happens to the pitch, the compressions and the wavelength?", hint: "The pitch goes up an octave; the compressions come twice as often and are half as far apart (λ halves, from 1.31 m to 0.65 m), because v = fλ and the speed stays the same.", setup() { set({ f: 524 }); } },
    { title: "Louder", q: "Increase the amplitude. What changes in the particles, the trace and the sound? Does the pitch change?", hint: "The particles move further and the pressure swings are bigger, so it sounds louder. The frequency (pitch) and wavelength stay the same.", setup() { set({ amp: 1 }); } },
    { title: "Waveforms and timbre", q: "Compare a sine and a square wave at the same frequency. Which sounds brighter? Look at the spectrum.", hint: "The square wave contains odd harmonics (3f, 5f, 7f… with amplitudes 1/3, 1/5, 1/7…), so it sounds brighter and buzzier. Same pitch, different timbre.", setup() { set({ shape: "square" }); } },
    { title: "Reading an oscilloscope", q: "Switch on the oscilloscope. Count the squares for one cycle and use the time base to find the period and the frequency.", hint: "Period = number of squares × time base (ms per square); frequency = 1 ÷ period. Amplitude = squares from the centre × volts per square.", setup() { set({ scope: true, f: 400, tb: 1 }); } },
    { title: "Sound in water and steel", q: "Change the medium to water, then steel. What happens to the wavelength of the same note? Why?", hint: "Sound travels faster in water (1480 m/s) and steel (5960 m/s) because the particles are closer together and more strongly linked. The frequency stays the same, so the wavelength is longer (λ = v ÷ f).", setup() { set({ medium: "water" }); } },
    { title: "The limits of hearing", q: "Try 25 Hz and 15 000 Hz. Can you hear them? What range can humans hear?", hint: "Humans hear roughly 20 Hz to 20 000 Hz, and the upper limit falls with age. Below 20 Hz is infrasound; above 20 kHz ultrasound (used for scans and cleaning). Your speakers may not reproduce very low notes.", setup() { set({ f: 15000 }); } },
    { lvl: "adv", title: "Building a square wave", q: "Reduce the number of harmonics used for the square wave from 16 to 1, 3 and 5. How does the shape build up?", hint: "One harmonic gives a sine wave; adding 3f and 5f squares the corners. Any periodic wave can be built from sine waves (Fourier). The wiggles near the jumps never quite go away (the Gibbs effect).", setup() { set({ shape: "square", harm: 3 }); } },
    { lvl: "adv", title: "Decibels", q: "Double the amplitude. By how many decibels does the sound level rise?", hint: "Level = 20 log₁₀(p ÷ 20 µPa), so doubling the pressure amplitude adds 20 log₁₀ 2 = 6 dB. Doubling the intensity (power) adds 3 dB.", setup() { set({ amp: 0.3 }); } }
  ],
  batch: [
    { title: "Measuring wavelength: v = fλ", question: "If you measure the distance between compressions for notes of different frequency, does f × λ stay the same?", how: "Air at 20 °C; distance across 5 compressions measured with a tape (±2 cm), divided by 5.", xLabel: "frequency (Hz)", yLabel: "wavelength measured (m)", xs: [100, 200, 300, 400, 600, 800], reps: 8, yMin: 0, theory: f => MEDIA.air.v(20) / f, theoryLabel: "λ = v ÷ f", run: (f, r) => (5 * MEDIA.air.v(20) / f + 0.02 * r.gauss()) / 5, note: "λ falls as 1/f: doubling the frequency halves the wavelength, because the speed of sound in the air is the same for every note." },
    { title: "Speed of sound and temperature", question: "How does the speed of sound in air change with temperature?", how: "Timing an echo from a wall 50 m away (100 m there and back) with light gates (±0.5 ms).", xLabel: "temperature (°C)", yLabel: "speed of sound (m/s)", xs: [-10, 0, 10, 20, 30, 40], reps: 6, theory: T => 331 + 0.6 * T, theoryLabel: "331 + 0.6T", run: (T, r) => 100 / (100 / (331 + 0.6 * T) + 0.0005 * r.gauss()), note: "Warmer air carries sound faster (the molecules move faster): about 0.6 m/s more per °C." },
    { title: "Harmonics of a square wave", question: "Using a sound analyser (a Fourier transform) on a square wave, how big is each harmonic?", how: "One cycle of the square wave (16 partials) sampled 256 times; amplitude of harmonic n relative to the fundamental.", xLabel: "harmonic number n", yLabel: "amplitude ÷ fundamental", xs: [1, 2, 3, 4, 5, 6, 7, 9], reps: 1, yMin: 0, theory: n => Math.round(n) % 2 ? 1 / n : 0, theoryLabel: "1/n for odd n", run: n => { const s = Array.from({ length: 256 }, (_, k) => wave("square", 2 * Math.PI * k / 256)); return dft(s, n) / dft(s, 1); }, note: "Only odd harmonics, getting weaker as 1/n: that recipe is what makes a square wave sound like a clarinet-ish buzz." },
    { title: "Reading the period from an oscilloscope", question: "If students read the period of a 400 Hz trace (time base 1 ms per square) to the nearest 0.1 square, what frequencies do they get?", how: "True period 2.5 squares; each student reads it to ±0.1 square (SD).", yLabel: "frequency found (Hz)", reps: 300, bins: 20, theory: 400, theoryLabel: "true", run: (x, r) => 1 / ((2.5 + 0.1 * r.gauss()) * 1e-3), note: "About ±16 Hz (4%) from one reading: measuring across several cycles and dividing is far more precise." },
    { title: "Doubling the amplitude", question: "How does the sound level (dB) change as the pressure amplitude increases?", how: "Pressure amplitudes from 0.002 to 2 Pa.", xLabel: "log₁₀(pressure amplitude / Pa)", yLabel: "sound level (dB)", xs: [-2.7, -2, -1.3, -0.7, 0, 0.3], reps: 1, theory: x => dB(10 ** x), theoryLabel: "20 log₁₀(p ÷ 20 µPa)", run: x => dB(10 ** x), note: "A straight line: every ×10 in pressure adds 20 dB, and every doubling adds 6 dB. Our ears hear ratios, not differences." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "GCSE Physics", text: "Sound is a longitudinal wave: the particles vibrate parallel to the direction the wave travels, making compressions and rarefactions. It needs a medium; it cannot travel through a vacuum." },
      { lvl: "std", tag: "GCSE Physics", text: "Frequency (Hz) = number of waves per second; higher frequency = higher pitch. Amplitude = size of the vibration; bigger amplitude = louder. Wave speed v = fλ; sound in air ≈ 340 m/s." },
      { lvl: "std", tag: "GCSE Physics", text: "Human hearing: about 20 Hz to 20 kHz. Ultrasound is above 20 kHz (scans, cleaning, sonar)." },
      { lvl: "std", tag: "GCSE Music", text: "Timbre (sonority) is the 'colour' of a sound: what makes a flute and a violin playing the same note sound different. It comes from the mixture of harmonics and how the sound starts and dies away." },
      { lvl: "adv", tag: "A level", text: "Any periodic waveform is a sum of sine waves at f, 2f, 3f… (Fourier). Square: odd harmonics ∝ 1/n; triangle: odd harmonics ∝ 1/n²; sawtooth: all harmonics ∝ 1/n." },
      { lvl: "adv", tag: "A level", text: "Sound level L = 20 log₁₀(p/p₀) = 10 log₁₀(I/I₀), p₀ = 20 µPa, I₀ = 10⁻¹² W m⁻². Doubling intensity: +3 dB; doubling pressure: +6 dB." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: () => `A note has frequency ${P.f} Hz. Calculate its wavelength in ${MEDIA[P.medium].name} (v = ${MEDIA[P.medium].v(P.T).toFixed(0)} m/s).`, ans: () => `<ul><li>λ = v ÷ f = ${MEDIA[P.medium].v(P.T).toFixed(0)} ÷ ${P.f}</li><li>= ${(MEDIA[P.medium].v(P.T) / P.f).toFixed(3)} m</li></ul>` },
      { lvl: "std", marks: 3, q: "Describe how the particles of air move as a sound wave passes, and explain what compressions and rarefactions are.", ans: "<ul><li>particles vibrate back and forth about fixed positions, parallel to the direction of the wave</li><li>compressions: regions where particles are close together (higher pressure)</li><li>rarefactions: regions where particles are spread out (lower pressure)</li></ul>" },
      { lvl: "std", marks: 2, q: "On an oscilloscope one cycle of a trace takes 4 squares and the time base is 0.5 ms per square. Calculate the frequency.", ans: "<ul><li>period = 4 × 0.5 ms = 2 ms = 0.002 s</li><li>f = 1 ÷ 0.002 = 500 Hz</li></ul>" },
      { lvl: "adv", marks: 3, q: "Explain why a flute and a clarinet playing the same note sound different, using the idea of harmonics.", ans: "<ul><li>both have the same fundamental frequency (pitch)</li><li>but different amounts of each harmonic (the clarinet is strong in odd harmonics)</li><li>and different attacks and decays, so the waveforms and timbres differ</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li><b>Waveforms:</b> ideal periodic signals built from their first 16 harmonics (sine; square: odd harmonics 1/n; triangle: odd harmonics ±1/n²; sawtooth: all harmonics ±1/n). The sound you hear plays these partials at the real frequency.</li>
<li><b>Particles:</b> each particle is displaced along the line by an amount that follows the chosen waveform; the picture is slowed down enormously (real air particles at 262 Hz vibrate 262 times a second) and the displacement is exaggerated.</li>
<li><b>Speed of sound:</b> air 331 + 0.6T m/s; water 1480 m/s; steel 5960 m/s. Wavelength λ = v/f.</li>
<li><b>Level:</b> the amplitude slider is mapped to a pressure amplitude of 0.002–2 Pa for the decibel reading; real loudness also depends on frequency (our ears are most sensitive at 2–5 kHz) and on your speakers.</li>
<li><b>Oscilloscope:</b> the trace is the pressure (as a microphone voltage) against time, with the time base and volts per square you choose.</li></ul>
<h3>Left out</h3>
<ul><li>Damping, reflections, the ear's frequency response, real instruments' changing spectra. Very low or high notes may not be reproduced by your speakers.</li></ul>
<p>The earlier version of this simulation is kept in <a href="original/inside_sound.html">original/inside_sound.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("Sound");
ctl.f = K.slider(g, { label: "Frequency (pitch)", min: 20, max: 20000, step: 1, value: 262, unit: "Hz", on: v => { P.f = v; } });
ctl.amp = K.slider(g, { label: "Amplitude (loudness)", min: 0.05, max: 1, step: 0.01, value: 0.6, on: v => P.amp = v });
ctl.shape = K.seg(g, { label: "Waveform (timbre)", value: "sine", options: Object.entries(SHAPES).map(([k, v]) => [k, v]), on: v => P.shape = v });
ctl.harm = K.slider(g, { label: "Harmonics used (A level)", min: 1, max: 16, step: 1, value: 16, on: v => P.harm = v });
let rr = K.row(g); K.btn(rr, "▶ Play", () => play(), "primary"); K.btn(rr, "■ Stop", () => stopSound());
ctl.vol = K.slider(g, { label: "Listening volume", min: 0, max: 1, step: 0.05, value: 0.4, fmt: v => (v * 100).toFixed(0) + "%", on: v => P.vol = v });
g = ui.group("Medium");
ctl.medium = K.seg(g, { value: "air", options: Object.entries(MEDIA).map(([k, v]) => [k, v.name]), on: v => P.medium = v });
ctl.T = K.slider(g, { label: "Air temperature", min: -20, max: 40, step: 1, value: 20, unit: "°C", on: v => P.T = v });
g = ui.group("Oscilloscope");
ctl.scope = K.toggle(g, { label: "Show the oscilloscope", value: false, on: v => P.scope = v });
ctl.tb = K.seg(g, { label: "Time base", value: 1, options: [[0.1, "0.1 ms/div"], [0.2, "0.2"], [0.5, "0.5"], [1, "1"], [2, "2"], [5, "5 ms/div"]], on: v => P.tb = +v });
ctl.vdiv = K.seg(g, { label: "Volts per square", value: 0.5, options: [[0.1, "0.1 V"], [0.2, "0.2 V"], [0.5, "0.5 V"], [1, "1 V"]], on: v => P.vdiv = +v });
K.btn(K.row(g), "⏸ Pause the picture", () => paused = !paused);
const read = K.readout(ui.group("Readings"), [["f", "frequency · period"], ["v", "speed of sound"], ["l", "wavelength"], ["db", "sound level"], ["h", "can humans hear it?"]]);
function set(o) { Object.assign(P, { f: 262, amp: 0.6, shape: "sine", medium: "air", T: 20, scope: false, tb: 1, vdiv: 0.5, harm: 16 }, o); for (const k of ["f", "amp", "harm", "T"]) ctl[k].set(P[k]); ctl.shape.set(P.shape); ctl.medium.set(P.medium); ctl.scope.set(P.scope); ctl.tb.set(P.tb); ctl.vdiv.set(P.vdiv); }
const amps = () => partials(P.shape).map((v, i) => i < P.harm ? v : 0);
async function play() { try { await audioOn(); stopSound(); playPartials(amps().map((a, i) => [P.f * (i + 1), a * P.amp]), { vol: P.vol, dur: 2 }); ui.tip("Playing for 2 seconds", 1500); } catch (e) { ui.tip("Sound could not start: " + e.message, 4000); } }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); const a = amps(), v = MEDIA[P.medium].v(P.T), lam = v / P.f;
  // the picture shows 3 wavelengths across the screen whatever the frequency, so the slowed-down time runs one cycle every 2 s
  const lamPx = (w - 80) / 3, ph = T0 * Math.PI, sc = SCALE[P.shape];
  const y0 = 60, hh = P.scope ? h * 0.42 : h * 0.55, rows = 9, cols = Math.round((w - 80) / 9);
  // air particles: displaced along the line by the waveform (exaggerated)
  for (let rI = 0; rI < rows; rI++) for (let cI = 0; cI < cols; cI++) { const x0 = 40 + cI * 9 + (rI % 2) * 4.5, th = 2 * Math.PI * (x0 - 40) / lamPx - ph, d = P.amp * 0.85 * lamPx / (2 * Math.PI) * sc * a.reduce((s, q, i) => s - q * Math.cos((i + 1) * th) / (i + 1), 0); c.fillStyle = cI === Math.round(cols / 3) && rI === 4 ? "#ff6b81" : "#7fb8ff"; c.beginPath(); c.arc(x0 + d, y0 + 20 + rI * (hh - 40) / rows, 2.2, 0, 6.3); c.fill(); }
  // pressure graph under the particles
  const gy = y0 + hh + 66, gh = 40; c.strokeStyle = "rgba(255,255,255,.2)"; c.beginPath(); c.moveTo(40, gy); c.lineTo(w - 40, gy); c.stroke(); c.strokeStyle = "#ffd166"; c.lineWidth = 2; c.beginPath(); for (let x = 40; x <= w - 40; x += 2) { const th = 2 * Math.PI * (x - 40) / lamPx - ph, p = P.amp * wave(P.shape, th, a); x === 40 ? c.moveTo(x, gy - p * gh) : c.lineTo(x, gy - p * gh); } c.stroke(); c.lineWidth = 1;
  TX(c, "pressure along the line (compressions above, rarefactions below)", 40, gy + gh + 16, "#ffd166", "left", "11px");
  c.strokeStyle = "#7ee787"; c.beginPath(); c.moveTo(40, y0 + 8); c.lineTo(40 + lamPx, y0 + 8); c.stroke(); TX(c, `one wavelength λ = ${lam >= 1 ? lam.toFixed(2) + " m" : (lam * 100).toFixed(1) + " cm"}`, 40 + lamPx / 2, y0 + 2, "#7ee787", "center", "11.5px");
  TX(c, `${P.f} Hz ${SHAPES[P.shape]} wave in ${MEDIA[P.medium].name}, travelling at ${v.toFixed(0)} m/s`, 14, 24, "#eef2f8", "left", "600 13px"); TX(c, "particles vibrate back and forth (follow the red one); the bunched regions are compressions", 14, y0 + hh + 14, "#8fa0bf", "left", "11px");
  if (P.scope) {
    const sx = 40, sy = gy + gh + 30, sw = w - 80, sh = h - sy - 14, nx = 10, ny = 6; c.fillStyle = "#06140a"; c.fillRect(sx, sy, sw, sh); c.strokeStyle = "rgba(126,231,135,.2)";
    for (let i = 0; i <= nx; i++) { c.beginPath(); c.moveTo(sx + i * sw / nx, sy); c.lineTo(sx + i * sw / nx, sy + sh); c.stroke(); } for (let j = 0; j <= ny; j++) { c.beginPath(); c.moveTo(sx, sy + j * sh / ny); c.lineTo(sx + sw, sy + j * sh / ny); c.stroke(); }
    const volts = P.amp * 1.0; c.strokeStyle = "#7ee787"; c.lineWidth = 2; c.beginPath(); for (let i = 0; i <= sw; i++) { const tms = i / sw * nx * P.tb, th = 2 * Math.PI * P.f * tms / 1000, y = sy + sh / 2 - volts * wave(P.shape, th, a) / P.vdiv * sh / ny; i ? c.lineTo(sx + i, Math.max(sy, Math.min(sy + sh, y))) : c.moveTo(sx, y); } c.stroke(); c.lineWidth = 1;
    TX(c, `oscilloscope: ${P.tb} ms per square across, ${P.vdiv} V per square up (peak ${volts.toFixed(2)} V)`, sx + 4, sy + 14, "#7ee787", "left", "11px");
  }
}

// ---------------- Charts and readings ----------------
function charts() {
  const a = amps();
  chA.opts.title = "Spectrum: the harmonics in this sound"; chA.opts.xLabel = "frequency (Hz)"; chA.opts.yLabel = "relative amplitude";
  chA.draw([{ pts: a.map((v, i) => [P.f * (i + 1), Math.abs(v)]).filter(q => q[1] > 0), type: "bars", w: P.f * 0.35, color: "#c9a0ff", label: "harmonics" }], { yMin: 0, yMax: 1.05, xMin: 0, xMax: P.f * 17 });
  chB.opts.title = "Waveform over two cycles"; chB.opts.xLabel = "time (ms)"; chB.opts.yLabel = "pressure"; const pts = []; for (let k = 0; k <= 200; k++) { const tms = k / 200 * 2000 / P.f; pts.push([tms, P.amp * wave(P.shape, 2 * Math.PI * k / 100, a)]); }
  chB.draw([{ pts, color: "#ffd166", label: SHAPES[P.shape] }], { yMin: -1.2, yMax: 1.2, hlines: [{ y: 0 }] });
  const v = MEDIA[P.medium].v(P.T), p = 0.002 * 1000 ** P.amp;
  read.set("f", `${P.f} Hz · ${(1000 / P.f).toFixed(3)} ms`); read.set("v", `${v.toFixed(0)} m/s in ${MEDIA[P.medium].name}`); read.set("l", `${(v / P.f).toFixed(3)} m`); read.set("db", `${dB(p).toFixed(0)} dB (pressure amplitude ${p.toFixed(3)} Pa)`);
  read.set("h", P.f < 20 ? "no: infrasound" : P.f > 20000 ? "no: ultrasound" : P.f > 15000 ? "yes for young people (older people often can't)" : "yes");
  ui.hud("Frequency → pitch · amplitude → loudness · waveform → timbre");
}
let frame = 0;
ui.run(dt => { if (dt > 0 && !paused) T0 += dt * P.speed; }, () => { draw(); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("Press ▶ Play to hear the sound. Watch how the particles move.", 6000);
