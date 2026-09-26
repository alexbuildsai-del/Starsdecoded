/**
 * The credit loop's four nudge rows, read from a card's inputs (acceptance
 * 7), plus the gift's suggestion of the reader's own chart (ADR-139). Field
 * names describe what the card already knows; nothing here fetches a report
 * or reads localStorage itself.
 */
import { describe, expect, it } from "vitest";
import { NUDGE_SEEN_KEY, type NudgeCard, nudgeFor } from "./nudges";

const NONE: ReadonlySet<string> = new Set();

const READY: NudgeCard = {
  personReport: { reportId: "r-1", name: "Beatrice", canGeneratePair: true, canSend: true },
};

describe("nudgeFor", () => {
  it("row 1 alone: a person's report just finished and a pair can be generated", () => {
    const nudge = nudgeFor({ personReport: { reportId: "r-1", name: "Beatrice", canGeneratePair: true, canSend: false } }, NONE);
    expect(nudge).toEqual({
      line: "Beatrice is in your orbit",
      detail: "Read the two of you · 1 credit",
      control: "generate_pair",
      reportId: "r-1",
    });
  });

  it("row 2 alone: a report you had written is finished, no pair to generate yet", () => {
    const nudge = nudgeFor({ personReport: { reportId: "r-1", name: "Beatrice", canGeneratePair: false, canSend: true } }, NONE);
    expect(nudge).toEqual({
      line: "It is about Beatrice",
      detail: "Send it to them; it becomes theirs.",
      control: "send",
      reportId: "r-1",
    });
  });

  it("row 3 alone: a compatibility report just finished", () => {
    const nudge = nudgeFor({ pairReport: { reportId: "r-pair", name: "Pierre", canSend: true } }, NONE);
    expect(nudge).toEqual({
      line: "You and Pierre",
      detail: "Send it to them if you want them to read it.",
      control: "send",
      reportId: "r-pair",
    });
  });

  it("row 4 alone: no credits left", () => {
    const nudge = nudgeFor({ credits: 0 }, NONE);
    expect(nudge).toEqual({
      line: "Your orbit has room for more",
      detail: "Credits come in 1, 3 and 5.",
      control: "get_credits",
    });
  });

  it("row 4 also fires on a negative balance", () => {
    expect(nudgeFor({ credits: -1 }, NONE)?.control).toBe("get_credits");
  });

  it("credits left: row 4 does not fire", () => {
    expect(nudgeFor({ credits: 3 }, NONE)).toBeNull();
  });

  it("credits not given: row 4 does not fire", () => {
    expect(nudgeFor({}, NONE)).toBeNull();
  });

  it("two at once yield the first: generate outranks send on the same report", () => {
    expect(nudgeFor(READY, NONE)?.control).toBe("generate_pair");
  });

  it("two at once yield the first: a person's report outranks zero credits", () => {
    const nudge = nudgeFor({ personReport: { reportId: "r-1", name: "Beatrice", canGeneratePair: false, canSend: true }, credits: 0 }, NONE);
    expect(nudge?.control).toBe("send");
  });

  it("two at once yield the first: a finished pair outranks zero credits", () => {
    const nudge = nudgeFor({ pairReport: { reportId: "r-pair", name: "Pierre", canSend: true }, credits: 0 }, NONE);
    expect(nudge?.control).toBe("send");
  });

  it("a seen report yields none, even with nothing else on the card", () => {
    expect(nudgeFor(READY, new Set(["r-1"]))).toBeNull();
  });

  it("a seen report falls through to a row that does not name a report", () => {
    const nudge = nudgeFor({ personReport: { reportId: "r-1", name: "Beatrice", canGeneratePair: true, canSend: true }, credits: 0 }, new Set(["r-1"]));
    expect(nudge?.control).toBe("get_credits");
  });

  it("a seen pair report does not block a different report's row", () => {
    const nudge = nudgeFor(
      { pairReport: { reportId: "r-pair", name: "Pierre", canSend: true }, personReport: { reportId: "r-1", name: "Beatrice", canGeneratePair: false, canSend: true } },
      new Set(["r-pair"]),
    );
    expect(nudge?.control).toBe("send");
    expect(nudge?.reportId).toBe("r-1");
  });

  it("the gift row shows only while the reader has no chart of their own", () => {
    const nudge = nudgeFor({ claimedGift: { giverName: "Marisol", hasOwnChart: false } }, NONE);
    expect(nudge).toEqual({
      line: "Marisol gave you a credit",
      detail: "Start with your own chart.",
      control: "generate_own",
    });
  });

  it("the gift row is silent once the reader has their own chart", () => {
    expect(nudgeFor({ claimedGift: { giverName: "Marisol", hasOwnChart: true } }, NONE)).toBeNull();
  });

  it("nothing on the card, nothing to say", () => {
    expect(nudgeFor({}, NONE)).toBeNull();
  });
});

describe("NUDGE_SEEN_KEY", () => {
  it("is the one localStorage key every caller must share", () => {
    expect(NUDGE_SEEN_KEY).toBe("sd.nudge.seen");
  });
});
