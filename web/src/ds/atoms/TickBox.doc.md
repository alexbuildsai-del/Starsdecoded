# TickBox

An 18 px box in `indigo-lt` before a thing to try. Ticked, the box fills `indigo` and the check stays drawn.

## Use it for
- Every thing to try: Practice, Try together, pinned items.

## Props
- `checked`, `onChange(checked)`, `label` (the accessible name, today's words), `disabled`, optional `children` beside the box.

## Don't
- A counter of ticks, a toast, a sound or a live region: a tick is silent and the box unticks.

## Accessibility
- The row is at least 44 px tall and wide; the box sits in it.
- A real `checkbox`, so Space ticks it and the screen reader says checked or not checked.
- Focus draws a 2 px `focus` ring.

## Versions today and after
Checklist.tsx:131: a 20 px box with a 40 px label, `#6E7789` edge, ticked in the chapter colour: one TickBox, 44 px.
