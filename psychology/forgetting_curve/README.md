# Forgetting

A single, self-contained HTML file: Why we forget, with simulated classes: the forgetting curve and why spaced revision beats cramming, proactive and retroactive interference that grows with similarity, and context- and state-dependent retrieval failure in a Godden and Baddeley style 2 × 2 study. It needs no install and no
internet: **open `forgetting-curve.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built with the shared kit from `tools/kit/src/forgetting_curve.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `forgetting-curve.html` by hand.

- **AS (AQA 7181):** AQA AS and A level Psychology (7181/7182) 3.1.2 Memory: explanations for forgetting: proactive and retroactive interference, and retrieval failure due to the absence of cues (context- and state-dependent forgetting, encoding specificity).
- **A level (AQA 7182):** AQA A level Psychology (7182) Memory and research methods: evaluating forgetting research (McGeoch and McDonald, Godden and Baddeley, Carter and Cassaday) for ecological validity and controls; designing and analysing experiments (independent groups and repeated measures; the 2 × 2 design). The forgetting curve and spacing effect are applied research, beyond the specification.

## What it shows

Forgetting curve: every student's retention over the weeks to an exam for learn-once, cramming, spaced and expanding schedules. Interference: control and experimental groups as rows of people with their recall, the similarity effect and score distributions. Retrieval cues: four groups (learn and recall on land or under water, or with and without a drug), their means and an interaction plot.

Try this first: Cram four reviews into day 1, then spread four over two weeks. Which survives to the exam?

## Batch run

| Experiment | Result when tested (fixed seeds) |
|---|---|
| Ebbinghaus forgetting curve | 0: 1 ± 0 · 0.5: 0.63 ± 0.00154 · 1: 0.502 ± 0.00333 · 2: 0.38 ± 0.00249 · 4: 0.282 ± 0.0022 · 7: 0.212 ± 0.00304 · 14: 0.155 ± 0.00131 · 30: 0.106 ± 0.00118 (mean ± SE, 4 runs each) (theory: (1 + 3t/S)^−½ for the average person) |
| How many spaced reviews? | 0: 0.106 ± 0.00134 · 1: 0.164 ± 0.00143 · 2: 0.232 ± 8.49e-4 · 3: 0.327 ± 0.00178 · 4: 0.472 ± 0.00134 · 5: 0.686 ± 9.33e-4 (mean ± SE, 4 runs each) |
| Similarity and retroactive interference | 0: 14.1 ± 0.217 · 0.2: 12.2 ± 0.22 · 0.4: 10.4 ± 0.132 · 0.6: 8.38 ± 0.201 · 0.8: 6.94 ± 0.179 · 1: 4.96 ± 0.146 (mean ± SE, 4 runs each) (theory: model average) |
| Godden and Baddeley: matched minus mismatched | mean 4.02, SD 0.779, SE 0.045 from 300 runs (theory: model effect) |

## The model

A power-law forgetting curve whose stability grows with each review (more after some forgetting); interference proportional to similarity; a fixed proportional loss for mismatched cues; normal individual differences. Assumptions and simplifications are listed inside the simulation under **The model**.
