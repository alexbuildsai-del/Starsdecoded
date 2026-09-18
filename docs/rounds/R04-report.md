# R04 report — eleven chapters, generated house cards, the workbook, dawn

Built 2026-09-18 on `claude/focused-feynman-bc4lhs` from `docs/rounds/R04-plan.md`
(`docs/specs/locked/natal-report-pass-two.md`, ADR-20 to 28). Seventeen cards, all shipped.
66 files, +3,141 / −1,439.

## Shipped

- **R04-01 `houses` and `path` registered, `PROMPT_VERSION` v5** — USER-FACING. Twelve reader-facing
  sections; the engine tolerates a claimless section; the house validator rejects a reading naming
  a body neither placed in that house nor its ruler.
- **R04-02 the contract** — INTERNAL. `required: [meta]`, so one schema serves both routes; the two
  new sections, the two registers, the `angle` kind, `chartReady`, `sections`, the partial
  interpretation, `Report.workbook`, `PATCH /reports/{id}/workbook`.
- **R04-03 accents, the Sun, the shells** — USER-FACING. `chapterAccent(i)` is fixed by chapter and
  identical for every reader, freeing the element hues for the balance bars; the 512 px Sun is keyed
  from the Owner's render; `index.css` gained the round's class shells.
- **R04-04 the checklist and the workbook store** — USER-FACING. One checklist, four headings,
  never folded; a tick is optimistic, one shallow PATCH, rolled back on failure.
- **R04-05 the Ascendant is citable** — USER-FACING. A sixth evidence kind, checked against the computed angle, labelled `Ascendant · 12.1° Capricorn`.
- **R04-06 temperament names the pair** — USER-FACING. Dominant element and modality in plain words, cited; `mind.howYouDecide` reads the modality.
- **R04-07 the registers and the bands** — USER-FACING. Career paths, who you connect best with, three bullets a group, bands summing 4,180–5,410, a why-clause rule.
- **R04-08 the lab** — INTERNAL. New total band; no claim count for a claimless section; a why with no verb flagged; each house reading measured for words and its behaviour check.
- **R04-09 the workbook column and the streaming writes** — INTERNAL. `reports.workbook` with its
  idempotent bootstrap step, the PATCH route, generation writing each frame as it lands.
- **R04-10 the chart explorer** — USER-FACING. Wheel and one card in normal flow, house 1 lit, an angle is an occupant, the back leads with the triad text then the reading.
- **R04-11 the angle gloss** — USER-FACING. One general sentence per angle on the evidence card.
- **R04-12 the hero** — USER-FACING. East on the left with the reason under it, the Descendant
  degree, no spokes, labels placed by a tested solver, the Sun's glow uncut under the bar.
- **R04-13 beside prose, inside a card** — USER-FACING. Two columns above 960 px with a sticky
  rail; card chapters keep their checklists inside; "A way through" labels every invitation.
- **R04-14 dawn in the corner** — USER-FACING. One CSS variable, no timers, final frame on reduced motion.
- **R04-15 the balance rail, Your Path, the nodal axis** — USER-FACING.
- **R04-16 open at the chart** — USER-FACING. The fake progress model is gone; the page opens at
  `chartReady`, merging each section from `/status`.
- **R04-17 the page assembled** — USER-FACING. Eleven chapters, Export PDF held back while
  writing, `BirthLocationHorizon` and the trailing CTA gone, leaflet dropped (150 kB).

## Deviations

- No PATCH route test: nothing here can run a route that imports `db` (MB-48). `NatalWheel` keeps
  its side-panel split only when given a panel. `demoChart.ts` gained the two angles `ChartData`
  now requires; it is unused and fabricated (MB-49). `EvidenceCard` needed no change.
- The first lab run failed day-angular and high-latitude: house readings named a planet from
  another house. Fixed in #50 with a per-house whitelist in the prompt.
- The bootstrap seeded a copy of every prompt default and the loader let the row win, so no
  prompt change in code had reached staging since 16 Sept. The seed is gone; bootstrap step 6 clears
  natal overrides on a `PROMPT_VERSION` bump (MB-50, done). Fixed in #50.
- Owner review on staging, fixed in #50 (USER-FACING): Your Path explainer rewritten from the
  Owner's nodes text; "You connect best with" names partner placements as the artifact showed;
  the hero's glow and halo gradients end inside their boxes; below 900 px the ring, legend and
  scroll cue stack, both horizon labels draw, the cue reads in brass.

## Gate

`install --frozen-lockfile` · `typecheck` · `build:web` · `build:api` · unit tests (api 66/66, web
33/33, db ok) · codegen leaves no diff · `db:bootstrap` verified by the staging deploy (smoke run 44,
database probe ok). **Report lab**, remote against staging, five fixtures, run 35369377981 on
`6b5a5c2` (branch `report-lab/r04b`): day-angular 5,054 words · 37.4 ¢ · retries foundation,
overview, discoveries; high-latitude 5,101 · 30.2 ¢ · overview; marie-curie 5,388 · 28.2 ¢ · none;
night-angular 5,091 · 28.7 ¢ · none; oprah-winfrey 5,122 · 30.7 ¢ · money. Mean 31.0 ¢, every total
inside 3,500–5,500, `houses` one try on every chart, so MB-46's lever stays unused. Flags: house
readings run 71–79 words on 3 of 12 per chart against the 70 cap, one semicolon in two charts, a
why without a verb once per chart; bands for mind, money, family and houses sit above their
maxima and superpowers below, the MB-38 pattern at the new range. First run 35347276407 failed
two fixtures on the house validator and measured v4 prompt text (below); superseded.

## Mailbox

MB-38 done (bands widened, lab pasted); MB-50 raised and done; MB-13 annotated (the Sun ships as
the keyed derivation); MB-43 to 47 built at their defaults; MB-48 and MB-49 added.
