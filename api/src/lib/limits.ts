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
  // The preview calls no model, so it is held to the geocoder's pace rather than to writing's (ADR-231, MB-146).
  preview: { limit: 60, windowMs: MINUTE_MS, by: "address", counts: "work" },
  send: { limit: 10, windowMs: HOUR_MS, by: "account", counts: "success" },
  // Buying needs an account on every host (reading 1), so checkout counts the account in every browser it uses: a
  // fresh session or a dropped cookie never starts its count again (R13-08).
  checkout: { limit: 10, windowMs: HOUR_MS, by: "account", counts: "success" },
  // Stripe's billing page for a subscriber, counted apart so a reader past checkout's limit can still stop Timeline.
  portal: { limit: 10, windowMs: HOUR_MS, by: "account", counts: "success" },
  // Only an account has Timeline (ADR-262), so these count by account. A minute stops a burst from spending the day's cap;
  // Ask's month has its own cap besides (reading 13), and a reading counts only when its open starts a write.
  ask: { limit: 6, windowMs: MINUTE_MS, by: "account", counts: "success" },
  timelineReading: { limit: 20, windowMs: MINUTE_MS, by: "account", counts: "success" },
  // Every read of Now and ahead's six months counts, whatever its range: a page switching ranges reads a few a minute,
  // and each read works the sky out again, so a loop still needs something to slow it (R-7.5).
  timelineNow: { limit: 30, windowMs: MINUTE_MS, by: "account", counts: "success" },
  // Each read of setup works the six months' sky out again, so a loop needs slowing too (R-7.5). Its screen reads it every
  // 3 seconds while the readings are written (SETUP_POLL_MS in the web), 20 a minute, and starts it and marks it seen once
  // each, so 30 leaves the screen room.
  timelineSetup: { limit: 30, windowMs: MINUTE_MS, by: "account", counts: "success" },
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
  portal: `You've opened your billing page ${LIMITS.portal.limit} times in the last hour. You can open it again within the hour.`,
  ask: `You've sent Ask ${LIMITS.ask.limit} messages in the last minute. Try again in a minute.`,
  timelineReading: `You've opened ${LIMITS.timelineReading.limit} new readings in the last minute. Try again in a minute.`,
  timelineNow: `You've loaded your Timeline ${LIMITS.timelineNow.limit} times in the last minute. Try again in a minute.`,
  timelineSetup: `You've loaded your Timeline setup ${LIMITS.timelineSetup.limit} times in the last minute. Try again in a minute.`,
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

/**
 * The writes one request holds on one count. A limit takes one as the request passes it; a route whose work runs more than
 * once raises that to one per run before any starts, and a give-back returns all of them.
 */
interface Held {
  readonly kind: LimitKind;
  readonly writes: number;
  /** Holds `writes` in all. A rise past the limit takes nothing and answers the seconds until it would fit. */
  hold(writes: number): Promise<number | null>;
}

/** Each count a request took on its way to its route, in the order it took them. */
const heldBy = new WeakMap<Request, Held[]>();

function register(req: Request, held: Held): void {
  heldBy.set(req, [...(heldBy.get(req) ?? []), held]);
}

/** `all` less one occurrence of each of `some`. */
function less(all: number[], some: number[]): number[] {
  const rest = [...all];
  for (const value of some) {
    const at = rest.indexOf(value);
    if (at >= 0) rest.splice(at, 1);
  }
  return rest;
}

/**
 * Calls back with the status the route answers, at the moment it answers. A reader who hangs up never receives the answer,
 * so the response never finishes, but the route has still said whether it spent (MB-158).
 */
function whenAnswered(res: Response, then: (status: number) => void): void {
  const end = res.end;
  res.end = function (this: Response, ...args: unknown[]) {
    res.end = end;
    then(res.statusCode);
    return Reflect.apply(end, this, args);
  } as Response["end"];
}

/** A count in the library's store, whose window is fixed from its first write, so every write held leaves at its end. */
function heldInStore(kind: CallerKind, store: MemoryStore, first: RateLimitInfo): Held {
  const { limit, windowMs } = LIMITS[kind];
  // Each write remembers its window's end: given back after it, it would come off a later window's count.
  const ends = [first.resetTime?.getTime() ?? Date.now() + windowMs];
  const giveBack = (writes: number[]) => {
    for (const end of writes) if (Date.now() < end) void store.decrement(first.key);
  };
  return {
    kind,
    get writes() {
      return ends.length;
    },
    async hold(writes) {
      if (writes <= ends.length) {
        giveBack(ends.splice(writes));
        return null;
      }
      const taken: number[] = [];
      while (ends.length + taken.length < writes) {
        const { totalHits, resetTime } = await store.increment(first.key);
        taken.push(resetTime?.getTime() ?? Date.now() + windowMs);
        if (totalHits > limit) {
          giveBack(taken);
          return secondsUntil(resetTime, windowMs);
        }
      }
      ends.push(...taken);
      return null;
    },
  };
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
  // An answer that cost nothing, a refusal further on included, gives back every write the request holds. A request whose
  // reader hangs up keeps them: the route may already be writing, and giving them back would let a script that never waits
  // for an answer write without limit, which the library's own skipFailedRequests allows.
  const giveBackUnspent: RequestHandler = (req, res, next) => {
    const first = countOf(req, property);
    if (first) {
      const held = heldInStore(kind, store, first);
      register(req, held);
      res.once("finish", () => {
        if (!SPENT[counts](res.statusCode)) void held.hold(0);
      });
    }
    next();
  };
  return [counted, giveBackUnspent];
}

/**
 * The one count every signed-out write shares (S1). It rests on nothing a request carries, and an account never touches it.
 * Its hour rolls: a write counts for exactly an hour after it lands, so no burst fits on both sides of a window's edge. A
 * refused write is never kept, or a flood of refusals could hold writing shut for everyone signed out. Whether a write is
 * kept is the route's own answer, heard or not (MB-158): a request dropped before it spent gives its writes back, or a
 * script that hangs up at once could hold writing shut the same way, and one whose route went on to spend keeps them.
 */
function signedOutLimit(kind: "anonWrites"): RequestHandler[] {
  const { limit, windowMs, counts } = LIMITS[kind];
  let landed: number[] = [];
  const recent = (now: number) => (landed = landed.filter((at) => at > now - windowMs));
  // `writes` more fit once enough of the earliest in `others` have left the hour; more than the limit never fit.
  const wait = (others: number[], writes: number) => {
    const leaving = [...others].sort((a, b) => a - b);
    const last = leaving[Math.min(leaving.length, leaving.length + writes - limit) - 1];
    return secondsUntil(last === undefined ? undefined : new Date(last + windowMs), windowMs);
  };
  const counted: RequestHandler = (req, res, next) => {
    if (req.userId) return next();
    const now = Date.now();
    if (recent(now).length >= limit) return refuse(res, kind, wait(landed, 1));
    const mine = [now];
    landed.push(now);
    const giveBack = (keep: number) => {
      landed = less(landed, mine.splice(keep));
    };
    register(req, {
      kind,
      get writes() {
        return mine.length;
      },
      async hold(writes) {
        if (writes <= mine.length) {
          giveBack(writes);
          return null;
        }
        const others = less(recent(Date.now()), mine);
        if (others.length + writes > limit) return wait(others, writes);
        const at = Date.now();
        while (mine.length < writes) {
          mine.push(at);
          landed.push(at);
        }
        return null;
      },
    });
    whenAnswered(res, (status) => {
      if (!SPENT[counts](status)) giveBack(0);
    });
    next();
  };
  return [counted];
}

/**
 * MB-159 provisional: a birth-time change passes each report it updates, and every pass calls the model, so before any pass
 * starts the route makes the request hold one write per pass on each count it took one from on its way in, and none when it
 * passes nothing. When they do not all fit, it holds only what it came with and hears the usual 429 from the first count that
 * is full, in the order the chain took them. True when the route may go on.
 */
export async function holdWrites(req: Request, res: Response, writes: number): Promise<boolean> {
  const held = heldBy.get(req) ?? [];
  const before = held.map((count) => count.writes);
  for (let i = 0; i < held.length; i++) {
    const wait = await held[i].hold(writes);
    if (wait === null) continue;
    for (let j = 0; j < i; j++) await held[j].hold(before[j]);
    refuse(res, held[i].kind, wait);
    return false;
  }
  return true;
}

export interface Limits {
  anonWriteLimit: RequestHandler[];
  generationLimits: RequestHandler[];
  geocodeLimit: RequestHandler[];
  previewLimit: RequestHandler[];
  sendLimit: RequestHandler[];
  checkoutLimit: RequestHandler[];
  portalLimit: RequestHandler[];
  askLimit: RequestHandler[];
  timelineReadingLimit: RequestHandler[];
  timelineNowLimit: RequestHandler[];
  timelineSetupLimit: RequestHandler[];
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
    portalLimit: limitFor("portal"),
    askLimit: limitFor("ask"),
    timelineReadingLimit: limitFor("timelineReading"),
    timelineNowLimit: limitFor("timelineNow"),
    timelineSetupLimit: limitFor("timelineSetup"),
  };
}

export const {
  anonWriteLimit, generationLimits, geocodeLimit, previewLimit, sendLimit, checkoutLimit, portalLimit, askLimit,
  timelineReadingLimit, timelineNowLimit, timelineSetupLimit,
} = buildLimits();
