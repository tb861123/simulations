# Gravitational Lensing

A ray-traced teaching simulation of gravitational lensing. It covers:

- Einstein rings and crosses
- cluster arcs
- time delays
- microlensing light curves with planets
- Eddington's 1919 eclipse test
- weighing dark matter with light

## How to run

Open `gravitational-lensing.html` in Chrome or Edge. Nothing needs installing, and no internet is needed.

## Three views

1. **Sky picture (ray-traced):** for every pixel, the lens equation β = θ − α(θ) gives where the light came from, and the pixel takes the colour of the background source there.
   - **Lenses:** point mass, singular isothermal sphere (galaxy), elliptical isothermal galaxy, NFW dark-matter halo, and cored hot gas. You can combine several, with add/remove and drag to place. Lenses can be marked as dark matter, and dark matter can be switched off.
   - **Sources:** a spiral galaxy, a grid, a field of galaxies, a deep field (like the Hubble Deep Field), or a quasar. Drag the source or a lens with the mouse. **Play** makes the source drift across the lens and plots its brightness.
   - **Overlays:** critical curves (red), caustics (cyan), image positions with labels, mass (κ) contours and X-ray gas.
2. **Microlensing:** a star with a planet passes in front of a background star. The top half shows the lens plane (Einstein ring, caustics, images). The bottom half shows the light curve with noisy data, against the no-planet curve.
3. **Eddington 1919:** stars around the eclipsed Sun are pushed outwards by α = 1.75″ × R☉/b (exaggerated so you can see it). You can switch to Newton's half-size prediction.

## Controls

- **Sky view:**
  - lens and source redshift (distances shown in Gly)
  - lens type, mass (1 M☉ to 3 × 10¹⁵ M☉), ellipticity and angle, NFW concentration, gas core radius
  - source type, size and brightness
  - field of view, "Fit view to the Einstein radius" button, and overlays
- **Microlensing:** lens star mass and distance, source distance, relative motion, closest approach u₀, direction, source star radius, planet on/off, planet mass and orbit size (AU), measurement noise.
- **Eddington:** exaggeration factor, and Newton vs Einstein.

The readouts include:

- Einstein radius (arcsec and kpc)
- mass inside the Einstein radius
- distances
- number of images and their positions, magnifications μ and time delays (days)
- total magnification
- visible mass vs total lensing mass
- velocity dispersion

In microlensing mode they also include θ_E (mas), t_E (days), the current and peak magnification compared with A(u₀), and the planet signal and whether it was detected.

## Presets

| Preset | What it shows |
|---|---|
| Einstein ring | Galaxy exactly behind a galaxy |
| Einstein cross | Elliptical lens with four quasar images |
| Twin quasar | Two images with a time delay of about 430 days (cf. Q0957+561: 417 days) |
| Cluster arcs | Abell 1689-like cluster: θ_E ≈ 46″ with giant arcs |
| Dark matter cluster | Switch off the dark matter and the arcs vanish |
| Bullet Cluster | The lensing mass (blue contours) sits with the galaxies, not with the X-ray gas (pink) |
| Bent grid | A point mass distorts a grid |
| Eddington 1919 | The Sun bends starlight by 1.75″ |
| Microlensing + planet | Smooth peak plus a sharp planetary-caustic spike |
| Microlensing, no planet | The classic smooth Paczyński curve |

## The model

- **Distances:** flat ΛCDM (H₀ = 70, Ω_m = 0.3, Ω_Λ = 0.7), using angular-diameter distances. Note that D_ls ≠ D_s − D_l.
- **Point mass:** θ_E = √(4GM/c² · D_ls/(D_l D_s)).
- **SIS:** mass is M₂₀₀, so σ² = GM/(2R₂₀₀) and θ_E = 4πσ²/c² · D_ls/D_s.
- **SIE:** Kormann et al. / Keeton analytic deflection.
- **NFW:** standard Bartelmann (1996) deflection and potential.
- **Cored isothermal gas:** α = θ_E θ/(r_c + √(θ² + r_c²)).
- **Critical curves:** found where det A = 0 (marching squares). Caustics are their mapping onto the source plane.
- **Images:** found by triangle search plus Newton refinement, with μ = 1/det A. The time delay is Δt = (1+z_l)/c · D_l D_s/D_ls · Δ[½|θ−β|² − ψ].
- **Microlensing:**
  - The binary-lens equation is solved as a 5th-order complex polynomial (Witt & Mao 1995), using Durand–Kerner root finding.
  - The finite source is averaged over 25 points.
  - Single lens: A(u) = (u²+2)/(u√(u²+4)).
  - The planet counts as "detected" if it causes more than 5% deviation (5 × the 1% noise) for 3 points in a row.

**Left out:** light from the lens itself; seeing and blurring; dust; multiple lens planes; external shear; the source's own motion; microlensing of quasars by stars in the lens galaxy; strong-field bending near black holes.

## Batch experiments

Batch runs skip all drawing. Microlensing uses a point source and 1600 samples per event. The binary equation is only solved near the star and the planet's caustics (it gives the same result, 8× faster). Ring measurements use 100 × 100 pixel images.

| Experiment | Result | Theory |
|---|---|---|
| Peak magnification, u₀ random in 0.05–1 (500 events) | Mean 3.47 ± 0.14 (SE); the histogram follows the theory distribution | Mean of A(u) = 3.34 (0.9 SE away) |
| Spotting a Jupiter–Sun twin (200 events, random planet position and path) | 21.0 ± 2.9% detected | Gould & Loeb 1992: about 17% |
| Einstein radius vs mass (sweep 10⁹–10¹⁵ M☉, measured from noisy ring images) | Log–log gradient 0.500; points about 1% above the line | θ_E ∝ M^0.5 |
| Weighing a galaxy from its ring (200 noisy images) | M_est/M_true = 1.04 ± 0.011 | 1. The 4% bias is systematic: an extended source pushes the brightness-weighted ring radius outward. The note uses this to teach bias vs random error. |
| Total magnification vs source offset (sweep u = 0.1–2) | Matches A(u) to 10⁻⁵ % | A(u) |
| Time delay vs mass (sweep) | Log–log gradient 1.00 | Point-lens delay formula |

All experiments finish in under 6 seconds on a laptop.

## Limitations

- Image finding only covers the visible field of view.
- A perfectly centred source on a round lens is reported as "a ring" rather than as a list of images.
- The deep-field source is procedural (made up by the program), not real Hubble data.
- The cluster presets are "like" Abell 1689 and the Bullet Cluster, not fitted mass models of them.
