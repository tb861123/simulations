# Planet Formation Simulator

A single, self-contained HTML file (`planet-formation.html`) that simulates
how a planetary system forms, built as a GCSE-level teaching model. No
installation and no internet are needed: open the file in Chrome, Edge or
Firefox and press **Start**.

## What it shows

1. **Cloud collapse (optional prologue).** A slowly spinning cloud of gas and
   dust collapses under gravity from the inside out. Conservation of angular
   momentum spins it up and flattens it into a disc, and a protostar forms at
   the centre. The protostar glows from the heat of infall; no fusion yet.
2. **Planet building.** Hundreds of planetesimals orbit the young star. Beyond
   the frost line (2.7 × √L AU) ices condense, so bodies there carry 4× more
   solid mass. Collisions merge, bounce or shatter bodies depending on the
   impact speed compared with the escape speed.
3. **Gas giants.** A gas disc fades over a few million years. Any core that
   reaches the critical mass (about 10 Earth masses) in time pulls in gas in
   a runaway, clears a gap, and becomes a gas giant.
4. **Asteroids, comets and belts.** A few hundred tiny bodies are swept up or
   flung away by the planets. Where they survive once the gas has gone, a belt
   is marked, for example a Kuiper-type belt beyond the outermost giant.
5. **Ignition and settling.** The star starts hydrogen fusion at about 40 Myr
   × M⁻²·⁵. The run stops when the system has been quiet for 30 Myr.

Click any body to open the **inspector**. It shows the orbit (year length,
eccentricity, perihelion/aphelion, inclination), spin (day length, equatorial
speed, axial tilt), physical properties and collision history.

## Physics in brief

- Wisdom–Holman integrator: each body follows its exact Kepler orbit around
  the star, and pulls from other bodies and the gas are added in kick–drift–kick
  steps of 1/20 of an orbit at 0.3 AU. Units are AU, Earth masses and years,
  with G·M☉ = 4π².
- Mutual gravity is computed only for bodies above a mass threshold (all
  bodies once fewer than 120 remain), plus a swept collision test with an
  inflated (Hill-radius) collision radius. After the gas has gone, the
  late-stage collision boost (default ×4) stands in for the millions of orbits
  the model can't run, allowing giant impacts.
- Mass and momentum are conserved in every collision. Spin angular momentum
  is conserved too, including the angular momentum of the impact itself.
- The gas disc is stored as 160 rings that fade, diffuse and are accreted.
  Gas drag damps eccentricity and inclination.
- The clock shows an *estimated* real time: 375 real years per model year
  while gas is present, then 20,000 after it has gone.

Every simplification is listed inside the app under **"How the model works
(and what it leaves out)"**, and the source is commented section by section.

## Batch run (many discs, at reduced settings)

A full run takes about a minute even at top speed, so the **📊 Batch run (many
discs)** button (left panel) runs discs headlessly at **reduced settings**,
listed at the top of the batch panel: 100 planetesimals (not the slider
value), a gas lifetime of 1 million years, a time step twice as long (1/10 of
an orbit at 0.3 AU), no cloud prologue, no asteroids or comets, and each run
stops 20 million years after the gas has gone instead of waiting until it has
settled. Other settings come from the left panel. **One run takes about 8–20
seconds**, so a 10-run batch takes about two minutes. The interactive
simulation pauses during a batch and is not changed (each batch run has its own
simulation object).

- **Repeat:** 5, 10 or 20 discs with different random seeds.
- **Sweep:** disc mass, gas in the disc, star mass (which moves the frost
  line) or critical core mass, with 1+ runs per step.
- **Outcomes:** number of planets (bound bodies ≥ 0.05 M⊕), number of gas
  giants, whether any gas giant formed, mass of the largest planet, and rocky
  planets inside the frost line. These are compared with our Solar System
  (8 planets, 2 gas giants, Jupiter 318 M⊕, 4 rocky planets) or, for "any gas
  giant", with surveys of real Sun-like stars (about 1 in 10). Results download
  as CSV.

One-click batch experiments (results from a test run with the default panel settings):

| Experiment | Result |
|---|---|
| How many planets form? (10 runs, ~1.5 min) | 15–22 planets, mean 17.7 ± 0.8 (SD 2.5), far more than the Solar System's 8, mostly small rocky bodies crowded near the star. The model can't run the hundreds of millions of orbits that make close neighbours collide, and the reduced settings make this worse. |
| Bigger disc, bigger planets? (8 runs, ~1.5 min) | Largest planet: about 9 M⊕ for a 50 M⊕ disc, 140 M⊕ for 133 M⊕, 390 M⊕ for 217 M⊕ and 460 M⊕ for 300 M⊕. A jump, not a smooth line: a core that reaches the critical mass in time runs away into a giant. |
| How much gas makes a gas giant? (8 runs, ~1.5 min) | Gas giants: 0 with no gas, 1.5 with 2 Jupiter masses, 2.5 with 4, 3 with 6 (2 runs per step, so rough). |
| Does the frost line matter? (6 runs, ~1 min) | Rocky planets inside the frost line: 7 for a 0.7 M☉ star (frost line 1.3 AU), 11.5 for 1 M☉ (2.7 AU), 17.5 for 1.3 M☉ (4.6 AU). |

These are the smallest batches that finish in about two minutes; for firmer
answers, run more repeats and leave it working.

## Speed

Use the **½× / 1× / 4× / 16× / Max** buttons above the disc to fast-forward
at any stage. Speed changes only how fast you watch, never the result.

## Layout

Drag the thin bars either side of the main view to resize the side panels,
or click their ‹ › buttons to hide a panel and make the main view bigger.
Click a hidden panel's strip to bring it back, and double-click a bar to
reset. The layout is remembered in your browser.

## Repeatable runs

The same random seed with the same settings gives exactly the same run.
Setup sliders take effect when you press **Reset**.
