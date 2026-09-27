/**
 * The six links are the real cross aspects between the marie-curie and
 * oprah-winfrey fixtures (Mercury conjunct Moon and sextile Sun, Jupiter
 * trine Neptune, Moon square Jupiter, Venus and Saturn square Pluto).
 */
import { describe, expect, it } from "vitest";
import { linkCardId, linkTitle, splitCheck } from "./LinkCard";
import type { PairLink } from "@/types/chart";

const aspect = (planetA: string, aspect: string, planetB: string, orb: number): PairLink =>
  ({ kind: aspect === "square" || aspect === "opposition" ? "rubs" : "flows", planetA, planetB, aspect, orb, reading: "r. Behaviour check: c." });

const SIX: PairLink[] = [
  aspect("mercury", "conjunction", "moon", 1.8),
  aspect("mercury", "sextile", "sun", 2.4),
  aspect("jupiter", "trine", "neptune", 1.1),
  aspect("moon", "square", "jupiter", 3.2),
  aspect("venus", "square", "pluto", 2.9),
  aspect("saturn", "square", "pluto", 2.6),
];

describe("a link card's title and id", () => {
  it("names the two bodies inside the sentence for each of the six aspects", () => {
    expect(SIX.map((l) => linkTitle(l, "Marie", "Oprah"))).toEqual([
      "Marie's Mercury conjunction Oprah's Moon",
      "Marie's Mercury sextile Oprah's Sun",
      "Marie's Jupiter trine Oprah's Neptune",
      "Marie's Moon square Oprah's Jupiter",
      "Marie's Venus square Oprah's Pluto",
      "Marie's Saturn square Oprah's Pluto",
    ]);
  });

  it("carries the house's word on an overlay (ADR-98)", () => {
    const overlay: PairLink = { kind: "overlay", planet: "sun", of: "B", house: 2, reading: "r" };
    expect(linkTitle(overlay, "Marie", "Oprah")).toBe("Oprah's Sun in Marie's 2nd house (money)");
    expect(linkCardId(overlay)).toBeUndefined();
  });

  it("gives an aspect card the id the ledger's glyph scrolls to (ADR-101)", () => {
    expect(SIX.map(linkCardId)).toEqual([
      "link-mercury-conjunction-moon", "link-mercury-sextile-sun", "link-jupiter-trine-neptune",
      "link-moon-square-jupiter", "link-venus-square-pluto", "link-saturn-square-pluto",
    ]);
  });

  it("splits the behaviour check off the reading", () => {
    expect(splitCheck("You plan it twice. Behaviour check: count the plans.")).toEqual(["You plan it twice.", "count the plans."]);
    expect(splitCheck("No check here.")).toEqual(["No check here.", null]);
  });
});
