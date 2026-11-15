# Electrolysis

Ions drift to the electrodes, are discharged, and the products appear:
metal beads or coatings, bubbles of gas collected in tubes. The amounts are
exact Faraday calculations from the charge passed.

## How to run

Open `electrolysis.html` in Chrome or Edge. Nothing to install; works offline.

## What it shows

- Molten lead(II) bromide and sodium chloride (with a solid / molten switch);
  solutions of copper(II) sulfate, sodium chloride, sulfuric acid and
  copper(II) chloride; graphite or copper electrodes.
- Electrons flowing in the wires, ions in the liquid, half-equations and
  observations at each electrode, and the reasons for each product.
- Mass and gas-volume graphs against time; charge and moles of electrons.
- Eight guided investigations.

## Levels and revision

A **Standard / Advanced** switch at the top of the Controls tab hides or shows
the A level investigations. The **Revise** tab has key ideas tagged with their
spec and exam-practice questions with mark schemes, some using the numbers on
screen.

## Batch run

Mass against time and against current, the 2 : 1 ratio from acidified
water, moles deposited against ionic charge, anode loss against cathode gain
with copper electrodes, and chlorine lost by dissolving.

## The earlier version

The previous version is kept, unchanged, in `original/` with its worksheets,
and is linked from "The model" tab of the new one.

## Limits

The current is set directly, not from voltage and resistance; far fewer ions are drawn than exist; the discharge rules are the simplified ones taught at this level. The extra A level presets and oxidation-number readings of the earlier version are covered more briefly here. See "The model" tab in the simulation for the full list.

## Source

Built from `tools/kit/src/electrolysis.js` with the shared kit: edit that file and run
`node build.js` inside `tools/kit/`. There is no `worksheets.html` for this version.
