# Markov Chains

A single, self-contained HTML file: Further Maths: hundreds of tokens hop between states using a transition matrix; compare them with πₙ = π₀Tⁿ, find the steady state and long-run proportions, and watch gamblers absorbed at £0 or their target. It needs no install and no
internet: **open `markov-chains.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built with the shared kit from `tools/kit/src/markov_chains.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `markov-chains.html` by hand.

- **Transition matrices:** Uses the matrix multiplication of Pearson Edexcel Further Mathematics Core Pure 3 (8FM0/9FM0): a transition matrix, the distribution after n steps πₙ = π₀Tⁿ, and comparing simulated tokens with the matrix prediction. Markov chains themselves are not a named topic in Edexcel 9FM0; they appear in other boards' Further Statistics and Decision options.
- **Steady states and absorption:** Beyond Edexcel 9FM0: the steady-state (equilibrium) distribution π = πT, long-run proportions of time, absorbing states, the probability of absorption and the expected time to absorption (gambler's ruin).

## What it shows

A diagram of states joined by arrows labelled with probabilities, filled with hundreds of tokens that move each step. The chart compares the fraction of tokens in each state with π₀Tⁿ; one token is followed for ever to measure the long-run share of time against the steady state. Readings show Tⁿ, whose rows converge to π. A level: gambler's ruin with absorbing states, the probability of ruin and the time to absorption.

Try this first: Start every customer with Brand A. Which brand ends up on top?

## Batch run

| Experiment | Result when tested (fixed seeds) |
|---|---|
| Long-run fraction of sunny days | mean 0.625, SD 0.0317, SE 0.00183 from 300 runs (theory: steady state q/(p + q)) |
| Probability of ruin (A level) | 1: 0.922 ± 0.0111 · 2: 0.763 ± 0.0295 · 3: 0.685 ± 0.0253 · 4: 0.637 ± 0.0269 · 5: 0.505 ± 0.0166 · 6: 0.422 ± 0.0193 · 7: 0.343 ± 0.0197 · 8: 0.168 ± 0.0278 · 9: 0.11 ± 0.00913 (mean ± SE, 4 runs each) (theory: 1 − k/N) |
| How long does a game last? (A level) | 1: 7.88 ± 0.813 · 2: 17.3 ± 1.32 · 3: 21.2 ± 1.7 · 4: 22.8 ± 0.755 · 5: 26.4 ± 0.643 · 6: 24.3 ± 0.735 · 7: 22.5 ± 0.863 · 8: 15.1 ± 1.58 · 9: 9.29 ± 0.887 (mean ± SE, 4 runs each) (theory: k(N − k)) |
| Mean return time (A level) | mean 1.6, SD 0.0509, SE 0.00294 from 300 runs (theory: 1/π_sunny) |
| Brand A's share after n months | 0: 1 ± 0 · 1: 0.815 ± 0.0135 · 2: 0.663 ± 0.0038 · 3: 0.565 ± 0.00923 · 5: 0.475 ± 0.00735 · 8: 0.446 ± 0.00865 · 12: 0.397 ± 0.0122 · 20: 0.41 ± 0.0107 (mean ± SE, 5 runs each) (theory: row 1 of Tⁿ) |

## The model

Time-homogeneous Markov chains with the Markov property; steady state found by repeated multiplication. Assumptions and simplifications are listed inside the simulation under **The model**.
