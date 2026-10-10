# AdminPage

Level: template. The dense tempo, for the admin, from the same parts.

## What it replaces
The admin shells in Prompts, Lab, Sales and Waitlist.

## Slots
`header` (TopBar with the Admin label), `title`, `toolbar` (tabs or filters), content as children. No data.

## Use it for
Every `/admin/*` page.

## Not for
Anything a buyer sees.

## States
Static. Width is 80rem and gaps are 12 px.

## Access
`title` is the page's `h1`; tabs in the toolbar are real tabs or links.

## Do and don't
- Do use Card, Alert and Well for the content.
- Don't invent an admin-only box.
