# CPU: Fetch–Decode–Execute

A single, self-contained HTML file: Step through the fetch–execute cycle one register transfer at a time: PC, MAR, MDR, CIR, ACC, IX and the status register, the address, data and control buses, and programs in the Cambridge assembly language with immediate, direct, indirect and indexed addressing, bit manipulation and pipelining. It needs no install and no
internet: **open `cpu-fetch-execute.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built with the shared kit from `tools/kit/src/cpu_fetch_execute.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `cpu-fetch-execute.html` by hand.

- **AS Level (9618):** Cambridge International AS & A Level Computer Science 9618 (AS) topic 4: Von Neumann architecture; the registers PC, MAR, MDR, CIR, ACC, IX and SR; ALU, CU, system clock; address, data and control buses; the fetch–execute cycle in register transfer notation; the 9618 assembly language instruction set; immediate, direct, indirect, indexed and relative addressing; bit manipulation (AND, OR, XOR, shifts).
- **A Level (9618):** Cambridge International AS & A Level Computer Science 9618 (A Level) topic 15.1: RISC and CISC processors and pipelining (instruction-level parallelism): how a pipeline speeds up execution and why branches cause it to be flushed.

## What it shows

A CPU diagram with its registers, ALU and control unit, the three buses and memory. Each Step performs one micro-step, written in register transfer notation, lighting up the registers and buses it uses. Five preset programs (and your own, typed in): adding two numbers, a count-down loop, summing an array with indexed addressing, the four addressing modes side by side, and bit masks and shifts. Charts show a 5-stage pipeline and cycles with and without pipelining.

Try this first: Step through LDI 60. Why does it read memory twice?

## Batch run

| Experiment | Result when tested (fixed seeds) |
|---|---|
| Cycles to sum an array | 1: 77 ± 0 · 2: 132 ± 0 · 4: 242 ± 0 · 8: 462 ± 0 · 12: 682 ± 0 · 16: 902 ± 0 (mean ± SE, 1 runs each) |
| Memory reads and writes per instruction | 1: 1.6 ± 0 · 2: 1.27 ± 0 · 3: 1.52 ± 0 · 4: 1.67 ± 0 · 5: 1.14 ± 0 (mean ± SE, 1 runs each) (theory: 1 (the fetch alone)) |
| Pipelining and branches (A level) | 0: 104 ± 0 · 0.05: 124 ± 3.33 · 0.1: 145 ± 4.39 · 0.15: 169 ± 6.57 · 0.2: 183 ± 4 · 0.3: 226 ± 6.46 · 0.4: 263 ± 8.68 (mean ± SE, 8 runs each) (theory: (5 + 99) + 100p × 4) |
| Pipeline speed-up (A level) | 1: 1 ± 0 · 2: 1.98 ± 0 · 3: 2.94 ± 0 · 4: 3.88 ± 0 · 5: 4.81 ± 0 · 6: 5.71 ± 0 · 8: 7.48 ± 0 · 10: 9.17 ± 0 (mean ± SE, 1 runs each) (theory: nk/(k + n − 1)) |

## The model

An 8-bit accumulator machine running a subset of the Cambridge 9618 instruction set; one memory word per instruction. Assumptions and simplifications are listed inside the simulation under **The model**.
