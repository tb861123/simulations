# Fitness Testing

A single, self-contained HTML file: a squad of simulated performers does the
standard fitness tests. It needs no install and no internet: **open
`fitness-testing.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

★ Enhanced: built from `tools/kit/src/fitness_testing.js` by `node build.js`
(run inside `tools/kit/`). Do not edit `fitness-testing.html` by hand. The
earlier version (with the Harvard step test and animated test views) and its
worksheets are kept in [`original/`](original/).

- **Standard (GCSE):** OCR J587 1.2.a: components of fitness, the tests, data
  (mean, median, mode, range, ratings), reliability and validity.
- **Advanced (A level):** OCR H555 1.2: maximal and submaximal, direct and
  indirect tests (Queens College step test); SD; typical error and the smallest
  worthwhile change (beyond the spec).

## What it shows

- A squad (6–30; boys, girls or mixed; 15–16 or 17–19; inactive, typical or
  county level) doing one of 11 tests lane by lane: multi-stage fitness test,
  Cooper run, 30 m sprint, vertical jump, sit and reach, grip dynamometer,
  Illinois agility, ruler drop, sit-up and press-up tests, Queens College.
- Each recorded score = true score + day-to-day + trial + tester error +
  protocol effects (warm-up, practice attempt, motivation, varied conditions,
  trials, best or mean).
- Graphs: squad results coloured by rating; test and retest; before and after
  training (with the smallest worthwhile change); validity against a lab
  criterion; one performer's profile across every test.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| Test and retest (500 performers) | differences: mean −0.27 cm, SD 3.6 cm (√2 × TE) |
| How many ruler drops? | error 2.8 cm (1 drop) to 1.8 cm (10), levelling off |
| Can a retest show a real improvement? | 25% beat the SWC with no gain, 98% with 1.5 levels (Φ((Δ − SWC) ÷ √2 TE)) |
| Ruler drop: distance and reaction time | follows d = ½gt² |
| Does the bleep test measure VO₂ max? | predicted follows true VO₂ max, scatter about 3 ml/kg/min |
