---
name: round
description: Run a Stars Decoded build round from an approved plan in docs/rounds/. This session is the orchestrator, on Opus at max effort; it branches round/RNN, spawns builders in parallel groups, runs the gate, writes the round report, refreshes INDEX.md and CLAUDE.md, updates the Notion Mailbox, opens the pull request and merges it once green. Use when the Owner types /round RNN, approves a plan, or says to run or continue a round. Not for rounding numbers.
model: opus
effort: max
---

The round is the text after the command, a number such as R03. With none,
take the newest plan in `docs/rounds/` that has no report.

This session is the orchestrator and runs the round here, in the main loop.
Never hand it to a subagent: in cloud sessions a subagent cannot spawn one of
its own (`CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=1`), so an orchestrator
subagent built every card itself in R05 to R08. The frontmatter runs this
skill on Opus at max effort (Owner, ADR-137). You run the plan; you do not
redesign it.

1. **Branch.** One branch per round, `round/RNN`, from `main`. All builders
   commit there. Never push to `main`.
2. **Dispatch.** One builder per task card: Agent tool, `subagent_type`
   `builder` (Opus at max effort, from its agent file); if that type is not
   registered, `general-purpose` on Opus with the full text of
   `.claude/agents/builder.md` as its brief. Give each builder only its card,
   `MASTERFILE.md` §0 and the file paths it names. Dispatch every builder in
   a parallel group in one message with `run_in_background: false`, so the
   round keeps this skill's model and effort, and the groups in plan order;
   cards outside a group run alone. A simple-improvement card may run on
   Sonnet.
3. **Gate**, in this order, all green before the round closes:
   `pnpm install --frozen-lockfile` · `pnpm run typecheck` ·
   `pnpm run build:web` · `pnpm run build:api` ·
   `pnpm -r --filter '!@workspace/e2e' --if-present run test`.
   If any card touched the brain paths (`api/src/prompts/`, `models.ts`,
   `aiInterpretation.ts`, `traditional.ts`, `chartCalculation.ts`): the dry
   lab (`pnpm report:lab --dry`, in process, free); paste it into the report.
   Spot runs on demand from the Lab page; the full lab, the gate and the QA
   agent run in the admin Release view before production (ADR-86).
   If any card touched the schema: `pnpm run db:bootstrap` twice against a
   scratch database, both clean.
4. **Close.** Write `docs/rounds/RNN-report.md` (at most 60 lines): shipped
   (each line tagged USER-FACING or INTERNAL), deviations from the plan,
   Mailbox rows added or resolved, token-spend note if the round felt heavy.
   Regenerate `docs/INDEX.md`. Update the "Current focus" block in
   `CLAUDE.md`. Open the pull request from `round/RNN` to `main` using the
   template, watch its checks, and merge it yourself once they are green.
   Then confirm the staging deploy: the Smoke run on `main` is green. Hand
   the Owner the staging URL and three lines on what to look at. Production
   moves only when the Owner says "promote": run the Release view on staging;
   while MB-75 is open it stops at `passed`, then dispatch `promote.yml` with
   the release id. No secret on GitHub, ever.
5. **Notion.** Mark Mailbox rows the round resolved as `done`; add rows for
   anything a builder raised. Never touch a Decisions row.

Rules: a builder that wants to change files outside its card stops and
reports; you decide whether to add a card or defer. A failing gate is never
skipped, disabled or quarantined. You merge once the gate is green; the
Owner never merges (R-12.5).

At the close, tell the Owner what shipped with its USER-FACING or INTERNAL
tag, the deviations, the pull request link, the staging URL with its three
lines, and any Mailbox row now open more than two rounds.
