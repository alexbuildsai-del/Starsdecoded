# Index — regenerated at the end of every round (last: R07, 2026-09-24)

Default read set: `CLAUDE.md` + this file + your agent file. Fetch the rest by pointer.

## Alignment
- `MASTERFILE.md` — the constitution: thesis, scope, domain, engine, rules, process, budgets.
- Notion Decisions — https://app.notion.com/p/89a14ed191cf4915826efe406bc9f835 (85 rows; ADR-78 to 85 from the dashboard-sky lock; ADR-73 to 77 from the model-matrix revision, superseding ADR-56 and amending ADR-55 and R-4.4; ADR-72 the on-tap scenes on gpt-5.2; ADR-7 superseded by ADR-15; ADR-20 to 28 from the 18 Sept ideation; ADR-29 to 32 from the logo lock; ADR-33 to 38 from the unknown-birth-time lock; ADR-39 to 45 from the compatibility lock, ADR-5 parity clause and ADR-32 synastry title superseded; ADR-46 to 51 from the pass-three lock, amending ADR-20, 22, 24, 25, 26; ADR-52 to 58 from the model-matrix lock, R-5.6 rewritten; ADR-59 to 62 from the Review 20/09 lock, amending ADR-44, 47, 51; ADR-63 to 71 from the compatibility second pass, amending ADR-40, 43)
- Notion Mailbox — https://app.notion.com/p/7522fd3c9fd9450094cfdebabd205d3d (3 blocking: MB-31 entity, MB-68 OpenAI credits, MB-69 `LAB_TOKEN`; MB-70 GPT-6 prices provisional, MB-72 publish r05/r06 blocked by MB-69; MB-71 done in R07; MB-73, 74 raised by R07; MB-63, 64, 65 built at their defaults; MB-66, 67 raised by R06; MB-6, 43, 47, 55 at their defaults; MB-57 credits DDL with pricing; MB-58 old synastry rows hidden; MB-59 the claim lands without generating)
- The bible — https://claude.ai/code/artifact/7bd58e7a-995a-442e-94ea-7293d7ee3fd2 (product reference; prompt section is generated)

## Specs
- `docs/specs/locked/natal-report-ui.md` — Observatory (R03): the wheel on real degrees, citations as superscripts,
  no invented prose. Prototype: https://claude.ai/artifact/BRbKnKKjC78Xe3egLtanZz
- `docs/specs/locked/natal-report-pass-two.md` — R04: explorer with generated house cards, rail and workbook, angle
  evidence, fixed accents, dawn, progressive loading. Artifact: https://claude.ai/artifact/5Er5qfQVMn2DYkuyGGdPJs
- `docs/specs/locked/compatibility-report.md` — R05: two finished natal reports in, one out; three lenses, nine
  chapters, the bi-wheel, no score, one credit. Artifact: https://claude.ai/artifact/AmsN9XxzbU81Ek18dAsBuk
- `docs/specs/locked/natal-report-pass-three.md` — R05: ten chapters ending in Closing, the angle marker, silent
  ticks, one sky, the door at 67% over an orrery of the chart. Artifact: https://claude.ai/artifact/HKt4HYfKKmwadcKTmTxWob
- `docs/specs/locked/unknown-birth-time.md` — R05: the horizon as a status, three-way birth time with a live readout,
  the blind report, the horizon pass by quote match, one free update. Artifact: https://claude.ai/artifact/GicHa2umwRm5rQDuWVLp9p
- `docs/specs/locked/logo.md` — the mark is A · Horizon (wheel, horizon line, brass Ascendant point), plain Newsreader wordmark, one SVG source for six surfaces. Artifact: https://claude.ai/artifact/CooaGybDudirhVvN128dgj
- `docs/specs/locked/review-20-09.md` — R06: phone hero, two skies, the generation screen as a screen, the Closing
  gap, evidence in claims only, Personal natal report, the why line. Artifact: https://claude.ai/artifact/M9SMzqwbNcXtuSZGws2p2F
- `docs/specs/locked/compatibility-report-p2.md` — R06, the brain: seven chapters, two charts first, five lens chapters
  with cards and scenes, the age band, Two people, per-chapter briefs, the two-triad hero. Artifact: https://claude.ai/artifact/Am3TWP2XpqkbzZy8M9tBXL
- `docs/specs/locked/report-lab-model-matrix.md` — R07: GPT-6 Sol and Luna against gpt-5.2, OpenAI only; sessions generate
  on spawn; the lab at four levels, full only at Promote. Base in the annex. Artifact: https://claude.ai/artifact/RRnfSk9Ci3VwxapoXwi6ub
- `docs/specs/locked/dashboard-sky.md` — the dashboard orbit, the computed card, the pair upsell, credits, empty states. Artifact: https://claude.ai/artifact/6GpndVJxZUfHAdULYYg2GX
- Drafts: `report-cost-and-latency.md` (27.1 cents measured, L0 built) · `staging-environment.md` (main → staging, production branch → production; runbook https://claude.ai/code/artifact/d1091f1b-3923-488c-9596-93c92df325e7)

## Rounds
- `R01` claims made true, DELETE report, legal drafts, smoke workflow · `R02` usage telemetry, 27.1 cents baseline · `R03` the wheel from real
  degrees, citations, house cards, hero and chapter shell · `R04` pass two: eleven chapters, the workbook, dawn, a report that opens while it
  writes, mean 31.0 ¢. Plans and reports under `docs/rounds/`; R01 to R04 await Owner acceptance.
- `R05` pass three, unknown birth time, the compatibility report (#53, #54) · `R06` the nine review fixes, p2, on-tap scenes (`pair` lab waits on MB-68)
  · `R07` the lab in the admin panel, replays and sessions on the server, the release gate in Promote; all INTERNAL; staging steps wait on MB-69.

## Code map (QA: `docs/qa/` none yet · annex: `staging-runbook.md` the Owner's staging setup · `report-lab-model-matrix-annex.md` the matrix's base scope)
- `web/` React + Vite SPA (Vercel) · `api/` Express API (Railway) · `packages/db` drizzle schema
- `web/src/components/chart/` wheel geometry, `NatalWheel`, the bi-wheel · `web/src/components/report/` hero and its
  label solver with the phone stack, the pair hero, angle glyph, explorer, house card, chapter, rail, checklist, orrery
  and the generation screen, skeletons, revision marks and ledger, link cards, pair sections, scene chips, share card,
  dawn, citations, the two skies · `web/src/lib/` glossary, rulers, renders, accents, occupants, progress, orrery, gather,
  birth time, lenses, product name, the workbook store · `web/src/hooks/useLiveReport.ts`
- `api/src/prompts/` natal sections and `pair/` (two fixed chapters, `sections/{partners,parent-child,people}/`, the band
  doctrine) · `api/src/lib/` chart engine with the horizon status, traditional factors, interpretation with the claims-only
  retry, horizon pass, pair brief per chapter, on-tap scenes (`pairScene.ts`), overlays, credits
- `packages/api-spec` OpenAPI + Orval → `api-client-react`, `api-zod` · `scripts/` seeds and bootstrap · `README.md` human onboarding
- `e2e/` Playwright (stale) · `fixtures/charts/` seven charts plus six pair-only band fixtures, birth data only · `fixtures/pairs/` five pairs ·
  `fixtures/passes/` the stored r05 pass · `fixtures/reports/` one committed run (pre-R05 chart, MB-73), `--render` re-reads it free · `mobile/` empty
- `api/src/lib/models.ts` the catalogue with pinned effort and Flex, `usage.ts` token accounting · `web/src/pages/legal/` draft legal pages · `api/src/lib/deletion.ts` (MB-32)
- The lab: `api/src/lib/labRules.ts` (faults, bands, the gate) shared with `scripts/src/report-lab.ts` (publish, dry, spot, release, gate, stub) ·
  `labGuard.ts`, `labReplay.ts`, `labSession.ts` · routes `adminLab.ts`, `adminLabSessions.ts` under `/api/admin/lab` (outside the spec) ·
  `web/src/pages/AdminLabPage.tsx`, `web/src/components/lab/`, `web/src/lib/labApi.ts`, `labCards.ts` · tables `lab_runs`, `lab_judgements`

## Agents and skills
- `.claude/agents/` planner · orchestrator · builder · qa · `.claude/skills/` /ideate · /lock · /plan · /round · /qa · /mailbox · /report-lab · `.github/pull_request_template.md` the gate checklist every PR carries
- `.github/workflows/` `ci.yml` typecheck, builds, tests · `smoke.yml` + `smoke-run.yml` deploy check · `report-lab.yml` every lab level (needs `LAB_TOKEN`
  in the `staging` environment) · `lab-spot.yml` the spot replay after a green Smoke · `promote.yml` the release gate, then the fast-forward
