# Locked spec — pair reliability and prose (R08)

Raised by the Owner 2026-09-25, after two things happened on 2026-09-24:
- **The pair campaign** (run 35993780324) failed on all 7 pairs. In each report one
  chapter failed its checks three times, and that failure took the whole report down.
- **The first reading session** (`session-2026-09-24`: 12 cards on the Owner's own
  report) was revealed.

The Owner's direction, 2026-09-25: a check blocks only when the text would be wrong
for the reader or costs money; regenerate only the failed section, always with the
feedback; every failed report says why; no automatic lab spend, spot on demand from
the admin panel, the gate before production; no secret on GitHub, ever; buffers of
about 20%; learn from the picks; "simpler sentences over complicated vocabulary,
always."

Artifact: https://claude.ai/artifact/6HLtPdSaR3wiVLXx16oWHU (version 2)
Every check, classified: `docs/annex/pair-reliability-checks.md`.

## What the failures were

Six rules failed: link card length (`links.ts:43`), the "Behaviour check:" ending
(`links.ts:44`), card lines over 12 words (`shapes.ts:179`), age-band words whose
list the prompt never prints (`doctrine.ts`), links outside the allocation and
non-verbatim quotes (`pair/evidence.ts:79, 68`). Today: 3 attempts fed back only the
last errors; the third failure rejects stage 2 (`pairInterpretation.ts:247`); running
chapters keep paying; no refund; no failed attempt recorded.

The inventory found about 80 checks, and 2 of them can never pass:
- the scene-name check for names like Zoë or José (`shapes.ts:192`);
- the why-has-a-verb check, which rejects "so you pause first" (`shapes.ts:205`).

## Scope

1. **Every check is reclassified per the annex.**
   - **BLOCK:** only the checks that protect the reader: a false placement, a
     score, jargon beside a body name, an invented person, a numeral house on a blind
     pair, and a card naming another card's body.
   - **FIX:** chart-fact mismatches, orbs, counts, spelling, quotes, allocation and
     brackets are corrected in code before or after the parse, reusing `drawnRef` and
     the `applyAmendment` drop logic.
   - **WARN:** style nits are logged only.
   - **BUFFER:** numeric limits get 20% (link cards 32–84 words, card lines 15),
     while the prompt keeps its target.
   - The two bugs above are fixed first.
2. **Claims never force a rewrite.**
   - A footnote (claim) that nearly matches its sentence snaps to it.
   - A wrong footnote or a wrong ref is dropped, and the sentence stays.
   - Only fewer than 3 valid footnotes calls the cheap claims-only repair, widened from
     quote problems to every claim and ref problem.
3. **Age bands: now and later.** The brief computes the child's age on the day of
   generation, and the prompt says:
   - describe situations of this age now;
   - later stages may be discussed, framed as later;
   - over 18, nothing from childhood is described as present, and the focus is on a
     young adult's life (moving out, work, money, partners, visits home);
   - childhood may be remembered in the past tense (Q1).

   The band word check becomes WARN, trimmed of its false hits (grounded, a phone call,
   revise the plan, make allowances, rent, tablet).
4. **Prompts state what the checks enforce.**
   - Link cards: 45 to 60 words, ending on "Behaviour check:".
   - Card lines: 12 words.
   - Allocated links only.
   - Rules 7 and 8 of `STYLE_CONTRACT` get numbers: sentences average 15 words or
     fewer, and none is over 25. `PAIR_WRITER` gets the same rule. Brain,
     USER-FACING.
5. **Retries carry everything.** Every retry gets every error so far, plus its own last
   reply, with the instruction "fix these, keep the rest".
6. **Only the failed section is regenerated.**
   - A section that exhausts its attempts no longer rejects the report. The others are
     kept, and it gets one more round alone.
   - Natal sections work the same way. The foundation is excluded, because every
     section depends on it.
   - If that round fails too, the report fails, the credit is refunded, and running
     sections are aborted (`AbortController`).
7. **Every failure says why.** A failed report stores a reason code and shows the
   customer a plain line, with the credit back each time:

   | code | what the customer reads |
   |---|---|
   | `provider_unreachable` (network, 5xx, timeout) | "Our writing service didn't answer. Try again in a few minutes." |
   | `provider_out_of_credit` | "We can't write reports right now. We've been alerted. Try again later." |
   | `quality` | "One chapter didn't meet our quality bar after several tries. Try again." |
   | `internal` | "Something went wrong on our side. We've been alerted." |

   The same code shows on the Lab page.
8. **The failure log.**
   - New table `generation_failures`: kind, section, rule id, class, message, model,
     attempt, final, created_at. One idempotent migration, in `bootstrap-db.sh`.
   - Every validator message gets a stable rule id.
   - Every BLOCK, FIX and WARN writes a row.
   - A *Failures* tab counts them per rule and section. A rule firing on more than 1 in
     10 of a section's last 20 writes turns red, and the planner raises it as a prompt
     fix. Nothing edits a prompt automatically (R-5.4).
9. **The lab lives in the admin panel. GitHub holds no secret.**
   - `lab-spot.yml` is deleted, and so are the `LAB_TOKEN` campaigns in `report-lab.yml`
     (dry, spot, release, stub, publish).
   - *Spot check* on the Lab page: pick sections, charts and a writer, see the estimate,
     then run.
   - Dry becomes a button on the same page (free).
   - The anonymous natal, pass and pair campaigns stay on demand. They use no secret.
10. **Promote starts from the admin panel on staging.** A *Release* view runs, in order:
    - the release lab, when the brain changed since production's commit (five charts,
      plus one pair when the pair brain changed), then the gate;
    - the QA agent on Railway staging, using the Anthropic key already there. It plays
      the five personas in headless Chromium, and reads one natal and one pair report
      against the style contract. A sev-1 finding stops the release.

    When both pass, the server fast-forwards `production` through the GitHub API, with
    a GitHub token held on Railway. The `promote.yml` gate jobs go, and GitHub keeps
    smoke only.
11. **The prose study.**
    - A *Prose study* button in Reveal measures every variant in code, with no model
      call. The metrics module is `api/src/lib/proseMetrics.ts`, built and tested on
      2026-09-25: sentence length (mean, p90, longest), long-word share, word length,
      Flesch reading ease, second-person share.
    - It compares the picked variants with the ones passed over, per card and overall,
      plus per writer. The admin's own-report columns are included, since this runs as
      the admin.
    - An optional step, under 1¢ on gpt-6-luna, adds three lines per card on what the
      picked text does better.
    - A measure that agrees on at least 8 of 12 cards becomes a proposed rule, with its
      numbers. The Owner approves it, and the next round writes it into
      `STYLE_CONTRACT` at its source, with a `labRules.ts` measure.
    - Text never leaves the staging database.
12. **Docs.** "No secret on GitHub; the lab and releases run from the admin panel"
    goes into CLAUDE.md (written 2026-09-25), MASTERFILE R-4.4 and §11.2 to §11.4, the
    report-lab, round and qa skills, the orchestrator and qa agents, the runbook.

## Out of scope

- Moving a section to a new writer (five of five charts, ADR-57; session 2026-09-24
  was one chart at 50% control agreement); automatic prompt edits; natal prompt
  content beyond scope 4; a scheduled drift check; QA on every merge.

## Acceptance criteria

1. One unit test per reclassified annex row, among them: a 78-word link card and a
   15-word card line pass; "Behavior check:" and a two-sentence ending pass; Zoë and
   José match; "so you pause first" passes; a near-verbatim quote snaps and a wrong
   ref drops; a grown-band "curfew" is logged, not rejected.
2. The rendered parent-child brief carries the child's age and the now-and-later rule
   (dry lab).
3. A pair section stubbed to fail three times, then pass: the report completes, the
   other sections are called once, and `generation_failures` holds the rows.
4. Stubbed to fail every time: the report is `failed` with code `quality`, the credit
   is refunded, and sections still running are aborted. A stubbed network error gives
   `provider_unreachable`, and the customer sees its line.
5. A retry prompt holds every earlier error and the previous reply.
6. The Failures tab shows counts and a red flag from seeded rows. It carries no report
   text.
7. No workflow references `LAB_TOKEN`, and `lab-spot.yml` is gone. A push with a brain
   change spends nothing.
8. Release view rehearsal with a stub lab and a stub QA verdict: a seeded fault or a
   sev-1 stops it; a clean run calls the fast-forward (mocked in tests).
9. The prose study on `session-2026-09-24` fills its tables with no model call, all 12
   cards included.
10. Gate: typecheck, both builds, unit tests, `db:bootstrap` twice on a fresh
    database, the dry lab on five charts plus one pair. Scopes 1 to 7 USER-FACING,
    the rest INTERNAL.

## Screens

Artifact above: failures and check classes, retry flow, failure reasons, the Failures
tab, lab levels, the Release view, the 2026-09-24 picks, the Prose study.

## Resolved at lock

Locked 2026-09-25 on the defaults: an adult child's report may remember childhood in the
past tense; `GITHUB_RELEASE_TOKEN` lives in Railway staging Variables (MB-75), and until
it exists the Release view stops before the fast-forward and says so.

## Decisions to record

- A check blocks only when the text would be wrong or harmful to the reader, or would
  cost money. Everything else is fixed in code, logged, or buffered by 20% around the
  target the prompt states. The classification lives in
  `docs/annex/pair-reliability-checks.md`.
- A claim problem never rewrites prose. Claims snap or drop, and only fewer than 3
  valid claims calls the claims-only repair.
- Age bands are framed now and later. The report is written for the child's age on the
  day of generation, may look ahead, and over 18 treats childhood as past. Band words
  are logged, not blocking.
- A section that exhausts its attempts gets one more round alone. A final failure
  refunds the credit, aborts running sections, and tells the customer why through a
  reason code.
- Every rejected or corrected attempt is logged by rule id. A rule firing on more than
  1 in 10 of a section's last 20 writes is a prompt fix for the next round, never an
  automatic edit.
- No secret on GitHub, ever. Keys live on Railway. The lab (dry, spot, reading, study)
  and the release (lab, gate, QA agent, fast-forward) run from the admin panel. GitHub
  builds, tests and smokes. This supersedes the `LAB_TOKEN` door and amends ADR-76 and
  R-4.4: nothing spends automatically on staging.
- Simpler sentences over complicated vocabulary, always: 15 words on average, 25 at
  most, then set by the prose study.
- The prose study turns reveal picks into proposed style rules with numbers. The Owner
  approves each one, and it enters the shared style contract for every model.
