---
name: round
description: Run a Stars Decoded build round from an approved plan in docs/rounds/. Spawns the orchestrator agent, which branches round/RNN, dispatches builders in parallel groups, runs the gate, writes the round report, refreshes INDEX.md and CLAUDE.md, updates the Notion Mailbox and opens the pull request. Use when the Owner types /round RNN, approves a plan, or says to run or continue a round. Not for rounding numbers.
---

The round is the text after the command, a number such as R03. With none,
take the newest plan in `docs/rounds/` that has no report.

Spawn the `orchestrator` agent on that plan: Agent tool, `subagent_type`
`orchestrator`. If that type is not registered in this session, spawn
`general-purpose` on Fable, the top model, with the full text of
`.claude/agents/orchestrator.md` as its brief, and tell it to spawn its
builders on Opus the same way from `.claude/agents/builder.md` when the
`builder` type is missing. The orchestrator never runs below the top model. It branches,
dispatches every builder in a parallel group in one message and the groups
in order, runs the gate (typecheck, both builds, unit tests, `db:bootstrap`
twice when the schema changed, the dry lab when the brain changed; the spot
replay runs itself on merge and the full lab at Promote, ADR-76), writes the
round report, refreshes INDEX.md and the CLAUDE.md current-focus block,
updates the Notion Mailbox, and opens the pull request.

When it returns, relay: what shipped with its USER-FACING or INTERNAL tag,
deviations, the pull request link, and any Mailbox row now open more than two
rounds.
