/* =====================================================================
   HARMONY, CHORDS AND CADENCES
   A CHORD built on each note of the scale gets a Roman numeral: in a
   major key I, IV and V are major, ii, iii and vi minor, vii° diminished.
   Chords can be in root position (a), first inversion (b: the third in
   the bass) or second inversion (c: the fifth in the bass).
   A CADENCE is the pair of chords that ends a phrase:
     PERFECT V–I (finished)       IMPERFECT ?–V (unfinished, like a comma)
     PLAGAL IV–I ("Amen")         INTERRUPTED V–vi (a surprise)
   Four-part (SATB) harmony moves each voice as smoothly as possible and
   follows rules that keep the parts independent: no consecutive (parallel)
   fifths or octaves, no crossing, the leading note rising to the tonic.
   This simulation voices any progression automatically by searching all
   possible four-part chords for the smoothest legal path, checks the
   rules, names the cadences and plays the result.
   ===================================================================== */
// ---------------- A small music toolkit: pitch, spelling, notation and sound ----------------
const LET = "CDEFGAB", NAT = [0, 2, 4, 5, 7, 9, 11];
const KEYS = { C: [0, 0, "major"], G: [7, 1, "major"], D: [2, 2, "major"], A: [9, 3, "major"], F: [5, -1, "major"], Bb: [10, -2, "major"], Eb: [3, -3, "major"], Am: [9, 0, "minor"], Em: [4, 1, "minor"], Dm: [2, -1, "minor"], Gm: [7, -2, "minor"] };
const KNAME = k => k.replace("b", "♭").replace("m", " minor").replace(/^([A-G]♭?)$/, "$1 major");
// the letter of the tonic of a key (so that scale steps get consecutive letters)
const tonicLetter = k => LET.indexOf(k[0]);
// spell a pitch given the letter it should use: returns {letter, acc (−2..2), oct}
function spellAs(midi, letter) { const pc = ((midi % 12) + 12) % 12; let acc = pc - NAT[letter]; if (acc > 6) acc -= 12; if (acc < -6) acc += 12; const oct = Math.floor((midi - acc - NAT[letter]) / 12) - 1; return { letter, acc, oct, midi }; }
const accStr = a => ({ "-2": "𝄫", "-1": "♭", "0": "", "1": "♯", "2": "𝄪" })[a];
const noteName = s => LET[s.letter] + accStr(s.acc);
const freq = m => 440 * Math.pow(2, (m - 69) / 12);
// draw a grand stave (treble and bass) with a key signature; returns a function giving the y of a spelled note
function grandStave(c, x0, x1, y0, sp, key) {
  const trebleBottom = y0 + 4 * sp, bassTop = trebleBottom + 3 * sp, bassBottom = bassTop + 4 * sp;
  c.strokeStyle = "#8fa0bf"; c.lineWidth = 1; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(x0, y0 + i * sp); c.lineTo(x1, y0 + i * sp); c.stroke(); c.beginPath(); c.moveTo(x0, bassTop + i * sp); c.lineTo(x1, bassTop + i * sp); c.stroke(); }
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0, bassBottom); c.stroke();
  c.fillStyle = "#cfd8ea"; c.font = `${sp * 4.2}px serif`; c.textAlign = "left"; c.fillText("𝄞", x0 + 4, trebleBottom + sp * 0.6); c.font = `${sp * 3.2}px serif`; c.fillText("𝄢", x0 + 4, bassTop + sp * 2.6);
  // y from a diatonic position (letter + 7 × octave): treble bottom line = E4, bass bottom line = G2
  const yOf = s => { const pos = s.letter + 7 * s.oct; return pos >= 7 * 4 ? trebleBottom - (pos - (2 + 28)) * sp / 2 : bassBottom - (pos - (4 + 14)) * sp / 2; };
  const n = KEYS[key][1], sharps = [3, 0, 4, 1, 5, 2, 6], flats = [6, 2, 5, 1, 4, 0, 3], tOct = [5, 5, 5, 5, 4, 5, 4], fOct = [4, 5, 4, 5, 4, 5, 4];
  c.font = `${sp * 1.6}px serif`; for (let i = 0; i < Math.abs(n); i++) { const L = n > 0 ? sharps[i] : flats[i], o = n > 0 ? tOct[i] : fOct[i], x = x0 + sp * 3.6 + i * sp * 0.9; c.fillText(n > 0 ? "♯" : "♭", x, yOf({ letter: L, oct: o }) + sp * 0.5); c.fillText(n > 0 ? "♯" : "♭", x, yOf({ letter: L, oct: o - 2 }) + sp * 0.5); }
  return { yOf, startX: x0 + sp * 4 + Math.abs(n) * sp * 0.9 + sp, trebleBottom, bassTop, y0, bassBottom };
}
function noteHead(c, x, y, sp, col, stave, s, showAcc, stemUp) {
  // ledger lines: above the treble stave (A5 and up), middle C (C4), below the bass stave (E2 and down)
  c.strokeStyle = "#8fa0bf"; const pos = s.letter + 7 * s.oct, led = []; if (pos >= 40) for (let p = 40; p <= pos; p += 2) led.push(p); if (pos === 28) led.push(28); if (pos <= 16) for (let p = 16; p >= pos; p -= 2) led.push(p);
  for (const p of led) { const yy = stave.yOf({ letter: p % 7, oct: Math.floor(p / 7) }); c.beginPath(); c.moveTo(x - sp, yy); c.lineTo(x + sp, yy); c.stroke(); }
  c.fillStyle = col; c.beginPath(); c.ellipse(x, y, sp * 0.62, sp * 0.45, -0.35, 0, 6.3); c.fill();
  c.strokeStyle = col; c.beginPath(); if (stemUp) { c.moveTo(x + sp * 0.58, y); c.lineTo(x + sp * 0.58, y - 3.3 * sp); } else { c.moveTo(x - sp * 0.58, y); c.lineTo(x - sp * 0.58, y + 3.3 * sp); } c.stroke();
  if (showAcc) { c.fillStyle = col; c.font = `${sp * 1.6}px serif`; c.textAlign = "right"; c.fillText(accStr(s.acc) || "♮", x - sp * 0.8, y + sp * 0.5); c.textAlign = "left"; }
}
// sound: an organ-like tone through the kit's sound helper (switched on by the Play button)
async function soundOn() { if (!K.sound.on) await K.sound.enable(true); }
function organ(m, at, dur, vol = 0.09) { const f = freq(m); K.sound.tone(f, { at, dur, vol, type: "triangle", attack: 0.03 }); K.sound.tone(2 * f, { at, dur, vol: vol * 0.3, type: "sine", attack: 0.03 }); }

// ---------------- Chords ----------------
// each numeral: [scale degree (0 = tonic), semitones above the tonic for the root, chord intervals above the root]
const MAJ = [0, 4, 7], MIN = [0, 3, 7], DIM = [0, 3, 6], DOM7 = [0, 4, 7, 10], DIM7 = [0, 3, 6, 9];
function numerals(mode) { return mode === "major" ? { "I": [0, 0, MAJ], "ii": [1, 2, MIN], "iii": [2, 4, MIN], "IV": [3, 5, MAJ], "V": [4, 7, MAJ], "vi": [5, 9, MIN], "vii°": [6, 11, DIM], "V7": [4, 7, DOM7], "V/V": [1, 2, DOM7], "N6": [1, 1, MAJ], "vii°7": [6, 11, DIM7] }
  : { "i": [0, 0, MIN], "ii°": [1, 2, DIM], "III": [2, 3, MAJ], "iv": [3, 5, MIN], "V": [4, 7, MAJ], "VI": [5, 8, MAJ], "vii°": [6, 11, DIM], "V7": [4, 7, DOM7], "V/V": [1, 2, DOM7], "N6": [1, 1, MAJ], "vii°7": [6, 11, DIM7] }; }
const ADV = ["V/V", "N6", "vii°7"];
// the notes of a chord as pitch classes, with the letter each should be spelled with (stacked thirds)
function chordTones(key, num) { const [tpc, , mode] = KEYS[key], N = numerals(mode)[num], tl = tonicLetter(key), rootL = (tl + N[0]) % 7, root = (tpc + N[1]) % 12; return N[2].map((iv, j) => ({ pc: (root + iv) % 12, letter: (rootL + 2 * j) % 7, role: ["root", "third", "fifth", "seventh"][j] })); }
// a chord symbol in the progression: numeral + inversion letter
const parse = sym => { const m = sym.match(/^(.*?)([abcd]?)$/); return { num: m[1], inv: m[2] || "a" }; };
/* ---- Four-part voicing by search ----
   Each chord: every way to choose bass (the inversion note), tenor, alto and soprano in their ranges, using chord tones,
   with root and third present (and the seventh, if any), S ≥ A ≥ T ≥ B and no more than an octave between S–A and A–T.
   Then the path through the progression with the least total movement, plus heavy penalties for broken rules. */
const RANGE = { B: [40, 62], T: [48, 67], A: [55, 74], S: [60, 81] };
function voicings(key, sym) { const { num, inv } = parse(sym), T = chordTones(key, num), bassRole = { a: 0, b: 1, c: 2, d: 3 }[inv], bt = T[Math.min(bassRole, T.length - 1)], out = [];
  const opts = (lo, hi) => { const o = []; for (let m = lo; m <= hi; m++) { const t = T.find(q => q.pc === ((m % 12) + 12) % 12); if (t) o.push([m, t]); } return o; };
  const Bs = opts(...RANGE.B).filter(([, t]) => t === bt), Ts = opts(...RANGE.T), As = opts(...RANGE.A), Ss = opts(...RANGE.S);
  for (const b of Bs) for (const tn of Ts) { if (tn[0] < b[0]) continue; for (const a of As) { if (a[0] < tn[0] || a[0] - tn[0] > 12) continue; for (const s of Ss) { if (s[0] < a[0] || s[0] - a[0] > 12) continue;
    const roles = [b, tn, a, s].map(q => q[1].role); if (!roles.includes("root") || !roles.includes("third")) continue; if (T.length === 4 && !roles.includes("seventh")) continue; if (T.length === 4 && roles.filter(r => r === "seventh").length > 1) continue;
    out.push([b, tn, a, s].map(q => ({ m: q[0], t: q[1] }))); } } }
  return out; }
// rule checks between two chords (voices low to high: B T A S)
function faults(v1, v2, key) { const f = []; const names = ["bass", "tenor", "alto", "soprano"], lt = (KEYS[key][0] + 11) % 12;
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) { const a = (v1[j].m - v1[i].m) % 12, b = (v2[j].m - v2[i].m) % 12, moved = v1[i].m !== v2[i].m && v1[j].m !== v2[j].m;
    if (moved && a === 7 && b === 7) f.push(`consecutive 5ths (${names[i]} and ${names[j]})`); if (moved && a === 0 && b === 0) f.push(`consecutive octaves (${names[i]} and ${names[j]})`); }
  for (let i = 0; i < 3; i++) if (v2[i].m > v1[i + 1].m || v2[i + 1].m < v1[i].m) f.push(`overlap (${names[i]} and ${names[i + 1]})`);
  if ((v1[3].m % 12) === lt && v2.some(q => q.m % 12 === KEYS[key][0]) && v2[3].m !== v1[3].m + 1) f.push("leading note in the soprano does not rise to the tonic");
  return f; }
const doubledLT = (v, key) => v.filter(q => q.m % 12 === (KEYS[key][0] + 11) % 12).length > 1;
function voiceProgression(key, prog, random = null) {
  const C = prog.map(sym => voicings(key, sym)); if (C.some(c => !c.length)) return null;
  if (random) return C.map(c => c[random.int(c.length)]);
  // dynamic programming: best total cost to reach each voicing of each chord
  let cost = C[0].map(v => (doubledLT(v, key) ? 8 : 0) + Math.abs(v[3].m - 72) * 0.2), back = [];
  for (let k = 1; k < C.length; k++) { const nc = [], nb = []; for (const v of C[k]) { let best = Infinity, bi = 0; C[k - 1].forEach((u, i) => { const mv = u.reduce((s, q, j) => s + Math.abs(q.m - v[j].m), 0) - Math.abs(u[0].m - v[0].m) * 0.7, c = cost[i] + mv + 40 * faults(u, v, key).length + (doubledLT(v, key) ? 8 : 0); if (c < best) { best = c; bi = i; } }); nc.push(best); nb.push(bi); } cost = nc; back.push(nb); }
  let i = cost.indexOf(Math.min(...cost)); const path = [C[C.length - 1][i]]; for (let k = back.length - 1; k >= 0; k--) { i = back[k][i]; path.unshift(C[k][i]); } return path;
}
function cadence(prog, key) { if (prog.length < 2) return null; const a = parse(prog[prog.length - 2]).num, b = parse(prog[prog.length - 1]).num, tonic = KEYS[key][2] === "major" ? "I" : "i", sub = KEYS[key][2] === "major" ? "IV" : "iv", six = KEYS[key][2] === "major" ? "vi" : "VI";
  if ((a === "V" || a === "V7") && b === tonic) return ["Perfect cadence", "V–I: sounds finished, like a full stop"]; if (b === "V") return ["Imperfect cadence", "ending on V: sounds unfinished, like a comma"];
  if (a === sub && b === tonic) return ["Plagal cadence", "IV–I: the 'Amen' at the end of hymns"]; if ((a === "V" || a === "V7") && b === six) return ["Interrupted cadence", "V–vi: we expected I and got a surprise"]; return null; }
// ---- roughness (Plomp–Levelt, as Sethares): the 'clash' between all pairs of harmonics of the notes ----
function roughness(mids, cents = 0, r = null) { const P = []; for (const m of mids) { const f0 = freq(m) * Math.pow(2, (r ? cents * r.gauss() : 0) / 1200); for (let n = 1; n <= 6; n++) P.push([n * f0, Math.pow(0.88, n - 1)]); }
  let d = 0; for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) { const fl = Math.min(P[i][0], P[j][0]), df = Math.abs(P[i][0] - P[j][0]), s = 0.24 / (0.021 * fl + 19); d += P[i][1] * P[j][1] * (Math.exp(-3.5 * s * df) - Math.exp(-5.75 * s * df)); } return d; }
const TYPES = [["major", [60, 64, 67]], ["minor", [60, 63, 67]], ["diminished", [60, 63, 66]], ["augmented", [60, 64, 68]], ["dominant 7th", [60, 64, 67, 70]], ["diminished 7th", [60, 63, 66, 69]]];

const PRESETS = {
  perfect: { name: "Perfect cadence", key: "C", prog: ["I", "IV", "Ic", "V", "I"] }, imperfect: { name: "Imperfect cadence", key: "G", prog: ["I", "vi", "ii", "V"] },
  plagal: { name: "Plagal (Amen)", key: "F", prog: ["I", "V", "I", "IV", "I"] }, interrupted: { name: "Interrupted", key: "D", prog: ["I", "IV", "V7", "vi"] },
  pachelbel: { name: "Pachelbel's Canon", key: "D", prog: ["I", "V", "vi", "iii", "IV", "I", "IV", "V"] }, pop: { name: "Pop: I–V–vi–IV", key: "C", prog: ["I", "V", "vi", "IV", "I"] },
  minor: { name: "Minor key: i–iv–V–i", key: "Am", prog: ["i", "iv", "V", "i"] }, chromatic: { name: "Chromatic chords (A level)", key: "C", prog: ["I", "vi", "N6b", "V/V", "V7", "I"] }
};

// ---------------- The page ----------------
const DEF = { key: "C", prog: ["I", "IV", "Ic", "V", "I"], tempo: 70, autov: true, bass: true };
const P = Object.assign({}, DEF, { prog: DEF.prog.slice() }); let V = null, playing = -1, playT0 = 0, rnd = K.rng(3);
const ui = K.app({
  title: "Harmony, Chords and Cadences", subject: "Music",
  blurb: "Build chord progressions with Roman numerals, see them voiced in four parts on the stave, check the rules, name the cadences and hear them",
  sound: "Play the progression (the ▶ Play button switches sound on)",
  reset: () => set({}),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "Eduqas GCSE Music (C660): harmony and tonality: primary and secondary chords, perfect, imperfect, plagal and interrupted cadences, major and minor keys; reading staff notation in treble and bass clefs.", adv: "Eduqas A level Music (A660QS) Component 3, musical elements (harmony): diatonic chords and inversions, cadences, chord progressions and voice-leading in four-part harmony (no consecutive 5ths and octaves; resolution of the leading note), dominant 7ths and their resolution, secondary dominants, the Neapolitan sixth and diminished 7th chords, as found in the Western Classical Tradition (the development of the symphony)." } },
  missions: [
    { title: "Four cadences", q: "Play each preset ending: perfect, imperfect, plagal and interrupted. Describe how each one sounds.", hint: "Perfect (V–I) sounds complete. Imperfect (ending on V) sounds unfinished, like a question. Plagal (IV–I) is the gentle 'Amen'. Interrupted (V–vi) promises I but swerves to vi: a surprise.", setup() { load("perfect"); } },
    { title: "Primary chords", q: "Build I–IV–V–I in C major. Which notes are in each chord? Why are these three called primary chords?", hint: "I = C E G, IV = F A C, V = G B D. Together they use every note of the scale, so they can harmonise almost any melody in the key.", setup() { set({ key: "C", prog: ["I", "IV", "V", "I"] }); } },
    { title: "Pop's favourite four chords", q: "Load I–V–vi–IV. How many famous songs can you think of that use it?", hint: "Hundreds of pop songs use these four chords (in some order). Hearing harmony in Roman numerals lets you recognise the pattern in any key.", setup() { load("pop"); } },
    { lvl: "adv", title: "Breaking the rules", q: "Switch off automatic voicing and use random voicings. How many rule-breaks appear? Which are they?", hint: "Random four-part chords often move two parts in parallel 5ths or octaves (which makes them sound like one part), cross the parts or leave the leading note hanging. The automatic voicing searches for the smoothest path that avoids them.", setup() { set({ autov: false }); } },
    { lvl: "adv", title: "Inversions", q: "Compare I–IV–V–I with I–IVb–Ic–V–I. What happens to the bass line? Which chord is the cadential 6–4?", hint: "Inversions let the bass move by step instead of leaping. Ic before V (the cadential 6–4) is a common way to approach a perfect cadence in the Classical style.", setup() { set({ prog: ["I", "IVb", "Ic", "V", "I"] }); } },
    { lvl: "adv", title: "Chromatic colour", q: "Load the chromatic preset. Find the Neapolitan sixth and the secondary dominant (V of V). Which notes are outside the key?", hint: "The Neapolitan 6th is a major chord on the flattened 2nd (D♭ F A♭ in C), usually in first inversion before V. V/V (D F♯ A C in C) contains F♯, which leads up to G, the dominant: it 'tonicises' V.", setup() { load("chromatic"); } }
  ],
  batch: [
    { lvl: "adv", title: "Random voicings break rules", question: "If the four parts of each chord are chosen at random, how many rule-breaks appear?", how: "Random progressions of primary and secondary chords in C major; each chord voiced at random from all legal spacings.", xLabel: "chords in the progression", yLabel: "rule-breaks", xs: [2, 3, 4, 5, 6, 8], reps: 20, yMin: 0, run: (n, r) => { const prog = ["I"].concat(Array.from({ length: n - 1 }, () => r.pick(["ii", "IV", "V", "vi", "I", "V7"]))), V2 = voiceProgression("C", prog, r); let f = 0; for (let k = 1; k < V2.length; k++) f += faults(V2[k - 1], V2[k], "C").length; return f; }, note: "Each new chord adds about one rule-break when parts are chosen without care: that is why harmony is taught as voice leading, not only as chords." },
    { lvl: "adv", title: "Careful voicing: how far do the parts move?", question: "With the automatic (smoothest) voicing, how far do the four parts move in total for random 6-chord progressions?", how: "Random progressions in C major; total movement of all four parts in semitones.", yLabel: "total movement (semitones)", reps: 150, bins: 20, run: (x, r) => { const prog = ["I"].concat(Array.from({ length: 5 }, () => r.pick(["ii", "IV", "V", "vi", "I", "V7"]))), V2 = voiceProgression("C", prog); let mv = 0; for (let k = 1; k < V2.length; k++) for (let j = 0; j < 4; j++) mv += Math.abs(V2[k][j].m - V2[k - 1][j].m); return mv; }, note: "Upper parts mostly move by step or stay put (common notes kept); the bass leaps more." },
    { title: "How rough is each kind of chord?", question: "Which chords clash most? Roughness from the beating of the notes' harmonics.", how: "Each chord on middle C; a slightly out-of-tune performance (±5 cents). 1 major, 2 minor, 3 diminished, 4 augmented, 5 dominant 7th, 6 diminished 7th.", xLabel: "chord type", yLabel: "roughness (arbitrary units)", xs: [1, 2, 3, 4, 5, 6], reps: 8, yMin: 0, theory: i => roughness(TYPES[Math.round(i) - 1][1]), theoryLabel: "in tune", run: (i, r) => roughness(TYPES[i - 1][1], 5, r), note: "Major and minor triads are smoothest; diminished and 7th chords are rougher: they sound tense and want to resolve." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "GCSE", text: "Primary chords: I, IV and V (in C: C, F, G). Secondary chords: ii, iii, vi. Triads have a root, third and fifth." },
      { lvl: "std", tag: "GCSE", text: "Cadences: perfect (V–I, finished), imperfect (ending on V, unfinished), plagal (IV–I, 'Amen'), interrupted (V–vi, surprise)." },
      { lvl: "adv", tag: "A660 harmony", text: "Inversions: a (root position), b (third in the bass), c (fifth in the bass). Ic–V–I: the cadential 6–4. V7: the seventh falls by step and the leading note rises." },
      { lvl: "adv", tag: "A660 harmony", text: "Voice leading: avoid consecutive 5ths and octaves, overlapping and crossing; keep common notes; move upper parts by step where possible; do not double the leading note." },
      { lvl: "adv", tag: "A660 harmony", text: "Chromatic chords: secondary dominants (V/V), the Neapolitan 6th (♭II in first inversion), diminished 7ths, augmented 6ths: colour and tension in Romantic harmony." }
    ],
    questions: [
      { lvl: "std", marks: 2, q: () => `Name the cadence at the end of this progression: ${P.prog.join(" – ")}.`, ans: () => { const c = cadence(P.prog, P.key); return c ? `<ul><li>${c[0]}</li><li>${c[1]}</li></ul>` : "<ul><li>not one of the four standard cadences</li></ul>"; } },
      { lvl: "std", marks: 3, q: () => `Name the notes of chords I, IV and V in ${KNAME(P.key)}.`, ans: () => { const [t, , mode] = KEYS[P.key], nm = mode === "major" ? ["I", "IV", "V"] : ["i", "iv", "V"]; return "<ul>" + nm.map(n => `<li>${n}: ${chordTones(P.key, n).map(q => noteName(spellAs(60 + q.pc, q.letter))).join(" ")}</li>`).join("") + "</ul>"; } },
      { lvl: "adv", marks: 2, q: "Explain why consecutive fifths are avoided in four-part harmony.", ans: "<ul><li>two parts a fifth (or octave) apart moving in parallel sound like one part, thickening it</li><li>so the parts lose their independence</li></ul>" }
    ]
  },
  notes: `<h3>How it works</h3>
<ul><li>Each Roman numeral is a chord built in thirds on a scale degree of the key (harmonic minor in minor keys, so V is major). Notes are spelled from stacked thirds, so chromatic chords are spelled correctly (D♭ F A♭ for the Neapolitan in C).</li>
<li><b>Voicing:</b> every possible four-part chord is listed (bass in the inversion, tenor C3–G4, alto G3–D5, soprano C4–A5; root and third present; no more than an octave between soprano and alto, alto and tenor). A dynamic-programming search then finds the path with least total movement of the upper parts, adding a large penalty for consecutive 5ths or octaves, overlaps and an unresolved leading note, and a small one for a doubled leading note.</li>
<li><b>Roughness</b> (the batch run) uses Plomp and Levelt's curve for each pair of harmonics (as in Sethares), with six harmonics per note.</li></ul>
<h3>Simplifications</h3><ul><li>Rules are a teaching set; composers broke them on purpose. Augmented sixths, suspensions and pedals are described in Revise but not built here.</li><li>The sound is a simple organ-like tone.</li></ul>`
});

// ---------------- Controls ----------------
const ctl = {}; let g = ui.group("Key and progression");
ctl.key = K.seg(g, { label: "Key", value: "C", options: Object.keys(KEYS).map(k => [k, k.replace("b", "♭")]), on: v => { const was = KEYS[P.key][2]; P.key = v; if (KEYS[v][2] !== was) P.prog = KEYS[v][2] === "major" ? ["I", "IV", "V", "I"] : ["i", "iv", "V", "i"]; revoice(); syncPad(); } });
const pad = K.$("div"); pad.style.cssText = "display:flex;flex-wrap:wrap;gap:4px;margin:6px 0"; g.append(pad);
const invRow = K.seg(g, { label: "Next chord's inversion", value: "a", options: [["a", "a (root)"], ["b", "b (1st)"], ["c", "c (2nd)"]], on: () => { } });
let rr = K.row(g); K.btn(rr, "⌫ Remove last", () => { P.prog.pop(); revoice(); }); K.btn(rr, "✕ Clear", () => { P.prog = []; revoice(); });
g = ui.group("Presets"); const pre = K.$("div"); pre.style.cssText = "display:flex;flex-wrap:wrap;gap:4px"; g.append(pre); for (const k in PRESETS) K.btn(pre, PRESETS[k].name, () => load(k), "small");
g = ui.group("Play");
ctl.tempo = K.slider(g, { label: "Tempo", min: 40, max: 140, step: 5, value: 70, unit: "bpm", on: v => P.tempo = v });
ctl.autov = K.toggle(g, { label: "Automatic (smooth) voicing", value: true, on: v => { P.autov = v; revoice(); } });
rr = K.row(g); K.btn(rr, "▶ Play", () => play(), "primary"); K.btn(rr, "■ Stop", () => { K.sound.stop(); playing = -1; }); K.btn(rr, "🎲 New random voicing", () => { rnd = K.rng(Date.now() % 9999); revoice(); });
const read = K.readout(ui.group("Analysis"), [["c", "cadence"], ["f", "rule-breaks"], ["m", "movement of the parts"], ["r", "roughness of the last chord"]]);
function syncPad() { pad.innerHTML = ""; const N = numerals(KEYS[P.key][2]); for (const n in N) { if (ADV.includes(n) && ui.level !== "adv") continue; K.btn(pad, n, () => { if (P.prog.length < 10) { P.prog.push(n + (invRow.value === "a" ? "" : invRow.value)); revoice(); } }, "small"); } }
function sync() { ctl.key.set(P.key); ctl.tempo.set(P.tempo); ctl.autov.set(P.autov); syncPad(); const adv = ui.level === "adv"; ctl.autov.el.style.display = adv ? "" : "none"; invRow.el.style.display = adv ? "" : "none"; }
function set(o) { Object.assign(P, DEF, { prog: DEF.prog.slice() }, o); if (o.prog) P.prog = o.prog.slice(); sync(); revoice(); }
function load(k) { const p = PRESETS[k]; set({ key: p.key, prog: p.prog.slice() }); }
function revoice() { V = P.prog.length ? voiceProgression(P.key, P.prog, P.autov ? null : rnd) : []; playing = -1; }
async function play() { if (!V || !V.length) return; await soundOn(); K.sound.stop(); const beat = 60 / P.tempo * 2; V.forEach((ch, k) => ch.forEach(q => organ(q.m, k * beat, beat * 0.95, 0.07))); playing = 0; playT0 = performance.now(); }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
const VCOL = ["#5ad1ff", "#7ee787", "#ffb454", "#ff7b9c"];   // bass, tenor, alto, soprano
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h, adv = ui.level === "adv"; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h);
  const sp = Math.min(11, (h - 150) / 22), st = grandStave(c, 30, w - 30, 70, sp, P.key);
  TX(c, `${KNAME(P.key)}: ${P.prog.length ? P.prog.join(" – ") : "(add chords with the buttons)"}`, 30, 34, "#eef2f8", "left", "600 15px");
  if (!V) { TX(c, "No four-part voicing found for this chord in this key.", 30, h - 30, "#ff6b81", "left", "12px"); return; }
  const n = V.length, dx = n ? Math.min(110, (w - 60 - st.startX) / n) : 100, beat = 60 / P.tempo * 2, now = playing >= 0 ? Math.floor((performance.now() - playT0) / 1000 / beat) : -1; if (now >= n) playing = -1;
  const tl = tonicLetter(P.key), N = numerals(KEYS[P.key][2]);
  V.forEach((ch, k) => { const x = st.startX + dx * (k + 0.5), { num } = parse(P.prog[k]), T = chordTones(P.key, num);
    if (k === now) { c.fillStyle = "rgba(255,209,102,.12)"; c.fillRect(x - dx / 2, st.y0 - 20, dx, st.bassBottom - st.y0 + 40); }
    ch.forEach((q, j) => { const s = spellAs(q.m, q.t.letter), y = st.yOf(s), kAcc = keyAcc(P.key, s.letter); noteHead(c, x + (j % 2 ? 4 : -4), y, sp, VCOL[j], st, s, s.acc !== kAcc, j % 2 === 1); });
    TX(c, P.prog[k], x, st.bassBottom + 34, "#eef2f8", "center", "600 14px"); TX(c, T.map(q => noteName(spellAs(60 + q.pc, q.letter))).join(" "), x, st.bassBottom + 52, "#8fa0bf", "center", "11px");
    if (k > 0 && adv) { const f = faults(V[k - 1], ch, P.key); if (f.length) { c.fillStyle = "#ff6b81"; c.beginPath(); c.arc(x - dx / 2, st.y0 - 26, 7, 0, 6.3); c.fill(); TX(c, f.length + "", x - dx / 2, st.y0 - 22, "#0b1020", "center", "600 10px"); } } });
  const cad = cadence(P.prog, P.key); if (cad) { const x = st.startX + dx * (n - 1); c.strokeStyle = "#ffd166"; c.beginPath(); c.moveTo(x - dx / 2 + 6, st.bassBottom + 62); c.lineTo(x + dx * 1.5 - 6, st.bassBottom + 62); c.stroke(); TX(c, cad[0], x + dx / 2, st.bassBottom + 78, "#ffd166", "center", "600 12.5px"); }
  [3, 2, 1, 0].forEach((j, i) => { const x = w - 300 + i * 70; c.fillStyle = VCOL[j]; c.fillRect(x, 25, 10, 10); TX(c, ["bass", "tenor", "alto", "soprano"][j], x + 14, 34, "#cfd8ea", "left", "11.5px"); });
  ui.hud("");
}
// accidental implied by the key signature for a letter
function keyAcc(key, letter) { const n = KEYS[key][1], sharps = [3, 0, 4, 1, 5, 2, 6], flats = [6, 2, 5, 1, 4, 0, 3]; if (n > 0 && sharps.slice(0, n).includes(letter)) return 1; if (n < 0 && flats.slice(0, -n).includes(letter)) return -1; return 0; }
function charts() { if (!V) return; const n = V.length;
  const rough = V.map((ch, k) => [k + 1, roughness(ch.map(q => q.m))]); chA.opts.title = "Tension of each chord (roughness)"; chA.opts.xLabel = "chord"; chA.opts.yLabel = "roughness"; chA.opts.xFmt = v => Math.abs(v - Math.round(v)) < 0.01 ? (P.prog[Math.round(v) - 1] || "") : "";
  chA.draw([{ pts: rough, type: "bars", w: 0.6, color: "#c4a1ff", label: "" }], { xMin: 0.4, xMax: Math.max(1, n) + 0.6, yMin: 0 });
  const mv = []; for (let k = 1; k < n; k++) for (let j = 0; j < 4; j++) mv.push({ k, j, d: V[k][j].m - V[k - 1][j].m });
  chB.opts.title = "How each part moves (semitones)"; chB.opts.xLabel = "change"; chB.opts.yLabel = "semitones"; chB.opts.xFmt = null; chB.draw([0, 1, 2, 3].map(j => ({ pts: mv.filter(q => q.j === j).map(q => [q.k + (j - 1.5) * 0.12, q.d]), type: "bars", w: 0.1, color: VCOL[j], label: ["bass", "tenor", "alto", "soprano"][j] })), { xMin: 0.4, xMax: Math.max(1, n - 1) + 0.6 });
  let f = 0; for (let k = 1; k < n; k++) f += faults(V[k - 1], V[k], P.key).length; const cad = cadence(P.prog, P.key);
  read.set("c", cad ? cad[0] : "–"); read.set("f", ui.level === "adv" ? String(f) : "A level"); read.set("m", mv.reduce((s, q) => s + Math.abs(q.d), 0) + " semitones"); read.set("r", n ? rough[n - 1][1].toFixed(2) : "–");
}
let frame = 0;
ui.onLevel = () => sync();
ui.run(() => { }, () => { draw(); if (frame++ % 10 === 0) charts(); });
set({});
ui.tip("Click Roman numerals to build a progression, then ▶ Play. The cadence at the end is named under the stave.", 7000);
