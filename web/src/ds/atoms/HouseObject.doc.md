# HouseObject

Level: atom. The twelve house objects (ADR-321), one line drawing per house on a 32-unit grid, in `indigo-lt`.

## What it replaces

`components/chart/HouseObject.tsx`, deleted at R20's sweep.

## Use it for

- Decoration beside a house's word, as on /learn/houses.

## Not for

- A chart or the loading story (ChartStates takes it out of both); never brass, no prop recolours it.

## Versions

`HouseObject { house, size?, className? }`; any house outside 1 to 12 draws nothing.

## Access

Hidden from screen readers: its house's word or object name always sits beside it.
