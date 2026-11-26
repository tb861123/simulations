Magnet editing update

- Open Magnets in the left sidebar. Add magnet creates a magnet at the x/y coordinates shown under Selected trajectory, with k = 0.020 m³/s².
- Edit its x, y and k fields, or choose its Place on map button and click the main basin plot. Click placement uses the continuous plot coordinates, not the nearest release pixel.
- Dashed, labelled markers preview draft positions over the existing map. Choose Recalculate map to recompute with the edited arrangement.
- Remove deletes that magnet from the draft. Between 1 and 16 magnets are supported; k must be finite and non-negative. Magnets share the existing fixed vertical plane. Their positions are independent of the bob's release-geometry limits.
- Calibration targets, map colours, trajectory and side-view drawing, saves and portable imports support the variable magnet count. Existing three-magnet investigations still work.

Validation: TypeScript and production build pass. 57 automated tests pass, including variable-count validation, force contribution, cache invalidation and portable round-trip of a fourth magnet. The remaining production HTTP test fails with local connection EACCES in this environment. An owner-run browser scenario covers adding, click placement, editing, applying and removing a fourth magnet; browser execution remains unverified here.

Each magnet has Choose colour: open the swatch for the native spectrum popup, or enter a Hex code (#12ab34, #abc) or RGB channels (18, 171, 52). Colour edits update the existing applied magnets, map, legend and scientific PNGs immediately, without recalculating. Recalculate map is only needed for physical changes. Custom colours persist in portable investigations. The owner-run browser scenario also checks selected-coordinate creation and RGB input; it has not been executed here.


