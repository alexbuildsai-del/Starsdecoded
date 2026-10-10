# Input

One text field: 48 px, `ground` fill, `control-edge` edge, 16 px text, the label above in the `label` style.

## Use it for
- Every one-line text field: names, email, the birth date and time and place, the admin forms.
- The label is optional here. Leave it out only when the page already labels the field (`aria-label` then).

## Props
- `label`, `hint`, `error`: the line above, the line under, and a rose line under that also marks the field invalid.
- Any `input` prop. Enter does nothing here: the page's form decides what Enter means.

## Don't
- A field label in a different style from its neighbours.
- Under 16 px text: a phone zooms into it (ADR-171).

## Accessibility
- Edge `control-edge` is 3.3:1 on `ground`; text and placeholder pass 4.5:1; invalid uses `error` (not colour alone: the line says why).
- Focus draws a 2 px `focus` ring, offset 2 px.
- `hint` and `error` are linked with `aria-describedby`; `error` is `role="alert"`.

## Versions today and after
F7 shadcn default input (36 px, no fill) and F8 the birth form's name field (the entry look): one Input.
F5 the waitlist's `.wl-fld` field and F6 Share's read-only link box: Input and Input with a button.
