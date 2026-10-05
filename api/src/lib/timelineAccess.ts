import type { RequestHandler } from "express";
import type { Viewer } from "./access.js";
import { labActor } from "./labGuard.js";
import { activeSubscription } from "./subscriptions.js";

/** Where a reader's Timeline comes from (ADR-262): the signed-in admin, or a live subscription (ADR-264). */
export type TimelineSource = "admin" | "subscription";

/**
 * One way to have Timeline. A source is only ever asked about an account: an anonymous session has no Timeline, so no
 * source can open it to one.
 */
export type AccessSource = {
  source: TimelineSource;
  grants: (userId: string, env: NodeJS.ProcessEnv) => boolean | Promise<boolean>;
};

/** The first source that gives the viewer Timeline is the one reported, so the order here is the precedence. */
export const ACCESS_SOURCES: readonly AccessSource[] = [
  // The signed-in admin has Timeline on every host (ADR-262), and is asked first, so the admin's answer reads no table.
  { source: "admin", grants: (userId, env) => labActor({ userId }, env) !== null },
  // A plan as Stripe's webhooks last left it: active, trialing or past due, or set to end and not yet ended (reading 7).
  { source: "subscription", grants: async (userId) => (await activeSubscription(userId)) !== null },
];

export type TimelineAccessAnswer = { access: boolean; source: TimelineSource | null };

const NO_ACCESS: TimelineAccessAnswer = { access: false, source: null };

/**
 * The one answer to "does this reader have Timeline?" (ADR-262), read by the routes, `GET /home` and the web. A source
 * that throws fails the answer instead of being skipped: a broken read is neither access nor a 403, so it never opens a
 * paid product and never tells a subscriber they have none.
 */
export async function timelineAccess(
  viewer: Viewer,
  env: NodeJS.ProcessEnv = process.env,
  sources: readonly AccessSource[] = ACCESS_SOURCES,
): Promise<TimelineAccessAnswer> {
  const { userId } = viewer;
  if (!userId) return NO_ACCESS;
  for (const { source, grants } of sources) {
    if ((await grants(userId, env)) === true) return { access: true, source };
  }
  return NO_ACCESS;
}

/** Sent with the 403; the app sends a reader without Timeline to /timeline instead of showing it (reading 1). */
export const NO_TIMELINE_LINE = "This account doesn't have Timeline.";

/** In front of every Timeline and Ask route: anyone without Timeline, signed out included, gets 403 `no_timeline`. */
export const requireTimelineAccess: RequestHandler = async (req, res, next) => {
  const { access } = await timelineAccess({ userId: req.userId ?? null, sessionId: req.sessionId });
  if (access) return next();
  res.status(403).json({ error: "no_timeline", message: NO_TIMELINE_LINE });
};
