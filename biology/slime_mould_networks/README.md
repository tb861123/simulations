# Slime Mould Networks

A single, self-contained HTML file about *Physarum polycephalum*, the slime
mould that designs efficient networks without a brain. It needs no install and
no internet: **open `slime-mould-networks.html` in Chrome or Edge**. The main
view runs on the graphics card (WebGL); if WebGL is switched off the page says
so, and the Batch run still works.

Built with the kit from `tools/kit/src/slime_mould_networks.js` by
`node build.js` (run inside `tools/kit/`). Do not edit
`slime-mould-networks.html` by hand. It is an "explore" simulation: no
Standard / Advanced switch and no Revise tab.

## What you see

Tens of thousands of agents (bits of the mould) each sense the chemical trail
ahead, turn towards the strongest, move and deposit more trail (Jones 2010).
The trail spreads and fades. Food (oat flakes) adds trail and a faint smell;
agents that go too long without reaching food die, so the mould spreads over
the dish as a mesh and then shrinks back into glowing tubes that join the food.

- **Maps:** the towns around Tokyo (Tokyo Bay and Sagami Bay as sea, after
  Tero et al. 2010), the cities of England and Wales, three oats (a Steiner
  junction), four oats, a ring, scattered oats and an empty
  dish (free patterns).
- **Mouse:** add, drag and remove food; paint walls; erase.
- **Controls:** sensor angle and distance, turn angle, deposit, trail decay,
  trail blur, wobble, food strength and smell, life without food, number of
  agents, start everywhere or from the food, "Grow again", three colour maps,
  the minimum spanning tree overlay, place names, a screenshot button.
- **Readouts:** network length (tubes thinned to lines), the minimum spanning
  tree, their ratio, the share of food pairs joined, and route length ÷
  straight line.

## Investigate

Rediscover Tokyo's railways · Where do three roads meet? · Cut a vein ·
Sensor angle: tangles or highways? · Starve it or feed it · No food at all · England's motorways?

## Batch run

The same model on the main processor in a dish a third of the size (320 × 180
cells, sensor distance ÷ 3), 1200 steps a run.

| Experiment | Result when tested |
|---|---|
| Sensor angle and joining up | pairs of food joined: 47% at 10°, 80% at 22.5°, 89% at 45°, 40% at 67.5°, 9% at 90° |
| How long a network? | network ÷ spanning tree: 0.66 at life 0.5 (food cut off), 1.6 at life 1, 5.0 at life 2 |
| How direct are the routes? | route ÷ straight line 1.1–1.2 at every setting |
| Trail decay | network ÷ spanning tree about 1.6–1.7 for decay up to 0.1, about 1.2–1.3 at 0.2–0.3 |
| Tokyo, again and again | 1.27 × the spanning tree (SD 0.05, 20 runs) |

`worksheets.html` has the full test-run numbers.

## The model

Jones's agent model with crowding (one agent per cell), a food smell (sum of
exp(−distance ÷ reach)) and shrinkage (death after a set time away from food).
On the graphics card agents move at the same moment, so crowding is softened
and agents live 1.5 times as long, with a trickle of regrowth from the food.
Town positions are approximate. The full list of assumptions is in the page's
"The model" tab.
