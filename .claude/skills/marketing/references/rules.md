# The rule book

Every post, slide, caption and reply keeps these, in every session. When a rule and a good
idea disagree, the rule wins and the idea goes to the Owner as a question. A rule changes only
with the Owner's yes, shown first on the Social rule book page
(https://claude.ai/artifact/AvugTm2z3TmPAt1FcJiFU5, republished to the same address); the numbers
here and there are the same, so the Owner can answer by number. Sources: MASTERFILE §2, §3, §5, §9; ADR-111, 117,
139, 142, 147; `/ux-copy`, `/web-taste`; `docs/specs/draft/first-posts.md`; the Owner, 30 Sep.

## What a post is
1. **One idea, one slide at a time.** The cover alone makes sense and makes the reader want the rest.
2. **About the reader and the people they know:** how you come across, what you do when, what you
   need. A slide written about someone the reader knows gets sent to them without being asked.
3. **One computed fact or one quoted report line in every post** (ADR-147: all real data). Nothing
   typed that code should supply (R-3.1).
4. **Easy to read on a phone at arm's length:** one focal point per slide, 30 words at most, the
   line as the hero, generous space.

## Truth
5. **Every degree, time, sign and window comes from the product's engine** (`calculateNatalChart`
   through `kit/wheel.mjs`; rising and Moon windows from its own horizon sweep, as the birth form
   reports them), from `kit/sky.mjs` for sky events, or from a product screen recorded that minute,
   with its moment and place on the slide or in the caption (R-3.1). A station gets a date, never
   a minute.
6. **No forecasts.** No weekly horoscopes, no "your week", no timing or age posts, nothing about
   what will happen to a reader (R-5.2; V1 excludes predictions, transits and daily horoscopes).
   The sky pillar says what the sky is doing and why it looks that way, never what it means for you.
7. **Sign meanings come from the doctrine,** `api/src/prompts/vocabulary.ts`: the body's function in
   the sign's style, "under strain" for hard moments. Never invent a meaning (R-5.3). The entries
   used go in the row's Notes.
8. **The product, exactly.** Its names from `web/src/lib/product.ts` (Personal natal report,
   Compatibility report). Never a length or word count (ADR-111). A price only from the catalogue
   (ADR-142). "Accurate to within one arcminute" is the planets' claim, never Chiron's.
9. **AI never leads** (ADR-117). Asked, say plainly that AI helps write the report.
10. **No health, therapy or diagnosis words** (R-3.5, R-5.2). Patterns, tendencies and what helps,
    like the report.

## People
11. **Only readers who said yes** (R-3.6, ADR-139): their chart, their words, their name.
12. **Public figures come only from the fixtures, organic only, never in an ad** (ADR-147), and only
    the dead: Marie Curie from her date alone (her time is not from a birth record), Audrey Hepburn
    in full once her name clears the legal check (MB-90). Never a living person, so never Oprah
    Winfrey or the family fixtures.
13. **Never a child's name or face** (ADR-147).

## Look (the art direction)
14. **Dark only, the product's own register** (§9). Tokens from `web/src/index.css`: void `#06080C`,
    ground `#0D1117`, line `#242C3B`, paper `#E8EBF2`, paper-dim `#AEB6C6`, muted `#6E7789`, indigo
    `#5C6BC0` (brand glow, the mark), violet `#9575CD` (the pair), brass `#D4B06A`. Type does the
    hierarchy: Newsreader 400 for hooks and lines (116 px cover, 70 to 76 px slides), Inter for body
    (38 px), Space Grotesk 500 caps for kickers (25 px, wide tracking), IBM Plex Mono for every
    degree, time and coordinate. Sentence case everywhere.
15. **Colour carries meaning** (§9). Brass marks measured geometry only: the Ascendant point, a
    window on the horizon. Element hues (fire `#E0845C`, earth `#7FB08B`, air `#8FC5E0`, water
    `#6B7FD7`) mark a sign's element and nothing else. Chapter hues never appear on social.
16. **The wheel is the product's own, never a copy** (Owner, 30 Sep). Every wheel on a slide is
    `web/src/components/chart/NatalWheel.tsx` rendered by `kit/wheel.mjs` from `calculateNatalChart`,
    exactly as the report and the website draw it: the full form, the blind form (date only, no
    houses) or the standalone form of the pair page, turned so the Ascendant sits on the horizon as
    the website does. Never draw a ring, wheel or plate by hand.
17. **A new or simplified version needs the Owner's yes first** (Owner, 30 Sep). Any wheel, plate or
    chart visual that is not the shipped component as it is goes to the Owner as an HTML artifact
    before it reaches a post. The day strip is the one from the unknown-birth-time ideation, which
    the Owner asked for.
18. **Planets are bodies** (§9). The product's renders (`web/src/assets/planets/*.webp`) appear only
    where the wheel puts them, never as decoration or icons.
19. **Stars stay quiet.** The kit's seeded field and the indigo glow, never behind text at strength.
20. **Never** (`/web-taste`, and more): gradient text, glass, sparkles, tarot, crystal balls, zodiac
    clip art, Unicode glyphs as decoration, AI-generated images, stock photos, faces, emoji, badges,
    fake counters or reviews.
21. **Sizes and safe areas.** 3:4 at 1080×1440 for Instagram posted from the app (4:5 only when a
    scheduler's API needs it); 9:16 at 1080×1920 for TikTok, keeping 250 px top, 430 px bottom and
    160 px right clear of the app's own buttons (the kit does this).

## Voice
22. **The house voice** (`/ux-copy`): exact, plain, warm, honest. Second person, short sentences,
    15 words on average and none over 25. No em or en dashes, semicolons, exclamation marks or
    emoji. Captions and replies too; replies start from the eight answers in the spec.
23. **No AI tells** (`/ux-copy`, in full): no "not X but Y" unless the reader believes X, no staged
    run-ups, no sayings that only sound deep, no triads for rhythm, no unlock, cosmic, journey,
    blueprint.
24. **Hooks name the reader and the moment:** "What you do when you're hurt, by Moon sign", "Why your
    horoscope never quite fits". Never a question the post doesn't answer.
25. **Captions:** the first line repeats the hook in the words people search ("What each Moon sign
    does when it's hurt"), then one or two sentences of fact, then the call to action, then three
    to five hashtags. The same words work for TikTok search.
26. **No bait:** never ask people to comment, tag, share or follow for a reward. No giveaways.
27. **Calls to action by phase:** before launch "Get an email the day we open" with the bio link;
    after launch, the free chart page once it ships. The end slide says what Stars Decoded does in
    one sentence, then the call to action, the address and the mark.

## Formats
28. **By sign** (Owner, 30 Sep): cover, twelve sign slides (Aries first), end. Sign slide: kicker
    "Moon in Aries", element and mode in mono in the element's hue, the line (18 words at most),
    "What helps" (10 words at most). Type only: a wheel here would be a new version (rule 17).
    Moon, rising, Venus, Mars, Saturn. No Sun signs.
29. **Computed, not guessed:** cover, three to five fact slides, end. Each fact slide carries its
    computed visual: the product's wheel, two standalone wheels side by side, or the day strip with
    its window.
30. **Sky:** the product's wheel for the moment, or the day strip, with the date, what the sky is
    doing and why it looks that way. Made in the week it posts.
31. **Carousels only for now** (Owner, 30 Sep): faceless, no video, no product screens, no launch
    video or Compatibility reel until the report is reworked. The parent posts wait too.

## Sound and scheduling
32. **Only sound cleared for business:** TikTok's Commercial Music Library, Instagram's Sound
    Collection. Calm, slow, instrumental. The row names a mood; the Owner picks the track in each app.
33. **Instagram is scheduled in its own app, TikTok through Publer Free.** Metricool Starter is the
    paid step up. Details and dates in `platforms.md`.
34. **Nothing is scheduled before the waitlist opens on production** (Owner, 30 Sep). From opening
    day, one a day from the bank.
35. **The Content board is the one place** for ideas, posts and numbers. An idea said in a chat
    becomes an Idea row.

## Before anything reaches the Owner
36. **The check.** Every number traced to `calculateNatalChart` (via `wheel.mjs`), a `sky.mjs` run or
    a recorded screen, moment and place stated; every wheel the product's own; every sign line
    traced to its doctrine entry and noted on the row; rules 6, 8, 12, 13, 20, 22 and 26 kept; read
    aloud once, so it sounds like one person talking to another; the contact sheet looked at once at
    phone size, nothing clipped, nothing under the app's buttons; caption, alt text (from
    `alt.txt`), tag and sound on the row.
