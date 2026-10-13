# Galton Board & the Central Limit Theorem

A single, self-contained HTML file (`central-limit-theorem.html`) for teaching
the binomial distribution, the normal curve and the central limit theorem
(GCSE / A-level statistics). There is nothing to install and no internet is
needed: open `central-limit-theorem.html` in Chrome or Edge.

## What it shows

**Galton board.** Balls bounce down rows of pegs. At each peg a ball goes right
with probability p. The bin it lands in is the number of right-bounces, so the
pile follows the binomial distribution. White marks show the binomial
prediction for each bin and a blue curve shows the normal curve with the same
mean and SD.

**Sample means machine.** Pick a parent population. The machine takes a sample
of n values (you can watch each value), works out its mean and drops it onto a
histogram. The blue curve is what the central limit theorem predicts: a normal
curve with mean μ and SD σ/√n. The parents are:

- a fair die
- a weird loaded die (mostly 1s and 6s)
- exponential bus waiting times
- two humps (bimodal)
- U-shaped (arcsine)
- skewed household incomes (log-normal)
- your own: drag the bars on the top chart to draw it
- the lighthouse beam (Cauchy): the CLT fails here

## Controls

- **Galton board:** rows of pegs (1–24), chance of bouncing right p (a tilted
  board), ball rate and number of balls.
- **Sample means:** parent population, sample size n (1–200), samples per
  second (1 or 2 animate each sample; faster rates just add means), number of
  samples, and "zoom in on the means".
- **Random seed:** the same seed gives the same run.
- Play/Pause, Reset, **Finish now** (does the rest instantly) and speed
  (½×, 1×, 4×, 15×).
- The side panels can be resized by dragging the splitters, or hidden.

**Readouts:** mean, SD and skewness against theory, % within ±1 SD, the χ²
goodness-of-fit statistic with its p-value, and the "gap from the normal curve".
For the Cauchy population the readouts are the median, the interquartile range
(IQR), how far the biggest mean lies from the centre and how many means are off
the scale. The live charts show the running SD against theory, and a normality
check: % within 1, 2 and 3 SD against 68.3 / 95.4 / 99.7%.

## Presets

Classic Galton board · Tilted board (p = 0.8) · One die → many dice (n = 1) ·
Small n vs large n (loaded die, n = 3) · Waiting times (exponential, n = 5) ·
Two humps (n = 10) · U-shaped · Skewed incomes · Draw your own · Cauchy breaks it.

## The model and its equations

- Galton board: K ~ Binomial(R, p). P(K = k) = C(R,k) pᵏ(1−p)ᴿ⁻ᵏ,
  mean Rp, SD √(Rp(1−p)), skewness (1−2p)/√(Rp(1−p)).
- Normal curve per bin: the area from k − ½ to k + ½ (continuity correction).
- CLT: the means have mean μ, SD σ/√n and skewness γ/√n.
- χ² = Σ (O − E)²/E. Edge bins are merged until each group expects at least
  5 balls, giving (groups − 1) degrees of freedom.
- Gap from normal = ½ Σ |observed share − normal share|, as a %. Its expected
  value uses the folded-normal mean of each bin's random scatter.
- Cauchy: x = 5 + tan(π(U − ½)). The mean of n values has the same Cauchy
  distribution as one value, so the IQR stays at 2 for every n.
- Random numbers come from the seeded generator mulberry32, and normal values
  from Box–Muller.

**Assumptions:** every bounce is independent and clean, with no spin, double
bounces or collisions. The population is infinite and the samples are
independent. All of these are listed in the app, under "How the model works".

## Batch run

Press **📊 Batch run**. It runs the same model many times with no animation:
**Repeat** (the same settings with new random numbers) or **Sweep** (step one
setting, on a linear or log scale). You choose the outcome to record. The
results show a histogram or a scatter with mean ± 1 SD error bars, with the
theory curve on top. For sweeps you can use log–log axes with a fitted
gradient. A summary table gives the mean, SD, standard error, theory, and the
difference in % and in standard errors. **Download CSV** saves the raw
results.

Batch experiments (results from testing, seed 1):

| Question | Result |
|---|---|
| Does the spread of the mean shrink like σ/√n? (die, n = 1…256) | log–log gradient −0.499 (theory −0.500) |
| Does skewness fade away as n grows? (exponential, n = 1…128) | gradient −0.505 (theory −0.500), skewness 2.01 → 0.17 |
| Is the Galton board really binomial? (500 boards × 500 balls, 12 rows) | mean χ² 8.08 (theory 8 df); 4.8% above the 5% critical value |
| How many rows before a tilted board (p = 0.2) looks normal? | gap 8.6% at 2 rows → about 3.5% at 40 rows, matching the expected-gap curve |
| How many balls before the pile matches the curve? | gap falls like 1/√balls (gradient −0.46, theory −0.47) |
| Does averaging tame the Cauchy? | IQR stays at 2.0 for every n (gradient −0.002, theory 0) |

Every batch experiment finishes in under a second on a laptop.
