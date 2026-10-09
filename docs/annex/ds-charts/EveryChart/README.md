# Every chart today

Every place the product draws a chart today, and the state that replaces it. Found with `wheelRadii|NatalWheel|renderFor|<svg` on 2026-10-09; the planner searches again before building.

| Screen | File today | State after | Goes | Stays |
|---|---|---|---|---|
| Your chart, House by House (desktop), /sample | `chart/NatalWheel.tsx` via `HouseDeck.tsx` | Full, then Focus | Brass frame, quadrant names, axis lines and labels, leaders, brass points | Buttons, keys, chip, skip link, renders, R, lines |
| House by House phone bar | `HouseDeck.tsx` L204-238 (92 px NatalWheel) | Small | — | Bar, deck, swipe, nudge |
| Opening plate | `report/ReportHero.tsx` (hero-layout.ts) | Sun, Moon and rising (large) | Own ring, ticks, marker | Sun glow, parallax, EAST/WEST, print header, Add-my-birth-time |
| Closing | `report/DawnClosing.tsx` | Not a chart | — | All |
| Two charts ledger | `report/TwoChartsLedger.tsx` | Not a chart | Brass-edged points | Glyphs |
| Compatibility: the two charts | `pages/CompatibilityReportPage.tsx` L202 | Pair | Name in the middle | Two charts |
| Report loading | `report/BuildStory.tsx`, `lib/build-story.ts` | Build | Rings, dots, veil, MC, indigo | Steps, timings, words, globe, clock |
| Pair loading | `report/PairStory.tsx`, `lib/pair-story.ts` | Build (Pair sizes) | Sectors, circles, violet, gradient | Steps, timings, words, one horizon |
| Did you know | `loading/DidYouKnow.tsx` | Small (two chart thumbnails) | Brass-edged points | Timing; Dial, ruler, age ring |
| Timeline dial | `timeline/Dial.tsx`, `lib/dial.ts` | **Gap** | — | Tracks, Play, keys |
| Age ring | `timeline/AgeRing.tsx` | Not a chart | — | All |
| Dashboard sky card | `dashboard/CardSections.tsx` → `TriadPlate.tsx` | Sun, Moon and rising (Small) | Own ring, dashed horizon, glyph | TriadRow |
| People orbit | `dashboard/Orbit.tsx` | Not a chart | — | All |
| Ask mark | `ask/AskMark.tsx` | Not a chart | — | All |
| Home hero, sky screen, /sky | `site/components/HorizonWheel.tsx` | Live sky (Full) | Brass frame, MC/IC/DSC, missing points | All its motion, HUD, EAST/WEST |
| Home claims | `site/sections/Claims.tsx` | Focus | Its colours, violet | Claims, dwell, rewind, brass rings |
| Two plates (home, /compatibility) | `site/components/TwoPlates.tsx` | Sun, Moon and rising, twice, one horizon | Gradient, violet, own plates | One horizon, the glide |
| Sample head | `site/components/SampleHead.tsx` | Sun, Moon and rising | Ring, dashed horizon, glyph | Words, TriadRow |
| /learn/houses | `site/components/HouseRing.tsx`, `chart/HouseObject.tsx` | Teach (loops 1, 2) | Own ring and marker; icons leave the chart | The idea; icons as decoration |
| /learn/birth-time | `site/pages/LearnBirthTimePage.tsx` | Live sky; Sun, Moon and rising | Plates' own drawing | Slider |
| /sky: read the wheel, placements | `site/components/ReadTheWheel.tsx`, `Placements.tsx` | Focus | Through HorizonWheel | Table, layer buttons |
| Share image | `report/ShareCard.tsx` | **Gap** | — | All (words only, on purpose) |
| Print / PDF | `window.print()`, `index.css` L665-687 | **Gap**: Full on white needs print colours | — | Print-only text and tables |
