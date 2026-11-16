# States of Matter and Heating

A single, self-contained HTML file for iGCSE and A level. It needs no install
and no internet: **open `states-of-matter.html` in Chrome or Edge**. Listed
under Physics and Chemistry.

★ Enhanced: built from `tools/kit/src/states_of_matter.js` by `node build.js`
(run inside `tools/kit/`). Do not edit `states-of-matter.html` by hand. The
earlier version and its worksheets are kept in [`original/`](original/).

- **Standard (iGCSE):** Pearson Edexcel International GCSE Physics (4PH1)
  5(c) change of state: particles in the three states, heating and changes of
  state, temperature–time graphs, ΔQ = mcΔT and its practical; also Edexcel
  International GCSE Chemistry (4CH1) Topic 1.
- **Advanced (A level):** WJEC Eduqas thermal physics: internal energy,
  specific latent heat Q = mL, and the method of mixtures.

## Views

- **🔥 Heating and cooling:** about 90 particles in a container, coloured by
  speed. Solid particles vibrate on a lattice (bonds drawn), liquid particles
  touch and slide, gas particles fly and hit the walls (hits per second =
  pressure). Melting starts at the surface; bubbles appear when boiling.
  - Substances: water, ethanol, lead, aluminium, iron.
  - **Heater (energy):** mass, heater power, starting temperature,
    insulation (perfect to very poor, losing k(T − 20 °C)); 🔥 Heat and
    ❄ Cool. Or **Set the temperature** directly.
  - Charts: temperature against time, coloured by stage (or the heating curve
    against energy when setting the temperature); energy for each stage
    (mcΔT for each state, mL for each change).
- **🥤 Method of mixtures:** a hot block (copper, aluminium, iron, lead) dropped
  into water; both temperatures approach the final temperature; energy lost =
  energy gained.

## Investigate

Ice to steam · Why is boiling so long? · Particles in each state · A cooling
curve · Specific heat capacity practical · Poor insulation · Lead heats up fast
· (A level) Specific latent heat · Method of mixtures.

## Batch run

| Experiment | Result when tested |
|---|---|
| Measuring c of water: what do heat losses do? | 4230 with no loss, rising to 6930 J/(kg K) at 2 W/K |
| How precise is one measurement of c? | 200 runs: mean 4200, SD 67 |
| Does doubling the mass double the time to boil? | gradient 168 s/kg (theory 168) |
| Time to boil against heater power | 1300 s at 300 W (theory 1120 with no loss), 114 s at 3 kW (112) |
| Measuring the latent heat of fusion of ice | 334 000 with no gain from the room, falling to 239 000 J/kg at 2 W/K |
| Method of mixtures (copper into water) | mean 26.5 °C against ideal 26.7 °C (the block cools on the way) |

## The model and its simplifications

The energy supplied is tracked; temperature and the fraction melted or boiled
follow from Q = mcΔT for each state and Q = mL for each change. Left out: 3D,
realistic particle numbers and spacing, gas–gas collisions, c changing with
temperature, pressures other than 1 atm, temperature differences inside the
sample, the container's heat capacity. Metals are heated only a little past
their melting points.
