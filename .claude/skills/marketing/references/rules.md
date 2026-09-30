# The rule book

Every post, slide, caption and reply keeps these, in every session. When a rule and a good
idea disagree, the rule wins and the idea goes to the Owner as a question. Sources: MASTERFILE
§3, §5, §9, ADR-111, 112, 117, 147, `/ux-copy`, `/web-taste`, `docs/specs/draft/first-posts.md`.

## What a post is
- One idea, one slide at a time. The cover alone must make sense and make the reader want the rest.
- About the reader and the people they know: how you come across, what you do when, what you need.
  A slide written about someone the reader knows gets sent to them without being asked.
- One computed fact or one quoted report line in every post. Nothing typed that code should supply.
- Easy to read on a phone at arm's length: one focal point per slide, 30 words at most, the line
  as the hero, generous space.

## Truth
1. **Every degree, time, sign and window comes from the product's engine** (`calculateNatalChart`
   through `kit/wheel.mjs`; rising and Moon windows from its own horizon sweep, as the birth form
   reports them), from `kit/sky.mjs` for sky events, or from a product screen recorded that minute,
   with its moment and place stated on the slide or in the caption (R-3.1). A station gets a date,
   never a minute.
2. **No forecasts.** No weekly horoscopes, no "your week", no timing or age posts, nothing about
   what will happen to a reader (R-5.2; V1 excludes transits). The sky pillar says what the sky is
   doing and why it looks that way, never what it means for you.
3. **Sign meanings come from the doctrine,** `api/src/prompts/vocabulary.ts`: the body's function in
   the sign's style, "under strain" for hard moments. Never invent a meaning (R-5.3). Keep the entries
   used in the row's Notes.
4. **People.** Only readers who said yes. Public figures only if dead and with public birth data,
   from the date alone when no time is recorded; Audrey Hepburn after MB-90. Never a living person,
   never a fixture family, never a child's name or face (ADR-112, ADR-147).
5. **The product, exactly.** Its names from `web/src/lib/product.ts` (Personal natal report,
   Compatibility report). Never a length or word count (ADR-111). A price only from the catalogue
   (ADR-142). AI is never the lead; asked, say plainly that AI helps write the report (ADR-117).
   "Accurate to within one arcminute" is the planets' claim, never Chiron's.
6. **No health, therapy or diagnosis words.** Patterns, tendencies and what helps, like the report.

## Look (the art direction)
- **Dark only, the product's own register.** Tokens from `web/src/index.css`: void `#06080C`, ground
  `#0D1117`, line `#242C3B`, paper `#E8EBF2`, paper-dim `#AEB6C6`, muted `#6E7789`, indigo `#5C6BC0`
  (brand glow, the mark), violet `#9575CD` (the pair), brass `#D4B06A` (measured geometry only).
- **Colour carries meaning.** Brass marks geometry: the Ascendant point, a window on the horizon.
  Element hues (fire `#E0845C`, earth `#7FB08B`, air `#8FC5E0`, water `#6B7FD7`)
  mark a sign's element and nothing else. Chapter hues never appear on social.
- **Type does the hierarchy.** Newsreader 400 for hooks and lines (116 px cover, 70 to 76 px
  slides), Inter for body (38 px), Space Grotesk 500 caps for kickers (25 px, wide tracking), IBM Plex
  Mono for every degree, time and coordinate. Sentence case everywhere.
- **The wheel is the product's own, never a copy (Owner, 30 Sep).** Every wheel on a slide is
  `web/src/components/chart/NatalWheel.tsx` rendered by `kit/wheel.mjs` from `calculateNatalChart`,
  exactly as the report and the website draw it: the full form, the blind form (date only, no
  houses) or the standalone form of the pair page. Turned so the Ascendant sits on the horizon, as
  the website does. Never draw a ring, wheel or plate by hand.
- **A new or simplified version needs the Owner's yes first.** Any wheel, plate or chart visual that
  is not the shipped component as it is goes to the Owner as an HTML artifact before it reaches a
  post. The day strip is the one from the unknown-birth-time ideation, which the Owner asked for.
- **Planets are bodies.** The product's renders (`web/src/assets/planets/*.webp`, 192 px) appear
  only where the wheel puts them, never as decoration or icons.
- **Stars are quiet.** The kit's seeded field and the indigo glow, never behind text at strength.
- **Never:** gradient text, glass, sparkles, tarot, crystal balls, glowing zodiac clip art, Unicode
  glyphs, AI-generated images, stock photos, faces, emoji, badges, fake counters or reviews.
- **Safe areas.** 4:5 at 1080×1350 for Instagram; 9:16 at 1080×1920 for TikTok, keeping 250 px top,
  430 px bottom and 160 px right clear of the app's own buttons (the kit does this).

## Voice
- The house voice: exact, plain, warm, honest. Second person, short sentences, 15 words on
  average and none over 25. No em or en dashes, semicolons, exclamation marks or emoji.
- The `/ux-copy` AI tells apply in full: no "not X but Y" unless the reader believes X, no staged
  run-ups, no sayings that sound deep, no triads for rhythm, no unlock, cosmic, journey, blueprint.
- **Hooks** name the reader and the moment: "What you do when you're hurt, by Moon sign", "The first
  thing people notice about you, by rising sign", "Why your horoscope never quite fits". Never a
  question the post doesn't answer.
- **Captions:** the first line repeats the hook with the words people search ("What each Moon sign
  does when it's hurt"), then one or two sentences of fact, then the call to action, then three to
  five hashtags. The same words work for TikTok search.
- **No bait:** never ask people to comment, tag, share or follow for a reward; no giveaways.
- **Calls to action by phase:** before launch "Get an email the day we open" with the bio link;
  after launch, the free chart once R12 ships ("Find your Moon sign free at mystarsdecoded.com/sky").
- **Replies** follow `docs/specs/draft/first-posts.md` (the eight answers), same voice.

## Formats
- **By sign:** cover, twelve sign slides (Aries first), end. Sign slide: kicker "Moon in Aries",
  element and mode in mono, the line (18 words at most), "What helps" (10 words at most), the ring
  with the sign lit. Moon, rising, Venus, Mars, Saturn. No Sun signs.
- **Explainer (computed, not guessed):** cover, three to five fact slides, end. Each fact slide
  carries its computed visual: a wheel, two wheels side by side, or a day strip with the window.
- **Sky:** a strip or ring for the event, the date, what it looks like and why. Posted on the day.
- **End slide:** what Stars Decoded does in one sentence, the call to action, the address, the mark.

## Checklist before hand-over
1. Every number on a slide traces to `calculateNatalChart` (via `wheel.mjs`), a `sky.mjs` run or a
   recorded screen, moment and place stated. Every wheel is the product's own.
2. Every sign line traces to its doctrine entry, noted on the row.
3. No forecast, length, invented price, living person, child, bait, emoji or dash.
4. Read aloud once: it sounds like one person talking to another.
5. The contact sheet looked at once, at phone size: nothing clipped, nothing under the app's buttons.
6. Caption, alt text (from `alt.txt`), tag and sound filled on the Notion row.
