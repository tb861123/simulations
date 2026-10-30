# Capacitor Charge and Discharge

A teaching simulation of an RC circuit for WJEC Eduqas A level Physics
(Component 2, Topic 4, Capacitance, sections (i) and (j)). It replaces page 03
(Capacitor Charge & Discharge) of the old WJEC Streamlit app.

## How to run

Open `capacitors.html` in Chrome or Edge. There is nothing to install and no
internet is needed.

## What it shows

- A circuit with a cell, a two-way switch, a resistor and a capacitor. Moving
  the switch up charges the capacitor; down cuts the cell out so the capacitor
  discharges back round through R. Charges flow (and slow down) round the loop,
  + and − charge builds up on the plates, and the resistor glows with I²R.
- A voltage meter with a mini V–t graph, τ markers and a charge bar.
- Q, V and I against time over 6τ with τ, 2τ and 5τ marked and a live cursor.
- Click the capacitor (or ⇄ Flip) to move the switch; "Auto" flips it when
  charged or discharged.
- Animation time is scaled so 5τ takes about 3 s at 1×; the clock shows the
  real circuit time.

**Standard / Advanced.** Advanced adds the ln V (or ln(V₀ − V)) graph with its
fitted gradient −1/RC, a series/parallel builder (C₁, C₂, C₃, with "use C_total
in simulation"), the energy Q–V graph, a leaky capacitor (R_leak in parallel,
dotted curve) and an RC target calculator.

## Controls

Presets (the old page's camera flash, defibrillator, power-supply smoother and
audio crossover, plus a 10 s lab capacitor, charging through 1 kΩ, a leaky
capacitor and series vs parallel), C, R and V₀ (log sliders), Discharging /
Charging, Auto flip, Play/Pause, Reset, speed, Show electrons, Batch run. The
right panel has readings, energy efficiency (charging), physics notes, exam
practice (3 questions, live answers) and "How the model works".

**Picture quality** (Low / Medium / High / Ultra, default Medium): how sharply the live view is drawn. Low draws at standard resolution and redraws about 30 times a second, for slower laptops and tablets; High and Ultra draw at 1.5× and 2× the screen's resolution for smoother edges. Only the drawing changes: the model and batch-run results are identical at every level. The choice is remembered in this browser.

## The model

τ = RC; discharge V = V₀e^(−t/RC); charge V = V₀(1 − e^(−t/RC));
I = (V₀/R)e^(−t/RC); Q = CV; t½ = RC ln 2; U = ½CV²; series
1/C = Σ1/Cᵢ, parallel C = ΣCᵢ; leaky τ_eff = R R_L C/(R + R_L). Charging from a
fixed supply always wastes half the energy taken from the supply.

Assumptions (also listed in the page): ideal components and switch, no cell
internal resistance, exact exponential formulas, "fully" = 5τ, leakage applied
to discharge only.

## Batch run

The batch settings table shows every setting a run uses (C, R, V₀, data-logger
noise and number of readings, logging time, stopwatch reaction time, capacitor
tolerance, leakage, mode). Tick one to sweep it.

| Experiment | What it shows |
|---|---|
| Measure τ from one discharge (data logger) | τ from the ln V gradient clusters tightly round RC = 10 s |
| Stopwatch at 37%: how precise? | spread √2 × reaction time SD (0.28 s) |
| Is τ ∝ R? | log–log gradient 1 |
| Is τ ∝ C? | straight line, gradient R |
| Half-life: is t½ = RC ln 2? | gradient C ln 2 |
| How much does leakage shorten τ? | τ_eff = R R_L C/(R + R_L) |
| Real capacitors: how much do they vary? | ±10% tolerance gives a 10% spread in τ |
