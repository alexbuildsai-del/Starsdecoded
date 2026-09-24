#!/bin/bash
# Bring a database — empty, legacy (pre-profile-split), or current — to the
# expected shape and seed it. Safe to re-run: every step is idempotent, which
# is what lets Railway run this at the start of every deploy (railway.json
# startCommand). A non-zero exit keeps the new version from taking traffic.
#
# Locally, point DATABASE_URL at the target first:
#   DATABASE_URL=postgres://... DATABASE_SSL=require ./scripts/bootstrap-db.sh
set -e

if [ -z "${DATABASE_URL:-}" ]; then
  echo "bootstrap-db: DATABASE_URL is not set — nothing to migrate against." >&2
  echo "bootstrap-db: on Railway, add it to the service's Variables tab." >&2
  exit 1
fi

echo "==> 1/7 SQL migrations"
# These run first. Drizzle's `push` cannot do this on its own, because column
# rename detection prompts interactively while the legacy `reports` columns are
# still present, and a deploy has no one to answer it.
pnpm --filter @workspace/db run migrate

echo "==> 2/7 Schema push"
# A safety net for any drift the migrations do not cover. A no-op once they
# have run.
pnpm --filter @workspace/db run push

echo "==> 3/7 Invite/claim migration"
# Idempotent, so fresh and existing databases both end up with invite_tokens
# and relationship_participants.access_role.
pnpm --filter @workspace/db exec tsx scripts/migrate-add-invites.ts

echo "==> 3b/7 Report workbook column"
# Adds reports.workbook, the reader's ticked actions. Idempotent.
pnpm --filter @workspace/db exec tsx scripts/migrate-add-report-workbook.ts

echo "==> 3c/7 Birth time as a window"
# Adds profiles.timezone and profiles.birth_time_window_minutes (ADR-33, MB-48). Idempotent.
pnpm --filter @workspace/db exec tsx scripts/migrate-add-birth-time-window.ts

echo "==> 3d/7 The horizon pass"
# Adds reports.horizon_passes and the report_revisions table (ADR-35). Idempotent.
pnpm --filter @workspace/db exec tsx scripts/migrate-add-report-revisions.ts

echo "==> 3e/7 Three lenses"
# Remaps relationships.type to partners, parent_child, people (ADR-40, ADR-68). Idempotent.
pnpm --filter @workspace/db exec tsx scripts/migrate-remap-relationship-types.ts

echo "==> 3f/7 One credit kind"
# credits.credit_type becomes nullable with a default; nothing dropped (ADR-42, MB-57). Idempotent.
pnpm --filter @workspace/db exec tsx scripts/migrate-credit-type-nullable.ts

echo "==> 3g/7 The lab tables"
# lab_runs and lab_judgements, the report lab's runs and the reading room's cards (ADR-52, ADR-53). Idempotent.
pnpm --filter @workspace/db exec tsx scripts/migrate-add-lab-tables.ts

echo "==> 4/7 Drop dead V1 prompt overrides"
# Removes prompt_templates rows for the natal keys deleted from
# promptDefaults.ts. Idempotent.
pnpm --filter @workspace/db exec tsx scripts/migrate-drop-dead-prompt-keys.ts

echo "==> 5/7 Retire the meaning library"
# Drops the meaning_library table and its prompt rows. The natal report now
# composes from api/src/prompts/vocabulary.ts. Idempotent.
pnpm --filter @workspace/db exec tsx scripts/migrate-drop-meaning-library.ts

echo "==> 6/7 Prompt overrides"
# Prompts resolve from code; a row exists only where /admin/prompts overrode
# one. A prompt version bump clears that family's overrides, natal or pair,
# since they target a contract that no longer exists (v6, p2). Never seeds
# copies of the defaults.
pnpm --filter @workspace/scripts run prompts:reset-stale

echo "==> 7/7 Promote prompt overrides from staging"
# Only production sets PROMPT_SOURCE_DATABASE_URL (to the staging database).
# Runs after the seed so the reviewed staging text wins over defaults; staging
# and local runs skip it. The script refuses to sync a database onto itself or
# from an empty source. A refusal or any other failure no longer aborts the
# deploy: on 2026-09-10 that turned a prompt-copy problem into an outage. The
# seeded defaults serve instead, and the failure is reported below.
if [ -n "${PROMPT_SOURCE_DATABASE_URL:-}" ]; then
  if sync_output=$(pnpm --filter @workspace/db exec tsx scripts/sync-prompt-overrides.ts 2>&1); then
    printf '%s\n' "$sync_output"
    sync_status="prompt-sync ok"
  else
    printf '%s\n' "$sync_output"
    reason=$(printf '%s\n' "$sync_output" | grep -m1 -oE '(Error|error): .*' | cut -c1-160)
    sync_status="prompt-sync FAILED, serving the seeded defaults: ${reason:-see the deploy log}"
    echo "bootstrap-db: $sync_status" >&2
  fi
else
  echo "PROMPT_SOURCE_DATABASE_URL not set — skipped."
  sync_status="prompt-sync skipped"
fi

echo "==> Database ready ($sync_status)"
# /api/healthz/db reports this line, so a deploy whose start command skipped
# the bootstrap, one that ran it against the wrong database, and one whose
# prompt copy failed can all be told apart without dashboard access.
printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$sync_status" > /tmp/bootstrap-db.done || true
