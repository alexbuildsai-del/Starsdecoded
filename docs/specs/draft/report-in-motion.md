# Report in motion

Ideation 2026-10-09 with the Owner, who asked for the Personal report to be "much more visual and interactive, with
motion", with "explainer videos as you scroll", and to "go wild". Artifact: https://claude.ai/artifact/NQM6GSnEpZ6w7cKSsgMSis.
Status: **draft**, version 6, two questions open. Shown on Audrey Hepburn's chart (the /sample fixture, 4 May 1929, 03:00,
Ixelles), computed by `@workspace/engine`. Report lines are quoted from the stored sample run.
Touches `review-09-10` (§2 the primer and §2b the chart system, a draft on `claude/cool-knuth-3qanic`), `natal-report-ui`,
`report-loading-story` (the frame-by-time drawing), `explain-like-a-friend` (no Did you know card in chapters), `timeline`
(the later door), ADR-18 (report text quoted), ADR-23 (chapter accents), ADR-24 (prose beside a side column).
**Brain:** `packages/engine/` gains read-only sky helpers (below). No prompt, brief or report word changes. Dry lab once.

## Scope

### 1. An explainer for every chapter (artifact #watch, #chapters)
- **Where**: under the chapter title, before the first paragraph. The hero and the page around it stay as they are: nav,
  `ChapterRail` on a computer, the chapter bar on a phone. Computer: the explainer spans the chapter, picture on the left,
  words on the right. Phone: the words sit under the picture.
- **What it shows**: up to three pieces of evidence the chapter cites, drawn on the reader's own chart. Picked in code from
  the chapter's claim refs (`EvidenceRef`): the most cited first, and new ones before ones an earlier chapter showed (a
  repeat is a short reminder). At the end, everything the chapter cites is lit. Each step has one caption, one smaller
  line, and its numbers in mono.
- **Step kinds**: a placement. A house and its ruler, with the primer's dashed brass line through the middle. An aspect: its
  one line, the arc between the two planets and the degrees. A pattern: a stellium as `DidYouKnow`'s stellium picture, or two
  planets in one sign. Born at night: the Sun below the horizon, the Moon leads. The nodes. The Lot of Fortune.
- **Chapter 01** starts from the real sky over the birthplace at the birth minute and bends it into the chart, then shows the
  two pieces of evidence the chapter cites most (21 s). **Chapters 03 to 09**: three steps, 15 s at most.
- **Chapter 02, House by House**, keeps review-09-10's four primer cards, on this player. Card 3 uses three empty houses no
  later explainer uses, so no chapter repeats one.
- **Chapter 10, Closing**, keeps the approved dawn. Added: the clock in the corner runs from the birth minute to the real
  sunrise, and one line under the closing says when the Sun rose. Both from the engine.

### 2. The player (artifact #watch, #rules)
- **Starts when you reach it**: once at least 55% of it is on screen. It plays once on its own clock, then holds its last
  frame. It never loops, and scrolling never drives it. It pauses when it leaves the screen and goes on when it comes back.
- **You're in control**: Play or Pause, Replay at the end, and a scrub bar, always. The bar is a range input, so it works by
  keyboard. No sound.
- **"What it shows"**: every step written out, under the picture. The picture's alt states its facts. Reduced motion shows
  the last frame, complete and still at first paint, with "What it shows" open.
- **A scene is pure**: `{ duration, beats, alt, build, frame }`, where `frame(t)` draws the moment `t`, the way
  `frameAt` in `web/src/lib/build-story.ts` already does. A scene is built only when it nears the screen.
- **Captions use no new sentence about the reader**: engine numbers, plus words we already ship: `HOUSE_COVERS` and
  `houseWithWord`, the evidence glossary (`glossFor`), the facts log (`web/src/lib/facts.ts`) and the primer's words.
  Report lines are quoted, never changed (ADR-18). A house always reads "(Nth, word)".

### 3. Three hands-on tools (artifact #touch)
- **Look up** (chapter 01, under the explainer): the real sky over the birthplace at the birth minute, all the way round.
  Drag sideways or use Turn left, Turn right and Face south. Tap a planet for its name and height. Six bright stars named.
- **Your birth minute** (chapter 02, under primer card 1): drag the birth time three hours either way, in two-minute steps.
  The rising sign moves with it, and when it changes sign every house moves one sign.
- **Going backwards** (chapter 02, in the house card of each planet the chart marks R): the planet's path seen from Earth,
  day by day around the birth, with its two turning dates and the birth marked. Drag the date or play it.
- Each is computed in the browser by the engine, has a readout announced to screen readers, works by keyboard, and in
  reduced motion jumps to its end state.

### 4. The chart follows your reading (artifact #follow)
- As you read, the chart lights what the line at the reading mark cites, from the citation numbers already in the prose.
- **Computer**: the wheel at the top of the chapter's side column (ADR-24), in the chart system's Focus state.
- **Phone**: question 1. Recommended: a thin strip under the chapter bar, the twelve houses in order, each planet at its
  degree inside its house.

### 5. Drawn by the chart system (review-09-10 §2b)
- Every chart is the landing page's wheel (`HorizonWheel.tsx`), copied, never redrawn: the flat horizon with the rising
  degree at 9 o'clock, the two rim lines (sign, then "4 · HOME"), 5° ticks, our planet renders at their true degree,
  stepping inward when crowded. One Ascendant marker. No MC line. Chiron and the nodes drawn. No house drawings.
- Grey-blue frame, brass only for what the words are about. On a teaching chart, the one aspect line a step is about is
  brass too. The full chart keeps the site's aspect colours. At most three colours a screen: the chapter's own, the one
  the content carries, and greys. Controls stay indigo.
- New parts (the player, the strip, the three tools) go on the chart-system page (`docs/annex/chart-system.md`) first.

### 6. Engine helpers (the brain)
- In `packages/engine/`, pure and read-only: the sky at a moment (height and compass bearing of each body and six bright
  stars), a planet's path day by day (longitude and latitude), the rising degree minute by minute, and the next sunrise.
  All from astronomy-engine, which the engine already uses. They feed drawings only, never the writer.

## Out of scope
Each is its own ideation (artifact #later), and question 2 picks the next one.
- **Listen**, the report read aloud: OpenAI's speech takes 4,096 characters a request and returns no timings, browser
  voices differ by browser, and Kokoro's quantized model is a 92.4 MB download.
- **Make my video**, a short video of your chart to share: way C (a video file per reader, rendered on our server).
- **The sky kept moving**: a door from the report into Timeline, never a copy of it.
- AI-made video: it can't draw a real sky at true degrees, and OpenAI's SDK gives 24 September 2026 as the day its video
  API shuts down. Video files inside the report: none. The /method film stays on /method, linked from the method note.
- The Compatibility report: review-09-10 §4's walk is its own motion. Any Did you know card in the chapters.

## Acceptance criteria
1. Each of the ten chapters shows its explainer under its title on a phone and a computer. Nothing else on the page moves.
2. Every step is evidence its chapter cites, picked by the rule in §1. Every position is the engine's, at its true degree.
3. An explainer starts once when 55% of it is on screen, holds its last frame, never loops, pauses off screen.
4. Every explainer has Play or Pause, Replay and a scrub bar that work by keyboard and screen reader.
5. Reduced motion: every explainer and tool shows its last frame, still and complete at first paint, transcript open.
6. "What it shows" lists every step, and each picture's alt states its facts.
7. Durations: chapters 03 to 09 at most 15 s, chapter 01 at most 21 s, a primer card at most 19 s.
8. Every caption word comes from §2's sources. Houses read "(Nth, word)". The words pass `/ux-copy`.
9. Chart system: no body drawn as a dot or symbol (the glyph fallback for Chiron and the nodes excepted), no MC line, brass
   only on lit parts, at most three colours a screen. Grep and the probe check it.
10. The three tools work from the reader's own chart, by touch, mouse and keyboard, and announce their readout.
11. On a computer the side wheel lights what the line at the reading mark cites. On a phone, per question 1.
12. At 390, 768 and 1440 px: no sideways scroll, nothing overlapping. Lighthouse and axe on the preview pass (ADR-192).
13. Real chart data only: fixtures hold birth data, charts are computed at run time. The buyer walk is unchanged.

## Screens
The artifact, version 6, each screen on a computer and a phone side by side: #watch (chapter 01's explainer, three start
modes), #chapters (all ten, beside today's screen), #touch (the three tools), #follow (side column, strip, small wheel),
#later (the three later ideas), #made (ways A, B and C), #rules, #questions, #sources.

## Open questions (each with its default)
1. On a phone, how should the chart follow your reading? A, a thin strip under the chapter bar. B, a small wheel in a
   taller chapter bar. C, not on phones. Default: A.
2. Which later idea gets its own ideation next? A, Make my video. B, The sky kept moving. C, Listen. Default: A.

Settled without a question: it plays when you reach it, from the Owner's own "as you scroll".

## Cross-spec points (for whoever locks review-09-10)
- review-09-10 calls the primer cards "short loops" with no Pause. Here they play once with Pause and Replay: WCAG 2.2.2
  counts scrolling into view as starting by itself, and `/web-taste` rules out loops that never stop.
- Its card 4 shows teal and rose on chapter 02's blue accent, so four colours with the greys. The review decides.
- A teaching chart's one aspect line is brass here, to keep three colours a screen.

## Decisions to record
- Every Personal report chapter gets a short explainer, drawn on the reader's own chart (the Owner asked for explainers as
  you scroll, the form Decided by Claude).
- Drawn live in the page (way A). The /method film stays on /method (way B). A video file per reader only for Make my
  video (way C) (Decided by Claude).
- It plays once when you reach it, on its own clock, with Play or Pause, Replay and a scrub bar. Never a loop, never driven
  by scrolling (from the Owner's "as you scroll", the rest Decided by Claude, WCAG 2.2.2).
- The primer's four cards use this player and play once too (Decided by Claude, cross-spec with review-09-10).
- At most three pieces of the chapter's own evidence, most cited first, new before repeats, all cited lit at the end. 15 s
  at most, chapter 01 21 s, primer cards 19 s (Decided by Claude).
- Captions only from engine numbers and words we already ship. No new sentence about the reader (Decided by Claude).
- Reduced motion shows the last frame with the transcript open. Every explainer has "What it shows" (Decided by Claude).
- Look up in chapter 01, Your birth minute under primer card 1, Going backwards in each R planet's house card, computed
  in the browser by the engine (Decided by Claude).
- On a computer the side column's wheel follows your reading (Decided by Claude). The phone waits on question 1.
- Drawn by review-09-10's chart system. A teaching chart's one aspect line is brass. New parts enter the chart-system page
  first (Decided by Claude).
- No sound, no AI video and no video files in the report. Listen, Make my video and The sky kept moving each get their own
  ideation (Decided by Claude).
- The Closing's dawn stays, with its clock running to the real sunrise and one line on when the Sun rose (Decided by Claude).

## Verified sources
Each claim was found by the researcher and re-fetched by the verifier on 2026-10-09. All 20 were marked supported. Claims
about other astrology apps could not be checked, so none are used.
1. HyperFrames: Apache 2.0, no fee per render. Needs Node.js 22 or later and FFmpeg.
   https://raw.githubusercontent.com/heygen-com/hyperframes/main/README.md
2. HyperFrames: each render worker spawns Chrome, about 256 MB. https://github.com/heygen-com/hyperframes (preview-render.md)
3. HyperFrames telemetry off with HYPERFRAMES_NO_TELEMETRY=1 and DO_NOT_TRACK=1.
   https://raw.githubusercontent.com/heygen-com/hyperframes/main/packages/cli/src/telemetry/policy.ts
4. Remotion: free for up to 3 people, then $25 a seat a month, or $0.01 a render with $100 a month at least.
   https://raw.githubusercontent.com/remotion-dev/remotion/main/packages/promo-pages/src/components/homepage/FreePricing.tsx
5. Railway: $0.000463 per vCPU-minute, $0.000231 per GB-minute, $0.05 per GB sent.
   https://raw.githubusercontent.com/railwayapp/docs/main/content/docs/pricing/plans.md
6. Chrome: muted autoplay is always allowed. play() can be refused with NotAllowedError, so show a Play button.
   https://raw.githubusercontent.com/GoogleChrome/developer.chrome.com/main/site/en/blog/autoplay/index.md
7. MDN: playsinline is required for autoplay in Safari.
   https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/media/guides/autoplay/index.md
8. Chrome for Android: no autoplay in Data Saver mode.
   https://raw.githubusercontent.com/GoogleChrome/developer.chrome.com/main/site/en/blog/autoplay-2/index.md
9. View Transitions: Baseline since 14 October 2025.
   https://raw.githubusercontent.com/web-platform-dx/web-features/main/features/view-transitions.yml.dist
10. Scroll-driven animations: not Baseline. In Chrome 115 and Safari 26, not in Firefox.
    https://raw.githubusercontent.com/web-platform-dx/web-features/main/features/scroll-driven-animations.yml.dist
11. WCAG 2.2.2 (A): moving content that starts by itself and lasts over 5 s needs a way to pause it. Scrolling into view
    counts as starting by itself. https://raw.githubusercontent.com/w3c/wcag/main/understanding/20/pause-stop-hide.html
12. WCAG 2.3.3 (AAA): motion from interaction can be turned off.
    https://raw.githubusercontent.com/w3c/wcag/main/guidelines/sc/21/animation-from-interactions.html
13. WCAG 1.2.1 (A): video-only content needs a text alternative or an audio track.
    https://raw.githubusercontent.com/w3c/wcag/main/guidelines/sc/20/audio-only-and-video-only-prerecorded.html
14. iOS Reduce Motion turns on prefers-reduced-motion in Safari.
    https://raw.githubusercontent.com/WebKit/WebKit/main/Source/WebCore/platform/ios/ThemeIOS.mm
15. Android's animation scale at 0 turns on prefers-reduced-motion in Chrome. https://raw.githubusercontent.com/chromium/
    chromium/main/ui/accessibility/android/java/src/org/chromium/ui/accessibility/AccessibilityState.java
16. OpenAI speech: 4,096 characters a request, 13 voices, no timing option.
    https://raw.githubusercontent.com/openai/openai-python/main/src/openai/types/audio/speech_create_params.py
17. OpenAI's SDK: the Sora video API is scheduled to shut down on 24 September 2026.
    https://raw.githubusercontent.com/openai/openai-python/main/src/openai/resources/videos.py
18. Kokoro-82M: Apache 2.0. kokoro-js runs 100% locally in the browser.
    https://raw.githubusercontent.com/hexgrad/kokoro/main/kokoro.js/README.md
19. Kokoro's quantized model is 92.4 MB. https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/tree/main/onnx
20. Web Speech: which voices exist depends on the browser.
    https://raw.githubusercontent.com/WebAudio/web-speech-api/main/index.bs

## Product files
`web/src/pages/ReportPage.tsx`, `web/src/components/report/` (`Chapter.tsx`, `ChapterRail.tsx`, `BuildStory.tsx`,
`HousePrimer.tsx`, `HouseCard.tsx`, `DawnClosing.tsx`, `Citation.tsx`, `EvidenceCard.tsx`, `ProseRail.tsx`),
`web/src/lib/build-story.ts`, `evidence-glossary.ts`, `facts.ts`, `chapter-accent.ts`, `web/src/site/components/
HorizonWheel.tsx`, `web/src/components/chart/wheel-geometry.ts`, `NatalWheel.tsx`, `packages/engine/src/houseCovers.ts`,
`EvidenceRef` in `web/src/types/chart.ts`.
