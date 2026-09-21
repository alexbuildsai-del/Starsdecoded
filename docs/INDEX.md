# Index — regenerated at the end of every round (last: model-matrix lock, 2026-09-21)

Default read set: `CLAUDE.md` + this file + your agent file. Fetch the rest by pointer.

## Alignment
- `MASTERFILE.md` — the constitution: thesis, scope, domain, engine, rules, process, budgets.
- Notion Decisions — https://app.notion.com/p/89a14ed191cf4915826efe406bc9f835 (58 rows; ADR-7 superseded by ADR-15; ADR-20 to 28 from the 18 Sept ideation; ADR-29 to 32 from the logo lock; ADR-33 to 38 from the unknown-birth-time lock; ADR-39 to 45 from the compatibility lock, ADR-5 parity clause and ADR-32 synastry title superseded; ADR-46 to 51 from the pass-three lock, amending ADR-20, 22, 24, 25, 26; ADR-52 to 58 from the model-matrix lock, R-5.6 rewritten)
- Notion Mailbox — https://app.notion.com/p/7522fd3c9fd9450094cfdebabd205d3d (1 blocking: MB-31 entity; MB-39 decided by the model-matrix lock; MB-6, 43, 47, 55 built at their defaults; MB-57 credits DDL and no-credit CTA deferred to pricing; MB-58 old synastry rows hidden; MB-59 the claim lands without generating; MB-49/52 credit rules with pricing)
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
- `docs/specs/locked/report-lab-model-matrix.md` — the lab in the admin panel: server-side replay, runs in the
  database, the Owner judges writers blind per section; five mixes priced on R05 usage. Artifact: https://claude.ai/artifact/RRnfSk9Ci3VwxapoXwi6ub
- `docs/specs/draft/report-cost-and-latency.md` — 27.1 cents a report measured; output 74%, half of it invisible. Levers re-ranked on the R02 baseline; L0 built.
- `docs/specs/draft/staging-environment.md` — main → staging, production branch → production, prompts promoted with each release. Owner runbook in the annex and as a tickable page: https://claude.ai/code/artifact/d1091f1b-3923-488c-9596-93c92df325e7

## Rounds
- `docs/rounds/R01-plan.md` · `R01-report.md` — claims made true, DELETE report, legal drafts, smoke workflow. Owner acceptance pending.
- `docs/rounds/R02-plan.md` · `R02-report.md` — usage telemetry (L0). Baseline measured: 27.1 cents a report, reasoning tokens zero. MB-10 closed.
- `docs/rounds/R03-plan.md` · `R03-report.md` — Observatory tokens, the wheel, citations, house cards, hero and chapter shell. Owner acceptance pending.
- `docs/rounds/R04-plan.md` · `R04-report.md` — pass two: eleven chapters, house cards, the workbook, dawn, streaming. Lab pasted, mean 31.0 ¢. Owner acceptance pending.
- `docs/rounds/R05-plan.md` · `R05-report.md` — pass three, unknown birth time and the compatibility report: ten
  chapters, the door over the orrery, the horizon pass, nine pair chapters. Gate green; lab and smoke need credentials.

## QA — `docs/qa/` none yet.

## Annex
- `docs/annex/staging-runbook.md` — the Owner's one-time dashboard setup for staging (Supabase, Railway, Vercel, GitHub).
- Bible maintenance checklist arrives here when the bible branch merges.

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
- `.claude/agents/` planner · orchestrator · builder · qa
- `.claude/skills/` /ideate · /lock · /plan · /round · /qa · /mailbox · /report-lab — one `SKILL.md` each; the description is the trigger, so plain English works too
- `.github/pull_request_template.md` — the gate checklist every PR carries
- `.github/workflows/ci.yml` typecheck, builds, unit tests · `smoke.yml` deploy check on push to main (staging) and production · `smoke-run.yml` its reusable body · `promote.yml` fast-forwards production after a staging smoke
