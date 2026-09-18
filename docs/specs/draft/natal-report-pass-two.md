# Natal report, pass two

Ideation 2026-09-18 with the Owner from the Notion page "Review 18 Sept" (sixteen notes,
sixteen screenshots) against the R03 build. Artifact, drawn from the Owner's own chart
computed by the app's engine: https://claude.ai/artifact/5Er5qfQVMn2DYkuyGGdPJs.
Status: **draft**. Builds on `docs/specs/locked/natal-report-ui.md` and supersedes two of its
lines (chapter accent, house-card copy source).

## Scope

### The chart explorer (notes 1, 2, 4)
- Chapter 02 is `min-height: 100svh`; the wheel and one house card are vertically centred.
  The 12-card `HouseGrid` is removed from the page; the print placement table stays.
- Default state: house 1 selected and lit on the wheel, the card on its **front**, one hint
  line above it ("Tap a house on the wheel · tap the card to read"). The hint hides after the
  reader's first tap and stays hidden for that browser.
- Selecting a house on the wheel always shows that house's front; the card flips only on its
  own tap. This replaces the `open` prop whose value never changes.
- The card has one fixed height on desktop, tied to the wheel's rendered height; the reading
  scrolls inside the card. Below 900 px wheel and card stack, wheel first, card `max-height`
  with the same inner scroll. One `HouseCard` component for every later use.
- Front occupant row: planet renders, plus the North Node, South Node and Chiron as drawn
  points; the 1st house always shows the Ascendant as an open marker with its degree.
- Empty house: "Quiet house" and "Influenced by {ruler}, ruler of {sign} · in {sign} · {house}"
  replace "No planet sits here". Points alone do not make a house loud.
- Footer "From your report" becomes "Read chapter · {title} →" when the house has a chapter
  (1→Core Triad, 2→Money, 3→Mind, 4→Family, 5 and 11→Your Path, 7→Relationships, 10→Career),
  scrolling to that chapter; otherwise the footer shows the quadrant only.

### House readings, generated (note 3)
- A new section `houses` in the brain: one call, twelve readings of 40 to 70 words, schema
  `{ houses: [{ house: 1..12, reading }] }`, run in the parallel wave. No claims: the card is its
  own evidence.
- Prompt rules: planets in the house first and what their **combination** does here, in one
  move rather than one sentence per planet; at most one sentence for the sharpest aspect among
  them; a quiet house reads through its ruler's condition; nodes and Chiron are named as points.
  May name planets; names the sign only for a quiet house.
- `validate`: a reading may name only bodies that sit in that house or rule it.
- The card back shows the reading under the house question. `personalPlanets` and
  `angleMeanings` stop feeding the card; they stay in the interpretation for the print table.

### Balance moves into Overview (note 5)
- Chapter 03 "Elemental Profile" is retired. The element and modality bars, dominant pair and
  chart shape become a rail aside beside Overview's temperament paragraph.
- `overview.temperament` reads the dominant element and modality in plain words, cited.
  `mind.howYouDecide` reads the modality (the "fixed sign, hard to change your mind at the
  last moment" register), cited to the placements that carry it.

### The Ascendant becomes citable (note 6)
- Sixth evidence kind `angle` `{ angle: "ascendant" | "midheaven", sign }` in
  `EvidenceRefSchema`, `validateClaims`, `labelEvidence`, `CLAIMS_CONTRACT` and the glossary.
- `triad.ts` names the rising sign as the primary evidence for the rising part, the chart
  ruler second. `career.ts` may cite the Midheaven the same way.

### The aside rail (notes 7, 8, 10, 11, 12)
- Every chapter is two columns at ≥ 960 px: prose at 64 ch, a sticky 19 rem rail. Below that
  the rail follows the prose.
- Register rule, applied everywhere: **a checklist is something to do; accent-coloured prose is
  something to sit with.**
  - Action: `actions[]` render as a tickable checklist in the rail, labelled "What to do" or
    "Practice this week"; `mind.practice` becomes one checklist item. Ticks persist in
    `localStorage` keyed by report id (MB row raised for server-side persistence).
  - Fit note: new `career.workThatFits` and `relationships.whoFits`, three to four short
    items each, no claims, rendered as accent-dot lists in the rail. `whoFits` names the kind
    of chart a partner tends to carry, from the 7th sign and ruler, the Descendant, Venus and
    Mars; tendency, never promise (R-5.2).
  - Invitation: `paradoxes[].invitation` stays inline in the paradox card, accent-coloured,
    labelled "Invitation".
  - Closing: `focus.closing` and `overview.bridge` stay the large italic serif.
- Superpowers: V1, each box's checklist sits in the rail at the box's own height.
- Style contract, shared: a `why` clause says what the action trains, in the words a friend
  would use, no figurative pairings, no coined phrases ("pleasure with witnesses"). The report
  lab's style check flags a `why` with no verb.

### One accent per chapter (note 9)
- `chapterAccent()` returns a fixed hue by chapter index; six hues over twelve chapters, no
  two neighbours alike, identical for every reader: 01 indigo `#5C6BC0`, 02 cerulean
  `#3F8FD2`, 03 violet `#9575CD`, 04 teal `#3FA796`, 05 rose `#D9668A`, 06 plum `#B565A7`,
  then the same six again for 07 to 12.
- Element hues stay reserved for element data; brass stays reserved for chart geometry.

### The closing (note 13)
- `focus.ts`: each group trims to three bullets; `closing` is the chapter's centre.
- Layout V1 "Bookend": the hero's brass ring returns, small, with Sun, Moon and Ascendant at
  their true angles; the closing paragraph under it, large, italic, centred; the three groups
  as three short cards below, their bullets as one checklist in the rail.

### Hero (notes 15, 16)
- The Sun on the ring is the Owner's render at about 128 px with a warm radial glow behind
  it into the ground; starfield and near-black ground unchanged. Needs a true-alpha 512 px
  export; the supplied file has a checkerboard baked in.
- East stays on the left (chart convention; the chapter 02 wheel cannot change). Labels
  become "EAST · RISING" with "drawn facing south, so east is on your left" and
  "WEST · SETTING" with the Descendant degree. Open question 1 can reverse this.

### Removals (note 14)
- `BirthLocationHorizon` and the "Saved to your account · Export Report as PDF" block after
  the methodology strip are deleted. Export stays in the top bar.

### Your Path (notes 17, 18)
- New section `path`, 250 to 300 words, chapter 11, before Focus: `fallBackOn` (South Node),
  `headedToward` (North Node), `tenderSpot` (Chiron), plus `claims` citing the three
  placements. No fate, no karma, no "wounded healer" label; Chiron is the place of persistent
  vulnerability that becomes skill for others (vocabulary entry already says so).
- A fixed two-sentence explainer in the glossary opens the chapter (nodes as what you fall
  back on versus what you are here to learn). The rail shows the nodal axis on a small wheel
  with Chiron marked.
- Known limit recorded: Chiron is a mean-elements approximation; sign and house hold except
  within a degree of a cusp.

## Out of scope

- Server-side persistence of checklist ticks (Mailbox row; localStorage for now).
- Synastry itself (MB-9); `whoFits` is a note, not a feature.
- A real Chiron ephemeris.
- The Placidus view (MB-28), the loading animation, light mode, the landing page.
- Raising the product word target; the reading lands in range with Your Path added.

## Acceptance criteria

1. Chapter 02 renders no `HouseGrid`; at 1280×800 the wheel and card are fully visible without
   scrolling inside the chapter; the card's reading scrolls inside the card for the 4th house
   of the Owner's chart (three planets) without changing the card's height.
2. On load, house 1 is lit on the wheel and the card shows its front with the Ascendant marker
   and degree; the hint line is present; after one tap it is gone and stays gone on reload.
3. Selecting house 4 after flipping house 1 shows house 4's front.
4. For the `marie-curie` fixture, every house card front lists its occupants including any of
   ☊ ☋ ⚷ in that house; every empty house reads "Quiet house" and names its ruler, the ruler's
   sign and house; no card reads "No planet sits here".
5. `interpretation.houses` has twelve entries; each reading is 40 to 70 words and names no body
   outside the house or its ruler (the validator rejects otherwise); the card back shows it.
6. No chapter titled "Elemental Profile"; Overview's rail shows the four element bars, three
   modality bars, the dominant pair and the shape from `chartData`.
7. For a chart whose rising sign differs from its ruler's sign, the triad's rising claims
   include at least one `angle` reference labelled "Ascendant · {deg}° {sign}".
8. At ≥ 960 px every chapter has a rail; every `actions[]` item renders as a checklist item
   with a checkbox; ticking one survives a reload; below 960 px the rail follows the prose.
9. `career.workThatFits` and `relationships.whoFits` have three to four items each and render
   in the rail; `paradoxes[].invitation` renders inline, in the chapter accent, labelled.
10. `chapterAccent(i)` returns the fixed hue for `i` regardless of chart; no two adjacent
    chapters share a hue; `git grep` of the element hexes returns only element-data code.
11. Chapter 12 opens with the ring; the closing paragraph precedes the three groups.
12. The hero Sun is the supplied render with alpha; `EASTERN HORIZON` and `WESTERN HORIZON`
    strings are gone; `BirthLocationHorizon` and the trailing CTA are gone.
13. Chapter 11 "Your Path" exists with three parts and claims; the report totals 3,780 to
    4,300 words excluding house readings.
14. Report lab run on the five fixtures pasted in the round report (R-4.4); per-section bands
    widened per MB-38 in the same round. Cost stays under 35 cents a report.
15. Typecheck, both builds, unit tests, `pnpm report:lab --compare`, Vercel preview smoke.

## Screens

All in the artifact: the explorer with the front and the scrolling back; three sample card
backs (three planets, quiet with the Ascendant, planet plus point); Overview with the balance
aside; the evidence card before and after `angle`; Career with the rail; Who fits and the
labelled invitation; three Superpowers layouts; the twelve accent chips; three closing
directions; the hero with the sun and both east conventions; the removals; Your Path.

## Open questions (each with a default)

1. **East.** Keep east on the left and fix the label, or mirror the hero to a compass?
   Default: keep the chart convention.
2. **Superpowers layout.** V1 rail per box, V2 folded in the box, V3 one list at the end.
   Default: V1.
3. **Closing.** V1 Bookend, V2 Horizon, V3 Three lines. Default: V1.

## Decisions to record

1. **House cards are generated.** The reading on a house card is a model-written field
   (`houses[n].reading`) grounded like every section; the structural lines (occupants, points,
   Ascendant, quiet house, ruler) are code. Supersedes ADR-18's "house copy comes only from
   fields the report already emits" for house cards only; the UI still writes no prose.
2. **The Ascendant and Midheaven are evidence.** `angle` is the sixth evidence kind.
3. **Chapter accents are fixed by chapter, not by element.** Six hues, twelve chapters, same
   for every reader. Supersedes the accent line of the natal-report-ui lock.
4. **Two registers for asides.** Checklist means do; accent prose means sit with. Actions,
   fit notes and balance live in the rail; invitations and closings stay inline.
5. **Elemental Profile retires; Your Path arrives.** Twelve chapters, nodes as one axis and
   Chiron as colour, no fate or karma.
6. **East on the left.** The hero ring is a chart and keeps the chart convention (pending
   question 1).
