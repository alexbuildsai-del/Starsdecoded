# Index — regenerated at the end of every round (last: R01, 2026-09-09)

Default read set: `CLAUDE.md` + this file + your agent file. Fetch the rest by pointer.

## Alignment
- `MASTERFILE.md` — the constitution: thesis, scope, domain, engine, rules, process, budgets.
- Notion Decisions — https://app.notion.com/p/89a14ed191cf4915826efe406bc9f835 (11 rows, all locked)
- Notion Mailbox — https://app.notion.com/p/7522fd3c9fd9450094cfdebabd205d3d (1 blocking: MB-31 entity; the rest launch, later or parked)
- The bible — https://claude.ai/code/artifact/7bd58e7a-995a-442e-94ea-7293d7ee3fd2 (product reference; prompt section is generated)

## Specs
- `docs/specs/locked/` — none yet. First candidate: pricing and packaging.
- `docs/specs/draft/` — none yet.

## Rounds
- `docs/rounds/R01-plan.md` · `R01-report.md` — claims made true, DELETE report, legal drafts, smoke workflow. Owner acceptance pending.

## QA
- `docs/qa/` — none yet.

## Annex
- `docs/annex/` — none yet. Bible maintenance checklist arrives here when the bible branch merges.

## Code map
- `web/` React + Vite SPA (Vercel) · `api/` Express API (Railway) · `packages/db` drizzle schema
- `packages/api-spec` OpenAPI + Orval → `api-client-react`, `api-zod` · `scripts/` seeds and bootstrap
- `e2e/` Playwright (stale) · `fixtures/charts/` five reference charts, birth data only · `mobile/` empty scaffold
- `web/src/pages/legal/` draft legal pages · `api/src/lib/deletion.ts` profile-fate seam (MB-32)
- `README.md` — setup, deploy targets, porting notes. Still the human onboarding page.

## Agents and commands
- `.claude/agents/` planner · orchestrator · builder · qa
- `.claude/commands/` /ideate · /lock · /plan · /round · /qa · /mailbox
- `.github/pull_request_template.md` — the gate checklist every PR carries
- `.github/workflows/ci.yml` typecheck, builds, unit tests · `smoke.yml` deploy verification on push to main
