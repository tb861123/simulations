# Weathering, Slopes and Landslides

A single, self-contained HTML file: weathering against climate, the factor of safety of a slope, undercut cliffs, soil creep and a century of landslides above a Highland road. It needs no install and no
internet: **open `slopes-landslides.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

★ Enhanced: built from `tools/kit/src/slopes_landslides.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `slopes-landslides.html` by hand. The earlier version and its
worksheets are kept in [`original/`](original/).

- **Standard (GCSE):** Pearson Edexcel GCSE Geography A (1GA0) Topic 1A Coastal and 1B River landscapes: mechanical (freeze–thaw), chemical and biological weathering; mass movement (sliding, slumping, rockfall, soil creep) shaping cliffs and valley sides.
- **Advanced (A level):** Pearson Edexcel A level Geography (9GE0) Option 2B (sub-aerial processes, mass movement, managing risk) and 2A (freeze–thaw, solifluction): weathering and climate (Peltier), the factor of safety, pore water pressure, rainfall thresholds (Caine 1980).

## What it shows

Five views. **Weathering:** a rock outcrop (granite, limestone, iron-rich sandstone, chalk) in a climate you set; joints widen and scree builds with freeze–thaw, a rind grows with chemical weathering, roots crack it; a Peltier-style diagram with UK and world places; rates against temperature and rainfall. **Slope stability:** a soil layer on a slope with a slip surface; the factor of safety F = resisting ÷ driving from the infinite-slope equation, with soil type, slope angle, depth, water table (rain raises it), grass or trees (roots only help if they cross the slip surface) and load on top; when F < 1 the slope slides. **Undercut cliff:** waves cut a notch; the overhang falls when its bending stress beats the rock's strength, the debris protects the foot until it is cleared, and the cycle repeats. **Soil creep:** heave at right angles to the slope and drop straight down move the soil h tan β each cycle; fence posts lean downhill; speeds of creep, solifluction, slumps, mudflows and rockfalls compared. **Landslides over the years:** a hillside like Glen Croe above the A83 in 24 strips through decades of random daily rain; shallow slides close the road; storminess, climate change, trees and (A level) debris fences and Caine's threshold.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| Tilt box: at what angle does dry sand slide? | mean 33.7°, SD 1.2 (angle of friction 33.8°) |
| How does water change the safe angle? | 33.7° dry to 19.4° saturated (theory 33.8° to 18.8°) |
| Do roots only help if they reach the slip surface? | F 0.91 with roots shallower than 1.5 m, 1.32 once they cross it |
| Does chemical weathering double every 10 °C? | 6.9, 14.7, 27.3 mm per 1000 years at 5, 15, 25 °C (theory 6.9, 14.1, 28.3) |
| Where is freeze–thaw fastest? | peak 19.7 mm per 1000 years at 0 °C, almost none at ±15 °C |
| Soil creep and slope angle | 3.4 mm a year at 5° to 28.9 at 35° (theory N h tan β: 3.5 to 28.0) |
| Undercutting a chalk cliff | F 4.7 at a 3 m notch, 1.02 at 6 m, 0.37 at 10 m (theory 4.0, 1.01, 0.36) |
| Landslides and rainfall | about 0.03 a year at 1200 mm to 1.8 at 3200 mm |
