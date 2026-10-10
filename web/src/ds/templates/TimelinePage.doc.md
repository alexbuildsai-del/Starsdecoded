# TimelinePage

Level: template. The public Timeline page.

## What it replaces
The Timeline site page's hand-built shell.

## Slots
`header`, `intro` (kicker, title, lede), `dial`, `cards` (Card, tone version, with Chip and ToneDot), `closing`, `footer`. No data.

## Use it for
The public Timeline page and its sample.

## Not for
The signed-in Timeline (AppPage).

## States
Static. Cards stack on a phone and sit two across from 768 px; the dial is centred and keeps its own size.

## Access
The intro holds the `h1`. Cards are a list of regions; their order is the reading order.

## Do and don't
- Do let the dial keep its size on every width.
- Don't draw a second dial or a box around the cards.
