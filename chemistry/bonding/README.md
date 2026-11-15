# Bonding and Structure

How ionic, covalent and metallic bonds form (shells, electron transfer,
dot-and-cross diagrams), and the structure each makes, between two
electrodes: heat it through its real melting and boiling points, connect a
battery, or hit it with a hammer.

## How to run

Open `bonding.html` in Chrome or Edge. Nothing to install; works offline.

## What it shows

- Fifteen substances: NaCl, MgO; H₂, Cl₂, H₂O, NH₃, CH₄, CO₂, N₂; diamond,
  graphite, SiO₂; Na, Al, Cu.
- Electron transfer animated for ionic compounds; dot-and-cross diagrams with
  bond angles for molecules; lattices for giant structures.
- Melting, boiling and subliming; conduction (ions in the melt, electrons in
  metals and graphite); salt shattering, metals bending, diamond unmoved.
- Melting points compared, and the heating curve.
- Nine guided investigations.

## Levels and revision

A **Standard / Advanced** switch at the top of the Controls tab hides or shows
the A level investigations. The **Revise** tab has key ideas tagged with their
spec and exam-practice questions with mark schemes, some using the numbers on
screen.

## Batch run

Melting temperature against bond strength in a model lattice, melting point
against ionic charge, and boiling points of alkanes and noble gases.

## The earlier version

The previous version is kept, unchanged, in `original/` with its worksheets,
and is linked from "The model" tab of the new one.

## Limits

Flat slices of 3-D lattices with few particles; no dissolving. The electronegativity and dative-bond boxes of the earlier version are not in this one. See "The model" tab in the simulation for the full list.

## Source

Built from `tools/kit/src/bonding.js` with the shared kit: edit that file and run
`node build.js` inside `tools/kit/`. There is no `worksheets.html` for this version.
