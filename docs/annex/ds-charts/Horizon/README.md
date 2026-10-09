# Horizon and rising marker

The flat line across the chart (left east, right west) and the marker on the rising degree. Both need a birth time.

## Use it for / not for
- For: every chart with a birth time, every state except Pair; teaching why the birth time matters.
- Not for: the MC (no MC line, label or marker anywhere); a chart without a birth time.

## How it is drawn
- Line from the inner circle (0.146 S) to 0.398 S (0.386 + 0.012) each side. East (left): 1.5 × S/600 wide, #E8EBF2 at 45%. West (right): 1 × S/600 at 25%. Never through the middle.
- Marker on the outer edge (0.478 S) at 9 o'clock: ring radius max(3 px, 0.0142 S), filled with the background, edge #E8EBF2 max(1.2, 0.003 S); dot at 35% of the radius; tail 0.02 S to the left.
- Lit: marker in brass only while the report talks about the rising sign (with house 1 lit).

## Animation
- The birth time turns the sky: Thibault's birth day every two hours, from the engine; the chart turns under the flat horizon (1.4 s a step).

## Do / Don't
- Do keep the horizon flat and the rising degree at 9 o'clock; with no birth time, say so and draw the Moon's stretch.
- Don't draw MC, IC or DSC lines, write "ASC", dash the horizon or shade below it.

## What changes from today
| File | What goes | What stays |
|---|---|---|
| `NatalWheel.tsx` | ASC/MC/DSC/IC lines and labels (L150-156, L378-406); the marker comes in | No axes without a birth time |
| `HorizonWheel.tsx` | MC line and label, IC/DSC; brass marker (white, brass when lit) | EAST · RISING / WEST · SETTING words in HTML |
| `ReportHero`, `TriadPlate`, `SampleHead`, `TwoPlates` | AngleGlyphShape markers; dashed horizons; TwoPlates' brass gradient and violet point | One shared horizon through two charts |
| `lib/build-story.ts`, `PairStory.tsx` | Brass ASC and MC markers; the veil; violet glow | The horizon step |
| `TriadRow.tsx` | Nothing | AngleGlyph as the Rising icon |
