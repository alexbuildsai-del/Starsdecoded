# Timeline: Your year (the year map)

Draft 2026-10-06 from `/ideate timeline-year-map`. The Owner: a user found the interactive Life view "too much… overwhelming";
"can we do something cooler that still depicts the main point": big transits last weeks, peak on a few days, and a reader
needs to see which days ("I might have a launch prepared for 3rd of March 2028, but… my Saturn return is peaking that week").
Artifact (live, Mira's real transits 2026 to 2030): https://claude.ai/artifact/9Qb9dcXt2Np8MptmCeUT1M
Touches the locked `timeline` (Life's waves, screen 3; the in-app dial, screen 4) and `review-05-10` §4 (the waves'
drag handle, not built yet). Keeps `review-05-10` §3 (Your week as bars) and the cycle cards as locked.
**Brain:** `packages/engine` (house changes join the doctrine). The dry lab runs in the round.

## Scope

### The map (screen 1)
- **One square per day, months as rows, days 1 to 31 as columns**, so a date is easy to find. The year switch steps
  ‹ 2028 › from the reader's birth year to the year they turn 90; it opens on this year with today outlined.
- **A square shows the day's closest transit** (`inEffect` for the reader's day, then the contact nearest exact):
  - colour: its tone, with yesterday's words and legend (Heavy rose, Mixed grey, Light teal; "Heavy: asks more of you.
    Mixed: has its ups and downs. Light: goes your way.");
  - brightness: how close to exact, `(1 - distance / orb)^4`, so a long transit glows on its peak days and stays dim between;
  - a brass dot on an exact day; a brass ring on an eclipse within 3° of a natal point;
  - a dashed line under the days a planet goes backwards (Mercury, Venus, Mars), its glyph and R at the start;
  - a brass marker on the day Jupiter, Saturn, Uranus, Neptune or Pluto moves into a new house;
  - a past day dimmed; no contact, an empty square.
- **Never a score** (`tone.ts`, reading 17): nothing adds days up, ranks them or names a "best" day.
- **Flat or Skyline**, one switch. Skyline swings the camera to the corner and raises each square to its closeness,
  in a wave from January to December (1.3 s, the site's one easing). Drag to turn it, double-tap to reset.
  Built from the ContributionSkyline component the Owner sent (its camera, morph, painter's order and hit tests),
  reshaped for months and days, in the site's colours and fonts. Opening view: question 2.
- **Hover** (desktop): "3 Mar · Jupiter opposite your Sun · 0.55° from exact". **Tap or arrow keys** pick a day.

### Check a date
- "Got a date in mind? Check it": one typed field, DD/MM/YYYY (R14's `BirthDateField` pattern), Check. It jumps to the
  year and picks the day. Inline errors: a wrong format, a date that doesn't exist, a date outside birth to 90.
- It answers with the sky only (R-5.2): what is close that day and how long it lasts. It never says a day is good or
  bad for a plan. The panel ends: "Dates for the sky, never for your life. What you plan on them is up to you."

### The picked day (panel under the map, beside it from 880 px)
- The date in full, then one row per transit in effect, closest first: tone word, headline, "Jupiter opposite your
  Sun · 12th house · 0.55° from exact", **a bar from its start to its end** with the exact passes as brass ticks and
  the day as a needle, the start and end dates with years, and "Exact 4 days later, on 7 Mar 2028. 3 exact passes in all."
- Then a retrograde in effect ("Venus goes backwards from 10 May to 22 Jun 2028, through your 3rd house"), a house
  change within 30 days ("Saturn moves into your 2nd house on 13 Apr 2028, 41 days later"), an eclipse on a point
  within 7 days. A quiet day says so in one line.
- Tapping a row opens its reading sheet, as today (written at setup, `review-05-10` §5).

### Exact days in the year (list beside the map)
- Every exact pass of Jupiter to Pluto and every eclipse on a point in the shown year, in date order: date, headline,
  the contact in small grey, tone. Tap: the map picks that day. Mars's exact days fold under "Short ones: Mars, a
  few days each". Mars stays on the map.

### Where it goes (screen 2, answer to question 1 at its default)
- Timeline, top to bottom: **Your week** (bars, as locked 5 Oct), **Your year** (this map), **Your cycles** (the cards,
  as locked, each with "See it on the map", which opens its year on its first exact day).
- **Goes:** Life's waves graph (and the drag handle `review-05-10` §4 added, not built), and the dial with its range
  and slider inside the Timeline app. The phone's two tabs become one page.
- **Stays:** the dial on `/timeline`'s hero, on the set-up screen and on the dashboard's Your week beside the bars (desktop).

### The engine and the API
- **The doctrine gains house changes** (Decided by Claude, astrology call): Jupiter to Pluto entering a sign, which is a
  whole-sign house, from `ingresses()` in `transits.ts`, with its retrograde re-entries. A fixed line, no reading, no tone.
  None on a blind chart (R-4.6).
- `GET /timeline/year?year&tz` (subscriber, `timelineAccess` and an own finished report, like `/timeline/now`):
  `days[{date, key, tone, distance, exact}]` (key null on an empty day), the year's `events` as `/timeline/now` gives
  them (with `spans`), `retrogrades`, `houseChanges`, `eclipses`. Computed on request, cached per reader and year.
  In `openapi.yaml`, codegen after.
- The web component: `web/src/components/timeline/YearMap.tsx` (canvas, React only). `web/src/components/ui/` holds the
  shadcn primitives; the pasted component is not copied there unchanged, since nothing would import it.

## Out of scope
- The map on `/timeline` or the dashboard (a later ideation, once the Owner sees it on staging). Check a date for
  non-subscribers. Several readers or a pair on one map. Moon contacts. A "best day" of any kind.

## Acceptance criteria
1. Every square's tone, distance, dot, ring, dashed line and house marker comes from the engine; a test fails a
   day whose closest transit differs from `inEffect` for the reader's day, on two fixtures.
2. Distances show in degrees to two decimals, from the engine; nothing on the page sums, counts or ranks days.
3. Check a date picks the typed day in any year from birth to 90, with the three inline errors; nothing typed leaves the browser.
4. House changes match JPL Horizons to the hour for pinned fixtures (as the other searches); none on a blind chart.
5. Flat is complete at first paint; with reduced motion Skyline switches without animating; orbit only in Skyline.
6. No sideways scroll at 390, 768 and 1440 px; axe clean; arrow keys move a day or a month and announce it.
7. The waves graph and the in-app dial are gone; `/timeline`, the set-up screen and Your week keep the dial.
8. Every line passes `/ux-copy`; no line names a day good or bad for anything. The dry lab is clean.

## Screens
1. The map, flat and Skyline, the picked day, the exact days: https://claude.ai/artifact/9Qb9dcXt2Np8MptmCeUT1M#map
2. Where it goes, before and after, the questions: same artifact, below the map.

## Open questions (each with a default)
1. What does the map replace? **Default: Life's waves and the in-app dial** (the dial stays on /timeline, set-up,
   Your week). Or the waves only; or nothing.
2. Flat or Skyline first? **Default: flat, Skyline one tap away.** Or Skyline, rising the first time it is seen.

## Decisions to record
1. Timeline's year map: one square per day, months as rows; colour the day's closest transit's tone, brightness how
   close to exact, a dot on exact days, dashed retrograde lines, house-change markers. Never a score. (Claude)
2. Check a date: one typed date answers with the sky that day and how long each transit lasts; never good or bad. (Claude)
3. The doctrine gains Jupiter-to-Pluto house changes as a fixed line with no reading or tone. (Claude, astrology call)
4. The map is built from the Owner's ContributionSkyline component, adapted; Flat and Skyline views. (Claude)
5. Mars's exact days fold under "Short ones" in the year's list; Mars stays on the map. (Claude)
6. Supersedes Life's waves (timeline screen 3) and the drag handle (review-05-10 §4), and the in-app dial
   (timeline screen 4, decision 3 in part), subject to question 1.
