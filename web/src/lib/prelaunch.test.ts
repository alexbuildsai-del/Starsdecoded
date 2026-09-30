import { describe, expect, it } from "vitest";
import {
  OPEN_BEFORE_LAUNCH, PRELAUNCH, PREVIEW_KEY, onPreviewChange, previewFlag, setPreview, withoutPreview,
  type PreviewStore,
} from "./prelaunch";

// sessionStorage's three calls over a Map: no jsdom here (MB-47).
function memoryStore(stored?: string): PreviewStore & { raw: () => string | null } {
  const data = new Map<string, string>();
  if (stored !== undefined) data.set(PREVIEW_KEY, stored);
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
    raw: () => data.get(PREVIEW_KEY) ?? null,
  };
}

const refusing: PreviewStore = {
  getItem: () => { throw new Error("denied"); },
  setItem: () => { throw new Error("denied"); },
  removeItem: () => { throw new Error("denied"); },
};

describe("who is gated before launch", () => {
  it("is nobody off production: a test run is a local build", () => {
    expect(PRELAUNCH).toBe(false);
  });

  it("leaves a visitor only the admin's way in among the app's routes", () => {
    for (const path of ["/sign-in", "/sign-in/factor-one", "/admin", "/admin/waitlist", "/admin/report-lab"]) {
      expect(OPEN_BEFORE_LAUNCH.test(path)).toBe(true);
    }
    for (const path of ["/", "/chart", "/sign-up", "/dashboard", "/report/abc", "/claim", "/privacy", "/waitlist", "/administrator", "/sign-inside"]) {
      expect(OPEN_BEFORE_LAUNCH.test(path)).toBe(false);
    }
  });
});

describe("the prelaunch preview", () => {
  it("turns on with ?prelaunch=1 and stays on for the tab without it", () => {
    const store = memoryStore();
    expect(previewFlag("?prelaunch=1", store)).toBe(true);
    expect(store.raw()).toBe("1");
    expect(previewFlag("", store)).toBe(true);
    expect(previewFlag("?utm_source=chatgpt.com", store)).toBe(true);
  });

  it("turns off with ?prelaunch=0, and is off in a fresh tab", () => {
    const store = memoryStore("1");
    expect(previewFlag("?utm_source=x&prelaunch=0", store)).toBe(false);
    expect(store.raw()).toBeNull();
    expect(previewFlag("", store)).toBe(false);
    expect(previewFlag("", memoryStore())).toBe(false);
  });

  it("reads any other value of the parameter as no word at all", () => {
    expect(previewFlag("?prelaunch=yes", memoryStore("1"))).toBe(true);
    expect(previewFlag("?prelaunch=", memoryStore())).toBe(false);
  });

  it("holds for the page view where the browser refuses storage, and costs nothing on the server", () => {
    expect(previewFlag("?prelaunch=1", refusing)).toBe(true);
    expect(previewFlag("", refusing)).toBe(false);
    expect(previewFlag("?prelaunch=1", null)).toBe(true);
    expect(previewFlag("", null)).toBe(false);
    expect(previewFlag()).toBe(false);
  });

  it("is set and cleared by setPreview, which tells every reader until it unsubscribes", () => {
    const store = memoryStore();
    const heard: boolean[] = [];
    const stop = onPreviewChange((on) => heard.push(on));
    setPreview(true, store);
    expect(store.raw()).toBe("1");
    setPreview(false, store);
    expect(store.raw()).toBeNull();
    stop();
    setPreview(true, store);
    expect(heard).toEqual([true, false]);
    expect(() => setPreview(false, refusing)).not.toThrow();
  });

  it("drops only its own parameter from the address on Exit", () => {
    expect(withoutPreview("?prelaunch=1")).toBe("");
    expect(withoutPreview("?utm_source=x&prelaunch=1&utm_medium=y")).toBe("?utm_source=x&utm_medium=y");
    expect(withoutPreview("?utm_source=x")).toBe("?utm_source=x");
    expect(withoutPreview("")).toBe("");
  });
});
