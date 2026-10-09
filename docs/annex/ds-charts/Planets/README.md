# Planets

Each planet is its render, the same picture everywhere. Chiron and the nodes are drawn points. A planet sits at its true degree; when planets crowd, one steps in a lane, never off its degree.

## Use it for / not for
- For: where each planet stood; pointing at one planet (Focus); the guest from another chart (Pair).
- Not for: dots or letters; renders over 90 px (`MAX_RENDER_PX`; a big Sun uses `SUN_HERO` outside the chart).

## How it is drawn
- Render: 192 px WebP from `lib/planet-renders.ts` (`renderFor(body, px)`), a square 0.05 S wide, centred on its degree on its lane.
- Backing disc: page background at 92%, radius 0.62 of the width (0.48 for the Sun).
- Drawn point (Chiron ⚷, North Node ☊, South Node ☋): disc 0.42 of the width, fill #0B0F16, edge #7E889A 0.8; sign at 0.5 of the width in #A3ABBC.
- Lanes 0.324 / 0.266 / 0.208 S. In order round from the rising degree, each takes the outer lane if the angle since the last planet there is at least (width + 0.01 S) / lane radius; otherwise the next lane in (`assignLanes`).
- Going backwards: "R", mono, 0.019 S, #E24D4D, at (+0.46, −0.32) of the width. Off in Pair and Small.
- Tooltip: `Jupiter · 5°02′ Libra · 4th (home) · going backwards`.
- Teaching draws planets at 1.25 times (`nodeK`).

## Do / Don't
- Do use the renders; draw points grey; give every planet a tooltip.
- Don't move a planet off its degree, draw points in brass, or add a leader line or tick dot.

## What changes from today
| File | What goes | What stays |
|---|---|---|
| `NatalWheel.tsx` BodyMark | Brass points; leader line and tick dot (L409-423) | Render, disc, R, hover chip |
| `HorizonWheel.tsx` | Nothing drawn for Chiron and nodes (adds the grey points) | Renders, lanes, R, rewind trails |
| `BuildStory.tsx` | Dots (r 4.2 / 3.2) with labels; orbit radii 22 + i·7.6 | The run to their degrees, on lanes with renders |
| `PairStory.tsx` | Paper circles | Two charts side by side |
| `TwoChartsLedger.tsx`, `DidYouKnow.tsx` | Brass-edged points | Renders at 26 / 20 px |
| `ReportHero`, `TriadPlate`, `SampleHead`, `TwoPlates` | Own Sun and Moon sizes and places | Sun and Moon at their degrees on the lanes; the hero's Sun glow outside the chart |
