/**
 * The circle's nudge in Review 01/10's words, read from a card's inputs
 * (acceptance 7; ADR-170, 181, 182), plus the gift's suggestion of the
 * reader's own report (ADR-139). Field names describe what the card already
 * knows; nothing here fetches a report or touches the browser's storage.
 */
import { describe, expect, it } from "vitest";
import { type NudgeCard, nudgeFor } from "./nudges";

describe("nudgeFor", () => {
  it("the circle row: only the reader in their circle, with credits to spend", () => {
    const nudge = nudgeFor({ alone: true, credits: 2 });
    expect(nudge).toEqual({
      line: "Add someone to your circle.",
      detail: "1 credit = 1 report.",
      control: "add_someone",
    });
  });

  it("the circle row sits over Get credits at zero, and on a negative balance", () => {
    expect(nudgeFor({ alone: true, credits: 0 })?.control).toBe("get_credits");
    expect(nudgeFor({ alone: true, credits: -1 })?.control).toBe("get_credits");
  });

  it("the circle row with no balance given, as where credits are not enforced, sits over Add someone", () => {
    expect(nudgeFor({ alone: true })?.control).toBe("add_someone");
  });

  it("the circle row reads the same whatever the balance", () => {
    const zero = nudgeFor({ alone: true, credits: 0 });
    const some = nudgeFor({ alone: true, credits: 5 });
    expect(`${zero?.line} ${zero?.detail}`).toBe("Add someone to your circle. 1 credit = 1 report.");
    expect(`${some?.line} ${some?.detail}`).toBe(`${zero?.line} ${zero?.detail}`);
  });

  it("zero credits with someone already in the circle: nothing to say", () => {
    expect(nudgeFor({ alone: false, credits: 0 })).toBeNull();
    expect(nudgeFor({ credits: 0 })).toBeNull();
  });

  it("no word on the page names an orbit, a sky or a send", () => {
    const cards: NudgeCard[] = [
      { alone: true, credits: 2 },
      { alone: true, credits: 0 },
      { claimedGift: { giverName: "Marisol", hasOwnChart: false } },
    ];
    for (const card of cards) {
      const nudge = nudgeFor(card);
      expect(nudge).not.toBeNull();
      expect(`${nudge?.line} ${nudge?.detail}`).not.toMatch(/orbit|sky|send/i);
    }
  });

  it("two at once yield the first: the circle row outranks a claimed gift", () => {
    const nudge = nudgeFor({ alone: true, claimedGift: { giverName: "Marisol", hasOwnChart: false } });
    expect(nudge?.control).toBe("add_someone");
  });

  it("the gift row shows only while the reader has no report of their own", () => {
    const nudge = nudgeFor({ claimedGift: { giverName: "Marisol", hasOwnChart: false } });
    expect(nudge).toEqual({
      line: "Marisol gave you a credit",
      detail: "Start with your own Personal report.",
      control: "generate_own",
    });
  });

  it("the gift row is silent once the reader has their own report", () => {
    expect(nudgeFor({ claimedGift: { giverName: "Marisol", hasOwnChart: true } })).toBeNull();
  });

  it("nothing on the card, nothing to say", () => {
    expect(nudgeFor({})).toBeNull();
  });
});
