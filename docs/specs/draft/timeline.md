# Timeline

Ideation 2026-10-01. Draft v2 with the Owner's answers, ready to lock; behind a switch, off
at launch. https://claude.ai/artifact/V93jKVXrQKQ8S4byLefuFE · picks up MB-26 and
"Later: the subscription" in `pricing-and-launch.md`.

Timeline is the one subscription, sold only to an owner of a Personal natal report.
It shows the sky moving across that chart: a life's long cycles, what touches the
chart now and ahead, and Ask, a chat about the chart, reports and timeline. No
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

### Life (screen 2)
- **It opens on why it matters**, before any planet row: four ages people already
  know, each a card with the reader's own date and a ring drawn from the chart (brass
  at birth, an arc to today). 29, the late-twenties reset (Saturn return); every 12,
  a fresh start (Jupiter); 19 and 37, a change of direction (the nodes); the early
  forties, the midlife shake-up (Uranus opposition). A card opens its cycle.
- One ribbon per person, a row per planet with one plain word (fresh starts, responsibility,
  direction, shake-ups, doubt and dreams, power). Bar: the in-orb window; brass tick: an
  exact pass; a line for today. Past cycles stay on it.
- A cycle opens a card: age, in-orb dates, exact passes, the point and its house
  (with its one word, ADR-98), the natal position, the sign season for Jupiter and
  Saturn, last time and next time, a one-line astronomy fact, and the reading.
- Repeating cycles carry a look-back prompt ("Think back to summer 2014"). A child's
  cycles are written for the parent about the child at that age (ADR-83).

### Now and ahead (screen 3)
- A six-month strip of the long contacts and retrogrades, then three ranges: this week,
  this month (a calendar: retrograde bands, a dot where something begins, peaks or ends)
  and six months grouped by month.
- Each item: dates, a computed title, degrees and house, and for long contacts,
  retrogrades and eclipses on a point, the reading. Anything else gets one line.

### Ask (screen 4)
- A chat about the reader's chart, their reports and their timeline, in their own
  words: a day that went wrong, a plan, a cycle, someone they've added. Part of Timeline.
- When it needs a date, a window or a person, it asks back with a card of tappable
  choices, like Claude's questions, then answers.
- Answers carry the same computed cards as the rest of Timeline (a day's contacts, a
  window's smoother, mixed or harder days, a cycle), so every number is the engine's.
  The model reaches the engine and the reports through tools, and quotes reports word
  for word. The fast sky, the Moon included, appears only here.
- It reads only what the reader can read (`access.ts`): their reports, reports shared
  with them, charts they made (R-3.6). Another person's report is quoted only if shared.
- It explains and reflects. It never diagnoses, never gives medical, legal or money
  advice, never says what someone will do, never says do or don't about the plan.
  A message about harm gets a fixed reply with where to get help, no astrology.
- Fair use: 200 messages a month, measured on staging, no counter on screen.
  Conversations are the reader's to delete; the privacy page names them.

### Readings (the brain, `api/src/prompts/timeline/`)
- A new prompt family: one reading per event per person, written the first time it
  is opened or when it enters the six-month view, then stored. Ask answers are written
  per message through tools. Inputs: the computed event, the per-chart brief and the reader's own
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
- Timeline: every reading, the three ranges, Ask, the weekly letter, for everyone on
  the account with a Personal natal report (one price, the family case).
- **Launch price** €7 a month or €49 a year, said as an increase announced, not a
  discount: "It goes up to €9 a month and €65 a year on [date]. Start before then and
  you keep the launch price as long as you stay." One dated catalogue row, the date
  printed once, no countdown (ADR-146's form). No "was" price: none was ever charged.
- Every Personal natal report comes with 30 days of Timeline, no card. They end on
  their own, said once at the start, one email a week before; nothing renews.

### The switch and the order of building
- `TIMELINE` in `packages/launch`, beside `LAUNCHED`, off everywhere. The admin sees
  Timeline on staging regardless, to work in it. Every Timeline surface (the offer, the
  dashboard line, the app routes, the letter, billing) sits behind it. On is a Release.
- Built after R12; R12 stays as planned. Production launches with the two reports.

### Coming soon on the site (screen 6, no switch)
- `/timeline`, prerendered like the other public pages (R-7.6), opening with an answer
  that names Stars Decoded (ADR-116): "When is your Saturn return?" A free finder takes
  a birth date and computes, in the browser with the engine, the Saturn returns, the
  next Jupiter return, the nodal returns and the Uranus opposition. Dates only.
- Then what Timeline will add (Life, Now and ahead, Ask) and Get my report, which opens
  the waitlist before launch (ADR-167). Its FAQ: what a Saturn return is, how long it
  lasts, whether it needs a birth time. It may ship with the launch.

### The weekly letter (screen 5)
- Opt-in when Timeline starts: every week with something, only the big ones (outer
  planets, Saturn, an eclipse on a point), or off. Monday, from Railway on a schedule.
- Sent only when something begins, peaks or ends in the chart that week. Facts and
  dates, the biggest event in the subject, the readings in the app, one-click stop.
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
- Live copy changes with the coming-soon page, since it names sky dates: FAQ "Does it
  predict the future?" ("no dates for your life"), "Do I pay once or every month?" and
  the home Pricing lede ("Timeline will be optional"), Method page, Terms, the ux-copy
  house rule on dates. The rest changes when the switch turns on.

## Out of scope
- Pairs on a timeline ("the two of you that week"), until MB-103; sharing one (MB-104).
- Daily horoscopes, Moon-of-the-day content, push notifications; progressions, solar
  returns, Chiron, Lilith, asteroids, Placidus.
- Ask as therapy or coaching: it reflects, it doesn't counsel. Voice or images in Ask.
- Timeline without a Personal natal report, or sold on its own from the landing page.

## Acceptance criteria
1. Every date and degree on a Timeline screen, email or reading comes from the engine
   for that profile; a test fails a reading that cites any other.
2. Exact dates match JPL Horizons to the hour for pinned fixtures (unit tests).
3. A profile without a horizon shows no angle, house or natal Moon contact anywhere.
4. Nothing is listed or written for a day the doctrine leaves untouched; a quiet week
   sends no letter.
5. No reading predicts a life event, promises an outcome or answers the asked plan with
   do or don't; the checks log every attempt that did (`generation_failures`).
6. The end-of-report offer shows only on an owned Personal natal report, computed, once.
7. The free layer works with no subscription; a lapsed subscription keeps its readings
   readable and stops new ones.
8. Cancelling takes two clicks; the letter stops in one. Prices live only in
   `catalogue.ts`; the gate test still passes.
9. Dry lab clean; a spot run of the Timeline family before the Release.
10. With `TIMELINE` off, no Timeline surface, route or email reaches a non-admin.
11. Ask never shows a chart or report its reader can't read; a test covers each access.
12. The finder's dates match the engine's for every fixture birth date.

## Screens
Artifact (v2), computed for the synthetic Mira and June Costa on 1 Oct 2026, text
marked Sample ours: 1 the end of the report and the dashboard line · 2 Life · 3 Now
and ahead · 4 Ask (a fight on Friday, a lease) · 5 the letter · 6 coming soon.

## The Owner's answers (2026-10-01)
1. Timing answers: **B**, astrology's reading with the reasons, never yes, no or a score.
2. Price: **B**, as a launch price.
3. When: **behind a switch**, off at production launch, built after R12; Ask becomes a
   chat; Life explains why it matters first; a coming-soon page for search.
Claude's calls at their defaults (the Owner may overturn any): the switch's form, the
coming-soon page first, the name Ask, Ask reads only what the reader can, 200 messages.

## Decisions to record (at /lock)
1. Timeline is the one subscription, only for an owner of a Personal natal report.
   Supersedes ADR-4 in part; amends §1 and §2 (daily horoscopes stay excluded).
2. R-5.2 amended: sky dates may be named, life dates never, no do or don't.
3. No horoscope for the day: content only where the doctrine touches the chart.
4. The doctrine: bodies, aspects, orbs, mean node, Chiron out, whole sign, no-time rules.
5. Life: birth to 90, past cycles kept, opens on four recognisable ages, look-back
   prompts, a child's readings written for the parent at the child's age.
6. Readings: a new prompt family, once per event per person, stored, tied to the report;
   any date or degree not computed blocks.
7. Sold after Closing on an owned report and on the dashboard card, computed, once.
8. Dates free with every report; readings, ranges, Ask and the letter paid.
9. Launch price €7 / €49, later €9 / €65 announced, kept by launch subscribers; 30 days
   with every report, no card, no renewal.
10. Ask: a chat in Timeline, asks back with cards, computed cards in answers, reads only
    what the reader can, no diagnosis or advice, a fixed harm reply, 200 a month.
11. Timing answers in style B: smoother, mixed or harder with reasons, never a score.
12. The weekly letter: opt-in, Monday, only in weeks that touch the chart.
13. `TIMELINE` off everywhere, admin sees it on staging; built after R12.
14. `/timeline` coming soon with the free finder, no switch, may ship with the launch;
    the date and subscription lines in FAQ, Pricing, Method and Terms change with it.
15. Pairs on a timeline wait for MB-103.
