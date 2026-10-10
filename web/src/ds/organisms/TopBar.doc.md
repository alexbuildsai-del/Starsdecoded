# TopBar

## Level
Organism.

## Replaces
N1 to N6: the public site bar (kept as a version) and the ten copies of the signed-in bar (Dashboard, Account, Timeline, Report, Compatibility report, Birth form, four admin pages). Checkout's in-card header is the `checkout` version.

## Use it for
- `site`: sticky, 62 px, wordmark, links, Sign in, Get my report, phone menu.
- `app`: fixed, 56 px; left slot is the wordmark or "← Dashboard", right slot holds actions then the account menu.
- `admin`: app with the 17 px wordmark and "Admin" on the right.
- `checkout`: 56 px, not fixed.

## Not for
- Page navigation inside a page (ChapterRail, tabs).

## States
Solid by default; `seeThrough` over a report hero, solid once scrolled. Hover and focus belong to the slotted parts.

## Access
- One `header`; links in the centre slot sit in a labelled `nav`.
- Every button in a slot is a compact Button or TextButton: 36 px seen, 44 px tapped.

## Do and don't
- Do build the left slot from Wordmark or TextButton.
- Don't copy the bar into a page.

## Live example
`TopBar.example.tsx`, at `/admin/design`.
