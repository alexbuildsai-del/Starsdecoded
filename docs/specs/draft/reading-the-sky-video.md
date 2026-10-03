# Reading the Sky: an explainer video (draft)

Status: draft v2, words first (marketing rule 24), 2026-10-03. v2 puts the real astronomy first (Owner, 2026-10-03: "stick to scientific facts and then make it a bit easier"). Storyboard, VO, voices and the chart
compared: https://claude.ai/artifact/6b7SrcCjsS5sg1ZoQJnXXX

The Owner asked for an explainer on how to read a natal chart, on the product's own chart, simple
enough for a child, with strong animation and sky visuals. This asks the Owner for an exception to
marketing G2 (video waits for the report rework) for this one film.

## Scope

- Four 16:9 episodes of 2 to 3 minutes (the real sky, the planets, the houses, the special points), also
  joined as one film of about 10 minutes. 1920×1080, voiceover, burned-in captions, built in HyperFrames
  (`.claude/vendor/hyperframes`, pinned 0.8.96), rendered locally.
- Method: every scene states the sky fact first (orbits, speeds, the horizon, the meridian, eclipses),
  then the chart meaning in the doctrine's words. No simplification may contradict the astronomy.
- One chart all the way through: 30 Aug 2012, 06:30 BST, London (51.5074 N, 0.1278 W). It is a real
  sunrise birth, chosen by a scan of London sunrises from 1980 to 2026 for its spread across the
  houses. Virgo is rising at 9°43′ and the Sun is at Virgo 7°15′ in house 1, so 10 planets sit in
  10 houses. Every placement shown or said comes from `calculateNatalChart`, and every wheel is
  the product's `NatalWheel`.
- Thirteen scenes: hook; the flat solar system and the zodiac strip; twelve equal signs from the March
  equinox (not the constellations); the horizon and birth time (Virgo rose in 2 h 50 m, Pisces in 52 m,
  computed); who-how-where; the planets, each with a sky fact and its role, retrograde as Earth
  overtaking; counting whole-sign houses (1–6 below the horizon, 7–12 above); twelve objects; the MC
  as the meridian; the nodes and eclipses; Chiron; reading one placement; close.
- Memory helpers: who, how, where (planet = actor, sign = costume, house = stage); twelve objects for
  the houses (mirror, wallet, phone, family tree, paintbrush, to-do list, handshake, locked box,
  passport, spotlight, team, pillow), each over the product's house word; six real opposites across
  the wheel (me / the other person, mine / shared, near / far, private / public, my joy / our hopes,
  doing / resting); North Node an arch, South Node a cup.
- Science: every astronomy line is supported by JPL (researcher plus verifier, 2026-10-03) or computed
  with the product's engine or astronomy-engine 2.1.19. The table is in the artifact. Chiron's myth is
  told as a story and is unsourced.
- Look: the Observatory direction (MASTERFILE §9), with the tokens, the four faces and one easing
  `cubic-bezier(.16,1,.3,1)`. Brass is geometry and east is on the left. The planet renders are
  bodies. Sky scenes (starfield, ecliptic, the turning dome, orbits in 3D) are drawn in the
  composition, never stock.
- Voice: offline Kokoro, with no key and no cost. Captions are word-timed by Parakeet. No music.

## Out of scope

- Aspects. They get one line in the close, as a lesson of their own.
- Each sign in depth. A sign gets one word, taken from its doctrine short line.
- Vertical cut-downs, posting and the Content board rows. These follow the approved master.
- Paid or human voice, generated music, cloud render, and HyperFrames `publish` or `feedback`.

## Acceptance criteria

1. Every number on screen or in the VO traces to `calculateNatalChart` for the stated moment and
   place (rule 26). Chiron is named by sign and house only, because the engine's Chiron is
   low-precision.
2. Every wheel frame is the product's `NatalWheel` markup, animated by layer. No hand-drawn chart.
3. The VO matches the approved words; captions are burned in and in sync to ±100 ms.
4. Text stays readable at phone width when the 16:9 film is watched full screen.
5. `npx hyperframes check` passes. The render is H.264 + AAC at 30 fps.
6. No CDN at render time: GSAP and the fonts are local. Nothing calls home
   (`HYPERFRAMES_NO_TELEMETRY=1`).

## Screens

The storyboard artifact above holds all of this:
- a sketch for each scene, with its VO, on-screen text and motion;
- the chant wheel;
- four voice samples;
- the two candidate charts;
- the facts table.

## Build notes (from the tooling probe, 2026-10-02)

- Switch-on is as written in `.claude/skills/marketing/SKILL.md`. The env also needs:
  - `HYPERFRAMES_BROWSER_PATH`, pointing at `/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell`;
  - `HYPERFRAMES_PYTHON`, pointing at a venv with `kokoro-onnx`;
  - `HYPERFRAMES_SKIP_SKILLS=1`.
- Pin the CLI in the project with `npm i -D hyperframes@0.8.96`. A bare `npx` drifts to the latest
  version.
- The proxy blocks jsdelivr, unpkg and huggingface:
  - Vendor GSAP and the fonts locally.
  - Get Parakeet from the sherpa-onnx GitHub release; its hashes match the CLI's pins.
- Always set the background music to `none`. Left out, the CLI installs a music model.
- `kit/wheel.mjs` fails at SSR as committed ("module is not defined" from `react/jsx-dev-runtime`).
  Adding `ssr: { external: ["react", "react-dom"] }` to its Vite server fixes it. The kit's
  carousels hit the same error, so the fix belongs in the kit.

## Open questions (each with its default)

1. Chart: the sunrise demo (default) or Audrey Hepburn, the site's sample. Audrey's chart has 4 empty
   houses and 3 bodies stacked in the 4th.
2. Voice: af_heart (default), bf_emma, bm_george or am_michael.
3. Shape: four episodes (default), also joined as one film.

## Decisions to record

- A G2 exception for this explainer, if the Owner says yes.
- Teaching charts may use a computed public moment (no person) chosen for its spread, with moment and
  place stated on screen.
- The house chant words, and the arch and cup for the nodes, become the marketing vocabulary for
  teaching houses and nodes. In product copy, the house words stay as they are.
