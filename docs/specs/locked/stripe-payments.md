# Stripe payments

Ideation 2026-10-04 with the Owner: Stripe for the reports and Timeline, a checkout in our look, four
saved products, campaigns, testers, automatic QA. Artifact: https://claude.ai/artifact/Yamws6GPDB5jKvdk8U8rp2.
Status: **locked 2026-10-05**. Builds on `pricing-and-launch.md` (ADR-142 to 149, standing except where
superseded here), the catalogue as built (Couple €54, ADR-168), `timeline.md` as R16 built it
(ADR-262 to 264); MB-114, 115, 119, 197.

## Where the code stands (audit 2026-10-04)
Built: the catalogue, `LEGAL_IDENTITY` (address null), the tick, refund rules, legal pages, the ledger,
the test checkout. Missing: all Stripe code; credits soft on every host (`consumeCredit` after the
write, `holdCredit` lets gifts out with none); `express.json` and the prelaunch gate in a webhook's way.

## Scope

### Checkout: our page, Stripe's fields (B, the Owner, 2026-10-04)
- `/checkout` on our origin, in the product's look: the bundle or plan with its price from the
  catalogue, Stripe's Express Checkout (Apple Pay, Google Pay, Link) and Payment Element styled
  through Stripe's Appearance API from our tokens, the one tick, Pay with the amount.
- Backed by a Checkout Session in `ui_mode: "elements"` (the API's name for the old `custom`
  since 2026-03-25.dahlia), line items by the price's lookup key, no `payment_method_types`
  (dynamic methods from the Dashboard), the account email prefilled.
- **The tick is ours** (supersedes ADR-143's use of Stripe's terms box, not its words): unticked,
  required, `CHECKOUT_TICK` verbatim with a Terms link; `POST /checkout` refuses without it and stores
  the tick's text hash and time on the purchase row; the webhook grants only purchases that carry it.
- Returns to the step that asked (birth form, picker with its pair, Gift a report, the sheet) via a
  `returnTo` kept with the purchase; the return page waits for the credit, then carries on.
- CSP gains Stripe's script, frame and connect hosts (Report-Only today, so nothing breaks first);
  Apple Pay's domain registered for `mystarsdecoded.com` and the staging host.
- The publishable key lives on Railway beside the others (`STRIPE_PUBLISHABLE_KEY`, where the Owner
  put it) and reaches the browser through `GET /checkout/options`, so every Stripe key has one home
  and a key change needs no web rebuild.

### Four products, saved in Stripe (the Owner, 2026-10-04)
- Single €24 (`single`, 1 credit), Couple €54 (`couple`, 3), Family & friends €72 (`family`, 5),
  Timeline €9.99 a month and €69.99 a year (`timeline_month`, `timeline_year`). Prices stay typed
  once, in `packages/commerce/src/catalogue.ts` (R-6.3), which gains the lookup keys and the plans.
- `syncProducts` on Railway, run at start after `db:bootstrap` and from an admin button, creates or
  updates each Product and its Prices in that environment's Stripe mode, keyed by `lookup_key`;
  a changed amount makes a new Price and moves the key (`transfer_lookup_key`), old sales keep theirs.
  No product is created by hand in the Dashboard. Supersedes MB-119's `price_data` recommendation.

### Campaigns (the Owner, 2026-10-04; amends ADR-146's home)
- Admin **Campaigns** view: name, products, the campaign price, start and end dates, audience
  (everyone, or link only via `?c=<slug>`, kept with the session like the UTM tags). Stored in a
  `campaigns` table, per environment, so starting one needs no deploy; offers leave the catalogue.
- The server resolves one price per product per request (R-7.1): the sheet, the landing's slot,
  JSON-LD and `/checkout` show the campaign price beside the full one, the end date once, no countdown.
- Stripe receives it as a Coupon (`amount_off`) made by the sync and applied as the session's
  discount, so the receipt and Stripe's reports name the campaign; the purchase row stores it.
- Rules enforced on save: at most 25% off, one live campaign per product, never Single; Couple and
  Family & friends each alone or both at once. Timeline takes no campaign for now (out of scope,
  not ruled out for later).
- The landing's prerendered slot shows full prices; a live campaign is fetched after load, so a
  campaign never needs a rebuild.

### Fulfilment and the ledger
- `POST /api/stripe/webhook`, mounted before `express.json` and before the prelaunch gate, raw body,
  signature verified with `STRIPE_WEBHOOK_SECRET`, each event id processed once (`stripe_events`).
- Grants on `checkout.session.completed` and `checkout.session.async_payment_succeeded`, only when
  `payment_status` is not `unpaid`, keyed by session id so a replay never grants twice (R-6.2).
- `refund.created` / `charge.refunded` and `charge.dispute.created` take back unused credits of that
  purchase, oldest first; a used credit stays used. Failed reports still refund automatically.
- Hard credits everywhere: `consumeCredit` and `holdCredit` run before the report or gift is
  written and answer 402 `no_credit`; the soft pass, `creditsEnforced()` and MB-6 branches go.
- Schema (idempotent script in `bootstrap-db.sh`): `purchases` (user, kind bundle|plan, catalogue id,
  cents, session id, payment intent, tick hash and time, returnTo, status, is_test), `stripe_events`,
  `subscriptions`, `campaigns`, `testers`, a `refunded` credit status, `grant` as a bundle source; drop unused `credit_type`.
- Receipt: Stripe's own receipt for the payment, plus our email through Resend repeating the tick
  and the refund rules (Art. 8(7)), the bundle, the amount and the History link.

### The subscription: the plumbing now, the sale with Timeline
- Timeline is the fourth product, monthly €9.99 and yearly €69.99, VAT included, saved by the sync
  as recurring Prices. Settled 2026-10-04 (the Owner: "building for both the reports and the
  subscription product").
- The same `/checkout` in subscription mode, with the renewal line before Pay ("Renews every month
  at €9.99 until you cancel."); one Stripe Customer per account, created on first purchase.
- `subscriptions` mirrors `customer.subscription.created|updated|deleted`, `invoice.paid` and
  `invoice.payment_failed` (status, plan, period end, cancel at period end).
- Manage and cancel through Stripe's Customer Portal, from R16's Account page (two clicks).
- The yearly plan's credit to give: granted on each `invoice.paid` for the year, taken back if that
  payment is refunded while unspent (Timeline spec).
- No switch (ADR-262, as R16 built it): an active row in `subscriptions` becomes the second entry
  in `ACCESS_SOURCES` (`timelineAccess.ts`, closing MB-197); Start Timeline on R16's offer opens
  `/checkout`. Staging sells it in the sandbox now; production sells it when the launch gate lifts,
  and `/timeline` shows its price from then (no price before it's real).

### Testers and the full flow
- Admin **Testers** view at `/admin/testers` (staging and production, each its own list; the
  accounts themselves are in Clerk's Users, one instance for both until launch): add an account by email, mark it a tester, grant
  1, 3 or 5 credits (source `grant`, `is_test`, History "+3 · from Stars Decoded"), remove.
  Granted credits never count as revenue or in the loop study.
- Staging: every Get credits runs the real checkout on Stripe's sandbox (card `4242 4242 4242 4242`);
  webhook, receipt, refund and subscription all real in sandbox.
- **The free test checkout is deleted** (supersedes ADR-138): the sandbox and the grant replace it.
- Production: real money; testers get credits by grant; Alex refunds from Stripe to test refunds.
### Automatic QA on two accounts of our own (the Owner, 2026-10-04: "You should be testing automatically")
- At start, staging creates `qa-a+clerk_test@mystarsdecoded.com` and `qa-b+clerk_test@…` through
  Clerk's `createUser` (Development instance, test mode: no inbox, no code to read), marks them
  testers and seeds each with a report from a stored lab run (no model spend).
- Credits by code, no admin step: before each walk qa-a is topped up to 20 test credits and qa-b
  reset to 0, so the walk also proves the no-credit path (402, Get credits) and the gift's credit.
  Staging only; production refuses the top-up. Test credits never count as revenue.
- After each staging deploy (and from Run now in the admin), the QA agent on Railway signs in as
  them with Clerk Testing Tokens (`@clerk/testing`, the `CLERK_SECRET_KEY` already on Railway) and
  walks: qa-a buys Couple in the sandbox with the test card and returns to the asking step, Sends a
  report and Gifts one to qa-b; qa-b claims both from the links the app returns, reads the sent
  report, and writes with the gifted credit;
  writes nothing new except once per Release; both dashboards checked; a sandbox refund takes back
  the unused credit; a plan starts, renews on a test clock and cancels. `emailDelivered` is recorded,
  and must be true (Resend works, the Owner 2026-10-04): an undelivered email is a finding.
- The verdict, steps and findings without personal data are public at `/api/qa/latest`, like
  `/api/release/:id/verdict`; `/round` and `/qa` read it after every merge and fix what fails. The
  payments round itself ends with this walk on staging and a `/qa` report on its flows.
  Staging only; production keeps today's read-only walk.

### Keys (no secret on GitHub, ever)
- `STRIPE_SECRET_KEY` as a restricted key (`rk_test_` on Railway staging, `rk_live_` on production),
  `STRIPE_WEBHOOK_SECRET` per endpoint and `STRIPE_PUBLISHABLE_KEY` on Railway; nothing on Vercel.
  Staging's three are in place (2026-10-04): the restricted key, the publishable key, and the
  webhook secret of a destination at `https://starsdecoded-staging.up.railway.app/api/stripe/webhook`
  with the eleven events above. The copies in GitHub's secrets are deleted by the Owner; no workflow reads them.
- `api/src/lib/stripe.ts` the one seam: one `Stripe` client instance, pinned to `2026-08-26.dahlia`,
  the version staging's webhook destination was created with (2026-10-04), so payloads match the types.

## Out of scope
- Timeline's pages (R16 built them; this round wires Start Timeline to `/checkout`), campaigns on Timeline, a typed promotion-code box, a custom Checkout domain, Managed Payments
  (Stripe as seller of record: 3.5% plus fees, eligibility for a Belgian individual unconfirmed),
  a second currency, invoices for businesses, `LAUNCHED = true` (a Release after this ships).
- Stripe Tax stays off until the Owner confirms a VAT registration (MB-114); the seam takes
  `automatic_tax` with inclusive prices when one exists.

## Acceptance criteria
1. On staging, Get credits from each asking step opens `/checkout` in our look; paying with the
   test card grants the bundle once, returns to that step, and sends both receipts.
2. Pay stays disabled until the tick; `POST /checkout` without it is 400; the purchase row holds it.
3. Replaying a webhook event, or completed then async-succeeded, grants once; a bad signature is 400.
4. A full refund in the Stripe sandbox removes the purchase's unused credits; a used one stays used.
5. No report or gift is written without a credit on any host (402 `no_credit`); a failed report
   gives its credit back; `POST /checkout/test` no longer exists.
6. An admin grant shows in the recipient's History and is excluded from revenue.
7. The sync leaves sandbox with exactly four Products and five Prices found by key; running it twice
   changes nothing; changing Couple's amount moves `couple` to a new Price.
8. A campaign saved in the admin changes that product's price on the sheet and `/checkout` between
   its dates only; a link-only one only for visitors with its link; Stripe's receipt names it; a 30%
   or Single campaign, or a second on the same product, is refused.
9. A monthly and a yearly plan can be started in sandbox by a tester, renewed with Stripe's test
   clock, cancelled in the Portal; `subscriptions` follows each step and `timelineAccess` with it.
10. After a staging deploy, with no one's hand, the QA pair exists, the walk completes purchase,
   Send, Gift, claim, refund and a plan's cycle, and `/api/qa/latest` shows the verdict for that commit.
11. No Stripe key in the repo or GitHub; `pnpm check:shipped`, gitleaks, typecheck, both builds,
   tests, codegen, `db:bootstrap` clean twice, the sentinel, preview checks and smoke all green.

## Screens
In the artifact: the three checkout looks at 390 px (B chosen), the flow, the four products,
Campaigns, the subscription, Testers, automatic QA, the keys and the Owner's checklist.

## Answered (the Owner, 2026-10-04)
1. The look: **B**. 2. Campaigns: 25% at most, one per product, never Single, Couple and Family
alone or together, Timeline out for now. 3. Order: R16 Timeline (nearly done), then this round, then
a round of fixes.

## The Owner's checklist (none of it blocks the build; sandbox first)
Done: the three sandbox keys on Railway staging. After: delete the Stripe secrets from GitHub.
Before the first live sale: activate the account (identity, the Revolut payout account); business
details (individual, Stars Decoded, mystarsdecoded.com, what we sell); Public details (support
email, Terms, Privacy and Refunds URLs, descriptor `MYSTARSDECODED`); Branding (icon, logo,
indigo) for receipts and the Portal; receipts for payments and refunds on; two-step sign-in;
payment method domains for Apple Pay; the postal address (MB-115); the VAT position (MB-114);
Clerk's production instance and the new `ADMIN_USER_ID`; at launch the live restricted key,
publishable key and webhook destination on Railway production.

## Research
Two researcher passes 2026-10-04. docs.stripe.com, stripe.com and clerk.com were blocked by this
session's network policy, so the verifier could not re-fetch them; claims rest on Stripe's SDK
source and changelog on GitHub, the clerk-docs source repo, and the Stripe plugin's best-practice
guide. The round's first card re-checks each Stripe fact (lookup keys, Coupons on `elements`
sessions included) in Stripe's docs before code.

## Decisions recorded (ADR-274 to 282, in this order)
1. **Our own checkout page** on a Checkout Session in `elements` mode, styled from our tokens, with
   our own required tick stored on the purchase (supersedes the terms-box part of ADR-143).
2. **The webhook alone grants**, once per session, and refunds and disputes take back unused credits;
   credits hard on every host (closes MB-6, MB-57 for good).
3. **The free test checkout is deleted**; staging pays in Stripe's sandbox, testers get admin grants
   on both hosts, excluded from revenue (supersedes ADR-138).
4. **Four products saved in Stripe** by a sync from the catalogue, found by lookup key; Timeline
   is the fourth, with its Portal and a mirrored `subscriptions` table that is Timeline's second
   access source, no switch (ADR-262, 264; supersedes MB-119's `price_data`).
5. **Campaigns from the admin**, stored per environment, sent to Stripe as coupons, by date or
   link, under ADR-146's rules (amends ADR-146's home in the catalogue).
6. **Automatic QA on staging** (extends ADR-272, 273): a server-made QA pair, signed in with Clerk
   Testing Tokens on Railway, walked after every deploy with the payment steps, verdict at `/api/qa/latest`.
7. **Every Stripe key on Railway** (restricted secret key, publishable key served by the API,
   webhook secret), none on Vercel or GitHub.
8. **Campaign rules**: 25% at most, one per product, never Single, Couple and Family alone or
   together; Timeline out for now.
9. **Order**: R16 Timeline, then payments, then a round of fixes.
