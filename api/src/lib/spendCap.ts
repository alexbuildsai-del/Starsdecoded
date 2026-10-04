/**
 * The daily spend breaker (ADR-199, MB-23). Once today's (UTC) writing cost
 * reaches DAILY_SPEND_CAP_USD, every route that writes answers 503 `paused`
 * before a credit moves, and the admin hears once a day. The cost is the spend
 * ledger's: every model call made for a visitor adds to it as its reply
 * returns, so a report still writing counts section by section, and a failed
 * attempt, a regenerate and the legacy pair report count too. Lab runs, the
 * release lab, sessions and the QA agent stay under LAB_BUDGET_USD (ADR-77)
 * and never reach the ledger.
 */
import type { RequestHandler } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { logger } from "./logger.js";
import { sendSpendPausedEmail, type SendSpendPausedOptions } from "./mailer.js";
import { readSpentUsd, utcDay } from "./spendLedger.js";

export { utcDay };

// MB-145 provisional: 20 USD a day until the Owner settles the cap.
const DEFAULT_CAP_USD = 20;
const PLAIN_AMOUNT = /^(?:\d+(?:\.\d*)?|\.\d+)$/;
const SPEND_TTL_MS = 60_000;

/**
 * The reader's line, through /ux-copy. The pause lifts at midnight UTC, or
 * when the Owner moves the cap, or never while the cap is 0, so the line
 * names no hour and no day that would be untrue somewhere.
 */
export const PAUSED_LINE = "New reports are paused for now. Your credit hasn't been used. Please try again later.";

/**
 * Timeline's line for a new reading or an Ask message, through /ux-copy. Timeline spends no credit and a kept reading
 * still opens on a paused day, so it speaks of neither: only that nothing new is written for now. Ask is part of
 * Timeline, so one name covers both.
 */
export const TIMELINE_PAUSED_LINE = "Timeline can't write anything new right now. Try again later.";

/** What a paused request is told, by what it would have written. */
export const PAUSED_LINES = {
  reports: PAUSED_LINE,
  timeline: TIMELINE_PAUSED_LINE,
} as const;

export type PausedFor = keyof typeof PAUSED_LINES;

const warnedCaps = new Set<string>();

/**
 * "$50" or "50 USD" falls back to the default rather than to no cap, and is
 * logged once, so a typo in Railway cannot lift the breaker unnoticed.
 */
export function dailyCapUsd(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.DAILY_SPEND_CAP_USD?.trim();
  if (!raw) return DEFAULT_CAP_USD;
  if (PLAIN_AMOUNT.test(raw)) return Number(raw);
  if (!warnedCaps.has(raw)) {
    warnedCaps.add(raw);
    logger.warn({ value: raw, capUsd: DEFAULT_CAP_USD }, "DAILY_SPEND_CAP_USD is not a plain amount; the breaker uses the default");
  }
  return DEFAULT_CAP_USD;
}

/**
 * Reads at most once a minute, and at once when the UTC day turns. Callers
 * that arrive together share one read. A failed read keeps the day's last
 * figure, since spend only grows within a day; with none it rejects.
 */
export function cachedSpend(read: (day: string) => Promise<number>, now: () => number = Date.now): () => Promise<number> {
  let held: { day: string; at: number; usd: number } | null = null;
  let pending: { day: string; promise: Promise<number> } | null = null;
  return () => {
    const at = now();
    const day = utcDay(new Date(at));
    if (held && held.day === day && at - held.at < SPEND_TTL_MS) return Promise.resolve(held.usd);
    if (pending && pending.day === day) return pending.promise;
    const promise: Promise<number> = read(day)
      .then((usd) => {
        held = { day, at: now(), usd };
        return usd;
      })
      .catch((err: unknown) => {
        const last = held;
        if (!last || last.day !== day) throw err;
        logger.warn({ err }, "today's spend could not be read; the breaker keeps its last figure");
        return last.usd;
      })
      .finally(() => {
        if (pending?.promise === promise) pending = null;
      });
    pending = { day, promise };
    return promise;
  };
}

const liveSpend = cachedSpend(readSpentUsd);

/** Today's (UTC) writing cost in USD, from the spend ledger at most once a minute. */
export function spentTodayUsd(): Promise<number> {
  return liveSpend();
}

export interface PausedNotice {
  day: string;
  spentUsd: number;
  capUsd: number;
}

export interface NoticeDeps {
  adminUserId: () => string | null;
  addressOf: (userId: string) => Promise<string | null>;
  send: (opts: SendSpendPausedOptions) => Promise<boolean>;
  warn: (fields: Record<string, unknown>, message: string) => void;
}

/**
 * The admin hears once per UTC day per process. The day is marked before the
 * first await, so a burst of refusals mails once, and a failed attempt is not
 * retried: a broken sender would otherwise be retried by every refusal. Each
 * day's notice is one log line, with its outcome, whatever happens.
 */
export function pausedNotifier(deps: NoticeDeps): (notice: PausedNotice) => Promise<void> {
  let noticed: string | null = null;
  return async (notice) => {
    if (noticed === notice.day) return;
    noticed = notice.day;
    const figures = { day: notice.day, spentUsd: notice.spentUsd, capUsd: notice.capUsd };
    const admin = deps.adminUserId();
    if (!admin) {
      deps.warn(figures, "new reports are paused at the daily spend cap; ADMIN_USER_ID is not set, so nobody is emailed");
      return;
    }
    let to: string | null = null;
    try {
      to = await deps.addressOf(admin);
    } catch (err) {
      deps.warn({ ...figures, err }, "new reports are paused at the daily spend cap; the admin's address could not be read");
      return;
    }
    if (!to) {
      deps.warn(figures, "new reports are paused at the daily spend cap; the admin has no email address on record");
      return;
    }
    const sent = await deps.send({ to, ...figures });
    deps.warn(figures, sent
      ? "new reports are paused at the daily spend cap; the admin was emailed"
      : "new reports are paused at the daily spend cap; the email to the admin did not go out");
  };
}

/** Clerk's address first, since it is the current one; the users table keeps the copy taken at first sign-in. */
async function adminAddress(userId: string): Promise<string | null> {
  try {
    const { clerkClient } = await import("@clerk/express");
    const user = await clerkClient.users.getUser(userId);
    const email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress;
    if (email) return email;
  } catch {
    // Clerk unset or unreachable: the local copy below is the fallback, and the notice line reports the outcome.
  }
  const [row] = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  return row?.email ?? null;
}

const notifyPaused = pausedNotifier({
  adminUserId: () => process.env.ADMIN_USER_ID?.trim() || null,
  addressOf: adminAddress,
  send: sendSpendPausedEmail,
  warn: (fields, message) => logger.warn(fields, message),
});

export interface GateDeps {
  capUsd: () => number;
  spentUsd: () => Promise<number>;
  notify: (notice: PausedNotice) => Promise<void>;
  now: () => Date;
}

const LIVE: GateDeps = {
  capUsd: () => dailyCapUsd(),
  spentUsd: spentTodayUsd,
  notify: notifyPaused,
  now: () => new Date(),
};

/**
 * Mounted ahead of each writing route's handler, so a paused request never
 * reaches the credit. A sum that cannot be read lets the request through:
 * the route meets the same database next, and "paused" would not be true.
 * A cap of 0 needs no sum and pauses everything. A report's refusal speaks of
 * its credit; Timeline's, which spends none, has its own line.
 */
export function spendGate(pausedFor: PausedFor = "reports", deps: GateDeps = LIVE): RequestHandler {
  const message = PAUSED_LINES[pausedFor];
  return async (_req, res, next) => {
    const capUsd = deps.capUsd();
    let spentUsd: number | null = null;
    try {
      spentUsd = await deps.spentUsd();
    } catch (err) {
      logger.error({ err }, "today's spend could not be read; the breaker lets this request through");
    }
    if (capUsd > 0 && (spentUsd === null || spentUsd < capUsd)) return next();
    deps.notify({ day: utcDay(deps.now()), spentUsd: spentUsd ?? 0, capUsd })
      .catch((err: unknown) => logger.error({ err }, "the spend pause notice failed"));
    res.status(503).json({ error: "paused", reason: "paused", message });
  };
}
