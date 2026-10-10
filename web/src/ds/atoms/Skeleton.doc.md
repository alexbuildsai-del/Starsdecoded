# Skeleton

The lines of a chapter that is still being written, with a slow sweep of light and a breath of opacity.

## Use it for
- A report chapter not written yet (W4), in the Personal and the Compatibility report.

## Props
- `caption`: the words under the lines; also the accessible name.
- `lines`: 4 or 5 (5 by default). Widths are fixed so the block never jumps.

## Don't
- A skeleton for a wait under 3 s: use StatusDots.
- A spinner.

## Accessibility
- `aria-busy` and an `aria-label` from the caption. Reduced motion holds the lines still, with no sweep.

## Versions today and after
W4 kept as is. CycleCard's `animate-pulse` becomes this breath and sweep (M35).
