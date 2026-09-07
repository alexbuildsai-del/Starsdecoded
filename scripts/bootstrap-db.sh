#!/bin/bash
# Bring a database — empty, legacy (pre-profile-split), or current — to the
# expected shape and seed it. Safe to re-run: every step is idempotent, which
# is what lets Railway run this as its preDeployCommand on every deploy.
#
# Locally, point DATABASE_URL at the target first:
#   DATABASE_URL=postgres://... DATABASE_SSL=require ./scripts/bootstrap-db.sh
set -e

if [ -z "${DATABASE_URL:-}" ]; then
  echo "bootstrap-db: DATABASE_URL is not set — nothing to migrate against." >&2
  echo "bootstrap-db: on Railway, add it to the service's Variables tab." >&2
  exit 1
fi

echo "==> 1/5 SQL migrations"
# These run first. Drizzle's `push` cannot do this on its own, because column
# rename detection prompts interactively while the legacy `reports` columns are
# still present, and a deploy has no one to answer it.
pnpm --filter @workspace/db run migrate

echo "==> 2/5 Schema push"
# A safety net for any drift the migrations do not cover. A no-op once they
# have run.
pnpm --filter @workspace/db run push

echo "==> 3/5 Invite/claim migration"
# Idempotent, so fresh and existing databases both end up with invite_tokens
# and relationship_participants.access_role.
pnpm --filter @workspace/db exec tsx scripts/migrate-add-invites.ts

echo "==> 4/5 Meaning library"
# Hydrates meaning_library from the committed fixture so the first natal report
# is library-backed rather than paying for per-entry AI calls. Skips with a
# warning when the fixture is absent, which it currently is.
pnpm --filter @workspace/scripts run seed:meanings

echo "==> 5/5 Prompt templates"
# ON CONFLICT DO NOTHING, so this never overwrites prompts edited from
# /admin/prompts.
pnpm --filter @workspace/scripts run seed:prompts

echo "==> Database ready"
