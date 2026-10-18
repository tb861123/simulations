# Waves

Interference, diffraction, standing waves, diffraction gratings and the Doppler
effect in one simulation, with a tab for each at the top of the centre view.
It replaces four pages of the old WJEC Physics Streamlit app (Wave
Interference, Standing Waves, Diffraction Grating and the sound part of
Doppler Effect).

Open `waves.html` in Chrome or Edge, with no install and no internet needed.

## The four modes

- **Interference.** Young's double slit or single-slit diffraction. The top
  picture is an animated ripple tank: circular waves spread from each slit and
  add up (superposition). Drag S₁ and S₂, switch either off, give S₂ a phase
  offset, or switch to a time-averaged brightness picture. Hover over the
  picture to read the path difference (in wavelengths) and whether that point
  is bright or dark. The graph below uses the real sizes: intensity on the
  screen against position in mm, with the fringe orders, Δy, and a coloured
  band showing what the screen looks like. Options: white light (the whole
  spectrum), and in Advanced the single-slit (sinc²) envelope, missing orders
  and the N-slit pattern (N = 2 to 500).
- **Standing waves.** A string fixed at both ends, an open pipe, a closed pipe
  or two travelling waves. Set the length, the harmonic, the tension and mass
  per metre (v = √(T/μ)) or the air temperature (v = 331 + 0.6θ). Pipes show
  the air particles moving back and forth (sound is longitudinal) as well as
  the displacement graph. You can show the two travelling waves that add up to
  the standing wave. Graphs: the displacement profile with nodes, antinodes,
  envelope and lower harmonics, and the harmonic spectrum (a closed pipe has
  no even harmonics). Advanced adds node positions, a frequency spectrum and a
  resonance curve with a driving-frequency slider.
- **Diffraction grating.** Lines per mm (10 to 3200), wavelength, the number of
  orders and white light. Real gratings: school 300/mm, spectrometers 600 and
  1200/mm, CD, DVD, Blu-ray and a human hair. The picture shows Huygens
  wavelets leaving the slits and the orders hitting the screen at their true
  angles (a semicircular screen is used when the angles are large). Graph of
  intensity against angle, an order table (n, θ, sin θ, nλ). Advanced adds
  the N-slit pattern, a second wavelength with the resolving power R = nN
  (Rayleigh criterion), the single slit → N slits comparison and an order
  overlap chart.
- **Doppler effect (sound).** Source frequency, source speed (or Mach number),
  observer speed and directions, plus real examples (ambulance, F1 car,
  supersonic aircraft, train, bat). Wavefronts are drawn to scale in metres.
  Click to add up to five listeners, drag and throw the source, and play the
  source and heard pitches. The readout also counts the wavefronts reaching
  the ear to measure the frequency. At Mach 1 and above a Mach cone forms.
  Graphs: frequency against time as the source passes (head-on and 20 m to one
  side), and a wavefront diagram. Redshift of light is covered in the
  Expanding Universe simulation (astrophysics).

The left panel has 12 presets, a Standard / Advanced (A-level) switch and a
**picture quality** setting (Low / Medium / High / Ultra) for the ripple tank
(cell size 6 / 4 / 2.5 / 1.6 px and 7 / 11 / 15 / 21 sources across a single
slit) and the air particles in pipes. All canvases are drawn at the screen's
pixel density. The right panel has the live readings, a "What's happening"
story, physics notes (with A-level extensions in Advanced) and **📝 Exam
practice**: 12 questions (3 per mode) whose numbers and mark schemes update with
the controls.

## The physics

| Mode | Equations |
|---|---|
| Interference | Δy = λD/a; I = 4I₀cos²(πay/λD); single slit I = I₀(sin β/β)², β = πby/λD; N slits (sin(Nδ/2)/sin(δ/2))² |
| Standing waves | fₙ = nv/2L (string, open pipe); fₙ = nv/4L, n odd (closed pipe); v = √(T/μ); v = 331 + 0.6θ |
| Grating | d sin θ = nλ; d = 1/N; n_max = floor(d/λ); R = nN |
| Doppler | f_obs = f_s(v ± v_o)/(v ∓ v_s); sin α = 1/M |

## Assumptions and simplifications

- The ripple tank and Huygens pictures enlarge the wavelength enormously and
  run in slow motion; the graphs and numbers use the real values.
- Interference graphs use the small-angle approximation (y ≪ D).
- Strings and pipes are ideal: no stiffness, no damping, no end correction.
  Open pipes have displacement antinodes at the open ends (this corrects the
  old Streamlit page, which drew nodes there).
- The resonance curve uses a fixed quality factor Q = 50.
- White light is modelled as a few separate wavelengths.
- Doppler: still air, speed of sound 343 m/s, no loss of loudness with
  distance.

## Batch run

📊 **Batch run** repeats a simulated class practical many times. True values
come from the exact formulas; each reading gets a random error the size of a
real instrument's (ruler ±0.5 mm across 10 fringes, tape ±5 mm, slit separation
±0.01 mm, spectrometer ±0.1°, finding a resonance ±1 %, length ±2 mm, phone
frequency app ±(1 Hz + 0.2 %)). Repeat mode gives a histogram against the true
value; sweep mode plots mean ± 1 SD against the theory curve, with the
best-fit gradient (and the log–log gradient for power laws). Results download
as CSV.

One-click experiments (results with the default seed 1):

| Experiment | Result | Theory |
|---|---|---|
| Young's slits: how good is λ = aw/D? (500 repeats) | mean 549 nm, SD 20 nm | 550 nm; SD ≈ 3.6 % from the ruler and slit-separation errors |
| Is fringe spacing proportional to D? (sweep 0.5–3 m) | gradient 1.27 mm per m | λ/a = 1.27 mm per m |
| Closer slits, wider fringes? (sweep a, log–log) | gradient −1.006 | −1 |
| Grating: is a higher order more precise? (orders 1–5) | mean 589 nm each; SD 5.5, 2.5, 1.4, 1.3, 0.5 nm | SD = d cos θ σθ/n: 5.7, 2.7, 1.6, 1.0, 0.55 nm |
| Melde's experiment: does f ∝ √T? (log–log) | gradient 0.500 | 0.5 |
| Harmonics are whole-number multiples (open pipe) | gradient 342 Hz per harmonic | f₁ = 343 Hz |
| Speed of a passing car from its siren (500 repeats) | mean 30.0 m/s, SD 0.81 m/s | 30 m/s |
