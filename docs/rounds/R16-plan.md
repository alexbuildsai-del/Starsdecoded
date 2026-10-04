# R16 plan — Timeline: its product page first, simple words everywhere, then Timeline itself for its subscribers and a teaser for everyone else

Planned 2026-10-03 on `claude/youthful-gauss-7snkqd` (24f6e6c: `main` at 30b45b6 plus both locks) for the locked specs `timeline`
(ADR-205 to 217; artifact https://claude.ai/artifact/V93jKVXrQKQ8S4byLefuFE) and `timeline-page` (ADR-249 to 261, 254 and 260
superseded; artifact https://claude.ai/artifact/YTpuNi1CqPfJJHVNEdtMJG) with its simple-words audit (`docs/annex/simple-words-audit.md`,
artifact https://claude.ai/artifact/VqW2umpB8JCyFfmwFS7Gcn), and the Owner's ADR-262 to 264. Revised twice the same day: when the Owner
added `timeline-page` (ADR-259, 261), and when he dropped the switch (ADR-262), added the Account page (ADR-263) and put Timeline's
billing with pricing (ADR-264). **Order:** after R15, the cleanup round (ADR-242), now being built on `round/R15`. **Scope:** Timeline's
product page first, on an engine built once for all of Timeline; every approved simple-words line and the writer's rule; then Timeline
the normal way, with no switch: readings, Ask, its screens and Your week for a subscriber (the admin, until billing exists), the
dashboard teaser for everyone else, and an Account page with Ask's use this month; for everyone, one triad row and At a glance. Nothing
in R16 takes a payment; Timeline's billing waits for pricing (ADR-264). QA-02 has no sev-1, no Mailbox row is `blocking`, and no Owner
comment sits on ADR-205 to 264 or on the rows this plan touches. **Cards:** thirty-four, past R05's thirty-two; the shrink path is in
Parallel groups. **Tiers:** 27 Opus, 7 Sonnet, no Haiku. **Tags:** USER-FACING are R16-01 to 17 and 30 to 33; INTERNAL are R16-18 to 29
and 34 (the server under Timeline, and the subscriber's screens, which only the admin can open until billing exists). **The brain
changes three ways:** the engine (four new files and the shared plain words), the writer's rule (report words change, R16-13), and two
new prompt families with two model jobs; the dry lab runs in the round and a spot run on staging comes before the Release (timeline-page
acceptance 10). **The schema changes** (R16-19). **The contract changes** (R16-20). **No new dependency.** No credential is needed,
nothing goes on GitHub, nothing generates in the session, and nothing reaches production in the round.

## Open Mailbox rows created more than 14 days ago (oldest first, ADR-186)
**2026-09-09:** MB-12 no error reporting or alerting · MB-19 no prompt version history · MB-20 the one e2e spec cannot pass, no lint
step · MB-21 variables missing from `.env.example` · MB-22 dead code left by the port · MB-30 the browser calls Nominatim and timeapi.io
(R15's, ADR-246). **2026-09-18:** MB-49 no API route can be unit-tested. None blocks a card. Touched here: MB-22 (`conversations` and
`messages` are the port's chat tables with no user; Ask gets its own and leaves them alone). A row's age is its Created time.

## Round number and order
R14 is the last round with a report. The Owner set the order on 2026-10-03: R15 is the cleanup round (`mailbox-sweep-03-10`, ADR-242),
then Timeline as **R16**, its product page the first group and the simple-words audit inside it (ADR-259, 261). Pricing and launch are
on hold and not planned until the Owner starts them (ADR-230, 242); Timeline's billing is built with them (ADR-264). Nothing in R16
needs pricing. **Approving this plan queues R16 behind R15**; `/round R16` starts when R15 has merged, and Round start 3 re-reads every
file R15 touched.

## Round start (the orchestrator)
1. **R15 is merged**; branch `round/R16` from `main` with this plan (merge `claude/youthful-gauss-7snkqd` first if it is not on `main`).
2. **Both locks are on this branch:** `timeline.md` and `timeline-page.md`, the audit, MASTERFILE and INDEX as the coordinator left
   them. ADR-205 to 264 are recorded; the round adds no Decisions row.
3. **Re-read against `main` after R15** every pinned shape and every file the audit names: R15 changes `data.ts`, `system.ts`,
   `vocabulary.ts`, `aiInterpretation.ts`, `access.ts`, `home.ts`, the schema, `openapi.yaml`, `bootstrap-db.sh`, `page-title.ts`,
   `NatalWheel.tsx`, `date-entry.ts`, `processors.ts` and many site files (Risk 10). A shape R15 changed is re-pinned before any builder
   starts; one that cannot be stops the round (R-0.1).
4. Builders cannot open claude.ai: extract into the session scratchpad, phone first then desktop, the page (#page), the home line
   (#home) and the four sentences (#words) from the page's artifact; the dial, Now and ahead, Life, Ask's mark and chat, Your week, the
   dashboard invitation (R16-31's teaser), the triad row and At a glance from Timeline's; the audit's before and after. Also any tone
   table (MB-188), place for the ruler (reading 20) or finder dates (reading 21) they show. Where a builder's draft differs, the
   artifact wins and the report says so.
5. The dry lab's base: `git fetch origin report-lab/r06 && git checkout FETCH_HEAD -- fixtures/reports/` (never committed).
6. `curl -sS -o /dev/null -w '%{http_code}' https://ssd.jpl.nasa.gov/api/horizons.api` (200 from this planning session). If it is
   blocked when R16-01 or R16-03 starts, their Horizons tests wait and the rest goes on. NASA's eclipse site is blocked from the sandbox,
   so R16-01 pins the two eclipse instants its card gives.

## Round start re-pins (the orchestrator, 2026-10-04, `main` at d26dd04 after R15)
Every named file is where the plan says; R15 rewrote no audited line (it removed "A moment you'd recognise." and two nudges).
1. **R16-05** adds `api/src/lib/github.ts` and `release.ts` (+ tests): `commitFile` takes `files: { path; content }[]` (one commit,
   one branch); `SAMPLE_FILE` admits exactly `web/src/site/data/timeline/mira-week.json` besides `/sample`'s, its guard tests extended;
   Mira's week moves on every forwarded Release, a lab run or not (only a missing token skips it); the detail gets a line for each.
2. **R16-08 and R16-11** rename only the labels on screen (`Differences.tsx:68`, `HouseCard.tsx`, `LinkCard.tsx`); the
   `"Behaviour check:"` marker in `charts-meet.ts` and `house-deck.ts` splits model text and stays.
3. **R16-10** adds `web/src/site/data/sample.ts` (`DIMMED_LINES.focus` only), written with the new Closing heads.
4. **R16-13**: natal `v10` → `v11`, pair `p5` → `p6`; R15's MB comments, rule 13 and the vocabulary header stay; the `full` entries
   are rewritten in `vocabulary.ts` and in the generator (`scripts/src/generate-vocabulary.ts`, added) so `--write` keeps them.
5. **R16-19**: the bootstrap step is `3n/7`, after R15's `3m/7`.
6. **R16-21, 24, 25**: report text entering a reading or Ask prompt goes through R15's `maskNames` (ADR-240); `DataLabel` gains
   `quote` with its own one-line maximum (about 900 characters; `DATA_MAX` stays 60 for names), and `DATA_RULE` names it.
7. **R16-22**: `%:system` keeps matching `timeline:system` and `ask:system` (both carry the style contract); its comment says so.
8. **R16-23** starts `readerChart` from `ownChartOf(userId)` (`shares.ts`); null or unfinished is 409 `no_personal_report`.
9. **R16-25 (and every read check in R16-23, 29)**: fetch `sharedProfileIds(viewer.userId)` once a request and pass it to
   `natalReportAccess(..., shared)` and `pairReadable(..., shared)`; the defaults deny a shared report.
10. **R16-29**: `forgetTimeline` runs after `DELETE /reports/:id`'s transaction, on the path deleting the viewer's own natal report,
    never on the `handOver` return; `LIMITS` gains `ask` (6 a minute) and `timelineReading` (20), `by: "account"`, each a `LIMIT_LINES` line.
11. **R16-32**: `triadRowsOf` keeps R15's Moon range (MB-139) from a stored triad's `band` and a chart's `planets.moon.band`, one
    format ("10.19° to 22.85° Pisces"; across a sign, both signs and no house), a test pinning both inputs equal.
12. **R16-33** adds `web/src/components/dashboard/CardSections.tsx` and `web/src/site/sections/YourPeople.tsx` (both call
    `triadRows`) and retires `pair-hero-layout.ts`'s `interface TriadRow` for the component's name.
13. **R16-34** appends `&& tsx ./src/walk/timeline.walk.ts` to the `walk` script.
14. **The orchestrator after group A**: `site.ts`'s `updated` set to the day on each page whose words moved.
15. **After group A** (what its builders found): `inOrb` merges passes, so a contact's window can hold gaps. **R16-20** adds
    `spans: { start: date-time; end: date-time }[]` to `TimelineEvent` (the stretches it is in orb, a gap between) and `TimelineLife`
    gains `age: number` (the reader's age today) and `birth: date-time` (their own birth instant), which `Waves.today` and
    `cycleMark` need; **R16-23** fills them. Cycle names and words come from the engine's `CYCLE_WORDS` everywhere (R16-15, 16, 31),
    never the artifacts' older words. Mira's week is `mira-week.json`, written by the API at a Release (`MIRA_WEEK=write` re-pins it
    after an engine change), read by `MIRA`; the dial takes `framesFor({ points, angles }, from, days, bodies)` and is itself the one
    keyboard slider. `lookBack`'s third argument is a `DateOrder`. Engine `DOCTRINE` clashes by name with `api/src/prompts`' `DOCTRINE`:
    alias on import.
## What already shipped (checked at 24f6e6c; `round/R15` read at 4d9ef09)
- **Met, and reused:** `@workspace/engine` on the server, in the browser and in the prerender (R11); Chiron from Horizons and
  `CHART_VERSION` 4 (R14); `isSelfFor`, `natalReportAccess`, `pairReadable`; `recordSpend`, the spend gate, `recordChecks` and
  `generation_failures`; `LIMITS`; names as data and the dry lab's injection pass; `promptDefaults.ts`, `prompt-families.ts`,
  `models.ts`; how the admin is known (`ADMIN_USER_ID`, `labGuard.ts`, `useIsAdmin`); `GET /home`; `PLANET_RENDERS`, `AngleGlyph`, the
  one Sun; `NatalWheel`; `BirthDateField`; the site's registry, prerender, crawl files and axe over every sitemap page; `ReportCta`'s free
  `source` tag; `FOOTER` in `site.ts`; `BROWSER_KEYS` in `processors.ts`, which the privacy page prints; Mira
  (`fixtures/sample-people/mira.json`, synthetic, born 1991-03-14 in Lisbon); `vercel.json` sending `/dashboard/*` to the app;
  `testModel.ts`. From R15 (in flight): the `shared` access kind (ADR-235), per-reader workbooks (ADR-239), masked names (ADR-240), the
  wheel's focus (MB-177), every time in the reader's clock (MB-178), pasted dates (MB-185), zones on the server (ADR-246), /sample's
  refresh branch in `sampleRun.ts` (ADR-247), the home report section (ADR-243 to 245).
- **Not met:** no `/timeline` page, home line or footer link; no transit, cycle or plain-words code; no Timeline access check, prompt
  family, job, table, route or screen; no Account page; the audit's lines as they were; the writer's prompts with no reading level, no
  one idea per sentence and no ban on metaphor and drama, and `vocabulary.ts`'s `full` entries in textbook words; triad rows built four
  ways, both heroes printing "ruled by"; Prices, the FAQ and Method saying what the four sentences replace.
- **Found while planning:** (1) the spec's own condition for Chiron is met (MB-189); (2) no tone table in either spec or their drafts,
  and the page now shows tones on Mira's examples (MB-188); (3) no model for readings (MB-190); (4) Horizons answers and NASA's eclipse
  site does not; (5) R15 rewrites some audited lines and removes others, so the audit is read by its words (reading 24); (6) `/account`
  is not an app path in `vercel.json`, so the Account page lives at `/dashboard/account`.

## Where the specs disagree, and how this plan settles it
1. **The timeline spec's "after pricing and launch"** → ADR-230 and 242 (later): Timeline is R16, after the cleanup round.
2. **ADR-215's `TIMELINE` switch** → ADR-262 (later): no switch; one access check, an active subscription or, until billing exists, the
   admin; everyone else gets the dashboard teaser. Production keeps the waitlist over the app until launch (ADR-167).
3. **Its screen 7, a coming-soon page with a finder** → `timeline-page` (ADR-249 to 259) replaces it.
4. **The dashboard invitation's "Start Timeline with the price"** → ADR-255 and 262: the teaser points to `/timeline` and shows no price.
5. **The timeline spec's "silent until 10"** → ADR-263 (later): Ask shows what's left this month, always, and the Account page shows
   the month's use.
6. **"Mercury to Pluto" on Timeline's dial and "Mars to Pluto" on the page's hero** → one dial that draws the bodies it is given.
7. **ADR-250's "renewed per Release" and hand-written sample words** → sample words are templates whose facts the engine fills, and
   each Release's sample branch moves Mira's week (reading 22).
8. **The finder's "dates only" and a date with no time** → month and year, passes as a span (reading 21); the artifact wins if it
   shows days, with the fine print saying the finder works from midday.
9. **§9: the dashboard's one visual is its circle** (ADR-89 to 96) → ADR-211 adds Your week's dial, for a subscriber only.
10. **R12's "the Rising never shows a house"** (`home.ts`) → ADR-211's "1st (self)": the web prints it; the stored triad is unchanged.
11. **Chiron "excluded until it has a real ephemeris"** against ADR-221's table → it stays out until the Owner adds it (MB-189).
12. **Ask's model in the spec's cap note** (two gpt-5.2 calls) against ADR-184 (Luna writes every other prose call) → MB-190.
13. **The timeline spec's "Terms" with the coming-soon copy** → the four sentences leave Terms as it is; Timeline's Terms and Privacy
    lines come with its billing (ADR-264).
14. **"Someone … never stored"** against a chat that keeps its history → a person card is kept as who and which day and computed when
    shown, only while the reader can still read them (MB-191).
15. **"Exact dates match JPL Horizons to the hour"** against hits near a station → the pinned hits sit away from stations; stations and
    eclipses carry their own tolerances (R16-01).
16. **Timeline acceptance 8's spot "before the Release"** against no switch → R16's Release carries Timeline to the admin only; the
    fixture spot comes before Timeline opens to subscribers (MB-198).

## Goals
1. **The Timeline page first** (ADR-249 to 259): `/timeline` with the dial and Play on Mira's chart, the five things with her examples,
   the Saturn-return finder, what you get with "Coming soon" and three steps, how it stays honest and the questions; the home line after
   Prices, the footer link and the four sentences; on an engine built once for all of Timeline and pinned to JPL Horizons (page
   acceptance 1 to 8, Timeline's 1 to 3).
2. **Simple words, everywhere** (ADR-257, 258, 261): every approved audit line, a test pinning the renamed chapter title and the kept
   one, `/method` matching the FAQ, and the writer's rule in the prompts with a check that only logs (page acceptance 9, 10).
3. **Readings and Ask on the brain** (ADR-206, 210, 213, 256): a prompt family written once per event and stored, blocked on an
   uncomputed date or degree, a predicted life event or a do or don't; Ask as a chat with tools that reads only what the reader can read,
   with a fixed harm reply and 50 messages a month; both in the dry lab (Timeline acceptance 4, 10).
4. **Timeline the normal way** (ADR-207, 211, 262, 263): one access check, with the admin its one subscriber until billing; Now and ahead,
   Life, readings, Ask with what's left this month and Your week for a subscriber; the dashboard teaser pointing to `/timeline` for
   everyone else; an Account page with Ask's use this month and its reset date.
5. **For everyone** (ADR-211): "At a glance ›" under the reader's name in the circle, and one triad row everywhere with the ruler moved
   into the report.

## Preconditions
1. Builders read MASTERFILE §0, their card, the spec sections and pinned shapes it names, and Round start 4's screens.
2. **Single owners.** Each card's files as listed, no file in two cards of a group. `packages/engine/src/index.ts` → R16-01;
   `vercel.json` → the orchestrator (`csp:write` after groups A and B); `.claude/skills/ux-copy/SKILL.md` → R16-17.
3. Inside a group a card may land before one it imports from (pinned shapes): the orchestrator accepts a red intermediate until the
   group ends, and every group ends green. A builder who needs a pinned shape changed stops (R-0.1).
4. **No card spends, takes a payment or reaches a network.** The model is stubbed (`testModel.ts`); only R16-01 and R16-03 read
   Horizons, by hand, and commit the values; walks run on a scratch Postgres. **No new dependency:** a builder who needs a package stops.
5. Provisional seams: `// MB-188 provisional` (`tone.ts`), `// MB-190 provisional` (`models.ts`), `// MB-191 provisional` (`ask.ts`,
   `timelineReadings.ts`), `// MB-197 provisional` (`timelineAccess.ts`); `doctrine.ts` names MB-189 where Chiron stays out. Code cites
   ADR-205 to 264 where it follows them.
6. **The promoted rule** (`lessons.md`, ADR-195): before changing a shared export, a pinned value or what a function may return, grep
   every caller; a caller outside the card's files is named in its report, never left on the old shape.
7. **Simple words** (CLAUDE.md, R-5.1, §9): every new word a builder writes, sample words and headlines included, is everyday words,
   one idea per sentence, no drama. One push per group and one per fix (ADR-234); a builder commits as it goes.

## Readings pinned where the spec is silent
1. **Two pages say Timeline.** `/timeline` is the public product page (ADR-249); the app's is `/dashboard/timeline` (noindex, already
   sent to the app by `vercel.json`), its file `TimelineAppPage.tsx`; a reader without access who opens it is sent to `/timeline`.
2. **The reader** is the viewer's self profile (`isSelfFor`) with a complete Personal report they can read; Timeline reads its stored
   chart (R-4.5). Without one, the Timeline routes answer 409 `no_personal_report` and the app says how to get one.
3. **Access is one check** (ADR-262): `timelineAccess(viewer)` answers from a list of sources; R16 has one, the signed-in admin
   (`ADMIN_USER_ID`), on every host; billing adds an active subscription later (MB-197). No subscriptions table is made now: nothing
   would write it before Stripe, and it should mirror Stripe's webhooks when they exist (R-6.2). Timeline's routes answer anyone else
   403 `no_timeline`; `GET /timeline/access` answers every signed-in reader. Production's app stays behind the waitlist until launch.
4. **Days** are the reader's: the browser's IANA zone sent as `tz` and validated, else the profile's birth zone. Week is 7 days from
   today, month 30, six months 182. Timeline prints dates in the reader's language order and no clock time.
5. **Event keys**, URL-safe and at most 80 characters: `{kind}.{body}.{aspect|-}.{target|-}.{yyyymmdd}`, the date a contact first
   perfects (its window's start when it never does), a retrograde's station, an eclipse's day; a cycle is `cycle.{id}.{yyyymmdd}`.
6. **Windows are whole.** A search runs from the range's start less a margin to its end plus one (Mars 60 days, Jupiter a year,
   Saturn 18 months, the outer three 3 years), so a window's start, end and passes are real.
7. **What gets a reading** (ADR-207, 210): contacts, retrogrades crossing a known house, eclipses within 3° of a natal point, and life
   cycles. Written on first open, and when a contact enters the six-month view (at most three queued per call); a quiet range writes
   nothing (acceptance 3).
8. **The basis** of a reading is `{CHART_VERSION}:{birth time or none}:{window minutes}:{TIMELINE_PROMPT_VERSION}`; a reading whose
   basis no longer matches is written again on its next open.
9. **Plain words live in the engine package** (`plainWords.ts`), read by the page's prerender and by the API: one headline per
   transiting body and natal point, aspect-free (the tone carries the aspect's feel); the facts line's parts ("Saturn on your
   Ascendant", "1st house"; dates formatted by the web); retrograde and eclipse lines from the house's word; the week's sentence ("Two
   things ease and nothing new starts this week"). The everyday line is a reading's own line once written, none before; on `/timeline`
   Mira's everyday lines are sample words.
10. **A reading builds on the report**: the target's house card when the chart has a horizon, else the chapter whose stored claims
    cite the target most, else nothing; computed in code. Its excerpts are those passages, at most three of 120 words.
11. **Models** (MB-190): readings `gpt-6-luna`, Ask `gpt-5.2`, as jobs in `models.ts`.
12. **Ask's tools are ours.** Call one plans (intent, tools, choices); the server computes the tools; call two writes the text and
    names the cards it shows; no function calling. Quotes are inserted by the server, word for word, never written by the model.
13. **The cap**: 50 reader messages a UTC calendar month, a tapped choice included. Ask always shows "N left this month" and the
    Account page "N of 50 used this month" with the reset date (ADR-263); at 0, 429 `ask_cap` with the date it resets.
14. **What Ask reads**: reports the reader can read (`natalReportAccess`, `pairReadable`, R15's `shared` grant); another person only
    through a Compatibility report the reader can read, for the day asked about. The Moon's sign and phase appear only in Ask's day card.
15. **What Ask keeps** (MB-191): 31 days; a person card as who and which day; gone with the reader's Personal report. Nothing the
    reader types reaches a log (ADR-201).
16. **A message sent from a report page** carries that report's id, read only if the reader can read it.
17. **Tone** (MB-188): the table as the row recommends; a day takes the tone most of its contacts hold, a tie to the more intense; a
    day with none is quiet. Tone is never a score.
18. **The dial draws the frames it is given**: per day, each body's place, retrograde flag and tone, and the contacts in effect with up
    to three headlines. The page's hero plays Mars to Pluto over six months from frames computed at build; Timeline draws Mercury to
    Pluto from frames the browser computes. Natal points and houses inside (Ascendant east on the left; 0° Aries without a horizon); a
    brass line per contact, dashed unless a conjunction; bodies filled by tone; a dashed ring on a retrograde; Play steps a day at a time
    only when pressed, with a trail, and stops at the range's end; reduced motion steps a week at a time; planet renders, never glyphs.
19. **Life's look-back** names a month and year ("Think back to January 2021"): a season needs the hemisphere the reader lives in.
20. **One triad row**: the real icon, label, sign, degrees (IBM Plex Mono, two decimals), house with its word; a known Rising reads
    "{sign} {degrees}° · 1st (self)"; no triad row prints a ruler. **The ruler moves to the 1st house card** unless the artifact puts
    it elsewhere.
21. **The finder** takes a birth date and computes at 12:00 UTC of it: Saturn's returns, the next Jupiter return, the nodal returns and
    the Uranus opposition, as month and year with passes as a span. It opens on Mira's birth date, marked as an example and computed at
    build; the engine loads in the browser on the first full date typed, never at render; nothing typed leaves the browser.
22. **Mira's week** is one file, `mira-week.json` (5 to 11 October 2026 first). Everything about it is computed at build from her
    fixture and carried to the browser as data; sample words are plain templates whose dates, pass counts and houses the engine fills.
    Each passing Release's `sample/<release-id>` branch (ADR-247) moves the week to the Monday after it (ADR-250); that pull request's
    CI fails when a sample line no longer matches her week, so the session that merges it fixes the words.
23. **The page before Timeline is sold** shows Get my report (`source="timeline"`, the waitlist before launch) and "Coming soon" where a
    price would go; Start Timeline comes with billing (ADR-264).
24. **The audit is read by its words** on `main` after R15 (its line numbers are from 30b45b6). A line R15 removed is skipped; a line
    R15 rewrote gets the audit's pattern and is listed for the Owner's look; strings copied from a stored report (`sample.ts`,
    `differences.ts`, the Claims quotes) wait for /sample's refresh after the prompt change.
25. **"Every claim shows its source" twice on home**: the home lede and Claims' line keep it; every other home mention says it without
    the phrase, and "reference" becomes "claim" wherever it means a claim.
26. **The dashboard, one or the other.** With access, Your week sits between Your circle and What you're practising. Without it, a
    reader with their own finished Personal report gets the teaser last, after the stories: "Your life's big cycles", the Saturn ring
    with its age, the four cycles soonest first ("Your next big cycle is at 37") with dates from their chart, a link to `/timeline`, no
    price, and Not now. Not now is kept in the browser (`sd.timeline.notnow`, listed on the privacy page) and the teaser comes back once
    when the next cycle is under a year away. Never on an empty dashboard; a subscriber sees none. The why card waits with the rest.
27. Copy and layout no spec words pass `/ux-copy` (simple words first) and `/web-taste`; each builder lists its new strings, before and
    after, for the Owner's look.
28. **The Account page** (ADR-263), at `/dashboard/account` from the account menu, holds Timeline: with access, its plan line
    ("Timeline, through admin access" until billing) and Ask's use this month with the reset date; without, one line and a link to
    `/timeline`. Cancel Timeline and Manage payment are left out until billing builds them with what they do (ADR-264): no control
    without its action. Credits stay about reports.

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
- **Engine, `cycles.ts`** (R16-03). `CycleId` = jupiter-return | jupiter-opposition | saturn-return | saturn-opposition | saturn-square
  | node-return | node-opposition | uranus-return | uranus-opposition | uranus-square | neptune-square | pluto-square; `NatalLongitudes`
  = Partial<Record<SkyBody, number>>; `natalLongitudes(chart)`; `noonLongitudes(ymd)`; `LifeCycle { key; id; body; age; window: InOrb;
  passes: number; repeats }`; `lifeCycles(natal, birth, options?: { untilAge?: number; ids?: CycleId[] })`; `KNOWN_AGES`; `Wave { body;
  points: { age; distance }[] }`; `waves(natal, birth, untilAge = 90)`.
- **Engine, `plainWords.ts`** (R16-04). `headlineOf(event): string`; `factsOf(event): { sky: string; house: string | null }`;
  `weekSentence(events, from): string`; `CYCLE_WORDS: Record<CycleId, { name: string; word: string }>`.
- **Web, the page's data** (R16-05). `web/src/site/data/timeline/mira.ts` exports `MIRA` { points, angles, week, frames: DialFrame[],
  contacts: ContactView[], next, days: DayView[], sentence, cycles: CycleView[], ages, wave, sample: { everyday, reportLine, reading,
  questions, subject } }, every field computed at build.
- **Web, the shared pieces** (R16-06, 07). `dial.ts`: `DialFrame { date; bodies: { body; lon; retrograde; tone: Tone | null }[];
  contacts: { body; target; aspect }[]; headlines: string[] }`, `framesFor(natal, from, days, bodies)`. `Dial({ points, angles, frames,
  day, onDay, playable, trail?, size? })`. `timeline-view.ts`: `ContactView { key; tone; headline; line: string | null; lasts: string;
  facts: string }`, `DayView { date; tones: Tone[] }`. `life-view.ts`: `CycleView`, `lookBack(cycle, today, locale)`. `ContactCard({
  contact, onOpen? })`, `MixBar({ tones })`, `DayCells({ days, keyed? })`, `CycleCard({ cycle, compact?, onOpen? })`, `AgeRing({ age,
  progress, label, size? })`, `Waves({ wave, today })`, `AskMark({ size? })`. `index.css`: `--sd-rose`, `.sd-tone-easy`,
  `.sd-tone-mixed`, `.sd-tone-intense`.
- **Schema** (R16-19). `timeline_readings { id text PK; user_id text NOT NULL; profile_id text NOT NULL; event_key text NOT NULL;
  basis text NOT NULL; status text NOT NULL (writing | ready | failed); reading jsonb; model text; created_at, updated_at timestamptz
  NOT NULL DEFAULT now() }`, unique (profile_id, event_key), index (user_id). `ask_messages { id text PK; user_id text NOT NULL; role
  text NOT NULL (reader | ask); body jsonb NOT NULL; created_at timestamptz NOT NULL DEFAULT now() }`, index (user_id, created_at).
  `GenerationFailureKind` and `SpendKind` gain `timeline` and `ask`. No subscriptions table (reading 3).
- **Contract** (R16-20; operationIds in brackets). `Tone`; `TimelineRange` = week | month | six-months; `ReadingStatus` = none |
  writing | ready | failed. `TimelineEvent { key; kind: contact | retrograde | eclipse; body; aspect: string | null; target: string |
  null; houses: integer[]; start; end; exact: date-time[]; orbNow: number | null; tone: Tone | null; headline; facts: { sky; house:
  string | null }; line: string | null; reading: ReadingStatus }`. `NatalPoint { body; lon: number; house: integer | null }`; `Angles {
  ascendant: number; midheaven: number }`. `TimelineNow { range; from: date; to: date; zone; blind; natal: NatalPoint[]; angles: Angles
  | null; days: { date; tones: Tone[] }[]; events: TimelineEvent[]; next: { key; at; change: starts | peaks | eases }[] }`.
  `LifeCycleView { key; id; body; name; word; age: number; exact: date-time[]; start; end; past; repeats; passes; reading: ReadingStatus
  }`. `TimelineLife { ages: { id; age; last: date-time | null; next: date-time | null; progress: number }[]; cycles: LifeCycleView[];
  waves: { body; points: { age; distance }[] }[] }`. `TimelineReading { key; line; body; buildsOn: { kind: house; house } | { kind:
  chapter; chapter } | null; writtenAt }`. `OpenedReading { status: ready | writing | failed; reading: TimelineReading | null; line:
  string | null }`. `AskUsage { used: integer; left: integer; cap: integer; resetsOn: date }`. `TimelineAccess { access: boolean;
  source: admin | subscription | null; hasPersonalReport: boolean; ask: AskUsage | null }`. `Week { headline: string | null; natal:
  NatalPoint[]; angles: Angles | null; days: { date; tones: Tone[] }[]; on: TimelineEvent[] }`. `Teaser { saturn: { age: number;
  progress: number }; cycles: { id; name; word; age: number; on: date }[] }` (the four, soonest first). `AskCard` = day { date; events;
  moon: { sign; phase } } | window { from; to; days: { date; tone: Tone | null }[] } | cycle { cycle } | quote { reportId; reportName;
  section; text } | person { name; date; events }. `AskChoice { id; label; kind: date | window | person | report }`. `AskMessage { id;
  role: reader | ask; text; cards: AskCard[]; choices: AskChoice[]; createdAt }`. `AskThread { messages; usage: AskUsage }`. `SendAskBody
  { text? (1 to 500); choiceId?; reportId? }`, one of text or choiceId. Paths: `GET /timeline/access` [getTimelineAccess] 200 or 401;
  `GET /timeline/now?range&tz` [getTimelineNow] and `GET /timeline/life?tz` [getTimelineLife], each 200, 403 `no_timeline` or 409; `POST
  /timeline/readings/{key}` [openTimelineReading] 200 `OpenedReading`, 403, 404, 429, 503; `GET /ask` [getAskThread] 200 or 403; `POST
  /ask` [sendAskMessage] 200, 400, 403, 429 (a limit or `ask_cap`), 503. `GET /home` gains `tz?`, `Home.week?: Week | null` and
  `Home.teaser?: Teaser | null`.
- **Server.** `timelineAccess.ts` (R16-18): `TimelineSource` = admin | subscription; `ACCESS_SOURCES`; `timelineAccess(viewer):
  Promise<{ access: boolean; source: TimelineSource | null }>`; `requireTimelineAccess` (403 `no_timeline`). `timeline.ts` (R16-23):
  `ReaderChart { userId; profileId; reportId; chart; blind; zone; birth; basis }`, `readerChart(viewer)`, `nowView(reader, range, tz,
  statuses, now?)`, `lifeView(reader, tz, statuses, now?)`, `weekView(reader, tz, now?)`, `teaserView(reader, now?)`, `eventByKey(reader,
  key, now?)`. `timelineReadings.ts` (R16-24): `readingStatuses(profileId, keys)`, `openReading(reader, key)` → ready with the reading |
  writing | failed with a line | unknown, `queueReadings(reader, keys, max = 3)`, `forgetTimeline(userId, profileId)`.
  `prompts/timeline` (R16-21): `TIMELINE_PROMPT_VERSION = "t1"`, `ReadingInput { event; brief; excerpts: { source; text }[]; name;
  blind }`, `ReadingSchema`, `readingPrompt(input, override?)`, `checkReading(output, input)`, `TIMELINE_PROMPTS`. `prompts/ask`
  (R16-22): `ASK_PROMPT_VERSION = "a1"`, `askPlanPrompt`, `askAnswerPrompt`, `AskPlanSchema`, `AskAnswerSchema`, `checkAskAnswer`,
  `HARM_REPLY`, `OFF_TOPIC_LINE`, `FALLBACK_LINE`, `capLine(resetsOn)`, `ASK_PROMPTS`. `ask.ts` (R16-25): `ASK_MONTHLY_CAP = 50`,
  `askUsage(viewer, now?)`, `askThread(viewer)`, `sendAsk(viewer, body)`.
- **Web, the app.** `useTimelineAccess()` (R16-18) → `{ access; source; hasPersonalReport; ask; loading }`. `ReadingSheet({ eventKey,
  open, onClose })` and `TimelineAppPage` (R16-27). `AskLauncher({ reportId? })` (R16-28). `AccountPage` (R16-30). `TriadRow({ rows,
  compact? })`, `triadRowsOf(triadOrChart, options?)` (R16-32).

## Parallel groups
**Group A**, one message: the page's ground, R16-01 to R16-07, with the simple-words cards R16-08 to R16-13 beside it (no file in
common). Inside it R16-02 and R16-03 build on R16-01's functions, R16-04 on R16-02's events, R16-05 on R16-01 to 04, and R16-06 and
R16-07 on R16-02's `Tone`, all on pinned shapes. Then the orchestrator runs `csp:write`. **Group B**, one message once A is green: the
page, R16-14 to R16-17, with Timeline's server ground, R16-18 to R16-23, beside it (no file in common; R16-18 and R16-23 read R16-20's
types). Then `csp:write` again. **Group C**, once B is green: R16-24 to R16-28 (R16-27's page holds R16-28's launcher). **Group D**, once C
is green: R16-29 to R16-33 (R16-33 uses R16-32's row). **Group E**: R16-34. Then the gate. **If R16 must shrink**, R16-32 and R16-33 go
first (the triad row and At a glance), then R16-28 with R16-25 (Ask's chat and panel; its prompts stay, rendered by the dry lab, and the
Account page shows no Ask line), each whole to the next /plan. The page (R16-01 to 07, 14 to 17), simple words (R16-08 to 13) and the
teaser with the Account page (R16-30, 31) never move (ADR-261, 262, 263).

---

## Group A — the page's ground: the engine, its words, Mira's week, the dial and the pieces; simple words beside it

### R16-01 — The sky search: any body's place at any instant, and when it reaches a point (USER-FACING)
Tier: opus — the brain's engine: every date Timeline and its page show rests on it
Objective: a local, free search over the sky with no horizon sweep (MB-125's path), to the minute, matching JPL Horizons to the hour.
Files: new `packages/engine/src/transits.ts`, `transits.test.ts`, `transits.horizons.test.ts`; `packages/engine/src/index.ts` (exports
this card's file and R16-02 to 04's).
Refs: Timeline's The engine; timeline-page The engine; ADR-208, 221, 251; acceptance 1, 2 of both; readings 5, 6; pinned shapes.
Done when:
- `longitudeAt` matches `calculateNatalChart`'s place for every body of every fixture at its birth instant within 0.01°, the mean node
  too, with no horizon computed; `exactHits` scans daily and bisects to the minute; `inOrb` returns whole windows, passes a retrograde
  splits merged with several exact dates; stations, ingresses and eclipses come from astronomy-engine's own searches.
- `transits.horizons.test.ts`: five contact hits from 2026 to 2032 (Mars, Jupiter, Saturn, Uranus, Pluto, none within ten days of a
  station) on natal points of `marie-curie`, `audrey-hepburn` and Mira, each pinned to the hour Horizons' hourly longitudes (quantity
  31, the Chiron script's query, in a comment) cross; the engine within an hour. Eclipses within 15 minutes of NASA's greatest eclipse
  (2026-03-03 11:33 UT, 2026-08-12 17:46 UT). Nothing fetches at test time; no Node API, so the browser bundles it.

### R16-02 — The doctrine: which sky events touch the chart, and their tone (USER-FACING) — provisional MB-188
Tier: opus — the brain: the doctrine decides everything Timeline and its page may talk about
Objective: from a chart and a range, every event the doctrine names with its tone, the page's day contacts first, and nothing else.
Files: new `packages/engine/src/doctrine.ts` (+ test), new `packages/engine/src/tone.ts` (+ test).
Refs: Timeline's The engine (Doctrine, Chiron, No birth time), Now and ahead (tone); timeline-page The engine; ADR-207, 208, 251;
R-4.6; MB-188, MB-189; readings 5 to 7, 17; pinned shapes.
Done when:
- `skyEvents`: Jupiter, Saturn, Uranus, Neptune and Pluto to the nine natal points by conjunction, square, opposition and trine within
  2° (Jupiter, Saturn) or 1.5° (the outer three); Mars by conjunction, square and opposition at 1°; Mercury, Venus and Mars retrogrades
  with the whole-sign houses they cross; every eclipse with its house, `near` only within 3°. Sextiles, the Moon's moves, minor bodies
  and Chiron (MB-189) make nothing.
- No horizon: no Ascendant, Midheaven or natal Moon target and no house; `readsAs` as reading 7; keys as reading 5, the same across
  two overlapping ranges.
- `TONE_TABLE` as MB-188 recommends (`// MB-188 provisional`), `dayTone` as reading 17; tests on `marie-curie`, `marie-curie-unknown`,
  `audrey-hepburn` and Mira from 2026 to 2028.

### R16-03 — Life's cycles from birth to 90, and the waves (USER-FACING)
Tier: opus — the brain: the finder's, the teaser's and Life's ages and dates are computed here
Objective: every cycle the doctrine names, from a chart or from a birth date at midday (the finder), quick enough for a phone.
Files: new `packages/engine/src/cycles.ts`, `cycles.test.ts`, `cycles.horizons.test.ts`.
Refs: Timeline's The engine (Life cycles), Life; timeline-page The engine, acceptance 2; ADR-208, 209, 251; readings 5, 6, 21; pinned
shapes.
Done when:
- `lifeCycles`: the returns and oppositions of Jupiter, Saturn, the mean node and Uranus, Saturn's and Uranus's squares, Neptune's and
  Pluto's squares, birth to 90, windows at the doctrine's orbs (the node at 1°), passes a retrograde splits merged with their count;
  `ids` limits the search; `KNOWN_AGES` holds the four; `waves` gives the six bodies' monthly distance from their natal places.
- `cycles.horizons.test.ts`: the cycles of five pinned birth dates match Horizons to the hour, one a three-pass Saturn return and one
  born before 1950 (the query in a comment; nothing fetched at test time).
- From `noonLongitudes` the finder's four cycles take under 250 ms on a laptop (a test bounds it) and match the full chart's to the
  month for every fixture.

### R16-04 — Plain words for every sky event (USER-FACING)
Tier: opus — the brain package's shared words, read by the page's prerender and by the API
Objective: one plain headline per event, a facts line and the week's sentence, in simple words, from one table both sides read.
Files: new `packages/engine/src/plainWords.ts` (+ test).
Refs: Timeline's Now and ahead; timeline-page §1, §2 (the headlines, "Two things ease…"), decision 8; ADR-207, 250, 256, 257;
reading 9; `/ux-copy`.
Done when:
- `headlineOf` gives one headline per transiting body and natal point (the artifact's where it shows one, such as "Taking yourself more
  seriously"): everyday words, one idea, no drama; retrograde and eclipse lines name the house by its word; `factsOf` gives "Saturn on
  your Ascendant" and "1st house", dates left to the page.
- `weekSentence` counts what starts, peaks and eases in a week ("Two things ease and nothing new starts this week"); `CYCLE_WORDS`
  names each cycle with its plain word.
- Every line passes `/ux-copy` and is listed in the report, all of them, for the Owner's look; tests cover every body and point and a
  quiet week.

### R16-05 — Mira's week: computed at build, renewed with each Release (USER-FACING)
Tier: opus — every example on the page rests on it, and it joins the Release's /sample refresh
Objective: everything the page shows about Mira, computed from her fixture, with sample words whose facts the engine fills.
Files: new `web/src/site/data/timeline/mira.ts` (+ test), new `web/src/site/data/timeline/mira-week.json`; `api/src/lib/sampleRun.ts`
(+ test).
Refs: timeline-page §1 to 3, Mira, acceptance 1, 3, 5; ADR-112, 247, 250, 256; R-3.1; readings 9, 18, 22; pinned shapes.
Done when:
- From `fixtures/sample-people/mira.json` and her week: her points and angles, 182 days of dial frames (Mars to Pluto, with headlines),
  the week's contacts with how long, passes and what comes next, day tones and the week's sentence, her cycles, ages and wave; computed
  at build and carried to the browser as data, with no engine call there.
- Sample words (everyday lines, the 1st-house report line, the reading quoting it, three Ask questions, the Monday subject) are plain
  templates whose dates, pass counts and houses come from the engine, each marked Sample words; `mira.test.ts` fails a line whose fact
  the engine does not give (acceptance 5).
- Each passing Release's `sample/<release-id>` branch also moves `mira-week.json` to the Monday after it; a failure there is a line in
  the forward step's detail, never a failed release.

### R16-06 — The dial (USER-FACING)
Tier: opus — a new chart drawing, shared by the page's hero, the home line and Timeline
Objective: natal points inside, the slow planets on their own tracks, a brass line per contact, played a day at a time only on Play.
Files: new `web/src/components/timeline/Dial.tsx`; new `web/src/lib/dial.ts` (+ test); `web/src/index.css` (the rose token and three
tone classes).
Refs: Timeline's Now and ahead (the dial); timeline-page §1; ADR-207, 211, 249, 250; §9; MB-196 (the focus colour); readings 17, 18;
pinned shapes; both artifacts' dials.
Done when:
- It draws reading 18 from the frames it is given: houses and natal points inside, each body on its track at its frame's place,
  filled by tone, a dashed ring on a retrograde, a brass line per contact (dashed unless a conjunction), a trail while it plays;
  `framesFor` builds frames with the engine for Timeline's ranges.
- Play steps a day per beat only when pressed and stops at the range's end; reduced motion steps a week at a time; one focusable slider
  on arrow keys with a ring in the site's focus colour; complete at first paint; 390 px first.
- `--sd-rose: #C46B78` is the one new token; easy is the Closing's teal (#3FA796), mixed the muted grey; `dial.ts` tested.

### R16-07 — Timeline's pieces: contact cards, the mix bar, day cells, cycle cards, rings, waves, Ask's mark (USER-FACING)
Tier: opus — the shared look of every Timeline surface, on the page now and in the app later
Objective: one look per kind of thing (ADR-172): the pieces the page shows with Mira's data and the app and the teaser reuse.
Files: new `web/src/components/timeline/ContactCard.tsx`, `MixBar.tsx`, `DayCells.tsx`, `CycleCard.tsx`, `AgeRing.tsx`, `Waves.tsx`;
new `web/src/components/ask/AskMark.tsx`; new `web/src/lib/timeline-view.ts`, `life-view.ts` (+ tests).
Refs: Timeline's Now and ahead, Life, Ask (the mark); timeline-page §2, §3; ADR-98, 172, 207, 209; readings 9, 17, 19; pinned shapes.
Done when:
- `ContactCard`: tone colour and word, headline, the everyday line when there is one, how long it lasts ("until 19 Oct, back in
  February"), then the facts line small and grey; `MixBar` the day's tones as one bar; `DayCells` seven days with tone dots and the key.
- `CycleCard` (full and compact): name, plain word, ring, one fact, a look-back for a repeating cycle; `AgeRing`; `Waves` with ages on
  top, a return at the bottom, opposite at the top, the past shaded; `AskMark`, our ring and horizon opened into a speech bubble with
  "Ask" in Newsreader italic.
- Dates in the reader's language order and no clock time; numbers quieter than words; the formatters tested.

### R16-08 — Simple words: the home page's sections and four public pages (USER-FACING)
Tier: sonnet — approved copy swaps across existing pages, no new component
Objective: every audited line in these files reads as the Owner approved (ADR-258).
Files: `web/src/site/sections/Differences.tsx`, `Inside.tsx`, `YourPeople.tsx`, `TwoCharts.tsx`, `BirthTime.tsx`;
`web/src/site/lib/readouts.ts`, `sky.ts`, `learn.ts` (+ tests); `web/src/lib/sky-card.ts`; `web/src/site/pages/CompatibilityPage.tsx`,
`LearnHousesPage.tsx`, `LearnBirthTimePage.tsx`, `WaitlistPage.tsx`.
Refs: `docs/annex/simple-words-audit.md` (Home page, Other public pages); timeline-page Simple words, acceptance 9; ADR-257, 258;
readings 24, 27.
Done when: each audited line in these files reads as its Proposed column, found by its words; a shared string changes everywhere it
shows; tests that pin old words move with them; `/ux-copy` passes; the report lists each line before and after.

### R16-09 — Simple words: the ledes, the FAQ, Method, and "every claim" twice (USER-FACING)
Tier: sonnet — approved copy in the files the FAQ and /method share
Objective: the page ledes, the FAQ and both Method blocks read as approved, and home says "every claim" twice.
Files: `web/src/site/site.ts` (+ test), `web/src/site/data/faq.ts` (+ test), `web/src/site/sections/Method.tsx`, `Claims.tsx`,
`web/src/site/pages/MethodPage.tsx`, `FaqPage.tsx`, `SkyPage.tsx`.
Refs: the audit (Home page, Other public pages, pattern 5); timeline-page acceptance 9; ADR-116, 257, 258; readings 24, 25, 27.
Done when:
- Each audited line in these files reads as approved; "Day or night" and "Lot" replace "Sect" and "Lot" on the cards; reading 25
  holds on home.
- A test keeps `/method`'s "How is it written?" paragraph equal to the FAQ's answer; `faq.test.ts` green; the report lists each line
  before and after.

### R16-10 — Simple words: the report's shared strings, and the title test (USER-FACING)
Tier: sonnet — approved copy in shared string tables, with one test
Objective: the chapter titles, section heads, lenses and glossary read as approved in the report, /sample, /method and /compatibility.
Files: `web/src/lib/chapters.ts` (+ test), `lenses.ts` (+ test), `evidence-glossary.ts` (+ test), `home-view.ts` (+ test);
`web/src/site/data/inside.ts`; `web/src/components/ReportSections.tsx`; `web/src/site/pages/SamplePage.tsx`.
Refs: the audit (rows for `chapters.ts`, `inside.ts`, `lenses.ts`, `home-view.ts`, `evidence-glossary.ts`, `SamplePage.tsx`);
timeline-page Simple words, acceptance 9; ADR-258; readings 24, 27.
Done when: "Superpowers, Chronic Patterns & Growing Edges" reads "Strengths, Habits & Where You Can Grow" and "Key Paradoxes &
Discoveries" stays, a test pinning both; every audited head, lens and glossary entry reads as approved wherever it shows
(`HOUSE_THEMES` on /learn/whole-sign-houses too); the report lists each before and after.

### R16-11 — Simple words: the report's own components (USER-FACING)
Tier: sonnet — approved copy swaps inside existing report components
Objective: every audited line the report, its hero and its cards print reads as approved.
Files: `web/src/components/report/HouseCard.tsx`, `ReportHero.tsx`, `OpeningOverlay.tsx`, `LinkCard.tsx`, `TwoChartsLedger.tsx`,
`PairSections.tsx`, `DawnClosing.tsx`, `RevisionLedger.tsx`, `ShareCard.tsx`, `HouseSystemSheet.tsx`;
`web/src/components/MethodologyBox.tsx`; `web/src/lib/progress.ts`, `charts-meet.ts` (+ tests).
Refs: the audit (The app); timeline-page acceptance 9; ADR-258; readings 24, 27.
Done when: each audited line in these files reads as approved, "Behaviour check" becoming "Does this sound like you?" in all three
places; tests that pin old words move with them; the report lists each line before and after.

### R16-12 — Simple words: the forms, the dashboard, the claim page and one API line (USER-FACING)
Tier: sonnet — approved copy swaps in existing app files
Objective: every audited line the birth form, the birth-time controls, the dashboard and the claim page show reads as approved.
Files: `web/src/pages/BirthFormPage.tsx`, `ClaimPage.tsx`, `ReportPage.tsx`; `web/src/components/BirthTimeControl.tsx`,
`BirthTimeDialog.tsx`, `CompatibilityPicker.tsx`, `dashboard/CardSections.tsx`; `web/src/lib/birth-time.ts`, `credits-view.ts`,
`nudges.ts` (+ tests); `api/src/lib/failureReasons.ts` (+ test).
Refs: the audit (The app); timeline-page acceptance 9; ADR-258; readings 24, 27.
Done when: each audited line reads as approved; the "quality bar" failure line becomes the approved sentence and its test moves; a line
R15 removed (the nudges it dropped) is skipped; the report lists each line before and after.

### R16-13 — The writer's rule in the prompts, with a check that only logs (USER-FACING)
Tier: opus — the brain: report words change for every reader
Objective: the Owner's simple-words rule in every writer prompt, the vocabulary in everyday words, and a count of sentences that miss it.
Files: `api/src/prompts/system.ts`, `vocabulary.ts`, `checks.ts` (+ test), `pair/index.ts`; `api/src/lib/aiInterpretation.ts`,
`pairInterpretation.ts`; `scripts/src/report-lab.ts`; `docs/annex/pair-reliability-checks.md`.
Refs: timeline-page Simple words (the brain), acceptance 10; the audit (The writer's prompts); ADR-81, 256 to 258; R-4.3, R-5.1;
reading 24.
Done when:
- The rule sits in `system.ts` word for word as the spec gives it, so every natal and pair system prompt carries it; `vocabulary.ts`'s
  `full` entries read in everyday words; both prompt versions go up one from where R15 left them.
- A check of class warn counts, per natal and pair section, sentences with two ideas or a metaphor (a RULES row and an annex row),
  logged as a `generation_failures` row and never blocking; `report-lab --compare` prints its counts over r06's stored texts, the base.
- The dry lab renders every natal and pair prompt, schemas strict, injection clean; the report quotes the rule and the base counts.

---

## Group B — the page; Timeline's server ground beside it

### R16-14 — /timeline: the page, its hero, what you get, how it stays honest (USER-FACING)
Tier: opus — a new prerendered public page
Objective: Timeline's product page as the spec draws it, complete without JavaScript, with no price.
Files: new `web/src/site/pages/TimelinePage.tsx`, `web/src/site/sections/timeline/Hero.tsx`, `WhatYouGet.tsx`, `Honest.tsx`;
`web/src/site/site.ts` (+ test), `web/src/site/routes.tsx`; `.github/workflows/site-checks.yml` (Lighthouse reads `/timeline`).
Refs: timeline-page §1 (items 1, 4 to 7), Mira, the registry, phone first, acceptance 3, 6, 8; ADR-116, 167, 249, 250, 255; R-7.6;
readings 1, 18, 22, 23; pinned shapes; the artifact (#page).
Done when:
- Registry entry (kind page, `WebPage` and `FAQPage`, sitemap, share preview and crawl like /sky) and "Timeline" in the footer's Reports
  column; prerendered with the hero, the plan, the rules, the questions (R16-17's Timeline topic) and the fine print, no JavaScript.
- The hero: the locked eyebrow, H1 and lede, Get my report (`source="timeline"`), "When is your Saturn return?" (to the finder) and the
  line under it; the dial on Mira's frames with Play and up to three headlines under it.
- What you get: the plan card's lines, "Coming soon" where a price would go, three steps; How it stays honest's four lines; one column
  at 390 px and the hero split from 880 px; Lighthouse within budget on `/timeline`.

### R16-15 — What Timeline gives you: five things, each on Mira's chart (USER-FACING)
Tier: opus — the page's main section, composing the new pieces with computed examples
Objective: every feature as a promise, why you'd care, and what Mira sees, plain words first and the astronomy small.
Files: new `web/src/site/sections/timeline/FiveThings.tsx`, `ThingCard.tsx`.
Refs: timeline-page §2, acceptance 1, 5; ADR-250, 256; readings 9, 22; R16-05's data and R16-07's pieces; the artifact (#page).
Done when:
- Now and ahead (the mix bar, contact cards, "Coming up"); Life (why the known ages matter, "When is your Saturn return? Find yours ↓",
  her wave, a look-back, next cycles with ages, dates and chips); Readings (the report line and the reading quoting it with its computed
  passes, "Read your 1st house again ›"); Ask (the mark and three questions); Your week (the sentence, day cells, the key, the days in
  plain words, the Monday subject).
- Each example marked Sample account or Sample words; every date, age, orb, tone and position from R16-05; words left and example right
  from 880 px.

### R16-16 — Try it free: the Saturn-return finder (USER-FACING)
Tier: opus — the engine running in the reader's browser, from a typed date
Objective: the free piece: a birth date in, the reader's big cycles out, nothing sent anywhere.
Files: new `web/src/site/components/CycleFinder.tsx`; new `web/src/site/lib/finder.ts` (+ test); new `e2e/tests/timeline-page.spec.ts`.
Refs: timeline-page §3, acceptance 2, 4, 8; Timeline acceptance 8; ADR-251; reading 21; R16-03's `cycles.ts`, R16-07's `AgeRing` and
`CycleCard`.
Done when:
- One `BirthDateField`, opening on Mira's birth date marked as an example; a full date redraws the finder only, without a button; an
  impossible or future date shows its inline error with focus on the field; the big ring and four compact cycle cards with the locked
  why lines; the engine loads on the first full date, never at render.
- `finder.ts` matches `lifeCycles` per fixture. The e2e spec at 390, 768 and 1440 px: no sideways scroll, a typed date redraws, an
  impossible one errors, no request reaches `/api`, and the hero's Play runs only when pressed and stops at six months.

### R16-17 — The way in and the four sentences (USER-FACING)
Tier: opus — a new home section on the live dial, beside approved copy
Objective: a reader on home finds Timeline, and every line about paying or dates stays true.
Files: new `web/src/site/sections/TimelineLine.tsx`; `web/src/site/pages/HomePage.tsx`, `web/src/site/sections/Pricing.tsx`,
`Method.tsx`, `web/src/site/pages/MethodPage.tsx`, `web/src/site/data/faq.ts` (+ test); `.claude/skills/ux-copy/SKILL.md`.
Refs: timeline-page The way in, Words that change, §1 item 6, acceptance 7; Timeline's Rules and copy (`/ux-copy`'s date rule); ADR-252,
253; reading 23; the artifact (#home, #words).
Done when:
- Between Prices and the questions: a small dial of today's slow planets (prerendered, redrawn to now on hydration), "Coming soon ·
  Timeline", the locked line and "What's in it ›" to `/timeline`; no form, and nothing else on home moves.
- The four sentences word for word (Prices; "Do I pay once or every month?"; "Does it predict the future?"; Method on home and
  /method); the Timeline topic's six questions in `faq.ts`, not marked `home`, exported for R16-14.
- `/ux-copy`'s date rule: sky dates may be named, a date in the reader's life never; `check:shipped` and the price gates green.

### R16-18 — Timeline access: one check, the admin its one source until billing (INTERNAL) — provisional MB-197
Tier: opus — access: who gets a paid product
Objective: one answer to "does this reader have Timeline?", read by the routes, `GET /home` and the web, that billing extends by one source.
Files: new `api/src/lib/timelineAccess.ts` (+ test); new `web/src/lib/timeline-access.ts` (+ test).
Refs: ADR-167, 262, 263, 264; R-3.6, R-6.2; `labGuard.ts` (how the admin is known); MB-197; reading 3; pinned shapes.
Done when:
- `timelineAccess(viewer)` answers `{ access, source }` from `ACCESS_SOURCES`, today one: the signed-in `ADMIN_USER_ID` on any host
  (`// MB-197 provisional`); a signed-out or anonymous viewer has none; no table is made or read; `requireTimelineAccess` answers 403
  `no_timeline`.
- Tests: the admin has it, a reader does not, signed out does not, an unset `ADMIN_USER_ID` gives no one access, and a stubbed second
  source is honoured, so billing adds one entry and changes no caller.
- `useTimelineAccess` reads `getTimelineAccess` once per signed-in user (React Query, keyed by user; none signed out); tests with a
  stubbed client.

### R16-19 — The tables for readings and Ask (INTERNAL)
Tier: opus — schema, run by every deploy's bootstrap
Objective: the two tables Timeline writes, in place before any route reads them, created idempotently.
Files: new `packages/db/src/schema/timeline.ts`; `packages/db/src/schema/index.ts`, `generationFailures.ts`, `spendLedger.ts`; new
`packages/db/scripts/migrate-add-timeline.ts`; `scripts/bootstrap-db.sh` (a step after R15's, its comment saying why).
Refs: pinned schema; MASTERFILE R-7.3, §3; ADR-210, 213, 262; MB-123, MB-191, MB-197; readings 3, 8.
Done when:
- Both tables and their indexes exist as pinned, in drizzle and in the script (`IF NOT EXISTS` throughout), and no subscriptions table;
  `GenerationFailureKind` and `SpendKind` gain `timeline` and `ask` with no DDL, every caller grepped (Preconditions 6).
- On a scratch Postgres 16 with a dummy `OPENAI_API_KEY` (MB-80): `db:bootstrap` from `main`'s tree, then this branch's twice, then
  an empty database twice; each run clean, step 2 applying nothing after the script; `packages/db` tests green.

### R16-20 — The contract and codegen (INTERNAL)
Tier: opus — the contract spans three packages and every Timeline surface in the app reads it
Objective: every shape Timeline's routes answer, in `openapi.yaml`, with the client and zod regenerated.
Files: `packages/api-spec/openapi.yaml`; `packages/api-client-react/src/generated/**`, `packages/api-zod/src/generated/**` (codegen).
Refs: pinned contract; MASTERFILE R-7.2; ADR-207, 209 to 213, 262, 263; MB-191, MB-197.
Done when:
- Every pinned schema, path, response and operationId is in the spec with a one-line description naming its ADR (and its MB where
  provisional): 403 `no_timeline` on every Timeline and Ask route, `GET /timeline/access` for every signed-in reader, `AskUsage` on the
  thread; every change is additive (`Home.week` and `Home.teaser` optional and nullable, `tz` optional), so no other file breaks.
- `pnpm --filter @workspace/api-spec run codegen`, then typecheck green with no other file changed; a second codegen leaves no diff.

### R16-21 — Readings: the timeline prompt family and its blocking checks (INTERNAL)
Tier: opus — the brain: a new prompt family and the checks that block it
Objective: a reading of one event in plain words, from the computed event, the brief and the reader's own report, that never dates the
reader's life, predicts, or says do or don't.
Files: new `api/src/prompts/timeline/` (`index.ts`, `reading.ts`, `doctrine.ts`, `checks.ts`, `timeline-prompts.test.ts`);
`api/src/prompts/checks.ts` (RULES); `api/src/prompts/data.ts` (a `quote` label); `docs/annex/pair-reliability-checks.md` (new rows).
Refs: Timeline's Readings; ADR-81, 202, 206, 210, 240, 256; R-4.3, R-5.1, R-5.3; amended R-5.2 (quoted in the prompt); readings 9,
10; pinned shapes.
Done when:
- `readingPrompt`: the system holds the style contract with the writer's rule (R16-13), ADR-206's sentence and the family's doctrine;
  the user holds the event's computed facts, the brief and the excerpts, every name and excerpt in a data block; `ReadingSchema` is
  strict: `line` (at most 20 words) and `body` (90 to 140 words); `TIMELINE_PROMPTS` gives its default rows.
- `checkReading` blocks a date or degree the event did not compute, a predicted life event and a do or a don't, each a RULES row and an
  annex row of class block; style faults are fixed or logged as the natal checks do; natal and pair prompts render as R16-13 left them.
- Tests: a clean reading passes; each blocking case fails with its rule id; a hostile name stays inside its block.

### R16-22 — Ask: its prompts, its fixed lines, and both families registered (INTERNAL) — provisional MB-190
Tier: opus — the brain: a chat's two prompts, its fixed replies and the model catalogue
Objective: the two prompts Ask sends per message and the lines it never leaves to a model, editable with the timeline family.
Files: new `api/src/prompts/ask/` (`index.ts`, `plan.ts`, `answer.ts`, `lines.ts`, `ask-prompts.test.ts`); `api/src/lib/models.ts`
(+ test); `api/src/lib/promptDefaults.ts`; `scripts/src/prompt-families.ts` (+ test), `scripts/src/reset-stale-prompt-overrides.ts`.
Refs: Timeline's Ask; ADR-184, 202, 206, 213, 256; R-5.1, R-5.4, R-5.6; MB-190; readings 11 to 16; pinned shapes.
Done when:
- `askPlanPrompt` (intent answer, ask_back, harm or off_topic; the tools; the choices) and `askAnswerPrompt` (text and card ids, never a
  quote's words) are strict and carry the writer's rule; names and quotes sit in data blocks; the system says Ask reflects and never
  diagnoses, advises on health, law or money, or says do or don't; `checkAskAnswer` reuses R16-21's blocking checks.
- `HARM_REPLY`, `OFF_TOPIC_LINE`, `FALLBACK_LINE` and `capLine` are constants written through `/ux-copy`.
- `MODELS.timelineReading = "gpt-6-luna"`, `MODELS.ask = "gpt-5.2"` (`// MB-190 provisional`); `PROMPT_DEFAULTS` gains the timeline
  and ask families; `promptFamilies` gains their version rows, every caller moved (Preconditions 6).

### R16-23 — The Timeline view on the server, and the teaser's cycles (INTERNAL)
Tier: opus — it turns the engine into what every app surface prints, and dates must be the engine's
Objective: from the viewer's own chart, Now and ahead, Life, the week and the teaser, in plain words, with no model call.
Files: new `api/src/lib/timeline.ts` (+ test).
Refs: Timeline's Now and ahead, Life, Where it is sold, Free and paid; ADR-207, 209, 211, 212, 262; R-3.6, R-4.5, R-4.6; readings 2, 4
to 9, 26; pinned shapes; R16-04's plain words, R16-20's types.
Done when:
- `readerChart` finds the viewer's self profile with a complete Personal report they can read and its stored chart, recomputed and
  cached when its version is old (R-4.5); `null` without one.
- `nowView`, `lifeView` and `weekView` give the pinned contract types in the reader's zone: whole windows, headlines and facts from
  `plainWords.ts`, tones and each day's mix, what starts, peaks or eases next, natal points and angles, the no-time flag, reading
  statuses as passed in; `teaserView` gives the Saturn return's age and ring and the four known cycles soonest first; `eventByKey`.
- Tests: every date and degree in each view comes from `skyEvents` or `lifeCycles` (acceptance 1's server half);
  `marie-curie-unknown` has no angle, house or Moon contact (acceptance 3); a quiet range has no event.

---

## Group C — the brain's writers and Timeline in the app

### R16-24 — Readings written once, stored, gated and logged (INTERNAL) — provisional MB-191
Tier: opus — the brain's call path, spend and personal data
Objective: a reading is written when first opened or when its event enters the six-month view, once per event per person, and kept.
Files: new `api/src/lib/timelineReadings.ts` (+ test).
Refs: Timeline's Readings; ADR-84, 199, 210; R-4.3; MB-191; readings 7, 8, 10; pinned shapes of R16-21 and R16-23.
Done when:
- `openReading` resolves the key through `eventByKey` (not found or not read: `unknown`); a stored reading whose basis matches is
  returned; else it claims the row as `writing` (a second open answers `writing`; one writing past five minutes is retried) and writes
  through the report's call path: `MODELS.timelineReading` at its pinned effort, strict output, every error carried into one retry and
  one more round alone, `recordSpend("timeline", …)` per call, `recordChecks` per attempt; a failed row keeps its line.
- Excerpts and `buildsOn` follow reading 10; `queueReadings` writes at most three missing readings per call, earliest first, behind
  the spend gate; `readingStatuses` maps keys; `forgetTimeline` deletes a profile's readings and its user's Ask thread.
- Tests with the model stubbed: one write across two concurrent opens; a stale basis rewrites; a paused day writes nothing; a blocked
  attempt is logged with its rule.

### R16-25 — Ask: the chat with its tools, the reader's access, the cap and its count (INTERNAL) — provisional MB-191
Tier: opus — access and consent: every tool reads reports, and a test proves each access
Objective: a message in, two calls, computed cards out, nothing the reader cannot read, and the month's count for Ask and the Account page.
Files: new `api/src/lib/ask.ts` (+ `ask.test.ts`).
Refs: Timeline's Ask; ADR-139, 182, 201, 213, 235, 263; R-3.5, R-3.6; acceptance 10; `access.ts`; MB-191; readings 12 to 16; pinned shapes.
Done when:
- `sendAsk`: the cap first (reading 13), the reader's message stored, the plan call; `harm` and `off_topic` answer their fixed lines
  with no second call; `ask_back` stores its choices; `answer` runs the tools, then the answer call, one retry carrying the errors, else
  `FALLBACK_LINE`; `recordSpend("ask", …)` per call; `askUsage` counts the UTC month; nothing the reader types is logged.
- Tools `day`, `window` (at most six months), `cycle`, `quote`, `reports`, `person`, each re-checking access; a person card is kept as
  who and which day and computed on read while readable; rows older than 31 days go on each read or send (`// MB-191 provisional`).
- `ask.test.ts`, one test per access: the reader's own report, one sent to them, one shared by its owner (R15's grant), one not shared,
  a pair readable, a pair closed by Stop sharing, a person in it, a person not; each tool refuses what the reader can't read; the 51st
  message of a month is refused and `askUsage` says 0 left until the 1st.

### R16-26 — The dry lab renders Timeline and Ask (INTERNAL)
Tier: opus — the lab that guards the brain, across the api and scripts packages
Objective: every change to either family renders free at each brain change, and a hostile name stays a name (ADR-210).
Files: `api/src/lib/labDry.ts` (+ test); `scripts/src/report-lab.ts` (+ test).
Refs: ADR-76, 86, 202, 210; R-4.4; acceptance 8; pinned shapes of R16-21 and R16-22; `fixtures/charts/`; MB-198.
Done when:
- `dryTimeline` renders a reading prompt for each natal fixture's first five events that read, from 2026-10-05 over six months, and
  its three nearest life cycles; `dryAsk` renders both of Ask's prompts for three fixed questions; tokens counted, every schema strict;
  the injection pass covers both families with the three `inject-*` fixtures.
- `report-lab --dry` and `--render` include both families; natal and pair rows unchanged by this card; tests on the rows' shape.

### R16-27 — Timeline in the app: its page, Now and ahead, and Life (INTERNAL)
Tier: opus — a new page with two screens on live data
Objective: the reader's own Timeline on one page, each event read on tap; a reader without access is sent to `/timeline`.
Files: new `web/src/pages/TimelineAppPage.tsx`; new `web/src/components/timeline/NowAhead.tsx`, `Life.tsx`, `ReadingSheet.tsx`; new
`web/src/lib/now-ahead.ts` (+ test).
Refs: Timeline's Now and ahead, Life, "Timeline is one page"; ADR-98, 172, 207, 209, 262; acceptance 1, 3; readings 1 to 4, 7, 9, 10,
18, 19; R16-06's dial, R16-07's pieces, R16-18's hook, R16-28's launcher; pinned shapes.
Done when:
- The page (routed by R16-30): Now and ahead, then Life (a two-way switch on a phone), the no-report line and Ask's launcher; without
  access it replaces itself with `/timeline`; noindex like every app route.
- Now and ahead: week, month or six months from `getTimelineNow` in the browser's zone; the dial (Mercury to Pluto, `framesFor`); the mix
  bar, a contact card each, then what starts, peaks or eases; without a horizon, one line on what can't be timed and how to add the time.
  Life: four age cards with the reader's dates, the waves, a cycle card each, from `getTimelineLife`.
- `ReadingSheet` posts `openTimelineReading`, shows "Writing" with dots while it writes, then the reading and what it builds on; a test
  fails any date or degree on either screen that the API did not send (acceptance 1).

### R16-28 — Ask in the corner: the launcher and the chat (INTERNAL)
Tier: opus — a new flow
Objective: Ask one tap away for a reader with Timeline, its answers shown as the same computed cards, and what's left always in view.
Files: new `web/src/components/ask/AskLauncher.tsx`, `AskPanel.tsx`, `AskCards.tsx`; new `web/src/lib/ask-view.ts` (+ test).
Refs: Timeline's Ask; ADR-172, 213, 263; readings 13 to 16; R16-07's `AskMark` and pieces; pinned shapes; the artifact's chat.
Done when:
- Bottom right, the mark opening the panel, rendered only with access; it takes text (at most 500 characters) or a tapped choice, shows
  "Writing" with dots, then text and cards: a day (contact cards and the Moon's sign), a window (day cells), a cycle (`CycleCard`), a
  quote (the report's evidence look), a person's day.
- "N left this month" always under the box (ADR-263); at the cap, its line and date; the harm reply as given; focus moves into the
  panel and back to the launcher; Escape closes; 390 px first; `ask-view.ts` tested.

---

## Group D — the routes, the Account page and the dashboard; one triad row for everyone

### R16-29 — The routes, their limits, the access answer, and home's week or teaser (INTERNAL)
Tier: opus — routes that spend and read personal data, behind the access check
Objective: the Timeline and Ask routes behind `requireTimelineAccess`, limited and capped, and `GET /home` carrying the week or the teaser.
Files: new `api/src/routes/timeline.ts`, `api/src/routes/ask.ts`; `api/src/routes/index.ts`, `routes/home.ts`, `routes/reports.ts`
(its DELETE only); `api/src/lib/limits.ts` (+ test), `api/src/lib/home.ts` (+ test).
Refs: pinned contract and shapes; ADR-199, 201, 211, 212, 213, 262, 263; R-7.5; MB-191, MB-197; readings 2, 3, 7, 13, 26.
Done when:
- `GET /timeline/access` answers every signed-in reader (401 signed out) with access, source, a Personal report or not, and Ask's
  count; now, life, readings and `/ask` sit behind `requireTimelineAccess` (403 `no_timeline`), now and life answering 409
  `no_personal_report` without one; the six-month range calls `queueReadings`; both POSTs behind the spend gate (503) and per-user
  limits (`ask` 6 a minute, `timelineReading` 20 a minute, each with a line); no route logs what the reader typed.
- `GET /home` adds `week` with access and a chart, `teaser` without access for a reader with their own finished Personal report (never
  on an empty dashboard), and neither otherwise; deleting one's own Personal report calls `forgetTimeline`; tests cover each case.

### R16-30 — The Account page, and the app's doors to Timeline (USER-FACING)
Tier: opus — a new page every signed-in reader can open, with the routes and the menu
Objective: an Account page that holds Timeline (ADR-263), and the doors: the menu, both routes, Ask on reports, the admin's prompt tabs.
Files: new `web/src/pages/AccountPage.tsx`; `web/src/App.tsx`, `web/src/components/AccountMenu.tsx`, `web/src/pages/ReportPage.tsx`,
`CompatibilityReportPage.tsx`, `AdminPromptsPage.tsx`; `web/src/lib/page-title.ts` (+ test).
Refs: ADR-211, 213, 255, 262, 263, 264; readings 1, 3, 13, 28; pinned shapes; `/ux-copy`, `/web-taste`.
Done when:
- `/dashboard/account`, from the menu's Account for every signed-in reader, reads `getTimelineAccess`: with access, the plan line and
  "N of 50 Ask messages used this month" with the reset date; without, one line and a link to `/timeline`, no price; no Cancel Timeline
  or Manage payment until billing builds them (reading 28); noindex; tab titles for both new pages.
- App routes `/dashboard/timeline` (R16-27's page) and `/dashboard/account`; the menu shows Timeline only with access; `AskLauncher` on
  every report page a reader with access opens, with that report's id; the admin's prompts page shows the Timeline and Ask tabs.
- A signed-out visitor makes no Timeline call; a signed-in reader without access sees no Timeline door, only Account.

### R16-31 — Your week for a subscriber, the teaser for everyone else (USER-FACING)
Tier: opus — two new dashboard sections, one of them for every reader
Objective: a subscriber's week after Your circle; for everyone else, the Timeline ideation's teaser at the end, pointing to `/timeline`.
Files: new `web/src/components/dashboard/YourWeek.tsx`, `TimelineTeaser.tsx`; new `web/src/lib/week-view.ts`, `teaser-view.ts` (+ tests);
`web/src/pages/DashboardPage.tsx`; `web/src/lib/processors.ts` (+ test).
Refs: Timeline's Where it is sold (Your week), Free and paid (the dashboard invitation); ADR-207, 211, 212, 255, 262; §9; reading 26;
pinned shapes; the artifact's dashboard and invitation.
Done when:
- With `home.week`, between Your circle and What you're practising: the dial with Week · Month · 6 months (the longer two from
  `getTimelineNow`) and Play (only the planets move; Back to today), the headline, `DayCells`, what's on you, Open Timeline; Ask's
  launcher on the dashboard.
- With `home.teaser`, last after the stories: "Your life's big cycles", the Saturn `AgeRing` with its age, the four cycles soonest first
  ("Your next big cycle is at 37") as compact `CycleCard`s, a link to `/timeline` and Not now, no price; Not now as reading 26, its key
  in `BROWSER_KEYS`.
- With neither, the dashboard renders as before, in the same order; `week-view.ts` and `teaser-view.ts` tested (Not now's return).

### R16-32 — One triad row, and At a glance under your name (USER-FACING)
Tier: opus — a shared row every surface will print, and a change inside the circle's geometry
Objective: Sun, Moon and Rising read the same everywhere, and the reader's own quick look gets a visible door.
Files: new `web/src/components/TriadRow.tsx`; new `web/src/lib/triad-row.ts` (+ test); `web/src/components/dashboard/QuickLook.tsx`,
`Orbit.tsx`; `web/src/lib/home-view.ts` (+ test).
Refs: Timeline's Where it is sold (two small changes for everyone); ADR-98, 183, 211; §9; MB-196; reading 20; pinned shapes.
Done when:
- `triadRowsOf` builds the three rows from a stored triad or a chart as reading 20 says: the one Sun render, the Moon render, the
  Ascendant glyph; the blind Rising keeps its line; no ruler.
- `QuickLook` prints `TriadRow`; "At a glance ›" sits under the reader's name in the circle and opens their quick look as a tap on the
  centre does, focusable with a visible ring, the ring's clearance kept.
- `triadLines` is gone and every caller moved; `pair-hero-layout.ts`'s `triadRows` is R16-33's.

### R16-33 — One triad row in the reports and on the public pages, the ruler moved in (USER-FACING)
Tier: sonnet — a UI change inside existing components, on R16-32's row
Objective: the report hero, the pair hero, /sample's head and the two plates print the one row, and the ruler leaves the Rising line.
Files: `web/src/components/report/ReportHero.tsx`, `PairHero.tsx`, `pair-hero-layout.ts` (+ test), `HouseCard.tsx`;
`web/src/site/components/SampleHead.tsx`, `TwoPlates.tsx`.
Refs: Timeline's two small changes for everyone; ADR-98, 99, 112, 113, 211; reading 20; R16-32's `TriadRow`.
Done when:
- All four print `TriadRow`, none prints "ruled by"; `pair-hero-layout.ts`'s `triadRows` gives way to `triadRowsOf`, every caller
  moved; the phone and 640 px layouts hold, their tests green; the prerendered HTML carries every value; axe green.
- The 1st house card names the chart ruler and where it stands, from the chart, words through `/ux-copy`.

---

## Group E — the walk

### R16-34 — The walk: Timeline on a scratch Postgres (INTERNAL)
Tier: sonnet — tests on their own
Objective: access, the reader's own chart, the teaser, readings once, and Ask's cap and access, end to end with no network.
Files: new `api/src/walk/timeline.walk.ts`; `api/package.json` (`walk` runs it).
Refs: Timeline acceptance 3, 10; ADR-262, 263; MB-191, MB-197; R10-22's walk; R16-29's routes.
Done when: against `WALK_DATABASE_URL` after `db:bootstrap`, the model stubbed: a reader with a Personal report and no access gets 403
`no_timeline` on every Timeline and Ask route, `home.teaser` and no `home.week`; an empty dashboard gets no teaser; the admin gets 200s,
`home.week` and no teaser, and 409 without a Personal report; `GET /timeline/access` answers both; two opens write one reading; the 51st
message of a month answers 429 `ask_cap` and the count says 0 left; `quote` refuses an unshared report and reads a shared one; deleting
the Personal report takes the readings and the thread. The orchestrator pastes the summary into the round report.

---

## After the builders: the orchestrator's steps, not cards
1. After groups A and B: `pnpm --filter @workspace/web run csp:write` (the FAQ's and `/timeline`'s JSON-LD), `vercel.json` committed.
2. **The gate:** `pnpm install --frozen-lockfile`, typecheck, `build:web` (its CSP check), `build:api`, unit tests, `check:shipped`,
   `check:copies`, `pnpm audit --prod`, codegen twice with no diff, `db:bootstrap` on the upgrade path and on an empty scratch Postgres
   (R16-19), every walk (R16-34's with them), smoke, the security probe and the site checks on the preview (axe reads `/timeline` from
   the sitemap, Lighthouse reads it from R16-14's list, R16-16's e2e spec runs with the others).
3. **The dry lab** against r06, free: every natal and pair prompt carries the writer's rule, every schema strict; the new check's base
   counts over r06 printed; every timeline and Ask prompt rendered for every natal fixture; injection clean in all four families.
4. **The tester** after groups A to D (logic in `packages/engine`, `api/src/lib`, `web/src/lib`, `web/src/site/lib`); **the sentinel**
   on the round's diff before the PR, its eye on the access check (one source, the admin, no other way in), on Ask (each tool's access,
   quotes and names as data, nothing typed in a log, limits and the cap keyed on the signed-in user, rows bounded by the cap, spend
   recorded per call), on every 403, and on the Release's sample branch writing Mira's week.
5. **After the merge, before any Release:** dispatch `report-lab.yml`'s natal and pair campaigns against staging (a few cents) and
   compare the new check's counts with r06's: they fall, and no check that blocks fires more often than before (page acceptance 10).
   Nothing else generates; Timeline's first readings and answers are written on staging by the admin. The fixture spot for readings
   comes before Timeline opens to subscribers (MB-198).

## Staging confirmation, after the merge (the Owner's look)
1. `/timeline`: the dial and Play on Mira's chart, the five things, the finder with your own birth date, what you get with "Coming
   soon", the questions. From home, the line after Prices; in the footer, Timeline.
2. The four sentences and the simple-words lines (the close's before and after list); chapter 08 reads "Strengths, Habits & Where You
   Can Grow"; a new report reads in simple words (the spot's counts sit in the round report).
3. One triad row in the quick look, both report heroes and /sample (the Rising "· 1st (self)"); "At a glance ›" opens your quick look;
   the 1st house card names your chart ruler.
4. As a reader without Timeline (a test account with its own Personal report): the teaser at the end of the dashboard, and Not now
   hides it; Account says you don't have Timeline and links to `/timeline`; `/dashboard/timeline` takes you to `/timeline`.
5. As the admin, with your own Personal report: the menu's Timeline (Now and ahead, Life, a reading on tap), Ask from the dashboard and
   a report with "N left this month", Your week after Your circle, and Account's "N of 50 used this month".

## Production after the round
Nothing until a Release. At the next one, everyone gets the Timeline page with its home line, footer link and four sentences, every
simple-words line, the report's new words (the writer's rule, after the spot), one triad row, At a glance and the ruler's move.
Production's app stays behind the waitlist until launch (ADR-167), so there only the admin has Timeline, the teaser and the Account
page, and nothing is sold (ADR-262, 264). The brain changed, so that Release runs the full lab.

## Risks
1. **Schema** (R-7.3): two new tables, two kind unions widened with no DDL, one bootstrap step after R15's; no subscriptions table
   (reading 3); tested on the upgrade path and on an empty database (R16-19).
2. **The brain, three ways**: four engine files and the shared plain words (no natal chart changes; `CHART_VERSION` stays 4); the
   writer's rule, which changes every new report's words (USER-FACING, R-5.5; prompt versions bump; R15's brain pass changed the same
   files first); two prompt families and two model jobs. A section the rule pushes below its band is handled by ADR-231's MB-129 rule.
3. **Access** (ADR-262): one check with one source, the admin; a wrong answer would open a paid product, so the sentinel reads it and
   the walk proves both paths; billing adds its source through MB-197.
4. **Timeline reaches production's app at the next Release**, for the admin only, before its fixture spot (MB-198); readings and Ask
   spend there under the daily cap, and every check that fires is logged.
5. **Words without a locked line**: about 54 headlines, Mira's sample words, Ask's harm, off-topic, fallback and cap lines, the teaser's
   link and Not now, the Account page's lines, the ruler's line, and the audited lines R15 rewrote. Each passes `/ux-copy`; the close
   lists them, before and after, for the Owner.
6. **USER-FACING at the next Release**: R16-01 to 17 and 30 to 33 (on production the app parts only for the admin until launch).
7. **Security**: Ask is the product's first free-text chat with tools over reports; the sentinel reads each tool's access
   (acceptance 10, R15's `shared` grant included), names and quotes as data, no typed text in a log, limits and the cap keyed on the
   signed-in user (R13-08's lesson), rows bounded by the cap (R13-10's), spend recorded per call (R13-09's).
8. **Privacy** (R-3.5): Ask keeps what the reader types for 31 days (MB-191); one new browser key, listed on the privacy page; no new
   processor; Mira is synthetic and marked.
9. **Accuracy claims**: "to the hour" holds for the pinned hits and birth dates, away from stations; the finder shows month and year
   from a date at midday and its fine print says so; tones on Mira's examples rest on MB-188's default until the Owner answers.
10. **R15 first.** R15 rewrites many files this round edits (Round start 3's list, and the site files the audit names); its shapes are
    re-read against `main` before any builder starts. The Release path: R16-05 makes each Release's sample branch move Mira's week,
    never failing a release.
11. **Size**: thirty-four cards, thirteen in group A and ten in B; the shrink path is in Parallel groups.
12. **Deployments**: Vercel's 100 a day (ADR-234); one push per group and one per fix.
13. **Escalations**: none in R13 or R14 (R15's report is not out yet), so no card or kind of card was escalated twice running.

## Questions raised (Notion, 2026-10-03)
- **Raised today:** **MB-197** (todo, launch) Timeline access has one source in R16, the admin, and billing adds the subscription source;
  default: as built, `// MB-197 provisional` in `timelineAccess.ts` (R16-18). **MB-198** (todo, launch) the fixture spot for readings
  (Timeline acceptance 8) before Timeline opens to subscribers; default: built before then, R16's Release carrying Timeline for the admin.
- **Kept:** **MB-188** (decision, launch) the tone table, shown on `/timeline` through Mira's examples (R16-02). **MB-189** (decision,
  later) Chiron stays out. **MB-190** (decision, launch) readings on gpt-6-luna, Ask on gpt-5.2 (R16-22). **MB-191** (decision, launch)
  what Ask keeps (R16-24, 25, 29). **MB-192** parked with pricing.
- **Touched:** MB-125 (held by this plan, answered for Timeline's path by `longitudeAt`); MB-22; MB-104 and 103 (ADR-235, 236, built in
  R15; Ask reads R15's grant); R15's MB-177, 178, 185 and 196 shape the dial's focus ring, Timeline's dates and the finder's field.

## For the Owner (three asks, highest stakes first)
Approving this plan queues R16 behind R15, the cleanup round (ADR-242). Nothing in it takes a payment (ADR-264).
1. **The tone table (MB-188).** Every Timeline card is coloured easy, mixed or intense, the spec never wrote the table, and Mira's
   examples on `/timeline` will show it in public. Recommendation: every trine easy; Jupiter's conjunction easy, its square and
   opposition mixed; Neptune's and Mars's conjunctions mixed; every other conjunction, square or opposition intense; retrogrades mixed;
   a close eclipse intense. If silent: built that way.
2. **What Ask keeps (MB-191).** Ask stores what you type, and the spec doesn't say for how long. Recommendation: 31 days, then gone; a
   card about someone else keeps only who and which day and shows only while you can still read them; deleting your Personal report
   deletes your Ask thread and readings. If silent: built that way; the privacy page says so with Timeline's billing.
3. **The models (MB-190).** Recommendation: readings on gpt-6-luna, like every report section after the plan; Ask on gpt-5.2, as the
   spec priced it (about €1.50 a reader at the cap). If silent: built that way; the lab compares both before Timeline opens (MB-198).

## Billing
Timeline's billing waits for pricing and is built with the rest of Stripe checkout when the Owner starts it (ADR-264).

## Close (the orchestrator)
MB-188, 190, 191 and 197 built at their defaults with their seams tagged; MB-189 and 198 open; MB-192 parked; MB-125 as above.
MASTERFILE and INDEX are the coordinator's for this plan; at the round's close the orchestrator records in them what R16 built: §3's two
tables, R-5.6's two jobs (MB-190 provisional), §4's sky from `transits.ts` and `cycles.ts` with no horizon (ADR-208, 251), access as one
check (ADR-262), the Account page (ADR-263), and the code map (`transits.ts`, `doctrine.ts`, `tone.ts`, `cycles.ts`, `plainWords.ts`,
Mira's week, the dial and the pieces, `site/pages/TimelinePage.tsx` with its sections and the finder, `TimelineLine`,
`prompts/timeline/`, `prompts/ask/`, `timeline.ts`, `timelineAccess.ts`, `timelineReadings.ts`, `ask.ts`, routes `timeline.ts` and
`ask.ts`, `TimelineAppPage`, `NowAhead`, `Life`, `ReadingSheet`, the Ask panel, `AccountPage`, `YourWeek`, `TimelineTeaser`,
`TriadRow`); §1, §2's exclusions, R-5.2 and R-6.1 wait until Timeline is sold. CLAUDE.md's focus: R16 shipped. A Mailbox row lists
R16's new words before and after for the Owner's look; `lessons.md` takes each failure's cause; `/qa` on staging, then the URL, the QA
report and Staging confirmation's five lines go to the Owner.
