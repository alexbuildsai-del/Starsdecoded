/**
 * Timeline's routes (ADR-207, 209, 210, 262): whether the reader has it, Now and ahead, Life, and each reading. Every
 * route but the access answer stands behind the one access check and reads the reader's own chart with a finished
 * Personal report (reading 2). routes/index.ts stands Now and ahead's count ahead of it, and a reading's count and the
 * breaker, with Timeline's own pause line, ahead of its open. A new reading once the account has started the day's is
 * 429, with Timeline's own line too.
 */
import { Router, type Request, type RequestHandler, type Response } from "express";
import type { z } from "zod";
import {
  GetTimelineLifeQueryParams, GetTimelineNowQueryParams, OpenTimelineReadingParams, type GetTimelineAccessResponse,
} from "@workspace/api-zod";
import type { Viewer } from "../lib/access.js";
import { askUsage, type AskUsage } from "../lib/ask.js";
import { ownChartOf } from "../lib/shares.js";
import { livePlan, type LivePlan } from "../lib/subscriptions.js";
import { lifeView, nowView, readerChart, type ReaderChart, type ReadingState, type ReadingStatuses, type TimelineNow } from "../lib/timeline.js";
import { requireTimelineAccess, timelineAccess, type TimelineAccessAnswer } from "../lib/timelineAccess.js";
import { openReading, queueReadings, readingStatuses, type OpenedReading } from "../lib/timelineReadings.js";
import { validationFailure } from "../lib/validation.js";

type TimelineAccess = z.infer<typeof GetTimelineAccessResponse>;

/** The access answer's 401: Timeline belongs to an account (ADR-262). */
export const TIMELINE_SIGN_IN_LINE = "Sign in to use Timeline.";
/** The 409 of Now and ahead, Life and Ask; the app shows its own screen for it. */
export const NO_PERSONAL_REPORT_LINE = "Timeline reads the chart in your own Personal report. You don't have a finished one yet.";
/**
 * A reading's 404: a key nothing on the reader's chart carries, a sky event outside the days the app shows, one that
 * gets no reading, or no chart to read.
 */
export const NO_READING_LINE = "We couldn't find this reading.";

export const NO_PERSONAL_REPORT = { error: "no_personal_report", message: NO_PERSONAL_REPORT_LINE } as const;

const NOT_FOUND = { error: "not_found", message: NO_READING_LINE } as const;

const NO_READINGS: ReadingStatuses = new Map();

/**
 * The access answer for a signed-in reader (ADR-262, 263, 277): Ask's count only with access, whether their own
 * Personal report is finished, as `ownChartOf` reads it, and their live plan when they have one.
 */
export function accessAnswer(
  answer: TimelineAccessAnswer,
  own: { finished: boolean } | null,
  ask: AskUsage | null,
  plan: LivePlan | null = null,
): TimelineAccess {
  return {
    access: answer.access,
    source: answer.access ? answer.source : null,
    hasPersonalReport: own?.finished === true,
    ask: answer.access ? ask : null,
    // Left out with none, so a reader without a plan gets the answer they got before plans were sold.
    ...(plan ? { plan } : {}),
  };
}

/** A key as the views mint them (reading 5): URL-safe and at most 80 characters. Anything else names no reading. */
export function isReadingKey(key: unknown): key is string {
  return typeof key === "string" && key.length > 0 && key.length <= 80 && /^[a-z0-9._-]+$/.test(key);
}

/** Whether opening a reading in this state starts a write: none kept, one that failed, or one whose write died. */
export function writesOnOpen(state: ReadingState | undefined): boolean {
  const status = typeof state === "string" ? state : state?.status;
  return status !== "ready" && status !== "writing";
}

/** The contacts in the six-month view with no reading yet, which the queue writes ahead, three at most (reading 7). */
export function toQueue(view: Pick<TimelineNow, "events">): string[] {
  return view.events.filter((event) => event.kind === "contact" && event.reading === "none").map((event) => event.key);
}

/**
 * What an open answers: the reading as it stands (200), no such reading (404), or the day's cap on new readings (429)
 * in the contract's limit body, with Retry-After carrying its wait as every limit's 429 does.
 */
export function readingAnswerOf(opened: OpenedReading): { status: 200 | 404 | 429; body: unknown; retryAfter: number | null } {
  switch (opened.status) {
    case "unknown":
      return { status: 404, body: NOT_FOUND, retryAfter: null };
    case "capped": {
      const { line: message, retryAfterSeconds } = opened;
      return { status: 429, body: { error: "rate_limited", message, retryAfterSeconds }, retryAfter: retryAfterSeconds };
    }
    default:
      return { status: 200, body: opened, retryAfter: null };
  }
}

const viewerOf = (req: Request): Viewer => ({ userId: req.userId ?? null, sessionId: req.sessionId });

const readers = new WeakMap<Request, Promise<ReaderChart | null>>();

/** The reader's chart, read once a request: the reading's count ahead of its route reads it too. */
function readerFor(req: Request): Promise<ReaderChart | null> {
  let reader = readers.get(req);
  if (!reader) {
    reader = readerChart(viewerOf(req));
    readers.set(req, reader);
  }
  return reader;
}

/**
 * Ahead of a reading's count and the breaker in routes/index.ts. An open whose reading is kept or still being written
 * starts no write, so it skips both: the sheet asks again every few seconds while a reading is written, and a kept one
 * opens on a paused day. A key not shaped as one, or a reader with no chart, skips them too, on its way to the route's
 * 404. An open whose state cannot be read meets both, as a write would.
 */
export const startsAReading: RequestHandler = async (req, _res, next) => {
  try {
    const key = req.params.key;
    if (!isReadingKey(key)) return next("route");
    const reader = await readerFor(req);
    if (!reader) return next("route");
    const state = (await readingStatuses(reader.profileId, [key], reader.basis)).get(key);
    return writesOnOpen(state) ? next() : next("route");
  } catch {
    return next();
  }
};

const noReading = (res: Response) => res.status(404).json(NOT_FOUND);

const router = Router();

router.get("/timeline/access", async (req, res) => {
  const viewer = viewerOf(req);
  const userId = viewer.userId;
  if (!userId) return res.status(401).json({ error: "sign_in_required", message: TIMELINE_SIGN_IN_LINE });
  try {
    const answer = await timelineAccess(viewer);
    const [own, ask, plan] = await Promise.all([
      ownChartOf(userId),
      answer.access ? askUsage(viewer) : null,
      livePlan(userId),
    ]);
    return res.json(accessAnswer(answer, own, ask, plan));
  } catch (err) {
    req.log.error({ err }, "Failed to read Timeline access");
    return res.status(500).json({ error: "internal_error", message: "Failed to read Timeline access" });
  }
});

router.get("/timeline/now", requireTimelineAccess, async (req, res) => {
  const parsed = GetTimelineNowQueryParams.safeParse(req.query);
  if (!parsed.success) return res.status(400).json(validationFailure(parsed.error));
  try {
    const reader = await readerFor(req);
    if (!reader) return res.status(409).json(NO_PERSONAL_REPORT);
    const { range, tz } = parsed.data;
    const now = new Date();
    // The view names its own keys; drawn again with their readings it takes about a millisecond.
    const keys = nowView(reader, range, tz, NO_READINGS, now).events.map((event) => event.key);
    const view = nowView(reader, range, tz, await readingStatuses(reader.profileId, keys, reader.basis), now);
    // The queue never rejects, so the view answers at once and the readings land on their own (reading 7).
    if (range === "six-months") void queueReadings(reader, toQueue(view));
    return res.json(view);
  } catch (err) {
    req.log.error({ err }, "Failed to read Now and ahead");
    return res.status(500).json({ error: "internal_error", message: "Failed to read Now and ahead" });
  }
});

router.get("/timeline/life", requireTimelineAccess, async (req, res) => {
  const parsed = GetTimelineLifeQueryParams.safeParse(req.query);
  if (!parsed.success) return res.status(400).json(validationFailure(parsed.error));
  try {
    const reader = await readerFor(req);
    if (!reader) return res.status(409).json(NO_PERSONAL_REPORT);
    const { tz } = parsed.data;
    const now = new Date();
    const keys = lifeView(reader, tz, NO_READINGS, now).cycles.map((cycle) => cycle.key);
    return res.json(lifeView(reader, tz, await readingStatuses(reader.profileId, keys, reader.basis), now));
  } catch (err) {
    req.log.error({ err }, "Failed to read Life");
    return res.status(500).json({ error: "internal_error", message: "Failed to read Life" });
  }
});

// Checked here too, so the router holds its own door whatever stands ahead of it.
router.post("/timeline/readings/:key", requireTimelineAccess, async (req, res) => {
  const parsed = OpenTimelineReadingParams.safeParse(req.params);
  const key = parsed.success ? parsed.data.key : null;
  if (!isReadingKey(key)) return noReading(res);
  try {
    const reader = await readerFor(req);
    if (!reader) return noReading(res);
    const { status, body, retryAfter } = readingAnswerOf(await openReading(reader, key));
    if (retryAfter !== null) res.set("Retry-After", String(retryAfter));
    return res.status(status).json(body);
  } catch (err) {
    req.log.error({ err }, "Failed to open a Timeline reading");
    return res.status(500).json({ error: "internal_error", message: "Failed to open the reading" });
  }
});

export default router;
