# Review 02/10

Ideation 2026-10-02 with the Owner from the Notion page "Review 02/10" (three notes for Claude and seven
findings on staging after R13). Artifact: ARTIFACT_URL. Status: **draft**.
Touches `landing-and-ai-search` (the home sections, /sample's run, the free chart's fields),
`review-01-10` (the two differences, ADR-173), `natal-report-ui` (the wheel's points) and the engine.
**Brain:** Chiron's position changes in `packages/engine` (dry lab; the first Release's lab writes with it).
**Phone first**: every screen is designed at 390 px before desktop.

Not in this spec: the dashboard crash (finding 7). It is a broken build, ours to fix at once (R-12.5),
shipped as its own pull request outside any round (see "Done outside the round").

## Scope

### 1. The section after the hero (finding 6, Q1)
- The two-pillar band (`web/src/site/sections/Differences.tsx`, ADR-173) becomes one section: eyebrow
  "Your report", heading "A personality report, not a horoscope", the lede "It describes how you think, work
  and love through moments from everyday life, and gives you things to try. Three lines from {sample}'s
  report:".
- Option A (recommended): three cards, **How you think**, **How you work**, **How you love**. Each holds one
  claim quoted byte for byte from the sample run (`mind`, `career`, `relationships`), its first evidence row
  in the report's evidence look, and, for work and love, one of that chapter's actions with the report's one
  tick box (ADR-172, local ticks, never sent). Chapter accents as data (`chapterAccent`).
  Under them a mono line counted from the run: chapters, words, claims ("10 chapters · 4,872 words · 63
  claims, each tied to her chart" for r06). Desktop: the three cards in a row; phone: stacked.
- The claims are picked by id in `web/src/site/data/differences.ts` and throw at import if missing, as
  the pillar does today, so a new sample run fails the prerender rather than quoting less.
- Option B (one line taken apart into moment, evidence, practice) is drawn in the artifact and not built
  unless the Owner picks it.
- The circle pillar (`CirclePillar`, `SamplePair`) leaves the home page. /sample's closing band
  (ADR-173 "again at the end of /sample") shows the same single section.

### 2. "Add the people you care about" gains the gift and the share (finding 6)
- `YourPeople.tsx`: the lede becomes "Add your partner, parents, kids or friends. They show up around you
  on your dashboard, so you can tap anyone to see their chart."
- Under it, three rows before the circle: **Gift them a report** ("They get a credit and write their own
  Personal report, with their own birth details."), **Share reports with each other** ("Share yours, read
  theirs, and you each learn how the other works."), **See how two of you get along** ("A Compatibility
  report for any two people in your circle."). The dashboard's verbs (Gift a report, Share with; ADR-120
  as amended by ADR-181). Marks: the waiting gift's teal dashed ring, indigo for sharing, violet for the pair.
- The circle and Mira's card are unchanged.

### 3. Remove "You get your credit back if something goes wrong" (finding 2)
- From the home page's facts (`sections/Method.tsx`) and /method's facts (`pages/MethodPage.tsx:187`).
  The two remaining facts sit in two columns on desktop (`.sd-facts`), one on a phone.
- /method's step 4 keeps its sentence on a chapter that can't pass. The refund rules (ADR-142) and the
  failure lines are unchanged.

### 4. The wheel's nodes and Chiron (finding 3)
- **Nodes.** `NatalWheel` drops the R on `north_node` and `south_node` (a mean node is always retrograde),
  draws their glyphs in a bundled symbol face so ☊ and ☋ render the same on every device, draws the South
  Node at the line colour with a faint dashed line joining the pair through the centre, and the tap or
  hover chip reads the full name and degree ("North Node · 21.8° Taurus · 4th"), not "NOR".
- **Chiron.** `packages/engine/src/chartCalculation.ts` replaces the hand-made Kepler orbit (its mean
  anomaly at J2000 is about 160° wrong) with a committed table of Chiron's geocentric ecliptic longitude
  from JPL Horizons, 1900 to 2100, interpolated; retrograde and speed come from the table. Values and the
  table's step follow the verified research (CHIRON_VERDICT). A test pins Audrey Hepburn's and Marie
  Curie's Chiron to Horizons within 0.1°, and the generator script and its Horizons query are committed
  so the table can be rebuilt.
- Brain change: the dry lab runs in the round; stored reports keep their text (MB-NN: what to say about
  reports already written with the old Chiron).

### 5. Our own date and time fields (findings 4 and 5, Q2)
- One shared `BirthDateField` and one shared `BirthTimeField` replace the native `type="date"` and
  `type="time"` inputs in `SkyForm`, `BirthFormPage` and `BirthTimeControl` (exact and give-or-take
  modes). Every field fits its column at 390 px; inputs are 16 px; the month is a native select of month
  names; day, year, hour and minute are numeric text boxes with `inputmode="numeric"`.
- **Order by the browser's language** (`navigator.language`, read after hydration; the prerender draws
  day, month, year and 24-hour): the order `Intl.DateTimeFormat(lang).formatToParts` gives (day first for
  en-GB, fr, de, sk; month first for en-US; year first for ja, zh, ko, en-CA). The 12-hour clock with an
  AM/PM switch where the language's default hour cycle is 12-hour (`resolvedOptions().hourCycle`: en-US,
  en-AU, en-IN), else 24-hour (en-GB, fr, de, sk). Never the visitor's location.
- A readout under the fields prints the date, time and offset in the same order.
- Display text follows the same rule: the hand-built "3 am" (`SampleHead`, `Claims`) and the part-of-day
  labels in `birth-time.ts`; dates already day-first stay so for day-first languages.
- The API's fields are unchanged: `birthDate` "YYYY-MM-DD", `birthTime` "HH:MM" 24-hour.

### 6. /sample shows the latest run (finding 1, Q3)
- When the first Release passes, Audrey Hepburn's run from its lab (`MATRIX_CHARTS` includes her) is
  committed as `web/src/site/data/sample/audrey-hepburn.<release>.json`, without `foundation` and
  `meta.usage`, replacing r06. With it: `sample.test.ts`'s digest and claim count, `site.ts`'s `updated`,
  the four `HOME_CLAIMS` re-picked from chapters /sample prints whole (closes MB-134), and section 1's
  three cards re-picked.
- Every later Release that passes does the same, as a step of the Release's report. MB-101 closes.

### 7. The Owner's notes
- **N1** The /round skill: on the Owner's yes, the orchestrator copies
  `docs/annex/round-skill-r13-05-draft.md` over `.claude/skills/round/SKILL.md` in this session, behind
  the harness's permission prompt (closes MB-155).
- **N2** R13's words: approved as shipped (closes MB-156).
- **N3** The edge secret: the Owner sets `EDGE_PROXY_SECRET` (48 letters and digits) in Vercel (Production
  and Preview) and in Railway (staging and production), by the artifact's five steps. R14's card (MB-150)
  reads that name.

## Out of scope
- The dashboard crash (done outside the round, below).
- Any other point on the wheel (Lilith, lots) and any change to how the nodes are computed (mean node).
- Translating the site; only the order and clock of dates and times follow the browser's language.
- MB-160's "every line" copy rides the same round if Q3 takes the default; it is its own row.

## Acceptance criteria
1. At 390 px on iPhone Safari and Chrome, no birth date or time field leaves its card on home, /sky, the
   birth form or the birth-time dialog; inputs are 16 px.
2. With the browser in English (US), the date reads month, day, year and the time has AM/PM; in English
   (UK), French, German or Slovak day, month, year and 24-hour; in English (Australia) day, month, year
   with AM/PM; in Japanese year, month, day. The value
   sent is "YYYY-MM-DD" and "HH:MM" in every case (unit tests over a list of languages).
3. The prerendered home page shows day, month, year and 24-hour; no hydration mismatch warning.
4. Home's first section after the hero is one section; the circle pillar is gone from home and /sample.
   Its three quotes are byte-identical to the sample run and each shows its evidence; the counts under
   them are computed.
5. "Add the people you care about" shows the three rows with the dashboard's verbs; the circle works as
   before.
6. "You get your credit back if something goes wrong" appears nowhere on home or /method; the facts sit in
   two columns on desktop with no empty column.
7. On the wheel, neither node carries an R; their chips name them in full; ☊ and ☋ render from the bundled
   face (checked in a test of the font's coverage).
8. Audrey Hepburn's Chiron and Marie Curie's are within 0.1° of Horizons; the old Kepler code is gone;
   the dry lab is pasted into the round report.
9. After the first Release, /sample's head shows the Release's date and run; every home claim anchors on
   /sample.
10. The gate, the sentinel and site checks pass as usual.

## Screens
The artifact: the summary table, the dashboard diagram, the wheel before and after, the fields on an
iPhone before and after and in an English (US) browser, options A and B for the section after the hero,
the circle section's three rows, the facts with the line struck, and the three questions.

## Done outside the round
- **The dashboard crash.** Dependabot's group bump (#86, 2026-10-02 10:55) moved the catalogue to React
  19.3.0 while `packages/api-client-react` kept 19.2.8 through `autoInstallPeers`, so pnpm installed two
  peer variants of `@tanstack/react-query` 5.103.2 and Vite bundled both. The provider in `App.tsx` and
  the generated hooks use different copies ("No QueryClient set"). Fix: `react` from `catalog:` as a dev
  dependency of the API client (and `integrations-openai-ai-react`), `@tanstack/react-query` added to
  `web/vite.config.ts`'s `dedupe`, the lockfile regenerated with pnpm, and a CI step that fails when
  the lockfile holds more than one peer variant of `@tanstack/react-query` or `react`.

## Open questions
- Q1 Option A or B for the section after the hero. Default A.
- Q2 Dates and times by the browser's language, or day-first and 24-hour for everyone. Default by language.
- Q3 One short round for this review and Chiron before the first Release (pricing moves to R15).
  Default yes.

## Decisions to record
1. The section after the hero is one section about the report, with three real moments (think, work,
   love), each with its evidence and, where the chapter has one, a thing to try; the circle pillar
   leaves home and /sample (amends ADR-173).
2. "Add the people you care about" names the gift and the share in the dashboard's verbs.
3. The home page and /method no longer promise the credit back; the refund rules stand (ADR-142).
4. The wheel draws the nodes without an R, in a bundled symbol face, the South Node quieter and joined to
   the North Node; their chips name them in full.
5. Chiron comes from a committed JPL Horizons table, 1900 to 2100, interpolated; the Kepler
   approximation is retired.
6. Birth date and time are our own fields; their order and clock follow the browser's language, never
   the location; the API's format is unchanged.
7. /sample shows Audrey Hepburn's run from the latest Release that passed; each passing Release
   refreshes it (closes MB-101).
8. The edge secret is named `EDGE_PROXY_SECRET`, one value in Vercel (Production, Preview) and Railway
   (staging, production).
9. A lockfile with two peer variants of react or react-query fails CI.
10. The round order: R14 is this review with Chiron, then QA, then the first Release; pricing and launch
    become R15.
