/**
 * The job queue (ADR-357, reading 7): one Postgres table worked inside the API, so Timeline's readings are written in
 * the background with no queue service. A worker takes due jobs with FOR UPDATE SKIP LOCKED, so two workers, in one
 * process or in the two a deploy overlaps, never take one job; each holds what it took for a 5-minute lease. A failed
 * run comes back after 30 s, doubling to an hour, and stops at the job's max_attempts with its code. A lease that ran
 * out, its process gone, is taken again (R16-24's lesson), or failed once its attempts are spent.
 *
 * A payload is ids and counts only, and no line here logs it: a job's lines carry its id, kind, attempt and code.
 */
import { randomUUID } from "node:crypto";
import { sql, type SQL } from "drizzle-orm";
import { db, jobsTable } from "@workspace/db";
import { jobHandlers } from "./jobHandlers.js";
import { logger } from "./logger.js";

export type JobKind = "timeline.reading" | "timeline.ahead" | "timeline.refresh";

export type JobPayload = Record<string, string | number>;

export interface JobContext {
  /** 1 on a job's first run. A wait asked for with retryAt gives its attempt back. */
  attempt: number;
  /** Aborted when the run's time is up or the worker stops first; the job then runs again. */
  signal: AbortSignal;
}

/**
 * Resolves when the job is done, or with `{ retryAt }` to wait until then without spending an attempt: a job the spend
 * breaker pauses waits for nextUtcMidnight() (reading 7). A throw is a failure, its code (the error's `code`, else its
 * class) kept as the job's last_error. A run can be cut short and run again, so a handler is idempotent by its
 * dedupe key.
 */
export type JobHandler = (payload: JobPayload, ctx: JobContext) => Promise<void | { retryAt: Date }>;

const LEASE_S = 5 * 60;
// A run is cut 30 s before its lease ends, so its end is written while the job is still its worker's.
const RUN_MS = (LEASE_S - 30) * 1000;
const FIRST_RETRY_S = 30;
const LAST_RETRY_S = 60 * 60;
const DONE_KEPT_DAYS = 7;
const SWEEP_EVERY_MS = 60 * 60 * 1000;
// A queue that can't be read is read less and less often, up to once a minute, so an outage logs a line a minute.
const UNREAD_WAIT_MAX_MS = 60 * 1000;
// The hand-back's own time after the drain: a database that doesn't answer leaves the job to its lease.
const HAND_BACK_MS = 5 * 1000;
// drainJobs' default stop, so a handler that keeps queueing due jobs cannot hold a test or the walk for good.
const DRAIN_MAX = 1000;
const CODE = /^[\w.:-]{1,64}$/;

interface Taken {
  id: string;
  kind: JobKind;
  payload: JobPayload;
  attempts: number;
  max_attempts: number;
  retaken: boolean;
}

interface Run {
  job: Taken;
  controller: AbortController;
  /** Set by whichever writes the job's end first, the run or a stopping worker; the other then writes nothing. */
  ended: boolean;
  done: Promise<void>;
}

interface Worker {
  concurrency: number;
  pollMs: number;
  running: Map<string, Run>;
  timer: NodeJS.Timeout | undefined;
  polling: Promise<void> | null;
  again: boolean;
  stopping: boolean;
  stopped: Promise<void> | null;
  failures: number;
  sweptAt: number;
}

const handlers = new Map<JobKind, JobHandler>();
let registryRead = false;
let worker: Worker | null = null;

/** Sets a kind's handler, in place of jobHandlers.ts's whenever that is read, so a test or the walk can stand one in. */
export function registerHandler(kind: JobKind, handler: JobHandler): void {
  handlers.set(kind, handler);
}

function readRegistry(): void {
  if (registryRead) return;
  registryRead = true;
  for (const [kind, handler] of Object.entries(jobHandlers()) as Array<[JobKind, JobHandler | undefined]>) {
    if (handler && !handlers.has(kind)) handlers.set(kind, handler);
  }
}

/**
 * Queues a job and answers its id, or null while a job with the same dedupe key is queued or running. A key is one
 * namespace across kinds, so a caller puts the kind in it when two kinds must not block each other.
 */
export async function enqueue(
  kind: JobKind,
  payload: JobPayload,
  opts: { runAt?: Date; dedupeKey?: string } = {},
): Promise<string | null> {
  const result = await db.execute<{ id: string }>(sql`
    INSERT INTO ${jobsTable} (id, kind, payload, dedupe_key, status, run_at)
    VALUES (
      ${randomUUID()}, ${kind}, ${JSON.stringify(payload)}::jsonb, ${opts.dedupeKey ?? null}, 'queued',
      COALESCE(${opts.runAt ?? null}::timestamptz, now())
    )
    ON CONFLICT DO NOTHING
    RETURNING id
  `);
  return result.rows[0]?.id ?? null;
}

/** The next 00:00 UTC, when a day the spend breaker paused is over. */
export function nextUtcMidnight(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}

/** 30 s after a first failure, doubling, never more than an hour. */
function retryDelayS(attempt: number): number {
  return Math.min(FIRST_RETRY_S * 2 ** Math.max(0, attempt - 1), LAST_RETRY_S);
}

/**
 * A failure's code, never its message, which can carry what a row holds: the first `code` down the error's causes (a
 * Postgres SQLSTATE, a provider's or a handler's own), else the error's class, else "error". A number is no code here:
 * an abort's DOMException carries a legacy one (20) that its class names better.
 */
function codeOf(err: unknown): string {
  let at: unknown = err;
  for (let depth = 0; at !== null && typeof at === "object" && depth < 4; depth += 1) {
    const code = (at as { code?: unknown }).code;
    if (typeof code === "string" && CODE.test(code)) return code;
    at = (at as { cause?: unknown }).cause;
  }
  const name = err !== null && typeof err === "object" ? (err as { name?: unknown }).name : undefined;
  return typeof name === "string" && name !== "Error" && CODE.test(name) ? name : "error";
}

function line(job: Taken): { jobId: string; kind: JobKind; attempt: number } {
  return { jobId: job.id, kind: job.kind, attempt: job.attempts };
}

/** Fails, with "lease_lost", every job whose lease ran out on its last attempt, since running it again would pass max_attempts. */
async function failLostLeases(): Promise<void> {
  const result = await db.execute<{ id: string; kind: JobKind; attempts: number }>(sql`
    UPDATE ${jobsTable}
    SET status = 'failed', last_error = 'lease_lost', locked_until = NULL, updated_at = now()
    WHERE status = 'running' AND locked_until < now() AND attempts >= max_attempts
    RETURNING id, kind, attempts
  `);
  for (const row of result.rows) {
    logger.warn({ jobId: row.id, kind: row.kind, attempt: row.attempts, code: "lease_lost" }, "job failed for good");
  }
}

/** Takes up to `limit` due jobs of the kinds with a handler: queued ones whose time has come, then any lease that ran out. */
async function take(limit: number): Promise<Taken[]> {
  const kinds = [...handlers.keys()];
  if (kinds.length === 0 || limit <= 0) return [];
  await failLostLeases();
  const result = await db.execute<Omit<Taken, "kind"> & { kind: string }>(sql`
    WITH due AS MATERIALIZED (
      SELECT id, status
      FROM ${jobsTable}
      WHERE kind IN ${kinds}
        AND attempts < max_attempts
        AND ((status = 'queued' AND run_at <= now()) OR (status = 'running' AND locked_until < now()))
      ORDER BY run_at, created_at, id
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    UPDATE ${jobsTable} AS j
    SET status = 'running', attempts = j.attempts + 1, locked_until = now() + make_interval(secs => ${LEASE_S}),
        updated_at = now()
    FROM due
    WHERE j.id = due.id
    RETURNING j.id, j.kind, j.payload, j.attempts, j.max_attempts, due.status = 'running' AS retaken
  `);
  return result.rows.map((row) => ({ ...row, kind: row.kind as JobKind }));
}

/** Writes a job's end, only while the job is still the run's: running, on the attempt it was taken for. */
async function settle(job: Taken, set: SQL): Promise<boolean> {
  const result = await db.execute(sql`
    UPDATE ${jobsTable}
    SET ${set}, locked_until = NULL, updated_at = now()
    WHERE id = ${job.id} AND status = 'running' AND attempts = ${job.attempts}
  `);
  if ((result.rowCount ?? 0) > 0) return true;
  logger.warn(line(job), "job is no longer this run's; its end is dropped");
  return false;
}

async function fail(job: Taken, code: string): Promise<void> {
  if (job.attempts >= job.max_attempts) {
    if (await settle(job, sql`status = 'failed', last_error = ${code}`)) logger.warn({ ...line(job), code }, "job failed for good");
    return;
  }
  const retryInS = retryDelayS(job.attempts);
  const set = sql`status = 'queued', last_error = ${code}, run_at = now() + make_interval(secs => ${retryInS})`;
  if (await settle(job, set)) logger.warn({ ...line(job), code, retryInS }, "job failed; it runs again later");
}

/** Back in the queue as it was, its attempt given back, for the next worker to take at once. */
function handBack(job: Taken): Promise<boolean> {
  return settle(job, sql`status = 'queued', attempts = attempts - 1`);
}

async function end(job: Taken, outcome: { value: unknown } | { err: unknown }, ms: number): Promise<void> {
  if ("err" in outcome) return fail(job, codeOf(outcome.err));
  const retryAt = (outcome.value as { retryAt?: unknown } | undefined)?.retryAt;
  if (retryAt instanceof Date && !Number.isNaN(retryAt.getTime())) {
    // Never sooner than a failure would come back, so a handler that keeps answering "now" cannot spin.
    const set = sql`status = 'queued', attempts = attempts - 1,
      run_at = GREATEST(${retryAt}::timestamptz, now() + make_interval(secs => ${FIRST_RETRY_S}))`;
    if (await settle(job, set)) logger.info({ ...line(job), retryAt: retryAt.toISOString() }, "job waits");
    return;
  }
  if (await settle(job, sql`status = 'done'`)) logger.info({ ...line(job), ms }, "job done");
}

function newRun(job: Taken): Run {
  return { job, controller: new AbortController(), ended: false, done: Promise.resolve() };
}

/** Runs one taken job to its end. Never rejects: a failure is the job's, and an end that can't be written waits for the lease. */
async function runJob(run: Run): Promise<void> {
  const { job, controller } = run;
  if (job.retaken) logger.warn(line(job), "job's lease ran out; taken again");
  const handler = handlers.get(job.kind);
  if (!handler) {
    run.ended = true;
    await handBack(job).catch(() => undefined);
    return;
  }
  const started = Date.now();
  const timer = setTimeout(() => controller.abort(), RUN_MS);
  const aborted = new Promise<"aborted">((resolve) => {
    controller.signal.addEventListener("abort", () => resolve("aborted"), { once: true });
  });
  const outcome = await Promise.race([
    Promise.resolve()
      .then(() => handler(job.payload, { attempt: job.attempts, signal: controller.signal }))
      .then((value) => ({ value }), (err: unknown) => ({ err })),
    aborted,
  ]);
  clearTimeout(timer);
  if (run.ended) return;
  run.ended = true;
  try {
    if (outcome === "aborted") await fail(job, "timeout");
    else await end(job, outcome, Date.now() - started);
  } catch (err) {
    logger.warn({ ...line(job), code: codeOf(err) }, "job's end could not be written; its lease will run out");
  }
}

/** Waits for `promise`, or until `until` (epoch ms), whichever comes first. */
async function within(promise: Promise<unknown> | null, until: number): Promise<void> {
  if (!promise) return;
  let timer: NodeJS.Timeout | undefined;
  const late = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, Math.max(0, until - Date.now()));
  });
  try {
    await Promise.race([promise.then(() => undefined, () => undefined), late]);
  } finally {
    clearTimeout(timer);
  }
}

async function sweep(w: Worker): Promise<void> {
  if (Date.now() - w.sweptAt < SWEEP_EVERY_MS) return;
  w.sweptAt = Date.now();
  const result = await db.execute(sql`
    DELETE FROM ${jobsTable} WHERE status = 'done' AND updated_at < now() - make_interval(days => ${DONE_KEPT_DAYS})
  `);
  if (result.rowCount) logger.info({ count: result.rowCount }, "done jobs older than 7 days removed");
}

function launch(w: Worker, job: Taken): void {
  const run = newRun(job);
  w.running.set(job.id, run);
  run.done = runJob(run).finally(() => {
    w.running.delete(job.id);
    poll(w);
  });
}

function poll(w: Worker): void {
  if (worker !== w || w.stopping) return;
  if (w.polling) {
    w.again = true;
    return;
  }
  clearTimeout(w.timer);
  w.polling = (async () => {
    let wait = w.pollMs;
    try {
      await sweep(w);
      const taken = await take(w.concurrency - w.running.size);
      w.failures = 0;
      // A stop asked for while the jobs were being taken: none has started, so each goes back as it was.
      if (w.stopping) await Promise.allSettled(taken.map(handBack));
      else for (const job of taken) launch(w, job);
    } catch (err) {
      w.failures += 1;
      wait = Math.min(w.pollMs * 2 ** w.failures, Math.max(w.pollMs, UNREAD_WAIT_MAX_MS));
      logger.warn({ code: codeOf(err), failures: w.failures }, "job worker could not read the queue");
    }
    w.polling = null;
    if (worker !== w || w.stopping) return;
    if (w.again) {
      w.again = false;
      wait = 0;
    }
    w.timer = setTimeout(() => poll(w), wait);
    w.timer.unref();
  })();
}

/**
 * Starts this process's worker: up to `concurrency` jobs at once (4), the queue read every `pollMs` (5 s) and as soon
 * as a job ends. Returns at once and reads nothing first, so the worker never holds the start; a queue it can't read
 * is logged and read again later. jobHandlers.ts is read once. A second call while one runs does nothing.
 */
export function startWorker(opts: { concurrency?: number; pollMs?: number } = {}): void {
  if (worker) return;
  readRegistry();
  const w: Worker = {
    concurrency: Math.max(1, Math.floor(opts.concurrency ?? 4)),
    pollMs: Math.max(1, opts.pollMs ?? 5000),
    running: new Map(),
    timer: undefined,
    polling: null,
    again: false,
    stopping: false,
    stopped: null,
    failures: 0,
    sweptAt: 0,
  };
  worker = w;
  logger.info({ concurrency: w.concurrency, pollMs: w.pollMs, kinds: handlers.size }, "job worker started");
  w.timer = setTimeout(() => poll(w), 0);
  w.timer.unref();
}

/**
 * Stops taking jobs, waits up to `drainMs` for the running ones to end, then hands back what's left: each is aborted
 * and returned to the queue as it was, its attempt given back, for the next process to take at once instead of after
 * its lease. A second call waits for the first.
 */
export function stopWorker(drainMs: number): Promise<void> {
  const w = worker;
  if (!w) return Promise.resolve();
  w.stopped ??= stop(w, drainMs);
  return w.stopped;
}

async function stop(w: Worker, drainMs: number): Promise<void> {
  w.stopping = true;
  clearTimeout(w.timer);
  const until = Date.now() + Math.max(0, drainMs);
  await within(w.polling, until);
  await within(Promise.allSettled([...w.running.values()].map((run) => run.done)), until);
  const left = [...w.running.values()].filter((run) => !run.ended);
  for (const run of left) {
    run.ended = true;
    run.controller.abort();
  }
  const ending = [...w.running.values()].filter((run) => !left.includes(run)).map((run) => run.done);
  await within(Promise.allSettled([...left.map((run) => handBack(run.job)), ...ending]), Date.now() + HAND_BACK_MS);
  if (worker === w) worker = null;
  logger.info({ handedBack: left.length }, "job worker stopped");
}

/**
 * Runs due jobs here, one at a time, until none is due or `max` (1000) have run, and answers how many ran: for tests
 * and the buyer walk, which need a job's end before their next step. A job that fails or waits is no longer due, so
 * this ends.
 */
export async function drainJobs(opts: { max?: number } = {}): Promise<number> {
  readRegistry();
  const max = opts.max ?? DRAIN_MAX;
  let ran = 0;
  while (ran < max) {
    const [job] = await take(1);
    if (!job) break;
    await runJob(newRun(job));
    ran += 1;
  }
  return ran;
}
