import { describe, expect, it } from "vitest";
import {
  WAITLIST_CLOSED_LINE, WAITLIST_CONSENT, WAITLIST_CONSENT_TEXT, confirmFailure, confirmedWithin, csvCell, isConfirmed, joinFailure,
  looksLikeEmail, readUtm, sourceTag, waitlistCounts, waitlistCsv, waitlistOpen, type WaitlistSignup,
} from "@/lib/waitlist";

const row = (over: Partial<WaitlistSignup>): WaitlistSignup => ({
  id: "1",
  email: "ada@example.com",
  consent: "launch-email-v2",
  source: "hero",
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  utmContent: null,
  createdAt: "2026-09-26T10:00:00.000Z",
  confirmedAt: "2026-09-26T10:05:00.000Z",
  ...over,
});

describe("the form's own check", () => {
  it("passes an address and stops a slip", () => {
    expect(looksLikeEmail(" ada@example.com ")).toBe(true);
    expect(looksLikeEmail("ada@example")).toBe(false);
    expect(looksLikeEmail("ada example.com")).toBe(false);
    expect(looksLikeEmail("")).toBe(false);
  });

  it("reads the campaign tags from the address bar, the post's among them", () => {
    expect(readUtm("?utm_source=chatgpt.com&utm_campaign=spring&utm_content=post-12")).toEqual({
      utmSource: "chatgpt.com", utmMedium: undefined, utmCampaign: "spring", utmContent: "post-12",
    });
    expect(readUtm("")).toEqual({ utmSource: undefined, utmMedium: undefined, utmCampaign: undefined, utmContent: undefined });
  });

  it("keeps a tag to the contract's 100 characters and drops a blank one", () => {
    expect(readUtm(`?utm_content=${"x".repeat(150)}`).utmContent).toHaveLength(100);
    expect(readUtm("?utm_content=%20%20").utmContent).toBeUndefined();
  });

  it("trims a source and cuts it to the contract's 32 characters", () => {
    expect(sourceTag(" sky-screen ")).toBe("sky-screen");
    expect(sourceTag("x".repeat(40))).toHaveLength(32);
  });
});

describe("the double opt-in wording", () => {
  it("sends the key for it, and its sentence says what confirming and joining mean", () => {
    expect(WAITLIST_CONSENT).toBe("launch-email-v2");
    expect(WAITLIST_CONSENT_TEXT).toContain("link to confirm your email");
    expect(WAITLIST_CONSENT_TEXT).toContain("tell you when Stars Decoded launches");
    expect(WAITLIST_CONSENT_TEXT).not.toMatch(/\bopen/i);
    expect(WAITLIST_CONSENT_TEXT).toContain("delete your email at any time");
  });

  it("holds the house punctuation in both lines: no em dash, semicolon or exclamation mark", () => {
    expect(WAITLIST_CONSENT_TEXT).not.toMatch(/[—–;!]/);
    expect(WAITLIST_CLOSED_LINE).not.toMatch(/[—–;!]/);
  });
});

describe("who can join", () => {
  it("shuts production until the privacy page names a contact, and never shuts the rest", () => {
    expect(waitlistOpen("production", false)).toBe(false);
    expect(waitlistOpen("production", true)).toBe(true);
    expect(waitlistOpen("staging", false)).toBe(true);
    expect(waitlistOpen("development", false)).toBe(true);
  });
});

describe("what a refused join means", () => {
  it("reads the API's status as the reader's next step", () => {
    expect(joinFailure({ status: 400 })).toBe("bad_email");
    expect(joinFailure({ status: 429 })).toBe("rate_limited");
    expect(joinFailure({ status: 500 })).toBe("retry");
    expect(joinFailure(new TypeError("Failed to fetch"))).toBe("retry");
    expect(joinFailure(null)).toBe("retry");
  });

  it("calls a 503 closed only when it says waitlist_closed", () => {
    expect(joinFailure({ status: 503, data: { error: "waitlist_closed" } })).toBe("closed");
    expect(joinFailure({ status: 503, data: null })).toBe("retry");
    expect(joinFailure({ status: 503, data: "Service Unavailable" })).toBe("retry");
  });

  it("tells a link the API does not know from a call that might work in a minute", () => {
    expect(confirmFailure({ status: 404 })).toBe("unknown_link");
    expect(confirmFailure({ status: 400 })).toBe("unknown_link");
    expect(confirmFailure({ status: 429 })).toBe("retry");
    expect(confirmFailure({ status: 502 })).toBe("retry");
    expect(confirmFailure(new TypeError("Failed to fetch"))).toBe("retry");
  });
});

describe("the export", () => {
  it("keeps a would-be formula as text and quotes what needs it", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("+1@example.com")).toBe("'+1@example.com");
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    expect(csvCell(null)).toBe("");
  });

  it("writes a header and a line per address, a pending one with no confirmed_at", () => {
    const csv = waitlistCsv([
      row({ utmSource: "chatgpt.com", utmContent: "post-12" }),
      row({ id: "2", email: "grace@example.com", confirmedAt: null }),
    ]);
    expect(csv).toBe(
      "email,joined_at,confirmed_at,form,utm_source,utm_medium,utm_campaign,utm_content,consent\r\n" +
        "ada@example.com,2026-09-26T10:00:00.000Z,2026-09-26T10:05:00.000Z,hero,chatgpt.com,,,post-12,launch-email-v2\r\n" +
        "grace@example.com,2026-09-26T10:00:00.000Z,,hero,,,,,launch-email-v2\r\n",
    );
  });
});

describe("the list's numbers", () => {
  const now = new Date("2026-09-26T12:00:00.000Z");
  const rows = [
    row({ id: "a", confirmedAt: "2026-09-26T11:00:00.000Z" }),
    row({ id: "b", confirmedAt: "2026-09-20T11:00:00.000Z" }),
    row({ id: "c", confirmedAt: "2026-09-01T00:00:00.000Z" }),
    row({ id: "d", createdAt: "2026-09-26T11:30:00.000Z", confirmedAt: null }),
  ];

  it("counts an address as joined from the day it was confirmed, not the day it was typed", () => {
    expect(confirmedWithin(rows, 1, now)).toBe(1);
    expect(confirmedWithin(rows, 7, now)).toBe(2);
  });

  it("splits the list into confirmed and pending", () => {
    expect(isConfirmed(rows[0])).toBe(true);
    expect(isConfirmed(rows[3])).toBe(false);
    expect(waitlistCounts(rows, now)).toEqual({ confirmed: 3, pending: 1, day: 1, week: 2 });
    expect(waitlistCounts([], now)).toEqual({ confirmed: 0, pending: 0, day: 0, week: 0 });
  });
});
