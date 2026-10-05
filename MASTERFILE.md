# Stars Decoded — Masterfile

> A psychological self-knowledge report built on real astronomy, not a model guessing your chart.

| | |
|---|---|
| Document | Masterfile — single source of alignment |
| Version | 0.32 (2026-10-05) |
| Owner | Alex ("Owner" throughout) |
| Readers | Claude Code orchestrators, planners, builders, QA |
| Authority | This file wins over every other document except rows in the Notion **Decisions** database dated after it |
| Decisions | https://app.notion.com/p/89a14ed191cf4915826efe406bc9f835 |
| Mailbox | https://app.notion.com/p/7522fd3c9fd9450094cfdebabd205d3d |

## 0 · Reading protocol — for every agent

This file is the constitution. Orchestrators and planners read it in full once per session. Builders read §0 plus the sections their task card names. QA reads §0, §2 and §11.3.

- **R-0.1** Alignment beats output. If this file and your task conflict, stop and raise it (§12). If this file is silent and the choice is consequential, decide it or raise it as R-12.3 says. Never silently invent a product decision; a decision Claude takes is a Decisions row marked `Decided by: Claude`.
- **R-0.2** Token discipline is a feature. Follow §13. Never paste this file into other documents; cite section numbers ("per §4.2").
- **R-0.3** Anything in the Decisions database with Status `locked` is settled. Do not re-litigate. Anything open in the Mailbox waits on the Owner: do not build on it without a decision or an explicit `MB-NN provisional` tag.
- **R-0.4** The product is **Stars Decoded**. "Astra" is the inherited Replit name; never add a new use of it.
- **R-0.5** Every reply to the Owner opens with `Alex, ` alone on its first line, before any other text, in every session, until the Owner says to stop. Standing instruction from the Owner (2026-09-16); commit messages and repository files are not replies and stay unprefixed.
- **R-0.6** Delegate without being asked. When a task splits into independent parts, needs a broad search, or a long read whose conclusion is all that matters, spawn subagents (the `.claude/agents/` roles, Explore, general-purpose) in parallel and keep the conclusion. A single lookup or a one-file edit stays in the main loop. The Owner never has to request this.
- **R-0.7** Model triage. The main loop runs on the model and effort the Owner selected, except in `/round` (below); Claude never asks the Owner to change them. Every subagent gets a tier chosen at spawn time: heavy (Opus or above) for planning, feature work, refactors, security audits, algorithm design and elusive concurrency bugs, since planning and execution of the product are what matters; standard (Sonnet) for simple improvements, routine debugging, unit tests and reviews; fast (Haiku) for formatting, typo fixes, boilerplate, renames and plain file searches. Unsure means heavy. The orchestrator is the main session running `/round`, never a subagent, because in cloud sessions a subagent cannot spawn builders; the round skill pins Opus (5.5 today) at max effort (Owner, ADR-137). Every agent file pins its model and effort. The planner writes a tier on every task card (Opus at max, Sonnet at high, Haiku at medium, with one reason, from the rubric in `docs/specs/locked/agent-roster.md`), and the orchestrator spawns the builder on it; a cheaper builder that fails its gate twice gets one Opus retry (ADR-187, 188). The roster: planner, builder, tester, sentinel, qa, researcher, verifier (ADR-190). A tier the Owner names in the prompt overrides the pick for that task.

## 1 · Thesis

Stars Decoded sells one thing: a 3,500 to 5,500 word psychological report built from a natal chart that is actually computed. Birth date, time and place go in; local astronomy computes the positions; a language model writes the interpretation, grounded in a written doctrine and a per-chart brief derived in code. No predictions, no fate, no karma. The report is the product, not a subscription or a dashboard.

**Who it is for.** The self-knowledge audience, the people who already take Myers-Briggs and the Enneagram seriously. "You're not selling astrology. You're selling a structured self-knowledge report that happens to use planetary data." A second segment, parents wanting to understand a child, is the biggest differentiator and is not built yet.

**The bet.**
- **Compute, don't guess.** Positions come from `astronomy-engine`, and Chiron from a committed NASA JPL Horizons table (ADR-221), never from a model. This is the credibility position; every claim about method must be literally true.
- **Grounded writing.** The model synthesises from computed facts and a fixed doctrine, so the output cannot drift into generic horoscope prose.
- **The compatibility report is the growth engine.** Two people's birth data means every compatibility report is an invite; willingness to pay peaks at the specific-relationship moment; relationships evolve, so the report gets revisited. It is built from two finished natal reports (`docs/specs/locked/compatibility-report.md`); "synastry" is the trade word and never a buyer-facing one.
- **Quality over cost.** Inference is under 1% of a sale. Token ceilings are never tightened to save money.

| Persona | Cares about | Surface |
|---|---|---|
| Buyer | Is this real? Is it about me? Is it worth €24? | Landing page → birth form → report |
| Returning user | My reports, a second person, an invite | Dashboard |
| Invitee | What was I sent, what do I get, can I trust it | Claim page |
| Owner as admin | Prompt overrides, previews, credits | `/admin/prompts` |

## 2 · Product scope

**V1, the complete loop for one buyer:** land, understand the method, enter birth data, pay once, receive a natal report of ten chapters with House by House and a workbook of ticked actions, keep it on a dashboard, delete it on request.

1. **Landing page and seven public pages** (/sky, /sample, /method, /compatibility, two Learn pages, /faq), prerendered as real HTML for search and AI search, every claim matching the code and every chart computed (`docs/specs/locked/landing-and-ai-search.md`, ADR-107 to 119).
2. **Birth form** with geocoding, the timezone in force at the birth instant, and a three-way birth time (known, roughly, unknown) with a live readout of what the answer settles (`docs/specs/locked/unknown-birth-time.md`).
3. **Report generation** per §4, polled until complete.
4. **Report page**: ten chapters, the last one Closing, chapter 02 House by House (the wheel pinned over a deck of the generated house cards, ADR-179), the aside rail with the workbook, methodology strip, PDF via print. While it writes, the page shows true progress over an orrery of the chart; the reader opens it through a door at 67% or it opens itself at 100%, and chapters stream in behind it (`docs/specs/locked/natal-report-pass-two.md`, `natal-report-pass-three.md`).
5. **Purchase**: one-time payment granting a credit; the credit is consumed when the report is created (§6).
6. **Account**: anonymous session first, Clerk sign-in claims it, the dashboard opens on the reader's circle with the credit count (`docs/specs/locked/dashboard-sky.md`); the circle opens a quick look per person, the People and Compatibility rows open the report, then what the reader is practising, their pairs and their stories, from one `GET /home` (`docs/specs/locked/review-01-10.md`, ADR-174).
7. **Legal**: privacy, terms, refunds, who runs Stars Decoded, working deletion. One constant in `@workspace/commerce` names the seller: the Owner as a private individual until the company exists (ADR-144). The legal pages are public before launch.
8. **Admin**: runtime prompt overrides with preview, gated by `ADMIN_USER_ID`, and the Launch view that reads the loop study (ADR-148).

**V1 explicitly excludes:** predictions, daily horoscopes; transits and subscriptions (Timeline, below, is the one exception, not on sale until pricing); native mobile (the `mobile/` scaffold stays empty); a light theme; medical, therapeutic or diagnostic claims; the old chart-to-chart synastry page and dashboard zone, hidden until the compatibility report ships (ADR-45).

**V1 after payments:** the compatibility report, one product with three lenses (partners, parent and child, two people), locked 2026-09-19; its second pass, a counselling workbook of seven chapters with the two charts first, locked 2026-09-21 (`docs/specs/locked/compatibility-report-p2.md`, ADR-63 to 71). The two reports are the Personal report and the Compatibility report wherever they are named; 1 credit = 1 report of either kind (ADR-170, superseding ADR-61).

**R16, while pricing and launch wait (ADR-230, 242):** Timeline, the one subscription, sold only to an owner of a Personal natal report: the sky moving across the reader's own chart (life cycles, Now and ahead, Ask, a weekly letter), €9.99 a month or €69.99 a year with 1 credit to give. Its job is to sell more reports; R12's dashboard stays, a subscriber gains Your week after Your circle. No switch (ADR-262): a subscriber gets all of it, everyone else gets the dashboard teaser, and until billing exists the admin is the one subscriber; an Account page shows the plan and Ask's messages used out of 50 (ADR-263); its billing comes with the rest of Stripe checkout, the round after R16 (ADR-264, 282; `stripe-payments.md`). At its Release §1, this section's exclusions, R-5.2 and R-6.1 change as the spec says (`docs/specs/locked/timeline.md`, ADR-205 to 217). Its public product page `/timeline` (what it gives you, shown on Mira's chart, with the free Saturn-return finder) has no switch, shows no price until Timeline opens and is R16's first group (`docs/specs/locked/timeline-page.md`, ADR-249 to 259).

**V2 candidates (do not build, do not block):** further lenses (friends, colleagues); composite chart add-on; Placidus second view; prompt version history; transit re-runs; family bundles.

## 3 · Domain model

One Postgres schema on Supabase, owned by `packages/db`. Names are canonical; use them verbatim.

| Table | Essence | Notes |
|---|---|---|
| `profiles` | A person whose chart we computed | birth data, `chart_data` cache (versioned), `session_id`, `user_id`, `is_self`, `claimed_as_self` (the subject of a sent report says This is me) |
| `reports` | The unit of revenue | `profile_id`, `type` natal or compatibility, `status`, `interpretation` JSONB, `compute_data` |
| `users` | Clerk identity | Clerk id is the key |
| `relationships`, `relationship_participants` | Two profiles and a lens for a compatibility report | `type` partners / parent_child / people, the free label carrying family, friends or colleagues; positional `role` and `access_role` are deliberately separate |
| `invite_tokens` | Send a report, gift a credit | only the hash is stored; `kind` send, gift or share (a share writes a grant, never a hand-over, ADR-235); `handed_back_at` when its recipient handed a send back (ADR-236); a gift has no profile and carries `credit_id`, `recipient_name`, `note`; `reminded_at`, `revoked_at`; a send lives 7 days, a gift 30 (ADR-123) |
| `profile_shares` | A reader's grant to read a sharer's Personal report | `profile_id`, `owner_user_id`, `reader_user_id`, the `invite_id` that made it, `revoked_at`; one active grant per profile and reader (ADR-235) |
| `report_workbooks` | Each reader's ticks and pins on a report | key `(report_id, reader)`, the reader a Clerk id or `session:<id>`; `reports.workbook` is no longer written (ADR-239, MB-195) |
| `timeline_readings` | One Timeline reading per event per reader (R16) | unique `(profile_id, event_key)`; `basis` (chart version, birth time, window, prompt version) rewrites a stale one; `status` writing, ready or failed; no foreign key, so `forgetTimeline` removes them with the reader's own Personal report (ADR-210, MB-191) |
| `ask_messages` | Ask's thread, per account (R16) | `role` reader or ask, `body` JSONB; 50 reader messages a UTC month (ADR-263), rows older than 31 days deleted on each read or send (MB-191 provisional) |
| `prompt_templates` | Runtime prompt overrides | per key, beats the file default field by field |
| `waitlist_signups` | One address waiting for launch | `consent`, the tags and `utm_content`; `confirm_token_hash` (only the hash), `confirm_sent_at`, `confirmed_at`: an address counts once confirmed, and an unconfirmed one is deleted seven days after its latest link (ADR-145) |
| `bundles`, `credits` | Purchase ledger | one credit kind, bundles are counts (ADR-42); `is_test` marks test credits (admin grants, the QA pair); status `held` is a gift's credit until claimed or returned; the payments round adds `purchases`, `stripe_events`, `subscriptions`, `campaigns`, `testers` and a `refunded` status (`stripe-payments.md`, ADR-274 to 282) |

- **R-3.1** Birth data is never fabricated for a real person, and no placement is ever typed, in tests, fixtures, demos or docs. Fixtures hold birth data only; charts are computed at run time. A synthetic person exists only as a fixture: a structural case, or a sample person labelled as one on a marketing page (ADR-112).
- **R-3.2** `chart_data` is a cache keyed by a computation version. A change to the engine bumps the version; cached charts recompute.
- **R-3.3** Report status machine: `pending → computing → interpreting → complete | failed`, and for the horizon pass `complete → revising → complete | failed`, readable throughout; a failed pass keeps the previous text. A parse failure is a `failed` report with an error message, never a silently degraded one.
- **R-3.4** Anonymous first for looking. What a visitor creates hangs off the session cookie and is claimed by the user on sign-in; writing a report always needs an account (ADR-140).
- **R-3.5** Birth date, time and place are personal data under GDPR. Deletion = delete the report, anonymise the profile, keep the payment record. No health or clinical claims anywhere. EU-region data stores. Logs redact birth data, coordinates, email, names and Clerk ids (ADR-201). Until the company exists the Owner is the controller; the privacy page lists every processor; the waitlist uses double opt-in; page analytics are cookieless (ADR-145).
- **R-3.6** Consent. Nothing about a person (their chart, their report, their place in someone's circle) reaches anyone else until that person shares it, and Stop sharing ends the access at once (ADR-139). A shared report becomes its subject's, and its recipient's Not me hands it back to the giver (ADR-236); a pair reaches its other person only when one of its two shares it (MB-103). A reader may share their own Personal report, which seats them on the recipient's circle until they stop sharing (ADR-235). The circle is the reader plus everyone whose Personal report they can read; whoever stops sharing leaves it at once, after a dialog that names every consequence (ADR-182).

## 4 · Report engine

**The sky over time (R16, ADR-208, 251):** `packages/engine` also searches the sky with no horizon sweep: `transits.ts` (any body's place at an instant, when it reaches a point, stations, ingresses, eclipses), `doctrine.ts` and `tone.ts` (which events touch a chart, MB-188 provisional), `cycles.ts` (life's cycles birth to 90, the finder from a date at midday) and `plainWords.ts`; one access check, `timelineAccess(viewer)`, with the admin its one source until billing (ADR-262, MB-197).

The heart of the product. `api/src/lib/` is the engine; keep it pure enough that the report lab can run it against a fixture without the web app.

```
birth data → /api/geocode (Nominatim, the zone at the birth date from an offline table) → calculateNatalChart (astronomy-engine, whole sign)
  → traditional derivation (sect, dignity, rulers, Lots) → per-chart brief
  → foundation call (internal JSON) → eleven section calls in parallel (ten chapter sections and the house readings), each schema-enforced
  → each section stored as it lands → client polls /api/reports/:id/status (sections, chartReady, provisional positions) and renders chapters as they arrive
```

- **R-4.1** Positions are computed locally. A user-facing string names the real library. Never fix a wrong claim by changing the library. A place's zone is resolved on the server; a place without one is refused, never guessed from its longitude (ADR-246).
- **R-4.2** Whole sign is the only house system in the product. Placidus is a parked second view with its design already decided (Mailbox).
- **R-4.3** Every section's output is enforced by a zod schema through structured outputs. `Section | string` types are a bug, not a fallback. A check blocks only when the text would be wrong or harmful for the reader or would cost money; everything else is fixed in code, logged, or buffered 20% around the target the prompt states (`docs/annex/pair-reliability-checks.md`). A claim problem never rewrites prose. A section that exhausts its attempts gets one more round alone; a report that still fails refunds the credit and tells the customer why. Every rejected or corrected attempt is logged by rule id (ADR-81 to 85).
- **R-4.4** No prompt or engine change reaches production without the full report lab on the five matrix charts under `fixtures/charts/`, which the admin panel's Release view runs when the brain changed since production's commit, followed by the QA agent on Railway staging; both gate the fast-forward (ADR-76, ADR-86). Inside a round the lab is lighter: a dry render of every prompt at each brain change; a spot replay runs only on demand from the Lab page. Nothing spends automatically on staging, and no secret lives on GitHub (ADR-86). After every staging deploy a server-made QA pair walks the buyer's flow, payments included, on stored runs at no model cost; its verdict is read by every round (ADR-272, 273, 279). Lab spend is capped at `LAB_BUDGET_USD` (ADR-77).
- **R-4.5** A second report for the same profile skips computation. Cache on the profile, never on the request.
- **R-4.6** The horizon is a status, not a guess. Birth time is a window the engine sweeps; without a horizon that holds, the chart carries no angle, house, sect or lot, the report withholds them and its frame says so. Adding the time later is a pass that amends sentences by quote match, never a regeneration (ADR-33 to ADR-38).

## 5 · Interpretation rules

- **R-5.1** Tone, every section: second person; two friends talking over coffee, plain spoken words, never too fancy and never too trendy, counted both ways by a check that only logs (ADR-185); short sentences, simpler words over rarer ones always, one idea per sentence and no drama or poetic phrasing: a line that sounds deep is rewritten until it sounds normal (the Owner, 2026-10-03), sentences averaging 15 words or fewer and none over 25 until the prose study sets the numbers (ADR-87); no em-dashes, no semicolons as list breaks, no parenthetical asides; scannable, bullets for actions; planet names sparingly in closing prose; never repeat a phrase across sections; every sentence specific to this chart; no coined phrases, and a why clause says what the action trains in plain words. The compatibility report adds: a verdict headline, a scene that may hold a short quoted exchange, the pattern with a because-line per person from their own report, a next-time checklist; one fixed scene a chapter, "This is the challenge:" for what rubs, "room" for a real room in every report (ADR-176, 177, 240); research is doctrine and never named on the page; repetition is measured in the lab, not edited (ADR-63 to 69).
- **R-5.2** The model may describe behavioural patterns, tendencies and growth edges. It may never predict events, name dates, promise outcomes, give medical or psychological diagnoses, or invoke fate or karma.
- **R-5.3** Grounding: a section prompt is assembled from the static vocabulary and doctrine (`api/src/prompts/`) plus the per-chart brief derived in code. The model synthesises; it does not invent placement meanings. House-card readings are a section like any other (ADR-21); the Ascendant and Midheaven are citable evidence (ADR-22).
- **R-5.4** Source of truth for prompts is the section registry and `promptDefaults.ts`; overrides live in `prompt_templates` via `/admin/prompts`. Never edit a generated copy (the bible, docs). Re-sync instead.
- **R-5.5** A change to report content is USER-FACING even when no UI moved: someone who bought yesterday would get different words today.
- **R-5.6** `api/src/lib/models.ts` is the single model catalogue: every model id lives there with its price and pinned reasoning effort, and one outside it does not compile (ADR-58, 74). Every model is OpenAI's (ADR-73). Production runs mix B: gpt-6-sol writes both foundations and the vocabulary and reads for the QA agent, gpt-6-luna writes every other prose call, and gpt-5.2 stays in the catalogue as the lab's control (ADR-184, which made this move on the Owner's word). Timeline's readings run on gpt-6-luna (`MODELS.timelineReading`) and Ask on gpt-5.2 (`MODELS.ask`), MB-190 provisional. After it, a section moves to another writer only on the reading-room rule (ADR-57): quality over cost, best or tied on every fixture the Owner read blind, never would-not-ship, contract gate held. Changing any value is an engine change under R-4.4 and USER-FACING under R-5.5.

## 6 · Payments and business model

Three bundles: Single €24, Couple €54, Family & friends €72, for 1, 3 and 5 credits (ADR-142, ADR-168). Get credits opens our own `/checkout`, a Stripe Checkout Session in `elements` mode in the product's look (ADR-274). Four products are saved in Stripe from the catalogue: the three bundles and Timeline at €9.99 a month or €69.99 a year (ADR-277). The Owner sells as a private individual until 100 customers (ADR-144). Specs: `docs/specs/locked/pricing-and-launch.md`, `docs/specs/locked/stripe-payments.md` (the build, its Owner checklist). The product reaches production only once checkout exists (ADR-138); until launch production shows the public site to everyone, every call to write or sign in opens the waitlist over the page, and the app stays the admin's (ADR-167). Staging pays in Stripe's sandbox; the free test checkout is deleted, and testers get credits by admin grant on either host, excluded from revenue (ADR-276). Every Stripe key lives on Railway, none on Vercel or GitHub (ADR-280).

- **R-6.1** One-time purchase grants a bundle of credits; creating a report consumes one credit, hard, before it is written, on every host (402 `no_credit`, ADR-275). Only the birth time can change on a report: the first update is free, a second consumes a credit, a changed date or place is a new report on a new credit, and no other user regeneration exists (MB-49).
- **R-6.2** Stripe is the ledger; our tables mirror its webhooks and never compute money state on their own. Idempotency keys on every mutation. Only the webhook grants, once per Checkout Session and each event once, and only for a purchase that carries the tick; a refund or dispute takes back that purchase's unused credits (ADR-275). An active subscription is Timeline's second access source (ADR-277).
- **R-6.3** A price appears in exactly one place in code, read by the landing page, the checkout and the receipt. No literal prices in copy. That place is `packages/commerce/src/catalogue.ts`, and a gate test fails on a euro amount anywhere else; a sync makes Stripe's Products and Prices from it, found by lookup key (ADR-277).
- **R-6.4** One credit is one report, whatever the report (ADR-42). A compatibility report needs two natal reports first, so a pair always costs three credits against one; "above solo" holds at the purchase, never at the credit.
- **R-6.5** Credits are one balance: bundles stack into one count, never shown per bundle; a gift holds one credit, returned if unclaimed, and its claim moves that credit into the recipient's balance to spend on any report, puts no one in anyone's circle and shows the giver nothing the recipient makes (ADR-139); a report already written is shared ("Share with {name}", ADR-181), never gifted. The circle, the credits sheet and the path after buying are `docs/specs/locked/credit-loop.md`; no timers, streaks, badges or expiry (ADR-120 to 129).
- **R-6.6** One required tick on our checkout page, unticked, stored with the purchase (ADR-274): "Write each report as soon as I use a credit on it. I understand I can't cancel or get a refund for a credit once it's used." The receipt repeats it. Refunds: an unused credit within 14 days on request; a failed report returns its credit; any other refund is the Owner's call (ADR-143).
- **R-6.7** Offers are campaigns run from the admin, stored per environment and sent to Stripe as a coupon (ADR-278): Couple and Family & friends only, alone or together, never Single, no Timeline for now; at most 25% off, one live campaign per product, by date or through its own link, the end date printed once and no countdown (ADR-146, 281). At launch they show a launch price against the struck Singles total, never a "was" price, with no end date until the Owner sets one (ADR-169).
- **R-6.8** A gift claim opens the birth form, with Not now to the dashboard (ADR-149, amending ADR-139's landing).
- **R-6.9** The launch is organic to 100 customers, with no ads before customer 50 and a €600 cash cap; the gate at 100 decides the company (ADR-147, ADR-148).

## 7 · Architecture

```
┌─ Vercel ────────────────┐      ┌─ Railway ────────────────────────┐
│ web/  React 19 + Vite   │◄────►│ api/  Express 5                  │
│  · landing, form, report│      │  · /api/* (OpenAPI in api-spec)  │
│  · dashboard, admin     │      │  · engine (api/src/lib)          │
│  · Clerk sign-in        │      │  · OpenAI, Resend                │
└─────────────────────────┘      └───────────────┬──────────────────┘
                                 ┌─ Supabase (EU) ▼──────────────────┐
                                 │ Postgres · packages/db (drizzle)   │
                                 └────────────────────────────────────┘
Shared: packages/api-spec → Orval → api-client-react + api-zod
```

- **R-7.1** The web app talks only to `/api` through the generated client. External services (geocoding, timezones, AI, email) are called from the API; places and their zones come from `/api/geocode` and an offline zone table (ADR-246).
- **R-7.2** `packages/api-spec/openapi.yaml` is the contract. Generated files are never hand-edited; `pnpm --filter @workspace/api-spec run codegen` rewrites them. A route that is not in the spec does not exist for the client.
- **R-7.3** Schema changes: edit `packages/db/src/schema`, add an idempotent script under `packages/db/scripts` when data must move, wire it into `scripts/bootstrap-db.sh`. Railway runs the bootstrap as its pre-deploy command, so a migration that cannot run twice breaks deploys.
- **R-7.4** Secrets live only in the Vercel, Railway and Supabase dashboards. `.env.example` lists every variable the code reads, with no values. The repository is public. A hook blocks edits to `.env*`; pnpm installs no version younger than 7 days; Dependabot, `pnpm audit` and gitleaks run keyless, and Actions are pinned by SHA (ADR-191, 200).
- **R-7.5** The web calls `/api` on its own origin through the Vercel rewrites. The API sends no CORS headers, answers 403 to a write from an Origin outside `WEB_ORIGINS`, and its cookie is `SameSite=Lax; Secure`. Every response carries the security headers; the CSP ships report-only and is enforced after 7 clean days. Every route that spends or sends is rate-limited, and `DAILY_SPEND_CAP_USD` pauses generation past a day's cap (ADR-197 to 199). A per-address limit trusts Vercel's forwarded address only on a call that carries `EDGE_PROXY_SECRET`, which the Vercel edge sets and the logs never print (ADR-224).
- **R-7.6** Public pages are real HTML: the home page, the seven public pages and the legal pages prerender at build into `#root` and hydrate, so every word reaches a crawler; app routes carry noindex and unknown public paths answer 404 (ADR-114).

## 8 · Prompt operations and the bible

Two surfaces sit beside the code and must never drift from it.

- **`/admin/prompts`**: per-key overrides with preview, gated by `ADMIN_USER_ID`. An override beats the file default field by field. Dead keys are deleted, not left editable.
- **The bible** (https://claude.ai/code/artifact/7bd58e7a-995a-442e-94ea-7293d7ee3fd2): the browsable reference for what the product is, how it is positioned and what it generates. Its prompt section is generated by `bible/sync-prompts.mjs`; its release log is refreshed from round reports. Its maintenance checklist lives on the bible branch until that branch lands (Mailbox).
- **R-8.1** After any production change: re-sync prompts if they changed, update the affected bible section, add a release-log row tagged USER-FACING or INTERNAL. This is part of the deploy, not a follow-up.

## 9 · Design system

Dark only, and the direction is **Observatory** (`docs/specs/locked/natal-report-ui.md`). Near-black ground. Indigo and violet mean the product; **brass `#D4B06A` means measured chart geometry and is never a control**; element hues mean element-derived data only. Newsreader for display and ledes, Inter for body and UI, Space Grotesk for labels, **IBM Plex Mono for every degree, orb and coordinate**. Tokens live in `web/src/index.css`; the bible's design-system section reads them live and is the reference.

- **Consistency over novelty.** New visual work extends the existing tokens. A palette that breaks from the live app was rejected once and stays rejected.
- **Analytical, not mystical.** Precision is the brand signal: tabular numerals for degrees and orbs, methodology always visible, claims literal. The weight-300 display serif that pulled the other way is settled — display moves to Newsreader 400 and the numerals to a real monospace. The starfield and gradients stay, budgeted: two moves per chapter change, one easing, and reduced motion is a real state.
- **The picture is the chart.** Anything that looks like a chart is drawn from the chart. A body sits at its true degree; crowding is resolved by radius, never by moving it. The Ascendant is a point, not a body. Planet renders are bodies and never UI. The opening ring keeps the chart convention, east on the left; a label sits beside its body with no leader line; a conjunct Moon stays on the ring and the Sun steps outside it (ADR-22, ADR-27). An angle is the R03 marker: brass ring, centre point, a tick outward along the angle (ADR-49). The generation screen is its own screen with the scroll locked: every body on its own ring at its mean daily motion, settling onto the stored chart, and the door at 67% is the only way in (ADR-47, ADR-59). The compatibility hero has no ring: one centred group, each name once over its three rows, both birth records in the corners (ADR-70, ADR-99). Two people are two charts side by side, each alone: nothing draws two charts on one plate or a line from one chart's body to the other's (ADR-97); on the public pages the two plates stand on one horizon (ADR-113). A house is never a bare number: every wheel names it in its band and every house number the page prints carries its one word; the house card keeps its full title (ADR-98).
- **One accent per chapter.** Six hues in a fixed order by chapter index, identical for every reader; chapter 10, Closing, is teal and its prose reads in paper; element hues stay data, brass stays geometry (ADR-23, ADR-46). The rail lists chapters only (ADR-50); two skies: the hero owns the starfield, the gradient and the ring of stars, chapters keep their gradient, blobs and parallax, and the dawn's sun lives on the fixed layer (ADR-51, ADR-59). A why is a sentence on its own line under its action (ADR-62); evidence lives in claims only, never in prose, and prose is plain text, said in the prompt rather than checked; a link card alone names its two bodies, inside a sentence (ADR-60, ADR-104).
- **Asides: beside prose, inside a card.** A checklist means do, accent prose means sit with; ticks are the reader's workbook, saved per reader on the report (ADR-239), and a tick is silent: no counter, and a box unticks (ADR-24, ADR-48).
- **Two tempos.** The report page is slow and airy; the admin and dashboard are dense. The dashboard's one visual is its circle: plain, not a chart, so no zodiac, degree or planet render sits on it; renders and degrees appear only in its quick look, and no Unicode planet or sign glyph is used (ADR-89 to 96). A control under way becomes a status with three dots ("Generating", "Writing"), never its idle verb disabled (ADR-130).
- **Phone first; one look per kind of thing.** Every screen is designed at 390 px before desktop; a thing to try always carries its tick box and evidence always looks like the report's evidence (ADR-171, ADR-172).
- **One register.** Marketing, share cards and printables use the product's direction, not a separate campaign language.
- **The share cover is the hero as a still** (ADR-227, 228): the home page's headline beside its wheel for one stated minute over London, drawn by `pnpm brand:render`, never "Live"; a new image ships under a new file name (`docs/specs/locked/share-cover.md`).
- **The mark is the Ascendant.** The logo is A · Horizon (`docs/specs/locked/logo.md`): the wheel, its horizon line, a brass point at the eastern end; one SVG source for favicon, nav, Clerk badge, print header and email. The wordmark is "Stars Decoded" in Newsreader 400, foreground colour, never a gradient.
- **Voice.** Simple words everywhere (the Owner, 2026-10-03): the report, the site, the app, emails and posts use everyday words, one idea per sentence, no drama. Report voice is R-5.1. Every other word a user reads follows `/ux-copy` (`.claude/skills/ux-copy`): four standards (purposeful, concise, conversational, clear), one voice (exact, plain, warm, honest) and a tone for each moment, with passes for AI-writing habits and for AI search; `/web-taste` checks the look (ADR-117). A public page opens with a sentence that answers its question and names Stars Decoded (ADR-116).

## 10 · Repo and knowledge base

One monorepo. The repo holds the workflow and the specs; Notion holds the decisions and the open topics, because the repo is public and the business log is not.

```
Starsdecoded/
  CLAUDE.md                 ≤ 120 lines: pointers, commands, budgets, current focus
  MASTERFILE.md             this file
  docs/
    INDEX.md                ≤ 60 lines: map of everything below, regenerated each round
    backlog.md              Claude's own work list, B-NN lines, and the open Mailbox ids (R-12.3, R-12.7)
    specs/locked/           frozen outputs of ideation sessions
    specs/draft/            in-progress ideation
    rounds/                 RNN-plan.md and RNN-report.md
    qa/                     QA-NN.md, findings only
    annex/                  deep dives, long references, overflow from budgeted files; owner-playbook.md and
                            lessons.md, the learning loop (ADR-195)
  .claude/agents/           planner, builder (+ builder-sonnet, builder-haiku), tester, sentinel, qa, researcher, verifier;
                            the orchestrator is the main session in /round
  .claude/skills/           /ideate /lock /plan /round /qa /mailbox /report-lab /ux-copy /web-taste /marketing, a SKILL.md each
  web/ api/ packages/ scripts/ e2e/ fixtures/
Notion / STARS DECODED
  Decisions                 ADR log, one row per decision, never edited, only superseded
  Mailbox                   the Owner's open questions only, each with a recommendation and a default (R-12.3)
  GTM, Prompt rework, product log   research and history; the masterfile summarises, never duplicates
```

- **R-10.1** Default read set for any agent: `CLAUDE.md`, `docs/INDEX.md`, its own agent file. Everything else is fetched by pointer when the task needs it.
- **R-10.2** Knowledge is append-mostly. A Decisions row is never edited; a change is a new row with `Supersedes`. `docs/INDEX.md` is regenerated at the end of every round.
- **R-10.3** Annex rule: a document over its budget gets a ten-line abstract in place and its body moved to `docs/annex/`.
- **R-10.4** Notion is updated in the same session that changes the product, never later. The Owner may leave comments on Notion rows while ideating; the planner reads them at round start.

## 11 · Build process

Two alternating modes: ideation sessions with the Owner, and autonomous build rounds. Locked specs are the handoff.

### 11.1 Ideation (`/ideate <topic>`)
Explore the feature with the Owner. The Owner decides visually: every ideation publishes one HTML artifact rendering the proposal (mock screens when the UI is touched, a flow or structure otherwise, options side by side) before any question is asked or a lock proposed, and the spec links it. An ideation without an artifact is not finished. The written output is exactly one file in `docs/specs/draft/`. Each ideation reads `docs/annex/owner-playbook.md` first and adds what the session taught about how the Owner decides; research goes to the researcher (Opus) and, when it feeds a decision, the verifier (ADR-190, 195). When the Owner says "lock it", `/lock` moves it to `docs/specs/locked/` with scope, out of scope, acceptance criteria, screens, and every new decision recorded as a Decisions row. A locked spec is at most 200 lines.

### 11.2 Build rounds (`/plan`, then `/round`)
1. **Planner** reads `CLAUDE.md`, `INDEX.md`, the locked specs named by the Owner (all unplanned ones when none are named; a locked spec is a file under `docs/specs/locked/`, its slug is its id), new QA reports and the open Mailbox. Writes `docs/rounds/RNN-plan.md`: goals, task cards (≤ 15 lines each, each with its `Tier:` line) cut so they touch disjoint files wherever the work allows, at most three parallel groups (ADR-283), risks, the lessons it guards stamped `Lessons read through RNN`, Mailbox rows raised before building. Parallelism is a planning goal, not an afterthought.
2. **Approval to build** is one step, open only to a plan stamped through the last round's lessons; a plan written before that round closed is re-read against them first (ADR-265). When the Owner approves the plan, the same session runs `/round` at once and is its orchestrator (R-0.7). Nobody waits for a second instruction.
3. **Orchestrator** branches `round/RNN`, checks the plan's stamp against `lessons.md` before any dispatch (ADR-265), dispatches every builder in a parallel group in one message and the groups in order, each builder with only its card and §0.
4. **Gate**: `pnpm run typecheck` · `pnpm run build:web` · `pnpm run build:api` · the critical tests and the buyer walk, which are what guard the buyer's flow; every other test is an archive, kept and not run (ADR-273); the tester runs once, after the last group, only when the round changed the flow or a bug came back · the CSP rewritten and gitleaks over the round's diff, once, after the last group (ADR-283) · the dry lab when the brain changed (spot on demand; the full lab and the QA agent gate the release, R-4.4) · `db:bootstrap` boots clean when the schema changed · smoke (with the share preview fetched as WhatsApp and Facebook's crawler, ADR-229) and the security probe on the Vercel preview · the sentinel on the round diff, whose blocking finding stops the round until a card fixes it (ADR-193, 203). CI adds the shipped-code check and the keyless site checks: Lighthouse and axe on the public pages (ADR-192).
5. **Close**: round report (≤ 60 lines, every shipped line tagged USER-FACING or INTERNAL, with its Spend line, ADR-189), `docs/annex/lessons.md` updated with each failure's cause and a cause seen twice promoted to a rule in its agent file, once when its rule is cheap and a repeat costly, a cause fixed another way marked applied (ADR-195, 265), `INDEX.md` regenerated, `CLAUDE.md` current focus updated, Mailbox updated, pull request opened and, once the gate is green, merged by the orchestrator. The Owner never merges.
6. **Acceptance**: after the deploy, the orchestrator confirms `/api/healthz` and the web app load, runs `/qa` on staging, then hands the Owner the URL, the QA report and a three-line list of what to look at (ADR-194). Before every Release the sentinel audits all of `main` (ADR-193). The Owner answers "looks good" or says what is wrong; a "no" becomes sev-1 QA findings and the next round's first goal.

### 11.3 QA sessions (`/qa <url>`)
The Owner's only operational duty is to test the website and say whether it looks good. The QA agent plays the personas from §1 against a preview using real computed charts. Findings land in `docs/qa/QA-NN.md` with severity. The next planner treats every sev-1 as a round goal.

### 11.4 Report evals
`fixtures/charts/` holds reference people (birth data only) and structural edge cases. The report lab generates and measures a report from a fixture; it runs at four levels, dry, spot, release and reading (ADR-76), and its output goes in the round report. Fixtures grow from every real quality problem found in QA. Every lab run also lands in the staging database and is read in the admin Lab page; a model is compared by replaying a stored run with chart and foundation held fixed, and judged by the Owner blind, per section, in a reading session the Owner spawns; nothing is generated for a session before it is spawned (ADR-52 to 55, 75). After a reveal the prose study measures the picked texts against the ones passed over; a measure that holds across the cards becomes a proposed style rule, which the Owner approves into the style contract for every model (ADR-88).

## 12 · Alignment and mailbox

- **R-12.1** Ask with a recommendation. Never an open question. Format: context (one or two lines) → recommendation with reasoning → what happens if unanswered. At most three questions per session with the Owner, highest stakes first.
- **R-12.2** Instinct triggers, raise a check when: a task contradicts a locked decision; a choice affects what a buyer pays, sees or has stored about them; two specs conflict; you are about to add a dependency, change the schema, change report content, or ship anything user-visible not covered by a spec.
- **R-12.3** Three homes, nothing else (Owner, 2026-10-05). **Claude's backlog** is `docs/backlog.md`: work Claude does without a product choice (bugs, cleanup, tests, CI, copy that follows the voice chart, a builder's leftover), one line each with a `B-NN` id; Claude adds, does and deletes lines without asking. **The Decisions log** takes every consequential choice. Claude decides one itself when a rule here, a locked decision or `docs/annex/owner-playbook.md` points to the answer and none of these is at stake (what a buyer pays, sees promised or has stored about them; report direction; brand and look; pricing and launch; legal; a credential): the row says `Decided by: Claude` and the rule it followed. **The Mailbox** holds only what the Owner must decide, at most ten open rows (Owner = Alex), each with Type, Priority, Recommendation, Default if silent; an eleventh means Claude decides the least important one. A row's age is its Created time; the planner lists open rows older than 14 days at the top of the plan, oldest first (ADR-186). A security weakness too sensitive for the public repo is a Mailbox row with Owner = Claude, which the Owner's view hides.
- **R-12.5** Operations belong to Claude. Merging, watching CI and deploys, and fixing a red branch, pull request or pipeline are the orchestrator's job, raised to the Owner only when a fix needs a decision or a credential. The Owner is never asked to run a command, merge, or read a log.
- **R-12.4** Provisional building. If work must proceed on an open topic, build the recommended option behind the smallest seam and tag it `// MB-NN provisional` so it is findable when decided.
- **R-12.6** Telling the Owner. Every session that decided or raised something ends its reply with two short lists: *Decided by me* (each with its ADR) and *Needs you* (each with its MB), then the two Notion views: Claude decided (https://app.notion.com/p/89a14ed191cf4915826efe406bc9f835?v=3f0fefe7493181108ec1000c2c7263a0, unticked rows only; he ticks Alex checked once read, silence keeps the decision) and Needs Alex (https://app.notion.com/p/7522fd3c9fd9450094cfdebabd205d3d?v=3f0fefe749318130b9b5000c1a67f5bd). When he overrules one, the new row supersedes it and the playbook gains the rule his reason teaches.
- **R-12.7** Notion on the free plan. Never query a database (`notion-query-data-sources` is a Business feature here). Read a known page with fetch, find one by keyword search, and write rows with create and update. The open Mailbox rows are found from the *Waiting on Alex* list at the end of `docs/backlog.md` (ids and links only, no titles: the repo is public), kept current by every session that opens or closes one.

## 13 · Token and code budgets

| File | Budget |
|---|---|
| `CLAUDE.md` | 120 lines |
| `docs/INDEX.md` | 60 lines |
| Decisions row body | 40 lines |
| Task card | 15 lines |
| Locked spec | 200 lines (rest → annex) |
| Round report / QA report | 60 / 80 lines |
| Agent definition | 50 lines |

- **R-13.1** Comments explain why, never what. No banner comments, no JSDoc on internal functions, no commented-out code, no TODO without an `MB-NN` or `B-NN` ref. Names do the documenting.
- **R-13.2** No generated prose in the repo: no per-package READMEs beyond one line and a pointer, no CHANGELOG (round reports and the bible release log are the record), no restating specs in code.
- **R-13.3** Builders do not re-read files quoted in their card and do not open `docs/annex/` unless the card names a file. Every round report carries a Spend line: subagent tokens per tier, cards per tier, escalations (ADR-189).

## 14 · Open topics

The Owner's open questions are the Notion Mailbox, Claude's own work is `docs/backlog.md` (R-12.3). When this section was first written the blocking rows were: the false Swiss Ephemeris string, the "AI trained on Jungian astrology" claim, the promised-but-missing delete, the missing legal pages, and landing the prompt-library rework (PR #6). Pricing and launch is locked (ADR-142 to 149): the launch runs to 100 customers and its gate decides the company. Everything else is tagged `launch` or `later` with a recommendation and a default.

## 15 · Decision log

The live log is the Notion Decisions database. Seeded from the Owner's brief, the product log and the bible: the name (Stars Decoded); the stack; compute-not-guess with whole sign; the report as the one-time product with the V2 structure and tone; the compatibility report as the growth engine, one credit like any report; real chart data only; design consistency over novelty; prompts synced from their source of truth; USER-FACING / INTERNAL tagging; inference cost is not a constraint; and this process itself.

Hand this file plus the repo to the first planner. Its first duty: surface the Mailbox to the Owner.
