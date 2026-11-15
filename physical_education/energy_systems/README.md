# Energy Systems

An athlete runs races, intervals or a game while four fuel tanks (ATP, PC,
glycogen, oxygen uptake) empty and refill. Every tenth of a second the model
works out where the energy comes from: the oxygen deficit, lactate, OBLA and
EPOC all follow.

## How to run

Open `energy-systems.html` in Chrome or Edge. Nothing to install; works offline.

## What it shows

- Races from 100 m to the marathon, a football game and three interval
  sessions; five athletes; a cool-down setting for recovery.
- Energy supplied by each system against time (the energy continuum), and
  oxygen taken in against oxygen needed (deficit and EPOC).
- Blood lactate against OBLA, speed, oxygen uptake and the aerobic share.
- Nine guided investigations.

## Levels and revision

A **Standard / Advanced** switch at the top of the Controls tab hides or shows
the A level investigations. The **Revise** tab has key ideas tagged with their
spec and exam-practice questions with mark schemes, some using the numbers on
screen.

## Batch run

The energy continuum against published shares (Gastin 2001), PC recovery
(half-life 30 s), active against passive recovery, VO₂ max against 1500 m
time, and speed over repeated sprints.

## The earlier version

The previous version is kept, unchanged, in `original/` with its worksheets,
and is linked from "The model" tab of the new one.

## Limits

Several rates are illustrative; no fibre types, heat or tactics; muscle and blood lactate treated as one. The A level 'compare with' traces and some presets of the earlier version are not in this one. See "The model" tab in the simulation for the full list.

## Source

Built from `tools/kit/src/energy_systems.js` with the shared kit: edit that file and run
`node build.js` inside `tools/kit/`. There is no `worksheets.html` for this version.
