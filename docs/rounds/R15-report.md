# R15 report — the cleanup round: zones from the server, sharing your own report, one brain pass, the launch fixes

Built 2026-10-03 on `round/R15` from `docs/rounds/R15-plan.md` (four locks: `mailbox-sweep-03-10`, `release-one-findings`,
`home-report-section`, `share-cover`; ADR-227 to 248). 29 planned cards in groups 0, A, B and C, all on Opus after R15-00 (the
Owner's word), plus four added cards (R15-04b, R15-26b, R15-A-fix, R15-B-fix) and two fixes; every group ended green. C1 not called yet.

## Open Mailbox rows created more than 14 days ago (ADR-186)
2026-09-09: MB-12, 19, 20, 21, 22. 2026-09-18: MB-49. MB-30 (2026-09-09) built here. None blocked a card.

## Shipped
- **R15-00** the four locks merged, ADR-233's QA method in `qa.md` · **R15-01** geo-tz 8.1.9 and its 28 packages (all over 7 days, no install script); 43 unused `ui/` files and 30 dev libraries out — INTERNAL.
- **R15-16, 17** places and zones from `/api/geocode` (`geo-tz/all`), a place at sea refused ("Pick a nearby town."), the card's offset the birth date's; the browser reaches neither Nominatim nor timeapi.io; `/geocode` open before launch and set no cookie — USER-FACING.
- **R15-18 to 22, 24 to 26** share your own Personal report (email and claim), Share yours back, Stop sharing at once, the sharer seated as shared, Not me hands it back, Handed back and Send again, Change address, ticks per reader, Try again and Regenerate where `mayRegenerate`, the Moon's range, a birth-time change passing the newest report — USER-FACING.
- **R15-04, 04b, 23** names masked in model text sent back and in the pair brief; floors (overview 400, mind 250, superpowers 600 with 130-150-word items, pair lens chapters 230), the room rule, the model sentence, the house words; v10 and p5 — USER-FACING · brain.
- **R15-05 to 10, 27** wheel focus and a skip link; one clock; Chiron's source on /method; the Elements line gone; "4 May 1929" pastes; AM/PM waits; pages work with Clerk blocked; the waitlist error; bundle lines; Personal Report in the tab; the old nudges gone; the triad Sun kept; the report page's versions — USER-FACING.
- **R15-14, 15** the share cover v2 (cover A, 3 Oct 2026 08:50 over London, 97 KB) and two workbook cards after the hero and on /sample — USER-FACING.
- **R15-02, 03, 11, 12, 13, 28** the contract; `profile_shares`, `report_workbooks`, `handed_back_at`, bootstrap step 2 failing on an error (MB-123); this team's previews only; the release estimate from the catalogue (25 ¢) and /sample pushed on `sample/<id>`; the smoke's share-preview step; the walks — INTERNAL.

## Gate
install, typecheck, both builds (CSP check: 28 inline scripts on 15 pages; connect-src drops Nominatim and timeapi.io), unit tests (api 759,
web 988, scripts 94, db 40, engine 26, commerce 24), `check:shipped` clean, `check:copies` one each, `pnpm audit --prod` clean, codegen
twice with no diff, `db:bootstrap` twice on an empty Postgres and main's then this branch's twice (both tables in). **Walks** twice:
"34/34 rules passed; 12 stub emails sent." and "sharing walk: 13/13 rules passed; 10 stub emails sent." (main: 27/34, 0/13).
**Dry lab** against r06, free: 60 natal prompts and curie-winfrey under three lenses, schemas ok; inject-instruction-curie (people) ok;
**injection clean: 63 prompts.** Natal prompts run 400 to 670 tokens shorter (the vocabulary introduced as doctrine).
**Floors** from the stored runs (r14-staging, r12c/d-pair): under band on every run were overview, mind, superpowers, twoCharts,
whatToPractise and the lens chapters (32/35); twoCharts and whatToPractise cannot meet their bands as shaped (Mailbox).
**Smoke on production** (keyless): `/` answers WhatsApp/2.24 A and facebookexternalhit/1.1 with og:title and og:image; the image comes
back whole (200, image/jpeg, 61,604 bytes). Nothing blocks the crawlers from GitHub's network; WhatsApp's blank preview was most likely a
cached failure from before the domain was live, which the new file name passes. The Owner's share after the next Release is the test.
**Tester:** group A, about 60 tests, one bug (a name opening a JSON paragraph escaped masking) → the R15-04 fix; group B, no bug.
**Sentinel:** BLOCKED 1 (S1: a writer could re-mark a claimed chart as their own and share its subject's report) → R15-D1, with S3 (a claim racing Change address) and S6 (a duplicated value in the deploy log) → re-read **CLEAR** (S1, S3, S6 closed; S7, a pre-existing write path for the same mark with no effect today → MB-214). S2 (another team's look-alike preview, Lax the real guard) → MB-207; S4 (Nominatim's 1 a second) → MB-202; S5 (database TLS unverified) → MB-213.

## Deviations
- The Owner put every card on Opus after R15-00. Cards R15-04b, 26b, A-fix and B-fix were added from builders' reports; R15-03 and 04 each took a fix.
- `/geocode` opened in the prelaunch gate (production's /sky searches through it now) and mounted ahead of the session (no cookie on public pages).
- R15-23's commit 3ae949b swept in R15-24's staged files; R15-24 committed its final versions after. History not rewritten.
- R15-11 edited `csp.test.ts` and `.env.example`, R15-08 `/sign-up`, R15-17 `sky.ts`, outside their files; all kept. The marketing kit renders again.
- The release estimate is 25 ¢, not the plan's 35 ¢; /sample keeps its run's date until the refresh.

## New words for the Owner's look
The share sheet, email and toast; Share yours back's consent line; the hand-back dialog; Handed back and Send again; Change address;
the third-person Stop sharing; "The birth time was updated after this report was written."; "Sign-in couldn't load. A content blocker
may be stopping it."; "We couldn't read that as a date…"; the privacy page's place line; the house lines ("The 12th is solitude: …").
Choices to confirm: the brass Behaviour check label; no pair Send on a shared chart; a hand-back after a hand-over returns the report to
its writer; "It's free." on the outdated line; typing "pm" in full lands the "m" in the place field.

## Spend
Spend: about 10.7M Opus (35 builders and fix cards, two testers, the researcher, the sentinel; R15-D1's and the re-read's counts were lost to a container restart), 0.09M Sonnet (R15-00, the verifier), 0 Haiku · cards 20 Opus, 9 Sonnet, 0 Haiku by planned tier, 28 run on Opus by the Owner's word · escalations none · lab 0 ¢ in the round (staging spots after the merge).

## Lessons
Five causes seen once (`lessons.md`): a name pattern on raw JSON text, a commit without a pathspec, a public page pointed at a gated route, an account address in a list of grants, a sentinel stopped by the usage limit. None seen twice, so no rule promoted; the promoted caller rule held (every builder named its outside callers).

## Mailbox
Done: MB-30, 103, 104, 109, 110, 123, 133, 135 to 140, 152, 154, 162, 169 to 173, 177 to 181, 183 to 185, 194, 196. Built, seams kept until a Decisions row: MB-87, 92, 132, 142, 143. Open: MB-182 (at the refresh), 195, 186, 120. Raised: MB-199 (R15's words and choices) to MB-214.
