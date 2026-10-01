/**
 * The daily spend breaker (ADR-199, MB-23). Once today's (UTC) writing cost
 * reaches DAILY_SPEND_CAP_USD, every route that writes answers 503 `paused`
 * before a credit moves, and the admin hears once a day. The cost is the one
 * usage.ts stored on each natal and pair report and each horizon pass, so a
 * report still writing counts once it lands; the hourly writing limit bounds
 * that lag. Lab runs, the release lab and the QA agent write to lab_runs
 * under LAB_BUDGET_USD (ADR-77) and never reach the tables summed here.
 */
import type { RequestHandler } from "express";
import { eq, gte, inArray, sql } from "drizzle-orm";
import { db, reportRevisionsTable, reportsTable, usersTable } from "@workspace/db";
import { logger } from "./logger.js";
import { sendSpendPausedEmail, type SendSpendPausedOptions } from "./mailer.js";

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

/** YYYY-MM-DD in UTC: the day the breaker sums, resets on, and names in its email. */
export function utcDay(at: Date = new Date()): string {
  return at.toISOString().slice(0, 10);
}

/** A report as the breaker reads it: the figures its interpretation's meta holds. */
export interface ReportCost {
  id: string;
  createdAt: Date;
  /** meta.generatedAt. Regenerating writes a new one; a horizon pass keeps it. */
  generatedAt: string | null;
  /** meta.horizonPass.at, when the last pass landed. */
  passAt: string | null;
  /** meta.usage.costUsd. A pass adds its calls to the report's usage, so this is the text plus every pass since. */
  costUsd: number | null;
}

/** What a report had cost when a pass began, from the copy report_revisions keeps of the text before it. */
export interface RevisionCost {
  reportId: string;
  createdAt: Date;
  costUsd: number | null;
}

function isoDay(stamp: string | null): string | null {
  return stamp && /^\d{4}-\d{2}-\d{2}T/.test(stamp) ? stamp.slice(0, 10) : null;
}

// A row with no generatedAt began with its row: only a stored row seeded by hand lacks it.
function textDay(r: ReportCost): string {
  return isoDay(r.generatedAt) ?? utcDay(r.createdAt);
}

/** Written before `day`, with a pass that landed on it: only what that day's passes added counts. */
function passedOn(day: string, r: ReportCost): boolean {
  return textDay(r) < day && isoDay(r.passAt) === day;
}

/**
 * The first revision saved that day is the text before that day's first pass.
 * With none, the pass that landed began before midnight, so the last revision
 * is its own. With no revision at all, nothing is subtracted: an unknown
 * baseline counts the whole cost rather than none of it.
 */
function costBefore(day: string, revisions: readonly RevisionCost[]): number {
  const ordered = [...revisions].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const baseline = ordered.find((v) => utcDay(v.createdAt) >= day) ?? ordered.at(-1);
  return baseline?.costUsd ?? 0;
}

/** The day's spend from what is stored: a text begun that day whole, passes on older ones by what they added. */
export function spentOn(day: string, reports: readonly ReportCost[], revisions: readonly RevisionCost[]): number {
  let total = 0;
  for (const r of reports) {
    const cost = r.costUsd ?? 0;
    if (textDay(r) === day) {
      total += cost;
    } else if (passedOn(day, r)) {
      total += Math.max(0, cost - costBefore(day, revisions.filter((v) => v.reportId === r.id)));
    }
  }
  return total;
}

// The figure is read as text and parsed here, so one odd row can never make the whole sum throw.
function usdOf(text: string | null): number | null {
  const n = text === null ? Number.NaN : Number(text);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

async function readSpentUsd(day: string): Promise<number> {
  const start = new Date(`${day}T00:00:00.000Z`);
  // Every landing sets updated_at, so filtering on it leaves the older reports' text unread.
  const rows = await db
    .select({
      id: reportsTable.id,
      createdAt: reportsTable.createdAt,
      generatedAt: sql<string | null>`${reportsTable.interpretation} #>> '{meta,generatedAt}'`,
      passAt: sql<string | null>`${reportsTable.interpretation} #>> '{meta,horizonPass,at}'`,
      costUsd: sql<string | null>`${reportsTable.interpretation} #>> '{meta,usage,costUsd}'`,
    })
    .from(reportsTable)
    .where(gte(reportsTable.updatedAt, start));
  const reports: ReportCost[] = rows.map((r) => ({ ...r, costUsd: usdOf(r.costUsd) }));
  const passed = reports.filter((r) => passedOn(day, r)).map((r) => r.id);
  const revisions: RevisionCost[] = passed.length === 0
    ? []
    : (await db
      .select({
        reportId: reportRevisionsTable.reportId,
        createdAt: reportRevisionsTable.createdAt,
        costUsd: sql<string | null>`${reportRevisionsTable.interpretation} #>> '{meta,usage,costUsd}'`,
      })
      .from(reportRevisionsTable)
      .where(inArray(reportRevisionsTable.reportId, passed)))
      .map((v) => ({ ...v, costUsd: usdOf(v.costUsd) }));
  return spentOn(day, reports, revisions);
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

/** Today's (UTC) writing cost in USD, from the database at most once a minute. */
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
 * A cap of 0 needs no sum and pauses everything.
 */
export function spendGate(deps: GateDeps = LIVE): RequestHandler {
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
    res.status(503).json({ error: "paused", reason: "paused", message: PAUSED_LINE });
  };
}
