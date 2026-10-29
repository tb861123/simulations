# Forest Fire Spread

A single, self-contained HTML file (`forest-fire.html`) that shows how a
woodland fire spreads, for GCSE-level teaching. No installation and no
internet are needed: open the file in Chrome or Edge, pick a preset and press
**Start** (or choose **🔥 Start fire** and click anywhere on the map).

## What you can change

**Weather** (takes effect at once, so you can make the wind change mid-fire):
- Wind speed (0–90 km/h) and direction
- Fuel moisture, i.e. how dry the dead leaves, twigs and grass are (3–35%)

**The woodland** (builds a new map):
- Tree type: pine, oak and beech, birch, eucalyptus or mixed
- Tree density
- Undergrowth type (grass, heather and gorse, bracken, leaf litter) and amount
- Landscape: flat, a hill, a valley or rolling ridges
- Fire tracks (firebreaks): spacing and width
- A river through the wood
- Random seed (the same seed gives exactly the same fire)

**Tools on the map:** start a fire; draw firebreaks, rivers and lakes, or plant
trees, either **freehand** (drag to paint, with a small, medium or large
brush) or as an **area** (click and drag a rectangle); or drop water from a
helicopter. Things you draw stay when you press *Reset fire*; a new map clears
them.

**When the fire goes out** a banner says so. It gives how long the fire burned
and how much it destroyed, and explains *why* it stopped by looking along the
edge of the burnt area: firebreaks or water, bare gaps, fuel too damp or
sparse, or running off the edge of the map. A status label above the map
always shows *Burning*, *Smouldering — could rekindle* or *Fire out*.

The simulation runs at 1× by default (one minute of fire every second).

## Presets

Damp broadleaf wood, heathland fire (like Saddleworth Moor 2018), pine
plantation crown fire, firebreaks that hold, firebreaks that fail (embers
jump them), eucalyptus bushfire, grass fire in strong wind, fire running
uphill, sparse vs dense trees (the tipping point for spread), river barrier,
and after the rain.

## How the spread is calculated

The map is 2.4 km × 1.6 km, a grid of 10 m cells at the default Medium detail. Each burning cell can
ignite its 8 neighbours. For each neighbour the model works out a rate of
spread R in metres per minute, then the chance of ignition in a short time
step Δt is 1 − e^(−RΔt/d), where d is the distance between the cells.

    R = base rate (fuel type and amount)
        × dryness factor   (Rothermel's moisture damping)
        × wind factor      (1 + 0.6·V^1.5 at the head, less on the flanks, slowed at the back)
        × slope factor     (e^(3.9·tan slope): about ×2 for 10° uphill)
        × crown-fire factor (×3.3 when the fire is in the treetops)

- **Intensity** uses Byram's formula, I = 300 × fuel load × R (kW/m).
- **Crown fires** start when the intensity passes Van Wagner's threshold.
  Undergrowth acts as ladder fuel, making this easier.
- **Embers** from crown fires fly downwind and start spot fires. This is how
  fires jump tracks and rivers.
- **Smouldering:** cells smoulder after their flames die. Smouldering logs can
  still slowly ignite fuel next to them.

The fire report shows the area burnt, the head-of-fire speed, intensity (and
whether firefighters could attack it), crown fire, spot fires, and how many
trees were killed or survived. Every simplification is listed inside the app
under **"How the model works"**.

## Batch run (many fires, compared with theory)

Press **📊 Batch run** (below the map) to run the model many times with no
drawing. Opening it fills the batch settings table (below) from the map on
screen, including anything you have drawn, and the weather in the left panel. The interactive fire is saved first and put
back afterwards. Batch runs always use the Medium detail (10 m cells,
240 × 160) whatever the map detail on screen, so their results are the same
as before the detail setting was added (see *Map detail* below).

- **Repeat:** the same map and weather 10–200 times; only the fire's random
  numbers change (tick *New random map for every repeat* to vary the woodland
  too). Shows a histogram, or a bar chart for yes/no outcomes.
- **Sweep:** step wind speed, fuel moisture, tree density, undergrowth or
  fire-track width, with several runs per step. Shows mean ± 1 SD (or % of
  runs ± 1 standard error), the theory line where there is one, and a fit.
- **Outcomes recorded:** area burnt (ha), head-of-fire speed (m/min), whether
  it crossed a firebreak or water, whether it reached the map edge, trees
  killed (%), time until out, spot fires and actual tree cover.
- Each run stops when the fire is out, at a time limit (1–24 h of fire), or
  optionally when it reaches the map edge. Results download as CSV.

**Batch settings table.** The batch panel lists every starting setting of a
fire: wind speed and direction, fuel moisture, tree density, amount of
undergrowth, fire-track width and the ignition point (as % across and down the
map); the choices of tree type, undergrowth type, landscape, fire tracks,
river and map seed; and the run settings (time limit, new random map for every
repeat, stop at the map edge). Tick one setting to vary it and give from / to /
step (+ adds the step, × multiplies by it; up to 60 steps, previewed as you
type); every other setting stays at the value shown, and a run uses exactly
what the table shows. Unticking goes back to Repeat. If the table's woodland
settings are the ones the map on screen was built with, that map is used
(with anything drawn on it); otherwise the batch builds a new map from the
table and adds your drawing to it. Opening the panel fills the table from the
left panel; one-click experiments load their forest into the left panel and
fill the whole table in, and **↺ Use my left-panel settings** copies the left
panel (and the spot the fire will be lit) into it.

One-click batch experiments (timings from a test machine):

| Experiment | What it shows |
|---|---|
| How often do firebreaks hold? | Sweep wind 3.5–5.5 m/s over 20 m tracks, 6 runs per step on new maps. Crossing jumps from 0% (≤ 3.75 m/s) to 100% (≥ 5 m/s), with the 50% point near 4.4 m/s: tracks stop surface fires but not crown fires, whose embers fly 100 m or more. Track width 10–40 m makes little difference. (~20 s) |
| Percolation: how dense must a forest be to burn through? | Sweep tree density 40–80%, no undergrowth, no wind. Fire reaches the edge in 0% of runs up to 50% density and 100% from 60%, with the 50% point near 54%. The site-percolation thresholds for a random square grid are 40.7% (8 neighbours) and 59.3% (4 neighbours); the model sits above 40.7% because a burning tree has only minutes to light its neighbour, its trees are clumped, and the map is finite. (~6 s) |
| Wind and the speed of spread | Sweep wind 0–10 m/s on open grass. Measured head speed rises from about 7 to 120 m/min; the model's own rate-of-spread formula (averaged over the map's fuel) gives 1.7–29 m/min. The measured head is about 2.7× the formula, because the head follows the fastest of many random paths (first-passage percolation); at 10 m/s embers add more. (~2 s) |
| Dryness: how wet must fuel be to stop a fire? | Sweep fuel moisture 4–28%. Speed falls from about 31 to 9 m/min and is zero from 24%, where the formula is just above zero: each square flames too briefly to light the next. (~2 s) |
| Same forest, different luck | 50 fires by a river with identical settings: area burnt 39–155 ha (mean 75, SD 24), depending on whether an ember jumps the river. (~8 s) |
| Does a river stop it? | 40 fires with a 4 m/s breeze across a 50 m river: about 70% jump it (±7 points). (~8 s) |

## Layout

Drag the bars beside the map to resize the side panels, or use their ‹ ›
buttons to hide them. Double-click a bar to reset.

## Map detail (resolution)

**Map detail** in the left panel sets the cell size: Low 20 m (120 × 80),
Medium 10 m (240 × 160, the default), High 5 m (480 × 320) or Ultra 2.5 m
(960 × 640). The choice is remembered in the browser. The wood stays
2.4 km × 1.6 km and the fire behaves about the same at every setting,
because everything is worked out in metres and minutes:

- the ignition chance 1 − e^(−RΔt/d) uses the real distance d between cells,
  and the time step shrinks with the cell size (never more than half a
  minute per 10 m of cell), so the fire never jumps more than half a cell per
  step;
- the chance that a burning square lights its neighbour before it goes out,
  1 − e^(−R·time/d), is kept the same at every setting. A square's whole
  "spreading life" (its flaming time at the full rate, then its smouldering
  time at 20% of the rate) is squeezed into half the time at High and a
  quarter at Ultra, and stretched to twice as long at Low. The squares still
  flame, glow and throw embers for the real number of minutes. The extra push
  from a crown fire is squeezed the same way. Without this, small squares
  pass the fire on far more reliably than big ones: in testing, a slow fire
  in a dense pine wood took twice as long to spread 400 m at Ultra as at
  Medium;
- ember launches and radiant-heat jumps are per 100 m² of burning fuel, so
  the same number of embers fly per hectare burning, and the heat jump across
  a gap is always about 20 m;
- woods, glades, hills, rivers, fire tracks, brush sizes, the ignition patch
  (30 m across, 40 m at Low), smoke and glow are all sized in metres.

How close the settings are (4 fires each, same seeds, mean time for the head
of the fire to get that far from where it started):

| Preset | Distance | Low | Medium | High | Ultra |
|---|---|---|---|---|---|
| Dense trees (85%), no wind | 400 m | 106 min | 111 min | 119 min | 111 min |
| Fire runs uphill | 400 m | 38 min | 43 min | 43 min | 42 min |
| Heathland fire | 1000 m | 18 min | 17 min | 12 min | 16 min |
| Pine plantation (crown fire) | 1200 m | 4.7 min | 3.9 min | 2.8 min | 2.4 min |
| Grass fire, strong wind | 1200 m | 6.2 min | 5.1 min | 4.1 min | 4.1 min |

Surface fires agree to within about 10% (heathland runs vary a lot from fire
to fire at every setting). Fires driven by embers in strong wind still run
somewhat faster at High and Ultra, because a fire on small squares settles
into its shape sooner after each new spot fire, and every spot fire starts the
next. Use Medium (the setting the batch runs use) for anything you measure.

Finer detail just looks smoother and runs more slowly at high speed. At Low,
a track or river cannot be narrower than one 20 m square. Changing the detail
builds the same map again at the new resolution and keeps what you have drawn.

**Batch runs always use 10 m cells** (240 × 160), whatever the detail on
screen, so batch results are repeatable. If the screen is at another detail,
the same wood is rebuilt at 10 m for the batch and the map on screen is put
back afterwards. All canvases are sized by devicePixelRatio, so lines and text
are sharp on 200% (Surface) screens.
