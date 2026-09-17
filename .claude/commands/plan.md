Plan the next build round. $ARGUMENTS

`$ARGUMENTS` may name locked spec slugs (`docs/specs/locked/<slug>.md`); with
none, the planner takes every locked spec without a round. A locked spec is a
file, not a branch: the slug is its id.

Spawn the `planner` agent with those slugs. It reads the knowledge base and the
Notion Mailbox and writes `docs/rounds/RNN-plan.md`. It plans for parallelism:
cards touch disjoint files wherever the work allows, and the plan marks which
cards run together so the orchestrator dispatches them at once (R-0.6).

When it returns, show the Owner the goals, the task-card list, the parallel
groups and any Mailbox rows it raised, then stop. The round does not start
until the Owner approves. On approval ("go", "approved", "build it"), run
`/round RNN` at once in this session; never wait for a second instruction.
