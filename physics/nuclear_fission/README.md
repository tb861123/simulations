# Nuclear Fission and Chain Reactions

A single, self-contained HTML file. No install and no internet are needed:
**open `nuclear-fission.html` in Chrome or Edge**.

## Levels

- **Standard (iGCSE):** Pearson Edexcel International GCSE Physics (4PH1)
  7(c) Fission and fusion: slow neutron absorbed by U-235, two radioactive
  daughter nuclei, 2–3 neutrons and energy; the chain reaction; moderator and
  control rods; balanced nuclear equations.
- **Advanced (A level):** WJEC Eduqas nuclear energy (the old page's
  Component 3, Topic 6): E = mc², mass defect, binding energy per nucleon,
  energy from fission. k and critical mass are tagged "Beyond the spec".

The level switch has a hint naming the spec, and a key-ideas box tags each
idea. **Exam practice:** Standard has seven iGCSE questions (what happens in
fission, the chain reaction, completing the nuclear equation, control rods and
moderator, the chain from the on-screen k, advantages and disadvantages,
fission against fusion); Advanced has the old page's three plus energy from
binding energies per nucleon, the binding-energy curve, and energy from 1 kg of
fuel. Three presets were added (rods out, rods in, k = 0.9): 12 in all.

It replaces the old WJEC Streamlit page *Nuclear Fission*
(`physics_sims/pages/23_Nuclear_Fission.py`) and keeps all of its controls,
graphs, notes and exam questions. Fusion has its own simulation: the page links to
`../nuclear_fusion/nuclear-fusion.html`.

## What you see

A slice through a sphere of U-235 or Pu-239. Neutrons fly random distances; each
one either escapes through the surface, is absorbed by a control rod, or splits a
nucleus (flash, Ba and Kr fragments flying apart) releasing 2 or 3 new neutrons.
The chain dies out, holds steady or runs away depending on k. The animation is
slowed down about 100 million times.

## Controls

- **Level:** Standard (iGCSE) or Advanced (A level).
- **Fuel:** U-235 or Pu-239.
- **How k is set:** *Choose k* (0.5–2.0, as on the old page; the sphere size that
  gives it is worked out) or *From the fuel mass* (1–160 kg sphere).
- **Initial neutrons** (1–5), **control rods** on/off with the fraction absorbed (0–60%).
- **Advanced:** generations in the table (3–10).
- **Picture detail** Low/Medium/High/Ultra (150–1200 nuclei and neutrons in flight).
- Play/Pause, Reset, speed ½×–4×.

## Graphs and readouts

- **Neutrons per generation** (this chain against N₀k^g; Advanced adds the
  k = 0.8, 1.0, 1.2, 1.5 curves), **k against mass** (U-235 and Pu-239, critical
  masses marked) and the **binding energy per nucleon** curve (SEMF, Fe-56 peak,
  U-235/Pu-239, Ba-141, Kr-92, energy-released arrow).
- Tiles: Δm, energy per fission in MeV and J, k, fuel mass and size, escape chance,
  critical mass, ν. Status: subcritical / critical / supercritical.
- The reaction ²³⁵U + n → ¹⁴¹Ba + ⁹²Kr + 3n with its mass table (Δm = 0.186033 u,
  E = 173.3 MeV). Advanced: the neutron generations table and the energy from 1 kg
  (in J, MWh, tonnes of coal and kilotonnes of TNT).

## Presets

Critical: a reactor · Subcritical · Supercritical · Bomb-like · Too small: 10 kg U-235 ·
Critical mass of U-235 · Plutonium: 10 kg · Control rods hold k at 1 ·
Pull the control rods out · Rods pushed in: shut down · Only just subcritical ·
Where does the energy come from?

## The model

k = ν(1 − P_escape)(1 − r), with ν = 2.43 (U-235) or 2.88 (Pu-239) and r the fraction
absorbed by the rods. P_escape is the first-flight escape probability for a neutron
born at a random point in a sphere of radius R:
P = 3/(8a³)[2a² − 1 + (1 + 2a)e^(−2a)], a = R/ℓ. The mean free path ℓ is tuned so
that k = 1 at the measured bare-sphere critical masses (52 kg and 10 kg). Left out:
scattering, moderators, capture without fission, U-238, reflectors, delayed
neutrons, heating and fuel burn-up (listed in the page).

## Batch run

The batch settings table lists every setting the chosen outcome uses; tick one to
vary it. One-click experiments:

| Experiment | Result |
|---|---|
| What is the critical mass of U-235? | k crosses 1 at about 52 kg (k = 0.99 at 48.5 kg, 1.09 at 76 kg) |
| Does plutonium need less? | k crosses 1 at about 10 kg |
| Do control rods work? | k falls linearly from 1.10 (r = 0) to 0.44 (r = 0.6), matching theory |
| How long is a chain when k < 1? | Mean fissions follow (k/ν)/(1 − k): 3.0 at k = 0.9 (theory 3.7, very skewed) |
| Will one neutron start a runaway? | Runaway fraction follows 1 − extinction probability (0.51 vs 0.49 at k = 1.5) |
| How much energy does one fission release? | SEMF mean 162 MeV, SD 5 MeV, against 173.3 MeV for Ba-141 + Kr-92 |

## Exam practice

The old page's 3 questions (MeV to joules, neutrons after 4 generations, why a
weapon needs more mass), with numbers from the current settings.
