# Music simulations: in-depth audit

## Scope and conclusion

Reviewed the six new Music Lab modules and their index integration. This is not a scientific or functional certification of the original science simulations elsewhere in the supplied pack.

The audit found and corrected functional, musical and presentation defects missed by the initial smoke tests. The revised modules passed 1,028 browser/model assertions, with zero JavaScript errors, plus separate rendered-audio spectral and scheduler checks. They are useful idealised teaching models; they do not reproduce the complete physical behaviour or sound of real instruments.

## Findings and corrections

| Finding | Change |
|---|---|
| Upper notes always used sharp spellings, which could contradict the interval name (for example C–D♯ described as a minor third). | Upper-note spelling now follows the named diatonic interval: C–E♭ for a minor third. All 325 root/interval combinations checked for pitch correctness. Tritone explicitly uses augmented-fourth spelling. |
| Harmonics in Inside a Sound advanced with the same phase rather than harmonic-dependent phases, changing the waveform shape as it moved. | Corrected harmonic phase progression. |
| The particle schematic's propagation speed changed incorrectly with frequency. | Temporal phase now scales with frequency alongside spatial phase. Caption explicitly distinguishes the sinusoidal particle schematic from the selectable waveform. |
| Rhythm accents changed frequency but not amplitude. | Accents now have greater amplitude as well as a distinct pitch; normal hits use 55% of accent gain. |
| Playback stayed marked Playing after a note ended. | Audio node completion now updates playback state and status. |
| Pressing Stop while audio activation was pending could subsequently start sound. | Added cancellation tokens and checked rapid Play/Stop behaviour. |
| Old scheduled rhythm cursor callbacks could affect a restarted sequence; Stop left an outline behind. | Callbacks are tied to the current run and Stop clears cursor outlines. |
| Editing a rhythm cell rebuilt the buttons and lost keyboard focus. | Focus returns to the edited cell. |
| Strike animation used an initial-displacement phase despite its initial-velocity model. | Strike displacement now uses sine time dependence. |
| Decay scheduling mixed target and ramp events without an explicit end-of-decay anchor. | Explicit exponential decay anchor followed by a short final fade; rendered audio verifies falling RMS and a silent tail. |
| No explanation when all harmonics were zero or all partials exceeded the playback frequency limit. | Added explicit silence status. |
| Continuous animation had no pause control or reduced-motion support. | Added animation pause/resume and respects the browser's reduced-motion preference. |
| Fixed canvas height distorted plots at different screen widths. | Set appropriate aspect ratios for the main plot and spectrum. |
| A default harmonic value did not align with its slider's step. | Rounded generated initial values to the available precision. |
| Air-column caption described a dashed baseline that was solid. | Corrected caption. |
| Rhythm bar labels inherited a low-contrast colour. | Set explicit readable text colour. |

## Validation performed

- Loaded all six modules from local files in headless Microsoft Edge.
- Exercised every range control at both endpoints and checked finite model values and valid form values.
- Checked layout overflow at 320, 390, 768, 1024 and 1400 pixels.
- Checked reduced-motion initial state, keyboard focus preservation, playback cancellation and Stop cleanup.
- Checked automatic completion for every non-looping module.
- Validated downloaded JSON contents, navigation links and labels for all range/select controls.
- Tested ideal string units, inverse length dependence and suppression of even modes by a centre pluck.
- Tested 64 combinations of tube type, length, temperature, hole position and resonance number against independent formula calculations.
- Tested 25 root notes × 13 intervals for equal-tempered frequency and correctly pitched musical spelling.
- Tested 48 rhythm metre/subdivision/swing combinations for pattern size.
- Rendered actual production synthesis into OfflineAudioContext for all five tonal modules; checked finite bounded samples, decreasing envelope RMS and silent tails.
- Analysed rendered sine, square, triangle and sawtooth signals at 240 Hz. Measured third-harmonic ratios were approximately 0, 1/3, 1/9 and 1/3 respectively; sawtooth second harmonic was 1/2. All tested ratios were within 0.0001 of expectation.
- Checked rhythm scheduling at 100 BPM and 75% swing: beat hits remained 0.6 seconds apart; accent and normal gains differed as intended. One initial wall-clock observation window returned too few scheduled events; a repeat completed. This check measures scheduled audio times, not physical speaker latency.
- Inspected full-page screenshots of all six modules and checked index category/search integration.

Raw evidence: `music-audit-results.json` and `music-audio-audit.json` beside this report.

## Remaining limitations and development opportunities

- Browser coverage is Edge on Windows. Safari, Firefox, mobile hardware and real audio-device output have not been tested. Audio was checked computationally, not through a human listening panel.
- Accessibility checks cover labels, keyboard editing, reduced motion and layout. This is not a full WCAG or screen-reader audit. Canvas charts do not yet expose a detailed data table as an alternative.
- Air Columns plays a selected ideal resonance. It does not simulate a jet, reed, realistic tone-hole impedance, bell, radiation or end corrections. Very high settings may exceed hearing or playback bandwidth; unsupported partials are omitted rather than aliased.
- Strings uses harmonic synthesis. Bow mode is sustained synthesis rather than stick-slip friction; body coupling, string stiffness and radiation are absent. Visual amplitude is normalised and is not a measured acoustic level. The modal animation is a continuous explanatory diagram, not a time-synchronised recording of each played note's decay.
- Timbre presets are deliberately approximate. They use a shared envelope rather than time-varying individual partial envelopes.
- Inside a Sound uses an explicitly labelled sinusoidal particle schematic. Its waveform and sound selector are linked, but the particle arrangement does not reproduce each selected complex waveform.
- Rhythm supports quarter-note-based metres, subdivisions and paired swing. It has no independent second rhythmic layer, so it is not yet a polyrhythm laboratory. Canvas positions are step positions rather than a proportional swung-time axis.
- Pitch theory covers twelve-tone equal temperament and upward intervals; no alternative tunings, key signatures or broader musical systems are included. The treble staff is text-labelled rather than using a conventional clef glyph.
- Changes stop existing audio; press Play to hear updated settings. The simulations do not provide continuously sounding parameter morphing.

## Reference checks

Ideal string modes and the limits of harmonic approximations were cross-checked against [UNSW: Strings, standing waves and harmonics](https://newt.phys.unsw.edu.au/jw/strings.html) and [UNSW: How harmonic are harmonics?](https://phys.unsw.edu.au/jw/harmonics.html). Interval spelling was checked against [Open Music Theory: Intervals](https://viva.pressbooks.pub/openmusictheory/chapter/intervals/).

## Rebuilding

The corrected authoritative source is `simulations-music/tools/music/music-runtime.js`, with content and page generation in `tools/music/build.py`. Run `python tools/music/build.py` from the pack root. The updated ZIP includes the corrections and audit evidence.
