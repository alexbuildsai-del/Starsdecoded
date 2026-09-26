import { describe, expect, it } from "vitest";
import { csvCell, joinedWithin, looksLikeEmail, readUtm, waitlistCsv, type WaitlistSignup } from "@/lib/waitlist";

const row = (over: Partial<WaitlistSignup>): WaitlistSignup => ({
  id: "1",
  email: "ada@example.com",
  consent: "launch-email-v1",
  source: "hero",
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  createdAt: "2026-09-26T10:00:00.000Z",
  ...over,
});

describe("the form's own check", () => {
  it("passes an address and stops a slip", () => {
    expect(looksLikeEmail(" ada@example.com ")).toBe(true);
    expect(looksLikeEmail("ada@example")).toBe(false);
    expect(looksLikeEmail("ada example.com")).toBe(false);
    expect(looksLikeEmail("")).toBe(false);
  });

  it("reads the campaign tags from the address bar", () => {
    expect(readUtm("?utm_source=chatgpt.com&utm_campaign=spring")).toEqual({ utmSource: "chatgpt.com", utmMedium: undefined, utmCampaign: "spring" });
    expect(readUtm("")).toEqual({ utmSource: undefined, utmMedium: undefined, utmCampaign: undefined });
  });
});

describe("the export", () => {
  it("keeps a would-be formula as text and quotes what needs it", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("+1@example.com")).toBe("'+1@example.com");
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    expect(csvCell(null)).toBe("");
  });

  it("writes a header and a line per address", () => {
    const csv = waitlistCsv([row({ utmSource: "chatgpt.com" })]);
    expect(csv).toBe(
      "email,joined_at,form,utm_source,utm_medium,utm_campaign,consent\r\n" +
        "ada@example.com,2026-09-26T10:00:00.000Z,hero,chatgpt.com,,,launch-email-v1\r\n",
    );
  });

  it("counts who joined in the last days", () => {
    const now = new Date("2026-09-26T12:00:00.000Z");
    const rows = [row({ createdAt: "2026-09-26T11:00:00.000Z" }), row({ createdAt: "2026-09-20T11:00:00.000Z" }), row({ createdAt: "2026-09-01T00:00:00.000Z" })];
    expect(joinedWithin(rows, 1, now)).toBe(1);
    expect(joinedWithin(rows, 7, now)).toBe(2);
  });
});
