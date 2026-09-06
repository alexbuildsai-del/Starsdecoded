// Seed the meaning library.
//
// Default mode (used by post-merge and devs):
//   pnpm --filter @workspace/scripts run seed:meanings
//
// Loads the committed JSON fixture at
// `lib/meaning-library/data/meanings.<PROMPT_VERSION>.json` and bulk-inserts
// it into the `meaning_library` table with ON CONFLICT DO NOTHING. No AI
// calls happen in this path — fresh environments boot a fully library-backed
// natal chart report on the first request.
//
// Regenerate mode (maintainers, after prompt changes):
//   pnpm --filter @workspace/scripts run seed:meanings -- --regenerate
//
// Fans out the full combination space (764 entries) to OpenAI, persists each
// row, then re-dumps the table to the JSON fixture so the new content can be
// committed.
//
//   --force        delete existing rows for the targeted keys before inserting
//                  (useful for refreshing the DB from the committed fixture).
//   --regenerate   call AI for every entry and rewrite the fixture from the
//                  resulting DB state. Implies --force.
//   --kind=a,b     restrict --regenerate to a comma-separated subset of kinds
//                  (e.g. --kind=ascendant_sign,midheaven_sign). Untouched rows
//                  remain in the DB and are re-emitted to the fixture as-is.

import { existsSync } from "node:fs";
import {
  ASPECT_TYPES,
  HOUSES,
  PLANETS,
  PROMPT_VERSION,
  SIGNS,
  ascendantSignKey,
  aspectKey,
  bulkUpsertMeanings,
  closePool,
  deleteMeanings,
  getAscendantSignMeaning,
  getAspectMeaning,
  getFixturePath,
  getMidheavenSignMeaning,
  getPlanetHouseMeaning,
  getPlanetSignMeaning,
  getSynastryAspectMeaning,
  loadFixtureFromDisk,
  type MeaningFixtureEntry,
  midheavenSignKey,
  planetHouseKey,
  planetSignKey,
  selectAllMeanings,
  synastryAspectKey,
  writeFixtureToDisk,
  type AspectType,
  type House,
  type Planet,
  type Sign,
} from "@workspace/meaning-library";

const CONCURRENCY = 8;

const args = new Set(process.argv.slice(2));
const regenerate = args.has("--regenerate");
const force = regenerate || args.has("--force");

// --kind=ascendant_sign,midheaven_sign restricts regeneration to a subset of
// the kind-space. Only honoured in --regenerate mode; bootstrap always loads
// the full fixture verbatim.
const kindArg = process.argv.slice(2).find((a) => a.startsWith("--kind="));
const kindFilter: Set<string> | null = kindArg
  ? new Set(
      kindArg
        .slice("--kind=".length)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    )
  : null;

interface Job {
  kind:
    | "planet_sign"
    | "planet_house"
    | "aspect"
    | "ascendant_sign"
    | "midheaven_sign"
    | "synastry_aspect";
  key: string;
  run: () => Promise<unknown>;
}

function buildJobs(): Job[] {
  const jobs: Job[] = [];

  // 10 planets x 12 signs = 120
  for (const planet of PLANETS) {
    for (const sign of SIGNS) {
      jobs.push({
        kind: "planet_sign",
        key: planetSignKey(planet, sign),
        run: () => getPlanetSignMeaning(planet as Planet, sign as Sign),
      });
    }
  }

  // 10 planets x 12 houses = 120
  for (const planet of PLANETS) {
    for (const house of HOUSES) {
      jobs.push({
        kind: "planet_house",
        key: planetHouseKey(planet, house),
        run: () => getPlanetHouseMeaning(planet as Planet, house as House),
      });
    }
  }

  // 12 ascendant signs + 12 midheaven signs = 24
  for (const sign of SIGNS) {
    jobs.push({
      kind: "ascendant_sign",
      key: ascendantSignKey(sign),
      run: () => getAscendantSignMeaning(sign as Sign),
    });
    jobs.push({
      kind: "midheaven_sign",
      key: midheavenSignKey(sign),
      run: () => getMidheavenSignMeaning(sign as Sign),
    });
  }

  // Distinct planet pairs x 5 aspect types — pairs are unordered.
  // 10 choose 2 = 45 pairs, x 5 aspects = 225.
  // We dedupe by canonical aspect key in case ordering produces collisions.
  const seenAspectKeys = new Set<string>();
  for (let i = 0; i < PLANETS.length; i++) {
    for (let j = i + 1; j < PLANETS.length; j++) {
      const p1 = PLANETS[i];
      const p2 = PLANETS[j];
      for (const t of ASPECT_TYPES) {
        const key = aspectKey(p1, t, p2);
        if (seenAspectKeys.has(key)) continue;
        seenAspectKeys.add(key);
        jobs.push({
          kind: "aspect",
          key,
          run: () => getAspectMeaning(p1 as Planet, t as AspectType, p2 as Planet),
        });
      }
    }
  }

  // Synastry cross-aspects — unordered planet pairs INCLUDING same-planet
  // pairs (sun-sun, moon-moon, etc.) since the two charts can each contribute
  // the same planet at different angles. 10 choose 2 + 10 = 55 pairs x 5
  // aspect types = 275 entries. Canonical key dedupes any reordering.
  const seenSynastryKeys = new Set<string>();
  for (let i = 0; i < PLANETS.length; i++) {
    for (let j = i; j < PLANETS.length; j++) {
      const p1 = PLANETS[i];
      const p2 = PLANETS[j];
      for (const t of ASPECT_TYPES) {
        const key = synastryAspectKey(p1, t, p2);
        if (seenSynastryKeys.has(key)) continue;
        seenSynastryKeys.add(key);
        jobs.push({
          kind: "synastry_aspect",
          key,
          run: () =>
            getSynastryAspectMeaning(p1 as Planet, t as AspectType, p2 as Planet),
        });
      }
    }
  }

  return jobs;
}

interface JobResult {
  job: Job;
  ok: boolean;
  error?: unknown;
}

async function runWithConcurrency(jobs: Job[], concurrency: number): Promise<JobResult[]> {
  const results: JobResult[] = [];
  let nextIndex = 0;
  let done = 0;
  const total = jobs.length;
  const startedAt = Date.now();

  async function worker(): Promise<void> {
    while (true) {
      const i = nextIndex++;
      if (i >= jobs.length) return;
      const job = jobs[i];
      try {
        await job.run();
        results.push({ job, ok: true });
      } catch (err) {
        results.push({ job, ok: false, error: err });
        const message = err instanceof Error ? err.message : String(err);
        console.error(`  ✗ [${job.kind}] ${job.key} — ${message}`);
      }
      done++;
      if (done % 10 === 0 || done === total) {
        const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
        console.log(`  progress: ${done}/${total} (${elapsed}s elapsed)`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

async function bootstrapFromFixture(): Promise<void> {
  const t0 = Date.now();

  // The fixture is an optimisation, not a requirement: without it the
  // library lazily fills each meaning from the AI on first lookup. Skip
  // rather than fail so a fresh environment can still finish bootstrapping.
  if (!existsSync(getFixturePath())) {
    console.warn(
      `No meaning fixture at ${getFixturePath()} — skipping bootstrap. `
        + `The library will fill lazily from the AI on first lookup; run with `
        + `--regenerate to rebuild the fixture (needs AI access).`,
    );
    return;
  }

  const entries = loadFixtureFromDisk();
  console.log(
    `Loaded ${entries.length} entries from fixture (prompt ${PROMPT_VERSION}): ${getFixturePath()}`,
  );

  if (force) {
    console.log("Deleting existing rows for these keys (force mode)…");
    await deleteMeanings(entries.map((e) => ({ kind: e.kind, key: e.key })));
  }

  const { inserted, updated, unchanged } = await bulkUpsertMeanings(entries);
  const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
  console.log(
    `Bootstrapped meaning library in ${elapsed}s — ${inserted} inserted, ${updated} updated, ${unchanged} unchanged`,
  );
}

async function regenerateFromAI(): Promise<void> {
  const allJobs = buildJobs();
  const jobs = kindFilter ? allJobs.filter((j) => kindFilter.has(j.kind)) : allJobs;
  if (kindFilter) {
    console.log(
      `Kind filter active: ${[...kindFilter].join(", ")} — ${jobs.length}/${allJobs.length} jobs`,
    );
  }
  if (jobs.length === 0) {
    console.error("No jobs match the requested kind filter; nothing to do.");
    process.exitCode = 1;
    return;
  }
  console.log(
    `Regenerate plan: ${jobs.length} entries via AI (concurrency=${CONCURRENCY})`,
  );

  console.log("Deleting existing rows for these keys before regeneration…");
  await deleteMeanings(jobs.map((j) => ({ kind: j.kind, key: j.key })));

  const t0 = Date.now();
  const results = await runWithConcurrency(jobs, CONCURRENCY);
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  const succeeded = results.filter((r) => r.ok).length;
  const failed = results.length - succeeded;
  console.log("");
  console.log(`AI generation done in ${elapsed}s — ${succeeded} succeeded, ${failed} failed`);

  if (failed > 0) {
    console.error("Some entries failed; refusing to overwrite committed fixture.");
    process.exitCode = 1;
    return;
  }

  const dbRows = await selectAllMeanings();

  if (kindFilter) {
    // Targeted regeneration: only overwrite the targeted kinds in the
    // on-disk fixture. All other rows must remain exactly as committed,
    // because the DB may legitimately hold older promptVersion content
    // for non-targeted kinds (e.g. when this script runs against a
    // partially-bootstrapped environment). Dumping the raw DB snapshot
    // here would silently downgrade unrelated entries.
    const existing = loadFixtureFromDisk();
    const replacements = new Map<string, MeaningFixtureEntry>();
    for (const row of dbRows) {
      if (kindFilter.has(row.kind)) {
        replacements.set(`${row.kind}:${row.key}`, row);
      }
    }
    const merged: MeaningFixtureEntry[] = existing.map((e) => {
      if (kindFilter.has(e.kind)) {
        return replacements.get(`${e.kind}:${e.key}`) ?? e;
      }
      return e;
    });
    // Append any newly-generated rows that didn't exist in the prior fixture.
    const existingKeys = new Set(existing.map((e) => `${e.kind}:${e.key}`));
    for (const [id, row] of replacements) {
      if (!existingKeys.has(id)) merged.push(row);
    }
    writeFixtureToDisk(merged);
    console.log(
      `Wrote ${merged.length} entries to ${getFixturePath()} (merged ${replacements.size} regenerated rows; preserved untouched kinds)`,
    );
    return;
  }

  writeFixtureToDisk(dbRows);
  console.log(`Wrote ${dbRows.length} entries to ${getFixturePath()}`);
}

async function main(): Promise<void> {
  if (regenerate) {
    await regenerateFromAI();
  } else {
    await bootstrapFromFixture();
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => {
    // The DB pool keeps the process alive — close it explicitly.
    void closePool();
  });
