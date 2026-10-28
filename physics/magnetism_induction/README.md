# Magnetism and Induction

A teaching simulation of magnetic forces and electromagnetic induction for
WJEC Eduqas A level Physics (Component 2, Topic 7, Magnetic fields, sections
(a)–(n)). It replaces page 12 (Magnetic Fields & Induction) of the old WJEC
Streamlit app.

## How to run

Open `magnetism-induction.html` in Chrome or Edge. There is nothing to install
and no internet is needed.

## What it shows

Four tabs at the top of the main view:

| Tab | What you see |
|---|---|
| ⚡ Magnetic force | A wire at angle θ to a field B with charges moving along it and the force F = BIL sin θ shown into the screen (⊗), plus F against θ. Advanced: an electron or proton circling in a field (r = mv/qB, period independent of speed) and its orbit plot. |
| 🔄 Induction | A bar magnet passes through a coil connected to a galvanometer; drag the magnet to push it yourself. Graphs of flux Φ and EMF against time; Advanced adds coil resistance, induced current and the energy dissipated. |
| 🔌 Transformer | An iron core with primary and secondary coils, alternating flux in the core and charges sloshing in both circuits; primary and secondary voltage graphs. Advanced adds efficiency and losses. |
| ⚙️ DC motor | An end view of a coil between N and S poles: current into/out of the screen, forces on each side, a split-ring commutator. The coil really spins (or, without the commutator, rocks and settles). Torque against angle; Advanced adds back-EMF and mechanical power. |

## Controls

Presets for each tab (the old page's MRI, cyclotron and Earth's field;
step-up, step-down, isolation and phone-charger transformers; toy, car starter,
e-bike and servo motors; plus extra teaching presets), all the old sliders,
Play/Pause, Reset, speed, Batch run. The right panel has readings, graphs,
physics notes, exam practice (3 questions, live answers) and "How the model
works".

## The model

F = BIL sin θ; F = Bqv, r = mv/(qB), T = 2πm/(qB); Φ = BA, ε = −N dΦ/dt with
B in the coil = B_max e^(−(x/1 m)²) and x = v(t − 2 s); ideal transformer
V_s/V_p = N_s/N_p, I_p/I_s = N_s/N_p, η = P_out/P_in; motor τ = BINA cos θ
(θ = angle between the coil plane and B), average (2/π)BINA, back-EMF
ε = BNAω cos θ, P = τω.

The old motor page mixed up its angle (it said 0° gives maximum torque but
calculated |sin θ|) and its back-EMF formula included the current. Both are
corrected here.

Assumptions (also listed in the page): uniform fields with sharp edges, no
relativity, no magnetic braking of the magnet, ideal transformer unless an
efficiency is set, a simple friction model for the spinning motor.

## Batch run

Every setting a run uses is in the batch settings table; tick one row to sweep it.

| Experiment | What it shows |
|---|---|
| Force on a wire against current | top-pan balance: F ∝ I, gradient BL |
| How does the force depend on the angle? | F = BIL sin θ |
| Is the force ∝ length? | gradient BI |
| Orbit radius: is r = mv/qB? | log–log gradient 1 |
| Faraday: is ε = N dΦ/dt? | straight line, gradient N |
| Faster magnet, bigger EMF? | peak EMF ∝ v (hand speed varies 10%) |
| Does the area under the ε–t graph change with speed? | ∫ε dt = NΔΦ, the same at every speed |
| More turns, bigger EMF? | peak EMF ∝ N |
| Is V_s/V_p = N_s/N_p? | gradient V_p/N_p |
| Does the load set the primary current? | I_p ∝ 1/R_L |
| Is the average torque (2/π)BINA? | torque sampled at random angles |
