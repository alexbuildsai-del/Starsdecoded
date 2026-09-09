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

echo "==> 1/6 SQL migrations"
# These run first. Drizzle's `push` cannot do this on its own, because column
# rename detection prompts interactively while the legacy `reports` columns are
# still present, and a deploy has no one to answer it.
pnpm --filter @workspace/db run migrate

echo "==> 2/6 Schema push"
# A safety net for any drift the migrations do not cover. A no-op once they
# have run.
pnpm --filter @workspace/db run push

echo "==> 3/6 Invite/claim migration"
# Idempotent, so fresh and existing databases both end up with invite_tokens
# and relationship_participants.access_role.
pnpm --filter @workspace/db exec tsx scripts/migrate-add-invites.ts

echo "==> 4/6 Drop dead V1 prompt overrides"
# Removes prompt_templates rows for the natal keys deleted from
# promptDefaults.ts. Idempotent.
pnpm --filter @workspace/db exec tsx scripts/migrate-drop-dead-prompt-keys.ts

echo "==> 5/6 Retire the meaning library"
# Drops the meaning_library table and its prompt rows. The natal report now
# composes from api/src/prompts/vocabulary.ts. Idempotent.
pnpm --filter @workspace/db exec tsx scripts/migrate-drop-meaning-library.ts

echo "==> 6/6 Prompt templates"
# ON CONFLICT DO NOTHING, so this never overwrites prompts edited from
# /admin/prompts.
pnpm --filter @workspace/scripts run seed:prompts

echo "==> Database ready"
