/**
 * The links are the real ones between the marie-curie and oprah-winfrey
 * fixtures, as the pair brief lists them: twelve cross aspects strongest
 * first, then the four notable overlays. The readings are illustrative.
 */
import { describe, expect, it } from "vitest";
import {
  BODY_WORDS, LEAD_PER_TAG, MEET_TAGS, aspectTitle, bodyWord, ledgerLinksOf, meetCards, meetIntro, splitCheck, type MeetCard,
} from "./charts-meet";
import type { LedgerLink } from "./ledger";
import type { Claim, PairLink, PairTwoCharts } from "@/types/chart";

const NAMES = { a: "Marie Curie", b: "Oprah Winfrey" };
const READING = "You two plan the weekend twice, once out loud and once in private. Behaviour check: who books the table this week?";

const aspect = (planetA: string, type: string, planetB: string, orb: number): PairLink => ({
  kind: type === "square" || type === "opposition" ? "rubs" : "flows",
  planetA, planetB, aspect: type, orb, planet: "", of: undefined, house: 0, reading: READING,
});
const overlay = (of: "A" | "B", planet: string, house: number): PairLink =>
  ({ kind: "overlay", planetA: "", planetB: "", aspect: "", orb: 0, planet, of, house, reading: READING });

const LINKS: PairLink[] = [
  aspect("moon", "square", "jupiter", 0.2),
  aspect("venus", "conjunction", "mars", 2.0),
  aspect("mercury", "conjunction", "moon", 2.1),
  aspect("venus", "square", "pluto", 1.4),
  aspect("moon", "trine", "uranus", 3.8),
  aspect("saturn", "square", "pluto", 1.1),
  aspect("mercury", "sextile", "sun", 2.4),
  aspect("mercury", "sextile", "venus", 2.2),
  aspect("jupiter", "trine", "neptune", 1.9),
  aspect("uranus", "trine", "saturn", 3.7),
  aspect("neptune", "sextile", "sun", 3.9),
  aspect("pluto", "square", "mercury", 4.0),
  overlay("B", "sun", 2),
  overlay("B", "moon", 12),
  overlay("A", "moon", 4),
  overlay("A", "sun", 12),
];

const link = (planetA: string, aspect: string, planetB: string): LedgerLink => ({ planetA, aspect, planetB });
const titles = (cards: MeetCard[]) => cards.map((c) => c.title);

describe("Where your charts meet (ADR-177)", () => {
  it("titles each card in people words from one word per body, first names only", () => {
    const { lead } = meetCards(LINKS, [], NAMES);
    expect(titles(lead)).toEqual([
      "Marie's affection and Oprah's drive",
      "Marie's mind and Oprah's feelings",
      "Marie's feelings and Oprah's independence",
      "Marie's feelings and Oprah's optimism",
      "Marie's affection and Oprah's intensity",
      "Marie's structure and Oprah's intensity",
    ]);
    expect(lead.every((c) => !/Curie|Winfrey/.test(c.title))).toBe(true);
  });

  it("puts the astrology under the title: A's body, the aspect, B's body and the orb", () => {
    const { lead, rest } = meetCards(LINKS, [], NAMES);
    expect(lead.map((c) => c.astro)).toEqual([
      "Venus conjunct Mars · 2.0°",
      "Mercury conjunct Moon · 2.1°",
      "Moon trine Uranus · 3.8°",
      "Moon square Jupiter · 0.2°",
      "Venus square Pluto · 1.4°",
      "Saturn square Pluto · 1.1°",
    ]);
    expect(rest.find((c) => c.title === "Marie's mind and Oprah's affection")?.astro).toBe("Mercury sextile Venus · 2.2°");
    // A real opposition, from the audrey-hepburn and marie-curie fixtures.
    const [opposite] = meetCards([aspect("mercury", "opposition", "mars", 0.7)], [], { a: "Audrey Hepburn", b: "Marie Curie" }).lead;
    expect(opposite).toMatchObject({ tag: "challenge", title: "Audrey's mind and Marie's drive", astro: "Mercury opposite Mars · 0.7°" });
  });

  it("tags a flowing link Comes naturally and a hard one Challenge, and leaves an overlay untagged", () => {
    const { lead, rest } = meetCards(LINKS, [], NAMES);
    expect(lead.map((c) => c.tag)).toEqual(["comes", "comes", "comes", "challenge", "challenge", "challenge"]);
    expect(rest.map((c) => c.tag)).toEqual([...Array(5).fill("comes"), "challenge", null, null, null, null]);
    expect(MEET_TAGS).toEqual({ comes: "Comes naturally", challenge: "Challenge" });
  });

  it("leads with three of each tag in the brief's order, and sends the rest and every overlay under Show all", () => {
    const { lead, rest } = meetCards(LINKS, [], NAMES);
    expect(LEAD_PER_TAG).toBe(3);
    expect(lead.length + rest.length).toBe(LINKS.length);
    expect(titles(rest)).toEqual([
      "Marie's mind and Oprah's identity",
      "Marie's mind and Oprah's affection",
      "Marie's optimism and Oprah's imagination",
      "Marie's independence and Oprah's structure",
      "Marie's imagination and Oprah's identity",
      "Marie's intensity and Oprah's mind",
      "Oprah's identity in Marie's money",
      "Oprah's feelings in Marie's solitude",
      "Marie's feelings in Oprah's home",
      "Marie's identity in Oprah's solitude",
    ]);
  });

  it("puts the ledger's links first, in the ledger's order, then the brief's", () => {
    const ledger = [
      link("mercury", "sextile", "sun"), link("jupiter", "trine", "neptune"), link("mercury", "conjunction", "moon"),
      link("pluto", "square", "mercury"), link("moon", "square", "jupiter"), link("pluto", "square", "mercury"),
    ];
    const { lead, rest } = meetCards(LINKS, ledger, NAMES);
    expect(lead.map((c) => c.astro)).toEqual([
      "Mercury sextile Sun · 2.4°",
      "Jupiter trine Neptune · 1.9°",
      "Mercury conjunct Moon · 2.1°",
      "Pluto square Mercury · 4.0°",
      "Moon square Jupiter · 0.2°",
      "Venus square Pluto · 1.4°",
    ]);
    expect(rest.slice(0, 6).map((c) => c.astro)).toEqual([
      "Venus conjunct Mars · 2.0°",
      "Moon trine Uranus · 3.8°",
      "Mercury sextile Venus · 2.2°",
      "Uranus trine Saturn · 3.7°",
      "Neptune sextile Sun · 3.9°",
      "Saturn square Pluto · 1.1°",
    ]);
  });

  it("leads with every card of a tag that has fewer than three", () => {
    const { lead, rest } = meetCards([LINKS[0], LINKS[1], LINKS[2], LINKS[4], LINKS[6], LINKS[12]], [], NAMES);
    expect(lead.map((c) => c.tag)).toEqual(["comes", "comes", "comes", "challenge"]);
    expect(rest.map((c) => c.astro)).toEqual(["Mercury sextile Sun · 2.4°", "Sun in 2nd house"]);
  });

  it("reads an overlay as one person's word in the other's house word, with no id", () => {
    const { rest } = meetCards(LINKS, [], NAMES);
    expect(rest.slice(-4).map((c) => [c.title, c.astro, c.tag, c.anchor])).toEqual([
      ["Oprah's identity in Marie's money", "Sun in 2nd house", null, undefined],
      ["Oprah's feelings in Marie's solitude", "Moon in 12th house", null, undefined],
      ["Marie's feelings in Oprah's home", "Moon in 4th house", null, undefined],
      ["Marie's identity in Oprah's solitude", "Sun in 12th house", null, undefined],
    ]);
  });

  it("gives an aspect card the id the ledger's glyph scrolls to (ADR-101)", () => {
    const { lead } = meetCards(LINKS, [], NAMES);
    expect(lead.map((c) => c.anchor)).toEqual([
      "link-venus-conjunction-mars", "link-mercury-conjunction-moon", "link-moon-trine-uranus",
      "link-moon-square-jupiter", "link-venus-square-pluto", "link-saturn-square-pluto",
    ]);
  });

  it("splits the behaviour check off the reading, for its own line", () => {
    const [card] = meetCards([LINKS[0]], [], NAMES).lead;
    expect([card.body, card.check]).toEqual(["You two plan the weekend twice, once out loud and once in private.", "who books the table this week?"]);
    expect(splitCheck("No check here.")).toEqual(["No check here.", null]);
  });

  it("gives a card missing its own fields no card", () => {
    const broken: PairLink[] = [
      { ...LINKS[0], planetB: "" },
      { ...LINKS[12], house: 0 },
      { ...LINKS[12], of: undefined },
    ];
    expect(meetCards(broken, [], NAMES)).toEqual({ lead: [], rest: [] });
  });

  it("names the ten bodies with the spec's words and keeps Chiron's and the nodes' names", () => {
    expect(Object.keys(BODY_WORDS)).toHaveLength(10);
    expect(["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"].map(bodyWord)).toEqual([
      "identity", "feelings", "mind", "affection", "drive", "optimism", "structure", "independence", "imagination", "intensity",
    ]);
    expect(["chiron", "north_node", "south_node"].map(bodyWord)).toEqual(["Chiron", "North Node", "South Node"]);
    expect(aspectTitle("chiron", "north_node", NAMES)).toBe("Marie's Chiron and Oprah's North Node");
  });

  it("says what a card is in the two first names", () => {
    expect(meetIntro(NAMES)).toBe("Each card is one point where a planet in Marie's chart meets one in Oprah's.");
  });

  it("reads the ledger's links from its lines' claims, the Comes naturally column first", () => {
    const cross = (planetA: string, aspect: string, planetB: string) =>
      ({ ref: { kind: "cross", planetA, planetB, aspect }, label: `Marie Curie's ${planetA} ${aspect} Oprah Winfrey's ${planetB}` });
    const claims: Claim[] = [
      { quote: "Talking it through is how you two calm down.", evidence: [cross("mercury", "conjunction", "moon")] },
      { quote: "Big gestures can feel like too much.", evidence: [cross("moon", "square", "jupiter")] },
    ];
    const twoCharts: PairTwoCharts = {
      headline: "h", paradox: "p", strengths: [], claims,
      strong: ["A line no claim quotes.", "Talking it through is how you two calm down."],
      work: ["Big gestures can feel like too much. It trains asking first."],
    };
    expect(ledgerLinksOf(twoCharts)).toEqual([link("mercury", "conjunction", "moon"), link("moon", "square", "jupiter")]);
    expect(ledgerLinksOf(undefined)).toEqual([]);
  });
});
