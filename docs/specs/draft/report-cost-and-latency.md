# Draft spec — report cost and latency

Raised by the Owner, 2026-09-16, from the OpenAI dashboard: `$2.92` on the
staging key for one day, and a report that takes about a minute. Investigation
only. Owner answers the same day: cost policy holds, report length leaves the
two prose docs, build L0 alone first.

## One report costs 24.7 cents

`gpt-5.2` is $1.75/M input, $0.175/M cached input, $14.00/M output. Dividing
the dashboard's three figures by those rates gives the tokens behind them:

| | spend | tokens | per report |
|---|---|---|---|
| output | $2.145 | 153,000 | ~12,970 |
| input (uncached) | $0.617 | 353,000 | ~29,900 |
| input (cached) | $0.156 | 891,000 | ~75,500 |
| **total** | **$2.92** | 1,244,000 | **~$0.247** |

One report is 11 calls carrying ~105,300 input tokens (measured from the code),
so `$2.92` is **11.8 reports**. The Owner counted 13 created that day. The two
agree, and **$0.25 a report** is now a measured number, not an estimate.

Two things follow immediately.

**Prompt caching already works.** 70% of input is the byte-identical system
prefix; the observed hit rate is 71.6%. Input is 22% of the bill, so the system
prompt is not the lever. Trimming it is in *Out of scope* below.

**Output is 74% of the bill, and most of it is invisible.** The reader's prose
is 3,550-4,000 words, about **5,400 tokens**. The other **~7,570 tokens per
report — 58% of output, 43% of the total bill — no reader ever sees**:

1. **Claims.** Each section returns 3 to 8, and every claim carries *a verbatim
   quote of prose the model already emitted* plus evidence JSON. At the
   schema's max that is ~6,000 tokens a report, more than the prose itself.
2. **The foundation call.** Capped at 4,000 tokens, internal handoff only.
3. **Reasoning tokens.** `reasoning_effort` is **not set at any call site**
   (`api/src/lib/aiInterpretation.ts:130`), so all 11 calls run on the model
   default. Billed as output, and paid again in wall clock.
4. **Retries.** `ATTEMPTS = 3`; a retry re-sends ~9,700 input tokens and
   regenerates the whole section. Rate unknown.

Nothing logs `response.usage` — it is read only to explain a truncation — so
the split between those four is estimated. That is MB-10, and it is L0.

## Why the minute

`generateInterpretation` is one serial hop then a parallel fan-out, so wall
clock is `foundation + slowest section`. The foundation is ~40% of it and
produces nothing the reader sees.

Then `generateReport` writes `reports.interpretation` **once, at the end**, so
until that write the page has nothing and `GenerationPage` runs a progress bar
with a `MIN_VELOCITY` fudge so it "NEVER freezes". The reader waits the full
minute for content that was ready in pieces long before.

`ReportPage` renders Overview first (`web/src/pages/ReportPage.tsx:433`), then
the wheel — composed deterministically in `brief.ts` with **no AI call at
all**. Overview plus the wheel is already a complete first screen.

## Scope

Ranked levers. Only L0 is greenlit; the rest need a separate decision.
- **L0 · Measure first.** Log `usage` per call: prompt, cached, completion and
  reasoning tokens, attempt number, elapsed ms. Add cost and seconds per
  section to the report lab. Closes MB-10. Zero quality risk, nothing
  USER-FACING. **This is the greenlit round.**
- **L1 · Stop regenerating reports to test the UI.** The Owner's own point and
  the cheapest win here. The lab already writes the whole report to
  `fixtures/reports/<name>.<label>.json` and `--compare` re-measures from disk
  with no AI call; what is missing is a committed reference report and a way to
  load one into the app. Detail below.
- **L2 · `reasoning_effort`.** Set it explicitly: keep the default (or raise it)
  on the foundation, where the chart reasoning happens; try `low` on the ten
  sections, which are writing tasks against an analysis already done. Biggest
  lever that does not touch the model. Gate on a lab A/B.
- **L3 · A cheaper model for the ten section calls.** Own section below.
- **L4 · Get the foundation off the critical path.** (a) Cache it on the
  profile, extending R-4.5's "a second report for the same profile skips
  computation". (b) Run Overview from the brief in parallel with the
  foundation. Riskier; lab A/B only.
- **L5 · Persist and reveal sections as they land.** Saves nothing, fixes the
  minute: perceived wait drops to foundation + Overview. Needs a schema change
  and a real progress signal instead of the fudged bar.
- **L6 · Stop paying for the claim quote twice.** An anchor or offset would
  cite the same sentence for a fraction of the tokens, but the verbatim quote
  is what makes `validateClaims` strong. Size it with L0 first. Dropping
  `ClaimsSchema` max from 8 to 5 is the cheap half.
- **L7 · Retry rate.** Invisible today. If L0 shows it is high, the fix is
  prompt and schema work, not a smaller retry budget.
- **L8 · `prompt_cache_key`.** A stable key improves cache routing under
  concurrency. Free, no quality risk.

## L1 in detail: when a report actually needs regenerating

13 reports in a session is ~$3.25. Most were probably not needed.

**Regenerate only when the words would change**: prompts, section schemas,
`vocabulary.ts`, `brief.ts`, the model, or `reasoning_effort`. That is R-4.4's
gate, and it is a gate before a pull request merges, not a thing to run each
iteration.

**Never regenerate for**: UI, CSS, layout, the wheel, the PDF, copy, the
methodology box, navigation, or anything in `web/` that renders an
interpretation it did not produce. Three changes make that practical:

1. Commit one reference report (`fixtures/reports/marie-curie.reference.json`),
   already the exact shape the lab writes, so a real interpretation is in the repo.
2. A dev-and-staging-only seed inserting it as a real report row, so the Owner
   opens it in the product at a stable URL. Overlaps MB-39 (admin report
   browser); the two should be one card.
3. Default the Report lab workflow's `chart` input to one fixture, not `all`.
   Five fixtures is ~$1.25 a dispatch and belongs to the gate, not iteration.

## L3 in detail: does it have to be gpt-5.2

`gpt-5-mini` is $0.25/M input and **$2.00/M output — 7x cheaper**. The ten
section calls are ~90% of the volume. Moving only those, keeping `gpt-5.2` for
the foundation, models out at roughly **$0.065 a report, a ~74% cut** —
far larger than every other lever combined.

It is also the highest quality risk, because the prose *is* the product. But it
is a measurable question, not a taste one: the lab already scores the exact
failure modes a smaller model would hit — `METHOD_TALK`, `BANNED_CHARS`,
per-section word targets, and code-verified claim validity. One dispatch
settles it for about $0.25.

Worth knowing first: the sections are heavily scaffolded — doctrine, vocabulary,
the brief, the foundation handoff, a strict schema, claims checked in code — and
that scaffolding is what a smaller model needs. The foundation is the opposite,
open-ended chart reasoning, and the place to keep the strong model.

R-5.6 and R-4.4 make this an engine change with its own lab run. Do it after L0,
so the before-and-after is measured rather than argued.

## Out of scope

- **Trimming the system prompt.** 86% of it is the vocabulary block, it is the
  cached prefix, and caching discounts it to 5% of spend. Trimming saves pennies
  and risks the thing making input cheap. The static-first order in
  `assembleUser` is already correct and should not be touched.
- **Tightening a token ceiling to save money.** MASTERFILE §1 holds.
- Building anything past L0.

## Pre-generating sections: the direct answer

Three parts, and the first two are already true:

1. **The primitives layer is already pre-generated.** `vocabulary.ts` is ~60 AI
   calls run once by `scripts/src/generate-vocabulary.ts` and committed, so it
   costs nothing at request time.
2. **The wheel layer is already free.** `personalPlanets`, `aspectMeanings` and
   `angleMeanings` are composed deterministically in `brief.ts`, no AI.
3. **The synthesis layer cannot be pre-generated.** A section depends on the
   joint state of sect, chart ruler, dignities, house rulers, Lots and the
   twelve tightest aspects. There is no cache key: two buyers effectively never
   collide. Pre-generating per-placement paragraphs and stitching them is the
   **meaning library PR #6 deleted**, and it breaks the locked "real chart data
   only" decision plus style rules 2 and 9. It would lower cost and make the
   product worse in the way the thesis forbids.

So pre-generation is not the lever for cost or for latency. **L5 is what makes
the wait feel short; L2 and L3 are what make it actually short.** The only
legitimate "generate once, reuse" left is the per-profile foundation (L4a) —
and the reference report of L1, which is pre-generation for *testing*, not for
customers.

## Acceptance criteria (L0)

1. Every call logs prompt, cached, completion and reasoning tokens, attempt
   number and elapsed ms, keyed by section.
2. The lab prints tokens, dollars and seconds per section, and a report total.
3. A lab run on all five fixtures with the new columns, pasted in the round
   report: the baseline every later lever is judged against. MB-10 closed.
4. INTERNAL: no prompt, schema or report content changes in this round.

## Open questions

1. **Model (L3).** Test `gpt-5-mini` on the ten sections after L0?
   *Recommendation:* yes — one dispatch, ~$0.25, and the lab already scores the
   failure modes. *Default if silent:* stays on `gpt-5.2`, revisit at pricing.
2. **Latency target.** Is "first section in ~25s, full report by ~60s" (L5) the
   goal, or must the whole report be faster? *Recommendation:* first section in
   ~25s, the cheaper and larger win. *Default if silent:* L5 as written.

## Decisions to record

- **Inference cost stays unconstrained** (MASTERFILE §1 holds, tested
  2026-09-16). Levers remove waste and measure it; no ceiling is tightened.
- **Report length leaves the prose documents.** Remove the "2,000 to 2,800
  word" clause from `MASTERFILE.md` §1 and `CLAUDE.md`; the section registry's
  `wordTarget` values and the lab's `REPORT_TOTAL` are the single source of
  truth, free to evolve until locked. No user-facing copy states a word count,
  so nothing a buyer sees changes. *Pending `/lock` — MASTERFILE is not edited
  without a Decisions row.* Decide alongside MB-38.
- **Reasoning effort becomes explicit and versioned**, named in `meta` beside
  model and prompt version, so a lab run can attribute to it.
- **Regeneration discipline** (L1): the lab gate runs before a pull request
  merges; UI work runs against a committed reference report.
