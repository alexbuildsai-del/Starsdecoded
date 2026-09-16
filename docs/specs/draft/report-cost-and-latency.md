# Draft spec — report cost and latency

Raised by the Owner, 2026-09-16, from the OpenAI dashboard: `$2.92` on the
staging key for one day of testing, and a report that takes about a minute.
Two questions: spend less per report without losing quality, and stop making
the reader wait. Investigation only so far. Nothing built, nothing pre-generated.

## What the money is actually doing

The Owner's dashboard splits that day three ways:

| | spend | share |
|---|---|---|
| `gpt-5.2` output | $2.145 | 73% |
| `gpt-5.2` input | $0.617 | 21% |
| `gpt-5.2` cached input | $0.156 | 5% |

Measured from the code, one report is 11 calls (foundation, then ten sections
in parallel) carrying about **105,000 input tokens**, of which **70% is the
byte-identical system prefix**. The observed cached share matches that 70%
almost exactly, so **prompt caching is already working**. Input is not the
problem and the system prompt is not the problem.

Output is. The reader's prose is 3,550 to 4,000 words, roughly **5,400 output
tokens**. Everything else billed as output is invisible to them:

1. **Claims.** Each section returns 3 to 8 claims; every claim carries a
   *verbatim quote of prose the model already emitted*, plus evidence JSON.
   At the schema's max that is ~6,000 tokens a report, more than the prose.
2. **The foundation call.** Capped at 4,000 tokens, internal handoff only.
   The reader never sees a word of it.
3. **Reasoning tokens.** `reasoning_effort` is **not set at any call site**
   (`api/src/lib/aiInterpretation.ts:130`), so all 11 calls run on the model
   default. Billed as output, and paid again in wall clock.
4. **Retries.** `ATTEMPTS = 3`; a retry re-sends ~9,700 input tokens and
   regenerates the whole section. Rate unknown.

We cannot yet say what one report costs, because **nothing logs
`response.usage`** — it is read only to explain a truncation. That is MB-10,
already open. Every number above is derived from the code and the dashboard
split, not measured.

## What the minute is actually doing

`generateInterpretation` is one serial hop then a parallel fan-out, so wall
clock is `foundation + slowest section`. The foundation is ~40% of it and
produces nothing the reader sees.

Then `generateReport` writes `reports.interpretation` **once, at the end**.
Until that write, the page has nothing, so `GenerationPage` runs a progress
bar with a `MIN_VELOCITY` fudge so it "NEVER freezes". The reader waits the
full minute for content that was ready in pieces long before.

`ReportPage` renders Overview first (`web/src/pages/ReportPage.tsx:433`), then
the wheel — which is composed deterministically in `brief.ts` with **no AI
call at all**. Overview plus the wheel is already a complete first screen.

## The one that is not a cost decision

`MASTERFILE.md` §1 and `CLAUDE.md` both sell "a 2,000 to 2,800 word report".
The section registry's word targets sum to **3,550–4,000**, and the report lab
asserts `REPORT_TOTAL = [3500, 4000]`. The engine is **25 to 43% longer than
the product's own definition.** Bringing it back to spec removes about 30% of
output tokens and the same share of the longest section's wall clock, and it
is not a cost cut — it is the engine matching the constitution. Decide it with
MB-38 (per-section bands), which is the same argument from the other end.

## Scope

Investigation and a ranked set of levers. The build is a later round.

- **L0 · Measure first.** Log `usage` per call: prompt, cached, completion and
  reasoning tokens, attempt number, elapsed ms. Add cost and time columns to
  the report lab. Closes MB-10. Zero quality risk. Nothing below ships first.
- **L1 · `reasoning_effort`.** Set it explicitly: keep the default (or raise
  it) on the foundation, where the chart reasoning happens; try `low` on the
  ten sections, which are writing tasks against an analysis already done.
  Biggest single lever on both cost and latency. Gate on a lab A/B.
- **L2 · Report length back to the declared 2,000–2,800.** Above. USER-FACING.
- **L3 · Get the foundation off the critical path.** (a) Cache it on the
  profile, extending R-4.5's "a second report for the same profile skips
  computation" — helps regenerates and second reports. (b) Run Overview from
  the brief in parallel with the foundation. Riskier; lab A/B only.
- **L4 · Persist and reveal sections as they land.** Saves nothing, fixes the
  minute: perceived wait drops to foundation + Overview. Needs a schema change
  and a real progress signal instead of the fudged bar.
- **L5 · Stop paying for the claim quote twice.** An anchor or offset would
  cite the same sentence for a fraction of the tokens, but the verbatim quote
  is what makes `validateClaims` strong. Lower confidence — size it with L0
  before touching it. Dropping `ClaimsSchema` max from 8 to 5 is the cheap half.
- **L6 · Retry rate.** Invisible today. If L0 shows it is high, the fix is
  prompt and schema work, not a smaller retry budget.
- **L7 · `prompt_cache_key`.** A stable key improves cache routing under
  concurrency. Small, free, no quality risk.

## Out of scope

- **Trimming the system prompt.** 86% of it is the vocabulary block, it is the
  cached prefix, and caching already discounts it to 5% of spend. Trimming
  saves pennies and risks the thing making input cheap. The static-first order
  in `assembleUser` is already correct and should not be touched.
- **Changing the model.** R-5.6 and R-4.4 make it an engine change with its
  own lab run. Separate topic.
- Building anything. The Owner has not greenlit it.

## Pre-generating sections: the direct answer

The Owner asked whether pre-generating sections would lower cost long run.
Three parts, and the first two are already true:

1. **The primitives layer is already pre-generated.** `vocabulary.ts` is about
   60 AI calls run once by `scripts/src/generate-vocabulary.ts` and committed.
   It costs nothing at request time.
2. **The wheel layer is already free.** `personalPlanets`, `aspectMeanings`
   and `angleMeanings` are composed deterministically in `brief.ts`, no AI.
3. **The synthesis layer cannot be pre-generated.** A section depends on the
   joint state of sect, chart ruler, dignities, house rulers, Lots and the
   twelve tightest aspects. There is no cache key: two buyers effectively
   never collide. Pre-generating per-placement paragraphs and stitching them
   is exactly the **meaning library PR #6 deleted**, and it breaks the locked
   "real chart data only" decision plus style rules 2 and 9. It would lower
   cost and make the product worse in the precise way the thesis forbids.

So pre-generation is not the lever for cost or for latency. **L4 is what makes
the wait feel short; L1 and L2 are what make it actually short.** The only
legitimate "generate once, reuse" left is the per-profile foundation (L3a).

## Acceptance criteria (for the round that builds this)

1. Every call logs usage; the lab prints tokens, cost and seconds per section.
2. A lab run on all five fixtures, before and after, pasted in the round report.
3. Quality holds: word targets, claim validity, method-talk and banned-char
   flags no worse than the baseline on every fixture.
4. Median wall clock to the reader's **first section**, stated in seconds.
5. Anything touching report content tagged USER-FACING (R-5.5).

## Open questions

Three, below, highest stakes first. Each has a default if the Owner is silent.

## Decisions to record

- Whether "inference cost is not a constraint" (§1, locked) still holds, or is
  superseded. Nothing in L0–L7 tightens a ceiling to save money, but the
  session exists because the Owner asked about spend, and the row should say so.
- Report length: 2,000–2,800 as written, or the constitution updated to the
  3,550–4,000 the engine ships. One of the two documents is wrong.
- Reasoning effort becomes an explicit, versioned part of the engine, named in
  `meta` alongside model and prompt version, so a lab run can attribute to it.
