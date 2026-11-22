/* =====================================================================
   LOGIC GATES AND CIRCUITS
   A logic gate takes binary inputs (0 or 1) and gives a binary output:
     NOT  X = NOT A                 AND  X = A AND B   (1 only if both 1)
     OR   X = A OR B (1 if either)  XOR  X = A XOR B   (1 if different)
     NAND X = NOT (A AND B)         NOR  X = NOT (A OR B)
   A TRUTH TABLE lists the output for every combination of inputs
   (2ⁿ rows for n inputs). Circuits combine gates; a logic expression
   describes the same thing in words or Boolean algebra.
   HALF ADDER: Sum = A XOR B, Carry = A AND B.
   FULL ADDER: adds A, B and a carry in; chaining n of them makes an
   n-bit RIPPLE-CARRY adder (each carry ripples to the next column).
   NAND (or NOR) alone can build every other gate: they are UNIVERSAL.
   An SR FLIP-FLOP (two cross-coupled NOR gates) has feedback: its
   output depends on what happened before, so it can store one bit.
   A KARNAUGH MAP lays out a truth table so that neighbouring cells
   differ in one input; grouping 1s gives a simplified expression.
   ===================================================================== */
// ---------------- 1. Gate logic ----------------
const OPS = { AND: (a, b) => a & b, OR: (a, b) => a | b, XOR: (a, b) => a ^ b, NAND: (a, b) => 1 - (a & b), NOR: (a, b) => 1 - (a | b), NOT: a => 1 - a };
// Each circuit: inputs, gates {id, op, ins, x, y} (positions 0–1 across the stage), outputs [name, signal, x, y]
const CIRC = {
  gate: { name: "one gate", inputs: ["A", "B"], gates: [{ id: "X", op: "AND", ins: ["A", "B"], x: 0.55, y: 0.5 }], outputs: [["X", "X", 0.85, 0.5]], expr: () => `X = A ${P.gop} B` },
  expr: { name: "X = (A AND B) OR NOT C", inputs: ["A", "B", "C"], gates: [{ id: "g1", op: "AND", ins: ["A", "B"], x: 0.4, y: 0.33 }, { id: "g2", op: "NOT", ins: ["C"], x: 0.4, y: 0.72 }, { id: "X", op: "OR", ins: ["g1", "g2"], x: 0.66, y: 0.5 }], outputs: [["X", "X", 0.88, 0.5]], expr: () => "X = (A AND B) OR (NOT C)", kmap: "X" },
  half: { name: "half adder", inputs: ["A", "B"], gates: [{ id: "S", op: "XOR", ins: ["A", "B"], x: 0.55, y: 0.32 }, { id: "Cout", op: "AND", ins: ["A", "B"], x: 0.55, y: 0.7 }], outputs: [["Sum", "S", 0.85, 0.32], ["Carry", "Cout", 0.85, 0.7]], expr: () => "Sum = A XOR B,  Carry = A AND B" },
  full: { name: "full adder", inputs: ["A", "B", "Cin"], gates: [{ id: "x1", op: "XOR", ins: ["A", "B"], x: 0.36, y: 0.25 }, { id: "a1", op: "AND", ins: ["A", "B"], x: 0.36, y: 0.6 }, { id: "S", op: "XOR", ins: ["x1", "Cin"], x: 0.62, y: 0.3 }, { id: "a2", op: "AND", ins: ["x1", "Cin"], x: 0.62, y: 0.55 }, { id: "Cout", op: "OR", ins: ["a2", "a1"], x: 0.8, y: 0.66 }], outputs: [["Sum", "S", 0.92, 0.3], ["Carry out", "Cout", 0.94, 0.66]], expr: () => "Sum = A XOR B XOR Cin,  Cout = (A AND B) OR ((A XOR B) AND Cin)", kmap: "Cout" },
  nandxor: { name: "XOR from 4 NANDs", inputs: ["A", "B"], gates: [{ id: "n1", op: "NAND", ins: ["A", "B"], x: 0.36, y: 0.5 }, { id: "n2", op: "NAND", ins: ["A", "n1"], x: 0.58, y: 0.3 }, { id: "n3", op: "NAND", ins: ["n1", "B"], x: 0.58, y: 0.7 }, { id: "X", op: "NAND", ins: ["n2", "n3"], x: 0.78, y: 0.5 }], outputs: [["X", "X", 0.92, 0.5]], expr: () => "X = A XOR B, made only of NAND gates" },
  sr: { name: "SR flip-flop (A level)", adv: true, inputs: ["S", "R"], gates: [{ id: "Qb", op: "NOR", ins: ["S", "Q"], x: 0.52, y: 0.3 }, { id: "Q", op: "NOR", ins: ["R", "Qb"], x: 0.52, y: 0.7 }], outputs: [["Q̄", "Qb", 0.85, 0.3], ["Q", "Q", 0.85, 0.7]], expr: () => "two cross-coupled NOR gates: S sets Q to 1, R resets Q to 0, S = R = 0 holds", seq: true },
  adder4: { name: "4-bit adder (A level)", adv: true, ripple: true },
};
// evaluate a circuit; for the flip-flop, repeat until the outputs settle (feedback)
function evaluate(Cc, inp, prev) {
  const v = Object.assign({}, prev || {}, inp); for (const g of Cc.gates) if (v[g.id] == null) v[g.id] = 0;
  for (let k = 0; k < (Cc.seq ? 8 : 1); k++) for (const g of Cc.gates) { const op = g.id === "X" && Cc === CIRC.gate ? P.gop : g.op; const a = v[g.ins[0]], b = v[g.ins[1]]; v[g.id] = op === "NOT" ? OPS.NOT(a) : OPS[op](a, b); }
  return v;
}
// 4-bit ripple-carry adder: returns sum bits, carries, and how far the carry rippled
function ripple(A, B, n = 4) { const s = [], c = [0]; for (let i = 0; i < n; i++) { const a = (A >> i) & 1, b = (B >> i) & 1; s.push(a ^ b ^ c[i]); c.push((a & b) | ((a ^ b) & c[i])); } return { s, c, value: s.reduce((t, bit, i) => t + (bit << i), 0) + (c[n] << n) }; }
function longestCarryChain(A, B, n) { let best = 0, run = 0, carry = 0; for (let i = 0; i < n; i++) { const a = (A >> i) & 1, b = (B >> i) & 1; const gen = a & b, prop = a ^ b; if (gen) { run = 1; } else if (prop && carry) run++; else run = 0; carry = gen | (prop & carry); best = Math.max(best, run); } return best; }

// ---------------- 2. State ----------------
const DEF = { circ: "gate", gop: "AND", A: 0, B: 0, C: 0, Cin: 0, S: 0, R: 0, n1: 5, n2: 9, kmap: false };
const P = Object.assign({}, DEF);
let state = {}, history = [];
const inputsOf = () => { const Cc = CIRC[P.circ], o = {}; for (const k of Cc.inputs || []) o[k] = P[k] | 0; return o; };

// ---------------- 3. The page ----------------
const ui = K.app({
  title: "Logic Gates and Circuits", subject: "Computer Science",
  blurb: "Click the inputs: gates, truth tables and logic expressions, half and full adders, XOR from NAND gates, a flip-flop that remembers, a ripple-carry adder and Karnaugh maps",
  reset: () => set({ circ: P.circ }),
  levels: { std: "AS Level (9618)", adv: "A Level (9618)", specs: {
    std: "Cambridge International AS & A Level Computer Science 9618 (AS) topic 3.2: the logic gates NOT, AND, OR, NAND, NOR and XOR, their symbols and truth tables; constructing truth tables and logic circuits from a problem statement or logic expression, and writing logic expressions from circuits and truth tables.",
    adv: "Cambridge International AS & A Level Computer Science 9618 (A Level) topic 15.2: half adder and full adder circuits, SR and JK flip-flops (the role of feedback), Boolean algebra (De Morgan's laws) and Karnaugh maps to simplify expressions." } },
  missions: [
    { title: "Meet the gates", q: "Choose each gate in turn and click A and B through all four combinations. Which gate outputs 1 only when the inputs are different?", hint: "XOR. AND needs both, OR needs at least one, NAND and NOR are AND and OR followed by NOT. Every row of the truth table lights up as you try it.", setup: () => set({ circ: "gate", gop: "XOR" }) },
    { title: "From expression to truth table", q: "X = (A AND B) OR NOT C. Fill in the 8-row truth table yourself, then check by clicking the inputs.", hint: "X = 1 whenever C = 0 (four rows), and also when A = B = 1 with C = 1. So X = 0 only for C = 1 and not (A AND B): three rows.", setup: () => set({ circ: "expr" }) },
    { title: "Adding two bits", q: "Use the half adder. What are Sum and Carry for 1 + 1? Why do we need two outputs?", hint: "1 + 1 = 10 in binary: Sum 0, Carry 1. One bit cannot hold the answer 2, so the carry goes to the next column.", setup: () => set({ circ: "half", A: 1, B: 1 }) },
    { title: "A full adder", q: "The full adder also adds a carry in. Check A = 1, B = 1, Cin = 1. Why is a full adder needed for multi-bit numbers?", hint: "1 + 1 + 1 = 11 in binary: Sum 1, Carry 1. Every column except the first must also add the carry from the column to its right.", setup: () => set({ circ: "full", A: 1, B: 1, Cin: 1 }) },
    { title: "NAND is universal", q: "Four NAND gates build an XOR. Check every row. Why do chip makers like NAND gates?", hint: "It matches A XOR B in every row. Any circuit can be built from NAND gates alone, so a whole chip can use one simple, fast gate design.", setup: () => set({ circ: "nandxor" }) },
    { lvl: "adv", title: "A circuit that remembers", q: "SR flip-flop: set S = 1 then back to 0. What is Q? Then R = 1 then back to 0. What does S = R = 0 do?", hint: "S = 1 sets Q = 1, and Q STAYS 1 after S returns to 0 (feedback holds it). R resets Q to 0. S = R = 0 keeps the last value: one bit of memory. S = R = 1 is not allowed (both outputs 0).", setup: () => set({ circ: "sr" }) },
    { lvl: "adv", title: "Ripple-carry adder", q: "Add 7 + 9 with the 4-bit adder. Follow the carries. What goes wrong with 9 + 9?", hint: "0111 + 1001 = 10000: the carry ripples through every column. 9 + 9 = 18 needs 5 bits: the carry out of the last column is overflow for a 4-bit result.", setup: () => set({ circ: "adder4", n1: 7, n2: 9 }) },
    { lvl: "adv", title: "Karnaugh map", q: "Show the K-map for the full adder's carry. Group the 1s in pairs. What simplified expression do you get?", hint: "Three pairs: AB, A·Cin and B·Cin, so Cout = AB + A·Cin + B·Cin (the 'majority' function: 1 when at least two inputs are 1).", setup: () => set({ circ: "full", kmap: true }) },
  ],
  batch: [
    { title: "Does the adder add? (A level)", question: "For random 4-bit numbers, does the ripple-carry adder's 5-bit output equal A + B?", how: "Each run: 50 random pairs; records the fraction correct.", yLabel: "fraction correct", reps: 100, bins: 5, lo: 0.5, hi: 1.05, theory: 1, theoryLabel: "always", run: (x, r) => { let k = 0; for (let i = 0; i < 50; i++) { const a = r.int(16), b = r.int(16); if (ripple(a, b).value === a + b) k++; } return k / 50; }, note: "Always correct, because each full adder implements the column-addition rule exactly. This is a check of the logic, like testing a program." },
    { title: "How far does the carry ripple? (A level)", question: "Adding two random n-bit numbers, what is the longest run of columns a carry passes through?", how: "Each point: 200 random additions; the mean longest carry chain.", xLabel: "bits n", yLabel: "mean longest carry chain", xs: [4, 8, 12, 16, 20, 24, 30], reps: 4, yMin: 0, theory: n => Math.log2(n) - 1, theoryLabel: "≈ log₂ n − 1", run: (n, r) => { let s = 0; for (let i = 0; i < 200; i++) { let A = 0, B = 0; for (let k = 0; k < n; k++) { if (r() < 0.5) A |= 1 << k; if (r() < 0.5) B |= 1 << k; } s += longestCarryChain(A, B, n); } return s / 200; }, note: "Usually short (about log₂ n − 1), but a ripple-carry adder must wait for the worst case (n columns), which is why fast processors use carry-lookahead adders." },
    { title: "Does the flip-flop remember? (A level)", question: "Send random pulses to an SR flip-flop. After each, is Q equal to the last command (set or reset)?", how: "Each run: 40 random pulses (S, R or neither, never both); fraction of times Q matches the last set/reset.", yLabel: "fraction remembered", reps: 100, bins: 5, lo: 0.5, hi: 1.05, theory: 1, theoryLabel: "always", run: (x, r) => { let v = evaluate(CIRC.sr, { S: 0, R: 1 }); v = evaluate(CIRC.sr, { S: 0, R: 0 }, v); let last = 0, ok = 0; for (let i = 0; i < 40; i++) { const u = r(), S = u < 0.33 ? 1 : 0, R = u > 0.66 ? 1 : 0; v = evaluate(CIRC.sr, { S, R }, v); v = evaluate(CIRC.sr, { S: 0, R: 0 }, v); if (S) last = 1; if (R) last = 0; if (v.Q === last) ok++; } return ok / 40; }, note: "The feedback loop keeps Q steady when S = R = 0: a 1-bit memory cell, the basis of registers and static RAM." },
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "3.2", text: "NOT inverts; AND is 1 only if all inputs are 1; OR is 1 if any input is 1; XOR is 1 if the inputs differ; NAND = NOT AND; NOR = NOT OR. A truth table with n inputs has 2ⁿ rows." },
      { lvl: "std", tag: "3.2", text: "To draw a circuit from an expression, work from the innermost brackets out; to write an expression from a circuit, work from the inputs to the output, labelling each gate's output." },
      { lvl: "adv", tag: "15.2", text: "Half adder: S = A XOR B, C = A AND B. Full adder: S = A XOR B XOR Cin, Cout = AB + Cin(A XOR B). Full adders chained give a ripple-carry adder." },
      { lvl: "adv", tag: "15.2", text: "SR flip-flop: S = 1 sets Q = 1; R = 1 resets Q = 0; S = R = 0 keeps Q (memory, through feedback); S = R = 1 is invalid. A JK flip-flop removes the invalid state (J = K = 1 toggles) and is clocked." },
      { lvl: "adv", tag: "15.2", text: "Boolean algebra: A + AB = A; De Morgan: NOT(A AND B) = NOT A OR NOT B, NOT(A OR B) = NOT A AND NOT B. Karnaugh maps: group 1s in rectangles of 1, 2, 4 or 8 (wrapping round the edges) to simplify." },
    ],
    questions: [
      { lvl: "std", marks: 4, q: "Complete the truth table for X = (A AND B) OR NOT C.", ans: "<ul><li>C = 0: X = 1 in all four rows</li><li>C = 1: X = A AND B</li><li>so X = 0 for ABC = 001, 011, 101</li><li>X = 1 for the other five rows</li></ul>" },
      { lvl: "std", marks: 2, q: () => `Write the output X of the ${CIRC[P.circ].name} for the inputs on screen (${(CIRC[P.circ].inputs || []).map(k => k + " = " + (P[k] | 0)).join(", ")}).`, ans: () => { const Cc = CIRC[P.circ]; if (Cc.ripple) return ""; const v = evaluate(Cc, inputsOf(), state); return `<ul>${Cc.outputs.map(o => `<li>${o[0]} = ${v[o[1]]}</li>`).join("")}</ul>`; } },
      { lvl: "adv", marks: 3, q: "Explain the purpose of feedback in an SR flip-flop and what happens when S = R = 0.", ans: "<ul><li>each NOR gate's output is an input to the other</li><li>so the outputs hold each other in place</li><li>when S = R = 0 the flip-flop keeps its previous state: it stores one bit</li></ul>" },
      { lvl: "adv", marks: 3, q: "Use a Karnaugh map to simplify the full adder carry Cout (1 for ABCin = 011, 101, 110, 111).", ans: "<ul><li>K-map with three overlapping pairs</li><li>pairs AB, A·Cin and B·Cin</li><li>Cout = AB + ACin + BCin</li></ul>" },
    ]
  },
  notes: `<h3>What the page does</h3><ul><li>Click an input (left) to toggle it. Wires and gates glow when they carry a 1. The truth table row for the current inputs is highlighted.</li><li>Combinational circuits are evaluated gate by gate from inputs to outputs. The flip-flop repeats the evaluation until the outputs settle, starting from its previous state, which is what lets it remember.</li><li>The 4-bit adder is shown as four full adders (each built as in the full adder view).</li></ul>
<h3>Simplifications</h3><ul><li>Gates switch instantly; real gates have a propagation delay (which limits how fast a ripple-carry adder can work).</li><li>The SR flip-flop is unclocked; in a computer flip-flops are usually clocked (such as the JK or D flip-flop).</li><li>Inputs are perfect 0s and 1s; real voltages are only close to them.</li></ul>`,
});

// ---------------- 4. Controls ----------------
const C = {};
let g = ui.group("Circuit");
C.circ = K.seg(g, { value: "gate", options: Object.entries(CIRC).map(([k, v]) => [k, v.name]), on: v => set({ circ: v }) });
C.gop = K.seg(g, { label: "Gate", value: "AND", options: ["NOT", "AND", "OR", "XOR", "NAND", "NOR"].map(k => [k, k]), on: v => { P.gop = v; } });
C.kmap = K.toggle(g, { label: "Show the Karnaugh map (A level)", value: false, on: v => P.kmap = v });
const ga = ui.group("4-bit numbers");
C.n1 = K.slider(ga, { label: "A", min: 0, max: 15, step: 1, value: 5, fmt: v => `${v} = ${v.toString(2).padStart(4, "0")}`, on: v => P.n1 = v });
C.n2 = K.slider(ga, { label: "B", min: 0, max: 15, step: 1, value: 9, fmt: v => `${v} = ${v.toString(2).padStart(4, "0")}`, on: v => P.n2 = v });
const read = K.readout(ui.group("Now"), [["in", "Inputs"], ["out", "Outputs"], ["ex", "Expression"]]);
function showCtl() { const Cc = CIRC[P.circ]; C.gop.el.style.display = P.circ === "gate" ? "" : "none"; C.kmap.el.style.display = ui.level === "adv" && Cc.kmap ? "" : "none"; ga.style.display = Cc.ripple ? "" : "none"; C.circ.el.querySelectorAll("button").forEach((b, i) => b.style.display = !Object.values(CIRC)[i].adv || ui.level === "adv" ? "" : "none"); }
function set(o) { Object.assign(P, DEF, o); const Cc = CIRC[P.circ]; if ((Cc.adv || P.kmap) && ui.setLevel && ui.level !== "adv") ui.setLevel("adv"); C.circ.set(P.circ); C.gop.set(P.gop); C.kmap.set(P.kmap); C.n1.set(P.n1); C.n2.set(P.n2); state = Cc.seq ? evaluate(Cc, { S: 0, R: 1 }) : {}; if (Cc.seq) state = evaluate(Cc, { S: 0, R: 0 }, state); history = []; showCtl(); }

// ---------------- 5. Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#c9d4ea", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,system-ui,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
const ON = "#ffb454", OFF = "#4a5670";
let hits = [];
// standard gate symbols, size s, centred at (x, y); returns input and output pin positions
function gateShape(c, op, x, y, s, on) {
  const w = s * 1.2, h = s, x0 = x - w / 2, y0 = y - h / 2; c.lineWidth = 2.5; c.strokeStyle = on ? ON : "#9fb0cf"; c.fillStyle = on ? "rgba(255,180,84,.15)" : "#121b30"; c.beginPath();
  const bubble = op === "NAND" || op === "NOR" || op === "NOT";
  if (op === "AND" || op === "NAND") { c.moveTo(x0, y0); c.lineTo(x0 + w * 0.5, y0); c.arc(x0 + w * 0.5, y, h / 2, -Math.PI / 2, Math.PI / 2); c.lineTo(x0, y0 + h); c.closePath(); }
  else if (op === "NOT") { c.moveTo(x0, y0); c.lineTo(x0 + w * 0.85, y); c.lineTo(x0, y0 + h); c.closePath(); }
  else { c.moveTo(x0, y0); c.quadraticCurveTo(x0 + w * 0.6, y0, x0 + w, y); c.quadraticCurveTo(x0 + w * 0.6, y0 + h, x0, y0 + h); c.quadraticCurveTo(x0 + w * 0.3, y, x0, y0); }
  c.fill(); c.stroke();
  if (op === "XOR") { c.beginPath(); c.moveTo(x0 - 8, y0); c.quadraticCurveTo(x0 + w * 0.3 - 8, y, x0 - 8, y0 + h); c.stroke(); }
  let ox = op === "NOT" ? x0 + w * 0.85 : x0 + w; if (bubble) { c.beginPath(); c.arc(ox + 6, y, 6, 0, 6.3); c.fillStyle = "#0b1222"; c.fill(); c.stroke(); ox += 12; }
  c.lineWidth = 1; TX(c, op, x - (op === "NOT" ? 8 : 4), y + 4, on ? ON : "#9fb0cf", "center", "600 10px");
  return { ins: op === "NOT" ? [[x0, y]] : [[x0 - (op === "XOR" ? 4 : 0), y - h * 0.27], [x0 - (op === "XOR" ? 4 : 0), y + h * 0.27]], out: [ox, y] };
}
function wire(c, a, b, on) { c.strokeStyle = on ? ON : OFF; c.lineWidth = on ? 3 : 2; c.beginPath(); c.moveTo(a[0], a[1]); const mx = (a[0] + b[0]) / 2; c.lineTo(mx, a[1]); c.lineTo(mx, b[1]); c.lineTo(b[0], b[1]); c.stroke(); c.lineWidth = 1; }
function inputBtn(c, name, x, y, v) { c.fillStyle = v ? ON : "#1b2a48"; c.strokeStyle = v ? "#fff" : "#5d6e93"; c.lineWidth = 2; c.beginPath(); c.roundRect ? c.roundRect(x - 26, y - 16, 52, 32, 8) : c.rect(x - 26, y - 16, 52, 32); c.fill(); c.stroke(); c.lineWidth = 1; TX(c, `${name} = ${v}`, x, y + 5, v ? "#1a1000" : "#fff", "center", "600 13px"); hits.push({ x, y, name }); }
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1222"; c.fillRect(0, 0, w, h); hits = [];
  const Cc = CIRC[P.circ], tableW = Cc.ripple ? 0 : Math.min(300, w * 0.3), W = w - tableW - 20;
  if (Cc.ripple) return drawAdder(c, w, h);
  const inp = inputsOf(); const v = evaluate(Cc, inp, Cc.seq ? state : null); if (Cc.seq) state = v;
  const s = Math.min(70, h / 6), ix = 60, iy = k => h * (0.2 + 0.6 * (Cc.inputs.length === 1 ? 0.5 : k / (Cc.inputs.length - 1)));
  const pos = {}; Cc.inputs.forEach((k, i) => pos[k] = [ix + 30, iy(i)]);
  const pins = {}; for (const gt of Cc.gates) { const op = gt.id === "X" && P.circ === "gate" ? P.gop : gt.op; pins[gt.id] = gateShape(c, op, gt.x * W, gt.y * h, s, v[gt.id]); pos[gt.id] = pins[gt.id].out; }
  for (const gt of Cc.gates) { const op = gt.id === "X" && P.circ === "gate" ? P.gop : gt.op; const p = pins[gt.id]; const ins = op === "NOT" ? [gt.ins[0]] : gt.ins; ins.forEach((src, k) => { let a = pos[src]; if (Cc.seq && (src === "Q" || src === "Qb")) { const o = pins[src].out; c.strokeStyle = v[src] ? ON : OFF; c.lineWidth = v[src] ? 3 : 2; c.setLineDash([6, 4]); c.beginPath(); c.moveTo(o[0] + 10, o[1]); c.lineTo(o[0] + 10, (o[1] + p.ins[k][1]) / 2); c.lineTo(p.ins[k][0] - 24, (o[1] + p.ins[k][1]) / 2); c.lineTo(p.ins[k][0] - 24, p.ins[k][1]); c.lineTo(p.ins[k][0], p.ins[k][1]); c.stroke(); c.setLineDash([]); c.lineWidth = 1; return; } wire(c, a, p.ins[k], v[src]); }); }
  for (const [nm, sig, x, y] of Cc.outputs) { const o = pins[sig].out; wire(c, o, [x * W - 18, y * h], v[sig]); c.fillStyle = v[sig] ? ON : "#1b2a48"; c.beginPath(); c.arc(x * W, y * h, 18, 0, 6.3); c.fill(); c.strokeStyle = "#fff"; c.stroke(); TX(c, v[sig], x * W, y * h + 5, v[sig] ? "#1a1000" : "#fff", "center", "600 15px"); TX(c, nm, x * W, y * h - 26, "#c9d4ea", "center", "600 13px"); }
  Cc.inputs.forEach((k, i) => inputBtn(c, k, ix, iy(i), inp[k]));
  TX(c, Cc.expr(), 20, h - 16, "#ffd166", "left", "600 13px");
  // the truth table (or the flip-flop's history), and optionally the K-map
  const tx = w - tableW, rows = 1 << Cc.inputs.length, cols = Cc.inputs.concat(Cc.outputs.map(o => o[0])), cw = Math.min(56, tableW / cols.length), rh = Math.min(24, (h - 150) / (rows + 1)), T0 = 106;
  if (Cc.seq) { TX(c, "S R → Q", tx, 110, "#c9d4ea", "left", "600 13px"); TX(c, "S=1: set · R=1: reset · 0 0: hold · 1 1: not allowed", tx, 130, "#8fa0bf", "left", "11px"); history.slice(-14).forEach((hh, i) => TX(c, `${hh}`, tx, 156 + i * 20, "#c9d4ea", "left", "13px Consolas,monospace,")); }
  else if (!(P.kmap && Cc.kmap && ui.level === "adv")) {
    cols.forEach((nm, j) => TX(c, nm, tx + j * cw + cw / 2, T0 - 6, j < Cc.inputs.length ? "#5ad1ff" : "#ffb454", "center", "600 12px"));
    for (let r = 0; r < rows; r++) { const ins = {}; Cc.inputs.forEach((k, i) => ins[k] = (r >> (Cc.inputs.length - 1 - i)) & 1); const vv = evaluate(Cc, ins); const cur = Cc.inputs.every(k => ins[k] === inp[k]); if (cur) { c.fillStyle = "rgba(255,180,84,.2)"; c.fillRect(tx - 4, T0 + r * rh, cols.length * cw + 8, rh); } cols.forEach((nm, j) => { const val = j < Cc.inputs.length ? ins[nm] : vv[Cc.outputs[j - Cc.inputs.length][1]]; TX(c, val, tx + j * cw + cw / 2, T0 + r * rh + rh * 0.7, cur ? "#fff" : j < Cc.inputs.length ? "#9fb0cf" : "#ffd9a0", "center", "13px Consolas,monospace,"); }); }
  } else {   // Karnaugh map: rows A, columns B Cin (Gray code 00 01 11 10)
    const out = Cc.kmap, gray = [0, 1, 3, 2], cs = Math.min(56, tableW / 5), x0 = tx + 40, y0 = 140; const names = Cc.inputs;
    TX(c, `K-map for ${Cc.outputs.find(o => o[1] === out)[0]}`, tx, 104, "#ffd166", "left", "600 13px"); TX(c, `${names[1]}${names[2]}`, x0 + 2 * cs, y0 - 22, "#5ad1ff", "center", "600 12px"); TX(c, names[0], x0 - 24, y0 + cs, "#5ad1ff", "center", "600 12px");
    gray.forEach((gc, j) => TX(c, gc.toString(2).padStart(2, "0"), x0 + j * cs + cs / 2, y0 - 6, "#8fa0bf", "center", "12px"));
    for (let a = 0; a < 2; a++) { TX(c, a, x0 - 10, y0 + a * cs + cs / 2 + 4, "#8fa0bf", "right", "12px"); gray.forEach((gc, j) => { const ins = { [names[0]]: a, [names[1]]: gc >> 1, [names[2]]: gc & 1 }, val = evaluate(Cc, ins)[out], cur = names.every(k => ins[k] === inp[k]); c.fillStyle = cur ? "rgba(255,180,84,.35)" : val ? "rgba(126,231,135,.18)" : "#121b30"; c.fillRect(x0 + j * cs, y0 + a * cs, cs - 2, cs - 2); TX(c, val, x0 + j * cs + cs / 2, y0 + a * cs + cs / 2 + 6, val ? "#7ee787" : "#5d6e93", "center", "600 18px"); }); }
    TX(c, P.circ === "full" ? "pairs: AB, A·Cin, B·Cin" : "groups: AB (a pair) and C̄ (the four cells with C = 0, wrapping round)", tx, y0 + 2 * cs + 30, "#c9d4ea", "left", "12px"); TX(c, P.circ === "full" ? "Cout = AB + A·Cin + B·Cin" : "X = AB + C̄", tx, y0 + 2 * cs + 52, "#7ee787", "left", "600 13px");
  }
  ui.hud(Cc.outputs.map(o => `${o[0]} = <b>${v[o[1]]}</b>`).join(" · "));
}
function drawAdder(c, w, h) {
  const r = ripple(P.n1, P.n2), bw = Math.min(150, (w - 120) / 4.6), x0 = w - 80 - bw, y = h * 0.45;
  TX(c, `${P.n1} + ${P.n2} = ${r.value}   (${P.n1.toString(2).padStart(4, "0")} + ${P.n2.toString(2).padStart(4, "0")} = ${r.value.toString(2).padStart(5, "0")})`, 20, 30, "#ffd166", "left", "600 15px");
  for (let i = 0; i < 4; i++) { const x = x0 - i * (bw + 26), a = (P.n1 >> i) & 1, b = (P.n2 >> i) & 1;
    c.fillStyle = "#121b30"; c.strokeStyle = "#9fb0cf"; c.lineWidth = 2; c.fillRect(x, y - 40, bw, 80); c.strokeRect(x, y - 40, bw, 80); c.lineWidth = 1; TX(c, "full adder", x + bw / 2, y - 6, "#9fb0cf", "center", "12px"); TX(c, `column ${i} (2${"⁰¹²³"[i]})`, x + bw / 2, y + 12, "#5d6e93", "center", "11px");
    for (const [lab, val, dx] of [["A" + i, a, 0.3], ["B" + i, b, 0.7]]) { c.strokeStyle = val ? ON : OFF; c.lineWidth = 3; c.beginPath(); c.moveTo(x + bw * dx, y - 90); c.lineTo(x + bw * dx, y - 40); c.stroke(); c.lineWidth = 1; TX(c, `${lab} = ${val}`, x + bw * dx, y - 96, val ? ON : "#9fb0cf", "center", "600 13px"); }
    c.strokeStyle = r.s[i] ? ON : OFF; c.lineWidth = 3; c.beginPath(); c.moveTo(x + bw / 2, y + 40); c.lineTo(x + bw / 2, y + 90); c.stroke(); c.lineWidth = 1; TX(c, `S${i} = ${r.s[i]}`, x + bw / 2, y + 108, r.s[i] ? ON : "#9fb0cf", "center", "600 14px");
    const cin = r.c[i], cout = r.c[i + 1]; c.strokeStyle = cout ? ON : OFF; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y + 20); c.lineTo(x - 26, y + 20); c.stroke(); c.lineWidth = 1; TX(c, `C${i + 1} = ${cout}`, x - 13, y + 38, cout ? ON : "#8fa0bf", "center", "11px");
    if (i === 0) TX(c, `Cin = 0`, x + bw + 8, y + 24, "#8fa0bf", "left", "11px"); }
  const ov = r.c[4]; TX(c, ov ? "carry out of column 3 = 1: the answer needs 5 bits (overflow for a 4-bit register)" : "no carry out of column 3: the answer fits in 4 bits", 20, h - 20, ov ? "#ff9aa9" : "#7ee787", "left", "600 13px");
  ui.hud(`carries: ${r.c.slice(1).join(" ")} (columns 0→3)<br>longest carry chain: ${longestCarryChain(P.n1, P.n2, 4)} column(s)`);
}
K.pointer(cv.el, { down: p => { for (const b of hits) if (Math.abs(p.x - b.x) < 30 && Math.abs(p.y - b.y) < 20) { P[b.name] = 1 - (P[b.name] | 0); if (CIRC[P.circ].seq) { const v = evaluate(CIRC.sr, inputsOf(), state); history.push(`${P.S} ${P.R} → Q = ${v.Q}${P.S && P.R ? "  (not allowed!)" : ""}`); } } }, hover: p => cv.el.style.cursor = hits.some(b => Math.abs(p.x - b.x) < 30 && Math.abs(p.y - b.y) < 20) ? "pointer" : "default" });
function panels() {
  const Cc = CIRC[P.circ];
  if (Cc.ripple) { const r = ripple(P.n1, P.n2); read.set("in", `A = ${P.n1}, B = ${P.n2}`); read.set("out", `${r.value} = ${r.value.toString(2).padStart(5, "0")}`); read.set("ex", "four full adders, carry ripples left"); }
  else { const v = evaluate(Cc, inputsOf(), Cc.seq ? state : null); read.set("in", Cc.inputs.map(k => `${k} = ${P[k] | 0}`).join(", ")); read.set("out", Cc.outputs.map(o => `${o[0]} = ${v[o[1]]}`).join(", ")); read.set("ex", Cc.expr()); }
  // chart A: how many rows of the truth table give 1 for each gate type; chart B: carry chains for every pair of 4-bit numbers
  const gates = ["AND", "OR", "XOR", "NAND", "NOR"]; chA.opts.title = "Rows of the 2-input truth table that give 1"; chA.opts.xLabel = ""; chA.opts.yLabel = "rows out of 4"; chA.opts.xFmt = x => Math.abs(x - Math.round(x)) < 1e-6 ? gates[Math.round(x)] || "" : "";
  chA.draw([{ pts: gates.map((gn, i) => [i, [0, 1, 2, 3].filter(r => OPS[gn](r >> 1, r & 1)).length]), type: "bars", w: 0.6, color: K.cssVar("--s1") }], { xMin: -0.6, xMax: 4.6, yMin: 0, yMax: 4 });
  const hc = [0, 0, 0, 0, 0]; for (let a = 0; a < 16; a++) for (let b = 0; b < 16; b++) hc[longestCarryChain(a, b, 4)]++;
  chB.opts.title = "All 256 sums of two 4-bit numbers: longest carry chain"; chB.opts.xLabel = "columns the carry passes through"; chB.opts.yLabel = "sums"; chB.draw([{ pts: hc.map((n, i) => [i, n]), type: "bars", w: 0.7, color: K.cssVar("--s0") }], { xMin: -0.6, xMax: 4.6 });
}
let frame = 0;
ui.run(() => { }, () => { draw(); if (frame++ % 8 === 0) panels(); });
ui.onLevel = v => { if (v === "std" && CIRC[P.circ].adv) set({}); showCtl(); };
set({});
ui.tip("Click the input buttons on the left to switch them between 0 and 1.", 7000);
