# Running the Economy

Set Bank Rate, government spending, taxes and supply-side policy, and steer
an economy a quarter at a time towards five targets. A town shows how the
economy feels: smoke from the factories, prices in the shops, the queue at
the Jobcentre, Bank Rate on the Bank of England.

## How to run

Open `running-the-economy.html` in Chrome or Edge. Nothing to install; works offline.

## What it shows

- Five target gauges, the business cycle with recessions shaded, inflation
  and Bank Rate, and shocks (confidence boom, credit crunch, energy prices).
- Monetary policy by the Bank's rule or by you; QE at the floor; fiscal and
  supply-side policy; A level credibility, lags and Phillips-curve slope.
- The real UK, 1997–2025: inflation, every Bank Rate change, unemployment and
  growth, with notes on each year, a Phillips-curve scatter and the real rate.
- How banks create money (beyond the spec).
- Eleven guided investigations.

## Levels and revision

A **Standard / Advanced** switch at the top of the Controls tab hides or shows
the A level investigations. The **Revise** tab has key ideas tagged with their
spec and exam-practice questions with mark schemes, some using the numbers on
screen.

## Batch run

Whether the Bank hits 2%, the short-run and long-run Phillips curves, fiscal
stimulus with and without the Bank reacting (crowding out), and the money
multiplier.

## The earlier version

The previous version is kept, unchanged, in `original/` with its worksheets,
and is linked from "The model" tab of the new one.

## Limits

All model numbers are illustrative; no housing or financial sector. The quarterly real-data chart and some A level presets of the earlier version are not in this one. See "The model" tab in the simulation for the full list.

## Source

Built from `tools/kit/src/running_the_economy.js` with the shared kit: edit that file and run
`node build.js` inside `tools/kit/`. There is no `worksheets.html` for this version.
