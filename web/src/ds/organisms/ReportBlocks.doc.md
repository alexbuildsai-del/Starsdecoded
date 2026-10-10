# ReportBlocks

## Level
Organism.

## Replaces
`components/report/HouseBlocks.tsx` (now a one-line re-export): RP28, the blocks under a house reading.

## Use it for
- Inside a HouseCard, between the reading and Does this sound like you?, in R19's order: Often noticed, the stellium block, one block per body going backwards (ADR-396 to 403).
- `StelliumChip`, the brass chip in the card's header.

## Not for
- The chapter head, prose blocks, the pull quote and the chapter rail: the Design System's ReportBlocks card shows them, and they stay in their own files for now.
- An "Opposite:" line or the generic retrograde line.

## Versions
- Often noticed: ✦ in an `indigo-lt` circle, "Why:" run in.
- Stellium: the count in a `brass` circle, "To balance it:" names the house across with its word.
- Going backwards: the RetrogradeBadge in `back`, heading "Saturn is retrograde here".

## States
Each block draws only when the report stored it; the stellium block also needs the engine's bodies. A report before v12 stores none. In print each colour swaps to a darker version.

## Access
- Badges are hidden from assistive tech; the heading says the same in words.
- Headings 12 px, words 13.5 px (14 px whole).

## Live example
`ReportBlocks.example.tsx`, at `/admin/design`.
