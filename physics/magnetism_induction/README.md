# Magnetism and Induction

A single, self-contained HTML file: the motor effect and charged particles in fields; electromagnetic induction with a moving magnet; transformers; the d.c. motor. It needs no install and no
internet: **open `magnetism-induction.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

★ Enhanced: built from `tools/kit/src/magnetism_induction.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `magnetism-induction.html` by hand. The earlier version and its
worksheets are kept in [`original/`](original/).

- **Standard (iGCSE):** Pearson Edexcel International GCSE Physics (4PH1) Section 6: the motor effect, Fleming's left-hand rule, the d.c. motor and commutator, induction, generators, transformers.
- **Advanced (A level):** WJEC Eduqas A level Physics Component 2 Topic 7: F = BIL sin θ, F = Bqv and circular orbits, flux and flux linkage, Faraday's and Lenz's laws. Torque, back-EMF and transformer losses are beyond the spec.

## What it shows

Four views. **Magnetic force:** a wire at any angle between N and S poles, current shown moving, force into or out of the screen; at A level an electron or proton circling in a field. **Induction:** a magnet pushed (or dragged by hand) through a coil, with a galvanometer and flux and EMF graphs; Lenz's law explained; energy dissipated at A level. **Transformer:** iron core, alternating flux, primary and secondary voltages and currents, efficiency at A level. **D.c. motor:** an end view of a coil with forces, a split-ring commutator (switch it off to see the coil rock and stop), torque against angle.

## Batch run

| Experiment | Result when tested (theory) |
|---|---|
| Force on a wire against current | gradient 10.0 mN per A, r = 1.000 (BL = 10) |
| How does the force depend on the angle? | 0 along the field to 30 mN across it (BIL sin θ) |
| Orbit radius: is r = mv/qB? | log–log gradient 0.997 (theory 1) |
| Faraday: faster magnet, bigger EMF? | peak EMF ∝ speed, 0.017 V at 0.5 m/s to 0.17 V at 5 m/s |
| Area under the EMF–time graph | 0.040 V s at every speed (NBA = 0.04) |
| More turns, bigger EMF? | ∝ N, gradient 3.4 × 10⁻⁴ V per turn |
| Is Vs/Vp = Ns/Np? | gradient 0.060 V per turn (Vp/Np = 0.06) |
| Does the load set the primary current? | 2.4 A at 20 Ω to 0.12 A at 400 Ω |
| Average torque of a d.c. motor | 76.3 mN m (theory (2/π)BINA = 76.4) |
