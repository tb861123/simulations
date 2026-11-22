# Logic Gates and Circuits

A single, self-contained HTML file: Click the inputs of real gate symbols: NOT, AND, OR, XOR, NAND and NOR with live truth tables, a circuit from a logic expression, half and full adders, XOR from four NAND gates, an SR flip-flop that remembers, a 4-bit ripple-carry adder and Karnaugh maps. It needs no install and no
internet: **open `logic-gates.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built with the shared kit from `tools/kit/src/logic_gates.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `logic-gates.html` by hand.

- **AS Level (9618):** Cambridge International AS & A Level Computer Science 9618 (AS) topic 3.2: the logic gates NOT, AND, OR, NAND, NOR and XOR, their symbols and truth tables; constructing truth tables and logic circuits from a problem statement or logic expression, and writing logic expressions from circuits and truth tables.
- **A Level (9618):** Cambridge International AS & A Level Computer Science 9618 (A Level) topic 15.2: half adder and full adder circuits, SR and JK flip-flops (the role of feedback), Boolean algebra (De Morgan's laws) and Karnaugh maps to simplify expressions.

## What it shows

Circuits drawn with standard gate symbols; click an input to toggle it and wires carrying 1 glow. The full truth table sits beside each circuit with the current row highlighted. A Level: the SR flip-flop's feedback and its history of set/reset pulses, a 4-bit ripple-carry adder showing each carry, and the Karnaugh map of a chosen output with its simplified expression.

Try this first: Set S to 1 and back to 0 on the flip-flop. Why does Q stay at 1?

## Batch run

| Experiment | Result when tested (fixed seeds) |
|---|---|
| Does the adder add? (A level) | mean 1, SD 0, SE 0 from 100 runs (theory: always) |
| How far does the carry ripple? (A level) | 4: 1.19 ± 0.0656 · 8: 2.13 ± 0.0442 · 12: 2.68 ± 0.017 · 16: 3.15 ± 0.101 · 20: 3.62 ± 0.0288 · 24: 3.82 ± 0.0994 · 30: 4.15 ± 0.0826 (mean ± SE, 4 runs each) (theory: ≈ log₂ n − 1) |
| Does the flip-flop remember? (A level) | mean 1, SD 0, SE 0 from 100 runs (theory: always) |

## The model

Ideal gates with no delay; the flip-flop is evaluated repeatedly until its outputs settle. Assumptions and simplifications are listed inside the simulation under **The model**.
