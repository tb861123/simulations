# Weather Chaos and the Butterfly Effect

A single, self-contained HTML file (`weather-chaos.html`). **Open it in Chrome or Edge**: no install, no internet.
Why can't weather be forecast more than about two weeks ahead, however good the instruments? Two classic toy
atmospheres by Edward Lorenz show it.

## Two tabs

1. **Lorenz 63: convection.** Three equations for a heated layer of air. Two forecasts start a tiny distance δ apart
   (the size of one butterfly flap). Watch them travel together round the butterfly-shaped attractor and then split.
   Switch to **Ensemble** to start up to 300 forecasts in a tiny blob and watch the cloud smear across the whole attractor.
   Panels: the attractor (x–z, x–y or y–z), x against time, and the separation on a log scale against the theoretical
   growth e^(0.906 t). Sliders: δ, the heating ρ (chaos switches on above ρ ≈ 24.7), the "forecast failed" threshold, and the
   speed. **Measure forecast horizon** plots how long a forecast lasts against δ: a million times better data buys only a few
   more time units.
2. **Lorenz 96: weather map.** A ring of 40 stations (20–60) with wind, friction and heating F. Perturb ONE station by
   δ and watch the error spread round the ring: weather ring (true, perturbed, difference), two Hovmöller diagrams (station
   against time for the weather and for the error), the RMS error on a log scale against the level two unrelated states would
   have, and a station time series. **Ensemble** mode shows a spaghetti plot, the ensemble spread and the error of the ensemble
   mean. One time unit is taken as 5 days (Lorenz & Emanuel 1998), so the error doubling time at F = 8 comes out near 2 days,
   as in the real atmosphere.

## Screen layout

Controls on the left, graphs in the centre, readouts on the right. The header's **◧ Hide controls**, **Hide readouts ◨**
and **⛶ Full screen** buttons (keys `[`, `]`, `F`) hide the side panels or show only the graphs; the ⋮ bars between the
panels drag to resize them (double-click resets), and the layout is remembered in the browser. A one-time tip points this out.
There is **no quality setting**, on purpose: the pictures are cheap to draw (a few lines, at most 300 dots and two grids of
4,800 coloured cells), so the left panel says so instead.

## 📊 Batch run

The batch window has the set-up on the left and the results on the right (▶ Run batch at the top, visible without scrolling
at 1280×720). Choose what to **Record** (Lorenz-63 forecast length, Lorenz-96 growth rate λ, Lorenz-96 forecast length, or
the ensemble-mean error ratio) and the **starting settings table** lists every starting setting that model uses (ρ, σ, β,
δ, failure threshold and give-up time for Lorenz 63; F, K, δ, threshold, measuring time, ensemble size N, starting
uncertainty σ₀, lead time and where to perturb for Lorenz 96). Edit any value; tick one to sweep it from → to in steps
(+ or ×); **↺ Use my left-panel settings** copies the sliders. Theory lines are drawn only where the theory applies
(λ = 0.906 is known only for σ = 10, β = 8/3, ρ = 28; λ ≈ 1.67 only for 40 stations and F = 8).

Five one-click experiments set the table for you, run many seeded simulations without drawing (repeat with new random
starts, or sweep one setting), show mean, SD and standard error against theory, and export CSV:

| Experiment | Theory compared |
|---|---|
| How long does a Lorenz-63 forecast last? (repeat) | t = ln(threshold/δ)/λ, λ = 0.906 |
| Do 1000× better measurements give 1000× longer forecasts? (sweep δ) | gain per factor 10 = ln10/λ ≈ 2.5 time units |
| How chaotic is Lorenz 96 as F increases? (sweep F) | literature λ ≈ 1.67 at F = 8 |
| How long does a one-station butterfly take to ruin a Lorenz-96 forecast? (repeat) | t = ln(threshold·√K/δ)/λ |
| How much does averaging an ensemble help? (sweep N) | RMS ratio √((1 + 1/N)/2) |

`worksheets.html` holds the printable worksheets (made with `tools/worksheets`; re-run them if the experiments change).

## Model, numerics and honesty

* Lorenz 63: dx/dt = σ(y − x), dy/dt = x(ρ − z) − y, dz/dt = xy − βz (σ = 10, β = 8/3, ρ = 28 by default).
* Lorenz 96: dX<sub>k</sub>/dt = (X<sub>k+1</sub> − X<sub>k−2</sub>) X<sub>k−1</sub> − X<sub>k</sub> + F, indices wrapping round the ring.
* Fourth-order Runge–Kutta, fixed step 0.01. Seeded random numbers (mulberry32) make every batch run reproducible.
* Largest Lyapunov exponent measured by the Benettin method inside the file: 0.906 for Lorenz 63 and 1.69 ± 0.03 (SE, 20 runs) for Lorenz 96 at
  F = 8, matching the literature (0.9056 and ≈ 1.67).
* These are toy models: no real geography, units or physics of clouds. The in-app "How the model works" lists the assumptions.
* Observed discrepancy, not explained away: in the Lorenz-63 horizon experiments the measured forecast time sits a roughly constant
  1–2 time units below ln(threshold/δ)/λ (the slope per decade of accuracy does match). A likely cause is transient growth of random-direction
  errors; this was not separately tested.

No setup needed. Single file; the only dependencies are a modern browser.
