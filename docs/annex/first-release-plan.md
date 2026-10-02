# The first Release: production gets the waitlist after R14 (planned 2026-10-02)

The Owner, 2026-10-02: once R14 merges to `main`, promote so production shows the waitlist. This replaces CLAUDE.md's
order (Release before R14): R11, R12, R13 and R14 reach production together in one Release. `LAUNCHED` stays `false`,
so production is the site with the waitlist over it (ADR-167); checkout stays closed because the seller has no postal
address (`saleReady()`, MB-115). Launch is a later Release.

Facts this plan rests on (checked 2026-10-02): `production` is at c7999f4 (2026-09-10), `main` 329 commits ahead and 0
behind, so a fast-forward works; 1,154 files differ, 50 of them in the brain; the seller has a name and contact, so
`waitlistReady()` is true; `GITHUB_RELEASE_TOKEN` is on Railway staging (MB-75). mystarsdecoded.com was not reachable
from the session, so what production serves today is unchecked.

## 1. Inside R14 (added to its /plan; the round's gate covers both)
1. **Fix the Release's diff (INTERNAL, blocking).** `githubApi.changedFiles` (`api/src/lib/github.ts:47`) reads one
   compare page, and GitHub's compare API returns at most 300 files. With 1,154 it gets 300 `.claude/…` paths, none in the
   brain, so preflight reads "brain unchanged" and `release.ts:215` skips the lab and the gate, which R-4.4 forbids.
   Fix: a result of 300 or more files counts as "brain changed" (with a test on 300 fake paths). Tier: builder-sonnet.
2. **Bootstrap on production's upgrade path.** On a scratch Postgres: bootstrap at c7999f4, then at R14's head twice.
   Clean both times. R13 tested an empty database only, and production takes R10 to R14's schema in one start.
3. **R14 keeps `LAUNCHED = false`.** Production checkout answers `closed` without live Stripe keys and the full seller.

## 2. After R14 merges, before the Release (ours)
4. `/qa` on staging at R14's head (QA-02). Any sev-1 blocks, and its fix is a pull request before step 7.
5. The sentinel's full audit of `main`. Blocking findings are fixed first.
6. The staging lab is ready. r06 is imported (Runs tab), otherwise the gate has nothing to compare against. The month's
   spend plus the estimate ($1.95) stays under `LAB_BUDGET_USD` ($15).

## 3. The Owner's dashboard steps (credentials only Alex holds; about 30 minutes)
- **Resend (runbook L).** Verify `mystarsdecoded.com` in Resend with its DKIM and SPF records in Vercel DNS. Without it,
  confirmation emails reach nobody else, and every sign-up stays unconfirmed and is deleted after 7 days.
- **Railway `production` Variables:** `APP_ENV=production`, `PROMPTS_READ_ONLY=true`, `PROMPT_SOURCE_DATABASE_URL` (the
  *staging* database), `PUBLIC_APP_URL=https://mystarsdecoded.com`, `RESEND_API_KEY`,
  `RESEND_FROM_EMAIL=Stars Decoded <noreply@mystarsdecoded.com>`, `INVITE_TOKEN_SECRET` (16+ characters), and the
  existing database, Clerk, `ADMIN_USER_ID`, `SESSION_SECRET` and OpenAI keys. Settings: source `production`, no custom
  start or build command, no watch paths (runbook F).
- **Vercel:** `mystarsdecoded.com` on Production, `www` 308 to the apex. The Clerk production instance can wait for
  launch; the waitlist needs no sign-in.

## 4. The Release (staging admin → Lab → Release)
7. Preflight must show the brain **changed** and list no problems. Release runs the full lab (five charts and the pair),
   the gate against r06, the QA agent, then fast-forwards `production`. If it stops at `passed`, dispatch `promote.yml`
   with the release id.
8. **Check production:** `/api/healthz` shows `env: production` and the release commit; `/api/healthz/db` shows the
   bootstrap ran; `/admin/prompts` is read-only. A visitor sees the waitlist; joining sends an email from noreply that
   confirms; the admin list shows it confirmed. Anonymous `POST /api/reports` gets 403 `prelaunch`; the headers and the
   report-only CSP are present.
9. **Rollback:** never by pushing `production`. Redeploy the previous Railway and Vercel deployments from their
   dashboards, then fix on `main` and release again.

## 5. After
The bible's release log (R-8.1); CLAUDE.md's current focus; MB-147's seven clean CSP days start; the four-week warm-up
(phase 0, ADR-147) starts on the first confirmed sign-up. Launch still needs the postal address, live Stripe keys,
`LAUNCHED` with `LAUNCH_DATE`, and another Release.
