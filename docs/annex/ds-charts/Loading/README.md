# The loading story

While the report is written, the reader watches their chart being made, in the build order (`Chart/`). Steps, timings and words stay as they are; only the drawing changes.

## Your report (`STORY_STEPS_S` [0, 4.5, 9.5, 14.5, 20])
| From | Title | The chart |
|---|---|---|
| 0 s | Where you were born | No chart; the globe (stays) |
| 4.5 s | The sky on your birth day · Where each planet stood · How the planets face each other | Ring with Aries at 9 o'clock; names, ticks; planets run from 0° Aries along their lanes; lines, strongest first |
| 9.5 s | Your birth time sets the horizon | The chart turns until the rising degree is at 9 o'clock; horizon; marker drops in |
| 14.5 s | Your houses, two at a time | Opposite pairs light in brass (`PAIR_S` 7 s each); words stay |
| 20 s | Now writing your report | Rests in Full until Start reading |

No birth time: step 3 "No birth time, so no horizon" (nothing turns; the Moon's stretch draws in); step 4 "No birth time, so no houses"; the Moon's lines left out.

## A compatibility report (`PAIR_STEPS_S` [0, 13, 17, 24, 30, 96])
| From | Title | The charts (Pair sizes) |
|---|---|---|
| 0 s | Where you were born | The globe with both places |
| 13 s | The sky when {older} was born | The older person's chart builds |
| 17 s | (the younger's birth) | The second chart builds beside it |
| 24 s | Each chart turns to its rising sign. One horizon runs through both. | Both turn; one horizon through both centres |
| 30 s | Reading your houses, side by side | One house at a time on both (`HOUSE_S` 5.5 s) |

## Do / Don't
- Do draw with the chart's build; use the reader's chart; keep the reduced-motion step list.
- Don't use dots, a veil, violet glows, indigo fills or house pictures; don't change words or timings here.

## What changes from today
| File | What goes | What stays |
|---|---|---|
| `lib/build-story.ts` | Rings 158/138/116/102, CROWD_STEP, orbit radii, dashed paper lines, brass ASC and MC, veil, indigo houses | STORY_STEPS_S, PAIR_S, STORY_END_S, words, globe, clock, the Moon's stretch |
| `components/report/BuildStory.tsx` | Dots and their labels | StoryClock, step list, DidYouKnow at step 5 without a birth time |
| `lib/pair-story.ts`, `PairStory.tsx` | Indigo sectors, paper circles, violet point, brass gradient | PAIR_STEPS_S, HOUSE_S, words, one horizon |
| `components/loading/DidYouKnow.tsx` | Nothing in timing | Chart thumbnails become Small |
