/**
 * The cards say only what her report says (ADR-18, ADR-244): every sentence, check, action, why and chip on them is
 * the sample's stored run, word for word, where her report prints it, and each card's pieces hang together by the
 * pick rule in differences.ts.
 */
import { describe, expect, it } from "vitest";
import { HOUSE_NAMES, ORDINALS, houseWord, withHouseWords } from "@/lib/evidence-glossary";
import { splitReading } from "@/lib/house-deck";
import { plainProse } from "@/lib/plain-prose";
import { isItemKey, itemKey } from "@/lib/workbook";
import { PLANET_LABELS, SIGN_GLYPHS, type Interpretation, type StoredEvidence } from "@/types/chart";
import { WORKBOOK_CARDS, chipParts, houseTag, workbookCards } from "./differences";
import { CLAIM_SECTIONS, SAMPLE, sampleChart } from "./sample";

const readingOf = (house: number): string => SAMPLE.run.houses?.houses.find((h) => h.house === house)?.reading ?? "";

/** A reading's sentences where the report's house card cuts them, its Behaviour check left out. */
function sentencesOf(reading: string): string[] {
  const { lead, rest } = splitReading(reading);
  const out = [lead];
  for (let left = rest; left; ) {
    const next = splitReading(left);
    out.push(next.lead);
    left = next.rest;
  }
  return out;
}

const evidence: StoredEvidence[] = CLAIM_SECTIONS.flatMap((s) => SAMPLE.run[s]?.claims ?? []).flatMap((c) => c.evidence);

const printedPlacement = (label: string): StoredEvidence | undefined =>
  evidence.find((e) => e.ref.kind === "placement" && e.label === label);

const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Every body the engine places, the twelve signs, the two named angles, and any house by its title, its ordinal or as
// "house". A house's one word stays out: "work" is the everyday word the work card's moment is about.
const ASTROLOGY = new RegExp(
  `\\b(?:${[
    ...Object.values(PLANET_LABELS),
    ...Object.keys(SIGN_GLYPHS),
    "Ascendant",
    "Midheaven",
    ...HOUSE_NAMES,
  ]
    .map(escape)
    .join("|")}|houses?|\\d{1,2}(?:st|nd|rd|th))\\b`,
  "i",
);

describe("the two workbook cards (ADR-245)", () => {
  it("are How you work from house 6 with a career action, then How you spend from house 2 with a money action", () => {
    expect(WORKBOOK_CARDS.map((c) => [c.name, c.house, c.action.key])).toEqual([
      ["How you work", 6, "career.actions.0"],
      ["How you spend", 2, "money.actions.1"],
    ]);
  });

  it("head each card with its house in two digits and the house's word", () => {
    expect(WORKBOOK_CARDS.map((c) => houseTag(c.house))).toEqual(["06 · Work", "02 · Money"]);
  });

  it("print a chip's house with its word, apart from the placement", () => {
    expect(chipParts("Mars 25.2° Cancer, 6th house")).toEqual({ at: "Mars 25.2° Cancer,", house: "6th house (work)" });
    expect(chipParts("Moon 6.5° Pisces, 2nd house")).toEqual({ at: "Moon 6.5° Pisces,", house: "2nd house (money)" });
    expect(chipParts("Moon 6.5° Pisces")).toEqual({ at: "Moon 6.5° Pisces", house: "" });
  });

  it("give the dashboard's empty Practising list the first card's action, as it imports it", async () => {
    const [{ WORKBOOK_CARDS: cards }, { SAMPLE: sample }] = await Promise.all([import("./differences"), import("./sample")]);
    const quoted = { ...cards[0].action, label: `Sample · ${sample.name}` };
    expect(quoted).toEqual({
      key: "career.actions.0",
      action: SAMPLE.run.career?.actions[0]?.action,
      why: SAMPLE.run.career?.actions[0]?.why,
      label: "Sample · Audrey Hepburn",
    });
  });
});

describe.each(WORKBOOK_CARDS.map((card) => [card.name, card] as const))("%s", (_, card) => {
  const reading = readingOf(card.house);

  it("quotes its moment and plain sentence from the house's reading, byte for byte after plainProse, each a whole sentence", () => {
    expect(reading).not.toBe("");
    for (const sentence of [card.moment, card.plain]) {
      expect(plainProse(reading).includes(sentence), sentence).toBe(true);
      expect(sentencesOf(reading), sentence).toContain(sentence);
    }
    expect(card.moment).not.toBe(card.plain);
  });

  it("asks the house's own Behaviour check, read as the report's house card reads it", () => {
    expect(card.check).toBe(splitReading(reading).check);
    expect(plainProse(reading).includes(`Behaviour check: ${card.check}`)).toBe(true);
  });

  it("offers its chapter's action with that action's own why, under the key her report ticks it by", () => {
    const [chapter, list, index] = card.action.key.split(".");
    expect(list).toBe("actions");
    expect(isItemKey(card.action.key)).toBe(true);
    expect(card.action.key).toBe(itemKey(chapter, "actions", Number(index)));
    const stored = SAMPLE.run[chapter as "career" | "money"]?.actions[Number(index)];
    expect(stored).toBeDefined();
    expect({ action: card.action.action, why: card.action.why }).toEqual(stored);
  });

  it("shows only placements the run's evidence prints, each body in this house in her computed chart", () => {
    expect(card.chips.length).toBeGreaterThan(0);
    const { planets } = sampleChart();
    for (const label of card.chips) {
      const printed = printedPlacement(label);
      expect(printed, label).toBeDefined();
      expect(printed?.ref.house, label).toBe(card.house);
      expect(planets[String(printed?.ref.body)]?.house, label).toBe(card.house);
      expect(`${chipParts(label).at} ${chipParts(label).house}`).toBe(withHouseWords(label));
      expect(chipParts(label).house).toBe(`${ORDINALS[card.house - 1]} house (${houseWord(card.house)})`);
    }
  });

  it("names each chip's body in its plain sentence", () => {
    for (const label of card.chips) {
      const body = PLANET_LABELS[String(printedPlacement(label)?.ref.body)];
      expect(body, label).toBeDefined();
      expect(card.plain, label).toMatch(new RegExp(`\\b${escape(body)}\\b`));
    }
  });

  it("keeps its moment free of any planet, sign or house", () => {
    expect(card.moment).not.toMatch(ASTROLOGY);
    expect(card.plain).toMatch(ASTROLOGY);
  });
});

describe("a run without a card's pieces", () => {
  const without = (change: (run: Interpretation) => void): Interpretation => {
    const run = structuredClone(SAMPLE.run);
    change(run);
    return run;
  };
  const house = (run: Interpretation, n: number) => run.houses!.houses.find((h) => h.house === n)!;

  it("fails the import, so the prerender fails rather than a card quoting less", () => {
    expect(() => workbookCards()).not.toThrow();
    expect(() => workbookCards(without((r) => delete r.houses))).toThrow("no reading for house 6");
    expect(() =>
      workbookCards(without((r) => (house(r, 6).reading = house(r, 6).reading.replace(WORKBOOK_CARDS[0].moment, "")))),
    ).toThrow("does not say");
    expect(() =>
      workbookCards(without((r) => (house(r, 2).reading = house(r, 2).reading.replace(WORKBOOK_CARDS[1].plain, "")))),
    ).toThrow("does not say");
    expect(() =>
      workbookCards(without((r) => (house(r, 2).reading = house(r, 2).reading.replace(/Behaviour check:.*$/, "")))),
    ).toThrow("no Behaviour check");
    expect(() =>
      workbookCards(
        without((r) => {
          for (const s of CLAIM_SECTIONS) {
            for (const c of r[s]?.claims ?? []) c.evidence = c.evidence.filter((e) => e.label !== "Pluto 16.4° Cancer, 6th house");
          }
        }),
      ),
    ).toThrow('never prints "Pluto 16.4° Cancer, 6th house"');
    expect(() => workbookCards(without((r) => r.money!.actions.splice(1)))).toThrow("money chapter has no action 1");
  });
});
