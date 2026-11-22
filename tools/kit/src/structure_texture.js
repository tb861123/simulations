/* =====================================================================
   STRUCTURE AND TEXTURE
   STRUCTURE (form) is how a piece is built from sections. Sections that
   return get the same letter: BINARY AB, TERNARY ABA, RONDO ABACA,
   THEME AND VARIATIONS A A¹ A², 32-BAR SONG AABA, VERSE–CHORUS, the
   12-BAR BLUES, and SONATA FORM (exposition: first subject in the tonic,
   second subject in the dominant; development; recapitulation with both
   subjects in the tonic), the form of first movements of symphonies.
   TEXTURE is how the parts fit together at one moment:
     MONOPHONIC      one melody line alone
     HOMOPHONIC      chords moving together with the tune (like a hymn)
     MELODY AND ACCOMPANIMENT   a tune over a pattern (an Alberti bass)
     POLYPHONIC      two or more independent melodies (counterpoint)
     CANON (imitation) the same tune starting later in another part
     HETEROPHONIC    two versions of the same tune at once, one decorated
   Every piece here is composed by the computer from themes, following
   the chosen form, and played in the chosen texture. A SELF-SIMILARITY
   map compares every section with every other: repeats show as bright
   squares, which is how music software finds the structure of a song.
   ===================================================================== */
const freq = m => 440 * Math.pow(2, (m - 69) / 12);
async function soundOn() { if (!K.sound.on) await K.sound.enable(true); }
const tone = (m, at, dur, vol, type = "triangle") => K.sound.tone(freq(m), { at, dur, vol, type, attack: 0.02 });
const MAJ = [0, 2, 4, 5, 7, 9, 11], MIN = [0, 2, 3, 5, 7, 8, 11];
// keys used by sections: semitones above C and the scale
const AREAS = { I: [0, MAJ, "tonic (C major)"], V: [7, MAJ, "dominant (G major)"], vi: [9, MIN, "relative minor (A minor)"], IV: [5, MAJ, "subdominant (F major)"], dev: [2, MIN, "moving through keys"] };
/* The forms: each section is [letter, key area, variation level, label] */
const FORMS = {
  binary: { name: "Binary (AB)", secs: [["A", "I", 0, "A (ends in the dominant)"], ["B", "V", 0, "B (returns home)"]] },
  ternary: { name: "Ternary (ABA)", secs: [["A", "I", 0, "A"], ["B", "vi", 0, "B (contrast)"], ["A", "I", 0, "A (again)"]] },
  rondo: { name: "Rondo (ABACA)", secs: [["A", "I", 0, "A"], ["B", "V", 0, "B (episode 1)"], ["A", "I", 0, "A"], ["C", "vi", 0, "C (episode 2)"], ["A", "I", 0, "A"]] },
  variations: { name: "Theme and variations", secs: [["A", "I", 0, "Theme"], ["A", "I", 1, "Variation 1 (decorated)"], ["A", "vi", 2, "Variation 2 (minor)"], ["A", "I", 3, "Variation 3 (new rhythm feel)"]] },
  aaba: { name: "32-bar song (AABA)", secs: [["A", "I", 0, "A"], ["A", "I", 0, "A"], ["B", "IV", 0, "B (middle eight)"], ["A", "I", 0, "A"]] },
  pop: { name: "Verse–chorus", secs: [["V", "vi", 0, "Verse"], ["C", "I", 0, "Chorus"], ["V", "vi", 1, "Verse 2"], ["C", "I", 0, "Chorus"], ["B", "IV", 0, "Bridge"], ["C", "I", 0, "Chorus"]] },
  sonata: { name: "Sonata form", secs: [["P", "I", 0, "Exposition: 1st subject (tonic)"], ["S", "V", 0, "Exposition: 2nd subject (dominant)"], ["D", "dev", 0, "Development"], ["P", "I", 0, "Recapitulation: 1st subject"], ["S", "I", 0, "Recapitulation: 2nd subject (now in the tonic)"]] }
};
const TEXTURES = { mono: "Monophonic", homo: "Homophonic", acc: "Melody and accompaniment", poly: "Polyphonic", canon: "Canon (imitation)", hetero: "Heterophonic" };
const BEATS = 8;   // each section: 8 beats (two bars of 4/4)
// a theme for each letter: scale degrees for 8 beats (made once from a seed); contrasting letters use different shapes
function theme(letter, r) { const out = []; let d = letter === "B" || letter === "S" || letter === "C" ? 4 : 0; for (let i = 0; i < BEATS; i++) { if (i === BEATS - 1) d = d > 3 ? 4 : 0; out.push(d); const u = r(); d += u < 0.4 ? 1 : u < 0.8 ? -1 : u < 0.9 ? 2 : -2; d = Math.max(-2, Math.min(9, d)); } return out; }
// turn a section into notes: melody (scale degrees → MIDI in the section's key) with variation, plus accompaniment by texture
function compose(formKey, texture, varAmt, seed) {
  const r = K.rng(seed), themes = {}, F = FORMS[formKey], notes = [], meta = [];
  for (const s of F.secs) if (!themes[s[0]]) themes[s[0]] = theme(s[0], r);
  F.secs.forEach(([L, area, v, lab], si) => {
    const [t, sc] = AREAS[area], t0 = si * BEATS, vr = K.rng(seed * 31 + si * 7), mel = themes[L].map((d, i) => {
      let dd = d; if (L === "D") dd = d + (i % 4 === 0 ? 2 : 0) * (vr() < 0.5 ? 1 : -1);                               // development: fragments shifted around
      if (v + (vr() < varAmt ? 1 : 0) > 0 && i % 2 === 1 && vr() < 0.35 + 0.3 * varAmt) dd += vr() < 0.5 ? 1 : -1;            // variation: some notes changed
      const oct = Math.floor(dd / 7), k = ((dd % 7) + 7) % 7; return 72 + t + 12 * oct + sc[k] - (t > 6 ? 12 : 0); });
    const chordRoot = i => [0, 3, 4, 0][Math.floor(i / 2) % 4];                                                          // I IV V I in the section's key, two beats each
    const triad = i => [0, 2, 4].map(q => { const dd = chordRoot(i) + q, k = dd % 7; return 48 + t + sc[k] + 12 * Math.floor(dd / 7) - (t > 6 ? 12 : 0); });
    mel.forEach((m, i) => { const beat = t0 + i; notes.push({ t: beat, d: 1, m, v: 0 });
      if (v === 1 && i < BEATS - 1) notes.push({ t: beat + 0.5, d: 0.5, m: m + (mel[i + 1] > m ? 2 : -1), v: 0 });     // decorated: passing notes
      if (texture === "homo") triad(i).forEach(q => notes.push({ t: beat, d: 1, m: q + 12, v: 1 }));
      if (texture === "acc") { const tr = triad(i); [tr[0], tr[2], tr[1], tr[2]].forEach((q, j) => notes.push({ t: beat + j * 0.25, d: 0.25, m: q, v: 1 })); }
      if (texture === "poly") { const cm = 60 + t + sc[((6 - i * 2 + 70) % 7)] - (t > 6 ? 12 : 0) + (i % 3 === 0 ? 0 : 0); notes.push({ t: beat + (i % 2 ? 0.5 : 0), d: i % 2 ? 0.5 : 1.5, m: cm, v: 2 }); }
      if (texture === "hetero") { notes.push({ t: beat, d: 0.5, m, v: 2 }); notes.push({ t: beat + 0.5, d: 0.5, m: m + (i % 2 ? 2 : -1), v: 2 }); }
    });
    if (texture === "canon") mel.forEach((m, i) => { if (i + 2 < BEATS) notes.push({ t: t0 + i + 2, d: 1, m: m - 12, v: 2 }); });               // the same tune two beats later, an octave lower
    meta.push({ L, area, v, lab, t0, mel, deg: themes[L] });
  });
  return { notes, meta, len: F.secs.length * BEATS };
}
// similarity of two sections: share of beats with the same scale degree (so a repeat in another key still counts)
function similar(a, b) { let s = 0; const da = degs(a), db = degs(b); for (let i = 0; i < BEATS; i++) if (da[i] === db[i]) s++; return s / BEATS; }
const degs = sec => { const [t, sc] = AREAS[sec.area]; return sec.mel.map(m => { const pc = ((m - t) % 12 + 12) % 12; let best = 0; sc.forEach((q, k) => { if (Math.abs(q - pc) < Math.abs(sc[best] - pc)) best = k; }); return best; }); };
// automatic structure finding: give a new letter to a section unless it is similar enough to an earlier one
function autoLabel(meta, thr = 0.6) { const lab = []; meta.forEach((s, i) => { let L = null; for (let j = 0; j < i; j++) if (similar(s, meta[j]) >= thr) { L = lab[j]; break; } lab.push(L || String.fromCharCode(65 + new Set(lab).size)); }); return lab; }
const trueLabels = meta => { const map = {}; return meta.map(s => map[s.L] || (map[s.L] = String.fromCharCode(65 + Object.keys(map).length))); };
// share of beats where two voices make a dissonance (2nd, 7th or tritone)
function clashes(notes) { const by = {}; for (const n of notes) { const b = Math.floor(n.t); (by[b] = by[b] || {})[n.v] = n.m; } let d = 0, k = 0; for (const b in by) if (by[b][0] != null && by[b][2] != null) { k++; const iv = Math.abs(by[b][0] - by[b][2]) % 12; if ([1, 2, 6, 10, 11].includes(iv)) d++; } return k ? d / k : 0; }
const density = (notes, len) => { let s = 0; for (let t = 0; t < len; t += 0.25) s += notes.filter(n => n.t <= t + 1e-9 && n.t + n.d > t + 1e-9).length; return s / (len * 4); };

// ---------------- The page ----------------
const DEF = { form: "ternary", texture: "acc", varAmt: 0.2, tempo: 110 };
const P = Object.assign({}, DEF); let piece = null, seed = 4, play0 = 0, playing = false, guessMode = false, guess = "";
const ui = K.app({
  title: "Structure and Texture", subject: "Music",
  blurb: "Pieces composed in binary, ternary, rondo, variation, song, verse–chorus and sonata forms, played in six textures, with a map that finds the repeats",
  sound: "Play the piece (the ▶ Play button switches sound on)",
  reset: () => set({}),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "Eduqas GCSE Music (C660): structure (binary, ternary, rondo, theme and variations, strophic, verse–chorus, 12-bar blues) and texture (monophonic, homophonic, melody and accompaniment, polyphonic, imitation and canon, unison).", adv: "Eduqas A level Music (A660QS) Component 3, musical elements (structure and texture): sonata form in the development of the symphony (exposition with contrasting key areas, development, recapitulation), rondo and variation forms, song forms (AABA) and verse–chorus in popular music; contrapuntal, imitative, homophonic and heterophonic textures." } },
  missions: [
    { title: "Ternary form", q: "Play the ternary piece. Which section comes back? How does the middle section contrast with it?", hint: "A B A: the first section returns at the end. B is in a contrasting key (here the relative minor) with a different tune. The self-similarity map shows A matching A as a bright square.", setup() { set({ form: "ternary" }); } },
    { title: "Rondo", q: "Play the rondo. How many times does A return? What separates the returns?", hint: "A B A C A: the main theme (refrain) returns three times, with contrasting episodes (B, C) in between, like a chorus.", setup() { set({ form: "rondo" }); } },
    { title: "Textures", q: "Play the same piece as monophonic, homophonic, melody and accompaniment, and polyphonic. Describe each texture.", hint: "Monophonic: one line. Homophonic: chords moving with the tune. Melody and accompaniment: a tune over a broken-chord pattern (Alberti bass). Polyphonic: two independent lines.", setup() { set({ form: "ternary", texture: "mono" }); } },
    { title: "Canon", q: "Choose canon. How far apart do the two parts start? Can you hear the tune twice?", hint: "The second part plays the same tune two beats later, an octave lower: imitation. A canon at a distance sounds busy where the parts overlap.", setup() { set({ form: "binary", texture: "canon" }); } },
    { lvl: "adv", title: "Sonata form", q: "Play the sonata form. In which keys are the first and second subjects in the exposition? What changes in the recapitulation?", hint: "Exposition: first subject in the tonic, second in the dominant (a key contrast). Development: themes broken up and moved through keys. Recapitulation: both subjects return in the tonic, resolving the contrast.", setup() { set({ form: "sonata", texture: "acc" }); } },
    { lvl: "adv", title: "Can a computer find the form?", q: "Theme and variations with more and more variation. When does the automatic labelling stop recognising the variations as the theme?", hint: "The map compares scale degrees beat by beat. Light decoration keeps the similarity high; heavier variation drops it below the threshold and the computer calls it a new section, though a listener still hears the theme.", setup() { set({ form: "variations", varAmt: 0.2 }); } },
    { title: "Name that form", q: "Switch on 'Hide the form', press 🎲 for a mystery piece and play it. Which form is it?", hint: "Listen for what comes back and how often: AB, ABA, ABACA, AABA, verse–chorus. Check with the map, then reveal.", setup() { set({}); guessMode = true; ctl.hide.set(true); } }
  ],
  batch: [
    { lvl: "adv", title: "Variation and automatic form-finding", question: "How often does automatic labelling get every section of a theme and variations right, for different amounts of variation?", how: "Random themes; four sections; similarity threshold 60%.", xLabel: "amount of variation", yLabel: "% of pieces labelled correctly", xs: [0, 0.2, 0.4, 0.6, 0.8, 1], reps: 30, yMin: 0, yMax: 100, run: (v, r) => { const p = compose("variations", "mono", v, 1 + r.int(1e6)), a = autoLabel(p.meta).join(""); return a === "AAAA" ? 100 : 0; }, note: "As more notes change, a note-by-note comparison stops recognising the theme. (The minor-key variation is still found, because it is compared in its own key.) Listeners use rhythm, harmony and contour too." },
    { title: "Canon: when do the parts clash?", question: "In a canon, how often do the two parts form a dissonance (2nd, 7th or tritone)?", how: "Random tunes in C major, the second part an octave lower; delay in beats.", xLabel: "delay before the second part (beats)", yLabel: "% of beats dissonant", xs: [1, 2, 3, 4, 6], reps: 20, yMin: 0, run: (d, r) => { const p = compose("binary", "mono", 0, 1 + r.int(1e6)), mel = p.notes.filter(n => n.v === 0 && Number.isInteger(n.t)), two = mel.map(n => ({ t: n.t + d, d: 1, m: n.m - 12, v: 2 })); return 100 * clashes(mel.concat(two)); }, note: "A one-beat delay clashes most: a tune that moves by step puts neighbouring notes a second apart. Longer delays still clash a quarter to two-fifths of the time: composers write tunes that fit against themselves, which is the skill of writing a canon." },
    { title: "How thick is each texture?", question: "How many notes sound at once, on average, in each texture?", how: "Ternary pieces with random themes. 1 monophonic, 2 homophonic, 3 melody and accompaniment, 4 polyphonic, 5 canon, 6 heterophonic.", xLabel: "texture", yLabel: "notes sounding at once", xs: [1, 2, 3, 4, 5, 6], reps: 6, yMin: 0, run: (i, r) => { const p = compose("ternary", Object.keys(TEXTURES)[i - 1], 0, 1 + r.int(1e6)); return density(p.notes, p.len); }, note: "Homophony is thickest (four notes at once); monophony thinnest. Texture is about how parts relate, not only how many there are." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "GCSE", text: "Binary AB; ternary ABA; rondo ABACA (a refrain with episodes); theme and variations A A¹ A²; strophic (same music each verse); verse–chorus; 12-bar blues (I I I I IV IV I I V IV I I)." },
      { lvl: "std", tag: "GCSE", text: "Textures: monophonic (one line), homophonic (chordal), melody and accompaniment, polyphonic or contrapuntal (independent lines), imitation and canon, unison and octaves." },
      { lvl: "adv", tag: "A660 structure", text: "Sonata form: exposition (first subject in the tonic, transition, second subject in the dominant or relative major), development (fragmentation, modulation), recapitulation (both subjects in the tonic), often a coda." },
      { lvl: "adv", tag: "A660 structure", text: "In popular music: intro, verse, pre-chorus, chorus, bridge (middle eight), outro; 32-bar song form AABA in jazz standards and musicals." },
      { lvl: "adv", tag: "A660 texture", text: "Heterophony: simultaneous variants of one melody (common in folk and non-Western music). Contrapuntal devices: imitation, canon, fugue, inversion, augmentation." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: () => `Describe the structure of this piece: ${piece ? piece.meta.map(s => s.L).join(" ") : ""}.`, ans: () => `<ul><li>${FORMS[P.form].name}</li><li>${piece ? piece.meta.map(s => s.lab).join("; ") : ""}</li></ul>` },
      { lvl: "std", marks: 2, q: "What is the difference between a homophonic and a polyphonic texture?", ans: "<ul><li>homophonic: parts move together in chords with the melody</li><li>polyphonic: two or more independent melodies at once</li></ul>" },
      { lvl: "adv", marks: 4, q: "Describe the key relationships in sonata form and explain why the recapitulation is in the tonic.", ans: "<ul><li>first subject in the tonic, second subject in a contrasting key (dominant, or relative major in minor keys)</li><li>development moves through other keys</li><li>recapitulation: both subjects in the tonic</li><li>this resolves the tension of the key contrast and ends the movement in the home key</li></ul>" }
    ]
  },
  notes: `<h3>How it works</h3>
<ul><li>Each letter of the form gets its own 8-beat theme: a random walk on scale degrees, ending on the tonic or the dominant. Sections are placed in key areas (tonic, dominant, relative minor, subdominant, or wandering for a development).</li>
<li>Variations change some notes (more with the variation slider); variation 1 adds passing notes, variation 2 is in the minor.</li>
<li>Textures are added beat by beat: block chords (I–IV–V–I, two beats each) for homophony; a broken-chord (Alberti) pattern for melody and accompaniment; an independent counter-melody for polyphony; the tune two beats later an octave lower for canon; a decorated copy for heterophony.</li>
<li>The self-similarity map compares the scale degrees of every pair of sections beat by beat. Automatic labelling gives a section an earlier letter if at least 60% of its beats match.</li></ul>
<h3>Simplifications</h3><ul><li>Every section is 8 beats; real sections are much longer and their rhythms vary.</li><li>The computer's tunes and counterpoint are simple and break some rules.</li></ul>`
});

// ---------------- Controls ----------------
const ctl = {}; let g = ui.group("Piece");
ctl.form = K.seg(g, { label: "Form", value: "ternary", options: Object.entries(FORMS).map(([k, f]) => [k, f.name]), on: v => { P.form = v; recompose(); } });
ctl.texture = K.seg(g, { label: "Texture", value: "acc", options: Object.entries(TEXTURES).map(([k, n]) => [k, n]), on: v => { P.texture = v; recompose(); } });
ctl.varAmt = K.slider(g, { label: "Amount of variation in repeats", min: 0, max: 1, step: 0.1, value: 0.2, on: v => { P.varAmt = v; recompose(); } });
ctl.tempo = K.slider(g, { label: "Tempo", min: 60, max: 180, step: 5, value: 110, unit: "bpm", on: v => P.tempo = v });
let rr = K.row(g); K.btn(rr, "▶ Play", () => play(), "primary"); K.btn(rr, "■ Stop", () => { K.sound.stop(); playing = false; }); K.btn(rr, "🎲 New themes", () => { seed++; if (guessMode) { P.form = Object.keys(FORMS)[K.rng(seed).int(ui.level === "adv" ? 7 : 6)]; } recompose(); });
ctl.hide = K.toggle(g, { label: "Hide the form (mystery piece)", value: false, on: v => { guessMode = v; } });
const read = K.readout(ui.group("Analysis"), [["f", "form"], ["l", "sections"], ["a", "automatic labels"], ["d", "notes at once (average)"]]);
function sync() { ctl.form.set(P.form); ctl.texture.set(P.texture); ctl.varAmt.set(P.varAmt); ctl.tempo.set(P.tempo); const adv = ui.level === "adv"; ctl.form.el.querySelectorAll("button").forEach((b, i) => b.style.display = adv || Object.keys(FORMS)[i] !== "sonata" ? "" : "none"); ctl.texture.el.querySelectorAll("button").forEach((b, i) => b.style.display = adv || Object.keys(TEXTURES)[i] !== "hetero" ? "" : "none"); }
function set(o) { Object.assign(P, DEF, o); guessMode = false; ctl.hide.set(false); sync(); recompose(); }
function recompose() { piece = compose(P.form, P.texture, P.varAmt, seed); playing = false; K.sound.stop && K.sound.stop(); }
async function play() { await soundOn(); K.sound.stop(); const b = 60 / P.tempo; for (const n of piece.notes) tone(n.m, n.t * b, n.d * b * 0.95, n.v === 0 ? 0.13 : 0.06, n.v === 2 ? "sine" : "triangle"); playing = true; play0 = performance.now(); }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
const LCOL = { A: "#5ad1ff", B: "#ffb454", C: "#7ee787", V: "#c4a1ff", P: "#5ad1ff", S: "#ffb454", D: "#ff7b9c" };
const VCOL = ["#ffd166", "#5ad1ff", "#ff7b9c"];
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); if (!piece) return;
  const hide = guessMode, b = 60 / P.tempo, now = playing ? (performance.now() - play0) / 1000 / b : -1; if (now > piece.len + 1) playing = false;
  TX(c, hide ? "🕵 Mystery piece: what is its form?" : `${FORMS[P.form].name} · ${TEXTURES[P.texture]}`, 24, 32, "#eef2f8", "left", "600 15px");
  // form timeline
  const x0 = 30, x1 = w - 20, X = t => x0 + (x1 - x0) * t / piece.len;
  piece.meta.forEach((s, i) => { const xa = X(s.t0), xb = X(s.t0 + BEATS); c.fillStyle = hide ? "#3a4a6b" : (LCOL[s.L] || "#8fa0bf"); c.globalAlpha = s.v ? 0.65 : 0.9; c.fillRect(xa + 1, 48, xb - xa - 2, 34); c.globalAlpha = 1;
    TX(c, hide ? "?" : s.L + (s.v ? "¹²³"[s.v - 1] : ""), (xa + xb) / 2, 70, "#0b1020", "center", "600 16px"); if (!hide) TX(c, s.lab.length > 26 ? s.lab.slice(0, 26) + "…" : s.lab, (xa + xb) / 2, 98, "#aab6cc", "center", "10.5px"); if (!hide) TX(c, AREAS[s.area][2].split(" (")[0], (xa + xb) / 2, 112, "#8fa0bf", "center", "10px"); });
  // piano roll
  const y0 = 130, y1 = h - 20, lo = Math.min(...piece.notes.map(n => n.m)) - 2, hi = Math.max(...piece.notes.map(n => n.m)) + 2, Y = m => y1 - (m - lo) / (hi - lo) * (y1 - y0), rh = Math.max(3, (y1 - y0) / (hi - lo) - 1);
  c.strokeStyle = "#1f2c47"; for (let m = lo; m <= hi; m++) if (m % 12 === 0) { c.beginPath(); c.moveTo(x0, Y(m)); c.lineTo(x1, Y(m)); c.stroke(); TX(c, "C" + (m / 12 - 1), x0 - 4, Y(m) + 4, "#8fa0bf", "right", "9.5px"); }
  for (const n of piece.notes) { c.fillStyle = VCOL[n.v]; c.globalAlpha = now >= n.t && now < n.t + n.d ? 1 : 0.6; c.fillRect(X(n.t) + 1, Y(n.m) - rh / 2, Math.max(2, X(n.t + n.d) - X(n.t) - 2), rh); } c.globalAlpha = 1;
  if (now >= 0) { c.strokeStyle = "#fff"; c.beginPath(); c.moveTo(X(now), 44); c.lineTo(X(now), y1); c.stroke(); }
  TX(c, "yellow: melody · blue: accompaniment · pink: second part", x1, h - 4, "#8fa0bf", "right", "10.5px");
  ui.hud("");
}
function charts() { if (!piece) return; const n = piece.meta.length, pts = [];
  // self-similarity map, drawn as a grid of squares by brightness (a heat map from bars)
  chA.opts.title = "Self-similarity map (bright = alike)"; chA.opts.xLabel = "section"; chA.opts.yLabel = "section"; chA.opts.xFmt = v => Math.abs(v - Math.round(v)) < 0.01 ? String(Math.round(v)) : ""; chA.opts.yFmt = chA.opts.xFmt;
  const ser = []; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const s = similar(piece.meta[i], piece.meta[j]); ser.push({ pts: [[i + 1, j + 1]], type: "dots", r: Math.max(2, 22 * s), color: `rgba(255,209,102,${0.15 + 0.85 * s})`, label: "" }); }
  chA.draw(ser, { xMin: 0.4, xMax: n + 0.6, yMin: 0.4, yMax: n + 0.6 });
  const dens = []; for (let t = 0; t < piece.len; t += 0.5) dens.push([t, piece.notes.filter(q => q.t <= t + 1e-9 && q.t + q.d > t + 1e-9).length]);
  chB.opts.title = "Notes sounding at once (texture density)"; chB.opts.xLabel = "beat"; chB.opts.yLabel = "notes"; chB.draw([{ pts: dens, color: "#5ad1ff", label: TEXTURES[P.texture] }], { xMin: 0, xMax: piece.len, yMin: 0 });
  const hide = guessMode; read.set("f", hide ? "?" : FORMS[P.form].name); read.set("l", hide ? "?" : trueLabels(piece.meta).join(" ")); read.set("a", autoLabel(piece.meta).join(" ")); read.set("d", density(piece.notes, piece.len).toFixed(1));
}
let frame = 0;
ui.onLevel = () => sync();
ui.run(() => { }, () => { draw(); if (frame++ % 8 === 0) charts(); });
set({});
ui.tip("Choose a form and a texture, then ▶ Play. Coloured blocks show the sections; the map finds the repeats.", 7000);
