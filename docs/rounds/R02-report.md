# R02 report — engine usage telemetry (L0)

Plan: `docs/rounds/R02-plan.md`. Spec: `docs/specs/draft/report-cost-and-latency.md`.

## Shipped

- **INTERNAL** `api/src/lib/usage.ts` + `usage.test.ts` (new). The one place
  prices live (`gpt-5.2`, `gpt-5-mini`, dated 2026-09-16) and the one place the
  arithmetic lives. `prompt_tokens` already includes cached and
  `completion_tokens` already includes reasoning, so the billable split is
  `(prompt - cached)`, `cached`, `completion`. Cost is frozen at generation
  time; an unpriced model yields `null`. Eight tests.
- **INTERNAL** `api/src/lib/aiInterpretation.ts`. `callSection` returns
  `{ data, usage }` and accumulates across retry attempts, so a section that
  failed twice reports three calls' worth of tokens. `generateInterpretation`
  records wall clock separately from summed call time, writes `meta.usage`, and
  logs the totals plus any section that retried.
- **INTERNAL** `packages/api-spec/openapi.yaml` + regenerated client and zod.
  `usage` is **optional** on `ReportInterpretation.meta`, so pre-R02 reports
  still validate. It lives there rather than on an admin endpoint because the
  lab's `--remote` mode reads a deployed report as an anonymous visitor and has
  no other channel; a buyer could read their own token counts. Nothing renders.
- **INTERNAL** `scripts/src/report-lab.ts`. Per-call `tries / in / cached / out
  / reason / $ / s` with a TOTAL row, then cost, wall clock against call time,
  the prose-versus-invisible split, cache hit rate and which sections retried;
  the old table unchanged when `meta.usage` is absent.

No prompt, section schema, vocabulary or brief was touched. No report content
changes, so nothing is USER-FACING.

## One deviation, deliberate

R02-04 asked the table to render from a fixture with no API call and no such
path existed, so `--render [run]` was added: lab-only, and `report()` returns
early before writing so it cannot overwrite what it read. With no argument it
picks the newest run by the report's own `generatedAt`, not file mtime, which a
git checkout rewrites for every file at once. `fixtures/reports/` held nothing,
so a fresh clone had nothing to render; `marie-curie.reference.json` is now the
committed seed and an empty folder errors with the fetch command.

## Gate

`typecheck` clean, both builds pass, tests 49/49 (41 before, 8 added), codegen
clean with the new field as its only diff. Merged as `3873bc3`; the staging
smoke confirmed `/api/healthz` reporting that commit before the lab ran, so the
measurement below is of R02 code.

## The baseline — Report lab run 6, staging, 2026-09-17, `label: r02-baseline`
| fixture | $ | s | words | output | prose | claims | foundation | retries |
|---|---|---|---|---|---|---|---|---|
| day-angular | 0.2777 | 86 | 4,036 | 13,248 | 6,674 | 4,801 | 1,684 | foundation |
| high-latitude | 0.2448 | 50 | 4,416 | 12,280 | 7,280 | 4,950 | 2,011 | none |
| marie-curie | 0.2674 | 69 | 4,017 | 13,667 | 6,639 | 5,157 | 2,020 | relationships |
| night-angular | 0.3208 | 116 | 4,226 | 17,192 | 6,817 | 5,025 | 1,924 | foundation, triad, family |
| oprah-winfrey | 0.2443 | 65 | 3,921 | 12,310 | 6,572 | 5,225 | 1,949 | none |

**A report costs 27.1 cents**, against 24.7 predicted from the dashboard. Four
findings, three of which change the spec:

1. **Reasoning tokens are zero on all 55 calls**, and that is real rather than
   an absent field: every section's `completion_tokens` sits at or below its
   visible JSON, where hidden reasoning would push it above. **This kills L2
   (`reasoning_effort`)**, the spec's biggest lever short of the model.
2. **Claims are 37% of output** (~5,032 tokens, ~$0.10 a report) against 49% for
   prose, each still carrying a verbatim copy of a sentence already emitted.
   L6 is now the largest lever that leaves the model alone.
3. **The foundation is 14% of output** (~1,918 tokens), none of it read.
4. **Retries ran 9% of calls** (5 of 55), each paying for a whole section again.
   `night-angular` retried three times: 116s and $0.32, worst on both axes.

Wall clock ran 50s to 116s against 214s of call time on `marie-curie`: the
fan-out works and the tail is retries. Cache hit 68%. Word totals were 3,921 to
4,416, mean 4,123, so **four of five now sit inside the 4,000-4,500 target**
where the 2026-09-16 run averaged 3,973 and none did: same prompts, so
run-to-run variance is wider than the gap MB-38 is about.

## Mailbox

MB-10 closed: 27.1 cents a report, measured. MB-38 gains the spread above.
