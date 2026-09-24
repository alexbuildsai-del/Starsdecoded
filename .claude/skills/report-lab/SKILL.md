---
name: report-lab
description: Run the Stars Decoded report lab at one of its four levels (dry, spot, release, reading) against staging, and read the result in the admin Lab page or from a stored run. Use when the Owner types /report-lab, asks to measure or re-measure report cost or quality, to A/B a writer, to check for drift, or after any change to the brain. Not for unit tests, CI or the QA personas.
---

Generating spends real money: about **30 ¢ a natal report**, so the five matrix
charts are about **$1.40**. Never generate a report to look at one.
`pnpm report:lab --render` re-reads the newest stored run for free, `--compare`
re-measures stored runs for free, and the Lab page shows every run's numbers.
Spend is capped at `LAB_BUDGET_USD` ($15 a month, ADR-77): the replay route,
the sessions and the release lab refuse beyond it, and every campaign stops at
the first out-of-credit 429.

## The four levels (ADR-76)

| level | when | what | spend |
|---|---|---|---|
| 0 dry | every round with a brain change | `--dry --base r06`: every prompt rendered on staging for the base's charts, tokens against the baseline, schema and served-id checks, no call | free |
| 1 spot | merge to staging when a prompt changed (`lab-spot.yml`, automatic) | `--spot <sections\|pipeline> --charts a,b --base r06`: the changed sections replayed on Flex, foundation held, compared in Runs | 2–10 ¢ |
| 2 release | Promote, only when the brain changed since production (`promote.yml`, automatic) | `--release <label>` then `--gate <label> --against last-release`: the five matrix charts through the customer path | about $1.40 |
| 3 reading | the Owner spawns a session in the Lab page | the session's cards only, priced before **Spawn** | shown first |

The brain: `api/src/prompts/`, `api/src/lib/models.ts`, `aiInterpretation.ts`,
`traditional.ts`, `chartCalculation.ts`. Not UI, CSS, copy, docs or `web/`.

## The panel

`/admin/report-lab` beside Prompts, gated by `ADMIN_USER_ID`. *Runs* lists every
stored run by fixture and label with words, cost, seconds and faults, and
compares any two labels. *Spawn a session* shows the estimate before the
button. *Reading room* is blind: A, B, C in a stored order, best, would not
ship, same as, one note. *Reveal* opens after the last card. The script and the
workflows reach the same routes with `LAB_TOKEN` (MB-69); the browser passes
the Clerk gate. `--publish <fixture>.<label>[,…]` lands a stored run file in
Runs; r05 and r06 are the baseline (MB-72).

## Running one from here

1. Staging must serve the commit under test: the Smoke workflow green on it.
2. Dispatch **Report lab** on `main` with the campaign (`dry`, `spot`,
   `release`, `stub`, `publish`, or the generating `natal`, `pass`, `pair`),
   the label, and the base. No credential leaves the dashboards.
3. Read the run summary; generating campaigns also publish
   `report-lab/<label>`: `git fetch origin report-lab/<label>` then
   `git checkout origin/report-lab/<label> -- fixtures/reports/` then
   `pnpm report:lab --compare <baseline> <label>`.

## Reading the result

Cost and quality stay apart: **a section that got cheaper and broke the style
contract is not an improvement.** `WORSE` names the fault: method-talk, a banned
character, an invalid claim, an unstructured reply, or out of the word band.
The gate refuses on a new fault, a total outside 3,500 to 5,500, or a cost more
than 10% over the last release. Relay the cost delta, every `WORSE` section, and
whether any model changed; the tables go in the round report. The Owner judges
quality, in the room, on the reading-room rule (ADR-57).

## Moving a section to another writer

Only on the reading-room rule: best or tied on every chart read blind, never
would not ship, contract gate held, five of five. Then `models.ts`
(`MODELS.sections` or `SECTION_MODELS`), a release lab, and a Promote through
the gate: USER-FACING (R-5.5). A writer the Owner picks over 5.2 moves even
when it costs more.
