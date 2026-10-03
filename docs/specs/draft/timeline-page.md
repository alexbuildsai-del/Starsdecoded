# Timeline page (`/timeline`)

Draft 2026-10-03 from `/ideate timeline-page`. Builds on the locked `timeline` spec (screen 7, "Coming soon on
the site"; ADR-205 to 217, ADR-215 and 217 above all), which this draft details and does not change.
Artifact: https://claude.ai/artifact/YTpuNi1CqPfJJHVNEdtMJG

`/timeline` is a public page that answers "When is your Saturn return?" with the reader's real dates, says in
three lines what Timeline will add, and sends them to Get my report (the waitlist before launch, ADR-167). It needs
no `TIMELINE` switch (ADR-215), so it ships before Timeline itself: proposed as its own group in R15, beside
pricing and launch. Timeline itself stays after launch, as locked.

## State on 2026-10-03
- The locked `docs/specs/locked/timeline.md` and its MASTERFILE line exist only on `claude/tender-lovelace-ynaemg`
  (lock commit 6d0733a); main's INDEX names ADR-205 to 217 but not the file. They come to main with this draft.
- Main's site has no Timeline section or page: nothing on `/`, no `/timeline` in `site.ts`.

## Scope

### The page (screen 1)
- `/timeline` in the registry (`web/src/site/site.ts`), kind `page`, schema `WebPage` and `FAQPage`, in the
  sitemap, prerendered like the other public pages (R-7.6), with its share preview and crawl entry like `/sky`.
- Title "When is your Saturn return? · Stars Decoded"; eyebrow "Coming soon · Timeline"; H1 "When is your Saturn
  return?". The lede answers alone and names the product (ADR-116): "Saturn comes back to where it was when you
  were born at about 29, and again at 58. Astrology calls that your Saturn return. Put in your birth date and Stars
  Decoded works out your dates from real astronomy."
- **The finder.** One typed birth-date field, R14's `BirthDateField` in the reader's order (the Owner: speed of
  entry beats pickers), helper "No birth time or place needed.", button "Show my dates". Results come as the date
  completes; errors inline in ux-copy's form ("That date doesn't exist. Check the day and month.").
  1900 to today. Nothing is sent or stored.
- **The ring.** Opens empty: the ring shows Saturn today, "Saturn takes 29.5 years to go round once". With a date:
  the age of the current or next Saturn return in the centre, Saturn at birth (brass) and today (indigo) on the ring
  with the arc between them, and one line per return ("At 29: 19 Jan 2021 · behind you"). Aries at the left, the
  zodiac anticlockwise, as the product's wheel turns.
- **Four cycle cards**: Saturn return, Jupiter return, nodal return, Uranus opposition. Each: a small ring, the ages
  it falls at (computed), the name, up to two rows of dates (every exact pass of a cycle on one row) with a chip
  "behind you", "happening now" (within 120 days of a pass) or "in N years", and one fixed why line, the same for
  everyone so search reads it (the locked spec's four lines).
- **Coming in Timeline**: three one-liners with a small picture each (the dial from today's computed sky, Ask's
  bubbles, the Monday letter's week), then "Timeline opens after launch, for people with a Personal natal report."
- **Get my report** (`ReportCta source="timeline"`): the waitlist before launch, tagged so the admin's waitlist
  shows the source; the birth form after launch.
- **FAQ, folded**: What is a Saturn return? How long does it last? Do I need my birth time? What is Timeline?
  (answers in the artifact; the last says the price will show when it opens). In `data/faq.ts` under a Timeline
  topic, not marked `home`, so the home page's ten stay as they are.
- **Fine print**: "Worked out with astronomy-engine from your birth date at midday, so a date can be a day off. The
  meanings come from astrology, which science doesn't back."
- At 390 px one column; from 880 px the hero splits into lead and ring and the cards sit four across.

### The engine (`packages/engine/src/cycles.ts`, the brain)
- Returns and oppositions for Saturn, Jupiter, the mean node and Uranus (opposition only), birth to 90, from the
  birth date at 12:00 UTC: the engine's apparent geocentric longitude and IAU 1980 mean node, a daily-order scan,
  bisection to the minute, passes a retrograde splits grouped into one cycle. Runs in the browser in about a quarter
  of a second (measured in the artifact on astronomy-engine 2.1.19).
- It is the first slice of the locked `transits.ts` and is written so Timeline's Life screen reuses it.
- Touching the engine runs the dry lab in the round (CLAUDE.md, the brain).

### The way in (screen 2)
- **Home** (default A): one line between Prices and the questions, "Coming soon · When is your Saturn return?
  Find your dates ›", no form, no new look; the sections above and below stay as they are.
- **Footer**: "Your Saturn return" in the Reports column, after Free birth chart, on every page. The top menu stays
  as it is until Timeline opens.

### Words that change in the same release (screen 3)
- Home, Prices: "You pay once, with no subscription." becomes "You pay once for each report."
- FAQ, Do I pay once or every month?: "Once. There's no subscription." becomes "Once for each report. Timeline,
  coming after launch, will be our one subscription." The rest of the answer stays.
- FAQ, Does it predict the future?: "No. It never puts a date on anything in your life or talks about fate. The
  only dates we show are for the sky, like your Saturn return." The rest stays.
- Method, on home and `/method`: "It won't forecast events, put dates on your life or diagnose anything."
- R-5.2 changes only when Timeline itself ships, as locked; this page is fixed copy and computed dates, no model text.

### When Timeline opens (later, behind `TIMELINE`)
- The eyebrow loses "Coming soon", the price appears from `catalogue.ts`, and the button becomes Start Timeline for
  an owner of a Personal natal report. Specified here so the page is built with that seam.

## Out of scope
- Timeline itself (the dial, Life, Ask, readings, billing, the letter): the locked spec, after launch.
- Share cards from the finder (locked for subscribers, MB-104), a birth time or place in the finder, any other
  cycle (Neptune and Pluto squares stay in Life), a separate "tell me when Timeline opens" list, a top-menu link.

## Acceptance criteria
1. Every date, age and ring position on `/timeline` comes from `cycles.ts`; no date is typed in the page or copy.
2. `cycles.ts` matches NASA JPL Horizons to the hour for pinned birth dates (at least five, including one with a
   three-pass Saturn return and one born before 1950), in unit tests.
3. The prerendered HTML holds the H1, the lede, the four cards with their why lines and the FAQ, readable without
   JavaScript; the finder hydrates over it.
4. A full birth date shows results without pressing the button; an impossible or future date shows its inline
   error; the empty field shows the empty ring. Nothing is sent to the API.
5. Get my report opens the waitlist on production before launch and records source `timeline`.
6. The four sentences above change in the same release; the `check:shipped` and price gates stay green.
7. Axe clean, Lighthouse within the site's budgets, no sideways scroll at 390, 768 and 1440 px; reduced motion
   complete at first paint; CSP hashes rewritten after the FAQ markup.
8. The dry lab runs clean in the round (the engine changed).

## Screens
1. `/timeline` at 390 px and desktop, live: https://claude.ai/artifact/YTpuNi1CqPfJJHVNEdtMJG#page
2. The way in, options A to C: #home
3. Words that change: #words

## Open questions
1. **When it's built.** Recommended: its own group in R15, beside pricing; it touches none of checkout's files
   but two FAQ answers. Or a small round before R15 (pricing deferred a fifth time), or with Timeline after launch.
   Default: R15.
2. **The home page.** Recommended: A, one line after Prices, plus the footer link. Or B, footer only; or C, a full
   section with the finder. Default: A.
3. **The price on the page.** Recommended: none until Timeline opens; a public price is a promise before Stripe
   Billing and MB-114's recurring-billing check exist. Or "€9.99 a month or €69.99 a year" from the catalogue now.
   Default: no price.

## Decisions to record
1. `/timeline` is a prerendered public page answering "When is your Saturn return?" with a browser-side finder for
   four cycles (Saturn and Jupiter returns, nodal returns, the Uranus opposition), from a typed birth date only,
   nothing sent or stored; it details ADR-215's coming-soon page.
2. The finder's math is `packages/engine/src/cycles.ts`, the first slice of `transits.ts`, pinned to JPL Horizons.
3. Its button is Get my report with source `timeline`; no separate Timeline list.
4. The way in: one line on the home page after Prices and "Your Saturn return" in the footer; no top-menu link
   until Timeline opens.
5. Four sentences change with it (Prices, two FAQ answers, Method); R-5.2 waits for Timeline as locked.
6. Built as its own group in R15 (Q1), live with that Release under the waitlist.
7. No Timeline price on the site until Timeline opens (Q3).
