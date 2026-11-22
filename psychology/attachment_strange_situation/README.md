# Attachment: The Strange Situation

A single, self-contained HTML file: Infants whose attachment type grows from their caregiver's sensitivity and consistency go through Ainsworth's seven episodes, with exploration, distress, heart rate and reunion behaviour rated; compare samples with van IJzendoorn and Kroonenberg's cultural data; and watch 60 babies pass through Schaffer and Emerson's stages to multiple attachments. It needs no install and no
internet: **open `attachment-strange-situation.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built with the shared kit from `tools/kit/src/attachment_strange_situation.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `attachment-strange-situation.html` by hand.

- **AS (AQA 7181):** AQA AS and A level Psychology 3.1.3 Attachment: Schaffer's stages of attachment and multiple attachments, the role of the father; Ainsworth's Strange Situation: types of attachment (secure, insecure-avoidant, insecure-resistant); caregiver sensitivity.
- **A level (AQA 7182):** AQA A level Psychology (7182) 3.1.3 Attachment: cultural variations in attachment, including van IJzendoorn; Bowlby's monotropic theory and the internal working model; evaluating the Strange Situation (validity in other cultures, temperament explanations, imposed etic).

## What it shows

The Strange Situation room episode by episode with caregiver, stranger and infant, the observers' ratings and reunion codes, the infant's distress, heart rate and exploration through the seven episodes, and the sample's mix of types against published cultural data. Development: 60 babies with rings for each specific attachment, the percentage with specific and multiple attachments by age, and who they attached to.

Try this first: Watch an avoidant infant. Compare the distress it shows with its heart rate.

## Batch run

| Experiment | Result when tested (fixed seeds) |
|---|---|
| Caregiver sensitivity and secure attachment | 0.4: 28.3 ± 2.4 · 0.5: 42.5 ± 1.73 · 0.6: 61.8 ± 2.14 · 0.7: 75.3 ± 2.6 · 0.8: 85 ± 1.93 (mean ± SE, 6 runs each) |
| How much do small samples vary? (A level) | 20: 74 ± 3.32 · 40: 76.5 ± 2.24 · 80: 72 ± 2.02 · 160: 73.2 ± 0.957 · 320: 74.3 ± 0.68 (mean ± SE, 10 runs each) (theory: population ≈ 75%) |
| The father's responsiveness | 0.2: 62.7 ± 2.33 · 0.4: 73.3 ± 1.83 · 0.55: 85 ± 1.9 · 0.7: 94 ± 1.25 · 0.9: 99.3 ± 0.408 (mean ± SE, 5 runs each) |
| Time spent v responsiveness | 0.1: 21.7 ± 2.79 · 0.3: 26 ± 2.72 · 0.5: 31 ± 3.27 · 0.7: 27.3 ± 2.08 · 1: 33.7 ± 3.85 (mean ± SE, 5 runs each) |

## The model

Infants learn trust and predictability from a year of bids for comfort to a caregiver with set sensitivity and consistency; avoidance and resistance scores (plus temperament and cultural novelty of separation) give the type; first-order arousal dynamics in each episode; bonds to four carers growing with responsiveness for the development stages. Assumptions and simplifications are listed inside the simulation under **The model**.
