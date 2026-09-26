# R10 plan — Dashboard sky and the credit loop: the orbit, its card, Send and Gift, one balance

Planned 2026-09-26 on `claude/next-round-locked-specs-lt28vs` (= `main` at c8b1401, the R09 merge) for the locked specs
`dashboard-sky` (ADR-89 to 96, amended ADR-130 to 136) and `credit-loop` (ADR-120 to 129). The third named spec,
`landing-and-ai-search` (ADR-107 to 119), is proposed for **R11** (below). None of the three is on `main`: they sit on
`claude/modest-cori-wh0mty` and `claude/wonderful-rubin-1733ai`, with no pull request, and the round's first step merges both.
Artifacts: dashboard sky https://claude.ai/artifact/6GpndVJxZUfHAdULYYg2GX · credit loop https://claude.ai/artifact/UST4kga6e2KJZ4M1w78fZ7 ·
landing https://claude.ai/artifact/Rx9GsG4ZUA8Gnxif6fHWbV. No QA report exists. No Owner comment sits on the Mailbox or
Decisions rows these specs touch. **Tags:** every card is USER-FACING except R10-01 to 04, R10-20 and R10-22 (INTERNAL).
**The brain is untouched**: no file under `api/src/prompts/`, `models.ts`, `aiInterpretation.ts`, `traditional.ts` or
`chartCalculation.ts` changes, so no dry lab runs and no report's words change (R-5.5 not triggered). **The schema changes**:
`db:bootstrap` three times on a scratch Postgres. **No credential is needed** for R10; nothing goes on GitHub.

## Mailbox rows above 2 rounds open after this plan's increment
At **9**: MB-5, 6, 11, 12, 13, 15, 17, 19, 20, 21, 22, 23, 24, 25, 30 · at **8**: MB-31 (blocking, the legal entity), 33, 35 ·
at **6**: MB-43, 47, 49, 50 · at **5**: MB-55, 57, 58, 59 · at **4**: MB-64, 65, 66, 67 · at **3**: MB-70, 73, 74, 75.
All 47 open rows were incremented. None blocks a card: MB-31 blocks launch, not this round; MB-6 and MB-57 are carried by
seams; MB-49 gets a provisional answer (R10-22). **MB-75** (`GITHUB_RELEASE_TOKEN` on Railway staging) stays the todo
before any production release. Raised today: **MB-97 to 102** (Questions raised).

## Too large for one round: R10 and R11
The three specs come to about forty cards: twenty-two for dashboard-sky with credit-loop (below) and about eighteen for the
landing (outline at the end), twice R08 and more than R05's thirty-two, which took two context compactions.
- **R10 = dashboard-sky + credit-loop.** One surface (the orbit, its card, the pill and its sheet) on one schema and contract
  change; credit-loop's Send *is* dashboard-sky's sending (MB-81 to 85), so apart they would cut the orbit, the card,
  `invites.ts` and the credits code twice. It is the Owner's current thread (Review 25 Sept folded in, MB-86) and needs no
  credential, so the Owner tests it on staging first. The credit loop's cards sit in the same three parallel groups a
  dashboard-only round would need: they add builders, not waits.
- **R11 = landing-and-ai-search.** Other files (public pages, the prerender, `vercel.json`, the place field), its own
  infrastructure and Owner items (DNS, Search Console, Bing), and its "Your people" section reuses R10's orbit and card on
  sample people (ADR-112), so it goes second. Its lock merges now, so R11 plans from `main`.

## Round start: the three locks come in (the orchestrator, before any card)
Both branches are docs and skills only (nothing under `web/`, `api/` or `packages/`). Merge base with `main`: d33eb541;
`main` has moved 22 commits since (R09). Conflicts below were simulated line by line on the three versions of each file.
1. `git switch -c round/R10` from this branch (`main` plus this plan). The plan reaches `main` with the round's pull request.
2. `git merge --no-ff origin/claude/modest-cori-wh0mty` (dashboard-sky, credit-loop, `docs/annex/dashboard-sky-annex.md`).
   Conflicts: **MASTERFILE.md** version line (`main` 0.13, branch 0.15) → write **0.16 (2026-09-26)**; **docs/INDEX.md**
   Decisions and Mailbox lines → keep `main`'s (137 rows, R09's Mailbox facts) and add "MB-81 to 86 decided (ADR-120 to 136)";
   INDEX Specs block → keep `main`'s review-25-09 "R09" line, take the branch's dashboard-sky and credit-loop line, keep
   night-sky's "on a branch" line. Auto-merged, check they are present: §2 item 6, R-6.5, §9 "Two tempos" (branch);
   R-0.7, §10's agents line, §11.2 step 2 (`main`).
3. `git merge --no-ff origin/claude/wonderful-rubin-1733ai` (landing spec, `docs/annex/landing-and-ai-search-pages.md`,
   `.claude/skills/ux-copy/**`, `.claude/skills/web-taste/SKILL.md`). Conflicts: **MASTERFILE.md** version line (ours 0.16,
   theirs 0.13) → keep 0.16; **MASTERFILE.md §10** tree, two adjacent lines → `.claude/agents/` from `main` ("planner, builder,
   qa; the orchestrator is the main session in /round": ADR-137 is the later row) and `.claude/skills/` from the branch
   ("/ideate /lock /plan /round /qa /mailbox /report-lab /ux-copy /web-taste, a SKILL.md each"); **docs/INDEX.md** header
   (keep "last: R09"), Decisions and Mailbox lines (ours plus "MB-8 decided by ADR-111, MB-25's voice half by ADR-117,
   MB-90 to 95 raised"), Specs (add the landing line and its annex; keep `main`'s review-25-09 line), Agents and skills
   (`main`'s agents wording plus /ux-copy and /web-taste). Auto-merged: CLAUDE.md's Process line (/ux-copy, /web-taste) beside
   `main`'s triage and focus edits; §2 item 1, R-3.1, R-7.6, §9 picture and Voice.
4. The two branches overlap each other only in MASTERFILE.md (the version line) and docs/INDEX.md (the lines above).
   Authority: MASTERFILE, then Decisions dated after it; ADR-107 to 137 are all locked the same day and none supersedes
   another across branches except ADR-112 amending ADR-89 (R10-04, R10-12 follow it).
5. One follow-up edit in the start commit: MASTERFILE §3's `invite_tokens` note "7-day TTL" becomes "a send lives 7 days, a
   gift 30 (ADR-123)". INDEX stays within 60 lines (regenerated at close). Check: `git diff --stat main` lists only docs,
   MASTERFILE, CLAUDE.md and `.claude/skills/`; typecheck is unaffected. Commit: "R10 start: the dashboard-sky, credit-loop
   and landing-and-ai-search locks".

## What already shipped (checked on main at c8b1401)
- **dashboard-sky, met and reused:** the ringed plate as its own component, `TriadPlate.tsx` (R09-07, dormant; ADR-99,
  MB-86); one word per house, `HOUSE_WORDS`, `houseWithWord` (R09-04, ADR-98); the legend and band formats, `triadRows`,
  `rowText`, `bandText` ("16.48° Pisces · 3rd (mind)", "10.20°–22.85° Pisces", R09-07); the picker's remembered pair and its
  checks, `pair-selection.ts` (#66, ADR-105); element rows in element hues, `BalanceRail` (R04); the claim's time question
  (R05, MB-59); `canReadProfile` already admits a claimer for pairs (`compatibility.ts`); `getCredits` and the soft pass.
  The reverted prototype 3cfe873 (`SkyOrbit.tsx`, `natal-glance.ts`) is a reference, not a base.
- **dashboard-sky, not met:** `DashboardPage.tsx` is still three zones: no orbit, no card; "Read as it writes" on person and
  pair rows; a lens eyebrow and the lens doors line; ☉ ☽ in `SignRow`, `PersonCard` and the loader; "Invite {name}"; a credit
  badge reading "Unlock"; natal reads and lists check only `profile.userId` (MB-84); a pair invite to a joined person answers
  409 (MB-82); the preview returns the giver's email and the pair email names the wrong person (MB-85); no `claimed_as_self`.
- **credit-loop, met:** one credit per report, bundles as counts 1, 3, 5 (`BUNDLE_DEFINITIONS`, ADR-42); the birth form's
  "This is my natal chart" box (`isForSelf`); the claim's email binding; `refundCredit`. **Not met:** everything else.
- **landing-and-ai-search, met:** scope 14, every wheel names its houses and every printed house carries its word (R09-06,
  R09-08). **Not met** (R11): `LandingPage.tsx` still draws `demoChart.ts` ("Aria Solis", MB-50), types "€24" twice (and once
  in `BirthFormPage.tsx`), hand-lists registry labels (MB-8); `/chart` sits behind `RequireAuth`; no public page, no prerender
  (`#root` empty), no robots.txt, sitemap, JSON-LD or llms.txt.

## Where the specs disagree, and how this plan settles it
1. **ADR numbers do not collide** (Notion, checked): 107 to 119 landing, 120 to 129 credit loop, 130 to 136 the dashboard
   amendment, 137 the orchestrator rule (on `main`). The specs cite the same numbers.
2. **MASTERFILE's version:** 0.13 twice and 0.15 → 0.16 carrying all four edits; they touch different rules.
3. **The orbit's ring:** dashboard-sky draws "a plain dotted orbit"; ADR-112 (landing) amends ADR-89: the ring at .26, cut
   away around each person and name, on the dashboard too. The later amendment rows leave it. → Reading 1.
4. **Who is on the orbit:** "one point per other profile" (dashboard-sky) against "people only… a waiting gift… one Add
   someone point" (ADR-121). → Reading 3, with dashboard-sky's "a failed report is not drawn".
5. **"Add a person"** (dashboard-sky annex) against **"Add someone"** (ADR-122, used by the amendment). → Reading 2.
6. **"Invite {name}" and "Share with"** stay in the annex's text; credit-loop and the amendment rename them Send and Gift, and
   credit-loop's acceptance 1 keeps both off the dashboard. R11: the landing's /compatibility step "added… by invite" follows the verbs.
7. **Legend rows** "16.44° Leo · 7th" (dashboard-sky, card 2) against ADR-98 and §9 (every printed house carries its word). → Reading 4.
8. **Two sends in one block:** review-25-09's line "Send it to {B}." over the card, and the new "Send to {B}" button for the
   report (annex, ADR-133). → MB-100, reading 13.
9. **A nudge and the card's controls:** credit-loop's nudges carry Generate and Send; the card already has its row's Generate
   and its send line, with one primary. → Reading 5.
10. **The picker navigates to a writing report**, which ADR-131 and the row copy "It opens here when it is finished." exclude. → Reading 6.
11. **MASTERFILE §3** gives invite tokens a 7-day life; ADR-123 holds a gift 30 days. → Amended at the round start.
12. **Zero credits:** both specs draw zero as Get credits on every spend; every account holds zero and there is no checkout. → MB-97.
13. **Bundles of 3 and 5** on the sheet against MB-5's open default (only the single report sold at launch): not a locked
    conflict; the sheet shows counts without prices behind MB-5 and MB-6, and the pricing session decides what sells.
14. **For R11:** the landing's sample orbit "and card as locked" carries live controls (rows, send, credits) → sample mode;
    JSON-LD's Offer needs a price (MB-5, R-6.3) → Product without Offer until the price constant exists; robots.txt "allows
    `*`" would open staging to crawlers → staging and previews answer noindex.

## Goals
1. **The dashboard opens on the orbit** (ADR-89 to 96, 112, 130 to 132): the reader at the centre, their people on a plain
   ring, a tap that opens a card computed from the stored chart, each pair one row, no lens, no glyph, no "Read as it writes".
2. **Send to {name} hands a finished report over, theirs by default** (ADR-120, 133 to 135; MB-81, 82, 84, 85): the claimer
   reads and lists it, This is me, Not me, Stop sharing, Delete; a pair goes only from one of its two, at once to someone
   already joined; the emails and the Terms name the right people.
3. **Gift a report holds a credit** (ADR-120 to 124, 127, 128; MB-83): Add someone's three choices, the cover previewed and
   emailed, a waiting gift in teal with a reminder and Take it back, a claim that starts the recipient's chart, both orbits.
4. **Credits in sight, one balance** (ADR-95, 125, 126, 129): the pill and its sheet with dots and History, the path after a
   bundle of 3 or more, one nudge at a time; the zero states behind the MB-6 seam (MB-97).
5. **The three locks reach `main`** with this round (the start step), and R11 is ready to plan from them.

## Preconditions
1. The round start above runs first; no builder starts before its commit.
2. Builders read MASTERFILE §0, their card and the spec sections it names. They cannot open claude.ai (it answers 403): the
   orchestrator hands each UI builder a local copy of the artifact screens its card names, as in R09 (the orbit,
   the card, the phone sheet, the compatibility and progress states, sharing, the empty states, the credits sheet at 3, 1 and
   none, the path at 3 and 5, Send and Gift in four steps with the cover, the nudges) and R10-03 the element-lead table.
   Without them, builders follow the spec text and the pinned shapes, and the round report lists what differs.
3. **Single owners.** Group A: `packages/db/**`, `scripts/bootstrap-db.sh` → R10-01; `packages/api-spec/**` and the generated
   client and zod → R10-02; `sky-card.ts`, `pair-row.ts`, `StatusDots.tsx` → R10-03; `lib/orbit.ts` → R10-04; `TermsPage.tsx`
   → R10-05. Group B: each card's files as listed, no file in two cards; `api/src/routes/index.ts` → R10-08; `web/src/App.tsx`
   → R10-20. Group C: `DashboardPage.tsx` → R10-21; `api/src/walk/**`, `api/package.json` → R10-22. No card touches
   `web/src/index.css` (Tailwind, and `orbit.css` for the orbit's keyframes).
4. Inside a group a card may land before the card it imports from (pinned signatures); the orchestrator accepts a red
   intermediate until the group ends, and every group ends green. A builder who needs a pinned shape changed stops (R-0.1).
5. **No card spends**: nothing generates; mail and models are stubbed in tests; the walk runs on a scratch Postgres.

## Readings pinned where the specs are silent
1. The ring follows ADR-112: dotted, opacity .26, cut away around each disc and its name.
2. "Add someone" names the action everywhere, the nav button included (ADR-122).
3. The orbit (ADR-121, 124): other profiles with a natal report that is not failed; the other person of a pair shared with
   the reader; the reader's givers (MB-98); waiting gifts; one Add someone point; never a point per credit. The centre is the
   viewer's own chart; none or several marked, the dashed centre.
4. The legend reuses `triadRows`/`rowText` ("16.44° Leo · 7th (partnership)"); the busiest house prints the word as the spec
   does ("4 planets in the 9th (Belief)").
5. A nudge sits above the control it names and never draws a second button; it shows until acted on, remembered by report id
   in localStorage (MB-43's rule: functional, no personal data; the privacy draft names the key, MB-33).
6. The picker never navigates after creating (ADR-131): its button reads "Generating" with dots (ADR-130), then the pair's
   row turns Writing and opens when finished.
7. `creditsEnforced()` (MB-97 provisional): true on staging and in development, false on production until checkout.
8. A gift needs an account. Its token lives 30 days, a send's 7; expiry is applied on read. A reminder mints a fresh token for
   the same gift (only the hash is stored), keeping its expiry.
9. A gift's credit moves to the recipient on claim (ADR-123). History reads bought (+N, date), gift (+1, "A gift from
   {giver}") and spent (−1, the report's name; "Gift to {name}" on the giver's side).
10. Stop sharing (MB-98): a sent report moves to the recipient's account and leaves the giver's; a gifted chart drops the
    giver's reading; a pair the giver already made stays the giver's.
11. Send is offered only for a finished natal report the viewer made about someone else, and for a pair only when the
    viewer's own profile is one of the two; to someone already on Stars Decoded a pair is granted at once.
12. A claim asks "Is this you?" only when the recipient already has a self profile (annex); otherwise it is theirs at once.
13. The share block's line reads "Share it with {B}." (MB-100 provisional); "Send to {B}" sends the report.
14. The birth form's literal price leaves its button (R-6.3; the landing spec lists it); geocoding stays as it is (MB-30,
    ADR-109).
15. Copy no spec gives passes `/ux-copy`; layouts pass `/web-taste`'s checks (both arrive with the merge; §9, ADR-117).
16. `isSelf` in `ProfileSummary` and `ReportParticipant` means the viewer's own chart from the viewer's side (the owner's
    `is_self`, or the claimer's `claimed_as_self`), so the pair hero's left side and `recipientOf` hold for a participant.

## Pinned shapes
- **Schema** (R10-01). `profiles`: `claimed_as_self boolean NOT NULL DEFAULT false`; `gifted_by_user_id text NULL` (indexed).
  `invite_tokens`: `kind text NOT NULL DEFAULT 'send'` (`send` | `gift`); `profile_id` nullable (a gift has no profile until
  written); `credit_id text NULL REFERENCES credits(id) ON DELETE SET NULL`; `recipient_name`, `note` text NULL;
  `reminded_at`, `revoked_at` timestamp NULL; index `(created_by_user_id, kind)`. `CREDIT_STATUSES` gains `held` (text, no DDL).
- **Contract** (R10-02; operationIds in brackets). `Access` = owner | claimed | participant | gifted. `SendState` =
  `{ state: can_send | can_grant | sent | joined; profileId; relationshipId: string | null; firstName }`.
  `Report` + `access`, `send: SendState | null`, `giverName: string | null`. `ReportSummary` + `access`, `send`, `sharedBy:
  string | null`. `ProfileSummary` + `claimedAsSelf`, `giverName`, `send`; `ownership` + `gifted`; `isSelf` per reading 16.
  `UpdateProfileBody` + `claimedAsSelf?`. `POST /profiles/{id}/stop-sharing` → 204 [stopSharingProfile].
  `POST /compatibility/{id}/send` `{ email? }` → 201 `PairSendResult { state: invited | granted; invite: InviteSummary | null }`
  [sendCompatibility]; `POST /invites` keeps its shape. `InvitePreview` + `kind`, `recipientName`, `note` (`inviterName`
  carries a first name, never an email). `InviteClaimResponse` + `kind`, `giftId: string | null`, `askSelf: boolean`.
  `CreateReportBody` + `giftId?`. `Gift { id; recipientName; email; note; sentAt; returnsAt; remindedAt; state: waiting |
  claimed | written | returned; creditHeld; profileId }`; `CreateGiftBody { recipientName; email; note? (≤ 280) }`;
  `GET /gifts` [listGifts], `POST /gifts` → 201 [createGift], `POST /gifts/{id}/remind` → 204 or 429 [remindGift],
  `DELETE /gifts/{id}` → 204 or 409 [takeBackGift]. `OrbitMember { id; firstName; via: send | gift; since }`,
  `GET /orbit/members` [listOrbitMembers]. `CreditCounts` + `held`, `lastBundle: { id; count; createdAt } | null`;
  `CreditHistoryItem { kind: bought | gift | spent; count; date; label }`, `GET /credits/history` [getCreditHistory].
- **Access** (R10-06, `api/src/lib/access.ts`, pure): `canReadProfile` also admits `giftedByUserId`; `accessFor(viewer,
  profile): Access | null`; `sendStateFor(viewer, profile, report, openInvite): SendState | null`; `pairSendStateFor(viewer,
  selfProfileId, other: { profileId; name; claimedByUserId; accessRole }, openInvite): SendState | null`;
  `profileOwnershipFor` adds `gifted`. `api/src/lib/names.ts`: `firstNameOf(userId): Promise<string | null>` (the user's
  self profile's first word, else Clerk's first name, else null), `firstWord(name): string`.
- **Mailer** (R10-09): `sendReportEmail({ to, giverFirstName, personFirstName, claimUrl })`, `sendPairEmail({ to,
  giverFirstName, otherFirstName, url, granted })`, `sendGiftEmail({ to, giverFirstName, recipientFirstName, note, claimUrl })`,
  `sendGiftReminder({ to, giverFirstName, recipientFirstName, claimUrl })`, each `Promise<boolean>`; `sendInviteEmail` goes.
- **Ledger** (R10-10): `holdCredit(userId, inviteId): Promise<string | null>`, `moveHeldCredit(inviteId, toUserId)`,
  `returnHeldCredit(inviteId)`, `returnExpiredHolds(now?)`, `getCredits(userId)` (+ `held`, `lastBundle`),
  `creditHistory(userId)`, pure `historyLines(rows)`.
- **Web libs.** `sky-card.ts`: `elementLead(elements): { lead; line; empty: string[] }`, `modalityLine(modalities)`,
  `houseCells(chart): { house; word; bodies }[]` ([] when blind), `busiestHouse(cells): { house; count; line } | null`.
  `pair-row.ts`: `PairRowState` = open | generate | get_credits | their_writing | generating | pair_writing | needs_yours,
  `pairRowState(input)`, `PAIR_ROW_COPY`. `orbit.ts`: `OrbitPoint { id; kind: person | member | gift | add; name; initials;
  label; writing; sharedPair; profileId?; reportId?; giftId? }`, `orbitPoints({ profiles, reports, members, gifts, credits,
  enforced })`, `pointAngles(n, offsetDeg?)`, `ringGaps(angles, radius, halfWidths)`, `partnersOf(pointId, pairs)`,
  `initials(name)`. `credits-view.ts`: `creditsEnforced(appEnv?)`, `creditDots(n): { lit; more }`, `BUNDLES` (1 "One report",
  3 "Someone and the two of you", 5 "Your people and how you fit"), `pathSteps(balance, have)`. `nudges.ts`: `nudgeFor(card,
  seen): Nudge | null`. `pair-selection.ts`: `preselectPair(a, b): Partial<PairSelection>`.
- **Components.** `StatusDots({ label })`; `Orbit({ centre, points, selectedId, partners, onSelect })`; `SkyCard({ person: {
  name; birthDate; chart; writing }, self?, compatibility?, nudge?, send?, credit?, primary })` (the page fetches the chart,
  so R11 reuses it on sample people); `SendDialog({ open, onClose, target })`, `SendLine({ send, onSend })`;
  `GiftCover({ giverName, recipientName, note })`; sheets take callbacks and never import one another.

## Parallel groups
**Round start** (orchestrator). **Group A**, one message: R10-01 to R10-05, no dependencies. **Group B**, one message once A is
green (it reads R10-01's columns and R10-02's generated client): R10-06 to R10-20. **Group C**, one message once B is green:
R10-21, R10-22. Then the gate. If R10 must shrink, R10-10, 11, 17, 19, 20 and the gift parts of R10-15 move to R11 with the
landing, and R10-21 wires only what landed.

---

## Group A — the columns, the contract, the rules

### R10-01 — The columns for Send and Gift (INTERNAL) · Sonnet
Objective: every column Send and Gift need, added by one idempotent script the bootstrap runs.
Files: `packages/db/src/schema/profiles.ts`, `inviteTokens.ts`, `credits.ts`, new `packages/db/scripts/migrate-add-send-and-gift.ts`,
`scripts/bootstrap-db.sh` (step 3i and its why-comment).
Refs: dashboard-sky Data; credit-loop Data; ADR-120, 123, 124; MB-81, 83; MASTERFILE R-7.3, §3; pinned schema.
Done when:
- The pinned columns exist in drizzle and in the script (`ADD COLUMN IF NOT EXISTS`, a guarded `DROP NOT NULL`, indexes `IF NOT
  EXISTS`); existing rows read `kind = 'send'` and `claimed_as_self = false`; `CREDIT_STATUSES` gains `held`.
- On a scratch Postgres 16 with a dummy `OPENAI_API_KEY` (MB-80's default): `db:bootstrap` on an empty database, then twice more,
  all clean; step 2's `push` reports no drift after step 3i; `packages/db` tests green.

### R10-02 — The contract and codegen (INTERNAL) · Opus
Objective: every shape Send, Gift, the orbit and the credits need, in `openapi.yaml`, with the client and zod regenerated.
Files: `packages/api-spec/openapi.yaml`; `packages/api-client-react/src/generated/**`, `packages/api-zod/src/generated/**` (codegen only).
Refs: pinned contract; MASTERFILE R-7.2; dashboard-sky Data; credit-loop Data; MB-82, 84, 85; readings 8, 9, 16.
Done when:
- Every pinned schema, field, path and operationId is in the spec with a one-line description naming its ADR; `POST /invites`
  keeps its shape; `/admin/*` stays out.
- `pnpm --filter @workspace/api-spec run codegen`, then typecheck green with no other file changed (every addition is
  additive); a second codegen leaves no diff.

### R10-03 — The card's rules, the row's state, the status with dots (INTERNAL) · Sonnet
Objective: the pure rules the card and the compatibility rows read, and the status every control under way becomes.
Files: new `web/src/lib/sky-card.ts` (+ `sky-card.test.ts`), new `web/src/lib/pair-row.ts` (+ `pair-row.test.ts`),
new `web/src/components/StatusDots.tsx`.
Refs: dashboard-sky The card 3, 4, Compatibility (the table), acceptance 4, 5, 7, 10, 13; ADR-92, 94, 98, 130; reading 4; pinned libs.
Done when:
- A lead only at 4 or more of the ten and 2 clear of the next ("Fire leads · 5 of 10"), else "Spread across the four"; empty
  elements named ("No air"); the modality counts on one line; the busiest house needs three or more; a blind chart has no cells
  and reads "Houses need a birth time".
- Tests: the seven fixture charts, computed through `api/src/lib/chartCalculation.ts` in the test (nothing added to web), read
  as the artifact's table; `pairRowState` returns each of the table's rows from its inputs.
- `StatusDots` prints its label with three pulsing dots, still dots under reduced motion, `role="status"`.

### R10-04 — Who is on the orbit, and where (INTERNAL) · Opus
Objective: the orbit's membership and geometry as pure functions the dashboard and R11's sample orbit share.
Files: new `web/src/lib/orbit.ts` (+ `orbit.test.ts`).
Refs: dashboard-sky The orbit, Empty states; credit-loop Credits you can see; ADR-89, 90, 96, 112, 121, 124; readings 1, 3,
16; pinned `orbit.ts`.
Done when:
- `orbitPoints` returns people per reading 3 and one `add` point labelled ADD SOMEONE, or GET CREDITS at zero when `enforced`;
  the reader is never a point; `writing` and `sharedPair` follow the spec's states.
- `pointAngles` spaces points evenly; `ringGaps` cuts the ring around each disc and its name, no gap overlapping the next;
  `initials` handles one-word and accented names; `partnersOf` lists who shares a pair with a point.
- Tests: 0, 1, 2 and 9 people, a failed report, a writing report, a waiting gift, a member and a shared pair.

### R10-05 — The Terms say what a shared reader sees (USER-FACING) · Sonnet
Objective: the Terms describe Send, a pair's participant, Gift and Stop sharing as R10 builds them.
Files: `web/src/pages/legal/TermsPage.tsx`.
Refs: MB-85 (decided), ADR-135, 120, 123, 124, 127; R-3.5; MB-31 (the entity: the page stays a draft).
Done when: the page says a participant of a Compatibility report sees both birth records and passages quoted from both
Personal natal reports; a sent report becomes the recipient's and the giver reads it until Stop sharing; a gift holds one
credit for 30 days and returns it unclaimed; anyone can Stop sharing, Not me or Delete; its words pass `/ux-copy`; nothing
about the company changes.

---

## Group B — the routes, the emails, the ledger, the pieces of the dashboard

### R10-06 — Who can read, list and delete (USER-FACING) · Opus — provisional MB-98
Objective: a claimer reads and lists the report made for them (MB-84), a giver reads a gifted chart, a recipient deletes, and
every report says how the viewer reaches it and whether they can send it.
Files: `api/src/lib/access.ts` (+ new `access.test.ts`), new `api/src/lib/names.ts`, `api/src/routes/reports.ts`.
Refs: dashboard-sky Data, acceptance 11; credit-loop Who sees what, acceptance 2, 5; ADR-133, 134; MB-84, 98; R-3.5;
readings 10, 11, 16; pinned access and contract.
Done when:
- The pinned helpers exist, pure and tested (owner, claimer, giver, stranger, anonymous session; each send state).
- GET /reports lists natal reports owned, claimed or gifted to the viewer with `access`, `send`, `sharedBy`; GET /reports/:id,
  /status and the workbook read through `canReadProfile` (anonymous sessions as today); participants carry `isSelf` from
  the viewer's side; refusals stay 404.
- DELETE by the owner or the claimer, never by a gifted chart's giver. POST /reports with `giftId` checks the viewer claimed
  that gift, links the token to the new profile and, when "This is my natal chart" is ticked, sets `giftedByUserId`.

### R10-07 — Send to {name}, for a person and for a pair (USER-FACING) · Opus
Objective: Send hands a finished report to the person it is about; a claim makes it theirs; a pair goes only from one of its
two, and at once to someone already joined.
Files: `api/src/routes/invites.ts`.
Refs: dashboard-sky Sending, acceptance 11; credit-loop Two verbs, acceptance 1, 2; ADR-120, 133, 135; MB-81, 82, 85;
readings 8, 11, 12; pinned contract, mailer and ledger.
Done when:
- POST /invites only for a finished report the viewer made about someone else and not yet joined (409 otherwise). POST
  /compatibility/{id}/send only when the viewer's own profile is one of the two: an invite as today, or participant access at
  once with a notice email (`granted`) when the other person is already on Stars Decoded.
- A send claim sets `claimedAsSelf` unless the claimer already has a self (then `askSelf`); a gift claim moves the held credit
  and answers `kind: gift`, `redirectTo: /chart?gift={id}`; the email binding holds for both.
- GET /invites/:token gives the giver's first name, never an email, with `kind`, `recipientName` and `note`.

### R10-08 — This is me, Not me, Stop sharing, and the reader's givers (USER-FACING) · Opus — provisional MB-98
Objective: the recipient controls a report that is theirs; the orbit learns who gave the reader something; the new routers mount.
Files: `api/src/routes/profiles.ts`, new `api/src/routes/orbit.ts`, `api/src/routes/index.ts`.
Refs: dashboard-sky Sending; credit-loop Who sees what, acceptance 2, 5; ADR-120, 124, 127; MB-81, 98; readings 10, 16; pinned contract.
Done when:
- GET /profiles returns claimed and gifted profiles with `claimedAsSelf`, `giverName`, `send`, `ownership` (with `gifted`) and
  `isSelf` per reading 16, and never another user's other people.
- PATCH takes `claimedAsSelf` from the claimer (setting it clears the viewer's other self marks). POST
  /profiles/{id}/stop-sharing moves a sent report to the claimer's account or clears a gifted chart's giver; 404 for anyone else.
- GET /orbit/members lists the viewer's givers once each, first name only; `index.ts` mounts `gifts`, `orbit` and `adminCredits`.

### R10-09 — The emails: sent, shared, gifted, reminded (USER-FACING) · Sonnet
Objective: every email is in the giver's name, names the right people, never says "made", and a gift arrives as its cover.
Files: `api/src/lib/mailer.ts` (+ new `mailer.test.ts`), `scripts/render-brand.mjs`, new `web/public/gift-cover.png`.
Refs: credit-loop Two verbs ("Emails never say 'made'"), acceptance 5; ADR-127, 128, 135; MB-85; `logo.md`; pinned mailer.
Done when:
- Send: "Your Personal natal report is ready" · "{giver} had it written for you."; the pair names the other person, never the
  invitee's own profile; Gift: "{giver} gave you a Personal natal report", the cover (the starfield image with the mark, "A gift
  from {giver}", "Your Personal natal report, for {name}", the note), then "Claim my report"; the reminder repeats the button.
- Tests: no "made" or "created" in any subject or body; first names only, no address in a body; the note is escaped; the words
  pass `/ux-copy`.
- `pnpm brand:render` also writes `gift-cover.png`; without Chromium the header keeps today's mark and the round report says so.

### R10-10 — The ledger holds, moves and returns a credit (USER-FACING) · Opus — provisional MB-6, MB-97
Objective: one balance with a gift's hold, its move on claim, its return, and History.
Files: `api/src/lib/credits.ts` (+ new `credits.test.ts`), `api/src/routes/credits.ts`.
Refs: credit-loop Credits you can see, Data, acceptance 4; ADR-123, 129; R-6.1, 6.2, 6.4; MB-6, 57, 83; readings 8, 9; pinned ledger.
Done when:
- Each pinned function is one guarded update (`FOR UPDATE SKIP LOCKED` where it picks a row) and idempotent; with no credit to
  hold, the gift still goes and the soft pass logs it (`// MB-6 provisional`).
- GET /credits gives `available`, `used`, `held` and `lastBundle` after returning expired holds; GET /credits/history gives
  the bought, gift and spent lines of reading 9, newest first.
- `historyLines` tested on bought, gift, spent and returned rows; `consumeCredit` and `refundCredit` unchanged.

### R10-11 — Gift a report (USER-FACING) · Opus — provisional MB-6
Objective: a gift holds a credit for 30 days, can be reminded or taken back, and returns its credit unclaimed.
Files: new `api/src/routes/gifts.ts`.
Refs: credit-loop Two verbs, Credits you can see, acceptance 4, 5, 8; ADR-120, 122, 123, 127, 128; reading 8; pinned contract, ledger, mailer.
Done when:
- POST /gifts (signed in; 401 otherwise) stores a `gift` token (no profile, 30 days, first name, email, note), holds a credit
  and sends the gift email; GET /gifts returns the giver's gifts, newest first, each waiting, claimed, written or returned,
  after returning expired holds.
- POST /gifts/{id}/remind at most once a day (429 sooner) mints a fresh token and sends the reminder; DELETE /gifts/{id} while
  waiting revokes it and returns the credit (409 once claimed); only the giver reaches any of them (404).
- No response carries a timer or countdown (ADR-127): dates only.

### R10-12 — The orbit (USER-FACING) · Opus
Objective: the reader at the centre, their people on a plain ring, a tap that holds the drift.
Files: new `web/src/components/dashboard/Orbit.tsx`, new `web/src/components/dashboard/orbit.css`.
Refs: dashboard-sky The orbit, acceptance 1, 2, 3, 12; annex Micro animations; credit-loop Credits you can see; ADR-89 to 91,
96, 112, 121; readings 1, 3; pinned `orbit.ts` and `Orbit`.
Done when:
- The centre: the first name on the product gradient, "YOU" above, "At a glance ›" below; with no report, the dashed disc "Your
  chart · Generate it ›". A point: initials in a disc, the first name in Space Grotesk capitals, on the ring of reading 1; "·
  WRITING" with a dashed turning ring; violet (`#9575CD`) for a shared pair; a waiting gift teal (`#3FA796`), dashed, with an
  envelope and "{NAME} · GIFT WAITING"; the "+" point with its label.
- About 3°/s of drift and a float per point; a tap holds the drift, fills the point, dims the rest to .4 and keeps partners lit
  with their violet rings; the annex's micro animations, each under a second; Escape or empty sky resumes; the centre and every
  point are keyboard buttons.
- Reduced motion: nothing moves. No zodiac, degree, render or Unicode glyph on the orbit.

### R10-13 — The card (USER-FACING) · Opus
Objective: a person's chart at a glance, computed from the stored chart, with one door to the report.
Files: new `web/src/components/dashboard/SkyCard.tsx`, new `web/src/components/dashboard/CardSections.tsx`.
Refs: dashboard-sky The card 1 to 7, the reader's own card, acceptance 4, 5, 10; ADR-92, 98, 99, 130, 131; MB-86; readings 4, 5;
`TriadPlate`, `triadRows`, `BalanceRail`'s rows, `HOUSE_WORDS`, `renderFor`; pinned `sky-card.ts` and `SkyCard`.
Done when:
- The brass eyebrow "Personal natal report" (" · writing"), the name, the birth date, "birth time unknown" when blind;
  `TriadPlate` and its legend rows (a band "10.19°–22.85° Pisces"; a blind Rising "Add {name}'s birth time to draw the horizon");
  the element rows in element hues with the lead and the modality line; twelve house cells with the renders, the busiest
  outlined and named; blind: "Houses need a birth time".
- Then the slots in order (the compatibility rows, the nudge, the send line) and one primary: "Open {name}'s report", or the
  Writing status with dots; never "Read as it writes"; no "In your chart" line; no Unicode glyph.
- The reader's own card: "Your Personal natal report", the same sections, "Your compatibility reports" (each Open, or "Tap
  someone in your orbit to read the two of you together"), the credit row slot, "Open your report".

### R10-14 — Compatibility rows and the picker with the pair chosen (USER-FACING) · Opus
Objective: one row per pair and state, a Generate that opens the picker with both people chosen, and no lens on the dashboard.
Files: new `web/src/components/dashboard/CompatibilityRows.tsx`, `web/src/components/CompatibilityPicker.tsx`,
`web/src/lib/pair-selection.ts` (+ `pair-selection.test.ts`).
Refs: dashboard-sky Compatibility, acceptance 6, 7, 10; ADR-93, 94, 105, 130 to 132, 136; MB-86; reading 6; pinned `pair-row.ts`.
Done when:
- Each table row renders its copy and its enabled or disabled control; a pair shared with the reader is one tappable row with a
  chevron and, inside it, "↥ Send to {B}" until B joins, then "{B} can read it too"; "Compatibility report" over "{A} & {B}".
- `preselectPair` enters as the picked selection (ADR-105's checks hold); Generate scrolls the picker into view and focuses it
  with both chosen; the picker keeps its lens choice (ADR-40, 68) and follows reading 6.
- Tests: `preselectPair` against a list holding both reports, one, and neither.

### R10-15 — Credits in sight: the pill, the sheet, the path (USER-FACING) · Opus — provisional MB-6, MB-97
Objective: one balance always in sight, History behind a fold, and a skippable path after a bundle of 3 or more.
Files: new `web/src/components/dashboard/CreditPill.tsx`, `CreditsSheet.tsx`, `PathSheet.tsx`, new `web/src/lib/credits-view.ts` (+ test).
Refs: dashboard-sky Credits, annex Credits, acceptance 8; credit-loop Credits you can see, The path after buying, acceptance 4,
6; ADR-95, 125, 129; MB-5, 6, 97; readings 5, 7, 9; pinned `credits-view.ts`.
Done when:
- The pill reads "2 credits" (greyed "0 credits") and opens the sheet: "N credits to use", a lit dot per credit up to ten then
  "+N", Add someone and Gift a report (callbacks), the three bundles as counts with their names, Get credits only when credits
  are enforced (with one line that checkout opens with payments), and a History fold.
- The path shows once per bundle of 3 or more (`lastBundle`, remembered by bundle id): steps planned from the whole balance and
  what exists (3: your chart, someone close, the two of you; 5: your chart, two people, two pairs), a waiting step with its
  reason, a dot per credit left, "Or skip; nothing expires."
- Tests: `creditDots`, `pathSteps` for 3, 5 and a top-up of 3 onto 3, `creditsEnforced` per environment.

### R10-16 — Send to, Joined, and the share block's third button (USER-FACING) · Opus — provisional MB-100
Objective: one Send dialog for a person and for a pair, on the report, the row and the card; Joined once they are in.
Files: new `web/src/components/SendDialog.tsx`; delete `web/src/components/InviteModal.tsx` and `ProfileInviteHistory.tsx`;
`web/src/pages/ReportPage.tsx`, `web/src/components/report/ShareCard.tsx`, `web/src/pages/CompatibilityReportPage.tsx`.
Refs: dashboard-sky Sending, annex Sharing, acceptance 11; credit-loop Two verbs, acceptance 1; ADR-120, 133, 135; MB-81, 82,
85, 100; readings 11, 13; pinned contract and components.
Done when:
- `SendDialog` asks only for an email (none when `can_grant`), names the person by first name, calls POST /invites or
  /compatibility/{id}/send, shows the copy link when the email did not go and "{B} can read it now." when granted; `SendLine`
  prints "Send to {first name}", "Sent · waiting for {name}" or "Joined ✓" from `send`.
- The natal report offers Send to {first name} where `send` allows; the block's third button "Send to {B}" shows only for one of
  the two; the card's line reads "Share it with {B}." (`// MB-100 provisional`).
- No "Share with" or "Invite {name}" string remains on the dashboard or either report page (credit-loop acceptance 1).

### R10-17 — Add someone and Gift a report (USER-FACING) · Opus — provisional MB-6, MB-97
Objective: three choices with the credit named, a gift in four steps with its cover previewed, a waiting gift to remind or take back.
Files: new `web/src/components/dashboard/AddSomeoneSheet.tsx`, `GiftFlow.tsx`, `GiftCover.tsx`, `WaitingGiftCard.tsx`.
Refs: credit-loop Two verbs, Credits you can see, acceptance 3, 4, 5, 8; ADR-120, 122, 123, 127, 128; reading 8; pinned
contract and `GiftCover`; the artifact's four steps.
Done when:
- Add someone: "Who is it for? · 1 of your N credits" with Someone you know (the birth form, then Send), Gift a report, Two
  people together (the picker), as callbacks; at zero with credits enforced, the credits sheet instead.
- The gift: first name, email, a note; "How it arrives" shows `GiftCover` (starfield, the mark, "A gift from {giver}", "Your
  Personal natal report, for {name}", the note) before Send; the last step says the credit is held and the date it returns.
- The waiting gift's card: when it was sent, the date its credit returns, Send a reminder (its status after), Take it back;
  no countdown; reduced motion stops the gift rings.

### R10-18 — The recipient: a claim that is theirs, a gift that starts their chart (USER-FACING) · Opus
Objective: a sent report opens as the recipient's own after the time question; a gift opens the form that ends with "This is my natal chart".
Files: `web/src/pages/ClaimPage.tsx`, `web/src/pages/BirthFormPage.tsx`.
Refs: dashboard-sky Sending; credit-loop Two verbs, acceptance 2, 5; ADR-38, 120, 128; MB-59, 84, 85; readings 12, 14;
pinned contract and `GiftCover`.
Done when:
- A send claim: "From {giver}", the time question first (as today), "Is this you?" only when `askSelf` (This is me, Not me),
  then the report opens; wrong-email and expired claims keep today's lines.
- A gift claim: the cover with "Claim my report", then `/chart?gift={id}`: the name prefilled, "This is my natal chart" ticked,
  and unticked the name field asks "Whose chart is it?"; the form posts `giftId`.
- The form's button carries no literal price and its words pass `/ux-copy`; geocoding is untouched.

### R10-19 — One nudge at a time (USER-FACING) · Sonnet
Objective: the four nudges, inside the card they belong to, never more than one.
Files: new `web/src/lib/nudges.ts` (+ `nudges.test.ts`), new `web/src/components/dashboard/Nudge.tsx`.
Refs: credit-loop The nudges (the table), acceptance 7; ADR-126, 127; MB-43; reading 5; pinned `nudges.ts`.
Done when:
- `nudgeFor` picks at most one of the table's rows for a card, in the table's order, from what just finished and what was seen
  (localStorage `sd.nudge.seen`, report ids only); `Nudge` prints its two lines above the control it names, no button of its own.
- Tests: each row alone; two at once yield the first; a seen report yields none; zero credits yield "Your orbit has room for more".

### R10-20 — Grant credits on staging (INTERNAL) · Sonnet — provisional MB-97
Objective: the Owner can hold 1, 3 or 5 credits on staging to walk every credit state; production refuses.
Files: new `api/src/routes/adminCredits.ts`, new `web/src/pages/AdminCreditsPage.tsx`, new `web/src/lib/adminApi.ts`, `web/src/App.tsx`.
Refs: MB-97; ADR-42, 86; `labGuard`, `labReadOnlyGuard`, `grantBundle`; MASTERFILE R-7.4.
Done when: POST `/api/admin/credits/grant` `{ count: 1 | 3 | 5 }` behind `labGuard` grants a bundle to the admin's own account
and answers 403 when `APP_ENV` is production; `/admin/credits` shows the balance and three buttons; the route stays outside
`openapi.yaml` like every `/admin/*` route; no secret anywhere.

---

## Group C — the dashboard assembled, the walk

### R10-21 — The dashboard assembled (USER-FACING) · Opus
Objective: the orbit and its panel or sheet above, the dense lists below, every state wired, nothing of the old zones left.
Files: `web/src/pages/DashboardPage.tsx`, new `web/src/components/dashboard/glyph-gate.test.ts`.
Refs: dashboard-sky Layout, Empty states, acceptance 1 to 12; annex Empty states, Credits; credit-loop acceptance 1, 3, 6, 7;
ADR-89 to 96, 121 to 126, 130 to 132; readings 2, 3, 5, 6, 7.
Done when:
- The nav: the wordmark, the pill, Add someone, the account menu. Desktop (`max-w-4xl`): the orbit left (≤ 440 px), the panel
  right (the card, or the reader's name, triad rows, a hint and the credit row); phone: the orbit full width, the card as a
  bottom sheet (peek, drag up, tap empty sky to close); the card's chart comes from `useGetReport` on tap.
- Below: Your People (Send to or Joined ✓, "From {giver} · marked as yours", This is me ✓, Not me, Delete, Stop sharing
  with {giver}) and Compatibility (the rows, the picker); failed reports stay listed; the four empty states with the annex's
  copy; waiting gifts, givers, the nudges and the path sheet wired.
- `glyph-gate.test.ts` finds no Unicode planet or sign glyph in `web/src/components/dashboard/` or `DashboardPage.tsx`; no
  sideways scroll at 390 px; typecheck, both builds and every test green on the merged groups.

### R10-22 — The walk: routes and ledger on a scratch Postgres (INTERNAL) · Sonnet — provisional MB-49
Objective: prove every access and ledger rule end to end, with no Clerk and no network.
Files: new `api/src/walk/loop.walk.ts`, `api/package.json` (a `walk` script; `*.walk.ts` stays out of `test`).
Refs: dashboard-sky acceptance 11; credit-loop acceptance 2, 4, 5; MB-49, 84, 97, 98; R09's scratch Postgres.
Done when:
- Against `WALK_DATABASE_URL` after `db:bootstrap` (skipped without it), the routers on a bare Express app whose stub sets
  `userId` and `sessionId`: send, claim, the claimer reads and lists (MB-84), Not me, Stop sharing (the giver then 404s),
  Delete by the claimer; a pair to a joined person reads at once; a gift holds, is taken back (credit back), expires (credit
  back), is claimed (credit moves), is written (each on the other's orbit, neither sees the other's people); Grant refuses on
  production.
- Mail goes to a stub (no `RESEND_API_KEY`); the orchestrator pastes the summary into the round report.

---

## Acceptance
**Free, in the round (the gate):** `pnpm install --frozen-lockfile`, typecheck, `build:web`, `build:api`, unit tests (the lead
rule, the house tally, the row state, the orbit, the dots and the path, the nudges, the access helpers, the history lines, the
mailer's words, the glyph gate), codegen with no diff after R10-02, `db:bootstrap` three times on a scratch Postgres 16 as
R10-01 states, the walk (R10-22), and smoke on the Vercel preview. **No dry lab**: the orchestrator confirms `git diff
--name-only main... -- api/src/prompts api/src/lib/models.ts api/src/lib/aiInterpretation.ts api/src/lib/traditional.ts
api/src/lib/chartCalculation.ts` is empty. Nothing generates or spends.
**On staging after the merge (the Owner's look, three lines):**
1. The dashboard opens on the orbit: tap a person for the card (plate, elements, houses, pairs, Send), tap your name for
   yours; on a phone the card is a bottom sheet.
2. Send a finished report to a second email of yours and claim it signed in with that email: it opens as theirs, the giver's
   row reads Joined ✓, and Stop sharing takes it off the giver's dashboard.
3. `/admin/credits` → 3 credits: the pill, the sheet with dots and History, the path; Add someone → Gift a report with its
   cover; claim it with the second email, write the chart: each is on the other's orbit; Take it back returns a credit.
If Resend's domain step (runbook L) is not done, mail reaches only the Resend account's own address; the dialogs' copy link
works either way.
**Production** moves only on "promote". The Release view runs the full lab (the brain changed: R09's v7 awaits its first Release) and the QA
agent, stops at `passed` while MB-75 is open, then `promote.yml` takes the release id. MB-97's switch keeps production on the
soft pass; the bible's release log gains the round (R-8.1).

## Risks
1. **Schema** (R-7.3): two columns on `profiles`, six on `invite_tokens` with `profile_id` made nullable, a new credit status.
   One idempotent script, run three times on scratch; a script that cannot run twice would stop Railway's start.
2. **Contract** (R-7.2): additive fields, eight new operations, one new pair-send route; `POST /invites` keeps its shape so
   group A stays green.
3. **Access widens**: claimers read, list and delete; givers read gifted charts; Stop sharing moves ownership. Every path is in
   the walk; refusals stay 404, so no id is confirmed. What each side sees is provisional (MB-98).
4. **Money-shaped state before payments** (R-6.2, MB-6, MB-57): held and moved credits live in our ledger; the payments round
   keeps them as our own state over the provider's grants. The soft pass goes on: with no credit, a gift still sends.
5. **User-visible without a locked spec**: the staging grant (admin only, MB-97) and the readings above; each is named where it lands.
6. **Emails** (USER-FACING): four new templates through Resend; the cover image needs Chromium for `brand:render` (fallback noted).
7. **Old code goes**: the three zones, `InviteModal`, `ProfileInviteHistory`, the "Unlock" badge; the picker stops navigating.
8. **No report content change** and **no new dependency** (the drawer, framer-motion and lucide are already in `web`).
9. **Size**: twenty-two cards, fifteen in group B; the shrink path is in Parallel groups.
10. **Privacy**: two localStorage keys (the nudge, the path) under MB-43's rule; the privacy draft names them (MB-33).

## Questions raised (Mailbox, before the round starts)
For the Owner, highest stakes first (R-12.1); each builds at its default if silent:
1. **MB-97, credits before checkout.** Nothing grants a credit today, so every account holds zero and the specs' zero states
   would stop every dashboard spend.
   Recommendation: one `// MB-97 provisional` switch, on for staging (every zero state as locked, Get credits opening a sheet
   that says checkout comes with payments) and off for production (the soft pass, the true count shown, no dead end), plus a
   staging-only admin "Grant credits" (1, 3 or 5) so you can walk the 3 and 5 paths, a gift and History. If unanswered: exactly that.
2. **MB-98, what a send or a gift shows each person of the other.** Recommendation: the giver's point on the recipient's orbit
   shows a first name and how you are connected, and the giver's chart only where a shared Compatibility report already shows
   it; the giver reads a gifted report only when it is the recipient's own chart; Stop sharing ends the giver's reading, while
   a Compatibility report the giver already made stays theirs. If unanswered: built that way, provisional.
3. **MB-99, for R11: signed-out writing.** Once every landing button reaches the birth form without an account, anyone can
   write reports free and unthrottled until payments. Recommendation: R11 ships a small daily cap per session and per IP on
   POST /reports with the landing (MB-23 pulled forward), and the landing is not promoted before it. If unanswered: the same.
For the Mailbox, at their defaults: **MB-100** the share block's two sends · **MB-101** (R11) commit the r06 sample's text for
/sample · **MB-102** (R11, Owner) Search Console, Bing and the AI-bot rule. Decided and built here: MB-81 to 86.

## Proposed R11 — landing-and-ai-search (outline, planned from `main` after R10)
Groups: **A** R11-01 the engine in the browser (`web` imports `api/src/lib/chartCalculation.ts` unchanged through an alias,
`astronomy-engine` joins `web` at 2.1.19; the hero pinned to Audrey Hepburn and Marie Curie at 0.01°) · R11-02 one place field
(`PlaceField.tsx` from the birth form, the OpenStreetMap credit, ADR-109) · R11-03 prerender and hydrate (`renderToString` with
`ssrPath`, `hydrateRoot`, a build step, `vercel.json`: files, 404, noindex on app routes and on non-production hosts;
`RequireAuth` off `/chart`) · R11-04 the public shell (nav, footer, page head, one site constant for the canonical origin and
Updated dates) · R11-05 the sample data (MB-101; labelled synthetic sample people, ADR-112; the four claims picked by
`/ux-copy`) · R11-06 the signed-out cap (MB-99) · R11-07 the failure lines say the credit is back (MB-91). **B** R11-08 the hero
and the sky screen · R11-09 claims on a timer and Inside · R11-10 Your people (R10's `Orbit` and `SkyCard` in sample mode) and
two charts on one horizon (`TriadPlate`, ADR-113) · R11-11 Method, Birth time, the pricing slot, FAQ, the dawn · R11-12 /sky ·
R11-13 /sample (off production until MB-90 and MB-31 clear) · R11-14 /method and /compatibility (Send and Gift, never "invite")
· R11-15 the two Learn pages · R11-16 /faq. **C** R11-17 the crawl surface (robots.txt, sitemap with lastmod, llms.txt last,
canonical, OG and Twitter per page, JSON-LD with Product but no Offer until the price constant, IndexNow as a public key file)
· R11-18 the home page assembled, `demoChart.ts` deleted (MB-50), the `OAI-SearchBot` check. **Brain:** none, unless Inside's
sentences need a registry field (then the dry lab runs). **Schema:** none. **New dependency:** `astronomy-engine` in `web`.
**Owner:** MB-102 (DNS TXT for Search Console on Vercel DNS, Bing import, the firewall's AI-bot rule at Log, never Deny),
MB-90 and MB-31 before /sample reaches production, MB-99's answer. No payment key, no GitHub secret.

## Close (the orchestrator)
Mark MB-81 to 86 done. Record the answers or defaults for MB-97, 98, 100 at their seams. MASTERFILE §3 gains the new columns
(`claimed_as_self`, `gifted_by_user_id`, `invite_tokens.kind` and `credit_id`, the `held` status). INDEX's code map gains
`web/src/components/dashboard/`, `lib/orbit.ts`, `sky-card.ts`, `pair-row.ts`, `credits-view.ts`, `nudges.ts`,
`routes/gifts.ts`, `routes/orbit.ts`, `routes/adminCredits.ts`, `lib/names.ts` and the walk, and loses `InviteModal`.
CLAUDE.md's current focus names R11. The three lines above go to the Owner with the staging URL.
