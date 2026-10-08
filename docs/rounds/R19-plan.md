# R19 plan — explain it like a friend: one plain-words rule in four products, the primer, Did you know

Planned 2026-10-08 on `main` at c52f9e5 (PR #131 merged: QA-07) for `explain-like-a-friend` (locked 2026-10-07, ADR-369 to 382),
with Review 05/10 §7's houses prompt and §10 (ADR-297 to 312), which it extends and which R18's plan had left for R20; QA-07's
sev-2 line B-73 with B-76 in the same files; MB-234 (private) in the first group; MB-235's two small calls (provisional) with
MB-214 (private) on the claim card. **Size, honestly:** the spec changes the prompts of all four products (Personal report,
Compatibility, Timeline, Ask), the vocabulary, the brief, the checks, the engine, the lab and three views. R19 is cut at 22
cards and leaves out only what the spec itself puts out of scope (the film scene, the Explained post). **Cards:** 22 in three
groups (8, 11, 3; ADR-283). **Tiers:** 16 Opus, 6 Sonnet, no Haiku. **Tags:** USER-FACING are R19-01, 05, 07 to 09, 11 to 18
and 20 to 22; the rest INTERNAL. **The brain changes** in R19-01 to 04, 09 to 17 and 20, so the dry lab runs after each group and
the versions move: v12, p7, t2, a2. **No schema change. The contract changes** (R19-20: one optional field). **No new
dependency.** No builder needs a credential, nothing goes on GitHub, nothing spends in the session, and production sells nothing
until launch (ADR-167).

## Open Mailbox rows created more than 14 days ago (oldest first, ADR-186)
**2026-09-09:** MB-12, no error reporting or alerting. It blocks no card; MB-232's spec reads it when that spec is written.

## Round number, size and order
R18 is the last round, and it has a report (closed 2026-10-07, its lessons in 28a5b89). Since then: QA-07 (no sev-1; sev-2 #1 is
B-74, the QA harness, and #2 is B-73) and one lock, `explain-like-a-friend`. No Mailbox row is `blocking`; MB-234's default is
"fixed in R19's first group" and MB-235's "each goes into R19 as a small card". R18's plan and CLAUDE.md named sharing and the
circle for R19. This plan takes the locked brain spec first: its first step (the vocabulary, ADR-376) comes before any rule
change, everything after builds on it, and Review 05/10's brain half (R20 in R18's plan) is the same pass. Sharing and the circle
become R20 (For the Owner 1). Pricing and launch are not planned (ADR-230, 242).

## Round start (the orchestrator)
1. Branch `round/R19` from `main` with this plan. `docs/backlog.md` already has B-77 closed (ADR-386).
2. **Lessons first (ADR-265):** this plan is stamped through R18; re-read `lessons.md` for any line added since and put each guard
   that fits into its card's done-when.
3. **Facts first** (the researcher, then the verifier; the SDK in `node_modules` before the web). A fact that breaks a pinned shape
   re-pins it before group 1; one that can't be re-pinned stops the round (R-0.1).
   (a) One Mercury retrograde of late 2026 or 2027: its two stations and its shadow's two ends from JPL Horizons, to the day, for
   R19-04's `shadowOf`; each planet's days going backwards in 2026 to 2027 (QA-07 #2's numbers) for R19-05's line.
   (b) OpenAI's strict structured outputs with the SDK in the lockfile: a nullable object field, as zod v4's `.nullable()` reaches it
   through `api/src/prompts/jsonSchema.ts` (R19-20).
4. **The artifact** (https://claude.ai/artifact/URGEFLx2S8KHTe2WrPV3XD): builders can't open claude.ai, so extract into the
   session scratchpad the primer's four ideas and its seven-planet table (home, least at ease, why), Audrey Hepburn's before and
   after, the empty-house lines and the retrograde picture. Where a builder's draft differs, the artifact wins and the report says so.
5. **The voice study** (`docs/annex/explain-voice-study.md`) goes to R19-01, 02, 03, 09, 13 and 20's builders for its patterns,
   scene types, crisp lines and verdicts. Her quoted lines never enter a prompt, a scene, a passage, a comment or a commit
   (ADR-381); After the builders 2 checks it.
6. `pnpm install --frozen-lockfile`. No `package.json` gains anything this round.
7. **MB-234 and MB-214 (private):** fetch both rows and give them to R19-06's and R19-07's builders in the brief. Nothing of them
   enters the repo, a commit message, a comment or a report; the plan names the rows only.

## What already stands (audit at c52f9e5)
- **Met, and reused:** `vocabulary.ts`'s five tables and `renderVocabularyBlock`; `traditional.ts` (`DOMICILE`, `EXALTATION`,
  dignity, sect) and the brief's dignity, sect and empty-house lines; `SectionSpec.extraContext`; `callStructured`'s checks; the
  pair's chk-20 strip (bracketed names only); Ask's names-in-sentences lift (`ask/index.ts:46`); `plain-prose.ts` (drops only a
  line made wholly of placement words, which the new rules 3 and 8 still allow); the engine's `stations`, `longitudeAt` and
  `RetrogradeEvent.houses`; R18's `facts.ts`, `DidYouKnow`, `RetrogradeLine`, `houses.ts` and House by House's quiet-house line;
  R18-25's stale-reading rewrite (so t2 rewrites at the open); `prompt-families.ts`; the dry lab with Timeline, Ask and injection.
- **Not met:** rule 1's new wording (`system.ts` still says never explain the method), rules 3, 8 and 11; crisp lines; scenes;
  model passages; the primer; the comfort table; shadow dates; a contact's crossed houses; Did you know in the chapters and in
  Timeline; chk-49 to 52; the shares of planets going backwards; Chiron in House by House (lost when planets share its house);
  B-73, B-76, B-67; Review 05/10 §7's houses prompt (the stale HOUSES ALREADY COVERED) and §10.
- **Found while planning:** (1) `METHOD_TALK` lists "in its own sign" and "in your chart, ", so a Release would refuse words the
  spec asks for: R19-19. (2) `countWords` and `proseOf` skip only `claims`, so a card would count in word bands and evidence:
  R19-14. (3) The section schemas are strict and the buyer walk's canned replies parse with them: R19-20 carries the new field in
  `testModel.ts`. (4) Rule 11 forbids "some astrologers", the card's own words: R19-09. (5) The shorts reach readers (the planet
  cards through `personalPlanets`; `underPressure` prints a dignity's short), so R19-01 is USER-FACING; `generate-vocabulary.ts`
  writes them with a model and a key, so R19-01 writes them by hand. (6) B-77 is Review 05/10 §9's own design (a title that
  finishes "Did you know"): closed, ADR-386. (7) The pair's chk-21a and chk-24 classes sit both in `shapes.ts` and in `checks.ts`'s
  RULES: they move together (R19-10, 15). (8) Review 05/10 §6's locked line is false for most planets (QA-07 #2): ADR-386 keeps its
  rule and changes its words. (9) `PairStory` passes `time: null` for a rough time and for none alike: R19-08. (10) The spec's out
  of scope names "shadow periods" while §9 and ADR-378 ask for shadow dates: dates for the card only, no reading built on them
  (ADR-384). (11) The study's Sun-and-Moon row adds an older day-or-night swap, a sect idea, and parent significators are out of
  scope: the Family card says Sun and Moon only (ADR-383). (12) Ask's fixed lines (`ask/lines.ts`) sit on MB-215: R19-17 leaves them.

## Where the specs meet, and how this plan reads them
1. **Rule 1** (ADR-369) supersedes ADR-104's rule 1 and widens Review 05/10 §10's named exceptions: any placement, house, ruler,
   aspect or idea may be named once with its plain meaning and a moment; all five aspect names, each explained the first time (the
   default taken); dignity and sect stay out (both specs). §7's ruler clause and §10's "the chapters never name planets" are read
   through it.
2. **Going backwards:** §10's one definition goes to the writer and Ask, followed by our own picture (explain-like-a-friend §5);
   the page's line follows ADR-386; every planet going backwards at birth is explained once in House by House (§10, acceptance 3).
   §10's Timeline card line ("Mercury retrograde · about 3 weeks") changes the card's face and waits with §2 (no UI change here).
3. **Scenes** (§0 and §10): the vocabulary block goes whole into every system prompt, and the pool must never be given whole, so the
   scenes live in `scenes.ts` beside `vocabulary.ts` and are picked per chart and section (reading 2).
4. **Ask** (Review 05/10 §8): its examples bullet is "show it in a day" for Ask and is built here (R19-17); its pairs and credits wait.
5. **Timeline** (§8, ADR-378 and 206): reading by house and the possibility ending, as ADR-384 reads them.
6. **Did you know** (§9, ADR-317, 377): R18's loading card stays as it is; the chapters' cards and Mercury's shadow card are new, in
   R18's look without bars or drawing.

## Goals
1. **Explain it like a friend, in the Personal report** (ADR-369 to 381): crisp lines and plain shorts, scenes and model passages
   (the vocabulary before any rule change, ADR-376); rules 1, 3, 8 and 11, life first, possibilities, no dignity or sect word;
   empty houses through their planet in charge; the primer before House by House; Did you know in seven chapters; warn checks.
2. **The same rule in Compatibility, Timeline and Ask** (§6, §8): the pair's checks relaxed, Timeline read by the house a planet
   moves through and ended on a possibility, Mercury's shadow card, Ask's everyday example.
3. **Review 05/10 §7's houses prompt and §10**, which the spec extends: each planet going backwards at birth and Chiron named and
   explained in House by House (acceptance 3).
4. **QA-07's R line, true for every planet** (B-73, sev-2, ADR-386), with B-76 (Did you know on a chart with no birth time).
5. **MB-234 (private) in the first group**, as its default says; MB-235's two small calls at their defaults (provisional), with
   MB-214 (private) on the same card.

## Preconditions
1. Builders read MASTERFILE §0, their card, the readings and pinned shapes it names, Round start 4's extract, and for prompt cards
   §5 (R-5.1, R-5.2) and the study (Round start 5).
2. **Single owners.** No file in two cards of a group. Across groups: the seven chapter files `overview.ts`, `mind.ts`,
   `career.ts`, `family.ts`, `superpowers.ts`, `discoveries.ts`, `focus.ts` → R19-13 (2), R19-20 (3). Alone: `vocabulary.ts` →
   R19-01; `system.ts` → R19-09; `checks.ts` and the annex → R19-10; `brief.ts` → R19-11; `aiInterpretation.ts` and `evidence.ts` →
   R19-14; `openapi.yaml`, codegen and `testModel.ts` → R19-20; `web/src/types/chart.ts` → R19-21; `HouseDeck.tsx` → R19-18;
   `build-story.ts` → R19-08. No card changes `api/test.critical` or `web/test.critical`.
3. Inside a group a card may land before one it imports from (pinned shapes): the orchestrator accepts a red intermediate until the
   group ends, and every group ends with typecheck, the critical tier, the buyer walk and the dry lab green.
4. **No card spends or reaches a network:** the model is stubbed in every test and walk; the shorts are written by hand
   (`generate-vocabulary.ts` needs a key no session holds); placements are computed from fixtures, never typed from memory.
5. **Seams:** `// MB-235 provisional` at R19-07's and R19-08's seams; MB-234's and MB-214's code carries no MB comment.
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
5. **Going backwards.** The writer's definition is Review 05/10 §10's, then our own picture. The page's line (ADR-386) names no
   single length (about three weeks for Mercury, over four months for Saturn) and no single overtaker (Earth passes Mars and the
   planets beyond; Mercury and Venus pass Earth). Each planet going backwards at birth is explained once in House by House, the slow
   ones with how common it is (§10's shares), the nodes' as normal; Compatibility says it once where a lens reads one.
6. **Chiron** (ADR-379): by house, never by sign; one sentence in its house's reading even when planets share it: the sore spot,
   then the gift, in possibility words.
7. **Did you know** (ADR-377, 383): one a chapter at most, outside the prose (no band, no claims, no evidence); a title that
   finishes "Did you know" (Review 05/10 §9); two to four sentences: what the tradition reads, what it could mean here, the lesson;
   worded as tradition ("is often read as", "old astrology tends to", "many people find", "some astrologers say"); our own pictures.
8. **Reading by house in Timeline** (ADR-378, 384): a contact's reading names the houses its planet passes through beside the natal
   point's; retrogrades keep theirs; no new event kind and no change to the card's face; shadow dates for Mercury's card only.
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

## Pinned shapes
- **Vocabulary** (R19-01): `VocabEntry { crisp: string; short: string; full: string }` for BODY, SIGN, HOUSE and STRUCTURE (ASPECT
  unchanged); `renderVocabularyBlock()` prints `crisp` before `full`.
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
  `comfortOf(body: string, sign: string): "home" | "least-at-ease" | null`; `shadowOf(body: "mercury" | "venus" | "mars", start:
  Date, end: Date): { from: Date; to: Date }` (start and end are the two stations; `from` is when it first reaches the direct
  station's degree, `to` when it is back at the retrograde station's); `ContactEvent.crosses: number[]` (whole-sign houses in
  order, `[]` without a horizon; event keys unchanged).
- **Checks** (R19-10): `explainChecks(value: unknown): Check[]` (chk-49 on prose fields and the card, chk-50, chk-51);
  `DIGNITY_WORDS: readonly string[]`; RULES `warn` for chk-21a, chk-24 and chk-49 to 52; chk-52 is emitted by `houses.ts`.
- **Brief** (R19-11): `ChartBrief.scenes: Readonly<Record<string, readonly Scene[]>>` by section key; a placement's line ends with
  its comfort words; `EMPTY HOUSES:` one line each ("8th: empty. Virgo starts it. Its planet, Mercury, is at home in Gemini, in
  your 5th, because …"); `RETROGRADE AT BIRTH:` one line each ("Venus: as for about 7 in 100 people"; the nodes: "always;
  normal"); `CHIRON: in your 4th`.
- **Did you know** (R19-20): model schema `didYouKnow: z.object({ title: z.string(), body: z.string() }).nullable()`; contract
  `DidYouKnow { title: string; body: string }`, optional and nullable on overview, mind, career, family, superpowers, discoveries
  and focus; `topicFor(section: string, brief: ChartBrief): { topic: string; lesson: string } | null`.
- **Web** (R19-08, 21, 22): `StoryInput.birth.rough?: boolean`; `FactCard({ title: string; body: string; className?: string })` in
  `web/src/components/FactCard.tsx`; `shadowFact(target: { key: string; houses?: readonly number[]; start?: string; end?: string
  }): { title: string; body: string } | null`; `ReadingTarget` gains `houses?`, `start?` and `end?`.

## Parallel groups
**Group 1**, one message: R19-01 to R19-08 (no file in common). R19-02 and 03 write to the rule as reading 1 pins it, before R19-09
writes it (ADR-376). Push once. **Group 2**, one message once group 1 is green: R19-09 to R19-19. R19-11 calls R19-02's
`pickScenes` and R19-04's `COMFORT`; R19-12 reads R19-11's lines; R19-14 wires R19-03's passages, R19-11's scenes and R19-10's
`explainChecks`; R19-15's classes match R19-10's RULES; R19-16 reads R19-04's `crosses`; R19-18 draws R19-04's table; R19-19 reads
R19-10's `DIGNITY_WORDS`. Push once. **Group 3**, one message once group 2 is green: R19-20 to R19-22. R19-21 renders R19-20's
field; R19-22 uses R19-21's `FactCard` and R19-04's `shadowOf`. Push once; then the orchestrator's steps and the gate. **If R19
must shrink:** first R19-22 (Mercury's shadow card), then R19-17 (Ask), then R19-08 (the rough-time line), each to the next round.
The vocabulary, the rule, the checks, the brief, House by House, the chapters, B-73 and MB-234 never move.

---

## Group 1 — the words before the rule, the engine, the R line, MB-234 and MB-235

### R19-01 — Vocabulary: a crisp line first, plain shorts, the empty house and going backwards (USER-FACING)
Tier: opus — the brain: every product's system prompt and every planet card read these words
Objective: each body, sign, house and structure entry opens with the one line you'd repeat to a friend; the card shorts are
rewritten plainly; Saturn, Jupiter and Chiron said plainly; `empty_house` per ADR-373; `retrograde` per reading 5.
Files: `api/src/prompts/vocabulary.ts`; `scripts/src/generate-vocabulary.ts` (its prompt on the new rule; `crisp` kept as written).
Refs: explain-like-a-friend §0, §0b, §3, §5, §10, §11; ADR-370, 371, 373, 376, 379, 381; review-05-10 §10; the study's crisp lines
and framings (patterns only); readings 1, 3 to 6; pinned `VocabEntry`; the caller rule.
Done when:
- `VocabEntry` as pinned for BODY, SIGN, HOUSE and STRUCTURE, `renderVocabularyBlock` printing each crisp line before its full;
  every crisp line and short ours, at most 15 words, no dignity or sect word (a dignity's short reaches readers as `underPressure`).
- Every reader of a short grepped and named (`brief.ts`, `synastryInterpretation.ts`); the report lists every short before and
  after (USER-FACING: the planet cards).
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

### R19-04 — The engine: comfort, shadow dates, and the houses a contact crosses (INTERNAL)
Tier: opus — the brain: the engine package, read by the brief, Timeline and the page
Objective: the seven planets' home and least-at-ease signs with one line why; the shadow of a Mercury, Venus or Mars retrograde;
each contact carries the whole-sign houses its moving planet passes through (ADR-378, 384).
Files: new `packages/engine/src/comfort.ts`, new `packages/engine/src/shadow.ts`; `packages/engine/src/doctrine.ts`,
`packages/engine/src/index.ts`.
Refs: explain-like-a-friend §0b, §0c, §8, §9; ADR-208, 373, 378, 380, 384; readings 3, 8; pinned `COMFORT`, `comfortOf`,
`shadowOf`, `ContactEvent.crosses`; Round start 3(a), 4; the caller rule.
Done when:
- `COMFORT` agrees with `DOMICILE` and its opposite signs in `api/src/lib/traditional.ts` for all seven (a one-off comparison in
  the report); its why lines from the artifact's table.
- `shadowOf` within a day of Round start 3(a)'s JPL dates, printed in the report; `crosses` is `[]` without a horizon; every event
  key unchanged (the dry lab's Timeline keys equal r06's); every literal `ContactEvent` outside the engine grepped and named.
- Typecheck and the critical tier (the engine's included) green.

### R19-05 — The R line made true, and Did you know without a birth time (USER-FACING) — B-73, B-76
Tier: sonnet — three web files; the truth the words must meet and the facts' rule are pinned here
Objective: the R line and the retrograde fact say only what is true of every planet (ADR-386); a chart with no birth time is shown
only the facts that fit it, drawn on the reader's own chart.
Files: `web/src/components/timeline/RetrogradeLine.tsx`; `web/src/lib/facts.ts`; `web/src/components/loading/DidYouKnow.tsx`.
Refs: QA-07 #2, #4, #5; B-73, B-76, B-77 (closed, ADR-386); review-05-10 §6, §9; reading 5; Round start 3(a); `/ux-copy`; R17-08's
lesson.
Done when:
- `RETROGRADE_LINE` and the retrograde fact meet reading 5; their users grepped and named (HouseDeck, HouseCard, TimelineSetup,
  NowAhead, YourWeek, the site's timeline Hero), none edited; the report lists both before and after.
- Without angles, DidYouKnow shows only the facts whose drawing needs no horizon (retrograde, Saturn's return), drawn on the
  reader's chart; Mira's only where no chart is given; checked on marie-curie-unknown computed at run time.
- Typecheck and the critical tier green; `/web-taste` at 390 px.

### R19-06 — MB-234 (private) (INTERNAL)
Tier: opus — security on the QA pair's staging accounts; the brief lives in Notion only
Objective: MB-234 fixed as its row says, the hardening its row names included; the orchestrator passes the row in the brief.
Files: as its row names, passed in the brief; none is in another R19 card's list (the orchestrator checks before dispatch).
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

---

## Group 2 — the rule, its checks, the brief, every product's prompts, the primer, the lab

### R19-09 — The style contract: name it, say it plain, show it in a day (USER-FACING)
Tier: opus — the brain: the shared system prompt of all four products
Objective: rules 1, 3, 8 and 11 and the doctrine as readings 1 and 3 to 7 say: a name with its plain meaning and a moment, inside a
sentence; life first; possibilities; comfort explained; no dignity or sect word; the card's "some astrologers"; the empty-house
and Chiron lines (ADR-369 to 373, 375, 379).
Files: `api/src/prompts/system.ts`.
Refs: explain-like-a-friend §0b, §1 to §3, §8, §9, §11, acceptance 1 to 4; MASTERFILE R-5.1, R-5.2; ADR-104, 297 to 312, 369 to
381; readings 1, 3 to 7; the caller rule.
Done when:
- Sentence limits and evidence in claims unchanged; `SHARED_SYSTEM` byte-identical across sections; "Never explain the method"
  gone, and talk about astrology with no reader in it still out.
- Every importer of `STYLE_CONTRACT`, `SIMPLE_WORDS` and `DOCTRINE` grepped and named (the pair, Timeline and Ask systems,
  `generate-vocabulary.ts`).
- The dry lab renders every product's system prompt; the report shows rules 1, 3, 8, 11 and the empty-house line before and after;
  typecheck and the critical tier green.

### R19-10 — The plain-words checks, and the pair's name checks relaxed (INTERNAL)
Tier: opus — the brain's checks: what logs and what blocks, in four products
Objective: chk-49 to 52 warn (ADR-385); the RULES map moves chk-21a and chk-24 to warn; the annex rows say why.
Files: `api/src/prompts/checks.ts`; `docs/annex/pair-reliability-checks.md`.
Refs: explain-like-a-friend §2, §3, §6, §9, §10, acceptance 2, 3; ADR-81, 381, 385; R-4.3; readings 7, 10; pinned `explainChecks`,
`DIGNITY_WORDS`; R15-04 and R16-21's lessons.
Done when:
- `explainChecks` as pinned: chk-49 on whole words (`fall` only as "in fall" or "its fall", `angular` only before "house" or
  "planet", never inside "section" or "insect"); chk-50 on runs of six words from `SCENES` or `PASSAGES`; chk-51 on a card with
  none of reading 7's tradition phrases; anywhere in a sentence, on parsed strings; a message names a rule, a word or a scene id.
- RULES: chk-21a, chk-24 and chk-49 to 52 warn; annex rows 20, 21 and 24 reworded, rows 49 to 52 added.
- Run once over R19-02's scenes and R19-03's passages: nothing fires, or each hit goes back to its card as a fix; typecheck and
  the critical tier green.

### R19-11 — The brief: comfort, empty houses, planets going backwards, Chiron, scenes (USER-FACING)
Tier: opus — the brain: the per-chart facts every section reads
Objective: each placement carries its plain comfort words; each empty house reads through its planet in charge; each planet going
backwards at birth carries how common it is; Chiron its house; each section its own few scenes; B-67's tie in a fixed order.
Files: `api/src/prompts/brief.ts`.
Refs: explain-like-a-friend §0b, §10, §11, acceptance 3, 4; review-05-10 §10 (the shares); ADR-373, 379, 381; B-67; readings 2 to
6; pinned brief lines and `ChartBrief.scenes`; the caller rule.
Done when:
- On audrey-hepburn computed at run time, printed in the report: the empty 8th through Mercury at home in Gemini in her 5th, the
  empty 9th through Venus least at ease in Aries in her 3rd, Venus, Saturn and Neptune going backwards with their shares, Chiron in
  her 4th; a blind brief names no house.
- `scenes` from `pickScenes` as pinned; every reader of `ChartBrief` grepped and named (`horizonPass.ts`, the lab).
- The dry lab renders every prompt; a critical test the new lines move (`aiInterpretation.test.ts`, `pairBrief.test.ts`) is
  named for its owner (R19-14, R19-15), never edited here; typecheck and the critical tier green at the group's end.

### R19-12 — House by House: planets going backwards, Chiron, rulers, quiet houses (USER-FACING)
Tier: opus — the brain: the twelve house readings
Objective: each reading follows the new rule and says what the reader does, never how they "come across"; each planet going
backwards at birth is named and explained once on its house's card; Chiron gets one sentence in its house even when planets share
it; an empty house reads through its planet in charge; HOUSES ALREADY COVERED goes; chk-52 fires here.
Files: `api/src/prompts/sections/houses.ts`.
Refs: explain-like-a-friend §0b, §1, §11, acceptance 3, 4; review-05-10 §7 (houses prompt, rulers), §10; ADR-373, 379, 385;
readings 1, 4 to 6; R19-11's lines.
Done when:
- A reading that explains a planet going backwards or Chiron may run 10 words over its band, the section's band moving to match
  (named in the report); chk-14 and chk-15 unchanged; chk-52 as pinned.
- The dry lab renders audrey-hepburn's House by House prompt, shown in the report before and after; typecheck and the critical
  tier green.

### R19-13 — The chapters under the new rule (USER-FACING)
Tier: opus — the brain: nine chapter prompts, the foundation and the triad
Objective: every chapter's instructions trade "No planet, sign, or house names in the prose" for the new rule: life first, at most
one named placement a paragraph with its plain meaning and a moment, possibilities, actions to end; a planet going backwards shapes
its home chapter (review-05-10 §10); no fixed opener.
Files: in `api/src/prompts/sections/`: `overview.ts`, `mind.ts`, `career.ts`, `money.ts`, `relationships.ts`, `family.ts`,
`superpowers.ts`, `discoveries.ts`, `focus.ts`, `foundation.ts`, `triad.ts`.
Refs: explain-like-a-friend §0b, §1 to §3, §8, acceptance 1; review-05-10 §10; MASTERFILE R-5.1, R-5.2; ADR-369 to 371, 375;
readings 1, 3.
Done when:
- No instruction forbids naming a placement or tells the writer to hide the method; sect and dignity stay reasoning, never words
  (reading 3); word targets and schemas unchanged.
- The dry lab renders every natal prompt; the report shows audrey-hepburn's Family & Roots and Mind prompts before and after;
  typecheck and the critical tier green.

### R19-14 — The pipeline: passages, scenes, the checks wired, v12 (USER-FACING)
Tier: opus — the brain: how every natal and pair call is put together and judged
Objective: each chapter's user prompt carries two model passages and its own scenes; `explainChecks` runs on every natal and pair
call; the self-check asks the new questions; a card never counts as prose; `PROMPT_VERSION` v12.
Files: `api/src/lib/aiInterpretation.ts` (+ `aiInterpretation.test.ts`); `api/src/prompts/evidence.ts`.
Refs: explain-like-a-friend §4, §10, acceptance 6; ADR-81, 383, 385; R-4.3, R-7.3; readings 1, 7, 11, 12; pinned `examplesFor`,
`renderExamples`, `ChartBrief.scenes`, `explainChecks`; the caller rule.
Done when:
- `assembleUser` adds passages and scenes after the brief for the ten chapters' sections, never the foundation or the triad;
  `countWords` and `proseOf` skip `didYouKnow` as they skip `claims`; `SELF_CHECK` per reading 1; `explainChecks` beside
  `registerChecks` and `plainChecks`.
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
- p7 pinned in `pairInterpretation.test.ts` (critical) and `pair-prompts.test.ts`; the stored "p6" rows in `ask.edges.test.ts` and
  `home.test.ts` grepped and named (kept unless a reader compares versions).
- The dry lab with curie-winfrey and a parent_child lens renders every pair section, schemas ok; the report shows the partners
  links prompt before and after; `pairBrief.test.ts` (critical) green.

### R19-16 — Timeline: read by the house a planet moves through, in possibilities, t2 (USER-FACING)
Tier: opus — the brain: every Timeline reading, each written again once at t2
Objective: a reading names the houses its moving planet passes through beside the natal point's house (ADR-384); possibilities,
never forecasts; it ends on "a good time to…"; the doctrine's "Rules 3, 6 and 8 bend here" line follows the new contract; dignity
words warn; `TIMELINE_PROMPT_VERSION` t2.
Files: `api/src/prompts/timeline/` (`doctrine.ts`, `reading.ts`, `checks.ts`, `index.ts`).
Refs: explain-like-a-friend §6, §8; ADR-206, 208, 375, 378, 384; review-05-10 §5 (stale readings); readings 1, 8, 9, 11; pinned
`ContactEvent.crosses`, `explainChecks`; R16-24's lesson.
Done when:
- `eventFacts` adds the crossed houses (none on a blind chart); annex row 46's pass unchanged; `checkReading` runs `explainChecks`;
  `ReadingSchema` unchanged, so a t1 reading parses and shows while its rewrite waits (R18-25).
- t2; every reader of `TIMELINE_PROMPT_VERSION` grepped and named (`timelineReadings.ts`'s basis, `timelineSetup.test.ts`).
- The Timeline dry render shows audrey-hepburn's contact prompts with their crossed houses, before and after in the report;
  typecheck and the critical tier green.

### R19-17 — Ask under the same rule, with an everyday example (USER-FACING)
Tier: opus — the brain: Ask's answers
Objective: `ASK_RULES` agree with the new contract (its own lift of rules 3 and 8 goes where the contract now says it); each idea
Ask offers carries one everyday example framed as an option (review-05-10 §8); it may explain a planet going backwards; no orders;
the 150-word cap stays; dignity words warn; `ASK_PROMPT_VERSION` a2. The fixed lines in `ask/lines.ts` stay as built (MB-215).
Files: `api/src/prompts/ask/index.ts`, `api/src/prompts/ask/answer.ts`.
Refs: explain-like-a-friend §6, §8; review-05-10 §8, §10; ADR-369, 375, 385; readings 1, 5, 11.
Done when: `ASK_RULES` per reading 1 with the example line; `checkAskAnswer` runs `explainChecks`; a2, every reader of
`ASK_PROMPT_VERSION` grepped and named; the Ask dry render covers every reader, injection clean, one prompt before and after in the
report; `ask.edges.test.ts` (critical) green.

### R19-18 — Four things to know, before House by House (USER-FACING)
Tier: sonnet — one component, its words and table from the artifact
Objective: a short primer heads House by House before the first card: houses start at the rising sign; each house is one part of
life; every house has a planet in charge, even an empty one; each planet's home and least-at-ease signs in the seven-planet table.
Files: new `web/src/components/report/HousePrimer.tsx`; `web/src/components/report/HouseDeck.tsx`.
Refs: explain-like-a-friend §0c; ADR-380; Round start 4 (the primer); pinned `COMFORT`; `/ux-copy`, `/web-taste`; R18-09's lesson.
Done when:
- The four ideas and the table in the artifact's words; idea 1 names the reader's own rising sign; the table reads `COMFORT`, never
  a copy; on the report and /sample (both draw `HouseDeck`); nothing where House by House doesn't show.
- No sideways scroll at 390 px; `/web-taste` at 390, 768 and 1440 px on a real browser shot; checked on audrey-hepburn's chart
  computed at run time; typecheck and the critical tier green.

### R19-19 — The lab: plain-words measures, and METHOD_TALK pruned (INTERNAL)
Tier: sonnet — two lab files and the CLI's print, each measure pinned here
Objective: the Release stops refusing the words the new rule asks for; the lab measures what the acceptance reads, as warnings;
the Timeline dry render holds a retrograde and an eclipse (B-03's dry-lab part).
Files: `api/src/lib/labRules.ts`; `api/src/lib/labDry.ts`; `scripts/src/report-lab.ts`.
Refs: explain-like-a-friend §7, acceptance 1, 2, 5; ADR-385; B-03; pinned `DIGNITY_WORDS`; R14-01's lesson; the caller rule.
Done when:
- `METHOD_TALK` drops "in its own sign" and "in your chart, " only; `SectionMeasure` gains warnings, never faults: the most named
  placements in a paragraph, dignity words, the longest sentence, a Flesch–Kincaid grade (vowel-group syllables, written here),
  openers repeated in more than two paragraphs of a report; every reader of `faultsOf` and `measureSection` grepped and named.
- `pnpm report:lab --compare --base r06` prints them for the stored runs (the before numbers, in the report); the dry render holds a
  retrograde and an eclipse reading per fixture whose six months have one; typecheck and the critical tier green.

---

## Group 3 — Did you know in the chapters and in Timeline

### R19-20 — Did you know in the chapters: the writer and the contract (USER-FACING)
Tier: opus — the brain and the contract: a new field on seven chapters, read by every report after
Objective: seven chapters may carry one Did you know card on the topic ADR-383 names, written by the writer as tradition, outside
the prose.
Files: in `api/src/prompts/sections/`: `overview.ts`, `mind.ts`, `career.ts`, `family.ts`, `superpowers.ts`, `discoveries.ts`,
`focus.ts`; new `api/src/prompts/didYouKnow.ts`; `api/src/lib/testModel.ts`; `packages/api-spec/openapi.yaml` and codegen.
Refs: explain-like-a-friend §9; review-05-10 §9; ADR-317, 377, 383; reading 7; pinned `didYouKnow`, `topicFor`; Round start 3(b);
the caller rule.
Done when:
- The seven schemas gain `didYouKnow` as pinned; `extraContext` gives the topic from `topicFor` or asks for null; Overview's and
  Discoveries' conditions per ADR-383.
- The contract gains `DidYouKnow` on those seven sections, optional and nullable; codegen twice with no diff; the canned replies
  carry one card and the rest null; the buyer walk passes.
- The dry lab renders the seven prompts on audrey-hepburn and marie-curie-unknown (no rising-sign card there); the report shows
  Family & Roots' before and after; the critical tier green.

### R19-21 — The Did you know card in the report, and v12 and p7 read (USER-FACING)
Tier: sonnet — one small card and its place, the look reused from R18's
Objective: a chapter's `didYouKnow` shows as a small card after its prose and before its actions; the web renders v12 and p7
reports.
Files: new `web/src/components/FactCard.tsx`; `web/src/components/ReportSections.tsx`; `web/src/pages/ReportPage.tsx`;
`web/src/types/chart.ts` (+ `chart.test.ts`).
Refs: explain-like-a-friend §9; review-05-10 §9 (the look); ADR-317, 377, 383; pinned `FactCard`, `didYouKnow`; `/ux-copy`,
`/web-taste`; R18-09's lesson; the caller rule.
Done when:
- "DID YOU KNOW" in small brass capitals, the title, the body; no bars, no drawing; nothing when the field is null or missing (every
  stored report, /sample).
- `RENDERABLE_PROMPT_VERSIONS` gains "v12" and the pair list "p7", pinned in `chart.test.ts` (critical); their readers grepped and
  named.
- At 390, 768 and 1440 px on a real browser shot with a canned v12 interpretation; typecheck and the critical tier green.

### R19-22 — Mercury's shadow, a Did you know in Timeline (USER-FACING)
Tier: sonnet — fixed words filled from the engine's dates, one card reused
Objective: a Mercury retrograde's reading sheet shows one card: the shadow's dates, the house Mercury goes back over, our own
picture, worded as tradition (ADR-383).
Files: new `web/src/lib/shadow-fact.ts`; `web/src/components/timeline/ReadingSheet.tsx`, `NowAhead.tsx`;
`web/src/pages/TimelineAppPage.tsx`.
Refs: explain-like-a-friend §9; ADR-378, 383, 384; review-05-10 §2 (a date with its year); pinned `shadowOf`, `shadowFact`,
`ReadingTarget`, `FactCard`; `/ux-copy`; R16-01's lessons.
Done when:
- `shadowFact` as pinned: null unless a Mercury retrograde; dates from `shadowOf` in the reader's zone, each with its year; the first
  house it goes back over by its word from `houses.ts`, none on a blind chart; passing the same petrol station three times, never
  her picture.
- `ReadingTarget` gains the event's `houses`, `start` and `end`; every builder of a target grepped and named (`NowAhead`, `Life`).
- Checked on audrey-hepburn's chart and the next Mercury retrograde, computed at run time, its dates in the report; `/web-taste` at
  390 px; typecheck and the critical tier green.

---

## After the builders: the orchestrator's steps, not cards
1. **After group 3, once:** gitleaks over `main...round/R19` with CI's pinned version and config. No `csp:write`: no new host.
2. **The study check** (ADR-381): every quoted fragment in `explain-voice-study.md` against the files R19 adds or changes under
   `api/src/prompts/` and the web's new words: no run of five words or more appears. A hit goes back to its card as a fix.
3. **The tester, once** (ADR-273: the own-report step's shape, the sign-in claim and the pair story change), its base the round's
   first commit: the two-You claim, the canned replies with a card and with nulls, the rough-time lines, B-76 on a chart with no
   birth time, `explainChecks` on a few hand-made strings; a bug it finds is a fix for that card's builder.
4. **The gate:** install, typecheck, both builds, the critical tier, the buyer walk on a scratch Postgres, `check:shipped`,
   `check:copies`, `pnpm audit --prod`, codegen twice with no diff, smoke, the probe and the site checks on the preview. No
   `db:bootstrap` run is due (no schema change).
5. **The dry lab** after each group (`pnpm report:lab --dry --base r06`, pairs included, with Timeline's and Ask's renders and the
   injection fixtures; free) and `--compare` against r06 after group 3 with R19-19's measures; the report gives each product's
   prompt size before and after.
6. **The sentinel** on `main...round/R19`, its eye on: MB-234 and MB-214, read from their rows; R19-07's claim (only the session's
   unclaimed rows, the account's own chart kept, counts only in the log); the checks' messages (a rule, a word or a scene id, never
   reader text); the passages, scenes and topics carrying no instruction-like text; `testModel.ts` reached only by tests and the walk.

## Staging confirmation, after the merge
1. The deploy's walk at 0 ¢: its verdict and pictures as after R18.
2. The Owner's look: a new Personal report on staging (about 4 ¢) read for the primer, an empty house, a planet going backwards,
   Chiron and a Did you know card; a Compatibility report; a Mercury retrograde's reading with its shadow card (his own readings are
   written again once at t2, about €0.07); one Ask; the R line on /timeline; /sample's primer.

## Production after the round
Nothing sells. The next Release runs the full lab (the brain changed in four products and the engine) with its pair, the gate, the
QA agent and the walk's seed; acceptance 1, 2, 3 and 5 are read there with R19-19's measures against r06 (grade 6 to 8, no
sentence over 25 words, at most one named placement a paragraph). A passing Release refreshes /sample (B-27, B-81). On production
the app stays behind the waitlist (ADR-167); t2 rewrites the admin's own Timeline readings there at his next open.

## Owner prerequisites (none blocks the build)
- **MB-227, one more host** (For the Owner 3): only if /qa is to sign up by hand.
- **MB-228** before the first live sale, with MB-114 and MB-115 as before.

## What it costs
| What | When | About |
|---|---|---|
| The dry lab, `--render` and `--compare` | in the round | 0 ¢ |
| A staging deploy's walk | every deploy | 0 ¢ |
| Timeline readings written again at t2 | at each subscriber's next open (staging: the admin and testers; production: the admin) | €0.07 a subscriber |
| The Owner's look: one Personal report on staging | when he looks | about 4 ¢ |
| A spot run on audrey-hepburn and two more (optional, the Lab page) | on demand | 2 to 10 ¢ |
| The next Release: the full lab with its pair, and the walk's seed | when the Owner says promote | about 20 ¢ + 10.5 ¢ |

Each report's prompts grow (crisp lines in the shared system prompt, two passages and a few scenes in each chapter's user prompt);
R19-14's report gives the size from the dry lab, and the next Release's lab gives the cost. Rewrites count against the daily spend
cap (ADR-199), the lab against `LAB_BUDGET_USD` (ADR-77).

## Risks
1. **Schema:** none (interpretations and readings are jsonb). **The contract** gains one optional field on seven sections (R19-20);
   codegen twice.
2. **No new dependency** (R14-01's lesson): the grade estimate is written by hand; the lockfile doesn't move.
3. **The brain:** prompts in all four products, the vocabulary, the brief, the checks and the engine (R19-01 to 04, 09 to 17, 20);
   v12, p7, t2 and a2 clear staging's prompt overrides in all four (R-7.3; `%:system` follows natal). The dry lab runs after each
   group; the next Release runs the full lab.
4. **Report content (USER-FACING):** every new Personal report (names in the prose with their plain meaning, the primer, Chiron,
   planets going backwards, empty houses, Did you know), the planet cards' shorts, every new Compatibility report, every Timeline
   reading (written again once at t2) and Ask's answers. Each card's done-when names its fixture run (the dry lab, `--compare`, or
   audrey-hepburn's chart computed at run time); acceptance 1 and 5 are read at the Release, since the round writes no prose.
5. **User-visible without locked words:** the R line's new words (R19-05, ADR-386), the Did you know topics (ADR-383) and the shadow
   card (R19-22), the rough-time lines (MB-235's own words), a claimed chart arriving as a person (R19-07). Each through
   `/ux-copy`; the close lists them before and after for the Owner.
6. **Quality:** a writer told it may name placements may name too many (acceptance 1); passages or scenes may be copied (chk-50
   warns); the rule may read stiff on a chart with no birth time. The Release's measures and the QA agent read all three; every warn
   lands on the Failures tab.
7. **Spend:** none in the session; t2's rewrites (€0.07 a subscriber) and a little more per report from longer prompts.
8. **Security:** MB-234 and MB-214 (private); R19-07's claim scope; her text in a public repo (ADR-381, After the builders 2). The
   sentinel's list is After the builders 6.
9. **Size:** 22 cards in three groups (8, 11, 3), 16 on Opus; the shrink path is in Parallel groups; three pushes plus fixes.
10. **Escalations:** none in R17 or R18, so no card or kind of card was escalated to Opus in two rounds running.
11. **Deferred from locked specs** (Scope deferred): sharing-and-circle whole; Review 05/10 §1's rest, §2 to §4, §7's pins and the
    person's date, §8's pairs and credits, §10's Timeline card line; explain-like-a-friend's film scene and Explained post (its own
    out of scope).

## Lessons this plan guards
- **Promoted, the caller rule** (`builder.md`): R19-01 (the shorts' readers), R19-04 (`ContactEvent` literals), R19-05
  (`RETROGRADE_LINE`'s six users), R19-08 (`StoryInput` in `BuildStory`), R19-09 (`STYLE_CONTRACT`, `SIMPLE_WORDS`, `DOCTRINE`),
  R19-11 (`ChartBrief`'s readers), R19-14 (`PROMPT_VERSION`, `countWords`, `proseOf`), R19-15 (p6's pins and stored "p6" rows),
  R19-16 and 17 (their versions' readers), R19-19 (`faultsOf`, `measureSection`), R19-20 (the generated types), R19-21
  (`RENDERABLE_*`), R19-22 (`ReadingTarget`'s builders).
- **Promoted, the log rule** (`builder.md`): R19-06, R19-07 (counts only), R19-10 (a check's message names a rule, a word or a scene
  id, never reader text).
- **Promoted, the pathspec and pkill rules:** every builder; group 2's eleven share one tree.
- **Applied:** builders commit as they go; the tester's range from the round's base; one push per group and per fix.
- R13 · R13-05 (a running round can't edit its own skill) → no card edits `.claude/`; B-60 stays in the backlog.
- R14 · R14-01 (a dependency's packages unnamed) → no dependency; R19-19's grade is written by hand.
- R15 · R15-04 (a pattern matched on raw JSON) → R19-10's checks read parsed strings only.
- R15 · R15-18, 19 (an address shown that was never given) → R19-07 moves only the session's unclaimed rows; the moved chart keeps
  its own name.
- R16 · R16-01, 03 (a spec promising what the engine can't meet) → Round start 3(a) checks the shadow against JPL before R19-22
  prints it.
- R16 · R16-01 (a range on a raw instant) → R19-22 prints the shadow's dates in the reader's zone from the instants it compares.
- R16 · R16-21 (a check that looked only at a start) → R19-10's checks look anywhere in a sentence.
- R16 · R16-24 (a kept row spinning for good) → R19-16 keeps `ReadingSchema`, so a t1 reading parses and shows while it waits.
- R17 · R17-05, 19 (a shape guessed by another card of the group) → every seam between cards is in Pinned shapes.
- R17 · R17-08, 18 (a shipped line stating what our checks refuse) → R19-10 runs the new checks over R19-02's scenes and R19-03's
  passages; the primer and the cards carry no dignity word and no forecast.
- R18 · R18-09 (artifact CSS collapsing a grid) → R19-18 and R19-21 take the artifact's words, not its CSS, each checked on a real
  browser shot.

**Lessons read through R18.** R18's close wrote `lessons.md` (28a5b89, 2026-10-07); `main` at c52f9e5 leaves it as it was, and no
line was added after R18's. This plan was written after R18 closed.

## Questions raised (Notion, 2026-10-08, sorted by R-12.3)
- **Decided by me** (Decisions, `Decided by: Claude`): ADR-383, Did you know in seven chapters (the topic for each, written by the
  writer outside the prose), Mercury's shadow card in fixed words, model passages in the Personal report only this round; ADR-384,
  Timeline reads by the houses a contact's planet crosses, with no new event kind, and ends on "a good time to…" (ADR-206 holds);
  ADR-385, chk-49 to 52 warn, the pair's chk-21a, 21b and 24 warn while chk-20 and 22 stay, METHOD_TALK drops two phrases and keeps
  its sect and dignity phrases as faults; ADR-386, the R line true for every planet, B-77 closed as designed.
- **Needs you (Mailbox):** no new row. MB-235 noted (items 1 and 2 are R19-07 and 08, provisional; item 3 as built); MB-232's
  default moved (no spec yet, so not R19; planned with the first round after it locks); MB-234 and MB-214 noted (private).
- **Backlog lines R19 does:** B-73, B-76, B-67 and B-03's dry-lab part. **Closed:** B-77 (ADR-386). **Kept open:** B-03's rest (a
  house check on a chart with no birth time, Ask's length, the Lab page's spot for readings); B-50 to 52, 57, 32, 33 and MB-212 for
  R20; B-74, 75, 78, 79 and 80 for R20; B-81 and B-27 with the next passing Release; B-70 (one pair compute change at a time);
  MB-202, 207 and 213 at launch.

## For the Owner (three asks, highest stakes first)
Approving this plan starts R19 at once (MASTERFILE §11.2). It sells nothing and spends nothing in the round.
1. **R19 is explain-like-a-friend; sharing waits one round.** R18's plan named sharing and the circle for R19. Recommendation: R19 as
   planned (22 cards: the vocabulary first, then the new rule in all four products, House by House's primer and Chiron, Did you
   know, the true R line, MB-234), and R20 sharing and the circle with QA-07's smaller fixes. If you'd rather have sharing first,
   this plan waits whole: its parts don't swap, because the vocabulary comes before any rule change (ADR-376).
2. **MB-235's three small calls** are built at their defaults and marked provisional. Recommendation: say "ok" on the row, and the
   close removes the marks. If silent: they ship as recommended and stay marked.
3. **One more host for /qa (MB-227):** `brunhild.challenges.cloudflare.com`, which the sign-up check loads from. Recommendation: add
   it beside the four in the environment's network settings. If silent: /qa reads those steps from the walk.

## Scope deferred
- **R20:** `sharing-and-circle` (ADR-329 to 342) whole; Review 05/10 §1's rest (the empty dashboard's bundle buttons through
  `/checkout` in the sandbox, Ask and Your week after an own report, the admin's new-visitor view, the Account preview with Cancel),
  §7's pins and "Report from <date>"; B-50, 51, 52, 57, 32, 33; MB-212; QA-07's B-74, 75, 78, 79, 80; MB-232's spec if locked.
- **The next brain pass:** Review 05/10 §2 (the card's face, a year on every date, Heavy · Mixed · Light), §3 (Your week as bars,
  `weekSentence`), §4 (Life's drag line, the Your cycles card), §8's pairs and credits, §10's Timeline card line; model passages
  for Compatibility, Timeline and Ask (ADR-383); B-03's rest; B-70; B-04, 16, 17, 18.
- **Later:** the four ideas as a scene in /method's "Reading the sky" film and an Explained post (explain-like-a-friend §0c, out of
  scope); report-loading-story §5 and §6; B-58.

## Close (the orchestrator)
The backlog lines above leave `docs/backlog.md` as done; a Decisions row `Decided by: Claude` for each choice the round took on a
rule; a Mailbox row lists the round's new words before and after (`docs/annex/R19-words.md`) for the Owner's look; *Waiting on
Alex* kept current, MB-235's seams out if he says ok. MASTERFILE: R-5.3 (scenes and model passages join the static grounding), §4's
engine list (`comfort.ts`, `shadow.ts`, a contact's `crosses`), R-4.3's annex rows 49 to 52. INDEX's code map: `scenes.ts`,
`examples.ts`, `didYouKnow.ts`, `comfort.ts`, `shadow.ts`, `HousePrimer`, `FactCard`, `shadow-fact.ts`; INDEX's specs:
explain-like-a-friend built but its film scene and post; review-05-10 §7's houses prompt and §10 built but the Timeline card line.
CLAUDE.md's focus: R19 shipped, R20 next. `lessons.md` takes each failure's cause. `/qa` on staging after the merge's deploy walk,
then the URL, the QA report, the walk's verdict and Staging confirmation's lines go to the Owner.
