# SegmentedControl

Level: molecule. Two to four views of the same content; the picked one sits raised.

## What it replaces

B13: three identical copies (Your week, Timeline, the dashboard) and Now and ahead's near copy. The track `#0B0F15` becomes `ground`; text 12.5 becomes 13 px.

## Use it for

Week, Month, 6 months; Circle, People, Compatibility; the Timeline phone tabs.

## Not for

- Actions: use Button.

## Versions

One. Two to four segments.

## States

Picked (`raised`, `paper`), not picked (`muted`), hover (`paper`), focus (a ring in `indigo-lt`).

## Access

Each segment is a button with `aria-pressed`, 36 px tall inside a 44 px tap area. Left and Up pick the previous segment, Right and Down the next, and focus follows. Enter and Space press the focused segment and never submit a form around it (`type="button"`). Only the picked segment is in the tab order.

## Do

- Give the group an `aria-label` that says what the views are of.

## Don't

- Use it for more than four views.

## Live example

`SegmentedControl.example.tsx`, at `/admin/design`.
