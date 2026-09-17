---
name: plan
description: Plan the next Stars Decoded build round. Spawns the planner agent, which writes docs/rounds/RNN-plan.md with parallel-grouped task cards from the locked specs, new QA reports and the Notion Mailbox. Use when the Owner types /plan or asks to plan the next round. Not Claude Code plan mode and not a general request to plan something.
---

The text after the command may name locked spec slugs
(`docs/specs/locked/<slug>.md`); with none, the planner takes every locked
spec without a round. A locked spec is a file, not a branch: the slug is its
id.

Spawn the `planner` agent with those slugs: Agent tool, `subagent_type`
`planner`. If that type is not registered in this session, spawn
`general-purpose` on Opus with the full text of `.claude/agents/planner.md`
as its brief; the outcome is the same. It reads the knowledge base and the
Notion Mailbox and writes `docs/rounds/RNN-plan.md`. It plans for
parallelism: cards touch disjoint files wherever the work allows, and the
plan marks which cards run together so the orchestrator dispatches them at
once (R-0.6).

When it returns, show the Owner the goals, the task-card list, the parallel
groups and any Mailbox rows it raised, then stop. The round does not start
until the Owner approves. On approval ("go", "approved", "build it"), run the
`round` skill for RNN at once in this session; never wait for a second
instruction.
