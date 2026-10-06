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

Five steps on `/compatibility/:id` while the report writes, one label and one plain sentence each,
one percentage, eased from one scene to the next, held still at the end:

1. **Your two charts** (0–5 s): both plates from /compatibility come in whole and turn until each
   rising sign sits on one brass horizon (ADR-113, 320); names, Sun, Moon, Rising and the birth
   record under each.
2. **What you have in common** (5–17 s): one match every 4 s, the same element lit violet on both
   plates at once: Sun, Moon, Rising, Venus, Mars like for like, and Sun with Moon both ways;
   three at most.
3. **Where you're different** (17–29 s): like for like in different elements, two at most, then
   an element one person fills with three or more planets and the other leaves empty.
4. **In each other's houses** (29–45 s): a Sun or Moon of one lit on its plate, the house it
   falls in lit on the other, its word, object and covers line written under (ADR-321), from the
   pair brief's notable overlays. With a missing birth time: one line, "No birth time, so no
   houses", 6 s.
5. **What comes easily, and what takes work** (45–81 s): one link every 6 s, its two bodies lit
   on their own plates and the ledger's glyph drawn into "Comes naturally" or "Challenge"
   between them (ADR-101); three of each in the brief's order. Ends on "Six places your charts
   meet. Your report says what each one means." and holds still.

Every match, house and link is computed from the two charts with the engine and the pair brief's
own functions (`computeCrossAspects`, `computeOverlays`, `notableOverlays`); nothing is typed.
The door at 67% and the opening 1.2 s after 100% stay (ADR-47, 59). Reduced motion shows each
step complete and still.

## Out of scope

- The compatibility hero (ADR-70, 99), the report's chapters, the score rule (none).
- /compatibility on the site and a reel from these scenes: after the app version, on the Owner's yes.

## Acceptance criteria

- No line or shape joins one chart to the other; two charts never share a plate (ADR-97).
- A pair with a missing birth time draws that plate without a horizon or houses and skips step 4
  in one line; a Moon with no birth time takes part only when its whole span sits in one sign.
- The story stops after step 5; the percentage is the report's writing progress, never a rating.
- At 390 px both plates fit side by side with no sideways scroll; the lit house is written out
  under them.
- The buyer walk's pair step reaches this screen from the picker.

## Screens

The live player in the artifact: phone and desktop, both birth times or one missing, the step
table, the rules kept and the choices made.

## Open questions

1. Each match on screen: 4 s, and 6 s per link? Recommended yes. Default: yes.
2. /compatibility and a reel from the same scenes later? Recommended yes, after the app ships.
   Default: the app only for now.

## Decisions to record

- D1 · The Compatibility loading screen is five steps: two charts on one horizon, in common,
  different, each other's houses, easy and hard links, held still (Claude, from the Owner).
- D2 · Matches light both plates at once; the only link drawn is the ledger's glyph between them.
- D3 · All twelve house words stay on each plate, quiet, the lit one written out under (ADR-98).
- D4 · Timing 4 s a match, 6 s a link (Q1).
