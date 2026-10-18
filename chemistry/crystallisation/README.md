# Crystallisation

A grid simulation of crystals forming in a cooling melt or solution, for GCSE / iGCSE
chemistry and geology. It shows why slowly cooled granite has big crystals, a lava flow
(basalt) has small ones and obsidian is glass. It also shows how copper sulfate, salt and
alum crystallise from solution. The batch runs compare crystal size and number with the
JMAK (Avrami) theory of nucleation and growth.

## How to run

Open `crystallisation.html` in Chrome or Edge. There is nothing to install and it works
offline.

## Controls

- **Presets** (11): Granite, Basalt, Obsidian, Porphyry (slow then erupts), Impure magma,
  Supercooling (pure melt, then sudden crystals and the temperature jumps back up),
  Copper sulfate, Seeded copper sulfate, Salt by evaporation, Salt by cooling? (hardly any
  crystals: salt's solubility barely changes with temperature), Snowflake dendrites.
- **What is crystallising** (restarts): molten rock, or a solution of copper(II) sulfate,
  sodium chloride or potash alum.
- **Conditions** (change at once): cooling rate (log scale: from about 1 °C per million
  years to 170 °C per minute for magma; 0.01–10 °C per minute for solutions), "keep at the
  starting temperature", evaporation, how readily particles stick (1 = dendrites).
- **Starting conditions** (restart): starting temperature, concentration (shows the
  temperature at which it is saturated), impurities (dust specks per mm²), random seed, picture detail.
- **Click the picture** to drop in a seed crystal.
- **Centre:** time (in s, min, hours, days or years), temperature and status (molten,
  supercooled, crystallising, solid rock, glass, saturated, supersaturated), crystal count
  and mean size. Play/Pause, Reset, speed (1× = magma cools 15 °C per second, or a solution
  runs 2 minutes per second), **Batch run**.
- **Right panel:** commentary; readings (temperature, cooling rate, crystals per cm², mean
  and largest crystal size, % crystallised, growth speed, JMAK theory, concentration against
  solubility); the cooling curve with the freezing-point plateau; crystallised fraction and
  crystal count (or concentration and solubility) against time; and a histogram of crystal
  sizes.

## The model

- **Grid:** a 20 mm × 13 mm slice. Each crystal has its own colour, like a thin section
  under a polarising microscope.
- **Picture detail** (restarts): Low 0.1 mm cells (200 × 130), Medium 0.067 mm (300 × 195),
  High 0.05 mm (400 × 260, the default) or Ultra 0.033 mm (600 × 390). Every rate is per mm²
  and per second, so the physics does not change with the cell size:
  - nucleation per cell uses the cell's area;
  - growth is a distance in mm;
  - impurities are a number of specks per mm²;
  - seed crystals are 0.3 mm across;
  - in solutions, the step time ∝ cell² (diffusion) and the sticking chance ∝ cell size.
  Tested at all four settings (two seeds each): basalt 1,140–1,210 crystals/cm², mean
  0.33 mm; granite 4–6 crystals/cm², about 5 mm; copper sulfate 12–14 crystals/cm², about
  0.75 mm. Model times are the same at every setting.
  Magma runs at full speed at every setting. Solutions are heavy: High runs at about 40% of
  the set speed and Ultra at about 7% on a laptop. When the cells cover several screen
  pixels the picture is smoothed rather than drawn as blocks.
- **Magma:** freezing point Tm = 1100 °C, glass temperature Tg = 650 °C.
  - Mobility M(T) = exp(−A/(T − T₀)) (Vogel–Fulcher), normalised to 1 at Tm; about 10⁻⁶ at Tg.
  - Growth: G = 2×10⁻⁵ mm/s × M × ΔT/100, where ΔT = Tm − T. Each crystal grows outwards as
    a circle from where it started, until it meets other crystals.
  - Nucleation: I = 0.01 per mm² per s × M × (ΔT/100)^2.5. Impurity specks each start a
    crystal at 0.003 per s × M × ΔT/100.
  - Latent heat: freezing everything gives out enough heat for 350 °C of warming. This gives
    the plateau, and the jump back up (recalescence) after supercooling. Above Tm, crystal
    edges melt again.
  - Heat is lost at a steady rate (the cooling rate).
- **Theory (JMAK):** X_ext = Σ π r², X = 1 − e^(−X_ext), dN = I(1 − X)dt, stepped forward
  with the same rates and latent heat. For slow cooling, size ∝ (cooling rate)^((1−n)/(n+5))
  = (cooling rate)^−0.2 with n = 2.5.
- **Solutions:** dissolved particles take a random step every 2.5 s (diffusion over 0.1 mm).
  They stick to a crystal they touch with the chance you set. Surface particles break off
  with a chance tuned so the solution settles at the real solubility (within about 15%).
  Particles held by more neighbours break off less often. New crystals start at a rate that
  rises steeply with supersaturation. Evaporation lowers the water level and pushes the
  dissolved particles into the remaining water. Solubility tables: copper(II) sulfate,
  sodium chloride, potash alum (g per 100 g water, 0–100 °C).
- **Not modelled:** different minerals and freezing ranges in real magmas, crystal faces,
  convection, temperature differences across the slice, water of crystallisation, and the
  heat given out by crystallising salts.

## Batch experiments (magma)

Each run uses the standard 0.1 mm cells (200 × 130, whatever the picture detail is set to) with no drawing, so results can be repeated exactly. Results from testing (seed 1):

| Experiment | Result | JMAK theory |
|---|---|---|
| Cooling rate 0.001 → 30 °C/h → mean size (log–log) | gradient −0.296 ± 0.003; 4.9 mm → 0.23 mm | gradient −0.31; 5.3 → 0.21 mm (each point within 2–9%) |
| Same sweep → crystals per cm² | gradient 0.59 ± 0.01; 5.4 → 2400 per cm² | gradient 0.63; 4.5 → 2860 |
| 20 rocks at 1 °C/h, every crystal | 14,953 crystals, mean diameter 0.64 mm, SD 0.20 | 0.63 mm (size of the average-area crystal) |
| Held 1 day at 5–440 °C below Tm → glass? | glass at 5 °C and at 382 °C or more; crystalline in between | same; theory also says glass at 353 °C (grid crystallises there) |
| Impurities 0 → 5% at 1 °C/h → crystals per cm² | 278 → 575 | 318 → 555 |

**Known limitations.** The grid cannot show crystals smaller than about 2 cells (0.2 mm), so
at fast cooling it counts up to 16% fewer crystals than theory. It also cannot show crystals
bigger than the 20 mm slice, so sweeps stop at 0.001 °C/h. Granite at that rate has about
5 mm crystals; real granites cool even more slowly and have several minerals.
