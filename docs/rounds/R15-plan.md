# R15 plan — the cleanup round: places from the server, the launch fixes, sharing your own report, one brain pass, the report section and the share cover

Planned 2026-10-03 on `claude/optimistic-feynman-42fi8x` (`main` at 30b45b6, R14's report merged) for four specs locked 2026-10-03, each
still only on its lock branch: `mailbox-sweep-03-10` (`claude/affectionate-ride-n4l2zb`, ADR-231 to 242; its lanes 2, 3 and 4 are this
round), `release-one-findings` (`claude/amazing-hamilton-kbhsdr`, ADR-246 to 248: MB-30 and three gaps in the sweep's cards),
`home-report-section` (`claude/home-report-section`, ADR-243 to 245) and `share-cover` (`claude/vibrant-ritchie-mh2gu2`, ADR-227 to 229).
**The four lock commits reach the round branch first:** `round/R15` is cut from `main`, and R15-00 (group 0) merges the four lock branches
into it, resolving the INDEX, MASTERFILE and playbook conflicts, before any builder reads a spec. **Order** (ADR-242, the Owner
2026-10-03): this cleanup round, then Timeline as R16 (`docs/rounds/R16-plan.md` on `claude/youthful-gauss-7snkqd`, not merged here: it
starts once this round has merged); pricing and checkout are not planned or slotted between rounds until the Owner starts them. **The old
`docs/rounds/R15-plan.md`** (pricing and launch, deferred five times) moved in this plan's commit to `docs/annex/pricing-and-launch-plan.md`,
to be renumbered at pricing's own /plan; INDEX's pricing line points there. **Not here:** lane 1 is paper, closed in the Mailbox on the
Owner's word, but for two file edits (R15-00 writes ADR-233's QA method into `qa.md`; ADR-234's line in `/round` is N1, outside the round);
lane 5 is the Owner's own (MB-102, MB-186). `timeline-page` (locked 2026-10-03, `claude/timeline-page-ideation`) is left out of R15 on the Owner's word;
its standing rule, "Simple words, everywhere" (the Owner, 2026-10-03), already binds every new string here through `/ux-copy`. QA-02 has no
sev-1, no Mailbox row is `blocking`, and no Owner comment sits on ADR-227 to 248 or on the rows this plan touches.
**Tiers:** 20 Opus, 9 Sonnet, no Haiku, and Opus for the contingent R15-C1. **Tags:** INTERNAL are R15-00 to 03, 11 to 13, 18 and 28;
every other card is USER-FACING. **The brain changes** (R15-04 names masked, R15-23 the prompts; R15-C1 if staging calls it): the dry lab
runs in the round, fixture runs are read on staging, and the next Release's full lab and QA agent gate production (R-4.4); report content
changes (R-5.5). **The schema changes** (R15-03). **The contract changes** (R15-02). **One dependency joins** (the zone table, MB-194,
R15-01) and about 28 dev libraries leave (MB-172). No credential is needed, nothing goes on GitHub, nothing reaches production in the round.

## Open Mailbox rows created more than 14 days ago (oldest first, ADR-186)
**2026-09-09:** MB-12 no error reporting or alerting · MB-19 no prompt version history · MB-20 the one e2e spec cannot pass, no lint
step · MB-21 variables missing from `.env.example` · MB-22 dead code left by the port. **2026-09-18:** MB-49 no API route can be
unit-tested. None blocks a card. Touched here: MB-22 (`/api/geocode` stops being dead, R15-16 rebuilds it; the port's unused `ui/` files
go, R15-01), MB-49 (R15-16's route test runs the geocode router in-process, since it imports no `db`), MB-20 (four new e2e specs ride the
site checks). MB-30, also from 2026-09-09, is decided (ADR-246) and built here. No row counts rounds: a row's age is its Created time.

## Round start (the orchestrator)
1. **Branch** `round/R15` from `main` and merge this plan's branch (the plan, the parked pricing plan, INDEX's pricing line). Then group 0.
2. **Decisions:** ADR-227 to 229 and 231 to 248 are recorded and locked; the round adds none.
3. **N1, outside the round:** before it runs `/round R15`, the main session adds ADR-234's line to `.claude/skills/round/SKILL.md` ("push
   once per parallel group and once per fix"), on the Owner's approval of this plan, as R14's N1 was (e8fd467). Never a card: a card
   editing the running skill was refused (R13-05). The rule binds this round either way (Preconditions 9).
4. **MB-194, the zone table:** the researcher (Opus) on "which offline coordinate-to-IANA-zone library for the API: border accuracy,
   zones right before 1970, size, upkeep, its dependency tree, a release older than 7 days", given Found 5; then the verifier (Sonnet) on
   its claims. R15-01 installs the verified pick. If both candidates fail, R15-01 skips it, R15-16 and 17 wait, and the round goes on.
5. **Screens:** builders cannot open claude.ai. Extract into the session scratchpad, phone first then desktop: the sweep's artifact (your
   quick look with Share my report, the share sheet, the recipient's circle with Share yours back, Not me's handback, the rows with Change
   address, Stop sharing in the third person, the wheel's focus, the Clerk line, the waitlist error), release-one-findings' place flow,
   home-report-section's option A at 390 px and desktop, and share-cover's cover A. Where a builder's draft differs, the artifact wins and
   its report says so; §9 and MB-196 win over the artifact on the focus colour.
6. **The dry lab's base:** `git fetch origin report-lab/r06 && git checkout FETCH_HEAD -- fixtures/reports/` (never committed).

## What already shipped (checked at 30b45b6)
- **Met, and reused:** `/api/geocode` mounted with its two-letter rule (R14-09); the engine's `offsetAtBirth` (`chartCalculation.ts:367`)
  and `skyAt`; the web's Košice ranking (`places.ts:128`); `clockWords`, `useEntryFormat`, `partLabels` (R14); `HorizonWheel`'s `hud` and
  `arrival` props; `Checklist` with `localTicks`, `withHouseWords`, `splitReading`, `plainProse`, `HouseCard`'s check, `SAMPLE`;
  `render-brand.mjs` (Playwright through e2e); `smoke-run.yml`; `githubApi` and `GITHUB_RELEASE_TOKEN` (contents write, Railway staging);
  `report-lab.yml`'s `chart=` and `pair=`; the three `inject-*` charts; `dataBlock`, `outsideDataBlocks`, `DATA_RULE`; `natalReportAccess`,
  `sendStateFor`, `pairReadable`, `handOver`; `createSendInvite`, `sendReportEmail`; `StopSharingDialog`, `SendDialog`, `WaitingGiftCard`;
  `LIMITS` and `holdWrites`; the walk on a scratch Postgres (`loop.walk.ts`).
- **Not met:** the browser guesses a zone from the longitude (`places.ts:169` `fallbackZone`, `PlaceField.tsx:32`), and so does the API
  (`geocode.ts:54`); the birth form sends that guess (`BirthFormPage.tsx:108`); the place card prints today's offset (`PlaceField.tsx:330`);
  `focus-visible:outline-none` on every wheel stop (`NatalWheel.tsx:254, 399`), and home's wheel has 25 stops that do nothing
  (`Claims.tsx:753`); `/claim`, `RequireAuth`, `/sign-in` and the admin pages wait on Clerk for ever (`ClaimPage.tsx:148`, `App.tsx:188`,
  `AdminLabPage.tsx:56`, `AdminPromptsPage.tsx:417`, `AdminWaitlistPage.tsx:82`); a bad email leaves focus on the button and the field has no
  outline (`WaitlistForm.tsx:55`, `site.css:174`); /method's arcminute claim covers Chiron too (`MethodPage.tsx:87`); the Elements note
  (`readouts.ts:96`); "Natal Report" and "Synastry Report" (`page-title.ts:4, 27`); no bundle line in `BundleList` (`credits-view.ts:48`);
  times built outside `clockWords` (MB-178's list); `readDate` refuses "4 May 1929" (`date-entry.ts:295`); focus leaves a 12-hour time at its
  fourth digit (`BirthTimeField.tsx:88`); a birth-time change passes every complete report and holds a write each (`profiles.ts:343`);
  regenerate needs "owner" (`reports.ts:740`); the quick look prints one Moon degree (`home.ts:162` `spotOf`); `OUTSIDE_STEP` 118 pushes a
  near Sun off the triad plate (`hero-layout.ts:15`); nudge rows 1 to 3 and `sd.nudge.seen` (`nudges.ts:16`, `processors.ts:123`); no route
  returns a lab run's text, so /sample cannot be refreshed from a Release; the release lab prices a run at gpt-5.2 (`releaseLab.ts:24`); the
  origin pattern takes any `starsdecoded-*.vercel.app` (`origin.ts:8`); 43 unused `ui/` files; bootstrap step 2 cannot fail
  (`bootstrap-db.sh:26`); your own chart cannot be shared (`invites.ts:332`, `own_chart`); Not me keeps the report (`ClaimPage.tsx:381`);
  one workbook per report (`reports.ts:581`); retries feed model text back with its names (`aiInterpretation.ts:350, 482, 689`); the share
  cover is `opengraph.jpg` (`head.ts:15`).
- **Found while planning:**
  1. The web renders only listed prompt versions (`web/src/types/chart.ts:430, 433`) and home lists pairs by version (`home.ts:223`): a bump
     to v10 and p5 without them would hide every new report. Pinned (R15-21, 23, 27).
  2. `og:image` always names production's host (`head.ts:15`), so before a Release, staging's smoke can fetch the new cover only from its
     own host (R15-13's rule).
  3. A preview's `/api` is staging's, which runs `main` until the merge: an e2e step that needs this round's API stubs it (`page.route`).
  4. Bootstrap step 2 (`drizzle-kit push`) runs before the 3x scripts, so push may make a new table first; R15-03's backfill runs either way.
  5. MB-194's facts, from the npm registry and each package's README (its author's): geo-tz 8.1.9 (2026-09-16), an exact polygon lookup;
     its comprehensive data, `geo-tz/all`, is "appropriate ... including years prior to 1970"; a point at sea answers a zone at sea; it reads
     its data from disk, so esbuild must leave it external; 74 MB unpacked, four direct dependencies, roughly two dozen in its tree (turf's
     point-in-polygon; geobuf, with the shapefile and stream libraries of its command line). @photostructure/tz-lookup 11.7.0 (88 KB, no
     dependencies): its README says "if accuracy is important ... use geo-tz" and differs from it at about 1 inhabited point in 10.
  6. `WaitlistForm.tsx:110` already sets `aria-invalid` and `aria-describedby`; focus and the outline remain (MB-184).
  7. Lane 1 left two file edits undone: ADR-233's method is not in `.claude/agents/qa.md`, and ADR-234's line is not in `/round`.
  8. Three open rows say "R15" for pricing's round (MB-144, 148, 192): a dated note on each.
  9. `NatalWheel` has two callers with no `onSelectHouse` (`Claims.tsx:753`, `HouseDeck.tsx:192`).
  10. MB-142's "two staging reports" sit on public branches: `report-lab/r14-staging` (five natal runs on mix B) and `report-lab/r12c-pair`,
      `r12d-pair` (pairs).

## Where the specs disagree, and how this plan settles it
1. **The sweep's "R15-plan.md is renamed to its number then"** against this round needing that path → parked in the annex now.
2. **"The library is picked at /plan by the researcher and checked by the verifier"** against a planning session that cannot spawn
   agents → /plan read both READMEs and the registry (Found 5, MB-194), and the pair runs at Round start 4.
3. **MB-177's "brass focus outline"** against §9 ("brass … is never a control"), with no Decisions row between them → the site's focus
   colour (MB-196's default; R-0.1).
4. **R-6.1's "no other user regeneration"** against lane 2 row 12's Regenerate on an older report → the same birth-time update reaching
   that report, free like the first; whether a second update charges stays pricing's (MB-120, noted today).
5. **Share-cover's tier hint** (one Sonnet card) against the rubric (more than one package) → Sonnet for the smoke step (R15-13), Opus for
   the cover (R15-14).
6. **Lane 4's MB-87, 92, 132, 142 and 143 are open rows** the lock schedules → built at the lock's words, provisional, seams tagged.
7. **MB-177's "outline on every stop"** against the gap's "home's wheel takes no stop" → both: `stops={false}` on home, outlined elsewhere.
8. **Lane 2 row 18's `scripts/src/refresh-sample.ts`** against the later ADR-247 (amending ADR-223's step) → no script: the Release pushes
   the run itself (R15-12), and the session's pull request updates the import, the digest and the picks.
9. **R-7.1's "the browser-side Nominatim call is a known exception"** → gone with MB-30; the close strikes it (§4 and R-4.1 already changed
   in the findings lock).

## Goals
1. **No chart from a guessed zone** (ADR-246; MB-30, 162, 179): places and zones from the server, a place without one refused, the offset
   always the zone's at the birth date, no geocoder or zone service called from the browser.
2. **QA-02's and the sweep's launch fixes** (lane 2's 22 rows and the findings' three gaps), each with a test that failed first.
3. **Sharing kept honest** (ADR-235 to 239): your own Personal report shared from your quick look, Share yours back, Not me hands it back,
   Change address, Stop sharing in the third person, workbook ticks per reader.
4. **One brain pass** (ADR-240; MB-87, 92, 132, 142, 143): names masked in model text sent back, floors where sections run short, the
   room rule with its idioms, the model sentence, the house words; dry lab, staging spots and fixture runs.
5. **What the site shows** (ADR-227 to 229, 243 to 245): two workbook cards after the hero and at the end of /sample; the hero as a still
   under a new file name; the deploy smoke fetching the preview as WhatsApp and Facebook, run on production first to find out why
   WhatsApp shows nothing.

## Preconditions
1. No builder starts before R15-00 has put the four specs on `round/R15`. Builders read MASTERFILE §0, their card, and the spec sections,
   readings and pinned shapes it names, never a lock branch.
2. **Single owners.** Each card's files as listed, no file in two cards of a group. Across groups: `ClaimPage.tsx` (R15-08, then 26),
   `ReportPage.tsx` (R15-09, then 27), `processors.ts` (R15-10, then 17), `LearnBirthTimePage.tsx` (R15-06, then 17), `DashboardPage.tsx`
   (R15-10, then 25), the type lines of `pair-row.ts`, `orbit.ts`, `access.ts` and `home.ts` (R15-02, then 25, 24, 18 and 21),
   `aiInterpretation.ts` (R15-04, then R15-23's version line), `api/package.json` (R15-01, then 28). `vercel.json` and
   `web/src/site/site.ts` → the orchestrator.
3. **R15-01 is the round's only change to the dependency tree.** A builder who needs a package stops; no card imports a `ui/` file R15-01
   removes.
4. Inside a group a card may land before one it imports (pinned shapes): a red intermediate is accepted until the group ends, and every
   group ends green. A builder who needs a pinned shape changed stops (R-0.1).
5. **No card spends or reaches a network.** Models, Nominatim and GitHub are stubbed (`testModel.ts` and the like); walks run on a scratch
   Postgres. The orchestrator's staging runs are the round's spend (Staging confirmation).
6. **Seams:** `// MB-87, 92, 132, 142, 143 provisional` (R15-23), `// MB-138 provisional` (R15-09), `// MB-194 provisional` (R15-16),
   `// MB-196 provisional` (R15-05). A card that touches a file carrying `// MB-89, 128, 130, 145 or 146 provisional` turns it into a
   citation of ADR-231 (decided as built).
7. **The promoted rule** (`lessons.md`, ADR-195): before changing a shared export, a pinned value or what a function may return, grep every
   caller; a caller outside the card's files is named in its report, never left on the old shape.
8. **Every lane 2 card adds a test or an e2e step that fails on `main` before its fix** (sweep acceptance 2), and says which.
9. One push per group and one per fix (ADR-234). A builder commits as soon as its own tests pass (R13-01).
10. **Words:** every new string through `/ux-copy` ("Simple words, everywhere"), every screen through `/web-taste`, 390 px first; each card
    lists its new strings for the Owner's look.

## Readings pinned where the specs are silent
1. **A zone** is the table's first answer for a hit's coordinates; an `Etc/` answer (at sea) counts as none. A search whose hits all lack a
   zone answers 422 `no_zone`, "Pick a nearby town." The offset printed or sent is always `offsetAtBirth(zone, date, time)`.
2. **The place card** prints no offset until a full birth date is typed, then the zone's offset on that date at the typed time, or at noon
   without one (MB-179). A saved draft place without a zone is dropped, so the reader picks it again.
3. **A share** is a `share` invite on the send-and-claim path (7 days, counted with sends) for the reader's own finished Personal report,
   marked as theirs; its claim writes a grant, never a hand-over. The recipient reads the whole report (ADR-235, Q1), never its workbook,
   and cannot send, delete or regenerate it. One active grant per report and reader.
4. **Share yours back** shows on the claim's success and on the sharer's quick look while `shareBack` is true: the reader has a finished
   Personal report of their own, not yet shared with that person. One tap grants it at once, with no email (both are known).
5. **Stopping a share** is the sharer's, from their own quick look's list, through `StopSharingDialog`; it revokes the grant or the waiting
   link at once, the sharer leaves the recipient's circle, and a pair the recipient built on that chart closes (`stoppedBy`).
6. **Not me** (ADR-236) on a report sent to the reader offers Hand it back and Cancel only. Handing back clears the claim
   (`claimedByUserId`, `claimedAsSelf`), returns that profile's participant grants to the writer and stamps the send `handed_back_at`; the
   writer's row reads "Handed back" with Send again (a new send). On the writer's own chart, Not me unmarks it as today.
7. **Change address** (ADR-237) on a waiting send or gift, in one transaction: the old token revoked, a new token and email to the new
   address; a gift keeps its held credit and `returnsAt`. Once claimed or expired: 409 `not_waiting`.
8. **A reader's workbook key** (`readerKey`) is their Clerk user id, else `session:<session id>` (staging's signed-out readers). The
   backfill copies each report's non-empty `reports.workbook` to its holder (a natal report's profile `user_id`, a pair's relationship
   `user_id`, else the report's session); `reports.workbook` is no longer written (MB-195).
9. **Outdated** is a complete natal report whose written basis (its stored `meta.horizon` and the birth time it was written for) differs
   from its profile's now; a birth-time change passes the newest complete report and leaves the others outdated. Regenerating one is free
   (Where the specs disagree 4).
10. **Who regenerates** (`mayRegenerate`): the writer, and the holder after a hand-over (MB-169); never a `shared` reader, nor a `claimed`
    one who does not hold the row. Try again and Regenerate show only where it is true.
11. **The Moon's range** prints "Moon 2.41° to 8.90° Pisces", or across a cusp "Moon 28.12° Aquarius to 3.40° Pisces", from `Spot.band`
    (the stored chart's Moon band), on a windowed birth time only.
12. **The Clerk line** shows after 8 s without Clerk: "Sign-in couldn't load. A content blocker may be stopping it." with Try again (a
    reload). An invite's preview and its 404 never wait for Clerk; only claiming does.
13. **Titles:** the tab and the saved PDF say "Personal Report" and "Compatibility Report"; no "Natal" or "Synastry" stays in `page-title.ts`.
14. **/sample's push** (ADR-247) runs after `forward` passes, from the release lab's `audrey-hepburn` natal run (the reused lab's on a
    retry); its outcome is a line in `forward`'s detail, never a failed release; with no run or no token it is skipped with the reason.
15. **The cover's minute** is the one `pnpm brand:render` drew, stamped with London's coordinates in `web/src/site/data/share-cover.ts`.
16. **Prompt versions:** natal `v10`, pair `p5`. The web renders v6 to v10 and p2 to p5; home lists pairs p2 to p5.
17. **Floors** are stated only for sections the stored runs show under their band, as "at least N words" in that section's prompt; a
    section still short on Luna after the staging run moves alone to Sol (MB-129's rule, ADR-231; R15-C1).

## Pinned shapes
- **Schema** (R15-03). `profile_shares { id text PK; profile_id text NOT NULL → profiles(id) ON DELETE CASCADE; owner_user_id text NOT NULL;
  reader_user_id text NOT NULL; invite_id text → invite_tokens(id) ON DELETE SET NULL; created_at timestamp NOT NULL DEFAULT now();
  revoked_at timestamp }`, unique (profile_id, reader_user_id) WHERE revoked_at IS NULL, indexes on reader_user_id and owner_user_id.
  `report_workbooks { report_id text NOT NULL → reports(id) ON DELETE CASCADE; reader text NOT NULL; workbook jsonb NOT NULL DEFAULT '{}';
  updated_at timestamp NOT NULL DEFAULT now(); PRIMARY KEY (report_id, reader) }`. `invite_tokens.handed_back_at timestamp NULL`.
  `INVITE_KINDS` = send | gift | share (text, no DDL). Bootstrap step `3m/7`, after 3l.
- **Contract** (R15-02; operationIds in brackets). `Access` and `HomePerson.access` gain `shared`. `HomePerson.shareBack?: boolean`,
  `HomePerson.canRegenerate?: boolean`. `SpotPoint { sign; degree }`; `Spot.band?: { from: SpotPoint; to: SpotPoint } | null` (the Moon, a
  windowed birth time). `Report.canRegenerate?: boolean`, `Report.outdated?: boolean`. `SendState.state` gains `handed_back`.
  `InvitePreview.kind` and `InviteClaimResponse.kind` gain `share`; `InviteClaimResponse.shareBack?: boolean`. `GeocodeResult.timezone` is
  required; `GET /geocode` adds 422 `no_zone`. `CreateShareBody { email }`; `ShareCreated { id; email; claimUrl; expiresAt;
  emailDelivered }`; `Share { id; email; readerName: string | null; state: waiting | active; sentAt }`; `ShareBackBody { profileId }`;
  `ChangeAddressBody { email }`; `HandBackResponse { profileId }`. Paths: `POST /shares` [shareMyReport] 201, 400, 401, 409 (no_own_report
  | not_ready | already_shared), 429; `GET /shares` [listShares] 200 `Share[]`; `DELETE /shares/{id}` [stopShare] 204, 404;
  `POST /shares/back` [shareBack] 201 `Share`, 404, 409; `POST /profiles/{id}/hand-back` [handBackProfile] 200, 404, 409 not_claimed;
  `POST /invites/{id}/change-address` [changeInviteAddress] 200 `InviteSummary`, 404, 409 not_waiting, 429;
  `POST /gifts/{id}/change-address` [changeGiftAddress] 200 `GiftCreated`, 404, 409 not_waiting, 429.
- **Server** (R15-18, for R15-19 to 22). `access.ts`: `canReadProfile(viewer, profile, shared = false)`, `accessFor(viewer, profile,
  shared = false)` ("shared" when only a grant reads it), `natalReportAccess(viewer, profile, report, shared = false)`,
  `mayRegenerate(viewer, profile, report): boolean`, `readerKey(viewer): string`, `sendStateFor` answering `handed_back`,
  `pairReadable(viewer, parts, shared: ReadonlySet<string> = new Set())`. `shares.ts`: `sharedProfileIds(userId): Promise<Set<string>>`,
  `sharesOf(ownerUserId): Promise<ShareRow[]>`, `grantShare(tx, { profileId, ownerUserId, readerUserId, inviteId }): Promise<string>`,
  `revokeShare(id, ownerUserId): Promise<boolean>`, `shareBackOffered(readerUserId, profileId): Promise<boolean>`.
- **Web.** `NatalWheel` gains `stops?: boolean`, default true (R15-05, for 06). `StopTarget.kind` gains `"share"` (R15-25, for 24).
  `HandBackDialog({ target: { profileId: string; giverFirstName: string } | null; onClose })` (R15-25, for 26). `ShareMySheet({ open,
  onClose })` (R15-24).
- **Versions** (R15-23, for 21 and 27): `PROMPT_VERSION = "v10"`, `PAIR_PROMPT_VERSION = "p5"`.

## Parallel groups
**Group 0**, one message once Round start 1 to 4 are done: R15-00 (the locks, docs only) and R15-01 (the dependency tree), disjoint.
**Group A**, one message once 0 is green: R15-02 to R15-15. R15-05's `stops` prop is pinned for R15-06. Then the orchestrator runs
`csp:write` if a card says JSON-LD moved, and dispatches Smoke on `round/R15` with `target=production` (keyless): R15-13's step shows why
WhatsApp gets no preview from production, and the answer goes in the round report.
**Group B**, one message once A is green: R15-16 to R15-27, on A's contract and schema and group 0's dependency. Inside it R15-19 to 22 call
R15-18's pinned functions, R15-24 opens R15-25's `StopSharingDialog`, R15-26 opens R15-25's `HandBackDialog`, and R15-21 and 27 hold
R15-23's versions. Then `site.ts`'s `updated` dates and `csp:write` (the orchestrator).
**Group C:** R15-28, the walk. Then the gate.
**Group D, contingent:** an Opus card per blocking sentinel finding; a Sonnet card per page family for what the preview's site checks find
(a budget is never loosened); R15-C1 after Staging confirmation 3.
**Tiers:** Opus R15-01 to 04, 08, 11, 12, 14 to 26 (and C1); Sonnet R15-00, 05 to 07, 09, 10, 13, 27, 28; Haiku none, since no card is
only mechanical. **The tester** runs after groups A and B over their changed files under `api/src/lib/`, `packages/*` and `web/src/lib/`.
**If R15 must shrink:** R15-10, then R15-09, then R15-11 move to the next round first; lane 3, MB-30, the brain pass, the report section
and the cover stay.

---

## Group 0 — the locks on the branch, and the dependency tree

### R15-00 — The four locks on `round/R15`, and the QA method in qa.md (INTERNAL)
Tier: sonnet — docs only: merges with editorial conflict resolution, no code.
Objective: every builder reads the four locked specs on the round branch, and ADR-233's cloud QA method is where the qa agent reads it.
Files: `docs/INDEX.md`, `MASTERFILE.md`, `docs/annex/owner-playbook.md` (their conflicts only); `.claude/agents/qa.md`.
Refs: ADR-227 to 248; MASTERFILE §10, §11.2; R-10.1, R-10.2; the four lock branches (header); QA-02's method line.
Done when:
- `git merge --no-ff` of `origin/claude/affectionate-ride-n4l2zb`, `amazing-hamilton-kbhsdr`, `home-report-section` and
  `vibrant-ritchie-mh2gu2`, in that order, each its own merge commit, never squashed; the four specs sit under `docs/specs/locked/`.
  (A trial merge at /plan: the sweep merges clean; INDEX conflicts with the other three, the playbook with the last two; MASTERFILE none.)
- INDEX: one Decisions line (248 rows, each lock's span), the sweep's Mailbox line, the four specs' entries, this plan's pricing line,
  at most 60 lines. MASTERFILE: 0.26 once, every lock's hunk present (R-3.6, §9's asides and cover, §4 and R-4.1, §11.2's smoke).
- The playbook keeps each lock's rule, a repeat merged into one ("He orders the rounds", "Less text …"), at most 60 lines.
- `qa.md` gains ADR-233's method in at most four lines (the preinstalled Chromium by `executablePath`, the proxy CA pinned by SPKI for that
  browser alone, Nominatim and timeapi.io stubbed, certificate checks on), the file at most 50 lines; the diff from `main` is docs and qa.md.

### R15-01 — The dependency tree: the zone table in, the unused ui files and their libraries out (INTERNAL) — provisional MB-194
Tier: opus — supply chain is security, and it changes what the API ships.
Objective: the API carries the verified zone table, and the web stops carrying 43 unused files and the dev libraries only they use (MB-172).
Files: `api/package.json`, `web/package.json`, `pnpm-lock.yaml`; `web/src/components/ui/**` (deletions only); new `scripts/src/ui-imports.test.ts`.
Refs: ADR-200, 246; R-7.4; MB-172, MB-194; R14-01's way; Round start 4; lessons (R14 · R14-01: every transitive package named).
Done when:
- Every `web/src/components/ui/` file nothing imports, with what only it imports, is deleted, and each dev library only they used leaves
  `web/package.json`, each named in the report; `ui-imports.test.ts` fails on a `ui/` file nothing imports, and it failed on `main`.
- `api/package.json` gains the verified pick at an exact version (geo-tz 8.1.9 by MB-194's default), every package its tree adds named in
  the report with its publish date, none younger than 7 days, none running an install script.
- `pnpm install --frozen-lockfile` clean twice; `pnpm audit --prod --audit-level high`, `check:copies`, typecheck and both builds green.

---

## Group A — the contract, the tables, the first brain card, the launch fixes, the cover and the report section

### R15-02 — The contract and codegen (INTERNAL)
Tier: opus — the contract spans three packages, and widening `Access` reaches callers in two more.
Objective: every shape groups B and C call, in `openapi.yaml`, with the client and zod regenerated and nothing broken.
Files: `packages/api-spec/openapi.yaml`; `packages/api-client-react/src/generated/**`, `packages/api-zod/src/generated/**` (codegen); the
type lines the widened enums break (`web/src/lib/pair-row.ts`, `orbit.ts`; `api/src/lib/access.ts`, `home.ts`), behaviour unchanged.
Refs: pinned contract; R-7.2; ADR-235 to 237, 246; MB-30, 103, 104, 109, 137, 139, 169, 170; the promoted rule.
Done when:
- Every pinned schema, path, response and operationId is in the spec with a one-line description naming its ADR or MB; every change is
  additive but `GeocodeResult.timezone`, which becomes required.
- Codegen, then typecheck green, each caller the new enum values break moved minimally (a `shared` reader treated as no seat and no Send
  until group B) and named in the report; a second codegen leaves no diff.

### R15-03 — The tables: share grants, per-reader workbooks, the handback stamp; bootstrap step 2 can fail (INTERNAL)
Tier: opus — schema, run by every deploy's bootstrap.
Objective: the tables lane 3 writes, in place before any route reads them, idempotent, and a push that fails stops the deploy (MB-123).
Files: new `packages/db/src/schema/shares.ts`, `reportWorkbooks.ts`; `packages/db/src/schema/index.ts`, `inviteTokens.ts`; new
`packages/db/scripts/migrate-add-shares-and-workbooks.ts`; `scripts/bootstrap-db.sh`.
Refs: pinned schema; R-7.3, §3; ADR-235, 236, 239; MB-103, 104, 110, 123, 195; readings 3, 6, 8; Found 4.
Done when:
- Both tables, their indexes and `handed_back_at` exist as pinned, in drizzle and in the script (`IF NOT EXISTS` throughout); `INVITE_KINDS`
  gains `share`, every caller grepped; the backfill (reading 8) runs whichever made the table, with `ON CONFLICT DO NOTHING`.
- Step `3m/7` runs the script, its comment saying why; step 2 captures push's output and exits 1 on an error line (as step 7 reads one),
  shown with a unique index over duplicate rows on a scratch database (MB-123's reproduction), where `main`'s step 2 exits 0.
- On a scratch Postgres 16 with a dummy `OPENAI_API_KEY` (MB-80): `db:bootstrap` from `main`'s tree, then this branch's twice, then an
  empty database twice, each clean; a seeded report's ticks reach its holder once; `packages/db` tests green.

### R15-04 — Typed names out of model text sent back into a prompt (USER-FACING · brain)
Tier: opus — the brain: what goes back into a prompt on a retry or a repair.
Objective: no name a reader typed reaches a prompt outside its data block, whatever a model wrote back (ADR-240, MB-152, sentinel S8).
Files: `api/src/prompts/data.ts` (+ `data.test.ts`); `api/src/lib/aiInterpretation.ts`, `pairInterpretation.ts` (+ tests); new
`fixtures/pairs/inject-instruction-curie.json`.
Refs: ADR-202, 240; R-4.4, R-5.5; security-hardening scope 7, 8; MB-152; R14-C1's card.
Done when:
- `maskNames` turns typed names (whole or first word, any case) in model text into A or B (a pair's two) or a data block (a natal reader)
  before it re-enters a prompt: YOUR LAST REPLY (`retryTail`), PROSE AS WRITTEN, chapter 07's tail and the foundation JSON.
- Tests plant the three `inject-*` names in each path and find none outside a data block (`outsideDataBlocks`); `DATA_RULE` and
  `PROMPT_VERSION` are unchanged (the version is R15-23's).
- The new pair names `inject-instruction` and `marie-curie` by fixture (birth data only, R-3.1), so a pair spot can carry the name.
- The gate's dry-lab injection table is clean with the new pair; Staging confirmation 2's natal and pair spots obey nothing.

### R15-05 — The wheel's focus, and a way past it (USER-FACING) — provisional MB-196
Tier: sonnet — an accessibility fix inside one existing component, with its e2e spec, in one package.
Objective: every wheel stop shows where focus is, a reader can skip the wheel, and a wheel whose stops do nothing has none (MB-177).
Files: `web/src/components/chart/NatalWheel.tsx`; `web/src/components/report/HouseDeck.tsx` (its second wheel only); new
`e2e/tests/wheel-focus.spec.ts`.
Refs: MB-177, 196; QA-02 #4; §9 (brass is geometry); release-one-findings scope 2; pinned web (`stops`).
Done when:
- Each house and planet stop draws a 2 px outline in the site's focus colour on `:focus-visible` (MB-196), the wheel otherwise unchanged;
  "Skip past the chart wheel" before the svg, shown on focus, lands after it.
- `stops?: boolean` (default true): false draws no stop and no skip link; HouseDeck's wheel without `onSelectHouse` passes false.
- The spec at 1440 px: on /sample every stop of House by House's wheel (25 on Audrey Hepburn's chart) shows the outline (a pixel diff
  against none), and Tab on home passes the wheel with no stop (with R15-06's prop); it failed on `main`.

### R15-06 — One clock for every printed time, Chiron's source on /method, the Elements line gone (USER-FACING)
Tier: sonnet — display strings and two lines across existing site components and helpers, in one package.
Objective: every time the site prints follows the reader's clock (MB-178), /method's claim is literally true (MB-180), and the Elements
note leaves home and /method (MB-181, ADR-241).
Files: `web/src/lib/birth-time.ts`, `sky-now.ts`; `web/src/site/lib/sky.ts`, `learn.ts`, `readouts.ts` (+ their tests); `web/src/site/sections/
BirthTime.tsx`, `SkyScreen.tsx`, `Hero.tsx`, `Method.tsx`, `Claims.tsx`; `web/src/site/components/HorizonWheel.tsx`; `web/src/site/pages/
MethodPage.tsx`, `LearnBirthTimePage.tsx`.
Refs: ADR-222, 241; MB-178, 180, 181; QA-02 #5, #7, #8; release-one-findings scope 2 (the full list); R14 readings 5 to 7.
Done when:
- `plateAnswer`, `summaryLine`, `hudLines`, `clockLine`, `risingReadout`, `sampleDayLine` and `spanLine` take the clock, and the inline
  times at `Method.tsx:59`, `MethodPage.tsx:73`, `Claims.tsx:606` and `LearnBirthTimePage.tsx:162` use `clockWords` with `useEntryFormat`;
  the prerender prints 24-hour, an en-US browser reads 12-hour after hydration with no mismatch; tests on a 12-hour clock failed on `main`.
- /method's step 1 adds "Chiron, which astronomy-engine doesn't cover, comes from NASA JPL Horizons positions." (/ux-copy), with a test.
- The "Elements · …" note leaves `chartNotes`; nothing else moves (no tie wording, `leaders.ts` and BalanceRail untouched).
- Home's wheel passes `stops={false}` (R15-05); the card says whether JSON-LD moved (`csp:write` is the orchestrator's).

### R15-07 — A date pasted in words, and a 12-hour time that waits for AM or PM (USER-FACING)
Tier: sonnet — two fixes in an existing helper and field, with their tests and e2e steps, in one package.
Objective: "4 May 1929" pastes as a date (MB-185), and "0300p" no longer drops its p into the place field (MB-173).
Files: `web/src/lib/date-entry.ts` (+ tests); `web/src/components/BirthTimeField.tsx` (+ test); `e2e/tests/birth-fields.spec.ts`.
Refs: ADR-222; MB-173, 185; QA-02 #12; R14 readings 5 to 9; lessons (R14 · R14-12: the next control is the next step).
Done when:
- `readDate` reads "4 May 1929", "May 4 1929" and "4 may 1929" in any field order; an unreadable paste leaves the field as it was and says
  why (`dateNote`).
- On a 12-hour clock the time field keeps focus after four digits until A or P is typed or the AM/PM switch is tapped, then focus goes to
  the next step; a 24-hour clock is unchanged.
- The spec covers both at 390 px in en-US and en-GB; the unit tests and the spec's new steps failed on `main`.

### R15-08 — Pages that work when Clerk is blocked (USER-FACING)
Tier: opus — auth: the claim and sign-in paths, and every page that waits on Clerk.
Objective: a content blocker never leaves a page loading for ever, and an invite's preview never waits for sign-in (MB-183).
Files: `web/src/pages/ClaimPage.tsx`, `AdminLabPage.tsx`, `AdminPromptsPage.tsx`, `AdminWaitlistPage.tsx`; `web/src/App.tsx` (`RequireAuth`,
`SignInPage`); new `web/src/hooks/useClerkStalled.ts` (+ test), `web/src/components/ClerkStalled.tsx`, `e2e/tests/clerk-blocked.spec.ts`.
Refs: MB-183; QA-02 #10; ADR-139; reading 12.
Done when:
- `/claim` renders the public invite preview, or its 404, from `GET /invites/:token` without waiting for Clerk; only claiming waits.
- After 8 s without Clerk, `/claim`, `RequireAuth` (`/chart`), `/sign-in` and the three admin pages show reading 12's line and Try again.
- The spec blocks `*.clerk.accounts.dev`: `/claim?token=bogus` shows its 404, then the line; it failed on `main`. 390 px first; /ux-copy.

### R15-09 — The waitlist's error, each bundle's line, Personal Report in the tab (USER-FACING) — provisional MB-138
Tier: sonnet — three small fixes in existing components and helpers, in one package.
Objective: the waitlist field takes focus on an error (MB-184), the bundle lines the JSON-LD describes are visible (MB-140), and the tab
and the saved PDF use the product's names (MB-138).
Files: `web/src/components/waitlist/WaitlistForm.tsx`; `web/src/site/site.css`; `web/src/components/BundleList.tsx`; `web/src/lib/
credits-view.ts`, `page-title.ts` (+ tests); `web/src/pages/ReportPage.tsx` (the title only); new `e2e/tests/waitlist-focus.spec.ts`.
Refs: MB-138, 140, 184; QA-02 #11; ADR-170; R-6.3; reading 13.
Done when:
- A bad or empty email focuses the field, and `.wl-fld input:focus-visible` draws the site's 2 px outline; the spec on /waitlist checks
  both and failed on `main`.
- `BundleRow` carries the catalogue's `line` and `BundleList` prints it under each bundle (no price or literal added); a test.
- `page-title.ts` names no "Natal" or "Synastry" (reading 13) and `ReportPage.tsx` passes "Personal Report"; the tests failed on `main`.

### R15-10 — The old nudges go, and the triad plate keeps its Sun (USER-FACING)
Tier: sonnet — a removal and a layout fix in existing helpers and components, with tests, in one package.
Objective: nudges with nowhere to show leave, privacy list included (MB-136), and a Sun near the Moon stays on the plate (MB-171).
Files: `web/src/lib/nudges.ts`, `processors.ts` (+ tests); `web/src/components/dashboard/Nudge.tsx`; `web/src/pages/DashboardPage.tsx` (the
nudge only); `web/src/components/report/TriadPlate.tsx`, `hero-layout.ts` (+ tests).
Refs: MB-136, 171; ADR-126; R-3.5 (the privacy list); §9 (the picture is the chart).
Done when:
- Nudge rows 1 to 3 (a pair, share a person, share a pair) and `sd.nudge.seen` leave `nudges.ts`, the dashboard and the privacy page's
  list; the circle's nudge stays; a test failed on `main`.
- `layoutHero` takes its outside step; TriadPlate passes a plate-sized one, so a Sun within 12° of the Moon stays inside the 220-unit
  plate (a test that failed on `main`); the report hero's layout and its tests are unchanged.

### R15-11 — The origin rule takes only this team's previews (INTERNAL)
Tier: opus — security: who may write to the API.
Objective: a write from someone else's `starsdecoded-*` Vercel project is refused (MB-154).
Files: `api/src/middlewares/origin.ts` (+ test).
Refs: ADR-197; R-7.5; MB-154.
Done when:
- The preview pattern matches only this team's preview hosts (their form read from a recent preview URL, named in the report); staging
  and production stay listed; `WEB_ORIGINS` still replaces the defaults.
- Tests refuse `https://starsdecoded-evil.vercel.app` (accepted on `main`) and accept this team's preview, staging and production.
- The pull request's preview still writes (its site checks and a waitlist join pass).

### R15-12 — The Release: estimates from the catalogue, and /sample's run on its own branch (INTERNAL)
Tier: opus — the release path, a token that writes to GitHub, and spend estimates.
Objective: a release's estimate is what mix B costs (MB-133), and a passing Release pushes /sample's run for a pull request (ADR-247, MB-182).
Files: `api/src/lib/releaseLab.ts`, `release.ts`, `github.ts` (+ tests); new `api/src/lib/sampleRun.ts` (+ test).
Refs: ADR-86, 223, 247; R-4.4, R-5.6; MB-133, 182; reading 14; release-one-findings scope 2.
Done when:
- `NATAL_ESTIMATE_USD` and `PAIR_ESTIMATE_USD` come from `MODELS` and the catalogue's prices over a stored report's usage on mix B (about
  $0.35 a release with the brain changed, pinned by a test that failed on `main`).
- After `forward` passes, `sampleRun` drops `foundation` and `meta.usage` from the lab's `audrey-hepburn` natal output, and `pushSample`
  commits it as `web/src/site/data/sample/audrey-hepburn.<release-id>.json` on a new `sample/<release-id>` from the released sha (the Git
  data API, `GITHUB_RELEASE_TOKEN`); the outcome is a line in `forward`'s detail (reading 14).
- `github.ts` writes only refs under `refs/heads/sample/` (a test refuses any other) and never logs the token; stubbed tests: a pass pushes
  one file with no foundation and no usage, and a skip records why.

### R15-13 — The deploy smoke fetches the share preview as WhatsApp and Facebook (INTERNAL)
Tier: sonnet — one keyless CI step and its script, in CI alone.
Objective: a preview that crawlers cannot fetch fails the smoke, naming the agent and the status (ADR-229), and production's run says why
WhatsApp shows nothing.
Files: `.github/workflows/smoke-run.yml`; new `.github/scripts/share-preview.sh`.
Refs: share-cover scope 4, acceptance 4; ADR-192, 229; R-7.4; Found 2; the Owner's Q2 ("no").
Done when:
- For the web URL, `/` fetched as `WhatsApp/2.24 A` and as `facebookexternalhit/1.1` answers 200 with `og:title` and an `og:image` naming
  `https://mystarsdecoded.com/<path>`; `<path>` fetched from the deployed host itself (Found 2) with both agents answers 200, `image/jpeg`,
  at most 600 KB, a full body, no 206. A miss fails and names the agent, the URL and the status.
- Run against `vite preview` with the image present (passes) and removed (fails naming `og:image`), shown in the report; shellcheck clean;
  Actions pinned by SHA; no secret.

### R15-14 — The share cover: the hero as a still, under a new file name (USER-FACING)
Tier: opus — a render script at the root and the web's head (two packages), drawn from the engine's sky.
Objective: a link to mystarsdecoded.com previews as cover A, the home page's headline beside its wheel for one stated minute (ADR-227, 228).
Files: `scripts/render-brand.mjs`; new `web/public/share-cover-v2.jpg`; `web/public/opengraph.jpg` (deleted); `web/src/site/head.ts`,
`head.test.ts`; new `web/src/site/data/share-cover.ts` (+ test).
Refs: share-cover scope 1 to 3, acceptance 1 to 3; ADR-31, 227, 228; R-3.1; §9; reading 15; the artifact's cover A (Round start 5).
Done when:
- `pnpm brand:render [minute]` (default now) draws 1200 × 630: eyebrow, h1 with its italic, line and wordmark on the left; `HorizonWheel`
  as it is (`hud={false}`, `arrival="still"`) on the right, from `skyAt` for that minute over London; mono corners ("THE SKY · 3 OCT 2026 ·
  08:50", the place and its coordinates, "WHOLE SIGN · TROPICAL", the Sun's altitude), never "Live"; a JPEG under 150 KB; nothing overlaps.
- `SHARE_IMAGE` names `/share-cover-v2.jpg` on every public page, `app.html` and `404.html` (`head.test.ts`); nothing names `opengraph.jpg`.
- A test pins the stamped minute and place and every body's degree to `skyAt`; the preinstalled Chromium by `executablePath` where
  Playwright's build is missing (ADR-233); no new dependency; `HorizonWheel` and the pages untouched.

### R15-15 — Two workbook cards after the hero (USER-FACING)
Tier: opus — the home page's first section after the hero and /sample's close, rebuilt from the artifact (rubric: a new screen).
Objective: the section shows what the report does in daily life, How you work and How you spend, every line the stored run's (ADR-243 to 245).
Files: `web/src/site/sections/Differences.tsx`; `web/src/site/data/differences.ts` (+ `differences.test.ts`); `web/src/components/dashboard/
Practising.tsx` (only if its quote moves).
Refs: home-report-section scope 1, 2, acceptance 1 to 8; ADR-172, 218, 243 to 245; R-3.1; §9; the artifact's option A (Round start 5).
Done when:
- Eyebrow, heading and lede (with `SAMPLE`'s name); two cards, "06 · Work" and "02 · Money", four rows each in the spec's order and look:
  the moment, in her chart (chips with `withHouseWords`, then the plain sentence), Behaviour check (`HouseCard`'s), Something to try (the
  one `Checklist`, local ticks, its why).
- `differences.ts` names each piece by hand, its header holds acceptance 5's pick rule, and the import throws on a missing piece; the test
  checks every sentence byte for byte after `plainProse`, the action and its why, each chip a printed placement in that house, and no
  planet, sign or house name in a moment.
- 390 px stacked, side by side from 900 px; /sample's closing band the same; styles in the component (`site.css` is R15-09's); axe on
  home and /sample; the empty Practising quote still resolves (the promoted rule).

---

## Group B — places on the server, sharing on the server and the screens, the prompts

### R15-16 — Places and zones from the server (USER-FACING) — provisional MB-194
Tier: opus — a route every chart depends on, a new dependency's first use, and an outside service on our side.
Objective: `/api/geocode` answers ranked places, each with its IANA zone from the offline table, and refuses a place with none (ADR-246).
Files: `api/src/routes/geocode.ts`; new `api/src/lib/places.ts` (+ test), `api/src/routes/geocode.test.ts`; `api/build.mjs` (if the table
must stay outside the bundle).
Refs: release-one-findings scope 1 and acceptance; ADR-246; R-4.1, R-7.1; MB-30, 49, 162, 194; reading 1; Found 5.
Done when:
- One Nominatim call (its User-Agent kept), ranked by the web's ranking moved here (`rankResults`, Košice's case and its tests), each hit's
  zone from the table, a hit with none (or `Etc/`) dropped, 422 `no_zone` "Pick a nearby town." when none is left; timeapi.io and the
  longitude guess are gone; `timezoneOffset` is the zone's offset today.
- The route test, Nominatim stubbed and the table offline: Ixelles answers `Europe/Brussels`; a hit at sea is dropped; all at sea is 422;
  Nominatim down is 502.
- `build:api`, then `start` from `dist`, answers a lookup on a clean install (shown in the report); `// MB-194 provisional` at the import.

### R15-17 — The place field asks the server, and its card prints the birth date's offset (USER-FACING)
Tier: opus — a flow on the way to every report (rubric: a flow), and the privacy page's processors.
Objective: the browser calls no geocoder or zone service, every chosen place carries its zone, and the card's offset is the birth date's
(ADR-246; MB-30, 162, 179).
Files: `web/src/components/PlaceField.tsx`; `web/src/lib/places.ts`, `form-draft.ts`, `processors.ts` (+ tests); `web/src/site/components/
SkyForm.tsx`, `site/pages/LearnBirthTimePage.tsx` (its place type); `web/src/pages/BirthFormPage.tsx`, `legal/PrivacyPage.tsx` (if needed);
`web/scripts/csp.mjs`; new `e2e/tests/place-zone.spec.ts`.
Refs: release-one-findings scope 1 and acceptance; ADR-145, 231, 246; R-3.5, R-7.1; MB-30, 130, 162, 179; readings 1, 2; Found 3.
Done when:
- PlaceField searches through `geocodePlace`; `lookupZone`, `fallbackZone`, `zoneFrom`, `nominatimUrl`, `zoneUrl` and the ranking leave the
  web, every caller moved; a 422 shows its line; the birth form always sends `timezone`; a draft place without one is dropped.
- The card prints no offset until a birth date is set, then `offsetOn(zone, ymd)` (reading 2); SkyForm and the birth form pass the date.
- `csp.mjs` drops Nominatim and timeapi.io; `processors.ts` lists Nominatim as reached from our server and drops timeapi.io.
- Tests: Ixelles, 4 May 1929, 03:00 computes Aquarius rising; the spec, `/api/geocode` stubbed, sees no request to either host; both
  failed on `main`; the `MB-130 provisional` tags cite ADR-231.

### R15-18 — The share grant: who reads through it (INTERNAL)
Tier: opus — access and consent: a new way to read someone's chart.
Objective: a grant lets its reader read the sharer's Personal report and nothing more, and ending it closes everything built on it (ADR-235).
Files: `api/src/lib/access.ts` (+ test); new `api/src/lib/shares.ts` (+ test); `api/src/routes/compatibility.ts`.
Refs: pinned server shapes; ADR-139, 182, 235, 236; R-3.6; MB-103, 104, 169; readings 3, 5, 6, 8, 10.
Done when:
- `canReadProfile`, `accessFor` and `natalReportAccess` take `shared` and answer `shared` only when the grant alone reads it; a session is
  never `shared`; `mayRegenerate` as reading 10; `readerKey` as reading 8; `sendStateFor` answers `handed_back`.
- `pairReadable` takes the reader's shared profile ids: a pair built on a shared chart closes when its grant goes, `stoppedBy` the sharer.
- `shares.ts` as pinned: one active grant per report and reader, revoked only by its sharer.
- The picker in `compatibility.ts` reads a shared chart; tests over every access kind with a grant active, revoked and absent; every
  caller grepped.

### R15-19 — Share links, Share yours back, Stop sharing, Change address (USER-FACING)
Tier: opus — consent flows, tokens and email, with their limits.
Objective: a reader shares their own report by email and claim, shares back in one tap, stops at once, and corrects a wrong address
(ADR-235, 237).
Files: new `api/src/routes/shares.ts`; `api/src/routes/index.ts`, `invites.ts`, `gifts.ts`; `api/src/lib/mailer.ts`, `limits.ts` (+ tests).
Refs: pinned contract and server shapes; ADR-123, 199, 235, 237; R-3.6, R-7.5; MB-104, 109; readings 3 to 5, 7.
Done when:
- `POST /shares` as reading 3 (a `share` invite, 7 days, counted with sends), its email "{first name} shared their Personal report with
  you" (/ux-copy), its 409s as pinned; `GET /shares`, `DELETE /shares/:id` (at once) and `POST /shares/back` (one tap) as pinned.
- `GET /invites/:token` previews a share with the sharer's first name only; its claim writes the grant (no hand-over) and answers `share`
  with `shareBack`; a send of your own chart still answers `own_chart`.
- Change address on a waiting send or gift as reading 7, in one transaction; the old link then answers as revoked.
- Mounted in `routes/index.ts` (its `MB-146 provisional` tag cites ADR-231); route and limit tests for each.

### R15-20 — Reports: shared readers, ticks per reader, who regenerates (USER-FACING)
Tier: opus — access on every report read, and a regenerate that spends.
Objective: a shared reader reads and nothing more, every reader's ticks are their own, and Try again or Regenerate runs only where it may
(ADR-235, 239; MB-110, 137, 169, 170).
Files: `api/src/routes/reports.ts` (+ `reports.test.ts`).
Refs: pinned contract and server shapes; ADR-139, 235, 239; R-3.6, R-6.1; MB-104, 110, 120, 137, 169, 170; readings 3, 8 to 10.
Done when:
- `GET /reports`, `GET /reports/:id` and its status honour `shared`: read only, with no send, delete, workbook or regenerate of the sharer's.
- Ticks and pins read and write `report_workbooks` under `readerKey`; `reports.workbook` is no longer written; one reader's ticks never
  show to another (the `MB-110 provisional` tag goes).
- `canRegenerate` from `mayRegenerate`; `outdated` as reading 9; regenerate runs for `mayRegenerate` on a failed or outdated report,
  free, and refuses everyone else; a test per case, each failing on `main`.

### R15-21 — Home: the sharer in your circle, your own pins, the Moon's range (USER-FACING)
Tier: opus — `GET /home` decides who sits in the reader's circle.
Objective: a sharer sits in their reader's circle marked shared until they stop, pins are the reader's own, and a rough birth time shows
the Moon's range (ADR-235, 239; MB-139).
Files: `api/src/lib/home.ts` (+ `home.test.ts`).
Refs: pinned contract and server shapes; ADR-174, 182, 235, 239; MB-104, 110, 139; readings 4, 8, 11, 16.
Done when:
- `natalRowsOf` also reads profiles shared with the reader; `seatsOf` seats each sharer with `access: shared` and `shareBack` (reading 4);
  a revoked grant leaves the circle at once.
- Practising reads the reader's `report_workbooks`; each person carries `canRegenerate`; the Moon's `Spot.band` comes from the stored
  chart's band on a windowed birth time.
- `LISTED_PAIR_VERSIONS` lists p2 to p5 (reading 16); tests for each, the new behaviours failing on `main`.

### R15-22 — Profiles: Not me hands it back, a birth-time change passes the newest (USER-FACING)
Tier: opus — consent (a claim undone) and writes that spend.
Objective: Not me ends the claim and the giver sees it (ADR-236), and a birth-time change never stalls on a profile with many reports (MB-170).
Files: `api/src/routes/profiles.ts`.
Refs: pinned contract and server shapes; ADR-139, 236; R-3.6, R-6.1; MB-103, 120, 170; readings 6, 9.
Done when:
- `POST /profiles/:id/hand-back` as reading 6, for the claimer only (404 for anyone else, 409 `not_claimed`), in one transaction.
- `PATCH /profiles/:id/birth-time` passes only the newest complete natal report and holds one write; the older complete ones are left
  outdated; the "6 reports" refusal no longer fires for this case.
- In-process tests for both, failing on `main`; R15-28's walk proves them on Postgres.

### R15-23 — One brain pass: floors, the room rule, the model sentence, the house words (USER-FACING · brain) — provisional MB-87, 92, 132, 142, 143
Tier: opus — the brain: the prompt text every report is written from.
Objective: short sections are told their floor, a room is only a room, the model sentence and the vocabulary stop being copied, and each
house opens with the page's word.
Files: `api/src/prompts/system.ts`, `vocabulary.ts`, `sections/*.ts` (+ `prompts.test.ts`, `style.test.ts`); `api/src/prompts/pair/index.ts`,
`pair/sections/**` (+ `pair-prompts.test.ts`); `api/src/lib/aiInterpretation.ts` (`PROMPT_VERSION` only); `scripts/src/generate-vocabulary.ts`.
Refs: sweep lane 4 rows 2 to 5; ADR-98, 104, 176, 184, 231; R-4.4, R-5.1, R-5.3, R-5.5; MB-87, 92, 129, 132, 142, 143; readings 16, 17; Found 10.
Done when:
- First, free: each section's words in `report-lab/r14-staging` (natal) and `r12c-pair`, `r12d-pair` (pairs) against its band, as a table in
  the report; a floor (reading 17) only where a section falls short.
- The natal prompts carry the room rule with its idioms ("time" or "space" instead), the pair doctrine the idioms too; `system.ts`'s model
  sentence loses its "X first, Y second" shape, and the vocabulary is introduced as doctrine, never lines to repeat.
- Each `HOUSE.short` opens with the page's word ("The 12th is solitude: …"), and the generator's house prompt asks for it.
- `v10` and `p5`, every pinned version moved (R15-21 and 27 hold theirs); the dry lab: every prompt renders, schemas strict, injection clean,
  the diff only these lines; fixture runs on staging (Staging confirmation 3) read against the floors, rooms and the model sentence.

### R15-24 — Share my report, and Try again, on the quick look (USER-FACING)
Tier: opus — a new flow from the dashboard, with consent words.
Objective: a reader shares their own finished report from their quick look and sees who has it; a sharer's quick look offers Share yours
back; a failed report offers Try again; a rough birth time shows the Moon's range (ADR-235; MB-104, 137, 139).
Files: `web/src/components/dashboard/QuickLook.tsx`, `Orbit.tsx`; new `web/src/components/dashboard/ShareMySheet.tsx`; `web/src/lib/
home-view.ts`, `orbit.ts` (+ tests).
Refs: sweep lane 3 row 1; ADR-130, 172, 182, 235; §9 (the circle, two tempos); MB-104, 137, 139; readings 3 to 5, 10, 11; the artifact.
Done when:
- "Share my report" on the reader's own quick look, once that report is finished, opens `ShareMySheet`: an email and the spec's line naming
  what goes; it lists waiting and active shares, each with Stop sharing (`StopSharingDialog`, kind `share`).
- A sharer's seat is marked shared on the circle (no sign, degree or glyph, §9); their quick look offers Share yours back when `shareBack`.
- A failed person's quick look offers Try again when `canRegenerate`; the Moon reads its range from `Spot.band` (reading 11).
- 390 px first; "Sharing" with dots while it sends (ADR-130); `home-view.ts` and `orbit.ts` tested; /ux-copy, /web-taste.

### R15-25 — The rows: Try again, Not me's handback, Change address, Stop sharing by name (USER-FACING)
Tier: opus — consent flows in the dashboard's rows and dialogs.
Objective: each row says and offers what its report now allows (ADR-236 to 238; MB-103, 109, 135, 137).
Files: `web/src/components/dashboard/PeopleRows.tsx`, `WaitingGiftCard.tsx`, `StopSharingDialog.tsx`; new `web/src/components/dashboard/
HandBackDialog.tsx`; `web/src/components/SendDialog.tsx`; `web/src/lib/pair-row.ts` (+ test); `web/src/pages/DashboardPage.tsx` (only
what the rows need).
Refs: sweep lane 3 rows 2 to 5; ADR-130, 139, 182, 236 to 238; MB-103, 109, 135, 137; readings 5 to 7, 10; the artifact.
Done when:
- A failed People row offers Try again when `canRegenerate`.
- Not me on a report sent to the reader opens `HandBackDialog`: Hand it back and Cancel only; the writer's own chart unmarks as today. The
  giver's row reads "Handed back" with Send again.
- A waiting send's row and a waiting gift's card offer Change address (`SendDialog`'s change mode, `WaitingGiftCard`).
- Stop sharing's lines name the person when the chart isn't the reader's own ("Stop sharing June's Personal report?"); `StopTarget` takes
  `share`; `pair-row.ts` tested; 390 px first; /ux-copy.

### R15-26 — The claim page: a share, Share yours back, Not me (USER-FACING)
Tier: opus — consent on the invitee's first screen.
Objective: someone sent a share knows what they get, lands with the sharer in their circle and may share back; Not me hands back (ADR-235, 236).
Files: `web/src/pages/ClaimPage.tsx`.
Refs: sweep lane 3 rows 1, 2; ADR-139, 235, 236; MB-103, 104; readings 3, 4, 6, 12; R15-08's preview without Clerk.
Done when:
- A share's preview reads "{first name} shared their Personal report with you"; its claim lands on the dashboard with them in the circle,
  then offers Share yours back (optional, one tap) when `shareBack`.
- Not me after claiming a sent report opens `HandBackDialog`; "Keep it as someone else's chart" and its `MB-103 provisional` seam go.
- The preview still renders without Clerk (R15-08); 390 px first; /ux-copy, /web-taste.

### R15-27 — The report page: Try again where it runs, Regenerate where it's outdated, v10 and p5 (USER-FACING)
Tier: sonnet — UI tweaks in two existing components and two constants, in one package.
Objective: the report page offers a rewrite only where the server allows one, and renders this round's prompt versions (MB-169, 170).
Files: `web/src/pages/ReportPage.tsx`; `web/src/components/report/OpeningOverlay.tsx`; `web/src/types/chart.ts` (+ a test).
Refs: MB-169, 170; ADR-84; readings 9, 10, 16; pinned versions.
Done when:
- The overlay's Try again shows only when `report.canRegenerate`; an `outdated` report shows one line and Regenerate.
- `RENDERABLE_PROMPT_VERSIONS` gains "v10" and `RENDERABLE_PAIR_PROMPT_VERSIONS` "p5" (reading 16); tests; /ux-copy.

---

## Group C — the walk

### R15-28 — The walk: sharing, the handback, Change address, ticks per reader, on a scratch Postgres (INTERNAL)
Tier: sonnet — tests on their own.
Objective: lane 3's and MB-170's paths end to end with no network (sweep acceptance 3 to 5).
Files: new `api/src/walk/sharing.walk.ts`; `api/src/walk/loop.walk.ts` (its Not me step); `api/package.json` (`walk` runs both).
Refs: sweep acceptance 3 to 5; ADR-235 to 239; R14-10's walk; readings 3 to 10.
Done when: against `WALK_DATABASE_URL` after `db:bootstrap`, the model stubbed: a share's claim lets the recipient read and seats the
sharer; Share yours back; Stop sharing ends the read and the seat at once and closes a pair built on it; Not me hands back and the giver
reads "Handed back"; Change address leaves the old link dead; each reader's ticks stay theirs; a birth-time change over seven complete
reports passes one and leaves six outdated; the holder regenerates after a hand-over; both walks pass twice; the orchestrator pastes the
summary into the round report.

---

## Contingent

### R15-C1 — A section still short on Luna moves alone to Sol (USER-FACING · brain) — provisional MB-142
Tier: opus — the brain: the model catalogue.
Objective: only if Staging confirmation 3 finds a section under its floor on gpt-6-luna: that section alone writes on gpt-6-sol.
Files: `api/src/lib/models.ts` (+ `models.test.ts`).
Refs: ADR-57, 184, 231 (MB-129's rule); R-4.4, R-5.5, R-5.6; MB-142.
Done when: `SECTION_MODELS` moves that section only (the file's `MB-128 provisional` tag cites ADR-231); the dry lab; one more fixture run
on staging reads it at or over its floor; on a follow-up branch merged before the Release; the Owner hears which section and why (MB-129).

---

## After the builders: the orchestrator's steps, not cards
1. **After group A:** `csp:write` if a card says JSON-LD moved; Smoke dispatched on `round/R15` with `target=production`; the tester.
2. **After group B:** `site.ts`'s `updated` set to the day on every page whose words changed (home, /sky, /sample, /method,
   /learn/birth-time, privacy), then `csp:write` once and `vercel.json` committed; the tester.
3. **The gate:** `pnpm install --frozen-lockfile` · typecheck · `build:web` (its CSP check) · `build:api` · unit tests · `check:shipped` ·
   `check:copies` · `pnpm audit --prod --audit-level high` · codegen twice with no diff · `db:bootstrap` on the upgrade path and on an
   empty scratch Postgres (R15-03) · both walks twice · the dry lab: `pnpm report:lab --dry --base r06`, then `--pair curie-winfrey` under
   each lens and the inject pair, the injection table clean; pasted into the report with R15-23's floors table.
4. **The sentinel** on `main...round/R15`, its eye on the share grant (every reader of `shared`, nothing beyond the report), the handback,
   Change address (one transaction, the old token dead), per-reader workbooks, names masked, the geocode route (one Nominatim call,
   limited, nothing typed in a log), the origin rule, and the release's GitHub write (`refs/heads/sample/` only, the token never logged).
   A blocking finding becomes a group D card, and the sentinel re-reads the fix.
5. **The pull request:** CI and the site checks on its preview (axe on home and /sample, the four new e2e specs and the updated one, the
   probe's web half). Merge once green (R-12.5).

## Staging confirmation, after the merge and before the next Release
1. The smoke on `main` is green, its share-preview step on staging (R15-13).
2. **The name spots** (about 7 ¢): `report-lab.yml` with `campaign=natal`, `chart=inject-instruction`, and `campaign=pair`,
   `pair=inject-instruction-curie`, label `r15-inject`; the orchestrator reads the names in the prose: used as names, nothing obeyed (R15-04).
3. **Fixture runs** (about 25 ¢): the natal campaign (label `r15`) and the pair campaign: each section against its band and floor (one still
   short on Luna → R15-C1 before the Release), no figurative "room" in natal prose, no "X first, Y second" sentence (R15-23).
4. **QA-03** (`/qa` on staging, ADR-194): the place flow (Ixelles, 4 May 1929, 03:00 → Aquarius rising on /sky, the birth form and the
   dialog; a point at sea refused; no request from the browser to Nominatim or timeapi.io); the wheel's focus; the pages with Clerk
   blocked; and, once MB-186's network setting lets it sign in, sharing with two accounts (else the Release view's QA agent covers it).

## Production after the round
Nothing until a Release. The brain changed, natal and pair (R15-04, 23, and C1 if called), so the next Release runs the full lab on the five
matrix charts and the pair, the gate against production's run and the QA agent (R-4.4). Then ADR-247's step pushes `sample/<release-id>`,
and the session opens its pull request: the run's JSON, `sample.ts`'s import, `sample.test.ts`'s digest and counts, the four `HOME_CLAIMS`,
the two workbook cards picked again by `differences.ts`'s rule (ADR-244), /sample's `updated` and `csp:write`; merged once green and
released the same day (no brain change, no lab). Then the Owner shares the bare https://mystarsdecoded.com/ on WhatsApp (share-cover
acceptance 5). MB-147's seven clean CSP days run from the first Release (2026-10-03) and are not this round's.

## Risks
1. **Schema** (R-7.3): two tables, one column, a new invite kind and a backfill; step 2 now stops a deploy on a failed push (MB-123), which is
   the point but new. R15-03 runs the upgrade path and an empty database twice each.
2. **A new dependency** (MB-194): geo-tz 8.1.9 and roughly two dozen packages in its tree, the oldest arriving through geobuf's command line;
   74 MB on the API's image, read from disk outside the bundle. R15-01 names every package, the verifier checks it at Round start 4, the
   sentinel reads the tree. About 28 dev libraries leave the web (MB-172).
3. **The brain and report content** (R-5.5): masked names on retries (R15-04); floors, the room rule, the model sentence and the house words
   (R15-23, v10 and p5); maybe one section on Sol (C1). Dry lab in the round, fixture runs on staging, the Release's full lab and QA agent
   before production. A version bump without the web's lists would hide new reports (Found 1): pinned.
4. **Privacy and consent** (R-3.5, R-3.6): sharing your own report sends your birth date, time and place to another account (the sheet says
   so, ADR-235); a grant reads the report and nothing else; Stop sharing and the handback act at once; ticks a claimer made on a sent
   report before the backfill go to the report's holder (ADR-239's accepted cost).
5. **New charts change** where the old longitude guess was wrong (MB-30): a place's chart now always uses its zone. Written reports keep
   their stored chart.
6. **USER-FACING** at the next Release: every card but R15-00 to 03, 11 to 13, 18 and 28.
7. **User-visible without locked words:** the share email and sheet, Share yours back, Handed back, Change address, the outdated line, Try
   again on rows, the Moon's range, the titles, the skip link. Each passes /ux-copy; the close lists them for the Owner in one row.
8. **The contract** (R15-02): additive but `GeocodeResult.timezone`; `Access` widened, its callers moved in the same card.
9. **CSP:** R15-17 removes two `connect-src` sources; JSON-LD may move with /method's words and the `updated` dates; `csp:write` after A and B.
10. **A preview's API is staging's** (Found 3): an e2e step needing this round's API stubs it; lane 3 is proven by the walk, not the preview.
11. **Files R16 also touches** (`R16-plan.md`, its Risk 10 and Round start 3): `openapi.yaml` and the generated files, the schema index and
    `bootstrap-db.sh` (R15 takes step 3m), `home.ts` (shared seats; `Spot.band`, which R16-17's `triadRowsOf` should carry), `reports.ts`,
    `routes/index.ts`, `limits.ts`, `prompts/data.ts` (`maskNames` beside R16-07's `quote` label), `models.ts` (if C1), `aiInterpretation.ts`'
    version, `QuickLook.tsx`, `Orbit.tsx` and `home-view.ts` (R16-17), `ReportPage.tsx`, `App.tsx`, `AdminPromptsPage.tsx` and
    `page-title.ts` (R16-21), `DashboardPage.tsx` (R16-22), `Method.tsx` and `MethodPage.tsx` (R16-19), `api/package.json`'s walk (R16-25),
    and INDEX's pricing line. R16 re-reads them after this merge; nothing here builds or pre-empts an R16 card.
12. **The release token's new write** (ADR-247): `sample/*` branches only, enforced in `github.ts` and read by the sentinel.
13. **Deployments:** Vercel's 100 a day (ADR-234): one push per group and per fix.
14. **Escalations:** none in R13 or R14, so no card or kind of card was escalated to Opus two rounds running.
15. **Size and spend:** 29 cards, 14 in group A; the shrink path is in Parallel groups. About 7 ¢ and 25 ¢ on staging, the Release's lab after.
16. **Lessons this plan guards:** the promoted rule (R15-02's enums, R15-23's versions, R15-17's place type); a transitive package nobody named
    (R14-01) → R15-01 names them all; "the next control" read as DOM order (R14-12) → R15-07's next step; redaction by key depth (R14-14) →
    R15-12 never logs the token.

## Questions raised (Notion, 2026-10-03)
- **Raised before building:** **MB-194** (decision, launch) the zone table: geo-tz 8.1.9's comprehensive data; default that, once the
  verifier passes it. **MB-195** (todo, later) drop `reports.workbook` once a Release has run on per-reader workbooks; default kept and
  unwritten. **MB-196** (decision, later) the wheel's focus colour, since §9 keeps brass off controls; default the site's focus colour.
- **Noted today:** MB-144, 148 and 192 (their "R15" is pricing's round); MB-120 (Regenerate on an outdated report is free); MB-162 (built
  here with MB-30).
- **At the close:** lane 2's rows done (MB-30, 123, 133, 136 to 140, 154, 162, 169 to 173, 177 to 181, 183 to 185), MB-182 at the refresh,
  MB-87, 92, 132, 142 and 143 built at the lock's words (seams kept until a Decisions row), MB-194 and 196 at their defaults or as answered,
  one row for R15's new words, and a row for WhatsApp's block if the smoke finds one only the Owner can switch (R-12.5).
- **Read, untouched:** MB-102 and MB-186 (the Owner's, in hand), MB-147 (seven clean CSP days), MB-111 and 149 (pricing).

## For the Owner (one ask)
Nothing blocks the round: approving this plan starts it (§11.2), after N1 and MB-194's check at Round start.
1. **The zone table (MB-194).** Places and their time zones move to our server, so no chart uses a guessed zone. The exact table (geo-tz)
   adds about 74 MB and two dozen small packages to the server; the small one (88 KB) puts about 1 town in 10 in a different zone, by its
   own maker's count. Recommendation: the exact table, checked by the verifier before it goes in. If silent: built that way.
To know, no answer needed: the round's first smoke fetches mystarsdecoded.com as WhatsApp does. If Vercel's firewall refuses it, the
round report names the setting, which only you can switch.

## Close (the orchestrator)
- **Report** (at most 60 lines): every line tagged; the Spend line; the dry lab with the floors and injection tables; the tester and the
  sentinel; the smoke's WhatsApp finding; QA-02's findings closed, by card.
- **`docs/annex/lessons.md`:** each gate failure, escalation, sentinel finding and QA sev-1 traced to its card.
- **Decisions:** none new (ADR-227 to 248 are recorded); MB-196 becomes one only if the Owner wants brass.
- **MASTERFILE 0.27:** §3 gains `profile_shares`, `report_workbooks` and the invite's `share` kind and `handed_back_at`; R-7.1 loses the
  browser's Nominatim exception (MB-30).
- **CLAUDE.md** (at its budget, lines in place): the current focus: R15 shipped; next R16 Timeline (its plan merges first); pricing never
  planned until asked. Its line 3 names the old `R15-plan.md` until then.
- **INDEX:** the four specs built in R15; the code map gains `shares.ts` and its route, `report_workbooks`, `sampleRun.ts`,
  `api/src/lib/places.ts`, `ShareMySheet`, `HandBackDialog`, `ClerkStalled`, `share-cover-v2.jpg` and `share-preview.sh`; the QA line names QA-03.
- **Mailbox** as above. The Owner gets the staging URL, QA-03 and three lines: (1) home on your phone: two cards after the hero, How you work
  and How you spend; (2) /sky: type 04051929, 0300 and Ixelles: Aquarius rising, and a place at sea asks for a nearby town; (3) with a
  second account: Share my report from your quick look, claim it, then Stop sharing.
