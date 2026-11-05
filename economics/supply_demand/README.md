# Supply, Demand and Elasticity

A market of coffee drinkers and coffee stalls trading in a double auction. Every buyer
knows only the most they would pay (their value) and every seller only the least they
would accept (their cost). Nobody can see the supply and demand curves, yet the prices
they agree settle close to where the curves cross, as in Vernon Smith's classroom
experiments (1962). Shift demand or supply with named causes, watch the new
equilibrium appear, and measure price elasticity of demand and supply.

Standard: Edexcel International GCSE Economics (4EC1). Advanced: Edexcel A level
Economics A (9EC0), Theme 1.

## How to run

Open `supply-demand.html` in Chrome or Edge. No install, no internet.

## What it shows

- **Trading floor** (left of the centre): every buyer and seller as a token, sorted by
  value or cost, with the best bid and best ask on "the board". Calls flash as they are
  made; a deal draws a line from buyer to seller; ticks mark who has traded today.
  Hover over a token to see its value or cost and the price it would call now.
- **Supply and demand diagram**: the traders' own step-shaped curves (one step per
  trader), the straight theory lines for the whole population, today's deals as dots,
  and the equilibrium P\*, Q\*. After a shift the starting curves stay as dashed D1/S1,
  with the shortage or surplus at the old price and an arrow showing the movement along
  the curve that did not shift.
- **Price path**: the price of every deal over the last eight days against the theory
  price. Prices scatter on day 1 and settle within a few days.
- **Elasticity view**: the demand curve coloured elastic / inelastic, two prices A and
  B with their total-revenue rectangles, PED from A to B, and total revenue against
  price (largest where PED = −1).
- Readouts: equilibrium, where these traders' curves cross, today's average price,
  PED and PES at P\*, total revenue, gains from trade made. Advanced adds YED, XED with
  tea and pastries, consumer and producer surplus.

## Controls

- Standard / Advanced toggle.
- 12 presets: finding the equilibrium; random (zero-intelligence) traders; incomes rise
  (normal good); inferior good; tea gets dearer (substitute); pastries get dearer
  (complement); bean prices soar (costs); better machines (technology and more firms);
  a tax on every cup; PED and revenue (inelastic); PED and revenue (elastic); short run
  and long run (A level).
- The market: number of traders, learning or random traders, new traders, mark the
  current curves as D1/S1.
- Demand causes: income (normal / inferior / luxury), tastes and advertising, price of
  tea (substitute), price of a pastry (complement), population.
- Supply causes: cost of beans, wages, technology, number of stalls, indirect tax,
  subsidy.
- Determinants of PED (substitutes, necessity or luxury, share of income, time) and of
  PES (spare capacity, stocks, time period).
- Elasticity explorer: prices A and B; Advanced: GCSE or midpoint formula.
- Play / pause, reset, end the day, speed ½× to 20× (1× = 12 calls a second).
- Hide / show either side panel, drag the panel edges, full screen (keys `[`, `]`, `F`).
- No quality setting: the views are a few shapes and lines, cheap to draw.

## The model

- Buyer values are spread evenly between vLo and vHi, seller costs between cLo and cHi,
  so the theory curves are straight lines: Qd = Nb (vHi − P)/(vHi − vLo),
  Qs = Ns (P − cLo)/(cHi − cLo). They are set so both pass through £2.50 with half the
  traders trading and the chosen PED and PES there: vHi, vLo = P0 (1 ± 1/|PED|),
  cHi, cLo = P0 (1 ± 1/PES).
- Continuous double auction: a random trader who has not traded today calls a price;
  a deal happens when a bid meets the best ask (or an ask the best bid). A day ends when
  no more deals are possible.
- Learning traders are "ZIP" traders (Cliff, 1997): each nudges its price a fraction β
  towards a target just above or below the last price called. Random traders (Gode and
  Sunder, 1993) call random prices that never lose them money.
- Shifts add the same amount to every value (demand) or cost (supply); population and
  number of stalls change the number of traders. Shift sizes and determinant effects are
  illustrative.
- PED = %ΔQd ÷ %ΔP, PES = %ΔQs ÷ %ΔP, YED = %ΔQd ÷ %ΔY, XED = %ΔQd(A) ÷ %ΔP(B).
- Consumer surplus = Σ(value − price), producer surplus = Σ(price − cost); market
  efficiency = surplus made ÷ the most possible.
- Every assumption is listed in the simulation under "How the model works (and what it
  leaves out)".

## Batch run

Press **📊 Batch run**. The settings table shows every starting value; tick one to sweep
it. Random parts: each trader's value or cost, starting margins and learning rates, and
the order of calls. Results from the test run:

| Experiment | Result (theory) |
|---|---|
| Do traders find the equilibrium? (300 markets, 30 + 30, day 5) | mean £2.502, SD £0.317 (P\* £2.50, predicted SD £0.323) |
| More traders, closer to theory? (8 to 256 each side, log–log) | gradient about −0.43 (−0.5; see the note for why it is flatter) |
| How much of the possible gain is made? (300 markets) | 99.3% (100%) |
| Even with random traders? (zero intelligence) | 95.0% (100%) |
| Estimating PED from sales data (price rise 5% to 50%) | mean about −1.0 to −1.1, SD falling from about 2 to 0.15 (−1.00) |
| A rise in demand: how far does the price rise? (shift £0 to £1) | gradient 0.51 (0.5) |

Exam practice: 6 Standard questions (PED and total revenue from the explorer, causes of
a demand shift, movement vs shift, shortage or surplus at a price, PES) and 6 Advanced
(YED, XED, consumer and producer surplus, PED along a straight line, short-run and
long-run PES, the price mechanism and allocative efficiency), with mark schemes.
Several use the numbers on screen.

See also: [Taxes, Subsidies and Price Controls](../taxes_price_controls/taxes-price-controls.html).
