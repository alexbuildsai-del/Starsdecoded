# First posts: Phase 0 in practice

Ideation 2026-09-30 with the Owner, two rounds. Status: **draft**, answers in. Artifact:
https://claude.ai/artifact/AWDQpwmvjy9nsgi3cThtr2. Notion Social hub (under GTM):
https://app.notion.com/p/3ebfefe74931813d9c76c211d07cadcd

Builds on `pricing-and-launch` (locked 2026-09-27, ADR-142 to 149; on
`claude/compassionate-clarke-l16qww`, not yet on `main`). Its launch plan (ADR-147) sets Phase 0.
This spec is how Phase 0 runs, and the weekly routine that makes the posts.

## The Owner's answers (30 Sep)
- **Question 1:** bank now, post from the day the waitlist opens on production (ADR-147's order).
- **Question 2:** yes to by-sign. "What you do when you're hurt, by Moon sign" and "Why your horoscope
  never quite fits" are the first two, built now.
- **Not yet:** "What this child needs". Product screen recordings, the launch video and the
  Compatibility reel wait until the report is reworked. Question 3 waits with them.
- **Format:** TikTok is carousels only, no face. One Friday morning, about three hours, prepares
  next week, and the week is scheduled from there.
- **The wheel:** posts use the product's own NatalWheel, as the report and the website draw it. A new
  or simplified version is shown to the Owner as an HTML artifact first.

## Scope

### The frame (ADR-147, as amended below)
- @mystarsdecoded on Instagram and TikTok, Business accounts. Twenty posts banked, then one a day
  from opening day. The bio link goes to the waitlist, `utm_source` per platform, `utm_content` per
  post, changed each morning. Target 500 sign-ups in about four weeks.
- Phase 0 runs on carousels: TikTok photo mode at 9:16 (1080×1920) and Instagram carousels at 3:4
  (1080×1440) from the app, 4:5 only when a scheduler's API needs it.
- Pillars: by sign (new), computed not guessed, the sky right now, public figures' charts. Parked:
  one sentence, two charts no score, what this child needs (product visuals come later).

### The Friday session (the workflow)
1. The Owner opens a Claude Code session on the repo and says "next week's marketing" (`/marketing`).
2. Claude reads the Content board, the inbox and last week's numbers, proposes seven posts, writes
   them, computes every fact, renders the slides and hands them over: files in the chat until the
   environment allows api.notion.com, then on each row; caption, alt text, tag and sound on the row.
3. The Owner reviews (about 30 minutes) and schedules (about 45): Instagram in the app's own
   scheduler with a track from its picker; TikTok in Publer Free with TikTok's recommended sound or
   a reminder to add the week's track. The sound routine is 15 minutes in TikTok's Creative Center.
4. Numbers go on the Posted rows each week; two more of the top two by shares per reach.

### Notion
- **Social** hub under GTM: where things go and the Friday steps.
- **Content** database (`collection://09ebb7ff-2acc-4341-b68e-c3da9ec027d3`), Board and Calendar
  views. Status Idea, Next week, Made, Scheduled, Posted, Parked. Hook, format, pillar, platforms,
  post date, sound, tag, caption, slides, views, shares, saves, follows, sign-ups, notes. Ideas go
  in as Idea rows from the phone; ideas in a chat are added by Claude.
- **Reference posts inbox:** the screenshot list from round one.

### The marketing skill and kit (`.claude/skills/marketing/`)
- `SKILL.md` triggers on "next week's marketing", "marketing posts", "the Friday session",
  "a carousel", `/marketing`. `references/rules.md` is the rule book; `references/platforms.md` the
  dated platform facts.
- `kit/wheel.mjs` renders `web/src/components/chart/NatalWheel.tsx` through the web app's Vite
  config from `calculateNatalChart`: the full form, the blind form, the standalone form, turned so
  the Ascendant sits on the horizon as on the website. No wheel is drawn by hand.
- `kit/render.mjs` writes each post in both sizes with a contact sheet and `alt.txt`. Slide types:
  cover, sign, text, strip (the unknown-birth-time ideation's day strip, fed by the product's horizon
  sweep and refined to the minute), end. `kit/sky.mjs` gives sky events with the pinned engine.
- `kit/examples/`: the first two posts, the templates for the next ones.

### The first two posts (banked, Status Made)
- **p01 · What you do when you're hurt, by Moon sign.** Cover on the product's wheel from the date
  alone; twelve type-only sign slides, each line from the doctrine (the Moon in the sign's style,
  its "under strain" line) with "What helps"; end slide on the Moon changing sign.
- **p02 · Why your horoscope never quite fits.** The sky over London at 09:00 on 31 Dec 1999; the Sun
  in Capricorn for everyone born that day (the blind wheel); the Moon from Libra to Scorpio at 09:37;
  five rising signs across the morning (the strip); two births four hours apart on standalone
  wheels; the end slide.

### Tools (free first)
- Scheduling: Instagram's own scheduler; Publer Free for TikTok carousels (up to 35 photos, ten
  posts waiting). Metricool Starter (about $20 to $25 a month) is the upgrade that sets a chosen
  sound and lets Claude load the week through its MCP.
- Design: the kit. Canva is skipped: its free plan can't fill templates, and the kit is exact.
- Motion, when video starts: Remotion (in the Anthropic plugin directory) for the product screens,
  HyperFrames for turning the kit's HTML slides into video. Paid ads at Phase 4: claude-ads.

### Rules every post keeps
The rule book in full is `references/rules.md`. Among them: every fact from the product's engine
with its moment and place; no forecasts or timing posts; sign meanings from the doctrine; readers
who said yes, only dead public figures, never a child's name or face; the product's names, never
a length; the product's look with brass only on geometry; the house voice with no emoji, dashes or
exclamation marks; no engagement bait; business-cleared sound only.

### Replies and measures
The eight replies of round one stay (rising sign, AI, science, data, birth time, finding a time,
opening, price). Per post: hold, shares per reach, saves per reach, sign-ups by `utm_content`.

## Out of scope
Ads (Phase 4); creator outreach (Phase 3); comment-to-DM tools; Pinterest, Threads and YouTube
posting (names held only); product screen recordings, the launch video and the Compatibility reel
(after the report rework); the parent lens posts; a solo share card (MB-104); any change to the
waitlist, the landing, the report or prices; weekly horoscopes and age or timing posts.

## Acceptance criteria
1. @mystarsdecoded exists on Instagram and TikTok as Business accounts with the name field, bios,
   photo and tagged link from round one.
2. Twenty posts are banked before the first goes out, each with slides in both sizes, a caption,
   alt text and a tag on its Content row, and a caption that passes `/ux-copy`.
3. Every wheel on a slide is the product's NatalWheel rendered by `kit/wheel.mjs`; every degree,
   time and window traces to the product's engine; a station carries a date only.
4. Every sign line traces to its doctrine entry, noted on the row.
5. No post has licensed music, a forecast, a length, a price outside the catalogue, a living person,
   a child or an engagement-bait ask.
6. A Friday session run from `/marketing` in a fresh container renders a post from
   `kit/examples/` without help: `pnpm install`, `npm ci` for the kit, one command.
7. From opening day, the bio link carries that day's `utm_content`, and the Posted rows carry the
   week's numbers each Friday.

## Screens
The artifact (round one): the frame, this week, the three reference posts, the research, the path,
the templates, the bank, the routine, replies, measures, the questions. Round two's slides were sent
in the chat as contact sheets and zips; the rendered posts live on their Content rows.

## Open questions
1. **Network:** allow api.notion.com in the cloud environment (environment menu, Edit, Network
   access) so a session attaches slides to the rows itself. Until then they come through the chat.
2. **Sign slides:** type only for now. A wheel on a sign slide would be a new version of the
   product's wheel, so it goes to the Owner as an HTML artifact first if wanted.
3. **Question 3** (whose report fills "One sentence") returns with the product visuals.

## Decisions to record
1. **Phase 0 banks now and publishes from opening day, one a day** (Owner, question 1; ADR-147's
   order kept).
2. **By sign is a seventh pillar** (Owner, question 2): Moon, rising, Venus, Mars and Saturn, one sign
   per slide, cover plus twelve plus end, every line built from the doctrine; no Sun signs.
3. **Phase 0 runs on carousels,** TikTok photo mode daily and Instagram carousels, faceless.
   Video, product screens, the launch video and the Compatibility reel wait for the report rework.
   Amends ADR-147's "five reels and two carousels a week" for Phase 0.
4. **The parent lens posts wait** (Owner: not yet).
5. **A post's wheel is the product's NatalWheel,** rendered from the engine by `kit/wheel.mjs`. A new
   or simplified wheel, plate or chart visual needs the Owner's yes through an HTML artifact first.
6. **Instagram carousels are 3:4 (1080×1440) posted from the app;** 4:5 only for a scheduler's API.
   Amends ADR-147's 4:5 for Instagram.
7. **The Friday session:** the Content board is the one place for ideas, posts and numbers; the
   `marketing` skill makes the posts; the Owner reviews and schedules.
8. **The free tool stack:** Instagram's scheduler, Publer Free for TikTok, the Creative Center sound
   routine; no Canva; Remotion and HyperFrames when video starts; claude-ads at Phase 4.
9. **The rule book** (`references/rules.md`) binds every post, including: public figures only if dead
   and with public birth data, from the date alone when no time is recorded, never a living person.
