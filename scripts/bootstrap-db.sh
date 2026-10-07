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
# still present, and a deploy has no one to answer it. The waitlist's
# confirmation columns (ADR-145) come here rather than from `push`, so
# the `launch-email-v1` rows are marked confirmed in the transaction that adds
# confirmed_at: the API deletes an address left unconfirmed for seven days.
# The payments columns come last (ADR-275 to 277, 313): `push` would stop to
# ask before dropping credits.credit_type or putting a unique index over rows,
# and the bundles and failed reports from before the round are marked in the
# transaction that adds their column, so no later run marks a new one.
pnpm --filter @workspace/db run migrate

echo "==> 2/7 Schema push"
# A safety net for any drift the migrations do not cover. A no-op once they
# have run. drizzle-kit prints a statement that fails and still exits 0
# (MB-123), so its output is read for an error line, as step 7 reads one: a
# half-pushed schema stops the deploy instead of starting the API on it.
push_status=0
push_output=$(pnpm --filter @workspace/db run push 2>&1) || push_status=$?
# Postgres's detail line names the row a statement tripped on (a duplicated
# key's value: a Clerk id, an email), and a deploy log is no place for it. It
# is dropped before anything is printed or read; the error line still names
# what failed and the constraint line where.
push_output=$(printf '%s\n' "$push_output" | sed -E '/^[[:space:]]*[Dd][Ee][Tt][Aa][Ii][Ll]:/d')
printf '%s\n' "$push_output"
push_error=$(printf '%s\n' "$push_output" | grep -m1 -oE '(Error|error): .*' | cut -c1-160)
if [ "$push_status" -ne 0 ] || [ -n "$push_error" ]; then
  echo "bootstrap-db: schema push FAILED: ${push_error:-exit status $push_status}" >&2
  exit 1
fi

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
# Made credits.credit_type nullable (ADR-42); step 1 now drops the column (MB-57, ADR-275), so this
# finds nothing to do. Idempotent.
pnpm --filter @workspace/db exec tsx scripts/migrate-credit-type-nullable.ts

echo "==> 3g/7 The lab tables"
# lab_runs and lab_judgements, the report lab's runs and the reading room's cards (ADR-52, ADR-53). Idempotent.
pnpm --filter @workspace/db exec tsx scripts/migrate-add-lab-tables.ts

echo "==> 3h/7 The failure log and the release record"
# generation_failures, lab_releases and reports.failure_code (ADR-84 to 86). Idempotent.
pnpm --filter @workspace/db exec tsx scripts/migrate-add-failures-and-releases.ts

echo "==> 3i/7 The waitlist"
# waitlist_signups, the pre-launch list production collects until launch (ADR-141). Idempotent.
pnpm --filter @workspace/db exec tsx scripts/migrate-add-waitlist.ts

echo "==> 3j/7 Send, Gift and the test checkout"
# profiles.claimed_as_self; invite_tokens gains kind, a nullable profile_id, credit_id,
# recipient_name, note, reminded_at, revoked_at; bundles.is_test and credits.is_test
# (ADR-120, 123, 138, 139; MB-81, 83). Idempotent.
pnpm --filter @workspace/db exec tsx scripts/migrate-add-send-and-gift.ts

echo "==> 3k/7 The CSP's counts"
# csp_violations, one row per UTC day, directive and blocked host or keyword, which
# POST /api/csp-report adds to (ADR-198). Idempotent.
pnpm --filter @workspace/db exec tsx scripts/migrate-add-csp-violations.ts

echo "==> 3l/7 The spend ledger"
# spend_ledger, one row per UTC day and kind of visitor generation, which every model
# call made for a visitor adds its cost to and the daily spend breaker sums (ADR-199). Idempotent.
pnpm --filter @workspace/db exec tsx scripts/migrate-add-spend-ledger.ts

echo "==> 3m/7 Share grants, per-reader workbooks, the handback stamp"
# profile_shares, report_workbooks and invite_tokens.handed_back_at (ADR-235, 236, 239).
# The push above usually makes all three first; this step still runs because only it
# copies each report's ticks from reports.workbook to the report's holder, and it does
# so whichever made the table. Idempotent.
pnpm --filter @workspace/db exec tsx scripts/migrate-add-shares-and-workbooks.ts

echo "==> 3n/7 Timeline's readings and Ask's messages"
# timeline_readings and ask_messages, the two tables Timeline writes (ADR-210, 213). The push
# above usually makes both first. This step still runs because the push is only the safety net
# (step 2): the script holds both tables by the schema's own names, so whichever makes them the
# other finds no drift, and both exist before the API starts. No subscriptions table until
# billing (ADR-262). Idempotent.
pnpm --filter @workspace/db exec tsx scripts/migrate-add-timeline.ts

echo "==> 3o/7 The payment tables"
# purchases, stripe_events, subscriptions, campaigns, testers and qa_walks: what checkout, the
# webhook, Timeline's plan, the admin's Sales page and the staging walk write (ADR-274 to 279, 315).
# The push above usually makes all six first. This step still runs because the push is only the
# safety net (step 2): the script holds the six tables by the schema's own names, so whichever
# makes them the other finds no drift, and all six exist before the API starts. The round's columns
# on existing tables went in at step 1. Idempotent.
pnpm --filter @workspace/db exec tsx scripts/migrate-add-payments.ts

echo "==> 3p/7 The job queue, Timeline's setup and the walk's pictures"
# jobs, timeline_setups and qa_shots: the queue the API's worker takes jobs from (ADR-357), each
# subscriber's Timeline setup (ADR-302, 362) and the staging walk's pictures (ADR-360). The push above
# usually makes all three first. This step still runs because the push is only the safety net (step 2)
# and the worker reads jobs as soon as the API starts: the script holds the three tables by the
# schema's own names, so whichever makes them the other finds no drift, and all three exist before the
# API starts. No existing table changes, so step 1 has nothing new. Idempotent.
pnpm --filter @workspace/db exec tsx scripts/migrate-add-jobs.ts

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
# one. A prompt version bump clears that family's overrides (natal, pair,
# timeline, ask), since they target a contract that no longer exists (v7, p2);
# a natal bump also clears every :system override, all four families, since
# each embeds the style contract (ADR-104). Never seeds copies of the defaults.
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
