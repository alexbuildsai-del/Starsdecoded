---
name: report-lab
description: Run the Stars Decoded report lab at one of its levels (dry, spot, release, reading, prose study) from the admin Lab page on staging, or the free dry render from a session, and read the result. Use when the Owner types /report-lab, asks to measure or re-measure report cost or quality, to A/B a writer, to check for drift, or after any change to the brain. Not for unit tests, CI or the QA personas.
---

Generating spends real money: about **30 ¢ a natal report**, so the five matrix
charts are about **$1.40**. Never generate a report to look at one.
`pnpm report:lab --render` re-reads the newest stored run for free, `--compare`
re-measures stored runs for free, and the Lab page shows every run's numbers.
Spend is capped at `LAB_BUDGET_USD` ($15 a month, ADR-77): the spot, the
sessions, the release lab and the study notes refuse beyond it, and every
campaign stops at the first out-of-credit 429.

**No secret on GitHub, ever (ADR-86).** The key lives on Railway; every level
that spends runs from the admin panel on staging behind the Clerk admin gate.
GitHub workflows build, test and smoke; `report-lab.yml` keeps only the
anonymous natal, pass and pair campaigns, which use no secret.

## The levels (ADR-76, ADR-86)

| level | when | where | spend |
|---|---|---|---|
| 0 dry | every round with a brain change | `pnpm report:lab --dry --base r06 [--pair curie-winfrey --lens parent_child]` in process, no network; or the **Dry** button on *Spot and dry* | free |
| 1 spot | on demand after a prompt change | *Spot and dry*: pick sections, charts and a writer, read the estimate, **Run the spot** | 2–10 ¢ |
| 2 release | before production, when the brain changed since production's commit | *Release*: preflight, then **Release** runs the lab (five charts, plus one pair when the pair brain changed), the gate, the QA agent, then the fast-forward | about $1.40 plus a pair and the QA reading |
| 3 reading | the Owner spawns a session | *Spawn a session*, *Reading room*, *Reveal* | shown first |
| study | after a reveal | **Prose study** under *Reveal*: the picks measured in code; the optional notes step is priced first | free; notes under 1 ¢ |

The brain: `api/src/prompts/`, `api/src/lib/models.ts`, `aiInterpretation.ts`,
`traditional.ts`, `chartCalculation.ts`. Not UI, CSS, copy, docs or `web/`.

## The panel

`/admin/report-lab` beside Prompts, gated by `ADMIN_USER_ID`. *Runs* lists every
stored run by fixture and label with words, cost, seconds, faults and the
failure code, compares any two labels, and **Import r05 and r06** reads the
baseline from the public `report-lab/<label>` branches (MB-72). *Failures*
counts every rule that fired per section; a rule on more than 1 in 10 of a
section's last 20 writes is red and is the next round's prompt fix (ADR-85).
*Release* stops at `passed` while `GITHUB_RELEASE_TOKEN` is not on Railway
staging (MB-75); then dispatch `promote.yml` with the release id (MB-79).

## The free dry from here

`git fetch origin report-lab/r06 && git checkout FETCH_HEAD -- fixtures/reports/`
(never commit those files), then `pnpm report:lab --dry --base r06 --pair
curie-winfrey --lens parent_child`. Every natal and pair prompt renders with
tokens against the base and a strict-schema check; the parent-child line
prints the child's age and the now-and-later rule.

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
(`MODELS.sections` or `SECTION_MODELS`), a release through the Release view:
USER-FACING (R-5.5). A writer the Owner picks over 5.2 moves even when it costs more.
