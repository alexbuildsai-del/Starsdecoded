/**
 * The job queue (ADR-357, reading 7) on a scratch Postgres named by WALK_DATABASE_URL, after db:bootstrap: two workers
 * never take one job, a key queued twice runs once, a job another worker holds is skipped, an expired lease is taken
 * again (R16-24's lesson) and one on its last attempt fails with a code, a failure backs off from 30 s doubling to an
 * hour and stops at max_attempts, a wait asked for gives its attempt back, stopWorker waits and then hands back what's
 * left, done rows go after 7 days, and no line carries a payload. Without a database these skip, saying why. Every
 * handler here is a stand-in; nothing reaches a model.
 */
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { sql } from "drizzle-orm";

const SCRATCH = process.env.WALK_DATABASE_URL;
// Only a database handed over for this: without one the pool points at a closed port, so a read there fails at once.
process.env.DATABASE_URL = SCRATCH ?? "postgres://test:test@127.0.0.1:1/never";
process.env.LOG_LEVEL ??= "silent";

const { db, pool } = await import("@workspace/db");
const { logger } = await import("./logger.js");
const J = await import("./jobs.js");
type JobPayload = import("./jobs.js").JobPayload;

const NO_DB = SCRATCH ? false : "no WALK_DATABASE_URL: the queue runs on a scratch Postgres after db:bootstrap";

// Every payload carries this, so a line that printed one would show it.
const SECRET = "p-secret";

const lines: Array<{ fields: unknown; msg: unknown }> = [];
const spied = logger as unknown as Record<string, (fields: unknown, msg?: unknown) => void>;
for (const level of ["debug", "info", "warn", "error"]) {
  const original = spied[level]!.bind(logger);
  spied[level] = (fields, msg) => {
    lines.push({ fields, msg });
    original(fields, msg);
  };
}

after(async () => {
  await J.stopWorker(0);
  await pool.end();
});

interface Row {
  id: string;
  status: string;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  locked_until: Date | null;
  wait_s: number;
}

async function reset(): Promise<void> {
  await db.execute(sql`DELETE FROM jobs`);
}

async function rowOf(id: string): Promise<Row> {
  const result = await db.execute<Row & Record<string, unknown>>(sql`
    SELECT id, status, attempts, max_attempts, last_error, locked_until, EXTRACT(EPOCH FROM run_at - now())::float8 AS wait_s
    FROM jobs WHERE id = ${id}
  `);
  assert.ok(result.rows[0], `job ${id} is gone`);
  return result.rows[0];
}

async function statuses(): Promise<Record<string, number>> {
  const result = await db.execute<{ status: string; n: number }>(sql`SELECT status, count(*)::int AS n FROM jobs GROUP BY status`);
  return Object.fromEntries(result.rows.map((r) => [r.status, r.n]));
}

async function until(check: () => Promise<boolean>, ms: number, what: string): Promise<void> {
  const end = Date.now() + ms;
  while (!(await check())) {
    assert.ok(Date.now() < end, `still waiting after ${ms} ms: ${what}`);
    await sleep(20);
  }
}

/** A row put straight into the table, as a worker that died would leave it. */
async function insertJob(shape: {
  kind?: string;
  status: string;
  attempts?: number;
  maxAttempts?: number;
  lockedForS?: number | null;
  updatedDaysAgo?: number;
}): Promise<string> {
  const id = randomUUID();
  const locked = shape.lockedForS ?? null;
  await db.execute(sql`
    INSERT INTO jobs (id, kind, payload, status, attempts, max_attempts, locked_until, updated_at)
    VALUES (
      ${id}, ${shape.kind ?? "timeline.reading"}, ${JSON.stringify({ profileId: `${SECRET}-row` })}::jsonb, ${shape.status},
      ${shape.attempts ?? 0}, ${shape.maxAttempts ?? 5},
      CASE WHEN ${locked}::int IS NULL THEN NULL ELSE now() + make_interval(secs => ${locked}::int) END,
      now() - make_interval(days => ${shape.updatedDaysAgo ?? 0})
    )
  `);
  return id;
}

test("a key queued twice runs once, is refused while its job runs, and can be queued again once that job is done", { skip: NO_DB }, async () => {
  await reset();
  const ran: JobPayload[] = [];
  const whileRunning: Array<string | null> = [];
  J.registerHandler("timeline.reading", async (payload) => {
    ran.push(payload);
    whileRunning.push(await J.enqueue("timeline.reading", { profileId: `${SECRET}-again`, key: "k" }, { dedupeKey: "reading:p1:k" }));
  });
  const first = await J.enqueue("timeline.reading", { profileId: `${SECRET}-1`, key: "k" }, { dedupeKey: "reading:p1:k" });
  const second = await J.enqueue("timeline.reading", { profileId: `${SECRET}-2`, key: "k" }, { dedupeKey: "reading:p1:k" });
  assert.match(first ?? "", /^[0-9a-f-]{36}$/);
  assert.equal(second, null, "the key is queued");
  assert.equal(await J.drainJobs(), 1);
  assert.deepEqual(ran, [{ profileId: `${SECRET}-1`, key: "k" }]);
  assert.deepEqual(whileRunning, [null], "the key is running");
  const done = await rowOf(first!);
  assert.equal(done.status, "done");
  assert.equal(done.attempts, 1);
  assert.equal(done.locked_until, null);
  const third = await J.enqueue("timeline.reading", { profileId: `${SECRET}-3`, key: "k" }, { dedupeKey: "reading:p1:k" });
  assert.ok(third && third !== first, "a done key can be queued again");
  assert.deepEqual(await statuses(), { done: 1, queued: 1 });
});

test("two workers never take one job: the worker and two drains race for forty jobs, and each job runs once", { skip: NO_DB }, async (t) => {
  await reset();
  const runs = new Map<number, number>();
  J.registerHandler("timeline.reading", async (payload) => {
    const n = Number(payload.n);
    runs.set(n, (runs.get(n) ?? 0) + 1);
    await sleep(5 + (n % 3) * 5);
  });
  for (let n = 0; n < 40; n += 1) assert.ok(await J.enqueue("timeline.reading", { profileId: `${SECRET}-${n}`, n }));
  J.startWorker({ concurrency: 4, pollMs: 10 });
  const drained = await Promise.all([J.drainJobs(), J.drainJobs()]);
  await until(async () => (await statuses()).done === 40, 10_000, "forty jobs done");
  await J.stopWorker(1000);
  assert.equal(runs.size, 40);
  for (const [n, count] of runs) assert.equal(count, 1, `job ${n} ran ${count} times`);
  const attempts = await db.execute<{ attempts: number; n: number }>(sql`SELECT attempts, count(*)::int AS n FROM jobs GROUP BY attempts`);
  assert.deepEqual(attempts.rows, [{ attempts: 1, n: 40 }], "every job was taken once");
  t.diagnostic(`the drains ran ${drained.join(" and ")}, the worker ${40 - drained[0]! - drained[1]!}`);
});

test("a job another worker holds is skipped, not waited for, and taken once that worker lets it go", { skip: NO_DB }, async () => {
  await reset();
  const ran: string[] = [];
  J.registerHandler("timeline.reading", async (payload) => {
    ran.push(String(payload.key));
  });
  const held = await J.enqueue("timeline.reading", { profileId: `${SECRET}-held`, key: "held" });
  await J.enqueue("timeline.reading", { profileId: `${SECRET}-free`, key: "free" });
  const other = await pool.connect();
  try {
    await other.query("BEGIN");
    await other.query("SELECT id FROM jobs WHERE id = $1 FOR UPDATE", [held]);
    assert.equal(await J.drainJobs(), 1);
    assert.deepEqual(ran, ["free"]);
    assert.equal((await rowOf(held!)).status, "queued");
  } finally {
    await other.query("ROLLBACK");
    other.release();
  }
  assert.equal(await J.drainJobs(), 1);
  assert.deepEqual(ran, ["free", "held"]);
});

test("an expired lease is taken again on its next attempt; one on its last attempt fails with a code; a live lease is left", { skip: NO_DB }, async () => {
  await reset();
  const attempts: number[] = [];
  J.registerHandler("timeline.reading", async (_payload, ctx) => {
    attempts.push(ctx.attempt);
  });
  const expired = await insertJob({ status: "running", attempts: 1, lockedForS: -60 });
  const spent = await insertJob({ status: "running", attempts: 5, lockedForS: -60 });
  const live = await insertJob({ status: "running", attempts: 1, lockedForS: 240 });
  assert.equal(await J.drainJobs(), 1);
  assert.deepEqual(attempts, [2], "only the expired lease ran, on its second attempt");
  const retaken = await rowOf(expired);
  assert.equal(retaken.status, "done");
  assert.equal(retaken.attempts, 2);
  const failed = await rowOf(spent);
  assert.equal(failed.status, "failed");
  assert.equal(failed.last_error, "lease_lost");
  assert.equal(failed.attempts, 5);
  assert.equal((await rowOf(live)).status, "running");
  assert.ok(lines.some((l) => l.msg === "job's lease ran out; taken again"));
});

test("a failure comes back after 30 s, doubling, never past an hour, and stops at max_attempts with its code", { skip: NO_DB }, async () => {
  await reset();
  J.registerHandler("timeline.reading", async () => {
    throw Object.assign(new Error(`the model refused ${SECRET}-in-a-message`), { code: "model_refused" });
  });
  const id = await J.enqueue("timeline.reading", { profileId: `${SECRET}-fails` });
  for (const [attempt, waitS] of [[1, 30], [2, 60], [3, 120], [4, 240]] as const) {
    assert.equal(await J.drainJobs(), 1);
    const row = await rowOf(id!);
    assert.equal(row.status, "queued", `after attempt ${attempt}`);
    assert.equal(row.attempts, attempt);
    assert.equal(row.last_error, "model_refused");
    assert.ok(Math.abs(row.wait_s - waitS) < 5, `attempt ${attempt} waits ${row.wait_s} s, not ${waitS} s`);
    assert.equal(await J.drainJobs(), 0, "not due yet");
    await db.execute(sql`UPDATE jobs SET run_at = now() WHERE id = ${id}`);
  }
  assert.equal(await J.drainJobs(), 1);
  const last = await rowOf(id!);
  assert.equal(last.status, "failed");
  assert.equal(last.attempts, 5);
  assert.equal(last.last_error, "model_refused");
  await db.execute(sql`UPDATE jobs SET run_at = now() WHERE id = ${id}`);
  assert.equal(await J.drainJobs(), 0, "nothing runs past max_attempts");

  const long = await J.enqueue("timeline.reading", { profileId: `${SECRET}-long` });
  await db.execute(sql`UPDATE jobs SET attempts = 7, max_attempts = 10 WHERE id = ${long}`);
  assert.equal(await J.drainJobs(), 1);
  const capped = await rowOf(long!);
  assert.equal(capped.attempts, 8);
  assert.ok(Math.abs(capped.wait_s - 3600) < 5, `the eighth failure waits ${capped.wait_s} s, not an hour`);

  J.registerHandler("timeline.reading", async () => {
    throw new TypeError(`no code here, ${SECRET}`);
  });
  const plain = await J.enqueue("timeline.reading", { profileId: `${SECRET}-plain` });
  await J.drainJobs();
  assert.equal((await rowOf(plain!)).last_error, "TypeError", "an error with no code is named by its class");
});

test("a wait asked for gives its attempt back; the spend breaker's wait ends at the next UTC midnight", { skip: NO_DB }, async () => {
  await reset();
  assert.equal(J.nextUtcMidnight(new Date("2026-10-07T23:59:59Z")).toISOString(), "2026-10-08T00:00:00.000Z");
  assert.equal(J.nextUtcMidnight(new Date("2026-12-31T00:00:00Z")).toISOString(), "2027-01-01T00:00:00.000Z");
  let retryAt = J.nextUtcMidnight();
  J.registerHandler("timeline.reading", async () => ({ retryAt }));
  const paused = await J.enqueue("timeline.reading", { profileId: `${SECRET}-paused` });
  assert.equal(await J.drainJobs(), 1);
  const waiting = await rowOf(paused!);
  assert.equal(waiting.status, "queued");
  assert.equal(waiting.attempts, 0, "the wait spent no attempt");
  assert.ok(Math.abs(waiting.wait_s - (retryAt.getTime() - Date.now()) / 1000) < 5, "it waits for midnight");
  assert.equal(await J.drainJobs(), 0, "not due before midnight");

  retryAt = new Date(Date.now() - 60_000);
  const now = await J.enqueue("timeline.reading", { profileId: `${SECRET}-now` });
  assert.equal(await J.drainJobs(), 1);
  const soon = await rowOf(now!);
  assert.ok(Math.abs(soon.wait_s - 30) < 5, `a wait already past comes back in 30 s, not ${soon.wait_s} s`);
});

test("stopWorker waits for a running job, then hands back what's left with its attempt and its order kept", { skip: NO_DB }, async () => {
  await reset();
  let aborted = false;
  J.registerHandler("timeline.reading", async () => {
    await sleep(300);
  });
  J.registerHandler("timeline.ahead", (_payload, ctx) =>
    new Promise<void>((_resolve, reject) => {
      ctx.signal.addEventListener("abort", () => {
        aborted = true;
        reject(ctx.signal.reason);
      });
    }),
  );
  const quick = await J.enqueue("timeline.reading", { profileId: `${SECRET}-quick` });
  const slow = await J.enqueue("timeline.ahead", { userId: `${SECRET}-slow` });
  const slowRunAt = await db.execute<{ run_at: string }>(sql`SELECT run_at::text FROM jobs WHERE id = ${slow}`);
  const started = performance.now();
  assert.equal(J.startWorker({ concurrency: 2, pollMs: 10 }), undefined);
  assert.ok(performance.now() - started < 50, "the start reads nothing first");
  await until(async () => (await statuses()).running === 2, 5000, "both jobs running");
  const stopping = performance.now();
  await J.stopWorker(1000);
  const took = performance.now() - stopping;
  assert.ok(took >= 950 && took < 4000, `the stop took ${took} ms`);
  assert.equal((await rowOf(quick!)).status, "done", "the drain let the quick job end");
  const handed = await rowOf(slow!);
  assert.equal(handed.status, "queued");
  assert.equal(handed.attempts, 0, "the cut run's attempt is given back");
  assert.equal(handed.locked_until, null);
  assert.equal(handed.last_error, null);
  const kept = await db.execute<{ run_at: string }>(sql`SELECT run_at::text FROM jobs WHERE id = ${slow}`);
  assert.equal(kept.rows[0]!.run_at, slowRunAt.rows[0]!.run_at, "it keeps its place in the queue");
  assert.ok(aborted, "the handler was told to stop");
  assert.ok(lines.some((l) => l.msg === "job worker stopped" && (l.fields as { handedBack?: number }).handedBack === 1));
});

test("done rows go after 7 days; younger ones and failed ones stay", { skip: NO_DB }, async () => {
  await reset();
  const old = await insertJob({ status: "done", attempts: 1, updatedDaysAgo: 8 });
  const young = await insertJob({ status: "done", attempts: 1, updatedDaysAgo: 6 });
  const failed = await insertJob({ status: "failed", attempts: 5, updatedDaysAgo: 30 });
  J.startWorker({ pollMs: 10 });
  await until(async () => (await db.execute(sql`SELECT 1 FROM jobs WHERE id = ${old}`)).rows.length === 0, 5000, "the old done row gone");
  await J.stopWorker(100);
  assert.equal((await rowOf(young)).status, "done");
  assert.equal((await rowOf(failed)).status, "failed");
});

test("a job's lines carry its id, kind, attempt and code, and no line carries a payload or an error's message", { skip: NO_DB }, () => {
  const jobLines = lines.filter((l) => typeof (l.fields as { jobId?: unknown })?.jobId === "string");
  assert.ok(jobLines.length > 0, "the jobs above logged");
  for (const l of jobLines) {
    const fields = l.fields as Record<string, unknown>;
    assert.equal(typeof fields.kind, "string");
    assert.equal(typeof fields.attempt, "number");
    for (const key of Object.keys(fields)) assert.ok(["jobId", "kind", "attempt", "code", "retryInS", "retryAt", "ms"].includes(key), key);
  }
  assert.ok(jobLines.some((l) => (l.fields as { code?: unknown }).code === "model_refused"));
  assert.ok(!JSON.stringify(lines).includes(SECRET), "a payload or a message reached a line");
});
