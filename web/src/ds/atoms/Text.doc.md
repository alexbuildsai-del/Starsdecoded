# Text

The Inter body styles. Each is a name, so no page picks a size between steps.

## Use it for
- `prose` for the report (15 px, line 1.74).
- `ui` for forms, sheets and rows (14 px, the default).
- `small` for card body text (13.5 px).
- `caption` for notes and small print (12 px).

## Props
- `style`: `"prose" | "ui" | "small" | "caption"`.
- `as`: any tag. The default is `p`.
- `className` for the colour; the default is `paper-dim`.

## Don't
- A size between steps, such as `text-[13px]`.
- A degree, orb or time in Inter: use Numbers.
- Text under 11 px.

## Accessibility
- `paper-dim` on `ground` passes 4.5:1. Use `text-paper` for the most important line.
- The `button` and `button-compact` styles are set by Button, in Inter 500.

## Versions today and after
Report body, sheet text, card text and notes each take one of the four. Sizes of 12.5, 13, 14.5 and similar snap to the nearest step.
