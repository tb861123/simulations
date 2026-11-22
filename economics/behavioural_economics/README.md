# Behavioural Economics

A single, self-contained HTML file: four hundred simulated people with predictable biases: pension defaults, anchoring, present bias at the gym, herding, fairness in the ultimatum game and social-norm letters, each compared with a perfectly rational robot. It needs no install and no
internet: **open `behavioural-economics.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Kit-built: made from `tools/kit/src/behavioural_economics.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `behavioural-economics.html` by hand.

- **Standard:** Pearson Edexcel A level Economics A (9EC0) 1.2.8: rationality and its limits: bounded rationality and self-control, biases (rules of thumb, anchoring, social norms), fairness. (Not in iGCSE.)
- **Advanced (A level):** 9EC0 1.2.8 and 1.4.1: choice architecture and nudges (defaults, restricted and mandated choice, framing), their effectiveness and limits; links to game theory. Information cascades and the boomerang effect go beyond the specification.

## What it shows

Six scenarios on a crowd of 400 people, each dot coloured by what that person did. **Pensions:** opt-in, active choice or opt-out against inertia, with who is nudged the 'wrong' way. **Anchoring:** bids for wine against phone-number digits. **Present bias:** gym members who plan five visits and go fewer. **Herding:** diners queueing for two restaurants form information cascades. **Fairness:** the ultimatum game, acceptance and the proposer's best offer. **Social norms** (A level): energy letters and the boomerang effect, fixed by a smiley.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| Opt-in, active choice or opt-out? | 55% enrolled under opt-in, 88% active choice, 97% opt-out |
| Inertia and opt-in | 90% with no inertia, falling to 32% at inertia 1.5 |
| Anchoring: bids by phone number | £24.6 at anchor 10 to £48.5 at 90 (0.7 × £30 + 0.3 × anchor: £24 to £48) |
| Present bias and the price of a visit | £25 a visit at β = 0.6, £8.85 at β = 1 (£50 ÷ expected visits) |
| How often does the herd go wrong? | 38% of crowds wrong at q = 0.55, 11% at 0.7, none at 0.9 (theory 45%, 16%, 1%) |
| Ultimatum: the most profitable offer | £5.00 at a 40% offer, £0.27 at 10% |
| Social-norm letters across 200 towns | average use falls by 0.8% (SD 0.08) |
