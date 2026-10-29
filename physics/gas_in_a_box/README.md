# Gas in a Box

A single, self-contained HTML file (`gas-in-a-box.html`) for teaching the
kinetic theory of gases, the gas laws, thermodynamics, heat engines and
diffusion (GCSE / iGCSE physics and chemistry, with an A-level "Advanced"
level). It needs no install and no internet: **open `gas-in-a-box.html` in
Chrome or Edge**.

It replaces three older pages: the WJEC Streamlit pages *Kinetic Theory*
(`07_Kinetic_Theory.py`) and *Ideal Gas Processes* (`17_Ideal_Gas_Processes.py`),
and the Edexcel iGCSE chemistry page *Diffusion* (`chem_sims/19_Diffusion.html`).
Everything those pages had is here.

## Tabs and levels

Tabs along the top of the centre view:

| Tab | What it shows |
|---|---|
| 🔬 Molecules | Hundreds of molecules bouncing in a flat (2D) box: pressure, temperature, speed distribution, mean free path, Brownian motion, mixing (details below) |
| 📏 Gas laws | Boyle's, Charles's and Gay-Lussac's (pressure) laws, all three as isotherms, and pV = nRT with kinetic theory, for a real 3D gas in SI units. Real-world presets: bicycle tyre, car engine cylinder, scuba tank, hot air balloon, weather balloon |
| 🔁 Processes & first law | pV diagram with isothermal, isobaric, isochoric and adiabatic processes from a chosen start state; W, ΔU, Q, ΔT, ΔV for each, with a ΔU = Q − W check; an animated cylinder runs the chosen process and shades the area under the curve (work done) |
| ⚙️ Heat engines | Otto, Diesel and Stirling cycles with numbered states, the work area, efficiency against the Carnot limit and a state table; a dot runs round the cycle while the cylinder animates each stroke |
| 🧪 Diffusion | iGCSE chemistry: the ammonia + hydrogen chloride tube (white NH₄Cl ring), potassium manganate(VII) spreading in still water, the effect of temperature and of molecular mass, with a guided tour |

**Level: Standard / Advanced** (top right). Advanced adds the A-level content
from the old pages: thermostat (target temperature + Heat/Cool), the p against
1/A (Boyle) graph, the mean free path, the choice of γ (diatomic/monatomic), the
Carnot cycle overlay, the Diesel cut-off ratio, Otto vs Diesel comparison, Otto
efficiency against compression ratio, and the advanced physics notes
(derivation of p = ⅓ρ⟨c²⟩, equipartition, entropy and the second law, Carnot's
theorem, refrigerators, real vs ideal engines).

**📐 Physics notes** (right panel) give the spec reference, key equations and
explanation for the current tab. **📝 Exam practice** has the old pages'
questions, grouped by topic, with marks, hints and "Show mark scheme" working.
The kinetic theory and gas processes answers are recalculated live from the
current slider values.

**Display quality** (Low / Medium / High / Ultra, default High) changes drawing
detail only: histogram bars, trail detail, cylinder dots and the number of
molecules drawn in the diffusion tube. Canvases are sized for the screen's pixel
ratio. Physics and batch runs do not change with it (batch diffusion runs always
use 35 molecules per cm, the High setting).

## The Molecules tab

### What you can change

**The gas** (press *Reset* to apply; a fact card describes nitrogen, helium and argon):
- Gas: helium, neon, nitrogen, oxygen, argon, carbon dioxide or xenon (real masses and molecule sizes)
- An optional second gas (or the same gas in a second colour) and how much of it there is
- Number of molecules (20–1200)
- Starting speeds: all exactly the same, or already Maxwell–Boltzmann
- A partition down the middle (gas 1 left, gas 2 right), with a *Remove partition* button
- One big, heavy particle, for Brownian motion (with its trail)
- Random seed (the same seed gives exactly the same run)

**Takes effect at once:**
- Temperature. With plain walls every molecule is sped up or slowed down
  at once. With **heated walls**, molecules that hit a wall leave at the wall
  temperature, so the gas warms or cools over time.
- The piston (the right-hand wall) can be held still, pushed or pulled to a
  width at 20, 100 or 400 m/s (or dragged on the picture), or left free with
  a set outside pressure pushing on it.
- Colour molecules by speed or by gas.

Speed: ½×, 1×, 4×, 15×. At 1×, 25 ps of gas time pass each real second. *Step* advances 1 ps at a time.

The speed histogram marks the most probable, mean and r.m.s. speeds. An "atmospheric escape" box gives the fraction of molecules of the chosen gas (as a real 3D gas) faster than Earth's escape velocity. With two gases a tile shows the KE ratio (equipartition predicts 1).

### Presets

| Preset | Idea |
|---|---|
| Speeds settle | Every molecule starts at the same speed; the histogram relaxes into the 2D Maxwell–Boltzmann curve |
| Boyle's law | Slow squeeze with heated walls (isothermal): pA = constant on the p–V graph |
| Charles's law | Free piston, walls heated from 150 K to 600 K: width ∝ T |
| Pressure law | Fixed box heated from 100 K to 700 K: p ∝ T, through 0 K |
| Brownian motion | Big particle's random walk; mean square displacement against time with the 4Dt theory |
| Light vs heavy | Helium and xenon start at the same speed and end with the same average KE (equipartition) |
| Adiabatic squeeze | Unheated walls: squeezing heats the gas; data follow pA² = constant (2D adiabat) |
| Mixing gases | The partition lifts and the two colours diffuse together; diffusion-equation theory curve |
| Very thin gas | 40 molecules: mean free path longer than the box |

### Readouts and graphs

Temperature (from KE), 2D pressure from wall impulses (averaged over 100 ps),
3D-equivalent pressure, pA ÷ NkT (ideal 1, and the value with molecule size),
mean speed, measured and theoretical mean free path and collision rate, mean KE
of each gas, and the Brownian particle's diffusion coefficient. Graphs: live speed
histogram with the 2D Maxwell–Boltzmann curve, plus a choice of pA ÷ NkT over time,
p–V diagram (isotherm and adiabat), p against T, width against T, Brownian mean
square displacement, or mixing progress.

### The model

- Units inside the code: nm, ps, atomic mass units; k = 0.0083145 u·nm²/ps² per K.
  Box 50 nm high, width 15–110 nm. Real kinetic diameters (e.g. N₂ 0.364 nm), drawn to scale.
- Molecules are smooth hard discs with perfectly elastic collisions (momentum
  swapped along the line of centres). Time steps are chosen so the fastest
  molecule moves at most ¼ of a diameter per step; a cell grid finds neighbours.
- 2D kinetic theory used for the comparisons:
  - average KE = kT (two ways to move), so T = ⟨½mv²⟩ / k
  - ideal gas: pA = NkT, with p = force per unit length (N/m, shown as mN/m)
  - with molecule size (hard discs): pA/NkT = 1 + 2φ(1 − 7φ/16)/(1 − φ)², φ = area fraction covered
  - speeds: Rayleigh distribution f(v) = (mv/kT)·exp(−mv²/2kT); mean √(πkT/2m)
  - mean free path λ = 1/(2√2·n·d); collision rate = mean speed / λ
  - adiabatic (no heat flow) in 2D: γ = 2, so T·A and p·A² stay constant
  - self-diffusion D = (1/2nd)·√(kT/πm); mixing follows the diffusion equation across the box
  - Brownian particle (radius 3 nm, 2000 u): D = √(kT/2πm)/(2nR), ⟨r²⟩ = 4D(t − τ(1 − e^(−t/τ))), τ = MD/kT
  - 3D-equivalent pressure: a 3D gas with the same spacing between molecules, p = n^(3/2)·kT
- Heated walls send molecules back with a random speed typical of the wall temperature.
  A free piston has a mass of 2000 u and a little friction.

**Left out / where it differs from reality:** it is 2D; molecules don't attract
(no condensation) and don't spin or vibrate; the box is tiny so readings
fluctuate; the Brownian particle is much lighter than a real one of its size (this
changes how soon it starts random-walking, not D); the step-by-step collisions let
discs overlap slightly, so they behave about 1% smaller than their real size.


## The other tabs: the model

- **Gas laws / processes / engines** use an ideal gas, pV = nRT, R = 8.314 J/(mol K).
  Internal energy U = nC_VT with C_V = R/(γ − 1) (5/2 R for air, 3/2 R for a monatomic gas).
  Work done by the gas W = ∫p dV (isothermal nRT ln(V₂/V₁), isobaric pΔV, isochoric 0,
  adiabatic (p₁V₁ − p₂V₂)/(γ − 1), with pV^γ = constant). Engines are air-standard
  cycles (γ = 1.4): Otto η = 1 − r^(1−γ); Stirling with a perfect regenerator reaches the Carnot efficiency.
- **Corrections to the old pages:** ΔU now uses C_V for the chosen γ (the old page always
  used 5/2 R, so ΔU = Q − W failed for helium); ΔV keeps its sign (the old page always
  showed it positive); the Carnot overlay's fourth corner is now on the adiabat
  (the old page used T_c/T_h instead of T_h/T_c); the mean free path at fixed volume is
  explained as constant (the old caption said it rises with T).
- **Diffusion tube:** 1 m long, 1 cm slices. Ammonia and the acid gas random-walk from
  cotton wool that keeps each end topped up; D(NH₃) = 0.23 cm²/s at 25 °C, D ∝ 1/√Mr
  (Graham's law) and ∝ T^1.5. Molecules meeting in the same slice react to make the
  white solid. The ring first appears where the leading edges meet (each spreads ∝ √(Dt),
  so at M^¼ ratios, 55% of the way from the ammonia end), then the reaction zone drifts over a
  few hours to where both gases arrive at the same rate: Graham's law, 59%. Real tubes
  often show about 60–67% (gases pushing through air, convection and the ring itself are not modelled).
- **Liquid:** KMnO₄ ions random-walk in still water, D = 1.6 × 10⁻⁵ cm²/s at 25 °C,
  scaled by T/viscosity (Stokes–Einstein, Vogel viscosity). There is no convection, so real
  beakers mix faster.

## Batch run

The **📊 Batch run** button opens a panel that runs the model many times with no
drawing (using a seeded random number generator so results can be repeated).
*Repeat* mode runs the same settings with different random starts and draws a
histogram; *Sweep* mode steps any one setting in the batch settings table and plots
mean ± 1 SD with the theory curve, with optional log axes and a fitted gradient. Each batch reports n, mean, SD, standard
error, min, max, the theory value and the difference (in % and in standard errors),
and can be downloaded as CSV. Batch runs of the box use one gas, unheated walls and a fixed piston.
Each one-click experiment sets every input itself (from fixed defaults), so the
experiments give the same results whatever is on the left panel and in any order.

**Batch settings table.** The panel lists every setting the chosen outcome uses: for the box, the gas, box
width, temperature, number of molecules and molecule mass (plus the piston speed for the adiabatic squeeze,
20 m/s by default); for the diffusion tube, the acid gas Mr, the tube temperature and the number of molecules
per cm (35 by default). Tick one setting to vary it and give from / to / step (+ adds the step, × multiplies by it; up to 60 steps, previewed as you type); every other setting stays at the value shown, and a run uses exactly what the table shows. Unticking goes back to Repeat. One-click experiments fill in the whole table (press ▶ Run batch to run), and **↺ Use my left-panel settings** copies the left panel into it.

Built-in experiments and typical results (on a laptop; each under about 30 s):

| Question | Result |
|---|---|
| Does pV = NkT hold? (50 runs, N₂, 400 molecules, 300 K) | pA/NkT = 1.040 ± 0.001 (SE); ideal 1, molecule-size theory 1.049 |
| Boyle's law: p ∝ 1/V? (width 20–100 nm) | log–log gradient −1.058 (theory −1.051); each point within 3% |
| Pressure law: p ∝ T? (100–700 K) | straight line through about 0, gradient within 5% of theory |
| Do speeds settle into Maxwell–Boltzmann? (20 runs from equal speeds) | pooled histogram matches the Rayleigh curve; mean speed 375 m/s vs 374 m/s |
| Brownian motion: ⟨r²⟩ = 4Dt? (20 runs) | D = 0.086 ± 0.013 nm²/ps vs theory 0.084 |
| Mixing: more molecules mix slower? (200–1000 molecules) | mixing time rises roughly in proportion to N; within 10–30% of diffusion theory |
| Light vs heavy: v ∝ 1/√m? (4–131 u) | log–log gradient −0.507 (theory −0.500) |
| Adiabatic squeeze: T × A constant? (100 nm → 20–80 nm at 20 m/s) | within 1–4% of T₀A₀/A (slightly hotter: the piston is not infinitely slow) |
| Where does the white ring first appear? (20 runs) | 0.550 of the tube from the NH₃ end vs √D-fronts theory 0.548 (Graham 0.594) |
| Where does the ring settle? (10 runs, 3.5 h) | 0.593 vs Graham's law 0.594 |
| Heavier acid gas (Mr 20–130) | settled position within 2% of √M ÷ (√17 + √M) |
| Does warming speed up diffusion? (0–100 °C) | ring time falls from 25 to 15 min, within ~7% of the T^−1.5 scaling |
