# Launch trailer

Draft 5, 2026-10-05, from `/ideate`. Artifact (the gap analysis, the proof cut, storyboard, asks):
https://claude.ai/artifact/BoKPjCCWbLRT7ZUfQ1army

A motion trailer for the TikTok and Instagram launch that sells the two reports and shows how
credits, Share with and Gift a report spread them. It is rendered by the motion harness
(`.claude/skills/marketing/motion`, Remotion) from the web app's own components and renders, at
the calm pace of direction A (72 BPM, G15), with nothing mystical in it (rule 10).

How it got here: draft 1's cropped staging pages were turned down; drafts 2 and 3 cut scenes to a
120 BPM beat; draft 4 slowed the same story to 72 BPM ("too fast", "I prefer slower A"). On
2026-10-05 the Owner shared a friend's trailer (Amperio, an AI app for electricians, 23.6 s) as
the quality bar. Draft 5 adopts its grammar, kept in our look, and proves it with an 18.6 s cut
of the opening and the Personal report (`v5-opening`).

Owner playbook rules followed: the rendered MP4 is the format for a video; at most three asks,
each with a default that is safe if he says nothing; no paid tool without his word.

## What makes the reference work, and what we take
Measured from the file (30 fps, 480x848, -10 LUFS, onsets near 72 BPM):
1. **One shot, no cuts.** Every element becomes the next: logo to icon wall, wall to sentence,
   mascot to check marks, checks to logo. Ours were scenes joined by crossfades.
2. **One sentence at a time, built word by word.** Centred, large, short; words sharpen in from a
   blur and the line reflows as each arrives. Ours swapped whole captions.
3. **Objects inside the sentence.** A 3D icon slots in between two words and pushes them apart.
4. **A rotating slot.** "Une IA qui [___] pour vous": one phrase and its icon change in place
   while the frame holds, so five features fit in eight seconds without feeling fast.
5. **A character.** The mascot bubble changes expression with each phrase.
6. **A burst.** The logo explodes into a wall of a hundred icons, then collapses.
7. **Sound on every arrival.** A pop, tick or swish under each element over a soft beat.
8. **Restraint.** One idea on screen, lots of empty space, one warm glow at the bottom.

What we keep of our own (rules 15 to 17, MASTERFILE §9): the dark Observatory look (a light theme
is out for V1), Newsreader, and **the planet renders in place of emoji** (rule 17 bans emoji;
rule 15 puts the renders wherever they are relevant). The renders are our 3D icon family; the
bubble holds a chapter's body where their mascot sits; chips are the product's own surface.

## Scope

### The film
- **Master:** about 32 s, 9:16 at 1080×1920, 72 BPM (one bar = 3.3 s), no voiceover,
  captions burned in inside TikTok's safe area (G13), the promise inside 1.5 s (ADR-147), the
  last frame flowing into the first (G16). One file for Reels and TikTok.
- **No birth time, no Timeline, no prices.** Checkout is not built and prices may still move
  (R14), so the trailer shows credits, never euros. The chart behind the wheel is "born today,
  09:00, Paris", recomputed on the posting day, with the moment and place in the caption
  (rule 1), never on screen.

### The storyboard (draft 5, about 32 s at 72 BPM; 0:00 to 0:15 and the end are built)
| # | Time | The sentence | What moves |
|---|---|---|---|
| 1 | 0:00 | Your star sign / is only your [Sun] *Sun.* | The Sun render pops alone; the sentence builds around it with the Sun inline |
| 2 | 0:03 | (the burst) | The Sun bursts into a field of every body, a hundred renders rippling out |
| 3 | 0:05 | Here's the rest / of *you.* | The field collapses; ten renders land on their degrees on the real wheel (today, 09:00, Paris) |
| 4 | 0:08 | (the morph) | The wheel shrinks into the bubble |
| 5 | 0:09 | Your report shows / [body] how you think · how you love · how you work · where you come from / and *why.* | The slot rotates; the bubble's body and its chapter chip change with it (Mercury, Venus, Saturn, Moon) |
| 6 | 0:15 | Every line shows / where it comes from. | Citation chips type on around the sentence ("Mercury 6.6° Sagittarius"), then turn into brass citation marks |
| 7 | 0:18 | Then read / [two bubbles] the two of *you.* | Two bubbles slide together; the slot rotates Couples · A parent and a child · Friends, family, colleagues |
| 8 | 0:21 | 1 [credit] credit, / 1 *report.* | A brass credit dot pops inline; three of them drop into chips: You · Tomás · The two of you |
| 9 | 0:23 | Add the people / you *care about.* | Initial bubbles (the Orbit's own) pop around Mira; "Share with Tomás" turns "Joined ✓" |
| 10 | 0:26 | Or gift / a *report.* | The real GiftCover pops, then multiplies into a field of circles, the burst's echo |
| 11 | 0:29 | Everyone you love / has a *chart.* | The circles collapse into one |
| 12 | 0:30 | Stars Decoded · Find out what your birth chart says about you. · MYSTARSDECODED.COM | The bubble becomes the Mark; letters, line and address arrive |

- The loop is told as built (ADR-139): a gift is a credit, the recipient writes their own
  Personal report and starts their own circle. Every UI word is the product's own.
- The bubble's pairs follow the report's own evidence (Mercury for Mind, as in Marie Curie's
  claim) and the usual rulers for the rest; the chips are the chapters' real titles.

### Look and sound
- Void, the quiet star field, an indigo and brass glow at the bottom (the reference's warm
  horizon in our colours), Newsreader for sentences, Inter for the slot and chips, the renders
  with a soft drop shadow, one easing plus springs for objects.
- 72 BPM: the G15 bed (drone, pads, pulsar tick, soft pulse, bell arpeggio, felt-piano motif)
  with synthesized effects cued from the same timeline as the picture (`score/sfx.mjs` reads
  `src/v5/opening.json`): a tick per word, a pop per object, a swish per swap, whooshes for the
  burst, collapse and morph; mixed to -14 LUFS. The real track replaces the bed (ask 3).

### The motion harness (the Owner's harness, path B)
- Brief → code → Remotion renders React frame by frame in headless Chrome → MP4. The web app's
  components through the `@` alias, the engine, Tailwind v4 and the product's fonts
  (`override.mjs` also maps the Vite-only `import.meta.env` values).
- **The frame-locked clock** (`src/clock.ts`): `performance.now` and rAF timestamps read the
  composition's time and every CSS or WAAPI animation is set to it, so live components
  (HorizonWheel's first light, Orbit's drift and pops) render the same frame every time.
  Render with concurrency 1 (about 10 minutes for 50 s).
- **Pace is one constant:** scenes are timed in story seconds on a 120 BPM grid and played at
  `TEMPO` (`lib/motion.ts`, 72 BPM now), so a faster or slower cut is a one-line change and a
  matching score; live components keep their own real-time speed.
- Canvas or SVG only for what no component draws; no screenshots; no image or video models
  without the Owner's yes on the exact output (rule 17).
- **The v5 kit** (`src/v5/kit.tsx`): a sentence engine that measures each word in its real font,
  lays lines out itself and grows each token's width as it arrives, so neighbours reflow and an
  inline object can fly into or out of its slot; springs; chips; the glow.

## Out of scope
- Birth time, Timeline and Ask (later, with the subscription), prices.
- Voiceover, faces, people on camera; any reader's chart or report; the website's sample
  (Audrey Hepburn); living people. Marie Curie's line is organic only (rule 8): the ad cut
  swaps scene 6.
- Emoji, a mascot, a light theme (rules 15 to 17, MASTERFILE §9); a mascot would be a brand
  decision of its own.
- Paid ads (Phase 4), the Compatibility reel and parent posts (G2).

## Acceptance criteria
1. Every product surface on screen is the web app's own component or render, drawn by the harness.
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
1. **The grammar.** Recommended: build the whole trailer this way, scenes 6 to 11 as in the
   storyboard, about 32 s. If silent: I build it and send the full cut for a yes before anything posts.
2. **Our look or theirs.** Recommended: keep the dark look and the planet renders (rules 15 to 17,
   no light theme in V1). If silent: dark, renders, no emoji. A light, emoji version would need
   two rule changes from you first.
3. **Music.** Recommended: commission our own 72 BPM track (one loop and a sign-off, buyout with
   stems); repo notes put it at about $300 to $2,000 [unverified]. If silent: no spend, the
   synthesized bed for review and a cleared ambient library track in each app.

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
3. The sound is G15 as written (direction A, 72 BPM, Owner 2026-10-02): video and carousels share
   one track, with effects under every arrival.
4. G2's hold on video lifts for the launch trailer, at the Owner's request (2026-10-02).
5. Videos are made with the motion harness (Owner, 2026-10-02): Remotion over the product's own
   components and engine, live components on a frame-locked clock, no screenshots; the rendered
   cut is what the Owner reviews.
6. The v5 grammar after the Owner's reference (2026-10-05): one shot, one sentence at a time,
   renders inline, a rotating slot, a burst; in our look (asks 1 and 2).
7. The music route (ask 3).
