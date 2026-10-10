# Numbers

IBM Plex Mono with tabular figures for every degree, orb, coordinate, date in a row, price and percentage.

## Use it for
- `data` (12 px) in rows and cards.
- `data-sm` (11 px, uppercase, .14em) for small tags and captions.
- `stat` (28 px) for one big number.

## Props
- `size`: `"data" | "data-sm" | "stat"`. The default is `data`.
- Any `span` prop, and `className` for the colour.

## Don't
- A degree in Inter or Newsreader.
- Text under 11 px.

## Accessibility
- Tabular figures keep columns steady while values change, as in the loading bar.
- The 28 px `stat` is large text; the other two need 4.5:1, and `paper-dim` gives it.

## Versions today and after
K4 public mono tags: data-sm. W6 the loading bar's percent: stat, kept. The Methodology box degrees move from Inter to mono.
HouseDeck, HouseBlocks and HouseCard gain tabular figures.
