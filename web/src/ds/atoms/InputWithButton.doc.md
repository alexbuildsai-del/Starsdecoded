# Input with a button

An Input with its button beside it at the same 48 px height: Join the waitlist, Share. Below 640 px the button drops under the field, full width.

## Use it for
- A field whose one job is the button next to it.

## Props
- `button`: the button node. It keeps its own `type` and `onClick`.
- Every Input prop (`label`, `hint`, `error`).

## Don't
- Wire Enter here. Enter must never do something the reader did not aim at (R14-12): the waitlist sits in a `form`, so Enter joins; Share has no form, and Enter there adds an address as a chip and never shares or closes.
- A second field in the row.

## Accessibility
- Tab goes field, then button. The button has its own accessible name (today's words).
- The label names the field, not the button.

## Versions today and after
Waitlist (FL47) and Share (FL29): the field and button are kept beside each other; the field takes the one Input look.
The chip box in Share (F6) keeps its chips and its own keys and is not this part.
