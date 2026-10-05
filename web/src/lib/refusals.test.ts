import { describe, expect, it } from "vitest";
import { isNoCredit, openingTime, refusalLine } from "@/lib/refusals";

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

  it("shows the sign-in refusal as given", () => {
    const line = "Sign in to write a report.";
    expect(refusalLine({ status: 401, data: { error: "sign_in_required", message: line } }, NOW)).toBe(line);
    expect(refusalLine({ status: 401, data: { error: "sign_in_required" } }, NOW)).toBeNull();
  });

  it("shows the no-credit line as given, and isNoCredit tells it apart", () => {
    const line = "You have no credits left. Get credits to write this report.";
    const error = { status: 402, data: { error: "no_credit", message: line } };
    expect(refusalLine(error, NOW)).toBe(line);
    expect(isNoCredit(error)).toBe(true);
    expect(refusalLine({ status: 402, data: { error: "no_credit" } }, NOW)).toBeNull();
    expect(isNoCredit({ status: 402, data: { error: "no_credit" } })).toBe(true);
    for (const other of [refusal({ error: "rate_limited", message: HOUR_LINE }), { status: 503, data: { error: "paused", message: PAUSED } }, new Error("boom"), null, undefined]) {
      expect(isNoCredit(other)).toBe(false);
    }
  });

  it("gives null for every other error", () => {
    expect(refusalLine(refusal({ error: "validation_error", message: "Bad name" }), NOW)).toBeNull();
    expect(refusalLine(new Error("boom"), NOW)).toBeNull();
    expect(refusalLine({ status: 500, data: null }, NOW)).toBeNull();
    expect(refusalLine(undefined, NOW)).toBeNull();
    expect(refusalLine(refusal({ error: "paused" }), NOW)).toBeNull();
  });

  it("ignores a pause's seconds and keeps its line untouched", () => {
    const line = refusalLine({ status: 503, data: { error: "paused", message: PAUSED, retryAfterSeconds: 900 } }, NOW);
    expect(line).toBe(PAUSED);
  });

  it("gives null for a refusal code it does not own, or a message that is empty or not text", () => {
    expect(refusalLine(refusal({ error: "forbidden", message: HOUR_LINE, retryAfterSeconds: 900 }), NOW)).toBeNull();
    expect(refusalLine(refusal({ error: "rate_limited", message: "" }), NOW)).toBeNull();
    expect(refusalLine(refusal({ error: "rate_limited", message: 42 }), NOW)).toBeNull();
    expect(refusalLine(refusal({ message: HOUR_LINE }), NOW)).toBeNull();
    expect(refusalLine(refusal("rate_limited"), NOW)).toBeNull();
    expect(refusalLine(null, NOW)).toBeNull();
  });

  it("keeps the API's line when the seconds are zero, negative, not finite or not a number and no header helps", () => {
    for (const retryAfterSeconds of [0, -5, Number.NaN, Number.POSITIVE_INFINITY, "900", null]) {
      expect(refusalLine(refusal({ error: "rate_limited", message: HOUR_LINE, retryAfterSeconds }), NOW), String(retryAfterSeconds)).toBe(HOUR_LINE);
    }
  });

  it("falls back to the header when the body's seconds are unusable, and ignores a header that is not a positive number", () => {
    const body = { error: "rate_limited", message: HOUR_LINE, retryAfterSeconds: 0 };
    expect(refusalLine(refusal(body, { "Retry-After": "600" }), NOW)).toContain(openingTime(600, NOW));
    for (const header of ["0", "-30", "soon", "Wed, 21 Oct 2026 07:28:00 GMT", ""]) {
      expect(refusalLine(refusal(body, { "Retry-After": header }), NOW), header).toBe(HOUR_LINE);
    }
  });

  it("prefers the body's seconds over the header", () => {
    const line = refusalLine(refusal({ error: "rate_limited", message: HOUR_LINE, retryAfterSeconds: 900 }, { "Retry-After": "7200" }), NOW);
    expect(line).toContain(openingTime(900, NOW));
  });

  it("reads a response whose headers are missing or unreadable", () => {
    const body = { error: "rate_limited", message: HOUR_LINE };
    expect(refusalLine({ status: 429, data: body }, NOW)).toBe(HOUR_LINE);
    expect(refusalLine({ status: 429, data: body, headers: {} }, NOW)).toBe(HOUR_LINE);
  });

  it("restates a day window the same way as an hour", () => {
    const line = refusalLine(refusal({ error: "rate_limited", message: DAY_LINE, retryAfterSeconds: 1800 }), NOW);
    expect(line).toBe(`We've had 20 reports from your internet connection in the last day. You can start the next one ${openingTime(1800, NOW)}.`);
    expect(line).not.toContain("within a day");
  });

  it("restates only a closing window, and spans a message of two lines", () => {
    const mid = "You can retry within the hour, or write to us. Thanks.";
    expect(refusalLine(refusal({ error: "rate_limited", message: mid, retryAfterSeconds: 900 }), NOW)).toBe(mid);
    const two = "Line one.\nYou can start the next one within the hour.";
    expect(refusalLine(refusal({ error: "rate_limited", message: two, retryAfterSeconds: 900 }), NOW)).toBe(`Line one.\nYou can start the next one ${openingTime(900, NOW)}.`);
  });
});

describe("openingTime", () => {
  const clock = (d: Date) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  it("does not round a time already on the minute, and rounds any second past it up", () => {
    const onMinute = new Date(2026, 9, 1, 14, 0, 0);
    expect(openingTime(300, onMinute)).toBe(`at ${clock(new Date(2026, 9, 1, 14, 5))}`);
    expect(openingTime(300.5, onMinute)).toBe(`at ${clock(new Date(2026, 9, 1, 14, 6))}`);
  });

  it("is today up to the last minute of the day and tomorrow from midnight", () => {
    const evening = new Date(2026, 9, 1, 23, 0, 0);
    expect(openingTime(59 * 60, evening)).toBe(`at ${clock(new Date(2026, 9, 1, 23, 59))}`);
    expect(openingTime(60 * 60, evening)).toBe(`tomorrow at ${clock(new Date(2026, 9, 2, 0, 0))}`);
  });
});
