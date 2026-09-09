# Index — regenerated at the end of every round (last: bootstrap, 2026-09-09)

Default read set: `CLAUDE.md` + this file + your agent file. Fetch the rest by pointer.

## Alignment
- `MASTERFILE.md` — the constitution: thesis, scope, domain, engine, rules, process, budgets.
- Notion Decisions — https://app.notion.com/p/89a14ed191cf4915826efe406bc9f835 (11 rows, all locked)
- Notion Mailbox — https://app.notion.com/p/7522fd3c9fd9450094cfdebabd205d3d (5 blocking, 12 launch, rest later or parked)
- The bible — https://claude.ai/code/artifact/7bd58e7a-995a-442e-94ea-7293d7ee3fd2 (product reference; prompt section is generated)

## Specs
- `docs/specs/locked/` — none yet. First candidate: pricing and packaging.
- `docs/specs/draft/` — none yet.

## Rounds
- `docs/rounds/` — none yet. R01 is planned to be the blocking Mailbox rows once PR #6 lands.

## QA
- `docs/qa/` — none yet.

## Annex
- `docs/annex/` — none yet. Bible maintenance checklist arrives here when the bible branch merges.

## Code map
- `web/` React + Vite SPA (Vercel) · `api/` Express API (Railway) · `packages/db` drizzle schema
- `packages/api-spec` OpenAPI + Orval → `api-client-react`, `api-zod` · `scripts/` seeds and bootstrap
- `e2e/` Playwright (stale) · `fixtures/charts/` reference birth data (lands with PR #6) · `mobile/` empty scaffold
- `README.md` — setup, deploy targets, porting notes. Still the human onboarding page.

## Agents and commands
- `.claude/agents/` planner · orchestrator · builder · qa
- `.claude/commands/` /ideate · /lock · /plan · /round · /qa · /mailbox
- `.github/pull_request_template.md` — the gate checklist every PR carries
