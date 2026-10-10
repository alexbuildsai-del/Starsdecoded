# Loader

The full-screen wait before a page can show anything: sign-in, a route loading, opening a report.

## Use it for
- StatusDots in the middle of the screen for a wait under 3 s.
- A step bar (Progress) with its label for a wait over 5 s, fed by real work.

## Props
- `label`; `progress?: { pct; line }`; `className`.

## Don't
- Inside a card: use StatusDots there.
- A spinner.

## Accessibility
- StatusDots announces `label` politely; the bar is a `progressbar`.

## Versions today and after
W5 and R5 (App.tsx LoadingState) become the Loader.
