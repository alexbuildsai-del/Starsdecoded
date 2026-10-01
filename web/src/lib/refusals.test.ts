import { describe, expect, it } from "vitest";
import { openingTime, refusalLine } from "@/lib/refusals";

const HOUR_LINE = "You've started 6 reports in the last hour. You can start the next one within the hour.";
const DAY_LINE = "We've had 20 reports from your internet connection in the last day. You can start the next one within a day.";
const MINUTE_LINE = "We've had 60 place searches from your internet connection in the last minute. Try again in a minute.";
const PAUSED = "New reports are paused for now. Your credit hasn't been used. Please try again later.";

const NOW = new Date(2026, 9, 1, 14, 5, 30);

function refusal(data: unknown, headers: Record<string, string> = {}) {
  return { status: 429, data, headers: new Headers(headers) };
}

describe("refusalLine", () => {
  it("turns the seconds into the reader's own time, keeping the first sentence", () => {
    const line = refusalLine(refusal({ error: "rate_limited", message: HOUR_LINE, retryAfterSeconds: 900 }), NOW);
    expect(line).toBe(`You've started 6 reports in the last hour. You can start the next one ${openingTime(900, NOW)}.`);
    expect(openingTime(900, NOW)).toMatch(/^at /);
  });

  it("rounds up to the minute and names tomorrow past midnight", () => {
    expect(openingTime(1, NOW)).toBe(`at ${new Date(2026, 9, 1, 14, 6).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`);
    expect(openingTime(12 * 3600, NOW)).toMatch(/^tomorrow at /);
    expect(refusalLine(refusal({ error: "rate_limited", message: DAY_LINE, retryAfterSeconds: 12 * 3600 }), NOW)).toMatch(
      /You can start the next one tomorrow at .+\.$/,
    );
  });

  it("reads the Retry-After header when the body has no seconds", () => {
    const line = refusalLine(refusal({ error: "rate_limited", message: HOUR_LINE }, { "Retry-After": "600" }), NOW);
    expect(line).toContain(openingTime(600, NOW));
    expect(line).not.toContain("within the hour");
  });

  it("shows the API's line as written with no seconds, or for a window it does not restate", () => {
    expect(refusalLine(refusal({ error: "rate_limited", message: HOUR_LINE }), NOW)).toBe(HOUR_LINE);
    expect(refusalLine(refusal({ error: "rate_limited", message: MINUTE_LINE, retryAfterSeconds: 30 }), NOW)).toBe(MINUTE_LINE);
  });

  it("shows the pause as given", () => {
    expect(refusalLine({ status: 503, data: { error: "paused", reason: "paused", message: PAUSED } }, NOW)).toBe(PAUSED);
  });

  it("gives null for every other error", () => {
    expect(refusalLine(refusal({ error: "validation_error", message: "Bad name" }), NOW)).toBeNull();
    expect(refusalLine(new Error("boom"), NOW)).toBeNull();
    expect(refusalLine({ status: 500, data: null }, NOW)).toBeNull();
    expect(refusalLine(undefined, NOW)).toBeNull();
    expect(refusalLine(refusal({ error: "paused" }), NOW)).toBeNull();
  });
});
