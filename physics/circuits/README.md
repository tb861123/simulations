# Electric Circuits

Series and parallel circuits, sensors, I–V characteristics and internal
resistance, each solved exactly from V = IR and Kirchhoff's laws, with dots
showing the current: faster where more flows.

## How to run

Open `circuits.html` in Chrome or Edge. Nothing to install; works offline.

## What it shows

- Series and parallel benches with a fixed resistor and a lamp, LDR,
  thermistor, diode or second resistor; light and temperature sliders.
- I–V bench with a voltage sweep; EMF and internal resistance bench with a
  load sweep, V against I and power against load.
- Voltages, currents, resistances and powers for every component.
- Nine guided investigations.

## Levels and revision

A **Standard / Advanced** switch at the top of the Controls tab hides or shows
the A level investigations. The **Revise** tab has key ideas tagged with their
spec and exam-practice questions with mark schemes, some using the numbers on
screen.

## Batch run

Ohm's law, the filament lamp, EMF and internal resistance with meter
errors, thermistor and LDR characteristics, and resistors in parallel.

## The earlier version

The previous version is kept, unchanged, in `original/` with its worksheets,
and is linked from "The model" tab of the new one.

## Limits

Ideal wires and meters; the lamp heats instantly. The a.c. and resistivity tabs of the earlier version are not in this one. See "The model" tab in the simulation for the full list.

## Source

Built from `tools/kit/src/circuits.js` with the shared kit: edit that file and run
`node build.js` inside `tools/kit/`. There is no `worksheets.html` for this version.
