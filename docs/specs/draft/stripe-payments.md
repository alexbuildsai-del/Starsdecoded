# Stripe payments

Ideation 2026-10-04 with the Owner ("ok lets work on the stripe integration"; "subscription and
also branded checkout pls"; testers get free credits and the full flow; a second QA account for
invite and claim). Artifact: https://claude.ai/artifact/Yamws6GPDB5jKvdk8U8rp2. Status: **draft**.

Builds on `pricing-and-launch.md` (locked 2026-09-27, ADR-142 to 149), whose checkout rules stand
except where this draft says it supersedes them; the catalogue as built (Couple €54, ADR-168);
Timeline's Billing section (`timeline.md`, on `claude/youthful-gauss-7snkqd`); MB-115, MB-119, MB-114.

## Where the code stands (audit 2026-10-04)

Built: the catalogue in `packages/commerce`, `LEGAL_IDENTITY` (postal address null), `CHECKOUT_TICK`,
`REFUND_RULES`, the legal pages, `bundles` and `credits` with holds and `refundCredit`, the free test
checkout (`POST /checkout/test`, 403 on production), Copy link when an invite email fails.
Missing: any Stripe code or key; a webhook (production's prelaunch gate would 403 it, and
`express.json` at `app.ts:98` would eat the raw body); credits are soft on every host
(`consumeCredit` fire-and-forget, `holdCredit` lets a gift out with none); no return to the asking
step; no receipt; no refund removal; no purchase or event tables; Stripe absent from the privacy page.

## Scope

### Checkout: our page, Stripe's fields (Q1, recommended B)
- `/checkout` on our origin, in the product's look: the bundle or plan with its price from the
  catalogue, Stripe's Express Checkout (Apple Pay, Google Pay, Link) and Payment Element styled
  through Stripe's Appearance API from our tokens, the one tick, Pay with the amount.
- Backed by a Checkout Session in `ui_mode: "elements"` (the API's name for the old `custom`
  since 2026-03-25.dahlia), amounts as `price_data` from the catalogue (MB-119), no
  `payment_method_types` (dynamic methods from the Dashboard), the account email prefilled.
- **The tick is ours** (supersedes ADR-143's use of Stripe's terms box, not its words): unticked,
  required, `CHECKOUT_TICK` verbatim with a Terms link; `POST /checkout` refuses without it and stores
  the tick's text hash and time on the purchase row; the webhook grants only purchases that carry it.
- Returns to the step that asked (birth form, picker with its pair, Gift a report, the sheet) via a
  `returnTo` kept with the purchase; the return page waits for the credit, then carries on.
- CSP gains Stripe's script, frame and connect hosts (Report-Only today, so nothing breaks first);
  Apple Pay's domain registered for `mystarsdecoded.com` and the staging host.
- `VITE_STRIPE_PUBLISHABLE_KEY` in Vercel (Preview: test, Production: live).

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
  `subscriptions`, a `refunded` credit status, `grant` as a bundle source; drop unused `credit_type`.
- Receipt: Stripe's own receipt for the payment, plus our email through Resend repeating the tick
  and the refund rules (Art. 8(7)), the bundle, the amount and the History link.

### The subscription (Q2): the plumbing now, the sale with Timeline
- Two plans in the catalogue, Timeline monthly €9.99 and yearly €69.99, VAT included, as `price_data`
  with `recurring` (no Dashboard Price objects).
- The same `/checkout` in subscription mode, with the renewal line before Pay ("Renews every month
  at €9.99 until you cancel."); one Stripe Customer per account, created on first purchase.
- `subscriptions` mirrors `customer.subscription.created|updated|deleted`, `invoice.paid` and
  `invoice.payment_failed` (status, plan, period end, cancel at period end).
- Manage and cancel through Stripe's Customer Portal, reached from the account menu (two clicks).
- The yearly plan's credit to give: granted on each `invoice.paid` for the year, taken back if that
  payment is refunded while unspent (Timeline spec).
- Nothing outside the admin and testers can start a plan until `TIMELINE` is on; launch sells the
  two reports. Timeline's offer screen, Your week and Ask stay in Timeline's round.

### Testers and the full flow
- Admin **Testers** view (staging and production): add an account by email, mark it a tester, grant
  1, 3 or 5 credits (source `grant`, `is_test`, History "+3 · from Stars Decoded"), remove.
  Granted credits never count as revenue or in the loop study.
- Staging: every Get credits runs the real checkout on Stripe's sandbox (card `4242 4242 4242 4242`);
  webhook, receipt, refund and subscription all real in sandbox.
- **The free test checkout is deleted** (supersedes ADR-138): the sandbox and the grant replace it.
- Production: real money; testers get credits by grant; Alex refunds from Stripe to test refunds.
- **QA sign-in**: on staging, the QA agent signs in through Clerk Testing Tokens (`@clerk/testing`,
  run on Railway where `CLERK_SECRET_KEY` lives); "Create QA pair" makes `qa-a+clerk_test@…` and
  `qa-b+clerk_test@…` with `createUser`, marks them testers and grants credits; a new persona walks
  Send, Gift and claim between them and one sandbox purchase.

### Keys (no secret on GitHub, ever)
- `STRIPE_SECRET_KEY` as a restricted key (`rk_test_` on Railway staging, `rk_live_` on production),
  `STRIPE_WEBHOOK_SECRET` per endpoint on Railway; the publishable key in Vercel. The sandbox keys the
  Owner placed in GitHub environment secrets are deleted there; no workflow reads them.
- `api/src/lib/stripe.ts` the one seam: one `Stripe` client instance, the SDK's pinned API version.

## Out of scope
- Timeline itself, offers beyond ADR-146 as locked, a custom Checkout domain, Managed Payments
  (Stripe as seller of record: 3.5% plus fees, eligibility for a Belgian individual unconfirmed),
  coupons, a second currency, invoices for businesses, `LAUNCHED = true` (a Release after this ships).
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
7. A monthly and a yearly plan can be started in sandbox by a tester, renewed with Stripe's test
   clock, cancelled in the Portal; `subscriptions` follows each step; a non-tester cannot start one.
8. The QA agent signs in as the QA pair on staging and completes Send, Gift, claim and one purchase.
9. No Stripe key in the repo or GitHub; `pnpm check:shipped`, gitleaks, typecheck, both builds,
   tests, codegen, `db:bootstrap` clean twice, the sentinel, preview checks and smoke all green.

## Screens
In the artifact: the three checkout options at 390 px (B recommended), the purchase flow, the
subscription, the Testers view, staging against production, the second QA account, the keys.

## Second test account, by hand (works today on staging)
1. Private window, staging, sign up as `alexbuildsai+clerk_test@gmail.com`; code `424242` (Clerk
   Development instance test mode); Gmail still delivers invites for it to the Owner's inbox.
2. As the Owner: take a bundle, Send or Gift a report to that address exactly.
3. Open the email's link in the private window, or Copy link from the dialog; claim.
4. Both dashboards show the result; a different address shows the mismatch message.

## Open questions (artifact, each with a default)
1. The checkout's look: A hosted and branded, **B our page with Stripe's fields**, C embedded.
   Default B.
2. The subscription: **plumbing, plans and Portal now, sold with Timeline**. Default as recommended.
3. Order: **payments is the next round**, Timeline after it, its plan re-read. Default payments next.

## The Owner supplies
Move the sandbox keys to Railway staging (a restricted key and the webhook secret; runbook K); in
Stripe Public details the Terms and Privacy URLs and descriptor `MYSTARSDECODED`; the postal
address (MB-115); the VAT position (MB-114); live keys at the launching Release.

## Research
Two researcher passes 2026-10-04. docs.stripe.com, stripe.com and clerk.com were blocked by this
session's network policy, so the verifier could not re-fetch them; claims rest on Stripe's SDK
source and changelog on GitHub, the clerk-docs source repo, and the Stripe plugin's best-practice
guide. The round's first card re-checks each Stripe fact in Stripe's docs before code.

## Decisions to record
1. **Our own checkout page** on a Checkout Session in `elements` mode, styled from our tokens, with
   our own required tick stored on the purchase (supersedes the terms-box part of ADR-143).
2. **The webhook alone grants**, once per session, and refunds and disputes take back unused credits;
   credits hard on every host (closes MB-6, MB-57 for good).
3. **The free test checkout is deleted**; staging pays in Stripe's sandbox, testers get admin grants
   on both hosts, excluded from revenue (supersedes ADR-138).
4. **Subscription plumbing ships with payments**, Timeline's two plans, the Portal, a mirrored
   `subscriptions` table; sold only when `TIMELINE` is on.
5. **QA signs in on staging** with Clerk Testing Tokens as a server-made QA pair.
6. **Restricted Stripe keys on Railway, publishable key on Vercel, none on GitHub.**
7. **Order**: payments is the next round, Timeline after it (pending Q3).
