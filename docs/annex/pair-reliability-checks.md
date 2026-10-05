# Annex — every check that can reject a section, classified (R08)

Inventory of 2026-09-25 on main (`1b388b7`), for `docs/specs/draft/pair-reliability-and-prose.md`.
The principle (Owner, 2026-09-25): a check blocks only when the text would be wrong or
harmful for the reader, or when it costs money; everything else is fixed in code or logged.

Keys: AI `api/src/lib/aiInterpretation.ts` · EV `api/src/prompts/evidence.ts` · S/
`api/src/prompts/sections/` · PEV `api/src/prompts/pair/evidence.ts` · SH
`api/src/prompts/pair/shapes.ts` · LK `api/src/prompts/pair/sections/links.ts` · PF
`api/src/prompts/pair/foundation.ts` · DOC `api/src/prompts/pair/sections/parent-child/doctrine.ts` · TL
`api/src/prompts/timeline/checks.ts`.

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
| 16 | S/* list counts, SH:50-87, PF:16-28 | actions, strengths, items, checklists | FIX: cut to the maximum before the parse; under the minimum WARN |
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
| 38 | PF:53-81 | link and chapter numbers, duplicates, owners | FIX: drop, merge, give the nearest link. No scene pick since p3: one fixed scene a chapter (ADR-176) |
| 39 | AI:442 (`registerChecks`, R12) | style-contract rule 13's words in prose, too high or too low (ADR-185); "energy" only as a mood | WARN on every structured call, natal and pair, foundations included: one row per list, the words named, never the sentence; never a block, a retry or a lab fault |
| 40 | SH:206 (`stripBriefLabels`, R12-28) | a pair brief label in prose: "A/mind claim 1", "L15", with "source" or a name for the letter, or the "[claim]" left in its place | FIX: a bracket of nothing but labels (joined by `;` `,` `.` or "and") goes with the space before it, on every reader-facing pair section before its claims are checked (`validatePairSection`), never in the claims; **BLOCK** a label left in a sentence or in a bracket with other words: the text would be wrong for the reader |
| 41 | SH:244 (`semicolonsToFullStops`, R12-28; natal `natalProseRepairs`, 2026-10-02; TL `checkReading`, R16-21) | a semicolon in pair, natal or Timeline reading prose (rule 8) | FIX: a full stop, the next word capitalised unless already cased, so a name stays as written; a claim quoting across it follows the repaired sentences (`followRepairs`, logged as row 4), since the snap scores one sentence at a time and would drop it |
| 42 | SH:231 (`stripWordCounts`, R12-28) | a word count in pair prose (style rule 10): "(56 words)", "(about 40 words)", "(40-60 words)", "(Word count: 56)" | FIX: a bracket of nothing but a count goes with the space before it, like row 40; **BLOCK** a count standing as its own sentence, or "word count: 56" anywhere: the text would be wrong for the reader. A count inside an action ("in 10 words or fewer") stays |
| 43 | AI:505 (`plainChecks`, R16-13) | the writer's rule (ADR-257) in what the reader reads: two ideas in one sentence (a joining word after a comma, "and" or "but" before a person doing something, a colon after a clause) or a metaphor (a "like a" simile, or a figure on the list: the audit's, rule 13's rooms, the r06 base's stock images); copied text (claims, an amendment's quote) is not counted again | WARN on every reader-facing call, natal and pair, never a foundation (its contract is rule 13 only): one row per kind, its count of sentences and the list's words, never the sentence; never a block, a retry or a lab fault. Lists find a shape, not a meaning, so the counts are a trend against the r06 base; `report-lab --compare` prints both per section |
| 44 | TL (`dateChecks`, R16-21) | a date, a day of a month, a month, a year or a degree in a Timeline reading that the event did not compute, a day either side allowed for the reader's zone; a season, a holiday or birthday, a clock time or a time counted from today ("next month"), which no event computes | **BLOCK**: the text would be wrong for the reader (ADR-210, Timeline acceptance 1). The message names the kind and the field, never what was written, so a birth date never reaches the log. A month alone counts only after a word like "in" or "until", and never when it spells the reader's name |
| 45 | TL (`predictionChecks`, R16-21) | a life event foretold: a word that looks ahead ("will", "is coming", "expect", "brings") in a sentence with a thing that happens to a life (a new job or losing one, meeting someone or falling in love, a breakup, a move, buying or selling a home, getting rich or losing money, an illness, luck); a promised outcome ("will work out"); fate, destiny or karma (R-5.2 as amended, ADR-206) | **BLOCK**: Timeline acceptance 4. A sky event in the future tense is the reading's own subject and passes ("Saturn will cross your Ascendant again on …") |
| 46 | TL (`adviceChecks`, R16-21) | a do or a don't (ADR-206): "you should", "you must", "be sure to", "it's best to", "I suggest", "you might want to", or a sentence, the clause after ", so" or a colon, or the main clause after an opening clause, a name or a softener ("If you can, rest", "Marie, take your time", "Maybe wait"), that opens on a command ("Take your time", "Don't rush"); "you'd be wise to" and "you'd better" too | **BLOCK**: Timeline acceptance 4. A question passes, and so do a feeling ("you feel you should"), a need ("you need to feel heard") the page's own "a good time to look at your plans again", and a choice left to the reader ("Rest or push on, you choose") |
| 47 | TL (`lengthChecks`, R16-21) | a reading's everyday line at most 20 words, its body 90 to 140 | BUFFER: the line to 24, the body 72 to 168; **BLOCK** beyond, as rows 23 and 32 |
| 48 | TL (`checkReading`, R16-21) | a data block's marker copied into a reading (`<<quote>>`, `<<end>>`) | FIX: the marker goes with the space around it and the words stay. A copied name block reads back as the name first (`restoreBlocks`), as on every call that holds names |

Still blocking after R08: rows 15, 18, 21 (trine, sextile, aspect beside a body), 22, 24
(capitalised), 25 (person names), 30 (numerals), 36; plus rows 9 and 14 in their fallback,
since R12-28 rows 40 and 42 for a label or a word count left in a sentence, and since R16-21 rows 44 to 46
on a Timeline reading and row 47 beyond its buffer.
Everything else is fixed in code, logged, or buffered. Every FIX and WARN writes a row to
`generation_failures`, so a rule that keeps firing still reaches the next round's plan.
