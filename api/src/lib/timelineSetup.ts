/**
 * Timeline written at setup (ADR-302, 362; readings 8 to 11). Setup starts the moment a subscriber's payment clears,
 * or when their own Personal report finishes if it comes later, and never for the staging walk's QA pair, since a
 * deploy spends nothing (ADR-315). It queues one job per reading the engine lists for the reader's chart: from the
 * Monday of their week to the last day a card can open, six months on from today, this week's first, then the month's,
 * then the rest, then every life cycle from birth to 90. One more job, a week before those end, writes the next six
 * months while the reader still has Timeline. The reader's own open of the setup queues one refresh per kept reading
 * gone stale (reading 10); a start or a deploy queues none. Every key comes from the engine's list, never from a
 * browser (R13-10), and a paused day's writes wait for the next (ADR-199).
 *
 * A job's payload holds ids only, and no line here carries a payload or a Clerk id.
 */
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import type { z } from "zod";
import {
  db, profilesTable, reportsTable, testersTable, timelineSetupsTable, usersTable, type TimelineSetupRow,
} from "@workspace/db";
import type { GetTimelineSetupResponse } from "@workspace/api-zod";
import { enqueue, nextUtcMidnight, type JobHandler } from "./jobs.js";
import { logger } from "./logger.js";
import { QA_PAIR } from "./qaPair.js";
import { activeSubscription } from "./subscriptions.js";
import {
  RANGE_DAYS, dayIn, dayStart, lifeView, nowView, readerChart, validZone,
  type ReaderChart, type ReadingState, type ReadingStatuses, type TimelineRange,
} from "./timeline.js";
import { timelineAccess } from "./timelineAccess.js";
import {
  codeOf, readingJobKey, readingStatuses, readingsQueued, refreshJobKey, refreshReading, staleReadings, writeQueuedReading,
} from "./timelineReadings.js";

export type TimelineSetup = z.infer<typeof GetTimelineSetupResponse>;
type SetupStep = TimelineSetup["steps"][number];
type StepId = SetupStep["id"];
type ReadingStep = Exclude<StepId, "chart" | "planets">;

export const SETUP_STEPS: readonly StepId[] = ["chart", "planets", "week", "month", "months", "cycles"];

/** The next six months are written this many days before the last ones end (reading 9). */
export const AHEAD_DAYS = 7;

const SIX_MONTHS = RANGE_DAYS["six-months"];

const NO_READINGS: ReadingStatuses = new Map();
const QA_EMAILS: ReadonlySet<string> = new Set(Object.values(QA_PAIR).map((member) => member.email.toLowerCase()));

/** What a setup writes for a reader, in the reader's days: each step's keys, soonest first. */
export interface SetupPlan {
  from: string;
  to: string;
  week: string[];
  month: string[];
  months: string[];
  cycles: string[];
}

function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** The Monday on or before a day: the reader's week runs Monday to Sunday (Review 05/10 §3). */
export function mondayOf(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return addDays(day, -((new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7));
}

/** A key's day is its last eight digits, so the soonest sorts first whatever its kind. */
function byDay(a: string, b: string): number {
  return a.slice(-8).localeCompare(b.slice(-8)) || a.localeCompare(b);
}

/**
 * The keys of the readings a Now and ahead view lists from the day `from`, over the view's own days in the zone, never
 * a range rebuilt from instants (R16-01's lesson). An event that gets no reading shows none whatever its key is told
 * (reading 7), so the view drawn again with every key told writing names exactly the events that read.
 */
function readable(reader: ReaderChart, range: TimelineRange, zone: string, from: string): string[] {
  const at = dayStart(from, zone);
  const listed = nowView(reader, range, zone, NO_READINGS, at);
  const told: ReadingStatuses = new Map(listed.events.map((event): [string, ReadingState] => [event.key, "writing"]));
  const keys = nowView(reader, range, zone, told, at).events.filter((event) => event.reading === "writing").map((event) => event.key);
  return keys.sort(byDay);
}

/**
 * The keys of the readings from `from` to `to`, six months to a year apart: the six-month view's from `from` and the
 * one that ends on `to`, which meet, so each day's events are a view's own.
 */
function readableOver(reader: ReaderChart, zone: string, from: string, to: string): string[] {
  const keys = new Set(readable(reader, "six-months", zone, from));
  const last = addDays(to, 1 - SIX_MONTHS);
  if (last > from) for (const key of readable(reader, "six-months", zone, last)) keys.add(key);
  return [...keys].sort(byDay);
}

/**
 * Where readings written on `today` from `from` stop: six months on from `from`, or the last day a card can open, six
 * months on from today (`eventByKey`), if that is later. So the six-month view, which runs from today, lists no reading
 * a setup has not written.
 */
export function stretchEnd(from: string, today: string): string {
  const sixMonths = addDays(from, SIX_MONTHS - 1);
  const opens = addDays(today, SIX_MONTHS);
  return opens > sixMonths ? opens : sixMonths;
}

/**
 * A setup's readings from the Monday `from` to `to` (reading 8): this week, Monday to Sunday; the month, Now and ahead's
 * 30 days from that Monday; the six months, every day to `to`, by default the six-month view's own last day from that
 * Monday; and every life cycle from birth to 90, as Life lists them.
 */
export function planOf(reader: ReaderChart, zone: string, from: string, to: string = addDays(from, SIX_MONTHS - 1)): SetupPlan {
  return {
    from,
    to,
    week: readable(reader, "week", zone, from),
    month: readable(reader, "month", zone, from),
    months: readableOver(reader, zone, from, to),
    cycles: lifeView(reader, zone, NO_READINGS).cycles.map((cycle) => cycle.key),
  };
}

/** This week's first, then the month's, then the rest of the six months, then the life cycles (reading 8). */
export function writeOrder(plan: SetupPlan): string[] {
  return [...new Set([...plan.week, ...plan.month, ...plan.months, ...plan.cycles])];
}

/** A reading has landed once it is written or has failed: a failed one keeps the engine's line and is written when opened. */
function landedIn(state: ReadingState | undefined): boolean {
  const status = typeof state === "string" ? state : state?.status;
  return status === "ready" || status === "failed";
}

/**
 * One job per reading, in the order given, each a millisecond behind the last so the queue takes them in that order.
 * A key whose job is queued or running already is skipped by its dedupe key. Answers how many were queued.
 */
async function queueWrites(profileId: string, keys: readonly string[]): Promise<number> {
  const first = Date.now();
  let queued = 0;
  for (const [i, key] of keys.entries()) {
    const id = await enqueue("timeline.reading", { profileId, key }, { runAt: new Date(first + i), dedupeKey: readingJobKey(profileId, key) });
    if (id) queued += 1;
  }
  return queued;
}

/**
 * The reader's open (reading 10): one refresh for each of the setup's kept readings gone stale, this week's first, so
 * each is written again in the background while its kept text answers. Never for the QA pair, whose walk runs at every
 * deploy and a deploy spends nothing (ADR-315). A key a refresh already holds is skipped by its dedupe key. Never
 * rejects, so the setup still answers.
 */
async function queueRefreshes(reader: ReaderChart, keys: readonly string[]): Promise<void> {
  try {
    const stale = await staleReadings(reader, keys);
    if (stale.length === 0 || (await isQaAccount(reader.userId))) return;
    const first = Date.now();
    for (const [i, key] of stale.entries()) {
      await enqueue("timeline.refresh", { profileId: reader.profileId, key }, { runAt: new Date(first + i), dedupeKey: refreshJobKey(reader.profileId, key) });
    }
  } catch (err) {
    logger.warn({ code: codeOf(err) }, "Timeline's stale readings were not queued at an open");
  }
}

/** The account's one next-six-months job, due a week before `to` ends in the birth place's days, as the job reads them. */
function armAhead(userId: string, to: string, zone: string): Promise<string | null> {
  return enqueue("timeline.ahead", { userId }, { runAt: dayStart(addDays(to, -AHEAD_DAYS), zone), dedupeKey: `timeline.ahead:${userId}` });
}

/** The staging walk's two accounts, by their mark or by their address, as the Sales page tells them. */
async function isQaAccount(userId: string): Promise<boolean> {
  const [tester] = await db
    .select({ qa: testersTable.qa, email: testersTable.email })
    .from(testersTable)
    .where(eq(testersTable.userId, userId))
    .limit(1);
  if (tester && (tester.qa !== null || QA_EMAILS.has(tester.email.toLowerCase()))) return true;
  const [user] = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  return !!user?.email && QA_EMAILS.has(user.email.toLowerCase());
}

/** The account's setup, with the chart it was made for: the profile of the report it read, null once that report is gone. */
type SetupRow = TimelineSetupRow & { profileId: string | null };

async function setupRow(userId: string): Promise<SetupRow | null> {
  const [found] = await db
    .select({ setup: timelineSetupsTable, profileId: reportsTable.profileId })
    .from(timelineSetupsTable)
    .leftJoin(reportsTable, eq(reportsTable.id, timelineSetupsTable.reportId))
    .where(eq(timelineSetupsTable.userId, userId))
    .limit(1);
  return found ? { ...found.setup, profileId: found.profileId } : null;
}

/**
 * Whether a setup still stands for the reader: made for the chart they read now, its six months not over. One made
 * for a chart since replaced has its jobs on that chart, so none of the reader's readings would ever come of it.
 */
function stands(row: SetupRow, reader: ReaderChart, today: string): boolean {
  return row.profileId === reader.profileId && row.toDay >= today;
}

function notStarted(): TimelineSetup {
  return { state: "none", from: null, to: null, steps: SETUP_STEPS.map((id) => ({ id, done: false, count: null })), replay: null };
}

/**
 * The setup as GET /timeline/setup answers it, in the zone sent, else the birth place's: the reader's open, so the
 * setup's kept readings gone stale are queued to be written again (reading 10). While it writes, a step is done once
 * each of its readings has landed or no job is left to land it, so a step never waits on a key no job holds, whatever
 * zone it is read in; a setup whose readings have all landed is ready for good, and keeps its next six months' job
 * queued. One that no longer stands, its six months over or its chart replaced, reads as none, and the catch-up starts
 * it afresh. `replay` shows from the first day of the next six months until it is marked seen.
 */
export function setupState(reader: ReaderChart, zone?: string | null): Promise<TimelineSetup> {
  return stateOf(reader, zone, true);
}

async function stateOf(reader: ReaderChart, zone: string | null | undefined, opened: boolean): Promise<TimelineSetup> {
  const tz = validZone(zone) ?? reader.zone;
  const row = await setupRow(reader.userId);
  const today = dayIn(new Date(), tz);
  if (!row || !stands(row, reader, today)) return notStarted();
  const plan = planOf(reader, tz, row.fromDay, row.toDay);
  let state: TimelineSetup["state"] = row.state;
  let landed = (_key: string): boolean => true;
  if (row.state === "ready") {
    await armAhead(reader.userId, row.toDay, reader.zone);
  } else {
    const keys = writeOrder(plan);
    const [statuses, queued] = await Promise.all([
      readingStatuses(reader.profileId, keys, reader.basis),
      readingsQueued(reader.profileId, keys),
    ]);
    landed = (key) => !queued.has(key) || landedIn(statuses.get(key));
    if (keys.every(landed)) {
      state = "ready";
      const now = new Date();
      await db
        .update(timelineSetupsTable)
        .set({ state: "ready", readyAt: now, updatedAt: now })
        .where(and(eq(timelineSetupsTable.userId, reader.userId), eq(timelineSetupsTable.state, "writing")));
    }
  }
  const lists: Record<ReadingStep, string[]> = { week: plan.week, month: plan.month, months: plan.months, cycles: plan.cycles };
  const steps = SETUP_STEPS.map((id): SetupStep => {
    if (id === "chart" || id === "planets") return { id, done: true, count: null };
    const keys = lists[id];
    return { id, done: state === "ready" || keys.every(landed), count: keys.length };
  });
  const replay = row.replayFrom && row.replayTo && !row.replaySeenAt && today >= row.replayFrom
    ? { from: row.replayFrom, to: row.replayTo }
    : null;
  if (opened) await queueRefreshes(reader, writeOrder(plan));
  return { state, from: row.fromDay, to: row.toDay, steps, replay };
}

/**
 * Starts the reader's setup, once (reading 8): from the Monday of their week in the zone to `stretchEnd`, so every
 * reading the six-month view lists from today, and every life cycle. A setup that stands is answered as it is, its next
 * six months' job queued again should a plan that lapsed have dropped it; one that no longer stands starts afresh.
 * Never for the QA pair. A start queues no refresh: a kept reading gone stale waits for the reader's own open (reading
 * 10). The jobs go in before the row, so a setup that reads as started always has its jobs; two starts at once queue
 * each job once, and one row stands.
 */
export async function startSetup(reader: ReaderChart, zone?: string | null): Promise<TimelineSetup> {
  const tz = validZone(zone) ?? reader.zone;
  if (await isQaAccount(reader.userId)) return stateOf(reader, tz, false);
  const today = dayIn(new Date(), tz);
  const row = await setupRow(reader.userId);
  if (row && stands(row, reader, today)) {
    await armAhead(reader.userId, row.toDay, reader.zone);
    return stateOf(reader, tz, false);
  }
  const from = mondayOf(today);
  const plan = planOf(reader, tz, from, stretchEnd(from, today));
  await queueWrites(reader.profileId, writeOrder(plan));
  await armAhead(reader.userId, plan.to, reader.zone);
  const now = new Date();
  const started = {
    reportId: reader.reportId,
    fromDay: plan.from,
    toDay: plan.to,
    state: "writing" as const,
    startedAt: now,
    readyAt: null,
    replayFrom: null,
    replayTo: null,
    replaySeenAt: null,
    updatedAt: now,
  };
  if (row) {
    await db
      .update(timelineSetupsTable)
      .set(started)
      .where(and(
        eq(timelineSetupsTable.userId, reader.userId),
        eq(timelineSetupsTable.toDay, row.toDay),
        eq(timelineSetupsTable.reportId, row.reportId),
      ));
  } else {
    await db.insert(timelineSetupsTable).values({ userId: reader.userId, ...started }).onConflictDoNothing({ target: timelineSetupsTable.userId });
  }
  return stateOf(reader, tz, false);
}

/** The next six months have been drawn for the reader, so they are not drawn again. */
export async function markReplaySeen(userId: string): Promise<void> {
  const now = new Date();
  await db
    .update(timelineSetupsTable)
    .set({ replaySeenAt: now, updatedAt: now })
    .where(and(eq(timelineSetupsTable.userId, userId), isNotNull(timelineSetupsTable.replayFrom), isNull(timelineSetupsTable.replaySeenAt)));
}

/**
 * Payment cleared (ADR-362): the subscriber's setup starts now, in the birth place's days, since a webhook names no
 * zone. With no finished Personal report of their own yet, it starts when that report finishes. Never rejects, so the
 * webhook's event is never failed for it; the screen's catch-up starts a setup this missed.
 */
export async function setupAtPayment(userId: string): Promise<void> {
  try {
    const reader = await readerChart({ userId, sessionId: "" });
    if (reader) await startSetup(reader);
  } catch (err) {
    logger.warn({ code: codeOf(err) }, "Timeline's setup did not start at a plan's first payment");
  }
}

/**
 * A Personal report finished: a subscriber whose own report it now is, who paid before it came, starts setup
 * (ADR-362). Never rejects, so the report's own flow neither waits on a failure here nor fails for one.
 */
export async function setupAfterReport(reportId: string): Promise<void> {
  try {
    const [found] = await db
      .select({ userId: profilesTable.userId, claimedBy: profilesTable.claimedByUserId })
      .from(reportsTable)
      .innerJoin(profilesTable, eq(reportsTable.profileId, profilesTable.id))
      .where(and(eq(reportsTable.id, reportId), eq(reportsTable.type, "natal")))
      .limit(1);
    if (!found) return;
    for (const userId of new Set([found.claimedBy, found.userId])) {
      if (!userId || !(await activeSubscription(userId))) continue;
      const reader = await readerChart({ userId, sessionId: "" });
      if (reader?.reportId === reportId) await startSetup(reader);
    }
  } catch (err) {
    logger.warn({ reportId, code: codeOf(err) }, "Timeline's setup did not start after a Personal report finished");
  }
}

function idIn(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 && value.length <= 200 ? value : null;
}

/** The reader a profile's job writes for: the account whose own chart it is now, with a finished Personal report. */
async function readerOfProfile(profileId: string): Promise<ReaderChart | null> {
  const [profile] = await db
    .select({ userId: profilesTable.userId, claimedBy: profilesTable.claimedByUserId })
    .from(profilesTable)
    .where(eq(profilesTable.id, profileId))
    .limit(1);
  if (!profile) return null;
  for (const userId of new Set([profile.claimedBy, profile.userId])) {
    if (!userId) continue;
    const reader = await readerChart({ userId, sessionId: "" });
    if (reader?.profileId === profileId) return reader;
  }
  return null;
}

/**
 * `timeline.reading { profileId, key }`: one reading of a setup, idempotent by its key, since a reading kept on the
 * reader's basis is left as it is. Its reader is found again from the profile, so a report deleted meanwhile writes
 * nothing. A paused day waits for the next; a reading another write holds is looked at again once that write could
 * have died.
 */
export const readingJob: JobHandler = async (payload) => {
  const profileId = idIn(payload.profileId);
  const key = idIn(payload.key);
  if (!profileId || !key) return;
  const reader = await readerOfProfile(profileId);
  if (!reader) return;
  const outcome = await writeQueuedReading(reader, key);
  if (outcome.status === "paused") return { retryAt: nextUtcMidnight() };
  return outcome.status === "held" ? { retryAt: outcome.until } : undefined;
};

/**
 * `timeline.ahead { userId }` (reading 9): a week before the readings written end, with Timeline still open to the
 * reader, it queues the next six months' readings, to `stretchEnd` should it run late, moves the setup on to them and
 * sets them to be drawn once, then waits for the week before those end. Without access it writes nothing and stops; a
 * new payment, or a visit once access is back, queues it again.
 */
export const aheadJob: JobHandler = async (payload) => {
  const userId = idIn(payload.userId);
  if (!userId) return;
  const row = await setupRow(userId);
  if (!row) return;
  const reader = await readerChart({ userId, sessionId: "" });
  if (!reader || row.profileId !== reader.profileId) return;
  const due = dayStart(addDays(row.toDay, -AHEAD_DAYS), reader.zone);
  if (Date.now() < due.getTime()) return { retryAt: due };
  if (!(await timelineAccess({ userId, sessionId: "" })).access) return;
  const from = addDays(row.toDay, 1);
  const to = stretchEnd(from, dayIn(new Date(), reader.zone));
  const keys = readableOver(reader, reader.zone, from, to);
  const statuses = await readingStatuses(reader.profileId, keys, reader.basis);
  await queueWrites(reader.profileId, keys.filter((key) => !landedIn(statuses.get(key))));
  const now = new Date();
  await db
    .update(timelineSetupsTable)
    .set({ fromDay: from, toDay: to, replayFrom: from, replayTo: to, replaySeenAt: null, updatedAt: now })
    .where(and(eq(timelineSetupsTable.userId, userId), eq(timelineSetupsTable.toDay, row.toDay)));
  return { retryAt: dayStart(addDays(to, -AHEAD_DAYS), reader.zone) };
};

/**
 * `timeline.refresh { profileId, key }` (reading 10): a kept reading the reader's open found gone stale, written again
 * in place when what it is written from moved, moved onto the new basis when it did not. Idempotent by its key, since
 * a reading on the reader's basis is left as it is; its reader is found again from the profile, so a report deleted
 * meanwhile writes nothing. A paused day waits for the next.
 */
export const refreshJob: JobHandler = async (payload) => {
  const profileId = idIn(payload.profileId);
  const key = idIn(payload.key);
  if (!profileId || !key) return;
  const reader = await readerOfProfile(profileId);
  if (!reader) return;
  return (await refreshReading(reader, key)).status === "paused" ? { retryAt: nextUtcMidnight() } : undefined;
};
