# CLAUDE.md — working on Stars Decoded

Stars Decoded computes a natal chart locally (`astronomy-engine`, whole sign)
and writes a 3,500 to 5,500 word psychological report with OpenAI, grounded in
a written doctrine and a per-chart brief. One-time purchase. The report is the
product. "Astra" left the code on 2026-09-18; never add a new use of the name.

## Working with the Owner

- Every reply opens with `Alex, ` alone on its first line, until the Owner says to stop (R-0.5). Commits and files stay unprefixed.
- Delegate unasked (R-0.6): independent parts, broad searches and long reads go to subagents in parallel; a single lookup or edit stays here.
- Model triage (R-0.7): `/round` is the orchestrator, in the main loop on Opus 5.5 at max; every card carries a `Tier:` (builder, builder-sonnet, builder-haiku); tester, sentinel, qa, researcher, verifier (ADR-187 to 195).

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
pnpm check:shipped · pnpm --filter @workspace/web run csp:write   # shipped-code check; CSP hashes after JSON-LD
pnpm run db:bootstrap                 # idempotent; Railway runs it at start
pnpm report:lab --render|--compare|--dry --base r06   # free: stored runs re-read, every prompt rendered; the levels: /report-lab
```

Gate before any pull request: typecheck, both builds, unit tests, `check:shipped`, audit, `db:bootstrap`
clean when the schema changed, the sentinel, site checks and smoke on the Vercel preview. Never skip or disable a
check. The lab runs from the admin panel: dry at every brain change, spot and reading on
demand, full lab plus QA agent in the Release view before production.

## Process

`/ideate <topic>` → draft spec + rendered HTML artifact, always · `/lock <slug>`
→ locked spec + Decisions rows · `/plan <slugs>` → parallel-grouped plan, and on
the Owner's approval `/round RNN` starts at once → branch `round/RNN`, builders,
gate, report, PR · `/qa <url>` · `/report-lab` · `/mailbox` · `/ux-copy` for words, `/web-taste` for pages, `/marketing` for social posts. MASTERFILE §11.

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
  `mystarsdecoded.com`, moved only by Promote (fast-forward from `main`); never push it.
  Secrets live only in the Railway, Vercel and Supabase dashboards; the repo is
  public. Runbook: `docs/annex/staging-runbook.md`. **No secret on GitHub, ever**
  (Owner, 2026-09-25): never ask the Owner to put a key or token there. Anything that
  needs a key or reaches the lab routes runs on Railway and is started from the admin
  panel; GitHub workflows only build, test and smoke. Production keys never leave Railway.
- **Until launch, production is the site with the waitlist over it** (ADR-167): public pages open, Get my report and
  Sign in open the waitlist; the API serves non-admins healthz, `/waitlist*`, `/admin/*`. Staging keeps the whole app
  (`?prelaunch=1` previews production). Launch: `LAUNCHED = true` in `packages/launch`, then a Release.
- The web app calls `/api` on its own origin; `vercel.json` rewrites that to the staging or production Railway host
  by web host. `/api/healthz` reports `env` and `commit`; `smoke.yml` asserts both. The web cannot import `api/`; shared code
  lives in packages (`@workspace/engine`, `@workspace/commerce`), and public pages are prerendered at build (R-7.6).
- Prompts are edited on staging only; production sets `PROMPTS_READ_ONLY` and copies staging's `prompt_templates` at start.
- `openapi.yaml` is the contract; generated client and zod files are rewritten
  by codegen, never hand-edited. `/admin/*` is not in the spec yet.
- Schema changes go through `packages/db/src/schema` plus an idempotent script
  wired into `scripts/bootstrap-db.sh`, which Railway runs as the first step of
  the start command (its preDeployCommand hook never ran here); one that cannot
  run twice breaks the deploy.
- **The brain** decides the words: `api/src/prompts/`, `models.ts`, `aiInterpretation.ts`,
  `traditional.ts`, `packages/engine/` (the chart calculation). Touch it and the dry lab runs in the round; spot
  on demand from the Lab page; the Release view runs the full lab, the gate and the QA agent,
  then fast-forwards `production` with `GITHUB_RELEASE_TOKEN` on Railway staging (placed 2026-09-30;
  if it expires the release stops at `passed` and `promote.yml` takes the release id). `LAB_BUDGET_USD` caps spend
  (ADR-77); the Lab page and `--render` are free. Every model id lives in `models.ts`; one
  outside the catalogue does not compile. A check blocks only when the text would be wrong
  for the reader (ADR-81); every check that fires is a `generation_failures` row (*Failures* tab).
- Real chart data only. Fixtures hold birth data; charts are computed at run time. Never fabricate a placement, even in a demo.
- CI runs typecheck, builds, tests, `check:shipped`, audit and gitleaks; no lint step. Each preview runs Lighthouse, axe and the probe (ADR-192).
- Anonymous sessions come first; Clerk sign-in claims what the session made. `ADMIN_USER_ID` gates the admin.

## Current focus (2026-10-03)

1. First Release: R11 to R14 on production at 27bb5c5 (2026-10-03), the waitlist over the site. A retry reuses an unchanged
   brain's lab, the gate weighs production's run, QA sev-1 is only what is wrong for the reader (`docs/annex/first-release-plan.md`).
2. Next: the Owner's waitlist sign-up on production, `edge: true` in the smoke (MB-167), /sample refreshed, the bible's release log.
3. Then R15 cleanup (`mailbox-sweep-03-10`), R16 Timeline (`R16-plan.md`). Pricing and launch: never plan until asked (ADR-230).
