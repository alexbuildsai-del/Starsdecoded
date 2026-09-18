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

- No PATCH route test: nothing here can run a route that imports `db`, and that harness belongs to
  no card. The merge and key rules are unit-tested on the web side instead (MB-48).
- `NatalWheel` keeps its side-panel split only when given a panel. One line, needed because the
  explorer lays the card out itself; the plan had marked that file untouched.
- `demoChart.ts` gained the two angles `ChartData` now requires; it is unused and fabricated,
  which R-3.1 forbids (MB-49). `EvidenceCard` needed no change: the chip already renders `k angle`.

## Gate

`install --frozen-lockfile` · `typecheck` · `build:web` · `build:api` · unit tests (api 66/66, web
33/33, db ok) · codegen leaves no diff. All green. **Report lab: pending** — the parent session runs
it through the `Report lab` workflow, remote mode against staging, after merge, and pastes it in a
follow-up commit, applying MB-46's lever if the run lands over 35 cents. **`db:bootstrap`:
pending** — verified by the staging Railway deploy, which runs it at start. Neither ran here: this
container has no `DATABASE_URL` and no `OPENAI_API_KEY`.

## Mailbox

MB-38 stays `decided` until the lab is pasted; MB-40 needed nothing; MB-13 annotated (the Sun
ships as the keyed derivation). Added MB-48 and MB-49. MB-43 to 47 built at their defaults.
