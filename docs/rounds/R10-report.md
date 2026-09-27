# R10 report — the dashboard sky and the credit loop: the orbit, its card, Send and Gift, one balance

Built 2026-09-26 on `claude/next-round-locked-specs-lt28vs` (the session's branch, in place of `round/R10`) from `docs/rounds/R10-plan.md` (`dashboard-sky`,
`credit-loop`; ADR-89 to 96, 120 to 140). Twenty-five cards, one commit each: group A (01–05), B (06–20), C (21–24), and R10-25 from the orchestrator.
The brain is untouched: no report's words change.

## Mailbox rows open more than two rounds
At 9: MB-5, 6, 11, 12, 13, 15, 17, 19, 20, 21, 22, 23, 24, 25, 30 · at 8: MB-31 (blocking), 33, 35 · at 6: MB-43, 47, 49, 50 · at 5: MB-55, 57, 58, 59 ·
at 4: MB-64, 65, 66, 67 · at 3: MB-70, 73, 74, 75. None blocked a card. **MB-75** stays the release todo; MB-105 (blocking) comes before the waitlist reaches production.

## Shipped
- **R10-01** `claimed_as_self`; `invite_tokens` gains `kind`, a nullable `profile_id`, `credit_id`, `recipient_name`, `note`, `reminded_at`, `revoked_at`; `is_test` on
  bundles and credits; the `held` status; bootstrap step 3j, idempotent — INTERNAL.
- **R10-02** the contract: `Access`, `SendState`, `Gift`, `CreditHistoryItem`, nine operations; every addition optional so the groups stayed green — INTERNAL.
- **R10-03** the card's rules (the element lead, modalities, twelve houses, the busiest named), the pair row's eight states, `StatusDots` — INTERNAL.
- **R10-04** who is on the orbit and where: the people the reader wrote, waiting gifts, one Add point; the ring cut around each (ADR-112, 139) — INTERNAL.
- **R10-05** the Terms' "Who sees what": the consent rule, Send, a pair reaching its other person, a gift as a credit — USER-FACING.
- **R10-06** a claimer reads and lists the report sent to them (MB-84); Send only on a complete report; closed pairs; a revoked link grants nothing — USER-FACING.
- **R10-07** Send to {name} for a person and a pair, a pair's Stop sharing, the claims; a gift's claim moves its credit and links no one — USER-FACING.
- **R10-08** This is me, Not me, Stop sharing (the report moves to its subject at once); the gift and checkout routes mounted — USER-FACING.
- **R10-09** four emails in the giver's name, none saying "made"; the pair email names the right person (MB-85); the gift cover image — USER-FACING.
- **R10-10** the ledger holds, moves and returns a gift's credit; test bundles; History, where a report gone from you reads "A report you no longer have" — USER-FACING.
- **R10-11** Gift a report: a 30-day hold, one reminder a day, Take it back, nothing shown past the claim (ADR-139) — USER-FACING.
- **R10-12** the orbit: you at the centre, a dotted ring cut around each person, a drift that holds on a tap and stays still under reduced motion — USER-FACING.
- **R10-13** the sky card: plate and legend, elements with the lead, twelve houses with their words, then rows, nudge, send line and one door — USER-FACING.
- **R10-14** compatibility rows, a closed pair's "No longer shared", the picker entered with both people and never navigating (ADR-131) — USER-FACING.
- **R10-15** the credit pill; the sheet with dots, History and "Credits are free while we test" (the test checkout); the path after 3 or more — USER-FACING.
- **R10-16** one Send dialog for a person and a pair, "Sent · waiting", "Joined ✓", the share block's "Share it with {B}." (MB-100) — USER-FACING.
- **R10-17** Add someone's three choices, the gift in four steps with its cover, the waiting gift to remind or take back — USER-FACING.
- **R10-18** the claim: a sent report opens as its subject's, a gift lands as a credit; the birth form's button carries no price — USER-FACING.
- **R10-19** one nudge at a time, above the control it names; after a gift's claim, a nudge towards the recipient's own chart — USER-FACING.
- **R10-20** `POST /checkout/test`: 1, 3 or 5 free test credits for any signed-in user, 403 on production (ADR-138) — INTERNAL.
- **R10-21** the dashboard: the pill and Add someone in the nav, orbit and panel on desktop, a bottom sheet on a phone, Your People and Compatibility below, the
  empty states; the old zones, `InviteModal` and `ProfileInviteHistory` gone; the glyph gate — USER-FACING.
- **R10-22** the walk: 23 access and ledger rules end to end on a scratch Postgres, no Clerk and no network (MB-49 provisional) — INTERNAL.
- **R10-23** a pair's summary and scenes follow `pairReadable`, so a closed pair stays closed (ADR-139) — USER-FACING.
- **R10-24** a gift's link to copy when its email did not go, as Send has — USER-FACING.
- **R10-25** Delete reads Remove when the report goes to its subject instead (R10-06's hand-over) — USER-FACING.

## Deviations
- The Owner's answers reshaped the plan before any card: ADR-138 turned the admin grant into the test checkout, ADR-139 made a gift a credit and took givers
  off the orbit. The two lock branches were merged at the start on the Owner's go; `main`'s waitlist (#70) was merged before the gate.
- The orchestrator added R10-23 (a gap R10-06 found), R10-24 (so the staging gift walk does not wait on Resend's domain step) and R10-25 (the delete copy),
  and moved deleting `InviteModal` and `ProfileInviteHistory` from R10-16 to R10-21, since only the dashboard imported them.
- A usage limit stopped four builders mid-card (R10-08, 12, 15, 17); each resumed where it stopped.
- The phone sheet is framer-motion, not vaul, whose drawer blocks the page even when modeless. The picker's selects pushed a phone page to 586 px; R10-21
  holds them from the page (`[&_select]:w-full`), and the proper fix belongs in `CompatibilityPicker.tsx`.
- Copy no spec gave is listed in MB-111 and the builders' reports, each line checked against `/ux-copy`: the gift nudge, History, Stop sharing, load and error lines.

## Gate
Green on the merged tree: `pnpm install --frozen-lockfile` · typecheck · `build:web` · `build:api` · tests (web 254, api 287, db 9, scripts 8; R09 closed at
130/239/9/8) · codegen twice, no diff · `db:bootstrap` three times on a fresh scratch Postgres 16 with a dummy `OPENAI_API_KEY` (MB-80): the push applied once,
then no changes, steps 3i (waitlist) and 3j clean each run · the walk 23/23, twice by R10-22 and once on the merged tree (9 stub emails; Clerk's absent key is
logged and names fall back) · the brain paths show no diff against `main`, so no dry lab. **Nothing generated; no paid call.**

## Mailbox
Done: MB-81 to 86. Decided before the round: MB-97 to 99 (ADR-138 to 140). Open at their defaults, seams tagged: MB-6 (the soft pass, the test checkout), MB-100
(`ShareCard.tsx`), MB-103 (pairs, Not me), MB-49 (the walk). Unbuilt: MB-104 (sharing your own chart). Raised: MB-109 Send again, MB-110 per-reader workbook
ticks, MB-111 R10's small calls for the Owner's look.
