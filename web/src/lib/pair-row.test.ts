/**
 * Every row of the dashboard-sky Compatibility table, read from its inputs
 * (acceptance 7). Field names describe what the card already knows; nothing
 * here fetches or guesses it.
 */
import { describe, expect, it } from "vitest";
import { PAIR_ROW_COPY, type PairRowInput, pairRowState } from "./pair-row";

const BASE: PairRowInput = { ownReportReady: true, otherReportReady: true, credits: 2 };

describe("pairRowState", () => {
  it("shared with the reader: a finished, readable pair opens", () => {
    expect(pairRowState({ ...BASE, pair: { status: "complete", readable: true } })).toBe("open");
  });

  it("pairs between this person and others open the same way", () => {
    // Same shape as above: the row does not care whose two profiles they are.
    expect(pairRowState({ ...BASE, pair: { status: "complete", readable: true } })).toBe("open");
  });

  it("none yet, both finished, credits left: generate", () => {
    expect(pairRowState(BASE)).toBe("generate");
  });

  it("none yet, zero credits: get_credits", () => {
    expect(pairRowState({ ...BASE, credits: 0 })).toBe("get_credits");
  });

  it("their natal report is still writing: their_writing, whatever the credits", () => {
    expect(pairRowState({ ...BASE, otherReportReady: false })).toBe("their_writing");
    expect(pairRowState({ ...BASE, otherReportReady: false, credits: 0 })).toBe("their_writing");
  });

  it("generate pressed: generating, before the pair exists to poll", () => {
    expect(pairRowState({ ...BASE, generating: true })).toBe("generating");
  });

  it("the pair report itself is writing: pair_writing, at any writing status", () => {
    expect(pairRowState({ ...BASE, pair: { status: "pending", readable: true } })).toBe("pair_writing");
    expect(pairRowState({ ...BASE, pair: { status: "computing", readable: true } })).toBe("pair_writing");
    expect(pairRowState({ ...BASE, pair: { status: "interpreting", readable: true } })).toBe("pair_writing");
  });

  it("reader has no report: needs_yours, before anything else is asked", () => {
    expect(pairRowState({ ...BASE, ownReportReady: false })).toBe("needs_yours");
    expect(pairRowState({ ...BASE, ownReportReady: false, otherReportReady: false, credits: 0 })).toBe("needs_yours");
  });

  it("closed: a pair no longer shared, MB-103 provisional", () => {
    // MB-103 provisional: the maker loses the pair once either source report is no longer shared.
    expect(pairRowState({ ...BASE, pair: { status: "complete", readable: false } })).toBe("closed");
  });

  it("closed wins over a writing status: unreadable is checked first", () => {
    expect(pairRowState({ ...BASE, pair: { status: "computing", readable: false } })).toBe("closed");
  });

  it("a failed pair clears like it never happened, so Generate can run again", () => {
    expect(pairRowState({ ...BASE, pair: { status: "failed", readable: true } })).toBe("generate");
  });
});

describe("PAIR_ROW_COPY", () => {
  it("carries the table's fixed lines", () => {
    expect(PAIR_ROW_COPY.needs_yours).toBe("Needs your own report first.");
    expect(PAIR_ROW_COPY.pair_writing).toBe("It opens here when it is finished.");
    expect(PAIR_ROW_COPY.closed).toBe("No longer shared");
    expect(PAIR_ROW_COPY.their_writing).toContain("{name}");
  });

  it("has one line for every state pairRowState can return", () => {
    const states = Object.keys(PAIR_ROW_COPY);
    expect(states.sort()).toEqual(
      ["open", "generate", "get_credits", "their_writing", "generating", "pair_writing", "needs_yours", "closed"].sort(),
    );
  });
});
