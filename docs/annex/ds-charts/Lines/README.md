# Lines between planets

When two planets are at set angles, a line joins them inside the inner circle ("how the planets face each other"). The engine's list, never a second one.

## Use it for / not for
- For: the Full state; the loading story's "How the planets face each other".
- Not for: links between two people (`TwoCharts/`); teaching one angle (Teaching loop 5); Chiron and the nodes.

## How it is drawn
- Pairs: the ten planets, each pair once, within the orb: conjunction 0° ±8, sextile 60° ±4, square 90° ±6, trine 120° ±6, opposition 180° ±8 (`calcAspects`, `ASPECT_ORBS`).
- From each planet's degree on the inner circle (0.146 S), straight.
- Colour: joined brass #D4B06A; easy (60, 120) #3BB3DB; tense (90, 180) #E24D4D.
- Strength s = 1 − orb ÷ limit; width (0.6 + 1.2 s) × S/600; opacity 0.18 + 0.42 s.
- Dashed (3, 4 × S/600) when parting (the engine's `applying` is false); solid when closing in.
- In Focus, the subject's own lines stay; the rest go to 10%.

## Do / Don't
- Do take the engine's list; draw strongest first; fade the others in Focus.
- Don't draw lines in Pair or Small; with no birth time leave out the Moon's lines; no arrows or labels; no teal or rose.

## What changes from today
| File | What goes | What stays |
|---|---|---|
| `NatalWheel.tsx` | Nothing (L331-349 match) | Colours, strength, dashes |
| `HorizonWheel.tsx` | Nothing | Orbs from the engine |
| `lib/build-story.ts` | Dashed paper lines without conjunctions | Moon's lines left out without a birth time |
| `site/sections/Claims.tsx` | Cited line #63A8C4, width 2.4 | The cited line becomes Focus |
