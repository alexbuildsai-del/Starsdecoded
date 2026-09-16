# R02 plan — engine usage telemetry (L0)

From `docs/specs/draft/report-cost-and-latency.md`. The Owner greenlit L0 alone
on 2026-09-16. INTERNAL: no prompt, schema, or report content changes. Closes
MB-10 and produces the baseline every later cost or latency lever is judged by.

Branch `round/R02`, off `main`.

## Why these shapes

**Usage must live in `interpretation.meta`.** The lab's primary mode is
`--remote` against staging, where it is an anonymous visitor reading
`GET /reports/:id`. An admin endpoint would need `ADMIN_USER_ID`, which the lab
does not have, so the interpretation itself is the only channel that works.
Consequence: a buyer could read their own report's token counts. Harmless, and
worth the measurement. `MethodologyBox` reads named fields, so nothing renders.

**Cost is computed and frozen at generation time.** A price table with a dated
comment lives in one module; the stored dollar figure is what the run actually
cost, so a later price change never rewrites history.

**`completion_tokens` already includes reasoning tokens**, and `prompt_tokens`
already includes cached ones. Cost is therefore
`(prompt - cached)*in + cached*cachedIn + completion*out`, and reasoning is
carried separately as a diagnostic, never added again.

## Cards

### R02-01 · `api/src/lib/usage.ts` (new) + `usage.test.ts` (new)
The price table (`gpt-5.2`, `gpt-5-mini`, dated), `SectionUsage` and
`ReportUsage` types, `costUsd`, and a reducer folding sections into totals.
Pure, no I/O. Tests cover the cached-token split, reasoning not being
double-counted, a multi-attempt section, and an unpriced model returning null
rather than a wrong number.
Done when: `pnpm --filter @workspace/api-server test` passes.

### R02-02 · `api/src/lib/aiInterpretation.ts`
`callSection` returns `{ data, usage }`, accumulating across retry attempts and
timing each call. `generateInterpretation` collects all eleven, records
wall-clock separately from the summed per-call time (the gap is the parallelism
win), and writes `meta.usage`. One `logger.info` per report with the totals.
Done when: typecheck passes; no prompt, schema or section text is touched.

### R02-03 · `packages/api-spec/openapi.yaml` + codegen
Add `usage` to `ReportInterpretation.meta` as an **optional** property, so
reports generated before this round still validate. Run
`pnpm --filter @workspace/api-spec run codegen`; generated files are never
hand-edited.
Done when: codegen is clean and the generated diff is only the new field.

### R02-04 · `scripts/src/report-lab.ts`
Per-section `in`, `cached`, `out`, `reasoning`, `$` and `s` columns, plus a
report total line with cost, wall clock and summed call time. Reads
`meta.usage`; prints the existing table unchanged when it is absent, so old
runs and `--compare` still work.
Done when: the table renders from the committed fixture shape with no API call.

## Gate

`pnpm run typecheck`, `pnpm run build:web`, `pnpm run build:api`, unit tests.

The report lab cannot run here: no `OPENAI_API_KEY` and no route to Postgres or
staging from the sandbox, exactly as in R01. R-4.4's run is the Report lab
workflow dispatched against staging after this merges to `main` — which is also
the point of the round, since the baseline needs real calls. The measurement
goes into `docs/rounds/R02-report.md` and closes MB-10.
