# Fourier Epicycles

A single, self-contained HTML file: any closed drawing rebuilt from a chain of
spinning circles (the discrete Fourier transform). It needs no install and no
internet: **open `fourier-epicycles.html` in Chrome or Edge**. The circles and
the trace are drawn with WebGL; if WebGL is switched off the page says so, and
the Batch run still works.

Built with the kit from `tools/kit/src/fourier_epicycles.js` by
`node build.js` (run inside `tools/kit/`). Do not edit
`fourier-epicycles.html` by hand. It is an "explore" simulation: no
Standard / Advanced switch and no Revise tab.

## What you can do

- Pick a heart, bird, star, square or circle, or **draw your own** with the
  mouse. The drawing is sampled at 256 points equally spaced along it and
  transformed into 256 circles (k = −128 … 127), biggest first.
- Choose how many circles to use (1–256), the speed, and whether to show the
  circles and the original. Charts show the circle sizes and the error against
  the number of circles (from Parseval's theorem).
- **Play the shape:** the x-coordinate, built from the circles in use, is
  played as a sound at 110 Hz; fewer circles sound duller.
- The Emanuel crest is not included (it could not be traced reliably), but it
  can be drawn by hand.

## Investigate

How few circles? · Corners are expensive · Draw your own · Which way round? ·
Hear the shape

## Batch run

| Experiment | Result when tested |
|---|---|
| Error against circles: the heart | RMS error 0.19 (1 circle), 0.040 (8), 0.0086 (20), 0.0020 (50); Parseval's prediction to within a few % |
| Error against circles: the square | 0.11 (1), 0.0058 (8), 0.0015 (20), 0.00043 (50): about M^(−1.5) |
| How many circles for 1%? | circle 1, star 4, square 5, heart 13, bird 16 |

`worksheets.html` has the full test-run numbers.

## The model

The full assumptions are in the page's "The model" tab: 256 samples, a gap in
a drawing closed with a straight line, sound from the x-coordinate only.
