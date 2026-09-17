# R03 report — the wheel becomes a chart, claims cite in place, Observatory lands

Ran 2026-09-17 on `claude/great-rubin-2ernfv`; no round branch was cut. Built as
R02 and renumbered on merge, because `main` landed its own R02 (usage telemetry)
meanwhile; card ids below are unchanged. Plan: `docs/rounds/R03-plan.md`. Spec:
`docs/specs/locked/natal-report-ui.md`. Mailbox rows open above 2 rounds: none.

## Shipped

- **R02-01 Observatory tokens** — INTERNAL. Newsreader for display, IBM Plex
  Mono for the mono token, Space Grotesk still the label face, `--brass`, a
  `.font-numeric` utility, a base reduced-motion block, font import subset (MB-42).
- **R02-02 Weight-300 sweep** — INTERNAL. Every `font-display font-light`
  heading outside the report page and the Clerk header's Noto Serif; every
  degree, orb, latitude and longitude moved to `.font-numeric`.
- **R02-03 Claims cite in place** — USER-FACING. The block that reprinted a
  paragraph's own quote is gone; claims are marked where the model wrote them and
  carry a numbered superscript whose card lists the same verified
  `evidence[].label` strings plus one glossary line, numbered per section.
  `OverviewBlock`'s headline drops to `text-2xl` so the section title outranks it.
- **R02-04 The wheel is drawn from the chart** — USER-FACING. A pure geometry
  module plus `NatalWheel`: true degrees, three inward lanes for crowding, leader
  lines to real ticks, sign names, a house ring, orb-weighted aspects, quadrants
  in words, degrees on hover, a house selected by click or Enter, brass ASC and
  MC axes, DSC and IC derived as +180°.
- **R02-05 House cards** — USER-FACING. Type-led front; a back whose every word
  is `personalPlanets` or `angleMeanings`. An empty house reads through its ruler
  and says so; with nothing generated it says nothing.
- **R02-06 Hero, chapters, reduced motion** — USER-FACING. Opening plate with
  Sun and Moon at their true angles, the Ascendant an open marker, birth details
  in the frame, a legend under the ring below 640 px. Chapter shell of eyebrow,
  title, hairline, lede, 64 ch prose. `useReducedMotion` stops the moving parts.
- **R02-07 Page assembled, chrome demoted** — USER-FACING. Hero, twelve
  chapters, the wheel with a house card in its side panel, the house grid, a
  methodology footnote strip, two slide-overs. `radial-orbital-natal` is deleted;
  the landing page mounts the new wheel.
- **R02-07 Content removed** — USER-FACING. Twelve hand-written house
  descriptions and every invented angle fallback are gone (ADR-18), as told.
- **R02-08 Geometry asserted** — INTERNAL. `web/` gets `vitest` over the geometry
  module only, twelve assertions (MB-41 provisional).

## Deviations

- R02-02's file list missed `ClaimPage`, `MyPeoplePage`, `legal/LegalLayout`,
  `App.tsx`; R02-07's missed `LandingPage.tsx` and `data/demoChart.ts`. All
  carried what those cards' greps forbid, so all were swept. The demo chart
  derives `applying` from its longitudes rather than asserting it.
- Two shared files the plan did not name: `lib/planet-renders.ts` (one import
  site, the 90 px cap) and the house vocabulary in `evidence-glossary.ts`.
- All eight invented angle fallbacks deleted, not the two named: leaving six
  would have kept the UI writing prose about the reader. Dividers do not force a
  page break, so the PDF keeps its pagination.

## Gate, Mailbox, spend

Typecheck, both builds and the unit tests are green; `pnpm install
--frozen-lockfile` is clean after the `vitest` addition. No report lab and no
`db:bootstrap`: no card touched `api/src/lib/`, a prompt or the schema. MB-40,
MB-41 and MB-42 delivered at their defaults and moved to `done`; MB-13 still owes
`opengraph.jpg`; no new rows raised. Heavy round: eight cards, two full rewrites.
