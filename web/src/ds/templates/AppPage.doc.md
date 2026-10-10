# AppPage

Level: template. The working tempo: one content column under a fixed bar.

## What it replaces
The shell copied in the dashboard, account, Timeline and checkout pages.

## Slots
`header` (TopBar), `title` and `titleAside`, content as children, `corner` (Ask, fixed bottom right). No data.

## Use it for
Dashboard, account, signed-in Timeline, checkout.

## Not for
Admin pages (AdminPage), which are denser and wider.

## States
Static. `titleAside` wraps under the title on a phone.

## Access
`title` is the page's `h1`. The corner holds a 44 px target and clears the content by 96 px at the bottom.

## Do and don't
- Do keep one column at 56rem.
- Don't put a second fixed element in the corner.
