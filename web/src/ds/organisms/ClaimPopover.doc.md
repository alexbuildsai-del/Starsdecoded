# ClaimPopover

The small raised card that shows the chart fact a sentence rests on, opened from its number.

- `ClaimPopover { index; claim }` draws the number mark and its card. `EvidenceCard { claim }` is the card's body alone (the sample page and the reference check use it inside their own `.rp-card`).
- `Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverAnchor` are the Radix parts in the house look (`raised`, `line`, `shadow-raised`).
- States: number at rest, number being read (filled indigo, white number), open.
- Desktop: opens on hover with a 160 ms grace to reach the card, and on click or Enter. Placed above the mark, below when there is no room. Escape and an outside click close it. Focus stays on the mark.
- Phone or touch (coarse pointer, or 720 px or narrower): the same card in a bottom Sheet, 70% of the screen at most, scrolling inside. The Sheet traps focus, returns it to the mark, and closes on Escape.
- The mark's hit area reaches 7 px past the number on every side; it is hidden in print.
- Show the fact in mono, then one plain line, then the references. One card open at a time.

Fates: O20 the standard citation card. O21 (the revised sentence card) becomes the revised state; it keeps its own file, `RevisedText.tsx`, until group 3.
