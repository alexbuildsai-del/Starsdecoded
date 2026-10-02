# R14 plan — Review 02/10: one line after the hero, Gift and Share, no credit-back promise, Chiron from JPL Horizons, typed birth fields, the edge secret

Planned 2026-10-02 on `claude/ecstatic-noether-9n2lyc` (`main` at 54abba8 with PR #92, plus the lock ac00f2c and 00c27dc and the
rename fce297e) for the locked spec `review-02-10` (ADR-218 to 226; artifact https://claude.ai/artifact/8iHkhBkbfVApsDMvuqaRk8,
revision 2). **ADR-226** sets the order: R14, then QA-02 and the sentinel's audit of `main`, then the first Release (R11 to R14);
pricing and launch is R15 (`docs/rounds/R15-plan.md`, not touched here). **Done outside the round, no card:** the dashboard crash
(PR #92, cac82bf; ADR-225's CI step is `pnpm check:copies`), N1 the /round skill (MB-155 done), N2 R13's words (MB-156).
**/sample's refresh (spec §6) is a step of the first Release** (below), not a card. QA-01 (staging after R13) has no sev-1; its #2, #8
and #9 shipped in PR #91 with the gift reminder's limit (MB-153), and its other findings are Mailbox rows this plan takes or names. No
Mailbox row is `blocking`, and no Owner comment sits on ADR-218 to 226 or on the Mailbox rows this plan touches.
**Tiers:** 7 Opus, 7 Sonnet, no Haiku, and Opus for the contingent R14-C1. **Tags:** INTERNAL are R14-01, 10 and 14; every other card
is USER-FACING. **The brain changes twice** (R14-02 the engine's Chiron, R14-03 the brief's tie line; R14-C1 a third time if Round start
5 calls it): the dry lab runs in the round, natal fixture runs are read on staging, and the Release view's full lab and QA agent gate
production (R-4.4). **No schema change.** **The contract changes once** (R14-09). **Dependencies:** `@vercel/functions` 3.9.9 joins the
root for the edge middleware, and web's browser libraries move to dependencies at their versions (R14-01). No credential is needed
(`EDGE_PROXY_SECRET` is set in Vercel and both Railway environments; Horizons answered the planning session), nothing goes on GitHub, and
nothing reaches production in the round.

## Open Mailbox rows created more than 14 days ago (oldest first, ADR-186)
**2026-09-09:** MB-12 no error reporting or alerting · MB-19 no prompt version history · MB-20 the one e2e spec cannot pass, no lint
step · MB-21 variables missing from `.env.example` · MB-22 dead code left by the port · MB-30 the browser calls Nominatim and
timeapi.io. None blocks a card. Touched here: MB-21 (R14-14 documents `EDGE_PROXY_SECRET`; the legacy `AI_INTEGRATIONS_OPENAI_*` pair
stays), MB-22 (`/api/geocode` is kept and gains its two-letter rule, R14-09, since MB-30's server move needs it), MB-30 (the birth
form's date and time change here; the place lookup stays in the browser until R15, reading 1). MB-49 (created 2026-09-18 12:48 UTC)
passes 14 days during the round; R14-10 proves its route changes through the walk, its way. No row counts rounds: a row's age is its
Created time.

## Round start (the orchestrator)
1. Branch `round/R14` from this checkout (fce297e plus this plan's commit) and merge `origin/main` if Dependabot moved it; `git diff
   --stat main...HEAD` is then docs only (the lock, the rename, this plan).
2. ADR-218 to 226 are recorded and locked; the round adds no Decisions row. MASTERFILE 0.24 already says Chiron comes from Horizons (§1).
3. Builders cannot open claude.ai: extract the artifact's revision 2 screens, phone first then desktop, into the session scratchpad:
   the section after the hero (R14-04), the circle section's two rows (R14-05), the facts with the line struck (R14-06), the typed fields
   on an iPhone and in an English (US) browser (R14-07, 12). Where a builder's draft differs, the artifact wins and the report says so.
4. The dry lab's base: `git fetch origin report-lab/r06 && git checkout FETCH_HEAD -- fixtures/reports/` (never committed).
5. **MB-152's natal spot** (about 3 ¢): dispatch `report-lab.yml` with `campaign=natal`, `chart=inject-instruction`,
   `label=r14-inject` against staging and read the name in the prose. If any instruction is obeyed, R14-C1 joins group B.
6. `curl -sS -o /dev/null -w '%{http_code}' https://ssd.jpl.nasa.gov/api/horizons.api` (200 from the planning session, 2026-10-02).
   If it is blocked when R14-02 starts, R14-02 waits and the rest of the round goes on (Risk 9).

## What already shipped (checked at fce297e)
- **Met, and reused:** PR #92 (one react, one react-query, `pnpm check:copies` in CI); PR #91 (a name needs a letter, validation errors
  and unknown paths answer plain JSON, a gift reminder counts with the sends); `clientKey` as the one seam every per-address limit uses
  (`waitlist.ts:25`, `limits.ts:63`, the waitlist and CSP-report routes); `trust proxy` at one hop (`app.ts:62`); `HealthCheckResponse`
  in the contract; `PlaceField`'s `id` prop; `Checklist` with `localTicks`; the report's evidence look; `formatUpdated`; `CHART_VERSION`
  and the recompute in `profiles.ts:110`; `sample.test.ts`, which checks every stored placement against the computed chart; report-lab's
  `chart=` input; the CSP check that ends `build:web`; e2e's `BASE_URL` and site-checks running every spec in `e2e/tests/`.
- **Not met:** the Kepler orbit with a fixed `speed: 0.038` and `retrograde: false` (`chartCalculation.ts:578–622`); `EPHEMERIS` naming
  astronomy-engine alone (`:157`), printed in every footer and every report's methodology; `CHART_VERSION` 3, pinned in `engine.test.ts`
  and in `api/src/lib/chartCalculation.test.ts`; native date and time inputs in `SkyForm` (95, 114), `BirthFormPage` (168, no earliest
  date) and `BirthTimeControl` (83, 114); "3 am" built by hand twice (`SampleHead.tsx:34`, `Claims.tsx:63`); 12-hour `PART_LABELS`; two
  pillars in `Differences.tsx`, and the dashboard's empty Practising reading `DIFFERENCES.practice[0]`; the credit line in `Method.tsx:126`
  and `MethodPage.tsx:187`, `.sd-facts` at three columns (`site.css:229`); "Every line" (`site.ts:53`), "Every sentence shows"
  (`faq.ts:38`) and "Every sentence … has to point" (`MethodPage.tsx:143`); `clientKey` trusting anyone's `x-vercel-forwarded-for`; the
  brief's "Dominant element" by key order (`brief.ts:161`) and BalanceRail's (`BalanceRail.tsx:46`).
- **Found while planning:** (1) /sample's House 12 reading (r06) says "Saturn and Chiron here", where the new engine puts Chiron in the
  4th house; no stored claim cites Chiron, so `sample.test.ts` stays green, and the Release's refresh fixes the text (Risk 2). (2) The
  home lede, the FAQ answers and every page's `updated` feed JSON-LD, so R14-06 ends with `csp:write`. (3) `@vercel/functions` 3.9.9's
  own types: `next()` and `rewrite()` take `request.headers` for the call upstream, while their `headers` go to the visitor; vercel.com is
  blocked from cloud sessions, so nothing else about Vercel's routing was read (MB-167). (4) QA-01 #12's six test reports stay on
  staging (harmless). (5) The birth form accepts any past date, so a chart from before 1800 can reach every consumer without Chiron.

## Where the specs disagree, and how this plan settles it
1. **ADR-226** ("R14 is Review 02/10 with Chiron and the edge secret's card") against seven Mailbox defaults that say "R14", written
   before ADR-226 → reading 1, and the Owner's one ask.
2. **Spec §4's "nothing is migrated"** against R-3.2's recompute → both (reading 2); ADR-221 says the computation version bumps.
3. **MB-161's recommendation** (the brief and the prompts) against the smallest change that makes the brief true → reading 17.
4. **MB-30's default** ("left as is until the birth form is next touched") against MB-162's ("with MB-30's server move, before launch")
   → the form's date and time change here, the place lookup moves in R15 (reading 1).
5. **MB-165's "or retire the route"** and MB-22's "dead code" against MB-30's server move, which needs `/api/geocode` → kept, two letters.
6. **MB-152's default** (the spot in the staging confirmation) against "the card goes into R14" → the spot runs at Round start 5.
7. **Spec §5's display rule** names times only → dates in words keep the site's one style (reading 6).

## Goals
1. **Home says less, and only what is true** (spec §1 to 3, ADR-218 to 220): one annotated line after the hero, Gift and Share over
   the unchanged circle, no credit-back promise, and "every claim" rather than every line (MB-160, which the spec puts in this round).
2. **Chiron where JPL Horizons puts it** (spec §4, ADR-221): a committed table from 1800 to 2150, no fallback, five instants pinned,
   the dry lab in the round.
3. **A birth date and time typed straight through** (spec §5, ADR-222): one field each, in the reader's order and clock, 390 px first,
   the API's format unchanged.
4. **A forged address no longer dodges a limit** (spec §7 N3, ADR-224, MB-150): the API trusts Vercel's forwarded address only on a
   call that carries the edge secret.
5. **The first Release follows at once** (ADR-223, 226): QA-02 and the sentinel's audit of `main`, then the Release, with /sample's
   refresh as its step (spec §6), recorded here and not built.

## Preconditions
1. No builder starts before this plan's commit is pushed and Round start 1 to 4 and 6 are done; step 5's answer is needed before group B.
2. Builders read MASTERFILE §0, their card, and the spec sections, readings and pinned shapes it names.
3. **Single owners.** Group 0: root `package.json`, `web/package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml` → R14-01. Group A:
   `packages/engine/**`, `api/src/lib/chartCalculation.test.ts`, the new `web/src/lib/no-chiron.test.ts` → R14-02; `api/src/prompts/
   brief.ts`, `prompts.test.ts` → R14-03; `Differences.tsx`, `differences.ts` (+ test), `dashboard/Practising.tsx` → R14-04;
   `YourPeople.tsx` → R14-05; `Method.tsx`, `MethodPage.tsx`, `site.css`, `site.ts`, `faq.ts` (+ test), `PrivacyPage.tsx`, `vercel.json`
   → R14-06; `date-entry.ts`, `useEntryFormat.ts`, `BirthDateField.tsx`, `BirthTimeField.tsx`, `birth-time.ts` (+ tests) → R14-07;
   `PlaceField.tsx`, `SiteLayout.tsx` → R14-08; `openapi.yaml`, the generated files, `person-name.ts` (+ test), `contract-names.test.ts`,
   `routes/geocode.ts` → R14-09; `limits.ts` (+ test), `routes/profiles.ts`, `reports.ts`, `compatibility.ts`, `walk/loop.walk.ts` →
   R14-10; `BalanceRail.tsx`, `TriadPlate.tsx`, `leaders.ts` (+ test), `site/lib/learn.ts` (+ test), `LearnBirthTimePage.tsx` → R14-11.
   Group B: `SkyForm.tsx`, `BirthFormPage.tsx`, `BirthTimeControl.tsx`, `BirthTimeDialog.tsx`, `e2e/tests/birth-fields.spec.ts` →
   R14-12; `SampleHead.tsx`, `Claims.tsx`, `site/lib/readouts.ts` (+ test) → R14-13; root `middleware.ts` and root `tsconfig*.json`,
   `waitlist.ts`, `logger.ts` (+ tests), `routes/health.ts`, `.env.example`, `.github/scripts/security-probe.sh` → R14-14;
   `aiInterpretation.ts`, `pairInterpretation.ts`, `prompts/data.ts` → R14-C1. Every other file belongs to the one card that names it.
4. **R14-01 is the round's only change to the dependency tree.** A builder who needs a package stops and reports; a script line in a
   `package.json` needs no install.
5. Inside a group a card may land before one it imports (pinned shapes): a red intermediate is accepted until the group ends, and every
   group ends green. A builder who needs a pinned shape changed stops and reports (R-0.1).
6. **No card spends.** The orchestrator's two staging runs (Round start 5, about 3 ¢; Staging confirmation 3, about 15 ¢) are the
   round's spend.
7. No secret in the repo or on GitHub: `EDGE_PROXY_SECRET` is read, never written. Seams: `// MB-161 provisional` (R14-03), `// MB-160
   provisional` (R14-06), `// MB-163 provisional` (R14-08, 12), `// MB-157` and `// MB-165 provisional` (R14-09), `// MB-158`, `MB-159`
   and `MB-166 provisional` (R14-10), `// MB-124`, `MB-126` and `MB-165 provisional` (R14-11). Code cites ADR-218 to 226.
8. A builder commits as soon as its own tests pass: a container restart killed R13-01 before its commit (`docs/annex/lessons.md`).

## Readings pinned where the spec is silent
1. **The Mailbox's "R14".** MB-157, 158, 160 (which the spec also puts here), 163, 165 and 166 default to "R14's first group" and
   MB-159 to "built in R14", all written this morning before ADR-226 renumbered the rounds; they are small, so they ride this round,
   provisional, and the Owner's one ask can move all but MB-160. MB-161 ("R14 or the round after") rides because the brain changes here anyway; MB-124 and MB-126 ("the next UI
   round") ride because this is one. MB-144 and MB-148, whose "R14" is the payments round, follow payments to R15 (noted on both rows).
   MB-30 and MB-162 stay at their defaults: the zone lookup moves to the server before launch, in R15's plan.
2. **The chart version** becomes 4 (ADR-221, R-3.2): a new report computes afresh; a written report keeps the chart stored with it, so
   nothing is migrated (spec §4).
3. **`EPHEMERIS` names both sources** (R-4.1; §1, "every claim about method must be literally true"): it prints in every page's footer
   and in each new report's methodology. /method's step 1 stays as written, since it speaks of the Sun, Moon and planets.
4. **Outside 1800 to 2150** a chart has no Chiron and every consumer takes that; no form gains a new earliest date (SkyForm keeps 1900).
5. **First render.** The prerender and the first client render use DD / MM / YYYY and 24-hour; one hook reads `navigator.language`
   after hydration, so the server's markup and the first render always match.
6. **Dates in words** keep the site's one style, "4 May 1929" (`formatUpdated`), in every language, the readout under the field
   included: only the field's order follows the language, and month names stay English (spec Out of scope: no translation).
7. **Times in words**: 12-hour reads the site's "3 am" and "3:30 pm" with a no-break space, 24-hour reads "03:00"; the part-of-day
   choices follow ("Morning, 6 am to noon" or "Morning, 06:00 to 12:00").
8. **Focus** goes date → time → the place field, found by the `id` that `PlaceField` already takes; where no place field follows (the
   birth-time dialog) it goes to the next control. No field takes focus on load.
9. **Typing on a 12-hour clock**: an hour from 13 to 23 reads as that 24-hour time and sets PM, 00 reads as 12 AM, and the switch
   starts on AM.
10. **The circle section** changes its lede and gains two rows, nothing else; the screenshot match is the proof (acceptance 6).
11. **MB-160's words**: "Every claim in it shows which part of your chart it comes from." on home, the same idea in the FAQ and in
    /method's step 3, the third place, which QA-01 did not list (owner-playbook: check a new line against every section of the page).
12. **/sample's closing band** is the same `<Differences />`, so `SamplePage.tsx` needs no edit.
13. **The dashboard's empty Practising** quotes the home's new action (one look, ADR-172), no longer the Closing's money item.
14. **The edge.** The header is `x-edge-proxy-secret`, compared in constant time; `/api/healthz`'s `edge` says only whether this call
    carried it; the secret is never in a response or a log line; unset means `req.ip`, which with one trusted hop is the address
    Railway's proxy saw.
15. **MB-159**: one write per report a birth-time change passes, refused before any pass when that is over the limit; no report is ever
    skipped silently.
16. **MB-166**: regenerate needs "owner" from `natalReportAccess`; the pair picker needs any read access.
17. **MB-161**: the brief alone, with no prompt template or version change; a prompt rule (v10, with web's renderable list) follows only
    if the staging run still names a winner.
18. **MB-165 (1)**: /learn/birth-time reads the engine's own `holdsFrom` and `holdsTo`; the engine itself stays R14-02's.
19. **The Chiron table** is data the generator writes as compact integers and is committed; nothing fetches Horizons at build, in CI or
    at run time.

## Pinned shapes
- **Chiron** (R14-02): `packages/engine/src/chiron.ts` exports `CHIRON_SPAN = { from: "1800-01-01", to: "2150-01-01" }` and
  `chironAt(date: Date): { lon: number; speed: number } | null`; `CHART_VERSION = 4`.
- **Entry** (R14-07 → 12, 13): `web/src/lib/date-entry.ts` exports `type DateOrder = "dmy" | "mdy" | "ymd"`, `type Clock = 12 | 24`,
  `entryFormat(lang: string): { order: DateOrder; clock: Clock }`, `DEFAULT_ENTRY` (dmy, 24) and `clockWords(hhmm: string, clock: Clock):
  string`; `web/src/hooks/useEntryFormat.ts` exports `useEntryFormat(): { order: DateOrder; clock: Clock }`; `birth-time.ts` adds
  `partLabels(clock: Clock): Record<PartOfDay, string>`; `BirthDateField({ id, value, onChange, onComplete?, min?, max? })`, value
  "YYYY-MM-DD" or ""; `BirthTimeField({ id, value, onChange, onComplete? })`, value "HH:MM" or "".
- **Contract** (R14-09 → 14): `HealthCheckResponse.edge?: boolean`; the one name pattern adds `・` (U+30FB), U+3000 and U+200C;
  `GET /geocode`'s `q` takes `minLength: 2`.
- **Edge** (R14-14): header `x-edge-proxy-secret`; `cameThroughEdge(headers: IncomingHttpHeaders, secret = process.env.EDGE_PROXY_SECRET):
  boolean`; `clientKey(headers, ip)` keeps its signature.

## Parallel groups
**Group 0**, alone: R14-01, the round's one install, which R14-14's helper needs.
**Group A**, one message once 0 is green: R14-02 to R14-11. R14-09 adds the `edge` field for R14-14; R14-07's shapes are pinned for
group B; R14-06 runs `csp:write` last.
**Group B**, one message once A is green: R14-12, R14-13, R14-14, and R14-C1 if Round start 5 called it.
**Group C, contingent:** one Sonnet card per page family for what the preview's site checks find (/web-taste; a budget is never
loosened), and one Opus card per blocking sentinel finding, each before the merge.
**Tiers:** Opus R14-01, 02, 03, 07, 09, 10, 14 (and C1); Sonnet R14-04, 05, 06, 08, 11, 12, 13; Haiku none, since no card is only
mechanical.
**The tester** runs after group A (R14-02, 07, 09, 10, 11) and after group B (R14-14), over their files under `api/src/lib/`,
`packages/*` and `web/src/lib/`. R14-03's brief lives in `api/src/prompts/` and carries its own tests.
**If R14 must shrink:** R14-11, R14-10 and R14-08 move to R15 first, then R14-03 (the Release's lab then reads Chiron alone); R14-01
keeps only the helper and R14-09 only the `edge` field, which R14-14 needs. The spec's cards stay.

---

## Group 0 — the round's one install

### R14-01 — The browser's libraries audited, a way past 7 days for a security fix, the edge helper (INTERNAL) — provisional MB-157
Tier: opus — supply chain is security, and the helper runs at the Vercel edge in front of every API call.
Objective: `pnpm audit --prod` reads what the browser runs, a security fix has a named way past the 7-day rule, and R14-14's helper is in.
Files: root `package.json`; `web/package.json`; `pnpm-workspace.yaml`; `pnpm-lock.yaml`.
Refs: ADR-200, 224, 225; R-7.4; MB-157 (2, 3), MB-150; R13-02's way.
Done when:
- Every library the browser bundle imports moves from web's devDependencies to dependencies at the same version; build, type and test
  tools stay dev; the report lists each move.
- `minimumReleaseAgeExclude: []` sits under `minimumReleaseAge` with one comment: a package an advisory names may be listed for its fix,
  with the date, and leaves after 7 days.
- The root gains `@vercel/functions` 3.9.9 (published 2026-09-22, its `@vercel/oidc` 3.8.9 the same day); nothing else enters.
- `pnpm audit --prod --audit-level high` clean by in-range updates or a named override (a new major stops the card); `pnpm check:copies`
  green; `pnpm install --frozen-lockfile` clean twice; typecheck and both builds green.

---

## Group A — the review's cards, and the Mailbox's R14 defaults

### R14-02 — Chiron from NASA JPL Horizons (USER-FACING · brain · tester)
Tier: opus — the brain (`packages/engine`), and every chart's Chiron moves.
Objective: Chiron sits where JPL Horizons puts it from 1800 to 2150 and nowhere outside; the hand-made Kepler orbit goes, with no fallback.
Files: `packages/engine/src/chartCalculation.ts`, `engine.test.ts`, new `chiron.ts` (+ test), `chironTable.ts`; new `packages/engine/scripts/
chiron-horizons.ts` and its `chiron:table` script line; `api/src/lib/chartCalculation.test.ts`; new `web/src/lib/no-chiron.test.ts`.
Refs: ADR-221, 226; spec §4, acceptance 8; §1, R-3.1, R-3.2, R-4.1, R-4.4; readings 2 to 4, 19; pinned Chiron; Round start 6.
Done when:
- First, Horizons answers; if blocked, the card waits and says so, and the round goes on.
- The script, its query in its header, asks for COMMAND 2060, CENTER 500@399, QUANTITIES 31, every 10 days from 1800-01-01 to
  2150-01-01, and writes compact integers (gzip size in the report); run once and committed, never at build or in CI.
- `chironAt` interpolates cubically, with speed and retrograde from the table and null outside the span; the Kepler block is gone.
- Tests pin the five instants within 0.05° (40.0382, 352.3275, 85.2601, 103.8132, 26.2791) and the table's nodes exactly; a 1799 and a
  2151 chart carry no Chiron, which the API's brief, traditional factors and overlays and the web's wheel, occupants and orrery all take.
- `CHART_VERSION` 4 in both tests and no other pin of 3; `EPHEMERIS` names Horizons for Chiron (/ux-copy, listed for the Owner).
- The gate's dry lab shows Audrey Hepburn's Chiron at 10.0° Taurus, 4th house; natal fixture runs on staging (Staging confirmation 3).

### R14-03 — A tie names no winner in the brief (USER-FACING · brain) — provisional MB-161
Tier: opus — the brain: the brief decides what the writer may say about a chart.
Objective: when two or more elements (or modalities) share the top count, the writer is told none leads, so no report names a strongest one.
Files: `api/src/prompts/brief.ts`; `api/src/prompts/prompts.test.ts`.
Refs: ADR-81, 221; R-4.4, R-5.3, R-5.5; MB-161, MB-124; QA-01 #4; reading 17.
Done when:
- DISTRIBUTION says "Dominant element X" only when X leads alone; on a shared top it names the tied ones and says none leads; the same
  for modality. The engine's `dominance` is untouched (R14-02 owns the engine).
- Tests: Audrey Hepburn's computed chart (fire, earth and water at 3 each) and a chart with one leader.
- No prompt template or version changes; the gate's dry lab shows her new line; on staging her natal fixture run has no sentence naming a
  strongest element (Staging confirmation 3). If it still has one, a prompt rule at v10 follows before the Release.

### R14-04 — One annotated line after the hero (USER-FACING)
Tier: sonnet — one section of one page, from the artifact, with its data test, in one package.
Objective: the band after the hero is one heading and one line from the sample run, taken apart in three short notes (the Owner: "simple").
Files: `web/src/site/sections/Differences.tsx`, `web/src/site/data/differences.ts` (+ test); `web/src/components/dashboard/Practising.tsx`.
Refs: ADR-218, 172, 173, 178; spec §1, acceptance 5; R-3.1; MB-93; readings 12, 13; the artifact's section (Round start 3).
Done when:
- Eyebrow "Your report", heading "A personality report, not a horoscope", no lede, then three numbered notes: "A moment you'd recognise."
  (the line, large), "Checked against your chart." (its placement in the report's evidence look) and "Something to try." (the action with
  the report's one tick box, local ticks never sent, and its why).
- `differences.ts` picks the relationships chapter's first claim with a placement in its evidence and the chapter's first action, and
  throws at import if either is missing; the test pins today's three byte for byte ("You love with a quiet, steady loyalty…", "Sun 13.1°
  Taurus, 4th house", "Ask direct questions the moment you feel yourself guessing.").
- No counts; the circle pillar, its sample pair and whatever only they imported (`SCENES`, `sceneRows`, the band's MB-93 seam) go; home
  and /sample's closing band render the one section; the dashboard's empty Practising quotes the same action (ADR-172).
- 390 px before 1440 px; /web-taste and /ux-copy; the prerender is clean.

### R14-05 — Gift and Share in "Add the people you care about" (USER-FACING)
Tier: sonnet — a lede and two rows in one existing component.
Objective: the circle section names the two things a reader can do for the people in it, and otherwise looks exactly as it does.
Files: `web/src/site/sections/YourPeople.tsx`.
Refs: ADR-219, 120, 181; spec §2, acceptance 6; reading 10; the artifact's circle section (Round start 3).
Done when:
- The lede is the spec's two sentences; under it, in the header's column and before the circle, "Gift them a report" with its line and
  the waiting gift's teal dashed ring, and "Share reports with each other" with its line and the indigo share mark.
- No third row: "How the two of you get along" follows as today.
- The heading, circle, Mira's card and phone sheet are untouched: screenshots of the circle at 390 and 1440 px on `vite preview` match
  main's, attached to the card's report.
- /web-taste; 390 px first; styled with utilities in this file (`site.css` is R14-06's).

### R14-06 — The site promises only what it does (USER-FACING) — provisional MB-160, MB-157
Tier: sonnet — copy and one style rule across the site's pages, in one package.
Objective: no page promises the credit back, says every line or sentence is sourced, or gets the cookie's year wrong.
Files: `web/src/site/sections/Method.tsx`; `web/src/site/pages/MethodPage.tsx`; `web/src/site/site.css`, `site.ts`; `web/src/site/data/
faq.ts` (+ test); `web/src/pages/legal/PrivacyPage.tsx`; `vercel.json` (`csp:write` only).
Refs: ADR-220, 142, 116, 117; spec §3, acceptance 7; MB-160, MB-157 (4), MB-91; reading 11.
Done when:
- "You get your credit back if something goes wrong" leaves home's and /method's facts, with both MB-91 seams; /method's step 4 keeps its
  sentence and seam; `.sd-facts` is two columns on desktop and one on a phone, with no empty column.
- Home's lede, the FAQ's "What is a Personal report?" and /method's step 3 say every claim, not every line or sentence, shows its part of
  the chart (MB-160), through /ux-copy.
- The privacy page says the cookie lasts a year from the last visit (MB-157).
- Each page whose words change in R14 gets today's `updated` (home, /sky, /method, /faq, privacy, /learn/birth-time; /sample's waits for
  the Release); `csp:write` once at the end; `build:web`'s CSP check green; the prerendered home and /method hold none of the struck line.

### R14-07 — One typed date field and one typed time field (USER-FACING · tester)
Tier: opus — a new input flow on the way to every report (rubric: a new screen or flow), parsed by language and safe to hydrate.
Objective: a birth date and time go in as fast as they can be typed, in the reader's order and clock, and leave as "YYYY-MM-DD" and "HH:MM".
Files: new `web/src/lib/date-entry.ts` (+ test), `web/src/hooks/useEntryFormat.ts`, `web/src/components/BirthDateField.tsx` and
`BirthTimeField.tsx` (+ tests); `web/src/lib/birth-time.ts` (+ test).
Refs: ADR-222, 171; spec §5, acceptance 2 to 4; §9 phone first; readings 5 to 9; pinned entry; the artifact's fields (Round start 3).
Done when:
- One text field each, `inputmode="numeric"`, 16 px, no picker: "04051929" reads "04 / 05 / 1929" as typed, the placeholder shows the
  order, Backspace walks back over a separator, and a complete valid date fires `onComplete`; "0300" reads "03 : 00" the same way.
- Pasting "1929-05-04", or "4/5/1929" in the field's order, fills it; an impossible date never reaches `onChange`; readout "4 May 1929".
- On a 12-hour clock an AM/PM switch sits beside the time (a tap; A or P typed sets it); the value is always 24-hour.
- `entryFormat` reads Intl only (formatToParts, hourCycle), never location; its tests over en-US, en-GB, fr, de, sk, en-AU, en-IN, ja, zh,
  ko and en-CA match the spec's table, pasting included (acceptance 3).
- `useEntryFormat` gives DD / MM / YYYY and 24-hour on the server and the first render, the browser's after hydration; `partLabels(clock)`
  joins `birth-time.ts`, whose `PART_LABELS` becomes the 24-hour set. Labels and errors are announced; every word passes /ux-copy.

### R14-08 — The place field and the menu by keyboard (USER-FACING) — provisional MB-163
Tier: sonnet — accessibility fixes in two existing components, in one package.
Objective: QA-01's keyboard findings (#6, #7) close on the place field and the header menu.
Files: `web/src/components/PlaceField.tsx`; `web/src/site/SiteLayout.tsx` (the menu only).
Refs: MB-163, MB-162; QA-01 #6, #7; agent-roster scope 9 (the keyboard pass); §9.
Done when:
- A suggestion picked with Enter returns focus to the input; Escape closes the list and keeps focus there; Search stays focusable while a
  search runs (`aria-disabled`, not `disabled`).
- "No matching places found" and "Search failed" are announced (`role="alert"` or a live region).
- The header menu closes on Escape and returns focus to its summary.
- The input keeps its `id`, which R14-12 focuses; the zone lookup is untouched (MB-162 waits for R15).
- axe stays clean; a keyboard pass on `vite preview` is written up in the card's report.

### R14-09 — The contract: names as written, two letters to search, the edge flag (USER-FACING) — provisional MB-157, MB-165
Tier: opus — the contract spans three packages (rubric: more than one package).
Objective: a Japanese or Persian name goes in as written, a one-letter place search is refused at the door, and healthz can say whether
a call came through the edge (R14-14).
Files: `packages/api-spec/openapi.yaml`; the generated client and zod files (codegen only); `web/src/lib/person-name.ts` (+ test);
`api/src/contract-names.test.ts`; `api/src/routes/geocode.ts`.
Refs: ADR-202, 224; R-7.2; MB-157 (1), MB-165 (2), MB-22, MB-30; pinned contract.
Done when:
- The one name pattern also takes ・ (U+30FB), the ideographic space (U+3000) and ZWNJ (U+200C), still needing a letter and no space at
  either end; the test takes "山田・太郎", "山田　太郎" and a Persian name joined by a ZWNJ, and still refuses a digit, `<`, a line break,
  61 letters and a name of spaces or joiners alone.
- `GET /geocode`'s `q` has `minLength: 2`; one letter answers 400 in the plain JSON shape; the route stays (MB-30's move needs it).
- `HealthCheckResponse` gains an optional `edge: boolean`.
- Codegen twice, no diff; `person-name.ts` carries the same pattern string, which its test reads from `openapi.yaml`.

### R14-10 — Writes count what they spend, and access.ts decides who may (INTERNAL · tester) — provisional MB-158, MB-159, MB-166
Tier: opus — limits, spend and ownership (rubric: money, access).
Objective: a request that runs N passes counts N writes, a request dropped before it spends holds no count, and regenerate and the pair
picker ask `access.ts`.
Files: `api/src/lib/limits.ts` (+ test); `api/src/routes/profiles.ts` (the birth-time PATCH); `api/src/routes/reports.ts` (regenerate);
`api/src/routes/compatibility.ts` (`readableNatal`); `api/src/walk/loop.walk.ts`.
Refs: ADR-139, 140, 199; R-3.6, R-6.1; MB-158, 159, 166, 49; readings 15, 16.
Done when:
- The birth-time PATCH takes one write per report it will pass and, when that is over the limit, answers the usual 429 before any pass
  starts; no report is skipped silently.
- Staging's shared signed-out count is given back from the route's own status, not on `finish`; production is unchanged.
- Regenerate runs only when `natalReportAccess` is "owner", the picker's `readableNatal` only when it is not null.
- Tests drive the counts in-process (R13-08's way); the walk adds a signed-out browser refused when it regenerates or pairs a report its
  subject's account has claimed, and a birth-time change over two reports counting two; the walk passes twice.

### R14-11 — Three pictures that match the chart (USER-FACING · tester) — provisional MB-124, MB-126, MB-165
Tier: sonnet — three small fixes to existing components and one helper, in one package, with tests.
Objective: a tie reads as a tie, the Moon's day arc shows, and /learn/birth-time's minutes are the engine's.
Files: `web/src/components/report/BalanceRail.tsx`, `TriadPlate.tsx`; new `web/src/lib/leaders.ts` (+ test); `web/src/site/lib/learn.ts`
(+ test); `web/src/site/pages/LearnBirthTimePage.tsx` if the fix needs it.
Refs: ADR-171, 172; §9; MB-124, 126, 165 (1), 161; reading 18.
Done when:
- BalanceRail names every element and modality sharing the top count (Audrey Hepburn: fire, earth and water), from the counts it already
  has; a single leader reads as today.
- TriadPlate draws the Moon's band where the Moon's picture does not cover it, on the dashboard card and on home's birth-time plates.
- /learn/birth-time's window is the engine's `holdsFrom` to `holdsTo`, the pair `POST /api/horizon/preview` returns for that birth (a
  test pins it); the engine is untouched.
- /web-taste and /ux-copy; 390 px first; new words listed for the Owner.

---

## Group B — the fields in the forms, times in words, the edge secret

### R14-12 — The forms take the typed fields (USER-FACING)
Tier: sonnet — R14-07's components wired into three existing forms, in one package.
Objective: home, /sky, the birth form and the birth-time dialog take a date and time straight through to the place field.
Files: `web/src/site/components/SkyForm.tsx`; `web/src/pages/BirthFormPage.tsx`; `web/src/components/BirthTimeControl.tsx`,
`BirthTimeDialog.tsx` (focus only); new `e2e/tests/birth-fields.spec.ts`.
Refs: ADR-222, 172; spec §5, acceptance 1, 2, 4; MB-163 (the toggle); readings 5 to 9; pinned entry.
Done when:
- No `type="date"` or `type="time"` input remains; SkyForm keeps 1900 to today and the birth form today as its last day; the exact and
  give-or-take modes both use `BirthTimeField`; the part-of-day choices read `partLabels(clock)`.
- "04051929" then "0300" lands focus in the place field by its id, with no tap; in the dialog, on its next control.
- Each form still sends "YYYY-MM-DD" and "HH:MM" (a test per form); "This is my natal chart" carries `aria-pressed` (MB-163).
- The spec runs on `vite preview` at 390 px in en-US, en-GB and ja on home and /sky: placeholders and AM/PM as the table says, each field
  inside its card, no hydration warning; site-checks runs it on every preview (public pages only). The birth form and dialog get the same
  look on the dev server where it serves them; otherwise the round report hands them to QA-02.

### R14-13 — Times printed in the reader's clock (USER-FACING)
Tier: sonnet — display strings in existing components and one site helper, in one package.
Objective: a time the site prints follows the fields' clock: "3 am" in an English (US) browser, "03:00" in an English (UK) one.
Files: `web/src/site/components/SampleHead.tsx`; `web/src/site/sections/Claims.tsx`; `web/src/site/lib/readouts.ts` (+ test).
Refs: ADR-222; spec §5 (display text), acceptance 4; readings 5 to 7; pinned entry.
Done when:
- Both hand-built `clockWords` go; each place reads R14-07's `clockWords(hhmm, clock)` with `useEntryFormat()`; Claims' sentence is built
  at render, not at import.
- The readouts' part-of-day words use `partLabels(clock)`.
- The prerendered home and /sample print 24-hour; in an en-US browser they read "3 am" after hydration, with no mismatch warning
  (checked on `vite preview`).
- Dates keep the site's one style ("4 May 1929"); nothing else on the pages moves.

### R14-14 — The edge secret read (INTERNAL · tester)
Tier: opus — security across the Vercel edge and the API (rubric: anything security, more than one package).
Objective: MB-150 closes: a per-address limit keys on the visitor's address only when the call came through our Vercel edge.
Files: new root `middleware.ts` and its place in the root `tsc --build`; `api/src/lib/waitlist.ts`, `logger.ts` (+ tests);
`api/src/routes/health.ts`; `.env.example`; `.github/scripts/security-probe.sh`.
Refs: ADR-224, 197 to 199, 201; MB-150, 167, 21; R-3.5, R-7.4, R-7.5; reading 14; pinned edge and contract.
Done when:
- `middleware.ts` (matcher `/api/:path*`) sets `x-edge-proxy-secret` from `EDGE_PROXY_SECRET` through `next({ request: { headers } })`
  from `@vercel/functions/middleware`, never `init.headers` (those reach the visitor); unset, it sets nothing; its test proves both.
- `cameThroughEdge` compares in constant time; `clientKey` trusts `x-vercel-forwarded-for` only then, else `req.ip`; tests: match,
  mismatch, missing, unset and a forged forwarded header; the limits, the waitlist and CSP reports all inherit it through `clientKey`.
- The logger redacts the header; `/api/healthz` sends `edge` (R14-09's field); `.env.example` lists `EDGE_PROXY_SECRET` with no value.
- The probe's `full` mode asserts `edge: true` through the web host; shellcheck clean. The first Release waits for it on staging (MB-167).

### R14-C1 — Typed names out of model text before a retry (USER-FACING · brain) — contingent, provisional MB-152
Tier: opus — the brain: what goes back into a prompt on a retry or a repair.
Objective: only if Round start 5 shows an instruction obeyed: no name a reader typed reaches a prompt outside its data block.
Files: `api/src/lib/aiInterpretation.ts`, `pairInterpretation.ts`; `api/src/prompts/data.ts` (+ tests).
Refs: ADR-202; R-4.4, R-5.5; MB-152; security scope 7, 8.
Done when: model text that goes back into a prompt (YOUR LAST REPLY, PROSE AS WRITTEN, chapter 07's tail, the foundation JSON) carries
a typed name as A, B or inside a data block; tests plant the three injection names; the gate's dry-lab injection table is clean; the
inject-instruction natal run on staging obeys nothing (Staging confirmation 3).

---

## After the builders: the orchestrator's steps, not cards
1. **The tester** after group A and group B, over each group's changed files under `api/src/lib/`, `packages/*` and `web/src/lib/`. A
   failing test it writes is a fix for that card.
2. **The gate:** `pnpm install --frozen-lockfile` · typecheck · `build:web` (ending in the CSP check) · `build:api` · unit tests ·
   `pnpm check:shipped` · `pnpm check:copies` · `pnpm audit --prod --audit-level high` · codegen twice, no diff · the walk twice · the
   dry lab: `pnpm report:lab --dry --base r06`, then `--pair curie-winfrey` under each lens, with the injection table clean. Paste into
   the report the Chiron lines (Audrey Hepburn 10.0° Taurus, 4th house; Marie Curie 22.3° Pisces) and her new distribution line.
3. **The sentinel** on `main...round/R14`: a blocking finding becomes a Group C card and the sentinel re-reads the fix; the rest become
   Mailbox rows.
4. **The pull request:** CI and the site checks on its preview (Lighthouse with the Chiron table in the bundle, axe, the birth-fields spec,
   the probe's web half). A first site-checks failure becomes Group C, never a loosened budget. Merge once green (R-12.5).
5. **After the merge:** the smoke on `main` with the probe's full half, the staging confirmation below, `/qa` on staging writing
   `docs/qa/QA-02.md` (MB-164's default: the trusted Playwright profile first), then the sentinel's full audit of `main`. The Owner gets
   the staging URL, QA-02 and three lines together (ADR-194).

## Staging confirmation, after the merge and before the first Release
1. The smoke on `main` is green, the probe's full half now asserting `edge: true` through the web host (MB-167).
2. **The edge** (free): 61 `POST /api/horizon/preview` straight to Railway staging, each with a different forged `X-Vercel-Forwarded-For`;
   the 61st answers 429.
3. **Fixture runs** (about 15 ¢ on B): `report-lab.yml`'s natal campaign. The orchestrator reads Audrey Hepburn's Chiron (Taurus, 4th
   house) and Marie Curie's (Pisces) in the prose and finds no sentence naming Audrey's strongest element (MB-161); with R14-C1, the
   inject-instruction run again.
4. **The fields:** QA-02 types "04051929" and "0300" on home, /sky and the birth form at 390 px, and plays the keyboard pass on the place
   field (MB-163).
5. **/sample** still prints r06, its House 12 reading naming Chiron: expected until the Release's refresh (Risk 2).

## Production after the round: the first Release and /sample's refresh
Nothing ships to production in the round. Before the first Release: QA-02 on staging and the sentinel's full audit of `main` (ADR-193).
The first Release brings R11 to R14; the brain changed in R12, R13 and R14, so the Release view runs the full lab on the five matrix
charts and the curie-hepburn pair, the gate against r06 and the QA agent, within `LAB_BUDGET_USD` (R-4.4). MB-128 and 129 apply at
their defaults; MB-127 and 141's words ship as written. **The Release's step (spec §6, ADR-223)**, once it passes: commit Audrey
Hepburn's run from its lab as `web/src/site/data/sample/audrey-hepburn.<release>.json`, without `foundation` and `meta.usage`, replacing
r06; `sample.test.ts`'s digest, claim count and marked counts; `site.ts`'s `updated` for /sample; the four `HOME_CLAIMS` re-picked from
chapters /sample prints whole (MB-134 done); the line, placement and action re-picked by R14-04's rule, its test's words updated;
`csp:write`; then a Release of that commit the same day (no brain change, so no lab), so production's /sample carries r06's House 12
line for hours, not days. MB-147's seven days start at the first Release; the bible's release log follows it (R-8.1).

## Risks
1. **Report content changes twice (R-5.5):** Chiron's sign and house in every chart (Audrey Hepburn from 7° Capricorn, 12th house to
   10.0° Taurus, 4th; Marie Curie from Cancer to 22.3° Pisces), and no strongest element on a tie (MB-161). The dry lab runs in the round,
   fixture runs are read on staging, and the Release's full lab gates production; written reports keep their stored chart.
2. **/sample until the refresh:** r06's House 12 reading names Chiron where the wheel no longer draws it, on staging from the merge
   and on production from the first Release until the refresh's Release the same day. `sample.test.ts` cannot catch it (no stored
   claim cites Chiron); this note does.
3. **The table's weight:** every page that computes a chart carries it (home's sky, /sky, /sample, /method, the learn pages, the app).
   Compact integers, its gzip size in R14-02's report; the preview's Lighthouse budgets decide, and a miss goes to Group C (load it
   lazily), never a loosened budget.
4. **New dependency:** `@vercel/functions` 3.9.9 and `@vercel/oidc` 3.8.9 at the root, for the middleware. Web's browser libraries move
   to dependencies at the same versions, so `pnpm audit --prod` reads them for the first time and may ask R14-01 for in-range updates.
5. **The edge (MB-167):** Vercel's routing middleware is new here and Vercel's docs are unreachable from cloud sessions; the API half is
   unit-tested, the Vercel half proven only on staging after the merge. Until `edge: true`, staging's per-address limits key on Vercel's
   own addresses, so every visitor shares one count; the first Release waits for it, since production's waitlist limit uses the same key.
   If staging says false, the middleware rewrites `/api` to Railway itself, on a follow-up branch before the Release.
6. **The contract changes once** (R14-09): the name pattern, geocode's two letters, healthz's `edge`; codegen twice; Orval's `RegExp` and
   the `u` flag as R13-14 settled them.
7. **CSP hashes:** R14-06 moves JSON-LD (home's lede, the FAQ, `updated` dates) and runs `csp:write`; a card whose change moves JSON-LD
   says so, and the orchestrator runs `csp:write` again at the group's end (R13's risk 6).
8. **User-visible without a locked spec:** the footer's ephemeris line, BalanceRail's tie, TriadPlate's arc, the place field's announced
   lines, MB-160's words on three pages, the privacy line, names newly accepted, the 12-hour style, and the field's placeholder and
   readout words. Each passes /ux-copy (and /web-taste where drawn) and is listed for the Owner.
9. **Horizons access:** reachable today. If it is blocked when R14-02 starts, the card waits; if it is still blocked at the gate, the
   round merges without it and R14-02 lands on its own branch before the first Release, whose lab must read the new Chiron (ADR-221,
   226). The allowed domain is the Owner's setting, so he hears it then.
10. **Escalated two rounds running:** none (R13 had none; R12 kept no Spend line).
11. **Lessons seen once that this plan guards:** a version bump pinned outside the card's files (R13-12) → R14-02 owns both
    `CHART_VERSION` tests and greps for a third; a restart before a commit (R13-01) → builders commit as their tests pass (precondition 8).
12. **Size and spend:** 14 cards in three groups plus Group C; about 3 ¢ at Round start and 15 ¢ on staging; the Release's lab after.

## Questions raised (Notion, 2026-10-02)
- **Raised before building:** **MB-167** the edge header must reach Railway through Vercel's `/api` rewrite, which shows only on staging
  after the merge (launch; default: the first Release waits for `edge: true`, and the middleware rewrites `/api` itself if it never comes).
- **Updated now:** **MB-144** and **MB-148** (their "R14" is the payments round, now R15, ADR-226); **MB-150** (R14-14, MB-167);
  **MB-152** (the natal spot moves to Round start 5; the pair half waits for a pair fixture that carries the name).
- **At the close:** the rows built at their defaults (MB-124, 126, 157 to 161, 163, 165, 166) marked done, each seam tagged until then;
  MB-91 (two of its three seams leave with the credit line; /method's step 4 and the failure lines wait for hard credits in R15); MB-93
  (the band's seam goes, the row stays for /compatibility); MB-134 (done at the Release's refresh); MB-30 and MB-162 (R15's plan); one
  row for R14's new words.
- **Read at their defaults, untouched:** MB-142 and 143 (the writers' lengths, the room idiom: the Release's lab measures them), MB-145
  and 146 (the cap, the preview's limit), MB-151, MB-154, MB-164 (QA-02 tries the trusted profile).

## For the Owner (one ask)
Nothing blocks the round: approving this plan starts it (§11.2).
1. **QA-01's and the sentinel's small fixes ride R14** (R14-03, 08, 10 and 11, R14-06's privacy line, and the halves of R14-01 and
   R14-09 that the edge does not need; MB-124, 126, 157 to 159, 161, 163, 165, 166). Their Mailbox defaults say "R14", written this morning before R14 became this review. They run beside the review's
   cards, so the first Release opens production with QA-01's findings fixed and nothing old left for the sentinel to find. One of them
   changes report content: on a chart whose elements tie, the report stops naming a strongest one (Audrey Hepburn's report says "Fire is
   the strongest element" with fire, earth and water at 3 each); the dry lab and a staging run check it. Recommendation: yes, in R14. If
   silent: they ride R14; a no moves them to R15's first group.

## Close (the orchestrator)
- **Report** (at most 60 lines): every line tagged; the Spend line; the dry lab with Chiron's lines and the tie line; the tester and the
  sentinel; QA-01's findings closed, by card.
- **`docs/annex/lessons.md`:** one line per cause of each gate failure, escalation, sentinel finding and QA sev-1; a second sighting of
  R13-12's or R13-01's cause promotes it into its agent file.
- **Decisions:** none; ADR-218 to 226 are recorded.
- **MASTERFILE 0.25:** R-7.5 adds that a per-address limit trusts Vercel's forwarded address only on a call carrying `EDGE_PROXY_SECRET`
  (ADR-224).
- **CLAUDE.md** (at its budget, lines rewritten in place): the current focus (R14 shipped; QA-02, the sentinel's audit and the first
  Release with /sample's refresh next; then R15).
- **INDEX:** review-02-10 built; the code map gains `chiron.ts`, `chironTable.ts` and its script, `date-entry.ts`, `useEntryFormat`,
  `BirthDateField`, `BirthTimeField`, `leaders.ts` and the root `middleware.ts`; the QA line names QA-01 and QA-02; Decisions 226.
- **Mailbox** as above. The Owner gets the staging URL, QA-02 and three lines: (1) home on your phone: one line after the hero, Gift
  and Share over the circle, two facts; (2) type 04051929 then 0300 on the birth form with no tap between them (an English (US) browser
  shows MM / DD / YYYY with AM/PM); (3) /sample's wheel puts Audrey Hepburn's Chiron at 10° Taurus in the 4th house (her House 12
  reading still names it until the Release).
