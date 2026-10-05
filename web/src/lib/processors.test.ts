import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { NOT_NOW_KEY } from "@/lib/teaser-view";
import { BROWSER_KEYS, PAYMENTS, PROCESSORS, STRIPE_COOKIES, US_TRANSFER, storageKeyOf, whereLine } from "@/lib/processors";

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

  it("names no analytics or font service, and no payments company: Stripe takes payments for itself, not for us", () => {
    const words = JSON.stringify(PROCESSORS).toLowerCase();
    for (const absent of ["stripe", "analytics", "google", "font"]) expect(words).not.toContain(absent);
  });

  it("says Supabase holds what you buy and Resend sends its receipt", () => {
    const does = (name: string) => PROCESSORS.find((p) => p.name === name)?.does ?? "";
    expect(does("Supabase")).toContain("what you buy");
    expect(does("Resend")).toContain("a receipt for what you buy");
  });
});

describe("who takes a payment", () => {
  it("is Stripe, through its company in the EU, apart from the companies that work for us (QA-04 #2, R-3.5)", () => {
    expect(PAYMENTS).toEqual({
      name: "Stripe",
      company: "Stripe Payments Europe",
      country: "Ireland",
      policy: "https://stripe.com/privacy",
    });
    expect(PROCESSORS.map((p) => p.name)).not.toContain(PAYMENTS.name);
  });

  it("names the cookies Stripe's fields set at checkout, each with how long it lasts", () => {
    expect(STRIPE_COOKIES.map((cookie) => [cookie.name, cookie.lasts])).toEqual([
      ["__stripe_mid", "a year"],
      ["__stripe_sid", "30 minutes"],
    ]);
    const ours = BROWSER_KEYS.map(storageKeyOf);
    for (const cookie of STRIPE_COOKIES) expect(ours, cookie.name).not.toContain(cookie.name);
  });
});

describe("what the browser keeps", () => {
  it("names every storage key the web writes, and none it doesn't", () => {
    expect(BROWSER_KEYS.map(storageKeyOf).sort()).toEqual(keysWritten());
  });

  it("names no note of which dashboard suggestions were seen: nothing writes one since those nudges left (MB-136)", () => {
    expect(BROWSER_KEYS.map(storageKeyOf)).not.toContain("sd.nudge.seen");
  });

  it("keeps the birth form's draft, the offer link's code and the preview for the tab alone (readings 3 and 14)", () => {
    const store = (name: string) => BROWSER_KEYS.find((key) => key.name === name)?.store;
    expect(store("sd.form.draft")).toBe("tab");
    expect(store("sd.campaign")).toBe("tab");
    expect(store("sd.prelaunch.preview")).toBe("tab");
  });

  it("says the birth form's draft now waits through checkout too, and goes once the form reads it", () => {
    const draft = BROWSER_KEYS.find((key) => key.name === "sd.form.draft")?.holds ?? "";
    expect(draft).toContain("after you sign in or pay");
    expect(draft).toContain("deleted as soon as the birth form reads them");
  });

  it("keeps an offer's code only for a visitor that offer's link brought", () => {
    const offer = BROWSER_KEYS.find((key) => key.name === "sd.campaign")?.holds ?? "";
    expect(offer).toMatch(/^Only when a link with an offer brought you: /);
    expect(offer).not.toMatch(/birth|name|email/i);
  });

  it("keeps Not now on the dashboard's big cycles until the reader clears it, and says when they come back (reading 26)", () => {
    const notNow = BROWSER_KEYS.find((key) => key.name === "sd.timeline.notnow");
    expect(notNow?.store).toBe("kept");
    expect(notNow?.holds).toContain("Not now");
    expect(notNow?.holds).toContain("under a year away");
  });

  it("reads a per-report key without the part each report fills in", () => {
    expect(storageKeyOf({ name: "sd.marks.<report id>", store: "kept", holds: "" })).toBe("sd.marks.");
    expect(storageKeyOf({ name: "sd.form.draft", store: "tab", holds: "" })).toBe("sd.form.draft");
  });

  it("lists Not now's key once, under the name the code writes, in the browser's kept storage and not the tab's", () => {
    expect(NOT_NOW_KEY).toBe("sd.timeline.notnow");
    const listed = BROWSER_KEYS.filter((key) => storageKeyOf(key) === NOT_NOW_KEY);
    expect(listed).toHaveLength(1);
    expect(listed[0].store).toBe("kept");
  });

  it("lists no key twice, and gives each one a full sentence of what it holds", () => {
    const names = BROWSER_KEYS.map(storageKeyOf);
    expect(new Set(names).size).toBe(names.length);
    for (const key of BROWSER_KEYS) expect(key.holds, key.name).toMatch(/^[A-Z].*[.]$/);
  });

  it("says nothing of the chart, a name or a birth date for what Not now keeps", () => {
    const holds = BROWSER_KEYS.find((key) => storageKeyOf(key) === NOT_NOW_KEY)!.holds;
    expect(holds).not.toMatch(/birth|name|chart|age\b|price/i);
  });
});
