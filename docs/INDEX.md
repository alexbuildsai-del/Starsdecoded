# Index — regenerated at the end of every round (last: lock natal-report-pass-two, 2026-09-18)

Default read set: `CLAUDE.md` + this file + your agent file. Fetch the rest by pointer.

## Alignment
- `MASTERFILE.md` — the constitution: thesis, scope, domain, engine, rules, process, budgets.
- Notion Decisions — https://app.notion.com/p/89a14ed191cf4915826efe406bc9f835 (28 rows; ADR-7 superseded by ADR-15; ADR-20 to 28 from the 18 Sept ideation)
- Notion Mailbox — https://app.notion.com/p/7522fd3c9fd9450094cfdebabd205d3d (1 blocking: MB-31 entity; MB-38 decided by ADR-28; MB-29 and MB-40 to MB-42 done; MB-13 owes only opengraph.jpg)
- The bible — https://claude.ai/code/artifact/7bd58e7a-995a-442e-94ea-7293d7ee3fd2 (product reference; prompt section is generated)

## Specs
- `docs/specs/locked/natal-report-ui.md` — Observatory; the wheel rebuilt on real degrees, citations as
  superscripts, no invented prose. Prototype: https://claude.ai/artifact/BRbKnKKjC78Xe3egLtanZz
- `docs/specs/locked/natal-report-pass-two.md` — the 18 Sept review: chart explorer with generated house
  cards, eleven chapters, aside rail and workbook, angle evidence, fixed accents, dawn closing, progressive
  loading, 3,500 to 5,500 words. Artifact: https://claude.ai/artifact/5Er5qfQVMn2DYkuyGGdPJs
- `docs/specs/draft/report-cost-and-latency.md` — 27.1 cents a report measured; output 74%, half of it invisible. Levers re-ranked on the R02 baseline; L0 built.
- `docs/specs/draft/staging-environment.md` — main → staging, production branch → production, prompts promoted with each release. Owner runbook in the annex and as a tickable page: https://claude.ai/code/artifact/d1091f1b-3923-488c-9596-93c92df325e7

## Rounds
- `docs/rounds/R01-plan.md` · `R01-report.md` — claims made true, DELETE report, legal drafts, smoke workflow. Owner acceptance pending.
- `docs/rounds/R02-plan.md` · `R02-report.md` — usage telemetry (L0). Baseline measured: 27.1 cents a report, reasoning tokens zero. MB-10 closed.
- `docs/rounds/R03-plan.md` · `R03-report.md` — Observatory tokens, the wheel drawn from real degrees, citations as
  superscripts, house cards from generated strings, hero and chapter shell. Owner acceptance pending.

## QA
- `docs/qa/` — none yet.

## Annex
- `docs/annex/staging-runbook.md` — the Owner's one-time dashboard setup for staging (Supabase, Railway, Vercel, GitHub).
- Bible maintenance checklist arrives here when the bible branch merges.

## Code map
- `web/` React + Vite SPA (Vercel) · `api/` Express API (Railway) · `packages/db` drizzle schema
- `web/src/components/chart/` pure wheel geometry + `NatalWheel` (vitest) · `web/src/components/report/` hero,
  chapters, citations, house cards, chrome · `web/src/lib/` glossary, rulers, renders, chapter accent
- `packages/api-spec` OpenAPI + Orval → `api-client-react`, `api-zod` · `scripts/` seeds and bootstrap
- `e2e/` Playwright (stale) · `fixtures/charts/` five reference charts, birth data only · `mobile/` empty scaffold
- `fixtures/reports/` one committed run; `pnpm report:lab --render` re-reads it free. Never generate a report just to look at one — see that folder's README
- `api/src/lib/usage.ts` model prices and token accounting; every call lands on `meta.usage`
- `web/src/pages/legal/` draft legal pages · `api/src/lib/deletion.ts` profile-fate seam (MB-32)
- `README.md` — setup, deploy targets, porting notes. Still the human onboarding page.

## Agents and skills
- `.claude/agents/` planner · orchestrator · builder · qa
- `.claude/skills/` /ideate · /lock · /plan · /round · /qa · /mailbox — one `SKILL.md` each; the description is the trigger, so plain English works too
- `.github/pull_request_template.md` — the gate checklist every PR carries
- `.github/workflows/ci.yml` typecheck, builds, unit tests · `smoke.yml` deploy check on push to main (staging) and production · `smoke-run.yml` its reusable body · `promote.yml` fast-forwards production after a staging smoke
