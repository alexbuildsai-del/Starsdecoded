## What shipped

<!-- One line per change, each tagged USER-FACING or INTERNAL. A change to report content is USER-FACING even when no UI moved. -->

## Refs

- Round plan / spec: <!-- docs/rounds/RNN-plan.md or docs/specs/locked/<slug>.md -->
- Mailbox rows raised or resolved, backlog lines done, decisions taken: <!-- MB-NN, B-NN, ADR-NN … -->
- Provisional seams: <!-- MB-NN … or none -->

## Gate

- [ ] `pnpm run typecheck`
- [ ] `pnpm run build:web` and `pnpm run build:api`
- [ ] `pnpm -r --filter '!@workspace/e2e' --if-present run test` (the critical tier) and the buyer walk, both green in CI
- [ ] `pnpm check:shipped` (the shipped-code check)
- [ ] `pnpm audit --prod --audit-level high` and gitleaks over the diff, both green in CI
- [ ] Report lab run against fixtures (required when `api/src/lib/` or prompts changed) — paste the measurement
- [ ] Smoke-tested on the Vercel preview, and the security probe (web half) green on it
- [ ] Site checks (Lighthouse and axe) green on the Vercel preview, no budget loosened
- [ ] Sentinel read `main...round/RNN` with no blocking finding open; the rest are backlog lines or private Mailbox rows (B-NN, MB-NN …)
- [ ] No new use of the name "Astra"; no secret in the diff
