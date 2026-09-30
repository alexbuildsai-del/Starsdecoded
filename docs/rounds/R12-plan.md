> **Deferred.** Written as R11 on 2026-09-27 and 28; the Owner deferred it on 2026-09-30 behind the website, which is now R11 (`docs/rounds/R11-plan.md`).
> Its card ids (R11-01 to R11-26), and anything the new R11 absorbs, get re-planned at its own /plan as R12; the body below is unchanged.

# R11 plan — Pricing and launch: one catalogue, Stripe behind a seam, one seller, double opt-in, the Launch view

Planned 2026-09-28 on `claude/compassionate-clarke-l16qww` (`main` at 8a48534, R10's merge, plus the lock at 106b6f0) for the
locked spec `pricing-and-launch` (ADR-142 to 149, locked 2026-09-27; artifact https://claude.ai/artifact/LsBoAa2WbJJURqWgvpgb31).
No QA report exists; no Owner comment sits on the Mailbox or Decisions rows the spec touches. **The Owner, 2026-09-27:
"Continue without this for now."** His legal name, postal address, country, contact address and the Stripe and Revolut
accounts are not supplied, so this round builds everything that needs none of them: the seller as one constant with marked
placeholders (MB-115), Stripe behind a seam tested with fake keys, and the rest of the spec. **Tags:** every card is
USER-FACING except R11-01 to 04, 06, 07, 11, 12, 25 and 26 (INTERNAL). **The brain is untouched**: no file under
`api/src/prompts/`, `models.ts`, `aiInterpretation.ts`, `traditional.ts` or `chartCalculation.ts` changes, so no dry lab runs
and no report's words change (R-5.5 not triggered). **The schema changes** (R11-01). **One new dependency**: `stripe` 22.6.2
in `api` (R11-07). **No credential is needed to build**, nothing goes on GitHub, and **nothing reaches production in the round**.

## Mailbox rows above 2 rounds open after this plan's increment
At **10**: MB-12, 13, 15, 17, 19, 20, 21, 22, 23, 24, 30 · at **9**: MB-33, 35 · at **7**: MB-43, 47, 49, 50 · at **6**: MB-55, 58,
59 · at **5**: MB-64, 65, 66, 67 · at **4**: MB-70, 73, 74, 75 · at **3**: MB-77, 78, 79, 80, 87, 89. All 54 carried-over open rows
were incremented; MB-25 ("No launch plan") was marked decided instead, since ADR-147 is that plan. None blocks a card.
**MB-115** (blocking, raised for this round) gates the production waitlist and checkout, not the build. **MB-75**
(`GITHUB_RELEASE_TOKEN` on Railway staging) stays the todo for the first release. MB-115 to 118 were raised on 2026-09-27 by an
earlier session planning this round, whose plan file was never committed; this plan re-read them, keeps them, and points
their card references here. Raised today: **MB-119** and **MB-120** (Questions raised, below).

## Sequencing: pricing-and-launch is R11, the landing becomes R12
`landing-and-ai-search` is outlined as R11 at the end of `docs/rounds/R10-plan.md`, and CLAUDE.md names it as next. This plan
puts pricing-and-launch first, alone, as **R11**, and the landing becomes **R12** with its scope unchanged.
1. **Launch order.** Phase 0 is about four weeks of warm-up on a production waitlist (ADR-147). It cannot start until the
   waitlist has double opt-in and a privacy page naming its controller (ADR-145), and both are in this spec, not the landing.
   Launch itself needs checkout on production (ADR-138, 141), also here. The landing reaches nobody on production before
   `LAUNCHED` (ADR-141), so it can be built during the warm-up and delays nothing; built first, it would push the warm-up's
   start back a round.
2. **File overlap.** The landing's pricing slot and JSON-LD Offer need the catalogue (landing scope 11, 20). Built first, the
   landing ships a parked slot and a Product without Offer (R10's reading 14) and R12 would reopen those files; after this
   round it reads a finished catalogue. The overlap the other way is two strings in `LandingPage.tsx`, which R12 rewrites
   anyway. Both specs touch `BirthFormPage.tsx` (here the zero state, the return from checkout and Not now; there the place
   field it extracts): in separate rounds they never collide.
3. **Size.** Twenty-six cards here and about eighteen for the landing: together more than R05's thirty-two, which took two
   context compactions, and past the forty at which R10's planner split for that reason.
4. **The Owner's inputs.** This round's (the seller's details, the Stripe account, Resend's domain) gate production; the
   landing's (MB-90, 101, 102) gate only /sample and search registration. Building the seams now lets the Owner supply the
   details while R12 is built.

## Round start (the orchestrator)
1. The round runs on this branch, as R10 ran on its session branch. `git diff --stat main...HEAD` lists only `MASTERFILE.md`,
   `docs/INDEX.md`, the locked spec and this plan, so nothing needs merging and typecheck is unaffected; the round's pull
   request brings the lock and the plan to `main`.
2. Nothing else precedes group A.

## What already shipped (checked on this branch at 106b6f0)
- **Met, and reused:** one credit per report and bundles as counts 1, 3, 5 (`BUNDLE_DEFINITIONS`, ADR-42); `grantBundle` with
  `is_test`, History, holds (R10-10); the free test checkout, 403 on production (R10-20); the zero states and Get credits in
  the picker, the gift flow, Add someone, the pill and the orbit (R10); `refundCredit` on every failure (`failReport`, ADR-84);
  the waitlist with source, medium and campaign tags, one row per address, the admin list and its CSV (#70, ADR-141);
  `LAUNCHED` in `packages/launch` and the prelaunch gate; the birth form's typed price, gone in R10-18; `users.email` from
  Clerk; the four legal pages as drafts under a banner (R01, R10-05).
- **Not met:** no Stripe code or dependency; `consumeCredit` and `holdCredit` pass with no credit, and POST /reports writes for
  an anonymous session; `BUNDLES` and the path title in `credits-view.ts` carry credit-loop's names; two "€24" in
  `LandingPage.tsx`; no catalogue and no offers; bracketed placeholders typed into four legal pages, "Company details", a
  Refunds page promising a regeneration; single opt-in (MB-106's seam in `web/src/lib/waitlist.ts`) and no `utm_content`; a
  gift claim opens the dashboard (ADR-139); no Launch view, no question, no attribution; Inter and Space Grotesk from Google's
  CDN; POST /reports/:id/regenerate rewrites any report for free.

## Where the specs disagree, and how this plan settles it
1. **ADR-142 puts the catalogue in `api/src/` holding a Stripe price id**, while the web cannot import `api/` (MB-108), and a
   price id belongs to one Stripe mode and is a second home for the amount (R-6.3). → Readings 2 and 3: the file stays in
   `api/src/lib/`, the web reads prices through the contract, Stripe gets `price_data` (MB-119, provisional).
2. **credit-loop's bundle names and the path title** → ADR-142's names, read from the catalogue; the path is titled by the
   bundle bought (R11-14).
3. **ADR-139's gift landing (the dashboard)** → ADR-149's birth form, read as only for a claimer with no chart of their own
   (reading 13).
4. **The waitlist as shipped (#70)**: single opt-in, "We keep it until we have sent that email" → ADR-145's double opt-in, a
   new consent key, and unconfirmed addresses deleted after seven days (reading 11).
5. **ADR-146's "the waitlist's first seven days"** with the opening email sent over two weeks (ADR-147, phase 2): a window
   counted from launch gives the last batch nothing → seven days from each email, carried by its link (reading 10).
6. **R-6.1: a second birth-time update consumes a credit**, which nothing has ever charged → left free this round (MB-120).
7. **MASTERFILE §3: "the typed columns go with the payments round"** → `credits.credit_type` drops in step 1, before `push`
   (R11-01).
8. **ADR-140 (writing needs an account)** is enforced only in the web; POST /reports still writes for an anonymous session →
   the API refuses it (reading 7).
9. **The Refunds draft's "we will regenerate it or refund it"** and the Terms' "A purchase grants one report" → ADR-143's
   three rules and bundles of credits (R11-17).
10. **The landing's parked pricing slot** ("The price will come from one constant", scope 11) and R10's "Product without
    Offer" → the catalogue exists after this round; R12 reads it (MB-119 says how).
11. **CLAUDE.md names the landing as R11** → this plan takes R11 (Sequencing); the orchestrator rewrites the focus at close.
12. **"Nothing else in the dashboard shows money"** (ADR-142) against the line that greets a buyer back → that line names
    credits, never an amount (R11-15).

## Goals
1. **Every price from one catalogue** (ADR-142, 146; R-6.3, 6.7): Single, Couple and Family & friends with their lines and
   prices on the credits sheet, dated offers on the two larger bundles only with the end date printed once, the path titled
   by the bundle, and no literal price left in `web/` or `api/`.
2. **Get credits pays through Stripe, behind a seam** (ADR-143; R-6.1, 6.2, 6.6): Checkout with the one tick and back to the
   step that asked; the webhook grants once and only with the tick, the receipt repeats it, a refund takes back what is
   unspent; credits hard on every host; off production the free test checkout stays; production without live keys or a
   complete seller refuses clearly and grants nothing.
3. **One seller, one privacy story** (ADR-144, 145): `LEGAL_IDENTITY` read by Terms, Privacy, Refunds and Who runs Stars
   Decoded, its placeholders marked and the draft banner kept until MB-115; the privacy page as ADR-145 states it; no font
   from Google's CDN.
4. **The waitlist ready for phases 0 and 2** (ADR-141, 145 to 147): double opt-in with `utm_content`, the tags carried into
   the account made in the same browser (MB-117), the opening email in batches of 100 carrying the waitlist's offer, each
   address deleted once sent.
5. **The loop measured, its leak closed** (ADR-148, 149): the admin Launch view reads the five measures and the gate from our
   own tables, "Where did you hear about us?" asks once after a first purchase, and a gift claim opens the birth form.

## Preconditions
1. The round runs on this branch (Round start); no builder starts before this plan's commit is pushed.
2. Builders read MASTERFILE §0, their card, and the spec sections and pinned shapes it names. They cannot open claude.ai
   (403): the orchestrator hands R11-14 the artifact's priced credits sheet and path, and R11-25 its launch and loop-study
   screens, as local copies. Without them builders follow the spec text and the shapes, and the round report lists what
   differs.
3. **Single owners.** Group A: `packages/db/**` and `scripts/bootstrap-db.sh` → R11-01; `packages/api-spec/**` and the
   generated client and zod → R11-02; `catalogue.ts`, `offerLink.ts` → R11-03; `packages/commerce/**`, `packages/launch/**`,
   the three `tsconfig.json` references, `web/package.json`, `api/package.json`, `pnpm-lock.yaml` → R11-04; `LandingPage.tsx`
   → R11-05; `index.css`, `index.html` and the font files → R11-06. Groups B and C: each card's files as listed, no file in two
   cards of one group. `api/package.json` and the lockfile are R11-07's in B and R11-26's in D; `credits-view.ts` is R11-14's
   in B and R11-24's in C; `api/src/routes/index.ts` → R11-12; `api/src/app.ts` → R11-21; `web/src/App.tsx` → R11-25.
4. Inside a group a card may land before one it imports from (pinned signatures): the orchestrator accepts a red intermediate
   until the group ends, and every group ends green. A builder who needs a pinned shape changed stops (R-0.1).
5. **No card spends or reaches a network.** Nothing generates; Stripe is faked (keys like `sk_test_fake`, a fake `whsec_`
   secret, the SDK's offline signature helpers); mail goes to a stub; the walks run on a scratch Postgres.
6. **No secret in the repo.** Stripe keys go only into Railway, by runbook K (R11-07); `.env.example` names without values.
7. Code cites ADR-142 to 149 where it follows them. Provisional seams: `// MB-112 provisional` (Couple's name), `MB-115` (the
   seller), `MB-116` (analytics), `MB-117` (the tags in the browser), `MB-118` (the two computed windows), `MB-119`
   (`price_data`), `MB-33` (unconfirmed regions). No `MB-6` or `MB-106` tag remains anywhere; the walk's `MB-49` note retires
   with the soft pass.

## Readings pinned where the spec is silent
1. **Order**: R11 is pricing-and-launch, R12 the landing (Sequencing).
2. **The catalogue stays where ADR-142 puts it**, `api/src/lib/catalogue.ts`, read directly by checkout, the webhook and the
   receipt. The web reads prices only through `GET /checkout/options` (R-7.1), which prices at the server's clock and applies
   a verified offer link, so what the sheet shows is what Stripe charges. Bundle ids stay `solo`, `couple`, `family`
   (`bundles.bundle_kind`; no data moves); names and lines are ADR-142's. How R12's prerender reads it: MB-119.
3. **Stripe gets the amount as `price_data`** built from the row: EUR, the row's cents, the name "{Bundle} · {N} credits". The
   Owner creates no product or price in Stripe (MB-119, provisional).
4. **Which checkout a host offers.** Production: Stripe only with a live secret key (`sk_live_` or `rk_live_`),
   `STRIPE_WEBHOOK_SECRET` and `sellerComplete()`; otherwise `closed`: POST /checkout answers 503 with one reason line, the
   sheet shows the prices and that line, and nothing is granted. Staging and development: Stripe test mode when a test key and
   the webhook secret are set, else the free test checkout, which stays available there either way and is refused on
   production (ADR-138).
5. **Grants.** Only the webhook grants a paid bundle (ADR-143). Each Stripe event is recorded by id, so a replay does nothing;
   a bundle is unique per checkout session; a grant needs `payment_status: paid`, `consent.terms_of_service: accepted`, a
   livemode matching the host (production live, elsewhere test) and metadata naming a catalogue row. A Stripe test-mode bundle
   is `is_test`, like the free test checkout's.
6. **A refund takes back what is unspent.** On `charge.refunded`, from the charge's cumulative refunded amount: credits due =
   floor(refunded × credits ÷ paid + 0.01), capped at the bundle's credits; the difference from those already taken comes from
   the bundle's available credits, marked `refunded`. Used and held credits stay (a waiting gift keeps its credit); a
   shortfall is logged and counted in the Launch view. So refunding a credit's price removes a credit, and a goodwill refund
   under one credit's price removes nothing (ADR-143's third rule).
7. **Credits are hard on every host** (ADR-143 deletes the soft pass; ADR-138 already enforces credits off production).
   Writing needs sign-in (ADR-140) and a credit taken in the same transaction as the report row; otherwise 401 or 402
   `no_credit`. Regenerate: an earlier-version report (MB-45) is free, its credit already spent; a failed report takes a
   credit, since its own came back (ADR-84); anything else answers 409 (R-6.1: no other regeneration). The retired POST
   /synastry answers 410. A gift with no credit to hold is refused. A second birth-time update stays free (MB-120).
8. **The receipt is ours**, sent through Resend by the webhook after a new grant, to the email the buyer gave Stripe: bundle,
   credits, amount with "VAT included", date, the tick verbatim ("When you paid, you agreed: …"), the three refund rules, the
   seller from `LEGAL_IDENTITY`, the statement descriptor. Stripe's own receipts are switched off in its dashboard (runbook K)
   so a buyer gets one. A failed send is logged and leaves the bundle's `receipt_sent_at` empty.
9. **Leaving and coming back.** `returnTo` is a path under `/chart` or `/dashboard`; success URL = `PUBLIC_APP_URL` +
   `returnTo` + `checkout={CHECKOUT_SESSION_ID}`, cancel URL the same with `checkout=cancelled`. What the step held rides the
   tab: `sessionStorage` `sd.form.draft` (the birth form) and `sd.gift.draft` (the gift), each deleted once used; the picker's
   pair is already remembered (ADR-105). The return polls our own tables, never Stripe.
10. **Offers.** Windows are whole UTC days, from the start of the first to the end of the last; the sheet prints the last day
    once ("until 14 February") and never counts down. The waitlist's offer lives in its link, `wl1.{expiry}.{HMAC-SHA256}` keyed
    from `INVITE_TOKEN_SECRET`, seven days from each opening email (ADR-146's "first seven days", per recipient, so a later
    batch loses nothing); the web keeps it in `localStorage` `sd.offer` until it expires or a purchase uses it (no personal
    data, MB-43's rule). At most one offer per purchase: the lowest that applies, a tie to the dated window. Mother's and
    Father's Day follow MB-118's default.
11. **Double opt-in.** A 32-byte token, only its SHA-256 stored; the link lives seven days and an unconfirmed address is
    deleted after seven; a join always answers the same, so nobody learns who is listed; a new link at most once per ten
    minutes per address; rows joined under `launch-email-v1` count as confirmed (staging only; production has none).
12. **The opening email** goes to confirmed addresses only, 100 per press, each address deleted once Resend accepts its email
    (ADR-141, 145); the batch is logged as a count and a time, no address; it is refused on production before launch.
13. **A gift claim's form** (ADR-149) opens only for a claimer with no chart of their own (no self profile with a natal report
    that has not failed); otherwise the claim lands on the dashboard with the credit, as before. The form opens for them
    (`self=1`) with Not now.
14. **Who runs Stars Decoded** keeps the `/company` route (the waitlist and the legal nav link to it); its title and nav label
    change, words through `/ux-copy`.
15. **The loop study** (ADR-148). A customer has a non-test bundle with a Stripe session; their first purchase is the earliest.
    M1: of customers whose first purchase is 14 or more days old, those who made a send or a gift within 14 days of it. M2: of
    sends and gifts made by customers 7 or more days ago, those claimed within 7 days. M3: of people who claimed a send or gift
    30 or more days ago and were not customers before it, those who bought within 30 days of the claim. M4: of the first 100
    customers, those who had claimed a send or gift before their first purchase. M5: of paid bundles, those of 3 or 5 credits.
    Revenue: paid minus refunded cents. Refund rate: paid bundles with any refund over paid bundles. The gate (ADR-147): the
    100th customer within 84 days of `LAUNCH_DATE`, cash over customers at €10 or less, refund rate at 5% or less, and at least
    15% of all customers counted as M4 counts them.
16. **The question** asks once, after the buyer's first bundle with a Stripe session (test mode included, so staging can show
    it): Instagram, TikTok, A friend or a gift, Search, An AI assistant, Somewhere else, and Skip. No free text.
17. **The draft banner** shows while `sellerPlaceholders()` is not empty or a processor's region is unconfirmed; "Draft dated"
    becomes "Updated" once neither holds. Production refuses checkout by code while the seller is incomplete (reading 4).
18. **Browser storage this round adds**, each functional (MB-43's rule) and named on the privacy page: `localStorage`
    `sd.waitlist.tags` (MB-117) and `sd.offer`; `sessionStorage` `sd.form.draft` and `sd.gift.draft`, the tab's own fields,
    gone when used or when the tab closes.
19. **Analytics ship dark** (MB-116's default): `track` and `pageview` do nothing, and the privacy page names no analytics.
20. **Copy** no spec gives passes `/ux-copy` and layouts pass `/web-taste` (§9, ADR-117); each builder lists its new strings
    in its report, for the Owner's look (as MB-111 did for R10).

## Pinned shapes
- **Schema** (R11-01), every new column nullable unless given a default. `waitlist_signups` + `utm_content`, `confirmed_at`,
  `confirm_token_hash` (unique index), `confirm_sent_at`. New `waitlist_sends { id text PK; count integer NOT NULL; sent_at
  timestamp NOT NULL DEFAULT now() }`. `bundles` + `stripe_session_id` (unique index), `stripe_payment_intent` (index),
  `amount_cents integer`, `currency text`, `offer_id text`, `receipt_sent_at timestamp`, `refunded_credits integer NOT NULL
  DEFAULT 0`, `refunded_cents integer NOT NULL DEFAULT 0`. New `stripe_events { id text PK (evt_…); type text NOT NULL;
  livemode boolean NOT NULL; session_id text; user_id text; outcome text NOT NULL; received_at timestamp NOT NULL DEFAULT
  now() }`. `users` + `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `attributed_at`, `heard_from`,
  `heard_from_at`. New `launch_entries { id text PK; kind text NOT NULL (cash | hours); amount integer NOT NULL (cents |
  minutes); note text; entered_on date NOT NULL; created_at timestamp NOT NULL DEFAULT now() }`. `CREDIT_STATUSES` gains
  `refunded` (no DDL). `credits.credit_type` is dropped.
- **Contract** (R11-02; operationIds in brackets). `BundleId` = solo | couple | family. `CatalogueBundle { id; name; line;
  credits; cents; priceLabel; fullPriceLabel: string | null; offerEndsOn: date | null }`. `CheckoutOptions { mode: stripe |
  test | closed; testAvailable: boolean; reason: string | null; bundles: CatalogueBundle[] }`, `GET /checkout/options`
  `?offer` [getCheckoutOptions]. `StartCheckoutBody { bundle: BundleId; returnTo (≤ 200); offer? (≤ 200) }` → 201
  `CheckoutStarted { url }`, 400, 401, 429, 503 [startCheckout]. `CheckoutSessionState { status: pending | granted | refused;
  credits: CreditCounts | null; firstPaid: boolean }`, `GET /checkout/sessions/{id}` → 200 or 404 [getCheckoutSession].
  `CreditHistoryItem.kind` + `refunded`. 402 `no_credit` added to createReport, createCompatibilityReport, createGift and
  regenerateReport; 409 `not_regenerable` to regenerateReport; 410 to createSynastryReport. `JoinWaitlistBody` + `utmContent?`
  (≤ 100), `consent` + `launch-email-v2`; `WaitlistJoined.status` + `check_email`. `POST /waitlist/confirm`
  `ConfirmWaitlistBody { token (≤ 100) }` → 200 `{ status: confirmed }` or 404 [confirmWaitlist]. `POST /me/attribution`
  `{ utmSource?, utmMedium?, utmCampaign?, utmContent? }` (each ≤ 100) → 204 or 401 [recordAttribution]. `POST /me/heard-from`
  `{ answer: instagram | tiktok | friend | search | ai | other | skip }` → 204 or 401 [answerHeardFrom]. `/admin/*` and the
  Stripe webhook stay out of the spec.
- **Catalogue** (R11-03, `api/src/lib/catalogue.ts`). `CatalogueRow { id: BundleId; name; line; credits: 1 | 3 | 5; cents }`;
  `OfferRow { id: waitlist | december | valentines | mothers-day | fathers-day; bundle: couple | family; cents; window: { kind:
  "dates"; from: "MM-DD"; to: "MM-DD" } | { kind: "sunday"; month: 5 | 6; nth: 2 | 3; days: 14 } | { kind: "link"; days: 7 } }`.
  Rows: `solo` Single "1 credit · one report" 2400; `couple` Couple "3 credits · a report each and how you get along" 4800;
  `family` Family & friends "5 credits · for the people close to you" 7200. Offers: waitlist couple 4000 (link, 7 days);
  december family 6000 (12-01 to 12-24); valentines couple 4000 (02-01 to 02-14); mothers-day family 6000 (the 14 days ending
  on May's second Sunday); fathers-day family 6000 (the 14 days ending on June's third Sunday). `BUNDLES`, `OFFERS`,
  `bundleById`, `bundleByCredits`, `priceFor(id, at, link: { offerId; expiresAt } | null): { cents; fullCents; offerId: string
  | null; endsOn: string | null }`, `offerWindow(offer, year): { start; end } | null`, `formatEuro(cents)` ("€24", "€14.40").
  `api/src/lib/offerLink.ts`: `signOfferLink(offerId, expiresAt, secret)`, `verifyOfferLink(token, secret, now): { offerId;
  expiresAt } | null`, `offerSecret(env)` (derived from `INVITE_TOKEN_SECRET` with the label `offer-link:v1`).
- **The commerce package** (R11-04, `@workspace/commerce`). `SellerIdentity { name; tradingName; postalAddress; country;
  contactEmail; statementDescriptor }`; `LEGAL_IDENTITY` = "[Owner's legal name]", "Stars Decoded", "[Postal or forwarding
  address]", "[Country]", "[Contact address]", "MYSTARSDECODED"; `sellerPlaceholders(identity?): (keyof SellerIdentity)[]`
  (a value in square brackets is a placeholder); `sellerComplete(identity?): boolean`; `CHECKOUT_TICK` = "Write each report as
  soon as I use a credit on it. I understand I can't cancel or get a refund for a credit once it's used."; `REFUND_RULES`, the
  three rules as the Refunds page says them. `@workspace/launch` gains `LAUNCH_DATE: string | null = null`, set in the same
  edit that turns `LAUNCHED` on.
- **The Stripe seam** (R11-07, `api/src/lib/stripe.ts`). `checkoutMode(env?, seller?): { mode: "stripe" | "test" | "closed";
  testAvailable: boolean; reason: string | null }`; `sessionParams({ bundle: CatalogueRow; price: { cents; offerId }; userId;
  email: string | null; returnTo; origin }): Stripe.Checkout.SessionCreateParams`; `interface Payments { createSession(params,
  idempotencyKey): Promise<{ id: string; url: string }> }`; `stripePayments(env?): Payments | null`; `verifyEvent(rawBody:
  Buffer, signature: string, secret: string): Stripe.Event`.
- **Ledger** (R11-08, `api/src/lib/credits.ts`). `grantPaidBundle({ userId; bundle: BundleKind; sessionId; paymentIntent:
  string | null; amountCents; currency; offerId: string | null; test: boolean }, tx?): Promise<{ granted: boolean; bundleId:
  string | null }>`; `creditsDue(refundedCents, amountCents, credits): number` (reading 6, pure); `removeRefundedCredits({
  paymentIntent; refundedCents }): Promise<{ bundleId: string | null; removed: number; short: number }>`; `consumeCredit(userId,
  reportId, tx = db): Promise<boolean>`; `hasUsedCredit(reportId)`; `firstPaidBundleAt(userId): Promise<Date | null>`;
  `markReceiptSent(bundleId)`. `grantBundle(…, { test: true })` stays for the free test checkout.
- **Mailer** (R11-09). `sendReceiptEmail({ to, bundleName, credits, amountLabel, paidAt, dashboardUrl })` (it reads
  `LEGAL_IDENTITY`, `CHECKOUT_TICK` and `REFUND_RULES` itself), `sendWaitlistConfirmEmail({ to, confirmUrl, expiresOn })`,
  `sendOpeningEmail({ to, offerUrl, offerLabel, endsOn })`, each `Promise<boolean>`.
- **Fulfilment** (R11-21, `api/src/lib/fulfilment.ts`). `handleStripeEvent(event, deps: { recordEvent; grant; removeRefunded;
  sendReceipt; appEnv }): Promise<{ outcome: string }>`; outcomes granted | duplicate | refused_consent | refused_unpaid |
  refused_mode | refused_metadata | refund | ignored.
- **The Launch view** (R11-11, `GET /admin/launch`, `?includeTest=1` off production). `{ launchDate; daysSinceLaunch;
  includeTest; customers; revenueCents; cashCents; hoursMinutes; costPerCustomerCents; refunds: { bundles; rate; cents; short };
  measures: { id: m1…m5; label; n; N; share; hypothesis }[]; gate: { reached; criteria: { id; label; value; threshold; met:
  boolean | null }[] }; sources: { source; customers }[]; heardFrom: { answer; count }[]; waitlist: { confirmed; pending;
  openingSent }; receiptsUnsent; entries: { id; kind; amount; note; enteredOn }[] }`; `POST /admin/launch/entries { kind;
  amount; note?; enteredOn }` → 201, `DELETE /admin/launch/entries/:id` → 204.
- **Web.** `CreditsSheet({ open, onClose, returnTo, onAdded?(count), onAddSomeone?, onGift? })` (the `enforced` prop goes);
  `credits-view.ts`: `keepOfferFromUrl(search, store?)`, `storedOffer(store?, now?)`, `dropOffer(store?)`;
  `useCheckoutReturn(): { state: idle | adding | added | late | refused | cancelled; balance: number | null; firstPaid: boolean
  }`; `CheckoutReturn({ onAdded?(balance) })`; `HeardFromSheet({ open, onClose })`; `attribution.ts`: `saveWaitlistTags(tags,
  now?, store?)`, `takeWaitlistTags(now?, store?)`, `useAttributionHandoff()`; `analytics.ts`: `track(name: "waitlist_joined" |
  "checkout_started" | "checkout_returned", props?)`, `pageview(path)`; `AdminNav({ current })`.

## Parallel groups
**Group A**, one message: R11-01 to R11-06, no dependencies. **Group B**, one message once A is green (it reads the new
columns, the generated client, the catalogue and the package): R11-07 to R11-18; inside it R11-10 calls R11-09's mailer and
R11-12 mounts R11-11's router, on pinned signatures. **Group C**, one message once B is green (it composes B's pieces): R11-19
to R11-25. **Group D**: R11-26. Then the gate. **If R11 must shrink**, R11-11, R11-22 and R11-25's Launch page move to R12
(the Launch view and the opening email are needed from launch week, which follows R12), R11-12 mounts `me` alone, and R11-25
keeps only its `App.tsx` wiring; checkout, the ledger, the legal pages and the waitlist's opt-in stay, since production waits
for them.

---

## Group A — the columns, the contract, the catalogue, the package, no typed price, the fonts

### R11-01 — The columns for payments, the waitlist and the Launch view (INTERNAL) · Opus
Objective: every column and table this round reads, added before `push` so no deploy ever meets a prompt.
Files: `packages/db/src/schema/credits.ts`, `waitlist.ts`, `users.ts`, `index.ts`, new `stripeEvents.ts`, new `launch.ts`; new
`packages/db/scripts/migrate-add-payments-and-launch.ts`; `packages/db/package.json` (`migrate` runs it last);
`scripts/bootstrap-db.sh` (step 1's comment says why it runs there).
Refs: pinned schema; MASTERFILE R-7.3, §3; ADR-143, 145, 148; MB-57 (decided); readings 5, 11, 15.
Done when:
- The pinned columns, tables and indexes exist in drizzle and in the script. The script runs in step 1, before `push` would
  prompt on the dropped column or a unique index; it skips a table that does not exist yet (an empty database gets
  everything from `push`), drops `credits.credit_type` with `IF EXISTS`, marks `launch-email-v1` rows confirmed at their
  `created_at`, and is idempotent; `CREDIT_STATUSES` gains `refunded`.
- On a scratch Postgres 16 with a dummy `OPENAI_API_KEY` (MB-80): `db:bootstrap` from `main`'s tree (a worktree), then this
  branch's twice (the upgrade staging and production take), then an empty database three times; every run clean, step 2
  applying nothing after step 1; `packages/db` tests green.

### R11-02 — The contract and codegen (INTERNAL) · Opus
Objective: every shape checkout, the waitlist's confirmation, attribution and the question need, in `openapi.yaml`, with the
client and zod regenerated.
Files: `packages/api-spec/openapi.yaml`; `packages/api-client-react/src/generated/**`, `packages/api-zod/src/generated/**`
(codegen only).
Refs: pinned contract; MASTERFILE R-7.2; ADR-142, 143, 145, 148; MB-117, 119; readings 4, 7, 9, 16.
Done when:
- Every pinned schema, path, response and operationId is in the spec with a one-line description naming its ADR (and its MB
  where provisional); every change is additive (an enum gains a value, a field or response is optional or new), so no other
  file breaks; `/admin/*` and the Stripe webhook stay out.
- `pnpm --filter @workspace/api-spec run codegen`, then typecheck green with no other file changed; a second codegen leaves
  no diff.

### R11-03 — The price catalogue and the offer link (INTERNAL) · Opus — provisional MB-112, MB-118, MB-119
Objective: one file holds every bundle, price and dated offer (ADR-142), and a signed link carries the waitlist's offer.
Files: new `api/src/lib/catalogue.ts` (+ `catalogue.test.ts`), new `api/src/lib/offerLink.ts` (+ `offerLink.test.ts`).
Refs: spec Bundles and prices, Offers, acceptance 1, 7; ADR-142, 146; R-6.3, 6.7; MB-112, 118, 119; readings 2, 3, 10; pinned
catalogue.
Done when:
- The three rows and five offers as pinned (Couple's name tagged `// MB-112 provisional`); `priceFor` gives one price and at
  most one offer, the lowest that applies, a tie to the dated window; `formatEuro` prints "€24" and "€14.40".
- Tests: Single is never discounted; every offer is at least 75% of its bundle's price; no two dated windows overlap in any
  year from 2026 to 2032, Mother's and Father's Day computed (`// MB-118 provisional`); a window opens and closes on UTC
  midnights; the waitlist price needs a valid link before its expiry, and a tampered or expired link prices in full.

### R11-04 — The commerce package: one seller, the tick, the refund rules (INTERNAL) · Sonnet — provisional MB-115
Objective: the seller's identity, the tick's words and the three refund rules in one package the web and the API both
import, and the launch date beside the launch switch.
Files: new `packages/commerce/` (`package.json`, `tsconfig.json`, `src/index.ts`, `src/seller.ts`, `src/terms.ts`,
`src/seller.test.ts`); `packages/launch/src/index.ts`; `tsconfig.json`, `web/tsconfig.json`, `api/tsconfig.json`
(references); `web/package.json`, `api/package.json`, `pnpm-lock.yaml`.
Refs: spec Sold by Alex, Checkout (the tick, refunds), acceptance 4; ADR-141, 143, 144; MB-115; pinned package.
Done when:
- `LEGAL_IDENTITY` holds the pinned values, its four unknown fields as bracketed placeholders under `// MB-115 provisional`;
  `sellerPlaceholders()` names each field still bracketed and `sellerComplete()` is false while any is; `CHECKOUT_TICK` is
  the locked sentence byte for byte; `REFUND_RULES` holds the three rules; `LAUNCH_DATE` is `null` with a why-comment.
- Web and API typecheck against `@workspace/commerce` (as they do `@workspace/launch`); `pnpm install --frozen-lockfile` passes
  on the new lockfile; the package's tests run under the root test command.

### R11-05 — No typed price anywhere (USER-FACING) · Sonnet
Objective: the landing's two "€24" go, and a test keeps every price in the catalogue (R-6.3).
Files: `web/src/pages/LandingPage.tsx`; new `api/src/lib/priceGate.test.ts`.
Refs: spec acceptance 1; ADR-142; R-6.3; landing-and-ai-search scope 11 (the pricing slot arrives in R12).
Done when: "One-time report · €24" and "Generate Your Report · €24" read without a price, their words passing `/ux-copy`, and
nothing else on the page changes (R12 rebuilds it); the gate reads every `.ts` and `.tsx` under `api/src` and `web/src` except
tests, generated code and `api/src/lib/catalogue.ts`, fails on a euro amount (`€24`, `24 €`, `EUR 24`) naming the file and
line, and is green on this branch.

### R11-06 — The last two fonts from our own origin (INTERNAL) · Sonnet
Objective: no page calls Google's font CDN, so the privacy page lists no font host and the no-banner rule holds (ADR-145).
Files: new Inter and Space Grotesk woff2 files in `web/src/assets/fonts/`; `web/src/index.css` (its first three lines);
`web/index.html` (its three font links).
Refs: ADR-145; MB-33, MB-42; §9 (the four families); the Newsreader and IBM Plex Mono `@font-face` rules as the pattern.
Done when: Inter (400 to 700) and Space Grotesk (400 to 600) load from `./assets/fonts/` as variable woff2 (SIL OFL, copied once
from the npm registry's `@fontsource-variable` packages without adding a dependency, the licence named in one comment); no
`fonts.googleapis.com` or `fonts.gstatic.com` remains in `web/`; `build:web` emits the files; the comment over the block no
longer says two fonts still come from the CDN.

---

## Group B — the seam, the ledger, the emails, the waitlist, the study, and the web's pieces

### R11-07 — The Stripe seam (INTERNAL) · Opus — provisional MB-119
Objective: everything Stripe in one module, testable with no keys: the host's checkout, a session's parameters, the signature.
Files: new `api/src/lib/stripe.ts` (+ test); `api/package.json`, `pnpm-lock.yaml` (`stripe` 22.6.2, exact); `.env.example`;
`docs/annex/staging-runbook.md` (part K only).
Refs: spec Checkout, acceptance 2, 3; ADR-138, 143; R-6.2, 6.6, 7.4; MB-119; readings 3, 4, 5, 8, 9; pinned seam.
Done when:
- `checkoutMode` answers reading 4; `sessionParams` builds a payment-mode EUR session from the row as `price_data`, with
  `consent_collection.terms_of_service: "required"`, `custom_text.terms_of_service_acceptance.message` = `CHECKOUT_TICK` and a
  Terms link, the user as `client_reference_id`, metadata (user, bundle, offer, cents) and reading 9's URLs; `verifyEvent`
  wraps the SDK's `webhooks.constructEvent`.
- Tests on fake keys: the mode matrix, the params for each bundle and for an offer, a header from the SDK's
  `generateTestHeaderString` passing and a tampered body failing; no test reaches the network.
- Part K gives the Owner's Stripe steps (Individual account, the descriptor, the Terms URL, Stripe's receipts off, a webhook on
  the Railway host with its three events, test keys on staging, live keys only at launch); `.env.example` names
  `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` without values.

### R11-08 — The ledger: paid bundles, refunds, no soft pass (USER-FACING) · Opus
Objective: a paid bundle lands once per checkout, a refund takes back what is unspent, and no credit is spent that was not there.
Files: `api/src/lib/credits.ts` (+ `credits.test.ts`).
Refs: spec Checkout (refunds), acceptance 2; ADR-42, 84, 123, 143; R-6.1, 6.2, 6.5; MB-6, 57 (decided); readings 5, 6, 7;
pinned ledger.
Done when:
- `grantPaidBundle` writes the bundle and its credits in one transaction, once per Stripe session (the unique index; a repeat
  answers `granted: false`); `removeRefundedCredits` follows reading 6 (cumulative, available credits only, marked
  `refunded`, the shortfall returned); `consumeCredit` takes a transaction and answers false with no credit, `holdCredit`
  null, with no soft-pass branch or `MB-6` tag left.
- `getCredits` never counts a refunded credit; History gains "−N refunded" lines; `hasUsedCredit`, `firstPaidBundleAt` and
  `markReceiptSent` exist.
- Tests: `historyLines` with refunded rows; `creditsDue` for a full refund, a partial one, a second partial, an offer's price,
  a goodwill amount under one credit, and more refunded than is unspent.

### R11-09 — The emails: the receipt, the confirmation, the opening (USER-FACING) · Sonnet
Objective: the receipt repeats the tick and names the seller (Art. 8(7)); the waitlist confirms an address; the opening
email carries the waitlist's offer.
Files: `api/src/lib/mailer.ts` (+ `mailer.test.ts`).
Refs: spec Checkout (the receipt), Privacy (double opt-in), The launch (phase 2); ADR-141, 143 to 147; readings 8, 10 to 12;
pinned mailer and package.
Done when:
- The three pinned senders exist in the shell the other emails use, each `Promise<boolean>`.
- Tests: the receipt holds `CHECKOUT_TICK` verbatim, the bundle's name and credits, the amount with "VAT included", the date,
  the three `REFUND_RULES`, the statement descriptor and every `LEGAL_IDENTITY` field; the confirmation says only what
  confirming does and how long the link lasts; the opening email prints the offer's end date once and no countdown; user
  text is escaped once; every line passes `/ux-copy`.

### R11-10 — The waitlist asks twice (USER-FACING) · Opus
Objective: an address joins only when its owner confirms it, and the list learns which post sent them (ADR-145, 147).
Files: `api/src/routes/waitlist.ts`, `api/src/lib/waitlist.ts` (+ test), `api/src/lib/prelaunch.ts` (+ test).
Refs: spec Privacy (double opt-in), The launch (phase 0 tags), acceptance 5; ADR-141, 145; MB-106 (decided); reading 11;
pinned contract and mailer.
Done when:
- POST /waitlist stores the address unconfirmed with a fresh token's hash and `utm_content`, sends
  `sendWaitlistConfirmEmail` with `{PUBLIC_APP_URL}/waitlist?confirm={token}`, and answers `{ status: "check_email" }` whatever
  the address's state; an unconfirmed address joining again gets a new link at most once in ten minutes; a confirmed one
  gets nothing.
- POST /waitlist/confirm confirms a live token (a repeat answers the same) and 404s an unknown or expired one; unconfirmed
  rows older than seven days are deleted on each call (expiry on read, as gifts do).
- `OPEN_PATHS` admits `/waitlist/confirm` and the gate's comment no longer mentions the soft pass; tests cover the token, the
  throttle, the sweep and the gate.

### R11-11 — The loop study, read from our tables (INTERNAL) · Opus
Objective: the Launch view's numbers as one pure module behind one admin route (ADR-148).
Files: new `api/src/lib/launchStudy.ts` (+ test), new `api/src/routes/adminLaunch.ts`.
Refs: spec The launch (measures), The loop study, acceptance 6; ADR-147, 148; reading 15; pinned Launch view.
Done when:
- `GET /admin/launch` (behind `labGuard`, like the waitlist's) answers the pinned shape: days since `LAUNCH_DATE`, customers,
  revenue net of refunds, cash and hours entered, cost per customer, refunds, the five measures each with n, N, share and
  hypothesis, the gate at 100, customers by `utm_source`, the question's answers, the waitlist's counts, the opening emails
  sent and the receipts unsent; test bundles count only with `includeTest=1`, and only off production.
- POST and DELETE `/admin/launch/entries` add and remove cash (cents) or hours (minutes) with a date and a note.
- Tests: every measure and the gate on synthetic rows (users, bundles, invites; no birth data), at each window's edge (day
  7, 14, 30) and for customers whose window has not closed.

### R11-12 — Where they came from, what they answered (INTERNAL) · Sonnet — provisional MB-117
Objective: the waitlist's tags and the one question land on the account, once each.
Files: new `api/src/routes/me.ts`; `api/src/routes/index.ts` (mounts `me` and R11-11's `adminLaunch`).
Refs: spec Measures; ADR-148; MB-117; readings 15, 16; pinned contract.
Done when: POST /me/attribution (signed in, else 401) stores the four tags only while the account has none (first write
wins, `attributed_at` set), cleaned as the waitlist cleans tags; POST /me/heard-from stores one answer from the enum, or
`skip`, only while `heard_from_at` is empty, and answers 204 either way; both sit behind the prelaunch gate like the rest of
the app; both routers mount.

### R11-13 — The failure lines say the credit is back (USER-FACING) · Sonnet
Objective: every failure line says what happened, what to do, and that the credit is back (MB-91); a retry at zero says so.
Files: `api/src/lib/failureReasons.ts` (+ test), `web/src/components/report/OpeningOverlay.tsx`, `web/src/pages/ReportPage.tsx`
(the retry's error line only).
Refs: MB-91; ADR-84, 143 (the second refund rule); R-4.3; reading 7; `/ux-copy`'s error pattern.
Done when: the four lines follow MB-91's recommendation, each saying "Your credit is back." (`failReport` always refunds) and
`internal` gaining a next step, and pass `/ux-copy`, with a test that each ends on something to do; `OpeningOverlay`'s own
`INTERNAL_LINE` goes and it prints the API's line; a retry answered 402 says no credit is left and points to the credits,
not "try again in a minute". No report's words change.

### R11-14 — The credits sheet: names, lines, prices, and a Get credits that pays (USER-FACING) · Opus — provisional MB-119
Objective: each bundle with its name, line and price; Get credits opens Stripe where the host offers it, the free test
checkout off production, or says plainly that checkout is not open.
Files: `web/src/lib/credits-view.ts` (+ test), `web/src/components/dashboard/CreditsSheet.tsx`, `PathSheet.tsx`.
Refs: spec Bundles and prices, Checkout, Offers, acceptance 1 to 3, 7; ADR-125, 138, 142, 143, 146; readings 2, 4, 9, 10, 20;
pinned web shapes; the artifact's priced sheet and path.
Done when:
- The sheet renders `getCheckoutOptions` with the stored offer link: count, name, line, `priceLabel`; an offer adds the full
  price and "until {date}" once, never a countdown; `BUNDLES` and credit-loop's names leave `credits-view.ts`, which gains
  the three offer-link helpers.
- `stripe` → `startCheckout({ bundle, returnTo, offer })`, `track("checkout_started")`, then the browser goes to its URL (the
  button a status with dots meanwhile); `test` → today's free test checkout under "Credits are free while we test.";
  `stripe` with `testAvailable` → Stripe first, the free line under it; `closed` → prices and the reason line, no button.
- `onAdded(count)` replaces the hard-coded Add someone after a test bundle; the path is titled by the bundle bought, and
  "Your people, then how you fit" is gone; tests for the four modes' labels and the path title.

### R11-15 — Back from checkout, and one question (USER-FACING) · Opus
Objective: the step that asked shows the credits arriving, then asks once where the buyer heard of us (ADR-143, 148).
Files: new `web/src/hooks/useCheckoutReturn.ts` (+ test), new `web/src/components/CheckoutReturn.tsx`, new
`web/src/components/HeardFromSheet.tsx`.
Refs: spec Checkout (the step that asked), Measures (the question); ADR-143, 148; readings 9, 16, 20; pinned web shapes.
Done when:
- `useCheckoutReturn` reads `?checkout=` once, polls `getCheckoutSession` each second for up to 30 seconds, and ends `added`
  (the new balance), `late`, `refused` or `cancelled`, stripping the parameter without a reload; its reducer is pure and
  tested.
- `CheckoutReturn` prints the status above the page's primary control ("Adding your credits" with dots; late: the payment
  went through and the credits follow within a minute; cancelled: nothing was charged; words through `/ux-copy`), names
  credits and never an amount, and calls `onAdded`; after a first paid purchase it opens `HeardFromSheet`.
- `HeardFromSheet`: "Where did you hear about us?", reading 16's answers and Skip, one tap through `answerHeardFrom`, never
  shown twice; `track("checkout_returned")` fires once.

### R11-16 — A gift claim opens the birth form (USER-FACING) · Sonnet
Objective: a claimed gift lands on the form for the recipient's own chart, with Not now to the dashboard (ADR-149).
Files: `web/src/pages/ClaimPage.tsx`, `api/src/routes/invites.ts`.
Refs: spec Challenges 1, acceptance 8; ADR-139, 149; reading 13.
Done when: `claimGift` answers `redirectTo: "/chart?self=1&from=gift"` when the claimer has no chart of their own and
`/dashboard` otherwise; after "Claim my report" the page goes straight there, so the claimed cover's "Go to my dashboard"
screen and its `MB-6` comment go; a send's claim is unchanged; nothing is written until they press Write (ADR-149). The walk's
expectation moves in R11-26.

### R11-17 — The legal pages read one seller (USER-FACING) · Opus — provisional MB-33, MB-115
Objective: the four legal pages read `LEGAL_IDENTITY`, say what ADR-143 to 145 decided, and stay drafts while a placeholder remains.
Files: `web/src/pages/legal/*.tsx` (all five), `web/src/components/DraftBanner.tsx`, new `web/src/lib/processors.ts` (+ test).
Refs: spec Sold by Alex, Privacy until the company, Checkout (refunds), acceptance 4; ADR-139, 143 to 145; MB-33, 115 to 117;
readings 14, 17 to 19.
Done when:
- No page types a bracketed placeholder: every seller detail reads `LEGAL_IDENTITY`; the banner follows reading 17. Who runs
  Stars Decoded: the Owner as a private individual trading as Stars Decoded, address, country, contact, statement descriptor.
  Refunds: exactly `REFUND_RULES`. Terms: the seller, bundles of credits priced before paying, another person's details only
  with their knowledge and a child's only as parent or guardian, accounts 16 and over, the tick's effect, R10-05's section kept.
- Privacy as ADR-145 states it: controller and contact; `processors.ts` (Supabase, Railway, Vercel, OpenAI, Clerk, Resend with
  regions, unconfirmed ones `// MB-33 provisional`; Nominatim and timeapi.io from the browser); Stripe its own controller;
  lawful bases; double opt-in and its retention; rights (export by email within 30 days, the mailbox read weekly, a breach
  reported within 72 hours); necessary cookies only; reading 18's keys; no analytics (MB-116).

### R11-18 — The waitlist page confirms, and the tags wait for the account (USER-FACING) · Sonnet — provisional MB-116, MB-117
Objective: the page asks people to confirm by email and confirms their link; their tags wait in the browser for an account.
Files: `web/src/components/waitlist/WaitlistForm.tsx`, `web/src/pages/WaitlistPage.tsx`, `web/src/lib/waitlist.ts` (+ test), new
`web/src/lib/attribution.ts` (+ test), new `web/src/lib/analytics.ts`.
Refs: spec Privacy (double opt-in), Measures, acceptance 5; ADR-145, 148; MB-116, 117; readings 11, 18, 19; pinned web shapes.
Done when:
- A join shows "Check your inbox" with the address (consent key `launch-email-v2`, its words through `/ux-copy`);
  `/waitlist?confirm=` posts the token on load (a link scanner's GET alone confirms nothing) and shows "You're on the list", or
  a line to join again when the link has expired; `readUtm` reads `utm_content`; the admin types gain `confirmedAt`,
  `utmContent`.
- `attribution.ts` (`// MB-117 provisional`): after a successful join the four tags, never the email, go to `sd.waitlist.tags`
  with a date; `useAttributionHandoff` sends them once through `recordAttribution` when signed in and deletes the key; a key
  older than 180 days is dropped unsent; tests with a fake store.
- `analytics.ts` (`// MB-116 provisional`): `track` and `pageview` do nothing until a provider is chosen; a join calls
  `track("waitlist_joined")`.

---

## Group C — the routes that take credits and money, the webhook, and the pages that ask

### R11-19 — Credits hard at every write (USER-FACING) · Opus — provisional MB-120
Objective: no report is written without a credit taken first, on any host (ADR-143, R-6.1).
Files: `api/src/routes/reports.ts`, `compatibility.ts`, `synastry.ts`, `gifts.ts`.
Refs: spec Checkout ("consumeCredit goes hard"); ADR-42, 84, 140, 143; R-6.1; MB-45, 120; reading 7; pinned ledger.
Done when:
- POST /reports and POST /compatibility answer 401 signed out (ADR-140) and 402 `no_credit` with no credit, inserting the
  report and taking its credit in one transaction before any generation starts; POST /synastry answers 410.
- POST /reports/:id/regenerate: an earlier-version report regenerates free; a failed one takes a credit (402 at zero);
  anything else answers 409 `not_regenerable`.
- POST /gifts with no credit to hold stores nothing and answers 402; no `MB-6` comment or soft-pass wording is left in these
  files; the birth-time route is unchanged (MB-120).

### R11-20 — The checkout routes (USER-FACING) · Opus — provisional MB-119
Objective: Get credits asks for a Stripe session for one bundle and comes back to where it was; the free test checkout stays
off production.
Files: `api/src/routes/checkout.ts` (+ `checkout.test.ts`).
Refs: spec Checkout, acceptance 2, 3, 7; ADR-138, 143, 146; readings 4, 9, 10; pinned contract, seam and catalogue.
Done when:
- POST /checkout: 401 signed out; 400 for an unknown bundle or a `returnTo` outside `/chart` and `/dashboard`; 503
  `checkout_closed` with the mode's reason unless the mode is `stripe`; else one session through R11-07 at `priceFor`'s price
  now, with the verified link and an idempotency key from user, bundle, offer and the minute, answering 201 `{ url }`; at most
  ten a minute per user.
- GET /checkout/options gives the mode and each bundle priced now; GET /checkout/sessions/:id gives granted (with the counts
  and `firstPaid`) or refused to its own buyer, pending when nothing has landed, 404 to anyone else.
- POST /checkout/test is unchanged (403 on production) but reads its counts from the catalogue; tests on the pure parts
  (the return path check, the idempotency key, the options' mapping).

### R11-21 — The webhook grants, refunds and sends the receipt (USER-FACING) · Opus
Objective: the one path that grants a paid bundle: keyed by Stripe's event id, once per session, and only with the tick.
Files: new `api/src/routes/stripeWebhook.ts`, new `api/src/lib/fulfilment.ts` (+ test), `api/src/app.ts`.
Refs: spec Checkout, acceptance 2; ADR-143; R-6.2, 6.6; readings 5, 6, 8; pinned seam, ledger, mailer and fulfilment.
Done when:
- `POST /api/stripe/webhook` mounts in `app.ts` after health and before `express.json`, the session, Clerk and the prelaunch
  gate, reading the raw body; a bad signature answers 400; each event id is recorded once, and a replay answers 200 and does
  nothing; a test sends a correctly signed body through `app` and gets past the signature check, so no parser ran first.
- `handleStripeEvent` grants a paid session (completed, or async succeeded) through `grantPaidBundle` only when reading 5
  holds, then sends the receipt once to the checkout's email and marks it; `charge.refunded` calls `removeRefundedCredits`
  with the cumulative amount; any other type is `ignored`; every outcome lands on the event's row.
- Tests with fake deps: one grant across a replay and across both session events; refused without the tick, unpaid, in the
  other mode, or with unknown metadata; a partial then a full refund; an unknown payment logged; no receipt on a repeat.

### R11-22 — The admin waitlist and the opening email (USER-FACING) · Sonnet
Objective: the admin sees who confirmed and sends the opening email in batches of 100, each address deleted once it is sent.
Files: `api/src/routes/adminWaitlist.ts`.
Refs: spec The launch (phase 2), Offers; ADR-141, 145 to 147; readings 10, 12; pinned mailer and offer link.
Done when: GET /admin/waitlist adds `confirmedAt`, `utmContent` and the confirmed and pending counts; POST
/admin/waitlist/opening-email sends the next 100 confirmed addresses `sendOpeningEmail` with a link signed for seven days
(`/?offer=…&utm_source=waitlist&utm_medium=email&utm_campaign=opening`), deletes each address whose email Resend accepted,
keeps any that failed for the next press, logs the batch in `waitlist_sends`, and answers `{ sent, left }`; it answers 409
on production before launch.

### R11-23 — The birth form asks for credits and comes back (USER-FACING) · Opus
Objective: the form is one of the steps that ask (ADR-143): at zero its button is Get credits, after checkout it returns
with everything typed still there, and after a gift claim it offers Not now (ADR-149).
Files: `web/src/pages/BirthFormPage.tsx`.
Refs: spec Checkout, Challenges 1, acceptance 2, 8; ADR-140, 143, 149; readings 9, 13, 18, 20; pinned web shapes.
Done when:
- With no credit the button reads Get credits beside "No credits left" and opens `CreditsSheet` with `returnTo` `/chart`
  (keeping `self=1`); before leaving for Stripe the fields go to `sd.form.draft` and come back on return, then the key goes;
  a 402 from POST /reports opens the sheet too.
- `CheckoutReturn` sits above the button; once the credit is in it reads "Write my report" again, and nothing is submitted for
  the reader.
- `?from=gift`: one line that their gift is in their balance, and Not now to `/dashboard`, words through `/ux-copy`; nothing
  else in the form changes (R12 extracts its place field).

### R11-24 — The dashboard's asking steps come back (USER-FACING) · Opus
Objective: Get credits from the picker or from Gift a report returns to that step with its pair or its draft, and credits
count on every host.
Files: `web/src/pages/DashboardPage.tsx`; `web/src/components/dashboard/GiftFlow.tsx`, `AddSomeoneSheet.tsx`,
`CompatibilityRows.tsx`, `CreditPill.tsx`; `web/src/components/CompatibilityPicker.tsx`; `web/src/lib/orbit.ts` (+ test),
`pair-selection.ts`, `credits-view.ts` (+ test).
Refs: spec Checkout (the picker with its pair, Gift a report); ADR-105, 138, 143; readings 7, 9, 18; pinned web shapes.
Done when:
- `creditsEnforced` and every `enforced` input go, with each `MB-6` comment and the picker's "written on the house" line; zero
  reads Get credits on every host.
- `returnTo` is `/dashboard?resume=picker` from the picker and the rows, `/dashboard?resume=gift` from Gift a report (its
  fields in `sd.gift.draft` first), `/dashboard` elsewhere; on return the page mounts `CheckoutReturn`, then reopens the gift
  flow with its draft or scrolls to the picker holding its pair; a 402 from either opens the sheet.
- `onAdded` opens Add someone after a bundle under 3, as today; tests: orbit points with no `enforced`; the gift draft kept
  and cleared.

### R11-25 — The Launch view, one admin nav, and the app's wiring (INTERNAL) · Sonnet
Objective: the Owner reads the launch at `/admin/launch`, enters cash and hours by hand, and sends the opening email from
the waitlist page (ADR-147, 148).
Files: new `web/src/pages/AdminLaunchPage.tsx`, new `web/src/components/admin/AdminNav.tsx`; `web/src/pages/AdminWaitlistPage.tsx`;
`AdminLabPage.tsx` and `AdminPromptsPage.tsx` (their nav only); `web/src/App.tsx`.
Refs: spec The loop study, Measures, acceptance 6; ADR-147, 148; readings 10, 15, 18, 19; pinned Launch view; the artifact's
launch and loop-study screens; `/web-taste` (the admin's dense tempo, §9).
Done when:
- The page renders every pinned field: the headline numbers, the five measures as "n of N" with the share against the
  hypothesis, the gate at 100 criterion by criterion ("not yet" before 100), customers by source and the question's answers,
  the entries with a small form; "Include test bundles" off production only.
- One `AdminNav` (Prompts, Lab, Waitlist, Launch) replaces the three copies; the waitlist page shows confirmed and pending, the
  CSV gains `utm_content` and `confirmed_at`, and "Send the opening email to the next 100" asks once, then prints `{ sent, left }`.
- `App.tsx` routes `/admin/launch`, and on every page calls `keepOfferFromUrl`, `useAttributionHandoff` and `pageview` once.

---

## Group D — the walk

### R11-26 — The walk: the hard ledger and the paid path on a scratch Postgres (INTERNAL) · Sonnet
Objective: prove the money rules end to end, with no Stripe account, no Clerk and no network.
Files: `api/src/walk/loop.walk.ts`, new `api/src/walk/payments.walk.ts`, `api/package.json` (`walk` runs both).
Refs: spec acceptance 2, 3, 5, 8; ADR-138, 140, 143, 145, 149; R10-22's walk and its stub mailer.
Done when:
- `loop.walk.ts` gives its readers test credits wherever it writes, retires its `MB-49` note (the soft pass is gone), and
  passes its 23 rules again; its gift claim now expects the form for a claimer with no chart.
- `payments.walk.ts`, against `WALK_DATABASE_URL` after `db:bootstrap`: a signed fake event (the SDK's test header, a fake
  secret) grants once across a replay and is refused without the tick and in the other mode; a partial refund takes back
  that many unspent credits; POST /reports answers 401 signed out, 402 at zero and 201 after a test bundle; a gift at zero
  answers 402; the waitlist joins, confirms and sends a batch that deletes its addresses; the test checkout answers 403 on
  production.
- The orchestrator pastes both summaries into the round report.

---

## Acceptance
**Free, in the round (the gate):** `pnpm install --frozen-lockfile`, typecheck, `build:web`, `build:api`, unit tests (the
catalogue and the offer link, the seller, the price gate, the seam's modes, parameters and signature, the ledger's grant,
refund arithmetic and History, the fulfilment handler, the emails' words, the waitlist's tokens and gate, the loop study,
attribution, the return reducer, the credits view, the processors, the failure lines), codegen twice with no diff after
R11-02, `db:bootstrap` on the upgrade path and on an empty scratch Postgres as R11-01 states, both walks (R11-26), and smoke
on the Vercel preview. **No dry lab**: the orchestrator confirms `git diff --name-only main... -- api/src/prompts
api/src/lib/models.ts api/src/lib/aiInterpretation.ts api/src/lib/traditional.ts api/src/lib/chartCalculation.ts` is empty.
Nothing generates or spends, and no key is needed. The spec's acceptance 1 to 8 are met in code; acceptance 4's last clause
("no placeholder remains") waits for MB-115 and MB-33, and acceptance 9's test purchase for the Owner's Stripe test keys.
**On staging after the merge (the Owner's look):**
1. The credits sheet lists Single €24, Couple €48 and Family & friends €72 with their lines; Get credits adds free test credits
   ("Credits are free while we test"); after 3 or 5 the path is titled by the bundle; the landing shows no price.
2. With a second account: claim a gift and the birth form opens for your own chart; Not now opens the dashboard, the credit in
   the balance.
3. `/waitlist` on staging: join, confirm from the email (it reaches only the Resend account's own address until runbook L),
   and the admin list shows the address confirmed; `/admin/launch` shows its numbers with test bundles included.
4. Once Stripe's test keys are on staging (ask 2): Get credits opens Stripe's test checkout with the box unticked; pay with
   Stripe's test card; back where you asked, "Adding your credits", then the question once; the receipt repeats the tick; a
   partial refund from Stripe's test dashboard takes back that many unspent credits.
**Production gets nothing from the round itself.** After it, the waitlist can go to production on MB-115's first two lines,
Resend's domain (runbook L) and a Release, which runs the full lab since R09's v7 has never reached production (ADR-141, 145,
147). The launch needs the rest of MB-115, live Stripe keys, `LAUNCHED` and `LAUNCH_DATE` in one edit, and a Release; MB-75
is that Release's todo.

## Risks
1. **Schema** (R-7.3): the largest change yet: four tables altered, three created, one column dropped, all before `push` in
   step 1. Tested on the upgrade path staging and production will take, not only on an empty database; a script that cannot
   run twice would stop Railway's start.
2. **New dependency**: `stripe` 22.6.2, exact, in `api`, the official SDK, chosen for its signature check and idempotency keys
   (R-6.2). The fonts are copied, not installed.
3. **Money** (R-6.1, 6.2): credits turn hard on every host, staging included (the free test checkout serves staging); the API
   stops writing for anonymous sessions (ADR-140 was enforced only in the web); regeneration narrows to reading 7; grants come
   only from the webhook; refunds take credits back by reading 6. The walk proves each on a real Postgres.
4. **A public webhook**: signature-checked on the raw body, mounted before any parser; a test sends a signed body through
   `app` so a reordered `app.ts` fails the gate.
5. **User-visible without a locked spec**: the return-from-checkout lines, the question's answers, the kept drafts, the form's
   zero state, the failure lines (MB-91's recommendation), the double opt-in's and the opening email's words, the regenerate
   rule. Each passes `/ux-copy` and is listed for the Owner's look.
6. **Legal**: the four pages stay drafts until MB-115 and MB-33; production refuses checkout while the seller has a placeholder,
   so nothing can be sold under placeholder terms. The consumer-law and tax check (MB-114) stays the Owner's and changes
   nothing in the build.
7. **Privacy**: four new browser keys (reading 18), two of them holding personal data only in the tab that typed it; the
   tags wait under MB-117; the fonts leave Google's CDN.
8. **Emails** (USER-FACING): three new templates through Resend; until its domain is verified (runbook L) confirmations reach
   only the Resend account's own address.
9. **No report content change** and no brain change: no dry lab, no report reads differently.
10. **Size**: twenty-six cards, twelve in group B; the shrink path is in Parallel groups.

## Questions raised (Notion, 2026-09-28)
- **Raised today:** **MB-119** (decision, later): ADR-142's catalogue keeps its file in `api/src/` and sends Stripe
  `price_data` instead of a stored price id; R12 moves the file into `packages/commerce` for its prerender. Default: as built,
  `// MB-119 provisional`. **MB-120** (gap, launch): a second birth-time update has never been charged (R-6.1). Default: free
  until the next round that touches the report page.
- **Raised for this round on 2026-09-27, kept:** **MB-115** (blocking todo): the seller's details, name and contact first
  (default: placeholders, drafts, no production checkout, the waitlist stays on staging). **MB-116** (analytics: Plausible or
  Vercel; default dark, R11-18). **MB-117** (the tags in the browser; built as recommended in R11-18 and R11-12, tagged).
  **MB-118** (Mother's and Father's Day dates; computed, tagged, first in May 2027).
- **Read, at their defaults:** MB-112 (Couple stays; the name lives in one catalogue row, tagged), MB-113 (one verb for
  writing; not this round), MB-114 (the Owner's check; nothing in the build changes).
- **Touched:** MB-91 → done by R11-13; MB-6, MB-57, MB-106 (decided) lose their seams; MB-33 keeps its region placeholders
  in `processors.ts`; MB-43's rule covers the new keys; MB-49's note in the walk retires; MB-108 is R12's (the package pattern
  starts here); MB-25 marked decided by ADR-147. **Rounds open** incremented on all 54 carried-over rows.

## For the Owner (three asks, highest stakes first)
Nothing blocks the round: approving this plan starts it (§11.2). These three are for after the merge.
1. **Your details for the legal pages (MB-115).** Production may collect addresses only once the privacy page names who
   holds them, and EU law needs a postal address before any sale. Recommendation: send two lines now, the name to publish
   and a contact address used only for Stars Decoded; the postal or forwarding address and the country can follow before
   checkout. If silent: the pages stay drafts, production refuses checkout, and the waitlist stays on staging, so the
   four-week warm-up has not started.
2. **Stripe in test mode (runbook K, rewritten by R11-07).** The round builds and tests checkout with fake keys; the test
   purchase on staging needs your account. Recommendation: open it as an Individual (business name Stars Decoded, descriptor
   MYSTARSDECODED, the Terms URL set) and paste the test secret key and the test webhook's signing secret into Railway staging
   only; live keys wait for launch. If silent: staging keeps the free test checkout and the test purchase waits.
3. **Resend's domain (runbook L).** Every sign-up now gets a confirmation email; until `mystarsdecoded.com` is verified in
   Resend, only the Resend account's own address receives mail, so nobody else can confirm. Recommendation: do it with ask 1
   (about ten minutes, DNS on Vercel). If silent: the production waitlist would hold only unconfirmed addresses, so it waits
   too.

## Proposed R12 — landing-and-ai-search (the R10 outline, renumbered)
`docs/rounds/R10-plan.md`'s R11 outline becomes R12, cards R12-01 to R12-18, with these changes from R11: R11-07 of that
outline (MB-91) is done here (R11-13); the pricing slot (landing scope 11) and JSON-LD's Offer read the catalogue, which R12
moves unchanged into `packages/commerce` so the prerender can import it (MB-119), and the slot prints offers only from
`GET /checkout/options` after hydration, since a prerendered page cannot know today's offer; the place field R12-02 extracts
comes from R11-23's `BirthFormPage.tsx`; `App.tsx` keeps R11-25's offer capture, so a link to any public page keeps the
waitlist's offer; /sample waits only for MB-90 (ADR-144 closed MB-31); the waitlist page, the legal pages and "Who runs Stars
Decoded" prerender with the rest (R-7.6). MB-108 is still R12's to answer for the engine; no payment key and no GitHub secret.

## Close (the orchestrator)
Mark MB-91 done; record MB-112 and MB-115 to 119 at their defaults at their seams; MB-120 stays open. MASTERFILE 0.19: §3 gains
`bundles`' Stripe columns, `stripe_events`, `launch_entries`, `waitlist_sends`, the waitlist's and `users`' new columns, the
`refunded` status, and loses `credit_type` ("the typed columns go with the payments round" becomes done); R-6.1 says the soft
pass is gone; R-6.2 says a grant is unique per checkout session and each event is recorded by id; R-6.3 says the web reads
prices through `GET /checkout/options` and Stripe gets `price_data` (MB-119). INDEX's code map gains `catalogue.ts`,
`offerLink.ts`, `stripe.ts`, `fulfilment.ts`, `launchStudy.ts`, routes `stripeWebhook.ts`, `me.ts`, `adminLaunch.ts`,
`packages/commerce`, and on the web `CheckoutReturn`, `HeardFromSheet`, `useCheckoutReturn`, `AdminLaunchPage`, `AdminNav`,
`attribution.ts`, `analytics.ts`, `processors.ts`; its Specs line marks pricing-and-launch built and the landing R12.
CLAUDE.md's current focus: R11 shipped; production waits on MB-115, Resend's domain and a Release for the waitlist, and on
live Stripe keys and the launch edit for launch (MB-75); next, R12 the landing. The four staging lines go to the Owner with
the staging URL.
