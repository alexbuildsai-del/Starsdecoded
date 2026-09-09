Run build round: $ARGUMENTS (a round number such as R03; defaults to the newest plan in docs/rounds/ without a report)

Spawn the `orchestrator` agent on that plan. It branches, dispatches builders,
runs the gate, writes the round report, refreshes INDEX.md and the CLAUDE.md
current-focus block, updates the Notion Mailbox, and opens the pull request.

When it returns, relay: what shipped with its USER-FACING or INTERNAL tag,
deviations, the pull request link, and any Mailbox row now open more than two
rounds.
