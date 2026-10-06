# Walk line and Timeline's launch lines (B-40, B-41)

Ideation 2026-10-06, from QA-05 #4 and #5. Status: **draft, version 2** after the Owner's two answers; one question open.
Artifact: https://claude.ai/artifact/FUBb3QehCcrkBzxN6deA8W

B-41's direction was settled by the Owner earlier the same day (ADR-343): the "after launch" lines
stay until launch, and six lines change together in the change that turns Timeline on. This spec
does not re-open it; it writes the six launch-day lines and asks only how they switch.

## Scope

### B-40 · closed, nothing to build (Owner, 2026-10-06)
- The Owner: "can't we just fix the root cause that makes the checkbox untickable". The root cause
  was QA-05 #1: `/api/checkout/options` answered `ready: false` (Stripe key or the start's sync,
  `checkoutReady`, `purchases.ts:104`), and the page disables the tick while closed
  (`CheckoutPage.tsx:224, 449`). No checkout code changed between fd9f2b9 and f5c2195; on f5c2195
  (2026-10-06 14:23 UTC) options answer `ready: true` and the deploy walk's `buy` step passed
  (tick, Family & friends, 5 credits). The badge text in a failure reason is left as is.

### Credit line · the Owner's wording, no prices in the FAQ (Owner, 2026-10-06)
"You pay once for each report" is wrong: credits are bought, often in a bundle. The Owner's line:
"You pay for credits. 1 credit = 1 report of any kind." No prices in the FAQ: a discount changes
them and the FAQ would be wrong. Prices show only where they are read live from the catalogue,
campaigns included (`usePrices`: home Prices, checkout, the credit sheet). Not tied to launch.

| Where | Today | Proposed |
|---|---|---|
| `CREDIT_LINE`, `catalogue.ts:67` (BundleList, CreditPill, faq) | 1 credit = 1 report of either kind. | 1 credit = 1 report of any kind. |
| Home Prices, `Pricing.tsx:59` | You pay once for each report. | You pay for credits. {CREDIT_LINE} |
| Dashboard, `DashboardPage.tsx:264` | You pay once for each report. | You pay for credits. {CREDIT_LINE} |
| /faq, `faq.ts:148` | Once for each report. Timeline, coming after launch, will be our one subscription. {CREDIT_LINE} Credits cost {creditPrices()}, VAT included. | You pay for credits. {CREDIT_LINE} Timeline, coming after launch, will be our one subscription. |

`creditPrices()` in `faq.ts` goes with its last use. The /faq answer's first sentences were the
Owner's (ADR-253); this replaces them on his word.

### B-41 · the six launch-day lines, written now
The price shows only in the plan card, read live; never typed (R-6.3), never in the FAQ.

| Where | Today | Launch day |
|---|---|---|
| Home, `TimelineLine.tsx:98` | Coming soon · Timeline | Timeline |
| /timeline eyebrow, `site.ts:111` | Coming soon · Timeline | Timeline |
| /timeline hero, `Hero.tsx:61` | Timeline opens after launch. You'll need a {Personal natal report}. | You'll need a {Personal natal report}. |
| /timeline plan card, `WhatYouGet.tsx:42` | Coming soon | both plans' live prices (`usePrices`, campaigns included) |
| /faq, `faq.ts:148` | … Timeline, coming after launch, will be our one subscription. | … Timeline is our one subscription. |
| /timeline FAQ, `faq.ts:163` | … and Ask. It opens after launch. The price comes later. | … and Ask. |

- No price in the FAQ or the hero; the plan card is the one place.
- llms.txt and JSON-LD follow on their own (lede unchanged; FAQPage built from `faq.ts`).
- The stale comments "no price until billing exists" (`site.ts:107`, `TimelineLine.tsx:88`,
  `WhatYouGet.tsx:2-3`) are reworded to "no price until launch (ADR-343)" in the same change.
- How the lines switch: open question 1 (default: on `LAUNCHED`).

## Out of scope
- Terms, Refunds, Privacy: already present tense, accepted by ADR-343.
- The staging teaser and Account price line: staging sells in the sandbox (stripe-payments).
- Launch itself, its date and any price change (ADR-230, 242).
- B-42, B-43, B-44 (other QA-05 rows).
- Any change to the staging walk or the STAGING badge (B-40 closed).

## Acceptance criteria
1. Home Prices, the dashboard and /faq read as the credit-line table; the credit line says "any
   kind" everywhere; no FAQ answer names a price.
2. Before launch, the six Timeline lines read as today on staging and production.
3. With `LAUNCHED = true` (checked in a local build, not shipped), the six read as the launch-day
   column, the plan card's price live from the catalogue; no "after launch", "coming soon" or "price comes later"
   is left on home, /timeline, /faq or llms.txt.
4. Typecheck, both builds, the critical tests and `check:shipped` pass.

## Screens
See the artifact (version 2): B-40's cause and its fix, the credit-line table, /timeline today
beside /timeline on launch day, and the six-line table.

## Open questions
1. **How do the six lines switch?** Recommended and the default: both versions in code, switched
   by `LAUNCHED` (`packages/launch`), so setting it swaps all six with no edit on the day. Pages are
   prerendered at build, and launch is the flag plus a Release, so the build carries them. The
   other choice: hand-edit on launch day from the table above.

## Decisions to record
- B-40 closed with nothing to build: the untickable box was checkout being closed (QA-05 #1), fixed
  in staging's setup; the walk passed `buy` on f5c2195 (Decided by Alex, 2026-10-06).
- The credit line is "You pay for credits. 1 credit = 1 report of any kind." on home, the dashboard
  and /faq, and `CREDIT_LINE` says "any kind" (Decided by Alex, 2026-10-06).
- No price in any FAQ answer; prices show only where read live from the catalogue, so a discount
  never leaves a page wrong (Decided by Alex, 2026-10-06).
- B-41 (Decided by Claude, under ADR-343): the six launch-day lines as in the table; Timeline's
  price only in the plan card, read live.
- B-41 (pending Owner, Q1): the lines switch on `LAUNCHED`.
