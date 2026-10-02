# R13 plan — Security hardening and the agent roster: no CORS, a watching CSP, limits and a breaker, names as data, a team that checks itself

Planned 2026-10-01 on `claude/eager-albattani-i8ekei` (R12 merged at bcc2ca7, plus the lock f14f536; `main` has since gained
b250899, Round start 1) for the locked specs `security-hardening` (ADR-197 to 203; artifact
https://claude.ai/artifact/9XS8C1BgKVtLSP3cdNFQ7d) and `agent-roster` (ADR-187 to 196; artifact
https://claude.ai/artifact/6gBLyAD4yNBzhLJ82Ut8xp). **ADR-204** sets the order: R13 builds both, then /qa on staging and the first
Release; pricing-and-launch is R14 (`docs/rounds/R14-plan.md`, not touched here). **The Owner, 2026-10-01** (the security spec's
open questions): no hotfix, since production serves non-admins only healthz, the waitlist and the admin (ADR-167); F1 is R13's
first card, and the first Release waits for R13 and the QA after it. No QA report exists (`docs/qa/` is empty). No Owner comment
sits on the Mailbox or Decisions rows this plan touches.
**This is the first plan with `Tier:` lines** (agent-roster scope 1): 15 Opus, 8 Sonnet, 1 Haiku.
**Tags:** USER-FACING are R13-08 and 09 (the refusal and pause lines), R13-12 (report content), R13-14 (a name that is not a name is
refused) and R13-23; every other card is INTERNAL. **The brain changes once** (R13-12, names as data, v9 and p4): every report's
prompts change (R-5.5), so the dry lab runs in the round, fixture runs are read on staging, and the Release view's full lab and QA
agent gate production (R-4.4). **The schema changes once**: one new table, `csp_violations` (R13-10). **The contract changes once**
(R13-14). **Dependencies:** `express-rate-limit` joins `api`; `@axe-core/playwright` joins `e2e` and `@playwright/test` is pinned
there; `cors` and `@types/cors` leave; pnpm moves from 10.0.0 to the newest 10.x; two third-party Actions, Lighthouse CI and
gitleaks, are pinned by SHA (R13-02, 16, 18). No credential is needed to build, no workflow holds a secret, and nothing reaches
production in the round.

## Open Mailbox rows created more than 14 days ago (oldest first, ADR-186)
**2026-09-09:** MB-12 no error reporting or alerting · MB-19 no prompt version history · MB-20 the one e2e spec cannot pass, no
lint step · MB-21 variables missing from `.env.example` · MB-22 dead code left by the port · MB-30 the browser calls Nominatim
and timeapi.io. None blocks a card. Touched here: MB-12 (R13-09's email is the product's first alert; Sentry stays open), MB-20
(`e2e/` becomes the axe checks, R13-18; the lint half stays), MB-21 (`LOG_LEVEL` documented, R13-01; the legacy
`AI_INTEGRATIONS_OPENAI_*` pair stays), MB-30 (the CSP lists both hosts until they move, R13-11). MB-23, the same age, is decided
by ADR-199 and built here (R13-08, 09). The next oldest open row, MB-49 (2026-09-18), is 13 days old; R13 keeps new logic in pure
modules beside thin routes, its way.

## Round start (the orchestrator)
1. Branch `round/R13` from this checkout, then merge `origin/main` (b250899, PR #80: five lines in `scripts/src/report-lab.ts`, a
   failed report's coded reason), so R13-20 and R13-22 build on it. `git diff --stat main...HEAD` is then docs only.
2. The Decisions rows are recorded (ADR-187 to 204, at the lock); the round adds none. MASTERFILE 0.22 already states R-0.7's tiers
   and roster, §11.2's gate, R-13.3's Spend line, R-7.4, R-7.5 and R-3.5's redaction; the code does not yet.
3. Builders cannot open claude.ai: from the security artifact, extract the two lines on the birth form (the 429 and the pause) into
   the session scratchpad for R13-08, 09 and 23; where a builder's draft differs, the artifact wins and the report says so.
4. The dry lab's base: `git fetch origin report-lab/r06 && git checkout FETCH_HEAD -- fixtures/reports/` (never committed).
5. Agent types written in this round (tester, sentinel, `builder-sonnet`, `builder-haiku`) register only in the next session:
   until then spawn general-purpose on the file's model with the file's text (reading 10). The builders' tiers are on the cards.

## What already shipped (checked at f14f536)
- **Met, and reused:** `clientKey` and `RateLimiter` (`api/src/lib/waitlist.ts`), the waitlist's own limit, the gift reminder's
  one-a-day 429 without Retry-After (ADR-127), the regenerate route's per-report cooldown; health ahead of every middleware;
  pino-http's request line without a query; `failureLog.redact`; `onlyBuiltDependencies`; Deployment Protection off (runbook G),
  so CI can read a preview; Chromium in `/opt/pw-browsers` for local Playwright; the walk on a scratch Postgres with a mail stub;
  `/admin/lab/failures`; the prelaunch gate's `OPEN_PATHS`; usage cost stored on each report (`interpretation.meta.usage.costUsd`);
  `planner.md` already follows ADR-186.
- **Not met:** `cors({ origin: true, credentials: true })` (`api/src/app.ts:57`) with `CROSS_SITE_COOKIES=true`, so the cookie is
  `SameSite=None`; `vercel.json` sends only X-Robots-Tag; no limit on writing, geocode, sends or checkout and no spend cap; pnpm
  10.0.0, no Dependabot, no audit, Actions by tag; pino redacts only auth and cookie headers, and the mailer logs recipients by
  default; plain `express.json()`; `NAME: ${name}` raw in `api/src/prompts/brief.ts:171, 205`, and both names and the label raw in
  `api/src/lib/pairBrief.ts:222 to 236`; no hooks; `qa.md` pins no model; no researcher, verifier, tester or sentinel; no
  owner-playbook or lessons file; `e2e/` keeps a dev-server config and no test.
- **Found while planning:** (1) `api/src/routes/horizon.ts` says the session middleware rate-limits the preview; nothing does
  (MB-146). (2) The request line logs `/api/invites/<token>`, a live bearer token, while the database keeps only its hash (R13-21).
  (3) `label` is any string at the API and reaches the pair prompt (`pairBrief.ts:224`), though the picker offers three words
  (R13-12, 14). (4) The pair campaign writes 21 times from one runner, past the new 20 a day per IP (R13-20). (5) CLAUDE.md is at
  its 120-line budget and INDEX at 60, so the close rewrites lines in place.

## Where the specs disagree, and how this plan settles it
1. **Security scope 7's "`.env*`"** against ADR-191 ("`.env`") and R-7.4's committed `.env.example` → reading 1.
2. **Agent-roster acceptance 10** (a PR whose preview sends `Access-Control-Allow-Origin` fails) against vercel.json, which sends a
   preview's `/api` to staging's API → reading 4.
3. **ADR-127** (the reminder's refusal carries no Retry-After) against scope 4 (a 429 carries one) → the reminder keeps ADR-127's
   rule and is left out of the new limits; every new limit sends Retry-After.
4. **Scope 4's "per session"** against ADR-140 (writing needs an account) → reading 5.
5. **CLAUDE.md's "no Playwright" and MB-20's "not in CI"** against ADR-192 → ADR-192, public pages only; CLAUDE.md at the close.
6. **MB-23's default** ("built with the payments card") against ADR-199 and 204 → built here; MB-23 done at the close.
7. **/round's "token-spend note if the round felt heavy" and "rows open more than two rounds"** against ADR-189 and 186 → R13-05.
8. **MASTERFILE §10's "planner, builder, qa"** against ADR-190 → the close (0.23).
9. **Scope 3's JSON-LD hashes** against CSP, which never runs a data block → kept, and kept honest (reading 12).

## Goals
1. **No website but ours can read or write a visitor's data** (F1, ADR-197): no CORS, a foreign write gets 403, the cookie is Lax
   and Secure. R13's first card.
2. **Every response hardened and watched** (F2, ADR-198): the headers on every path, a report-only CSP whose violations are counted
   for the admin, and a probe that fails any deploy that drops them.
3. **Spend and sending bounded** (F3, ADR-199, MB-23): a limit on every route that spends or sends, a daily spend breaker, and one
   plain line for each refusal.
4. **The supply chain, the logs and the prompts closed** (F4 to F6, ADR-200 to 202): a 7-day release age, Dependabot, audit,
   gitleaks and SHA pins; logs with no personal data; names bounded and handed to the writer only as data, proven by three
   injection fixtures in the dry lab.
5. **The roster at work** (ADR-187 to 196, 203): a tier on every card, one Opus retry, the Spend line, researcher, verifier, tester
   and sentinel, the hook, the shipped-code and site checks, /qa after every round, the learning loop. The round closes with the
   sentinel's first full audit of `main` and `docs/qa/QA-01.md` from staging.

## Preconditions
1. No builder starts before this plan's commit is pushed and `main` is merged in (Round start 1).
2. Builders read MASTERFILE §0, their card, and the spec sections, readings and pinned shapes it names.
3. **Single owners.** Group 0: `app.ts`, `session.ts`, `origin.ts`, `.env.example` → R13-01; every `package.json`,
   `pnpm-workspace.yaml`, `pnpm-lock.yaml` → R13-02; the agent files → R13-03, 04; `round` and the PR template → R13-05; `plan`,
   `ideate`, `qa` skills → R13-06; the two annex files → R13-07. Group A: `routes/index.ts`, `limits.ts`, the walk → R13-08;
   `spendCap.ts`, `mailer.ts` → R13-09; `app.ts`, `prelaunch.ts`, `adminLab.ts`, the db schema index, `bootstrap-db.sh` → R13-10;
   `vercel.json`, `web/package.json` → R13-11; `api/src/prompts/**`, `pairBrief.ts`, `aiInterpretation.ts` → R13-12;
   `web/src/types/chart.ts` → R13-13; `openapi.yaml` and the generated files → R13-14; root and `scripts/package.json` → R13-15;
   `ci.yml`, `report-lab.yml`, `promote.yml` → R13-16; `smoke-run.yml` → R13-17; `e2e/**`, `site-checks.yml` → R13-18;
   `.claude/settings.json` → R13-19; `scripts/src/report-lab.ts` → R13-20. Group B: `app.ts`, `logger.ts`, `mailer.ts`,
   `failureLog.ts` → R13-21; `labDry.ts`, `report-lab.ts`, `fixtures/charts/` → R13-22; the seven web files → R13-23;
   `FailuresView.tsx`, `labApi.ts` → R13-24. Every other file belongs to the one card that names it.
4. **R13-02 is the round's only change to the dependency tree.** A builder who needs a package stops and reports (the sentinel's
   "a new dependency is named in the plan"); script lines in a `package.json` need no install.
5. Inside a group a card may land before one it imports (pinned shapes): a red intermediate is accepted until the group ends, and
   every group ends green. A builder who needs a pinned shape changed stops and reports (R-0.1).
6. **No card spends.** Nothing generates in the round; every paid run is in the staging confirmation, after the merge.
7. No secret in the repo or on GitHub. Seams: `// MB-145 provisional` (R13-09), `// MB-146 provisional` (R13-08), `MB-30` beside
   the CSP's two hosts (R13-11). Code cites ADR-187 to 203.

## Readings pinned where the spec is silent
1. **`.env.example` is not a secret file.** The hook and the deny cover `.env`, `.env.local`, `.env.*.local`, `.env.production`,
   `.env.staging` and any other `.env.*`; `.env.example`, the committed list with no values (R-7.4), stays editable and readable.
2. **`WEB_ORIGINS`.** Unset means the spec's three: `https://mystarsdecoded.com` (and `www`), the staging alias
   `https://starsdecoded-staging.vercel.app`, and `https://starsdecoded-*.vercel.app`. They are public, so the code holds them and no
   deploy waits on a dashboard edit; set, the variable replaces them. Under `NODE_ENV=development` with none set, every Origin
   passes: the dev server is local, and no `localhost` enters shipped code. `Origin: null` is foreign.
3. **The cookie** is Secure except under `NODE_ENV=development` (plain http on a laptop), and is re-issued with the new attributes on
   each request that carries it, so a `SameSite=None` cookie set before R13 turns Lax at its next visit.
4. **The probe on a preview.** vercel.json sends a preview's `/api` to staging's API, which runs `main`, not the PR. A preview
   asserts the web half (the headers and CSP from the PR's own vercel.json); the API half (no CORS, the 403, the cookie) runs on
   staging after every merge and on production after every promote. Before a merge, R13-01's tests and the absent `cors` package
   guard the API: putting `cors` back is a new dependency, which the sentinel refuses.
5. **"Per session" for writing and sending:** writing needs an account (ADR-140), so the key is the account when signed in, else
   the session.
6. **What spends.** The horizon pass (PATCH /profiles/{id}/birth-time) and the legacy POST /synastry call the model too, so they
   share the writing limit and the breaker. The waitlist keeps its limiter and the regenerate route its cooldown. A limit counts
   only requests that succeeded, since only those spend or send.
7. **The lab and the limits.** The anonymous campaigns on staging obey the limits like any visitor (R13-20). The release lab, spots,
   sessions and the QA agent run on the server, never meet a limit, never count toward the breaker, and keep `LAB_BUDGET_USD`.
8. **The breaker** sums the cost stored on today's (UTC) reports and horizon passes, so a report still writing counts once it lands;
   the hourly limit bounds that lag. Unset means 20 USD (MB-145); 0 pauses all writing; one email per UTC day per process.
9. **Dependencies.** pnpm stays on 10.x, as the spec says. Lighthouse runs from an Action pinned by SHA, so no Lighthouse package
   enters the lockfile or the Vercel and Railway installs. gitleaks is a pinned binary or Action with no licence key.
10. **Tiers are agent types.** The Agent tool takes a model at spawn and the effort comes from the agent file, so Sonnet at high and
    Haiku at medium are `builder-sonnet` and `builder-haiku`, thin files that defer to `builder.md`.
11. **CSP reports reach their route ahead of the origin guard and the session**: a browser may post a report with no Origin, or
    `null`, and no cookie. A forged report can only add a count; the route counts only reports whose page is on our hosts, and is
    rate-limited.
12. **Counts in a table; hashes kept honest.** Staging redeploys at every merge and the 7-day rule needs a week, so the counts are
    rows, not memory. A JSON-LD block is data that CSP never runs, but the spec lists its hashes, so `csp.mjs --check` keeps them
    current and an enforced policy cannot drift from the pages.
13. **Typed values in prompts** are today the person's name (natal and pair briefs) and the pair's label; a gift's name and note
    reach only emails. The label becomes the picker's three words in the contract; a stored label of other text still renders,
    inside its block.
14. **The name rule:** 1 to 60 characters; apostrophes are ' and ’, dots the full stop and the middle dot (·). A stored name that
    breaks it still shows and still reaches the prompt, inside its block; it cannot be typed again.
15. **Shipped code** is `api/src`, `web/src` and `packages/*/src`, less tests, the `test*.ts` helpers, `api/src/walk/`, fixtures and
    generated files; tooling (`scripts/`, `web/scripts/`) prints by design. `console.log` is read in code, not comments; "Astra" by
    word, so `Europe/Astrakhan` passes. Exceptions sit in one table in the script, each with its reason, and the sentinel reads it.
16. **Lighthouse** runs the mobile preset (phone first, §9), the median of three runs. A budget or an axe rule that today's pages
    miss is fixed in the round (Group C), never loosened.
17. **Logs** keep the ids of reports, profiles and requests, and lose a person's birth data, coordinates, email, name and Clerk id,
    and any token in a path.
18. **No new screen** (spec Screens): the refusal and pause lines appear where each form shows its errors today.

## Pinned shapes
- **Origin** (R13-01, 08, 17): `webOrigins(env = process.env): Array<string | RegExp>`; `originGuard(): RequestHandler`, refusing
  with 403 `{ error: "forbidden_origin", message }`.
- **Refusals** (R13-08, 09, 14, 23): 429 `{ error: "rate_limited", message: string, retryAfterSeconds: number }` with
  `Retry-After`; 503 `{ error: "paused", reason: "paused", message: string }`. The words live in the API's `message`.
- **Limits** (R13-08): `generationLimits`, `geocodeLimit`, `sendLimit`, `checkoutLimit`, `previewLimit`, each `RequestHandler[]`;
  `LIMIT_LINES` keyed by kind.
- **Spend** (R13-09): `dailyCapUsd(env?): number`; `spentTodayUsd(): Promise<number>`; `spendGate(): RequestHandler`;
  `sendSpendPausedEmail({ to, day, spentUsd, capUsd }): Promise<boolean>`.
- **CSP** (R13-10, 11, 24): `api/src/routes/cspReport.ts` default-exports the router; `parseCspReport(contentType, body):
  { directive; blocked; documentHost } | null`; `GET /admin/lab/failures` adds `csp: Array<{ day: string; directive: string;
  blocked: string; count: number }>`, the last 7 days.
- **Data block** (R13-12, 22): `api/src/prompts/data.ts` exports `DATA_OPEN(label)`, `DATA_CLOSE`, `dataBlock(label: "name" |
  "label", value: string): string` and `outsideDataBlocks(text: string): string`.
- **Names** (R13-14, 23): one pattern string, on the three fields in `openapi.yaml` and in `web/src/lib/person-name.ts`.
- **Commands** (R13-15 to 18): `pnpm check:shipped` at the root; `.github/scripts/security-probe.sh <web_url> web|full`.
- **Fixtures** (R13-22): `fixtures/charts/inject-instruction.json`, `inject-delimiter.json`, `inject-markup.json`, each
  `"injection": true`.
- **Hook** (R13-19): `.claude/hooks/guard.mjs` exports `verdict(input): { block: boolean; reason?: string }`.

## Parallel groups
**Group 0**, one message: R13-01 to R13-07. R13-01 drops `cors` from `app.ts` while R13-02 drops the package (red until both land);
R13-02 is the round's one install. R13-03 to 07 touch only `.claude/`, the PR template and `docs/annex/`, and build nothing.
**Group A**, one message once 0 is green: R13-08 to R13-20. R13-08 wires R13-09's `spendGate`; R13-10 mounts its router in
`app.ts`; R13-16 calls R13-15's command; R13-18 calls R13-17's script; R13-13 follows R13-12's versions: all pinned.
**Group B**, one message once A is green: R13-21 to R13-24. R13-21 edits `app.ts` and `mailer.ts` after R13-10 and 09; R13-22 reads
R13-12's markers; R13-23 reads R13-14's contract and R13-08's codes; R13-24 reads R13-10's field.
**Group C, contingent:** one card per page family under `web/src/site/` for what the first site checks find on the round's preview
(Sonnet, /web-taste), and one per blocking sentinel finding (Opus), each before the merge.
**Tiers:** Opus R13-01, 02, 03, 08 to 12, 14, 16 to 19, 21, 22; Sonnet R13-04 to 07, 15, 20, 23, 24; Haiku R13-13.
**If R13 must shrink:** R13-24 moves first (the counts stay in the API and the table), then R13-20 (dispatch the pair lenses alone
meanwhile), then R13-18's Lighthouse half (axe stays). F1 to F6, the brain and the roster stay.

---

## Group 0 — F1, the round's one install, the roster on paper

### R13-01 — No CORS, a foreign write gets 403, the cookie Lax and Secure (INTERNAL)
Tier: opus — security, cookies and the origin rule (rubric: anything security).
Objective: F1 closed: no website but ours can read or write a visitor's session data through `/api`.
Files: `api/src/app.ts`; `api/src/middlewares/session.ts` (+ new test); new `api/src/middlewares/origin.ts` (+ test); `.env.example`.
Refs: ADR-197, 198, 202; R-7.4, R-7.5; security scope 1, 2, 7, acceptance 1 to 3; MB-21; readings 2, 3, 4; pinned origin.
Done when:
- `cors` leaves `app.ts` (its package leaves in R13-02); no response carries an `Access-Control-*` header.
- `originGuard` answers 403 to a POST, PUT, PATCH or DELETE whose Origin, `null` included, is outside `webOrigins()`; no Origin
  passes; mounted after health and ahead of the parsers and the waitlist; tests cover each case and the preview pattern.
- The cookie is `SameSite=Lax`, Secure except under `NODE_ENV=development`, re-issued on each request that carries it;
  `CROSS_SITE_COOKIES` is gone from code and `.env.example`; tests.
- `express.json` and `urlencoded` take at most 32 kB; every API response, health included, sends `X-Content-Type-Options:
  nosniff` and `Content-Security-Policy: frame-ancestors 'none'`.
- `.env.example` lists `WEB_ORIGINS` and `DAILY_SPEND_CAP_USD` with no value and one comment each, and `LOG_LEVEL` (MB-21).

### R13-02 — pnpm with a 7-day release age, and the round's one install (INTERNAL)
Tier: opus — supply chain is security, and the lockfile spans four packages.
Objective: no package younger than 7 days installs, and every dependency the round adds or drops lands before anyone else builds.
Files: `package.json` (`packageManager`); `pnpm-workspace.yaml`; `api/package.json`; `e2e/package.json`; `pnpm-lock.yaml`.
Refs: ADR-200, 192, 199; R-7.4; security scope 4, 5, acceptance 8; agent-roster scope 9; reading 9.
Done when:
- `packageManager` is the newest pnpm 10.x, never 11; `minimumReleaseAge: 10080`; `onlyBuiltDependencies` unchanged.
- `api` gains `express-rate-limit` at an exact version at least 7 days old, and loses `cors` and `@types/cors`.
- `e2e` pins `@playwright/test` to 1.63.0, `api`'s `playwright-core`, and gains `@axe-core/playwright` at an exact version.
- `pnpm audit --prod --audit-level high` is clean, by in-range updates or a named `overrides` entry; a fix that needs a new major
  version stops the card.
- `pnpm install --frozen-lockfile` clean twice; in a scratch copy, never committed, `pnpm add` of a version published under 7 days
  ago is refused. The round report lists every version added or removed.

### R13-03 — Four new agents and two builder tiers (INTERNAL)
Tier: opus — the sentinel is the round's security gate, and these files steer every later round.
Objective: researcher, verifier, tester and sentinel exist as agent-roster's table says, and each tier is an agent type.
Files: new `.claude/agents/researcher.md`, `verifier.md`, `tester.md`, `sentinel.md`, `builder-sonnet.md`, `builder-haiku.md`.
Refs: ADR-187, 188, 190, 193, 203; agent-roster scope 2, 6; security scope 9; R-0.7; reading 10.
Done when:
- Each pins `model`, `effort` and `tools` as the table says (researcher opus/high, verifier sonnet/medium, tester sonnet/high,
  sentinel opus/max) and is at most 50 lines.
- researcher: from the question, one agent per lookup, two to four for a comparison, primary sources first, a claims table (claim,
  URL, source type, date, read in full). verifier: one claim at a time, each URL re-fetched, supported, unsupported or
  misattributed; never a report's citations.
- tester: tests only, for the group's changed files under `api/src/lib/`, `packages/*` and `web/src/lib/`; a bug comes back as a
  failing test. sentinel: read-only; the ten-point checklist by number; `/security-review` when its tools offer it, else its method;
  each finding blocking or not, with file and line; on `main...round/RNN` or the whole of `main`.
- `builder-sonnet` (sonnet, high) and `builder-haiku` (haiku, medium): a few lines each, follow `builder.md` exactly.

### R13-04 — planner, builder and qa learn the roster (INTERNAL)
Tier: sonnet — edits to three existing agent files, no code.
Objective: every existing agent pins its model and effort and plays its part in tiers, escalation and QA.
Files: `.claude/agents/planner.md`, `builder.md`, `qa.md`.
Refs: ADR-187 to 190, 194, 195; agent-roster scope 1, 3, 5, 9, 11, 12; R-0.7, §11.3.
Done when:
- planner: a `Tier:` line on every card from the rubric (by pointer to agent-roster scope 1; unsure is Opus); reads the promoted
  rules in `docs/annex/lessons.md`; names a card escalated two rounds running.
- builder: its tier is its model; after a second failed gate, or on a question, it stops and reports with the failure, for the one
  Opus retry.
- qa: `model: sonnet`, `effort: high`; the Skeptic adds a keyboard pass (Tab through every public page and the app's main flows:
  focus visible, order sane, nothing trapped); it runs on staging after every round and writes `docs/qa/QA-NN.md`.
- Each file at most 50 lines; nothing else changes.

### R13-05 — /round runs the roster, and the PR's gate says so (INTERNAL)
Tier: sonnet — process text in two files, from the spec's own lists.
Objective: the orchestrator spawns by tier, gates with the tester and the sentinel, and closes with the Spend line, lessons and /qa.
Files: `.claude/skills/round/SKILL.md`; `.github/pull_request_template.md`.
Refs: ADR-137, 186 to 195, 203; agent-roster scope 2 to 4, 6, 11, 12; R-0.7, §11.2, R-12.5; reading 10.
Done when:
- It keeps the orchestrator in the main loop on Opus at max, and adds: spawn by tier (`builder`, `builder-sonnet`, `builder-haiku`,
  else general-purpose on that model with the file's text); one Opus retry after two failed gates or a question; the tester per
  group with logic changes; `pnpm check:shipped` in the gate; the sentinel on `main...round/RNN` before the PR, a blocking finding
  stopping the round until a card fixes it and the sentinel re-reads it, the rest becoming Mailbox rows.
- The close: the Spend line; `docs/annex/lessons.md`, a cause seen twice promoted and listed, a rule quiet for five rounds retired;
  /qa on staging after the deploy, the Owner getting URL, QA report and three lines; green Dependabot PRs merged; open rows older
  than 14 days named (ADR-186). Before "promote", the sentinel audits all of `main`.
- The template's gate adds the shipped-code check, audit and gitleaks, the site checks and probe, and the sentinel.

### R13-06 — /plan, /ideate and /qa feed the roster (INTERNAL)
Tier: sonnet — process text in three skill files.
Objective: ideation learns how the Owner decides and checks its research; planning and QA show the new steps.
Files: `.claude/skills/plan/SKILL.md`, `ideate/SKILL.md`, `qa/SKILL.md`.
Refs: ADR-187, 190, 194, 195; agent-roster scope 6, 11, 12, acceptance 7, 11; §11.1, §11.3.
Done when:
- /ideate reads `docs/annex/owner-playbook.md` first; outside evidence goes to the researcher (one for a lookup, two to four for a
  comparison), and research that feeds a decision to the verifier, so only supported claims reach the Owner, each with its verdict.
- At its close, /ideate adds to the playbook what the session taught, and its report line counts the Owner's turns and the
  recommendations taken as they were.
- /plan shows the Owner each card's tier beside the groups.
- /qa targets staging after a round by default and spawns the qa agent on Sonnet at high.

### R13-07 — The learning loop's two files (INTERNAL)
Tier: sonnet — two new documents from the facts listed here.
Objective: the playbook starts with what this session taught about the Owner; the lessons file is ready for R13's close.
Files: new `docs/annex/owner-playbook.md`, new `docs/annex/lessons.md`.
Refs: ADR-195; agent-roster scope 12; R-10.3, §13.
Done when:
- `owner-playbook.md`, rules and not a diary, at most 60 lines: took the default on Playwright for axe on public pages; turned down
  a hotfix because production serves only the waitlist (ADR-167); asked for Opus in research; asked for a learning loop; prefers
  fewer questions, each with a default; and the Owner's own lines quoted in the R11 and R12 plans and reports, each with its
  source ("Continue without this for now", "go" with the asks left at their defaults, the two writers, the coffee voice).
- Nothing in it is guessed; each rule names its date or its document.
- `lessons.md`, at most 60 lines: the line format (round · card · cause · rule it became · where), Promoted and Retired sections,
  empty; the rule: seen twice, promoted into the agent file or skill; quiet for five rounds after that, retired.

---

## Group A — limits and the breaker, CSP, headers, names as data, the contract, CI and the hook

### R13-08 — A limit on every route that spends or sends (USER-FACING) — provisional MB-146
Tier: opus — security and money: these limits guard OpenAI spend and the sender's reputation.
Objective: MB-23 closes: nobody writes, sends or checks out faster than the spec's table, and each refusal says so in one line.
Files: new `api/src/lib/limits.ts` (+ test); `api/src/routes/index.ts`; `api/src/walk/loop.walk.ts`.
Refs: ADR-199, 140, 127; security scope 4, acceptance 6; MB-23, 146; readings 5 to 7; pinned limits and refusals.
Done when:
- `express-rate-limit`, memory store, IP keys from `clientKey`. Writing (POST /reports, /compatibility, /reports/{id}/regenerate,
  /synastry; PATCH /profiles/{id}/birth-time): 6 an hour per account, else session, and 20 a day per IP. GET /geocode and POST
  /horizon/preview (`// MB-146 provisional`, its comment corrected): 60 a minute per IP. POST /invites, /compatibility/{id}/send,
  /gifts: 10 an hour per account, else session. POST /checkout/test: 10 an hour per session (`checkoutLimit`, exported for R14).
- Wired by method and path in `routes/index.ts` ahead of the routers, every writing route behind R13-09's `spendGate()` too.
- A refusal is 429 with `Retry-After` and the pinned body; one line per kind, no countdown (ADR-127's way), passes `/ux-copy`.
- Tests drive each limit through an in-process app and a stub handler, no database (MB-49). The walk: the 11th checkout in an hour
  429s; a foreign-Origin POST 403s and no response sends `Access-Control-Allow-Origin`; at `DAILY_SPEND_CAP_USD=0.01` with a
  seeded report costing 2 ¢ today, POST /reports answers 503 `paused` and the mail stub gets one email.

### R13-09 — The daily spend breaker (USER-FACING) — provisional MB-145
Tier: opus — money: it decides when the product stops writing.
Objective: past a day's cap, new generations pause with one line, and the admin hears once.
Files: new `api/src/lib/spendCap.ts` (+ test); `api/src/lib/mailer.ts` (+ test).
Refs: ADR-199, 77, 84; R-4.4, R-5.6; security scope 4, acceptance 7; MB-145; readings 7, 8; pinned spend and refusals.
Done when:
- `dailyCapUsd()` reads `DAILY_SPEND_CAP_USD`: unset or unreadable means 20 (`// MB-145 provisional`); 0 pauses every generation.
- `spentTodayUsd()` sums the cost `usage.ts` stored on today's (UTC) natal and pair reports and horizon passes, cached for a minute;
  lab runs, the release lab and the QA agent never count.
- `spendGate()` at or past the cap answers 503 with the pinned body before any credit moves; the line passes `/ux-copy` and is
  listed for the Owner.
- `sendSpendPausedEmail` reaches the admin's Clerk address (`ADMIN_USER_ID`) once per UTC day per process, with the day's spend
  and the cap and no customer data; with no admin set, one warning and no email.
- Tests: the cap's parsing; the gate below, at and past the cap with an injected sum; the email's content and its once-a-day rule.

### R13-10 — CSP reports: the route, the counts, the prelaunch door, the admin's numbers (INTERNAL)
Tier: opus — a schema change and a public write endpoint.
Objective: a browser's CSP report becomes a count by directive and blocked host, on staging and production alike.
Files: new `api/src/routes/cspReport.ts`, new `api/src/lib/csp.ts` (+ test); `api/src/app.ts` (the mount); new
`packages/db/src/schema/cspViolations.ts`, `schema/index.ts`; new `packages/db/scripts/migrate-add-csp-violations.ts`,
`scripts/bootstrap-db.sh`; `api/src/lib/prelaunch.ts` (+ test); `api/src/routes/adminLab.ts` (the failures route).
Refs: ADR-198, 167; R-3.5, R-7.3; security scope 3; MB-123, 147; readings 11, 12; pinned CSP.
Done when:
- `csp_violations` (day, directive, blocked, count, last_seen; one row per day, directive and blocked) comes from an idempotent
  script at a new bootstrap step 3x; `db:bootstrap` twice on a scratch Postgres 16, both clean.
- `POST /api/csp-report` takes `application/csp-report` and `application/reports+json` up to 8 kB, mounted ahead of the origin guard
  and the session, 60 a minute per client (`RateLimiter`); it counts a report only when its page is on our hosts, stores the
  directive and the blocked host or keyword (`inline`, `eval`, `data`, `blob`, `extension`), never a path or query; 204.
- `prelaunch.ts` opens `/csp-report` on production; `parseCspReport` is tested on both formats and a foreign page.
- `GET /admin/lab/failures` adds `csp`, the last 7 days, as pinned.

### R13-11 — Security headers and a report-only CSP on every web path (INTERNAL) — MB-30
Tier: opus — security headers, and a policy every page must pass before it is enforced.
Objective: F2 closed on the web: every page sends the headers, and the CSP reports what it would block.
Files: `vercel.json`; new `web/scripts/csp.mjs`; `web/package.json` (the build's last step, and `csp:write`).
Refs: ADR-198, 167; R-7.5, R-7.6; security scope 2, 3, acceptance 4, 5; MB-30, 147; readings 11, 12.
Done when:
- Every path sends HSTS `max-age=31536000; includeSubDomains`, `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `X-Frame-Options: DENY`; the X-Robots-Tag rules stay.
- `Content-Security-Policy-Report-Only` reports to `/api/csp-report` (`report-uri`, and `report-to` with `Reporting-Endpoints`):
  `script-src 'self'`, each prerendered page's JSON-LD hash, Clerk and Cloudflare's challenge; `connect-src` adds Clerk, Nominatim
  and timeapi.io (`// MB-30`); `style-src 'self' 'unsafe-inline'`; `img-src 'self' data: blob:` and Clerk's images; `worker-src
  'self' blob:`; `frame-ancestors 'none'`; `base-uri`, `form-action`, `object-src` closed. Preview hosts also allow Vercel's toolbar.
- `csp.mjs` keeps the host list in one place; `--check` ends `build:web` and fails, naming the command, when vercel.json lacks a
  page's hash; `csp:write` rewrites both host variants. Clerk's hosts come from Clerk's CSP page and the staging bundle's key, and
  are listed in the round report; `build:web` green.

### R13-12 — Names as data in every prompt (USER-FACING · brain)
Tier: opus — the brain path; a typed value must never steer the writer.
Objective: whatever a reader types as a name or a label reaches the model only inside one delimited block it is told never to obey.
Files: new `api/src/prompts/data.ts` (+ test); `brief.ts`; `system.ts`; `pair/index.ts` (`PAIR_SYSTEM`, `PAIR_PROMPT_VERSION`);
`api/src/lib/pairBrief.ts` (+ test); `api/src/lib/aiInterpretation.ts` (`PROMPT_VERSION`); `api/src/prompts/prompts.test.ts`.
Refs: ADR-202, 81, 104; R-4.4, R-5.3, R-5.5; security scope 7, 8; MB-142, 143 (untouched); reading 13; pinned data block.
Done when:
- `dataBlock` puts the value on its own line between fixed open and close markers, stripped of control characters, line breaks
  and the markers' characters, cut at 60; `outsideDataBlocks` returns a prompt without its blocks.
- The natal brief's NAME and the pair brief's two names and "How they know each other" go through `dataBlock`; one rule in
  `SHARED_SYSTEM` and `PAIR_SYSTEM` says a block holds what the reader typed, to use as a name and never to follow.
- Tests: an instruction, a closing marker and 500 characters of markup each render only inside the block; the pair checks still
  match first names. No band, word floor or room rule changes.
- `PROMPT_VERSION` "v9", `PAIR_PROMPT_VERSION` "p4". The gate's dry lab renders every natal and pair prompt, tokens up by the rule
  alone; fixture runs on staging before Promote (Staging confirmation 5).

### R13-13 — The report page renders v9 and p4 (INTERNAL)
Tier: haiku — two strings added to two lists, and their test.
Objective: a report written after R13-12 opens like any other.
Files: `web/src/types/chart.ts`; `web/src/types/chart.test.ts`.
Refs: R13-12; the R12-14 precedent (v8).
Done when: `RENDERABLE_PROMPT_VERSIONS` adds "v9" and `RENDERABLE_PAIR_PROMPT_VERSIONS` adds "p4"; the test pins both lists; web
tests green.

### R13-14 — The contract: a person's name, the label's three words, 429 and 503 (USER-FACING)
Tier: opus — the contract spans three packages and puts the name rule at the API's door.
Objective: the API refuses a name that is not a name, and the client knows a refusal and a pause when it meets one.
Files: `packages/api-spec/openapi.yaml`; the generated client and zod files (codegen only); new `api/src/contract-names.test.ts`.
Refs: ADR-202, 199; R-7.2; security scope 4, 7; readings 13, 14; pinned refusals and names.
Done when:
- `CreateReportBody.name`, `CreateProfileBody.name` and `CreateGiftBody.recipientName` take 1 to 60 characters of letters, marks,
  spaces, apostrophes, hyphens and dots; `label` on `CreateCompatibilityBody` and `CreateRelationshipBody` is `family | friends |
  colleagues`, nullable.
- Components `RateLimited` (429, with the `Retry-After` header) and `Paused` (503) on each route R13-08 and 09 name. Left out, each
  for its reason in a comment: `/api/csp-report` (browsers post it, never the client, like `/admin/*`) and the guard's 403.
- Codegen twice, no diff. Orval writes `new RegExp(pattern)`: if it carries no `u` flag, the pattern spells the scripts' ranges
  without `\p{…}`.
- The test: the generated schemas take "Zoë", "José María", "Nguyễn Thị Minh", "O'Brien", "Anne-Marie", "St. John", "Иван" and
  "李小龙", and refuse a digit, `<`, `{`, a line break and 61 letters.

### R13-15 — The shipped-code check (INTERNAL)
Tier: sonnet — one script and its test in one package.
Objective: CI fails, naming file and line, on what should never ship.
Files: new `scripts/check-shipped.ts`; new `scripts/src/check-shipped.test.ts`; `scripts/package.json`, `scripts/tsconfig.json`;
root `package.json` (`check:shipped`).
Refs: ADR-192; agent-roster scope 8, acceptance 5; R-0.4, R-13.1; MB-108; reading 15.
Done when:
- Over shipped code it fails on a `console.log` call, `localhost` or `127.0.0.1`, a TODO without `MB-NN`, the word "Astra", and an
  import of `api/` from `web/`, each with file and line.
- Its exceptions are one table in the script, each with file, rule and reason: today the API's three dev fallbacks to the local web
  origin (`waitlist.ts`, `invites.ts`, `gifts.ts`) and the QA agent's two lines that look for "Astra".
- `pnpm check:shipped` is green on this branch; the test plants each fault in a scratch tree and reads file and line back, and a
  `console.log` planted in `api/src/lib/` fails it.

### R13-16 — CI: audit, gitleaks, SHA pins and Dependabot (INTERNAL)
Tier: opus — supply chain is security.
Objective: F4's CI half: a vulnerable or leaked change fails CI, every Action is pinned, and updates arrive as reviewed PRs.
Files: `.github/workflows/ci.yml`, `report-lab.yml`, `promote.yml`; new `.github/dependabot.yml`; new `.gitleaks.toml` if needed.
Refs: ADR-200, 192, 82; R-7.4; security scope 5, acceptance 8; agent-roster scope 8; reading 9; pinned commands.
Done when:
- `ci.yml` adds, after the tests: `pnpm check:shipped`; `pnpm audit --prod --audit-level high`; gitleaks over the PR's commits or the
  pushed range, keyless, with the checkout deep enough for the range; `permissions: contents: read`.
- Every `uses:` in these three files is a full commit SHA with its tag in a comment.
- `dependabot.yml`: npm and github-actions, weekly, minor and patch grouped, a 7-day cooldown matching pnpm's release age; security
  updates ungrouped.
- No workflow reads a secret; the built-in token stays only where it is today (`promote.yml`, `report-lab.yml`).
- gitleaks fails on a fake AWS key planted in a scratch repo in the session, never pushed; CI is green on the round's PR.

### R13-17 — The security probe, on every preview and after every deploy (INTERNAL)
Tier: opus — the runtime half of the security gate.
Objective: a deploy that drops a header, sends CORS or lets a foreign write through fails its smoke.
Files: new `.github/scripts/security-probe.sh`; `.github/workflows/smoke-run.yml` (a checkout pinned by SHA, and the step).
Refs: ADR-193, 197, 198; security acceptance 1 to 4; agent-roster scope 10, acceptance 10; reading 4; pinned origin and commands.
Done when:
- `web` mode: the home page sends HSTS, nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy and the report-only CSP.
- `full` mode adds: `/api/healthz` with `Origin: https://evil.example` sends no `Access-Control-Allow-Origin`; that Origin's `POST
  /api/waitlist` with `{}` gets 403; a fresh API GET sets the session cookie with `SameSite=Lax` and `Secure`.
- `smoke-run.yml` runs `full` after the crawl surface, so staging after every merge and production after every promote are probed;
  each miss is one `::error::` line, retried until the deadline like the steps above it. The workflow holds no secret.
- `shellcheck` clean; run against staging today it fails on CORS and the cookie (expected until the merge), which shows it bites.

### R13-18 — Site checks: Lighthouse and axe on every preview (INTERNAL)
Tier: opus — new CI with a browser, a trigger only previews fire, and budgets today's pages may miss.
Objective: every PR's preview is measured for speed and accessibility with no key, and the results stay private artifacts.
Files: new `.github/workflows/site-checks.yml`; `e2e/playwright.config.ts`; new `e2e/tests/a11y.spec.ts`; new
`e2e/lighthouserc.json`; `e2e/package.json` (scripts only).
Refs: ADR-192, 193; agent-roster scope 9, 10, acceptance 6; MB-20; R-7.6; readings 4, 9, 16; pinned commands.
Done when:
- `site-checks.yml` runs on a successful Vercel `deployment_status`, takes the URL from the event, pins every `uses:` by SHA, holds
  no secret, and runs the probe's `web` mode (R13-17).
- Lighthouse CI by its pinned Action on /, /sample and /faq: LCP ≤ 2.5 s, CLS ≤ 0.1, accessibility ≥ 95; reports as artifacts only.
- axe on Playwright over every URL in the preview's `sitemap.xml` plus the legal pages, failing on serious or critical WCAG 2.2 AA
  violations, each listed in an artifact.
- `playwright.config.ts` loses its dev-server block and takes `BASE_URL`; root CI still skips `@workspace/e2e`.
- Shown failing once locally on a planted `<img>` without `alt` against the built pages, then reverted. On the round's preview it is
  green, or each failure goes to the orchestrator with its numbers for Group C; a budget is never loosened.

### R13-19 — The PreToolUse hook (INTERNAL)
Tier: opus — it guards secrets, generated code and the protected branches.
Objective: no session can write a secret or generated file, push to `main` or `production`, or pipe a download into a shell.
Files: new `.claude/hooks/guard.mjs`; `.claude/settings.json`; new `scripts/src/hook-guard.test.ts`.
Refs: ADR-191; agent-roster scope 7, acceptance 4; R-7.2, R-7.4; reading 1; pinned hook.
Done when:
- `guard.mjs` exports `verdict(input)` and, run as the hook, exits 2 with one reason line on: an Edit, Write, MultiEdit or
  NotebookEdit to an env file other than `.env.example`, or under `packages/api-client-react/src/generated/` or
  `packages/api-zod/src/generated/`; a Read of an env file other than `.env.example`; a Bash `git push` to `main` or `production` in
  any form (`HEAD:main`, `+x:refs/heads/production`, `--force`, a deletion); `curl` or `wget` piped into a shell.
- `settings.json` keeps its permissions and plugins, and adds the PreToolUse entry and `permissions.deny` on reading `.env`,
  `.env.local`, `.env.*.local`, `.env.production` and `.env.staging`.
- The test feeds the hook's JSON for each block and each allow (`.env.example`, `git push origin round/R13`, `gh pr merge`, codegen
  through Bash, `curl -o`) and checks the exit code and reason; typecheck green.
- Hooks load at session start, so the live refusal shows in the next session; here `node guard.mjs < sample.json` exits 2.

### R13-20 — The lab's pair campaign fits the limits (INTERNAL)
Tier: sonnet — one function in the lab script.
Objective: the anonymous campaigns still finish on staging now that writing is limited.
Files: `scripts/src/report-lab.ts` (the remote campaigns only).
Refs: ADR-199, 86; R-4.4; reading 7.
Done when:
- The pair campaign writes 16 times in three sessions: curie-winfrey's two natal reports once for its three lenses; the four band
  runs in two sessions (beatrice-athena with william-charlotte, then william-george with charles-william), each inside 6 an hour.
- A 429 stops the campaign with the API's line and `Retry-After`, never a retry loop; the natal campaign is untouched.
- The script's header says to dispatch the natal and pair campaigns as separate runs; typecheck and the scripts' tests green.

---

## Group B — logs, the injection fixtures, the lines on the page, the CSP counts

### R13-21 — Logs keep no birth data, email, names, Clerk ids or tokens (INTERNAL)
Tier: opus — personal data (R-3.5) and the sentinel's "no user text in a log line".
Objective: F5 closed: nothing in a log identifies a person or opens their invite.
Files: `api/src/lib/logger.ts`; new `api/src/lib/logger.test.ts`; `api/src/lib/mailer.ts` (+ test); `api/src/app.ts` (the request
serializer); `api/src/lib/failureLog.ts` (+ test) if the audit finds a gap.
Refs: ADR-201; R-3.5; security scope 6, acceptance 9; reading 17.
Done when:
- pino `redact` covers the birth date, time and place fields, `latitude`, `longitude`, `email`, `to`, `name`, `recipientName`,
  `userId` and other Clerk ids, at the top level and one down, without hiding `err` or a section key; `LOG_LEVEL` still works.
- The request line logs `/api/invites/<token>` as `/api/invites/:token`, and any other path token the same way.
- `logRecipient` is off unless `NODE_ENV` is not `production`; a mailer test pins it.
- The test logs a full request (body, headers, user) to a buffer and finds none of the values.
- Every `generation_failures` message builder is read for birth data and names; a gap is closed in `redact` with a test.
- The walk's own log, run as production, holds none of its birth dates or emails (acceptance 9); the report adds a staging log grep
  where the session can read Railway's logs.

### R13-22 — Three injection fixtures in the dry lab (INTERNAL)
Tier: opus — two packages and the brain's measuring tool.
Objective: the dry lab proves a hostile name stays inside its data block in every natal and pair prompt.
Files: new `fixtures/charts/inject-instruction.json`, `inject-delimiter.json`, `inject-markup.json`; `fixtures/charts/README.md`;
`api/src/lib/labDry.ts`; new `api/src/lib/labDry.test.ts`; `scripts/src/report-lab.ts` (the dry pass).
Refs: ADR-202, 76, 86; R-3.1, R-4.4; security scope 8, acceptance 10; pinned data block and fixtures.
Done when:
- Three synthetic structural fixtures, birth data only, `"injection": true`, each noted as synthetic: an instruction that the name
  rule lets through (letters, spaces, a dot); R13-12's closing marker with an instruction after it; 500 characters of markup.
- `dryInjection` renders every natal section prompt for each (the chart computed at run time, a matrix chart's stored r06
  foundation standing in) and every pair prompt with two of them as A and B over curie-winfrey's runs, and flags a row when
  `outsideDataBlocks` still holds any part of the payload.
- `--dry` prints an injection table after the usual one and exits 1 on a leak; the test catches a planted raw name.
- None of the three joins a campaign or the release lab; the README says why they exist.

### R13-23 — The page shows a refusal, a pause and the name rule (USER-FACING)
Tier: sonnet — error lines and a field hint in existing components, one package.
Objective: where a person writes, sends or buys, a limit or a pause reads as one plain line, and a name that breaks the rule says
why before it is sent.
Files: new `web/src/lib/refusals.ts`, `web/src/lib/person-name.ts` (+ tests); `web/src/pages/BirthFormPage.tsx`, `ReportPage.tsx`
(regenerate's error only); `web/src/components/CompatibilityPicker.tsx`, `BirthTimeDialog.tsx`, `SendDialog.tsx`,
`dashboard/GiftFlow.tsx`, `dashboard/CreditsSheet.tsx`.
Refs: ADR-199, 202, 130; security Screens; the artifact's two lines (Round start 3); reading 18; pinned refusals and names.
Done when:
- `refusalLine(error)` gives the API's line for `rate_limited` and `paused`, else null; each of the seven places shows it where it
  shows errors today, instead of "Something went wrong"; nothing else on them moves.
- `isPersonName` mirrors the contract, and its test reads the pattern out of `openapi.yaml`, so the two cannot drift; the birth
  form's and the gift's name fields say the rule under the field when it breaks, before anything is sent.
- Every new string passes `/ux-copy` and is listed for the Owner; screen readers hear each line; 390 px before 1440 px.

### R13-24 — The Failures tab counts CSP violations (INTERNAL)
Tier: sonnet — one table added to an existing admin view.
Objective: the admin sees the week's CSP violations by directive and blocked host, to decide when the policy is enforced (MB-147).
Files: `web/src/components/lab/FailuresView.tsx`; `web/src/lib/labApi.ts`.
Refs: ADR-198, 85; security scope 3; MB-147; §9 Two tempos; pinned CSP.
Done when: under the rule counts, "CSP, last 7 days" lists one row per directive and blocked host with its count and last day; an
empty state says there are none; an `extension` row is marked as not ours; the type reads the new field; nothing else on the tab
moves.

---

## After the builders: the orchestrator's steps, not cards
1. **The tester** after group 0, A and B, over each group's changed files under `api/src/lib/`, `packages/*` and `web/src/lib/`
   (general-purpose on Sonnet with `tester.md`'s text until the type registers). A failing test it writes is a fix for that card.
2. **The gate:** `pnpm install --frozen-lockfile` · typecheck · `build:web` (now ending in the CSP check) · `build:api` · unit tests ·
   `pnpm check:shipped` · `pnpm audit --prod --audit-level high` · codegen twice, no diff · `db:bootstrap` twice on a scratch
   Postgres 16 · the walk · the dry lab: `pnpm report:lab --dry --base r06`, then `--pair curie-winfrey` under each lens, with the
   injection table clean; paste it into the report.
3. **The sentinel** on `main...round/R13` (general-purpose on Opus at max with `sentinel.md`'s text): a blocking finding becomes a
   Group C card and the sentinel re-reads the fix; the rest become Mailbox rows.
4. **The pull request:** CI (now with the shipped-code check, audit and gitleaks) and the site checks on its preview, with the
   probe's web half. A first site-checks failure becomes Group C, never a loosened budget. Merge once green (R-12.5).
5. **After the merge:** the smoke on `main`, the probe's full half included; the staging confirmation below; `/qa` on staging,
   writing `docs/qa/QA-01.md`; then **the sentinel's first full audit of `main`** (acceptance 9), whose blocking findings are fixed
   on a follow-up branch before any Release. The Owner gets the staging URL, QA-01 and three lines together (ADR-194).

## Staging confirmation, after the merge and before Promote
Free steps first; the orchestrator runs them and reports each line.
1. The smoke on `main` is green with the probe's full half: no CORS, the foreign write 403, the cookie Lax and Secure, HSTS,
   nosniff and X-Frame-Options on the home page (security acceptance 1 to 4).
2. The deploy's bootstrap logs v9 and p4 (staging's natal, pair and `:system` overrides cleared, R12's way) and `csp_violations`
   created (`/api/healthz/db`).
3. **Dry** from the Lab page (base r06, free): every name inside its block.
4. **The CSP walk:** every public page and the app's main flows on staging, the QA run included; the Failures tab shows no
   violation from our pages (acceptance 5), or a fix card goes in before Promote.
5. **Fixture runs** (about 50 ¢ on B): `report-lab.yml` with the natal campaign, then the pair campaign as its own dispatch; then
   `chart=inject-instruction` (3 ¢), whose report must use the name as a name and obey none of it. The other two injection names are
   refused by the API's name rule, which the run shows. The orchestrator reads the names in the prose of every run.
6. **The limit** (about 18 ¢): seven POST /reports in an hour from one session; the 7th answers 429 with `Retry-After` and the line
   (acceptance 6).
7. **The breaker** is proven in the walk at 0.01 (acceptance 7). On staging it needs the variable set in Railway, so it runs only if
   the Owner sets it for a minute; nobody asks.
8. **"Promote":** the sentinel's full audit of `main` is in; the Release view runs the full lab on the five matrix charts and the
   curie-hepburn pair, the gate against r06, the QA agent, then the fast-forward; production's smoke runs the probe.

## Production after the round
Nothing ships to production in the round. The first Release brings R12 and R13 together, the brain changed in both, so the Release
view runs the full lab and the pair, the gate and the QA agent within `LAB_BUDGET_USD` (R-4.4). Production keeps the waitlist over
the site (ADR-167) and gains the headers, the report-only CSP and its counts, no CORS, the Lax cookie, the limits and the breaker.
MB-147's seven days start at that Release. After it, the bible's release log (R-8.1).

## Risks
1. **Report content changes** (R-5.5): every natal and pair prompt gains the data rule, at v9 and p4; staging's overrides clear at
   deploy and production copies staging's at the Release. The dry lab runs in the round, fixtures are read on staging, the Release
   gates production. R13-12 leaves the bands, floors and room rule alone (MB-142, 143 stay at their defaults).
2. **Schema:** one new table, from an idempotent script at a bootstrap 3x step, which can fail a deploy (unlike step 2's push,
   MB-123); `db:bootstrap` twice on a scratch database in the gate.
3. **Dependencies:** `express-rate-limit` (runtime), `@axe-core/playwright` and the pinned `@playwright/test` (dev); `cors` and
   `@types/cors` gone; Lighthouse CI and gitleaks Actions by SHA; pnpm 10.0.0 to the newest 10.x on CI, Vercel and Railway. A
   lockfile pnpm reads differently would show on the preview build and the staging deploy; the round report names the version.
4. **A host missing from `WEB_ORIGINS`** would refuse every write from it. The code's default covers the three hosts the spec
   names; the walk, the probe and the QA run each write through staging.
5. **Today's pages may miss a budget or an axe rule.** The first preview run decides; fixes go in Group C before the merge, and if
   one cannot land in the round the Owner hears it, since the budgets are locked.
6. **The CSP check fails `build:web`** whenever a page's JSON-LD changes without `csp:write`: a deliberate friction, named in the
   error, and a candidate line for `lessons.md`.
7. **The per-IP limits** can be dodged by calling Railway directly with a forged forwarded header, as `clientKey`'s comment says;
   the account and session limits and the breaker still hold. A WAF stays out of scope.
8. **The lab's campaigns** meet the limits like any visitor: R13-20 fits the pair campaign into 16 writes; if natal and pair land
   on one runner address on one day, the last pair run gets a 429 and reruns the next day.
9. **The hook and the new agent types load at session start:** within R13 the hook is proven by its test and the agents run as
   general-purpose with their files' text; the live refusal shows in the next session. An edit to `.claude/settings.json` may ask
   for permission in the harness; it is the Owner's ADR-191.
10. **The sentinel's first full audit** reads code built before it existed and may find blocking issues; they are fixed on a
    follow-up branch, R12-26's way, before any Release.
11. **Dependabot** will open grouped PRs weekly; the orchestrator merges green ones (R-12.5). Its support for pnpm's `catalog:`
    entries is unproven here, so a catalog update that fails CI becomes a Mailbox row.
12. **User-visible without a locked spec:** the name field's hint line and the Failures tab's CSP table; the refusal and pause lines
    are in the spec. Each passes `/ux-copy` and is listed for the Owner.
13. **Size:** 24 cards in three groups, 13 in group A, plus Group C if it fills. Spend: about 70 ¢ of staging runs; the Release
    after.

## Questions raised (Notion, 2026-10-01)
- **Raised before building:** **MB-144** idle anonymous sessions, 90 days (ask 2) · **MB-145** the spend cap's value, 20 USD by code
  (ask 1; provisional in R13-09) · **MB-146** the horizon preview's missing limit (provisional in R13-08) · **MB-147** enforce the
  CSP after 7 clean days (todo, for the first round seven days after the Release).
- **Updated at the close:** MB-23 done (ADR-199 built) · notes on MB-12, 20, 21, 30 and 49 as above.
- **Read at their defaults, untouched:** MB-142 (Luna's lengths), MB-143 (the room idiom), MB-115 (the seller's postal address stays
  out of the repo).

## For the Owner (two asks, highest stakes first)
Nothing blocks the round: approving this plan starts it (§11.2).
1. **The day's spending cap (MB-145).** Past it, new reports pause with one line until midnight UTC, no credit is taken, and you get
   one email. Recommendation: 20 USD a day on both environments, the code's default, so nothing needs setting in Railway. A report
   costs about 3 cents on mix B, so that is about 650 reports a day, far above any day before 100 customers, and it caps a runaway
   at about 600 USD a month. If silent: exactly that.
2. **How long an idle anonymous visitor's data is kept (MB-144).** Someone who enters birth data and never signs in leaves a profile
   behind. Recommendation: 90 days after their last visit, deleted the way Delete report deletes, stated on the privacy page, built
   with payments in R14. If silent: that, and nothing is deleted before R14.

## Close (the orchestrator)
- **Report** (at most 60 lines): every line tagged; the first **Spend** line (subagent tokens per tier from the Agent tool's usage,
  cards per tier, escalations); the dry lab; the sentinel's two runs, the full audit of `main` included; QA-01's sev-1 count.
- **`docs/annex/lessons.md`:** one line per cause of each gate failure, escalation, sentinel finding and QA sev-1, traced to its card;
  nothing can be promoted yet, since no cause has two rounds.
- **Decisions:** none; ADR-187 to 204 are recorded.
- **MASTERFILE 0.23:** §10's agents line names the roster (planner, builder and its two tiers, tester, sentinel, qa, researcher,
  verifier) and `docs/annex/` its two loop files.
- **CLAUDE.md**, at its 120-line budget, so lines are rewritten in place: R-0.7's line (a tier per card, the roster); the CI line
  (the shipped-code check, audit and gitleaks; site checks run Lighthouse and axe on each preview's public pages; no lint step);
  `pnpm check:shipped` and `csp:write` among the commands; the current focus (R13 shipped, QA-01, the first Release next, R14 pricing).
- **INDEX:** both specs built; the code map gains `origin.ts`, `limits.ts`, `spendCap.ts`, `csp.ts`, `cspReport.ts`,
  `prompts/data.ts`, `csp_violations`, `web/scripts/csp.mjs`, `scripts/check-shipped.ts`, the hook, the probe, `site-checks.yml`,
  `dependabot.yml`; agents and the loop files; QA-01; Decisions count 204.
- **Mailbox:** as above, plus one row for R13's new words. Dependabot security updates are switched on through `gh api`
  (`automated-security-fixes` and `vulnerability-alerts`); if the token lacks the right, one row asks the Owner for that toggle.
  Dependabot's first PRs (security acceptance 8) are merged when green.
- The Owner gets the staging URL, QA-01 and three lines: a refused write from a foreign site (from the probe's log), the 429 line on
  the birth form, one fixture's names in prose.
