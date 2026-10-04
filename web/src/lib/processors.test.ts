import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BROWSER_KEYS, PROCESSORS, US_TRANSFER, storageKeyOf, whereLine } from "@/lib/processors";

const WEB_SRC = fileURLToPath(new URL("..", import.meta.url));
const THIS_LIST = fileURLToPath(new URL("./processors.ts", import.meta.url));

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

// Every quoted key under the app's `sd.` prefix; a key built per report ends at its dot, as `sd.marks.${id}` does.
const KEY = /["'`](sd\.[a-z]+(?:\.[a-z]+)*\.?)/g;

function keysWritten(): string[] {
  const found = new Set<string>();
  for (const file of sourceFiles(WEB_SRC)) {
    if (file === THIS_LIST) continue;
    for (const match of readFileSync(file, "utf8").matchAll(KEY)) found.add(match[1]);
  }
  return [...found].sort();
}

describe("who handles a visitor's data", () => {
  it("lists ADR-145's six in its order, then Nominatim, which our servers ask for a place, and no time zone service (ADR-246)", () => {
    expect(PROCESSORS.map((p) => [p.name, p.from])).toEqual([
      ["Supabase", "server"],
      ["Railway", "server"],
      ["Vercel", "server"],
      ["OpenAI", "server"],
      ["Clerk", "server"],
      ["Resend", "server"],
      ["Nominatim", "server"],
    ]);
  });

  it("names no service the browser asks itself: the place field asks our servers alone (ADR-246, MB-30)", () => {
    expect(PROCESSORS.filter((p) => p.from === "browser")).toEqual([]);
    expect(JSON.stringify(PROCESSORS).toLowerCase()).not.toContain("timeapi");
  });

  it("gives every company our servers call a confirmed region or its country (reading 10)", () => {
    for (const p of PROCESSORS.filter((row) => row.from === "server")) {
      expect(whereLine(p), p.name).not.toBeNull();
    }
  });

  it("confirms Railway's and Resend's EU West regions and no other yet (ADR-164, MB-33)", () => {
    expect(PROCESSORS.filter((p) => p.region).map((p) => [p.name, whereLine(p)])).toEqual([
      ["Railway", "Stores data in Railway's EU West region"],
      ["Resend", "Stores data in Resend's EU West region, in Ireland"],
    ]);
  });

  it("covers a company in the US with ADR-145's two bases", () => {
    expect(PROCESSORS.some((p) => p.from === "server" && p.country === "the United States")).toBe(true);
    expect(US_TRANSFER).toContain("standard contractual clauses");
    expect(US_TRANSFER).toContain("Data Privacy Framework");
  });

  it("says where each one is, a confirmed region before its country", () => {
    expect(whereLine({ region: "Frankfurt, Germany", country: "the United States" })).toBe("Stores data in Frankfurt, Germany");
    expect(whereLine({ region: null, country: "the United States" })).toBe("Based in the United States");
    expect(whereLine({ region: null, country: null })).toBeNull();
  });

  it("names no payments, analytics or font service: none reaches a visitor yet, or any more", () => {
    const words = JSON.stringify(PROCESSORS).toLowerCase();
    for (const absent of ["stripe", "analytics", "google", "font"]) expect(words).not.toContain(absent);
  });
});

describe("what the browser keeps", () => {
  it("names every storage key the web writes, and none it doesn't", () => {
    expect(BROWSER_KEYS.map(storageKeyOf).sort()).toEqual(keysWritten());
  });

  it("names no note of which dashboard suggestions were seen: nothing writes one since those nudges left (MB-136)", () => {
    expect(BROWSER_KEYS.map(storageKeyOf)).not.toContain("sd.nudge.seen");
  });

  it("keeps the birth form's draft and the preview for the tab alone (readings 3 and 14)", () => {
    const store = (name: string) => BROWSER_KEYS.find((key) => key.name === name)?.store;
    expect(store("sd.form.draft")).toBe("tab");
    expect(store("sd.prelaunch.preview")).toBe("tab");
  });

  it("reads a per-report key without the part each report fills in", () => {
    expect(storageKeyOf({ name: "sd.marks.<report id>", store: "kept", holds: "" })).toBe("sd.marks.");
    expect(storageKeyOf({ name: "sd.form.draft", store: "tab", holds: "" })).toBe("sd.form.draft");
  });
});
