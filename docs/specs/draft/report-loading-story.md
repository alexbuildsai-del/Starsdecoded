# Report loading story: draft spec

Ideation 2026-10-05 with the Owner. Status: **draft**, waiting on three questions.
Artifact: https://claude.ai/artifact/H9Qv2gid87pBnDA6x18jsw

The Owner wants the Personal report's loading screen to tell, step by step, how a chart is made:
- the place and date put you on the Earth;
- the sky is drawn around you and the planets are mapped;
- the time sets the horizon;
- the houses go on the ring;
- the chart is built while the report writes.

Timeline's setup after paying gets the same idea, reworked: the natal chart is already drawn, and six months
of transits run around it. Both animations are filmed for TikTok and Instagram reels. The Timeline part is
item 4 of the Owner's Notion note "Review 05/10" (https://app.notion.com/p/3f0fefe74931801bbafdcf8563255c33).

## What the session found
- **Today's screen.** `OpeningOverlay` over `Orrery` (canvas, `web/src/lib/orrery.ts`), from ADR-47 and 59:
  - eleven rings at mean daily motion, a 1.4 s settle onto the chart, then a turn at 1.5°/s forever;
  - one percentage and five labels (`web/src/lib/progress.ts`);
  - no houses, no sign band and no aspect lines.
- **The door.** Start reading needs real progress ≥ 67 and both Overview and House by House landed. At 100% the
  page opens itself after 1.2 s.
- **Timing.** The chart is a local engine call stored in milliseconds, before any writing. Then:
  - one foundation call runs alone, about 30% of wall time (`report-cost-and-latency.md`);
  - the sections then run in parallel and land in any order;
  - the client polls `GET /reports/:id/status` every 2 s.
  The only measured wall time is R02's, 50 to 116 s. It needs a fresh measure.
- **A bug the animation needs fixed.** `useLiveReport` never refetches the report when `chartReady` flips. A first
  GET that lands before the chart is stored leaves the overlay with no chart until the report completes.
- **Pieces to build on.**
  - `HorizonWheel`: first light, rewind, and the `lit` layers `signs|houses|horizon|bodies`.
  - The hour slider on `LearnBirthTimePage`, which turns the Ascendant through a day.
  - The browser engine in `web/src/site/lib/sky.ts`.
  - R16's `Dial` with `framesFor`. It already draws track rings, brass contact lines (solid for a conjunction,
    dashed otherwise), a dashed light-indigo ring on a retrograde, worded houses and Play.
- **Timeline today.**
  - Readings are written when first opened: `openReading` waits 20 s, and the queue writes at most 3 contacts per
    call. Life's cycle readings are never queued.
  - The page shows "Loading your Timeline" with dots.
  - There is no setup step after paying; checkout (stripe-payments) is locked, not built.
- **Video.** The marketing kit renders stills only, and video "waits for the report rework" (marketing SKILL).
  HyperFrames is vendored and switched off. Chromium and FFmpeg are on the box.

## Scope

### 1 · Personal report: six steps (screen 1)
Steps 1 to 5 play once, about 25 s, while the foundation pass runs. Step 6 follows the real writing.
Each step shows one short title, one plain sentence, and its numbers in mono.

1. **Where you were born.** An orthographic globe with Natural Earth's 110m coastline (public domain) turns to the
   birthplace, and a brass point lands on it. Shown: latitude, longitude and the place name.
2. **The sky on your birth day.** The Earth shrinks to a dot at the centre ("you"), and the zodiac ring draws.
   Each body runs on its own ring at its mean daily motion, as today's orrery does, and stops on its computed
   degree. A date counter runs up to the birth date.
3. **Where each planet stood, and how they face each other.** The rings fold onto the chart ring, crowding
   inward (R-3.1). Names appear, then the aspect lines draw, closest orb first. The closest pair is named.
4. **Your birth time sets the horizon.** This is the one big moment. The horizon line draws. A clock runs from
   midnight to the birth time, and the sky turns under the line on the engine's real Ascendant through that day.
   The Ascendant and Midheaven lock in brass (the R03 marker), and the half below the horizon darkens.
5. **Your twelve houses.** The whole-sign houses fill the band one by one from house 1, each with its word
   (`HOUSE_WORDS`, ADR-98).
6. **Now writing your report.** The chart holds still: the forever turn of ADR-59 ends here.
   - The ten chapters tick as they land.
   - As a chapter lands, the wheel lights for a moment the placements its evidence cites. This comes from the
     claims the chapter already has, never from a fixed table.
   - Start reading keeps its rule: 67% and the two chapters.
   - Progress stays real, one percentage, and is never a count.
- **No birth time.** Step 4 reads "No birth time, so no horizon" and draws the Moon as its day's arc (ADR-33).
  Step 5 reads "Houses need a birth time". Nothing else is drawn for those steps.
- **Reduced motion.** The finished chart at first paint, with the six steps as a still list (title and sentence).
- **Pacing.** The story never waits on the network: the chart is computed in the browser from the profile, as the
  public sky pages already do. The stored chart is still the one the report uses.
  - If the report is fast, step 6 starts as soon as step 5 ends.
  - If steps 1 to 5 are still running at 67%, Start reading shows at once over them.
- **One component.** `web/src/components/report/BuildStory.tsx` grows out of `HorizonWheel` and replaces `Orrery`
  in `OpeningOverlay`. It is drawn by a pure `frameAt(t, chart, progress)`, so the same time gives the same frame.
- **The fix.** The report query refetches when `chartReady` turns true.

### 2 · Timeline: setup after paying, four steps (screen 2)
Shown the first time a subscriber opens Timeline (today, the admin as its one subscriber), while the writing runs:
1. **Your chart, from your report.** The stored natal chart comes in whole. Nothing is drawn again.
2. **The sky today, around you.** Track rings draw one planet at a time, Saturn and Jupiter first (the Owner's
   note), then the rest. Each planet sits at today's position.
3. **Your next six months.** The date runs forward over the dial's frames (`framesFor`, 182 days). Three things
   use the dial's existing look:
   - a brass line joins a planet to the natal point it touches;
   - that point's house lights up;
   - a dashed ring marks a retrograde.
   A counter reads "N moments found".
4. **Moments found, readings written.** The doctrine's events that get a reading (`readsAs`), headlined in the
   engine's plain words. Each ticks when written, along with this week, this month and Life's cycles.
- **Writing up front** (Q1, the Owner's note). On first setup the server writes every reading Timeline will show:
  - the contacts and retrogrades for six months;
  - the week and the month;
  - every Life cycle.
  Spend goes through the spend cap and ledger as today. The page opens when the writing is done, or earlier on
  "Open Timeline" once this week is written.
- **After six months.** A short version runs steps 3 and 4 for the next six months, reading "Working out your next
  six months".
- Builds on `Dial`; no second look for tracks, lines or retrogrades.

### 3 · Reels (screen 3, Q2 and Q3)
- `pnpm brand:reel <personal|timeline> <person|date>` opens the component in a film route and steps `frameAt` at
  30 fps. Playwright captures each frame, and FFmpeg joins them into a 1080 × 1920 MP4 with the captions burned in.
- The film route is built only by the script and is never in the shipped app.
- Two reels, about 27 s and 30 s, each ending on one still card: the finished chart, "Stars Decoded" and the address.
- Our own recorder, not HyperFrames: one source for the app and the reel, with no new vendor.
- Every reel goes through `/marketing` for the Owner's yes before it is posted.

## Out of scope
- The compatibility report's loading screen. It keeps the orrery on person A's chart for now; two charts on one
  plate stay barred (ADR-97).
- Sound in the reels.
- Paid ads built from the reels.
- The Life cycles wave and the other Review 05/10 items.
- Stripe's checkout itself. The Timeline setup starts wherever access starts.

## Acceptance criteria
1. On a phone, a new Personal report plays steps 1 to 5 in about 25 s. It then holds still on the chart from the
   same engine (same degrees as the report's hero, to 0.01°) and ticks chapters as `/status` reports them.
2. Mira's globe centres on 38.72° N, 9.14° W, and her horizon step ends on Rising 12°07′ Aries.
3. Start reading appears at real ≥ 67 with Overview and House by House landed, whatever step is playing. At 100%
   the page opens itself after 1.2 s.
4. A blind chart draws no horizon, angle or house. Steps 4 and 5 show their one line, and the Moon is an arc.
5. Reduced motion shows the complete chart and the step list at first paint, with no movement.
6. After the fix, a report whose first GET lands before the chart is stored shows the chart within one poll.
7. Timeline's first setup lists exactly the events `readsAs` keeps for the range, with the engine's headlines.
   Every reading, the week, the month and every Life cycle is stored before the page counts the setup done.
8. `pnpm brand:reel personal mira` writes a 1080 × 1920, 30 fps MP4. Two runs give identical frames.
9. Words pass `/ux-copy` (simple words), and the screens pass `/web-taste` at 390, 768 and 1440 px.
10. The buyer walk still passes. It changes only if the overlay's way in changes, which it must not.

## Screens
The artifact: https://claude.ai/artifact/H9Qv2gid87pBnDA6x18jsw
- Screen 1: the Personal player, with the Known / Not known toggle.
- Screen 2: the Timeline player.
- Screen 3: both reels as storyboards.
- Then the before-and-after table, the rules and the questions.
Every frame is drawn from Mira's chart (synthetic, `fixtures/sample-people/mira.json`), computed by
`@workspace/engine`. Her sky runs from 5 Oct 2026 to 5 Apr 2027: 12 contacts and 4 retrogrades read, and 2
eclipses not near her points.

## Open questions (each with its default)
1. **Timeline writes everything before the page opens?** Recommended: yes, as the Owner's note asks.
   Default: yes, under the spend cap.
2. **Whose chart do the reels show?** Recommended: the sample people, labelled, and public dates. A customer's
   chart only with their written yes. Default: samples and public dates only.
3. **When do the reels start?** Recommended: the round that builds the animation builds `brand:reel`, and the first
   two reels go through `/marketing` for the Owner's yes. Default: built in that round, posted only after a yes.

## Decided by Claude (rules answer them)
- The chart holds still once built, ending ADR-59's forever turn. Rule: web-taste, "loops that never stop".
- Steps 1 to 5 last about 25 s, inside the foundation pass. Rule: progress is real, and the door is never delayed.
- Our own recorder, not HyperFrames. Rule: one look per kind of thing; the reel is the product's own component.
- Each chapter lights what its evidence cites, never a fixed table. Rule: R-3.1, the picture is the chart.

## Decisions to record
- The Personal report's loading screen tells how the chart is made, in six steps: place, sky, planets and lines,
  the time and horizon, houses, writing. It replaces the orrery, amending ADR-47 and 59; the door's rule is kept.
- Once built, the chart on that screen holds still. ADR-59's constant turn ends.
- A blind chart's story skips the horizon and houses with one line each (ADR-33 holds).
- `useLiveReport` refetches the report when `chartReady` turns true.
- Timeline gets a setup step the first time a subscriber opens it, and a short one every six months. It runs on
  the R16 dial, starting from the stored natal chart.
- Timeline writes all its readings, the week, the month and Life's cycles at setup (pending Q1).
- Reels are filmed from the product's own component by `pnpm brand:reel`, at 1080 × 1920 and 30 fps, and posted
  only after the Owner's yes (pending Q2 and Q3).
