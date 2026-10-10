# InlineError and Alert

Level: molecule. InlineError is one line in `error` under the field it is about. Alert is a box when a whole action failed.

## What it replaces

Six today versions: X1 (27 places), X2 (7), X3 (5) become InlineError; X4 (5) and X5 (4) become Alert. X6, Timeline's `#D98C8C` for going back, is not an error and stays as it is.

## Use it for

- InlineError: a field or a small dialog said no, in `role="alert"`.
- Alert: the payment, the Ask panel, an admin form; `tone="error"` (role alert) or `tone="notice"` (role status).

## Not for

- Going back in Timeline; that is `back` or rose, not `error`.

## Versions

InlineError; Alert error; Alert notice.

## States

One state each. They appear when something fails and leave when it is fixed.

## Access

`error` on `ground` and `surface` passes 4.5:1. Colour is never the only signal: the sentence says what went wrong. InlineError takes an `id` so the field can point at it with `aria-describedby`.

## Do

- Say what went wrong and how to fix it.

## Don't

- Say sorry.
- Use red.

## Live example

`Alert.example.tsx`, at `/admin/design`.
