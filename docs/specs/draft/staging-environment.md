# Staging environment

Ideation 2026-09-10 with the Owner. Status: draft, built provisionally in the
same session because it blocks payments (MB-6) and prompt review (R-4.4).

## Scope

- Two deployments from one codebase. `main` deploys to **staging**: Vercel
  branch alias `starsdecoded-staging.vercel.app`, Railway environment
  `staging`, a separate Supabase project. A `production` branch deploys to
  **production** as today.
- Promotion is a fast-forward of `main` into `production` by the Promote
  workflow, dispatched by Claude when the Owner says so. It proves staging is
  serving the commit, pushes, then proves production is serving it.
- `/api/healthz` reports `env` and `commit`. The smoke check asserts both on
  every push to `main` (expects staging) and `production` (expects
  production), so a web host rewritten to the wrong API fails loudly.
- `vercel.json` routes same-origin `/api` by host: `starsdecoded-*.vercel.app`
  and `staging.*` go to the staging Railway host, everything else to
  production. PR previews therefore talk to the staging API and database.
- Prompts are edited on staging only. Production sets `PROMPTS_READ_ONLY=true`
  (PUT and DELETE on `/api/admin/prompts` answer 405; the admin page hides
  Save and Reset and says why) and copies staging's `prompt_templates` as the
  last step of its pre-deploy bootstrap, from `PROMPT_SOURCE_DATABASE_URL`.
- A "Staging" ribbon on the web app when the build is a Vercel preview.
- Secrets stay in the Railway, Vercel and Supabase dashboards. Nothing goes
  into GitHub secrets; Promote uses the workflow's own token.

## Out of scope

- Custom domains (the `staging.*` rewrite is ready for one).
- Stripe itself (MB-6). When it lands, test-mode keys go to the staging
  Railway environment and live keys to production, like every other split.
- Prompt version history (MB-19), the stale e2e spec (MB-20), running the
  report lab automatically (MB-34).
- A Clerk production instance. Both deployments share the Development
  instance until a custom domain exists.

## Acceptance criteria

1. Push to `main`: the Smoke run is green with `env: staging` and the pushed
   commit. `starsdecoded-staging.vercel.app` shows the ribbon.
2. Dispatch Promote: green; `starsdecoded.vercel.app/api/healthz` reports
   `env: production` and the promoted commit; no ribbon.
3. On production `/api/admin/me` returns `promptsReadOnly: true`, a PUT to
   `/api/admin/prompts/<key>` returns 405, and `/admin/prompts` shows no Save
   or Reset button and the read-only note.
4. Edit a prompt on staging, promote, and the same text appears on
   production's `/admin/prompts`.
5. On staging `/api/admin/me` returns `isAdmin: true` for the Owner and a
   report generates end to end.
6. Promote refuses a commit that is not on `main`, and refuses when
   `production` carries a commit `main` does not.

## Screens

- Admin prompts page, production: amber `role="status"` note under the
  heading, "Read-only here. Prompts are edited on staging and promoted to
  production with each release." Textareas read-only, Preview still works.
- Staging ribbon: fixed bottom-left pill, "STAGING", amber, above the admin
  nav, never intercepts clicks.

## Owner runbook

`docs/annex/staging-runbook.md`, also published as a tickable checklist at
https://claude.ai/code/artifact/d1091f1b-3923-488c-9596-93c92df325e7. Parts
A to I are dashboard work; J is the switch-over. The `production` branch was
created from `main` at `faf1484` on 2026-09-10, so the dashboards can point
at it before anything new is merged.

## Open questions

- Report lab automation (MB-34): the lab could run against the staging
  database, but the OpenAI key lives only in Railway. Option, not built: two
  staging-only values (a spend-capped OpenAI key, the staging database URL) in
  a GitHub Environment named `staging` with the Owner as required reviewer,
  used solely by a lab workflow. Production secrets never go to GitHub.
- Whether PR previews should keep pointing at the staging database once
  Stripe test mode is on it, or get their own scratch project.
- The Vercel rewrite `has` host regex and Railway's injected variables were
  written from documentation memory (the sandbox cannot reach either site);
  the smoke `env` assertion is the runtime proof.

## Decisions to record

1. Branch model: `main` → staging, `production` → production, promotion is a
   fast-forward by the Promote workflow. Pull requests keep targeting `main`.
2. Isolation: staging has its own Supabase project, OpenAI key and cookie
   secrets; Stripe test mode belongs to staging. Clerk is shared until a
   production instance exists.
3. Prompt flow: code is the source of truth for defaults; overrides are edited
   on staging only and copied to production by the production deploy.
4. Secrets policy: dashboards only. No GitHub Actions secrets, no keys in
   Claude sessions; a staging-only exception needs its own decision.
