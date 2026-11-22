# Models of Memory

A single, self-contained HTML file: A class of simulated participants learns word lists through a multi-store model with a rehearsal buffer: the serial position curve, primacy and recency, Glanzer and Cunitz's delay, Peterson and Peterson's STM duration, digit span, and dual tasks in the working memory model. It needs no install and no
internet: **open `memory-models.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built with the shared kit from `tools/kit/src/memory_models.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `memory-models.html` by hand.

- **AS (AQA 7181):** AQA AS and A level Psychology (7181/7182) 3.1.2 Memory: the multi-store model (sensory register, STM, LTM; coding, capacity and duration), types of long-term memory, the working memory model (central executive, phonological loop, visuo-spatial sketchpad, episodic buffer), explanations for forgetting, eyewitness testimony.
- **A level (AQA 7182):** AQA A level Psychology (7182) Memory plus Research methods: evaluating the classic studies (Peterson and Peterson, Jacobs, Miller, Glanzer and Cunitz, Baddeley) for validity, controls and sampling; interpreting curves and dual-task data; and the strengths and limitations of each model.

## What it shows

Free recall: one participant's sensory register, STM rehearsal buffer and LTM as each word arrives, then the whole class's serial position curve (with and without a counting delay) and the rehearsal time each position received. STM duration: a class recalling trigrams after counting backwards. Capacity: everyone's letter or digit span, with or without chunking. A level: the working memory model with the components a dual task uses, and the times for each condition.

Try this first: Make them count backwards for 30 s before recall. Which end of the curve vanishes?

## Batch run

| Experiment | Result when tested (fixed seeds) |
|---|---|
| Serial position curve | 1: 0.567 ± 0.0236 · 2: 0.5 ± 0.0304 · 3: 0.292 ± 0.0551 · 4: 0.2 ± 0.0609 · 5: 0.233 ± 0.0333 · 7: 0.3 ± 0.0653 · 9: 0.275 ± 0.016 · 11: 0.358 ± 0.021 · 13: 0.617 ± 0.0518 · 14: 0.717 ± 0.0397 · 15: 0.958 ± 0.016 (mean ± SE, 4 runs each) |
| Glanzer and Cunitz: does a delay remove recency? | 0: 0.95 ± 0.00745 · 10: 0.05 ± 0.0143 · 30: 0.0833 ± 0.0167 (mean ± SE, 6 runs each) |
| Peterson and Peterson: duration of STM | 3: 0.727 ± 0.0226 · 6: 0.501 ± 0.0155 · 9: 0.29 ± 0.0267 · 12: 0.164 ± 0.0015 · 15: 0.111 ± 0.0119 · 18: 0.0807 ± 0.0161 (mean ± SE, 4 runs each) (theory: fitted decay 1.18e^(−t/6.5)) |
| Digit span (Jacobs) | mean 9.36, SD 1.33, SE 0.0664 from 400 runs (theory: Jacobs: 9.3 digits) |
| Dual-task interference (A level) | mean 0.622, SD 0.282, SE 0.0163 from 300 runs (theory: model's average slow-down) |

## The model

A rehearsal-buffer version of the multi-store model (displacement from a few STM slots, LTM transfer growing with rehearsal time); fitted curves for STM duration; normal spans around Jacobs' means; illustrative dual-task times. Assumptions and simplifications are listed inside the simulation under **The model**.
