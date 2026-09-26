# Review 25 Sept

Ideation 2026-09-26 with the Owner from the Notion page "Review 25 Sept" (ten notes on the R08
build on staging), revised twice the same day on the Owner's replies. Artifact, revision 3:
https://claude.ai/artifact/BejywNF3s6rEGEc4aRHTSD. Status: **locked 2026-09-26**, ADR-97 to 105.
Builds on `compatibility-report-p2.md` (ADR-63 to 71) and `review-20-09.md` (ADR-59 to 62);
amends ADR-43 (the bi-wheel), ADR-60 (the link cards), ADR-71, the p2 chapter 01 shape and lens
chapter order, and makes ADR-70 literal.
Touches `dashboard-sky` (locked on `claude/modest-cori-wh0mty`, ADR-89 to 96) through MB-86.

Note 8 shipped in #66 (the Owner: "just fix it"). Sharing a report (note 6's second half)
waits for the dashboard sky round: MB-81 to MB-86 hold its decisions and designs.

## Scope

### The compatibility report
- **The hero (note 1).** One group centred in the viewport: the eyebrow "Compatibility report
  · {lens}" (no "whole-sign · tropical"), then each person's name heading their own column of
  three rows, "and" between; stacked on a phone. The big two-name title and the plate names
  merge, so each name prints once. `PairHero.tsx` stops drawing the plate's SVG (ring, dashed
  horizon, Sun and Moon on the ring, Moon arc, rising marker); the ringed plate moves into its
  own component, which the dashboard sky card keeps (ADR-92, MB-86). Row text and renders at
  today's sizes; nothing added. A Moon with a band shows it as a degree range in its row; a
  blind side keeps "rising · not drawn". `PAIR_STACK` and `pairStack()` re-measured so the cue
  clears the corners. Print draws no ring.
- **The counter (note 2).** Both reports print the counter alone, both numbers padded: "04 /
  10", "01 / 07". `Chapter.tsx` pads `total` and drops the " · {eyebrow}" from the counter
  line; the pair page passes its chapter list's length. The divider line between chapters
  keeps its word as today.
- **Two charts side by side (note 3).** Chapter 01 draws each person's chart alone with the
  natal wheel component, side by side from 640 px and stacked below, each the width available,
  the first name in its centre and "Rising {degree} {sign}" under it. No toggle, no panel, no
  legend, no contact lines: `BiWheel.tsx`, `bi-wheel.ts` (and its test) and `WheelLegend`
  retire. A planet shows its degree on hover or tap, as in the natal wheel.
- **Every wheel names its houses (note 3, both reports).** The sign band carries two lines per
  segment: the sign, and under it the house number and the house's word ("9 · BELIEF"). The
  inner house-number ring goes. The natal tap still opens the house card. A blind chart draws
  no house line (ADR-34).
- **One word per house (note 4, both reports).** A list of twelve words beside `HOUSE_NAMES`,
  the first word of each title: Self, Money, Mind, Home, Play, Work, Partnership, Depth,
  Belief, Career, Friends, Solitude. The word appears on the wheel, in the hero rows ("3rd
  (mind)") and in brackets after every "Nth house" and "rules the Nth" the page prints: link
  card titles, the evidence sheet, claim labels ("…, 11th house (friends), exalted"). The house
  card is untouched: "Mind & exchange" over its line. One helper, at render time: no prompt, API
  or schema change; stored reports get it.
- **Chapter 01, the ledger (note 5).** `TwoChartsBlock` renders two columns (stacked below
  760 px), "Naturally strong" in teal and "Will take work" in rose. Each line carries the
  glyph of the cross link its claims cite: A's body, the link, B's body, the two body names
  under it. A strong line's link is a straight line, teal for flows and brass for a touch; a
  work line's is the rose zigzag. The line in the display face, a chip "→ {NN} {chapter title}"
  from the link's owning chapter in the foundation; a tap on the glyph opens that link's card.
  The paradox spans both columns under a teal-to-rose rule; the pointer closes. The strengths
  card leaves the page; `strengths` stays in the schema for the share card. Order: charts,
  ledger, share block, link cards. No glyph without a cross claim, no chip without an owning
  chapter. No schema change.
- **The share card (note 6).** `ShareCard.tsx` draws a portrait 1080 × 1350 canvas with no
  wheel (the `wheel` prop goes): eyebrow "Compatibility report · {lens}", "{A} and {B}" by first
  name and the verdict in the display face, "Your three strengths as a pair" with the three
  lines in the body face, the foot line and the mark with the wordmark. The page shows the
  drawn card, then "Send it to {B}." and "It shows the verdict and your three strengths.
  Nothing from either birth chart is on it, and nothing is uploaded." Two buttons: "Share the
  card" (Web Share with the PNG where `canShare({ files })` holds, else "Copy image" where
  `ClipboardItem` exists), then "Save image". Nothing stored or hosted (MB-63).
- **The scene, introduced (note 7).** Every lens, chapters 02 to 06: the card is headed "Going
  in" and keeps its two sides; the scene block adds "A moment you will both recognise, played
  out." under its kicker; "What just happened" opens on `card.pair` in the display face.
  Chapter 02 carries: "From here, each chapter plays out one scene between you: how it tends to
  go, what was going on under it, and one thing to try next time. Two more scenes wait under
  each one." Print drops the second sentence. Words and prompts unchanged.

### The personal report (notes 9, 10)
- **Plain prose, said in the prompt (note 9).** No new check. Cause: rule 3 of the style
  contract allows a placement "as a heading or label"; Career makes the 10th ruler its main
  evidence and bans names in its sentences; the foundation, exempt from the style contract,
  writes evidence as "10th ruler Venus in Scorpio, 11th house (detriment)"; no rule says plain
  text (gpt-5.2, reasoning off). In the stored runs six Career fields open on a label, none in
  the Overview; a label heading the second field reads as mid-text on the page.
  - Rule 3: "Placements are evidence, and evidence lives in the claims field only. 'Sun in
    Scorpio, 11th house' may fill a field that is explicitly a label. It never heads, ends or
    interrupts a prose field, bold or plain, even alone on a line. A placement stated first and
    the behaviour after it is still reasoning from a placement. Where a section lifts rule 8
    (the link cards), its names sit inside a sentence, never as a heading. Never copy a line
    from the brief or the foundation into prose. To cite a paragraph is to give it a claim."
  - Rule 8 opens: "A prose field is one paragraph of plain sentences, printed exactly as
    written: no markdown, no asterisks, no headings, no bullet points, no blank lines." The
    rest of rule 8 stays.
  - `PAIR_DOCTRINE` gains: "Evidence lives in the claims field only, as rule 3 says. A link,
    an overlay, a source line or a placement never heads or interrupts a passage, in brackets,
    in bold or alone on a line." The foundation: evidence as the brief's own lines give it,
    each guidance sentence behaviour with no planet, sign, house, ruler or dignity. Overview
    and Mind: "cite that paragraph to the placements" becomes "give that paragraph a claim for
    each placement it rests on".
  - The link cards keep naming their two bodies (the Owner): their prompt still lifts rule 8
    for them alone; its "under the bi-wheel" and "on the wheel" become "under the two charts"
    and "on the two charts". Their titles stay in code.
  - `PROMPT_VERSION` v7, so the bootstrap reset clears stale overrides and all 12 natal and
    19 pair system rows run the new text; production copies staging's.
  - The page's one guard, not a check: `CitedText` drops markdown asterisks and a paragraph
    that is only a placement, so reports already stored read clean. It fails nothing.
- **The Closing gap (note 10).** `DawnClosing.tsx:95` drops `md:pt-14`; `.rp-dawn .body >
  .rp-pull:first-child` loses its top margin, hairline and top padding. From 768 px up the
  padding kept the margins from collapsing (104 px against 22 to 46).

## Out of scope
- **Sharing a report and inviting**, for the dashboard sky round: MB-81 share a report with
  the person it is about, theirs by default; MB-82 share a compatibility report (the third card
  button); MB-83 invite, the gifted credit with payments; MB-84 the claim that lands on a 404;
  MB-85 invite copy and privacy; MB-86 what dashboard-sky takes from this review.
- Pair prose, schema and the pair lab's own failures (R08's ground); no stored pair run exists.
- The prompts' own house wording (`vocabulary.ts`, `HOUSE`): MB-87.
- A natal share card, a hosted card or a card link preview; Placidus; the landing page (MB-8).

## Acceptance criteria
1. The pair hero at 390 and 1440 px is one centred group under the eyebrow "Compatibility
   report · {lens}", each name printed once over its rows, no ring or marker, today's row sizes;
   the cue clears the corners; print has no ring; the dashboard sky card's plate keeps its ring.
2. Every counter reads the padded numbers alone: "04 / 10", "01 / 07".
3. Chapter 01 shows the two charts side by side at 1440 px and stacked at 390 px, each with its
   name and rising in the centre; nothing on the page or the card draws two charts on one
   plate or a line between charts.
4. Both reports' wheels name every house in the band; every "Nth house" and "rules the Nth" in
   link cards, evidence and labels carries its word once (unit tests on the helper and
   `linkTitle`); the house card's title and line are unchanged.
5. The ledger renders three strong rows with straight links and three work rows with the rose
   zigzag, chips where a link owns a chapter, the paradox across; no strengths block.
6. The card is 1080 × 1350 with no wheel, strengths in the body face, shown on the page with
   Share the card (or Copy image) and Save image; no request carries it.
7. Every lens chapter of every lens reads headline, Going in, the introduced scene, What just
   happened opening on the pair line, the because-lines, the pattern, Next time.
8. The dry lab shows rules 3 and 8 in every natal and pair system prompt and the links prompt's
   two-charts wording; staging's Prompts page shows no `:system` override after the v7
   bootstrap; link cards still name their two bodies and pass their checks; the stored report
   with the label renders without it.
9. The Closing's first line sits within 26 px of its rule at 390, 820 and 1280 px.
10. Typecheck, both builds, unit tests, codegen no diff, the dry lab, Vercel preview smoke.

## Screens
All in the artifact, revision 3: the hero now and proposed at desktop and phone; the counter;
the two charts; the twelve words in use and the unchanged house card; the ledger; card A and
the share block; the sharing designs kept for dashboard sky; the crash fix; the cause of the
label and the prompt diff; the Closing measures.

## Settled at lock
The page's plain-text guard stays (the default). The prompts' house wording went to the Mailbox
as MB-87; MB-63 is decided by ADR-102.

## Decisions recorded

ADR-97 to ADR-105, in this order.

1. **Two charts, side by side**, each alone with its name and rising in the centre; no
   bi-wheel, ring inside a ring, contact lines, toggle, panel or legend, on the page or the
   card. Amends the p2 chapter 01 line and ADR-71's "the wheel behind".
2. **One word per house, everywhere but the house card**: the first word of each house-card
   title, on the wheel, in the hero rows and in brackets after every house number; the house
   card keeps its full title and line. Both reports.
3. **The compatibility hero is one centred group with no ring**, eyebrow "Compatibility report ·
   {lens}", each name once over its rows, at today's sizes. Makes ADR-70 literal; the dashboard
   sky card keeps its ringed plate.
4. **The counter is the numbers alone** in both reports.
5. **Chapter 01 is a ledger**: strong links straight, teal or brass, work links a rose zigzag,
   a chip to each line's chapter, the paradox across; the strengths on the share card only. No
   number, bar or score.
6. **The share card is type only**, portrait 1080 × 1350, strengths in the body face, shown on
   the page with Share the card and Save image; nothing stored. Closes MB-63.
7. **A lens chapter reads in story order**, the scene introduced before it plays.
8. **Prose is plain text, said in the prompt**: rules 3 and 8, the pair doctrine and the
   foundation; link cards keep their two bodies inside a sentence; PROMPT_VERSION v7 reaches
   every section; no new check; the page prints no markdown or bare placement line.
9. **An error never locks the app** (shipped in #66).
