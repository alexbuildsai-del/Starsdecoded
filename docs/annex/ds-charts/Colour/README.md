# Colour and highlighting

The chart is grey. Colour is added only to say something. At most three colours on a screen: the chapter colour, one content colour, the greys.

## The colours
| Colour | Hex | Means | On the chart |
|---|---|---|---|
| Background | #0D1117 | page | behind the chart, backing discs |
| Frame grey | #7E889A | frame | slices, edges, circles, ticks, points |
| Text grey | #A3ABBC | labels | sign names, degrees, arcs |
| Ink | #E8EBF2 | horizon | house words (55%), horizon, marker |
| Brass | #D4B06A | lit | lit house, ringed planet, lit marker, joined line, touch dot |
| Teal | #3FA796 | comes naturally | at-home sign, easy link |
| Rose | #D9668A | challenge | least-at-ease sign, link that rubs |
| Blue / red | #3BB3DB / #E24D4D | easy / tense line | Full state lines; red also the R |
| Chapter | #5C6BC0 | where you are | never on the chart |

Teal and rose never share a screen with blue and red.

## Six ways to point at something
1. Dim the rest: other planets to 14%.
2. Ring one planet: brass, radius 0.72 of its width, 0.005 S thick.
3. Light a house: brass 22%, its word 100%, others 30%.
4. Light a sign: teal or rose in its slice, 42% while explained, 12% after.
5. Bring it to the middle: the planet at 0.15 S in the centre with its name, then it moves back to its place (teaching only).
6. A guest from another chart: half size, 55%, dashed ring.

## Animation: Venus at home or least at ease (12 s)
Venus in the middle → Taurus and Libra teal ("at home") → Scorpio and Aries rose ("least at ease") → Venus moves to Thibault's Venus in Aries, Aries stays rose. Signs from `packages/engine/src/comfort.ts`.

## Do / Don't
- Do count colours on the whole screen; one brass thing at a time.
- Don't give people, elements or planets their own colours; no second purple; no brass frame.

## What changes from today
| File | What goes | What stays |
|---|---|---|
| `NatalWheel.tsx`, `HorizonWheel.tsx` | Brass rim and band; indigo focus ring on the chart (to brass) | Indigo keyboard focus on buttons |
| `PairStory.tsx`, `TwoPlates.tsx`, `lib/build-story.ts` | Violet points and glows, indigo sectors, brass gradients | — |
| `Claims.tsx` | #63A8C4, #7FB08B, violet | Brass rings on what a claim cites |
| `lib/charts-meet.ts` | Nothing | TEAL, ROSE |
| `HousePrimer.tsx` | Nothing | The COMFORT table in words |
