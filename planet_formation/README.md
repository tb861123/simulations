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
4. **Ignition and settling.** The star starts hydrogen fusion at about 40 Myr
   × M⁻²·⁵. The run stops when the system has been quiet for 30 Myr.

Click any body to open the **inspector**. It shows the orbit (year length,
eccentricity, perihelion/aphelion, inclination), spin (day length, equatorial
speed, axial tilt), physical properties and collision history.

## Physics in brief

- Leapfrog (kick–drift–kick) integrator with a fixed time step. Units are AU,
  Earth masses and years, with G·M☉ = 4π².
- Mutual gravity is computed only for bodies above a mass threshold, plus a
  swept collision test with an inflated (Hill-radius) collision radius.
- Mass and momentum are conserved in every collision. Spin angular momentum
  is conserved too, including the angular momentum of the impact itself.
- The gas disc is stored as 160 rings that fade, diffuse and are accreted.
  Gas drag damps eccentricity and inclination.
- The clock shows an *estimated* real time: 375 real years per model year
  while gas is present, then 20,000 after it has gone.

Every simplification is listed inside the app under **"How the model works
(and what it leaves out)"**, and the source is commented section by section.

## Repeatable runs

The same random seed with the same settings gives exactly the same run.
Setup sliders take effect when you press **Reset**.
