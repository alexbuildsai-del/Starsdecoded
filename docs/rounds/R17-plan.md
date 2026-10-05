# R17 plan — Stripe payments: our checkout, a hard ledger, campaigns and testers, Timeline's billing, and QA on the buyer walk's steps

Planned 2026-10-05 on `claude/gracious-keller-vyl7ds` (`main` at 327ef19, with PR #111's process changes: ADR-266, 273, 283) for the
locked spec `stripe-payments` (locked 2026-10-05, ADR-274 to 282; artifact https://claude.ai/artifact/Yamws6GPDB5jKvdk8U8rp2), which
builds on `pricing-and-launch` (ADR-142 to 149, as superseded there) and `timeline` as R16 built it (ADR-262 to 264). **Revised the
same day** on the Owner's answers (ADR-313 to 315; MB-225 at its default; MB-232 for R18) and against `main` at 65c585d, whose three
homes (R-12.3, R-12.7) moved MB-148, 206, 220, 223 and 224 to `docs/backlog.md` as B-30, B-08, B-02, B-01 and B-15. **Besides the
spec, the Owner asked for:** MB-223 (Mira shares the pair report she made with Idris, and the buyer walk proves it; ADR-285), MB-224
(the contract's `PairLink.of`), both QA setups on one step list with the site's Mira and Idris (two accounts, ADR-314), a failed report
that keeps its credit for a free Try again (ADR-313), and a small admin with a staging deploy that never spends (ADR-315). **Order:**
R16 closed 2026-10-04; ADR-282 puts payments next, then a round of fixes. **Scope:** `/checkout` in our look on Stripe's `elements`
mode, four products synced from the catalogue, the webhook as the only grant, hard credits on every host with the free test checkout
deleted, both receipts, campaigns and testers on one admin Sales page, Timeline's subscription as its second access source, automatic
QA on staging after every deploy and in every Release; MB-223 and 224; the Lab page's fixture runs (B-30); MB-219 and B-02, which R16's
sentinel tied to MB-197's seam, done with it. **Cards:** 28 in three groups (9, 11, 8; ADR-283). **Tiers:** 19 Opus, 9 Sonnet, no
Haiku. **Tags:** USER-FACING are R17-03, 05, 07, 08, 14 to 18 and 21; the rest INTERNAL. **The brain does not change** (no prompt,
model, engine or `aiInterpretation.ts` file), so no dry lab runs and no report's words move. **The schema changes** (R17-02). **The
contract changes** (R17-01, 22). **Three new dependencies** (R17-04, 14, 25). No builder needs a credential, nothing goes on GitHub,
nothing generates or pays in the session, a staging deploy costs nothing, and production sells nothing until launch (ADR-167).

## Open Mailbox rows created more than 14 days ago (oldest first, ADR-186)
**2026-09-09:** MB-12 no error reporting or alerting. It blocks no card; MB-232's spec (R18) reads it beside its request errors. The
2026-10-05 sweep moved MB-19, 20, 21, 22 and 49 to `docs/backlog.md` (B-20 to 23); R17-04 still lists every Stripe variable in
`.env.example`, with no value.

## Round number and order
R16 is the last round with a report (closed 2026-10-04; its lessons in 272897e). The Owner set the order on 2026-10-05: R16 Timeline,
then this payments round, then a round of fixes (ADR-282). QA-04 has no sev-1; its sev-2 and sev-3 findings wait for the fixes round
except #2 (the Terms say "There's no subscription."), which R17-08 answers because this round sells one. MB-223 (decided as ADR-285,
now B-01) is the one `blocking` item and comes first. Pricing's launch (`LAUNCHED = true`, the loop study, the Launch view) is not
planned (ADR-230, 242; the spec's out of scope).

## Round start (the orchestrator)
1. Branch `round/R17` from `main` with this plan (merge `claude/gracious-keller-vyl7ds` first), and add MB-225, 227, 228 and 232
   to `docs/backlog.md`'s *Waiting on Alex* (R-12.7).
2. **Lessons first (ADR-265):** this plan is stamped through R16, the last close that wrote `lessons.md`; re-read it against any line
   added since and put each guard that fits into its card's done-when.
3. **R16's staging campaign:** if `report-lab.yml`'s natal and pair campaigns have not run since R16's merge (CLAUDE.md's focus), run
   them now (a few cents). They write as an anonymous visitor on the soft pass, which R17-21 ends at this round's merge (B-30).
4. **Stripe and Clerk facts** (the spec's Research note): the researcher, then the verifier, on what this plan could not read from the
   SDKs (docs.stripe.com and clerk.com were blocked here too): a coupon in `discounts` on an `elements` session; Appearance's `fonts`
   from our origin inside Stripe's frame; the Payment Element's fields for the test card on an EU session; a test clock's customer and
   advance limits; payment method domains and Apple Pay; `clerk.signIn({ emailAddress })` with Testing Tokens on a Development
   instance. Read here from `stripe@22.6.2` and `@stripe/stripe-js@9.17.0`: `ui_mode` `elements`, Prices' `lookup_keys` and
   `transfer_lookup_key`, `discounts[].coupon`, `initCheckoutElementsSdk` on the dahlia train, and the basil-era fields (Pinned shapes).
   A fact that breaks a pinned shape re-pins it before group A; one that can't be re-pinned stops the round (R-0.1).
5. **The artifact's screens:** builders cannot open claude.ai, so extract into the session scratchpad, at 390 px first: checkout look
   B, the flow, the four products, Campaigns, the subscription, Testers, automatic QA, the keys and the checklist (R17-14, 15, 18, 19, 28).
   Campaigns and Testers become the two sections of one Sales page, and automatic QA one line on the Release view (ADR-315). Where a
   builder's draft differs otherwise, the artifact wins and the report says so.
6. `pnpm install --frozen-lockfile`, and confirm `stripe@22.6.2`, `@stripe/stripe-js@9.17.0` and `@clerk/testing@2.2.39` resolve under
   `minimumReleaseAge` (all three are older than seven days; `stripe@23` and `@stripe/stripe-js@10` are not, and move to `endive`).

## What already stands (audit at 327ef19)
- **Met, and reused:** `packages/commerce` (three bundles, `formatEuro`, `CHECKOUT_TICK`, `REFUND_RULES`, `LEGAL_IDENTITY` with
  `saleReady()` and a null postal address under MB-115); the ledger (`bundles`, `credits` with `held`, `grantBundle`, `consumeCredit`,
  `holdCredit`, `refundCredit`, `moveHeldCredit`, `returnExpiredHolds`, `historyLines`); `checkoutLimit`; `timelineAccess` with
  `ACCESS_SOURCES` (the admin) and `subscription` already in its type and the contract; the Account page and the teaser (no price, no
  Start); the QA agent on Railway (playwright-core, Chromium on the image, GET only); the Release's public verdict; `indexNow.ts`'s
  wait for the web's `commit` meta; the release lab's per-report estimates; the buyer walk (15 steps, three accounts, MB-223's refusal
  asserted, MB-224's field set aside); `test.critical` in every package; CI's walk on a throwaway Postgres.
- **Not met:** no Stripe code or dependency; no `/checkout`, webhook, purchases, events, subscriptions, campaigns or testers; credits
  soft everywhere (`consumeCredit` after the write, `holdCredit` lets a gift go with none, the web's `creditsEnforced`); `express.json`,
  the origin guard and the prelaunch gate in a webhook's way; no Start Timeline or Portal; no QA pair and no stored report of the sample
  people (their README: the lab never reads them); `report-lab.yml` writes on the soft pass (B-30); `pairSendStateFor` refuses a pair
  whose other chart was shared (MB-223); `PairLink.of` lacks `none` (MB-224); the Terms say there is no subscription (QA-04 #2).
- **Found while planning:** (1) `stripe@22.6.2` pins `2026-08-26.dahlia`, the spec's version; (2) in that version a subscription's
  period end sits on its item, an invoice names its subscription under `parent.subscription_details` and a line's price under
  `pricing.price_details`; (3) a failed report gave its credit back and Try again rewrote it free, so once credits are real one
  payment could buy two reports: the Owner's rule keeps the credit held instead (ADR-313); (4) drizzle's push can stop to ask before
  dropping a column or adding a unique index over rows, so those changes run in bootstrap step 1 (MB-123's kind of failure); (5) CI
  walks only `buyer.walk.ts`; the loop, sharing and Timeline walks are archived and lean on the soft pass; (6) a running /round cannot
  edit its own skill (R13-05), so the skills' line to read the verdict is B-31 (was MB-230), written at the close; (7) R16's sentinel
  tied MB-219 and B-02 to MB-197's seam, which this round removes; (8) checkout's limit keys on the session (R13-08's lesson); (9) GET
  /timeline/now's six-month view queues paid readings, so the staging walk opens no Timeline page; (10) a Release runs the lab, the
  gate, the QA agent and the forward, so the staging walk is a fifth step after the QA agent; (11) Try again exists only on Personal
  reports (`regenerateRefusal`), so a failed pair has none.

## Where the spec and the Owner's asks meet, and what changes from the spec
1. **The spec's QA buys Couple; the buyer walk needs five credits** → both walks buy Family & friends at step 2, from the credits sheet;
   Couple is what the local walk buys from the birth form when Mira runs out before Tomás (step 13).
2. **The spec's qa-a "Sends a report" to qa-b** → the pair Mira sends Idris (MB-223, ADR-285), claimed from its link. A Personal report
   she wrote about Idris would clash with the one he writes himself; the written-for-someone Send stays Tomás's, local in CI (ADR-314).
3. **qa-a and qa-b** keep their locked `+clerk_test` addresses; their names, birth data and reports are Mira's and Idris's.
4. **The spec's one-time seeding "from a stored lab run" becomes the first Release** (ADR-315): no run of the sample people exists and
   a staging deploy never spends, so each Release's walk writes the pair's three reports for real (about 10.5 ¢) and keeps them as the
   seed; the first Release makes it and later ones refresh it. Until then a deploy's walk marks the seed's steps `not_run`, so
   acceptance 10's full pass after a deploy follows the first Release.
5. **The spec's Run now and the sync's admin button go** (ADR-315): the walk runs after each deploy and in each Release, the sync at
   each start; the walk's last verdict, and a sync problem when there is one, are one line at the top of the Release view.
6. **The spec's Campaigns view, and its Testers view at `/admin/testers`** → two sections of one Sales page at `/admin/sales` (ADR-315).
7. **Acceptance 5's "a failed report gives its credit back"** → it keeps the credit for a free Try again, and gives it back after the
   third failure, on Delete, or at once for a pair (ADR-313, reading 16).
8. **The spec's renewal line before Pay** ("Renews every month at €9.99 until you cancel.") → MB-225's plain line under Pay, beside
   its required box (MB-225 provisional).
9. **"Start Timeline on R16's offer"** → R16 built no Start button (the teaser and Account point to `/timeline`): R17-18 adds it with the
   price; `/timeline` itself shows no price until launch.
10. **The verdict "for that commit"** names no table → `qa_walks` (R17-02).
11. **"/round and /qa read it after every merge"** → a skill edit, not a card (R13-05): B-31 at the close; R17's orchestrator reads it.
12. **Testers on production** → the Sales page works on both hosts, but production's app stays behind the waitlist (ADR-167), so a
    production tester's grant waits for launch.
13. **JSON-LD** is prerendered at full price → after load, only the home page's Offer takes a live campaign's price and end date.
14. **The Owner's checklist** → MB-227 (with MB-229's mail forwarding merged in) and MB-228, each with a default; none blocks the build.

## Goals
1. **MB-223, blocking (ADR-285, B-01):** Mira shares the parent and child report she made with Idris, whose chart came to her by Share
   yours back, and he opens it from the link (amending ADR-235); with MB-224's contract fix (B-15), both found by the buyer walk.
2. **Checkout and a hard ledger** (acceptance 1 to 7, 11): `/checkout` in our look, the four products synced, the webhook as the only
   grant, refunds and disputes taking back unused credits, credits hard on every host, the free test checkout gone, both receipts; a
   failed report keeps its credit for a free Try again (ADR-313).
3. **Campaigns and testers** (acceptance 6, 8): saved on the admin's Sales page under their rules, priced per request, sent to Stripe
   as coupons; testers granted credits that are never revenue.
4. **Timeline's billing** (acceptance 9): both plans in `/checkout`, `subscriptions` as Timeline's second access source (MB-197's seam
   goes), the Portal from the Account page, the yearly plan's credit; MB-219 and B-02 done with it (their defaults tie them to MB-197).
5. **QA on the buyer walk's steps** (acceptance 10): one step list for the buyer walk and the staging walk, the same people; the staging
   walk after every deploy at no cost and in every Release, whose writes become the QA pair's seed (ADR-315); its verdict at
   `/api/qa/latest` and in one line on the Release view; the Lab page's fixture runs (B-30).

## Preconditions
1. Builders read MASTERFILE §0, their card, the pinned shapes and readings it names, and Round start 5's screens.
2. **Single owners.** Each card's files as listed, no file in two cards of a group. `openapi.yaml` and codegen → R17-01 (A) and R17-22
   (C); `api/test.critical` → R17-22; `web/test.critical` → R17-14; `vercel.json` → R17-14, then the orchestrator's one `csp:write`
   after group C (ADR-283); `pnpm-lock.yaml` → R17-04, 14 and 25, one a group; `api/src/walk/buyer.walk.ts` → R17-05 (A), R17-24 (C);
   `api/src/index.ts` → R17-04 (A), R17-26 (C); `api/src/app.ts` → R17-11 (B), R17-26 (C); `api/src/lib/credits.ts` → R17-11 (B),
   R17-21 (C); `web/src/lib/labApi.ts` → R17-06 (A), R17-28 (C).
3. Inside a group a card may land before one it imports from (pinned shapes): the orchestrator accepts a red intermediate until the
   group ends, and every group ends with typecheck and the critical tier green. The buyer walk stays green through A and B (nothing it
   calls changes shape until group C), and group C rewrites it.
4. **No card spends, pays or reaches a network.** Stripe is a local stand-in in every test and walk; the model is stubbed; the staging
   walk runs on Railway after the merge, free on a deploy, and only a Release's walk writes (ADR-315). **Dependencies:** only the three
   pinned (Risk 3); a builder who needs another stops.
5. **Provisional seams,** for open or parked rows only (R-12.4): `// MB-225` (`terms.ts`, the plan checkout, Refunds), `// MB-149`
   (`campaigns.ts`, the price rows), `// MB-219` (`timelineReadings.ts`), `// MB-114` (no tax), `// MB-115` (production's sale gate).
   A decided row takes no tag: code cites ADR-274 to 282, 285, 290, 313 and 315 where it follows them. The `// MB-6`, `// MB-91`,
   `// MB-197`, `// MB-223` and `// MB-224 provisional` seams in a card's files go.
6. **The promoted rules** (`lessons.md`): before changing a shared export, a pinned value or what a function may return, grep every
   caller and name any outside your files; commit with a pathspec naming only your card's files.
7. **Simple words** (CLAUDE.md, §9): every new line a reader sees (checkout, refusals, receipts, legal lines, Account, admin) is
   everyday words, one idea per sentence, through `/ux-copy`. One push per group and one per fix (ADR-234); builders commit as they go.

## Readings pinned where the spec is silent
1. **Who buys:** a signed-in account. A plan needs the reader's own complete Personal report (409 `no_personal_report`, Timeline's
   rule) and no live subscription (409 `already_subscribed`). One Stripe Customer per account, made at the first checkout with the
   account's email (`users.stripe_customer_id`).
2. **Where checkout returns:** `returnTo` must match
   `^/(chart|dashboard(/account)?(\?open=(credits|gift|add|pair))?|report/[0-9a-f-]{36})$`, else 400 `bad_return` (no open redirect).
   The done page waits up to 60 s, then says the payment is still being confirmed and gives the way back. The asking step reopens as
   it was (the form's draft, the picker's saved pair, the sheet); nothing is written for the reader, who presses Write themselves.
3. **What a refund takes back:** that purchase's credits, available first, then held (its waiting gift is taken back and its link
   stops); never a used credit, never one a gift's recipient claimed (given, like used). A full refund takes every unused one, a partial
   one at most `round(credits × refunded ÷ paid)`, a dispute every unused one. Taken credits read `refunded`.
4. **History:** "N credits bought" (a sandbox purchase, as every staging one, reads "N test credits"), a grant "From Stars Decoded",
   the yearly plan's credit "With Timeline", a refund "Refunded" with −N.
5. **Campaign days:** whole days in Europe/Brussels, live from 00:00 on the first to 24:00 on the last; the printed end date is the
   last day; real dates only; a campaign starts 30 days or more after the last one on that product ended (MB-149).
6. **A campaign beside the launch price** (MB-149 provisional): the campaign price, the full price struck through and "until {last
   day}" once; the Singles comparison steps aside while it runs.
7. **The subscription:** access while `active`, `trialing` or `past_due`; a cancel at period end keeps it to the end; our receipt on the
   first payment, Stripe's on every one; Manage payment and Cancel Timeline both open the Customer Portal.
8. **Production:** POST /checkout answers 503 `checkout_unavailable` without a live key or while `saleReady()` is false (MB-115); the
   prelaunch gate keeps non-admins out (ADR-167); the webhook answers on both hosts; the sync skips with no key.
9. **No tax yet** (MB-114): Prices are `tax_behavior: "inclusive"`; `automatic_tax` is off behind one constant.
10. **The QA pair:** staging only; production refuses to make, seed, top up or reset it. Before each walk Mira is topped up to 20 test
    credits and Idris reset to 0 (the spec); the four Tomás steps stay local and run free in CI (ADR-314).
11. **Stored steps** (ADR-315): a deploy's walk copies in the seed of the report the step would write and checks it, or marks the
    step `not_run` ("waiting for the first Release to write it"), with each step that reads that report; a Release's walk writes it
    for real after the free dry render, one try and no Try again, and each report it finishes becomes the new seed.
12. **Plans in the walks:** the yearly plan (its credit and its renewal); the monthly plan by R17-12's tests.
13. **The webhook's mount:** after health and the CSP report, before the origin guard, the parsers, the session and the prelaunch gate;
    a raw body up to 1 MB; an event logged by type and id only.
14. **The sync:** at each start, after listen, unawaited, never failing the start; no button or route reruns it (ADR-315); until one
    succeeds, checkout says it isn't ready, and a problem it finds is one line at the top of the Release view.
15. **A pair shared with its other person** (ADR-285): when that person holds their own chart, shared with the maker, the pair's Share
    answers `can_send`; its claim promotes their side of the pair and hands nothing over; Stop sharing on the pair ends their reading.
16. **A failed report** (ADR-313): its credit stays on it, still `used`, so the balance doesn't move; `reports.failed_tries` counts its
    failures since it last took a credit or finished, and `failed_at` keeps the last one's time; Try again rewrites it free. The third
    failure (`MAX_TRIES = 3`) gives the credit back once and makes the report final ("We couldn't write this report. Your credit is
    back in your balance.", no Try again), and Delete on a failed report gives its credit back first. A pair has no Try again, so its
    failure gives the credit back at once; a report that failed before this rule, its credit already back, is final; Regenerate for a
    new birth time or an earlier version stays free.
17. **Nothing spends on a staging deploy** (ADR-315): a deploy's walk calls a report-writing route once, step 5's POST /reports, after
    Idris's balance reads 0, so the 402 answers before anything is written; it never calls /compatibility or regenerate and opens no
    Timeline page (the six-month view queues paid readings). Only a Release's walk writes, and the Release's estimate counts it.

## Pinned shapes
- **Catalogue** (R17-03). `Bundle.lookupKey`: `solo` → `single`, `couple`, `family`. `Plan { id: timeline_month | timeline_year;
  lookupKey (= id); name: "Timeline"; interval: month | year; cents: 999 | 6999; creditsToGive: 0 | 1 }`; `PLANS`; `PlanId`;
  `CatalogueItemId = BundleId | PlanId`; `itemById(id)`; `renewalLine(plan)` → "It renews each month. You can stop it any time on your
  Account page." and the year's ("each year"); `CAMPAIGN_ITEMS = ["couple", "family"]`; `MAX_CAMPAIGN_OFF = 0.25`. `terms.ts`:
  `PLAN_TICK` → "Start Timeline as soon as I pay. I give up my right to cancel a month or year once it has started." (MB-225);
  `REFUND_RULES[1]` → "If a report fails, Try again is free. If we still can't write it, its credit comes back to your balance." (ADR-313).
- **Schema** (R17-02). `purchases { id PK; user_id NOT NULL; kind bundle | plan; item; cents int; full_cents int; campaign_id NULL;
  stripe_session_id UNIQUE NULL; stripe_payment_intent NULL; stripe_invoice UNIQUE NULL; stripe_subscription NULL; tick_hash NOT NULL;
  ticked_at timestamptz NOT NULL; return_to NOT NULL; status open | granted | refunded | disputed | expired | failed; is_test bool NOT
  NULL; receipt_delivered bool NULL; granted_at NULL; refunded_at NULL (the first refund or dispute); created_at, updated_at }`,
  indexes (user_id), (stripe_payment_intent). `stripe_events { id PK (Stripe's); type; livemode bool; received_at; processed_at NULL }`.
  `subscriptions { id PK (sub_…); user_id; customer_id; item; status; current_period_end NULL; cancel_at_period_end bool DEFAULT false;
  is_test bool; created_at, updated_at }`, index (user_id). `campaigns { id PK; name; audience everyone | link; slug UNIQUE NULL;
  starts_on date; ends_on date; prices jsonb ({ couple?, family? } in cents); coupons jsonb DEFAULT '{}'; created_by; created_at,
  updated_at, ended_at NULL }`. `testers { user_id PK; email; qa mira | idris NULL; added_by; added_at }`. `qa_walks { id PK; sha; mode
  deploy | release; status running | pass | fail | unseeded | unconfigured; steps jsonb; findings jsonb; started_at; finished_at NULL }`.
  `users.stripe_customer_id UNIQUE NULL`; `bundles.source` purchase | grant | test | plan (DEFAULT purchase; old test bundles → test);
  `bundles.purchase_id UNIQUE NULL`; `CREDIT_STATUSES` + `refunded`; `credits.credit_type` dropped; `reports.failed_tries` int NOT NULL
  DEFAULT 0 and `reports.failed_at` timestamptz NULL (reading 16; MB-232 counts from them, with `granted_at` and `refunded_at`).
- **Contract** (R17-01; operationIds in brackets). `CatalogueItemId` enum. `PriceItem { id; kind: bundle | plan; name; line: string |
  null; credits: integer | null; interval: month | year | null; cents; fullCents; campaign: { name; endsOn: date } | null }`.
  `CheckoutOptions { publishableKey: string | null; ready: boolean; items: PriceItem[] }`: `GET /checkout/options?c` [getCheckoutOptions],
  200 to anyone. `CreateCheckoutBody { item; ticked: boolean; returnTo; campaign? }` → 201 `CheckoutStarted { purchaseId; clientSecret;
  amountCents }`; 400 `tick_required` | `bad_return` | validation; 401; 409 `no_personal_report` | `already_subscribed`; 429; 503
  `checkout_unavailable`: `POST /checkout` [createCheckout]. `CheckoutState { status: open | granted | failed | expired | refunded; item;
  returnTo; credits: integer | null }`: `GET /checkout/{purchaseId}` [getCheckout], 404 to anyone but its buyer. `POST /billing/portal
  { returnTo }` [openBillingPortal] → `{ url }`, 401, 409 `no_customer`. `TimelineAccess.plan?: { item; status; renewsOn: date | null;
  endsOn: date | null } | null`. `CreditHistoryItem.kind` + `granted`, `refunded`. `NoCredit { error: no_credit; message }` (402) on POST
  /reports, /compatibility and /gifts; Try again takes no credit, and a final report's `canRegenerate` is false (ADR-313). `PairLink.of`
  enum A | B | none. `/checkout/test` stays until R17-22.
- **Server.** `stripe.ts` (R17-04): `STRIPE_API_VERSION = "2026-08-26.dahlia"`, `stripe(): Stripe | null`, `stripeReady(): { ok;
  reason }`, `publishableKey()`; `STRIPE_API_BASE` (a local stand-in) honoured only off production. `stripeSync.ts`: `syncProducts():
  Promise<{ products; prices; moved: string[]; coupons; portal: boolean; missing: string[] }>`, `lastSync(): { at; problem: string |
  null } | null` (the start's run, kept in memory), `priceIdFor(lookupKey)`, `couponIdFor(campaignId, item)` (finds or makes it).
  `purchases.ts` (R17-10): `RETURN_TO`, `tickHashOf(text)` (sha256 hex), `startCheckout`, `checkoutState`, `openPortal`,
  `customerFor(userId)`. `fulfilment.ts` (R17-11): `handleStripeEvent(event): Promise<"processed" | "duplicate" | "ignored">`;
  `credits.ts`: `grantBundle(userId, kind, opts?: { test?; source?; purchaseId? })` (additive), `takeBack(bundleId, count):
  Promise<number>`. `subscriptions.ts` (R17-12): `applySubscriptionEvent(event)`, `activeSubscription(userId)`. `campaigns.ts`
  (R17-13): `checkCampaign(input, others): string | null` (the refusal line), `priceFor(item, at, slug?)`; `testers.ts`: `addTester`,
  `grantTester(userId, 1 | 3 | 5, by)`, `removeTester`, `isTester`; `adminPayments.ts`, behind the lab guard: `GET|POST
  /admin/campaigns`, `POST /admin/campaigns/{id}/end`, `GET|POST /admin/testers`, `POST /admin/testers/{userId}/grant { count }`,
  `DELETE /admin/testers/{userId}`. `mailer.ts` (R17-07): `buildReceiptEmail`, `sendReceiptEmail({ to; item; cents; campaignName;
  tick; renewal; historyUrl })`. `failureReasons.ts` (R17-21): `MAX_TRIES = 3`, `isFinal(report)`, `FINAL_LINE`. `qaPair.ts`
  (R17-09): `QA_PAIR` (mira: `qa-a+clerk_test@mystarsdecoded.com`, Mira Costa; idris: `qa-b+clerk_test@mystarsdecoded.com`, Idris
  Costa), `ensureQaPair(): Promise<{ mira; idris; seeded: boolean }>`, `resetQaPair(pair)`, `placeSeed(pair, step: "own-report" |
  "idris-report" | "pair"): Promise<string | null>`, `storeQaSeed(pair): Promise<number>`; the seed is three `lab_runs` keys,
  `mira.qa-seed`, `idris.qa-seed` and `mira-idris.qa-seed`, each one `whole` row (the output entire, the chart and the name on it)
  with no cost of its own (R13-09). `labFixtures.ts` (R17-06): `runFixtures(actor)`, the matrix only. `qaWalk` (R17-25):
  `runQaWalk({ mode: deploy | release; signal? }): Promise<QaWalkVerdict { status; steps: { id; label; status: pass | fail | stored |
  local | not_run; reason?; ms }[]; findings: { step; title; detail }[] }>` (only `release` writes), `STAGING_STEPS`. `release.ts`
  (R17-26): `STEPS` gains `walk` after `qa`; `Preflight` gains `qaWalk: { status; step: string | null; at } | null` and `stripeSync:
  string | null`; `qa.ts` (R17-26): `qaAfterDeploy()`.
- **Stripe's basil-era fields** (from the SDK's types, for R17-11 and 12): a subscription's `current_period_end` is on its item; an
  invoice's subscription is `parent.subscription_details.subscription`; its payment is under the invoice's payments; a line's price is
  `pricing.price_details.price`.
- **Web.** `checkout-view.ts` (R17-14): `checkoutHref(item: CatalogueItemId | null, returnTo)` → `/checkout?item=…&returnTo=…` (no item:
  the three bundles, Single first; a plan: both plans, the month first), `payLabel(cents)` → "Pay €54". `prices.ts`: `usePrices(): {
  items: PriceItem[] | null }` (null on any refusal, so a surface keeps the catalogue's prices), `keepCampaign(search)`, `CAMPAIGN_KEY =
  "sd.campaign"` (the tab's sessionStorage). `refusals.ts` (R17-16): `isNoCredit(error)`. The dashboard opens `?open=credits | gift |
  add | pair` once (R17-15). `home-view.ts` (R17-17): `TRY_AGAIN.free` → "It's free.". The admin's Sales page is `/admin/sales`
  (R17-19's page, R17-14's route).

## The shared step list: how the two walks stay in step
`api/src/walk/steps.ts` (R17-24) is the one list of the Owner's flow; neither walk keeps its own. Each step has an id, a label and what
the staging walk does with it: **live** (the same step on the live site), **stored** (a deploy's walk copies in and checks the seed of
the report the step would write; a Release's walk writes it for real, and it becomes the seed) or **local** (staging skips it, with
its reason). The buyer walk runs the list through a map typed `Record<StepId, Step>` and the staging walk through
`Record<StagingStepId, Step>` (the ids that are not local), so a step added to the list fails typecheck until both walks have it, or it
says local and why. Each walk also refuses at start if its map and the list differ, and `steps.test.ts` (critical tier) pins unique
ids, a reason on every local step, and the staging map equal to the non-local ids. Credit counts differ by host (staging's writes are
stored and Mira carries 20 test credits), so each step asserts from the ledger it reads, never from a typed number.

| # | id | The step, in both walks | Staging |
|---|---|---|---|
| 1 | `sign-in` | Mira arrives signed out (401s), then signs in | live, from the reset state |
| 2 | `buy` | Mira buys Family & friends from the credits sheet with the tick; the webhook adds 5 credits once; she's back in the sheet | live, card 4242 |
| 3 | `own-report` | Mira writes her Personal report; a credit is taken before it's written | stored |
| 4 | `gift` | Mira gifts Idris a report; the email goes out and a credit is held | live |
| 5 | `no-credit` | Idris signs in with no credit and asks to write: 402 `no_credit` and Get credits | live |
| 6 | `gift-claimed` | Idris claims the gift from its link; the credit moves to him | live |
| 7 | `idris-report` | Idris writes his Personal report with the gifted credit | stored |
| 8 | `share` | Mira shares her report with Idris; he reads it from the link | live |
| 9 | `share-back` | Idris shares back; Mira reads his report | live |
| 10 | `pair` | Mira writes the parent and child report for herself and Idris | stored |
| 11 | `pair-shared` | Mira shares it with Idris; he claims it from the link and reads it (MB-223) | live |
| 12 | `refund` | Stripe refunds the Family & friends purchase: its unused credits go, used and given ones stay | live |
| 13 | `tomas-report` | Mira, out of credits, buys a Couple from the birth form and writes Tomás's Personal report | local (ADR-314) |
| 14 | `tomas-pair` | Mira writes the partners report for herself and Tomás | local (ADR-314) |
| 15 | `tomas-sends` | Mira sends Tomás both reports; two emails go out | local (ADR-314) |
| 16 | `tomas-claims` | Tomás claims both and reads them | local (ADR-314) |
| 17 | `timeline` | Mira starts Timeline yearly: it opens with 1 credit to give, renews a year on, and closes at the end of the period she cancels; Idris keeps the teaser | live, a test clock; access and Account, no Timeline page |

With no seed yet, a deploy's walk runs steps 1, 2, 4 to 6 and 12; steps 3, 7 and 10 wait for the first Release, and 8, 9, 11 and
17, which read those reports, wait with them (reading 11).

## Parallel groups
**Group A**, one message: R17-01 to R17-09 (no file in common). Inside it R17-04 reads R17-02's tables and R17-03's keys, R17-07 and 08
read R17-03's plans, ticks and refund rule, R17-09 reads R17-02's testers and `lab_runs`, all on pinned shapes. Push once. **Group B**,
one message once A is green: R17-10 to R17-20. R17-10 mounts R17-13's router; R17-11 calls R17-07's and R17-12's functions; R17-15, 16
and 18 use R17-14's `checkoutHref` and `usePrices`; R17-19 calls R17-13's pinned routes. Push once. **Group C**, one message once B is
green: R17-21 to R17-28; R17-23 and 24 walk R17-21's and 22's API, R17-25 implements R17-24's list on R17-09's seed, R17-26 runs
R17-25's walk, and R17-28 shows R17-26's preflight lines. Push once; then the orchestrator's steps and the gate. **If R17 must
shrink:** first the Sales page (R17-19: the routes stay) and the Release view's line (R17-28: `/api/qa/latest` still answers), then
Timeline's billing (R17-12, 18, 20 and 27, whole: Timeline stays the admin's), each to the next /plan; MB-223 and 224, checkout, the
ledger, a failed report's credit (ADR-313) and both walks never move.

---

## Group A — the ground: the contract, the tables, the catalogue, Stripe's seam, MB-223, the fixtures, receipts, the legal pages, the QA pair

### R17-01 — The contract and codegen (INTERNAL) — B-15 (was MB-224)
Tier: opus — the payments contract spans three packages and every checkout surface reads it
Objective: every public shape this round's routes answer, in `openapi.yaml`, additive, with the client and zod regenerated.
Files: `packages/api-spec/openapi.yaml`; `packages/api-client-react/src/generated/**`, `packages/api-zod/src/generated/**` (codegen);
`web/src/lib/credits-view.ts` (only `HISTORY_FALLBACK` and the sign, for the two new History kinds).
Refs: pinned contract; R-7.2; stripe-payments Checkout, Fulfilment, The subscription; ADR-274, 275, 277, 313; B-15.
Done when:
- Every pinned path, schema and operationId is in the spec with a one-line description naming its ADR; `PairLink.of` lists `none`;
  `CreditHistoryItem.kind` gains `granted` and `refunded`; `TimelineAccess.plan` is optional and nullable; `NoCredit` (402) is declared
  on POST /reports, /compatibility and /gifts; regenerate's and `canRegenerate`'s descriptions say Try again is free and a final report
  has none (ADR-313); `/checkout/test` stays until R17-22. Nothing existing is removed or narrowed.
- `pnpm --filter @workspace/api-spec run codegen`, then typecheck green with only the named files changed; a second codegen, no diff.
- Every user of a widened type grepped (the promoted rule); `credits-view.test.ts` green with a line for each new kind.

### R17-02 — The payment tables, and a failed report's count (INTERNAL)
Tier: opus — schema, run by every deploy's bootstrap
Objective: the payment tables, the walks' verdicts and a failed report's count in place before any route reads them.
Files: new `packages/db/src/schema/payments.ts`; `schema/credits.ts`, `users.ts`, `reports.ts`, `index.ts`; new `packages/db/scripts/
migrate-payments-columns.ts` (added to `packages/db/package.json`'s `migrate` chain: step 1) and `migrate-add-payments.ts` (step 3o in
`scripts/bootstrap-db.sh`, its comment saying why); `packages/db/scripts/migrate-credit-type-nullable.ts` (a no-op once the column is gone).
Refs: pinned schema; R-7.3, §3; stripe-payments Fulfilment (Schema); ADR-275 to 279, 313, 315; B-19 (was MB-80), MB-123, MB-232.
Done when:
- Every table and column exists as pinned, in drizzle and in the scripts (`IF NOT EXISTS`, `IF EXISTS` throughout); every change to an
  existing table runs in step 1, before the push, so step 2 applies nothing and never prompts; old test bundles read `source = 'test'`,
  and a report that failed before this round reads `failed_tries = 3`, final (reading 16).
- `CREDIT_STATUSES` gains `refunded` and `creditType` leaves the schema, with every reader of either grepped (the promoted rule).
- On a scratch Postgres 16 with a dummy `OPENAI_API_KEY`: `db:bootstrap` on `main`'s tree, then this branch's twice, then an empty
  database twice, each clean; `packages/db` tests green.

### R17-03 — The catalogue: lookup keys, Timeline's two plans, the plan's tick and the refund rule (USER-FACING) — provisional MB-225
Tier: sonnet — one package, every value pinned here
Objective: Stripe finds each product by a key typed once in the catalogue, Timeline's prices live there beside the bundles' (R-6.3),
and the plan's tick and the second refund rule carry the Owner's words.
Files: `packages/commerce/src/catalogue.ts`, `catalogue.test.ts`, `terms.ts`, `terms.test.ts`.
Refs: pinned catalogue; R-6.3, R-6.6; stripe-payments Four products; ADR-277, 313; timeline.md Free and paid; MB-225.
Done when:
- `lookupKey` on each bundle (`solo` → `single`), `PLANS` (€9.99 a month, €69.99 a year with 1 credit to give), `CatalogueItemId`,
  `itemById`, `renewalLine`, `CAMPAIGN_ITEMS` and `MAX_CAMPAIGN_OFF` as pinned; `PLAN_TICK` and `REFUND_RULES[1]` in `terms.ts` as
  pinned, the tick with `// MB-225 provisional`; no euro amount typed outside `catalogue.ts` (the price gate green).
- Tests pin each key and amount, both renewal lines, the second refund rule, and that no plan is a campaign item; every importer of
  `BUNDLES` and `REFUND_RULES` still compiles.

### R17-04 — The Stripe seam and the product sync (INTERNAL)
Tier: opus — payments, a new dependency, and a sync that runs on every staging start
Objective: one Stripe client on one API version, and Stripe's Products, Prices, coupons and portal made from the catalogue at each
start, never by hand and never from a button (ADR-315).
Files: new `api/src/lib/stripe.ts`, `stripeSync.ts`, `stripeSync.test.ts`; `api/src/index.ts` (the sync after listen); `api/package.json`
(`stripe` 22.6.2, exact); `pnpm-lock.yaml`; `.env.example` (the three Stripe keys and `STRIPE_API_BASE`, no values).
Refs: pinned server shapes; stripe-payments Four products, Keys; ADR-277, 280, 315; R-7.4; MB-114; readings 8, 9, 14.
Done when:
- `stripe.ts` pins `2026-08-26.dahlia`, reads only Railway's keys, refuses a live key off production and a test key on it, and honours
  `STRIPE_API_BASE` only off production. `syncProducts` keeps four Products and five Prices found by lookup key (`tax_behavior`
  inclusive): a changed amount is a new Price with `transfer_lookup_key` and the old one inactive; the coupons of live and coming
  campaigns (`couponIdFor` finds or makes one, so a campaign saved later needs no sync); the portal's configuration (cancel at period
  end, payment method, invoices). It runs once per start, unawaited, never failing it; `lastSync()` keeps its problem; no key, it skips.
- Tests on a stand-in Stripe (no network): a second run changes nothing; Couple at a new amount moves `couple`; four and five found.
- The report lists every package the lockfile gained (stripe brings none).

### R17-05 — A pair shared with its other person (USER-FACING) — B-01 (ADR-285)
Tier: opus — access and consent: who reads a report with two people in it
Objective: Mira shares the parent and child report she made with Idris, whose chart came to her by Share yours back; he opens it from
the link, reads it and does its exercises, as any shared reader does (ADR-285, amending ADR-235).
Files: `api/src/lib/access.ts`, `access.test.ts`; `api/src/routes/invites.ts`, `invites.test.ts`; `api/src/walk/buyer.walk.ts`.
Refs: ADR-285 (was MB-223, the Owner, 2026-10-05); R-3.6; ADR-133, 139, 235; MB-82, 103; reading 15; R15-18's lesson.
Done when:
- `pairSendStateFor` offers `can_send` when the other person holds their own chart, shared with the maker; the send's claim promotes
  their side and hands nothing over; `pairReadable`, `viewerRelationshipIds` and `viewerHasGrantOnRelationship` read a side its reader
  holds; Stop sharing on the pair ends it; the address is the one Mira typed, never one filled from Idris's account.
- Each 403 names its real reason: a maker who isn't one of the two hears so, and a maker who is never hears it.
- The walk's "Mira can't yet share" step becomes Mira sharing the pair and Idris claiming and reading it; `asContracted` and the walk's
  `// MB-223` and `// MB-224 provisional` seams go (R17-01's `none`); the walk and both tests green on a scratch Postgres.

### R17-06 — Run the fixtures from the Lab page (INTERNAL) — B-30 (ADR-290)
Tier: opus — a paid lab run on Railway, across the API, the web and the scripts
Objective: the fixture runs move into the Lab page now that hard credits end the anonymous campaigns; it is the Lab's one paid button,
and nothing on the page seeds the QA pair (ADR-315).
Files: new `api/src/lib/labFixtures.ts` (+ test); `api/src/routes/adminLab.ts`; `web/src/components/lab/RunsView.tsx`;
`web/src/lib/labApi.ts`; `.github/workflows/report-lab.yml` (deleted); `scripts/src/report-lab.ts` and its test (`--remote` retired).
Refs: B-30, ADR-290; ADR-77, 86, 315; R-4.4; What QA costs; `releaseLab.ts` (`runReleaseLab`, its two estimates).
Done when:
- `POST /admin/lab/fixtures` (the lab guard, staging only) runs the release lab's five charts and pair with no gate, priced first
  against `LAB_BUDGET_USD`, each call's cost recorded as it lands.
- The Runs view shows Run the fixtures with its estimate (about 20 ¢); tests on a stubbed engine; no other workflow changes.

### R17-07 — The receipt email (USER-FACING)
Tier: sonnet — one file and its test, every word from a constant
Objective: our receipt beside Stripe's, repeating the tick and the refund rules (Art. 8(7)), the item, the amount and a History link.
Files: `api/src/lib/mailer.ts`, `mailer.test.ts`.
Refs: pinned server shapes; stripe-payments Fulfilment (Receipt); R-6.6; ADR-143, 274, 313; MB-225; `/ux-copy`.
Done when: `buildReceiptEmail` and `sendReceiptEmail` as pinned: the item's name with its credits or its plan, the amount from
`formatEuro` and a campaign's name when there was one, the tick it was bought under word for word (`CHECKOUT_TICK` or `PLAN_TICK`),
the three refund rules, a plan's renewal line, and a History link on our web app; the other emails' dark tables; the test pins every
part and that no price is typed.

### R17-08 — The legal pages, the FAQ and the Method page for checkout, Timeline and a failed report (USER-FACING) — provisional MB-225
Tier: opus — the legal pages a buyer relies on, with words no spec locks
Objective: the legal pages say what checkout now does: our tick, real payments through Stripe, Timeline's subscription and how to stop
it, and Stripe as its own controller with what its fields keep in the browser (QA-04 #2); the FAQ and the Method page say what a
failed report now does (ADR-313).
Files: `web/src/pages/legal/TermsPage.tsx`, `RefundsPage.tsx`, `PrivacyPage.tsx`; `web/src/lib/processors.ts` (+ test); `web/src/site/site.ts`
(the three pages' `updated` and the Terms lede); `web/src/site/data/faq.ts`, `web/src/site/pages/MethodPage.tsx` (their failure lines).
Refs: QA-04 sev-2 #2; ADR-143 to 145, 264, 274, 277, 313; R-3.5, R-6.6; MB-114, 115, 225; reading 7; `/ux-copy`.
Done when:
- Terms trade "There's no subscription." for Timeline's terms (monthly or yearly, renews until you stop it, stop it on your Account
  page, the plan's tick); Refunds keep the three rules and add MB-225's line; Privacy names Stripe (its own controller, in the EU), the
  browser keys Stripe's fields set on `/checkout`, `sd.campaign`, and the birth form's draft now kept across checkout. Prices from the catalogue.
- The FAQ's and the Method page's failure lines say Try again is free and the credit comes back if we still can't write the report;
  their `// MB-91 provisional` seams go.
- Simple words, one idea per sentence; the report lists every new line before and after for the Owner; site checks green on the five.

### R17-09 — The QA pair: Mira and Idris on staging, and their seed (INTERNAL)
Tier: opus — it makes accounts and resets their data: staging only, refused everywhere else
Objective: two real staging accounts, Mira Costa and Idris Costa, made by code and marked as testers, put back to the walk's start
before each walk, and seeded only from the reports a Release's walk finished; nothing here writes a report (ADR-315).
Files: new `api/src/lib/qaPair.ts`, `qaPair.test.ts`; `fixtures/sample-people/README.md` and `web/src/site/data/people.ts` (the line
saying no real report is written about them).
Refs: pinned server shapes; stripe-payments Automatic QA; ADR-272, 279, 314, 315; readings 10, 11, 17; R13-09's lesson.
Done when:
- `ensureQaPair` finds or makes both through Clerk's `createUser` (the locked `+clerk_test` addresses, the sample people's names) with
  their `users` and `testers` rows, and says whether a seed is stored. `resetQaPair` deletes what a walk left (invites, gifts, shares,
  grants, reports, a test-clock customer), tops Mira up to 20 test credits and Idris to 0.
- `placeSeed` copies a step's stored report into its account (the pair over Idris's own chart) or answers null; `storeQaSeed` keeps
  each report a Release's walk finished as the new seed, with no cost of its own. Every function refuses unless `APP_ENV` is staging.
- Tests with a stubbed Clerk on a scratch Postgres and a model client that fails if called: a second ensure changes nothing; with a
  seed and without, the model is never called; each function refuses on production.

---

## Group B — the routes and the screens

### R17-10 — Checkout on the server: the options, the session, the return and the Portal (INTERNAL)
Tier: opus — money: what a buyer is charged and what they agree to
Objective: `/checkout`'s server: one price per item per request, a Checkout Session in `elements` mode under our tick, the purchase row,
the return's state, and the Customer Portal.
Files: new `api/src/routes/payments.ts`, `payments.test.ts`, `api/src/lib/purchases.ts`, `purchases.test.ts`; `api/src/routes/index.ts`
(mounts this router and R17-13's, the limit on POST /checkout and /billing/portal); `api/src/lib/limits.ts` (+ test).
Refs: pinned contract and server shapes; stripe-payments Checkout, The subscription; ADR-274, 277, 280; R-6.2, 6.6, 7.1; MB-114, 115;
readings 1, 2, 8; R13-08, R16-29's lessons.
Done when:
- POST /checkout: 401 signed out; 400 `tick_required` unless `ticked` is true; 400 `bad_return` off the allowlist; 409 for a plan without
  the reader's own Personal report or beside a live subscription (Timeline's own lines); 503 while Stripe isn't ready, and on production
  while `saleReady()` is false (`// MB-115 provisional`). Else a purchase row with the tick's hash and time, one Customer per account,
  the line by lookup key, a live campaign's coupon, `ui_mode: "elements"`, no `payment_method_types`, no tax (`// MB-114 provisional`).
- GET /checkout/options answers anyone (a link campaign by `?c=`); GET /checkout/{id} answers only its buyer; the limit keys on the account.
- Tests on a stand-in Stripe cover each refusal and the session's body; `limits.test.ts` and the critical tier green.

### R17-11 — The webhook: grants once, takes back on a refund or a dispute (INTERNAL)
Tier: opus — money and credits: the only path that grants (R-6.2)
Objective: `POST /api/stripe/webhook` turns Stripe's events into the ledger: each event once, each purchase once, only with its tick.
Files: new `api/src/routes/stripeWebhook.ts`, `stripeWebhook.test.ts`, `api/src/lib/fulfilment.ts`, `fulfilment.test.ts`;
`api/src/lib/credits.ts` (+ `credits.test.ts`); `api/src/app.ts` (the mount).
Refs: pinned server shapes and Stripe's basil-era fields; stripe-payments Fulfilment; ADR-275; R-6.2, 6.5; readings 3, 4, 13; R14-14,
R15-16's lessons.
Done when:
- Mounted as reading 13 says, on a raw body; a bad signature is 400 and writes nothing; `stripe_events` takes each id once.
- `checkout.session.completed` or `async_payment_succeeded` with `payment_status` not `unpaid` grants the bundle once per session, only
  for a purchase carrying its tick (`grantBundle` with `source` and `purchaseId`, additive), stamps `granted_at`, then sends R17-07's
  receipt; subscription and invoice events go to R17-12's `applySubscriptionEvent`; refunds and disputes take back as reading 3 says
  and stamp `refunded_at` once; History reads both new kinds.
- Tests: a replay, and completed then async, grant once; a full refund takes the unused and never a used or given credit; no payload,
  email or name in any log line.

### R17-12 — Timeline's subscription: mirrored, the second access source, the yearly credit (INTERNAL) — MB-197's seam goes
Tier: opus — access: a paid product's second source
Objective: an active subscription opens Timeline (no switch, ADR-262), and the yearly plan gives one credit a year.
Files: new `api/src/lib/subscriptions.ts`, `subscriptions.test.ts`; `api/src/lib/timelineAccess.ts`, `timelineAccess.test.ts`;
`api/src/routes/timeline.ts` (the access answer's `plan`).
Refs: pinned server shapes and Stripe's basil-era fields; stripe-payments The subscription; ADR-262 to 264, 277; MB-197; readings 7, 12.
Done when:
- `applySubscriptionEvent` mirrors `customer.subscription.created|updated|deleted`, `invoice.paid` and `invoice.payment_failed` into
  `subscriptions` (status, item by lookup key, period end from the item, cancel at period end). The first paid invoice grants the plan's
  purchase (`granted_at`, as R17-11 stamps) and sends R17-07's receipt; each paid yearly invoice is a purchase row and one credit to
  give (`source: "plan"`, "With Timeline"), taken back if that payment is refunded while it is unspent (`refunded_at`).
- `ACCESS_SOURCES` gains `subscription` after `admin` (`// MB-197 provisional` goes): active, trialing or past due; a cancel at period
  end keeps it to the end; GET /timeline/access answers `plan`.
- Tests: each event moves the row and the access answer with it; a replayed `invoice.paid` grants once; the critical tier green.

### R17-13 — Campaigns and testers on the server (INTERNAL) — provisional MB-149
Tier: opus — money: the price a buyer sees, and credits given away
Objective: campaigns saved under their rules and priced per request; testers added, granted and removed; no route runs the sync.
Files: new `api/src/lib/campaigns.ts`, `campaigns.test.ts`, `api/src/lib/testers.ts`, `testers.test.ts`, `api/src/routes/adminPayments.ts`.
Refs: pinned server shapes; stripe-payments Campaigns, Testers; ADR-276, 278, 281, 315; R-6.7; MB-149; readings 4 to 6; R16-01, 05's lessons.
Done when:
- A save is refused, each with its own line, at more than 25% off, on Single or a plan, for a second live campaign on a product, for one
  starting within 30 days of the last on that product (MB-149), for an end before its start or a date that isn't a real day, and for a
  link slug taken or malformed.
- `priceFor(item, at, slug?)` answers by whole Brussels days, a link-only campaign only with its slug; a test pins 23:59 and 00:00 on
  the last day.
- The pinned admin routes, behind the lab guard: campaigns list, save and end; testers add (an existing account's email), grant 1, 3
  or 5 (`source: "grant"`, test, no purchase row, "From Stars Decoded"), remove, never the QA pair. No route takes a grant's amount.

### R17-14 — /checkout in our look, and the page that waits for the credit (USER-FACING) — provisional MB-225
Tier: opus — a new screen that takes payment, and a new dependency
Objective: the item and its price, Stripe's Express Checkout and Payment Element in our look, our tick and Pay with the amount; then a
done page that waits for the credit and takes the reader back to the step that asked.
Files: new `web/src/pages/CheckoutPage.tsx`, `CheckoutDonePage.tsx`, `web/src/lib/checkout-view.ts` (+ test, added to `web/test.critical`),
`web/src/lib/prices.ts`; `web/src/App.tsx` (`/checkout`, `/checkout/done` and R17-19's `/admin/sales`); `vercel.json` (the app
rewrite, CORS on `/fonts/*`); `web/scripts/csp.mjs` (Stripe's hosts); `web/package.json` (`@stripe/stripe-js` 9.17.0); `pnpm-lock.yaml`.
Refs: the artifact's look B (Round start 5); pinned web shapes; stripe-payments Checkout; ADR-274; §9; MB-225; readings 2, 6; R14-12, R16-24.
Done when:
- At 390 px first: the item (or the three bundles, or both plans), its price and a campaign's line; one unticked, required box
  (`CHECKOUT_TICK`, or `PLAN_TICK` for a plan) with Terms as an inline link, Pay disabled until it is ticked, and a plan's renewal line
  as plain text under Pay (MB-225); `initCheckoutElementsSdk` with Appearance from our tokens and Inter from our origin; focus goes
  tick, then Pay; `@stripe/stripe-js` pinned exact.
- The done page polls GET /checkout/{id}, refreshes credits and home, then opens `returnTo`; after 60 s it says the payment is still
  being confirmed and gives the way back; `checkout-view.test.ts` pins the labels and the href; the report lists the lockfile's additions.

### R17-15 — Get credits opens /checkout from every asking step on the dashboard (USER-FACING) — provisional MB-149; B-08
Tier: opus — the credit flow through nine components, with money on each
Objective: zero means zero everywhere: each Get credits opens `/checkout` with its `returnTo`, the sheet's bundles buy, live campaign
prices show, and the free test checkout's buttons and every soft-pass branch go.
Files: `web/src/lib/credits-view.ts` (+ test), `web/src/lib/orbit.ts` (+ test); `web/src/components/BundleList.tsx`;
`web/src/components/dashboard/CreditsSheet.tsx`, `CreditPill.tsx`, `AddSomeoneSheet.tsx`, `GiftFlow.tsx`;
`web/src/components/CompatibilityPicker.tsx`; `web/src/pages/DashboardPage.tsx`.
Refs: pinned web shapes; stripe-payments Checkout (returns to the step that asked); ADR-275, 276; R-6.5; MB-149; B-08; reading 2.
Done when:
- `creditsEnforced`, `TEST_CHECKOUT` and the `enforced` props are gone; the sheet's bundle rows buy (`/dashboard?open=credits`), and
  at zero the gift flow (`?open=gift`), Add someone (`?open=add`), the picker with its pair (`?open=pair`) and the empty dashboard
  (`/chart`) open `/checkout`; `?open=` reopens its sheet once; a 402 from Gift or a pair shows its line and Get credits.
- Rows show a live campaign's price as reading 6 says; B-08's count line (each bundle card says its credit count once);
  `credits-view.test.ts` green; every importer of the removed exports grepped.

### R17-16 — The birth form's no-credit step, and the site's live prices (USER-FACING) — provisional MB-149
Tier: sonnet — two existing screens and two small libraries, each behaviour pinned here
Objective: a 402 on the birth form keeps what the reader typed and offers Get credits; the public site shows a live campaign after load.
Files: `web/src/pages/BirthFormPage.tsx`; `web/src/lib/refusals.ts` (+ test); `web/src/lib/form-draft.ts` (+ test);
`web/src/site/sections/Pricing.tsx`; `web/src/site/SiteLayout.tsx` (`keepCampaign` on load).
Refs: pinned web shapes; stripe-payments Checkout, Campaigns; ADR-140, 275; R-6.3; MB-149; readings 2, 6; R15-16, R16-14's lessons.
Done when:
- `refusalLine` gives the API's `no_credit` line and `isNoCredit(error)` tells it apart; on 402 the form saves its draft (the name added)
  and shows the line with Get credits to `checkoutHref(null, "/chart")`; back on `/chart` the draft fills the form and the reader presses Write.
- Pricing reads `usePrices()` after load and shows a live campaign as R17-15's rows do; on any refusal, prelaunch's included, it keeps
  the prerendered prices; only the home page's JSON-LD Offer takes the campaign's price and `priceValidUntil`.
- Both tests green; typecheck and the critical tier green.

### R17-17 — Try again is free (USER-FACING)
Tier: sonnet — four existing controls and one view file, each behaviour pinned here
Objective: a failed report the reader may rewrite says Try again is free; one we finally couldn't write shows the API's line that its
credit is back, and offers no Try again (ADR-313).
Files: `web/src/components/dashboard/PeopleRows.tsx`, `QuickLook.tsx`; `web/src/pages/ReportPage.tsx`;
`web/src/components/report/OpeningOverlay.tsx`; `web/src/lib/home-view.ts` (+ test).
Refs: ADR-313 (superseding ADR-84 in part); ADR-269, 275; MB-137; reading 16; `/ux-copy`.
Done when: under each Try again, "It's free." (`TRY_AGAIN.free`); a final report, whose `canRegenerate` is false, shows its line and
Delete as before, with no Try again; a 409 refreshes the view; the comments cite ADR-313, not "free (MB-137)"; `home-view.test.ts`
pins the words; typecheck and the critical tier green.

### R17-18 — Start Timeline, and the plan on the Account page (USER-FACING)
Tier: sonnet — two existing screens, their words and states pinned here
Objective: the teaser and the Account page sell Timeline at its price, and a subscriber manages or stops it in two clicks.
Files: `web/src/pages/AccountPage.tsx`; `web/src/components/dashboard/TimelineTeaser.tsx`; `web/src/lib/teaser-view.ts` (+ test);
`web/src/lib/timeline-access.ts` (+ test).
Refs: stripe-payments The subscription; ADR-263, 264, 277; timeline.md Free and paid; reading 7; `/ux-copy`.
Done when:
- The teaser adds the price from the catalogue ("€9.99 a month or €69.99 a year") and Start Timeline to `checkoutHref("timeline_month",
  "/dashboard")`, Not now as before; Account without Timeline shows the same Start; with it, the plan's line, "Renews on {day}" or
  "Ends on {day}", Ask's month as before, then Manage payment and Cancel Timeline, each opening the Portal through POST /billing/portal.
- `timeline-access.ts` carries `plan`; the admin's line stays "Timeline, through admin access"; both tests green.

### R17-19 — The admin's Sales page: campaigns and testers (INTERNAL)
Tier: sonnet — one admin page over R17-13's pinned routes, in the admin pages' dense look
Objective: the Owner starts and ends campaigns and adds and grants testers on one page, Sales, with one menu item (ADR-315).
Files: new `web/src/pages/AdminSalesPage.tsx`, `web/src/lib/adminPaymentsApi.ts`; `web/src/components/AccountMenu.tsx`.
Refs: stripe-payments Campaigns, Testers; ADR-276, 278, 281, 315; R17-13's routes; the artifact's two screens (Round start 5).
Done when:
- Campaigns: live, coming and ended; a form (name; Couple, Family & friends or both, each with its price; first and last day; everyone,
  or a link with its slug and the link to copy) showing the API's refusal line in place; End now.
- Testers: add by email, grant 1, 3 or 5, remove; the QA pair marked and not removable.
- `/admin/sales` behind the admin check, one AccountMenu item (Sales); no sync, walk or seeding control anywhere; typecheck green.

### R17-20 — Ask forgets what a stop took away (INTERNAL) — B-02 (was MB-220)
Tier: opus — consent: what a reader may still see after someone stops sharing (R-3.6)
Objective: an Ask reply built on someone's chart or report is no longer shown or sent back to the model once its reader can't read them.
Files: `api/src/lib/ask.ts` and its tests.
Refs: B-02 (was MB-220, R16's sentinel S2); R-3.6; ADR-182, 213, 235; MB-191.
Done when: each stored reply keeps the profile and report ids its cards came from; on every read and send, a reply with one its reader
can no longer read shows a fixed line ("This answer was about someone who stopped sharing, so it's hidden.") and stays out of the
history sent to the model; tests: a stop hides the reply and its text never reaches the stand-in model; the month's count is unchanged.
No prompt file changes (if one must, the builder stops: the dry lab would run).

---

## Group C — credits made hard, a failed report's credit kept, the test checkout gone, both walks on one list, MB-219

### R17-21 — Credits hard on every host, and a failed report keeps its credit (USER-FACING)
Tier: opus — credits: no report or gift without one, and no charge for one we failed to write
Objective: a credit is taken before a report or a gift is written, 402 `no_credit` without one (ADR-275); a failed report keeps it
for a free Try again and gives it back only when we finally can't write it (ADR-313).
Files: `api/src/lib/credits.ts` (+ `credits.test.ts`); `api/src/routes/reports.ts` (+ `reports.test.ts`), `compatibility.ts`,
`gifts.ts`; `api/src/lib/failureReasons.ts` (+ test); `api/src/lib/home.ts` (`canRegenerate`).
Refs: ADR-84, 275, 313; R-4.3, 6.1, 6.4, 6.5; MB-6, 57; reading 16; R16-29's lesson.
Done when:
- POST /reports and /compatibility take the credit in the transaction that inserts the report and start writing once it commits;
  POST /gifts holds one or discards the gift. Each answers 402 `no_credit` with its own line ("You need a credit to write this
  report." / "You need a credit to give a report.") on every host; the soft-pass branches and `// MB-6 provisional` go.
- `failReport` keeps a Personal report's credit and counts the failure; Try again is free; the third failure returns the credit once
  and makes the report final (`FINAL_LINE`, `canRegenerate` false, regenerate 409); a Delete returns it first; a pair at once.
- Tests: 402 at zero with nothing written; two writes racing for one credit, one 402; fail, Try again, finish spends one credit;
  three failures, or a Delete, return it once; the critical tier green.

### R17-22 — The free test checkout is gone (INTERNAL)
Tier: sonnet — deletions, a contract removal and codegen, every caller already moved
Objective: `POST /checkout/test` and everything that served it leave (ADR-276), and the round's new critical tests join the tier.
Files: `api/src/routes/checkout.ts`, `checkout.test.ts` (deleted); `api/src/routes/index.ts`; `api/test.critical`;
`packages/api-spec/openapi.yaml` (the path and `TestCheckout*`); the generated client and zod (codegen).
Refs: ADR-276 (supersedes ADR-138); ADR-315; stripe-payments acceptance 5; the promoted caller rule.
Done when: the route, its mount and its contract are gone and a call answers 404; `api/test.critical` drops `checkout.test.ts` and adds
`src/routes/payments.test.ts`, `src/lib/purchases.test.ts`, `src/routes/stripeWebhook.test.ts`, `src/lib/fulfilment.test.ts`,
`src/lib/subscriptions.test.ts`, `src/walk/steps.test.ts` and the two no-spend tests, `src/lib/qaPair.test.ts` and
`src/routes/qa.test.ts`; `grep -rn "checkout/test\|TestCheckout\|useTestCheckout"` finds nothing outside docs; codegen twice, no
diff; typecheck and the critical tier green.

### R17-23 — The archived walks on hard credits (INTERNAL)
Tier: sonnet — tests on their own
Objective: the loop, sharing and Timeline walks stay green now that every write needs a credit (the archive stays green, ADR-273).
Files: `api/src/walk/loop.walk.ts`, `sharing.walk.ts`, `timeline.walk.ts`.
Refs: ADR-273, 275, 276; `docs/annex/test-archive.md`; R17-21, 22.
Done when: each walk grants the credits its writes need (`grantBundle`, source `test`) and nothing else changes; the loop walk's
test-checkout step proves `/checkout/test` answers 404, and its soft-pass gift step proves a gift with no credit answers 402 and sends
nothing; all three pass on a scratch Postgres after `db:bootstrap`.

### R17-24 — One step list for both walks, and the buyer walk on it (INTERNAL)
Tier: opus — the buyer flow's guard in CI, with Stripe stood in for
Objective: the Owner's flow as one list both walks run in order, and the buyer walk on it, Stripe's sandbox path stubbed (no network).
Files: new `api/src/walk/steps.ts`, `steps.test.ts`, `api/src/walk/testStripe.ts` (the stand-in); `api/src/walk/buyer.walk.ts`.
Refs: The shared step list; ADR-273 to 277, 279; stripe-payments acceptance 1 to 5, 9; ADR-285, 314; R17-10 to 12, 21.
Done when:
- `steps.ts` is the pinned list; the walk runs it through a map typed by its ids (a missing or extra step fails typecheck) and refuses
  at start if map and list differ; `steps.test.ts` pins unique ids, a reason on each local step, and R17-25's map equal to the non-local ids.
- The walk buys through POST /checkout on `testStripe.ts` and pays with a signed `checkout.session.completed`, replayed and followed by
  its async twin (one grant); no tick is 400 and a bad signature 400; then Idris's 402, the refund, Tomás's Couple from the birth form,
  and the yearly plan through signed subscription and invoice events; every soft-pass wait goes.
- "buyer walk: 17/17 steps passed" on a scratch Postgres after `db:bootstrap`, as CI runs it.

### R17-25 — The staging walk: Mira and Idris sign in, pay and share on the live site (INTERNAL)
Tier: opus — real sign-in and real sandbox payments, driven by a browser on Railway
Objective: the same steps on the live staging site, as the QA pair, with the sandbox card and a test clock; a deploy's walk spends
nothing, and only a Release's writes the seed's three reports (ADR-315).
Files: new `api/src/lib/qaWalk/index.ts`, `browser.ts`, `steps.ts` (+ test); `api/package.json` (`@clerk/testing` 2.2.39, exact);
`pnpm-lock.yaml`.
Refs: The shared step list; stripe-payments Automatic QA; ADR-272, 279, 314, 315; R17-09's pair; readings 10, 11, 17; R14-14's lesson.
Done when:
- `runQaWalk({ mode })` signs both in with Clerk Testing Tokens in two browser contexts on Chromium, then runs `STAGING_STEPS` in the
  list's order: checkout in the page with 4242 4242 4242 4242, other steps through the live API from the signed-in page, each with a
  screen checked once; the refund and the plan's renewal and cancel through Stripe on a test clock, deleted at the end.
- In `deploy`, stored steps and the steps that read their reports run as reading 11 says, and its one call to a report-writing route
  is reading 17's; in `release` each stored step writes for real, one try. An undelivered email (`emailDelivered` false) is a finding;
  findings carry no email, token, link or Clerk id; no Chromium is `unconfigured`.
- Tests on a stubbed page and Stripe: the order, a failure stopping the rest (`not_run`), no seed, clean findings; the lockfile's additions.

### R17-26 — When the staging walk runs, what it may spend, and its verdict (INTERNAL)
Tier: opus — a deploy trigger that must never spend, a public route and the Release's gate
Objective: the walk runs after every staging deploy at no cost and in every Release, which writes the seed; its verdict is public.
Files: new `api/src/routes/qa.ts` (+ test); `api/src/app.ts` (the public mount); `api/src/index.ts` (the deploy trigger);
`api/src/lib/indexNow.ts` (its wait for the web's commit, exported); `api/src/lib/release.ts` (+ test).
Refs: stripe-payments Automatic QA; ADR-77, 272, 279, 315; R-4.4; readings 11, 17; B-31; R15-16, R16-24's lessons.
Done when:
- On staging, after listen and unawaited, `qaAfterDeploy` waits up to 20 minutes for the web to serve this commit, then runs
  `ensureQaPair`, `resetQaPair`, `runQaWalk({ mode: "deploy" })`: one `qa_walks` row per commit, the start never held, a row a restart
  cut off settled at the next start; a test runs it with a model client that fails if called, and it never is.
- A Release's `walk` step after the QA agent: the free dry render of the three reports, the walk in `release` mode, `storeQaSeed`; a
  failed step fails the Release (ADR-272), a failed write leaves a `generation_failures` row, and the estimate adds about 10.5 ¢. The
  preflight carries the last verdict (passed or failed, which step, when) and `lastSync()`'s problem; no route starts a walk.
- GET /api/qa/latest answers the newest verdict (sha, mode, status, times, steps, findings), mounted before the session; 404 off staging.

### R17-27 — Timeline readings only for events the app shows, and a daily cap (INTERNAL) — closes MB-219
Tier: opus — security: a door to paid writes, shut before subscribers arrive (R16's sentinel, S1)
Objective: a reading is written only for an event the app can show, and each account starts at most a fixed number a day.
Files: `api/src/lib/timeline.ts`, `api/src/lib/timelineReadings.ts`, `api/src/routes/timeline.ts`, and their tests.
Refs: MB-219; ADR-210, 262; MB-191; R13-09, R13-10's lessons.
Done when: `eventByKey` accepts a contact, retrograde or eclipse only inside the window the app shows (31 days back to 182 ahead) and
any Life cycle, else 404; `openReading` refuses a new write past 40 a UTC day per account (`// MB-219 provisional`) with 429 and
Timeline's own line ("You've opened today's new readings. You can open more tomorrow."), a kept reading still opening; tests at the
40th and 41st, a key a year out, and a kept reading on a capped day; the critical tier green.

### R17-28 — The walk's verdict and any sync problem, one line on the Release view (INTERNAL)
Tier: sonnet — one line in an existing view, its shape pinned here
Objective: the admin reads the last staging walk, and a sync problem when there is one, at the top of the Release view: no new tab,
page or button (ADR-315).
Files: `web/src/components/lab/ReleaseView.tsx`; `web/src/lib/labApi.ts` (`Preflight`'s two fields, the `walk` step).
Refs: pinned server shapes (`release.ts`); ADR-272, 315; R17-26.
Done when: above the heads, one line from the preflight's `qaWalk` ("QA walk passed, {when}", "QA walk failed at {step}, {when}", or
how many steps wait for the first Release) and, only while `stripeSync` holds one, the sync's problem; the steps list shows `walk`;
typecheck green.

---

## After the builders: the orchestrator's steps, not cards
1. **After group C, once:** `pnpm --filter @workspace/web run csp:write` (Stripe's hosts from R17-14; the build's `--check` fails
   until then, as expected), `vercel.json` committed; gitleaks over `main...round/R17` with CI's pinned version and config (ADR-283).
2. **The tester, once** (ADR-273: steps 2 to 17 of the flow changed), its base the round's first commit: the critical tests of each
   changed step (the checkout route and `purchases.ts`, the webhook and `fulfilment.ts`, `credits.ts` and a failed report's credit,
   `access.ts` and `invites.ts`, `timelineAccess.ts`, the step list, the two no-spend tests) check what the cards and the spec now say;
   a bug it finds is a fix for that card's builder.
3. **The gate:** install, typecheck, both builds, the critical tier, the buyer walk on a scratch Postgres ("17/17"), `check:shipped`,
   `check:copies`, `pnpm audit --prod`, codegen twice with no diff, `db:bootstrap` on the upgrade path twice and on an empty database
   twice, the three archived walks once (their area changed), smoke, the probe and the site checks on the preview.
4. **No dry lab:** no brain path changes; if a builder reports one, the dry lab runs.
5. **The sentinel** on `main...round/R17`, its eye on: the webhook (signature before anything, raw body, once per event, its mount, no
   payload in a log); the tick and the price set on the server; `returnTo`; the key's mode per host and `STRIPE_API_BASE` off
   production; grants and take-backs, and a failed report's credit (ADR-313); campaign slugs and the admin routes; the QA pair's
   staging-only guards and a deploy walk's one report-writing call (reading 17); `/api/qa/latest` with no personal data; MB-219's
   window and cap; B-02's hidden replies; ADR-285's grant (a pair reaches only its other person); the three dependencies and the lockfile.

## Staging confirmation, after the merge
1. Railway staging's start: the sync finds four Products and five Prices, so the Release view shows no sync line; a line naming a
   missing permission is MB-227's (the key).
2. The deploy's walk for the merged commit: `/api/qa/latest` shows the live steps passing and the seed's steps `not_run`, "waiting
   for the first Release to write it" (`unseeded`), at 0 ¢. The orchestrator reads it by hand (B-31), and `/qa` reads staging's
   payment flows.
3. The first Release, when the Owner says promote: its walk writes the three reports after the free dry render (about 10.5 ¢), passes
   and keeps them as the seed; every deploy after it walks all thirteen staging steps at 0 ¢ (acceptance 10).
4. The Owner's look: Get credits from the birth form, the sheet and Gift → `/checkout` in our look → the test card → back where you
   asked, with Stripe's receipt and ours; a campaign saved on the Sales page, seen on the sheet, and refused at 30%; a tester granted
   3; Timeline started from the teaser, then cancelled in the Portal from Account; Mira's pair shared with Idris.

## Production after the round
Nothing sells. The next Release carries the code (no brain change, so no lab; the staging walk runs in it and writes the seed, about
10.5 ¢): production's checkout says it isn't ready (no live key, no postal address), the webhook route exists, the sync skips, the
Sales page works for the admin, Timeline stays the admin's, and the waitlist stays over the app until launch (ADR-167). The first live
sale waits for MB-228, 114 and 115.

## Owner prerequisites (none blocks the build; sandbox first)
- **Before acceptance on staging:** MB-227: staging's restricted key allows what the code calls, the destination's eleven events,
  receipts on, then GitHub's copies deleted; and MB-229's mail forwarding for qa-a@ and qa-b@mystarsdecoded.com, merged into it, so
  the walk's emails arrive. Nothing to press: the first Release writes the QA pair's reports. Already done (2026-10-04): staging's
  three Stripe values on Railway.
- **Before the first live sale:** MB-228 (the account, business and public details, branding, two-step sign-in, Apple Pay's domains,
  the live keys and webhook destination on Railway production, Clerk's production instance and `ADMIN_USER_ID`); MB-115 (the postal
  address in `LEGAL_IDENTITY`, which the law puts on the Terms page, so a forwarding address keeps the home one off it); MB-114 (VAT and
  the consumer-law check, now reading MB-225's box and MB-149's 30 days too).
- **Still open, built at its default:** MB-225 (the plan's box; For the Owner 1).

## What QA costs
On production's mix (gpt-6-sol plans, gpt-6-luna writes), priced as the release lab prices itself, on r06's and r12-pair's token
counts (`NATAL_ESTIMATE_USD`, `PAIR_ESTIMATE_USD`):

| What | When | About |
|---|---|---|
| A staging deploy's walk: live steps in the sandbox, stored steps on the seed | every deploy | 0 ¢ |
| A Release's walk: Mira's and Idris's Personal reports and their parent and child report, written for real after the free dry render, one try each, kept as the seed | each Release | 3.1 + 3.1 + 4.35 ≈ 10.5 ¢ |
| Run the fixtures (B-30) | each press on the Lab page | about 20 ¢ (five charts and their pair) |

A Release's estimate counts its walk, and the fixtures count against `LAB_BUDGET_USD` ($15 a month, ADR-77). Nothing retries on its
own, and nothing spends on a deploy.

## Risks
1. **Money:** real money only on production after launch; staging pays in Stripe's sandbox; a live key off production or a test key
   on it is refused (R17-04); the webhook alone grants (R-6.2); the tick and the price are set on the server; every refusal is tested.
2. **Schema** (R-7.3): six new tables (`qa_walks` beyond the spec's list, for the verdict), five new columns on existing tables
   (`users` 1, `bundles` 2, `reports` 2) and `credit_type` dropped; changes to existing tables run in step 1 so the push never
   prompts; the upgrade and empty paths run twice each (R17-02).
3. **New dependencies** (ADR-200, R14-01's lesson): `stripe` 22.6.2 (API; no dependencies), `@stripe/stripe-js` 9.17.0 (web; no
   dependencies; it loads Stripe.js from js.stripe.com at run time, as Stripe requires), `@clerk/testing` 2.2.39 (API; dotenv 17.2.2,
   with `@clerk/backend` and `@clerk/shared` already locked). Each card's report lists the lockfile's additions; the sentinel reads them.
4. **Hard credits** change every write path (402 at zero); the anonymous lab campaigns stop at the merge (Round start 3, B-30); a
   failed report keeps its credit for a free Try again, and the credit comes back after the third failure, on Delete, or at once for
   a pair (ADR-313); a second birth-time update stays free (MB-120 parked, though R-6.1 says otherwise).
5. **USER-FACING without a locked line:** the checkout's words around Stripe's fields, the done page, the 402 lines, the receipt, the
   legal lines, the plan's box and renewal line (MB-225), the second refund rule, the FAQ's and the Method page's failure lines, "It's
   free." and the final line (ADR-313), Account's plan lines, the teaser's Start, the campaign line (MB-149), the admin's Sales page.
   Each goes through `/ux-copy`, and the close lists them, before and after, for the Owner.
6. **USER-FACING at the next Release:** the pages and lines above; on production nothing sells and the app stays the admin's (ADR-167).
7. **Security:** the sentinel's list in After the builders 5.
8. **Privacy** (R-3.5): Stripe as its own controller and the keys its fields set on `/checkout`, `sd.campaign`, the birth form's draft
   kept across checkout, and the receipt, each named on the privacy page (R17-08); the QA pair are synthetic and labelled (R-3.1,
   ADR-112), with reports only on staging.
9. **Timeline opens to sandbox subscribers on staging** (MB-197's seam goes): MB-219 and B-02 are done with it; B-03 (was MB-198 and
   218) stays due before production sells Timeline, after launch (CLAUDE.md's focus 2).
10. **The sample people get real reports,** on staging only: each Release's walk writes them and `lab_runs` keeps them as the seed,
    never on a public page; their README and `people.ts` say so (R17-09).
11. **The staging walk** leans on Railway's Chromium, Clerk's Testing Tokens, Stripe's sandbox, a test clock and the QA addresses' mail
    (MB-227); each failure is a named finding, a missing browser is `unconfigured`, never a crash, and a failed step stops a Release
    (ADR-272). Until the first Release a deploy's walk is `unseeded`, and acceptance 10 waits for it.
12. **A staging deploy spends nothing** (ADR-315): a deploy's walk calls a report-writing route once, for a 402 at a zero balance, and
    opens no Timeline page; R17-09's and R17-26's tests run that path with a model that fails if called, in the critical tier (R17-22).
13. **The sync has no button** (ADR-315): a start whose sync fails leaves checkout not ready until the next start, and the Release
    view's line says so; a restart is the fix, and it is ours (R-12.5).
14. **Stripe facts not read in Stripe's docs** (blocked): Round start 4 checks them before group A.
15. **Size:** 28 cards in three groups (9, 11, 8), the shrink path in Parallel groups; Vercel's 100 deployments a day: three pushes
    plus fixes.
16. **Escalations:** none in R15 or R16, so no card or kind of card was escalated in two rounds running.

## Lessons this plan guards
- **Promoted, the caller rule** (`builder.md`): R17-01 (the History kinds' map in `credits-view.ts`, `TimelineAccess.plan`,
  `PairLink.of`), R17-02 (`CreditStatus`, `credit_type`'s readers), R17-11 (`grantBundle`'s options stay additive for the walks'
  calls), R17-15 (every importer of `creditsEnforced` and `TEST_CHECKOUT`), R17-21 (every caller of the write routes, `holdCredit`,
  `failReport` and `canRegenerate`), R17-22 (no importer of the test checkout's hook left).
- **Promoted, the pathspec rule** (`builder.md`): every builder; group B's eleven share one tree.
- **Applied:** one push per group and per fix (the round skill's Push); the tester's range from the round's base (`tester.md`).
- R13 · R13-05 (a running /round can't edit its own skill) → no card edits `.claude/skills/`; B-31 at the close.
- R13 · R13-08 (a limit keyed on a client-sent value or a fresh session) → R17-10 keys checkout's limit on the account; the webhook is
  gated by its signature; every staging-only refusal keys on `APP_ENV`, never on a request (R17-04, 09, 25, 26).
- R13 · R13-09 (spend summed from a stored, derived cost) → R17-06 prices each run first and records each call's cost as it lands; a
  Release walk's writes record theirs through the real write path as they land, and the seed rows copy no cost (R17-09).
- R13 · R13-10 (an unauthenticated route writing a row per value) → R17-11 writes `stripe_events` only after the signature passes; a
  campaign slug never writes a row; `/api/qa/latest` only reads (R17-26).
- R13 · R13-01 (a restart killing a builder before its commit) → builders commit as they go.
- R14 · R14-14 (redaction by key path missing deeper shapes) → R17-11 logs an event by type and id only; R17-25's findings hold no
  email, token, link or Clerk id.
- R14 · R14-01 (a new dependency's packages unnamed) → R17-04, 14 and 25 name theirs and list the lockfile's additions (Risk 3).
- R14 · R14-12 (focus on the wrong next control) → R17-14: the tick, then Pay; an error takes focus to its line; the done page lands
  on the asking step's heading.
- R15 · R15-16, 17 (a route the gate closed; no card owning the mount) → R17-11 owns the webhook's mount, R17-26 the verdict's; R17-16's
  landing keeps its prerendered prices on any refusal, prelaunch's included.
- R15 · R15-18, 19 (an address shown that was never given) → R17-05: the pair's share goes to the address Mira types.
- R16 · R16-01, 03 (a spec promising what the code can't meet) → Round start 4 checks the Stripe and Clerk facts before group A.
- R16 · R16-01 (a range on a raw instant against a rounded report) → R17-13: whole Brussels days, the printed last day the day it
  ends, a test at 23:59 and 00:00.
- R16 · R16-05 (a rolled-over calendar date) → R17-13 refuses a date that isn't a real day.
- R16 · R16-24 (a kept row spinning for good) → R17-14's done page stops after 60 s with a line and the way back; R17-26 settles a
  walk a restart cut off.
- R16 · R16-14 (structured data stamped on every page of a kind) → R17-16 changes only the home page's Offer.
- R16 · R16-29 (a refusal line borrowed from another product) → R17-21's 402 and final lines speak of credits and the report, R17-10's
  plan refusals of Timeline, R17-27's cap of Timeline's readings.

**Lessons read through R16.** R16's close wrote `lessons.md` (272897e). The edits since (ADR-265 and 273) changed its rules and moved
three lines to Promoted, early or applied; no round has added a line after R16's, and `main` at 65c585d leaves the file as it was.
This plan was written after R16 closed and revised on 2026-10-05 after the Owner's answers.

## Questions raised (Notion, 2026-10-05, sorted by R-12.3)
- **The Owner's answers, recorded:** MB-231 rejected → ADR-313 (a failed report keeps its credit; MB-231 decided); MB-226 → ADR-314
  (two QA accounts; MB-226 decided); a small admin and a deploy that never spends → ADR-315. Earlier today: ADR-285 (MB-223) and
  ADR-290 (MB-148, now B-30). *Decided by me:* nothing new; ADR-313's three tries is Claude's reading inside the Owner's rule.
- **Needs you (Mailbox):** **MB-225** (decision, launch) the plan's box: your question and our reason added; built at its default,
  `// MB-225 provisional`. **MB-232** (decision, launch) what we measure: its own spec as R18; R17-02 adds only the four columns the
  numbers need (`reports.failed_tries` and `failed_at`, `purchases.granted_at` and `refunded_at`). **MB-227** (todo, launch, Alex) the
  sandbox key, the destination's events, receipts, GitHub's copies and the QA mail; no press. **MB-228** (todo, launch, Alex) the first
  live sale's checklist. Twelve rows wait on the Owner, over R-12.3's ten; none of the others is Claude's to decide.
- **Closed or moved:** MB-229 done, merged into MB-227 (only its mail forwarding is left); MB-230 → B-31 at R17's close.
- **Backlog lines R17 does:** B-01 (R17-05), B-02 (R17-20), B-08 (R17-15), B-15 (R17-01), B-30 (R17-06); and MB-219 (R17-27, private).
- **Kept open:** MB-114 (Owner prerequisites); MB-115, 120 and 149 parked (ADR-296), MB-149 built provisional (readings 5, 6); B-03
  (before production sells Timeline); B-10 (the failure lines, for the fixes round).

## For the Owner (two asks, highest stakes first)
Approving this plan starts R17 at once (MASTERFILE §11.2). It sells nothing outside Stripe's sandbox.
1. **The box a Timeline subscriber ticks (MB-225).** You asked whether it must be a box. Recommendation: a box. EU law ends the 14-day
   right to cancel only with the buyer's express consent, and a ticked box is the clearest proof of it. The box: "Start Timeline as
   soon as I pay. I give up my right to cancel a month or year once it has started.", with Terms as an inline link; under Pay, as plain
   text: "It renews each month. You can stop it any time on your Account page." If silent: built so, provisional, and MB-114's check
   confirms the words before the first real sale.
2. **What we measure (MB-232).** Recommendation: a short spec of its own (/ideate, then /lock) as R18, which also makes the admin's
   first screen the health numbers and a short "needs you" list, and tidies the Lab's seven tabs. R17 adds no KPI page, only the
   columns the numbers need. If silent: so.

## Close (the orchestrator)
B-01, B-02, B-08, B-15 and B-30 leave `docs/backlog.md` as done, and B-31 joins it (the skills read `/api/qa/latest`, was MB-230);
MB-219 done; MB-225's seams stay tagged; a Decisions row `Decided by: Claude` for each choice the round took on a rule; a Mailbox row
lists the round's new words before and after for the Owner's look; *Waiting on Alex* kept current. MASTERFILE: §3's tables (with
`qa_walks` and the new columns); R-4.3, R-6.1 and R-6.6, where a failed report keeps its credit for a free Try again and gets it back
after the third failure or a Delete, a pair at once (ADR-313); R-4.4's walk on the shared steps, free on a deploy and writing the seed
in a Release (ADR-315); §6 as built. INDEX's code map: `stripe.ts`, `stripeSync.ts`, `purchases.ts`, `fulfilment.ts`,
`subscriptions.ts`, `campaigns.ts`, `testers.ts`, `qaPair.ts`, `labFixtures.ts`, `qaWalk/`, routes `payments.ts`, `stripeWebhook.ts`,
`adminPayments.ts` and `qa.ts`, `/checkout` and its done page, the admin's Sales page, `api/src/walk/steps.ts`, and `report-lab.yml`
gone. CLAUDE.md's focus: R17 shipped; the first Release seeds the QA pair; MB-232's spec as R18. `lessons.md` takes each failure's
cause. `/qa` on staging after the merge's deploy walk, then the URL, the QA report, the walk's verdict and Staging confirmation's four
lines go to the Owner.
