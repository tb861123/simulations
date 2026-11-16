# Homeostasis

A single, self-contained HTML file for iGCSE biology with an A level option.
It needs no install and no internet: **open `homeostasis.html` in Chrome or
Edge**.

★ Enhanced: built from `tools/kit/src/homeostasis.js` by `node build.js` (run
inside `tools/kit/`). Do not edit `homeostasis.html` by hand. The earlier
version and its worksheets are kept in [`original/`](original/).

- **Standard (iGCSE):** Pearson Edexcel International GCSE Biology (4BI1) 2(j)
  homeostasis, insulin and blood glucose, thermoregulation, hormones; 2(i)
  excretion, the kidney and ADH (Biology only).
- **Advanced (A level):** OCR A level Biology A (H420) 5.1.1 (negative and
  positive feedback, endotherms and ectotherms), 5.1.2 (the kidney, ADH),
  5.1.4 (insulin, glucagon, diabetes types 1 and 2).

## Four views

- **🩸 Blood glucose:** a day from 06:00 with three meals; the gut, liver,
  pancreas, muscle and brain joined by the blood, with arrow widths showing
  each rate. No diabetes, type 2 or type 1; treatments: insulin injections,
  metformin, a walk after lunch. A glucose tolerance test button. Charts:
  glucose through the day (with the no-diabetes day); insulin, glucagon and
  glycogen (or the tolerance tests against WHO thresholds).
- **🌡️ Body temperature:** a person in a room (air temperature, humidity,
  activity, clothes) with sweating, shivering and skin blood flow; switch the
  hypothalamus control off; at A level a lizard basking and sheltering. Charts:
  core and skin temperature; the responses.
- **🫘 Kidney and water:** a nephron, ADH and a bladder; drink water, eat a salty
  meal, exercise in the heat; blood glucose and the renal threshold; diabetes
  insipidus (A level). Charts: urine flow and ADH; blood concentration.
- **📡 Feedback:** the negative feedback loop with a disturb button; positive
  feedback at A level.

## Investigate

A day of meals · Type 1 diabetes · Type 2 diabetes · Glucose tolerance test ·
A hot day · Out in the cold · Drinking and ADH · Glucose in the urine · (A
level) Endotherm and ectotherm · Positive feedback.

## Batch run

| Experiment | Result when tested |
|---|---|
| Glucose tolerance test | no diabetes 4.9, type 2 10.9, type 1 18.6 mmol/L at 2 hours |
| Insulin sensitivity and the peak after a meal | 8.2 mmol/L at 20% sensitivity, 6.3 at normal |
| Core temperature against air temperature | 36.9–37.3 °C from −5 to 40 °C (no control: 35.1 to 40.7) |
| Sweating and air temperature | 155 W at 10 °C to 311 W at 40 °C (walking) |
| Drinking and urine | 73 cm³ in 2 hours with no drink, 613 cm³ after 1 litre |
| The renal threshold | none below 10 mmol/L, then rising in proportion |

## The models and their simplifications

Simple one-compartment models with typical adult values, not medical advice.
Glucose: absorption from the gut, insulin from beta cells (none in type 1,
much less in type 2), uptake and glycogen storage, glucagon release, brain
use, loss in urine above 10 mmol/L. Temperature: heat made against heat lost
from the skin and by sweating, with control in proportion to the error.
Water: ADH rises with blood concentration; urine flow falls as ADH rises. The
earlier version's nephron detail, urine tests, colorimeter, kidney failure
and dialysis, and the beta-cell and cAMP diagrams are not included.
