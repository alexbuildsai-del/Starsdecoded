# Chart

Level: organism. The one natal chart: `buildScene(chart, state, size)` says what is drawn where, `<Chart>` paints it. Every size comes from `wheelRadii(size)` and every body sits at `theta(longitude)` from `components/chart/wheel-geometry.ts`, in every state.

## What it replaces

`components/chart/NatalWheel.tsx` (now `NatalWheel` here, its props mapped onto a state) and, as group 3 moves them, every other drawing in EveryChart.

## Use it for

- Every natal chart in the product, in one of the nine states (ChartStates).

## Not for

- The Timeline age ring, the people orbit, the Ask mark: not charts.
- The Timeline dial, the share image and print: gaps, decided in an ideation first.

## Versions

- `<Chart chart state size fluid? stops? onPickHouse? focus? only? signs? guest? orbs? label? />`. `size` is the plate in pixels and decides which layers draw; `fluid` fills the parent's width.
- `children` draw over the chart in the plate's units, for a page's own marks.
- Framing (decided at group 1): whole sign, the rising sign's start at 9 o'clock, the horizon through the rising degree. With no birth time, Aries at 9 o'clock.

## States

The nine of ChartStates. Interactive Full (with `stops`): a planet pointed at by hover or focus gets a brass ring at 0.72 of its width and a chip (`<Planet> · <deg>°<min>′ <Sign> · <nth> (<word>)`, mono, on `raised` with a `line` edge), above it on the top half, below on the bottom half; nothing dims. A focused house shows a 1.5 px brass outline. Enter, Space or a click picks a house.

## Access

- With `stops`: a group whose houses and planets are buttons, and a "Skip past the chart wheel" link shown on focus. Without: one image with its name.
- Accessible names keep today's words: "Natal chart wheel", ", horizon not drawn", "House <n>, <Sign>", "<Planet> <degree> degrees <Sign>, house <n>".

## Do and don't

- Do pick a state; do take every size from `wheelRadii`; do use engine data only.
- Don't draw a second chart, an MC line, a brass frame, dots for planets, or move a body off its degree.
- Colours: only `line-easy`, `line-tense`, `back`, `rose`, `teal`, `brass` and the neutrals (`check:ds`).
