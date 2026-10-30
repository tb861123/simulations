# Young's Modulus and Stress–Strain

A single, self-contained HTML file for WJEC Eduqas A level Physics, Component 1,
Topic 3 (Deformation of Solids). It needs no install and no internet: **open
`youngs-modulus.html` in Chrome or Edge**.

It replaces the old WJEC Streamlit page *Young's Modulus & Stress-Strain*
(`physics_sims/pages/20_Youngs_Modulus.py`) and keeps all of its controls,
graphs, material data, notes and exam questions.

A wire hangs from a support with slotted masses on a hanger. Load it with the
force sliders or **Auto-stretch** (the load rises steadily until the wire breaks)
and watch it stretch elastically, yield, neck and snap. **Unload** takes the load
off: after plastic stretching the wire unloads along a line of gradient E and is
left permanently longer.

## Controls

- **Level:** Standard (GCSE) or Advanced (A level).
- **Material:** steel, copper, aluminium, rubber, bone, glass (typical values below).
- **Cross-section area A** 0.1–5 mm² (diameter shown), **original length L₀** 0.1–2 m.
- **Applied force F** 0–10 000 N, plus a fine slider (0–500 N) for thin or weak wires.
- **Advanced:** show the hysteresis loop (unloading path and the energy lost per m³);
  choose the materials for the comparison chart.
- **Magnify the extension** on the picture (Auto, ×1, ×10, ×100, ×1000): elastic
  extensions are often under a millimetre. Graphs and numbers are never magnified.
- **Picture quality** (Low / Medium / High / Ultra, default Medium): how sharply the live view is drawn. Low draws at standard resolution and redraws about 30 times a second, for slower laptops and tablets; High and Ultra draw at 1.5× and 2× the screen's resolution for smoother edges. Only the drawing changes: the model and batch-run results are identical at every level. The choice is remembered in this browser.
- Auto-stretch / Pause, Unload, New wire, speed ½×–4× (1×: the breaking load is
  reached in about 12 s).

## Views and readouts

- The wire and hanger, with L₀, ΔL, the region (elastic, plastic, failed), necking,
  the snap and the falling load.
- **Stress–strain graph** for the material, coloured by region, with the elastic
  limit / yield point, UTS and fracture marked, the path this wire has followed and
  where it is now; "Zoom: elastic region" button.
- **Force against extension** for this wire, with Hooke's law F = kΔL.
- Tiles: stress, strain, extension (and how much is permanent), E, k = EA/L₀, force
  and breaking force. Advanced adds elastic energy stored, resilience, toughness and
  the energy lost in the hysteresis loop.
- **Material data** (E, UTS, yield stress, fracture strain); Advanced: **material
  comparison** chart (strain axis capped at 30%) and a **spring constant table**
  k = EA/L₀ for every material.
- What's happening, 📐 Physics notes (spec reference, equations, explanation,
  Advanced context), **📝 Exam practice**: the old page's 3 questions (extension,
  stress, definition of E) with numbers from the current settings and a "Show mark
  scheme" toggle, and "How the model works (and what it leaves out)".

| Material | E (GPa) | Yield (MPa) | UTS (MPa) | Fracture strain |
|---|---|---|---|---|
| Steel | 200 | 250 | 400 | 25% |
| Copper | 120 | 70 | 220 | 40% |
| Aluminium (alloy) | 70 | 270 | 310 | 12% |
| Rubber | 0.01 | — | 16 | 500% |
| Bone | 17 | 100 | 130 | 2% |
| Glass | 70 | — | 33 | 0.047% (= UTS/E) |

## Presets

Steel: Hooke's law · Copper beyond yield · Permanent stretch (load copper to 180 N
then unload) · Pull steel to breaking · Glass: brittle · Rubber band (J-curve) ·
Thick steel bar (5 mm²) · Bone · Aluminium alloy.

## The model

Same curve shapes as the old page: ductile materials are linear (σ = Eε) to the
yield point, a parabola up to the UTS (halfway between the yield and fracture
strains), then necking down to 5% of the UTS at the fracture strain. Glass is linear
to fracture; rubber is a J-curve σ ∝ ε + ε³/3 + ε⁵/5. Hanging a load controls the
force, so the wire breaks as soon as the stress reaches the UTS. Unloading after
plastic strain follows a line of gradient E (permanent set). Engineering stress
(original area) throughout. Left out: true stress, temperature, creep and strain
rate, work hardening beyond the old maximum on reloading, the wire's own weight.

## Batch run

**📊 Batch run** runs model experiments with no drawing. Repeat mode gives a
histogram with mean, SD, standard error and the theory value; Sweep steps any one
setting from the batch settings table (below) and plots mean ±
1 SD with the theory line. Results download as CSV. Every one-click experiment sets
all of its own inputs, so it gives the same result in any order.
Searle's-method runs add random reading errors (extension scale and micrometer);
breaking-strength runs give each wire a random strength from a Weibull distribution
(wide for glass, narrow for metals).

**Batch settings table.** The batch panel lists every starting setting the chosen outcome uses (material; wire length, area, force, number of load steps, largest load (fraction of the elastic limit), extension reading error and micrometer error). Tick one setting to vary it and give from / to / step (+ adds the step, × multiplies by it; up to 60 steps, previewed as you type); every other setting stays at the value shown, and a run uses exactly what the table shows. Unticking goes back to Repeat. One-click experiments fill the whole table in, and **↺ Use my left-panel settings** copies the left panel into it.

| Question | Result (test run) |
|---|---|
| Measure E for steel (200 runs, 2 m, 0.2 mm², 8 loads) | mean 200.4 GPa, SD 4.4 GPa (theory 200), 1.3 standard errors |
| Why use a long, thin wire? (L₀ 0.25–3 m, 40 runs each) | SD falls from 13 GPa at 0.25 m to 1.1 GPa at 3 m; means 200.1–201.7 |
| Is extension proportional to force? (copper, 10–210 N, log–log) | on Hooke's line within 0.5% up to 65 N; 8.9 mm instead of 0.69 mm at 82 N; 149 mm at 210 N |
| Thicker wire, less stretch? (steel, 40 N, 0.2–5 mm²) | log–log gradient −1.002 (theory −1) |
| Why is glass so unpredictable? (200 fibres) | mean breaking force 32.2 N, SD 6.4 N (theory 33 N, SD 6.4 N) |
| Breaking force against area (steel) | gradient 398 N per mm² (UTS 400 MPa); about 6% scatter |
