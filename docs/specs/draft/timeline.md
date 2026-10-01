# Timeline

Ideation 2026-10-01, draft v5, ready to lock; behind a switch, off at launch. Picks up MB-26
and "Later: the subscription" (`pricing-and-launch.md`).
https://claude.ai/artifact/V93jKVXrQKQ8S4byLefuFE

Timeline is the one subscription, sold only to an owner of a Personal natal report. It
shows the sky moving across the reader's own chart, no one else's: a life's long cycles,
what touches it now and ahead, and Ask, a chat about the chart, reports and timeline. No
horoscope for the day. The dates are free; what they mean is the subscription.

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
- **Chiron is excluded** until it has a real ephemeris (today: fixed speed, no retrograde).
- **No birth time** (R-4.6): no angle, house or natal Moon target (too loose to time);
  Timeline says so once and shows the planet contacts it can.

### Life (screen 3)
- **It opens on why it matters**: four ages people know, each a card with the reader's date
  and a ring (brass at birth, an arc to today). 29, the late-twenties reset (Saturn); every
  12, a fresh start (Jupiter); 19 and 37, a change of direction (nodes); early forties, the
  midlife shake-up (Uranus opposition). A card opens its cycle.
- Waves, ages on top: per planet, its distance from its birth place, monthly from the
  engine; a return at the bottom, opposite at the top, cycles as markers; the past shaded.
- A cycle's card leads with its name, plain word, ring, one astronomy fact and the reading;
  the numbers (in-orb dates, passes, point and house, ADR-98, last and next) sit quieter on
  the left. Repeating cycles carry a look-back prompt ("Think back to summer 2014").

### Now and ahead (screen 4)
- **The dial**, no Gantt: the natal chart inside, each planet from Mercury to Pluto on its
  own track outside (slowest outermost, the Moon never), a brass line for each doctrine
  contact, a dashed ring on a retrograde. A range (this week, this month, six months) sets
  a day slider and draws each planet's path; Play steps day by day, only when pressed.
- Beside it, why it matters first: the day's mix as one bar, then a card per contact with
  its tone (smoother teal, mixed grey, harder rose, by a fixed planet-and-aspect table), a
  plain headline, one everyday line, how long it lasts; the planet, house, orb and dates
  small underneath; tap to read. Then what starts, peaks or eases next (tap to jump).
  The dashboard's "Your chart today" is the same dial standing on today.

### Ask (screen 5)
- A chat about the reader's chart, reports and timeline in their own words. When it needs
  a date, a window or a person it asks back with tappable choices, then answers with the
  same computed cards as Timeline (a day's contacts, a window's smoother, mixed or harder
  days, a cycle) through tools, quoting reports word for word. The Moon appears only here.
- It reads only what the reader can read (`access.ts`, R-3.6). Someone in a Compatibility
  report the reader can read is computed for the day asked about only, never stored.
- It explains and reflects: no diagnosis, no medical, legal or money advice, no do or don't.
  Harm gets a fixed reply with where to get help.
- **Always there**: a launcher, bottom right, on the dashboard, every Timeline screen and
  the reader's own reports; a full-height sheet on a phone, a side panel on a desktop. Its
  own mark: our house ring and horizon with the brass Ascendant, opened into a speech
  bubble; the name Ask in Newsreader italic.
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
- **The dashboard** (screen 2): a Timeline band above today's dashboard, which stays as
  is: the dial on today, on you now with its passes, this week, next in your life.
  All computed (ADR-92). Without Timeline: names and dates and one line to start it,
  one nudge at a time (ADR-126).

### Free and paid
- Free with the reader's Personal natal report: the dashboard band, the life ribbon, the
  dial for this week, names and dates, no reading; one Ask question.
- Timeline: every reading, all three ranges, Ask, the weekly letter, for the reader.
- **€9.99 a month or €69.99 a year** (58% of twelve months), VAT included, EUR only, like
  the report: EU consumer prices must show the final price. Home-rate VAT under €10,000 of
  cross-border sales a year, then each buyer's rate through OSS; the price stays the same.
- **No free trial.** Offers (at most 25%) or a two-week trial only as dated promotions, a
  catalogue row, no countdown (ADR-146's form widened to Timeline); the first no sooner
  than 30 days after €9.99 is live, so the "before" price is real.

### The switch and the order of building
- `TIMELINE` in `packages/launch`, beside `LAUNCHED`, off everywhere. The admin sees
  Timeline on staging regardless, to work in it. Every Timeline surface (the offer, the
  dashboard band, the app routes, the letter, billing) sits behind it. On is a Release.
- Built after R12; R12 stays as planned. Production launches with the two reports.

### Coming soon on the site (screen 7, no switch)
- `/timeline`, prerendered like the other public pages (R-7.6), opening with an answer
  that names Stars Decoded (ADR-116): "When is your Saturn return?" A free finder takes
  a birth date and computes, in the browser with the engine, the Saturn returns, the
  next Jupiter return, the nodal returns and the Uranus opposition. Dates only.
- Cards: a ring with the age at the Saturn return; four cycle cards (ring, age, dates, "next
  in N years" while a pass is ahead, else "behind you", a why line); three previews; Get my
  report (the waitlist before launch, ADR-167); a folded FAQ. May ship with the launch.

### The weekly letter (screen 6)
- Opt-in when Timeline starts: every week with something, only the big ones (outer
  planets, Saturn, an eclipse on a point), or off. Monday, from Railway on a schedule.
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
- With the coming-soon page, since it names sky dates: FAQ "Does it predict the future?"
  ("no dates for your life"), "Do I pay once or every month?", the home Pricing lede
  ("Timeline will be optional"), Method, Terms, ux-copy's date rule. The rest at switch-on.

## Out of scope
- Timeline for anyone but the reader until readers ask; pairs (MB-103); sharing (MB-104).
- Daily horoscopes, Moon-of-the-day content, push notifications; progressions, solar
  returns, Chiron, Lilith, asteroids, Placidus.
- Ask as therapy or coaching: it reflects, it doesn't counsel. Voice or images in Ask.

## Acceptance criteria
1. Every date and degree on a Timeline screen, email or reading comes from the engine
   for that profile; a test fails a reading that cites any other.
2. Exact dates match JPL Horizons to the hour for pinned fixtures (unit tests).
3. A profile without a horizon shows no angle, house or natal Moon contact anywhere.
4. Nothing is written for a day the doctrine leaves untouched; a quiet week sends nothing.
5. No reading predicts a life event, promises an outcome or answers the asked plan with
   do or don't; the checks log every attempt that did (`generation_failures`).
6. The end-of-report offer shows only on an owned Personal natal report, computed, once.
7. The free layer works without a subscription; a lapsed one keeps readings, stops new ones.
8. Cancelling takes two clicks; the letter stops in one. Prices live only in
   `catalogue.ts`; the gate test still passes.
9. Dry lab clean, a spot run before the Release; the finder matches the engine per fixture.
10. With `TIMELINE` off, no Timeline surface, route or email reaches a non-admin.
11. Ask never shows a chart or report its reader can't read; a test covers each access.

## The Owner's answers (2026-10-01)
1. Timing answers: **B**, astrology's reading with the reasons, never yes, no or a score.
2. Price: €9.99 a month, VAT included, no free trial; promotions only (v4).
3. When: **behind a switch**, off at production launch, built after R12; Ask becomes a
   chat; Life explains why it matters first; a coming-soon page for search.
4. Notes on v2: only you; quieter numbers on the cycle card; one consistent Now view;
   cap Ask by cost, no new tier; design the dashboard and the letter; explain the finder.
5. Notes on v3/v4: the dial, not a Gantt; Ask always visible with its own mark; sell Ask
   at the end of the report; coming soon as cards; why it matters first, tone colours; Life
   as a clearer chart with ages on top.
Claude's calls (the Owner may overturn any): the switch's form, coming soon first, the
name Ask, a partner for one day, the dashboard band, €69.99 a year, one free question,
the launcher inside reports, this week's dial free, rose #C46B78 for harder.

## Decisions to record (at /lock)
1. Timeline is the one subscription, only for an owner of a Personal natal report.
   Supersedes ADR-4 in part; amends §1 and §2 (daily horoscopes stay excluded).
2. R-5.2 amended: sky dates may be named, life dates never, no do or don't.
3. No horoscope for the day; Now and ahead is the moving dial, plain words before terms,
   tone by a fixed table (one new token, rose, for harder); content only on contacts.
4. The doctrine: bodies, aspects, orbs, mean node, Chiron out, whole sign, no-time rules.
5. The reader's own chart only (others wait for demand, pairs for MB-103). Life: waves,
   birth to 90, opens on four recognisable ages, look-back prompts.
6. Readings: a new prompt family, once per event per person, stored, tied to the report;
   any date or degree not computed blocks.
7. Sold after Closing on an owned report (dial, three questions, one free) and in the
   dashboard band, computed, once.
8. Free: dates, this week's dial, one question. Paid: readings, ranges, Ask, the letter.
9. €9.99 / €69.99, VAT included; no free trial; offers and trials only as dated
   promotions, the first 30 days after launch.
10. Ask: a chat in Timeline, asks back with cards, computed cards in answers, reads only
    what the reader can, no diagnosis or advice, a fixed harm reply, 50 a month; its own
    mark and a launcher on every screen.
11. Timing answers in style B: smoother, mixed or harder with reasons, never a score.
12. The weekly letter: opt-in, Monday, only in weeks that touch the chart.
13. `TIMELINE` off everywhere, admin sees it on staging; built after R12.
14. `/timeline` coming soon with the free finder, no switch, may ship with the launch;
    the date and subscription lines in FAQ, Pricing, Method and Terms change with it.
