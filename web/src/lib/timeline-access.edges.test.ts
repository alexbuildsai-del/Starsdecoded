/**
 * The access hook at its edges (R16-18; ADR-262, 263; MB-197): who is asked, what a stale or failed answer is allowed to
 * say, and that one account's answer is never another's. `timeline-access.test.ts` has the main cases; web tests render
 * no components (MB-47), so the hook's two pure halves and its query options are what is read here.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { getGetTimelineAccessQueryKey, getGetTimelineAccessQueryOptions, type TimelineAccess } from "@workspace/api-client-react";
import { timelineAccessQuery, timelineAccessView, type AccessReader } from "./timeline-access";

const NONE = { access: false, source: null, hasPersonalReport: false, ask: null };
const ADMIN_ANSWER: TimelineAccess = {
  access: true,
  source: "admin",
  hasPersonalReport: true,
  ask: { used: 1, left: 49, cap: 50, resetsOn: "2026-11-01" },
};

const reader = (over: Partial<AccessReader>): AccessReader => ({ isLoaded: true, isSignedIn: true, userId: "user_admin", ...over });

describe("who is asked", () => {
  it("asks only a loaded, signed-in reader with an id", () => {
    expect(timelineAccessQuery(reader({})).enabled).toBe(true);
    for (const over of [
      { isLoaded: false },
      { isSignedIn: false },
      { isSignedIn: undefined },
      { userId: null },
      { userId: undefined },
      { userId: "" },
      { isLoaded: false, isSignedIn: undefined, userId: undefined },
      { isSignedIn: false, userId: "user_admin" },
    ] satisfies Partial<AccessReader>[]) {
      expect(timelineAccessQuery(reader(over)).enabled, JSON.stringify(over)).toBe(false);
    }
  });

  it("keeps an answer for the visit, and keys it by the user so no two accounts share one", () => {
    const query = timelineAccessQuery(reader({}));
    expect(query.staleTime).toBe(Infinity);
    expect(query.queryKey.slice(0, -1)).toEqual([...getGetTimelineAccessQueryKey()]);
    expect(query.queryKey.at(-1)).toBe("user_admin");
    expect(timelineAccessQuery(reader({ userId: "user_other" })).queryKey).not.toEqual(query.queryKey);
    expect(timelineAccessQuery(reader({ userId: "user_admin" })).queryKey).toEqual(query.queryKey);
    // A signed-out tab has a key of its own, and it is no user's.
    for (const userId of [null, undefined, ""]) expect(timelineAccessQuery(reader({ userId, isSignedIn: false })).queryKey.at(-1)).toBe("");
    expect(timelineAccessQuery(reader({ userId: "" })).queryKey).toEqual(timelineAccessQuery(reader({ userId: null })).queryKey);
  });

  it("does not let an id that looks like the key's shape cross into another account's", () => {
    const a = timelineAccessQuery(reader({ userId: "a" })).queryKey;
    const b = timelineAccessQuery(reader({ userId: "a,b" })).queryKey;
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
    expect(b).toHaveLength(a.length);
  });
});

describe("what the doors are told", () => {
  it("never shows access to a reader who is not signed in, whatever answer is still in the cache", () => {
    for (const over of [{ isSignedIn: false }, { isSignedIn: undefined }, { userId: null }, { userId: "" }]) {
      expect(timelineAccessView(reader(over), ADMIN_ANSWER, false), JSON.stringify(over)).toEqual({ ...NONE, loading: false });
    }
  });

  it("never shows access while Clerk is still loading, and says it is loading", () => {
    expect(timelineAccessView(reader({ isLoaded: false }), ADMIN_ANSWER, false)).toEqual({ ...NONE, loading: true });
    expect(timelineAccessView(reader({ isLoaded: false }), undefined, true)).toEqual({ ...NONE, loading: true });
    expect(timelineAccessView(reader({ isLoaded: false, isSignedIn: undefined, userId: undefined }), undefined, false)).toEqual({ ...NONE, loading: true });
  });

  it("is loading exactly while a signed-in reader's answer is pending, and a read that failed is neither access nor loading", () => {
    expect(timelineAccessView(reader({}), undefined, true).loading).toBe(true);
    expect(timelineAccessView(reader({}), undefined, false)).toEqual({ ...NONE, loading: false });
    expect(timelineAccessView(reader({}), ADMIN_ANSWER, true).loading).toBe(false);
    expect(timelineAccessView(reader({}), ADMIN_ANSWER, true).access).toBe(true);
  });

  it("passes the answer on as it is: a reader without Timeline, a subscriber with no personal report, Ask's count", () => {
    const none: TimelineAccess = { access: false, source: null, hasPersonalReport: false, ask: null };
    expect(timelineAccessView(reader({}), none, false)).toEqual({ ...none, loading: false });
    const subscriber: TimelineAccess = { access: true, source: "subscription", hasPersonalReport: false, ask: { used: 50, left: 0, cap: 50, resetsOn: "2026-11-01" } };
    expect(timelineAccessView(reader({}), subscriber, false)).toEqual({ ...subscriber, loading: false });
    expect(timelineAccessView(reader({}), ADMIN_ANSWER, false).ask).toEqual(ADMIN_ANSWER.ask);
  });

  it("does not turn a server's access:false with a source into access, and reports the answer's own words", () => {
    const odd: TimelineAccess = { access: false, source: "admin", hasPersonalReport: true, ask: null };
    expect(timelineAccessView(reader({}), odd, false).access).toBe(false);
  });

  it("does not change the answer it is given", () => {
    const answer = structuredClone(ADMIN_ANSWER);
    const view = timelineAccessView(reader({}), answer, false);
    expect(answer).toEqual(ADMIN_ANSWER);
    expect(view).not.toBe(answer);
  });
});

describe("a read that fails", () => {
  const fetchStub = vi.fn();
  const clients: QueryClient[] = [];

  beforeEach(() => {
    fetchStub.mockReset();
    vi.stubGlobal("fetch", fetchStub);
  });
  afterEach(() => {
    for (const client of clients.splice(0)) client.clear();
    vi.unstubAllGlobals();
  });

  async function readOnce(status: number, body: unknown) {
    fetchStub.mockResolvedValue(new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    clients.push(client);
    const observer = new QueryObserver(client, getGetTimelineAccessQueryOptions({ query: timelineAccessQuery(reader({})) }));
    const unsubscribe = observer.subscribe(() => {});
    await vi.waitFor(() => expect(observer.getCurrentResult().isPending).toBe(false));
    const result = observer.getCurrentResult();
    unsubscribe();
    return result;
  }

  it("opens nothing on a 500, and is not left loading", async () => {
    const result = await readOnce(500, { error: "boom" });
    expect(result.isError).toBe(true);
    expect(timelineAccessView(reader({}), result.data, result.isPending)).toEqual({ ...NONE, loading: false });
  });

  it("opens nothing on a 401, as a session that expired in the tab answers", async () => {
    const result = await readOnce(401, { error: "unauthorized" });
    expect(result.isError).toBe(true);
    expect(timelineAccessView(reader({}), result.data, result.isPending)).toEqual({ ...NONE, loading: false });
  });

  it("asks the one path, once", async () => {
    await readOnce(200, ADMIN_ANSWER);
    expect(fetchStub).toHaveBeenCalledTimes(1);
    expect(String(fetchStub.mock.calls[0][0])).toBe("/api/timeline/access");
  });
});
