# R16 plan — Timeline, part one: the sky on the reader's own chart, readings and Ask, behind the switch; one triad row and /timeline for everyone

Planned 2026-10-03 on `claude/youthful-gauss-7snkqd` (`main` at 30b45b6, R14's report merged) for the locked spec `timeline` (ADR-205
to 217, locked 2026-10-01; artifact https://claude.ai/artifact/V93jKVXrQKQ8S4byLefuFE). **The lock never reached `main`**: the spec,
MASTERFILE 0.22's Timeline paragraph and its INDEX line sit on the unmerged branch `claude/tender-lovelace-ynaemg` (6d0733a); Round
start 2 lands them. **Order:** after R15, not beside it (next section). **Split:** Timeline is about forty cards, past R05's thirty-two
(two compactions) and the forty at which R10's planner split, so R16 builds what a subscriber gets, behind `TIMELINE`, with the pieces
the spec lets ship before it; R17 (outlined at the end) builds how it is sold and kept, on R15's Stripe seam. QA-02 (staging after R14)
has no sev-1, no Mailbox row is `blocking`, and no Owner comment sits on ADR-205 to 217 or on the Mailbox rows this plan touches.
**Tiers:** 21 Opus, 4 Sonnet, no Haiku. **Tags:** USER-FACING are R16-17, 18, 19, 23 and 24 (they reach production at the next
Release); every other card is INTERNAL, behind a switch that is off everywhere. **The brain changes** (four engine files, two prompt
families, two model jobs): the dry lab runs in the round and proves every natal and pair prompt unchanged, so no report's words change
(R-5.5 not triggered). **The schema changes** (R16-04). **The contract changes** (R16-06). **No new dependency.** No credential is
needed, nothing goes on GitHub, nothing generates in the session, and nothing reaches production in the round.

## Open Mailbox rows created more than 14 days ago (oldest first, ADR-186)
**2026-09-09:** MB-12 no error reporting or alerting · MB-19 no prompt version history · MB-20 the one e2e spec cannot pass, no lint
step · MB-21 variables missing from `.env.example` · MB-22 dead code left by the port · MB-30 the browser calls Nominatim and timeapi.io.
**2026-09-18:** MB-49 no API route can be unit-tested. None blocks a card. Touched here: MB-22 (`conversations` and `messages` are the
port's chat tables with no user; Ask gets its own and leaves them alone). No row counts rounds: a row's age is its Created time.

## Round number and order
R14 is the last round built (`R14-report.md`). R15 is pricing and launch by ADR-226 (locked); its plan file is still the deferred R11
body, to re-plan at its own /plan. ADR-217 (locked) builds Timeline after pricing and launch because it uses pricing's asking steps,
its ledger and Stripe, and ADR-226 keeps that order. So this round is **R16**, and it starts once R15 is merged. Beside R15 it would
also collide in `openapi.yaml`, the schema index, `bootstrap-db.sh`, `home.ts`, `limits.ts`, `routes/index.ts`, `reports.ts`,
`DashboardPage.tsx`, `ReportPage.tsx`, `App.tsx`, `faq.ts` and `TermsPage.tsx`. If R15's re-plan takes two rounds, this plan becomes R17
and its outline R18, card ids with it. R16-17, 18, 19, 23 and 24 need nothing from pricing, and ADR-211 and ADR-215 let them ship
before Timeline, so R15's /plan may take them if the Owner wants them at launch; the rest waits (ADR-217). **Approving this plan
queues R16 behind R15**; `/round R16` starts when R15 has merged.

## Round start (the orchestrator)
1. **R15 is merged**; branch `round/R16` from `main` with this plan's commit.
2. **The lock on `main`** (better now, with this plan's commit, so R15's planner sees it): `git checkout
   origin/claude/tender-lovelace-ynaemg -- docs/specs/locked/timeline.md`; MASTERFILE gains 6d0733a's §2 changes (the V1 exclusions
   line and the "After pricing and launch" paragraph, its "(R14)" read as R15 by ADR-226) as its next version; INDEX's Specs list
   gains the spec's line. ADR-205 to 217 are already recorded and locked; the round adds no Decisions row.
3. **Re-read the pinned shapes against `main` after R15** (the files in Risk 10). A shape R15 changed is re-pinned here before any
   builder starts; one that cannot be stops the round (R-0.1).
4. Builders cannot open claude.ai: extract the artifact's screens into the session scratchpad, phone first then desktop: the dial and
   Now and ahead (R16-13, 14), Life (R16-15), Ask's mark and chat (R16-16), the triad row and At a glance (R16-17, 23, 24), the
   coming-soon page (R16-18), Your week (R16-22), and any tone table (MB-188) or place for the ruler (reading 20) it shows. Where a
   builder's draft differs, the artifact wins and the report says so.
5. The dry lab's base: `git fetch origin report-lab/r06 && git checkout FETCH_HEAD -- fixtures/reports/` (never committed).
6. `curl -sS -o /dev/null -w '%{http_code}' https://ssd.jpl.nasa.gov/api/horizons.api` (200 from this planning session). If it is
   blocked when R16-01 starts, its Horizons test waits and the rest goes on. NASA's eclipse site is blocked from the sandbox, so
   R16-01 pins the two eclipse instants its card gives.

## What already shipped (checked at 30b45b6)
- **Met, and reused:** `@workspace/engine` on the server, in the browser and in the prerender (R11); Chiron from Horizons and
  `CHART_VERSION` 4 (R14); `isSelfFor`, `natalReportAccess`, `pairReadable` (`access.ts`); `recordSpend`, the spend gate and
  `spend_ledger`, `recordChecks` and `generation_failures` (R08, R13); `LIMITS` (R13); names as data (`data.ts`, ADR-202); the dry lab
  and its injection pass (`labDry.ts`); `promptDefaults.ts` and `prompt-families.ts` (natal, pair); `models.ts`; `packages/launch`;
  `useIsAdmin`, `readAppEnv`; `GET /home` (`buildHome`, `triadOf` with houses); `PLANET_RENDERS`, `AngleGlyph`, the one Sun (ADR-183);
  `NatalWheel`; `BirthDateField` (R14); the site's registry, prerender and crawl files, and axe over every sitemap page (R11, R13);
  `vercel.json` already sends `/dashboard/*` to the app; `testModel.ts` for a stubbed model.
- **Not met:** no transit, station, ingress, eclipse or life-cycle code; no `TIMELINE`; no Timeline or Ask prompt family, model job,
  table, route or screen; no scheduler (the letter is R17's); triad rows built four ways (`home-view.ts` `triadLines`,
  `pair-hero-layout.ts` `triadRows`, `ReportHero`, `SampleHead` and `TwoPlates`), both heroes printing "ruled by"; the FAQ, the Pricing
  lede and Terms say there is no subscription, and the FAQ that the report names no dates.
- **Found while planning:** (1) the unmerged lock (Round start 2); (2) the spec's own condition for Chiron is met by R14 (MB-189);
  (3) the spec gives no tone table (MB-188) and no model for readings (MB-190); (4) Horizons answers and NASA's eclipse site does not;
  (5) `catalogue.ts`'s header still says offers wait "until R13" (R15's to fix).

## Where the specs disagree, and how this plan settles it
1. **The spec's "after pricing and launch (R14)"** → ADR-226 moved pricing to R15; this is R16, after it.
2. **MASTERFILE §2 excludes transits and subscriptions** → ADR-205 (later) makes Timeline the one exception, off at launch; the lock's
   paragraph lands at Round start 2; §1, §2's exclusions, R-5.2 and R-6.1 change at Timeline's Release, as the spec says.
3. **§9: the dashboard's one visual is its circle** (ADR-89 to 96) → ADR-211 (later) adds Your week's dial, for a subscriber only; it
   draws planet renders, never a Unicode glyph.
4. **R12's "the Rising never shows a house"** (`home.ts`) → ADR-211's "1st (self)": the web prints it; the stored triad is unchanged.
5. **Chiron "excluded until it has a real ephemeris"** against ADR-221's table → it stays out until the Owner adds it (MB-189).
6. **Ask's model in the spec's cap note** (two gpt-5.2 calls) against ADR-184 (Luna writes every other prose call) → MB-190.
7. **"With the coming-soon page: … Terms"** against Terms describing a subscription nobody can buy yet → one sentence changes now; the
   subscription's terms come with billing in R17, once MB-114's check covers recurring billing.
8. **"Someone … never stored"** against a chat that keeps its history → a person card is kept as who and which day and computed when
   shown, only while the reader can still read them (MB-191).
9. **"Exact dates match JPL Horizons to the hour"** against hits near a station, where arcseconds move the hour → the pinned fixtures
   sit away from stations; stations and eclipses carry their own tolerances (R16-01).

## Goals
1. **The engine computes the sky against the reader's own chart** (ADR-208, 209): places with no horizon sweep, exact hits to the
   minute and to Horizons' hour, windows, stations, ingresses, eclipses, the doctrine's events and their tone, and life cycles from
   birth to 90 with their waves (acceptance 1 to 3).
2. **Readings and Ask on the brain** (ADR-206, 210, 213): a new prompt family written once per event and stored, blocked on an
   uncomputed date or degree, a predicted life event or a do-or-don't; Ask as a chat with tools that reads only what the reader can
   read, with a fixed harm reply and 50 messages a month; both in the dry lab (acceptance 4, 8, 10).
3. **Timeline behind `TIMELINE`**, off everywhere and the admin's on staging (ADR-207, 211, 215): Now and ahead on the moving dial,
   Life, Ask in the corner of the dashboard, Timeline and the reader's reports, and Your week after Your circle from one more
   `GET /home` field (acceptance 9).
4. **For everyone** (ADR-211): "At a glance ›" under the reader's name in the circle, and one triad row everywhere with the ruler moved
   into the report.
5. **`/timeline` coming soon with its free finder**, no switch, and the copy that changes with it (ADR-215; spec, Rules and copy).

## Preconditions
1. Builders read MASTERFILE §0, their card, the spec sections and pinned shapes it names, and Round start 4's screens.
2. **Single owners.** Each card's files as listed, no file in two cards of a group. `packages/engine/src/index.ts` → R16-01;
   `vercel.json` → the orchestrator (`csp:write` once after group B); `.claude/skills/ux-copy/SKILL.md` → R16-19.
3. Inside a group a card may land before one it imports from (pinned shapes): the orchestrator accepts a red intermediate until the
   group ends, and every group ends green. A builder who needs a pinned shape changed stops (R-0.1).
4. **No card spends or reaches a network.** The model is stubbed (`testModel.ts`); only R16-01 reads Horizons, by hand, and commits
   the values; walks run on a scratch Postgres. **No new dependency:** a builder who needs a package stops and reports.
5. Provisional seams: `// MB-188 provisional` (`tone.ts`), `// MB-190 provisional` (`models.ts`), `// MB-191 provisional` (`ask.ts`,
   `timelineReadings.ts`); `doctrine.ts` names MB-189 where Chiron stays out. Code cites ADR-205 to 217 where it follows them.
6. **The promoted rule** (`lessons.md`, ADR-195): before changing a shared export, a pinned value or what a function may return, grep
   every caller; a caller outside the card's files is named in its report, never left on the old shape.
7. One push per group and one per fix (MB-187, R14's lesson). A builder commits as it goes (R13's lost run).

## Readings pinned where the spec is silent
1. **The app page** is `/dashboard/timeline` (noindex, already sent to the app by `vercel.json`); `/timeline` is the public page.
2. **The reader** is the viewer's self profile (`isSelfFor`) with a complete Personal report they can read; Timeline reads its stored
   chart (R-4.5). Without one, the Timeline routes answer 409 `no_personal_report` and the page says how to get one.
3. **Open and entitled.** Open: `TIMELINE` on, or the admin (`ADMIN_USER_ID`) where `APP_ENV` is not production. Entitled: open and
   the admin, until R17 adds subscribers. Every Timeline route, field and surface is entitled-only; anyone else gets the 404 every
   unknown path gets, so with `TIMELINE` off nothing reaches a non-admin or production (acceptance 9). `/timeline`, the coming-soon
   page, is not one: it has no switch (ADR-215).
4. **Days** are the reader's: the browser's IANA zone sent as `tz` and validated, else the profile's birth zone. Week is 7 days from
   today, month 30, six months 182. Timeline prints dates in the reader's language order and no clock time (QA-02 #5).
5. **Event keys**, URL-safe and at most 80 characters: `{kind}.{body}.{aspect|-}.{target|-}.{yyyymmdd}`, the date a contact first
   perfects (its window's start when it never does), a retrograde's station, an eclipse's day; a cycle is `cycle.{id}.{yyyymmdd}`.
6. **Windows are whole.** A search runs from the range's start less a margin to its end plus one (Mars 60 days, Jupiter a year,
   Saturn 18 months, the outer three 3 years), so a window's start, end and passes are real.
7. **What gets a reading** (ADR-207, 210): contacts, retrogrades crossing a known house, eclipses within 3° of a natal point, and life
   cycles. Written on first open, and when a contact enters the six-month view (that view queues at most three per call); a quiet range
   writes nothing (acceptance 3).
8. **The basis** of a reading is `{CHART_VERSION}:{birth time or none}:{window minutes}:{TIMELINE_PROMPT_VERSION}`; a reading whose
   basis no longer matches the chart is written again on its next open.
9. **Plain words come from code.** A headline and an everyday line per event from one table ("Saturn is crossing your Ascendant"),
   never a model; once written, the reading's own line replaces the everyday line. Words through `/ux-copy`.
10. **A reading builds on the report**: the target's house card when the chart has a horizon, else the chapter whose stored claims cite
    the target most, else nothing; computed in code. Its excerpts are those passages, at most three of 120 words.
11. **Models** (MB-190): readings `gpt-6-luna`, Ask `gpt-5.2`, as jobs in `models.ts`.
12. **Ask's tools are ours.** Call one plans (intent, tools, choices); the server computes the tools; call two writes the text and
    names the cards it shows; no function calling. Quotes are inserted by the server, word for word, never written by the model.
13. **The cap**: 50 reader messages a UTC calendar month, a tapped choice included; `left` is null above 10; at 0, 429 `ask_cap` with
    the date it resets.
14. **What Ask reads**: reports the reader can read (`natalReportAccess`, `pairReadable`); another person only through a Compatibility
    report the reader can read, for the day asked about. The Moon's sign and phase appear only in Ask's day card ("The Moon appears
    only here").
15. **What Ask keeps** (MB-191): 31 days; a person card as who and which day; gone with the reader's Personal report. Nothing the
    reader types reaches a log (ADR-201).
16. **A message sent from a report page** carries that report's id, read only if the reader can read it.
17. **Tone** (MB-188): the table as the row recommends; a day takes the tone most of its contacts hold, a tie to the more intense; a
    day with none is quiet. Tone is never a score.
18. **The dial** draws Mercury to Pluto, eight tracks (the Sun is not a Timeline body, the Moon never on the dial), the natal chart
    inside with its Ascendant east on the left, framed on 0° Aries without a horizon; bodies are planet renders (§9).
19. **Life's look-back** names a month and year ("Think back to July 2014"): a season needs the hemisphere the reader lives in.
20. **One triad row**: the real icon, label, sign, degrees (IBM Plex Mono, two decimals), house with its word; a known Rising reads
    "{sign} {degrees}° · 1st (self)"; no triad row prints a ruler. **The ruler moves to the 1st house card** unless the artifact puts
    it elsewhere.
21. **The finder** takes a birth date only and computes in the browser at 12:00 UTC of that date; it shows month and year (a date
    alone cannot time a pass near a station to the day), passes as a span; the engine loads on the first full date, never at render, so
    the prerender sees no suspense; nothing typed leaves the browser.
22. **The copy with the coming-soon page** stays true before Timeline is sold: reports are paid once; Timeline, coming soon, will be the
    one subscription; no dates for your life.
23. **Your week** sits between Your circle and What you're practising; the invitation (after Share) and the why card are R17's.
24. Copy and layout no spec words pass `/ux-copy` and `/web-taste` (ADR-117); each builder lists its new strings for the Owner's look.

## Pinned shapes
- **Engine, `transits.ts`** (R16-01). `SkyBody` = sun | moon | mercury | venus | mars | jupiter | saturn | uranus | neptune | pluto |
  north_node. `longitudeAt(body, at): number` (apparent geocentric ecliptic longitude of date, the mean node for north_node, no
  horizon); `speedAt(body, at): number` (degrees a day, negative retrograde); `exactHits(body, target, from, to): Date[]`; `InOrb {
  start; end; exact: Date[] }`, `inOrb(body, target, orb, from, to): InOrb[]`; `Station { body; at; turns: retrograde | direct; lon }`,
  `stations(body, from, to)`; `Ingress { body; at; sign; retrograde }`, `ingresses(body, from, to)`; `Eclipse { kind: solar | lunar;
  at; lon }`, `eclipses(from, to)`.
- **Engine, `doctrine.ts` and `tone.ts`** (R16-02). `Aspect` = conjunction | square | opposition | trine; `NatalTarget` = sun | moon |
  mercury | venus | mars | jupiter | saturn | ascendant | midheaven; `ContactEvent { key; kind: contact; body; aspect; target; orb;
  window: InOrb; house: number | null; tone }`; `RetrogradeEvent { key; kind: retrograde; body: mercury | venus | mars; start; end;
  houses: number[]; tone }`; `EclipseEvent { key; kind: eclipse; eclipse; house: number | null; near: { target; orb } | null; tone:
  Tone | null }`; `SkyEvent`; `skyEvents(chart, from, to): SkyEvent[]`; `inEffect(events, day)`; `readsAs(event): boolean`;
  `DOCTRINE`. `Tone` = easy | mixed | intense; `TONE_TABLE`; `toneOf(event)`; `dayTone(events): Tone | null`.
- **Engine, `lifeCycles.ts`** (R16-03). `CycleId` = jupiter-return | jupiter-opposition | saturn-return | saturn-opposition |
  saturn-square | node-return | node-opposition | uranus-return | uranus-opposition | uranus-square | neptune-square | pluto-square;
  `NatalLongitudes` = Partial<Record<SkyBody, number>>; `natalLongitudes(chart)`; `LifeCycle { key; id; body; age; window: InOrb;
  repeats }`; `lifeCycles(natal, birth, untilAge = 90)`; `KNOWN_AGES`; `Wave { body; points: { age; distance }[] }`; `waves(natal,
  birth, untilAge = 90)`.
- **Schema** (R16-04). `timeline_readings { id text PK; user_id text NOT NULL; profile_id text NOT NULL; event_key text NOT NULL;
  basis text NOT NULL; status text NOT NULL (writing | ready | failed); reading jsonb; model text; created_at, updated_at timestamptz
  NOT NULL DEFAULT now() }`, unique (profile_id, event_key), index (user_id). `ask_messages { id text PK; user_id text NOT NULL; role
  text NOT NULL (reader | ask); body jsonb NOT NULL; created_at timestamptz NOT NULL DEFAULT now() }`, index (user_id, created_at).
  `GenerationFailureKind` and `SpendKind` gain `timeline` and `ask`.
- **Contract** (R16-06; operationIds in brackets). `Tone`; `TimelineRange` = week | month | six-months; `ReadingStatus` = none | writing
  | ready | failed. `TimelineEvent { key; kind: contact | retrograde | eclipse; body; aspect: string | null; target: string | null;
  houses: integer[]; start; end; exact: date-time[]; orbNow: number | null; tone: Tone | null; headline; line; reading: ReadingStatus
  }`. `NatalPoint { body; lon: number; house: integer | null }`; `Angles { ascendant: number; midheaven: number }`. `TimelineNow {
  range; from: date; to: date; zone; blind; natal: NatalPoint[]; angles: Angles | null; days: { date; tones: Tone[] }[]; events:
  TimelineEvent[]; next: { key; at; change: starts | peaks | eases }[] }`. `LifeCycleView { key; id; body; name; word; age: number;
  exact: date-time[]; start; end; past; repeats; lookBack: string | null; reading: ReadingStatus }`. `TimelineLife { ages: { id; age;
  last: date-time | null; next: date-time | null; progress: number }[]; cycles: LifeCycleView[]; waves: { body; points: { age; distance
  }[] }[] }`. `TimelineReading { key; line; body; buildsOn: { kind: house; house } | { kind: chapter; chapter } | null; writtenAt }`.
  `OpenedReading { status: ready | writing | failed; reading: TimelineReading | null; line: string | null }`. `TimelineState { open;
  entitled; hasPersonalReport }`. `Week { headline: string | null; natal: NatalPoint[]; angles: Angles | null; days: { date; tones:
  Tone[] }[]; on: TimelineEvent[] }`. `AskCard` = day { date; events; moon: { sign; phase } } | window { from; to; days: { date; tone:
  Tone | null }[] } | cycle { cycle } | quote { reportId; reportName; section; text } | person { name; date; events }. `AskChoice { id;
  label; kind: date | window | person | report }`. `AskMessage { id; role: reader | ask; text; cards: AskCard[]; choices: AskChoice[];
  createdAt }`. `AskThread { messages; left: integer | null }`. `SendAskBody { text? (1 to 500); choiceId?; reportId? }`, one of text or
  choiceId. Paths: `GET /timeline/state` [getTimelineState] 200 or 404; `GET /timeline/now?range&tz` [getTimelineNow] and `GET
  /timeline/life?tz` [getTimelineLife], each 200, 404 or 409; `POST /timeline/readings/{key}` [openTimelineReading] 200 `OpenedReading`,
  404, 429, 503; `GET /ask` [getAskThread]; `POST /ask` [sendAskMessage] 200, 400, 404, 429 (a limit or `ask_cap`), 503. `GET /home`
  gains `tz?` and `Home.week?: Week | null`.
- **Server.** `timelineGate.ts` (R16-05): `timelineOpen(viewer, env?)`, `timelineEntitled(viewer, env?)`, `requireTimeline`.
  `timeline.ts` (R16-09): `ReaderChart { userId; profileId; reportId; chart; blind; zone; birth; basis }`, `readerChart(viewer)`,
  `nowView(reader, range, tz, statuses, now?)`, `lifeView(reader, tz, statuses, now?)`, `weekView(reader, tz, now?)`,
  `eventByKey(reader, key, now?)`, `headlineOf(event)`, `everydayLineOf(event)`. `timelineReadings.ts` (R16-08):
  `readingStatuses(profileId, keys)`, `openReading(reader, key)` → ready with the reading | writing | failed with a line | unknown,
  `queueReadings(reader, keys, max = 3)`, `forgetTimeline(userId, profileId)`. `prompts/timeline` (R16-07):
  `TIMELINE_PROMPT_VERSION = "t1"`, `ReadingInput { event; brief; excerpts: { source; text }[]; name; blind }`, `ReadingSchema`,
  `readingPrompt(input, override?)`, `checkReading(output, input)`, `TIMELINE_PROMPTS` (its default rows). `prompts/ask` (R16-10):
  `ASK_PROMPT_VERSION = "a1"`, `askPlanPrompt`, `askAnswerPrompt`, `AskPlanSchema`, `AskAnswerSchema`, `checkAskAnswer`, `HARM_REPLY`,
  `OFF_TOPIC_LINE`, `FALLBACK_LINE`, `capLine(resetsOn)`, `ASK_PROMPTS`. `ask.ts` (R16-11): `ASK_MONTHLY_CAP = 50`,
  `askThread(viewer)`, `sendAsk(viewer, body)`.
- **Web.** `useTimelineState()` (R16-05) → `{ open; entitled; hasPersonalReport; loading }`. `index.css` (R16-13): `--sd-rose` and
  `.sd-tone-easy`, `.sd-tone-mixed`, `.sd-tone-intense`. `Dial({ natal, angles, events, range, day, onDay, playable, size? })` (R16-13).
  `ContactCard({ event, onOpen })`, `ReadingSheet({ eventKey, open, onClose })` (R16-14). `CycleCard({ cycle, onOpen })`, `AgeRing({
  age, progress, label })` (R16-15). `AskLauncher({ reportId? })` (R16-16). `TriadRow({ rows, compact? })`, `triadRowsOf(triadOrChart,
  options?)` (R16-17).

## Parallel groups
**Group A**, one message: R16-01 to R16-06; R16-02 and R16-03 build on R16-01's pinned functions. **Group B**, one message once A is
green: R16-07 to R16-19, the server's brain and the web's pieces; inside it R16-08 calls R16-07 and R16-09, R16-10 registers R16-07's
family, R16-11 calls R16-09 and R16-10, R16-12 renders R16-07 and R16-10, R16-14 draws R16-13, R16-15 opens R16-14's sheet, R16-16
shows R16-14's and R16-15's cards, and R16-18 shows R16-13's dial and R16-15's ring, all on pinned shapes. Then the orchestrator runs
`csp:write` once. **Group C**, one message once B is green: R16-20 to R16-24, the routes and the screens' wiring. **Group D**: R16-25.
Then the gate. **If R16 must shrink**, R16-24 and R16-19 go to R17 first, then R16-18 with them; nothing behind the switch is cut,
since R17 builds on it.

---

## Group A — the engine, the tables, the switch, the contract

### R16-01 — The sky search: any body's place at any instant, and when it reaches a point (INTERNAL)
Tier: opus — the brain's engine: every date Timeline shows rests on it
Objective: a local, free search over the sky with no horizon sweep (MB-125's path), to the minute, matching JPL Horizons to the hour.
Files: new `packages/engine/src/transits.ts`, `transits.test.ts`, `transits.horizons.test.ts`; `packages/engine/src/index.ts` (exports
this file and R16-02's and R16-03's).
Refs: spec The engine; ADR-208, 221; acceptance 1, 2; MASTERFILE §1, R-4.1; readings 5, 6; pinned engine shapes.
Done when:
- `longitudeAt` matches `calculateNatalChart`'s place for every body of every fixture at its birth instant within 0.01°, the mean node
  too, with no horizon computed; `exactHits` scans daily and bisects to the minute; `inOrb` returns whole windows, passes a retrograde
  splits merged with several exact dates; stations, ingresses and eclipses come from astronomy-engine's own searches.
- `transits.horizons.test.ts`: five exact hits from 2026 to 2032 (Mars, Jupiter, Saturn, Uranus, Pluto, none within ten days of a
  station) on natal points of `marie-curie` and `audrey-hepburn`, each pinned to the hour Horizons' hourly longitudes (quantity 31,
  the Chiron script's query, in a comment) cross; the engine lands within an hour. Eclipses within 15 minutes of NASA's greatest
  eclipse (lunar 2026-03-03 11:33 UT, solar 2026-08-12 17:46 UT). Nothing fetches at test time; no Node API, so the browser bundles it.

### R16-02 — The doctrine: which sky events touch the chart, and their tone (INTERNAL) — provisional MB-188
Tier: opus — the brain: the doctrine decides everything Timeline may talk about
Objective: from a chart and a range, every event the doctrine names with its tone, and nothing it leaves out.
Files: new `packages/engine/src/doctrine.ts` (+ test), new `packages/engine/src/tone.ts` (+ test).
Refs: spec The engine (Doctrine, Chiron, No birth time), Now and ahead (tone); ADR-207, 208; R-4.6; MB-188, MB-189; readings 5 to 7,
17; pinned engine shapes.
Done when:
- `skyEvents`: Jupiter, Saturn, Uranus, Neptune and Pluto to the nine natal points by conjunction, square, opposition and trine within
  2° (Jupiter, Saturn) or 1.5° (the outer three); Mars by conjunction, square and opposition at 1°; Mercury, Venus and Mars retrogrades
  with the whole-sign houses they cross; every eclipse with its house, `near` only within 3°. Sextiles, the Moon's moves, minor bodies
  and Chiron (MB-189) make nothing.
- No horizon: no Ascendant, Midheaven or natal Moon target and no house; `readsAs` as reading 7; keys as reading 5, the same across
  two overlapping ranges.
- `TONE_TABLE` as MB-188 recommends (`// MB-188 provisional`), `dayTone` as reading 17; tests on `marie-curie`,
  `marie-curie-unknown` and `audrey-hepburn` from 2026 to 2028.

### R16-03 — Life cycles from birth to 90, and the waves (INTERNAL)
Tier: opus — the brain: Life's ages and dates are computed here
Objective: every life cycle the doctrine names, with ages and dates, from a chart or from a birth date alone (the finder).
Files: new `packages/engine/src/lifeCycles.ts` (+ test).
Refs: spec The engine (Life cycles), Life; ADR-208, 209; acceptance 2, 8; readings 5, 6; pinned engine shapes.
Done when:
- `lifeCycles`: the returns and oppositions of Jupiter, Saturn, the mean nodes and Uranus, Saturn's and Uranus's squares, Neptune's
  and Pluto's squares, birth to 90, windows at the doctrine's orbs (the node at 1°), passes a retrograde splits merged with several
  exact dates, ages to one decimal; `KNOWN_AGES` holds the Saturn return, Jupiter return, node return and Uranus opposition.
- `waves`: each of those six bodies' distance from its natal place, monthly, 0 at a return and 180 opposite.
- From a birth date alone at 12:00 UTC the cycles match the chart's to the month for every fixture (the finder's ground); tests on
  `marie-curie` (born 1867) and `oprah-winfrey`.

### R16-04 — The tables for readings and Ask (INTERNAL)
Tier: opus — schema, run by every deploy's bootstrap
Objective: the two tables R16 writes, in place before any route reads them, created idempotently.
Files: new `packages/db/src/schema/timeline.ts`; `packages/db/src/schema/index.ts`, `generationFailures.ts`, `spendLedger.ts`; new
`packages/db/scripts/migrate-add-timeline.ts`; `scripts/bootstrap-db.sh` (a step after 3l, its comment saying why).
Refs: pinned schema; MASTERFILE R-7.3, §3; ADR-210, 213; MB-123, MB-191; reading 8.
Done when:
- Both tables and their indexes exist as pinned, in drizzle and in the script (`IF NOT EXISTS` throughout); `GenerationFailureKind`
  and `SpendKind` gain `timeline` and `ask` with no DDL, every caller grepped (Preconditions 6).
- On a scratch Postgres 16 with a dummy `OPENAI_API_KEY` (MB-80): `db:bootstrap` from `main`'s tree, then this branch's twice, then
  an empty database twice; each run clean, step 2 applying nothing after the script; `packages/db` tests green.

### R16-05 — The switch: `TIMELINE`, off everywhere, the admin's on staging (INTERNAL)
Tier: opus — access: who may reach a route, on which host
Objective: one constant decides whether Timeline exists for a viewer; with it off, nothing reaches anyone but the admin off production.
Files: `packages/launch/src/index.ts`; new `api/src/lib/timelineGate.ts` (+ test); new `web/src/lib/timeline-gate.ts` (+ test).
Refs: spec The switch; ADR-215, 217; acceptance 9; `labGuard.ts` (how the admin is known), `appEnv.ts`; reading 3; pinned shapes.
Done when:
- `TIMELINE = false` beside `LAUNCHED`, its comment naming ADR-215 (on is a Release).
- `timelineOpen` and `timelineEntitled` as reading 3; `requireTimeline` answers the 404 body every unknown path gets; tests over
  every combination of switch, host and viewer (signed out, a reader, the admin).
- `useTimelineState` reads `getTimelineState` once per signed-in user (React Query, keyed by user, none when signed out), a 404
  meaning closed; tests with a stubbed client.

### R16-06 — The contract and codegen (INTERNAL)
Tier: opus — the contract spans three packages and every Timeline surface reads it
Objective: every shape R16's routes answer, in `openapi.yaml`, with the client and zod regenerated.
Files: `packages/api-spec/openapi.yaml`; `packages/api-client-react/src/generated/**`, `packages/api-zod/src/generated/**` (codegen).
Refs: pinned contract; MASTERFILE R-7.2; ADR-207, 209 to 213, 215; MB-191.
Done when:
- Every pinned schema, path, response and operationId is in the spec with a one-line description naming its ADR (and its MB where
  provisional); every change is additive (`Home.week` optional and nullable, `GET /home`'s `tz` optional), so no other file breaks.
- `pnpm --filter @workspace/api-spec run codegen`, then typecheck green with no other file changed; a second codegen leaves no diff.

---

## Group B — the brain and the server's view; the web's pieces; the coming-soon page

### R16-07 — Readings: the timeline prompt family and its blocking checks (INTERNAL)
Tier: opus — the brain: a new prompt family and the checks that block it
Objective: a reading of one event in the coffee voice, from the computed event, the brief and the reader's own report, that never
dates the reader's life, predicts, or says do or don't.
Files: new `api/src/prompts/timeline/` (`index.ts`, `reading.ts`, `doctrine.ts`, `checks.ts`, `timeline-prompts.test.ts`);
`api/src/prompts/checks.ts` (RULES); `api/src/prompts/data.ts` (a `quote` label); `docs/annex/pair-reliability-checks.md` (new rows).
Refs: spec Readings; ADR-81, 202, 206, 210; R-4.3, R-5.1, R-5.3; amended R-5.2 (quoted in the prompt); readings 9, 10; pinned shapes.
Done when:
- `readingPrompt`: the system holds the style contract, ADR-206's sentence and the family's doctrine; the user holds the event's
  computed facts, the brief and the excerpts, every name and excerpt inside a data block; `ReadingSchema` is strict: `line` (at most
  20 words) and `body` (90 to 140 words); `TIMELINE_PROMPTS` gives its default rows.
- `checkReading` blocks a date or degree the event did not compute, a predicted life event and a do or a don't, each a RULES row and an
  annex row of class block; style faults are fixed or logged as the natal checks do. `DATA_RULE` is unchanged, so every natal and pair
  prompt renders as before.
- Tests: a clean reading passes; each blocking case fails with its rule id; a hostile name stays inside its block.

### R16-08 — Readings written once, stored, gated and logged (INTERNAL) — provisional MB-191
Tier: opus — the brain's call path, spend and personal data
Objective: a reading is written when first opened or when its event enters the six-month view, once per event per person, and kept.
Files: new `api/src/lib/timelineReadings.ts` (+ test).
Refs: spec Readings; ADR-84, 199, 210; R-4.3; MB-191; readings 7, 8, 10; pinned shapes of R16-07 and R16-09.
Done when:
- `openReading` resolves the key through `eventByKey` (not found or not read: `unknown`); a stored reading whose basis matches is
  returned; else it claims the row as `writing` (a second open answers `writing`; one writing past five minutes is retried) and writes
  through the report's call path: `MODELS.timelineReading` at its pinned effort, strict output, every error carried into one retry and
  one more round alone, `recordSpend("timeline", …)` per call, `recordChecks` per attempt; a failed row keeps its line.
- Excerpts and `buildsOn` follow reading 10; `queueReadings` writes at most three missing readings per call, earliest first, behind
  the spend gate; `readingStatuses` maps keys; `forgetTimeline` deletes a profile's readings and its user's Ask thread.
- Tests with the model stubbed: one write across two concurrent opens; a stale basis rewrites; a paused day writes nothing; a blocked
  attempt is logged with its rule.

### R16-09 — The Timeline view on the server (INTERNAL)
Tier: opus — it turns the engine into what every Timeline surface prints, and dates must be the engine's
Objective: from the viewer's own chart, Now and ahead, Life and the week, in plain words, with no model call.
Files: new `api/src/lib/timeline.ts` (+ test).
Refs: spec Now and ahead, Life, Where it is sold (Your week); ADR-207, 209, 211; R-3.6, R-4.5, R-4.6; readings 2, 4 to 9; pinned shapes.
Done when:
- `readerChart` finds the viewer's self profile with a complete Personal report they can read and its stored chart, recomputed and
  cached when its version is old (R-4.5); `null` without one.
- `nowView`, `lifeView` and `weekView` give the pinned contract types for a range in the reader's zone: whole windows, the headline
  and everyday line from one table of plain words, tones and each day's mix, what starts, peaks or eases next, the no-time flag,
  reading statuses as passed in; `eventByKey` resolves events and cycles.
- Tests: every date and degree in each view comes from `skyEvents` or `lifeCycles` for its fixture (acceptance 1's server half);
  `marie-curie-unknown` has no angle, house or Moon contact (acceptance 3); a quiet range has no event.

### R16-10 — Ask: its prompts, its fixed lines, and both families registered (INTERNAL) — provisional MB-190
Tier: opus — the brain: a chat's two prompts, its fixed replies and the model catalogue
Objective: the two prompts Ask sends per message and the lines it never leaves to a model, editable with the timeline family.
Files: new `api/src/prompts/ask/` (`index.ts`, `plan.ts`, `answer.ts`, `lines.ts`, `ask-prompts.test.ts`); `api/src/lib/models.ts`
(+ test); `api/src/lib/promptDefaults.ts`; `scripts/src/prompt-families.ts` (+ test), `scripts/src/reset-stale-prompt-overrides.ts`.
Refs: spec Ask; ADR-184, 202, 206, 213; R-5.1, R-5.4, R-5.6; MB-190; readings 11 to 16; pinned shapes.
Done when:
- `askPlanPrompt` (intent answer, ask_back, harm or off_topic; the tools; the choices) and `askAnswerPrompt` (text and card ids, never
  a quote's words) are strict; names and quotes sit in data blocks; the system says Ask reflects and never diagnoses, advises on
  health, law or money, or says do or don't; `checkAskAnswer` reuses R16-07's blocking checks.
- `HARM_REPLY`, `OFF_TOPIC_LINE`, `FALLBACK_LINE` and `capLine` are constants written through `/ux-copy`.
- `MODELS.timelineReading = "gpt-6-luna"`, `MODELS.ask = "gpt-5.2"` (`// MB-190 provisional`); `PROMPT_DEFAULTS` gains the timeline
  and ask families; `promptFamilies` gains their version rows, every caller moved (Preconditions 6).

### R16-11 — Ask: the chat with its tools, the reader's access, the cap (INTERNAL) — provisional MB-191
Tier: opus — access and consent: every tool reads reports, and a test proves each access
Objective: a message in, two calls, computed cards out, and nothing the reader cannot read.
Files: new `api/src/lib/ask.ts` (+ `ask.test.ts`).
Refs: spec Ask; ADR-139, 182, 201, 213; R-3.5, R-3.6; acceptance 10; `access.ts`; MB-191; readings 12 to 16; pinned shapes.
Done when:
- `sendAsk`: the cap first (reading 13), the reader's message stored, the plan call; `harm` and `off_topic` answer their fixed lines
  with no second call; `ask_back` stores its choices; `answer` runs the tools, then the answer call, one retry carrying the errors,
  else `FALLBACK_LINE`; `recordSpend("ask", …)` per call; nothing the reader types is logged.
- Tools `day`, `window` (at most six months), `cycle`, `quote`, `reports`, `person`, each re-checking access; a person card is kept as
  who and which day and computed on read while readable; rows older than 31 days go on each read or send (`// MB-191 provisional`).
- `ask.test.ts`, one test per access: the reader's own report, one shared with them, one not, a pair readable, a pair closed by Stop
  sharing, a person in it, a person not; each tool refuses what the reader can't read; the 51st message of a month is refused.

### R16-12 — The dry lab renders Timeline and Ask (INTERNAL)
Tier: opus — the lab that guards the brain, across the api and scripts packages
Objective: every change to either family renders free at each brain change, and a hostile name stays a name (ADR-210).
Files: `api/src/lib/labDry.ts` (+ test); `scripts/src/report-lab.ts` (+ test).
Refs: ADR-76, 86, 202, 210; R-4.4; acceptance 8; pinned shapes of R16-07 and R16-10; `fixtures/charts/`.
Done when:
- `dryTimeline` renders a reading prompt for each natal fixture's first five events that read, from 2026-10-05 over six months, and
  its three nearest life cycles; `dryAsk` renders both of Ask's prompts for three fixed questions; tokens counted, every schema strict;
  the injection pass covers both families with the three `inject-*` fixtures.
- `report-lab --dry` and `--render` include both families; natal and pair rows equal `main`'s render of them; tests on the rows' shape.

### R16-13 — The dial (INTERNAL)
Tier: opus — a new chart drawing: every body at its true degree, playable
Objective: the reader's chart inside, Mercury to Pluto each on its own track, a brass line per contact, days played only on Play.
Files: new `web/src/components/timeline/Dial.tsx`; new `web/src/lib/dial.ts` (+ test); `web/src/index.css` (the rose token and the
three tone classes).
Refs: spec Now and ahead (the dial), Your week; ADR-207, 211; §9 (the picture is the chart, brass is geometry, renders are bodies,
reduced motion); QA-02 #4; readings 17, 18; pinned shapes; the artifact's dial.
Done when:
- The natal chart inside per reading 18; eight tracks; each body at `longitudeAt` for the chosen day, its path over the range on its
  track, dashed while retrograde, with a dashed ring on a retrograde body; a brass line from a body to its natal point for each
  contact in effect.
- The range sets the slider (7, 30 or 182 days); Play steps a day per beat only when pressed and stops at the end; Back to today;
  reduced motion steps without a tween; one focusable slider on arrow keys with a visible focus ring; 390 px first.
- `--sd-rose: #C46B78` is the one new token; easy is the Closing's teal (#3FA796), mixed the muted grey; `dial.ts` tested.

### R16-14 — Now and ahead: why first, cards by tone, a reading on tap (INTERNAL)
Tier: opus — a new screen
Objective: beside the dial, what the day holds in plain words, then each contact, then what changes next.
Files: new `web/src/components/timeline/NowAhead.tsx`, `ContactCard.tsx`, `MixBar.tsx`, `ReadingSheet.tsx`; new
`web/src/lib/now-ahead.ts` (+ test).
Refs: spec Now and ahead; ADR-98, 172, 207; acceptance 1, 3; QA-02 #5; readings 4, 7, 9, 10; pinned shapes; `/ux-copy`, `/web-taste`.
Done when:
- This week, this month and six months fetch `getTimelineNow` in the browser's zone; the day's mix as one bar; a card per contact:
  tone colour and word, headline, everyday line, how long it lasts, then planet, house with its word, orb and dates, small; tap opens
  `ReadingSheet`, which posts `openTimelineReading`, shows "Writing" with dots while it writes, then the reading and what it builds on.
- Next: what starts, peaks or eases, each moving the dial to its day; without a horizon, one line says what can't be timed and how
  to add the time.
- A test renders a fixture's view and fails on any date or degree on the page that the view did not carry (acceptance 1).

### R16-15 — Life: four known ages, the waves, a card per cycle (INTERNAL)
Tier: opus — a new screen
Objective: why life cycles matter first, then a life's waves with ages on top, then each cycle.
Files: new `web/src/components/timeline/Life.tsx`, `Waves.tsx`, `CycleCard.tsx`, `AgeRing.tsx`; new `web/src/lib/life-view.ts`
(+ test).
Refs: spec Life; ADR-98, 209; reading 19; pinned shapes; the artifact's Life; `/ux-copy`.
Done when:
- Four cards first: the Saturn return, Jupiter every twelve years, the nodes at 19 and 37, Uranus in the early forties, each with the
  reader's dates and an `AgeRing`.
- The waves: ages on top, a line per body, a return at the bottom and opposite at the top, cycles as markers, the past shaded.
- `CycleCard`: name, plain word, ring, one fact, the reading through `ReadingSheet`; numbers quieter on the left; a repeating cycle
  asks "Think back to {month year}" from its previous pass; `life-view.ts` tested.

### R16-16 — Ask in the corner: the launcher, the mark, the chat (INTERNAL)
Tier: opus — a new flow
Objective: Ask one tap away, its answers shown as the same computed cards Timeline shows.
Files: new `web/src/components/ask/AskLauncher.tsx`, `AskPanel.tsx`, `AskMark.tsx`, `AskCards.tsx`; new `web/src/lib/ask-view.ts`
(+ test).
Refs: spec Ask; ADR-172, 213; `logo.md` (ring and horizon); readings 13 to 16; pinned shapes; the artifact's mark and chat.
Done when:
- Bottom right, our ring and horizon opened into a speech bubble with "Ask" in Newsreader italic, opening the panel; it takes text (at
  most 500 characters) or a tapped choice, shows "Writing" with dots, then text and cards: a day (contact cards and the Moon's sign), a
  window (days with tone dots), a cycle (`CycleCard`), a quote (the report's evidence look), a person's day.
- What's left shows only at 10 or fewer; at the cap, its line and date; the harm reply as given; focus moves into the panel and back
  to the launcher; Escape closes; 390 px first; `ask-view.ts` tested.

### R16-17 — One triad row, and At a glance under your name (USER-FACING)
Tier: opus — a shared row every surface will print, and a change inside the circle's geometry
Objective: Sun, Moon and Rising read the same everywhere, and the reader's own quick look gets a visible door.
Files: new `web/src/components/TriadRow.tsx`; new `web/src/lib/triad-row.ts` (+ test); `web/src/components/dashboard/QuickLook.tsx`,
`Orbit.tsx`; `web/src/lib/home-view.ts` (+ test).
Refs: spec Where it is sold (two small changes for everyone); ADR-98, 183, 211; §9; QA-02 #4; reading 20; pinned shapes.
Done when:
- `triadRowsOf` builds the three rows from a stored triad or a chart as reading 20 says: the one Sun render, the Moon render, the
  Ascendant glyph; the blind Rising keeps its line; no ruler.
- `QuickLook` prints `TriadRow`; "At a glance ›" sits under the reader's name in the circle and opens their quick look as a tap on the
  centre does, focusable with a visible ring, the ring's clearance kept.
- `triadLines` is gone and every caller moved; `pair-hero-layout.ts`'s `triadRows` is R16-23's.

### R16-18 — /timeline: coming soon, with the free finder (USER-FACING)
Tier: opus — a new public page, prerendered, computing in the browser
Objective: a page that answers "When is your Saturn return?", names Stars Decoded, and finds a reader's cycles from a birth date.
Files: new `web/src/site/pages/TimelineSoonPage.tsx`, `site/components/CycleFinder.tsx`, `site/lib/finder.ts` (+ test),
`site/data/timeline.ts`; `web/src/site/site.ts` (+ test), `site/routes.tsx`.
Refs: spec Coming soon on the site; ADR-107, 114, 116, 167, 215; R-7.6; acceptance 8; QA-02 #7; readings 21, 22; `/ux-copy` with its
AI-search pass, `/web-taste`.
Done when:
- Prerendered and listed like the other public pages (sitemap, `llms.txt`, head, JSON-LD with the folded FAQ); the opening answer
  names Stars Decoded; no switch; no claim the code does not keep.
- The finder (`BirthDateField`) per reading 21: the Saturn returns, the next Jupiter return, the nodal returns and the Uranus
  opposition; `finder.ts` matches `lifeCycles` per fixture.
- Cards: the Saturn-return `AgeRing`, four cycle cards ("next in N years" or "behind you"), three previews drawn from the sample
  person's chart (the dial, Life's rings, Ask's cards and chips, no invented answer), Get my report (the waitlist before launch), the
  folded FAQ; `vercel.json` left to the orchestrator.

### R16-19 — The words that change with the coming-soon page (USER-FACING)
Tier: sonnet — copy edits across existing pages, no new component
Objective: every page that says there is no subscription or no date stays true once /timeline exists.
Files: `web/src/site/data/faq.ts` (+ test), `web/src/site/sections/Pricing.tsx`, `web/src/site/pages/MethodPage.tsx`,
`web/src/site/sections/Method.tsx`, `web/src/pages/legal/TermsPage.tsx`, `.claude/skills/ux-copy/SKILL.md`.
Refs: spec Rules and copy that change when it ships; ADR-205, 206, 212; reading 22; `/ux-copy`.
Done when:
- "Does it predict the future?" says no dates for your life; "Do I pay once or every month?" and the Pricing lede say reports are paid
  once and Timeline, coming soon, will be the one subscription; Method's "No predictions" lines agree; Terms' "There's no
  subscription." becomes a sentence still true before Timeline is sold (its terms come with billing, R17).
- `/ux-copy`'s date rule: sky dates may be named, a date in the reader's life never; every line listed for the Owner's look;
  `faq.test.ts` green; `vercel.json` left to the orchestrator.

---

## Group C — the routes and the screens' wiring

### R16-20 — The routes, their limits, and home's week (INTERNAL)
Tier: opus — routes that spend and read personal data, behind the switch
Objective: the Timeline and Ask routes behind `requireTimeline`, limited and capped, and `GET /home` carrying an entitled reader's week.
Files: new `api/src/routes/timeline.ts`, `api/src/routes/ask.ts`; `api/src/routes/index.ts`, `routes/home.ts`, `routes/reports.ts`
(its DELETE only); `api/src/lib/limits.ts` (+ test), `api/src/lib/home.ts` (+ test).
Refs: pinned contract and shapes; ADR-199, 201, 211, 213, 215; R-7.5; acceptance 9; MB-191; readings 2 to 4, 7.
Done when:
- `/timeline/*` and `/ask` mount behind `requireTimeline`; now and life answer 409 `no_personal_report` without one; the six-month
  range calls `queueReadings`; both POSTs sit behind the spend gate (503 and its line) and per-user limits (`ask` 6 a minute,
  `timelineReading` 20 a minute, each with a line); no route logs what the reader typed.
- `GET /home` adds `week` only when entitled with a chart, else leaves it out; deleting one's own Personal report calls
  `forgetTimeline`; `home.test.ts` and `limits.test.ts` cover both.

### R16-21 — The Timeline page and its doors (INTERNAL)
Tier: opus — a new page and its routing, behind the switch
Objective: Timeline as one page, reached from Your week and the account menu, with Ask on the reader's reports.
Files: new `web/src/pages/TimelinePage.tsx`; `web/src/App.tsx`, `web/src/components/AccountMenu.tsx`, `web/src/pages/ReportPage.tsx`,
`CompatibilityReportPage.tsx`, `AdminPromptsPage.tsx`; `web/src/lib/page-title.ts` (+ test).
Refs: spec Where it is sold ("Timeline is one page"); ADR-211, 213, 215; acceptance 9; readings 1 to 3; pinned shapes; `/web-taste`.
Done when:
- `/dashboard/timeline` shows Now and ahead, then Life (a two-way switch on a phone), the no-report line and Ask's launcher; for anyone
  not entitled it is the app's 404; noindex like every app route; the tab says Timeline.
- The account menu shows Timeline only when entitled; `AskLauncher` sits on every report page an entitled reader opens, with that
  report's id; the admin's prompts page shows the Timeline and Ask tabs.
- With `TIMELINE` off, a signed-in non-admin's browser makes one state call (404) and a signed-out one none; neither renders any of it.

### R16-22 — Your week, after Your circle (INTERNAL)
Tier: opus — a new dashboard section
Objective: a subscriber's week on their dashboard, R12's dashboard otherwise as it is.
Files: new `web/src/components/dashboard/YourWeek.tsx`; new `web/src/lib/week-view.ts` (+ test); `web/src/pages/DashboardPage.tsx`.
Refs: spec Where it is sold (Your week); ADR-207, 211; §9 (two tempos); reading 23; pinned shapes; the artifact's dashboard.
Done when:
- Only when `home.week` is present, between Your circle and What you're practising: the dial with Week · Month · 6 months (the
  longer two from `getTimelineNow`) and Play (the planets move, nothing else does; Back to today), the headline, seven days with
  tone dots, what's on you, Open Timeline; Ask's launcher on the dashboard when entitled.
- Without `week` the dashboard renders as before, in the same order; the why card's place waits for R17; `week-view.ts` tested.

### R16-23 — One triad row in the reports, and the ruler moves in (USER-FACING)
Tier: sonnet — a UI change inside existing report components
Objective: both heroes print the one triad row, and the chart ruler leaves the Rising line for the 1st house card.
Files: `web/src/components/report/ReportHero.tsx`, `PairHero.tsx`, `pair-hero-layout.ts` (+ test), `HouseCard.tsx`.
Refs: spec (two small changes for everyone); ADR-98, 99, 211; reading 20; R16-17's `TriadRow`.
Done when:
- Both heroes print `TriadRow` and neither prints "ruled by"; `pair-hero-layout.ts`'s `triadRows` gives way to `triadRowsOf`, every
  caller moved; the phone and 640 px layouts hold, their layout tests green.
- The 1st house card names the chart ruler and where it stands, from the chart, words through `/ux-copy`.

### R16-24 — One triad row on the public pages (USER-FACING)
Tier: sonnet — a UI change inside existing site components
Objective: /sample's head and the two plates print the row the app prints.
Files: `web/src/site/components/SampleHead.tsx`, `TwoPlates.tsx`.
Refs: spec (two small changes for everyone); ADR-112, 113, 211; reading 20; R16-17's `TriadRow`.
Done when: both print `TriadRow` from their computed charts, the Rising with "1st (self)"; the prerendered HTML carries every value;
axe and the site tests green; no JSON-LD changes.

---

## Group D — the walk

### R16-25 — The walk: Timeline on a scratch Postgres (INTERNAL)
Tier: sonnet — tests on their own
Objective: the switch, the reader's own chart, readings once, and Ask's cap and access, end to end with no network.
Files: new `api/src/walk/timeline.walk.ts`; `api/package.json` (`walk` runs it).
Refs: acceptance 3, 9, 10; MB-191; R10-22's walk; R16-20's routes.
Done when: against `WALK_DATABASE_URL` after `db:bootstrap`, the model stubbed: a non-admin gets 404 on every Timeline and Ask route
and no `home.week`; the admin with `APP_ENV=staging` gets 200s, and 409 without a Personal report; two opens write one reading; the
51st message of a month answers 429 `ask_cap`; `quote` refuses an unshared report; deleting the Personal report takes the readings and
the thread. The orchestrator pastes the summary into the round report.

---

## After the builders: the orchestrator's steps, not cards
1. After group B: `pnpm --filter @workspace/web run csp:write` once (R16-18's JSON-LD, R16-19's FAQ), `vercel.json` committed.
2. **The gate:** `pnpm install --frozen-lockfile`, typecheck, `build:web` (its CSP check), `build:api`, unit tests, `check:shipped`,
   `check:copies`, `pnpm audit --prod`, codegen twice with no diff, `db:bootstrap` on the upgrade path and on an empty scratch Postgres
   (R16-04), every walk (R16-25's with them), smoke, the security probe and the site checks on the preview (axe reads `/timeline` from
   the sitemap).
3. **The dry lab** against r06, free, on `main`'s tree and on the branch: every natal and pair prompt the same on both, so no report's
   words change; every timeline and Ask prompt rendered for every natal fixture, every schema strict; injection clean in both families.
4. **The tester** after groups A, B and C (logic in `packages/engine`, `api/src/lib`, `web/src/lib`); **the sentinel** on the round's
   diff before the PR, its eye on Ask (each tool's access, quotes and names as data, nothing typed in a log, limits and the cap keyed
   on the signed-in user, rows bounded by the cap, spend recorded per call) and on the 404 of every closed route.
5. No fixture generation runs in the session (no key here, ADR-86); the first readings and answers are written on staging by the
   admin (Staging confirmation 3 and 4), every check that fires a `generation_failures` row. The Lab's Timeline spot is R17's, before
   the Release that turns `TIMELINE` on (acceptance 8).

## Staging confirmation, after the merge (the Owner's look)
1. Signed out, or signed in as anyone but the admin: no Timeline in the menu, no Ask, `/dashboard/timeline` not found. `/timeline`
   opens; type your birth date and the finder gives your Saturn return.
2. One triad row in the quick look, both report heroes and /sample (the Rising "· 1st (self)"); "At a glance ›" under your name opens
   your quick look; the 1st house card names your chart ruler.
3. As the admin, with your own Personal report: the account menu's Timeline. Now and ahead: the dial, Play, the cards by tone; tap
   one to read it (a first reading costs well under a cent). Life: the four ages, the waves, a cycle's reading.
4. Ask from the dashboard, Timeline and a report: a question, a date it asks back for, a quote from your report. The Lab page's
   Failures tab shows any check that fired.
5. The dashboard: Your week after Your circle; Play moves only the planets.

## Production after the round
Nothing until a Release. At the next one after R15's, production gets R16-17, 18, 19, 23 and 24: the triad row, At a glance, the
ruler's move, `/timeline` with its finder, and the copy. Timeline stays off: `TIMELINE` is false and the admin sees nothing on
production. The brain changed, so that Release runs the full lab; natal and pair words are unchanged by construction.

## Risks
1. **Schema** (R-7.3): two new tables, two kind unions widened with no DDL, one bootstrap step; tested on the upgrade path staging and
   production take and on an empty database (R16-04).
2. **The brain**: four engine files, two prompt families and two model jobs. No natal chart changes (`CHART_VERSION` stays 4) and the
   dry lab proves every natal and pair prompt unchanged, so no report's words change; the next Release still runs the full lab.
3. **New generated text, seen only by the admin this round**: readings and Ask's answers. No fixture generation runs in the session;
   the first are written on staging and every check that fires is logged; the Lab's Timeline spot comes before Timeline's Release (R17).
4. **User-visible without locked words**: the plain-word table, the no-time line, Ask's harm, off-topic, fallback and cap lines, the
   page's labels, the finder's results, the coming-soon page, the FAQ, Pricing, Method and Terms lines, the ruler's line. Each passes
   `/ux-copy`; the close lists them for the Owner's look.
5. **USER-FACING on production at the next Release**: R16-17, 18, 19, 23 and 24. Everything else stays behind `TIMELINE`.
6. **Security**: Ask is the product's first free-text chat with tools over reports. The sentinel reads each tool's access
   (acceptance 10), names and quotes as data, no typed text in a log, limits and the cap keyed on the signed-in user rather than a
   header (R13-08's lesson), rows bounded by the cap (R13-10's), spend recorded per call (R13-09's), and the 404 of every closed route.
7. **Privacy** (R-3.5): Ask keeps what the reader types for 31 days (MB-191); no new processor (OpenAI is listed); the privacy page
   names Ask when Timeline goes on sale (R17).
8. **Accuracy claims**: "to the hour" holds for the pinned fixtures, away from stations; the finder shows month and year from a date;
   the coming-soon page claims only what the code does (QA-02 #7).
9. **Dependencies**: none. astronomy-engine 2.1.19 already has the searches; Ask uses the existing OpenAI client.
10. **Planned before R15's re-plan.** Files both rounds touch: `openapi.yaml`, the schema index, `bootstrap-db.sh`, `home.ts`,
    `limits.ts`, `routes/index.ts`, `reports.ts`, `DashboardPage.tsx`, `ReportPage.tsx`, `App.tsx`, `AccountMenu.tsx`, `faq.ts`,
    `Pricing.tsx`, `TermsPage.tsx`. Round start 3 re-reads every pinned shape against `main` after R15.
11. **Size**: twenty-five cards, thirteen in group B; the shrink path is in Parallel groups.
12. **Deployments**: Vercel's 100 a day (MB-187); one push per group and one per fix.
13. **Escalations**: none in R13 or R14, so no card or kind of card was escalated to Opus two rounds running.

## Questions raised (Notion, 2026-10-03)
- **Raised today:** **MB-188** (decision, launch) the tone table; default: as recommended, `// MB-188 provisional` in `tone.ts`, the
  artifact's table winning if it shows one. **MB-189** (decision, later) Chiron in Timeline now that it has an ephemeris; default:
  out. **MB-190** (decision, launch) readings on gpt-6-luna, Ask on gpt-5.2; default: as recommended, tagged in `models.ts`. **MB-191**
  (decision, launch) Ask keeps 31 days, a person card as who and which day, all of it gone with the Personal report; default: as
  recommended, tagged. **MB-192** (todo, launch) for R15's /plan: a Stripe seam, webhook and ledger with room for the subscription;
  default: R17 adapts.
- **Read, and governing R17:** MB-104 (what a share card may show), MB-103 (pairs stay out), MB-114 (the consumer-law check widens to
  recurring billing), MB-116 (analytics for the loop study).
- **Touched:** MB-26 (decided by the lock); MB-125 answered for this path by `longitudeAt`, the sky screen's rewind untouched, so the
  row stays open; MB-22 (Ask leaves the port's chat tables alone); QA-02's MB-177 (focus rings), MB-178 (one clock), MB-180 (literal
  claims) and MB-185 (pasting a date, inherited by the finder's field) shape R16-13, 14 and 18.

## For the Owner (three asks, highest stakes first)
Approving this plan queues R16 behind R15 (ADR-217); nothing here is needed before R15 starts.
1. **What Ask keeps (MB-191).** Ask stores what you type, and the spec doesn't say for how long. Recommendation: 31 days, then gone; a
   card about someone else keeps only who and which day and shows only while you can still read them; deleting your Personal report
   deletes your Ask thread and readings. If silent: built that way, tagged, and the privacy page says so when Timeline goes on sale.
2. **The tone table (MB-188).** Every Timeline card is coloured easy, mixed or intense, and the spec never wrote the table.
   Recommendation: every trine easy; Jupiter's conjunction easy, its square and opposition mixed; Neptune's and Mars's conjunctions
   mixed; every other conjunction, square or opposition intense; retrogrades mixed; a close eclipse intense. If silent: built that way.
3. **The models (MB-190).** Recommendation: readings on gpt-6-luna, like every report section after the plan; Ask on gpt-5.2, as the
   spec priced it (about €1.50 a reader at the cap). If silent: built that way; the lab compares both before Timeline's Release.

## Proposed R17 — Timeline, part two: how it is sold and kept
Planned at its own /plan after R16, on R15's Stripe seam (MB-192), about sixteen cards:
- **Billing**: Timeline's €9.99 and €69.99 rows in `catalogue.ts` (R-6.3); Stripe Billing with consent to start at once; a table
  mirroring its webhooks (R-6.2); `timelineEntitled` reads it; cancel in two clicks; a lapsed subscriber keeps readings and gets no new
  ones (acceptance 6, 7); the yearly plan's credit, "+1 · with Timeline", taken back if refunded unspent.
- **Where it is sold**: the end-of-report offer (acceptance 5) with the first question free; the dashboard invitation after Share; the
  why card in Your week with "Read the two of you · 1 credit" through pricing's asking steps; Ask's pair offer and Gift a report.
- **Share cards** per life cycle (1080×1350) to the finder, under MB-104's answer.
- **The weekly letter**: opt-in, Monday from Railway, only in weeks that touch the chart, one-click stop (ADR-214; acceptance 3, 7).
- **Before its Release**: the Lab's Timeline spot (acceptance 8), the loop study's Timeline measure (ADR-216), Terms and Privacy for
  the subscription and Ask (MB-114, MB-191), and decisions on Ask's launcher for a non-subscriber and on /timeline once Timeline opens.
- **Its Release** turns `TIMELINE` on and amends MASTERFILE §1, §2's exclusions, R-5.2 and R-6.1 (ADR-205, 206).

## Close (the orchestrator)
MB-188, 190 and 191 built at their defaults with their seams tagged; MB-189 and MB-192 stay open; MB-26 and MB-125 as above.
MASTERFILE (the version after Round start 2's): §3 gains `timeline_readings` and `ask_messages`; R-5.6 names the two jobs (MB-190
provisional); §4 says Timeline's sky comes from `packages/engine/src/transits.ts` with no horizon (ADR-208); §1, §2's exclusions,
R-5.2 and R-6.1 wait for Timeline's Release. INDEX: the spec's line marks part one built in R16; the code map gains `transits.ts`,
`doctrine.ts`, `tone.ts`, `lifeCycles.ts`, `prompts/timeline/`, `prompts/ask/`, `timeline.ts`, `timelineReadings.ts`, `ask.ts`,
`timelineGate.ts`, routes `timeline.ts` and `ask.ts`, `components/timeline/`, `components/ask/`, `TriadRow`, `YourWeek`,
`TimelinePage`, `TimelineSoonPage` and the finder. CLAUDE.md's focus: R16 shipped behind `TIMELINE`; next, R17. A Mailbox row lists
R16's new words for the Owner's look; `lessons.md` takes each failure's cause; `/qa` on staging, then the URL, the QA report and
Staging confirmation's five lines go to the Owner.
