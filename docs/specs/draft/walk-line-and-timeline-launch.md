# Walk line and Timeline's launch lines (B-40, B-41)

Ideation 2026-10-06, from QA-05 #4 and #5. Status: **draft**, one question open.
Artifact: https://claude.ai/artifact/FUBb3QehCcrkBzxN6deA8W

B-41's direction was settled by the Owner earlier the same day (ADR-343): the "after launch" lines
stay until launch, and six lines change together in the change that turns Timeline on. This spec
does not re-open it; it writes the six launch-day lines and asks only how they switch.

## Scope

### B-40 · the staging walk reads checkout's own line
- `api/src/lib/qaWalk/browser.ts:381` joins the text of every `role=status` on the page when the
  tick fails. The STAGING badge (`web/src/components/StagingRibbon.tsx:35`, `<span role="status">`)
  is one, so "STAGING" lands in `findings[].detail`, `/api/qa/latest` and the Release view's step list.
- Checkout's two message lines (`CheckoutPage.tsx:477` couldn't load, `:485` not open) get a stable
  hook (`data-qa="checkout-line"`). `pay()` reads that line; `alertText()` (`browser.ts:256`, used at
  :350 and :398) reads inside checkout only, not the whole page.
- The badge's span loses `role="status"`: its words never change, so it is no live region. This
  also clears it for the QA agent's page read (`qaAgent/browser.ts:69`).
- Side effect: a timed-out tick no longer reports StatusDots' "Loading".

### B-41 · the six launch-day lines, written now
Prices come from `planPriceLine()` (catalogue, R-6.3), never typed.

| Where | Today | Launch day |
|---|---|---|
| Home, `TimelineLine.tsx:98` | Coming soon · Timeline | Timeline |
| /timeline eyebrow, `site.ts:111` | Coming soon · Timeline | Timeline |
| /timeline hero, `Hero.tsx:61` | Timeline opens after launch. You'll need a {Personal natal report}. | You'll need a {Personal natal report}. |
| /timeline plan card, `WhatYouGet.tsx:42` | Coming soon | {planPriceLine()} |
| /faq, `faq.ts:148` | Once for each report. Timeline, coming after launch, will be our one subscription. | Once for each report. Timeline is our one subscription. |
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
- A new test for either item (ADR-273; the walk is not the buyer's flow).

## Acceptance criteria
1. After the next staging deploy, a walk that fails at the tick has a reason with no "Staging" in
   it, in `/api/qa/latest` and on the Release view.
2. The badge still shows the same words, look and Exit button on staging.
3. Before launch, all six lines read as today on staging and production.
4. With `LAUNCHED = true` (checked in a local build, not shipped), all six read as the launch-day
   column, the price taken from the catalogue; no "after launch", "coming soon" or "price comes
   later" is left on home, /timeline, /faq or llms.txt.
5. Typecheck, both builds, the critical tests and `check:shipped` pass.

## Screens
See the artifact: the checkout mock with what the walk reads now and after, and /timeline today
beside /timeline on launch day, with the six-line table.

## Open questions
1. **How do the six lines switch?** Recommended and the default: both versions in code, switched
   by `LAUNCHED` (`packages/launch`), so setting it swaps all six with no edit on the day. Pages are
   prerendered at build, and launch is the flag plus a Release, so the build carries them. The
   other choice: hand-edit on launch day from the table above.

## Decisions to record
- B-40 (Decided by Claude): the walk reads checkout's own line through a `data-qa` hook, its alert
  reads stay inside checkout, and the STAGING badge drops `role="status"`. No new test.
- B-41 (Decided by Claude, under ADR-343): the six launch-day lines as in the table; the price from
  `planPriceLine()`, shown in the plan card and the FAQ only.
- B-41 (pending Owner, Q1): the lines switch on `LAUNCHED`.
