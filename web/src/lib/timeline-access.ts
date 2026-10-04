import { useAuth } from "@clerk/react";
import { getGetTimelineAccessQueryKey, useGetTimelineAccess, type TimelineAccess } from "@workspace/api-client-react";

/** Every Timeline door in the app reads this (ADR-262, 263); `loading` keeps a door from deciding before the answer is in. */
export type TimelineAccessView = {
  access: boolean;
  source: TimelineAccess["source"];
  hasPersonalReport: boolean;
  ask: TimelineAccess["ask"];
  loading: boolean;
};

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
  const { access, source, hasPersonalReport, ask } = answer;
  return { access, source, hasPersonalReport, ask, loading: false };
}

/** Whether the signed-in reader has Timeline (ADR-262); a signed-out visitor makes no call and has none. */
export function useTimelineAccess(): TimelineAccessView {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const reader: AccessReader = { isLoaded, isSignedIn, userId };
  const query = useGetTimelineAccess({ query: timelineAccessQuery(reader) });
  return timelineAccessView(reader, query.data, query.isPending);
}
