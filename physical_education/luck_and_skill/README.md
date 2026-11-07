# Luck, Skill and Results

Simulated teams, each with a fixed true strength, play whole seasons. Goals are rare and random, so every result mixes skill and luck. How often does the best team win the league, and how often a knockout cup? How big is home advantage? Why does the Manager of the Month so often do badly the month after? How many matches until the table is fair? And what does a positive drug test really mean when most athletes are clean?

- **Standard** (OCR GCSE PE J587): use of data (reading tables, bar charts and line graphs, means, ranges and percentages), drugs in sport and testing, the ethics of a positive test, home advantage and the crowd.
- **Advanced** (OCR A level PE H555): attribution theory (Weiner: luck is external and unstable, ability internal and stable; learned helplessness), the ethics of drug testing (strict liability, false positives), and data analysis: variance and the share of luck, correlation and sample size, regression to the mean, Bayes' theorem.

Regression to the mean, the Poisson match model, the variance split and Bayes' theorem are data-analysis tools that support the specification content; they are not named in J587 or H555.

## How to run

Open `luck-and-skill.html` in Chrome or Edge, with no install. It works offline by double-clicking the file.

## Modes

1. **League or cup?** A 38-match season shown on a pitch (stylised players chasing the ball), with the live league table (and each team's true rank), then a 16-team knockout cup. Views: points per game against true quality; how often the best team won the league and the cup, with theory; the real 2024/25 Premier League table against the spread luck alone would give; home advantage with and without crowds (2018/19 and 2020/21).
2. **Regression to the mean.** Manager of the Month awards and the month after, against what each winner's true strength predicts.
3. **Sample size.** The correlation between the table and true strength as matches are played; a form guide; at A level, how much of the final table is luck (variance).
4. **Drug tests.** A squad of athletes tested with an imperfect test: a natural-frequency tree, the chance a positive athlete really doped against the base rate (Bayes), and WADA's real testing figures.

## Controls

Left: Standard / Advanced, 12 presets, number of teams, spread of strengths, the best team's extra edge, home advantage, goals per team, matches in a month, a seed for new teams; for drug tests the number of athletes, the share who dope, the sensitivity and false-positive rate, an independent re-test, and a quality setting (how many athlete figures are drawn). Centre: mode tabs, Play/Pause, Reset, Finish the season (or test everyone), speed (1× = one round of matches a second), Batch run. Right: what's happening, readings, real data, where it sits in the specification, key ideas, exam practice and "How the model works".

## The model

- Team strength s ~ normal(0, spread), strongest first, plus an optional edge for the best team.
- Goals: Poisson with mean λ = g × e^(±(s_home − s_away) ÷ 2 ± h ÷ 2). g = 1.35 and h = 0.3 give about 47% home wins and 2.7 goals a match.
- League: double round robin in a random fixture order, 3 points a win, 1 a draw. Cup: the 16 strongest, random draw, coin toss for the venue, neutral final, penalties 50 : 50.
- Theory: cup win chance exact (through the bracket); league win chance by a normal approximation; luck SD of points and expected points per game exact; correlation after n matches r = √(σq² ÷ (σq² + σe² ÷ n)); PPV = sens × p ÷ (sens × p + fpr × (1 − p)).

Assumptions are listed in the simulation. The main ones: strengths fixed for a season (so all "form" is luck), independent matches, no injuries, red cards or tactics, penalties pure luck, illustrative test accuracies and doping rates, and a re-test treated as independent (a real B sample is the same urine).

## Batch experiments

| Experiment | What it shows |
|---|---|
| Pure luck: how spread out is the table? | Equal teams still spread with an SD of about 8 points (theory 8.1); the real 2024/25 Premier League spread is 18.6. |
| League or cup: does the best team win? | The best team wins the league far more often than the cup (exact cup theory as the second line). |
| Is there a manager of the month curse? | Award winners fall back next month to what their true strength predicts: regression to the mean. |
| How many matches until the table is fair? | The correlation with true strength grows as √(σq² ÷ (σq² + σe² ÷ n)). |
| A positive test: guilty? | With rare doping most positives are false; the points follow Bayes' theorem. |
| How big is home advantage? | Home-win % against h, compared with the exact model chance and the real seasons with and without crowds. |

Results can be downloaded as CSV. Every setting a run uses is in the batch settings table; tick one to sweep it. The worksheet tool in `tools/worksheets/` re-runs these experiments (see its README).

## Data sources

All real figures are labelled with their source in the sim. Premier League 2024/25 final table (source: Premier League): Liverpool 84, Arsenal 74, Manchester City 71, Chelsea 69, Newcastle 66, Aston Villa 66, Nottingham Forest 65, Brighton 61, Bournemouth 56, Brentford 56, Fulham 54, Crystal Palace 53, Everton 48, West Ham 43, Manchester United 42, Wolves 42, Tottenham 38, Leicester 25, Ipswich 22, Southampton 12 (1047 points, so 93 draws; SD 18.6 points). Season results for 2018/19 (181 home wins, 71 draws, 128 away wins) and 2020/21 (144, 83, 153) are unverified and labelled approximate. WADA, *2023 Anti-Doping Testing Figures* (all accredited labs): adverse analytical findings 0.77% (2022) → 0.80% (2023); AAFs and atypical findings combined 0.93% → 0.96%. AAFs are not the same as sanctioned violations. The true share of athletes who dope is unknown; the test accuracies used are illustrative.
