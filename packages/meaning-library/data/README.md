# Meaning library fixtures

This directory holds the pre-generated meaning fixtures
(`meanings.v1.json`, `meanings.v2.json`) — roughly 465 entries of canonical
per-placement and per-aspect prose. Seeding them lets a fresh database serve
its first natal report entirely from cache, with no AI calls in the request
path.

**The fixture files are not in this repository yet.** They were left behind in
the Replit workspace: the integration used to port this codebase can only read
text files up to ~100 KB, and both fixtures are larger than that.

Nothing is broken without them. `getPlanetSignMeaning` and friends fall back to
the AI on a cache miss and write the result back, so the library fills itself
lazily; the first few reports are just slower and cost AI calls.
`scripts/bootstrap-db.sh` skips the seed step with a warning when the file is
absent.

## Restoring them

Either is fine — pick whichever is cheaper for you.

1. **Copy from the old workspace.** Download `lib/meaning-library/data/*.json`
   from the Replit project and drop the files here unchanged. This preserves
   the exact prose already reviewed in production.

2. **Regenerate from the prompts.** With `DATABASE_URL` and AI credentials set:

   ```bash
   pnpm --filter @workspace/scripts run seed:meanings -- --regenerate
   ```

   This fans out ~465 AI calls (concurrency 8, roughly 8 minutes) and writes
   the fixture from the resulting database state. The prose will differ from
   the original, since it is generated afresh.

Commit the files once restored.
