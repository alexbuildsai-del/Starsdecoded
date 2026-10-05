# R17 plan — Stripe payments: our checkout, a hard ledger, campaigns and testers, Timeline's billing, and QA on the buyer walk's steps

Planned 2026-10-05 on `claude/gracious-keller-vyl7ds` (`main` at 327ef19, with PR #111's process changes: ADR-266, 273, 283) for the
locked spec `stripe-payments` (locked 2026-10-05, ADR-274 to 282; artifact https://claude.ai/artifact/Yamws6GPDB5jKvdk8U8rp2), which
builds on `pricing-and-launch` (ADR-142 to 149, as superseded there) and `timeline` as R16 built it (ADR-262 to 264). **Besides the
spec, the Owner asked for three things:** MB-223 (Mira shares the pair report she made with Idris, and the buyer walk proves it),
MB-224 (the contract's `PairLink.of`), and the two QA setups lined up: the staging QA walks the buyer walk's own steps with the site's
Mira and Idris, its accounts seeded once by a paid lab run started from the Lab page. **Order:** R16 closed 2026-10-04; ADR-282 puts
payments next, then a round of fixes. **Scope:** `/checkout` in our look on Stripe's `elements` mode, four products synced from the
catalogue, the webhook as the only grant, hard credits on every host with the free test checkout deleted, both receipts, campaigns and
testers in the admin, Timeline's subscription as its second access source, automatic QA on staging after every deploy; MB-223 and 224;
MB-148's fixture runs on the Lab page (hard credits end the anonymous campaigns); MB-219 and 220, which R16's sentinel tied to MB-197,
closed with it. **Cards:** 27 in three groups (9, 11, 7; ADR-283). **Tiers:** 19 Opus, 8 Sonnet, no Haiku. **Tags:** USER-FACING are
R17-03, 05, 07, 08, 14 to 18 and 21; the rest INTERNAL. **The brain does not change** (no prompt, model, engine or `aiInterpretation.ts`
file), so no dry lab runs and no report's words move. **The schema changes** (R17-02). **The contract changes** (R17-01, 22). **Three
new dependencies** (R17-04, 14, 25). No builder needs a credential, nothing goes on GitHub, nothing generates or pays in the session,
and production sells nothing until launch (ADR-167).

## Open Mailbox rows created more than 14 days ago (oldest first, ADR-186)
**2026-09-09:** MB-12 no error reporting or alerting · MB-19 no prompt version history · MB-20 the one e2e spec cannot pass, no lint
step · MB-21 variables missing from `.env.example` · MB-22 dead code left by the port. **2026-09-18:** MB-49 no API route can be
unit-tested. None blocks a card. Touched here: MB-21 (R17-04 lists every Stripe variable in `.env.example`, with no value).

## Round number and order
R16 is the last round with a report (closed 2026-10-04; its lessons in 272897e). The Owner set the order on 2026-10-05: R16 Timeline,
then this payments round, then a round of fixes (ADR-282). QA-04 has no sev-1; its sev-2 and sev-3 findings wait for the fixes round
except #2 (the Terms say "There's no subscription."), which R17-08 answers because this round sells one. MB-223 is the one `blocking`
row and comes first. Pricing's launch (`LAUNCHED = true`, the loop study, the Launch view) is not planned (ADR-230, 242; the spec's out
of scope).

## Round start (the orchestrator)
1. Branch `round/R17` from `main` with this plan (merge `claude/gracious-keller-vyl7ds` first).
2. **Lessons first (ADR-265):** this plan is stamped through R16, the last close that wrote `lessons.md`; re-read it against any line
   added since and put each guard that fits into its card's done-when.
3. **R16's staging campaign:** if `report-lab.yml`'s natal and pair campaigns have not run since R16's merge (CLAUDE.md's focus), run
   them now (a few cents). They write as an anonymous visitor on the soft pass, which R17-21 ends at this round's merge (MB-148).
4. **Stripe and Clerk facts** (the spec's Research note): the researcher, then the verifier, on what this plan could not read from the
   SDKs (docs.stripe.com and clerk.com were blocked here too): a coupon in `discounts` on an `elements` session; Appearance's `fonts`
   from our origin inside Stripe's frame; the Payment Element's fields for the test card on an EU session; a test clock's customer and
   advance limits; payment method domains and Apple Pay; `clerk.signIn({ emailAddress })` with Testing Tokens on a Development
   instance. Read here from `stripe@22.6.2` and `@stripe/stripe-js@9.17.0`: `ui_mode` `elements`, Prices' `lookup_keys` and
   `transfer_lookup_key`, `discounts[].coupon`, `initCheckoutElementsSdk` on the dahlia train, and the basil-era fields (Pinned shapes).
   A fact that breaks a pinned shape re-pins it before group A; one that can't be re-pinned stops the round (R-0.1).
5. **The artifact's screens:** builders cannot open claude.ai, so extract into the session scratchpad, at 390 px first: checkout look
   B, the flow, the four products, Campaigns, the subscription, Testers, automatic QA, the keys and the checklist (R17-14, 15, 17 to 19).
   Where a builder's draft differs, the artifact wins and the report says so.
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
  people (their README: the lab never reads them); `report-lab.yml` writes on the soft pass (MB-148); `pairSendStateFor` refuses a pair
  whose other chart was shared (MB-223); `PairLink.of` lacks `none` (MB-224); the Terms say there is no subscription (QA-04 #2).
- **Found while planning:** (1) `stripe@22.6.2` pins `2026-08-26.dahlia`, the spec's version; (2) in that version a subscription's
  period end sits on its item, an invoice names its subscription under `parent.subscription_details` and a line's price under
  `pricing.price_details`; (3) Try again rewrites a failed report for free while the failure gave its credit back: once credits are
  real, a free report per failure (MB-231); (4) drizzle's push can stop to ask before dropping a column or adding a unique index over rows,
  so those changes run in bootstrap step 1 (MB-123's kind of failure); (5) CI walks only `buyer.walk.ts`; the loop, sharing and
  Timeline walks are archived and lean on the soft pass; (6) a running /round cannot edit its own skill (R13-05), so the skills' line
  to read the verdict is MB-230; (7) R16's sentinel tied MB-219 and 220 to MB-197, which this round closes; (8) checkout's limit keys
  on the session (R13-08's lesson).

## Where the spec and the Owner's asks meet, and how this plan settles it
1. **The spec's QA buys Couple; the buyer walk needs five credits** → both walks buy Family & friends at step 2, from the credits sheet;
   Couple is what the local walk buys from the birth form when Mira runs out before Tomás (step 13).
2. **The spec's qa-a "Sends a report" to qa-b** → the pair Mira sends Idris (MB-223), claimed from its link. A Personal report she wrote
   about Idris would clash with the one he writes himself; the written-for-someone Send stays Tomás's (local unless MB-226).
3. **qa-a and qa-b** keep their locked `+clerk_test` addresses; their names, birth data and reports are Mira's and Idris's.
4. **"Seeded from a stored lab run (no model spend)"** → no run of the sample people exists, so one paid run each, once, from the Lab
   page (R17-06, MB-229); every reset after that copies it at no cost.
5. **"Start Timeline on R16's offer"** → R16 built no Start button (the teaser and Account point to `/timeline`): R17-18 adds it with the
   price; `/timeline` itself shows no price until launch.
6. **The verdict "for that commit"** names no table → `qa_walks` (R17-02).
7. **"/round and /qa read it after every merge"** → a skill edit, not a card (R13-05, MB-230); R17's orchestrator reads it by hand.
8. **MB-223 amends ADR-235** with no Decisions row yet → R17-05 builds on MB-223's text (the Owner, 2026-10-05) as `// MB-223
   provisional`; the row is recorded at the next /lock.
9. **Testers on production** → the view works on both hosts, but production's app stays behind the waitlist (ADR-167), so a production
   tester's grant waits for launch.
10. **JSON-LD** is prerendered at full price → after load, only the home page's Offer takes a live campaign's price and end date.
11. **The Owner's checklist** becomes Mailbox rows with defaults (MB-227 to 229); none blocks the build.

## Goals
1. **MB-223, blocking:** Mira shares the parent and child report she made with Idris, whose chart came to her by Share yours back, and
   he opens it from the link (amending ADR-235); with MB-224's contract fix, both found by the buyer walk (ADR-266).
2. **Checkout and a hard ledger** (acceptance 1 to 7, 11): `/checkout` in our look, the four products synced, the webhook as the only
   grant, refunds and disputes taking back unused credits, credits hard on every host, the free test checkout gone, both receipts.
3. **Campaigns and testers** (acceptance 6, 8): saved in the admin under their rules, priced per request, sent to Stripe as coupons;
   testers granted credits that are never revenue.
4. **Timeline's billing** (acceptance 9): both plans in `/checkout`, `subscriptions` as Timeline's second access source (MB-197 closes),
   the Portal from the Account page, the yearly plan's credit; MB-219 and 220 closed with it (their defaults tie them to MB-197).
5. **QA on the buyer walk's steps** (acceptance 10): one step list for the buyer walk and the staging walk, the same people; the staging
   walk after every deploy, on Run now and in every Release, its verdict at `/api/qa/latest`; the QA pair seeded once from a paid run on
   the Lab page, which also takes over the fixture runs (MB-148).

## Preconditions
1. Builders read MASTERFILE §0, their card, the pinned shapes and readings it names, and Round start 5's screens.
2. **Single owners.** Each card's files as listed, no file in two cards of a group. `openapi.yaml` and codegen → R17-01 (A) and R17-22
   (C); `api/test.critical` → R17-22; `web/test.critical` → R17-14; `vercel.json` → R17-14, then the orchestrator's one `csp:write`
   after group C (ADR-283); `pnpm-lock.yaml` → R17-04, 14 and 25, one a group; `api/src/walk/buyer.walk.ts` → R17-05 (A), R17-24 (C).
3. Inside a group a card may land before one it imports from (pinned shapes): the orchestrator accepts a red intermediate until the
   group ends, and every group ends with typecheck and the critical tier green. The buyer walk stays green through A and B (nothing it
   calls changes shape until group C), and group C rewrites it.
4. **No card spends, pays or reaches a network.** Stripe is a local stand-in in every test and walk; the model is stubbed; the paid
   seeding run and the staging walk run on Railway after the merge. **Dependencies:** only the three pinned (Risk 3); a builder who
   needs another stops.
5. **Provisional seams:** `// MB-223 provisional` (`access.ts`, `invites.ts`), `// MB-225` (`terms.ts`, the plan checkout, Refunds),
   `// MB-149` (`campaigns.ts`, the price rows), `// MB-206` (`credits-view.ts`), `// MB-148` (`labFixtures.ts`), `// MB-231`
   (`reports.ts`), `// MB-219` (`timelineReadings.ts`), `// MB-114` (no tax), `// MB-115` (production's sale gate). `// MB-197
   provisional` and every `// MB-6 provisional` go. Code cites ADR-274 to 282 where it follows them.
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
    credits and Idris reset to 0 (the spec); the Tomás steps stay local unless MB-226 is answered yes.
11. **Stored steps:** on staging a step that writes a report checks the seeded one; a Release's walk writes them for real (ADR-272, 279).
12. **Plans in the walks:** the yearly plan (its credit and its renewal); the monthly plan by R17-12's tests.
13. **The webhook's mount:** after health and the CSP report, before the origin guard, the parsers, the session and the prelaunch gate;
    a raw body up to 1 MB; an event logged by type and id only.
14. **The sync:** after listen, unawaited, never failing the start; the admin's Sync reruns it; until one succeeds, checkout says it
    isn't ready.
15. **A pair shared with its other person** (MB-223): when that person holds their own chart, shared with the maker, the pair's Share
    answers `can_send`; its claim promotes their side of the pair and hands nothing over; Stop sharing on the pair ends their reading.

## Pinned shapes
- **Catalogue** (R17-03). `Bundle.lookupKey`: `solo` → `single`, `couple`, `family`. `Plan { id: timeline_month | timeline_year;
  lookupKey (= id); name: "Timeline"; interval: month | year; cents: 999 | 6999; creditsToGive: 0 | 1 }`; `PLANS`; `PlanId`;
  `CatalogueItemId = BundleId | PlanId`; `itemById(id)`; `renewalLine(plan)` → "Renews every month at €9.99 until you cancel." and the
  year's; `CAMPAIGN_ITEMS = ["couple", "family"]`; `MAX_CAMPAIGN_OFF = 0.25`. `terms.ts`: `PLAN_TICK` (MB-225's words).
- **Schema** (R17-02). `purchases { id PK; user_id NOT NULL; kind bundle | plan; item; cents int; full_cents int; campaign_id NULL;
  stripe_session_id UNIQUE NULL; stripe_payment_intent NULL; stripe_invoice UNIQUE NULL; stripe_subscription NULL; tick_hash NOT NULL;
  ticked_at timestamptz NOT NULL; return_to NOT NULL; status open | granted | refunded | disputed | expired | failed; is_test bool NOT
  NULL; receipt_delivered bool NULL; created_at, updated_at }`, indexes (user_id), (stripe_payment_intent). `stripe_events { id PK
  (Stripe's); type; livemode bool; received_at; processed_at NULL }`. `subscriptions { id PK (sub_…); user_id; customer_id; item;
  status; current_period_end NULL; cancel_at_period_end bool DEFAULT false; is_test bool; created_at, updated_at }`, index (user_id).
  `campaigns { id PK; name; audience everyone | link; slug UNIQUE NULL; starts_on date; ends_on date; prices jsonb ({ couple?, family? }
  in cents); coupons jsonb DEFAULT '{}'; created_by; created_at, updated_at, ended_at NULL }`. `testers { user_id PK; email; qa mira |
  idris NULL; added_by; added_at }`. `qa_walks { id PK; sha; mode deploy | run_now | release; status running | pass | fail | unseeded |
  unconfigured; steps jsonb; findings jsonb; started_at; finished_at NULL }`. `users.stripe_customer_id UNIQUE NULL`; `bundles.source`
  purchase | grant | test | plan (DEFAULT purchase; old test bundles → test); `bundles.purchase_id UNIQUE NULL`; `CREDIT_STATUSES` +
  `refunded`; `credits.credit_type` dropped.
- **Contract** (R17-01; operationIds in brackets). `CatalogueItemId` enum. `PriceItem { id; kind: bundle | plan; name; line: string |
  null; credits: integer | null; interval: month | year | null; cents; fullCents; campaign: { name; endsOn: date } | null }`.
  `CheckoutOptions { publishableKey: string | null; ready: boolean; items: PriceItem[] }`: `GET /checkout/options?c` [getCheckoutOptions],
  200 to anyone. `CreateCheckoutBody { item; ticked: boolean; returnTo; campaign? }` → 201 `CheckoutStarted { purchaseId; clientSecret;
  amountCents }`; 400 `tick_required` | `bad_return` | validation; 401; 409 `no_personal_report` | `already_subscribed`; 429; 503
  `checkout_unavailable`: `POST /checkout` [createCheckout]. `CheckoutState { status: open | granted | failed | expired | refunded; item;
  returnTo; credits: integer | null }`: `GET /checkout/{purchaseId}` [getCheckout], 404 to anyone but its buyer. `POST /billing/portal
  { returnTo }` [openBillingPortal] → `{ url }`, 401, 409 `no_customer`. `TimelineAccess.plan?: { item; status; renewsOn: date | null;
  endsOn: date | null } | null`. `CreditHistoryItem.kind` + `granted`, `refunded`. `NoCredit { error: no_credit; message }` (402) on POST
  /reports, /compatibility, /gifts and /reports/{id}/regenerate. `PairLink.of` enum A | B | none. `/checkout/test` stays until R17-22.
- **Server.** `stripe.ts` (R17-04): `STRIPE_API_VERSION = "2026-08-26.dahlia"`, `stripe(): Stripe | null`, `stripeReady(): { ok;
  reason }`, `publishableKey()`; `STRIPE_API_BASE` (a local stand-in) honoured only off production. `stripeSync.ts`: `syncProducts():
  Promise<{ products; prices; moved: string[]; coupons; portal: boolean; missing: string[] }>`, `priceIdFor(lookupKey)`,
  `couponIdFor(campaignId, item)`. `purchases.ts` (R17-10): `RETURN_TO`, `tickHashOf(text)` (sha256 hex), `startCheckout`,
  `checkoutState`, `openPortal`, `customerFor(userId)`. `fulfilment.ts` (R17-11): `handleStripeEvent(event): Promise<"processed" |
  "duplicate" | "ignored">`; `credits.ts`: `grantBundle(userId, kind, opts?: { test?; source?; purchaseId? })` (additive), `takeBack(bundleId,
  count): Promise<number>`. `subscriptions.ts` (R17-12): `applySubscriptionEvent(event)`, `activeSubscription(userId)`. `campaigns.ts`
  (R17-13): `checkCampaign(input, others): string | null` (the refusal line), `priceFor(item, at, slug?)`; `testers.ts`: `addTester`,
  `grantTester(userId, 1 | 3 | 5, by)`, `removeTester`, `isTester`. `mailer.ts` (R17-07): `buildReceiptEmail`, `sendReceiptEmail({ to;
  item; cents; campaignName; tick; renewal; historyUrl })`. `qaPair.ts` (R17-09): `QA_PAIR` (mira: `qa-a+clerk_test@mystarsdecoded.com`,
  Mira Costa; idris: `qa-b+clerk_test@mystarsdecoded.com`, Idris Costa), `ensureQaPair(): Promise<{ mira; idris; seeded }>`,
  `resetQaPair(pair)`. `labFixtures.ts` (R17-06): `runFixtures({ set: matrix | qa }, actor)`; run keys `mira.qa`, `idris.qa`,
  `mira-idris.qa`, each with a `whole` row (the output entire, the chart and the name on it). `qaWalk` (R17-25): `runQaWalk({ mode;
  writes; signal? }): Promise<QaWalkVerdict { status; steps: { id; label; status: pass | fail | stored | local | not_run; ms }[];
  findings: { step; title; detail }[] }>`, `STAGING_STEPS`.
- **Stripe's basil-era fields** (from the SDK's types, for R17-11 and 12): a subscription's `current_period_end` is on its item; an
  invoice's subscription is `parent.subscription_details.subscription`; its payment is under the invoice's payments; a line's price is
  `pricing.price_details.price`.
- **Web.** `checkout-view.ts` (R17-14): `checkoutHref(item: CatalogueItemId | null, returnTo)` → `/checkout?item=…&returnTo=…` (no item:
  the three bundles, Single first; a plan: both plans, the month first), `payLabel(cents)` → "Pay €54". `prices.ts`: `usePrices(): {
  items: PriceItem[] | null }` (null on any refusal, so a surface keeps the catalogue's prices), `keepCampaign(search)`, `CAMPAIGN_KEY =
  "sd.campaign"` (the tab's sessionStorage). `refusals.ts` (R17-16): `isNoCredit(error)`. The dashboard opens `?open=credits | gift |
  add | pair` once (R17-15).

## The shared step list: how the two walks stay in step
`api/src/walk/steps.ts` (R17-24) is the one list of the Owner's flow; neither walk keeps its own. Each step has an id, a label and what
the staging walk does with it: **live** (the same step on the live site), **stored** (staging checks the seeded report the step would
write, and writes it for real only in a Release's walk) or **local** (staging skips it, with its reason). The buyer walk runs the list
through a map typed `Record<StepId, Step>` and the staging walk through `Record<StagingStepId, Step>` (the ids that are not local), so a
step added to the list fails typecheck until both walks have it, or it says local and why. Each walk also refuses at start if its map
and the list differ, and `steps.test.ts` (critical tier) pins unique ids, a reason on every local step, and the staging map equal to the
non-local ids. Credit counts differ by host (staging's writes are stored and Mira carries 20 test credits), so each step asserts from the
ledger it reads, never from a typed number.

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
| 13 | `tomas-report` | Mira, out of credits, buys a Couple from the birth form and writes Tomás's Personal report | local (MB-226) |
| 14 | `tomas-pair` | Mira writes the partners report for herself and Tomás | local (MB-226) |
| 15 | `tomas-sends` | Mira sends Tomás both reports; two emails go out | local (MB-226) |
| 16 | `tomas-claims` | Tomás claims both and reads them | local (MB-226) |
| 17 | `timeline` | Mira starts Timeline yearly: it opens with 1 credit to give, renews a year on, and closes at the end of the period she cancels; Idris keeps the teaser | live, a test clock |

## Parallel groups
**Group A**, one message: R17-01 to R17-09 (no file in common). Inside it R17-04 reads R17-02's tables and R17-03's keys, R17-07 and 08
read R17-03's plans and tick, R17-09 reads R17-02's testers and R17-06's run keys, all on pinned shapes. Push once. **Group B**, one
message once A is green: R17-10 to R17-20. R17-10 mounts R17-13's router; R17-11 calls R17-07's and R17-12's functions; R17-15 to 18
use R17-14's `checkoutHref` and `usePrices`; R17-17 uses R17-16's `isNoCredit`; R17-19 calls R17-13's routes and R17-26's. Push once.
**Group C**, one message once B is green: R17-21 to R17-27; R17-23 and 24 walk R17-21's and 22's API, R17-25 implements R17-24's list,
R17-26 runs R17-25's walk. Push once; then the orchestrator's steps and the gate. **If R17 must shrink:** first the admin's two pages
(R17-19: the routes stay, and Run now waits a round for its button), then Timeline's billing (R17-12, 18, 20 and 27, whole: MB-197 stays
open and Timeline stays the admin's), each to the next /plan; MB-223 and 224, checkout, the ledger and both walks never move.

---

## Group A — the ground: the contract, the tables, the catalogue, Stripe's seam, MB-223, the lab's runs, receipts, the legal pages, the QA pair

### R17-01 — The contract and codegen (INTERNAL) — closes MB-224
Tier: opus — the payments contract spans three packages and every checkout surface reads it
Objective: every public shape this round's routes answer, in `openapi.yaml`, additive, with the client and zod regenerated.
Files: `packages/api-spec/openapi.yaml`; `packages/api-client-react/src/generated/**`, `packages/api-zod/src/generated/**` (codegen);
`web/src/lib/credits-view.ts` (only `HISTORY_FALLBACK` and the sign, for the two new History kinds).
Refs: pinned contract; R-7.2; stripe-payments Checkout, Fulfilment, The subscription; ADR-274, 275, 277; MB-224, 231.
Done when:
- Every pinned path, schema and operationId is in the spec with a one-line description naming its ADR; `PairLink.of` lists `none`;
  `CreditHistoryItem.kind` gains `granted` and `refunded`; `TimelineAccess.plan` is optional and nullable; `NoCredit` (402) is declared
  on the four write routes; `/checkout/test` stays until R17-22. Nothing existing is removed or narrowed.
- `pnpm --filter @workspace/api-spec run codegen`, then typecheck green with only the named files changed; a second codegen, no diff.
- Every user of a widened type grepped (the promoted rule); `credits-view.test.ts` green with a line for each new kind.

### R17-02 — The payment tables (INTERNAL)
Tier: opus — schema, run by every deploy's bootstrap
Objective: purchases, Stripe's events, subscriptions, campaigns, testers and the walks' verdicts in place before any route reads them.
Files: new `packages/db/src/schema/payments.ts`; `schema/credits.ts`, `schema/users.ts`, `schema/index.ts`; new `packages/db/scripts/
migrate-payments-columns.ts` (added to `packages/db/package.json`'s `migrate` chain: step 1) and `migrate-add-payments.ts` (step 3o in
`scripts/bootstrap-db.sh`, its comment saying why); `packages/db/scripts/migrate-credit-type-nullable.ts` (a no-op once the column is gone).
Refs: pinned schema; R-7.3, §3; stripe-payments Fulfilment (Schema); ADR-275 to 279; MB-80, MB-123.
Done when:
- Every table and column exists as pinned, in drizzle and in the scripts (`IF NOT EXISTS`, `IF EXISTS` throughout); every change to an
  existing table runs in step 1, before the push, so step 2 applies nothing and never prompts; old test bundles read `source = 'test'`.
- `CREDIT_STATUSES` gains `refunded` and `creditType` leaves the schema, with every reader of either grepped (the promoted rule).
- On a scratch Postgres 16 with a dummy `OPENAI_API_KEY`: `db:bootstrap` on `main`'s tree, then this branch's twice, then an empty
  database twice, each clean; `packages/db` tests green.

### R17-03 — The catalogue: lookup keys, Timeline's two plans and the plan's tick (USER-FACING) — provisional MB-225
Tier: sonnet — one package, every value pinned here
Objective: Stripe finds each product by a key typed once in the catalogue, and Timeline's prices live there beside the bundles' (R-6.3).
Files: `packages/commerce/src/catalogue.ts`, `catalogue.test.ts`, `terms.ts`.
Refs: pinned catalogue; R-6.3, R-6.6; stripe-payments Four products; ADR-277; timeline.md Free and paid; MB-225.
Done when:
- `lookupKey` on each bundle (`solo` → `single`), `PLANS` (€9.99 a month, €69.99 a year with 1 credit to give), `CatalogueItemId`,
  `itemById`, `renewalLine`, `CAMPAIGN_ITEMS` and `MAX_CAMPAIGN_OFF` as pinned; `PLAN_TICK` in `terms.ts` with MB-225's words and
  `// MB-225 provisional`; no euro amount typed outside `catalogue.ts` (the price gate green).
- Tests pin each key and amount, both renewal lines, and that no plan is a campaign item; every importer of `BUNDLES` still compiles.

### R17-04 — The Stripe seam and the product sync (INTERNAL)
Tier: opus — payments, a new dependency, and a sync that runs on every staging start
Objective: one Stripe client on one API version, and Stripe's Products, Prices, coupons and portal made from the catalogue, never by hand.
Files: new `api/src/lib/stripe.ts`, `stripeSync.ts`, `stripeSync.test.ts`; `api/src/index.ts` (the sync after listen); `api/package.json`
(`stripe` 22.6.2, exact); `pnpm-lock.yaml`; `.env.example` (the three Stripe keys and `STRIPE_API_BASE`, no values).
Refs: pinned server shapes; stripe-payments Four products, Keys; ADR-277, 280; R-7.4; MB-114; readings 8, 9, 14.
Done when:
- `stripe.ts` pins `2026-08-26.dahlia`, reads only Railway's keys, refuses a live key off production and a test key on it, and honours
  `STRIPE_API_BASE` only off production. `syncProducts` keeps four Products and five Prices found by lookup key (`tax_behavior`
  inclusive): a changed amount is a new Price with `transfer_lookup_key` and the old one inactive; one coupon per live or coming campaign
  item; the portal's configuration (cancel at period end, payment method, invoices). It never fails or delays the start; no key, it skips.
- Tests on a stand-in Stripe (no network): a second run changes nothing; Couple at a new amount moves `couple`; four and five found.
- The report lists every package the lockfile gained (stripe brings none).

### R17-05 — A pair shared with its other person (USER-FACING) — provisional MB-223
Tier: opus — access and consent: who reads a report with two people in it
Objective: Mira shares the parent and child report she made with Idris, whose chart came to her by Share yours back; he opens it from
the link, reads it and does its exercises, as any shared reader does (MB-223, amending ADR-235).
Files: `api/src/lib/access.ts`, `access.test.ts`; `api/src/routes/invites.ts`, `invites.test.ts`; `api/src/walk/buyer.walk.ts`.
Refs: MB-223 (the Owner, 2026-10-05); R-3.6; ADR-133, 139, 235; MB-82, 103; reading 15; R15-18's lesson.
Done when:
- `pairSendStateFor` offers `can_send` when the other person holds their own chart, shared with the maker; the send's claim promotes
  their side and hands nothing over; `pairReadable`, `viewerRelationshipIds` and `viewerHasGrantOnRelationship` read a side its reader
  holds; Stop sharing on the pair ends it; the address is the one Mira typed, never one filled from Idris's account.
- Each 403 names its real reason: a maker who isn't one of the two hears so, and a maker who is never hears it.
- The walk's "Mira can't yet share" step becomes Mira sharing the pair and Idris claiming and reading it, and `asContracted` goes
  (R17-01's `none`); the walk and both tests green on a scratch Postgres.

### R17-06 — Fixture runs and the QA pair's reports, from the Lab page (INTERNAL) — provisional MB-148
Tier: opus — paid lab runs on Railway, across the API, the web and the scripts
Objective: fixture runs move into the Lab page now that hard credits end the anonymous campaigns, and the same control writes, once,
the stored reports the QA pair is seeded from.
Files: new `api/src/lib/labFixtures.ts` (+ test); `api/src/routes/adminLab.ts`; `web/src/components/lab/RunsView.tsx`; `web/src/lib/labApi.ts`;
`.github/workflows/report-lab.yml` (deleted); `scripts/src/report-lab.ts` and its test (`--remote` retired); `fixtures/sample-people/README.md`
and `web/src/site/data/people.ts` (the line saying the lab never reads them).
Refs: MB-148; ADR-77, 86, 279; R-4.4; reading 10; What the seeding costs; `releaseLab.ts` (`runReleaseLab`, its two estimates).
Done when:
- `POST /admin/lab/fixtures { set: "matrix" | "qa" }` (the lab guard, staging only): `matrix` runs the release lab's five charts and pair
  with no gate; `qa` writes Mira's and Idris's Personal reports and their parent and child report (Idris the parent), each kept whole
  under label `qa` as pinned. Both are priced first against `LAB_BUDGET_USD`, and each call's cost is recorded as it lands.
- The Runs view shows both buttons with their estimates (about 20 ¢ and 10.5 ¢); tests on a stubbed engine; no other workflow changes.

### R17-07 — The receipt email (USER-FACING)
Tier: sonnet — one file and its test, every word from a constant
Objective: our receipt beside Stripe's, repeating the tick and the refund rules (Art. 8(7)), the item, the amount and a History link.
Files: `api/src/lib/mailer.ts`, `mailer.test.ts`.
Refs: pinned server shapes; stripe-payments Fulfilment (Receipt); R-6.6; ADR-143, 274; MB-225; `/ux-copy`.
Done when: `buildReceiptEmail` and `sendReceiptEmail` as pinned: the item's name with its credits or its plan, the amount from
`formatEuro` and a campaign's name when there was one, the tick it was bought under word for word (`CHECKOUT_TICK` or `PLAN_TICK`),
the three refund rules, a plan's renewal line, and a History link on our web app; the other emails' dark tables; the test pins every
part and that no price is typed.

### R17-08 — Terms, Refunds and Privacy for checkout and Timeline (USER-FACING) — provisional MB-225
Tier: opus — the legal pages a buyer relies on, with words no spec locks
Objective: the legal pages say what checkout now does: our tick, real payments through Stripe, Timeline's subscription and how to stop
it, and Stripe as its own controller with what its fields keep in the browser (QA-04 #2).
Files: `web/src/pages/legal/TermsPage.tsx`, `RefundsPage.tsx`, `PrivacyPage.tsx`; `web/src/lib/processors.ts` (+ test); `web/src/site/site.ts`
(the three pages' `updated` and the Terms lede).
Refs: QA-04 sev-2 #2; ADR-143 to 145, 264, 274, 277; R-3.5, R-6.6; MB-114, 115, 225; reading 7; `/ux-copy`.
Done when:
- Terms trade "There's no subscription." for Timeline's terms (monthly or yearly, renews until you stop it, stop it on your Account
  page, the plan's tick); Refunds keep the three rules and add MB-225's line; Privacy names Stripe (its own controller, in the EU), the
  browser keys Stripe's fields set on `/checkout`, `sd.campaign`, and the birth form's draft now kept across checkout. Prices from the catalogue.
- Simple words, one idea per sentence; the report lists every new line before and after for the Owner; site checks green on the three.

### R17-09 — The QA pair: Mira and Idris on staging (INTERNAL)
Tier: opus — it makes accounts and resets their data: staging only, refused everywhere else
Objective: two real staging accounts, Mira Costa and Idris Costa, made by code, marked as testers, seeded from the stored `qa` runs,
and put back to the walk's start before each walk.
Files: new `api/src/lib/qaPair.ts`, `qaPair.test.ts`.
Refs: pinned server shapes; stripe-payments Automatic QA; ADR-272, 279; MB-226, 229; readings 10, 11.
Done when:
- `ensureQaPair` finds or makes both through Clerk's `createUser` (the locked `+clerk_test` addresses, the sample people's names), adds
  their `users` and `testers` rows, and seeds what's missing from the `qa` runs: Mira's own report, Idris's own report, and Mira's
  parent and child pair with Idris holding his own chart. With no stored run it answers `seeded: false` and never throws.
- `resetQaPair` deletes what a walk left (invites, gifts, shares, the pair's grant, reports past the seeds, a test-clock customer),
  tops Mira up to 20 test credits and Idris to 0; every function refuses unless `APP_ENV` is `staging`.
- Tests with a stubbed Clerk on a scratch Postgres: a second ensure changes nothing; each function refuses on production.

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
  for a purchase carrying its tick (`grantBundle` with `source` and `purchaseId`, additive), then sends R17-07's receipt; subscription and
  invoice events go to R17-12's `applySubscriptionEvent`; refunds and disputes take back as reading 3 says; History reads both new kinds.
- Tests: a replay, and completed then async, grant once; a full refund takes the unused and never a used or given credit; no payload,
  email or name in any log line.

### R17-12 — Timeline's subscription: mirrored, the second access source, the yearly credit (INTERNAL) — closes MB-197
Tier: opus — access: a paid product's second source
Objective: an active subscription opens Timeline (no switch, ADR-262), and the yearly plan gives one credit a year.
Files: new `api/src/lib/subscriptions.ts`, `subscriptions.test.ts`; `api/src/lib/timelineAccess.ts`, `timelineAccess.test.ts`;
`api/src/routes/timeline.ts` (the access answer's `plan`).
Refs: pinned server shapes and Stripe's basil-era fields; stripe-payments The subscription; ADR-262 to 264, 277; MB-197; readings 7, 12.
Done when:
- `applySubscriptionEvent` mirrors `customer.subscription.created|updated|deleted`, `invoice.paid` and `invoice.payment_failed` into
  `subscriptions` (status, item by lookup key, period end from the item, cancel at period end). The first paid invoice grants the plan's
  purchase and sends R17-07's receipt; each paid yearly invoice is a purchase row and one credit to give (`source: "plan"`, "With
  Timeline"), taken back if that payment is refunded while it is unspent.
- `ACCESS_SOURCES` gains `subscription` after `admin` (`// MB-197 provisional` goes): active, trialing or past due; a cancel at period
  end keeps it to the end; GET /timeline/access answers `plan`.
- Tests: each event moves the row and the access answer with it; a replayed `invoice.paid` grants once; the critical tier green.

### R17-13 — Campaigns and testers on the server (INTERNAL) — provisional MB-149
Tier: opus — money: the price a buyer sees, and credits given away
Objective: campaigns saved under their rules and priced per request; testers added, granted and removed; the sync's button.
Files: new `api/src/lib/campaigns.ts`, `campaigns.test.ts`, `api/src/lib/testers.ts`, `testers.test.ts`, `api/src/routes/adminPayments.ts`.
Refs: pinned server shapes; stripe-payments Campaigns, Testers; ADR-276, 278, 281; R-6.7; MB-149; readings 4 to 6; R16-01, R16-05's lessons.
Done when:
- A save is refused, each with its own line, at more than 25% off, on Single or a plan, for a second live campaign on a product, for one
  starting within 30 days of the last on that product (MB-149), for an end before its start or a date that isn't a real day, and for a
  link slug taken or malformed.
- `priceFor(item, at, slug?)` answers by whole Brussels days, a link-only campaign only with its slug; a test pins 23:59 and 00:00 on
  the last day.
- Admin routes behind the lab guard: campaigns list, save and end; testers add (an existing account's email), grant 1, 3 or 5
  (`source: "grant"`, test, no purchase row, "From Stars Decoded"), remove; POST sync runs R17-04's and answers its report. No route
  takes an amount for a grant.

### R17-14 — /checkout in our look, and the page that waits for the credit (USER-FACING)
Tier: opus — a new screen that takes payment, and a new dependency
Objective: the item and its price, Stripe's Express Checkout and Payment Element in our look, our tick and Pay with the amount; then a
done page that waits for the credit and takes the reader back to the step that asked.
Files: new `web/src/pages/CheckoutPage.tsx`, `CheckoutDonePage.tsx`, `web/src/lib/checkout-view.ts` (+ test, added to `web/test.critical`),
`web/src/lib/prices.ts`; `web/src/App.tsx` (`/checkout`, `/checkout/done`, and R17-19's `/admin/testers`, `/admin/campaigns`);
`vercel.json` (the app rewrite, CORS on `/fonts/*`); `web/scripts/csp.mjs` (Stripe's hosts); `web/package.json` (`@stripe/stripe-js`
9.17.0, exact); `pnpm-lock.yaml`.
Refs: the artifact's look B (Round start 5); pinned web shapes; stripe-payments Checkout; ADR-274; §9; readings 2, 6; R14-12, R16-24.
Done when:
- At 390 px first: the item (or the three bundles, or both plans), its price, a campaign's line, a plan's renewal line; Pay disabled
  until the tick; `initCheckoutElementsSdk` with Appearance from our tokens and Inter from our origin; focus goes tick, then Pay.
- The done page polls GET /checkout/{id}, refreshes credits and home, then opens `returnTo`; after 60 s it says the payment is still
  being confirmed and gives the way back; `checkout-view.test.ts` pins the labels and the href; the report lists the lockfile's additions.

### R17-15 — Get credits opens /checkout from every asking step on the dashboard (USER-FACING) — provisional MB-206, MB-149
Tier: opus — the credit flow through nine components, with money on each
Objective: zero means zero everywhere: each Get credits opens `/checkout` with its `returnTo`, the sheet's bundles buy, live campaign
prices show, and the free test checkout's buttons and every soft-pass branch go.
Files: `web/src/lib/credits-view.ts` (+ test), `web/src/lib/orbit.ts` (+ test); `web/src/components/BundleList.tsx`;
`web/src/components/dashboard/CreditsSheet.tsx`, `CreditPill.tsx`, `AddSomeoneSheet.tsx`, `GiftFlow.tsx`;
`web/src/components/CompatibilityPicker.tsx`; `web/src/pages/DashboardPage.tsx`.
Refs: pinned web shapes; stripe-payments Checkout (returns to the step that asked); ADR-275, 276; R-6.5; MB-149, 206; reading 2.
Done when:
- `creditsEnforced`, `TEST_CHECKOUT` and the `enforced` props are gone; the sheet's bundle rows buy (`/dashboard?open=credits`), and
  at zero the gift flow (`?open=gift`), Add someone (`?open=add`), the picker with its pair (`?open=pair`) and the empty dashboard
  (`/chart`) open `/checkout`; `?open=` reopens its sheet once; a 402 from Gift or a pair shows its line and Get credits.
- Rows show a live campaign's price as reading 6 says; MB-206's count line; `credits-view.test.ts` green; every importer of the removed
  exports grepped.

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

### R17-17 — Try again at zero credits (USER-FACING) — provisional MB-231
Tier: sonnet — four existing controls, one behaviour
Objective: where a failed report offers Try again and the API answers 402, the reader gets the credit line and Get credits, not an error.
Files: `web/src/components/dashboard/PeopleRows.tsx`, `QuickLook.tsx`; `web/src/pages/ReportPage.tsx`;
`web/src/components/report/OpeningOverlay.tsx`.
Refs: MB-231, MB-137; ADR-84, 275; R17-16's `isNoCredit`; R17-14's `checkoutHref`; reading 2.
Done when: on 402 each Try again shows the API's line with Get credits (the dashboard's to `/dashboard`, the report page's to
`/report/{id}`); every other error reads as before; the failure line still says the credit is back; typecheck and the critical tier green.

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

### R17-19 — Campaigns and Testers in the admin (INTERNAL)
Tier: sonnet — admin forms over R17-13's routes, in the admin pages' dense look
Objective: the Owner starts and ends campaigns, adds and grants testers, runs the sync, and sees the QA pair and its last walk.
Files: new `web/src/pages/AdminCampaignsPage.tsx`, `AdminTestersPage.tsx`, `web/src/lib/adminPaymentsApi.ts`;
`web/src/components/AccountMenu.tsx`.
Refs: stripe-payments Campaigns, Testers, Automatic QA; ADR-276, 278, 279, 281; R17-13's and R17-26's routes; the artifact's screens.
Done when:
- Campaigns: live, coming and ended; a form (name; Couple, Family & friends or both, each with its price; first and last day; everyone,
  or a link with its slug and the link to copy) showing the API's refusal line in place; End now; Sync with its report (Products,
  Prices, coupons, any missing permission, MB-227).
- Testers: add by email, grant 1, 3 or 5, remove; the QA pair marked and not removable; Run now and the last verdict from `/api/qa/latest`.
- Both pages behind the admin check; AccountMenu's admin items gain both; typecheck green.

### R17-20 — Ask forgets what a stop took away (INTERNAL) — closes MB-220
Tier: opus — consent: what a reader may still see after someone stops sharing (R-3.6)
Objective: an Ask reply built on someone's chart or report is no longer shown or sent back to the model once its reader can't read them.
Files: `api/src/lib/ask.ts` and its tests.
Refs: MB-220 (R16's sentinel, S2); R-3.6; ADR-182, 213, 235; MB-191.
Done when: each stored reply keeps the profile and report ids its cards came from; on every read and send, a reply with one its reader
can no longer read shows a fixed line ("This answer was about someone who stopped sharing, so it's hidden.") and stays out of the
history sent to the model; tests: a stop hides the reply and its text never reaches the stand-in model; the month's count is unchanged.
No prompt file changes (if one must, the builder stops: the dry lab would run).

---

## Group C — credits made hard, the test checkout gone, both walks on one list, MB-219

### R17-21 — Credits hard on every host (USER-FACING) — provisional MB-231
Tier: opus — credits: no report or gift without one, anywhere
Objective: a credit is taken before a report or a gift is written, and refused with 402 `no_credit` when there is none (ADR-275).
Files: `api/src/lib/credits.ts` (+ `credits.test.ts`); `api/src/routes/reports.ts` (+ `reports.test.ts`), `compatibility.ts`, `gifts.ts`.
Refs: ADR-84, 275; R-6.1, 6.4, 6.5; MB-6, 57, 231; R16-29's lesson.
Done when:
- POST /reports and /compatibility take the credit in the transaction that inserts the report, and start writing only once it commits;
  POST /gifts holds one or discards the gift. Each answers 402 `no_credit` with its own line ("You need a credit to write this report."
  / "You need a credit to give a report."), on every host; the soft-pass branches and `// MB-6 provisional` go.
- A failed report still gives its credit back; Try again on a failed report takes one (402 at zero, `// MB-231 provisional`);
  Regenerate for a new birth time or an earlier version stays free.
- Tests: 402 at zero on each route with nothing written; two writes racing for one credit, one 402; the critical tier green.

### R17-22 — The free test checkout is gone (INTERNAL)
Tier: sonnet — deletions, a contract removal and codegen, every caller already moved
Objective: `POST /checkout/test` and everything that served it leave (ADR-276), and the round's new critical tests join the tier.
Files: `api/src/routes/checkout.ts`, `checkout.test.ts` (deleted); `api/src/routes/index.ts`; `api/test.critical`;
`packages/api-spec/openapi.yaml` (the path and `TestCheckout*`); the generated client and zod (codegen).
Refs: ADR-276 (supersedes ADR-138); stripe-payments acceptance 5; the promoted caller rule.
Done when: the route, its mount and its contract are gone and a call answers 404; `api/test.critical` drops `checkout.test.ts` and adds
`src/routes/payments.test.ts`, `src/lib/purchases.test.ts`, `src/routes/stripeWebhook.test.ts`, `src/lib/fulfilment.test.ts`,
`src/lib/subscriptions.test.ts` and `src/walk/steps.test.ts`; `grep -rn "checkout/test\|TestCheckout\|useTestCheckout"` finds nothing
outside docs; codegen twice, no diff; typecheck and the critical tier green.

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
Refs: The shared step list; ADR-273 to 277, 279; stripe-payments acceptance 1 to 5, 9; MB-223, 226; R17-10 to 12, 21.
Done when:
- `steps.ts` is the pinned list; the walk runs it through a map typed by its ids (a missing or extra step fails typecheck) and refuses
  at start if map and list differ; `steps.test.ts` pins unique ids, a reason on each local step, and R17-25's map equal to the non-local ids.
- The walk buys through POST /checkout on `testStripe.ts` and pays with a signed `checkout.session.completed`, replayed and followed by
  its async twin (one grant); no tick is 400 and a bad signature 400; then Idris's 402, the refund, Tomás's Couple from the birth form,
  and the yearly plan through signed subscription and invoice events; every soft-pass wait goes.
- "buyer walk: 17/17 steps passed" on a scratch Postgres after `db:bootstrap`, as CI runs it.

### R17-25 — The staging walk: Mira and Idris sign in, pay and share on the live site (INTERNAL)
Tier: opus — real sign-in and real sandbox payments, driven by a browser on Railway
Objective: the same steps on the live staging site, as the QA pair, with the sandbox card, a test clock and the stored reports.
Files: new `api/src/lib/qaWalk/index.ts`, `browser.ts`, `steps.ts` (+ test); `api/package.json` (`@clerk/testing` 2.2.39, exact);
`pnpm-lock.yaml`.
Refs: The shared step list; stripe-payments Automatic QA; ADR-272, 279; MB-226, 229; R17-09's pair; reading 11; R14-14's lesson.
Done when:
- `runQaWalk({ mode, writes })` signs both in with Clerk Testing Tokens in two browser contexts on Chromium, then runs `STAGING_STEPS`
  in the list's order: checkout in the page with 4242 4242 4242 4242, other steps through the live API from the signed-in page, each
  step with a screen checked once; stored steps check the seed and write only when `writes` is true; the refund and the plan's renewal
  and cancel through Stripe on a test clock, deleted at the end.
- An email with `emailDelivered` false is a finding; findings carry no email, token, link or Clerk id; no Chromium is `unconfigured`.
- Tests on a stubbed page and Stripe: the order, a failing step stopping the rest as `not_run`, clean findings; the lockfile's additions listed.

### R17-26 — When the staging walk runs, and its public verdict (INTERNAL)
Tier: opus — a deploy trigger, a public route and the Release's gate
Objective: the walk runs after every staging deploy, on Run now and in every Release, and anyone can read its last verdict.
Files: new `api/src/routes/qa.ts` (+ test); `api/src/app.ts` (the public mount); `api/src/index.ts` (the deploy trigger);
`api/src/lib/indexNow.ts` (its wait for the web's commit, exported); `api/src/lib/release.ts` (+ test);
`api/src/routes/adminPayments.ts` (Run now).
Refs: stripe-payments Automatic QA; ADR-272, 279; R-4.4; MB-229, 230; R15-16's lesson.
Done when:
- On staging only, after listen and unawaited: wait up to 20 minutes for the web to serve this commit, then `ensureQaPair`,
  `resetQaPair` and `runQaWalk({ mode: "deploy" })`; one `qa_walks` row per commit per process; the start is never failed or delayed.
- POST /admin/qa/run (the lab guard) starts one and refuses a second while one runs; a Release runs it with `writes: true` after the QA
  agent, and a failed step stops the Release (ADR-272).
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

---

## After the builders: the orchestrator's steps, not cards
1. **After group C, once:** `pnpm --filter @workspace/web run csp:write` (Stripe's hosts from R17-14; the build's `--check` fails
   until then, as expected), `vercel.json` committed; gitleaks over `main...round/R17` with CI's pinned version and config (ADR-283).
2. **The tester, once** (ADR-273: steps 2 to 17 of the flow changed), its base the round's first commit: the critical tests of each
   changed step (the checkout route and `purchases.ts`, the webhook and `fulfilment.ts`, `credits.ts`, `access.ts` and `invites.ts`,
   `timelineAccess.ts`, the step list) check what the cards and the spec now say; a bug it finds is a fix for that card's builder.
3. **The gate:** install, typecheck, both builds, the critical tier, the buyer walk on a scratch Postgres ("17/17"), `check:shipped`,
   `check:copies`, `pnpm audit --prod`, codegen twice with no diff, `db:bootstrap` on the upgrade path twice and on an empty database
   twice, the three archived walks once (their area changed), smoke, the probe and the site checks on the preview.
4. **No dry lab:** no brain path changes; if a builder reports one, the dry lab runs.
5. **The sentinel** on `main...round/R17`, its eye on: the webhook (signature before anything, raw body, once per event, its mount, no
   payload in a log); the tick and the price set on the server; `returnTo`; the key's mode per host and `STRIPE_API_BASE` off
   production; grants and take-backs; campaign slugs and the admin routes; the QA pair's staging-only guards; `/api/qa/latest` with no
   personal data; MB-219's window and cap; MB-220's hidden replies; MB-223's grant (a pair reaches only its other person); the three
   dependencies and the lockfile.

## Staging confirmation, after the merge
1. Railway staging's start: the sync's report beside Sync on the admin's Campaigns page shows four Products, five Prices and no missing
   permission (MB-227).
2. The Owner presses "Write the QA pair's reports" on the Lab page once (about 10.5 ¢, MB-229).
3. Then Run now, or the next deploy: `/api/qa/latest` shows `pass` for the merged commit (acceptance 10). The orchestrator reads it by
   hand (MB-230), and `/qa` reads staging's payment flows.
4. The Owner's look: Get credits from the birth form, the sheet and Gift → `/checkout` in our look → the test card → back where you
   asked, with Stripe's receipt and ours; a campaign saved, seen on the sheet, and refused at 30%; a tester granted 3; Timeline started
   from the teaser, then cancelled in the Portal from Account; Mira's pair shared with Idris.

## Production after the round
Nothing sells. The next Release carries the code (no brain change, so no lab; the staging walk runs in it and writes, about 10.5 ¢):
production's checkout says it isn't ready (no live key, no postal address), the webhook route exists, the sync skips, the Testers and
Campaigns views work for the admin, Timeline stays the admin's, and the waitlist stays over the app until launch (ADR-167). The first
live sale waits for MB-228, 114 and 115.

## Owner prerequisites (none blocks the build; sandbox first)
- **Before acceptance on staging:** MB-227 (staging's restricted key allows what the code calls; the destination's eleven events;
  receipts on; then GitHub's copies deleted) and MB-229 (the QA addresses take mail; one press of "Write the QA pair's reports").
  Already done (2026-10-04): staging's three Stripe values on Railway.
- **Before the first live sale:** MB-228 (the account, business and public details, branding, two-step sign-in, Apple Pay's domains,
  the live keys and webhook destination on Railway production, Clerk's production instance and `ADMIN_USER_ID`); MB-115 (the postal
  address in `LEGAL_IDENTITY`, which the law puts on the Terms page, so a forwarding address keeps the home one off it); MB-114 (VAT and
  the consumer-law check, now reading MB-225's tick and MB-149's 30 days too).
- **Answers that change a card:** MB-225, MB-231 and MB-226 (For the Owner).

## What the seeding costs
On production's mix (gpt-6-sol plans, gpt-6-luna writes), priced as the release lab prices itself, on r06's and r12-pair's token
counts (`NATAL_ESTIMATE_USD`, `PAIR_ESTIMATE_USD`; MB-70's prices provisional):

| What | When | About |
|---|---|---|
| Mira's Personal report, Idris's, and their parent and child report | once: the Owner's press (R17-06, MB-229) | 3.1 + 3.1 + 4.35 ≈ 10.5 ¢ |
| With Tomás (MB-226 yes): his report and the partners report | once | + 7.4 ¢ (17.9 ¢ in all) |
| The staging walk after a deploy or on Run now | every time | 0 ¢ (stored steps; the sandbox is free) |
| The staging walk in a Release, writing for real | each Release | 10.5 ¢ (17.9 ¢ with Tomás), on staging's daily cap |
| Run the fixtures (MB-148's control) | on demand | about 20 ¢ (five charts and their pair) |

Lab runs count against `LAB_BUDGET_USD` ($15 a month, ADR-77). Nothing spends without a press or a Release.

## Risks
1. **Money:** real money only on production after launch; staging pays in Stripe's sandbox; a live key off production or a test key
   on it is refused (R17-04); the webhook alone grants (R-6.2); the tick and the price are set on the server; every refusal is tested.
2. **Schema** (R-7.3): six new tables (`qa_walks` beyond the spec's list, for the verdict), three new columns and `credit_type` dropped;
   changes to existing tables run in step 1 so the push never prompts; the upgrade and empty paths run twice each (R17-02).
3. **New dependencies** (ADR-200, R14-01's lesson): `stripe` 22.6.2 (API; no dependencies), `@stripe/stripe-js` 9.17.0 (web; no
   dependencies; it loads Stripe.js from js.stripe.com at run time, as Stripe requires), `@clerk/testing` 2.2.39 (API; dotenv 17.2.2,
   with `@clerk/backend` and `@clerk/shared` already locked). Each card's report lists the lockfile's additions; the sentinel reads them.
4. **Hard credits** change every write path (402 at zero); the anonymous lab campaigns stop at the merge (Round start 3, MB-148); Try
   again takes a credit (MB-231); a second birth-time update stays free (MB-120 unchanged, though R-6.1 says otherwise).
5. **USER-FACING without a locked line:** the checkout's words around Stripe's fields, the done page, the 402 lines, the receipt, the
   legal lines, the plan's tick (MB-225), Account's plan lines, the teaser's Start, the campaign line (MB-149), the admin pages. Each
   goes through `/ux-copy`, and the close lists them, before and after, for the Owner.
6. **USER-FACING at the next Release:** the pages and lines above; on production nothing sells and the app stays the admin's (ADR-167).
7. **Security:** the sentinel's list in After the builders 5.
8. **Privacy** (R-3.5): Stripe as its own controller and the keys its fields set on `/checkout`, `sd.campaign`, the birth form's draft
   kept across checkout, and the receipt, each named on the privacy page (R17-08); the QA pair are synthetic and labelled (R-3.1,
   ADR-112), with reports only on staging.
9. **Timeline opens to sandbox subscribers on staging** (MB-197 closes): MB-219 and 220 close with it; MB-198's spot and MB-218's
   checks stay due before production sells Timeline, after launch (CLAUDE.md's focus 2).
10. **The sample people get real reports,** on staging only, in the QA pair and `lab_runs`, never on a public page; their README and
    `people.ts` say so (R17-06).
11. **The staging walk** leans on Railway's Chromium, Clerk's Testing Tokens, Stripe's sandbox, a test clock and the QA addresses' mail;
    each failure is a named finding, a missing browser is `unconfigured`, never a crash, and a failed step stops a Release (ADR-272).
12. **Stripe facts not read in Stripe's docs** (blocked): Round start 4 checks them before group A.
13. **Size:** 27 cards in three groups (9, 11, 7), the shrink path in Parallel groups; Vercel's 100 deployments a day: three pushes plus fixes.
14. **Escalations:** none in R15 or R16, so no card or kind of card was escalated in two rounds running.

## Lessons this plan guards
- **Promoted, the caller rule** (`builder.md`): R17-01 (the History kinds' map in `credits-view.ts`, `TimelineAccess.plan`,
  `PairLink.of`), R17-02 (`CreditStatus`, `credit_type`'s readers), R17-11 (`grantBundle`'s options stay additive for the walks'
  calls), R17-15 (every importer of `creditsEnforced` and `TEST_CHECKOUT`), R17-21 (every caller of the write routes and `holdCredit`),
  R17-22 (no importer of the test checkout's hook left).
- **Promoted, the pathspec rule** (`builder.md`): every builder; group B's eleven share one tree.
- **Applied:** one push per group and per fix (the round skill's Push); the tester's range from the round's base (`tester.md`).
- R13 · R13-05 (a running /round can't edit its own skill) → no card edits `.claude/skills/`; MB-230.
- R13 · R13-08 (a limit keyed on a client-sent value or a fresh session) → R17-10 keys checkout's limit on the account; the webhook is
  gated by its signature; every staging-only refusal keys on `APP_ENV`, never on a request (R17-04, 09, 25, 26).
- R13 · R13-09 (spend summed from a stored, derived cost) → R17-06 prices each run first and records each call's cost as it lands; a
  Release walk's writes go through the real write path and the daily cap.
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
- R16 · R16-24 (a kept row spinning for good) → R17-14's done page stops after 60 s with a line and the way back.
- R16 · R16-14 (structured data stamped on every page of a kind) → R17-16 changes only the home page's Offer.
- R16 · R16-29 (a refusal line borrowed from another product) → R17-21's 402 lines speak of credits, R17-10's plan refusals of
  Timeline, R17-27's cap of Timeline's readings.

**Lessons read through R16.** R16's close wrote `lessons.md` (272897e). The edits since (ADR-265 and 273) changed its rules and moved
three lines to Promoted, early or applied; no round has added a line after R16's. This plan was written after R16 closed.

## Questions raised (Notion, 2026-10-05)
- **Raised today:** **MB-225** (decision, launch) the plan's tick; default: built, `// MB-225 provisional`. **MB-226** (decision, launch)
  a third QA account for Tomás; default: two accounts, the four Tomás steps local. **MB-227** (todo, launch, Alex) the sandbox key's
  permissions and the destination's events, then GitHub's copies deleted. **MB-228** (todo, launch, Alex) the first live sale's
  checklist. **MB-229** (todo, launch, Alex) the QA addresses' mail and the one press. **MB-230** (todo, launch) the skills read the
  verdict, written outside /round. **MB-231** (decision, launch) Try again takes a credit; default: built, `// MB-231 provisional`.
- **Updated:** **MB-149** (decision, launch): campaigns now run from the admin; the campaign line beside the launch price and the 30
  days; default: built, provisional.
- **Built at their defaults:** MB-148 (R17-06), MB-206 (R17-15), MB-219 (R17-27), MB-220 (R17-20), MB-223 (R17-05), MB-224 (R17-01).
  **Closed by the round:** MB-197 (R17-12); MB-6 and MB-57 for good (ADR-275). **Answered by ADR-278 once campaigns ship:** MB-118.
- **Kept open:** MB-114 and 115 (Owner prerequisites), MB-120 (a second birth-time update), MB-198 and 218 (before production sells
  Timeline), MB-91 (the failure lines, for the fixes round).

## For the Owner (three asks, highest stakes first)
Approving this plan starts R17 at once (MASTERFILE §11.2). It sells nothing outside Stripe's sandbox.
1. **The words a Timeline subscriber ticks (MB-225).** The spec's tick is about credits, and a plan needs its own. Recommendation:
   "Start Timeline as soon as I pay. I understand I can't cancel a month or year that has started for a refund. I can stop it renewing
   at any time." The Refunds page adds: "Timeline: stop it on your Account page, and it runs to the end of the time you've paid for."
   If silent: built so, provisional, and MB-114's check reads it before the first live sale.
2. **Try again after a failed report (MB-231).** Today a failed report gives its credit back and Try again is free, so once money is
   real every failure is a free report. Recommendation: Try again takes a credit like the first write did; the failure line still says
   the credit is back. If silent: built so, provisional.
3. **A third QA account for Tomás (MB-226).** The buyer walk has Mira, Idris and Tomás, and the locked QA pair has two accounts, so four
   steps (Mira writes and sends Tomás's reports, and he claims them) run only in CI. Recommendation: add qa-c as Tomás (no key, about
   7.4 ¢ once and per Release), so all seventeen steps run on staging. If silent: two accounts, and the four steps are marked local.

## Close (the orchestrator)
MB-223, 224, 148, 206, 219, 220 and 231 built with their seams tagged; MB-197 done; MB-118 done (ADR-278). A Mailbox row lists the
round's new words before and after for the Owner's look. MASTERFILE: §3's tables (with `qa_walks`), R-6.1's Try again, R-4.4's walk on
the shared steps, §6 as built. INDEX's code map: `stripe.ts`, `stripeSync.ts`, `purchases.ts`, `fulfilment.ts`, `subscriptions.ts`,
`campaigns.ts`, `testers.ts`, `qaPair.ts`, `labFixtures.ts`, `qaWalk/`, routes `payments.ts`, `stripeWebhook.ts`, `adminPayments.ts`
and `qa.ts`, `/checkout` and its done page, the admin's Campaigns and Testers, `api/src/walk/steps.ts`, and `report-lab.yml` gone.
CLAUDE.md's focus: R17 shipped; the Owner's press (MB-229) and the skills' line (MB-230) next. `lessons.md` takes each failure's
cause. `/qa` on staging after the Owner's press, then the URL, the QA report, the walk's verdict and Staging confirmation's four lines
go to the Owner.
