## What shipped

<!-- One line per change, each tagged USER-FACING or INTERNAL. A change to report content is USER-FACING even when no UI moved. -->

## Refs

- Round plan / spec: <!-- docs/rounds/RNN-plan.md or docs/specs/locked/<slug>.md -->
- Mailbox rows raised or resolved: <!-- MB-NN … -->
- Provisional seams: <!-- MB-NN … or none -->

## Gate

- [ ] `pnpm run typecheck`
- [ ] `pnpm run build:web` and `pnpm run build:api`
- [ ] `pnpm -r --filter '!@workspace/e2e' --if-present run test`
- [ ] Report lab run against fixtures (required when `api/src/lib/` or prompts changed) — paste the measurement
- [ ] Smoke-tested on the Vercel preview
- [ ] No new use of the name "Astra"; no secret in the diff
