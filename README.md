# Starsdecoded

Astra — natal chart and synastry reports. Birth data in, accurate planetary
positions computed locally, AI-written psychological interpretation out.

This repository is the source of truth. It was ported off Replit; see
[Porting notes](#porting-notes) for the two things that did not come across.

## Layout

Each deployable target is a top-level directory.

| Path        | What it is                       | Deploys to |
| ----------- | -------------------------------- | ---------- |
| `web/`      | React + Vite single-page app     | Vercel     |
| `api/`      | Express API (`/api/*`)           | Railway    |
| `mobile/`   | Expo client — scaffold only      | Expo / EAS |

Shared code lives in `packages/`, and is consumed through the workspace rather
than published:

| Package                              | Role                                               |
| ------------------------------------ | -------------------------------------------------- |
| `db`                                 | Drizzle schema + pool. Owns every table.            |
| `api-spec`                           | OpenAPI document and the Orval codegen config.      |
| `api-zod`                            | Generated Zod schemas — request validation.         |
| `api-client-react`                   | Generated React Query hooks + fetch client.         |
| `integrations-openai-ai-server`      | Server-side OpenAI client.                          |
| `integrations-openai-ai-react`       | Client-side helpers (audio/voice).                  |

`scripts/` holds one-off and seed scripts; `e2e/` holds the Playwright suite.

The database is Postgres on Supabase. Nothing but `api/` and `scripts/` talks
to it directly today.

## Getting started

Requires Node 22+ and pnpm 10.

```sh
pnpm install
cp .env.example .env        # then fill it in

pnpm run db:bootstrap       # idempotent: migrate, push, seed
pnpm run dev:api            # http://localhost:8080
pnpm run dev:web            # http://localhost:5173, proxies /api to :8080
```

`pnpm run typecheck` covers the whole workspace; `pnpm test` runs package
tests; the Playwright suite lives in `e2e/`.

## How a report is generated

1. `POST /api/reports` resolves-or-creates a profile and returns immediately.
2. Chart computation runs in-process (`astronomy-engine`, no native bindings)
   and the result is cached on the profile, so a second report for the same
   person skips straight to interpretation.
3. Interpretation runs as one foundation call, then ten sections in parallel
   against OpenAI. Each prompt is assembled from a static vocabulary and
   doctrine block (`api/src/prompts/`) plus a per-chart brief derived in code,
   including sect, dignity, house rulers and the Lots
   (`api/src/lib/traditional.ts`). Every section's output is enforced by a zod
   schema via structured outputs.
4. The client polls `/api/reports/:id/status` until `complete`.

Prompts are editable at runtime: natal defaults derive from the section
registry in `api/src/prompts/index.ts`, synastry defaults live in
`promptDefaults.ts`, and any of them can be overridden per-key from
`/admin/prompts` (gated by `ADMIN_USER_ID`). The response shape is applied by
code from each section's schema and cannot be overridden. `pnpm report:lab`
generates a report from a committed fixture and measures it before a prompt
change ships.

## Deployment

Configuration is documented in `.env.example` — the blocks map to the targets
below.

**Web → Vercel.** `.vercelignore` keeps `api/` out of the upload: Vercel reads
a top-level `api/` directory as serverless functions and would otherwise try to
compile the Express server as one. `vercel.json` at the repo root supplies the install and
build commands, and the output lands in `dist/` there, where Vercel's Vite
preset looks by default. Set `VITE_API_BASE_URL` to the Railway origin and
`VITE_CLERK_PUBLISHABLE_KEY` to the Clerk publishable key; both are inlined at
build time, so changing either needs a redeploy.

**API → Railway.** `railway.json` (repo root) builds the workspace and starts
`@workspace/api-server`, health-checking `/api/healthz`. Railway injects `PORT`.

**Database → Supabase.** Point `DATABASE_URL` at the Supabase connection string
(the session pooler, not the transaction pooler — Drizzle uses prepared
statements) and set `DATABASE_SSL=require`. Railway runs
`scripts/bootstrap-db.sh` as its `preDeployCommand`, so migrations and seeds
apply on every deploy; every step is idempotent. A failure there aborts the
deploy and leaves the previous version serving, rather than starting a release
against a database that does not match it. Run the same script by hand
(`pnpm run db:bootstrap`) to set up a database from a laptop.

Because web and API are separate origins in production, the anonymous session
cookie is `SameSite=None; Secure` (see `CROSS_SITE_COOKIES`). Serving both from
one origin means turning that off.

## Porting notes

The Replit connector used for the port reads text files only, so two things
were left behind. Both are documented in place and neither blocks a build:

- **Planet artwork** — `web/src/assets/planets/*.webp` are 1×1 transparent
  placeholders. The chart wheel works; the planets are invisible until the real
  renders are copied over. `web/public/opengraph.jpg` is missing outright. See
  `web/src/assets/planets/README.md`.

Replit-specific glue was removed rather than ported: the Vite dev plugins, the
`.replit`/`replit.nix` files, the workspace mockup-preview app, the Connectors
proxy the mailer used for Resend credentials, and the AI proxy env pair (still
honoured if set, but `OPENAI_API_KEY` is the documented path).
