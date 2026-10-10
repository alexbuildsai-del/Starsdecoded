# Eyebrow

The small capital label that names what a title is about. It is quiet so the title leads.

## Use it for
- Over a card title: `label`, in `label-dim` grey by default.
- Over a section or page title: `kicker`, in `indigo-lt`.
- A chart fact takes `text-brass`; good and hard take `text-teal` and `text-rose`.

## Props
- `kind`: `"kicker"` (11 px, .24em) or `"label"` (11 px, .16em, the default). Space Grotesk, uppercase.
- Any `span` prop, and `className` for the colour.

## Don't
- More than one per card.
- A sentence: two to four words.
- Under 11 px.

## Accessibility
- Both styles are 11 px, Apple's smallest text size, and both colours pass 4.5:1 on `ground`.
- It is a `span`, not a heading: the title below it carries the structure.

## Versions today and after
K1 public site section: kicker, indigo-lt. K11 Did you know: label, brass. K5 and K9: label, indigo. K8 Your week: label, brass.
K12 pair block: kept. K7 sheets: kicker, indigo-lt. K2 report boxes: label in the chapter colour. K3, K6, K13, K14: label, muted.
K10 houses: label, brass. K4 mono tags move to Numbers `data-sm`.
