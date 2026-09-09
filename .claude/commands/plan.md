Plan the next build round. $ARGUMENTS

Spawn the `planner` agent. It reads the knowledge base and the Notion Mailbox
and writes `docs/rounds/RNN-plan.md`. When it returns, show the Owner the
goals, the task-card list and any Mailbox rows it raised, then stop. The round
does not start until the Owner says so.
