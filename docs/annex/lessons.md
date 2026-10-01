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
None yet.

## Promoted
None yet. The planner reads this section before it plans, and its rules bind the plan (ADR-195).

## Retired
None yet.
