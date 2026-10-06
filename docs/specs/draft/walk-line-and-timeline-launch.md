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

### Credit line · "You pay once for each report" is wrong (Owner, 2026-10-06)
Credits are bought, often in a bundle, so the line misleads. Not tied to launch; ships next round.

| Where | Today | Proposed |
|---|---|---|
| Home Prices, `Pricing.tsx:59` | You pay once for each report. | You pay once for credits. {CREDIT_LINE} |
| Dashboard, `DashboardPage.tsx:264` | You pay once for each report. | You pay once for credits. {CREDIT_LINE} |
| /faq, `faq.ts:148` | Once for each report. Timeline, coming after launch, will be our one subscription. {CREDIT_LINE} Credits cost {creditPrices()}, VAT included. | You pay once for credits, not every month. {CREDIT_LINE} Credits cost {creditPrices()}, VAT included. Timeline, coming after launch, will be our one subscription. |

`CREDIT_LINE` is "1 credit = 1 report of either kind." (`packages/commerce/src/catalogue.ts:67`).
The /faq answer's first sentences were the Owner's (ADR-253); this replaces them on his word.

### B-41 · the six launch-day lines, written now
Prices come from `planPriceLine()` (catalogue, R-6.3), never typed.

| Where | Today | Launch day |
|---|---|---|
| Home, `TimelineLine.tsx:98` | Coming soon · Timeline | Timeline |
| /timeline eyebrow, `site.ts:111` | Coming soon · Timeline | Timeline |
| /timeline hero, `Hero.tsx:61` | Timeline opens after launch. You'll need a {Personal natal report}. | You'll need a {Personal natal report}. |
| /timeline plan card, `WhatYouGet.tsx:42` | Coming soon | {planPriceLine()} |
| /faq, `faq.ts:148` | … Timeline, coming after launch, will be our one subscription. | … Timeline is our one subscription. |
| /timeline FAQ, `faq.ts:163` | … and Ask. It opens after launch. The price comes later. | … and Ask. It costs {planPriceLine()}. |

- The price shows once in the page body (the card) and once in the FAQ; the hero adds none
  (playbook, "no promise twice").
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
1. Home Prices, the dashboard and /faq no longer say "You pay once for each report" or "Once for
   each report"; they read as the credit-line table, prices from the catalogue.
2. Before launch, the six Timeline lines read as today on staging and production.
3. With `LAUNCHED = true` (checked in a local build, not shipped), the six read as the launch-day
   column, the price from the catalogue; no "after launch", "coming soon" or "price comes later"
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
- "You pay once for each report" is replaced in three places by the credit-line table, next round,
  not tied to launch (Decided by Alex, wording by Claude, 2026-10-06).
- B-41 (Decided by Claude, under ADR-343): the six launch-day lines as in the table; the price from
  `planPriceLine()`, shown in the plan card and the FAQ only.
- B-41 (pending Owner, Q1): the lines switch on `LAUNCHED`.
