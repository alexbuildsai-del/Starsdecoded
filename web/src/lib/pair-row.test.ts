/**
 * The dashboard rows, read from their inputs: a pair's state and name, a
 * person's actions, the signs line, and Stop sharing's words, pinned to the
 * locked spec (review-01-10, scope 3). Inputs describe what GET /home and the
 * lists already hold; nothing here fetches or guesses it.
 */
import { describe, expect, it } from "vitest";
import {
  PAIR_ROW_COPY,
  pairRowState,
  pairRowTitle,
  pairedWithReader,
  personRowView,
  sharedWaiting,
  signsLine,
  signsSpoken,
  stopPairLine,
  stopSharingLines,
  stopSharingTitle,
  type PersonRowInput,
} from "./pair-row";

const ME = { profileId: "me", name: "Alexandra Bendicakova" };
const MAMCA = { profileId: "mamca", name: "Mamca" };
const THIB = { profileId: "thib", name: "Thibault Jacquemart" };
const SELF = new Set(["me"]);

describe("pairRowState", () => {
  it("a finished, readable pair opens, and so does one under a revision pass", () => {
    expect(pairRowState({ status: "complete", readable: true })).toBe("open");
    expect(pairRowState({ status: "revising", readable: true })).toBe("open");
  });

  it("a pair still being written is pair_writing at any writing status", () => {
    for (const status of ["pending", "computing", "interpreting"] as const) {
      expect(pairRowState({ status, readable: true })).toBe("pair_writing");
    }
  });

  it("closed: a pair no longer shared, checked before its status (MB-103 provisional)", () => {
    expect(pairRowState({ status: "complete", readable: false })).toBe("closed");
    expect(pairRowState({ status: "computing", readable: false })).toBe("closed");
  });

  it("carries the fixed line of each still row", () => {
    expect(PAIR_ROW_COPY.pair_writing).toBe("It opens here when it is finished.");
    expect(PAIR_ROW_COPY.closed).toBe("No longer shared");
    expect(Object.keys(PAIR_ROW_COPY).sort()).toEqual(["closed", "open", "pair_writing"]);
  });
});

describe("pairRowTitle", () => {
  it("reads You & {first name} when one of the two is the reader, whichever side they are", () => {
    expect(pairRowTitle(ME, MAMCA, SELF)).toEqual({ title: "You & Mamca", other: MAMCA });
    expect(pairRowTitle(THIB, ME, SELF)).toEqual({ title: "You & Thibault", other: THIB });
  });

  it("names both by first name when the reader is neither, or both are marked as theirs", () => {
    expect(pairRowTitle(MAMCA, THIB, SELF)).toEqual({ title: "Mamca & Thibault", other: null });
    expect(pairRowTitle(ME, MAMCA, new Set(["me", "mamca"]))).toEqual({ title: "Alexandra & Mamca", other: null });
  });
});

describe("pairedWithReader", () => {
  const pair = (b: typeof MAMCA, extra: { status?: string; stoppedBy?: string | null } = {}) => ({
    status: extra.status ?? "complete",
    stoppedBy: extra.stoppedBy ?? null,
    a: ME,
    b,
  });

  it("lights the other person of each pair with the reader that opens", () => {
    expect([...pairedWithReader([pair(MAMCA), pair(THIB, { status: "revising" })], SELF)]).toEqual(["mamca", "thib"]);
  });

  it("lights no one for a closed pair, one still being written, or one without the reader", () => {
    expect(pairedWithReader([pair(MAMCA, { stoppedBy: "Mamca" })], SELF).size).toBe(0);
    expect(pairedWithReader([pair(MAMCA, { status: "interpreting" })], SELF).size).toBe(0);
    expect(pairedWithReader([{ status: "complete", stoppedBy: null, a: MAMCA, b: THIB }], SELF).size).toBe(0);
  });
});

describe("the signs line", () => {
  const triad = { sun: { sign: "Virgo" }, moon: { sign: "Leo" }, rising: { sign: "Gemini" } };

  it("prints Sun, Moon and Rising in order, and says them whole for a screen reader", () => {
    expect(signsLine(triad)).toBe("Virgo · Leo · Gemini");
    expect(signsSpoken(triad)).toBe("Sun in Virgo, Moon in Leo, Gemini rising");
  });

  it("leaves the Rising out without a birth time, and says nothing before the chart is stored", () => {
    expect(signsLine({ ...triad, rising: null })).toBe("Virgo · Leo");
    expect(signsSpoken({ ...triad, rising: null })).toBe("Sun in Virgo, Moon in Leo");
    expect(signsLine(null)).toBeNull();
    expect(signsSpoken(null)).toBeNull();
  });
});

describe("personRowView", () => {
  const BASE: PersonRowInput = { isSelf: false, access: "owner", status: "complete", ownership: "owner", unmarked: false };

  it("the reader's own row: This is me ✓, with Not me behind ⋯, and it opens", () => {
    const view = personRowView({ ...BASE, isSelf: true });
    expect(view).toMatchObject({ opens: true, self: true, mark: false, notMe: true, share: null, stopWith: null });
  });

  it("someone the reader wrote: Share with {name}, then waiting, then joined", () => {
    expect(personRowView({ ...BASE, send: { state: "can_send", firstName: "Mamca" } }).share).toEqual({ kind: "offer", name: "Mamca" });
    expect(personRowView({ ...BASE, send: { state: "sent", firstName: "Mamca" } }).share).toEqual({ kind: "waiting", name: "Mamca" });
    expect(personRowView({ ...BASE, send: { state: "joined", firstName: "Mamca" } }).share).toEqual({ kind: "joined", name: "Mamca" });
    expect(personRowView({ ...BASE, send: null }).share).toBeNull();
  });

  it("offers This is me on charts the reader wrote only while none is marked as theirs", () => {
    expect(personRowView({ ...BASE, unmarked: true }).mark).toBe(true);
    expect(personRowView({ ...BASE, unmarked: false }).mark).toBe(false);
    expect(personRowView({ ...BASE, unmarked: true, ownership: "invited" }).mark).toBe(false);
  });

  it("a report sent to the reader: This is me, and Stop sharing with whoever sent it", () => {
    const view = personRowView({ ...BASE, access: "claimed", ownership: "claimed", giver: "Alexandra" });
    expect(view).toMatchObject({ mark: true, notMe: false, stopWith: "Alexandra", handsOver: false });
    const mine = personRowView({ ...BASE, access: "claimed", isSelf: true, giver: "Alexandra" });
    expect(mine).toMatchObject({ self: true, mark: false, notMe: true, stopWith: "Alexandra" });
  });

  it("names no giver on a report the reader wrote, whatever the lists carry", () => {
    expect(personRowView({ ...BASE, giver: "Alexandra" }).stopWith).toBeNull();
  });

  it("the writer's delete of a report its subject holds hands it over", () => {
    expect(personRowView({ ...BASE, ownership: "claimed" }).handsOver).toBe(true);
    expect(personRowView({ ...BASE, access: "claimed", ownership: "claimed" }).handsOver).toBe(false);
  });

  it("a report under way is a status and does not open until it is finished", () => {
    for (const status of ["pending", "computing", "interpreting"]) {
      expect(personRowView({ ...BASE, status })).toMatchObject({ busy: "Writing", opens: false });
    }
    expect(personRowView({ ...BASE, status: "revising" })).toMatchObject({ busy: "Revising", opens: true });
  });

  it("offers Add birth time on a finished report with no birth time", () => {
    expect(personRowView({ ...BASE, horizon: "unknown" }).addBirthTime).toBe(true);
    expect(personRowView({ ...BASE, horizon: "unknown", status: "interpreting" }).addBirthTime).toBe(false);
    expect(personRowView({ ...BASE, horizon: "approximate" }).addBirthTime).toBe(false);
  });
});

describe("the words", () => {
  it("a share waiting on its claim says shared, never sent (ADR-181)", () => {
    expect(sharedWaiting("Mamca")).toBe("Shared · waiting for Mamca");
  });

  it("Stop sharing names its four consequences in the locked spec's words", () => {
    expect(stopSharingTitle("Alexandra")).toBe("Stop sharing with Alexandra?");
    expect(stopSharingLines("Alexandra")).toEqual([
      "Alexandra can no longer read your Personal report.",
      "You leave Alexandra's circle. Your birth date and your Sun, Moon and Rising go from Alexandra's dashboard.",
      "Compatibility reports Alexandra made with you close for Alexandra too. Nothing is deleted.",
      "Your report stays yours. You can't undo this.",
    ]);
  });

  it("a pair's stop keeps its one line", () => {
    expect(stopPairLine("Mamca")).toBe("Mamca can no longer read this Compatibility report.");
  });
});
