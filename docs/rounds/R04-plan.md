# R04 plan — eleven chapters, generated house cards, the workbook, dawn, and a report that opens while it writes

Planned 2026-09-18 on `claude/focused-feynman-bc4lhs`. Scope is fixed by `docs/specs/locked/natal-report-pass-two.md` (locked 2026-09-18) and ADR-20 to ADR-28; it supersedes three lines of the natal-report-ui lock (accent, house-card copy source, chapter list). No QA reports exist. Mailbox rows above 2 rounds open after this plan's increment: MB-5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 30 (all to 3). None blocks this round; MB-31 (legal entity, blocking, 2) still gates selling anything. MB-38 is decided (ADR-28) and this round is its build half.

## Preconditions

1. `ec00c1e` (spec lock) is HEAD. `main` in this checkout is stale; `round/R04` branches from this branch. Every builder reads MASTERFILE §0 plus the sections its card names, and the artifact https://claude.ai/artifact/5Er5qfQVMn2DYkuyGGdPJs for the screen its card names: vanilla mock, read for geometry and copy, never ported literally.
2. The round touches the brain, the schema and `openapi.yaml`, so the gate carries the report lab on the five fixtures, `db:bootstrap`, and codegen (R-4.4, §11.2 step 4). The lab needs `DATABASE_URL` and `OPENAI_API_KEY`; it runs once after R04-17 merges and again only if a model lever fires.
3. Shapes pinned here are the contract between parallel cards. A builder who needs to change one stops and raises it (R-0.1).
4. Two engine defects block the `houses` section and are fixed in R04-01: `aiInterpretation.ts:107` appends `CLAIMS_CONTRACT` to every non-foundation section, and `:255-258` runs `storeClaims` on every result; both must skip a section whose schema has no `claims`.

## Pinned shapes

- **Registry order**: `overview, triad, houses, mind, career, money, relationships, family, superpowers, discoveries, path, focus` (twelve; `ALL_SECTIONS.length === 13`). `PROMPT_VERSION = "v5"`.
- **Bands** (min–max): overview 400–500 · triad 250–320 · houses 480–780 · mind 250–320 · career 350–450 · money 250–320 · relationships 350–450 · family 250–320 · superpowers 600–700 · discoveries 400–500 · path 250–300 · focus 350–450. Sums 4,180–5,410; `prompts.test.ts` asserts the exact sums and that they sit inside 3,500–5,500; `maxTokens` per section satisfies the existing 1.5× rule.
- **`houses`**: `{ houses: [{ house: int, reading: string }] }` exactly twelve in order, no claims; `extraContext` lists the houses carrying triad text (`1`, Sun's house, Moon's house, deduped) with "do not repeat it there"; `validate` rejects a reading naming a body (BODY_LABELS) not placed in that house and not its ruler, naming house and word in the message.
- **`path`**: `{ fallBackOn, headedToward, tenderSpot, claims }`, 250–300 words.
- **`career.careerPaths`, `relationships.connectBestWith`**: `z.array(z.object({ item: z.string(), reason: z.string() })).min(3).max(4)`.
- **`focus`**: bullets `.min(3).max(3)`.
- **`angle` evidence**: `{ kind: "angle", angle: "ascendant" | "midheaven", sign }`; valid when `chart.angles[angle].sign` matches; label `Ascendant · 12.3° Gemini` (the one label with a middle dot, by spec).
- **`ReportStatus`** gains `chartReady: boolean` (profile has chartData), `sections: Record<id, "pending" | "done">` derived from which keys exist in the stored interpretation, and `interpretation` (nullable, the partial). `ReportInterpretation.required` becomes `[meta]` so one schema serves both routes. The first partial write carries `meta` (without `wordCount`/`usage`) plus `personalPlanets`, `aspectMeanings`, `angleMeanings`; each section is written as it lands by rewriting the jsonb; a section that fails after three attempts fails the report as today.
- **Workbook**: `reports.workbook` jsonb, default `{}`. `PATCH /reports/{id}/workbook` body `{ [itemKey]: string | null }` (ISO date or delete), shallow merge, returns the merged object, `viewerOwns` → 404. itemKey is section id plus dot path plus index: `career.actions.0`, `mind.practice.0`, `superpowers.growingEdge.actions.2`, `focus.leanInto.bullets.1`.
- **Accents**: `chapterAccent(i)` by chapter index: 01 `#5C6BC0`, 02 `#3F8FD2`, 03 `#9575CD`, 04 `#3FA796`, 05 `#D9668A`, 06 `#B565A7`, 07–11 repeat 01–05. Second parameter optional and ignored until R04-17 drops it.
- **Chapters**: 01 Overview · 02 Natal Chart Deepdive · 03 Mind · 04 Career · 05 Money · 06 Relationships · 07 Family · 08 Superpowers · 09 Paradoxes · 10 Your Path · 11 What to Focus On. House → chapter footer: 1, 3 → Mind; 2 → Money; 4 → Family; 5, 11 → Your Path; 7 → Relationships; 10 → Career; others none.
- **CSS**: `index.css` has one owner (R04-03). Class shells it lands: `.rp-two` (two columns ≥ 960 px, 64 ch prose, 19 rem sticky aside; the name `.rp-rail` is the chapter nav), `.rp-explorer` with `--explorer-h`, `.rp-kicker` without `text-transform`, `.rp-dawn` driven by `--p`, `.rp-pull` upright, `.ev .k.angle` brass, print rules. Components use Tailwind for the rest.
- **Hint key**: `localStorage["sd.explorer.hint"] = "1"`.

## Goals

1. **The chart explorer reads from the report.** Twelve generated house readings, angles as occupants, triad text on the cards, no `HouseGrid`. Acceptance 1, 2, 4, 5, 6. ADR-20, 21, 27.
2. **The Ascendant is evidence and the Deepdive is a chapter.** Sixth evidence kind, rising claims cite the sign, balance rail with the modality named. Acceptance 7, 8. ADR-22.
3. **Beside prose, inside a card, and it remembers.** Two-column prose chapters, one checklist, the workbook on the report, career paths and who you connect with, "A way through". Acceptance 9, 10. ADR-24. Closes MB-38's build half with the lab run.
4. **The report is one picture.** Fixed accents, the hero with east on the left and a Sun that glows, dawn in the corner, Your Path with the nodal axis, the two removals. Acceptance 11, 12, 13, 15. ADR-23, 26.
5. **It opens while it writes.** Chart stored → report open within three seconds, chapters streaming. Acceptance 14. ADR-25.

## Task cards

### R04-01 Brain contract: two new sections, the registry, the version — USER-FACING · Opus
Objective: register `houses` and `path`, write both prompts in full, and make the engine tolerate a claimless section.
Files: `api/src/prompts/index.ts`, new `api/src/prompts/sections/houses.ts` and `path.ts`, `api/src/lib/aiInterpretation.ts` (type, sections object, `PROMPT_VERSION`, the two guards in Preconditions 4), `api/src/prompts/prompts.test.ts`.
Refs: spec "House readings, generated", "Your Path", "Word range"; MASTERFILE §4, §5 (R-5.1 to R-5.5), R-4.3, R-4.4; ADR-20, 21, 28; Pinned shapes.
Prompt content: houses per spec lines 40–45 (planets first and their combination, at most one sentence for the sharpest aspect, points-or-angle houses name them and read through the ruler, quiet house through the ruler's sign and house, ends "Behaviour check:", may name planets, names a sign only for a quiet house). Path: South Node as what to fall back on, North Node as the direction, Chiron as the tender spot; no fate, karma or "wounded healer"; nodes as one axis; Chiron mean-elements limit stays out of the prose.
Constraints: bands from the table for these two only; the other ten move in R04-06 and R04-07. `prompts.test.ts` asserts the twelve-id order, count 13, exact sums inside 3,500–5,500, and that `houses` has no claims and every other reader-facing section does.
Done when: typecheck, `build:api`, api unit tests pass; `previewSectionPrompt("natal:houses", marieCurie)` shows the covered-houses line; the validator rejects a marie-curie reading naming Mars in the 1st house and accepts one naming Saturn there (its ruler).
Sequencing: wave 0, parallel with R04-02 and R04-03.

### R04-02 API contract: openapi, codegen, web types — INTERNAL · Sonnet
Objective: land every contract change of the round in one commit so no other card edits the spec or the generated packages.
Files: `packages/api-spec/openapi.yaml`, generated `packages/api-client-react/src/generated/*` and `packages/api-zod/src/generated/*` (by codegen only), `web/src/types/chart.ts`.
Refs: spec "House readings", "Your Path", "The rail, the workbook", "The Ascendant becomes citable", "While it writes"; Pinned shapes; CLAUDE.md "openapi.yaml is the contract".
Changes: `ReportInterpretation` gains `houses`, `path`, `career.careerPaths`, `relationships.connectBestWith`, `required: [meta]`; `EvidenceRef.kind` gains `angle`; `ReportStatus` gains `chartReady`, `sections`, `interpretation`; new `PATCH /reports/{id}/workbook` (`WorkbookPatch`, `maxProperties: 200`, key pattern) and `Report.workbook`. `chart.ts` mirrors all of it: `HousesSection`, `PathSection`, `ListedItem`, the `angle` kind, `Interpretation` with optional sections, `workbook`. Rename `isV3Interpretation` to `isCurrentInterpretation` requiring `meta.promptVersion === "v5"` (provisional MB-45); keep the old name exported as an alias until R04-17.
Done when: `pnpm --filter @workspace/api-spec run codegen` is clean and committed; typecheck and both builds pass; `useUpdateReportWorkbook` (or the orval name) exists in the generated client.
Sequencing: wave 0, parallel with R04-01 and R04-03. R04-04 waits for it.

### R04-03 Web shared: accents, the Sun asset, the stylesheet shells — USER-FACING · Sonnet
Objective: the values every UI card reads, landed once.
Files: `web/src/lib/chapter-accent.ts`, new `web/src/lib/chapter-accent.test.ts`, `web/src/lib/planet-renders.ts`, new `web/src/assets/planets/sun-512.webp` (+ README line), `web/src/index.css`, `web/vitest.config.ts`.
Refs: spec "One accent per chapter", "Hero" (asset), acceptance 11, 13; ADR-23; MB-13 (90 px rule); Pinned shapes (CSS, accents); provisional MB-47 (test include).
Changes: `chapterAccent(i)` fixed table, `// MB-40 provisional` removed, `ELEMENT_HEX` kept for the balance bars; `SUN_HERO` export at 512 px with its own cap so `MAX_RENDER_PX` stays 90 for the wheel; the asset is the true-alpha export per the Owner's answer (default: the keyed 512 px derivation in the session scratchpad, tagged `// MB-13 provisional`); vitest `include: ["src/**/*.test.ts"]`, still node environment, no jsdom.
Done when: typecheck and `build:web` pass; `web` tests run the accent test (eleven chapters, no two adjacent equal, chart-independent); `git grep -n "MB-40"` returns nothing; the preview shows no visible change yet beyond kicker casing.
Sequencing: wave 0, parallel with R04-01 and R04-02.

### R04-04 Checklist and the workbook client — USER-FACING · Sonnet
Objective: the one checklist component and the store behind it, so R04-13 and R04-14 share them.
Files: new `web/src/components/report/Checklist.tsx`, new `web/src/lib/workbook.ts`.
Refs: spec "The rail, the workbook and the registers" (labels, "saved · n of m"); ADR-24; acceptance 9, 10; Pinned shapes (itemKey, PATCH).
Behaviour: `Checklist({ heading, items: { key, action, why }[] })` renders a heading from the four labels, tick controls with accessible names, the `why` after the action; ticks read from and write to a `WorkbookProvider` (report id, initial `workbook`, optimistic `PATCH` via the generated hook, rollback on error, `count()` for "saved · n of m"). Anonymous owners work through the session cookie like every other route.
Constraints: no heading text other than the four labels; never folded; no localStorage.
Done when: typecheck and `build:web` pass; a pure test on the store's merge and key rules runs under `web` tests; rendered in isolation against `marie-curie.reference.json` items the ticks persist across a remount with a mocked hook.
Sequencing: wave 0b, after R04-02's codegen; may overlap R04-01 and R04-03.

### R04-05 The Ascendant becomes citable — USER-FACING · Sonnet
Objective: the sixth evidence kind end to end in the brain, and the triad's rising part citing it.
Files: `api/src/prompts/evidence.ts`, `api/src/prompts/sections/triad.ts`, new `api/src/prompts/evidence.test.ts`.
Refs: spec "The Ascendant becomes citable"; ADR-22; acceptance 8; Pinned shapes (`angle`).
Changes: `EvidenceRefSchema` member, `validateClaims` case, `labelEvidence` case, `CLAIMS_CONTRACT` sentence listing the sixth shape; `triad.ts:22` rising rule becomes "the rising sign first, then what the chart ruler's condition adds", band 250–320.
Done when: api tests pass; the new test verifies an `angle` claim on marie-curie (Capricorn ascendant) and rejects one naming Aquarius with a message naming the sign; the label reads `Ascendant · 12.1° Capricorn` from the fixture's degree.
Parallel with R04-06, R04-07, R04-08, R04-09 and the UI cards.

### R04-06 Deepdive prompts: temperament names the pair, decision reads the modality — USER-FACING · Opus
Objective: `overview.temperament` names the dominant element and modality in plain words, cited; `mind.howYouDecide` reads the modality.
Files: `api/src/prompts/brief.ts` (DISTRIBUTION gains `Dominant modality`), `api/src/prompts/sections/overview.ts`, `api/src/prompts/sections/mind.ts`.
Refs: spec "Natal Chart Deepdive and Overview"; MASTERFILE §5; acceptance 7; bands table (overview 400–500, mind 250–320).
Constraints: element and modality words are not planet, sign or house names, so rule 8 stands; the citation is to the placements that carry the modality (placement claims), never a new kind. `mind.practice` stays a string.
Done when: api tests pass, including the brief test extended with `Dominant modality`; the preview prompt for overview carries the sentence about naming the pair.
Parallel with R04-05, R04-07, R04-08, R04-09 and the UI cards.

### R04-07 Registers and bands — USER-FACING · Opus
Objective: the two new lists, the focus trim, the why-clause rule, and the widened bands on the sections no other card touches.
Files: `api/src/prompts/sections/career.ts`, `relationships.ts`, `focus.ts`, `money.ts`, `family.ts`, `superpowers.ts`, `discoveries.ts`, `api/src/prompts/system.ts`.
Refs: spec "The rail, the workbook and the registers", "The closing" (trim); ADR-24, 28; MB-38; R-5.1, R-5.2; Pinned shapes (lists, bands).
Changes: `careerPaths` ("Career paths") and `connectBestWith` ("You connect best with") 3–4 items, item then a concrete reason, tendency never promise, no claims on them; focus bullets exactly three; STYLE_CONTRACT gains one rule: a `why` says what the action trains in a friend's words, contains a verb, no figurative pairings, no coined phrases; every band from the table with `maxTokens` raised where the 1.5× test demands.
Done when: api tests pass (sums now match the table with R04-01, R04-05, R04-06 merged; if this card lands first the sum test is red until they do, which the orchestrator accepts inside the wave); the career payload test covers `careerPaths`.
Parallel with R04-05, R04-06, R04-08, R04-09 and the UI cards.

### R04-08 The lab measures the new range — INTERNAL · Sonnet
Objective: the lab's totals, flags and claim rule match the round.
Files: `scripts/src/report-lab.ts`.
Refs: spec "Word range", acceptance 16; MB-38; R-4.4.
Changes: `REPORT_TOTAL = [3500, 5500]` with the MB-38 comment replaced by one line; the `only N claims` flag skips a section whose spec has no `claims`; new flag `why without a verb` on every `actions[].why` and `bullets[].why` (a small verb list plus `-s`/`-ing` forms is enough, false negatives beat false positives); per-house check that each of the twelve readings is 40–70 words and ends with a "Behaviour check:" sentence, flagged per house.
Done when: `pnpm report:lab --render` on the stored marie-curie run prints the new total band, no crash on the missing `houses` section, and the why flag fires on a hand-fed `why: "calm"`; typecheck passes.
Parallel with every wave-1 card.

### R04-09 Workbook column, PATCH route, and the report that writes itself down — INTERNAL · Opus
Objective: the persistence for goals 3 and 5.
Files: `packages/db/src/schema/reports.ts`, new `packages/db/scripts/migrate-add-report-workbook.ts`, `scripts/bootstrap-db.sh`, `api/src/routes/reports.ts`, `api/src/lib/aiInterpretation.ts` (generation flow only: an `onSection` option; the type and guards are R04-01's).
Refs: spec "Workbook", "While it writes"; ADR-24, 25; acceptance 9, 14; Pinned shapes (status, workbook); CLAUDE.md schema rule; precedent `migrate-add-profile-is-self.ts`.
Changes: `workbook` jsonb default `{}` plus the idempotent script wired as bootstrap step 3b; `PATCH /reports/:id/workbook` validated by the api-zod schema, `viewerOwns` → 404, shallow merge, returns merged; `GET /reports/:id/status` returns `chartReady`, `sections`, `interpretation`; `generateInterpretation(chart, name, { onSection })` calls back with the `meta`-first frame then each labelled section; both `generateReport` and the regenerate path write each frame to `interpretation` and keep `status: "interpreting"` until the last lands. `GET /reports/:id` returns the row whatever its status.
Done when: api tests pass with a route test for PATCH (owner 200 merges, non-owner 404, bad key 400); `pnpm run db:bootstrap` boots clean twice; a slowed run (env delay in `callSection`, test only) shows `sections` filling one by one in the status response.
Parallel with the brain and UI cards; the only wave-1 card on `reports.ts` and `aiInterpretation.ts`.

### R04-10 The chart explorer — USER-FACING · Opus
Objective: wheel plus card in normal flow, house 1 lit, front by default, one card height, occupants that include points and angles, the back led by the triad text.
Files: new `web/src/components/report/ChartExplorer.tsx`, `web/src/components/report/HouseCard.tsx`, new `web/src/lib/house-occupants.ts` (+ test). `HouseGrid.tsx` and `NatalWheel.tsx` untouched; R04-17 deletes the grid.
Refs: spec "The chart explorer", "House readings" (card side); ADR-21, 27; acceptance 1, 2, 4, 5; artifact "explorer" and "house backs"; Pinned shapes (hint key, footer map).
Behaviour: explorer lays out wheel and card itself (stack below 900 px, wheel first; the wheel's own `lg:` split is not used, pass `selectedHouse`/`onSelectHouse` and no `renderHouse`), card height from the wheel's rendered height via ResizeObserver into `--explorer-h`, back scrolls inside. Selecting shows the front; the card flips only on its own tap; `open` prop deleted. `house-occupants.ts` lists planets, nodes, Chiron, Ascendant (1st) and Midheaven (its whole-sign house) per house. Front: kicker "4th house · Virgo", renders for planets, drawn points for nodes and Chiron, open brass markers with degree for the angles, "Quiet house · Influenced by {ruler}, ruler of {sign}" only when nothing is placed. Back: `triad.rising` / `.sun` / `.moon` through `CitedText` where the house carries one, then `houses[n].reading`, footer "Read chapter · {title} →" from the map; a missing reading (still writing) shows the triad text alone and a quiet "writing" line.
Done when: typecheck, `build:web`, `web` tests pass (occupants test on the marie-curie degrees pinned in `wheel-geometry.test.ts`); rendered against `marie-curie.reference.json` plus a hand-built `houses` payload, no card reads "No planet sits here" and the 1st house front shows the Ascendant marker.
Parallel with the other wave-1 cards.

### R04-11 The angle in the glossary and on the evidence card — USER-FACING · Haiku
Objective: an `angle` reference reads as plain English on the evidence card.
Files: `web/src/lib/evidence-glossary.ts`, `web/src/components/report/EvidenceCard.tsx`.
Refs: spec "The Ascendant becomes citable"; ADR-18, 22; acceptance 8.
Changes: `glossFor` handles `angle` with one general sentence per angle (what the Ascendant and Midheaven are, never this reader); the kind chip reads "angle" and takes the `.k.angle` class R04-03 landed.
Done when: typecheck passes; `glossFor({ kind: "angle", angle: "ascendant", sign: "gemini" })` returns a non-empty sentence that names neither the reader nor a behaviour.
Parallel with the other wave-1 cards.

### R04-12 Hero: east on the left, labels beside bodies, the Sun that glows — USER-FACING · Opus
Objective: the plate per spec "Hero" with a pure, tested label solver.
Files: `web/src/components/report/ReportHero.tsx`, new `web/src/components/report/hero-layout.ts` and `hero-layout.test.ts`.
Refs: spec "Hero", acceptance 13; ADR-22, 27 (conjunction lane); MASTERFILE §9 "The picture is the chart"; artifact "three heroes".
Behaviour: labels "EAST · RISING" + "drawn facing south, so east is on your left", "WEST · SETTING" + the Descendant degree from `chartData.angles.descendant`; spokes and leader lines deleted, the dotted horizon is the only line; Sun from `SUN_HERO` at about 120 px, Moon unchanged; glow one radial gradient (four stops, transparent at ~1.6 Sun diameters) as a div on the plate's sky layer under the transparent bar, fading with the plate; name ladder 64/48/40 px on a halo ellipse gradient; `hero-layout.ts` places each label beside its body away from the centre, Sun first, sliding in 22 px steps until clear of labels, bodies, the name box and the horizon labels; within 12° the Sun steps 118 px outside the ring on its spoke.
Done when: typecheck, `build:web`, `web` tests pass; the test pins degrees for marie-curie (from `wheel-geometry.test.ts`) and for 1999-08-11 12:10 London computed once with `calculateNatalChart` via `pnpm tsx` (command in the test comment, no fixture added), asserting no overlap and the outside lane; the preview shows the glow uncut under the bar at 400, 768 and 1440 px.
Parallel with the other wave-1 cards.

### R04-13 Beside prose, inside a card — USER-FACING · Opus
Objective: the chapter blocks follow ADR-24 with the shared checklist, and the closing block moves out of this file.
Files: `web/src/components/ReportSections.tsx`, `web/src/components/report/Chapter.tsx` (one optional `aside` prop), new `web/src/components/report/ProseRail.tsx`.
Refs: spec "The rail, the workbook and the registers"; ADR-24; acceptance 10; artifact "Career with the rail", "Superpowers box", "paradox card".
Changes: Mind, Career, Money, Relationships, Family return their prose and expose their checklist (`actions`, `mind.practice` as the one item) for the rail; `ProseRail` stacks the checklist, `careerPaths` ("Career paths") or `connectBestWith` ("You connect best with") lists, and "saved · n of m"; Superpowers keeps its three boxes with checklists inside, open; Discoveries labels the invitation "A way through" in the accent; `TriadBlock`, `FocusBlock` and `FocusGroupCard` deleted (R04-14 owns the closing); `OverviewBlock` shows only headline, distinctive, bridge; new `DeepdiveBlock` shows concentration and temperament.
Done when: typecheck and `build:web` pass; at 1440 px a prose chapter renders two columns with the rail sticky, at 800 px the rail follows the prose; no fold, no heading outside the four labels.
Parallel with the other wave-1 cards; imports `Checklist` from R04-04.

### R04-14 Dawn in the corner — USER-FACING · Sonnet
Objective: chapter 11's closing per spec "The closing".
Files: new `web/src/components/report/DawnClosing.tsx`.
Refs: spec "The closing", acceptance 12; ADR-26; MASTERFILE §9 motion budget; artifact "the corner dawn".
Behaviour: takes `focus` and the citation counter; sets `--p` from the section's viewport position in a rAF-throttled scroll handler (no timers), the Sun (`SUN_HERO`, ~560 px) translating from beyond the top right corner to rest cropped by both edges, light warming the corner diagonally; the closing at the left in upright Newsreader with citations, no caption; the three groups beneath as cards, each with its `Checklist` (heading "What to do"); starfield untouched; reduced motion renders the final frame.
Done when: typecheck and `build:web` pass; rendered against the fixture the Sun is clipped by both edges at rest and nothing covers it; with reduced motion the final frame renders without a scroll listener.
Parallel with the other wave-1 cards.

### R04-15 Balance rail, Your Path, the nodal axis — USER-FACING · Sonnet
Objective: the Deepdive's second block and chapter 10.
Files: new `web/src/components/report/BalanceRail.tsx`, `PathBlock.tsx`, `NodalAxis.tsx`.
Refs: spec "Natal Chart Deepdive and Overview", "Your Path"; ADR-20; acceptance 7, 15; artifact "the Deepdive", "path".
Behaviour: `BalanceRail` moves the element and modality bars out of `ReportPage` (element bars use `ELEMENT_HEX`, modality bars the accent), dominant pair, chart shape, and the "Read more in Mind →" note linking to chapter 03; `PathBlock` opens with the fixed two-sentence glossary explainer, then `fallBackOn` ("What you fall back on"), `headedToward` ("Where you are headed"), `tenderSpot` ("The tender spot") with citations; `NodalAxis` is a small ring drawn with `wheel-geometry` (`theta`, `pointAt`) showing the axis and Chiron at true degrees, in the rail.
Done when: typecheck and `build:web` pass; the axis test asserts the nodes sit 180° apart on marie-curie's pinned degrees; the note's target is `#chapter-3`.
Parallel with the other wave-1 cards.

### R04-16 The page store: open at chart, stream the chapters — USER-FACING · Sonnet
Objective: the client side of ADR-25.
Files: `web/src/pages/GenerationPage.tsx`, `web/src/components/report/ChapterRail.tsx`, new `web/src/hooks/useLiveReport.ts`.
Refs: spec "While it writes", acceptance 14; ADR-25; provisional MB-44.
Behaviour: `GenerationPage` polls at 1 s, shows "Computing your chart" and navigates the moment `chartReady` is true or status is `complete`/`failed`; the fake progress model goes. `useLiveReport(id)` returns the report, the partial interpretation merged from `/status` every 2 s until `complete`, and `sections`; `ChapterRail` takes an optional `writing` flag per chapter and marks it. Export PDF is disabled by the page until complete (R04-17 wires it).
Done when: typecheck and `build:web` pass; with the API slowed the generation page leaves within three seconds of `chartReady` and the hook's `sections` fills in order.
Parallel with the other wave-1 cards.

### R04-17 Assemble the report page — USER-FACING · Opus
Objective: eleven chapters composed from the round's components, the removals, and the print path intact.
Files: `web/src/pages/ReportPage.tsx`, `web/package.json` (drop leaflet, react-leaflet, @types/leaflet; `pnpm install` refreshes the lockfile); deletes `HouseGrid.tsx`, `BirthLocationHorizon.tsx`, `BirthLocationLeafletMap.tsx`; `web/src/types/chart.ts` alias removal.
Refs: spec "Chapters", "Removals", acceptance 1, 5, 7, 12, 14, 15; Pinned shapes (chapters, accents).
Changes: `useLiveReport`; branch on `report.status` first (writing → live view), then `isCurrentInterpretation` (old completed report → regenerate CTA); chapters from the pinned list, explorer as the first block of 02 and `DeepdiveBlock` + `BalanceRail` as the second; `Chapter aside` for prose chapters via `ProseRail`; `PathBlock` with `NodalAxis` in its aside; `DawnClosing` for 11; `chapterAccent(i)` without the chart argument; `OPENING_ACCENT` stays; Export PDF disabled while writing; `BirthLocationHorizon` and the trailing CTA gone, `MethodologyStrip` stays; print blocks keep `personalPlanets` and `angleMeanings` and the placement table.
Done when: typecheck, both builds, `pnpm install --frozen-lockfile`, unit tests pass; `git grep -n "HouseGrid\|BirthLocationHorizon\|isV3Interpretation\|leaflet"` returns nothing outside the lockfile; on the preview a real report shows hero, explorer, eleven chapters, dawn, no fixed element inside chapter 02, no horizontal overflow at 400 px; print preview still carries the placement table.
Sequencing: wave 2, alone. The only card that touches `ReportPage.tsx`.

## Parallelism

Wave 0: R04-01, R04-02, R04-03 together; R04-04 starts when R04-02's codegen lands. Wave 1: R04-05 to R04-16, twelve builders on disjoint files (brain: 05, 06, 07; lab: 08; API: 09; UI: 10 to 16). Wave 2: R04-17 alone, then the gate: typecheck · both builds · unit tests · `db:bootstrap` twice · codegen clean · report lab on the five fixtures, pasted · Vercel preview smoke. Close per §11.2 step 5, with the bible's word range re-synced (R-5.4).

Two ordering judgements. **Contracts land first and alone**: the registry, `openapi.yaml` and the hand-written web types are the three files every other card would otherwise queue on, so wave 0 writes them from the pinned shapes and wave 1 compiles against them. **`ReportPage.tsx` and `index.css` each get exactly one card** (R03's rule), so wave 1 builds components against the fixture and deletes nothing the page still imports.

## Coverage

Acceptance 1 → 10, 17 · 2 → 10 · 4 → 03, 10 · 5 → 10, 17 · 6 → 01 · 7 → 06, 13, 15, 17 · 8 → 05, 11 · 9 → 02, 04, 09 · 10 → 13 · 11 → 03 · 12 → 14 · 13 → 03, 12 · 14 → 09, 16, 17 · 15 → 15, 17 · 16 → 08 + gate · 17 → gate. Spec line "Read more in Mind →" → 15; kicker casing → 03; Descendant degree and no spokes → 12; `mind.practice` as one item → 13; print table stays → 17; "told which houses carry triad text" and the body-name validator → 01. CLAUDE.md line 4 and MASTERFILE §1/§4 were updated at lock; the bible re-syncs at close.

## Risks

- USER-FACING across the brain: two new sections, four changed prompts, widened bands, a new evidence kind, `PROMPT_VERSION` v5. R-4.4 and R-5.5 bite; the lab run is the evidence and it is pasted.
- **Cost.** The marie-curie baseline is 26.7 cents for eleven calls with one retry. Thirteen calls plus wider bands estimate at about 32 cents before retries, and `houses` is the most retry-prone section (twelve readings under one validator). Lever, if the run lands over 35 cents: `SECTION_MODELS.houses = "gpt-5-mini"`, measured by a second lab run and pasted beside the first (Owner question 2, MB-46).
- Schema change (`workbook`) and a contract change (`ReportStatus`, `required: [meta]`); `db:bootstrap` twice and codegen are in the gate for that reason. Removing three leaflet packages changes the lockfile.
- A partially written report is now visible and printable (MB-44, default: Export PDF disabled until complete). Stored v4 reports meet a page that expects v5 (MB-45, default: regenerate CTA, never auto-regenerate).
- First `localStorage` key in the web app (MB-43). Web tests widen beyond the geometry module (MB-47), still pure modules only.
- Acceptance 13 depends on a true-alpha 512 px Sun export the Owner has not supplied; the default ships the keyed derivation, tagged provisional.
- Deferred on purpose: synastry, a real Chiron ephemeris, Placidus, light mode, the landing page (MB-8 drifts further: eleven chapters now), "tonight's sky", `opengraph.jpg` (MB-13).

## Questions raised

New Mailbox rows before the round starts:

- MB-43 (decision, launch): first `localStorage` use in `web/` (explorer hint). Default: one key, no consent gate, noted on the privacy draft (MB-33).
- MB-44 (decision, launch): a report is readable while writing. Default: Export PDF disabled until `complete`; rail marks chapters still writing; nothing else gated.
- MB-45 (decision, launch): reports stored before v5. Default: `isCurrentInterpretation` requires v5 and the completed old report shows the regenerate CTA; no auto-regeneration.
- MB-46 (decision, launch): `SECTION_MODELS` gets its first entry if the lab lands over 35 cents. Default: route `houses` to `gpt-5-mini`, second lab run pasted, the model per section named in the round report.
- MB-47 (decision, later): widen `web` tests to `src/**/*.test.ts`, pure modules only. Default: yes, still no jsdom.

Existing rows: MB-38 closes with this round (bands and lab run); MB-40 tag removed (ADR-23); MB-8 annotated (eleven chapters); MB-13 annotated (hero uses a 512 px Sun). `Rounds open` increments on every carried open row: the twenty-one at 2 go to 3 (listed at the top), MB-31, 32, 33, 35, 39 to 2.

Three questions were put to the Owner on 2026-09-18 and answered before the round: (1) the Sun asset ships as the keyed 512 px derivation now, swapped when a clean export arrives (MB-13 annotated, the `// MB-13 provisional` tag marks the file); (2) if the first lab run exceeds 35 cents, `houses` routes to `gpt-5-mini` and both runs are pasted (MB-46 is therefore created decided, with the routing named in the round report); (3) a completed v4 report shows the regenerate call to action, never regenerates on its own (MB-45 created decided). MB-43, MB-44 and MB-47 open at their defaults.
