# Report loading story: draft spec

Ideation 2026-10-05 with the Owner. Status: **draft v2**, waiting on three questions.
Artifact: https://claude.ai/artifact/H9Qv2gid87pBnDA6x18jsw (version 2)

The Owner wants the Personal report's loading screen to tell, step by step, how a chart is made:
- the place and date put you on the Earth;
- the sky is drawn around you and the planets are mapped;
- the time sets the horizon;
- the houses go on the ring;
- the chart is built while the report writes.

Timeline's setup screen gets the same idea. The same wheel and house words then run through the explainer
film on the site and the reels.

v2 lines this up with two other sessions:
- **Review 05/10.** Locked 2026-10-05 as ADR-297 to 312: `docs/specs/locked/review-05-10.md`, on branch
  `claude/cool-sagan-xu2iyz`, not yet on `main`.
- **Reading the sky.** The explainer film, draft v3, on branch `claude/reading-the-sky-video`, with chapter 1 built.

The Owner on v1: "I really love the outline of the earth and how you take these visuals that we already have and
then you're repurposing them". He wants the house keywords and pairs "for the loading animation, for the reels,
for the product and everywhere", and an explainer with "press play" on the website.

## What the session found
- **Today's screen.** `OpeningOverlay` over `Orrery` (ADR-47, 59):
  - eleven rings at mean daily motion, a 1.4 s settle, then a turn at 1.5°/s forever;
  - one percentage and five labels (`web/src/lib/progress.ts`);
  - no houses, no sign band and no aspect lines.
- **The door.** Start reading needs real ≥ 67 with Overview and House by House landed; at 100% the page opens
  itself after 1.2 s.
- **Timing.** The chart is a local engine call, stored before any writing. The foundation call takes about 30% of
  wall time, then the sections run in parallel and land in any order, and the client polls `/status` every 2 s.
  R02 measured 50 to 116 s in all.
- **A bug the animation needs fixed.** `useLiveReport` never refetches the report when `chartReady` flips.
- **Review 05/10 already locks Timeline's setup** (§5): "the Timeline dial draws (chart, rings, planets placed one
  by one, then they move and the gold lines to the chart form). Six steps tick as their readings land: chart,
  planets, this week, this month, the next six months, life cycles birth to 90."
  - Everything is written at setup.
  - Past about a minute: "Almost there. You can start reading this week now."
  - The next six months play once on the next visit: "Your next six months are ready, <from> to <to>".
  - Retrograde shows as an R on the dial.
  - "Retrogrades count as transits."
  - A Did you know card sits under the report's opening screen and the setup, "whose progress does not change".
- **Words in use.** Review 05/10 writes "transits" for Timeline ("5 transits this week") and "cycles" for Life.
  "Transit" appears nowhere in shipped copy yet; "moment" appears once (`FiveThings.tsx:165`).
- **Reading the sky** (16:9, about 5:14, three chapters, HyperFrames, Kokoro voice, burned-in captions):
  - chapter 1, "The real sky", is built (1:33);
  - its storyboard gives each house an object over the product word, and six opposite pairs;
  - its draft keeps those for marketing only.
- **Pieces to build on.** `HorizonWheel` (first light, rewind, `lit` layers), the browser engine in
  `web/src/site/lib/sky.ts`, R16's `Dial` with `framesFor`, and `/method`'s step 1, "We work out your chart".
- **Research.** What other apps call these: not verified. This session's network blocks the sites (researcher and
  verifier, 0 of 14 claims checked). Nothing waits on it: Review 05/10 already chose the words.

## Scope

### 1 · Personal report: six steps (screen 1)
Steps 1 to 5 play once, about 29 s, inside the foundation pass. Step 6 follows the real writing. Each step shows
one short title, one plain sentence, and its numbers in mono.
1. **Where you were born.** An orthographic globe with Natural Earth's 110m coastline (public domain) turns to the
   birthplace, and a brass point lands on it. Shown: latitude, longitude and the place.
2. **The sky on your birth day.** The Earth shrinks to a dot ("you") and the zodiac ring draws. Each body runs on
   its own ring at its mean daily motion and stops on its computed degree. A date counter runs to the birth date.
3. **Where each planet stood, and how they face each other.** The rings fold onto the chart ring, crowding inward
   (R-3.1). Names appear, then the aspect lines draw, closest orb first, and the closest pair is named.
4. **Your birth time sets the horizon.** This is the one big moment. The horizon draws. A clock runs from
   midnight to the birth time while the sky turns under the line on the engine's Ascendant for that day. The
   Ascendant and Midheaven lock in brass, and the half below the horizon darkens.
5. **Your twelve houses, then the six pairs.** The whole-sign houses fill from house 1, each with its object, word
   and covers line (§3). Then the six pairs draw across the centre, each with its caption.
6. **Now writing your report.**
   - The chart holds still: ADR-59's forever turn ends.
   - As each chapter lands, the wheel lights for a moment the placements its evidence cites.
   - The progress is unchanged: one percentage and one label, never a count.
   - The Did you know card (Review 05/10 §9) sits under it.
   - Start reading keeps its rule.
- **No birth time.**
  - Step 4 reads "No birth time, so no horizon", and the Moon is drawn as its day's arc (ADR-33).
  - Step 5 reads "Houses need a birth time".
- **Reduced motion.** The finished chart at first paint, with the six steps as a still list.
- **Pacing.**
  - The browser computes the chart from the profile, as the public sky pages do, so the story never waits on
    the network.
  - Start reading shows at 67% whatever is playing.
- **One component.** `web/src/components/report/BuildStory.tsx`, grown from `HorizonWheel`, drawn by a pure
  `frameAt(t, chart, progress)`. It replaces `Orrery` in `OpeningOverlay`. The fix: refetch when `chartReady` turns true.

### 2 · Timeline setup: Review 05/10 §5, drawn (screen 2)
One screen under "Setting up Timeline", on the R16 dial:
1. Your chart comes in whole; nothing is drawn again.
2. The tracks draw and the planets land one by one, Saturn and Jupiter first, at today's positions.
3. The date runs through six months. A gold line joins a planet to the point it touches, and that house lights.
   A retrograde planet carries its R and dashed ring. The count reads "N transits".
4. "Almost there. You can start reading this week now." Then "Your Timeline is ready" and Open Timeline.
- The six ticks follow the readings as they land, as locked: chart, planets, this week, this month, the next six
  months (with the transit count), life cycles birth to 90 (with the cycle count). Mira: 16 transits, 42 cycles.
- The six-month replay is the same drawing, from step 3.

### 3 · One house set, everywhere (Q1)
- **One table in the code** (`web/src/lib/houses.ts`, absorbing `HOUSE_WORDS` and `HOUSE_THEMES`) holds, per house:
  - the word, unchanged;
  - the object (from Reading the sky);
  - the covers line;
  - its pair.
- **Covers lines** become the film's simpler ones. The 5th says "love" in place of "romance" (the Owner's Review
  05/10 note). The before and after is on the artifact.
- **The pairs:** 1–7 me · the other person, 2–8 mine · shared, 3–9 everyday · big picture, 4–10 private · public,
  5–11 my joy · our hopes, 6–12 doing · resting. 3–9 replaces the film's "near · far", after the Owner found "far"
  meant nothing.
- **Objects** are line drawings in the houses' light indigo; brass stays measured geometry (§9). Twelve drawings,
  made once, used by the app and the film.
- **Where it shows:**
  - the loading story, step 5;
  - the reels and the explainer;
  - `/learn/houses`, as a pairs section and an object column;
  - each House by House card, as one line: "Opposite: 7th, Partnership. Me · the other person."
- **The report's prose is not edited by hand.** The writer is given the covers lines through the doctrine, and the
  dry lab runs.

### 4 · Words: transits and cycles
- **Transit:** a planet touching a point of your chart for a while; a retrograde counts. Used in the week, the six
  months and the setup.
- **Cycle:** a slow planet coming back round. Used in Life.
- **Reading:** what we write about one transit or one cycle.
- Never "moments", "things" or "events" in copy. `FiveThings.tsx:165`'s "Every moment read" becomes "Every transit
  read".

### 5 · The explainer on the site (Q2)
- `/method` step 1, "We work out your chart", shows Reading the sky as a still with a play button.
- It plays only when tapped, with the voice and burned-in captions: 16:9 on a computer, the 9:16 cut on a phone.
- One self-hosted file per chapter, so no third-party player and no cookie. Chapter 1 now; 2 and 3 when built.
- The CSP gains `media-src 'self'`.
- Reading the sky's chapter 2 adopts §3's covers lines, pairs and objects.

### 6 · Reels (Q3)
- Two 9:16 reels, about 30 s each, from the same scenes, rendered in HyperFrames like the film.
- `frameAt` is driven per frame, so the app, the film and the reels draw one wheel.
- Each reel ends on one still card: the finished chart, "Stars Decoded" and the address.
- Every reel goes through `/marketing` for the Owner's yes.

## Out of scope
- The compatibility report's loading screen, which keeps the orrery for now (ADR-97 bars two charts on one plate).
- Music, and paid ads built from the reels.
- Reading the sky's chapters 2 and 3 themselves; they stay with that spec.
- Stripe's checkout. The setup starts wherever Timeline access starts.

## Acceptance criteria
1. A new Personal report plays steps 1 to 5 in about 29 s on a phone, then holds the chart at the engine's degrees
   (equal to the hero's to 0.01°) while `/status` drives the progress.
2. Mira's globe centres on 38.72° N, 9.14° W, and her horizon step ends on Rising 12°07′ Aries.
3. Start reading appears at real ≥ 67 with Overview and House by House landed, whatever step is playing.
4. A blind chart draws no horizon, angle or house; steps 4 and 5 show their one line, and the Moon is an arc.
5. Reduced motion: the complete chart and the step list at first paint, no movement.
6. A first GET that lands before the chart is stored shows the chart within one poll.
7. The Timeline setup's counts equal the engine's: `readsAs` events for the range, and `lifeCycles` to 90.
8. One `houses.ts` feeds the story, `/learn/houses`, House by House and the film's data. No other copy of the house
   words is left in `web/`.
9. "transit" and "cycle" are the only names for these in copy; a grep finds no "moment" or "things".
10. `/method` plays chapter 1 only on a tap, with captions. The CSP holds, and Lighthouse and axe pass.
11. Words pass `/ux-copy`, and screens pass `/web-taste` at 390, 768 and 1440 px. The buyer walk still passes.

## Screens
The artifact, version 2: https://claude.ai/artifact/H9Qv2gid87pBnDA6x18jsw. In order: the Personal player (Known / Not
known), the Timeline setup player, the house set, transits and cycles, the explainer on /method, the reel storyboards,
the before and after, the rules and the questions. All frames are drawn from Mira's chart (synthetic), computed by
`@workspace/engine`.

## Open questions (each with its default)
1. **The house set everywhere, the report's House by House included, with the simpler covers lines?**
   Recommended: yes. Default: yes.
2. **Where does the explainer play?** Recommended: `/method` step 1, tap to play. Default: that.
3. **Whose chart do the reels show?** Recommended: the sample people (labelled) and public dates; a customer's
   chart only with their written yes. Default: that.

## Decided by Claude (rules answer them)
- The chart holds still once built (web-taste: no loop that never stops).
- Steps 1 to 5 last about 29 s and never hold back the door (progress is real).
- The report's progress stays one percentage and one label; the chapter-tick list of v1 is dropped (ADR-47, never a
  count). Lighting the cited placements carries "built one by one".
- Reels render in HyperFrames, as Reading the sky does: one toolchain, no second recorder.
- Objects are drawn in light indigo, not brass (§9).
- "transits" and "cycles", as Review 05/10 already writes them.
- 3–9 is "everyday · big picture" (the Owner's "far" note).
- Each chapter lights what its evidence cites, never a fixed table (R-3.1).

## Decisions to record
- The Personal loading screen tells how the chart is made, in six steps, replacing the orrery (amends ADR-47, 59). It
  holds still once built; progress, the door and the Did you know card are kept.
- A blind chart's story skips the horizon and houses with one line each (ADR-33 holds).
- `useLiveReport` refetches the report when `chartReady` turns true.
- Review 05/10's setup screen is drawn as screen 2, on the R16 dial.
- One house set (word, object, covers, pair) in `houses.ts` is used across the app, the site, the film and the
  reels; the covers lines are simplified and the 5th says "love". This supersedes Reading the sky's
  "marketing only" line (pending Q1).
- Transit and cycle are the product's words for these; never moments, things or events.
- Reading the sky plays on `/method` step 1, self-hosted, on a tap (pending Q2).
- Reels come from the same scenes in HyperFrames and are posted only after the Owner's yes (pending Q3).
- At this lock, Review 05/10's lock (branch `claude/cool-sagan-xu2iyz`) merges to `main` with it.
