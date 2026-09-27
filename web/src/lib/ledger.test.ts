/**
 * The six links are the real cross aspects between the marie-curie and
 * oprah-winfrey fixtures, as the artifact drew them; the prose is
 * illustrative and the claims cite the links by their keys.
 */
import { describe, expect, it } from "vitest";
import { chapterOf, ledgerRows, linkAnchor, linkOf } from "./ledger";
import type { Claim, PairInterpretation, PairTwoCharts } from "@/types/chart";

const cross = (planetA: string, aspect: string, planetB: string, orb: number) =>
  ({ ref: { kind: "cross", planetA, planetB, aspect, orb }, label: `Marie Curie's ${planetA} ${aspect} Oprah Winfrey's ${planetB}, ${orb.toFixed(1)}° orb` });
const source = (report: "A" | "B", section: string, claim: number) =>
  ({ ref: { kind: "source", report, section, claim }, label: `${report === "A" ? "Marie Curie" : "Oprah Winfrey"}'s report: Sun 14.6° Scorpio, 11th house` });

const LINKS = {
  mercuryMoon: cross("mercury", "conjunction", "moon", 1.8),
  mercurySun: cross("mercury", "sextile", "sun", 2.4),
  jupiterNeptune: cross("jupiter", "trine", "neptune", 1.1),
  moonJupiter: cross("moon", "square", "jupiter", 3.2),
  venusPluto: cross("venus", "square", "pluto", 2.9),
  saturnPluto: cross("saturn", "square", "pluto", 2.6),
};

const strong = [
  "When Marie explains a thing, Oprah settles. Talking it through is how you two calm down.",
  "Marie's precision sharpens Oprah's plans, and the plans give the precision somewhere to go.",
  "You both believe work should mean something beyond the pay.",
];
const work = [
  "Oprah's big gestures can feel like too much to Marie. It trains asking what size of help is wanted.",
  "Closeness can turn into a quiet test of loyalty. It trains asking instead of watching.",
  "Two strong wills dig in over who decides. It trains naming who owns which decision.",
];

const claims: Claim[] = [
  { quote: "Talking it through is how you two calm down.", evidence: [source("A", "mind", 1), LINKS.mercuryMoon] },
  { quote: "the plans give the precision somewhere to go", evidence: [LINKS.mercurySun] },
  { quote: "You both believe work should mean something beyond the pay.", evidence: [LINKS.jupiterNeptune] },
  { quote: "Oprah's big gestures can feel like too much to Marie.", evidence: [LINKS.moonJupiter] },
  { quote: "Closeness can turn into a quiet test of loyalty.", evidence: [LINKS.venusPluto] },
  { quote: "Two strong wills dig in over who decides.", evidence: [LINKS.saturnPluto] },
];

const twoCharts: PairTwoCharts = {
  headline: "Two careful minds who steady each other, once feelings are said out loud.",
  strong, work,
  paradox: "The more you trust each other's minds, the less you say what you feel.",
  strengths: ["Marie and Oprah think better out loud, together.", "A shared belief that the work has to matter.", "Standards neither of you lowers for the other."],
  pointer: "From here, each chapter plays out one scene between you.",
  claims,
};

const lensChapter = (quote: string, evidence: Claim["evidence"]) => ({
  headline: "h", card: { a: ["a", "b", "c"], b: ["d", "e", "f"], pair: "p" }, scene: "s",
  whatJustHappened: { becauseA: "a", becauseB: "b" }, pattern: "p", nextTime: { items: [] },
  claims: [{ quote, evidence }],
});

const interpretation = {
  meta: { promptVersion: "p2" },
  twoCharts,
  partners02: lensChapter("x", [LINKS.mercuryMoon, LINKS.moonJupiter]),
  partners03: lensChapter("x", [LINKS.venusPluto]),
  partners04: lensChapter("x", [LINKS.saturnPluto]),
  partners06: lensChapter("x", [LINKS.mercurySun, LINKS.jupiterNeptune]),
} as unknown as PairInterpretation;

describe("chapter 01's ledger (ADR-101)", () => {
  it("names the link card by the aspect's three keys", () => {
    expect(linkAnchor({ planetA: "mercury", aspect: "conjunction", planetB: "moon" })).toBe("link-mercury-conjunction-moon");
  });

  it("reads each line's link from the first cross aspect its claims cite, past a source claim", () => {
    expect(linkOf(strong[0], claims)).toEqual({ planetA: "mercury", aspect: "conjunction", planetB: "moon" });
    expect(linkOf("A line no claim quotes.", claims)).toBeNull();
    expect(linkOf("Marie's precision sharpens Oprah's plans, and the plans give the precision somewhere to go.", claims)).toEqual({ planetA: "mercury", aspect: "sextile", planetB: "sun" });
  });

  it("draws a touch in brass, a flow in teal and every work line as the rose zigzag", () => {
    const rows = ledgerRows(twoCharts, interpretation, "partners");
    expect(rows.strong.map((r) => r.glyph)).toEqual(["touch", "flow", "flow"]);
    expect(rows.work.map((r) => r.glyph)).toEqual(["rub", "rub", "rub"]);
    expect(rows.strong.map((r) => r.link)).toEqual([
      { planetA: "mercury", aspect: "conjunction", planetB: "moon" },
      { planetA: "mercury", aspect: "sextile", planetB: "sun" },
      { planetA: "jupiter", aspect: "trine", planetB: "neptune" },
    ]);
    expect(rows.work.map((r) => r.link?.planetA)).toEqual(["moon", "venus", "saturn"]);
  });

  it("points each line at the lens chapter whose claims cite its link (MB-89), else none", () => {
    const rows = ledgerRows(twoCharts, interpretation, "partners");
    expect(rows.strong.map((r) => r.chapter)).toEqual([
      { number: 2, title: "How you love" },
      { number: 6, title: "What you are building" },
      { number: 6, title: "What you are building" },
    ]);
    expect(rows.work.map((r) => r.chapter?.number)).toEqual([2, 3, 4]);
    expect(chapterOf({ planetA: "sun", aspect: "trine", planetB: "moon" }, interpretation, "partners")).toBeNull();
  });

  it("gives a line with no cross claim no glyph and no chip", () => {
    const bare = { ...twoCharts, strong: ["A line with no claim.", strong[1], strong[2]] };
    const rows = ledgerRows(bare, interpretation, "partners");
    expect(rows.strong[0]).toEqual({ text: "A line with no claim.", link: null, glyph: null, chapter: null });
  });
});
