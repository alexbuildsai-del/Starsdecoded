# Chart states

We never draw a new chart. Every screen picks a state; a state switches layers, dims, rings or lights. Anything no state gives is decided in an ideation first.

| Layer | Full | Focus | Sun, Moon and rising | Small | Pair | Teach | Build | No birth time | Live sky |
|---|---|---|---|---|---|---|---|---|---|
| Sign slices | ● | ● | ● | ● | ● | ● | ● | ● | ● |
| Sign names | ● | ● | ≥200 px | ○ | ≥150 px | ● | ● | ● | ● |
| Ticks | ● | ● | ○ | ○ | ≥150 px | ○ | ● | ● | ● |
| Houses / words | ● | ● | ○ | ● / ○ | ○ | ◐ | ● | ○ | ● |
| Planets | ● | ● (dimmed) | Sun, Moon | ◐ | ● (dimmed) | ◐ | ● | ● | ● |
| Chiron, nodes | ● | ◐ | ○ | ○ | ○ | ○ | ● | ● | ● |
| R | ● | ◐ | ○ | ○ | ○ | ○ | ● | ● | ● |
| Lines | ● | own only | ○ | ○ | ○ | ○ | ● | no Moon | ● |
| Horizon, marker | ● | ● | ● | ● | ○ | ◐ | ● | ○ | ● |
| Lit (brass) | ○ | ● | ○ | ● | link | ● | ○ | ○ | ○ |
| Guest | ○ | ○ | ○ | ○ | ● | ○ | ○ | ○ | ○ |

## Where each is used
- **Full**: House by House desktop before a pick, /sample, home claims before one lights, /sky and the hero (Live sky).
- **Focus**: the house being read, a planet's chapter header, a claim's citations, Read the wheel, a placements row.
- **Sun, Moon and rising**: the report's opening plate, dashboard sky card (104 px), sample head, two plates on one horizon, Learn: birth time plates, Did you know (east on the left).
- **Small** (under 200 px): House by House phone bar (92 px), Did you know (emptiest house).
- **Pair**: the compatibility walk (132 px phone, 186 px desktop), the two charts on that page.
- **Teach**: the House by House primer, /learn/houses, Did you know.
- **Build**: report and pair loading, the landing page's first appearance.
- **No birth time**: changes any state. No houses, horizon, marker; Aries at 9 o'clock; the Moon's stretch (engine band); its lines left out.
- **Live sky**: Full for the sky now over the visitor's time-zone city (London if unknown). The landing motion stays.

## Not covered yet (decide in an ideation)
- Timeline dial (`components/timeline/Dial.tsx`): how this chart sits inside and how the outer tracks and contact lines go on it.
- Share image (`ShareCard.tsx`): words only today, on purpose. Whether it carries Sun, Moon and rising.
- Print / PDF (`window.print()`): a light colour set for Full on white.
- Not charts, unchanged: AgeRing, Orbit, AskMark.

## What changes from today
Each screen's file, what goes and what stays: `EveryChart/`.
