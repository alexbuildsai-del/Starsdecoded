---
name: web-taste
description: Design taste for Stars Decoded web pages, screens and artifact mocks. The design system's colours, type, motion and layout, the look that makes it ours, and the generic AI-made patterns to avoid. Use before designing, building or reviewing any page or mock, when the Owner types /web-taste, or when a page is called generic, busy or AI-looking. Pairs with ux-copy, which owns the words.
---

The target is the text after the command: a page, a URL or a mock. With none, review
what this session designed.

Read first: MASTERFILE §9, the tokens in `web/src/index.css` (the report tokens and
`--ease` near the end), `web/src/lib/chapter-accent.ts`, `docs/specs/locked/logo.md`
and `docs/specs/locked/natal-report-ui.md`, the Observatory direction every page follows.

**What makes it ours.**
- **The picture is the chart.** Every wheel, plate and degree is drawn from computed
  data at its true position; crowding moves a body inward, never around (R-3.1, §9).
- **Analytical, not mystical.** Precision is the brand signal: mono tabular numerals
  for every degree, orb and coordinate, the method visible, claims literal.
- **Consistency over novelty.** Extend the tokens; no new colour, font or radius.
  Dark only: void #06080C, ground #0D1117, surface #11161F, line #242C3B, paper
  #E8EBF2. Indigo #5C6BC0 is the control, violet #9575CD the pair, brass #D4B06A
  measured geometry and never a control. Element and chapter hues are data only.
- **Type does the hierarchy.** Newsreader 400 for display and ledes, Inter for body
  and UI, Space Grotesk for labels, IBM Plex Mono for numbers. Two sizes per block.
- **Bodies are bodies.** The planet renders sit at their degrees and are never UI or
  decoration. The mark is the ring, the horizon line and the brass point, no gradient.
- **Motion is budgeted.** One easing, `cubic-bezier(.16,1,.3,1)`. One big moment per
  page; after that, motion only explains (a rewind shows time passing) or confirms.
  Reduced motion is a real state: complete and still at first paint.
- **One register, two tempos.** Marketing uses the product's look, not a campaign
  look. Reading pages are slow and airy; dashboards and admin are dense.

**Generic patterns to avoid.** Gradient text; glass cards everywhere; purple blobs;
sparkles, crystal balls, tarot or glowing zodiac wheels as decoration; glyph soup;
cards inside cards; everything centred; icons in coloured squares; a badge on every
line; text over busy backgrounds or faded text behind content; loops that never stop;
scroll-jacking; fake counters, logos, reviews or testimonials; typed numbers where
code should supply them.

**Check before handing over.**
- At 390, 768 and 1440 px: no sideways scroll, nothing overlapping, every field wide
  enough for its value (a time shows AM or PM), inputs 16 px on a phone.
- Body text meets AA contrast; focus is visible; every control works by keyboard.
- Each section has one job and one focal point; cut what doesn't help the reader
  understand or act.
- The words pass `ux-copy`.

A review answers with the problems first, most visible first, each with its fix and
the rule it breaks.
