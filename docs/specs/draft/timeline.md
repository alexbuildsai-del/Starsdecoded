# Timeline

Ideation 2026-10-01 with the Owner. Status: draft, three questions open (below).
Artifact: https://claude.ai/artifact/V93jKVXrQKQ8S4byLefuFE
Picks up MB-26 (parked: transit forecasts) and "Later: the subscription" in
`pricing-and-launch.md`, which asked this ideation to amend §1 and R-5.2.

Timeline is the one subscription. It is sold only to someone who owns a Personal
natal report and shows the sky moving across that chart: the long cycles of a
life, what touches the chart now and in the coming months, and answers about a
date the reader asks about. It never writes a horoscope for the day. The dates
are computed and free; what they mean for the reader is the subscription.

## Scope

### The engine (`packages/engine/src/transits.ts`, the brain)
- A positions-only longitude for any instant (answers MB-125 for this path), an
  exact-hit search (daily scan, bisection to the minute), in-orb windows, stations,
  sign ingresses and eclipses (astronomy-engine's own searches). Local and free.
- **Doctrine.** Transiting Jupiter, Saturn, Uranus, Neptune and Pluto to the natal
  Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Ascendant and Midheaven, by
  conjunction, square, opposition and trine. Orbs: 2° Jupiter and Saturn, 1.5° the
  three outer planets. Mars by conjunction, square and opposition at 1°. Retrogrades
  of Mercury, Venus and Mars with the whole-sign house they move through. An eclipse
  is listed with its house and gets a reading only within 3° of a natal point.
  Sextiles, the Moon's daily moves and the minor bodies make no content.
- **Life cycles**, birth to 90: Jupiter returns; Saturn's opening square, opposition,
  closing square and return; the nodal return and reversal (mean node, like the
  chart); Uranus's squares and opposition; Neptune's square; Pluto's square. Passes
  that a retrograde splits merge into one cycle with several exact dates.
- **Chiron is excluded** until the engine has a real ephemeris for it: today it is a
  mean-element stand-in with a fixed speed and no retrograde.
- **No birth time** (R-4.6): no Ascendant, Midheaven or house, and the natal Moon is
  not a target, since its place across the band is too loose to time. Timeline says
  so once and shows the planet contacts it can.
- Unit tests pin exact dates for fixtures against JPL Horizons, as the chart does.

### Life (screen 2)
- One ribbon per person, birth to 90, a row per planet. A bar is the in-orb window,
  a brass tick an exact pass, a line marks today. Past cycles stay on it.
- A cycle opens a card: age, in-orb dates, exact passes, the point and its house
  (with its one word, ADR-98), the natal position, the sign season for Jupiter and
  Saturn, last time and next time, a one-line astronomy fact, and the reading.
- Every repeating cycle carries a look-back prompt ("Think back to summer 2014").
- A child's cycles are written for the parent about the child at that age (ADR-83).

### Now and ahead (screen 3)
- A season strip of the long contacts and retrogrades over the next six months.
- Three ranges: this week, this month (a calendar with retrograde bands and a dot
  where something begins, peaks or ends), the next six months grouped by month.
- Each item: dates, a computed title, degrees and house, and for long contacts,
  retrogrades and eclipses on a point, the reading. Anything else gets one line.

### Ask about a date (screen 4)
- **Look back**: a date and an optional note. **Look ahead**: a plan, a kind (signing
  something, starting something, a hard conversation, money, travel) and a window of
  up to six weeks. The only place the fast sky appears, the Moon included.
- The answer lists every contact with its numbers, then astrology's reading. Look
  ahead shades each day smoother, mixed or harder by form as well as colour, with the
  reasons in words (Question 1). It closes on what it can't say: who was right, what
  will happen, or whether to sign. A fair-use cap of 20 questions a month, confirmed at the lock.

### Readings (the brain, `api/src/prompts/timeline/`)
- A new prompt family: one reading per event per person, written the first time it
  is opened or when it enters the six-month view, then stored. Ask answers are written
  per question. Inputs: the computed event, the per-chart brief and the reader's own
  report sections for the points involved, so a reading links to the house card or
  chapter it builds on.
- R-5.1 voice. Checks by class (R-4.3): a date or degree not in the computed event
  blocks; a predicted life event, an outcome or a do-or-don't about the asked plan
  blocks; every model id from `models.ts`. Dry lab at every change; Timeline fixtures
  join `fixtures/charts/` (the lab never reads `sample-people/`).

### Where it is sold (screen 1)
- **The end of the report**: after Closing and the Send line, before the method strip,
  only on a Personal natal report the reader owns. A computed headline from their chart
  ("Saturn is crossing your Ascendant") with its passes on a small line, one sentence on
  what Timeline adds, Start Timeline, Not now. No reading, no countdown. With nothing
  slow on the chart, it names the next life cycle and its dates.
- **The dashboard**: each person's card gets one computed line (what is on them now, or
  the next cycle) and Open Timeline. One nudge at a time (ADR-126).

### Free and paid
- Free with any Personal natal report: the life ribbon and the now list as names and
  dates, computed, no reading.
- Timeline: every reading, the three ranges, Ask about a date, the weekly letter, for
  everyone on the account with a Personal natal report (one price, the family case).
- Price and the 30 days that come with a report: Question 2.

### The weekly letter (screen 5)
- Opt-in when Timeline starts: every week with something, only the big ones (outer
  planets, Saturn, an eclipse on a point), or off. Monday, from Railway on a schedule.
- Sent only when something begins, peaks or ends in the chart that week. Facts and
  dates, the biggest event in the subject, the readings in the app, one-click stop.
- No push notifications, no daily anything, no streaks or badges (ADR-127).

### Billing
- Stripe Billing, monthly and yearly, prices in `catalogue.ts` (R-6.3); our tables
  mirror its webhooks (R-6.2). Cancel online in two clicks from where it started.
- Consent to start at once on the checkout, as the credit tick does; the consumer-law
  check (MB-114) widens to recurring billing and auto-renewal disclosure.

### Rules and copy that change when it ships
- §1 Thesis, §2 exclusions and V2 list, R-5.2, R-6.1's "one-time" wording.
- R-5.2 becomes: "...It may name the dates of computed sky events and say how astrology
  reads that time. It never names a date for something in the reader's life, and never
  tells the reader to do or not do the thing they asked about."
- Live copy, in the round that ships Timeline and not before: FAQ "Does it predict the
  future?" and "Do I pay once or every month?", the home Pricing lede, Method page,
  Terms, the ux-copy house rule on dates.

## Out of scope
- Pairs on a timeline ("the two of you that week"): waits for the pair consent rule
  (MB-103). Sharing a timeline with anyone (MB-104).
- Daily horoscopes, Moon-of-the-day content, push notifications.
- Progressions, solar returns, Chiron, Lilith, asteroids, Placidus.
- A chat about the chart. Ask is one question with a computed answer.
- Timeline without a Personal natal report, or sold on its own from the landing page.

## Acceptance criteria
1. Every date and degree on a Timeline screen, email or reading comes from the engine
   for that profile; a test fails a reading that cites any other.
2. Exact dates match JPL Horizons to the hour for the pinned fixtures.
3. A profile without a horizon shows no angle, house or natal Moon contact anywhere.
4. Nothing is listed or written for a day the doctrine leaves untouched; a quiet week
   sends no letter.
5. No reading predicts a life event, promises an outcome or answers the asked plan with
   do or don't; the checks log every attempt that did (`generation_failures`).
6. The end-of-report offer shows only on an owned Personal natal report, computed, once.
7. The free layer works with no subscription; a lapsed subscription keeps its readings
   readable and stops new ones.
8. Cancelling takes two clicks; the letter stops in one.
9. Prices live only in `catalogue.ts`; the gate test still passes.
10. Dry lab clean; a spot run of the Timeline family before the Release.

## Screens
Artifact: https://claude.ai/artifact/V93jKVXrQKQ8S4byLefuFE. Computed for the
synthetic Mira Costa and June Costa on 1 Oct 2026; text marked Sample is ours.
1. End of the report and the dashboard line. 2. Life, Mira and June. 3. Now and
ahead: week, October, six months. 4. Ask: look back (18 Sep) and look ahead (a lease
in October). 5. The weekly letter. Then free and paid, prices, the rules, the questions.

## Open questions (asked 2026-10-01)
1. **How far an answer about timing goes.** A sky facts only, B astrology's reading
   with reasons and smoother, mixed or harder days, C a verdict per day. Recommended B.
   Default: B, with R-5.2 amended as above.
2. **Price and packaging.** Recommended €7 a month or €49 a year for the account, the
   first 30 days with every report, no card, ending on their own with one email a week
   before. Default: as recommended.
3. **When.** Recommended: lock now, build as R13 after R12's checkout and launch, R12
   untouched. Default: R13.

## Decisions to record (at /lock)
1. Timeline is the one subscription, sold only to an owner of a Personal natal report.
   Supersedes ADR-4 in part and amends §1 and §2 (transits and subscriptions leave the
   exclusions; daily horoscopes stay).
2. R-5.2 amended: sky dates may be named, life dates never, no do or don't.
3. No horoscope for the day: content exists only when the doctrine touches the chart;
   the fast sky appears only in Ask.
4. The doctrine above: bodies, aspects, orbs, mean node, Chiron excluded, whole sign.
5. Life runs birth to 90, past cycles included, with a look-back prompt; a child's
   reading is written for the parent at the child's age.
6. Readings are a new prompt family, written once per event per person and stored,
   tied to the reader's report; dates in text must snap to computed ones.
7. Sold after Closing on an owned Personal natal report and on the dashboard card, with
   a computed headline, once.
8. The dates are free with every report; the readings, ranges, Ask and letter are paid.
9. Price and the 30 days (Question 2).
10. Ask about a date: look back and look ahead, six-week window, five kinds, 20 a month.
11. The weekly letter: opt-in, Monday, only in weeks that touch the chart, one-click stop.
12. Pairs on a timeline wait for MB-103.
13. The answer style (Question 1) and the build round (Question 3).
