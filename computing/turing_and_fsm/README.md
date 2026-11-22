# State Machines and Turing Machines

A single, self-contained HTML file: Feed input to state-transition diagrams (a vending machine, a door lock, binary patterns) and watch each transition, then step a Turing machine along its tape with its rule table: adding 1 in binary, unary addition and a busy beaver. It needs no install and no
internet: **open `turing-and-fsm.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built with the shared kit from `tools/kit/src/turing_and_fsm.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `turing-and-fsm.html` by hand.

- **State diagrams (9618):** Cambridge International AS & A Level Computer Science 9618 (AS) topic 12.2 program design: state-transition diagrams to document an algorithm, with states, transitions, inputs, a start state and accepting (final) states.
- **Turing machines (beyond):** Beyond the 9618 syllabus: Turing machines (tape, head, states and transition rules) as a model of computation, and why a Turing machine can do anything a computer can (the Church–Turing thesis). Useful background for A Level 'computational thinking' and further study.

## What it shows

A state-transition diagram with the current state glowing and the transition just taken highlighted as your input string is read, with the result (accepted or rejected), the path of states, and the fraction of all inputs accepted. Beyond the syllabus: a Turing machine's tape and head with its rule table, the rule just used highlighted, and charts of the head position and the 1s on the tape.

Try this first: Type 21123 into the door lock. Which key opens it, and why does 1 restart the code?

## Batch run

| Experiment | Result when tested (fixed seeds) |
|---|---|
| Random binary strings: divisible by 3? | 1: 0.482 ± 0.0104 · 2: 0.532 ± 0.0239 · 3: 0.371 ± 0.0187 · 4: 0.368 ± 0.0129 · 6: 0.351 ± 0.0152 · 8: 0.342 ± 0.0138 · 12: 0.333 ± 0.0126 · 16: 0.352 ± 0.0154 (mean ± SE, 4 runs each) (theory: exact count) |
| Random strings ending in 01 | 2: 0.246 ± 0.00551 · 3: 0.243 ± 0.0161 · 4: 0.262 ± 0.0188 · 6: 0.267 ± 0.00991 · 8: 0.245 ± 0.00687 · 12: 0.25 ± 0.00828 (mean ± SE, 4 runs each) (theory: ¼) |
| Steps for the Turing machine to add 1 (A level) | 2: 5.05 ± 0.0412 · 4: 6.96 ± 0.0432 · 6: 8.96 ± 0.0911 · 8: 10.9 ± 0.0746 · 12: 15 ± 0.0655 · 16: 19 ± 0.136 (mean ± SE, 4 runs each) (theory: ≈ n + 3 (n moves right, then about 2 back)) |

## The model

Deterministic finite automata and single-tape Turing machines. Assumptions and simplifications are listed inside the simulation under **The model**.
