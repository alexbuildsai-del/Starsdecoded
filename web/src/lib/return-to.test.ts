import { describe, expect, it } from "vitest";
import { RETURN_TO_KEY, keepReturnTo, returnPathFor, safeReturnTo, takeReturnTo, type ReturnToStore } from "./return-to";

// sessionStorage's three calls over a Map: no jsdom here (MB-47).
function memoryStore(stored?: string): ReturnToStore & { raw: () => string | null } {
  const data = new Map<string, string>();
  if (stored !== undefined) data.set(RETURN_TO_KEY, stored);
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
    raw: () => data.get(RETURN_TO_KEY) ?? null,
  };
}

const refusing: ReturnToStore = {
  getItem: () => { throw new Error("denied"); },
  setItem: () => { throw new Error("denied"); },
  removeItem: () => { throw new Error("denied"); },
};

const asking = (path: string) => `?return_to=${encodeURIComponent(path)}`;

// Clerk's later steps keep only its own redirect parameters (Round start 3(c)), so their address has no return_to.
const LATER_STEP = "";

const ELSEWHERE = [
  "//evil.example",
  "///evil.example",
  "/\\evil.example",
  "\\\\evil.example",
  "https://evil.example/dashboard",
  "javascript:alert(1)",
  "/\t/evil.example",
  "/\n/evil.example",
  "/..//evil.example",
  "dashboard",
  "",
];

describe("where a sign-in lands (reading 1, QA-06 #1)", () => {
  it("is the page that asked, through the emailed code's /sign-in/factor-one", () => {
    const store = memoryStore();
    const opened = asking("/dashboard/account");
    expect(returnPathFor(opened, store)).toBe("/dashboard/account");
    keepReturnTo(opened, store);
    expect(store.raw()).toBe("/dashboard/account");

    keepReturnTo(LATER_STEP, store);
    expect(returnPathFor(LATER_STEP, store)).toBe("/dashboard/account");
  });

  it("keeps checkout's own query whole through /sign-up/verify-email-address", () => {
    const store = memoryStore();
    const checkout = "/checkout?item=couple&returnTo=%2Fdashboard";
    keepReturnTo(asking(checkout), store);
    keepReturnTo(LATER_STEP, store);
    expect(returnPathFor(LATER_STEP, store)).toBe(checkout);
  });

  it("is used once: taking it lets it go, so the next sign-in that asks for nothing lands on /dashboard", () => {
    const store = memoryStore();
    keepReturnTo(asking("/report/r-1"), store);
    expect(takeReturnTo(store)).toBe("/report/r-1");
    expect(store.raw()).toBeNull();
    expect(takeReturnTo(store)).toBe("/dashboard");
    expect(returnPathFor(LATER_STEP, store)).toBe("/dashboard");
  });

  it("is /dashboard when the page asked for none", () => {
    expect(returnPathFor("", memoryStore())).toBe("/dashboard");
    expect(returnPathFor("?redirect_url=%2Fchart", memoryStore())).toBe("/dashboard");
  });

  it("is /dashboard for //host, a scheme or a backslash, and lets go of an earlier sign-in's path", () => {
    for (const path of ELSEWHERE) {
      const store = memoryStore("/checkout?item=single");
      expect(returnPathFor(asking(path), store), JSON.stringify(path)).toBe("/dashboard");
      keepReturnTo(asking(path), store);
      expect(store.raw(), JSON.stringify(path)).toBeNull();
      expect(returnPathFor(LATER_STEP, store), JSON.stringify(path)).toBe("/dashboard");
    }
  });

  it("reads a kept value that is not a path of this site as /dashboard", () => {
    expect(returnPathFor(LATER_STEP, memoryStore("//evil.example"))).toBe("/dashboard");
    expect(takeReturnTo(memoryStore("https://evil.example"))).toBe("/dashboard");
  });

  it("still lands where the address asked when the browser refuses storage", () => {
    expect(() => keepReturnTo(asking("/dashboard/account"), refusing)).not.toThrow();
    expect(returnPathFor(asking("/dashboard/account"), refusing)).toBe("/dashboard/account");
    expect(returnPathFor(LATER_STEP, refusing)).toBe("/dashboard");
    expect(takeReturnTo(refusing)).toBe("/dashboard");
    expect(returnPathFor(LATER_STEP, null)).toBe("/dashboard");
  });

  it("is kept under the tab's one key", () => {
    expect(RETURN_TO_KEY).toBe("sd.return_to");
  });
});

describe("a path of this site", () => {
  it("is kept as it was written, query and fragment included", () => {
    for (const path of ["/dashboard", "/dashboard/account", "/checkout?item=couple&returnTo=%2Fdashboard", "/claim?token=abc.def&claim=1", "/report/r-1#chapter-2"]) {
      expect(safeReturnTo(path)).toBe(path);
    }
  });

  it("is never another site's address, however it is written", () => {
    for (const path of ELSEWHERE) expect(safeReturnTo(path), JSON.stringify(path)).toBeNull();
  });

  it("is a string", () => {
    for (const value of [null, undefined, 42, {}, ["/dashboard"]]) expect(safeReturnTo(value)).toBeNull();
  });
});
