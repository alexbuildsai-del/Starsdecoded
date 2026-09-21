# Pricing and the loop

Ideation 2026-09-21 with the Owner. Pricing, packaging and the user flow around the
compatibility report; the content of any report is out of scope. Artifact (the two ledger
models side by side, the price ladder, the loop, three mock screens, the offer calendar, the
hooks, the subscription door, the questions): https://claude.ai/artifact/LsBoAa2WbJJURqWgvpgb31.
Status: **draft**.

What exists today (mapped this session): one credit kind and packs as counts in
`api/src/lib/credits.ts` (`solo 1, couple 3, family 5`), the soft pass in `consumeCredit`
tagged `// MB-6 provisional`, `credits.user_id` NOT NULL, no Stripe or checkout code, "€24"
hardcoded in three copy strings, the invite token claimed only by the invited email
(`api/src/routes/invites.ts`), the claim transferring the profile and flipping the buyer to
`participant`, gift mode one built and gift mode two (shared credit) not, the picker with two
CTA states instead of the spec's three (MB-57). Decisions this builds on: ADR-36 (one free time
update), ADR-38 (two gift modes, giver keeps read access), ADR-42 (one credit, any report),
ADR-63 (seven chapters) and ADR-68 (the third lens is Two people).

## Scope

### The ledger (Owner's question one)
- **One credit kind, any report.** ADR-42 stands. A natal or a compatibility report consumes
  one credit; a pair always costs three credits against a natal's one, so "above solo" holds at
  the purchase. The compatibility report is not a separate SKU and never an add-on price.
- Rejected: personal credits plus a compatibility add-on. It earns more only when two existing
  buyers meet, and pays with a second balance, a second gift kind, two variants of every offer
  and a reversal of a decision locked two days earlier.

### Price ladder (recommended; VAT-inclusive EUR, Stripe Tax settles the split)
| Pack | Credits | Price | Per credit | Rule |
|---|---|---|---|---|
| Your report | 1 | €24 | €24.00 | the anchor, never discounted |
| Two of you | 3 | €48 | €16.00 | three for the price of two |
| Family | 5 | €72 | €14.40 | five for the price of three |
| Gift | 1 | €24 | €24.00 | one credit sent by link; any spare credit can be sent the same way |
- No 2-pack: a solo buyer adding a partner is offered the 3-pack, whose spare credit is the loop.
- Worst-case inference is a pair on one credit, under 3% at every tier (ADR-10). Stripe's fee
  on a €24 sale is larger than the inference.
- **The price catalogue** is one file in `api/src/` shaped like `models.ts`: pack id, credits,
  EUR cents, Stripe price id, dated offer windows. Landing, checkout, the picker and the
  receipt read it; the three hardcoded strings go (R-6.3). A price outside it does not compile.
- Pack names name credits, never reports: the checkout prints "3 credits" under every name.

### Checkout and account
- The birth form computes the chart for free and anonymously (R-3.4). The paywall shows the
  real wheel and one line: "Your chart is computed. The report is one credit." No prose, no
  placement text beyond what the wheel draws.
- Sign in, then Stripe Checkout. `credits.user_id` already requires a user; the purchase is
  where an account is expected. Clerk claims the session's profile and the chart on sign-in.
- Stripe is the ledger (R-6.2): three Prices, promotion codes for offers, Stripe Tax. The
  webhook grants a bundle through the existing tables with the Stripe event id as the
  idempotency key. `consumeCredit` goes hard in the same release (MB-6). The picker gets its
  three CTA states and the "Get a credit" return to the same selection (MB-57).
- Refunds page: EU digital content; the 14-day withdrawal right ends when a report starts
  writing; an unspent credit is refundable within 14 days of purchase; a claimed gift is not.

### The loop
1. Buy: wheel, sign in, pay, the report writes (one credit).
2. Read: Closing and the dashboard end on "Read this with someone"; the 3-pack is preselected.
3. Add: A enters B (gift mode one) or sends B a link to enter their own details (gift mode
   two, the shared credit). B's natal writes on A's credit.
4. Pair: the picker writes the compatibility report; A owns it, B is a participant.
5. Claim: B signs in with the invited email, sees the pair report and their own natal, answers
   the three-way time question once (ADR-38), and has a dashboard.
6. Again: the spare credit is a gift or a third person; B sees "Add someone" and the same pack.
- Invitee access: a participant sees every pair report they are in and their own natal. The
  buyer keeps read access to both unless the recipient removes it from the natal (ADR-38);
  the pair is about both and stays with both; only the buyer deletes it.
- Deleting a profile deletes its natal and every pair built on it; the delete dialog says so
  and names the pairs. The invite email says who entered the birth data.
- The dashboard sells from one card, "Add someone": use a credit, or send it as a gift.

### Gift, mode two (ADR-38, built here)
- A spare or bought credit is sent as a link: `invite_tokens.kind = gift`, nullable `credit_id`
  that moves to the claimant on claim; the recipient's first screen is the giver's message and
  "only you enter your birth details", then the birth form. Claim by the invited email, as today.
- Birthday email: fourteen days before any profile's birthday, to every user who can see that
  profile, one gift line. No discount.

### Offers (packs only, never the single; at most 25%; one per purchase; dated catalogue rows)
| Moment | Door | Offer |
|---|---|---|
| Valentine's, 1 to 14 Feb | partners | Two of you €40 |
| Mother's Day, Father's Day | parent and child | Family €60 |
| New baby, all year | gift, parent and child | Two of you at €48, preselected |
| December, 1 to 24 | gift, Two people | Family €60; every credit in a pack sendable as a gift |
| New Year | solo, later the subscription | no discount; the year-ahead launch window when it exists |

### Marketing hooks (follow the report voice until MB-25 writes the marketing voice)
"Computed, not guessed." · "Two charts, one report, no score." · "Three for the price of two.
The third is for someone." · "Someone read a report about how you two meet. Read it too, and
read your own." (the invite email) · "What this child needs." · "Where the relationship does
its work." · "The gift that is only about them." · "Co-Star is fun. Its planets are guessed."
(once, Reddit, with the wheel) · "Your birth time changes three things. We say which."

### Measures before the first offer (MB-11)
Pack mix at checkout; invite claim rate within seven days; spare-credit use within thirty days;
gift claim rate. The GTM threshold of 20 paying customers in six weeks stays the launch test.

### Sequence
- Payments round: catalogue, Stripe test mode on staging, hard credits, the wheel paywall,
  sign-in at checkout, the three picker states, gift mode two, claim and invite copy, refunds
  page, delete cascade copy. Live keys wait on MB-31.
- Offers round, once the first window is dated: catalogue windows, promotion codes, the
  birthday email, the four measures.

### Later: the subscription (recorded, not decided)
- Shape: once a month, the current sky measured against the stored chart; which placements the
  month presses on and what to practise. Reads the report and the workbook, rewrites neither.
- Relationship line: a subscriber who is a participant in a pair gets one section per pair;
  both charts are already consented to by the pair report. Each participant subscribes alone.
- Every claimed natal report is a door: buyer, invitee, gift recipient. This loop guarantees
  that by giving every second person an account and their own report.
- Needs its own ideation: MASTERFILE §1 ("not a subscription") and R-5.2 (no dates) must be
  amended so a period may be named and an event never. Price hypothesis to test then: €6 a
  month or €48 a year, launched in the New Year window.

## Out of scope

- Report content, chapters, lenses (ADR-63, ADR-68). Composite charts (MB-17). A second
  currency. A 2-pack. Discounting the single credit. Coupon fields at checkout. Subscription
  build, name and price. Sharing a report with someone who has no account. Team or B2B plans.

## Acceptance criteria

1. Every price on the landing page, birth form, checkout, picker and receipt renders from the
   catalogue; no literal price string remains in `web/` or `api/`.
2. The birth form completes anonymously and shows the computed wheel with the price; the
   report is created only after a Stripe webhook grants the bundle; `consumeCredit` rejects
   with no credit and the picker's "Get a credit" returns to the same selection.
3. Three Stripe Prices exist in test mode on staging; a replayed webhook grants nothing twice.
4. A 3-pack buyer can write their natal, a second person's natal and the pair, and has one
   credit left; the dashboard shows "1 credit".
5. Gift mode two: a sent credit leaves the giver's balance, the recipient claims by the invited
   email, enters their own details and owns the report; the giver has no access to it.
6. An invitee who claims sees the pair report and their own natal; the buyer keeps read access;
   the invitee can remove the buyer from their natal and cannot delete the pair.
7. Deleting a profile removes its natal and every pair built on it, after a dialog naming them.
8. An offer window in the catalogue changes the checkout price and line for its pack within
   its dates and never touches the single credit; two offers never stack.
9. The refunds page states the withdrawal rule; an unspent credit refunded in Stripe is
   revoked by the webhook.
10. Typecheck, both builds, unit tests, codegen, `db:bootstrap` clean twice, staging smoke.

## Screens

All in the artifact: the two ledger models with the buyer-moment table; the four tiers; the
six-step loop; the checkout with the computed wheel and the packs; the claim page with what is
waiting and who keeps access; the dashboard "Add someone" card; the offer calendar.

## Open questions (three, each with a recommendation and a default)

1. **Ledger.** Keep one credit for any report, no compatibility add-on? Recommend yes: ADR-42
   stands and the pack captures the relationship premium. Default: yes.
2. **Prices.** €24 · €48 · €72, single never discounted, offers on packs only, at most 25%?
   Recommend yes: arithmetic a buyer can check. Default: these numbers.
3. **Checkout.** Compute the wheel first, then sign in and pay? Recommend yes: the wheel is
   the method made visible at the price, and credits need a user id anyway. Default: yes.

## Decisions to record

1. **One credit, any report, confirmed against gifting and invites.** No compatibility SKU.
   Closes MB-5's packaging half; supersedes nothing.
2. **The ladder: €24 single, €48 for three, €72 for five; a gift is one credit by link.** The
   single is never discounted; offers touch packs only, cap at 25%, one per purchase. Prices
   live in one catalogue file read by every surface. Closes MB-5.
3. **Checkout after the computed wheel, sign-in before payment, Stripe as the ledger.**
   Stripe Checkout, Tax and promotion codes; the webhook grants; credits go hard. Closes MB-6
   and MB-57.
4. **Gift mode two ships with payments** as a credit-carrying invite token claimed by email.
5. **Invitee access rule.** A participant sees every pair they are in and their own natal; the
   buyer keeps read access; the pair belongs to both and only the buyer deletes it; deleting a
   profile deletes the pairs built on it.
6. **The subscription is a later ideation** that must amend §1 and R-5.2; this loop keeps
   every claimed report subscription-ready by giving every second person an account.

## Mailbox rows to raise at lock

- Legal entity (MB-31) now blocks live keys, not the build: Stripe test mode on staging first.
- MB-24 competitor research: the €24 anchor was set against Astro.com's €30 to €50 reports and
  the GTM €19 to €29 hypothesis; a fuller sweep is still owed before the first offer window.
- Marketing voice (MB-25): the nine hooks above are the seed.
