# Natal report, pass two

Ideation 2026-09-18 with the Owner from the Notion page "Review 18 Sept" (sixteen notes),
two passes, eighteen Owner notes on the first. Artifact, the app's own `NatalWheel`
rendered for the Owner's chart plus real text from the Owner's report:
https://claude.ai/artifact/5Er5qfQVMn2DYkuyGGdPJs. Status: **draft**. Builds on
`docs/specs/locked/natal-report-ui.md` and supersedes three of its lines (chapter accent,
house-card copy source, chapter list).

## Scope

### Chapters (eleven)
01 Overview · 02 Natal Chart Deepdive · 03 Mind · 04 Career · 05 Money · 06 Relationships ·
07 Family · 08 Superpowers · 09 Paradoxes · 10 Your Path · 11 What to Focus On.
Core Triad and Elemental Profile are retired as chapters; their content moves (below).

### The chart explorer (notes 1, 2, 4, 6)
- The wheel is unchanged from R03. The 12-card `HouseGrid` is removed; the print table stays.
- The explorer is the first screen of chapter 02: `min-height: 100svh`, wheel and one card
  vertically centred. Below 900 px they stack, wheel first.
- Default: house 1 lit, card on its **front**, hint line "Tap a house on the wheel · tap the
  card to read" above it; the hint hides after the first tap and stays hidden per browser.
- Selecting a house always shows its front; the card flips only on its own tap (replaces the
  `open` prop whose value never changes).
- One fixed card height tied to the wheel's rendered height; the back scrolls inside. Same
  `HouseCard` component everywhere.
- Front: kicker stays "4th house · Virgo". Occupants: planet renders; North Node, South Node
  and Chiron as drawn points; the 1st house always shows the Ascendant marker with its degree.
  A house with no planet shows "Quiet house" and "Influenced by {ruler}, ruler of {sign}".
- Back: the triad text leads where one exists (1st house: `triad.rising`; the Sun's house:
  `triad.sun`; the Moon's house: `triad.moon`), with its citations rendered as in chapters.
  Then the house reading (below). Footer: "Read chapter · {title} →" for houses 1 and 3 →
  Mind, 2 → Money, 4 → Family, 5 and 11 → Your Path, 7 → Relationships, 10 → Career; else the
  quadrant alone.
- `personalPlanets` and `angleMeanings` stop feeding the card; they stay for the print table.

### House readings, generated (note 3)
- New section `houses`: one call in the parallel wave, `{ houses: [{ house: 1..12, reading }] }`,
  40 to 70 words each, no claims (the card is its own evidence).
- Prompt: the full style contract applies. Planets in the house first and what their
  **combination** does, in one move; at most one sentence for the sharpest aspect among
  them; a quiet house reads through its ruler's sign and house; nodes and Chiron named as
  points; ends on a "Behaviour check:" sentence. May name planets; names a sign only for a
  quiet house. Told which houses already carry a triad text, and does not repeat it there.
- `validate`: a reading names only bodies that sit in the house or rule it.

### Natal Chart Deepdive and Overview (notes 5, 7)
- Chapter 01 Overview: `headline`, `distinctive`, `bridge`.
- Chapter 02, second screen: `concentration` and `temperament` prose, with the balance rail
  (element and modality bars, dominant pair, chart shape) and a "Read more in Mind →" note.
- `overview.temperament` names the dominant element and modality in plain words, cited.
  `mind.howYouDecide` reads the modality, cited to the placements that carry it.

### The Ascendant becomes citable (notes 6, 8)
- Sixth evidence kind `angle` `{ angle: "ascendant" | "midheaven", sign }` in the schema,
  `validateClaims`, `labelEvidence`, `CLAIMS_CONTRACT` and the glossary.
- `triad.ts`: the rising sign is primary evidence for the rising part, the chart ruler second.

### The rail, the workbook and the registers (notes 9 to 13)
- Every prose chapter is two columns at ≥ 960 px: prose at 64 ch, sticky 19 rem rail; below
  that the rail follows the prose.
- **Rule: beside prose, inside a card.** Prose chapters (Mind, Career, Money, Relationships,
  Family) keep `actions[]` in the rail. Card chapters (Superpowers, Paradoxes, Focus) keep
  them inside the card, open, never folded. One checklist component, labels "What to do",
  "How to use it", "How to manage it", "Practice this week"; `mind.practice` is one item.
- **Workbook.** Ticks persist on the report: `reports.workbook` jsonb `{ [itemKey]: ISO date }`,
  `PATCH /api/reports/:id/workbook` in `openapi.yaml`, same ownership check as the report,
  idempotent column script in `scripts/bootstrap-db.sh`. Rail label shows "saved · n of m".
- New `career.careerPaths` ("Career paths") and `relationships.connectBestWith`
  ("You connect best with"): three to four items each, no claims; each item carries its
  concrete reason after a colon; phrased as tendency, never promise (R-5.2).
- `paradoxes[].invitation` stays inline in the paradox card, accent-coloured, labelled
  **"A way through"** (alternatives: "Reflection", "The reframe").
- Shared style contract: a `why` clause says what the action trains, in the words a friend
  would use, no figurative pairings, no coined phrases. The lab flags a `why` with no verb.

### One accent per chapter (note 9)
- `chapterAccent(i)` returns a fixed hue by chapter index, same for every reader: 01 indigo
  `#5C6BC0`, 02 cerulean `#3F8FD2`, 03 violet `#9575CD`, 04 teal `#3FA796`, 05 rose
  `#D9668A`, 06 plum `#B565A7`, then 07 to 11 repeat 01 to 05. Element hues stay reserved
  for the balance bars; brass for chart geometry.

### The closing (note 14)
- `focus.ts`: each group trims to three bullets; `closing` is the chapter's centre.
- "The sky settles": as chapter 11 enters, the `ReportSky` stars stop drifting and move into
  a ring with the Sun, the Moon and the Ascendant at their true angles; the closing paragraph
  then appears in upright Newsreader, no italics; the three groups follow as cards with their
  checklists. Two moves, one easing (§9). Reduced motion: the ring is static, text visible.

### Hero (notes 15, 16)
- East on the left (chart convention). Labels "EAST · RISING" with the small line "drawn facing
  south, so east is on your left", and "WEST · SETTING" with the Descendant degree.
- The Moon render is unchanged. The Sun is the Owner's render at about 120 px; its glow is one
  radial gradient (four stops, transparent at about 1.6 Sun diameters), nothing clips it.
  Asset: a true-alpha 512 px export is needed; the supplied file has a checkerboard baked in.
- Name: ≤ 14 characters at 64 px; ≤ 26 at 48 px; longer wraps to two balanced lines at 40 px.
  The halo under the name is an ellipse fitted to the text box, a radial gradient from 85%
  ground to 0, never a blur. A body label that would cross the name plate moves outside the
  ring on its spoke with a leader; bodies never move.

### While it writes (note 5)
- The page opens as soon as the chart exists: hero and explorer live, chapters streaming in.
  `GET /api/reports/:id/status` returns per-section state and the interpretation so far; the
  page store writes each section as it lands; the chapter rail shows chapters still writing.
  No change to the words, no lab run.

### Removals (note 14, 16)
- `BirthLocationHorizon` and the trailing "Saved to your account · Export Report as PDF" block
  are deleted. Export stays in the top bar.

### Your Path (notes 17, 18)
- New section `path`, chapter 10, 250 to 300 words: `fallBackOn` (South Node), `headedToward`
  (North Node), `tenderSpot` (Chiron), plus `claims`. No fate, no karma, no "wounded healer".
  A fixed two-sentence glossary explainer opens the chapter; the rail shows the nodal axis on a
  small wheel with Chiron marked. Known limit recorded: Chiron is a mean-elements approximation.

### Word range (note 18)
- Product target becomes **3,500 to 5,500 words**. Updated at lock and in the round: CLAUDE.md
  line 4, MASTERFILE §4, `api/src/prompts/prompts.test.ts`, `scripts/src/report-lab.ts`
  `REPORT_TOTAL`, the bible, and MB-38's bands widen inside the new range.

## Out of scope

- Synastry (MB-9); "You connect best with" is a note.
- A real Chiron ephemeris; the Placidus view (MB-28); light mode; the landing page.
- A "tonight's sky" waiting plate (kept as a later keepsake idea).

## Acceptance criteria

1. Chapter 02 renders no `HouseGrid`; at 1280×800 wheel and card are fully visible without
   scrolling; the 4th house back of the Owner's chart scrolls inside the card at fixed height.
2. On load house 1 is lit, the card shows its front with the Ascendant marker and degree and
   the hint; after one tap the hint is gone and stays gone on reload.
3. Selecting house 4 after flipping house 1 shows house 4's front.
4. On the `marie-curie` fixture every front lists its occupants including any of ☊ ☋ ⚷; every
   quiet house reads "Quiet house · Influenced by {ruler}, ruler of {sign}"; no card reads
   "No planet sits here"; the kicker is exactly "{Nth} house · {Sign}".
5. The 1st house back opens with `triad.rising` and its superscripts; the Sun's and the Moon's
   houses open with `triad.sun` and `triad.moon`; no "Core Triad" chapter exists.
6. `interpretation.houses` has twelve readings of 40 to 70 words, each ending on a
   "Behaviour check:" sentence, none naming a body outside the house or its ruler.
7. No "Elemental Profile" chapter; chapter 02's second screen shows concentration, temperament,
   the balance bars and the Mind note.
8. For a chart whose rising sign differs from its ruler's sign, the rising claims include an
   `angle` reference labelled "Ascendant · {deg}° {sign}".
9. Ticking a checklist item, reloading in another browser as the same owner, shows it ticked;
   `PATCH /api/reports/:id/workbook` is in `openapi.yaml` and rejects a non-owner with 404.
10. Prose chapters show actions in the rail at ≥ 960 px; Superpowers and Paradox cards show
    theirs inside, open; "A way through" labels every invitation.
11. `chapterAccent(i)` ignores the chart; no two adjacent chapters share a hue.
12. Chapter 11: the stars gather into a ring with three bodies at true angles, then the closing
    appears upright; under reduced motion the ring and text are static and present.
13. Hero: the Sun is the supplied render with alpha, the Moon unchanged; a 30-character name
    wraps to two lines with the halo fitted; no label crosses the name plate.
14. With the API slowed, the page shows the hero and explorer before any chapter, and chapters
    appear one by one; the rail marks the ones still writing.
15. `BirthLocationHorizon` and the trailing CTA are gone; chapter 10 "Your Path" exists.
16. The report lab run on the five fixtures is pasted in the round report; total words within
    3,500 to 5,500; cost under 35 cents.
17. Typecheck, both builds, unit tests, `db:bootstrap` clean, codegen, Vercel preview smoke.

## Screens

All in the artifact: the explorer with the real wheel; 1st and 4th house backs with the
triad text; three sample readings; the Deepdive screen; the evidence card before and after
`angle`; Career with the rail and workbook; the Superpowers box with its open checklist; the
paradox card with "A way through"; the label options; eleven accent chips; the coda animation
itself; the hero for Alex and for Maria Salomea Skłodowska-Curie; the streaming page.

## Open questions (each with a default)

1. **Where actions live.** Beside prose, inside a card; or everything inline. Default: the rule.
2. **The closing.** The sky settles; Dawn; The wheel turns. Default: the sky settles.
3. **While it writes.** Progressive, chart first; or a tonight's-sky plate. Default: progressive.

## Decisions to record

1. **Eleven chapters.** Core Triad's text lives on the house cards; Elemental Profile becomes
   the balance rail in the Deepdive; Your Path is chapter 10. Supersedes the chapter list.
2. **House cards are generated.** `houses[n].reading` is model-written and grounded like a
   section; structural lines are code. Supersedes ADR-18 for house cards only; the UI still
   writes no prose.
3. **The Ascendant and Midheaven are evidence** (`angle`).
4. **Chapter accents are fixed by chapter, not by element.** Supersedes the accent line of the
   natal-report-ui lock.
5. **Asides: beside prose, inside a card.** Checklist means do; accent prose means sit with.
   Ticks are saved on the report as the reader's workbook.
6. **East on the left.** The hero ring is a chart and keeps the chart convention.
7. **The report opens when the chart exists.** Chapters stream in; the chart is the wait.
8. **Word range 3,500 to 5,500.** Supersedes the 4,000 to 4,500 target of 2026-09-17.
