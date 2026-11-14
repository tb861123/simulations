# The simulation kit

A small shared toolkit behind the ★ enhanced simulations (page frame, sliders,
charts, Investigate cards, Batch run window). So that every simulation stays a
single self-contained HTML file, the kit is copied into each page by a build
step:

```
kit.css      shared styles
kit.js       shared toolkit (K.app, K.slider, K.chart, batch run…)
src/*.js     one script per simulation: the science lives here
build.js     writes <subject>/<folder>/<name>.html from the three parts
```

To change a simulation, edit its file in `src/` (or the kit), then run from
inside this folder:

```
node build.js
```

Do not edit the built `.html` files by hand: the next build overwrites them.
To add a simulation, write `src/<name>.js`, add a line to the `SIMS` table in
`build.js`, and list its folder in `ENHANCED` in the front page `index.html`.

Built with the kit: waves, dynamic_equilibrium, natural_selection,
nerve_impulse, earthquake_buildings, forest_fire, three_body_chaos,
central_limit_theorem, supply_demand, luck_and_skill, quantum_wave_lab,
special_relativity, wind_tunnel, gravitational_lensing, lightning,
chladni_plates, murmuration, gas_in_a_box, collision_theory,
galaxy_collisions, epidemics, fields_orbits.
