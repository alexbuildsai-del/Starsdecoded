# Logo — locked spec (2026-09-18)

Status: locked 2026-09-18 by the Owner (A · Horizon, plain wordmark, all six surfaces). Artifact: https://claude.ai/artifact/CooaGybDudirhVvN128dgj
Mailbox: MB-7 (rename, strings done this session; domain still owed), MB-13 (opengraph.jpg owed).
Authority: MASTERFILE §9 (design system), R-0.4 (the name).

## Why now

The Astra strings left the code on 2026-09-18. What remains of the inherited identity is
visual: `web/public/logo.svg` (a gradient double ring on a navy tile, used only as the Clerk
sign-in badge), `web/public/favicon.svg` (a Replit orange square, so every tab today shows
an orange block), the nav wordmark in gradient text, a `✦` in the invite email header, and
no share image at all, so a shared link renders blank. One mark closes all of it.

## Scope

- One SVG source, `web/public/mark.svg`, drawn on the product's tokens: indigo ring
  (`--primary`), brass point (`#D4B06A`), no gradient, no tile. `currentColor` for the ring so
  a one-colour version is a CSS override, not a second file.
- `favicon.svg` becomes the mark on a `#0D1117` rounded square (tab backgrounds are not ours).
- `Wordmark` component (`web/src/components/Wordmark.tsx`, created by the rename) renders
  mark + "Stars Decoded" in Newsreader 400, foreground colour. The `gradient-text` class stops
  being used by the wordmark; it stays in `index.css` for the headings that use it.
- Clerk `logoImageUrl` points at the new mark on the dark tile (`logo.svg` is replaced, same
  path, so `App.tsx` does not change).
- `api/src/lib/mailer.ts`: the `✦` header becomes an inline PNG of the mark hosted on the web
  origin (email clients do not render SVG), 26 px, beside the name in Georgia.
- Print: the mark in one colour beside "Stars Decoded" at the top of the PDF header that
  `ReportHero` already prints. The filename is the page title,
  `{Name} - Natal Report - Stars Decoded.pdf` (shipped 2026-09-18).
- `web/public/opengraph.jpg`, 1200 × 630, exported from the artifact's share-card mock: mark
  and wordmark top left, one claim in Newsreader, brass corner brackets, a mono footer line.
  `index.html` gets `og:title`, `og:description`, `og:image`, `twitter:card`. Closes MB-13.

## Out of scope

- A light theme, an animated mark, a mark that changes per chart.
- The domain (MB-7 second half). The share card uses whatever host the smoke workflow uses.
- Marketing voice (Mailbox); the share card's single claim follows report voice rules.
- Planet artwork; the mark is geometry, never a body (§9 "planet renders are bodies").

## The three candidates

| | Mark | Reads as | Risk |
|---|---|---|---|
| **A · Horizon** (recommended) | Wheel, horizon line, brass Ascendant point at the east end | The one thing only a computed chart gives; matches "Ch. 00 / Horizon" | Compass or clock at a glance |
| B · Reticle | The hero's four corner brackets around a four-point star | "Decoded" said literally | The star is a body; corners thin out at 16 px |
| C · Ring of twelve | Sun glyph with the twelve whole-sign ticks inside | Closest to today's mark | Gear at 16 px; a circle-and-dot is generic |

Recommendation: A. It survives 16 px, prints in one colour with nothing lost, and its
meaning is the product's credibility claim rather than a mood.

## Acceptance criteria

- The tab shows the mark, not an orange square, on staging and production.
- The nav lockup is mark + Newsreader 400 wordmark, foreground colour, on every page that
  renders `Wordmark`; no `gradient-text` on the wordmark.
- A shared staging link previews with the share card (checked in a link-preview debugger).
- The invite email renders the mark in Gmail and Apple Mail (no SVG in mail).
- The exported PDF's first page shows the mark and wordmark in black at the top left, and the
  file saves as `{Name} - Natal Report - Stars Decoded.pdf`.
- `git grep -i astra` over `web/`, `api/`, `packages/` returns nothing.
- No new colour, font or radius token; the mark uses `--primary` and brass only.

## Screens

All in the artifact: the three candidates with 32 px, 16 px and print renderings; the six
applications (nav, tab, share card, email header, PDF header, Clerk badge) with a picker
that redraws every application with the chosen mark; the two wordmark treatments.

## Decided (Owner, 2026-09-18)

1. Mark: A · Horizon.
2. Wordmark: plain Newsreader 400, foreground colour, no gradient.
3. All six surfaces in one card; the share card closes MB-13.

## Decisions recorded (Notion Decisions, source "ideation: logo")

- The Stars Decoded mark is chart geometry drawn to the product tokens: indigo ring, brass
  Ascendant point, one-colour fallback. It is not a control, so brass on it is inside §9.
- The wordmark is "Stars Decoded" in Newsreader 400, foreground colour, no gradient.
- One SVG source produces favicon, nav mark, Clerk badge and print header; the share card and
  the email header are exports from it, regenerated whenever the source changes.
- The report page title is the PDF filename, `{Name} - Natal Report - Stars Decoded`, with
  hyphens because it is a filename. Already shipped; the row records it.

## Build shape (one card, when locked)

Files: `web/public/mark.svg`, `web/public/favicon.svg`, `web/public/logo.svg`,
`web/public/opengraph.jpg`, `web/public/mark-email.png`, `web/index.html`,
`web/src/components/Wordmark.tsx`, `web/src/components/report/ReportHero.tsx`,
`api/src/lib/mailer.ts`. No brain files, so no report lab. Gate: typecheck, both builds,
unit tests, smoke on the preview, a link-preview check of the share card.
