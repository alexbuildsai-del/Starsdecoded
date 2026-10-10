# SitePage

Level: template. The marketing tempo: slow, wide, one idea per section.

## What it replaces
The shell each site page builds by hand (artifact: SiteHeader, hero with kicker, sections, footer).

## Slots
`header` (TopBar), `hero`, sections as children (each a `SitePageSection` with a kicker, a title and one job), `footer` (Footer). No data.

## Use it for
Home, the Learn pages, the legal pages, pricing.

## Not for
Signed-in pages (AppPage), the report (ReportPage).

## States
Static. The page grows with its sections; the footer stays at the bottom on a short page.

## Access
One `h1` in the hero, one `h2` per section; the content width is 64rem with 20 px side padding at 390 px.

## Do and don't
- Do give each section one job and one title.
- Don't put a box around a section; cards go inside it.
