# Skill Acquisition and Reaction Time

A single, self-contained HTML file on reaction time, information processing,
practice and the learning curve. It needs no install and no internet: **open
`skill-acquisition.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

★ Enhanced: built from `tools/kit/src/skill_acquisition.js` by `node build.js`
(run inside `tools/kit/`). Do not edit `skill-acquisition.html` by hand. The
earlier version (with memory models) and its worksheets are kept in
[`original/`](original/).

- **Standard (GCSE):** OCR J587 2.2: classification (difficulty, environment),
  guidance, feedback, reaction and response time. Hick's law, the PRP and
  learning curves are tagged as enrichment.
- **Advanced (A level):** OCR H555 2.1: more continua, types of practice,
  Fitts and Posner's stages, the single-channel hypothesis, schema theory.

## Five views

Reaction time (a simulated performer, and **take the test yourself** with the
keyboard: 1 choice or a full Hick's law test) · Processing (input, decision,
output, feedback, with a dummy and the PRP) · Practice (12 skills; whole, part
or progressive part; rest; fixed or variable; guidance; feedback type and
frequency; learning curves, stages and retention) · Classifying (the skills on
the continua, with a test-yourself mode) · Schema (A level: beanbag throws with
fixed or variable practice, then a new target).

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| Does Hick's law hold? | 0.221 … 0.589 s for 1–8 choices (0.221 + 0.123 log₂N) |
| How much does a single reaction vary? | mean 0.222 s, SD 0.039 s, skewed |
| The PRP | 0.36 s at 0.02 s, 0.50 s at 0.06 s, falling to 0.34 s by 0.25 s |
| Massed or distributed practice? | retention 60% with no rest, 83% with 60 s |
| Part or whole practice? | part − whole +16 points at organisation 0, −12 at 1 |
| Variable practice and schema | error at 9 m: 1.2 m (fixed) to 0.26 m (± 3 m) |
