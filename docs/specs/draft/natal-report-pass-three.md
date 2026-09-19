# Natal report, pass three

Ideation 2026-09-19 with the Owner from the Notion page "Review Sept 19/09" (nine notes on the
R04 build on staging). Artifact, with the Owner's real hero angles and a live mock of the
opening: https://claude.ai/artifact/HKt4HYfKKmwadcKTmTxWob. Status: **draft**. Builds on
`docs/specs/locked/natal-report-pass-two.md` and supersedes its chapter list, its opening
moment and three smaller lines (below).

## Scope

### The Ascendant glyph (note 1)
- One `AngleGlyph` for every angle drawn as an occupant: an open brass ring with a tick at the
  angle's own place and a brass point at the tick's root. East tick for the Ascendant, top tick
  for the Midheaven. `OccupantMark`'s `angle` branch uses it; the hero's Ascendant marker is the
  same glyph. Same geometry as the Horizon mark (ADR-29). Nodes, Chiron and planets unchanged.

### Ticks without a counter (note 2)
- `Checklist` drops the "saved · n of m" line; `WorkbookStore.count` and `countTicked` go with
  it. Nothing else on a card changes when a box is ticked.
- Untick: `toggle` builds the patch from the rendered workbook, not inside the state updater
  (the eager-updater path is what let an empty body reach the API and a `{}` rollback wipe the
  page). The round reproduces the failure on staging first, then proves click → PATCH with
  `null` → merged response → reload, in both directions.

### Ten chapters, the last one Closing (notes 3, 4)
- `path` is retired from the generator: `api/src/prompts/sections/path.ts`, its registry entry,
  `PathSchema`, `SECTION_IDS` (eleven ids: ten chapters plus `houses`), `prompts.test.ts`,
  the `path` schema in `openapi.yaml` and codegen. `PROMPT_VERSION` v6, so bootstrap step 6
  clears the natal overrides on staging; the dead `natal:path` admin key is deleted.
- Web: `PathBlock`, `NodalAxis`, `nodal-axis.test.ts` go; `CHAPTERS` has ten entries, `TOTAL`
  10; `isCurrentInterpretation` learns the v6 shape so a v5 report is offered regeneration.
  House-card links for houses 5 and 11 go (they join 6, 8, 9, 12 in carrying none).
- The last chapter: eyebrow "Closing", title "What to Focus On" unchanged, section key `focus`
  unchanged, so `focus.ts` is not edited. The rail lists chapters only: the "Opening" entry
  goes, `active === -1` still means "on the hero", the plate's "Ch. 00 / Horizon" label goes.
- Accents: the fixed sequence walks on unchanged; chapter 10 takes teal. The closing's prose
  reads in paper (foreground), not the accent; the eyebrow and hair line keep the accent.
- Word range stays 3,500 to 5,500 (R04 lab: 5,054 to 5,388 with about 280 words of path).
  The lab runs on the five fixtures before the PR merges (R-4.4) and is pasted in the report.
- Bible prompt re-sync, release-log row USER-FACING, MB-8's count note becomes ten.

### The sun, free of the column (note 5)
- `.rp-dawn .sun` and `.warm` become `position: fixed` to the viewport's top right corner,
  driven by the same `--p`, same `min(560px, 82vw)` size, same translate curve; `overflow: clip`
  leaves `.rp-dawn`. Visible only while `--p > 0`; z-order under the chapter body, over the
  sky. Nothing but the screen crops it. Reduced motion: the final frame. Print: hidden as now.

### The door at 80% (note 5.1) — supersedes ADR-25's opening moment
- The generation screen becomes an overlay of the report page (`/generating/:id` redirects to
  `/report/:id`, which shows the overlay while the report is not yet open). One page, one sky:
  the `ReportSky` canvas is the loading starfield; the sixty framer-motion star divs go. The
  wheel of glyphs stays.
- **Progress is real**: 10 points when the chart is stored, then 90 ÷ 11 per landed section,
  read from `/status`'s `sections`. Labels: "Computing your chart" → "Reading the chart" →
  "Writing the chapters · n of 11" → "Your report is ready". Between events the ring creeps
  toward a time estimate capped below the next milestone; a landed section snaps it (Q3).
- **The door** appears at ≥ 80% (nine of eleven sections) and only once `overview` and
  `houses` have landed. Copy: "Start reading →" with one line under it naming how many
  sections are still writing (Q1). A reader who does not take it waits; at 100% the page opens
  by itself after a 1.2 s hold.
- **The opening**: the wheel shrinks and fades (350 ms); about 70% of the stars glide to a
  point on the hero's ring, 900 ms, one easing; the plate and its glow fade in over them
  (450 ms); the stars drift free. Transform maths in the existing paint loop, ≤ 150 stars, no
  DOM per star, under 1.3 s in total. Reduced motion: a 300 ms crossfade.
- **Skeletons**: a chapter not yet landed shows four to five rounded lines with a slow sweep of
  light and a breath of opacity, above the caption "Still writing this chapter"; the rail keeps
  "· writing". Streaming (`useLiveReport`, `/status` merge) is unchanged behind the door.
- **Export PDF** reads the same status the door reads and flips to "Export PDF" at complete
  without a reload. Reproduced with the API slowed before it is fixed.

### The scroll cue (note 5.2)
- 13 px label, `.34em` tracking, a 2 px stem 56 px tall with a chevron and a falling point of
  light, brass, the same breath. It is a button that scrolls to chapter 01 (44 px hit area);
  it still fades over the first half screen. Mobile keeps the flow variant at the same scale.

### One sky (note 6)
- `ReportSky` is fully present from `scrollY = 0`; the fade-in goes. Its blobs already take the
  opening's indigo and violet through the `opening` prop. `.rp-hsky` drops its own ground so
  the plate and the Sun glow sit on the sky. The gather animation depends on this.

## Out of scope

- The prose of any section but the removal of `path`; the focus prompt's North Node line stays.
- The landing page's section grid (MB-8); the logo branch merge (its own PR); MB-48's
  timezone offset, which is why the card reads 18.3° where the artifact read 19.07°.
- A true-alpha Sun export (MB-13); a real Chiron ephemeris; Placidus; light mode.

## Acceptance criteria

1. On the `marie-curie` fixture the 1st house front shows the ring with an east tick beside
   "Ascendant · {deg}°", the Midheaven's house shows the ring with a top tick, and the hero's
   Ascendant marker is the same glyph. No angle renders as a ring with a centred dot.
2. No checklist in the report renders "saved"; `countTicked` no longer exists. Ticking an item,
   unticking it, reloading in another browser as the same owner shows it unticked; the PATCH
   body carries `null` and the response omits the key.
3. `SECTION_IDS` has eleven ids without `path`; `PROMPT_VERSION` is `v6`; a v5 report is
   offered "Regenerate"; the admin lists no `natal:path` key; the lab on five fixtures is
   pasted, totals within 3,500 to 5,500, cost under 35 cents.
4. The rail has ten entries, none named Opening; the last reads "Closing"; the plate carries no
   "Ch. 00". `chapterAccent(10)` is teal; the closing's prose is foreground-coloured.
5. At 1440 px wide, scrolling into the closing brings the Sun into the viewport's top right
   corner cropped only by the viewport; at 390 px it is 82vw wide in the same corner.
6. With the API slowed: the overlay shows 10% when the chart is stored, the ring rises as
   sections land, the door appears at the ninth landed section only if `overview` and
   `houses` are among them, and never before; a report left alone opens itself at 100%.
7. Taking the door at 83% shows shimmering skeletons under the two chapters still writing and
   replaces them with prose when they land; Export PDF reads "Writing…" and flips to
   "Export PDF" at complete without a reload.
8. The gather runs under 1.3 s on a mid-range phone with no dropped frame in the paint loop;
   with reduced motion the plate crossfades in and nothing gathers.
9. `/generating/:id` lands on the same page and overlay; the sixty star divs are gone.
10. At `scrollY = 0` the starfield canvas and blobs are visible behind the hero plate.
11. The scroll cue is a focusable button; activating it scrolls to chapter 01.
12. Typecheck, both builds, unit tests, codegen leaves no diff, `db:bootstrap` clean (no
    schema change), Vercel preview smoke.

## Screens

All in the artifact: the house card before and after with the glyph family; the checklist that
unticks; the rail before and after with the accent chips; the dawn in two scroll-linked frames;
the generation screen at 83% with the door and the timeline; the live gather from stars to the
Owner's ring; the shimmering skeleton; the export pair; the scroll cue before and after; the
hero on the void and on the sky.

## Open questions

1. The door's words. Recommendation "Start reading". Default: Start reading.
2. The Closing's accent after renumbering. Recommendation: the sequence walks on, teal, prose in
   paper. Default: teal, paper prose.
3. The ring during the foundation wait. Recommendation: it creeps toward a time estimate capped
   below the next milestone. Default: it creeps.

## Decisions to record

1. **Ten chapters.** Your Path is retired from the page and the generator; the closing is
   chapter 10 with the eyebrow Closing. Supersedes ADR-20's chapter list and Your Path line.
2. **The report opens when the reader chooses.** True progress, a door at 80% (nine of eleven
   sections, overview and houses landed), self-opening at 100%. Chapters stream in behind the
   door. Supersedes ADR-25's opening moment; its streaming stays.
3. **A tick is silent.** No checklist carries a counter. Amends ADR-24's rail label.
4. **An angle is the ring with a tick at its place**, east for the Ascendant, top for the
   Midheaven, on the card and the hero alike. Amends ADR-22's "open brass marker".
5. **The rail lists chapters only.** The hero is not an entry and carries no chapter number.
6. **One sky.** The starfield and blobs are present from the first pixel; the dawn's sun lives
   on the fixed layer and is clipped only by the screen. Amends ADR-26's "two edges".
