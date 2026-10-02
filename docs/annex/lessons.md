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
- R13 · R13-12 · a version bump left the old version pinned in a test and a list outside the card's files · - · -
- R13 · R13-05 · a card editing the running /round skill was refused as self-modification; such a card needs the Owner's own edit · - · -
- R13 · orchestrator · the tester's diff range began at its own last commit and skipped files that landed earlier in the group · - · -
- R13 · R13-01 · a container restart killed a builder before its commit (also the planner, twice); work on disk survived · - · -

## Promoted
None yet. The planner reads this section before it plans, and its rules bind the plan (ADR-195).

## Retired
None yet.
