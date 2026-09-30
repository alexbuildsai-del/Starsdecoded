# Pricing and launch

Ideation 2026-09-21, revised 2026-09-26 and 27 with the Owner. Prices, the paid checkout, who sells
until a company exists, and a small launch to the first 100 customers. Artifact:
https://claude.ai/artifact/LsBoAa2WbJJURqWgvpgb31. Status: **locked 2026-09-27**.

Builds on R09 and R10 as shipped: one credit per report, one balance (ADR-42, R-6.5); Send,
Gift a report, Add someone and the credits sheet (`credit-loop.md`, ADR-120 to 129); consent
(ADR-139); writing needs an account (ADR-140); the test checkout off production (ADR-138); the
waitlist with UTM tags (ADR-141); the free chart at /sky; the share card at 1080×1350 (ADR-102).

## Scope

### Bundles and prices (the Owner's names and numbers)
| Name | Line under it | Credits | Price | Per credit |
|---|---|---|---|---|
| Single | 1 credit · one report | 1 | €24 | €24.00 |
| Couple | 3 credits · a report each and how you get along | 3 | €48 | €16.00 |
| Family & friends | 5 credits · for the people close to you | 5 | €72 | €14.40 |
- The names replace credit-loop's "One report", "Someone and the two of you", "Your people and
  how you fit" and the path title "Your people, then how you fit" (`credits-view.ts`).
- VAT included. EUR only. Single is never discounted.
- One price catalogue in `api/src/` (bundle, credits, cents, Stripe price id, dated offer
  windows), read by the credits sheet, the landing's pricing slot, JSON-LD's Offer and the
  receipt (R-6.3). The birth form's typed "€24" goes.
- The credits sheet prints the price beside each bundle's count. Nothing else in the dashboard
  shows money.

### Checkout
- **Get credits** on production opens Stripe Checkout for the chosen bundle and returns to the
  step that asked for it: the birth form, the picker with its pair, Gift a report. Off
  production the free test checkout stays as ADR-138 built it.
- **One required tick**, Stripe Checkout's terms box (`consent_collection.terms_of_service`
  required, our words in `custom_text.terms_of_service_acceptance`, a Terms link beside them):
  "Write each report as soon as I use a credit on it. I understand I can't cancel or get a
  refund for a credit once it's used." EU law gives buyers of digital content 14 days
  to cancel unless they agree to an immediate start and accept losing that right (Directive
  2011/83/EU, Art. 16(m)); the tick is that agreement, and the receipt email repeats it (8(7)).
- **Refunds, three rules** (the Refunds page says exactly these): an unused credit is refunded on
  request within 14 days of purchase, and the webhook removes it; a report that fails gives its
  credit back automatically; beyond that Alex may refund anyone from Stripe, because a goodwill
  refund costs less than a card dispute and its fee.
- The webhook grants the bundle through the credits ledger, keyed by the Stripe event id (R-6.2).
  `consumeCredit` goes hard on production and the soft pass is deleted (MB-6, MB-57).
- Launch is `LAUNCHED = true` plus a Release, after this checkout is live (ADR-138, ADR-141).

### Sold by Alex, for now (replaces "no sale without an entity", MB-31)
- **Seller.** Alex, a private individual trading as Stars Decoded, until 100 customers prove
  the business. One constant, `LEGAL_IDENTITY` (name, trading name, postal address, country,
  contact email), is read by Terms, Privacy, Refunds and the company page, which becomes "Who
  runs Stars Decoded". The company later is one edit plus one email telling users.
- **Money.** Stripe account type Individual, in Alex's name, business name Stars Decoded,
  statement descriptor `MYSTARSDECODED`. Payouts go to a Revolut account in Alex's name used
  only for MSD.
- **Address.** EU consumer law requires a postal address for online sales. A mail-forwarding
  address keeps the home address off the page.
- **Tax.** A company is not needed; in most EU countries a sole-trader (self-employed)
  registration is, and it is usually free and quick. VAT on digital sales follows the home
  country while cross-border EU sales stay under €10,000 a year; 100 customers sit well under.
  Stripe's export is the sales ledger.

### Privacy until the company (answers MB-105)
- Alex is the controller, named in the privacy page with a dedicated contact address.
- Processors: Supabase, Railway, Vercel, OpenAI, Clerk, Resend, each with its DPA accepted in
  its dashboard and its region listed (MB-33 verifies). Stripe is its own controller for
  payments. US transfers rest on each processor's SCCs or the Data Privacy Framework.
- Lawful bases: the contract for reports; consent for the waitlist's launch email, with double
  opt-in (MB-106); legitimate interest for security logs.
- Someone else's birth data: the consent rule already keeps it unseen until they share it. The
  Terms say a person enters another's details only with their knowledge, a child's only as their
  parent or guardian. Accounts are 16 and over.
- Rights: deletion works (R01); an export is sent by email within 30 days; the privacy mailbox is
  read weekly; a breach is logged and reported to the home authority within 72 hours.
- Only necessary cookies (the Clerk session). Analytics are cookieless, so there is no banner.
- Waitlist addresses are deleted once the opening email has gone out, as ADR-141 states.

### The launch: slow, organic, measured (the GTM)
Goal: 100 paying customers, and three numbers when we get there: days from launch, cash spent,
hours spent. Plus the loop study below. No paid ads until organic content has shown which hooks
hold attention.

| Phase | When | What |
|---|---|---|
| 0 · Warm-up | now to launch, about 4 weeks | Waitlist live on production; @mystarsdecoded on Instagram and TikTok; 20 posts banked, then one a day; bio link to the waitlist with `utm_source` per platform and `utm_content` per post. Target 500 sign-ups. |
| 1 · Friends | launch week | 10 to 20 people Alex knows buy at full price, read, and say yes or no to a quote and a sentence from their report being used. |
| 2 · Waitlist | weeks 1 to 2 | The opening email through Resend in batches of about 100; its link carries the waitlist offer; the list is then deleted (ADR-141). |
| 3 · Organic | weeks 2 to 12 | Daily posts; replies point to the free chart; 10 creators in the self-knowledge niche get a report through Gift a report, no paid deal. |
| 4 · Ad test | from customer 50 | At most €300 behind the three posts with the best hold rate, as TikTok Spark Ads and Instagram boosts. |

- **Content pillars, all real data:** the sky right now (a screen recording of /sky over a named
  city, computed that minute); one sentence (a sentence from a consenting reader's report on the
  shipped share card, whose 1080×1350 is Instagram's portrait size); two charts, no score (the
  pair page's two wheels and its ledger, "Naturally strong" and "Will take work"); computed, not
  guessed (why the birth time moves the rising sign, from /learn/birth-time); what this child
  needs (the parent lens, never a real child's name or face); public figures' charts from the
  fixtures as commentary, organic only, never in an ad.
- **Formats:** 9:16 video, 7 to 30 seconds, captions burned in, the hook in the first second and a
  half; 4:5 carousels of up to ten slides. Everything is shot in the product's own look, so the
  best organic post becomes the ad unchanged.
- **Cadence:** TikTok daily; Instagram five reels and two carousels a week; one three-hour batch
  session a week makes seven videos from templates.
- **Cash cap to 100 customers:** about €600. Ads €300 at most; analytics and editing tools about
  €20 a month; hosting on current plans. Per sale: Stripe's fee and €0.27 to €0.60 of inference.
- **Measures (answers MB-11):** cookieless page analytics; the waitlist's UTM tags carried into
  sign-up; one optional question after a first purchase, "Where did you hear about us?"; an admin
  Launch view reading our own tables: days since launch, customers, revenue, cash spent (entered
  by hand), cost per customer, and the loop study.

### The loop study
A customer is a user with one paid, non-test bundle. The study counts the credit loop's own
events: Send, Gift a report, claim, and a recipient's first purchase.
| Measure | Hypothesis to prove at 100 |
|---|---|
| Customers who Send or Gift within 14 days | 40% or more |
| Sends and gifts claimed within 7 days | 60% or more |
| Claimed recipients who buy within 30 days | 15% or more |
| First 100 customers who arrived through a Send or Gift | 20% or more |
| Purchases of 3 or 5 credits | 35% or more |
- **The gate at 100:** reached within 12 weeks of launch, cash per customer at €10 or less,
  refunds at 5% or less, and at least 15% of customers from the loop → form the company and fund
  ads. Any miss names the step to fix before money goes in.

### Offers (Couple and Family & friends only, never Single)
At most 25% off, one per purchase, a dated row in the catalogue, the end date printed once and no
countdown (credit-loop: no timers). The waitlist's first seven days, Couple at €40; December 1
to 24, Family & friends at €60; Valentine's, Couple at €40; Mother's and Father's Day, Family &
friends at €60.

### Hooks (through `/ux-copy`, ADR-117)
"Computed, not guessed." · "Two charts, one report, no score." · "Three for the price of two.
The third is for someone." · "What this child needs." · "The gift that is only about them."

### Later: the subscription (recorded, not decided)
A monthly reading of the sky against a stored chart and each shared pair. Its own ideation must
amend §1 and R-5.2 so a period may be named and an event never.

## Challenges to shipped decisions (both accepted 2026-09-27)

1. **A gift claim opens the birth form, with Not now** (amends ADR-139's landing only). ADR-139
   opens the dashboard; a recipient holding one credit and no chart is the loop's likeliest leak.
   The form changes nothing about consent: nothing is written until they press Write.
2. **MB-31 and MB-105 stop blocking.** The seller identity above answers both, so /sample's gate
   narrows to MB-90 and the waitlist can reach production now, which Phase 0 needs.

## Out of scope

- Composite charts (MB-17), a second currency, discounting Single, coupon fields,
  gift cards for people without an account, a thank-you credit, the subscription build, paid
  creator deals, ad spend beyond the cap, forming the company.

## Acceptance criteria

1. Every price renders from the catalogue; no literal price remains in `web/` or `api/`.
2. On production, Get credits opens Stripe Checkout and returns to the step that asked; the box
   starts unticked (checked in test mode); the webhook grants only with `consent.terms_of_service`
   `accepted` and never twice; the receipt repeats the tick; a Stripe refund removes unspent
   credits; `consumeCredit` refuses with no credit.
3. Off production the free test checkout still grants test bundles; production refuses it.
4. Terms, Privacy, Refunds and the company page read `LEGAL_IDENTITY`; no `[LEGAL ENTITY]`
   placeholder remains; the privacy page lists every processor with its region.
5. The waitlist uses double opt-in; its UTM tags reach the account created from the same browser.
6. The admin Launch view shows days since launch, customers, revenue, cash entered, cost per
   customer and the five loop measures, excluding test bundles.
7. An offer window changes one bundle's price between its dates, never Single, never two at
   once, with no countdown.
8. A gift claim opens the birth form; Not now opens the dashboard.
9. Typecheck, both builds, unit tests, codegen, `db:bootstrap` clean twice, staging smoke, and a
   test-mode purchase end to end on staging.

## Screens

In the artifact: the priced credits sheet, the path to a report, the launch, the loop study.

## Open questions

None. Answered 2026-09-27: the waitlist offer, the gift claim, the ad test; the tick.

## The Owner supplies (no code can)

Legal name, a postal or forwarding address, country, a contact address; the Stripe and Revolut
accounts; a sole-trader registration where required; the Instagram and TikTok handles.

## Decisions recorded (ADR-142 to 149, in this order)

1. **Single €24, Couple €48, Family & friends €72** for 1, 3 and 5 credits, from one catalogue;
   Single never discounted; the sheet shows name, line and price. Supersedes credit-loop's bundle
   names. Closes MB-5.
2. **Stripe Checkout from Get credits**, returning to the asking step, with one plain tick; the
   webhook grants; credits hard on production; the test checkout stays off production. Refunds:
   unused credits within 14 days, failed reports automatically, goodwill at Alex's call. Closes
   MB-6 and MB-57.
3. **Alex sells as an individual trading as Stars Decoded until 100 customers**, one legal
   constant, Stripe Individual paying out to a dedicated account. Closes MB-31.
4. **Privacy until the company**: Alex as controller, the processor list, double opt-in,
   cookieless analytics, the retention rule. Closes MB-105 and MB-106.
5. **Offers** touch bundles only, at most 25%, one per purchase, dated, no countdown.
6. **The launch is organic to 100 customers** in five phases, a €600 cash cap, ads only from
   customer 50; the gate at 100 decides the company. Closes MB-11 and MB-107.
7. **The loop study** and its five hypotheses, read in an admin Launch view.
8. **A gift claim opens the birth form**, with Not now, amending ADR-139's landing.
