# Arousal, Anxiety and Performance

A single, self-contained HTML file (`arousal-performance.html`) for PE. Open
`arousal-performance.html` in Chrome or Edge, with no install and no internet.

Standard level follows OCR GCSE (9–1) Physical Education (J587) sports
psychology: mental preparation for performance (imagery, mental rehearsal,
selective attention, positive thinking) and goal setting. The rest of the
Standard level introduces topics that are NOT on J587, kept simple and tagged
in the key ideas and exam questions:

- **Not on J587: A level (H555)**: arousal and the inverted-U theory (gross and
  fine skills, beginners and experts), stress management techniques as such
  (deep breathing), drive theory, catastrophe theory, the zone of optimal
  functioning, social facilitation and inhibition, the Ringelmann effect,
  social loafing and Steiner's model.
- **Not on J587: beyond the GCSE spec**: introverts and extroverts. Advanced follows OCR A level Physical Education (H555): adds
cognitive and somatic anxiety (multidimensional anxiety theory), more stress
management techniques, evaluation apprehension and home advantage,
leadership (Fiedler), self-efficacy (Bandura) and attribution (Weiner,
learned helplessness). Switch with the **Level** buttons.

## What it shows

Five tabs at the top of the centre panel, each with a stylised athlete (golf
putt, free throw, penalty, vault, clean and jerk or rugby tackle) whose heart
rate, sweat and (at A level) worried thoughts show their arousal:

- **📈 Arousal**: arousal sweeps from calm to panic and back (or set it
  yourself) while the athlete makes an attempt every 2.5 s. Model the athlete
  with the inverted-U, drive theory, catastrophe theory (with cognitive
  anxiety, showing the collapse and the hysteresis loop) or the zone of
  optimal functioning. Graphs: success against arousal with the attempts so
  far; arousal and success over time; at A level multidimensional anxiety
  theory (somatic inverted-U, cognitive falling, confidence rising).
- **🧘 Mental preparation** (stress management at A level): a 3-minute competition (cup final shoot-out,
  league match, dull friendly, trial in front of scouts) in which importance,
  the crowd, rising pressure and every miss push arousal and worry up. Use a
  technique once before the start or whenever arousal leaves the zone: the
  J587 mental preparation techniques (imagery / mental rehearsal, selective
  attention, positive thinking), deep breathing (tagged A level), psyching up; at A level progressive
  muscle relaxation, biofeedback, thought stopping, centring. Graphs: arousal
  (A level: somatic and cognitive anxiety) against the athlete's best zone;
  expected success with each technique over 100 competitions.
- **👀 Audience**: 0 to 60 000 watching: co-actors, passive spectators, an
  evaluating audience, a home or away crowd. Graphs: success against audience
  size for this athlete, an expert (social facilitation) and a beginner
  (social inhibition); real Premier League home and away win rates with full
  crowds (2018/19) and behind closed doors (2020/21).
- **🤝 Groups**: a tug-of-war team of 1–8 on a force meter, with effort bars
  over each puller. Identifiability, task cohesion, practice, a pseudo-group
  (Ingham), and at A level a leader whose style may or may not suit the
  situation (Fiedler). Graphs: effort per person against group size with
  Ringelmann's 1913 data and Latané et al.'s 1979 shouting data; Steiner's
  model (potential − coordination losses − motivation losses = actual).
- **💪 Confidence** (A level): a 20-match season. After each result the athlete
  explains it (Weiner: ability, effort, luck, task difficulty), which raises
  or lowers self-efficacy; mastery-oriented, learned helplessness, or
  retraining from match 11; verbal persuasion, vicarious experience and
  control of emotional arousal (Bandura). Graphs: self-efficacy over the
  season (with the other styles under the same luck); Weiner's 2 × 2 grid.

Right panel: the story, live readings, key ideas, exam practice (7 GCSE-level
and 5 A level questions with mark schemes, several built from the numbers on
screen: % change in success rate, effort per person in the team, home-win
percentages, Steiner's model) and "How the model works (and what it leaves
out)".

## Controls

- **Presets** (12): The inverted-U · Fine or gross skill? · Drive theory ·
  Catastrophe! · Zone of optimal functioning · Mental preparation · Psyching up
  · Audience · Ringelmann effect · Steiner's model · and at A level:
  Attribution · Cognitive and somatic anxiety.
- The athlete: task, skill level, personality, theory, cognitive anxiety
  (catastrophe theory; always at A level), the centre of the athlete's zone
  (ZOF), trait anxiety (A level).
- Arousal: automatic sweep or a slider. Competition: scenario, technique, when,
  seed. Audience: who, how many, arousal with no one watching, and **Crowd
  detail** (quality: Low 60 / Medium 180 / High 400 / Ultra 900 spectators
  drawn; remembered in this browser; changes only the picture). Groups: team
  size, identifiable, cohesion, practice, pseudo-group; A level leader style
  and situation favourableness. Confidence: attribution style, ability, the
  sources of self-efficacy, seed.
- Play / Pause, Reset, ⏭ Finish, speed 1× (real time) to 10×.

## The model

- Inverted-U: success = floor + (peak − floor) × e^(−½((A − A*) ÷ w)²), with
  optimum A* = 30 + 30 × gross − 25 × complexity + 15 × skill + 8 × personality
  (−1 to +1), width w = 18 + 10 × skill, peak = 35 + 55 × skill %.
- Drive theory: a straight line, rising for skilled performers (the dominant
  response is correct), falling for beginners.
- Catastrophe theory: with cognitive anxiety C ≥ 30%, performance rises until
  arousal passes A* + w (1.6 − 1.2 C/100), drops to near the floor, and
  recovers only below that point − 40 × C/100.
- ZOF: the peak inside the athlete's own band (width 12–20 points), falling off
  outside.
- Competition: somatic arousal and cognitive anxiety move towards targets set
  by trait anxiety, importance, the crowd, end-of-match pressure and recent
  misses; techniques shift them for a while after a short lag.
- Audience: extra arousal = k × 10 × log₁₀(1 + n ÷ 5), k from 0.6 (co-actors)
  to 1.4 (evaluating audience).
- Groups: effort = motivation × coordination, each falling 4.3% per extra
  person (fitted to Ringelmann's data), reduced by identifiability, cohesion,
  practice and suitable leadership.
- Self-efficacy: ±7 points per result × an attribution weight, drifting back
  towards 50, plus the other sources of self-efficacy.
- Effect sizes are illustrative: they give the shapes the theories predict, not
  measured values. Left out: the interpretation of arousal as facilitative or
  debilitative, aggression, motivation in detail, team tactics and fatigue.

## Batch experiments

**📊 Batch run** runs simulated athletes and teams many times with no
drawing. Every setting is in the table; tick one to sweep it.

1. **Is there an inverted-U?** 50 free throws at each arousal level: success
   19.6% at 0, peak 62.0% at 40, 10.2% at 100 (theory 21.8, 62.5, 11.0).
2. **Does the best arousal fall for complex skills?** Optimum found from 30
   attempts at each of 21 levels: 48.2% (theory 48) at complexity 0 falling
   to 22.9% (theory 23) at 1; best-fit gradient −24.9 (theory −25).
3. **Catastrophe: is the way down the same as the way up?** High worry,
   arousal falling from 100%: stays at 14% (theory 15.8%) until below about
   22%, while rising arousal (dashed) gives 51–66% between 30 and 50%:
   hysteresis.
4. **An audience: help or hindrance?** A beginner: 40% with 1 watching, 33%
   with 1530, 14% with 60 000 (theory 40, 33, 16); an expert (dashed) rises
   from 68% to 84% then falls to 66%.
5. **Ringelmann: does effort per person fall?** 99, 91, 83, 75, 68, 62, 55, 49%
   for 1–8 pullers (model 100 … 49%; Ringelmann 100, 93, 85, 77, 70, 63, 56, 49%).
6. **How much does one session vary?** 500 athletes, 50 free throws at 75%
   arousal: mean 25.4% (theory 25.3%), SD 6.13 (binomial theory 6.14).

The worksheet tool (`tools/worksheets/run-batch-experiments.js`) runs all six
with no errors; re-run it if the batch experiments change.

## Data sources

- Ringelmann's rope-pulling data (1913), as reported by Kravitz, D. A. and
  Martin, B. (1986), *Ringelmann rediscovered*, Journal of Personality and
  Social Psychology 50, 936–941: 100, 93, 85, 77, 70, 63, 56, 49% for 1–8
  people (approximate: Ringelmann's original figures as re-reported).
- Latané, B., Williams, K. and Harkins, S. (1979), *Many hands make light the
  work*, Journal of Personality and Social Psychology 37, 822–832: shouting and
  clapping, about 71% per person in pairs, 51% in fours, 40% in sixes
  (approximate, read from the paper).
- Premier League results 2018/19 (home 181, draw 71, away 128) and 2020/21,
  played almost entirely without crowds (home 144, draw 83, away 153), from the
  published season results (approximate; labelled as such in the sim).
- Theories: Yerkes and Dodson (1908), Hull (1943), Hardy and Fazey (1987),
  Hanin (1980s), Martens et al. (1990), Zajonc (1965), Cottrell (1968),
  Ingham et al. (1974), Steiner (1972), Fiedler (1967), Bandura (1977),
  Weiner (1974).
