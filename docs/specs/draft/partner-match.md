# What you each look for (partner match)

Status: **draft**, v2 after the Owner's first look (2026-10-09). Artifact: https://claude.ai/artifact/7yzUr8qoKAV1Vrn97WG6os.
Mock: Thibault (1993-05-18, 08:20, Brussels) and Beatrice (fixture), engine-computed, drawn with Review 09/10's model
wheel; the two lists and card words are written for the mock.
v2, the Owner: "do better for the visual… after the aspects… everything in one tab… an interactive wow moment". Touches `compatibility-report` (chapter 04 "tests each person's
connectBestWith against the other chart", never built as a section), `natal-report-pass-two` (the list),
`review-09-10` §4 (the walk and its two-chart stage).
**Brain:** `api/src/prompts/sections/relationships.ts`, `api/src/lib/pairBrief.ts`, `api/src/prompts/pair/`
(new section, `index.ts`, `shapes.ts`, `foundation.ts`). Dry lab, then a spot run on a partners pair.

## Why
Each personal report lists three or four things the reader connects best with in a partner's chart
(`relationships.connectBestWith`). Today the pair foundation reads both lists as free text; nothing in the report
shows the reader whether the other chart has them. The Owner: compare "apples to apples", partners only.

## Scope
1. **Partners lens only.** A new part of chapter 01, **right after the walk** (the links), titled "What you each look
   for". The walk's two charts stay on screen; the search starts on them. Parent and child and people: unchanged.
2. **One view, no tabs.** The stage: both named charts, the one being searched grows (about 1.7 to 1), the asker's
   reason planet lit on their own chart. Above it the walk's progress line ("The Moon · search 3 of 8", one notch per
   search, a gap per row). Under it one line saying who looks for what, with the verdict chip when it lands.
3. **The search, one wish at a time.** The wanted zone lights on the other chart in its true shape: an element is a
   triangle of its three signs, "prominent" is the square of the 1st, 4th, 7th and 10th plus the rising sign, a sign is
   one slice. A brass sweep turns once (about a second), then the sought planet gets its ring: teal Found (pulse),
   brass Partly, grey dashed Not there, with its sign named beside it.
4. **Plays once by itself** when the stage comes into view; Play again and Skip to the end under it. Reduced motion:
   the last frame at once.
5. **The last frame**: both charts the same size, only what the other found lit in brass, each captioned "What
   <name> finds here: …", and the writer's one "In short" line.
6. **The ledger**: one row per planet theme pairing the two lists (Moon with Moon, Saturn with Saturn; unpaired items
   follow), each wish with its chip, the middle saying Both ways, One way, Partly both ways or Neither way (from the two
   verdicts, in code). Tapping a row replays its two searches and opens its card.
7. **The card** is the live link card's look: tag and dot (Both ways teal "Comes naturally", Neither way rose
   "Takes practice", else brass "Halfway"), a title in words, the astrology in grey mono (each wish, the placement found
   "(Nth, word)", the verdict), the reading, Try together with its tick box (workbook) when not Both ways.
8. **The verdict comes from code, never the writer.** `api/src/lib/partnerMatch.ts` `matchItem(item, otherChart)`:
   - planet(s) in sign(s) or element: Found if any named planet is there; else Not there, naming where it is.
   - "prominent <planet>": Found in the 1st, 4th, 7th or 10th, or ruling the rising sign (traditional rulers,
     `traditional.ts`); Partly if strong by sign only (domicile or exaltation); else Not there. No birth time: Partly at most.
   - "<sign> emphasis": Found with two planets or a luminary there; Partly with one; else Not there.
   - An item it can't read is left out, never guessed, with a `generation_failures` row. The engine's sign-to-element
     map is exported for it.
9. **The natal list keeps its look**; its prompt asks for items in that set of words only. Old reports go through the
   same reader.
10. **Pair brief** carries each item, its verdict and the placement found; **one new section prompt** writes the four
    cards and the "In short" line and may not change a verdict (a card that contradicts its verdict blocks: wrong for
    the reader). Claims: `match` evidence `{ of, item, planet, sign, house?, verdict }`, checked by `validateClaims`.
11. **No score and no count.** Same price, one credit.

## Out of scope
- Friends, family, parent and child (their personal list is about partners). Later needs its own natal list first.
- Changing the natal list's look or the walk.

## Acceptance criteria
- A partners report shows the part after the walk; other lenses don't.
- For the fixture pair every chip equals `matchItem`; a `test.critical` unit test on the rule table (new flow step).
- The zone drawn matches the rule (triangle, square, slice) at the chart's true degrees; the lit planet is the card's.
- Plays once on arrival; Play again and a row tap replay; reduced motion shows the last frame.
- 390 px and 1440 px: no sideways scroll; the ledger stacks its middle above the two wishes on a phone.

## Screens
The artifact v2: where it sits, the chapter part playing on real charts, the ledger and card, the shapes.

## Open questions (silence takes the default)
1. Plays by itself the first time? **Default: yes, once; then it waits on the last frame.**
2. Same two charts as the walk, no break between? **Default: yes, one scene.**

## Decisions to record
- Partner match is a partners-only part right after the walk, one view, no tabs (Decided by Alex, 2026-10-09).
- It plays as a live search on the walk's two charts; elements as triangles, prominence as the square (Decided by Claude).
- The verdict is computed in code from the item text; the writer explains it and cannot change it (Decided by Claude).
- The natal "You connect best with" items are written in a fixed set of words so code can read them (Decided by Claude).
