/* =====================================================================
   THE PROCESSOR: FETCH–DECODE–EXECUTE
   In a Von Neumann computer, instructions and data share one memory.
   The CPU repeats the cycle (written in register transfer notation):
     FETCH    MAR ← [PC]             address of the next instruction
              PC ← [PC] + 1; MDR ← [[MAR]]   read memory via the data bus
              CIR ← [MDR]            instruction into the current
                                     instruction register
     DECODE   the control unit splits CIR into opcode and operand
     EXECUTE  e.g. LDD 50:  MAR ← 50; MDR ← [[MAR]]; ACC ← [MDR]
   Registers: PC program counter, MAR memory address register, MDR memory
   data register, CIR current instruction register, ACC accumulator,
   IX index register, SR status register (flags).
   Buses: ADDRESS bus (CPU → memory, one way), DATA bus (both ways),
   CONTROL bus (read, write, clock signals).
   Addressing modes (Cambridge 9618 instruction set):
     immediate  LDM #5   the operand IS the value
     direct     LDD 50   the operand is the address of the value
     indirect   LDI 50   address 50 holds the address of the value
     indexed    LDX 50   the value is at address 50 + [IX]
   ===================================================================== */
// ---------------- 1. A tiny assembler and processor ----------------
const PROGS = {
  add: { name: "add two numbers", src: "; add NUM1 and NUM2, store and output the total\n        LDD NUM1\n        ADD NUM2\n        STO TOTAL\n        OUT\n        END\nNUM1:   65\nNUM2:   1\nTOTAL:  0" },
  count: { name: "count down (loop)", src: "; count from 5 down to 1, outputting each digit\n        LDM #5\nLOOP:   STO COUNT\n        ADD #48      ; turn 0–9 into the character '0'–'9'\n        OUT\n        LDD COUNT\n        DEC ACC\n        CMP #0\n        JPN LOOP     ; jump back if ACC ≠ 0\n        END\nCOUNT:  0" },
  sum: { name: "sum an array (indexed)", src: "; add up the 4 numbers in LIST using the index register\n        LDR #0       ; IX ← 0\n        LDM #0\n        STO TOTAL\nLOOP:   LDX LIST     ; ACC ← value at LIST + IX\n        ADD TOTAL\n        STO TOTAL\n        INC IX\n        LDD TOTAL\n        MOV IX       ; ACC ← IX (to test it)\n        CMP #4\n        LDD TOTAL\n        JPN LOOP\n        END\nTOTAL:  0\nLIST:   7\n        3\n        12\n        8" },
  modes: { name: "addressing modes", src: "; the same operand, four addressing modes\n        LDM #60      ; immediate: ACC ← 60\n        LDD 60       ; direct: ACC ← [60]\n        LDI 60       ; indirect: ACC ← [[60]]\n        LDR #1\n        LDX 60       ; indexed: ACC ← [60 + IX]\n        END\n        ORG 60\n        62\n        5\n        99" },
  bits: { name: "bit manipulation", src: "; mask, set and shift bits\n        LDD BYTE     ; 10110110\n        AND #15      ; keep the low 4 bits: 00000110\n        OR #128      ; set the top bit: 10000110\n        LSL #1       ; shift left: 00001100 (top bit lost)\n        LSR #2       ; shift right: 00000011\n        XOR #255     ; flip every bit\n        END\nBYTE:   182" },
};
function assemble(src) {
  const lines = src.split("\n"), mem = new Array(100).fill(0), code = [], labels = {}, errs = [], srcLine = {}; let addr = 0;
  const parsed = [];
  for (const raw of lines) { const l = raw.replace(/;.*/, "").trim(); if (!l) continue; let m = l.match(/^([A-Za-z_]\w*):\s*(.*)$/), label = null, rest = l; if (m) { label = m[1].toUpperCase(); rest = m[2].trim(); }
    const o = rest.match(/^ORG\s+(\d+)$/i); if (o) { addr = +o[1]; if (label) labels[label] = addr; continue; } if (label) labels[label] = addr; if (!rest) continue; parsed.push({ addr, rest, raw }); addr++; }
  for (const p of parsed) { srcLine[p.addr] = p.raw.trim(); if (/^-?\d+$/.test(p.rest)) { mem[p.addr] = +p.rest; continue; }
    const m = p.rest.match(/^([A-Za-z]+)\s*(.*)$/); const op = m[1].toUpperCase(); let arg = m[2].trim();
    let mode = "none", val = null; if (arg.startsWith("#")) { mode = "imm"; val = +arg.slice(1); } else if (/^(ACC|IX)$/i.test(arg)) { mode = "reg"; val = arg.toUpperCase(); } else if (arg) { mode = "addr"; val = /^\d+$/.test(arg) ? +arg : labels[arg.toUpperCase()]; if (val == null) errs.push(`unknown label ${arg}`); }
    mem[p.addr] = { op, mode, val, text: p.rest.replace(/\s+/g, " ") }; }
  return { mem, labels, errs, srcLine };
}
// The micro-steps of one instruction: each says what moves, and which registers and buses it uses
function microSteps(cpu) {
  const steps = [
    { rtn: "MAR ← [PC]", regs: ["PC", "MAR"], bus: [], f: c => { c.MAR = c.PC; } },
    { rtn: "PC ← [PC] + 1;  MDR ← [[MAR]]", regs: ["PC", "MDR", "MAR"], bus: ["address", "data", "control"], f: c => { c.PC++; c.MDR = c.mem[c.MAR]; } },
    { rtn: "CIR ← [MDR]", regs: ["CIR", "MDR"], bus: [], f: c => { c.CIR = c.MDR; } },
    { rtn: "decode: the control unit reads the opcode", regs: ["CIR", "CU"], bus: [], f: () => { } },
  ];
  const I = cpu.mem[cpu.PC]; if (typeof I !== "object") return steps.concat([{ rtn: "this word is data, not an instruction: stop", regs: [], bus: [], f: c => c.halt = true }]);
  const read = (addrF, then) => [{ rtn: `MAR ← ${addrF.txt}`, regs: ["MAR", "CIR"], bus: [], f: c => { c.MAR = addrF.f(c); } }, { rtn: "MDR ← [[MAR]]", regs: ["MDR", "MAR"], bus: ["address", "data", "control"], f: c => { c.MDR = c.mem[c.MAR]; } }].concat(then);
  const opnd = { f: c => I.val, txt: String(I.val) }, alu = (name, fn) => I.mode === "imm" ? [{ rtn: `ACC ← [ACC] ${name} ${I.val}`, regs: ["ACC", "ALU"], bus: [], f: c => { c.ACC = fn(c.ACC, I.val); } }] : read(opnd, [{ rtn: `ACC ← [ACC] ${name} [MDR]`, regs: ["ACC", "ALU", "MDR"], bus: [], f: c => { c.ACC = fn(c.ACC, c.MDR); } }]);
  const W = v => ((v % 256) + 256) % 256;
  let ex;
  switch (I.op) {
    case "LDM": ex = [{ rtn: `ACC ← ${I.val}  (immediate)`, regs: ["ACC", "CIR"], bus: [], f: c => { c.ACC = I.val; } }]; break;
    case "LDD": ex = read(opnd, [{ rtn: "ACC ← [MDR]  (direct)", regs: ["ACC", "MDR"], bus: [], f: c => { c.ACC = c.MDR; } }]); break;
    case "LDI": ex = read(opnd, read({ f: c => c.MDR, txt: "[MDR]" }, [{ rtn: "ACC ← [MDR]  (indirect)", regs: ["ACC", "MDR"], bus: [], f: c => { c.ACC = c.MDR; } }])); break;
    case "LDX": ex = read({ f: c => I.val + c.IX, txt: `${I.val} + [IX]` }, [{ rtn: "ACC ← [MDR]  (indexed)", regs: ["ACC", "MDR", "IX"], bus: [], f: c => { c.ACC = c.MDR; } }]); break;
    case "LDR": ex = [{ rtn: `IX ← ${I.val}`, regs: ["IX", "CIR"], bus: [], f: c => { c.IX = I.val; } }]; break;
    case "MOV": ex = [{ rtn: "ACC ← [IX]", regs: ["ACC", "IX"], bus: [], f: c => { c.ACC = c.IX; } }]; break;
    case "STO": ex = [{ rtn: `MAR ← ${I.val}`, regs: ["MAR", "CIR"], bus: [], f: c => { c.MAR = I.val; } }, { rtn: "MDR ← [ACC]", regs: ["MDR", "ACC"], bus: [], f: c => { c.MDR = c.ACC; } }, { rtn: "[MAR] ← [MDR]  (write to memory)", regs: ["MDR", "MAR"], bus: ["address", "data", "control"], f: c => { c.mem[c.MAR] = c.MDR; c.written = c.MAR; } }]; break;
    case "ADD": ex = alu("+", (a, b) => W(a + b)); break;
    case "SUB": ex = alu("−", (a, b) => W(a - b)); break;
    case "AND": ex = alu("AND", (a, b) => a & b); break;
    case "OR": ex = alu("OR", (a, b) => a | b); break;
    case "XOR": ex = alu("XOR", (a, b) => a ^ b); break;
    case "LSL": ex = [{ rtn: `ACC ← [ACC] shifted left ${I.val}`, regs: ["ACC", "ALU"], bus: [], f: c => { c.ACC = W(c.ACC << I.val); } }]; break;
    case "LSR": ex = [{ rtn: `ACC ← [ACC] shifted right ${I.val}`, regs: ["ACC", "ALU"], bus: [], f: c => { c.ACC = c.ACC >> I.val; } }]; break;
    case "INC": ex = [{ rtn: `${I.val} ← [${I.val}] + 1`, regs: [I.val, "ALU"], bus: [], f: c => { c[I.val] = W(c[I.val] + 1); } }]; break;
    case "DEC": ex = [{ rtn: `${I.val} ← [${I.val}] − 1`, regs: [I.val, "ALU"], bus: [], f: c => { c[I.val] = W(c[I.val] - 1); } }]; break;
    case "CMP": ex = I.mode === "imm" ? [{ rtn: `compare [ACC] with ${I.val}: set the flag`, regs: ["ACC", "ALU", "SR"], bus: [], f: c => { c.SR = +(c.ACC === I.val); } }] : read(opnd, [{ rtn: "compare [ACC] with [MDR]: set the flag", regs: ["ACC", "ALU", "SR", "MDR"], bus: [], f: c => { c.SR = +(c.ACC === c.MDR); } }]); break;
    case "JMP": ex = [{ rtn: `PC ← ${I.val}  (jump)`, regs: ["PC", "CIR"], bus: [], f: c => { c.PC = I.val; } }]; break;
    case "JPE": ex = [{ rtn: `if the flag is set: PC ← ${I.val}`, regs: ["PC", "SR"], bus: [], f: c => { if (c.SR) c.PC = I.val; } }]; break;
    case "JPN": ex = [{ rtn: `if the flag is NOT set: PC ← ${I.val}`, regs: ["PC", "SR"], bus: [], f: c => { if (!c.SR) c.PC = I.val; } }]; break;
    case "OUT": ex = [{ rtn: "output the character with code [ACC]", regs: ["ACC"], bus: ["control"], f: c => { c.out += String.fromCharCode(c.ACC); } }]; break;
    case "END": ex = [{ rtn: "END: stop", regs: [], bus: [], f: c => { c.halt = true; } }]; break;
    default: ex = [{ rtn: `unknown instruction ${I.op}`, regs: [], bus: [], f: c => { c.halt = true; } }];
  }
  return steps.concat(ex.map(s => Object.assign(s, { exec: true })));
}
function newCPU(asm) { return { mem: asm.mem.slice(), PC: 0, MAR: 0, MDR: 0, CIR: 0, ACC: 0, IX: 0, SR: 0, out: "", halt: false, cycles: 0, instr: 0, memAcc: 0, written: -1 }; }
// run a whole program (for the batch runs): returns instructions, micro-steps and memory accesses
function runAll(asm, limit = 5000) { const c = newCPU(asm); while (!c.halt && c.instr < limit) { const st = microSteps(c); for (const s of st) { s.f(c); c.cycles++; if (s.bus.includes("data")) c.memAcc++; if (c.halt) break; } c.instr++; } return c; }

// ---------------- 2. State ----------------
const DEF = { prog: "add", speed: 2, bin: false, stages: 5, branch: 0.15 };
const P = Object.assign({}, DEF);
let asm = null, cpu = null, steps = [], si = 0, acc = 0, lastStep = null, src = "";
function load(text) { src = text; asm = assemble(text); cpu = newCPU(asm); steps = microSteps(cpu); si = 0; lastStep = null; acc = 0; if (C.editor) C.editor.value = text; }
function micro() { if (cpu.halt) return; const s = steps[si]; cpu.written = -1; s.f(cpu); cpu.cycles++; if (s.bus.includes("data")) cpu.memAcc++; lastStep = s; si++; if (si >= steps.length || cpu.halt) { cpu.instr++; if (!cpu.halt) { steps = microSteps(cpu); si = 0; } } }

// ---------------- 3. The page ----------------
const ui = K.app({
  title: "CPU: Fetch–Decode–Execute", subject: "Computer Science",
  blurb: "Step through the fetch–execute cycle in register transfer notation: registers, buses, memory, and Cambridge assembly language with immediate, direct, indirect and indexed addressing",
  reset: () => load(src), step: () => micro(),
  levels: { std: "AS Level (9618)", adv: "A Level (9618)", specs: {
    std: "Cambridge International AS & A Level Computer Science 9618 (AS) topic 4: Von Neumann architecture; the registers PC, MAR, MDR, CIR, ACC, IX and SR; ALU, CU, system clock; address, data and control buses; the fetch–execute cycle in register transfer notation; the 9618 assembly language instruction set; immediate, direct, indirect, indexed and relative addressing; bit manipulation (AND, OR, XOR, shifts).",
    adv: "Cambridge International AS & A Level Computer Science 9618 (A Level) topic 15.1: RISC and CISC processors and pipelining (instruction-level parallelism): how a pipeline speeds up execution and why branches cause it to be flushed." } },
  missions: [
    { title: "One fetch–execute cycle", q: "Press Step repeatedly for the first instruction (LDD NUM1). Write down each register transfer. Which steps use the address bus?", hint: "MAR ← [PC]; PC ← [PC] + 1 and MDR ← [[MAR]] (address and data buses); CIR ← [MDR]; decode; then for LDD: MAR ← address, MDR ← [[MAR]] (buses again), ACC ← [MDR]. Each memory read uses the address bus, data bus and control bus.", setup: () => set({ prog: "add", speed: 1 }, true) },
    { title: "Why does the PC go up by 1 straight away?", q: "Watch the PC during the fetch. When is it incremented? What would go wrong if it was never incremented?", hint: "During the fetch, before the instruction is executed, so it already points to the next instruction. A jump simply overwrites it. Without incrementing, the CPU would run the same instruction for ever.", setup: () => set({ prog: "add", speed: 1 }, true) },
    { title: "A loop", q: "Run the count-down program. Which instruction makes the loop? What do CMP and JPN do?", hint: "CMP #0 compares ACC with 0 and sets a flag in the status register. JPN LOOP puts LOOP's address into the PC if the flag is NOT set (ACC ≠ 0), so the instructions repeat. Output: 54321.", setup: () => set({ prog: "count", speed: 6 }) },
    { title: "Addressing modes", q: "Step through the addressing-modes program. What does ACC hold after each of LDM #60, LDD 60, LDI 60 and LDX 60 (with IX = 1)?", hint: "Immediate: 60 itself. Direct: the contents of address 60 (62). Indirect: address 60 holds 62, and address 62 holds 99. Indexed: address 60 + 1 = 61, which holds 5.", setup: () => set({ prog: "modes", speed: 2 }) },
    { title: "Summing an array", q: "The sum program uses LDX and INC IX. How does indexed addressing let one loop read every item of the list?", hint: "LDX LIST reads address LIST + IX. Each time round, INC IX moves to the next item. The total is 30 (7 + 3 + 12 + 8).", setup: () => set({ prog: "sum", speed: 10 }) },
    { title: "Bit manipulation", q: "Turn on binary display and step through the bits program. What does AND #15 do? What happens to the top bit after LSL?", hint: "AND with 00001111 is a mask: it keeps the low four bits and clears the rest. LSL #1 doubles the value but the top bit falls off the end of the 8-bit register. LSR #2 divides by 4 (dropping remainders).", setup: () => set({ prog: "bits", speed: 2, bin: true }) },
    { lvl: "adv", title: "Pipelining", q: "Look at the pipeline chart. With a 5-stage pipeline, how many clock cycles do 100 instructions take? What do branches do?", hint: "Without pipelining 100 × 5 = 500. With it, a new instruction finishes every cycle once the pipe is full: 5 + 99 = 104. Each taken branch flushes the instructions already fetched, wasting 4 cycles.", setup: () => set({ prog: "count", speed: 6 }) },
  ],
  batch: [
    { title: "Cycles to sum an array", question: "How many micro-steps does the indexed summing program take for a list of n numbers?", how: "Exact: the program is run with n items (and CMP #n).", xLabel: "items n", yLabel: "micro-steps", xs: [1, 2, 4, 8, 12, 16], reps: 1, yMin: 0, fit: true, run: n => { const s = PROGS.sum.src.replace("CMP #4", "CMP #" + n).replace(/LIST:[\s\S]*$/, "LIST:   " + Array.from({ length: n }, (_, i) => i + 1).join("\n        ")); return runAll(assemble(s)).cycles; }, note: "A straight line: a fixed set-up cost plus the same number of micro-steps for every item (the loop body). The gradient is the cost of one pass round the loop: O(n)." },
    { title: "Memory reads and writes per instruction", question: "For each preset program, how many times is the data bus used per instruction executed?", how: "Exact; x = program number (1 add, 2 count, 3 sum, 4 modes, 5 bits).", xLabel: "program", yLabel: "memory accesses per instruction", xs: [1, 2, 3, 4, 5], reps: 1, yMin: 0, theory: () => 1, theoryLabel: "1 (the fetch alone)", run: k => { const c = runAll(assemble(Object.values(PROGS)[k - 1].src)); return c.memAcc / c.instr; }, note: "Every instruction needs at least one memory access (its fetch); loads and stores need another. That shared memory traffic is the Von Neumann bottleneck." },
    { title: "Pipelining and branches (A level)", question: "100 instructions on a 5-stage pipeline. Each is a taken branch with probability p, which flushes the pipeline (4 wasted cycles). How many cycles?", how: "Each point: one random run of 100 instructions.", xLabel: "probability of a taken branch p", yLabel: "clock cycles", xs: [0, 0.05, 0.1, 0.15, 0.2, 0.3, 0.4], reps: 8, yMin: 0, theory: p => 104 + 400 * p, theoryLabel: "(5 + 99) + 100p × 4", run: (p, r) => { let c = 104; for (let i = 0; i < 100; i++) if (r() < p) c += 4; return c; }, note: "Branches are why pipelined processors try to predict which way a branch will go. Without a pipeline the 100 instructions would take 500 cycles whatever p is." },
    { title: "Pipeline speed-up (A level)", question: "How much faster is a k-stage pipeline than no pipeline, for 100 instructions with no branches?", how: "Exact: speed-up = (100 × k) ÷ (k + 99).", xLabel: "pipeline stages k", yLabel: "speed-up", xs: [1, 2, 3, 4, 5, 6, 8, 10], reps: 1, yMin: 0, theory: k => 100 * k / (k + 99), theoryLabel: "nk/(k + n − 1)", run: k => 100 * k / (k + 99), note: "Almost k times faster for long runs of instructions, as long as every stage takes the same time and nothing stalls." },
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "4.1", text: "Von Neumann: one memory holds both data and instructions; the stored program is fetched and executed one instruction at a time. PC (next instruction's address), MAR (address being used), MDR (data being transferred), CIR (current instruction), ACC (results), IX (index), SR (status flags)." },
      { lvl: "std", tag: "4.1", text: "Fetch in RTN: MAR ← [PC]; PC ← [PC] + 1; MDR ← [[MAR]]; CIR ← [MDR]. Address bus: one-way, CPU to memory. Data bus: two-way. Control bus: signals such as memory read/write and the clock." },
      { lvl: "std", tag: "4.2", text: "Addressing: immediate LDM #n (the value), direct LDD a (value at a), indirect LDI a (address at a), indexed LDX a (value at a + IX), relative (address relative to the current instruction). CMP sets a flag; JPE/JPN jump if equal/not equal." },
      { lvl: "std", tag: "4.3", text: "Bit manipulation: AND with a mask clears bits (keeps where the mask has 1s); OR sets bits; XOR flips bits; LSL n multiplies by 2ⁿ, LSR n divides by 2ⁿ (logical shifts fill with 0)." },
      { lvl: "adv", tag: "15.1", text: "Pipelining: fetch, decode, execute (and more) stages overlap, so one instruction can finish every clock cycle. A branch, or an instruction needing a result not yet ready, can stall or flush the pipeline. RISC (simple, fixed-length instructions) suits pipelining; CISC has complex, variable-length instructions." },
    ],
    questions: [
      { lvl: "std", marks: 4, q: "Describe the fetch stage of the fetch–execute cycle using register transfer notation.", ans: "<ul><li>MAR ← [PC]</li><li>PC ← [PC] + 1</li><li>MDR ← [[MAR]]</li><li>CIR ← [MDR]</li></ul>" },
      { lvl: "std", marks: 3, q: "Address 60 contains 62, address 61 contains 5, address 62 contains 99 and IX = 1. State the value in ACC after (a) LDD 60 (b) LDI 60 (c) LDX 60.", ans: "<ul><li>(a) 62 (direct)</li><li>(b) 99 (indirect: address held at 60)</li><li>(c) 5 (indexed: address 60 + 1)</li></ul>" },
      { lvl: "std", marks: 2, q: () => `ACC holds ${cpu ? cpu.ACC : 182} (${(cpu ? cpu.ACC : 182).toString(2).padStart(8, "0")}). Give the result of AND #15 and of LSL #1.`, ans: () => { const a = cpu ? cpu.ACC : 182; return `<ul><li>AND #15: ${(a & 15).toString(2).padStart(8, "0")} = ${a & 15}</li><li>LSL #1: ${((a << 1) & 255).toString(2).padStart(8, "0")} = ${(a << 1) & 255}</li></ul>`; } },
      { lvl: "adv", marks: 3, q: "Explain how pipelining improves performance and why a conditional jump can reduce the improvement.", ans: "<ul><li>stages of different instructions are carried out at the same time (fetch the next while decoding/executing the current)</li><li>so (ideally) one instruction completes every clock cycle</li><li>if a jump is taken, instructions already fetched are wrong and must be flushed, wasting cycles</li></ul>" },
    ]
  },
  notes: `<h3>What the page does</h3><ul><li>Your program is assembled into memory addresses 0 upwards (labels and ORG are allowed; a line with just a number is data). Each press of Step does one micro-step, shown in register transfer notation; the registers and buses involved are highlighted.</li><li>Instruction set (Cambridge 9618 style): LDM, LDD, LDI, LDX, LDR, MOV IX, STO, ADD, SUB, AND, OR, XOR, LSL, LSR, INC, DEC, CMP, JMP, JPE, JPN, OUT, END. # means immediate.</li><li>Values are 8-bit (0–255) and wrap round.</li></ul>
<h3>Simplifications</h3><ul><li>Real processors split instructions into opcode and operand fields of fixed widths; here each memory word holds a whole instruction.</li><li>One micro-step is not one clock cycle on a real CPU, and the decode stage is shown as a single step.</li><li>The pipeline chart is an idealised 5-stage pipeline; real ones also stall for data hazards.</li></ul>`,
});

// ---------------- 4. Controls ----------------
const C = {};
let g = ui.group("Program");
C.prog = K.seg(g, { value: "add", options: Object.entries(PROGS).map(([k, v]) => [k, v.name]), on: v => set({ prog: v }) });
C.editor = K.$("textarea"); C.editor.style.cssText = "width:100%;height:190px;font:12px Consolas,monospace;background:var(--panel2);color:var(--text);border:1px solid var(--line);border-radius:8px;padding:6px;margin:6px 0"; C.editor.spellcheck = false; g.append(C.editor);
let rw = K.row(g); K.btn(rw, "Assemble and load my program", () => { load(C.editor.value); ui.setPlaying(false); }, "primary");
g = ui.group("Running");
C.speed = K.slider(g, { label: "Micro-steps per second", min: 0.5, max: 20, step: 0.5, value: 2, on: v => P.speed = v });
ui.headerSpeed(C.speed);   // playback speed lives in the header, beside Pause and Reset
C.bin = K.toggle(g, { label: "Show registers in binary", value: false, on: v => P.bin = v });
rw = K.row(g); K.btn(rw, "Step ▸", () => { ui.setPlaying(false); micro(); }, "primary"); K.btn(rw, "Run to END", () => { let k = 0; while (!cpu.halt && k++ < 20000) micro(); });
const read = K.readout(ui.group("Counters"), [["i", "Instructions executed"], ["c", "Micro-steps"], ["m", "Memory accesses"], ["o", "Output"]]);
function set(o, paused) { Object.assign(P, DEF, o); C.prog.set(P.prog); C.speed.set(P.speed); C.bin.set(P.bin); load(PROGS[P.prog].src); if (paused) ui.setPlaying(false); }

// ---------------- 5. Drawing ----------------
const cv = ui.canvas(() => { });
const chA = K.chart(ui.dock, {}), chB = K.chart(ui.dock, {});
const TX = (c, s, x, y, col = "#c9d4ea", al = "left", f = "12px") => { c.fillStyle = col; c.font = f + " Segoe UI,system-ui,sans-serif"; c.textAlign = al; c.fillText(s, x, y); };
const fmtV = v => typeof v === "object" ? v.text : P.bin ? (v & 255).toString(2).padStart(8, "0") : String(v);
function draw() {
  const c = cv.ctx, w = cv.w, h = cv.h; c.fillStyle = "#0b1222"; c.fillRect(0, 0, w, h); if (!cpu) return;
  const hot = new Set(lastStep ? lastStep.regs : []), buses = new Set(lastStep ? lastStep.bus : []);
  // CPU box with registers
  const cx = 20, cy = 40, cw = Math.min(470, w * 0.52), ch = h - 140;
  c.strokeStyle = "#5d6e93"; c.lineWidth = 2; c.strokeRect(cx, cy, cw, ch); c.lineWidth = 1; TX(c, "CPU", cx + 10, cy + 20, "#8fa0bf", "left", "600 13px");
  const regs = [["PC", "program counter"], ["MAR", "memory address register"], ["MDR", "memory data register"], ["CIR", "current instruction register"], ["ACC", "accumulator"], ["IX", "index register"], ["SR", "status register (flag)"]];
  const rh = Math.min(44, (ch - 60) / 7.5);
  regs.forEach(([r, name], i) => { const y = cy + 36 + i * rh, on = hot.has(r); c.fillStyle = on ? "rgba(255,180,84,.25)" : "#121b30"; c.fillRect(cx + 14, y, cw * 0.62, rh - 6); c.strokeStyle = on ? "#ffb454" : "#3a4a6e"; c.strokeRect(cx + 14, y, cw * 0.62, rh - 6); TX(c, r, cx + 24, y + rh / 2 + 2, on ? "#ffd9a0" : "#5ad1ff", "left", "600 14px"); TX(c, name, cx + 70, y + rh / 2 + 1, "#5d6e93", "left", "10px"); TX(c, fmtV(cpu[r]), cx + cw * 0.62 + 6, y + rh / 2 + 3, "#fff", "right", "600 14px Consolas,monospace,"); });
  for (const [u, y, lab] of [["ALU", cy + 36, "arithmetic logic unit"], ["CU", cy + 36 + 2.2 * rh, "control unit"]]) { const on = hot.has(u); c.fillStyle = on ? "rgba(126,231,135,.2)" : "#121b30"; c.fillRect(cx + cw * 0.7, y, cw * 0.27, rh * 1.8); c.strokeStyle = on ? "#7ee787" : "#3a4a6e"; c.strokeRect(cx + cw * 0.7, y, cw * 0.27, rh * 1.8); TX(c, u, cx + cw * 0.835, y + rh * 0.8, on ? "#7ee787" : "#c9d4ea", "center", "600 15px"); TX(c, lab, cx + cw * 0.835, y + rh * 1.25, "#5d6e93", "center", "10px"); }
  // buses between CPU and memory
  const mx = cx + cw + 90, by = [["address", "#ffb454", cy + ch * 0.25], ["data", "#5ad1ff", cy + ch * 0.5], ["control", "#c4a1ff", cy + ch * 0.75]];
  for (const [name, col, y] of by) { const on = buses.has(name); c.strokeStyle = on ? col : "#2a3550"; c.lineWidth = on ? 6 : 3; c.beginPath(); c.moveTo(cx + cw, y); c.lineTo(mx, y); c.stroke(); c.lineWidth = 1; TX(c, name + " bus", (cx + cw + mx) / 2, y - 8, on ? col : "#5d6e93", "center", "600 11px"); }
  // memory: show addresses around the PC and the data area
  const rows = Math.floor((h - 60) / 20), used = Object.keys(asm.srcLine).map(Number).sort((a, b) => a - b), show = used.slice(0, rows);
  TX(c, "MEMORY", mx + 10, cy - 10, "#8fa0bf", "left", "600 13px");
  show.forEach((a, i) => { const y = cy + i * 20, isPC = a === cpu.PC && !cpu.halt, isMAR = a === cpu.MAR && buses.has("address"), wr = a === cpu.written; if (isPC || isMAR || wr) { c.fillStyle = wr ? "rgba(255,107,129,.3)" : isMAR ? "rgba(255,180,84,.25)" : "rgba(90,209,255,.18)"; c.fillRect(mx, y - 2, w - mx - 16, 20); }
    TX(c, String(a).padStart(3, " "), mx + 6, y + 13, "#8fa0bf", "left", "12px Consolas,monospace,"); const v = cpu.mem[a]; TX(c, typeof v === "object" ? v.text : fmtV(v), mx + 46, y + 13, typeof v === "object" ? "#dfe8f7" : "#7ee787", "left", "12px Consolas,monospace,"); if (isPC) TX(c, "◀ PC", w - 22, y + 13, "#5ad1ff", "right", "600 11px"); });
  TX(c, lastStep ? (lastStep.exec ? "EXECUTE: " : si <= 3 && si > 0 ? "FETCH / DECODE: " : "") + lastStep.rtn : "press Step or Play", cx, h - 70, "#ffd166", "left", "600 16px");
  TX(c, "output: " + (cpu.out || "–"), cx, h - 42, "#7ee787", "left", "600 14px Consolas,monospace,");
  if (asm.errs.length) TX(c, "assembler: " + asm.errs.join("; "), cx, h - 18, "#ff6b81", "left", "12px");
  ui.hud(cpu.halt ? "<b>halted</b>" : `next micro-step ${si + 1} of ${steps.length}`);
}
function panels() {
  read.set("i", cpu.instr); read.set("c", cpu.cycles); read.set("m", cpu.memAcc); read.set("o", cpu.out || "–");
  // chart A: a 5-stage pipeline diagram (instructions against clock cycles); chart B: cycles with and without pipelining
  const S = 5, N = 8, names = ["fetch", "decode", "read", "execute", "write"];
  chA.opts.title = "5-stage pipeline: each row is one instruction, colours are stages"; chA.opts.xLabel = "clock cycle"; chA.opts.yLabel = "instruction"; chA.draw([], { xMin: 0, xMax: N + S, yMin: 0, yMax: N + 0.5 });
  const m = chA.map, cx2 = chA.el.querySelector("canvas").getContext("2d"); if (m) for (let i = 0; i < N; i++) for (let s2 = 0; s2 < S; s2++) { const x0 = m.X(i + s2), x1 = m.X(i + s2 + 1), y0 = m.Y(N - i), y1 = m.Y(N - i - 0.8); cx2.fillStyle = K.cssVar("--s" + s2); cx2.fillRect(x0 + 1, y0, x1 - x0 - 2, y1 - y0); if (i === 0 && x1 - x0 > 30) { cx2.fillStyle = "#000"; cx2.font = "9px Segoe UI"; cx2.textAlign = "center"; cx2.fillText(names[s2], (x0 + x1) / 2, (y0 + y1) / 2 + 3); } }
  const A = [], B = []; for (let n = 1; n <= 40; n++) { A.push([n, n * S]); B.push([n, S + n - 1]); }
  chB.opts.title = "Clock cycles for n instructions"; chB.opts.xLabel = "instructions n"; chB.opts.yLabel = "cycles"; chB.draw([{ pts: A, color: K.cssVar("--s3"), label: "no pipeline: 5n" }, { pts: B, color: K.cssVar("--s2"), label: "pipelined: n + 4" }], { yMin: 0 });
}
let frame = 0;
ui.run(dt => { acc += dt * P.speed; while (acc >= 1) { acc--; micro(); } }, () => { draw(); if (frame++ % 6 === 0) panels(); });
set({});
ui.tip("Press Step to do one register transfer at a time, or Play to run. Edit the program in the Controls.", 7000);
