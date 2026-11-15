# Electrolysis

Pass a current through a molten or dissolved ionic compound. Watch the ions move to the
electrodes, see which product forms at each electrode and why, read the half-equations,
and use Faraday's constant to predict how much metal or gas forms.
Edexcel International GCSE Chemistry, Topic 1 (electrolysis; the Faraday calculations are
marked "Chemistry only").

Replaces the old page `chem_sims/05_Electrolysis.html`. Extracting aluminium by
electrolysis is in the **Reactivity and extracting metals** simulation
(`../reactivity_metals/`).

## How to run

Open `electrolysis.html` in Chrome or Edge. No install, no internet.

## Levels (Standard / Advanced)

A **Standard (iGCSE) / Advanced (A level)** switch sits at the top of the left panel. Standard follows Pearson Edexcel International GCSE Chemistry (4CH1); Advanced follows Pearson Edexcel A level Chemistry (9CH0) and keeps everything in Standard. The choice is remembered in the browser. Key ideas carry spec tags (grey-green 4CH1, purple 9CH0, blue-grey beyond the spec). The presets listed below are shown at both levels; Advanced adds its own presets and an A level box under the readings. Batch runs are the same at both levels.

- **Standard:** 4CH1 Section 1(i) Electrolysis (with the gas tests from 2(h)); the Faraday
  calculations stay marked Chemistry only.
- **Advanced:** 9CH0 Topic 3 Redox I. Oxidation-number readings for the cell on screen, six A level
  presets (oxidation numbers: CuSO₄; brine: the overall equation; disproportionation: bleach; water
  is oxidised: H₂SO₄; building a half-equation; a copper anode is oxidised) and seven A level exam
  questions. **A level box:** *This cell* (oxidation-number diagram of every element at both
  electrodes, the half-equations and the overall ionic equation) and *Half-equation builder*
  (eight reductions and nine oxidations, balanced step by step, then combined so the electrons
  cancel). Electrode potentials (Topic 14) are left to the separate Electrochemical cells simulation.

## What it shows

- **The cell**: a d.c. supply with ammeter and voltmeter, electrons moving in the wires,
  and the ions moving through the liquid (cations to the cathode, anions to the anode).
  Molten salts are in a crucible over a Bunsen burner (untick "heat" and the solid does not
  conduct); solutions have collecting tubes over each electrode with a 0–50 cm³ scale;
  copper electrodes hang in the beaker and the anode thins. Products show as a copper or
  silver coating, a bead of molten lead, bubbles, brown bromine vapour, iodine colouring the
  solution and the blue of copper(II) sulfate fading. Universal indicator shows alkali
  forming at the cathode and acid at the anode (chlorine bleaches it).
- Beside the cell: the product at each electrode, the half-equation (with the "from water"
  form), why that ion is discharged, what you see, and what is left in the solution.
- **Close-up**: ions arriving at each electrode surface and gaining or losing electrons
  (reduction at the cathode, oxidation at the anode); atoms join the cathode or pair up into
  molecules; with a copper anode, copper atoms leave as Cu²⁺.
- Right panel: readings (current, voltage, charge, moles of electrons, amounts at each
  electrode against Faraday, ion left, pH), charts of each product against time with the
  Faraday line, a "Which ion is discharged?" table, key ideas and exam practice.

Electrolytes: lead(II) bromide (molten), silver nitrate, copper(II) sulfate (carbon or copper
electrodes), copper(II) chloride, sodium chloride (molten), sodium chloride solution (any
concentration: dilute gives oxygen, concentrated gives chlorine), dilute hydrochloric acid,
potassium iodide, dilute sulfuric acid, sodium sulfate, and sugar solution (covalent, no
current).

12 presets: molten lead(II) bromide, solid lead(II) bromide, copper sulfate with carbon
electrodes, copper sulfate with copper electrodes, concentrated brine, dilute sodium
chloride, dilute sulfuric acid, sodium sulfate + indicator, potassium iodide, copper(II)
chloride, silver nitrate, sugar solution.

Controls: electrolyte, heat (molten salts), electrodes, concentration, volume, universal
indicator, current set on the supply, the supply's maximum voltage, electrode area, time
before switching off, picture detail (Low / Medium / High / Ultra: number of ions, water
molecules, glow). Speed 1×, 10×, 60×, 300×.

Exam practice: the three questions from the old page, three on conduction and reduction,
and live questions on the chosen electrolyte (products and why, half-equations, gas tests,
Faraday calculations for the cathode and anode).

## The model

- Products follow the specification rules: molten → metal and non-metal; in solution the
  metal forms only if it is below hydrogen (Cu, Ag), otherwise hydrogen; halide → halogen
  (chloride only when concentrated: the share of chlorine is c² ÷ (c² + 0.25), an
  illustrative curve), otherwise oxygen from OH⁻; a copper anode dissolves.
- Current = the set current, unless the supply cannot reach it:
  I ≤ (V_supply − V_decomposition) ÷ R, R = 4 cm ÷ (conductivity × area).
- Faraday: moles of electrons = I t ÷ 96 485; metal = ÷ z; gas = ÷ electrons per molecule;
  24 000 cm³ per mole at 20 °C.
- Ions are used up (copper sulfate loses its colour; then hydrogen forms). Gases dissolve
  first (H₂ 1.6, O₂ 3.1, Cl₂ about 20 cm³ per 100 cm³). Above about 0.04 A/cm² (copper) or
  0.01 A/cm² (silver) the deposit is loose and part falls off.
- Every assumption is listed in the simulation under "How the model works (and what it
  leaves out)".

## Batch run

Press **📊 Batch run**. The settings table lists every starting value; tick one to sweep it.
Random parts: the ammeter (true current ±1–2%), the stopwatch, the balance (two weighings),
reading the gas tubes, copper lost when washing, and the room temperature.

| Experiment | Result (theory) |
|---|---|
| Is the mass of copper proportional to the time? (0.5 A, 5–40 min) | straight line, 0.00982 g/min (Faraday 0.00988); 0.193 g at 20 min (0.198) |
| Does doubling the current double the copper? (20 min, 10 cm²) | follows Faraday to 0.3 A; 0.39 g at 1.5 A against 0.59 g (loose deposit) |
| How close does a class get to Faraday? (100 repeats) | mean 0.194 g, SD 0.008 g (Faraday 0.198 g; 1–2% lost in washing) |
| Same charge, different metals (900 C) | Pb 0.958 (0.966), Ag 0.996 (1.006), Cu 0.291 (0.296) g |
| Hydrogen : oxygen, always 2 : 1? | 5.5 at 3 min, falling to 2.24 at 30 min (Faraday 2) |
| Why is there less chlorine than hydrogen? (brine, 0.2 A) | 25.9 cm³ collected at 30 min against 44.4 cm³ made |

Results download as CSV.
