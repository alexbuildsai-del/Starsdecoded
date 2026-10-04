/**
 * The access hook at its edges (R16-18; ADR-262, 263; MB-197): who is asked, what a stale or failed answer is allowed to
 * say, and that one account's answer is never another's. `timeline-access.test.ts` has the main cases; web tests render
 * no components (MB-47), so the hook's two pure halves and its query options are what is read here.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { getGetTimelineAccessQueryKey, getGetTimelineAccessQueryOptions, type TimelineAccess } from "@workspace/api-client-react";
import {
  timelineAccessFailed,
  timelineAccessQuery,
  timelineAccessView,
  timelineDoor,
  type AccessReader,
} from "./timeline-access";

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

  it("says the read failed after a 500 or a 401, so Timeline's page offers to read it again and never sends the reader away", async () => {
    for (const status of [500, 401]) {
      const result = await readOnce(status, { error: "boom" });
      const error = timelineAccessFailed(reader({}), result.data, result.isError);
      expect(error, String(status)).toBe(true);
      const state = { ...timelineAccessView(reader({}), result.data, result.isPending), error };
      expect(timelineDoor(state), String(status)).toBe("retry");
    }
  });

  it("keeps the answer it had when a later read fails, so an open page stays open", async () => {
    fetchStub.mockResolvedValueOnce(new Response(JSON.stringify(ADMIN_ANSWER), { status: 200, headers: { "content-type": "application/json" } }));
    fetchStub.mockResolvedValueOnce(new Response(JSON.stringify({ error: "boom" }), { status: 500, headers: { "content-type": "application/json" } }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    clients.push(client);
    const observer = new QueryObserver(client, getGetTimelineAccessQueryOptions({ query: timelineAccessQuery(reader({})) }));
    const unsubscribe = observer.subscribe(() => {});
    await vi.waitFor(() => expect(observer.getCurrentResult().isSuccess).toBe(true));
    // Ask's send invalidates the key to move the count (R16-28); this read is the one that fails.
    await client.invalidateQueries({ queryKey: getGetTimelineAccessQueryKey() });
    await vi.waitFor(() => expect(observer.getCurrentResult().isError).toBe(true));
    const result = observer.getCurrentResult();
    unsubscribe();
    expect(result.data).toEqual(ADMIN_ANSWER);
    const error = timelineAccessFailed(reader({}), result.data, result.isError);
    expect(error).toBe(false);
    expect(timelineDoor({ ...timelineAccessView(reader({}), result.data, result.isPending), error })).toBe("open");
  });
});

describe("what Timeline's own page does with the answer (R16-27)", () => {
  it("calls a failed read an error only for a signed-in reader with no answer to go by", () => {
    expect(timelineAccessFailed(reader({}), undefined, true)).toBe(true);
    expect(timelineAccessFailed(reader({}), undefined, false)).toBe(false);
    expect(timelineAccessFailed(reader({}), ADMIN_ANSWER, true)).toBe(false);
    expect(timelineAccessFailed(reader({}), { ...ADMIN_ANSWER, access: false, source: null, ask: null }, true)).toBe(false);
    // Signed out or still loading, no read is made, so nothing failed: a visitor has no Timeline and that is known.
    for (const over of [{ isLoaded: false }, { isSignedIn: false }, { isSignedIn: undefined }, { userId: null }, { userId: "" }]) {
      expect(timelineAccessFailed(reader(over), undefined, true), JSON.stringify(over)).toBe(false);
    }
  });

  it("waits while loading, opens with access, sends away only a known no, and offers a retry on an error", () => {
    expect(timelineDoor({ access: false, loading: true, error: false })).toBe("wait");
    expect(timelineDoor({ access: true, loading: false, error: false })).toBe("open");
    expect(timelineDoor({ access: false, loading: false, error: false })).toBe("away");
    expect(timelineDoor({ access: false, loading: false, error: true })).toBe("retry");
    // Loading wins over a stale error: the page waits for the read under way rather than offering another.
    expect(timelineDoor({ access: false, loading: true, error: true })).toBe("wait");
  });

  it("sends a signed-out visitor and a reader without Timeline to /timeline, and opens for the admin", () => {
    const door = (who: AccessReader, answer: TimelineAccess | undefined, pending: boolean, failed: boolean) =>
      timelineDoor({ ...timelineAccessView(who, answer, pending), error: timelineAccessFailed(who, answer, failed) });
    expect(door(reader({ isSignedIn: false, userId: null }), undefined, true, false)).toBe("away");
    expect(door(reader({}), { access: false, source: null, hasPersonalReport: true, ask: null }, false, false)).toBe("away");
    expect(door(reader({}), ADMIN_ANSWER, false, false)).toBe("open");
    expect(door(reader({ isLoaded: false }), undefined, true, false)).toBe("wait");
    expect(door(reader({}), undefined, true, false)).toBe("wait");
  });
});
