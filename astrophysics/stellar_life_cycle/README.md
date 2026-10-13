# Stellar Life Cycle

A single, self-contained HTML file (`stellar-life-cycle.html`) that shows the
whole life of a star, for GCSE-level teaching. No installation and no internet
are needed: open the file in Chrome or Edge, pick a preset or set your own
starting conditions, and press **Play**.

## What you can change

- **Mass** (0.02–250 solar masses), which decides almost everything.
- **Metallicity**: how much of the star is heavier than helium, from
  first-generation stars up to metal-rich ones.
- **Stellar wind strength**: strong winds can strip massive stars into
  Wolf–Rayet stars.
- **Close companion**: lets a white dwarf steal gas and explode as a Type Ia
  supernova.

## What you see

- **Size and appearance**, coloured by surface temperature, in two modes:
  - *Fixed scale* (default): one logarithmic scale for the whole life, with
    permanent rings for Greater London, Earth, Jupiter, the Sun, Earth's orbit,
    Neptune's orbit and 1,000 AU. You can watch the star grow past the rings
    as a giant and shrink inside them as a white dwarf.
  - *True scale*: real proportions, zooming by ×10 only when the star no
    longer fits (each jump is announced), with the Sun drawn to scale.
  A dashed gold circle shows the star's size at the start of the current
  stage, and the view says how many times bigger or smaller it now is. Special visuals
  for the collapsing cloud, protostar disc and jets, planetary nebula,
  supernova, pulsar beams and black hole.
- **Inside the star**: a cutaway showing each layer by mass, coloured by
  composition, with glowing fusion zones, circling convection and outward
  drifting radiation. Massive stars build up the "onion" of iron, silicon,
  oxygen–neon–magnesium, carbon–oxygen, helium and hydrogen.
- **Timeline** of every stage (story view, or true proportions), with
  milestones such as the helium flash, Cepheid pulsations, the carbon-star
  dredge-up and core collapse.
- **Charts**: the H–R diagram with the star's track and well-known stars, or
  luminosity, temperature, radius, mass, core temperature or core density
  over the star's life.
- **Readouts**: age, mass, radius, luminosity, surface and core temperature,
  core and average density, spectral type, what is fusing, lifespan, and
  surface and core composition.

## Layout

Drag the thin bars either side of the main view to resize the side panels,
or click their ‹ › buttons to hide a panel and make the main view bigger.
Click a hidden panel's strip to bring it back, and double-click a bar to
reset. The layout is remembered in your browser.

## Presets

The Sun, red dwarf (Proxima Centauri), brown dwarf, Sirius A, Cepheid, heavy
white dwarf, Betelgeuse (red supergiant → neutron star), neutron star, black
hole, Wolf–Rayet star, metal-poor blue supergiant, first star
(pair-instability supernova), Type Ia supernova and metal-poor Sun.

## The model

This is a teaching model built from standard scaling laws and published
stellar models, not a full stellar-structure code. Every simplification is
listed inside the app under **"How this model works (and what it leaves
out)"**, and the source is commented section by section.

## Batch run (many stars, compared with theory)

Press **📊 Batch run** (next to the speed buttons) to work out the lives of
many stars without drawing. The model has no randomness, so:

- **Repeat** makes a *star cluster*: 100–5,000 masses drawn at random from
  the Salpeter initial mass function (dN/dM ∝ M⁻²·³⁵) between masses you
  choose, at a cluster age you choose.
- **Sweep** steps starting mass (log scale), metallicity or wind strength.
  Each step gives one exact answer, unless you tick the optional random
  scatter in metallicity (×/÷ 1.6) and wind (±30%).
- **Outcomes:** what it ends as, whether it is still shining at the cluster's
  age, main-sequence lifetime, main-sequence luminosity, remnant mass,
  largest radius, total life and starting mass.
- By default batches use a Sun-like composition, normal winds and no
  companion; a tick box uses the left panel's settings instead. The star on
  screen is not changed. Results download as CSV.

One-click batch experiments (each takes under a second):

| Experiment | Result from a test run |
|---|---|
| Do heavy stars die young? | Mass 0.8–25 M☉ → main-sequence lifetime. Log–log gradient −2.44 (theory t = 10 Gyr × M⁻²·⁵, gradient −2.5); exact match up to 18 M☉, then the model levels off at a few million years. |
| Is L ∝ M³·⁵? | Mass 0.5–50 M☉ → luminosity. Gradient 3.62 (theory 3.5), because the model uses L ∝ M⁴ between 0.43 and 2 M☉. |
| What is left behind? | Mass 0.8–40 M☉ → remnant mass. White dwarfs follow the initial–final mass relation 0.109 M + 0.394 exactly (0.48 M☉ from 0.8 M☉ up to 1.1 M☉ from 6.4 M☉); neutron stars of 1.2–1.4 M☉ from 8–24 M☉ (textbook 1.4); black holes of 7–10 M☉ above 25 M☉. |
| How big do stars get? | Mass 0.3–100 M☉ → largest radius: 0.6 R☉ for a red dwarf, ~240 R☉ for the Sun, up to ~1,600 R☉ for a 26 M☉ red supergiant; the heaviest stay hot and smaller. No single formula. |
| A cluster of 5,000 stars: how do they end? | 99.7% white dwarfs, 0.24% neutron stars, 0.02% black holes; the IMF integrated between the model's fate boundaries (7.5 and 25 M☉) predicts 99.7%, 0.24%, 0.05%. Differences are within about 1 standard error. |
| After 1 billion years, how many still shine? | 99.4% of 1,000 stars; theory (turn-off mass 2.5 M☉ from t = 10 Gyr × M⁻²·⁵) gives 98.7%. The model's stars live slightly longer than the main-sequence formula (giant stages add 10–20%), so the measured value is 1.9 standard errors higher. |
