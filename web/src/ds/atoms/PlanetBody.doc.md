# PlanetBody

A planet's render: the picture of the body, sitting at its true degree. Never UI, never decoration (MASTERFILE §9).

- `PlanetBody { body, size }` in flow (a Chip's icon slot). `PlanetBodyMark { body, size, x, y, disc?, retrograde? }` inside a chart's svg.
- The render comes from `lib/planet-renders.ts` (192 px, so up to 90 px; a Sun up to 512 px uses the hero source). Chiron and the nodes are drawn points: grey edge, paper-dim sign, never brass.
- The backing disc is `ground` at 92%, 0.62 of the width (0.48 for the Sun). "R" is Plex Mono in `back`, off in Pair and Small.
- Replaces `BodyMark` in `components/chart/NatalWheel.tsx` (brass points, brass sign) and the inline `<image>` bodies of `TriadPlate.tsx`.
