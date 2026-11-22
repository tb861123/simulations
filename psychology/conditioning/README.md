# Learning: Conditioning

A single, self-contained HTML file: Condition Pavlov's dog to a bell and watch the Rescorla–Wagner learning curve, extinction, spontaneous recovery and generalisation; then train a rat in a Skinner box on continuous, ratio and interval schedules and see which is hardest to extinguish. It needs no install and no
internet: **open `conditioning.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built with the shared kit from `tools/kit/src/conditioning.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `conditioning.html` by hand.

- **AS (AQA 7181):** AQA AS and A level Psychology (7181/7182) 3.2.1 Approaches: the behaviourist approach: classical conditioning (Pavlov) and operant conditioning (Skinner): types of reinforcement and punishment; also 3.1.4 Psychopathology: the two-process model of phobias (classical conditioning to acquire, operant conditioning to maintain).
- **A level (AQA 7182):** AQA A level Psychology (7182): evaluating the behaviourist approach (lab experiments with animals, extrapolation to humans, determinism) and applying learning theory: schedules of reinforcement, extinction, the partial reinforcement effect and behavioural therapies (systematic desensitisation, flooding, token economies).

## What it shows

Classical: the dog, bell and saliva tube, the learning curve trial by trial (drops and 10 × associative strength), and the generalisation gradient to bells of other pitches. Operant: the rat in the Skinner box, the cumulative record (presses against time) and the rat's chance of pressing each second.

Try this first: Train the rat on variable ratio, then switch on extinction. How long does it keep pressing?

## Batch run

| Experiment | Result when tested (fixed seeds) |
|---|---|
| Rescorla–Wagner learning curve | 1: 0.25 ± 0.164 · 2: 2.13 ± 0.35 · 4: 5.13 ± 0.441 · 6: 7.63 ± 0.375 · 8: 7.63 ± 0.46 · 12: 8.5 ± 0.567 · 16: 9.75 ± 0.366 · 24: 9.75 ± 0.491 (mean ± SE, 8 runs each) (theory: 10(1 − 0.8ⁿ⁻¹)) |
| Generalisation gradient | 0: 10.1 ± 0.515 · 0.5: 8.88 ± 0.441 · 1: 8.13 ± 0.398 · 1.5: 6.25 ± 0.453 · 2: 4.38 ± 0.42 · 3: 1.5 ± 0.267 · 4: 0.375 ± 0.183 (mean ± SE, 8 runs each) (theory: bell-shaped gradient) |
| Partial reinforcement extinction effect (A level) | 1: 51.8 ± 2.93 · 2: 65 ± 1.96 · 5: 101 ± 6.38 · 10: 151 ± 6.91 · 20: 241 ± 31.5 (mean ± SE, 4 runs each) |
| Response rate under ratio schedules | 1: 57.1 ± 0.0854 · 2: 57 ± 0.25 · 5: 55.8 ± 1.32 · 10: 49.6 ± 7.24 · 20: 52.3 ± 2.11 · 40: 34.8 ± 3.49 (mean ± SE, 4 runs each) |

## The model

Rescorla–Wagner associative learning (ΔV = αβ(λ − V)) with a Gaussian generalisation gradient; a probabilistic lever-pressing rat whose press rate rises with reinforcement and fades in extinction more slowly the leaner its training schedule. Assumptions and simplifications are listed inside the simulation under **The model**.
