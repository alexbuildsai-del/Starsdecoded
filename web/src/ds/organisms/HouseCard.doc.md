# HouseCard

## Level
Organism.

## Replaces
`components/report/HouseCard.tsx` (now a one-line re-export): RP27, the phone deck's card and the desktop's whole card; RP32, the Add birth time card; and RP51, the planet row R19-48 removed, restored.

## Use it for
- One house in chapter 02, House by House: the house and its sign, the planet row, the full title (ADR-98), the chart ruler on the 1st or the quiet line on an empty house, the reading, its blocks (ReportBlocks), Does this sound like you?
- `AddBirthTimeCard` in the deck's place when the chart has no birth time.

## Not for
- The opposite house: it shows only as a stellium's "To balance it" (ADR-402). No "Opposite:" line.
- The generic retrograde line: that sits once under the wheel, never on a card (ADR-396).

## Props
Today's: `house`, `sign`, `occupants` (from `houseOccupants`, the row), `ruler`, `quiet`, `reading`, `stellium`, `blocks`, `whole`, `lit`, `className`. `planetRow(occupants)` is the row as data, so a test reads it without a browser.

## Versions
- Phone: first sentence, the rest behind Read the rest (a TextButton).
- Whole: desktop and paper, 28 px title, 20 px lead, every word shown.

## States
Lit (brass/35 edge) or unlit (scaled .97 at 55%, not under reduced motion or in print); collapsed or open; writing ("Still writing this card"); no birth time (the Add birth time card with its birthplace hint).

## The planet row
16 px planet renders; the brass Ascendant or Midheaven marker for an angle in the house; Chiron and the nodes as mono glyphs in `paper-dim`. No degree and no R: the degree lives on the wheel's chip, going backwards on the wheel and the R block. Each mark is named for the screen reader by the body's name. The row matches the wheel: a body sits on the card of the house the wheel draws it in.

## Access
- The card is an `article` named "1st house, Aquarius".
- Read the rest carries `aria-expanded` and `aria-controls`; its tap area is 44 px.
- Text 11 px and up; paper-dim and label-dim on surface pass 4.5:1.

## Do and don't
- Do pass the occupants from `houseOccupants`, so the row and the wheel read one source.
- Don't write astrological prose in the card: the words are the report's.

## Live example
`HouseCard.example.tsx`, at `/admin/design`.
