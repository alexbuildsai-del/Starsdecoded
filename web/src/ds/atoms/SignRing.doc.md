# SignRing

The outer ring of the twelve signs, with its degree ticks, drawn on `wheelRadii(size)` and each slice at `theta(longitude, asc)`. Grey, never by element, never glow or brass rim.

- `SignRing { size, asc, names?, ticks?, innerCircle?, lit? }` is a group; the caller owns the svg. `asc` is the rising degree, 0 with no birth time (Aries at 9 o'clock).
- Slices `muted` at 5% / 8.5% by turns, edge 30%; names `paper-dim`, Space Grotesk; ticks every 5 degrees (16%) and 30 (42%). Under 200 px names and ticks go, slices stay.
- `lit`: teal at home, rose least at ease, brass "this one"; 42% while explained, 12% after.
- Replaces the sign band in `components/chart/NatalWheel.tsx` and the 12-tick rings of `TriadPlate`, `SampleHead`, `TwoPlates`, `ReportHero`; later cards switch their imports.
- Name colour is the artifact's #A3ABBC; no token is that close, so it takes `paper-dim`.
