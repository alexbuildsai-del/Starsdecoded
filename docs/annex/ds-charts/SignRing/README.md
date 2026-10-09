# Sign ring and degree ticks

The outer ring holds the twelve signs; the ticks sit just inside it. The ring is the one layer that is never off.

## Use it for / not for
- For: every chart; reading a planet's sign and degree; lighting a sign (at home teal, least at ease rose, "this one" brass).
- Not for: houses (`Houses/`); decoration (no glow, gradient or brass rim).

## How it is drawn
- Slices: 30° each, 0.386 S to 0.478 S. Fill #7E889A at 5% (odd houses) and 8.5% (even houses); edge same grey at 30%.
- Names: textPath at 0.4535 S, cut 1.5° short each end, centred; capitals; Space Grotesk 0.0225 S; letter spacing 0.0023 S; #A3ABBC. On the lower half the path runs the other way (`arcLabelPath`).
- Circles: inside edge of the ring (grey 28%), inner circle (grey 20%).
- Ticks: from 0.38 S inwards, every 5°: 0.008 S at 16%; every 30°: 0.02 S at 42%.
- Framing: rising degree at 9 o'clock, signs counter-clockwise from it. No birth time: Aries at 9 o'clock.

## States
- Full: names and ticks. Small (under 200 px): no names, no ticks, slices stay. No birth time: Aries at 9 o'clock. A sign lit: its slice filled at 42% while explained, 12% after.

## Do / Don't
- Do keep the ring grey; drop names under 200 px.
- Don't colour signs by element, add sign glyphs, start Aries at the top, or print quadrant names.

## What changes from today
| File | What goes | What stays |
|---|---|---|
| `components/chart/NatalWheel.tsx` | Brass band and edges; quadrant names (L195-221); framing at the start of the rising sign | Band geometry, textPath names, ticks |
| `site/components/HorizonWheel.tsx` | Brass rim (the landing page too) | Exact-degree framing, the −24° intro turn |
| `lib/build-story.ts`, `BuildStory.tsx` | Its own ring (158 / 138) and labels | The steps |
| `PairStory.tsx` | Indigo sectors with rotated words | The two-chart layout |
| `timeline/Dial.tsx` | Its own band (126–150 of 500) | Its tracks (gap, see `ChartStates/`) |
| `TriadPlate`, `SampleHead`, `TwoPlates`, `ReportHero` | Their own 12-tick brass rings | They become the Sun, Moon and rising state |
