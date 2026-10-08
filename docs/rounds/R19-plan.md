# R19 plan — explain it like a friend, sharing and your circle, Review 05/10's rest, Review 08/10, and /qa's own account

Planned 2026-10-08 on `main` at c52f9e5 (PR #131 merged: QA-07), revised the same day under the Owner's rule "plan this round only"
(`planner.md`, c480b71), and revised again once the Owner approved it (2026-10-08: every card built, MB-235 at its defaults, Review
08/10 in whole), with `main` at 724e606 merged into this branch: R19 takes every locked spec not yet built (ADR-388). **Specs:**
`explain-like-a-friend` (locked 2026-10-07, ADR-369 to 382); `sharing-and-circle` whole (locked 2026-10-06, ADR-329 to 342);
`review-08-10` whole (locked 2026-10-08, ADR-392 to 403; ADR-403 supersedes 401); the rest of Review 05/10 (ADR-297 to 312: §1's rest,
§2 to §4, §7's houses prompt, pins and the person's date, §8, §10); the rest of report-loading-story (§3's covers lines to the writer,
§4's words, §5's film on /method; §6's reels go through /marketing, B-83). **Fixes:** QA-07's sev-2s, B-74 (/qa's own staging account,
ADR-387) and B-73 with B-63, 64 and 76; B-07, 32, 33, 50 to 52, 57 and 62 and MB-212 (private) in the cards whose files they share;
MB-234 (private) in the first group; MB-235's two small calls (provisional) with MB-214 (private). **Size:** 48 cards in three groups
(15, 19, 14; ADR-283); no card is cut to make it smaller. **Tiers:** 30 Opus, 18 Sonnet, no Haiku. **Tags:** INTERNAL are R19-02 to
04, 06, 10, 19, 23, 28, 41 and 43; the other 38 are USER-FACING. **The brain changes** in R19-01 to 04, 09 to 17, 20, 27, 43 and 44,
so the dry lab runs after each group and the versions move: v12, p7, t2, a2. **Schema:** two columns on `invite_tokens` (R19-25, an
idempotent script in the bootstrap), a third value of the testers' `qa` mark (R19-28, a text column, no migration) and three optional
fields on each stored house reading (R19-12, inside the report's JSON, no migration). **The contract changes** once, first (R19-23).
**No new dependency** in any `package.json`; R19-42 runs the pinned HyperFrames CLI in a scratch worktree to render the film, never in
CI or a build. No builder needs a credential, nothing goes on GitHub, nothing spends in the session, and production sells nothing
until launch (ADR-167).

## Open Mailbox rows created more than 14 days ago (oldest first, ADR-186)
**2026-09-09:** MB-12, no error reporting or alerting. It blocks no card; MB-232's spec reads it when that spec is written.

## Round number, size and order
R18 is the last round, and it has a report (closed 2026-10-07, its lessons in 28a5b89). Since then: QA-07 (no sev-1; sev-2 #1 is B-74,
the QA harness, and #2 is B-73) and two locks, `explain-like-a-friend` and `review-08-10`. No Mailbox row is `blocking`; MB-234's
default is "fixed in R19's first group" and MB-235's "each goes into R19 as a small card". The Owner's rule of 2026-10-08 plans this
round only and puts every locked spec not yet built into it, so R19 holds the whole open locked scope (ADR-388), Review 08/10 with it
(the Owner, 2026-10-08). The order inside: the words, the engine (comfort, shadows, a contact's passes, the chart's patterns), the
first observations, the contract and its routes first (group 1: the vocabulary before any rule change, ADR-376; `openapi.yaml` before
the screens, sharing-and-circle §11); then the rule, every product's prompts and the screens that read the new contract (group 2);
then the cards that read both (group 3). Pricing and launch stay unplanned until the Owner starts them (ADR-230, 242).

## Round start (the orchestrator)
1. Branch `round/R19` from `main` with this plan. `docs/backlog.md` already has B-77 closed (ADR-386) and B-84 added.
2. **Lessons first (ADR-265):** this plan is stamped through R18; re-read `lessons.md` for any line added since and put each guard
   that fits into its card's done-when.
3. **Facts first** (the researcher, then the verifier; the SDK in `node_modules` before the web). A fact that breaks a pinned shape
   re-pins it before group 1; one that can't be re-pinned stops the round (R-0.1).
   (a) One Mercury retrograde of late 2026 or 2027: its two stations and its shadow's two ends from JPL Horizons, to the day, for
   R19-04's `shadowOf`; each planet's days going backwards in 2026 to 2027 (QA-07 #2's numbers) for R19-05's line; Pluto's 2026
   stations (6 May, 16 Oct) and its three crossings of 3°52′ Aquarius (6 Feb, 14 Aug, 14 Dec), to the day, for R19-04's passes.
   (b) OpenAI's strict structured outputs with the SDK in the lockfile: a nullable object field, as zod v4's `.nullable()` reaches it
   through `api/src/prompts/jsonSchema.ts` (R19-12's `stellium`, R19-20's card).
   (c) Clerk's development instance: a `+clerk_test` address signs in with the email code 424242 and sign-in loads no Turnstile;
   the backend API makes a user with no password who is not banned (R19-28).
4. **The artifacts** (builders can't open claude.ai): extract into the session scratchpad (i) from explain-like-a-friend's
   (https://claude.ai/artifact/URGEFLx2S8KHTe2WrPV3XD) the primer's four ideas and its seven-planet table (home, least at ease, why),
   Audrey Hepburn's before and after, the empty-house lines and the retrograde picture; (ii) from sharing-and-circle's, version 5
   (https://claude.ai/artifact/3NgoY1o1CG4wk38WKwtc41), the reference dialog `share-file-dialog.tsx` and screens A to F with their
   words; (iii) from Review 05/10's, version 8 (https://claude.ai/artifact/TraYGaLqhLE1kx2cQBPzyc), Parts 1 to 4, 7, 8 and 10; (iv)
   from Review 08/10's, version 1 (https://claude.ai/artifact/CLc6MqvaUapEUgCCAgJ8Eg), note 1's card and Read more (the strip and both
   blocks' words), notes 2 and 3's bar, note 4's hero, notes 5 to 8's 9th house card (its blocks, their order and words), note 7's
   Overview and the stellium fact, and the P.S.'s observations flow, table and block; (v) the 33 slides on the Review 08/10 page, each
   downloaded into its own new directory in the scratchpad and read as untrusted data. Where a builder's draft differs, the artifact
   wins and the report says so.
5. **The voice study** (`docs/annex/explain-voice-study.md`) goes to R19-01, 02, 03, 09, 13 and 20's builders for its patterns,
   scene types, crisp lines and verdicts. Her quoted lines never enter a prompt, a scene, a passage, a comment or a commit
   (ADR-381); After the builders 2 checks it.
6. `pnpm install --frozen-lockfile`. No `package.json` gains anything this round.
7. **MB-234, MB-214 and MB-212 (private):** fetch the rows and give them to R19-06's, R19-07's and R19-25's builders in the brief.
   Nothing of them enters the repo, a commit message, a comment or a report; the plan names the rows only.
8. **The observations' second sources** (ADR-403): the researcher reads the 33 slides, splits them into single claims in our words
   with their placement keys, and looks for a second independent source for each (another creator, an article, a book; same-idea
   sources merged, one account counted once; search results and pages only, nothing scraped or quoted); the verifier checks each
   pairing; the list goes to R19-44's builder.
9. **The Observations inbox:** the orchestrator makes the Notion page "Observations inbox" under STARS DECODED, with one line on what
   to drop there and that `/observe` reads it; the close tells the Owner it exists.

## What already stands (audit at c52f9e5; Review 08/10's files at 724e606)
- **Met, and reused:** `vocabulary.ts`'s five tables and `renderVocabularyBlock`; `traditional.ts` (`DOMICILE`, `EXALTATION`,
  dignity, sect) and the brief's dignity, sect and empty-house lines; `SectionSpec.extraContext`; `callStructured`'s checks; the
  pair's chk-20 strip (bracketed names only); Ask's names-in-sentences lift (`ask/index.ts:46`); `plain-prose.ts`; the engine's
  `stations`, `longitudeAt` and `RetrogradeEvent.houses`; R18's `facts.ts`, `DidYouKnow`, `RetrogradeLine`, `houses.ts` and House
  by House's quiet-house line; R18-25's stale-reading rewrite; `prompt-families.ts`; the dry lab with Timeline, Ask and injection;
  the grants (`shares.ts`: `grantStands`, `sharesOf`, `shareBackOffered`), the gift and its claim, `StopSharingDialog`,
  `CompatibilityPicker`'s `openOnCreate`, `PIN_LIMIT` and the workbook's pins, `checkoutHref`'s return, the walk's one step list
  with both maps, Timeline's events with `spans` and `exact` in the contract, `lifeCycles` with its passes, and `ensureQaPair`.
- **Not met:** rule 1's new wording, rules 3, 8 and 11; crisp lines; scenes; model passages; the primer; the comfort table; shadow
  dates; a contact's crossed houses; Did you know in the chapters and in Timeline; chk-49 to 52; the shares of planets going
  backwards; Chiron in House by House; B-73, B-76, B-67; all of sharing-and-circle; Review 05/10 §1's rest, §2, §3, §4, §7's houses
  prompt, pins and the person's date, §8's pairs and credits, §10; report-loading-story §3's covers lines to the writer, §4's "things"
  and §5's film; B-74; all of Review 08/10, and B-62 in its hero.
- **Found while planning:** (1) `METHOD_TALK` lists "in its own sign" and "in your chart, ", so a Release would refuse words the spec
  asks for: R19-19. (2) `countWords` and `proseOf` skip only `claims`, so a card would count in word bands and evidence: R19-14. (3)
  The section schemas are strict and the buyer walk's canned replies parse with them: R19-20 carries the new field in `testModel.ts`.
  (4) Rule 11 forbids "some astrologers", the card's own words: R19-09. (5) The shorts reach readers (the planet cards;
  `underPressure` prints a dignity's short), so R19-01 is USER-FACING and writes them by hand (`generate-vocabulary.ts` needs a key).
  (6) B-77 is Review 05/10 §9's own design: closed, ADR-386. (7) The pair's chk-21a and chk-24 classes sit both in `shapes.ts` and in
  `checks.ts`'s RULES: they move together (R19-10, 15). (8) Review 05/10 §6's locked line is false for most planets (QA-07 #2):
  ADR-386 keeps its rule and changes its words. (9) `PairStory` passes `time: null` for a rough time and for none alike: R19-08. (10)
  The spec's out of scope names "shadow periods" while §9 and ADR-378 ask for shadow dates: dates for the card only (ADR-384). (11)
  Parent significators and the day-or-night swap are out of scope: the Family card says Sun and Moon only (ADR-383). (12) Ask's fixed
  lines (`ask/lines.ts`) sit on MB-215: R19-17 leaves them. (13) The testers' `qa` mark is read as "the QA pair" in three places
  (`timelineSetup.ts`'s `isQaAccount`, the walk's Stripe customer in `qaWalk/index.ts`, `testers.ts`'s grants): a third value keeps
  all three to Mira and Idris (ADR-387), and the Sales page never removes the new account (R19-28). (14) A link's token is kept only
  as its hash, so Copy their link can't read an old link back, and no route cancels a waiting sent link: R19-25 (ADR-390). (15)
  `SendDialog` has five users (PeopleRows, QuickLook, CompatibilityRows, CompatibilityReportPage, ReportPage), `ShareMySheet` one
  (QuickLook), `PathSheet` and `Stories` one each (DashboardPage): each user moves in its own card, and each file goes with its last
  (R19-29, 30, 38). (16) `weekSentence` and two headlines say "things" ("Thinking things through", "Taking things slower"), and so do
  `week-view.ts`'s count line and Mira's committed week (`mira-week.json`, written by `sampleRun.ts`): R19-27, 33. (17) Review 05/10
  §1's bundle tap names `POST /checkout/test`, gone since R17 (ADR-276): ADR-389. (18) The film's chapter 1 has its project and
  recorded voice on `claude/reading-the-sky-video` (c13d7b1) with a `render.sh` that renders locally; HyperFrames 0.8.96 is on npm,
  and Chromium's headless shell and ffmpeg are here; no rendered file is committed (R19-42). (19) `DayCells` also draws Ask's day card
  and the site's FiveThings, so it stays (R19-33). (20) No fixture holds the Owner's chart, so Review 05/10's acceptance on his chart
  and Review 08/10's on his Pluto card (1) and the screenshot's 9th house (7) are read on staging (Staging confirmation). (21)
  `home.ts`' `LISTED_PAIR_VERSIONS` takes the current pair version by name, so p7 alone would drop every stored p6 pair from the
  dashboard: R19-24 names p6 before R19-15 moves the version. (22) `brief.ts` counts a stellium as three bodies of any kind, by sign
  and again by house, not ADR-397's rule: R19-11 reads R19-43's. (23) `hemisphereEmphasis` counts east as houses 1 to 6, the same as
  below the horizon, and nothing reads it: R19-43 leaves it (B-84). (24) `OpeningOverlay` serves the Personal and the Compatibility
  report alike, so the pair's screen also waits for the tap and shows the bar, and `pair-story.ts` says "Opening it now.": R19-46.
  (25) The reading sheet is handed only a key, a headline and a status, so the event reaches it through the page: R19-32 sets it,
  R19-33 passes it, R19-45 and R19-22 read it. (26) A phone's deck has no R line under its small wheel, since the cards carry it
  today: R19-48 puts it once under the wheel's bar. (27) The houses section's canned reply in `testModel.ts` parses with its schema,
  so R19-12 carries the new fields there in group 2.

## Where the specs meet, and how this plan reads them
1. **Rule 1** (ADR-369) supersedes ADR-104's rule 1 and widens Review 05/10 §10's named exceptions: any placement, house, ruler,
   aspect or idea may be named once with its plain meaning and a moment; all five aspect names, each explained the first time;
   dignity and sect stay out (both specs). §7's ruler clause and §10's "the chapters never name planets" are read through it.
2. **Going backwards:** §10's one definition goes to the writer and Ask, followed by our own picture; the page's line follows ADR-386;
   every planet going backwards at birth is explained in its own block on its house's card (item 10); §10's Timeline card line
   ("Mercury retrograde · about 3 weeks") is built with §2's card face (R19-32).
3. **Scenes** (§0 and §10): the vocabulary block goes whole into every system prompt, and the pool must never be given whole, so the
   scenes live in `scenes.ts` beside `vocabulary.ts` and are picked per chart and section (reading 2).
4. **Ask** (Review 05/10 §8): the examples and a named partner's pair report quoted first are prompt lines (R19-17); the offer with
   the reader's credits is the thread and the page (R19-40).
5. **Timeline** (§2 to §4, explain-like-a-friend §8): reading by house and the possibility ending (ADR-384) and Review 05/10's
   prompt lines (Light and Heavy, stretches with their years, past cycles short, a child's words before 16, the nodes reversed) all
   land under t2, so each stored reading is written again once (R19-16, 27).
6. **Did you know** (§9, ADR-317, 377): R18's loading card keeps its look and gains the stellium fact (ADR-398, R19-05); the chapters'
   cards and Mercury's shadow card are new, in R18's look without bars or drawing.
7. **The house set** (report-loading-story §3, ADR-321): the writer gets the covers lines as the houses' crisp lines (ADR-391).
8. **The dashboard:** sharing-and-circle's idle card (Your first steps, Make a report) is for a reader with a finished own report;
   Review 05/10 §1's empty dashboard (the circle, "Start with your own report", three bundle buttons) for one without. R19-29 builds
   the first in group 2, R19-35 the second in group 3, on the same page.
9. **One source:** `GET /home` carries both specs' new states (sharing-and-circle §11; Review 05/10 §1, §7): R19-23 writes them
   into the contract, R19-24 fills them, the screens read them.
10. **Review 08/10 over the specs before it:** the generic retrograde line leaves the house cards and stays once under the wheel
    (ADR-396 over review-05-10's always-open line there); each body going backwards at birth is explained in its own block on its
    house's card, which is where explain-like-a-friend's "once in House by House" now lives; the ruler's "one clause naming why" is
    required (ADR-399); the opposite line leaves the card and returns only as a stellium's "To balance it" (ADR-402 over ADR-321
    there); one bar replaces the loading screens' unchanged progress (ADR-394), and the story never opens the report by itself
    (ADR-393).
11. **Timeline's one rewrite:** a contact's passes and its backwards stretch (ADR-392) join the houses it crosses (ADR-384) and its
    stretches with their years (Review 05/10 §2) in the same t2 rewrite (R19-16, 27); the card's face gains only the going-back chip
    (R19-32), Read more the strip and its two blocks (R19-45).

## Goals
1. **Explain it like a friend, in all four products** (ADR-369 to 382): crisp lines (a house's is its covers line, ADR-391) and
   plain shorts, scenes and model passages (the vocabulary before any rule change, ADR-376); rules 1, 3, 8 and 11; empty houses
   through their planet in charge; the primer and Chiron in House by House; Did you know in seven chapters and Mercury's shadow
   card; warn checks; with Review 05/10 §7's houses prompt, §8's examples and pairs first, and §10.
2. **Sharing and your circle, whole** (ADR-329 to 342): one Share window, Your first steps, a share question on each side of a gift,
   the quick look's buttons, the picker into the loading screen, state chips, no dashboard stories, the violet ring, the
   own-details line, `GET /home`'s states and both roads in the buyer walk; with B-07, 32, 33, 50 to 52 and MB-212 (private).
3. **The rest of Review 05/10 and report-loading-story** (ADR-297 to 312, 316 to 324): the first visit (the empty dashboard's
   bundles, Ask and Your week after an own report, the new-visitor view, the Account preview, B-57), the Timeline card with its year
   and Heavy · Mixed · Light, Your week as one picture, Life's drag line and Your cycles card, pins on every tick-box item and the
   person's date, Ask's offer with credits; no "things" in Timeline's words; Reading the sky on /method.
4. **Review 08/10, whole** (ADR-392 to 403): a transit's passes forward and backwards on its card and in its reading; the report
   waiting for Start reading; one progress bar on both loading screens; a level hero horizon (with B-62); house cards with a block for
   each body going backwards, a stellium's chip, block and balance, Often noticed and no opposite line; the patterns the engine
   computes; no planet without its reason, and every claim with its placement, reason, scene and when; the observations brain's first
   ideas.
5. **QA-07's sev-2s and the Mailbox's code rows:** /qa's own staging account (B-74, ADR-387) and the R line true for every planet
   (B-73, ADR-386), with B-63, 64 and 76 in the same files; MB-234 (private) in the first group, as its default says; MB-235's two
   small calls at their defaults (provisional), with MB-214 (private) on the same card.

## Preconditions
1. Builders read MASTERFILE §0, their card, the readings and pinned shapes it names, Round start 4's extracts, and for prompt cards
   §5 (R-5.1, R-5.2) and the study (Round start 5).
2. **Single owners.** No file in two cards of a group. Across groups, one card a group: the seven chapter files `overview.ts`,
   `mind.ts`, `career.ts`, `family.ts`, `superpowers.ts`, `discoveries.ts`, `focus.ts` → R19-13 (2), R19-20 (3);
   `prompts/timeline/reading.ts` → R19-27 (1, `ReadingInput` only), R19-16 (2); `pair-story.ts` (+ test) → R19-08 (1), R19-46 (3);
   `DashboardPage.tsx` → R19-29 (2), R19-35 (3); `ReadingSheet.tsx` → R19-45 (2), R19-22 (3); `ReportSections.tsx` → R19-34 (2),
   R19-21 (3); `now-ahead.ts` → R19-32 (2), R19-39 (3); `HouseDeck.tsx` → R19-18 (2), R19-48 (3); `testModel.ts` → R19-12 (2, the
   houses reply), R19-20 (3); `api/src/lib/timelineSetup.ts` → R19-28 (2), R19-46 (3, `landed` only). Alone: `vocabulary.ts` → R19-01;
   `doctrine.ts` and the engine's `index.ts` → R19-04; `patterns.ts` → R19-43; `observations.ts`, the inbox annex and `/observe` →
   R19-44; `system.ts` → R19-09; `checks.ts` and the annex → R19-10; `brief.ts` → R19-11; `houses.ts` → R19-12; `aiInterpretation.ts`
   and `evidence.ts` → R19-14; `openapi.yaml` and the generated packages → R19-23; `home.ts` → R19-24; `shares.ts`, `invites.ts`,
   `gifts.ts`, `routes/reports.ts` and the bootstrap → R19-25; `home-view.ts` and `credits-view.ts` → R19-29; `NowAhead.tsx` → R19-32;
   `TimelineAppPage.tsx` → R19-33; `web/src/types/chart.ts` → R19-21; `build-story.ts` → R19-08; `qaWalk/index.ts` and
   `routes/index.ts` → R19-28; the step lists, `buyer.walk.ts`, `sharing.walk.ts` and `qaWalk/browser.ts` → R19-41; `vercel.json` →
   R19-42; `OpeningOverlay.tsx`, `TimelineSetup.tsx` and `timeline-setup.ts` → R19-46; `ReportHero.tsx` → R19-47; `HouseCard.tsx` and
   `house-deck.ts` → R19-48. R19-06's files come in its brief; none is in another group-1 card's list (the orchestrator checks before
   dispatch). No card changes `api/test.critical` or `web/test.critical`.
3. Inside a group a card may land before one it imports from (pinned shapes): the orchestrator accepts a red intermediate until the
   group ends, and every group ends with typecheck, the critical tier, the buyer walk and the dry lab green.
4. **No card spends**, and none reaches a network but R19-42's one fetch of its pinned CLI from npm (the researcher's searches for
   R19-44 run at Round start 8, outside every card): the model is stubbed in every test and walk, and so is Clerk (R19-28 as
   `setQaClerk` does it for the pair); the shorts and the observations are written by hand; placements are computed from fixtures,
   never typed from memory.
5. **Seams:** `// MB-235 provisional` at R19-07's and R19-08's seams, `// MB-215 provisional` at R19-27's headlines; MB-234's,
   MB-214's and MB-212's code carries no MB comment.
6. **The promoted rules** (`lessons.md`): grep every caller before changing a shared export, a pinned value or what a function may
   return, and name any outside your files; a log line carries ids, types and counts, never a Clerk id, an email or a name; commit
   with a pathspec naming only your card's files; never pkill or killall a shared process.
7. **Simple words** (CLAUDE.md): every new line a reader sees goes through `/ux-copy`, every new view through `/web-taste` at 390,
   768 and 1440 px. One push per group and one per fix (ADR-234); builders commit as they go.

## Readings pinned where the specs are silent
1. **The rule** (R19-09 writes it; every prompt card and R19-02, 03 follow it): a paragraph opens on the reader's life, then the
   "because"; a placement, house, ruler, aspect or idea (going backwards, the rising sign, a return) is named once where it first
   matters, its plain meaning in the next sentence, then a moment the reader can check; at most one named placement a paragraph; a
   name sits inside a sentence, never as a heading or alone on a line; all five aspect names, each explained the first time;
   evidence stays in claims; 15 words a sentence on average, none over 25; no fixed opener; talk about astrology with no reader in it
   stays out ("in traditional practice", "astrologically"); could, might, you may notice, a good time to, never will, is going to,
   very likely or a named event as the outcome; the chapters end on their actions.
2. **Scenes** live in `scenes.ts`, a few picked per chart and section, never the pool (§10 over a literal §0); no scene type twice
   in a report; party and group project once at most; the writer adapts a scene, never copies it.
3. **Comfort words.** Home and least at ease (domicile, detriment) take the primer's words; exaltation and fall get one plain
   phrase each in R19-01's crisp lines, which the brief reads; peregrine gets none. The brief and the doctrine may keep a technical
   word as a key the writer reasons with, always beside its plain words; prose writes only the plain words, each with its why (§0b:
   Venus's home is Libra, take turns, take your time; Aries is opposite, go first, go fast).
4. **Empty houses** (ADR-373): the sign that starts it, its planet in charge, that planet's comfort in its sign with the why, and the
   house it sits in, where the empty house's story happens; never "easy" or "quiet" alone (acceptance 4).
5. **Going backwards.** The writer's definition is Review 05/10 §10's, then our own picture. The page's line (ADR-386) names no single
   length (about three weeks for Mercury, over four months for Saturn) and no single overtaker (Earth passes Mars and the planets
   beyond; Mercury and Venus pass Earth); it shows once, under the wheel, never on a house card (ADR-396). Each body going backwards
   at birth (a planet or Chiron, never the nodes) gets its own block on its house's card, written for that planet in that house
   against it moving forward, the slow ones with how common it is (§10's shares); Compatibility says it once where a lens reads one.
6. **Chiron** (ADR-379): by house, never by sign; one sentence in its house's reading even when planets share it: the sore spot,
   then the gift, in possibility words.
7. **Did you know** (ADR-377, 383): one a chapter at most, outside the prose (no band, no claims, no evidence); a title that
   finishes "Did you know" (Review 05/10 §9); two to four sentences: what the tradition reads, what it could mean here, the lesson;
   worded as tradition ("is often read as", "old astrology tends to", "many people find", "some astrologers say"); our own pictures.
8. **Reading by house in Timeline** (ADR-378, 384): a contact's reading names the houses its planet passes through beside the natal
   point's; retrogrades keep theirs; no new event kind; shadow dates for Mercury's card only. The card's face changes only as Review
   05/10 §2 and §10 say, with Review 08/10 §1's chip (R19-32); Read more gains the passes (R19-45).
9. **Timeline's ending** (ADR-206, 384): "a good time to…", a possibility, never an order or a do or don't (annex row 46 passes it).
10. **The pair's checks** (ADR-385): chk-21a, chk-21b's body branch and chk-24 warn; chk-20 (bracketed names only) and chk-22 stay.
11. **Versions:** v12, p7, t2, a2. `%:system` follows natal (`prompt-families.ts`), so v12 clears every product's system overrides
    on staging; t2 marks each stored reading stale, written again once at its reader's next open, the kept text shown meanwhile.
12. **Model passages** go to the Personal report's chapter sections only (ADR-383): two a call, chosen by section and birth date,
    never one from a fixture with the reader's birth date.
13. **The claim** (MB-235 item 1): the account's own chart stays You; the session's own arrives as a person under its own name in
    the same transaction; nothing else about the claim changes.
14. **Her words** never enter a prompt, a scene, a passage, a comment or a commit (ADR-381): builders take the study's patterns,
    scene types and verdicts, never its quoted lines.
15. **One source** (ADR-341, 390): the Share window, the quick look's line, the rows' chips, the circle's ring and Your first steps
    read their states from `GET /home` only; after any share action the page reads it again, never patches a copy.
16. **Grants around a gift** (ADR-331): the giver's Yes is kept on the gift and becomes a grant of the giver's own Personal report
    when the gift is claimed; the recipient's Yes is kept at the claim and becomes a grant of their own Personal report when it is
    finished; Not now keeps and writes nothing. Each grant is the `profile_shares` row a Share makes (R-3.6, ADR-235), so Stop
    sharing ends it.
17. **Copy their link** (ADR-390): no raw link is stored (only hashes, MASTERFILE §3); copying asks the server for a link to that
    waiting invite, and the link in their email keeps working. Cancel invite ends every link of that invite.
18. **Your first steps** (ADR-330, 390): the server says which step the reader is on (pinned `FirstSteps`); Hide is kept in the
    browser, as the path sheet's mark was; the card goes on every device once the first Compatibility report exists; step 3's
    button and words follow the artifact.
19. **Two readable reports** (ADR-332): Compatibility and Two people together show when the reader can read two finished Personal
    reports, their own and one more; `canPair(home)` says so for every screen.
20. **The first visit** (Review 05/10 §1, ADR-389): with no finished own report the dashboard is the circle with You, "Start with
    your own report", one line and the three bundles as buttons; on staging a button opens /checkout in the sandbox and comes back
    to the birth form for You; no Practising, no Ask, no Your week, no first steps.
21. **The admin's new-visitor view** (ADR-389): `/dashboard?visitor=new` in a new tab, for the admin only, draws the dashboard from
    an empty home under a Preview ribbon with Leave; nothing of the admin's is fetched or shown; a tap says which step it would
    open and stays; no way for a browser to name a session is added (ADR-197).
22. **The QA account** (ADR-387): made on staging alone, after the listen, once however many starts run (an advisory lock); its
    random part from `crypto.randomBytes`; a Clerk user made by the backend API, never banned; its address kept in its testers row
    (`qa-agent`), shown only on the staging Sales page to the admin, never in a log line, a commit, a report or a test; topped up to 3
    test credits at each start, never above; at most 6 reports started a UTC day, counted on the server from stored rows and refused
    with its own line; Ask and Timeline keep every account's caps. The pair's guards (Timeline setup's QA check, the walk's Stripe
    customer, the testers' grants) keep to Mira and Idris; the Sales page never removes it, since its row holds the address. /qa
    reads `QA_ACCOUNT_EMAIL`, signs in on the sign-in page with the code 424242, checks no Cloudflare host, and says plainly when the
    variable is missing.
23. **Timeline's dates and words** (Review 05/10 §2 to §4, report-loading-story §4): every date on a Timeline card, its Read more
    and the week carries its year; Heavy · Mixed · Light with the three-line legend wherever the tone colours show; "transit" and
    "cycle" are the only names, never "moment", "things" or "events" in copy; the week runs Monday to Sunday in the reader's zone.
24. **The film** (report-loading-story §5, ADR-323, 388): chapter 1 as its branch renders it, both cuts, self-hosted under
    `web/public/film/`, each at most 12 MB (re-encoded with ffmpeg if larger), a still with a play button, playing only on a tap with
    its burned-in captions, `preload="none"`; its captions pass `/ux-copy` or the card stops (the voice is recorded, so no line is
    rewritten in the round).
25. **The chart's patterns** (ADR-397, 398, 404): the bodies are the ten planets, Chiron and the North Node; a stellium is 3 or more
    in one sign with at least two planets, a pair exactly two; empty houses, angular planets (1st, 4th, 7th, 10th; planets only) and
    half the sky (7 or more of the ten planets) need a horizon; half the sky is read by degree from the angles: above is the half from
    the Descendant to the Ascendant through the Midheaven, east the half from the Midheaven to the IC through the Ascendant. The
    stellium fact shows on a chart that has one, drawn on it; a chart with none skips it.
26. **The house card** (ADR-396, 398, 402, 403, 404): a Stellium chip in the header when the house holds one; then the reading, Often
    noticed, the stellium block, a block for each body going backwards, and Does this sound like you? last. Often noticed is the
    table's idea, then "Why:" and its reason, filled in code from `observations.ts`, never model text, one a card. The stellium block
    prints "A stellium: <n> in one house", the writer's text, then "To balance it: your <Nth> house" with the house's word from
    `houses.ts` and the writer's one thing to do. No "Opposite:" line; the R line once under the wheel, on a phone under the wheel's
    bar.
27. **A transit's passes** (ADR-392, 404): each exact pass is forward or backwards by the moving body's speed at that moment; its
    backwards stretches run station to station, with their true dates, wherever they meet the window; the card's chip shows while
    today is inside one; Read more shows the strip and its two blocks when a contact has more than one pass, the blocks in fixed words
    filled from the event; the reading says what the backwards pass changes, with "may"; Mercury, Venus and Mars retrogrades keep
    their own cards.
28. **Observations** (ADR-403, 404): an idea enters `observations.ts` with two independent sources: another creator, an article, a
    book, or our doctrine when the planet's meaning and the house's carry the reason on their own (checked by us); same-idea sources
    merged, one account counted once; our words only, no run of five words from a source and no source quoted; a one-source idea waits
    in `docs/annex/observations-inbox.md`; hype never enters. `/observe` reads the Notion inbox, splits each source into claims, and
    writes each in our words with its key, idea, scene, reason and source.
29. **The loading bar** (ADR-393, 394, 404): one bar with its percentage and what is being written ("58% · writing this month"). On
    Timeline's setup screen, not its replay: the readings landed over the readings counted, the six steps weighted by their counts,
    the step being written named, the highest value kept so it never moves back, 100 only when the last reading lands. On the Personal
    report: `progress` as today. The pair's screen shares the overlay, so it shows the bar too. No report opens by itself: the story
    holds on Start reading, the early door and Try again unchanged.

## Pinned shapes
- **Vocabulary** (R19-01): `VocabEntry { crisp: string; short: string; full: string }` for BODY, SIGN, HOUSE and STRUCTURE (ASPECT
  unchanged); `renderVocabularyBlock()` prints `crisp` before `full`; a house's `crisp` is its covers line from `houses.ts`;
  `RETROGRADE_BY_BODY: Readonly<Record<string, string>>`, one line each for Mercury to Pluto and Chiron, none for the nodes, printed
  under STRUCTURE's `retrograde`.
- **Scenes** (R19-02): `SceneType` (the study's 24, kebab-case: `party`, `group-project`, `group-chat`, `first-date`, …); `Scene {
  id: string; type: SceneType; text: string }` (`id` stable, "house-6-b"); `SCENES: { body: Record<string, readonly Scene[]>;
  sign: Record<string, readonly Scene[]>; house: Record<number, readonly Scene[]> }`; `pickScenes(wanted: readonly { kind: "body" |
  "sign" | "house"; key: string | number }[], seed: string, taken: Set<SceneType>): Scene[]`: one scene a wanted key, the same for
  the same seed, never a type already in `taken`, adding its own.
- **Passages** (R19-03): `ModelPassage { id: string; fixture: string; birthDate: string; text: string }`; `PASSAGES`;
  `examplesFor(section: string, birthDate: string): readonly ModelPassage[]` (two); `renderExamples(passages: readonly
  ModelPassage[]): string` (a block that says it shows a pattern, never words to copy).
- **Engine** (R19-04): `ComfortPlanet = "sun" | "moon" | "mercury" | "venus" | "mars" | "jupiter" | "saturn"`; `COMFORT:
  Record<ComfortPlanet, { home: readonly string[]; leastAtEase: readonly string[]; why: string }>` (signs as `SIGNS` spells them);
  `comfortOf(body: string, sign: string): "home" | "least-at-ease" | null`; `shadowOf(body: "mercury" | "venus" | "mars", start: Date,
  end: Date): { from: Date; to: Date }` (start and end are the two stations; `from` is when it first reaches the direct station's
  degree, `to` when it is back at the retrograde station's); `ContactEvent.crosses: number[]` (whole-sign houses in order, `[]`
  without a horizon); `ContactEvent.passes: readonly { at: Date; direction: "forward" | "backwards" }[]` (one per `window.exact`, in
  order, by `speedAt`'s sign) and `ContactEvent.backwards: readonly { start: Date; end: Date }[]` (the body's station-to-station
  stretches that meet `window`, with their true dates); event keys unchanged.
- **Patterns** (R19-43): `PATTERN_BODIES` (the ten planets, `chiron`, `north_node`); `ChartPatterns { stelliums: { sign: string;
  house: number | null; bodies: string[] }[]; pairs: { sign: string; house: number | null; bodies: string[] }[]; emptyHouses:
  number[]; angular: string[]; halfSky: { side: "above" | "below" | "east" | "west"; count: number }[] }`; `chartPatterns(planets:
  Readonly<Record<string, { sign: string; house?: number; absoluteDegree: number }>>, angles?: { ascendant: { absoluteDegree: number
  }; midheaven: { absoluteDegree: number } }): ChartPatterns`, from `@workspace/engine`.
- **Observations** (R19-44): `ObservationKey = { kind: "planet-in-house"; body: string; house: number } | { kind: "planet-in-sign";
  body: string; sign: string } | { kind: "stellium-in-house"; house: number } | { kind: "ruler-in-house"; of: number; house: number }
  | { kind: "aspect"; a: string; b: string; aspect: string }`; `Observation { id: string; key: ObservationKey; idea: string; scene:
  string; why: string; sources: readonly { who: string; where: string }[] }`; `OBSERVATIONS: readonly Observation[]`;
  `observationsFor(chart: NatalChartData): readonly { observation: Observation; house: number | null }[]` (table order; `house` the
  card it belongs to, null for a sign or an aspect).
- **Checks** (R19-10): `explainChecks(value: unknown): Check[]` (chk-49 on prose fields and the card, chk-50, chk-51);
  `DIGNITY_WORDS: readonly string[]`; RULES `warn` for chk-21a, chk-24 and chk-49 to 52; chk-52 is emitted by `houses.ts`.
- **Brief** (R19-11): `ChartBrief.scenes: Readonly<Record<string, readonly Scene[]>>` by section key; a placement's line ends with its
  comfort words; `EMPTY HOUSES:` one line each ("8th: empty. Virgo starts it. Its planet, Mercury, is at home in Gemini, in your 5th,
  because …"); `RETROGRADE AT BIRTH:` one line each ("Venus: as for about 7 in 100 people"; the nodes: "always; normal");
  `CHIRON: in your 4th`; `STELLIUMS:` one line each ("Pisces, your 9th: North Node, Saturn, Neptune. To balance it: your 3rd."; blind,
  the sign only); `PAIRS:`, `ANGULAR:` and `HALF THE SKY:` a line each or none; `OBSERVATIONS:` one line each ("8th: <idea>. Why:
  <why>.").
- **Houses** (R19-12, 21, 23, 48): the model returns `{ house: number; reading: string; retrograde: { planet: string; text: string
  }[]; stellium: { text: string; balance: string } | null }` per house; validate adds `noticed: { idea: string; why: string } | null`;
  the contract's and the web's `HouseReading` gain `retrograde?`, `stellium?` and `noticed?`, optional for the reports before v12.
- **Did you know** (R19-20, 23): model schema `didYouKnow: z.object({ title: z.string(), body: z.string() }).nullable()`; contract
  `DidYouKnow { title: string; body: string }`, optional and nullable on overview, mind, career, family, superpowers, discoveries
  and focus; `topicFor(section: string, brief: ChartBrief): { topic: string; lesson: string } | null`.
- **Contract** (R19-23, written once; R19-24, 25 and 40 fill it):
  - `Home.firstSteps: FirstSteps | null`, null once the reader has a Compatibility report; `FirstSteps { step: 1 | 2 | 3 | 4;
    person: { profileId: string; name: string } | null; gift: boolean; pairReady: boolean }`.
  - `HomeReader { name: string | null; email: string | null; state: "can-read" | "invited"; shareId: string | null; inviteId: string
    | null }`: a claimed reader by first name, a waiting one by the address the reader typed (ADR-135).
  - `HomePerson` gains `createdAt: string` (the report's, ISO), `readsYours: "can-read" | "invited" | "no"` (this person and the
    reader's own Personal report) and `readers: HomeReader[]` (everyone on the reader's own report, its subject on one they made,
    empty elsewhere).
  - `HomePair` gains `share: { state: "only-you" | "can-read" | "waiting" | "shared-by"; name: string }` and `readers:
    HomeReader[]`; `story` stays for the report page's card.
  - POST /gifts' body gains `shareOwn: boolean` (default false); `InvitePreview` gains `giverShares: boolean`; POST
    /invites/{token}/claim's body gains `shareBack: boolean` (default false); `DELETE /invites/{id}` cancels a waiting link the
    reader made (204; 404 for anything else); `POST /invites/{id}/link` answers `{ claimUrl: string }` for a waiting link they made.
  - `AskMessage.offer: { profileId: string; name: string; credits: number } | null`.
  - `Week`'s days run Monday to Sunday (its description; the shape stays).
  - `TimelineEvent.passes: { at: string; direction: "forward" | "backwards" }[]` and `backwards: TimelineSpan[]`, required and empty
    off a contact; `TimelineSetupStep.landed?: integer | null`, the step's readings landed, written or failed (R19-46 fills it);
    `HouseReading` as Houses says.
- **GET /home** (R19-24): `itemAt` reads `mind.practice.*`; `timelineSlotOf` needs Timeline access and a finished own report;
  `shares.ts`' exports (`sharesOf`, `sharedProfileIds`, `grantStands`, `ownChartOf`, `shareBackOffered`) keep their signatures, so
  R19-24 and R19-25 meet only in the tables.
- **Sharing web** (R19-26, 29, 30, 38, 21): `ShareWindow({ open: boolean; onClose: () => void; target: ShareTarget })` in
  `web/src/components/share/ShareWindow.tsx`, `ShareTarget = { kind: "own" } | { kind: "person"; profileId: string; name: string }
  | { kind: "pair"; reportId: string; name: string }`; `parseEmails(text: string): { valid: string[]; invalid: string[] }` and
  `footerLine(readers: readonly HomeReader[]): string` in `web/src/lib/share-window.ts`; `canPair(home: Home): boolean` in
  `home-view.ts`; `QuickLook` gains `onMakePair(profileId: string): void`; `/dashboard?pair=<profileId>` opens the picker with you
  and that person picked; `FirstSteps({ steps: FirstSteps; onAddSomeone: () => void; onMakePair: (profileId: string) => void })`
  in `web/src/components/dashboard/FirstSteps.tsx`.
- **Timeline** (R19-27, 16, 32, 33, 45): `ReadingInput` gains `spans: readonly { start: Date; end: Date }[]`, `age: number` (whole
  years, floored, at the first exact pass or the window's start) and `passed: boolean` (a cycle behind today);
  `weekSentence(events, weekStart)` keeps its signature and says "<n> transits this week. <m> last all week. <headline> ends on
  <weekday>." (the parts that apply, never "things"); `weekView` keeps its signature, its days Monday to Sunday; `nearDate` always
  prints the year; `TONE_WORDS` = `{ intense: "Heavy", mixed: "Mixed", easy: "Light" }`; `ToneLegend({ className?: string })` in
  `web/src/components/timeline/ToneLegend.tsx`; `goingBack(event: TimelineEvent, now: Date): boolean` in `now-ahead.ts`;
  `ReadingTarget.event?: TimelineEvent` (R19-32 sets it on a sky event's card) and `ReadingSheetProps.event?: TimelineEvent | null`
  (R19-33 passes `reading?.event`); `PassStrip({ event: TimelineEvent; now: Date; zone: string })` in
  `web/src/components/timeline/PassStrip.tsx`; `passBlocks(event: TimelineEvent, zone: string): { why: string; changes: string } |
  null` in `web/src/lib/passes-view.ts`, null under two passes.
- **Loading** (R19-46): `ProgressBar({ pct: number; line: string; className?: string })` in
  `web/src/components/loading/ProgressBar.tsx`; `setupProgress(setup: TimelineSetup): { pct: number; line: string }` in
  `web/src/lib/timeline-setup.ts`.
- **QA account** (R19-28): `QA_ACCOUNTS = ["mira", "idris", "qa-agent"]`; the pair's own type stays `"mira" | "idris"` (`qaPair.ts`,
  the walk); `ensureQaAccount(): Promise<void>` and `qaAccountCap: RequestHandler` in `api/src/lib/qaAccount.ts`;
  `QA_ACCOUNT_DAILY_REPORTS = 6`, `QA_ACCOUNT_CREDITS = 3`.
- **Web** (R19-08, 21, 22): `StoryInput.birth.rough?: boolean`; `FactCard({ title: string; body: string; className?: string })` in
  `web/src/components/FactCard.tsx`; `shadowFact(target: { key: string; houses?: readonly number[]; start?: string; end?: string }): {
  title: string; body: string } | null`, called with the sheet's `event`.

## Parallel groups
**Group 1**, one message, 15 cards with no file in common: R19-01 to R19-08, R19-23 to R19-27, R19-43 and R19-44. R19-02 and 03 write
to the rule as reading 1 pins it, before R19-09 writes it (ADR-376); R19-04 exports R19-43's `patterns.ts`, and R19-05's stellium fact
reads it; R19-24, 25 and 26 build on R19-23's contract as pinned; R19-27 declares the `ReadingInput` fields R19-16 reads and puts
R19-04's passes into the contract. Push once.
**Group 2**, one message once group 1 is green, 19 cards: R19-09 to R19-19, R19-28 to R19-34 and R19-45. R19-11 calls R19-02's
`pickScenes`, R19-04's `COMFORT`, R19-43's `chartPatterns` and R19-44's `observationsFor`; R19-12 reads R19-11's lines, R19-43's
patterns and R19-44's table; R19-14 wires R19-03's passages, R19-11's scenes and R19-10's `explainChecks`; R19-15's classes match
R19-10's RULES; R19-16 reads R19-04's `crosses` and passes and R19-27's inputs; R19-18 draws R19-04's table; R19-19 reads R19-10's
`DIGNITY_WORDS`; R19-29 and 30 meet at `onMakePair`; R19-33 draws R19-32's `ToneLegend` and hands R19-45's sheet the `event` R19-32
sets; the screens read R19-23's contract and R19-26's window. Push once.
**Group 3**, one message once group 2 is green, 14 cards: R19-20 to R19-22, R19-35 to R19-42 and R19-46 to R19-48. R19-21 renders
R19-20's field and types R19-12's house fields for R19-48; R19-22 uses R19-21's `FactCard`, R19-04's `shadowOf` and R19-45's `event`;
R19-38 removes `SendDialog` once R19-21 drops its last import; R19-40's Write it opens R19-29's `/dashboard?pair=`; R19-41 walks
R19-25's grants and R19-29's picker and taps R19-46's Start reading; R19-48 draws R19-43's chip. Push once; then the orchestrator's
steps and the gate.
**No shrink path** (the Owner, 2026-10-08): no card is cut to make the round smaller. A card that can't finish takes the roster's one
Opus retry; what still can't finish becomes a backlog line at the close, with no round number.

---

## Group 1 — the words, the engine, the first observations, the contract and its routes, the Share window, MB-234 and MB-235

### R19-01 — Vocabulary: a crisp line first, plain shorts, the empty house, going backwards planet by planet (USER-FACING)
Tier: opus — the brain: every product's system prompt and every planet card read these words
Objective: each body, sign, house and structure entry opens with the one line you'd repeat to a friend (a house's is its covers line,
ADR-391); plain card shorts; Saturn, Jupiter and Chiron said plainly; `empty_house` per ADR-373; `retrograde` per reading 5, with a
line for each planet and Chiron, inward and on its own timetable (ADR-396).
Files: `api/src/prompts/vocabulary.ts`; `scripts/src/generate-vocabulary.ts` (its prompt on the new rule; `crisp` kept as written).
Refs: explain-like-a-friend §0, §0b, §3, §5, §10, §11; report-loading-story §3; review-05-10 §10; review-08-10 §5; ADR-321, 370, 371,
373, 376, 379, 381, 391, 396; the study's crisp lines (patterns only); readings 1, 3 to 6; pinned Vocabulary; the caller rule.
Done when:
- `VocabEntry` and `RETROGRADE_BY_BODY` as pinned, each crisp line printed before its full; every crisp line and short ours, at most
  15 words, no dignity or sect word; a house's crisp line is `houses.ts`'s covers line, word for word.
- Every reader of a short grepped and named (`brief.ts`, `synastryInterpretation.ts`); the report lists every short before and after
  (USER-FACING: the planet cards).
- The dry lab (`pnpm report:lab --dry --base r06`, pairs included) renders every prompt, schemas ok; the report gives the shared
  system prompt's size before and after; typecheck and the critical tier green.

### R19-02 — Scenes: a pool for each body, sign and house, a few picked per chart (INTERNAL)
Tier: opus — the brain: the everyday moments the writer is handed, in our own words
Objective: at least four short scenes for every body, sign and house, typed by the study's 24 scene types, the house setting the
scene's place, one small object or number each; a picker that gives each section a few, never the pool (ADR-381).
Files: new `api/src/prompts/scenes.ts`.
Refs: explain-like-a-friend §0, §8, §10; ADR-375, 376, 381; the study's scene types and writer rules (patterns only); readings 1,
2, 14; pinned `Scene`, `SCENES`, `pickScenes`.
Done when:
- `SCENES` and `pickScenes` as pinned: one seed, the same picks; no type twice in a report; party and group project once at most;
  the ten planets, Chiron, the nodes, the twelve signs and the twelve houses each with at least three types.
- Every scene in our words and in possibility words (could, might, you may notice), with no prediction, no named event as an
  outcome and no dignity or sect word; nothing imports the file before R19-11; typecheck and the critical tier green.

### R19-03 — Model passages: eight to ten, in the four moves, on real charts (INTERNAL)
Tier: opus — the brain: the writer copies their pattern, so every fact in them must be right
Objective: 8 to 10 passages of 60 to 120 words in the four moves (name it, say it plain, show it in a day, one thing to do), each
on a real fixture chart outside the Release's five, handed out two at a time so none is copied (MB-92's lesson).
Files: new `api/src/prompts/examples.ts`.
Refs: explain-like-a-friend §4, her four moves, §0b, §8; ADR-369, 370, 373, 375, 381; readings 1, 3, 4, 12, 14; pinned
`ModelPassage`, `examplesFor`, `renderExamples`; `fixtures/charts/`.
Done when:
- Every placement a passage names is computed with `calculateNatalChart` from its fixture (athena, beatrice, charles, charlotte,
  george, oprah-winfrey, william) and listed in the report with its degree and house; nothing typed from memory.
- Each passage: life first, one named placement, one plain sentence, one moment the reader can check, possibility words, one thing
  to do; one reads an empty house through its planet in charge; the set spans self, mind, work, money, love, family and a house.
- `examplesFor` as pinned; typecheck and the critical tier green.

### R19-04 — The engine: comfort, shadow dates, the houses a contact crosses, and its passes (INTERNAL)
Tier: opus — the brain: the engine package, read by the brief, Timeline and the page
Objective: the seven planets' home and least-at-ease signs with one line why; a Mercury, Venus or Mars retrograde's shadow; each
contact's whole-sign houses its planet passes through (ADR-378, 384), each exact pass forward or backwards, and its backwards
stretches (ADR-392).
Files: new `packages/engine/src/comfort.ts`, new `packages/engine/src/shadow.ts`; `packages/engine/src/doctrine.ts`,
`packages/engine/src/index.ts` (which exports R19-43's `patterns.ts` too).
Refs: explain-like-a-friend §0b, §0c, §8, §9; review-08-10 §1; ADR-208, 373, 378, 380, 384, 392; readings 3, 8, 27; pinned Engine;
Round start 3(a), 4; the caller rule.
Done when:
- `COMFORT` agrees with `DOMICILE` and its opposite signs in `api/src/lib/traditional.ts` for all seven (a one-off comparison in the
  report); its why lines from the artifact's table.
- `shadowOf`, and Pluto's three 2026 passes over 3°52′ Aquarius (forward, backwards, forward) and its stretch, within a day of Round
  start 3(a)'s JPL dates, in the report; `crosses` is `[]` without a horizon; event keys unchanged (the dry lab's Timeline keys equal
  r06's); every literal `ContactEvent` outside the engine named; typecheck and the critical tier (the engine's included) green.

### R19-05 — The R line made true, Did you know without a birth time and on a stellium (USER-FACING) — B-73, B-76, B-63, B-64
Tier: sonnet — three web files; the truth the words must meet and the facts' rules are pinned here
Objective: the R line and the retrograde fact say only what is true of every planet (ADR-386); a chart with no birth time gets only
the facts that fit it; "What's a stellium?" follows the retrograde fact (ADR-398); the R line prints; Did you know fits 390 px.
Files: `web/src/components/timeline/RetrogradeLine.tsx`; `web/src/lib/facts.ts`; `web/src/components/loading/DidYouKnow.tsx`.
Refs: QA-07 #2, #4, #5; B-63, B-64, B-73, B-76, B-77 (closed, ADR-386); review-05-10 §6, §9; review-08-10 §7, acceptance 9; readings
5, 25; pinned Patterns; Round start 3(a), 4 (iv); `/ux-copy`; R17-08's lesson.
Done when:
- `RETROGRADE_LINE` and the retrograde fact meet reading 5; their users grepped and named (HouseDeck, HouseCard, TimelineSetup,
  NowAhead, YourWeek, the site's timeline Hero), none edited; the report lists both before and after.
- Without angles, DidYouKnow shows only the facts whose drawing needs no horizon (retrograde, Saturn's return, a stellium by sign) on
  the reader's chart, Mira's only where none is given (marie-curie-unknown, computed at run time); the stellium fact in the artifact's
  words, three sentences, drawn on the reader's stellium from `chartPatterns`.
- The R line takes the theme's colours, so print shows it (B-63); a compact card lets chart and card show together at 390 px (B-64);
  `/web-taste` at 390 px; typecheck and the critical tier green.

### R19-06 — MB-234 (private) (INTERNAL)
Tier: opus — security on the QA pair's staging accounts; the brief lives in Notion only
Objective: MB-234 fixed as its row says, the hardening its row names included; the orchestrator passes the row in the brief.
Files: as its row names, passed in the brief; none is in another group-1 card's list (the orchestrator checks before dispatch).
Refs: MB-234 (private); ADR-314, 315, 357; the promoted log rule; R18-04.
Done when: the fix as its row says, read by the sentinel; the report says "MB-234: fixed as its row says" and nothing more; no
`MB-234` comment in the code; the critical tier green with a model client that fails if called.

### R19-07 — A claim with two "You" charts, and MB-214 (private) (USER-FACING) — provisional MB-235
Tier: opus — sign-in and what a session hands an account: the buyer flow's claim
Objective: signing in to an account that already has its own chart keeps the account's as You and moves the signed-out one in as
a person under its own name, instead of stopping the whole claim (MB-235 item 1's default); MB-214 fixed as its row says.
Files: `api/src/middlewares/auth.ts` (+ `auth.test.ts`); `api/src/lib/profiles.ts`.
Refs: MB-235 item 1; MB-214 (private); review-05-10 §1; R18-02; reading 13; the promoted caller and log rules; R15-18's lesson.
Done when:
- `claimSession`, in one transaction: with an account chart already You, the session's own arrives with `isSelf` false and its own
  name, and the rest moves as today; a second sign-in moves nothing; `// MB-235 provisional` at the seam.
- MB-214 as its row says, read by the sentinel and named in the report by id only; every caller of a changed export grepped.
- `auth.test.ts` (critical) pins the two-You claim and that only the session's unclaimed rows move; the info line carries counts
  only; the buyer walk passes.

### R19-08 — The pair story's rough birth time (USER-FACING) — provisional MB-235
Tier: sonnet — one line in two steps, its words given by the row
Objective: in the Compatibility loading story, a person whose birth time is rough reads "<name>'s birth time is rough, so we skip
the rising sign." instead of "has no birth time" (MB-235 item 2's default).
Files: `web/src/lib/build-story.ts` (`StoryInput`); `web/src/lib/pair-story.ts` (+ `pair-story.test.ts`);
`web/src/components/report/PairStory.tsx`.
Refs: MB-235 item 2; compatibility-loading-story; ADR-34, 347; pinned `StoryInput.birth.rough`; `/ux-copy`; the caller rule.
Done when:
- `storyOf` sets `rough` for a time given with a window over 0 minutes; step 3 prints the row's line and step 4 "<name>'s birth
  time is rough, so we read signs, not houses."; no time at all reads as today; `// MB-235 provisional` at the seam.
- `StoryInput`'s other users (`BuildStory.tsx`, `build-story.test.ts`) grepped and named, unchanged.
- `pair-story.test.ts` (critical) pins both lines on a fixture pair with one rough time; typecheck and the critical tier green.

### R19-23 — The round's contract, first: sharing's states, the gift's questions, the person's date, Ask's offer, passes (INTERNAL)
Tier: opus — the contract every new route and screen reads, written once before them (sharing-and-circle §11)
Objective: every R19 change to `openapi.yaml` lands here as pinned, Did you know's field, a contact's passes, setup's landed count and
the house blocks included, so the API cards fill it and the screens read the generated types.
Files: `packages/api-spec/openapi.yaml`; the generated `packages/api-client-react` and `packages/api-zod` (codegen only).
Refs: sharing-and-circle §1 to §3, §7, §11; review-05-10 §3, §7, §8; review-08-10 §1, §3, §5, §7, §9; explain-like-a-friend §9;
ADR-331, 341, 383, 387 to 390, 392, 394, 396, 398, 403; R-7.2; pinned Contract, Houses and Did you know; the caller rule (a new
argument once moved `GET /home`'s generated hook under four callers).
Done when:
- Every pinned field, body and route in the spec, each description naming its ADR; response fields the API fills in this group
  required, `landed` and the house fields optional (group 3 fills one, older reports lack the others), new request fields optional
  with their defaults; `/admin/*` untouched.
- Codegen twice with no diff; every generated name a file imports grepped and the changed ones named for their cards (R19-21, 24 to
  26, 29, 30, 38, 40); typecheck may stay red only until the group ends, green with R19-24, 25 and 26.

### R19-24 — GET /home: who can read what, the first steps, the person's date, Your week after an own report (USER-FACING)
Tier: opus — the dashboard's one read, and who may see whose report (R-3.6)
Objective: `GET /home` fills R19-23's fields from the grants, links and reports that stand; Your week shows only with Timeline and
a finished own Personal report; `itemAt` reads the mind chapter's practice items.
Files: `api/src/lib/home.ts`; `api/src/routes/home.ts`.
Refs: sharing-and-circle §2, §4, §7, §9, §11; review-05-10 §1, §7; ADR-174, 181, 182, 235, 236, 330, 332, 341; readings 15, 18,
19; pinned Contract and GET /home; R15-18's lesson; the caller and log rules.
Done when:
- Each state as pinned: a reader by first name once they claim, by the address the reader typed while waiting, never by one they
  never gave; `firstSteps` null once a Compatibility report exists; a closed pair reads `only-you`.
- `timelineSlotOf` needs access and a finished own report; `itemAt` reads `mind.practice.*`; `shares.ts`' exports read as they are;
  `LISTED_PAIR_VERSIONS` names p6 itself, so R19-15's p7 keeps every stored p6 pair on the dashboard (found 21).
- Typecheck, the critical tier and the buyer walk green at the group's end; the report shows one `GET /home` before and after on
  the walk's people.

### R19-25 — Sharing around a gift, Cancel invite and Copy their link, and MB-212 (private) (USER-FACING)
Tier: opus — schema, and grants that decide who reads whose report (R-3.6)
Objective: the gift's "Share your report with {name} too?" and the claim's share-back answer each write a grant at its moment; a
waiting link can be cancelled or copied again; MB-212 fixed as its row says.
Files: `packages/db/src/schema/inviteTokens.ts`; new `packages/db/scripts/migrate-add-gift-shares.ts`; `scripts/bootstrap-db.sh`;
`api/src/routes/gifts.ts`, `invites.ts` (+ `invites.test.ts`), `reports.ts`; `api/src/lib/shares.ts` (+ `shares.test.ts`).
Refs: sharing-and-circle §1, §3; ADR-139, 181, 182, 235, 285, 331, 390; MB-212 (private); R-3.6, R-7.3; readings 16, 17; pinned
Contract and GET /home; the caller and log rules (ids and counts only).
Done when:
- New columns on `invite_tokens` (both answers, and what Copy their link needs) by an idempotent script in the bootstrap, run twice
  clean on an empty database and on main's; grants as reading 16; `DELETE /invites/{id}` and `POST /invites/{id}/link` as pinned.
- `invites.test.ts` and `shares.test.ts` (critical) pin both Yes grants, that Not now writes none and that a cancelled link no
  longer claims; MB-212 named by id only, read by the sentinel; the buyer walk passes.

### R19-26 — The Share window (USER-FACING)
Tier: sonnet — one new window from the reference dialog, its shape, states and words pinned here and in the artifact
Objective: one window shares any report: a dialog at 1440 px, a bottom sheet at 390 px; email chips; Share; "Who can read it" with
Owner, Can read it and Invited and a ⋯ menu; a footer count and Done.
Files: new `web/src/components/share/ShareWindow.tsx`; new `web/src/lib/share-window.ts`;
`web/src/components/dashboard/StopSharingDialog.tsx`.
Refs: sharing-and-circle §1, acceptance 1 to 3; ADR-181, 182, 235, 238, 329, 333, 390; MB-82; B-32, B-52; Round start 4 (ii);
readings 15, 17; pinned Sharing web and Contract; `/ux-copy`, `/web-taste`; R14-12's lesson.
Done when:
- Pasting "a@x.com, b@y.com" makes two chips; a bad address is marked in place, never sent; your own report takes any address,
  someone's only its subject, a pair only its other person; no roles and no "Anyone with the link".
- After Share the person is at the top as Invited; Cancel invite and Remove access (the Stop sharing dialog, which now names Ask's
  hidden answers, B-32) take them off without a reload; a refusal shows the API's own line (B-52).
- Escape closes and focus stays inside; at 390, 768 and 1440 px on real browser shots; typecheck and the critical tier green.

### R19-27 — Timeline's data: the week, its sentence, headlines, each reading's inputs and passes (USER-FACING) — provisional MB-215
Tier: opus — the brain: the engine's words and what every Timeline reading is written from
Objective: the week runs Monday to Sunday; its sentence counts transits; no "things"; Light headlines agree with their tone; each
reading gets its stretches, the reader's age and whether a cycle is behind; a contact's passes reach the contract (ADR-392).
Files: `packages/engine/src/plainWords.ts`; `api/src/lib/timeline.ts`, `timelineReadings.ts` (+ `timelineReadings.test.ts`),
`sampleRun.ts`; `api/src/prompts/timeline/reading.ts` (`ReadingInput` only); `web/src/site/data/timeline/mira-week.json`.
Refs: review-05-10 §2 to §4, acceptance 5, 11; report-loading-story §4, acceptance 9; review-08-10 §1; ADR-206, 207, 211, 322, 362,
392; MB-215; readings 23, 27; pinned Timeline; R16-23 and R16-24's lessons; the caller rule.
Done when:
- `weekSentence` and `weekView` as pinned; on audrey-hepburn's week of 5 to 11 Oct 2026, computed at run time, the sentence agrees
  with the rows (the Owner's week is read on staging); Mira's week written again by `sampleRun.ts`; `TimelineEvent.passes` and
  `backwards` filled from R19-04's contact.
- The Light headlines that name only a strain and the two "things" ones rewritten by hand, `// MB-215 provisional` at the table, each
  before and after; `ReadingInput` as pinned; a passed cycle written again once, inside t2's one rewrite.
- The Timeline dry render shows the new inputs; typecheck and the critical tier green.

### R19-43 — The engine: stelliums, pairs, empty houses, angular planets and half the sky (INTERNAL)
Tier: opus — the brain: one rule the brief, House by House, the house cards and Did you know all read (ADR-397)
Objective: the engine computes the chart's patterns once, so the web and the brief share them: a stellium (3 or more of the ten
planets, Chiron and the North Node in one sign, at least two of them planets), a pair (exactly two), empty houses, angular planets and
half the sky (ADR-397, 398).
Files: new `packages/engine/src/patterns.ts` (R19-04 exports it from `index.ts`).
Refs: review-08-10 §7, acceptance 7; ADR-397, 398, 404; reading 25; pinned Patterns; the caller rule (`brief.ts`' own stellium and
empty-house code, `hemisphereEmphasis`).
Done when:
- `chartPatterns` as pinned: a blind chart by sign only, with no house, empty house, angular planet or half the sky; whole sign makes
  a stellium's sign its house; half the sky by degree from the angles (reading 25).
- Every fixture's patterns, computed at run time, printed in the report beside `brief.ts`' current STELLIUMS and EMPTY HOUSES lines,
  each difference named; `hemisphereEmphasis` (east counted as houses 1 to 6) left as it is and named (B-84).
- Typecheck and the critical tier (the engine's included) green.

### R19-44 — Observations: the first ideas with two sources, their table, the inbox and /observe (USER-FACING)
Tier: opus — the brain: ideas readers see on their house cards, each in our words with two independent sources
Objective: the observations brain's first run (ADR-403): the 33 slides' claims in our words, each with its placement key; those with
two independent sources (Round start 8), checked against the doctrine, enter a typed table the brief and House by House read; the rest
wait in the inbox annex; `/observe` runs it again from the Notion "Observations inbox".
Files: new `api/src/prompts/observations.ts`; new `docs/annex/observations-inbox.md`; new `.claude/skills/observe/SKILL.md`.
Refs: review-08-10 §9, acceptance 10, out of scope; ADR-381, 400, 403, 404; MASTERFILE R-5.2, R-5.3; Round start 4 (v), 8, 9; reading
28; pinned Observations; R13-05's lesson.
Done when:
- `OBSERVATIONS` and `observationsFor` as pinned, with at least the 8th-house idea; each idea plain, with no prediction and no hype;
  each source by account or author and where, one account counted once; no run of five words from any source.
- Every one-source idea in the annex with its key and source; the skill as reading 28 says; if the harness refuses it (R13-05), the
  report carries its text and the orchestrator applies it at the close.
- `observationsFor` on the fixture with the busiest 8th, computed at run time, prints its match in the report; typecheck and the
  critical tier green.

---

## Group 2 — the rule and every product's prompts, the primer, the lab, /qa's account, and the screens on the new contract

### R19-09 — The style contract: name it, say it plain, show it in a day, give its reason (USER-FACING)
Tier: opus — the brain: the shared system prompt of all four products
Objective: rules 1, 3, 8 and 11 and the doctrine as readings 1 and 3 to 7 say: a name with its plain meaning and a moment, inside a
sentence; life first; possibilities; comfort explained; no dignity or sect word; the card's "some astrologers"; the empty-house and
Chiron lines (ADR-369 to 373, 375, 379); a body outside a house named only with its reason in the same sentence (ADR-399); each claim
with its placement, reason, one scene and when it shows, no hype (ADR-400).
Files: `api/src/prompts/system.ts`.
Refs: explain-like-a-friend §0b, §1 to §3, §8, §9, §11, acceptance 1 to 4; review-08-10 §8, §9; MASTERFILE R-5.1 to R-5.3; ADR-104,
297 to 312, 369 to 381, 399, 400; readings 1, 3 to 7; the caller rule.
Done when:
- Sentence limits and evidence in claims unchanged; `SHARED_SYSTEM` byte-identical across sections; "Never explain the method" gone,
  talk about astrology with no reader in it still out; every importer of `STYLE_CONTRACT`, `SIMPLE_WORDS` and `DOCTRINE` named (the
  pair, Timeline and Ask systems, `generate-vocabulary.ts`).
- The dry lab renders every product's system prompt; the report shows rules 1, 3, 8, 11, the claims line and the empty-house line
  before and after; typecheck and the critical tier green.

### R19-10 — The plain-words checks, and the pair's name checks relaxed (INTERNAL)
Tier: opus — the brain's checks: what logs and what blocks, in four products
Objective: chk-49 to 52 warn (ADR-385); the RULES map moves chk-21a and chk-24 to warn; the annex rows say why.
Files: `api/src/prompts/checks.ts`; `docs/annex/pair-reliability-checks.md`.
Refs: explain-like-a-friend §2, §3, §6, §9, §10, acceptance 2, 3; review-08-10 §8 (no new check); ADR-81, 381, 385, 399; R-4.3;
readings 7, 10; pinned `explainChecks`, `DIGNITY_WORDS`; R15-04 and R16-21's lessons.
Done when:
- `explainChecks` as pinned: chk-49 on whole words (`fall` only as "in fall" or "its fall", `angular` only before "house" or "planet",
  never inside "section" or "insect"); chk-50 on runs of six words from `SCENES` or `PASSAGES`; chk-51 on a card with none of reading
  7's tradition phrases; anywhere in a sentence, on parsed strings; a message names a rule, a word or a scene id.
- RULES: chk-21a, chk-24 and chk-49 to 52 warn; annex rows 20, 21 and 24 reworded, rows 49 to 52 added, row 14 widened to the house
  blocks R19-12 drops.
- Run once over R19-02's scenes and R19-03's passages: nothing fires, or each hit goes back to its card as a fix; typecheck and the
  critical tier green.

### R19-11 — The brief: comfort, empty houses, going backwards, Chiron, scenes, the chart's patterns, observations (USER-FACING)
Tier: opus — the brain: the per-chart facts every section reads
Objective: each placement carries its plain comfort words; each empty house reads through its planet in charge; each planet going
backwards at birth carries how common it is; Chiron its house; each section its own few scenes; B-67's tie in a fixed order; the
engine's patterns (a stellium with its balance, pairs, angular planets, half the sky); the reader's observations, each with its why.
Files: `api/src/prompts/brief.ts`.
Refs: explain-like-a-friend §0b, §10, §11, acceptance 3, 4; review-05-10 §10 (the shares); review-08-10 §7, §9, acceptance 10;
ADR-373, 379, 381, 397, 398, 403; B-67; readings 2 to 6, 25, 28; pinned Brief, Patterns, Observations; the caller rule.
Done when:
- In audrey-hepburn's brief, computed at run time: the empty 8th through Mercury at home in Gemini in her 5th, the empty 9th through
  Venus least at ease in Aries in her 3rd; Venus, Saturn and Neptune going backwards with their shares; Chiron in her 4th.
- A blind brief names no house; `chartPatterns` replaces the brief's own stellium and empty-house code; a stellium fixture and the
  busiest 8th, found at run time, print their new lines; `scenes` as pinned; `ChartBrief`'s readers named; a critical test the lines
  move named for R19-14 or 15, never edited; the dry lab renders every prompt; typecheck and the critical tier green at the group's
  end.

### R19-12 — House by House: rulers with their reason, Chiron, quiet houses, the retrograde and stellium blocks (USER-FACING)
Tier: opus — the brain: the twelve house readings and the blocks under them
Objective: each reading on the new rule, in what the reader does; a body outside the house named only with its reason in the same
sentence (ADR-399); Chiron one sentence in its house; an empty house through its planet in charge; pairs read together; angular
planets the strongest, with why; blocks for going backwards and a stellium; `noticed` from the table; no HOUSES ALREADY COVERED.
Files: `api/src/prompts/sections/houses.ts`; `api/src/lib/testModel.ts` (the houses reply only).
Refs: explain-like-a-friend §0b, §1, §11, acceptance 3, 4; review-05-10 §7, §10; review-08-10 §5 to §9, acceptance 5 to 8, 10;
ADR-373, 379, 385, 396 to 403; readings 1, 4 to 6, 25, 26, 28; pinned Houses, Patterns, Observations; the caller rule.
Done when:
- Schema and validate as pinned: `retrograde` only for a body going backwards there (never a node), `stellium` only where one is,
  others dropped as chk-14 fixes; `noticed` from `observationsFor`, one a house, kept when stored (`HousesSchema`'s readers named);
  chk-15 unchanged; chk-52 here, as pinned; the band's move named.
- The canned houses reply in `testModel.ts` carries the new fields, so the buyer walk passes; a critical test the schema moves is
  named for R19-14; the dry lab renders House by House for audrey-hepburn and the busiest-8th fixture, before and after in the report;
  typecheck and the critical tier green.

### R19-13 — The chapters under the new rule, and an Overview that opens on a stellium (USER-FACING)
Tier: opus — the brain: nine chapter prompts, the foundation and the triad
Objective: every chapter's instructions trade "No planet, sign, or house names in the prose" for the new rule: life first, at most one
named placement a paragraph with its plain meaning and a moment, possibilities, actions to end; a planet going backwards shapes its
home chapter (review-05-10 §10); no fixed opener; the Overview opens on a stellium when there is one (a blind chart's by its sign) and
gives half the sky one line, in place of "Ground the whole thing in … any stellium".
Files: in `api/src/prompts/sections/`: `overview.ts`, `mind.ts`, `career.ts`, `money.ts`, `relationships.ts`, `family.ts`,
`superpowers.ts`, `discoveries.ts`, `focus.ts`, `foundation.ts`, `triad.ts`.
Refs: explain-like-a-friend §0b, §1 to §3, §8, acceptance 1; review-05-10 §10; review-08-10 §7, acceptance 7; MASTERFILE R-5.1, R-5.2;
ADR-369 to 371, 375, 398; readings 1, 3, 25.
Done when:
- No instruction forbids naming a placement or tells the writer to hide the method; sect and dignity stay reasoning, never words
  (reading 3); word targets and schemas unchanged.
- The dry lab renders every natal prompt; the report shows audrey-hepburn's Family & Roots and Mind prompts and a stellium fixture's
  Overview, found at run time, before and after; typecheck and the critical tier green.

### R19-14 — The pipeline: passages, scenes, the checks wired, v12 (USER-FACING)
Tier: opus — the brain: how every natal and pair call is put together and judged
Objective: each chapter's user prompt carries two model passages and its own scenes; `explainChecks` runs on every natal and pair
call; the self-check asks the new questions; a card and a house's Often noticed never count as prose; `PROMPT_VERSION` v12.
Files: `api/src/lib/aiInterpretation.ts` (+ `aiInterpretation.test.ts`); `api/src/prompts/evidence.ts`.
Refs: explain-like-a-friend §4, §10, acceptance 6; review-08-10 §9; ADR-81, 383, 385, 403; R-4.3, R-7.3; readings 1, 7, 11, 12, 26;
pinned `examplesFor`, `renderExamples`, `ChartBrief.scenes`, `explainChecks`, Houses; the caller rule.
Done when:
- `assembleUser` adds passages and scenes after the brief for the ten chapters' sections, never the foundation or the triad;
  `countWords` and `proseOf` skip `didYouKnow` and the houses' `noticed` as they skip `claims`; `SELF_CHECK` per reading 1;
  `explainChecks` beside `registerChecks` and `plainChecks`.
- v12 with its pin in `aiInterpretation.test.ts`; every reader of `PROMPT_VERSION`, `countWords` and `proseOf` grepped and named
  (`labRules.ts`, `prompt-families.ts`, the web's list for R19-21).
- The dry lab renders every natal prompt with its passages, schemas ok, injection clean; the report gives the user prompts' size
  before and after; the critical tier and the buyer walk green.

### R19-15 — Compatibility under the same rule, p7 (USER-FACING)
Tier: opus — the brain: the pair report's prompts and its blocking checks
Objective: the pair's prompts follow the new rule; chk-21a, chk-21b's body branch and chk-24 warn; links' "Rule 8 lifted here
alone" goes; a lens reading a planet going backwards says so once (review-05-10 §10); `PAIR_PROMPT_VERSION` p7.
Files: `api/src/prompts/pair/` (`index.ts`, `foundation.ts`, `shapes.ts`, `evidence.ts`, `sections/**`); `api/src/lib/pairBrief.ts`
(+ `pairBrief.test.ts`); `api/src/lib/pairInterpretation.test.ts`.
Refs: explain-like-a-friend §6; review-05-10 §10; ADR-81, 369, 385; readings 1, 5, 10, 11; the caller rule.
Done when:
- Pair instructions and `PAIR_DOCTRINE` per reading 1; `shapes.ts` warns where R19-10's RULES say; chk-20 and chk-22 unchanged;
  `pairBrief` marks each person's planets going backwards.
- p7 pinned in `pairInterpretation.test.ts` (critical); the stored "p6" rows in `ask.edges.test.ts` and `home.test.ts` grepped and
  named (kept unless a reader compares versions); `LISTED_PAIR_VERSIONS` keeps p6 (R19-24).
- The dry lab with curie-winfrey and a parent_child lens renders every pair section, schemas ok; the report shows the partners
  links prompt before and after; `pairBrief.test.ts` (critical) green.

### R19-16 — Timeline: read by the houses a planet moves through and by its passes, in possibilities, t2 (USER-FACING)
Tier: opus — the brain: every Timeline reading, each written again once at t2
Objective: a reading names the houses its moving planet passes through beside the natal point's (ADR-384), and each exact pass with
its direction and the backwards stretch, saying what the backwards pass changes with "may" (ADR-392); possibilities, ending on "a good
time to…"; Review 05/10's Light and Heavy lines; no "things"; each stretch with its years; a past cycle in 40 to 70 words; before 16
the house in a child's words; a nodes' opposition plainly not a return; dignity words warn; `TIMELINE_PROMPT_VERSION` t2.
Files: `api/src/prompts/timeline/` (`doctrine.ts`, `reading.ts`, `checks.ts`, `index.ts`).
Refs: explain-like-a-friend §6, §8; review-05-10 §2, §4, acceptance 4, 11; review-08-10 §1, acceptance 1; ADR-206, 208, 375, 378, 384,
392; readings 1, 8, 9, 11, 23, 27; pinned Engine, `ReadingInput`, `explainChecks`; R16-23 and R16-24's lessons.
Done when:
- `eventFacts` adds the crossed houses (none blind), each stretch with its years, and the passes as review-08-10 §1 writes them; the
  doctrine's three passes; annex row 46's pass unchanged; `checkReading` runs `explainChecks`; `ReadingSchema` unchanged, so a t1
  reading shows while its rewrite waits; t2's readers grepped and named.
- The Timeline dry render shows audrey-hepburn's contact prompts with their houses, stretches and passes (one with three), a past
  cycle, one before 16 and a nodes' opposition, before and after in the report; typecheck and the critical tier green.

### R19-17 — Ask under the same rule, with an everyday example and the pair report first (USER-FACING)
Tier: opus — the brain: Ask's plan and its answers
Objective: `ASK_RULES` agree with the new contract (its own lift of rules 3 and 8 goes where the contract now says it); each idea
Ask offers carries one everyday example framed as an option; asked about a named partner with a pair, the plan quotes that pair
report's matching section first (review-05-10 §8); it may explain a planet going backwards; no orders; the 150-word cap stays;
dignity words warn; `ASK_PROMPT_VERSION` a2. The fixed lines in `ask/lines.ts` stay as built (MB-215).
Files: `api/src/prompts/ask/index.ts`, `answer.ts`, `plan.ts`.
Refs: explain-like-a-friend §6, §8; review-05-10 §8, §10, acceptance 12; ADR-369, 375, 385; readings 1, 5, 11; the caller rule.
Done when: `ASK_RULES` per reading 1 with the example line; the plan's pair-first line; `checkAskAnswer` runs `explainChecks`; a2,
every reader of `ASK_PROMPT_VERSION` grepped and named; the Ask dry render covers every reader and a question about a partner with
a pair, injection clean, one prompt before and after in the report; `ask.edges.test.ts` (critical) green.

### R19-18 — Four things to know, before House by House (USER-FACING)
Tier: sonnet — one component, its words and table from the artifact
Objective: a short primer heads House by House before the first card: houses start at the rising sign; each house is one part of life;
every house has a planet in charge, even an empty one, which is why a card may name a planet that isn't in it (ADR-399); each planet's
home and least-at-ease signs in the seven-planet table.
Files: new `web/src/components/report/HousePrimer.tsx`; `web/src/components/report/HouseDeck.tsx`.
Refs: explain-like-a-friend §0c; review-08-10 §8; ADR-380, 399; Round start 4 (the primer); pinned `COMFORT`; `/ux-copy`,
`/web-taste`; R18-09's lesson.
Done when:
- The four ideas and the table in the artifact's words; idea 1 names the reader's own rising sign; the table reads `COMFORT`, never a
  copy; on the report and /sample (both draw `HouseDeck`); nothing where House by House doesn't show.
- No sideways scroll at 390 px; `/web-taste` at 390, 768 and 1440 px on a real browser shot; checked on audrey-hepburn's chart
  computed at run time; typecheck and the critical tier green.

### R19-19 — The lab: plain-words measures, and METHOD_TALK pruned (INTERNAL)
Tier: sonnet — two lab files and the CLI's print, each measure pinned here
Objective: the Release stops refusing the words the new rule asks for; the lab measures what the acceptance reads, as warnings; the
Timeline dry render holds a retrograde, an eclipse, a nodes' opposition, a cycle before 16, a Light reading and a contact with three
passes (B-03's dry-lab part; review-05-10 acceptance 11; review-08-10 §1).
Files: `api/src/lib/labRules.ts`; `api/src/lib/labDry.ts`; `scripts/src/report-lab.ts`.
Refs: explain-like-a-friend §7, acceptance 1, 2, 5; review-05-10 acceptance 11; review-08-10 §1; ADR-385, 392; B-03; pinned
`DIGNITY_WORDS`; R14-01's lesson; the caller rule.
Done when:
- `METHOD_TALK` drops "in its own sign" and "in your chart, " only; `SectionMeasure` gains warnings, never faults: the most named
  placements in a paragraph, dignity words, the longest sentence, a Flesch–Kincaid grade (vowel-group syllables, written here),
  openers repeated in more than two paragraphs of a report; every reader of `faultsOf` and `measureSection` grepped and named.
- `pnpm report:lab --compare --base r06` prints them for the stored runs (the before numbers, in the report); the dry render holds
  each of the six per fixture whose window has one, read by eye; typecheck and the critical tier green.

### R19-28 — /qa's own staging account, with a daily cap (INTERNAL) — B-74
Tier: opus — security: a third staging account whose address stays out of the public repo, and a spend guard on the write chain
Objective: /qa signs in by hand on staging through the normal sign-in page as its own account, never banned (ADR-387, reading 22).
Files: new `api/src/lib/qaAccount.ts`; `packages/db/src/schema/payments.ts` (`QA_ACCOUNTS`); `api/src/lib/testers.ts`,
`timelineSetup.ts`, `qaWalk/index.ts`, `limits.test.ts`; `api/src/routes/index.ts` (`writing`); `api/src/index.ts`;
`web/src/pages/AdminSalesPage.tsx`, `web/src/lib/adminPaymentsApi.ts`; `.claude/skills/qa/SKILL.md`, `.claude/agents/qa.md`.
Refs: B-74; QA-07 #1; ADR-276, 314, 315, 387; MB-233 (the pair stays banned); reading 22; pinned QA account; Round start 3(c); the
log and caller rules; R13-05, R13-10 and R16-29's lessons.
Done when:
- Reading 22 met: production and the walk never make it, two starts at once make one; `limits.test.ts` (critical) pins a 7th start
  in a UTC day refused for that account alone, other accounts untouched; every reader of `QA_ACCOUNTS` and `QaAccount` named.
- The Sales page's "QA account" row shows the address with Copy, on staging alone; no file, log line or report holds the address.
- /qa's two files as reading 22, `qa.md` at most 50 lines; if the harness refuses those edits (R13-05), the report carries both
  texts and the orchestrator applies them at the close. Read by the sentinel; typecheck, the critical tier and the buyer walk green.

### R19-29 — Your first steps, Make a report, and the picker as a pop-up (USER-FACING)
Tier: opus — the dashboard's main loop for every buyer: both roads to step 4, seven files and two deletions
Objective: "Your first steps" in the idle panel (0 of 4, one button at a time, Hide) replaces the path sheet; Make a report's two
buttons; Compatibility only with two readable reports; the picker as a pop-up into the loading screen; no Stories section.
Files: `web/src/pages/DashboardPage.tsx`; `web/src/components/dashboard/AddSomeoneSheet.tsx`, new `FirstSteps.tsx`;
`web/src/components/CompatibilityPicker.tsx`; `web/src/lib/home-view.ts`, `nudges.ts`, `credits-view.ts` (+ `credits-view.test.ts`);
deletes `web/src/components/dashboard/PathSheet.tsx` and `Stories.tsx`.
Refs: sharing-and-circle §2, §4, §6, §8, acceptance 4, 7, 9; ADR-125, 330, 332, 334, 336, 338, 390; B-07; readings 15, 18, 19; pinned
Sharing web and Contract; Round start 4 (ii) screens A and E; `/ux-copy`, `/web-taste`; R14-12's lesson; the caller rule.
Done when:
- A new buyer's card at 0 of 4 from `firstSteps`; step 2 opens Add someone unchanged; each step ticks without a reload; both roads
  reach step 4's either/or; Add someone else goes back to step 2; the card goes after the first pair.
- `?pair=<profileId>` and "+ New Compatibility report" open the picker pop-up; Make it opens the loading screen; `canPair` gates every
  Compatibility entry; the path's exports and test lines leave `credits-view` with its sheet; at 390, 768 and 1440 px on real
  shots; typecheck, the critical tier and the buyer walk green.

### R19-30 — The quick look's buttons, one chip a Compatibility row, Share from the rows (USER-FACING)
Tier: sonnet — buttons and chips on views that keep all they show; each state and word pinned here and in the artifact
Objective: the quick look keeps its header, date, triad, With you and pair block; its buttons become Make You & {name} · 1 credit
(or Open Compatibility report) and Open {name}'s report, one width and height, then a line on what they can read with a text Share;
each Compatibility row one state chip, ⋯ for Share and Delete report; a person's row "Report from <date>"; no Share story.
Files: `web/src/components/dashboard/QuickLook.tsx`, `PeopleRows.tsx`, `CompatibilityRows.tsx`, `RowMenu.tsx`;
`web/src/lib/pair-row.ts`; deletes `web/src/components/dashboard/ShareMySheet.tsx`.
Refs: sharing-and-circle §1, §5, §7, §8, acceptance 2, 5, 8, 10; review-05-10 §7 (the person's date); ADR-174, 333, 335, 337, 338;
B-07; readings 15, 19; pinned Sharing web and Contract; Round start 4 (ii) screens B and D; `/ux-copy`, `/web-taste`.
Done when:
- The quick look's header, date, triad and pair block render as before (a shot beside main's); Make You & {name} calls `onMakePair`;
  every Share opens `ShareWindow` with its target; no "Share story" and no right-side drawer on the dashboard.
- One chip per Compatibility row from `HomePair.share`; "Joined" in a neutral tone (B-07); at 390 and 1440 px on real shots;
  typecheck and the critical tier green.

### R19-31 — A share question on each side of a gift, and the claim's plain lines (USER-FACING) — B-50, B-51
Tier: opus — the buyer walk's gift and claim, and what each answer lets someone read (R-3.6)
Objective: after the note, `GiftFlow` asks "Share your report with {name} too?" (Yes or Not now, nothing picked); the claim page asks
"Share your report with {giver} when it's ready?", or "Share yours back?" when the giver shared; a gift already claimed says so
before sign-in (B-50); a wrong account names who is signed in and offers Sign out, with no Try again that repeats the 403 (B-51).
Files: `web/src/components/dashboard/GiftFlow.tsx`; `web/src/pages/ClaimPage.tsx`.
Refs: sharing-and-circle §3, acceptance 6; ADR-139, 235, 331; QA-06 #5, #6; B-50, B-51; reading 16; pinned Contract (`shareOwn`,
`giverShares`, `shareBack`); Round start 4 (ii) the gift flow; `/ux-copy`; R14-12 and R15-18, 19's lessons.
Done when:
- Each answer sent as pinned; Not now sends false and the quick look keeps the offer; neither question pre-picks an answer.
- Signed out on a claimed gift the page reads "Already claimed" with no sign-in; the wrong account is named by the address it signed
  in with, never one it didn't give.
- At 390 px on real shots; typecheck, the critical tier and the buyer walk green.

### R19-32 — The Timeline card: its year, Heavy · Mixed · Light, and "<Planet> going back" (USER-FACING)
Tier: sonnet — a card's face laid out from the artifacts, every word and date rule pinned in readings 23 and 27
Objective: a card shows tone word, headline, the reading's line, the date with its year and Read more; a contact whose planet is going
backwards today shows "<Planet> going back" (ADR-392); a retrograde card reads "Mercury retrograde · about 3 weeks" from the engine's
dates; the legend wherever the tone colours show; a tapped card hands the sheet its event.
Files: `web/src/components/timeline/ContactCard.tsx`, `NowAhead.tsx`, new `ToneLegend.tsx`; `web/src/lib/now-ahead.ts`,
`timeline-view.ts`.
Refs: review-05-10 §2, §10, acceptance 4; review-08-10 §1, acceptance 1; ADR-207, 211, 386, 392; MB-188 (`tone.ts` stays); readings
23, 27; pinned Timeline; Round start 4 (iii) Part 2, (iv) note 1; `/ux-copy`, `/web-taste`; R16-01's lesson.
Done when:
- `nearDate` prints the year everywhere; `TONE_WORDS`, `ToneLegend` and `goingBack` as pinned; the planet line leaves the face; dates
  in the reader's zone; `ReadingTarget.event` set; the readers of `nearDate` and `TONE_WORDS` grepped and named.
- On audrey-hepburn's chart computed at run time no card prints a date without its year, and the chip shows only inside a backwards
  stretch (the Owner's Pluto card is read on staging); at 390 and 1440 px on real shots; typecheck and the critical tier green.

### R19-33 — Your week as one picture (USER-FACING)
Tier: sonnet — one new drawing from the artifact's Part 3, its rows, order and words pinned here and in reading 23
Objective: the dashboard's Your week and Timeline's Week view open on one picture: seven days, Monday to Sunday, today lit as a
column; one row per transit in effect (tone dot, headline, "all week", "starts Thu" or "ends Tue", a bar in its tone colour, a flat
end past the week, a tick where it starts or ends), changes first, then Heavy, Mixed, Light; the sentence above; a tapped row opens
its line, facts and "Read more in Timeline"; on a desktop the dial beside it, on a phone under it.
Files: `web/src/components/dashboard/YourWeek.tsx`, new `web/src/components/timeline/WeekBars.tsx`; `web/src/lib/week-view.ts`;
`web/src/pages/TimelineAppPage.tsx`; `web/src/site/data/timeline/mira.ts`.
Refs: review-05-10 §3, acceptance 5; report-loading-story §4; ADR-207, 322; reading 23; pinned Timeline (`weekView`, `weekSentence`,
`ToneLegend`, the sheet's `event`); Round start 4 (iii) Part 3; `/ux-copy`, `/web-taste`; R18-09's lesson.
Done when:
- On audrey-hepburn's week of 5 to 11 Oct 2026 computed at run time, the rows and their ends agree with R19-27's sentence; the day
  cells and tone dots leave the week (`DayCells` stays for Ask's day card and FiveThings); retrogrades count as transits; the page
  hands `ReadingSheet` the opened card's `event` (R19-45).
- No sideways scroll at 390 px; `/web-taste` at 390, 768 and 1440 px on real browser shots; typecheck and the critical tier green.

### R19-34 — Pins on every tick-box item, named by chapter (USER-FACING)
Tier: sonnet — one control in six places, its look and words pinned by Review 05/10 §7
Objective: Practice, What to do, How to use it, How to manage it, Practice this week, a pair's Next time and Try together all pin,
three a report; an outline grey pin, a filled pin in the chart's yellow when pinned; hover and the first pin say "Pinned items show
on your dashboard."; Practising names each pin's chapter, never "your Closing".
Files: `web/src/components/report/Checklist.tsx`, `DawnClosing.tsx`, `PairSections.tsx`, `ProseRail.tsx`;
`web/src/components/ReportSections.tsx`; `web/src/components/dashboard/Practising.tsx`.
Refs: review-05-10 §7, acceptance 10 (ADR-297 to 312); `PIN_LIMIT`; R19-24's `itemAt`; pinned Contract; Round start 4 (iii) Part 7;
`/ux-copy`, `/web-taste`.
Done when:
- Every listed item pins and unpins, a fourth refused with the existing line; each pin shows on the dashboard under its chapter's
  name; the API's item keys already take every one (`isItemKey`), so no route changes.
- At 390 and 1440 px on real browser shots; typecheck and the critical tier green.

### R19-45 — Read more: the facts with their years, the passes, and what going back changes (USER-FACING)
Tier: sonnet — one sheet's facts, a strip and two blocks, every word and date rule pinned here and in the artifact
Objective: Read more opens the reading, then the facts: planet, aspect, house, each close stretch and exact date with its year; a
contact with more than one pass shows a strip of them (forward in brass, backwards in rose, the backwards stretch shaded, today
marked) and two short blocks, "Why three dates" and "What the backwards pass changes", in fixed words from its dates.
Files: `web/src/components/timeline/ReadingSheet.tsx`, new `PassStrip.tsx`; new `web/src/lib/passes-view.ts`.
Refs: review-05-10 §2; review-08-10 §1, acceptance 1; ADR-207, 392, 404; readings 23, 27; pinned Timeline (the sheet's `event`,
`PassStrip`, `passBlocks`); Round start 4 (iv) note 1; `/ux-copy`, `/web-taste`; R16-01's lesson.
Done when:
- The sheet reads `event` (R19-32 sets it, R19-33 passes it); a cycle's sheet keeps its own; `passBlocks` null under two passes; every
  date in the reader's zone with its year; the blocks name their planet and dates, never one guessed.
- On audrey-hepburn's Timeline computed at run time, a contact with three passes shows them and its stretch, its dates in the report
  (the Owner's Pluto card is read on staging); at 390 and 1440 px on real shots; typecheck and the critical tier green.

---

## Group 3 — Did you know, the first visit, Life, Ask's offer, the walk, the film, the loading bar, the hero and the house card

### R19-20 — Did you know in the chapters: the writer's field (USER-FACING)
Tier: opus — the brain: a new field on seven chapters, read by every report after
Objective: seven chapters may carry one Did you know card on the topic ADR-383 names, written by the writer as tradition, outside
the prose; the contract already holds `DidYouKnow` (R19-23).
Files: in `api/src/prompts/sections/`: `overview.ts`, `mind.ts`, `career.ts`, `family.ts`, `superpowers.ts`, `discoveries.ts`,
`focus.ts`; new `api/src/prompts/didYouKnow.ts`; `api/src/lib/testModel.ts`.
Refs: explain-like-a-friend §9; review-05-10 §9; ADR-317, 377, 383; reading 7; pinned `didYouKnow`, `topicFor`; Round start 3(b);
the caller rule.
Done when:
- The seven schemas gain `didYouKnow` as pinned; `extraContext` gives the topic from `topicFor` or asks for null; Overview's and
  Discoveries' conditions per ADR-383.
- The canned replies carry one card and the rest null; the buyer walk passes.
- The dry lab renders the seven prompts on audrey-hepburn and marie-curie-unknown (no rising-sign card there); the report shows
  Family & Roots' before and after; the critical tier green.

### R19-21 — The Did you know card, v12 and p7 read, and the report page's Share (USER-FACING) — B-33
Tier: sonnet — one small card and its place, the look reused from R18's; the page's Share moved to the pinned window
Objective: a chapter's `didYouKnow` shows as a small card after its prose and before its actions; the web renders v12 and p7 reports,
its `HouseReading` with R19-12's three fields for R19-48; the report page's Share opens the Share window; `PairLink.of` takes the
generated type (B-33).
Files: new `web/src/components/FactCard.tsx`; `web/src/components/ReportSections.tsx`; `web/src/pages/ReportPage.tsx`;
`web/src/types/chart.ts` (+ `chart.test.ts`).
Refs: explain-like-a-friend §9; review-05-10 §9 (the look); review-08-10 §5, §7, §9; sharing-and-circle §1; ADR-317, 329, 377, 383,
396, 398, 403; B-33; pinned `FactCard`, `didYouKnow`, Houses, Sharing web; `/ux-copy`, `/web-taste`; R18-09's lesson; the caller rule.
Done when:
- "DID YOU KNOW" in small brass capitals, the title, the body; no bars, no drawing; nothing when the field is null or missing;
  `HouseReading` as pinned (Houses).
- `RENDERABLE_PROMPT_VERSIONS` gains "v12" and the pair list "p7", pinned in `chart.test.ts` (critical); `ReportPage` imports nothing
  from `SendDialog` (its send line moves into the page as it reads today, its button opening the window).
- At 390, 768 and 1440 px on a real browser shot with a canned v12 interpretation; typecheck and the critical tier green.

### R19-22 — Mercury's shadow, a Did you know in Timeline (USER-FACING)
Tier: sonnet — fixed words filled from the engine's dates, one card reused
Objective: a Mercury retrograde's reading sheet shows one card: the shadow's dates, the house Mercury goes back over, our own picture,
worded as tradition (ADR-383).
Files: new `web/src/lib/shadow-fact.ts`; `web/src/components/timeline/ReadingSheet.tsx`.
Refs: explain-like-a-friend §9; ADR-378, 383, 384; review-05-10 §2 (a date with its year); pinned `shadowOf`, `shadowFact`, the
sheet's `event`, `FactCard`; `/ux-copy`; R16-01's lessons.
Done when:
- `shadowFact` as pinned, called with the sheet's `event` (R19-45's prop, R19-33's pass): null unless a Mercury retrograde; dates from
  `shadowOf` in the reader's zone, each with its year; the first house it goes back over by its word from `houses.ts`, none on a blind
  chart; passing the same petrol station three times, never her picture.
- Checked on audrey-hepburn's chart and the next Mercury retrograde, computed at run time, its dates in the report; `/web-taste` at
  390 px; typecheck and the critical tier green.

### R19-35 — The first visit, the new-visitor view and the Account preview (USER-FACING) — B-57
Tier: opus — the buyer's first screen, and two admin views that must show nothing of the admin's (ADR-197)
Objective: with no finished own report the dashboard is the circle with You, "Start with your own report", one line and the three
bundles as buttons (staging: /checkout in the sandbox, back to the birth form for You); Ask needs Timeline and a finished own report;
`/dashboard?visitor=new` for the admin; the admin's Account page a marked preview; Account names where to delete your data (B-57).
Files: `web/src/pages/DashboardPage.tsx`, `AccountPage.tsx`; `web/src/components/BundleList.tsx`, `AccountMenu.tsx`,
`ask/AskLauncher.tsx`; new `web/src/lib/first-visit.ts`; `web/src/lib/checkout-view.ts` (+ test) only if the return needs it.
Refs: review-05-10 §1, acceptance 1, 2; ADR-167, 197, 264, 389; QA-06 #15; B-57; readings 20, 21; Round start 4 (iii) Part 1;
`/ux-copy`, `/web-taste`; R15-16, 17's lessons; the caller rule.
Done when:
- A new account sees the circle and three bundle buttons only; Single reaches the birth form for You with a test credit through the
  sandbox; an admin without a finished own report sees no Ask and no Your week; the buyer walk passes.
- `?visitor=new` fetches nothing of the admin's, under a Preview ribbon with Leave; each Account preview step ends on billing's off
  line and changes nothing; at 390 and 1440 px on real shots; typecheck and the critical tier green.

### R19-36 — The violet ring: anyone in a pair you can open (USER-FACING)
Tier: sonnet — one ring and one legend line on the circle, the rule pinned by ADR-339
Objective: the circle's violet ring marks anyone in a Compatibility report the reader can open; the legend names it.
Files: `web/src/components/dashboard/Orbit.tsx`, `orbit.css`; `web/src/lib/orbit.ts`.
Refs: sharing-and-circle §9; ADR-339, 341; readings 15, 19; pinned Contract (`HomePair`); Round start 4 (ii) screen A; `/ux-copy`,
`/web-taste`.
Done when: the ring comes from `GET /home`'s pairs alone (a pair closed to the reader draws none); the legend line in the artifact's
words; at 390 and 1440 px on real browser shots; typecheck and the critical tier green.

### R19-37 — "These are your own birth details" (USER-FACING)
Tier: sonnet — one check and one line on the birth form, pinned by ADR-340
Objective: when the birth details typed for someone match the reader's own chart, the form says "These are your own birth details"
and offers their report.
Files: `web/src/pages/BirthFormPage.tsx`.
Refs: sharing-and-circle §10; ADR-340; Round start 4 (ii) screen F; `/ux-copy`; R15-18, 19's lessons.
Done when: matched on date, time and place against the `isSelf` profile from `GET /profiles`, never by name; the offer opens the
reader's own report; nothing blocks saving; at 390 px on a real shot; typecheck and the critical tier green.

### R19-38 — The Compatibility report: the Share window, its story card at the end (USER-FACING)
Tier: sonnet — one page's Share and card moved, the window and its target pinned
Objective: the pair report's Share opens the Share window for its other person; the story card moves to the end of the report;
the last user of `SendDialog` goes, and the file with it.
Files: `web/src/pages/CompatibilityReportPage.tsx`; deletes `web/src/components/SendDialog.tsx`.
Refs: sharing-and-circle §1, §8; ADR-329, 338; MB-82; B-07; pinned Sharing web; `/ux-copy`, `/web-taste`; the caller rule.
Done when: no file imports `SendDialog` (R19-21 drops `ReportPage`'s, R19-30 the dashboard's); the story card renders after the last
section; at 390 and 1440 px on real shots; typecheck and the critical tier green.

### R19-39 — Life: drag through time, and the Your cycles card (USER-FACING)
Tier: sonnet — a handle on the waves and one card re-ordered, each line and its order pinned in Review 05/10 §4
Objective: the Today line is a handle, with a slider under the graph, from birth to 90 ("age N · Mon YYYY"), snapping to the nearest
cycle mark; the card under it is the Your cycles card in the spec's order (word and countdown, name and ⓘ, what and how often, For
you, the meaning, "Think back to…" last); ⓘ opens the science; `KNOWN_AGES` labels go.
Files: `web/src/components/timeline/Life.tsx`, `Waves.tsx`, `CycleCard.tsx`, `AgeRing.tsx`; `web/src/lib/life-view.ts`,
`now-ahead.ts` (`AgeCard` and `lifeModel` only).
Refs: review-05-10 §4, acceptance 6, 8; reading 23; Round start 4 (iii) Part 4; `/ux-copy`, `/web-taste`; R16-01 and R16-23's
lessons; the caller rule (`life-view`'s other users: `teaser-view.ts`, `ask-view.test.ts`).
Done when:
- Drag by pointer, slider and keyboard; ⓘ gives the planet's degree, sign and house at birth and on the exact date and the close
  stretch with its passes, computed by the engine from the reader's chart.
- On audrey-hepburn computed at run time no "Think back to" names a date after today; at 390 and 1440 px on real shots; typecheck
  and the critical tier green.

### R19-40 — Ask's pair offer, with the reader's credits (USER-FACING)
Tier: opus — Ask's thread and a credit's spend: who is offered what, and only once
Objective: asked about a person with no pair, after the answer one card, once per person per conversation: "See <Name>'s side too",
one reason, "You have 5 credits. This uses 1." and Write it; at zero "You have no credits left. One credit writes it." and Get a
credit; no price, no second ask; Write it opens the picker with both picked (`/dashboard?pair=`).
Files: `api/src/lib/ask.ts`; `api/src/routes/ask.ts`; `web/src/components/ask/AskPanel.tsx`, `AskCards.tsx`;
`web/src/lib/ask-view.ts`.
Refs: review-05-10 §8, acceptance 12; ADR-297 to 312; pinned Contract (`AskMessage.offer`); `/ux-copy`; R16-29's lesson.
Done when:
- `offer` filled once per person per thread from the reader's credits, null for a person with a readable pair (R19-17 quotes it);
  `ask.edges.test.ts` (critical) pins once-only and the zero-credit line.
- At 390 px on a real shot; typecheck, the critical tier and the buyer walk green.

### R19-41 — The buyer walk: both share questions, the picker into the report, both roads to step 4, the tap (INTERNAL)
Tier: opus — the one step list both walks run (ADR-273, 314, 315), its maps typed by its ids
Objective: the step list gains the giver's share question at the gift, share back at the claim and the picker opening the pair's
loading screen, so both roads to step 4 stay in the critical tier (ADR-342); the sharing walk cancels a waiting link and copies one; a
step that waited for a report to open by itself taps Start reading (R19-46, ADR-393).
Files: `api/src/walk/steps.ts` (+ `steps.test.ts`), `buyer.walk.ts`, `sharing.walk.ts`; `api/src/lib/qaWalk/steps.ts` (+
`qaWalk.test.ts`), `qaWalk/browser.ts`.
Refs: sharing-and-circle §3, §6, §12, acceptance 11; review-08-10 §2; ADR-273, 314, 315, 331, 336, 342, 390, 393; readings 16, 17, 29;
pinned Contract; R17-05 and R17-19's lessons; the caller rule.
Done when:
- Each new step in both maps with its kind (a staging step that writes is `stored`, or `local` with its reason); `mapProblem` clean;
  the buyer walk passes on a scratch Postgres, both Yes grants read back through `GET /home`.
- `steps.test.ts` and `qaWalk.test.ts` (critical) green; typecheck and the critical tier green.

### R19-42 — Reading the sky, the film, on /method (USER-FACING)
Tier: opus — a render outside CI, self-hosted video, a page's CSP, and words already recorded
Objective: /method shows the film's chapter 1 as its branch renders it, both cuts, as a still with a play button that plays only on
a tap, with its burned-in captions, `preload="none"`.
Files: `web/src/site/pages/MethodPage.tsx`; new `web/src/site/components/FilmStill.tsx`; new `web/public/film/`; `vercel.json`;
`web/scripts/csp.mjs`.
Refs: report-loading-story §5, acceptance 10; ADR-323, 388; reading 24; `claude/reading-the-sky-video` (c13d7b1, `render.sh`);
`/ux-copy`, `/web-taste`; R14-01's lesson (the CLI pinned, never in a `package.json`).
Done when:
- Rendered with `render.sh` in a scratch worktree of that branch, nothing of it merged but the files; each cut at most 12 MB (an
  ffmpeg re-encode if larger); the captions pass `/ux-copy`, or the card stops with its lines in the report.
- The CSP holds (`csp:write` run, a `media-src` only if needed); Lighthouse and axe pass on the preview; at 390 and 1440 px on real
  shots; typecheck, both builds and the critical tier green.

### R19-46 — One progress bar on both loading screens, and the report waits for the tap (USER-FACING)
Tier: sonnet — a bar, its numbers and the story's end, each pinned in reading 29 and the artifact
Objective: the Personal report's story and Timeline's setup show one thin bar with its percentage and what is being written ("58% ·
writing this month"), moved only by real work; no report opens by itself, the story holds on Start reading (ADR-393, 394).
Files: `web/src/components/loading/LoadingFrame.tsx`, new `ProgressBar.tsx`; `web/src/components/report/OpeningOverlay.tsx`;
`web/src/components/timeline/TimelineSetup.tsx`; `web/src/lib/timeline-setup.ts`, `pair-story.ts` (+ both tests);
`api/src/lib/timelineSetup.ts` (+ test; `landed` only).
Refs: review-08-10 §2, §3, acceptance 2, 3; ADR-47, 59, 316 to 320, 351, 393, 394, 404; reading 29; pinned Loading, Contract; Round
start 4 (iv) notes 2, 3; `/ux-copy`, `/web-taste`; the caller rule (`SELF_OPEN_HOLD_MS`, `plainSlots`, the walk).
Done when:
- The self-open and "Opening it now." gone, the early door and Try again unchanged, the pair's screen waiting too; `setupProgress` and
  `landed` as pinned; the critical `timeline-setup.test.ts`, `timelineSetup.test.ts` and `pair-story.test.ts` pin a bar that never
  moves back, 100 only at the last reading, and the pair's last caption.
- In a browser on the dev server with the canned model the finished story waits 60 s on Start reading with no navigation; each walk
  step that waited for it named for R19-41; at 390 and 1440 px; typecheck, the critical tier and the buyer walk green.

### R19-47 — The hero's horizon: solid, level, fixed at its cause (USER-FACING) — B-62
Tier: opus — a tilt whose cause isn't known yet, at three widths, on the report's first screen
Objective: the hero's horizon becomes a solid, level paper line through the Ascendant and the Descendant, drawn like the loading
story's step 4 with the ring dimmed behind it; the dotted `SKY_DIM` line goes; the tilt is fixed where it starts (the frame, a scroll
transform or the plate's aspect); a Moon near the Ascendant no longer covers "EAST · RISING" on a phone (B-62).
Files: `web/src/components/report/ReportHero.tsx`, `hero-layout.ts` (+ `hero-layout.test.ts`).
Refs: review-08-10 §4, acceptance 4; ADR-17, 22, 27, 49, 395; B-62; Round start 4 (iv) note 4; `/web-taste`; R18-09's lesson; the
caller rule (`TriadPlate` draws its own dotted line, outside the spec, named if the cause is shared).
Done when:
- The cause named in the report with the line that made it; both ends of the line within 0.5 px of the same height on screen
  (`getScreenCTM`) at 390, 768 and 1440 px, on audrey-hepburn's hero and a chart with a Moon near its Ascendant, both computed at run
  time.
- B-62's label clear of the Moon at 390 px; the hero otherwise as on main (a shot beside main's); typecheck and the critical tier
  green.

### R19-48 — The house card: going backwards here, the stellium and its balance, Often noticed (USER-FACING)
Tier: sonnet — blocks in a fixed order on one card, their words and order pinned in reading 26 and the artifact
Objective: the card drops "Opposite:" and the generic R line (ADR-396, 402); after the reading come Often noticed, the stellium block
and a block for each body going backwards (an R badge, "<Planet> is retrograde here"), then Does this sound like you?; a Stellium chip
in the header; the R line once under the wheel at every width.
Files: `web/src/lib/house-deck.ts` (+ `house-deck.test.ts`); `web/src/components/report/HouseCard.tsx`, new `HouseBlocks.tsx`,
`HouseDeck.tsx`.
Refs: review-08-10 §5 to §7, §9, acceptance 5 to 7, 10; ADR-321, 386, 396, 398, 402, 403, 404; reading 26; pinned Houses, Patterns;
Round start 4 (iv) notes 5 to 8; `/ux-copy`, `/web-taste`; R18-09's lesson; the caller rule (`oppositeLine`).
Done when:
- On a fixture with a stellium and a body going backwards, computed at run time, with a canned v12 houses section for its real
  placements, every block shows in reading 26's order and the chip from `chartPatterns`; a v11 card keeps its reading.
- No "Opposite:" and no R line on any card, the R line once under the wheel (on a phone under its bar); no sideways scroll at 390 px;
  `/web-taste` at 390, 768 and 1440 px on real browser shots; typecheck and the critical tier green.

---

## After the builders: the orchestrator's steps, not cards
1. **After group 3, once:** gitleaks over `main...round/R19` with CI's pinned version and config, and a grep of the same diff for any
   `+clerk_test` address beyond the pair's two: none (R19-28).
2. **The study check** (ADR-381): every quoted fragment in `explain-voice-study.md` against the files R19 adds or changes under
   `api/src/prompts/` and the web's new words: no run of five words or more appears; R19-44's ideas against the 33 slides the same way
   (ADR-403). A hit goes back to its card as a fix.
3. **The tester, once** (ADR-273: the claim, the gift and its claim, the picker, the first visit, the write chain and the report's
   opening change), its base the round's first commit: the two-You claim; the rough-time lines; B-76 on a chart with no birth time;
   `explainChecks` on hand-made strings; the canned replies with a card and with nulls; `GET /home`'s new states; both Yes grants, Not
   now and a cancelled link; the Share window's chips and refusals; Your first steps on both roads; the picker into the loading
   screen; the empty dashboard and `?visitor=new`; the QA account's cap and its staging-only start; `chartPatterns` on the fixtures
   and the rule's edges (two planets with the North Node, one planet with Chiron and the North Node); Pluto's 2026 passes and stretch;
   validate's dropped blocks and `noticed`; `setupProgress` never moving back; no report opening by itself; the house card's block
   order. A bug it finds is a fix for that card.
4. **The gate:** install, typecheck, both builds, the critical tier, the buyer walk on a scratch Postgres, `check:shipped`,
   `check:copies`, `pnpm audit --prod`, codegen twice with no diff, `db:bootstrap` twice clean on an empty database and on main's
   (R19-25), `csp:write` with no diff after R19-42's, smoke, the probe and the site checks on the preview.
5. **The dry lab** after each group (`pnpm report:lab --dry --base r06`, pairs included, with Timeline's and Ask's renders and the
   injection fixtures; free) and `--compare` against r06 after group 3 with R19-19's measures; the report gives each product's
   prompt size before and after.
6. **The sentinel** on `main...round/R19`, its eye on: MB-234, MB-214 and MB-212, read from their rows; R19-07's claim (only the
   session's unclaimed rows, counts only in the log); R19-24's states and R19-25's grants (each of the answerer's own report only,
   written at its moment, ended by Stop sharing) and two routes (the link's maker only, a 404 for anything else); R19-28's account
   (staging alone, one account, its address in no file, log line or report, the cap on the server); R19-35's preview (nothing of the
   admin's fetched); R19-42's CSP; the checks' messages (a rule, a word or a scene id, never reader text); the passages, scenes,
   topics and observations carrying no instruction-like text and no creator's words, `noticed` filled only from the table; R19-46's
   `landed` (the reader's own setup, counts only); `testModel.ts` reached only by tests and the walk.
7. **Three greps** (report-loading-story acceptance 8, 9; review-08-10 acceptance 5, 6): one `houses.ts`, and no other copy of the
   house words in `web/`; no "moment" or "things" naming a transit or a cycle in copy; no house card printing "Opposite:" or importing
   `RetrogradeLine`. A hit goes back to its card.

## Staging confirmation, after the merge
1. The deploy's walk at 0 ¢: its verdict and pictures, the new steps among them.
2. **The QA account:** the staging Sales page shows its row; the Owner copies the address once into the cloud environment's settings
   as `QA_ACCOUNT_EMAIL` (asked on MB-227 at the close); `/qa` then signs in with it and plays the signed-in steps itself.
3. **The Owner's look**, on his own account: a new Personal report (about 4 ¢), its story waiting on Start reading under its bar, read
   for the primer, an empty house, a planet going backwards in its own block, Chiron, a Did you know card, the 9th house's Stellium
   chip with "To balance it: your 3rd house" and Saturn's block, an Overview that opens on the 9th, no "Opposite:" and a level horizon
   in the hero; a Compatibility report made from the picker into its loading screen; the Share window on his own report and on a
   person's; a gift with its share question; `?visitor=new`; his Timeline cards with their years (his Pluto opposite Moon reads "to 2
   Feb 2027", shows "Pluto going back" until 16 Oct 2026, and Read more gives its three passes and stretch), his week as one picture,
   Life's drag and the Your cycles card (his readings written again once at t2, about €0.07); a Mercury retrograde's shadow card; one
   Ask about a person with no pair; /method's film; the R line on /timeline; /sample's primer. Timeline's bar is checked by R19-46 on
   the dev server; on staging it shows at the next first setup.

## Production after the round
Nothing sells. The next Release runs the full lab (the brain changed in four products and the engine) with its pair, the gate, the QA
agent and the walk's seed; explain-like-a-friend's acceptance 1, 2, 3 and 5 and Review 08/10's acceptance 8 (each house reading that
names a body outside its house gives the reason, read by eye per fixture) are read there with R19-19's measures against r06 (grade 6
to 8, no sentence over 25 words, at most one named placement a paragraph). A passing Release refreshes /sample (B-27, B-81). On
production the app stays behind the waitlist (ADR-167), production never makes the QA account, and t2 rewrites the admin's own
Timeline readings at his next open.

## Owner prerequisites (none blocks the build)
- **`QA_ACCOUNT_EMAIL`, once, after the merge's deploy:** the address on the staging Sales page's QA account row, copied into the
  cloud environment's settings. The close asks it on MB-227, whose host ask it replaces (noted there 2026-10-08); no new row.
- **MB-228** before the first live sale, with MB-114 and MB-115 as before.
- **The Observations inbox** exists from Round start 9; the Owner may drop sources there whenever he likes, and `/observe` reads them.
  Nothing in R19 waits on it.

## What it costs
| What | When | About |
|---|---|---|
| The dry lab, `--render` and `--compare` | in the round | 0 ¢ |
| The film, rendered from its branch | in the round | 0 ¢ |
| The observations' second sources, the researcher's searches | Round start | 0 ¢ |
| A staging deploy's walk | every deploy | 0 ¢ |
| Timeline readings written again at t2 | at each subscriber's next open (staging: the admin and testers; production: the admin) | €0.07 a subscriber |
| /qa's own account writing reports on staging | when /qa writes one, at most 6 a UTC day | about 4 ¢ a report |
| The Owner's look: a Personal and a Compatibility report on staging | when he looks | about 8 ¢ |
| A spot run on audrey-hepburn and two more (optional, the Lab page) | on demand | 2 to 10 ¢ |
| The next Release: the full lab with its pair, and the walk's seed | when the Owner says promote | about 20 ¢ + 10.5 ¢ |

Each report's prompts grow (crisp lines in the shared system prompt, two passages and a few scenes in each chapter's user prompt);
R19-14's report gives the size from the dry lab, and the next Release's lab gives the cost. Rewrites count against the daily spend
cap (ADR-199), the lab against `LAB_BUDGET_USD` (ADR-77).

## Risks
1. **Schema:** two columns on `invite_tokens` by an idempotent script in the bootstrap (R19-25), run twice clean; the testers' `qa`
   gains a value in TypeScript alone (a text column with no check, R19-28); each stored house reading gains three optional fields
   inside the report's JSON, with no migration (R19-12). **The contract** changes once, first (R19-23).
2. **No new dependency** (R14-01's lesson): the grade estimate is written by hand and the lockfile doesn't move; R19-42 runs the
   pinned HyperFrames CLI in a scratch worktree, never in a `package.json`, CI or a build.
3. **The brain:** prompts in all four products, the vocabulary, the brief, the checks, the engine (comfort, shadows, passes, patterns)
   and the observations table (R19-01 to 04, 09 to 17, 20, 27, 43, 44); v12, p7, t2 and a2 clear staging's prompt overrides in all
   four (R-7.3; `%:system` follows natal). The dry lab runs after each group; the next Release runs the full lab.
4. **Report content (USER-FACING):** every new Personal report (names in the prose with their plain meaning, rulers with their reason,
   claims with a scene, the primer, Chiron, planets going backwards in their own blocks, stelliums and what balances them, Often
   noticed, empty houses, an Overview that opens on a stellium, Did you know), the planet cards' shorts, every new Compatibility
   report, every Timeline reading (written again once at t2, its passes in it) and Ask's answers. Each card's done-when names its
   fixture run (the dry lab, `--compare`, or a fixture's chart computed at run time); explain-like-a-friend's acceptance 1 and 5 and
   Review 08/10's 8 are read at the Release, since the round writes no prose.
5. **User-visible without locked words:** the R line's new words (ADR-386), the Did you know topics (ADR-383) and the shadow card, the
   rough-time lines (MB-235's own), a claimed chart arriving as a person (R19-07), the first visit through the sandbox's checkout and
   the new-visitor view (ADR-389), the QA account's cap line (only /qa meets it), the passes' two blocks, the bar's lines and the
   stellium fact (the artifact's words where it has them), and the pair's loading screen, which shares the overlay and so waits for
   the tap and shows the bar (ADR-404). Each through `/ux-copy`; the close lists them before and after for the Owner.
6. **Quality:** a writer told it may name placements may name too many (acceptance 1); passages or scenes may be copied (chk-50
   warns); the rule may read stiff on a chart with no birth time; the blocks lengthen each house card; if the researcher finds few
   second sources, only the 8th-house idea enters (acceptance 10 needs that one). The Release's measures and the QA agent read all of
   it; every warn lands on the Failures tab.
7. **Spend:** none in the session; t2's rewrites (€0.07 a subscriber), a little more per report from longer prompts, and /qa's reports
   on staging, at most 6 a day.
8. **Security:** MB-234, MB-214 and MB-212 (private); R19-07's claim; who reads whose report after R19-24 and R19-25 (R-3.6); R19-28's
   account and its address; R19-35's preview; her text in a public repo (ADR-381); creators' words in a public repo (R19-44: our words
   only, nothing scraped, sources by account). The sentinel's list is After the builders 6.
9. **Size:** 48 cards in three groups (15, 19, 14), 30 on Opus; no shrink path (the Owner, 2026-10-08); three pushes plus fixes.
10. **Escalations:** none in R17 or R18, so no card or kind of card was escalated to Opus in two rounds running.
11. **Dated:** "Pluto going back" shows until 16 Oct 2026 (acceptance 1); a merge after that day reads Read more's passes alone and
    the chip on the next backwards stretch. Pricing and launch stay unplanned (ADR-230, 242).

## Lessons this plan guards
- **Promoted, the caller rule** (`builder.md`): R19-01 (the shorts' readers), R19-04 (`ContactEvent` literals), R19-05
  (`RETROGRADE_LINE`'s six users), R19-08 (`StoryInput`), R19-09 (`STYLE_CONTRACT`, `SIMPLE_WORDS`, `DOCTRINE`), R19-11
  (`ChartBrief`), R19-12 (`HousesSchema`'s readers), R19-14 (`PROMPT_VERSION`, `countWords`, `proseOf`), R19-15 (p6's pins and stored
  rows), R19-16 and 17 (their versions' readers), R19-19 (`faultsOf`, `measureSection`), R19-21 (`RENDERABLE_*`), R19-23 (the
  generated names), R19-24 (`LISTED_PAIR_VERSIONS`), R19-28 (`QA_ACCOUNTS`, `writing`), R19-29 (the path's exports), R19-32
  (`nearDate`, `TONE_WORDS`, `ReadingTarget`), R19-39 (`life-view`'s users), R19-41 (the step ids in both maps), R19-43 (the brief's
  stellium code, `hemisphereEmphasis`), R19-46 (`SELF_OPEN_HOLD_MS`, `plainSlots`, the walk's steps), R19-48 (`oppositeLine`).
- **Promoted, the log rule** (`builder.md`): R19-06, R19-07 and R19-25 (ids and counts only), R19-10 (a check's message names a
  rule, a word or a scene id, never reader text), R19-28 (the address in no log line).
- **Promoted, the pathspec and pkill rules:** every builder; group 2's nineteen share one tree.
- **Applied:** builders commit as they go; the tester's range from the round's base; one push per group and per fix; the planner
  commits once.
- R13 · R13-05 (a card editing the running /round skill refused) → no card edits `.claude/skills/round/` (B-60 stays a line); R19-28's
  two /qa files and R19-44's `/observe` fall to the orchestrator at the close if refused.
- R13 · R13-10 (a counting route wrote a row per value with no ceiling) → R19-28's cap counts stored rows and writes none.
- R14 · R14-01 (a dependency's packages unnamed) → no dependency; R19-19's grade by hand; R19-42's CLI pinned outside every package.
- R14 · R14-12 (a stray Enter closed a dialog) → R19-26's Enter adds a chip and never closes; R19-31's questions pre-pick nothing.
- R15 · R15-04 (a pattern matched on raw JSON) → R19-10's checks read parsed strings only.
- R15 · R15-16, 17 (a public page on a route the prelaunch gate closed) → R19-35's `?visitor=new` fetches nothing; R19-42's film is
  self-hosted on a prerendered page.
- R15 · R15-18, 19 (an address shown that was never given) → R19-07 moves only the session's unclaimed rows; R19-24 names a waiting
  reader by the address the reader typed; R19-31 names the signed-in account by its own.
- R16 · R16-01, 03 (a spec promising what the engine can't meet) → Round start 3(a) checks the shadow against JPL before R19-22, and
  Pluto's passes and stations before R19-04.
- R16 · R16-01 (a range on a raw instant) → R19-22, R19-32 and R19-45 print dates in the reader's zone from the instants they compare.
- R16 · R16-05 (a weekday read off a rolled-over date) → R19-27 finds Monday from the reader's zone date.
- R16 · R16-21 (a check that looked only at a start) → R19-10's checks look anywhere in a sentence.
- R16 · R16-23 (an age rounded, not floored) → R19-27's `ReadingInput.age` and R19-39's ages are floored.
- R16 · R16-24 (a kept row spinning for good) → R19-16 keeps `ReadingSchema`, so a t1 reading shows while it waits.
- R16 · R16-29 (a spending surface with another product's refusal line) → R19-28's cap and R19-40's offer carry their own lines.
- R17 · R17-05, 19 (a shape guessed by another card of the group) → every seam between cards is in Pinned shapes (the patterns, the
  observations, the passes, the bar and the sheet's `event` among them); R19-23 goes first.
- R17 · R17-08, 18 (a shipped line stating what our checks refuse) → R19-10 runs the new checks over R19-02's scenes and R19-03's
  passages; R19-05's line says only what is true of every planet.
- R18 · R18-09 (artifact CSS collapsing a grid) → R19-18, 21, 26, 29, 33, 39, 45, 46, 47 and 48 take the artifact's words and shapes,
  not its CSS, each checked on a real browser shot.

**Lessons read through R18.** R18's close wrote `lessons.md` (28a5b89, 2026-10-07); `main` at 724e606 and this branch leave it as it
was. This plan was written after R18 closed.

## Questions raised (Notion, 2026-10-08, sorted by R-12.3)
- **Decided by me** (Decisions, `Decided by: Claude`): ADR-383, Did you know in seven chapters, Mercury's shadow card in fixed words,
  model passages in the Personal report's chapters; ADR-384, Timeline reads by the houses a contact's planet crosses, with no new
  event kind, ending on "a good time to…"; ADR-385, chk-49 to 52 warn, the pair's chk-21a, 21b and 24 warn while chk-20 and 22 stay,
  METHOD_TALK drops two phrases; ADR-386, the R line true for every planet, B-77 closed as designed; ADR-387, /qa's own staging
  account (B-74); ADR-388, R19 takes every locked spec not yet built, the film rendered in the round, the reels through /marketing;
  ADR-389, Review 05/10 §1 through today's checkout, the new-visitor view in its own tab; ADR-390, Hide kept in the browser, Copy
  their link with no raw link stored; ADR-391, the house set's covers lines as the houses' crisp lines; ADR-404, Review 08/10 as R19
  builds it: Often noticed filled in code from `observations.ts`, the passes' two blocks in fixed words from the engine's dates, the
  stellium fact only on a chart with one, half the sky by degree from the angles, the card printing "To balance it: your <Nth> house",
  the pair's loading screen sharing the bar and the tap, the bar on Timeline's setup screen only.
- **Needs you (Mailbox):** no new row. MB-235 noted (items 1 and 2 are R19-07 and 08, provisional; item 3 as built); MB-215 noted
  (R19-27's headlines, provisional); MB-232's default reworded (no spec yet: `/ideate` and `/lock` first); MB-227's host ask
  withdrawn (B-74 replaces it); MB-234, MB-214 and MB-212 noted (private).
- **Backlog, done by R19:** B-03's dry-lab part, B-07, B-32, B-33, B-50, B-51, B-52, B-57, B-62, B-63, B-64, B-67, B-73, B-74, B-76.
  **Closed:** B-77 (ADR-386). **Added, with no round:** B-82 (model passages for Compatibility, Timeline and Ask), B-83 (the two
  reels), B-84 (`hemisphereEmphasis`'s east and west). **Kept open, with no round:** B-03's rest, B-04, B-16 to 18, B-58, B-70, B-75,
  B-78 to 81 and the rest of the list; MB-202, 207 and 213 before Timeline opens to subscribers.

## Approved (the Owner, 2026-10-08)
Every card is built, none shrunk; MB-235's two calls ship at their defaults, marked provisional (R19-07, 08); Review 08/10 is in
whole. `/round R19` starts on this plan (MASTERFILE §11.2). It sells nothing and spends nothing in the round.

## Close (the orchestrator)
The backlog lines above leave `docs/backlog.md` as done (B-62 and B-74 among them); a Decisions row `Decided by: Claude` for each
choice the round took on a rule; a Mailbox row lists the round's new words before and after (`docs/annex/R19-words.md`) for the
Owner's look; MB-227 asks the one paste; *Waiting on Alex* kept current, MB-235's seams out if he says ok. MASTERFILE: R-5.3 (scenes
and model passages join the static grounding), §4's engine list (`comfort.ts`, `shadow.ts`, `patterns.ts`, a contact's `crosses` and
`passes`), R-4.3's annex rows 49 to 52 and row 14's house blocks, §3's invite columns. INDEX's code map: `scenes.ts`, `examples.ts`,
`didYouKnow.ts`, `observations.ts`, `comfort.ts`, `shadow.ts`, `patterns.ts`, `qaAccount.ts`, `HousePrimer`, `HouseBlocks`,
`FactCard`, `ShareWindow`, `FirstSteps`, `WeekBars`, `ToneLegend`, `PassStrip`, `ProgressBar`, `FilmStill`, `shadow-fact.ts`,
`passes-view.ts`; INDEX's skills: `/observe` and the Notion "Observations inbox"; INDEX's specs: explain-like-a-friend,
sharing-and-circle, review-05-10, review-08-10 and report-loading-story built (the reels as B-83). CLAUDE.md's focus: R19 shipped.
`lessons.md` takes each failure's cause. `/qa` on staging after the merge's deploy walk, then the URL, the QA report, the walk's
verdict, Staging confirmation's lines and the Observations inbox's link go to the Owner.
