# TextButton

## Level
Atom.

## What it replaces
B6 (text-only buttons: Back to today), and the dashboard nav's B3 text actions.

## Use it for
- Share beside a card's main button.
- Back to today, Try again, Reload.

## Not for
- The main action: use Button.

## Versions
One: `indigo-lt` text, Inter 500 13.5 px, no box. `asChild` for a link. `bare` drops the look for a control that carries its own class (the site's tabs, a citation, a chart's stop), so the class is not overridden.

## States
Rest, hover (`paper`), focus (2 px `focus` ring), pressed (scale is not used; colour only).

## Access
- 32 px seen, 44 px tap area through an invisible margin.
- `indigo-lt` on ground is 8.2:1.

## Do
- Put it at the far end of the row, at least 24 px from the main button, or on its own line under its status (ADR-333).

## Don't
- Put it right next to the main button.
- Box it.

## Live example
`TextButton.example.tsx`, at `/admin/design`.
