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
- **The reading's prompt gets each stretch** (`spansOf`) with its dates, so its dates agree with the card.
- **Tone words (Q1, answered)**: Heavy · Mixed · Light, with a three-line legend wherever the tone colours show:
  "Heavy: asks more of you. Mixed: some push, some help. Light: goes your way." `tone.ts`'s table stays (MB-188).
- **Headlines agree with tone, by hand, no new test** (the Owner: "I don't want to invent new tests"): the `HEADLINES`
  rows for Light pairings are read and rewritten where they name only a strain ("More sensitive than usual" becomes
  "Softer, more open feelings"). The reading prompt gains: "On a Light time, say how it helps. On a Heavy time, say
  what it asks of you."
- **No "things"** in any Timeline line, fixed or written: `weekSentence`, counts, readings (prompt line) and Mira's.

### 3. Your week (notes 4, 5, 12)
- **Monday to Sunday** in the reader's zone, on the dashboard's Your week, Timeline's Week view and the readings.
- **One picture of the week** replaces the day cells and tone dots: a header of seven days (weekday, date, today lit as
  a column), then one row per transit in effect that week: tone dot, headline, "all week" or "starts Thu" / "ends Tue",
  and a bar across the days it is on, in its tone colour. A flat bar end means it carries on past the week; a tick marks
  the day it starts or ends. Rows: changes this week first, then Heavy, Mixed, Light.
- **Sentence** above it: "5 transits this week. 4 last all week. Short-fuse days ends on Tuesday." (count, then
  what changes, by name). A tapped row opens its line, its facts and "Read more in Timeline".
- Retrogrades count as transits here like contacts (today's dots count contacts only).
- On a desktop the dial with Play stays beside the picture; on a phone the picture comes first, the dial under it.
- Timeline's Week view opens with the same picture.

### 4. Life and cycles (notes 6, 7, 9, 10)
- **Drag through time**: the Today line on the waves graph is a handle; dragging it, or a slider under the graph,
  moves through birth to 90 with "age N · Mon YYYY" on the line. It snaps to the nearest cycle mark.
- **The card under the graph is the Your cycles card** (one component, also in the list below; the Owner).
- **The card's order** (information hierarchy): plain word and countdown ("A fresh start · in 4 years"); the name and
  an ⓘ; what the cycle is and how often ("Jupiter comes back to where it was when you were born. It takes 12 years.");
  For you: the reader's ages from `lifeCycles` (past dimmed, next bold) with "Next on 20 Nov 2030, at 35." under them;
  what it means for the reader, written at setup, long enough to need no Read more (60 to 110 words, the topics named);
  "Think back to <Month Year>, when you were N." last. `KNOWN_AGES` labels go.
- **ⓘ, the science**: the planet's degree, sign and house at birth, where it is on the cycle's exact date (degree,
  sign, house), and the close stretch with how many exact passes.
- **Bug: no look-back from the future.** "Think back to" uses only an occurrence before today
  (`now-ahead.ts:355-376`, `site/lib/finder.ts:33-46`); none, no line.
- **Past cycles** get a short paragraph (40 to 70 words). **Childhood**: the prompt gets the age, and before 16 the
  house in child's words (5th: play and making things, never romance). **Nodes reversed**: the facts say plainly the
  North Node is where the South Node was and that it is not a return. Prompt changes only, no new check. The reading
  basis gains "behind" or "ahead", so a cycle that passes is rewritten once, short.

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
- **What can change a written reading**: not the planets. A birth time added or changed, a new Timeline prompt
  version, or a rewritten Personal report; each rewrites only the readings it touches, in the background.
- Needs a job runner: none exists in `api/src` today. The round picks a Postgres-backed queue run in the API process.

### 6. Retrograde (note 11)
- The backward motion is real apparent retrograde (`dial.ts` reads `longitudeAt`/`speedAt` per day; Jupiter turns
  13 Dec 2026, Mars 10 Jan to 1 Apr 2027). The dial marks a planet going backwards with the birth chart's **R**,
  beside its dashed ring.
- **One line, always open, no X (Q4)**: "R · Retrograde. From Earth, the planet looks like it moves backwards for a
  few weeks. It doesn't really. Earth is passing it, the way a slower car seems to roll back when you overtake it."
- **Where it shows**: the report's wheel (beside the R) and each house card holding an R planet ("Saturn was
  retrograde when you were born."); the Timeline set-up screen; Your week under the dial when a planet in view is
  retrograde; the Timeline app's dial legend; /timeline under Mira's dial.
- The report's prose keeps the vocabulary's "turned inward" reading; nothing else in the brain changes.

### 7. The Personal report (notes 13, 14, 15, 17, 18)
- **Hero (bug)**: on the wheel itself, the east point is labelled like the bodies: "RISING", "Gemini 19.07°",
  "1st house (self)". The "East · rising, drawn facing south…" and "West · setting" text goes, at every width. The
  Ascendant marker's tick gets room (`AngleGlyph` at 22 px clips). The triad row under the ring stays on a phone.
- **Pins**: every tick-box item pins: Practice, What to do, How to use it, How to manage it, Practice this week, a
  pair's Next time and Try together. Three per report. Not pinned: an outline pin, grey. Pinned: a filled pin in the
  chart's yellow (brass; the Owner's call over web-taste's "brass is never a control"). Hover and the first pin say
  "Pinned items show on your dashboard." Fix with it: `mind.practice.*` are strings `itemAt` can't read, and Practising
  labels every pin "your Closing"; it names the chapter.
- **Report date**: "Written on <date>" under the hero, and "Report from <date>" on a person's row (`createdAt`;
  `HomePerson` gains it).
- **Houses prompt, no new test**: say what the reader does, never how they "come across"; remove the stale "HOUSES
  ALREADY COVERED" instruction (houses.ts:36).
- **Rulers**: rule 1 gains one exception: a planet named that is not in the house comes with one plain clause saying
  why ("Leo starts this house, and Leo's planet, the Sun, sits in your 4th"). A quiet house card gets back its small
  line: "No planets here · <Sign> starts this house · its planet, <Ruler>, is in your <Nth>".

### 8. Ask (note 16)
- **Named partner with a pair**: the plan quotes that Compatibility report's matching section first.
- **Named person with no pair**: after the answer, one card, once per person per conversation: "See <Name>'s side
  too", one reason, then the credits: "You have 5 credits. This uses 1." and "Write it"; at zero, "You have no credits
  left. One credit writes it." and "Get a credit". No price, no second ask.
- **Examples**: every idea Ask offers carries one everyday example, framed as an option ("for example"). No orders
  still (ASK_RULES). The 150-word cap stays.

## Out of scope
Stripe, prices on the live site, any pricing work (ADR-230, 242, 264). The Monday letter. Chiron in Timeline (MB-189).
New bundle names. Gift from Ask. The slow-planet Horizons table (MB-216).

## Acceptance criteria
1. A new account's dashboard shows the circle and three bundle buttons only; tapping Single reaches the birth form with
   one test credit, on staging, in two taps.
2. An admin without an own finished report sees no Ask button and no Your week.
3. A hard reload of `/dashboard` after 60 s idle shows the admin's own data on first paint, never the empty state.
4. No Timeline card prints a date without its year; the Owner's Pluto opposite Moon reads "to 2 Feb 2027" on the card
   and "back from 26 Aug to 8 Dec 2027" in Read more, and its reading names no other end.
5. Your week, 5 to 11 Oct 2026, on the Owner's chart: 5 rows, 4 "all week", Short-fuse days "ends Tue" with its tick.
6. No "Think back to" names a date after today (the Owner's Jupiter opposition at 64 looks back to June 2024).
7. After setup, opening any card in the six months or Life writes nothing and waits for nothing.
8. The Life line drags by pointer and by slider; the card under it is the Your cycles card, ⓘ opens the science.
9. The hero wheel prints "RISING · Gemini 19.07° · 1st house (self)" for the Owner's chart at 1440 px and 390 px.
10. Any tick-box item pins (filled yellow) and shows on the dashboard under its chapter's name.
11. The dry lab renders, per fixture, a node-opposition reading, a cycle before 16 and a Light reading; read by eye.
12. Ask, asked about a person with a pair, quotes the pair report; about one without, shows the card once with the
    reader's credit count.

## Screens
All on the artifact (version 2): Part 1 (empty dashboard, Account preview), Part 2 (card, legend, words), Part 3 (the
week picture, tappable), Part 4 (the life graph with its drag line and the cycle card), Part 5 (the set-up, playable),
Part 6 (the retrograde line with and without an X, and where it shows), Part 7 (hero wheel, pins, before and after),
Part 8 (Ask with and without credits).

## Open questions (each with its default)
1. Tone words: answered, Heavy · Mixed · Light with a legend.
2. Six-month refresh: written a week ahead, the drawing plays once (default; the Owner did not object).
3. Account before billing: answered, a marked preview.
4. The retrograde line: **always open, no X** (default), or under an ⓘ, or closable.

## Decisions to record
- The empty dashboard shows the circle and the bundles as buttons; no sample practice item. Supersedes part of review-01-10.
- Ask and Your week need Timeline access and a finished own Personal report.
- Timeline's week is Monday to Sunday, drawn as one row and bar per transit; day cells and tone dots go; no "things".
- Every Timeline date carries its year; a reading gets each close stretch.
- Tone words Heavy · Mixed · Light with a legend; Light headlines rewritten by hand; prose fixes go in prompts, not tests.
- Timeline readings are all written at setup from the engine's list; the next six months are written a week ahead.
- Life: a draggable time line; the card under it is the Your cycles card, ordered what, for you, meaning, look-back, ⓘ science.
- Look-backs only to the past; past cycles short; before 16, child's house words; nodes reversed stated in the facts.
- Retrograde is marked R on the dial and explained in one always-open line wherever an R shows.
- The hero wheel labels the Rising at the east point; the "drawn facing south" text goes.
- Every tick-box item can be pinned, three per report; filled yellow when pinned, outline when not.
- The report shows its date; report rule 1 allows one clause naming why a ruler belongs to a house.
- Ask reads a named partner's pair report first, offers a pair once with the reader's credits, and gives everyday examples.
- The admin's Account page is a marked preview of the subscriber's.
