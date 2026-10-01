# R12 report — Review 01/10, and production's writers on Sol and Luna

Built 2026-10-01 on `claude/confident-archimedes-lfnc4w` (the session's branch, in place of `round/R12`) from `docs/rounds/R12-plan.md`
(`review-01-10`, ADR-168 to 183; ADR-184 to 186 recorded with the plan). Twenty-five cards in four groups, plus R12-26, added after group C;
every group ended green. The Owner approved with "go" and left MB-93, 128 and 129 at their defaults.

## Open Mailbox rows created more than 14 days ago (ADR-186)
2026-09-09: MB-12, 19, 20, 21, 22, 23, 30. None blocked a card.

## Shipped
- **R12-01** production writes on mix B: foundations on gpt-6-sol, every other prose call on gpt-6-luna, the QA agent and the vocabulary job on Sol, gpt-5.2 the lab's control. On the r06 usage: 27.4 ¢ a report becomes 3.0 ¢ — USER-FACING.
- **R12-02** the voice: rule 13, two friends over coffee, neither too fancy nor too trendy, in every natal and pair prompt and both foundations; `chk-39` counts both lists and only logs; v8 — USER-FACING.
- **R12-12** the pair prompts at p3: one fixed scene a chapter, "This is the challenge:", "room" only for a real room, no pointer, a child under 3 written as 3 — USER-FACING.
- **R12-03 / 13** the contract: `GET /home`, pin keys, `pin_limit`; the on-tap scene route and `MODELS.scenes` gone — INTERNAL. **R12-04** `GET /home` and pins on the server; a pair's Next time tick saves again (it answered 400) — USER-FACING.
- **R12-05 / 17** Couple at €54 with a launch price against the Singles total, the mixes, "1 credit = 1 report of either kind." on every price and balance — USER-FACING.
- **R12-06** the place field on its own row; Košice reads as a city; one zone call per chosen place — USER-FACING.
- **R12-07** one Sun render; a thinner disc behind it on the horizon wheel; the share preview says "Every reference checked" — USER-FACING.
- **R12-08** one tick-box component everywhere; Practice and Next time items pin, three a report — USER-FACING.
- **R12-09 / 10** the reference check drawn as the report draws it, on home and /method; /compatibility in three steps, its questions on /faq — USER-FACING.
- **R12-11 / 25** "Personal report", "Your circle" and "Share with" everywhere, emails included; a names gate test keeps retired names out — USER-FACING.
- **R12-14** "Where your charts meet", Comes naturally and Challenge, one scene per chapter, no chips or intro — USER-FACING.
- **R12-15** chapter 02, House by House: the wheel pinned over a swipe deck of houses on a phone, a stepped card on desktop — USER-FACING.
- **R12-16** the pair's story at 9:16 with Share story and Save — USER-FACING. **R12-18** the two differences after the home hero — USER-FACING.
- **R12-19** the Lab page defaults a spot to production's writers — INTERNAL. **R12-20** /sample at four of ten chapters, ending on the differences — USER-FACING.
- **R12-21 to 24** the dashboard as a home: the circle and its quick look, People and Compatibility rows, Stop sharing naming its four consequences, what you're practising, your pairs, your stories, one `GET /home` — USER-FACING.
- **R12-27** after the merge: staging's first fixture runs on mix B put semicolons in 5 of 60 natal sections and most pair chapters (5.2: almost none), a new fault the release gate refuses. Rule 8 now says it plainly, a self-check ends every prompt, and the prompts stop using semicolons themselves (MB-129's default) — USER-FACING.
- **R12-28** after the second fixture runs: a Compatibility report's prose loses leaked brief labels ("(A/family claim 3; …)", 3 of 7 reports), word-count notes and leftover semicolons before its claims are checked; claims follow the repair (chk-40 to 42) — USER-FACING.
- **R12-26** a failed Personal report keeps its row and says "Could not be written." (R12-04 had dropped it); the summary leaves it out — USER-FACING.

## Gate
install, typecheck, both builds (13 pages prerendered), unit tests (web 570, api 360, scripts 17, commerce 24, engine 8, db 9), codegen twice with no
diff (R12-03, 13), the walk 29 of 29 on a scratch Postgres 16. No schema change. **Dry lab** against r06, free: 60 natal and 27 pair prompts (three
lenses), every schema ok. Against `main`: each natal section +139 tokens (rule 13), the foundation +164; pair chapters +245 to +260, `twoCharts` +233,
the pair foundation +164 to +188. Four bands rendered from a scratch script (99 prompts, a ten-month-old written as 3). chk-39 on the stored r06
runs, before the rule: five hits in seven runs, three of them "cardinal energy" fed by `overview.ts` and `vocabulary.ts` (Risk 5).

## Deviations
- The mock won over the plan: `Spot.house` added so the quick look prints "0.29° Virgo · 4th (home)"; the rows say "Shared · waiting for {name}".
- The plan won over the mock: no signs on the circle (§9); one Closing item as the default practice; the challenge is the ledger's first work line.
- /compatibility's old "What it covers" section merged into step 03, which showed the chips and plates twice; /sky's open place list sits above the wheel.
- R12-07 first thinned the sign ring; fixed to the disc behind the Sun. R12-19 first reset a writer picked by hand; fixed.
- The differences show Mira and Tomás (partners) with their scenes, since parent and child has no fixed scenes and MB-93 stayed at its default.
- /sample's Updated date stays 2026-09-21 (MB-101 pins it to the run). The tab title and saved PDF still say "Natal Report" (the logo spec pins them).
- Not verified here: Nominatim and timeapi.io are blocked from the session; the Košice list and the zone line are read on staging.

## New words for the Owner's look
The dashboard's summary, tabs, hints, start panel and nudges; the quick look's headings and buttons; the rows, Stop sharing and Share dialogs;
"Pin to What you're practising" and the limit line; the story's buttons and line; "Where your charts meet" and its card titles; House by House's
counter and steps; /sample's dimmed rows; the differences' copy; /compatibility's steps and three FAQ answers; the place list's lines; the emails'
"shared your report with you"; Terms and Privacy say share. Each is listed in the Mailbox row for R12's words.

## Mailbox
Done: MB-64 (no on-tap scenes), MB-100 (Share with). Notes: MB-93, 103, 110, 113, 128, 129, 130. Raised: signs on the circle; the room rule for
Personal reports; the release estimate at 5.2's prices; home's first claim no longer on /sample; Stop sharing's "your" for a Not-me report; the
retired credit-loop nudges; Try again from the dashboard; the tab title; the quick look's degree for an approximate birth time; R12's words.
