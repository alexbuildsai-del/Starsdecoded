# R12 plan — Review 01/10: the dashboard as a home, one scene per chapter, new names and prices, and production's writers on Sol and Luna

Planned 2026-10-01 on `claude/confident-archimedes-lfnc4w` (`main` at acf281f, fast-forwarded onto the Owner's lock branch
`claude/determined-hawking-egfvkp` at 37392b8) for the locked spec `review-01-10` (ADR-168 to 183; artifact
https://claude.ai/artifact/7sRXjmJcybAmnQHrbxJ5Rc, revision 4; its scene table, the rest of its section 04 and its "Noted, not
changed" list were extracted to the session scratchpad, and the noted list stays out). **The Owner, 2026-10-01:** "lets plan this
claude/determined-hawking-egfvkp and Sol plans only: sol on the foundation, luna on everything else for the brain/prose". So the
slug is `review-01-10` alone, and production's writers move to the lab's mix B (ADR-184). The same day the Owner moved the QA
agent off gpt-5.2 too (the vocabulary job follows on the coordinator's recommendation; 5.2 stays in the catalogue as the lab's
control) and set the voice, verbatim in ADR-185: "two friends talking over coffee", neither too high nor too low. Pricing-and-launch's remainder
(Stripe, checkout, credits hard, the loop study, `LAUNCHED`) is not here.
**Numbering: this is R12**, the next number; the deferred pricing-and-launch plan moved to `docs/rounds/R13-plan.md` (banner
only), since no Mailbox or Decisions row binds the number to it (MB-91's default says "R12" and gets a note).
**Tags:** every card is USER-FACING except R12-03, R12-13 and R12-19 (INTERNAL). **The brain changes three ways** (R12-01 the
writers, R12-02 the voice, R12-12 the pair prompts): every report's words change (R-5.5); the dry lab runs in the round, fixture
runs on staging before Promote, and the Release view's full lab and QA agent gate production (R-4.4). **No schema change**
(pins live in the workbook JSON, reading 3). **No new dependency.** **The contract changes twice** (R12-03, R12-13). No
credential is needed to build, nothing goes on GitHub, nothing reaches production in the round.

## Open Mailbox rows created more than 14 days ago (oldest first, ADR-186)
**2026-09-09:** MB-12 no error reporting or alerting · MB-19 no prompt version history · MB-20 the one e2e spec cannot pass, no
lint step · MB-21 variables missing from `.env.example` · MB-22 dead code left by the port · MB-23 no rate limiting on POST
/reports and geocode · MB-30 the browser calls Nominatim and timeapi.io. None blocks a card; MB-30 sits beside R12-06, and MB-23
beside R12-04's new read. The next oldest, MB-49 (2026-09-18), is 13 days old. Rows no longer count rounds open: the
Owner dropped the count on 2026-10-01 (ADR-186), and a topic's age is its Created time. MB-122 was marked done (the R11
follow-up, 0199121, says launch, not open). Touched here: MB-93 (provisional, ask 3), MB-103 and MB-110 (provisional seams),
MB-113 (this is the dashboard copy pass its default waits for), MB-70 (decided; production now depends on its two ids). Raised:
MB-128, 129, 130. No Owner comment was found on the Mailbox or Decisions rows this round touches.

## Round start (the orchestrator)
1. The round runs on this branch, as R10 and R11 did. `git diff --stat main...HEAD` lists docs only (MASTERFILE 0.20, INDEX, the
   lock, the /web-taste rule, this plan, the R13 move), so typecheck is unaffected; the round's pull request brings them to `main`.
2. **ADR-184** (mix B), **ADR-185** (the voice) and **ADR-186** (no rounds-open count) were recorded with this plan; the round
   adds no Decisions row.
3. CLAUDE.md's current focus (item 3) and INDEX's pricing-and-launch line still point at `R12-plan.md` for pricing: the plan's
   commit points both at `R13-plan.md`.
4. Builders cannot open claude.ai: the orchestrator extracts the artifact's screens each UI card names, phone first, then desktop,
   into the session scratchpad and hands them over, as R11 did. Where the artifact and a reading below differ, the artifact wins
   and the round report says so.
5. The dry lab's base: `git fetch origin report-lab/r06 && git checkout FETCH_HEAD -- fixtures/reports/` (never committed).

## What already shipped (checked at 37392b8)
- **Met, and reused:** the catalogue in `@workspace/commerce` with `formatEuro` and the price gate (R11-02, 25); Single €24 and
  Family & friends €72; Pricing and JSON-LD reading `BUNDLES`; the two product names as constants (`product.ts`); R10's orbit,
  sky card, rows, credits sheet, path sheet, `SendDialog` and Stop sharing for a person and a pair (MB-103's rule); the workbook
  with its shallow PATCH (ADR-24); `Checklist`, the report's one checklist; `EvidenceCard` and `glossFor`; `TwoPlates` and the six
  sample people; `NatalWheel` driven by `selectedHouse` and `onSelectHouse`; house readings ending on "Behaviour check:"; the
  type-only share card (R09); `render-brand.mjs`; `sun.webp` and `sun-512.webp`; `PlaceField`; /sample whole with 63 claims;
  the release lab's pair (curie-hepburn, partners); the dry route's `served` lights (`models.list`, no tokens); the brief's links
  stored strongest first.
- **Not met:** Couple at €48, no Singles total, no launch chip; "Personal natal report" in some twenty places; the credits sheet on
  credit-loop's names and no prices; "Your People", "orbit" and "Your sky" on the dashboard; no quick look, pins or `GET /home`;
  the orbit leaves out a report sent to the reader; "Send to"; three scenes with chips, `writeScene` and its route; `SCENE_INTRO`
  in both places; chapter 01's `pointer`; untitled link cards tagged flows and rubs; the ledger's "Naturally strong" and "Will
  take work"; chapter 02 as an explorer with triad passages; /sample at ten chapters; the method figure with ticks, twice;
  /compatibility's table and facts; HorizonWheel's heavy disc; two Sun renders; the share preview's "One report · one purchase";
  Košice read as a region; every job on gpt-5.2; a style contract that guards only the high side. **A bug found while planning:**
  a pair's Next time tick never saves: its key (`partners02.nextTime.items.0`) fails the workbook grammar on both sides, the PATCH
  answers 400 and the tick rolls back (fixed in R12-04 and R12-08).

## Where the specs disagree, and how this plan settles it
1. **ADR-57 and the matrix spec's Sequence step 4** (a section moves on five clean blind reads; the foundation on a session of its
   own) against the Owner today → the Owner's word settles the mix (ADR-184 amends both for this move); the gate still runs.
2. **ADR-102's portrait 1080 × 1350** against ADR-175's "9:16 stories only" → ADR-175, the newer; ADR-102's type-only content
   stays until the story's own session.
3. **ADR-155 and ADR-157** (on-tap scenes stored; the band's scene plus two neutral chips) against ADR-176 (one fixed scene, no
   chips), which lists only ADR-72 and 103 → both fall with ADR-176.
4. **ADR-161's "Send to {B}"** in chapter 01's share block against ADR-181's "Share with {name}" → ADR-181.
5. **MB-93's default** (no pair text on a marketing page) against scope 2's pair headline and two "Try together" items →
   provisional MB-93 (R12-18, ask 3).
6. **Scope 9's "REGION · SLOVAKIA · UTC+2" on each match** against no zone in a Nominatim hit → reading 12, MB-130.
7. **"`CatalogueBundle` gains `fullCents`"**: the code's type is `Bundle` (pinned commerce).
8. **Acceptance numbers "9." twice**: this plan cites the criteria by content.
9. **Scope 3's "one `GET /home`"** against rows whose actions have their own routes → reading 4.
10. **"No triad cards"** in chapter 02 while "the triad stays written" → reading 9.
11. **"The circle ... matches People"** against `orbit.ts`, which counts only reports the reader wrote → reading 6 (ADR-182).
12. **Prompt files against staging's overrides** (`resolveSection` honours `prompt_templates`) → the version bumps clear them at
    deploy, R09's v7 way (reading 15).
13. **MB-113's default** ("unchanged until the next dashboard copy pass") → this is that pass: Write, provisional (R12-22).
14. **ADR-87** (simpler words, one side only) → ADR-185 guards both directions.

## Goals
1. **Production writes on Sol and Luna, proven before it ships** (ADR-184): the foundations on gpt-6-sol, every other prose call
   on gpt-6-luna, the QA agent and the vocabulary job on Sol; 27.4 ¢ a report becomes 3.0 ¢ on the stored r06 usage; the dry lab,
   fixture runs, the full lab and the QA agent before Promote, and MB-70's two ids shown to answer on staging.
2. **One voice, two friends over coffee** (ADR-185), in every natal and pair prompt and both foundations, measured in the lab
   and read by the Owner, never a gate.
3. **The Compatibility report, one scene per chapter** (ADR-176, 177): "This is the challenge:", the room rule, no pointer, the
   band's scene with a child under 3 written as 3; "Where your charts meet" and the ledger's two words; no chips, no intro.
4. **The dashboard as a home, phone first** (ADR-171, 174, 175, 181, 182): the circle and its quick look, rows that open the
   report, what you're practising, your pairs, one 9:16 story per pair, Share with, a Stop sharing that names every consequence.
5. **The site and the names** (ADR-168 to 170, 172, 173, 178 to 180, 183): €54 with a launch price, Personal report and Your
   circle everywhere, the two differences, /sample at four chapters, House by House, evidence drawn as the report draws it,
   /compatibility in three steps, one Sun, Košice, "Every reference checked".

## Preconditions
1. No builder starts before this plan's commit is pushed (Round start).
2. Builders read MASTERFILE §0, their card, the spec sections and pinned shapes it names, and the artifact screens handed to them.
3. **Single owners.** Group A: `models.ts`, `labSession.ts`, `labReplay.ts`, `releaseLab.ts` → R12-01; `system.ts`,
   `sections/foundation.ts`, `pair/index.ts`, `pair/foundation.ts`, `style.test.ts`, `checks.ts`, `aiInterpretation.ts`, the
   checks annex → R12-02; `openapi.yaml` and the generated files → R12-03; `routes/reports.ts`, `routes/index.ts`, the walk →
   R12-04; `packages/commerce/src` → R12-05; `product.ts`, `mailer.ts`, `invites.ts`, `credits.ts` → R12-11. Group B: the pair
   prompts, `pairBrief.ts`, `pairInterpretation.ts`, the annex → R12-12; `openapi.yaml`, `models.ts`, the walk,
   `report-lab.ts` → R12-13; `types/chart.ts` → R12-14; `ReportPage.tsx`, `chapters.ts`, `evidence-glossary.ts` → R12-15;
   `HomePage.tsx` → R12-18. Group C: `orbit.ts`, `CardSections.tsx` → R12-21; `DashboardPage.tsx` → R12-24. Every other file
   belongs to the one card that names it.
4. Inside a group a card may land before one it imports (pinned shapes): a red intermediate is accepted until the group ends, and
   every group ends green. A builder who needs a pinned shape changed stops and reports (R-0.1).
5. **No card spends.** Nothing generates in the round; every paid run is in the staging confirmation, after the merge.
6. No secret in the repo or on GitHub. Seams: `// MB-93 provisional` (R12-18), `MB-103` (R12-04, 21, 22), `MB-110` (R12-04, 08,
   23), `MB-113` (R12-22), `MB-130` (R12-06); `MB-70` stays on the two catalogue entries. Code cites ADR-168 to 185.

## Readings pinned where the spec is silent
1. **Your circle** carries one switch, Circle · People · Compatibility, on every size. Circle shows the circle, with the quick
   look beside it on desktop and as a bottom sheet on a phone; People and Compatibility show their rows. A waiting gift keeps its
   seat; the add point stays.
2. **The quick look** holds only what scope 3 lists. The old card's elements, houses and Generate rows leave the dashboard; the
   site's sample card keeps R10's card, since a sample person has no report lines (MB-93).
3. **Pins** are set beside the Closing's Practice items and a pair's Next time items on the report, and cleared there or on the
   dashboard. Each is `pin.{item key}` in the report's workbook, valued by its ISO date, at most three per report, enforced on both
   sides. With none pinned, the reader's own report offers the Closing's first Practice item. Pins are shared like ticks until
   MB-110 is decided.
4. **One `GET /home`** feeds everything the circle, the quick look, practising, pairs and stories show, so no card fetches a report
   on open. The rows' actions (share, mark, delete, stop) keep their routes, the picker keeps `GET /reports`, and the credit pill,
   gifts and history keep theirs.
5. **Practising** covers the reader's own Personal report and the pairs they are one of; nobody practises another person's report.
6. **The circle is the People list**: every profile with a natal report the reader can read, written (until its subject stops
   sharing) or sent to them, with the reader's own at the centre. A report sent to the reader and not yet marked This is me sits
   in the circle as a person until it is.
7. **Where your charts meet**: the ten bodies take the spec's words; Chiron and the nodes keep their names. An overlay card has
   no tag, sits under "Show all N" and reads "{A}'s {word} in {B}'s {house word}". The lead is three of each tag, the ledger's
   links first, then stored order, which is the brief's order, strongest first. `flows` and `rubs` stay the enum.
8. **The story** is ADR-102's type-only content at 1080 × 1920 until its own session (ADR-175); chapter 01 and the dashboard draw
   the same story.
9. **House by House has no triad passages**: the deck shows house readings only, the triad section is still written (out of
   scope), so the report page no longer prints the Sun, Moon and Rising passages and /sample's chapter 02 marks no triad claim.
   The Owner sees this on staging.
10. **The second difference's pair slot** is R12-18's: a committed sample pair run when one exists, else the two plates and their
    scenes (ask 3).
11. **A child under 3 is written as 3** in prompt text only; `meta.band` stays little and nothing stored changes.
12. **The match list's offset**: a Nominatim hit has no zone, and a zone call per match would multiply timeapi.io calls per
    keystroke, so each match shows region and country and the chosen place shows its offset, as today (MB-130).
13. **The register count** (`chk-39`) is a WARN under ADR-81: logged per section, never blocking, never retried and never a lab
    fault, so it cannot refuse a release; the Failures tab shows a list that keeps firing (ADR-85).
14. **The lab after the move**: the reading room's control stays gpt-5.2 by name, so stored r05 and r06 text and past reveals keep
    their labels; a spot defaults to what ships (R12-19); the release lab runs the customer path, mix B; prices stay as entered.
15. **The version bumps** (v8, p3) make bootstrap step 6 clear staging's overrides at deploy, so staging runs the files; production
    copies staging's rows at its next deploy (step 7); the web renders v6 to v8 and p2 and p3.
16. **Words:** the artifact's where it has them; every new string passes /ux-copy and each builder lists them for the Owner's look.

## Pinned shapes
- **Home** (R12-03, 04): `GET /home` → `Home { you: HomePerson | null; several: boolean; people: HomePerson[]; pairs: HomePair[];
  practising: HomePractice[] }`; `HomePerson { profileId; reportId; name; birthDate; status; access: owner | claimed; isSelf;
  triad: { sun: Spot; moon: Spot; rising: Spot | null } | null; lines: { superpower; growingEdge } | null }` (lines on `you`
  only); `Spot { sign; degree }` (degree within the sign, two decimals); `HomePair { reportId; lens; label: string | null; a: {
  profileId; name }; b: { profileId; name }; status; stoppedBy: string | null; strong: string[]; challenge: string | null; story:
  { headline; strengths: string[] } | null }`; `HomePractice { reportId; kind: natal | compatibility; key; action; why: string |
  null; pinned: boolean; ticked: boolean }`.
- **Workbook** (R12-03, 04, 08): an item key matches `^[a-z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*)+\.\d+$`; a pin key is `pin.` and
  an item key; `PIN_LIMIT = 3` per report; a fourth answers 400 `{ error: "pin_limit" }`.
- **Commerce** (R12-05): `Bundle { id; name; line; credits; cents; fullCents; launch: boolean; mixes: readonly string[] }`;
  `CREDIT_LINE = "1 credit = 1 report of either kind."`.
- **Checklist** (R12-08): `Checklist({ heading; items; store?: TickStore; pinnable?: boolean })`; `TickStore { ticked(key);
  toggle(key); pinned?(key); togglePin?(key); saving }`; `localTicks(): TickStore`; headings add "Try together" and "Practice".
- **Deck** (R12-15): `HouseDeck({ chart: ChartData; readings?: HouseReading[]; counter: string; birthPlace?; onAddBirthTime? })`.
- **Story** (R12-16): `SHARE_CARD = { width: 1080, height: 1920 }`; `storyFile(text: ShareCardText): Promise<File>`;
  `StoryPreview({ text: ShareCardText })` with its own Share story and Save.
- **Charts meet** (R12-14): `meetCards(links, ledgerLinks, names): { lead: MeetCard[]; rest: MeetCard[] }`; `MeetCard { tag:
  comes | challenge | null; title; astro; body; check: string | null; anchor?: string }`; `BODY_WORDS`.
- **Bundle list** (R12-17): `BundleList({ compact?: boolean })`.
- **Differences** (R12-18): `Differences()` default export; `DIFFERENCES { line; check; practice: ChecklistItem[]; pair:
  SamplePairQuote | null }`.
- **Dashboard pieces** (R12-21 to 23): `QuickLook({ person: HomePerson; pair?: HomePair; self: boolean; onClose })`;
  `PairBlock({ pair: HomePair; compact?: boolean })`; `PeopleRows`, `StopSharingDialog({ target, onClose })` (today's target
  type), `Practising({ items })`, `YourPairs({ pairs })`, `Stories({ pairs })`.
- **Lab** (R12-01, 19): `catalogueForPanel()` → `{ baseline: "gpt-5.2"; production: { foundation; sections }; models }`.

## Parallel groups
**Group A**, one message: R12-01 to R12-11 (R12-04 builds on R12-03's contract, R12-10 reads R12-05's `CREDIT_LINE`: pinned).
**Group B**, one message once A is green: R12-12 to R12-19 (R12-13 removes `useWriteScene`, which R12-14 stops importing; R12-14
renders R12-16's unchanged `ShareCard`). **Group C**, one message once B is green: R12-20 to R12-24 (R12-24 composes R12-21 to 23:
pinned). **Group D**: R12-25 alone, then the gate. **If R12 must shrink:** R12-19 moves first, then R12-23's Stories (chapter 01
keeps its story), then R12-09's and R12-10's motion (the figures ship still). The brain, the dashboard and the names stay.

---

## Group A — the writers, the voice, the contract and home, prices, the place field, the Sun, the tick box, method, /compatibility, the names

### R12-01 — Production's writers on Sol and Luna: mix B (USER-FACING · brain) · Opus — ADR-184, MB-70
Objective: every foundation is written by gpt-6-sol and every other prose call by gpt-6-luna; the lab still judges against 5.2.
Files: `api/src/lib/models.ts` (+ test); `labSession.ts` (+ test); `labReplay.ts` (`catalogueForPanel` only); `releaseLab.ts` (+ test).
Refs: ADR-184, 57, 74, 150, 165; R-4.4, R-5.5, R-5.6; matrix spec Mixes; readings 13, 14; pinned lab.
Done when:
- `MODELS`: foundation, qa and vocabulary `gpt-6-sol`; sections, scenes, synastry and studyNotes `gpt-6-luna`; `SECTION_MODELS`
  `{}`; the catalogue keeps gpt-5.2 and every price; the two GPT-6 entries keep `// MB-70 provisional` and `checked: ""`
  (ADR-165); `QA_AGENT_MODEL` still overrides; `models.test.ts` pins ADR-184's map, every job priced, every job's effort `none`.
- `BASELINE` pinned by name to `"gpt-5.2"`; M0 reads "gpt-5.2 everywhere (production to R11)", B "(production from R12)"; tests:
  a 5.2 run is the control, a Luna run never is.
- `catalogueForPanel()` adds `production`; a release-lab row with no usage is labelled by its writer (foundation `MODELS.foundation`,
  a natal section `modelFor`, a pair section `MODELS.sections`), never "mixed"; tests.
- Dry lab: every prompt renders as before this card. The round report gives the cost per report on the r06 shapes of the five
  matrix charts: 27.4 ¢ on 5.2, 3.0 ¢ on B (the spec's R05 figures: 28.4, 4.1).
- Before Promote, staging shows both ids answer and the fixture runs are read (Staging confirmation 2 to 4, then 7).

### R12-02 — The voice: two friends over coffee, neither way overdone (USER-FACING · brain) · Opus — ADR-185
Objective: every natal and pair writer, both foundations included, reads one rule for plain spoken words, against high vocabulary and against slang.
Files: `api/src/prompts/system.ts`; `sections/foundation.ts`; `pair/index.ts` (`PAIR_WRITER` only); `pair/foundation.ts` (the
instructions); `style.test.ts`; `checks.ts` (+ test); `api/src/lib/aiInterpretation.ts` (`PROMPT_VERSION`, the count); annex row 39.
Refs: ADR-185, 81, 85, 87, 88, 104; R-5.1, R-5.4; readings 13, 15.
Done when:
- One `STYLE_CONTRACT` rule, both directions: two friends over coffee; too high ("oriented to", "predisposed", "proclivity",
  "dichotomy", "paradigm"); too low ("vibe(s)", "toxic", "red flag", "lowkey", "main character", "energy" as a mood); one model
  sentence. The builder drafts the words; rules 7, 8 and 12 stay; it reaches `SHARED_SYSTEM` and `PAIR_SYSTEM`.
- WRITER and PAIR_WRITER lose "premium" and whatever else pulls the register up; both foundations say their handoff, and the
  pair's strengths that chapter 01 reuses, are written in the same plain words, since Luna echoes Sol's handoff.
- `style.test.ts` keeps rule 7's and PAIR_WRITER's pins, or changes them on purpose and says so, and pins both lists in both prompts.
- `chk-39`, a WARN (annex row 39), counts either list in prose on every `callStructured` call: logged, never a block, retry or lab fault.
- `PROMPT_VERSION` "v8"; the dry lab renders every natal and pair prompt with the rule, tokens up by the rule alone; before
  Promote the fixture runs are read for both directions (Staging confirmation 4), and the Owner judges the output, not the rule.

### R12-03 — The contract: GET /home and pinned items (INTERNAL) · Opus
Objective: the dashboard's one read and the pin's rules are in the contract before either side builds them.
Files: `packages/api-spec/openapi.yaml`; the generated `api-client-react` and `api-zod` (codegen only).
Refs: ADR-174, 182, 24, 48; R-7.2; readings 3 to 6; pinned home and workbook.
Done when:
- `GET /home` [getHome] → 200 `Home` as pinned, with `HomePerson`, `Spot`, `HomePair`, `HomePractice` as components.
- `WorkbookPatch` describes an item key (a digit allowed in a segment) and a pin key, three pins a report at most; the PATCH
  lists 400 `pin_limit`.
- Every change additive, each line naming its ADR; codegen, then typecheck green with no other file changed; a second codegen
  leaves no diff.

### R12-04 — Home and pins on the server (USER-FACING) · Opus — provisional MB-103, MB-110
Objective: one call gives the dashboard its circle, quick looks, pairs, stories and practice, by the rule every list uses.
Files: new `api/src/lib/home.ts` (+ test), `api/src/routes/home.ts`; `routes/index.ts`; `routes/reports.ts` (the workbook PATCH,
+ test); `api/src/walk/loop.walk.ts`.
Refs: ADR-139, 163, 174, 182; R-3.6; MB-49, 103, 110; readings 3 to 6; pinned home and workbook.
Done when:
- `GET /home` as pinned, built only through `access.ts` (`natalReportAccess`, `pairReadable`): `you` and `people` are what `GET
  /reports` lists as natal, latest readable per profile; degrees from the stored chart; `you.lines` chapter 08's superpower and growing
  edge, title and first sentence; each pair's three strong lines, its first work line as the challenge, its story text.
- `practising` per reading 5: pinned items with their words, else the Closing's first Practice item; ticked from the same workbook.
- The PATCH takes a digit in a key segment (a pair's Next time tick answers 400 today) and pin keys, three per report, 400
  `pin_limit` on a fourth; tests.
- `home.ts`'s builders are pure and tested without a database (MB-49); the route is thin.
- The walk on a scratch Postgres 16: after the subject's Stop sharing, the giver's `GET /home`, `/profiles` and `/reports` drop
  them and the giver's pair with them closes (MB-103's rule); a pin round-trips; every step green.

### R12-05 — One price list: Couple at €54, a launch price, one line for credits (USER-FACING) · Sonnet
Objective: the catalogue carries the new price, each bundle's Singles total, its example mixes and the one credit line.
Files: `packages/commerce/src/catalogue.ts` (+ test), `index.ts`.
Refs: ADR-168, 169, 170, 142, 146; R-6.3, R-6.7; spec 1; MB-112 (decided), MB-114; pinned commerce.
Done when:
- Couple 5400 cents; `fullCents` derived from Single's price (2400, 7200, 12000); `launch` on Couple and Family & friends; per
  credit €24, €18 and €14.40, Single never the cheaper credit.
- `mixes` per bundle in the artifact's words, through /ux-copy; `CREDIT_LINE`; no end date and no "was" field (ADR-169).
- The `MB-112` tag goes (decided: Couple stays); the price gate stays green; tests pin every row. The site shows €54 at once.

### R12-06 — The place field: its own row, one column per match, Košice a city (USER-FACING) · Sonnet — provisional MB-130
Objective: a long place name wraps instead of hiding, and a city mapped as a boundary reads as the city.
Files: `web/src/lib/places.ts` (+ test); `web/src/components/PlaceField.tsx`; `web/src/site/components/SkyForm.tsx`.
Refs: spec 9; acceptance (place, Košice); ADR-109; MB-30, 94, 130; reading 12.
Done when:
- `places.ts` reads Nominatim's `addresstype`: an administrative boundary whose `addresstype` is a city or town ranks and labels
  as that settlement (`format=jsonv2` if `json` lacks the field).
- A test pins a saved "kosice" answer that lists Košice first, as City: recorded if Nominatim is reachable, else built to its
  documented shape and named so in the test; the live list is read on the preview.
- In `SkyForm` the place has its own full row; the match list is the form's width; each match is one column: the name, wrapping
  and never truncated, then "REGION · COUNTRY" under it, the offset once known (reading 12); the birth form gets the same field.
- 390 px before 1440 px: no gap column, nothing clipped; /web-taste.

### R12-07 — One Sun render, a thinner disc, the share preview's last line (USER-FACING) · Haiku
Objective: one Sun everywhere, and a link preview that no longer contradicts the bundles.
Files: `web/src/assets/planets/sun.webp`; `web/src/site/components/HorizonWheel.tsx` (the dark disc only); `scripts/render-brand.mjs`
(the footer); `web/public/opengraph.jpg`.
Refs: spec 8, 10; ADR-183, 29 to 32; MB-13.
Done when:
- `sun.webp` is re-made at 192 × 192 from `sun-512.webp`, alpha kept (ImageMagick reads and writes WebP here); every Sun render
  reads it; `planet-renders.ts` unchanged.
- HorizonWheel's dark disc is thinner and nothing else on the wheel moves (screenshots at 390 and 1440 px, before and after).
- The footer reads "Every reference checked"; `pnpm brand:render` re-renders `opengraph.jpg` (the Chromium in `/opt/pw-browsers`
  if Playwright's build is missing); nothing else on it changes. MB-13 closes on a link preview after the next Release.

### R12-08 — The one tick-box component, and pinning (USER-FACING) · Opus — provisional MB-110
Objective: every thing to try, on the site, in a report and on the dashboard, is the report's `Checklist`; Practice items pin.
Files: `web/src/components/report/Checklist.tsx`; `web/src/lib/workbook.ts` (+ test); `web/src/components/report/DawnClosing.tsx`.
Refs: ADR-24, 48, 62, 172, 174; /web-taste "one kind of thing"; reading 3; pinned checklist and workbook.
Done when:
- `Checklist` takes `store` (the report's workbook by default; `localTicks()` for the site, in memory, nothing sent) and
  `pinnable` (a pin beside each item, three a report, the fourth saying so); headings add "Try together" and "Practice"; still
  silent, still unticks.
- `workbook.ts`: the key grammar takes a digit in a segment; pin keys, `PIN_LIMIT`, optimistic with rollback like a tick; tests.
- The Closing's Practice items are pinnable; an item ticked on the dashboard is ticked here (one key).
- The pin's label and limit line through /ux-copy; 390 px before 1440 px; keyboard and screen reader reach the pin.

### R12-09 — The reference check, drawn as the report draws it (USER-FACING) · Opus
Objective: the how-it-works figure shows a cited sentence and its evidence exactly as a report does, on home and /method.
Files: new `web/src/site/components/ReferenceCheck.tsx`; `web/src/site/sections/Method.tsx`; `web/src/site/pages/MethodPage.tsx`.
Refs: spec 7; ADR-172, 180, 60; acceptance (the reference check); /web-taste, /ux-copy.
Done when:
- One component on both pages: the sentence underlined, the indigo number chip, then `EvidenceCard`'s look: each kind in its
  colour (ruler brass, placement indigo, aspect blue, sect violet, lot green), its label, its one line from `glossFor`, and the
  foot "N verified references · whole sign · tropical"; no ticks; both `Tick` figures go.
- Motion once on view: the underline draws, the number lights, the card rises, the rows arrive in turn; Replay; at rest when done;
  whole and still under reduced motion and in the prerendered HTML.
- The sample's first home claim, as today; 390 px before 1440 px; no hydration mismatch.

### R12-10 — /compatibility in three steps, its questions on /faq (USER-FACING) · Opus
Objective: the page shows how to get a Compatibility report with the site's own pieces, and its questions join the FAQ.
Files: `web/src/site/pages/CompatibilityPage.tsx`; `web/src/site/data/faq.ts` (+ test).
Refs: spec 7; ADR-113, 116, 180; MB-93; acceptance (/compatibility); /web-taste, /ux-copy; pinned commerce.
Done when:
- No comparison table, no facts row. Step 01: Mira and June's plates (`TwoPlates`), "You can share it with them once it's
  written."; 02: the lens chips and, for a parent and a child, "Who is the parent?"; 03: that lens's seven chapter titles in
  their chapter colours, changing with 02.
- The page's one moment: on view the plates' Sun, Moon and Rising arrive in turn, then the titles one by one; a new lens replays
  step 03 only; once, replayable, still under reduced motion; lucide icons only where a step needs one.
- The three questions move into `FAQ_GROUPS`, the FAQPage schema equal to the visible answers; the price answer carries
  `CREDIT_LINE`; tests.
- 390 px before 1440 px; every word in the HTML.

### R12-11 — "Personal report", and "share" in the emails and the API's words (USER-FACING) · Sonnet
Objective: the product's name changes at its one constant, and every email and API message shares a report and gives a credit.
Files: `web/src/lib/product.ts`; `api/src/lib/mailer.ts` (+ test); `api/src/routes/invites.ts` (messages only); `api/src/lib/credits.ts`
(History's fallback label).
Refs: ADR-170, 181, 120, 139; R-6.5; spec 1, 3 (Share with); /ux-copy.
Done when:
- `PERSONAL_REPORT = "Personal report"`; `fromPersonalReport` keeps its shape.
- The report email says "{giver} shared your report with you" in its subject and first line, the pair email says shared too; a
  gift's emails still give a credit, in the new name; no "Personal natal report" and no "Send" for a report in any email; tests
  pin each subject.
- `invites.ts` says share ("Share it once it's ready"); History's fallback label reads the new name.

---

## Group B — the pair prompts and their contract, the Compatibility report page, House by House, the story, prices, the two differences

### R12-12 — The pair prompts: one scene per chapter, "the challenge", no pointer (USER-FACING · brain) · Opus
Objective: a Compatibility report writes one fixed scene a chapter, says "This is the challenge:", keeps "room" for real rooms.
Files: `api/src/prompts/pair/` (`index.ts`'s doctrine and version, `shapes.ts`, the three lens files, `twoCharts.ts`, `foundation.ts`,
`pair-prompts.test.ts`, `claims-links.test.ts`); `api/src/lib/pairBrief.ts`, `pairInterpretation.ts` (+ tests); annex row 38.
Refs: ADR-176, 177, 67, 83, 103; spec 4; the artifact's scene table; acceptance (the dry lab); reading 11.
Done when:
- One scene a chapter. Partners 02 to 06: "The end of a long day", "The argument at 11 pm", "The bill nobody expected", "The
  weekend away", "The job offer in another city". People: "The big dinner", "The project with the deadline", "The weekend away",
  "Money between you", "The favour too big to ask". Parent and child: the band's own scene, no neutral ones.
- The foundation stops picking scenes (schema, check, instruction); the generator stores `{ titles: [title], written: 0, texts: {} }`.
- A child under 3 is written as 3 wherever a prompt states the age; the band stays little; a test with a 10-month-old pins it.
- `PAIR_DOCTRINE`, the lens contract and the fifteen chapter prompts say "This is the challenge: …" where they said it rubs;
  "room" only for a real room ("in public", never "public rooms"); `twoCharts` loses `pointer` from schema and prompt.
- `PAIR_PROMPT_VERSION` "p3"; the dry lab renders every pair prompt under three lenses and four bands with the challenge wording,
  the room rule, no `pointer` and one scene; fixture runs before Promote (Staging confirmation 4, 7).

### R12-13 — The on-tap scene route goes; the contract follows p3 (INTERNAL) · Sonnet
Objective: nothing writes a scene on tap, and the contract, the walk and the lab script read the new shape.
Files: delete `api/src/lib/pairScene.ts` (+ test); `api/src/routes/compatibility.ts` (the scene route); `openapi.yaml` and codegen;
`api/src/lib/models.ts` (+ test); `api/src/walk/loop.walk.ts`; `scripts/src/report-lab.ts` (the pair markdown).
Refs: ADR-176 (with ADR-72 and 155); R-7.2; reading 15.
Done when:
- `/compatibility/{id}/scenes`, `WriteSceneBody` and `SceneResponse` leave the spec and the API; `PairTwoCharts.pointer` is
  optional (p2 reports keep theirs); `PairChapterScenes` says one scene since p3; codegen twice, no diff.
- `MODELS.scenes` goes with its only caller.
- The walk asserts the route answers 404 where its step stood; the lab script prints the one scene's title and no pointer line.
- Typecheck, builds and tests green at the group's end, with R12-14.

### R12-14 — The Compatibility report page: Where your charts meet, the ledger's words, one scene (USER-FACING) · Opus
Objective: chapter 01's link cards become a named, tagged list in people words, and the chapters read as the lock says.
Files: `web/src/components/report/LinkCard.tsx`, `TwoChartsLedger.tsx`, `PairSections.tsx`; delete `SceneChips.tsx`; new
`web/src/lib/charts-meet.ts` (+ test); `web/src/pages/CompatibilityReportPage.tsx`; `web/src/types/chart.ts` (+ test); `ledger.test.ts`.
Refs: ADR-176, 177, 101, 103, 172; spec 4; acceptance (Where your charts meet); reading 7; pinned charts meet.
Done when:
- "Where your charts meet": Comes naturally (teal) or Challenge (rose), titled in people words, first names only ("Alexandra's
  drive and Mamca's structure"), the astrology in small mono ("Mars opposite Saturn · 1.4°"), the Behaviour check line; three of
  each first, the ledger's links leading, "Show all N" for the rest; tests on titles, tags and order.
- The ledger's columns read Comes naturally and Challenge; no pointer is printed, stored or not; no hearts.
- A lens chapter shows "The scene · {title}" and its one scene: no chips, no `SCENE_INTRO` in either place, and chapter 02's
  intro loses "Two more scenes wait under each one."; Next time is pinnable.
- The page renders p2 and p3; `RENDERABLE_PROMPT_VERSIONS` adds v8 (R12-02); `PairTwoCharts.pointer` optional.
- 390 px before 1440 px; print shows the one scene; /web-taste, /ux-copy.

### R12-15 — Chapter 02, House by House: the wheel pinned and a deck of houses (USER-FACING) · Opus
Objective: one component reads the twelve houses as a swipe deck on a phone and a stepped card on desktop, in reports and on /sample.
Files: new `web/src/components/report/HouseDeck.tsx`, new `web/src/lib/house-deck.ts` (+ test); `web/src/pages/ReportPage.tsx`
(chapter 02); `ChartExplorer.tsx` (goes; its blind card kept); `HouseCard.tsx`; `web/src/lib/chapters.ts`; `evidence-glossary.ts` (the title).
Refs: ADR-179, 98, 171; spec 6; acceptance (chapter 02); reading 9; pinned deck.
Done when:
- Phone: a pinned bar (`NatalWheel` unchanged, 92 px, "02 / 10", "House by House", "4th house · Home · Taurus", twelve ticks);
  "Swipe through the houses" with a brass arrow that nudges three times; one card per swipe (house, sign, renders, title, first
  sentence, "Read the rest", Behaviour check); the wedge follows the card.
- Desktop: the full wheel fixed on the left, one card with the whole text, Previous / Next, ← →, wedge clicks via `onSelectHouse`.
- No triad cards (reading 9); a blind chart keeps "What the hour adds"; reduced motion is still; the houses prompt is untouched.
- "House by House" wherever chapter 02 is named, both copies; `house-deck.ts` tested (index, wrap, swipe, first sentence).
- 390 px before 1440 px; print keeps every house reading.

### R12-16 — The 9:16 story and "Share story" (USER-FACING) · Opus
Objective: a pair's image is a ready 9:16 story, the same in chapter 01 and on the dashboard.
Files: `web/src/components/report/ShareCard.tsx`; `web/src/lib/share-card.ts` (+ test).
Refs: ADR-175, 102, 161, 181, 133; spec 3 (Share); reading 8; pinned story.
Done when:
- A 1080 × 1920 canvas with ADR-102's type-only content (both first names, the verdict, three strengths, the foot, the mark),
  re-spaced for 9:16; its look waits for its session.
- "Share story" (Web Share with the file), else Copy image where ClipboardItem exists, and "Save"; the block reads "Share it with
  {B}." and its report button "Share with {B}".
- `StoryPreview` and `storyFile` exported for the dashboard; `ShareCard`'s props unchanged; nothing uploaded or stored.
- 390 px before 1440 px; tests pin the text, the size and the actions.

### R12-17 — Prices and the credits sheet, one look (USER-FACING) · Opus
Objective: wherever a price or balance shows, the bundles read the same: names, prices, the launch price, the mixes, one line.
Files: new `web/src/components/BundleList.tsx`; `web/src/site/sections/Pricing.tsx`; `web/src/components/dashboard/CreditsSheet.tsx`,
`CreditPill.tsx`; `web/src/lib/credits-view.ts` (+ test).
Refs: ADR-168 to 170, 172, 129, 138; R-6.3, R-6.5, R-6.7; spec 1; acceptance (pricing); pinned commerce.
Done when:
- `BundleList`: name, credits as dots, price; on Couple and Family & friends a "Launch price" chip, the Singles total struck ("3
  Singles €72", "5 Singles €120") and "you save €18" or "€48", all from the catalogue; the mixes as chips; `CREDIT_LINE` under it.
- Pricing and the credits sheet both render it; the sheet names Single, Couple and Family & friends with prices; credit-loop's
  names leave `credits-view.ts`; the test checkout still buys 1, 3 or 5 off production (ADR-138).
- `CREDIT_LINE` under the balance in the credit row; no euro typed (price gate green); no end date, no "was".
- 390 px before 1440 px; /web-taste, /ux-copy.

### R12-18 — The two differences (USER-FACING) · Opus — provisional MB-93
Objective: after the home hero, two bands say what Stars Decoded is: a personality report with things to try, a circle with everyday scenes.
Files: new `web/src/site/sections/Differences.tsx`; new `web/src/site/data/differences.ts` (+ test); `web/src/site/pages/HomePage.tsx`.
Refs: ADR-172, 173, 166; spec 2; acceptance (home); MB-93; reading 10; /ux-copy, /web-taste; pinned differences.
Done when:
- "A personality report, not a horoscope": "You spend to soothe, and you save to feel safe." read from the stored run (house 2's
  reading, never typed), its Behaviour check, and two of the Closing's Practice items in `Checklist` with a local store.
- "Your circle starts with you": the sample people close to Mira, the lenses' real scene titles as situations, and the pair slot:
  a headline and two "Try together" items in the same `Checklist` from a committed sample pair run (`// MB-93 provisional`);
  until one exists, the sample pair's two plates and their scenes, no quoted pair text.
- Right after the hero, in the HTML, in the first-light queue; exported for /sample's end.
- 390 px before 1440 px; a test proves every quoted line is in the stored run.

### R12-19 — The Lab page names production's writers (INTERNAL) · Haiku
Objective: a spot defaults to the writer that ships, and the session form says what its control is.
Files: `web/src/components/lab/SpotView.tsx`, `SpawnView.tsx`; `web/src/lib/labApi.ts`.
Refs: ADR-184, 76, 86; reading 14; pinned lab.
Done when: Spot defaults to `production.sections`, a foundation-only spot to `production.foundation`; Spawn keeps its control on
`baseline` (gpt-5.2) and names production's two writers once; the type reads the new field; nothing else on the page moves.

---

## Group C — /sample, the circle and its quick look, the rows, practice, pairs and stories, the page

### R12-20 — /sample at four chapters (USER-FACING) · Opus
Objective: the sample shows four of ten chapters whole and six dimmed with their first paragraph, and ends on the two differences.
Files: `web/src/site/pages/SamplePage.tsx`; `web/src/site/components/SampleRail.tsx`, `SampleHead.tsx`; `web/src/site/data/sample.ts` (+ test).
Refs: ADR-178, 179, 166, 119; spec 5; acceptance (/sample); reading 9; pinned deck and differences.
Done when:
- The head reads "A sample: 4 of 10 chapters from Audrey Hepburn's Personal report"; Overview, House by House (`HouseDeck` on her
  chart and readings), Superpowers and Key Paradoxes & Discoveries open.
- The other six are dimmed in the rail and on the page with one line each, opening to their first paragraph, all in the HTML.
- Every claim the page prints is marked in reading order; the build's guard counts the printed claims, no longer 63; her fine
  print stays (ADR-166).
- The page ends on `Differences`, then Get my report; 390 px before 1440 px; the prerender passes; no hydration mismatch.

### R12-21 — Your circle and its quick look (USER-FACING) · Opus — provisional MB-103
Objective: the circle holds everyone whose Personal report the reader can read, and a tap opens a quick look.
Files: `web/src/components/dashboard/Orbit.tsx`; `web/src/lib/orbit.ts` (+ test); new `QuickLook.tsx`, `PairBlock.tsx`;
`CardSections.tsx`; new `web/src/lib/home-view.ts` (+ test).
Refs: ADR-174, 182, 89 to 96, 112, 139; MASTERFILE §9 Two tempos; spec 3; acceptance (dashboard, circle); readings 1, 2, 6; pinned home.
Done when:
- Membership is the People list (reading 6): a report sent to the reader counts; a stop removes the person at once; ghost seats
  for the empty state; every word and label says circle; the site's sample orbit draws as before.
- `QuickLook`: name, birth date, Sun, Moon and Rising with degrees; for a pair with the reader "With you · {lens}" and `PairBlock`
  (three Comes naturally, one Challenge to work on); for the reader chapter 08's superpower and growing edge; Open Compatibility
  report or Open your report, "{name}'s report", "Share with {name}", "Share story"; a close control.
- A bottom sheet on a phone, the side panel on desktop; no zodiac, degree or render on the circle itself (§9).
- `home-view.ts` tested; 390 px before 1440 px; /web-taste, /ux-copy.

### R12-22 — People and Compatibility rows, Share with, Stop sharing (USER-FACING) · Opus — provisional MB-103, MB-113
Objective: a row opens its report and keeps its actions, and stopping a share names everything it does before it does it.
Files: new `web/src/components/dashboard/PeopleRows.tsx`, `StopSharingDialog.tsx`, `RowMenu.tsx`; `CompatibilityRows.tsx`;
`web/src/components/SendDialog.tsx`, `CompatibilityPicker.tsx`; `web/src/lib/pair-row.ts` (+ test).
Refs: ADR-181, 182, 163, 139, 133, 130; spec 3; acceptance (rows, Stop sharing); MB-103, 113; pinned dashboard pieces.
Done when:
- A row shows the name (or "You & {name}" and the lens), the birth date and three signs, and opens the report on a tap; its
  actions stay: "This is me ✓" or "Share with {name}", "Share story" on a pair, Not me and Delete report behind "⋯"; no hearts.
- `SendDialog` and every row say "Share with {name}"; a credit given stays a Gift.
- Stop sharing keeps its dialog and lists the four consequences in the spec's words, with Keep sharing and Stop sharing; after it
  the person leaves the circle, People and the quick look at once (`GET /home` refetched).
- Making a report says Write and Writing; the picker's Generate goes (MB-113 provisional).
- 390 px before 1440 px; the keyboard reaches "⋯"; /ux-copy.

### R12-23 — What you're practising, your pairs, your stories (USER-FACING) · Opus — provisional MB-110
Objective: the dashboard shows the reader's practice, their pairs side by side and one ready story per pair.
Files: new `web/src/components/dashboard/Practising.tsx`, `YourPairs.tsx`, `Stories.tsx`.
Refs: ADR-174, 175, 172, 24; spec 3; acceptance (practising, Share last); readings 3, 5, 8; pinned home, checklist, story.
Done when:
- What you're practising: `GET /home`'s `practising` through `Checklist` (a tick writes the report's workbook; unpin here too);
  none pinned shows the Closing's first Practice item.
- Your pairs: a sideways row of `PairBlock`s, each opening its report.
- Share: one ready 9:16 story per pair (`StoryPreview`), Share story and Save; nothing uploaded.
- Each has its empty state in the artifact's words; 390 px before 1440 px; still under reduced motion.

### R12-24 — The dashboard as a home (USER-FACING) · Opus
Objective: one page in the locked order, phone first, on one `GET /home`, in its four states.
Files: `web/src/pages/DashboardPage.tsx`; `web/src/lib/nudges.ts` (+ test); `web/src/components/dashboard/Nudge.tsx`.
Refs: ADR-171, 174, 182, 130; MASTERFILE §2 item 6; spec 3; acceptance (dashboard); readings 1 to 6; pinned dashboard pieces.
Done when:
- "Dashboard" with a one-line summary; Your circle with Circle · People · Compatibility; What you're practising; Your pairs; Share
  last. Desktop: the circle with its quick look beside it, then the rows.
- One `GET /home` feeds the circle's content, quick looks, practice, pairs and stories, no per-card report fetch (reading 4).
- The four states in order: empty (ghost seats, the bundles under "Your circle starts with you", one sample practice item), one
  Personal report, two reports and a pair, a family.
- The nudge reads "Add someone to your circle. 1 credit = 1 report."; the credit pill, Add someone, the gift flow and the path
  sheet still work.
- 390 px before 1440 px for each state; no "orbit", "Your sky", "Your People" or "Send to" left on the page.

---

## Group D — the names, once more

### R12-25 — Every name once more, and a test that keeps them (USER-FACING) · Sonnet
Objective: no retired name is left anywhere a user reads, and a test fails if one comes back.
Files: any user-facing literal left (site, app, legal, emails, JSON-LD); `web/src/site/sections/YourPeople.tsx` (eyebrow, labels,
heart); `api/src/lib/qaAgent/personas.ts` (+ test); `web/src/site/data/faq.test.ts`; new `scripts/src/names-gate.test.ts`.
Refs: ADR-170, 181, 182; spec 1; acceptance (names); the price gate as the pattern.
Done when:
- No "Personal natal report", "One report", "Someone and the two of you", "Your people and how you fit", "orbit" or "Your People"
  in a string a user reads, and no "Send to" for a report; public pages keep "natal chart" where people search.
- The names gate reads string literals and JSX text under `web/src`, `api/src` and `packages/*/src` (tests, generated code and
  comments excepted), names file and line, and is green.
- The QA personas' /sample check reads "Personal report"; every test and the walk green.

---

## Staging confirmation, after the merge and before Promote
Free steps first; the orchestrator runs them from `/admin/report-lab` on staging (runbook J) and reports each line.
1. The deploy's bootstrap step 6 logs v8 and p3: staging's natal, pair and `:system` overrides cleared (`/api/healthz/db`).
2. **Dry** (base r06, pair curie-winfrey; free): every natal and pair prompt renders with ADR-185's rule, the challenge wording
   and one scene; `served` shows gpt-6-sol and gpt-6-luna lit. A dark id stops here: R12-01 is reverted and MB-70 reopened.
3. **Spot** (standard tier; neither offers Flex): `foundation` on two charts with gpt-6-sol, `overview` and `superpowers` on two
   with gpt-6-luna, a few cents: both ids answer with their pinned effort and a strict schema.
4. **Fixture runs** (about 80 ¢ on B, no secret): `report-lab.yml` dispatched for the natal campaign (`chart=all`) and the pair
   campaign (`pair=all`: three lenses and the four bands). The orchestrator lists every word from either list with its sentence,
   and checks the challenge wording, one scene per chapter, the room rule and the little band's child written as 3.
5. **Prices:** openai.com's pricing page, read on the day; it was blocked from the sandbox on 2026-09-24 and again on 2026-10-01,
   so the two entries keep `checked: ""` under ADR-165 unless it opens. No customer is billed on them.
6. The Owner's look: the staging URL with three lines (the dashboard at 390 px, a Compatibility report, one fixture's words).
7. **"Promote"**: the Release view runs the full lab on the five matrix charts and the curie-hepburn pair on mix B, the gate
   against r06, then the QA agent on gpt-6-sol, whose screenshot reading confirms Sol's vision, then the fast-forward. If the QA
   step fails on images, `MODELS.qa` returns to gpt-5.2 in a one-line pull request and the release runs again. If the gate
   refuses, MB-129.

## Production after the round
The round ships nothing to production. The next Release brings it, with the brain changed three ways, so the Release view runs
the full lab and the pair, the gate and the QA agent (R-4.4), within `LAB_BUDGET_USD`, about 30 ¢ on B. Production keeps the
waitlist over the site (ADR-167): visitors meet the new names, €54 with its launch price, the two differences, /sample at four
chapters, the method figure, /compatibility's steps and the new share preview; the dashboard and reports stay the admin's until
launch, which is R13's. After the promote: MB-13's link preview, the bible's release log (R-8.1).

## Risks
1. **Every report's words change, three ways at once** (R-5.5): the writers, the voice and the pair prompts. Each brain card runs
   the dry lab in the round; fixture runs are read on staging; the Release view's full lab and QA agent gate production.
2. **The release gate may refuse Luna.** It refuses on a new fault against r06: an em dash, a semicolon, method talk, a claim, a
   band. MB-129's default: a style slip is fixed in the prompt and spotted again; a section that still faults moves alone to Sol
   through `SECTION_MODELS`, mix A for it (11.5 ¢ on R05 usage), then S (25.1 ¢) if the scaffold fails as a group. Production
   keeps its brain until a release passes, and the Owner hears of each move.
3. **MB-70:** production depends on two ids and prices entered from the press. The Dry lights and a Spot prove the ids on
   staging; the prices stay unverified from the sandbox (ADR-165), and the gate prices both sides with the same table.
4. **The QA agent's eyes:** ADR-184 puts the reader on Sol; if Sol takes no images, step 7 fails on its first screenshot and
   `MODELS.qa` returns to 5.2. `QA_AGENT_MODEL` overrides either way.
5. **`vocabulary.ts` is drier than the voice** ("oriented to the collective") and sits in every system prompt. It is not
   regenerated here; if the lab shows its words in the prose, regenerating it is a later brain change (MB-92 holds the claims echo).
6. **The version bumps clear overrides:** every `/admin/prompts` override on staging goes at the deploy (ADR-104's way), and
   production copies staging's. That is the point, since staging must run the files; an override typed there would need typing again.
7. **The scene chips go:** a p2 report keeps only its written scene on the page; scenes written on tap stay stored, unread.
8. **The triad passages leave chapter 02** (reading 9), and /sample's chapter 02 cites none; the Owner sees it on staging.
9. **The contract changes twice** (R12-03, 13), each with codegen twice and no diff. No schema change: pins ride the workbook.
10. **User-visible without a locked spec:** the pin control and its limit line, the dashboard's summary, the quick look's empty
    lines, the story's interim look, the match list's line (MB-130), the four consequences' layout. Each passes /ux-copy and is
    listed for the Owner.
11. **A launch price before a sale exists** (ADR-169) shows on production's public pricing at the next Release; MB-114's
    consumer-law check is still the Owner's before launch (R13).
12. **The circle grows** to reports sent to the reader (ADR-182). The consent rule holds: it shows only what the reader can read.
13. **Size:** twenty-five cards in four groups, eleven in group A; the shrink path is under Parallel groups. Spend outside the
    lab's budget: about 80 ¢ of fixture runs, and the release on B.

## Questions raised (Notion, 2026-10-01)
- **Decisions:** ADR-184 (mix B, with the QA and vocabulary models and 5.2 as the control), ADR-185 (the voice) and ADR-186
  (rows no longer count rounds open; age is the Created time), all locked.
- **Raised:** **MB-128** which Sol writes the foundation (ask 2) · **MB-129** if the release lab refuses mix B (ask 1) ·
  **MB-130** the match list's offset (reading 12).
- **Updated:** MB-93 (the second difference's pair slot; ask 3) · MB-70 (production depends on its ids; how staging proves them)
  · MB-91 (pricing-and-launch is now R13) · MB-122 done.
- **Read at their defaults:** MB-103 (Stop sharing's third consequence, pairs) · MB-110 (pins shared like ticks) · MB-113 (Write)
  · MB-89 (chips) · MB-87 (the prompts' house words) · MB-92 (the prose study) · MB-30, 94 (the browser calls Nominatim).

## For the Owner (three asks, highest stakes first)
Nothing blocks the round: approving this plan starts it (§11.2).
1. **If the release lab refuses mix B (MB-129).** The gate refuses a release on any new fault against r06, and Luna is the cheap
   writer. Recommendation: we fix a style slip in the prompt and spot it again; a section that still faults moves alone to Sol
   (mix A for that section), then Sol everywhere if the scaffold fails, and you hear of each move. If silent: exactly that, and
   production keeps its current brain until a release passes.
2. **Which Sol plans the report (MB-128).** You said "sol on the foundation"; mix B as measured uses gpt-6-sol, and ADR-150 said
   gpt-6.1-sol would be tried first as the plan writer. Recommendation: gpt-6-sol now: measured in B, thinking off, about 2.0 ¢ a
   report against about 2.9 ¢ for 6.1 Sol with a thousand thinking tokens; 6.1 Sol moves in one line if a foundation session
   shows it better. If silent: gpt-6-sol.
3. **A sample pair for the second difference (MB-93).** "Your circle starts with you" quotes a pair headline and two "Try
   together" items, and no pair run exists for anyone we may show. Recommendation: after this round, write one Compatibility
   report for two of the labelled sample people (Mira and June, synthetic, charts computed) on staging and commit its headline
   and two Next time items, as /sample's run was; this lifts R11's rule that no report is written about the sample people. If
   silent: the band shows the two sample plates and their scenes, with no quoted pair text.

## Close (the orchestrator)
- **Decisions:** none at close; ADR-184, 185 and 186 are recorded.
- **Mailbox:** MB-13 done after the link preview; notes on MB-93, 103, 110, 113, 130; rows the builders raise; one row for R12's
  new words, for the Owner's look.
- **MASTERFILE 0.21:** R-5.6 says production runs mix B (ADR-184), gpt-5.2 stays as the lab's control, and later moves follow the
  reading-room rule; R-5.1 adds two friends over coffee, neither direction overdone (ADR-185); §2 item 4 names chapter 02 House
  by House.
- **CLAUDE.md:** the current focus (R12 shipped; production waits for a Release; R13 is pricing and launch).
- **INDEX:** review-01-10 built; R13 for pricing; the code map gains `home.ts` and its route, `HouseDeck`, `QuickLook`,
  `PairBlock`, `BundleList`, `ReferenceCheck`, `Differences`, `charts-meet.ts`, the names gate, and loses `pairScene.ts`,
  `SceneChips.tsx`, `ChartExplorer.tsx`; Decisions count 186.
- The Owner gets the staging URL with the three lines of step 6.
