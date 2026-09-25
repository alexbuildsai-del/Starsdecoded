# Night sky

Ideation 2026-09-25 with the Owner, from a photograph of the Milky Way and the GitHubSky card
(a "find the real star" GitHub CTA). The Owner liked its background and its animation, not the
card. Artifact, with the sky live, the three placements side by side and the two questions:
https://claude.ai/artifact/A7WmYgjNgncD8ij9ppU6C4. Status: **draft**.

A trial is built and pushed on `claude/loving-maxwell-hzkzdl` (commit 50b48c2) as option A,
so the Owner can see it on a preview. Locking picks the option; the round then trims the trial
to it. Touches MASTERFILE §9 and ADR-59 (two skies).

## Scope
- `web/src/components/ui/night-sky.tsx`, `NightSky`: one fixed canvas layer under the page.
  Seeded (mulberry32), so the sky is the same on every load. Two layers:
  - still, painted once per size to an offscreen canvas: a navy ground (#03060F to #1B355A,
    top left to bottom right), a diagonal band from lower left to upper right built from soft
    radial glows (cool at the ends, faintly warm in the middle), about 40 dust lanes, and
    about 12,000 faint stars (70% inside the band, scaled to the screen's area);
  - moving: 480 stars (40% in the band) with the GitHubSky twinkle, and within 220 px of the
    pointer a push of up to 6 px, up to 55% brighter and 12% larger. The pointer is read from
    the window because the layer sits under the content.
- Reduced motion: painted once, repainted on resize. A hidden tab pauses with
  `requestAnimationFrame`. Print: hidden.
- Mounted once in `App.tsx`, under every route. Page roots drop `bg-background` and
  `bg-stars`, so the sky shows on landing, sign-in, sign-up, chart form, dashboard, claim,
  legal, admin and loading. Nav bars keep their frosted `bg-background/80`. The error
  boundary keeps its solid ground (it renders outside the sky).
- The report (option B, recommended): `.rp-root` loses its solid ground; the chapters' sky
  (`ReportSky` default variant) stops drawing its own starfield and keeps its blobs (opacity
  .5 to .32) and veil (.18/.72 to .08/.5), so the band reads through the reading. The hero
  (`ReportSky variant="hero"`, `.rp-hsky`) stays exactly as ADR-59 has it: its opaque
  gradient, its starfield, the gather to the ring. The pair report follows the same rule.
- `.bg-stars` is removed from `index.css` once nothing uses it.

## Options (artifact, "Where it goes")
- **A · Everywhere**, the trial as pushed: the hero's gradient turns translucent and the
  band runs behind the ring. Amends ADR-59 for the hero and the chapters.
- **B · App and chapters, hero unchanged** (recommended): the ring keeps its dark ground;
  the band arrives as the reading starts. Amends ADR-59 for the chapters only.
- **C · App screens only**: the report as R06 shipped it. No ADR amended.

## Out of scope
- The GitHubSky card itself: it is a GitHub star CTA and the product has no use for one; it
  is not copied into the repo.
- The photograph: the band is drawn in code; no image is shipped.
- The mobile app, share cards, email and printables (§9 "one register" applies when they
  are designed).
- Any change to the gather, the ring, the chapter accents or the motion budget per chapter
  change.

## Acceptance criteria
1. Every app route listed above shows the band behind its content; no page root paints an
   opaque ground over it; nav bars stay legible.
2. Under B, the report hero is pixel-identical to R06 at 1440×900 and 390×844; chapters show
   the band under the accent blobs and veil; body text keeps at least 7:1 contrast against the
   brightest part of the band (checked at the band's centre).
3. Under reduced motion the sky is painted once and never animates; resize repaints it.
4. The sky is the same on every load (seeded) and does not move on scroll.
5. On a phone only the twinkle runs; on desktop the pointer drift runs wherever Q2 allows.
6. Print output has no sky.
7. Typecheck, both builds and the unit tests are green; a frame costs one image copy plus
   480 arcs, and the landing page holds 60 fps on a mid laptop in Chrome's performance panel.
8. Every shipped line is USER-FACING.

## Screens
All in the artifact: the live sky with its three motion modes, today's `.bg-stars` beside
the proposal, and the report hero and a chapter under each option.

## Open questions
1. **Where does the sky go?** Recommendation B: the app screens and the chapters, with the
   hero kept as ADR-59 has it. Default: B.
2. **How much should it move?** Recommendation: twinkle and pointer drift on the app screens,
   twinkle only behind the reading, since the report page is the slow one. Default: as
   recommended.

## Decisions to record
- The app's background is one seeded canvas sky with a Milky Way band (`NightSky`), mounted
  once under every route; `.bg-stars` retires. Amends §9's "the starfield and gradients stay".
- The report's placement per Q1 (default B): the chapters' faint starfield is replaced by the
  band under their blobs and veil; the hero keeps its own sky. Amends ADR-59 (and ADR-51 as
  it stands after ADR-59).
- Ambient motion per Q2 (default: drift on the app screens, twinkle only in the report).
  Ambient motion is not a chapter move and does not count against §9's two-move budget.
