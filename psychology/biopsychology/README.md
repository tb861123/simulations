# Biopsychology: Synapse, Stress and Rhythms

A single, self-contained HTML file: Fire excitatory and inhibitory synapses into a neuron and see summation, reuptake blockers and antagonists at work; trigger the fight-or-flight response and follow adrenaline (SAM pathway) and cortisol (HPA axis); at A level, watch the body clock free-run in a cave and re-entrain after jet lag. (The nerve impulse itself is in Medicine: Nerve Impulse.). It needs no install and no
internet: **open `biopsychology.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built with the shared kit from `tools/kit/src/biopsychology.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `biopsychology.html` by hand.

- **AS (AQA 7181):** AQA AS Psychology (7181) 3.2.1 Biopsychology: the divisions of the nervous system (central and peripheral, somatic and autonomic); the structure and function of sensory, relay and motor neurons; the process of synaptic transmission, including reference to neurotransmitters, excitation and inhibition; the function of the endocrine system (glands and hormones); the fight-or-flight response including the role of adrenaline.
- **A level (AQA 7182):** AQA A level Psychology (7182) 3.2.2 Biopsychology: all of the AS content plus biological rhythms: circadian, infradian and ultradian rhythms and the difference between them; the effect of endogenous pacemakers and exogenous zeitgebers on the sleep/wake cycle. Also links to stress (HPA axis and cortisol) in the Stress option.

## What it shows

Synapse: three presynaptic terminals with transmitter in each cleft, the postsynaptic membrane potential against threshold, and the transmitter levels over time. Fight or flight: a body diagram with the two pathways lighting up, adrenaline and cortisol against time, and heart rate. Body clock: an actogram of sleep and daylight day by day, sleep onset each day and the phase response curve.

Try this first: Press 'E1 + E2 together', then 'E1 ×3 quickly'. Which kind of summation is each?

## Batch run

| Experiment | Result when tested (fixed seeds) |
|---|---|
| Temporal summation | 10: 0.2 ± 0.122 · 25: 2 ± 0.354 · 50: 8.4 ± 1.25 · 75: 16.6 ± 1.13 · 100: 25.5 ± 1.39 · 150: 43.3 ± 2.16 · 200: 60.4 ± 2.07 (mean ± SE, 5 runs each) |
| Inhibition | 0: 29.6 ± 2.02 · 20: 25.8 ± 1.01 · 40: 23.5 ± 1.06 · 60: 19.3 ± 0.86 · 80: 15.8 ± 1.44 · 100: 15.4 ± 1.59 · 140: 10.5 ± 0.548 (mean ± SE, 5 runs each) |
| Beta-blockers and heart rate | 0: 130 ± 0.115 · 0.2: 118 ± 0.086 · 0.4: 105 ± 0.0663 · 0.6: 92.9 ± 0.0429 · 0.8: 80.4 ± 0.0182 (mean ± SE, 6 runs each) (theory: model, typical person) |
| Jet lag: days to re-entrain (A level) | -9: 11 ± 0 · -6: 7 ± 0 · -3: 3 ± 0 · 3: 4 ± 0 · 6: 9 ± 0 · 9: 13 ± 0 (mean ± SE, 4 runs each) |

## The model

A leaky integrate-and-fire neuron driven by transmitter in three clefts; linked first-order equations for the SAM pathway and HPA axis with negative feedback; a phase-oscillator body clock reset by light through a phase response curve. Assumptions and simplifications are listed inside the simulation under **The model**.
