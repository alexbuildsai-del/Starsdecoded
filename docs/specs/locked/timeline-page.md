# Timeline page (`/timeline`)

Locked 2026-10-03 from `/ideate timeline-page`, version 4 (ADR-249 to 259, 254 superseded by 259; the Owner: "do a proper product page where we show the
value propositions and what you're getting when paying the subscription fee"; then "we say something when we
offer, but then we need to support it"). Builds on the locked `timeline`
spec (ADR-205 to 217; screen 7, ADR-215), which it details and does not change.
Artifact: https://claude.ai/artifact/YTpuNi1CqPfJJHVNEdtMJG

`/timeline` is Timeline's public product page: what Timeline is, the five things it gives a reader, what the
subscription includes, how it stays honest, and the Saturn-return finder as the free piece to try. It needs no
`TIMELINE` switch (ADR-215), so it goes live before Timeline does, under the waitlist like every public page
(ADR-167). Everything it describes is already locked; it promises nothing the Timeline spec doesn't.

## State on 2026-10-03
- The locked `docs/specs/locked/timeline.md` and its MASTERFILE paragraph (from lock commit 6d0733a, which never
  reached main) came to main with this lock.
- Main's site has no Timeline section or page.

## Scope

### The page (screen 1), top to bottom
1. **Hero.** Eyebrow "Coming soon · Timeline"; H1 "Your chart, with the sky moving across it". The lede answers
   alone and names the product (ADR-116): "Timeline is Stars Decoded's one subscription, for people with a Personal
   natal report. It shows when the planets reach the points in your own chart, what that means for you in plain
   words, and how long it lasts, from the big cycles of your life to this week." Get my report, and "When is your
   Saturn return?" (jumps to the finder); "Timeline opens after launch. You'll need a Personal natal report."
   **The picture is the Timeline ideation's dial** on Mira's chart: her houses and natal points inside, Mars to
   Pluto each on its own track outside, a brass line per contact (dashed unless a conjunction), planets filled by
   tone, a dashed ring on a retrograde. **Play** (only when pressed) runs the next six months day by day with a
   trail; the date and up to three plain headlines under it change with the day. Reduced motion steps a week at a time.
2. **What Timeline gives you**, "Five things, each shown on Mira's chart". Every card has the same three parts: a
   promise in plain words, why you'd care (one or two sentences), then **what Mira sees**, marked Sample account or
   Sample words. Plain words first; aspect, house and exact date last, small and grey.
   - *Now and ahead* · "Know what's going on for you, and for how long": the day's mix bar, then cards with tone,
     how long it lasts ("until 19 Oct, back in February"), the headline ("Taking yourself more
     seriously"), the everyday line, and "Saturn on your Ascendant · 1st house · exact 25 Sep" under it; then "Coming up".
   - *Life* · "Know which chapter of your life you're in": why the known ages matter (29, 37, the early forties),
     the link **"When is your Saturn return? Find yours ↓"**, then Mira's wave from birth to 90, a look-back ("Think
     back to January 2021…") and her next cycles with ages, dates and chips.
   - *Readings* · "Every moment read against your own report": a line from Mira's report (House by House, 1st
     house), the reading that builds on it, quoting that line and naming the computed passes ("the second of three
     passes… the last is on 20 Feb 2027"), and "Read your 1st house again ›".
   - *Ask* · "Ask about any of it, in your own words": its mark and three questions built from her chart.
   - *Your week* · "Your week at a glance, and an email only when something changes": a summary sentence counted
     from the week ("Two things ease and nothing new starts this week"), seven day cells with tone dots, the tone
     key, the days with something on them in plain words, and the Monday email's subject line.
3. **Try it free**: "When is your Saturn return?" (the Owner: "perfect"). One typed birth-date field (R14's
   `BirthDateField`), the big ring, four compact cycle cards with the locked why lines. It opens on Mira's birth
   date, marked as an example, and a typed date redraws the finder only.
4. **What you get**: the plan card (life's big cycles with ages and what each means · what's going on now, this
   month and over six months, in plain words with tone and duration · a reading for each, tied to your report ·
   Ask · your week on your dashboard · a Monday email in weeks that touch your chart · with the yearly plan, 1
   credit to give), "Coming soon" where a price would go (the Owner: no price yet), and **How to get it** in three steps.
5. **How it stays honest**: no horoscope for the day · dates for the sky, never for your life · no do or don't ·
   quiet weeks stay quiet.
6. **Questions** (folded, `FAQPage`): What is Timeline? Is it a daily horoscope? What is a Saturn return? Do I need
   my birth time? Who is Mira? How do I cancel? In `data/faq.ts` under a Timeline topic, not marked `home`.
7. **Fine print**: the finder works from the birth date at midday; the meanings come from astrology, which science
   doesn't back.
- **Mira** is the site's sample account (`fixtures/sample-people/mira.json`, synthetic). Her examples are a fixed
  snapshot week (5 to 11 October 2026 in the artifact), computed at build and renewed with each Release like
  /sample. Every date, contact, house and position is computed. The headlines come from the Timeline ideation; the
  everyday lines, the report line and the reading are **sample words** (the Owner: "you can even put dummy data"),
  written to the house voice and R-5.2 as amended, checked by `/ux-copy`, and replaced by Timeline's stored readings
  for Mira once its prompt family exists.
- Registry entry in `site.ts` (kind `page`, schema `WebPage` and `FAQPage`, sitemap), prerendered (R-7.6) with
  the hero, the five cards, the plan and the FAQ readable without JavaScript; share preview and crawl entry like `/sky`.
- Phone first: one column at 390 px; from 880 px the hero splits, each card puts its words left and Mira's example
  right, the cycle cards sit four across, the plan and steps side by side.
- Ask's monthly cap stays off the page (silent until 10, as locked).
- Get my report: `ReportCta source="timeline"`, the waitlist before launch; once `TIMELINE` is on, an owner of a
  Personal natal report sees Start Timeline and the eyebrow drops "Coming soon".

### The engine (`packages/engine/src/`, the brain)
- `cycles.ts`: returns and oppositions for Saturn, Jupiter, the mean node and Uranus (opposition), birth to 90, from
  12:00 UTC on the birth date; scan, bisection to the minute, retrograde passes grouped into one cycle.
- Contacts for a day and the next six months on Mira's chart: the locked doctrine (Jupiter to Pluto onto the Sun to
  Saturn, the Moon, the Ascendant and the Midheaven; conjunction, square, opposition, trine; 2° and 1.5° orbs; Mars by
  conjunction, square and opposition at 1°), in-orb windows, exact passes and returning windows. Built at prerender,
  not in the reader's browser.
- Both are first slices of the locked `transits.ts`, reused by Timeline. The tone table is the locked fixed table, a
  brain file. The finder runs in the browser in about a quarter of a second. Touching the engine runs the dry lab.

### The way in (screen 2)
- **Home** (option A, the Owner's pick, rewritten): one line between Prices and the questions, a small dial of
  today's slow planets, "Coming soon · Timeline", "See when the planets reach your chart, from your Saturn return
  to this week. What's in it ›". No form; nothing else on the page moves.
- **Footer**: "Timeline" in the Reports column on every page. The top menu waits for Timeline to open.

### Words that change in the same release (screen 3, approved by the Owner)
- Home, Prices: "You pay once for each report."
- FAQ, Do I pay once or every month?: "Once for each report. Timeline, coming after launch, will be our one
  subscription." The rest stays.
- FAQ, Does it predict the future?: "No. It never puts a date on anything in your life or talks about fate. The
  only dates we show are for the sky, like your Saturn return." The rest stays.
- Method, on home and `/method`: "It won't forecast events, put dates on your life or diagnose anything."
- R-5.2 changes only when Timeline itself ships, as locked.

## Out of scope
- Timeline itself (the dial with its ranges and slider, Life, Ask, readings, billing, the letter), after launch as locked.
- An Ask answer on the page, share cards (MB-104), birth time or place in the finder, a top-menu
  link, a separate Timeline list, pricing and checkout (on hold, ADR-230).

## Acceptance criteria
1. Every date, age, orb, tone and position on `/timeline` comes from the engine; no date or degree is typed in copy.
2. `cycles.ts` and the contact windows match NASA JPL Horizons to the hour for at least five pinned birth dates
   (one three-pass Saturn return, one before 1950), in unit tests.
3. The prerendered HTML holds the hero, the five cards' words, the plan, the rules and the FAQ without JavaScript.
4. A full birth date redraws the finder without pressing the button; an impossible or future date shows its
   inline error. Nothing is sent to the API. Play runs only when pressed and stops at six months.
5. Every example is marked as Mira's (Sample account or Sample words); every computed fact in her sample words
   (a date, a pass count, a house) comes from the engine, and a test fails one that doesn't.
6. Get my report opens the waitlist before launch with source `timeline`.
7. The four sentences change in the same release; `check:shipped` and the price gates stay green.
8. Axe clean, Lighthouse within the site's budgets, no sideways scroll at 390, 768 and 1440 px, complete at
   first paint with reduced motion; CSP hashes rewritten after the FAQ markup; the dry lab clean.

## Screens
1. The product page at 390 px and desktop, live: https://claude.ai/artifact/YTpuNi1CqPfJJHVNEdtMJG#page
2. The home line: #home · 3. The four sentences: #words

## The Owner's answers (2026-10-03)
1. "Stop planning R15 launch and the pricing": pricing and launch are on hold (ADR-230, 242), R15 is the cleanup
   round, and this page is built with Timeline in R16, as its first group (ADR-259, superseding ADR-254's misreading).
2. No price: "keep it as coming soon". The four sentences: approved. Home option A, rewritten about Timeline as a whole.
3. On version 2: "you don't actually say what it gives you"; every card became a promise, why it matters and Mira's
   example. On version 3: "much, much better"; the dramatic lines became plain (decision 8).

## Decisions to record
1. `/timeline` is Timeline's prerendered product page: hero with the dial, five things it gives you, try it free
   (the Saturn-return finder), what you get with three steps, how it stays honest, FAQ. It details ADR-215.
2. Each of the five things is a promise, why it matters, and what Mira (the sample account) sees, computed from her
   chart for a snapshot week renewed per Release; plain words first, astronomy small. Sample words are allowed and
   marked until Timeline's readings exist. The hero is the Timeline ideation's dial with Play.
3. The finder and previews run on `cycles.ts` and day contacts, the first slices of `transits.ts`, pinned to JPL
   Horizons; date only.
4. The way in: one line on the home page after Prices about Timeline as a whole, and "Timeline" in the footer.
5. Four sentences change with it (Prices, two FAQ answers, Method), approved by the Owner 2026-10-03.
6. The page is built in R16, Timeline's round, as its first group; R15 stays the cleanup round (ADR-259).
7. No Timeline price on the site yet: the plan card says "Coming soon" (the Owner, 2026-10-03).
8. Every sample line on the page is plain and simple: everyday words, one idea per sentence, no drama ("What you
   hope for is asked to go deeper or let go" became "A good time to look at your plans again and keep the ones
   that still matter"; the Owner, 2026-10-03). The same rule goes into the Timeline readings' brief.
