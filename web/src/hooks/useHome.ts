import { getGetHomeQueryKey, useGetHome, type GetHomeParams } from "@workspace/api-client-react";
import { sentZone } from "@/lib/reader-zone";

/** What every read of GET /home sends: the zone the browser names, else nothing, so the server reads the birth place's. */
export function homeParams(zone: string | undefined): GetHomeParams {
  return zone ? { tz: zone } : {};
}

/**
 * GET /home, for every caller. They all share `getGetHomeQueryKey()` whatever `tz` is sent (R16 re-pin 17), and React
 * Query refetches a shared key with the request its latest caller brought, so one caller sending another zone, or none,
 * would move Your week to that zone's days on the next refetch. Here every caller sends the same `{ tz }`.
 */
export function useHome(options: { enabled?: boolean } = {}) {
  return useGetHome(homeParams(sentZone()), { query: { queryKey: getGetHomeQueryKey(), ...options } });
}
