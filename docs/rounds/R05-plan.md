# R05 plan — ten chapters, a door at 67%, and the offset in force at birth

Planned 2026-09-19 on `claude/plan-r05-v6i0az`, which carries the three specs locked that day.
Scope is `docs/specs/locked/natal-report-pass-three.md` (ADR-46 to 51) in full, plus MB-48 from
`docs/specs/locked/unknown-birth-time.md` (ADR-33 to 38) and ADR-45's one shipped line from
`docs/specs/locked/compatibility-report.md` (ADR-39 to 45). No QA reports exist; R04 acceptance
on staging produced the pass-three review instead, and its nine notes are this round.

**Mailbox rows above 2 rounds open after this plan's increment.** At 4: MB-5, 6, 8, 11, 12, 13,
15, 17, 19, 20, 21, 22, 23, 24, 25, 30. At 3: MB-31 (blocking, legal entity), 32, 33, 35, 39.
None blocks this round. MB-5 and MB-6 at 4 are the reason the compatibility report is not in it.

**Numbering note for builders.** `unknown-birth-time.md` calls the credit rules MB-49; in Notion
that row is **MB-52**, and MB-49 is the route-test harness, MB-50 `demoChart.ts`. The R04 report's
MB-48 and MB-49 mean MB-49 and MB-50. MB-52 now carries this note.

## Scope decisions

1. **The compatibility report is not built in R05** (MB-53). MASTERFILE §2 already places it in
   "V1 after payments", and the spec is a checkout flow: its CTA states are credit states,
   acceptance 2 is a checkout round trip, acceptance 11 is a credits migration, and its credits
   clause deletes `credits.credit_type` and redefines bundles, which is the payment round's ledger. Building the engine first would leave nine generated
   chapters nobody can buy. Order: pricing (MB-5) → Stripe test mode on staging (MB-6) → the
   compatibility round. R05 ships one line of the spec, ADR-45: the old synastry report and
   dashboard zone 3 retire, so nothing showing a score is reachable (R05-13, MB-56).
2. **Unknown birth time splits** (MB-54). R05 ships MB-48 only; R06 ships the spec end to end.
   A blind report without the horizon pass would ship a dead promise ("Add my birth time. Free.
   Every change is marked."), and both specs rewrite `ReportHero`, `ChartExplorer`, `ReportPage`,
   `chartCalculation` and the brief, so building them together means one card per file carrying
   two specs. Pass three settles the glyph, the sky, the status contract and the skeletons that
   the blind hero and the `revising` chapters reuse. MB-48 comes forward because it is a live
   defect, it is disjoint from every pass-three file, and R05 already bumps the prompt version,
   so one lab run measures both.

## Preconditions

1. `3416b38` is HEAD; `round/R05` branches from this branch. Every builder reads MASTERFILE §0
   plus the sections its card names, and the artifact https://claude.ai/artifact/HKt4HYfKKmwadcKTmTxWob
   for the screen its card names: read for geometry, copy and timing, never ported literally.
2. The round changes report content and the schema, so the gate carries the report lab on the
   five fixtures, `db:bootstrap` twice and codegen (R-4.4, §11.2 step 4).
3. Shapes pinned below are the contract between parallel cards. A builder who needs to change one
   stops and raises it (R-0.1).
4. `ReportPage.tsx`, `index.css`, `openapi.yaml` and `App.tsx` each have exactly one owner this
   round (R03's rule): R05-14, R05-03, R05-02, R05-13.

## Pinned shapes

- **Registry**: `overview, triad, houses, mind, career, money, relationships, family, superpowers,
  discoveries, focus` (eleven; `ALL_SECTIONS.length === 12`). `PROMPT_VERSION = "v6"`. Bands
  unchanged, so `prompts.test.ts` sums drop by path's 250–300 to 3,930–5,110, still inside
  3,500–5,500.
- **Chapters** (ten): 01 Overview / Chart Overview · 02 Chart / Natal Chart Deepdive · 03 Mind ·
  04 Work / Career & Calling · 05 Resources / Money & Resources · 06 Relationships · 07 Roots /
  Family & Roots · 08 Self-Knowledge / Superpowers… · 09 Paradoxes / Key Paradoxes & Discoveries ·
  10 **Closing / Closing**. `TOTAL` 10. `HOUSE_CHAPTER` loses 5 and 11; 1, 2, 3, 4, 7, 10 keep
  their targets, whose numbers do not move.
- **Accent**: `chapterAccent(10)` already returns `#3FA796` from the fixed six, which is the teal
  the Owner chose; the card asserts it rather than adding a special case, drops the ignored second
  parameter, and the Closing's prose reads `var(--paper)` while eyebrow and hair line keep teal.
- **`/status`**: drops `progress` and `currentStep` (no consumer survives R05-13); gains
  `provisional: { bodies: Record<string, { absoluteDegree: number, retrograde: boolean }> } | null`,
  present only while `chartReady` is false, from one local `calculateNatalChart` on the profile's
  entered date and time at offset 0 (positions do not depend on the offset beyond the Moon's half
  degree an hour), no geocoding, nothing stored.
- **Progress** (pure, `web/src/lib/progress.ts`): 4 at report exists, 10 at `chartReady`, then
  90 ÷ 11 per landed section; labels "Analysing your inputs" → "Computing your chart" → "Finding
  the patterns" → "Writing your report" → "Ready"; `door = real ≥ 67 && sections.overview ===
  "done" && sections.houses === "done"`, never the crept value; the creep eases toward a time
  estimate capped one point below the next milestone (MB-55 default). One percentage, never a count.
- **Orrery** (pure, `web/src/lib/orrery.ts`): rings outward Moon, Mercury, Venus, Sun, Mars,
  Jupiter, Saturn, Chiron, Uranus, Neptune, Pluto; nodes on the Moon's ring; mean daily motion
  Moon 13.176, Mercury 4.092, Venus 1.602, Sun 0.9856, Mars 0.524, Jupiter 0.0831, Saturn 0.0335,
  Chiron 0.0193, Uranus 0.0117, Neptune 0.00598, Pluto 0.00397, nodes −0.053; 1 s = 8 days;
  retrograde runs backwards; the settle eases each body onto its stored degree, the Moon sweeping
  at most 8°.
- **Gather**: `ReportSky` takes `gatherTo?: { cx: number, cy: number, r: number } | null` in CSS
  pixels and runs once when it turns non-null: ≤ 150 stars, 1.6 s on one easing, transforms inside
  the existing paint loop, no DOM per star, and the gathered stars stay on the ring afterwards.
- **MB-48**: `profiles.timezone` (text, nullable, IANA name). `offsetAtBirth(zone, date, time)` in
  `chartCalculation.ts` derives hours east of UTC with `Intl.DateTimeFormat` and returns fractions
  unrounded, so a pre-standard-time zone keeps its LMT minutes. A profile without a zone keeps its
  stored numeric offset. `CHART_VERSION = 3`. Committed fixtures keep their numeric offsets this
  round, so every pinned degree in the web tests stands.

## Goals

1. **Ten chapters, the last one Closing.** `path` retired from the generator, the contract and the
   page; v6; the rail lists chapters only. Acceptance 3, 4. ADR-46 decision 1, 5.
2. **The report opens when the reader chooses.** One page and one overlay, real progress under
   five labels, the wheel as a geocentric orrery that settles onto the stored chart, the door at
   67%, skeletons behind it, Export PDF that flips. Acceptance 6, 7, 9, 12. ADR-47, MB-44.
3. **One sky, one glyph, a silent tick.** The stars present from the first pixel and gathering
   into the ring, the R03 angle marker everywhere an angle is drawn, the Sun free of its column,
   the cue a button, a tick that unticks. Acceptance 1, 2, 5, 8, 10, 11. ADR-48 to 51.
4. **The offset in force at birth** (MB-48), so every chart computed from now on is right and R06's
   readout can be honest.
5. **Nothing with a score is reachable** (ADR-45, MB-56); the compatibility report itself waits
   for payments.

## Task cards

### R05-01 Brain: `path` retired, the version bumped — USER-FACING · Opus
Objective: eleven sections, `PROMPT_VERSION` v6, and no dead admin key left behind.
Files: `api/src/prompts/index.ts`, delete `api/src/prompts/sections/path.ts`,
`api/src/lib/aiInterpretation.ts` (import, `PathSection`, `ReportInterpretation.path`, the `byId`
mapping), `api/src/prompts/prompts.test.ts`, `packages/db/scripts/migrate-drop-dead-prompt-keys.ts`.
Refs: spec "Ten chapters, the last one Closing"; ADR-46; MASTERFILE §4, R-4.3, R-4.4, R-5.5.
Constraints: `focus.ts` is not edited (the section key stays `focus`, only its chapter title moves);
the focus prompt's North Node line stays, by spec; no band changes; `natal:path` joins the dead-key
list, which bootstrap step 4 already runs, and step 6 clears natal overrides on the version bump.
Done when: typecheck, `build:api`, api unit tests pass; `SECTION_IDS.length === 11` with no `path`
and `ALL_SECTIONS.length === 12`; the sums test asserts 3,930–5,110 inside 3,500–5,500;
`git grep -n "natal:path\|PathSchema" api packages` returns nothing outside the dead-key list.
Sequencing: wave 0, parallel with R05-02 and R05-03.

### R05-02 Contract: openapi, codegen, web types — INTERNAL · Sonnet
Objective: land every contract change of the round in one commit so no other card touches the spec
or the generated packages.
Files: `packages/api-spec/openapi.yaml`, generated `packages/api-client-react/src/generated/*` and
`packages/api-zod/src/generated/*` (by codegen only), `web/src/types/chart.ts`.
Refs: spec "Ten chapters" (contract line), "The door at 67%"; MB-48; Pinned shapes (`/status`);
CLAUDE.md "openapi.yaml is the contract".
Changes: `ReportInterpretation` loses `path`; `ReportStatus` loses `progress` and `currentStep` and
gains `provisional` as pinned; the profile and report create bodies gain optional `timezone` (IANA
name) and `Profile` returns it; `chart.ts` drops `PathSection`, mirrors `provisional` and the new
field, and `isCurrentInterpretation` requires `meta.promptVersion === "v6"` (MB-45, decided).
Done when: `pnpm --filter @workspace/api-spec run codegen` is clean and committed; typecheck and
both builds pass; `git grep -n "currentStep" packages web api` returns only the R05-12 route until
that card lands.
Sequencing: wave 0, parallel with R05-01 and R05-03; every wave-1 card compiles against it.

### R05-03 Web shared: the stylesheet and the accent table — USER-FACING · Sonnet
Objective: the shells and values every UI card of the round reads, landed once.
Files: `web/src/index.css`, `web/src/lib/chapter-accent.ts`, `web/src/lib/chapter-accent.test.ts`.
Refs: spec "The sun, free of the column", "The scroll cue", "One sky", "Skeletons", "Ten chapters"
(accents); ADR-46, 48, 51; MASTERFILE §9 motion budget; Pinned shapes (accent).
Changes: `.rp-dawn .sun` and `.warm` become `position: fixed` in the viewport's top right, same
`--p`, size and curve, under the chapter body and over the sky, hidden at `--p: 0` and in print;
`.rp-dawn` loses `overflow: clip`; `.rp-hsky` drops its ground; `.rp-cue` becomes a 13 px label at
`.34em` over a 2 px stem 56 px tall with a falling point of light, no arrow, brass, 44 px hit area,
still fading over the first half screen; new `.rp-skel` (four to five rounded lines, slow sweep,
breath of opacity) and `.rp-open` shells, each with its reduced-motion rule; `chapterAccent` drops
its ignored second parameter.
Done when: typecheck and `build:web` pass; the accent test asserts ten chapters, no two adjacent
equal, `chapterAccent(10) === "#3FA796"`, chart-independent; the old parameter is grepped out.
Sequencing: wave 0, parallel with R05-01 and R05-02.

### R05-04 The offset in force at birth — USER-FACING · Opus · provisional MB-48
Objective: MB-48, end to end, without touching a pass-three file.
Files: `packages/db/src/schema/profiles.ts`, new `packages/db/scripts/migrate-add-profile-timezone.ts`,
`scripts/bootstrap-db.sh`, `api/src/lib/chartCalculation.ts` (+ test) and `profiles.ts`,
`api/src/routes/geocode.ts`, `web/src/pages/BirthFormPage.tsx` (zone field only).
Refs: unknown-birth-time "Engine" (offset), acceptance 7; MB-48, MB-54; R-3.2, R-7.3; Pinned shapes.
Changes: `timezone` column plus an idempotent script wired as a bootstrap step; both geocode paths
keep `timeapi.io` but carry its `timeZone` name to the profile; `offsetAtBirth` derives the offset
for the birth instant and feeds `calculateNatalChart` when a zone is stored, the stored numeric
offset being the fallback; `CHART_VERSION = 3`.
Constraints: geocoding stays put (MB-30 is not this card); profile dedupe unchanged; no fixture
gains a zone, so every pinned degree in the web tests stands.
Done when: api tests pass, including a summer birth entered in winter (Europe/Paris, 1990-07-01)
and a pre-1970 one (Europe/Warsaw, 1867-11-07, +1:24) to the minute; `db:bootstrap` boots clean
twice; typecheck and both builds pass. Wave 1, after R05-02's codegen; the only API card but R05-12.

### R05-05 The glyph, the plate and the cue — USER-FACING · Sonnet
Objective: one angle marker everywhere an angle is drawn, and the hero plate per pass three.
Files: new `web/src/components/report/AngleGlyph.tsx`, `web/src/components/report/HouseCard.tsx`,
`web/src/components/report/ReportHero.tsx`.
Refs: spec "The Ascendant glyph", "The scroll cue", "Ten chapters" (Ch. 00); ADR-49, 50, 51;
acceptance 1, 4, 11; artifact "house card before and after", "the scroll cue".
Changes: `AngleGlyph({ angle, size })` draws the R03 marker (brass ring, brass centre point, a tick
from the rim outward along the angle: east for the Ascendant, up for the Midheaven);
`OccupantMark`'s `angle` branch and the hero's Ascendant marker both use it, the hero's tick running
along the horizon; `HOUSE_CHAPTER` loses houses 5 and 11; the plate's "Ch. 00 / Horizon" label goes;
the cue becomes a `button` with an accessible name that scrolls to `#chapter-1`, keeping its fade.
Done when: typecheck, `build:web`, web tests pass; against `marie-curie.reference.json` the 1st
house front shows the glyph beside "Ascendant · 12.1°" and the Midheaven's house shows it tick up;
`git grep -n "Ch. 00"` returns nothing.
Sequencing: wave 1. The only card on `ReportHero.tsx` and `HouseCard.tsx`.

### R05-06 A tick is silent, and it unticks — USER-FACING · Sonnet
Objective: ADR-48, and the untick bug that wiped a page.
Files: `web/src/components/report/Checklist.tsx`, `web/src/components/report/ProseRail.tsx`,
`web/src/lib/workbook.ts`, `web/src/lib/workbook.test.ts`.
Refs: spec "Ticks without a counter"; ADR-48 (amends ADR-24); acceptance 2.
Changes: the "saved · n of m" line goes from the checklist and the rail, with `count` and
`countTicked`; `toggle` builds the patch body from the rendered `workbook`, not inside the
`setWorkbook` updater, because the updater runs after `patch.mutate` reads it, which is how `{}`
reached the API and a `{}` response rolled the page back; the optimistic merge and the rollback
stay.
Done when: typecheck, `build:web` and web tests pass; a test asserts that toggling a ticked key
produces `{ key: null }` and toggling an unticked one an ISO date, in both orders on the same store;
`git grep -n "countTicked\|saved ·"` returns nothing. The orchestrator reproduces the failure on
staging before the fix and proves click → PATCH `null` → merged response → reload after it.
Sequencing: wave 1.

### R05-07 The wheel is the sky — USER-FACING · Opus
Objective: the geocentric orrery, drawn from the chart, as a component with pure maths behind it.
Files: new `web/src/lib/orrery.ts`, new `web/src/lib/orrery.test.ts`, new
`web/src/components/report/Orrery.tsx`.
Refs: spec "The door at 67%" (the wheel is the sky); ADR-47; acceptance 6; §9; Pinned shapes.
Behaviour: `Orrery({ provisional, chart, progress })` draws eleven rings in the pinned order,
planets as renders from `planet-renders.ts`, Chiron and the nodes as drawn points, each sweeping at
its mean daily motion at one second to eight days; when `chart` arrives each body eases onto its
stored degree, the wheel turns the Ascendant east, the Ascendant marker, the Descendant and the
horizon appear, the arc runs round the rim. Reduced motion draws the settled frame.
Constraints: renders are bodies at their degrees, never decoration; `wheel-geometry`'s `theta` and
`pointAt` do the placement; one rAF loop, no timers, no DOM per body.
Done when: typecheck, `build:web` and web tests pass; the pure test asserts ring order, the eleven
mean motions, the nodes retrograde on the Moon's ring, 1 s = 8 days, the Moon's settle capped at 8°.
Sequencing: wave 1.

### R05-08 The overlay: progress, five labels, the door — USER-FACING · Opus · provisional MB-55
Objective: the client model of ADR-47, as a pure module and one overlay component.
Files: new `web/src/lib/progress.ts`, new `web/src/lib/progress.test.ts`, new
`web/src/components/report/OpeningOverlay.tsx`, `web/src/hooks/useLiveReport.ts`.
Refs: spec "The door at 67%", "Skeletons"; ADR-47; MB-44, MB-55; acceptance 6, 7; Pinned shapes.
Behaviour: `useLiveReport` exposes `provisional` and `open`; `progress.ts` is pure and returns the
percentage, the label, the door state and the crept value; `OpeningOverlay` renders the `Orrery`,
the percentage, the label and, once the door opens, "Start reading →" over "The last chapters will
be there when you reach them.", calling `onOpen`; at 100% it opens itself after a 1.2 s hold; a
failed report keeps the overlay with its message and "Try again".
Constraints: the overlay owns no routing and no report layout; the percentage is never a count;
the door reads real progress, never the creep; poll cadence unchanged.
Done when: typecheck, `build:web` and web tests pass; the pure test covers 4 / 10 / eleven steps,
the door refusing at 67% without `overview` or `houses`, the creep below the next milestone.
Sequencing: wave 1.

### R05-09 The rail and the skeleton — USER-FACING · Sonnet
Objective: ten entries, none named Opening, and a chapter that is still writing looks like it.
Files: `web/src/components/report/ChapterRail.tsx`, new
`web/src/components/report/ChapterSkeleton.tsx`.
Refs: spec "Ten chapters" (the rail), "Skeletons"; ADR-50; acceptance 4, 7; CSS from R05-03.
Changes: the rail's "Opening" button and its mobile-bar label go, `active === -1` still means the
hero and shows no chapter name, the "· writing" marker stays; `ChapterSkeleton` renders four to
five `.rp-skel` lines above the caption "Still writing this chapter" and replaces the R04 `Writing`
line at the call sites R05-14 owns.
Done when: typecheck and `build:web` pass; `git grep -n "Opening"` returns nothing under
`web/src/components/report`; the skeleton renders its caption once, with `aria-busy` on the block.
Sequencing: wave 1.

### R05-10 One sky, and the stars that stay — USER-FACING · Opus
Objective: the starfield present from the first pixel, and the gather that makes the hero's ring.
Files: `web/src/components/report/ReportSky.tsx`, new `web/src/lib/gather.ts`, new
`web/src/lib/gather.test.ts`.
Refs: spec "One sky", "The opening"; ADR-51, 47; acceptance 8, 10; §9; Pinned shapes (gather).
Changes: the opacity ramp over the first 0.6 screens goes and the canvas and blobs paint at full
strength from `scrollY = 0`; `gatherTo` as pinned runs the gather once — about 70% of the stars
glide to a point on the ring over 1.6 s on one slow easing and stay there, transforms computed in
`gather.ts` and applied in the existing paint loop; reduced motion skips it and paints the settled
field.
Done when: typecheck, `build:web` and web tests pass; the pure test asserts every gathered star
lands within a pixel of the ring and that a second call after the first is a no-op; on the preview
the field is visible behind the plate at `scrollY = 0` and the ring still reads as stars ten
seconds after the gather.
Sequencing: wave 1. The only card on `ReportSky.tsx`.

### R05-11 The sun free of the column — USER-FACING · Sonnet
Objective: the dawn on the fixed layer, cropped only by the screen.
Files: `web/src/components/report/DawnClosing.tsx`.
Refs: spec "The sun, free of the column"; ADR-51; acceptance 5; CSS from R05-03.
Changes: the Sun and its warm light move to the fixed layer the stylesheet now defines, driven by
the same `--p` from the same rAF-throttled scroll handler, rendered only while `--p > 0` so nothing
sits over another chapter; the closing prose, its citations and the three groups with their
checklists are unchanged except that the prose reads `var(--paper)` while the eyebrow and hair line
keep the accent; reduced motion renders the final frame; print stays hidden.
Done when: typecheck and `build:web` pass; at 1440 px scrolling into the Closing brings the Sun
into the viewport's top right cropped only by the viewport, at 390 px it is 82vw in the same corner,
and scrolling away from the chapter removes it.
Sequencing: wave 1.

### R05-12 The sky before the chart — INTERNAL · Sonnet
Objective: `/status` serves what the orrery needs and nothing dead.
Files: `api/src/routes/reports.ts` (the status handler only).
Refs: spec "The door at 67%" (provisional); Pinned shapes (`/status`); MB-54.
Changes: `progress` and `currentStep` and their two tables go; `provisional` is computed only while
`p.chartData` is null, from one local `calculateNatalChart` on the profile's entered date and time
at offset 0, reduced to each body's `absoluteDegree` and `retrograde`; `sections` and `chartReady`
are unchanged, and `SECTION_IDS` now yields eleven keys.
Constraints: nothing is stored and nothing is geocoded; the handler stays synchronous and under a
millisecond of extra work per poll; a chart that cannot be computed returns `provisional: null`
rather than failing the poll.
Done when: typecheck, `build:api` and api unit tests pass; a status response for a report whose
profile has no `chartData` carries thirteen bodies and no houses or angles, and the same report
after the chart is stored carries `provisional: null`.
Sequencing: wave 1. The only card on `reports.ts`.

### R05-13 One page, and the old synastry surface retired — USER-FACING · Sonnet · provisional MB-56
Objective: `/generating/:id` stops being a page, and nothing with a score is reachable.
Files: `web/src/App.tsx`, `web/src/pages/DashboardPage.tsx`, delete
`web/src/pages/GenerationPage.tsx`, delete `web/src/pages/SynastryReportPage.tsx`.
Refs: spec "The door at 67%" (one page), acceptance 9; compatibility spec "The old synastry report
is retired", ADR-45; MB-9 (decided), MB-53, MB-56; MASTERFILE §2 "V1 explicitly excludes".
Changes: `/generating/:id` becomes a redirect to `/report/:id` and its lazy import and prefetch go;
`/synastry/:id` and its page go; dashboard zone 3, its composer, its relationship rows and the
invite modal it opened go with it. `/claim`, the invite and relationship routes, the tables and
`synastryCompute.ts` are untouched, so a link already sent still works.
Constraints: no other card edits `App.tsx`; `MyPeoplePage` is out of scope (MB-22).
Done when: typecheck, `build:web` and unit tests pass; `git grep -rn "GenerationPage\|SynastryReportPage\|/synastry/"
web/src` returns nothing; `/generating/<id>` lands on the report page; the dashboard renders zones
1 and 2 with no dead query.
Sequencing: wave 1.

### R05-14 Assemble: ten chapters behind a door — USER-FACING · Opus
Objective: the page composed from the round's parts, with the removals.
Files: `web/src/pages/ReportPage.tsx`; delete `report/PathBlock.tsx`, `NodalAxis.tsx`, `nodal-axis.test.ts`.
Refs: spec "Ten chapters", "The door at 67%", "Skeletons"; ADR-46, 47, 50, 51; acceptance 3, 4, 7, 9, 10, 12.
Changes: `CHAPTERS` becomes the pinned ten, `TOTAL` 10, chapter 10 Closing in eyebrow and title,
printed once over "10 / 10", rendering `DawnClosing`; `PathBlock` and `NodalAxis` go with its old
aside; `OpeningOverlay` holds the page until the reader takes the door or it opens itself, then the
hero ring's centre and radius reach `ReportSky` as `gatherTo`; an unlanded chapter renders
`ChapterSkeleton`; Export PDF reads the door's status and flips at `complete` with no reload;
`chapterAccent(i)` takes one argument; the v6 branch and the print blocks stay.
Done when: typecheck, both builds and unit tests pass; `git grep -n "PathBlock\|NodalAxis"` returns
nothing; on the preview with the API slowed the overlay runs the orrery from `provisional`, the door
appears at the seventh landed section, skeletons fill behind it, Export PDF flips without a reload,
and a report left alone opens itself at 100%.
Sequencing: wave 2, alone.

## Parallelism

Wave 0: R05-01, R05-02, R05-03 together, the three files every other card would queue on.
Wave 1: R05-04 to R05-13, ten builders on disjoint files — API 04 and 12, report components 05, 06,
07, 09, 10, 11, overlay and progress 08, routing 13. Wave 2: R05-14 alone.

Then the gate: `install --frozen-lockfile` · typecheck · `build:web` · `build:api` · unit tests ·
codegen leaves no diff · `db:bootstrap` twice (R05-04 adds a column) · report lab on the five
fixtures, pasted · Vercel preview smoke. Close per §11.2 step 5: round report, `INDEX.md`
regenerated, CLAUDE.md current focus, Mailbox updated, bible prompt re-sync and a USER-FACING
release-log row (R-8.1), pull request merged by the orchestrator.

## Coverage

Acceptance 1 → 05 · 2 → 06 · 3 → 01, 02, gate · 4 → 03, 05, 09, 14 · 5 → 03, 11 · 6 → 07, 08, 12,
14 · 7 → 08, 09, 14 · 8 → 10 · 9 → 13 · 10 → 03, 10 · 11 → 05 · 12 → gate. MB-48 acceptance 7 → 04.
ADR-45 → 13. Spec lines: "the dead `natal:path` admin key" → 01; "the rail lists chapters only" →
09; "the closing's prose reads in paper" → 11; house links 5 and 11 → 05; the sixty star divs → 13.

## Risks

- **USER-FACING report content twice over**: v6 with one section fewer, and MB-48 changing the
  offset every new chart is computed at. R-4.4 and R-5.5 bite; the lab on five fixtures is the
  evidence and it is pasted. Expect about 4,770 to 5,110 words and 28 to 29 cents a report, down
  from R04's 31.0 ¢, since path's call and its 280 words go. Acceptance 3 fails above 35 ¢, and
  MB-46's lever stays available.
- **Schema and cache.** `profiles.timezone` plus `CHART_VERSION 3` means every cached chart
  recomputes on next read, so a stored report's text could disagree with its redrawn chart. It
  cannot show: every report written before this round is v5 and sits behind the v6 regenerate gate
  (MB-45). `db:bootstrap` runs twice in the gate.
- **Contract removals.** `/status` loses `progress` and `currentStep`; the only consumer was the
  page R05-13 deletes. `ReportInterpretation.path` goes while stored v5 rows keep the key, which is
  why the guard is a version check and not a shape check.
- **The orrery is the heaviest thing on the first screen a buyer meets.** Eleven rings, renders,
  one rAF loop; acceptance 8 wants no dropped frame on a mid-range phone and the gather is 2.3 s on
  top of it. If the loop cannot hold, the fallback is fewer stars in the gather, never fewer bodies.
- **User-visible removals**: dashboard zone 3 takes the only invite entry with it (MB-56), and the
  generation screen disappears as a page (locked, ADR-47).
- The compatibility spec sits locked and unbuilt for at least two rounds (MB-53); its plumbing
  stays, so the delay costs nothing but freshness.
- Deferred on purpose: the whole of unknown-birth-time beyond MB-48 (MB-54), MB-30's geocode move,
  fixtures gaining zones, the landing page's ten-chapter grid (MB-8), `opengraph.jpg` (MB-13), a
  true-alpha Sun export, Placidus, light mode.

## Questions raised

New Mailbox rows, created before the round starts: **MB-53** (decision, launch) the compatibility
report cannot be built before payments; **MB-54** (decision, launch) unknown birth time splits,
MB-48 in R05 and the spec in R06; **MB-55** (decision, later) the ring creeps between milestones,
the pass-three lock's only open question, built at its default; **MB-56** (decision, launch)
retiring zone 3 removes the invite entry, entry points only.

Two questions for the Owner, highest stakes first, each with its recommendation:

1. **The compatibility report waits for payments (MB-53).** It is locked and it is the growth
   engine, but its flow is a checkout flow and MB-5 and MB-6 are four rounds open. Recommendation:
   pricing session next, then payments, then the compatibility round; R05 ships only ADR-45's
   retirement. If silent, that is what happens.
2. **Unknown birth time ships in R06, not R05 (MB-54).** Recommendation: R05 takes MB-48 alone, so
   the gift-buyer feature lands whole in R06 rather than as a blind report whose "Add my birth time"
   does nothing. If silent, that is what happens.

Existing rows: MB-44's provisional tags come off in R05-08 and R05-14; MB-45's guard moves to v6;
MB-48 is annotated and built; MB-9 is honoured by R05-13; MB-8's count is already ten; MB-47 stays
open at its default as the round adds four more pure web tests. `Rounds open` incremented on every
carried open row: the sixteen at 3 go to 4, MB-31, 32, 33, 35 and 39 to 3, MB-43, 47, 48, 49 and 50
to 1.
