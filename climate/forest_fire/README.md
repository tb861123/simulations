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

The map is a grid of 10 m cells (2.4 km × 1.6 km). Each burning cell can
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
drawing. It uses the map on screen, including anything you have drawn, and
the weather in the left panel. The interactive fire is saved first and put
back afterwards.

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
