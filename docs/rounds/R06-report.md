# R06 report — the report on a phone, and the compatibility report as a workbook

Built 2026-09-21 on `round/R06` from `docs/rounds/R06-plan.md` (`review-20-09.md` ADR-59 to 62, `compatibility-report-p2.md`
ADR-63 to 71, ADR-72 the Owner's on-tap decision). 24 cards shipped, one commit each; 109 files, +8,048 / −1,109.

## Mailbox rows open more than two rounds
MB-5, 6, 8, 11, 12, 13, 15, 17, 19, 20, 21, 22, 23, 24, 25, 30 at 5 · MB-31 (blocking, the legal entity), 33, 35 at 4. None blocked a card.

## Shipped
- **R06-01** contract, schema, lens remap — INTERNAL. p2 shapes, `meta.band`/`label`, `scenes`, `POST /compatibility/{id}/scenes`; `relationships.type` defaults to `people`, `family` remaps idempotently; the status route lists the lens's eight sections.
- **R06-02** pair shapes and validators — USER-FACING. `PairPassageSchema` gone; chapter 01 and the lens chapter as pinned; evidence in prose, card lines, scene names, whys, band lines and out-of-allocation cross claims all rejected, each with a test.
- **R06-03** per-chapter brief and the band — USER-FACING. Common head first, chapter tail (owned links, drawn sections' claims, scenes with the chosen one, band); band from the child's birth date; chapter 07 runs after the five to collect their items.
- **R06-04** claims-only retry — USER-FACING (MB-62). A quote-only failure rewrites the claims against the prose once before any prose retry; validator softening equals the page's.
- **R06-05** blind bands — USER-FACING (MB-60). Blind bands sum 2,740–3,460; plus the pass's 960–1,780 inside 3,500–5,500; drawn bands untouched.
- **R06-06** the pass keeps its claims — USER-FACING (MB-61). Blind placement claims gain the drawn house, Moon orbs refresh, one claim per sentence written; replaying the stored r05 pass: 60 claims before → 102 after (R05: 53), 51 sentences in the ledger, 0 dropped.
- **R06-07** hero on a phone — USER-FACING. Phone tier under 640 px, ring 82vw on top, name under it, legend, cue ≥ 24 px clear; pure `phoneStack` tested; staging badge to the top bar on phones.
- **R06-08** orrery on a phone — USER-FACING. Cause: seeded from a stored chart it never moved; now the settled sky turns at 1.5°/s, under Reduce Motion too; canvas resizes with its box.
- **R06-09** Closing gap · **R06-10** why on its own line · **R06-11** evidence sheet as SOURCE/EVIDENCE lines — USER-FACING.
- **R06-12/13/14** Partners, Parent and child (with the band doctrine), Two people — USER-FACING. Fifteen specs, three scenes each, grounding as doctrine.
- **R06-15** chapter 01, chapter 07, foundation, registry p2 — USER-FACING. Foundation allocates links (≤ 2 chapters each), picks scenes, writes the strengths; seventeen specs, `pairSectionIds(lens)` eight.
- **R06-16** on-tap scenes — USER-FACING (MB-64 provisional). `MODELS.scenes = "gpt-5.2"`, once per report/chapter/index, stored, served after; two refusals tested.
- **R06-17** two skies — USER-FACING. Chapters get R04's ground back; the hero owns its starfield and ring of stars, landed stars kept as angle and radius, re-projected on resize.
- **R06-18** compatibility hero — USER-FACING. Two triad plates, no ring, both birth records in the corners, `rising · not drawn` when blind; participants carry their birth record and `isSelf`.
- **R06-19** lens chapter block and chip row — USER-FACING (MB-64). **R06-20** seven-chapter page, legend, share card (MB-63), p1 unavailable and unlisted (MB-65) — USER-FACING. **R06-21** picker's Two people with "How do you know each other?" — USER-FACING. **R06-22** generation screen as its own screen, scroll locked, focus inside, crossfade — USER-FACING.
- **R06-23** the lab — INTERNAL. `--pair` campaign: three lenses plus four band pairs from published birth records; repetition score under a 3% bar; prose vs 1,900–2,500; cost vs 25 ¢; pair markdown published.
- **R06-24** Personal natal report — USER-FACING. One constant; hero, print header, form, dashboard, admin, picker, pair kicker.

## Deviations
- The Agent tool was unavailable again (R-13.3, plan risk 8): the orchestrator built all 24 cards itself in wave order. Token spend heavy.
- R06-15 was built in wave A (the wave could not compile without the registry) and its lens sections registered in wave B.
- Chapter 07's band is 450–560, not "unchanged" (420–560): the seven bands could not sum to 1,900 otherwise.
- Parent-and-child scenes: the spec gives one scene per band per chapter; each chapter carries the band's scene first and two age-neutral scenes, so the chips fit the child. Raised as MB-66.
- Contract additions beyond the plan: `ReportParticipant` gains the birth record and `isSelf` (the pair hero's corners); the list route hides p1 pair reports (MB-65, in `reports.ts`); `Checklist` gains the "Next time" heading; `CompatibilityPicker.tsx` and `StagingRibbon.tsx` edited under R06-21 and R06-07.
- Card fixtures: `--all` skips `pairOnly` charts; band fixtures age out of their band (noted per fixture, MB-67).

## Gate
Green: `pnpm install --frozen-lockfile` · typecheck (scripts, api, web) · `build:web` · `build:api` · tests (api 128, db 9, scripts 4, web 91)
· codegen no diff · `db:bootstrap` three times on a scratch Postgres 16 (a seeded `family` and `custom` row both read `people`, default
`people`, natal v6 and pair p2 overrides reset once). The Vercel preview smoke is CI's; this sandbox cannot reach it.

**Report lab**, remote against staging on `6d2761e` (PR #55, staging Smoke 35593662269 green), dispatched from `report-lab.yml`.
Natal v6, run 35593887996 (`report-lab/r06`): marie-curie 4,886 words · 25.6 ¢ · houses x2; audrey-hepburn 4,872 · 29.4 ¢ · triad x3
(the claims-only repair counted, no failure: MB-62); day-angular 4,898 · 27.8 ¢ · discoveries x2; high-latitude 4,840 · 27.4 ¢ · none;
night-angular 4,858 · 26.6 ¢ · none; oprah-winfrey 4,827 · 26.7 ¢ · foundation x2. Every drawn total inside 3,500–5,500, no failed
section on any chart; flags as in R05: house readings 71–76 words on 1–3 of 12 per chart, one why without a verb on oprah-winfrey.
Blind marie-curie-unknown 3,822 words · 22.9 ¢ · blind flag clean, 360 over its blind band (the model did not shrink to 2,740–3,460).
The pass, run 35593894600 (`report-lab/r06-pass`): blind 3,746 words · 24.5 ¢; passed 5,498 words, inside the 5,500 ceiling (MB-60,
R05 read 5,769); claims 68 before, 105 after (MB-61, R05 lost 7); the ledger counts 48 sentences, 54 differ on the page (R05: 16 against
58); 10 paragraphs added; the pass 22.5 ¢, 47.0 ¢ together. The pair campaign, run 35593900887, failed on every run with nothing
published and its log unreachable from the build session; PR #56 makes the workflow publish the log with the run, and the campaign
is re-run from it; its measurement lands here when it does.

## Mailbox
Done: MB-60, MB-61, MB-62. Built at their defaults, still open: MB-63, MB-64, MB-65 (provisional seams in R06-16, 19, 20).
Raised: MB-66 (the two age-neutral chip scenes per parent chapter), MB-67 (band fixtures age out; the lab prints the band it computed).
