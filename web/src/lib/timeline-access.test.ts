/**
 * The access hook as `useGetTimelineAccess` runs it: its query options through React Query's own observer, the one
 * `useQuery` mounts, with the client's fetch stubbed. Web tests render no components (MB-47).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import {
  getGetTimelineAccessQueryKey,
  getGetTimelineAccessQueryOptions,
  type TimelineAccess,
} from "@workspace/api-client-react";
import { timelineAccessQuery, timelineAccessView, type AccessReader } from "./timeline-access";

const LOADING: AccessReader = { isLoaded: false, isSignedIn: undefined, userId: undefined };
const SIGNED_OUT: AccessReader = { isLoaded: true, isSignedIn: false, userId: null };
const signedIn = (userId: string): AccessReader => ({ isLoaded: true, isSignedIn: true, userId });

const ADMIN = signedIn("user_admin");
const READER = signedIn("user_reader");

const ANSWERS: Record<string, TimelineAccess> = {
  user_admin: {
    access: true,
    source: "admin",
    hasPersonalReport: true,
    ask: { used: 3, left: 47, cap: 50, resetsOn: "2026-11-01" },
  },
  user_reader: { access: false, source: null, hasPersonalReport: true, ask: null },
};

/** The server knows the reader by their cookie; here the test says who is signed in before it asks. */
let cookieOf = "";
const fetchStub = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
  return new Response(JSON.stringify(ANSWERS[cookieOf]), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});

function calledPaths(): string[] {
  return fetchStub.mock.calls.map(([input]) => String(input));
}

const clients: QueryClient[] = [];

/** The app's own defaults (App.tsx), so the hook's staleTime is what keeps it to one read. */
function appClient() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: 2, staleTime: 30_000 } } });
  clients.push(client);
  return client;
}

function mount(client: QueryClient, reader: AccessReader) {
  const observer = new QueryObserver(client, getGetTimelineAccessQueryOptions({ query: timelineAccessQuery(reader) }));
  const unmount = observer.subscribe(() => {});
  return { observer, unmount };
}

async function settle({ observer }: ReturnType<typeof mount>) {
  await vi.waitFor(() => expect(observer.getCurrentResult().isSuccess).toBe(true));
  return observer.getCurrentResult().data;
}

beforeEach(() => {
  fetchStub.mockClear();
  cookieOf = "";
  vi.stubGlobal("fetch", fetchStub);
});

afterEach(() => {
  for (const client of clients.splice(0)) client.clear();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("useTimelineAccess's read", () => {
  it("asks nothing while Clerk loads or when signed out", async () => {
    const client = appClient();
    const views = [mount(client, LOADING), mount(client, SIGNED_OUT)];
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fetchStub).not.toHaveBeenCalled();
    expect(timelineAccessQuery(LOADING).enabled).toBe(false);
    expect(timelineAccessQuery(SIGNED_OUT).enabled).toBe(false);
    for (const { unmount } of views) unmount();
  });

  it("reads GET /timeline/access once per signed-in user, however many doors ask and however long the visit", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const client = appClient();
    cookieOf = "user_admin";

    const menu = mount(client, ADMIN);
    const page = mount(client, ADMIN);
    expect(await settle(menu)).toEqual(ANSWERS.user_admin);
    expect(await settle(page)).toEqual(ANSWERS.user_admin);
    expect(calledPaths()).toEqual(["/api/timeline/access"]);

    vi.setSystemTime(Date.now() + 6 * 60 * 60_000);
    const later = mount(client, ADMIN);
    expect(await settle(later)).toEqual(ANSWERS.user_admin);
    expect(fetchStub).toHaveBeenCalledTimes(1);

    for (const { unmount } of [menu, page, later]) unmount();
  });

  it("keys the answer by user, so the next account in the tab gets its own read", async () => {
    const client = appClient();
    cookieOf = "user_admin";
    expect(await settle(mount(client, ADMIN))).toEqual(ANSWERS.user_admin);

    cookieOf = "user_reader";
    expect(await settle(mount(client, READER))).toEqual(ANSWERS.user_reader);
    expect(fetchStub).toHaveBeenCalledTimes(2);

    const adminKey = timelineAccessQuery(ADMIN).queryKey;
    const readerKey = timelineAccessQuery(READER).queryKey;
    expect(adminKey).not.toEqual(readerKey);
    for (const key of [adminKey, readerKey]) {
      expect(key.slice(0, getGetTimelineAccessQueryKey().length)).toEqual([...getGetTimelineAccessQueryKey()]);
    }
    expect(client.getQueryData(adminKey)).toEqual(ANSWERS.user_admin);
    expect(client.getQueryData(readerKey)).toEqual(ANSWERS.user_reader);
  });
});

describe("what the doors are told", () => {
  it("waits while Clerk loads, and has nothing for a signed-out visitor", () => {
    expect(timelineAccessView(LOADING, undefined, true)).toEqual({
      access: false,
      source: null,
      hasPersonalReport: false,
      ask: null,
      loading: true,
    });
    expect(timelineAccessView(SIGNED_OUT, undefined, true)).toEqual({
      access: false,
      source: null,
      hasPersonalReport: false,
      ask: null,
      loading: false,
    });
  });

  it("waits for a signed-in reader's answer, then passes it on whole", () => {
    expect(timelineAccessView(ADMIN, undefined, true)).toMatchObject({ access: false, loading: true });
    expect(timelineAccessView(ADMIN, ANSWERS.user_admin, false)).toEqual({ ...ANSWERS.user_admin, loading: false });
    expect(timelineAccessView(READER, ANSWERS.user_reader, false)).toEqual({ ...ANSWERS.user_reader, loading: false });
  });

  it("opens nothing when the read failed", () => {
    expect(timelineAccessView(ADMIN, undefined, false)).toEqual({
      access: false,
      source: null,
      hasPersonalReport: false,
      ask: null,
      loading: false,
    });
  });
});
