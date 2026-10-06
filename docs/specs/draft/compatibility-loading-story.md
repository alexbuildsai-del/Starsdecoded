# Compatibility loading story — draft

Status: draft, third pass, 2026-10-06; the Owner chose B then C ("so beautiful"). Artifact: https://claude.ai/artifact/VNdob5xAziDJDZ6HX6KkLf
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

**The Owner's notes on B then C.** The second sky does not run from one birthday to the other: it
fades in on its own plate. Then the two charts side by side, the houses read side by side (C),
then writing.

**One layout grid for every loading screen** (the Owner, 2026-10-06; amends the locked
`report-loading-story.md`, ADR-316 to 325, and Timeline's setup, ADR-320). The Personal report,
Timeline's setup and the Compatibility report use one grid, the same on every device: the step
counter ("Step 3 of 6") in one fixed place, the title under it, the subtitle under that, the
stage in one fixed box, the percentage and the door in one fixed place. The Owner will plan all
three loading reworks in one round.

The grid, as % of the frame's height, the same on phone (360×740) and desktop (1000×600): step
counter 5–8 · title, two lines at most, 8–16 · subtitle, two lines at most, 16–22 · stage (globe,
plates, dial) 24–66 · detail (places and dates, the house being read, ticks) 68–84 · percentage
and label 86–90 · door 91–97. Each part starts in its own slot whatever the one above holds.
Steps (third pass): where you were each born 0–9 s · the first sky 9–13 · the second sky fades in
13–20 · two charts side by side 20–26 · reading your houses 26–96 (5.5 s a house) · writing.

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

1. None left on direction (B then C, the Owner). Lock when the Owner says so.

## Decisions to record

- D1 · The Compatibility loading screen shows facts only, never what they mean (Owner).
- D2 · B then C: places, then each birthday's sky fading in on its own plate, then houses side by
  side, then writing (Owner).
- D5 · One layout grid for all three loading screens, the same on every device (Owner).
- D3 · Matches light both plates at once; nothing joins the two charts.
- D4 · All twelve house words stay on each plate, quiet, the lit one written out under (ADR-98).
