# Timeline

Ideation 2026-10-01, draft v9, ready to lock; behind a switch, off at launch. Picks up MB-26
and "Later: the subscription" (`pricing-and-launch.md`).
https://claude.ai/artifact/V93jKVXrQKQ8S4byLefuFE

Timeline is the one subscription, sold only to an owner of a Personal natal report. It
shows the sky moving across the reader's own chart, no one else's: a life's long cycles,
what touches it now and ahead, and Ask, a chat about the chart, reports and timeline. No
horoscope for the day. **Its job is to sell more reports**: the reports make the money and
the loop; Timeline brings the reader back to their dashboard every week, past their circle.

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
- **Life cycles**, birth to 90: every planet's return and opposition (Jupiter, Saturn, the
  mean nodes, Uranus); Saturn's and Uranus's squares; Neptune's and Pluto's squares. Passes
  a retrograde splits merge into one cycle with several exact dates.
- **Chiron is excluded** until it has a real ephemeris (today: fixed speed, no retrograde).
- **No birth time** (R-4.6): no angle, house or natal Moon target (too loose to time);
  Timeline says so once and shows the planet contacts it can.

### Life (screen 3)
- **It opens on why it matters**: four known ages as cards with the reader's dates and a
  ring: 29 (Saturn), every 12 (Jupiter), 19 and 37 (nodes), early forties (Uranus).
- Waves, ages on top: per planet, its distance from its birth place, monthly from the
  engine; a return at the bottom, opposite at the top, cycles as markers; the past shaded.
- A cycle's card: name, plain word, ring, one fact, the reading; numbers quieter on the
  left (ADR-98); repeating cycles carry a look-back prompt ("Think back to summer 2014").

### Now and ahead (screen 4)
- **The dial**, no Gantt: the natal chart inside, each planet from Mercury to Pluto on its
  own track outside (slowest outermost, the Moon never), a brass line for each doctrine
  contact, a dashed ring on a retrograde. A range (this week, this month, six months) sets
  a day slider and draws each planet's path; Play steps day by day, only when pressed.
- Beside it, why it matters first: the day's mix as one bar, then a card per contact with
  its tone (easy teal, mixed grey, intense rose, by a fixed planet-and-aspect table), a
  plain headline, one everyday line, how long it lasts; the planet, house, orb and dates
  small underneath; tap to read. Then what starts, peaks or eases next (tap to jump).

### Ask (screen 5)
- A chat about the reader's chart, reports and timeline in their own words. When it needs
  a date, a window or a person it asks back with tappable choices, then answers with the
  same computed cards as Timeline (a day's contacts, a window's easy, mixed or intense
  days, a cycle) through tools, quoting reports word for word. The Moon appears only here.
- It reads only what the reader can read (`access.ts`, R-3.6). Someone in a Compatibility
  report the reader can read is computed for the day asked about only, never stored.
- It reflects: no diagnosis, medical, legal or money advice, no do or don't; a fixed harm reply.
- **Always there**: a launcher, bottom right, on the dashboard, Timeline and the reader's
  reports. Its mark: our ring and horizon opened into a speech bubble; Newsreader italic.
- **The cap** (Owner: model cost under half the subscription, no new tier): 50 messages a
  month. Yearly €69.99/12 less 23% VAT and Stripe is €4.63; half €2.32. Readings €0.12 and
  Ask at the cap €1.50 (about €0.03 a message, two `gpt-5.2` calls) make €1.62, 35%; it
  holds at a 25% offer. Staging measures; the cap moves, never the price. Silent until 10.

### Readings (the brain, `api/src/prompts/timeline/`)
- A new prompt family: one reading per event, written when first opened or when it enters
  the six-month view, then stored; Ask answers per message through tools. Inputs: the
  computed event, the per-chart brief and the reader's report sections for the points
  involved, so a reading links to the house card or chapter it builds on.
- R-5.1 voice. Checks (R-4.3): an uncomputed date or degree, a predicted life event or a
  do-or-don't blocks; model ids from `models.ts`; dry lab at every change; fixtures in
  `fixtures/charts/`.

### Where it is sold (screen 1)
- **The end of the report**: after Closing and the Send line, before the method strip,
  only on the reader's own Personal natal report: their dial today, the computed headline
  ("Saturn is crossing your Ascendant") and passes, three questions built by code from the
  chart, the first answered free by Ask (about €0.03), Life, Now and ahead and Ask in a
  line each, the price, Start Timeline, Not now. No countdown. With nothing slow on the
  chart, it names the next life cycle.
- **The dashboard stays as R12 shipped it** (`review-01-10`: the title and summary, Your circle
  with Circle · People · Compatibility, the quick look, What you're practising, Your pairs,
  Share). A subscriber gets one section after Your circle, **Your week**, from one more field
  on `GET /home`: the dial with Week · Month · 6 months and Play (the planets move, nothing
  else does; Back to today), the headline, seven days with tone dots, what's on you, one why
  card, Open Timeline. Timeline is one page, from there and the account menu. Ask in the corner.
- **Two small changes for everyone** (may ship before Timeline): "At a glance ›" under the
  reader's name in the circle; one triad row everywhere: the real icons (the one Sun, the
  Ascendant glyph), label, sign, degrees, house, the Rising included ("Aries 12.12° · 1st
  (self)"); the ruler moves into the report.

### Timeline sells reports
- One Single keeps €18.63, a year of Timeline about €36: one more report a year doubles it.
- **The why card**: a contact on Venus, the Moon or the 7th house gets one card about a
  person in the circle: the sky event, what it touches in the reader's chart, how astrology
  reads it, and the pair chapter it lands in (Venus turning back through the 8th and 7th:
  chapter 07, Love and closeness), opening it; with no pair, "Read the two of you · 1
  credit" through R13's asking steps. Never another person's sky. One a week at most.
- **Ask** answers about someone from the reader's side and offers the pair, or Gift a report.
- **Share cards** per life cycle (1080×1350, ADR-102): ring, age, name, sky date, "When is
  yours?", to `/timeline`'s finder. MB-104's answer governs what a card may show.
- **The yearly plan: "€69.99 a year (1 credit to give, included)"**, granted through R13's
  ledger on each yearly payment (History "+1 · with Timeline"), taken back if refunded unspent.
- **The letter ends at the circle** (a pair, a share, a gift waiting). Measured in the loop
  study against owners without Timeline: one more report a year.

### Free and paid
- Free for a report owner: the offer (their dial today, one Ask question), one dashboard
  line, "Your next big cycle is at 37, in 2 years", with Share; and the public finder.
- Timeline: Your week, every reading, Now and ahead, Life, Ask, the letter, for the
  reader; the yearly plan adds 1 credit to give.
- **€9.99 a month or €69.99 a year** (58% of twelve months), VAT included, EUR only, like
  the report: EU consumer prices must show the final price. Home-rate VAT under €10,000 of
  cross-border sales a year, then each buyer's rate through OSS; the price stays the same.
- **No free trial.** Offers (at most 25%) or a trial only as dated promotions (ADR-146's
  form), the first 30 days after €9.99 is live, so the "before" price is real.

### The switch and the order of building
- `TIMELINE` in `packages/launch`, off everywhere, the admin sees it on staging; on is a Release.
- Built after R13 (pricing and launch); R13 stays as planned. Launch is the two reports.

### Coming soon on the site (screen 7, no switch)
- `/timeline`, prerendered like the other public pages (R-7.6), opening with an answer
  that names Stars Decoded (ADR-116): "When is your Saturn return?" A free finder takes
  a birth date and computes, in the browser with the engine, the Saturn returns, the
  next Jupiter return, the nodal returns and the Uranus opposition. Dates only.
- Cards: the Saturn-return age ring; four cycle cards ("next in N years" or "behind you");
  three previews; Get my report (the waitlist before launch, ADR-167); a folded FAQ.

### The weekly letter (screen 6)
- Opt-in: every week with something, only the big ones, or off. Monday, from Railway.
- Only when something begins, peaks or ends that week: the biggest in the subject, seven
  day cells, facts and dates, "Read what this means for you", one-click stop. Dark tables.
- No push notifications, no daily anything, no streaks or badges (ADR-127).

### Billing
- Stripe Billing, monthly and yearly, prices in `catalogue.ts` (R-6.3), tables mirror
  its webhooks (R-6.2); cancel in two clicks; consent to start at once at checkout. The
  consumer-law check (MB-114) widens to recurring billing and auto-renewal.

### Rules and copy that change when it ships
- §1 Thesis, §2 exclusions and V2 list, R-6.1's "one-time" wording, and R-5.2, which
  gains: "It may name the dates of computed sky events and say how astrology reads that
  time. It never names a date for something in the reader's life, and never tells the
  reader to do or not do the thing they asked about."
- With the coming-soon page: FAQ "Does it predict the future?" ("no dates for your life"),
  "Do I pay once or every month?", the Pricing lede, Method, Terms, ux-copy's date rule.

## Out of scope
- Timeline for anyone but the reader until readers ask; pairs (MB-103); sharing (MB-104).
- Daily horoscopes, push notifications, progressions, solar returns, Lilith, Placidus.
- Ask as therapy or coaching: it reflects, it doesn't counsel. Voice or images in Ask.

## Acceptance criteria
1. Every date and degree on a Timeline screen, email or reading comes from the engine
   for that profile; a test fails a reading that cites any other.
2. Exact dates match JPL Horizons to the hour for pinned fixtures (unit tests).
3. No horizon: no angle, house or natal Moon contact. A quiet week writes and sends nothing.
5. No reading predicts a life event, promises an outcome or answers the asked plan with
   do or don't; the checks log every attempt that did (`generation_failures`).
6. The end-of-report offer shows only on an owned Personal natal report, computed, once.
7. The free layer works without a subscription; a lapsed one keeps readings, stops new ones.
8. Cancelling takes two clicks, the letter stops in one; prices only in `catalogue.ts`.
9. Dry lab clean, a spot run before the Release; the finder matches the engine per fixture.
10. With `TIMELINE` off, no Timeline surface, route or email reaches a non-admin.
11. Ask never shows a chart or report its reader can't read; a test covers each access.

## The Owner's answers (2026-10-01)
1. Timing: **B**, the reading with reasons, never yes, no or a score. Only the reader.
2. €9.99 a month, VAT included, no free trial, promotions only. Behind a switch, after R13.
3. On v2 to v5: Ask a chat capped by cost, no tier; the dial, not a Gantt; Ask everywhere
   with its own mark; Life's why first, ages on top; coming soon as cards; tone colours.
4. On v6 to v8: reports and sharing are the core and the money; keep R12's dashboard, change
   only what must; Your week under it with Play; explain the chapter; 1 credit to give; At a
   glance; one triad row with Rising's house.
Claude's calls (the Owner may overturn any): the switch, the name Ask, €69.99 a year, one
free question, rose #C46B78, easy/mixed/intense, the why card, the free next-cycle line.

## Decisions to record (at /lock)
1. Timeline is the one subscription, only for an owner of a Personal natal report.
   Supersedes ADR-4 in part; amends §1 and §2 (daily horoscopes stay excluded).
2. R-5.2 amended: sky dates may be named, life dates never, no do or don't.
3. Now and ahead is the moving dial, plain words first, tone by a fixed table (easy, mixed,
   intense, rose the one new token), reasons, never a score; content only on contacts.
4. The doctrine: bodies, aspects, orbs, mean node, Chiron out, whole sign, no-time rules.
5. The reader's own chart only. Life: waves, birth to 90, four known ages first.
6. Readings: a new prompt family, once per event per person, stored, tied to the report;
   any date or degree not computed blocks.
7. Sold after Closing on an owned report, once. R12's dashboard is unchanged; a subscriber
   gets Your week after Your circle, its dial playable. At a glance and one triad row for all.
8. Free: the offer, one question, the next-cycle line with Share. €9.99 / €69.99, VAT
   included, no free trial; dated promotions only, the first 30 days after launch.
9. Ask: a chat that asks back with cards, computed answers, reads only what the reader
   can, no diagnosis or advice, a fixed harm reply, 50 a month, its mark everywhere.
10. The weekly letter: opt-in, Monday, only in weeks that touch the chart.
11. `TIMELINE` off everywhere, admin sees it on staging; built after R13. `/timeline`
    coming soon with the finder, no switch, may ship with the launch.
12. Timeline sells reports: the why card, Ask's pair offer, share cards, 1 credit to give
    with the yearly plan, the letter's circle line; success is one more report a year.
