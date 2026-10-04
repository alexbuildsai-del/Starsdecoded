# R16 report — Timeline: its product page, simple words everywhere, and Timeline itself for its one subscriber

Built 2026-10-04 on `round/R16` from `docs/rounds/R16-plan.md` (locks `timeline`, `timeline-page`, the simple-words audit; ADR-205 to 264).
34 planned cards in groups A to E (27 Opus, 7 Sonnet) plus four fix cards (R16-A1, B1, B2, D1); every group ended green, its tester run.

## Open Mailbox rows created more than 14 days ago (ADR-186)
2026-09-09: MB-12, 19, 20, 21, 22. 2026-09-18: MB-49. None blocked a card; MB-22's port chat tables stay untouched (Ask has its own).

## Shipped
- **R16-01 to 04** the sky engine: `transits.ts`, `doctrine.ts` and `tone.ts` (MB-188 provisional), `cycles.ts`, `plainWords.ts` (about 100 headlines) — USER-FACING · brain.
- **R16-05 to 07, 14 to 17, B1** `/timeline`: the dial with Play on Mira's chart, five things on her week, the Saturn-return finder (a 3.6 kB chunk, nothing sent), Coming soon, the questions with their own FAQ markup; the home line after Prices, the footer link, the four sentences; each Release moves Mira's week on `sample/<id>` — USER-FACING.
- **R16-08 to 13, A1** simple words: every approved audit line, chapter 8 "Strengths, Habits & Where You Can Grow", the lenses, "Does this sound like you?"; the writer's rule in every natal and pair prompt, the vocabulary in everyday words, chk-43 that only logs; v11, p6 — USER-FACING · brain.
- **R16-30 to 33** the Account page (`/dashboard/account`), the dashboard teaser for every reader with their own Personal report, one triad row everywhere with the ruler on the 1st house card, At a glance under your name — USER-FACING.
- **R16-18 to 29, B2, D1** for the admin only: one access check, the tables, the contract, readings (chk-44 to 48 block a made-up date, a foretold life event, a do or don't), Ask (tools that re-check access, 50 a month, 31 days), Now and ahead, Life, Ask's panel, Your week, the routes and limits, Timeline's own pause line — INTERNAL.
- **R16-26, 34** the dry lab renders Timeline and Ask; the walk on a scratch Postgres — INTERNAL.

## Gate
install, typecheck, both builds (CSP: 31 inline scripts on 16 pages), unit tests (api 1101, web 1447, engine 187, scripts 108, db 49,
commerce 24; api 1186 against a scratch Postgres), `check:shipped` clean, `check:copies` one each, `pnpm audit --prod` clean, codegen
twice with no diff, `db:bootstrap` main's tree then this branch twice, and an empty database twice, all clean. **Walks:** "34/34 rules
passed", "sharing walk: 14/14", "timeline walk: 10/10 rules passed; 7 stubbed model calls." **Dry lab** against r06, free: 60 natal
prompts and three pair lenses, schemas ok; "timeline dry render: 56 prompts for 7 charts … 8698 to 9139 tokens"; "ask dry render: 42
prompts for 7 readers"; **injection clean: 105 prompts.** Every prompt carries the rule (+175 tokens). chk-43's base over r06: 2017
sentences, 565 with two ideas (28%), 105 with a metaphor (5.2%); the staging campaign after the merge should bring both down.
**Testers:** A, 217 tests, 2 bugs (an eclipse outside a range holding its minute; 30 Feb read as a Monday); B, 3 (orders after a clause,
foretold life events, age rounded up) → R16-B2; C, 1 (an unreadable kept reading spinning) → fixed; D, none.
**Sentinel: CLEAR.** S1 (any event's key from birth to 120 years opens a paid write; 20 a minute could reach the daily cap) and S2 (Ask's
stored answers outlive Stop sharing) are not blocking while the admin is the one subscriber → Mailbox, to close before MB-197.

## Deviations
- Four fix cards added from builders' and testers' reports; group B's re-pins added `spans`, the reader's age and birth to the contract.
- Acceptance "to the hour against Horizons" holds for the pinned hits and Jupiter and Saturn; astronomy-engine's Uranus, Pluto and Neptune drift up to 7 hours (tests bound at 75 and 480 minutes) → Mailbox.
- Mira's week is computed by the API at a Release and committed as data (Vite runs no engine at build); an engine change re-pins it with `MIRA_WEEK=write`.
- `/dashboard/timeline` and `/dashboard/account` need sign-in first; Ask loads lazily on reports and the dashboard; Ask says it's an AI under the box.
- CI's gitleaks read Timeline's event keys ("cycle.saturn-return.20210118") as credentials, as R13's report item keys were (ADR-200): `.gitleaks.toml` gains one allowlist for exactly that shape; a key-shaped secret still fails.
- R16-33 also edited `HouseDeck.tsx` (the ruler's prop); R16-13 moved `web/src/types/chart.ts` (v11, p6 renderable).

## New words for the Owner's look (Mailbox row)
The ~100 headlines and cycle words; Mira's sample words; the page's plan, steps, rules and six questions; Ask's harm, off-topic,
fallback, cap and AI lines; the Account page; the teaser; the Timeline pause and limit lines; every audit line before and after (in the
builders' reports). To confirm: "The midlife shake-up" (locked, dramatic?), "waxing gibbous", the harm reply with no helpline, the triad
row's point sign-first and range degrees-first, the facts line in grey #7E889A, "Read your 1st house again ›" as text.

## Spend
Spend: 12.0M Opus (31 builder and fix cards, the round-start re-read, the sentinel), 1.8M Sonnet (7 cards, four testers), 0 Haiku · cards 27 Opus, 7 Sonnet, 0 Haiku by planned tier, 4 fix cards on Opus · escalations none · lab 0 ¢ in the round (staging campaign after the merge).

## Lessons
Eight causes seen once (`lessons.md`). The promoted caller rule was seen again (R16-20's `tz` moved `useGetHome`'s arguments under four callers), so its five rounds start again; no new rule promoted.

## Mailbox
Built at their defaults, seams tagged: MB-188, 190, 191, 197. Open: MB-189, 198, 192 parked. Raised: MB-215 to MB-222.
