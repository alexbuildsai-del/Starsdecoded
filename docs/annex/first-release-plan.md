# The first Release: production gets the waitlist (2026-10-02)

The Owner, 2026-10-02: ship the Release fix now and release; R14 follows. R11 to R13 reach production together.
`LAUNCHED` stays `false`, so production is the site with the waitlist over it (ADR-167); checkout stays closed while the
seller has no postal address (`saleReady()`, MB-115). Launch is a later Release.

Facts: `production` is at c7999f4 (2026-09-10), `main` 329 commits ahead and 0 behind, so a fast-forward works; 1,154 files
differ, 50 in the brain; the seller has a name and contact, so `waitlistReady()` is true; `GITHUB_RELEASE_TOKEN` is on
Railway staging (MB-75).

## 1. Done in this pull request
- **The Release's diff.** GitHub's compare API lists at most 300 files. Preflight read 300 `.claude/…` paths, saw no brain
  file and would have skipped the lab and the gate (R-4.4). A list at the cap now counts as "brain changed"
  (`github.ts` `COMPARE_FILE_CAP`, `release.ts` preflight), with tests.
- **Production's upgrade path, rehearsed.** On a scratch Postgres: bootstrap at c7999f4, sample rows (a user, profiles,
  reports, a `romantic` relationship, credits), then bootstrap at this branch twice. Both runs were clean, the rows kept,
  the types remapped. Step 6 needs `OPENAI_API_KEY` set, which production has.
- The gate is green: typecheck, both builds, unit tests, `check:shipped`, audit. The sentinel audited all of `main`.

## 2. The Owner's dashboards, before the Release (the forward deploys production at once)
**A. Resend (10 min).** resend.com → Domains → Add Domain → `mystarsdecoded.com`, region North Virginia (the privacy page
says the United States). Copy each DNS record it shows. vercel.com → Domains → `mystarsdecoded.com` → DNS Records → Add
each one (type, name, value as shown; MX priority 10). In Resend, Verify until all show Verified.
**B. Railway, `production` environment, the engine service → Variables.** These must be present:
`DATABASE_URL`, `DATABASE_SSL=require`, `NODE_ENV=production`, `APP_ENV=production`, `CLERK_PUBLISHABLE_KEY`,
`CLERK_SECRET_KEY`, `ADMIN_USER_ID`, `OPENAI_API_KEY`, `SESSION_SECRET`, `INVITE_TOKEN_SECRET` (32+ characters),
`RESEND_API_KEY`, `RESEND_FROM_EMAIL=Stars Decoded <noreply@mystarsdecoded.com>`, `PUBLIC_APP_URL=https://mystarsdecoded.com`,
`PROMPTS_READ_ONLY=true`, `PROMPT_SOURCE_DATABASE_URL=<staging's Supabase DATABASE_URL>`. Then Settings: Source branch
`production`; Custom Start and Build Command empty; Watch Paths empty; Wait for CI off. Railway may offer to deploy:
fine, `production` still holds the old code.
**C. Railway, `staging` environment.** `RESEND_FROM_EMAIL` as in B.
**D. Vercel → `starsdecoded` → Settings.** Domains: `mystarsdecoded.com` connected to Production; `www.mystarsdecoded.com`
redirects 308 to the apex. Git → Production Branch is `production`. Environment Variables: `VITE_CLERK_PUBLISHABLE_KEY`
on Production and Preview. System Environment Variables exposed.

## 3. The Release (the Owner presses it; Claude reads every step)
1. After this merges, wait until `starsdecoded-staging.vercel.app/api/healthz` shows the merge commit.
2. Staging → sign in → `/admin/report-lab` → Runs: r06 is listed (else "Import r05 and r06").
3. Release tab → Preflight: brain **changed**, natal and pair; no problem listed; about $1.95. Press **Release**:
   lab, gate against r06, QA agent, forward. If it ends `passed`, Claude dispatches `promote.yml` with the release id.
4. Production checks (Claude): `/api/healthz` shows `env: production` and the release commit; `/api/healthz/db` shows
   the bootstrap ran; a visitor sees the waitlist; anonymous `POST /api/reports` gets 403 `prelaunch`; the headers and
   the report-only CSP are present. The Owner joins the waitlist from a private window, gets the email from
   `noreply@mystarsdecoded.com`, confirms, and sees the address confirmed in `/admin/waitlist`.
5. **Rollback:** never by pushing `production`. Railway → production → Deployments → the previous one → Redeploy, and
   Vercel → Deployments → the previous Production one → Promote; then fix on `main` and release again.

## 4. After
The bible's release log (R-8.1); CLAUDE.md's current focus; MB-147's seven clean CSP days start; the four-week warm-up
(phase 0, ADR-147) starts at the first confirmed sign-up. Launch needs the postal address, live Stripe keys,
`LAUNCHED` with `LAUNCH_DATE`, a Clerk production instance, and another Release.
