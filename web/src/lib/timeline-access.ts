import { useAuth } from "@clerk/react";
import {
  getGetTimelineAccessQueryKey,
  useGetTimelineAccess,
  type TimelineAccess,
  type TimelinePlan,
} from "@workspace/api-client-react";
import { resetDay } from "@/lib/ask-view";
import type { DateOrder } from "@/lib/date-entry";

/** Every Timeline door in the app reads this (ADR-262, 263); `loading` keeps a door from deciding before the answer is in. */
export type TimelineAccessView = {
  access: boolean;
  source: TimelineAccess["source"];
  hasPersonalReport: boolean;
  ask: TimelineAccess["ask"];
  /** The live subscription, present only when the answer carries one (reading 7). */
  plan?: TimelinePlan;
  loading: boolean;
};

/** What the hook answers: the view, and `error` when the read failed with no answer to go by, so no door decides on it. */
export type TimelineAccessState = TimelineAccessView & { error: boolean };

/** Who is asking, as Clerk's `useAuth` says it. */
export type AccessReader = {
  isLoaded: boolean;
  isSignedIn: boolean | undefined;
  userId: string | null | undefined;
};

const NO_TIMELINE = { access: false, source: null, hasPersonalReport: false, ask: null } as const;

function signedIn(reader: AccessReader): boolean {
  return reader.isLoaded && reader.isSignedIn === true && Boolean(reader.userId);
}

/**
 * Keyed by user so one account's answer never stands for the next one's in the same tab, and read once per user since
 * access moves only with billing. Ask's count and `hasPersonalReport` move sooner: what changes them invalidates
 * `getGetTimelineAccessQueryKey()`, which this key starts with.
 */
export function timelineAccessQuery(reader: AccessReader) {
  return {
    queryKey: [...getGetTimelineAccessQueryKey(), reader.userId ?? ""] as const,
    enabled: signedIn(reader),
    staleTime: Infinity,
  };
}

export function timelineAccessView(
  reader: AccessReader,
  answer: TimelineAccess | undefined,
  pending: boolean,
): TimelineAccessView {
  if (!reader.isLoaded) return { ...NO_TIMELINE, loading: true };
  if (!signedIn(reader)) return { ...NO_TIMELINE, loading: false };
  if (!answer) return { ...NO_TIMELINE, loading: pending };
  const { access, source, hasPersonalReport, ask, plan } = answer;
  return { access, source, hasPersonalReport, ask, ...(plan ? { plan } : {}), loading: false };
}

/**
 * Access is unknown, not false, when a signed-in reader's read failed and no answer stands. A read that fails after an
 * answer came keeps that answer, as React Query keeps its data, and the answer still holds.
 */
export function timelineAccessFailed(reader: AccessReader, answer: TimelineAccess | undefined, failed: boolean): boolean {
  return signedIn(reader) && answer === undefined && failed;
}

export const ADMIN_PLAN_LINE = "Timeline, through admin access";
export const PAST_DUE_LINE = "Your last payment didn't go through. Use Manage payment to fix it.";
export const PORTAL_ERROR_LINE = "We couldn't open that. Try again in a minute.";

/** The plan's name on the Account page; the admin's access is not a plan and keeps its own line. */
export function planLine(source: TimelineAccess["source"], plan: Pick<TimelinePlan, "item"> | undefined): string {
  if (source === "admin") return ADMIN_PLAN_LINE;
  if (!plan) return "Timeline";
  return plan.item === "timeline_year" ? "Timeline, yearly" : "Timeline, monthly";
}

/** "Renews on 1 November." or, once a cancel is set, "Ends on 1 November."; the days are the API's. */
export function planDayLine(plan: Pick<TimelinePlan, "renewsOn" | "endsOn">, order: DateOrder): string | null {
  if (plan.endsOn) return `Ends on ${resetDay(plan.endsOn, order)}.`;
  if (plan.renewsOn) return `Renews on ${resetDay(plan.renewsOn, order)}.`;
  return null;
}

/** What Timeline's own page does with the answer: wait, offer to read it again, send the reader to /timeline, or open. */
export type TimelineDoor = "wait" | "retry" | "away" | "open";

/** Away only once access is known to be false: a failed read would otherwise send a subscriber to the product page. */
export function timelineDoor(state: Pick<TimelineAccessState, "access" | "loading" | "error">): TimelineDoor {
  if (state.loading) return "wait";
  if (state.access) return "open";
  return state.error ? "retry" : "away";
}

/** Whether the signed-in reader has Timeline (ADR-262); a signed-out visitor makes no call and has none. */
export function useTimelineAccess(): TimelineAccessState {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const reader: AccessReader = { isLoaded, isSignedIn, userId };
  const query = useGetTimelineAccess({ query: timelineAccessQuery(reader) });
  return {
    ...timelineAccessView(reader, query.data, query.isPending),
    error: timelineAccessFailed(reader, query.data, query.isError),
  };
}
