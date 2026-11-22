# Arguments: Validity and Soundness

A single, self-contained HTML file: build categorical syllogisms and test them with a Venn diagram (valid or invalid, which rule is broken, a counterexample, sound or unsound), hunt through all 256 forms, and set out the ontological, cosmological and teleological arguments as premise chains to see how strong their conclusions can be. It needs no install and no
internet: **open `argument-validity.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`. The page models arguments so students can test them; it takes no side.

Built from `tools/kit/src/argument_validity.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `argument-validity.html` by hand.

- **Standard (GCSE):** GCSE Religious Studies: arguments for the existence of God (design, first cause) and evaluating arguments.
- **Advanced (A level):** OCR A level Religious Studies (H573/01) Philosophy of religion: teleological (Aquinas, Paley, Hume, Darwin), cosmological (Aquinas, Hume, Russell) and ontological (Anselm, Gaunilo, Kant) arguments; deductive and inductive, a priori and a posteriori. Formal syllogistic logic and probability bounds are beyond the spec.

## What it shows

**Syllogisms:** six examples (true and valid, valid but false, invalid with true premises, illicit major, a cosmological syllogism, an ontological one) or any mood and figure; the argument in words, VALID or INVALID with the rule broken, sound or unsound, and a Venn diagram with shaded empty regions, × marks and a highlighted counterexample; existential import at A level; a random hunt through forms. **Arguments for God:** each premise of Anselm's ontological argument, the kalam, Aquinas' Third Way and Paley's watch with a belief slider; the least belief the conclusion is guaranteed, the belief if premises are independent, and the main criticisms.

## Batch run

| Experiment | What it compares |
|---|---|
| How many syllogisms are valid? | % valid of random forms against 15/256 |
| With existential import (A level) | % valid against 24/256 |
| Long chains of premises | % of worlds with all premises true against 0.9ⁿ |
| Students judging validity (belief bias) | simulated acceptance of invalid-believable arguments against Evans et al. (1983) |
