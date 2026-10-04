/**
 * The reader's zone on the web (reading 4). Timeline's days are the reader's: the zone their browser names goes to the
 * API as `tz`, and when it names none the web sends none, so the server reads the birth place's. The web never picks a
 * zone of its own: a screen prints days in the zone they were read in.
 */
import { getGetTimelineNowQueryKey, useGetTimelineNow, type GetTimelineNowParams } from "@workspace/api-client-react";

// The server's `validZone` takes exactly these, so a zone the web sends is one the server reads, never one it drops.
const ZONE_SHAPE = /^[A-Za-z0-9_+\-/]+$/;
const ZONE_MAX = 64;

/** A zone the server reads as the reader's: an IANA name Intl can format in, else none. */
export function readableZone(name: unknown): string | undefined {
  if (typeof name !== "string" || name.length === 0 || name.length > ZONE_MAX || !ZONE_SHAPE.test(name)) return undefined;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: name });
    return name;
  } catch {
    return undefined;
  }
}

/**
 * The valid IANA zone the browser names, else none, so the server falls back to the birth place's (reading 4). A
 * browser that cannot tell its zone may still name one Intl refuses, "Etc/Unknown".
 */
export function browserZone(): string | undefined {
  try {
    return readableZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    return undefined;
  }
}

let visit: { zone: string | undefined } | undefined;

/**
 * `browserZone()` as this visit first read it, the one zone every request sends: two reads that share a cache key and
 * sent two zones would move the reader's days whenever the other one refetched.
 */
export function sentZone(): string | undefined {
  visit ??= { zone: browserZone() };
  return visit.zone;
}

/** The read that names the server's zone for the reader: Now and ahead's week with no zone, under Timeline's own key. */
export const SERVED_WEEK: GetTimelineNowParams = { range: "week" };

/** Made only when nothing else names the zone, and only for a reader with Timeline, whom the read answers. */
export function servedZoneRead(canRead: boolean, known: string | undefined) {
  return { queryKey: getGetTimelineNowQueryKey(SERVED_WEEK), enabled: canRead && known === undefined, staleTime: 5 * 60_000 };
}

/** The first zone the server would read the reader's days in, as their browser, their birth place or the server names it. */
export function shownZone(sent: string | undefined, birth: string | null | undefined, served: string | undefined): string | undefined {
  return sent ?? readableZone(birth) ?? readableZone(served);
}

/**
 * The zone a screen prints the reader's days in: the one the web sends, else the birth place's the server falls back to.
 * A page that holds the reader's own birth zone passes it; else a reader with Timeline asks the server which zone it
 * read. Undefined until one is known, so a screen waits rather than print another zone's days.
 */
export function useShownZone(canRead: boolean, birth?: string | null): string | undefined {
  const known = sentZone() ?? readableZone(birth);
  const served = useGetTimelineNow(SERVED_WEEK, { query: servedZoneRead(canRead, known) });
  return shownZone(sentZone(), birth, served.data?.zone);
}
