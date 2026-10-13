# Planet Formation Simulator

A single, self-contained HTML file (`planet-formation.html`) that simulates
how a planetary system forms, built as a GCSE-level teaching model. No
installation and no internet are needed: open the file in Chrome, Edge or
Firefox, pick a preset and press **Start**.

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

A full run takes about a minute even at top speed, so the **📊 Batch** button
(below the disc) runs discs headlessly at **reduced settings**, listed at the
top of the batch panel: 100 planetesimals (not the slider value), a gas
lifetime of 1 million years, a time step twice as long (1/10 of an orbit at
0.3 AU), no cloud prologue, no asteroids or comets, and each run stops 20
million years after the gas has gone. Other settings come from the left panel.
**One run takes about 8–20 seconds**, so each experiment takes 1–2 minutes.
The interactive simulation pauses during a batch and is not changed (each
batch run has its own simulation object).

- **Repeat:** 5, 10 or 20 discs with different random seeds.
- **Sweep:** disc mass, gas in the disc, star mass (which moves the frost
  line), critical core mass or the late-stage collision boost.
- **Outcomes:** planets that have cleared their orbit, the raw number of
  bodies ≥ 0.05 M⊕ left, number of gas giants, whether any gas giant formed,
  mass of the largest planet, and rocky planets inside the frost line. These
  are compared with our Solar System (8 planets, 2 gas giants, Jupiter 318 M⊕,
  4 rocky planets) or, for "any gas giant", with surveys of real Sun-like stars
  (about 1 in 10). Results download as CSV.

### What counts as a planet

The model ends with many Mars-to-Earth-sized bodies on nearly circular orbits
only 10–14 mutual Hill radii apart. Packed that tightly, real systems are
unstable: over 10–100 million years the bodies collide (as in the Moon-forming
impact). The model can only run a few thousand orbits, so this never happens,
and running 5× longer barely helps (raw count 16 → 15, double the time).
Following the IAU rule that a planet must have **cleared the neighbourhood of
its orbit**, a batch "planet" is a body with no heavier body within 10 mutual
Hill radii (about the minimum spacing for long-term stability; Chambers et al.
1996). Giant planets (≥ 50 M⊕) always count, because they can sit closer and
stay stable (Jupiter and Saturn are 8 apart). Our Solar System passes this test
with all 8 planets. The raw count is still available.

One-click batch experiments (results from a test run with the default settings):

| Experiment | Result |
|---|---|
| How many planets form? (10 runs) | Planets that cleared their orbit: 9–13, mean 10.9 ± 0.4 (SD 1.2), vs 8 in the Solar System. Before the clearing rule the raw count was 15–22 (mean 17.7). Still a few too many: our rocky planets ended 25–60 Hill radii apart after ~100 Myr of giant impacts, and each batch planetesimal starts as big as Mars. |
| Bigger disc, bigger planets? (8 runs) | Largest planet about 9, 140, 390 and 460 M⊕ for discs of 50, 133, 217 and 300 M⊕: a jump, as cores that reach the critical mass in time run away into giants. |
| How much gas makes a gas giant? (8 runs) | Gas giants: 0, 1.5, 2.5 and 3 with 0, 2, 4 and 6 Jupiter masses of gas. |
| Does the frost line matter? (6 runs) | Rocky planets inside the frost line: 4, 7.5 and 9 for 0.7, 1.0 and 1.3 M☉ stars (frost line 1.3, 2.7 and 4.6 AU). |
| Standing in for the missing time (8 runs) | Raw body count 24.5, 16.5, 10 and 6.5 for a late-stage boost of ×2, 4, 6 and 8: the answer depends strongly on this shortcut. |

These are the smallest batches that finish in about two minutes; for firmer
answers, run more repeats and leave it working.

## Presets

Solar-System-like, start from a cloud, no gas giants (rocks-only disc),
massive disc, red-dwarf disc (0.5 M☉), bright F-type star (1.6 M☉, frost line
far out), gas clears fast (1 Myr), and giant impacts only (few big bodies, no
gas). Each preset sets the sliders and builds a new disc; press Start.

## Speed

Use the **½× / 1× / 4× / 16× / Max** buttons below the disc to fast-forward
at any stage. Speed changes only how fast you watch, never the result.

## Layout

Drag the thin bars either side of the main view to resize the side panels,
or click their ‹ › buttons to hide a panel and make the main view bigger.
Click a hidden panel's strip to bring it back, and double-click a bar to
reset. The layout is remembered in your browser.

## Repeatable runs

The same random seed with the same settings gives exactly the same run.
Setup sliders take effect when you press **Reset**.
