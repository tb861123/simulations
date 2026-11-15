# The Greenhouse Effect

A slice through the atmosphere. Yellow sunlight comes in, some bounces off
cloud and haze, the rest warms the ground. The ground gives off red
infrared, which carbon dioxide, water vapour and methane molecules catch and
send back up or down. Behind the picture is a one-line energy balance: the
planet warms until the infrared escaping to space matches the sunlight
absorbed.

## How to run

Open `greenhouse-effect.html` in Chrome or Edge. Nothing to install; works offline.

## What it shows

- Starting points: no atmosphere (−18 °C), pre-industrial (14 °C), today,
  doubled CO₂, Venus, Mars and a snowball albedo.
- CO₂ (logarithmic), methane, the water vapour feedback, albedo, sunlight,
  ocean depth and natural variability, all changeable while it runs.
- Volcanic eruptions (Pinatubo and three times bigger).
- History and futures: the model run from 1850 with real CO₂ against the
  observed warming, then three paths to 2100.
- Temperature against time, and energy in and out against temperature (the
  balance is where they cross).
- Eight guided investigations.

## Levels and revision

A **Standard / Advanced** switch at the top of the Controls tab: Standard
follows AQA GCSE Chemistry 4.9.2 and Edexcel GCSE Geography A Topic 2;
Advanced adds forcing, feedbacks and climate sensitivity for A level
geography, with the σT⁴ maths as extension. The **Revise** tab has key ideas
tagged with their spec and exam-practice questions with mark schemes.

## Batch run

Warming per doubling of CO₂ (about 3 °C; 1.1 °C without feedback), climate
sensitivity against feedback strength (3.7 ÷ (3.32 − f)), a climate
sensitivity ensemble (a long tail of high values), albedo, ocean depth and
the response time (about 0.11 years per metre), and warming by 2100 under
three paths.

## The earlier version

The previous version is kept, unchanged, in `original/` with its worksheets,
and is linked from "The model" tab of the new one.

## Limits

One temperature for the whole planet; a grey atmosphere; no deep ocean,
ice–albedo or cloud feedbacks; CO₂ is set, not calculated from emissions.
The packets are for show only. See "The model" tab in the simulation for the
full list.

## Source

Built from `tools/kit/src/greenhouse_effect.js` with the shared kit: edit that file and run
`node build.js` inside `tools/kit/`. There is no `worksheets.html` for this version.
