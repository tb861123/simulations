# Supermarket Queues

Customers arrive at random and take a random time to serve. Even when the tills
could keep up on average, queues form, and as the tills get busier the waits do
not grow steadily: they explode. Each dot is a customer, coloured by how long
they have waited.

## How to run

Open `queues.html` in Chrome or Edge. Nothing to install; works offline.

## What it shows

- Arrival rate, a lunchtime rush, customers giving up when the queue is long.
- Mean service time and its variability (CV 0 = everyone takes the same time).
- 1–10 tills, a queue per till or one snake queue, customers switching to a free till.
- Readouts: utilisation ρ, mean wait (with the Erlang C theory), 95th-percentile
  wait, share served within 5 minutes, share overtaken by a later arrival,
  customers lost.
- Graphs: people waiting through the day (with λ × Wq), and the histogram of
  waiting times against theory.
- Seven guided investigations and a Revise tab.

## Batch run

Mean wait against arrival rate (follows Erlang C, exploding as ρ → 1); how much
one day varies (mean 2.5 min, long right tail); separate queues against one snake
(always a little slower); how often you are overtaken (2% to 45% as the shop
gets busier); variability (follows Pollaczek–Khinchine); how many tills for 95%
within 5 minutes (8, as theory says: 7 gives 87%); and Little's law.

## The earlier version

The previous version is kept, unchanged, in `original/` with its worksheets, and
is linked from "The model" tab. Its express till, self-checkouts, spare tills,
trolley shoppers, paired comparisons and batch settings table are not in this version.

## Limits

All customers are alike apart from their service time; walking takes no time;
switching queues only happens when a till becomes free. See "The model" tab.

## Source

Built from `tools/kit/src/queues.js` with the shared kit: edit that file and run
`node build.js` inside `tools/kit/`. There is no `worksheets.html` for this version.
