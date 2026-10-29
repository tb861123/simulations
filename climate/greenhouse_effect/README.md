# The Greenhouse Effect

A single, self-contained HTML file (`greenhouse-effect.html`) about the
greenhouse effect and the Earth's energy balance, for GCSE-level teaching.

**How to run:** open `greenhouse-effect.html` in Chrome or Edge, with no
install and no internet. Pick a preset and press **Start**.

## What it shows

A slice through the atmosphere from space down to the ground. Yellow packets
of sunlight come in; some bounce off clouds, haze or ice; the rest warm the
ground. The ground gives off red infrared packets. CO₂, water vapour and
methane molecules (drawn as atoms) absorb infrared, wiggle and glow, and
re-emit it up or down. Packets that reach the top escape to space. An
energy-flow column shows sunlight in, reflected, infrared out, the imbalance,
and the flows at the ground (absorbed sunlight, ground infrared and
back-radiation). Layer temperatures are labelled.

The right panel tells the story, gives the energy budget (W/m²), the surface
temperature, where it is heading, the greenhouse warming, the climate
sensitivity (warming for doubled CO₂) and the response time, with graphs of
temperature against time and of "energy in vs energy out" against
temperature (balance is where the lines cross).

## Controls

- **Planet's air:** Earth (1 bar), none, thin like Mars, very thick like Venus
- **CO₂** (logarithmic slider, 10 ppm to 100%), **methane** (ppb)
- **Water vapour feedback** on/off and its **strength** (W/m² per °C)
- **Sunlight** (solar constant, W/m²) and **albedo**
- **Volcanic eruption** buttons (Pinatubo-sized, and three times bigger)
- **Ocean mixed-layer depth** (how fast it warms) and **natural variability**
- Play/Pause, Reset, speed ½× to 100× (1× = one year per second)

## Presets

Earth with no atmosphere (−18 °C) · Pre-industrial Earth · Earth today (still
warming towards ~16 °C) · Doubled CO₂ · High emissions (1000 ppm) · Pinatubo
eruption · Snowball Earth albedo · Venus (~460 °C) · Mars (−58 °C) · No water
vapour feedback.

## The model

- Sunlight absorbed = (S/4)(1 − a).
- Infrared escaping to space: OLR = σT⁴ / (1 + τ/2). This comes from a stack
  of grey layers, each absorbing a fraction ε of the infrared reaching it and
  re-emitting it half up, half down: σTₛ⁴ = OLR × (1 + Nε/(2 − ε)), which for
  many thin layers is 1 + τ/2.
- τ = CO₂ part + methane part + water vapour part + fixed rest (clouds' infrared
  effect, ozone, N₂O). CO₂ adds logarithmically, calibrated so each doubling
  traps 5.35 ln 2 = 3.7 W/m² (ΔF = 5.35 ln(C/C₀)); methane uses
  0.036(√M − √M₀). Very thick air gets an extra pressure-broadening term, tuned
  to give Venus 737 K.
- Water vapour feedback: the water vapour part of τ rises with temperature to
  give the chosen feedback f near today's climate, fading out in very cold
  climates.
- Heat capacity: C dT/dt = absorbed sunlight − OLR + random variability, with
  C = 4.18 MJ/m³/K × mixed-layer depth.
- Calibration: pre-industrial Earth settles at 13.9 °C. With f = 2.1 W/m² per
  °C doubling CO₂ gives about 3.1 °C; with no feedback about 1.1 °C.

Assumptions and what is left out (no deep ocean, no ice–albedo feedback, no
carbon cycle, no convection or spectrum, global average only) are listed in
the app under "How the model works".

## Batch runs

**📊 Batch run** runs the model many times without drawing. Each run starts in
balance at 280 ppm (or at the chosen CO₂ for the sensitivity outcome), the
change is made, and the model runs with random year-to-year variability for
about 8 response times; the last 40 years are averaged. Modes: **Repeat**
(optionally giving each run a random feedback strength) and **Sweep** (CO₂,
methane, albedo, solar constant, ocean depth, feedback strength, variability).
Outcomes: final temperature, warming, climate sensitivity, time to reach 63%.
Results are plotted with theory and can be downloaded as CSV.

**Batch settings table.** The batch panel lists every starting setting of a
run: CO₂, methane, albedo, solar constant, ocean depth, feedback strength and
natural variability; the atmosphere, water vapour feedback and "uncertain
feedback" choices; and four things that used to be fixed: the uncertain
feedback's mean (2.05) and SD (0.3 W/m² per °C), the settling time (8
response times) and the years averaged at the end (40). Defaults are the old
values, so results are unchanged. Tick one setting to vary it and give from /
to / step (+ adds the step, × multiplies by it; up to 60 steps, previewed as
you type); every other setting stays at the value shown, and a run uses
exactly what the table shows. Unticking goes back to Repeat. Uncertain
feedback now works in sweeps too. One-click experiments set the left panel and
fill the whole table in, and **↺ Use my left-panel settings** copies the left
panel into it.

Batch experiments:

1. **How much warming per doubling of CO₂?** Temperature against ln(CO₂) is a
   straight line; the fitted gradient × ln 2 gives ≈ 3.1 °C per doubling
   (simple theory 3.0, no feedback 1.1, IPCC best estimate 3).
2. **No atmosphere: is T = (S(1 − a)/4σ)^¼?** Fitted gradient 1.000.
3. **Climate sensitivity ensemble.** Feedback drawn at random for each run:
   median ≈ 3 °C with a long tail to high values; compare with the IPCC likely
   range 2.5–4 °C.
4. **Without feedback, ~1.1 °C?** Model 1.14 °C, simple formula 1.12 °C.
5. **Does a deeper ocean slow the warming?** Time to 63% grows in proportion
   to depth (0.112 years per metre, as theory predicts).
6. **Stronger feedback, more warming?** Sensitivity follows 3.7/(λ₀ − f) and
   shoots up as f approaches λ₀.
