# Luck, Skill and the League

Sixteen clubs with hidden true skill: an animated league table, a knockout cup, and a tally of how often the best team wins. Home advantage and the sacked-manager "bounce".

## How to run

Open `luck-and-skill.html` in Chrome or Edge. Nothing to install; works offline.

## What is in it

- **Controls**: the live model, with sliders and direct manipulation on the picture.
- **Investigate**: one-click investigations, each with a question first and "what to look for" after.
- **📊 Batch run**: many runs without drawing, plotted against theory with mean, SD and standard error; CSV export.
- **The model**: the rules, equations, assumptions and simplifications.

Try this first: Let clubs sack the manager after a bad run (it changes nothing) and watch results improve.

## The model

Poisson goals from skill differences; league and cup formats. Assumptions and simplifications are listed inside the
simulation under **The model**.

## Source

This is a ★ enhanced simulation built with the shared kit. Edit
`tools/kit/src/luck_and_skill.js`, then run `node build.js` inside `tools/kit/`. Do not
edit the HTML by hand. It replaced an earlier version (see the git history),
and has no `worksheets.html` yet.
