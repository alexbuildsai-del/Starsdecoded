# R17 report — Stripe payments: our checkout, a hard ledger, campaigns and testers, Timeline's billing, and QA on the buyer walk's steps

Built 2026-10-05 on `round/R17` from `docs/rounds/R17-plan.md` (locks `stripe-payments`; ADR-274 to 282, 285, 313 to 315).
28 planned cards in three groups (19 Opus, 9 Sonnet) plus R17-29 (Sonnet) and the sentinel's fix R17-S1 (Opus); each group ended green.

## Open Mailbox rows created more than 14 days ago (ADR-186)
2026-09-09: MB-12 (no error reporting); MB-232's spec (R18) reads it beside request errors. No card waited on it.

## Shipped
- **R17-14, 15, 16, 10** `/checkout` in our look on Stripe's Express Checkout and Payment Element, our box, Pay with the amount, the done page that waits for the credit and returns to the step that asked; every Get credits on the dashboard and the birth form opens it; live campaign prices on the site — USER-FACING.
- **R17-11, 12, 04, 02** the webhook as the only grant (signed, raw body, each event once, only with its tick), refunds and disputes take back unused credits, Timeline's subscription as its second access source with the yearly credit, four products synced from the catalogue at start, the payment tables — INTERNAL.
- **R17-21, 17** credits hard on every host (402 `no_credit`); a failed report keeps its credit, Try again is free ("It's free."), the credit comes back after the third failure, on Delete, or at once for a pair (ADR-313) — USER-FACING.
- **R17-22** the free test checkout deleted; the round's tests in the critical tier; CI gives them a database — INTERNAL.
- **R17-07, 08** our receipt email; Terms, Refunds, Privacy, the FAQ and /method on checkout, Timeline and a failed report (QA-04 #2) — USER-FACING.
- **R17-18, 19, 28** Start Timeline and the plan on the Account page with the Portal; the admin's one Sales page (campaigns, testers); the walk's verdict and any sync problem as one line on the Release view — USER-FACING (18), INTERNAL (19, 28).
- **R17-13, 03** campaigns under their rules (25% off, one per product, never Single, 30 days apart) and testers; the catalogue's lookup keys, Timeline's plans, the plan's box (MB-225 provisional) — INTERNAL (13), USER-FACING (03).
- **R17-05, 29, 01** a pair shared with its other person (ADR-285, B-01), its Send and claim showing the API's line; `PairLink.of` gains `none` (B-15) — USER-FACING.
- **R17-24, 25, 26, 09, 23** one step list for the buyer walk (17 steps, Stripe stood in) and the staging walk (Mira and Idris, real sign-in, the 4242 card, a test clock); the staging walk after each deploy at 0 ¢ and in each Release, which writes the QA pair's seed (ADR-315); `/api/qa/latest`; the archived walks on hard credits — INTERNAL.
- **R17-06, 20, 27** Run the fixtures on the Lab page and `report-lab.yml` gone (B-30); Ask hides replies once a stop takes their source (B-02); Timeline readings only for events the app shows, 40 new a day (MB-219) — INTERNAL.

## Gate
install, typecheck, both builds (CSP with Stripe's hosts rewritten once per group so each preview built), the critical tier with a database
(api 552, commerce 27, engine 21, db 20, scripts 12, web 129) and without one, "buyer walk: 17/17 steps passed; 54 stand-in model calls, 28
stand-in Stripe calls", the loop 35/35, sharing 14/14 and timeline 10/10 walks, `check:shipped` clean, `check:copies` one each, `pnpm audit
--prod` clean, codegen twice with no diff, `db:bootstrap` on main's tree then this branch twice and an empty database twice, all clean,
gitleaks 8.30.1 over `main...round/R17` clean after five fake test values were fingerprinted (ADR-200). **No dry lab:** no brain path changed.
**Tester:** no bug; four tests added (a yearly refund's credit, a malformed tick, a free earlier-version Regenerate, `/checkout/test` gone).
**Sentinel:** BLOCKED on S1 (the tester grant's log line named the admin's Clerk id) → R17-S1, which also caught S3 (the tester routes'
Clerk id in logged paths) → re-read **CLEAR**. S2 (the QA pair's public `+clerk_test` addresses) is MB-233, private.

## Deviations
- Round start 3 skipped: R16's anonymous lab campaign would spend on staging, and the next Release's full lab measures the same (the Owner's staging cost rule).
- Group A went out before Round start 4's facts landed; two re-pins (a fresh test-clock customer per walk, `skipPasswordRequirement`) reached R17-09 mid-run, and R17-14 gained `web/public/fonts/` (a font's `src` must be https with CORS).
- R17-29 added (the share and claim screens showed a generic line for the API's new refusals); R17-22 gained ci.yml and the round's test list; R17-23 gained the sharing walk's flip and an archived edges test; R17-15 gained `YourPeople.tsx`.
- Orchestrator one-liners: `credits.ts`'s History rank (R17-01's new kinds), Pricing's `prices` prop, a comment the price gate refused, the archived FAQ test, two critical-tier lines, the privacy line on Stripe's role (a researcher found "its own controller" wider than Stripe's wording).
- The checkout's box sits above Stripe's fields, which open once it's ticked: POST /checkout refuses without the tick, so the fields can't load first (look B otherwise).
- A builder started the system Postgres mid-group; the brief now forbids touching the server.

## New words for the Owner's look
`docs/annex/R17-words.md`: checkout, the done page, the out-of-credit lines, "It's free.", the final line, Timeline's box and renewal line, Account's plan lines, the pair's refusals, the receipt, History, the legal pages.

## Spend
Spend: 8.7M Opus (20 Opus cards with R17-S1, the planner twice, two researchers, the sentinel), 0.93M Sonnet (10 cards, the verifier, the tester), 0 Haiku · cards 19 Opus, 9 Sonnet, 0 Haiku by planned tier, plus R17-29 (Sonnet) and R17-S1 (Opus) · escalations none · lab 0 ¢ in the round.

## Lessons
Promoted: log redaction missing a shape (R14-14, now R17's S1 and S3) → builder.md's log rule. Seen again: the caller rule (R17-15's `YourPeople.tsx`), its five rounds restart; the restart cause (R13-01, R17's lost plan revision), applied. Two new causes seen once.

## Mailbox and backlog
Done: MB-219; B-01, 02, 08, 15, 30. Built at its default: MB-225 (provisional). Raised: MB-233 (S2, private, Owner Claude). Decisions, `Decided by: Claude`: the box above Stripe's fields; Timeline's window and 40 a day; Try again's three tries. Backlog B-31 to B-39 added. Waiting on Alex: MB-225, 227 (the restricted key also needs test clocks, customers, refunds and subscriptions; the webhook's eleven events), 228, 232.
