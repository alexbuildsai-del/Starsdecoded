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
| `meaning-library`                    | DB-backed cache of pre-generated astrology meanings.|
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
3. Interpretation sections are generated in parallel against OpenAI, drawing on
   the meaning library so most placements never hit the AI at all.
4. The client polls `/api/reports/:id/status` until `complete`.

Prompts are editable at runtime: `promptDefaults.ts` holds 85 defaults, and any
of them can be overridden per-key from `/admin/prompts` (gated by
`ADMIN_USER_ID`). Editing a meaning-library prompt automatically marks the
affected cached entries stale so they regenerate.

## Deployment

Configuration is documented in `.env.example` — the blocks map to the targets
below.

**Web → Vercel.** `web/vercel.json` builds from the repo root so the workspace
resolves. Output lands in `dist/` at the repo root so Vercel finds it on defaults. Set `VITE_API_BASE_URL` to the Railway origin; it is inlined at build
time, so a change needs a redeploy.

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
- **Meaning-library fixtures** — `packages/meaning-library/data/meanings.v*.json`
  are absent (both exceed the connector's 100 KB limit). The library fills
  itself lazily from the AI instead, so early reports are slower and cost API
  calls. See `packages/meaning-library/data/README.md`.

Replit-specific glue was removed rather than ported: the Vite dev plugins, the
`.replit`/`replit.nix` files, the workspace mockup-preview app, the Connectors
proxy the mailer used for Resend credentials, and the AI proxy env pair (still
honoured if set, but `OPENAI_API_KEY` is the documented path).
