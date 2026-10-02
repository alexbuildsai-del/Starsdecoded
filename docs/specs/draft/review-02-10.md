# Review 02/10

Ideation 2026-10-02 with the Owner from the Notion page "Review 02/10" (three notes for Claude and seven
findings on staging after R13). Artifact: https://claude.ai/artifact/8iHkhBkbfVApsDMvuqaRk8. Status: **draft**.
Touches `landing-and-ai-search` (the home sections, /sample's run, the free chart's fields),
`review-01-10` (the two differences, ADR-173) and the engine (Chiron).
**Brain:** Chiron's position changes in `packages/engine` (dry lab; the first Release's lab writes with it).
**Phone first**: every screen is designed at 390 px before desktop.

Not in this spec: the dashboard crash (finding 7). It is a broken build, ours to fix at once (R-12.5),
shipped as its own pull request outside any round (see "Done outside the round").

## Scope

### 1. The section after the hero (finding 6, Q1: B, cut to one line)
- The two-pillar band (`web/src/site/sections/Differences.tsx`, ADR-173) becomes one short section:
  eyebrow "Your report", heading "A personality report, not a horoscope", no lede, then **one** line from
  the sample run taken apart in three numbered notes, little text (the Owner: "simple"):
  1. **A moment you'd recognise.** The line itself, large, from the Relationships chapter ("How you love"):
     "You love with a quiet, steady loyalty that proves itself in what you build behind closed doors."
  2. **Checked against your chart.** Its placement evidence in the report's evidence look
     ("Sun 13.1° Taurus, 4th house").
  3. **Something to try.** One of that chapter's actions with the report's one tick box (ADR-172, local
     ticks, never sent): "Ask direct questions the moment you feel yourself guessing." and its why.
- No counts (chapters, words, claims) and no "How you think" card: the Claims section below already
  shows a placement in depth.
- The line, its placement row and the action are picked in `web/src/site/data/differences.ts` from the
  run (the relationships chapter's first claim with a placement in its evidence, the chapter's first action)
  and throw at import if missing, so a new sample run fails the prerender rather than quoting less.
- The circle pillar (`CirclePillar`, `SamplePair`) leaves the home page and /sample's closing band, which
  shows the same single section (ADR-173 "again at the end of /sample").
- The annotated line (the three notes) is also a format for a marketing post (`/marketing`), noted on
  the Content board, not built here.

### 2. "Add the people you care about" gains the gift and the share (finding 6)
- `YourPeople.tsx` keeps its look whole: the heading, the circle, Mira's card and the phone sheet are
  unchanged (the Owner: "that section was perfect").
- The lede becomes "Add your partner, parents, kids or friends. They show up around you on your
  dashboard, so you can tap anyone to see their chart."
- Two rows under it, in the section header's column, before the circle: **Gift them a report** ("They get a
  credit and write their own Personal report, with their own birth details.") and **Share reports with each
  other** ("Share yours, read theirs, and you each learn how the other works."), with the waiting gift's
  teal dashed ring and the indigo share mark. The dashboard's verbs (Gift a report, Share with).
- No third row about compatibility: "How the two of you get along" (`TwoCharts.tsx`) follows directly.

### 3. Remove "You get your credit back if something goes wrong" (finding 2)
- From the home page's facts (`sections/Method.tsx`) and /method's facts (`pages/MethodPage.tsx:187`).
  The two remaining facts sit in two columns on desktop (`.sd-facts`), one on a phone.
- /method's step 4 keeps its sentence on a chapter that can't pass. The refund rules (ADR-142) and the
  failure lines are unchanged.

### 4. Chiron (finding 3)
- The nodes stay as drawn (the Owner, 2026-10-02): the two circled symbols in Taurus and Scorpio are the
  North and South Nodes, not Chiron.
- `packages/engine/src/chartCalculation.ts` replaces the hand-made Kepler orbit with a committed table of
  Chiron's geocentric apparent ecliptic longitude of date from JPL Horizons (COMMAND 2060, CENTER 500@399,
  QUANTITIES 31), every 10 days from 1900-01-01 to 2101, interpolated (cubic); retrograde and speed come
  from the table. The generator script and its query are committed. Outside the range the chart omits
  Chiron rather than guess. No fallback formula: a two-body orbit drifts with Saturn's pull, so it is not
  a fix.
- Verified 2026-10-02 (claims re-fetched): the engine's J2000 mean anomaly is 187.41° where JPL's
  elements give 27.72° (Celestia's JPL-derived elements), and it subtracts astronomy-engine's equatorial
  Earth vector from an ecliptic one (astronomy-engine docs). A published Horizons table (Galaxia, 10-day,
  1900 to 2101) read byte for byte agrees with an independent JPL DE fixture (falcon-ephemeris) to 0.003°
  at 1990-01-01 12:00 (103.813°) and 2025-06-15 (26.276°), and gives 85.261° at 1987-12-30 04:30 (that
  project's own test: 85.26°). It puts Audrey Hepburn's Chiron at **40.04°, 10.0° Taurus, 4th house**;
  the engine says 7° Capricorn, 12th.
- Tests pin those four instants to within 0.05°. The table is made in the round from Horizons, which
  needs `ssd.jpl.nasa.gov` in the cloud environment's allowed domains (blocked today; the Owner adds it).
  If it is still blocked when the card starts, the Chiron card waits and the rest of the round goes on.
- Brain change: the dry lab runs in the round. Charts are stored per profile and revision
  (`chart_data`), so reports already written keep the old Chiron; before launch they are staging test
  reports only, so nothing is migrated.

### 5. One fast date field and one fast time field (findings 4 and 5, Q2)
- One shared `BirthDateField` and one shared `BirthTimeField` replace the native `type="date"` and
  `type="time"` inputs in `SkyForm`, `BirthFormPage` and `BirthTimeControl` (exact and give-or-take
  modes). No picker, no wheel, no month list: each is **one** text field typed straight through on the
  number pad (`inputmode="numeric"`, 16 px).
- **Date**: the separators fill in as you type, so "04051929" becomes "04 / 05 / 1929". The placeholder
  shows the order ("DD / MM / YYYY"). Once all eight digits are typed and valid, focus moves to the time
  field on its own. A readout under the field spells the date out ("4 May 1929"), so it can't be misread.
  Backspace walks back over a separator; pasting "1929-05-04" or "4/5/1929" in the field's order works.
- **Time**: one field the same way, "0300" becomes "03 : 00"; complete, focus moves to the place field.
  An AM/PM switch sits beside it only on a 12-hour clock; it takes a tap, and A or P typed in the field
  sets it too.
- **Order and clock by the browser's language** (`navigator.language`, read after hydration; the prerender
  draws DD / MM / YYYY and 24-hour): the order `Intl.DateTimeFormat(lang).formatToParts` gives (day first
  for en-GB, fr, de, sk; month first for en-US; year first for ja, zh, ko, en-CA), and the 12-hour clock
  where `resolvedOptions().hourCycle` is h11 or h12 (en-US, en-AU, en-IN), else 24-hour (en-GB, fr, de,
  sk). Never the visitor's location.
- Display text follows the same rule: the hand-built "3 am" (`SampleHead`, `Claims`) and the part-of-day
  labels in `birth-time.ts`.
- The API's fields are unchanged: `birthDate` "YYYY-MM-DD", `birthTime` "HH:MM" 24-hour.

### 6. /sample shows the latest run (finding 1, Q3)
- When the first Release passes, Audrey Hepburn's run from its lab (`MATRIX_CHARTS` includes her) is
  committed as `web/src/site/data/sample/audrey-hepburn.<release>.json`, without `foundation` and
  `meta.usage`, replacing r06. With it: `sample.test.ts`'s digest and claim count, `site.ts`'s `updated`,
  the four `HOME_CLAIMS` re-picked from chapters /sample prints whole (closes MB-134), and section 1's
  three cards re-picked.
- Every later Release that passes does the same, as a step of the Release's report. MB-101 closes.

### 7. The Owner's notes
- **N1** The /round skill: the R13-05 draft replaced `.claude/skills/round/SKILL.md` on the Owner's yes,
  2026-10-02 (closes MB-155).
- **N2** R13's words: approved as shipped (closes MB-156).
- **N3** The edge secret: `EDGE_PROXY_SECRET` is set in Vercel and in Railway's staging and production
  (the Owner, 2026-10-02). The card that reads it (MB-150) joins this round.

## Out of scope
- The dashboard crash (done outside the round, below).
- The wheel's nodes (unchanged, the Owner) and any other point on it.
- Translating the site; only the order and clock of dates and times follow the browser's language.
- MB-160's "every line" copy rides the same round if Q3 takes the default; it is its own row.

## Acceptance criteria
1. At 390 px on iPhone Safari and Chrome, no birth date or time field leaves its card on home, /sky, the
   birth form or the birth-time dialog; inputs are 16 px and open the number pad.
2. Typing "04051929" then "0300" fills the date and time without a tap between them and lands focus in
   the place field; the readout reads "4 May 1929".
3. With the browser in English (US), the date field reads MM / DD / YYYY and the time has AM/PM; in English
   (UK), French, German or Slovak DD / MM / YYYY and 24-hour; in English (Australia) DD / MM / YYYY with
   AM/PM; in Japanese YYYY / MM / DD. The value sent is "YYYY-MM-DD" and "HH:MM" in every case (unit tests
   over a list of languages, pasting included).
4. The prerendered home page shows DD / MM / YYYY and 24-hour; no hydration mismatch warning.
5. Home's first section after the hero is one heading and one annotated line: the line, its placement and
   one thing to try with its tick box, all byte-identical to the sample run; no counts. The circle pillar is
   gone from home and /sample.
6. "Add the people you care about" shows the two new rows; the circle, card and sheet look and work as
   before (a screenshot diff of the circle at 390 and 1440 px against main).
7. "You get your credit back if something goes wrong" appears nowhere on home or /method; the facts sit in
   two columns on desktop with no empty column.
8. Chiron is within 0.05° of the four verified instants (Audrey Hepburn 40.04°, 1987-12-30 85.26°,
   1990-01-01 103.81°, 2025-06-15 26.28°); the old Kepler code is gone; the dry lab is pasted into the
   round report.
9. After the first Release, /sample's head shows the Release's date and run; every home claim anchors on
   /sample.
10. The gate, the sentinel and site checks pass as usual.

## Screens
The artifact, revision 2: the section after the hero as chosen (one annotated line), the circle section
with its two new rows over the unchanged circle, the typed date and time fields on an iPhone and in an
English (US) browser, Chiron's real place, the facts with the line struck, the dashboard diagram.

## Done outside the round
- **The dashboard crash.** Dependabot's group bump (#86, 2026-10-02 10:55) moved the catalogue to React
  19.3.0 while `packages/api-client-react` kept 19.2.8 through `autoInstallPeers`, so pnpm installed two
  peer variants of `@tanstack/react-query` 5.103.2 and Vite bundled both. The provider in `App.tsx` and
  the generated hooks use different copies ("No QueryClient set"). Fix: `react` from `catalog:` as a dev
  dependency of the API client (and `integrations-openai-ai-react`), `@tanstack/react-query` added to
  `web/vite.config.ts`'s `dedupe`, the lockfile regenerated with pnpm, and a CI step that fails when
  the lockfile holds more than one peer variant of `@tanstack/react-query` or `react`.

## Answered (2026-10-02)
- Q1 B, cut to one line from "How you love" with its placement and one thing to try; no counts.
- Q2 By the browser's language, as one fast typed field each, not three boxes or a month list.
- Q3 Silent: the default, this round before the first Release, pricing to R15.
- The nodes stay; the secret is set; the /round skill is replaced.

## Decisions to record
1. The section after the hero is one heading and one line from the sample run, annotated as a moment you'd
   recognise, checked against your chart and something to try; the circle pillar leaves home and /sample
   (amends ADR-173).
2. "Add the people you care about" adds Gift them a report and Share reports with each other, in the
   dashboard's verbs, and keeps its look.
3. The home page and /method no longer promise the credit back; the refund rules stand (ADR-142).
4. Chiron comes from a committed JPL Horizons table, 1900 to 2101, interpolated; the hand-made Kepler
   orbit is retired with no fallback formula. Audrey Hepburn's Chiron is 10.0° Taurus, 4th house.
5. Birth date and time are each one typed field with auto separators and auto-advance; their order and
   clock follow the browser's language, never the location; the API's format is unchanged.
6. /sample shows Audrey Hepburn's run from the latest Release that passed; each passing Release
   refreshes it (closes MB-101).
7. The edge secret is `EDGE_PROXY_SECRET` in Vercel and in Railway's staging and production.
8. A lockfile with two peer variants of react or react-query fails CI.
9. The round order: R14 is this review with Chiron and the edge secret's card, then QA, then the first
   Release; pricing and launch become R15.
