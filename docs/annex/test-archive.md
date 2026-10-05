# Test tiers: critical and archive

Owner, 2026-10-05. Tests are split in two tiers. Nothing was deleted.

**Critical** runs on every push (`pnpm test`, CI). It guards the buyer flow: sign in and the session claim, buy
credits (test checkout, the credits ledger), write a Personal report (the reports route, generation plumbing, the
spend), gift a report, the recipient claims it and writes her own, share and share back, a pair report and its
send, and the Timeline access check alone. Two groups always run with it: the chart math every report rests on
(natal chart, houses, Chiron, the wheel's placements) and the security core (requireAccount, session, rate limits
and the spend gate, the origin guard, log redaction, the edge middleware).

**Archive** is everything else: second-layer `*.edges` / `*.guards` files, Timeline and Ask, admin, lab and
release, the public site and SEO, copy-pinning tests, view helpers, birth-entry field cases and tooling.

## The rule

- A file joins critical only if a bug it catches would stop a buyer from finishing the flow above.
- The archive is kept and stays green, but is not run by default and builders do not read it. Read it when
  researching a bug in its area, or when a card touches that area; then run it.
- `pnpm test:deep` runs every package's whole suite; `pnpm --filter <pkg> run test:deep` runs one.
- Each package lists its critical files in `test.critical` (one path per line, from the package root).
  `scripts/test-critical.mjs` (node packages) and `web/vitest.config.ts` (`TEST_TIER=critical`) refuse a missing
  or empty list or a listed file that is gone, so the tier never widens to everything unseen.
- A new test file lands in the archive unless its card says it guards the flow; then add it to `test.critical`.

## Per package (files / cases, measured 2026-10-05)

| Package | Critical | Archive | Critical wall | Deep wall |
|---|---|---|---|---|
| api | 26 / 332 | 64 / 854 | 21 s | 71 s |
| web | 8 / 96 | 80 / 1,351 | 2 s | 18 s |
| packages/engine | 3 / 21 | 13 / 166 | 2 s | 12 s |
| packages/db | 3 / 17 | 5 / 32 | 2 s | 3 s |
| packages/commerce | 2 / 21 | 1 / 3 | 1 s | 1 s |
| scripts | 1 / 12 | 10 / 96 | 2 s | 6 s |

Cases count DB-gated tests, which skip without a database (11 in the api's critical tier, 85 in its deep run).

## The archive by area (files)

| Package | Area | Files |
|---|---|---|
| api | Timeline and Ask (lib, prompts, routes; all but `timelineAccess.test`) | 16 |
| api | Admin, lab, release, QA agent, usage and models, CSP reports, failure lines | 22 |
| api | Brain: prompts, checks, data blocks, evidence, style, traditional, legacy synastry | 13 |
| api | Public site, waitlist, prelaunch, health, appEnv, legacy routes | 6 |
| api | Account views (home), deletion, places ranking, name contract, validation | 5 |
| api | Second-layer shares (`shares.edges`, `shares.claimed`) | 2 |
| web | Report and dashboard view helpers (heroes, rows, ledger, chapters, home view) | 26 |
| web | Timeline, Ask, sky, teaser, Mira sample | 23 |
| web | Public site, SEO, prerender, FAQ and page copy | 13 |
| web | Birth entry fields (date, time, name, place, form draft) | 11 |
| web | Admin, prelaunch, waitlist, page titles, processors, 404 page | 7 |
| packages/engine | Timeline sky: transits, cycles, doctrine, tone, plain words, sky | 12 |
| packages/engine | Export map | 1 |
| packages/db | Schema of archived areas (Timeline, CSP reports, workbooks) | 3 |
| packages/db | Deploy and prompt-sync tooling (drizzle config, prompt sync) | 2 |
| packages/commerce | Terms copy | 1 |
| scripts | CI gates and hooks (check-shipped, copies, hook guard, names, price, UI imports) | 6 |
| scripts | Lab and prompt tooling (report lab, prompt families, vocabulary) | 4 |
