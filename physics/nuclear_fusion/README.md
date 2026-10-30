# Nuclear Fusion Barrier

How much energy and pressure two nuclei need to fuse, shown on a
potential-energy diagram. An incoming nucleus rolls up the Coulomb barrier (the
electric repulsion between two positive nuclei). It bounces back, tunnels
through, or goes over the top. If it gets through, it drops into the
strong-force well, rolls across to the target nucleus at r = 0 and fuses. The
new nucleus is shown on the left-hand side, and any neutron, proton, gamma ray
or positron flies away.

Open `nuclear-fusion.html` in Chrome or Edge, with no install and no internet
needed.

## What you can do

- **Choose a reaction.** 14 presets cover hydrogen–hydrogen (the Sun's p + p),
  hydrogen–deuterium, hydrogen–helium (¹H + ⁴He, which makes no stable nucleus,
  and the rare ¹H + ³He "hep" reaction), D–D, D–T, D–³He, ³He–³He, ³He–⁴He,
  ⁴He–⁴He (triple-alpha), ¹H–⁷Li, ¹H–¹²C (CNO cycle) and ¹²C–¹²C. One more preset
  runs D–T at room temperature, to show why "cold fusion" fails.
- **Choose a place.** Room temperature, the Sun's surface, the Sun's core, a
  tokamak (ITER), laser fusion (NIF), a red giant core, or a massive star core.
- **Set the temperature and pressure yourself.** Temperature runs from 300 K to
  10 billion K and pressure from 1 Pa to 10²⁴ Pa, both on logarithmic sliders.
- **Switch quantum tunnelling on or off** to see why the Sun could not shine
  without it.
- **Watch nuclei come in.** The default is *demonstration odds*. Every
  collision is shown, but the real chance of getting through the barrier is
  multiplied by a fixed boost (×1 up to ×10⁶⁰, in 1-2-5 steps). The boost is
  picked automatically for each reaction, so about 1 collision in 10 gets
  through. It does **not** change when you move the temperature or pressure,
  so the ratios between settings stay true and runs can be compared fairly.
  If a setting would push the chance above 100%, a warning says so. A note
  under the diagram gives the demonstration odds and the real odds per million
  collisions. It also shows what you have seen so far divided by the boost: an
  estimate of the real rate.
- **Compare runs.** Press 📌 *Record this run* to add the counts to a table in
  the right panel: through / sent, the boost, your estimate of the real number
  per million collisions, and the model's exact value. Counts restart whenever
  a setting changes, so each row belongs to one set of settings.
- **Other modes.** *Fast-forward to the next fusion* keeps the true odds but
  skips ahead. It draws at random how many collisions bounce back before the
  next one gets through, adds them to the counters, shows one bounce, then
  shows the collision that gets through. The other modes show every collision
  at the true odds in real time (so you may wait a long time), show only the
  rare ones that get through, or use an energy you choose.
- **Change the axes.** The distance axis is fixed, so it does not jump about
  when the temperature or reaction changes. On the logarithmic scale it runs
  from 0.5 fm to 10⁵ fm (10⁻¹⁰ m, about the width of an atom); on the linear
  scale it runs from 0 to 200 fm. A nucleus that turns back further out than
  that is reported as turning back off the right-hand edge. Energy can show
  the whole barrier at true proportions, or zoom in on the incoming nucleus.
- **Picture quality** (Low / Medium / High / Ultra, default Medium): how sharply the live view is drawn. Low draws at standard resolution and redraws about 30 times a second, for slower laptops and tablets; High and Ultra draw at 1.5× and 2× the screen's resolution for smoother edges. Only the drawing changes: the model and batch-run results are identical at every level. The choice is remembered in this browser.

## Readouts

- **Energies:**
  - kT and the mean kinetic energy (1.5 kT)
  - the barrier height and how many times kT it is
  - the chance per collision, with and without tunnelling
  - the Gamow peak E₀ and the Gamow energy E_G
  - the temperature needed with no tunnelling
- **Distances:**
  - the touching distance R
  - the turning points at kT and at E₀
  - the de Broglie wavelength
  - the average spacing between nuclei, plus a logarithmic distance ladder from
    10⁻¹⁶ m to 10⁻⁶ m
- **Whole gas:**
  - nuclei per m³ and density
  - reactions per m³ per second
  - the average wait for one nucleus to fuse
  - power released in W/m³
  - ⟨σv⟩
- **Gamow peak chart:** the Boltzmann factor, the tunnelling chance and their
  product, on a linear or logarithmic scale.

## The model

- Coulomb barrier outside R: U = 1.44 MeV·fm × Z₁Z₂/r, with
  R = 1.2 fm × (A₁^⅓ + A₂^⅓).
- A schematic strong-force well inside R. It is drawn shallower than the real
  30–50 MeV, with a note saying so.
- Collision energies are weighted by the Boltzmann factor e^(−E/kT).
- The tunnelling chance is the Gamow factor exp(−√(E_G/E)), where
  E_G = 2μc²(παZ₁Z₂)². It is 1 above the barrier.
- Rates use ⟨σv⟩ = √(8/πμ) (kT)^(−3/2) S ∫ e^(−E/kT) P(E) dE, with a constant
  S-factor for each reaction.
- Number density is n = P / ((1 + Z) kT), for a 50:50 mix of the two nuclei.

The full list of assumptions is in the app under "How the model works". In
short: electron screening, energy-dependent S-factors (D–T has a resonance),
real stellar mixtures, radiation pressure and degenerate electrons are all left
out.

Checks against known values (Sun's core, 15.7 million K):

| Quantity | Model | Accepted |
|---|---|---|
| Barrier for p + p | 600 keV | about 550–600 keV |
| kT | 1.35 keV | 1.35 keV |
| Gamow peak | 6.1 keV | about 6 keV |
| ⟨σv⟩ for p + p | about 1.4 × 10⁻⁴⁹ m³/s | about 1 × 10⁻⁴⁹ m³/s |
| Temperature dependence of the pp rate | about T⁴ | about T⁴ |
| Temperature dependence of CNO at 20 million K | about T¹⁶ | about T¹⁶–T¹⁸ |

At 10 keV, D–T comes out about half the accepted value, because the model
leaves out the D–T resonance.

## Batch experiments

**📊 Batch run** runs the model many times with no drawing: Repeat gives a histogram against theory, Sweep
steps one setting and plots mean ± 1 SD against the theory line, with summary statistics and CSV download.

**Batch settings table.** The panel lists every setting the chosen outcome uses: the reaction, tunnelling on
or off, the temperature and (for reaction rates and waiting times) the pressure, both as log₁₀ values, and
(for the Monte Carlo outcomes) the number of collisions simulated per run. Tick one setting to vary it and give from / to / step (+ adds the step, × multiplies by it; up to 60 steps, previewed as you type); every other setting stays at the value shown, and a run uses exactly what the table shows. Unticking goes back to Repeat. One-click experiments fill in the whole table (press ▶ Run batch to run), and **↺ Use my left-panel settings** copies the left panel into it. The number of runs,
runs per step and random seed sit above the table.

| Question | What it shows |
|---|---|
| Is the Sun hot enough without quantum tunnelling? | The classical chance is about 10⁻¹⁹⁰ at the Sun's core; with tunnelling it is about 10⁻⁵ |
| Do the fusing nuclei sit at the Gamow peak? | D–T at 10 keV: a Monte Carlo mean of 39.3 keV against 39.3 keV theory |
| How rare is a fusing collision in a tokamak? | D–T at 150 million K: 7.2 × 10⁻⁴ per collision, with Poisson scatter |
| How steeply does the Sun's fusion rate rise with temperature? | The log–log gradient is about 4 |
| Why do heavy stars use the CNO cycle? | The gradient is about 15–16 |
| Squeeze it: does doubling the pressure double the rate? | The gradient is 2.00, because the rate goes as P² |
| How long does a proton in the Sun wait to fuse? | Exponential waiting times averaging a few billion years |
