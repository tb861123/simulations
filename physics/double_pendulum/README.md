# Double Pendulum Chaos Lab

Release fifty double pendulums a hundredth of a degree apart and watch them
part company, then map every starting angle at once: live colour maps, the
time to first flip, and how fast neighbours diverge.

## How to run

Open `double-pendulum.html` in Chrome or Edge. Nothing to install; works
offline. The heavy map calculations run in background workers built into the
file.

## What is in it

Six modes along the top:

1. **Sensitivity**: 2 to 1,000 pendulums whose first angles differ by as
   little as 10⁻⁸ degrees.
2. **Angle & energy**: angle–time graphs, the θ₁–θ₂ trajectory and kinetic,
   potential and total energy.
3. **Pendulum grid**: a 40 × 40 grid of real pendulums, each released from a
   different pair of angles.
4. **Live colour map**: every pixel a pendulum, coloured by its two angles as
   they evolve.
5. **First-flip map**: how long each starting pair takes before either rod
   goes over the top.
6. **Divergence map**: how far each pendulum and a nearly identical partner
   have drifted apart.

The right-hand panel replays any clicked pixel, with energy-drift diagnostics
and a Δt, Δt/2, Δt/4 convergence check. Maps can be saved, checkpointed and
exported as PNG or CSV.

Try this first: in Sensitivity, set the gap to 10⁻⁸°. How long before the
pendulums visibly split? Now try 0.01°.

## The model

Two rigid massless rods with point masses, moving in one vertical plane with
no friction. The Lagrangian equations of motion are integrated with
fixed-step RK4 (Δt = 0.004 s by default) in double precision. Assumptions,
equations and numerical checks are in **ⓘ Field notes** inside the lab and in
`source/README.md`.

## Source

This lab was contributed as a separate React + TypeScript + Vite app and is
**not** built with the shared kit, so it has no Standard / Advanced switch,
Revise tab, Batch run tab or worksheets. Its full source, tests and
benchmarks are in [`source/`](source/). To rebuild the single HTML file after
editing the source, from inside `source/`:

```bash
npm install
```

```bash
npm run single-file
```

That runs the Vite build and inlines it (including the workers, as classic
workers so they run from a `file://` page) into `../double-pendulum.html`.
The `Start-Lab.cmd` and `scripts/serve.mjs` launchers serve `dist/`, which
exists only after `npm run build`.
