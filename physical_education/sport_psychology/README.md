# Motivation, Confidence and Leadership

A single, self-contained HTML file: a season of matches explained by attribution and self-efficacy, achievement motivation and the challenges athletes choose, and leaders who do or do not fit their team. It needs no install and no
internet: **open `sport-psychology.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Kit-built: made from `tools/kit/src/sport_psychology.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `sport-psychology.html` by hand.

- **Standard (GCSE):** OCR GCSE (9–1) Physical Education (J587) 2.2: goal setting, motivation and confidence.
- **Advanced (A level):** OCR A level Physical Education (H555) 2.2: achievement motivation (Atkinson and McClelland), attribution (Weiner, learned helplessness, retraining), self-efficacy (Bandura), goal setting, leadership (Chelladurai, Fiedler).

## What it shows

**A season:** 30 matches as wins and losses, each explained by the athlete's attribution style (self-serving, learned helplessness, mastery) and counted on Weiner's 2 × 2 grid; self-efficacy and effort rise or fall, helped by goal quality and Bandura's other sources; athletes can drop out. **Achievement motivation** (A level): NAch and NAF decide which opponent an athlete chooses. **Leadership** (A level): Chelladurai's required, preferred and actual behaviour; Fiedler's contingency model.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| Goal setting and wins | 18.5 wins with vague goals, 19.8 with SMART goals |
| Attribution style and dropping out | none drop out (self-serving, mastery); 93% with learned helplessness |
| Sources of self-efficacy | 0.57 with none, 0.92 with all three |
| Atkinson: tendency against chance of success | greatest at Pₛ = 0.5 (0.15) |
| Fiedler: which leader when? | task leaders +20 at the extremes, person leaders +15 in the middle |
