# Launch trailer

Draft 3, 2026-10-02, from `/ideate`. Artifact (the rendered cut, storyboard, sound, asks):
https://claude.ai/artifact/BoKPjCCWbLRT7ZUfQ1army

A 30 second motion trailer for the TikTok and Instagram launch that sells the two reports and
shows how credits, Share with and Gift a report spread them. It is rendered by the motion harness
(`.claude/skills/marketing/motion`, Remotion) from the web app's own components, cut to a
120 BPM electronic beat, with nothing mystical in it (rule 10).

How it got here: draft 1's storyboard of cropped staging pages was turned down; the Owner wants
motion built from the coded components at product-trailer quality. Draft 2 was the first cut.
Draft 3 follows the Owner's notes on it (2026-10-02): no birth time anywhere, the Personal and
Compatibility reports only, Timeline later, much better visuals, and a hint of the credit system
and the gifting loop.

Owner playbook rules followed: the rendered MP4 is the format for a video; at most three asks,
each with a default that is safe if he says nothing; no paid tool without his word.

## Scope

### The film
- **Master:** 30 s, 9:16 at 1080×1920, 15 bars at 120 BPM (one bar = 2 s), no voiceover,
  captions burned in inside TikTok's safe area (G13), the promise inside 1.5 s (ADR-147), the
  last frame flowing into the first (G16). One file for Reels and TikTok.
- **No birth time, no Timeline, no prices.** Checkout is not built and prices may still move
  (R14), so the trailer shows credits, never euros. The chart behind the wheel is "born today,
  09:00, Paris", recomputed on the posting day, with the moment and place in the caption
  (rule 1), never on screen.

### The storyboard
| # | Time | On screen | Picture and source |
|---|---|---|---|
| 1 | 0:00 | Your star sign is only your Sun. | The brass horizon draws; the Sun render rises over it |
| 2 | 0:02 | Here's the rest of you. | The orrery's rings and mean motions (`lib/orrery.ts`) with the real renders, sweeping faster on the riser |
| 3 | 0:04 | (the drop) | Every body lands on its degree; the home page's wheel arrives by first light (HorizonWheel, live) |
| 4 | 0:06 | Your Personal report. | The wheel sets below the horizon like the Sun; the name rises out of the same line |
| 5 | 0:08 | How you think, work and love. | The ten chapter headers (`Chapter`, `lib/chapters.ts`) fly past the camera |
| 6 | 0:09 | Every line shows where it comes from. | Chapter 03 lands: a real line underlines, its citation pulses, its `EvidenceCard` rises. "From Marie Curie's report" |
| 7 | 0:12 | COMPATIBILITY REPORT · Then read the two of you. | After a beat of silence the two plates (`TwoPlates`, sample people) slam together; Couples, A parent and a child, Friends, family, colleagues, on the beat |
| 8 | 0:14 | 1 credit, 1 report. · 3 CREDITS · A REPORT EACH AND HOW YOU GET ALONG | `CreditDots`; three credits fly to Personal report · You, Personal report · Tomás, Compatibility report · The two of you |
| 9 | 0:16 | Add the people you care about. · Share a report. It becomes theirs. | The dashboard's circle (`Orbit` + `orbitPoints`, live) fills on the beat with violet rings for pairs; "Share with Tomás" turns "Joined ✓". "A sample account" |
| 10 | 0:20 | Or gift a report. | The real `GiftCover` ("A gift from Mira · Your Personal report · for Pierre") flies in, then folds into the circle as "PIERRE · GIFT WAITING" |
| 11 | 0:23 | Their circle starts with them. · Everyone you love has a chart. | The camera dives into the gift; Pierre's own circle with its empty seats; pull back to three circles joined by the gifts' paths |
| 12 | 0:27 | Stars Decoded · Find out what your birth chart says about you. · GET YOUR FREE CHART · MYSTARSDECODED.COM | Everything folds into the Mark; then only the brass point on the horizon, where it began |

- The loop is told as built (ADR-139): a gift is a credit, the recipient writes their own
  Personal report and starts their own circle; the giver is not put in it. Share with is what
  makes a report someone else's. Every UI word is the product's own (`AddSomeoneSheet`,
  `GiftCover`, `orbit.ts`, `SendDialog`, the catalogue's Couple line, the site's YourPeople heading).
- Scene 12 says launch, never open (rule 21): before launch the waitlist line, after it the free chart.

### Look
- The product's look only (§9, web-taste): void, Newsreader, Plex Mono, brass for measured
  geometry, the real renders, one easing. The signature move is the horizon: the Sun rises over
  it, the wheel sets below it, the report's name rises out of it, the Mark ends on it.
- Depth from the frame-locked camera: 3D card fly-throughs, a dive into the circle, a pull-back
  to the network; parallax stars, grain, vignette, a sheen as cards land.

### Sound
- 120 BPM electronic: ticks for two bars, the beat on the landing, a beat of silence before the
  pair, the bass out for the network, a three-note sign-off on the Mark. The synthesized temp
  score (`score/temp-score.mjs`) sets the timing; the real track replaces it (ask 2).
- **One motif at two speeds:** the same motif at 72 BPM without drums is the carousels' bed
  (G15), so posts and videos sound like one brand. Brief: instrumental, a pulsar-like click,
  warm analogue bass, a 16th-note arpeggio, a soft pluck; no vocals, trend samples or G15's
  banned instruments. A commission is work for hire with full buyout and stems, never
  registered with Content ID. Without one, each app gets a cleared 120 BPM library track in-app.

### The motion harness (the Owner's harness, path B)
- Brief → code → Remotion renders React frame by frame in headless Chrome → MP4. The web app's
  components through the `@` alias, the engine, Tailwind v4 and the product's fonts
  (`override.mjs` also maps the Vite-only `import.meta.env` values).
- **The frame-locked clock** (`src/clock.ts`): `performance.now` and rAF timestamps read the
  composition's time and every CSS or WAAPI animation is set to it, so live components
  (HorizonWheel's first light, Orbit's drift and pops) render the same frame every time.
  Render with concurrency 1 (about 5 minutes for 30 s).
- Canvas or SVG only for what no component draws; no screenshots; no image or video models
  without the Owner's yes on the exact output (rule 17).

## Out of scope
- Birth time, Timeline and Ask (later, with the subscription), prices.
- Voiceover, faces, people on camera; any reader's chart or report; the website's sample
  (Audrey Hepburn); living people. Marie Curie's line is organic only (rule 8): the ad cut
  swaps scene 6.
- Paid ads (Phase 4), the Compatibility reel and parent posts (G2).

## Acceptance criteria
1. Every product surface on screen is the web app's own component, rendered by the harness.
2. Every degree comes from the engine for the stated moment and place, recomputed on the
   posting day; the moment and place are in the caption (rules 1, 26).
3. The credit and gift steps match the product as built (ADR-139, 170): 1 credit = 1 report of
   either kind; a gift is a credit; Share with makes a report theirs.
4. No birth time, no Timeline, no price, no reader, no living person on screen.
5. The promise inside 1.5 s; every word inside the 1080×1920 safe area; captions burned in.
6. The last frame flows into the first. The sound is cleared or ours with a full buyout (rule 22).
7. The Owner says yes to the rendered cut before it posts (rule 23).

## Screens
The artifact: the rendered cut, the storyboard, the sound brief and the asks.

## Open questions (for the Owner)
1. **The cut.** Which moments land and which don't; each change is one more render.
2. **Music.** Recommended: commission our own track (one motif, two speeds, a sign-off, buyout
   with stems), as `first-posts.md` plans; repo notes put it at about $300 to $2,000
   [unverified]. If silent: no spend, a cleared 120 BPM library track in each app.
3. **A 15 s cutdown.** Recommended: scenes 1 to 4, 9, 10 and 12 (the hook, the landing, the
   circle, the gift, the Mark). If silent: no cutdown until the master is approved.

Research note: the music-licence research of 2026-10-02 could not be verified (every source
blocked), so none of it is used; the check runs again before any money is spent.

Found along the way: Remotion needs the headless shell (`/opt/pw-browsers/chromium_headless_shell-*`);
the kit's `wheel.mjs` fails under Vite 7 SSR ("module is not defined"), fixed in a scratch copy by
`ssr: { external: ["react", "react-dom"] }`; the locked credit-loop spec still says a gift links
giver and recipient, which ADR-139 overrode.

## Decisions to record
1. The launch trailer sells the Personal report and the Compatibility report and hints at the
   credit loop; no birth time, no Timeline, no prices (Owner, 2026-10-02).
2. The story as in the storyboard, told as built (ADR-139): Add someone and Share with fill your
   circle; a gift is a credit that starts the recipient's own circle.
3. The look: the product's own, with the horizon as the signature move; G15 bent for video only
   (120 BPM), carousels keep the ambient bed as the slow stem of the same motif.
4. G2's hold on video lifts for the launch trailer, at the Owner's request (2026-10-02).
5. Videos are made with the motion harness (Owner, 2026-10-02): Remotion over the product's own
   components and engine, live components on a frame-locked clock, no screenshots; the rendered
   cut is what the Owner reviews.
6. The music route (ask 2).
