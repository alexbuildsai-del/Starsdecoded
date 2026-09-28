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
