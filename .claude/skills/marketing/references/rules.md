# The rule book

The rules every post, slide, caption and reply keeps, in every session. They say what must be
true and who approves what; they never limit what a post is about. How to make a post perform is
in `guidelines.md`, which bends when a post needs it. When a rule and a good idea disagree, the
rule wins and the idea goes to the Owner as a question. A rule changes only with the Owner's yes,
shown first on the Social rule book page (https://claude.ai/artifact/AvugTm2z3TmPAt1FcJiFU5,
republished to the same address), under the same numbers. Approved by the Owner on 30 Sep
(draft two). Sources: MASTERFILE §3, §5, §9; ADR-111, 117, 139, 142, 147; `/ux-copy`; `/web-taste`.

## Truth
1. **Every degree, time, sign and window comes from the product's engine** (`calculateNatalChart`
   through `kit/wheel.mjs`; rising and Moon windows from its own horizon sweep, as the birth form
   reports them), from `kit/sky.mjs` for sky events, or from a product screen recorded that minute,
   with its moment and place on the slide or in the caption (R-3.1). "Born today in the morning,
   at lunch or in the evening" is computed for today's date and a named city. A station gets a
   date, never a minute.
2. **A reading of anyone's placements rests on a computed chart or a quoted report line.** Posts
   about the product, the method or the sky need neither.
3. **Sign meanings come from the doctrine,** `api/src/prompts/vocabulary.ts`: the body's function
   in the sign's style, "under strain" for hard moments. Never invent a meaning (R-5.3). The
   entries used go in the row's Notes.
4. **The product, exactly.** Its names from `web/src/lib/product.ts` (Personal report,
   Compatibility report). Never a length or word count (ADR-111). A price only from the catalogue
   (ADR-142). Only what it does today. "Accurate to within one arcminute" is the planets' claim,
   never Chiron's.
5. **AI never leads** (ADR-117). Asked, say plainly that AI helps write the report.
6. **No health, therapy or diagnosis words** (R-3.5, R-5.2). Patterns, tendencies and what helps,
   like the report.

## People
7. **Readers stay out of posts for now.** Never a reader's name or birth data, never a
   Compatibility report or who it was with. How to show anonymised results, and how a reader says
   yes, waits in the Mailbox (MB-121); until then no reader's chart, report or words.
8. **Public figures come only from the fixtures, organic only, never in an ad** (ADR-147), and only
   the dead: Marie Curie from her date alone (her time is not from a birth record). Audrey Hepburn
   never: her name stays on the website's sample, never in posts or ads (ADR-166). Never a living person, so never Oprah
   Winfrey or the family fixtures.
9. **Never a child's name or face** (ADR-147).

## Brand and look
10. **A personality product, never mystical** (Owner, 30 Sep; §9 "analytical, not mystical").
    Stars Decoded reads like 16Personalities, not a horoscope: what you're like and why, from a
    chart that was worked out.
11. **The design system as it is** (§9). Tokens from `web/src/index.css`: void `#06080C`, ground
    `#0D1117`, line `#242C3B`, paper `#E8EBF2`, paper-dim `#AEB6C6`, muted `#6E7789`, indigo
    `#5C6BC0` (brand glow, the mark), violet `#9575CD` (the pair), brass `#D4B06A`. Newsreader 400
    for hooks and lines, Inter for body, Space Grotesk 500 caps for kickers, IBM Plex Mono for every
    degree, time and coordinate. Sentence case. Nothing reinvented.
12. **Colour carries meaning** (§9). Brass marks measured geometry only: the Ascendant point, a
    window on the horizon. Element hues (fire `#E0845C`, earth `#7FB08B`, air `#8FC5E0`, water
    `#6B7FD7`) mark a sign's element and nothing else. Chapter hues never appear on social.
13. **Every wheel is the product's own** (Owner, 30 Sep): `web/src/components/chart/NatalWheel.tsx`
    rendered by `kit/wheel.mjs` from `calculateNatalChart`, exactly as the report and the website
    draw it (full, blind or standalone form), turned so the Ascendant sits on the horizon. Never a
    ring, wheel or plate drawn by hand.
14. **Nothing new or simplified without a yes** (Owner, 30 Sep). A wheel, plate or chart visual that
    is not the shipped component as it is, for example a simpler wheel that reads better small,
    goes to the Owner as an HTML artifact first. The day strip from the unknown-birth-time ideation
    is already approved.
15. **The planet renders go wherever they're relevant** (Owner, 30 Sep): the product's own renders
    (`web/src/assets/planets/*.webp`), the cover included, such as the Moon on a Moon-sign post.
    Always the real render, never redrawn, recoloured or replaced by a glyph.
16. **Stars stay quiet.** The kit's seeded field and the indigo glow, calm and never behind text
    at strength. Nothing that feels mystical.
17. **Never:** gradient text, glass, sparkles, tarot, crystal balls, zodiac clip art, Unicode
    glyphs as decoration, stock photos, faces, emoji, badges, fake counters or reviews (`/web-taste`).
    AI-generated images only with the Owner's yes on the exact image; the Owner may bring their own.

## Voice
18. **The house voice** (`/ux-copy`): exact, plain, warm, honest. Second person, short sentences,
    15 words on average and none over 25. No em or en dashes, semicolons, exclamation marks or
    emoji. Captions and replies too; replies start from the eight answers in the spec. Simple
    words everywhere (Owner, 3 Oct): everyday words, one idea per sentence, no drama; a line that
    sounds deep is rewritten until it sounds normal (`/ux-copy`, voice chart).
19. **No AI tells** (`/ux-copy`, in full): no "not X but Y" unless the reader believes X, no staged
    run-ups, no sayings that only sound deep, no triads for rhythm, no unlock, cosmic, journey,
    blueprint.
20. **No bait:** never ask people to like, comment, tag, share or follow for a reward, and no
    giveaways.
21. **The call to action says launch, never open** (Owner, 30 Sep). Before launch the end slide says
    "Join the waitlist and we'll email you when we launch." over "Link in bio · mystarsdecoded.com"
    (the Owner's pick), and the caption ends the same way. After launch it points to the free chart,
    in words from `/ux-copy`.

## Sound
22. **Only sound cleared for business use,** or our own track once we have one: TikTok's Commercial
    Music Library, Instagram's Sound Collection. Every post's sound is proposed with the post.

## Approval (Owner, 30 Sep)
23. **Nothing is built before the Owner's yes.** Each session (usually a Friday, one or two weeks at a
    time) the proposal is one HTML artifact with every carousel fully rendered, every slide, with its
    caption and sound. The Owner approves each
    post there. Only then does Claude finish it: both sizes, alt text, the Notion row.
24. **Video and motion start as words.** The approach, the storyline scene by scene and any
    voiceover script come to the Owner first. Nothing is coded or rendered before a yes.
25. **The Content board is the one place** for ideas, posts and numbers. An idea said in a chat
    becomes an Idea row.
26. **The check before anything reaches the Owner:** every number traced to `calculateNatalChart`
    (via `wheel.mjs`), a `sky.mjs` run or a recorded screen, moment and place stated; every wheel
    the product's own; every sign line traced to its doctrine entry and noted on the row; rules 4,
    7, 8, 9, 17, 18 and 20 kept; read aloud once, so it sounds like one person talking to another;
    each slide looked at once at phone size, nothing clipped, nothing under the app's buttons.
