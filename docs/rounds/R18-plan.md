# R18 plan — the sev-2 fixes, three loading screens on one grid, and Timeline written at setup

Planned 2026-10-06 on `claude/planning-session-abs19m` against `main` at 77ed871 (PR #128 merged: the walk-line lock) for five
sessions locked on 2026-10-05 and 06 and the backlog after QA-06: `review-05-10` (ADR-297 to 312) in part, `report-loading-story`
(ADR-316 to 325) §1 to §4, `compatibility-loading-story` (ADR-347 to 351), `walk-line-and-timeline-launch` (ADR-352 to 356), QA-06's
sev-2 lines (B-47, 48, 49, 34) with MB-233 (private), and the small lines that share their files. `sharing-and-circle` (ADR-329 to
342) is R19's. **Size, honestly:** the five sessions and the open backlog come to about sixty cards and two brain passes, too much for
one round; R18 is cut at 27 and R19 and R20 are named (Scope deferred). **Cards:** 27 in three groups (15, 8, 4; ADR-283). **Tiers:**
16 Opus, 11 Sonnet, no Haiku. **Tags:** USER-FACING are R18-01 to 03, 05 to 09, 13, 15 to 17, 19 to 22 and 24; the rest INTERNAL.
**The brain changes** in one card, R18-13 (the pair's compute and the Release's brain lists; no prompt, model or engine file), so the
dry lab runs on the pair fixtures. **The schema changes** (R18-12: three new tables). **The contract changes** (R18-18). **No new
dependency.** No builder needs a credential, nothing goes on GitHub, nothing spends in the session, a staging deploy still costs
nothing, and production sells nothing until launch (ADR-167).

## Open Mailbox rows created more than 14 days ago (oldest first, ADR-186)
**2026-09-09:** MB-12, no error reporting or alerting. It blocks no card; MB-232's spec reads it beside request errors when that spec
is written (For the Owner 3).

## Round number, size and order
R17 is the last round with a report (closed 2026-10-05, its lessons in 470c5f1). Since then: QA-05 and QA-06 (no sev-1; QA-06's
sev-2 lines are B-47, 48, 49 and 34) and five locked sessions. No Mailbox row is `blocking`; MB-233's default is "fixed in the next
round's first group". The Owner wants the three loading reworks in one round (compatibility-loading-story, Why). Pricing's launch is
not planned (ADR-230, 242). R18 takes, in this order: (1) the sev-2 fixes and MB-233, due before the first live sale and before
Timeline sells on production; (2) the three loading screens on one grid, with what they stand on (the house set, the Did you know card,
R on the dial); (3) Timeline written at setup (Review 05/10 §5), which the setup screen needs; (4) the walk-line spec and the small
lines in the same files. R19 is sharing and the circle with the rest of Review 05/10 §1; R20 is the brain's half of Review 05/10.

## Round start (the orchestrator)
1. Branch `round/R18` from `main` with this plan (merge `claude/planning-session-abs19m` first). `docs/backlog.md` already has MB-225
   out of *Waiting on Alex* (decided, ADR-361) and B-58 added.
2. **Lessons first (ADR-265):** this plan is stamped through R17; re-read `lessons.md` for any line added since and put each guard
   that fits into its card's done-when.
3. **Facts first** (the researcher, then the verifier; the SDKs in `node_modules` before the web, which blocked docs.stripe.com
   and clerk.com last round). A fact that breaks a pinned shape re-pins it before group 1; one that can't be re-pinned stops the
   round (R-0.1).
   (a) Railway config as code: `deploy.healthcheckPath`, `healthcheckTimeout`, `overlapSeconds`, `drainingSeconds`; whether a volume
   or a dashboard-only setting stops overlap on the API service; how long SIGTERM leaves before the kill (R18-03).
   (b) Stripe on `2026-08-26.dahlia` (`stripe@22.6.2`, `@stripe/stripe-js@9.17.0`): `excluded_payment_method_types` on an `elements`
   Checkout Session, or another way to turn Link off while the Dashboard keeps choosing the methods; the Payment Element's billing
   country and how to start it at the buyer's; `checkout.sessions.expire` on an open subscription session; cancelling a subscription
   at once and refunding its first payment (R18-01).
   (c) Clerk: keeping a redirect through `/sign-in/factor-one` and `/sign-up/verify-email-address` (`forceRedirectUrl`,
   `fallbackRedirectUrl`); sign-in tokens and banning a user on the Development instance with the locked `@clerk/backend` (R18-02, 04).
   (d) Stripe's two fraud cookies on `/checkout`: their names and how long they last (R18-06).
4. **The artifacts' screens:** builders can't open claude.ai, so extract into the session scratchpad, at 390 px first:
   report-loading-story v4 (the Personal player, known and not known; the Timeline setup player; the house set's twelve objects,
   covers lines before and after, the pairs); compatibility-loading-story (the player on phone and desktop, both times and one missing,
   the step table); review-05-10 Part 6 (the R line), Part 7 (the hero), Part 9 (the Did you know card's words and drawings). Where a
   builder's draft differs, the artifact wins and the report says so.
5. **The coastline for R18-10:** if the artifact carries Natural Earth's 110m outline, take it. Else fetch `world-atlas@2`'s
   `land-110m.json` once from the npm registry into a new, empty scratch folder, read it as data only, decode the TopoJSON by hand (no
   package), simplify it under 60 KB and hand the file to the builder (public domain; source and licence in the module's header).
6. `pnpm install --frozen-lockfile`. No `package.json` gains anything this round.
7. **MB-233 (private):** fetch the row and give its 2026-10-06 note to R18-04's builder in the brief. Nothing of it enters the repo, a
   commit message, a comment or a report; the plan names the row only.

## What already stands (audit at 77ed871)
- **Met, and reused:** `OpeningOverlay` (focus trap, scroll lock, the 1.2 s self-open, the crossfade, a failure's line and free Try
  again); `progress.ts` (one percentage and one label, the door at real ≥ 67); `HorizonWheel`, the browser engine (`chartOf`,
  `site/lib/sky.ts`); R16's `Dial` with `framesFor`, `AgeRing`, `NatalWheel`, `TriadPlate`; `Claims.tsx`'s bars; `HOUSE_WORDS` and
  `HOUSE_THEMES` in `evidence-glossary.ts`; `timelineReadings.ts` (`writeReading`, `openReading`, `readingStatuses`, the 40-a-day cap);
  the daily spend breaker (`spendCap.ts`, ADR-199); the shared step list, the staging walk and `/api/qa/latest`; checkout, purchases
  and subscriptions; `CREDIT_LINE`, `usePrices`, `LAUNCHED`; the Report and ReportParticipant shapes carry birth date, time, place,
  latitude and longitude, so both stories need no contract change.
- **Not met:** the five-step story, the pair story, one grid, `houses.ts` and its objects, the facts log and the Did you know card, R
  on the dial, a job runner, readings written at setup (a card writes on its open, and the six-month view queues three), the setup
  screen, the refetch when `chartReady` flips, the hero's Ascendant value and date, look-backs from the past only, the walk-line spec,
  and B-34, 38, 39, 42, 44 to 49, 53 to 56.
- **Found while planning:** (1) `pairInterpretation.ts` and `pairBrief.ts` are only in `PAIR_BRAIN_PATHS`, and `synastryCompute.ts`
  and `overlays.ts` in neither, so a change to the pair's compute runs no Release lab (`release.ts` runs it only when `brainChanged`):
  R18-13. (2) Review 05/10 §1's bundle tap names `POST /checkout/test`, deleted in R17 (ADR-276, MASTERFILE §6): R19 reads it as
  `/checkout` in the sandbox, returning to the birth form. (3) `auth.ts`'s claim logs a Clerk id when the email fetch fails (the
  promoted log rule): R18-02. (4) The 40-a-day cap counts the reader's opens; setup's writes come from the engine's list under the
  spend cap instead (ADR-358). (5) `no-chiron.test.ts` (critical) and `gather.ts` import the orrery: R18-27. (6) `prompts.test.ts`
  reads `HOUSE_WORDS` out of `evidence-glossary.ts` by pattern: R18-13 points it at `houses.ts`. (7) `stripe-payments` keeps the
  Dashboard's methods ("no `payment_method_types`"), so B-56 is the line above them and the country, not the list; Link goes by
  ADR-346. (8) Reading the sky's chapter 1 has no rendered file in the repo and HyperFrames is not here: the explainer and the reels
  wait (Scope deferred). (9) The status route's `provisional` positions are read only by the orrery: B-58 after R18-27.

## Where the specs meet, and how this plan reads them
1. **One grid** (ADR-351) amends the loading specs for layout only: the Personal story's steps and timing (ADR-316 to 318), the pair
   story's step table (its third pass) and the setup's drawing (ADR-320) stay as locked.
2. **The Did you know card** shows under Timeline's setup and under a report screen whose chart has no birth time; with a birth time
   the six pairs take its place (ADR-317). The pair screen has houses (C) while it writes and no card.
3. **The pair story's houses (C)** show each person's own sign and planets in each house, on that person's plate; nothing joins the
   plates and no overlay is read (the artifact; ADR-97, 349, 350). A plate with no birth time reads signs.
4. **The Personal story** computes the chart in the browser from the report's birth fields (`chartOf`), so it never waits on the
   network, and holds the stored chart once `chartReady` (ADR-319); both are the engine's, so the degrees equal the hero's.
5. **Timeline's setup** (Review 05/10 §5 drawn as report-loading-story §2) starts at the subscriber's first open of Timeline, never
   from the webhook or a deploy (ADR-358): the staging walk buys Timeline and opens no Timeline page (ADR-315).
6. **MB-225 is decided** (ADR-361): the box and the line as R17 built them; the `// MB-225 provisional` seams go.
7. **The house set's covers lines** reach the page now (House by House, /learn/houses, the evidence lines) and the writer in R20,
   through the doctrine, with its dry lab (report-loading-story §3).
8. **Transit and cycle:** R18 changes FiveThings' line; `weekSentence`'s "things" is in the engine (the brain) and goes with R20's
   Timeline words, where acceptance 9's grep is checked.

## Goals
1. **The sev-2 fixes before the first live sale, and MB-233** (QA-06): sign-in returns where it was asked (B-47); deploys without a
   gap (B-48); Link's box off (B-49, ADR-346); one Timeline plan per account (B-34, ADR-359), with B-56's line and country; MB-233 in
   the first group, as its default says.
2. **Three loading screens on one grid** (ADR-351): the Personal report's five steps (ADR-316 to 319), the Compatibility report's B
   then C (ADR-347 to 350) and Timeline's setup screen (ADR-320), with the Did you know card (Review 05/10 §9).
3. **Timeline written at setup** (Review 05/10 §5, ADR-302): a Postgres job queue (ADR-357), setup from the reader's own open
   (ADR-358), the next six months a week ahead with their replay, stale readings rewritten in the background, the buyer walk's new
   step; R on the dial with its one line (§6).
4. **One house set, and the launch lines:** `houses.ts` with its objects, covers and pairs (ADR-321) on /learn/houses and House by
   House (opposite, R and the quiet house's line); `walk-line-and-timeline-launch` (ADR-352 to 356); B-42, B-44 and B-38.
5. **The pair's compute and the small Review 05/10 bugs:** B-45 and B-46 with the Release's brain lists; the hero's Ascendant and its
   date; look-backs only to the past; the auth race and the sign-in claim (§1); B-39 and B-53 to 55; /qa checks what it can reach and
   reads the walk first (B-31's /qa half), with the walk's pictures (ADR-360).

## Preconditions
1. Builders read MASTERFILE §0, their card, the readings and pinned shapes it names, and Round start 4's screens.
2. **Single owners.** No file in two cards of a group. Across groups: `OpeningOverlay.tsx` → R18-09 (1), R18-27 (3);
   `useLiveReport.ts` and `ReportPage.tsx` → R18-16 (2), R18-27 (3); `CompatibilityReportPage.tsx` → R18-17 (2), R18-27 (3);
   `jobHandlers.ts` → R18-12 (1, the empty registry), R18-18 (2), R18-25 (3); `timelineSetup.ts` and `timelineReadings.ts` →
   R18-18 (2), R18-25 (3); `qaWalk/browser.ts`, `qaWalk/index.ts`, `routes/qa.ts` and their tests → R18-04 (1), R18-23 (2), and
   `qaWalk.test.ts` → R18-26 (3); `dial.ts` and `Dial.tsx` → R18-19 (2), R18-24 (3); the site's `timeline/Hero.tsx` → R18-05 (1),
   R18-19 (2); `api/test.critical` → R18-02 (1), R18-26 (3); `web/test.critical` → R18-16 (2); `openapi.yaml` and codegen →
   R18-18; `site.ts` → R18-05; the schema and the bootstrap → R18-12; `api/src/index.ts` → R18-03.
3. Inside a group a card may land before one it imports from (pinned shapes): the orchestrator accepts a red intermediate until the
   group ends, and every group ends with typecheck and the critical tier green. The buyer walk stays green through groups 1 and 2.
4. **No card spends or reaches a network:** the model is stubbed in every test and walk; Stripe and Clerk are stand-ins; a staging
   deploy starts no setup (ADR-315, 358). **No dependency:** a builder who needs one stops.
5. **Seams:** `// MB-225 provisional` goes (ADR-361; R18-01, 06); `// MB-219 provisional` in `timelineReadings.ts` goes (ADR-327;
   R18-18). New seams only for open rows; MB-233's code carries no `MB-233` comment.
6. **The promoted rules** (`lessons.md`): grep every caller before changing a shared export, a pinned value or what a function may
   return, and name any outside your files; a log line or route path carries ids, types and counts, never a Clerk id, an email or a
   name; commit with a pathspec naming only your card's files.
7. **Simple words** (CLAUDE.md): every new line a reader sees goes through `/ux-copy`, every new screen through `/web-taste` at 390,
   768 and 1440 px. One push per group and one per fix (ADR-234); builders commit as they go.

## Readings pinned where the specs are silent
1. **B-47:** when the sign-in or sign-up page opens with `return_to`, the tab keeps it in sessionStorage (`sd.return_to`) and reads
   it when Clerk's steps drop it; only a same-origin path is kept (one leading `/`, no scheme, no backslash), else `/dashboard`;
   it is used once.
2. **The auth race** (Review 05/10 §1): one QueryClient per viewer, anonymous until Clerk loads or `useClerkStalled` says it won't, so
   no answer cached for one viewer reaches another and nothing waits on keys rewritten across the app.
3. **The claim** moves the session's relationships with its profiles, only rows whose `user_id` is null, in one transaction.
4. **B-34** (ADR-359): a plan checkout expires the account's other open plan sessions first; a second live subscription is cancelled at
   once and its payment refunded in full, the first kept; the older tab, paying, shows one line that a newer checkout replaced it, with
   the way to it.
5. **B-49 and B-56:** Link off as research 3(b) finds (`excluded_payment_method_types: ["link"]`, or its equal), `link: "never"` in
   Express Checkout; the Dashboard still chooses the other methods (stripe-payments), the line above the Payment Element says what is
   listed, and the billing country starts at the buyer's (research 3(b)).
6. **B-48:** the health check on `/api/healthz` with overlap and draining from `railway.json`; on SIGTERM the API takes no new
   request, lets open ones and running jobs finish within the drain, then exits; the done page counts 502, 503, 504 and a network error
   as "not yet" and waits up to 120 s before its line.
7. **The job queue** (ADR-357): as pinned; handlers idempotent by their dedupe key; a job the spend breaker pauses moves to the next
   UTC midnight; done rows kept 7 days; the worker never holds the start.
8. **Setup** (ADR-302, 358): only `POST /timeline/setup` starts it, sent by the Timeline page on its first open with access and an own
   report. `from` is the Monday of the reader's week in their zone, `to` six months on. It writes the events GET /timeline/now's
   six-month view lists that `readsAs` accepts, this week's first, then the month's, the rest, then `lifeCycles` from birth to 90.
   Chart and planets tick at once. "Almost there. You can start reading this week now." shows once 60 s have passed and the week is
   written. A reading that fails keeps the engine's headline and line and writes on Read more, as today.
9. **The next six months:** one `timeline.ahead` job at `to − 7 days`; with access still on, it writes the next stretch, moves `to`
   and sets the replay; the next visit plays the drawing from step 3 once with "Your next six months are ready, <from> to <to>", then
   marks it seen. Without access it writes nothing.
10. **Stale readings** (ADR-358): a reading's basis gains the Personal report's version; at the reader's open, readings whose birth
    time, Timeline prompt version or report version moved are queued once each, and the kept text answers meanwhile. A start or a
    deploy queues nothing.
11. **Opens:** GET /timeline/now queues nothing (`queueReadings` goes). Before setup a card still writes on its open (the 40-a-day cap,
    ADR-327); after it, an open writes nothing and waits for nothing (Review 05/10 acceptance 7).
12. **The pair story:** the spec's step table (places 0 to 13 s, the first sky 13 to 17, the second sky fading in on its own plate
    17 to 24, two charts side by side 24 to 30, houses 30 to 96 at 5.5 s each, then "Now writing your report", held); the distance
    great-circle in whole km; "born … later" as a calendar difference of the two birth dates; facts only (ADR-347).
13. **The Personal story:** report-loading-story §1 as locked; Start reading at 67% whatever plays; reduced motion: the finished
    chart with its six pairs and the steps as a still list; a blind chart: "No birth time, so no horizon", the Moon as its day's
    arc, then "Now writing your report", "No birth time, so no houses" and the Did you know card.
14. **The walk's pictures** (ADR-360): one JPEG per step that ran (quality 60, 390 × 844), `mask` over every input, textarea,
    `[contenteditable]` and Stripe's and Clerk's frames; one `qa_shots` row per step, replaced each walk; the verdict lists `shots`.

## Pinned shapes
- **The grid** (R18-09): `LoadingSlots { counter?: ReactNode; title: ReactNode; subtitle?: ReactNode; stage: ReactNode; detail?:
  ReactNode; below?: ReactNode }`; `LoadingFrame(props: LoadingSlots & { pct?: ReactNode; door?: ReactNode })`, each slot at its share
  of the frame's height: counter 5–8, title 8–16, subtitle 16–22, stage 24–66, detail 68–84, percentage and label 86–90, door 91–97
  (ADR-351); `below` after the frame. `OpeningOverlay` gains `slots?: LoadingSlots` (required from R18-27).
- **Facts** (R18-08): `Fact { id: "retrograde" | "east-left" | "house-sign" | "saturn-return"; title: string; sentences: readonly
  string[]; askedIn: string; drawing: "dial-retrograde" | "hero-east" | "wheel-house" | "age-ring" }`, `FACTS`; `DidYouKnow({ facts?:
  readonly Fact[]; chart?: ChartData | null })`, drawn on the reader's chart, else Mira's computed at run time.
- **Houses** (R18-07): `export const HOUSE_WORDS = [ … ] as const` stays one literal array, its words unchanged; `HOUSE_COVERS`
  (twelve lines); `HouseObjectId` (the artifact's twelve); `HOUSES: readonly { n; word; object: HouseObjectId; covers; opposite;
  pair: readonly [string, string] }[]`; `PAIRS` (1–7 me · the other person, 2–8 mine · shared, 3–9 everyday · big picture, 4–10
  private · public, 5–11 my joy · our hopes, 6–12 doing · resting); `evidence-glossary.ts` re-exports `HOUSE_WORDS` and `HOUSE_THEMES`
  (= `HOUSE_COVERS`); `HouseObject({ house: number; size?: number; className?: string })`.
- **Story frames** (R18-10, 11): `StoryInput { chart: ChartData; birth: { lat; lon; place; date; time: string | null } }`; `frameAt(t:
  number, input: StoryInput, progress: Progress): StoryFrame` and `pairFrameAt(t, input: { a: StoryInput; b: StoryInput; names:
  readonly [string, string] }, progress): PairFrame`, both pure: a frame carries its step, the grid's words and every mark's place, so
  the components only draw. `STORY_STEPS_S`; `PAIR_STEPS_S = [0, 13, 17, 24, 30, 96]`; `HOUSE_S = 5.5`; `kmApart(a, b): number`;
  `bornLater(a, b): { years; months; days }`. `globe.ts`: `orthographic({ lat0, lon0, r }) → (lat, lon) => { x; y; front }`;
  `land-110m.ts`: `LAND_110M` (rings of [lon, lat]); `easing.ts`: `easeInOutCubic`.
- **Tables** (R18-12): `jobs { id uuid PK; kind text; payload jsonb; dedupe_key text NULL, unique while queued or running (a partial
  index); status queued | running | done | failed; run_at timestamptz DEFAULT now(); attempts int DEFAULT 0; max_attempts int DEFAULT
  5; locked_until timestamptz NULL; last_error text NULL (a code); created_at; updated_at }`, index (status, run_at).
  `timeline_setups { user_id PK; report_id; from_day date; to_day date; state writing | ready; started_at; ready_at NULL; replay_from
  date NULL; replay_to date NULL; replay_seen_at NULL; updated_at }`. `qa_shots { step PK; walk_id; jpeg bytea; taken_at }`.
- **Jobs** (R18-12): `JobKind = "timeline.reading" | "timeline.ahead" | "timeline.refresh"`; `enqueue(kind, payload: Record<string,
  string | number>, opts?: { runAt?: Date; dedupeKey?: string }): Promise<string | null>` (null while that key is queued or running);
  `registerHandler(kind, handler: (payload, ctx: { attempt: number; signal: AbortSignal }) => Promise<void | { retryAt: Date }>)`;
  `startWorker(opts?: { concurrency?: number; pollMs?: number })` (registers `jobHandlers.ts` once; 4 and 5 s); `stopWorker(drainMs:
  number): Promise<void>`; `drainJobs(opts?: { max?: number }): Promise<number>` (due jobs in-process, for tests and the buyer walk).
- **The contract** (R18-18; operationIds in brackets): `TimelineSetupStep { id: chart | planets | week | month | months | cycles;
  done: boolean; count: integer | null }`; `TimelineSetup { state: none | writing | ready; from: date | null; to: date | null; steps:
  TimelineSetupStep[]; replay: { from: date; to: date } | null }`; `GET /timeline/setup?tz` [getTimelineSetup] → 200; `POST
  /timeline/setup?tz` [startTimelineSetup] → 202 TimelineSetup, idempotent; `POST /timeline/setup/replay-seen`
  [markTimelineReplaySeen] → 204; each behind Timeline's access check, refusing as GET /timeline/now does (401, 403, 409
  `no_personal_report`).
- **Server** (R18-18): `timelineSetup.ts`: `setupState(reader, zone)`, `startSetup(reader, zone)`, `markReplaySeen(userId)`; job
  payloads `timeline.reading { profileId; key }`, `timeline.ahead { userId }`, `timeline.refresh { profileId; key }` (R18-25).
- **Web:** `return-to.ts` (R18-02): `keepReturnTo(search: string)`, `takeReturnTo(): string`, `safeReturnTo(path: unknown): string |
  null`. `RetrogradeLine({ className? })` and `RETROGRADE_LINE` (R18-19). `ReportHero` gains `writtenOn?: string | null` (R18-21; the
  report's `createdAt`). The verdict gains `shots: string[]`; `GET /api/qa/latest/shots/{step}` → image/jpeg (R18-23).

## Parallel groups
**Group 1**, one message: R18-01 to R18-15 (no file in common). R18-03 starts R18-12's worker; R18-07's `HOUSE_WORDS` literal is what
R18-13's test reads; R18-08, 09, 10 and 11 build on each other's pinned shapes. Push once. **Group 2**, one message once group 1 is
green: R18-16 to R18-23. R18-16 and 17 draw R18-10's and 11's frames in R18-09's grid, with R18-08's card; R18-16 passes R18-21's
`writtenOn`; R18-20 uses R18-19's `RetrogradeLine` and R18-07's pairs; R18-18 registers its handlers in R18-12's registry; R18-23
writes R18-12's `qa_shots`. Push once. **Group 3**, one message once group 2 is green: R18-24 to R18-27. R18-24 calls R18-18's routes
through the regenerated hooks and draws on R18-19's dial; R18-26 walks R18-18's routes. Push once; then the orchestrator's steps and the
gate. **If R18 must shrink:** first R18-23 (the walk's pictures; QA reads the verdict), then R18-25 (readings stay as written until
R19), then R18-15 and R18-22, each to R19. The sev-2 fixes, MB-233, the three loading screens and Timeline's setup never move.

---

## Group 1 — the fixes, the foundations of the three screens, the queue's tables, the launch lines

### R18-01 — One Timeline plan per account, Link off, and the methods' line (USER-FACING) — B-34, B-49, B-56
Tier: opus — money: a bug that charged twice and blocks Timeline's sale on production
Objective: two tabs can't buy two subscriptions (ADR-359); Link's box goes (ADR-346); the line above Stripe's fields says what is
under it and the country starts at the buyer's; MB-225's seams here cite ADR-361.
Files: `api/src/lib/purchases.ts` (+ `purchases.test.ts`), `api/src/lib/subscriptions.ts` (+ `subscriptions.test.ts`);
`web/src/pages/CheckoutPage.tsx`; `web/src/lib/checkout-view.ts` (+ test).
Refs: QA-06 #3, #4, #12; ADR-274, 277, 346, 359, 361; R-6.2, 6.6; stripe-payments Checkout; readings 4, 5; Round start 3(b).
Done when:
- A plan checkout expires the account's other open plan sessions before it makes its own; a second live subscription is cancelled
  at once and its payment refunded in full, the first kept, access unchanged, once per event; the replaced tab says so and links on.
- Link off as research found and `link: "never"` in Express Checkout, still no `payment_method_types`; the line above the Payment
  Element names what is listed (`/ux-copy`); the country starts at the buyer's, or the report says why it can't.
- `purchases.test.ts` and `subscriptions.test.ts` (critical) pin both halves of B-34, a replayed event and the session's body;
  `checkout-view.test.ts` pins the new lines; the `// MB-225 provisional` comments cite ADR-361.

### R18-02 — Sign-in returns where you were, each viewer's own cache, and pairs claimed (USER-FACING) — B-47, Review 05/10 §1
Tier: opus — sign-in and what a session hands an account: the flow's first step
Objective: the emailed-code sign-in keeps `return_to` through Clerk's steps; no answer cached for one viewer reaches another; a
pair made before sign-in stays with the account; the claim's warn line drops its Clerk id.
Files: `web/src/App.tsx`; new `web/src/lib/return-to.ts` (+ test); `api/src/middlewares/auth.ts`, new `auth.test.ts`;
`api/test.critical`.
Refs: QA-06 #1; review-05-10 §1 (auth race), acceptance 3; readings 1 to 3; the promoted log rule; R14-12, R15-18/19 lessons.
Done when:
- `return-to.ts` as pinned: a same-origin path survives `/sign-in/factor-one` and `/sign-up/verify-email-address` (Round start
  3(c)); `//host`, a scheme or a backslash falls back to `/dashboard`; used once. `SignUpPage` (in `App.tsx`) keeps it too.
- One QueryClient per viewer (reading 2), so a reload's first paint of `/dashboard` is the viewer's own; every user of App's client
  grepped. The claim moves relationships with profiles (reading 3); the warn line carries no Clerk id.
- `return-to.test.ts` and `auth.test.ts` green; `api/test.critical` adds `src/middlewares/auth.test.ts`; the critical tier green.

### R18-03 — Deploys without a gap (USER-FACING) — B-48
Tier: opus — how both hosts start and stop, and a paid buyer's wait
Objective: a deploy keeps the old API serving until the new one answers its health check, then lets open requests and running jobs
finish; the done page waits through a gap instead of failing.
Files: `railway.json`; `api/src/index.ts` (SIGTERM; R18-12's `startWorker` after listen and `stopWorker` on SIGTERM);
`web/src/pages/CheckoutDonePage.tsx`.
Refs: QA-06 #2; reading 6; Round start 3(a); ADR-315; R-7.3; R16-24's lesson.
Done when:
- `railway.json` sets the health check, overlap and draining as research found; a volume or a dashboard-only setting found by
  research is one line in the report for MB-228's checklist, and nothing else waits on it.
- On SIGTERM the API refuses new requests, lets open ones and running jobs finish within the drain, then exits 0 (checked locally
  with a request in flight and a job running); the worker starts after listen and never holds the start.
- The done page waits through 502, 503, 504 and a network error up to 120 s, then shows its line as today; typecheck and the
  critical tier green.

### R18-04 — MB-233 (private), and one reset per deploy walk (INTERNAL) — B-39
Tier: opus — security on the QA pair's staging accounts; the brief lives in Notion only
Objective: MB-233 fixed as its row's 2026-10-06 note says (the orchestrator passes it in the brief); a deploy's walk resets the QA
pair once.
Files: `api/src/lib/qaPair.ts` (+ `qaPair.test.ts`); `api/src/lib/qaWalk/browser.ts`, `api/src/lib/qaWalk/index.ts` (+
`qaWalk.test.ts`); `api/src/routes/qa.ts` (+ `qa.test.ts`).
Refs: MB-233 (private); B-39; ADR-314, 315; R17-25, 26; the promoted log rule; R13-08's lesson.
Done when: MB-233's done-when from its row, read by the sentinel; the pair is reset once per deploy walk (the trigger's or the walk's
reset goes, one stays); the report says "MB-233: fixed as its row says" and nothing more; `qaPair.test.ts`, `qaWalk.test.ts` and
`qa.test.ts` (critical) green with a model client that fails if called.

### R18-05 — The credit line, Timeline's launch-day lines, and "transit" (USER-FACING) — B-41
Tier: sonnet — a locked spec with every line in its tables
Objective: `walk-line-and-timeline-launch` as locked: the Owner's credit line now, no price in any FAQ answer, and Timeline's six
launch-day lines written beside today's, switched by `LAUNCHED`; FiveThings says "transit" (ADR-322).
Files: `packages/commerce/src/catalogue.ts` (+ test); `web/src/pages/DashboardPage.tsx`; in `web/src/site/`: `site.ts`, `data/faq.ts`,
`sections/Pricing.tsx`, `sections/TimelineLine.tsx`, and `sections/timeline/Hero.tsx`, `WhatYouGet.tsx`, `FiveThings.tsx`.
Refs: walk-line-and-timeline-launch (both tables, acceptance); ADR-343, 352 to 356; R-6.3; ADR-322; R16-14, R17-08/18 lessons.
Done when:
- The credit-line table as locked (`CREDIT_LINE` "any kind", pinned in `catalogue.test.ts`; `creditPrices()` goes); the six lines
  read as today and, in a local build with `LAUNCHED = true` not committed, as the launch-day column, the plan card's prices live
  from `usePrices`; the three stale comments read "no price until launch (ADR-343)" and type no price.
- FiveThings: "Every transit read against your own report". `site.ts`'s `updated` moves for each page group 1 changes: /, /faq,
  /timeline, /learn/houses, /method, /refunds, /privacy.
- No FAQ answer names a price, and with `LAUNCHED = true` nothing says "after launch", "coming soon" or "price comes later"; the
  price gate, `check:shipped` and the site checks green.

### R18-06 — The legal pages: a pair's credit at once, Stripe's cookies, MB-225 decided (USER-FACING) — B-42, B-44, B-38
Tier: sonnet — words fixed by backlog lines and Decisions rows, each one's place named
Objective: refund rule 2 and /method step 04 say a Compatibility report's credit comes back at once; /privacy names Stripe's two
fraud cookies; `/ux-copy`'s example matches ADR-313; MB-225's seams here cite ADR-361.
Files: `packages/commerce/src/terms.ts` (+ `terms.test.ts`); `web/src/site/pages/MethodPage.tsx`; `web/src/pages/legal/PrivacyPage.tsx`,
`RefundsPage.tsx`; `.claude/skills/ux-copy/references/voice-chart.md`.
Refs: QA-05 #6, #7; ADR-313, 343, 346, 361; R-6.6; Round start 3(d); `/ux-copy`; R13-05's lesson.
Done when:
- `REFUND_RULES[1]` ends "For a Compatibility report, the credit comes back at once." (the receipt and /refunds read it); /method
  step 04 says the same; /privacy's cookie line names the two cookies and what they are for, no banner.
- The `// MB-225 provisional` seams in `terms.ts`, `terms.test.ts` and `RefundsPage.tsx` cite ADR-361; the voice chart's failed-report
  example says Try again is free and the credit comes back only if we still can't write it. If the session refuses the `.claude/`
  edit, that line returns to B-38 and the card still closes.
- `terms.test.ts` (critical) and the site checks green; the report lists each changed line before and after.

### R18-07 — One house set: word, object, covers and pair (USER-FACING) — report-loading-story §3
Tier: opus — twelve new drawings and the one table every house page reads
Objective: `houses.ts` is the one table of the twelve houses, the objects are drawn once in light indigo, and /learn/houses shows the
pairs and the objects (ADR-321).
Files: new `web/src/lib/houses.ts` (+ test); new `web/src/components/chart/HouseObject.tsx`; `web/src/lib/evidence-glossary.ts` (+
test); `web/src/site/pages/LearnHousesPage.tsx`.
Refs: report-loading-story §3, acceptance 8; ADR-321; the artifact's house set (Round start 4); MASTERFILE §9 (brass is measured
geometry only); the promoted caller rule.
Done when:
- `houses.ts` as pinned, the covers from the artifact's after column (the 5th says "love"); `evidence-glossary.ts` re-exports both
  names, so every importer compiles unchanged, each grepped and named; a grep finds the twelve words in one table in `web/`.
- `HouseObject` draws the artifact's twelve objects as line drawings in the houses' light indigo, never brass; /learn/houses gains the
  pairs section and an object column, at 390 px first, through `/web-taste`.
- `pnpm report:lab --render --base r06` shows no prompt changed; the report lists the twelve covers lines before and after
  (USER-FACING: House by House and the evidence lines print them); typecheck and the critical tier green.

### R18-08 — The Did you know card and the facts log (USER-FACING) — Review 05/10 §9
Tier: sonnet — one component and one list, words and drawings from the artifact's Part 9
Objective: `facts.ts` holds the facts the Owner asked about, and the card shows them one at a time under a loading screen.
Files: new `web/src/lib/facts.ts`; new `web/src/components/loading/DidYouKnow.tsx`.
Refs: review-05-10 §9; ADR-317; Part 9 (Round start 4); `Claims.tsx`'s bars; `/ux-copy`, `/web-taste`.
Done when:
- The four facts as pinned with Part 9's words: retrograde (the Dial's planet with its dashed ring and trail), east on the left
  (`TriadPlate`'s east), each house starts in a sign (the wheel, one house lit), Saturn's return (`AgeRing`); each drawing reused
  through its props; one that needs a new prop is named in the report, not edited.
- "DID YOU KNOW" in small brass capitals, the title, two or three sentences, the drawing on the right; one bar per fact filling over
  about 8 s like Claims, a fade, tap a bar to jump, hover pauses, no X; reduced motion: no fill, the bars still jump.
- Typecheck and the critical tier green; `/web-taste` at 390, 768 and 1440 px.

### R18-09 — One grid for every loading screen (USER-FACING) — ADR-351
Tier: sonnet — one layout component, its slots pinned here
Objective: `LoadingFrame` places each part of a loading screen in its fixed slot, the same on every device, and the report screens
take it through `OpeningOverlay`.
Files: new `web/src/components/loading/LoadingFrame.tsx`; `web/src/components/report/OpeningOverlay.tsx`; `web/src/index.css`
(`.rp-open`).
Refs: compatibility-loading-story (the grid); ADR-47, 59, 313, 351; pinned `LoadingSlots`.
Done when:
- Each slot at its pinned share of the frame's height on a 360 × 740 phone and a 1000 × 600 desktop, starting in its own slot
  whatever the one above holds; title and subtitle two lines at most; no sideways scroll at 360 px.
- `OpeningOverlay` takes `slots` and puts the percentage, label, door, failure line and Try again in their slots; without `slots` the
  Orrery stays until R18-27; focus trap, scroll lock, the 1.2 s self-open and the crossfade unchanged.
- Typecheck and the critical tier green (`progress.test.ts` unchanged).

### R18-10 — The Personal story's frames, and the globe (INTERNAL) — report-loading-story §1
Tier: opus — the chart's geometry, whose degrees must equal the hero's
Objective: a pure `frameAt` draws the five steps from the engine's chart (ADR-316 to 318) on an orthographic globe with Natural
Earth's coastline.
Files: new `web/src/lib/build-story.ts` (+ `build-story.test.ts`), `web/src/lib/globe.ts`, `web/src/lib/land-110m.ts` (Round start
5's file), `web/src/lib/easing.ts`.
Refs: report-loading-story §1, acceptance 1, 2, 4, 5; ADR-33, 316 to 318, 351; reading 13; R16-01/03's lesson.
Done when:
- `frameAt` as pinned: steps 1 to 4 in about 20 s (globe and brass point; the sky ring and each body stopping on its degree with the
  date counter; rings fold, names, aspect lines closest orb first, the closest pair named; the horizon drawn on the engine's Ascendant
  as a clock runs to the birth time, angles lock, the lower half darkens), then step 5's six pairs from `houses.ts`, about 7 s each, held.
- Blind: no horizon, angle or house, step 4's and 5's one lines, the Moon as its day's arc; every word from the artifact.
- `build-story.test.ts` (critical, listed by R18-16): Mira's globe centres on 38.72° N, 9.14° W and her horizon ends on Rising
  12°07′ Aries; the held frame's degrees equal the hero's to 0.01°; a blind frame has no horizon or house; `land-110m.ts` under 60 KB.

### R18-11 — The Compatibility story's frames (INTERNAL) — compatibility-loading-story
Tier: opus — two charts never joined, facts never interpreted
Objective: a pure `pairFrameAt` draws B then C on the spec's timing (ADR-347 to 350).
Files: new `web/src/lib/pair-story.ts` (+ `pair-story.test.ts`).
Refs: compatibility-loading-story (step table, acceptance); ADR-97, 98, 347 to 351; reading 12; R18-10's globe; R16-05, R16-21 lessons.
Done when:
- B: the globe turns to both birthplaces ("502 km apart" from `kmApart`), the Earth shrinks, the first birthday's sky settles on its
  plate, the second fades in on its own ("born 1 year, 5 months and 12 days later" from `bornLater`), the horizon across both. C:
  houses 1 to 12 light together on both plates, 5.5 s each, with the word, the object and each person's sign and planets in it; signs
  for a plate with no birth time; then "Now writing your report", held. All twelve words stay quiet on each plate (ADR-350).
- `pair-story.test.ts` (critical, listed by R18-16): the step times; no shape joins the plates; no frame word, anywhere in a line,
  from "easy", "tension", "comes naturally", "challenge"; a blind plate has no horizon or house; distance and gap on a fixture pair.

### R18-12 — The job queue, and the round's three tables (INTERNAL)
Tier: opus — schema run by every deploy's bootstrap, and a worker inside the API
Objective: a Postgres job queue worked by the API process (ADR-357), and the tables Timeline's setup and the walk's pictures write.
Files: new `packages/db/src/schema/jobs.ts`; `schema/timeline.ts` (`timeline_setups`), `schema/payments.ts` (`qa_shots`),
`schema/index.ts`; new `packages/db/scripts/migrate-add-jobs.ts` (step 3p in `scripts/bootstrap-db.sh`, its comment saying why);
new `api/src/lib/jobs.ts` (+ `jobs.test.ts`, archive), new `api/src/lib/jobHandlers.ts` (the registry, empty).
Refs: pinned tables and jobs; ADR-200, 357, 358, 360; R-7.3; MB-123; R14-01, R16-24 lessons; the promoted log rule.
Done when:
- The three tables as pinned, in drizzle and the script (`IF NOT EXISTS` throughout); no existing table changes, so step 1 stays.
- `jobs.ts` as pinned: `FOR UPDATE SKIP LOCKED` under a 5-minute lease, an expired lease retaken, a failure backing off from 30 s,
  doubling to an hour, stopping at `max_attempts` with a code; `stopWorker` waits, then hands back what's left; logs carry the job's
  id, kind, attempt and code, never its payload; done rows go after 7 days.
- On a scratch Postgres 16: `db:bootstrap` on main's tree, then this branch's twice, then an empty database twice, each clean;
  `jobs.test.ts` shows two workers never take one job and a key queued twice runs once; typecheck and the critical tier green.

### R18-13 — The pair's compute, and the Release's brain lists (USER-FACING) — B-45, B-46
Tier: opus — the brain: what the pair report is told about two charts
Objective: hard pairs match in either order; a blind chart's Moon keeps an aspect only when its whole day holds it; a change to the
pair's compute runs the Release's lab.
Files: `api/src/lib/synastryCompute.ts`; `api/src/lib/github.ts` (+ `github.guards.test.ts`); `api/src/prompts/prompts.test.ts`.
Refs: B-45, B-46; ADR-33, 81; R-4.4; `release.ts` (the lab runs only when `brainChanged`); the promoted caller rule.
Done when:
- `HARD_PAIRS` holds sorted keys, so saturn-pluto, venus-saturn and venus-pluto match; `computeCrossAspects` keeps a blind Moon's
  aspect only when the orb holds from 00:00 to 24:00 of the birth day.
- `BRAIN_PATHS` gains `pairInterpretation.ts`, `pairBrief.ts`, `synastryCompute.ts` and `overlays.ts`, `PAIR_BRAIN_PATHS` the last
  two; the guards test pins both lists; `prompts.test.ts`'s house-word check reads `web/src/lib/houses.ts`.
- The dry lab (`pnpm report:lab --dry --base r06`, pairs included) renders every pair fixture, and the report lists each pair's
  cross-aspects before and after (USER-FACING: the pair report's input moves); `pairBrief`, `pairInterpretation` and `overlays`
  tests (critical) green.

### R18-14 — QA checks what it can reach, then reads the walk first (INTERNAL) — B-31's /qa half
Tier: sonnet — two process files, each step pinned here
Objective: /qa reads the staging walk's verdict and pictures first, checks which sign-in and payment hosts it can reach, and says
plainly what it can't instead of filing it against the product.
Files: `.claude/agents/qa.md` (within 50 lines), `.claude/skills/qa/SKILL.md`.
Refs: QA-06 #11; B-31; ADR-272, 315, 360; MB-227 (the four hosts); R13-05's lesson.
Done when: the skill's first step fetches `/api/qa/latest` and, on staging, each step's picture (a 404 means none yet); it then checks
Clerk's and Stripe's hosts and the four named in MB-227, lists the unreachable as "not reachable from this session", and reads those
steps from the walk; a run with every host reachable is as before. If the session refuses the edit, the card stops, both lines join
B-31 and the close says so.

### R18-15 — Look-backs only to the past (USER-FACING) — Review 05/10 §4
Tier: sonnet — two small functions, the rule pinned by the spec
Objective: "Think back to" names only an occurrence before today; with none, no line.
Files: `web/src/lib/now-ahead.ts`; `web/src/site/lib/finder.ts`.
Refs: review-05-10 §4, acceptance 6; R16-23's lesson.
Done when: both take the latest occurrence before today in the reader's zone, never a later one, and print no line when there is
none; ages stay floored; the report shows, for audrey-hepburn's chart on 5 Oct 2026, each look-back line before and after;
typecheck and the critical tier green.

---

## Group 2 — the two report stories, Timeline's setup on the server, R, House by House, the hero, the walk's pictures

### R18-16 — The Personal report's loading story (USER-FACING) — report-loading-story §1
Tier: opus — the screen every buyer watches while their report writes
Objective: `BuildStory` draws R18-10's frames in R18-09's grid on the report's opening screen, and the page refetches the report when
the chart is stored (ADR-319).
Files: new `web/src/components/report/BuildStory.tsx`; `web/src/pages/ReportPage.tsx`; `web/src/hooks/useLiveReport.ts`;
`web/test.critical`.
Refs: report-loading-story §1, acceptance 1 to 6; ADR-47, 59, 316 to 319, 351; review-05-10 §9; reading 13; pinned shapes.
Done when:
- The story plays from the report's birth fields computed in the browser and holds the stored chart once `chartReady`; the
  percentage, label and Start reading keep their rule whatever plays; a blind chart's step 5 shows the Did you know card; reduced
  motion: the finished chart, its six pairs and the steps as a still list.
- `useLiveReport` refetches the report when `chartReady` turns true (a first GET before the chart is stored shows it within one
  poll); `ReportPage` passes `writtenOn` to the hero.
- `web/test.critical` adds `src/lib/return-to.test.ts`, `src/lib/build-story.test.ts` and `src/lib/pair-story.test.ts`; the buyer
  walk passes; `/web-taste` at 390, 768 and 1440 px.

### R18-17 — The Compatibility report's loading story (USER-FACING) — compatibility-loading-story
Tier: opus — two people's charts on one screen, facts only, the Owner's chosen B then C
Objective: `PairStory` draws R18-11's frames in the grid on the Compatibility report's opening screen, from the two stored charts.
Files: new `web/src/components/report/PairStory.tsx`; `web/src/pages/CompatibilityReportPage.tsx`.
Refs: compatibility-loading-story (acceptance); ADR-97, 98, 347 to 351; reading 12.
Done when: the story plays from the participants' stored charts and birthplaces and never joins the plates; each step's words sit in
the grid's slots; "Now writing your report" holds with the percentage and the door as today; a missing birth time leaves that plate
without horizon or houses and C reads signs; no sideways scroll at 390 px; reduced motion: the last frame, still; `/web-taste` at 390,
768 and 1440 px; typecheck and the critical tier green.

### R18-18 — Timeline written at setup: the server (INTERNAL) — Review 05/10 §5
Tier: opus — paid writes on a reader's behalf, only from the engine's list and under the spend cap
Objective: a subscriber's first open of Timeline starts its setup, jobs write every reading of the six months and every life cycle
(ADR-302, 358), and opening a card afterwards writes nothing.
Files: new `api/src/lib/timelineSetup.ts` (+ `timelineSetup.test.ts`); `api/src/lib/jobHandlers.ts`; `api/src/routes/timeline.ts`;
`api/src/lib/timelineReadings.ts`; `packages/api-spec/openapi.yaml`; the generated client and zod (codegen).
Refs: review-05-10 §5, acceptance 7; report-loading-story acceptance 7; ADR-199, 302, 327, 357, 358; readings 8, 9, 11; the pinned
contract; R13-10, R16-01, R16-29 lessons; the promoted rules.
Done when:
- The three routes as pinned: a start is idempotent and queues `timeline.reading` for reading 8's list in its order plus one
  `timeline.ahead`; GET answers the six steps with counts; no key the browser sends queues a write; a paused day waits for the next
  (`TIMELINE_PAUSED_LINE` where a line shows); GET /timeline/now queues nothing (`queueReadings` and `// MB-219 provisional` go).
- `timelineSetup.test.ts` on a stubbed model: one setup per account; counts equal `readsAs` events for the range and `lifeCycles` to
  90; a card opened after ready writes nothing and waits for nothing; the ahead job writes the next stretch and sets the replay once.
- Codegen twice, no diff; every caller of the changed exports grepped; the critical tier green.

### R18-19 — R on the dial, and the line that explains it (USER-FACING) — Review 05/10 §6
Tier: sonnet — one mark and one fixed line, each place named by the spec
Objective: the Timeline dial marks a planet going backwards with the chart's R beside its dashed ring, and the always-open line shows
under the dial while a planet in view is retrograde.
Files: `web/src/lib/dial.ts`; `web/src/components/timeline/Dial.tsx`; new `web/src/components/timeline/RetrogradeLine.tsx`;
`web/src/components/timeline/NowAhead.tsx`; `web/src/components/dashboard/YourWeek.tsx`; `web/src/site/sections/timeline/Hero.tsx`.
Refs: review-05-10 §6 (the line word for word); Part 6 (Round start 4); ADR-322; pinned `RetrogradeLine`.
Done when: R and the dashed ring on every planet whose speed is below zero that day (`speedAt`; Jupiter turns on 13 Dec 2026, Mars
runs back 10 Jan to 1 Apr 2027); `RetrogradeLine` prints the spec's line, always open, no X, under the dial on Now and ahead, Your
week and /timeline only while a planet in view is retrograde, never on the report's hero; typecheck and the critical tier green;
`/web-taste` at 390 px.

### R18-20 — House by House: the opposite house, R, and the quiet house's line (USER-FACING) — Review 05/10 §6, §7
Tier: sonnet — three lines on existing cards, each pinned by a spec
Objective: each house card names its pair; the R line sits beside the full chart and on each retrograde planet's card; a quiet house
gets back its small line.
Files: `web/src/components/report/HouseDeck.tsx`, `HouseCard.tsx` (+ `HouseCard.test.ts`); `web/src/lib/house-deck.ts` (+ test).
Refs: report-loading-story §3 ("Opposite: 7th, Partnership. Me · the other person."); review-05-10 §6, §7; ADR-321; pinned houses
and `RetrogradeLine`.
Done when: each card prints its opposite house, that house's word and the pair's words from `houses.ts`; the R line beside the full
chart and on each retrograde planet's card; a house with no planets prints "No planets here · <Sign> starts this house · its planet,
<Ruler>, is in your <Nth>"; checked on audrey-hepburn's chart (the r06 sample) computed at run time, the report listing her twelve
cards' new lines; typecheck and the critical tier green.

### R18-21 — The hero's Ascendant, and the report's date (USER-FACING) — Review 05/10 §7
Tier: sonnet — one component's two lines, the format pinned by the spec
Objective: under EAST · RISING the hero prints the Ascendant's value in the Sun's and Moon's own style, and says when the report was
written.
Files: `web/src/components/report/ReportHero.tsx`, `AngleGlyph.tsx`; `web/src/components/report/hero-layout.ts` (+ test).
Refs: review-05-10 §7, acceptance 9; R16-33; pinned `writtenOn`.
Done when: the "drawn facing south…" sentence becomes the Ascendant's value in the "19.07° Gemini · 1st (self)" form on both tiers;
the Ascendant's tick has room at 22 px; "Written on <date>" under the hero from `writtenOn`; a blind chart prints no Ascendant line;
checked on audrey-hepburn's chart at 390 and 1440 px, screens in the report; typecheck and the critical tier green.

### R18-22 — Three small fixes from QA-06 (USER-FACING) — B-53, B-54, B-55
Tier: sonnet — each fix named by its backlog line
Objective: the admin pages refuse like Sales; the STAGING badge stops covering the credits at 390 px; deleting a subscriber's
Personal report says what happens to Timeline.
Files: `web/src/pages/AdminPromptsPage.tsx`, `AdminLabPage.tsx`; `web/src/components/StagingRibbon.tsx`;
`web/src/components/DeleteReportDialog.tsx` (+ test).
Refs: QA-06 #8, #9, #10; ADR-262 to 264; `/ux-copy`; R16-29's lesson.
Done when: /admin/prompts and /admin/report-lab refuse with Sales' line and name no variable; at 390 px the badge and the credits
count don't overlap; for a reader with a live plan the delete dialog says Timeline stops opening while the plan keeps renewing, with a
link to Cancel on the Account page; typecheck and the critical tier green.

### R18-23 — The staging walk's pictures (INTERNAL) — ADR-360
Tier: opus — a public route on staging serving pictures of a signed-in walk
Objective: the walk keeps one masked picture per step of its newest walk, served beside its verdict, so /qa can read what it can't play.
Files: `api/src/lib/qaWalk/browser.ts`, `api/src/lib/qaWalk/index.ts` (+ `qaWalk.test.ts`); `api/src/routes/qa.ts` (+ `qa.test.ts`).
Refs: ADR-315, 360; reading 14; R17-25, 26; R13-10's lesson; the promoted log rule.
Done when: each step that ran leaves one JPEG taken with reading 14's masks, written to `qa_shots` in place of the last walk's; the
verdict lists `shots`; GET /api/qa/latest/shots/{step} answers image/jpeg with no-store on staging, 404 for a step without one and on
production, writes nothing and logs the step id only; tests on a stubbed page: the masks on every picture, only the newest walk kept;
`qa.test.ts` and `qaWalk.test.ts` (critical) green.

---

## Group 3 — the setup screen, readings kept current, the walk's new step, the orrery gone

### R18-24 — Setting up Timeline: the screen (USER-FACING) — Review 05/10 §5, report-loading-story §2
Tier: opus — a new screen with a drawn sequence, live counts and a once-only replay
Objective: the subscriber's first open of Timeline shows one setup screen on the R16 dial in the grid, ticking as the readings land,
and lets them in once this week is written.
Files: new `web/src/components/timeline/TimelineSetup.tsx`; new `web/src/lib/timeline-setup.ts`; `web/src/pages/TimelineAppPage.tsx`;
`web/src/lib/dial.ts`, `web/src/components/timeline/Dial.tsx` (the setup's drawing).
Refs: review-05-10 §5; report-loading-story §2 (ADR-320); ADR-351, 358; readings 8, 9; the setup player (Round start 4); R14-12.
Done when:
- With access and an own report, `state: none` posts the start and shows the screen: the chart whole; tracks drawn and planets landing
  one by one, Saturn and Jupiter first, at today's positions; then with no cut the date runs six months while gold lines grow to the
  points they touch and those houses light, R on retrograde planets, "N transits"; six ticks with the server's counts.
- Reading 8's "Almost there" with a way in; at ready "Your Timeline is ready" and Open Timeline, focused; a `replay` plays from step 3
  once with its line, then is marked seen; the Did you know card under the screen; reduced motion: the finished dial and the ticks.
- At 390 px first; `/web-taste` at 390, 768 and 1440 px; typecheck and the critical tier green.

### R18-25 — Readings kept current, in the background (INTERNAL) — Review 05/10 §5
Tier: opus — paid rewrites: only what changed, only from the reader's own open
Objective: a reading made stale by a new birth time, a new Timeline prompt version or a rewritten Personal report is rewritten at the
reader's next open, its kept text shown meanwhile (ADR-358).
Files: `api/src/lib/timelineSetup.ts` (+ `timelineSetup.test.ts`); `api/src/lib/timelineReadings.ts`; `api/src/lib/jobHandlers.ts`.
Refs: review-05-10 §5 (what can change a written reading); ADR-315, 358; reading 10; R16-24's lesson.
Done when: a reading's basis gains the Personal report's version; at GET /timeline/setup the stale readings queue `timeline.refresh`
once each and the open answers the kept text; nothing queues at a start or a deploy; tests on the stubbed model: a new birth time
rewrites only the readings it touches, a prompt bump rewrites each once, a second open queues nothing more; the critical tier green.

### R18-26 — The buyer walk sets Timeline up (INTERNAL)
Tier: opus — the buyer flow's guard in CI gains two steps
Objective: the shared step list gains Timeline's setup, so CI proves a subscriber's setup writes the engine's list and an open after it
writes nothing.
Files: `api/src/walk/steps.ts` (+ `steps.test.ts`); `api/src/walk/buyer.walk.ts`; `api/src/lib/qaWalk/steps.ts`, `qaWalk.test.ts`;
`api/test.critical`.
Refs: the shared step list (R17); ADR-273, 302, 315, 358; R18-18's routes; review-05-10 acceptance 7.
Done when: `timeline`'s cancel becomes a step of its own, `timeline-ends` (live on staging), with `timeline-setup` between them (local
on staging: it writes paid readings, ADR-315), in both maps; on the stubbed model with `drainJobs` the setup's counts equal the
engine's, then opening a card makes no model call; "buyer walk: 19/19 steps passed" on a scratch Postgres after `db:bootstrap`;
`api/test.critical` adds `src/lib/timelineSetup.test.ts`; `steps.test.ts` and `qaWalk.test.ts` green.

### R18-27 — The orrery goes (INTERNAL)
Tier: sonnet — deletions across seven files, one critical test moved to the new drawing
Objective: with both stories on the grid, the Orrery, its library and its positions leave the web.
Files: `web/src/components/report/OpeningOverlay.tsx`; `web/src/components/report/Orrery.tsx`, `web/src/lib/orrery.ts`,
`orrery.test.ts` (deleted); `web/src/hooks/useLiveReport.ts`; `web/src/pages/ReportPage.tsx`, `CompatibilityReportPage.tsx`;
`web/src/lib/gather.ts`; `web/src/lib/no-chiron.test.ts`.
Refs: ADR-59, 316; the promoted caller rule (the orrery's made-up Chiron, R14); B-58.
Done when: `OpeningOverlay` requires `slots`; `useLiveReport` and both pages drop `provisional`; `gather.ts` takes `easeInOutCubic`
from `easing.ts`; `no-chiron.test.ts`'s orrery case becomes the story's (on the 1799 and 2151 charts `frameAt` draws every body the
chart has and invents none); a grep finds no importer of the orrery; typecheck and the critical tier green.

---

## After the builders: the orchestrator's steps, not cards
1. **After group 3, once:** gitleaks over `main...round/R18` with CI's pinned version and config. No `csp:write`: no new host (the
   globe's data ships with the app; the explainer's `media-src` waits with §5).
2. **The tester, once** (ADR-273: the flow's sign-in, buy, own-report, pair and timeline steps change, and two steps are new), its
   base the round's first commit: `return-to` and the claim, B-34's two halves, the two stories' numbers, the setup and its walk
   steps check what the cards and the specs now say; a bug it finds is a fix for that card's builder.
3. **The gate:** install, typecheck, both builds, the critical tier, the buyer walk on a scratch Postgres ("19/19"), `check:shipped`,
   `check:copies`, `pnpm audit --prod`, codegen twice with no diff, `db:bootstrap` on the upgrade path twice and on an empty database
   twice, the archived Timeline walk once (its area changed), smoke, the probe and the site checks on the preview.
4. **The dry lab** after R18-13 (`pnpm report:lab --dry --base r06`, pairs included; free). No prompt file changes; if a builder
   reports one, the dry lab runs again for it.
5. **The sentinel** on `main...round/R18`, its eye on: the job queue (ids-only payloads and logs, the lease, no write from a browser
   key, the spend breaker); setup's writes and the deploy that must not start one; `return_to`; the claim's scope; B-34's cancel and
   refund; Link off; the pictures route and its masks; MB-233, read from its row; the Clerk id gone from `auth.ts`; `railway.json`'s
   start and stop; the brain lists.

## Staging confirmation, after the merge
1. Through the merge's deploy, `/api/healthz` polled every second answers without a 502 (B-48), or the report says what research found.
2. The deploy's walk at 0 ¢: each step that ran has its picture; `timeline-setup` reads local.
3. The Owner's look: a new Personal report's five steps on a phone; a Compatibility report's B then C; Timeline's setup from the
   admin's own first open on staging (about €0.07); a hard reload of `/dashboard` after 60 s idle shows the admin's own data; sign-in
   by emailed code from Get my report lands back on the birth form.

## Production after the round
Nothing sells. The next Release runs the full lab with its pair (R18-13 moved the brain lists and changed the pair's input), the gate,
the QA agent and the walk (the seed, about 10.5 ¢). On production the app stays behind the waitlist (ADR-167); the job worker runs on
both hosts; the admin's own first open of Timeline there writes his readings (about €0.07). B-34 is fixed before Timeline sells on
production; B-03 is still due before it does.

## Owner prerequisites (none blocks the build)
- **MB-227, the four hosts** (For the Owner 2): only if /qa is to play sign-in, checkout and the Portal itself.
- **MB-228** for the first live sale, with any Railway line R18-03's research finds; MB-114 and MB-115 as before.

## What it costs
| What | When | About |
|---|---|---|
| The dry lab and `--render` | in the round | 0 ¢ |
| A staging deploy's walk | every deploy | 0 ¢ (no setup starts) |
| A Timeline setup: the six months and every life cycle | a subscriber's first open (on staging: the admin, a tester) | €0.07 (Review 05/10 §5, Luna's listed price) |
| The next Release: the lab with its pair, and the walk's seed | when the Owner says promote | about 20 ¢ + 10.5 ¢ |

A setup and its rewrites count against the daily spend cap (ADR-199); the lab against `LAB_BUDGET_USD` (ADR-77). Nothing retries on
its own past `max_attempts`.

## Risks
1. **Schema** (R-7.3): three new tables (`jobs`, `timeline_setups`, `qa_shots`) and no change to an existing table; the upgrade and
   empty paths run twice each (R18-12).
2. **No new dependency** (ADR-200, R14-01's lesson): the coastline is a data module (Natural Earth, public domain); the lockfile
   doesn't move.
3. **The brain:** R18-13 changes what the pair brief is told (B-45, 46) and widens the Release's brain lists, so the next Release runs
   the lab with its pair; no prompt file changes. **Report content (USER-FACING):** the pair report's cross-aspects (R18-13), House by
   House's three lines and the covers in its cards and the evidence (R18-07, 20), the hero's Ascendant and date (R18-21); each card's
   done-when names its fixture run (the dry lab, `--render`, or audrey-hepburn's chart computed at run time).
4. **User-visible without locked words:** the replaced checkout tab's line and the methods' line (R18-01), the done page's longer wait
   (R18-03), the cookie line (R18-06), the delete dialog's Timeline line and the admin refusal (R18-22), the setup's "N transits" and
   the replay line's dates (R18-24). Each through `/ux-copy`; the close lists them before and after for the Owner.
5. **Spend:** none in the session; on staging and production a subscriber's first open writes their Timeline (about €0.07) and a stale
   reading's rewrite costs one reading; a deploy writes nothing (ADR-315, 358).
6. **Security:** ids-only job payloads and logs, writes only from the engine's list (R18-12, 18); `return_to` same-origin only and the
   claim limited to the session's unclaimed rows (R18-02); the pictures route, read-only, masked, staging only (R18-23); MB-233
   (R18-04); a Clerk id out of a log line (R18-02). The sentinel's list is After the builders 5.
7. **Deploys:** R18-03 changes how both hosts start and stop. With overlap, the old API serves while the new one's bootstrap
   migrates; this round only adds tables, so the old code never reads a changed one. If overlap is impossible on the service, the done
   page's wait carries B-48 and MB-228 gains one line.
8. **The `.claude/` edits** (R18-06's voice chart, R18-14's two QA files) may be refused inside a running round (R13-05's kind): each
   card closes without them and its lines go back to B-38 or B-31.
9. **Size:** 27 cards in three groups (15, 8, 4); the shrink path is in Parallel groups; three pushes plus fixes.
10. **Escalations:** none in R16 or R17, so no card or kind of card was escalated to Opus in two rounds running.
11. **Deferred from locked specs** (Scope deferred): report-loading-story §5 and §6 wait for the film's rendered file and HyperFrames;
    `sharing-and-circle` and Review 05/10 §1's rest go to R19; Review 05/10 §2 to §4, §7's prompt half, §8 and §10 go to R20.

## Lessons this plan guards
- **Promoted, the caller rule** (`builder.md`): R18-02 (App's query client), R18-05 (`CREDIT_LINE`'s readers, `creditPrices()`),
  R18-07 (every importer of `HOUSE_WORDS` and `HOUSE_THEMES`), R18-09 (`OpeningOverlay`'s props), R18-13 (`BRAIN_PATHS` in
  `release.ts`), R18-18 (GET /timeline/now's body, `queueReadings`' callers), R18-27 (`no-chiron.test.ts` and `gather.ts`, named here).
- **Promoted, the log rule** (`builder.md`): R18-02 (the claim's warn line), R18-12 (job logs: id, kind, attempt, code), R18-18, R18-23
  (the pictures route logs the step id only), R18-04.
- **Promoted, the pathspec rule:** every builder; group 1's fifteen share one tree.
- **Applied:** builders commit as they go; the tester's range from the round's base; one push per group and per fix.
- R13 · R13-05 (a running round can't edit its own skill) → R18-06 and R18-14 close without a refused `.claude/` edit.
- R13 · R13-10 (an unauthenticated route writing per value) → R18-23's route only reads; R18-18 never queues from a browser key.
- R14 · R14-01 (a dependency's packages unnamed) → no dependency; the coastline is data.
- R14 · R14-12 (focus on the wrong next control) → R18-02 lands where sign-in was asked; R18-24 focuses Open Timeline; R18-01's
  replaced tab links to the newest.
- R15 · R15-16, 17 (a route the gate closed; no card owning a mount) → R18-03 owns the start and the stop, R18-18 the setup routes
  behind Timeline's access check, R18-23 the pictures route beside the verdict.
- R15 · R15-18, 19 (an address shown that was never given) → R18-02's claim moves only the session's own unclaimed rows.
- R16 · R16-01, 03 (a spec promising what the code can't meet) → Round start 3 before group 1; R18-10's numbers are the spec's
  acceptance, from the engine.
- R16 · R16-01 (a range on a raw instant) → R18-18 builds the range from the view's own six months in the reader's zone.
- R16 · R16-05 (a rolled-over calendar date) → R18-11's `bornLater` is a calendar difference of real dates.
- R16 · R16-21 (a check that looked only at a start) → R18-11's forbidden words are checked anywhere in a line.
- R16 · R16-23 (an age rounded, not floored) → R18-15 keeps ages floored.
- R16 · R16-24 (a kept row spinning for good) → R18-03's done page stops at 120 s, R18-12 retakes an expired lease, R18-18 shows a
  failed reading's line and writes it on Read more.
- R16 · R16-14 (structured data stamped on every page of a kind) → R18-05 changes `faq.ts` only; FAQPage follows it page by page.
- R16 · R16-29 (a refusal line borrowed from another product) → R18-01's line speaks of checkout, R18-22's of Timeline, R18-18's
  paused day of Timeline (`TIMELINE_PAUSED_LINE`).
- R17 · R17-05, 19 (a shape guessed by another card of the group) → every seam between cards is in Pinned shapes.
- R17 · R17-08, 18 (a shipped line stating what our checks refuse) → R18-05 types no price, comments included; R18-06's cookie line
  says no more than Stripe's own names.

**Lessons read through R17.** R17's close wrote `lessons.md` (470c5f1, 2026-10-05); `main` at 77ed871 leaves it as it was, and no
line was added after R17's. This plan was written after R17 closed.

## Questions raised (Notion, 2026-10-06, sorted by R-12.3)
- **Decided by me** (Decisions, `Decided by: Claude`): ADR-357, Timeline's readings are written by one Postgres jobs table worked
  inside the API, no queue service or package; ADR-358, setup and rewrites start only from the reader's own open of Timeline, never
  from the webhook or a deploy; ADR-359, one Timeline plan per account (B-34); ADR-360, the staging walk's pictures, public on staging,
  masked.
- **The Owner's answer, recorded:** MB-225 "ok" (2026-10-06) → ADR-361 (`Decided by: Alex`); MB-225 decided, out of *Waiting on Alex*.
- **Needs you (Mailbox):** MB-227 (the four hosts QA can't reach; a note added, with its default) and MB-232 (no longer R18; its
  default now says /ideate next, planned with R19).
- **Backlog lines R18 does:** B-34, 38, 39, 41, 42, 44 to 49, 53 to 56, and B-31's /qa half; MB-233 (private). **Added:** B-58 (the
  status route's `provisional`, unread after R18-27). **Kept open:** B-03 (before Timeline sells on production); B-31's /round half (a
  session outside /round, R13-05); B-50 to 52, 57, 32 and 33 for R19; MB-212 and 214 with R19's invite and profile cards; MB-202, 207
  and 213 at launch.

## For the Owner (three asks, highest stakes first)
Approving this plan starts R18 at once (MASTERFILE §11.2). It sells nothing and spends nothing in the round.
1. **R18 as cut, and what waits.** All five sessions and the backlog are about sixty cards, too much for one round. Recommendation: R18
   as planned (27 cards: the sev-2 fixes and MB-233 first, all three loading screens on one grid, Timeline written at setup, the house
   set and the launch lines); R19 sharing and the circle with the rest of Review 05/10 §1; R20 the brain's half of Review 05/10 with
   one dry lab and a spot run. If you'd rather have sharing and the circle sooner, it swaps with R18's group 3, not with the fixes.
2. **Four hosts for QA (MB-227).** Recommendation: add challenges.cloudflare.com, hcaptcha.com, pm-redirects.stripe.com and
   billing.stripe.com to the allowed domains in the Claude Code environment's network settings, so /qa signs in, pays and opens the
   Portal itself. If silent: /qa says they're not reachable and reads the Railway walk's verdict and pictures for those steps.
3. **What we measure (MB-232) moves from R18.** No spec exists yet, and R18 is full. Recommendation: /ideate it in the next session,
   lock it, and plan it with R19. If silent: so.

## Scope deferred
- **R19:** `sharing-and-circle` (ADR-329 to 342) whole; Review 05/10 §1's rest: the empty dashboard's bundle buttons (a tap opens
  `/checkout` in the sandbox and returns to the birth form, since `POST /checkout/test` is gone, ADR-276), Ask and Your week after an
  own report, the admin's "see the dashboard as a new visitor", the Account preview with Cancel (with B-57); §7's pins (every tick-box
  item, three per report) and "Report from <date>" on a person's row (`HomePerson.createdAt`); B-50, 51, 52, 32, 33; MB-212, 214;
  MB-232's spec if it is locked by then.
- **R20, the brain's pass** (one dry lab, then a spot run against r06 on audrey-hepburn, athena, night-angular, high-latitude and
  oprah-winfrey): Review 05/10 §2 (the card's face, a year on every date, Heavy · Mixed · Light with its legend, Light headlines by
  hand, no "things"), §3 (Your week as bars, `weekSentence`), §4 (Life's drag line, the Your cycles card, ⓘ, past cycles, childhood,
  nodes), §7's houses prompt and rulers, §8 (Ask's pairs and credits, examples), §10 (rule 1's named ideas, retrograde in the words,
  every R planet in House by House); the covers lines into the doctrine and acceptance 9's grep (report-loading-story §3, §4); B-03.
- **Later:** report-loading-story §5 (Reading the sky on /method: chapter 1 has no rendered file here) and §6 (two reels in
  HyperFrames, not in the repo, through `/marketing` and your yes); B-58 once nothing reads `provisional`.

## Close (the orchestrator)
The backlog lines above leave `docs/backlog.md` as done; a Decisions row `Decided by: Claude` for each choice the round took on a rule;
a Mailbox row lists the round's new words before and after for the Owner's look; *Waiting on Alex* kept current. MASTERFILE: §3's
tables (`jobs`, `timeline_setups`, `qa_shots`); §4, the job worker in the API; R-4.4's brain paths (the pair's compute files);
§9 as built (one loading grid, the house objects in light indigo). INDEX's code map: `houses.ts`, `facts.ts`, `LoadingFrame`,
`DidYouKnow`, `BuildStory`, `PairStory`, `build-story.ts`, `pair-story.ts`, `globe.ts`, `jobs.ts`, `jobHandlers.ts`,
`timelineSetup.ts`, `TimelineSetup.tsx`, `RetrogradeLine.tsx`, `return-to.ts`; the orrery gone. INDEX's specs: report-loading-story §1
to §4, compatibility-loading-story and walk-line built; review-05-10 §5, §6's dial, §7's hero and House by House lines, and §9 built,
the rest R19 and R20. CLAUDE.md's focus: R18 shipped, R19 next. `lessons.md` takes each failure's cause. `/qa` on staging after the
merge's deploy walk, then the URL, the QA report, the walk's verdict and Staging confirmation's three lines go to the Owner.
