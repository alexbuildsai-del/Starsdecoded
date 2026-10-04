# Lessons

What the workers got wrong, one line per cause, so that a repeat becomes a rule. At each round's close the orchestrator traces
every gate failure, escalation, sentinel finding and QA sev-1 back to its card and writes its cause here (agent-roster scope 12,
ADR-195). Lines, not a diary: at most 60 lines.

## Line format
`round · card · cause · rule it became · where`
- **round, card:** where the cause showed up, such as `R13 · R13-08`. Before adding a line, look for the same cause below: if
  it is there, its line takes the new round and card after the old ones and no second line is added.
- **cause:** what went wrong, in one clause, never who.
- **rule it became, where:** `-` and `-` until promoted; then the sentence now in the agent file or skill, and that file.

## The rule
1. A cause seen in two rounds is promoted at the close of the second: its rule goes into the agent file or skill it belongs to
   (a builder line such as "run codegen after `openapi.yaml`", a planner tier rule), its line moves to Promoted, and the round
   report lists it.
2. A promoted rule quiet for five rounds after that is retired at the close of the fifth: it leaves its file, which keeps the
   file within its 50 lines, and its line moves to Retired with `retired RNN` added. A new sighting in those five rounds is
   added to its line and the five start again.
3. Over 60 lines, the oldest lines under Seen once go first.

## Seen once
- R13 · R13-08 · a limit keyed on a client-sent header and a fresh anonymous session was accepted on controls that did not hold (sentinel S1) · - · -
- R13 · R13-09 · the spend breaker summed a stored, derived cost instead of recording each paid call when it happened (S2) · - · -
- R13 · R13-10 · an unauthenticated counting route wrote a row per distinct value with no ceiling (S3) · - · -
- R13 · R13-05 · a card editing the running /round skill was refused as self-modification; such a card needs the Owner's own edit · - · -
- R13 · orchestrator · the tester's diff range began at its own last commit and skipped files that landed earlier in the group · - · -
- R14 · R14-14 · log redaction by key path missed deeper shapes (an error's headers, raw header lists); a secret is now censored by name and by value (tester B) · - · -
- R14 · R14-01 · a card said "nothing else enters" while the new dependency brought 17 transitive packages no plan line named (sentinel S1) · - · -
- R14 · R14-12 · focus after a whole time went to the dialog's Not now, so a stray Enter closed it; "the next control" read as DOM order, not the next step · - · -
- R14 · R14-14 · the gate type-checked the edge middleware with its own tsconfig while Vercel used the root one, so the preview failed on fetch types · - · -
- R14 · orchestrator · about thirty pushes in one day spent Vercel's free 100 deployments, so the QA fix's preview could not build; batch pushes, one per group and one per fix · - · -
- R13 · R13-01 · a container restart killed a builder before its commit (also the planner, twice); work on disk survived · - · -
- R15 · R15-04 · a name pattern matched on raw JSON text, so an escape's letter (`\n`) hid a name opening a paragraph (tester A) · - · -
- R15 · R15-23 · a builder committed without a pathspec and took another builder's staged files into its commit · - · -
- R15 · R15-16, R15-17 · a public page was pointed at a route the prelaunch gate closed and the session middleware cookies; no card owned the gate or the mount · - · -
- R15 · R15-18, R15-19 · a list of grants filled an address from the reader's account for a grant made without a link, showing the sharer an email never given · - · -
- R15 · orchestrator · the sentinel hit the session's usage limit before answering and had to run again · - · -

- R16 · R16-01, R16-03 · a spec promised dates "to the hour" against JPL Horizons, which the engine's ephemeris meets only for Jupiter and Saturn (Neptune drifts up to 7 hours) · - · -
- R16 · R16-01 · a range was filtered on an instant's raw value while the instant was reported rounded, so an item fell outside a range holding its own reported time (tester A) · - · -
- R16 · R16-05 · a day guard checked only the weekday of a date the calendar rolled over (30 Feb read as Monday 2 Mar) (tester A) · - · -
- R16 · R16-21 · a sentence check looked only at a sentence's start, so an order after an opening clause, a name or a softener passed (tester B) · - · -
- R16 · R16-23 · an age was rounded instead of floored, reading the next year for hours before a birthday (tester B) · - · -
- R16 · R16-24 · a kept row that no longer parsed was neither returned nor claimable, so an open spun on "writing" for good (tester C) · - · -
- R16 · R16-14 · structured data built from one page's list was stamped on every page of that kind (/timeline carried /faq's questions) · - · -
- R16 · R16-29 · a new spending surface reused a refusal line written for another product (Ask showing "Your credit hasn't been used") · - · -

## Promoted
The planner reads this section before it plans, and its rules bind the plan (ADR-195).
- R13 · R13-12; R14 · R14-02, R14-13; R16 · R16-20 · a change to a shared value or shape (a version pin, a body made optional, a new argument) left a caller outside the card's files on the old one (a test pin; the orrery's made-up Chiron; home's part-of-day chips; `GET /home`'s new `tz` moved the generated hook's arguments under four callers) · "Before changing a shared export, a pinned value or what a function may return, grep every caller; a caller outside your files is named in your report, never left on the old shape." · `.claude/agents/builder.md`

## Retired
None yet.
