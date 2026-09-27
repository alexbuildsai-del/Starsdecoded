import { describe, expect, it } from "vitest";
import { SHARE_CARD, recipientOf, shareActions, shareCardText } from "./share-card";

describe("the share card (ADR-102)", () => {
  it("is portrait 1080 by 1350 and says the eyebrow, the two first names, the verdict, the strengths and the foot line", () => {
    expect(SHARE_CARD).toEqual({ width: 1080, height: 1350 });
    const text = shareCardText({
      names: { a: "Marie Curie", b: "Oprah Winfrey" },
      lens: "partners",
      headline: "Two careful minds who steady each other, once feelings are said out loud.",
      strengths: ["Marie and Oprah think better out loud, together.", "A shared belief that the work has to matter.", "Standards neither of you lowers for the other.", "a fourth is never drawn"],
    });
    expect(text.eyebrow).toBe("Compatibility report · Partners");
    expect(text.title).toBe("Marie and Oprah");
    expect(text.headline).toMatch(/^Two careful minds/);
    expect(text.strengthsLabel).toBe("Your three strengths as a pair");
    expect(text.strengths).toHaveLength(3);
    expect(text.foot).toEqual(["Computed from two birth charts.", "No score, no prediction."]);
    expect(text.wordmark).toBe("Stars Decoded");
    expect(JSON.stringify(text)).not.toMatch(/\d+(st|nd|rd|th)|°|Scorpio|Sun\b/);
    expect(shareCardText({ names: { a: "A", b: "B" }, lens: "parent_child", headline: "h", strengths: [] }).eyebrow).toBe("Compatibility report · Parent and child");
  });

  it("offers Share the card where files can be shared, else Copy image where ClipboardItem exists, and Save image always", () => {
    expect(shareActions({ canShareFiles: true, canCopyImage: true })).toEqual(["share", "save"]);
    expect(shareActions({ canShareFiles: false, canCopyImage: true })).toEqual(["copy", "save"]);
    expect(shareActions({ canShareFiles: false, canCopyImage: false })).toEqual(["save"]);
  });

  it("sends the card to the other person: B, or A when B is the reader's own", () => {
    expect(recipientOf({ name: "Marie Curie", isSelf: true }, { name: "Oprah Winfrey", isSelf: false })).toBe("Oprah");
    expect(recipientOf({ name: "Marie Curie", isSelf: false }, { name: "Oprah Winfrey", isSelf: false })).toBe("Oprah");
    expect(recipientOf({ name: "Marie Curie", isSelf: false }, { name: "Oprah Winfrey", isSelf: true })).toBe("Marie");
  });
});
