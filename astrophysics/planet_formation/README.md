# Planet Formation

A single, self-contained HTML file that grows a planetary system from a disc
of rocky and icy embryos over 100 million years. It needs no install and no
internet: **open `planet-formation.html` in Chrome or Edge**.

★ Enhanced: built from `tools/kit/src/planet_formation.js` by `node build.js`
(run inside `tools/kit/`). Do not edit `planet-formation.html` by hand. The
earlier version (a full N-body model with a cloud-collapse prologue and an
inspector) and its worksheets are kept in [`original/`](original/).

- **Standard (GCSE):** the Solar System formed from a cloud of dust and gas
  pulled together by gravity; rocky inner planets, gas giants further out.
- **Advanced (A level):** orbits, Kepler's third law, escape and orbital
  speeds, the Hill radius; exoplanet systems.

## What it shows

- A top view of the disc (inner, whole or log-distance view): embryos on
  their orbits, collisions (flashes), giant impacts, bodies thrown out, the
  fading gas disc, the frost line and the habitable zone. Click a body to
  follow it (mass, orbit, year, T²/a³, collisions).
- Starting points: Solar-System-like, no gas, gas clears fast, red dwarf,
  massive disc, bright F star.
- Settings: star mass (frost line 2.7√L AU, L = M⁴), solids in the disc,
  number of embryos, outer edge, extra solids beyond the frost line, gas mass,
  gas lifetime, critical core mass.
- Charts: mass against distance (log–log) with the Solar System's planets,
  and bodies left and gas left over time.

## Investigate

Build a solar system · The frost line · No gas, no giants · A race against
time · A red dwarf · A massive disc · (A level) Kepler's third law ·
Throwing or catching?

## Batch run

Each disc runs to 100 Myr in about a tenth of a second.

| Experiment | Result when tested |
|---|---|
| How many planets form? (60 discs) | 4–9 planets, mean 5.5 (Solar System 8) |
| Bigger disc, bigger planets? | largest 5, 23, 280, 670, 980 M⊕ for 30–200 M⊕ of solids: a jump |
| How much gas makes a gas giant? | 0 giants with no gas, 0.8 with 2 Jupiter masses, 1 with more |
| Does the frost line matter? | rocky planets 2.0, 2.4, 3.4, 4.8, 6.4 for 0.6–1.4 M☉ stars |
| The critical core mass | 1 giant at 5–10 M⊕, 0.6 at 15, none at 20 or more |

## The model

Like the planet-population models used in research, bodies follow fixed
Kepler orbits and each pair whose orbits come close has a chance of colliding
in each time step, from the particle-in-a-box rate with gravitational
focusing. Eccentricities are stirred by neighbours and damped by gas; packed
orbits go unstable after the gas has gone (after Chambers et al. 1996). Cores
above the critical mass take gas in a runaway until they have the gas within
reach; giants can throw small bodies out (Safronov number). Leaves out real
N-body orbits and resonances, migration, pebble accretion, fragmentation and
inclinations.
