/**
 * The credit loop's nudge rows in Review 01/10's words, read from a card's
 * inputs (acceptance 7; ADR-170, 181, 182), plus the gift's suggestion of the
 * reader's own report (ADR-139). Field names describe what the card already
 * knows; nothing here fetches a report or reads localStorage itself.
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
      line: "Beatrice is in your circle",
      detail: "Read the two of you · 1 credit",
      control: "generate_pair",
      reportId: "r-1",
    });
  });

  it("row 2 alone: a report you had written is finished, no pair to generate yet", () => {
    const nudge = nudgeFor({ personReport: { reportId: "r-1", name: "Beatrice", canGeneratePair: false, canSend: true } }, NONE);
    expect(nudge).toEqual({
      line: "It is about Beatrice",
      detail: "Share it with them. It becomes theirs.",
      control: "send",
      reportId: "r-1",
    });
  });

  it("row 3 alone: a compatibility report just finished", () => {
    const nudge = nudgeFor({ pairReport: { reportId: "r-pair", name: "Pierre", canSend: true } }, NONE);
    expect(nudge).toEqual({
      line: "You and Pierre",
      detail: "Share it with them if you want them to read it.",
      control: "send",
      reportId: "r-pair",
    });
  });

  it("the circle row: only the reader in their circle, with credits to spend", () => {
    const nudge = nudgeFor({ alone: true, credits: 2 }, NONE);
    expect(nudge).toEqual({
      line: "Add someone to your circle.",
      detail: "1 credit = 1 report.",
      control: "add_someone",
    });
  });

  it("the circle row sits over Get credits at zero, and on a negative balance", () => {
    expect(nudgeFor({ alone: true, credits: 0 }, NONE)?.control).toBe("get_credits");
    expect(nudgeFor({ alone: true, credits: -1 }, NONE)?.control).toBe("get_credits");
  });

  it("the circle row with no balance given, as where credits are not enforced, sits over Add someone", () => {
    expect(nudgeFor({ alone: true }, NONE)?.control).toBe("add_someone");
  });

  it("the circle row reads the same whatever the balance", () => {
    const zero = nudgeFor({ alone: true, credits: 0 }, NONE);
    const some = nudgeFor({ alone: true, credits: 5 }, NONE);
    expect(`${zero?.line} ${zero?.detail}`).toBe("Add someone to your circle. 1 credit = 1 report.");
    expect(`${some?.line} ${some?.detail}`).toBe(`${zero?.line} ${zero?.detail}`);
  });

  it("zero credits with someone already in the circle: nothing to say", () => {
    expect(nudgeFor({ alone: false, credits: 0 }, NONE)).toBeNull();
    expect(nudgeFor({ credits: 0 }, NONE)).toBeNull();
  });

  it("no word on the page names an orbit, a sky or a send", () => {
    const cards: NudgeCard[] = [
      READY,
      { personReport: { reportId: "r-1", name: "Beatrice", canGeneratePair: false, canSend: true } },
      { pairReport: { reportId: "r-pair", name: "Pierre", canSend: true } },
      { alone: true, credits: 0 },
      { claimedGift: { giverName: "Marisol", hasOwnChart: false } },
    ];
    for (const card of cards) {
      const nudge = nudgeFor(card, NONE);
      expect(nudge).not.toBeNull();
      expect(`${nudge?.line} ${nudge?.detail}`).not.toMatch(/orbit|sky|send/i);
    }
  });

  it("two at once yield the first: generate outranks share on the same report", () => {
    expect(nudgeFor(READY, NONE)?.control).toBe("generate_pair");
  });

  it("two at once yield the first: a person's report outranks the circle row", () => {
    const nudge = nudgeFor(
      { personReport: { reportId: "r-1", name: "Beatrice", canGeneratePair: false, canSend: true }, alone: true, credits: 0 },
      NONE,
    );
    expect(nudge?.control).toBe("send");
  });

  it("two at once yield the first: a finished pair outranks the circle row", () => {
    const nudge = nudgeFor({ pairReport: { reportId: "r-pair", name: "Pierre", canSend: true }, alone: true }, NONE);
    expect(nudge?.control).toBe("send");
  });

  it("two at once yield the first: the circle row outranks a claimed gift", () => {
    const nudge = nudgeFor({ alone: true, claimedGift: { giverName: "Marisol", hasOwnChart: false } }, NONE);
    expect(nudge?.control).toBe("add_someone");
  });

  it("a seen report yields none, even with nothing else on the card", () => {
    expect(nudgeFor(READY, new Set(["r-1"]))).toBeNull();
  });

  it("a seen report falls through to a row that does not name a report", () => {
    const nudge = nudgeFor(
      { personReport: { reportId: "r-1", name: "Beatrice", canGeneratePair: true, canSend: true }, alone: true, credits: 0 },
      new Set(["r-1"]),
    );
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

  it("the gift row shows only while the reader has no report of their own", () => {
    const nudge = nudgeFor({ claimedGift: { giverName: "Marisol", hasOwnChart: false } }, NONE);
    expect(nudge).toEqual({
      line: "Marisol gave you a credit",
      detail: "Start with your own Personal report.",
      control: "generate_own",
    });
  });

  it("the gift row is silent once the reader has their own report", () => {
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
