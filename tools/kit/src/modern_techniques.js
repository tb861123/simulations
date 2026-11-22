/* =====================================================================
   TWENTIETH-CENTURY TECHNIQUES: SERIALISM AND MINIMALISM
   SERIALISM (Schoenberg, Berg, Webern, from the 1920s): all twelve notes
   of the chromatic scale are put in an order, the TONE ROW, and used in
   turn, so no note becomes a home note (atonal). The row can be played
   forwards (PRIME, P), backwards (RETROGRADE, R), upside down (INVERSION,
   I: every interval goes the other way) and backwards upside down (RI),
   starting on any of the 12 notes: 48 forms, shown in a 12 × 12 MATRIX.
   MINIMALISM (Reich, Glass, Riley, from the 1960s): short repeated cells
   that change very slowly:
     PHASING (Steve Reich, 'Piano Phase', 1967): two players play the
       same 12-note pattern; one plays very slightly faster, so the parts
       drift apart note by note and new patterns emerge between them,
       until they line up again a whole pattern later.
     ADDITIVE PROCESS (Philip Glass): a cell grows one note at a time
       (1, 1 2, 1 2 3 …) and then shrinks again.
   ===================================================================== */
const NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
const freq = m => 440 * Math.pow(2, (m - 69) / 12);
async function soundOn() { if (!K.sound.on) await K.sound.enable(true); }
const tone = (m, at, dur, vol = 0.12, type = "triangle") => K.sound.tone(freq(m), { at, dur, vol, type, attack: 0.01 });
// ---- tone rows ----
const ROWS = { schoenberg: ["Schoenberg: Suite, Op. 25", [4, 5, 7, 1, 6, 3, 8, 2, 11, 0, 9, 10]], berg: ["Berg: Violin Concerto", [7, 10, 2, 6, 9, 0, 4, 8, 11, 1, 3, 5]], webern: ["Webern: Symphony, Op. 21", [9, 6, 7, 8, 4, 5, 11, 10, 2, 1, 0, 3]], chromatic: ["The chromatic scale (not a good row!)", [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]] };
// the matrix: row i is the prime form starting on the i-th note of the inversion; columns read down give the inversions
function matrix(row) { const p0 = row.map(x => (x - row[0] + 12) % 12), inv = p0.map(x => (12 - x) % 12); return inv.map(s => p0.map(x => (x + s + row[0]) % 12)); }
const forms = (row, which, n = 0) => { const M = matrix(row); if (which === "P") return M[n]; if (which === "R") return M[n].slice().reverse(); if (which === "I") return M.map(r => r[n]); return M.map(r => r[n]).reverse(); };
const intervals = row => row.slice(1).map((x, i) => (x - row[i] + 12) % 12);
const randRow = r => { const a = [...Array(12).keys()]; for (let i = 11; i > 0; i--) { const j = r.int(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
// entropy (bits) of the pitch-class distribution: 3.585 = all twelve equally often
function entropy(notes) { const h = new Array(12).fill(0); notes.forEach(m => h[((m % 12) + 12) % 12]++); let e = 0; for (const c of h) if (c) { const p = c / notes.length; e -= p * Math.log2(p); } return e; }
const tonalTune = (n, r) => { const sc = [0, 2, 4, 5, 7, 9, 11], out = []; let d = 0; for (let i = 0; i < n; i++) { out.push(60 + sc[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7)); if ([0, 2, 4].includes(((d % 7) + 7) % 7) && r() < 0.3) continue; d += r() < 0.5 ? 1 : -1; } return out; };
// ---- phasing ----
const PIANO_PHASE = [64, 66, 71, 73, 74, 66, 64, 73, 71, 66, 74, 73];          // Reich's 12-note pattern: E F♯ B C♯ D F♯ E C♯ B F♯ D C♯
// how far player 2 has drifted ahead (in notes) after t seconds; 'note' = seconds per note of player 1, d = fraction faster
const drift = (t, note, d) => t / note * d;
// time (in patterns of player 1) until the parts line up again, with a human player's tempo wobbling by sd (fraction)
function realign(d, sd, r) { let off = 0, k = 0; while (off < 12 && k < 1e5) { off += 12 * d * (1 + sd * r.gauss() / Math.max(1e-6, d)); k++; } return k; }
// share of moments where both players strike the same note at the offset 'o' (whole notes)
const unison = o => { let s = 0; for (let i = 0; i < 12; i++) if (PIANO_PHASE[i] === PIANO_PHASE[(i + o) % 12]) s++; return s / 12; };
// ---- additive process: cell grows 1, 1–2, 1–2–3 … then shrinks ----
function additive(cell) { const out = []; for (let n = 1; n <= cell.length; n++) for (let k = 0; k < 2; k++) out.push(...cell.slice(0, n)); for (let n = cell.length - 1; n >= 1; n--) for (let k = 0; k < 2; k++) out.push(...cell.slice(0, n)); return out; }
const GLASS = [69, 72, 76, 79, 77, 74];

// ---------------- The page ----------------
const DEF = { view: "row", row: "berg", which: "P", n: 0, d: 0.02, tempo: 160 };
const P = Object.assign({}, DEF); let row = ROWS.berg[1].slice(), t = 0, playing = false, play0 = 0, seed = 1;
const ui = K.app({
  title: "Twentieth-Century Techniques", subject: "Music",
  blurb: "Tone rows and their 48 forms in a 12 × 12 matrix, Steve Reich's phasing, and Philip Glass's additive process: build them, see them and hear them",
  sound: "Play rows and patterns (the ▶ buttons switch sound on)",
  reset: () => set({ view: P.view }),
  levels: { std: "Standard (GCSE)", adv: "Advanced (A level)", specs: { std: "Eduqas GCSE Music (C660): musical forms and devices including ostinato, repetition, sequence and minimalist techniques (phasing, layering, additive and subtractive melody), and how 20th-century composers move away from major and minor keys.", adv: "Eduqas A level Music (A660QS) Component 3, Area of study E (Into the twentieth century) and F (Into the twenty-first century): atonality and serialism (tone rows, prime, retrograde, inversion and retrograde inversion, the matrix), minimalism (phasing, additive process, ostinato, metamorphosis, layering), and how they reject or extend tonality." } },
  missions: [
    { title: "Phasing", q: "Phasing. Player 2 plays 2% faster. Watch the offset grow and listen: what new patterns appear between the parts?", hint: "As player 2 creeps ahead one note at a time, the two lines make a different combined pattern at each offset. After 12 notes of drift (here 50 patterns) they line up again: Reich's 'Piano Phase'.", setup() { set({ view: "phase", d: 0.02 }); } },
    { title: "Additive process", q: "Additive process. Count the notes in each repeat. How does the music grow and shrink?", hint: "1, 1 2, 1 2 3 … up to the whole cell, each played twice, then back down. The change is gradual and predictable: a process you can hear happening.", setup() { set({ view: "add" }); } },
    { lvl: "adv", title: "A tone row", q: "Tone rows. Play the prime form of Berg's row, then its retrograde. Is there a home note? Look at the pitch-class chart.", hint: "Each of the twelve notes appears once, so none dominates: no tonic, atonal. Berg's row is built from thirds, so it contains major and minor triads: serial music can still hint at tonality.", setup() { set({ view: "row", row: "berg", which: "P" }); } },
    { lvl: "adv", title: "Inversion", q: "Play P0 then I0. What happens to each interval? Find I0 in the matrix.", hint: "In the inversion every interval goes the opposite way: up a semitone becomes down a semitone. In the matrix, rows read left to right are prime forms; columns read down are inversions; reading backwards gives R and RI.", setup() { set({ view: "row", row: "schoenberg", which: "I" }); } },
    { lvl: "adv", title: "Webern's symmetry", q: "Look at Webern's row: compare the second half with the first. What do you notice about its retrograde?", hint: "Webern's Op. 21 row is a palindrome in intervals: the retrograde is a transposition of the prime, so there are only 24 different forms instead of 48. Webern loved symmetry.", setup() { set({ view: "row", row: "webern", which: "R" }); } }
  ],
  batch: [
    { lvl: "adv", title: "Tonal or atonal: how even are the notes?", question: "How evenly are the 12 pitch classes used in a tonal tune and in a serial one?", how: "48 notes each: 1 = a tune in C major, 2 = four forms of a random tone row. Evenness = entropy (bits): 3.58 means all twelve equally often.", xLabel: "1 tonal, 2 serial", yLabel: "entropy (bits)", xs: [1, 2], reps: 20, yMin: 0, yMax: 3.8, run: (i, r) => i === 1 ? entropy(tonalTune(48, r)) : entropy([...forms(randRow(r), "P"), ...forms(randRow(r), "R"), ...forms(randRow(r), "I"), ...forms(randRow(r), "RI")]), note: "The tonal tune uses only seven notes, unevenly (tonic and dominant most): about 2.6 bits. Serial music uses all twelve equally: the full 3.58 bits, so no note can sound like home." },
    { title: "Phasing: how long until the parts line up?", question: "How many repeats of the pattern pass before player 2 has drifted a whole pattern ahead and the parts line up again?", how: "Player 2 is faster by the percentage shown, with a human tempo wobble of ±0.2% from pattern to pattern.", xLabel: "player 2 faster by (%)", yLabel: "patterns until aligned", xs: [0.5, 1, 2, 3, 5], reps: 10, yMin: 0, theory: d => Math.ceil(100 / d), theoryLabel: "100 ÷ percentage", run: (d, r) => realign(d / 100, 0.002, r), note: "Halve the difference, double the time. Reich's players drift by feel; small wobbles make each realignment a little different." },
    { lvl: "adv", title: "Intervals in a random row", question: "How many different interval sizes (1 to 11 semitones) does a random tone row use?", how: "500 random rows; the 11 intervals between successive notes.", yLabel: "different intervals used", reps: 500, bins: 10, run: (x, r) => new Set(intervals(randRow(r))).size, note: "Usually 6–8 of the 11 possible. 'All-interval' rows (using every interval once, like the row of Berg's Lyric Suite) are very rare: composers construct them on purpose." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "GCSE", text: "Minimalism: short repeated patterns (ostinato, cells) changing gradually: phasing (parts drifting apart), additive and subtractive melody, layering, a steady pulse; Reich, Glass, Riley, Adams." },
      { lvl: "std", tag: "GCSE", text: "In the 20th century many composers moved away from major and minor keys: atonal music has no home note; serialism orders all 12 notes in a row." },
      { lvl: "adv", tag: "A660 AoS E", text: "Serialism (Second Viennese School): tone row; prime, retrograde, inversion, retrograde inversion, each transposable: 48 forms in a 12 × 12 matrix. Notes are usually used in turn, so all 12 are equally important." },
      { lvl: "adv", tag: "A660 AoS F", text: "Minimalism: phasing (Reich, 'Piano Phase', 'Clapping Music'), additive process (Glass, 'Einstein on the Beach'), metamorphosis, process music; often diatonic and consonant but static in harmony." },
      { lvl: "adv", tag: "A660", text: "Other 20th-century techniques: whole-tone and modal scales (Debussy), polytonality and polyrhythm (Stravinsky), aleatoric (chance) music (Cage), tone clusters, extended techniques." }
    ],
    questions: [
      { lvl: "adv", marks: 2, q: () => `The prime form of a row begins ${row.slice(0, 4).map(x => NAMES[x]).join(" ")}. Give the first four notes of its inversion starting on the same note.`, ans: () => `<ul><li>reverse the direction of each interval</li><li>${forms(row, "I", 0).slice(0, 4).map(x => NAMES[x]).join(" ")}</li></ul>` },
      { lvl: "std", marks: 3, q: "Describe how Steve Reich uses phasing in 'Piano Phase'.", ans: "<ul><li>two pianists play the same repeating 12-note pattern in unison</li><li>one speeds up very slightly until it is one note ahead, then holds the new position</li><li>the process repeats, creating new combined patterns, until they are back in unison</li></ul>" },
      { lvl: "adv", marks: 3, q: "Explain why serial music sounds atonal.", ans: "<ul><li>all twelve pitch classes are used equally, in turn</li><li>so no note is emphasised as a tonic</li><li>there are no functional chord progressions or cadences to establish a key</li></ul>" }
    ]
  },
  notes: `<h3>How it works</h3>
<ul><li><b>Matrix:</b> the prime row P0 runs along the top; the first column is its inversion I0 (each interval reversed). Row i is the prime form transposed to start on the i-th note of I0. Read rows left to right for P, right to left for R, columns down for I, up for RI.</li>
<li><b>Phasing:</b> player 1 plays the 12-note pattern at a steady speed; player 2 is faster by d, so after time t it is t × d ÷ (note length) notes ahead. Unison moments are where both play the same note at once.</li>
<li><b>Additive process:</b> the cell is played as its first 1, 2, 3 … notes, each twice, then shrinks.</li>
<li><b>Evenness:</b> the entropy of the pitch-class distribution, −Σ p log₂ p, with a maximum of log₂ 12 = 3.58 bits.</li></ul>
<h3>Simplifications</h3><ul><li>Real phasing is done by feel in steps (the players lock into each new offset for a while); here the drift is smooth.</li><li>The rows are the published ones; registers and rhythms are chosen here.</li></ul>`
});

// ---------------- Controls ----------------
const ctl = {}; let g = ui.group("View");
ctl.view = K.seg(g, { value: "row", options: [["row", "🔢 Tone row (A level)"], ["phase", "🌀 Phasing"], ["add", "➕ Additive process"]], on: v => set({ view: v }) });
const gp = {}; gp.row = g = ui.group("Tone row");
ctl.row = K.seg(g, { label: "Row", value: "berg", options: Object.entries(ROWS).map(([k, r2]) => [k, r2[0]]).concat([["random", "🎲 Random row"]]), on: v => { P.row = v; row = v === "random" ? randRow(K.rng(++seed)) : ROWS[v][1].slice(); stopAll(); } });
ctl.which = K.seg(g, { label: "Form", value: "P", options: [["P", "Prime"], ["R", "Retrograde"], ["I", "Inversion"], ["RI", "Retrograde inversion"]], on: v => { P.which = v; stopAll(); } });
ctl.n = K.slider(g, { label: "Transposition (starting note)", min: 0, max: 11, step: 1, value: 0, fmt: v => v + "", on: v => { P.n = v; stopAll(); } });
gp.phase = g = ui.group("Phasing");
ctl.d = K.slider(g, { label: "Player 2 faster by", min: 0, max: 0.06, step: 0.0025, value: 0.02, fmt: v => (v * 100).toFixed(2) + "%", on: v => { P.d = v; t = 0; } });
gp.add = ui.group("Additive process");
g = ui.group("Play"); ctl.tempo = K.slider(g, { label: "Notes per minute", min: 80, max: 400, step: 10, value: 160, on: v => P.tempo = v });
let rr = K.row(g); K.btn(rr, "▶ Play", () => play(), "primary"); K.btn(rr, "■ Stop", () => stopAll());
const read = K.readout(ui.group("Readings"), [["a", "–"], ["b", "–"], ["c", "–"], ["d", "–"]]);
const label = (i, s) => { read.el.children[i].firstElementChild.textContent = s; };
function sync() { ctl.view.set(P.view); for (const q in gp) gp[q].style.display = q === P.view ? "" : "none"; ctl.row.set(P.row); ctl.which.set(P.which); ctl.n.set(P.n); ctl.d.set(P.d); ctl.tempo.set(P.tempo); ctl.view.el.querySelectorAll("button")[0].style.display = ui.level === "adv" ? "" : "none"; }
function set(o) { Object.assign(P, DEF, o); if (ui.level !== "adv" && P.view === "row") P.view = "phase"; row = P.row === "random" ? randRow(K.rng(seed)) : ROWS[P.row][1].slice(); sync(); stopAll(); t = 0; }
function stopAll() { if (K.sound.on) K.sound.stop(); playing = false; }
const current = () => forms(row, P.which, P.n);
async function play() { await soundOn(); K.sound.stop(); const dt = 60 / P.tempo; play0 = performance.now(); playing = true; t = 0;
  if (P.view === "row") current().forEach((pc, i) => tone(60 + pc, i * dt, dt * 0.9, 0.14));
  else if (P.view === "add") additive(GLASS).forEach((m, i) => tone(m, i * dt * 0.6, dt * 0.55, 0.12));
  else { const total = 40; for (let i = 0; i * dt < total; i++) tone(PIANO_PHASE[i % 12], i * dt, dt * 0.9, 0.09); for (let i = 0; i * dt / (1 + P.d) < total; i++) tone(PIANO_PHASE[i % 12], i * dt / (1 + P.d), dt * 0.9, 0.09, "sine"); } }

// ---------------- Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#aab6cc", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1020"; c.fillRect(0, 0, w, h); const dt = 60 / P.tempo, el = t;
  if (P.view === "row") { const M = matrix(row), cs = Math.min(30, (h - 90) / 13), x0 = 60, y0 = 70, cur = current(), idx = playing ? Math.floor(el / dt) : -1;
    TX(c, `${P.row === "random" ? "A random row" : ROWS[P.row][0]}: the 12 × 12 matrix`, 24, 32, "#eef2f8", "left", "600 15px");
    for (let i = 0; i < 12; i++) { TX(c, "P" + ((M[i][0] - row[0] + 12) % 12), x0 - 8, y0 + i * cs + cs * 0.65, "#8fa0bf", "right", "10.5px"); TX(c, "I" + ((M[0][i] - row[0] + 12) % 12), x0 + i * cs + cs / 2, y0 - 6, "#8fa0bf", "center", "10.5px");
      for (let j = 0; j < 12; j++) { const pc = M[i][j]; let on = false; if (P.which === "P" && i === P.n) on = true; if (P.which === "R" && i === P.n) on = true; if ((P.which === "I" || P.which === "RI") && j === P.n) on = true;
        const k = P.which === "P" ? j : P.which === "R" ? 11 - j : P.which === "I" ? i : 11 - i, lit = on && k === idx; c.fillStyle = lit ? "#ffd166" : on ? "rgba(90,209,255,.3)" : "#16203a"; c.fillRect(x0 + j * cs + 1, y0 + i * cs + 1, cs - 2, cs - 2); TX(c, NAMES[pc], x0 + j * cs + cs / 2, y0 + i * cs + cs * 0.65, lit ? "#0b1020" : "#eef2f8", "center", `${Math.max(9, cs * 0.38)}px`); } }
    const tx = x0 + 12 * cs + 30; let ty = 80; TX(c, `${{ P: "Prime", R: "Retrograde", I: "Inversion", RI: "Retrograde inversion" }[P.which]} ${P.which}${P.n}:`, tx, ty, "#eef2f8", "left", "600 13px"); ty += 22; TX(c, cur.map(x => NAMES[x]).join(" "), tx, ty, "#ffd166", "left", "600 14px"); ty += 30;
    TX(c, "Intervals (semitones up):", tx, ty, "#aab6cc", "left", "12px"); ty += 18; TX(c, intervals(cur).join(" "), tx, ty, "#cfd8ea", "left", "13px"); ty += 30;
    TX(c, "Rows read →: prime (P)   ← : retrograde (R)", tx, ty, "#8fa0bf", "left", "11.5px"); ty += 16; TX(c, "Columns read ↓: inversion (I)   ↑ : retrograde inversion (RI)", tx, ty, "#8fa0bf", "left", "11.5px");
  } else if (P.view === "phase") { const off = drift(el, dt, P.d), whole = Math.floor(off) % 12, frac = off - Math.floor(off);
    TX(c, "Phasing: Reich's 'Piano Phase' pattern", 24, 32, "#eef2f8", "left", "600 15px");
    // two clocks: each dot is a note of the pattern; the hand shows where each player is
    const draw12 = (cx, cy, R, pos, col, lab) => { for (let i = 0; i < 12; i++) { const a = -Math.PI / 2 + i * Math.PI / 6, x = cx + R * Math.cos(a), y = cy + R * Math.sin(a); c.fillStyle = Math.floor(pos) % 12 === i ? col : "#2a3550"; c.beginPath(); c.arc(x, y, 14, 0, 6.3); c.fill(); TX(c, NAMES[PIANO_PHASE[i] % 12], x, y + 4, Math.floor(pos) % 12 === i ? "#0b1020" : "#cfd8ea", "center", "11px"); } TX(c, lab, cx, cy + 4, col, "center", "600 13px"); };
    const pos1 = el / dt, pos2 = el / dt * (1 + P.d); draw12(w * 0.22, h * 0.5, Math.min(110, h * 0.3), pos1, "#5ad1ff", "player 1"); draw12(w * 0.52, h * 0.5, Math.min(110, h * 0.3), pos2, "#ffb454", "player 2");
    const tx = w * 0.7; let ty = 90; TX(c, `Player 2 is ${off.toFixed(2)} notes ahead`, tx, ty, "#ffd166", "left", "600 14px"); ty += 24; TX(c, `in the ${(whole + 1)}${["st", "nd", "rd"][whole] || "th"} phase position (${whole} notes ahead)`, tx, ty, "#cfd8ea", "left", "12.5px"); ty += 22;
    TX(c, `back in unison after ${Math.ceil(1 / Math.max(1e-9, P.d))} patterns`, tx, ty, "#aab6cc", "left", "12.5px"); ty += 22; TX(c, `same note together ${(100 * unison(whole)).toFixed(0)}% of the time at this offset`, tx, ty, "#aab6cc", "left", "12.5px");
    if (!playing) TX(c, "Press ▶ Play to hear it (40 seconds)", tx, ty + 30, "#8fa0bf", "left", "12px");
  } else { const seq = additive(GLASS), idx = playing ? Math.floor(el / (dt * 0.6)) : -1; TX(c, "Additive process (in the style of Philip Glass)", 24, 32, "#eef2f8", "left", "600 15px");
    let x = 24, y = 70, n = 0; const sz = 16; let grp = 1, cnt = 0; const groups = []; for (let len = 1; len <= GLASS.length; len++) groups.push(len, len); for (let len = GLASS.length - 1; len >= 1; len--) groups.push(len, len);
    for (const L of groups) { if (x + L * sz > w - 30) { x = 24; y += sz + 10; } for (let k = 0; k < L; k++) { c.fillStyle = n === idx ? "#ffd166" : `hsl(${200 + k * 25},60%,${45 + k * 4}%)`; c.fillRect(x, y, sz - 2, sz - 2); x += sz; n++; } x += 10; }
    TX(c, `the cell: ${GLASS.map(m => NAMES[m % 12]).join(" ")}. Each block is one note; colour shows its place in the cell.`, 24, h - 20, "#aab6cc", "left", "12px"); }
  ui.hud("");
}
function charts() { chA.opts.xFmt = null; chB.opts.xFmt = null; const whole = v => Math.abs(v - Math.round(v)) < 0.01;
  if (P.view === "row") { const cur = current(), h = new Array(12).fill(0); cur.forEach(x => h[x]++); const tn = tonalTune(48, K.rng(3)), ht = new Array(12).fill(0); tn.forEach(m => ht[m % 12]++);
    chA.opts.title = "Pitch classes: this row against a tonal tune (÷4)"; chA.opts.xLabel = ""; chA.opts.yLabel = "times used"; chA.opts.xFmt = v => whole(v) ? NAMES[Math.round(v)] || "" : ""; chA.draw([{ pts: ht.map((v, i) => [i - 0.18, v / 4]), type: "bars", w: 0.34, color: "#8fa0bf", label: "tonal tune" }, { pts: h.map((v, i) => [i + 0.18, v]), type: "bars", w: 0.34, color: "#ffd166", label: "row" }], { xMin: -0.6, xMax: 11.6, yMin: 0 });
    chB.opts.title = "The row's melodic shape"; chB.opts.xLabel = "note"; chB.opts.yLabel = "pitch class"; chB.opts.yFmt = v => whole(v) ? NAMES[Math.round(v)] || "" : ""; chB.draw([{ pts: cur.map((x, i) => [i + 1, x]), color: "#5ad1ff", label: P.which + P.n }, { pts: cur.map((x, i) => [i + 1, x]), type: "dots", r: 4, color: "#5ad1ff" }], { xMin: 1, xMax: 12, yMin: -0.5, yMax: 11.5 });
    label(0, "form"); label(1, "different intervals"); label(2, "entropy"); label(3, "all-interval row?"); read.set("a", P.which + P.n); read.set("b", new Set(intervals(row)).size + " of 11"); read.set("c", entropy(cur).toFixed(2) + " bits"); read.set("d", new Set(intervals(row)).size === 11 ? "yes" : "no");
  } else if (P.view === "phase") { const dt = 60 / P.tempo, el = t, off = drift(el, dt, P.d);
    chA.opts.yFmt = null; chA.opts.title = "Drift of player 2 (notes ahead)"; chA.opts.xLabel = "seconds"; chA.opts.yLabel = "notes"; const ts = []; for (let s = 0; s <= 40; s += 0.5) ts.push([s, drift(s, dt, P.d)]); chA.draw([{ pts: ts, color: "#ffb454", label: "drift" }, { pts: [[el, off]], type: "dots", r: 5, color: "#fff", label: "now" }], { xMin: 0, xMax: 40, yMin: 0 });
    chB.opts.yFmt = null; chB.opts.title = "Same note together, at each offset"; chB.opts.xLabel = "notes ahead"; chB.opts.yLabel = "% of notes"; chB.draw([{ pts: [...Array(12).keys()].map(o => [o, 100 * unison(o)]), type: "bars", w: 0.6, color: "#7ee787", label: "" }], { xMin: -0.6, xMax: 11.6, yMin: 0, yMax: 105 });
    label(0, "player 2 faster by"); label(1, "notes ahead now"); label(2, "patterns to realign"); label(3, "seconds to realign"); read.set("a", (100 * P.d).toFixed(2) + "%"); read.set("b", off.toFixed(2)); read.set("c", P.d ? Math.ceil(1 / P.d) : "never"); read.set("d", P.d ? (12 * dt / P.d).toFixed(0) + " s" : "–");
  } else { const seq = additive(GLASS), lens = []; for (let len = 1; len <= GLASS.length; len++) lens.push(len, len); for (let len = GLASS.length - 1; len >= 1; len--) lens.push(len, len);
    chA.opts.yFmt = null; chA.opts.title = "Length of each repeat"; chA.opts.xLabel = "repeat"; chA.opts.yLabel = "notes"; chA.draw([{ pts: lens.map((L, i) => [i + 1, L]), type: "bars", w: 0.7, color: "#c4a1ff", label: "" }], { yMin: 0 });
    chB.opts.yFmt = null; chB.opts.title = "Melody"; chB.opts.xLabel = "note"; chB.opts.yLabel = "MIDI note"; chB.draw([{ pts: seq.map((m, i) => [i + 1, m]), color: "#5ad1ff", label: "" }], {});
    label(0, "notes in the cell"); label(1, "repeats"); label(2, "total notes"); label(3, "–"); read.set("a", GLASS.length); read.set("b", lens.length); read.set("c", seq.length); read.set("d", "–"); }
}
let frame = 0;
ui.onLevel = () => { sync(); if (ui.level !== "adv" && P.view === "row") set({ view: "phase" }); };
ui.run(dt => { if ((playing || P.view === "phase") && dt > 0) { t += dt; if (P.view === "phase" && !playing && t > 12 * 60 / P.tempo / Math.max(0.005, P.d)) t = 0; } }, () => { draw(); if (frame++ % 6 === 0) charts(); });
set({});
ui.tip("Pick a technique and press ▶ Play.", 6000);
