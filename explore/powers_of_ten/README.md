# Powers of Ten

A single, self-contained HTML file: one smooth zoom through 44 powers of ten,
from the edge of the observable universe to a quark. It needs no install and no
internet: **open `powers-of-ten.html` in Chrome or Edge**. The zoom is drawn by
the graphics card (WebGL); if WebGL is switched off the page says so, and the
comparison tool and Batch run still work.

Built with the kit from `tools/kit/src/powers_of_ten.js` by `node build.js`
(run inside `tools/kit/`). Do not edit `powers-of-ten.html` by hand. It is an
"explore" simulation: no Standard / Advanced switch and no Revise tab.

## What you see

24 nested objects, each at its real size and roughly its real place inside the
next: the observable universe, a supercluster wall, Laniakea, the Local Group,
the Milky Way, our stellar neighbourhood, the Oort cloud, the planets' orbits,
Earth's and the Moon's orbits, Earth, Great Britain, London, a football pitch, a
person, a hand, skin, a skin cell, its nucleus, DNA, a carbon atom, its nucleus,
a proton and a quark (plus the Sun, Moon and Andromeda beside the path). Labels
give each size; a live scale bar, the power of ten, the light-crossing time and
"how many fit across" update as you zoom. Jump to any object, or compare any two
of 40 objects (how many fit across and inside).

## Data

Every size is a real measurement or agreed value, with its source listed in the
page's "The model" tab (NASA fact sheets, IAU, CODATA 2018, Planck 2018, Tully et
al. 2014, and so on). Fuzzy-edged objects (atoms, galaxies, the Oort cloud) and
variable ones (people, cells) carry an uncertainty used by the Batch run.

## Batch run

How many fit across, and inside, for eight pairs (for example hydrogen atoms
across the Sun), with every size drawn at random within its uncertainty, so the
spread shows how well each answer is known; and log mass against log size for
everything with a mass, against the line for a ball of water.
