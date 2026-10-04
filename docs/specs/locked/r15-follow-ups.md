# R15 follow-ups: QA-03, MB-199 and MB-200

Ideation 2026-10-04. Status: **locked 2026-10-04** (ADR-266 to 272), the Owner's "lock it" after taking every recommendation with two amendments (three colours per section, two-account QA). Sources: `docs/qa/QA-03.md` (staging at R15, 705fa342), `docs/rounds/R15-report.md`,
Mailbox MB-199 to MB-214, the code at `main` d26dd04. Artifact: https://claude.ai/artifact/X2FeoFvemRamQfGsvz53qT

## Already held (not in scope)
QA-03 #1 is not held: the Release view's QA agent never signs in or writes (MB-78), so scope 5 takes it. /sample's r06 prose → MB-182, ADR-247.
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
- **Behaviour check** in `Differences.tsx:68` leaves brass for `--indigo-lt`, the same indigo as "In her chart": three
  colours on the card (brass name, indigo labels, teal action; grey not counted). **At most three colours per section**
  (the Owner, 2026-10-04): the round checks every section it touches against it; §9 gains the rule at the lock.
- No pair Send on a shared chart: kept (`access.ts:226`; sending would claim the sharer's own chart).
- "pm" typed in full: after a jump made by a typed A or P, `BirthTimeField` swallows a following `m` or `.` (one-shot
  capture listener, cleared at the first other key or 1.5 s). MB-173's move on the P stays. S.
- Stop sharing keeps "Keep sharing" and red.
- **Not me after a hand-over**: `handBackOf` refuses once the claimer holds the chart (409); the menu hides Not me and
  shows Delete. Replaces `profiles.ts:375`'s return to the writer, which took the claimer's later reports with it.

### 3. MB-200 (bands)
- twoCharts `[300,360]` → `[150,220]`: eight one-sentence lines under the 25-word cap hold 200 at most.
- whatToPractise `[450,560]` → `[350,450]`: its items are copied from the chapters (`whatToPractise.ts:37`).
- `PAIR_TOTAL` `[1900,2500]` → `[1650,2200]` (five lens chapters at 230–300 plus the two).
- Superpowers keeps 130–150-word items; `superpowers.ts:8` actions `.min(2)` → `.length(3)`, as the prompt asks.
- The targets follow the shape; no part and no content goes. The Owner's rule is simpler text, never less content: a line
  says the same thing in plainer words, and word count is never the aim.
- Brain: the dry lab runs; no prompt wording changes beyond the schema line.

### 4. Mailbox code rows folded in
Launch: MB-202 (a process-wide search ceiling about 1/s and a short cache), MB-211 (the place in a POST body, spec and
codegen), MB-207 (no preview pattern on production's API), MB-213 (Supabase's public CA pinned in one helper for the
pool, migrate and push). Next: MB-203, 204, 210, 212, 214, 209. Brain pass: MB-201 (tzdb backzone before 1970, dry lab).
After the Release: the pull request pointing /sample at `sample/<id>`, with `HOME_CLAIMS` re-picked by hand against the
new run and the r06-pinned tests (`sample.test.ts`, `house-deck.test.ts:105`) moved.

### 5. QA with two signed-in accounts (the Owner, 2026-10-04)
- A walk in `api/src/lib/qaAgent/` on Railway staging, inside every Release and on demand from the admin panel, plays
  person A and person B signed in. Refused on production. It supersedes MB-78 for this walk only.
- Sign-in: `@clerk/testing`'s `clerk.signIn({ page, emailAddress })` with the `CLERK_SECRET_KEY` already on Railway
  (needs only the secret key and sets the testing token itself; `page.goto` an unprotected page first). One browser
  context per person, signed in once per run (Create SignIn is limited to 5 per 10 s per address). No new secret, no
  account made by hand: two users created once through the Backend API with `+clerk_test` addresses (no email is sent;
  emails made this way are verified; a development instance holds up to 100 users). Verified 2026-10-04, 40/47 claims.
- Links: invite tokens are stored hashed, so on staging `deliver` (mailer.ts:105) puts mail to a `+clerk_test` address
  in a QA outbox table the walk reads, and sends nothing; production never does.
- People from the fixtures: A Marie Curie (starting from `marie-curie-unknown`), B Oprah Winfrey, the third Audrey Hepburn.
  Reports persist between runs; staging test credits fund them; spend stays under `LAB_BUDGET_USD`.
- Sharing: share mine → B claims and reads, A in B's circle → Share yours back → A reads B → Stop sharing, B refused at
  once → share again, Change address before the claim, old link refused, new link works → A sends the third person's
  report, B taps Not me, A sees Handed back and Send again → after a hand-over, no Not me, Delete there → no pair Send on
  a shared chart.
- Birth time: the walk resets A's chart to no time on the server, adds Curie's time, sees the outdated line with
  "It's free.", regenerates, the balance unchanged, B reads the new report.
- A failed step is Sev-2 and stops the Release. About $1.00 on the first run, about $0.25 (one rewrite) after. M to L.

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
- The two-account walk passes every sharing and birth-time step on staging, and refuses to start against production.

## Screens
https://claude.ai/artifact/X2FeoFvemRamQfGsvz53qT: the band chart, the two hand-back options, the label in both colours,
and before/after mocks for QA-03 #2 to #7.

## Open questions
None. Answered 2026-10-04: every recommendation taken; the fixes run as R16's first group, before Timeline's cards.

## Decisions recorded (Notion Decisions, 2026-10-04)
- ADR-266: twoCharts 150–220, whatToPractise 350–450, pair total 1,650–2,200; superpowers exactly three actions; simpler text,
  never less content (MB-200).
- ADR-267: Not me only while the chart is the writer's; after a hand-over, Delete.
- ADR-268: At most three colours per section, grey not counted (MASTERFILE §9); the Behaviour check takes the indigo of its card.
- ADR-269: R15's words as written, with the three edits above; "It's free." on the outdated line.
- ADR-270: A typed "m" or "." right after a typed A or P belongs to the time.
- ADR-271: These fixes run as R16's first group.
- ADR-272: QA plays two signed-in accounts on Railway staging in every Release (Clerk testing helpers, the existing secret key,
  `+clerk_test` users, a staging-only QA outbox); amends MB-78 and ADR-86 for that walk; MB-186 closes.
