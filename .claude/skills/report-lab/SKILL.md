---
name: report-lab
description: Run the Stars Decoded report lab against staging and compare it to a stored baseline, per section, on cost, latency and the style contract. Use when the Owner types /report-lab, asks to measure or re-measure report cost or quality, to A/B a model, or to check for model drift. Also run it after any change to the brain. Not for unit tests, CI or the QA personas.
---

Generating reports costs real money: about **$0.27 each**, so five fixtures is
**$1.35**. Never run this to look at a report. `pnpm report:lab --render`
re-reads the newest stored run for free, and `--compare` re-measures stored
runs for free. This skill is only for producing a new measurement.

## When it runs

Only on the Owner's word, or when **the brain** changed and a pull request is
about to merge. The brain is anything that decides what the report says:

- `api/src/prompts/` — section instructions, schemas, vocabulary, the brief
- `api/src/lib/models.ts` — which model any job calls
- `api/src/lib/aiInterpretation.ts` — the pipeline, retries, token caps
- `api/src/lib/traditional.ts`, `chartCalculation.ts` — what the brief says

Not for UI, CSS, copy, docs, the PDF, or anything in `web/`. Those never change
a word of a report, and `--render` already shows a real one.

## Arguments

`/report-lab` alone: run all five fixtures at `label: <today>`, then compare
against the newest earlier label. This is the drift check.

`/report-lab <label>`: run and store under that label.

`/report-lab compare <a> <b>`: no generation, no spend. Diff two stored runs.

## Running one

1. Confirm staging serves the commit under test: the Smoke workflow must be
   green on it. The lab measures whatever staging is deployed, not the working
   tree, so a run before the deploy lands measures the old brain.
2. Dispatch the **Report lab** workflow on `main` with `chart: all` and the
   label. It needs no credential; it drives staging's public API as an
   anonymous visitor, so the OpenAI key never leaves Railway.
3. When it finishes, fetch the runs it published and compare:
   `git fetch origin report-lab/<label>` then
   `git checkout origin/report-lab/<label> -- fixtures/reports/` then
   `pnpm report:lab --compare <baseline> <label>`.

## Reading the result

`--compare` reports each section's model, words, cost, seconds and a verdict.
Cost and quality are deliberately separate: **a section that got cheaper and
broke the style contract is not an improvement.** A `WORSE` verdict names the
fault, which is always one of method-talk, a banned character, an invalid
claim, an unstructured reply, or falling out of the word band.

Relay to the Owner: the cost delta, every `WORSE` section with its fault, and
whether any model changed. Put the tables in the round report when a round is
running. Nothing here is a decision; the Owner judges quality.

## A/B-ing a model per section

`api/src/lib/models.ts` decides which model each job calls. `MODELS.sections`
moves all ten; `SECTION_MODELS` moves one. Edit, ship, let staging deploy, run
this skill under a new label, compare against the baseline. Because the runs
are stored and labelled, a section can be moved to a cheaper model one at a
time and the exact section where quality breaks is visible.

Two runs are sequential, not simultaneous: the lab measures staging, and
staging serves one configuration at a time. For drift that is the point, since
drift is a comparison across time. For a same-moment comparison both models
would have to be called from one process, which needs the OpenAI key, which
lives only on Railway.
