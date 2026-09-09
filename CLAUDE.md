# CLAUDE.md — working on Stars Decoded

Stars Decoded computes a natal chart locally (`astronomy-engine`, whole sign)
and writes a 2,000 to 2,800 word psychological report with OpenAI, grounded in
a written doctrine and a per-chart brief. One-time purchase. The report is the
product. The app still says "Astra" in places; never add a new use of it.

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
pnpm --filter @workspace/api-spec run codegen   # after editing openapi.yaml
pnpm run db:bootstrap                 # idempotent; Railway runs it pre-deploy
pnpm report:lab                       # report from a fixture, measured (lands with PR #6)
```

Gate before any pull request: typecheck, both builds, unit tests, report lab
when `api/src/lib/` or prompts changed, `db:bootstrap` boots clean when the
schema changed, smoke on the Vercel preview. Never skip, disable or quarantine
a failing check.

## Process

`/ideate <topic>` → one draft spec · `/lock <slug>` → locked spec + Decisions
rows · `/plan` → `docs/rounds/RNN-plan.md` · `/round RNN` → branch `round/RNN`,
builders, gate, report, pull request · `/qa <url>` → `docs/qa/QA-NN.md` ·
`/mailbox` → walk open topics with the Owner. Details: MASTERFILE §11, §12.

The Owner tests the website and says yes or no. Everything else is ours:
merging once the gate is green, watching CI and the Railway and Vercel
deploys, fixing a red branch or pipeline, and raising only what needs a
decision or a credential (R-12.5). Never ask the Owner to run a command.

Every shipped line in a round report is tagged USER-FACING or INTERNAL. A
change to report content is USER-FACING even when no UI moved.

## Budgets

CLAUDE.md 120 lines · INDEX.md 60 · Decisions row 40 · task card 15 · locked
spec 200 · round or QA report 60 / 80 · agent file 50. Over budget: ten-line
abstract in place, body to `docs/annex/`.

Code: comments say why, never what; no banners, no commented-out code, no TODO
without an `MB-NN` ref; `// MB-NN provisional` at any seam built on an open
topic; no per-package READMEs beyond one line; no CHANGELOG.

## Things a session should know

- Deploys are git-push driven: `main` → Vercel (web, `dist/` at repo root) and
  Railway (api, health check `/api/healthz`). Postgres is Supabase. Secrets
  live only in those dashboards; the repository is public.
- Web and API are separate origins, so the session cookie is
  `SameSite=None; Secure` (`CROSS_SITE_COOKIES`).
- `openapi.yaml` is the contract; generated client and zod files are rewritten
  by codegen and never hand-edited. `/admin/*` routes are not in the spec yet.
- Schema changes go through `packages/db/src/schema` plus an idempotent script
  wired into `scripts/bootstrap-db.sh`; a script that cannot run twice breaks
  the Railway deploy.
- Model ids are hard-coded at the call sites. Changing them is an engine
  change and needs a report-lab run.
- Real chart data only. Fixtures hold birth data; charts are computed at run
  time. Never fabricate a placement, even in a demo.
- CI runs typecheck, both builds and unit tests. It does not run Playwright;
  the only e2e spec is stale (Mailbox). There is no lint step.
- Anonymous sessions come first; Clerk sign-in claims what the session made.
  `ADMIN_USER_ID` gates the prompt admin.

## Current focus (2026-09-09)

1. R01 deployed; Owner acceptance pending. Check the landing page claims,
   the dashboard delete, the four legal drafts and the first smoke run
   (`docs/rounds/R01-report.md`, "Not verified here").
2. Next ideation session: pricing and packaging (MB-5), then payments.
3. Still owed: the report-lab measurement for PR #6 (MB-14) and the Owner's
   legal entity (MB-31).
