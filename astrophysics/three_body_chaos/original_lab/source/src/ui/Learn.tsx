export function Learn() {
  return (
    <div className="panel-body learn">
      <h3>What you are looking at</h3>
      <p>Each pixel of the central map is a <b>separate numerical experiment</b>: a third body (C) approaches a binary (A, B) with an impact offset <i>b</i> and speed <i>v</i>. The colour records what happened. Nothing is drawn by a formula; if a pixel is coloured, a trajectory was integrated for it.</p>
      <details open><summary>Determinism and sensitivity</summary>
        <p>Newton’s laws fix the future of three bodies exactly from their positions and velocities. Yet the outcome map is intricate: neighbouring pixels can end differently because each close encounter amplifies tiny differences. <b>Deterministic does not mean predictable in practice</b>: any real measurement (or any computer) has finite precision.</p></details>
      <details><summary>Gravitational energy and slingshots</summary>
        <p>The total energy E = K + U (kinetic plus gravitational potential) is conserved. A body can only escape if energy flows to it: the remaining pair becomes <b>more tightly bound</b> (E<sub>pair</sub> more negative) and the escaper gains kinetic energy. This is a gravitational slingshot; “binary energy exchange” on the map measures it.</p></details>
      <details><summary>Binary formation and escape</summary>
        <p>With three bodies the usual end state is a binary plus one escaper. A pair is called <b>bound</b> when its two-body energy is negative; the third body is called an escaper when it is unbound relative to the pair, moving outward, far enough away (several times the pair’s widest separation) and these conditions persist for a while. Crossing an arbitrary distance alone is not enough.</p></details>
      <details><summary>Close encounters</summary>
        <p>The pull grows as 1/r², so when two bodies pass very close the accelerations are enormous and the integrator takes tiny steps. Here bodies have a physical radius: when their centres reach the sum of their radii the run stops and records a <b>collision</b>. Collisions are located <i>inside</i> a step, so a fast fly-through cannot slip between samples.</p></details>
      <details><summary>Finite-time uncertainty and “unresolved”</summary>
        <p>Every run stops at a finite time. A grey “unresolved” pixel means nothing decisive happened <i>yet</i>. A system that survives to t = 200 may still break up later. <b>Long survival is not permanent stability</b>; extend the horizon to find out.</p></details>
      <details><summary>Computed boundaries versus mathematical fractals</summary>
        <p>The coloured regions are finite-resolution samples of an extremely intricate set. A boundary line on the map means “neighbouring samples differ”; it is not the exact boundary, and finer sampling can reveal new structure. Zooming runs <i>new simulations</i>; it is not magnification of a picture. Fractal-like structure is plausible, but this tool does not prove it.</p></details>
      <details><summary>Numerical convergence versus trajectory divergence</summary>
        <p>Re-running with tighter tolerances should give the same answer if the numerics are adequate (“convergence”). But two <i>exact</i> neighbouring starts diverge exponentially in chaotic motion, so even accurate solvers eventually differ in detail. Agreement at several tolerances is a diagnostic, not a proof. The Pythagorean preset shows the danger: at the default tolerance the wrong body escapes.</p></details>
      <details><summary>Two different colour ideas</summary>
        <p><b>Body colours</b> (A, B, C) identify the bodies wherever they are drawn. <b>Outcome colours</b> label categories on the map (e.g. “C escapes”, “collision B–C”). They are independent, both editable, and changing either never triggers any recalculation.</p></details>
      <h3>Model and assumptions</h3>
      <ul>
        <li>Point-like bodies in a plane, full mutual Newtonian gravity, a<sub>i</sub> = G Σ<sub>j≠i</sub> m<sub>j</sub>(r<sub>j</sub>−r<sub>i</sub>)/|r<sub>j</sub>−r<sub>i</sub>|³; dimensionless units, G = 1.</li>
        <li>No damping, friction, drag, relativity, tides, radiation or gravitational softening. Contact stops the run; there is no merger physics.</li>
        <li>Escape is judged with two-body energies of the escaper relative to the other pair’s centre of mass, a finite-separation approximation.</li>
        <li>Each classification is a <b>finite-time</b> statement computed with the displayed tolerances.</li>
      </ul>
      <details><summary>Equations and implementation notes</summary>
        <p className="mono">E = ½Σ m<sub>i</sub>v<sub>i</sub>² − G Σ<sub>i&lt;j</sub> m<sub>i</sub>m<sub>j</sub>/r<sub>ij</sub></p>
        <p>Binary: relative speed at pericentre v<sub>rel</sub> = √(G(m<sub>A</sub>+m<sub>B</sub>)(1+e)/r<sub>p</sub>); A and B share it in inverse proportion to their masses. Pair energy ε = ½v² − G(m<sub>i</sub>+m<sub>j</sub>)/r (negative when bound).</p>
        <p>Integrator: Dormand–Prince DOP853 (order 8, embedded 5th/3rd-order error estimate, 7th-order dense output); steps are also capped to half the time-to-contact of any closing pair so a fast encounter cannot be skipped. Conservation errors are scaled by S<sub>E</sub> = K₀+|U₀|, S<sub>P</sub> = √(M S<sub>E</sub>), S<sub>L</sub> = M R₀ √(S<sub>E</sub>/M), so they stay meaningful when E, P or L are near zero. Nothing is ever corrected to hide drift.</p>
        <p>Close encounter counting uses hysteresis: an encounter begins when a pair is closer than 0.25 L and ends only when it exceeds 0.5 L, so one flyby counts once.</p>
      </details>
    </div>
  );
}
