# Night sky

Ideation 2026-09-25 with the Owner, from a photograph of the Milky Way and the GitHubSky card
(a "find the real star" GitHub CTA). Artifact, with both motions live on the report hero, a
chapter and the landing: https://claude.ai/artifact/A7WmYgjNgncD8ij9ppU6C4. Status: **draft**,
revised the same day.

First pass proposed a Milky Way band (`NightSky`) behind the app and the report; a trial of it
is on `claude/loving-maxwell-hzkzdl` (commit 50b48c2). The Owner found it too much on the
report and prefers today's sky there. This version keeps every sky as it looks now and adds
one small motion to its own stars. The round replaces the trial; nothing of it ships unless Q2
picks the band for the app screens.

## Scope
- **The report's skies stay as R06 shipped them** (ADR-59 untouched): the hero's radial
  gradient, starfield and gather to the ring; the chapters' fade-in, accent blobs, veil and
  parallax starfield. The pair report the same.
- **One micro motion on existing stars**, in `ReportSky` (both variants), per Q1:
  - *Slow pulse* (recommended): the ten stars with the largest radius in each sky breathe,
    opacity .55 to 1, radius ×1 to ×1.3 with a soft glow, one sine cycle of 6 to 10 s each
    with a seeded phase, so they never pulse together.
  - *Twinkle*: about 20% of the stars, opacity ×0.45 to ×1, cycles of 1.6 to 3.4 s.
  - Every other star stays still. A star that has landed on the ring never moves.
- `ReportSky` today repaints on scroll only; it gains one `requestAnimationFrame` loop per
  mounted sky that repaints while the motion runs (130 dots), stopped on unmount. A hidden
  tab pauses it by itself.
- **The app screens** per Q2. Default: today's `.bg-stars` pattern stays, with a small
  `TwinkleStars` layer (about 40 seeded stars, the same motion as the report) laid over it on
  every page that uses `.bg-stars` today. Pointer drift is dropped in every option.
- Reduced motion: no pulse, no twinkle; every sky is painted once, as today. Print: hidden.
- Trial clean-up: the App-level `NightSky` mount, the page-root background removals and the
  `.rp-*` CSS edits from 50b48c2 are reverted; `night-sky.tsx` is deleted unless Q2 is the band.

## Out of scope
- The GitHubSky card and the photograph: neither enters the repo.
- The Milky Way band on the report, and any change to the gather, the ring, the chapter
  accents, the blobs' two moves or the veil.
- Mobile app, share cards, email and printables.

## Acceptance criteria
1. With motion allowed, the report hero and chapters look the same as R06 in a still frame
   and differ only in the chosen stars' opacity and size over time.
2. Under reduced motion no star changes between frames.
3. Landed ring stars and the gather's timing are unchanged; the gather still lands in 1.6 s.
4. The pulse phases are seeded, so a reload shows the same stars pulsing at the same offsets.
5. App screens with `.bg-stars` show the same motion (default Q2); none loses its current look.
6. No layout shift, no pointer handling, and nothing about the motion runs in print.
7. Typecheck, both builds and unit tests green; a unit test covers the star selection (the ten
   largest, seeded) and the reduced-motion still frame.
8. Every shipped line is USER-FACING.

## Screens
In the artifact: the hero and a chapter with "Today, still", "Twinkle" and "Slow pulse";
the landing with today's look plus the motion, beside the band.

## Open questions
1. **Twinkle or slow pulse?** Recommendation: slow pulse; it suits the report, the slow page.
   Default: slow pulse.
2. **The app screens: today's look or the band?** Recommendation: today's look with the same
   motion, so the product has one sky. Default: today's look.

## Decisions to record
- The report's skies stay as ADR-59 has them; the Milky Way band is not used on the report.
- One ambient micro motion on each sky's own stars (default: slow pulse on the ten largest,
  6 to 10 s); none under reduced motion. Ambient motion is not a chapter move and does not
  count against §9's two-move budget. Amends §9's motion line.
- The app screens keep `.bg-stars` with the same motion (default Q2); pointer drift is not used.
