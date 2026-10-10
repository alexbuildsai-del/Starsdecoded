# Well

## Level
Molecule.

## Replaces
C11: the box for what comes naturally to two people (dashboard quick look "With you", Your pairs). Three hand-made boxes with 12 px corners and a `#0D1117` fill become one.

## Use it for
- A group of lines inside a card that belongs together, such as a label and its list.

## Not for
- A card inside a card. A Well is the only ground box allowed inside a card.
- A chart at a glance (C14 keeps no box).

## Versions
One. Ground fill, `line` edge, corner `control`, padding 14 px.

## States
Static. It holds content; it has no hover, focus or press of its own.

## Access
- Its text uses `paper` or `paper-dim` on `ground`, above 4.5:1.
- The edge is decoration only, so it needs no 3:1.

## Do and don't
- Do put a Well inside a card with the card's own label above it.
- Don't put a Well in a Well, or a Strip in a Well.
