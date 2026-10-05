---
name: round
description: Run a Stars Decoded build round from an approved plan in docs/rounds/. This session is the orchestrator, on Opus at max effort; it branches round/RNN, spawns each builder on its card's tier, runs the tester, the gate and the sentinel, writes the round report with its Spend line, refreshes INDEX.md and CLAUDE.md, updates the Notion Mailbox, opens the pull request and merges it once green, then runs /qa on staging. Use when the Owner types /round RNN, approves a plan, or says to run or continue a round. Not for rounding numbers.
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
   - **Lessons first (ADR-265).** Before any dispatch, read `lessons.md` and
     the plan's `Lessons read through` stamp. If the previous round has no
     report, close it first. If the stamp is older than its close, re-read
     the plan against the lines added since: a guard that fits a card goes
     into its done-when, one that needs a card is a new card on Opus, and
     both are deviations; commit the plan on `round/RNN` with the new stamp.
     Each builder's brief then carries the lessons lines its card touches.
2. **Dispatch.** One builder per task card, on the tier of its `Tier:` line
   (ADR-187): `opus` is `subagent_type` `builder` (Opus, max), `sonnet` is
   `builder-sonnet` (Sonnet, high), `haiku` is `builder-haiku` (Haiku,
   medium). A card with no `Tier:` line is Opus; a tier the Owner names
   overrides the card's (R-0.7). A type not registered in this session (an
   agent file a round wrote registers only in the next session) runs as
   `general-purpose` with `model` set to the file's and the file's full text
   as its brief; the tester, the sentinel and the qa agent fall back the same
   way. Give each builder only its card, `MASTERFILE.md` §0 and the file paths
   it names. Dispatch every builder in a parallel group in one message with
   `run_in_background: false`, so the round keeps this skill's model and
   effort, and the groups in plan order; cards outside a group run alone.
   - **Retry (ADR-188).** A Sonnet or Haiku builder that reports a second gate
     failure, or a question its card, §0 and named files cannot answer, goes
     once more to `builder` (Opus) with its card and its report attached. Any
     other stop, and a stop by the retry itself, is yours (see the Rules).
   - **Tester (ADR-273).** Once, after the last group, and only when a card
     changed a step of the buyer flow or a bug came back (a lessons cause seen
     twice, or a fix the Owner has asked for twice): spawn `tester` (Sonnet,
     high) with the base commit and that reason. It updates the buyer walk and
     the critical tier, or writes the one regression test; a bug it finds is a
     fix for the card that owns the file. No tester per group.
   - **Push (ADR-234).** Push `round/RNN` once per parallel group and once
     per fix, never per card: each push builds a Vercel preview, and the
     plan allows 100 deployments a day.
   - **Tally.** As each subagent returns, add its usage figures, from the
     Agent tool's own result, to a running tally by tier for the Spend line.
3. **Gate**, in this order, all green before the round closes:
   `pnpm install --frozen-lockfile` · `pnpm run typecheck` ·
   `pnpm run build:web` · `pnpm run build:api` ·
   `pnpm -r --filter '!@workspace/e2e' --if-present run test` (the critical tier) · the buyer walk on a scratch Postgres (`api/src/walk/buyer.walk.ts`) ·
   `pnpm check:shipped` (the shipped-code check, ADR-192) · once, after the last group:
   `pnpm --filter @workspace/web run csp:write` (committed if it moved) and gitleaks over `main...round/RNN` with the
   version and config CI pins, so neither is found last by CI (ADR-283).
   If any card touched the brain paths (`api/src/prompts/`, `models.ts`,
   `aiInterpretation.ts`, `traditional.ts`, `packages/engine/`): the dry
   lab (`pnpm report:lab --dry`, in process, free); paste it into the report.
   Spot runs on demand from the Lab page; the full lab, the gate and the QA
   agent run in the admin Release view before production (ADR-86).
   If any card touched the schema: `pnpm run db:bootstrap` twice against a
   scratch database, both clean.
   Last, the **sentinel** (ADR-193, 203), once the builders, the tester and
   those commands are green and before the pull request opens: spawn
   `sentinel` (Opus, max) on `main...round/RNN`, here in the session, since CI
   holds no key. It applies the checklist in
   `docs/specs/locked/security-hardening.md` (scope 9). A blocking finding
   stops the round: write a card on Opus to fix it, dispatch it, and have the
   sentinel re-read the fix before going on. Every other finding goes to the
   backlog (step 6).
4. **Close.**
   - **Report.** Write `docs/rounds/RNN-report.md` (at most 60 lines): shipped
     (each line tagged USER-FACING or INTERNAL), deviations from the plan,
     *Decided by me* and *Needs you* (R-12.6), open Mailbox rows older
     than 14 days (by Created time, oldest first, ADR-186), the rules promoted, and one Spend line
     built from your tally (ADR-189): `Spend: <tokens> Opus, <tokens> Sonnet,
     <tokens> Haiku · cards <n> Opus, <n> Sonnet, <n> Haiku by planned tier ·
     escalations <card and why, or none>`. An escalation that repeats the last
     round's is named as a pattern, for the planner. The QA run after the
     merge counts in the next round's line.
   - **Lessons (ADR-195).** In `docs/annex/lessons.md`, one line per cause:
     trace each gate failure, escalation and sentinel finding of the round,
     and each sev-1 in `docs/qa/` not yet traced, back to its card. A cause
     seen in two rounds becomes a rule in the agent file or skill it belongs
     to and moves to Promoted; the report lists it. A promoted rule that has
     not recurred in five rounds is retired from its file and the lessons.
   - **Pull request.** Regenerate `docs/INDEX.md`. Update the "Current focus"
     block in `CLAUDE.md`. Open the pull request from `round/RNN` to `main`
     using the template, watch its checks (CI; on its preview, the smoke, the
     probe and the site checks), and merge it yourself once they are green.
     Then merge every green Dependabot PR (R-12.5).
5. **Acceptance.** Confirm the staging deploy: the Smoke run on `main` is
   green. Run `/qa` on the staging URL (ADR-194); its report,
   `docs/qa/QA-NN.md`, reaches `main` by a docs-only pull request that you
   merge once green. Hand the Owner the staging URL, the QA report and three
   lines on what to look at, together. Production moves only when the Owner
   says "promote": first the sentinel audits all of `main`, not a diff
   (ADR-193), and a blocking finding is fixed and re-read before anything
   else; then run the Release view on staging; it fast-forwards `production`
   itself; if it stops at `passed` (token missing or expired), dispatch
   `promote.yml` with the release id. No secret on GitHub, ever.
6. **Backlog and Notion (R-12.3, R-12.7).** Delete the `docs/backlog.md` lines
   the round did; add one for anything a builder raised and each non-blocking
   sentinel finding (one that shows how to abuse us is a Mailbox row with
   Owner Claude instead). Mark Mailbox rows the round resolved `done` and keep
   *Waiting on Alex* current. Write a Decisions row `Decided by: Claude` for each
   choice the round took on a rule; never edit an existing row.

Rules: a builder that wants to change files outside its card stops and
reports; you decide whether to add a card or defer. A failing gate or check is
never skipped, disabled, quarantined or loosened. You merge once the gate is
green; the Owner never merges (R-12.5).

At the close, tell the Owner what shipped with its USER-FACING or INTERNAL
tag, the deviations, the Spend line, the pull request link, the staging URL
with the QA report and its three lines, *Decided by me* and *Needs you* with the
two views (R-12.6), and every open Mailbox row older than 14 days (ADR-186).
