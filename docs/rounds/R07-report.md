# R07 report — the model matrix: the lab in the admin panel, sessions on spawn, the lab at release

Built 2026-09-24 on `round/R07` from `docs/rounds/R07-plan.md` (`report-lab-model-matrix.md` as re-locked, ADR-73 to 77).
Ten cards, one commit each. The branch carries the relock's docs merge, so the spec reaches `main` through this pull request.

## Mailbox rows open more than two rounds
MB-5, 6, 8, 11, 12, 13, 15, 17, 19, 20, 21, 22, 23, 24, 25, 30 at 6 · MB-31 (blocking, the legal entity), 33, 35 at 5 · MB-43, 47, 49, 50 at 3.
None blocked a card. **MB-68** (blocking, credits) and **MB-69** (blocking, `LAB_TOKEN`) block the paid and the staging acceptance below.

## Shipped (every line INTERNAL; no word a customer reads moved)
- **R07-01** `lab_runs` and `lab_judgements` (`packages/db/src/schema`), migration 3g in `bootstrap-db.sh`; ran three times on scratch — INTERNAL.
- **R07-02** the brain: every `CATALOGUE` entry pins `reasoningEffort` (5.2 and the GPT-6 pair `none`, mini and nano `minimal`) and `flex`;
  gpt-6-sol 2 / 0.2 / 10 and gpt-6-luna 0.1 / 0.01 / 0.5 under `// MB-70 provisional`, `checked` empty; `callStructured` sends the effort on
  every call and `service_tier: flex` only on request where the catalogue offers it; `writeSection` and `OutOfCreditError` exported;
  `usage.ts` prices Flex at half; an id outside the catalogue fails typecheck (`@ts-expect-error` test). `MODELS`, `SECTION_MODELS` unchanged — INTERNAL.
- **R07-03** `api/src/lib/labRules.ts` (fault rules, bands, `gateProblems`, `MATRIX_CHARTS`) shared by script and server; the script gains
  `--publish`, `--dry`, `--spot`, `--release` (refused past `GET /spend`), `--gate` (new fault, total outside 3,500–5,500, cost over 110%, r06 when
  no release), `--stub … --seed-fault`; `--all` is the five matrix charts; a campaign stops at the first out-of-credit failure — INTERNAL.
- **R07-04** `/api/admin/lab`: `labGuard` (Clerk admin or constant-time `LAB_TOKEN`), 405 under `PROMPTS_READ_ONLY`, `GET/POST /runs`,
  `/compare`, `/spend`, `/catalogue`, `/dry` (prompts through `previewSectionPrompt`, `gpt-tokenizer` counts, strict-schema check, `models.list`,
  zero usage), `POST /replay` as a job through `writeSection` with the budget refusal (409 `lab_budget`), `GET /replay/:runKey` — INTERNAL.
- **R07-05** sessions: estimate from the base's token shapes, spawn queues every replay first and stores one shuffle per card, replays run one
  after another with one retry, cards return text only, PUT saves picks and note, reveal 409 until the last card then per-writer, per-mix and
  control tables; `stored:<label>` puts another label's text beside the base at no cost — INTERNAL.
- **R07-06** `/admin/report-lab` beside Prompts, four tabs, *Runs* with the compare table, the month's spend in the header — INTERNAL.
- **R07-07** *Spawn a session*: bases (a label's charts or the admin's own reports by id and name), sections (career first), writers, the hidden
  control on by default, the estimate before **Spawn**, over budget disables it, polling until the room is ready — INTERNAL.
- **R07-08** *Reading room* and *Reveal*, `labCards.ts` (tie groups, next card) tested — INTERNAL.
- **R07-09** `report-lab.yml` campaigns dry, spot, release, stub, publish, `workflow_call`, `environment: staging`; `lab-spot.yml` after a green
  Smoke on main when brain paths changed; `promote.yml` diffs brain paths, skips or runs release then the gate, `dry_run` and stub rehearsals never push — INTERNAL.
- **R07-10** report-lab and round skills, the orchestrator's brain trigger, `.env.example` (`LAB_TOKEN`, `LAB_BUDGET_USD`), CLAUDE.md — INTERNAL.

## Deviations
- The Agent tool was unavailable again (plan risk 8): the orchestrator built all ten cards itself in wave order. Token spend heavy.
- Flex: the engine refuses a Flex request where `flex` is false (tested); replays and sessions resolve the tier per model (`tierFor`) so a
  Flex-by-default replay on gpt-5.2 runs standard until MB-70 says otherwise, instead of failing.
- The pricing shapes (`TokenShape`, `priceSection`) live in `labRules.ts`, not `labReplay.ts`, so `labSession.ts` stays free of the database.
- A published run keeps its `generatedAt` as `created_at`, so last month's runs do not count against this month's budget.
- `stored:<label>` writer added for the zero-spend room check (MB-72); a session card's letters are stored positions, so a dropped column never shifts a letter.
- The committed `marie-curie.reference.json` predates the horizon status: replay and dry name it and refuse (MB-73).
- `promote.yml` gained a `rehearsal` input (stub, stub-fault) beside `dry_run`, the no-spend way to prove the gate skips and refuses.
- `lab-spot.yml` skips a change that touches only `api/src/prompts/pair/`: the pair matrix is out of scope.

## Gate
Green: `pnpm install --frozen-lockfile` · typecheck (scripts, api, web) · `build:web` · `build:api` · tests (api 158, db 9, scripts 6, web 102) ·
`db:bootstrap` twice on a fresh Postgres 16 (exit 0 both, `lab_*` tables and six indexes present; the migration alone three times). The Vercel
preview smoke is CI's. **Dry lab (level 0), local** against a run with a current chart and the fixed OpenAI key of the sandbox unused: 12 prompts,
`usageRecorded 0`, every schema strict, input tokens 6,941 (foundation) and 8,849–9,023 (sections) against the 09-17 baseline's 7,101 and
9,479–9,812; `served` unknown here (no egress). On staging it needs MB-69. **Spot on merge**: `lab-spot.yml` will refuse for want of `LAB_TOKEN`.
**Zero-spend room** walked locally end to end: publish, stub, spawn (0 replays), card, 409 at reveal, two picks, the reveal tables; the replay job
proven against a dead endpoint (rows fail with the error, nothing spent). Budget refusal, out-of-credit stop and the token path are unit tests.

## Pending (MB-68 credits, MB-69 token; recorded, not faked)
`--publish` of r05 and r06 into staging's *Runs* and audrey-hepburn's M0 (MB-72); the staging room on r05 against r06; the dry lab on staging;
the `career` spot on gpt-5.2 against `marie-curie.r06` (R07-02's reasoning-token check); a session's spend within 20% of its estimate; the Promote
rehearsals `stub` and `stub-fault` on a test dispatch. The first Promote after this round runs the full lab (about $1.40) and needs both.

## Mailbox
Done: MB-71 (gpt-tokenizer, at its default). Open at their defaults: MB-70 (provisional prices), MB-72 (blocked by MB-69). Raised: MB-73 (the
committed reference run predates the horizon status), MB-74 (the SDK retries an insufficient_quota 429 six times before OutOfCreditError; time, not money).
