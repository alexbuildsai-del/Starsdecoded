# Houses

Twelve parts of life. Whole sign: each house is one whole sign, and house 1 is the rising sign. A house is the same 30° slice as its sign, drawn inside the ticks.

## Use it for / not for
- For: "your Venus (10th, career)"; lighting the house being read (House by House); teaching how houses count.
- Not for: a chart without a birth time (draw none); pictures of rooms (HouseObject leaves the chart).

## How it is drawn
- Slices from 0.38 S to 0.146 S, lined up with the signs; white at 1.2% (odd) / 2.6% (even).
- Word on a curved line at 0.411 S: `N · WORD` (self, money, mind, home, play, work, partnership, depth, belief, career, friends, solitude), capitals, 0.019 S, #E8EBF2 at 55%.
- House 1 = the sign on the rising degree; counting goes counter-clockwise; 7 is across from 1.
- Lit: slice brass #D4B06A at 14–22%; its word at 100%, the others at 30% while one is being read.

## Animations
- Your houses start at your rising sign: the sky turns 150° into place under the flat horizon, then houses count 1 to 12 (8 s loop).
- Each house is one part of life: one lit at a time, word in the middle, what it covers in the caption (1.5 s each).
- Loading: opposite pairs light together (`Loading/`).

## Do / Don't
- Do say a house as number and word; light one house at a time.
- Don't draw cusps at other degrees, light two houses in brass unless a pair is taught, or draw houses without a birth time.

## What changes from today
| File | What goes | What stays |
|---|---|---|
| `components/report/HouseDeck.tsx` | Nothing of its own | Sticky chart and card (desktop); 92 px chart with the lit house (phone); nudge; swipe |
| `components/chart/NatalWheel.tsx` | Its own highlight colour (lit is brass 22%) | Houses as buttons, keys |
| `components/chart/HouseObject.tsx` | Out of the chart and the loading story | Icons on /learn/houses as text decoration |
| `site/components/HouseRing.tsx` | Its own labels and marker | The idea; it becomes the first loop |
| `lib/build-story.ts` | HOUSES_IN 116, indigo fills | The houses step |
