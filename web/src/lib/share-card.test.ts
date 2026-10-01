import { describe, expect, it } from "vitest";
import {
  SHARE_CARD, SHARE_LABELS, STORY_CAPTION, STORY_LINES, STORY_SAFE, pairStoryText, recipientOf, shareActions, shareCardText, shareLine,
  shareWith, storyFilename, storyLayout, wrapLines,
} from "./share-card";

const CHAPTER_01 = {
  names: { a: "Marie Curie", b: "Oprah Winfrey" },
  lens: "partners" as const,
  headline: "Two careful minds who steady each other, once feelings are said out loud.",
  strengths: ["Marie and Oprah think better out loud, together.", "A shared belief that the work has to matter.", "Standards neither of you lowers for the other."],
};

describe("the story (ADR-175, with ADR-102's words)", () => {
  it("is a 9:16 story, 1080 by 1920", () => {
    expect(SHARE_CARD).toEqual({ width: 1080, height: 1920 });
    expect(SHARE_CARD.width / SHARE_CARD.height).toBe(9 / 16);
    expect(STORY_CAPTION).toBe("Story · 9:16");
  });

  it("says the eyebrow, the two first names, the verdict, three strengths, the foot and the mark, and nothing from either chart", () => {
    const text = shareCardText({ ...CHAPTER_01, strengths: [...CHAPTER_01.strengths, "a fourth is never drawn"] });
    expect(text.eyebrow).toBe("Compatibility report · Partners");
    expect(text.title).toBe("Marie and Oprah");
    expect(text.titleLines).toEqual(["Marie", "and Oprah"]);
    expect(text.headline).toBe(CHAPTER_01.headline);
    expect(text.strengthsLabel).toBe("Your three strengths as a pair");
    expect(text.strengths).toEqual(CHAPTER_01.strengths);
    expect(text.foot).toEqual(["Computed from two birth charts.", "No score, no prediction."]);
    expect(text.wordmark).toBe("Stars Decoded");
    expect(JSON.stringify(text)).not.toMatch(/\d+(st|nd|rd|th)|°|Scorpio|Sun\b/);
    expect(shareCardText({ names: { a: "A", b: "B" }, lens: "parent_child", headline: "h", strengths: [] }).eyebrow).toBe("Compatibility report · Parent and child");
    expect(shareCardText({ names: { a: "A", b: "B" }, lens: "people", headline: "h", strengths: [] }).eyebrow).toBe("Compatibility report · Two people");
  });

  it("is built from a GET /home pair alone and matches chapter 01's, so the dashboard and the report draw one story", () => {
    const pair = {
      reportId: "r1", lens: "partners" as const, label: null, status: "ready", stoppedBy: null, strong: [], challenge: null,
      a: { profileId: "p1", name: "Marie Curie" },
      b: { profileId: "p2", name: "Oprah Winfrey" },
      story: { headline: CHAPTER_01.headline, strengths: CHAPTER_01.strengths },
    };
    const raw = { ...CHAPTER_01, headline: ` ${CHAPTER_01.headline}\n`, strengths: [`${CHAPTER_01.strengths[0]} `, "  ", ...CHAPTER_01.strengths.slice(1)] };
    expect(pairStoryText(pair)).toEqual(shareCardText(raw));
    expect(pairStoryText({ ...pair, story: null })).toBeNull();
  });

  it("offers Share story where files can be shared, else Copy image where ClipboardItem exists, and Save always", () => {
    expect(shareActions({ canShareFiles: true, canCopyImage: true })).toEqual(["share", "save"]);
    expect(shareActions({ canShareFiles: false, canCopyImage: true })).toEqual(["copy", "save"]);
    expect(shareActions({ canShareFiles: false, canCopyImage: false })).toEqual(["save"]);
    expect(SHARE_LABELS).toEqual({ share: "Share story", copy: "Copy image", save: "Save" });
  });

  it("reads Share it with B over the story, and gives the report with Share with B, never Send to", () => {
    expect(shareLine("Oprah")).toBe("Share it with Oprah.");
    expect(shareWith("Oprah")).toBe("Share with Oprah");
    expect([...Object.values(SHARE_LABELS), shareWith("Oprah"), shareLine("Oprah")].join(" ")).not.toMatch(/\bSend\b/);
  });

  it("names the file for the two first names and keeps their accents", () => {
    expect(storyFilename(shareCardText(CHAPTER_01))).toBe("Marie and Oprah - Stars Decoded.png");
    expect(storyFilename(shareCardText({ ...CHAPTER_01, names: { a: "Zoë Ková", b: "José/Luis" } }))).toBe("Zoë and JoséLuis - Stars Decoded.png");
  });

  it("shares with the other person: B, or A when B is the reader's own", () => {
    expect(recipientOf({ name: "Marie Curie", isSelf: true }, { name: "Oprah Winfrey", isSelf: false })).toBe("Oprah");
    expect(recipientOf({ name: "Marie Curie", isSelf: false }, { name: "Oprah Winfrey", isSelf: false })).toBe("Oprah");
    expect(recipientOf({ name: "Marie Curie", isSelf: false }, { name: "Oprah Winfrey", isSelf: true })).toBe("Marie");
  });
});

describe("the story's lines", () => {
  const tenPx = (s: string) => s.length * 10;

  it("break at whole words, and a cut is marked rather than hidden", () => {
    expect(wrapLines("one two three four", 100, 3, tenPx)).toEqual(["one two", "three four"]);
    expect(wrapLines("one two three four five six", 100, 2, tenPx)).toEqual(["one two", "three…"]);
    expect(wrapLines("  ", 100, 2, tenPx)).toEqual([]);
  });

  const inside = (ys: number[]) => ys.every((y) => y > STORY_SAFE.top && y <= STORY_SAFE.bottom);
  const all = (at: ReturnType<typeof storyLayout>) =>
    [at.eyebrow, ...at.title, ...at.headline, ...(at.rule === null ? [] : [at.rule]), ...(at.label === null ? [] : [at.label]), ...at.strengths.flat(), ...at.foot];

  it("stay inside the safe area, top to bottom and in order, even for the longest story the caps allow", () => {
    const longest = storyLayout({ title: STORY_LINES.title, headline: STORY_LINES.headline, strengths: [STORY_LINES.strength, STORY_LINES.strength, STORY_LINES.strength] });
    const ys = all(longest);
    expect(inside(ys)).toBe(true);
    expect([...ys].sort((x, y) => x - y)).toEqual(ys);
  });

  it("open the safe area with the eyebrow and close it with the foot, however long the verdict", () => {
    const short = storyLayout({ title: 2, headline: 1, strengths: [1, 1, 1] });
    const long = storyLayout({ title: 2, headline: 5, strengths: [2, 2, 2] });
    for (const at of [short, long]) {
      expect(inside(all(at))).toBe(true);
      expect(at.eyebrow - STORY_SAFE.top).toBeLessThan(30);
      expect(STORY_SAFE.bottom - at.foot[1]).toBeLessThan(10);
    }
    expect(long.rule! - long.headline[4]).toBeLessThan(short.rule! - short.headline[0]);
  });

  it("draw no rule or label without strengths", () => {
    const at = storyLayout({ title: 2, headline: 2, strengths: [] });
    expect(at.rule).toBeNull();
    expect(at.label).toBeNull();
    expect(inside(all(at))).toBe(true);
  });
});
