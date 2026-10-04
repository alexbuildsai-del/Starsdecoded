/**
 * The reader's zone on the web (reading 4): the zone the browser names, as the server reads it, sent the same on every
 * request of a visit; and the zone a screen prints days in when the browser names none, which is never one the web
 * picks itself.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { getGetTimelineNowQueryKey } from "@workspace/api-client-react";
import { SERVED_WEEK, browserZone, readableZone, servedZoneRead, shownZone } from "./reader-zone";

const Real = Intl.DateTimeFormat;

/** A browser whose Intl names `zone` as its own, and formats in any zone it is given as the real one does. */
function browserNaming(zone: string | undefined) {
  vi.stubGlobal("Intl", {
    DateTimeFormat: function (locale?: string, options?: Intl.DateTimeFormatOptions) {
      return options?.timeZone === undefined ? { resolvedOptions: () => ({ timeZone: zone }) } : new Real(locale, options);
    },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("a zone the server reads", () => {
  it("is an IANA name Intl formats in, kept as the browser named it", () => {
    for (const zone of ["Europe/Lisbon", "Asia/Tokyo", "America/Argentina/Buenos_Aires", "Pacific/Kiritimati", "Etc/GMT+5", "UTC"]) {
      expect(readableZone(zone)).toBe(zone);
    }
  });

  it("is none for a name Intl refuses, one the server's shape refuses, or anything that is not a name", () => {
    for (const name of ["Etc/Unknown", "Not/AZone", "", " ", "+05:30", "Europe/Lisbon ", "Europe/Lisbon;x", "a".repeat(65), 42, null, undefined, {}]) {
      expect(readableZone(name), JSON.stringify(name)).toBeUndefined();
    }
  });
});

describe("the browser's zone", () => {
  it("is the one it names when the server can read it, UTC only where the browser itself names UTC", () => {
    for (const zone of ["America/Sao_Paulo", "UTC"]) {
      browserNaming(zone);
      expect(browserZone()).toBe(zone);
    }
  });

  it("is none, never UTC, when the browser names none, names one Intl refuses, or Intl fails", () => {
    for (const named of [undefined, "", "Etc/Unknown"]) {
      browserNaming(named);
      expect(browserZone(), String(named)).toBeUndefined();
    }
    vi.stubGlobal("Intl", { DateTimeFormat: () => { throw new RangeError("no Intl"); } });
    expect(browserZone()).toBeUndefined();
  });
});

describe("the zone every request sends", () => {
  it("is read once a visit, so two reads under one cache key never send two zones", async () => {
    vi.resetModules();
    const { sentZone } = await import("./reader-zone");
    browserNaming("Asia/Tokyo");
    expect(sentZone()).toBe("Asia/Tokyo");
    browserNaming("Europe/Lisbon");
    expect(sentZone()).toBe("Asia/Tokyo");
  });

  it("is none for a visit whose browser names no zone the server reads", async () => {
    vi.resetModules();
    const { sentZone } = await import("./reader-zone");
    browserNaming("Etc/Unknown");
    expect(sentZone()).toBeUndefined();
    browserNaming("Asia/Tokyo");
    expect(sentZone()).toBeUndefined();
  });
});

describe("the zone a screen prints days in", () => {
  it("is the one sent, else the birth place's on the reader's profile, else the one the server says it read them in", () => {
    expect(shownZone("Asia/Tokyo", "Europe/Lisbon", "Europe/Lisbon")).toBe("Asia/Tokyo");
    expect(shownZone(undefined, "Europe/Lisbon", "America/New_York")).toBe("Europe/Lisbon");
    expect(shownZone(undefined, null, "Europe/Lisbon")).toBe("Europe/Lisbon");
    expect(shownZone(undefined, "Not/AZone", "Europe/Lisbon")).toBe("Europe/Lisbon");
  });

  it("is none while none of them is known, so a screen waits rather than print UTC's days", () => {
    expect(shownZone(undefined, undefined, undefined)).toBeUndefined();
    expect(shownZone(undefined, null, "Etc/Unknown")).toBeUndefined();
  });

  it("asks the server only when nothing else names it, only for a reader with Timeline, on the key Now and ahead reads with no zone", () => {
    expect(SERVED_WEEK).toEqual({ range: "week" });
    expect(servedZoneRead(true, undefined)).toMatchObject({ enabled: true, queryKey: getGetTimelineNowQueryKey({ range: "week" }) });
    expect(servedZoneRead(true, "Asia/Tokyo").enabled).toBe(false);
    expect(servedZoneRead(false, undefined).enabled).toBe(false);
  });
});
