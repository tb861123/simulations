# Firms, Costs and Competition

One firm's costs, revenue and profit; how a firm's average cost changes as it grows;
then a market of many firms entering, competing and leaving, from perfect competition
to monopoly; and (Advanced) an oligopoly price game, cartels and the kinked demand curve.

Standard: Edexcel International GCSE Economics (4EC1). Advanced: Edexcel A level
Economics A (9EC0), Theme 3.

## How to run

Open `firms-competition.html` in Chrome or Edge, with no install and no internet.

## The five views (tabs above the main picture)

1. **One firm.** Totals (TC, VC, FC, TR and the profit gap) beside the per-unit diagram
   (AC, AVC, AFC, MC, AR, MR, with the profit or loss rectangle). Each day the firm moves
   towards its best output, so you can watch MR and MC meet. A price taker (AR = MR = P) or a
   price maker (downward-sloping demand). Business objectives: profit maximisation
   (MC = MR), revenue maximisation (MR = 0), sales maximisation (AR = AC), and survival (tagged "beyond the spec":
   4EC1 1.1.2 names only profit, revenue and sales maximisation).
   Advanced: shutdown point (lowest AVC) and break-even point (lowest AC),
   X-inefficiency, third-degree price discrimination (three diagrams: each group with
   MR = MC, and the whole firm) and first-degree price discrimination.
2. **Economies of scale.** A firm grows each year and builds bigger factories. The LRAC
   is drawn as the envelope of the short-run AC curves, with the MES marked. Tick the
   named internal economies (technical, purchasing, marketing, managerial, financial,
   risk-bearing) and diseconomies (communication, co-ordination, motivation) on and off; a
   waterfall chart shows what each one does to the cost per unit. External economies and
   diseconomies shift the whole LRAC as the local industry grows.
3. **Market structures.** Every firm in the industry is drawn, coloured by profit, with
   entrants and exits marked; a typical firm's diagram (AC, and in Advanced MC, AVC, its own
   AR and MR); the price against the lowest AC over time; the number of firms and the
   average profit. Choose perfect competition, monopolistic competition, oligopoly,
   monopoly or (Advanced) a contestable market, or set the barriers yourself: sunk cost of
   entry, brand loyalty, a legal barrier, market size relative to the efficient size of a
   firm. Advanced readings: CR4 (9EC0 3.4.4b), HHI (tagged "beyond the spec": 9EC0 has only
   n-firm concentration ratios), P ÷ MC, average cost against its lowest; options for
   X-inefficiency and research spending (dynamic efficiency).
4. **Price game (Advanced).** A payoff matrix (Nash equilibrium starred, dominant
   strategy named) and a repeated match between two strategies: cartel (always high),
   always undercut, tit-for-tat, grim trigger, random, win-stay lose-shift, with optional
   mistakes. A round-robin tournament compares them, with exact theory values.
5. **Cartels and kinked demand (Advanced).** A cartel of N firms year by year: members
   cheat in good years when the one-off gain beats their share of future profit; the
   authorities catch some. Theory: average life and the δ ≥ 1 − 1/N rule. Beside it, the
   kinked demand curve with the gap in MR; marginal cost drifts and the price stays put
   while MC is inside the gap.

Right panel: what's happening, readings, a chart for the view, real UK examples,
key ideas, 12 exam questions (5 Standard, 7 Advanced, several built from the numbers on
screen) with mark schemes, and "How the model works (and what it leaves out)".

## Controls

- Standard / Advanced toggle (views 4 and 5 and the A level options appear in Advanced).
- 12 presets: costs of a bakery; profit is biggest at MC = MR; business objectives;
  make a loss: shut down? (A level); price discrimination: train fares (A level);
  economies of scale; perfect competition: entry; monopolistic competition (coffee
  shops); oligopoly: high barriers; monopoly (a patent); price war: the prisoners'
  dilemma (A level); will the cartel last? (A level).
- Play / pause, reset, step, speed ½× to 20× (1× = a day, a year or half a quarter a
  second); hide / show panels, full screen.
- No quality setting: every view is a few shapes and lines (at most about 60 firms),
  cheap to draw on any laptop.

## The model

- One firm: AVC = m (1 + k ((Q − Qv) ÷ Qv)²); TC = FC + Q × AVC; MC = dTC/dQ.
  Demand P = a (1 − Q ÷ Qmax), MR = a (1 − 2Q ÷ Qmax). Costs include normal profit.
- Economies of scale: LRAC = £10 × (1 − Σ savings) × (1 + Σ diseconomies) × external
  factor, each saving building up smoothly over a range of sizes; SRAC for a factory
  built for Q₀ = LRAC(Q) + 0.35 LRAC(Q₀) (ln(Q ÷ Q₀))². Saving sizes are illustrative.
- Market: C = F + cQ + eQ² (efficient size 10 thousand units a quarter, lowest AC £12);
  firm i's price P = a − (B qᵢ + g × rivals' output) ÷ m. Price takers set P = MC;
  others choose a Cournot best response; each moves 30% of the way a quarter. Entrants
  come if five years of expected profit beat the sunk cost of entry; firms with four
  losing quarters in a row leave (35% chance a quarter); a firm whose price would not
  cover AVC shuts down for the quarter. Contestable: hit-and-run entrants judge by today's
  price, incumbents hold the price near average cost.
- Price game: a repeated prisoners' dilemma; theory is the exact expected payoff over
  every possible history.
- Cartel: a member cheats when (1 + ε)(N − 1) > δ′ ÷ (1 − δ′), δ′ = δ (1 − d); the yearly
  chance it ends is h = d + (1 − d) P(ε > ε*), average life (1 − (1 − h)¹⁰⁰) ÷ h years.

## Batch run

| Experiment | Result from the test run (theory) |
|---|---|
| Perfect competition: does price fall to the lowest AC? (100 markets) | price ÷ lowest AC 1.020, SD 0.005 (1.020; textbook 1) |
| Barriers to entry: how many firms survive? (sunk cost £0–£6m) | 13.7, 10, 8, 6, 5, 4, 4, 3, 2, 2, 2, 1, 1 firms (14, 10, 8, 6, 5, 4, 4, 3, 2, 2, 2, 1, 1) |
| Barriers and price: competition vs monopoly | price ÷ lowest AC 1.03 → 2.60 (1.02 → 2.60) |
| Cartel: do more members make it collapse? (2–10 members) | average life 21.7, 21.7, 20.6, 2.6, 1.2, 1.0 … years (19.9, 19.9, 18.5, 2.5, 1.2, 1.0 …) |
| Cartel: does a bigger chance of being caught help? (0–30% a year) | 100, 36, 16.5, 4.5, 1.9, 1.2 … years (100, 31.7, 13.5, 4.0, 1.7, 1.2 …) |
| Strategy tournament: is tit-for-tat best? (300 tournaments, 5% mistakes) | tit-for-tat £4.48m a year, SD 0.19 (exact £4.48m; £5.35m with no mistakes) |

Each experiment's note explains what the result shows and why results scatter.
Re-run `tools/worksheets` for this simulation if the batch experiments change.

## Data sources

Worldpanel (formerly Kantar) grocery market shares, mid-2025: Tesco 28.4%, Sainsbury's 15.0%,
Asda 11.8%, Aldi about 11%, CR4 about 66% (Morrisons and Lidl about 8%, approximate); UK competition law (Competition Act 1998,
Enterprise Act 2002, CMA fines up to 10% of worldwide turnover, the 25% market-share test
for investigating monopoly power); OFT fine on British Airways for fuel-surcharge price
fixing with Virgin Atlantic (£121.5 million, 2007). All other numbers are illustrative.
