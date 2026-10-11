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

## Layout

Drag the bars beside the map to resize the side panels, or use their ‹ ›
buttons to hide them. Double-click a bar to reset.
