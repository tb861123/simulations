/* =====================================================================
   KEYS, SCALES AND MODULATION
   A SCALE is a pattern of tones (T) and semitones (S). The major scale is
   T T S T T T S; starting the same white notes on a different note gives
   the MODES (Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian).
   Pentatonic, blues and whole-tone scales use other patterns.
   A KEY is a scale with a home note (the TONIC). Keys a FIFTH apart share
   all but one note, so the CIRCLE OF FIFTHS puts closely RELATED keys side
   by side: the dominant, the subdominant and the relative minor/major.
   MODULATION is changing key during a piece, usually to a related key.
   How do we (or a computer) hear which key a melody is in? Krumhansl and
   Kessler asked listeners how well each note "fits" a key: the tonic,
   fifth and third fit best. Comparing the notes of a melody with these
   KEY PROFILES for all 24 keys (a correlation) finds the most likely key.
   ===================================================================== */
const LET = "CDEFGAB", NAT = [0, 2, 4, 5, 7, 9, 11];
const accStr = a => ({ "-2": "𝄫", "-1": "♭", "0": "", "1": "♯", "2": "𝄪" })[a];
const freq = m => 440 * Math.pow(2, (m - 69) / 12);
function spellAs(midi, letter) { const pc = ((midi % 12) + 12) % 12; let acc = pc - NAT[letter]; if (acc > 6) acc -= 12; if (acc < -6) acc += 12; const oct = Math.floor((midi - acc - NAT[letter]) / 12) - 1; return { letter, acc, oct, midi }; }
async function soundOn() { if (!K.sound.on) await K.sound.enable(true); }
const note = (m, at, dur, vol = 0.12) => { K.sound.tone(freq(m), { at, dur, vol, type: "triangle", attack: 0.02 }); K.sound.tone(2 * freq(m), { at, dur, vol: vol * 0.25, attack: 0.02 }); };
// ---- scales: semitone steps from the tonic, and whether the notes take consecutive letters ----
const SCALES = { major: ["Major (Ionian)", [0, 2, 4, 5, 7, 9, 11], 1], minorN: ["Natural minor (Aeolian)", [0, 2, 3, 5, 7, 8, 10], 1], minorH: ["Harmonic minor", [0, 2, 3, 5, 7, 8, 11], 1], minorM: ["Melodic minor (rising)", [0, 2, 3, 5, 7, 9, 11], 1],
  dorian: ["Dorian", [0, 2, 3, 5, 7, 9, 10], 1], phrygian: ["Phrygian", [0, 1, 3, 5, 7, 8, 10], 1], lydian: ["Lydian", [0, 2, 4, 6, 7, 9, 11], 1], mixo: ["Mixolydian", [0, 2, 4, 5, 7, 9, 10], 1], locrian: ["Locrian", [0, 1, 3, 5, 6, 8, 10], 1],
  pentaMaj: ["Major pentatonic", [0, 2, 4, 7, 9], 0], pentaMin: ["Minor pentatonic", [0, 3, 5, 7, 10], 0], blues: ["Blues", [0, 3, 5, 6, 7, 10], 0], whole: ["Whole-tone", [0, 2, 4, 6, 8, 10], 0], chrom: ["Chromatic", [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 0] };
const TON = [["C", 0, 0], ["C♯", 1, 0], ["D♭", 1, 1], ["D", 2, 1], ["E♭", 3, 2], ["E", 4, 2], ["F", 5, 3], ["F♯", 6, 3], ["G", 7, 4], ["A♭", 8, 5], ["A", 9, 5], ["B♭", 10, 6], ["B", 11, 6]];   // name, pitch class, letter
const stepName = d => d === 1 ? "S" : d === 2 ? "T" : d === 3 ? "T+S" : d + "";
// ---- keys and the circle of fifths ----
const KNAMES = ["C", "G", "D", "A", "E", "B", "F♯", "D♭", "A♭", "E♭", "B♭", "F"], MNAMES = ["A", "E", "B", "F♯", "C♯", "G♯", "D♯", "B♭", "F", "C", "G", "D"];
const keyName = k => k < 12 ? KNAMES[k] + " major" : MNAMES[k - 12] + " minor";
const keyTonic = k => k < 12 ? (7 * k) % 12 : (7 * (k - 12) + 9) % 12;             // keys 0–11: majors round the circle; 12–23: their relative minors
const keyScale = k => (k < 12 ? SCALES.major[1] : SCALES.minorH[1]).map(s => (keyTonic(k) + s) % 12);
// Krumhansl–Kessler key profiles (how well each pitch class fits, tonic first)
const KK_MAJ = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88], KK_MIN = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
function corr(a, b) { const ma = K.mean(a), mb = K.mean(b); let s = 0, sa = 0, sb = 0; for (let i = 0; i < 12; i++) { s += (a[i] - ma) * (b[i] - mb); sa += (a[i] - ma) ** 2; sb += (b[i] - mb) ** 2; } return sa && sb ? s / Math.sqrt(sa * sb) : 0; }
const profile = k => { const p = k < 12 ? KK_MAJ : KK_MIN, t = keyTonic(k); return Array.from({ length: 12 }, (_, i) => p[(i - t + 12) % 12]); };
// correlation of a list of notes with all 24 key profiles
function keyScores(notes) { const h = new Array(12).fill(0); for (const m of notes) h[((m % 12) + 12) % 12]++; return Array.from({ length: 24 }, (_, k) => corr(h, profile(k))); }
const bestKey = notes => { const s = keyScores(notes); return s.indexOf(Math.max(...s)); };
/* A melody: a walk on the scale of key k1 (mostly steps, some leaps to chord notes), changing to key k2 at note 'at' (if given). Starts and ends on the tonic. */
function melody(k1, n, r, k2 = null, at = null) { const out = []; let deg = 0;
  for (let i = 0; i < n; i++) { const k = k2 != null && i >= at ? k2 : k1, iv = k < 12 ? SCALES.major[1] : SCALES.minorH[1], t = keyTonic(k);
    if (i === 0 || i === n - 1 || (k2 != null && i === at)) deg = 0; else { const u = r(); deg += u < 0.35 ? 1 : u < 0.7 ? -1 : u < 0.8 ? 2 : u < 0.9 ? -2 : (r() < 0.5 ? 4 : -3); }
    if (![0, 2, 4].includes(((deg % 7) + 7) % 7) && r() < 0.45) deg += r() < 0.5 ? 1 : -1;            // melodies lean on the notes of the tonic chord
    while (deg > 9) deg -= 7; while (deg < -3) deg += 7;
    let m = 60 + t + 12 * Math.floor(deg / 7) + iv[((deg % 7) + 7) % 7]; while (m < 60) m += 12; while (m > 84) m -= 12; out.push(m); }
  return out; }
// related keys of a major key k (0–11): dominant, subdominant, relative minor, and the relative minors of those
const related = k => k < 12 ? [k, (k + 1) % 12, (k + 11) % 12, k + 12, ((k + 1) % 12) + 12, ((k + 11) % 12) + 12] : [k, k - 12, ((k - 11) % 12) + 12, ((k - 13 + 12) % 12) + 12, (k - 11) % 12, (k - 13 + 12) % 12];

// ---------------- The page ----------------
const DEF = { view: "scale", ton: 0, scale: "major", key: 0, mod: "dominant", n: 32, win: 8 };
const P = Object.assign({}, DEF); let mel = [], seed = 2, playing = false, play0 = 0, rate = 0.3;
const MODS = { none: ["no modulation", null], dominant: ["to the dominant", k => k < 12 ? (k + 1) % 12 : null], subdominant: ["to the subdominant", k => k < 12 ? (k + 11) % 12 : null], relative: ["to the relative minor", k => k < 12 ? k + 12 : null], distant: ["to a distant key (tritone away)", k => k < 12 ? (k + 6) % 12 : null] };
const ui = K.app({
  title: "Keys, Scales and Modulation", subject: "Music",
  blurb: "Scales and modes on the keyboard and the stave, the circle of fifths, and how a computer (and your ear) finds the key of a melody and hears it modulate",
  sound: "Play scales and melodies (the ▶ buttons switch sound on)",
  reset: () => set({ view: P.view }),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "Eduqas GCSE Music (C660): tonality: major, minor and modal; key signatures up to four sharps and flats; scales (major, minor, pentatonic, blues, chromatic); modulation to related keys.", adv: "Eduqas A level Music (A660QS) Component 3, musical elements (tonality): major and minor keys, modes, pentatonic, whole-tone and blues scales; modulation and the relationship between keys (dominant, subdominant, relative), the circle of fifths; tonal ambiguity and the use of modes and whole-tone scales in music into the 20th century and in jazz." } },
  missions: [
    { title: "Tones and semitones", q: "Play the major scale, then the natural minor scale from the same note. Where are the semitones in each?", hint: "Major: T T S T T T S (semitones between 3–4 and 7–8). Natural minor: T S T T S T T (between 2–3 and 5–6). The minor third is what makes it sound sad or serious.", setup() { set({ view: "scale", scale: "major" }); } },
    { title: "The modes", q: "Play Dorian and Mixolydian on D and G. Which notes differ from major or minor? Where might you hear them?", hint: "Dorian is minor with a raised 6th (folk, 'Scarborough Fair', jazz). Mixolydian is major with a flattened 7th (rock, Celtic music). Modes give music a different colour from major and minor.", setup() { set({ view: "scale", ton: 3, scale: "dorian" }); } },
    { title: "Blues and pentatonic", q: "Play the minor pentatonic and then the blues scale on A. What extra note does the blues scale have?", hint: "The blues scale adds the flattened 5th (E♭ in A), the 'blue note', to the minor pentatonic. Pentatonic scales have no semitones, so any of their notes sound good together: great for improvising.", setup() { set({ view: "scale", ton: 10, scale: "pentaMin" }); } },
    { title: "Find the key", q: "Key finding. Play a melody in G major with no modulation. Does the computer's guess settle on G? How many notes does it need?", hint: "Early on, several keys fit equally well. After about 8–12 notes the tonic, fifth and third stand out and the correlation with G major is clearly highest. Your ear does something similar.", setup() { set({ view: "key", key: 1, mod: "none" }); } },
    { lvl: "adv", title: "Modulation to the dominant", q: "C major modulating to the dominant halfway. Watch the estimate. Which note gives away the new key?", hint: "G major has F♯ instead of F. Once F♯ appears and F disappears, the profile of G fits better. Related keys share six of their seven notes, so the change is smooth.", setup() { set({ view: "key", key: 0, mod: "dominant" }); } },
    { lvl: "adv", title: "A distant key", q: "Now modulate to a distant key (a tritone away). How quickly is it detected compared with the dominant?", hint: "Distant keys share few notes, so the change is abrupt and detected fast (and sounds startling). The circle of fifths measures closeness: one step = one note different.", setup() { set({ view: "key", key: 0, mod: "distant" }); } }
  ],
  batch: [
    { title: "How many notes to find the key?", question: "How often does key finding name the right key, for melodies of different lengths?", how: "Random melodies in random major and minor keys; correct if the estimate is the key of the melody.", xLabel: "notes in the melody", yLabel: "% correct", xs: [4, 8, 12, 16, 24, 32], reps: 40, yMin: 0, yMax: 100, run: (n, r) => { const k = r.int(24); return bestKey(melody(k, n, r)) === k ? 100 : 0; }, note: "Short tunes are ambiguous (a few notes fit many keys); with more notes the estimate improves. Minor tunes become clear because of the raised leading note; major tunes are sometimes heard as a minor key that shares their notes (E minor or A minor for C major), because rhythm and cadences are ignored here." },
    { lvl: "adv", title: "Closeness on the circle of fifths", question: "How well does a C major melody fit keys further round the circle of fifths?", how: "64-note C major melodies; correlation of their notes with the major key k steps away.", xLabel: "steps round the circle of fifths", yLabel: "correlation with that key", xs: [0, 1, 2, 3, 4, 5, 6], reps: 6, theory: k => corr(KK_MAJ, profile(k)), theoryLabel: "profile against profile", run: (k, r) => keyScores(melody(0, 64, r))[k], note: "Neighbouring keys (G, F) fit well, the tritone away (F♯) worst: the circle of fifths is a map of how related keys sound." },
    { lvl: "adv", title: "How long to hear a modulation?", question: "After the music changes key, how many notes pass before a sliding window of notes detects it?", how: "32-note melodies in C major modulating to G major at note 16; the window looks at the last w notes.", xLabel: "window (notes)", yLabel: "notes until detected", xs: [4, 6, 8, 12, 16], reps: 20, yMin: 0, run: (w, r) => { const m = melody(0, 32, r, 1, 16); for (let i = 16; i < 32; i++) if (bestKey(m.slice(Math.max(0, i - w + 1), i + 1)) === 1) return i - 15; return 16; }, note: "A short window reacts quickly but is easily fooled; a long one is reliable but slow. Listeners also need a few bars, often a cadence in the new key, to be sure." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "GCSE", text: "Major scale: T T S T T T S. Natural minor: T S T T S T T; harmonic minor raises the 7th; melodic minor raises the 6th and 7th going up." },
      { lvl: "std", tag: "GCSE", text: "Each major key has a relative minor with the same key signature, three semitones lower (C major and A minor). Pentatonic scales have five notes; the blues scale adds a flattened 5th." },
      { lvl: "std", tag: "GCSE", text: "Modulation: changing key. The most common changes are to related keys: the dominant (V), subdominant (IV) and relative minor or major." },
      { lvl: "adv", tag: "A660 tonality", text: "Circle of fifths: each step adds a sharp (clockwise) or a flat (anticlockwise). Neighbouring keys differ by one note, so modulation between them is smooth; distant keys sound remote." },
      { lvl: "adv", tag: "A660 tonality", text: "Modes (Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian) are used in folk, jazz, film and 20th-century music; the whole-tone scale (Debussy) has no tonic pull, so it sounds floating and ambiguous." },
      { lvl: "adv", tag: "A660 tonality", text: "Modulation is confirmed by a new leading note (accidental) and a cadence in the new key; a pivot chord shared by both keys makes it smooth." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: () => `Name the relative minor of ${KNAMES[P.key % 12]} major and state its key signature.`, ans: () => { const k = P.key % 12, n = k <= 6 ? k : k - 12; return `<ul><li>${MNAMES[k]} minor</li><li>${n === 0 ? "no sharps or flats" : Math.abs(n) + (n > 0 ? " sharp" : " flat") + (Math.abs(n) > 1 ? "s" : "")}, the same as ${KNAMES[k]} major</li></ul>`; } },
      { lvl: "std", marks: 2, q: "Which note is added to the minor pentatonic scale to make the blues scale, and what is it called?", ans: "<ul><li>the flattened 5th (♭5)</li><li>a 'blue note'</li></ul>" },
      { lvl: "adv", marks: 3, q: () => `A piece in ${keyName(P.key < 12 ? P.key : P.key - 12)} modulates to its dominant. Name the new key and the note that changes.`, ans: () => { const k = P.key < 12 ? P.key : P.key - 12, d = (k + 1) % 12; return `<ul><li>${keyName(d)}</li><li>the 4th of the old key is raised by a semitone to become the new leading note</li><li>the new key is one step clockwise on the circle of fifths (one more sharp or one fewer flat)</li></ul>`; } }
    ]
  },
  notes: `<h3>How it works</h3>
<ul><li>Scales are built from their pattern of semitone steps on the chosen tonic; seven-note scales use consecutive letter names, so they are spelled correctly.</li>
<li><b>Melodies</b> are random walks on the scale of the key (35% step up, 35% step down, 20% leap of a third, 10% leap of a 4th or 5th), leaning towards the notes of the tonic chord, starting and ending on the tonic; minor keys use the harmonic minor. A modulation switches the scale halfway.</li>
<li><b>Key finding</b> (Krumhansl–Schmuckler): count how often each of the 12 pitch classes occurs, then correlate the counts with the Krumhansl–Kessler profile of each of the 24 keys; the highest correlation is the estimate. The sliding window uses only the most recent notes.</li></ul>
<h3>Simplifications</h3><ul><li>Rhythm and metre are ignored: every note counts equally (real listeners weight long and accented notes and cadences).</li><li>Random melodies are less shapely than composed ones.</li></ul>`
});

// ---------------- Controls ----------------
const ctl = {}; let g = ui.group("View");
ctl.view = K.seg(g, { value: "scale", options: [["scale", "🎹 Scales and modes"], ["key", "🧭 Keys and key finding"]], on: v => set({ view: v }) });
const gp = {}; gp.scale = g = ui.group("Scale");
ctl.ton = K.seg(g, { label: "Starting note (tonic)", value: 0, options: TON.map((t, i) => [i, t[0]]), on: v => P.ton = v });
ctl.scale = K.seg(g, { label: "Scale", value: "major", options: Object.entries(SCALES).map(([k, s]) => [k, s[0]]), on: v => P.scale = v });
K.btn(K.row(g), "▶ Play the scale (up and down)", () => playScale(), "primary");
gp.key = g = ui.group("Melody");
ctl.key = K.seg(g, { label: "Key of the melody", value: 0, options: Array.from({ length: 24 }, (_, k) => [k, keyName(k).replace(" major", "").replace(" minor", "m")]), on: v => { P.key = v; remel(); } });
ctl.mod = K.seg(g, { label: "Halfway it modulates", value: "dominant", options: Object.entries(MODS).map(([k, m]) => [k, m[0]]), on: v => { P.mod = v; remel(); } });
ctl.win = K.slider(g, { label: "Key-finding window", min: 4, max: 32, step: 1, value: 8, unit: "notes", on: v => P.win = v });
let rr = K.row(g); K.btn(rr, "▶ Play the melody", () => playMel(), "primary"); K.btn(rr, "🎲 New melody", () => { seed++; remel(); }); K.btn(rr, "■ Stop", () => { K.sound.stop(); playing = false; });
const read = K.readout(ui.group("Readings"), [["a", "–"], ["b", "–"], ["c", "–"], ["d", "–"]]);
const label = (i, s) => { read.el.children[i].firstElementChild.textContent = s; };
function sync() { ctl.view.set(P.view); for (const q in gp) gp[q].style.display = q === P.view ? "" : "none"; ctl.ton.set(P.ton); ctl.scale.set(P.scale); ctl.key.set(P.key); ctl.mod.set(P.mod); ctl.win.set(P.win); const adv = ui.level === "adv";
  ctl.scale.el.querySelectorAll("button").forEach((b, i) => { const k = Object.keys(SCALES)[i]; b.style.display = adv || !["phrygian", "lydian", "locrian", "whole", "minorM"].includes(k) ? "" : "none"; }); ctl.mod.el.style.display = adv ? "" : "none"; ctl.win.el.style.display = adv ? "" : "none"; }
function set(o) { Object.assign(P, DEF, o); if (ui.level !== "adv") P.mod = "none"; sync(); remel(); }
function remel() { const f = MODS[P.mod][1], k2 = f ? f(P.key) : null; mel = melody(P.key, P.n, K.rng(seed * 7 + P.key), k2, k2 != null ? P.n / 2 : null); playing = false; }
function scaleNotes() { const t = TON[P.ton], st = SCALES[P.scale][1], base = 60 + t[1]; return st.map(s => base + s).concat([base + 12]); }
function spellScale() { const t = TON[P.ton], heptatonic = SCALES[P.scale][2], flats = t[0].includes("♭") || t[0] === "F" || ["blues", "pentaMin"].includes(P.scale);
  const SH = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6], FL = [0, 1, 1, 2, 2, 3, 4, 4, 5, 5, 6, 6];
  return scaleNotes().map((m, i) => heptatonic ? spellAs(m, (t[2] + i) % 7) : spellAs(m, (flats ? FL : SH)[m % 12])); }
async function playScale() { await soundOn(); K.sound.stop(); const n = scaleNotes(), seq = n.concat(n.slice(0, -1).reverse()); seq.forEach((m, i) => note(m, i * 0.32, 0.3)); playing = "scale"; play0 = performance.now(); }
async function playMel() { await soundOn(); K.sound.stop(); mel.forEach((m, i) => note(m, i * rate, rate * 0.9)); playing = "mel"; play0 = performance.now(); }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function keyboard(c, x0, y0, w, h, on, hl) { const whites = [], wk = w / 15; let wi = 0; for (let m = 60; m <= 84; m++) if (NAT.includes(m % 12)) { whites.push([m, x0 + wi * wk]); wi++; }
  for (const [m, x] of whites) { c.fillStyle = on.has(m) ? (hl === m ? "#ffd166" : "#7ee787") : "#e8e8e8"; c.fillRect(x, y0, wk - 2, h); }
  for (let m = 60; m <= 84; m++) if (!NAT.includes(m % 12)) { const prev = whites.find(q => q[0] === m - 1); if (!prev) continue; c.fillStyle = on.has(m) ? (hl === m ? "#ffd166" : "#2f9e5a") : "#222"; c.fillRect(prev[1] + wk * 0.65, y0, wk * 0.65, h * 0.6); } }
function trebleStave(c, x0, x1, y0, sp) { c.strokeStyle = "#8fa0bf"; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(x0, y0 + i * sp); c.lineTo(x1, y0 + i * sp); c.stroke(); } c.fillStyle = "#cfd8ea"; c.font = `${sp * 4.2}px serif`; c.textAlign = "left"; c.fillText("𝄞", x0 + 4, y0 + 4 * sp + sp * 0.6); return s => y0 + 4 * sp - (s.letter + 7 * s.oct - 30) * sp / 2; }
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h, adv = ui.level === "adv"; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h);
  if (P.view === "scale") { const notes = scaleNotes(), sp = spellScale(), st = SCALES[P.scale][1], idx = playing === "scale" ? Math.floor((performance.now() - play0) / 320) : -1, seq = notes.concat(notes.slice(0, -1).reverse()), hl = idx >= 0 && idx < seq.length ? seq[idx] : null;
    TX(c, `${TON[P.ton][0]} ${SCALES[P.scale][0]}`, 24, 34, "#eef2f8", "left", "600 16px");
    keyboard(c, 24, 60, Math.min(w - 48, 620), 110, new Set(notes), hl);
    const steps = notes.slice(1).map((m, i) => m - notes[i]); TX(c, "Steps: " + steps.map(stepName).join(" "), 24, 200, "#ffd166", "left", "600 14px");
    const y = trebleStave(c, 24, Math.min(w - 24, 700), 240, 10), dx = (Math.min(w - 24, 700) - 90) / sp.length;
    sp.forEach((s, i) => { const x = 90 + i * dx, yy = y(s); if (s.letter + 7 * s.oct <= 28) { c.strokeStyle = "#8fa0bf"; c.beginPath(); c.moveTo(x - 10, y({ letter: 0, oct: 4 })); c.lineTo(x + 10, y({ letter: 0, oct: 4 })); c.stroke(); } c.fillStyle = notes[i] === hl ? "#ffd166" : "#eef2f8"; c.beginPath(); c.ellipse(x, yy, 6.5, 4.6, -0.35, 0, 6.3); c.fill(); if (s.acc) { c.font = "16px serif"; c.textAlign = "right"; c.fillText(accStr(s.acc), x - 9, yy + 5); } TX(c, LET[s.letter] + accStr(s.acc), x, 320, "#cfd8ea", "center", "12px"); });
  } else { const idx = playing === "mel" ? Math.min(mel.length - 1, Math.floor((performance.now() - play0) / 1000 / rate)) : mel.length - 1, upto = mel.slice(0, idx + 1), est = bestKey(upto.slice(-P.win)), f = MODS[P.mod][1], k2 = f ? f(P.key) : null, truth = k2 != null && idx >= P.n / 2 ? k2 : P.key;
    TX(c, `Melody in ${keyName(P.key)}${k2 != null ? ", modulating " + MODS[P.mod][0] + ` (${keyName(k2)})` : ""}`, 24, 34, "#eef2f8", "left", "600 15px");
    // the circle of fifths: majors outside, relative minors inside
    const cx = w * 0.24, cy = h * 0.55, R1 = Math.min(150, h * 0.36), R2 = R1 * 0.62, rel = new Set(related(P.key));
    for (let k = 0; k < 12; k++) { const a = -Math.PI / 2 + k * Math.PI / 6; [[k, R1], [k + 12, R2]].forEach(([kk, R]) => { const x = cx + R * Math.cos(a), y = cy + R * Math.sin(a), isT = kk === truth, isE = kk === est; c.fillStyle = isE ? "#ffd166" : isT ? "rgba(126,231,135,.35)" : rel.has(kk) ? "rgba(90,209,255,.18)" : "#16203a"; c.beginPath(); c.arc(x, y, kk < 12 ? 21 : 17, 0, 6.3); c.fill(); if (isT) { c.strokeStyle = "#7ee787"; c.lineWidth = 2; c.stroke(); c.lineWidth = 1; } TX(c, kk < 12 ? KNAMES[kk] : MNAMES[kk - 12].toLowerCase(), x, y + 4, isE ? "#0b1020" : "#eef2f8", "center", kk < 12 ? "600 13px" : "11.5px"); }); }
    TX(c, "yellow: the computer's estimate · green ring: the true key now · blue: keys related to the starting key", 24, h - 14, "#8fa0bf", "left", "11px");
    // the melody as a piano roll
    const x0 = w * 0.48, x1 = w - 20, y0 = 60, y1 = h * 0.62, dx = (x1 - x0) / mel.length, lo = 58, hi = 86, Y = m => y1 - (m - lo) / (hi - lo) * (y1 - y0);
    c.strokeStyle = "#1f2c47"; for (let m = lo; m <= hi; m++) if (m % 12 === 0) { c.beginPath(); c.moveTo(x0, Y(m)); c.lineTo(x1, Y(m)); c.stroke(); TX(c, "C" + (m / 12 - 1), x0 - 4, Y(m) + 4, "#8fa0bf", "right", "10px"); }
    if (k2 != null) { c.fillStyle = "rgba(255,255,255,.05)"; c.fillRect(x0 + dx * P.n / 2, y0, x1 - x0 - dx * P.n / 2, y1 - y0); TX(c, "after the modulation", x0 + dx * P.n / 2 + 4, y0 + 12, "#8fa0bf", "left", "10.5px"); }
    mel.forEach((m, i) => { const inKey = keyScale(i >= P.n / 2 && k2 != null ? k2 : P.key).includes(m % 12); c.fillStyle = i === idx && playing ? "#ffd166" : i <= idx ? (inKey ? "#5ad1ff" : "#ff7b9c") : "#3a4a6b"; c.fillRect(x0 + i * dx + 1, Y(m) - 4, dx - 2, 8); });
    TX(c, `Notes heard: ${idx + 1} · estimate from the last ${Math.min(P.win, idx + 1)} notes: ${keyName(est)}`, x0, y1 + 26, est === truth ? "#7ee787" : "#ffb454", "left", "600 12.5px");
  }
  ui.hud("");
}
function charts() { chA.opts.xFmt = null; chB.opts.xFmt = null;
  if (P.view === "scale") { const notes = scaleNotes(), h = new Array(12).fill(0); notes.slice(0, -1).forEach(m => h[m % 12] = 1);
    chA.opts.title = "Notes of the scale (pitch classes)"; chA.opts.xLabel = ""; chA.opts.yLabel = ""; chA.opts.xFmt = v => Math.abs(v - Math.round(v)) < 0.01 ? ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"][Math.round(v)] || "" : ""; chA.draw([{ pts: h.map((v, i) => [i, v]), type: "bars", w: 0.7, color: "#7ee787", label: "" }], { xMin: -0.6, xMax: 11.6, yMin: 0, yMax: 1.2 });
    const sc = keyScores(notes.slice(0, -1)), order = sc.map((v, k) => [k, v]).sort((a, b) => b[1] - a[1]).slice(0, 6); chB.opts.title = "Keys these notes fit best"; chB.opts.xLabel = ""; chB.opts.yLabel = "correlation"; chB.opts.xFmt = v => Math.abs(v - Math.round(v)) < 0.01 ? (order[Math.round(v)] ? keyName(order[Math.round(v)][0]).replace(" major", "").replace(" minor", "m") : "") : ""; chB.draw([{ pts: order.map((q, i) => [i, q[1]]), type: "bars", w: 0.6, color: "#c4a1ff", label: "" }], { xMin: -0.6, xMax: 5.6 });
    const steps = notes.slice(1).map((m, i) => m - notes[i]); label(0, "notes"); label(1, "semitone steps"); label(2, "tones"); label(3, "fits best"); read.set("a", notes.length - 1); read.set("b", steps.filter(d => d === 1).length); read.set("c", steps.filter(d => d === 2).length); read.set("d", keyName(order[0][0]));
  } else { const idx = playing === "mel" ? Math.min(mel.length - 1, Math.floor((performance.now() - play0) / 1000 / rate)) : mel.length - 1, f = MODS[P.mod][1], k2 = f ? f(P.key) : null;
    const tr1 = [], tr2 = [], est = []; for (let i = 0; i <= idx; i++) { const s = keyScores(mel.slice(Math.max(0, i - P.win + 1), i + 1)); tr1.push([i + 1, s[P.key]]); if (k2 != null) tr2.push([i + 1, s[k2]]); est.push(s.indexOf(Math.max(...s))); }
    chA.opts.title = "How well each key fits (sliding window)"; chA.opts.xLabel = "note"; chA.opts.yLabel = "correlation"; chA.draw([{ pts: tr1, color: "#5ad1ff", label: keyName(P.key) }].concat(k2 != null ? [{ pts: tr2, color: "#ffb454", label: keyName(k2) }] : []), { xMin: 1, xMax: P.n, yMin: -1, yMax: 1, vlines: k2 != null ? [{ x: P.n / 2 + 1, label: "modulates" }] : [] });
    const sc = keyScores(mel.slice(Math.max(0, idx - P.win + 1), idx + 1)), order = sc.map((v, k) => [k, v]).sort((a, b) => b[1] - a[1]).slice(0, 6); chB.opts.title = "Best keys right now"; chB.opts.xLabel = ""; chB.opts.yLabel = "correlation"; chB.opts.xFmt = v => Math.abs(v - Math.round(v)) < 0.01 ? (order[Math.round(v)] ? keyName(order[Math.round(v)][0]).replace(" major", "").replace(" minor", "m") : "") : ""; chB.draw([{ pts: order.map((q, i) => [i, q[1]]), type: "bars", w: 0.6, color: "#ffd166", label: "" }], { xMin: -0.6, xMax: 5.6, yMin: -1, yMax: 1 });
    let det = null; if (k2 != null) for (let i = P.n / 2; i <= idx; i++) if (est[i] === k2) { det = i - P.n / 2 + 1; break; }
    label(0, "notes heard"); label(1, "estimate"); label(2, "true key"); label(3, "modulation detected after"); read.set("a", idx + 1); read.set("b", keyName(est[est.length - 1])); read.set("c", keyName(k2 != null && idx >= P.n / 2 ? k2 : P.key)); read.set("d", k2 == null ? "–" : det ? det + " notes" : "not yet"); }
}
let frame = 0;
ui.onLevel = () => sync();
ui.run(() => { }, () => { draw(); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("Choose a tonic and a scale and press ▶. Then switch to key finding and play a melody that changes key.", 7000);
