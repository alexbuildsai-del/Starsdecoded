# Index — regenerated at the end of every round (last: locks 2026-09-21, after R05)

Default read set: `CLAUDE.md` + this file + your agent file. Fetch the rest by pointer.

## Alignment
- `MASTERFILE.md` — the constitution: thesis, scope, domain, engine, rules, process, budgets.
- Notion Decisions — https://app.notion.com/p/89a14ed191cf4915826efe406bc9f835 (71 rows; ADR-7 superseded by ADR-15; ADR-20 to 28 from the 18 Sept ideation; ADR-29 to 32 from the logo lock; ADR-33 to 38 from the unknown-birth-time lock; ADR-39 to 45 from the compatibility lock, ADR-5 parity clause and ADR-32 synastry title superseded; ADR-46 to 51 from the pass-three lock, amending ADR-20, 22, 24, 25, 26; ADR-52 to 58 from the model-matrix lock, R-5.6 rewritten; ADR-59 to 62 from the Review 20/09 lock, amending ADR-44, 47, 51; ADR-63 to 71 from the compatibility second pass, amending ADR-40, 43)
- Notion Mailbox — https://app.notion.com/p/7522fd3c9fd9450094cfdebabd205d3d (1 blocking: MB-31 entity; MB-38 open until R05's natal lab is pasted; MB-39 decided by the model-matrix lock; MB-6, 43, 47, 55 built at their defaults; MB-57 credits DDL and no-credit CTA deferred to pricing; MB-58 old synastry rows hidden; MB-59 the claim lands without generating; MB-49/52 credit rules with pricing)
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
- `docs/specs/locked/review-20-09.md` — next: phone hero, two skies, the generation screen as a screen, the Closing
  gap, evidence in claims only, Personal natal report, the why line. Artifact: https://claude.ai/artifact/M9SMzqwbNcXtuSZGws2p2F
- `docs/specs/locked/compatibility-report-p2.md` — next, the brain: seven chapters, two charts first, five lens chapters
  with cards and scenes, the age band, Two people, per-chapter briefs, the two-triad hero. Artifact: https://claude.ai/artifact/Am3TWP2XpqkbzZy8M9tBXL
- `docs/specs/locked/report-lab-model-matrix.md` — next: the lab in the admin panel, server-side replay, runs in the
  database, the Owner judges writers blind per section; five mixes priced on R05 usage. Artifact: https://claude.ai/artifact/RRnfSk9Ci3VwxapoXwi6ub
- Drafts: `report-cost-and-latency.md` (27.1 cents measured, L0 built) · `staging-environment.md` (main → staging,
  production branch → production; runbook page https://claude.ai/code/artifact/d1091f1b-3923-488c-9596-93c92df325e7)

## Rounds
- `R01` claims made true, DELETE report, legal drafts, smoke workflow · `R02` usage telemetry, 27.1 cents baseline. Plans
  and reports under `docs/rounds/`; R01 acceptance pending.
- `R03` the wheel from real degrees, citations, house cards, hero and chapter shell · `R04` pass two: eleven chapters,
  the workbook, dawn, a report that opens while it writes, mean 31.0 ¢. Both await Owner acceptance.
- `R05` pass three, unknown birth time and the compatibility report; lab measured on staging (#53, #54). Acceptance pending.

## QA — `docs/qa/` none yet. Annex: `docs/annex/staging-runbook.md` — the Owner's one-time staging setup; the bible checklist arrives with the bible branch.

## Code map
- `web/` React + Vite SPA (Vercel) · `api/` Express API (Railway) · `packages/db` drizzle schema
- `web/src/components/chart/` wheel geometry, `NatalWheel`, the bi-wheel · `web/src/components/report/` hero and its
  label solver, angle glyph, explorer, house card, chapter, rail, checklist, orrery and opening overlay, skeletons,
  revision marks and ledger, link cards, pair sections, dawn, citations · `web/src/lib/` glossary, rulers, renders,
  accents, occupants, progress, orrery, gather, birth time, lenses, the workbook store · `web/src/hooks/useLiveReport.ts`
- `api/src/prompts/` natal sections and `pair/` · `api/src/lib/` chart engine with the horizon status, traditional
  factors, interpretation, horizon pass, pair brief and overlays, credits
- `packages/api-spec` OpenAPI + Orval → `api-client-react`, `api-zod` · `scripts/` seeds and bootstrap
- `e2e/` Playwright (stale) · `fixtures/charts/` seven charts, birth data only (audrey-hepburn joins for the matrix) · `mobile/` empty scaffold
- `fixtures/reports/` one committed run; `pnpm report:lab --render` re-reads it free; `--pass`, `--pair` for R05's shapes
- `api/src/lib/usage.ts` model prices and token accounting; every call lands on `meta.usage`
- `web/src/pages/legal/` draft legal pages · `api/src/lib/deletion.ts` profile-fate seam (MB-32)
- `README.md` — setup, deploy targets, porting notes. Still the human onboarding page.

## Agents and skills
- `.claude/agents/` planner · orchestrator · builder · qa · `.claude/skills/` /ideate · /lock · /plan · /round · /qa · /mailbox · /report-lab
- `.github/pull_request_template.md` — the gate checklist every PR carries
- `.github/workflows/ci.yml` typecheck, builds, unit tests · `smoke.yml` deploy check on push to main (staging) and production · `smoke-run.yml` its reusable body · `promote.yml` fast-forwards production after a staging smoke
