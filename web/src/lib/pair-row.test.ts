/**
 * The dashboard rows, read from their inputs: a pair's state and name, a
 * person's actions, the signs line, and the words of Stop sharing and Not me's
 * handback, pinned to the locked spec (review-01-10, scope 3) and the approved
 * sweep artifact (ADR-236 to 238). Inputs describe what GET /home and the
 * lists already hold; nothing here fetches or guesses it.
 */
import { describe, expect, it } from "vitest";
import {
  HAND_BACK_TITLE,
  HANDED_BACK,
  PAIR_ROW_COPY,
  SEND_AGAIN,
  handBackLine,
  pairRowState,
  pairRowTitle,
  pairedWithReader,
  personRowView,
  sharedWaiting,
  signsLine,
  signsSpoken,
  stopPairLine,
  stopShareLines,
  stopSharingLines,
  stopSharingTitle,
  waitingInvite,
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
    expect(view).toMatchObject({ mark: true, stopWith: "Alexandra", handsOver: false });
    const mine = personRowView({ ...BASE, access: "claimed", isSelf: true, giver: "Alexandra" });
    expect(mine).toMatchObject({ self: true, mark: false, notMe: true, stopWith: "Alexandra" });
  });

  it("Not me on a report sent to the reader hands it back, marked as theirs or not; on the writer's own chart it unmarks (ADR-236)", () => {
    expect(personRowView({ ...BASE, access: "claimed", isSelf: true })).toMatchObject({ notMe: true, handBack: true });
    expect(personRowView({ ...BASE, access: "claimed", isSelf: false })).toMatchObject({ notMe: true, handBack: true });
    expect(personRowView({ ...BASE, isSelf: true })).toMatchObject({ notMe: true, handBack: false });
    expect(personRowView({ ...BASE, isSelf: false })).toMatchObject({ notMe: false, handBack: false });
  });

  it("Stop sharing names the chart's person by first name only when it isn't the reader's own (ADR-238)", () => {
    const june = { ...BASE, access: "claimed" as const, giver: "Mira", name: "June Carter" };
    expect(personRowView(june).stopSubject).toBe("June");
    expect(personRowView({ ...june, isSelf: true }).stopSubject).toBeNull();
    expect(personRowView({ ...june, access: "owner" }).stopSubject).toBeNull();
    expect(personRowView({ ...june, name: undefined }).stopSubject).toBeNull();
  });

  it("names no giver on a report the reader wrote, whatever the lists carry", () => {
    expect(personRowView({ ...BASE, giver: "Alexandra" }).stopWith).toBeNull();
  });

  it("a send handed back reads Handed back with Send again, a new send; no other state does (ADR-236)", () => {
    const back = personRowView({ ...BASE, send: { state: "handed_back", firstName: "June" } });
    expect(back).toMatchObject({ handedBack: true, changeAddress: false, share: { kind: "offer", name: "June" } });
    for (const state of ["can_send", "can_grant", "sent", "joined"] as const) {
      expect(personRowView({ ...BASE, send: { state, firstName: "June" } }).handedBack, state).toBe(false);
    }
    expect(personRowView({ ...BASE, send: { state: "handed_back", firstName: "" } }).handedBack).toBe(false);
  });

  it("only a send still waiting offers Change address (ADR-237)", () => {
    expect(personRowView({ ...BASE, send: { state: "sent", firstName: "Sam" } }).changeAddress).toBe(true);
    for (const state of ["can_send", "can_grant", "joined", "handed_back"] as const) {
      expect(personRowView({ ...BASE, send: { state, firstName: "Sam" } }).changeAddress, state).toBe(false);
    }
    expect(personRowView({ ...BASE, access: "shared", send: { state: "sent", firstName: "Sam" } }).changeAddress).toBe(false);
  });

  it("a report read through a share offers no This is me, Not me, birth time or delete, even with nothing marked (ADR-235)", () => {
    const view = personRowView({ ...BASE, access: "shared", ownership: null, unmarked: true, horizon: "unknown" });
    expect(view).toMatchObject({ mark: false, notMe: false, handBack: false, addBirthTime: false, deletes: false, stopWith: null });
    expect(personRowView({ ...BASE, access: "shared", ownership: undefined, unmarked: true }).mark).toBe(false);
    expect(personRowView({ ...BASE }).deletes).toBe(true);
    expect(personRowView({ ...BASE, access: "claimed" }).deletes).toBe(true);
  });

  it("offers Try again on a failed report only where the reader may run it again (MB-137, reading 10)", () => {
    expect(personRowView({ ...BASE, status: "failed", canRegenerate: true }).retry).toBe(true);
    expect(personRowView({ ...BASE, status: "failed", canRegenerate: false }).retry).toBe(false);
    expect(personRowView({ ...BASE, status: "failed" }).retry).toBe(false);
    expect(personRowView({ ...BASE, status: "complete", canRegenerate: true }).retry).toBe(false);
    expect(personRowView({ ...BASE, status: "failed", canRegenerate: true })).toMatchObject({ opens: false, busy: null });
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

  it("Stop sharing on a chart that isn't the reader's names its person, in the artifact's words (ADR-238)", () => {
    expect(stopSharingTitle("Mira", "June")).toBe("Stop sharing June's Personal report?");
    expect(stopSharingLines("Mira", "June")).toEqual([
      "Mira can no longer read it.",
      "June's birth details leave Mira's account.",
      "Pairs made from it close.",
    ]);
    expect(stopSharingTitle("Mira", null)).toBe("Stop sharing with Mira?");
    expect(stopSharingLines("Mira", null)).toEqual(stopSharingLines("Mira"));
  });

  it("stopping a share of the reader's own report says what goes, and that it can be shared again (ADR-235)", () => {
    expect(stopShareLines("Sam", null)).toEqual([
      "Sam can no longer read your Personal report.",
      "You leave Sam's circle. Your birth date and your Sun, Moon and Rising go from Sam's dashboard.",
      "Compatibility reports Sam made with you close for Sam too. Nothing is deleted.",
      "You can share it again later.",
    ]);
    expect(stopShareLines("sam@example.com", "sam@example.com")).toEqual([
      "The link we emailed to sam@example.com stops working.",
      "You can share it again later.",
    ]);
  });

  it("Not me's handback asks in the artifact's words, and names no one when the giver is unknown (ADR-236)", () => {
    expect(HAND_BACK_TITLE).toBe("This report isn't about you?");
    expect(handBackLine("Mira")).toBe("We'll hand it back to Mira and it leaves your account. Mira can send it to the right person.");
    expect(handBackLine("")).toBe("We'll hand it back to whoever sent it and it leaves your account. They can send it to the right person.");
  });

  it("a send handed back reads so, and its new send is Send again", () => {
    expect(HANDED_BACK).toBe("Handed back");
    expect(SEND_AGAIN).toBe("Send again");
  });
});

describe("waitingInvite", () => {
  const link = (id: string, extra: { relationshipId?: string | null; claimedAt?: string | null } = {}) => ({
    id,
    email: `${id}@example.com`,
    relationshipId: extra.relationshipId ?? null,
    claimedAt: extra.claimedAt ?? null,
  });

  it("moves the person's newest link still waiting, never a pair's", () => {
    const links = [link("old"), link("pair", { relationshipId: "rel" }), link("new")];
    expect(waitingInvite(links, null)?.id).toBe("new");
    expect(waitingInvite(links, "rel")?.id).toBe("pair");
  });

  it("skips a claimed link, and finds nothing before the list loads or once none waits", () => {
    expect(waitingInvite([link("a"), link("b", { claimedAt: "2026-10-01T00:00:00Z" })], null)?.id).toBe("a");
    expect(waitingInvite(undefined, null)).toBeNull();
    expect(waitingInvite([link("pair", { relationshipId: "rel" })], null)).toBeNull();
  });
});
