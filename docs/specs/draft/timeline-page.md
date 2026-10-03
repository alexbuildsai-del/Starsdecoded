# Timeline page (`/timeline`)

Draft 2026-10-03 from `/ideate timeline-page`, version 2 (the Owner: "do a proper product page where we show the
value propositions and what you're getting when paying the subscription fee"). Builds on the locked `timeline`
spec (ADR-205 to 217; screen 7, ADR-215), which it details and does not change.
Artifact: https://claude.ai/artifact/YTpuNi1CqPfJJHVNEdtMJG

`/timeline` is Timeline's public product page: what Timeline is, the five things it gives a reader, what the
subscription includes, how it stays honest, and the Saturn-return finder as the free piece to try. It needs no
`TIMELINE` switch (ADR-215), so it goes live before Timeline does, under the waitlist like every public page
(ADR-167). Everything it describes is already locked; it promises nothing the Timeline spec doesn't.

## State on 2026-10-03
- The locked `docs/specs/locked/timeline.md` and its MASTERFILE line exist only on `claude/tender-lovelace-ynaemg`
  (lock commit 6d0733a). They come to main with this spec's lock.
- Main's site has no Timeline section or page.

## Scope

### The page (screen 1), top to bottom
1. **Hero.** Eyebrow "Coming soon · Timeline"; H1 "Your chart, with the sky moving across it". The lede answers
   alone and names the product (ADR-116): "Timeline is Stars Decoded's one subscription, for people with a Personal
   natal report. It shows when the planets reach the points in your own chart, from the big cycles of your life to
   this week, reads each one against your report, and answers your questions about it." Get my report, and "When
   is your Saturn return?" (jumps to the finder). Under them: "Timeline opens after launch. You'll need a Personal
   natal report." The picture is the locked dial: a natal chart inside, Jupiter to Pluto today on their own tracks,
   a brass line for each contact (no motion here; Play belongs to Timeline).
2. **What Timeline gives you**, "Five things, all about your own chart", each a card with its computed picture:
   - *Now and ahead* (wide): today's mix bar, up to three contacts with tone dot (easy, mixed, intense, by the locked
     fixed table), a plain headline ("Pluto faces your Jupiter"), how long it lasts, aspect and orb small; then the
     next contact to start within six months.
   - *Life*: Saturn's distance from its birth place as a wave, birth to 90 (Jupiter faint), the past shaded, ages on
     top, brass at each Saturn return.
   - *Readings*: the top contact's headline, "Builds on your report's Venus section ›", and blank lines marked
     "Written for you in Timeline". No sample prose: nothing has written it.
   - *Ask*: its mark and three questions built by code from the chart (the locked offer's rule). No sample answer.
   - *Your week*: seven day cells with tone dots, and "No letter in a quiet week" for the Monday letter.
3. **Try it free**: "When is your Saturn return?" One typed birth-date field (R14's `BirthDateField`, the reader's
   order), helper "No birth time or place needed.", "Show my dates". The big ring with the age of the current or
   next return and one line per return; then four compact cycle cards (Saturn return, Jupiter return, nodal return,
   Uranus opposition) with ages, the passes of one cycle on one row, a chip (behind you, happening now within 120
   days of a pass, in N years) and the locked fixed why line. **A typed date redraws the whole page**: the hero
   dial, the five cards and the finder. Before a date the page shows an example date, marked "example date".
4. **What you get**: a plan card "Timeline" listing what the fee includes: your life's big cycles, birth to 90 ·
   what touches your chart now, this month and over six months, each marked easy, mixed or intense with how long it
   lasts · a reading for each, tied to your Personal natal report · Ask, about your chart, reports and timeline ·
   your week on your dashboard · a Monday letter in weeks that touch your chart (every week, only the big ones, or
   off) · with the yearly plan, 1 credit to give. Price line per open question 2. Beside it, **How to get it** in
   three steps: get your Personal natal report; read it to the end (its last page shows your sky today and one free
   question); Start Timeline there or from your dashboard, cancel in two clicks. Get my report.
5. **How it stays honest**: no horoscope for the day · dates for the sky, never for your life · no do or don't ·
   quiet weeks stay quiet (stop the letter in one click).
6. **Questions** (folded, `FAQPage`): What is Timeline? Is it a daily horoscope? What is a Saturn return? Do I need
   my birth time? How do I cancel? In `data/faq.ts` under a Timeline topic, not marked `home`.
7. **Fine print**: worked out with astronomy-engine from the birth date at midday, so a date can be a day off; the
   meanings come from astrology, which science doesn't back.
- Registry entry in `site.ts` (kind `page`, schema `WebPage` and `FAQPage`, sitemap), prerendered (R-7.6) with
  the hero, card text, plan and FAQ readable without JavaScript; share preview and crawl entry like `/sky`.
- Phone first: one column at 390 px; from 880 px the hero splits, the five cards sit two across with Now and
  ahead full width, the cycle cards four across, the plan and steps side by side.
- Ask's monthly cap stays off the page (silent until 10, as locked). Previews use the date only; the FAQ says a
  birth time adds the rising sign, houses and Moon in Timeline.
- Get my report: `ReportCta source="timeline"`, the waitlist before launch; once `TIMELINE` is on, an owner of a
  Personal natal report sees Start Timeline and the eyebrow drops "Coming soon".

### The engine (`packages/engine/src/`, the brain)
- `cycles.ts`: returns and oppositions for Saturn, Jupiter, the mean node and Uranus (opposition), birth to 90, from
  12:00 UTC on the birth date; scan, bisection to the minute, retrograde passes grouped into one cycle.
- Contacts for a day and the next six months: the locked doctrine (Jupiter to Pluto onto Sun to Saturn; conjunction,
  square, opposition, trine; 2° and 1.5° orbs), date only, so no angle, house or natal Moon target (R-4.6). In-orb
  windows from daily positions.
- Both are first slices of the locked `transits.ts`, reused by Timeline. The tone table is the locked fixed table, a
  brain file. The artifact runs both in the browser in under half a second. Touching the engine runs the dry lab.

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
- Timeline itself (the dial with Play, Life, Ask, readings, billing, the letter), after launch as locked.
- Sample reading or Ask prose on the page, share cards (MB-104), birth time or place in the finder, a top-menu
  link, a separate Timeline list, any change to R15.

## Acceptance criteria
1. Every date, age, orb, tone and position on `/timeline` comes from the engine; no date or degree is typed in copy.
2. `cycles.ts` and the contact windows match NASA JPL Horizons to the hour for at least five pinned birth dates
   (one three-pass Saturn return, one before 1950), in unit tests.
3. The prerendered HTML holds the hero, the five cards' words, the plan, the rules and the FAQ without JavaScript.
4. A full birth date redraws the hero, the five cards and the finder without pressing the button; an impossible
   or future date shows its inline error. Nothing is sent to the API.
5. No reading or Ask answer text appears that nothing wrote; a test fails a sample string.
6. Get my report opens the waitlist before launch with source `timeline`.
7. The four sentences change in the same release; `check:shipped` and the price gates stay green.
8. Axe clean, Lighthouse within the site's budgets, no sideways scroll at 390, 768 and 1440 px, complete at
   first paint with reduced motion; CSP hashes rewritten after the FAQ markup; the dry lab clean.

## Screens
1. The product page at 390 px and desktop, live: https://claude.ai/artifact/YTpuNi1CqPfJJHVNEdtMJG#page
2. The home line: #home · 3. The four sentences: #words

## Open questions
1. **R15.** Read as: R15 stays pricing and launch, and this page doesn't go into it; it waits for the round the
   Owner gives it at the next /plan. Default: so.
2. **The price.** Recommended: none until Timeline opens ("The price shows when Timeline opens"); a public price is
   a promise before Stripe Billing and MB-114's recurring-billing check. Or "€9.99 a month or €69.99 a year, with 1
   credit to give" from the catalogue now. Default: no price.

## Decisions to record
1. `/timeline` is Timeline's prerendered product page: hero with the dial, five things it gives you, try it free
   (the Saturn-return finder), what you get with three steps, how it stays honest, FAQ. It details ADR-215.
2. Its pictures are computed from one typed birth date (an example date until then) and redraw together; readings
   and Ask show no prose that nothing wrote.
3. The finder and previews run on `cycles.ts` and day contacts, the first slices of `transits.ts`, pinned to JPL
   Horizons; date only.
4. The way in: one line on the home page after Prices about Timeline as a whole, and "Timeline" in the footer.
5. Four sentences change with it (Prices, two FAQ answers, Method), approved by the Owner 2026-10-03.
6. R15 stays pricing and launch; the page's round is set at the next /plan (Q1).
7. No Timeline price on the site until Timeline opens (Q2).
