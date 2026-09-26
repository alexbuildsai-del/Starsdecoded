# Review 25 Sept

Ideation 2026-09-26 with the Owner from the Notion page "Review 25 Sept" (ten notes on the R08
build on staging). Artifact, with the pair hero now and proposed, the one-chart view live on the
lab pair's computed charts, the house names, the chapter 01 ledger, three share cards, the scene
order on the Owner's own lines, the crash, the raw label and the Closing measurements:
https://claude.ai/artifact/BejywNF3s6rEGEc4aRHTSD. Status: **draft**.
Builds on `compatibility-report-p2.md` (ADR-63 to 71) and `review-20-09.md` (ADR-59 to 62);
amends ADR-71, the p2 chapter 01 shape and the lens chapter order, and makes ADR-70 literal.

Notes 2, 8, 9 and 10 are fixes. Notes 1 and 4 are plain asks. Notes 3, 6 and 7 carry one
question each, with a default.

## Scope

### The compatibility report
- **The hero (note 1).** `PairHero.tsx` `Plate` loses its SVG: the ring, the dashed horizon,
  the Sun and Moon on the ring, the Moon arc and the rising marker. A plate is the name and the
  three rows, the row renders at 28 px (from 22), a hairline between the two plates. A Moon with
  a band shows it as a degree range in its row (the arc it replaces); a blind side keeps "rising
  · not drawn". `PAIR_STACK.plate` is re-measured (about 120) so `pairStack()` keeps the cue
  clear of the corners. Print drops the rings. Eyebrow, names, corners and cue unchanged.
- **The counter (note 2).** `Chapter.tsx:42` pads `total` as it pads `number`;
  `CompatibilityReportPage.tsx` passes its chapter list's length, not the literal 7.
- **One chart at a time (note 3).** Chapter 01 opens on one wheel, the reader's own chart (the
  left plate's person), drawn by the natal wheel component. A segmented toggle: "{A}'s chart ·
  {B}'s chart · Side by side". No bi-wheel, no inner or outer ring, no contact lines, no six-row
  legend: `BiWheel.tsx`, `bi-wheel.ts` (and its test) and `WheelLegend` retire. One line under
  the wheel: "Tap a house to see what it stands for and who lands there."
  - The panel, beside the wheel from 760 px and under it below: "Where {B} lands in {A}'s
    chart", the other person's ten planets grouped by this chart's houses, each house by number
    and full `HOUSE_NAMES` name. Computed in the browser from the two charts (whole sign from the
    host's Ascendant, as `hostHouses()` does today), no model. A tapped house, on the wheel or in
    the list, shows its name, its `HOUSE_THEMES` line and both people's planets in it. Side by
    side shows the two wheels and the twelve-house key.
- **Every wheel names its houses (note 3, both reports).** The sign band carries two lines per
  segment: the sign, and under it the house number and the first word of its `HOUSE_NAMES`
  entry ("9 · BELIEF"). The inner house-number ring goes. The natal tap still opens the house
  card. A blind chart draws no house line (ADR-34).
- **A house is never a bare number (note 4, both reports).** One helper beside `HOUSE_NAMES` in
  `web/src/lib/evidence-glossary.ts` puts the name in brackets, lower case, after every
  "Nth house" and "rules the Nth" the page prints: `LinkCard.tsx` `linkTitle` (overlays), the
  evidence sheet, every claim label ("…, 11th house (friends & collective), exalted"). Tight
  places take the first word: the hero rows at full width, "11th (friends)". Render time only:
  no prompt, API or schema change, and stored reports get the names.
- **Chapter 01 as a ledger (note 5).** `TwoChartsBlock` renders two columns (stacked below
  760 px): "Naturally strong" in teal and "Will take work" in rose. Each line carries a glyph:
  the two bodies of the cross link its claims cite, A's on the left, joined in the link's colour
  (teal flows, rose rubs, brass touch), with the two body names under it. The line is set in the
  display face, with a chip "→ {NN} {chapter title}" from the link's owning chapter in the
  foundation. A tap on the glyph opens that link's card. The paradox spans both columns under a
  teal-to-rose rule; the strengths become three plates; the pointer closes. Chapter 01 order:
  wheel and panel, ledger, strengths, share card, link cards. A line with no cross claim draws
  no glyph; a link with no owning chapter shows no chip. No schema change.
- **The share card (note 6).** `ShareCard.tsx` draws a portrait 1080 × 1350 canvas with no wheel
  (the `wheel` prop goes): the eyebrow "Compatibility report · {lens}", "{A} and {B}" by first
  name, the headline, "Your three strengths as a pair" with the three lines, the foot "Computed
  from two birth charts. No score, no prediction." and the mark with the wordmark. The page shows
  the drawn card as an image, then "Send it to {B}." and "It shows the verdict and your three
  strengths. Nothing from either birth chart is on it, and nothing is uploaded." Buttons: "Share
  the card" (Web Share with the PNG, where `canShare({ files })` holds), else "Copy image"
  (`ClipboardItem`, where it exists), then "Save image". Nothing is stored or hosted (MB-63).
- **The scene, introduced (note 7).** `LensChapterBlock`, every lens, chapters 02 to 06: the
  side-by-side card is headed "Going in" and keeps the two sides only; the scene block
  (`SceneChips` and its print branch) adds a line of product copy under its kicker, "A moment
  you will both recognise, played out."; "What just happened" opens on `card.pair` in the display
  face, then the two because-lines. Chapter 02 carries one intro line under its title: "From
  here, each chapter plays out one scene between you: how it tends to go, what was going on
  under it, and one thing to try next time. Two more scenes wait under each one." Print drops
  the second sentence. Words and prompts unchanged.

### The dashboard (note 8)
- `CompatibilityPicker.tsx`: `unpickable` takes `ReportSummary | undefined` and reads undefined
  as "no longer available"; the two non-null assertions at line 66 go. The stored selection
  (`sd.pair.selection`) is restored only once the list has loaded and only when both ids are in
  it, else dropped; it is cleared after a report is created and on sign-out.
- The selection logic moves to a pure module, `web/src/lib/pair-selection.ts`, with unit tests
  for the cold list, the deleted report and the clear after create (MB-47: no component render).
- The app error boundary resets on route change (keyed by location), so "Go home" and the back
  button leave the error screen. Its copy is unchanged.
- Introduced in R05 (51c47bd); the crash is per browser tab, no data is affected.

### The personal report (notes 9, 10)
- **Prose is plain text (note 9, the brain).** Two checks, annex rows 39 and 40 in
  `docs/annex/pair-reliability-checks.md`, wired for every natal section:
  - 39, fix, in a natal `normalise` hook before the parse: strip `**` and `__`, drop a leading
    label paragraph (no end stop, and a colon or the word ruler), log by rule id.
  - 40, block: `\b\d{1,2}(st|nd|rd|th) ruler\b`, "peregrine", "domicile", "exalt" or "detriment"
    inside a prose field retries the section with the error named (ADR-84), as "orb" does in the
    pair report.
  - `system.ts` rule 3 becomes "A placement appears only in a field named label."; rule 8 adds
    "Prose fields are plain text: no markdown, no heading line, no ruler or dignity word."
    Staging's natal system rows are re-synced (R-5.4).
  - `cleanProse` in `web/src/lib/`, at the top of `CitedText`, strips markdown emphasis and a
    leading label paragraph, so stored reports read clean without regeneration.
  - The lab: `*` joins `BANNED_CHARS`; "peregrine" and "ruler:" join `METHOD_TALK`.
  - Tests with the exact string `**10th ruler: Mercury in Aquarius, 6th house (peregrine)**`
    followed by a paragraph: row 39 fires and the stored text starts "You"; "Your 10th ruler
    is peregrine." fires row 40; `cleanProse` returns one paragraph with no asterisk.
- **The Closing gap (note 10).** `DawnClosing.tsx:95` drops `md:pt-14`; `.rp-dawn .body >
  .rp-pull:first-child` loses its top margin, hairline and top padding. The sun is unchanged.
  Cause: from 768 px up, 22 + 56 + 26 = 104 px because the padding stops the margins collapsing;
  R06 removed only the phone padding.

## Out of scope
- Pair prompts, schema and the pair lab's own failures (the r06 pair runs stop at the link
  cards' word band): R08's ground. No stored pair run exists to quote; the artifact says so.
- The API's house wording (`api/src/prompts/vocabulary.ts`, `HOUSE`) against the web's
  `HOUSE_NAMES`: two lists kept by hand. A Mailbox row at lock.
- A natal share card, a landscape pair card, hosting a card, a card link preview.
- Placidus, a light theme, the landing page (MB-8).

## Acceptance criteria
1. The pair hero at 390 and 1440 px draws no ring, circle, horizon line or rising marker; each
   plate is a name and three rows with 28 px renders; at 390 px the cue clears the corner text;
   print shows no ring.
2. Every counter pads both numbers: "01 / 07" to "07 / 07" in the pair report, "01 / 10" to
   "10 / 10" in the natal report.
3. Chapter 01 opens on the reader's chart alone; the toggle shows the other chart and side by
   side; nothing on the page or the card draws two charts on one plate or a line between charts.
4. At 390 px the single wheel shows every house's number and first word. A tapped house shows
   its full name, theme and both people's planets; for the lab pair the panel matches
   `computeOverlays` (20 overlays, B's Sun in A's 2nd, A's Sun in B's 12th).
5. The natal wheel shows the same two-line band; a tap opens the house card; a blind chart
   draws no house line.
6. In link cards, evidence sheets and claim labels of both reports, every "Nth house" and
   "rules the Nth" carries its name once; unit tests on the helper and on `linkTitle`.
7. Chapter 01 renders the ledger: three teal and three rose rows with a glyph from each line's
   cited link and a chip where the link owns a chapter, the paradox across, three strength
   plates; the link cards come after the share card.
8. The share card is 1080 × 1350 with no wheel; the page shows it; "Share the card" (or "Copy
   image") precedes "Save image"; no request carries the image.
9. In every lens chapter of all three lenses: headline, Going in without the pair line, the
   scene with its frame line, What just happened opening on the pair line, the because-lines,
   the pattern, Next time. Chapter 02 carries the intro line; print omits its second sentence.
10. The dashboard renders with a stored selection and an empty list, with a stored selection
    whose report was deleted, and after more than five minutes on a report; after a thrown
    render error, "Go home" reaches the landing page and the dashboard then loads.
11. A natal section returning the exact leaked string is stored as one paragraph starting "You"
    with a row 39 `generation_failures` row; "Your 10th ruler is peregrine." retries on row 40;
    the affected staging report renders without the label.
12. The Closing's first text line sits within 26 px of its chapter rule at 390, 820 and
    1280 px, measured in Chromium as in the artifact.
13. Typecheck, both builds, unit tests, codegen no diff, the dry lab (brain changed, R-4.4),
    Vercel preview smoke.

## Screens
All in the artifact: the hero now and proposed; the live one-chart view with its toggle and
panel, the current bi-wheel and option B side by side; the link card and evidence sheet with
house names; chapter 01 now and as a ledger; the current card, card A and card B, and the share
block; a lens chapter now and proposed on the Owner's two lines; the crash flow and its fix;
the raw label now and proposed with its four layers; the Closing at 1280 px and its measures.

## Open questions
1. **One wheel with a toggle, or always side by side?** Recommended: the toggle, the reader's
   chart first; on a phone one wheel gets about 358 px, two side by side about 170 each, too
   small for a house name. Default if silent: the toggle as drawn.
2. **The share card: type only, or two small wheels?** Recommended: A, type only, portrait;
   what is sent is the verdict and the strengths, and a chart at card size reads as decoration.
   Default: A at 1080 × 1350, shown on the page, Share first, the landscape card retired.
3. **The pair line: after the scene, or dropped?** Recommended: after the scene, as the first
   line of What just happened, where it is the chapter's best summary. Default: moved, with the
   intro line on chapter 02 and the frame line on every scene.

## Decisions to record
1. **One chart at a time.** The compatibility report draws the reader's chart first, with a
   toggle to the other person's and to side by side; no bi-wheel, no inner or outer ring, no
   contact lines, on the page or the share card. Amends the p2 chapter 01 line and ADR-71's
   "the wheel behind".
2. **Every wheel names its houses.** The band carries the sign and, under it, the house number
   and the first word of its house-card name; a tap opens the house. Both reports.
3. **A house is never a bare number.** Wherever the page prints a house, its house-card name
   follows in brackets, or its first word where space is tight; one list, at render time.
4. **The compatibility hero draws no ring at all:** a plate is a name and three rows. Makes
   ADR-70 literal.
5. **Counters pad both numbers:** 01 / 07.
6. **Chapter 01 is a ledger:** each strong and work line shows its link as two bodies joined in
   the link's colour, with a chip to its chapter; the paradox spans both columns; the strengths
   are three plates. No number, bar or score.
7. **The share card is type only,** portrait 1080 × 1350, no chart, shown on the page, Share
   first and Save image second, one line on what it holds; drawn in the browser, nothing stored.
   Closes MB-63.
8. **A lens chapter reads in story order:** headline, Going in, the scene under its kicker and a
   line of copy, What just happened opening on the pair line, the because-lines, the pattern,
   Next time; chapter 02 carries one intro line. Amends the p2 chapter order.
9. **Prose is plain text:** no markdown, heading or label line, ruler or dignity word in a prose
   field; a check strips markdown and a leading label and logs it, jargon retries the section,
   the page cleans stored prose. Narrows system rule 3.
10. **An error never locks the app:** the error screen resets on navigation, and state a browser
    remembers is checked against loaded data before use.
