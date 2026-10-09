import { describe, expect, it } from "vitest";
import type { AskMessageOffer } from "@workspace/api-client-react";
import { OFFER_REASON, offerView } from "./ask-view";

// Ask's pair offer under an answer (R19-40, Review 05/10 §8): who, one reason, the reader's credits, one way on, no price.
const offer = (over: Partial<AskMessageOffer> = {}): AskMessageOffer => ({ profileId: "p-tomas", name: "Tomás", credits: 5, ...over });

describe("the pair offer's card", () => {
  it("is nothing when the answer carries no offer", () => {
    expect(offerView(undefined)).toBeNull();
  });

  it("with credits says who, one reason, the count and Write it, opening the picker with that person picked", () => {
    expect(offerView(offer())).toEqual({
      title: "See Tomás's side too",
      reason: OFFER_REASON,
      credits: "You have 5 credits. This uses 1.",
      action: "Write it",
      href: "/dashboard?pair=p-tomas",
    });
    expect(offerView(offer({ credits: 1 }))?.credits).toBe("You have 1 credit. This uses 1.");
  });

  it("at zero says so and offers Get a credit, never a price or a second ask", () => {
    const view = offerView(offer({ credits: 0 }));
    expect(view).toMatchObject({ credits: "You have no credits left. One credit writes it.", action: "Get a credit", href: "/dashboard?pair=p-tomas" });
    expect(JSON.stringify(view)).not.toMatch(/€|\$|£|price/i);
  });

  it("reads a count that is not a whole number as none, and a missing name as 'their'", () => {
    for (const credits of [Number.NaN, -3, Number.POSITIVE_INFINITY]) expect(offerView(offer({ credits }))?.action, String(credits)).toBe("Get a credit");
    expect(offerView(offer({ credits: 2.9 }))?.credits).toBe("You have 2 credits. This uses 1.");
    expect(offerView(offer({ name: "  " }))?.title).toBe("See their side too");
  });

  it("encodes the person's id in the picker's address", () => {
    expect(offerView(offer({ profileId: "a b&c" }))?.href).toBe("/dashboard?pair=a%20b%26c");
  });
});
