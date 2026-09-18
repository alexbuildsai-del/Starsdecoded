# R04 report — eleven chapters, generated house cards, the workbook, dawn

Built 2026-09-18 on `claude/focused-feynman-bc4lhs` from `docs/rounds/R04-plan.md`
(`docs/specs/locked/natal-report-pass-two.md`, ADR-20 to 28). Seventeen cards, all shipped.
66 files, +3,141 / −1,439.

## Shipped

- **Brain** (R04-01, 05, 06, 07) — USER-FACING. `houses` and `path` registered, `PROMPT_VERSION` v5, the engine tolerates a claimless section, the house validator rejects a body neither placed in the house nor its ruler; the Ascendant is a sixth evidence kind labelled `Ascendant · 12.1° Capricorn`; temperament names the dominant element and modality, `mind.howYouDecide` reads the modality; career paths, who you connect best with, three bullets a group, bands summing 4,180–5,410, a why-clause rule.
- **Contract and API** (R04-02, 09) — INTERNAL. `required: [meta]` so one schema serves both routes; the two sections, the two registers, the `angle` kind, `chartReady`, `sections`, the partial interpretation, `Report.workbook`, `PATCH /reports/{id}/workbook`; `reports.workbook` with its idempotent bootstrap step; generation writes each frame as it lands.
- **Lab** (R04-08) — INTERNAL. Total band 3,500–5,500, no claim count for a claimless section, a why with no verb flagged, each house reading measured for words and its behaviour check.
- **Shared web** (R04-03, 04) — USER-FACING. `chapterAccent(i)` fixed by chapter for every reader, the 512 px Sun keyed from the Owner's render, the round's class shells; one checklist with four headings, never folded, ticks optimistic with one shallow PATCH and rollback.
- **Explorer, hero, chapters** (R04-10 to 16) — USER-FACING. Wheel and one card in normal flow, house 1 lit, an angle is an occupant, the back leads with the triad text then the reading; one general sentence per angle on the evidence card; the hero with east on the left, the Descendant degree, no spokes, labels placed by a tested solver, the glow under the bar; two columns above 960 px with a sticky rail, card chapters keep their checklists inside, "A way through" labels every invitation; dawn in the corner on one CSS variable with no timers; the balance rail, Your Path and the nodal axis; the page opens at `chartReady` and merges each section from `/status`.
- **Assembly** (R04-17) — USER-FACING. Eleven chapters, Export PDF held while writing, `BirthLocationHorizon` and the trailing CTA gone, leaflet dropped (150 kB).

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
