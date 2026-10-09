# Two charts: the link

One planet of one person at an angle to one planet of the other, drawn on both charts at once (Pair state).

## Use it for / not for
- For: the compatibility walk, one link per card, beside the live LinkCard.
- Not for: lines inside one chart (`Lines/`); all links at once (the ledger glyphs).

## How it is drawn (on each chart)
1. Own planet at full strength, ringed solid in ink (0.72 of its width); the chart's other planets at 14%.
2. Guest: the other's planet at its true degree on lane 1, half size, 55%, dashed ink ring (3 3), radius 0.72 of a full width.
3. Ticks in to the inner circle (0.146 S): own solid, guest dashed (2 3), both 50%.
4. The whole shape, faint: triangle (trine), square, hexagon (sextile), from the own planet; content colour 6% fill, 38% edge.
5. The side: the chord on the inner circle. Teal straight (easy), rose zigzag (rubs). Same spot: a brass dot, no chord.
6. The angle: a small grey arc near the middle; degrees in the centre, mono grey.
Sizes: 132 px phone, 186 px desktop; names and ticks only at 150 px and up; no horizon, no R, no lines.

## The walk's order
By the pair doctrine: groups by the faster planet of the pair (Sun, Moon, Venus, Mars, Mercury, Jupiter, Saturn, then the outer planets), closest first within a group.

## Do / Don't
- Do mirror the link on both charts; use LinkCard's tag and colour (teal "Comes naturally", rose "Challenge").
- Don't give each person a colour (ink for both; solid yours, dashed theirs), draw the horizon or R, or show two links at once.

## What changes from today
| File | What goes | What stays |
|---|---|---|
| `pages/CompatibilityReportPage.tsx` | Two standalone NatalWheels with a name in the middle as the main picture (L202) | The page; the walk adds Pair beside each LinkCard |
| `LinkCard.tsx`, `lib/charts-meet.ts` | Nothing | MEET_TAGS, MEET_COLOURS, Try together |
| `TwoChartsLedger.tsx` | Brass-edged points (to grey) | The glyphs (`ledger.ts` L81) |
