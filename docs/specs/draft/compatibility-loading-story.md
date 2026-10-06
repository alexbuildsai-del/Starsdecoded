# Compatibility loading story — draft

Status: draft, 2026-10-06. Artifact: https://claude.ai/artifact/VNdob5xAziDJDZ6HX6KkLf
Follows `report-loading-story.md` (ADR-316 to 325), which left this screen out of scope.

## Why

The Owner: the Personal report and Timeline have their new loading story; Compatibility still
shows the orrery. Take the two charts with their houses, show what is the same, what is
different, the strengths and the challenges, reuse the site's visual and add motion and a line
of text per step, like the other two. With `sharing-and-circle.md`, Make it in the picker now
opens this screen.

## Scope

Second draft, after the Owner: the first gave the report away ("step 5 is the report's wow
moment"), so nothing on this screen says what anything means; only facts: places, dates, signs,
elements, houses with their word and object. Four directions in the artifact's player:

- **A** · the two charts on one horizon, then, slowly (2 matches × 7 s each), "Looking at what
  you share", "Looking at where you differ", "Looking at each other's houses".
- **B** · the Personal story's globe turns to both birthplaces ("502 km apart"), the Earth
  shrinks, the sky on the first birthday draws, settles on that person's plate, and a sky runs on
  to the second birthday ("born 1 year, 5 months and 12 days later") and settles on the other
  plate; the horizon draws across both. The circles never touch (ADR-97, see question 2).
- **C** · houses 1 to 12 light together on both plates, 5.5 s each, word, object, each person's
  sign and planets; signs instead of houses without a birth time.
- **B then C** (recommended): B's opening, then C fills the writing time.

Every direction ends still under "Now writing your report"; Start reading at 67% and the page
opens itself at 100% as today (ADR-47, 59). All data from the engine: the two stored charts,
`longitudeAt` for the sky between births, `notableOverlays` for houses.

**No extra wait.** Measured in Node 22: one pair's matches and overlays 0.047 ms (1,000 runs);
the sky between two births, 264 days every second day, about 35 ms. Both charts are stored; the
report writes on the server meanwhile; the animation adds nothing to the wait.

## Out of scope

- The compatibility hero (ADR-70, 99), the report's chapters, the score rule (none).
- /compatibility on the site and a reel from these scenes: after the app version, on the Owner's yes.

## Acceptance criteria

- No word on the screen interprets ("easy", "tension", "comes naturally", "challenge" never appear).
- No line or shape joins one chart to the other; two charts never share a plate (ADR-97).
- A missing birth time: that plate has no horizon or houses; C reads signs.
- The story holds still once played; the percentage is writing progress, never a rating.
- At 390 px no sideways scroll; reduced motion shows the last frame, still.

## Screens

The live player in the artifact: phone and desktop, both birth times or one missing, the step
table, the rules kept and the choices made.

## Open questions

1. Which direction? Recommended B then C. Default: B then C.
2. B shows one sky moving between the two birthdays before each settles on its own plate. Does
   that keep ADR-97 ("nothing draws two charts on one plate")? Recommended: yes, it's one sky at
   one moment and the circles never touch. Default: yes; if no, A then C.

## Decisions to record

- D1 · The Compatibility loading screen shows facts only, never what they mean (Owner).
- D2 · Direction (Q1); one sky between the two births read within ADR-97 (Q2).
- D3 · Matches light both plates at once; nothing joins the two charts.
- D4 · All twelve house words stay on each plate, quiet, the lit one written out under (ADR-98).
