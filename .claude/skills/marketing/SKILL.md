---
name: marketing
description: Stars Decoded's Instagram and TikTok posts. Plans next week's posts from the Notion Content board, writes them in the house voice, computes every sky fact with the product's engine, renders the carousels in the product's look with the kit in this folder, and hands them over on Notion for scheduling. Use when the Owner says "next week's marketing", "marketing posts", "make the posts", "the Friday session", "a carousel", "content for the week", or types /marketing; also to review a post, hook, caption or reply. Not for the report's prose, the landing page or paid ads.
---

The Friday session: the Owner spends one morning a week on social, and this skill does the
making. Posts are carousels (TikTok photo mode and Instagram), faceless, in the product's look,
built from real computed data. Until the waitlist opens on production, finished posts go into the
bank (Status Made) and nothing is scheduled; from opening day, one a day (ADR-147, Owner 30 Sep).

## Read first
- `references/rules.md`, the rule book. Always, before a word or a pixel.
- `references/platforms.md` for sizes, sound, scheduling and what the apps reward. Dated: refresh a
  fact when a platform changes it.
- The Notion Social hub, https://app.notion.com/p/3ebfefe74931813d9c76c211d07cadcd: the Content board
  (data source `collection://09ebb7ff-2acc-4341-b68e-c3da9ec027d3`) and the Reference posts inbox.
- `docs/specs/draft/first-posts.md` (or its locked copy): pillars, the bank, replies, measures.
- `/ux-copy` (voice chart, AI tells) for the words and `/web-taste` for the look.

## The session
1. **Read the board.** Rows in Next week, then Idea; new screenshots in the inbox; last week's
   Posted rows and their numbers. Never Parked rows unless the Owner asks.
2. **Propose the week** in one short list: seven posts, no pillar twice in a row, at least one
   by-sign carousel and one explainer, each with its hook and why it was picked. Wait for a yes, or
   take the Owner's changes.
3. **Write each post** as a JSON file in the scratchpad, copying the shape of `kit/examples/`. Hook
   first, then the slides, then the caption. Note the doctrine entries used.
4. **Compute** every degree, time, window and sign with the product's engine: wheels and horizon
   windows through `kit/wheel.mjs`, sky events with `kit/sky.mjs` (`positions`, `events`, `moon`,
   `rising`). Put the moment and place on the slide. Never type a position.
5. **Render:** once per container `pnpm install --frozen-lockfile` at the root (the wheel is the web
   app's own component) and `npm ci --prefix .claude/skills/marketing/kit`, then
   `node .claude/skills/marketing/kit/render.mjs post.json --out <scratchpad>/out`. It writes 3:4
   for Instagram (4:5 with `--formats 4x5`) and 9:16 for TikTok, a contact sheet per size and
   `alt.txt`. It finds Chromium itself; set `CHROME_PATH` if it can't.
6. **Check** each contact sheet once at phone size against the rule book's checklist. Fix, re-render.
   Date-stamped visuals (the Moon today) are re-rendered in the week they post.
7. **Hand over** on each post's row: zip each size and upload both to Slides, embed the contact
   sheets in the page, fill Caption, Tag (`pNN-slug`), Sound (a mood; the Owner picks the track in
   each app) and set Status Made. Send the Owner the contact sheets in chat too.
8. **Report** in five lines: what's ready, what needs their eye, the week's sound mood, and
   anything a rule stopped.

After a week of posting, read the numbers on the Posted rows and make two more of the top two by
shares per reach. A hook that came last twice is dropped.

## The kit (`kit/`)
- `wheel.mjs`: the product's NatalWheel, rendered through the web app's Vite config from
  `calculateNatalChart`. Full, blind (`windowMinutes: 720`) or standalone (`centreName`).
- `render.mjs`: slide types `cover`, `sign`, `text`, `strip`, `end`; visuals `wheel` (one product
  wheel for a moment and place) and `pair` (two standalone wheels side by side, each alone), and
  the day `strip` with a window and its zoom, fed by the product's horizon sweep.
- `sky.mjs`: astronomy-engine 2.1.19, the product's pin and method, for sky events. CLI and importable.
- `slide.css` and `fonts/` (OFL): the product's tokens at 1080 px; Newsreader and Plex Mono are read
  from `web/src/assets/fonts`, Inter and Space Grotesk live here.
- `examples/`: the first two posts, "What you do when you're hurt, by Moon sign" and "Why your
  horoscope never quite fits". Start new posts from them.
- A new slide type goes into `render.mjs` under the same rules. A new or simplified wheel, plate or
  chart visual is shown to the Owner as an HTML artifact and waits for a yes (Owner, 30 Sep).

## Later, not in this skill
Product screen recordings, the launch video and the Compatibility reel wait until the Owner has
reworked the report (Owner, 30 Sep). When they come, record real screens only, never the old
landing page (it shows a made-up chart), and use the Remotion skills for motion.
