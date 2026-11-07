# Sport Biomechanics

A single, self-contained HTML file (`sport-biomechanics.html`) for PE. Open
`sport-biomechanics.html` in Chrome or Edge, with no install and no internet.

Standard level follows OCR GCSE (9–1) Physical Education (J587): lever
systems and planes and axes of movement. Advanced follows OCR A level
Physical Education (H555) biomechanics. Switch with the **Level** buttons;
the A level tabs appear when Advanced is chosen. The general physics of
projectiles, drag and spin is in `physics/projectile_motion` (linked from the
right panel); this simulation keeps to sport.

## What it shows

A stylised athlete built from 13 body segments plus the head, with standard
lengths and masses (fractions of height and body mass, after Dempster and
Winter). Its centre of mass and moment of inertia come from the body shape
itself. Seven tabs at the top of the centre panel:

- **🦴 Levers** (GCSE and A level): heading a ball (neck, first class), elbow
  extension in a throw (first class), calf raise / take-off (ankle, second
  class), biceps curl (elbow, third class), kicking (knee, third class). The
  athlete moves with F, E and L marked on the joint; beside it a lever diagram
  with arrows sized by force, the effort arm and load arm, and MA = effort arm
  ÷ load arm. Graphs: effort needed against load arm (with the MA = 1 line),
  and the mechanical advantage of the five examples compared.
- **🧭 Planes and axes** (GCSE and A level): a 3D athlete (drag to turn it)
  doing running, a biceps curl, a squat and jump, a kick, a front somersault
  (sagittal plane, transverse axis); a star jump, a cartwheel, a side bend
  (frontal plane, frontal axis); a full twist, a golf swing, a discus turn
  (transverse plane, longitudinal axis), using OCR's axis names (frontal,
  transverse, longitudinal). The plane is drawn through the centre of
  mass with its axis at right angles. The plane–axis pairing is not stated
  in the OCR spec text, so the sim notes: "OCR lists the planes and axes;
  check the pairing against an OCR mark scheme". Graph: the joint angle through one
  repetition.
- **⚖️ Stability** (A level, H555 1.3.a; not on J587): standing, a wide split stance, the sprinter's
  set position, an arabesque, a handstand and the Fosbury flop. The centre of
  mass, the line of gravity and the base of support are drawn; a push can
  topple the athlete about the edge of the base. In the flop the centre of
  mass passes below the bar. Graphs: the push needed against the height of
  the centre of mass and against the distance to the edge.
- **🚀 Impulse** (A level): a 100 m sprint (blocks, braking and propulsive
  impulses in each step, slowing after the line), a countermovement jump on a
  force plate, and a landing from a box. Force–time graphs with the impulses
  shaded (whole run or zoomed on now) and velocity–time with distance.
- **🎯 Projectiles** (A level): shot put, long jump, javelin, discus, golf
  drive, football free kick, tennis topspin forehand, badminton clear. Release
  speed, angle and height, spin (none, topspin, backspin, sidespin either
  way), air resistance, lift, wind, angle of attack, and a "real athletes"
  option where release speed falls at steeper angles. The flight is drawn
  with the no-air parabola dashed, a free body diagram of the forces now, and
  a view from above for sidespin. Graphs: distance against release angle (with
  the best angle), the forces in flight, speed and height.
- **🌬️ Drag, lift** (A level): the flow round a spinning football (Magnus),
  a discus and a ski jumper (lift from the angle of attack, Bernoulli), a
  cyclist (upright, drops, time-trial tuck) and a gliding swimmer. Air or
  water particles show faster flow (blue, lower pressure), slower flow
  (orange, higher pressure) and the turbulent wake. Graphs: forces against
  speed, and Magnus force against spin, lift and drag against angle of
  attack, power against speed (cyclist) or the glide after a push-off.
- **🌀 Rotation** (A level): a diver doing forward 2½ somersaults tuck from
  10 m, a gymnast's back somersault and a figure skater's spin. Tuck, pike or
  layout, how tight, and when to open out. Graphs: ω and I against time, and
  L = Iω (constant in the air).

Right panel: what is happening, live readings, key ideas, exam practice
(6 GCSE and 6 A level questions with mark schemes, several built from the
numbers on screen: mechanical advantage, effort from moments, momentum and
average force, landing impulse, push to topple, best release angle, L = Iω),
and "How the model works (and what it leaves out)".

## Controls

- **Presets** (12): Third-class lever · Second-class lever · First-class lever
  · Sagittal plane · Frontal plane · Transverse plane · and at A level: Sprint
  start: impulse · Balance and stability · Shot put: release angle · Free kick
  with sidespin · Streamlining and lift · Diver: tuck to spin.
- The left panel shows the controls for the tab in use, plus body mass and
  height.
- Play / Pause, Reset, speed 0.1× to 2× (1× = real time). Short movements
  replay automatically.
- **Quality**: the flow pictures offer Low / Medium / High / Ultra (300 to
  3200 particles). The other views are a few shapes and line graphs, cheap to
  draw at any size. Canvases are sized for the screen's pixel ratio.

## The model and its equations

- Levers: effort × effort arm = load × load arm; MA = effort arm ÷ load arm.
- Stability: push to topple = weight × (distance from the line of gravity to
  the edge of the base) ÷ height of the centre of mass.
- Impulse = force × time = area under the force–time graph = m Δv. Sprint
  speed follows v = v_max (1 − e^(−t/τ)); each step's braking and propulsive
  impulses are half-sine pulses sized so the net impulse is the change in
  momentum. Jump height h = v² ÷ 2g. Landing peak ≈ weight + π m v ÷ (2t).
- Projectiles: weight, drag ½ρv²C_dA and lift ½ρv²C_lA, stepped every 2–4 ms.
  Spin lift C_l = 1.5 S ÷ (1 + 2S), S = rω ÷ v (illustrative fit). Discus lift
  C_l = 1.6 α (stall above about 29°), attitude fixed in flight. No-air range
  R = (v cos θ ÷ g)(v sin θ + √(v² sin² θ + 2gh)); best angle
  θ = arctan(v ÷ √(v² + 2gh)). Real athletes: release speed falls by
  0.04 m/s per degree above 37° (after Linthorne, 2001).
- Flow pictures: ideal (potential) flow round a circle or ellipse with
  circulation, so they show faster and slower air and the pressure
  difference; the wake is drawn on top. Cyclist C_dA 0.40 / 0.32 / 0.24 m²;
  swimmer glide C_dA 0.018–0.036 m².
- Angular motion: L = Iω fixed at take-off; I worked out from the body shape
  every 5 ms (about 14 kg m² layout, 7.6 pike, 4.5 tuck; skater about 3.5
  arms out to 1.2 arms in). A small friction torque slows the skater.

Left out: muscle forces and joint angles in detail, the weight of the bones
in levers, air resistance on the diver, twisting somersaults, spin decay, the
wind's effect on the athlete, and fatigue. Many coefficients are typical
published values; some are illustrative and are labelled so in the
simulation.

## Batch experiments

**📊 Batch run** runs throws, kicks, dives and landings many times with no
drawing. Every setting is in the table; tick one to sweep it.

1. **Best release angle vs release height**: shot put from 0–3 m. Best angle
   falls from 45° to about 41°, on top of θ = arctan(v ÷ √(v² + 2gh)) (the
   model with drag sits about 0.06° lower).
2. **Why do shot putters release at about 37°?** With real-athlete speeds the
   best angle is 37.5° (dots and grey theory line); with a fixed speed it
   would be about 42°.
3. **How far do small release errors scatter a throw?** 500 shot puts with
   speed SD 0.25 m/s and angle SD 2°: SD of distance 0.74 m against 0.71 m
   from error propagation; the mean is 0.8% below the no-air theory (drag).
4. **Spin rate vs swerve**: free kick, 0–12 rev/s. Swerve at 25 m rises to
   about 4.4 m at 8 rev/s; the simple constant-force theory over-predicts at
   high spin.
5. **Tucking: does L = Iω hold?** Log–log gradient −1.000 (theory −1).
6. **Bend the knees: landing force vs stopping time**: 0.6 m drop; peak force
   falls from about 15 to 2 body weights, matching 1 + πv ÷ (2gt).

## Data sources

- Winter, D. A. (2009), *Biomechanics and Motor Control of Human Movement*,
  4th edn (segment lengths and masses after Dempster, 1955).
- Linthorne, N. P. (2001), Optimum release angle in the shot put, *Journal of
  Sports Sciences* 19, 359–372.
- Typical drag areas for cyclists and swimmers, and spin lift coefficients
  for footballs (Goff and Carré, 2009) and golf balls, from the sports
  engineering literature; the ski-jump and discus lift models are
  illustrative flat-plate models.
