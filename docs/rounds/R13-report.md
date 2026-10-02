# R13 report — security hardening and the agent roster

Built 2026-10-01 to 02 on `round/R13` from `docs/rounds/R13-plan.md` (`security-hardening`, ADR-197 to 203; `agent-roster`, ADR-187 to 196;
ADR-204 sets the order). The plan sat on `claude/eager-albattani-i8ekei`; the round branched from it and merged `main` (b250899). The
pricing plan once called R13 is R14; its re-plan is kept for its /plan. Twenty-four planned cards in three groups plus thirteen added
(below); every group ended green. Three container restarts: the planner twice and R13-01 once, resumed from its work on disk.

## Open Mailbox rows created more than 14 days ago (ADR-186)
2026-09-09: MB-12, 19, 20, 21, 22, 30. None blocked a card; MB-23 (the same age) is done.

## Shipped
- **R13-01** no CORS; a write from a foreign origin gets 403; the cookie Lax and Secure; 32 kB bodies; nosniff and frame-ancestors — INTERNAL.
- **R13-02** pnpm 10.34.5 with a 7-day release age; `express-rate-limit` 8.7.0 in, `cors` out; `@axe-core/playwright` 4.13.0, `@playwright/test` 1.63.0 — INTERNAL.
- **R13-03 to 07** researcher, verifier, tester, sentinel, builder-sonnet and builder-haiku; tiers in planner, builder and qa; the PR template's gate; /ideate, /plan and /qa; the owner playbook and lessons — INTERNAL.
- **R13-08** limits on every route that writes or sends, each refusal one line with Retry-After — USER-FACING.
- **R13-09, C2** the daily spend breaker at 20 USD (MB-145): past it new reports pause with one line and the admin gets one email; it sums a new `spend_ledger` written at every visitor model call, synastry, failures and regenerates included — USER-FACING.
- **R13-10, C3** `/api/csp-report` counts violations by directive and host in `csp_violations`, capped at 5 a request and 200 rows a day — INTERNAL.
- **R13-11** HSTS, nosniff, Referrer- and Permissions-Policy, X-Frame-Options and a report-only CSP on every web path; the build checks the hashes — INTERNAL.
- **R13-12, 12b, 25** names and the pair label reach every prompt only inside a data block, the legacy pair prompt too; v9 and p4 — USER-FACING.
- **R13-13** the report page renders v9 and p4 — INTERNAL. **R13-14, C5** the contract: the name rule, the label's three words, 429, 503, 401 — USER-FACING.
- **R13-15** `pnpm check:shipped` · **R13-16** CI audit, gitleaks, SHA pins, Dependabot · **R13-17** the security probe in every smoke · **R13-18** Lighthouse and axe on every preview — INTERNAL.
- **R13-19** the PreToolUse hook: no env file, no generated file, no push to main or production, no downloaded script run — INTERNAL.
- **R13-20** the lab's pair campaign in 16 writes over three sessions — INTERNAL.
- **R13-21, 27** logs without birth data, coordinates, email, names, Clerk ids or tokens; body-parser errors answer JSON — INTERNAL.
- **R13-22, 26** three hostile-name fixtures in the dry lab and on the Lab page's Dry — INTERNAL.
- **R13-23** the page shows a limit with the reader's clock time, the pause, and the name rule before sending — USER-FACING.
- **R13-24** the Failures tab's CSP counts — INTERNAL. **R13-C1** zoom back on every page, footer, legend and /sample contrast, the wheel's role — USER-FACING.
- **R13-C7** after the PR's first Lighthouse run: public pages paint before their scripts and webfonts start; mobile LCP / 8.2 → 1.5 s, /sample 6.8 → 2.0 s, /faq 4.5 → 1.2 s (local); text shows in the fallback face until the fonts swap in — USER-FACING.
- **R13-C4, C6** on production the five writing routes need an account (ADR-140); on staging signed-out writes share 24 an hour; the admin's 256 kB parser after its guard — USER-FACING.

## Gate
install, typecheck, both builds (CSP check included), unit tests (api 510, web 596, scripts 73, commerce 24, db 19, engine 8),
`check:shipped` clean, audit clean, codegen twice with no diff, `db:bootstrap` twice on a fresh Postgres 16, the walk 32/32 twice.
**Dry lab** against r06, free: 60 natal prompts and 69 pair prompts under each lens, every schema ok; every system prompt +91 tokens
for the data rule; **injection clean: 63 prompts, every hostile name inside its data block only.**
**Tester:** 32 tests after group A, 30 after group B; no bug found. **Sentinel:** BLOCKED 3 (S1 to S3) → C2 to C5 → BLOCKED 1 (S1 on
staging) → C6 → **CLEAR**; S5, S8, S9 and two found by the last read went to the Mailbox. Final gate: api 517, web 596, the rest as above.

## Deviations
- Added by the orchestrator: 12b, 25, 26, 27 from builders' out-of-card reports; C1 and C7 from the site checks; C2 to C6 from the sentinel.
  On the PR: a 22px Clear button (axe) and three fake test values (gitleaks, `.gitleaksignore` by fingerprint) fixed in 99901ce.
- **R13-05's /round edit was refused** by the harness as self-modification; the template half shipped, the skill draft waits for the Owner.
- Staging keeps anonymous writes for the GitHub lab campaigns; production needs an account. A forged X-Vercel-Forwarded-For still
  dodges per-address limits on the public Railway host until a Vercel-side secret exists (Mailbox).
- The 429 line ends "within the hour"; the page turns Retry-After into a clock time. The pause line says "for now", not "later today".
- pnpm 10.34.5, not the 3-day-old 10.34.6. CSP hosts for Clerk and Vercel come from the SDK and docs, unverified live; the probe's full half runs on staging.

## New words for the Owner's look
The six limit lines and the pause line (`limits.ts`, `spendCap.ts`); "Use letters, spaces, apostrophes, hyphens and dots, up to 60
characters."; "Sign in to write a report."; the 403 "This request has to come from the Stars Decoded website."; the Failures tab's CSP card.

## Spend
Spend: about 4.4M Opus, 1.2M Sonnet, 0.04M Haiku (subagent tokens, two lost planner runs not counted) · cards 17/17/1 by planned tier,
plus two by the orchestrator · escalations none.

## Mailbox
Done: MB-23. Raised (ten): the forged forwarding header (R14, two dashboard values from the Owner); staging's signed-out writes against
ADR-140; names in retries and repairs (a spot run before the Release); gift reminders unlimited; the preview origin pattern; the /round
draft (`docs/annex/round-skill-r13-05-draft.md`); R13's words; small leftovers; the shared count held by dropped requests; one birth-time
change re-running every report's horizon pass. The sentinel's full audit of `main` follows the merge, before any Release.
