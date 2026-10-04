/**
 * The door Timeline's page opens, over every state the access read can be in (R16-27; ADR-262; MB-197): a reader is sent
 * to /timeline only when access is known to be false, whatever order the read, Clerk and a failure arrive in.
 */
import { describe, expect, it } from "vitest";
import type { TimelineAccess } from "@workspace/api-client-react";
import { timelineAccessFailed, timelineAccessView, timelineDoor, type AccessReader } from "./timeline-access";

const ADMIN: TimelineAccess = { access: true, source: "admin", hasPersonalReport: true, ask: { used: 0, left: 50, cap: 50, resetsOn: "2026-11-01" } };
const NONE: TimelineAccess = { access: false, source: null, hasPersonalReport: true, ask: null };

const READERS: Record<string, AccessReader> = {
  loading: { isLoaded: false, isSignedIn: undefined, userId: undefined },
  "signed out": { isLoaded: true, isSignedIn: false, userId: null },
  "signed in": { isLoaded: true, isSignedIn: true, userId: "user_admin" },
};

/** Every way a read can stand: not yet asked, pending, answered, failed with nothing, failed after an answer. */
const READS: [string, TimelineAccess | undefined, boolean, boolean][] = [
  ["pending", undefined, true, false],
  ["answered yes", ADMIN, false, false],
  ["answered no", NONE, false, false],
  ["failed with no answer", undefined, false, true],
  ["failed after yes", ADMIN, false, true],
  ["failed after no", NONE, false, true],
];

function doorFor(who: AccessReader, answer: TimelineAccess | undefined, pending: boolean, failed: boolean) {
  return timelineDoor({ ...timelineAccessView(who, answer, pending), error: timelineAccessFailed(who, answer, failed) });
}

describe("the door over every reader and every state of the read", () => {
  it("opens for a signed-in reader holding a yes, whether or not a later read failed", () => {
    const who = READERS["signed in"];
    expect(doorFor(who, ADMIN, false, false)).toBe("open");
    expect(doorFor(who, ADMIN, false, true)).toBe("open");
    expect(doorFor(who, ADMIN, true, false)).toBe("open");
  });

  it("sends away only a reader whose access is known to be no: signed out, or answered no", () => {
    expect(doorFor(READERS["signed out"], undefined, false, false)).toBe("away");
    expect(doorFor(READERS["signed in"], NONE, false, false)).toBe("away");
    expect(doorFor(READERS["signed in"], NONE, false, true)).toBe("away");
  });

  it("never sends a signed-in reader away on a failed read with no answer: it offers to read again", () => {
    expect(doorFor(READERS["signed in"], undefined, false, true)).toBe("retry");
  });

  it("waits while Clerk loads or the first read is pending, whatever else is claimed", () => {
    expect(doorFor(READERS.loading, ADMIN, false, false)).toBe("wait");
    expect(doorFor(READERS.loading, undefined, true, true)).toBe("wait");
    expect(doorFor(READERS["signed in"], undefined, true, false)).toBe("wait");
  });

  it("is one of the four doors in every combination, and 'open' exactly when the view says access", () => {
    for (const [who, reader] of Object.entries(READERS)) {
      for (const [state, answer, pending, failed] of READS) {
        const view = timelineAccessView(reader, answer, pending);
        const door = doorFor(reader, answer, pending, failed);
        expect(["wait", "retry", "away", "open"], `${who} / ${state}`).toContain(door);
        expect(door === "open", `${who} / ${state}`).toBe(view.access);
        if (door === "away") expect(view.access).toBe(false);
      }
    }
  });

  it("calls access unknown only for a signed-in reader with a failed read and nothing answered", () => {
    for (const [who, reader] of Object.entries(READERS)) {
      for (const [state, answer, , failed] of READS) {
        const unknown = timelineAccessFailed(reader, answer, failed);
        expect(unknown, `${who} / ${state}`).toBe(who === "signed in" && answer === undefined && failed);
      }
    }
  });
});
