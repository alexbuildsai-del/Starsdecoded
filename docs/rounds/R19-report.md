# R19 report — explain like a friend, sharing and the circle, /qa's own account, the bar that waits for Start reading

Built 2026-10-08 to 09 on `round/R19` from `docs/rounds/R19-plan.md` (approved 2026-10-08). 48 planned cards in three groups (30 Opus,
18 Sonnet), plus R19-49 and R19-50 (Opus) and one Sonnet card of group 3 gate fixes. Each group ended green and was pushed once.

**Open Mailbox rows created more than 14 days ago (ADR-186):** 2026-09-09: MB-12 (no error reporting). No card waited on it.

## Shipped
- **R19-01 to 03, 09 to 14** the Personal report under the new rule: name it, say it plain, show it in a day, give its reason; a crisp line first in the vocabulary, scenes per body, sign and house, two model passages per chapter (never on the chapter's own topic), plain-words checks; v12 — USER-FACING.
- **R19-04, 43, 49** the engine: comfort (home, least at ease), Mercury's shadow, the houses a contact crosses and its passes, stelliums and the chart's patterns; a banded Sun or Moon sits in the house of the sign it is given (`CHART_VERSION` 5) — USER-FACING.
- **R19-05, 18, 48** the R line made true per planet, Did you know without a birth time; four things to know before House by House; the house card's going-backwards, stellium and balance blocks, Often noticed, no "Opposite:" — USER-FACING.
- **R19-15, 16, 17, 40** Compatibility (p7), Timeline (t2, by the houses a planet moves through and its passes) and Ask under the same rule; Ask offers a pair report with the reader's credits — USER-FACING.
- **R19-20 to 22** a Did you know card in seven chapters and in Timeline (Mercury's shadow); v12 and p7 read on the web — USER-FACING.
- **R19-06, 07, 08** MB-234, MB-214 (private, fixed as their rows say); a claim with two "You" charts; the pair story's rough birth time (MB-235 provisional) — USER-FACING, INTERNAL.
- **R19-23 to 26, 30, 31, 36, 38** sharing and the circle: who can read what on GET /home, Cancel invite and Copy their link, MB-212 (private), the Share window, a share question on each side of a gift, the violet ring, Share from the rows — USER-FACING.
- **R19-24, 29, 34, 35, 37** Your first steps, Make a report, the picker as a pop-up, pins named by chapter, the first visit with three bundles, `?visitor=new` and the Account preview, "These are your own birth details" — USER-FACING.
- **R19-27, 32, 33, 39, 45** Timeline: the week's sentence and headlines, the card's year, Heavy · Mixed · Light, Your week as one picture, Life's drag and Your cycles, Read more with passes — USER-FACING.
- **R19-42, 46, 47** the film on /method; one progress bar on both loading screens, the report waits for the tap; the hero's horizon level at its cause (and the small sky plates) — USER-FACING.
- **R19-44** Observations: ideas with two sources, their table, the Notion inbox and `/observe` — USER-FACING (the house cards), INTERNAL.
- **R19-19, 28, 41, 50** the lab's plain-words measures; /qa's own staging account with a 6-a-day cap; the buyer walk's share questions, picker and tap (22 steps); a test's schema race fixed — INTERNAL.

## Gate
install, typecheck, both builds, the critical tier on a scratch Postgres (api 621, web 212, commerce 27, engine 21, db 20, scripts 12),
"buyer walk: 22/22 steps passed", the sharing walk 15/15, `check:shipped` clean, `pnpm audit --prod` clean, codegen with no diff,
`db:bootstrap` twice on an empty database clean, `csp:write` (one hash, committed), gitleaks 8.30.1 over `main...round/R19` clean.
**Dry lab** against r06, free: "69 prompts", schemas ok; "timeline dry render: 78 prompts for 7 charts"; "ask dry render: 42 prompts
for 7 readers; 11282 to 12896 tokens"; curie-winfrey's pair sections ok; **"injection clean: 115 prompts"**. `--compare` re-reads r06's
stored prose only: grade 7.8 to 8.4, longest sentence 37 to 42 words, the "before" for the next Release's lab. **Study check:** no
five-word run of the voice study's quoted lines in the diff. **Three greps** clean (one `houses.ts`, no "moment"/"things" for a transit,
no "Opposite:" or R line on a card). **Tester:** no bug; four critical tests (first visit, the bar and tap, Ask's offer, Did you know)
and the walk's Did you know check. **Sentinel:** CLEAR; S1 (the QA cap forgets in-place rewrites on a restart) is B-85.

## Deviations
- R19-49 added after R19-11 found a banded Sun or Moon in another sign's house; R19-50 after the critical tier failed 4 setup tests in the full run.
- Web sources the plan cited could not all be fetched from here; the claims rest on the verified ones (Decisions row).
- R19-01 copied the house covers; the orchestrator moved them into `@workspace/engine` (one source, `houseCovers.ts`).
- Orchestrator gate fixes, each in a commit: the passage picker, the stellium fact, the empty home's first steps in three walks, the
  sharing walk's 404, render pins v12 and p7, `degreeIn`, the Did you know card kept out of Ask's quote and the prose counts, Mind's
  party, the Closing's fact slot, CSP; R19-47 sent back twice (option A, then a size step where a body sat under the name).
- R19-40 also edited `prompts/ask/answer.ts` (the second ask dropped); `AskMessage.offer` stays optional (no second codegen).

## Decided by me
`CHART_VERSION` 5 (one rewrite of staging's Timeline readings); a degree outside its stated sign is not printed; a passage never on
its chapter's topic; the stellium fact counts points; idea 4 "one or two home signs"; the hero name stands above the line only when no
body sits under it, else steps down; every QA write counts toward 6 a day; first steps only after an own finished report; no Ask offer
while a pair is pending; the Did you know card is read by the lab's word checks but not its counts.

## Needs you
Your look on staging: `docs/annex/R19-words.md`, a new Personal report (primer, an empty house, a planet going backwards, a Did you
know card, the 9th house's stellium), your Pluto card's years, `?visitor=new`. MB-227: paste `QA_ACCOUNT_EMAIL` on Railway staging.
MB-235's two calls ship at their defaults, provisional.

## Spend
Spend: 8.15M Opus (32 Opus cards with follow-ups, six researchers, the sentinel, the close's docs), 3.52M Sonnet (18 cards, the gate-fix card, four
extractors, the verifier, the tester, the words list), 0 Haiku · cards 30 Opus, 18 Sonnet, 0 Haiku by planned tier,
plus R19-49 and R19-50 (Opus) · escalations none · lab 0 ¢.

**Lessons.** The caller rule seen again (R19-20, 23, 29, 30): its five rounds restart. Seen once: a test's schema race, builders'
leftover dev servers, a layout fix measuring only its own overlap. Retired: the R13 tester base and R14 pushes lines (fixes kept).
**Mailbox and backlog.** Raised: none new. Backlog done: B-07, 32, 33, 50 to 52, 57, 62 to 64, 67, 73, 74, 76, B-03's dry-lab part; added B-85 to 96.
