/**
 * The person row's widened enums (R15-02, ADR-235, 236): a reader who reads a
 * report through a share offers no Send whatever the server says, and a send
 * handed back reads as an offer to send again, never as waiting or joined.
 */
import { describe, expect, it } from "vitest";
import { personRowView, type PersonRowInput, type ShareState } from "./pair-row";

const BASE: PersonRowInput = { isSelf: false, access: "owner", status: "complete", ownership: "owner", unmarked: false };
const STATES: ShareState[] = ["can_send", "can_grant", "sent", "joined", "handed_back"];

describe("a report read through a share (access shared)", () => {
  it("offers no Send in any state the server answers, only its sharer can send it", () => {
    for (const state of STATES) {
      expect(personRowView({ ...BASE, access: "shared", send: { state, firstName: "Mamca" } }).share, state).toBeNull();
    }
  });

  it("names no giver to stop sharing with and hands nothing over, but still opens once finished", () => {
    const view = personRowView({ ...BASE, access: "shared", ownership: null, giver: "Alexandra", send: { state: "can_send", firstName: "Mamca" } });
    expect(view).toMatchObject({ opens: true, share: null, stopWith: null, handsOver: false, notMe: false, self: false });
  });

  it("is still a status while it is written, and opens under a revision pass", () => {
    expect(personRowView({ ...BASE, access: "shared", status: "interpreting" })).toMatchObject({ opens: false, busy: "Writing" });
    expect(personRowView({ ...BASE, access: "shared", status: "revising" })).toMatchObject({ opens: true, busy: "Revising" });
  });
});

describe("a send handed back (handed_back)", () => {
  it("reads as an offer to send again, never as waiting or joined", () => {
    expect(personRowView({ ...BASE, send: { state: "handed_back", firstName: "Mamca" } }).share).toEqual({ kind: "offer", name: "Mamca" });
  });

  it("with no first name, offers nothing, as every other state", () => {
    for (const state of STATES) expect(personRowView({ ...BASE, send: { state, firstName: "" } }).share, state).toBeNull();
  });

  it("is no claim: the row is the writer's again, so no Stop sharing and no hand-over", () => {
    const view = personRowView({ ...BASE, ownership: "owner", giver: "Alexandra", send: { state: "handed_back", firstName: "Mamca" } });
    expect(view).toMatchObject({ stopWith: null, handsOver: false });
  });
});
