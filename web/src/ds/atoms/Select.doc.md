# Select

A native `select` in the Input's look: `ground` fill, `control-edge` edge, 44 px tall, a chevron on the right.

## Use it for
- Choosing one of a short list: the part of the day, the parent, "do you know".
- The admin pages' pickers.

## Props
- `label`, any `select` prop and `option` children.

## Don't
- A custom list: the browser's own opens, so a phone gets its wheel and the keyboard and screen readers work as they do everywhere (ADR-439).
- Use it inside the birth form where the spec turns a select into pills (F3).

## Accessibility
- 44 px tall; edge 3.3:1; 16 px text; focus draws the 2 px `focus` ring.
- The chevron is decoration (`aria-hidden`) and takes no click.

## Versions today and after
16 native selects with 5 different class lists become one Select.
