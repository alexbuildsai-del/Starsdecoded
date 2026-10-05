# Review 05/10

Ideation 2026-10-05 with the Owner from the Notion page "Review 05/10": 20 notes on staging after R16, plus a 21st
in chat (no Cancel on the Account page). Artifact: https://claude.ai/artifact/TraYGaLqhLE1kx2cQBPzyc.
Status: **draft**. Touches `timeline` and `timeline-page` (cards, week, Life, readings, setup), `review-01-10`
(the empty dashboard, pins), `natal-report-pass-two` and R16-33 (the hero), `credit-loop` (the bundles) and Ask.
**Brain:** `prompts/timeline/reading.ts`, `prompts/sections/houses.ts`, `prompts/system.ts` (rule 1),
`prompts/ask/*`, `packages/engine` (`tone.ts` words, `plainWords.ts` headlines, `cycles.ts` labels). Dry lab in the round.
**Phone first**: every screen at 390 px before desktop. Every date and age on the artifact is computed from the
Owner's chart (23 Aug 1995, 23:45, Košice) on Monday 5 Oct 2026.

## Scope

### 1. First visit and access (notes 1 to 3, 21)
- **Empty dashboard** (no own finished report): the circle with "You", heading "Start with your own report", one
  line, and the three bundles as **buttons**. No sample practice item, no Ask, no second "Get credits" step.
  Supersedes the empty state's "one sample practice item" (review-01-10:63-64).
- **A bundle tap**: on staging it grants the test bundle (`POST /checkout/test`) and opens the birth form for "You";
  after launch it opens checkout (pricing's round, ADR-264). The credits sheet stays for readers with a report.
- **Ask and Your week need two things**: `timelineAccess(viewer)` **and** a finished own Personal report.
  `AskLauncher` and `timelineSlotOf` read both (today Ask reads access only).
- **Auth race (bug)**: `/dashboard` fires its queries before Clerk loads, gets the anonymous session's empty answers
  and caches them under user-agnostic keys for 30 s. Fix: queries wait for Clerk `isLoaded`, and keys carry the user id.
  Side finding to fix with it: the sign-in claim moves profiles only, so a pair made before sign-in loses its
  `relationships.user_id` and drops off the account.
- **"See the dashboard as a new visitor"**: one link in the admin menu; opens the dashboard in a fresh anonymous
  session, nothing of the admin's shown.
- **Account page for the admin (Q3)**: the subscriber's layout, marked "Preview · billing isn't on yet": next payment
  "set at launch", Manage payment, Cancel Timeline. Each opens its real step, ends in a line that billing is off, and
  changes nothing. Billing itself stays with pricing (ADR-264).

### 2. A Timeline card (notes 4, 5)
- **Face**: tone word, headline, the reading's line, the date with its year ("to 2 Feb 2027"), "Read more".
  "Read more" opens the reading, then the facts: planet, aspect, house, each close stretch with its years, exact dates
  with years. The planet line leaves the card face.
- **Dates always carry the year** on every Timeline card (drops `nearDate`'s rule of hiding it).
- **The reading's prompt gets each stretch** (`spansOf`) with its dates, not only the whole window, so its dates
  agree with the card.
- **Tone words (Q1)**: Heavy · Mixed · Light, with the legend line "Heavy asks more of you. Light goes your way.
  Mixed is a bit of both." The table in `tone.ts` stays (MB-188); only the words change.
- **Headline agrees with tone**: a test fails a Light headline that names only a strain. "More sensitive than usual"
  becomes "Softer, more open feelings"; every `HEADLINES` row is checked against its tones.

### 3. Your week (notes 4, 5, 12)
- **Monday to Sunday** in the reader's zone, on the dashboard's Your week, Timeline's Week view and the readings.
- **Day cells**: weekday, date, the number of things in effect, and a mark only on a day something starts (+N) or
  ends (−N). Tone dots go. Today has a white border. Cells are buttons; a tapped day shows its count line.
- **Under the strip**: "N things touch your Monday", one card in full (a start, end or exact that day first, else the
  heaviest), "N more today", "Open Timeline". Starting and ending cards carry a small tag.
- **Timeline's Week view** gets the same seven cells above the cards; a tapped day sets the dial and the cards.
- Retrogrades and eclipses count in the day number like contacts (today's dots count contacts only).

### 4. Life and cycles (notes 6, 7, 9, 10)
- **The waves graph is interactive**: tap or hover a mark → a box under the graph shows the cycle's plain word and
  name, the exact date or dates, the reader's age, and the close stretch. Earlier and Later buttons and the arrow keys
  step through marks. On a phone the graph scrolls sideways in its frame; the box stays.
- **The box is the cycle card**: the "Now and coming up" list stays below it, in the same order.
- **Bug: no look-back from the future.** "Think back to" uses only an occurrence before today
  (`now-ahead.ts:355-376`, `site/lib/finder.ts:33-46`); none, no line. A test with a cycle at 64 covers it.
- **The four age cards** say how often, then the reader's own ages from `lifeCycles`, past ones dimmed
  ("Every 12 years. Yours: 11 · 23 · **35** · 47 …"; nodes "18 · 37 · 55 · 74"). `KNOWN_AGES` labels go.
- **Card order**: plain word, name, the reading's line, date and age, then "Think back to <Month Year>, when you were N."
  last. No "Read more" wait: readings are written at setup (§5).
- **Past cycles** get one short paragraph (40 to 70 words), not a full reading. Ahead and under way keep 90 to 140.
- **Childhood**: a cycle before age 16 reads the house in child-safe words; the prompt gets the age and an
  instruction (5th house: play and making things, never romance). The reading prompt also gets today's date's side:
  "behind the reader" or "ahead", never the date itself (reading 4 stays). The basis gains the side,
  so a cycle that passes is rewritten once, short.
- **Fact check (bug)**: the 2004 "nodes reversed" reading says the North Node "returned to its birth point". A new
  check blocks a return named on a node-opposition reading and an opposition named on a return.

### 5. Setting up Timeline (note 9)
- **One screen right after Timeline starts**: the Timeline dial draws (chart, rings, planets placed one by one, then
  they move and the gold lines to the chart form). Six steps tick as their readings land: chart, planets, this week,
  this month, the next six months, life cycles birth to 90.
- **Everything is written at setup** from the engine's own event list: the six months (week and month included)
  and every life cycle. Owner's chart: 18 events, 45 cycles, about €0.07 at Luna's listed price (estimate, MB-70).
- **Past about a minute**: "Almost there. You can start reading this week now." and the reader goes in; the rest keeps
  writing. A failed reading shows the engine's headline and line, and "Read more" writes it then.
- **The next six months (Q2)**: written in the background a week before the stretch ends; the next visit after the turn
  plays the drawing once with "Your next six months are ready, <from> to <to>".
- **Security**: reading writes come only from the engine's list for that reader, so no write starts from a key the
  browser sends. Closes MB-219's first half; the daily cap stays.
- Needs a job runner: none exists in `api/src` today. The round picks a Postgres-backed queue run in the API process.

### 6. Retrograde explained (note 11)
- The backward motion is real apparent retrograde (`dial.ts` reads `longitudeAt`/`speedAt` per day; Jupiter turns
  13 Dec 2026, Mars 10 Jan to 1 Apr 2027). A "Did you know?" card shows once, the first time a planet turns while the
  dial plays: "Planets don't really go backwards…" (artifact Part 6). "Got it" hides it for good.

### 7. The Personal report (notes 13, 14, 15, 17, 18)
- **Hero (bug)**: the Sun, Moon and Rising row prints at every width, Rising with sign, degree and "1st (self)". The
  Ascendant marker's tick gets room in its box (`AngleGlyph` at 22 px clips).
- **Pins**: every tick-box item pins: Practice, What to do, How to use it, How to manage it, Practice this week, a
  pair's Next time and Try together. Three per report. First pin and hover say "Pinned items show on your dashboard."
  Fix with it: `mind.practice.*` are strings `itemAt` can't read, and Practising labels every pin "your Closing";
  it names the chapter.
- **Report date**: "Written on <date>" under the hero, and "Report from <date>" on a person's row (`createdAt`;
  `HomePerson` gains it).
- **Houses prompt**: no "come across as" (or "come off as", "seem to others"); say what the reader does. Remove the
  stale "HOUSES ALREADY COVERED" instruction (houses.ts:36).
- **Rulers**: rule 1 gains one exception: a planet named that is not in the house comes with one plain clause saying
  why ("Leo starts this house, and Leo's planet, the Sun, sits in your 4th"). A quiet house card gets back its small
  line: "No planets here · <Sign> starts this house · its planet, <Ruler>, is in your <Nth>".

### 8. Ask (note 16)
- **Named partner with a pair**: the plan quotes that Compatibility report's matching section first.
- **Named person with no pair**: after the answer, one card: "See <Name>'s side too", one reason, "Write it · 1 credit"
  (or "Get credits" at zero). Once per person per conversation. Spec timeline.md:99's Gift option stays for later.
- **Examples**: every idea Ask offers carries one everyday example, framed as an option ("for example", "could").
  No orders still (ASK_RULES). The 150-word cap stays.

## Out of scope
Stripe, prices on the live site, any pricing work (ADR-230, 242, 264). The Monday letter. Chiron in Timeline (MB-189).
New bundle names. Gift from Ask. The slow-planet Horizons table (MB-216).

## Acceptance criteria
1. A new account's dashboard shows the circle and three bundle buttons only; tapping Single reaches the birth form with
   one test credit, on staging, in two taps.
2. An admin without an own finished report sees no Ask button and no Your week.
3. A hard reload of `/dashboard` after 60 s idle shows the admin's own data on first paint, never the empty state.
4. No Timeline card prints a date without its year; a reading's dates match the card's stretches (unit test on the
   Owner's Pluto opposite Moon: to 2 Feb 2027, back 26 Aug to 8 Dec 2027).
5. The week is Monday to Sunday; on the Owner's chart, 5 Oct 2026 shows 5, 6 Oct shows 5 with −1, 7 to 11 Oct show 4.
6. No "Think back to" names a date after today (test at age 64).
7. After setup, opening any card in the six months or Life writes nothing and waits for nothing.
8. Every Life mark answers tap and keyboard with date, age and stretch.
9. The hero prints "Gemini 19.07° · 1st (self)" for the Owner's chart at 1440 px and 390 px.
10. Any tick-box item pins and shows on the dashboard under its chapter's name.
11. The dry lab renders a node-opposition reading and a cycle at age 9 for each fixture, and the new checks fire on a
    planted "returned to its birth point" and on "romance" before 16.
12. Ask, asked about a person with a pair, quotes the pair report; about one without, shows the card once.

## Screens
All on the artifact: Part 1 (empty dashboard now/proposed, Account preview), Part 2 (card now/proposed and the words
table), Part 3 (the week strip, tappable), Part 4 (the life graph, tappable, and cycle cards), Part 5 (the setup
animation, playable), Part 6 (the Did you know card), Part 7 (hero, pins, before and after), Part 8 (Ask).

## Open questions (each with its default)
1. Tone words: **Heavy · Mixed · Light** (default), or Hard · Mixed · Easy, or colour only.
2. Six-month refresh: **written ahead, shown once** (default), or the reader waits while it writes.
3. Account before billing: **a marked preview for the admin** (default), or as it is until Stripe.

## Decisions to record
- The empty dashboard shows the circle and the bundles as buttons; no sample practice item. Supersedes part of review-01-10.
- Ask and Your week need Timeline access and a finished own Personal report.
- Timeline's week is Monday to Sunday; day cells count things and mark starts and ends; tone dots go.
- Every Timeline date carries its year; a reading gets each close stretch.
- Tone words per Q1; headlines must agree with their tone.
- Timeline readings are all written at setup from the engine's list; the next six months are written ahead per Q2.
- Life's graph is interactive and holds the cycle card; look-backs only to the past; age cards print the reader's ages.
- Past cycles get a short paragraph; before 16, child-safe house words.
- Every tick-box item can be pinned, three per report.
- The report shows its date; the hero prints the Rising at every width.
- Report rule 1 allows one clause naming why an outside planet (a ruler) belongs to a house.
- Ask reads a named partner's pair report first, offers a pair once when there is none, and gives everyday examples.
- The admin's Account page is a marked preview of the subscriber's, per Q3.
