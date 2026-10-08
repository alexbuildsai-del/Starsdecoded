/**
 * /qa's own staging account (ADR-387, B-74): the one the hand-played QA session signs in with on the sign-in page, by the
 * email code a `+clerk_test` address takes on Clerk's development instance (Round start 3(c)). Unlike the walk's pair
 * (`qaPair.ts`) it is never banned, so its address is what keeps anyone else out: a random part no one can guess, kept in
 * its testers row alone and shown only to the admin on the staging Sales page, never in a log line, a commit, a report or
 * a test.
 *
 * Staging makes it once, after the listen, however many starts run at once, and tops it up to 3 test credits at each
 * start, never above. It starts at most 6 reports a UTC day, counted on the server; Ask and Timeline keep every account's
 * caps. Both read APP_ENV alone and do nothing off staging, and only the API's own start makes the account, so neither
 * production nor a walk ever does.
 */
import { randomBytes, randomUUID } from "node:crypto";
import type { RequestHandler, Response } from "express";
import { and, count, eq, gte, ne, sql } from "drizzle-orm";
import {
  db, bundlesTable, creditsTable, profilesTable, relationshipsTable, reportsTable, testersTable, usersTable, type QaAccount,
} from "@workspace/db";
import { readAppEnv } from "./appEnv.js";
import { logger } from "./logger.js";

/** Reports the account may start in one UTC day (reading 22). */
export const QA_ACCOUNT_DAILY_REPORTS = 6;
/** What each start tops its test credits up to, never above. */
export const QA_ACCOUNT_CREDITS = 3;

/**
 * Its own line, not one of another limit's (R16-29), in their shape: the form turns "within a day" into the hour the day
 * opens again, from Retry-After.
 */
export const QA_ACCOUNT_LINE =
  `You've started ${QA_ACCOUNT_DAILY_REPORTS} reports today. That's the most the QA account can start in a day. ` +
  "You can start the next one within a day.";

const MARK: QaAccount = "qa-agent";
// Where an admin's Clerk id names who added a tester: code added this one.
const ADDED_BY = "qa-account";
const DAY_MS = 86_400_000;

/** 128 random bits between a fixed prefix and the test suffix, so the address can't be guessed from anything public. */
function newAddress(): string {
  return `qa-agent-${randomBytes(16).toString("hex")}+clerk_test@mystarsdecoded.com`;
}

/** An error's own code, else its class: never its message, which can carry the account's address. */
function codeOf(err: unknown): string {
  const { code, name } = (err ?? {}) as { code?: unknown; name?: unknown };
  if (typeof code === "string" && /^[\w.:-]{1,64}$/.test(code)) return code;
  return typeof name === "string" && /^[\w.:-]{1,64}$/.test(name) ? name : "unknown";
}

/** What the account asks of Clerk, swapped in tests so none reaches it. */
export interface QaAccountClerk {
  /** The Clerk id holding this address, or null when there is none. */
  find(email: string): Promise<string | null>;
  /** Makes the account with no password and no ban, and answers its Clerk id. */
  create(email: string): Promise<string>;
}

const liveClerk: QaAccountClerk = {
  async find(email) {
    const { clerkClient } = await import("@clerk/express");
    const { data } = await clerkClient.users.getUserList({ emailAddress: [email], limit: 1 });
    return data[0]?.id ?? null;
  },
  async create(email) {
    const { clerkClient } = await import("@clerk/express");
    // /qa signs in by the email code and the instance may ask for a password, so none is set; and no ban, unlike the pair.
    const user = await clerkClient.users.createUser({ emailAddress: [email], firstName: "QA", lastName: "Agent", skipPasswordRequirement: true });
    return user.id;
  },
};

let clerk: QaAccountClerk = liveClerk;

/** Tests swap Clerk; returns the restore function. */
export function setQaAccountClerk(next: QaAccountClerk | null): () => void {
  const previous = clerk;
  clerk = next ?? liveClerk;
  return () => {
    clerk = previous;
  };
}

/**
 * Finds or makes the account with its `users` and `testers` rows, then tops it up to 3 test credits, as one step. Starts
 * take turns on one lock, so two at once make one account and one top-up. An address Clerk no longer holds is replaced by
 * a new account at a new address, so deleting the user in Clerk is how the address changes, and the old row goes: one
 * account plays the part. Throws on a Clerk or database failure, leaving what stood.
 */
export async function ensureQaAccount(): Promise<void> {
  if (readAppEnv() !== "staging") return;
  const ready = await db.transaction(async (tx) => {
    // The address is random, so a start that ran beside another could never find the other's: they queue here instead.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended('qa-account', 0))`);
    const [kept] = await tx.select({ email: testersTable.email }).from(testersTable).where(eq(testersTable.qa, MARK)).limit(1);
    const held = kept ? await clerk.find(kept.email) : null;
    const email = kept && held ? kept.email : newAddress();
    const userId = held ?? (await clerk.create(email));
    // Credits hang on the users row, and checkout makes the Stripe customer from its address.
    await tx
      .insert(usersTable)
      .values({ id: userId, email })
      .onConflictDoUpdate({ target: usersTable.id, set: { email, updatedAt: new Date() }, setWhere: sql`${usersTable.email} is distinct from ${email}` });
    await tx.delete(testersTable).where(and(eq(testersTable.qa, MARK), ne(testersTable.userId, userId)));
    await tx
      .insert(testersTable)
      .values({ userId, email, qa: MARK, addedBy: ADDED_BY })
      .onConflictDoUpdate({
        target: testersTable.userId,
        set: { email, qa: MARK },
        setWhere: sql`${testersTable.qa} is distinct from ${MARK} or ${testersTable.email} is distinct from ${email}`,
      });
    const [balance] = await tx
      .select({ available: count() })
      .from(creditsTable)
      .where(and(eq(creditsTable.userId, userId), eq(creditsTable.status, "available")));
    const added = Math.max(0, QA_ACCOUNT_CREDITS - (balance?.available ?? 0));
    if (added > 0) {
      const bundleId = randomUUID();
      // History reads a bundle by its credits, so the top-up is one line of test credits; the column still wants a kind.
      await tx.insert(bundlesTable).values({ id: bundleId, userId, bundleKind: "couple", isTest: true, source: "test" });
      await tx
        .insert(creditsTable)
        .values(Array.from({ length: added }, () => ({ id: randomUUID(), userId, bundleId, status: "available", usedForReportId: null, isTest: true })));
    }
    return { made: !held, credits: added };
  });
  logger.info(ready, "QA account ready");
}

/** What the cap reads of the database, swapped in tests so none is reached. */
export interface QaAccountRows {
  /** Whether this account carries the QA account's mark. */
  isQaAccount(userId: string): Promise<boolean>;
  /** The reports this account has started from `since` on, Personal and pairs alike, as their rows stand. */
  startedSince(userId: string, since: Date): Promise<number>;
}

const liveRows: QaAccountRows = {
  async isQaAccount(userId) {
    const [row] = await db.select({ qa: testersTable.qa }).from(testersTable).where(eq(testersTable.userId, userId)).limit(1);
    return row?.qa === MARK;
  },
  async startedSince(userId, since) {
    // A Personal report is its chart's maker's, a pair its relationship's: each through its own index.
    const [[natal], [pairs]] = await Promise.all([
      db
        .select({ n: count() })
        .from(reportsTable)
        .innerJoin(profilesTable, eq(profilesTable.id, reportsTable.profileId))
        .where(and(eq(profilesTable.userId, userId), eq(reportsTable.type, "natal"), gte(reportsTable.createdAt, since))),
      db
        .select({ n: count() })
        .from(reportsTable)
        .innerJoin(relationshipsTable, eq(relationshipsTable.id, reportsTable.relationshipId))
        .where(and(eq(relationshipsTable.userId, userId), eq(reportsTable.type, "compatibility"), gte(reportsTable.createdAt, since))),
    ]);
    return (natal?.n ?? 0) + (pairs?.n ?? 0);
  },
};

let rows: QaAccountRows = liveRows;

/** Tests swap the database out; returns the restore function. */
export function setQaAccountRows(next: QaAccountRows | null): () => void {
  const previous = rows;
  rows = next ?? liveRows;
  return () => {
    rows = previous;
  };
}

/** What this process knows of the account's starts. */
interface Starts {
  /** Let through, and the route has yet to answer. */
  open: number;
  /** Let through since the process began, so one let through while the rows were read counts, whether they hold it or not. */
  passed: number;
  /** The UTC day the two below count. */
  day: string;
  /**
   * The rows at this process's first read of the day, and the starts let through since that spent: a report deleted
   * after it was counted leaves no row, and these still count it.
   */
  base: number | null;
  spent: number;
}

/** Only the QA account ever gets an entry: the mark is read before one is made. */
const starts = new Map<string, Starts>();

function dayStartOf(at: Date): Date {
  return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
}

/** Calls back with the status the route answers, as it answers, heard or not, as limits.ts's counts do (MB-158). */
function whenAnswered(res: Response, then: (status: number) => void): void {
  const end = res.end;
  res.end = function (this: Response, ...args: unknown[]) {
    res.end = end;
    then(res.statusCode);
    return Reflect.apply(end, this, args);
  } as Response["end"];
}

/** The QA account's stored starts since `since`, with where this process stood as the rows were asked for. */
interface Read {
  mine: Starts;
  stored: number;
  open: number;
  passed: number;
}

/** Null for any other account, which is never given an entry. */
async function readStarts(userId: string, since: Date, day: string): Promise<Read | null> {
  if (!(await rows.isQaAccount(userId))) return null;
  const mine = starts.get(userId) ?? { open: 0, passed: 0, day, base: null, spent: 0 };
  starts.set(userId, mine);
  const { open, passed } = mine;
  return { mine, stored: await rows.startedSince(userId, since), open, passed };
}

/**
 * The QA account's day (reading 22), last in the writing chain: once it has started 6 reports in a UTC day, the next
 * hears its own line until midnight UTC. The rows count what it started, deploys and restarts included, or what this
 * process counted when that is more. On top go the starts that were open as the rows were asked for and those let through
 * since, added where the next is let through, with no wait between, so starts at once never pass the day together. Every
 * other account goes on untouched, and off staging nothing is asked. A count that can't be read lets the write through:
 * the route meets the same database next.
 */
export const qaAccountCap: RequestHandler = async (req, res, next) => {
  const userId = req.userId;
  if (!userId || readAppEnv() !== "staging") return next();
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  let read: Read | null;
  try {
    read = await readStarts(userId, dayStartOf(now), day);
  } catch (err) {
    logger.warn({ code: codeOf(err) }, "the QA account's starts could not be read, so the cap let a write through");
    return next();
  }
  if (!read) return next();
  const { mine, stored, open, passed } = read;
  if (mine.day < day) {
    mine.day = day;
    mine.base = null;
    mine.spent = 0;
  }
  if (mine.day === day && mine.base === null) mine.base = stored;
  const known = mine.day === day ? Math.max(stored, (mine.base ?? stored) + mine.spent) : stored;
  const started = known + open + (mine.passed - passed);
  if (started >= QA_ACCOUNT_DAILY_REPORTS) {
    const seconds = Math.max(1, Math.ceil((dayStartOf(now).getTime() + DAY_MS - now.getTime()) / 1000));
    logger.info({ started, cap: QA_ACCOUNT_DAILY_REPORTS }, "the QA account's day is full");
    res.set("Retry-After", String(seconds));
    res.status(429).json({ error: "rate_limited", message: QA_ACCOUNT_LINE, retryAfterSeconds: seconds });
    return;
  }
  mine.open += 1;
  mine.passed += 1;
  whenAnswered(res, (status) => {
    mine.open -= 1;
    // As the limits read it (reading 6): a write starts its work only on the way to an answer under 400. One let through
    // before midnight UTC and answered after it belongs to the day gone by.
    if (status < 400 && mine.day === day) mine.spent += 1;
  });
  next();
};
