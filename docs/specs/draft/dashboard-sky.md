# Dashboard sky

Ideation 2026-09-25 with the Owner. Status: draft, nothing built.
Artifact: https://claude.ai/artifact/6GpndVJxZUfHAdULYYg2GX · reference:
commit 3cfe873, a prototype built before this ideation, reverted.

The reader's chart frames the sky, with their name at the centre; everyone
they have read is a Sun at its true degree; a tap opens a computed quick look.
Pairs are marked on people, never drawn between them.

## Scope

### The sky (option A, question 1)

- **Frame.** The report wheel's sign band: twelve wedges, brass fill .05 and
  .085, stroke brass .3, sign names as words on the band. It is turned so the
  reader's Ascendant sits on the left (east). Inside it is the house band
  numbered 1 to 12 in Plex Mono (whole sign), the horizon dashed through the
  centre, and the angle marker (ADR-49) at its east end: the mark
  (`logo.md`) made large.
- **No horizon.** When the reader's birth time is unknown, or they have no
  report, the band starts at 0° Aries on the left, with no house band, no
  horizon and no marker.
- **Centre.** "YOU", the first name, "Open report ›"; a tap opens the reader's
  Personal natal report. With no report: "Your chart · Generate it ›" to
  `/chart?self=1`.
- **Bodies.** One per other profile with a computed chart: the Sun render at
  the true longitude of that person's Sun, on a lane inside the house band. A
  brass dot marks the degree on the band's inner edge, with a brass leader to
  the body.
- **Crowding.** A Sun closer than one body's width to a placed one takes the
  next lane inward. A body never leaves its degree (ADR-17).
- **Labels.** A label sits beside its body with no leader line: the first name
  in Space Grotesk capitals, and on wide screens the degree in Plex Mono. When
  a side collides it tries the next: inward, vertical, outward.
- **States.** A report still writing draws its body at .62 with a dashed ring;
  a failed one is not drawn and stays in the list. A Sun whose band crosses a
  sign line sits at the band's midpoint and names no house.
- **Motion.** On load each Sun travels along its lane onto its degree in 1.4 s
  on one easing; leaders and labels fade in after. Then nothing moves. A tap
  rings the body in indigo and dims the rest to .42, and nothing rotates.
  Reduced motion shows the sky at rest.
- **Many bodies.** Past ten, names show on hover, focus and selection only.

### Layout

- **Desktop** (`max-w-4xl`): the sky on the left, at most 440 px, and a panel
  on the right. The panel shows the quick look for the selected body, or else
  the sky's legend and the reader's own triad rows.
- **Phone:** the sky full width, and the quick look in a bottom sheet. The
  sheet opens at a peek that keeps the tapped body visible and drags up for
  the rest.
- **Below the sky** (question 3): Your People and Compatibility stay as the
  dense lists; the You card folds into the centre and a slim row (Add your
  birth time, Not me, Delete).

### The quick look

1. Eyebrow "Personal natal report" in brass, the name and the birth date, plus
   "birth time unknown" for a blind chart.
2. **Triad.** The pair hero's plate: the ring, the dashed horizon, Sun and Moon
   renders at their true degrees, band arcs when the time is a band, and the
   angle marker. Beside it, the report's legend rows:
   - a known time reads "16.44° Leo · 7th";
   - a band reads "10.19°–22.85° Pisces";
   - a blind Rising reads "Add {name}'s birth time to draw the horizon".
3. **In your chart.** "Sun in your Nth house": whole sign, counted from the
   reader's Ascendant, the number only (question 2). Without the reader's
   horizon it says why no house is named.
4. **Elements.** BalanceRail's rows, still the only place element hues live
   (ADR-23).
   - A lead is named only when it holds at least 40% of the ten planets and
     is 2 clear of the next element ("Fire leads · 5 of 10"). Otherwise the
     row reads "Spread across the four".
   - Empty elements are named ("No air").
   - The modality counts sit on one mono line.
5. **Planets by house.** Twelve whole-sign cells with the renders standing in
   them, as on the house cards. This lifts the natal-report-ui deferral for
   this strip only.
   - The busiest house with three or more planets is outlined and named with
     its explorer label.
   - A blind chart reads "Houses need a birth time".
6. **You two.** The compatibility row or rows, described below.
7. **One primary button:** "Open {name}'s report", or "Read as it writes".

Everything reads from `chartData` (`GET /reports/{id}`, fetched on tap).
Nothing on the card is generated; the report headline, if shown, is quoted.
No Unicode planet or sign glyph appears anywhere on the dashboard. Bodies are
renders, points are brass dots, angles are the marker and signs are words.

### Compatibility on the sky

- **Halos.** A violet ring (`#9575CD`) on a body means the reader and that
  person share a compatibility report.
- **Tapping a person** lights the rings of everyone they share a report with,
  even two people who are not the reader (ADR-40), and keeps those bodies
  undimmed.
- **Not drawn:** lines between bodies (they read as aspects, ADR-17), a body
  at a midpoint (the composite Sun, V2) and any number (ADR-41).
- **You two row states:**
  - A shared report shows the lens, "{A} & {B} Compatibility" and Open.
  - When there is none and both reports are complete, "Read you two" opens
    the picker with both people chosen; the lens is still chosen there.
  - While their report is writing, the button is disabled: "Once {name}'s
    report is finished".
  - When the reader has no report, it is disabled: "Needs your own report
    first".
  - Pairs between this person and others follow, each with Open.
- **Unchanged:** the Compatibility list and the picker stay below the sky. The
  picker remains the only way a pair report is created.

### Data

- `ProfileSummary` gains `sunLongitude` and `ascendantLongitude` (number,
  nullable), both read from the cached `chart_data`. The Ascendant is null
  without a horizon. Change `openapi.yaml`, then run codegen. No schema change.
- The picker accepts a preselected pair.
- The halos come from the compatibility `ReportSummary.participants[].id`,
  which are profile ids.

## Out of scope

- Any change to the brain: prompts, models, engine, report content, the lab.
- Composite charts, pair scores, lines between people, transits, a live sky.
- The reader's own planets on the band.
- Moving invite, delete or This is me out of the lists; a picker redesign.

## Acceptance criteria

1. With a horizon, the band's sign boundaries and house numbers match the
   reader's whole-sign chart, and the angle marker sits on the left at the
   Ascendant.
2. Every body's centre lies on the radial line of its person's Sun longitude,
   within 0.5°. A lane change never changes the angle.
3. No Unicode planet or sign glyph renders on the dashboard. A grep gate over
   `web/src/components/dashboard/` and `DashboardPage.tsx` blocks ☉ ☽ ☿ ♀ ♂ ♃
   ♄ ⛢ ♆ ♇ ⚷ ☊ ☋ and ♈ to ♓.
4. Tapping a body opens the quick look. Tapping empty sky or pressing Escape
   closes it. Tapping the centre opens the reader's report. Bodies and the
   centre are keyboard reachable.
5. The element lead follows the rule. On the seven fixture charts, the card
   reads as the artifact's table does.
6. A blind chart's card draws no horizon, names no house, and shows band arcs
   for the Sun and Moon.
7. With reduced motion the sky renders at rest, with no animation frames.
8. There is one halo per person sharing a report with the reader, and tapping
   lights partners' rings.
9. Read you two opens the picker with both people selected, and is disabled
   with its reason when either report is not complete.
10. At 390 px the page never scrolls sideways, and the sheet leaves the tapped
    body visible.
11. Typecheck, both builds and unit tests pass (lead rule, house tally, lane
    placement, the reader's house of the Sun); no lab, the brain is untouched.

## Screens

All in the artifact: desktop and phone in the reader's three chart states,
options A and B, the quick look's anatomy and element table on the fixture
charts, the three compatibility options and the four You two states.

## Open questions

1. **True sky (A) or orbit of stars (B)?** A keeps ADR-17 with no exception
   and makes the sky carry information. B keeps the drift, but the sky says
   nothing. Recommend A. Default: A.
2. **Name the house the person's Sun falls in?** Option A shows it by position
   anyway, and the reading stays in the compatibility report. Recommend yes,
   the number only. Default: yes.
3. **Fold the You card into the sky and keep the two lists?** The lists hold
   invite, delete, This is me and the picker, and the dashboard stays dense.
   Recommend yes. Default: yes.

## Decisions to record

Numbered at lock, from ADR-78.

1. **The dashboard opens on the sky.** The reader's sign band is turned to
   their Ascendant on the left, with the horizon and the brass point: the mark
   made large. The name at the centre opens the Personal natal report.
2. **Each person is their Sun.** A Sun render sits at the true longitude of
   that person's Sun. Close Suns take inner lanes on a brass leader and never
   move. Name and degree sit beside the body.
3. **One move.** On load, a 1.4 s settle onto the degrees on one easing, then
   stillness. A tap rings the body in indigo and dims the rest. Reduced motion
   shows the sky at rest.
4. **The quick look is computed:** triad plate and legend, the house of the
   reader's chart the Sun falls in, balance rows naming a lead only at 40% and
   a margin of 2, planets by whole-sign house with renders, the You two row,
   one door. No Unicode planet or sign glyph on the dashboard.
5. **Pairs are marked on people.** A violet ring means a shared report. The
   partner's ring lights when either is tapped. No lines, no midpoint body, no
   score.
6. **Read you two** opens the picker with both people chosen, and the lens is
   chosen there. It is disabled, with its reason, until both reports are
   finished.
7. **Profiles carry two longitudes.** `sunLongitude` and `ascendantLongitude`
   join `ProfileSummary`, from the cached chart.
8. **The lists stay below.** The You card folds into the centre and a slim
   row. Your People and Compatibility stay as the dense lists.
