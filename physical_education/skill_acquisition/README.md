# Skill Acquisition and Reaction Time

A single, self-contained HTML file (`skill-acquisition.html`) for PE. Open
`skill-acquisition.html` in Chrome or Edge, with no install and no internet.

Standard level follows OCR GCSE (9–1) Physical Education (J587) sports
psychology: classification of skills on the difficulty and environmental
continua (J587 names only these two), guidance (visual, verbal, manual,
mechanical), feedback (intrinsic, extrinsic, knowledge of performance and of
results, positive, negative) and reaction time. It also introduces, kept
simple and tagged in the key ideas and exam questions:

- **A level (H555)**, not on J587: the information processing model, the
  pacing and muscular involvement continua, and the types of practice
  (massed/distributed, fixed/varied, whole/part/progressive part).
- **Beyond the OCR specs (enrichment)**, on neither J587 nor H555: Hick's law,
  the single-channel hypothesis, the psychological refractory period and
  learning curves.

Advanced follows OCR A level Physical Education (H555) skill acquisition: the
continuity and organisation continua, Fitts and Posner's stages of learning,
the guidance hypothesis, anticipation, the multi-store memory model (Atkinson
and Shiffrin; H555 spells it "Shiffren"), schema theory and transfer. The
working memory model is shown beside it, tagged beyond the spec, for
comparison. Switch with the **Level** buttons;
the A level tab and presets appear when Advanced is chosen.

## What it shows

Five tabs at the top of the centre panel, each with a stylised performer:

- **⚡ Reaction time**: a simulated performer reacts to lights (1–8 choices)
  every 2–3 seconds; press **▶ Take the test yourself** to measure your own
  reactions with the keyboard (number keys 1–8, Space for one choice) or by
  clicking the lights. "10 reactions" or a full Hick's law test (1, 2, 4 and 8
  choices, 8 each). Pressing before the light is recorded as a false start.
  Graphs: reaction time against the number of choices (spaced by log₂N) with
  the simulated performer's Hick's law line and the best-fit line through
  your own means; the spread of reaction times (skewed, with the 0.100 s
  false-start limit); reaction + movement = response time.
- **🧠 Processing**: input → decision → output → feedback, lit up stage by
  stage as a tennis returner, a goalkeeper, a batter or a tackler responds.
  A dummy (feint) shows the single-channel hypothesis: the real move waits
  for the dummy to be processed (the PRP). Graphs: a timeline of the stages
  against the ball's arrival; the PRP against the gap; at A level the
  multi-store model (on H555) and the working memory model (beyond the spec,
  for comparison).
- **📈 Practice**: a squad of 4–20 simulated beginners practises one of 12
  skills over several days. Choose whole / part / progressive part, the rest
  between attempts (massed or distributed), fixed or variable practice, the
  guidance (visual, verbal, manual, mechanical) and the feedback (knowledge of
  results or performance, positive or negative, concurrent or terminal, how
  often). Graphs: the learning curve (each learner, the squad mean, practice
  successes, a retention test a week later; Fitts and Posner's stages at A
  level); the same learners with each practice method; the level of each part
  of the skill, the linking between them and adaptability.
- **🧩 Classifying**: the 12 skills on the difficulty, environment, pacing and
  muscular-involvement continua (J587 names only difficulty and environment;
  pacing and muscular involvement are tagged A level (H555); A level adds
  continuity and organisation),
  with the reasons, a "test yourself" mode, and at A level the practice the
  classification suggests.
- **🎯 Schema** (A level): a learner throws a beanbag at targets and builds a
  rule (effort against distance). Fixed or variable practice, then a test at a
  new distance. Past experience gives positive, negative, zero or bilateral
  transfer.

Right panel: the story, live readings, your results table, key ideas, exam
practice (7 GCSE-level questions, the ones on A level or enrichment topics
tagged as such, and 5 A level questions, the last on the multi-store model, all with mark
schemes; several
built from the numbers on screen: response time, the % increase in choice
reaction time from your own results, the PRP delay) and "How the model works
(and what it leaves out)".

## Controls

- **Presets** (12): Simple reaction time · Choice reaction time · Light or
  sound? · Input, decision, output · The dummy and the PRP · A learning curve ·
  Massed or distributed? · Part and progressive part · Guidance and feedback ·
  Classifying skills · and at A level: Anticipation · Schema: varied practice.
- Reaction time: test plan, beep with each light, clear results, number of
  choices, type of stimulus, and the simulated performer's experience, age,
  fatigue, arousal and movement time; at A level temporal or spatial
  anticipation and how often the guess is right.
- Processing: situation, ball speed, possible responses, experience,
  distractions, selective attention, a dummy and the gap to the real move.
- Practice: skill, whole/part, rest, fixed/variable, attempts and sessions,
  guidance, feedback type, sign, timing and frequency, number of learners,
  seed. Schema: fixed/variable, distances, throws, knowledge of results, test
  distance, past experience, seed.
- Play / Pause, Reset, ⏭ Finish, speeds suited to each tab (1× = real time;
  0.1×–1× for processing, up to 100× for practice).
- Your own test runs in real time whatever the speed; Esc stops it, and other
  keys are ignored while it runs (so F, [ and ] do not change the layout).
- No quality setting: each view is a few shapes, one or two stylised figures
  and simple charts, cheap to draw; canvases are sized for the screen's pixel
  ratio.

## The model

- Simple reaction time a = 0.20 s (light), 0.16 s (sound), 0.155 s (touch),
  adjusted for age, fatigue, arousal (inverted-U) and experience. Choice RT
  (Hick's law) = a + b log₂N, b = 0.15 s per bit for a novice, falling to
  0.06 with experience. Single reactions: ex-Gaussian (normal + exponential
  tail), SD about 22% of the mean. Anticipation: temporal −35 ms; spatial: 30%
  faster than simple RT when right, +80 ms when wrong.
- Information processing: input = 40% of simple RT (+ distractions, cut by
  selective attention), decision = 60% of simple RT + b log₂N, output =
  movement time; each varies ±15%. Ball arrival time = distance ÷ (average
  speed). Single channel: the real move's decision waits until the dummy's
  decision ends; gaps under 0.04 s are grouped.
- Learners: each part of the skill, the linking of the parts and adaptability
  are levels from 0 to 1, raised by each attempt at a rate set by the learner,
  guidance and feedback (by stage of learning), the attention load of
  practising many parts at once (complex skills), fatigue (tiring skills,
  short rests), and what is left to learn. Part practice transfers less well
  when the skill is highly organised or serial; linking is learned only by
  doing parts together. A share of each gain is stable (more with rests:
  spacing); the rest fades overnight and before the retention test. Frequent
  extrinsic feedback creates dependence (the guidance hypothesis).
- Schema: distance ≈ effort ÷ 10; the learner's rule effort = α + β × distance
  is updated by Bayesian least squares from a starting rule (past
  experience).
- All effect sizes in the learning and schema models are illustrative, chosen
  to follow the direction of the published findings, not measured values.

Left out: motivation and boredom, mental practice, the coach, long-term
forgetting, and real differences between sports and between learners, which
are far larger.

## Batch experiments

**📊 Batch run** runs simulated performers and learners many times with no
drawing. Every setting is in the table; tick one to sweep it.

1. **Does Hick's law hold?** Mean of 20 reactions at 1–8 choices (40 runs
   each): 0.218, 0.339, 0.409, 0.460, 0.499, 0.530, 0.557, 0.581 s against
   theory 0.221 + 0.123 log₂N = 0.221 … 0.590 s (all about 1.5% low: the same
   random numbers at every step).
2. **How much does a single reaction vary?** 1000 simple reactions: mean
   0.220 s against 0.221 s (−1.0 standard errors), SD 0.045 s; skewed, so the
   normal curve fits badly.
3. **The psychological refractory period.** Reaction to the real move after a
   dummy, gap 0.02–0.5 s: 0.36 s (grouped) at 0.02 s, 0.50 s at 0.06 s falling
   1 ms per ms of gap to the no-dummy 0.34 s from about 0.25 s; theory
   within 0.013 s (the means sit slightly high: stage times vary).
4. **Massed or distributed practice?** Front crawl, retention a week later:
   39% with no rest rising to 57% with 60 s rests (theory 40% → 54%); end of
   practice 49% → 62%.
5. **Part or whole practice?** Retention with part minus whole, complex
   4-part skill: +9.5 points at organisation 0, crossing zero near 0.7, −5.4
   at 1 (theory +9.3 → −5.5).
6. **Variable practice and schema.** Error at a new 9 m target: 1.22 m after
   fixed practice (theory 1.32; 1.30 vs 1.32 over 2000 runs) falling to
   0.38 m with ±3 m of variety (theory 0.39).

The worksheet tool (`tools/worksheets/run-batch-experiments.js`) runs all six
with no errors; re-run it if the batch experiments change.

## Data sources

- Typical simple reaction times by stimulus (approximate): Kosinski, R. J. (2008, updated
  2013), *A literature review on reaction time*, Clemson University,
  summarising Galton and later work (visual 180–200 ms, auditory 140–160 ms,
  touch about 155 ms).
- Hick's law: Hick, W. E. (1952), *On the rate of gain of information*,
  Quarterly Journal of Experimental Psychology 4, 11–26; Hyman, R. (1953),
  Journal of Experimental Psychology 45, 188–196.
- False start limit: World Athletics Competition Rules (a reaction under
  0.100 s is a false start).
- Guidance hypothesis: Salmoni, Schmidt and Walter (1984); Winstein and
  Schmidt (1990). Schema theory: Schmidt (1975). Stages of learning: Fitts and
  Posner (1967). Working memory model: Baddeley and Hitch (1974). Multi-store
  model: Atkinson and Shiffrin (1968). PRP: Welford (1952).
- Ball speeds and distances (tennis court 23.8 m, cricket pitch 20.12 m,
  penalty spot 11 m) are standard; average ball speeds and movement times are
  illustrative.
