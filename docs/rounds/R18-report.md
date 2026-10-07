# R18 report — sev-2 fixes, three loading stories, Timeline written at setup, deploys without a gap

Built 2026-10-07 on `round/R18` from `docs/rounds/R18-plan.md` (ADR-357, 359 to 362). 27 planned cards in three groups (16 Opus,
11 Sonnet), plus two fix cards on Opus (R18-28, R18-29). Each group ended green and was pushed once; the fixes were pushed once.

## Open Mailbox rows created more than 14 days ago (ADR-186)
2026-09-09: MB-12 (no error reporting). MB-232's KPI spec reads it beside request errors, planned with R19. No card waited on it.

## Shipped
- **R18-01** one Timeline plan per account (a second is cancelled and refunded at its first payment), Link off, "or pay another way" — USER-FACING.
- **R18-02** sign-in returns where you were (`sd.return_to`, same-origin paths only), each viewer's own cache, a session's pairs claimed — USER-FACING.
- **R18-03** deploys without a gap: `exec node`, 60 s overlap and drain, the done page waits past a 502 (up to 120 s) — USER-FACING.
- **R18-04, R18-29** MB-233: fixed as its row says; one reset per deploy walk; the reset now ends the walk's plan instead of deleting it — INTERNAL.
- **R18-05, 06** the credit line, Timeline's launch-day lines and "transit"; the legal pages (a pair's credit at once, Stripe's cookies) — USER-FACING.
- **R18-07 to 11, 16, 17, 27** the Personal and Compatibility loading stories on one grid: chart, globe, houses, Did you know; the orrery goes — USER-FACING.
- **R18-12** the job queue (lease, retries, a UTC-midnight wait on a paused day) and the round's three tables — INTERNAL.
- **R18-13** the pair's compute: hard pairs match in either order, a no-time Moon keeps an aspect only when its whole day holds it; the pair files join the brain lists — USER-FACING.
- **R18-14, 23** QA checks what it can reach, reads the walk first, and the staging walk keeps a picture of each step (masked, staging only) — INTERNAL.
- **R18-15** look-backs only to the past — USER-FACING.
- **R18-18, 24, 25** Timeline written at setup from the moment payment clears; the setup screen draws the dial while the readings are written; stale readings written again in the background — USER-FACING.
- **R18-19, 20, 21** R on the dial and the line that explains it; House by House shows the opposite house; the hero's Ascendant and the report's date — USER-FACING.
- **R18-22** the admin's refusal line, the STAGING badge off the credits count, the delete dialog's Timeline note — USER-FACING.
- **R18-26, 28, 29** the buyer walk sets Timeline up and cancels as its own step; a plan's checkout says "Timeline" and the staging walk follows it; setup's routes get a count (30 a minute) — USER-FACING (28's words), INTERNAL.

## Gate
install, typecheck, both builds, the critical tier on a scratch Postgres (api 586, web 200, commerce 27, engine 21, db 20, scripts 12),
"buyer walk: 19/19 steps passed", the archived Timeline walk 10/10, `check:shipped` clean, `check:copies` one each, `pnpm audit --prod`
clean, codegen twice with no diff, `db:bootstrap` on main's tree then this branch twice and on an empty database twice, all clean,
`csp:write` unchanged, gitleaks 8.30.1 over `main...round/R18` clean. **Dry lab** against r06, free: 60 natal prompts, schemas ok;
"timeline dry render: 56 prompts for 7 charts … 8698 to 9139 tokens"; "ask dry render: 42 prompts for 7 readers"; curie-winfrey's
nine pair sections ok (partners 11880 to 12557 tokens); **"injection clean: 105 prompts"**. The stored r06 runs were placed from the
`report-lab/*` branches for the run and removed after. **Tester:** no bug; 13 tests and the walk's none, catch-up and stale-refresh checks.
**Sentinel:** CLEAR, nothing blocking. S1 (setup routes had no count) and S3 (the walk's plan read as a second plan) fixed in R18-29,
re-read by the sentinel; S2 is MB-234, private.

## Deviations
- R18-28 and R18-29 added: a plan's new landing left the staging walk and the checkout lines on the old return (R18-24 named them); S3 would have failed the staging walk's Timeline step.
- Cards that took a file outside their list, each named in its report: R18-02 (processors), R18-13 (github.test), R18-15 (mira.ts and archive tests), R18-17 (pair-story), R18-24 (ReadingSheet), R18-25 (timelineReadings.test), R18-27 (index.css).
- Orchestrator fixes: the grid's `place-items` (the stage collapsed in Chromium), the buyer walk's setup stretch (today + 182), five stale comments.
- Setup's stretch ends at today + 182 days, not Monday + 181; the setup routes answer 401 signed out; billing country is not set (B-56 keeps that half).

## Decided by me
Link off by `wallet_options.link.display "never"`; the done page's 120 s only when the API has a gap; the R line shows while any planet
in the dial's range is retrograde, and the nodes never trigger it; the Ascendant written sign first, as the Sun and Moon are;
`qa_shots.walk_id` is the walk's own id; a plan's checkout lines: "then on to Timeline", "Then Timeline starts and we take you to it.",
"Taking you to Timeline."; setup's count is 30 a minute; the reset ends a plan rather than deleting it.

## Needs you
MB-228 gained two Railway checks for production (no volume; empty Custom Start Command). Your look: `docs/annex/R18-words.md`, before and after.

## Spend
Spend: 5.08M Opus (18 Opus cards with both fixes, three researchers, the sentinel twice), 1.32M Sonnet (11 cards, the verifier, the
tester, the words list), 0 Haiku · cards 16 Opus, 11 Sonnet, 0 Haiku by planned tier, plus R18-28 and R18-29 (Opus) · escalations none · lab 0 ¢.

**Lessons.** Promoted early: a builder's `pkill vite` stopped others' servers → builder.md. Seen again: the caller rule (R18-15, 24, 25, each named in
its report), its five rounds restart. One new cause seen once (artifact CSS collapsing a grid).

## Mailbox and backlog
Done: MB-233. Raised: MB-234 (private, Owner Claude). MB-227 notes the four hosts added. Backlog: B-34, 38, 39, 41, 42, 44 to 49, 53 to 55
done, B-31 and B-56 halved; B-59 to B-71 added. Decisions, `Decided by: Claude`: one plan per account's refund; setup's count; the R line.
