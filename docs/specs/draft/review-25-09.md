# Review 25 Sept

Ideation 2026-09-26 with the Owner from the Notion page "Review 25 Sept" (ten notes on the R08
build on staging), revised the same day on the Owner's replies. Artifact, revision 2, with the
hero now and proposed, the two charts on the lab pair's computed charts, the house names, the
ledger, card A and the share-and-invite design, the prompt diff and the Closing measures:
https://claude.ai/artifact/BejywNF3s6rEGEc4aRHTSD. Status: **draft**.
Builds on `compatibility-report-p2.md` (ADR-63 to 71) and `review-20-09.md` (ADR-59 to 62);
amends ADR-71, the p2 chapter 01 shape and lens chapter order, and makes ADR-70 literal.

Note 8 shipped in #66 (the Owner: "just fix it"). The Owner's replies settled the three
questions: option B (two charts side by side), card A, note 7 as drawn.

## Scope

### The compatibility report
- **The hero (note 1).** One group centred in the viewport: the eyebrow, then each person's
  name heading their own column of three rows, "and" between; stacked on a phone. The big
  two-name title and the plate names merge, so each name prints once. `PairHero.tsx` `Plate`
  loses its SVG (ring, dashed horizon, Sun and Moon on the ring, Moon arc, rising marker). Row
  text and renders stay at today's sizes; nothing added. A Moon with a band shows it as a
  degree range in its row; a blind side keeps "rising · not drawn". `PAIR_STACK` and
  `pairStack()` re-measured so the cue clears the corners. Print drops the rings.
- **One counter (note 2).** `Chapter.tsx` pads `total` as it pads `number`; the pair page
  passes its chapter list's length and a one-word eyebrow per chapter, so the header reads
  "01 / 07 · Charts" as the natal one reads "04 / 10 · Work". Labels, in `lenses.ts`: 01
  Charts, 07 Practice; Partners Love, Repair, Home, Fun, Future; Parent and child Needs,
  Feelings, Home, School, Rules; Two people Together, Work, Fun, Talk, Giving.
- **Two charts side by side (note 3, option B).** Chapter 01 draws each person's chart alone
  with the natal wheel component, side by side from 640 px and stacked below, each the width
  available. The first name in each centre, "Rising {degree} {sign}" under it. No toggle, no
  panel, no legend, no contact lines: `BiWheel.tsx`, `bi-wheel.ts` (and its test) and
  `WheelLegend` retire. A planet shows its degree on hover or tap, as in the natal wheel.
- **Every wheel names its houses (note 3, both reports).** The sign band carries two lines per
  segment: the sign, and under it the house number and the house's name ("9 · BELIEF"). The
  inner house-number ring goes. The natal tap still opens the house card. A blind chart draws
  no house line (ADR-34).
- **One name per house, everywhere (note 4, both reports).** `HOUSE_NAMES` becomes one word
  per house, the first word of today's titles: Self, Money, Mind, Home, Play, Work,
  Partnership, Depth, Belief, Career, Friends, Solitude. The same word on the wheel, as the
  house card's title (its `HOUSE_THEMES` line stays under it), in the hero rows ("3rd
  (mind)") and in brackets after every "Nth house" and "rules the Nth" the page prints: link
  card titles, the evidence sheet, claim labels ("…, 11th house (friends), exalted"). One
  helper beside the list, at render time: no prompt, API or schema change; stored reports get
  it.
- **Chapter 01, the ledger (note 5).** `TwoChartsBlock` renders two columns (stacked below
  760 px), "Naturally strong" in teal and "Will take work" in rose. Each line carries the
  glyph of the cross link its claims cite: A's body, a straight line in the link's colour
  (teal flows, rose rubs, brass touch), B's body, the two body names under it; every glyph
  the same shape. The line in the display face, a chip "→ {NN} {chapter title}" from the
  link's owning chapter in the foundation; a tap on the glyph opens that link's card. The
  paradox spans both columns under a teal-to-rose rule; the pointer closes. The strengths card
  leaves the page (it repeated the strong lines); `strengths` stays in the schema for the
  share card. Order: charts, ledger, share block, link cards. No glyph without a cross claim,
  no chip without an owning chapter. No schema change.
- **The share card (note 6, card A).** `ShareCard.tsx` draws a portrait 1080 × 1350 canvas
  with no wheel (the `wheel` prop goes): eyebrow "Compatibility report · {lens}", "{A} and
  {B}" by first name and the verdict in the display face, "Your three strengths as a pair"
  with the three lines in the body face, the foot line and the mark with the wordmark. The
  page shows the drawn card, then "Send it to {B}." and "It shows the verdict and your three
  strengths. Nothing from either birth chart is on it, and nothing is uploaded." Buttons:
  "Share the card" (Web Share with the PNG where `canShare({ files })` holds, else "Copy
  image" where `ClipboardItem` exists), "Save image", and "Share the report with {B}" (below).
- **The scene, introduced (note 7, approved).** Every lens, chapters 02 to 06: the card is
  headed "Going in" and keeps its two sides; the scene block adds "A moment you will both
  recognise, played out." under its kicker; "What just happened" opens on `card.pair` in the
  display face. Chapter 02 carries: "From here, each chapter plays out one scene between you:
  how it tends to go, what was going on under it, and one thing to try next time. Two more
  scenes wait under each one." Print drops the second sentence. Words and prompts unchanged.

### Sharing a report and inviting (note 6, the Owner's idea)
- **Share with {first name}**, on the natal report, the person's dashboard row and, for the
  pair, the third card button and the pair's dashboard row. It reuses invites: token, email,
  copyable link, sign-in with the invited email, the birth-time question.
- **Theirs by default.** On claim the person's natal report is theirs: new
  `profiles.claimed_as_self` (idempotent bootstrap script), set on claim, with "Not me" to
  undo; if they already have a self profile, they are asked. They may delete their report and
  remove the giver's access; the giver keeps reading until then (R-3.5).
- **Fixes it needs.** A claimer can open and list the natal report made for them
  (`reports.ts` reads and list check `claimed_by_user_id` like `canReadProfile`; today the
  claim lands on a 404, MB-59). Sharing a pair with someone who already joined sets
  `access_role` to participant instead of a 409. The pair invite email names the right person
  and always carries its subject; the invite page shows the giver's first name, not their
  account email; the Terms line on shared readers says what they see.
- **The pair report is shared only by one of its two people**: it shows both birth records.
- **Invite {first name}** on a person with no report: they sign in and make their own ("this
  chart is for me"). The gifted credit (reserve on invite, move on claim, return on expiry)
  lands with payments, tagged `// MB-6 provisional`.

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
    the behaviour after it is still reasoning from a placement. Never copy a line from the
    brief or the foundation into prose. To cite a paragraph is to give it a claim."
  - Rule 8 opens: "A prose field is one paragraph of plain sentences, printed exactly as
    written: no markdown, no asterisks, no headings, no bullet points, no blank lines." The
    rest of rule 8 stays.
  - `PAIR_DOCTRINE` gains: "Evidence lives in the claims field only, as rule 3 says. A link,
    an overlay, a source line or a placement never heads or interrupts a passage, in brackets,
    in bold or alone on a line." The foundation: evidence as the brief's own lines give it,
    each guidance sentence behaviour with no planet, sign, house, ruler or dignity. Overview
    and Mind: "cite that paragraph to the placements" becomes "give that paragraph a claim for
    each placement it rests on".
  - `PROMPT_VERSION` v7, so the bootstrap reset clears stale overrides and all 12 natal and
    19 pair system rows run the new text; production copies staging's.
  - The page's one guard, not a check: `CitedText` drops markdown asterisks and a paragraph
    that is only a placement, so reports already stored read clean. It fails nothing.
- **The Closing gap (note 10).** `DawnClosing.tsx:95` drops `md:pt-14`; `.rp-dawn .body >
  .rp-pull:first-child` loses its top margin, hairline and top padding. From 768 px up the
  padding kept the margins from collapsing (104 px against 22 to 46).

## Out of scope
- Pair prose, schema and the pair lab's own failures (R08's ground); no stored pair run exists.
- The gifted credit before payments (MB-5, MB-6); sharing with someone who has no account.
- The API's own house wording (`vocabulary.ts`, `HOUSE`): a Mailbox row at lock.
- A natal share card, a hosted card or a card link preview; Placidus; the landing page (MB-8).

## Acceptance criteria
1. The pair hero at 390 and 1440 px is one centred group, each name printed once over its
   rows, no ring or marker, today's row sizes; the cue clears the corners; print has no ring.
2. Every counter pads both numbers and carries a label: "01 / 07 · Charts", "04 / 10 · Work".
3. Chapter 01 shows the two charts side by side at 1440 px and stacked at 390 px, each with its
   name and rising in the centre; nothing on the page or the card draws two charts on one
   plate or a line between charts.
4. Both reports' wheels name every house in the band; the house card's title is the same word;
   every "Nth house" and "rules the Nth" in link cards, evidence and labels carries it once
   (unit tests on the helper and `linkTitle`).
5. The ledger renders three teal and three rose rows with one glyph shape, chips where a link
   owns a chapter, the paradox across; no strengths block on the page.
6. The card is 1080 × 1350 with no wheel, strengths in the body face, shown on the page with
   Share the card (or Copy image), Save image and Share the report; no request carries it.
7. Every lens chapter of every lens reads headline, Going in, the introduced scene, What just
   happened opening on the pair line, the because-lines, the pattern, Next time.
8. A shared person signs in and finds their natal report and the pair on their dashboard,
   marked theirs, opens both, can undo "this is me", delete their report and remove the giver.
9. The dry lab shows rules 3 and 8 in every natal and pair system prompt; staging's Prompts
   page shows no `:system` override after the v7 bootstrap; the stored report with the label
   renders without it.
10. The Closing's first line sits within 26 px of its rule at 390, 820 and 1280 px.
11. Typecheck, both builds, unit tests, codegen no diff, `db:bootstrap` clean twice (the new
    column), the dry lab, Vercel preview smoke.

## Screens
All in the artifact, revision 2: the hero now and proposed at desktop and phone; the counter
and its labels; the two charts; the twelve names in use; the ledger; card A and the share
block; the giver's and the person's dashboards and the three flows; the crash fix; the cause
of the label and the prompt diff; the Closing measures.

## Open questions
None left from revision 1. Taken at their defaults unless the Owner says otherwise: the page's
plain-text guard stays; "theirs by default" includes deleting and removing the giver.

## Decisions to record
1. **Two charts, side by side**, each alone with its name and rising in the centre; no
   bi-wheel, ring inside a ring, contact lines, toggle, panel or legend, on the page or the
   card. Amends the p2 chapter 01 line and ADR-71's "the wheel behind".
2. **One name per house, everywhere**: twelve single words from today's titles, on the wheel,
   as the house card's title, in the hero rows and in brackets after every house. Both reports.
3. **The compatibility hero is one centred group with no ring**, each name once over its rows,
   at today's sizes. Makes ADR-70 literal.
4. **One counter in both reports**: both numbers padded, a one-word label in every chapter.
5. **Chapter 01 is a ledger**: every link one glyph shape, coloured by kind, a chip to its
   chapter; the paradox across; the strengths on the share card only. No number, bar or score.
6. **The share card is type only**, portrait 1080 × 1350, strengths in the body face, shown on
   the page with Share the card, Save image and Share the report. Closes MB-63.
7. **A lens chapter reads in story order**, the scene introduced before it plays.
8. **Share what is about them**: a report about someone is shared with them, theirs by default,
   theirs to delete; a pair is shared only by one of its two people; Invite for someone with no
   report, the credit with payments.
9. **Prose is plain text, said in the prompt**: rules 3 and 8, the pair doctrine and the
   foundation; PROMPT_VERSION v7 reaches every section; no new check; the page prints no
   markdown or bare placement line.
10. **An error never locks the app** (shipped in #66).
