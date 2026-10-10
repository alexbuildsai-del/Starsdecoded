# TriadRing

The Sun, Moon and rising state of the chart: the sign ring (no ticks, names from 200 px), the Sun and Moon at `theta(longitude)` on the lanes, the horizon and the rising marker.

- `TriadRing { chart, name, size, className? }`. The accessible name keeps today's words.
- With no birth time: Aries at 9 o'clock, no horizon or marker, and the Moon's stretch (the engine's band) as an arc on its lane.
- Crowding moves a body in a lane (`assignLanes`), never off its degree. Bodies are `max(0.05 S, 16)` wide.
- Replaces the rings of `report/TriadPlate.tsx`, `site/components/SampleHead.tsx`, `site/components/TwoPlates.tsx` and the ring in `report/ReportHero.tsx`.
