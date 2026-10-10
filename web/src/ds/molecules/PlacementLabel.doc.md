# PlacementLabel

## Level
Molecule.

## Replaces
O22: the hand-made hover tooltip on the home wheel, /sky, the full-screen chart and the Learn pages. It also stands for the planet lines in the chart page, the sky table, the Timeline reading and the house card's planet row.

## Use it for
- Hover, focus or tap on a planet in any chart (`variant="label"`).
- Planet lists (`variant="row"`).

## Not for
- A glyph in place of the render. The body is the PlanetBody.
- A house number without the house.

## Versions
- Label: a pill on `raised`, with a `line-strong` edge and the raised shadow.
- Row: a 44 px line in a list, the same order.

The order is always: render, name, degree and sign in mono, then the house, as in "Mercury · 0°19′ · Gemini · 5th house". A house word can follow in brackets.

## States
- On a chart.
- A row in a list.
- Going backwards: the R badge follows the name.
- No birth time: the house is not shown and the line says "needs a birth time".

## Access
- Degrees are in Plex Mono, 12 px, `paper` or `paper-dim` on `raised`.
- The label is for sighted hover; the planet it names keeps its own accessible name.
- A row is 44 px tall.

## Do and don't
- Do compute the degree from the chart; never type one.
- Don't show a house for a chart without a birth time.
