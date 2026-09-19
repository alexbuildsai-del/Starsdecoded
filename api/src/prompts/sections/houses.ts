import { z } from "zod/v4";
import type { SectionSpec } from "../types.js";
import type { NatalChartData } from "../../lib/chartCalculation.js";
import { houseRulers } from "../../lib/traditional.js";
import { BODIES, BODY_LABELS, ordinal, type Body } from "../vocabulary.js";

export const HousesSchema = z.object({
  houses: z.array(z.object({
    house: z.int().describe("the house number, 1 through 12, in order"),
    reading: z.string().describe("40 to 70 words, ending on a sentence that begins 'Behaviour check:'"),
  })).min(12).max(12),
});

/** Houses whose card already prints a triad passage above the reading. Never called blind: the section is skipped. */
function triadHouses(chart: NatalChartData): number[] {
  const placed = [1, chart.planets.sun.house, chart.planets.moon.house].filter((h): h is number => h !== undefined);
  return [...new Set(placed)].sort((a, b) => a - b);
}

export const houses: SectionSpec<typeof HousesSchema> = {
  key: "natal:houses",
  label: "House readings",
  adminLabel: "House readings",
  wordTarget: [480, 780],
  maxTokens: 6_000,
  schema: HousesSchema,
  skipWhenBlind: true,
  extraContext: (brief) => {
    const rulers = houseRulers(brief.chart);
    const allowed = Array.from({ length: 12 }, (_, i) => {
      const house = i + 1;
      const names = BODIES.filter((b) => brief.chart.planets[b]?.house === house).map((b) => BODY_LABELS[b]);
      const ruler = rulers[i] ? BODY_LABELS[rulers[i].ruler as Body] : null;
      const extra = ruler && !names.includes(ruler) ? [`${ruler} (ruler)`] : [];
      return `${ordinal(house)}: ${[...names, ...extra].join(", ") || "nothing placed"}`;
    });
    return [
      `HOUSES ALREADY COVERED: houses ${triadHouses(brief.chart).join(", ")} already carry a passage above your reading, on the rising sign, the Sun or the Moon. Do not repeat it there. Write what the rest of the house adds.`,
      "",
      "BODIES YOU MAY NAME, PER HOUSE (the only names each reading may contain; any other name is rejected):",
      ...allowed,
    ].join("\n");
  },
  validate: (out, brief) => {
    const errors: string[] = [];
    out.houses.forEach((h, i) => {
      if (h.house !== i + 1) errors.push(`entry ${i + 1} is house ${h.house}: return all twelve houses in order, 1 to 12`);
    });
    const rulers = houseRulers(brief.chart);
    for (const { house, reading } of out.houses) {
      if (house < 1 || house > 12) continue;
      const allowed = new Set<string>();
      for (const b of BODIES) if (brief.chart.planets[b]?.house === house) allowed.add(BODY_LABELS[b]);
      const ruler = rulers[house - 1];
      if (ruler) allowed.add(BODY_LABELS[ruler.ruler as Body]);
      for (const b of BODIES) {
        const label = BODY_LABELS[b];
        if (allowed.has(label)) continue;
        if (new RegExp(`\\b${label}\\b`).test(reading)) {
          errors.push(`house ${house}: the reading names ${label}, which is neither placed in the ${ordinal(house)} nor its ruler`);
        }
      }
    }
    return errors;
  },
  instructions: `Write the twelve house readings that sit on the back of the house cards in the chart explorer. One entry per house, 1 through 12, in order, 45 to 65 words each; 70 is a hard ceiling.

This section is the one place rule 8 of the style contract is lifted: you may name the planets that sit in a house, because the reader is looking at them on the same card. Name a sign only when the house is quiet. Never name a body that is neither placed in that house nor the house's ruler, and that includes the other end of an aspect: a planet in another house is "a planet elsewhere in the chart", never its name. The list under BODIES YOU MAY NAME is the whole permitted vocabulary of names for each reading.

A house with planets in it: lead with them and with what their combination does, in one move, as behaviour. At most one sentence on the sharpest aspect between planets that both sit in this house, and only when it changes what the reader would actually do.

A house holding only points or an angle, so the nodes, Chiron, the Ascendant or the Midheaven: name them, then read the house through its ruler and where that ruler sits.

A quiet house, one with nothing placed in it: read it through its ruler's sign and house. This is the only case where a sign may be named.

End every reading on one sentence beginning "Behaviour check:" that gives the reader something to test in their own week.

Each reading stands alone. Do not repeat an image or a sentence across the twelve, and do not restate a passage the card already carries.`,
};
