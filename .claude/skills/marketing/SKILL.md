---
name: marketing
description: Stars Decoded's Instagram and TikTok posts. Plans next week's posts from the Notion Content board, writes them in the house voice, computes every sky fact with the product's engine, renders the carousels in the product's look with the kit in this folder, shows the Owner every slide on one proposal page for a yes, then finishes the approved posts for scheduling. Use when the Owner says "next week's marketing", "marketing posts", "make the posts", "the Friday session", "the weekly session", "marketing for the next two weeks", "a carousel", "content for the week", or types /marketing; also to review a post, hook, caption or reply. Not for the report's prose, the landing page or paid ads.
---

The weekly session: the Owner spends one morning a week on social, usually a Friday but any day
works, and one session may plan one week or two. This skill does the making. Posts are carousels (TikTok photo mode and Instagram), faceless, in the product's look,
built from real computed data. Nothing is built before the Owner's yes on the proposal page
(rule 23). Until the waitlist is live on production, approved posts go into the bank (Status
Made) and nothing is scheduled; from then, one a day (ADR-147, Owner 30 Sep).

## Read first
- `references/rules.md`: 26 rules that always hold. Always, before a word or a pixel.
- `references/guidelines.md`: G1 to G18, what performs and converts. A post may bend one; the
  proposal says where and why.
- The Social rule book page (https://claude.ai/artifact/AvugTm2z3TmPAt1FcJiFU5) shows both under
  the same numbers; a change goes there first, for the Owner's yes.
- `references/platforms.md`: dated platform facts, sound, scheduling, posting by API.
- The Notion Social hub, https://app.notion.com/p/3ebfefe74931813d9c76c211d07cadcd: the Content board
  (data source `collection://09ebb7ff-2acc-4341-b68e-c3da9ec027d3`) and the Reference posts inbox.
- `docs/specs/draft/first-posts.md` (or its locked copy): pillars, the bank, replies, measures.
- `/ux-copy` for every word and `/web-taste` for the look.

## The session
1. **Read the board.** Rows in Next week, then Idea; new screenshots in the inbox; last week's
   Posted rows and their numbers. Never Parked rows unless the Owner asks.
2. **Pick the posts:** seven for a week or fourteen for two, with the mix in G3, each with its hook
   and why. If the Owner is
   in the chat, give the seven hooks in one line each first, so a swap costs nothing; the yes
   itself happens on the proposal page. Set those rows to Next week.
3. **Write each post** as a JSON file in the scratchpad, copying the shape of `kit/examples/`: the
   slides, then `meta` with `hook`, `pillar`, `why`, `caption`, `hashtags`, `sound` (`tiktok`,
   `instagram`, from G15), `notes` (the doctrine entries and sources used), `bends` (a guideline
   the post bends, and why) and `rev` (1, plus one for every change the Owner asks for).
4. **Compute** every degree, time, window and sign with the product's engine: wheels and horizon
   windows through `kit/wheel.mjs`, sky events with `kit/sky.mjs` (`positions`, `events`, `moon`,
   `rising`). Put the moment and place on the slide. Never type a position.
5. **Render:** once per container `pnpm install --frozen-lockfile` at the root (the wheel is the web
   app's own component) and `npm ci --prefix .claude/skills/marketing/kit`, then
   `node .claude/skills/marketing/kit/render.mjs post.json --out <scratchpad>/out` for each post.
   It writes 3:4 for Instagram (4:5 with `--formats 4x5`) and 9:16 for TikTok, a contact sheet per
   size, `alt.txt` and a copy of the post. It finds Chromium itself; set `CHROME_PATH` if it can't.
6. **Check** every post against rule 26 and the guidelines. Fix and re-render.
7. **Propose.** Write `week.json` (the week, and each post's output folder and date), run
   `node .claude/skills/marketing/kit/proposal.mjs week.json --out <scratchpad>/proposal`, and
   publish `proposal.html` with the slides in `files.json` as the `files` map and capabilities
   `{db: {}}`, to the same Social Posts artifact every session (its URL goes in the Social hub the
   first time). Give the Owner the link and stop: nothing more is made until they answer.
8. **Read the answers** with `ArtifactData` (`list` on `verdicts`); an answer counts only when its
   `rev` matches the post's. Changes asked: fix, raise `rev`, re-render, republish the same page and
   wait again. Approved: set the row to Approved and go on.
9. **Finish the approved posts:** zip each size, put caption, hashtags, alt text (from `alt.txt`),
   Tag (`pNN-slug`) and Sound on the row, the slides on the row (in the chat while the environment
   blocks api.notion.com, noted on the row), and set Status Made.
10. **Report** in five lines: what's approved and made, what's waiting, the week's sound, and
    anything a rule stopped.

After a week of posting, read the numbers on the Posted rows and propose two more of the top two
(G18).

## Video and motion
Videos are made with the motion harness in `motion/` (Owner, 2 Oct 2026): a brief, then code,
then Remotion renders React frame by frame in headless Chrome to MP4. Every frame uses the web
app's own components (NatalWheel, the orrery's maths, TwoPlates, TriadPlate, HorizonWheel,
Chapter, EvidenceCard, Mark) fed by the engine for the posting day. Canvas or SVG is only for what
no component draws. Never screenshots or cropped pages. No image or video models without the
Owner's yes on the exact output (rule 17). Live components (HorizonWheel's first light, the
dashboard's Orbit) run on the frame-locked clock in `motion/src/clock.ts`; render with
concurrency 1, as `render.mjs` does. The words still come first unless the Owner asks for a
cut (rule 24), and the rendered file goes to the Owner before it posts. Start from
`motion/src/Trailer.tsx` (spec `docs/specs/draft/launch-trailer.md`):
`npm ci --prefix .claude/skills/marketing/motion`, `node motion/score/temp-score.mjs
motion/public/temp-score.wav`, then `node motion/render.mjs video out/x.mp4 --date YYYY-MM-DD`,
or `stills 4.6 9.7` to check frames. It finds the headless shell under `/opt/pw-browsers`; set
`CHROME_PATH` elsewhere.
The grammar is the v5 one (Owner's reference, 5 Oct 2026; `motion/src/v5/`): one shot with no
cuts, one short sentence at a time built word by word by `kit.tsx`'s sentence engine, objects
(the planet renders, never emoji) inline in the sentence, a rotating middle line, bursts that
collapse into the next object, springs for objects, and a sound under every arrival cued from
the same timeline JSON (`score/sfx.mjs`, mixed to -14 LUFS). Check stills with
`COMP=v5-opening node motion/render.mjs stills 1.6 4.4`.

## The kit (`kit/`)
- `wheel.mjs`: the product's NatalWheel, rendered through the web app's Vite config from
  `calculateNatalChart`. Full, blind (`windowMinutes: 720`) or standalone (`centreName`).
- `render.mjs`: slide types `cover`, `sign`, `text`, `strip`, `end`; visuals `wheel` (one product
  wheel for a moment and place) and `pair` (two standalone wheels side by side, each alone), and
  the day `strip` with a window and its zoom, fed by the product's horizon sweep.
- `proposal.mjs`: the proposal page, every slide in both sizes with its words, and Approve
  or Ask for changes on each post, kept in the page's db.
- `sky.mjs`: astronomy-engine 2.1.19, the product's pin and method, for sky events. CLI and importable.
- `slide.css` and `fonts/` (OFL): the product's tokens at 1080 px; Newsreader and Plex Mono are read
  from `web/src/assets/fonts`, Inter and Space Grotesk live here.
- `examples/`: "What you do when you're hurt, by Moon sign" and "Why your horoscope never quite
  fits", the shapes to start from. Neither is approved yet.
- A new slide type goes into `render.mjs` under the same rules. A new or simplified wheel, plate or
  chart visual goes to the Owner as an HTML artifact first (rule 14).

## Later: video and ads (vendored, switched off)
`.claude/vendor/` holds HyperFrames (the launch video, motion) and claude-ads (paid ads, from
customer 50, ADR-147), pinned and reviewed on 30 Sep 2026. They stay off so their 46 skill
descriptions don't load into every session or take over "marketing" and "animate" requests.
Switch one on only when its work starts, after the Owner's yes on the words (rule 24):
- **HyperFrames:** superseded for product video by the Remotion harness in `motion/`, which renders
  the real React components; keep it for plain HTML motion only. To use it, copy `vendor/hyperframes/skills/*` into `.claude/skills/` and its `plugin.json`
  to `.claude/plugin.json` (it pins the CLI at 0.8.96); set `HYPERFRAMES_NO_TELEMETRY=1` in the
  `env` of `.claude/settings.json`; never run its `feedback`, `publish` or cloud render; give
  `media-use` our own track or `music: none` (its fallback installs a music model). It needs FFmpeg
  and Chromium. Its sound effects were left out (Pixabay licence); fetch one from the pinned commit
  if a video needs it.
- **claude-ads:** copy `vendor/claude-ads/skills/*` into `.claude/skills/` and `agents/*` into
  `.claude/agents/`. Its run folders go to `.claude-ads/`, which `.gitignore` keeps out of the
  public repo. Refresh its references first (dated 25 Aug 2026).
