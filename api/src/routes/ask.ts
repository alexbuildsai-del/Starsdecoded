/**
 * Ask's routes (ADR-213, 263): the reader's thread, and a message to Ask. Both stand behind Timeline's one access check
 * and read the reader's own chart (reading 2); routes/index.ts stands Ask's count and the breaker ahead of a message.
 * Nothing the reader types reaches a log (ADR-201): a failure here logs its class and nothing else, as ask.ts does.
 */
import { Router, type Request } from "express";
import { GetAskThreadQueryParams, SendAskMessageQueryParams } from "@workspace/api-zod";
import type { Viewer } from "../lib/access.js";
import { askThread, sendAsk, type SendAskBody, type SendAskResult } from "../lib/ask.js";
import { readerChart } from "../lib/timeline.js";
import { requireTimelineAccess } from "../lib/timelineAccess.js";
import { NO_PERSONAL_REPORT } from "./timeline.js";

/** What a message's outcome answers: the thread, the month's cap, a body Ask cannot take, or no chart to read. */
export function askAnswerOf(result: SendAskResult): { status: 200 | 400 | 409 | 429; body: unknown } {
  switch (result.kind) {
    case "thread":
      return { status: 200, body: result.thread };
    case "cap":
      return { status: 429, body: result.cap };
    case "invalid":
      return { status: 400, body: { error: result.error, message: result.message } };
    case "no_personal_report":
      return { status: 409, body: NO_PERSONAL_REPORT };
  }
}

/** A message's own three fields, each only when it is a string; `sendAsk` words what is missing or too long. */
export function askBodyOf(raw: unknown): SendAskBody {
  const body = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const text = (key: string) => (typeof body[key] === "string" ? (body[key] as string) : undefined);
  return { text: text("text"), choiceId: text("choiceId"), reportId: text("reportId") };
}

const viewerOf = (req: Request): Viewer => ({ userId: req.userId ?? null, sessionId: req.sessionId });

const failureOf = (err: unknown): string => (err instanceof Error ? err.name : typeof err);

const router = Router();

router.get("/ask", requireTimelineAccess, async (req, res) => {
  const viewer = viewerOf(req);
  const tz = GetAskThreadQueryParams.safeParse(req.query).data?.tz;
  try {
    if (!(await readerChart(viewer))) return res.status(409).json(NO_PERSONAL_REPORT);
    return res.json(await askThread(viewer, { tz }));
  } catch (err) {
    req.log.error({ failure: failureOf(err) }, "Failed to read the Ask thread");
    return res.status(500).json({ error: "internal_error", message: "Failed to read your messages" });
  }
});

// Checked here too, so the router holds its own door whatever stands ahead of it.
router.post("/ask", requireTimelineAccess, async (req, res) => {
  const tz = SendAskMessageQueryParams.safeParse(req.query).data?.tz;
  try {
    const { status, body } = askAnswerOf(await sendAsk(viewerOf(req), askBodyOf(req.body), { tz }));
    return res.status(status).json(body);
  } catch (err) {
    req.log.error({ failure: failureOf(err) }, "Ask could not take a message");
    return res.status(500).json({ error: "internal_error", message: "Failed to send your message" });
  }
});

export default router;
