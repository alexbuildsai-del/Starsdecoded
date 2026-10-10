# StatusDots

## Level
Atom.

## What it replaces
W1 and W2: the three dots after a word wherever a button or row is busy (Writing, Starting, Paying, Stopping) and the checks on the gift claim and admin pages. W3 becomes a busy Button.

## Use it for
- Inside a busy button, a busy row, a short wait.

## Not for
- A full-screen wait: use the Loader.
- A wait with real steps: use a loading story or the progress bar.
- A spinner, ever.

## Versions
One: `label` and three dots in the current text colour.

## States
Moving (the dots pulse in turn) and still (reduced motion: the dots stay, at 70% opacity).

## Access
- The word is always there; motion is never the only sign.
- `role="status"` with `aria-live="polite"`; the dots are hidden from assistive tech.
- prefers-reduced-motion: everything still.

## Do
- Name what is happening in one word.

## Don't
- A percentage nobody can compute, a disabled idle verb, the Loader inside a card.

## Live example
`StatusDots.example.tsx`, at `/admin/design`.
