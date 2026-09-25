# Annex — every check that can reject a section, classified (R08)

Inventory of 2026-09-25 on main (`1b388b7`), for `docs/specs/draft/pair-reliability-and-prose.md`.
The principle (Owner, 2026-09-25): a check blocks only when the text would be wrong or
harmful for the reader, or when it costs money; everything else is fixed in code or logged.

Keys: AI `api/src/lib/aiInterpretation.ts` · EV `api/src/prompts/evidence.ts` · S/
`api/src/prompts/sections/` · PEV `api/src/prompts/pair/evidence.ts` · SH
`api/src/prompts/pair/shapes.ts` · LK `api/src/prompts/pair/sections/links.ts` · PF
`api/src/prompts/pair/foundation.ts` · DOC `api/src/prompts/pair/sections/parent-child/doctrine.ts`.

Classes: **BLOCK** keeps rejecting · **FIX** corrected in code, no model call · **WARN** logged
only · **BUFFER** 20% tolerance, prompt keeps the target · **REPAIR** one claims-only call.

Today: a zod count failure regenerates the whole section (AI:285-289; counts are stripped
from the strict JSON schema, so the model only sees a hint). The claims-only repair runs
only when every problem is a quote problem (EV:72). `applyAmendment` (AI:769-780) already
drops bad refs and empty claims: the model for FIX (drop).

| # | where | rule | class · how |
|---|---|---|---|
| 1 | EV:46, PEV:40 | 1–3 refs a claim | FIX: cut to 3 before the parse; 0 refs drops the claim |
| 2 | EV:50, PEV:43 | 3–8 claims | FIX: cut to 8; under 3 → REPAIR |
| 3 | EV:105, PEV:67 | quote ≥ 8 chars | FIX: drop the claim |
| 4 | EV:106, PEV:68 | quote verbatim | FIX: ignore case and punctuation, snap to the closest sentence (≥ 0.85 token overlap), else drop |
| 5 | EV:110-116 | blind chart cites a horizon factor | FIX: drop the ref, null the house |
| 6 | EV:121-159, PEV:74-92 | ref matches the chart (placement, aspect, ruler, lot, sect, overlay, source) | FIX: drop the ref, then the claim if empty (a wrong ref would print a made-up factor) |
| 7 | EV:123 | drawn chart, house null | FIX: fill from the chart (`drawnRef`, AI:679) |
| 8 | EV:132, PEV:86, LK:54 | orb ±0.2° | FIX: snap to the computed orb |
| 9 | after 1–8 | fewer than 3 valid claims | REPAIR (one cheap call), never a prose rewrite |
| 10 | AI:545, 583 | rising-part claims 3–8 | BUFFER: minimum 1 (appended to the triad's) |
| 11 | PEV:79 | cross ref outside the chapter's allocation | FIX: drop the ref (the link is real; the cost is overlap only) |
| 12 | S/foundation.ts:40 | sect copied from the brief | FIX: overwrite from `brief.sect`, log |
| 13 | S/foundation.ts:14 | supportingEvidence 3–6 | FIX: cut extras; under 3 WARN |
| 14 | S/houses.ts:11, 47 | 12 houses in order | FIX: sort, dedupe; BLOCK only when a house is missing |
| 15 | S/houses.ts:56 | a house reading names a body not in or ruling it | **BLOCK**: implies a false placement |
| 16 | S/* list counts, SH:50-87, PF:16-28 | actions, strengths, items, checklists, scenes | FIX: cut to the maximum before the parse; under the minimum WARN |
| 17 | AI:601-607, 826-834 | amendment caps and refs | FIX: cut, drop the bad amendment or claim |
| 18 | SH:131-133 | a percentage, a mark, a "compatibility score" | **BLOCK**: ADR-41, no score |
| 19 | SH:134 | the words score, rated, rating | WARN (ordinary English); BLOCK only next to a digit or the pair |
| 20 | SH:146 | a body name in brackets | FIX: strip, re-run the quote match |
| 21 | SH:147-148 | aspect words | **BLOCK** trine, sextile; WARN square, opposition, conjunction unless next to a body name |
| 22 | SH:149 | "orb" in prose | **BLOCK**: jargon |
| 23 | SH:179 | card line ≤ 12 words | BUFFER: 15 |
| 24 | SH:180 | card line names a body | **BLOCK** capitalised only ("the sun on the balcony" passes) |
| 25 | SH:182 | a third capitalised name | **BLOCK** invented person names only; widen the allow-list; else WARN |
| 26 | SH:184 | digit in a card line | FIX: spell out small numbers; scores stay caught by 18 |
| 27 | SH:192 | the scene names both people | WARN. **Bug**: `\b` never matches Zoë, José, Élodie; fix with Unicode lookarounds |
| 28 | SH:205-211 | the why has a verb | WARN. **Bug**: "so you pause first" fails |
| 29 | SH:218, DOC | age-band words | WARN, with the now-and-later rule in the prompt (Owner, 2026-09-25); patterns trimmed of false hits (grounded, a phone call, revise the plan, make allowances, rent, tablet) |
| 30 | SH:224 | a blind pair names a house | **BLOCK** a numeral ("4th house"); WARN word ordinals |
| 31 | SH:113, LK:39 | link card count | FIX: drop extra, duplicate or unmatched; missing WARN |
| 32 | LK:43 | 40–70 words a card | BUFFER: 32–84 |
| 33 | LK:44 | ends on "Behaviour check:" | FIX: normalise spelling and case, accept it at the start of the last sentence; missing WARN |
| 34 | LK:47-53 | overlay on a blind pair, not notable, aspect not in the brief | FIX: drop the card |
| 35 | LK:56 | flows/rubs tag | FIX: set from the aspect type |
| 36 | LK:64 | a card names another card's body | **BLOCK**: wrong factor |
| 37 | PF:50, 54 | foundation rating words, strength lines | WARN (internal; chapter 01 re-checks what prints) |
| 38 | PF:53-81 | link and chapter numbers, duplicates, owners, scene picks | FIX: drop, merge, give the nearest link, default the scene to 0 |

Still blocking after R08: rows 15, 18, 21 (trine, sextile, aspect beside a body), 22, 24
(capitalised), 25 (person names), 30 (numerals), 36; plus rows 9 and 14 in their fallback.
Everything else is fixed in code, logged, or buffered. Every FIX and WARN writes a row to
`generation_failures`, so a rule that keeps firing still reaches the next round's plan.
