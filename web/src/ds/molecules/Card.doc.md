# Card

Level: molecule. One card in four versions; it reads top-down: a quiet label, a big title, the body, the numbers, the actions.

## What it replaces

92 card recipes and 6 CSS card classes (C1 to C13, C16). C12, the signed-out banner on the report, is Removed.

## Use it for

- surface: most cards, on `ground` (C9, C7, C8, C10, C5, C2).
- glass: over the sky; report boxes, site link cards, Your week, the hero panel (C1, C3, C6, C13).
- tint: the one thing to notice on a screen, such as the recommended plan.
- tone: a Timeline transit, its edge in its tone (C4, C16).

## Not for

- A box inside a card: use Well or Strip.
- A whole section: sections have no box.

## Versions

surface, glass (alpha .6), tint, tone (3 px left edge in rose, brass, teal, back or indigo-lt). `large` gives the hero panel its 20 px corner. Titles are 20 px in a wide card and 17 px (`size="sm"`) in a narrow grid card. Padding is 16 px on a phone and 20 px from 640 px.

## States

A card is not interactive. A link card puts one link inside, with its own focus ring.

## Access

Title is a heading (h3 by default); label and data text pass 4.5:1 on `surface`; the card sets no tap size, the buttons in `CardActions` carry their own 44 px.

## Do

- Label (`label-dim` or a meaning colour), then title, then body, then data, then actions.
- Main button left, Share at the far end of the row (`CardActions share`).
- Let the content set the height.

## Don't

- A card inside a card.
- A shadow on a card.
- A second tint card on one screen.

## Live example

`Card.example.tsx`, at `/admin/design`.
