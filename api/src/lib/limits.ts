import type { Request, RequestHandler, Response } from "express";
import { MemoryStore, ipKeyGenerator, rateLimit, type RateLimitInfo } from "express-rate-limit";
import { logger } from "./logger.js";
import { clientKey } from "./waitlist.js";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

type CountedBy = "account" | "session" | "address" | "signedOut";
type Counts = "success" | "work";

/**
 * ADR-199's table. Staging and production each run one process, so every count lives in that process's memory and starts
 * again at a deploy.
 */
export const LIMITS = {
  write: { limit: 6, windowMs: HOUR_MS, by: "account", counts: "success" },
  writeDaily: { limit: 20, windowMs: DAY_MS, by: "address", counts: "success" },
  // S1: where a signed-out write is taken (staging, a laptop), a script that forges its address and drops its cookie meets
  // no count of its own, and the breaker hears of a call only once its reply returns. So every signed-out write also takes
  // one from a single count they all share, sized to the lab's natal and pair campaigns (R13-20).
  anonWrites: { limit: 24, windowMs: HOUR_MS, by: "signedOut", counts: "success" },
  geocode: { limit: 60, windowMs: MINUTE_MS, by: "address", counts: "work" },
  // MB-146 provisional: the preview calls no model, so it is held to the geocoder's pace rather than to writing's.
  preview: { limit: 60, windowMs: MINUTE_MS, by: "address", counts: "work" },
  send: { limit: 10, windowMs: HOUR_MS, by: "account", counts: "success" },
  checkout: { limit: 10, windowMs: HOUR_MS, by: "session", counts: "success" },
} as const satisfies Record<string, { limit: number; windowMs: number; by: CountedBy; counts: Counts }>;

/** Whether an answer with this status cost anything, so whether its request keeps its count (reading 6). */
const SPENT: Record<Counts, (status: number) => boolean> = {
  // Writing, sending and checkout start their work only on the way to a 2xx: a refusal or a failure spent nothing.
  success: (status) => status < 400,
  // The geocoder asks Nominatim, and the preview works out a horizon, for every well-formed request, so "no such place" and
  // a failure cost the work too; only a malformed request is turned away before it.
  work: (status) => status !== 400,
};

export type LimitKind = keyof typeof LIMITS;

/**
 * What a refused reader is told, where the form shows its errors (reading 18). The API cannot know the reader's clock, so a
 * line names its window and never the time left (ADR-127); the page can turn Retry-After into the hour it opens again.
 */
export const LIMIT_LINES: Record<LimitKind, string> = {
  write: `You've started ${LIMITS.write.limit} reports in the last hour. You can start the next one within the hour.`,
  writeDaily: `We've had ${LIMITS.writeDaily.limit} reports from your internet connection in the last day. You can start the next one within a day.`,
  anonWrites: `Signed-out visitors have started ${LIMITS.anonWrites.limit} reports in the last hour. Sign in to start yours.`,
  geocode: `We've had ${LIMITS.geocode.limit} place searches from your internet connection in the last minute. Try again in a minute.`,
  preview: `We've had ${LIMITS.preview.limit} rising sign checks from your internet connection in the last minute. Try again in a minute.`,
  send: `You've sent ${LIMITS.send.limit} reports and gifts in the last hour. You can send the next one within the hour.`,
  checkout: `You've started checkout ${LIMITS.checkout.limit} times in the last hour. You can start it again within the hour.`,
};

type CallerKind = Exclude<LimitKind, "anonWrites">;

const KEYS: Record<Exclude<CountedBy, "signedOut">, (req: Request) => string> = {
  // Writing and sending need an account (ADR-140, reading 5), so a signed-in reader is one count in every browser they use.
  account: (req) => (req.userId ? `account:${req.userId}` : `session:${req.sessionId}`),
  session: (req) => `session:${req.sessionId}`,
  // One IPv6 reader holds a whole block of addresses; counted one by one, they could walk through it.
  address: (req) => ipKeyGenerator(clientKey(req.headers, req.ip)),
};

function countOf(req: Request, property: string): RateLimitInfo | undefined {
  return (req as unknown as Record<string, RateLimitInfo | undefined>)[property];
}

function secondsUntil(resetTime: Date | undefined, windowMs: number): number {
  if (!resetTime) return Math.ceil(windowMs / 1000);
  return Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000));
}

function refuse(res: Response, kind: LimitKind, retryAfterSeconds: number): void {
  res.set("Retry-After", String(retryAfterSeconds));
  res.status(429).json({ error: "rate_limited", message: LIMIT_LINES[kind], retryAfterSeconds });
}

function limitFor(kind: CallerKind): RequestHandler[] {
  const { limit, windowMs, by, counts } = LIMITS[kind];
  const store = new MemoryStore();
  // Two limits can stand on one route, so each keeps its count under its own name.
  const property = `limit_${kind}`;
  const counted = rateLimit({
    windowMs,
    limit,
    store,
    keyGenerator: KEYS[by],
    requestPropertyName: property,
    standardHeaders: false,
    legacyHeaders: false,
    logger,
    handler: (req, res) => refuse(res, kind, secondsUntil(countOf(req, property)?.resetTime, windowMs)),
  });
  // An answer that cost nothing, a refusal further on included, gives its count back. A request whose reader hangs up keeps
  // it: the route may already be writing, and giving it back would let a script that never waits for an answer write without
  // limit, which the library's own skipFailedRequests allows.
  const giveBackUnspent: RequestHandler = (req, res, next) => {
    const count = countOf(req, property);
    if (count) {
      const windowEnds = count.resetTime?.getTime() ?? Date.now() + windowMs;
      res.once("finish", () => {
        if (!SPENT[counts](res.statusCode) && Date.now() < windowEnds) void store.decrement(count.key);
      });
    }
    next();
  };
  return [counted, giveBackUnspent];
}

/**
 * The one count every signed-out write shares (S1). It rests on nothing a request carries, and an account never touches it.
 * Its hour rolls: a write counts for exactly an hour after it lands, so no burst fits on both sides of a window's edge. A
 * refused write is never kept, or a flood of refusals could hold writing shut for everyone signed out; an answer that cost
 * nothing gives back its own count, and a reader who hangs up keeps it, as with the other limits.
 */
function signedOutLimit(kind: "anonWrites"): RequestHandler[] {
  const { limit, windowMs, counts } = LIMITS[kind];
  let landed: number[] = [];
  const counted: RequestHandler = (req, res, next) => {
    if (req.userId) return next();
    const now = Date.now();
    landed = landed.filter((at) => at > now - windowMs);
    if (landed.length >= limit) return refuse(res, kind, secondsUntil(new Date(Math.min(...landed) + windowMs), windowMs));
    landed.push(now);
    res.once("finish", () => {
      if (SPENT[counts](res.statusCode)) return;
      const own = landed.indexOf(now);
      if (own >= 0) landed.splice(own, 1);
    });
    next();
  };
  return [counted];
}

export interface Limits {
  anonWriteLimit: RequestHandler[];
  generationLimits: RequestHandler[];
  geocodeLimit: RequestHandler[];
  previewLimit: RequestHandler[];
  sendLimit: RequestHandler[];
  checkoutLimit: RequestHandler[];
}

/** Fresh counts on every call: the server keeps the one set below, and a test builds its own. */
export function buildLimits(): Limits {
  return {
    anonWriteLimit: signedOutLimit("anonWrites"),
    // The address's day first, so a reader past both limits hears the longer wait, not an hour that opens onto a refusal.
    generationLimits: [...limitFor("writeDaily"), ...limitFor("write")],
    geocodeLimit: limitFor("geocode"),
    previewLimit: limitFor("preview"),
    sendLimit: limitFor("send"),
    checkoutLimit: limitFor("checkout"),
  };
}

export const { anonWriteLimit, generationLimits, geocodeLimit, previewLimit, sendLimit, checkoutLimit } = buildLimits();
