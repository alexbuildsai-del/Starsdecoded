# The chart

The one natal chart. One function, one set of measurements (`wheelRadii(S)` in `web/src/components/chart/wheel-geometry.ts`), never drawn a second way.

## Use it for / not for
- For: every natal chart in the product, in a state (see `ChartStates/`).
- Not for: the Timeline age ring, the people orbit, the Ask mark (not charts).

## The parts (drawn in this order, back to front)
1. Sign ring: 12 slices of 30° between 0.386 S and 0.478 S, grey #7E889A at 5% / 8.5% taking turns by house, edges at 30%.
2. Sign names on a curved line at 0.4535 S, capitals, 0.0225 S, #A3ABBC; lower half flipped so none is upside down.
3. Houses: 12 slices from the ticks (0.38 S) to the inner circle (0.146 S), white at 1.2% / 2.6%.
4. House words at 0.411 S: `N · WORD`, 0.019 S, #E8EBF2 at 55%.
5. Two circles: ring inside edge (28%), inner circle (20%).
6. Degree ticks from 0.38 S inwards: every 5° (0.008 S, 16%), every 30° (0.02 S, 42%).
7. Lines between planets inside the inner circle (Full only).
8. Horizon: 9 o'clock to 3 o'clock, from the inner circle to 0.398 S.
9. Rising marker on the outer edge at 9 o'clock.
10. Planets on three lanes (0.324, 0.266, 0.208 S), renders 0.05 S wide; R for going backwards.

Framing: longitude l is drawn at 180° + (l − rising degree), counter-clockwise from 3 o'clock. The rising degree is always at 9 o'clock. With no birth time, Aries 0° is at 9 o'clock.

## Build order (every animation)
1. Sign slices one by one from Aries, counter-clockwise (Aries at 9 o'clock).
2. Names, circles, ticks fade in.
3. Planets run from 0° Aries to their degrees along their lanes.
4. Lines draw in, strongest first.
5. The birth time turns the whole sky until the rising degree is at 9 o'clock.
6. Horizon draws; the rising marker drops in.
7. Houses light in opposite pairs (1 and 7 … 6 and 12); each word stays.
Preview timings: `BUILD` in `chart.js`. The loading story uses its own times (`Loading/`).

## Do / Don't
- Do take every size from `wheelRadii(S)`; draw in motion only in the build order; use engine data.
- Don't draw a second chart, an MC line, a brass frame, dots for planets, or a made-up placement.

## What changes from today
| File | What goes | What stays |
|---|---|---|
| `components/chart/wheel-geometry.ts` | Nothing | All of it |
| `components/chart/NatalWheel.tsx` | Brass rim and band; quadrant names; MC, IC, DSC lines and ASC/MC labels; leader line and tick dot under planets; framing at the start of the rising sign; brass points | Houses as buttons, keys, hover chip, skip link, `stops=false`, blind chart at 0° Aries, aspect drawing |
| `site/components/HorizonWheel.tsx` | MC/IC/DSC lines and MC label; brass frame; missing points | Its motion (intro, rewind, landing) |
| New `Chart` component | — | NatalWheel and HorizonWheel merge into it with a `state` prop; the other drawings switch to it (`EveryChart/`) |
