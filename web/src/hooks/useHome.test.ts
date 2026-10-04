/**
 * GET /home's one hook (R16 re-pin 17): every caller sends the same `{ tz }` under the one key they share, so a refetch
 * from any of them keeps Your week in the reader's zone. The generated hook is stood in for, so no React renders.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { getGetHomeQueryKey, getGetHomeUrl } from "@workspace/api-client-react";
import { sentZone } from "@/lib/reader-zone";
import { homeParams, useHome } from "./useHome";

const WEB_SRC = fileURLToPath(new URL("..", import.meta.url));

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sources(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

const { calls } = vi.hoisted(() => ({ calls: [] as Array<[unknown, { query: Record<string, unknown> }]> }));

vi.mock("@workspace/api-client-react", async (importOriginal) => {
  const real = await importOriginal<typeof import("@workspace/api-client-react")>();
  return {
    ...real,
    useGetHome: (params: unknown, options: { query: Record<string, unknown> }) => {
      calls.push([params, options]);
      return { data: undefined };
    },
  };
});

describe("GET /home's params", () => {
  it("send the zone the browser names, or no zone at all, so the server reads the birth place's", () => {
    expect(homeParams("Asia/Tokyo")).toEqual({ tz: "Asia/Tokyo" });
    expect(homeParams(undefined)).toEqual({});
    expect(getGetHomeUrl(homeParams("America/Sao_Paulo"))).toBe("/api/home?tz=America%2FSao_Paulo");
    expect(getGetHomeUrl(homeParams(undefined))).toBe("/api/home");
  });
});

describe("useHome", () => {
  it("gives the dashboard, its rows, the delete dialog and Timeline's page the same params, under the one shared key", () => {
    calls.length = 0;
    useHome();
    useHome();
    useHome({ enabled: false });
    useHome({ enabled: true });
    expect(calls).toHaveLength(4);
    for (const [params, options] of calls) {
      expect(params).toEqual(homeParams(sentZone()));
      expect(options.query.queryKey).toEqual(getGetHomeQueryKey());
    }
    expect(calls.map(([, options]) => options.query.enabled)).toEqual([undefined, undefined, false, true]);
  });

  it("is the one reader of GET /home: no other file calls the generated hook, so none sends a zone of its own", () => {
    const direct = sources(WEB_SRC)
      .filter((file) => relative(WEB_SRC, file) !== join("hooks", "useHome.ts"))
      .filter((file) => /\buseGetHome\b/.test(readFileSync(file, "utf8")))
      .map((file) => relative(WEB_SRC, file));
    expect(direct).toEqual([]);
  });

  it("is the one key: no file builds GET /home's key with params, which would split the cache the callers share", () => {
    const withParams = sources(WEB_SRC)
      .filter((file) => /getGetHomeQueryKey\(\s*[^\s)]/.test(readFileSync(file, "utf8")))
      .map((file) => relative(WEB_SRC, file));
    expect(withParams).toEqual([]);
    expect(getGetHomeQueryKey()).toEqual(["/api/home"]);
  });

  it("keeps the key whatever zone is sent, so a refetch from any caller lands on the one cache entry", () => {
    expect(getGetHomeQueryKey()).toEqual(getGetHomeQueryKey());
    for (const zone of ["Asia/Tokyo", undefined]) expect(homeParams(zone)).toEqual(zone ? { tz: zone } : {});
    expect(homeParams("")).toEqual({});
  });

  it("passes the query options on without losing the key: a caller can only switch the read off or on", () => {
    calls.length = 0;
    useHome({ enabled: false });
    expect(calls[0][1].query).toEqual({ queryKey: getGetHomeQueryKey(), enabled: false });
  });
});
