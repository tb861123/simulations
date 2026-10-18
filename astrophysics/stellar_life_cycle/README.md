# Stellar Life Cycle

A single, self-contained HTML file (`stellar-life-cycle.html`) that shows the
whole life of a star, with its black-body spectrum and the H–R diagram, for
GCSE and A-level teaching. No installation and no internet are needed: open
the file in Chrome or Edge, pick a preset or set your own starting
conditions, and press **Play**.

It also replaces two pages of the old WJEC Streamlit app,
*Stellar Evolution & HR Diagram* and *Blackbody Radiation*: everything they
taught is in here (see "What came from the old WJEC pages" below).

## What you can change

- **Mass** (0.02–250 solar masses), which decides almost everything.
- **Metallicity**: how much of the star is heavier than helium, from
  first-generation stars up to metal-rich ones.
- **Stellar wind strength**: strong winds can strip massive stars into
  Wolf–Rayet stars.
- **Close companion**: lets a white dwarf steal gas and explode as a Type Ia
  supernova.

## Level, views and quality

- **Level** (top of the left panel): *Standard (GCSE)* or *Advanced (A lvl)*.
  Advanced adds the Rayleigh–Jeans curve and the ultraviolet catastrophe, the
  Stefan–Boltzmann graph (P against T, log–log), lifetime against mass, the
  star's H–R region, luminosity in watts, a "radius from L and T" column in
  the star catalogue, the option to switch off the evolutionary track, and
  the advanced physics notes.
- **Views** (buttons at the top of the centre panel). The timeline and Play
  button drive all three, so you can watch the spectrum or the H–R position
  change as the star ages:
  - **⭐ Life cycle**: size and appearance, the cutaway, timeline and charts
    (below).
  - **🌈 Black-body spectrum**: Planck's curve at the star's temperature
    right now (or a temperature and radius you set, with presets Room 300 K,
    Bulb 2,700 K, Sun 5,772 K, Blue star 15,000 K). The peak is marked with
    Wien's law λmax = b/T (b = 2.898 × 10⁻³ m K), and live working shows
    λmax, P = σT⁴ per m² and L = 4πR²σT⁴ in watts and L☉. Options: visible
    band, faint curves for 300 K–20,000 K, log wavelength axis (10 nm – 1 mm),
    log y-axis, Rayleigh–Jeans (Advanced), and the P–T graph (Advanced). A
    glowing ball gives out photons coloured by wavelength (picked from
    Planck's law), at a rate ∝ T⁴ per m² or ∝ L for the whole star.
  - **📈 H–R diagram**: a large H–R diagram with 15 catalogue stars coloured
    by spectral class, shaded regions (main sequence, giants, supergiants,
    white dwarfs) that can be filtered, the star's track with arrows, buttons
    to jump to the main sequence, giant or end stage, a star catalogue table
    and (Advanced) main-sequence lifetime against mass (τ = 10¹⁰ yr × M⁻²·⁵
    and the model's own lifetimes, with the 0.08 and 8 M☉ limits).
- **Display quality** (bottom of the left panel): Low / Medium / High /
  Ultra sets how many points the charts (250–2,000) and spectra (200–1,600)
  use and how many particles the animations draw. Medium is the default and
  runs smoothly on a laptop. It changes pictures only: the star's life and all
  batch results are identical at every setting. All canvases are drawn at the
  screen's full pixel density, so they are sharp on Surface screens at 200%.

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
  core and average density, peak wavelength (Wien), spectral type, what is
  fusing, lifespan, and surface and core composition (Advanced adds
  luminosity in watts and the H–R region).
- **📝 Exam practice** (right panel): six WJEC-style questions, each with a
  marks badge, hint and "Show mark scheme" working. The numbers come from the
  simulation and update live (worked from the rounded values in the question).
- **📐 Physics notes** (right panel): key equations and explanations, with
  extra A-level notes in Advanced.

## What came from the old WJEC pages

- *Stellar Evolution & HR Diagram*: mass slider (here 0.02–250 M☉), life stage
  ZAMS / red giant / end state (now "Jump to a stage" plus the full
  timeline), H–R diagram with the 15-star catalogue, spectral-class colours,
  the four category check boxes, regions and the evolutionary track
  (Advanced option), readouts L, T, R, spectral class and lifetime, Advanced
  caption (H–R region, L in watts, λmax), the lifetime-against-mass plot with
  the Sun, the star and the 0.08 and 8 M☉ lines, the glowing-star animation
  (photon rate ∝ L, size ∝ log R, black-body colour), physics notes with the
  advanced text, and its 3 exam questions.
- *Blackbody Radiation*: temperature slider and the four presets, perceived
  colour and its name, Planck curve with faded reference temperatures
  (300–20,000 K), λmax marker, visible-spectrum overlay, log y-axis,
  Rayleigh–Jeans curve and the ultraviolet catastrophe note (Advanced),
  radius slider and luminosity (Advanced in the old page; always shown here),
  the Stefan–Boltzmann log–log graph with Earth, bulb, Sun, Sirius A and a blue
  giant (Advanced), the glowing sphere with photons coloured by wavelength at
  a rate ∝ T⁴, the Wien and σT⁴ info panel, physics notes including the CMB,
  and its 3 exam questions.
- One correction: the old stellar question "calculate the luminosity from T
  and R" gave L = M³·⁵ L☉ as its answer, which only matches 4πR²σT⁴ for 1 M☉.
  The answer here is worked out from the T and R in the question.
- Not carried over: the old pages' Plotly hover tooltips, and the old
  animation's separate ½×/2× speed buttons (the page's own speed buttons
  drive everything here).


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
  largest radius, total life and starting mass, plus black-body measurements:
  measured λmax, λmax × T, power per m² from the area under the spectrum, the
  luminosity from the spectrum ÷ the model's luminosity, and the observed
  surface temperature.
- **Black-body measurements** use a model spectrometer with 100, 400
  (default) or 1,600 channels spread evenly in log λ from 10 nm to 1 mm, at a
  random offset each run. λmax is the centre of the brightest channel; the
  power is π ∫B dλ. Repeat observes each star at a random moment of its life
  (1,000–60,000 K); a Sweep of mass, metallicity or wind observes it halfway
  through its main sequence; a Sweep of **black-body temperature** observes a
  pure black body of radius 1 R☉. The spectrometer setting is fixed per
  experiment and does not depend on the display quality.
- By default batches use a Sun-like composition, normal winds and no
  companion; a tick box uses the left panel's settings instead. The star on
  screen is not changed. Results download as CSV.

One-click batch experiments (each takes under a second; the last four are
the black-body experiments):

| Experiment | Result from a test run |
|---|---|
| Do heavy stars die young? | Mass 0.8–25 M☉ → main-sequence lifetime. Log–log gradient −2.44 (theory t = 10 Gyr × M⁻²·⁵, gradient −2.5); exact match up to 18 M☉, then the model levels off at a few million years. |
| Is L ∝ M³·⁵? | Mass 0.5–50 M☉ → luminosity. Gradient 3.62 (theory 3.5), because the model uses L ∝ M⁴ between 0.43 and 2 M☉. |
| What is left behind? | Mass 0.8–40 M☉ → remnant mass. White dwarfs follow the initial–final mass relation 0.109 M + 0.394 exactly (0.48 M☉ from 0.8 M☉ up to 1.1 M☉ from 6.4 M☉); neutron stars of 1.2–1.4 M☉ from 8–24 M☉ (textbook 1.4); black holes of 7–10 M☉ above 25 M☉. |
| How big do stars get? | Mass 0.3–100 M☉ → largest radius: 0.6 R☉ for a red dwarf, ~240 R☉ for the Sun, up to ~1,600 R☉ for a 26 M☉ red supergiant; the heaviest stay hot and smaller. No single formula. |
| A cluster of 5,000 stars: how do they end? | 99.7% white dwarfs, 0.24% neutron stars, 0.02% black holes; the IMF integrated between the model's fate boundaries (7.5 and 25 M☉) predicts 99.7%, 0.24%, 0.05%. Differences are within about 1 standard error. |
| After 1 billion years, how many still shine? | 99.4% of 1,000 stars; theory (turn-off mass 2.5 M☉ from t = 10 Gyr × M⁻²·⁵) gives 98.7%. The model's stars live slightly longer than the main-sequence formula (giant stages add 10–20%), so the measured value is 1.9 standard errors higher. |
| Does Wien's law hold for real-looking stars? | 1,000 stars (IMF 0.5–50 M☉, random moment of life), 400 channels: mean λmax × T = 2.898 × 10⁻³ m K (1.0 SE from b), SD 2.37 × 10⁻⁵ against 2.41 × 10⁻⁵ predicted from the channel width (0.83%). The histogram is flat, as an even spread over one channel should be. |
| Is L = 4πR²σT⁴? | 1,000 stars: L from 4πR² × area under the Planck curve ÷ the model's L = 1.000 (mean below 1 by 1.4 × 10⁻⁶, a systematic error from summing the area in steps; SD only 8 × 10⁻⁹). |
| Wien's law: does λmax ∝ 1/T? | Black body 1,000–40,000 K, 5 repeats, coarse 100-channel spectrometer: log–log gradient −1.00 (theory −1); each point within a few per cent of b/T, scatter set by the 12% channel width. |
| Stefan–Boltzmann: is P ∝ T⁴? | Black body 1,000–40,000 K: log–log gradient 4.00 (theory 4); measured ÷ σT⁴ = 1.000 at every temperature. |
