# Draft spec — pair reliability and prose (R08)

Raised by the Owner 2026-09-25, after two things happened on 2026-09-24.
- **The pair campaign** (run 35993780324) failed on all 7 pairs. In each report one
  chapter failed its checks three times, and that failure took the whole report down.
- **The first reading session** (`session-2026-09-24`: 12 cards on the Owner's own
  report, base `report:86686f7c`) was revealed.

Owner's direction:
- Tighten the pair prompts.
- Give the checks a buffer.
- Retry only the failed chapter, always with the feedback, and treat a failure that
  keeps coming back as a signal to fix the prompt.
- Stop spending on the lab automatically on staging. Test on demand, and
  automatically before a production deploy with a QA agent.
- Learn from the picks what makes the prose good, so every model writes to that
  standard.
- "Simpler sentences over complicated vocabulary, always."

Artifact: https://claude.ai/artifact/6HLtPdSaR3wiVLXx16oWHU

## What the failures were

Six rules, each where the prompt and the check disagree or the prompt never names
what the check rejects: link card length (`links.ts:42`), the "Behaviour check:"
ending (`links.ts:44`), card lines over 12 words (`shapes.ts:179`), age-band words
(`doctrine.ts`), links outside the allocation and non-verbatim quotes
(`pair/evidence.ts:79, 66`). Table with counts in the artifact. Today 3 attempts in
`callStructured` feed back only the last errors, the third failure rejects stage 2's
`Promise.all` (`pairInterpretation.ts:247`), running chapters keep paying, the credit
is not refunded (`compatibility.ts:129`), and no failed attempt is recorded.

## Scope

1. **Pair prompts say the limits they enforce.**
   - Every section states its target and names what the check rejects.
   - Link cards: 45 to 60 words. The last sentence begins "Behaviour check:".
   - Card lines: at most 12 words.
   - Each band's forbidden words are listed from `doctrine.ts` `never` into the
     chapter brief, generated from the same table so the prompt and the check
     cannot drift.
   - The chapter's allocated links are listed as the only citable cross links.
2. **Simpler sentences, always.** Rule 7 of `STYLE_CONTRACT` (plainer beats
   cleverer) and rule 8 (short sentences) get a number. `PAIR_WRITER` gets the same
   rule.
   - Proposed starting numbers, subject to change by the prose study: sentences
     average 15 words or fewer, none over 25, and the common word always wins over
     the rare one.
   - This is a brain change and USER-FACING (R-5.5).
3. **Buffers on the checks.** The prompt keeps the target; the check accepts a
   margin around it (Q3).
   - Word ranges get about 15%: link cards accept 36–80.
   - Card lines get 2 words: 14.
   - "Behaviour check:" only has to start the last sentence. Either spelling passes,
     as does an ending in any punctuation.
   - Quotes match ignoring case and punctuation.
   - Age bands and allocation stay strict, because they are about the content being
     right.
4. **Retries carry all the feedback.**
   - Each retry gets every error seen so far plus its own last reply, with "fix
     these, keep the rest".
   - A chapter that failed only on claims or allocation goes through the claims-only
     repair (MB-62), extended to allocation problems.
5. **Retry only the failed chapter.**
   - A chapter that exhausts its attempts no longer rejects the report. The other
     chapters are kept, and the failed one gets one more round alone, with the full
     error list.
   - If that fails too, the report fails and the credit is refunded (Q1).
   - Chapters still running when a report finally fails are cancelled
     (`AbortController`), so they stop paying.
   - Natal sections get the same treatment. The foundation is excluded because every
     section depends on it.
6. **The failure log.**
   - New table `generation_failures`: id, report kind (natal / pair / lab),
     section, rule id, message, model, attempt, final, created_at.
   - One idempotent migration, wired into `scripts/bootstrap-db.sh`.
   - Every validator message gets a stable rule id, such as `card.line.words`,
     `band.grown.never` or `quote.verbatim`.
   - Written for every rejected attempt, customer and lab alike.
7. **Failures tab on the Lab page.**
   - Per rule and section: the last 20 writes, the first-try failure rate, and final
     failures.
   - A rule turns red at more than 1 in 10 over the last 20 writes of a section.
   - A red rule is a prompt fix for the next round, raised as a Mailbox row by the
     planner. Nothing edits a prompt automatically: prompts change at their source
     (R-5.4).
   - `GET /admin/lab/failures` returns counts only, so a workflow can read it with
     `LAB_TOKEN` without exposing report text.
8. **No automatic lab spend on staging.**
   - Delete `lab-spot.yml`. Spot stays in `report-lab.yml` as an on-demand campaign.
   - Dry stays at every brain change (free).
   - This amends ADR-76 and R-4.4 (see Decisions).
9. **The QA gate in Promote.** After the release lab, and only when that passes, a
   `qa` job runs the QA agent headless against staging.
   - It uses `anthropics/claude-code-action` with Playwright in the runner.
   - It plays the five personas, orders one natal report and one pair report, and
     reads both against the style contract.
   - It writes `docs/qa/QA-NN.md` to the report-lab branch. Personas and report text
     from test fixtures only; no private data.
   - A sev-1 finding blocks the fast-forward.
   - Without the key (Q2), the job is skipped and the promote summary says so.
   - The release lab gains one pair (`curie-winfrey` partners) when the pair brain
     changed. It is measured, and gated on no new fault.
10. **The prose study.**
    - After a reveal, `POST /admin/lab/sessions/:id/study` measures every variant in
      code, with no model call:
      - words per sentence (mean and p90);
      - the share of words with three syllables or more;
      - the share of words outside a common-word list (5,000 words, committed);
      - the share of second-person sentences with a verb of action;
      - Flesch reading ease.
    - It compares the picked variant with the variants passed over, per card and
      overall.
    - An optional step costs under 1¢ on gpt-6-luna: per card, three lines on what
      the picked text does better.
    - Results are stored on the session and shown in *Reveal → Prose study*.
    - A measure that differs in the same direction on at least 8 of 12 cards becomes
      a proposed rule, shown with its numbers.
    - The Owner approves in the page. The next round writes the approved rule into
      `STYLE_CONTRACT` at its source, and adds a measure in `labRules.ts` so the dry
      lab and the release gate check it.
    - Report text never leaves the staging database. The study route returns numbers
      and the Owner-visible lines only; `LAB_TOKEN` reads the numbers.
11. **Docs.**
    - The report-lab skill, the round skill, the orchestrator and `qa.md` get the new
      levels and the QA gate.
    - CLAUDE.md's brain paragraph and MASTERFILE R-4.4 and §11.2 to §11.4 change to
      match.

## Out of scope

- **Moving any section to a new writer.** The rule stays five of five charts
  (ADR-57). Session 2026-09-24 was one chart with 50% control agreement. A second
  session on the other four charts is the Owner's to spawn when they want.
- Automatic prompt edits; loosening the age-band or allocation checks; natal prompt
  content changes beyond scope 2; a scheduled drift check; QA on every merge.

## Acceptance criteria

1. Unit tests, one per rule: a 72-word link card passes and a 90-word one fails; a
   13-word card line passes and a 15-word one fails; a two-sentence "Behaviour
   check:" ending and "Behavior check:" pass; "screen time" in a grown-band chapter
   fails; a quote that differs only in case passes.
2. Every band's forbidden words appear in the rendered chapter brief (dry lab, free),
   generated from `doctrine.ts`.
3. A pair chapter stubbed to fail three times, then pass: the report completes, the
   other chapters are called once, `generation_failures` has 3 rows for it.
4. Stubbed to fail every time: the report is `failed`, the credit is refunded,
   in-flight chapters are aborted.
5. A retry prompt contains every earlier error and the previous reply (unit test on
   the built messages).
6. Failures tab: counts per rule and a red flag at the threshold, from seeded rows.
   The route returns no report text.
7. `lab-spot.yml` is gone: a push to `main` with a brain change spends nothing.
8. Promote rehearsal: with `rehearsal: stub` the QA job runs in dry mode against
   fixtures; a seeded sev-1 blocks the fast-forward; without the key the job is
   skipped and reported as skipped.
9. The prose study on `session-2026-09-24` fills its table with no model call and
   proposes a rule only where 8 of 12 cards agree.
10. Gate: typecheck, both builds, unit tests, `db:bootstrap` twice on a fresh
    database, the dry lab on the five charts plus one pair. USER-FACING for scopes 1
    to 5, INTERNAL for the rest.

## Screens

Artifact above: the failure table, retry flow today and proposed, the Failures tab,
lab levels before and after, Promote with QA, the 2026-09-24 picks, the Prose study.

## Open questions

1. **A chapter that still fails after its lone round.** Recommended and default: fail
   the report, refund the credit and log it. The alternative is to ship the report
   without the chapter.
2. **The QA agent needs** an Anthropic API key in the GitHub `production`
   environment and one staging test account for the returning-user and admin
   personas. Recommended: provide both. Our rough estimate is $1 to $3 per promote, to be
   measured on the first run. Default: build the job now, and skip it with a notice
   until the key exists.
3. **Buffer size.** Recommended and default: about 15% on word ranges and 2 words on
   card lines, with the prompt keeping the original target.

## Decisions to record

- A check accepts a buffer around the target its prompt states: about 15% on word
  ranges and 2 words on card lines. Content rules (age bands, allocated links) stay
  strict, and the prompt names exactly what they reject.
- A section that exhausts its attempts no longer fails the report on its own: it gets
  one more round alone with every error so far. A final failure refunds the credit
  and aborts the chapters still running.
- Every rejected attempt is logged by rule id in `generation_failures`. A rule failing
  on more than 1 in 10 of a section's last 20 writes is a prompt fix for the next
  round, never an automatic edit.
- ADR-76 and R-4.4 are amended: no lab spend on staging is automatic (spot on merge
  removed); dry stays at every brain change; spot and reading run on demand; Promote
  runs the release lab then the QA agent and moves production only when both pass.
- Simpler sentences over complicated vocabulary, always. The style contract carries
  numeric sentence limits, set first at 15 on average and 25 at most, and then by the
  prose study.
- The prose study turns reveal picks into proposed style rules with numbers. The
  Owner approves each rule, and it enters the shared style contract at its source for
  every model. Report text never leaves the staging database.
