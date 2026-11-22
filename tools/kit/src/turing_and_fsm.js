/* =====================================================================
   FINITE STATE MACHINES AND TURING MACHINES
   A FINITE STATE MACHINE (FSM) is always in one of a fixed set of
   STATES. Each input symbol makes it follow a TRANSITION to a new
   state (shown as arrows on a STATE-TRANSITION DIAGRAM). It starts in
   the START state; if it ends in an ACCEPTING state (double circle) the
   input is accepted. FSMs model vending machines, traffic lights,
   tokenisers in compilers and much more. They have no memory except
   which state they are in.
   A TURING MACHINE adds an unlimited TAPE it can read, write and move
   along. Each rule says: in state S reading symbol x, WRITE a symbol,
   MOVE left or right, and go to state T. Simple as it is, a Turing
   machine can carry out any algorithm a computer can (the
   Church–Turing thesis): it is the mathematical model of a computer.
   ===================================================================== */
// ---------------- 1. Finite state machines ----------------
const FSMS = {
  div3: { name: "binary divisible by 3", alphabet: "01", start: "S0", accept: ["S0"], states: { S0: [0.2, 0.5], S1: [0.5, 0.5], S2: [0.8, 0.5] }, T: { S0: { 0: "S0", 1: "S1" }, S1: { 0: "S2", 1: "S0" }, S2: { 0: "S1", 1: "S2" } }, input: "1001", desc: "Each state is the remainder so far when divided by 3. Reading a bit doubles the number and adds the bit." },
  ends01: { name: "ends in 01", alphabet: "01", start: "A", accept: ["C"], states: { A: [0.2, 0.5], B: [0.5, 0.5], C: [0.8, 0.5] }, T: { A: { 0: "B", 1: "A" }, B: { 0: "B", 1: "C" }, C: { 0: "B", 1: "A" } }, input: "110101", desc: "B means 'just read a 0'; C means 'just read 0 then 1'." },
  vend: { name: "vending machine (30p)", alphabet: "TF", symbols: { T: "10p coin", F: "20p coin" }, start: "0p", accept: ["30p+"], states: { "0p": [0.15, 0.5], "10p": [0.4, 0.25], "20p": [0.6, 0.75], "30p+": [0.85, 0.5] }, T: { "0p": { T: "10p", F: "20p" }, "10p": { T: "20p", F: "30p+" }, "20p": { T: "30p+", F: "30p+" }, "30p+": { T: "30p+", F: "30p+" } }, input: "TF", desc: "T = 10p, F = 20p. The drink is released in the accepting state (30p or more)." },
  lock: { name: "door code 1 2 3", alphabet: "123", start: "Locked", accept: ["Open"], states: { Locked: [0.15, 0.5], "Got 1": [0.4, 0.3], "Got 12": [0.65, 0.3], Open: [0.88, 0.55] }, T: { Locked: { 1: "Got 1", 2: "Locked", 3: "Locked" }, "Got 1": { 1: "Got 1", 2: "Got 12", 3: "Locked" }, "Got 12": { 1: "Got 1", 2: "Locked", 3: "Open" }, Open: { 1: "Open", 2: "Open", 3: "Open" } }, input: "21123", desc: "Opens once the keys 1, 2, 3 are pressed in a row." },
};
function runFSM(M, s) { const path = [M.start]; let st = M.start; for (const ch of s) { if (!M.T[st] || M.T[st][ch] == null) { path.push(null); return { path, ok: false, bad: true }; } st = M.T[st][ch]; path.push(st); } return { path, ok: M.accept.includes(st) }; }
// ---------------- 2. Turing machines: rules[state][symbol] = [write, move (L/R), next state] ----------------
const TMS = {
  inc: { name: "add 1 to a binary number", start: "right", tape: "1011", rules: { right: { 0: ["0", "R", "right"], 1: ["1", "R", "right"], _: ["_", "L", "carry"] }, carry: { 1: ["0", "L", "carry"], 0: ["1", "L", "done"], _: ["1", "L", "done"] } }, halt: ["done"], desc: "Move to the right-hand end, then add 1: change 1s to 0s (carrying) until a 0 (or blank) becomes 1." },
  unary: { name: "unary addition (111+11)", start: "scan", tape: "111+11", rules: { scan: { 1: ["1", "R", "scan"], "+": ["1", "R", "toEnd"] }, toEnd: { 1: ["1", "R", "toEnd"], _: ["_", "L", "erase"] }, erase: { 1: ["_", "L", "done"] } }, halt: ["done"], desc: "Numbers as strings of 1s. Replace + with 1, then remove one 1 from the end: 3 + 2 = 5." },
  invert: { name: "invert every bit", start: "flip", tape: "100110", rules: { flip: { 0: ["1", "R", "flip"], 1: ["0", "R", "flip"], _: ["_", "L", "done"] } }, halt: ["done"], desc: "One state: write the opposite bit and move right, until the blank at the end." },
  beaver: { name: "3-state busy beaver", start: "A", tape: "", rules: { A: { _: ["1", "R", "B"], 1: ["1", "R", "H"] }, B: { _: ["0", "R", "C"], 0: ["0", "R", "C"], 1: ["1", "R", "B"] }, C: { _: ["1", "L", "C"], 0: ["1", "L", "C"], 1: ["1", "L", "A"] } }, halt: ["H"], desc: "Starting on a blank tape, how many 1s can a 3-state machine write before it halts?" },
};
function newTM(M, tape) { const t = {}; [...tape].forEach((ch, i) => t[i] = ch); const ones = () => Object.values(t).filter(x => x === "1").length; return { tape: t, head: 0, state: M.start, steps: 0, halted: false, last: null, trace: [[0, 0]], ones: [[0, ones()]] }; }
function stepTM(M, R) { if (R.halted) return; const sym = R.tape[R.head] || "_", rule = M.rules[R.state] && M.rules[R.state][sym]; if (!rule) { R.halted = true; R.last = { stuck: true }; return; } const [w, mv, nx] = rule; R.last = { state: R.state, sym, w, mv, nx, at: R.head }; if (w === "_") delete R.tape[R.head]; else R.tape[R.head] = w; R.head += mv === "R" ? 1 : -1; R.state = nx; R.steps++; R.trace.push([R.steps, R.head]); R.ones.push([R.steps, Object.values(R.tape).filter(x => x === "1").length]); if (M.halt.includes(nx)) R.halted = true; }
const tapeStr = R => { const ks = Object.keys(R.tape).map(Number); if (!ks.length) return ""; let s = ""; for (let i = Math.min(...ks); i <= Math.max(...ks); i++) s += R.tape[i] || "_"; return s; };

// ---------------- 3. State ----------------
const DEF = { mode: "fsm", fsm: "div3", tm: "inc", input: "1001", tape: "1011", speed: 1.5 };
const P = Object.assign({}, DEF);
let fpos = 0, frun = null, tmR = null, acc = 0;
function restart() { if (P.mode === "fsm") { frun = runFSM(FSMS[P.fsm], P.input); fpos = 0; } else tmR = newTM(TMS[P.tm], P.tape); acc = 0; }
function advance() { if (P.mode === "fsm") { if (fpos < P.input.length) fpos++; } else stepTM(TMS[P.tm], tmR); }

// ---------------- 4. The page ----------------
const ui = K.app({
  title: "State Machines and Turing Machines", subject: "Computer Science",
  blurb: "Feed input to state-transition diagrams (a vending machine, a door lock, binary patterns) and step a Turing machine along its tape",
  reset: () => restart(), step: () => advance(),
  levels: { std: "State diagrams (9618)", adv: "Turing machines (beyond)", specs: {
    std: "Cambridge International AS & A Level Computer Science 9618 (AS) topic 12.2 program design: state-transition diagrams to document an algorithm, with states, transitions, inputs, a start state and accepting (final) states.",
    adv: "Beyond the 9618 syllabus: Turing machines (tape, head, states and transition rules) as a model of computation, and why a Turing machine can do anything a computer can (the Church–Turing thesis). Useful background for A Level 'computational thinking' and further study." } },
  missions: [
    { title: "A vending machine", q: "The drink costs 30p. Feed the machine T (10p) and F (20p) coins. Which sequences release a drink? Draw the state-transition table.", hint: "Any sequence totalling at least 30p reaches the accepting state: TTT, TF, FT, FF… The machine only 'remembers' the total so far (its state), not the coins themselves.", setup: () => set({ mode: "fsm", fsm: "vend", input: "TF" }) },
    { title: "A door lock", q: "The door opens after 1, 2, 3. Try 21123 and 1213. Which open the door? Why does pressing 1 in state 'Got 12' go back to 'Got 1', not 'Locked'?", hint: "21123 opens (it ends with 1, 2, 3); 1213 doesn't. A 1 is always a possible start of the code, so the machine keeps it.", setup: () => set({ mode: "fsm", fsm: "lock", input: "21123" }) },
    { title: "Divisible by 3", q: "Try the binary numbers 110 (6), 111 (7) and 1001 (9). Which are accepted? What does each state remember?", hint: "6 and 9 are accepted (ending in S0, remainder 0); 7 is not. Each state is the remainder so far. A machine with just 3 states can check numbers of any length.", setup: () => set({ mode: "fsm", fsm: "div3", input: "110" }) },
    { lvl: "adv", title: "A Turing machine adds 1", q: "Step the 'add 1' machine on 1011 (11). What does it do at the right-hand end? What is on the tape when it halts?", hint: "It moves right to the blank, then goes back left turning trailing 1s into 0s until it turns a 0 into 1: 1011 → 1100 (12). The rule table is the whole 'program'.", setup: () => set({ mode: "tm", tm: "inc", tape: "1011" }) },
    { lvl: "adv", title: "Unary addition", q: "Run the unary adder on 111+11. Why does the answer come out as 11111?", hint: "In unary, 3 + 2 is 111 then 11. The machine replaces the + with a 1 (now six 1s) and erases one 1 from the end, leaving five.", setup: () => set({ mode: "tm", tm: "unary", tape: "111+11" }) },
    { lvl: "adv", title: "Busy beaver", q: "Start the 3-state busy beaver on a blank tape. How many steps until it halts, and how many 1s does it leave?", hint: "It halts after 14 steps leaving six 1s in a row: the most any 3-state machine of this kind can write. Whether an arbitrary machine ever halts cannot be decided by any program: the halting problem.", setup: () => set({ mode: "tm", tm: "beaver", tape: "" }) },
  ],
  batch: [
    { title: "Random binary strings: divisible by 3?", question: "What fraction of random binary strings of length n does the divisible-by-3 machine accept?", how: "Each point: 300 random strings.", xLabel: "length n", yLabel: "fraction accepted", xs: [1, 2, 3, 4, 6, 8, 12, 16], reps: 4, yMin: 0, yMax: 0.8, theory: n => { let k = 0; for (let v = 0; v < 2 ** n; v++) if (v % 3 === 0) k++; return k / 2 ** n; }, theoryLabel: "exact count", run: (n, r) => { let k = 0; for (let i = 0; i < 300; i++) { let s = ""; for (let j = 0; j < n; j++) s += r() < 0.5 ? "0" : "1"; if (runFSM(FSMS.div3, s).ok) k++; } return k / 300; }, note: "Close to 1/3 for longer strings, as expected for multiples of 3. The machine's answer matches the arithmetic for every string." },
    { title: "Random strings ending in 01", question: "What fraction of random binary strings of length n end in 01?", how: "Each point: 300 random strings.", xLabel: "length n", yLabel: "fraction accepted", xs: [2, 3, 4, 6, 8, 12], reps: 4, yMin: 0, yMax: 0.5, theory: () => 0.25, theoryLabel: "¼", run: (n, r) => { let k = 0; for (let i = 0; i < 300; i++) { let s = ""; for (let j = 0; j < n; j++) s += r() < 0.5 ? "0" : "1"; if (runFSM(FSMS.ends01, s).ok) k++; } return k / 300; }, note: "The last two bits are 01 with probability ½ × ½ = ¼, whatever the length." },
    { title: "Steps for the Turing machine to add 1 (A level)", question: "How many steps does the 'add 1' Turing machine take on a random n-bit number?", how: "Each point: 50 random numbers with n bits (leading 1).", xLabel: "bits n", yLabel: "mean steps", xs: [2, 4, 6, 8, 12, 16], reps: 4, yMin: 0, theory: n => n + 1 + 2, theoryLabel: "≈ n + 3 (n moves right, then about 2 back)", run: (n, r) => { let s = 0; for (let i = 0; i < 50; i++) { let t = "1"; for (let j = 1; j < n; j++) t += r() < 0.5 ? "0" : "1"; const R = newTM(TMS.inc, t); while (!R.halted && R.steps < 1000) stepTM(TMS.inc, R); s += R.steps; } return s / 50; }, note: "Linear in n: it must walk to the end of the number. The carry usually stops quickly (on average after about 2 bits)." },
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "12.2", text: "A state-transition diagram shows states (circles), transitions (arrows labelled with the input that causes them, and any output), the start state (an arrow from nowhere) and accepting/final states (double circles)." },
      { lvl: "std", tag: "12.2", text: "A state-transition table lists, for each current state and input, the next state (and output). It holds the same information as the diagram." },
      { lvl: "std", tag: "12.2", text: "An FSM's only memory is its current state, so it cannot, for example, check that brackets are balanced to any depth; that needs a stack." },
      { lvl: "adv", tag: "beyond", text: "A Turing machine: an infinite tape of symbols, a read/write head, a current state and a table of rules (state, symbol → write, move, next state). It can compute anything that any computer can (Church–Turing thesis). Some questions, like whether any given program halts, cannot be decided by any machine." },
    ],
    questions: [
      { lvl: "std", marks: 3, q: () => `Trace the input ${P.input} through the "${FSMS[P.fsm].name}" machine. Give each state and say whether the input is accepted.`, ans: () => { const r = runFSM(FSMS[P.fsm], P.input); return `<ul><li>states: ${r.path.map(s => s || "(no transition)").join(" → ")}</li><li>${r.ok ? "accepted (ends in an accepting state)" : "rejected"}</li></ul>`; } },
      { lvl: "std", marks: 2, q: "State two things shown on a state-transition diagram, other than the states themselves.", ans: "<ul><li>transitions between states (arrows) with the input that triggers each</li><li>the start state and the accepting (final) states (or outputs on transitions)</li></ul>" },
      { lvl: "adv", marks: 3, q: "Describe the components of a Turing machine.", ans: "<ul><li>an unlimited tape divided into cells holding symbols, and a head that reads and writes one cell</li><li>a finite set of states including a start state and halting state(s)</li><li>a transition table: for each state and symbol read, the symbol to write, the direction to move and the next state</li></ul>" },
    ]
  },
  notes: `<h3>What the page does</h3><ul><li><b>State machines:</b> type an input string (only the machine's symbols are allowed) and step through it; the current state glows and the transition just taken is highlighted. A double circle marks an accepting state.</li><li><b>Turing machines (beyond 9618):</b> the tape (blank cells shown as _), the head, the current state and the rule table, with the rule just used highlighted. Edit the starting tape to try other inputs.</li></ul>
<h3>Simplifications</h3><ul><li>Real controllers (vending machines, locks) also produce outputs and have timeouts; these are left out to keep the diagrams small.</li><li>The tape is unlimited in theory; here it simply grows as needed.</li><li>If no rule matches, the Turing machine stops ("stuck").</li></ul>`,
});

// ---------------- 5. Controls ----------------
const C = {};
let g = ui.group("Machine");
C.mode = K.seg(g, { value: "fsm", options: [["fsm", "finite state machine"], ["tm", "Turing machine (beyond)"]], on: v => set({ mode: v }) });
const gf = ui.group("State machine"), gt = ui.group("Turing machine");
C.fsm = K.seg(gf, { value: "div3", options: Object.entries(FSMS).map(([k, v]) => [k, v.name]), on: v => { P.fsm = v; P.input = FSMS[v].input; C.inBox.value = P.input; restart(); } });
C.inBox = K.$("input"); C.inBox.setAttribute("aria-label", "Input string"); C.inBox.style.cssText = "width:100%;font:16px Consolas,monospace;padding:6px;background:var(--panel2);color:var(--text);border:1px solid var(--line);border-radius:8px"; K.note(gf, "Input string:"); gf.append(C.inBox);
C.inBox.addEventListener("input", () => { const M = FSMS[P.fsm]; P.input = C.inBox.value.toUpperCase().split("").filter(ch => M.alphabet.includes(ch)).join(""); restart(); });
C.tm = K.seg(gt, { value: "inc", options: Object.entries(TMS).map(([k, v]) => [k, v.name]), on: v => { P.tm = v; P.tape = TMS[v].tape; C.tapeBox.value = P.tape; restart(); } });
C.tapeBox = K.$("input"); C.tapeBox.setAttribute("aria-label", "Starting tape"); C.tapeBox.style.cssText = C.inBox.style.cssText; K.note(gt, "Starting tape:"); gt.append(C.tapeBox); C.tapeBox.addEventListener("input", () => { P.tape = C.tapeBox.value.replace(/\s/g, ""); restart(); });
C.speed = K.slider(ui.group("Speed"), { label: "Steps per second", min: 0.25, max: 10, step: 0.25, value: 1.5, on: v => P.speed = v });
ui.headerSpeed(C.speed);   // playback speed lives in the header, beside Pause and Reset
const read = K.readout(ui.group("Now"), [["a", ""], ["b", ""], ["c", ""]]);
const relabel = n => n.forEach((x, i) => read.el.children[i].firstElementChild.textContent = x);
function showCtl() { gf.style.display = P.mode === "fsm" ? "" : "none"; gt.style.display = P.mode === "tm" ? "" : "none"; C.mode.el.querySelectorAll("button")[1].style.display = ui.level === "adv" ? "" : "none"; }
function set(o) { Object.assign(P, DEF, o); if (P.mode === "tm" && ui.setLevel && ui.level !== "adv") ui.setLevel("adv"); C.mode.set(P.mode); C.fsm.set(P.fsm); C.tm.set(P.tm); C.speed.set(P.speed); C.inBox.value = P.input; C.tapeBox.value = P.tape; showCtl(); restart(); }

// ---------------- 6. Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#c9d4ea", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,system-ui,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
function arrowHead(c, x, y, a, col) { c.fillStyle = col; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 11 * Math.cos(a - 0.4), y - 11 * Math.sin(a - 0.4)); c.lineTo(x - 11 * Math.cos(a + 0.4), y - 11 * Math.sin(a + 0.4)); c.fill(); }
function drawFSM(c, w, h) {
  const M = FSMS[P.fsm], R = 32, top = 70, H = h - 200, pos = {}; for (const s in M.states) pos[s] = [M.states[s][0] * w, top + M.states[s][1] * H];
  const cur = frun.path[fpos], prev = fpos > 0 ? frun.path[fpos - 1] : null, sym = fpos > 0 ? P.input[fpos - 1] : null;
  // group transitions with the same from/to so labels combine ("0, 1")
  const edges = {}; for (const s in M.T) for (const x in M.T[s]) { const k = s + "→" + M.T[s][x]; (edges[k] = edges[k] || { a: s, b: M.T[s][x], syms: [] }).syms.push(x); }
  for (const k in edges) { const { a, b, syms } = edges[k], on = prev === a && cur === b && syms.includes(sym), col = on ? "#ffb454" : "#5d6e93"; c.strokeStyle = col; c.lineWidth = on ? 3 : 1.8; const lab = syms.map(x => M.symbols ? x + " (" + M.symbols[x] + ")" : x).join(", ");
    if (a === b) { const [x, y] = pos[a]; c.beginPath(); c.arc(x, y - R - 14, 16, 0.25 * Math.PI, 0.75 * Math.PI, true); c.stroke(); arrowHead(c, x - 11, y - R - 3, Math.PI / 2 + 0.6, col); TX(c, lab, x, y - R - 36, on ? "#ffd9a0" : "#c9d4ea", "center", "600 12px"); continue; }
    const [x1, y1] = pos[a], [x2, y2] = pos[b], back = edges[b + "→" + a] ? 1 : 0, ang = Math.atan2(y2 - y1, x2 - x1), nx = -Math.sin(ang), ny = Math.cos(ang), bend = back ? 28 : 0, mx = (x1 + x2) / 2 + nx * bend, my = (y1 + y2) / 2 + ny * bend;
    const sx = x1 + Math.cos(ang) * R + nx * bend * 0.3, sy = y1 + Math.sin(ang) * R + ny * bend * 0.3, ex = x2 - Math.cos(ang) * R + nx * bend * 0.3, ey = y2 - Math.sin(ang) * R + ny * bend * 0.3;
    c.beginPath(); c.moveTo(sx, sy); c.quadraticCurveTo(mx, my, ex, ey); c.stroke(); arrowHead(c, ex, ey, Math.atan2(ey - my, ex - mx), col); TX(c, lab, mx + nx * 12, my + ny * 12 + 4, on ? "#ffd9a0" : "#c9d4ea", "center", "600 12px"); }
  c.lineWidth = 1;
  for (const s in pos) { const [x, y] = pos[s], on = s === cur; c.fillStyle = on ? "rgba(255,180,84,.3)" : "#121b30"; c.beginPath(); c.arc(x, y, R, 0, 6.3); c.fill(); c.strokeStyle = on ? "#ffb454" : "#c9d4ea"; c.lineWidth = 2.5; c.stroke(); if (M.accept.includes(s)) { c.beginPath(); c.arc(x, y, R - 6, 0, 6.3); c.stroke(); } c.lineWidth = 1; TX(c, s, x, y + 5, "#fff", "center", "600 13px"); if (s === M.start) { c.strokeStyle = "#c9d4ea"; c.lineWidth = 2; c.beginPath(); c.moveTo(x - R - 40, y); c.lineTo(x - R - 4, y); c.stroke(); arrowHead(c, x - R - 2, y, 0, "#c9d4ea"); c.lineWidth = 1; TX(c, "start", x - R - 42, y - 8, "#8fa0bf", "left", "11px"); } }
  // the input tape
  const cw = 34, x0 = 30, y0 = h - 110; TX(c, "input:", x0, y0 - 10, "#8fa0bf", "left", "12px"); [...P.input].forEach((ch, i) => { c.fillStyle = i < fpos ? "#3a4a6e" : i === fpos ? "rgba(255,180,84,.3)" : "#121b30"; c.fillRect(x0 + i * cw, y0, cw - 3, 36); c.strokeStyle = "#5d6e93"; c.strokeRect(x0 + i * cw, y0, cw - 3, 36); TX(c, ch, x0 + i * cw + cw / 2 - 1.5, y0 + 24, "#fff", "center", "600 16px Consolas,monospace,"); });
  const done = fpos >= P.input.length; TX(c, done ? (frun.ok ? "ACCEPTED: ended in an accepting state" : "REJECTED: did not end in an accepting state") : "reading…", x0, y0 + 64, done ? (frun.ok ? "#7ee787" : "#ff9aa9") : "#ffd166", "left", "600 15px");
  TX(c, M.desc, 20, 28, "#c9d4ea", "left", "13px");
  ui.hud(`state: <b>${cur}</b><br>read ${fpos} of ${P.input.length} symbols`);
}
function drawTM(c, w, h) {
  const M = TMS[P.tm], R = tmR, cw = 42, cx = w / 2, y0 = 110;
  TX(c, M.desc, 20, 28, "#c9d4ea", "left", "13px");
  for (let k = -9; k <= 9; k++) { const i = R.head + k, x = cx + k * cw - cw / 2, sym = R.tape[i] || "_", just = R.last && R.last.at === i; c.fillStyle = k === 0 ? "rgba(255,180,84,.25)" : just ? "rgba(126,231,135,.2)" : "#121b30"; c.fillRect(x, y0, cw - 3, 46); c.strokeStyle = "#5d6e93"; c.strokeRect(x, y0, cw - 3, 46); TX(c, sym, x + cw / 2 - 1.5, y0 + 30, sym === "_" ? "#5d6e93" : "#fff", "center", "600 20px Consolas,monospace,"); TX(c, i, x + cw / 2 - 1.5, y0 + 64, "#5d6e93", "center", "10px"); }
  c.fillStyle = "#ffb454"; c.beginPath(); c.moveTo(cx - 1.5, y0 - 6); c.lineTo(cx - 13, y0 - 26); c.lineTo(cx + 10, y0 - 26); c.fill(); TX(c, `head · state ${R.state}`, cx, y0 - 34, "#ffb454", "center", "600 14px");
  // the rule table
  const rows = []; for (const s in M.rules) for (const x in M.rules[s]) rows.push([s, x, ...M.rules[s][x]]);
  const tx = 40, ty = y0 + 110; TX(c, "state   read   write   move   next state", tx, ty, "#8fa0bf", "left", "13px Consolas,monospace,");
  rows.forEach((r, i) => { const on = R.last && R.last.state === r[0] && R.last.sym === r[1]; if (on) { c.fillStyle = "rgba(126,231,135,.2)"; c.fillRect(tx - 6, ty + 8 + i * 22, 420, 22); } TX(c, `${r[0].padEnd(8)}${r[1].padEnd(7)}${r[2].padEnd(8)}${r[3].padEnd(7)}${r[4]}`, tx, ty + 24 + i * 22, on ? "#7ee787" : "#dfe8f7", "left", "14px Consolas,monospace,"); });
  ui.hud(`step ${R.steps} · state <b>${R.state}</b>${R.halted ? `<br><b style="color:#7ee787">${R.last && R.last.stuck ? "stuck: no rule" : "halted"}</b> · tape ${tapeStr(R)}` : ""}`);
}
function draw() { const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1222"; c.fillRect(0, 0, w, h); if (P.mode === "fsm") drawFSM(c, w, h); else drawTM(c, w, h); }
function panels() {
  if (P.mode === "fsm") { const M = FSMS[P.fsm]; relabel(["State", "Path so far", "Result"]); read.set("a", frun.path[fpos]); read.set("b", frun.path.slice(0, fpos + 1).join(" → ")); read.set("c", fpos >= P.input.length ? (frun.ok ? "accepted" : "rejected") : "…");
    // chart A: for each length, the fraction of all strings accepted; chart B: which state the machine is in at each step
    const L = []; for (let n = 1; n <= 10; n++) { let k = 0, tot = 0; const al = M.alphabet; const gen = (s, d) => { if (d === n) { tot++; if (runFSM(M, s).ok) k++; return; } for (const ch of al) gen(s + ch, d + 1); }; if (al.length ** n <= 60000) { gen("", 0); L.push([n, k / tot]); } }
    chA.opts.title = "Fraction of ALL inputs of each length that are accepted"; chA.opts.xLabel = "input length"; chA.opts.yLabel = "fraction"; chA.opts.yFmt = null; chA.draw([{ pts: L, color: K.cssVar("--s2") }, { pts: L, type: "dots", color: K.cssVar("--s2") }], { yMin: 0, yMax: 1 });
    const names = Object.keys(M.states); chB.opts.title = "State after each symbol"; chB.opts.xLabel = "symbols read"; chB.opts.yLabel = "state"; chB.opts.yFmt = v => Math.abs(v - Math.round(v)) < 1e-6 ? names[Math.round(v)] || "" : "";
    chB.draw([{ pts: frun.path.slice(0, fpos + 1).map((s, i) => [i, names.indexOf(s)]), color: K.cssVar("--s1") }, { pts: frun.path.slice(0, fpos + 1).map((s, i) => [i, names.indexOf(s)]), type: "dots", r: 4, color: K.cssVar("--s1") }], { yMin: -0.5, yMax: names.length - 0.5, xMin: 0, xMax: Math.max(1, P.input.length) });
  } else {
    relabel(["State", "Steps", "Tape"]); read.set("a", tmR.state); read.set("b", tmR.steps); read.set("c", tapeStr(tmR) || "(blank)");
    chB.opts.yFmt = null; chA.opts.title = "Head position over time"; chA.opts.xLabel = "step"; chA.opts.yLabel = "cell"; chA.draw([{ pts: tmR.trace, color: K.cssVar("--s1") }]);
    chB.opts.title = "Number of 1s on the tape"; chB.opts.xLabel = "step"; chB.opts.yLabel = "1s"; chB.draw([{ pts: tmR.ones, color: K.cssVar("--s2") }], { yMin: 0 });
  }
}
let frame = 0;
ui.run(dt => { acc += dt * P.speed; while (acc >= 1) { acc--; advance(); } if (P.mode === "fsm" && fpos >= P.input.length) { acc -= dt * P.speed * 0.6; if (acc < -4) restart(); } if (P.mode === "tm" && tmR.halted) { acc -= dt * P.speed * 0.6; if (acc < -5) restart(); } }, () => { draw(); if (frame++ % 5 === 0) panels(); });
ui.onLevel = v => { if (v === "std" && P.mode === "tm") set({}); showCtl(); };
set({});
ui.tip("Type an input string, then watch the machine move from state to state.", 7000);
