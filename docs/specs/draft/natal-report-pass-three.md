# Natal report, pass three

Ideation 2026-09-19 with the Owner from the Notion page "Review Sept 19/09" (nine notes on the
R04 build on staging, then six answers on the second pass, folded in). Artifact, with the Owner's real hero angles and a live mock of the
opening: https://claude.ai/artifact/HKt4HYfKKmwadcKTmTxWob. Status: **draft**. Builds on
`docs/specs/locked/natal-report-pass-two.md` and supersedes its chapter list, its opening
moment and three smaller lines (below).

## Scope

### The Ascendant glyph (note 1)
- The R03 hero marker comes back as one `AngleGlyph` for every angle drawn as an occupant: a
  brass ring, a brass point at its centre, a tick from the rim outward along the angle. East
  for the Ascendant, up for the Midheaven. `OccupantMark`'s `angle` branch uses it and the
  hero's Ascendant marker is the same glyph (R03 drew it; R04 dropped the tick). Nodes, Chiron
  and planets unchanged.

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
- Contract: `/status` gains `provisional` (see the wheel below). Web: `PathBlock`, `NodalAxis`, `nodal-axis.test.ts` go; `CHAPTERS` has ten entries, `TOTAL`
  10; `isCurrentInterpretation` learns the v6 shape so a v5 report is offered regeneration.
  House-card links for houses 5 and 11 go (they join 6, 8, 9, 12 in carrying none).
- The last chapter is titled **Closing**, eyebrow and title alike; the chapter head prints
  "10 / 10" over "Closing" once, the three groups keep their names. Section key `focus`
  unchanged, so `focus.ts` is not edited. The rail lists chapters only: the "Opening" entry
  goes, `active === -1` still means "on the hero", the plate's "Ch. 00 / Horizon" label goes.
- Accents: the fixed sequence walks on unchanged; chapter 10 takes teal (Owner, 19 Sept). The
  closing's prose reads in paper (foreground), not the accent; eyebrow and hair line keep it.
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
  the `ReportSky` canvas is the loading starfield; the sixty framer-motion star divs go.
- **The wheel is the sky** (Owner, 19 Sept): a geocentric orrery drawn from the chart. Eleven
  rings in order of distance from Earth (Moon, Mercury, Venus, Sun, Mars, Jupiter, Saturn,
  Chiron, Uranus, Neptune, Pluto), the nodes on the Moon's ring, planets as renders, Chiron and
  the nodes as drawn points. Each body moves at its mean daily motion (Moon 13.176°, Sun
  0.9856°, Mars 0.524°, Jupiter 0.0831°, Saturn 0.0335°, nodes −0.053°, down to Pluto
  0.00397°) at one second to eight days, retrogrades backwards. Before the chart exists the
  sweep starts from the birth day's positions: `/status` gains `provisional`, the engine's
  positions for the entered date and time at offset zero, one local call, no geocoding. When
  the chart is stored each body eases the last degrees onto its true place (the Moon at most
  eight), the wheel turns so the Ascendant sits east, the Ascendant marker, the Descendant and
  the horizon appear, and the progress arc runs round the rim. Renders are bodies at their
  degrees, never decoration (§9). The 60 star divs and the glyph spinner go.
- **Progress is real** and shown as one percentage, never a count: 4 points at geocode, 10
  when the chart is stored, then 90 ÷ 11 per landed section read from `/status`'s `sections`.
  Five labels: "Analysing your inputs" → "Computing your chart" → "Finding the patterns" →
  "Writing your report" → "Ready". Between events the ring creeps toward a time estimate capped
  below the next milestone; a landed section snaps it (Q3).
- **The door** appears at ≥ 67% of real progress (the seventh of eleven sections, never the
  crept value) and only once `overview` and `houses` have landed (Owner, 19 Sept). Copy: "Start reading →" (Owner, 19 Sept) with one line under it, no
  numbers: "The last chapters will be there when you reach them." A reader who does not take
  it waits; at 100% the page opens by itself after a 1.2 s hold.
- **The opening**: the small ring and its arc fade (350 ms); about 70% of the stars glide to a
  point on the hero's ring over 1.6 s on one slow easing; the plate and its glow fade in over
  them (700 ms); **the stars stay on the ring** (Owner, 19 Sept), so the ring is made of them.
  Transform maths in the existing paint loop, ≤ 150 stars, no DOM per star, 2.3 s in total.
  Reduced motion: a 300 ms crossfade.
- **Skeletons**: a chapter not yet landed shows four to five rounded lines with a slow sweep of
  light and a breath of opacity, above the caption "Still writing this chapter"; the rail keeps
  "· writing". Streaming (`useLiveReport`, `/status` merge) is unchanged behind the door.
- **Export PDF** reads the same status the door reads and flips to "Export PDF" at complete
  without a reload. Reproduced with the API slowed before it is fixed.

### The scroll cue (note 5.2)
- 13 px label, `.34em` tracking, a 2 px stem 56 px tall with a falling point of light down it,
  no arrow (Owner, 19 Sept), brass, the same breath. It is a button that scrolls to chapter 01 (44 px hit area);
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

1. On the `marie-curie` fixture the 1st house front shows the R03 marker (ring, centre point,
   east tick) beside "Ascendant · {deg}°", the Midheaven's house shows it with the tick up,
   and the hero's Ascendant marker is the same glyph with its tick along the horizon.
2. No checklist in the report renders "saved"; `countTicked` no longer exists. Ticking an item,
   unticking it, reloading in another browser as the same owner shows it unticked; the PATCH
   body carries `null` and the response omits the key.
3. `SECTION_IDS` has eleven ids without `path`; `PROMPT_VERSION` is `v6`; a v5 report is
   offered "Regenerate"; the admin lists no `natal:path` key; the lab on five fixtures is
   pasted, totals within 3,500 to 5,500, cost under 35 cents.
4. The rail has ten entries, none named Opening; the last chapter's eyebrow and title both read
   "Closing" and the head prints the word once; the plate carries no "Ch. 00".
   `chapterAccent(10)` is teal; the closing's prose is foreground-coloured.
5. At 1440 px wide, scrolling into the closing brings the Sun into the viewport's top right
   corner cropped only by the viewport; at 390 px it is 82vw wide in the same corner.
6. With the API slowed: before the chart is stored the orrery runs from the `provisional`
   positions with the Moon visibly faster than the Sun and Saturn still; when it is stored
   every body sits at its true degree with the Ascendant east and the overlay shows 10%; the
   label runs through the five in order and shows no count; the ring rises as sections land;
   the door appears at the seventh landed section only if `overview` and `houses` are among
   them, and never before; a report left alone opens itself at 100%.
7. Taking the door at 83% shows shimmering skeletons under the two chapters still writing and
   replaces them with prose when they land; Export PDF reads "Writing…" and flips to
   "Export PDF" at complete without a reload.
8. The gather runs in 2.3 s on a mid-range phone with no dropped frame in the paint loop and
   the gathered stars are still on the ring ten seconds later; with reduced motion the plate
   crossfades in and nothing gathers.
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

1. Answered 19 Sept: "Start reading".
2. Answered 19 Sept: teal, prose in paper.
3. The ring during the foundation wait. Recommendation: it creeps toward a time estimate capped
   below the next milestone. Default: it creeps.

## Decisions to record

1. **Ten chapters.** Your Path is retired from the page and the generator; the closing is
   chapter 10, titled Closing, teal. Supersedes ADR-20's chapter list and Your Path line.
2. **The report opens when the reader chooses.** True progress under five plain labels, the
   wheel a geocentric orrery at real mean speeds that settles onto the true chart, a door at
   67% (seven of eleven sections, overview and houses landed) reading "Start reading",
   self-opening at 100%.
   Chapters stream in behind the door; on opening the stars gather into the ring and stay.
   Supersedes ADR-25's opening moment; its streaming stays.
3. **A tick is silent.** No checklist carries a counter. Amends ADR-24's rail label.
4. **An angle is the R03 marker**: brass ring, centre point, a tick from the rim outward along
   the angle, east for the Ascendant, up for the Midheaven, on the card and the hero alike.
   Amends ADR-22's "open brass marker".
5. **The rail lists chapters only.** The hero is not an entry and carries no chapter number.
6. **One sky.** The starfield and blobs are present from the first pixel; the dawn's sun lives
   on the fixed layer and is clipped only by the screen. Amends ADR-26's "two edges".
