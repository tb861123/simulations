# Natural Selection

A single, self-contained HTML file (`natural-selection.html`) for GCSE and
iGCSE biology. It shows how predators, habitat, climate and food decide which
alleles are passed on. No installation and no internet are needed: open
`natural-selection.html` in Chrome or Edge, with no install. Pick a preset
and press **Start**.

## What it shows

Animals sit on a habitat background. Each generation, predators hunt (birds
and pike swoop on the animals that stand out; foxes and lynx chase the slow
ones). The survivors breed, and each baby gets one allele of each gene from
each parent. The graphs show allele frequency, population size and the
spread of phenotypes at the start and now.

**Species** (each with its own genes):

| Species | Gene(s) | Selected by |
|---|---|---|
| Peppered moth | wing colour: dark C (dominant) / pale c | birds on lichen or sooty bark |
| Ground beetle | colour: brown B > green G > sand s (3 alleles) | birds on sand, dark soil or grass |
| Snowshoe hare | winter coat: white W (dominant) / brown b; speed F/f (no dominance) | lynx and foxes (chase), owls (sight); snow cover set by winter temperature |
| Medium ground finch | beak depth: 6 genes, each "+" adds 0.4 mm, plus environment | drought leaves only large, hard seeds |
| Guppy | bright B (dominant, shown only in males) / dull b | pike (sight) against female choice (sexual selection) |
| Grove snail | unbanded brown U (dominant) / yellow banded u | song thrushes in woodland or stripy grassland; overheating of dark shells |

**Controls:** species, the allele to follow, starting frequency (or a single
new mutant), dominance (as in nature, or "halfway" with no dominance),
population limit, random seed; habitat, a habitat change at a chosen
generation (for example pollution then the Clean Air Act), predator type and
number, temperature and climate warming, seed supply in a drought, sexual
selection strength and mutation rate.

**Readouts:** generation, population, frequency of the followed allele,
selection coefficient, Hardy–Weinberg expectations, deaths, survival rate of
each phenotype last generation, and (for finches) heritability and the
predicted response.

## Presets

Industrial melanism · Recovery after clean air · Beetles on sand · Beetles on
grass · Snowshoe hares with less snow (climate change mismatch) · Galápagos
finch drought 1977 · Guppies with pike · Guppies with no predators · Snails in
woods then fields · No predators: drift only · Strong selection (like
antibiotics).

## The model

- Each animal's chance of surviving a generation is
  e<sup>−h</sup> × (survival from heat or food), where the hunting risk
  h = predators × 0.07 × (how easy to spot, 0.1–1) × (how easy to catch, 0.45–1).
- How easy to spot depends on the colour difference between the animal and
  each part of the background.
- Survivors mate at random (fathers weighted by brightness if sexual
  selection is on). Each surviving adult can raise up to 3 young, up to the
  population limit. Generations do not overlap.
- Theory lines: the selection equation with Hardy–Weinberg proportions,
  p′ = (p²w<sub>AA</sub> + pq·w<sub>Aa</sub>)/w̄ (with no dominance this is
  p′ = p(1+s)/(1+ps)); the breeder's equation R = h²S for finch beaks.

All assumptions and simplifications are listed in the app under **How the
model works (and what it leaves out)**.

## Batch run

**Batch settings table.** The batch panel lists every starting setting a run uses: species, allele followed, starting frequency, one-copy start, heterozygote look, population limit, generations per run, habitat, habitat change and the generation it happens, predators and how many, temperature, warming, drought seed supply, mate preference, mutation rate and the random seed (the habitat, predator and allele lists follow the species), plus three things that used to be fixed: hunting risk per predator (0.07), young per surviving adult (3) and the finch beak's environmental SD (0.45 mm; the breeder's equation theory uses it too). Defaults are the old values, so every experiment gives exactly the same results as before. Tick one setting to vary it and give from / to / step (+ adds the step, × multiplies by it; up to 60 steps, previewed as you type); every other setting stays at the value shown, and a run uses exactly what the table shows. Unticking goes back to Repeat. One-click experiments fill the whole table in from fixed default settings (a preset plus the experiment's own changes), never from the left panel, so they give the same results in any order and do not change the left panel; clicking one only fills the table, and **▶ Run batch** runs it. **↺ Use my left-panel settings** copies the left panel into the table instead.

**📊 Batch run** repeats the model many times with different random seeds
(Repeat) or changes one setting in steps (Sweep), then compares the results
with theory. Results can be downloaded as CSV. Experiments:

1. Does the dark moth spread as the selection equation predicts? (mean ± SD of
   100 runs against the equation)
2. How many generations until 90% of moth alleles are dark?
3. More predators: faster evolution? (sweep predator numbers)
4. Can small populations lose a helpful allele by chance? (sweep population
   size against Kimura: 1 − (1 − e<sup>−4Nsp</sup>)/(1 − e<sup>−4Ns</sup>))
5. Is a single new mutation usually lost? (theory 1 − (1 − e<sup>−2s</sup>)/(1 − e<sup>−4Ns</sup>))
6. With no selection, is the chance of fixing equal to the starting frequency?
7. Galápagos 1977: does the breeder's equation predict the beak change?

Runs scatter around theory because of genetic drift: chance in who is caught
and who breeds, which is strongest in small populations.
