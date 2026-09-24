# CLAUDE.md — working on Stars Decoded

Stars Decoded computes a natal chart locally (`astronomy-engine`, whole sign)
and writes a 3,500 to 5,500 word psychological report with OpenAI, grounded in
a written doctrine and a per-chart brief. One-time purchase. The report is the
product. "Astra" left the code on 2026-09-18; never add a new use of the name.

## Working with the Owner

- Every reply opens with `Alex, ` alone on its first line, before anything
  else, until the Owner says to stop (R-0.5). Commits and files stay unprefixed.
- Delegate unasked (R-0.6): independent parts, broad searches and long reads go
  to subagents, in parallel when independent; a single lookup or edit stays here.
- Model triage (R-0.7): the orchestrator runs a round on the top model (Fable);
  builders and feature work Opus, simple fixes Sonnet, mechanical Haiku.

## Read this first

1. This file.
2. `docs/INDEX.md`, the map of everything else.
3. Your agent file under `.claude/agents/` if you were spawned as one.
4. `MASTERFILE.md` in full if you are planning or orchestrating; §0 plus the
   sections your task card names if you are building.

Authority: `MASTERFILE.md` wins over every other document except Decisions rows
dated after it. Prompts are never edited outside their source of truth.

## Notion (kept current in the same session that changes the product)

- Decisions (ADR log, never edited, only superseded):
  https://app.notion.com/p/89a14ed191cf4915826efe406bc9f835
- Mailbox (open topics, each with a recommendation and a default):
  https://app.notion.com/p/7522fd3c9fd9450094cfdebabd205d3d
- Product log, GTM and prompt research live under the STARS DECODED page.
- The bible (browsable product reference, republish to the same URL):
  https://claude.ai/code/artifact/7bd58e7a-995a-442e-94ea-7293d7ee3fd2

## Commands

```sh
pnpm install --frozen-lockfile        # pnpm only; npm cannot resolve catalog:
pnpm run dev:api                      # :8080
pnpm run dev:web                      # :5173, proxies /api
pnpm run typecheck                    # the type gate; build does not typecheck
pnpm run build:web && pnpm run build:api
pnpm -r --filter '!@workspace/e2e' --if-present run test
pnpm --filter @workspace/api-spec run codegen   # after openapi.yaml
pnpm run db:bootstrap                 # idempotent; Railway runs it at start
pnpm report:lab --render|--compare    # re-read stored runs. Free; see /report-lab
```

Gate before any pull request: typecheck, both builds, unit tests, `db:bootstrap`
clean when the schema changed, smoke on the Vercel preview. Never skip or
disable a check. The report lab is not in it: `/report-lab` runs when the brain
changed, or when the Owner asks.

## Process

`/ideate <topic>` → draft spec + rendered HTML artifact, always · `/lock <slug>`
→ locked spec + Decisions rows · `/plan <slugs>` → parallel-grouped plan, and on
the Owner's approval `/round RNN` starts at once → branch `round/RNN`, builders,
gate, report, PR · `/qa <url>` · `/report-lab` · `/mailbox`. MASTERFILE §11.

The Owner tests the website and says yes or no. Everything else is ours:
merging once the gate is green, watching CI and the Railway and Vercel deploys,
fixing a red branch or pipeline, and raising only what needs a decision or a
credential (R-12.5). Never ask the Owner to run a command.

Every shipped line in a round report is tagged USER-FACING or INTERNAL; a
report-content change is USER-FACING even when no UI moved.

## Budgets

CLAUDE.md 120 lines · INDEX.md 60 · Decisions row 40 · task card 15 · locked
spec 200 · round or QA report 60 / 80 · agent file 50. Over budget: ten-line
abstract in place, body to `docs/annex/`.

Code: comments say why, never what; no banners, no commented-out code, no TODO
without an `MB-NN` ref; `// MB-NN provisional` at any seam built on an open
topic; no per-package READMEs beyond one line; no CHANGELOG.

## Things a session should know

- Deploys are git-push driven: `main` → staging (`starsdecoded-staging.vercel.app`,
  Railway `staging`, own Supabase project); `production` branch → production at
  `mystarsdecoded.com`, moved only by the Promote workflow, fast-forward from
  `main` after the staging smoke passes; dispatch it, never push the branch.
  Secrets live only in the Railway, Vercel and Supabase dashboards; the repo is
  public. Runbook: `docs/annex/staging-runbook.md`.
- The web app calls `/api` on its own origin; `vercel.json` rewrites that to the
  staging or production Railway host by web host. `/api/healthz` reports `env`
  and `commit`; `smoke.yml` asserts both.
- Prompts are edited on staging only; production sets `PROMPTS_READ_ONLY` and
  copies staging's `prompt_templates` in its start-up bootstrap.
- `openapi.yaml` is the contract; generated client and zod files are rewritten
  by codegen, never hand-edited. `/admin/*` is not in the spec yet.
- Schema changes go through `packages/db/src/schema` plus an idempotent script
  wired into `scripts/bootstrap-db.sh`, which Railway runs as the first step of
  the start command (its preDeployCommand hook never ran here); one that cannot
  run twice breaks the deploy.
- **The brain** decides the words: `api/src/prompts/`, `models.ts`,
  `aiInterpretation.ts`, `traditional.ts`, `chartCalculation.ts`. Touch it and
  `/report-lab` runs on staging right after the merge by dispatching
  `report-lab.yml`; no key or network is needed here. Never generate a report to
  look at one. Every model id lives in `models.ts` with its price; one outside
  the catalogue does not compile.
- Real chart data only. Fixtures hold birth data; charts are computed at run
  time. Never fabricate a placement, even in a demo.
- CI runs typecheck, both builds and unit tests; no Playwright, no lint step.
- Anonymous sessions come first; Clerk sign-in claims what the session made.
  `ADMIN_USER_ID` gates the prompt admin.

## Current focus (2026-09-21)

1. R06 merged to staging (#55, follow-ups #56 to #59): the nine review fixes (ADR-59 to 62), the compatibility second pass p2
   (ADR-63 to 71), on-tap scenes on `gpt-5.2` (ADR-72), MB-60 to 62 closed. Natal and pass campaigns measured; the `pair`
   campaign waits on OpenAI credits (MB-68, blocking): dispatch `report-lab.yml` `pair` and paste it into `docs/rounds/R06-report.md`.
2. Owner acceptance on staging for R01, R03, R04, R05 and R06, in that order; then the staging landing
   (`docs/specs/draft/staging-environment.md`): the Owner works the runbook, then the first Promote.
3. Next: `report-lab-model-matrix.md` (GPT-6, lab at four levels; generation needs MB-68 credits), pricing (MB-5), Stripe (MB-6); MB-31 needs the Owner.
