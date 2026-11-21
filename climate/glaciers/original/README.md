# Glaciers and Glacial Landscapes

A single, self-contained HTML file (`glaciers.html`) for physical geography.
Open `glaciers.html` in Chrome or Edge, with no install and no internet.

**Standard** follows Pearson Edexcel GCSE (9–1) Geography A (1GA0), Component 1
Topic 1C *Glaciated upland landscapes and processes* (one of three options:
students study two of 1A coasts, 1B rivers and 1C glaciated uplands):
freeze–thaw weathering; glacial erosion by plucking and abrasion; landforms of
erosion (corries and tarns, arêtes, pyramidal peaks, U-shaped troughs,
truncated spurs, hanging valleys, ribbon lakes) and deposition (moraines,
drumlins, erratics); how glaciers advance and retreat; UK glaciated uplands
(the Lake District, Snowdonia, the Cairngorms) and glaciers retreating today.
1GA0 Topic 1C covers plucking, abrasion, transport, deposition, freeze–thaw,
mass movement, landforms, human impacts and one UK glaciated upland; glacier
mass balance and ice flow are NOT in it. At Standard they are kept to a gentle
explanation (accumulation, ablation, advance and retreat) and tagged "beyond
GCSE / A level (9GE0 Option 2A)" in the key ideas, the level hint and the
tab tooltips.
**Advanced** follows Pearson Edexcel A level Geography (9GE0) Topic 2:
*Landscape Systems, Processes and Change*, Option 2A: *Glaciated Landscapes
and Change*: glacier mass balance as a system and
glacier budgets (net balance, cumulative balance, accumulation area ratio;
9GE0 2A.4a–c and skill (3) "calculate simple mass balance and equilibrium
line position"), ice movement by internal deformation and basal sliding,
warm- and cold-based glaciers (2A.5a–c, 2A.8c, skill (7)), response times, corrie aspect, the shape of glacial troughs,
fluvioglacial landforms (esker, outwash plain), periglacial processes
(permafrost, active layer, ice wedges, patterned ground, solifluction) and
threats to glaciated landscapes (2A.11c).

## What it shows

Tabs at the top of the centre panel:

- **❄ Mass balance**: a valley glacier in side view (an Alpine glacier today,
  or a Lake District glacier 12 500 years ago) with its accumulation and
  ablation zones, this year's equilibrium line, flow arrows, crevasses at a
  rock step, the snout and meltwater, and terminal and recessional moraines
  left as it retreats. Climates: steady (set temperature and snowfall),
  1850 to 2100 Alpine warming, or warming in three steps. Graphs: mass
  balance against height; length over time; glacier budget (A level: yearly
  net balance and cumulative balance).
- **🧊 Ice flow and corries**: a corrie in side view with rotational flow,
  debris carried round and pressed against the floor, the bergschrund and
  plucking at the back wall; over 100 000 years a rock basin and lip form, and
  a tarn fills it when the ice melts. Warm- or cold-based ice; the direction
  the corrie faces and the wind decide whether a glacier can form at all.
  Graphs: ice speed with depth (deformation and sliding, warm vs cold);
  corrie depth over time; which way corries face (polar graph).
- **⛰ Glaciated valley**: an OS-style map with 50 m contours, hill shading and
  a 1 km grid of a made-up valley in the Lake District, Snowdonia or the
  Cairngorms, through a whole ice age: V-shaped river valley with interlocking
  spurs → ice fills it → U-shaped trough with truncated spurs, hanging valleys
  and waterfalls, corries, arêtes, a pyramidal peak (or a plateau kept by
  cold-based ice), ribbon lake, terminal and recessional moraines, drumlins,
  erratics, an esker and outwash plain (A level), and the Loch Lomond Stadial
  corrie glaciers. Graphs: cross-section of the valley with the pre-glacial V
  and the fitted shape exponent b; the ice age timeline.
- **🌡 Freeze–thaw**: a rock face whose cracks widen and drop blocks onto scree,
  beside the ground in cross-section coloured by temperature, with seasonal
  frost or permafrost, the active layer, ice wedges and patterned ground.
  Graphs: rock surface temperature with freeze–thaw cycles; the "trumpet
  curve" of temperature with depth (A level).

Right panel: what's happening, readings, real-world cards with sources, key
ideas tagged by spec, exam practice (6 GCSE and 6 A level questions with mark
schemes; several use the numbers on screen: rate of retreat, freeze–thaw
cycles, AAR, response time, cumulative balance) and "How the model works (and
what it leaves out)". Links to Ice–Albedo Feedback, Sea Level Rise, The
Greenhouse Effect, The Carbon Cycle, Rivers and Landforms and Coasts.

## Controls

- **Presets** (12): Mass balance and the ELA · A colder climate · Retreat since
  1850 · Ice flow: deformation and sliding · Corries and tarns · Why corries
  face north-east · From V to U · Snowdonia: Cwm Idwal · Deposition: moraines
  and drumlins · Freeze–thaw weathering · A glacier's budget (A level) ·
  Permafrost (A level).
- Mass balance: glacier, climate, temperature change (or extra warming by
  2100), snowfall, warm-based (A level), weather seed.
- Corries: base of the ice, freeze–thaw on the back wall, direction faced,
  wind direction.
- Valley: upland, time through the ice age, cross-section position, labels.
- Freeze–thaw: mean annual temperature, summer–winter swing, day–night
  swing, day-to-day weather, seed.
- **Quality** (Low / Medium / High / Ultra, default Medium, remembered in
  this browser): the map grid and contours of the valley, debris dots in the
  corrie and falling snow. It changes only the picture, never the models or
  the batch runs. At 1920×1080 the valley map takes 15–50 ms to draw, so it is
  redrawn at most every 70 ms while playing (frames stay at 60 fps up to High
  and about 40 fps at Ultra); other views draw in under 1 ms.
- Play / Pause, Reset, speeds (glacier 1× = 5 years per second; corrie
  1000 years per second; valley the whole ice age in 60 seconds; ground 10 days
  per second), hide/show panels, full screen.

## The models

- Mass balance b = 0.007 (z − ELA) m/yr, at most +2; ELA rises 1 ÷ 0.0065 ≈ 154 m
  per °C and falls about 40 m per 10% more snowfall; weather moves each year's
  ELA (SD 40 m).
- Flowline glacier (shallow-ice approximation): flux = Γ H⁵|∇s|² + f_s H³|∇s|²,
  Glen's law n = 3, A = 2.4 × 10⁻²⁴ Pa⁻³ s⁻¹; sliding only when warm-based.
- Steady length: mean surface height = ELA, L = 2(b₀ − ELA + H̄)/s with H̄ ≈ 130 m.
  Response time τ ≈ H ÷ (−b at the snout) (Jóhannesson et al. 1989).
- Corrie: abrasion ∝ sin² across the hollow, plucking and freeze–thaw at the
  foot of the back wall; corrie glacier balance = snow + drift onto lee slopes
  − melt from the midday sun.
- Trough cross-section: Nye's channel-flow model ∇²u = −1, erosion ∝ (bed
  drag)², shape fitted as depth ∝ distance^b.
- Freeze–thaw: daily temperature = yearly cycle + day–night cycle + weather;
  ground temperature by heat conduction (no latent heat).

Constants are illustrative unless a source is given; the page lists every
assumption and what is left out.

## Data and sources (rounded)

- Swiss glaciers lost 6% of their volume in 2022 and more than 4% in 2023
  (10% in two years; GLAMOS / SCNAT, 28 Sep 2023), and 2.5% in 2024
  (GLAMOS). Great Aletsch Glacier about 22 km long, about 3 km of retreat
  since the 1870s (approximate). Reference glaciers negative every year for over 30 years: World
  Glacier Monitoring Service.
- Alpine warming since 1850 of about 2 °C used in the model is a rounded,
  simplified path.
- UK: Loch Lomond Stadial 12 900–11 700 years ago; British–Irish Ice Sheet at
  its largest about 27 000–21 000 years ago. British Geological Survey.
- Wastwater about 79 m deep; Windermere about 18 km; Helvellyn 950 m with Red
  Tarn and Striding Edge; Yr Wyddfa 1085 m, Crib Goch, Cwm Idwal (Darwin,
  1842), Nant Ffrancon, Llyn Padarn; Ben Macdui 1309 m, Lairig Ghru, Loch
  Avon, Coire an t-Sneachda; Norber erratics. National Park Authorities; BGS.
- About 15–18 million visitors a year to the Lake District; about 600 000
  people walk up Yr Wyddfa each year. National Park Authorities.
- Permafrost underlies about a quarter of Northern Hemisphere land. NSIDC.

## Batch run

**📊 Batch run** opens the batch panel (every setting in an editable table;
tick one to sweep; Repeat or Sweep; CSV download). One-click experiments:

1. **Does the snowline rise about 150 m per °C?** 10 stakes for 5 years:
   gradient 154 m per °C, means within 8 m of theory, SD 28–42 m.
2. **How long is a glacier in a warmer climate?** 0 to +3 °C: −3.1 km per °C;
   within 7% of L = 2(b₀ − ELA + H̄)/s for glaciers over 5 km (12.7 vs 13.6 km at
   0 °C; 7.3 vs 7.4 km at +2 °C); the smallest is 25% shorter; ignoring the
   ice thickness is 2.6 km too short.
3. **How quickly does a glacier respond?** (A level) 55–77 years against
   Jóhannesson's 39–52 years: the rule underestimates by 20–50%.
4. **Which way should a corrie face?** Balance peaks facing N to NNE
   (+1.12 m/yr at 30°), most negative facing SSW (−1.79 m/yr); means within
   0.05 m/yr of theory.
5. **Does ice turn a V into a U?** b rises from 0.99 (V) to 1.93 after 100 000
   years and stays at 2.1–2.3 (theory 2).
6. **When is freeze–thaw most active?** (A level) −12 to +10 °C: peak about
   186 cycles a year near 0 °C, within 4 cycles of theory at every step.

Re-run `tools/worksheets/run-batch-experiments.js` (and the worksheet
generator) if these experiments change.
