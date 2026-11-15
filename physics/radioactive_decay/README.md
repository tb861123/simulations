# Radioactive Decay

Up to 10 000 nuclei, each with the same chance of decaying in every step.
The exponential curve and the half-life come out of the randomness. A second
view puts a source, absorbers and a Geiger–Müller tube on a bench.

## How to run

Open `radioactive-decay.html` in Chrome or Edge. Nothing to install; works offline.

## What it shows

- Dice, protactinium-234m, radon-220, technetium-99m, iodine-131, cobalt-60
  and carbon-14, with real half-lives and uses. Click a nucleus to make it
  decay.
- N against t (Advanced: ln N against t) and activity against t, with theory.
- The bench: americium-241, strontium-90 and cobalt-60 sources; paper,
  aluminium and lead of any thickness; distance; background; a 60 s count;
  optional clicks.
- Ten guided investigations.

## Levels and revision

A **Standard / Advanced** switch at the top of the Controls tab hides or shows
the A level investigations. The **Revise** tab has key ideas tagged with their
spec and exam-practice questions with mark schemes, some using the numbers on
screen.

## Batch run

Half-life measured from 1000 nuclei, scatter against sample size, the ln N
gradient, Poisson counts, the inverse-square law, and absorption of gamma
rays by lead and beta particles by aluminium.

## The earlier version

The previous version is kept, unchanged, in `original/` with its worksheets,
and is linked from "The model" tab of the new one.

## Limits

No decay chains (they are in the earlier version); one simple absorption rule per kind of radiation; the counter never saturates. See "The model" tab in the simulation for the full list.

## Source

Built from `tools/kit/src/radioactive_decay.js` with the shared kit: edit that file and run
`node build.js` inside `tools/kit/`. There is no `worksheets.html` for this version.
