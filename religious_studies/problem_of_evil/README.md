# The Problem of Evil

A single, self-contained HTML file: the logical problem of evil (the inconsistent triad) with the free will defence and the theodicies of Augustine and Irenaeus/Hick; a 'vale of soul-making' world where hardships strike and people freely help or harm; and Rowe's evidential problem worked through with Bayes' theorem and sceptical theism. It needs no install and no
internet: **open `problem-of-evil.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`. The page models arguments so students can test them; it takes no side.

Built from `tools/kit/src/problem_of_evil.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `problem-of-evil.html` by hand.

- **Standard (GCSE):** GCSE Religious Studies: moral and natural evil, the inconsistent triad, Christian responses (free will, soul-making, the Fall).
- **Advanced (A level):** OCR A level Religious Studies (H573/01): the logical problem (Epicurus, Mackie) and evidential problem (Rowe, Paul); Augustine's theodicy; Hick's development of Irenaeus (soul-making, epistemic distance); the free will defence. Bayesian probability and the simulation itself are beyond the spec.

## What it shows

**Soul-making world:** 160 people coloured by virtue; hardships (natural evil) and chosen harms (moral evil) flash; helping and enduring build virtue, crushing suffering destroys it; sliders for how often and how severely hardship strikes, free will and epistemic distance. **Logical problem:** the triad drawn as consistent or inconsistent, with the extra premises each theodicy adds and the main criticisms. **Evidential problem:** belief before and after cases of apparently pointless suffering (Rowe's fawn), with sceptical theism changing the likelihood ratio.

## Batch run

| Experiment | What it compares |
|---|---|
| How much hardship makes souls? | virtue gained against severity (an inverted U in this model) |
| Freedom and virtue | virtue gained against free will |
| Rowe: belief after apparently pointless suffering | posterior from random priors against Bayes from 50% |
| Sceptical theism weakens the evidence (A level) | belief after 10 cases against Bayes |
