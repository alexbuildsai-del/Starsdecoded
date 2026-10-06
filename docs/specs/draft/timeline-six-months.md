# Timeline: your next six months, simply

Draft 2026-10-06 from `/ideate`, version 2. The Owner: a user found the interactive Life view "too much… overwhelming".
He wants something simpler that still shows the point: big transits last weeks and peak on a few days, and a reader
needs to see which days ("a launch on 3rd of March 2028, but… my Saturn return is peaking that week").
On version 1 (a year heat map and a 3D skyline): "too much colour… super overwhelming… forget the heat map idea";
"I think we stuck to six months"; "I like from January to December".
Artifact (live, Mira's real transits): https://claude.ai/artifact/9Qb9dcXt2Np8MptmCeUT1M
Touches the locked `timeline` (screen 4, the in-app dial) and keeps `review-05-10` §3 (Your week) as locked.

## Scope

### The six months (screen 1)
- A title with the range ("October 2026 to March 2027"), Earlier and Later (six months each way), the month names
  across, and a dotted Today line.
- **One row per big transit that peaks in these six months**: Jupiter, Saturn, Uranus, Neptune or Pluto, by the
  locked doctrine. Rows in order of their first exact day. Each row reads top-down:
  - the headline in plain words ("Taking yourself more seriously");
  - the contact and its tone as a word, small and grey ("Saturn on your Ascendant · Heavy");
  - one line: thin grey while the planet is close, thick white in its strongest weeks (within a quarter of the
    orb of exact), a gold dot on each exact day with its date under it. A flat end means it runs past the six months.
- Tap a row: it opens in place with when it starts and ends (with years), every exact date, the house, and
  "Read more in Timeline ›", which opens the reading as today.
- **Going backwards**: one row at the bottom, a dashed line per planet (Mercury, Venus, Mars) with its name over it.
  Tapped: each with its dates, houses and headline.
- **Also there, without a peak**: one grey sentence naming the big transits that are close but not exact in
  these months. No row.
- **No colour but gold.** Gold marks an exact day (measured geometry, web-taste). Heavy, Mixed and Light are words.
- Mars contacts and house changes are not shown here (Your week keeps Mars, as locked).

### Check a date
- "Check a date", one typed field (DD/MM/YYYY), Check. The six months move to put the date in the third month, a
  white line runs down every row, and a short answer sits above the rows:
  "3 Mar 2028. Jupiter opposite your Sun is exact 4 days later, on 7 Mar. Saturn on your Venus was exact 7 days
  before, on 25 Feb." Exact days within three weeks either side, nearest first.
- Sky only (R-5.2): it never says a date is good or bad for a plan. Inline errors for a wrong format, a date that
  doesn't exist, or one outside birth to 90.

### Where it goes (question 2 at its default)
- Timeline's six-month view shows this instead of the dial. The dial stays on `/timeline`'s hero, the set-up screen
  and next to Your week on a desktop. Week and month stay as locked.
- Life is not changed by this spec. Its waves come back to the Owner in their own ideation.

### The engine and the API
- No doctrine change. `GET /timeline/now?range=6m` gains, per contact, the strongest-weeks spans (the days within a
  quarter of the orb of exact, from the engine), and accepts a `from` month for Earlier, Later and Check a date.
  `openapi.yaml`, then codegen.
- The web: `web/src/components/timeline/SixMonths.tsx`, SVG, React only. The pasted ContributionSkyline component
  is not used (version 1 dropped).

## Out of scope
- Any heat map, skyline or year grid. Mars rows. House changes. The map on `/timeline` or the dashboard. Life's waves.

## Acceptance criteria
1. Every line start and end, strongest-weeks span, exact date and tone word comes from the engine; a test fails a
   row whose dates differ from `skyEvents` for the pinned fixtures.
2. Only Jupiter to Pluto contacts with an exact day inside the six months get a row; the rest are named in one line.
3. Gold is the only colour besides the page's greys and the Check button; nothing sums, counts or ranks days.
4. Check a date moves the range, draws the line, and answers with the exact days within three weeks; inline errors.
5. No sideways scroll at 390, 768 and 1440 px; rows open and close by keyboard; axe clean; complete at first paint.
6. Every line passes `/ux-copy`; none names a date good or bad for anything.

## Screens
1. The six months and Check a date: https://claude.ai/artifact/9Qb9dcXt2Np8MptmCeUT1M

## Open questions (each with a default)
1. Which six months? **Default: from this month on**, with Earlier and Later. Or half years, January to June and July to December.
2. Does it replace the dial in the app's six-month view? **Default: yes**; the dial stays on /timeline, set-up and Your week.

## Decisions to record
1. Timeline's six-month view: one row per Jupiter-to-Pluto transit that peaks in it; a thin line while close, thick
   in its strongest weeks, a gold dot on each exact day; tone as a word; retrogrades in one dashed row. (Claude)
2. Check a date: a typed date moves the view, draws one line, and names the exact days within three weeks; sky only. (Claude)
3. No heat map or skyline for Timeline (the Owner, 2026-10-06: "forget the heat map idea").
