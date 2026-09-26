# Dashboard sky

Ideation 2026-09-25 with the Owner. Status: locked 2026-09-25 (ADR-89 to 96);
amended 2026-09-26 with Review 25 Sept (MB-81 to 86) and progress states.
Annex: `docs/annex/dashboard-sky-annex.md` (sharing flows, empty states).
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
  "At a glance ›" below; a tap opens the reader's own card (below). With no
  report of their own: a dashed disc, "Your chart · Generate it ›".
- **People.** One point per other profile: initials in a disc, first name
  below in Space Grotesk capitals, evenly spaced on a plain dotted orbit.
- **The orbit is not a chart.** No zodiac, no degrees, no houses and no planet
  renders on it, so nothing on it claims a position (ADR-17 holds because the
  orbit draws no chart).
- **States on a point.** Report still writing: dashed disc, "· WRITING" after
  the name. A compatibility report shared with the reader: violet ring
  (`#9575CD`). A failed report is not drawn and stays in the list.
- **Motion.** The orbit drifts about 3°/s and each point floats a few pixels
  on its own rhythm. A tap holds the drift (the float goes on), fills the
  point and dims the rest to .4; anyone sharing a compatibility report with
  the tapped person keeps full opacity and a lit violet ring.
- **Micro animations**, each under a second except the float, all stopped by
  reduced motion: listed in the annex.

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
2. **Triad.** The ringed plate, its own component now that the pair hero
   drops its ring (ADR-99, MB-86) (ring, dashed horizon, Sun and Moon
   renders at true degrees, band arcs, angle marker) and the report's legend
   rows: "16.44° Leo · 7th"; a band reads "10.19°–22.85° Pisces"; a blind
   Rising reads "Add {name}'s birth time to draw the horizon".
3. **Elements.** BalanceRail's rows, the only place element hues live
   (ADR-23). A lead is named only at ≥ 40% of the ten planets and 2 clear of
   the next ("Fire leads · 5 of 10"), else "Spread across the four"; empty
   elements named ("No air"); modality counts on one mono line.
4. **Planets by house.** Twelve whole-sign cells with the renders standing in
   them; the busiest house with three or more planets outlined and named with
   its one word (ADR-98): "4 planets in the 9th (Belief)"; blind: "Houses need a birth time". This lifts the
   natal-report-ui dashboard deferral for this strip only.
5. **Compatibility**, below.
6. **Send line:** Send to {first name}, or Joined ✓ (credit-loop, MB-81).
7. **One primary:** "Open {name}'s report"; while it is written, a status
   "Writing {name}'s report" with the dots. Nothing offers to read a report
   before it is finished: no "Read as it writes" on the dashboard.

**The reader's own card** (tap on the centre): eyebrow "Your Personal natal
report", the same triad, elements and houses, then "Your compatibility
reports" (each with Open, or "Tap someone in your orbit to read the two of you
together"), the credit row, and "Open your report".

No "In your chart" line. Everything reads from `chartData` (`GET
/reports/{id}` on tap); nothing is generated. No Unicode planet or sign glyph
anywhere on the dashboard.

### Compatibility

One product, named by its two people: eyebrow "Compatibility report", title
"{A} & {B}". The lens never appears on the dashboard, the card or the lists
(settled at lock). Rows in the card:

| State | Row |
|---|---|
| Shared with the reader | the whole row opens it (chevron ›); a quiet link "↥ Send to {B}" inside it until they join, then "{B} can read it too" (MB-82) |
| None, both finished, credits > 0 | "How the two of you work, and why." · "Uses 1 credit · N credits left" · **Generate** (primary) |
| None, zero credits | "No credits left" · **Get credits** |
| Their natal report writing | "Generate opens when {name}'s report is finished." (the card's primary carries the Writing status) |
| Generate pressed | **Generating** status until the pair report exists |
| The pair report writing | **Writing** status; "It opens here when it is finished." |
| Reader has no report | "Needs your own report first." · Generate disabled |
| Pairs between this person and others | the whole row opens it |

A control never shows its idle verb while something is under way: it becomes
a status with three pulsing dots ("Generating", "Writing"; still dots under
reduced motion). Disabled keeps the verb only when a prerequisite is missing,
with its reason. Generate opens the existing picker with both people chosen,
entering as the picked selection through `pair-selection.ts` (#66, MB-86); the
picker still writes the report. The Compatibility list below the orbit is also relabelled:
"Compatibility report" and "{A} & {B}", no lens eyebrow.

### Credits

A credit pill in the nav, a credit row in the panel, "1 credit" beside every
spend; at zero each spend becomes Get credits, behind the `MB-6 provisional`
seam until payments (annex).

### Empty states

Only you (credits or none), a new account, people but no report of your own:
the four tiles in the artifact; copy and actions in the annex.

### Sending and gifting (MB-81 to 85; renamed by `credit-loop.md`)

- **Send to {first name}** on a finished report the reader made (report,
  row, card); on claim it is theirs by default, "Not me" undoes; they may
  delete it or remove the giver's access. Joined shows "Joined ✓".
- **Send to {B}** for a pair, only when the reader is one of the two; a
  person already joined gets access at once.
- **Gift a report** replaces Invite {first name}: it lives on Add someone
  and the credits sheet, holds a credit, and is specified in `credit-loop.md`.
- **Fixed with it:** the claimer's read and list checks (MB-84); invite copy
  and the Terms (MB-85). The pair row never shows the lens (ADR-93).

### Data

- The orbit and card read what the dashboard loads, `GET /reports/{id}` on
  tap and `useGetCredits`; halos from `ReportSummary.participants[].id`.
- Sharing changes the contract and the schema: `profiles.claimed_as_self`
  (idempotent bootstrap script), a person's joined state on
  `ProfileSummary`, the claim's read and list checks (MB-84), a pair invite
  to someone already joined grants access instead of 409 (MB-82).
- The picker takes a preselected pair through `pair-selection.ts`.

## Out of scope

- The brain: prompts, models, engine, report content, the lab.
- Any chart geometry on the orbit; pair scores; lines between people.
- Checkout and prices (MB-5, MB-6); a picker redesign.

## Acceptance criteria

1. The orbit shows one point per other profile with initials and first name;
   no zodiac, degree or planet render on the orbit.
2. Tapping a point holds the drift and opens the card (panel or sheet);
   tapping empty space or Escape closes it and resumes the drift; tapping the
   centre opens the reader's own card. Points and centre are keyboard reachable.
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
10. No in-progress control shows Generate: a writing natal report shows
    Writing, a pressed Generate shows Generating, a writing pair shows
    Writing; no "Read as it writes" anywhere on the dashboard. An existing
    pair is one tappable row, sharing a link inside it, never a second button.
11. Send to and Joined appear per person as specified; a claimer
    reads and lists the report made for them (route test, MB-84); a pair is
    shared only by one of its two people; the lens never shows.
12. Reduced motion: no drift, float or micro animation. At 390 px no
    sideways scroll.
13. Typecheck, both builds, unit tests (lead rule, house tally, row state
    choice) pass; no lab, the brain is untouched.

## Screens

All in the artifact: the live mock, phone sheet, motion, card, compatibility
and progress states, sharing, empty states, credits.

## Settled at lock (the defaults)

The picker keeps the lens choice (ADR-40, 68) and nothing on the dashboard
shows it; zero-credit states sit behind the MB-6 seam; a point shows initials.

## Decisions to record (amendment, at the next lock)

1. In-progress controls become a status with three dots; Generate never
   shows while a report is written (the Owner, 2026-09-26).
2. No "Read as it writes" on the dashboard; a report opens when finished.
3. An existing pair is one tappable row; sharing is a link inside it.
4. MB-81 to 86 as above, closing those rows.

## Decisions recorded

ADR-89 to ADR-96, in order: the orbit (not a chart); a person is a named
point; a tap opens the card; the card is computed; one compatibility report
named by two people; the card sells the pair; credits always in sight; empty
states. Full text in Notion Decisions.
