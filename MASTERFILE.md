# Stars Decoded — Masterfile

> A psychological self-knowledge report built on real astronomy, not a model guessing your chart.

| | |
|---|---|
| Document | Masterfile — single source of alignment |
| Version | 0.2 (2026-09-09) |
| Owner | Alex ("Owner" throughout) |
| Readers | Claude Code orchestrators, planners, builders, QA |
| Authority | This file wins over every other document except rows in the Notion **Decisions** database dated after it |
| Decisions | https://app.notion.com/p/89a14ed191cf4915826efe406bc9f835 |
| Mailbox | https://app.notion.com/p/7522fd3c9fd9450094cfdebabd205d3d |

## 0 · Reading protocol — for every agent

This file is the constitution. Orchestrators and planners read it in full once per session. Builders read §0 plus the sections their task card names. QA reads §0, §2 and §11.3.

- **R-0.1** Alignment beats output. If this file and your task conflict, stop and raise it (§12). If this file is silent and the choice is consequential, recommend and log a Mailbox row. Never silently invent a product decision.
- **R-0.2** Token discipline is a feature. Follow §13. Never paste this file into other documents; cite section numbers ("per §4.2").
- **R-0.3** Anything in the Decisions database with Status `locked` is settled. Do not re-litigate. Anything open in the Mailbox is open: do not build on it without a decision or an explicit `MB-NN provisional` tag.
- **R-0.4** The product is **Stars Decoded**. "Astra" is the inherited Replit name; never add a new use of it.

## 1 · Thesis

Stars Decoded sells one thing: a 2,000 to 2,800 word psychological report built from a natal chart that is actually computed. Birth date, time and place go in; local astronomy computes the positions; a language model writes the interpretation, grounded in a written doctrine and a per-chart brief derived in code. No predictions, no fate, no karma. The report is the product, not a subscription or a dashboard.

**Who it is for.** The self-knowledge audience, the people who already take Myers-Briggs and the Enneagram seriously. "You're not selling astrology. You're selling a structured self-knowledge report that happens to use planetary data." A second segment, parents wanting to understand a child, is the biggest differentiator and is not built yet.

**The bet.**
- **Compute, don't guess.** Positions come from `astronomy-engine`, not from a model. This is the credibility position; every claim about method must be literally true.
- **Grounded writing.** The model synthesises from computed facts and a fixed doctrine, so the output cannot drift into generic horoscope prose.
- **Synastry is the growth engine.** Two people's birth data means every relationship report is an invite; willingness to pay peaks at the specific-relationship moment; relationships evolve, so the report gets revisited.
- **Quality over cost.** Inference is under 1% of a sale. Token ceilings are never tightened to save money.

| Persona | Cares about | Surface |
|---|---|---|
| Buyer | Is this real? Is it about me? Is it worth €24? | Landing page → birth form → report |
| Returning user | My reports, a second person, an invite | Dashboard |
| Invitee | What was I sent, what do I get, can I trust it | Claim page |
| Owner as admin | Prompt overrides, previews, credits | `/admin/prompts` |

## 2 · Product scope

**V1, the complete loop for one buyer:** land, understand the method, enter birth data, pay once, receive a natal report of ten sections plus the interactive wheel, keep it on a dashboard, delete it on request.

1. **Landing page** whose every claim matches the code (§14 lists the ones that do not yet).
2. **Birth form** with geocoding and timezone resolution.
3. **Report generation** per §4, polled until complete.
4. **Report page**: ten sections, methodology box, chart wheel, PDF via print.
5. **Purchase**: one-time payment granting a credit; the credit is consumed when the report is created (§6).
6. **Account**: anonymous session first, Clerk sign-in claims it, dashboard lists reports.
7. **Legal**: privacy, terms, refunds, company details, working deletion.
8. **Admin**: runtime prompt overrides with preview, gated by `ADMIN_USER_ID`.

**V1 explicitly excludes:** predictions, transits, daily horoscopes; subscriptions; native mobile (the `mobile/` scaffold stays empty); a light theme; medical, therapeutic or diagnostic claims; synastry in the public UI until §14 says otherwise.

**V2 candidates (do not build, do not block):** synastry launch with romantic, parent-child and family variants; composite chart add-on; Placidus second view; prompt version history; transit re-runs; family bundles.

## 3 · Domain model

One Postgres schema on Supabase, owned by `packages/db`. Names are canonical; use them verbatim.

| Table | Essence | Notes |
|---|---|---|
| `profiles` | A person whose chart we computed | birth data, `chart_data` cache (versioned), `session_id`, `user_id`, `is_self` |
| `reports` | The unit of revenue | `profile_id`, `type` natal or synastry, `status`, `interpretation` JSONB, `compute_data` |
| `users` | Clerk identity | Clerk id is the key |
| `relationships`, `relationship_participants` | Two or more profiles for synastry | positional `role` and `access_role` are deliberately separate |
| `invite_tokens` | Invite a second person | only the hash is stored, 7-day TTL |
| `prompt_templates` | Runtime prompt overrides | per key, beats the file default field by field |
| `bundles`, `credits` | Purchase ledger | kinds solo / couple / family; credit types natal / couple / parent_child |

- **R-3.1** Birth data is never fabricated, in tests, fixtures, demos or docs. Fixtures hold birth data only; charts are computed at run time.
- **R-3.2** `chart_data` is a cache keyed by a computation version. A change to the engine bumps the version; cached charts recompute.
- **R-3.3** Report status machine: `pending → computing → interpreting → complete | failed`. A parse failure is a `failed` report with an error message, never a silently degraded one.
- **R-3.4** Anonymous first. Everything a visitor creates hangs off the session cookie and is claimed by the user on sign-in. Nothing requires an account until the dashboard.
- **R-3.5** Birth date, time and place are personal data under GDPR. Deletion = delete the report, anonymise the profile, keep the payment record. No health or clinical claims anywhere. EU-region data stores.

## 4 · Report engine

The heart of the product. `api/src/lib/` is the engine; keep it pure enough that the report lab can run it against a fixture without the web app.

```
birth data → geocode (Nominatim + timeapi) → calculateNatalChart (astronomy-engine, whole sign)
  → traditional derivation (sect, dignity, rulers, Lots) → per-chart brief
  → foundation call (internal JSON) → ten section calls in parallel, each schema-enforced
  → assemble → reports.interpretation → client polls /api/reports/:id/status
```

- **R-4.1** Positions are computed locally. A user-facing string names the real library. Never fix a wrong claim by changing the library.
- **R-4.2** Whole sign is the only house system in the product. Placidus is a parked second view with its design already decided (Mailbox).
- **R-4.3** Every section's output is enforced by a zod schema through structured outputs. `Section | string` types are a bug, not a fallback.
- **R-4.4** No prompt or engine change ships without the report lab run against the committed chart fixtures under `fixtures/charts/`, with the measurement pasted in the round report.
- **R-4.5** A second report for the same profile skips computation. Cache on the profile, never on the request.

## 5 · Interpretation rules

- **R-5.1** Tone, every section: second person; short sentences; no em-dashes, no semicolons as list breaks, no parenthetical asides; scannable, bullets for actions; planet names sparingly in closing prose; never repeat a phrase across sections; every sentence specific to this chart.
- **R-5.2** The model may describe behavioural patterns, tendencies and growth edges. It may never predict events, name dates, promise outcomes, give medical or psychological diagnoses, or invoke fate or karma.
- **R-5.3** Grounding: a section prompt is assembled from the static vocabulary and doctrine (`api/src/prompts/`) plus the per-chart brief derived in code. The model synthesises; it does not invent placement meanings.
- **R-5.4** Source of truth for prompts is the section registry and `promptDefaults.ts`; overrides live in `prompt_templates` via `/admin/prompts`. Never edit a generated copy (the bible, docs). Re-sync instead.
- **R-5.5** A change to report content is USER-FACING even when no UI moved: someone who bought yesterday would get different words today.
- **R-5.6** Model ids are hard-coded at the call sites today (`gpt-5.2`). Changing the model is an engine change under R-4.4.

## 6 · Payments and business model

Nothing is sold yet. The credits ledger exists; the purchase path does not. Pricing is open (Mailbox).

- **R-6.1** One-time purchase grants a bundle of credits; creating a report consumes one credit, hard. The soft pass in `consumeCredit` ends the day payments go live.
- **R-6.2** Once a payment provider exists, it is the ledger; our tables mirror its webhooks and never compute money state on their own. Idempotency keys on every mutation.
- **R-6.3** A price appears in exactly one place in code, read by the landing page, the checkout and the receipt. No literal prices in copy.
- **R-6.4** Synastry is priced above solo natal, never at parity.

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

- **R-7.1** The web app talks only to `/api` through the generated client. External services (geocoding, timezones, AI, email) are called from the API. The browser-side Nominatim call is a known exception in the Mailbox.
- **R-7.2** `packages/api-spec/openapi.yaml` is the contract. Generated files are never hand-edited; `pnpm --filter @workspace/api-spec run codegen` rewrites them. A route that is not in the spec does not exist for the client.
- **R-7.3** Schema changes: edit `packages/db/src/schema`, add an idempotent script under `packages/db/scripts` when data must move, wire it into `scripts/bootstrap-db.sh`. Railway runs the bootstrap as its pre-deploy command, so a migration that cannot run twice breaks deploys.
- **R-7.4** Secrets live only in the Vercel, Railway and Supabase dashboards. `.env.example` lists every variable the code reads, with no values. The repository is public.
- **R-7.5** Web and API are separate origins, so the session cookie is `SameSite=None; Secure` in production. Serving both from one origin means turning `CROSS_SITE_COOKIES` off.

## 8 · Prompt operations and the bible

Two surfaces sit beside the code and must never drift from it.

- **`/admin/prompts`**: per-key overrides with preview, gated by `ADMIN_USER_ID`. An override beats the file default field by field. Dead keys are deleted, not left editable.
- **The bible** (https://claude.ai/code/artifact/7bd58e7a-995a-442e-94ea-7293d7ee3fd2): the browsable reference for what the product is, how it is positioned and what it generates. Its prompt section is generated by `bible/sync-prompts.mjs`; its release log is refreshed from round reports. Its maintenance checklist lives on the bible branch until that branch lands (Mailbox).
- **R-8.1** After any production change: re-sync prompts if they changed, update the affected bible section, add a release-log row tagged USER-FACING or INTERNAL. This is part of the deploy, not a follow-up.

## 9 · Design system

Dark only. Near-black ground, indigo/violet accent, Noto Serif for display, Inter for body and UI, Space Grotesk for labels. Tokens live in `web/src/index.css`; the bible's design-system section reads them live and is the reference.

- **Consistency over novelty.** New visual work extends the existing tokens. A palette that breaks from the live app was rejected once and stays rejected.
- **Analytical, not mystical.** Precision is the brand signal: tabular numerals for degrees and orbs, methodology always visible, claims literal. The starfield, gradients and weight-300 display serif pull the other way and are an open design topic (Mailbox), not licence to restyle piecemeal.
- **Two tempos.** The report page is slow and airy; the admin and dashboard are dense.
- **Voice.** Report voice is R-5.1. Marketing voice is not written yet (Mailbox); until it is, marketing copy follows the same rules: short, specific, no mysticism, no claims the code cannot back.

## 10 · Repo and knowledge base

One monorepo. The repo holds the workflow and the specs; Notion holds the decisions and the open topics, because the repo is public and the business log is not.

```
Starsdecoded/
  CLAUDE.md                 ≤ 120 lines: pointers, commands, budgets, current focus
  MASTERFILE.md             this file
  docs/
    INDEX.md                ≤ 60 lines: map of everything below, regenerated each round
    specs/locked/           frozen outputs of ideation sessions
    specs/draft/            in-progress ideation
    rounds/                 RNN-plan.md and RNN-report.md
    qa/                     QA-NN.md, findings only
    annex/                  deep dives, long references, overflow from budgeted files
  .claude/agents/           planner, orchestrator, builder, qa
  .claude/commands/         /ideate /lock /plan /round /qa /mailbox
  web/ api/ packages/ scripts/ e2e/ fixtures/
Notion / STARS DECODED
  Decisions                 ADR log, one row per decision, never edited, only superseded
  Mailbox                   open topics: decision | gap | todo | idea, each with a recommendation and a default
  GTM, Prompt rework, product log   research and history; the masterfile summarises, never duplicates
```

- **R-10.1** Default read set for any agent: `CLAUDE.md`, `docs/INDEX.md`, its own agent file. Everything else is fetched by pointer when the task needs it.
- **R-10.2** Knowledge is append-mostly. A Decisions row is never edited; a change is a new row with `Supersedes`. `docs/INDEX.md` is regenerated at the end of every round.
- **R-10.3** Annex rule: a document over its budget gets a ten-line abstract in place and its body moved to `docs/annex/`.
- **R-10.4** Notion is updated in the same session that changes the product, never later. The Owner may leave comments on Notion rows while ideating; the planner reads them at round start.

## 11 · Build process

Two alternating modes: ideation sessions with the Owner, and autonomous build rounds. Locked specs are the handoff.

### 11.1 Ideation (`/ideate <topic>`)
Explore the feature with the Owner, visually where it helps. Output is exactly one file in `docs/specs/draft/`. When the Owner says "lock it", `/lock` moves it to `docs/specs/locked/` with scope, out of scope, acceptance criteria, screens, and every new decision recorded as a Decisions row. A locked spec is at most 200 lines.

### 11.2 Build rounds (`/plan`, then `/round`)
1. **Planner** reads `CLAUDE.md`, `INDEX.md`, new locked specs, new QA reports and the open Mailbox. Writes `docs/rounds/RNN-plan.md`: goals, task cards (≤ 15 lines each), risks, Mailbox rows raised before building.
2. **Orchestrator** branches `round/RNN`, spawns one builder per card (parallel when files are disjoint), each with only its card and §0.
3. **Gate**: `pnpm run typecheck` · `pnpm run build:web` · `pnpm run build:api` · unit tests · report lab against fixtures when the engine or prompts changed · `db:bootstrap` boots clean when the schema changed · smoke on the Vercel preview.
4. **Close**: round report (≤ 60 lines, every shipped line tagged USER-FACING or INTERNAL), `INDEX.md` regenerated, `CLAUDE.md` current focus updated, Mailbox updated, pull request opened and, once the gate is green, merged by the orchestrator. The Owner never merges.
5. **Acceptance**: after the deploy, the orchestrator confirms `/api/healthz` and the web app load, then hands the Owner the URL and a three-line list of what to look at. The Owner answers "looks good" or says what is wrong; a "no" becomes sev-1 QA findings and the next round's first goal.

### 11.3 QA sessions (`/qa <url>`)
The Owner's only operational duty is to test the website and say whether it looks good. The QA agent plays the personas from §1 against a preview using real computed charts. Findings land in `docs/qa/QA-NN.md` with severity. The next planner treats every sev-1 as a round goal.

### 11.4 Report evals
`fixtures/charts/` holds reference people (birth data only) and structural edge cases. The report lab generates and measures a report from a fixture; it runs before any prompt change ships and its output goes in the round report. Fixtures grow from every real quality problem found in QA.

## 12 · Alignment and mailbox

- **R-12.1** Ask with a recommendation. Never an open question. Format: context (one or two lines) → recommendation with reasoning → what happens if unanswered. At most three questions per session with the Owner, highest stakes first.
- **R-12.2** Instinct triggers, raise a check when: a task contradicts a locked decision; a choice affects what a buyer pays, sees or has stored about them; two specs conflict; you are about to add a dependency, change the schema, change report content, or ship anything user-visible not covered by a spec.
- **R-12.3** Mailbox. Uncertainties that do not block work go to the Notion Mailbox so nothing is forgotten. Each row: Type, Priority, Raised by, Recommendation, Default if silent. The planner increments `Rounds open` each round; a row above 2 goes to the top of the round report.
- **R-12.5** Operations belong to Claude. Merging, watching CI and deploys, and fixing a red branch, pull request or pipeline are the orchestrator's job, raised to the Owner only when a fix needs a decision or a credential. The Owner is never asked to run a command, merge, or read a log.
- **R-12.4** Provisional building. If work must proceed on an open topic, build the recommended option behind the smallest seam and tag it `// MB-NN provisional` so it is findable when decided.

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

- **R-13.1** Comments explain why, never what. No banner comments, no JSDoc on internal functions, no commented-out code, no TODO without an `MB-NN` ref. Names do the documenting.
- **R-13.2** No generated prose in the repo: no per-package READMEs beyond one line and a pointer, no CHANGELOG (round reports and the bible release log are the record), no restating specs in code.
- **R-13.3** Builders do not re-read files quoted in their card and do not open `docs/annex/` unless the card names a file. The orchestrator notes token spend in the round report when a round felt heavy.

## 14 · Open topics

The live list is the Notion Mailbox. As of this version the blocking rows are: the false Swiss Ephemeris string, the "AI trained on Jungian astrology" claim, the promised-but-missing delete, the missing legal pages, and landing the prompt-library rework (PR #6). The next ideation session is pricing and packaging. Everything else is tagged `launch` or `later` with a recommendation and a default.

## 15 · Decision log

The live log is the Notion Decisions database. Seeded from the Owner's brief, the product log and the bible: the name (Stars Decoded); the stack; compute-not-guess with whole sign; the report as the one-time product with the V2 structure and tone; synastry as the growth engine priced above natal; real chart data only; design consistency over novelty; prompts synced from their source of truth; USER-FACING / INTERNAL tagging; inference cost is not a constraint; and this process itself.

Hand this file plus the repo to the first planner. Its first duty: surface the Mailbox to the Owner.
