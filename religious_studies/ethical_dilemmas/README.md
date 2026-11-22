# Ethical Theories and Dilemmas

A single, self-contained HTML file: natural law, Kantian ethics, utilitarianism (act or rule) and situation ethics applied side by side to six dilemmas, with each theory's reasoning, the hedonic calculus, and a model society where act and rule utilitarians make and break promises. It needs no install and no
internet: **open `ethical-dilemmas.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`. The page models arguments so students can test them; it takes no side.

Built from `tools/kit/src/ethical_dilemmas.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `ethical-dilemmas.html` by hand.

- **Standard (GCSE):** GCSE Religious Studies: absolute and relative morality, situation ethics and agape, sanctity of life, euthanasia.
- **Advanced (A level):** OCR A level Religious Studies (H573/02) Religion and ethics: natural law and double effect, situation ethics, Kantian ethics, Bentham's and Mill's utilitarianism, applied to euthanasia and business ethics (whistleblowing). Ross's prima facie duties and game theory are beyond the spec.

## What it shows

**Dilemmas:** the switch and footbridge trolley cases, the murderer at the door, voluntary euthanasia, whistleblowing and a broken promise; a short story and picture, then four cards giving each theory's verdict (✔, ✘ or disputed) and its reasons. Sliders for the number saved, the chance of success, the patient's suffering, and act or rule utilitarianism. Charts of the hedonic calculus and of how many theories support acting in each dilemma. **Society of promises (A level):** 200 people of different moral types making deals; act utilitarians break promises when it does more good right now, and trust and welfare fall.

## Batch run

| Experiment | What it compares |
|---|---|
| Act utilitarians and welfare | average welfare against the share of act utilitarians |
| Trust in the long run | trust against 1 − fraction × P(break) |
| Where Kant and utilitarianism part company | agreement in random rescue dilemmas against 100(1 − q) |
| Hedonic calculus and certainty | net score with students' disagreement against the exact calculus |
