# R14 report — Review 02/10, Chiron from JPL Horizons, typed birth fields, the edge secret

Built 2026-10-02 on `claude/ecstatic-noether-9n2lyc`, the session's assigned branch, standing in for `round/R14` (same base, one PR),
from `docs/rounds/R14-plan.md` (`review-02-10`, ADR-218 to 226; the lock reached the branch from `claude/fervent-newton-ajphr9`).
Fourteen planned cards in groups 0, A and B; R14-C1 not called (Round start 5 clean); one fix card from the tester and one from the
sentinel; every group ended green.

## Open Mailbox rows created more than 14 days ago (ADR-186)
2026-09-09: MB-12, 19, 20, 21, 22, 30. MB-49 (2026-09-18) passed 14 days during the round. None blocked a card.

## Shipped
- **R14-01** web's 21 browser libraries are dependencies, so `pnpm audit --prod` reads them; `minimumReleaseAgeExclude: []`; `@vercel/functions` 3.9.9 and the 18 packages it brings (named in the plan's Risk 4) — INTERNAL.
- **R14-02** Chiron from a committed NASA JPL Horizons table, every 10 days from 1800 to 2150 (12,785 nodes, 15 kB gzip), cubic, with speed and retrograde; none outside the span; the Kepler orbit gone; chart version 4; the footer and methodology read "astronomy-engine (Don Cross), Chiron from NASA JPL Horizons, …" — USER-FACING.
- **R14-03** a tie names no strongest element or mode in the brief (Audrey: "No dominant element: fire, earth and water tie at 3, so none leads.") — USER-FACING.
- **R14-04** one annotated line after the hero: the line, "Sun 13.1° Taurus, 4th house" and one action with its tick box, read from the sample run; the circle pillar gone from home and /sample — USER-FACING.
- **R14-05** "Gift them a report" and "Share reports with each other" over the circle, which matches main to the pixel at 1440 px — USER-FACING.
- **R14-06** the credit-back line gone from home and /method, two facts in two columns; "every claim" for every line or sentence; the cookie lasts a year from the last visit — USER-FACING.
- **R14-07, 12** one typed date field and one typed time field on home, /sky, the birth form and the dialog: separators as you type, focus date → time → place, order and clock from the browser's language, AM/PM only on a 12-hour clock; values unchanged; an e2e spec at 390 px — USER-FACING.
- **R14-08** the place field by keyboard (Enter and Escape keep focus, Search stays focusable, errors announced) — USER-FACING.
- **R14-09** names as written (・, the ideographic space, ZWNJ); geocode needs two letters; healthz's `edge`; codegen caught up with orval 8.37 — USER-FACING.
- **R14-10** a birth-time change holds one write per report it passes, refused before any pass; the shared count gives back by status; regenerate needs owner, the pair picker read access — INTERNAL.
- **R14-11** BalanceRail names a tie, TriadPlate shows the Moon's arc, /learn/birth-time reads the engine's window — USER-FACING.
- **R14-13** times in the reader's clock on /sample and home ("3 am" in en-US, "03:00" elsewhere); "every claim" on /sky and home's claims — USER-FACING.
- **R14-14, fix, C2** root `middleware.ts` sets `x-edge-proxy-secret` upstream; the API trusts `x-vercel-forwarded-for` only with it, compared in constant time; a secret under 32 characters counts as unset; the logs censor it by name and value; the probe asserts `edge: true` — INTERNAL.
- **Orchestrator** the orrery draws no body a chart lacks; home's part-of-day chips follow the clock; the dialog sends a whole time to Save — USER-FACING.

## Gate
install, typecheck, both builds (CSP check, 28 inline scripts on 15 pages), unit tests (api 566, web 841, scripts 89, engine 26, commerce 24,
db 19), `check:shipped` clean, `check:copies` one each, `pnpm audit --prod` clean, codegen twice with no diff, the walk 34/34 twice.
**Dry lab** against r06, free: 60 natal and the curie-winfrey pair prompts, every schema ok; **injection clean: 63 prompts.** Brief lines:
Audrey Hepburn "Chiron 10.0 Taurus, 4th house" (was 7° Capricorn, 12th; her Taurus stellium now counts it) and the tie line above;
Marie Curie "Chiron 22.3 Pisces, 3rd house, retrograde" (was Cancer). **Round start 5:** the inject-instruction natal run on staging
(about 4 ¢) used the name as a name and obeyed nothing, so R14-C1 stayed out.
**Tester:** 145 tests after group A, no bug; 14 after group B, one bug (the secret printed in deeper log shapes) → the R14-14 fix.
**Sentinel:** BLOCKED 1 (S1, 17 unnamed packages) → named in the plan; S2 (short secret) and S3 (middleware unscanned) → R14-C2 → re-read **CLEAR**.

## Deviations
- The branch is the session's assigned one, not `round/R14`. Group C took one card; the R14-14 fix came from the tester.
- R14-13 also took /sky's and home's "every line" (found by R14-06). R14-12 added an optional `describedBy` to both fields.
- Accessible only after the merge: `edge: true` through Vercel (MB-167), and a real-device pass on the birth form and dialog (QA-02).

## New words for the Owner's look
The section after the hero's three notes; the two circle rows; "every claim" on home, /sky, /faq and /method; "It lasts a year from
your last visit."; the footer's ephemeris line; date and time placeholders, the readout "4 May 1929" and nine field errors ("There's no
31 April. Check the day."); "Morning, 06:00 to 12:00" on a 24-hour clock; BalanceRail's "Fire, Earth and Water".

## Spend
Spend: 2.24M Opus, 0.79M Sonnet, 0 Haiku (subagent tokens: builders, testers, sentinel; the planner before the round not counted) ·
cards 7 Opus, 7 Sonnet, 0 Haiku by planned tier, plus 2 fix cards on Opus and 3 by the orchestrator · escalations none · lab about 4 ¢.

## Lessons
Promoted into `builder.md`: grep every caller before changing a shared export, pin or return shape (R13-12, R14-02, R14-13). Seen once:
redaction by key depth, unnamed transitive packages, "next control" read as DOM order.

## Mailbox
Built at their defaults (done, seams tagged): MB-124, 126, 150, 157 to 160, 163, 165, 166; MB-161 waits for the staging run; MB-91's two
seams and MB-93's band seam gone. Raised: MB-167's check, the secret's length in the three dashboards, regenerate after Stop sharing,
more reports than an hour's writes, the triad plate's Sun near the Moon, unused `ui/` files and 34 dev-only libraries, "0300p" on a
12-hour clock, the middleware without `@vercel/functions`, R14's words.
