# Ice–Albedo Tipping Points

A single, self-contained HTML file (`ice-albedo.html`) about the ice–albedo
feedback, multiple stable climates, hysteresis and tipping points, for
GCSE-level teaching (and a stretch for A level).

**How to run:** open `ice-albedo.html` in Chrome or Edge, with no install and
no internet. Pick a preset and press **Start**.

## What it shows

- A rotating **globe** whose ice caps grow and shrink (ice where the yearly
  average temperature is below −10 °C).
- A **ball-in-a-valley** landscape for the current Sun and CO₂: valleys are
  stable climates (snowball, ice caps, ice-free), hilltops are tipping points,
  and the ball marks the planet's current ice edge.
- The **equilibrium curve** of ice-edge latitude against sunlight: the
  S-shaped curve with stable (solid) and unstable (dashed) parts, the snowball
  and ice-free branches, and a trail showing the path the planet has taken.
  Sweeping the Sun down and back up does not retrace the path: hysteresis.
- Graphs of temperature against latitude and global mean temperature against
  time; readouts of global mean temperature, ice edge, state, albedo and the
  tipping thresholds; a story that updates.

## Controls

Sunlight (% of today's), CO₂ (logarithmic), heat transport strength, ice
albedo, surface (ocean world, Earth-like, land world), weather noise, a "slow
change" option (Sun dims or brightens, a down-then-up loop, CO₂ builds up or
falls; sped up), and warm or snowball restarts. Play/Pause, Reset, speed ½× to
100× (1× = 5 years per second).

**Display quality** (Low / Medium / High / Ultra, default High, remembered in
the browser): how finely the globe is drawn — its pixel resolution (High and
Ultra follow the screen's devicePixelRatio, so it is crisp at 200% scaling),
the detail of the coastlines, and whether temperatures are blended between
bands so the ice edge is smooth. It is drawing only: the climate model always
uses 90 bands of 2°, in live runs and in batch runs, so results do not depend
on it. All charts are sized by devicePixelRatio.

## Presets

Today's climate · Hysteresis loop · Snowball Earth (Sun dimmed to 92%) ·
Escape the snowball (volcanic CO₂ builds up) · Faint young Sun · Ice-free
hothouse · Arctic sea-ice tipping · Small ice cap instability · Near the edge
with noise · Weak heat transport.

## The model

A Budyko–Sellers energy balance model with 90 latitude bands (2° each) from
pole to pole:

C dT/dt = Q s(φ)(1 − α(T)) − (A + B T) + D∇²T + noise

- Q = 1361 × (Sun %)/4 W/m²; s(φ) = 1 − 0.482 P₂(sin φ).
- α = 0.30 for open water/land, ice albedo (0.62) below −10 °C (smoothed over
  ±1 °C).
- A + BT is the infrared escaping to space: A = 207.5 W/m² at 420 ppm,
  B = 2.09 W/m² per °C; CO₂ changes A by −5.35 ln(C/420).
- Heat transport is diffusion on the sphere with strength D = 0.45 W/m² per °C.
- C: 50 m ocean mixed layer, or 2 m for land.
- Implicit time steps (0.25 years live, 0.5 years in batch runs).
- The theory curve: fix the ice edge at latitude η, solve the linear
  steady-state equations, and find the Sun (or CO₂) that puts −10 °C exactly
  at η.

Today's settings give an ice edge near 64° and a global mean of about 11.5 °C
(a few degrees cooler than the real Earth). The ice caps tip into a snowball
below 93.3% of today's Sun; a snowball only melts above about 131%.
Assumptions and simplifications are listed in the app under "How the model
works".

## Batch runs

**📊 Batch run** runs the model many times without drawing. Choose the start
(warm or snowball, settled for 150 years at the run's own settings), years
per run, **Repeat** or **Sweep** (Sun, CO₂, heat transport, ice albedo,
weather noise), with an optional **there and back** sweep that carries the
climate from step to step. Outcomes: final ice-edge latitude, global mean
temperature, final state, years until it tips, whether it tipped. Results are
plotted with theory and can be downloaded as CSV.

**Batch settings table.** The batch panel lists every starting setting of a
run: Sun, CO₂, heat transport, ice albedo, weather noise and years per run;
the surface and start choices; and two things that used to be fixed: the
spin-up before each run (150 years, no noise) and the batch time step (0.5
years; 0.25 and 0.125 are offered). Defaults are the old values, so results
are unchanged. Tick one setting to vary it and give from / to / step (+ adds
the step, × multiplies by it; up to 60 steps, previewed as you type; a sweep
can go down, as in the hysteresis experiments); every other setting stays at
the value shown, and a run uses exactly what the table shows. Unticking goes
back to Repeat; **there and back** sits next to the repeats per step.
One-click experiments set the left panel and fill the whole table in, and
**↺ Use my left-panel settings** copies the left panel into it.

Batch experiments:

1. **Sun down, then back up.** The ice-free branch gives way to ice caps below
   ~100%, the caps follow the theory curve and then jump to a snowball at
   ~93%; going back up the snowball persists until ~127% (theory 131%).
2. **Near the edge: how long until random weather tips it?** At 93.8% Sun with
   noise: about half of 200 runs tip within 500 years; waiting times compared
   with an exponential (memoryless) distribution.
3. **Does stormier weather make tipping more likely?** The tipping probability
   rises from 0 to about 0.6 as the noise grows from 3 to 12 W/m², fitted with
   Kramers' rule ln τ = a + b/σ².
4. **How much CO₂ to escape a snowball?** It melts between about 390,000 and
   770,000 ppm in the model (theory 1.5 million ppm; the smoothed albedo switch
   lets the model melt a little earlier).
5. **Faint young Sun.** At 80% Sun the ice caps survive only above about
   61,000 ppm CO₂ (theory), matched by the runs.
6. **CO₂ up, then down: Arctic ice hysteresis.** The ice caps vanish suddenly
   at about 630 ppm and return only below about 480 ppm.
