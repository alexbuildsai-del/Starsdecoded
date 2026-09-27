# R07 plan — the model matrix: the lab in the admin panel, sessions on spawn, the lab at release

Planned 2026-09-24 on `claude/report-lab-model-matrix-rz5vet` for the locked spec the Owner named,
`report-lab-model-matrix`. **Read the 2026-09-24 relock, not the file on `main`.** The spec was
re-locked today (ADR-73 to 77, locked in Notion). The new text sits on the unmerged docs-only branch
`claude/wizardly-fermat-d00h0n` at `eb6b477`: spec, annex `docs/annex/report-lab-model-matrix-annex.md`
(the 09-21 base scope), MASTERFILE 0.10 (R-4.4, R-5.6, §11.2, §11.4), INDEX and CLAUDE.md. Decisions
rows dated after the masterfile win (Authority), so this plan builds the relock on the base scope.
- **Groq is out** (ADR-73). There is no provider field, no `GROQ_API_KEY` and no providers light. The
  CLAUDE.md line "needs the Groq key on Railway" is stale; the relock branch already rewrites it.
- **Candidates** are gpt-6-sol and gpt-6-luna against gpt-5.2. Each catalogue entry pins its
  reasoning effort (ADR-74).
- **Nothing is generated before the Owner spawns a session.** *Matrix* becomes *Spawn a session*,
  and text loads per card (ADR-75).
- **The lab runs at four levels:** dry, spot, release and reading. The release lab gates Promote
  (ADR-76). Spend is capped by `LAB_BUDGET_USD` at $15 a month, the lab stops at the first
  out-of-credit 429, and replays use Flex (ADR-77).
No QA report exists. No card here changes a word a customer reads, so every line is INTERNAL.

## Mailbox rows above 2 rounds open after this plan's increment

At **6**: MB-5, 6, 8, 11, 12, 13, 15, 17, 19, 20, 21, 22, 23, 24, 25, 30. At **5**: MB-31 (blocking:
the legal entity), MB-33, MB-35. At **3**: MB-43, 47, 49, 50. None of them blocks a card here.
**MB-68** (blocking, at 1): the OpenAI key has no credits. It blocks every paid acceptance step
below, but no card. Raised today: MB-69 (blocking: `LAB_TOKEN`), MB-70, MB-71 and MB-72.

## Goals

1. **Lab spend is bounded and visible before anything spends** (ADR-77; MB-68 blocking). This
   covers the budget sum from `lab_runs`, the stop at the first out-of-credit 429, Flex on
   replays, and the month-to-date figure in the panel. Every card merges with zero spend.
2. **Runs and replay live on the server** (base scope 2 to 4; relock scope 1, 3 and 5). It
   covers the lab tables, gpt-6-sol and gpt-6-luna with a pinned reasoning effort, the replay
   with chart and foundation held, the dry render (level 0), the spot replay (level 1), and
   `--publish` of the stored r05 and r06 runs.
3. **The admin Lab page** at `/admin/report-lab` (base scope 5; ADR-75). Four views: *Runs*
   with numbers only, *Spawn a session* with the estimate first, the blind *Reading room*, and
   *Reveal*.
4. **The release gate in Promote** (ADR-76; relock scope 6). The full natal lab runs only when
   the brain changed since production's commit. It fast-forwards only when there is no new
   fault, the bands hold and the cost is within 10% of the last release.
5. **The rules say the four levels** (relock scope 7). This covers the report-lab and round
   skills, the orchestrator's trigger narrowed to the brain, and `.env.example`.

## Preconditions

1. **Merge the relock first.** `claude/wizardly-fermat-d00h0n` (docs only) merges into `main`,
   and `round/R07` branches from that. It is based on `aa326d4`, before #60. Its CLAUDE.md and
   INDEX hunks touch lines #60 did not, and the orchestrator resolves any conflict in favour of
   #60's rename. Builders read the spec and annex from that merge.
2. Every builder reads MASTERFILE §0, the sections its card names and the artifact
   https://claude.ai/artifact/RRnfSk9Ci3VwxapoXwi6ub (version 4) for the spawn form, the card
   and the reveal table. Nothing from the artifact is ported literally.
3. **Single owners.**
   - Wave A: `packages/db/src/schema`, the migration and `scripts/bootstrap-db.sh` belong to
     R07-01. `api/src/lib/models.ts`, `aiInterpretation.ts` and `usage.ts` belong to R07-02.
     `scripts/src/report-lab.ts` and `api/src/lib/labRules.ts` belong to R07-03.
     `web/src/pages/AdminLabPage.tsx`, `web/src/lib/labApi.ts`, `web/src/App.tsx` and the
     admin sidebar in `AdminPromptsPage.tsx` belong to R07-06. `.github/workflows/*` belongs
     to R07-09.
   - Wave B: `api/src/routes/index.ts`, `api/package.json` and `pnpm-lock.yaml` belong to
     R07-04.
4. The pinned shapes below are the contract between parallel cards. Inside a wave a card may
   land before the card it imports from, and the orchestrator accepts a red intermediate until
   the wave ends, as in R05 and R06. A builder who needs a pinned shape changed stops and
   raises it (R-0.1).
5. **No card spends.** Paid checks are listed under Acceptance and wait for MB-68. The round
   may merge with them pending, recorded in the round report, as R06 did with `pair`.

## Pinned shapes

- **Catalogue entry.** `{ input, cachedInput, output, reasoningEffort, flex, checked? }`.
  - `reasoningEffort` is sent on every call. gpt-5.2 is `none`. gpt-6-sol and gpt-6-luna are
    `none` (ADR-74). gpt-5-mini and gpt-5-nano are `minimal`, because they reject `none`.
  - `flex` is `false` until MB-70 confirms it. `checked` is an ISO date, empty under
    `// MB-70 provisional`.
  - `MODELS` and `SECTION_MODELS` do not move.
- **Engine hook.** `writeSection(sectionKey, chart, name, foundationJson | undefined,
  { model, serviceTier })` returns `SectionResult<unknown>`. It goes through the customer's
  `callSection`: the same prompt, schema, validator, claims-only retry and caps.
  - `natal:foundation` with no foundation argument writes a foundation.
  - `callStructured` gains `serviceTier?: "flex" | "standard"`. It sends `service_tier:
    "flex"` only when asked and the catalogue says `flex`.
  - A 429 whose code is `insufficient_quota` throws `OutOfCreditError` and is never retried.
- **`lab_runs`**, one row per run and section:
  - Identity: `id`, `run_key` (`<fixture>.<label>` or `replay:<uuid>`), `fixture`, `label`,
    `source` (`lab | replay | report`).
  - Base: `base_run_key`, `base_report_id`. Model: `section`, `model`, `reasoning_effort`,
    `service_tier`. Job: `status` (`queued | running | done | failed`), `error`.
  - Content: `output` jsonb, plus `chart` jsonb and `subject_name` on the `foundation` row of a
    `lab` run only.
  - Measures: `usage`, `faults` (default `[]`), `words`, `cost_usd`, `seconds`. Links:
    `session_id`, `created_at`. `unique (run_key, section)`.
  - A replay on an admin report reads that report's chart and foundation at run time and never
    copies them into `lab_runs`.
- **`lab_judgements`**, one row per card:
  - Identity: `id`, `session_id`, `session_label`, `fixture`, `section`, `card_index`.
  - Blind order: `variants` jsonb, the `lab_runs` ids in the stored shuffled order, where a
    letter is an index.
  - Picks: `picks` jsonb `{ best: number[], notShip: number[], same: number[][] }`, then
    `note`, `judged_at`, `revealed_at`, `created_at`.
- **Routes**, all under `/api/admin/lab`, outside `openapi.yaml` like `/admin/prompts`.
  - `labGuard` admits the Clerk admin (`ADMIN_USER_ID`) or `Authorization: Bearer $LAB_TOKEN`,
    compared in constant time. Without `LAB_TOKEN` set, the bearer path is off.
  - Mutations answer 405 under `PROMPTS_READ_ONLY`.
  - R07-04 serves: `GET /runs` (numbers only), `POST /runs` (a lab run file, replaced by
    `run_key`), `GET /compare?a=&b=`, `GET /dry?base=<label>`, `GET /spend`,
    `POST /replay {baseRunKey | baseReportId, model, sections[], serviceTier}` and
    `GET /replay/:runKey`.
  - R07-05 serves: `POST /sessions/estimate`, `POST /sessions`, `GET /sessions`,
    `GET /sessions/:id`, `GET` and `PUT /sessions/:id/cards/:cardId`, and
    `GET /sessions/:id/reveal` (409 until the last card is judged).
  - A refusal over budget is 409 `{ error: "lab_budget", spentUsd, budgetUsd }`.
- **Writers in a session.** Any `CATALOGUE` id. `stored` is the base text, at no cost.
  `control` is a fresh gpt-5.2 replay, hidden as a writer, and never named before the reveal.
- **Script flags.**
  - `--publish <fixture>.<label>[,…]`, `--dry --base <label>`,
    `--spot <sections|pipeline> --charts a,b --base <label>`, `--release <label>`,
    `--gate <label> --against <label|last-release>` (exit 1 with the reasons), and
    `--stub <label> --from <label> [--seed-fault]`.
  - The script reads `LAB_TOKEN` and `LAB_API` (defaults to `--remote`).
  - `--all` is the five matrix charts: day-angular, high-latitude, marie-curie, night-angular
    and audrey-hepburn.
- **Brain paths** (the release gate and the spot job): `api/src/prompts/`,
  `api/src/lib/models.ts`, `aiInterpretation.ts`, `traditional.ts` and `chartCalculation.ts`.

---

## Wave A — the tables, the engine hook, the script, the page and the workflows

Dispatch R07-01, 02, 03, 06, 07, 08 and 09 in one message.

### R07-01 — Lab tables (INTERNAL) · Sonnet
Objective: store runs and judgements in the staging database.
Files: new `packages/db/src/schema/labRuns.ts` and `labJudgements.ts`; `schema/index.ts`; new
`packages/db/scripts/migrate-add-lab-tables.ts`; `scripts/bootstrap-db.sh` (step 3g).
Refs: MASTERFILE §3 and R-7.3; annex scope 2; pinned `lab_runs` and `lab_judgements`.
Done when:
- Both tables and their indexes (`run_key`, `session_id`, `created_at`) exist as pinned.
- The migration runs three times on a scratch Postgres with the same result.
- `db:bootstrap` runs twice on a fresh database and is green.
- Typecheck is green.

### R07-02 — Catalogue, pinned effort, Flex and out-of-credit (INTERNAL, brain) · Opus — provisional MB-70
Objective: the engine can write one section on any catalogued model at a chosen tier, and the
customer path stays untouched.
Files: `api/src/lib/models.ts` (+ test), `api/src/lib/aiInterpretation.ts` (+ test),
`api/src/lib/usage.ts` (+ test).
Refs: ADR-58, 73, 74, 77; MASTERFILE §4, R-4.3 and R-5.6; relock scope 1 and 3.
Done when:
- gpt-6-sol and gpt-6-luna enter at ADR-74's prices, tagged `// MB-70 provisional`. Every entry
  pins `reasoningEffort` and `flex` as pinned.
- `callStructured` sends the effort on every call, and the tier only on request.
- `writeSection` and `OutOfCreditError` are exported as pinned.
- `usage.ts` prices a Flex call at half.
- Unit tests cover: an id outside the catalogue does not compile; mini sends `minimal`; Flex is
  refused where `flex` is false; `insufficient_quota` throws without retry.
- `MODELS` and `SECTION_MODELS` are unchanged.

### R07-03 — labRules, the guards, publish, dry, spot, release, gate and stub (INTERNAL) · Opus
Objective: one script drives every lab level and posts every run it makes to the panel.
Files: `scripts/src/report-lab.ts` and `report-lab.test.ts`; new `api/src/lib/labRules.ts`
(+ test).
Refs: annex scope 3 and 4; relock "When the lab runs" and "Guards"; ADR-76, ADR-77; MB-72.
Done when:
- The regex fault rules, the banned characters, method-talk and the band checks move to
  `labRules.ts`, and both sides import them.
- The flags work as pinned, and `--all` is the five matrix charts.
- A campaign stops at the first out-of-credit failure and names it.
- `--release` refuses beyond `GET /spend`.
- `--gate` fails on a new fault, a report total outside 3,500 to 5,500, or a cost more than 110%
  of the reference. With no earlier release, it compares against `r06`.
- Tests cover `--gate` on a stored pair and on a seeded fault. `--render` and `--compare`
  still run offline.

### R07-06 — The Lab page, *Runs* and the spend line (INTERNAL, UI) · Sonnet
Objective: the page exists beside Prompts and shows what ran, with no text and no spend.
Files: new `web/src/pages/AdminLabPage.tsx`, `web/src/lib/labApi.ts`,
`web/src/components/lab/RunsView.tsx`; `web/src/App.tsx`; the sidebar in `AdminPromptsPage.tsx`.
Refs: annex scope 5 (*Runs*); ADR-75, ADR-77; MASTERFILE §9 (dense admin tempo).
Done when:
- `/admin/report-lab` is gated like `/admin/prompts`.
- The tabs are Runs, Spawn a session, Reading room and Reveal. The other three mount R07-07's
  and R07-08's exports.
- *Runs* lists runs by fixture and label with per-section words, cost, seconds and faults, and
  compares any two labels.
- The header shows the month to date against the budget.
- The network tab shows no report text and no replay call (relock acceptance 2).

### R07-07 — *Spawn a session* (INTERNAL, UI) · Sonnet
Objective: the Owner ticks bases, sections, charts and writers, sees the spend, then spawns.
Files: new `web/src/components/lab/SpawnView.tsx`.
Refs: ADR-75; relock "The reading room" 1 and 2; annex scope 5 (*Matrix* renamed).
Done when:
- A base can be a label or one of the admin's own reports, listed by id and name. No birth data
  is shown or sent.
- The four first-session sections are ticked by default, career first.
- The writers are the catalogue ids, `stored` and a hidden-control switch that is on by default.
- The estimate (standard and Flex) comes from `POST /sessions/estimate` and shows before
  **Spawn** is enabled. An over-budget estimate disables it and says why.
- After spawn, the view polls until the room is ready.

### R07-08 — *Reading room* and *Reveal* (INTERNAL, UI) · Opus
Objective: the blind judgement and its reveal.
Files: new `web/src/components/lab/ReadingRoom.tsx`, `RevealView.tsx` and
`web/src/lib/labCards.ts` (+ test).
Refs: annex scope 5 (room and reveal); ADR-54, ADR-57, ADR-75; base acceptance 4 and 5.
Done when:
- A card loads its variants only when opened, as A, B, C… in the stored order, with no model,
  cost or fault.
- Each variant has **best**, **would not ship** and *same as*, and each card has one note.
- A pick saves at once, and the room reopens on the first unjudged card, career first.
- *Reveal* is disabled until every card is judged. It then shows per writer the best, tied and
  not-shippable counts by section and tier, with faults, words and cost. Per mix it shows the
  cost and the sections marked worse than 5.2, and the control's agreement rate as the noise
  floor.
- Older sessions stay readable. A pure test covers tie groups and the next-card order.

### R07-09 — Workflows: campaigns, the spot job and the release gate (INTERNAL) · Opus
Objective: the lab levels run from CI with no key in the repository.
Files: `.github/workflows/report-lab.yml`, `promote.yml` and new `lab-spot.yml`.
Refs: ADR-76; relock "The release gate" and acceptance 5; MASTERFILE R-12.5; MB-69.
Done when:
- `report-lab.yml` gains the campaigns `dry`, `spot`, `release`, `stub` and `publish`, a
  `workflow_call` trigger, and `environment: staging` for `LAB_TOKEN`.
- `lab-spot.yml` runs after a green staging Smoke when brain paths changed. Section files map
  to their sections, and anything else is `pipeline`.
- `promote.yml` diffs brain paths between production and the SHA. When they are unchanged it
  skips; when they changed it calls `release`, then `--gate`, and fast-forwards only on green.
  It fails closed without `LAB_TOKEN`.
- A `dry_run` input runs the gate and skips the push.

---

## Wave B — the routes and the rules

Dispatch R07-04, 05 and 10 in one message.

### R07-04 — Runs, compare, dry, spend and replay routes (INTERNAL) · Opus — provisional MB-71
Objective: the server side of levels 0 and 1, with the budget guard.
Files: new `api/src/routes/adminLab.ts`, `api/src/lib/labGuard.ts`, `api/src/lib/labReplay.ts`
(+ test); `api/src/routes/index.ts` (mounts both lab routers); `api/package.json`
(`gpt-tokenizer`); `pnpm-lock.yaml`.
Refs: annex scope 3 and 4; relock scope 3, 5 and 6; ADR-52, 53, 76, 77; R-3.5; MB-71.
Done when:
- The routes behave as pinned.
- Replay runs as a job through `writeSection`, one row per section, with no `reports` row and no
  credit. A foundation replay writes the foundation first.
- `/dry` renders through `previewSectionPrompt` for the base's five charts. It returns input
  tokens against the baseline, a schema check, and whether each catalogue id is served
  (`models.list`), with zero usage recorded.
- Tests cover the budget refusal at `LAB_BUDGET_USD=0`, `OutOfCreditError` stopping a job after
  one section, and the guard's token path.

### R07-05 — Sessions: estimate, spawn, cards, picks and reveal (INTERNAL) · Opus
Objective: a session is exactly the ticked cards. It is generated on spawn and judged blind.
Files: new `api/src/routes/adminLabSessions.ts`, `api/src/lib/labSession.ts` (+ test).
Refs: ADR-54, 55, 57, 75; annex scope 5; relock acceptance 3; base acceptance 4 and 5.
Done when:
- The estimate prices each card from the base run's per-section token shape at each writer's
  price, standard and Flex.
- Spawn creates one card per fixture and section, shuffles once and stores the order, and
  starts replays only for missing writers through `labReplay`. A failed replay retries once,
  then its column drops and is named at the reveal.
- Cards return text without model, cost or faults, and a PUT saves picks and the note.
- The reveal returns 409 until the last card, then the tables.
- A second session on the same runs starts blank. Pure tests cover the shuffle, the estimate
  and the tallies.

### R07-10 — The rules say four levels (INTERNAL, docs) · Sonnet
Objective: every instruction a session reads names the same lab.
Files: `.claude/skills/report-lab/SKILL.md`, `.claude/skills/round/SKILL.md`,
`.claude/agents/orchestrator.md`, `.env.example`, and CLAUDE.md's commands and brain paragraph
(not Current focus).
Refs: ADR-76, ADR-77; relock scope 7; MASTERFILE R-4.4 and §11.4 as amended by the relock.
Done when:
- The skill documents the panel, `--publish`, the four levels, the budget and "never generate
  to look".
- The orchestrator's trigger reads "the brain paths", not "anything in `api/src/lib/`".
- `.env.example` lists `LAB_TOKEN` and `LAB_BUDGET_USD` with no values.
- No file is over its budget, and no Groq mention remains outside history.

---

## Acceptance (spec criteria; the ones with spend wait for MB-68)

**Free**, in the round:
- Typecheck, both builds, unit tests, and `db:bootstrap` twice.
- `--publish` of r05 and r06 lands under *Runs* with the printed costs. audrey-hepburn's M0 is
  `audrey-hepburn.r06` (MB-72, needs MB-69).
- The dry lab for five charts records zero usage.
- *Runs* and *Spawn* make no model call.
- The budget refusal and the one-chart stop pass in unit tests.
- The gate skips with no brain diff, and refuses a `--seed-fault` stub on `dry_run`.
- The room and the reveal are accepted on a zero-spend session: r05 against r06, both gpt-5.2
  (MB-72).

**Paid**, after MB-68:
- A `career` replay on gpt-5.2 against `marie-curie.r06` has no new fault. It is also R07-02's
  spot: gpt-5.2 reasoning tokens stay 0.
- A spawned session's spend is within 20% of its stored cost.

## Risks

1. **Schema.** Two new tables with more columns than the spec lists (job status, tier, effort,
   chart on the foundation row), all additive. The migration must run twice, because Railway
   runs the bootstrap first on every start (R-7.3).
2. **The brain is touched by R07-02.** Every customer call now sends `reasoning_effort`. For
   gpt-5.2 that is `none`, which is what the stored usage already shows (zero reasoning tokens),
   so no word should move. It is tagged INTERNAL on that basis. If the spot replay shows
   reasoning tokens or a moved band, the change is USER-FACING (R-5.5): the orchestrator stops
   and reports. The release gate would catch it before production either way.
3. **A new dependency**, `gpt-tokenizer`, in the api package (MB-71).
4. **Promote now depends on the lab.** Production's commit predates R01, so the first Promote
   after this round runs the full lab: about $1.40, needing MB-68 credits and MB-69's token.
   The staging landing's first Promote (CLAUDE.md focus 2) is gated by both.
5. **Admin routes stay outside `openapi.yaml`**, following the `/admin/prompts` precedent that
   CLAUDE.md records. The page calls them through one typed module; this does not widen R-7.2's
   debt beyond admin.
6. **Nothing a customer sees changes.** The page is behind `ADMIN_USER_ID` everywhere. Replay
   refuses under `PROMPTS_READ_ONLY`. `LAB_TOKEN` is never set in production. The admin's own
   report is replayed in place and never copied into a file or a lab row (R-3.1, R-3.5).
7. **Prices and ids are unverified from the sandbox**, where openai.com is blocked by the
   proxy. Only lab estimates and the budget sum depend on them (MB-70). The dry route's
   served-id light catches a wrong id before spend.
8. **The Agent tool may again be unavailable** (R06 deviation). The waves still hold in
   sequence, and token spend is heavy.

## Questions raised (Mailbox, before the round starts)

For the Owner, highest stakes first (R-12.1):
1. **MB-68, carried and blocking: add OpenAI credits** and set the $20 usage alert (ADR-77).
   *Recommendation:* about $10 covers the spot, the first session (about 45 ¢ on Flex) and the
   first release lab. *If silent:* the round merges on free acceptance; nothing generates.
2. **MB-69, blocking: place `LAB_TOKEN`.** Put one random secret of 32 or more characters in
   Railway staging Variables and in the GitHub `staging` environment. No Groq key is needed
   (ADR-73). *If silent:* the page works through Clerk, nothing is published from CI, and the
   release gate fails closed.
3. **MB-70: confirm two price lines** for gpt-6-sol and gpt-6-luna, and whether Flex is offered,
   from openai.com/api/pricing. *If silent:* press prices, Flex off, tagged provisional; lab
   figures only.

For the Mailbox only, at their defaults:
- MB-71: gpt-tokenizer for the dry lab.
- MB-72: r05 and r06 published, audrey's M0 from r06, and the zero-spend room check.
