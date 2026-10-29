# Supermarket Queues

A single, self-contained HTML file (`queues.html`) for teaching queueing
theory: random arrivals, random service times, and why waiting time explodes
as the tills get busy. There is nothing to install and no internet is needed:
open `queues.html` in Chrome or Edge.

## What it shows

This is an animated shop floor. Customers arrive at random through the
entrance, choose a queue, wait and are served at a till, then leave. Each
customer is coloured by how long they have waited (green → gold → red), and
trolley shoppers have a small cart. A bar under each till shows how far
through the current customer it is. Self-checkouts and the snake queue are
drawn with rope barriers.

At 1× speed, one shop minute passes every second. The other speeds are ½×,
4×, 15× and 60×.

## Controls

- **Customers** (change at once): arrival rate λ per minute; time-of-day
  pattern (steady, or a lunchtime rush that peaks at 2.5× at 12:30); % with
  big trolleys; giving up (balking) when there are too many people ahead.
- **Service** (changes at once): mean service time; distribution (exponential,
  gamma, log-normal or fixed); variability (CV).
- **Tills** (changes restart the day):
  - number of staffed tills
  - queue layout: a queue per till (customers pick the shortest), or one
    shared snake queue
  - jockeying (switching to a shorter queue)
  - an express till (baskets only)
  - self-checkouts and their speed
  - spare tills that staff open when a queue is longer than k
  - opening hours and the random seed

**Readouts:**

- How busy the tills are (ρ)
- Mean wait, longest wait and 95th-percentile wait
- Mean queue length
- % served within 5 minutes
- Customers lost
- Unfairness: the % of customers overtaken by someone who arrived later

A theory table puts the simulation next to M/M/c (Erlang C), M/G/c
(Pollaczek–Khinchine / Allen–Cunneen) and "c separate M/G/1 queues". There is
a graph of people waiting through the day, and a histogram of waiting times
with the theory curve on top.

## Presets

Quiet morning · Lunchtime rush · One snake queue · Separate queues (same shop) ·
Express till · Near overload (ρ = 0.97: add a 4th till) · Highly variable
service (one till, CV = 2) · Staff open tills · Self-checkouts · Overloaded
(ρ > 1) · Customers give up.

## The model and its equations

The model is a discrete-event simulation: the clock jumps from one arrival or
service completion to the next.

- **Arrivals** form a Poisson process: the gaps are exponential with mean 1/λ.
  The rush-hour pattern is made by thinning.
- **Service time** = mean × (trolley 4b or basket b, where b = 1/(1 + 3f) and f
  is the trolley share) × a random amount of work with mean 1 and the chosen CV.
- **Utilisation:** ρ = λ/(cμ), where μ = 1/(mean service time).
- **Erlang C:** with a = λ/μ, C = P(wait), Wq = C/(cμ − λ) and
  P(Wq > t) = C e^(−(cμ − λ)t).
- **Pollaczek–Khinchine (M/G/1):** Wq = ρ/(1 − ρ) · (1 + CV²)/2 · E[S].
- **M/G/c (Allen–Cunneen):** Erlang C × (1 + CV²)/2.
- **Little's law:** Lq = λ Wq.

The theory assumes:

- a steady arrival rate
- identical tills
- nobody gives up
- no warm-up: the shop has been open for ever

With rush hours, self-checkouts, express tills, spare tills or balking, the app
says that the formulas are only a rough guide. The doors close at closing time,
but everyone already inside is served. Everything left out is listed in the
app, under "How the model works".

## Batch run

Press **📊 Batch run**. It runs whole days with no animation, in three modes:

- **Repeat**: many days with the same settings
- **Sweep**: step one setting
- **Compare**: each day is run with separate queues *and* with one snake,
  using the same customers. This is a paired comparison.

You can choose from nine outcomes.

**Batch settings table.** The batch panel lists every starting setting of a day: arrival pattern, service-time distribution, queue layout, jockeying, express till, giving up and random seed; arrival rate, tills, mean service time, service CV, trolleys, self-checkouts, give-up limit, spare-till rule, self-checkout speed, spare tills and the length of the day; the warm-up (60 minutes: it used to be a tick box) and the trolley factor (a trolley takes 4× as long as a basket: it used to be fixed). Defaults are the old values, so results are unchanged. Tick one setting to vary it and give from / to / step (+ adds the step, × multiplies by it; up to 60 steps, previewed as you type); every other setting stays at the value shown, and a run uses exactly what the table shows. Unticking goes back to Repeat. One-click experiments fill the whole table in (from fixed defaults, seed 1), and **↺ Use my left-panel settings** copies the left panel into it.

 The results show a histogram or a scatter with
mean ± 1 SD error bars and the theory curve, plus a summary of the mean, SD,
standard error, theory and the difference in standard errors. **Download CSV**
saves the raw results.

Batch experiments (results from testing, seed 1):

| Question | Result |
|---|---|
| Why do queues explode as ρ → 1? (3 tills, 2 min, λ 0.3 → 1.44) | follows Erlang C closely up to ρ ≈ 0.9; at ρ = 0.96, 10.8 min against 15.4 min theory (an 8-hour day is too short to reach the long-run average) |
| How much does one day vary? (500 days, ρ = 0.8) | mean 2.12 min against Erlang C 2.16 (−0.7 SE); single days range from 0.5 to 10.6 min |
| Is one snake faster and fairer than separate queues? (200 paired days) | mean wait 2.82 against 2.33 min; SD of waits 3.58 against 2.65; longest wait 20.3 against 11.1 min; unfairness 37% against 0%; the snake is better on 100% of days |
| Does variability matter? (one till, ρ = 0.8, CV 0 → 2) | 3.7 → 15.9 min against P–K 4.0 → 20.0; the high-CV points sit slightly low because of heavy-tailed days |
| How many tills so 95% wait under 5 min? (λ = 2/min, 3 min service) | 7 tills: 82% (theory 88%); 8 tills: 99% (theory 98.7%), so 8 tills are needed |

Every experiment finishes in about a second.
