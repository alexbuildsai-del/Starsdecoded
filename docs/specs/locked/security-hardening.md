# Security hardening

Ideation 2026-10-01 with the Owner. Status: locked 2026-10-01 (ADR-197 to 204), built in R13. Artifact: https://claude.ai/artifact/9XS8C1BgKVtLSP3cdNFQ7d

Before launch, close the gaps found by a read of the API, `vercel.json` and
CI against the OWASP Top 10:2025 and LLM Top 10:2025. The fixes are built in
R13 with agent-roster, before pricing, which moves to R14. Then comes a full
QA on staging and the first Release (Owner, 2026-10-01). Nothing ships as a
hotfix, because production serves non-admins only healthz, the waitlist and
the admin (ADR-167). The full app and its session data live on staging only,
which has no real visitors.

The Stripe webhook is already planned correctly in the pricing plan (now
`docs/rounds/R14-plan.md`): raw body before any parser, event ids recorded,
signed test headers. So it is not repeated here. The sentinel reviews it when
R14 builds it.

## Findings that drive it

- **F1, high.** `cors({ origin: true, credentials: true })`
  (`api/src/app.ts:57`) echoes back any origin and allows credentials, and
  `.env.example` sets `CROSS_SITE_COOKIES=true`. That makes the session cookie
  `SameSite=None`. With both on, any website a visitor opens can read that
  visitor's anonymous session data through `mystarsdecoded.com/api`: their
  birth data, charts and reports. The web has called `/api` on its own origin
  since the Vercel rewrites, so neither setting is needed any more. R-7.5 is
  stale.
- **F2, high.** No security headers on any response: no HSTS, CSP, nosniff,
  frame-ancestors or Referrer-Policy.
- **F3, high.** Report generation, regeneration, geocode and the
  invite and gift emails have no rate limit (MB-23, open 10 rounds). That
  leaves OpenAI spend and our email sender reputation open to abuse (LLM10).
- **F4, medium.** Supply chain. pnpm 10.0.0 has no release-age delay. There is
  no Dependabot and no audit step, and Actions are pinned by tag, not by commit.
- **F5, medium.** Logs redact only auth and cookie headers. Birth data, email
  and Clerk ids are not redacted, and the mailer can log recipients.
- **F6, medium.** `express.json()` has no explicit body limit, and a name a
  user types reaches the prompts with no length or character rule.

## Scope

1. **CORS and CSRF.**
   - Remove the `cors` middleware, so the API sends no CORS headers at all.
   - Any POST, PUT, PATCH or DELETE carrying an `Origin` outside
     `WEB_ORIGINS` gets 403. `WEB_ORIGINS` is an env list: production, the
     staging alias and `starsdecoded-*.vercel.app`.
   - The Stripe webhook needs no exception, because it sends no `Origin`.
   - `CROSS_SITE_COOKIES` is removed from code and `.env.example`, and the
     cookie becomes `SameSite=Lax; Secure`.
   - R-7.5 is superseded.
2. **Headers** in `vercel.json` for every path:
   - `Strict-Transport-Security: max-age=31536000; includeSubDomains`;
   - `X-Content-Type-Options: nosniff`;
   - `Referrer-Policy: strict-origin-when-cross-origin`;
   - `Permissions-Policy: camera=(), microphone=(), geolocation=()`;
   - `X-Frame-Options: DENY`.

   The API sets nosniff and `frame-ancestors 'none'` on its own responses.
3. **CSP, in two steps.**
   - **Report-only.** First ship `Content-Security-Policy-Report-Only`, with
     hashes for the prerendered pages' inline JSON-LD and the hosts the app
     really loads: Clerk, Nominatim and timeapi.io until MB-30 moves them
     server-side.
   - **Reports.** Violations go to `POST /api/csp-report`, which counts them
     by directive and blocked host, stores no URL path or query, and shows the
     counts on the admin Failures tab.
   - **Enforced.** After 7 days with no violation from our own pages, the
     same policy is enforced.
4. **Rate limits and a spend breaker** (closes MB-23). `express-rate-limit` is
   the one new dependency. Its store is in memory, since staging and
   production each run one instance.

   | Route | Limit |
   |---|---|
   | Report, pair report and regenerate | 6 an hour per session, 20 a day per IP |
   | Geocode | 60 a minute per IP |
   | Send, gift and invite emails | 10 an hour per user |
   | Create checkout | 10 an hour per session |
   | Waitlist | unchanged |

   - A limited request answers 429 with `Retry-After` and one line written
     through `/ux-copy`.
   - `DAILY_SPEND_CAP_USD`, a Railway variable, sums today's generation
     cost from `usage.ts`. Past it, new generations answer 503 with
     `reason: paused`, the admin gets one email, and lab runs keep
     `LAB_BUDGET_USD`.
5. **Supply chain.**
   - pnpm moves to the latest 10.x with `minimumReleaseAge: 10080` (7 days).
   - `onlyBuiltDependencies` stays the build allowlist.
   - `.github/dependabot.yml` covers npm and github-actions weekly, grouped by
     minor and patch, plus security updates. The orchestrator merges a green
     PR (R-12.5).
   - CI adds `pnpm audit --prod --audit-level high` and `gitleaks` over the
     diff. Every `uses:` is pinned to a commit SHA with its tag in a comment.
6. **Privacy in logs.**
   - pino `redact` adds the birth date, time and place fields, latitude and
     longitude, `email`, `name` and Clerk ids, with a test that logs a full
     request and finds none of them.
   - The mailer's `logRecipient` is off unless `NODE_ENV` is not production.
   - `generation_failures` rows are audited to hold no birth data.
7. **Input limits.**
   - `express.json({ limit: "32kb" })`.
   - A person's name is at most 60 characters of letters, marks, spaces,
     apostrophes, hyphens and dots, checked in the zod schema from
     `openapi.yaml`.
   - The prompts wrap every user-typed value in a delimited data block and
     tell the model it is a name, not an instruction. That is a brain change,
     so the dry lab runs.
8. **Injection fixtures.** Three charts in `fixtures/charts/` carry names
   built to inject: an instruction, a closing delimiter and a long run of
   markup. The dry lab asserts their prompts render the name only inside the
   data block. A spot run on demand confirms the report never obeys it.
9. **The sentinel checklist**, which the `sentinel` agent (agent-roster)
   applies to every round diff:
   - no secret, key or token in the diff;
   - every `/admin/*` route behind `ADMIN_USER_ID`;
   - every route that reads a report or chart goes through `access.ts`;
   - new routes carry a rate limit when they spend or send;
   - no new `dangerouslySetInnerHTML` fed by data;
   - no user text in a log line;
   - no new third-party host without a CSP entry;
   - webhooks verify a signature on the raw body;
   - a new dependency is named in the plan;
   - the schema gives no anonymous session access to another's rows.

## Out of scope

- A WAF, bot management or Cloudflare in front of Vercel. Revisit at launch
  if abuse appears.
- Data retention for idle anonymous sessions. That decides what a buyer has
  stored, so it goes to a Mailbox row with a recommendation of 90 days.
- Moving Nominatim and timeapi.io server-side (MB-30). The CSP lists them
  until then.
- A penetration test by a third party.

## Acceptance criteria

1. `curl -H "Origin: https://evil.example" mystarsdecoded.com/api/healthz`
   returns no `Access-Control-Allow-Origin`.
2. A POST with that Origin returns 403.
3. The session cookie reads `SameSite=Lax; Secure` on staging.
4. `smoke.yml` asserts HSTS, nosniff and X-Frame-Options on the home page of
   both environments.
5. The report-only CSP shows zero violations from our own pages on staging
   after a full walk of every public page and the app.
6. The 7th report request in an hour from one session answers 429 with
   `Retry-After` and the agreed line.
7. With `DAILY_SPEND_CAP_USD=0.01` on staging, the next generation answers 503
   `paused` and one admin email goes out.
8. `pnpm install` refuses a package version younger than 7 days.
   Dependabot opens its first PRs. CI fails on a planted fake AWS key.
9. The redact test passes. A grep of a staging log after a full report finds
   no birth date or email.
10. The dry lab shows the three injection names inside their data blocks
    only.

## Screens

The 429 and `paused` lines appear where the birth form and Send already show
errors. No new screen. The artifact draws the request path, layer by layer,
with each finding at its layer, and mocks the two lines on the birth form.
Artifact: https://claude.ai/artifact/9XS8C1BgKVtLSP3cdNFQ7d

## Open questions

None. The Owner decided on 2026-10-01 that there is no hotfix and that this
spec and agent-roster are R13, ahead of pricing (R14). F1 is R13's first
card, and the first Release waits for R13 and the QA after it.

## Decisions to record

Recorded as ADR-197 to 203, in this order; ADR-204 sets the sequence (R13, then QA, then the first Release; pricing is R14).


- The API sends no CORS headers. A foreign-Origin write gets 403. The cookie
  is `SameSite=Lax`, superseding R-7.5.
- Security headers on every response. CSP ships report-only, then is enforced
  after 7 clean days.
- Rate limits per the scope 4 table, and a daily generation spend cap
  (`DAILY_SPEND_CAP_USD`). Closes MB-23.
- Supply chain: a 7-day release age, Dependabot, an audit step, gitleaks,
  and Actions pinned by SHA.
- Logs redact birth data, email, names and Clerk ids.
- Names are bounded and passed to prompts as delimited data, with injection
  fixtures in the dry lab.
- The sentinel checklist (scope 9) is the security gate of every round.
