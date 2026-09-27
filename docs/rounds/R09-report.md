# R09 report — Review 25 Sept: the ringless pair hero, two charts side by side, the ledger, one word per house, plain prose in v7

Built 2026-09-26 on `round/R09` from `docs/rounds/R09-plan.md` (`review-25-09.md`, ADR-97 to 106). Fourteen cards, one commit each, wave A
then wave B. **Every card is USER-FACING**: R09-01 and R09-02 change report words (a brain change, R-5.5); the rest change what a reader sees.

## Mailbox rows open more than two rounds
At 8: MB-5, 6, 8, 11, 12, 13, 15, 17, 19, 20, 21, 22, 23, 24, 25, 30 · at 7: MB-31 (blocking, the legal entity), 33, 35 · at 5: MB-43, 47, 49, 50 ·
at 4: MB-55, 57, 58, 59 · at 3: MB-64, 65, 66, 67. None blocked a card. **MB-75** (`GITHUB_RELEASE_TOKEN` on Railway staging) stays the todo before
any production release.

## Shipped
- **R09-01** rule 3 keeps evidence in the claims field and rule 8 opens on the shape of a prose field; `PAIR_DOCTRINE`'s bullet; the natal foundation,
  Overview and Mind reworded; the link cards sit "under the two charts"; chapter 01 opens on the ledger premise and no strong line names its chapter
  (ADR-104, 106); tests pin every text and that no prompt names a bi-wheel or a legend — USER-FACING (brain).
- **R09-02** `PROMPT_VERSION` v7; `scripts/src/prompt-families.ts` names three families and the bootstrap reset loops them, so a natal bump also clears
  every `:system` override, natal and pair; p2 kept, a pair `:user` override survives — USER-FACING (brain).
- **R09-03** the page renders v6 and v7 (`RENDERABLE_PROMPT_VERSIONS`); v5 and older keep the regenerate call (MB-45) — USER-FACING.
- **R09-04** `HOUSE_WORDS`, `houseWord`, `houseWithWord`, `withHouseWords` beside `HOUSE_NAMES`; the ruler gloss reads "in the 11th (friends)" (ADR-98) — USER-FACING.
- **R09-05** the counter is "04 / 10" alone; a chapter takes an `intro` under its rule (ADR-100, 103) — USER-FACING.
- **R09-06** every wheel's band names its houses on two lines ("9 · BELIEF"), the number ring gone, the band widened and the lanes moved in with every
  body at its degree; `centreName` stands a wheel alone with the name and "Rising 12°04′ Capricorn" in the centre, no aspect lines (ADR-97, 98) — USER-FACING.
- **R09-07** the pair hero is one centred group: the eyebrow with no method line, each name once over its three rows, AND between, side by side from the
  measured width; a row carries the house's word, a banded Moon reads "10.20°–22.85° Pisces", print draws no ring; the ringed plate moves to
  `TriadPlate.tsx` for the dashboard sky card (ADR-99, MB-86) — USER-FACING.
- **R09-08** the evidence sheet, the revision chips, the natal hero's ring labels and legend and the print placement rows carry the house's word; the
  hero's label box re-measured to 276 px for "29.99° Sagittarius · 7th (partnership)" — USER-FACING.
- **R09-09** `TwoChartsLedger` and `lib/ledger.ts`: Naturally strong in teal and Will take work in rose, a glyph per cross link the line's claims cite
  (straight, brass for a touch, teal for a flow, the rose zigzag for work), a chip to the lens chapter whose claims cite the link (MB-89 provisional), the
  paradox across, the pointer; a glyph scrolls its link card into view and focuses it; `linkTitle` carries the word (ADR-101) — USER-FACING.
- **R09-10** the type-only share card, 1080 × 1350, drawn once the fonts load and shown on the page with "Send it to {recipient}.", Share the card or Copy
  image, and Save image; no wheel, placement or number; no request carries it (ADR-102) — USER-FACING.
- **R09-11** Going in, the scene introduced under its kicker, What just happened opening on the pair line; `ScenesIntro` under chapter 02's title (ADR-103) — USER-FACING.
- **R09-12** `plainProse` runs first in `CitedText`: asterisks and a placement-only line go, a pass's paragraphs keep their blank line (ADR-104) — USER-FACING.
- **R09-13** the Closing's first line sits under its rule: `md:pt-14` and the pull quote's top rule and padding gone (ADR-105) — USER-FACING.
- **R09-14** the pair page: two wheels side by side from 640 px, the ledger, the share card, the link cards, each a skeleton while its section writes;
  the bi-wheel, its layout and test, the legend and the page-level print header deleted; the counter takes the chapter list's length — USER-FACING.

## Deviations
- The Agent tool was unavailable (plan risk 11): the orchestrator built all fourteen cards itself in card order, wave A then wave B.
- The hero's columns sit side by side from 828 px (two measured 354 px columns, the AND, the padding), so a tablet in portrait stacks them as a phone does.
- `plainProse` keeps a label that carries a verb outside the vocabulary ("Venus rules the 10th and sits in …"): a sentence stays, as the card's safety rule asks.
- Docker was unavailable: the container's own postgresql-16 package served as the scratch Postgres, started for the gate and stopped after.

## Gate
Green: `pnpm install --frozen-lockfile` · typecheck · `build:web` · `build:api` · tests (web 130, api 239, db 9, scripts 8; baseline 110/236/9/6) · codegen
leaves no diff · `db:bootstrap` three times on a scratch Postgres 16 as R09-02 states: fresh (the three families seeded v7, p2, v7); then set as staging stands
with `natal:overview:system`, `pair:links:system` and `pair:links:user` inserted, the run removed one natal and one system row and kept `pair:links:user`; the
third reported every family already seen (a dummy `OPENAI_API_KEY`, MB-80's default). **Dry lab**, in process, no network, the r06 runs fetched from the public
branch and never committed: 69 prompts (60 natal on five charts, 9 pair on `curie-winfrey`), usage recorded 0, every schema strict; against the same dry run on
`main` at the branch point, input tokens up by the new text alone: +108 a natal section, +131 to +153 the foundation, +153 to +155 a pair section. Rules 3 and
8 sit in every natal and pair system prompt and the links prompt says "under the two charts". **Nothing generated; no paid call.**

## Mailbox
Done: MB-63 (ADR-102, built in R09-10), MB-88 (ADR-106, built in R09-01). MB-86 carries R09's facts for the dashboard sky planner. Open at its default with its
seam tagged: MB-89 (`web/src/lib/ledger.ts`). MB-80's default used on scratch. Nothing new raised.
