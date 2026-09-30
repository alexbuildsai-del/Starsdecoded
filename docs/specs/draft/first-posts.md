# First posts: Phase 0 in practice

Ideation 2026-09-30 with the Owner, three rounds. Status: **draft**, the rule book (draft two)
waiting for the Owner's yes. Artifact: https://claude.ai/artifact/AWDQpwmvjy9nsgi3cThtr2. Rule book
page: https://claude.ai/artifact/AvugTm2z3TmPAt1FcJiFU5. Notion Social hub (under GTM):
https://app.notion.com/p/3ebfefe74931813d9c76c211d07cadcd

Builds on `pricing-and-launch` (locked 2026-09-27, ADR-142 to 149; on
`claude/compassionate-clarke-l16qww`, not yet on `main`). Its launch plan (ADR-147) sets Phase 0.
This spec is how Phase 0 runs, and the weekly routine that makes the posts.

## The Owner's answers (30 Sep)
- **Round two.** Bank now, post from the day the waitlist is live on production (ADR-147's order).
  Yes to by-sign; "What you do when you're hurt, by Moon sign" and "Why your horoscope never quite
  fits" first. Not yet: "What this child needs", product screen recordings, the launch video and the
  Compatibility reel (after the report rework). TikTok is carousels only, no face. One Friday
  morning, about three hours, prepares next week. Posts use the product's own NatalWheel; a new or
  simplified version goes to the Owner as an HTML artifact first.
- **Round three, the rule book review.** Rules say what must be true and who approves what, never
  what a post may be about; best practice becomes guidelines with numbers. Dropped as rules: the
  reader-and-people-they-know rule, no forecasts (a timeline feature may come), hooks naming the
  reader, the tools. A reading of placements needs a computed chart or a quoted report line; other
  posts don't. Readers in posts are parked (MB-121). Planet renders go wherever they're relevant,
  the cover included. AI images only with the Owner's yes on the exact image. Calls to action say
  launch, never open. Sun-sign posts are allowed. Stars Decoded is a personality product in the
  spirit of 16Personalities, never mystical. Nothing is built before the Owner approves every slide
  on the proposal page; a video starts as words (approach, storyline, voiceover script). Claude
  proposes the sound with each post, and a signature track of our own is the goal. HyperFrames and
  claude-ads are installed now.

## Scope

### The frame (ADR-147, as amended below)
- @mystarsdecoded on Instagram and TikTok, Business accounts. Twenty posts banked, then one a day
  from the day the waitlist is live. The bio link goes to the waitlist, `utm_source` per platform,
  `utm_content` per post, changed each morning. Target 500 sign-ups in about four weeks.
- Phase 0 runs on carousels: TikTok photo mode at 9:16 (1080×1920) and Instagram carousels at 3:4
  (1080×1440) from the app, 4:5 only when a scheduler's API needs it.
- Pillars: by sign, computed not guessed, the sky right now, the product (new), public figures'
  charts. Parked: one sentence, two charts no score, what this child needs.

### The Friday session (the workflow)
1. The Owner opens a Claude Code session on the repo and says "next week's marketing" (`/marketing`).
2. Claude reads the Content board, the inbox and last week's numbers, picks seven posts, writes them,
   computes every fact, renders every slide in both sizes and checks them against the rules.
3. Claude publishes the proposal: one page (the Social Week artifact, republished each Friday) with
   every slide of every post, its caption, sound and alt text, and Approve or Ask for changes on
   each post, kept in the page's own db. Nothing more is made until the Owner answers.
4. Changes are made and shown again on the same page. Approved posts are finished: both sizes, alt
   text, caption, tag and sound on the Notion row, the slides in the chat until the environment
   allows api.notion.com.
5. The Owner schedules: Instagram in the app's own scheduler with the week's track, TikTok in Publer
   Free with the week's track or its reminder. Numbers go on the Posted rows each week; two more of
   the top two by shares per reach.

### Notion
- **Social** hub under GTM: where things go and the Friday steps.
- **Content** database (`collection://09ebb7ff-2acc-4341-b68e-c3da9ec027d3`), Board and Calendar
  views. Status Idea, Next week, Approved, Made, Scheduled, Posted, Parked. Pillar adds The product.
  Ideas go in as Idea rows from the phone; ideas in a chat are added by Claude.
- **Reference posts inbox:** the screenshot list from round one.

### The marketing skill and kit (`.claude/skills/marketing/`)
- `SKILL.md` triggers on "next week's marketing", "marketing posts", "the Friday session",
  "a carousel", `/marketing`. `references/rules.md` holds 26 rules, `references/guidelines.md` G1 to
  G18, `references/platforms.md` the dated platform facts behind them.
- `kit/wheel.mjs` renders `web/src/components/chart/NatalWheel.tsx` through the web app's Vite
  config from `calculateNatalChart`: full, blind or standalone, turned so the Ascendant sits on the
  horizon as on the website. No wheel is drawn by hand.
- `kit/render.mjs` writes each post in both sizes with a contact sheet, `alt.txt` and a copy of the
  post. `kit/proposal.mjs` builds the Friday proposal page. `kit/sky.mjs` gives sky events.
- `kit/examples/`: the first two posts as shapes to start from. Neither is approved; both went back
  to Idea on 30 Sep (built before the approval step, with the rejected call to action).
- `.claude/vendor/`: HyperFrames and claude-ads, pinned and reviewed, switched on when the launch
  video or ads start (the skill says how).

### Tools (free first)
- Scheduling: Instagram's own scheduler; Publer Free for TikTok carousels. Posting by API ourselves
  is not worth it: Instagram's API drops music, 3:4 and slides past ten, and TikTok's audit turns
  away tools that post only to your own account. Metricool's official MCP (a claude.ai connector,
  on its Free plan) is the step up once posting is steady.
- Sound: one Commercial Music Library track and one Sound Collection track in the house style on
  every post until our own track exists: ElevenLabs Music first, a composer before the launch video.
- Design: the kit. Canva is skipped. Motion later: HyperFrames. Paid ads at Phase 4: claude-ads.

### Replies and measures
The eight replies of round one stay (rising sign, AI, science, data, birth time, finding a time,
launch, price). Per post: hold, shares per reach, saves per reach, sign-ups by `utm_content`.

## Out of scope
Ads (Phase 4); creator outreach (Phase 3); comment-to-DM tools; Pinterest, Threads and YouTube
posting (names held only); product screen recordings, the launch video and the Compatibility reel
(after the report rework); the parent lens posts; readers' results (MB-121); a solo share card
(MB-104); any change to the waitlist, the landing, the report or prices (the waitlist's "open"
wording is MB-122).

## Acceptance criteria
1. @mystarsdecoded exists on Instagram and TikTok as Business accounts with the name field, bios,
   photo and tagged link from round one.
2. Twenty posts are banked before the first goes out, each approved on a proposal page at its
   current `rev`, with slides in both sizes, a caption, alt text and a tag on its Content row.
3. Every wheel on a slide is the product's NatalWheel rendered by `kit/wheel.mjs`; every degree,
   time and window traces to the product's engine; a station carries a date only.
4. Every reading of a placement traces to its doctrine entry or a quoted report line, noted on the row.
5. No post has licensed music, a length, a price outside the catalogue, a living person, a reader,
   a child, "open" in its call to action or an engagement-bait ask.
6. A Friday session run from `/marketing` in a fresh container renders a post from `kit/examples/`
   and builds a proposal page without help: `pnpm install`, `npm ci` for the kit, two commands.
7. From the day the waitlist is live, the bio link carries that day's `utm_content`, and the Posted
   rows carry the week's numbers each Friday.

## Screens
The artifact (round one): the frame, this week, the reference posts, the research, the templates,
the bank, the routine, replies, measures, the questions. The rule book page (rounds two and three):
the process, the rules, the guidelines, the sound, the tools, the call to action.

## Open questions
1. **The rule book:** the Owner approves draft two, or names a rule or guideline by number.
2. **The call to action:** the Owner picks one of the three lines on the rule book page (default:
   "Join the waitlist and we'll email you when we launch.").
3. **Network:** allow api.notion.com in the cloud environment (environment menu, Edit, Network
   access) so a session attaches slides to the rows itself. Until then they come through the chat.
4. **Question 3** (whose report fills "One sentence") returns with the product visuals.

## Decisions to record
1. **Phase 0 banks now and publishes from the day the waitlist is live, one a day** (ADR-147's order).
2. **By sign is a pillar, and so is the product** (Owner): any body, the Sun included.
3. **Phase 0 runs on carousels,** TikTok photo mode daily and Instagram carousels, faceless. Video,
   product screens, the launch video and the Compatibility reel wait for the report rework. Amends
   ADR-147's "five reels and two carousels a week" for Phase 0.
4. **The parent lens posts wait** (Owner: not yet).
5. **A post's wheel is the product's NatalWheel,** rendered from the engine by `kit/wheel.mjs`. A new
   or simplified wheel, plate or chart visual needs the Owner's yes through an HTML artifact first.
6. **Instagram carousels are 3:4 (1080×1440) posted from the app;** 4:5 only for a scheduler's API.
   Amends ADR-147's 4:5 for Instagram.
7. **Nothing is built before the Owner's yes:** every slide of every post on the proposal page,
   approved per post; a video starts as words (approach, storyline, voiceover script).
8. **Rules and guidelines are separate:** 26 rules hold always; G1 to G18 are best practice with
   numbers and may bend with a reason. No rule limits what a post is about.
9. **Readers stay out of posts** until MB-121 settles anonymised results and a reader's yes.
10. **Calls to action say launch, never open** (Owner).
11. **The free tool stack:** Instagram's scheduler, Publer Free for TikTok; no posting by API
    ourselves; Metricool's MCP when posting is steady; no Canva.
12. **The Stars Decoded sound** (G15), library tracks first, our own track next.
13. **HyperFrames and claude-ads are vendored, switched off** until the launch video or ads start.
