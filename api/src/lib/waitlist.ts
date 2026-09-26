import type { IncomingHttpHeaders } from "node:http";

/** One row per address: the unique index sees every spelling of it as the same. */
export function normaliseEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Campaign tags are labels, not free text: letters, digits and a few joiners, or nothing. */
export function tag(raw: string | undefined, max = 100): string | null {
  const clean = (raw ?? "").replace(/[^\w.+~ -]/g, "").trim().slice(0, max);
  return clean || null;
}

/**
 * Who is sending, for throttling only; never stored. Through Vercel's rewrite
 * every request reaches Railway from Vercel's own addresses, so the client is
 * the address Vercel forwards. A direct call to Railway can set that header
 * itself and so dodge the limit, which costs no more than rows to delete.
 */
export function clientKey(headers: IncomingHttpHeaders, ip: string | undefined): string {
  const forwarded = headers["x-vercel-forwarded-for"];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim();
  return first || ip || "unknown";
}

/** A sliding window per key, in memory: the API runs as one process. */
export class RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly limit: number, private readonly windowMs: number) {}

  /** Records a hit and says whether it may go ahead. */
  take(key: string, now: number = Date.now()): boolean {
    const since = now - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((t) => t > since);
    const allowed = recent.length < this.limit;
    if (allowed) recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 10_000) this.prune(since);
    return allowed;
  }

  private prune(since: number) {
    for (const [key, times] of this.hits) {
      if (times.every((t) => t <= since)) this.hits.delete(key);
    }
  }
}
