#!/bin/bash
# Bring a database — empty, legacy (pre-profile-split), or current — to the
# expected shape and seed it. Safe to re-run: every step is idempotent.
#
# Point DATABASE_URL at the target (e.g. the Supabase connection string) first:
#   DATABASE_URL=postgres://... ./scripts/bootstrap-db.sh
set -e

# Idempotent SQL migrations run first. Drizzle's `push` cannot do this on its
# own because column-rename detection prompts interactively while the legacy
# `reports` columns are still present.
pnpm --filter @workspace/db run migrate

# Drizzle push as a safety net for any non-migration schema drift. Should be a
# no-op once `migrate` has run.
pnpm --filter @workspace/db run push

# Idempotent invite/claim migration so fresh and existing databases both end up
# with invite_tokens + relationship_participants.access_role.
pnpm --filter @workspace/db exec tsx scripts/migrate-add-invites.ts

# Drop prompt_templates overrides for the deleted V1 natal keys.
pnpm --filter @workspace/db exec tsx scripts/migrate-drop-dead-prompt-keys.ts

# Remove the retired meaning_library table and its prompt rows.
pnpm --filter @workspace/db exec tsx scripts/migrate-drop-meaning-library.ts

# Seed prompt_templates with the default prompts (ON CONFLICT DO NOTHING).
pnpm --filter @workspace/scripts run seed:prompts
