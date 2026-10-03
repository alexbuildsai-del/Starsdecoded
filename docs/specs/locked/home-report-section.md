# The report section after the hero

Ideation 2026-10-03 with the Owner, from production on a phone. Artifact: https://claude.ai/artifact/ELwG7Aa1VLr5v5cgrRMGRG.
Status: **locked 2026-10-03** (ADR-243 to 245). Amends `review-02-10` scope 1 (ADR-218, itself amending ADR-173): one annotated line becomes two
workbook cards. Touches `web/src/site/sections/Differences.tsx`, `web/src/site/data/differences.ts` and its test.
**Brain:** untouched (the site quotes the stored run; no prompt, model or engine change).
**Phone first**: designed at 390 px before desktop.

## Why
The Owner: the line is "nor understandable", it isn't a "wow moment", and it doesn't show the platform's value: a
personality report for day-to-day life, "very actionable yet grounded in your birth chart and placements". Found:
- The rule in `differences.ts` takes the relationships chapter's first claim and that chapter's first action, which
  answers a different claim, so "quiet, steady loyalty" sits over "Ask direct questions…".
- The chart note is a bare label ("Sun 13.1° Taurus, 4th house") with nothing plain beside it.
- The line is abstract, and the workbook side is one tick box.

## Scope

### 1. Two workbook cards (Q1: A, the Owner 2026-10-03)
- Eyebrow "Your report", heading "A personality report, not a horoscope", the lede "Two pages from Audrey Hepburn's
  report. Yours is written the same way, from your own chart." (the sample's name read from `SAMPLE`).
- Two cards, each the report's own path in four rows:
  1. **The moment**: one sentence with no astrology, large, in the display face.
  2. **In her chart**: the house's placements as evidence chips with the house's word (`withHouseWords`), then the
     house reading's own plain sentence on what they do.
  3. **Behaviour check**: the house reading's check, in the label and look `HouseCard` gives it.
  4. **Something to try**: the chapter action that answers it, with its why, in the one `Checklist` (ADR-172; local
     ticks, never sent).
- Card head: the card's name (brass label) and the house number with its word ("06 · Work").
- **How you work** and **How you spend** (option A), from r06:
  - Work: house 6 reading sentence 2 (moment), sentence 1 (plain), its check; chips Mars 25.2° Cancer and Pluto
    16.4° Cancer, 6th house; `career.actions[0]`.
  - Spend: house 2 reading sentence 1 (moment), sentence 2 (plain), its check; chip Moon 6.5° Pisces, 2nd house;
    `money.actions[1]`.
- Phone: cards stacked. Desktop (≥ 900 px): side by side, the rows in the same order in both.
- Same placement as today: after the home hero, and at the end of /sample.

### 2. Picked by hand, checked by a test
- `differences.ts` names each card's pieces: the house number, the moment and the plain sentence as text, the chapter
  and action index, and the chip placements. The check is read with the existing `splitReading`. No rule picks them.
- `differences.test.ts` asserts each sentence is in that house's reading byte for byte (after `plainProse`, as the
  card prints it), the action and why match the chapter's, and that every chip is a placement the run's
  evidence prints and that the body named in it is in that house, and that the moment holds no planet, sign or
  house name. The import throws if a piece is missing, so a run without them fails the prerender (as today).
- When /sample moves to a Release run (`review-02-10` scope "sample from each passing Release"), the same pull
  request picks the four pieces again by the rule in Acceptance 5. The cards never quote a run /sample does not show.

## Out of scope
- New words on the site about the chart (ADR-18): every line on a card is the stored run's.
- A third card, counts, or a CTA inside the section.
- The report's own house cards and chapters: unchanged.
- A marketing post in this format: the Content board already holds the annotated-line idea; the card can join it
  at the next `/marketing`.

## Acceptance criteria
1. At 390 px the section shows the lede and two cards with four rows each. Nothing overflows, and the second card's
   tick box is reachable without opening anything.
2. At 1440 px the two cards sit side by side with matching row order.
3. Every sentence, check, action, why and chip label on the cards is found word for word in the committed sample
   run, by test.
4. Each card's action answers its own moment: for A, the work card's action is a career action about recovery, and
   the spend card's action is a money action about capping comfort spending. Checked by the Owner on the preview.
5. The pick rule, written in `differences.ts`'s header for the next refresh: an everyday moment with no astrology
   in it, the same house's plain sentence naming its placements, that house's Behaviour check, and the chapter
   action that answers the check.
6. Ticks persist only in the page (`localTicks`) and nothing is sent.
7. /sample's closing band shows the same two cards.
8. Typecheck, both builds, unit tests, `check:shipped`, CSP hashes unchanged or rewritten, Vercel preview smoke,
   axe on home and /sample.

## Screens
The artifact: before and its three faults, A (chosen) and B at 390 px with a "where each line comes from" toggle, A at
desktop, and the pick-and-test rule. https://claude.ai/artifact/ELwG7Aa1VLr5v5cgrRMGRG

## Open questions
None. Q1 answered by the Owner 2026-10-03: A, How you work and How you spend ("go with A").

Settled without asking: the Behaviour check stays (the Owner asked for it by name, 2026-10-03); two cards, not
three (playbook: shortest version first); the report's own pieces only (playbook: one kind of thing, one look).

## Decisions to record
1. The section after the hero shows two workbook cards from the sample run, each with the moment, its placements
   with the house's plain sentence, the Behaviour check and the answering action with its tick box (amends ADR-218,
   ADR-173).
2. The cards' pieces are picked by hand and checked word for word by a test. No rule picks them, and they are
   picked again in the pull request that refreshes /sample.
3. The two pages are How you work (house 6, the career chapter's action) and How you spend (house 2, the money
   chapter's action).
