# R02 report — engine usage telemetry (L0)

Plan: `docs/rounds/R02-plan.md`. Spec:
`docs/specs/draft/report-cost-and-latency.md`. Four cards, all shipped.

## Shipped

- **INTERNAL** `api/src/lib/usage.ts` (new). The one place model prices live
  (`gpt-5.2`, `gpt-5-mini`, dated 2026-09-16) and the one place the arithmetic
  lives. `prompt_tokens` already includes cached and `completion_tokens`
  already includes reasoning, so the billable split is `(prompt - cached)`,
  `cached`, `completion`, and reasoning is a diagnostic never charged twice.
  Cost is frozen at generation time, so a later price change cannot rewrite a
  past run. An unpriced model yields `null`.
- **INTERNAL** `api/src/lib/usage.test.ts` (new). Eight tests: the cached split,
  reasoning not double-counted, a retried section, a reply with no usage block,
  a cached count exceeding the prompt, an unpriced model, the `gpt-5-mini`
  ratio, and summed call time exceeding wall clock.
- **INTERNAL** `api/src/lib/aiInterpretation.ts`. `callSection` returns
  `{ data, usage }` and accumulates across retry attempts, so a section that
  failed validation twice reports three calls and three calls' worth of tokens.
  `generateInterpretation` records wall clock separately from summed call time
  and writes `meta.usage`. One `logger.info` per report with the totals and the
  names of any sections that retried.
- **INTERNAL** `packages/api-spec/openapi.yaml` + regenerated client and zod.
  `usage` is **optional** on `ReportInterpretation.meta`, so every report
  generated before this round still validates. New `UsageTotals` component.
- **INTERNAL** `scripts/src/report-lab.ts`. Per-call `tries / in / cached / out
  / reason / $ / s` table with a TOTAL row, then cost, wall clock against call
  time, the prose-versus-invisible output split, the cache hit rate and which
  sections retried. Prints the old table unchanged when `meta.usage` is absent,
  so `--compare` and pre-R02 runs still work.

No prompt, section schema, vocabulary or brief was touched. No report content
changes, so nothing is USER-FACING.

## One deviation, deliberate

R02-04's acceptance clause asked the table to render from a fixture with no API
call, and no such path existed. Added `--render <run>`, which re-measures a run
already on disk: it is how this round's output was verified without spending,
and the smallest piece of the spec's L1. Lab-only, INTERNAL, no product
surface. `report()` returns early before writing, so a re-render cannot
overwrite the run it read.

Verified against a synthetic run built from the real `marie-curie` chart with
usage shaped as the engine writes it: per-call rows correct, a seeded
`career x2` retry doubling that row's input and cost, TOTAL summing, 296.6s of
call time against 48.6s wall clock. Content flags there are meaningless by
construction — the sections were placeholders, not prose.

## Gate

| check | result |
|---|---|
| `pnpm run typecheck` | clean |
| `pnpm run build:api` | pass |
| `pnpm run build:web` | pass |
| unit tests | 49/49 pass (41 before, 8 added) |
| codegen | clean; diff is the new field only |
| report lab | **not run here** — see below |

## Not verified here

The lab needs `OPENAI_API_KEY` and a route to Postgres or staging; the sandbox
has neither, exactly as in R01. R-4.4's run is the **Report lab workflow
dispatched against staging after this merges to `main`** — which is the point
of the round, since the baseline needs real calls. Until it runs:

- No measured per-report cost is on record, so **MB-10 is closed by the code,
  not by the number**. It stays open until the dispatch lands.
- The reasoning-token share is still unknown. It is the largest unmeasured term
  in the spec and decides whether L2 (`reasoning_effort`) is worth a round.
- Retry rate across the five fixtures is unknown.

Dispatch `chart: all`, `label: r02-baseline`, then paste the tables here.

## Decision recorded in code

Usage lives on `meta.usage`, not an admin endpoint or a separate column,
because the lab's `--remote` mode reads a deployed report as an anonymous
visitor and has no other channel. Consequence: a buyer could read their own
report's token counts. `MethodologyBox` reads named fields, so nothing renders.

## Mailbox

MB-10 stays `open` pending the staging measurement. No new rows.
