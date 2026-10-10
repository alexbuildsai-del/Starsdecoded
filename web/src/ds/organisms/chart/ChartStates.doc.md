# Chart states

Level: organism (the Chart's states). We never draw a new chart: a screen picks a state, and a state switches layers, dims, rings or lights. `states.ts` holds the table cell for cell (`STATE_LAYERS`); `buildScene` reads it.

## What it replaces

Every screen's own way of drawing a chart (EveryChart).

## Use it for

- Full: House by House before a pick, /sample, home claims before one lights.
- Focus: the house being read, a planet's chapter header, a claim's citations, Read the wheel, a placements row.
- Sun, Moon and rising: the opening plate, the dashboard sky card (104 px), sample head, two plates on one horizon, Did you know.
- Small (under 200 px): the House by House phone bar (92 px), Did you know's emptiest house.
- Pair: the compatibility walk (132 px phone, 186 px desktop).
- Teach: the House by House primer, /learn/houses, Did you know.
- Build: report and pair loading, the landing page's first appearance; it ends in Full.
- No birth time: no houses, horizon or marker, Aries at 9 o'clock, the Moon's stretch, its lines left out. It also changes any state when the chart has no birth time.
- Live sky: Full for the sky now over the visitor's time-zone city (London if unknown).

## Not for

- Anything the table does not give: that is decided in an ideation first.

## Versions

The layers, back to front: sign slices, sign names, ticks, houses, house words, planets, Chiron and nodes, R, lines, horizon, rising marker, lit, guest. A cell is on, off, some, or on from a size (names from 200 px in Sun, Moon and rising; names and ticks from 150 px in Pair).

## States

- Small's "some" planets are the ten, with no points and no R.
- Sun, Moon and rising's are the Sun and the Moon; Teach's are the ones its idea names (`only`).
- A state keeps the chart's framing: a chart with a birth time drawn in No birth time keeps its rising sign at 9 o'clock, so a body's angle never moves between states.

## Access

Every state keeps its name and, where the screen lets the chart be touched, its stops (Chart).

## Do and don't

- Do take the state the screen's row names.
- Don't light two things in brass, or add a layer a state does not list.
