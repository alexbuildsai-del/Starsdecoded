# Button

## Level
Atom.

## What it replaces
`ui/button` (shadcn, cva) and the site's `.sd-btn`, `.sd-btn-g`, `.sd-btn-sm`. Today's examples: B1, B2, B4, B5, B7, B8, B12, B14, B16, B17. The compact size takes B9, B10, B15. The unused destructive, outline, ghost, link and icon variants go. B18 (the skip link) is kept as it is.

## Use it for
- Primary: the one main action of a view (Get my report, Pay, Write my report).
- Secondary: another action of the same weight (Read a sample, Back).
- Danger: only inside a confirm window (Delete report).
- Compact: an action inside a list row or a small sheet.

## Not for
- A small action beside its status, like Share: use TextButton.
- Picking one of a few views: use SegmentedControl.
- Going somewhere inside text: a link.

## Versions
- `variant`: primary, secondary, danger.
- `size`: default (46 px, Inter 500 15 px) and compact (36 px, 13.5 px).
- `full`: the width of its row, for a phone.
- `busy`: a status word; the verb becomes the word with three dots.
- `asChild`: the look on a link.

## States
Rest, hover (`indigo-hover` fill for primary, an `indigo-lt` edge for secondary), pressed (scale .97 in 150 ms; still under reduced motion), focus (2 px `focus` ring), busy. Avoid disabled; say what is missing instead.

## Access
- 46 px tall; compact is 36 px seen with a 44 px tap area through an invisible margin. Keep 8 px between two compact buttons.
- White on `indigo` is 4.9:1; the hover fill is lighter (see the report: 4.0:1). `paper` on ground 15.9:1; `error` on ground 8.7:1. Edge `control-edge` 3.3:1.
- A busy button keeps its accessible name: the status word, announced as a status.
- Works with the keyboard; focus always shows.

## Do
- One or two main buttons per view. Same weight, same size; only colour differs (ADR-333).
- Stack full width on a phone.

## Don't
- A small boxed button under a big one, brass on a button, a new height or colour for one screen.
- A greyed-out idle verb for busy.

## Live example
`Button.example.tsx`, at `/admin/design`.
