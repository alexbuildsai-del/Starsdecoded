# What you each look for (partner match)

Status: **draft**, v1 (2026-10-09). Artifact: https://claude.ai/artifact/7yzUr8qoKAV1Vrn97WG6os.
Mock charts computed by the engine: Alex (1993-05-18, 08:20, Brussels) and Audrey Hepburn (fixture); the two lists
and card words are written for the mock. Touches `compatibility-report` (chapter 04 "tests each person's
connectBestWith against the other chart", never built as a section), `natal-report-pass-two` (the list),
`review-09-10` §4 (the walk and its two-chart stage).
**Brain:** `api/src/prompts/sections/relationships.ts`, `api/src/lib/pairBrief.ts`, `api/src/prompts/pair/`
(new section, `index.ts`, `shapes.ts`, `foundation.ts`). Dry lab, then a spot run on a partners pair.

## Why
Each personal report lists three or four things the reader connects best with in a partner's chart
(`relationships.connectBestWith`). Today the pair foundation reads both lists as free text; nothing in the report
shows the reader whether the other chart has them. The Owner: compare "apples to apples", partners only.

## Scope
1. **Partners lens only.** A new chapter "What you each look for", right after "Your two charts" (the walk), so
   partners reports run 01 to 08. Parent and child and people reports are unchanged.
2. **Two lists, one tab each**: "What <A> looks for", "What <B> looks for". Each item is one card: the item, a
   verdict chip (Yes, in her/his/their chart · Partly · Not in her/his/their chart), "Why <name> looks for it" (the
   natal reason), the placement found on the other chart in mono with "(Nth, word)", what it means in plain words,
   and for Partly and No a "Try together" with its tick box (the workbook, ADR-24).
3. **The verdict comes from code, never the writer.** A pure function `matchItem(item, otherChart)` in
   `api/src/lib/partnerMatch.ts` reads the item text into a rule and checks it:
   - planet(s) in sign(s) or element: Yes if any named planet is there; else No, naming where it is.
   - "prominent <planet>": Yes if in the 1st, 4th, 7th or 10th or it rules the rising sign; Partly if strong by
     sign only (domicile or exaltation, `traditional.ts` `essentialDignity`); else No. No birth time: Partly at most.
   - "<sign> emphasis": Yes with two or more planets or a luminary there; Partly with one other planet; else No.
   - An item the reader can't parse is dropped from the chapter, never guessed; a `generation_failures` row notes it.
   The engine's sign-to-element map is exported for this (`chartCalculation.ts:19`).
4. **The natal prompt keeps the list's look** and asks for items only in that set of words (planets, signs,
   elements, "prominent", "emphasis"), so every new item parses. Reports already bought are read by the same parser.
5. **Pair brief** gets each side's items with verdict and placement found. **One new section prompt** writes each
   card's meaning and Try together, and one "In short" line (two sentences: where both find it, where neither does).
   It may not change a verdict; a card whose words contradict its verdict is a blocking check (wrong for the reader).
6. **The stage reuses the walk's two named charts** (review-09-10 §2b, §4): the reason's planet lit on the asker's
   chart, the checked planet lit in brass on the other's, the wanted signs shaded on the rim; the rest dimmed.
   Phone: stage sticky on top, cards under; computer: stage left, cards right.
7. **No score, no count** ("3 of 4"): compatibility-report, no score anywhere. Same price, one credit.
8. Claims: each card carries a `match` evidence `{ of: "A"|"B", item, planet, sign, house?, verdict }`,
   `validateClaims` checks it against the chart.

## Out of scope
- Friends, family, parent and child (their personal list is about partners). Later needs its own natal list first.
- Changing the natal list's look or the walk.

## Acceptance criteria
- A partners report shows chapter 02 with both tabs; other lenses show no such chapter.
- For the fixture pair, every verdict equals `matchItem`'s output; a unit test on the rule table is the chapter's
  `test.critical` (new flow step).
- A card names the other's placement with its house word, or no house when the birth time is unknown.
- An unparseable item never shows; a failures row exists for it.
- Phone 390 px and computer 1440 px: no sideways scroll; the lit planets match the card.

## Screens
The artifact: where it sits, the chapter with both tabs on real charts, the rule table, what changes.

## Open questions (silence takes the default)
1. Own chapter 02, or a part at the end of chapter 01? **Default: own chapter.**
2. Show the No items? **Default: yes, each with what to try instead.**
3. A version for friends and family later? **Default: not now.**

## Decisions to record
- Partner match is a partners-only chapter after the walk (Decided by Claude, pending the Owner's look).
- The verdict is computed in code from the item text; the writer explains it and cannot change it (Decided by Claude).
- The natal "You connect best with" items are written in a fixed set of words so code can read them (Decided by Claude).
