# Progress

The one bar, moved only by real work (ADR-394), with its percentage and what is being written.

## Use it for
- The report's opening story and the Timeline setup (W6).

## Props
- `pct`: 0 to 100, clamped. `line`: "58% · writing this month". `className`.

## Don't
- A made-up percentage or a bar that fills on a timer alone.

## Accessibility
- `role="progressbar"` with `aria-valuenow` and `aria-valuetext` from `line`. Reduced motion shows the bar without the slide.

## Versions today and after
W6 kept as is; was `ProgressBar`.
