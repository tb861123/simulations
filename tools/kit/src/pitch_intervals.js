/* =====================================================================
   PITCH, INTERVALS AND TUNING
   PITCH is how high or low a note sounds: it is set by FREQUENCY.
   Musical steps are RATIOS, not differences: an octave always doubles the
   frequency. In twelve-tone EQUAL TEMPERAMENT (pianos, guitars) the octave
   is split into 12 equal semitones, each a ratio of 2^(1/12) ≈ 1.0595:
        f = 440 × 2^((m − 69)/12)        (m: MIDI note number; A4 = 69)
   JUST intonation uses simple whole-number ratios instead (fifth 3:2,
   major third 5:4). Simple ratios sound smooth (CONSONANT) because many of
   the two notes' harmonics coincide; when harmonics nearly but not quite
   coincide they BEAT (the loudness wobbles at |f₁ − f₂| times a second),
   which we hear as roughness (DISSONANCE).
   Equal temperament is a compromise: every key works, but only the octave
   is exactly in tune; the major third is 14 cents (0.14 semitone) sharp.
   ===================================================================== */
const whole = f => v => Math.abs(v - Math.round(v)) < 0.01 ? f(v) : "";
// interval table: semitones, name, short name, letter steps (for spelling), just-intonation ratio
const IV = [[0, "unison", "P1", 0, [1, 1]], [1, "minor 2nd", "m2", 1, [16, 15]], [2, "major 2nd", "M2", 1, [9, 8]], [3, "minor 3rd", "m3", 2, [6, 5]], [4, "major 3rd", "M3", 2, [5, 4]], [5, "perfect 4th", "P4", 3, [4, 3]], [6, "augmented 4th (tritone)", "A4", 3, [45, 32]], [7, "perfect 5th", "P5", 4, [3, 2]], [8, "minor 6th", "m6", 5, [8, 5]], [9, "major 6th", "M6", 5, [5, 3]], [10, "minor 7th", "m7", 6, [9, 5]], [11, "major 7th", "M7", 6, [15, 8]], [12, "octave", "P8", 7, [2, 1]]];
const PC_NAME = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];   // spellings used for the ROOT
const PC_LETTER = [0, 0, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6];                               // letter index of each root spelling (C=0 … B=6)
const LETTERS = "CDEFGAB", NAT = [0, 2, 4, 5, 7, 9, 11];                                // natural notes' pitch classes
const ACC = { "-2": "𝄫", "-1": "♭", "0": "", "1": "♯", "2": "𝄪" };
const eqHz = (m, A4 = 440) => A4 * 2 ** ((m - 69) / 12);                              // equal temperament
const cents = r => 1200 * Math.log2(r);                                                // size of a ratio in cents (100 per semitone)
// spell a note: given its MIDI number and the letter it must use, find the accidental and octave
function spellAs(m, letter) { const pc = ((m % 12) + 12) % 12; let acc = pc - NAT[letter]; if (acc > 6) acc -= 12; if (acc < -6) acc += 12; const oct = Math.floor((m - acc) / 12) - 1; return { letter, acc, oct, name: LETTERS[letter] + ACC[acc] + oct, step: letter + 7 * oct }; }
const spellRoot = m => spellAs(m, PC_LETTER[((m % 12) + 12) % 12]);
// the upper note of an interval is spelled with the letter the interval needs (a 3rd above C is some kind of E)
const spellUpper = (root, k) => { const it = IV[k], r = spellRoot(root); return spellAs(root + k, (r.letter + it[3]) % 7); };
// roughness of two complex tones (Plomp–Levelt curve, Sethares' formula): pairs of partials close in frequency clash
function roughness(f1, f2, nh = 6) { const parts = []; for (let n = 1; n <= nh; n++) { parts.push([n * f1, 0.88 ** (n - 1)]); parts.push([n * f2, 0.88 ** (n - 1)]); } let d = 0; for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) { const [fa, aa] = parts[i], [fb, ab] = parts[j], s = 0.24 / (0.021 * Math.min(fa, fb) + 19), df = Math.abs(fa - fb); d += Math.min(aa, ab) * (Math.exp(-3.5 * s * df) - Math.exp(-5.75 * s * df)); } return d; }
// measure a beat rate the way you would by ear: track the loudness (RMS in 5 ms windows) and count its dips
function measureBeats(fa, fb, T = 4, fs = 8000) { const R = 100, W = fs / R, env = []; for (let k = 0; k < T * R; k++) { let s = 0; for (let i = 0; i < W; i++) { const t = (k * W + i) / fs; const v = Math.sin(2 * Math.PI * fa * t) + Math.sin(2 * Math.PI * fb * t); s += v * v; } env.push(Math.sqrt(s / W)); }
  // a dip counts once: find the quietest point of each stretch below 0.6, and only after the sound has been loud (above 1.2) again
  const mins = []; let armed = true, cur = null; for (let k = 0; k < env.length; k++) { if (env[k] > 1.2) armed = true; if (env[k] < 0.6 && armed) { if (!cur || env[k] < env[cur]) cur = k; } else if (cur !== null && env[k] >= 0.6) { mins.push(cur); cur = null; armed = false; } } if (mins.length < 2) return 0; return (mins.length - 1) / ((mins[mins.length - 1] - mins[0]) / R); }

// ---------------- Sound (Web Audio) ----------------
const SND = { ctx: null, nodes: [] };
async function audioOn() { SND.ctx = SND.ctx || new (window.AudioContext || window.webkitAudioContext)(); await SND.ctx.resume(); return SND.ctx; }
function stopSound() { for (const n of SND.nodes) { try { n.stop(); } catch (e) { } } SND.nodes = []; }
// a gentle organ-like tone: 6 harmonics, amplitude 0.88^(n−1) ÷ n, held for 'dur' seconds starting 'at' seconds from now
function tone(f, at, dur, vol, pure) { const ctx = SND.ctx, t = ctx.currentTime + 0.03 + at; for (let n = 1; n <= (pure ? 1 : 6); n++) { if (n * f > ctx.sampleRate / 2) break; const o = ctx.createOscillator(), g = ctx.createGain(), L = vol * 0.3 * 0.88 ** (n - 1) / n; o.frequency.value = n * f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(L, t + 0.03); g.gain.setValueAtTime(L, t + dur - 0.08); g.gain.linearRampToValueAtTime(0, t + dur); o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + dur + 0.05); SND.nodes.push(o); } }

// ---------------- The page ----------------
const P = { root: 60, k: 7, tuning: "equal", A4: 440, detune: 0, how: "together", pure: false, vol: 0.5, dur: 2.5 };
let T0 = 0, keyRects = [];
const fRoot = () => eqHz(P.root, P.A4);
const ratio = () => (P.tuning === "just" ? IV[P.k][4][0] / IV[P.k][4][1] : 2 ** (P.k / 12)) * 2 ** (P.detune / 1200);
const fTop = () => fRoot() * ratio();
const ui = K.app({
  title: "Pitch, Intervals and Tuning", subject: "Music",
  blurb: "Notes, frequencies and intervals on the keyboard and stave; equal against just tuning, beats and consonance",
  reset: () => set({}),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "GCSE Music (pitch, intervals and their names, tones and semitones, consonance and dissonance, staff notation in the treble clef, concert pitch A = 440 Hz) and GCSE Physics (frequency and pitch).", adv: "A level Music (interval quality and spelling, tuning systems and temperament, consonance) and A level Physics (superposition and beats: beat frequency = |f₁ − f₂|)." } },
  missions: [
    { title: "The octave", q: "Play C4 and the C an octave above. Look at the frequencies. What is the rule?", hint: "The top note has exactly twice the frequency (261.6 → 523.3 Hz). Every octave doubles the frequency, which is why notes an octave apart share a letter name.", setup() { set({ root: 60, k: 12 }); } },
    { title: "Same interval, different difference", q: "Play a perfect fifth from C3, then from C5. Does the frequency DIFFERENCE stay the same? Does the RATIO?", hint: "The difference grows (65 Hz → 262 Hz) but the ratio stays at about 1.5. Our ears hear equal ratios as equal intervals.", setup() { set({ root: 48, k: 7 }); } },
    { title: "Semitones", q: "Step the interval up one semitone at a time from unison to an octave. By what factor does each step multiply the frequency?", hint: "2^(1/12) ≈ 1.0595 every time: 12 equal steps multiply to 2, the octave. That is equal temperament.", setup() { set({ root: 60, k: 1 }); } },
    { title: "Consonant and dissonant", q: "Compare a perfect 5th, a major 3rd, a tritone and a minor 2nd played together. Rank them from smoothest to roughest. What does the roughness chart show?", hint: "Fifth (smoothest), major third, tritone, minor 2nd (roughest). Simple ratios (3:2, 5:4) make many harmonics coincide; a semitone puts harmonics close but not together, so they beat.", setup() { set({ root: 60, k: 6 }); } },
    { title: "Beats", q: "Play a unison with one note detuned by +10 cents. What do you hear? Measure the beat rate.", hint: "A 'wah-wah' wobble in loudness: about 1.5 beats a second at C4 (beat frequency = |f₁ − f₂|). Tuners and string players tune by making the beats slow down and vanish.", setup() { set({ root: 60, k: 0, detune: 10 }); } },
    { title: "Spelling intervals", q: "From D, play a major 3rd. From E♭, play a major 3rd. Why is the top note F♯ in one and G in the other, not 'G♭'?", hint: "A 3rd always moves up three letter names (D-E-F, E♭-F-G). So a major 3rd above D is F♯, and above E♭ it is G. Interval names count letters; the quality (major, minor …) counts semitones.", setup() { set({ root: 62, k: 4 }); } },
    { lvl: "adv", title: "Equal against just", q: "Play a major 3rd in equal temperament, then in just intonation. Which is smoother? By how many cents do they differ?", hint: "The just 5:4 third is smoother; the equal-tempered third is 13.7 cents sharp and beats noticeably. Equal temperament gives up pure thirds so that music can modulate to every key.", setup() { set({ root: 60, k: 4, tuning: "equal" }); } },
    { lvl: "adv", title: "Tuning a fifth by its beats", q: "Play an equal-tempered fifth from A3 with 'pure tones' off. Which harmonics beat, and how fast?", hint: "The 3rd harmonic of A3 (660 Hz) and the 2nd harmonic of E4 (659.3 Hz) are 0.75 Hz apart: about 3 beats every 4 seconds. Piano tuners count these beats.", setup() { set({ root: 57, k: 7 }); } }
  ],
  batch: [
    { title: "Frequency against semitones", question: "How does frequency depend on the number of semitones above A4?", how: "Equal temperament, A4 = 440 Hz; frequency of the note k semitones up.", xLabel: "semitones above A4", yLabel: "frequency (Hz)", xs: [-12, -9, -6, -3, 0, 3, 6, 9, 12, 15, 18, 21, 24], reps: 1, yMin: 0, theory: k => 440 * 2 ** (k / 12), theoryLabel: "440 × 2^(k/12)", run: k => eqHz(69 + k), note: "Exponential: the same step in pitch multiplies the frequency by the same factor, so high notes are far apart in Hz. A log scale (or the keyboard) makes it a straight line." },
    { title: "Equal temperament's errors", question: "How far is each equal-tempered interval from its just (simple-ratio) version?", how: "Cents difference: 100k − 1200 log₂(just ratio).", xLabel: "interval (semitones)", yLabel: "equal − just (cents)", xs: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], reps: 1, theory: null, run: k => 100 * k - cents(IV[k][4][0] / IV[k][4][1]), note: "Fifths and fourths are within 2 cents; thirds and sixths are 14–16 cents out (the major 3rd and 6th sharp, the minor ones flat). Only the octave is exact." },
    { title: "Measuring beats", question: "If two notes are slightly out of tune, how many beats per second do you hear?", how: "Two sine waves, 440 Hz and 440 + Δf Hz; beats counted from dips in the loudness over 4 s.", xLabel: "difference in frequency Δf (Hz)", yLabel: "beats per second", xs: [0.5, 1, 2, 3, 4, 5, 6, 8], reps: 1, yMin: 0, fit: true, theory: d => d, theoryLabel: "|f₁ − f₂|", run: d => measureBeats(440, 440 + d), note: "Beat frequency = difference in frequency. Above about 15 per second the beats blur into roughness; much further apart, you hear two separate notes." },
    { title: "Roughness across the octave", question: "How rough do two notes with six harmonics each sound, for every interval in the octave?", how: "Sethares' roughness formula (based on Plomp and Levelt's listening experiments), lower note C4, intervals in quarter-tone steps.", xLabel: "interval (semitones)", yLabel: "roughness (arbitrary units)", xs: Array.from({ length: 49 }, (_, i) => i / 4), reps: 1, yMin: 0, theory: null, run: k => roughness(261.6, 261.6 * 2 ** (k / 12)), note: "Dips (smooth) at the unison, octave, fifth (7), fourth (5) and the thirds and sixths; peaks near the semitone and the major 7th. The dips sit where the frequency ratio is simple." },
    { title: "Beats in an equal-tempered fifth", question: "How fast do the coinciding harmonics of an equal-tempered fifth beat, for roots up the keyboard?", how: "3rd harmonic of the root against the 2nd harmonic of the fifth above; beats counted from the loudness.", xLabel: "root frequency (Hz)", yLabel: "beats per second", xs: [110, 165, 220, 262, 330, 440, 523], reps: 1, yMin: 0, fit: true, theory: f => Math.abs(3 * f - 2 * f * 2 ** (7 / 12)), theoryLabel: "|3f − 2 × 2^(7/12) f|", run: f => measureBeats(3 * f, 2 * f * 2 ** (7 / 12), 8), note: "Proportional to the root: a fifth beats about 0.0034 × f times a second, so high fifths beat faster. Piano tuners use these beat rates to set the temperament." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "GCSE Music", text: "An interval is the distance between two notes. Its number counts letter names (C to E is a 3rd); its quality (major, minor, perfect, augmented, diminished) depends on the number of semitones." },
      { lvl: "std", tag: "GCSE Music", text: "Consonant intervals (octave, fifth, fourth, thirds, sixths) sound stable; dissonant ones (seconds, sevenths, the tritone) sound tense and want to resolve." },
      { lvl: "std", tag: "GCSE Physics", text: "Higher frequency gives higher pitch. Concert pitch: A above middle C = 440 Hz. An octave doubles the frequency." },
      { lvl: "adv", tag: "A level Physics", text: "Two waves of slightly different frequencies superpose to give beats: the loudness rises and falls at the beat frequency |f₁ − f₂|." },
      { lvl: "adv", tag: "A level Music", text: "Equal temperament splits the octave into 12 equal semitones (ratio 2^(1/12)) so every key sounds the same; just intonation uses simple ratios (3:2, 5:4) that sound purer in one key." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: "A4 has a frequency of 440 Hz. What is the frequency of A3 and of A5?", ans: "<ul><li>A3: 220 Hz (an octave lower halves the frequency)</li><li>A5: 880 Hz</li></ul>" },
      { lvl: "std", marks: 2, q: () => `Name the interval from ${spellRoot(P.root).name} up to ${spellUpper(P.root, P.k).name}. How many semitones is it?`, ans: () => `<ul><li>${IV[P.k][1]}</li><li>${P.k} semitone${P.k === 1 ? "" : "s"}</li></ul>` },
      { lvl: "adv", marks: 3, q: "A violinist tunes the A string against a 440 Hz tuning fork and hears 3 beats per second. Tightening the string makes the beats faster. What was the string's frequency, and what should the player do?", ans: "<ul><li>the string is 440 ± 3 Hz</li><li>tightening raises the frequency and the beats got faster, so it was already sharp: 443 Hz</li><li>loosen the string until the beats stop</li></ul>" }
    ]
  },
  notes: `<h3>The model</h3>
<ul><li>Equal temperament f = A4 × 2^((m − 69)/12) with A4 adjustable (baroque pitch is about 415 Hz). Just intonation uses the ratios 16:15, 9:8, 6:5, 5:4, 4:3, 45:32, 3:2, 8:5, 5:3, 9:5, 15:8, 2:1 above the root.</li>
<li>Spelling: the root uses C, C♯, D, E♭, E, F, F♯, G, A♭, A, B♭, B; the upper note takes the letter the interval needs (so a major 3rd above D is F♯); the tritone is spelled as an augmented 4th.</li>
<li>Notes are played as a tone with six harmonics (amplitudes 0.88^(n − 1)/n), or as pure sine waves.</li>
<li>Roughness uses Sethares' fit to Plomp and Levelt's listening data, summed over every pair of partials. Beat rates are measured from the loudness of the summed wave.</li></ul>
<h3>Left out</h3>
<ul><li>Other tunings (Pythagorean, meantone, non-Western scales), the effect of loudness on roughness, and the role of musical context in how consonant an interval feels.</li></ul>
<p>The earlier version of this simulation is kept in <a href="original/pitch_intervals.html">original/pitch_intervals.html</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("Notes");
ctl.root = K.slider(g, { label: "Lower note (click the keyboard too)", min: 36, max: 84, step: 1, value: 60, fmt: v => `${spellRoot(v).name} (MIDI ${v})`, on: v => P.root = v });
ctl.k = K.seg(g, { value: 7, options: IV.map(it => [it[0], it[2]]), on: v => P.k = +v });
ctl.tuning = K.seg(g, { value: "equal", options: [["equal", "equal temperament"], ["just", "just intonation"]], on: v => P.tuning = v });
ctl.detune = K.slider(g, { label: "Detune the upper note", min: -50, max: 50, step: 1, value: 0, fmt: v => (v > 0 ? "+" : "") + v + " cents", on: v => P.detune = v });
ctl.A4 = K.slider(g, { label: "Concert pitch A4", min: 415, max: 466, step: 1, value: 440, unit: "Hz", on: v => P.A4 = v });
g = ui.group("Listen");
ctl.how = K.seg(g, { value: "together", options: [["together", "together (harmonic)"], ["apart", "one after the other (melodic)"]], on: v => P.how = v });
ctl.pure = K.toggle(g, { label: "Pure sine tones (no harmonics)", value: false, on: v => P.pure = v });
let rr = K.row(g); K.btn(rr, "▶ Play", () => play(), "primary"); K.btn(rr, "■ Stop", () => stopSound());
ctl.vol = K.slider(g, { label: "Listening volume", min: 0, max: 1, step: 0.05, value: 0.5, fmt: v => (v * 100).toFixed(0) + "%", on: v => P.vol = v });
const read = K.readout(ui.group("Readings"), [["iv", "interval"], ["f", "frequencies"], ["r", "ratio (upper ÷ lower)"], ["c", "size in cents"], ["vs", "equal − just"], ["b", "fastest beats (harmonics within 20 Hz)"]]);
function set(o) { Object.assign(P, { root: 60, k: 7, tuning: "equal", A4: 440, detune: 0, how: "together", pure: false }, o); ctl.root.set(P.root); ctl.k.set(P.k); ctl.tuning.set(P.tuning); ctl.detune.set(P.detune); ctl.A4.set(P.A4); ctl.how.set(P.how); ctl.pure.set(P.pure); }
async function play() { try { await audioOn(); stopSound(); if (P.how === "together") { tone(fRoot(), 0, P.dur, P.vol, P.pure); tone(fTop(), 0, P.dur, P.vol, P.pure); } else { tone(fRoot(), 0, 0.9, P.vol, P.pure); tone(fTop(), 1, 0.9, P.vol, P.pure); } T0 = 0; } catch (e) { ui.tip("Sound could not start: " + e.message, 4000); } }
// the slowest audible beat between any pair of harmonics that nearly coincide
function beats() { let best = null; const n = P.pure ? 1 : 6; for (let i = 1; i <= n; i++) for (let j = 1; j <= n; j++) { const d = Math.abs(i * fRoot() - j * fTop()); if (d > 0.05 && d < 20 && (!best || i + j < best[1] + best[2])) best = [d, i, j]; } return best; }

// ---------------- Drawing: keyboard, stave and waves ----------------
const cv = ui.canvas(() => { });
K.pointer(cv.el, { down: p => { for (const r of keyRects) if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h && r.black) { set(Object.assign({}, P, { root: r.m })); return; } for (const r of keyRects) if (!r.black && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) { set(Object.assign({}, P, { root: r.m })); return; } } });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function drawAll() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h);
  // keyboard C2 … C7 (MIDI 36 … 96)
  const lo = 36, hi = 96, whites = []; for (let m = lo; m <= hi; m++) if ([0, 2, 4, 5, 7, 9, 11].includes(m % 12)) whites.push(m);
  const kx = 20, kw = (w - 40) / whites.length, ky = 40, kh = 96; keyRects = []; const top = P.root + P.k;
  whites.forEach((m, i) => { const x = kx + i * kw, on = m === P.root ? "#5ad1ff" : m === top ? "#ffd166" : "#f2f2ee"; c.fillStyle = on; c.fillRect(x, ky, kw - 1, kh); keyRects.push({ x, y: ky, w: kw - 1, h: kh, m, black: false }); if (m % 12 === 0) TX(c, "C" + (m / 12 - 1), x + kw / 2, ky + kh - 6, "#556", "center", "10px"); });
  whites.forEach((m, i) => { if ([0, 2, 5, 7, 9].includes(m % 12) && m + 1 <= hi) { const x = kx + (i + 1) * kw - kw * 0.32, mm = m + 1; c.fillStyle = mm === P.root ? "#2a9fd0" : mm === top ? "#d9a520" : "#151821"; c.fillRect(x, ky, kw * 0.62, kh * 0.6); keyRects.push({ x, y: ky, w: kw * 0.62, h: kh * 0.6, m: mm, black: true }); } });
  TX(c, "click a key to choose the lower note · blue: lower · gold: upper", 20, 28, "#8fa0bf", "left", "11.5px");
  // treble stave with both notes
  const sx = 40, sw = Math.min(360, w * 0.36), gap = 14, sb = ky + kh + 140; c.strokeStyle = "#cfd8ea"; c.lineWidth = 1;
  for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(sx, sb - i * gap); c.lineTo(sx + sw, sb - i * gap); c.stroke(); }
  TX(c, "𝄞", sx + 4, sb + 8, "#cfd8ea", "left", "58px");
  const nts = [spellRoot(P.root), spellUpper(P.root, P.k)], yOf = st => sb - (st - 30) * gap / 2;  // step 30 = E4 on the bottom line
  nts.forEach((n, j) => { const x = sx + (P.how === "together" ? 160 : 120 + j * 110) + (P.how === "together" && P.k <= 2 && j ? 18 : 0), y = yOf(n.step);
    c.strokeStyle = "#cfd8ea"; for (let s = 28; s >= n.step; s -= 2) { c.beginPath(); c.moveTo(x - 13, yOf(s)); c.lineTo(x + 13, yOf(s)); c.stroke(); } for (let s = 40; s <= n.step; s += 2) { c.beginPath(); c.moveTo(x - 13, yOf(s)); c.lineTo(x + 13, yOf(s)); c.stroke(); }
    c.fillStyle = j ? "#ffd166" : "#5ad1ff"; c.beginPath(); c.ellipse(x, y, 7.5, 5.5, -0.35, 0, 6.3); c.fill(); if (n.acc) TX(c, ACC[n.acc], x - 13, y + 6, j ? "#ffd166" : "#5ad1ff", "right", "18px"); if (P.how !== "together") TX(c, n.name, x, sb + 50, j ? "#ffd166" : "#5ad1ff", "center", "600 12px"); });
  if (P.how === "together") { TX(c, nts[0].name, sx + 160, sb + 50, "#5ad1ff", "center", "600 12px"); TX(c, nts[1].name, sx + 160, sb + 66, "#ffd166", "center", "600 12px"); }
  TX(c, `${IV[P.k][1]} (${IV[P.k][2]}): ${P.k} semitone${P.k === 1 ? "" : "s"}`, sx, sb - 5 * gap - 14, "#eef2f8", "left", "600 14px");
  // the two waves and their sum, over 20 ms
  const wx = sx + sw + 50, ww = w - wx - 24, rows = [[fRoot(), "#5ad1ff", "lower"], [fTop(), "#ffd166", "upper"]]; const ms = P.k === 0 && Math.abs(P.detune) > 0 ? 1000 : 20;
  rows.forEach(([f, col, lab], r) => { const yy = ky + kh + 50 + r * 46; c.strokeStyle = col; c.lineWidth = 1.3; c.beginPath(); for (let i = 0; i <= 500; i++) { const t = i / 500 * ms / 1000, x = wx + ww * i / 500, y = yy - 16 * Math.sin(2 * Math.PI * f * t); i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); TX(c, `${lab}: ${f.toFixed(2)} Hz`, wx, yy - 22, col, "left", "11px"); });
  const ys = ky + kh + 190; c.strokeStyle = "#e8e0d0"; c.lineWidth = 1.5; c.beginPath(); for (let i = 0; i <= 900; i++) { const t = i / 900 * ms / 1000, x = wx + ww * i / 900, y = ys - 18 * (Math.sin(2 * Math.PI * fRoot() * t) + Math.sin(2 * Math.PI * fTop() * t)); i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); c.lineWidth = 1;
  TX(c, `together (sum), first ${ms} ms${ms > 20 ? ": the loudness wobbles (beats)" : ""}`, wx, ys - 44, "#e8e0d0", "left", "11px");
}

// ---------------- Charts and readings ----------------
function charts() {
  const f1 = fRoot(), f2 = fTop(), n = P.pure ? 1 : 8, lo = [], up = [];
  for (let i = 1; i <= n; i++) { lo.push([i * f1, 0.88 ** (i - 1)]); up.push([i * f2, 0.88 ** (i - 1)]); }
  chA.opts.title = "Harmonics of both notes: where they coincide"; chA.opts.xLabel = "frequency (Hz)"; chA.opts.yLabel = "amplitude";
  chA.draw([{ pts: lo, type: "bars", w: f1 * 0.12, color: "#5ad1ff", label: "lower" }, { pts: up, type: "bars", w: f1 * 0.12, color: "#ffd166", label: "upper" }], { yMin: 0, yMax: 1.05, xMin: 0, xMax: f1 * (n + 1) });
  const cur = [], pts = []; for (let i = 0; i <= 96; i++) { const k = i / 8; pts.push([k, roughness(f1, f1 * 2 ** (k / 12), P.pure ? 1 : 6)]); }
  chB.opts.title = "Roughness across the octave"; chB.opts.xLabel = "interval (semitones)"; chB.opts.yLabel = "roughness"; chB.draw([{ pts, color: "#c9a0ff", label: "from the lower note" }, { pts: [[cents(f2 / f1) / 100, roughness(f1, f2, P.pure ? 1 : 6)]], type: "dots", r: 6, color: "#fff", label: "now" }], { yMin: 0, xMin: 0, xMax: 12.5 });
  const just = IV[P.k][4][0] / IV[P.k][4][1], b = beats();
  read.set("iv", `${IV[P.k][1]}: ${spellRoot(P.root).name} → ${spellUpper(P.root, P.k).name}`); read.set("f", `${f1.toFixed(2)} Hz and ${f2.toFixed(2)} Hz`); read.set("r", `${(f2 / f1).toFixed(4)}${P.tuning === "just" ? ` (= ${IV[P.k][4][0]}:${IV[P.k][4][1]})` : ""}`); read.set("c", cents(f2 / f1).toFixed(1) + " cents");
  read.set("vs", (100 * P.k - cents(just)).toFixed(1) + " cents"); read.set("b", b ? `${b[0].toFixed(2)} per second (harmonic ${b[1]} of lower, ${b[2]} of upper)` : "none (smooth)");
  ui.hud("f = 440 × 2^((m − 69)/12) · an octave doubles the frequency");
}
let frame = 0;
ui.run(dt => { if (dt > 0) T0 += dt; }, () => { drawAll(); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("Click a key, choose an interval, then press ▶ Play.", 6000);
