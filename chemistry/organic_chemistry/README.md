# Crude Oil, Cracking and Polymers

One simulation that tells the whole Edexcel International GCSE story, from crude oil to plastic, in three parts:

1. **Crude oil**: fractional distillation (fractions, chain length and boiling point, viscosity, flammability) and burning the fractions with more or less oxygen (complete and incomplete combustion).
2. **Cracking**: alkanes and alkenes, the bromine water test, cracking long chains into shorter alkanes and alkenes, with balanced equations and supply and demand.
3. **Polymers**: addition polymerisation (monomer → repeat unit), how long the chains grow, how chain length sets the melting point, and the properties and disposal of polymers.

The parts are linked. The heavy fractions from part 1 are the feed for part 2, and the ethene made in part 2 is the monomer for part 3. Buttons in the left panel jump between them.

## How to run

Open `organic-chemistry.html` in Chrome or Edge. There is nothing to install and it works offline.

## Controls

- **Part of the story** (left panel): 1 · Crude oil, 2 · Cracking, 3 · Polymers.
- **Presets** (13). Each one shows one idea and switches to the right part:
  - separating crude oil
  - bitumen stays at the bottom
  - short chains rise to the top
  - a cooler furnace
  - heavy crude
  - complete combustion
  - incomplete combustion
  - alkanes and alkenes
  - cracking decane
  - no catalyst
  - bromine water test
  - ethene → poly(ethene)
  - PVC
- **Crude oil**:
  - type of crude oil and its average chain length
  - furnace temperature
  - mixing between trays (how imperfect the column is)
  - the fraction to test (or click the column)
  - oxygen supply for the burning test
- **Cracking**:
  - feed alkane (C₃–C₃₀, with quick buttons for kerosene, diesel and fuel oil molecules)
  - temperature
  - catalyst on or off
  - time in the hot tube
  - lower picture: the latest cracking equation as displayed formulae, an alkane and alkene side by side, or the bromine water test (hexane vs hexene)
- **Polymers**:
  - monomer (ethene, propene, chloroethene, tetrafluoroethene, phenylethene)
  - number of monomers in the top picture
  - R, the number of monomers per growing chain end, which sets how long the chains grow
- **Picture detail**: Low, Medium, High or Ultra (number of molecules drawn, and glow).
- Play/Pause, Reset, speed ½× 1× 4× 20×. Hide the side panels or go full screen with the buttons at the top right (keys `[`, `]`, `F`).

The right panel shows:

- what is happening
- readings
- two live charts per part:
  - crude oil: boiling point vs chain length, and energy vs oxygen supply
  - cracking: supply vs demand, and the products made
  - polymers: chain-length histogram, and melting point vs chain length
- a data table (fractions, alkanes and alkenes, or polymers)
- key ideas
- exam practice with mark schemes
- "How the model works (and what it leaves out)"

## The model

**Crude oil** is modelled as straight-chain alkanes CₙH₂ₙ₊₂, C₁ to C₈₀. The mass share of each chain length is w(n) ∝ n² e^(−3n/μ), where μ is the average chain length by mass. Light, medium and heavy crudes use μ = 18, 22 and 32, which give roughly real assay yields (light crude: about 36% boils above 340 °C; heavy crude: about 70%).

**Boiling points** are CRC Handbook values (−161.5 °C for methane up to 449.7 °C for C₃₀; estimated above C₃₀). They are the same values as the alkane series in the Bonding simulation.

**The column** has 7 equal sections whose edges are at 20, 25, 130, 180, 260 and 340 °C, plus the furnace temperature at the inlet.

- A molecule turns to vapour in the furnace only if its boiling point is below the furnace temperature. The rest leaves at the bottom as bitumen.
- A vapour condenses where the column is cooler than its boiling point plus a random amount (SD σ, imperfect trays).
- The chain ranges therefore come from the data: C₁–C₄, C₅–C₈, C₉–C₁₀, C₁₁–C₁₄, C₁₅–C₁₉, C₂₀–C₂₄ and C₂₅+ at a 400 °C furnace.

**Fraction properties** are typical real values near 20 °C:

| Fraction | Viscosity (mPa·s) | Flash point (°C) |
|---|---|---|
| Refinery gases | gas | −104 (propane) |
| Petrol | 0.5 | −43 |
| Naphtha | 0.8 | −20 |
| Kerosene | 1.6 | 45 |
| Diesel | 3.5 | 65 |
| Fuel oil | about 1000 | 100 |
| Bitumen | about 10⁸ | 250 |

**Combustion** of CₙH₂ₙ₊₂ with a fraction λ of the oxygen needed:

- Hydrogen burns to water first. The oxygen left over goes to carbon: CO₂ if there is enough, then CO, then soot.
- Complete combustion: CₙH₂ₙ₊₂ + (3n+1)/2 O₂ → n CO₂ + (n+1) H₂O.
- Energy: ΔH = Σ ΔHf(products) − ΔHf(fuel), using NIST enthalpies of formation with liquid water. This gives 890 kJ/mol for methane and 5470 kJ/mol for octane, as in data books.
- All the carbon becomes CO at λ = (2n+1)/(3n+1), which is 68% for octane.

**Cracking**:

- Each C–C bond breaks at random at a rate k = A e^(−Ea/RT):
  - catalyst: A = 6.5 × 10⁶ s⁻¹, Ea = 140 kJ/mol
  - no catalyst: A = 3.8 × 10⁹ s⁻¹, Ea = 230 kJ/mol
- These values are chosen so that decane half-cracks in about 1 s at 650 °C with the catalyst, or at about 850 °C without one.
- A chain of n carbons cracks at rate (n−1)k. The chance it has cracked after t seconds is 1 − e^(−(n−1)kt).
- When a chain breaks, the smaller piece becomes the alkene and the bigger piece the alkane, which may crack again, e.g. C₁₀H₂₂ → C₈H₁₈ + C₂H₄. If the small piece has one carbon, it becomes methane and the big piece the alkene.
- Gases (C₁–C₄) bubble through bromine water, and each alkene molecule uses up one bromine molecule.

**Polymerisation**:

- A growing chain end either adds the nearest monomer or meets another chain end and stops. The chance of stopping at each step is 1/(R + 1).
- Chain lengths therefore follow a geometric distribution: average R + 1, SD √(1 − p)/p with p = 1/(R + 1).
- Melting point uses Broadhurst's formula for straight chains, Tm = 414.3 (n − 1.5)/(n + 5) K, with n = number of carbon atoms (2 per poly(ethene) repeat unit). It fits real alkanes and tends to 141 °C for very long chains.

### Main assumptions and simplifications

- Only straight-chain alkanes. Real crude oil also contains branched alkanes, rings, aromatics and sulfur compounds, so real fractions overlap more and textbook carbon ranges differ a little.
- Viscosity and flash point are typical values, not calculated. The pour-test time is scaled as viscosity^0.4, so thick oils still move on screen.
- Incomplete combustion is a simple "hydrogen first, then carbon" rule. Real flames make a mixture. Sulfur dioxide and nitrogen oxides are explained but not modelled.
- In the cracking model, alkenes do not crack again, the C=C is always at the end of the chain, and ethane and methane do not crack.
- The polymer box holds only a few hundred monomers, so chains in the picture also stop when monomers run out. Batch runs use an endless supply.
- Branching (LDPE vs HDPE), catalysts, cross-linking and condensation polymers are left out.

## Batch run

Press **📊 Batch run**. The batch settings table lists every starting setting for the chosen outcome. Tick one setting to sweep it (+ or × steps), or leave them all unticked for repeat runs with new random numbers. You can download the results as CSV.

| Experiment | What it does | Result (vs theory) |
|---|---|---|
| How much of crude oil is petrol? | 500 samples of 1000 molecules of light crude, mass % of petrol | mean 11.53% (SD 0.84) vs theory 11.48% (SD 0.82); +1.4 standard errors |
| Do shorter chains rise higher? | chain length C₃–C₃₀, height where it condenses | follows the perfect-column line within about 1.5% of the column height (closest away from section edges); C₃–C₄ leave the top, C₂₅+ never boil |
| Hotter furnace, less bitumen? | furnace 250–450 °C, % left at the bottom | 61.3% → 11.1% vs theory 60.9% → 11.8% |
| Less oxygen, less energy? | octane with 40–140% of the oxygen it needs | 2385 → 5423 kJ/mol vs theory 2433 → 5470 kJ/mol (data book 5470), with a straight-line fall below 100% |
| Why heat and a catalyst for cracking? | decane at 350–850 °C for 2 s, % cracked | 14.8% at 550, 75.8% at 650, 98.3% at 700 °C vs theory 14.2%, 75.4%, 97.2%; without the catalyst (dashed) 75% needs 850 °C |
| Longer polymer chains, higher melting point? | poly(ethene), R from 2 to 20 000 | −105 °C (3 units) → 83 °C (21 units) → 141 °C vs Broadhurst −104, 84, 141 °C |

Each experiment fills in the whole table, and its note explains the result and why the runs scatter around theory.

## Exam practice

The exam practice section has the 9 questions from the three old pages (3 each, with their mark schemes), plus live "Your fuel", "Your cracker" and "Your polymer" questions that use the settings on screen:

- combustion equations
- carbon monoxide
- pollutants
- completing cracking equations
- cracking conditions
- supply and demand
- repeat units
- Mr of a chain
- monomer from a repeat unit
- disposal and recycling

This simulation replaces the old pages `chem_sims/11_Crude_Oil.html`, `14_Alkenes_Cracking.html` and `15_Polymerisation.html`.
