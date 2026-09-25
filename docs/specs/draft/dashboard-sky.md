# Dashboard sky

Ideation 2026-09-25 with the Owner. Status: draft 2, nothing built.
Artifact: https://claude.ai/artifact/6GpndVJxZUfHAdULYYg2GX · reference:
commit 3cfe873, the first prototype, reverted.

The dashboard opens on an orbit: the reader at the centre, the people they
have read drifting around them. A tap opens a card computed from the stored
chart, where the compatibility report is opened or sold. Draft 1 placed
people as Suns at their true degrees; the Owner rejected it for the original
interactive orbit.

## Scope

### The orbit

- **Centre.** The reader's first name on the product gradient, "YOU" above,
  "Open report ›" below; a tap opens the Personal natal report. With no report
  of their own: a dashed disc, "Your chart · Generate it ›".
- **People.** One point per other profile: initials in a disc, first name
  below in Space Grotesk capitals, evenly spaced on a plain dotted orbit.
- **The orbit is not a chart.** No zodiac, no degrees, no houses and no planet
  renders on it, so nothing on it claims a position (ADR-17 holds because the
  orbit draws no chart).
- **States on a point.** Report still writing: dashed disc, "· WRITING" after
  the name. A compatibility report shared with the reader: violet ring
  (`#9575CD`). A failed report is not drawn and stays in the list.
- **Motion.** The orbit drifts slowly (about 4°/s). A tap stops the drift,
  fills the point, rings it in indigo and dims the rest to .4; anyone who
  shares a compatibility report with the tapped person keeps full opacity and
  a lit violet ring. Closing restarts the drift. Reduced motion: no drift.
- **Empty orbit.** With nobody else, one dashed "+" point on the orbit reads
  "ADD SOMEONE", or "GET CREDITS" at zero credits.

### Layout

- **Desktop** (`max-w-4xl`): orbit left (≤ 440 px), panel right. The panel is
  the card when a point is selected; otherwise the reader's name and triad
  rows, a hint, and the credit row.
- **Phone:** orbit full width, the card as a bottom sheet (peek, drag up,
  tap empty sky to close).
- **Below:** Your People and Compatibility stay as the dense lists (invite,
  delete, This is me, the picker). The You card folds into the centre.

### The card

1. Eyebrow "Personal natal report" in brass (plus "· writing"), name, birth
   date, "birth time unknown" for a blind chart.
2. **Triad.** The pair hero's plate (ring, dashed horizon, Sun and Moon
   renders at true degrees, band arcs, angle marker) and the report's legend
   rows: "16.44° Leo · 7th"; a band reads "10.19°–22.85° Pisces"; a blind
   Rising reads "Add {name}'s birth time to draw the horizon".
3. **Elements.** BalanceRail's rows, the only place element hues live
   (ADR-23). A lead is named only at ≥ 40% of the ten planets and 2 clear of
   the next ("Fire leads · 5 of 10"), else "Spread across the four"; empty
   elements named ("No air"); modality counts on one mono line.
4. **Planets by house.** Twelve whole-sign cells with the renders standing in
   them; the busiest house with three or more planets outlined and named with
   its explorer label; blind: "Houses need a birth time". This lifts the
   natal-report-ui dashboard deferral for this strip only.
5. **Compatibility**, below.
6. **One primary:** "Open {name}'s report", or "Read as it writes".

No "In your chart" line. Everything reads from `chartData` (`GET
/reports/{id}` on tap); nothing is generated. No Unicode planet or sign glyph
anywhere on the dashboard.

### Compatibility

One product, named by its two people: eyebrow "Compatibility report", title
"{A} & {B}". The lens never appears on the dashboard, the card or the lists
(question 1). Rows in the card:

| State | Row |
|---|---|
| Shared with the reader | title, Open |
| None, both finished, credits > 0 | "How the two of you work, and why." · "Uses 1 credit · N credits left" · **Generate** (primary) |
| None, zero credits | "No credits left" · **Get credits** |
| Their report still writing | "Available once {name}'s report is finished." · Generate disabled |
| Reader has no report | "Needs your own report first." · Generate disabled |
| Pairs between this person and others | title, Open |

Generate opens the existing picker with both people chosen; the picker still
writes the report. The Compatibility list below the orbit is also relabelled:
"Compatibility report" and "{A} & {B}", no lens eyebrow.

### Credits

- **Nav:** a credit pill on every dashboard view ("2 credits"; greyed "0
  credits"). At zero, "+ Add a Person" becomes **Get credits**.
- **Panel:** a credit row: "N credits left · Each report uses one" with Get
  more; at zero "No credits left" with Get credits (primary).
- **Every spend** (add a person, generate a pair, generate my chart) shows
  "1 credit" beside it; at zero it is disabled next to Get credits.
- **Get credits sheet:** bundles as counts (1, 3, 5; ADR-42), prices from
  MB-5, checkout from MB-6. Until payments exist the zero-credit states stay
  behind the `MB-6 provisional` seam and the soft pass keeps writing
  (question 2).

### Empty states

| State | Orbit | Panel / message | Actions |
|---|---|---|---|
| Only you, credits | "+ ADD SOMEONE" point | "No one in your sky yet. Add someone and they join your orbit." | + Add a person · 1 credit |
| Only you, zero credits | "+ GET CREDITS" point | "Adding someone uses a credit, and you have none left." | Add a person (disabled), Get credits |
| New account | dashed centre, add point | "Your chart comes first. It sits at the centre, and everyone you add orbits it." | Generate my chart · 1 credit |
| People, no own report | dashed centre, people | "Compatibility needs your own report. Their cards still open." | Generate my chart, or Get credits at zero |

### Data

- No API contract change: the lists the dashboard loads plus `GET
  /reports/{id}` on tap, and `useGetCredits` for the count.
- Halos from compatibility `ReportSummary.participants[].id` (profile ids).
- The picker accepts a preselected pair.

## Out of scope

- The brain: prompts, models, engine, report content, the lab.
- Any chart geometry on the orbit; pair scores; lines between people.
- Checkout and prices (MB-5, MB-6); a picker redesign.

## Acceptance criteria

1. The orbit shows one point per other profile with initials and first name;
   no zodiac, degree or planet render on the orbit.
2. Tapping a point stops the drift and opens the card (panel or sheet);
   tapping empty space or Escape closes it and restarts the drift; tapping the
   centre opens the reader's report. Points and centre are keyboard reachable.
3. No Unicode planet or sign glyph renders on the dashboard (grep gate over
   `web/src/components/dashboard/` and `DashboardPage.tsx`).
4. The card has no "In your chart" line; the element lead follows the rule and
   the seven fixture charts read as the artifact's table.
5. A blind chart's card draws no horizon, names no house, shows band arcs.
6. No lens label anywhere on the dashboard; every pair reads "Compatibility
   report" and "{A} & {B}".
7. Each compatibility row state in the table renders with its copy and its
   enabled or disabled button; Generate opens the picker with both chosen.
8. The credit pill, the panel's credit row and every spend reflect the
   balance; at zero each spend offers Get credits.
9. The four empty states render as specified.
10. Reduced motion: no drift. At 390 px no sideways scroll.
11. Typecheck, both builds, unit tests (lead rule, house tally, row state
    choice) pass; no lab, the brain is untouched.

## Screens

All in the artifact: the live desktop mock with chips for people, credits and
the reader's report; the phone sheet; the card's anatomy and element table;
the six compatibility states; the four empty states; the credit surfaces and
the Get credits sheet.

## Open questions

1. **Does the picker still ask for a lens?** It picks the middle chapters
   (ADR-40, 68). Recommend: the picker keeps it, nothing else shows it.
   Default: that.
2. **At zero credits, block or keep the soft pass?** No checkout exists yet
   (MB-6). Recommend: build the zero states behind the MB-6 seam; soft pass
   until payments. Default: that.
3. **What does a point show?** Recommend initials in a disc, first name below.
   Default: initials.

## Decisions to record

Numbered at lock, from ADR-78.

1. **The dashboard opens on the orbit.** The reader's name at the centre opens
   the Personal natal report; people drift on a plain orbit. The orbit is not
   a chart: no zodiac, degrees or planet renders on it.
2. **A person is a named point.** Initials in a disc, first name below; dashed
   while writing; a violet ring for a shared compatibility report.
3. **A tap opens the card** (panel on desktop, sheet on phone), stops the
   drift and dims the rest. Reduced motion: no drift.
4. **The card is computed:** triad plate and legend, balance rows naming a
   lead only at 40% and a margin of 2, planets by whole-sign house with
   renders, compatibility, one door. No "In your chart". No Unicode planet or
   sign glyph on the dashboard.
5. **One compatibility report, named by two people.** "Compatibility report"
   and "{A} & {B}" wherever listed; the lens never shows on the dashboard.
6. **The card sells the pair:** Generate with the credit it uses and what is
   left; Get credits at zero; disabled with its reason while a natal report is
   unfinished or missing.
7. **Credits are always in sight:** the nav pill and the panel row; at zero
   every spend becomes Get credits (behind the MB-6 seam until payments).
8. **Empty states:** only you gets an Add someone point; no report of your own
   puts the ask at the centre.
