# Nerve Impulses

A single, self-contained HTML file (`nerve-impulse.html`) that shows how an
action potential is made and how it travels along an axon, for GCSE / iGCSE /
WJEC biology. Open `nerve-impulse.html` in Chrome or Edge. Nothing needs to be
installed and no internet is needed.

## What it shows

- **The axon**, coloured by membrane potential (blue at rest, yellow when
  depolarised), with the stimulating electrode and two recording electrodes.
  Unmyelinated axons show the + and − charges on each side of the membrane.
  Myelinated axons show the sheath, the nodes of Ranvier and any damaged
  myelin. Below it is a graph of voltage against distance.
- **A zoomed patch of membrane** at electrode 1. Na⁺ and K⁺ channels open and
  close (the Na⁺ inactivation "ball" plugs the channel), and ions flow
  through them: Na⁺ in, K⁺ out.
- **Membrane potential against time** at both electrodes, labelled:
  resting potential (−70 mV), threshold, depolarisation, peak,
  repolarisation, hyperpolarisation and the refractory period.
- **The Na⁺ and K⁺ currents** at electrode 1.
- **Readouts**: conduction speed (m/s, measured between the electrodes),
  spike amplitude, peak voltage, resting potential, the threshold stimulus
  and the refractory period. The threshold and refractory period are found
  automatically by repeated background runs.

Impulses are far too fast to watch, so the live view runs in slow motion. At
1× an impulse takes about 3–4 s to cross the screen; the panel says how much
slower than real life that is.

## Controls

Axon diameter (0.2 µm to 1 mm), myelinated on/off, gap between nodes
(× fibre diameter), temperature, stimulus strength, pulse length, pattern
(single, two pulses with a chosen gap, or a train of 5 at a chosen
frequency), myelin damage (multiple sclerosis), sodium-channel blocker on one
patch (local anaesthetic, TTX), potassium-channel blocker (TEA), and random
channel noise. Changes restart the run.

## Presets

Squid giant axon, human C fibre (pain, slow), myelinated motor neuron,
multiple sclerosis, below threshold, above threshold (same-size spike), two
pulses too close (refractory), two pulses spaced out, anaesthetic block,
potassium blocker, cold nerve (motor neuron at 20 °C), and a train of
impulses.

## The model

A cable model: the axon is cut into short pieces, each with the
Hodgkin–Huxley equations.

    C dV/dt = −g_Na m³h (V − E_Na) − g_K n⁴ (V − E_K) − g_L (V − E_L)
              + (current from neighbouring pieces) + stimulus
    dx/dt  = α_x(V)(1 − x) − β_x(V) x      for x = m, h, n

- Squid values: g_Na 120, g_K 36, g_L 0.3 mS/cm²; C 1 µF/cm²; axoplasm
  35.4 Ω·cm. HH's voltages are shifted 5 mV so rest is −70 mV.
- Temperature: gate rates Q10 = 3, channel conductances Q10 = 1.5, from HH's
  6.3 °C.
- Myelin: axon 0.7 × fibre diameter; the sheath's capacitance and leak are
  divided by twice the number of membrane wraps. Nodes are 1 µm long with 5×
  the squid Na⁺ channel density. Damaged myelin has up to 41× more
  capacitance and leak.
- Noise: Langevin (Fox) noise on the gates, sized by the number of channels
  in each piece (about 60 Na⁺ and 18 K⁺ per µm²).
- Integration: exponential Euler for the gates, backward (implicit) Euler
  with a tridiagonal solver for the voltages. Time step 1–25 µs.
- Live view: 200 pieces (unmyelinated) or 22 internodes × 6 pieces.
  Batch runs: 100 pieces or 14 internodes × 4 pieces. Speeds agree to
  within about 2% (up to 8% for a cold myelinated fibre).

Results: squid axon at 18.5 °C, 20.5 m/s (Hodgkin and Huxley calculated
18.8 m/s; measured 21.2 m/s). Human C fibre (1 µm, 37 °C) 1.9 m/s.
Motor neuron (10 µm, 37 °C) 57 m/s, about 5.8 m/s per µm (Hursh's rule: about
6). Refractory period about 3.2 ms for squid at 18.5 °C.

### Assumptions and simplifications

Ion concentrations stay fixed (the pumps keep up), the outside of the axon is
a perfect conductor, only HH's two channel types are used (also for human
axons at 37 °C), and there is no branching, synapse or paranode detail. The
model does not show heat block: real squid axons fail above about 30–35 °C,
but this model still conducts at 42 °C. Ions in the drawing are
illustrations, not to scale. The full list is inside the simulation under
"How the model works".

## Batch run

**📊 Batch run** opens a panel over the centre view. Clicking an experiment fills in its set-up; **▶ Run batch** runs it (and runs your own set-up once you change anything). Mode A repeats a set-up
with random channel noise. Mode B sweeps one input (stimulus strength,
diameter, temperature, gap between pulses, Na⁺ block, myelin damage,
internode length or pulse length). Results show as a histogram or a scatter
graph with mean ± 1 SD error bars, with theory overlaid, fits and a CSV
download.

**Batch settings table.** The batch panel lists every starting setting a run
uses: stimulus strength, pulse length, stimulus pattern, gap between two
pulses, train rate and number of pulses, axon diameter, myelin, internode
length, temperature, myelin damage, Na⁺ and K⁺ block, channel noise and its
channel-number divider (1), "quick runs", and the batch axon's resolution that
used to be fixed (100 pieces, or 14 internodes of 4 pieces). Defaults are the
old values, so results are unchanged. Each batch now uses fixed seeds (it used
a random starting seed before), so a batch gives the same result every time.
Tick one setting to vary it and give from / to / step (+ adds the step, ×
multiplies by it; up to 60 steps, previewed as you type); every other setting
stays at the value shown, and a run uses exactly what the table shows.
Unticking goes back to Repeat. One-click experiments fill the whole table in
from fixed default settings, never from the left panel, so they give the same
results in any order; **↺ Use my left-panel settings** copies the left panel
into the table instead.

| Experiment | Theory | Result |
|---|---|---|
| Is the impulse all-or-nothing? | Step at threshold | Nothing below about 27.6 µA/cm²; above it the amplitude is 95.75–95.81 mV every time (within 0.1%) |
| Unmyelinated: does speed ∝ √diameter? | log–log gradient 0.5 | Gradient 0.500, R² = 1.0000 (1 µm: 0.93 m/s, 1 mm: 29.3 m/s at 18.5 °C) |
| Myelinated: does speed ∝ diameter? | log–log gradient 1 | Gradient 0.999 (2 µm: 11.5 m/s, 20 µm: 115 m/s) |
| How does temperature change the speed? | v ∝ √(gate rate), Q10 = 1.73 | Conducts at every step from 0 to 42 °C (9.0 → 46.5 m/s). Fitted Q10 = 1.53: lower, because channel currents speed up less than the gates |
| Do noisy channels make firing a matter of chance? | Sharp step (no noise) at 83.7 µA/cm² | S-curve: 50% firing at about 82–85 µA/cm², SD about 2–5 µA/cm² (it depends on the random seeds; batches now use fixed seeds, so it repeats exactly) |
| How soon can a second impulse follow? | (no simple formula) | No second impulse at gaps of 2.5 ms or less; full-size (96–98 mV) second impulse from 3 ms |
