import type { JobHandler, JobKind } from "./jobs.js";

/**
 * Each job kind's handler (ADR-357), read once by startWorker and drainJobs. A kind left out is never taken, so a job
 * a newer deploy queued waits for a process that knows its kind instead of failing in an older one.
 *
 * A function, not a map built at import: a handler's module imports enqueue from jobs.ts, which imports this file, so
 * a map read at import could meet a handler not yet defined.
 */
export function jobHandlers(): Partial<Record<JobKind, JobHandler>> {
  return {};
}
