# Launch trailer

Draft 2, 2026-10-02, from `/ideate`. Artifact (the first cut, directions, storyboard, sound, asks):
https://claude.ai/artifact/BoKPjCCWbLRT7ZUfQ1army

Draft 1's animatic used screenshots and was turned down: the Owner wants motion built from the
coded components, at the level of a product trailer. Draft 2 is a rendered cut from the motion
harness (`.claude/skills/marketing/motion`, Remotion), 30 s, 120 BPM, with a synthesized temp score.

A 30 second motion trailer for the TikTok and Instagram launch, with a 15 second cutdown. It
opens on the one thing everyone knows, their star sign ("Your star sign is only your Sun."),
then opens the rest of the chart to the degree. It is built only from the product's own wheel,
planet renders, mark and recorded screens, and cut to a 120 BPM electronic beat. The point is
astrology made simple and new to look at, with nothing mystical in it (rule 10).

Owner playbook rules followed: an HTML artifact before any question (formats); at most three
asks, each with a default that is safe if he says nothing (asked for); nothing that needs a
secret or a paid tool without his word (no paid music tool, 30 Sep).

## Scope

### The film
- **Master:** 30 s, 9:16 at 1080×1920, 15 bars at 120 BPM (one bar = 2 s), no voiceover,
  captions burned in, every word inside TikTok's safe area (G13), the promise inside 1.5 s
  (ADR-147), the end flowing back into the start (G16). Reels and TikTok use the same file.
- **Cutdown:** 15 s, scenes 1, 2, 3, 5 and 10 at the same tempo.
- **One chart all the way:** "born today, 09:00, Paris" (rule 1's own form), recomputed with
  `calculateNatalChart` on the day it posts. The twin is the same day at 21:00. The values
  below are 2 Oct 2026's and change with the date.

### The storyboard (direction B)
| # | Bars | On screen | Picture and source |
|---|---|---|---|
| 1 | 1 | Your star sign is only your Sun. | Brass horizon draws, the Sun render rises (`sun-512.webp`) |
| 2 | 2 | Here's the rest of you. | The generation orrery (`Orrery.tsx`), recorded |
| 3 | 3 | BORN 2 OCT 2026 · 09:00 · PARIS | Bodies land on true degrees, Ascendant turns east (NatalWheel via the kit) |
| 4 | 4–5 | Every planet, to the degree. · SUN 9.11° LIBRA · 1ST HOUSE · MOON 22.35° GEMINI · 9TH HOUSE · RISING 20.62° LIBRA | One reading per beat, its planet lit |
| 5 | 6–7 | Same birthday. Twelve hours apart. · 09:00 · RISING 20.62° LIBRA · SUN 1ST · 21:00 · RISING 24.19° TAURUS · SUN 6TH | Two standalone wheels, each alone (ADR-97) |
| 6 | 8–9 | Your chart, free. Nothing you type is saved. | Home's live wheel, then the sky form, recorded |
| 7 | 10–11 | Then a report on how you think, work and love. | Report hero, a citation lighting its card, House by House |
| 8 | 12 | And how the two of you get along. | /compatibility's two plates on one horizon, sample people |
| 9 | 13–14½ | COMING SOON · TIMELINE AND ASK · The big cycles of your life. · year and age count · FIRST SATURN RETURN · 24 MAR 2056 | Saturn walks its engine path round the chart to its exact return; only under ask 3 |
| 10 | 14½–15 | Stars Decoded · Find out what your birth chart says about you. · GET YOUR FREE CHART · MYSTARSDECODED.COM | The mark draws out of the horizon, brass point last |

- Words are the site's own where they exist (home H1, /sky's "nothing you type is saved",
  "how you think, work and love"); every line passes `/ux-copy` before the cut.
- Scene 10 says launch, never open (rule 21): before launch "Join the waitlist and we'll
  email you when we launch." over "Link in bio · mystarsdecoded.com"; after launch the free
  chart line above.
- The Saturn return date comes from the engine for the trailer's birth (`saturnReturn` in the
  harness: monthly scan, then daily; 24 Mar 2056 for 2 Oct 2026, natal Saturn 11.47° Aries).

### Art direction
- **A · Observatory:** G15 as written, 72 BPM or no beat, crossfades, about 40 s.
- **B · Signal (recommended):** the product's look at 120 BPM: two bars of pulsar ticks, then
  the beat lands exactly as the chart lands; hard cuts on the bar; Newsreader lines cut in
  whole; Plex Mono degrees stamp one per beat; the brass horizon is the one recurring move;
  one easing, `cubic-bezier(.16,1,.3,1)` (web-taste).
- **C · Sixteen bars:** 128 BPM, a punch-in every beat, 28 s. Rejected: too fast to read (G5),
  reads as a trend edit.

### Sound
- **One motif at two speeds:** the trailer track at 120 BPM and its slow stem at 72 BPM, pads
  and ticks only, as the carousels' bed, so the house sound (G15) and the trailer are one brand.
- **Brief:** instrumental, 4/4, a pulsar-like click, warm analogue bass, a 16th-note arpeggio,
  a soft pluck; a three-note sign-off under 2 s for every video after this; a 15 s edit and a
  loop point; never vocals, trend samples, long risers or G15's banned instruments. Style
  references only: Jon Hopkins, Bicep, Kiasmos, Max Cooper.
- **Rights for a commission:** work for hire, full buyout, stems, ours to upload as our
  original sound, never registered with Content ID or Rights Manager (platforms.md).
- **Without a commission:** the cut sits on a 120 BPM grid; each app gets a cleared library
  track added in-app, the Commercial Music Library on TikTok and the Sound Collection on
  Instagram (G14, rule 22).

### The motion harness (path B of the Owner's harness, 2026-10-02)
- Brief (text and refs) → Claude writes code → **Remotion** renders React frame by frame in headless
  Chrome → MP4. The web app's own components through the `@` alias, the engine on every frame,
  Tailwind v4, the product's fonts; Canvas or SVG (path A) only for what no component draws
  (the star field, grain, the reticle). No image or video models (path C) without the Owner's yes
  on the exact output (rule 17); no screenshots or cropped pages, ever.
- `node render.mjs video out/<name>.mp4 --date <posting day>`; `stills 4.6 9.7 …` for checks.
  Deterministic: every value is a function of the frame, so any frame renders the same.
- Components used: NatalWheel (recomputed per frame, tilted to the Ascendant), the orrery's
  maths (`lib/orrery.ts`), HorizonWheel (still), TriadPlate, Placements, Chapter, EvidenceCard,
  TwoPlates (sample people), Mark. The report line is Marie Curie's blind mind claim
  (`fixtures/passes/marie-curie.r05.json`), with no houses, as rule 8 allows; the ad cut swaps it.
- `score/temp-score.mjs` synthesizes the timing track (no licence involved); the real track
  replaces it (ask 2).
- The cut goes to the Owner as a file before it posts.

## Out of scope
- Voiceover, faces, people on camera, AI-generated images (rule 17).
- Paid ads (Phase 4, claude-ads, from customer 50); the 7–30 s ad cut reuses this file later.
- The Compatibility reel and parent posts (still held by G2); the carousel cadence.
- Any reader's chart or report, the website's sample (rules 7, 8), living people.

## Acceptance criteria
1. Every degree, time and date on screen traces to `calculateNatalChart` or astronomy-engine for
   the stated moment and place, recomputed on the posting day (rules 1, 26).
2. Every wheel is NatalWheel rendered by the kit; every planet is the real render (rules 13, 15).
3. Screens are recordings of the shipped product; no frame shows Audrey Hepburn, a reader or a
   living person; the staging badge never shows.
4. The promise is on screen inside 1.5 s; every word sits inside the 1080×1920 safe area;
   captions are burned in; no line is on screen for less than one bar.
5. The last frame flows into the first; the 15 s cut keeps scenes 1, 2, 3, 5 and 10.
6. The sound is cleared for business use or ours with a full buyout (rule 22).
7. Scene 9 appears only if ask 3 is yes and `/timeline` is live on posting day.
8. Every frame is rendered from the product's components by the harness; no screenshot is used.
9. The Owner says yes to the rendered cut before it posts (rule 23).

## Screens
All in the artifact: the rendered first cut (direction B), the three directions side by side,
the ten-scene storyboard, the 15-bar sound map and brief, and the rule book check.

## Open questions (for the Owner)
1. **Direction.** Recommended B · Signal. If silent: B, and nothing is made before the yes on
   the words.
2. **Music.** Recommended: commission our own track (one motif, two speeds, a sign-off, buyout
   with stems), as `first-posts.md` plans ("a composer before the launch video"); repo notes put
   it at about $300 to $2,000 [unverified]. If silent: no spend, a cleared 120 BPM library track
   in each app.
3. **Coming soon.** Recommended: amend rule 4 to "A feature with a locked spec may appear,
   marked Coming soon, once its public page is live", so scene 9 runs when `/timeline` is live.
   If silent: rule 4 stands, scene 9 is cut, the end card takes its 3 s.

Research note: a researcher looked for the libraries' and single-track licences' terms on
2026-10-02; the verifier could fetch none of the 13 sources (egress blocked), so 0 of 28 claims
were supported and none is used here. The licence check runs again before any money is spent.

Found along the way: Remotion needs the headless shell (`/opt/pw-browsers/chromium_headless_shell-*`),
not full Chromium, and `extensionAlias` for the engine's `.js` imports. `kit/wheel.mjs` fails under the current Vite 7 SSR with "module is not
defined" in React's JSX runtime; adding `ssr: { external: ["react", "react-dom"] }` to its
`createServer` call fixed it in a scratch copy. For the next marketing session.

## Decisions to record
1. The launch trailer is 30 s at 9:16 with a 15 s cutdown, built only from the product's own
   wheel, renders, mark and recorded screens, one computed chart all the way through.
2. The story: your star sign is only your Sun; the chart lands to the degree; two people born
   the same day differ; the free chart, the report, the pair; the mark.
3. The art direction (ask 1), and G15 bent for motion: video runs at 120 BPM, carousels keep
   the ambient bed as the slow stem of the same motif.
4. G2's hold on video lifts for the launch trailer only, at the Owner's request (2026-10-02).
5. The music route (ask 2).
6. Rule 4 and the coming-soon beat (ask 3).
7. Videos are made with the motion harness (Owner, 2026-10-02): Remotion over the product's own
   components and engine, Canvas or SVG for the rest, no screenshots; rule 24's words-first step
   gives way to a rendered cut when the Owner asks for one.
