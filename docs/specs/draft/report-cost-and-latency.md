# Draft spec — report cost and latency

Raised by the Owner, 2026-09-16, from the OpenAI dashboard: `$2.92` on the
staging key for one day, and a report that takes about a minute. Cost policy
holds; the report is 4,000 to 4,500 words, which takes length off this spec.
L0 shipped in R02, and its baseline is the measurement below.

## One report costs 27.1 cents, measured

R02's baseline (Report lab run 6, staging, 2026-09-17, five fixtures, $1.35)
replaces every estimate below. `gpt-5.2`: $1.75/M in, $0.175/M cached, $14/M out.

| | mean per report | share of spend |
|---|---|---|
| output | 13,739 tokens | 74% |
| input (uncached) | ~29,900 tokens | 21% |
| input (cached) | ~76,800 tokens | 5% |
| **cost** | **$0.2710** | range $0.2443 - $0.3208 |

The dashboard arithmetic predicted $0.247; the measurement is $0.271. Caching
works at a 68% hit rate, so input is a fifth of the bill and the system prompt
is not the lever. Output is, and **half of it is invisible**:

| | tokens | share of output |
|---|---|---|
| prose the reader gets | ~6,796 | 49% |
| claims | ~5,032 | 37% |
| foundation (internal) | ~1,918 | 14% |
| **reasoning** | **0** | **0%** |

**Reasoning tokens are zero on all 55 calls**, and that is real rather than an
absent field: every section's `completion_tokens` sits at or below its visible
JSON, where hidden reasoning would push it above. So the model does no hidden
work here, and `reasoning_effort` has nothing to reclaim.

**Retries ran 9% of calls** (5 of 55), each paying for a whole section again;
`night-angular` retried three times and cost $0.3208 in 116s, worst on both.

## Why the minute

`generateInterpretation` is one serial hop then a parallel fan-out, so wall
clock is `foundation + slowest section`. The foundation is ~40% of it and
produces nothing the reader sees.

Then `generateReport` writes `reports.interpretation` **once, at the end**, so
until that write the page has nothing and `GenerationPage` runs a progress bar
with a `MIN_VELOCITY` fudge so it "NEVER freezes". The reader waits the full
minute for content that was ready in pieces long before.

`ReportPage` renders Overview first (`web/src/pages/ReportPage.tsx:433`), then
the wheel — composed deterministically in `brief.ts` with **no AI call at all**.
Overview plus the wheel is already a complete first screen.

## Report length is not a lever

**4,000 to 4,500 words is the product** (Owner, 2026-09-17), so the ~30% of
output a shorter report would have saved is off the table. Measured on the
2026-09-16 run: **3,844 / 3,922 / 4,000 / 4,010 / 4,087**, mean 3,973. The lab
now targets 4,000-4,500; the registry bands and the prompt text still say
3,550-4,000, so the engine writes a little under. Closing that is USER-FACING
and belongs to MB-38, not here.

## Scope

Re-ranked on the R02 measurement. L0 is done; nothing below it is greenlit.
- **L0 · Measure first.** **Done (R02).** Every call logs its tokens, cost and
  time to `meta.usage`; the lab prints them per section. MB-10 closed.
- **L1 · Stop regenerating reports to test the UI.** Mostly shipped in R02:
  `--render` re-reads the newest run free and a reference report is committed.
  What remains is loading one into the app (MB-39). Detail below.
- **L2 · Claims cost 37% of output, ~$0.10 a report.** Now the largest lever
  that leaves the model alone. Each claim carries a verbatim copy of a sentence
  the model already emitted; an anchor or offset would cite the same sentence
  for a fraction of the tokens, though the verbatim quote is what makes
  `validateClaims` strong. Dropping `ClaimsSchema` max from 8 to 5 is the cheap
  half and needs no schema rework. USER-FACING only if the citations change.
- **L3 · A cheaper model for the ten section calls.** Own section below. Still
  the largest single lever by a wide margin.
- **L4 · The foundation is 14% of output and ~30% of wall clock**, and no
  reader sees a word of it. (a) Cache it on the profile, extending R-4.5's "a
  second report for the same profile skips computation". (b) Run Overview from
  the brief alongside it. Riskier; lab A/B.
- **L5 · Persist and reveal sections as they land.** Saves nothing, fixes the
  minute: perceived wait drops to foundation + Overview. Needs a schema change
  and a real progress signal instead of the fudged bar.
- **L6 · Retry rate is 9% of calls**, each paying for a whole section again and
  driving the latency tail (`night-angular`: three retries, 116s, $0.32). The
  fix is prompt and schema work on whatever the rejections say, never a smaller
  retry budget. R02's logs now name the failing section on every report.
- **L7 · `prompt_cache_key`.** A stable key improves cache routing under
  concurrency; the hit rate is 68% today. Free, no quality risk.

**Dropped: `reasoning_effort`.** It was ranked the biggest lever short of
changing model. The baseline measured zero reasoning tokens on all 55 calls,
so there is nothing there to reclaim.

## L1 in detail: when a report actually needs regenerating

13 reports in a session is ~$3.25. Most were probably not needed.

**Regenerate only when the words would change**: prompts, section schemas,
`vocabulary.ts`, `brief.ts`, the model, or `reasoning_effort`. That is R-4.4's
gate, run before a pull request merges, not each iteration. **Never regenerate
for** UI, CSS, layout, the wheel, the PDF, copy, the methodology box, or
anything in `web/` that renders an interpretation it did not produce. Three
changes make that practical:

1. Commit one reference report (**done, R02**), so a real interpretation ships
   in the repo and `--render` works on a fresh clone.
2. A dev-and-staging-only seed inserting it as a real report row, so the Owner
   opens it in the product at a stable URL. Overlaps MB-39 (admin report
   browser); the two should be one card.
3. Default the Report lab workflow's `chart` input to one fixture, not `all`.
   Five fixtures is ~$1.25 a dispatch and belongs to the gate, not iteration.

## L3 in detail: does it have to be gpt-5.2

`gpt-5-mini` is $0.25/M input and **$2.00/M output — 7x cheaper**. On the
measured baseline the ten section calls carry ~86% of output. Moving only those
and keeping `gpt-5.2` for the foundation puts a report at roughly **$0.07,
a ~74% cut** — larger than every other lever combined.

It is also the highest quality risk, because the prose *is* the product. But it
is measurable, not a matter of taste: the lab already scores the exact failure
modes a smaller model would hit — `METHOD_TALK`, `BANNED_CHARS`, word targets,
code-verified claim validity. One dispatch settles it for about $0.25.

Worth knowing first: the sections are heavily scaffolded — doctrine, vocabulary,
the brief, the foundation handoff, a strict schema, claims checked in code — and
that scaffolding is what a smaller model needs. The foundation is the opposite,
open-ended chart reasoning, and the place to keep the strong model. R-5.6 and
R-4.4 make it an engine change with its own lab run: do it after L0.

## Out of scope

- **Trimming the system prompt.** 86% of it is the vocabulary block, it is the
  cached prefix, and caching discounts it to 5% of spend. Trimming saves pennies
  and risks what makes input cheap. The static-first order in `assembleUser` is
  already correct.
- **Tightening a token ceiling to save money.** MASTERFILE §1 holds.
- Building any lever past L0 until the Owner picks one.

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
the wait feel short; L3 and L4 are what make it actually short.** The only
legitimate "generate once, reuse" left is the per-profile foundation (L4a) —
and the reference report of L1, which is pre-generation for *testing*, not for
customers.

## Acceptance criteria for any lever below

1. A Report lab run on all five fixtures, diffed against the R02 baseline
   (`report-lab/r02-baseline`, 2026-09-17): cost, seconds and tokens per
   section, pasted in the round report.
2. Quality no worse on any fixture: word targets, claim validity, method-talk
   and banned-character flags.
3. Report content changes are USER-FACING (R-5.5) even when no UI moves.

## Open questions

1. **Model (L3).** Test `gpt-5-mini` on the ten sections? *Recommendation:*
   yes — one dispatch against all five is $1.35 and the lab already scores the
   failure modes, with an R02 baseline to diff against. *Default if silent:*
   stays on `gpt-5.2`, revisit at pricing.
2. **Latency target.** Is "first section in ~25s, full report by ~60s" (L5) the
   goal, or must the whole report be faster? *Recommendation:* first section in
   ~25s, the cheaper and larger win. *Default if silent:* L5 as written.

## Decisions to record

- **Inference cost stays unconstrained** (MASTERFILE §1 holds, tested
  2026-09-16). Levers remove waste and measure it; no ceiling is tightened.
- **The report is 4,000 to 4,500 words** (Owner, 2026-09-17). Remove the
  "2,000 to 2,800 word" clause from `MASTERFILE.md` §1 and `CLAUDE.md`; the
  registry's `wordTarget` values and the lab's `REPORT_TOTAL` are the single
  source of truth. No user-facing copy states a word count, so nothing a buyer
  sees changes. *Pending `/lock` — MASTERFILE is not edited without a Decisions
  row.* Decide alongside MB-38.
- **Reasoning effort becomes explicit and versioned**, named in `meta` beside
  model and prompt version, so a lab run can attribute to it.
- **Regeneration discipline** (L1): the lab gate runs before a pull request
  merges; UI work runs against the committed reference report.
- **Reasoning effort is not a lever here**: measured zero on all 55 calls of
  the R02 baseline. Recheck only if the model changes.
