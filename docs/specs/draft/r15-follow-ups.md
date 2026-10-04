# R15 follow-ups: QA-03, MB-199 and MB-200

Ideation 2026-10-04. Status: **draft**. Sources: `docs/qa/QA-03.md` (staging at R15, 705fa342), `docs/rounds/R15-report.md`,
Mailbox MB-199 to MB-214, the code at `main` d26dd04. Artifact: https://claude.ai/artifact/X2FeoFvemRamQfGsvz53qT

## Already held (not in scope)
QA-03 #1 → MB-186 (the Release view's QA agent plays the signed-in personas). /sample's r06 prose → MB-182, ADR-247.
`access-control-allow-origin: *` on static HTML → ADR-248, accepted; `qa.md` should stop re-filing it.

## Scope

### 1. QA-03 fixes (no decision; the owning code named)
- **#2 Dead report link.** `useLiveReport.ts:37` polls while `data.status` is missing; a 404 lands in `error`, so it never
  stops, and the global `retry: 2` (`App.tsx:56`) triples each tick. A 4xx is final: no retry, no refetch, status query off
  once the report query errs. A pure helper (`statusPollMs`, `gone`) in `web/src/lib/` with tests. Same guard on
  `DashboardPage.tsx:460-463` and the lab's `ReleaseView`, `SpotView`, `SpawnView` ticks. S.
- **#3 One clock from first paint.** `useEntryFormat` hydrates on the 24-hour server snapshot (ADR-222 reading 5) and
  `HomePage`'s `Later` sections stay prerendered until 6 s. A `<ClockText at24 at12>` span carrying `data-c12`, and one
  classic inline script in `web/index.html` before the module script that, on a 12-hour browser, swaps every `[data-c12]`
  before paint (`suppressHydrationWarning` keeps it). The detection mirrors `entryFormat` (`date-entry.ts:38-41`) from one
  shared source, unit-tested. Call sites: Hero, Claims, Method, BirthTime, `readouts.ts`, SampleHead, MethodPage,
  LearnBirthTimePage, SkyPage, SkyScreen, `sky.ts`, `learn.ts`. `csp:write` adds the hash. M.
- **#4 Midnight.** `birth-time.ts:35-41`: "Evening, 18:00 to midnight", "Night, midnight to 06:00"; `sweepTime` says
  midnight for 00:00 and 24:00 on both clocks. Tests in `birth-time.test.ts`, `readouts.test.ts`. S.
- **#5 The empty chart card.** `Hero.tsx:42-43,114-135` stacks both faces in one cell; while the summary shows, the
  form face leaves the flow (absolute, still mounted and `inert`). Checked at 1440 and a short laptop viewport that the
  wheel does not jump; if it does, a desktop-only minimum on `.sd-h-bot`. S.
- **#6 The place combobox.** `PlaceField.tsx`: WAI-ARIA 1.2 editable combobox with list autocomplete and
  `aria-activedescendant`; options as `role="option"` (no inner buttons); ArrowUp/Down, Enter picks the active option or
  searches, Escape as now, Tab closes; "Close suggestions" out of the tab order; a polite status line ("3 places found.
  Use the arrow keys to pick one.", through `/ux-copy`). Covers home, /sky and /chart. e2e locators move to `combobox` and
  `option` (`place-zone.spec.ts:52,66`, `birth-fields.spec.ts:31`); an ArrowDown + Enter case added. M.
- **#7 House buttons.** `HouseCard.tsx:94-102`: an `sr-only` " of the {ORDINALS[i]} house" after the visible text. S.

### 2. MB-199 (R15's words and choices)
- Words ship as written, with three edits: "didn't" in both not-delivered lines (share sheet and Change address);
  the outdated line gains "It's free." (true: regenerate consumes no credit, only `POST /reports` does); its error
  becomes "We couldn't start it. Try again in a minute."
- **Behaviour check** in `Differences.tsx:68` takes `--indigo`, as `home-report-section` asks ("the label and look
  `HouseCard` gives it") and §9 reserves brass; the card name stays brass. Rule followed: the locked spec, and "one kind of
  thing, one look" (web-taste, the Owner 2026-10-01). Brass stays only on "keep brass".
- No pair Send on a shared chart: kept (`access.ts:226`; sending would claim the sharer's own chart).
- "pm" typed in full: after a jump made by a typed A or P, `BirthTimeField` swallows a following `m` or `.` (one-shot
  capture listener, cleared at the first other key or 1.5 s). MB-173's move on the P stays. S.
- Stop sharing keeps "Keep sharing" and red.
- **Not me after a hand-over** (question 2): recommended, `handBackOf` refuses once the claimer holds the chart, the menu
  hides Not me and shows Delete; built today, `profiles.ts:375` returns it to the writer with the claimer's later reports.

### 3. MB-200 (bands)
- twoCharts `[300,360]` → `[150,220]`: eight one-sentence lines under the 25-word cap hold 200 at most.
- whatToPractise `[450,560]` → `[350,450]`: its items are copied from the chapters (`whatToPractise.ts:37`).
- `PAIR_TOTAL` `[1900,2500]` → `[1650,2200]` (five lens chapters at 230–300 plus the two).
- Superpowers keeps 130–150-word items; `superpowers.ts:8` actions `.min(2)` → `.length(3)`, as the prompt asks.
- Brain: the dry lab runs; no prompt wording changes beyond the schema line.

### 4. Mailbox code rows folded in
Launch: MB-202 (a process-wide search ceiling about 1/s and a short cache), MB-211 (the place in a POST body, spec and
codegen), MB-207 (no preview pattern on production's API), MB-213 (Supabase's public CA pinned in one helper for the
pool, migrate and push). Next: MB-203, 204, 210, 212, 214, 209. Brain pass: MB-201 (tzdb backzone before 1970, dry lab).
After the Release: the pull request pointing /sample at `sample/<id>`, with `HOME_CLAIMS` re-picked by hand against the
new run and the r06-pinned tests (`sample.test.ts`, `house-deck.test.ts:105`) moved.

## Out of scope
Pricing and launch; Timeline's own cards; anything MB-186's network setting holds.

## Acceptance criteria
- `/report/<unknown id>`: "Report not found." within about 1 s, then no `/status` request for 60 s.
- en-US `/` at DOMContentLoaded reads "7:40 am" in BirthTime and Claims; the raw HTML stays 24-hour.
- en-GB chips read "18:00 to midnight" and "midnight to 06:00".
- After closing the chart on `/`, the card's height is its content plus padding at 390 and 1440; the wheel does not move.
- Keyboard: type "Brussels", Enter, ArrowDown, Enter picks the first place; axe clean; a status line announces the count.
- /sample's twelve house buttons have twelve distinct names.
- "0300pm" leaves the place field's city untouched.
- The dry lab passes with the new bands; the lab's band table shows twoCharts and whatToPractise in range on stored runs.

## Screens
https://claude.ai/artifact/X2FeoFvemRamQfGsvz53qT: the band chart, the two hand-back options, the label in both colours,
and before/after mocks for QA-03 #2 to #7.

## Open questions
1. MB-200: lower the two bands and the pair total as above (recommended). Default: the same (Mailbox default).
2. Not me after a hand-over: refuse once the chart is the claimer's (recommended). Default: as built.
3. The fixes as R16's first group, before Timeline's cards (recommended). Default: the same.

## Decisions to record
- (pending Q1) twoCharts 150–220, whatToPractise 350–450, pair total 1,650–2,200; superpowers exactly three actions.
- (pending Q2) Not me only while the chart is the writer's; after a hand-over, Delete.
- The Behaviour check label follows HouseCard (indigo); brass stays measured geometry and the card name.
- R15's words as written, with the three edits above; "It's free." on the outdated line.
- A typed "m" or "." right after a typed A or P belongs to the time.
- (pending Q3) these fixes run as R16's first group.
