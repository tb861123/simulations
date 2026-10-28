# Radioactive Decay and Decay Chains

A single, self-contained HTML file for WJEC Eduqas A level Physics, Component 3,
Topic 6 (Nuclear decay), with the decay-chain extension that links to Topic 7.
No install and no internet are needed: **open `radioactive-decay.html` in Chrome or Edge**.

It replaces two old WJEC Streamlit pages, *Nuclear Decay*
(`physics_sims/pages/04_Nuclear_Decay.py`) and *Radioactive Decay Chains*
(`physics_sims/pages/10_Radioactive_Decay_Chains.py`). Tabs at the top of the
centre view switch between them. Every control, graph, explanation and exam
question from both pages is kept.

## Decay and half-life tab

- Up to 10 000 nuclei decay at random, one by one. Each flashes when it decays and
  emits radiation. Some of it flies to the **Geiger–Müller tube**, which counts it
  (counts, count rate over the last 10 s, optional click sound). You can click any
  nucleus to make it decay now.
- Controls: N₀ (100–10 000), decay probability per 1 s step p (0.05–0.50),
  run length (10–200 s), random seed and 🎲 New seed, detector efficiency ε,
  background radiation on/off and B (1–50 counts/s), sound.
- Graphs: **N against t** (bars at each second, theory N₀e^(−λt), T½ marker) and
  **Activity and counts** (true decays per second, measured counts, A₀e^(−λt), background).
  Advanced adds **ln N against t** with a regression line, its gradient, R² and a
  check against −λ; the ln(A) panel showing the background flattening the slope;
  and **50 runs** (single run against the mean ± 1σ of 50 runs).
- Right panel: readings (simulated and theoretical T½, λ, activity, counts,
  background), the dice analogy and memoryless cards, a chart of 20 individual
  nuclear lifetimes. Advanced: **real-world isotopes** (C-14, I-131, Ra-226, Sr-90,
  Tc-99m with half-lives, λ in s⁻¹ and yr⁻¹, uses and a 5-half-life curve) and the
  **carbon dating calculator** (fraction left → age, era, ln(N/N₀) graph).

## Decay chains tab

- Chains: U-238 → Th-234 → Pb-206 (short or long time scale), Th-232 → Ra-228 →
  Pb-208 (short or long), Rn-222 → Po-218 → Pb-214 → Bi-214 → Pb-210,
  Mo-99 → Tc-99m → Tc-99 (hospital generator, milked every 24 h or with 💧 Milk now),
  a transient-equilibrium chain (10 d → 1 d → stable) and a no-equilibrium chain
  (1 d → 10 d → stable). Advanced adds a **custom chain builder** (2–4 nuclides,
  names, half-lives and units, stable end product, time range).
- Centre: **one nucleus** changing (protons and neutrons drawn, α, β⁻ or γ emitted,
  clickable timeline of the chain) beside **a random sample of atoms** coloured by
  nuclide (Low/Medium/High/Ultra: 500–10 000 atoms).
- Graphs: stacked N (total always N₀), lines, log N; Advanced adds the
  activity A = λN, the equilibrium-daughter line N_P λ_P/λ_D and the daughter peak.
- Right panel: chain schematic with α/β⁻/stable badges, the radon card, the Tc-99m
  card, equilibrium tiles (λ_P/λ_D, N_D/N_P, agreement, A_D/A_P) and the
  **time to safe level** calculator.

## Presets

Decay: Dice model · Small sample: noisy · Large sample: smooth · Short half-life ·
Geiger counter · Background swamps a weak source.
Chains: U-238 secular equilibrium · U-238 over billions of years · Radon in homes ·
Hospital Tc-99m generator · Transient equilibrium · No equilibrium.

## The model

Each nucleus gets a random lifetime from an exponential distribution with
λ = −ln(1 − p), so in every 1 s step it decays with probability exactly p (the dice
model). N = N₀e^(−λt), T½ = ln2/λ, A = λN. The Geiger tube detects each decay with
probability ε and adds Poisson background counts at rate B. Chains use the exact
Bateman solution; the stable end product is found by conservation. The animated
sample of atoms is a separate random simulation. Simplifications (short-lived steps
collapsed, Po-214 skipped, milking removes all technetium, no dead time, no
branching decays) are listed in the page's "How the model works" section.

## Batch run

**📊 Batch run** runs the model many times with no drawing. Repeat gives a
histogram with mean, SD, standard error and theory; Sweep varies one setting and
plots mean ± 1 SD against theory. Results download as CSV. The batch settings table
lists every setting the chosen outcome uses: tick one to vary it (from / to /
+ or × step). One-click experiments fill in the whole table:

| Experiment | Shows |
|---|---|
| Does N follow N₀e^(−λt)? | Sweep t = 0–40 s: means sit on the curve, binomial scatter |
| Do small samples scatter more? | Sweep N₀ = 50–10 000: log–log gradient −0.49 (theory −0.5) |
| Is the half-life the same every time? | 500 samples: mean 6.57 s, SD 0.29 s (theory 6.58 s, 0.30 s) |
| Are Geiger counts random (Poisson)? | 500 counts: mean 14.96, SD 3.93 (theory 14.96, 3.87) |
| Why subtract the background count? | Fitted T½ rises from 6.6 s to 13.7 s as B goes 0 → 40 /s |
| Secular equilibrium: is A_D = A_P? | Ratio 1.008 ± 0.005 (Bateman 1.001) |
| Transient equilibrium: how does the daughter grow? | Daughter count follows the Bateman curve, peak near 3.7 days |

## Exam practice

Nuclear decay (3 questions, numbers from the current N₀ and p) and decay chains
(3 questions), each with marks, hints and a "Show mark scheme" toggle.
