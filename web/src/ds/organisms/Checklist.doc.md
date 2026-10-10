# Checklist

## Level
Organism.

## Replaces
`components/report/Checklist.tsx` (deleted at R20's sweep): RP22 and CP13, every thing to try in both reports, /sample, the Differences cards and the dashboard's practising list.

## Use it for
- A heading in the list's colour (the chapter accent, teal outside a report) over rows, each a surface card with a TickBox, the action, and the why as its own sentence.
- `pinnable`: a pin beside each row, three per report (ADR-174).

## Not for
- A counter, a toast or anything that announces a tick: a tick is silent and a box unticks (ADR-48).
- Folding the list away (ADR-24).

## Props
Today's: `heading`, `items`, `store`, `pinnable`. `whySentence` and `localTicks` are exported as before.

## States
Unticked; ticked (filled in the list's colour, the void check stays); disabled without a store; pinned (filled brass pin); the pin's tooltip on hover or focus; the status line after a press, "Pinned. …" for 6 s or the limit line until the next press.

## Access
- The box is a real checkbox named by its action, with a 44 px tap area; the pin is a 44 px tap with "Pin to your dashboard" or "Unpin from your dashboard".
- The list is labelled by its heading. The status line is a `status` region for pins only.

## Live example
`Checklist.example.tsx`, at `/admin/design`.
