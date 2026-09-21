# R05 plan — ten chapters, the horizon as a status, and the compatibility report

Planned 2026-09-19 on `claude/plan-r05-v6i0az`. Revised the same day after the Owner's answer to
the two scope questions ("I would build both points in this build, unless there is a critical risk
of regression"): **R05 carries all three locked specs in full** —
`docs/specs/locked/natal-report-pass-three.md` (ADR-46 to 51),
`docs/specs/locked/unknown-birth-time.md` (ADR-33 to 38) and
`docs/specs/locked/compatibility-report.md` (ADR-39 to 45). MB-53 and MB-54 are decided by that
answer and recorded. No QA reports exist; the R04 staging review became the pass-three lock.

## Regression verdict

No card leaves the round. One DDL statement does: the compatibility spec deletes
`credits.credit_type` and the typed bundle definitions, which is an irreversible drop of a NOT NULL
column under live rows in a round that has no payment ledger to re-derive them from, and the
payments round rewrites that table anyway. R05 therefore makes the column nullable with a default,
stops reading it, and makes bundles counts **in code** (R05-14); the drop ships with payments
(MB-57). Two acceptance criteria are deferred with it, not built and hidden: compatibility
acceptance 2 (no credit → checkout → same selection) has no checkout to open, so the CTA ships in
its has-credit state on the soft credit pass the natal report already runs on, with a
`// MB-6 provisional` seam holding the selection; and the unknown-birth-time gift mode 2 (a shared
unspent credit) is out of scope in its own spec. Everything else builds.

**Mailbox rows above 2 rounds open after this plan's increment.** At 4: MB-5, 6, 8, 11, 12, 13,
15, 17, 19, 20, 21, 22, 23, 24, 25, 30. At 3: MB-31 (blocking, legal entity), 32, 33, 35, 39.
None blocks this round. MB-5 and MB-6 now gate only the two deferrals above.

**Numbering note for builders.** `unknown-birth-time.md` calls the credit rules MB-49; in Notion
that row is **MB-52** (MB-49 is the route-test harness, MB-50 `demoChart.ts`). The R04 report's
MB-48 and MB-49 mean MB-49 and MB-50.

## Preconditions

1. `round/R05` branches from this branch. Every builder reads MASTERFILE §0 plus the sections its
   card names, and the artifact its card names, read for geometry, copy and timing, never ported
   literally: pass three https://claude.ai/artifact/HKt4HYfKKmwadcKTmTxWob · unknown birth time
   https://claude.ai/artifact/GicHa2umwRm5rQDuWVLp9p · compatibility https://claude.ai/artifact/AmsN9XxzbU81Ek18dAsBuk.
2. Shapes pinned below are the contract between parallel cards. A builder who needs to change one
   stops and raises it (R-0.1).
3. Single owners, enforced: `packages/api-spec/openapi.yaml` → R05-02 · `packages/db/src/schema` and
   `scripts/bootstrap-db.sh` → R05-03 · `api/src/lib/chartCalculation.ts` → R05-04 ·
   `web/src/index.css` → R05-05 · `api/src/lib/aiInterpretation.ts` → R05-07 ·
   `api/src/routes/reports.ts` → R05-10 · `web/src/components/report/ReportHero.tsx` → R05-27 ·
   `ChartExplorer.tsx` + `HouseCard.tsx` + `NatalWheel.tsx` → R05-28 · `web/src/App.tsx` and
   `DashboardPage.tsx` → R05-30 · `ReportPage.tsx` → R05-31.
4. Inside a wave a card may land before the card it imports from; the wave's end state compiles and
   the orchestrator accepts a red intermediate, as in R04.

## Pinned shapes

- **Natal registry**: `overview, triad, houses, mind, career, money, relationships, family,
  superpowers, discoveries, focus` (eleven, `path` gone; `ALL_SECTIONS.length === 12`).
  `PROMPT_VERSION = "v6"`. Bands unchanged, so the sums test reads 3,930–5,110.
- **Chapters** (ten): 01 Chart Overview · 02 Natal Chart Deepdive · 03 Mind · 04 Career · 05 Money ·
  06 Relationships · 07 Family · 08 Superpowers · 09 Paradoxes · 10 **Closing**. `TOTAL` 10.
  `chapterAccent(10)` already returns teal `#3FA796`. `HOUSE_CHAPTER` loses houses 5 and 11.
- **`/status`** (both report types): drops `progress` and `currentStep`; gains
  `provisional: { bodies: Record<string, { absoluteDegree: number, retrograde: boolean }> } | null`
  while `chartReady` is false, from one local chart call on the entered date and time at offset 0,
  no geocoding, nothing stored; `sections` keys come from the registry the report's type uses.
- **Progress** (pure): 4 at report exists, 10 at `chartReady`, then 90 ÷ n per landed section
  (n = 11 natal, 10 pair); labels "Analysing your inputs" → "Computing your chart" → "Finding the
  patterns" → "Writing your report" → "Ready"; `door = real ≥ 67 && overview && houses done`
  (natal) or `≥ 67 && howYouMeet && twoCharts done` (pair), never the crept value; the creep is
  capped one point below the next milestone (MB-55 default). One percentage, never a count.
- **Orrery**: rings outward Moon, Mercury, Venus, Sun, Mars, Jupiter, Saturn, Chiron, Uranus,
  Neptune, Pluto; nodes on the Moon's ring; mean daily motion 13.176, 4.092, 1.602, 0.9856, 0.524,
  0.0831, 0.0335, 0.0193, 0.0117, 0.00598, 0.00397, nodes −0.053; 1 s = 8 days; retrogrades run
  backwards; the settle eases each body onto its stored degree, the Moon at most 8°.
- **Gather**: `ReportSky` takes `gatherTo?: { cx, cy, r } | null` in CSS pixels and runs once when
  it turns non-null: ≤ 150 stars, 1.6 s, one easing, inside the existing paint loop, and they stay.
- **Birth time**: `profiles.birth_time_window_minutes` integer, 0 exact, 180 part of day, 720
  unknown, centre in `birth_time`; `profiles.timezone` text, IANA name;
  `offsetAtBirth(zone, date, time)` derives hours east of UTC with `Intl.DateTimeFormat`, fractions
  unrounded, and a profile with no zone keeps its stored numeric offset. `CHART_VERSION = 3`.
- **Horizon**: `chartData.horizon = { status: "known" | "approximate" | "unknown", ascendant,
  midheaven, sect, moonSign, sunSign }`, each `{ value, holds: boolean, flipsAt: string[] }`.
  Known when ascendant, midheaven and sect all hold across the band; approximate is known with a
  window; otherwise unknown, and then `angles`, `houses`, `sunAltitude`, the lots and every `house`
  field are **absent**, not zero, and typed optional so a consumer cannot read them.
- **Blind report**: `skipWhenBlind: true` on `triad.rising`'s rule, `houses` and `angleMeanings`;
  claims of kind `angle`, `ruler`, `sect`, `lot` rejected, and a `placement` ref carrying a house
  rejected; brief's ANGLES line becomes `HORIZON: unknown`; `meta.horizon` mirrors the chart.
- **The pass**: `PATCH /api/profiles/:id/birth-time` (time, window), owner only → report status
  `complete → revising → complete | failed`; one amendment call per stored section returning
  `{ amendments: [{ quote, replacement, evidence }], additions: [{ after, text, claims }] }`, at
  most three and one, applied by exact quote match after `CitedText`'s softening, unmatched quotes
  dropped and logged, claims re-validated; the previous interpretation and chart land in
  `report_revisions`; `reports.horizon_passes` counts, the first pass free (MB-52).
- **Pair**: keys `pair:foundation, pair:howYouMeet, twoCharts, twoWays, whereItFlows, whereItRubs,
  howYouTalk, lensOne, lensTwo, whatToPractise` plus `pair:links` for the bi-wheel cards;
  `PAIR_PROMPT_VERSION = "p1"`; bands sum 3,000–4,500; lens `partners | parent_child | family`;
  evidence kinds `cross { planetA, planetB, aspect, orb }` or `{ planet, of, inHouseOf, house }`
  and `source { report: "A" | "B", section, claim }`, a `source` that does not resolve is rejected.
- **Compatibility storage**: `reports.type = "compatibility"` with `relationship_id`, created by
  `POST /api/compatibility` (two report ids, lens, optional label), read by `GET /reports/:id` and
  `/reports/:id/status` like a natal report, so streaming, the overlay and the workbook come free.
  Old `type = "synastry"` rows are left where they are and never listed (MB-58).
- **Credits**: one kind. `credit_type` becomes nullable with default `natal` and is read nowhere;
  `consumeCredit(userId, reportId)` loses its type argument; `BUNDLE_DEFINITIONS` becomes counts
  `{ solo: 1, couple: 3, family: 5 }`. The column and the typed bundles drop with payments (MB-57).

## Goals

1. **Ten chapters, the last one Closing.** `path` retired from the generator, the contract and the
   page; v6; the rail lists chapters only. Pass three acceptance 3, 4. ADR-46, 50.
2. **The report opens when the reader chooses.** One page and one overlay, real progress, the
   orrery that settles onto the stored chart, the door at 67%, skeletons, one sky and the gather,
   the R03 angle glyph, a silent tick, the Sun free of its column. Acceptance 1, 2, 5 to 11.
   ADR-47, 48, 49, 51.
3. **The horizon is a status, not a guess.** Three-way intake with a live readout, the offset in
   force at birth, a chart that carries no angle it cannot prove, a blind report whose frame says
   so. Unknown-birth-time acceptance 1 to 4, 7. ADR-33, 34, 37.
4. **Adding the time is a pass, not a regeneration.** Quote-matched amendments with evidence, the
   marks and the ledger, the previous text kept, the claim page asking the question. Acceptance 5,
   6. ADR-35, 36, 38.
5. **The compatibility report.** Two finished natal reports in, one report out, three lenses, nine
   chapters, the bi-wheel with generated link cards, no score, one credit like any report.
   Compatibility acceptance 1, 3 to 11. ADR-39 to 45.

## Task cards

### R05-01 Natal registry: `path` retired, v6, blind-skippable sections — USER-FACING · Opus
Objective: eleven sections, the version bump, and the flag the blind report reads.
Files: `api/src/prompts/index.ts`, delete `api/src/prompts/sections/path.ts`,
`api/src/prompts/sections/triad.ts`, `houses.ts`, `api/src/prompts/prompts.test.ts`,
`packages/db/scripts/migrate-drop-dead-prompt-keys.ts`.
Refs: pass three "Ten chapters"; unknown-birth-time "The blind report" (registry clause); ADR-46,
ADR-34; MASTERFILE §4, R-4.3, R-5.3; Pinned shapes (registry, blind report).
Changes: `path` and its schema go; `PROMPT_VERSION = "v6"`; `SectionSpec` gains
`skipWhenBlind?: true` and `blindRules?: string[]`, set on `houses` (whole section) and on `triad`
(the rising rule only, which the spec text replaces when blind); `natal:path` joins the dead-key
list bootstrap already runs; `focus.ts` is not edited, its North Node line stays.
Done when: typecheck, `build:api` and api tests pass; `SECTION_IDS.length === 11` without `path`;
the sums test reads 3,930–5,110 inside 3,500–5,500; a test asserts `houses` is skipped and `triad`
keeps every other rule when the brief says the horizon is unknown.

### R05-02 Contract: openapi, codegen, web types — INTERNAL · Sonnet
Objective: every contract change of the round in one commit, so no other card touches the spec or
the generated packages.
Files: `packages/api-spec/openapi.yaml`, generated `packages/api-client-react/src/generated/*` and
`packages/api-zod/src/generated/*` (by codegen only), `web/src/types/chart.ts`.
Refs: all three specs' contract lines; Pinned shapes (`/status`, horizon, the pass, pair,
compatibility storage); CLAUDE.md "openapi.yaml is the contract"; R-7.2.
Changes: `ReportInterpretation` loses `path`, gains `meta.horizon` and optional horizon sections;
`ReportStatus` loses `progress` and `currentStep`, gains `provisional`; profile and report create
bodies gain `timezone` and `birthTimeWindowMinutes`; new `POST /horizon/preview`, `PATCH
/profiles/{id}/birth-time`, `POST /compatibility`, `GET /compatibility/{id}/summary`; `Report` gains
`revisions` and `lens`; `EvidenceRef` gains `cross` and `source`; `chart.ts` mirrors all of it, the
optional `angles`/`houses`, the pair interpretation, and `isCurrentInterpretation` wants v6 or p1.
Done when: `pnpm --filter @workspace/api-spec run codegen` is clean and committed; typecheck and
both builds pass; every route the round adds has a generated hook.

### R05-03 Schema: every column, table and migration of the round — INTERNAL · Opus
Objective: one owner for `packages/db` and the bootstrap, so eleven cards can read the shapes.
Files: `packages/db/src/schema/profiles.ts`, `reports.ts`, `relationships.ts`, `credits.ts`, new
`packages/db/src/schema/reportRevisions.ts`, `index.ts`, four new `packages/db/scripts/migrate-*.ts`,
`scripts/bootstrap-db.sh`.
Refs: unknown-birth-time "Storage", "The horizon pass"; compatibility "Lenses", "Credits"; MB-48,
MB-52, MB-57; MASTERFILE R-7.3, §3; Pinned shapes (birth time, the pass, credits).
Changes: `profiles.timezone`, `profiles.birth_time_window_minutes` (default 0);
`reports.horizon_passes` (default 0); `report_revisions` (`report_id`, `interpretation`,
`chart_data`, `reason`, `created_at`, indexed by report); `relationships.type` remapped
romantic → partners, sibling → family, custom → family, keeping `label`, and `RelationshipType`
becomes the three; `credits.credit_type` becomes nullable with default `natal`, nothing dropped.
Constraints: every script is idempotent and re-runnable; no destructive DDL this round (MB-57).
Done when: `pnpm run db:bootstrap` boots clean twice on an existing database and on an empty one;
typecheck passes; a remapped relationship keeps its participants and its label.

### R05-04 The horizon in the engine — USER-FACING · Opus
Objective: a chart that knows whether its horizon holds, and an offset that is the one in force.
Files: `api/src/lib/chartCalculation.ts`, `api/src/lib/chartCalculation.test.ts`.
Refs: unknown-birth-time "The finding that frames it", "Engine: the horizon as a status",
acceptance 2, 3, 7; MB-48; MASTERFILE R-4.1, R-4.2, R-4.6, R-3.2; Pinned shapes (birth time, horizon).
Changes: `calculateNatalChart(birthDate, birthTime, lat, lon, offsetOrZone, windowMinutes)` sweeps
the band at two-minute steps and records `horizon` as pinned with the flip times; when the horizon
is unknown the returned chart omits `angles`, `houses`, `sunAltitude` and every `house` field and
types them optional; a Moon or Sun changing sign inside the band takes the sign covering the larger
share and its orbs widen to its travel; `offsetAtBirth` as pinned; `CHART_VERSION = 3`.
Done when: api tests pass, including Marie Curie at 12:00 exact holding Capricorn 11:12 to 12:58,
the same birth as "Afternoon" naming six rising signs and the five flips, a summer birth entered in
winter (Europe/Paris, 1990-07-01) and a pre-1970 one (Europe/Warsaw, 1867-11-07, +1:24) to the
minute; a blind chart has no `angles` key at all; typecheck and `build:api` pass.

### R05-05 Web shared: the stylesheet and the accent table — USER-FACING · Sonnet
Objective: the shells and values every UI card of the round reads, landed once.
Files: `web/src/index.css`, `web/src/lib/chapter-accent.ts`, `web/src/lib/chapter-accent.test.ts`.
Refs: pass three "The sun, free of the column", "The scroll cue", "One sky", "Skeletons";
unknown-birth-time "Marks", "The ledger"; compatibility "Chapter 02"; ADR-46, 48, 51; §9.
Changes: `.rp-dawn .sun` and `.warm` become `position: fixed` in the viewport's top right on the
same `--p`, size and curve, under the chapter body, over the sky, hidden at `--p: 0` and in print,
and `.rp-dawn` loses `overflow: clip`; `.rp-hsky` drops its ground; `.rp-cue` becomes a 13 px label
at `.34em` over a 2 px stem 56 px tall with a falling point of light, no arrow, brass, 44 px hit
area; new `.rp-skel` shimmer, `.rp-open` overlay shells, `.rp-rev` brass underline and `.rp-added`
brass rule, `.rp-biwheel` sizing, each with its reduced-motion rule; `chapterAccent` drops its
ignored second parameter and its docstring reads ten chapters.
Done when: typecheck and `build:web` pass; the accent test asserts ten chapters, no two adjacent
equal, `chapterAccent(10) === "#3FA796"`, chart-independent.

### R05-06 The blind brief, the doctrine and the claim rules — USER-FACING · Opus
Objective: a brief that never hands the model a fact the hour did not settle.
Files: `api/src/prompts/brief.ts`, `api/src/prompts/system.ts`, `api/src/prompts/evidence.ts`,
`api/src/lib/traditional.ts`, `api/src/prompts/evidence.test.ts`.
Refs: unknown-birth-time "The blind report"; ADR-34, 37; acceptance 1; MASTERFILE §5, R-5.2, R-5.3;
Pinned shapes (blind report).
Changes: the ANGLES line becomes `HORIZON: unknown`, placements carry no house, sect and the lots
are omitted and `deriveTraditional` returns without them when the chart has no `sunAltitude` or
angles; the doctrine gains one rule, never name a house, the Ascendant, the Midheaven, rising, day
or night, or a lot, and the prose never mentions the missing time because the frame does;
`validateClaims` rejects `angle`, `ruler`, `sect` and `lot` and any `placement` ref with a house
when the horizon is unknown, naming the offending kind in the message.
Done when: api tests pass, including a blind Marie Curie brief with no house number and no sect
line, and a rejected `sect` claim whose message names it; typecheck and `build:api` pass.

### R05-07 Horizon-aware generation and the amendment call — USER-FACING · Opus
Objective: the generator that skips what it cannot prove, and the call that amends instead of
rewriting.
Files: `api/src/lib/aiInterpretation.ts`.
Refs: unknown-birth-time "The blind report", "The horizon pass"; ADR-35; acceptance 1, 5;
MASTERFILE R-4.3, R-4.6, R-5.5; Pinned shapes (blind report, the pass).
Changes: generation reads `chart.horizon`, skips every `skipWhenBlind` section, applies the blind
rules, writes `meta.horizon` and keeps `onSection` streaming unchanged; a new exported
`amendSections(chart, stored, brief, { onSection })` runs one schema-enforced amendment call per
stored section with the pinned shape, applies amendments by exact quote match after the softening
`CitedText` uses, drops and logs an unmatched quote, caps at three amendments and one addition,
re-validates claims, and returns the amended interpretation with a per-section count.
Done when: api tests pass, including an amendment whose quote does not match being dropped rather
than applied loosely, and a blind run producing no `houses` key and no `triad.rising`; typecheck,
`build:api` pass; `previewSectionPrompt` still works for every live key.

### R05-08 The readout: what the hour settles, before anything is paid — USER-FACING · Sonnet
Objective: the endpoint behind the live readout under the time control.
Files: new `api/src/routes/horizon.ts`, new `api/src/lib/horizonPreview.ts` (+ test),
`api/src/routes/index.ts`.
Refs: unknown-birth-time "Intake: three answers, one readout", acceptance 2, 3; Pinned shapes
(birth time, horizon); MASTERFILE R-7.1.
Changes: `POST /api/horizon/preview` takes date, place coordinates, zone, time and window, sweeps
the band with the engine and returns per fact whether it holds and the flip times, plus the derived
status; it is pure of the database, unauthenticated like the geocode path, and rate-limited by the
existing session middleware; the sweep is shared with `chartCalculation` rather than reimplemented.
Constraints: no profile is created or read; no OpenAI call; the response is small enough to poll on
every keystroke-debounced change.
Done when: api tests pass on the fixture's three cases (exact, "around noon give or take an hour",
"Afternoon") with the flips at 11:12, 12:58, 14:06, 14:56, 15:46 and 16:54; typecheck and
`build:api` pass.

### R05-09 Birth time on the profile, and the pass that amends — USER-FACING · Opus
Objective: the owner-only update and the orchestration of a horizon pass.
Files: `api/src/routes/profiles.ts`, new `api/src/lib/horizonPass.ts`.
Refs: unknown-birth-time "The horizon pass", "Credit rules"; ADR-35, 36, 38; MB-52; acceptance 5;
MASTERFILE R-3.3, R-6.1; Pinned shapes (the pass).
Changes: `PATCH /api/profiles/:id/birth-time` validates time and window, is owner-only and 404s
otherwise, and starts the pass; `runHorizonPass` writes the previous interpretation and chart to
`report_revisions`, recomputes the chart, sets `revising`, generates `triad.rising`, `houses` and
`angleMeanings`, calls `amendSections`, stores the result section by section so the page can follow
it, increments `horizon_passes`, and on failure restores the previous text and records the error;
the first pass is free and no credit is consumed this round.
Constraints: the pass never regenerates a section wholesale; profile creation accepts the window;
dedupe keys on time and window together.
Done when: api tests pass on the pass's ordering and its failure path; typecheck and `build:api`
pass; a blind fixture report run through the pass keeps every unamended sentence verbatim.

### R05-10 The report routes: provisional, revising, and two report types — INTERNAL · Sonnet
Objective: one status and one list that serve a natal and a compatibility report alike.
Files: `api/src/routes/reports.ts`.
Refs: pass three "The door at 67%"; compatibility "Engine", "Access"; MB-32; Pinned shapes
(`/status`, compatibility storage).
Changes: `progress` and `currentStep` and their tables go; `provisional` is computed only while the
profile has no chart, from one local call at offset 0, reduced to each body's degree and retrograde
flag, and returns `null` rather than failing a poll; `sections` keys come from the registry the
report's `type` names; `GET /reports` lists natal and compatibility rows and never `synastry` ones;
`GET /reports/:id` and the delete path accept a compatibility report, whose ownership resolves
through the relationship's access roles, and MB-32's 409 on a report with a relationship goes.
Done when: api tests pass; a status response for a chartless report carries thirteen bodies and no
angles, and `null` once the chart is stored; a compatibility report streams through the same route;
typecheck and `build:api` pass.

### R05-11 Pair prompts: the registry, nine chapters and the link cards — USER-FACING · Opus
Objective: the compatibility brain's words, written in full.
Files: new `api/src/prompts/pair/index.ts`, `foundation.ts` and ten section files, new
`api/src/prompts/pair/pair-prompts.test.ts`.
Refs: compatibility "Chapters", "Chapter 02", "Engine"; ADR-39, 40, 43, 44; MASTERFILE §5 (R-5.1 to
R-5.5), R-4.3; Pinned shapes (pair); artifact "the chapter list with sources".
Changes: the ten keys and `pair:links` as pinned, each with a zod schema, band and validator; the
lens sets chapters 07 and 08's titles and the example register (a weekend and a bill; bedtime and a
tantrum; a dinner and the group chat); every section tags each passage `natal` or `new`; 09 carries
three checklists, for A, for B and for both, with a why each; `pair:links` returns 40 to 70 word
readings tagged flows, rubs or overlay, ending on "Behaviour check:", naming only two bodies.
Constraints: no score, no number, no percentage anywhere in any prompt; a child's chart reads as
potential (MB-16); `PAIR_PROMPT_VERSION = "p1"`.
Done when: `build:api` and api tests pass; the bands sum 3,000–4,500; the link validator rejects a
reading naming a third body.

### R05-12 The pair brief and the overlays — USER-FACING · Opus
Objective: everything the pair prompts are grounded in, derived in code.
Files: new `api/src/lib/pairBrief.ts`, new `api/src/lib/overlays.ts`, new `api/src/lib/overlays.test.ts`.
Refs: compatibility "Engine" (pair brief); ADR-39, 43; acceptance 3, 6; MASTERFILE R-5.3;
`computeCrossAspects` in `api/src/lib/synastryCompute.ts`, unchanged.
Changes: `buildPairBrief` reads both stored interpretations and both cached charts and derives both
foundations' `chartThesis`, `dominantPattern` and `centralTension`, the cross aspects with orbs, the
whole-sign overlays in both directions, each side's `connectBestWith` and `theChallenge`, and the
lens with its register; `overlays.ts` is pure and reports a notable overlay when three or more of
one person's bodies, or a luminary, sit in one whole-sign house of the other.
Constraints: no birth data is read and no chart is recomputed; a blind chart on either side means
the overlays and every house-based line are omitted, not guessed.
Done when: typecheck, `build:api` and api tests pass; the overlay test asserts both directions on
the Curie–Winfrey pair and the luminary rule; the brief for a pair with one blind chart carries no
house.

### R05-13 Compatibility generation — USER-FACING · Opus
Objective: the pipeline that turns two finished reports into one.
Files: new `api/src/lib/pairInterpretation.ts`.
Refs: compatibility "Engine", "Credits", acceptance 4, 6, 10; ADR-39, 43, 44; MASTERFILE R-4.3,
R-4.4; Pinned shapes (pair, compatibility storage).
Changes: one foundation call (pair thesis, the three strongest links, the friction that matters, one
guidance sentence per section), then the nine sections and `pair:links` in parallel, each schema
enforced, each stored as it lands through the same `onSection` frame the natal generator uses, usage
accounted through `usage.ts` with model ids from `models.ts`; `cross` claims validate against the
computed aspects and overlays and `source` claims resolve to a stored claim in report A or B,
carrying that report's own evidence label.
Constraints: nothing in either natal report is regenerated; a failed section fails the report with
its message, never a silent degrade.
Done when: typecheck, `build:api` and api tests pass; a `source` claim pointing at a claim that does
not exist is rejected with a message naming the report and section.

### R05-14 One credit is one report — INTERNAL · Sonnet
Objective: the credits ledger reads as counts, with nothing dropped.
Files: `api/src/lib/credits.ts`, `api/src/routes/credits.ts`.
Refs: compatibility "Credits"; ADR-42; MB-57; MASTERFILE R-6.1, R-6.4; Pinned shapes (credits).
Changes: `BUNDLE_DEFINITIONS` becomes counts `{ solo: 1, couple: 3, family: 5 }`; `grantBundle`
writes that many rows with `credit_type` left at its default; `consumeCredit(userId, reportId)`
loses its type argument and takes the oldest available credit, keeping the soft pass and its warning
until payments; `creditCounts` returns one available and used pair rather than three.
Constraints: no column is dropped and no row is deleted (MB-57); the soft pass stays, because it is
what the natal report already runs on and the compatibility report runs on the same footing.
Done when: typecheck, `build:api` and api tests pass; granting a couple bundle produces three
identical credits and consuming two leaves one; `git grep -n "CreditType\|credit_type" api` returns
only the schema default and the migration.

### R05-15 The lab measures three campaigns — INTERNAL · Opus
Objective: the lab covers v6, the blind pair and the three lenses, and says what each cost.
Files: `scripts/src/report-lab.ts`, new `fixtures/charts/marie-curie-unknown.json`, new
`fixtures/pairs/curie-winfrey.json`, `fixtures/charts/README.md`.
Refs: unknown-birth-time acceptance 1, 6; compatibility acceptance 5, 8, 10; MASTERFILE R-4.4,
R-3.1, §11.4; MB-38's flags.
Changes: the natal totals lose `path`; a blind flag greps text and claims for a house number,
"rising", "Ascendant", "Midheaven", sect and lot words and fails on a hit; `--pass` runs the blind
fixture then the horizon pass and prints words kept verbatim, sentences amended, claims added and
the cost of each stage; `--pair <fixture> --lens <lens>` measures a compatibility report against
3,000–4,500 words, each link card for 40 to 70 words and its behaviour check, and flags any rating.
Constraints: the blind fixture is the same real birth data with the window at 720, no fabrication
(R-3.1); the pair fixture names two existing chart fixtures and a lens, and holds no birth data.
Done when: `pnpm report:lab --render` still reads the stored run; typecheck passes; each new flag
fires on a hand-fed violation.

### R05-16 The wheel is the sky — USER-FACING · Opus
Objective: the geocentric orrery, with pure maths behind it.
Files: new `web/src/lib/orrery.ts`, new `web/src/lib/orrery.test.ts`, new
`web/src/components/report/Orrery.tsx`.
Refs: pass three "The door at 67%" (the wheel is the sky); ADR-47; acceptance 6; §9 "The picture is
the chart"; Pinned shapes (orrery).
Behaviour: `Orrery({ provisional, chart, progress })` draws eleven rings in the pinned order,
planets as renders from `planet-renders.ts`, Chiron and the nodes as drawn points, each sweeping at
its mean daily motion at one second to eight days; when `chart` arrives each body eases onto its
stored degree, the wheel turns the Ascendant east, the marker, Descendant and horizon appear, the
arc runs round the rim; a blind chart settles and draws no horizon. Reduced motion: the settled frame.
Constraints: one rAF loop, no timers, no DOM per body; `wheel-geometry`'s `theta` and `pointAt` do
the placement.
Done when: typecheck, `build:web` and web tests pass; the pure test asserts ring order, the eleven
mean motions, the nodes retrograde on the Moon's ring, 1 s = 8 days and the Moon's settle capped at 8°.

### R05-17 The overlay: progress, five labels, the door — USER-FACING · Opus · provisional MB-55
Objective: the client model of ADR-47, serving both report types.
Files: new `web/src/lib/progress.ts`, new `web/src/lib/progress.test.ts`, new
`web/src/components/report/OpeningOverlay.tsx`, `web/src/hooks/useLiveReport.ts`.
Refs: pass three "The door at 67%", "Skeletons", "Export PDF"; ADR-47; MB-44, MB-55; acceptance 6, 7;
Pinned shapes (progress, `/status`).
Behaviour: `useLiveReport` exposes `provisional`, `open` and the revision counts; `progress.ts` is
pure and returns the percentage, the label, the door state and the crept value for a registry of n
sections; `OpeningOverlay` renders the `Orrery`, the percentage and the label, and once the door
opens "Start reading →" over "The last chapters will be there when you reach them.", calling
`onOpen`; at 100% it opens itself after a 1.2 s hold; a failed report keeps the overlay with its
message and "Try again"; a report in `revising` shows no overlay, since it is already readable.
Done when: typecheck, `build:web` and web tests pass; the pure test covers 4 / 10 / n steps, the
door refusing at 67% without its two required sections, the creep staying below the next milestone,
and the pair registry's ten sections.

### R05-18 The rail and the skeleton — USER-FACING · Sonnet
Objective: chapters only in the rail, and a chapter that is still writing looks like it.
Files: `web/src/components/report/ChapterRail.tsx`, new
`web/src/components/report/ChapterSkeleton.tsx`.
Refs: pass three "Ten chapters" (the rail), "Skeletons"; unknown-birth-time "Report status gains
revising"; ADR-50; acceptance 4, 7.
Changes: the rail's "Opening" button and its mobile-bar label go and `active === -1` still means the
hero with no chapter name; the "· writing" marker stays and gains "· revising" for a horizon pass,
plus the one-line summary "n sentences revised · m added · date" when the report carries revisions;
`ChapterSkeleton` renders four to five `.rp-skel` lines above "Still writing this chapter", with
`aria-busy` on the block.
Done when: typecheck, `build:web` and unit tests pass; `git grep -n "Opening"` returns nothing under
`web/src/components/report`; the rail renders ten entries from a ten-chapter list and nine from the
pair's.

### R05-19 One sky, and the stars that stay — USER-FACING · Opus
Objective: the starfield from the first pixel, and the gather that makes the ring out of it.
Files: `web/src/components/report/ReportSky.tsx`, new `web/src/lib/gather.ts`, new
`web/src/lib/gather.test.ts`.
Refs: pass three "One sky", "The opening"; ADR-51, 47; acceptance 8, 10; §9 motion budget; Pinned
shapes (gather).
Changes: the opacity ramp over the first 0.6 screens goes and the canvas and blobs paint at full
strength from `scrollY = 0`; `gatherTo` runs the gather once, about 70% of the stars gliding to a
point on the ring over 1.6 s on one slow easing and staying there, the transforms computed in
`gather.ts` and applied in the existing paint loop; reduced motion skips it and paints the settled
field.
Done when: typecheck, `build:web` and web tests pass; the pure test asserts every gathered star
lands within a pixel of the ring and that a second call is a no-op; on the preview the field is
visible behind the plate at `scrollY = 0` and the ring still reads as stars ten seconds later.

### R05-20 The sun free of the column — USER-FACING · Sonnet
Objective: the dawn on the fixed layer, cropped only by the screen.
Files: `web/src/components/report/DawnClosing.tsx`.
Refs: pass three "The sun, free of the column", "Ten chapters" (the closing's colour); ADR-51, 46;
acceptance 5; CSS from R05-05.
Changes: the Sun and its warm light move to the fixed layer the stylesheet defines, driven by the
same `--p` from the same rAF-throttled scroll handler and rendered only while `--p > 0`; the closing
prose reads `var(--paper)` while the eyebrow and hair line keep the accent; the three groups keep
their names and their checklists; reduced motion renders the final frame and print stays hidden.
Done when: typecheck and `build:web` pass; at 1440 px scrolling into the Closing brings the Sun into
the viewport's top right cropped only by the viewport, at 390 px it is 82vw in the same corner, and
scrolling away removes it.

### R05-21 A tick is silent, and it unticks — USER-FACING · Sonnet
Objective: ADR-48, and the untick bug that wiped a page.
Files: `web/src/components/report/Checklist.tsx`, `web/src/components/report/ProseRail.tsx`,
`web/src/lib/workbook.ts`, `web/src/lib/workbook.test.ts`.
Refs: pass three "Ticks without a counter"; ADR-48 (amends ADR-24); compatibility "09" (the three
labels); acceptance 2.
Changes: the "saved · n of m" line goes from the checklist and the rail, with `count` and
`countTicked`; `toggle` builds the patch body from the rendered `workbook` rather than inside the
`setWorkbook` updater, which runs after `patch.mutate` reads it and is how `{}` reached the API and
a `{}` response rolled the page back; the optimistic merge and rollback stay; the heading union
gains "For you", "For them" and "For both" for the pair's chapter 09.
Done when: typecheck, `build:web` and web tests pass; a test asserts toggling a ticked key produces
`{ key: null }` and an unticked one an ISO date, in both orders on one store; `git grep -n
"countTicked\|saved ·"` returns nothing. The orchestrator reproduces the failure on staging first.

### R05-22 The three-way birth time and its readout — USER-FACING · Opus
Objective: the control every entry point opens, with the live readout under it.
Files: new `web/src/components/BirthTimeControl.tsx`, new `web/src/lib/birth-time.ts` (+ test), new
`web/src/lib/birth-record-hints.ts`.
Refs: unknown-birth-time "Intake", "Where to find it"; ADR-33, 34; acceptance 2, 3; artifact "the
form with the three modes and the readout".
Behaviour: three modes, I know it (HH:MM, "as written on the record"), Roughly (a part of the day or
give or take an hour) and I don't know, mapping to the pinned centre and window; the readout calls
`POST /horizon/preview` debounced and renders "Capricorn · holds from 11:12 to 12:58" or the
six-sign form with its flips; under I don't know, the country hint, verified or falling back.
Constraints: `birth-time.ts` holds every mapping and label as pure functions; no component fetches
the chart; the old "if unknown, use noon" note is deleted wherever it appears.
Done when: typecheck, `build:web` and web tests pass; the pure test covers the three modes' centre
and window, the readout strings for the fixture's three cases, and an unverified country falling
back.

### R05-23 The marks, the ledger and the method strip — USER-FACING · Opus
Objective: the reader sees exactly what the hour changed, and the frame says what is not drawn.
Files: new `web/src/components/report/RevisedText.tsx`, new
`web/src/components/report/RevisionLedger.tsx`, `web/src/components/report/MethodologyStrip.tsx`.
Refs: unknown-birth-time "Marks", "The ledger", "Method strip"; ADR-35, 37; acceptance 5;
artifact "chapter 04 with a revised sentence", "the ledger".
Behaviour: an amended sentence carries a brass underline and the tag "revised", and hover or tap
opens a card with before struck through, now, and because as evidence chips, `angle` and `lot` in
brass; an added paragraph carries a brass rule and the kicker "Added with your birth time", once per
block; the ledger sits at the top after a pass with rising, Midheaven, day or night, what was added,
sentences per chapter, "Before · kept · compare any time" and the toggle "Show what changed", on at
first visit, remembered per browser, folding into the method strip after; the strip reads the blind
line, "birth time not recorded · … · Moon 10.2° to 22.8° Pisces", and prints.
Done when: typecheck, `build:web` and web tests pass; the strip renders all three horizon statuses
from a fixture interpretation; the ledger's counts come from the report, never recounted in the UI.

### R05-24 The bi-wheel and its cards — USER-FACING · Opus
Objective: chapter 02 of the compatibility report, drawn from both charts.
Files: new `web/src/components/chart/bi-wheel.ts`, new `web/src/components/chart/bi-wheel.test.ts`,
new `web/src/components/chart/BiWheel.tsx`, new `web/src/components/report/LinkCard.tsx`.
Refs: compatibility "Chapter 02, the two charts"; ADR-43; acceptance 4, 5, 7; §9 "The picture is the
chart"; artifact "the bi-wheel on real data".
Behaviour: inner ring A, outer ring B, the host's whole-sign houses, the host swapped with one tap;
bodies at their true degrees with crowding resolved by radius; cross aspects within 4° drawn, brass
for a conjunction, teal for a trine or sextile, rose for a square or opposition; `LinkCard` renders
one card per drawn link and per notable overlay with its generated reading and its tag.
Constraints: brass stays geometry; no ring, bar, number or rating describes the pair; a blind chart
on either side drops the house ring and the overlay cards, keeping the aspects.
Done when: typecheck, `build:web` and web tests pass; the pure test asserts every drawn line matches
a cross aspect within 4° on the Curie–Winfrey pair and that swapping the host re-hosts the houses.

### R05-25 The compatibility picker — USER-FACING · Sonnet · provisional MB-6
Objective: the one way into a compatibility report.
Files: new `web/src/components/CompatibilityPicker.tsx`, new `web/src/lib/lenses.ts`.
Refs: compatibility "Inputs and the flow", "Lenses"; ADR-40, 42; acceptance 1, 2; MB-6, MB-57;
artifact "the picker with its three CTA states".
Behaviour: two selectors listing the natal reports the viewer can see, any two, own not required,
complete ones selectable and a writing one visible and disabled; the lens is required and parent and
child asks who the parent is, carried as the participants' positional role; one CTA, "Write the
report", posting to `POST /compatibility` and navigating to the report; the no-credit state is a
`// MB-6 provisional` seam that preserves the selection for the payments round to attach checkout to.
Constraints: no birth form, ever; the lens copy and registers live in `lenses.ts` as pure data.
Done when: typecheck, `build:web` and web tests pass; the pure test covers the lens table and the
parent question; a writing report renders disabled with its reason.

### R05-26 Admin prompts: the pair keys, the dead natal key — INTERNAL · Sonnet
Objective: the admin lists what the generator actually calls.
Files: `web/src/pages/AdminPromptsPage.tsx`, `api/src/routes/adminPrompts.ts`,
`api/src/lib/promptDefaults.ts`.
Refs: compatibility "Engine"; pass three "Ten chapters" (the dead key); MASTERFILE §8, R-5.4;
Pinned shapes (pair).
Changes: the "Synastry" tab becomes "Compatibility" and its relationship-type selector becomes the
three lenses; the pair keys are listed from the pair registry; `natal:path` no longer appears; the
bootstrap's stale-override reset learns `PAIR_PROMPT_VERSION` alongside `PROMPT_VERSION`, so a pair
bump clears pair overrides only.
Constraints: prompts are still edited on staging only; no prompt text is edited in this card.
Done when: typecheck, both builds and unit tests pass; the admin page lists eleven natal keys and
eleven pair keys and no dead one; a preview renders for a pair key.

### R05-27 The hero, drawn and blind — USER-FACING · Opus
Objective: one plate that tells the truth about what the hour settled.
Files: `web/src/components/report/ReportHero.tsx`, `web/src/components/report/hero-layout.ts`, new
`web/src/components/report/AngleGlyph.tsx`.
Refs: pass three "The Ascendant glyph", "The scroll cue", "Ten chapters" (Ch. 00);
unknown-birth-time "Hero"; ADR-49, 50, 33, 37; acceptance 1, 4, 11 and UBT 4.
Changes: `AngleGlyph` draws the R03 marker, brass ring, brass centre point and a tick from the rim
outward along the angle, east for the Ascendant and up for the Midheaven, and the hero's marker is
that glyph, its tick along the horizon; the plate's "Ch. 00 / Horizon" label goes; the cue becomes a
focusable button scrolling to `#chapter-1`. Blind: no horizon line, no EAST or WEST labels, no
rising marker, corner `TOB` reads "not recorded" or "approximate", the frame reads "horizon · not
drawn", the Moon is the arc it travelled that day and the Sun its centre degree, and the legend's
third line reads "RISING · add your birth time to draw the horizon", opening R05-22's control.
Done when: typecheck, `build:web` and web tests pass; the layout test still pins the drawn hero's
degrees and gains a blind case asserting the Moon arc's ends are its longitudes at 00:00 and 23:59.

### R05-28 The explorer, drawn and blind — USER-FACING · Opus
Objective: the wheel and the card, with and without a horizon.
Files: `web/src/components/report/ChartExplorer.tsx`, `web/src/components/report/HouseCard.tsx`,
`web/src/components/chart/NatalWheel.tsx`, `web/src/lib/house-occupants.ts`.
Refs: pass three "The Ascendant glyph" (the card), "Ten chapters" (house links);
unknown-birth-time "Explorer"; ADR-49, 33; acceptance 1 and UBT 4.
Changes: `OccupantMark`'s angle branch uses `AngleGlyph`; `HOUSE_CHAPTER` loses houses 5 and 11.
Blind: the wheel keeps the sign band and the bodies at their degrees and drops the house ring and
the axes; the card slot holds the one call to action, what the hour adds in four lines, "Add my
birth time", "Free. Every change is marked." and the country hint, opening R05-22's control.
Constraints: the R04 explorer is the base, no redesign beyond this; nothing reads a house that the
chart does not carry.
Done when: typecheck, `build:web` and web tests pass; against the drawn fixture the 1st house front
shows the glyph beside its degree and the Midheaven's house shows it tick up; against the blind one
no card names a house and the wheel renders no axes.

### R05-29 The birth form asks the right question — USER-FACING · Sonnet
Objective: the intake, with the readout and the zone, and no noon note.
Files: `web/src/pages/BirthFormPage.tsx`.
Refs: unknown-birth-time "Intake"; MB-48, MB-30; acceptance 2, 3, 7; Pinned shapes (birth time).
Changes: the time field becomes `BirthTimeControl` with its readout; the geocode step carries the
IANA zone name through to the submitted profile alongside the coordinates; the window is submitted
with the time; the "if unknown, use noon" note is deleted; the submit path is otherwise unchanged.
Constraints: geocoding stays in the browser this round (MB-30 is not this card); no new dependency.
Done when: typecheck and `build:web` pass; a submission with I don't know sends window 720 and the
zone, one with a known time sends 0, and the readout updates as the date, place or mode changes.

### R05-30 Routes, dashboard and the claim — USER-FACING · Opus
Objective: every entry point the round changes, in one card.
Files: `web/src/App.tsx`, `web/src/pages/DashboardPage.tsx`, `web/src/pages/ClaimPage.tsx`, delete
`web/src/pages/GenerationPage.tsx`, delete `web/src/pages/SynastryReportPage.tsx`.
Refs: pass three "The door at 67%" (one page); compatibility "Inputs and the flow", ADR-45;
unknown-birth-time "Gifting", "Entry"; MB-9, MB-56, MB-58; acceptance 9 and compatibility 1.
Changes: `/generating/:id` redirects to `/report/:id` and its page goes; `/synastry/:id` and its
page go with the score; `/compatibility/:id` renders the new report page; dashboard zone 3 becomes
"New compatibility report" with the picker and a list of compatibility reports titled "{A} & {B}
Compatibility", the invite modal keeping its place there; a blind report's tile carries the "Add
your birth time" call to action; the claim page asks the three-way time question first and runs the
horizon pass on the answer, the giver keeping read access.
Done when: typecheck, `build:web` and unit tests pass; `git grep -rn "GenerationPage\|SynastryReportPage\|/synastry/"
web/src` returns nothing; `/generating/<id>` lands on the report page; claiming a blind report
offers the time question once.

### R05-31 Assemble the natal report page — USER-FACING · Opus
Objective: ten chapters, the door, the skeletons and the blind frame, composed.
Files: `web/src/pages/ReportPage.tsx`; delete `report/PathBlock.tsx`, `NodalAxis.tsx`,
`nodal-axis.test.ts`.
Refs: pass three "Ten chapters", "The door at 67%", "Skeletons", "Export PDF", "One sky";
unknown-birth-time "The blind report", "The ledger"; acceptance 3, 4, 7, 9, 10, 12 and UBT 1, 5.
Changes: `CHAPTERS` becomes the pinned ten, `TOTAL` 10, chapter 10 Closing in eyebrow and title
printed once over "10 / 10" rendering `DawnClosing`; `PathBlock` and `NodalAxis` go with its old
aside; `OpeningOverlay` holds the page until the door is taken or it opens itself, then the hero
ring reaches `ReportSky` as `gatherTo`; an unlanded chapter renders `ChapterSkeleton`; a blind report
renders no rising text and no house readings, the call to action instead, and the ledger above
chapter 01 after a pass; Export PDF flips at `complete`; the v6 branch and the print blocks stay.
Done when: typecheck, both builds and unit tests pass; `git grep -n "PathBlock\|NodalAxis"` returns
nothing; on the preview the door appears at the seventh landed section, skeletons fill behind it,
and a blind report shows no house number anywhere on screen or in print.

### R05-32 The compatibility report page — USER-FACING · Opus
Objective: nine chapters, the bi-wheel first, streaming like a natal report.
Files: new `web/src/pages/CompatibilityReportPage.tsx`, new
`web/src/components/report/PairSections.tsx`.
Refs: compatibility "Chapters", "Chapter 02", "Credits"; ADR-39, 41, 43; acceptance 4, 5, 7, 9, 10;
artifact "a prose chapter with the rail".
Changes: the natal page's furniture is reused, the hero replaced by a pair plate naming both people,
the bi-wheel and its cards the whole of chapter 02 and the first thing on the page, chapters by
accent index, the rail beside prose, `source` citations rendering the original report's label,
`OpeningOverlay` and `ChapterSkeleton` for streaming, chapter 09's three checklists writing to the
workbook, a closing paragraph, no dawn, print unchanged, tab title "{A} & {B} · Compatibility Report".
Constraints: no number, rating, percentage or bar anywhere on the page or in the PDF.
Done when: typecheck, both builds and unit tests pass; on the preview a generated pair report opens
on the bi-wheel, streams its chapters, swaps its host and prints; `git grep -ni "synastry" web/src`
returns nothing outside the generated client.

## Parallelism

- **Wave 0, five cards, alone**: R05-01 registry · R05-02 contract · R05-03 schema · R05-04 engine ·
  R05-05 stylesheet. These are the five files every other card would otherwise queue on.
- **Wave 1, ten cards, brain and API**: R05-06 to R05-15. Disjoint files: brief and doctrine 06,
  generation 07, readout 08, the pass 09, report routes 10, pair prompts 11, pair brief 12, pair
  generation 13, credits 14, lab 15.
- **Wave 2, eleven cards, web parts**: R05-16 to R05-26. All new files but five (`ReportSky`,
  `ChapterRail`, `Checklist`/`ProseRail`/`workbook`, `MethodologyStrip`, `AdminPromptsPage`), each
  with one owner. Waves 1 and 2 are independent and may be dispatched together; they are listed
  apart so a single dispatch message stays readable.
- **Wave 3, four cards, the shared files**: R05-27 hero · R05-28 explorer and wheel · R05-29 birth
  form · R05-30 routes, dashboard and claim. This is where pass three and unknown birth time meet:
  each of those files has one card carrying both specs' lines, because the two changes are adjacent
  in the same render and splitting them would mean rewriting the same JSX twice.
- **Wave 4, two cards, assembly**: R05-31 natal page · R05-32 compatibility page.

Then the gate: `install --frozen-lockfile` · typecheck · `build:web` · `build:api` · unit tests ·
codegen leaves no diff · `db:bootstrap` twice · the lab campaign · Vercel preview smoke. Close per
§11.2 step 5: round report, `INDEX.md`, CLAUDE.md current focus, Mailbox, bible prompt re-sync and
release-log rows, pull request merged by the orchestrator.

## The lab campaign

Three runs, all remote against staging, all pasted in the round report (R-4.4):

1. **Natal v6**, the five committed fixtures. Expect 4,770 to 5,110 words and 28 to 29 ¢ a report,
   down from R04's 31.0 ¢ now that `path`'s call and its 280 words are gone; over 35 ¢ fires MB-46.
2. **The blind pair**, `marie-curie-unknown` then the same report through the horizon pass. Expect
   a blind report of about 2,900 to 4,600 words at 21 to 23 ¢ and a pass at 18 to 22 ¢ (three
   horizon sections plus eleven amendment calls on short outputs). The run prints words kept
   verbatim, sentences amended, claims added and the cost of each stage, and the blind flag must
   find no house, angle, sect or lot word.
3. **Compatibility**, the `curie-winfrey` pair fixture once per lens. Expect 3,000 to 4,500 words
   and under 60 ¢ a report, ten calls on longer inputs; the three runs must differ in chapters 07
   and 08 and the examples' register and nowhere structurally else.

About 3.50 $ of inference for the campaign, which is inside R-4.4's "inference is not a constraint".

## Coverage

Pass three 1 → 27, 28 · 2 → 21 · 3 → 01, 02, lab · 4 → 05, 18, 27, 31 · 5 → 05, 20 · 6 → 10, 16, 17 ·
7 → 17, 18, 31 · 8 → 19 · 9 → 30 · 10 → 05, 19 · 11 → 27 · 12 → gate.
Unknown birth time 1 → 01, 06, 07, 31, lab · 2, 3 → 04, 08, 22 · 4 → 27, 28 · 5 → 09, 23, 31 ·
6 → 15 · 7 → 04, 29 · 8 → gate.
Compatibility 1 → 25, 30 · 2 → deferred (MB-57, MB-6) · 3 → 12, 13 · 4 → 24, 32 · 5 → 11, 15 ·
6 → 12, 13 · 7 → 24, 32 · 8 → 11, 15 · 9 → 21, 32 · 10 → 11, 15 · 11 → 03, 14, gate.

## Risks

- **USER-FACING report content three ways**: v6 with one section fewer, the blind report, and a
  second report type. R-4.4 and R-5.5 bite on all three; the campaign above is the evidence.
- **The amendment pass edits text a reader has already read.** Mitigated by the revisions table, by
  quote-match-or-drop, by re-validating claims after application, and by the paired lab run; the
  failure path restores the previous text.
- **A chart can now lack keys.** `angles`, `houses` and `sunAltitude` are absent on a blind chart,
  so every consumer must guard. Typecheck catches the compile-time half; the blind lab run, the
  print path and the preview smoke catch the rest. `CHART_VERSION 3` recomputes cached charts, and
  a stored report from before this round is v5 and sits behind the v6 regenerate gate (MB-45), so a
  redrawn chart never contradicts stored text.
- **Ledger.** No destructive DDL (MB-57); `credit_type` stays, unread. The soft credit pass now
  covers two report types, so nothing is sold and nothing is gated until payments.
- **The orrery is the heaviest thing on the first screen a buyer meets**, and the gather is 2.3 s on
  top of it. If the loop cannot hold on a mid-range phone, the fallback is fewer stars, never fewer
  bodies.
- **Round size.** Thirty-two cards and five waves. The orchestrator should expect a long round and
  note token spend (R-13.3); the single-owner list is what keeps merges clean.
- Deferred on purpose: checkout and the no-credit CTA (MB-6), the `credit_type` drop (MB-57), gift
  mode 2 (out of scope in its own spec), MB-30's geocode move, the landing page's chapter grid
  (MB-8), `opengraph.jpg` (MB-13), a real Chiron ephemeris, Placidus, light mode.

## Questions raised

Decided by the Owner on 2026-09-19, recorded on their rows: **MB-53** build the compatibility report
now, on the soft credit pass, rather than after payments; **MB-54** build unknown birth time whole in
this round rather than splitting it. Both rows move to `decided` with the Owner's words.

New rows raised for the widened scope: **MB-57** (decision, launch) the payments-shaped parts of the
compatibility spec defer — the `credit_type` drop and the typed bundle definitions, and the no-credit
CTA with its checkout round trip, which is compatibility acceptance 2; default, build the rest on the
soft pass and leave both seams tagged. **MB-58** (decision, launch) old `type = "synastry"` rows are
left in place and never listed rather than migrated, since their interpretation has no sections and
nothing was ever sold; default, hidden, and deleted with their relationship.

Still open and built at their defaults, tagged on the cards: MB-55 (the ring creeps), MB-6 (the
picker's no-credit seam), MB-43, MB-47. MB-44's provisional tags come off in R05-17 and R05-31;
MB-45's guard moves to v6; MB-48 and MB-52 are built; MB-9, MB-16, MB-18, MB-27 and MB-32 close with
this round's report; MB-56 is answered by the round itself, since the compatibility picker replaces
zone 3 in the same release that retires it. `Rounds open` was incremented on all 26 carried open
rows at the first version of this plan and is unchanged by the widening.
