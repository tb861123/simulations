# Circuits: EMF, I–V and AC

A teaching simulation of DC and AC circuits. Charges move round each
circuit so students can see the current.

## Levels

- **Standard (iGCSE):** Pearson Edexcel International GCSE Physics (4PH1)
  Section 2 Electricity: series and parallel circuits, V = IR, I–V
  characteristics (with the practical), LDRs and thermistors, Q = It, E = QV,
  P = IV, a.c. and d.c. The new **Series, parallel & sensors** tab (first tab)
  covers most of it.
- **Advanced (A level):** WJEC Eduqas conduction of electricity, resistance
  and D.C. circuits (Component 2, Topics 1 and 2 on the old page): potential
  dividers, 1/R = 1/R₁ + 1/R₂, Kirchhoff's laws, EMF and internal resistance,
  I–V characteristics, resistivity.
- The **AC circuits** tab is Eduqas option A (Alternating currents), which is
  not taught: it is kept, and tagged "Beyond the spec (Eduqas option A, not
  taught)" on the tab, in its controls, notes, key ideas and exam questions.

The level switch (Standard (iGCSE) / Advanced (A level)) has a hint naming the
spec, and a key-ideas box tags each idea. It replaces three pages of the old
WJEC Streamlit app: 26 EMF & Internal Resistance, 27 I-V Characteristics and
08 AC Circuits.

## How to run

Open `circuits.html` in Chrome or Edge. There is nothing to install and no
internet is needed.

## What it shows

Five tabs at the top of the main view:

| Tab | What you see |
|---|---|
| 🔀 Series, parallel & sensors (new) | An ideal cell with R₁ and a second component (fixed resistor, LDR or NTC thermistor) in series or in parallel, with ammeters and voltmeters, moving charges (faster in the branch with more current), a sun or thermometer for the sensor, and a readout. Graphs: the sensor's resistance against light or temperature, or how the p.d. (series) or current (parallel) is shared; Advanced adds the potential-divider output V_out. |
| 🔋 EMF & internal resistance | A cell (ideal EMF ε plus internal resistance r) driving a load R. Charges flow faster as the current rises; the load and cell glow with the power they dissipate. A voltmeter dial shows the terminal p.d. and a readout shows the energy split between load and cell. |
| 📈 I–V characteristics | An ohmic resistor, filament lamp, diode or NTC thermistor on a variable supply with an ammeter and voltmeter, and a live I–V curve. The lamp glows; the diode blocks below 0.6 V and in reverse. |
| 🧵 Resistivity | A wire drawn to scale (length and thickness) with electrons drifting through the lattice, and R = ρL/A worked out. |
| 〜 AC circuits (beyond the spec: Eduqas option A, not taught) | Pure R, RC, RL or RLC series circuits: charges slosh back and forth, rotating phasors (V, I, V_R, V_L, V_C) and an oscilloscope trace. Slow motion: one cycle every 2 s at 1×. |

**Standard / Advanced.** Advanced adds efficiency and maximum-power analysis
(efficiency curve on the power graph), all four I–V curves compared, the AC
power triangle and Q factor, and optional Bode plot, RLC resonance curve (with
its own R slider), power analysis p(t) and Lissajous figure.

## Controls

- Presets for each tab (27 in all: six new ones for series and parallel
  resistors, an LDR in bright light and in the dark, a thermistor cold and hot), including the five real-world AC presets
  from the old page (mains, AM radio tuner, audio bass filter, fluorescent
  ballast, MRI gradient coil).
- Series, parallel & sensors: series or parallel, cell p.d., R₁, component 2
  (fixed R₂, LDR with a light slider, thermistor with a temperature slider).
- EMF: ε, r, R; Advanced "Show max power point".
- I–V: component, applied voltage, and the component's own setting (R, R₀,
  I_s or the thermistor R₀).
- Resistivity: material (with its resistivity table), length, area or diameter.
- AC: circuit type, V₀, frequency (log, 1 Hz to 2 MHz), R, C, L (log sliders).
- Play/Pause, Reset, speed ¼× to 4×, "Show electrons" (electrons move the
  opposite way to conventional current), Batch run.
- Right panel: readings, graphs, physics notes, exam practice (10 questions,
  answers update live), and "How the model works".

## Exam practice

- **Standard (iGCSE 4PH1 Section 2):** twelve questions: the series current,
  the shared p.d.s, the parallel branch currents, why parallel gives more
  current, LDR and thermistor, Q = It and E = QV, P = IV (from the new tab's
  numbers), the I–V practical, the three I–V graphs, R = V/I from the I–V tab,
  and a.c. against d.c.
- **Advanced (A level, Eduqas):** a new potential-divider set (V_out, the LDR
  street-light circuit, parallel resistance, Kirchhoff's laws, why a
  thermistor's resistance falls), then the old page's EMF, I–V/resistivity and
  AC questions (the AC set titled as beyond the spec).

## Batch run: new experiments

Four one-click experiments were **added** for the new tab (the 15 existing ones
are unchanged): LDR resistance against light, thermistor resistance against
temperature, potential-divider V_out against R₂, and the parallel cell current
I₁ + I₂.

## The model

- EMF: I = ε/(R + r), V = ε − Ir, P_R = I²R, P_r = I²r, η = R/(R + r);
  maximum power ε²/4r at R = r.
- I–V: ohmic I = V/R; lamp I = sign(V)(|V|/R₀)^(1/1.8); diode
  I = I_s(e^(V/nV_T) − 1) with V_T = 25 mV, n = 1.8, capped at 100 mA;
  thermistor I = V(1 + 0.6|V|)/R₀.
- Resistivity: R = ρL/A, A = πd²/4.
- AC: X_L = ωL, X_C = 1/ωC, Z = √(R² + (X_L − X_C)²), tan φ = (X_L − X_C)/R,
  V_rms = V₀/√2, P = V_rms I_rms cos φ, f₀ = 1/(2π√LC), Q = (1/R)√(L/C).

Assumptions (also listed in the page): ideal wires and meters; fixed internal
resistance; made-up but realistic lamp and thermistor laws; steady-state AC
with ideal L and C; charge animation shows direction and relative size of the
current, not real drift speeds.

## Batch run

Every setting a run uses is in the batch settings table; one-click experiments
fill it in. Tick one row to sweep it (+ or × steps), untick to repeat. Results
show mean, SD, standard error and theory; CSV download.

| Experiment | What it shows |
|---|---|
| Find ε from a V–I graph | 6 readings with 2% meter errors; intercept clusters round ε |
| Find r from the same graph | −gradient clusters round r, less precisely |
| Do more readings make r more precise? | SD of r shrinks as readings go from 3 to 15 |
| Is the most power delivered when R = r? | measured P = VI peaks at R = r |
| How does the terminal p.d. depend on R? | V = εR/(R + r) |
| I–V of a filament lamp | curve bending over |
| Does the lamp's resistance rise as it heats? | R = V/I rises with V |
| I–V of a diode | switch-on near 0.6 V |
| Is an ohmic resistor's I ∝ V? | gradient 1/R |
| Is R ∝ L? Measure ρ | ρ = gradient × A |
| Is R ∝ 1/A? | log–log gradient −1 |
| Is V_rms = V₀/√2? | data-logger samples at random moments; spread V_rms/√(8n) |
| Does V_rms rise in proportion to V₀? | gradient 0.707 |
| Where is the resonance peak? | I_rms peaks at f₀ = 503 Hz |
| Capacitor: is Z ∝ 1/f? | log–log gradient −1 |
