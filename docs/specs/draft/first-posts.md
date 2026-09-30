# First posts: Phase 0 in practice

Ideation 2026-09-30 with the Owner. Status: **draft**. Artifact:
https://claude.ai/artifact/AWDQpwmvjy9nsgi3cThtr2. Screenshot inbox (Notion, under GTM):
https://app.notion.com/p/3ebfefe74931810c9116c9742ebcc1f7

Builds on `pricing-and-launch` (locked 2026-09-27, ADR-142 to 149; on
`claude/compassionate-clarke-l16qww`, not yet on `main`). Its launch plan (ADR-147) sets Phase 0;
this spec is how Phase 0 runs. Nothing here changes ADR-147 unless the Owner says yes to question 1
or 2 below.

## Scope

### The frame, from ADR-147
- @mystarsdecoded on Instagram and TikTok; 20 posts banked, then one a day. TikTok daily;
  Instagram five reels and two carousels a week; one three-hour batch a week.
- 9:16 video of 7 to 30 s, captions burned in, the hook in the first 1.5 s; 4:5 carousels of up to
  ten slides; the product's own look, so the best organic post becomes the ad unchanged.
- Six pillars, all real data: the sky right now; one sentence; two charts, no score; computed, not
  guessed; what this child needs; public figures' charts (organic only, never in an ad).
- The bio link goes to the waitlist, `utm_source` per platform, `utm_content` per post. Target 500
  sign-ups in about four weeks.

### First steps (this week)
- **The Owner:** claim @mystarsdecoded on both apps and hold it on Threads, YouTube and Pinterest;
  Business accounts on both; MB-115's name and contact address (all the production waitlist
  needs; the postal address and Stripe wait for checkout); Resend on mystarsdecoded.com for double
  opt-in; the three questions; the screenshots in the Notion inbox.
- **Claude:** the templates (a 1080×1920 video frame with safe areas for captions and the apps'
  buttons, a 1080×1350 carousel set, an end card) from `web/src/index.css`; on-screen text,
  captions and alt text for the twenty through `/ux-copy`; the tag list; a Notion board for the
  bank; a recording checklist for staging.

### The profile
- Name field: "Stars Decoded · Birth chart report" (searchable on Instagram).
- Instagram bio, the waitlist page's lede word for word (125 characters): "Stars Decoded works out
  where the planets were when you were born and writes you a report about how you think, work and
  love."
- TikTok bio (80 at most): "We work out where the planets were when you were born. No
  predictions."
- Link: `https://mystarsdecoded.com/?utm_source={instagram|tiktok}&utm_medium=social&utm_campaign=warmup&utm_content={post}`,
  changed each morning to that day's post. Production serves the waitlist on every path, so the tags
  survive (`App.tsx`, `prelaunch.ts`).
- Photo: the mark on the ground colour, no wordmark.

### The templates (artifact: The templates)
Every degree, time and wheel is computed with astronomy-engine 2.1.19, the pinned version, and
checked against Swiss Ephemeris. The footage is screen recordings of the product.
- **The sky right now:** the waitlist's live wheel (this minute's chart over the principal city of
  the viewer's time zone), recorded the day it posts. The caption says what the sky is doing and
  why it looks that way, never what it means for anyone.
- **One sentence:** the shipped share card is the Compatibility one (both names, the verdict, three
  strengths, "No score, no prediction."), posted as exported. A Personal natal report has no card
  (MB-104), so its sentence goes on a solo template in the same look.
- **Two charts, no score:** the pair page's two wheels and its ledger ("Naturally strong", "Will
  take work") from a real pair who both said yes.
- **Computed, not guessed:** why the birth time matters, one computed fact per slide: the Moon
  entered Scorpio at 09:36 UTC on 31 December 1999; Aquarius rose over Brussels from 01:53 to 03:03
  local time on 4 May 1929.
- **What this child needs:** the lens's line and its five chapter titles from `lenses.ts`; never a
  child's name or face.
- **Public figures:** Marie Curie from the date alone (no recorded time; all ten planets hold one
  sign through 7 November 1867 in Warsaw, four in Scorpio, the Moon in Pisces); Audrey Hepburn after
  MB-90; never a living person or a fixture family.
- **Proposed, question 2:** by sign. Two signs per slide, every line built from `vocabulary.ts`
  (the body's function in the sign's style), one computed fact per post. Moon, rising and Venus;
  no Sun signs.

### The bank of twenty (artifact: The bank)
p01 to p20 in posting order, no pillar twice in a row, each row marked with what it waits on (Q2,
Q3, staging, MB-90, a v7 run of Marie Curie). If question 2 is no, its four rows go back to the six.

Sky days are recorded on the day and never banked; each moves that day's banked post back a day.
A station gets a date, never a minute.
| Day | Event (engine, UTC) |
|---|---|
| Sat 10 Oct | New Moon 15:51, 17°22′ Libra |
| Fri 23 Oct | The Sun into Scorpio 09:38 |
| Sat 24 Oct | Mercury stations at 20°59′ Scorpio, retrograde to 13 Nov; Venus since 3 Oct (8°29′ Scorpio) |
| Mon 26 Oct | Full Moon 04:12, 2°46′ Taurus |
| Mon 9 Nov | New Moon 07:03, 16°54′ Scorpio |
| 13 and 14 Nov | Mercury, then Venus, turn direct |

### The routine
Monday: the three-hour batch (seven videos, two carousels) and a ten-minute sky recording. Every
day: post, change the bio link's tag, answer every comment. Sunday: a twenty-minute review, one
Notion row per post.

### Replies
Eight answers in the house voice (artifact: Replies): the rising sign, AI, science, data, the birth
time, finding a birth time, when it opens, the price. AI is named only when asked (ADR-117).

### Measures
Per post: hold (average watch time and full views, the ad test's input), sends per reach, saves
per reach, and waitlist sign-ups by `utm_content` from `/admin/waitlist`. Each Sunday: make two more
of the week's top two; drop a hook that came last twice.

### Rules every post keeps
1. One computed fact or one quoted report line; nothing typed that code should supply (R-3.1).
2. No forecasts, no timing, no "your week" (R-5.2; V1 excludes transits).
3. Sign meanings built from the doctrine, never invented (R-5.3).
4. The product's look: brass only on geometry; no zodiac clip art, tarot, sparkles or AI images of
   the sky (§9, `/web-taste`).
5. The house voice: no emoji, exclamation marks or dashes; sentence case; never a length (ADR-111);
   no fake reviews or counts.
6. Consent: readers who said yes; no living person, no fixture family, no child's name or face
   (ADR-112, MB-93, ADR-147).
7. Sound: TikTok's Commercial Music Library, Instagram's Sound Collection, or the Owner's voice.
8. No engagement bait: no ask to comment, tag or share, no giveaways.

## Out of scope

Ads (Phase 4, from customer 50); creator outreach (Phase 3); comment-to-DM automation; posting on
Pinterest, Threads or YouTube (names held only); building a solo share card (MB-104); a script that
lists sky events; any change to the waitlist, the landing or prices; weekly horoscopes, Saturn-return
and age posts.

## Acceptance criteria

1. @mystarsdecoded exists on Instagram and TikTok as Business accounts with the name, bios, photo
   and tagged link above.
2. Twenty posts are banked before the first goes out, each with on-screen text, a caption and alt
   text that pass `/ux-copy`, and a `utm_content` tag.
3. Every degree, time and sign in a post traces to an engine run or to a product screen recorded
   that minute; a station carries a date only.
4. Every quoted report line is word for word from a report whose reader said yes, or a public
   figure's stored run; none comes from a living person or a fixture family.
5. No post has licensed music, a forecast, a length, a price that isn't the catalogue's, or an
   engagement-bait ask.
6. The Notion board holds one row per post with hold, sends per reach, saves per reach and
   sign-ups, filled each Sunday.
7. From the day the waitlist is live, the bio link carries that day's `utm_content` on both apps.

## Screens

In the artifact: the locked frame; this week and the profile; the three reference posts read; eight
research findings; the path from a post to a report; one template per pillar with mocks (the sky
storyboard on the computed wheel for 09:00 London on 5 October, both share cards, the two-charts
storyboard, three carousels, the proposed by-sign carousel); the bank of twenty and the sky days;
the routine; replies; measures; the three questions; the screenshots wanted.

## Open questions (asked 2026-09-30)

1. **Start posting before the waitlist is on production?** Recommendation: post once twenty are
   banked; the link and the four-week clock start the day the waitlist is live. Default: bank now,
   post on opening day (ADR-147's order).
2. **Add "by sign" as a seventh pillar?** Recommendation: yes, as a four-week test, judged on sends
   per reach against the six. Default: no.
3. **Whose report fills "One sentence" before launch week?** Recommendation: the Owner's own
   Personal natal report and one Compatibility report with someone who says yes, both on staging.
   Default: Marie Curie's only.

## Decisions to record

1. **Phase 0's operating detail:** the profile (name field, bios, link pattern, photo), the bank of
   twenty in posting order, the Monday batch, daily replies and the Sunday review.
2. **The eight rules every post keeps.** The sky pillar says what the sky does and why it looks that
   way, never a reading; a station gets a date, never a minute.
3. **Business accounts on both apps;** sound from the Commercial Music Library, the Sound Collection
   or the Owner's voice.
4. **The measures:** hold, sends per reach, saves per reach, sign-ups by `utm_content`; two more of
   the week's top two.
5. **Until a solo share card exists, a natal sentence goes on a template in the share card's look;**
   MB-104 is raised to scope that card.
6. **Public figures on social:** only the dead with public birth data, from the date alone where no
   time is recorded; Audrey Hepburn after MB-90; never a living person or a fixture family.
7. **The Owner's answers to questions 1 to 3,** each as its own row.
